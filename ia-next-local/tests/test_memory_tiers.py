"""Memory tiers (harness WS-H11, 26 Nov): notes for one engagement and notes for one conversation, beside the person's
curated USER.md and MEMORY.md. A conversation note is dropped after a week unless the person keeps it, which moves it
into MEMORY.md; forgetting reaches every tier; each change is a version; the turn receives the notes that apply."""
import time

from ia_next import agent, memory, store


def test_engagement_notes_stay_with_their_engagement():
    a = store.create_engagement("Client A", "o")
    b = store.create_engagement("Client B", "o")
    got = memory.remember_scoped("engagement", a, "This client says learners, not students", "test")
    assert got["ok"] and got["tier"] == "engagement"
    assert [n["text"] for n in memory.scoped_notes("engagement", a)] == ["This client says learners, not students"]
    assert memory.scoped_notes("engagement", b) == []
    assert memory.remember_scoped("engagement", a, "this client says learners", "test").get("duplicate")
    assert "error" in memory.remember_scoped("engagement", "", "no focus", "test")


def test_a_conversation_note_expires_unless_kept():
    old = memory.remember_scoped("conversation", "conv_tiers_1", "Use the ninety day window in this chat", "test")["id"]
    kept = memory.remember_scoped("conversation", "conv_tiers_1", "The audience is the provost's cabinet", "test")["id"]
    store.conn().execute("UPDATE memory_notes SET ts = ? WHERE id = ?", (time.time() - (memory.SCRATCH_DAYS + 1) * 86400, old))
    assert memory.purge_scratch() >= 1
    left = [n["id"] for n in memory.scoped_notes("conversation", "conv_tiers_1")]
    assert old not in left and kept in left
    got = memory.keep_note(kept)
    assert got["ok"] and any("provost's cabinet" in e for e in memory.entries("MEMORY.md"))
    assert memory.scoped_notes("conversation", "conv_tiers_1") == []


def test_forget_reaches_every_tier_and_each_change_is_a_version():
    e = store.create_engagement("Client C", "o")
    memory.remember_scoped("engagement", e, "Brand is DECIEM for zebracorn work", "test")
    memory.forget("zebracorn")
    assert memory.scoped_notes("engagement", e) == []
    names = [r["name"] for r in store.conn().execute("SELECT name FROM memory_versions WHERE name = ?", (f"engagement:{e}",))]
    assert len(names) == 2                                                        # the add and the removal


def test_the_remember_tool_writes_the_tier_and_the_turn_reads_it_back(monkeypatch):
    e = store.create_engagement("Client D", "o")
    tok = store.TURN.set({"focus": e, "request": "r", "conversation": "conv_tiers_2"})
    ctok = agent._CONV.set("conv_tiers_2")
    try:
        assert agent.execute_tool("remember", {"text": "Lead with the registrar's view", "kind": "engagement"})["tier"] == "engagement"
        assert agent.execute_tool("remember", {"text": "Keep answers under five lines here", "kind": "conversation"})["tier"] == "conversation"
    finally:
        store.TURN.reset(tok)
        agent._CONV.reset(ctok)
    seen = {}
    monkeypatch.setattr(agent, "_turn", lambda cid, conv, text, call_: seen.setdefault("text", text) and {"reply": "ok"})
    agent.turn("conv_tiers_2", "hello", focus=e, said="hello")
    assert "Notes for this engagement: Lead with the registrar's view" in seen["text"]
    assert "Notes for this conversation: Keep answers under five lines here" in seen["text"]
