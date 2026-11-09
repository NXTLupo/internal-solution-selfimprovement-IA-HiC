"""WS-2 eval store (2026-10-30): judge agreement (Cohen's kappa parity with the TS twin), case
filing, result append, and the frontier seeder's idempotence. Pure-function and tmp-dir tests."""
from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    import importlib
    return importlib.import_module("app")


def test_cohens_kappa_matches_the_ts_twin(app_mod):
    assert app_mod._cohens_kappa(50, 0, 0, 50) == 1.0
    assert abs(app_mod._cohens_kappa(25, 25, 25, 25)) < 1e-9
    assert app_mod._cohens_kappa(0, 50, 50, 0) < 0
    assert app_mod._cohens_kappa(0, 0, 0, 0) == 0.0


def test_judge_agreement_joins_labels_to_verdicts(app_mod, tmp_path, monkeypatch):
    evals = tmp_path / "evals"
    evals.mkdir()
    (evals / "judges.json").write_text(json.dumps({"version": "t", "judges": [
        {"id": "chain:prose", "kind": "deterministic", "metric": "m", "threshold": 0.7, "blocking": True, "version": "1"},
        {"id": "copyCritic", "kind": "llm", "metric": "m", "threshold": 0.8, "blocking": False, "version": "1"},
    ]}), encoding="utf-8")
    rows = []
    for i in range(40):
        human_ok = i % 4 != 0           # 30 approved, 10 rejected
        rows.append(("labels", {"run_id": "r", "slide_id": f"s{i}", "label": "approved" if human_ok else "rejected"}))
        rows.append(("verdicts", {"run_id": "r", "slide_id": f"s{i}", "judge_id": "chain:prose", "pass": human_ok}))        # perfect agreement
        rows.append(("verdicts", {"run_id": "r", "slide_id": f"s{i}", "judge_id": "copyCritic", "pass": True}))             # always passes: no skill
    for kind, row in rows:
        with open(evals / f"{kind}.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(evals))
    out = app_mod._compute_judge_agreement()
    assert out["labels"] == 40 and out["verdicts"] == 80
    prose = out["judges"]["chain:prose"]
    assert prose["n"] == 40 and prose["agreement"] == 1.0 and prose["kappa"] == 1.0
    copy = out["judges"]["copyCritic"]
    assert copy["n"] == 40 and copy["agreement"] == 0.75 and abs(copy["kappa"]) < 1e-9
    data = json.loads((evals / "judges.json").read_text(encoding="utf-8"))
    by_id = {j["id"]: j for j in data["judges"]}
    assert by_id["chain:prose"]["human_agreement"]["kappa"] == 1.0
    assert "confusion" not in by_id["chain:prose"]["human_agreement"]


def test_evals_path_blocks_traversal(app_mod, tmp_path, monkeypatch):
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(tmp_path))
    assert app_mod._evals_path("cases", "frontier", "x.json").startswith(str(tmp_path))
    assert app_mod._evals_path("..", "etc", "passwd") is None


def test_seed_frontier_is_idempotent_and_reads_failed_airs(app_mod, tmp_path, monkeypatch):
    sessions = tmp_path / "sessions" / "client-a" / "artifacts"
    sessions.mkdir(parents=True)
    (sessions / "slides_1.air.json").write_text(json.dumps({
        "artifactId": "slides_1", "artifactType": "slides",
        "objective": {"userObjective": "Position the firm"},
        "qualityReport": {"chainPass": False, "chainTrace": [{"stage": "prose", "status": "partial"}]},
        "slides": [{"id": "s1", "template": "slides:cover", "title": "T"}],
    }), encoding="utf-8")
    (sessions / "slides_2.air.json").write_text(json.dumps({"artifactId": "slides_2", "qualityReport": {"chainPass": True}}), encoding="utf-8")
    wiki = tmp_path / "wiki"
    (wiki / "synthesis").mkdir(parents=True)
    (wiki / "eval").mkdir(parents=True)
    evals = tmp_path / "evals"
    evals.mkdir()
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(evals))
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    monkeypatch.setattr(app_mod, "WIKI_BASE", str(wiki))
    first = app_mod._seed_frontier_from_failures()
    assert first["created"] == ["slides-slides_1"]
    case = json.loads((evals / "cases" / "frontier" / "slides-slides_1.json").read_text(encoding="utf-8"))
    assert case["set"] == "frontier" and case["kind"] == "slides"
    assert case["input"]["objective"] == "Position the firm" and case["input"]["engagement"] == "client-a"
    assert case["fixture"]["output"][0]["id"] == "s1"
    assert case["origin"]["type"] == "failed_air"
    second = app_mod._seed_frontier_from_failures()
    assert second["created"] == [] and second["skipped_existing"] == 1
