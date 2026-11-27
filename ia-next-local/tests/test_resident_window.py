"""The resident window (harness WS-H5, 26 Nov). A chat turn of 20,372 prompt tokens asked for a 64K window because the
whole 16,000-token reply allowance was reserved on top; Ollama reloaded the pinned Qwen at 65,536 (18 s, part of it in
system memory) and lost the prompt cache. Now a call stays in the resident window when the prompt and a working reply
fit, a long report is read in parts sized to the room left, a tool result is cut to that room and says so, and an
engagement's exact title names it. A fake model server stands in."""
import json
from types import SimpleNamespace

from ia_next import agent, config, providers, store

QWEN = config.SEATS["orchestration"]["primary"]


def _chars(tokens):
    return int(tokens * config.CHARS_PER_TOKEN[QWEN] * 0.9)


def test_a_long_conversation_prompt_stays_in_the_resident_window():
    ctx, predict, kept = providers.fit_resident(_chars(20372), 16000, QWEN)
    assert (ctx, kept) == (32768, True) and providers.RESIDENT_MIN_REPLY <= predict <= 32768 - 20372
    assert providers.fit_resident(_chars(9000), 5000, QWEN)[:2] == (32768, 5000)          # fits as asked: unchanged
    ctx, predict, kept = providers.fit_resident(_chars(30000), 16000, QWEN)                # no room for a working reply
    assert (ctx, predict, kept) == (65536, 16000, False)


class R:
    def __init__(self, data):
        self._d, self.status_code, self.text = data, 200, ""

    def json(self):
        return self._d

    def raise_for_status(self):
        return None


def test_only_a_reply_that_runs_out_of_room_is_asked_again_at_the_larger_window(monkeypatch):
    sent = []

    def post(url, json=None, timeout=None):
        sent.append(dict(json["options"]))
        cut = len(sent) == 1
        return R({"message": {"role": "assistant", "content": "part" if cut else "the whole reply"},
                  "done_reason": "length" if cut else "stop", "prompt_eval_count": 20372, "eval_count": 10})
    monkeypatch.setattr(providers.httpx, "post", post)
    monkeypatch.setattr(providers, "resolve", lambda m, need=(): m)
    monkeypatch.setattr(providers, "_fast_enough", lambda m: m)
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)
    monkeypatch.setattr(providers, "_room", lambda: None)
    monkeypatch.setattr(providers, "capabilities", lambda m: {"tools"})
    text, _u, _r = providers.chat(QWEN, "s", [{"role": "user", "content": "x" * _chars(20372)}], max_tokens=16000)
    assert text == "the whole reply"
    assert sent[0]["num_ctx"] == 32768 and sent[1]["num_ctx"] == 65536 and sent[1]["num_predict"] == 16000
    grown = store.conn().execute("SELECT data FROM events WHERE kind = 'model_window_grown'").fetchall()
    assert len(grown) == 1 and json.loads(grown[0]["data"])["to"] == 65536


def _done_report(text):
    eid = store.create_engagement("Shopping assistants", "o")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
    import os
    p = os.path.join(config.DATA_DIR, f"{tid}.md")
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(text)
    store.update_task(tid, status="done", result_path=p)
    return eid, tid


def test_a_long_report_is_read_in_parts_with_its_outline():
    body = "".join(f"## Finding {i}\n\n" + ("Shoppers asked the assistant about returns. " * 60) + "\n\n" for i in range(12))
    _eid, tid = _done_report("# Report\n\n" + body)
    tok = agent.ROOM.set(8000)
    try:
        first = agent._read_report({"task_id": tid})
        second = agent._read_report({"task_id": tid, "part": 2})
    finally:
        agent.ROOM.reset(tok)
    assert first["part"] == 1 and first["parts"] > 2 and len(first["report"]) <= 8000
    assert first["outline"][:2] == ["# Report", "## Finding 0"] and "part 2" in first["next"]
    assert second["report"] != first["report"] and second["report"].lstrip().startswith("## Finding")
    assert agent._read_report({"task_id": tid})["report"] == ("# Report\n\n" + body)        # no room limit: whole


