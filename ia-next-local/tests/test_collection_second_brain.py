"""Collection through the second brain and HiC's source registry (enhancement plan Part 3 data packs and second brain;
Unified Vision phase 2). Pages the wiki already holds are reused with their own attribution, named publications are
looked up and their outcome reported, search redirects never become sources, one publisher cannot fill the pack share,
every new source is archived at collection, and each finding carries the pointer of the passage its quote came from.
No network: hic._call, the model calls and page fetches are replaced."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, hic, providers, secondbrain, store, studio  # noqa: E402

BODY = ("Retained executive search firms now pair researchers with AI sourcing tools. "
        "Partners still own the client relationship and the final slate. ") * 12


def _page(path, url, source, title, date, parts):
    """A wiki page as HiC writes it: frontmatter with each chunk's char_span over the body."""
    body, spans, pos = "", [], 0
    for p in parts:
        spans.append((pos, pos + len(p)))
        body += p
        pos += len(p)
    chunks = "".join(f'  - id: "{path}#c{i}"\n    char_span: [{a}, {b}]\n' for i, (a, b) in enumerate(spans))
    front = (f'---\nid: {path}\nurl: "{url}"\nkind: "article"\nsource: "{source}"\ntitle: "{title}"\ndate: "{date}"\n'
             f'chunks:\n{chunks}---\n')
    return front + body


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [])
    yield


ART = "articles/hunt-scanlon/aa11.md"
PAGES = {
    ART: _page(ART, "https://huntscanlon.com/ai-sourcing", "Hunt Scanlon Media", "AI sourcing reaches retained search",
               "2026-10-04", [BODY, "Partners keep the final slate decision. " * 20]),
    "uploads/other-eng/zz.md": _page("uploads/other-eng/zz.md", "upload://x", "client", "Another client's SOW", "", [BODY]),
    "synthesis/themes/t1.md": _page("synthesis/themes/t1.md", "https://hic/synth", "HiC", "Theme synthesis", "", [BODY]),
    "articles/low/bb22.md": _page("articles/low/bb22.md", "https://low.example/x", "Low", "Barely related", "", [BODY]),
}


def _fake_hic(calls, named=None):
    def call(method, path, timeout, **kw):
        calls.append((method, path, kw))
        if path == "/api/manifest/chunks-by-goal":
            assert kw["params"]["types"] == secondbrain.REUSE_TYPES
            return {"chunk_ids": [f"{ART}#c1", f"{ART}#c0", "uploads/other-eng/zz.md#c0", "synthesis/themes/t1.md#c0",
                                  "articles/low/bb22.md#c0"],
                    "scores": {f"{ART}#c1": 0.71, f"{ART}#c0": 0.62, "uploads/other-eng/zz.md#c0": 0.9,
                               "synthesis/themes/t1.md#c0": 0.88, "articles/low/bb22.md#c0": 0.2},
                    "pages": {ART: {"title": "AI sourcing reaches retained search"}}}
        if path.startswith("/api/wiki/read-article/"):
            import urllib.parse
            return {"content": PAGES[urllib.parse.unquote(path[len("/api/wiki/read-article/"):])]}
        if path == "/api/sources/named":
            return {"publications": named or []}
        if path == "/api/wiki/write-article":
            return {"wikiPath": f"articles/web/{abs(hash(kw['json']['url'])) % 10**8}.md"}
        raise hic.HicUnavailable(f"unexpected {path}")
    return call


def test_reuse_returns_only_external_pages_with_their_own_attribution(monkeypatch):
    calls = []
    monkeypatch.setattr(hic, "_call", _fake_hic(calls))
    eid = store.create_engagement("Search", "o")
    got = secondbrain.reuse(eid, "AI sourcing in retained executive search")
    assert [g["wiki_path"] for g in got] == [ART]             # uploads, synthesis and the low score are refused
    g = got[0]
    assert g["publisher"] == "Hunt Scanlon Media" and g["url"] == "https://huntscanlon.com/ai-sourcing" and g["date"] == "2026-10-04"
    assert [p for p, _ in g["chunks"]] == [f"{ART}#c0", f"{ART}#c1"] and "0.71" in g["why"]


