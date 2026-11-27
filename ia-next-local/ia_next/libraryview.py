"""The Library: everything this machine has collected, searchable (field test 2026-11-23, Gap 1).

The second brain could not be browsed: the only window was one engagement's flat file list, and HiC's own search took
about 25 seconds a query. Every source IA Next Local reads is already in a local full-text index (store.evidence_fts),
across all engagements, so the Library answers from that index in milliseconds: a search box, filters for data pack,
publisher, period and engagement, the passage with its source, date and address, and "add to this engagement" for the
rows a person picks. HiC is never on the typing path.

search() returns {"items", "facets", "total", "seconds"}; item() returns one source in full; add() copies picked
sources into another engagement with their origin recorded, so a citation still names where the evidence came from.
"""
import io
import json
import os
import re
import time

from . import currency, store

_META = {}                 # engagement id -> (mtime, {source id: meta})


def _meta(eid):
    """{source id: {publisher, date, pack, kind}} from the engagement's own sources file, cached by its mtime."""
    out = {}
    for rel in ("results/sources.json", "results/uploaded_sources.json"):
        try:
            p = store.safe_path(eid, rel)
            m = os.path.getmtime(p)
        except (OSError, ValueError):
            continue
        hit = _META.get((eid, rel))
        if not hit or hit[0] != m:
            try:
                with io.open(p, encoding="utf-8") as fh:
                    rows = json.load(fh).get("sources") or []
            except (OSError, ValueError):
                rows = []
            hit = (m, {s.get("id"): {"publisher": str(s.get("publisher") or ""), "date": currency.parse_date(s.get("date")),
                                     "pack": str(s.get("pack") or ""), "kind": str(s.get("kind") or ("upload" if not s.get("url") else "web"))}
                       for s in rows if isinstance(s, dict)})
            _META[(eid, rel)] = hit
        out.update(hit[1])
    return out


# ---- dates and vectors for every row (field test 23 Nov, Gap 1: older rows had no date, and search was by words only)
_EXTRA_READY = None
VEC_MODEL_CHARS = 900
MEANING_FLOOR = 0.45            # a source this close to the question by meaning joins the results


def _extra():
    global _EXTRA_READY
    c = store.conn()
    if _EXTRA_READY is not c:
        c.execute("CREATE TABLE IF NOT EXISTS evidence_extra (id TEXT PRIMARY KEY, date TEXT DEFAULT '', vec BLOB, checked REAL)")
        _EXTRA_READY = c
    return c


def _date_from(url, text):
    """A published date read from the address or the opening text of a stored source ("" when neither holds one)."""
    m = currency._URL_DATE.search(url or "")
    if m:
        got = currency._valid(*m.groups())
        if got:
            return got.isoformat()
    start = re.sub(r"\s+", " ", str(text or ""))[:2500]
    m = currency._BYLINE.search(start) or currency._WORDY.search(start[:1200])
    return (currency.parse_date(m.group(0)) or "") if m else ""


def backfill(limit=96, embed=None):
    """Give stored sources what they lack: a date (from the address or the text), passages in the Library's index and
    their vectors (26 Nov: every source, collected here or migrated, is searched by passage), and a page vector for
    search by meaning. Works through the oldest unchecked rows, `limit` at a time; safe to call again and again."""
    import array
    try:
        from . import librarysearch
        librarysearch.index_missing(limit=int(limit))
        librarysearch.embed_pending(limit=int(limit) * 4)
    except Exception:
        pass                                   # the embedder is away: passages now, vectors on a later pass
    c = _extra()
    rows = c.execute("SELECT e.id, e.url, e.title, substr(e.text, 1, 3000) AS text FROM evidence e LEFT JOIN evidence_extra x ON x.id = e.id "
                     "WHERE x.id IS NULL OR x.vec IS NULL ORDER BY (x.id IS NOT NULL), e.added LIMIT ?", (int(limit),)).fetchall()
    if not rows:
        return {"checked": 0, "dated": 0, "vectors": 0}
    vecs = [None] * len(rows)
    try:
        if embed is None:
            from . import localrank
            embed = localrank.embed
        texts = [f"{r['title'] or ''}. {(r['text'] or '')[:VEC_MODEL_CHARS]}" for r in rows]
        got = []
        for i in range(0, len(texts), 32):         # small batches: 400 texts in one request timed out (24 Nov)
            got += embed(texts[i:i + 32])
        vecs = [array.array("f", v).tobytes() for v in got]
    except Exception:
        pass                                   # the embedder is away: dates now, vectors on a later pass
    dated = 0
    for r, v in zip(rows, vecs):
        d = _date_from(r["url"], r["text"])
        dated += bool(d)
        if v is None:                          # leave the row unchecked for vectors, but keep its date
            c.execute("INSERT OR REPLACE INTO evidence_extra (id, date, vec, checked) VALUES (?, ?, NULL, NULL)", (r["id"], d))
        else:
            c.execute("INSERT OR REPLACE INTO evidence_extra (id, date, vec, checked) VALUES (?, ?, ?, ?)", (r["id"], d, v, time.time()))
    if any(v is None for v in vecs):           # rows without a vector are asked again: drop their marker
        c.execute("DELETE FROM evidence_extra WHERE vec IS NULL AND date = ''")
    return {"checked": len(rows), "dated": dated, "vectors": sum(1 for v in vecs if v is not None)}


