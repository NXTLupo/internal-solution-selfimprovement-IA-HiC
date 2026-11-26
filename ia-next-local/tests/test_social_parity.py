"""Social Analytics parity with the Social Research tool (enhancement plan Part 4 step 4): the person chooses the time
window and order, the analysis keeps a topic map from HiC's topic model, every post is listed by sentiment and exported
as CSV, and each run keeps its own files. No network: Reddit, HiC and the model are replaced."""
import csv
import io
import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import app as app_module, config, providers, social, store, themes  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _posts(n):
    return [{"id": f"S{i}", "url": f"https://www.reddit.com/r/NEU/comments/p{i}/x/", "title": f"Co-op portal post {i}",
             "text": f"The co-op portal never shows my status. Post {i} about advisors and portal delays.",
             "subreddit": "NEU", "score": 10 + i, "num_comments": i, "created_utc": 1790000000 + i * 86400} for i in range(1, n + 1)]


def _put(eid, rel, data):
    p = store.safe_path(eid, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(data, fh)


def test_time_window_and_sort_reach_reddit(monkeypatch):
    monkeypatch.setattr(social, "credentials", lambda: ("id", "secret", "ua"))
    monkeypatch.setattr(social, "_token", lambda cid, secret, ua: "tok")
    calls = []

    def fake_get(token, ua, path, params):
        calls.append((path, dict(params)))
        if path == "/search":
            return {"data": {"children": [{"kind": "t3", "data": {"id": "a1", "title": "Portal", "selftext": "Where is it?",
                                                                    "permalink": "/r/NEU/comments/a1/x/", "subreddit": "NEU"}}]}}
        return [{}, {"data": {"children": []}}]
    monkeypatch.setattr(social, "_get", fake_get)
    eid = store.create_engagement("e", "o")
    social.collect(eid, "co-op portal", [], 5, time_window="month", sort="new")
    assert calls[0][1]["t"] == "month" and calls[0][1]["sort"] == "new"
    social.collect(eid, "co-op portal", [], 5, time_window="decade", sort="random")      # unknown values fall back
    assert calls[-2][1]["t"] == "year" and calls[-2][1]["sort"] == "relevance"


def test_analysis_keeps_a_topic_map_a_post_browser_and_a_csv(monkeypatch):
    eid = store.create_engagement("e", "o")
    posts = _posts(10)
    _put(eid, "results/social_sources.json", {"query": "co-op portal", "subreddits": ["NEU"], "time_window": "month", "sort": "top", "sources": posts})
    reply = {"themes": [{"name": "Applicants cannot see their status", "sentiment": "negative", "meaning": "Students cannot tell where an application stands.",
                         "quotes": [{"quote": "The co-op portal never shows my status.", "source_id": "S1"}]}],
             "posts": [{"source_id": p["id"], "sentiment": "negative" if i % 2 else "positive"} for i, p in enumerate(posts)]}
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (json.dumps(reply), None, None))
    monkeypatch.setattr(themes, "cluster", lambda items, goal, tid=None, spent=None: {"topics": [
        {"id": 0, "post_ids": ["S1", "S2", "S3", "S4"], "top_terms": [("portal", 1.0), ("status", 0.8)]},
        {"id": 1, "post_ids": ["S5", "S6"], "top_terms": [("advisors", 1.0)]}]})
    tid = "task_social_1"
    hp, summary, result = social.analyze(eid, "Why do applicants lose trust?", providers.Ledger(), tid=tid)
    assert hp.replace("\\", "/").endswith(f"results/tasks/{tid}/social.html")
    assert [len(c["posts"]) for c in result["topic_map"]] == [4, 2] and result["topic_map"][0]["terms"][:2] == ["portal", "status"]
    assert result["topic_map"][0]["sentiment"] == {"positive": 2, "neutral": 0, "mixed": 0, "negative": 2}   # one scale (18 Nov)
    page = open(hp, encoding="utf-8").read()
    assert "Topic map" in page and "Every post read, by sentiment" in page and "the past month" in page and "top voted first" in page
    assert page.count("<tr>") == 10 + 2          # every post once, plus one header row per sentiment group
    rows = list(csv.DictReader(io.StringIO(open(store.safe_path(eid, f"results/tasks/{tid}/posts.csv"), encoding="utf-8").read())))
    assert len(rows) == 10 and rows[0]["themes"] == "Applicants cannot see their status" and rows[0]["date"].startswith("2026")
    assert os.path.isfile(store.safe_path(eid, "results/social.html"))      # the latest copy for older readers


def test_topic_map_is_skipped_without_hic(monkeypatch):
    def down(*a, **k):
        raise RuntimeError("HiC is not running")
    monkeypatch.setattr(themes, "cluster", down)
    eid = store.create_engagement("e", "o")
    assert social.topic_map(eid, _posts(10), {}, "goal") == []
    assert social.topic_map(eid, _posts(5), {}, "goal") == []             # too few posts to cluster


def test_posts_csv_route_rebuilds_for_older_runs():
    eid = store.create_engagement("e", "o")
    posts = _posts(3)
    _put(eid, "results/social_sources.json", {"query": "q", "sources": posts})
    _put(eid, "results/social.json", {"themes": [], "post_labels": {"S2": "negative"}})
    tid, _ = store.create_task(eid, "social", {"query": "q"}, 1.0, "k-social-old")
    store.update_task(tid, status="done")
    r = TestClient(app_module.app).get(f"/api/tasks/{tid}/posts.csv")
    assert r.status_code == 200 and "text/csv" in r.headers["content-type"]
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert [x["sentiment"] for x in rows] == ["unclassified", "negative", "unclassified"]