def test_reuse_never_breaks_collection(monkeypatch):
    def broken(*a, **k):
        raise RuntimeError("manifest lock")
    monkeypatch.setattr(hic, "_call", broken)
    assert secondbrain.reuse(store.create_engagement("e", "o"), "goal") == []


def test_research_reuses_names_publications_drops_redirects_and_archives(monkeypatch):
    calls = []
    named = [{"name": "Hunt Scanlon", "status": "found", "host": "huntscanlon.com",
              "registry": [{"id": "exs_hunt_scanlon", "name": "Hunt Scanlon Media"}],
              "items": [{"title": "Search firms adopt AI agents", "url": "https://huntscanlon.com/agents", "published": "2026-11-02",
                         "content": BODY, "wikiPath": "articles/hunt-scanlon-media/cc33.md"}]},
             {"name": "Nursing Times", "status": "unresolved", "host": "", "registry": [], "items": [],
              "note": "not in HiC's source registry"}]
    monkeypatch.setattr(hic, "_call", _fake_hic(calls, named))
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, {"candidates": [{"groundingMetadata": {
        "groundingChunks": [{"web": {"uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", "title": "redirect"}},
                            {"web": {"uri": "https://news.example/a", "title": "Web article"}}]}}]}))
    # the redirect never resolves to the publisher's page; the ordinary page reads normally
    monkeypatch.setattr(studio, "_page_text", lambda url: (BODY, url))
    eid = store.create_engagement("Search", "o")
    brief = {"goal": "AI sourcing in retained executive search", "scope": "US firms 2026", "audience": "partners",
             "publications": ["Hunt Scanlon", "Nursing Times"]}
    path, summary, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1))
    urls = [s["url"] for s in sources]
    assert urls == ["https://huntscanlon.com/ai-sourcing", "https://huntscanlon.com/agents", "https://news.example/a"]
    assert sources[0]["reused"] and sources[0]["publisher"] == "Hunt Scanlon Media"
    assert sources[1]["title"].startswith("Hunt Scanlon Media: ") and sources[1]["requested"] == "Hunt Scanlon"
    assert "Hunt Scanlon 1 page" in summary and "Nursing Times nothing found" in summary and "1 reused from the second brain" in summary
    data = json.load(open(path, encoding="utf-8"))
    assert [r["status"] for r in data["requested_publications"]] == ["found", "unresolved"]
    writes = [kw["json"]["url"] for m, p, kw in calls if p == "/api/wiki/write-article"]
    assert writes == ["https://news.example/a"]               # reused and HiC-archived pages are not written again
    assert data["archived"] == {"new": 1, "in_second_brain": 1}


def test_one_publisher_cannot_fill_the_pack_share(monkeypatch):
    items = [{"title": f"Story {i}", "url": f"https://aha.org/{i}", "date": "2026-10-0{i}", "content": BODY,
              "publisher": "AHA News", "pack": "healthcare", "tier": 1, "score": 3} for i in range(1, 5)]
    items.append({"title": "Other", "url": "https://ama-assn.org/x", "date": "2026-10-01", "content": BODY,
                  "publisher": "AMA", "pack": "healthcare", "tier": 2, "score": 2})
    monkeypatch.setattr(hic, "pack_items", lambda packs, q, **kw: items)
    monkeypatch.setattr(hic, "_call", _fake_hic([]))
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("s", None, {"candidates": [{}]}))
    eid = store.create_engagement("Nursing", "o")
    _, _, sources = studio.research_lead(eid, {"goal": "nurse retention", "scope": "s", "audience": "a", "packs": ["healthcare"]},
                                         providers.Ledger(limit_usd=1))
    pubs = [s.get("publisher") for s in sources if s.get("pack")]
    assert pubs.count("AHA News") == studio.MAX_PER_PUBLISHER and "AMA" in pubs


