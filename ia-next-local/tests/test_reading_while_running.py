"""Reading and asking while work runs (QA 25 Nov, E1 and E5)."""
import threading
import time

from ia_next import answers, config, lanes, store, studio


def _fresh(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))


def test_page_furniture_is_never_a_subject():
    text = ("Getty Images. Skip to main content. Sign up for our newsletter. Nurse staffing ratios fell at rural hospitals "
            "because the hospitals could not recruit night nurses, and the nurse staffing ratios are now set by statute.")
    got = studio.subjects(text)
    assert "nurse staffing" in got and "staffing ratios" in got
    assert not any(w in s.split() for s in got for w in ("getty", "images", "content", "newsletter", "skip", "sign"))


def test_a_question_goes_ahead_of_the_work_in_line():
    order, gate = [], threading.Event()

    def work(name, urgent):
        tok = lanes.URGENT.set(urgent)
        try:
            with lanes.card("writer", holder=name):
                order.append(name)
                time.sleep(0.05)
        finally:
            lanes.URGENT.reset(tok)

    def first():
        with lanes.card("writer", holder="run"):
            gate.set()
            time.sleep(0.4)

    a = threading.Thread(target=first)
    a.start()
    gate.wait(2)
    waiting = [threading.Thread(target=work, args=("run", False)), threading.Thread(target=work, args=("other", False))]
    for w in waiting:
        w.start()
    time.sleep(0.1)
    q = threading.Thread(target=work, args=("question", True))
    q.start()
    for th in [a, q] + waiting:
        th.join(5)
    assert order[0] == "question", order


def test_what_a_running_task_has_read_can_be_read_and_searched(monkeypatch, tmp_path):
    _fresh(monkeypatch, tmp_path)
    eid = store.create_engagement("Claims automation", "claims automation at insurers")
    store.add_evidence(eid, "S1", "https://example.org/a", "Insurer A automates claims",
                       "Insurer A moved first notice of loss to an automated intake line.\n\nAdjusters at Insurer A now review only disputed claims.")
    store.add_evidence(eid, "S2", "https://example.org/b", "A survey of adjusters", "Adjusters say the intake line misreads handwritten forms.")
    srcs, chunks = answers.held(eid, ["S1"], question="What do adjusters review?")
    assert [s["id"] for s in srcs] == ["S1"] and chunks and all(c["source_id"] == "S1" for c in chunks)
    srcs, chunks = answers.held(eid, subject="intake line", question="What goes wrong?")
    assert {c["source_id"] for c in chunks} == {"S1", "S2"}


def test_the_running_step_names_the_model_answering_now(monkeypatch, tmp_path):
    _fresh(monkeypatch, tmp_path)
    eid = store.create_engagement("E", "e")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, "k1")
    store.start_node(tid, "Writer", "model-a", 1, progress=False)
    store.note_model("model-b")
    assert store.get_task(tid)["nodes"][-1]["model"] == "model-b"


def test_the_conversation_model_comes_back_when_the_studio_goes_quiet(monkeypatch):
    from ia_next import providers
    calls = []
    monkeypatch.setenv("IA_NEXT_KEEP_READY", "1")
    monkeypatch.setattr(providers, "ready_soon", lambda why="", delay=4.0: calls.append(why) or True)
    monkeypatch.setattr(time, "sleep", lambda s: None)
    with lanes.studio("writer", seconds=1):
        assert not calls
    assert calls == ["the studio finished its work"]


def test_a_picture_frees_only_the_memory_it_needs(monkeypatch):
    from ia_next import localmedia

    class R:
        def __init__(self, d):
            self._d = d

        def json(self):
            return self._d

    freed = []
    monkeypatch.setattr(localmedia.httpx, "get", lambda url, timeout=0: R({"models": [
        {"name": "small-embed", "size_vram": 1.2e9}, {"name": "writer", "size_vram": 18e9}]}))
    monkeypatch.setattr(localmedia.httpx, "post", lambda url, json=None, timeout=0: freed.append(json["model"]))
    localmedia._free_language_models()
    assert freed == ["writer"]
