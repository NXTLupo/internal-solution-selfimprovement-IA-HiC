"""Resumable tasks (harness WS-H16, 26 Nov): a research task interrupted after its Research step resumes at the Analyst
with the collected sources read back, instead of failing with "interrupted by a restart". Other work is still marked
failed. Fakes stand in for the specialists."""
import json
import os

import pytest

from ia_next import config, lifecycle, store, studio


@pytest.fixture(autouse=True)
def _own_store(tmp_path):
    """Only this test's tasks are in the store resume_interrupted reads."""
    store.reset_for_tests(str(tmp_path / "resume.sqlite3"))
    config.ensure_dirs()


def _task_after_research(tmp_sources):
    eid = store.create_engagement("Retail", "o")
    brief = {"goal": "g", "audience": "a", "scope": "s", "structure": "x", "constraints": "c", "success": ["y"]}
    tid, _ = store.create_task(eid, "research_report", brief, 1.0, idem_key=None)
    store.update_task(tid, status="running")
    n1 = store.start_node(tid, "Brief Lead", "rules", 1)
    p = store.safe_path(eid, f"results/tasks/{tid}/sources.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"sources": tmp_sources}, fh)
    store.finish_node(n1, p, "brief complete")
    n2 = store.start_node(tid, "Research Lead", "qwen", 2)
    store.finish_node(n2, p, "2 sources collected and read")
    store.start_node(tid, "Analyst", "qwen", 3)                 # running when the process died
    return eid, tid


def test_a_research_task_resumes_at_the_analyst(monkeypatch):
    sources = [{"id": "S1", "title": "a", "text": "x" * 200}, {"id": "S2", "title": "b", "text": "y" * 200}]
    eid, tid = _task_after_research(sources)
    other, _ = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key=None)
    store.update_task(other, status="running")
    store.start_node(other, "Deck Composer", "qwen", 1)            # the deck's step was running too
    got = lifecycle.resume_interrupted(start=False)
    assert got == {"resumed": [tid], "failed": [other]}
    assert [n["state"] for n in store.get_task(other)["nodes"]] == ["failed"]
    t = store.get_task(tid)
    assert [n["state"] for n in t["nodes"] if n["specialist"] == "Analyst"] == ["failed"]
    collected, analysed = [], []
    monkeypatch.setattr(studio, "research_lead", lambda *a, **k: collected.append(1) or ("p", "s", []))

    def fake_analyst(eid_, brief, srcs, ledger, tid_=None):
        analysed.append([s["id"] for s in srcs])
        raise RuntimeError("stop here: the test only checks what the Analyst was given")
    monkeypatch.setattr(studio, "analyst", fake_analyst)
    studio.run_research_task(tid, resume=True)
    assert collected == [] and analysed == [["S1", "S2"]]          # no new collection; the checkpoint was read back
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'node_resumed' AND task_id = ?", (tid,)).fetchone()
    assert json.loads(ev["data"])["specialist"] == "Research Lead"
