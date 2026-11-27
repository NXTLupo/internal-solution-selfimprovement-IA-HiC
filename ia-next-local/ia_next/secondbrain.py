"""The second brain (plan Part 2, owner decision 17 Nov: use HiC's engine through the host).

Every source IA Next builds from is archived in HiC's wiki through /api/wiki/write-article, where HiC chunks it, enters
it in the manifest and embeds it: one knowledge store for HiC and IA Next, reusable by later work. Builders then read
evidence back as manifest chunk pointers (`<wikiPath>#cN`), resolved to verbatim text by /api/wiki/read-article, instead
of the first few thousand characters of each source.

Why (17 Nov owner failure): a product vision deck asked to use three attached documents saw only the first 12,000
characters of each source, alongside an old test interview. With chunks, a named source is read whole when it fits the
budget, and the rest of the engagement is never mixed in (source_ids select the pages, as a manifest selection).

When HiC is not running, sources are cut into local chunks of the same size so coverage never falls back to truncation;
the evidence report says which path served each source.
"""
import hashlib
import json
import math
import re
import threading
import urllib.parse

from . import config, hic, providers, store

def budget_chars(seat="artifact", evidence_tokens=None, max_out=12000, reserve_tokens=4000, ctx=None):
    """Evidence characters one call may carry and still fit its model's fixed context (uplift plan WS-5 step 1): the
    context less the reply's room (capped as providers.context_for caps it), the head (system, instructions, schema:
    reserve_tokens) and a margin, at the model's measured characters per token with a tenth spare. `evidence_tokens`
    asks for less than fits. Before 23 Nov this was a flat 60,000 characters, counted at three per token, which sent
    a full builder call over the 32k floor and reloaded the model."""
    model = config.SEATS[seat]["primary"]
    ctx = ctx or config.CTX_FLOOR.get(model, 32768)
    cpt = config.CHARS_PER_TOKEN.get(model, 3.0) * 0.9
    tokens = ctx - min(int(max_out), 12000) - 512 - int(reserve_tokens)
    if evidence_tokens:
        tokens = min(tokens, int(evidence_tokens))
    return max(12_000, int(tokens * cpt))


BUDGET_CHARS = budget_chars("artifact")   # evidence handed to one builder call: Qwen at 32,768 holds about 59,800
LOCAL_CHUNK_CHARS = 1_500
MAP_REL = "results/second_brain.json"
_LOCK = threading.Lock()


def _sha(text):
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _map(eid):
    try:
        with open(store.safe_path(eid, MAP_REL), encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, ValueError):
        return {}


def _save_map(eid, m):
    p = store.safe_path(eid, MAP_REL)
    import os
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(m, fh, indent=1, ensure_ascii=False)


def archive(eid, src):
    """Archive one source in HiC's wiki and return its wiki path (HiC's canonical page when it already held the same
    body). Re-archives only when the text changed. Raises hic.HicUnavailable when HiC is not running."""
    text = src.get("text") or ""
    if len(text) < 40:
        return ""
    digest = _sha(text)
    with _LOCK:
        known = _map(eid).get(src["id"])
    if known and known.get("sha256") == digest and known.get("wiki_path"):
        return known["wiki_path"]
    upload = not src.get("url")
    body = {"url": src.get("url") or f"ia-next://{eid}/{src['id']}/{digest[:16]}", "content": text,
            "title": src.get("title") or src["id"], "kind": "upload" if upload else "article", "engagement": eid,
            "method": "upload" if upload else "api", "source": "IA Next upload" if upload else (src.get("publisher") or "web")}
    # field test 23 Nov (E8): pages were archived with date "", author "" and no tier although the feed gave them
    from . import currency
    if currency.parse_date(src.get("date")):
        body["date"] = currency.parse_date(src["date"])
    if src.get("author"):
        body["author"] = str(src["author"])[:120]
    if src.get("tier"):
        body["tier"] = int(src["tier"])
    got = hic._call("POST", "/api/wiki/write-article", 180, json=body)
    path = got.get("canonicalPath") or got.get("wikiPath") or ""
    if not path:
        raise hic.HicUnavailable(f"HiC did not archive {src['id']}: {str(got.get('error') or 'no wiki path')[:200]}")
    with _LOCK:
        m = _map(eid)
        # uplift plan WS-3 step 5: a page HiC could not embed (its embedder down) is written and chunked but not
        # searchable; it waits in this map for embed_pending() to re-chunk it once the embedder answers again
        m[src["id"]] = {"wiki_path": path, "sha256": digest, "title": src.get("title") or "",
                        "embedded": bool(got.get("embedded", True))}
        _save_map(eid, m)
    return path


