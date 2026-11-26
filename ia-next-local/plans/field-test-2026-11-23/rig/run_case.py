"""Development run of one case over the API (the page's own routes), with timings per step. The acceptance runs go
through the page; this is for measuring where the time goes between rebuilds.

usage: python run_case.py "<message>" [--packs a,b] [--eng <id> | --title "<title>"] [--test] [--no-start] [--wait 1800]
Prints the reply, the plan steps, then each task's nodes with seconds, the summary and the scorecard.
"""
import argparse
import json
import sys
import time
import urllib.request

B = "http://127.0.0.1:9460"


def call(method, path, body=None, timeout=900):
    req = urllib.request.Request(B + path, json.dumps(body).encode() if body is not None else None,
                                 {"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


ap = argparse.ArgumentParser()
ap.add_argument("message")
ap.add_argument("--packs", default="")
ap.add_argument("--eng", default="")
ap.add_argument("--title", default="")
ap.add_argument("--test", action="store_true", help="hide the engagement from the person's list")
ap.add_argument("--no-start", action="store_true")
ap.add_argument("--wait", type=int, default=2400)
ap.add_argument("--plan", default="", help="start and follow an existing plan instead of sending a message")
a = ap.parse_args()

eid = a.eng
if a.plan:
    plans = [a.plan]
elif not eid and a.title:
    eid = call("POST", "/api/engagements", {"title": a.title, "objective": a.message[:300], "test": a.test})["id"]
if not a.plan:
    cid = call("POST", "/api/conversations")["id"]
    t0 = time.time()
    out = call("POST", f"/api/conversations/{cid}/messages",
               {"text": a.message, "engagement_id": eid or None, "packs": [p for p in a.packs.split(",") if p]})
    print(f"engagement {eid or '(none)'} | reply in {time.time() - t0:.1f} s\n{out['reply'][:1500]}\n")
    plans = [x["output"].get("plan_id") for x in out.get("trace") or [] if isinstance(x.get("output"), dict) and x["output"].get("plan_id")]
    tasks = [x["output"].get("task_id") for x in out.get("trace") or [] if isinstance(x.get("output"), dict) and x["output"].get("task_id")]
    print("tools:", [x["tool"] for x in out.get("trace") or []], "| plans:", plans, "| tasks:", tasks)
if a.no_start or not plans:
    sys.exit(0)
pid = plans[0]
p = call("GET", f"/api/plans/{pid}")
for s in p.get("steps") or []:
    print(f"   step {s.get('key')}: {s.get('name')} | required={s.get('required')} on={s.get('on')} | expected {s.get('seconds')} s")
t0 = time.time()
# as the page does: a step the card shows switched off is sent as skipped (an empty list switches every step on)
call("POST", f"/api/plans/{pid}/start", {"skip": [s["key"] for s in p.get("steps") or [] if not s.get("on")], "options": {}})
seen, last = {}, ""
while time.time() - t0 < a.wait:
    time.sleep(5)
    p = call("GET", f"/api/plans/{pid}")
    state = p.get("status") or p.get("state")
    for tid in [x for x in (p.get("research_task"), p.get("task_id")) if x]:
        t = call("GET", f"/api/tasks/{tid}")
        for n in t.get("nodes") or []:
            key = (tid, n["specialist"])
            if n["state"] != seen.get(key):
                seen[key] = n["state"]
                dur = (n.get("finished") or time.time()) - (n.get("started") or time.time())
                print(f"[{time.time() - t0:6.0f} s] {tid} {n['specialist']}: {n['state']} ({dur:.0f} s) {str(n.get('summary') or n.get('error') or '')[:600]}")
    if state != last:
        print(f"[{time.time() - t0:6.0f} s] plan {state}")
        last = state
    if state in ("done", "failed", "stopped", "dismissed"):
        break
p = call("GET", f"/api/plans/{pid}")
print(json.dumps({k: p.get(k) for k in ("status", "error", "task_id")}, indent=1))
for tid in [x for x in (p.get("research_task"), p.get("task_id")) if x]:
    t = call("GET", f"/api/tasks/{tid}")
    print(f"\n{tid} {t['kind']} {t['status']} in {(t.get('updated') or 0) - (t.get('created') or 0):.0f} s\n  {t.get('summary') or t.get('error')}")
    print(f"  open: {B}/?task={tid}")