def by_meaning(q, limit=40, embed=None):
    """[(evidence id, score)] of the stored sources closest to the question by meaning, best first. [] when the
    embedder is away or nothing has a vector yet. (26 Nov) Read from the passage index when it holds vectors: every
    passage of every source is compared, not only a page's opening, in one matrix product."""
    if embed is None:
        try:
            from . import librarysearch
            got = librarysearch.page_scores(q, limit=limit)
            if got:
                return [(i, s) for i, s in got if s >= MEANING_FLOOR]
        except Exception:
            pass
    import array
    import math
    c = _extra()
    rows = c.execute("SELECT id, vec FROM evidence_extra WHERE vec IS NOT NULL").fetchall()
    if not rows or not str(q or "").strip():
        return []
    try:
        if embed is None:
            from . import localrank
            embed = localrank.embed
            q = localrank.INSTRUCT + str(q)
        qv = embed([str(q)])[0]
    except Exception:
        return []
    qn = math.sqrt(sum(x * x for x in qv)) or 1.0
    out = []
    for r in rows:
        v = array.array("f")
        v.frombytes(r["vec"])
        if len(v) != len(qv):
            continue
        dot = sum(a * b for a, b in zip(qv, v))
        vn = math.sqrt(sum(x * x for x in v)) or 1.0
        s = dot / (qn * vn)
        if s >= MEANING_FLOOR:
            out.append((r["id"], round(s, 3)))
    out.sort(key=lambda x: -x[1])
    return out[:limit]