def archive_upload_later(eid, sid):
    """Archive a new upload in the background (the upload does not wait for it). A failure is left alone: the source
    is archived when work is next built from it, and that build's evidence report says which path served it."""
    def run():
        try:
            from . import transcripts
            src = next((u for u in transcripts.uploaded_sources(eid) if u["id"] == sid), None)
            if src:
                archive(eid, src)
                guide(eid, sid)                   # N1: every source gets its guide on add, with no button
        except Exception:
            pass
    threading.Thread(target=run, daemon=True, name=f"archive-{sid}").start()


_SPAN = re.compile(r'id:\s*"[^"\n]*#c(\d+)"\s*\n\s*char_span:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]')


def slice_chunks(path, content):
    """The page's manifest chunks, cut exactly as HiC's read-article cuts one (its _slice_chunk_from_article): each
    chunk's char_span in the frontmatter indexes the body after the frontmatter. [(pointer, text)] in order."""
    if not (content or "").startswith("---"):
        return []
    fm_end = content.find("\n---", 4)
    if fm_end < 0:
        return []
    front, body = content[:fm_end], content[fm_end + 4:].lstrip("\n")
    out = {}
    for m in _SPAN.finditer(front):
        i, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 0 <= a < b <= len(body):
            out[i] = (f"{path}#c{i}", body[a:b].strip())
    return [out[i] for i in sorted(out) if out[i][1]]


def _manifest_chunks(eid, src):
    """The source's chunks from the manifest, in document order: [{source_id, title, pointer, text}].

    17 Nov: this used to call /api/manifest/chunks-from-selection and then one read per chunk. Each selection call made
    HiC load its whole manifest on its event loop, and during the owner's HiC session those loads stalled HiC's proxy
    long enough for a worker to be killed. Now: one read of the page, the chunks cut by their manifest spans, and the
    chunks kept here, so an unchanged source is never read from HiC again."""
    path = archive(eid, src)
    if not path:
        return []
    digest = _sha(src.get("text") or "")
    with _LOCK:
        entry = _map(eid).get(src["id"]) or {}
    cached = entry.get("chunks") if entry.get("sha256") == digest and entry.get("wiki_path") == path else None
    if not cached:
        got = hic._call("GET", "/api/wiki/read-article/" + urllib.parse.quote(path, safe="/."), 30)
        cached = [{"pointer": p, "text": t} for p, t in slice_chunks(path, str(got.get("content") or ""))]
        if cached:
            with _LOCK:
                m = _map(eid)
                if (m.get(src["id"]) or {}).get("sha256") == digest:
                    m[src["id"]]["chunks"] = cached
                    _save_map(eid, m)
    return [{"source_id": src["id"], "title": src.get("title") or src["id"], "pointer": c["pointer"], "text": c["text"]}
            for c in cached]


