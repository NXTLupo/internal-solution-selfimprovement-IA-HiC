"""WS-5 (2026-10-30): the event sink, the rescore job, the loop state, the active epoch and the canary."""
from __future__ import annotations

import importlib
import json
import os
import sys

import pytest

pytest.importorskip("fastapi")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture()
def app_mod(tmp_path, monkeypatch):
    monkeypatch.setenv("HIC_TELEMETRY_PATH", str(tmp_path / "telemetry" / "events.jsonl"))
    monkeypatch.setenv("PROXY_AUTH_DISABLED", "1")
    monkeypatch.setenv("RESCORE_ENABLED", "0")
    monkeypatch.setenv("MANIFEST_RECONCILE_ENABLED", "0")
    if "app" in sys.modules:
        del sys.modules["app"]
    mod = importlib.import_module("app")
    mod._LOOP_STATE_PATH = str(tmp_path / "skillopt" / "loop-state.json")
    mod._CANARY_PATH = str(tmp_path / "skillopt" / "canary.json")
    mod._EPOCH_LEDGER_PATH = str(tmp_path / "wiki" / "synthesis" / "improvement-epochs.md")
    mod._EPOCH_PROPOSALS_PATH = str(tmp_path / "wiki" / "synthesis" / "epoch-proposals.json")
    mod.TELEMETRY_PATH = str(tmp_path / "telemetry" / "events.jsonl")
    return mod


def test_event_sink_joins_a_run(app_mod):
    app_mod._telemetry_event("ai_call", {"run_id": "r1", "model": "m", "cost_usd": 0.5, "usage": {"input_tokens": 10}})
    app_mod._telemetry_event("ai_call", {"run_id": "r1", "model": "m2", "cost_usd": 0.25})
    app_mod._telemetry_event("verdict", {"run_id": "r1", "artifact_id": "a1", "judge_id": "chain:lexical", "score": 0.9, "pass": True})
    app_mod._telemetry_event("label", {"run_id": "r1", "slide_id": "s1", "label": "approved", "pass": True})
    app_mod._telemetry_event("ai_call", {"run_id": "r2", "model": "m", "cost_usd": 9})
    rows = app_mod._telemetry_rows(run_id="r1")
    assert len(rows) == 4
    j = app_mod._telemetry_join(rows)
    assert j["ai_calls"] == 2 and j["cost_usd"] == 0.75 and j["verdicts"] == 1 and j["labels"] == 1
    assert j["models"] == {"m": 1, "m2": 1} and j["judges"] == ["chain:lexical"]
    assert app_mod._telemetry_rows(kind="verdict")[0]["judge_id"] == "chain:lexical"


def test_loop_state_pauses_after_three_batches_without_a_win(app_mod, tmp_path):
    pdir = tmp_path / "proposals" / "b"
    pdir.mkdir(parents=True)
    for i in range(3):
        st = app_mod._loop_state_after_batch(f"b{i}", str(pdir))
    assert st["epochs_without_heldout_win"] == 3 and st["paused"] is True
    assert "paused" in st["paused_reason"]
    (pdir / "x.verdict.json").write_text(json.dumps({"verdict": "APPROVE"}), encoding="utf-8")
    st = app_mod._loop_state_after_batch("b3", str(pdir))
    assert st["epochs_without_heldout_win"] == 0 and st["paused"] is False and st["last_approve_at"]


def test_active_epoch_reads_the_latest_record_with_its_json_block(app_mod):
    os.makedirs(os.path.dirname(app_mod._EPOCH_LEDGER_PATH), exist_ok=True)
    with open(app_mod._EPOCH_LEDGER_PATH, "w", encoding="utf-8") as f:
        f.write("# Improvement epochs\n\n## Epoch 1 - 2026-10-01 10:00:00 UTC\n\nold\n\n## Epoch 2 - 2026-10-30 09:30:00 UTC\n\nSkill promoted.\n\n```json\n"
                + json.dumps({"epoch_id": 2, "layer": "skill", "file_path": "x/SKILL.md", "deliverable_class": "#slides", "baseline_vector": {"held_out": 0.6}, "target_dims": ["held_out"]})
                + "\n```\n")
    rec = app_mod._active_epoch_record()
    assert rec["epoch_id"] == 2 and rec["file_path"] == "x/SKILL.md" and rec["deliverable_class"] == "#slides"
    assert rec["baseline_vector"] == {"held_out": 0.6} and rec["applied_at"].startswith("2026-10-30")


