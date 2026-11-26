"""The unified Reddit approach (2026-11-18): Social Research runs the one canonical analysis, and IA Next's Social
Analyst, the agent's answers and every deck read that run, so all three show the same themes, counts and sentiment.
Before: the same question gave a year of posts in IA Next, four topic-model clusters in Social Research, and a deck
built on the first. No network: Social Research's HTTP API, Reddit and the models are replaced."""
import datetime
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, material, providers, social, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


UTC = datetime.datetime(2026, 10, 1, tzinfo=datetime.timezone.utc).timestamp()
RT = {"method": "reddit-themes/1", "subreddit": "NEU", "keyword": "AI",
      "window": {"start": "2026-08-17", "end": "2026-11-17", "first_post": UTC - 86400 * 30, "last_post": UTC + 86400 * 40},
      "themes": [
          {"name": "Coursework fairness", "meaning": "Students say AI-driven workload changes punish students who avoid AI.",
           "post_ids": ["r1", "r2"], "count": 2, "share": 0.6667, "sentiment": "negative", "mean_score": -0.6,
           "sentiment_split": {"positive": 0, "neutral": 0, "negative": 2},
           "quotes": [{"quote": "profs are beefing up assignments to compensate for AI usage", "post_id": "r1"}]},
          {"name": "Claude access", "meaning": "Students value Claude but hit its limits.", "post_ids": ["r3"], "count": 1,
           "share": 0.3333, "sentiment": "positive", "mean_score": 0.4, "sentiment_split": {"positive": 1, "neutral": 0, "negative": 0},
           "quotes": [{"quote": "Northeastern Claude runs out before Friday", "post_id": "r3"}]}],
      "off_topic": ["r4"], "unthemed": [], "not_matching_keyword": ["r5"],
      "posts": [
          {"id": "r1", "url": "https://www.reddit.com/r/NEU/comments/r1/x/", "title": "Assignments", "created_utc": UTC,
           "sentiment": "negative", "theme": "Coursework fairness", "text": "profs are beefing up assignments to compensate for AI usage"},
          {"id": "r2", "url": "https://www.reddit.com/r/NEU/comments/r2/x/", "title": "TA feedback", "created_utc": UTC,
           "sentiment": "negative", "theme": "Coursework fairness", "text": "The TA clearly used AI on my feedback"},
          {"id": "r3", "url": "https://www.reddit.com/r/NEU/comments/r3/x/", "title": "Claude", "created_utc": UTC,
           "sentiment": "positive", "theme": "Claude access", "text": "Northeastern Claude runs out before Friday but AI helps"},
          {"id": "r4", "url": "https://www.reddit.com/r/NEU/comments/r4/x/", "title": "Math class", "created_utc": UTC,
           "sentiment": "neutral", "theme": "off topic", "text": "Which probability class? maybe AI later"}],
      "sentiment_split": {"positive": 1, "neutral": 0, "negative": 2},
      "sentiment_split_all_posts": {"positive": 1, "neutral": 1, "negative": 2},
      "counts": {"posts": 4, "on_topic": 3, "off_topic": 1, "themed": 3, "not_matching_keyword": 1}}
RESULT = {"reddit_themes": RT, "topics": {"neutral": {"topics": [
    {"id": 0, "post_ids": ["r1", "r2", "r4"], "short_summary": "Coursework and AI", "terms": [{"term": "class"}, {"term": "ai"}]}]}}}


class FakeResponse:
    def __init__(self, code, body):
        self.status_code, self._body, self.text = code, body, json.dumps(body)

    def json(self):
        return self._body


def _fake_social_research(found=False, statuses=("processing", "completed")):
    calls = []
    seq = list(statuses)

    def request(method, url, timeout=60, **kw):
        calls.append((method, url.split("8081")[-1] if "8081" in url else url, kw))
        if url.endswith("/api/topic-model/find"):
            return FakeResponse(200, {"job_id": "job-old", "project_id": "proj-old"}) if found else FakeResponse(404, {"error": "none"})
        if url.endswith("/api/topic-model/analyze-async"):
            return FakeResponse(200, {"job_id": "job-new", "project_id": "proj-new", "status": "pending"})
        if "/job-status/" in url:
            st = seq.pop(0) if len(seq) > 1 else seq[0]
            return FakeResponse(200, {"status": st, "result": RESULT} if st == "completed" else {"status": st, "progress": 50})
        raise AssertionError(url)
    return request, calls