def _local_chunks(src):
    """Paragraph-packed chunks of the whole text, so a long source is read in full even without HiC."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", src.get("text") or "") if p.strip()]
    out, cur = [], ""
    for p in paras:
        while len(p) > LOCAL_CHUNK_CHARS:              # one huge paragraph: split it on sentence ends
            cut = p.rfind(". ", 0, LOCAL_CHUNK_CHARS)
            cut = cut + 1 if cut > LOCAL_CHUNK_CHARS // 3 else LOCAL_CHUNK_CHARS
            if cur:
                out.append(cur)
                cur = ""
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        if cur and len(cur) + len(p) + 2 > LOCAL_CHUNK_CHARS:
            out.append(cur)
            cur = p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
    if cur:
        out.append(cur)
    return [{"source_id": src["id"], "title": src.get("title") or src["id"], "pointer": "", "text": t} for t in out if t]


_WORD = re.compile(r"[a-z][a-z0-9]{2,}")


def _rank(chunks, objective):
    """Chunks ordered by how much of the objective they speak to: term overlap weighted by rarity across the chunks."""
    terms = set(_WORD.findall((objective or "").lower()))
    if not terms:
        return list(chunks)
    docs = [set(_WORD.findall(c["text"].lower())) for c in chunks]
    n = len(docs)
    idf = {t: math.log(1 + n / (1 + sum(1 for d in docs if t in d))) for t in terms}
    scored = [(sum(idf[t] for t in terms if t in d), -i) for i, d in enumerate(docs)]
    order = sorted(range(n), key=lambda i: scored[i], reverse=True)
    return [chunks[i] for i in order]


def material(eid, sources, objective="", budget=BUDGET_CHARS, prefer=None):
    """Evidence for one builder call from the given sources (already scoped to what the person named). Returns
    (chunks in document order, report). Every chunk of every source is included when they fit the budget; otherwise
    the chunks that speak most to the objective, keeping document order. `prefer` holds the ids of the sources the
    person asked for: their chunks are kept before any other source's (18 Nov, material.py)."""
    chunks, via = [], {}
    for s in sources:
        got = None
        try:
            got = _manifest_chunks(eid, s)
        except hic.HicUnavailable as e:
            via.setdefault("_reason", str(e)[:200])
        if got:
            via[s["id"]] = "manifest"
        else:
            got = _local_chunks(s)
            via[s["id"]] = "local"
        chunks += got
    total = sum(len(c["text"]) for c in chunks)
    report = {"sources": len(sources), "chunks_available": len(chunks), "chars_available": total, "via": via}
    if total <= budget:
        report.update(chunks_used=len(chunks), full_coverage=True)
        return chunks, report
    keep, used = set(), 0
    ranked = _rank(chunks, objective)
    if prefer:
        ranked = [c for c in ranked if c["source_id"] in prefer] + [c for c in ranked if c["source_id"] not in prefer]
    for c in ranked:
        if used + len(c["text"]) <= budget:
            keep.add(id(c))
            used += len(c["text"])
    picked = [c for c in chunks if id(c) in keep]
    report.update(chunks_used=len(picked), full_coverage=False)
    return picked, report


def _hic_recall(query, engagement="", limit=20):
    """HiC's objective-ranked chunk pointers and page records (chunks-by-goal), or ([], {})."""
    got = hic._call("GET", "/api/manifest/chunks-by-goal", 60, params={"goal": query, "engagement": engagement or "", "limit": limit})
    return list(got.get("chunk_ids") or []), got.get("pages") or {}


def expand(query, call=None):
    """Up to two other phrasings of a broad question, from the fast model (uplift plan WS-3 step 4); [] for a narrow
    one (more than eight words or quoting a phrase) or when the model is unavailable."""
    q = (query or "").strip()
    if len(q.split()) > 8 or '"' in q:
        return []
    call = call or providers.claude
    schema = {"type": "object", "additionalProperties": False, "required": ["variants"],
              "properties": {"variants": {"type": "array", "maxItems": 2, "items": {"type": "string", "maxLength": 120}}}}
    try:
        text, _, _ = call(config.SEATS["fast"]["primary"], "You rephrase a research question two other ways, each naming "
                          "different words a source might use. Return only the variants.", [{"role": "user", "content": q}],
                          providers.Ledger(limit_usd=0.5, purpose="recall"), max_tokens=200, effort="low", json_schema=schema)
        out = [str(v).strip() for v in (providers.parse_json(text).get("variants") or []) if str(v).strip()]
        # a variant must use other words (23 Nov, live: the small model answered "AI detectors (alternative phrasing)")
        own = set(_WORD.findall(q.lower()))
        fresh = lambda v: (lambda w: bool(w) and len(w & own) / len(w | own) < 0.7 and "phrasing" not in v.lower())(set(_WORD.findall(v.lower())))
        return [v for v in out if fresh(v)][:2]
    except Exception:
        return []


