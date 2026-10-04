import json, os, collections, sys
p = "hic-workspace/wiki/.manifest.json"
print("size bytes", os.path.getsize(p))
m = json.load(open(p, encoding="utf-8"))
print("top-level type", type(m).__name__)
if isinstance(m, dict):
    print("top-level keys", list(m.keys())[:30])
    for k,v in m.items():
        if isinstance(v,(list,dict)):
            print(" ", k, type(v).__name__, len(v))
        else:
            print(" ", k, repr(v)[:120])
# find pages
pages = None
for key in ("pages","sources","entries","items"):
    if isinstance(m,dict) and key in m:
        pages = m[key]; print("pages key =", key); break
if pages is None and isinstance(m, dict):
    # maybe keyed by path
    pages = m
if isinstance(pages, dict):
    items = list(pages.values()); keys=list(pages.keys())
else:
    items = pages; keys=[None]*len(items)
print("n pages", len(items))
# fields
pf = collections.Counter()
cf = collections.Counter()
nchunks=0
conc=rel=src=lineage=obj=stale=0
kinds=collections.Counter()
nodate=0
urls=collections.defaultdict(list)
sample=None
for k,pg in zip(keys,items):
    if not isinstance(pg,dict): continue
    for f in pg: pf[f]+=1
    kinds[str(pg.get("source_kind") or pg.get("kind") or pg.get("type") or pg.get("sourceType") or pg.get("source_type"))]+=1
    if not (pg.get("date") or pg.get("published") or pg.get("published_at") or pg.get("publishedAt") or pg.get("ingested_at") or pg.get("updated")):
        nodate+=1
    u = pg.get("url") or pg.get("source_url") or pg.get("canonical_url")
    if u: urls[u.strip().rstrip('/').lower()].append(k or pg.get("path"))
    chs = pg.get("chunks") or []
    for c in chs:
        nchunks+=1
        if not isinstance(c,dict): continue
        for f in c: cf[f]+=1
        if c.get("concepts"): conc+=1
        if c.get("related_chunks"): rel+=1
        if c.get("sources"): src+=1
        if c.get("source_lineage"): lineage+=1
        if c.get("objective_alignment"): obj+=1
        if c.get("staleness_hash"): stale+=1
        if sample is None: sample=c
print("page fields", pf.most_common(60))
print("chunk fields", cf.most_common(60))
print("n chunks", nchunks, "concepts", conc, "related_chunks", rel, "sources", src, "source_lineage", lineage, "objective_alignment", obj, "staleness_hash", stale)
print("kinds", kinds.most_common(30))
print("pages without date", nodate)
dups = {u:v for u,v in urls.items() if len(v)>1}
print("urls total", len(urls), "duplicate urls", len(dups), "extra copies", sum(len(v)-1 for v in dups.values()))
for u,v in list(dups.items())[:8]: print("  DUP", u[:90], v)
# cross-directory dupes
xd = {u:v for u,v in dups.items() if len({str(x).split('/')[0] for x in v if x})>1}
print("cross-dir dup urls", len(xd))
for u,v in list(xd.items())[:8]: print("  XDUP", u[:90], v)
print("sample chunk", json.dumps(sample, default=str)[:1500] if sample else None)
# page-level fields for concepts
pconc=sum(1 for pg in items if isinstance(pg,dict) and pg.get("concepts"))
prel=sum(1 for pg in items if isinstance(pg,dict) and pg.get("related_chunks"))
psrc=sum(1 for pg in items if isinstance(pg,dict) and pg.get("sources"))
print("page-level concepts", pconc, "related_chunks", prel, "sources", psrc)
# dir distribution
dirs=collections.Counter((k or pg.get("path") or "").split("/")[0] for k,pg in zip(keys,items) if isinstance(pg,dict))
print("dirs", dirs.most_common(20))