def test_the_period_is_exact_when_given_and_counted_back_otherwise():
    today = datetime.date(2026, 11, 17)
    assert social.resolve_window("2026-08-17", "2026-11-17", "year", today) == ("2026-08-17", "2026-11-17")
    assert social.resolve_window("", "", "month", today) == ("2026-10-17", "2026-11-17")
    assert social.resolve_window("", "", "all", today) == ("", "")
    assert social.resolve_window("2026-08-17", "", "year", today) == ("2026-08-17", "2026-11-17")


def test_a_matching_finished_run_is_reused_and_a_new_one_is_polled_to_the_end(monkeypatch):
    request, calls = _fake_social_research(found=True)
    monkeypatch.setattr(social.httpx, "request", request)
    result, project, reused = social.shared_run("AI", "NEU", "2026-08-17", "2026-11-17", sleep=lambda s: None)
    assert reused and project == "proj-old" and not any("analyze-async" in c[1] for c in calls)
    assert calls[0][2]["params"] == {"subreddit": "NEU", "keyword": "AI", "startDate": "2026-08-17", "endDate": "2026-11-17"}
    request, calls = _fake_social_research(found=False, statuses=("pending", "processing", "completed"))
    monkeypatch.setattr(social.httpx, "request", request)
    result, project, reused = social.shared_run("AI", "NEU", "2026-08-17", "2026-11-17", sleep=lambda s: None)
    post = next(c for c in calls if "analyze-async" in c[1])
    assert not reused and project == "proj-new" and post[2]["json"]["startDate"] == "2026-08-17"
    assert result["reddit_themes"]["themes"][0]["name"] == "Coursework fairness"


def test_a_failed_or_themeless_run_is_reported_so_the_local_analyst_takes_over(monkeypatch):
    request, _ = _fake_social_research(statuses=("failed",))
    monkeypatch.setattr(social.httpx, "request", request)
    with pytest.raises(social.SharedUnavailable):
        social.shared_run("AI", "NEU", "2026-08-17", "2026-11-17", sleep=lambda s: None)


def test_the_social_task_adopts_the_shared_run_with_no_model_call(monkeypatch):
    eid = store.create_engagement("r/NEU AI", "AI themes on r/NEU")
    store.add_evidence(eid, "S1", "https://huntnewsnu.com/x", "News", "a news page")       # earlier evidence keeps S1
    monkeypatch.setattr(social, "shared_run", lambda *a, **k: (RESULT, "proj-new", False))
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no model call")))
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU"], "objective": "AI themes on r/NEU",
                                               "start_date": "2026-08-17", "end_date": "2026-11-17", "brand": "nu"}, 1.0)
    social.run_social_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert "the same run Social Research shows" in t["summary"] and "2026-08-17 to 2026-11-17" in t["summary"]
    data = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/social.json"), encoding="utf-8"))
    assert [(th["name"], th["count"], th["sentiment"]) for th in data["themes"]] == [("Coursework fairness", 2, "negative"),
                                                                                     ("Claude access", 1, "positive")]
    assert data["themes"][0]["quotes"] == [{"quote": "profs are beefing up assignments to compensate for AI usage", "source_id": "S2"}]
    assert data["sentiment_split"] == {"positive": 1, "neutral": 1, "negative": 2, "unclassified": 0}
    assert data["engine"]["project_id"] == "proj-new" and data["engine"]["page"].endswith("/topic-modeling/proj-new")
    assert data["topic_map"][0]["label"] == "Coursework and AI" and data["off_topic"] == ["S5"]
    page = open(store.safe_path(eid, f"results/tasks/{tid}/social.html"), encoding="utf-8").read()
    assert "One shared analysis" in page and "2 posts" in page and "2026-08-17 to 2026-11-17" in page
    assert social.period(eid, tid) == "period 2026-08-17 to 2026-11-17"
    # a deck reads the same themes and posts (material.py), so it argues from the run every surface shows
    findings, sources, info = material.load(eid, material.requested("themes on r/NEU"))
    assert {f["quote"] for f in findings} == {"profs are beefing up assignments to compensate for AI usage",
                                              "Northeastern Claude runs out before Friday"}
    assert info["required_ids"] == {"S2", "S3", "S4", "S5"}