def rerank(query, items, call=None):
    """The candidates ordered by how directly each answers the question, scored 0 to 3 by the fast model in one call
    (uplift plan WS-3 step 4: rerank after the manifest has seeded the candidates). The input order is kept when the
    model is unavailable or answers badly."""
    if len(items) < 3:
        return items
    call = call or providers.claude
    listing = "\n".join(f'<c n="{i}">{it["excerpt"][:500]}</c>' for i, it in enumerate(items))
    # the grammar fixes the count: asked in words, the small model returned 11 scores for 12 passages (23 Nov, live)
    schema = {"type": "object", "additionalProperties": False, "required": ["scores"],
              "properties": {"scores": {"type": "array", "minItems": len(items), "maxItems": len(items),
                                        "items": {"type": "integer", "minimum": 0, "maximum": 3}}}}
    try:
        text, _, _ = call(config.SEATS["fast"]["primary"], "Score how directly each passage answers the question: 3 answers it, "
                          "2 is about it, 1 mentions it, 0 is unrelated. One score per passage, in order.",
                          [{"role": "user", "content": f"Question: {query}\n\n{listing}"}],
                          providers.Ledger(limit_usd=0.5, purpose="recall"), max_tokens=300, effort="low", json_schema=schema)
        sc = [int(x) for x in providers.parse_json(text).get("scores") or []]
        if len(sc) != len(items):
            return items
        order = sorted(range(len(items)), key=lambda i: (-sc[i], i))
        return [dict(items[i], relevance=sc[i]) for i in order]
    except Exception:
        return items


def local_recall(query, engagement, k=5):
    """When HiC cannot search (its embedder down, or HiC stopped): the engagement's own sources, chunked here and
    ranked by term overlap. Each passage keeps its manifest pointer when this engagement has one for it."""
    if not engagement:
        return []
    chunks = []
    for s in all_sources(engagement):
        with _LOCK:
            entry = _map(engagement).get(s["id"]) or {}
        cached = entry.get("chunks") if entry.get("sha256") == _sha(s.get("text") or "") else None
        if cached:
            chunks += [{"source_id": s["id"], "title": s.get("title") or s["id"], "pointer": c["pointer"], "text": c["text"]} for c in cached]
        else:
            chunks += _local_chunks(s)
    top = _rank(chunks, query)[:k]
    return [{"pointer": c.get("pointer") or f"local:{c['source_id']}", "title": c.get("title") or c["source_id"],
             "excerpt": c["text"][:900], "via": "this engagement's sources (second-brain search unavailable)"} for c in top]


def recall(query, engagement="", k=5, call=None):
    """Passages from the whole second brain, manifest first (uplift plan WS-3 step 4): HiC's objective-ranked pointers
    for the question and, for a broad question, two rephrasings; the union read by pointer; then reranked by the fast
    model. When HiC cannot search, the engagement's own sources answer, and each passage says so."""
    q = (query or "").strip()
    if not q:
        return []
    # (26 Nov) The Library holds the old second brain and every source collected here, cut into passages and searched by
    # words and meaning on this machine in well under a second; HiC is asked only when the Library has nothing.
    try:
        from . import librarysearch
        lib = librarysearch.recall(q, k, call=call)
        if lib:
            return lib
    except Exception:
        pass
    try:
        ids, pages = _hic_recall(q, engagement, max(k * 4, 20))
        # each search costs HiC about 25 s (measured 23 Nov over 123,842 chunks), so other phrasings are searched only
        # when the question's own search came back thin
        for v in (expand(q, call) if ids and len(ids) < 2 * k else []):
            more, more_pages = _hic_recall(v, engagement, max(k * 2, 10))
            ids += [c for c in more if c not in ids]
            pages.update(more_pages)
    except hic.HicUnavailable:
        return local_recall(q, engagement, k)
    if not ids:
        from . import health
        if any(s["name"] == "embedder" and not s["ok"] for s in health.deep()["services"]):
            return local_recall(q, engagement, k)
        return []
    items = []
    for cid in ids[: max(k * 3, 12)]:
        try:
            r = hic._call("GET", f"/api/wiki/read-article/{urllib.parse.quote(cid, safe='/.')}", 30)
        except hic.HicUnavailable:
            continue
        text = str(r.get("chunk") or "").strip()
        if text:
            page = pages.get(cid.split("#")[0]) or {}
            items.append({"pointer": cid, "title": page.get("title") or cid.split("#")[0], "excerpt": text[:900]})
    return rerank(q, items, call)[:k]


def pending_embeds():
    """[(engagement id, source id, wiki path)] for every page archived while HiC could not embed it."""
    out = []
    for e in store.list_engagements(include_hidden=True):
        for sid, entry in _map(e["id"]).items():
            if entry.get("wiki_path") and entry.get("embedded") is False:
                out.append((e["id"], sid, entry["wiki_path"]))
    return out


