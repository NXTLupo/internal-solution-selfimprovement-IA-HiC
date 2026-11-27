"""The Library's passage index: every source on this machine, cut into passages, searched by words and by meaning.

Owner, 26 Nov 2026: the old research system's second brain (its wiki, manifest and chunk store) is migrated into the IA
Next Library, "chunked, tagged, manifest indexed, recallable by the AI chat, usable as source material for deliverables
and artifacts, browsable, cited, and linked back to source articles". This module is that index, for the migrated pages
and for every source IA Next collects itself, so recall, research reuse and the Library read one store.

Written from the audit of the old store, which: embedded only the first 384 tokens of 60% of its chunks, without the
page's title, publisher or date; searched 4,096 nearest vectors of 124,649 and filtered afterwards, so duplicates and
model-written pages filled the window; and had no deduplication that ever fired for articles. Here:
- each passage (chunking.py) is embedded with its page's title, publisher and date in front, within the model's window;
- words (FTS5 BM25) and meaning (cosine over every vector, numpy) are searched in full and fused by reciprocal rank;
- filters (kind, period) apply before ranking is cut, and no page fills more than `per_page` places;
- model-written pages and reference notes are browsable but never returned as evidence unless asked for.

Tables: library_meta (one row per migrated page, by evidence id), library_chunks (+ library_chunks_fts), library_restore.
Pointers are "lib/<page path>#c<n>": a migrated page keeps its old wiki path; a page collected here uses its evidence id.
"""
import array
import contextvars
import json
import re
import threading
import time

from . import config, store

EMBED_MODEL = "qwen3-embedding:0.6b"
EMBED_CHARS = 2000                     # about 500 tokens with the header: inside the model's window
EVIDENCE_KINDS = ("article", "reddit", "document", "transcript", "video", "collected")
KIND_LABEL = {"article": "Article", "reddit": "Reddit post", "document": "Client document", "transcript": "Transcript",
              "video": "Video", "analysis": "HiC analysis", "reference": "Reference", "collected": "Collected here"}
_MARK = re.compile(r"\[(?:(\d+):)?(\d{1,2}):(\d{2})\]")


def kind_of(kind, url=""):
    """A source's kind: its Library label, else Video for a YouTube address (26 Nov), else Collected here."""
    if kind:
        return kind
    from . import videotranscript
    return "video" if videotranscript.youtube_id(url) else "collected"


def moment_link(url, text):
    """For a YouTube passage, the address that opens the video at the first time mark the passage carries; else ""."""
    from . import videotranscript
    vid = videotranscript.youtube_id(url)
    m = _MARK.search(str(text or "")) if vid else None
    if not m:
        return ""
    secs = int(m.group(1) or 0) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    return f"https://www.youtube.com/watch?v={vid}&t={secs}s"
RRF_K = 60
_READY = None
_MAT = {"key": None, "ids": None, "m": None}
_MAT_LOCK = threading.Lock()