def _studio_slide(title, cites, cards=()):
    return {"layout": "cards" if cards else "bullets", "kicker": "", "title": title, "subtitle": "", "takeaway": "Act on it.",
            "points": ["Students raise it often", "It shapes trust"], "cards": [{"heading": h, "body": "b"} for h in cards],
            "table": {"columns": [], "rows": []}, "steps": [], "arch": {"sources": [], "layer": {"name": "", "items": []}, "views": []},
            "quote": "", "source_id": "", "cites": cites, "image_prompt": "", "notes": "n"}


def test_a_deck_from_the_shared_run_carries_the_same_themes_in_order(monkeypatch):
    from ia_next import deck, deckstudio
    eid = store.create_engagement("r/NEU AI", "AI themes on r/NEU")
    monkeypatch.setattr(social, "shared_run", lambda *a, **k: (RESULT, "proj-new", False))
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU"], "objective": "o",
                                               "start_date": "2026-08-17", "end_date": "2026-11-17"}, 1.0)
    social.run_social_task(tid)
    sent = []

    def fake(model, system, messages, ledger, **kw):
        if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG):
            sent.append(messages[0]["content"])
            names = ["Coursework fairness"] + (["Claude access"] if len(sent) > 1 else [])
            return json.dumps({"deck_title": "r/NEU and AI", "answer": "a", "slides": [
                dict(_studio_slide("Students want a say in AI decisions", ["S1"]), layout="cover"),
                _studio_slide("AI coursework changes and Claude limits drive the talk", ["S1", "S3"], cards=names)]}), None, None
        return json.dumps({"titles": []}), None, None

    monkeypatch.setattr(providers, "claude", fake)
    dt, _ = store.create_task(eid, "deck", {"audience": "leadership", "outline": [], "required_sources": ["reddit:r/NEU"]}, 3.0)
    deck.run_deck_task(dt)
    assert store.get_task(dt)["status"] == "done", store.get_task(dt)["error"]
    assert "THE THEMES ARE FIXED" in sent[0] and "1. Coursework fairness:" in sent[0] and "2. Claude access:" in sent[0]
    assert "one of the most discussed; mostly negative" in sent[0]
    assert len(sent) == 2 and "left out these shared themes: Claude access" in sent[1]
    data = json.load(open(store.safe_path(eid, f"results/decks/{dt}/deck.json"), encoding="utf-8"))
    assert data["shared_themes"] == {"expected": ["Coursework fairness", "Claude access"], "missing": []}


def test_without_social_research_the_local_collector_keeps_the_exact_period(monkeypatch):
    eid = store.create_engagement("r/NEU AI", "AI themes")
    seen = {}

    def fake_collect(eid_, query, subs, limit, window, sort, start="", end=""):
        seen.update(start=start, end=end)
        return "p", "1 post", [{"id": "S1", "url": "https://www.reddit.com/r/NEU/comments/a/x/", "title": "t", "text": "AI"}]

    monkeypatch.setattr(social, "collect", fake_collect)
    monkeypatch.setattr(social, "analyze", lambda *a, **k: ("h", "s", {"themes": [{"name": "x"}], "dropped_quotes_not_in_source": 0}))
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU"], "objective": "o",
                                               "start_date": "2026-08-17", "end_date": "2026-11-17"}, 1.0)
    social.run_social_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done" and seen == {"start": "2026-08-17", "end": "2026-11-17"}
    assert "WITHOUT Social Research" in t["summary"] and "not comparable" in t["summary"]


def test_the_agent_reads_what_a_listening_actually_covers():
    eid = store.create_engagement("r/NEU AI", "AI on r/NEU from 17 August to 17 November")
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU"], "objective": "17 Aug to 17 Nov"}, 1.0)
    store.update_task(tid, status="done", summary="Social analysis ready: 8 themes from 2 Reddit posts")
    old = datetime.datetime(2025, 11, 18, tzinfo=datetime.timezone.utc).timestamp()
    social._write(eid, "results/social_sources.json", {"query": "AI", "sources": [{"id": "S1", "created_utc": old},
                                                                                {"id": "S2", "created_utc": UTC}]})
    social._write(eid, f"results/tasks/{tid}/social.json", {"query": "AI", "themes": []})
    ctx = agent.focus_context(eid)
    assert "Covers: posts dated 2025-11-18 to 2026-10-01; no period was applied" in ctx
    assert agent._list_engagements(eid)["tasks"][0]["covers"].startswith("posts dated 2025-11-18")