def embed_pending(limit=20):
    """Each page archived while the embedder was down gets one targeted re-chunk (HiC's chunks-backfill limited to
    that page) once the embedder answers again. Nothing is sent while it is still down. Called by the scheduler."""
    todo = pending_embeds()
    if not todo:
        return {"pending": 0, "embedded": 0}
    from . import hicmigrate                      # background work: never alongside the person's own (26 Nov)
    if hicmigrate.foreground_busy():
        return {"pending": len(todo), "embedded": 0, "why": "your work is running"}
    from . import health
    if any(s["name"] == "embedder" and not s["ok"] for s in health.deep(force=True)["services"]):
        return {"pending": len(todo), "embedded": 0, "why": "the embedder is still down"}
    done, failed = 0, []
    for eid, sid, path in todo[:limit]:
        try:
            got = hic._call("POST", "/api/wiki/chunks-backfill", 300, params={"path_contains": path, "force": 1})
        except hic.HicUnavailable as e:
            failed.append(f"{path}: {str(e)[:120]}")
            break
        if int(got.get("embedded") or 0) >= 1:
            with _LOCK:
                m = _map(eid)
                if sid in m:
                    m[sid]["embedded"] = True
                    _save_map(eid, m)
            done += 1
        else:
            failed.append(f"{path}: {str(got.get('error') or got.get('sample_failures') or 'not embedded')[:120]}")
    store.event("embed_retry", {"pending": len(todo), "embedded": done, "failed": failed[:5]})
    return {"pending": len(todo), "embedded": done, "failed": failed}


def coverage(eid):
    """How much of the engagement the second brain holds (uplift plan WS-3 step 3): sources, archived in HiC's wiki,
    manifest chunks kept here, and pages waiting for the embedder (archived but not yet searchable)."""
    m = _map(eid)
    srcs = all_sources(eid)
    archived = [m[s["id"]] for s in srcs if (m.get(s["id"]) or {}).get("wiki_path")]
    return {"sources": len(srcs), "archived": len(archived),
            "chunks": sum(len(e.get("chunks") or []) for e in archived),
            "waiting_for_embedder": sum(1 for e in archived if e.get("embedded") is False)}


def as_prompt(chunks, esc=lambda s: s):
    """Sources for a builder prompt: each source with its chunks, the manifest pointer on each chunk."""
    by, order = {}, []
    for c in chunks:
        if c["source_id"] not in by:
            by[c["source_id"]] = []
            order.append(c["source_id"])
        by[c["source_id"]].append(c)
    parts = []
    for sid in order:
        title = esc(by[sid][0]["title"])
        lines = []
        for c in by[sid]:
            attr = ' pointer="' + c["pointer"] + '"' if c["pointer"] else ""
            lines.append("<chunk" + attr + ">\n" + c["text"] + "\n</chunk>")
        parts.append('<source id="' + sid + '" title="' + title + '">\n' + "\n".join(lines) + "\n</source>")
    return "\n\n".join(parts)


REUSE_TYPES = "article,transcript,documentation"   # external evidence only (manifest types): never uploads, synthesis, insights
REUSE_MAX_PAGES = 4
_PROVIDERS = {"gemini", "google gemini", "gemini deep research", "openai", "chatgpt", "gpt", "claude", "anthropic",
              "deepseek", "perplexity", "grok", "xai", "copilot"}
REUSE_MIN_SCORE = 0.45                                  # HiC's objective similarity for the page's best chunk
_FRONT = re.compile(r'^(title|source|url|date|published|author|kind):\s*"?(.*?)"?\s*$', re.M)


def _front(content):
    """The page's own attribution from its frontmatter: {title, source, url, date, author, kind} and the body."""
    if not (content or "").startswith("---"):
        return {}, content or ""
    end = content.find("\n---", 4)
    if end < 0:
        return {}, content
    meta = {}
    for k, v in _FRONT.findall(content[:end]):
        meta.setdefault(k, v.replace('\\"', '"').strip())
    return meta, content[end + 4:].lstrip("\n")


