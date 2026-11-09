"""WS-C C3 (2026-10-31): the second brain grows on schedule. Known-gap pages come from the eval frontier set read
together with each case's AIR; engagement pages get the frontmatter the pattern compiler groups by; groups at the
threshold are reported due. Runs against temp dirs; no model call."""
from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import brain_growth as bg  # noqa: E402
from industry_taxonomy import classify_deterministic  # noqa: E402


def _case(cid, kind, eng, note, ref, source_ref=None):
    return {"id": cid, "set": "frontier", "kind": kind, "input": {"engagement": eng},
            "fixture": {"source_ref": source_ref}, "origin": {"type": "failed_air", "ref": ref, "added": "2026-10-31", "note": note}}


AIR_UNSOURCED = {"createdAtIso": "2026-10-02T09:00:00Z",
                 "qualityReport": {"deterministicFailures": ["claim:UNSOURCED_FACT@r1", "claim:UNSOURCED_FACT@r4", "unchecked"]},
                 "postChain": {"htmlChain": {"repair": {"rounds": 1}}}}


def test_families_come_from_the_note_and_the_air():
    assert bg.case_failures(_case("a", "prd", "e", "Evidence density 0.33 below floor before generation", "prd_1"), None) == {
        "evidence-density": "Evidence density 0.33 below floor before generation"}
    got = bg.case_failures(_case("b", "prd", "e", "chainPass=false; chainTrace=[]", "prd_1790992453571"), AIR_UNSOURCED)
    assert got == {"UNSOURCED_FACT": "2 blocking row(s) after 1 repair round(s)"}
    assert bg.case_failures(_case("c", "slides", "e", '["action_titles: 1/2 titles fail"]', "slides_1"), None) == {
        "action-titles": "action_titles: 1/2 titles fail"}
    assert bg.case_failures(_case("d", "slides", "e", "chainPass=false; chainTrace=[]", "slides_2"), {"qualityReport": {}}) == {
        "unrecorded": "chain refused; no stage or finding recorded"}


def test_a_family_needs_two_cases_and_pages_are_deterministic():
    cases = [
        _case("prd-1", "prd", "eng-a", "chainPass=false; chainTrace=[]", "prd_1790992453571", "eng-a/artifacts/prd_1.air.json"),
        _case("slides-2", "slides", "eng-b", "chainPass=false; chainTrace=[]", "slides_1791235890461", "eng-b/artifacts/slides_2.air.json"),
        _case("gap-3", "gap", "eng-a", "Evidence density 0.72 below floor before generation", "gap_1791000000000"),
    ]
    air_for = lambda c: AIR_UNSOURCED if (c.get("fixture") or {}).get("source_ref") else None
    pages = bg.known_gap_pages(cases, air_for, "2026-10-31")
    assert list(pages) == ["known-gaps/failure-unsourced-fact.md"]          # evidence-density has one case only
    text = pages["known-gaps/failure-unsourced-fact.md"]
    assert "applies_to: generation" in text and "kinds: [prd, slides]" in text and "cases: 2" in text
    assert "## 2026-10-02 | eng-a" in text and "## 2026-10-02 | eng-b" in text      # dated from the artifact, not the seed day
    assert "—" not in text
    assert bg.known_gap_pages(list(reversed(cases)), air_for, "2026-10-31") == pages
    assert bg.page_source_hash(text)


def test_the_harness_only_family_is_marked():
    cases = [_case(f"s{i}", "slides", "eng", "chainPass=false; chainTrace=[]", f"slides_{i}") for i in range(2)]
    text = bg.known_gap_pages(cases, lambda c: None, "2026-10-31")["known-gaps/failure-unrecorded.md"]
    assert "applies_to: harness" in text


ENG_PAGE = """---
title: "Improve alumni giving and donor retention at a research university"
type: engagement
created: "2026-10-01"
updated: "2026-10-01"
---

## Research Goal

Improve alumni giving and donor retention at a research university
"""


def test_engagement_frontmatter_backfill():
    new = bg.backfill_engagement_frontmatter(ENG_PAGE, classify_deterministic)
    assert "engagement_type: research\nindustry: higher_ed\n---\n" in new
    assert bg.backfill_engagement_frontmatter(new, classify_deterministic) is None          # idempotent
    assert bg.backfill_engagement_frontmatter("---\ntype: synthesis\n---\n# x", classify_deterministic) is None
    vague = ENG_PAGE.replace("Improve alumni giving and donor retention at a research university", "Name the offsite")
    assert "industry:" not in bg.backfill_engagement_frontmatter(vague, classify_deterministic)


