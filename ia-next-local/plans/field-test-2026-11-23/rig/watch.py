"""Watches IA Next Local tasks until none is running. Logs every node status change with wall time.
usage: python -I watch.py <label> [max_seconds]"""
import json, sys, time, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
B = "http://127.0.0.1:9460"
label = sys.argv[1]; max_s = float(sys.argv[2]) if len(sys.argv) > 2 else 3600
def get(p):
    with urllib.request.urlopen(B + p, timeout=30) as r: return json.load(r)
t0 = time.time(); seen = {}; started = False
while time.time() - t0 < max_s:
    try:
        tasks = get("/api/tasks")["tasks"]
    except Exception as e:
        print(f"[{time.time()-t0:6.0f}s] poll error {e}", flush=True); time.sleep(5); continue
    live = [t for t in tasks if t["status"] not in ("done", "failed", "stopped", "cancelled")]
    for t in live + [x for x in tasks if x["id"] in {k[0] for k in seen}]:
        try: d = get(f"/api/tasks/{t['id']}")
        except Exception: continue
        st = d.get("task", d).get("status")
        if seen.get((t["id"], "_")) != st:
            seen[(t["id"], "_")] = st
            print(f"[{time.time()-t0:6.0f}s] TASK {t['id']} {t['kind']} -> {st} :: {(d.get('task', d).get('summary') or d.get('task', d).get('error') or '')[:300]}", flush=True)
        for n in d.get("nodes", []):
            key = (t["id"], n.get("id"))
            val = (n.get("state"), n.get("model"))
            if seen.get(key) != val:
                seen[key] = val
                print(f"[{time.time()-t0:6.0f}s]   node {n.get('specialist') or n.get('name')} | {n.get("state")} | model={n.get('model')} | {str(n.get("summary") or n.get("error") or '')[:160]}", flush=True)
    if live: started = True
    if started and not live: break
    if not started and time.time() - t0 > 90: print("no live task after 90 s"); break
    time.sleep(4)
print(f"[{time.time()-t0:6.0f}s] {label}: finished watching", flush=True)