def reuse(eid, goal, known_urls=(), max_pages=REUSE_MAX_PAGES, min_score=REUSE_MIN_SCORE, window=None):
    """Phase 2 of the Unified Vision (collect from the cached second brain, not only fresh searches): pages HiC's wiki
    already holds that answer this goal, ranked by HiC's objective-first admission (/api/manifest/chunks-by-goal, which
    collapses duplicate copies and refuses other engagements' uploads). Only external evidence types are asked for, so
    model-written synthesis never returns as evidence. Returns [{"title", "url", "text", "publisher", "date", "wiki_path",
    "chunks": [(pointer, text)], "score", "why"}], best first; [] when HiC is down or nothing clears the bar."""
    q = (goal or "").strip()
    if not q:
        return []
    try:                                         # (26 Nov) the Library first: the old second brain lives here now
        from . import librarysearch
        local = librarysearch.reuse_pages(q, known_urls=known_urls, max_pages=max_pages, window=window)
        if local:
            for pg in local:
                store.event("second_brain_reused", {"url": pg["url"], "score": pg["score"], "via": "library"}, eid or None)
            return local
    except Exception:
        pass
    try:
        got = hic._call("GET", "/api/manifest/chunks-by-goal", 60,
                        params={"goal": q[:500], "engagement": eid or "", "limit": 60, "types": REUSE_TYPES})
    except Exception as e:                      # reuse is a bonus: collection carries on without it
        store.event("second_brain_reuse_skipped", {"error": str(e)[:200]}, eid or None)
        return []
    scores = got.get("scores") or {}
    best = {}
    for cid in got.get("chunk_ids") or []:
        path = cid.split("#")[0]
        s = float(scores.get(cid) or 0)
        if s > best.get(path, -1):
            best[path] = s
    pages = got.get("pages") or {}
    out, seen_urls = [], {u for u in known_urls if u}
    for path, s in sorted(best.items(), key=lambda kv: -kv[1]):
        if len(out) >= max_pages or s < min_score:
            break
        if path.startswith(("uploads/", "synthesis/", "engagements/", "deep-research/")):
            continue
        try:
            r = hic._call("GET", "/api/wiki/read-article/" + urllib.parse.quote(path, safe="/."), 30)
        except Exception:
            break
        content = str(r.get("content") or "")
        meta, body = _front(content)
        url = meta.get("url") or ""
        if not url.startswith("http") or url in seen_urls or len(body) < 400:
            continue
        # a page labeled with a model provider, or still at a grounding redirect, has no attributable publisher
        if re.sub(r"\s*\(.*?\)\s*", " ", meta.get("source") or "").strip().lower() in _PROVIDERS or "vertexaisearch" in url:
            continue
        # currency contract (23 Nov): a page is reused only when its date sits in the run's window; a page with no
        # date cannot be shown to be current, so it is not reused into a dated run
        from . import currency
        when = currency.parse_date(meta.get("date") or meta.get("published"))
        if (window or {}).get("since") and not currency.inside(when, window):
            continue
        chunks = slice_chunks(path, content)
        if not chunks:
            continue
        seen_urls.add(url)
        title = meta.get("title") or (pages.get(path) or {}).get("title") or path
        out.append({"title": title, "url": url, "text": body, "publisher": meta.get("source") or "",
                    "date": when, "wiki_path": path, "chunks": chunks,
                    "score": round(s, 3), "why": f"already in the second brain; its best passage matches the goal at {s:.2f}"})
    return out


def adopt(eid, src, wiki_path, chunks):
    """Record a source whose page is already in HiC's wiki (a reused page, or one HiC archived while collecting it),
    so material() reads its manifest chunks without archiving it again."""
    with _LOCK:
        m = _map(eid)
        m[src["id"]] = {"wiki_path": wiki_path, "sha256": _sha(src.get("text") or ""), "title": src.get("title") or "",
                        "chunks": [{"pointer": p, "text": t} for p, t in chunks] if chunks else None}
        if not m[src["id"]]["chunks"]:
            m[src["id"]].pop("chunks")
        _save_map(eid, m)


def archive_all(eid, sources, workers=3):
    """Archive every collected source now (Unified Vision phase 2: knowledge compounds across runs), a few at a time so
    HiC's proxy is never flooded. Returns {source_id: wiki_path or ""}; a source HiC cannot take is left for the next
    build, whose evidence report says which path served it."""
    from concurrent.futures import ThreadPoolExecutor
    def one(s):
        try:
            return s["id"], archive(eid, s)
        except Exception as e:                  # left for the next build, whose evidence report names the path used
            store.event("second_brain_archive_skipped", {"source": s.get("id"), "error": str(e)[:200]}, eid)
            return s["id"], ""
    with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
        return dict(ex.map(one, sources))


