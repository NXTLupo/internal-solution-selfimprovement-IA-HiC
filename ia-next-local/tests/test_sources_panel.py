"""The Sources panel (enhancement plan Part 6 N1, C1, C2): every source is listed with its origin and its guide, which
is made on add; a citation opens the exact passage; the checked sources scope answers and work. No network: hic._call
is replaced."""
import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, app as app_module, attachments, config, hic, secondbrain, store, transcripts  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _eng_with_sources():
    eid = store.create_engagement("Giving", "o")
    s1 = transcripts.add_text_source(eid, "Donor interview", "Annual Giving cannot see retention by cohort. " * 20, kind="transcript")
    p = store.safe_path(eid, "results/sources.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"sources": [
            {"id": "S2", "url": "https://aha.org/1", "title": "AHA News: retention", "text": "x" * 500, "pack": "healthcare", "publisher": "AHA News"},
            {"id": "S3", "url": "https://huntscanlon.com/a", "title": "Hunt Scanlon Media: AI", "text": "y" * 500, "reused": "already in the second brain"},
        ]}, fh)
    with open(store.safe_path(eid, "results/findings.json"), "w", encoding="utf-8") as fh:
        json.dump({"findings": [{"claim": "c", "quote": "retention", "source_id": "S2", "pointer": "articles/aha/1.md#c0"}]}, fh)
    return eid, s1


def test_overview_lists_every_source_with_origin_and_guide_state():
    eid, s1 = _eng_with_sources()
    rows = {r["id"]: r for r in secondbrain.overview(eid)}
    assert rows[s1]["origin"] == "upload" and rows["S2"]["origin"] == "pack" and rows["S3"]["origin"] == "reused"
    assert rows["S2"]["guide"] == {"status": "none"} and rows["S2"]["publisher"] == "AHA News"


def test_guide_is_made_from_the_wiki_page_and_kept(monkeypatch):
    eid, s1 = _eng_with_sources()
    calls = []

    def fake(method, path, timeout, **kw):
        calls.append(path)
        if path == "/api/wiki/write-article":
            return {"wikiPath": f"uploads/{eid}/abc.md"}
        if path == "/api/sources/guide":
            assert kw["json"]["wikiPath"] == f"uploads/{eid}/abc.md"
            return {"ok": True, "summary": "Annual Giving cannot see retention by cohort.", "keyTopics": ["retention"],
                    "suggestedQuestions": ["Which cohorts lapse first?"]}
        raise AssertionError(path)
    monkeypatch.setattr(hic, "_call", fake)
    g = secondbrain.guide(eid, s1)
    assert g["status"] == "ready" and g["key_topics"] == ["retention"] and g["questions"]
    row = next(r for r in secondbrain.overview(eid) if r["id"] == s1)
    assert row["guide"]["status"] == "ready" and row["in_second_brain"]


def test_a_failed_guide_says_so(monkeypatch):
    eid, s1 = _eng_with_sources()

    def down(*a, **k):
        raise hic.HicUnavailable("HiC is not running")
    monkeypatch.setattr(hic, "_call", down)
    g = secondbrain.guide(eid, s1)
    assert g["status"] == "failed" and "HiC is not running" in g["error"]


def test_passage_by_pointer_comes_from_the_chunks_kept_here(monkeypatch):
    eid, _ = _eng_with_sources()
    src = {"id": "S2", "title": "AHA News: retention", "text": "x" * 500}
    secondbrain.adopt(eid, src, "articles/aha/1.md", [("articles/aha/1.md#c0", "Hospitals expand nurse retention programs.")])
    monkeypatch.setattr(hic, "_call", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no HiC call needed")))
    c = TestClient(app_module.app)
    r = c.get(f"/api/engagements/{eid}/passage", params={"pointer": "articles/aha/1.md#c0"})
    assert r.status_code == 200 and r.json()["text"] == "Hospitals expand nurse retention programs." and r.json()["source_id"] == "S2"


def test_passage_refuses_a_pointer_from_another_engagement():
    eid, _ = _eng_with_sources()
    c = TestClient(app_module.app)
    r = c.get(f"/api/engagements/{eid}/passage", params={"pointer": "uploads/other/zz.md#c0"})
    assert r.status_code == 404


def test_passage_by_source_lists_its_verified_quotes():
    eid, _ = _eng_with_sources()
    c = TestClient(app_module.app)
    r = c.get(f"/api/engagements/{eid}/passage", params={"source": "s2"})
    assert r.status_code == 200 and r.json()["quotes"][0]["pointer"] == "articles/aha/1.md#c0"


def test_selection_scopes_work_and_names_what_is_switched_off():
    eid, s1 = _eng_with_sources()
    sel = attachments.verified_selection({"engagement_id": eid, "source_ids": ["s2", "S99"]})
    assert sel["source_ids"] == ["S2"] and "AHA News" in attachments.describe_selection(sel)
    assert attachments.verified_selection({"engagement_id": eid, "source_ids": [s1, "S2", "S3"]}) is None   # all on: no scope
    with attachments.scope([], sel, eid):
        assert "Pass them in source_ids" in attachments.unnamed_fresh(eid, [])["error"]
        assert "switched off" in attachments.unnamed_fresh(eid, ["S2", "S3"])["error"]
        assert attachments.unnamed_fresh(eid, ["S2"]) is None
        assert attachments.unnamed_fresh(eid, [], whole_engagement=True) is None


def test_recall_reads_only_the_engagement_in_view(monkeypatch):
    eid, _ = _eng_with_sources()
    other = store.create_engagement("Other", "o")
    store.add_evidence(eid, "S2", "https://aha.org/1", "AHA", "nurse retention programs expand")
    store.add_evidence(eid, "S3", "https://hs.com/a", "HS", "nurse retention in search firms")
    store.add_evidence(other, "S1", "https://x.org", "X", "nurse retention elsewhere")
    monkeypatch.setattr(secondbrain, "recall", lambda q, engagement="": [{"pointer": "p"}])
    with attachments.scope([], None, eid):
        out = agent._recall({"query": "nurse"})
    assert {e["source"] for e in out["evidence"]} == {"S2", "S3"} and out["second_brain"]
    sel = attachments.verified_selection({"engagement_id": eid, "source_ids": ["S2"]})
    with attachments.scope([], sel, eid):
        out = agent._recall({"query": "nurse"})
    assert [e["source"] for e in out["evidence"]] == ["S2"] and out["second_brain"] == []
