"""Reddit as part of every data pack (26 Nov): each selected pack's subreddits (named once by HiC's Suggest from goal and
checked with Reddit) are searched on a research run, twenty-five to a request, inside the period, ranked against the
goal, read with their top comments, and kept as pack sources. Nothing here reaches Reddit or a model."""
import datetime as dt
import json

from ia_next import packsocial, providers, social, store, studio

REAL_SEARCH_NAMES = packsocial.search_names        # captured before the shared fixture stands in for it
NOW = dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc).timestamp()
OLD = dt.datetime(2025, 3, 1, tzinfo=dt.timezone.utc).timestamp()


def _listing(posts):
    return {"data": {"children": [{"kind": "t3", "data": p} for p in posts]}}


def _post(i, sub, title, created=NOW, body="", score=10):
    return {"id": f"p{i}", "title": title, "selftext": body, "permalink": f"/r/{sub}/comments/p{i}/x/", "subreddit": sub,
            "created_utc": created, "score": score, "num_comments": 3, "author": "someone"}


def _lists(monkeypatch, packs):
    monkeypatch.setattr(packsocial, "_CACHE", {"lists": {p: [{"name": n, "subscribers": 5000} for n in names] for p, names in packs.items()}})
    monkeypatch.setattr(packsocial, "search_names", REAL_SEARCH_NAMES)
    monkeypatch.setattr(social, "credentials", lambda: ("id", "secret", "ua"))
    monkeypatch.setattr(social, "_token", lambda *a: "tok")
    monkeypatch.setattr(social, "_top_comments", lambda token, ua, pid: ["The assistant answered stock questions in seconds."])


def test_a_packs_subreddits_are_searched_together_inside_the_period(monkeypatch):
    subs = [f"sub{i}" for i in range(30)]
    _lists(monkeypatch, {"retail": subs})
    asked = []

    def get(token, ua, path, params):
        asked.append(path)
        return _listing([_post(len(asked) * 10 + 1, "sub1", "Store staff on AI shopping assistants"),
                         _post(len(asked) * 10 + 2, "sub2", "Old thread about AI assistants", created=OLD)])
    window = {"since": "2026-11-01", "until": "2026-11-30", "days": 30, "label": "November 2026"}
    posts, report = packsocial.search_pack("retail", "AI shopping assistants", window, limit=5, get=get)
    assert asked[0] == "/r/" + "+".join(subs[:25]) + "/search" and asked[1] == "/r/" + "+".join(subs[25:]) + "/search"
    assert report["subreddits"] == 30 and report["older"] >= 1 and all(p["date"] == "2026-11-20" for p in posts)
    assert posts and "Top comments:" in posts[0]["text"] and posts[0]["url"].startswith("https://www.reddit.com/r/sub1/")


def test_posts_are_ranked_against_the_goal(monkeypatch):
    _lists(monkeypatch, {"retail": ["a", "b"]})
    get = lambda token, ua, path, params: _listing([_post(1, "a", "Parking at the mall"), _post(2, "a", "AI assistant handled my return"),
                                                    _post(3, "b", "Best pizza near the store")])
    score = lambda goal, texts: [0.9 if "AI assistant" in t else 0.1 for t in texts]
    posts, _ = packsocial.search_pack("retail", "AI assistant", None, limit=1, objective="AI assistants in retail service", get=get, scores=score)
    assert [p["title"] for p in posts] == ["AI assistant handled my return"]


def test_the_shipped_lists_hold_twenty_five_to_fifty_checked_subreddits_per_pack():
    with open(packsocial.LISTS, encoding="utf-8") as fh:
        doc = json.load(fh)
    packs = doc["packs"]
    assert len(packs) == 17
    for pid, subs in packs.items():
        assert 25 <= len(subs) <= 50, (pid, len(subs))
        assert all(s["subscribers"] >= 1000 and s["name"] for s in subs)
        assert len({s["name"].lower() for s in subs}) == len(subs)


def test_a_research_run_with_a_pack_reads_its_subreddits(monkeypatch):
    raw = {"candidates": [{"groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://www.retaildive.com/ai", "title": "retaildive.com"}}]}}]}
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, raw))
    monkeypatch.setattr(studio, "_fetch", lambda uri: ("Retailers are adding AI assistants to customer service. " * 20, uri, "AI in retail service"))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)
    monkeypatch.setattr("ia_next.hic.pack_items", lambda *a, **k: iter(()))
    asked = {}

    def fake(pack_ids, query, window=None, limit=6, objective="", known=(), say=None, scores=None, get=None):
        asked.update(packs=list(pack_ids), limit=limit)
        return [{"url": "https://www.reddit.com/r/retail/comments/p1/x/", "title": "AI kiosks at my store", "pack": "retail",
                 "text": "AI kiosks at my store\n\nTop comments:\n\n" + "Customers still ask staff for help with returns. " * 10,
                 "subreddit": "retail", "date": "2026-11-18"}], {"retail": {"kept": 1, "subreddits": 50}}
    monkeypatch.setattr(packsocial, "search_packs", fake)
    eid = store.create_engagement("Retail AI service", "o")
    brief = {"goal": "AI assistants in retail customer service", "scope": "", "audience": "leadership", "selected_packs": ["retail"],
             "window": {"since": "", "until": "", "label": "any time"}}
    _, summary, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1.0))
    post = next(s for s in sources if "reddit.com/r/retail" in s["url"])
    assert post["pack"] == "retail" and post["kind"] == "social" and post["publisher"] == "Reddit r/retail" and post["date"] == "2026-11-18"
    deep = studio.depth_of(brief) == "deep"
    assert asked == {"packs": ["retail"], "limit": packsocial.POSTS_PER_PACK_DEEP if deep else packsocial.POSTS_PER_PACK}
    assert "Reddit posts from the packs' subreddits" in summary