def _match(q):
    """An FTS5 query: every word as a prefix, a hyphenated term ("co-op", "first-year") as a phrase."""
    terms = []
    for w in re.findall(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|[A-Za-z0-9]{2,}", str(q or ""))[:8]:
        terms.append(f'"{" ".join(w.split("-"))}"' if "-" in w else f'"{w}"*')
    return " AND ".join(terms)


def _bucket(date):
    age = currency.age_days(date)
    return "undated" if age is None else "7" if age <= 7 else "30" if age <= 30 else "90" if age <= 90 else "older"


PERIODS = {"7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "older": "Older", "undated": "Undated"}


def _lib_fields(ids):
    """Kind, collection, projects, publisher and date of the migrated pages among these evidence ids."""
    try:
        from . import librarysearch
        return librarysearch.meta_for(ids)
    except Exception:
        return {}


def _kind_label(kind):
    from . import librarysearch
    return librarysearch.KIND_LABEL.get(kind or "collected", kind or "Collected here")


def search(q="", engagement="", pack="", publisher="", period="", limit=60, kind="", collection="", project=""):
    """Sources matching the words (all of them, as prefixes), newest first when there are no words. Filters narrow the
    list; the facets count what the unfiltered matches hold, so a person sees what a filter would leave. (26 Nov) The
    migrated HiC library joins: each source has a kind (article, Reddit post, client document, transcript, HiC analysis,
    reference), a collection (HiC library or collected here) and the projects it was collected for."""
    t0 = time.time()
    from . import librarysearch
    m = _match(q)
    c = store.conn()
    if m:
        rows = c.execute("SELECT e.id, e.engagement_id, e.source_id, e.url, e.title, e.added, "
                         "snippet(evidence_fts, 0, '[[', ']]', ' ... ', 28) AS snip FROM evidence_fts f JOIN evidence e ON e.rowid = f.rowid "
                         "WHERE evidence_fts MATCH ? ORDER BY rank LIMIT 40000", (m,)).fetchall()
    else:
        rows = c.execute("SELECT e.id, e.engagement_id, e.source_id, e.url, e.title, e.added, substr(e.text, 1, 260) AS snip FROM evidence e "
                         "LEFT JOIN evidence_extra x ON x.id = e.id ORDER BY COALESCE(x.date, '') DESC, e.added DESC LIMIT 40000").fetchall()
    rows = list(rows)
    near = {}
    if m:                                      # sources close to the question by meaning join the word matches
        near = dict(by_meaning(q))
        ranked = []
        try:                                   # (26 Nov) the list follows the passage index's ranking: words and meaning fused
            from . import librarysearch
            ranked = [h["evidence_id"] for h in librarysearch.search(q, k=150, kinds=(), per_page=1)]
        except Exception:
            ranked = []
        have = {r["id"] for r in rows}
        extra_ids = [i for i in list(dict.fromkeys(ranked + list(near))) if i not in have][:160]
        if extra_ids:
            rows += c.execute("SELECT id, engagement_id, source_id, url, title, added, substr(text, 1, 260) AS snip FROM evidence "
                              f"WHERE id IN ({','.join('?' * len(extra_ids))})", extra_ids).fetchall()
        if ranked:
            pos = {e: i for i, e in enumerate(ranked)}
            rows.sort(key=lambda r: pos.get(r["id"], len(pos)))      # ranked first, in order; then the other word matches
    dates = {r["id"]: r["date"] for r in _extra().execute("SELECT id, date FROM evidence_extra WHERE date != ''")}
    engs = {e["id"]: e["title"] for e in store.list_engagements(include_hidden=True)}
    lib = _lib_fields([r["id"] for r in rows])
    items, seen = [], set()
    for r in rows:
        key = r["url"] or f"{r['engagement_id']}:{r['source_id']}"
        if key in seen:
            continue
        seen.add(key)
        lm = lib.get(r["id"])
        meta = _meta(r["engagement_id"]).get(r["source_id"]) or {}
        host = re.sub(r"^www\.", "", re.sub(r"^[a-z]+://([^/]+).*$", r"\1", r["url"] or "")) if r["url"] else ""
        date = (lm or {}).get("date") or meta.get("date") or dates.get(r["id"], "")
        k = librarysearch.kind_of((lm or {}).get("kind"), r["url"] or "")
        items.append({"id": r["id"], "engagement_id": r["engagement_id"], "engagement": engs.get(r["engagement_id"], ""),
                      "source_id": r["source_id"], "url": r["url"] if str(r["url"] or "").startswith("http") else "", "title": r["title"] or r["source_id"],
                      "publisher": (lm or {}).get("publisher") or meta.get("publisher") or host, "date": date, "pack": meta.get("pack") or "",
                      "kind": k, "kind_label": _kind_label(k), "collection": (lm or {}).get("collection") or "Collected here",
                      "projects": json.loads((lm or {}).get("projects") or "[]"), "period": _bucket(date),
                      "restored": bool((lm or {}).get("restored") and '"restored"' in (lm or {}).get("restored", "")),
                      "by_meaning": r["id"] in near and "[[" not in str(r["snip"] or ""),
                      "snippet": " ".join(str(r["snip"] or "").split())[:420]})
    facets = {"pack": {}, "publisher": {}, "period": {}, "engagement": {}, "kind": {}, "collection": {}, "project": {}}
    for it in items:
        for name, val in (("pack", it["pack"] or "none"), ("publisher", it["publisher"] or "unknown"), ("period", it["period"]),
                          ("engagement", it["engagement_id"]), ("kind", it["kind"]), ("collection", it["collection"])):
            facets[name][val] = facets[name].get(val, 0) + 1
        for p in it["projects"]:
            facets["project"][p] = facets["project"].get(p, 0) + 1
    keep = [it for it in items if (not engagement or it["engagement_id"] == engagement) and (not pack or (it["pack"] or "none") == pack)
            and (not publisher or it["publisher"] == publisher) and (not period or it["period"] == period)
            and (not kind or it["kind"] == kind) and (not collection or it["collection"] == collection)
            and (not project or project in it["projects"])]
    if not m:
        keep.sort(key=lambda it: it["date"] or "", reverse=True)
    top = lambda d, n: [{"value": k, "count": v} for k, v in sorted(d.items(), key=lambda kv: -kv[1])[:n]]
    return {"items": keep[:limit], "total": len(keep), "matched": len(items), "seconds": round(time.time() - t0, 3),
            # 26 Nov: the filters are menus that find as the person types, so they list every value (were 14)
            "facets": {"pack": top(facets["pack"], 40), "publisher": top(facets["publisher"], 80),
                       "period": [{"value": k, "label": PERIODS[k], "count": facets["period"].get(k, 0)} for k in PERIODS if facets["period"].get(k)],
                       "engagement": [dict(x, label=engs.get(x["value"], x["value"])) for x in top(facets["engagement"], 80)],
                       "kind": [dict(x, label=_kind_label(x["value"])) for x in top(facets["kind"], 10)],
                       "collection": top(facets["collection"], 5), "project": top(facets["project"], 120)}}


def item(evidence_id):
    """One source in full: its text and where it came from. None when there is no such row."""
    r = store.conn().execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
    if not r:
        return None
    meta = _meta(r["engagement_id"]).get(r["source_id"]) or {}
    lm = _lib_fields([r["id"]]).get(r["id"]) or {}
    eng = store.get_engagement(r["engagement_id"]) or {}
    restored = {}
    try:
        restored = json.loads(lm.get("restored") or "{}") if lm.get("restored") else {}
    except ValueError:
        restored = {}
    from . import librarysearch
    k = librarysearch.kind_of(lm.get("kind"), r["url"] or "")
    return {"id": r["id"], "engagement_id": r["engagement_id"], "engagement": eng.get("title") or "", "source_id": r["source_id"],
            "url": r["url"] if str(r["url"] or "").startswith("http") else "", "title": r["title"] or "", "text": (r["text"] or "")[:60_000],
            "publisher": lm.get("publisher") or meta.get("publisher") or "", "date": lm.get("date") or meta.get("date") or "",
            "pack": meta.get("pack") or "", "chars": len(r["text"] or ""), "kind": k, "kind_label": _kind_label(k),
            "collection": lm.get("collection") or "Collected here", "projects": json.loads(lm.get("projects") or "[]"),
            "tags": json.loads(lm.get("tags") or "[]"), "wiki_path": lm.get("wiki_path") or "", "document_url": lm.get("document_url") or "",
            "restored": restored if restored.get("status") == "restored" else {}, "copies": len(json.loads(lm.get("copies") or "[]")),
            "is_evidence": bool(lm.get("is_evidence", 1)), "sensitive": bool(lm.get("sensitive")),
            "flags": json.loads(lm.get("flags") or "[]")}


def add(evidence_ids, engagement_id):
    """Copy the picked sources into an engagement's evidence. Each keeps its publisher, date, pack and address, and
    records the engagement it came from. A source the engagement already holds (same address) is skipped.
    Returns {"added": [source ids], "skipped": n}."""
    if not store.get_engagement(engagement_id):
        raise KeyError(engagement_id)
    path = store.safe_path(engagement_id, "results/sources.json")
    try:
        with io.open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        data = {"sources": []}
    rows = data.setdefault("sources", [])
    have = {s.get("url") for s in rows if s.get("url")}
    from . import transcripts
    n = max([int(s["id"][1:]) for s in rows if str(s.get("id", "")).startswith("S") and s["id"][1:].isdigit()] or [0])
    n = max(n, transcripts.last_source_number(engagement_id))
    added, skipped = [], 0
    adopt = []
    for ev in list(dict.fromkeys(evidence_ids or []))[:40]:
        it = item(ev)
        if not it or it["engagement_id"] == engagement_id or (it["url"] and it["url"] in have):
            skipped += 1
            continue
        full = store.conn().execute("SELECT text FROM evidence WHERE id = ?", (ev,)).fetchone()
        text = (full["text"] if full else "") or it["text"]          # the whole document, not the reader's first 60,000 characters
        n += 1
        sid = f"S{n}"
        rows.append({"id": sid, "url": it["url"], "title": it["title"], "text": text, "untrusted": True, "publisher": it["publisher"],
                     "date": it["date"], "pack": it["pack"], "kind": "web" if it["url"] else "upload",
                     "from_library": {"engagement_id": it["engagement_id"], "source_id": it["source_id"], "evidence_id": ev,
                                      "wiki_path": it.get("wiki_path") or "", "document_url": it.get("document_url") or ""}})
        have.add(it["url"])
        store.add_evidence(engagement_id, sid, it["url"], it["title"], text)
        adopt.append(({"id": sid, "text": text, "title": it["title"]}, ev))
        added.append(sid)
    if added:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(data, fh, indent=1, ensure_ascii=False)
        store.event("library_added", {"sources": added}, engagement_id)
        # (26 Nov) each page arrives with its passages from the Library's index, so builders read it whole and cite its
        # passages, and it is never archived a second time
        try:
            from . import librarysearch, secondbrain
            for src, ev in adopt:
                chunks = librarysearch.page_chunks(ev)
                if chunks:
                    secondbrain.adopt(engagement_id, src, chunks[0][0].split("#")[0], chunks)
        except Exception:
            pass
    return {"added": added, "skipped": skipped}
