"""Streaming chat answers (26 Nov): the reply so far is kept per conversation and served at /live; a file question streams
only its opening summary, never the quoted points before they are checked; the finished reply clears it."""
from ia_next import agent, providers


def test_a_plain_reply_streams_as_written_and_structured_output_does_not():
    w = agent.live_writer("c1")
    w("Students use AI to")
    assert agent.LIVE["c1"]["text"] == "Students use AI to"
    w("Students use AI to condense readings.")
    assert agent.LIVE["c1"]["text"] == "Students use AI to condense readings."
    agent.LIVE.pop("c1")
    w('{"tool": "x"}')
    assert "c1" not in agent.LIVE


def test_a_file_question_streams_only_its_summary():
    w = agent.live_writer("c2", json_answer=True)
    w('{"ans')
    assert "c2" not in agent.LIVE
    w('{"answer": "Students use it to condense \\"long\\" readings')
    assert agent.LIVE["c2"]["text"] == 'Students use it to condense "long" readings'
    w('{"answer": "Students use it to condense readings.", "points": [{"text": "One student", "quote": "I use it')
    assert agent.LIVE["c2"]["text"] == "Students use it to condense readings."
    assert "I use it" not in agent.LIVE["c2"]["text"]
    agent.LIVE.pop("c2")


def test_the_stream_reaches_the_callback_while_the_model_writes(monkeypatch):
    import json as _json

    class FakeStream:
        status_code = 200

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def iter_lines(self):
            for part in ("Students ", "use it ", "to condense readings."):
                yield _json.dumps({"message": {"content": part}})
            yield _json.dumps({"done": True, "eval_count": 3, "prompt_eval_count": 5})

    heard = []
    monkeypatch.setattr(providers, "STREAM_TEXT_EVERY", 0.0)
    monkeypatch.setattr(providers.httpx, "stream", lambda *a, **k: FakeStream())
    monkeypatch.setattr(providers, "resolve", lambda m, need=(): m)
    monkeypatch.setattr(providers, "_fast_enough", lambda m: m)
    monkeypatch.setattr(providers, "capabilities", lambda m: ())
    monkeypatch.setattr(providers, "_room", lambda: None)
    import contextlib
    from ia_next import lanes
    monkeypatch.setattr(lanes, "card", lambda *a, **k: contextlib.nullcontext())     # no graphics-card bookkeeping offline
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)
    tok = providers.STREAM_TEXT.set(heard.append)
    try:
        try:
            text, _, _ = providers.chat("m", "sys", [{"role": "user", "content": "q"}], None, max_tokens=50)
        except Exception:
            text = None                          # the reply's bookkeeping after the stream is not what is tested here
    finally:
        providers.STREAM_TEXT.reset(tok)
    assert heard and heard[-1].startswith("Students use it")


def test_the_live_endpoint_serves_the_text_so_far():
    from fastapi.testclient import TestClient
    from ia_next import app as appmod
    agent.LIVE["c3"] = {"text": "Students use it", "ts": 1.0}
    try:
        r = TestClient(appmod.app).get("/api/conversations/c3/live")
        assert r.status_code == 200 and r.json()["text"] == "Students use it"
        assert TestClient(appmod.app).get("/api/conversations/none/live").json()["text"] == ""
    finally:
        agent.LIVE.pop("c3", None)
