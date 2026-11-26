"""The evidence every builder works from: one loader for the whole engagement, and the sources the person asked for.

18 Nov owner failure: asked three times for a deck on "the latest themes in social discourse on r/neu (reddit) about AI",
the person got a polished deck with no Reddit in it. The Reddit listening had finished (8 themes, 50 posts), but the
deck read only results/findings.json, which only a research report or an upload analysis writes. The deck failed with
"run a research report first", the agent obeyed, the web report found campus news, and the deck was built from that.

So: (1) a finished Reddit listening is evidence like any other: its themes' verified quotes become findings and its
posts become sources, for decks, artifacts, themes, journeys and studio outputs alike; (2) the sources the person
named (a subreddit, Reddit) are a contract: `requested()` reads them from the person's own words and from what the
agent declared, `load()` refuses to build without them and names the tool that collects them, and a builder checks
that the finished work actually cites them (`coverage()`).
"""
import datetime
import glob
import os
import re

from . import store, transcripts

# Reddit is the social source IA Next collects (social.py). A subreddit written as r/NAME is unambiguous; the word
# "reddit" alone asks for Reddit in general.
_SUBREDDIT = re.compile(r"(?:(?<![A-Za-z0-9_/])|(?<=reddit\.com/))r/([A-Za-z0-9_]{2,21})\b", re.I)
# The bare word asks for Reddit's own discussion only beside words for that discussion ("Reddit posts", "on Reddit",
# "reddit discourse"); "a deck on Reddit's IPO" is about the company and asks for no posts.
_TALK = r"(?:discussions?|discourse|posts?|threads?|comments?|conversations?|users|listening|sentiment|community|communities|chatter|social)"
_REDDIT_WORD = re.compile(rf"\breddit\b\W{{0,3}}(?:\w+\W+){{0,3}}?{_TALK}\b|\b{_TALK}\b\W+(?:\w+\W+){{0,3}}?(?:on|from|in|across)\s+reddit\b"
                          r"|\b(?:on|from|across)\s+reddit\b(?!['’]s\b)|\(reddit\)", re.I)
_DECLARED = re.compile(r"^(?:reddit\s*:\s*)?(?:r/)?([A-Za-z0-9_]{2,21})$", re.I)
# A social post whose id collided with a research source in an older engagement (the research run once numbered from
# its own file, not from the engagement) is read under S<n+1000>, a stable id no research run reaches.
_COLLISION_OFFSET = 1000


# What a builder says when the engagement holds nothing at all. It names every kind of evidence that counts, so the
# agent collects what the person asked for (18 Nov: "run a research report first" made it swap Reddit for web news).
NO_EVIDENCE = ("this engagement has no evidence yet, so there is nothing to make this from. Attach the files it should be "
               "made from, or switch research on, and start it again. (For the assistant: collect the kind the person "
               "asked for first: social listening (start_social_analysis) for Reddit, a transcript analysis for their "
               "files, or a research report for the web.)")


class MissingEvidence(ValueError):
    """The person asked for a kind of source the engagement does not have yet; the message says how to collect it."""


def requested(*texts, declared=None):
    """{"reddit": {"neu", ...}} for the sources the person named; an empty set means Reddit in general. Read from the
    person's own words (texts) and from the agent's declared required_sources ("reddit:r/NEU", "r/NEU", "reddit")."""
    want = {}
    for t in texts:
        t = str(t or "")
        subs = {m.group(1).lower() for m in _SUBREDDIT.finditer(t)}
        if subs or _REDDIT_WORD.search(t):
            want.setdefault("reddit", set()).update(subs)
    for d in declared or []:
        d = str(d or "").strip()
        if not d:
            continue
        if d.lower() in ("reddit", "social", "social listening"):
            want.setdefault("reddit", set())
            continue
        m = _DECLARED.match(d)
        if m and (d.lower().startswith(("reddit", "r/"))):
            want.setdefault("reddit", set()).add(m.group(1).lower())
    return want


def describe(want):
    """"Reddit (r/NEU)" for messages."""
    subs = sorted(want.get("reddit") or [])
    return "Reddit" + (f" ({', '.join('r/' + s for s in subs)})" if subs else "") if "reddit" in want else ""


def _subreddit_of(url):
    m = re.search(r"reddit\.com/r/([A-Za-z0-9_]+)/", str(url or ""))
    return m.group(1) if m else ""


def is_reddit(source):
    return "reddit.com/" in str(source.get("url") or "")


