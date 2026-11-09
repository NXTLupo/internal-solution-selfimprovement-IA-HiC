"""WS-B B1-B3 + WS-A A4/A5 (2026-10-31): the proxy's memory door and skill passport, through the HTTP surface.
Runs against a temp store and a temp registry; no network, no model call (the lifecycle pass is deterministic)."""
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
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    import importlib
    return importlib.import_module("app")


@pytest.fixture()
def client(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    # the container exports PROXY_AUTH_DISABLED="" (compose default), so setdefault above does not turn auth off
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "MEMORY_STORE_PATH", str(tmp_path / "memory-facts.json"))
    monkeypatch.setattr(app_mod, "MEMORY_REPORT_PATH", str(tmp_path / "memory-lifecycle-report.json"))
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "_memory_retains_names", lambda eng: eng == "keep-names")
    return TestClient(app_mod.app)


FACT = {"category": "knowledge", "confidence": 0.8, "scope": "engagement", "durability": "durable", "authority": "descriptive"}


def test_admit_redacts_names_and_stamps_the_engagement(client, tmp_path):
    r = client.post("/api/memory/admit", json={"run_id": "run_a", "engagement": "exec-search", "surface": "platform-agent", "facts": [
        {**FACT, "content": "Dr. Maria Alvarez said executive search firms pilot AI sourcing tools before changing fees; maria@x.org"}]})
    d = r.json()
    assert r.status_code == 200 and d["ok"] and d["report"]["admitted"] == 1
    assert d["redacted"] >= 2
    stored = json.loads((tmp_path / "memory-facts.json").read_text(encoding="utf-8"))
    assert "Maria" not in stored[0]["content"] and "[email]" in stored[0]["content"]
    assert stored[0]["engagement"] == "exec-search" and stored[0]["surface"] == "platform-agent"
    events = [json.loads(l) for l in (tmp_path / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    assert events[-1]["kind"] == "memory" and events[-1]["op"] == "admit" and events[-1]["admitted"] == 1


def test_the_retention_flag_keeps_names(client, tmp_path):
    client.post("/api/memory/admit", json={"run_id": "run_k", "engagement": "keep-names", "facts": [
        {**FACT, "content": "Dr. Maria Alvarez owns the vendor renewal for the sourcing platform contract."}]})
    stored = json.loads((tmp_path / "memory-facts.json").read_text(encoding="utf-8"))
    assert "Maria Alvarez" in stored[0]["content"]


def test_admission_gate_refuses_a_session_fact_and_requires_a_run(client):
    r = client.post("/api/memory/admit", json={"run_id": "run_s", "facts": [{**FACT, "scope": "session", "content": "a session-only note that must not persist"}]})
    assert r.json()["report"]["admitted"] == 0 and r.json()["report"]["rejectedByScopeGate"] == 1
    assert client.post("/api/memory/admit", json={"facts": [{**FACT, "content": "x"}]}).status_code == 400


def test_recall_ranks_by_relevance_filters_by_engagement_and_records_heat(client, tmp_path):
    client.post("/api/memory/admit", json={"run_id": "run_1", "engagement": "exec-search", "facts": [
        {**FACT, "content": "Executive search firms adopt AI sourcing tools for candidate longlists before changing fee models"}]})
    client.post("/api/memory/admit", json={"run_id": "run_2", "engagement": "retail", "facts": [
        {**FACT, "content": "Retail shoppers convert better through AI shopping assistants than through site search"}]})
    client.post("/api/memory/admit", json={"run_id": "run_3", "facts": [
        {**FACT, "scope": "user", "category": "preference", "content": "The owner wants the sourcing evidence appendix at the end of every executive deck"}]})
    r = client.get("/api/memory/recall", params={"objective": "How are executive search firms adopting AI sourcing for candidates?", "engagement": "exec-search", "surface": "platform-agent"})
    d = r.json()
    contents = [f["content"] for f in d["facts"]]
    assert any("Executive search firms" in c for c in contents)
    assert not any("Retail" in c for c in contents)          # other engagement filtered out
    assert d["rendered"].startswith("- [")
    stored = {f["content"][:20]: f for f in json.loads((tmp_path / "memory-facts.json").read_text(encoding="utf-8"))}
    assert stored["Executive search fir"].get("accessCount") == 1
    assert client.get("/api/memory/recall").status_code == 400


def test_forget_by_engagement_and_the_legacy_alias(client):
    client.post("/api/memory/admit", json={"run_id": "run_x", "engagement": "gone", "facts": [{**FACT, "content": "A fact the owner asked to forget about vendor pricing tiers"}]})
    client.post("/api/memory/admit", json={"run_id": "run_y", "engagement": "kept", "facts": [{**FACT, "content": "A fact that stays about analyst staffing ratios at search firms"}]})
    r = client.post("/api/memory/forget", json={"engagement": "gone"})
    assert len(r.json()["removed"]) == 1 and r.json()["total"] == 1
    r2 = client.post("/api/retention/forget-memory", json={"contains": "analyst staffing"})
    assert len(r2.json()["removed"]) == 1 and r2.json()["total"] == 0
    assert client.post("/api/memory/forget", json={}).status_code == 400


def test_lifecycle_pass_writes_its_report_without_a_model(client, tmp_path):
    client.post("/api/memory/admit", json={"run_id": "run_l", "facts": [{**FACT, "content": "A durable fact for the lifecycle report about search fees"}]})
    d = client.post("/api/memory/lifecycle", json={"deterministic_only": True}).json()
    assert d["model_called"] is False and d["report"]["total"] == 1
    assert json.loads((tmp_path / "memory-lifecycle-report.json").read_text(encoding="utf-8"))["trigger"] == "manual"
    assert client.get("/api/memory/lifecycle/last").json()["last"]["report"]["total"] == 1


def test_skill_passport_endpoints(app_mod, client, tmp_path, monkeypatch):
    skills = tmp_path / "skills" / "diagrams" / "demo-skill"
    skills.mkdir(parents=True)
    (skills / "SKILL.md").write_text("---\nname: demo-skill\ndescription: Demo.\nversion: \"1.2\"\n---\n\n# Demo\n\nBody text.\n", encoding="utf-8")
    reg = {"schema": "hic.skill-registry.v1", "count": 1, "skills": [{"id": "demo-skill", "dir": "diagrams/demo-skill", "path": "/skills/diagrams/demo-skill/SKILL.md",
                                                                      "description": "Demo.", "version": "1.2", "status": "active", "surfaces": ["platform-agent"]}]}
    (tmp_path / "skill-registry.json").write_text(json.dumps(reg), encoding="utf-8")
    monkeypatch.setattr(app_mod, "SKILL_REGISTRY_PATH", str(tmp_path / "skill-registry.json"))
    monkeypatch.setattr(app_mod, "SKILLS_BASE", str(tmp_path / "skills"))
    assert client.get("/api/skills/registry", params={"surface": "platform-agent"}).json()["count"] == 1
    assert client.get("/api/skills/registry", params={"surface": "nxt-agency"}).json()["count"] == 0
    g = client.get("/api/skills/demo-skill").json()
    assert g["body"].startswith("Skill: demo-skill v1.2\nDemo.\n\n# Demo") and "name:" not in g["body"]
    assert client.get("/api/skills/nope").status_code == 404
    client.post("/api/telemetry/events", json={"events": [{"kind": "skill", "skill_id": "demo-skill", "version": "1.2", "via": "match", "surface": "spa"}]})
    u = client.get("/api/skills/usage", params={"days": 60}).json()
    row = next(s for s in u["skills"] if s["id"] == "demo-skill")
    assert row["uses"] == 1 and row["versions"] == {"1.2": 1} and u["unused"] == []
