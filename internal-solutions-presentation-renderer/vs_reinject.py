import json, urllib.request
BASE="http://127.0.0.1:5012"
slug="deliver-a-comprehensive-2026-outlook-on--b4gv38"
def get(p): return json.load(urllib.request.urlopen(BASE+p))
def post(p,b):
    r=urllib.request.Request(BASE+p,data=json.dumps(b).encode(),headers={"Content-Type":"application/json"},method="POST")
    return json.load(urllib.request.urlopen(r,timeout=200))
p=get(f"/api/presentations/{slug}")
brand="nu" if str(p.get("meta",{}).get("brand","NXT")).lower()=="nu" else "nxt"
canvas="light" if str(p.get("meta",{}).get("theme","dark"))=="light" else "dark"
SIDE={"context","cta","quotes"}
def slot_for(k): return "hero" if k=="hero" else ("side" if k in SIDE else "backdrop")
# RECOGNIZABLE, relevant SUBJECT seeds (the runtime VS diversifies + selects the witty angle).
seeds={
 "hero":"a cultivated farm field protected from a volatile sky by a precision-risk partnership",
 "context":"a farmer's field standing steady beneath a turbulent storm sky",
 "quotes":"a grower speaking plainly from the middle of their field",
}
n=0
for s in p["sections"]:
    k=s.get("kind"); d=s.setdefault("data",{})
    d.pop("illustration",None); d.pop("illustrationCanvas",None); d.pop("imageConcept",None); d.pop("imageCanvas",None)
    if k in seeds:
        d["imageConcept"]=seeds[k]
        r=post("/api/ai/illustration",{"concept":seeds[k],"brand":brand,"canvas":canvas,"slot":slot_for(k)})
        if r.get("url"):
            d["illustration"]=r["url"]; d["illustrationCanvas"]=canvas; n+=1
            print(f"  {k} (slot={slot_for(k)}): {'reused' if r.get('reused') else 'GEN'} -> {r['url']}")
p.setdefault("meta",{})["slug"]=slug
print("saved:",post("/api/presentations",p).get("url"),"| art on",n)
# Show what VS actually selected (the visual concept stored in the catalog)
cat=get("/api/ai/illustrations?brand="+brand)
for e in cat["illustrations"][-3:]:
    print(f"   VS[{e.get('slot')}] idea={e.get('idea','')[:40]!r} -> concept={e.get('concept','')[:90]!r}")
