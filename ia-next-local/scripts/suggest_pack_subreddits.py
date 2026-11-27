"""HiC's "Suggest from goal", run once per data pack, to name the subreddits every deep research run with that pack crawls.

Owner, 26 Nov 2026: "use HiC's 'SUGGEST FROM GOAL' feature to identify the top 25-50 sub reddits for each data pack ...
draft a markdown file that hypothesizes 25-50 of the most likely market research queries related to AI and that specific
industry, and identify the 25-50 sub-reddits that will be crawled in association with EVERY data pack deep research".

Step 1 (this script, on the host): for each pack, the market-research questions in pack_market_queries.py become the
research goal, and HiC's subreddit recommender answers exactly as the button does: the same system prompt (read from
humans-in-control-research/services/subredditSuggester.ts, so the two never drift), the same model (gemini-3.5-flash)
and settings, sent through HiC's proxy. It asks again with the names already returned excluded (as a person pressing
the button again would) until the pack has 50 names or two asks return nothing new.
Step 2 (verify_pack_subreddits.py, inside IA Next Local, with Reddit's API): every name is checked to exist, be public
and safe for work, and have recent posts. Step 3 writes ia_next/pack_subreddits.json and the markdown.

Run: python scripts/suggest_pack_subreddits.py OUT.json   (HiC's proxy must be running on 127.0.0.1:5012)
This sends 17 to 51 short Gemini Flash requests through HiC (HiC's key; IA Next Local itself never calls a paid model).
"""
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pack_market_queries import PACKS  # noqa: E402

HIC = "http://127.0.0.1:5012"
TS = r"D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\services\subredditSuggester.ts"
CONFIG = r"D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\hic-workspace\.runtime\config.json"
MODEL = "gemini-3.5-flash"
TARGET, ASKS = 50, 4


def system_prompt():
    src = open(TS, encoding="utf-8").read()
    m = re.search(r"const SYSTEM_PROMPT = `(.*?)`;", src, re.S)
    if not m:
        raise SystemExit("the recommender's prompt was not found in subredditSuggester.ts")
    return m.group(1)


def token():
    try:
        return str(json.load(open(CONFIG, encoding="utf-8")).get("proxyToken") or json.load(open(CONFIG, encoding="utf-8")).get("token") or "")
    except Exception:
        return ""


def goal_for(pid, pack):
    qs = "\n".join(f"- {q}" for q in pack["queries"])
    return (f"A standing market research program on AI in {pack['name']}: how {pack['audience']} adopt and experience AI, "
            f"in their own words. Every deep research run on this industry must be able to answer questions such as:\n{qs}\n"
            "Cover the practitioner side (people who work in the industry), the customer or end-user side, and the "
            "professional and trade communities, so the voice of each role is heard.")


def ask(prompt, goal, existing, max_n):
    user = (f"<research_goal>\n{goal}\n</research_goal>\n\n"
            + (f"<existing_subreddits_to_exclude>\n{', '.join(existing)}\n</existing_subreddits_to_exclude>\n\n" if existing else "")
            + f"<max_suggestions>{max_n}</max_suggestions>")
    body = {"model": MODEL, "systemInstruction": {"parts": [{"text": prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "config": {"temperature": 0.3, "maxOutputTokens": 4096, "thinkingBudget": "low", "responseMimeType": "application/json"}}
    headers = {"Content-Type": "application/json", "x-hic-session": "ia-next-pack-subreddits"}
    tok = token()
    if tok:
        headers["x-proxy-token"] = tok
    req = urllib.request.Request(f"{HIC}/api/ai/gemini", data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read().decode("utf-8"))
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1].removeprefix("json").strip()
    obj = json.loads(text)
    out = []
    for s in obj.get("suggestions") or []:
        slug = re.sub(r"[^a-z0-9_]", "", str(s.get("slug") or "").strip().lower().removeprefix("r/"))
        if slug:
            out.append({"slug": slug, "rationale": str(s.get("rationale") or "").strip()[:200],
                        "estimated_signal": s.get("estimated_signal") if s.get("estimated_signal") in ("high", "medium", "low") else "medium"})
    return out


def main(out_path):
    prompt = system_prompt()
    result = json.load(open(out_path, encoding="utf-8")) if os.path.exists(out_path) else {}
    for pid, pack in PACKS.items():
        if len(result.get(pid, {}).get("suggestions", [])) >= TARGET:
            continue
        goal = goal_for(pid, pack)
        got = list(result.get(pid, {}).get("suggestions", []))
        empty = 0
        for _ in range(ASKS):
            have = [s["slug"] for s in got]
            try:
                new = [s for s in ask(prompt, goal, have, min(50, TARGET - len(got))) if s["slug"] not in have]
            except Exception as e:
                print(f"{pid}: ask failed ({type(e).__name__}: {str(e)[:160]})")
                new = []
            got += new
            print(f"{pid}: +{len(new)} (now {len(got)})", flush=True)
            empty = empty + 1 if not new else 0
            if len(got) >= TARGET or empty >= 2:
                break
            time.sleep(1.0)
        result[pid] = {"name": pack["name"], "goal": goal, "model": MODEL, "suggestions": got[:TARGET]}
        json.dump(result, open(out_path, "w", encoding="utf-8"), indent=1)
    print("done:", {k: len(v["suggestions"]) for k, v in result.items()})


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "pack_subreddit_suggestions.json")
