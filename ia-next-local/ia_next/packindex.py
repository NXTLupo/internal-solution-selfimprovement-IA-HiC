"""HiC's data packs, kept in a local index (field test 23 Nov, S7: "pack ingestion into the local index").

A pack search asked HiC's feeds live on every run: two to five minutes, the latest two items of each feed whatever the
question, and whole batches lost to a slow feed. Measured 24 Nov: the AI Trends pack (109 feeds) returned nothing on
students for a month, because a feed's latest two items are rarely about the question.

Now every item any pack search returns is remembered here, a scheduled pass reads more of each feed while the machine
is idle, and a research run searches this index first: instant, by the question's own words, over everything the
feeds have published since the index began, not only their latest items. HiC stays the source: this is a cache of
what it returned, with the publisher, pack, date and address each item came with.
"""
import json
import re
import threading
import time

from . import store

INGEST_HOURS = 6                  # how often the idle pass runs
PER_SOURCE = 10                   # items read from each feed on the idle pass
INGEST_BUDGET_SECONDS = 300
_LOCK = threading.Lock()
_READY = None                     # the connection whose tables exist (the store reopens its file in tests)


def _db():
    global _READY
    c = store.conn()
    if _READY is not c:
        with _LOCK:
            c.executescript("""
CREATE TABLE IF NOT EXISTS pack_items (url TEXT PRIMARY KEY, title TEXT, date TEXT, content TEXT, publisher TEXT,
  pack TEXT, tier INTEGER, fetched REAL);
CREATE VIRTUAL TABLE IF NOT EXISTS pack_items_fts USING fts5(title, content, content='pack_items', content_rowid='rowid');
CREATE TRIGGER IF NOT EXISTS pack_items_ai AFTER INSERT ON pack_items BEGIN
  INSERT INTO pack_items_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content); END;
CREATE TRIGGER IF NOT EXISTS pack_items_ad AFTER DELETE ON pack_items BEGIN
  INSERT INTO pack_items_fts(pack_items_fts, rowid, title, content) VALUES ('delete', old.rowid, old.title, old.content); END;
CREATE TABLE IF NOT EXISTS pack_index_state (k TEXT PRIMARY KEY, v TEXT);
""")
            _READY = c
    return c


def _get(k, default=None):
    r = _db().execute("SELECT v FROM pack_index_state WHERE k = ?", (k,)).fetchone()
    try:
        return json.loads(r["v"]) if r else default
    except ValueError:
        return default


def _set(k, v):
    with _LOCK:
        _db().execute("INSERT INTO pack_index_state (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", (k, json.dumps(v)))


def remember(items):
    """Keep what a pack search returned. An item already held keeps its first text unless the new one is longer."""
    n = 0
    c = _db()
    with _LOCK:
        for it in items or []:
            url = str(it.get("url") or "")
            if not url.startswith("https://") or not it.get("pack"):
                continue
            body = str(it.get("content") or "")
            old = c.execute("SELECT rowid, length(content) AS n FROM pack_items WHERE url = ?", (url,)).fetchone()
            if old and old["n"] >= len(body):
                continue
            if old:
                c.execute("DELETE FROM pack_items WHERE url = ?", (url,))
            c.execute("INSERT INTO pack_items (url, title, date, content, publisher, pack, tier, fetched) VALUES (?,?,?,?,?,?,?,?)",
                      (url, str(it.get("title") or "")[:300], str(it.get("date") or "")[:10], body[:60_000],
                       str(it.get("publisher") or "")[:120], str(it["pack"]), int(it.get("tier") or 3), time.time()))
            n += 1
    return n


def used(pack_ids):
    """Note the packs a person's work uses, so the idle pass keeps those current."""
    have = _get("packs", {}) or {}
    now = time.time()
    for p in pack_ids or []:
        have[p] = now
    _set("packs", {k: v for k, v in have.items() if now - v < 30 * 86400})


def count(pack_ids=None):
    if pack_ids:
        q = f"SELECT COUNT(*) AS n FROM pack_items WHERE pack IN ({','.join('?' * len(pack_ids))})"
        return int(_db().execute(q, tuple(pack_ids)).fetchone()["n"])
    return int(_db().execute("SELECT COUNT(*) AS n FROM pack_items").fetchone()["n"])