def known(eid, src):
    """True when this exact text of the source is already in HiC's wiki (archived or adopted)."""
    with _LOCK:
        entry = _map(eid).get(src.get("id")) or {}
    return bool(entry.get("wiki_path")) and entry.get("sha256") == _sha(src.get("text") or "")


# ---- the Sources panel: every source with its guide, and the passage behind a citation (plan Part 6 N1, C1, C2) ----
GUIDES_REL = "results/source_guides.json"


def _read_json(eid, rel, default):
    try:
        with open(store.safe_path(eid, rel), encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, ValueError, PermissionError):
        return default


def _write_json(eid, rel, data):
    import os
    p = store.safe_path(eid, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False)
    os.replace(tmp, p)


def all_sources(eid):
    """Every source the engagement holds, uploads first, as stored: [{id, title, url, text, ...}]."""
    from . import transcripts
    out, seen = [], set()
    for s in transcripts.uploaded_sources(eid):
        if s.get("id") and s["id"] not in seen:
            seen.add(s["id"])
            out.append(dict(s, origin="upload"))
    for s in _read_json(eid, "results/sources.json", {}).get("sources") or []:
        if s.get("id") and s["id"] not in seen:
            seen.add(s["id"])
            origin = ("reused" if s.get("reused") else "named" if s.get("requested") else "pack" if s.get("pack")
                      else "library" if s.get("library") else "upload" if not s.get("url") else "web")
            out.append(dict(s, origin=origin))
    return out


def guide(eid, sid, force=False):
    """The source guide (summary, key topics, suggested questions) for one source, made by HiC from its wiki page and
    kept here: {"status": "ready"|"failed", ...}. The source is archived first when it is not yet in the wiki."""
    src = next((s for s in all_sources(eid) if s["id"] == sid), None)
    if not src:
        raise ValueError(f"no source {sid} in this engagement")
    with _LOCK:
        guides = _read_json(eid, GUIDES_REL, {})
        guides[sid] = {"status": "reading"}
        _write_json(eid, GUIDES_REL, guides)
    try:
        path = archive(eid, src)
        if not path:
            raise hic.HicUnavailable("this source is too short to guide")
        got = hic._call("POST", "/api/sources/guide", 120, json={"wikiPath": path, "force": bool(force)})
        if not got.get("ok"):
            raise hic.HicUnavailable(str(got.get("error") or "no guide")[:200])
        entry = {"status": "ready", "summary": got.get("summary", ""), "key_topics": got.get("keyTopics") or [],
                 "questions": got.get("suggestedQuestions") or [], "wiki_path": path}
    except Exception as e:
        entry = {"status": "failed", "error": str(e)[:200]}
    with _LOCK:
        guides = _read_json(eid, GUIDES_REL, {})
        guides[sid] = entry
        _write_json(eid, GUIDES_REL, guides)
    return entry


def guide_later(eid, sid):
    threading.Thread(target=lambda: guide(eid, sid), daemon=True, name=f"guide-{sid}").start()


def _readable_title(s):
    """A page stored under its bare domain ("huntnewsnu.com") gets a title from its address, so seven rows from one
    publication can be told apart: "huntnewsnu.com: Students weigh AI tools in class"."""
    title, url = str(s.get("title") or "").strip(), str(s.get("url") or "")
    host = urllib.parse.urlparse(url).netloc.lower().removeprefix("www.") if url else ""
    if not host or title.lower().removeprefix("www.") not in (host, "", str(s.get("publisher") or "").lower()):
        return title or s.get("id", "")
    slug = [p for p in urllib.parse.urlparse(url).path.split("/") if p and not p.isdigit()]
    words = urllib.parse.unquote(slug[-1]).rsplit(".", 1)[0].replace("-", " ").replace("_", " ").strip() if slug else ""
    return f"{host}: {words[:1].upper() + words[1:]}" if len(words) > 3 else (title or host)


