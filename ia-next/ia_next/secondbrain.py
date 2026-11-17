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

from . import hic, store

BUDGET_CHARS = 60_000         # evidence handed to one builder call (about 15,000 tokens)
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
    got = hic._call("POST", "/api/wiki/write-article", 180, json=body)
    path = got.get("canonicalPath") or got.get("wikiPath") or ""
    if not path:
        raise hic.HicUnavailable(f"HiC did not archive {src['id']}: {str(got.get('error') or 'no wiki path')[:200]}")
    with _LOCK:
        m = _map(eid)
        m[src["id"]] = {"wiki_path": path, "sha256": digest, "title": src.get("title") or ""}
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


def material(eid, sources, objective="", budget=BUDGET_CHARS):
    """Evidence for one builder call from the given sources (already scoped to what the person named). Returns
    (chunks in document order, report). Every chunk of every source is included when they fit the budget; otherwise
    the chunks that speak most to the objective, keeping document order."""
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
    for c in _rank(chunks, objective):
        if used + len(c["text"]) <= budget:
            keep.add(id(c))
            used += len(c["text"])
    picked = [c for c in chunks if id(c) in keep]
    report.update(chunks_used=len(picked), full_coverage=False)
    return picked, report


def recall(query, engagement="", k=5):
    """Passages from the whole second brain (every pack, upload and engagement HiC holds) ranked against the question
    by HiC (/api/manifest/chunks-by-goal: objective first, the engagement's own chunks boosted), resolved to verbatim
    text with their pointers. Empty when HiC is down: recall then uses memory and the local evidence index only."""
    q = (query or "").strip()
    if not q:
        return []
    try:
        got = hic._call("GET", "/api/manifest/chunks-by-goal", 60,
                        params={"goal": q, "engagement": engagement or "", "limit": max(k * 4, 20)})
        pages = got.get("pages") or {}
        out = []
        for cid in got.get("chunk_ids") or []:
            if len(out) >= k:
                break
            ref = urllib.parse.quote(cid, safe="/.")
            r = hic._call("GET", f"/api/wiki/read-article/{ref}", 30)
            text = str(r.get("chunk") or "").strip()
            if text:
                page = pages.get(cid.split("#")[0]) or {}
                out.append({"pointer": cid, "title": page.get("title") or cid.split("#")[0], "excerpt": text[:900]})
        return out
    except hic.HicUnavailable:
        return []


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
