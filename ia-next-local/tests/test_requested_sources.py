"""The sources the person asks for are the evidence (18 Nov owner failure). Asked three times for a deck on "the latest
themes in social discourse on r/neu (reddit) about AI", the person got a deck of campus news: the finished Reddit
listening was invisible to the deck, the deck's error sent the agent to a web research report, the research report
ignored r/NEU, its sources reused the Reddit posts' ids, and nothing checked the deck against the request.
No network: the model calls, Reddit and page fetches are replaced."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, deck, material, providers, store, studio, transcripts  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [])
    yield


NEWS = {"id": "S1", "url": "https://huntnewsnu.com/94788/nonuai", "title": "huntnewsnu.com: Meet NoNUAI",
        "text": "NoNUAI is a student group that meets weekly and asks the university to slow AI in classrooms."}
POSTS = [
    {"id": "S1", "url": "https://www.reddit.com/r/NEU/comments/a1/profs_beefing/", "title": "profs beefing up assignments",
     "text": "profs are beefing up assignments to compensate for ai usage but it is hurting anti-ai students",
     "subreddit": "NEU", "created_utc": 1794000000},
    {"id": "S2", "url": "https://www.reddit.com/r/NEU/comments/a2/claude_access/", "title": "Claude access limits",
     "text": "Northeastern gave us Claude but the limits run out before the end of the week",
     "subreddit": "NEU", "created_utc": 1794100000},
    {"id": "S3", "url": "https://www.reddit.com/r/NEU/comments/a3/makerspace/", "title": "AI makerspace",
     "text": "The AI makerspace in Snell feels like a Microsoft ad more than a lab",
     "subreddit": "NEU", "created_utc": 1794200000},
]
SOCIAL = {"title": "Reddit themes: AI", "query": "AI", "subreddits": ["NEU"], "objective": "AI themes on r/NEU", "themes": [
    {"name": "Coursework fairness", "sentiment": "negative", "meaning": "Students say AI-driven workload changes punish students who avoid AI.",
     "quotes": [{"quote": "profs are beefing up assignments to compensate for ai usage", "source_id": "S1"}]},
    {"name": "Claude access", "sentiment": "mixed", "meaning": "Students value university Claude access but hit its limits.",
     "quotes": [{"quote": "the limits run out before the end of the week", "source_id": "S2"}]}]}


def _engagement(research=True, social=True):
    eid = store.create_engagement("r/NEU AI discourse", "Themes in r/NEU discussion about AI")
    if social:                                   # what social.collect and social.analyze leave behind
        for p in POSTS:
            store.add_evidence(eid, p["id"], p["url"], p["title"], p["text"])
        transcripts._write(eid, "results/social_sources.json", {"query": "AI", "subreddits": ["NEU"], "sources": POSTS})
        transcripts._write(eid, "results/social.json", SOCIAL)
    if research:                                 # a research report that numbered from its own file (the old bug)
        store.add_evidence(eid, NEWS["id"], NEWS["url"], NEWS["title"], NEWS["text"])
        transcripts._write(eid, "results/sources.json", {"sources": [NEWS]})
        transcripts._write(eid, "results/findings.json", {"findings": [
            {"claim": "NoNUAI asks to slow AI", "quote": "asks the university to slow AI in classrooms", "source_id": "S1",
             "claim_type": "SUPPORTED_FACT"}]})
    return eid


def test_requested_reads_the_persons_words_and_the_agents_declaration():
    asked = "create a Northeastern branded deck of #slides #NU that highlight the latest themes in social discourse on r/neu (reddit) about AI"
    assert material.requested(asked) == {"reddit": {"neu"}}
    assert material.requested("what are students saying in Reddit posts about co-op") == {"reddit": set()}
    assert material.requested("themes from conversations on Reddit") == {"reddit": set()}
    assert material.requested("a deck on Reddit's IPO and its ad business") == {}            # the company, not its posts
    assert material.requested("compare r/NEU and r/BostonU") == {"reddit": {"neu", "bostonu"}}
    assert material.requested("see https://www.reddit.com/r/NEU/comments/x/") == {"reddit": {"neu"}}
    assert material.requested("", declared=["reddit:r/NEU"]) == {"reddit": {"neu"}}
    assert material.requested("", declared=["reddit"]) == {"reddit": set()}
    assert material.requested("w/r/t the budget, use the attached files") == {}


def test_a_finished_reddit_listening_is_material_for_every_builder():
    eid = _engagement(research=False)
    findings, sources, info = material.load(eid)
    assert [s["title"] for s in sources[:2]] == ["r/NEU: profs beefing up assignments", "r/NEU: Claude access limits"]
    assert all(s["publisher"] == "Reddit r/NEU" and s["kind"] == "social" for s in sources)
    assert {f["quote"] for f in findings} == {"profs are beefing up assignments to compensate for ai usage",
                                              "the limits run out before the end of the week"}
    assert findings[0]["claim"].startswith("Coursework fairness:") and info["counts"]["reddit_posts"] == 3


def test_colliding_ids_from_an_older_run_are_read_apart():
    eid = _engagement()
    findings, sources, info = material.load(eid, material.requested("themes on r/neu"))
    ids = [s["id"] for s in sources]
    assert len(ids) == len(set(ids)) == 4                                   # the news S1 and the post S1 no longer share an id
    post1 = next(s for s in sources if "profs_beefing" in s["url"])
    assert post1["id"] == "S1001" and next(s for s in sources if "huntnews" in s["url"])["id"] == "S1"
    assert {"S1001", "S2", "S3"} == info["required_ids"]
    assert sources[0]["id"] in info["required_ids"] and findings[0]["source_id"] in info["required_ids"]   # asked-for first
    assert any(f["source_id"] == "S1001" and "profs" in f["quote"] for f in findings)


def test_asking_for_reddit_the_engagement_lacks_names_the_tool_and_forbids_a_substitute():
    eid = _engagement(social=False)
    with pytest.raises(material.MissingEvidence) as e:
        material.load(eid, material.requested("latest themes on r/neu"))
    assert "start_social_analysis" in str(e.value) and "r/neu" in str(e.value) and "Do not substitute" in str(e.value)
    empty = store.create_engagement("e", "o")
    with pytest.raises(FileNotFoundError):
        material.load(empty)
    assert "start_social_analysis" in material.NO_EVIDENCE and "research report" in material.NO_EVIDENCE


def _research_fakes(monkeypatch, calls):
    raw = {"candidates": [{"groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://www.insidehighered.com/ai", "title": "insidehighered.com"}}]}}]}
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: (calls.append("search") or ("summary", None, raw)))
    monkeypatch.setattr(studio, "_fetch", lambda uri: ("Universities are writing AI policies with students. " * 20, uri, "AI policy on campus"))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)


def test_research_numbers_after_every_id_in_the_engagement_and_reads_the_asked_for_posts(monkeypatch):
    calls = []
    _research_fakes(monkeypatch, calls)
    eid = _engagement(research=False)
    brief = {"goal": "Latest themes in r/NEU discussion about AI", "scope": "August to November 2026", "audience": "leadership"}
    _, _, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1.0))
    web = [s for s in sources if "insidehighered" in s["url"]]
    assert web and web[0]["id"] == "S4"                                   # after the posts' S1..S3, never S1 again
    assert {s["id"] for s in sources if "reddit.com" in s["url"]} == {"S1", "S2", "S3"}   # the posts are read as sources
    assert [r[0] for r in store.conn().execute("SELECT source_id FROM evidence WHERE engagement_id = ? AND url LIKE ?",
                                                (eid, "%insidehighered%"))] == ["S4"]


def test_research_asked_for_reddit_without_a_listening_reads_the_named_subreddit_itself(monkeypatch):
    # (owner, 26 Nov) asking for Reddit never stops a research run: with no listening, the run searches the subreddit
    calls, asked = [], {}
    _research_fakes(monkeypatch, calls)
    from ia_next import packsocial

    def named(subs, query, window=None, limit=6, objective="", known=(), token=None, scores=None, get=None):
        asked.update(subs=list(subs), limit=limit)
        return [{"url": "https://www.reddit.com/r/NEU/comments/x1/ai_policy/", "title": "Profs disagree on AI policy", "subreddit": "NEU",
                 "date": "2026-10-20", "text": "Profs disagree on AI policy\n\nTop comments:\n\n" + "Every class has a different rule. " * 12}], {"kept": 1}
    monkeypatch.setattr(packsocial, "search_names", named)
    eid = _engagement(research=False, social=False)
    _, summary, sources = studio.research_lead(eid, {"goal": "themes on r/NEU about AI", "scope": "fall 2026", "audience": "leadership"},
                                               providers.Ledger(limit_usd=1.0))
    post = next(s for s in sources if "reddit.com/r/NEU" in s["url"])
    assert asked["subs"] == ["neu"] and post["requested"] == "Reddit" and post["kind"] == "social" and not post.get("pack")
    assert "1 from r/neu as asked" in summary


def _slide(title, cites, quote="", source_id=""):
    return {"layout": "bullets", "kicker": "", "title": title, "subtitle": "", "takeaway": "Leadership should act on this.",
            "points": ["Students raise it often", "It shapes trust in the university"], "cards": [],
            "table": {"columns": [], "rows": []}, "steps": [], "arch": {"sources": [], "layer": {"name": "", "items": []}, "views": []},
            "quote": quote, "source_id": source_id, "cites": cites, "image_prompt": "", "notes": "Say it plainly."}


def _deck(cite_posts):
    c = ["S1001", "S2"] if cite_posts else ["S1"]
    return json.dumps({"deck_title": "Student AI talk on r/NEU", "answer": "Students want a say in AI decisions.", "slides": [
        dict(_slide("Students want a say in how Northeastern uses AI", c), layout="cover"),
        _slide("Students say AI-heavy assignments punish students who avoid AI", c),
        _slide("Students value Claude access but hit its weekly limits", c),
        _slide("A student group asks the university to slow classroom AI", ["S1"])]})


def test_the_deck_is_rewritten_when_it_leaves_out_the_asked_for_posts(monkeypatch):
    from ia_next import deckstudio
    eid = _engagement()
    sent = []

    def fake(model, system, messages, ledger, **kw):
        if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG):
            sent.append(messages[0]["content"])
            return _deck(cite_posts=len(sent) > 1), None, None          # the first draft cites only the news page
        return json.dumps({"titles": []}), None, None

    monkeypatch.setattr(providers, "claude", fake)
    store.TURN.set({"request": "create a Northeastern deck of #slides on the latest themes on r/neu (reddit) about AI"})
    tid, _ = store.create_task(eid, "deck", {"audience": "Northeastern leadership", "outline": [], "brand": "nu"}, 3.0)
    store.TURN.set(None)
    assert "r/neu" in store.get_task(tid)["brief"]["request"]
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert len(sent) == 2 and "REQUESTED SOURCES" in sent[0] and "YOUR FIRST DRAFT cited Reddit (r/neu) on 0 of the 3" in sent[1]
    assert "r/NEU: profs beefing up assignments" in sent[0]
    data = json.load(open(store.safe_path(eid, f"results/decks/{tid}/deck.json"), encoding="utf-8"))
    assert data["requested_sources"] == {"asked": "Reddit (r/neu)", "slides_citing": 2, "slides": 3}
    assert "2 of 3 slides after the cover cite Reddit (r/neu), as asked" in t["summary"]
    titles = {s["title"] for s in json.load(open(store.safe_path(eid, f"results/decks/{tid}/sources.json"), encoding="utf-8"))["sources"]}
    assert "r/NEU: Claude access limits" in titles


def test_a_deck_that_still_cites_none_of_them_is_not_shipped(monkeypatch):
    from ia_next import deckstudio
    eid = _engagement()

    def fake(model, system, messages, ledger, **kw):
        return (_deck(cite_posts=False) if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG) else json.dumps({"titles": []})), None, None

    monkeypatch.setattr(providers, "claude", fake)
    tid, _ = store.create_task(eid, "deck", {"audience": "leadership", "outline": [], "required_sources": ["reddit:r/NEU"]}, 3.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "failed" and "cites none of the Reddit (r/neu) posts" in t["error"]


def test_a_deck_asked_for_reddit_the_engagement_lacks_fails_with_the_tool_to_run():
    eid = _engagement(social=False)
    tid, _ = store.create_task(eid, "deck", {"audience": "leadership", "outline": [], "request": "a deck on r/NEU AI themes"}, 3.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "failed" and "start_social_analysis" in t["error"] and "Do not substitute" in t["error"]


def test_a_deck_from_social_listening_alone_no_longer_needs_a_research_report(monkeypatch):
    from ia_next import deckstudio
    eid = _engagement(research=False)
    monkeypatch.setattr(providers, "claude", lambda model, system, messages, ledger, **kw: (
        (_deck(cite_posts=True).replace('"S1"]', '"S3"]') if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG)
         else json.dumps({"titles": []})), None, None))
    tid, _ = store.create_task(eid, "deck", {"audience": "leadership", "outline": []}, 3.0)
    deck.run_deck_task(tid)
    assert store.get_task(tid)["status"] == "done", store.get_task(tid)["error"]


def test_every_evidence_tool_takes_required_sources_and_the_brief_keeps_them(monkeypatch):
    names = {s["name"] for s in agent.TOOLS if "required_sources" in s["input_schema"]["properties"]}
    assert set(agent.EVIDENCE_TOOLS) <= names
    monkeypatch.setattr(deck, "run_deck_task", lambda tid: None)       # no background build, no model call
    eid = _engagement()
    tok = store.TURN.set({"request": "show me r/NEU themes"})
    try:
        out = agent.execute_tool("start_deck", {"engagement_id": eid, "audience": "leadership", "outline": [], "brand": "nu",
                                                "source_ids": [], "required_sources": ["reddit:r/NEU"]})
    finally:
        store.TURN.reset(tok)
    brief = store.get_task(out["task_id"])["brief"]
    assert brief["required_sources"] == ["reddit:r/NEU"] and brief["request"] == "show me r/NEU themes"