def test_analyst_reads_chunks_and_ties_each_finding_to_its_passage(monkeypatch):
    eid = store.create_engagement("Search", "o")
    src = {"id": "S1", "title": "Hunt Scanlon", "url": "https://huntscanlon.com/ai", "text": "Intro. Partners keep the final slate decision. End."}
    chunks = [{"source_id": "S1", "title": "Hunt Scanlon", "pointer": "articles/hs/a.md#c0", "text": "Intro."},
              {"source_id": "S1", "title": "Hunt Scanlon", "pointer": "articles/hs/a.md#c1", "text": "Partners keep the final slate decision. End."}]
    monkeypatch.setattr(secondbrain, "material", lambda e, s, o, budget: (chunks, {"full_coverage": True, "chunks_used": 2, "chunks_available": 2}))
    seen = {}

    def fake_claude(model, system, messages, ledger, **kw):
        seen["msg"] = messages[0]["content"]
        return json.dumps({"findings": [
            {"claim": "Partners own the slate", "quote": "Partners keep the final slate decision.", "source_id": "S1", "claim_type": "SUPPORTED_FACT"},
            {"claim": "Invented", "quote": "AI replaces partners.", "source_id": "S1", "claim_type": "SUPPORTED_FACT"}]}), None, None
    monkeypatch.setattr(providers, "claude", fake_claude)
    _, summary, kept = studio.analyst(eid, {"goal": "g", "scope": "s"}, [src], providers.Ledger(limit_usd=1))
    assert '<chunk pointer="articles/hs/a.md#c1">' in seen["msg"]
    assert len(kept) == 1 and kept[0]["pointer"] == "articles/hs/a.md#c1"
    assert "every source read whole" in summary and "1 tied to a manifest passage" in summary


def test_the_research_tool_passes_named_publications_into_the_brief(monkeypatch):
    started = []
    monkeypatch.setattr(studio, "start_research_task", lambda eid, brief, budget, idem: (started.append(brief) or ("task_x", True)))
    args = {"engagement_title": "t", "engagement_id": "", "audience": "a", "goal": "g", "scope": "s", "structure": "st",
            "constraints": "c", "success": [], "budget_usd": 1.0, "new_research_confirmed": False, "packs": [],
            "publications": ["Hunt Scanlon", " RecruitingDaily ", ""]}
    agent.execute_tool("start_research_report", args)
    assert started[0]["publications"] == ["Hunt Scanlon", "RecruitingDaily"]
    spec = next(t for t in agent.TOOLS if t["name"] == "start_research_report")
    assert "publications" in spec["input_schema"]["properties"] and "Hunt Scanlon" in spec["description"]


def test_web_sources_keep_the_pages_own_title(monkeypatch):
    assert studio.page_title('<html><head><title>  Trust Is the New\n Differentiator | Cornerstone </title></head>') == \
        "Trust Is the New Differentiator | Cornerstone"
    assert studio.page_title('<meta property="og:title" content="Search firms adopt AI agents"><title>x</title>') == \
        "Search firms adopt AI agents"
    monkeypatch.setattr(hic, "_call", _fake_hic([]))
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("s", None, {"candidates": [{"groundingMetadata": {
        "groundingChunks": [{"web": {"uri": "https://www.cornerstone-group.com/trust", "title": "cornerstone-group.com"}}]}}]}))
    monkeypatch.setattr(studio, "_page_text", lambda url: (BODY, url, "Trust Is the New Differentiator in Executive Search"))
    eid = store.create_engagement("Search", "o")
    _, _, sources = studio.research_lead(eid, {"goal": "zzzz unrelated", "scope": "s", "audience": "a"}, providers.Ledger(limit_usd=1))
    web = [s for s in sources if s["url"] == "https://www.cornerstone-group.com/trust"][0]
    assert web["title"] == "cornerstone-group.com: Trust Is the New Differentiator in Executive Search"
    assert web["publisher"] == "cornerstone-group.com"
