"""Blocks until no IA Next Local task is live (or max seconds), printing node changes. usage: python -I wait.py [max_s]"""
import json, sys, time, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
B = "http://127.0.0.1:9460"; max_s = float(sys.argv[1]) if len(sys.argv) > 1 else 570
def get(p):
    with urllib.request.urlopen(B + p, timeout=30) as r: return json.load(r)
t0 = time.time(); seen = {}; last = ""
while time.time() - t0 < max_s:
    try:
        tasks = get("/api/tasks")["tasks"]
        live = [t for t in tasks if t["status"] in ("running", "queued", "waiting", "pending")]
        for t in live:
            d = get(f"/api/tasks/{t['id']}")
            for n in d.get("nodes", []):
                k = n["id"]; v = n["state"]
                if seen.get(k) != v:
                    seen[k] = v
                    dur = round((n.get("finished") or time.time()) - n["started"])
                    print(f"[{time.time()-t0:5.0f}s] {t['kind']} / {n['specialist']} | {v} | {dur}s | {str(n.get('model'))[-34:]} | {(n.get('summary') or n.get('error') or '')[:220]}", flush=True)
        if not live:
            print("no live task"); break
    except Exception as e:
        print("poll error", e)
    time.sleep(5)
for t in get("/api/tasks")["tasks"][:3]:
    print(t["id"], t["kind"], t["status"], round(t["updated"] - t["created"]), "s |", (t.get("summary") or t.get("error") or "")[:400])
