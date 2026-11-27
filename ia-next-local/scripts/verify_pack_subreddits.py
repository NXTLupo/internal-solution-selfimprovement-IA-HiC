"""Step 2 of the pack subreddit lists: every name HiC's recommender suggested, and every subreddit the pack already
curates as a feed, is checked with Reddit's own API before IA Next crawls it (owner, 26 Nov 2026).

Runs inside the ia-next-local container (Reddit's app-only access, no model, no cost):
  docker exec -i ia-next-local python - < scripts/verify_pack_subreddits.py  with IN/OUT paths in the environment,
or with the input JSON on stdin and the result on stdout (see main). A subreddit passes when Reddit says it exists, is
public, is not marked adult or quarantined, and has at least MIN_SUBSCRIBERS members; its canonical spelling and
member count are kept. One request per name, paced under Reddit's free rate limit.
"""
import json
import sys
import time

MIN_SUBSCRIBERS = 1000
PACE = 0.7


def main():
    from ia_next import social
    data = json.load(sys.stdin)
    names = sorted({s.lower() for p in data.values() for s in (p.get("curated") or [])}
                   | {s["slug"].lower() for p in data.values() for s in (p.get("suggestions") or [])})
    cid, secret, ua = social.credentials()
    token, born = social._token(cid, secret, ua), time.time()
    checked = {}
    for i, n in enumerate(names):
        if time.time() - born > 3000:                     # app tokens last an hour
            token, born = social._token(cid, secret, ua), time.time()
        try:
            d = (social._get(token, ua, f"/r/{n}/about", {}) or {}).get("data") or {}
            ok = (d.get("subreddit_type") == "public" and not d.get("over18") and not d.get("quarantine")
                  and int(d.get("subscribers") or 0) >= MIN_SUBSCRIBERS and str(d.get("display_name") or "").lower() == n)
            checked[n] = {"ok": ok, "name": d.get("display_name") or n, "subscribers": int(d.get("subscribers") or 0),
                          "type": d.get("subreddit_type") or "", "adult": bool(d.get("over18")),
                          "title": str(d.get("title") or "")[:120],
                          "why": "" if ok else ("adult" if d.get("over18") else "quarantined" if d.get("quarantine")
                                               else f"{d.get('subreddit_type') or 'unknown'}" if d.get("subreddit_type") != "public"
                                               else f"{int(d.get('subscribers') or 0)} members" if int(d.get("subscribers") or 0) < MIN_SUBSCRIBERS
                                               else "renamed or redirected")}
        except social._Skip as e:
            checked[n] = {"ok": False, "name": n, "subscribers": 0, "why": f"not served ({e})"}
        except Exception as e:                            # a rate limit: wait and try once more
            time.sleep(30)
            try:
                d = (social._get(token, ua, f"/r/{n}/about", {}) or {}).get("data") or {}
                checked[n] = {"ok": d.get("subreddit_type") == "public" and not d.get("over18") and int(d.get("subscribers") or 0) >= MIN_SUBSCRIBERS,
                              "name": d.get("display_name") or n, "subscribers": int(d.get("subscribers") or 0), "why": ""}
            except Exception as e2:
                checked[n] = {"ok": False, "name": n, "subscribers": 0, "why": f"{type(e2).__name__}"}
        if i % 50 == 0:
            print(f"{i + 1} of {len(names)} checked", file=sys.stderr, flush=True)
        time.sleep(PACE)
    json.dump(checked, sys.stdout)


if __name__ == "__main__":
    main()