def test_rescore_on_an_empty_window_writes_a_summary(app_mod, tmp_path, monkeypatch):
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    monkeypatch.setattr(app_mod, "_seed_frontier_from_failures", lambda limit=50: {"created": [], "skipped_existing": 0, "errors": []})
    monkeypatch.setattr(app_mod, "_compute_judge_agreement", lambda: {"judges": {}})
    s = app_mod._rescore_recent(24)
    assert s["artifacts"] == 0 and s["failures"] == 0 and s["epoch_proposal_id"] is None
    assert app_mod._RESCORE_LAST["finished_at"]


def test_rescore_files_an_epoch_proposal_on_failure_volume(app_mod, tmp_path, monkeypatch):
    base = tmp_path / "sessions" / "eng" / "artifacts"
    base.mkdir(parents=True)
    for i in range(app_mod.RESCORE_FAILURE_THRESHOLD):
        (base / f"a{i}.air.json").write_text(json.dumps({"artifactId": f"a{i}", "runId": "r", "artifactType": "slides",
                                                          "postChain": {"chainPass": False}, "qualityReport": {"deterministicFailures": ["x"]}}), encoding="utf-8")
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    monkeypatch.setattr(app_mod, "_seed_frontier_from_failures", lambda limit=50: {"created": [], "skipped_existing": 0, "errors": []})
    monkeypatch.setattr(app_mod, "_compute_judge_agreement", lambda: {})
    s = app_mod._rescore_recent(24)
    assert s["failures"] == app_mod.RESCORE_FAILURE_THRESHOLD
    assert s["epoch_proposal_id"]
    props = app_mod._read_epoch_proposals()
    assert props[0]["kind"] == "rescore_failures" and props[0]["status"] == "pending"
    # the sink carries one rescore row per artifact
    assert len(app_mod._telemetry_rows(kind="rescore")) == app_mod.RESCORE_FAILURE_THRESHOLD
    # a second pass does not file a second proposal while one is pending
    s2 = app_mod._rescore_recent(24)
    assert s2["epoch_proposal_id"] == s["epoch_proposal_id"] and len(app_mod._read_epoch_proposals()) == 1


def test_retention_flag_and_forget_memory(app_mod, tmp_path, monkeypatch):
    """WS-6 M2: the retention flag is explicit and the forgetting path removes facts by run family."""
    import asyncio
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    monkeypatch.setattr(app_mod, "WIKI_BASE", str(tmp_path / "wiki"))
    p = tmp_path / "wiki" / "synthesis" / "memory-facts.json"
    # WS-B B1 (2026-10-31): the forget path runs through the memory door's store path
    monkeypatch.setattr(app_mod, "MEMORY_STORE_PATH", str(p))
    p.parent.mkdir(parents=True)
    p.write_text(json.dumps([
        {"id": "f1", "content": "Q: a / A: the ledger is manual", "sourceRunIds": ["run_engA_1"]},
        {"id": "f2", "content": "Q: b / A: receipts go out late", "sourceRunIds": ["run_engB_1"]},
        {"id": "f3", "content": "Q: c / A: Maria confirmed the backlog", "sourceRunIds": ["run_engB_2"]},
    ]), encoding="utf-8")
    flag = asyncio.run(app_mod.retention_flag_get("engA"))
    assert flag["retain_names"] is False
    asyncio.run(app_mod.retention_flag_set({"engagement": "engA", "retain_names": True, "note": "owner ok"}))
    assert asyncio.run(app_mod.retention_flag_get("engA"))["retain_names"] is True
    r = asyncio.run(app_mod.retention_forget_memory({"engagement": "run_engB"}))
    assert sorted(r["removed"]) == ["f2", "f3"] and r["total"] == 1
    r2 = asyncio.run(app_mod.retention_forget_memory({"contains": "manual"}))
    assert r2["removed"] == ["f1"] and r2["total"] == 0


def test_air_list_reads_the_records(app_mod, tmp_path, monkeypatch):
    import asyncio
    base = tmp_path / "sessions" / "eng-one" / "artifacts"
    base.mkdir(parents=True)
    (base / "x.air.json").write_text(json.dumps({"artifactId": "x", "runId": "r", "artifactType": "slides", "trigger": "#slides", "postChain": {"chainPass": True}, "epochId": 2}), encoding="utf-8")
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    out = asyncio.run(app_mod.air_list("", 10))
    assert out["count"] == 1 and out["artifacts"][0]["artifact_id"] == "x" and out["artifacts"][0]["chain_pass"] is True and out["artifacts"][0]["epoch_id"] == 2
    assert asyncio.run(app_mod.air_list("other", 10))["count"] == 0