def _date(utc):
    try:
        return datetime.datetime.fromtimestamp(float(utc), datetime.timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return ""


def social(eid):
    """(findings, sources) from every finished Reddit listening in the engagement: each theme's verified quotes as
    findings, the posts as sources titled "r/SUB: title". Posts quoted by a theme come first."""
    runs, seen_runs = [], set()
    rels = ["results/social.json"] + sorted(
        os.path.relpath(p, store.safe_path(eid, ".")).replace("\\", "/")
        for p in glob.glob(os.path.join(store.safe_path(eid, "results/tasks"), "*", "social.json")))
    for rel in rels:
        d = transcripts._load(eid, rel, None)
        if not isinstance(d, dict) or not d.get("themes"):
            continue
        key = repr([(t.get("name"), len(t.get("quotes") or [])) for t in d["themes"]]) + str(d.get("query"))
        if key not in seen_runs:
            seen_runs.add(key)
            runs.append(d)
    posts = {}
    collected = transcripts._load(eid, "results/social_sources.json", {}) or {}
    for p in collected.get("sources") or []:
        if p.get("id") and is_reddit(p):
            posts[p["id"]] = p
    # older runs' posts live in the evidence index (results/social_sources.json holds only the latest collection)
    for r in store.conn().execute("SELECT source_id, url, title, text FROM evidence WHERE engagement_id = ? AND url LIKE ?",
                                  (eid, "%reddit.com/%")):
        posts.setdefault(r["source_id"], {"id": r["source_id"], "url": r["url"], "title": r["title"], "text": r["text"]})
    findings, quoted = [], []
    for d in runs:
        for t in d["themes"]:
            for q in t.get("quotes") or []:
                sid = q.get("source_id")
                if sid in posts and str(q.get("quote") or "").strip():
                    findings.append({"source_id": sid, "claim": f"{t.get('name', '')}: {t.get('meaning', '')}".strip(": "),
                                     "quote": q["quote"], "claim_type": "DEFENSIBLE_INFERENCE", "family": "reddit",
                                     "theme": t.get("name", ""), "sentiment": t.get("sentiment", "")})
                    quoted.append(sid)
    order = list(dict.fromkeys(quoted)) + [k for k in posts if k not in set(quoted)]
    sources = []
    for sid in order:
        p = posts[sid]
        sub = p.get("subreddit") or _subreddit_of(p.get("url"))
        title = str(p.get("title") or "").strip()
        sources.append({"id": sid, "url": p.get("url", ""), "title": f"r/{sub}: {title}" if sub else title,
                        "text": p.get("text") or "", "publisher": f"Reddit r/{sub}" if sub else "Reddit",
                        "date": _date(p.get("created_utc")), "kind": "social", "family": "reddit", "subreddit": sub,
                        "untrusted": True})
    return findings, sources


def _size_word(share):
    return ("one of the most discussed" if share >= 0.25 else "a substantial share of the discussion" if share >= 0.15
            else "a smaller group of posts")


_SENTIMENT_WORD = {"positive": "mostly positive", "negative": "mostly negative", "neutral": "mostly neutral",
                   "mixed": "split between positive and negative"}


def shared_themes(eid):
    """The themes of the engagement's latest shared Reddit analysis (Social Research's canonical run, adopted by
    social.adopt_shared), largest first, each with its size and sentiment in words for a deck (whose rule keeps numbers
    inside quotes). [] when the engagement has only a local analysis."""
    d = transcripts._load(eid, "results/social.json", {}) or {}
    if (d.get("engine") or {}).get("name") != "social-research":
        return []
    out = []
    for t in d.get("themes") or []:
        out.append({"name": t["name"], "meaning": t.get("meaning", ""), "sentiment": t.get("sentiment", ""),
                    "count": t.get("count"), "share": t.get("share") or 0.0, "sentiment_split": t.get("sentiment_split") or {},
                    "size_words": _size_word(float(t.get("share") or 0.0)),
                    # Social Research's weighted verdict, worded; "contested" when both sides carry real weight
                    "sentiment_words": _SENTIMENT_WORD.get(t.get("sentiment"), "mostly neutral")
                    + (", with strong views on both sides" if t.get("contested") else "")})
    return out


def load(eid, want=None):
    """(findings, sources, info) for the whole engagement: research and upload findings with their sources, plus
    every Reddit listening. Findings and sources of the kind the person asked for come first. Raises
    FileNotFoundError when the engagement holds no evidence at all, and MissingEvidence when it lacks a kind of
    source the person asked for (the message names the tool that collects it)."""
    want = want or {}
    findings = list(transcripts._load(eid, "results/findings.json", {}).get("findings") or [])
    sources = list(transcripts._load(eid, "results/sources.json", {}).get("sources") or [])
    sf, ss = social(eid)
    by_url = {s.get("url"): s["id"] for s in sources if s.get("url")}
    used = {s["id"] for s in sources}
    remap = {}
    for p in ss:
        if p["url"] in by_url:                       # the research run already read this post (it folds Reddit in)
            remap[p["id"]] = by_url[p["url"]]
            continue
        if p["id"] in used:
            n = int(p["id"][1:]) if p["id"][1:].isdigit() else len(used)
            new = f"S{n + _COLLISION_OFFSET}"
            while new in used:
                new = f"S{int(new[1:]) + 1}"
            remap[p["id"]] = new
            p = dict(p, id=new)
        used.add(p["id"])
        sources.append(p)
    known = {f.get("source_id") + "|" + str(f.get("quote")) for f in findings}
    for f in sf:
        f = dict(f, source_id=remap.get(f["source_id"], f["source_id"]))
        if f["source_id"] + "|" + f["quote"] not in known:
            findings.append(f)
    if not findings and not sources:
        raise FileNotFoundError("no evidence")
    reddit_ids = {s["id"] for s in sources if is_reddit(s)}
    info = {"want": want, "reddit_ids": reddit_ids, "required_ids": set(), "counts": {
        "findings": len(findings), "sources": len(sources), "reddit_posts": len(reddit_ids)}}
    if "reddit" in want:
        subs = want["reddit"]
        have = {s["id"] for s in sources if is_reddit(s) and (not subs or (s.get("subreddit") or _subreddit_of(s.get("url"))).lower() in subs)}
        if not have:
            where = " and ".join("r/" + s for s in sorted(subs)) if subs else "Reddit"
            raise MissingEvidence(
                f"the person asked for {describe(want)} and this engagement has no {where} posts yet, so this cannot be built "
                f"from them. Start social listening on {where} first (start_social_analysis with those subreddits), then "
                "start this again once it finishes. Do not substitute a research report or other sources.")
        info["required_ids"] = have
        findings.sort(key=lambda f: f.get("source_id") not in have)
        sources.sort(key=lambda s: s["id"] not in have)
        info["themes"] = shared_themes(eid)      # the unified Reddit approach: the same themes every surface shows
    return findings, sources, info


def instruction(info):
    """The composer's instruction for the sources the person named; "" when they named none."""
    if not info.get("required_ids"):
        return ""
    text = (f"REQUESTED SOURCES: the person asked for {describe(info['want'])}. The sources titled \"r/...\" are that discussion "
            "and they are what this work is about. Build the argument on them: every slide or section that states a theme, "
            "a finding or a sentiment cites at least one of them, and most quotes come from them. Other sources may add "
            "context in one or two places only, and never stand in for them.")
    if info.get("themes"):
        lines = "\n".join(f"{i + 1}. {t['name']}: {t['meaning']} ({t['size_words']}; {t['sentiment_words']})"
                          for i, t in enumerate(info["themes"]))
        text += ("\nTHE THEMES ARE FIXED. The shared Reddit analysis (the same one the Social Research page and IA Next "
                 "show) found these themes, largest first. Present every one of them, in this order, without merging, "
                 "splitting or renaming them: write each theme's name word for word on the slide that covers it (a card "
                 "heading, a table cell or a bullet point), and describe its size and sentiment in the words given in "
                 "brackets.\n" + lines)
    return text


def missing_themes(slides, info):
    """Names of the shared themes no slide carries word for word (kicker, card heading, title, points or table)."""
    names = [t["name"] for t in info.get("themes") or []]
    if not names:
        return []
    seen = " ".join(" ".join([s.get("kicker") or "", s.get("title") or "", " ".join(s.get("points") or []),
                              " ".join(c.get("heading", "") for c in s.get("cards") or []),
                              " ".join(" ".join(r) for r in (s.get("table") or {}).get("rows") or [])]) for s in slides).lower()
    return [n for n in names if n.lower() not in seen]


def prefer(info):
    """secondbrain.material's keyword for the requested sources: {} when the person named none, so a build that asked
    for nothing calls it exactly as before."""
    return {"prefer": info["required_ids"]} if info.get("required_ids") else {}


def cited_ids(slide):
    return set(slide.get("cites") or []) | ({slide["source_id"]} if slide.get("source_id") else set())


def coverage(slides, info, skip_first=True):
    """(content slides citing a requested source, content slides); (0, 0) when the person named no source."""
    req = info.get("required_ids") or set()
    if not req:
        return 0, 0
    body = slides[1:] if skip_first else slides
    return sum(1 for s in body if cited_ids(s) & req), len(body)


def request_text(brief):
    """The person's words for a task: the message that started it and the agent's audience and outline."""
    return " ".join([str(brief.get("request") or ""), str(brief.get("audience") or ""), str(brief.get("goal") or ""),
                     " ".join(str(x) for x in (brief.get("outline") or []))])


def wanted(brief):
    """requested() for a task brief."""
    return requested(request_text(brief), declared=brief.get("required_sources"))