def _social_row(eid):
    """The engagement's Reddit listening as one row: its posts are quoted by every deck and report here, but they are
    a collection, not single sources to switch on and off."""
    got = _read_json(eid, "results/social_sources.json", {}) or {}
    posts = got.get("sources") or []
    if not posts:
        return None
    subs = ", ".join(f"r/{x}" for x in got.get("subreddits") or []) or "Reddit"
    window = " to ".join(x for x in (got.get("start"), got.get("end")) if x)
    engine = got.get("engine") or ""
    page = ""
    if engine == "social-research":
        page = (_read_json(eid, "results/social.json", {}).get("engine") or {}).get("page") or ""
    summary = ("Themes and sentiment from Social Research." if engine == "social-research"
               else "Themes from IA Next's analyst.") + " Decks and reports here quote these posts."
    return {"id": "REDDIT", "title": f"Reddit listening: {subs}", "url": page, "origin": "reddit", "publisher": subs,
            "date": window, "chars": 0, "in_second_brain": False, "group": True, "count": len(posts),
            "guide": {"status": "group", "summary": summary}}


def overview(eid):
    """The Sources panel: [{id, title, url, origin, publisher, date, chars, in_second_brain, guide, same_as}] in source
    order, then the engagement's Reddit listening as one grouped row."""
    guides = _read_json(eid, GUIDES_REL, {})
    m = _map(eid)
    out, by_url = [], {}
    for s in all_sources(eid):
        entry = m.get(s["id"]) or {}
        url = (s.get("url") or "").split("#")[0].rstrip("/")
        same = by_url.get(url) if url else None
        if url and not same:
            by_url[url] = s["id"]
        out.append({"id": s["id"], "title": _readable_title(s), "url": s.get("url") or "", "origin": s["origin"],
                    "publisher": s.get("publisher") or "", "date": s.get("date") or "", "chars": len(s.get("text") or ""),
                    "in_second_brain": bool(entry.get("wiki_path")), "guide": guides.get(s["id"]) or {"status": "none"},
                    "same_as": same or ""})
    row = _social_row(eid)
    return out + ([row] if row else [])


def passage(eid, pointer="", source_id=""):
    """The passage behind a citation. With a pointer: that chunk's verbatim text, from the chunks kept here or from
    HiC. With only a source id: the source's details and the verified quotes taken from it, each with its pointer."""
    srcs = {s["id"]: s for s in all_sources(eid)}
    if pointer:
        m = _map(eid)
        for sid, entry in m.items():
            for c in entry.get("chunks") or []:
                if c.get("pointer") == pointer:
                    s = srcs.get(sid) or {}
                    return {"pointer": pointer, "text": c["text"], "source_id": sid, "title": s.get("title") or entry.get("title") or "",
                            "url": s.get("url") or "", "publisher": s.get("publisher") or "", "date": s.get("date") or ""}
        page = pointer.split("#")[0]
        sid = next((k for k, v in m.items() if v.get("wiki_path") == page), "")
        if pointer.startswith("lib/"):           # a passage of the Library (recall cites these): read it here
            from . import librarysearch
            got = librarysearch.passage(pointer)
            if got:
                s = srcs.get(sid) or {}
                return dict(got, source_id=sid, title=s.get("title") or got["title"])
        if not sid:
            raise ValueError("that passage does not belong to this engagement's sources")
        got = hic._call("GET", "/api/wiki/read-article/" + urllib.parse.quote(pointer, safe="/."), 30)
        s = srcs.get(sid) or {}
        return {"pointer": pointer, "text": str(got.get("chunk") or ""), "source_id": sid, "title": s.get("title") or "",
                "url": s.get("url") or "", "publisher": s.get("publisher") or "", "date": s.get("date") or ""}
    s = srcs.get(source_id)
    if not s:
        raise ValueError(f"no source {source_id} in this engagement")
    quotes = [{"quote": f.get("quote", ""), "claim": f.get("claim", ""), "pointer": f.get("pointer", "")}
              for f in _read_json(eid, "results/findings.json", {}).get("findings") or [] if f.get("source_id") == source_id]
    return {"source_id": source_id, "title": s.get("title") or source_id, "url": s.get("url") or "",
            "publisher": s.get("publisher") or "", "date": s.get("date") or "", "quotes": quotes,
            "excerpt": (s.get("text") or "")[:1200]}