def ensure_schema():
    global _READY
    c = store.conn()
    if _READY is c:
        return c
    with store._LOCK:
        c.executescript("""
CREATE TABLE IF NOT EXISTS evidence_extra (id TEXT PRIMARY KEY, date TEXT DEFAULT '', vec BLOB, checked REAL);
CREATE TABLE IF NOT EXISTS library_meta (
  evidence_id TEXT PRIMARY KEY, wiki_path TEXT UNIQUE, kind TEXT, collection TEXT, title TEXT, url TEXT, document_url TEXT,
  publisher TEXT, date TEXT, retrieved TEXT, projects TEXT, copies TEXT, tags TEXT, subreddit TEXT, words INTEGER,
  sha TEXT, flags TEXT, restored TEXT, sensitive INTEGER DEFAULT 0, is_evidence INTEGER DEFAULT 1, updated REAL);
CREATE INDEX IF NOT EXISTS library_meta_kind ON library_meta(kind);
CREATE TABLE IF NOT EXISTS library_chunks (
  id INTEGER PRIMARY KEY, evidence_id TEXT, n INTEGER, section TEXT, title TEXT, text TEXT, vec BLOB);
CREATE INDEX IF NOT EXISTS library_chunks_ev ON library_chunks(evidence_id);
CREATE VIRTUAL TABLE IF NOT EXISTS library_chunks_fts USING fts5(text, title, content='library_chunks', content_rowid='id');
CREATE TRIGGER IF NOT EXISTS library_chunks_ai AFTER INSERT ON library_chunks BEGIN
  INSERT INTO library_chunks_fts(rowid, text, title) VALUES (new.id, new.text, new.title); END;
CREATE TRIGGER IF NOT EXISTS library_chunks_ad AFTER DELETE ON library_chunks BEGIN
  INSERT INTO library_chunks_fts(library_chunks_fts, rowid, text, title) VALUES ('delete', old.id, old.text, old.title); END;
CREATE TABLE IF NOT EXISTS library_restore (
  url TEXT PRIMARY KEY, status TEXT, via TEXT, document_url TEXT, chars INTEGER, reason TEXT, at REAL);
CREATE TRIGGER IF NOT EXISTS evidence_au AFTER UPDATE OF text, title ON evidence BEGIN
  INSERT INTO evidence_fts(evidence_fts, rowid, text, title) VALUES ('delete', old.rowid, old.text, old.title);
  INSERT INTO evidence_fts(rowid, text, title) VALUES (new.rowid, new.text, new.title); END;
CREATE TRIGGER IF NOT EXISTS evidence_ad AFTER DELETE ON evidence BEGIN
  INSERT INTO evidence_fts(evidence_fts, rowid, text, title) VALUES ('delete', old.rowid, old.text, old.title); END;
""")
    _READY = c
    return c


# ---- embedding -------------------------------------------------------------------------------------------------------
_BACKGROUND = contextvars.ContextVar("ia_next_background_embedding", default=False)


def embed(texts, query=False, background=None):
    """Vectors from the local embedding model, in order. A query gets the model's retrieval instruction. Background
    embedding (the Library's own indexing) pauses before each batch while a language-model call waits or runs, so the
    model server can release the embedding model for it (26 Nov; providers.make_room_for)."""
    import httpx
    from . import lanes, localrank
    items = [(localrank.INSTRUCT + t if query else t)[:EMBED_CHARS + 200] for t in texts]
    out = []
    background = _BACKGROUND.get() if background is None else background
    for i in range(0, len(items), 128):          # 128 a request: fewer round trips (the card sat at 46% at 64)
        if background:
            t0 = time.time()
            while lanes.model_call_active() and time.time() - t0 < 3600:
                time.sleep(1.0)
        with lanes.card("embed"):
            r = httpx.post(config.OLLAMA_URL + "/api/embed", json={"model": EMBED_MODEL, "input": items[i:i + 128],
                                                                    "keep_alive": localrank.EMBED_KEEP, "options": localrank.EMBED_OPTIONS},
                           timeout=300)
        r.raise_for_status()
        out += r.json()["embeddings"]
    return out


def passage_header(title, publisher="", date=""):
    return " | ".join(x for x in (str(title or "").strip(), str(publisher or "").strip(), str(date or "").strip()) if x)


def _f16(vec):
    import numpy as np
    return np.asarray(vec, dtype=np.float16).tobytes()


def embed_pending(limit=640, embed_fn=None):
    """Vectors for passages that have none, `limit` at a time. Returns how many were embedded."""
    c = ensure_schema()
    rows = c.execute("SELECT c.id, c.title, c.section, c.text, m.publisher, m.date FROM library_chunks c "
                     "LEFT JOIN library_meta m ON m.evidence_id = c.evidence_id WHERE c.vec IS NULL ORDER BY c.id LIMIT ?",
                     (int(limit),)).fetchall()
    if not rows:
        return 0
    texts = [passage_header(r["title"], r["publisher"], r["date"]) + "\n" + (f"{r['section']}\n" if r["section"] and r["section"] not in (r["text"] or "")[:200] else "")
             + (r["text"] or "")[:EMBED_CHARS] for r in rows]
    tok = _BACKGROUND.set(True)                  # the Library's own indexing yields to model calls (embed)
    try:
        vecs = (embed_fn or embed)(texts)
    finally:
        _BACKGROUND.reset(tok)
    with store._LOCK:
        c.execute("BEGIN")
        try:
            for r, v in zip(rows, vecs):
                c.execute("UPDATE library_chunks SET vec = ? WHERE id = ?", (_f16(v), r["id"]))
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
    return len(rows)


