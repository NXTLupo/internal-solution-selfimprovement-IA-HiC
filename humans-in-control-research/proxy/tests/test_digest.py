"""WS-E E3 (2026-10-31): the morning read-out lists the overnight rescore, the pending proposals, decks waiting on a
decision and a paused loop, from the records on disk; the seen marker moves the window."""
from __future__ import annotations

import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import digest as dg  # noqa: E402

SINCE = "2026-10-30T18:00:00Z"
NOW = "2026-10-31T08:00:00Z"
RESCORE = {"finished_at": "2026-10-31T03:00:00Z", "window_hours": 24, "artifacts": 14, "failures": 3,
           "failed": [{"kind": "slides", "artifact_id": "slides_1", "run_id": "eng-a"}], "epoch_proposal_id": "prop_9_1"}
PROPOSALS = [{"id": "prop_9_1", "status": "pending", "created_at": "2026-10-31T03:00:01Z", "summary": "Epoch 9 due: 3 artifact(s) failed rescoring in the last 24 h (threshold 3)"},
             {"id": "prop_8_1", "status": "approved", "created_at": "2026-10-20T00:00:00Z", "summary": "old"}]


def test_the_digest_lists_the_rescore_and_the_pending_proposals():
    d = dg.compose_digest(SINCE, NOW, runs=[], events=[], rescore=RESCORE, proposals=PROPOSALS,
                          loop={"paused": False}, deck_asks=[], brain=None)
    ids = [s["id"] for s in d["sections"]]
    assert ids == ["proposals", "rescore"]
    rescore = d["sections"][1]["items"]
    assert rescore[0]["text"] == "Rescored 14 artifacts from the last 24 hours; 3 failed."
    assert any("prop_9_1" in i["text"] for i in rescore)
    assert d["sections"][0]["items"][0]["ref"] == {"proposal_id": "prop_9_1"}
    assert d["headline"] == "Needs you: 1 proposal to review." and d["needs_attention"] is True
    assert "—" not in dg.render_text(d)


def test_old_records_stay_out_and_an_empty_window_says_so():
    old = dict(RESCORE, finished_at="2026-10-29T03:00:00Z")
    d = dg.compose_digest(SINCE, NOW, runs=[{"updated_at": 1, "objective": "x"}], events=[], rescore=old,
                          proposals=[], loop={"paused": False}, deck_asks=[], brain=None)
    assert d["sections"] == [] and d["headline"] == "Nothing changed since you were last here."


def test_runs_verdicts_decks_loop_brain_and_agents():
    ts_ms = dg._iso_to_ts("2026-10-31T01:00:00Z") * 1000
    d = dg.compose_digest(SINCE, NOW,
                          runs=[{"run_id": "r1", "engagement": "eng-a", "objective": "Map executive search AI adoption", "kind": "artifact",
                                 "updated_at": ts_ms, "artifacts": ["slides_1"], "verdicts": [{"pass": True}, {"pass": False}], "goal": {"status": "met"}}],
                          events=[{"kind": "post_chain", "pass": False, "artifact_id": "slides_1", "run_id": "eng-a", "repair_rounds": 1},
                                  {"kind": "post_chain", "pass": True}, {"kind": "agent_turn"}, {"kind": "webhook", "stage": "accepted"}],
                          rescore=None, proposals=[], loop={"paused": True, "paused_reason": "3 epoch batches without a held-out win"},
                          deck_asks=[{"engagement": "eng-a", "message_id": "m1", "findings": 2}],
                          brain={"ran_at": "2026-10-31T02:00:00Z", "known_gaps": {"written": ["known-gaps/failure-unsourced-fact.md"]},
                                 "engagements": {"backfilled": []}, "patterns": []})
    by = {s["id"]: s for s in d["sections"]}
    assert by["runs"]["items"][0]["text"] == "Map executive search AI adoption: artifact, 1 artifact, 1 of 2 verdicts passed, goal met."
    assert by["verdicts"]["items"][0]["text"] == "2 artifacts went through the post-generation chain; 1 failed it."
    assert "2 open findings" in by["open_decks"]["items"][0]["text"]
    assert by["loop"]["items"][0]["text"].startswith("Paused: 3 epoch batches")
    assert "unsourced-fact" in by["brain"]["items"][0]["text"]
    assert [i["text"] for i in by["agents"]["items"]] == ["The platform agent answered 1 turn.", "1 delegated job arrived through the signed webhook."]
    assert d["headline"] == "Needs you: 1 deck waiting on a decision; the improvement loop is paused."


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    os.environ["HIC_BRAIN_GROWTH"] = "0"
    import importlib
    return importlib.import_module("app")


def test_the_route_reads_disk_and_the_seen_marker_moves_the_window(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    sessions, evals = tmp_path / "sessions", tmp_path / "evals"
    (sessions / "eng-a").mkdir(parents=True)
    (sessions / "eng-a" / "chat.json").write_text(json.dumps([{"id": "m1", "deckAsk": {"findings": ["a", "b"]}}, {"id": "m2"}]), encoding="utf-8")
    (evals / "results").mkdir(parents=True)
    fresh = dict(RESCORE, finished_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    (evals / "results" / "_rescore-2026-10-31.json").write_text(json.dumps(fresh), encoding="utf-8")
    props = tmp_path / "epoch-proposals.json"
    props.write_text(json.dumps(PROPOSALS), encoding="utf-8")
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(sessions))
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(evals))
    monkeypatch.setattr(app_mod, "_EPOCH_PROPOSALS_PATH", str(props))
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "BRAIN_REPORT_PATH", str(tmp_path / "brain.json"))
    monkeypatch.setattr(app_mod, "DIGEST_SEEN_PATH", str(tmp_path / "digest-seen.json"))
    monkeypatch.setattr(app_mod, "_LOOP_STATE_PATH", str(tmp_path / "loop.json"))
    client = TestClient(app_mod.app)
    d = client.get("/api/digest", params={"surface": "launchpad"}).json()
    ids = [s["id"] for s in d["sections"]]
    assert "rescore" in ids and "proposals" in ids and "open_decks" in ids
    text = client.get("/api/digest", params={"surface": "agent", "format": "text"}).text
    assert text.startswith("Needs you:") and "Overnight rescore:" in text
    assert client.post("/api/digest/seen", json={"surface": "launchpad"}).json()["ok"]
    after = client.get("/api/digest", params={"surface": "launchpad"}).json()
    assert "rescore" not in [s["id"] for s in after["sections"]]
    assert "proposals" in [s["id"] for s in after["sections"]]          # still waiting: pending items do not age out
