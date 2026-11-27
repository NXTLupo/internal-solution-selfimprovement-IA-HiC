"""The 26 Nov stall, by its root cause: a model that is not loaded waited forever because the model server thought it
would not fit beside the pinned conversation model and the busy embedding model, and released neither. Now idle models
other than the pinned one are released first, and the Library's background embedding pauses for model calls. Nothing
here reaches the model server."""
import threading
import time

from ia_next import config, lanes, librarysearch, providers

QWEN = config.SEATS["orchestration"]["primary"]


class R:
    def __init__(self, data):
        self._d = data
        self.status_code = 200

    def json(self):
        return self._d

    def raise_for_status(self):
        return None


def test_idle_models_make_way_but_the_conversation_model_stays(monkeypatch):
    ps = {"models": [{"name": QWEN, "size_vram": 17 * 2**30}, {"name": "qwen3-embedding:0.6b", "size_vram": 2**29},
                     {"name": "nemotron:30b", "size_vram": 6 * 2**30}]}
    posted = []
    monkeypatch.setattr(providers.httpx, "get", lambda url, timeout=None: R(ps))
    monkeypatch.setattr(providers.httpx, "post", lambda url, json=None, timeout=None: posted.append((url.rsplit("/", 1)[-1], json["model"], json["keep_alive"])) or R({}))
    monkeypatch.setattr(providers, "resolve", lambda m, need=(): m)
    gone = providers.make_room_for("hf.co/openbmb/MiniCPM5-2B-GGUF:Q4_K_M")
    assert gone == ["qwen3-embedding:0.6b", "nemotron:30b"]                    # the embedding model first
    assert posted == [("embed", "qwen3-embedding:0.6b", 0), ("generate", "nemotron:30b", 0)]
    assert all(m != QWEN for _u, m, _k in posted)                              # the pinned conversation model stays
    posted.clear()
    assert providers.make_room_for(QWEN) == [] and posted == []                # already loaded: nothing is released


def test_background_embedding_waits_while_a_model_call_holds_the_card(monkeypatch):
    sent = []
    monkeypatch.setattr("httpx.post", lambda url, json=None, timeout=None: sent.append(time.time()) or R({"embeddings": [[0.1]] * len(json["input"])}))
    release = threading.Event()

    def model_call():
        with lanes.card("other_model"):
            release.wait(5)
    t = threading.Thread(target=model_call)
    t.start()
    time.sleep(0.2)
    assert lanes.model_call_active()
    started = time.time()
    threading.Timer(1.5, release.set).start()
    librarysearch.embed(["passage one"], background=True)
    t.join()
    assert sent and sent[0] - started >= 1.2                                   # it waited for the call to finish
    assert not lanes.model_call_active()


def test_a_question_is_embedded_at_once_even_while_a_model_call_runs(monkeypatch):
    sent = []
    monkeypatch.setattr("httpx.post", lambda url, json=None, timeout=None: sent.append(1) or R({"embeddings": [[0.1]]}))
    release = threading.Event()

    def model_call():
        with lanes.card("other_model"):
            release.wait(5)
    t = threading.Thread(target=model_call)
    t.start()
    time.sleep(0.2)
    try:
        librarysearch.embed(["what do shoppers say"], query=True)              # a person's question never waits
        assert sent == [1]
    finally:
        release.set()
        t.join()
