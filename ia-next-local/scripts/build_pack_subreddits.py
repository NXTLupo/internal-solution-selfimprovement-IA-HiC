"""Step 3 of the pack subreddit lists: ia_next/pack_subreddits.json (read by packsocial.py on every deep run) and the
markdown record plans/qa-2026-11-25/PACK-SUBREDDITS.md, from HiC's suggestions, the pack's own Reddit feeds and Reddit's
checks.

  python scripts/build_pack_subreddits.py SUGGESTIONS.json CURATED.json VERIFIED.json

Order inside a pack (at most 50): HiC's high-signal suggestions, then the subreddits the pack already follows as feeds,
then medium and low suggestions; inside each group, larger communities first. Only names Reddit confirmed are kept.
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pack_market_queries import PACKS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, "ia_next", "pack_subreddits.json")
OUT_MD = os.path.join(ROOT, "plans", "qa-2026-11-25", "PACK-SUBREDDITS.md")
MAX_PER_PACK = 50
RANK = {"high": 0, "feed": 1, "medium": 2, "low": 3}


def build(sugg, curated, verified):
    packs, dropped = {}, {}
    for pid, pack in PACKS.items():
        cands = {}
        for s in (sugg.get(pid) or {}).get("suggestions") or []:
            cands.setdefault(s["slug"].lower(), {"from": "HiC Suggest from goal", "signal": s["estimated_signal"], "rationale": s["rationale"]})
        for name in curated.get(pid) or []:
            c = cands.setdefault(name.lower(), {"from": "pack feed", "signal": "feed", "rationale": "followed by the pack as a feed in HiC"})
            if c["from"] != "pack feed":
                c["from"] = "HiC Suggest from goal and pack feed"
        keep, gone = [], []
        for slug, c in cands.items():
            v = verified.get(slug) or {}
            if v.get("ok"):
                keep.append(dict(c, name=v.get("name") or slug, subscribers=int(v.get("subscribers") or 0)))
            else:
                gone.append({"name": slug, "from": c["from"], "why": v.get("why") or "not checked"})
        def group(c):
            if c["from"] == "HiC Suggest from goal and pack feed":
                return 0
            if c["from"] == "HiC Suggest from goal":
                return RANK.get(c["signal"], 2)
            return RANK["feed"]
        keep.sort(key=lambda c: (group(c), -c["subscribers"]))
        packs[pid] = keep[:MAX_PER_PACK]
        dropped[pid] = gone
    return packs, dropped


def markdown(packs, dropped, sugg):
    total = sum(len(v) for v in packs.values())
    unique = len({s["name"].lower() for v in packs.values() for s in v})
    lines = [
        "# Subreddits crawled with every data pack (26 Nov 2026)",
        "",
        "Every deep research run in IA Next Local that uses a data pack searches that pack's subreddits below with the run's",
        "keywords, inside the run's period, and keeps the posts most about the research goal with their top comments",
        "(ia_next/packsocial.py). No listening task is needed first.",
        "",
        "How each list was made (once, outside IA Next):",
        "",
        "1. Market-research questions. For each pack, thirty questions a client team is most likely to ask about AI in that",
        "   industry: adoption, jobs to be done, results, blockers, customer and staff sentiment, vendors and regulation",
        "   (scripts/pack_market_queries.py).",
        "2. HiC's Suggest from goal. Those questions were given as the research goal to HiC's subreddit recommender",
        "   (services/subredditSuggester.ts: its own prompt, gemini-3.5-flash, through HiC's proxy), asked again with the",
        "   names already returned excluded until it reached fifty or ran dry (scripts/suggest_pack_subreddits.py). Gemini",
        "   was used only to write these lists; IA Next Local never calls it.",
        "3. The pack's own feeds. The subreddits HiC already follows for the pack as RSS feeds were added (260 feeds across 13",
        "   packs). Through RSS they returned about 1% of the time; here they are searched through Reddit's API instead.",
        "4. Reddit's check. Every name was looked up with Reddit's API: it must exist, be public, not be marked adult or",
        "   quarantined, and have at least 1,000 members (scripts/verify_pack_subreddits.py).",
        "",
        f"Result: {total} pack placements over {unique} distinct subreddits.",
        "",
        "| Pack | Questions | Subreddits crawled | Left out after Reddit's check |",
        "|---|---|---|---|",
    ]
    for pid, pack in PACKS.items():
        lines.append(f"| {pack['name']} | {len(pack['queries'])} | {len(packs[pid])} | {len(dropped[pid])} |")
    for pid, pack in PACKS.items():
        lines += ["", f"## {pack['name']}", "", f"Audience: {pack['audience']}.", "", "### Market-research questions", ""]
        lines += [f"{i}. {q}" for i, q in enumerate(pack["queries"], 1)]
        lines += ["", f"### Subreddits crawled ({len(packs[pid])})", "", "| Subreddit | Members | Named by | Why it is crawled |", "|---|---|---|---|"]
        for s in packs[pid]:
            lines.append(f"| r/{s['name']} | {s['subscribers']:,} | {s['from']} | {s['rationale'].replace('|', '/')} |")
        if dropped[pid]:
            lines += ["", "Left out after Reddit's check: " + "; ".join(f"r/{d['name']} ({d['why']})" for d in dropped[pid]) + "."]
    return "\n".join(lines) + "\n"


def main(sp, cp, vp):
    sugg = json.load(open(sp, encoding="utf-8"))
    curated = json.load(open(cp, encoding="utf-8"))
    verified = json.load(open(vp, encoding="utf-8"))
    packs, dropped = build(sugg, curated, verified)
    doc = {"made": dt.date.today().isoformat(), "method": "HiC Suggest from goal (gemini-3.5-flash, once) on each pack's market-research "
           "questions, plus the pack's own Reddit feeds; every name checked with Reddit's API", "packs": packs}
    with open(OUT_JSON, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
    with open(OUT_MD, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(markdown(packs, dropped, sugg))
    print({p: len(v) for p, v in packs.items()})


if __name__ == "__main__":
    main(*sys.argv[1:4])
