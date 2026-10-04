import os, re, collections, time
base="hic-workspace/wiki"
t0=time.time()
stats=collections.Counter(); perdir=collections.defaultdict(collections.Counter)
nfiles=0; chunk_blocks=0; chunks_total=0; c_conc=c_rel=c_src=0; pages_with_conc=pages_with_rel=pages_with_src=0
no_fm=0; no_chunks_fm=0; resolved_sources=0; related_cross=0
for root,dirs,files in os.walk(base):
    if "/.git" in root.replace("\\","/"): continue
    for fn in files:
        if not fn.endswith(".md"): continue
        p=os.path.join(root,fn); rel=os.path.relpath(p,base).replace("\\","/"); d=rel.split("/")[0]
        nfiles+=1
        try:
            with open(p,"r",encoding="utf-8",errors="replace") as f: head=f.read(60000)
        except Exception: continue
        if not head.startswith("---"): no_fm+=1; perdir[d]["no_fm"]+=1; continue
        end=head.find("\n---",3)
        fm=head[:end] if end!=-1 else head[:8000]
        if "\nchunks:" not in fm: no_chunks_fm+=1; perdir[d]["no_chunks_fm"]+=1; continue
        chunk_blocks+=1; perdir[d]["chunked"]+=1
        ids=len(re.findall(r'^\s+- id: ',fm,re.M)); chunks_total+=ids
        nc=len(re.findall(r'^\s+concepts: \[(?!\])',fm,re.M)); nr=len(re.findall(r'^\s+related_chunks: \[(?!\])',fm,re.M)); ns=len(re.findall(r'^\s+sources: \[(?!\])',fm,re.M))
        c_conc+=nc; c_rel+=nr; c_src+=ns
        if nc: pages_with_conc+=1; perdir[d]["pages_conc"]+=1
        if nr: pages_with_rel+=1; perdir[d]["pages_rel"]+=1
        if ns: pages_with_src+=1; perdir[d]["pages_src"]+=1
        if "resolved_sources:" in fm: resolved_sources+=1
        # cross-doc related edges: related_chunks pointing to another page
        for m in re.finditer(r'related_chunks: \[([^\]]*)\]',fm):
            for ref in re.findall(r'"([^"]+)"',m.group(1)):
                if not ref.startswith(rel+"#"): related_cross+=1
print("elapsed",round(time.time()-t0,1),"files",nfiles,"no_frontmatter",no_fm,"fm_but_no_chunks",no_chunks_fm,"pages_with_chunks_block",chunk_blocks)
print("chunks_total(frontmatter ids)",chunks_total,"chunks_with_concepts",c_conc,"chunks_with_related",c_rel,"chunks_with_sources",c_src)
print("pages_with_concepts",pages_with_conc,"pages_with_related",pages_with_rel,"pages_with_sources",pages_with_src,"pages_with_resolved_sources",resolved_sources,"cross-doc related edges",related_cross)
for d,c in sorted(perdir.items(), key=lambda kv:-sum(kv[1].values()))[:14]: print(" ",d,dict(c))
