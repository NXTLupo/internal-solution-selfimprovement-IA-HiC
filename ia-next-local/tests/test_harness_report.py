"""The harness report (harness WS-H18): one read of how turns ended, what the loop stepped in for, model loads, the
learning loops and where task time went."""
from fastapi.testclient import TestClient

from ia_next import app as app_module, memory, store


def test_the_report_counts_what_the_loop_recorded():
    store.save_transcript("tr_aaaaaaaaaaa1", "conv_x", memory.OWNER, "hi", [], "hello", "answered", 4.0)
    store.save_transcript("tr_aaaaaaaaaaa2", "conv_x", memory.OWNER, "again", [], "stopped", "repeat_stopped", 9.0)
    store.event("agent_repeat_stopped", {"conversation": "conv_x", "tool": "recall"})
    store.event("hook_denied", {"conversation": "conv_x", "tool": "remember", "rule": "memory from the person"})
    d = TestClient(app_module.app).get("/api/harness?days=1").json()
    assert d["turns"]["how_they_ended"].get("repeat_stopped", 0) >= 1 and d["turns"]["how_they_ended"].get("answered", 0) >= 1
    assert d["loop_interventions"]["agent_repeat_stopped"] >= 1 and d["loop_interventions"]["hook_denied"] >= 1
    assert "local_writer" in d["learning"]["skills"] and isinstance(d["recent_tasks"], list)


def test_cost_per_skill_joins_its_tasks_model_calls():
    from ia_next import providers
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key=None)
    store.event("skill_used", {"skill": "deck_composer", "version": 1}, eid, tid)
    c = store.conn()
    providers._spend_table(c)
    c.execute("INSERT INTO spend (ts, model, input_tokens, output_tokens, cache_read_tokens, usd, seconds, label) VALUES (strftime('%s','now'), 'qwen', 1000, 400, 0, 0, 80.5, ?)", (tid,))
    d = TestClient(app_module.app).get("/api/harness?days=1").json()
    assert d["skill_cost"]["deck_composer"]["tasks"] >= 1 and d["skill_cost"]["deck_composer"]["model_seconds"] >= 80.5