def test_the_tool_takes_the_period_and_says_it_reads_the_shared_run():
    spec = next(s for s in social.TOOLS if s["name"] == "start_social_analysis")
    assert {"start_date", "end_date"} <= set(spec["input_schema"]["properties"])
    assert "Social Research" in spec["description"] and "never describe a listening's period from its objective" in spec["description"]
    assert social.POST_SENTIMENTS == ("positive", "neutral", "negative")


def test_posts_collected_across_subreddits_get_social_researchs_method(monkeypatch):
    eid = store.create_engagement("Boston AI", "AI themes")
    collected = [{"id": "S1", "url": "https://www.reddit.com/r/NEU/comments/r1/x/", "title": "Assignments", "text": "t",
                  "reddit_id": "r1", "permalink": "/r/NEU/comments/r1/x/", "content": "profs are beefing up assignments",
                  "comment_bodies": ["AI everywhere"], "created_utc": UTC, "score": 3, "num_comments": 1, "author": "a"}]
    monkeypatch.setattr(social, "collect", lambda *a, **k: ("p", "1 post", collected))
    sent = {}

    def request(method, url, timeout=60, **kw):
        sent["url"], sent["json"] = url, kw.get("json")
        return FakeResponse(200, {"reddit_themes": RT})

    monkeypatch.setattr(social.httpx, "request", request)
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no model call in IA Next")))
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU", "BostonU"], "objective": "o",
                                               "start_date": "2026-08-17", "end_date": "2026-11-17"}, 1.0)
    social.run_social_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert sent["url"].endswith("/api/topic-model/themes") and sent["json"]["subreddit"] == "r/NEU, r/BostonU"
    assert sent["json"]["posts"][0]["id"] == "r1" and sent["json"]["posts"][0]["comments"] == [{"body": "AI everywhere", "score": 0, "author": ""}]
    assert "analysed with Social Research's method" in t["summary"]
    data = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/social.json"), encoding="utf-8"))
    assert data["engine"]["via"] == "IA Next's collector, Social Research's method" and data["engine"]["project_id"] is None
    assert data["subreddits"] == ["NEU", "BostonU"] and data["themes"][0]["sentiment"] == "negative"


def test_an_old_listening_page_says_it_is_not_the_shared_method(tmp_path):
    from fastapi.testclient import TestClient
    from ia_next import app as app_module
    eid = store.create_engagement("r/NEU AI", "o")
    tid, _ = store.create_task(eid, "social", {"query": "AI", "subreddits": ["NEU"], "objective": "o"}, 1.0)
    page = social._write(eid, f"results/tasks/{tid}/social.html", "<html><body><h1>Reddit themes: AI</h1></body></html>")
    social._write(eid, f"results/tasks/{tid}/social.json", {"query": "AI", "themes": []})
    social._write(eid, "results/social_sources.json", {"query": "AI", "sources": [{"id": "S1", "created_utc": UTC}]})
    store.update_task(tid, status="done", result_path=page, summary="old")
    html = TestClient(app_module.app).get(f"/api/tasks/{tid}/view").text
    assert "Local method, not comparable with Social Research" in html and "posts dated 2026-10-01" in html
    social._write(eid, f"results/tasks/{tid}/social.json", {"query": "AI", "themes": [], "engine": {"name": "social-research"}})
    assert "Earlier analysis" not in TestClient(app_module.app).get(f"/api/tasks/{tid}/view").text


def test_deck_words_follow_the_weighted_verdict_and_mark_contested_themes():
    eid = store.create_engagement("e", "o")
    social._write(eid, "results/social.json", {"engine": {"name": "social-research"}, "themes": [
        {"name": "Jobs", "meaning": "m", "sentiment": "neutral", "contested": True, "share": 0.3, "count": 3},
        {"name": "Tools", "meaning": "m", "sentiment": "positive", "contested": False, "share": 0.1, "count": 1}]})
    words = [(t["name"], t["size_words"], t["sentiment_words"]) for t in material.shared_themes(eid)]
    assert words == [("Jobs", "one of the most discussed", "mostly neutral, with strong views on both sides"),
                     ("Tools", "a smaller group of posts", "mostly positive")]