# ---- indexing a page ------------------------------------------------------------------------------------------------
def index_page(evidence_id, title, text, embed_now=False):
    """(Re)cut one stored page into passages; their vectors follow on the next embed pass. Returns the passage count."""
    from . import chunking
    c = ensure_schema()
    parts = chunking.chunk(text)
    with store._LOCK:
        c.execute("BEGIN")
        try:
            c.execute("DELETE FROM library_chunks WHERE evidence_id = ?", (evidence_id,))
            for n, p in enumerate(parts):
                c.execute("INSERT INTO library_chunks (evidence_id, n, section, title, text, vec) VALUES (?,?,?,?,?,NULL)",
                          (evidence_id, n, p["section"], (title or "")[:300], p["text"]))
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
    if embed_now:
        embed_pending()
    return len(parts)


def index_missing(limit=200):
    """Passages for stored sources that have none yet (sources collected after the migration). Returns the count."""
    c = ensure_schema()
    rows = c.execute("SELECT e.id, e.title, e.text FROM evidence e WHERE NOT EXISTS (SELECT 1 FROM library_chunks c WHERE c.evidence_id = e.id) "
                     "AND length(e.text) >= 200 ORDER BY e.added DESC LIMIT ?", (int(limit),)).fetchall()
    for r in rows:
        index_page(r["id"], r["title"], r["text"])
    return len(rows)


# ---- search ---------------------------------------------------------------------------------------------------------
def _matrix():
    """The normalized passage vectors (float32) with their passage ids, cached until the count changes."""
    import numpy as np
    c = ensure_schema()
    key = c.execute("SELECT count(*), max(id) FROM library_chunks WHERE vec IS NOT NULL").fetchone()
    key = (key[0], key[1])
    with _MAT_LOCK:
        if _MAT["key"] == key and _MAT["m"] is not None:
            return _MAT["ids"], _MAT["m"]
        ids, vecs = [], []
        for r in c.execute("SELECT id, vec FROM library_chunks WHERE vec IS NOT NULL"):
            ids.append(r[0])
            vecs.append(np.frombuffer(r[1], dtype=np.float16))
        if not vecs:
            _MAT.update(key=key, ids=np.zeros(0, dtype=np.int64), m=None)
            return _MAT["ids"], None
        m = np.vstack(vecs).astype(np.float32)
        m /= np.linalg.norm(m, axis=1, keepdims=True) + 1e-9
        _MAT.update(key=key, ids=np.asarray(ids, dtype=np.int64), m=m)
        return _MAT["ids"], m


_STOP = {"the", "and", "for", "with", "that", "this", "from", "what", "which", "about", "into", "their", "they", "have", "how",
         "are", "was", "were", "been", "does", "did", "our", "your", "who", "why", "when", "where", "will", "can", "all", "any"}


def _fts_query(q):
    words = [w for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]{1,}", q or "") if w.lower() not in _STOP and len(w) > 2]
    return " OR ".join(f'"{w}"*' if "-" not in w else f'"{w}"' for w in words[:12])


