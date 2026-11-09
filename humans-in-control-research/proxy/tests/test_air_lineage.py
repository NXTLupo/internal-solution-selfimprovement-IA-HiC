"""WS-C C1/C2 (2026-10-31): AIR lineage on disk. The list endpoint narrows to one run and type, carries each
record's lineage and walks a chain; a fork starts a new chain that names its source; the PPTX export writes the
source run and version into the first slide's notes."""
from __future__ import annotations

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
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    return TestClient(app_mod.app)


def _air(aid, kind="slides", lineage=None, created="2026-10-31T10:00:00Z"):
    a = {"airVersion": "1", "runId": "exec-search", "artifactId": aid, "artifactType": kind, "trigger": f"#{kind}", "createdAtIso": created}
    if lineage:
        a["lineage"] = lineage
    return a


def _write(client, air):
    r = client.post("/api/air/write", json={"runId": air["runId"], "artifactId": air["artifactId"], "air": air})
    assert r.status_code == 200 and r.json()["persisted"]


def test_list_narrows_to_a_run_and_type_newest_first_with_lineage(client):
    _write(client, _air("slides_1", lineage={"rootArtifactId": "slides_1", "revision": 1, "reason": "generated"}, created="2026-10-31T10:00:00Z"))
    _write(client, _air("slides_2", lineage={"parentArtifactId": "slides_1", "rootArtifactId": "slides_1", "revision": 2, "reason": "narrowed scope"}, created="2026-10-31T10:05:00Z"))
    _write(client, _air("gap_1", kind="gap", created="2026-10-31T10:09:00Z"))
    d = client.get("/api/air/list", params={"run_id": "exec-search", "kind": "slides", "limit": 1}).json()
    assert d["count"] == 2
    assert d["artifacts"][0]["artifact_id"] == "slides_2"
    assert d["artifacts"][0]["lineage"]["parentArtifactId"] == "slides_1"


def test_a_patch_does_not_make_an_old_record_the_newest(client):
    _write(client, _air("slides_1", created="2026-10-31T10:00:00Z"))
    _write(client, _air("slides_2", created="2026-10-31T10:05:00Z"))
    assert client.post("/api/air/patch", json={"runId": "exec-search", "artifactId": "slides_1", "patch": {"postChain": {"chainPass": True}}}).json()["patched"]
    d = client.get("/api/air/list", params={"run_id": "exec-search", "kind": "slides", "limit": 1}).json()
    assert d["artifacts"][0]["artifact_id"] == "slides_2"


def test_write_stamps_a_creation_time_when_the_caller_did_not(client, tmp_path):
    air = _air("slides_9")
    air.pop("createdAtIso")
    _write(client, air)
    row = client.get("/api/air/list", params={"run_id": "exec-search"}).json()["artifacts"][0]
    assert row["created"].endswith("Z") and row["created"][:2] == "20"


def test_chain_of_walks_root_to_newest(client):
    _write(client, _air("slides_1", lineage={"rootArtifactId": "slides_1", "revision": 1, "reason": "generated"}))
    _write(client, _air("slides_2", lineage={"parentArtifactId": "slides_1", "rootArtifactId": "slides_1", "revision": 2, "reason": "narrowed scope"}))
    _write(client, _air("slides_3", lineage={"parentArtifactId": "slides_2", "rootArtifactId": "slides_1", "revision": 3, "reason": "guidance"}))
    _write(client, _air("slides_x", lineage={"rootArtifactId": "slides_x", "revision": 1, "reason": "generated"}))
    d = client.get("/api/air/list", params={"run_id": "exec-search", "chain_of": "slides_2"}).json()
    assert [c["artifact_id"] for c in d["chain"]] == ["slides_1", "slides_2", "slides_3"]


def test_fork_starts_a_new_chain_that_names_its_source(client, app_mod):
    _write(client, _air("slides_2", lineage={"parentArtifactId": "slides_1", "rootArtifactId": "slides_1", "revision": 2, "reason": "narrowed scope"}))
    r = client.post("/api/air/fork", json={"runId": "exec-search", "artifactId": "slides_2"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["lineage"] == {"rootArtifactId": d["artifactId"], "revision": 1, "reason": "fork",
                            "forkedFrom": {"runId": "exec-search", "artifactId": "slides_2", "revision": 2}}
    line = app_mod._air_provenance_line("exec-search", d["artifactId"])
    assert "forked from run exec-search, slides_2 version 2" in line and "—" not in line
    line2 = app_mod._air_provenance_line("exec-search", "slides_2")
    assert line2.startswith("Source: HiC run exec-search, slides slides_2; version 2 of chain slides_1; revised from slides_1 (narrowed scope)")
    assert client.post("/api/air/fork", json={"runId": "exec-search", "artifactId": "nope"}).status_code == 404


def test_the_provenance_line_goes_first_in_the_first_slide_notes():
    pptx = pytest.importorskip("pptx")
    from gold_pptx_export import stamp_provenance
    prs = pptx.Presentation()
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    s1.notes_slide.notes_text_frame.text = "Speaker note for the cover."
    prs.slides.add_slide(prs.slide_layouts[6])
    assert stamp_provenance(prs, "Source: HiC run exec-search, slides slides_2.")
    notes = prs.slides[0].notes_slide.notes_text_frame.text
    assert notes.startswith("Source: HiC run exec-search") and notes.endswith("Speaker note for the cover.")
    assert not prs.slides[1].has_notes_slide or "Source" not in prs.slides[1].notes_slide.notes_text_frame.text
    assert stamp_provenance(prs, "") is False
