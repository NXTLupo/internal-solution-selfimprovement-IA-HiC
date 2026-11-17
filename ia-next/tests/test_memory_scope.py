"""Offline tests for enhancement plan B5: each person's memory is their own, candidate notes never reach the agent,
and a forgotten fact stays forgotten. No network and no model calls."""
import json
import os
import sys
import threading

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, channels, config, memory, reviewer, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    monkeypatch.setattr(config, "MEMORY_DIR", str(tmp_path / "memory"))
    config.ensure_dirs()
    os.makedirs(config.MEMORY_DIR, exist_ok=True)
    yield


def test_recall_counts_candidates_toward_the_gate_but_never_returns_them():
    memory.remember_now("The provost prefers decks with five slides", "conversation")
    note = memory.propose("The provost wants every deck in Northeastern red", 0.9, "conversation c1: \"use red\"")
    hits = memory.recall("provost deck preferences")
    assert [h["from"] for h in hits] == ["MEMORY.md"]                     # the candidate is not shown to the agent
    assert all("Northeastern red" not in h["text"] for h in hits)
    counted = next(n for n in memory._notes() if n["id"] == note["id"])
    assert counted["recalls"] == 1 and counted["queries"] == ["provost deck preferences"]


def test_forget_removes_entries_and_candidates_and_the_reviewer_cannot_bring_it_back():
    memory.remember_now("Send drafts to Maggie on Fridays", "conversation")
    memory.propose("Maggie reviews drafts every Friday", 0.9, "conversation c1: \"Maggie on Fridays\"")
    out = memory.forget("maggie")
    assert out["removed"] and out["candidates_removed"] == ["Maggie reviews drafts every Friday"]
    assert memory._notes() == [] and "Maggie" not in memory.snapshot()["memory"]
    again = memory.propose("Maggie likes Friday drafts", 0.95, "conversation c2: \"Maggie\"")
    assert again == {"dropped": "forgotten", "text": "Maggie likes Friday drafts"} and memory._notes() == []
    assert "at least three characters" in memory.forget("a")["error"]


def test_each_person_has_their_own_memory():
    memory.remember_now("Owner works on Northeastern Advancement", "conversation")
    with memory.as_person("teams:29:alice"):
        assert memory.snapshot()["memory"] == ""                          # nothing of the owner's leaks in
        memory.remember_now("Alice wants decks in NXT colours", "conversation")
        assert "Alice" in memory.snapshot()["memory"] and memory.recall("Advancement Northeastern") == []
    assert "Alice" not in memory.snapshot()["memory"] and "Owner works" in memory.snapshot()["memory"]
    with memory.as_person("teams:29:alice"):
        memory.forget("decks")
    assert "Owner works" in memory.snapshot()["memory"]                   # forgetting is per person too


def test_a_channel_conversation_turns_with_that_persons_memory():
    memory.remember_now("Owner prefers the Northeastern brand", "conversation")
    with memory.as_person("webhook:bob"):
        memory.remember_now("Bob prefers short decks", "conversation")
    cid = channels.conversation_for("webhook:bob", "webhook", agent.new_conversation)   # created before its link
    systems = []

    def call(model, system, messages, ledger, **kw):
        systems.append(system)

        class R:
            stop_reason, content = "end_turn", []
        return "ok", None, R()
    agent.turn(cid, "Make me a deck", call=call)
    assert "Bob prefers short decks" in systems[0] and "Owner prefers" not in systems[0]
    own = agent.new_conversation()
    agent.turn(own, "Make me a deck", call=call)
    assert "Owner prefers" in systems[1] and "Bob prefers" not in systems[1]


def test_the_background_reviewer_writes_into_the_turns_person(monkeypatch):
    started = []

    class SyncThread:                       # run the reviewer's thread at once, in the context it was given
        def __init__(self, target, args=(), daemon=None):
            self.target, self.args = target, args

        def start(self):
            started.append(1)
            self.target(*self.args)
    monkeypatch.setattr(threading, "Thread", SyncThread)

    def call(model, system, messages, ledger, **kw):
        return json.dumps({"notes": [{"text": "Carol always wants sources listed", "score": 0.9,
                                      "quote": "always list the sources"}]}), None, None
    msgs = [{"role": "user", "content": "Please always list the sources at the end."}]
    with memory.as_person("teams:carol"):
        for _ in range(reviewer.EVERY_N_TURNS):
            reviewer.after_turn("conv_carol", msgs, call=call)
        assert any("Carol" in n["text"] for n in memory._notes())
    assert started and not any("Carol" in n["text"] for n in memory._notes())  # not in the owner's queue