def search(q, k=10, kinds=EVIDENCE_KINDS, since=None, until=None, per_page=2, vec_fn=None, candidates=120):
    """Passages for a question, best first: [{pointer, evidence_id, title, publisher, date, url, kind, excerpt, score}].
    Words and meaning are searched over every passage and fused by reciprocal rank; kinds and period filter first."""
    import numpy as np
    c = ensure_schema()
    q = str(q or "").strip()
    if not q:
        return []
    ranks = {}
    fq = _fts_query(q)
    if fq:
        try:
            for i, r in enumerate(c.execute("SELECT rowid FROM library_chunks_fts WHERE library_chunks_fts MATCH ? ORDER BY rank LIMIT ?",
                                            (fq, candidates))):
                ranks.setdefault(r[0], 0.0)
                ranks[r[0]] += 1.0 / (RRF_K + i)
        except Exception:
            pass
    cos = {}
    try:
        ids, m = _matrix()
        if m is not None and len(ids):
            qv = np.asarray((vec_fn or (lambda t: embed([t], query=True)[0]))(q), dtype=np.float32)
            qv /= np.linalg.norm(qv) + 1e-9
            sims = m @ qv
            top = np.argsort(-sims)[:candidates]
            for i, j in enumerate(top):
                cid = int(ids[j])
                cos[cid] = float(sims[j])
                ranks.setdefault(cid, 0.0)
                ranks[cid] += 1.0 / (RRF_K + i)
    except Exception:
        pass
    if not ranks:
        return []
    order = sorted(ranks, key=lambda x: -ranks[x])[: candidates * 2]
    rows = {r["id"]: r for r in c.execute(
        f"SELECT c.id, c.evidence_id, c.n, c.text, c.title AS ctitle, e.url, e.title, e.source_id, m.kind, m.publisher, m.date, m.wiki_path, m.document_url "
        f"FROM library_chunks c JOIN evidence e ON e.id = c.evidence_id LEFT JOIN library_meta m ON m.evidence_id = c.evidence_id "
        f"WHERE c.id IN ({','.join('?' * len(order))})", order)}
    from . import currency
    out, per = [], {}
    for cid in order:
        r = rows.get(cid)
        if not r:
            continue
        kind = kind_of(r["kind"], r["url"] or r["document_url"] or "")
        if kinds and kind not in kinds:
            continue
        date = r["date"] or ""
        if (since or until) and not (date and (not since or date >= since) and (not until or date <= until)):
            continue
        if per.get(r["evidence_id"], 0) >= per_page:
            continue
        per[r["evidence_id"]] = per.get(r["evidence_id"], 0) + 1
        path = r["wiki_path"] or r["evidence_id"]
        out.append({"pointer": f"lib/{path}#c{r['n']}", "evidence_id": r["evidence_id"], "title": r["title"] or r["ctitle"] or path,
                    "publisher": r["publisher"] or "", "date": date, "url": r["url"] if str(r["url"] or "").startswith("http") else "",
                    "document_url": r["document_url"] or "", "kind": kind, "excerpt": (r["text"] or "")[:900],
                    "moment": moment_link(r["document_url"] or r["url"] or "", r["text"]),
                    "score": round(ranks[cid], 5), "cosine": round(cos.get(cid, 0.0), 3)})
        if len(out) >= k:
            break
    return out


def page_scores(q, limit=40, vec_fn=None):
    """[(evidence id, best cosine)] of the pages closest to a question by meaning (the Library's search by meaning)."""
    import numpy as np
    ids, m = _matrix()
    if m is None or not len(ids) or not str(q or "").strip():
        return []
    qv = np.asarray((vec_fn or (lambda t: embed([t], query=True)[0]))(str(q)), dtype=np.float32)
    qv /= np.linalg.norm(qv) + 1e-9
    sims = m @ qv
    top = np.argsort(-sims)[: limit * 6]
    c = ensure_schema()
    owner = {r[0]: r[1] for r in c.execute(f"SELECT id, evidence_id FROM library_chunks WHERE id IN ({','.join('?' * len(top))})",
                                           [int(ids[j]) for j in top])}
    best = {}
    for j in top:
        ev = owner.get(int(ids[j]))
        if ev and ev not in best:
            best[ev] = round(float(sims[j]), 3)
    return sorted(best.items(), key=lambda x: -x[1])[:limit]


def passage(pointer):
    """{pointer, text, title, url, publisher, date, kind} for a "lib/...#cN" pointer, or None."""
    m = re.match(r"^lib/(.+)#c(\d+)$", str(pointer or ""))
    if not m:
        return None
    c = ensure_schema()
    path, n = m.group(1), int(m.group(2))
    meta = c.execute("SELECT * FROM library_meta WHERE wiki_path = ?", (path,)).fetchone()
    ev = meta["evidence_id"] if meta else path
    r = c.execute("SELECT c.text, e.title, e.url FROM library_chunks c JOIN evidence e ON e.id = c.evidence_id WHERE c.evidence_id = ? AND c.n = ?",
                  (ev, n)).fetchone()
    if not r:
        return None
    return {"pointer": pointer, "text": r["text"], "title": r["title"], "url": r["url"] if str(r["url"] or "").startswith("http") else "",
            "publisher": (meta["publisher"] if meta else "") or "", "date": (meta["date"] if meta else "") or "",
            "kind": kind_of(meta["kind"] if meta else "", r["url"] or ""), "moment": moment_link(r["url"] or "", r["text"])}