def test_report_parts_lose_nothing():
    raw = "# T\n\n" + "".join(f"## S{i}\n\n" + "word " * (400 + 90 * i) + "\n\n" for i in range(9))
    parts = agent.report_parts(raw, 3000)
    assert "".join(parts) == raw and all(len(p) <= 3000 for p in parts)


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_a_big_tool_result_is_cut_to_the_room_left_and_says_so(monkeypatch):
    monkeypatch.setattr(config, "LOCAL", True)
    monkeypatch.setattr(agent, "execute_tool", lambda name, args: {"results": ["passage " * 4000]})
    monkeypatch.setattr(agent, "tool_room", lambda conv, model, tools, n=1: 5000)
    got = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        if len(got) == 0:
            got.append(1)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id="tu1", name="recall", input={"query": "q"})])
        got.append(messages[-1]["content"][0]["content"])
        return "done", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="done")])
    agent.turn(agent.new_conversation(), "what is in my library", call=fake)
    result = got[-1]
    assert len(result) < 5400 and "fitted to the room left" in result
    import json as _json
    assert _json.loads(result.split(" (fitted to the room left")[0])["results"]        # still valid JSON
    assert store.conn().execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'tool_result_fitted'").fetchone()["n"] == 1


def test_an_exact_title_names_its_engagement():
    eid = store.create_engagement("AI shopping assistants: shopper and retailer experience (last 90 days)", "o")
    assert agent.engagement_by_title("ai shopping assistants:  shopper and retailer experience (last 90 days)") == eid
    assert agent.engagement_by_title("AI shopping assistants: shopper and retailer experience (last 90…") is None
    out = agent._repair_engagement("list_engagements", {"engagement_id": "AI shopping assistants: shopper and retailer experience (last 90 days)"})
    assert out["engagement_id"] == eid
    store.create_engagement("Twin", "o")
    store.create_engagement("Twin", "o")
    assert agent.engagement_by_title("Twin") is None                                      # two match: no guess


def test_a_big_result_is_trimmed_by_its_structure_and_stays_valid_json():
    """Harness Engineering R7 / WS-H4: keys kept, long lists elided with counts, long strings head and tail."""
    big = {"query": "retail", "results": [{"title": f"Source {i}", "excerpt": "passage text " * 200} for i in range(60)], "count": 60}
    got = agent.trim_json(big, 6000)
    text = json.dumps(got)
    assert len(text) <= 6000 and json.loads(text)["count"] == 60 and set(got) == {"query", "results", "count"}
    assert any("more items not shown" in str(x) for x in got["results"]) and "characters not shown" in text


def test_every_chat_asks_ollama_not_to_truncate(monkeypatch):
    """Ollama 0.40.18 cuts a too-long prompt and answers 200 unless the request says truncate false (measured 26 Nov:
    3,011 tokens became 514). Without the flag the window could not grow and the model would read part of its input."""
    sent = []

    def post(url, json=None, timeout=None):
        sent.append(json)
        return R({"message": {"role": "assistant", "content": "ok"}, "done_reason": "stop", "prompt_eval_count": 10, "eval_count": 1})
    monkeypatch.setattr(providers.httpx, "post", post)
    monkeypatch.setattr(providers, "resolve", lambda m, need=(): m)
    monkeypatch.setattr(providers, "_fast_enough", lambda m: m)
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)
    monkeypatch.setattr(providers, "_room", lambda: None)
    monkeypatch.setattr(providers, "capabilities", lambda m: {"tools"})
    providers.chat(QWEN, "s", [{"role": "user", "content": "hello"}], max_tokens=100)
    assert sent and sent[0]["truncate"] is False
