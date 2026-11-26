"""Case 3 over the API, timed: a new engagement with the Higher Ed and AI Trends packs, exhaustive themes, then one
request for an audio overview, a research report, a themes deck and a student journey map. Prints every step with its
seconds and each task's summary. Acceptance goes through the page; this measures.

usage: python run_case3.py [--title "..."] [--eng <id> to skip the themes stage]
"""
import argparse
import json
import time
import urllib.request

B = "http://127.0.0.1:9460"
PACKS = ["higher_ed", "ai_trends"]
THEMES = ("#themes Exhaustive themes on how higher education students use AI and how they feel about it")
MANY = ("Now make an audio overview, a research report, a themes PowerPoint deck and a student journey map from these findings")


def call(method, path, body=None, timeout=900):
    req = urllib.request.Request(B + path, json.dumps(body).encode() if body is not None else None,
                                 {"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def say(cid, eid, text):
    t0 = time.time()
    out = call("POST", f"/api/conversations/{cid}/messages", {"text": text, "engagement_id": eid, "packs": PACKS})
    plans = [x["output"]["plan_id"] for x in out.get("trace") or [] if isinstance(x.get("output"), dict) and x["output"].get("plan_id")]
    print(f"\n> {text}\n  reply in {time.time() - t0:.1f} s: {out['reply'][:400]}\n  tools {[x['tool'] for x in out.get('trace') or []]} plans {plans}", flush=True)
    return plans


def follow(pids, limit=5400):
    t0, seen, last = time.time(), {}, {}
    for pid in pids:
        p = call("GET", f"/api/plans/{pid}")
        print(f"  start {p['label']}: " + "; ".join(f"{s['name']} ({'on' if s['on'] else 'off'}, {s.get('seconds')} s)" for s in p["steps"]), flush=True)
        call("POST", f"/api/plans/{pid}/start", {"skip": [s["key"] for s in p["steps"] if not s.get("on")], "options": {}})
    while time.time() - t0 < limit:
        time.sleep(5)
        states = []
        for pid in pids:
            p = call("GET", f"/api/plans/{pid}")
            states.append(p["status"])
            if last.get(pid) != (p["status"], p.get("note")):
                last[pid] = (p["status"], p.get("note"))
                print(f"[{time.time() - t0:6.0f} s] plan {p['label']}: {p['status']} {p.get('note') or ''}", flush=True)
            for tid in [x for x in (p.get("research_task"), p.get("task_id")) if x]:
                t = call("GET", f"/api/tasks/{tid}")
                for n in t.get("nodes") or []:
                    key = (tid, n["specialist"])
                    if n["state"] != seen.get(key) and n["state"] != "running":
                        seen[key] = n["state"]
                        dur = (n.get("finished") or time.time()) - (n.get("started") or time.time())
                        print(f"[{time.time() - t0:6.0f} s] {p['label']} / {n['specialist']}: {n['state']} in {dur:.0f} s | "
                              f"{str(n.get('summary') or n.get('error') or '')[:500]}", flush=True)
        if all(s in ("done", "failed", "stopped", "dismissed") for s in states):
            break
    print(f"\nstage finished in {time.time() - t0:.0f} s", flush=True)
    for pid in pids:
        p = call("GET", f"/api/plans/{pid}")
        for tid in [x for x in (p.get("research_task"), p.get("task_id")) if x]:
            t = call("GET", f"/api/tasks/{tid}")
            print(f"  {p['label']}: {tid} {t['kind']} {t['status']} in {(t.get('updated') or 0) - (t.get('created') or 0):.0f} s | "
                  f"{t.get('summary') or t.get('error')}\n    {B}/api/tasks/{tid}/view", flush=True)


ap = argparse.ArgumentParser()
ap.add_argument("--title", default="Higher ed students and AI (uplift run)")
ap.add_argument("--eng", default="")
a = ap.parse_args()
T0 = time.time()
eid = a.eng or call("POST", "/api/engagements", {"title": a.title, "objective": "How higher education students use AI and how they feel about it"})["id"]
cid = call("POST", "/api/conversations")["id"]
print("engagement", eid, flush=True)
if not a.eng:
    follow(say(cid, eid, THEMES))
follow(say(cid, eid, MANY))
print(f"\nCASE 3 TOTAL {time.time() - T0:.0f} s", flush=True)