def page_chunks(evidence_id):
    """[(pointer, text)] of one stored page, in order (for adopting a library page into an engagement)."""
    c = ensure_schema()
    meta = c.execute("SELECT wiki_path FROM library_meta WHERE evidence_id = ?", (evidence_id,)).fetchone()
    path = (meta["wiki_path"] if meta else "") or evidence_id
    return [(f"lib/{path}#c{r['n']}", r["text"]) for r in
            c.execute("SELECT n, text FROM library_chunks WHERE evidence_id = ? ORDER BY n", (evidence_id,))]


_META_CACHE = {"key": None, "rows": {}}


def meta_for(evidence_ids):
    """{evidence id: library_meta row as a dict} for the ids that are migrated pages. All rows are kept in memory and
    read again only when a row changes, so a Library search over 18,000 pages costs dictionary lookups, not queries."""
    c = ensure_schema()
    key = tuple(c.execute("SELECT count(*), max(updated) FROM library_meta").fetchone())
    if _META_CACHE["key"] != key:
        _META_CACHE["rows"] = {r["evidence_id"]: dict(r) for r in c.execute("SELECT * FROM library_meta")}
        _META_CACHE["key"] = key
    rows = _META_CACHE["rows"]
    return {i: rows[i] for i in evidence_ids if i in rows}


def recall(query, k=5, call=None, rerank=True):
    """Passages from the whole Library for the conversation's recall tool, reranked by the fast model when it answers."""
    items = search(query, k=max(k * 3, 12))
    if not items:
        return []
    got = [{"pointer": it["pointer"], "title": it["title"], "excerpt": it["excerpt"], "url": it["url"], "publisher": it["publisher"],
            "date": it["date"], "kind": KIND_LABEL.get(it["kind"], it["kind"]), "via": "the Library"} for it in items]
    if rerank:
        from . import secondbrain
        got = secondbrain.rerank(query, got, call)
    return got[:k]


def reuse_pages(goal, known_urls=(), max_pages=6, min_cosine=0.5, window=None):
    """Pages the Library already holds that answer a research goal, in secondbrain.reuse's shape: collected articles only
    (never model-written pages, never Reddit posts or client documents unless named), inside the run's period."""
    items = search(goal, k=60, kinds=("article", "collected"), since=(window or {}).get("since"), until=(window or {}).get("until"), per_page=1)
    c = ensure_schema()
    out, seen = [], {u for u in known_urls if u}
    for it in items:
        if len(out) >= max_pages:
            break
        if it["cosine"] < min_cosine or not it["url"] or it["url"] in seen:
            continue
        e = c.execute("SELECT text FROM evidence WHERE id = ?", (it["evidence_id"],)).fetchone()
        if not e or len(e["text"] or "") < 400:
            continue
        seen.add(it["url"])
        path = it["pointer"].split("#")[0]
        out.append({"title": it["title"], "url": it["url"], "text": e["text"], "publisher": it["publisher"], "date": it["date"],
                    "wiki_path": path, "chunks": page_chunks(it["evidence_id"]), "score": it["cosine"],
                    "why": f"already in the Library; its best passage matches the goal at {it['cosine']:.2f}"})
    return out


def stats():
    c = ensure_schema()
    g = lambda sql: c.execute(sql).fetchone()[0]
    kinds = {r[0] or "collected": r[1] for r in c.execute("SELECT kind, count(*) FROM library_meta GROUP BY kind")}
    return {"pages": g("SELECT count(*) FROM library_meta"), "kinds": kinds, "passages": g("SELECT count(*) FROM library_chunks"),
            "with_vectors": g("SELECT count(*) FROM library_chunks WHERE vec IS NOT NULL"),
            "restored": g("SELECT count(*) FROM library_restore WHERE status = 'restored'"),
            "restore_tried": g("SELECT count(*) FROM library_restore")}
