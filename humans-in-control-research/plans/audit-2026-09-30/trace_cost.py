import json, glob, collections
tr = glob.glob("hic-workspace/sessions/**/traces/*.json", recursive=True)
agg=collections.defaultdict(lambda:[0,0,0,0.0])
for f in tr:
    try: t=json.load(open(f,encoding="utf-8"))
    except: continue
    lab=str(t.get("step_label") or "?"); m=str(t.get("model_id") or "?")
    p=t.get("prompt"); r=t.get("response")
    pl=len(json.dumps(p)) if not isinstance(p,str) else len(p)
    rl=len(json.dumps(r)) if not isinstance(r,str) else len(r)
    a=agg[(lab.split('-S')[0][:40],m)]; a[0]+=1; a[1]+=pl; a[2]+=rl; a[3]+=float(t.get("elapsed_ms") or 0)
print("step_label | model | calls | est prompt tok | est resp tok | avg s")
for (lab,m),v in sorted(agg.items(), key=lambda kv:-kv[1][1])[:30]:
    print(f"{lab} | {m} | {v[0]} | {v[1]//4:,} | {v[2]//4:,} | {v[3]/max(1,v[0])/1000:.0f}")
# receipts
rc = glob.glob("hic-workspace/sessions/_run-receipts/*.json")
print("receipts", len(rc))
if rc:
    r=json.load(open(rc[-1],encoding="utf-8")); print("receipt keys", list(r.keys())[:40]); s=json.dumps(r); print("has usage/tokens:", any(k in s for k in ("usage","tokens","input_tokens","promptTokenCount")))
    for k in ("steps","calls","model_calls","usage","cost"):
        if k in r: print(k, json.dumps(r[k], default=str)[:800])
