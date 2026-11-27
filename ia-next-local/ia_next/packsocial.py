"""Reddit as part of every data pack: the subreddits of each selected pack are searched on every deep research run
(owner, 26 Nov 2026: "sub-reddits (use HiC to auto identify the top 25 or 50 sub-reddits for each industry data pack)
... crawled in association with EVERY data pack deep research for a given industry in IA NEXT LOCAL").

The lists (pack_subreddits.json) were made once, outside IA Next: HiC's "Suggest from goal" recommender answered each
pack's market-research questions (scripts/pack_market_queries.py), the subreddits the pack already follows as feeds were
added, and Reddit's own API confirmed each one exists, is public and safe for work, and has members
(scripts/suggest_pack_subreddits.py, verify_pack_subreddits.py; plans/qa-2026-11-25/PACK-SUBREDDITS.md). Nothing here
calls a model: a run reads Reddit through IA Next's app-only access (social.py).

For one pack: its subreddits are searched together, twenty-five to a request (Reddit's combined-subreddit search), with
the run's keywords; posts outside the period are left out; the rest are ranked against the research goal by meaning;
the best are read with their top comments and join the run as sources (kind "social", with their subreddit and date).
"""
import datetime as _dt
import json
import os
import time

from . import social

LISTS = os.path.join(os.path.dirname(__file__), "pack_subreddits.json")
PER_REQUEST = 25
POSTS_PER_PACK, POSTS_PER_PACK_DEEP = 6, 20
_CACHE = {}


def lists():
    """{pack id: [{"name", "subscribers", "from", "rationale"}]} (empty when the file is missing)."""
    if "lists" not in _CACHE:
        try:
            with open(LISTS, encoding="utf-8") as fh:
                _CACHE["lists"] = (json.load(fh) or {}).get("packs") or {}
        except (OSError, ValueError):
            _CACHE["lists"] = {}
    return _CACHE["lists"]


def subreddits(pack_id):
    return [s["name"] for s in lists().get(pack_id) or []]


def _t_for(window):
    days = (window or {}).get("days")
    if not (window or {}).get("since"):
        return "year"
    return "day" if days and days <= 1 else "week" if days and days <= 7 else "month" if days and days <= 31 else "year" if days and days <= 366 else "all"


def _inside(created_utc, window):
    if not (window or {}).get("since"):
        return True
    day = _dt.datetime.fromtimestamp(float(created_utc or 0), _dt.timezone.utc).date().isoformat()
    return window["since"] <= day <= (window.get("until") or "9999-12-31")


def _queries(query):
    """The run's keywords, and a looser form (its first three words): Reddit's search wants every word to appear."""
    words = [w for w in str(query or "").split() if w]
    out = [" ".join(words[:8])]
    if len(words) > 3:
        out.append(" ".join(words[:3]))
    return [q for q in dict.fromkeys(out) if q]


def search_pack(pack_id, query, window=None, limit=POSTS_PER_PACK, objective="", known=(), token=None, scores=None, get=None):
    """The best posts on the subject from one pack's subreddits: ([post dict], report)."""
    subs = subreddits(pack_id)
    if not subs:
        return [], {"pack": pack_id, "subreddits": 0, "requests": 0, "found": 0, "older": 0, "kept": 0}
    posts, report = search_names(subs, query, window, limit, objective, known, token, scores, get)
    report["pack"] = pack_id
    return posts, report


def search_names(subs, query, window=None, limit=POSTS_PER_PACK, objective="", known=(), token=None, scores=None, get=None):
    """The best posts on the subject from these subreddits, or from all of Reddit when the list is empty:
    ([post dict], report)."""
    subs = list(subs or [])
    report = {"subreddits": len(subs), "requests": 0, "found": 0, "older": 0, "kept": 0}
    if limit <= 0:
        return [], report
    cid, secret, ua = social.credentials()
    token = token or social._token(cid, secret, ua)
    get = get or social._get
    t = _t_for(window)
    found, seen = [], set(known or ())
    groups = ["+".join(subs[i:i + PER_REQUEST]) for i in range(0, len(subs), PER_REQUEST)] or [""]
    for q in _queries(query):
        for group in groups:
            path = f"/r/{group}/search" if group else "/search"            # no list: Reddit as a whole
            params = {"q": q[:512], "sort": "relevance", "t": t, "limit": 100, "type": "link"}
            if group:
                params["restrict_sr"] = 1
            try:
                listing = get(token, ua, path, params)
            except social._Skip:
                continue
            report["requests"] += 1
            for d in social._posts(listing):
                url = "https://www.reddit.com" + d["permalink"]
                if url in seen:
                    continue
                seen.add(url)
                if not _inside(d.get("created_utc"), window):
                    report["older"] += 1
                    continue
                found.append(d)
        if len(found) >= limit * 3:
            break
    report["found"] = len(found)
    if objective and len(found) > limit:
        if scores is None:
            from . import localrank
            scores = localrank.scores
        sc = scores(objective, [f"{d.get('title', '')}. {(d.get('selftext') or '')[:600]}" for d in found])
        if sc:
            found = [d for _s, d in sorted(zip(sc, found), key=lambda x: -x[0])]
    else:
        found.sort(key=lambda d: -(int(d.get("score") or 0) + 2 * int(d.get("num_comments") or 0)))
    out = []
    for d in found[:limit]:
        comments = social._top_comments(token, ua, d.get("id"))
        day = _dt.datetime.fromtimestamp(float(d.get("created_utc") or 0), _dt.timezone.utc).date().isoformat()
        out.append({"url": "https://www.reddit.com" + d["permalink"], "title": str(d.get("title") or "").strip()[:300],
                    "text": social._post_text(d, comments), "subreddit": d.get("subreddit") or "", "date": day,
                    "score": d.get("score"), "num_comments": d.get("num_comments"), "comments": len(comments),
                    "author": d.get("author") or "", "reddit_id": d.get("id")})
    report["kept"] = len(out)
    return out, report


def search_packs(pack_ids, query, window=None, limit=POSTS_PER_PACK, objective="", known=(), say=None, scores=None, get=None):
    """search_pack for each selected pack, one Reddit token for all: ([post with "pack"], {pack: report})."""
    have = [p for p in pack_ids if subreddits(p)]
    if not have:
        return [], {}
    cid, secret, ua = social.credentials()
    token = social._token(cid, secret, ua)
    seen, out, reports = set(known or ()), [], {}
    for p in have:
        if say:
            say(f"searching {len(subreddits(p))} subreddits of the {p.replace('_', ' ')} pack")
        posts, rep = search_pack(p, query, window, limit=limit, objective=objective, known=seen, token=token, scores=scores, get=get)
        reports[p] = rep
        for post in posts:
            seen.add(post["url"])
            out.append(dict(post, pack=p))
        time.sleep(0.5)
    return out, reports