def search(pack_ids, query, since="", limit=60):
    """Items of the chosen packs that hold the question's words, best match first: [{"title", "url", "date", "content",
    "publisher", "pack", "tier", "local": True}]. `since` (YYYY-MM-DD) leaves out items dated before it; undated ones stay
    for the caller's own rule."""
    words = list(dict.fromkeys(w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9]{3,}", str(query or ""))))[:10]
    packs = [p for p in pack_ids or [] if p]
    if not words or not packs:
        return []
    match = " OR ".join(f'"{w}"' for w in words)
    q = ("SELECT p.url, p.title, p.date, p.content, p.publisher, p.pack, p.tier FROM pack_items_fts f JOIN pack_items p ON p.rowid = f.rowid "
         f"WHERE pack_items_fts MATCH ? AND p.pack IN ({','.join('?' * len(packs))}) "
         + ("AND (p.date = '' OR p.date >= ?) " if since else "") + "ORDER BY bm25(pack_items_fts, 3.0, 1.0) LIMIT ?")
    args = (match, *packs) + ((since,) if since else ()) + (int(limit),)
    try:
        rows = _db().execute(q, args).fetchall()
    except Exception:
        return []
    return [dict(r, local=True) for r in map(dict, rows)]


def ingest(pack_ids, call, per_source=PER_SOURCE, budget_seconds=INGEST_BUDGET_SECONDS, batch=3):
    """Read more of each feed of the packs into the index. `call(method, path, timeout, **kw)` is hic._call. Stops at
    the time budget; a batch that fails is skipped. Returns {"packs", "sources", "items", "seconds"}."""
    t0 = time.time()
    kept = seen = 0
    for pid in pack_ids:
        try:
            pack = call("GET", f"/api/source-packs/{pid}", 20)
        except Exception:
            continue
        ids = pack.get("sourceIds") or []
        words = " ".join(re.findall(r"[A-Za-z]{4,}", str(pack.get("name") or pid)))[:80] or pid
        for i in range(0, len(ids), batch):
            if time.time() - t0 > budget_seconds:
                break
            part = ids[i:i + batch]
            try:
                out = call("GET", "/api/multi-search", 40, params={"q": words, "sources": ",".join(part), "limit": per_source})
            except Exception:
                continue
            seen += len(part)
            productive([sid for res, sid in zip(out.get("results") or [], part) if res.get("items")])
            items = []
            for res, sid in zip(out.get("results") or [], part):
                for it in res.get("items") or []:
                    items.append({"title": it.get("title"), "url": it.get("url"), "date": _iso(it.get("date")), "content": it.get("content"),
                                  "publisher": res.get("source") or sid, "pack": pid, "tier": res.get("credibilityTier") or 3})
            kept += remember(items)
    out = {"packs": list(pack_ids), "sources": seen, "items": kept, "seconds": round(time.time() - t0, 1), "held": count()}
    store.event("pack_index_ingested", out)
    return out


def read_whole(pack_ids, call, queries, budget_seconds=240, per_source=PER_SOURCE, workers=4, batch=2, say=None):
    """Every source of the chosen packs asked for up to `per_source` items, for each query in turn, into the index
    (QA 25 Nov, E2: a pack of more than 200 sources was asked for 2 to 5 items per source with one keyword string).
    This is how HiC searches a pack: every source, ten items, once per question of the research plan. Sources are
    asked two at a time on several lines, because one hanging feed fails a whole batch. A (pack, query) pair read in
    the last INGEST_HOURS is not read again. Returns {"sources", "asked", "answered", "items", "held", "seconds",
    "complete", "fresh"}: complete when the first query reached every source that can answer."""
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as _Late
    t0 = time.time()
    owner, ids = {}, []
    for pid in pack_ids:
        try:
            for sid in call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or []:
                if sid not in owner:
                    owner[sid] = pid
                    ids.append(sid)
        except Exception:
            continue
    aside = set(set_aside())
    live_ids = [s for s in ids if s not in aside]
    fresh = dict(_get("whole", {}) or {})
    out = {"sources": len(ids), "asked": 0, "answered": 0, "items": 0, "complete": False, "fresh": 0, "set_aside": len(ids) - len(live_ids)}
    answered_ids, failed = set(), []
    for qi, q in enumerate([x for x in dict.fromkeys(" ".join(str(q or "").split())[:200] for q in queries or []) if x][:3]):
        left = budget_seconds - (time.time() - t0)
        if left <= 5:
            break
        # a longer period reads further back into each feed, and is its own reading (a 30-day read does not stand in for it)
        mark = f"|{per_source}" if per_source > PER_SOURCE else ""
        todo = [s for s in live_ids if time.time() - float(fresh.get(f"{owner[s]}|{q.lower()}{mark}", 0)) > INGEST_HOURS * 3600]
        if qi == 0:
            out["fresh"] = len(live_ids) - len(todo)
        elif answered_ids:
            todo = [s for s in todo if s in answered_ids]          # later questions go to the feeds that answer
        if not todo:
            if qi == 0:
                out["complete"] = True
            continue
        parts = [todo[i:i + batch] for i in range(0, len(todo), batch)]

        def run(part, q=q):
            try:
                return part, call("GET", "/api/multi-search", 40, params={"q": q, "sources": ",".join(part), "limit": per_source})
            except Exception:
                return part, None

        pool = ThreadPoolExecutor(max_workers=workers)
        futs = [pool.submit(run, p) for p in parts]
        done_parts = 0
        try:
            for f in as_completed(futs, timeout=left):
                part, got = f.result()
                done_parts += 1
                out["asked"] += len(part)
                if got is None:
                    failed.extend(part)
                    continue
                results = got.get("results") or []
                items = []
                for res, sid in zip(results, part):
                    if res.get("items"):
                        answered_ids.add(sid)
                    for it in res.get("items") or []:
                        items.append({"title": it.get("title"), "url": it.get("url"), "date": _iso(it.get("date")), "content": it.get("content"),
                                      "publisher": res.get("source") or sid, "pack": owner.get(sid, ""), "tier": res.get("credibilityTier") or 3})
                out["items"] += remember(items)
                if say and done_parts % 10 == 0:
                    try:
                        say(f"reading every source of the chosen packs: {out['asked']} of {len(todo)} asked, {len(answered_ids)} answered")
                    except Exception:
                        pass
        except _Late:
            pass
        for f in futs:
            f.cancel()
        pool.shutdown(wait=False)
        if done_parts == len(parts):
            now = time.time()
            for pid in pack_ids:
                fresh[f"{pid}|{q.lower()}{mark}"] = now
            if qi == 0:
                out["complete"] = True
    try:
        _set("whole", {k: v for k, v in fresh.items() if time.time() - float(v) < 7 * 86400})
        if answered_ids:
            productive(sorted(answered_ids))
            if failed:
                suspects(failed)
    except Exception:
        pass
    out.update(answered=len(answered_ids), held=count(list(pack_ids)), seconds=round(time.time() - t0, 1))
    store.event("pack_read_whole", dict(out, packs=list(pack_ids)))
    return out


def _iso(raw):
    from . import currency
    return currency.parse_date(raw) or ""


def maybe_ingest(call, now=None, idle=lambda: True):
    """The idle pass: at most every INGEST_HOURS, only when no work is running, for the packs people's work uses
    (their engagements' default packs and the packs of recent runs). Returns the ingest result, or None."""
    now = now or time.time()
    if now - float(_get("last_ingest", 0) or 0) < INGEST_HOURS * 3600 or not idle():
        return None
    packs = set((_get("packs", {}) or {}).keys())
    for e in store.list_engagements(include_hidden=False):
        packs.update((e.get("settings") or {}).get("packs") or [])
    if not packs:
        return None
    _set("last_ingest", now)
    return ingest(sorted(packs), call)


# ---- feeds that do not answer (24 Nov: 60 of 226 pack sources timed out in one run) ----------------------------------
# A batch of ten fails when one feed in it hangs, so nine good feeds are lost with it and the run waits forty seconds
# for nothing. The feeds of a failed batch become suspects. The idle pass asks each suspect alone: one that answers is
# cleared (and its items kept); one that hangs is set aside. A live search leaves the set-aside feeds out, so it does
# not wait for them, and the index still serves whatever they published before. Each is tried again after a week.
RETRY_SLOW_DAYS = 7
PROBE_TIMEOUT = 45


def suspects(source_ids=None, clear=None):
    """Add feeds of a failed batch to the suspects, or clear feeds that answered. Returns the suspects."""
    have = set(_get("suspects", []) or [])
    have |= set(source_ids or [])
    have -= set(clear or [])
    _set("suspects", sorted(have))
    return sorted(have)


def set_aside(now=None):
    """{feed id: when it was set aside} for feeds that hung when asked alone, within the retry period."""
    now = now or time.time()
    return {k: v for k, v in (_get("slow", {}) or {}).items() if now - float(v) < RETRY_SLOW_DAYS * 86400}


def probe(call, owner=None, budget_seconds=240, now=None):
    """Ask each suspect feed alone. Returns {"asked", "cleared", "set_aside", "items"}."""
    now = now or time.time()
    slow = dict(_get("slow", {}) or {})
    todo = [s for s in suspects() if s not in set_aside(now)]
    t0, cleared, hung, kept = time.time(), [], [], 0
    for sid in todo:
        if time.time() - t0 > budget_seconds:
            break
        try:
            out = call("GET", "/api/multi-search", PROBE_TIMEOUT, params={"q": "news", "sources": sid, "limit": PER_SOURCE})
        except Exception:
            slow[sid] = now
            hung.append(sid)
            continue
        cleared.append(sid)
        slow.pop(sid, None)
        pack = (owner or {}).get(sid) or ""
        items = [{"title": it.get("title"), "url": it.get("url"), "date": _iso(it.get("date")), "content": it.get("content"),
                  "publisher": res.get("source") or sid, "pack": pack, "tier": res.get("credibilityTier") or 3}
                 for res in out.get("results") or [] for it in res.get("items") or []]
        kept += remember(items) if pack else 0
    _set("slow", slow)
    suspects(clear=cleared + hung)
    result = {"asked": len(cleared) + len(hung), "cleared": len(cleared), "set_aside": len(hung), "items": kept,
              "waiting": len(suspects())}
    store.event("pack_feeds_probed", dict(result, slow=hung[:20]))
    return result


def productive(source_ids=None):
    """{feed id: when it last returned items}. With ids, records that they just did."""
    have = dict(_get("productive", {}) or {})
    if source_ids:
        now = time.time()
        for s in source_ids:
            have[s] = now
        _set("productive", have)
    return have