def test_a_pattern_is_due_at_five_engagements_when_missing_or_stale():
    pages = {f"engagements/e{i}.md": "---\ntype: engagement\nengagement_type: research\nindustry: higher_ed\n---\n" for i in range(5)}
    pages["engagements/r1.md"] = "---\ntype: engagement\nengagement_type: research\nindustry: retail\n---\n"
    groups = {g["industry"]: g for g in bg.pattern_groups(pages, lambda p: None, lambda p: 100.0)}
    assert groups["higher_ed"]["due"] is True and groups["higher_ed"]["engagements"] == 5
    assert groups["retail"]["due"] is False
    assert groups["higher_ed"]["pattern_path"] == "synthesis/patterns/research-higher-ed.md"
    fresh = {g["industry"]: g for g in bg.pattern_groups(pages, lambda p: 200.0, lambda p: 100.0)}
    assert fresh["higher_ed"]["due"] is False


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    os.environ["HIC_BRAIN_GROWTH"] = "0"
    import importlib
    return importlib.import_module("app")


def test_the_pass_writes_pages_backfills_and_reports(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    wiki, evals, sessions = tmp_path / "wiki", tmp_path / "evals", tmp_path / "sessions"
    (wiki / "engagements").mkdir(parents=True)
    (wiki / "known-gaps").mkdir()
    (wiki / "engagements" / "alumni.md").write_text(ENG_PAGE, encoding="utf-8")
    (evals / "cases" / "frontier").mkdir(parents=True)
    (sessions / "eng-a" / "artifacts").mkdir(parents=True)
    (sessions / "eng-a" / "artifacts" / "prd_1.air.json").write_text(json.dumps(AIR_UNSOURCED), encoding="utf-8")
    for i, kind in enumerate(["prd", "slides"]):
        (evals / "cases" / "frontier" / f"c{i}.json").write_text(json.dumps(
            _case(f"c{i}", kind, "eng-a", "chainPass=false; chainTrace=[]", f"{kind}_179099245357{i}", "eng-a/artifacts/prd_1.air.json")), encoding="utf-8")
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "WIKI_BASE", str(wiki))
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(evals))
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(sessions))
    monkeypatch.setattr(app_mod, "BRAIN_REPORT_PATH", str(wiki / "synthesis" / "brain-growth-report.json"))
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "_manifest_upsert", lambda *a, **k: None)
    client = TestClient(app_mod.app)
    dry = client.post("/api/brain/grow", json={"dry_run": True}).json()
    assert dry["known_gaps"]["written"] == ["known-gaps/failure-unsourced-fact.md"]
    assert not (wiki / "known-gaps" / "failure-unsourced-fact.md").exists()
    rep = client.post("/api/brain/grow", json={}).json()
    written = (wiki / "known-gaps" / "failure-unsourced-fact.md").read_text(encoding="utf-8")
    assert "family: UNSOURCED_FACT" in written and "chunks:" in written                     # chunked like any wiki page
    assert rep["engagements"]["backfilled"] == ["engagements/alumni.md"]
    assert "industry: higher_ed" in (wiki / "engagements" / "alumni.md").read_text(encoding="utf-8")
    assert rep["patterns"] == [{"type": "research", "industry": "higher_ed", "engagements": 1, "due": False,
                                "pattern_path": "synthesis/patterns/research-higher-ed.md", "pattern_exists": False}]
    again = client.post("/api/brain/grow", json={}).json()
    assert again["known_gaps"]["unchanged"] == ["known-gaps/failure-unsourced-fact.md"] and again["engagements"]["backfilled"] == []
    assert client.get("/api/brain/report").json()["trigger"] == "manual"
    events = [json.loads(l) for l in (tmp_path / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    assert events[-1]["kind"] == "brain" and events[-1]["gap_pages"] == 1


AIR_SLIDES_FAIL = {"qualityReport": {"chainPass": False, "deterministicFailures": ["title:too_long@slide_1"]},
                   "postChain": {"chainPass": False, "chainTrace": [
                       {"stepId": "chain:normalize", "status": "success"},
                       {"stepId": "chain:titles", "status": "partial", "errorType": "schema_invalid"},
                       {"stepId": "chain:claims", "status": "partial", "errorType": "schema_invalid", "nextAction": "narrow_scope"}]}}
AIR_HTML_FAIL = {"qualityReport": {"chainPass": False, "deterministicFailures": []},
                 "postChain": {"htmlChain": {"ledgerAfter": {"summary": {"UNSOURCED_FACT": 3, "CHROME_LEAK": 0}}}}}


def test_attribution_reads_where_the_chains_write():
    att = bg.air_attribution(AIR_SLIDES_FAIL)
    assert [s["stage"] for s in att["stages"]] == ["chain:titles", "chain:claims"]
    assert att["codes"] == {"title:too_long": 1}
    note = bg.attribution_note(att)
    assert note == "chainPass=false; failing: chain:titles partial (schema_invalid); chain:claims partial (schema_invalid); title:too_long x1"
    assert bg.attribution_note(bg.air_attribution(AIR_HTML_FAIL)) == "chainPass=false; failing: UNSOURCED_FACT x3"
    assert bg.attribution_note(bg.air_attribution({})) == "chainPass=false; no failing stage or finding recorded"


def test_stage_failures_become_families_instead_of_unrecorded():
    fams = bg.case_failures(_case("s", "slides", "e", "chainPass=false; chainTrace=[]", "slides_1"), AIR_SLIDES_FAIL)
    assert set(fams) == {"action-titles", "claim-ledger"}
    assert "unrecorded" not in fams


def test_the_pass_retires_its_own_page_and_reports_anyone_elses(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    wiki = tmp_path / "wiki"
    (wiki / "known-gaps").mkdir(parents=True)
    (wiki / "engagements").mkdir()
    (wiki / "known-gaps" / "failure-unrecorded.md").write_text("---\nid: x\ntype: known-gap\nsource: eval-frontier\n---\n# old\n", encoding="utf-8")
    (wiki / "known-gaps" / "failure-hand-written.md").write_text("---\ntype: known-gap\n---\n# a person wrote this\n", encoding="utf-8")
    (tmp_path / "evals" / "cases" / "frontier").mkdir(parents=True)
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "WIKI_BASE", str(wiki))
    monkeypatch.setattr(app_mod, "_EVALS_DIR", str(tmp_path / "evals"))
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    monkeypatch.setattr(app_mod, "BRAIN_REPORT_PATH", str(wiki / "synthesis" / "brain-growth-report.json"))
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "_manifest_upsert", lambda *a, **k: None)
    monkeypatch.setattr(app_mod, "_manifest_remove", lambda *a, **k: None)
    rep = TestClient(app_mod.app).post("/api/brain/grow", json={}).json()
    assert rep["known_gaps"]["retired"] == ["known-gaps/failure-unrecorded.md"]
    assert rep["known_gaps"]["retired_candidates"] == ["known-gaps/failure-hand-written.md"]
    assert not (wiki / "known-gaps" / "failure-unrecorded.md").exists()
    assert (wiki / "known-gaps" / "failure-hand-written.md").exists()


def test_an_engagement_folder_becomes_the_page_the_pattern_step_reads():
    manifest = {"research_goal": "Develop a comprehensive co-op strategy for Northeastern University", "created_at": "2026-05-20T02:52:45Z", "updated_at": "2026-05-23T13:01:01Z"}
    themes = {"kind": "themes", "data": {"themes": [{"name": "Fragmented Digital Ecosystem", "description": "Students juggle disconnected tools."},
                                                     {"name": "Co-op Job Search Challenges", "summary": "Students seek advice on securing co-op positions."},
                                                     {"name": "Bare theme"}]}}
    personas = {"data": {"personas": [{"name": "Central Co-op Director", "role": "Administrator", "quote": "We consolidated co-op."}]}}
    recs = {"data": {"recommendations": [{"title": "Deploy readiness roadmaps", "impactLevel": "HIGH", "description": "Start in first year."}]}}
    page = bg.engagement_page_from_folder(manifest, themes, personas, recs, classify_deterministic)
    assert "type: engagement\nengagement_type: research\nindustry: higher_ed\n" in page and "source: engagement-folder" in page
    assert "- **Fragmented Digital Ecosystem**: Students juggle disconnected tools." in page
    assert "- **Co-op Job Search Challenges**: Students seek advice on securing co-op positions." in page
    assert "- **Bare theme**\n" in page
    assert '- **Central Co-op Director** (Administrator): "We consolidated co-op."' in page
    assert "- **[HIGH] Deploy readiness roadmaps**: Start in first year." in page
    # the compiler's own section headings, in its order
    assert page.index("## Research Goal") < page.index("## Themes Found") < page.index("## Personas Identified") < page.index("## Recommendations Made")
    assert bg.engagement_page_from_folder(manifest, None, personas, recs, classify_deterministic) is None   # nothing real to say
    assert bg.engagement_page_from_folder({}, themes, personas, recs, classify_deterministic) is None
