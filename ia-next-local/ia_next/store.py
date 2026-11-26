"""Durable state for IA Next in one SQLite file (plan 6.3, 6.4, 6.8).

Tables: engagements, tasks, nodes (one per specialist step, with handoff states), events (append-only,
what the person can replay), approvals (bound to a hash of the exact call), evidence (passages with
provenance, full-text indexed), spend.

Handoff states follow teamknitt (plan 4.2): queued -> running -> available (result file written) ->
published (shown to the person) -> acknowledged (the person reacted). A node that returned nothing is
`failed`, never `available` (the OpenManus failure in 3.5).
"""
import contextvars
import json
import os
import re
import sqlite3
import threading
import time
import uuid

from . import config

_LOCK = threading.RLock()
_CONN = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS engagements (id TEXT PRIMARY KEY, title TEXT, objective TEXT, created REAL);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, engagement_id TEXT, kind TEXT, brief TEXT, status TEXT, created REAL, updated REAL,
  result_path TEXT, summary TEXT, error TEXT, spent_usd REAL DEFAULT 0, budget_usd REAL, idem_key TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY, task_id TEXT, specialist TEXT, model TEXT, state TEXT, started REAL, finished REAL,
  result_path TEXT, summary TEXT, error TEXT, seq INTEGER);
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, created REAL, updated REAL, title TEXT, items TEXT);
CREATE TABLE IF NOT EXISTS conversation_tasks (conversation_id TEXT, task_id TEXT, created REAL, PRIMARY KEY (conversation_id, task_id));
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, engagement_id TEXT, task_id TEXT, kind TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, cls TEXT, tool TEXT, args_json TEXT, args_hash TEXT, reason TEXT, status TEXT, created REAL, decided REAL);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY, engagement_id TEXT, source_id TEXT, url TEXT, title TEXT, text TEXT, added REAL);
CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(text, title, content='evidence', content_rowid='rowid');
CREATE TRIGGER IF NOT EXISTS evidence_ai AFTER INSERT ON evidence BEGIN
  INSERT INTO evidence_fts(rowid, text, title) VALUES (new.rowid, new.text, new.title); END;
"""


def conn():
    global _CONN
    with _LOCK:
        if _CONN is None:
            config.ensure_dirs()
            _CONN = sqlite3.connect(config.DB_PATH, check_same_thread=False, isolation_level=None)
            _CONN.row_factory = sqlite3.Row
            _CONN.execute("PRAGMA journal_mode=WAL")
            _CONN.executescript(SCHEMA)
            _migrate(_CONN)
        return _CONN


def _migrate(c):
    """Columns added after a table was first created (17 Nov, plan Part 9 C6: engagements can be hidden, never
    deleted). Old rows keep the default."""
    have = {r[1] for r in c.execute("PRAGMA table_info(engagements)")}
    if "hidden" not in have:
        c.execute("ALTER TABLE engagements ADD COLUMN hidden INTEGER DEFAULT 0")
    # Field test 23 Nov, Gap 3 (owner, 24 Nov: "managing engagements like projects, naming them, editing their
    # settings"): an engagement carries a client, a description, tags, a pin, an archive mark, its own defaults
    # (settings, JSON) and, when it was merged into another, the engagement that now shows its work.
    for col, kind in (("client", "TEXT DEFAULT ''"), ("description", "TEXT DEFAULT ''"), ("tags", "TEXT DEFAULT '[]'"),
                      ("settings", "TEXT DEFAULT '{}'"), ("pinned", "INTEGER DEFAULT 0"), ("archived", "INTEGER DEFAULT 0"),
                      ("merged_into", "TEXT DEFAULT ''"), ("updated", "REAL DEFAULT 0")):
        if col not in have:
            c.execute(f"ALTER TABLE engagements ADD COLUMN {col} {kind}")


def reset_for_tests(path):
    """Point the store at a fresh file (tests only)."""
    global _CONN
    with _LOCK:
        if _CONN is not None:
            _CONN.close()
        _CONN = None
        config.DB_PATH = path
        config.DATA_DIR = os.path.dirname(path)
        config.ENGAGEMENTS_DIR = os.path.join(config.DATA_DIR, "engagements")
        config.MEMORY_DIR = os.path.join(config.DATA_DIR, "memory")


def _now():
    return time.time()


def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def event(kind, data, engagement_id=None, task_id=None):
    with _LOCK:
        conn().execute("INSERT INTO events (ts, engagement_id, task_id, kind, data) VALUES (?,?,?,?,?)",
                       (_now(), engagement_id, task_id, kind, json.dumps(data, ensure_ascii=False)))
    if kind == "task_failed" and task_id:
        # field test 23 Nov (A4): only scored work reached the episode memory (10 lines for more than 75 tasks), so
        # the agent could not say what had failed before. A failure gets its line too.
        try:
            from . import memory
            t = get_task(task_id)
            if t:
                memory.episode(dict(t, summary="did not finish: " + " ".join(str((data or {}).get("error") or t.get("error") or "").split())[:240]))
        except Exception:
            pass


def events_after(after_id=0, engagement_id=None, limit=200):
    q = "SELECT * FROM events WHERE id > ?" + (" AND engagement_id = ?" if engagement_id else "") + " ORDER BY id LIMIT ?"
    args = (after_id, engagement_id, limit) if engagement_id else (after_id, limit)
    return [dict(r) | {"data": json.loads(r["data"])} for r in conn().execute(q, args)]


# ---- conversations (what the person saw, so a past conversation can be reopened) ----------------------
CONV_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
CONV_ITEMS, CONV_BYTES = 60, 600_000


def link_task(cid, tid):
    """Record that conversation `cid` started task `tid` (plan C5 and B4: "that deck" resolves to this conversation's
    work, and the conversation's spend includes the work it started)."""
    if cid and tid:
        conn().execute("INSERT OR IGNORE INTO conversation_tasks VALUES (?,?,?)", (cid, tid, _now()))


def conversation_task_ids(cid, limit=20):
    return [r[0] for r in conn().execute(
        "SELECT task_id FROM conversation_tasks WHERE conversation_id = ? ORDER BY created DESC LIMIT ?", (cid, limit))]


def conversation_spend(cid):
    """What conversation `cid` has cost: its own answers (spend labelled agent:<cid>) and the work it started."""
    c = conn()
    try:
        own = c.execute("SELECT COALESCE(SUM(usd), 0) FROM spend WHERE label = ?", (f"agent:{cid}",)).fetchone()[0]
    except sqlite3.OperationalError:          # no spend recorded yet
        own = 0.0
    tasks = c.execute("SELECT COALESCE(SUM(t.spent_usd), 0) FROM tasks t JOIN conversation_tasks ct ON ct.task_id = t.id "
                      "WHERE ct.conversation_id = ?", (cid,)).fetchone()[0]
    return round(float(own or 0) + float(tasks or 0), 4)


def save_conversation(cid, items):
    """Keep the page's view of a conversation: its last 60 items, dropping the oldest until it fits 600 KB.
    The title is the person's first message."""
    if not CONV_ID.match(cid or ""):
        raise ValueError("bad conversation id")
    items = [i for i in (items or []) if isinstance(i, dict)][-CONV_ITEMS:]
    data = json.dumps(items, ensure_ascii=False)
    while len(data) > CONV_BYTES and items:
        items = items[1:]
        data = json.dumps(items, ensure_ascii=False)
    first = next((i for i in items if i.get("type") == "user" and str(i.get("text") or "").strip()), None)
    title = " ".join(str(first.get("text") if first else "").split())[:120]
    with _LOCK:
        conn().execute("INSERT INTO conversations (id, created, updated, title, items) VALUES (?,?,?,?,?) "
                       "ON CONFLICT(id) DO UPDATE SET updated = excluded.updated, title = CASE WHEN excluded.title != '' "
                       "THEN excluded.title ELSE conversations.title END, items = excluded.items",
                       (cid, _now(), _now(), title, data))
    return len(items)


def _conversation_engagements(items):
    """The engagements a conversation worked in: those of the files attached in it and of the work it started or
    showed, most recent first (the page groups chats under their engagement)."""
    steps = []                                       # newest item first: ("eng", id) or ("task", id)
    for it in reversed(items):
        if not isinstance(it, dict):
            continue
        rec = it.get("rec") if isinstance(it.get("rec"), dict) else {}
        steps += [("task", t) for t in (rec.get("started") or []) + (rec.get("tasks") or []) if isinstance(t, str)]
        steps += [("eng", f["engagement_id"]) for f in it.get("files") or [] if isinstance(f, dict) and f.get("engagement_id")]
    tids = list(dict.fromkeys(v for k, v in steps if k == "task"))[:100]
    owner = {}
    if tids:
        owner = {r[0]: r[1] for r in conn().execute(f"SELECT id, engagement_id FROM tasks WHERE id IN ({','.join('?' * len(tids))})", tids)}
    eids = []
    for kind, v in steps:
        eid = owner.get(v) if kind == "task" else v
        if eid and eid not in eids:
            eids.append(eid)
    return eids


def list_conversations(limit=50):
    rows = list(conn().execute("SELECT id, created, updated, title, items FROM conversations WHERE items != '[]' "
                               "ORDER BY updated DESC LIMIT ?", (limit,)))
    out = []
    for r in rows:
        try:
            items = json.loads(r["items"] or "[]")
        except ValueError:
            items = []
        out.append({"id": r["id"], "created": r["created"], "updated": r["updated"], "title": r["title"] or "",
                    "items": len(items), "engagements": _conversation_engagements(items)})
    return out


def load_conversation(cid):
    if not CONV_ID.match(cid or ""):
        return None
    r = conn().execute("SELECT * FROM conversations WHERE id = ?", (cid,)).fetchone()
    if not r:
        return None
    try:
        items = json.loads(r["items"] or "[]")
    except ValueError:
        items = []
    return {"id": r["id"], "created": r["created"], "updated": r["updated"], "title": r["title"] or "", "items": items}


# ---- engagements -------------------------------------------------------------------------------
def create_engagement(title, objective, hidden=False):
    """`hidden` marks an engagement made by an automated check (C6): kept, searchable by id, out of the person's list."""
    eid = new_id("eng")
    with _LOCK:
        conn().execute("INSERT INTO engagements (id, title, objective, created, hidden) VALUES (?,?,?,?,?)",
                       (eid, title, objective, _now(), 1 if hidden else 0))
    os.makedirs(os.path.join(config.ENGAGEMENTS_DIR, eid, "results"), exist_ok=True)
    os.makedirs(os.path.join(config.ENGAGEMENTS_DIR, eid, "sources"), exist_ok=True)
    event("engagement_created", {"title": title}, eid)
    return eid


SETTING_KEYS = ("packs", "period", "depth", "brand", "audience")
PERIODS = ("", "1", "7", "30", "90", "365", "any")


def _eng(r):
    """An engagements row as the rest of the code reads it: tags a list, settings a dict."""
    d = dict(r)
    for key, empty in (("tags", []), ("settings", {})):
        try:
            v = json.loads(d.get(key) or "null")
        except ValueError:
            v = None
        d[key] = v if isinstance(v, type(empty)) else empty
    for key in ("client", "description", "merged_into"):
        d[key] = d.get(key) or ""
    for key in ("pinned", "archived", "hidden"):
        d[key] = int(d.get(key) or 0)
    return d


def get_engagement(eid):
    r = conn().execute("SELECT * FROM engagements WHERE id = ?", (eid,)).fetchone()
    return _eng(r) if r else None


def list_engagements(include_hidden=False):
    q = "SELECT * FROM engagements" + ("" if include_hidden else " WHERE COALESCE(hidden, 0) = 0") + " ORDER BY created DESC"
    rows = [_eng(r) for r in conn().execute(q)]
    # field test 23 Nov (U5): the page counted work from the newest 50 tasks, so an engagement's count fell as work was
    # added elsewhere (46, 45, 43, 38 in one day). The count comes from the table.
    counts, last = {}, {}
    for r in conn().execute("SELECT engagement_id, COUNT(*) AS n, MAX(updated) AS u FROM tasks GROUP BY engagement_id"):
        counts[r["engagement_id"]], last[r["engagement_id"]] = int(r["n"]), r["u"] or 0
    srcs = {r["engagement_id"]: int(r["n"]) for r in conn().execute("SELECT engagement_id, COUNT(*) AS n FROM evidence GROUP BY engagement_id")}
    merged = {}
    for r in conn().execute("SELECT id, merged_into FROM engagements WHERE COALESCE(merged_into, '') != ''"):
        merged.setdefault(r["merged_into"], []).append(r["id"])
    for r in rows:
        mine = [r["id"]] + merged.get(r["id"], [])
        r["merged"] = merged.get(r["id"], [])
        r["task_count"] = sum(counts.get(x, 0) for x in mine)
        r["source_count"] = srcs.get(r["id"], 0)
        r["last_activity"] = max([r.get("updated") or 0, r.get("created") or 0] + [last.get(x, 0) for x in mine])
    rows.sort(key=lambda r: (-r["pinned"], -r["last_activity"]))
    return rows


def update_engagement(eid, changes):
    """Edit an engagement as a project: title, client, description (its objective), tags, pinned, archived, and its
    settings (the defaults its new work starts from: data packs, evidence period, depth, brand, audience). Only the
    keys given change. Returns the engagement, or None when there is none. Raises ValueError on a bad value."""
    e = get_engagement(eid)
    if not e:
        return None
    sets, vals = [], []

    def put(col, v):
        sets.append(f"{col} = ?")
        vals.append(v)
    if "title" in changes:
        title = " ".join(str(changes["title"] or "").split())[:160]
        if not title:
            raise ValueError("a name is needed")
        put("title", title)
    if "client" in changes:
        put("client", " ".join(str(changes["client"] or "").split())[:120])
    if "description" in changes:
        d = str(changes["description"] or "").strip()[:2000]
        put("description", d)
        if d:
            put("objective", d)                  # what the agent reads as the engagement's purpose
    if "tags" in changes:
        tags = []
        for t in changes["tags"] or []:
            t = " ".join(str(t or "").replace(",", " ").split())[:40]
            if t and t.lower() not in (x.lower() for x in tags):
                tags.append(t)
        put("tags", json.dumps(tags[:12], ensure_ascii=False))
    for flag in ("pinned", "archived"):
        if flag in changes:
            put(flag, 1 if changes[flag] else 0)
    if "archived" in changes:
        put("hidden", 1 if changes["archived"] else 0)        # archived work leaves the list; nothing is deleted
    if "settings" in changes:
        s = dict(e["settings"])
        for k, v in (changes["settings"] or {}).items():
            if k not in SETTING_KEYS:
                continue
            if k == "packs":
                v = [str(x)[:60] for x in (v or []) if str(x).strip()][:8]
            elif k == "period":
                v = str(v or "")
                if v not in PERIODS:
                    raise ValueError("the period is one of: today, 7, 30, 90, 365 days, or any date")
            elif k == "depth":
                v = str(v or "")
                if v not in ("", "fast", "deep"):
                    raise ValueError("the depth is fast or deep")
            else:
                v = " ".join(str(v or "").split())[:200]
            if v in ("", [], None):
                s.pop(k, None)
            else:
                s[k] = v
        put("settings", json.dumps(s, ensure_ascii=False))
    if not sets:
        return e
    put("updated", _now())
    with _LOCK:
        conn().execute(f"UPDATE engagements SET {', '.join(sets)} WHERE id = ?", (*vals, eid))
    event("engagement_updated", {"changed": sorted(k for k in changes)}, eid)
    return get_engagement(eid)


def merge_engagements(ids, into):
    """Fold the engagements in `ids` into `into`: their work and chats show under it and they leave the list. Nothing is
    moved or deleted (files, links and source numbers inside finished work keep working), so it can be undone with
    unmerge_engagement. Returns the ids merged. Copying their sources into the target is the caller's step."""
    if not get_engagement(into):
        raise KeyError(into)
    done = []
    for eid in dict.fromkeys(ids or []):
        e = get_engagement(eid)
        if not e or eid == into or e["merged_into"]:
            continue
        with _LOCK:
            conn().execute("UPDATE engagements SET merged_into = ?, hidden = 1, updated = ? WHERE id = ?", (into, _now(), eid))
            # an engagement already folded into this one follows it
            conn().execute("UPDATE engagements SET merged_into = ? WHERE merged_into = ?", (into, eid))
        event("engagement_merged", {"into": into, "title": e["title"]}, eid)
        done.append(eid)
    if done:
        with _LOCK:
            conn().execute("UPDATE engagements SET updated = ? WHERE id = ?", (_now(), into))
    return done


def unmerge_engagement(eid):
    """Put a merged engagement back in the list on its own. Sources copied into the other engagement stay there."""
    e = get_engagement(eid)
    if not e or not e["merged_into"]:
        return False
    with _LOCK:
        conn().execute("UPDATE engagements SET merged_into = '', hidden = ?, updated = ? WHERE id = ?", (e["archived"], _now(), eid))
    event("engagement_unmerged", {"from": e["merged_into"]}, eid)
    return True


def family(eid):
    """An engagement and the ones merged into it: the ids whose work it shows."""
    return [eid] + [r["id"] for r in conn().execute("SELECT id FROM engagements WHERE merged_into = ?", (eid,))]


def rename_engagement(eid, title):
    """Give an engagement a new name (field test 23 Nov, Gap 3: a name could be typed at creation only). Its id, work
    and files are untouched. Returns the stored title, or None when there is no such engagement."""
    title = " ".join(str(title or "").split())[:160]
    if not title:
        raise ValueError("a name is needed")
    with _LOCK:
        n = conn().execute("UPDATE engagements SET title = ? WHERE id = ?", (title, eid)).rowcount
    if not n:
        return None
    event("engagement_renamed", {"title": title}, eid)
    return title


def set_hidden(eid, hidden):
    """Hide or show an engagement in the person's list. Nothing is deleted; its work stays reachable by id."""
    with _LOCK:
        n = conn().execute("UPDATE engagements SET hidden = ? WHERE id = ?", (1 if hidden else 0, eid)).rowcount
    if n:
        event("engagement_hidden" if hidden else "engagement_shown", {}, eid)
    return bool(n)


def workspace(eid):
    return os.path.join(config.ENGAGEMENTS_DIR, eid)


def safe_path(eid, rel):
    """Specialists write only inside their engagement workspace (plan 6.3); anything else is refused."""
    root = os.path.realpath(workspace(eid))
    p = os.path.realpath(os.path.join(root, rel))
    if not (p == root or p.startswith(root + os.sep)):
        raise PermissionError(f"path outside the engagement workspace: {rel}")
    return p


# ---- tasks and nodes ---------------------------------------------------------------------------
# The person's words for the turn and the sources the agent declared for the tool call, set by agent.turn and
# agent.execute_tool. Every task brief carries them, so a builder can check that the work uses the sources the person
# named (18 Nov: an r/NEU deck was built from campus news) whatever the agent wrote into audience or goal.
TURN = contextvars.ContextVar("ia_next_turn", default=None)


def create_task(engagement_id, kind, brief, budget_usd, idem_key=None):
    """Idempotent by key: the same key returns the existing task instead of starting a second one."""
    turn = TURN.get()
    if turn and isinstance(brief, dict):
        brief = dict(brief)
        if turn.get("request") and not brief.get("request"):
            brief["request"] = str(turn["request"])[:2000]
        if turn.get("required_sources") and not brief.get("required_sources"):
            brief["required_sources"] = list(turn["required_sources"])[:12]
        if turn.get("packs") and not brief.get("selected_packs"):
            brief["selected_packs"] = list(turn["packs"])[:8]
        if turn.get("level") and not brief.get("level"):          # the detail asked for, for every builder (depthlevel.py)
            brief["level"] = turn["level"]
    if isinstance(brief, dict):
        # the engagement's own defaults fill what the request and the plan card left open (Gap 3)
        s = (get_engagement(engagement_id) or {}).get("settings") or {}
        if s:
            brief = dict(brief)
            if s.get("packs") and not brief.get("selected_packs") and not brief.get("packs"):
                brief["selected_packs"] = list(s["packs"])[:8]
            if s.get("depth") and not brief.get("depth"):
                brief["depth"] = s["depth"]
            # the engagement's own period is the period of its work (owner, 25 Nov: a period that was selected is
            # honoured). The plan card showed it and the run used 30 days, because only a changed choice was sent.
            if s.get("period") and not isinstance(brief.get("window"), dict):
                from . import currency
                said = str(brief.get("request") or f"{brief.get('goal') or ''} {brief.get('scope') or ''}")
                if str(s["period"]) in currency.PERIOD_CHOICES and "no period" in str(currency.window(said).get("why") or ""):
                    brief["window"] = dict(currency.for_choice(s["period"]), why="the engagement's own period")
            if s.get("audience") and str(brief.get("audience") or "").strip().lower() in ("", "the person who asked for this work"):
                brief["audience"] = s["audience"]
            if s.get("brand") and str(brief.get("brand") or "nxt").lower() == "nxt" and "#nxt" not in str(brief.get("request") or "").lower():
                brief["brand"] = s["brand"]
    with _LOCK:
        if idem_key:
            r = conn().execute("SELECT id, status FROM tasks WHERE idem_key = ?", (idem_key,)).fetchone()
            if r and r["status"] in ("stopped", "failed"):
                # Work that was stopped or that failed can be asked for again (24 Nov: the owner stopped a deck and a
                # journey map by accident, asked again, and was handed the stopped cards). The old task keeps its
                # record under a retired key; the same request now makes a new one.
                conn().execute("UPDATE tasks SET idem_key = ? WHERE id = ?", (f"{idem_key}:retired:{r['id']}", r["id"]))
                r = None
            if r:
                return r["id"], False
        tid = new_id("task")
        conn().execute("INSERT INTO tasks (id, engagement_id, kind, brief, status, created, updated, budget_usd, idem_key) "
                       "VALUES (?,?,?,?,?,?,?,?,?)", (tid, engagement_id, kind, json.dumps(brief), "queued", _now(), _now(), budget_usd, idem_key))
    event("task_queued", {"kind": kind, "brief": brief}, engagement_id, tid)
    return tid, True


STOPPED_BY_YOU = "stopped by you"
ACTIVE = ("queued", "running", "stopping")
TERMINAL = ("done", "failed", "stopped")


class TaskStopped(BaseException):
    """Raised inside a running task once the person has pressed Stop (enhancement plan B4). A BaseException on
    purpose: the per-page and per-image `except Exception` handlers inside the specialists must not swallow it and
    carry on spending. `stoppable` on each task runner turns it into the 'stopped' state."""
    def __init__(self, spent_usd=0.0):
        super().__init__(STOPPED_BY_YOU)
        self.spent_usd = spent_usd


def stoppable(run):
    """Wrap a task runner: a Stop ends the task as 'stopped', with its spend so far and its open step closed."""
    import functools

    @functools.wraps(run)
    def wrapped(tid, *a, **k):
        try:
            return run(tid, *a, **k)
        except TaskStopped as e:
            finish_stopped(tid, e.spent_usd)
    return wrapped


def finish_stopped(tid, spent_usd=0.0):
    with _LOCK:
        conn().execute("UPDATE nodes SET state = 'failed', finished = ?, error = ? WHERE task_id = ? AND state = 'running'",
                       (_now(), STOPPED_BY_YOU, tid))
        conn().execute("UPDATE tasks SET status = 'stopped', error = ?, spent_usd = MAX(COALESCE(spent_usd, 0), ?), updated = ? "
                       "WHERE id = ? AND status IN ('queued', 'running', 'stopping')", (STOPPED_BY_YOU, spent_usd or 0.0, _now(), tid))
    t = get_task(tid)
    if t:
        event("task_stopped", {"spent_usd": t["spent_usd"]}, t["engagement_id"], tid)


def update_task(tid, **fields):
    """A task the person asked to stop stays 'stopping' while its runner works through the current step: a runner's
    'running' does not undo the request, and its 'failed' (raised by the stop) is recorded as 'stopped'. Work that
    finishes anyway is still recorded as done."""
    fields["updated"] = _now()
    with _LOCK:
        if fields.get("status") in ("running", "failed"):
            row = conn().execute("SELECT status FROM tasks WHERE id = ?", (tid,)).fetchone()
            if row and row["status"] == "stopping":
                if fields["status"] == "running":
                    fields.pop("status")
                else:
                    fields["status"], fields["error"] = "stopped", STOPPED_BY_YOU
        cols = ", ".join(f"{k} = ?" for k in fields)
        conn().execute(f"UPDATE tasks SET {cols} WHERE id = ?", (*fields.values(), tid))
    if fields.get("status") == "done":           # every finished page names each source's publication, date and address
        try:
            from . import citations
            citations.on_done(tid)
        except Exception:
            pass
    if fields.get("status") == "done" and SCORE_ON_DONE:
        # uplift plan WS-1: every finished task is scored by code, in the background (scorecard.py)
        import threading
        from . import scorecard
        threading.Thread(target=scorecard.run, args=(tid,), daemon=True, name=f"score-{tid}").start()


SCORE_ON_DONE = os.environ.get("IA_NEXT_SCORE_ON_DONE", "1") == "1"


def request_stop(tid):
    """Ask a queued or running task to stop. One conditional UPDATE, so the answer is the server's: True when this
    call moved it to 'stopping', False when it had already finished or been stopped."""
    with _LOCK:
        cur = conn().execute("UPDATE tasks SET status = 'stopping', updated = ? WHERE id = ? AND status IN ('queued', 'running')",
                             (_now(), tid))
    if cur.rowcount != 1:
        return False
    t = get_task(tid)
    event("task_stopping", {}, t["engagement_id"], tid)
    return True


def stop_requested(tid):
    r = conn().execute("SELECT status FROM tasks WHERE id = ?", (tid,)).fetchone()
    return bool(r) and r["status"] == "stopping"


def check_stop(tid, spent_usd=0.0):
    if tid and stop_requested(tid):
        raise TaskStopped(spent_usd)


def usual_seconds(specialist, not_node=None):
    """The median time of the last finished steps of this kind on this machine, or None when none has finished. Steps
    that differ only in a count or a name ("persona 2 of 4, The cautious explainer") are one kind."""
    import re as _re
    import statistics
    family = _re.split(r"\s\d+ of \d+", str(specialist or ""))[0].strip()
    if not family:
        return None
    rows = conn().execute("SELECT started, finished FROM nodes WHERE specialist LIKE ? AND state = 'available' AND finished IS NOT NULL "
                          "AND id != ? ORDER BY finished DESC LIMIT 9", (family.replace("%", "") + "%", not_node or "")).fetchall()
    took = [r["finished"] - r["started"] for r in rows if r["finished"] > r["started"]]
    return int(statistics.median(took)) if took else None


def get_task(tid):
    r = conn().execute("SELECT * FROM tasks WHERE id = ?", (tid,)).fetchone()
    if not r:
        return None
    t = dict(r)
    t["brief"] = json.loads(t["brief"] or "{}")
    t["nodes"] = [dict(n) for n in conn().execute("SELECT * FROM nodes WHERE task_id = ? ORDER BY seq", (tid,))]
    if t.get("status") == "done":                # the code-computed scorecard (uplift plan WS-1), when it has run
        try:
            from . import scorecard
            sc = scorecard.read(t)
            if sc:
                t["scorecard"] = {"hard_failed": sc.get("hard_failed") or [], "judge": sc.get("judge"),
                                  "checks": [{k: c.get(k) for k in ("name", "passed", "hard", "detail")} for c in sc.get("checks") or []]}
        except Exception:
            pass
    for n in t["nodes"]:                         # a running step says how long steps like it have taken on this machine
        if n.get("state") == "running":
            n["expected_s"] = EXPECTED.get(n.get("id")) or usual_seconds(n.get("specialist"), n.get("id"))
    # the governed skills this work loaded, with the time each was loaded: the page shows them on the step that used them
    t["skills"] = [{"ts": r["ts"], **json.loads(r["data"])} for r in conn().execute(
        "SELECT ts, data FROM events WHERE task_id = ? AND kind = 'skill_used' ORDER BY id", (tid,))]
    return t


def list_tasks(engagement_id=None, limit=50):
    q = "SELECT id, engagement_id, kind, status, summary, spent_usd, created, updated, error FROM tasks"
    args = ()
    if engagement_id:
        ids = family(engagement_id)                    # an engagement shows the work of those merged into it
        q += f" WHERE engagement_id IN ({','.join('?' * len(ids))})"
        args = tuple(ids)
    q += " ORDER BY created DESC LIMIT ?"
    return [dict(r) for r in conn().execute(q, (*args, limit))]


_WORK = threading.local()          # the task this thread is working on, so a skill load can say whose work it served


def current_task():
    """(task id, engagement id) of the specialist step this thread last started, or (None, None)."""
    return getattr(_WORK, "task", (None, None))


_NODE_PROGRESS = {}                          # node id -> the token that set its progress callback


def _node_progress(nid):
    """A streaming call inside a step opened with start_node reports here: the running line shows the tokens written
    (uplift plan WS-2 step 5; 23 Nov, live: the Analyst and the Deck Composer showed only elapsed time)."""
    def report(n):
        try:
            said = getattr(_WORK, "said", "") if getattr(_WORK, "node", None) == nid else ""
            with _LOCK:
                conn().execute("UPDATE nodes SET summary = ? WHERE id = ? AND state = 'running'",
                               (((said + "; ") if said else "") + f"writing: {n:,} tokens so far", nid))
        except Exception:
            pass                                 # the view is a courtesy: it never stops the work
    return report


def say(text):
    """What the step this thread is running is doing right now, in plain words, shown on its running line (field test
    23 Nov, U6: "writing: 1 tokens so far" stayed up for three minutes of feed fetching). No-op outside a step."""
    nid = getattr(_WORK, "node", None)
    if not nid:
        return
    _WORK.said = str(text or "")[:240]
    try:
        with _LOCK:
            conn().execute("UPDATE nodes SET summary = ? WHERE id = ? AND state = 'running'", (_WORK.said, nid))
    except Exception:
        pass                                     # the view is a courtesy: it never stops the work


def note_model(model):
    """The running step's card names the model that is answering now (QA 25 Nov, E5: the name was corrected only
    when the step ended). Never raises."""
    nid = getattr(_WORK, "node", None)
    if not nid or not model or getattr(_WORK, "model", None) == (nid, model):
        return
    _WORK.model = (nid, model)
    try:
        with _LOCK:
            conn().execute("UPDATE nodes SET model = ? WHERE id = ? AND state = 'running' AND model != ?", (model, nid, model))
    except Exception:
        pass


def start_node(tid, specialist, model, seq, progress=True):
    nid = new_id("node")
    with _LOCK:
        conn().execute("INSERT INTO nodes (id, task_id, specialist, model, state, started, seq) VALUES (?,?,?,?,?,?,?)",
                       (nid, tid, specialist, model, "running", _now(), seq))
    t = get_task(tid)
    _WORK.task = (tid, t["engagement_id"])
    _WORK.node, _WORK.said = nid, ""
    event("node_running", {"specialist": specialist, "model": model}, t["engagement_id"], tid)
    if progress:                                 # a stage (store.stage) sets its own callback, with its line
        try:
            from . import providers
            _NODE_PROGRESS[nid] = providers.PROGRESS.set(_node_progress(nid))
        except Exception:
            pass
    return nid


EXPECTED = {}                                # node id -> seconds, set by a step that knows its own length


class _Stage:
    """One visible step of a task's work: a node the live view shows while it runs, with who is doing it and on
    which model, and a line saying what came of it. Owner, 20 Nov: "what happened to the transparency of workflow?
    Why did we lapse back into an opaque black box?" A persona set was being written in six steps inside one node
    called Artifact Studio, so the card showed one long wait. Work that takes more than a moment goes through here."""

    def __init__(self, tid, specialist, model):
        self.tid, self.specialist, self.model, self.nid, self.said = tid, specialist, model, None, ""

    def say(self, text):
        """What has come of the step so far, shown on the running step as it changes (22 Nov: a ten-minute
        transcription showed nothing but elapsed time until it ended)."""
        self.said = str(text or "")[:300]
        if self.nid:
            try:
                with _LOCK:
                    conn().execute("UPDATE nodes SET summary = ? WHERE id = ? AND state = 'running'", (self.said, self.nid))
            except Exception:
                pass                             # the view is a courtesy: it never stops the work

    def _tokens(self, n):
        """Called by a streaming model call inside this step: the running line gains the tokens written so far."""
        if self.nid:
            line = (self.said + "; " if self.said else "") + f"writing: {n:,} tokens so far"
            try:
                with _LOCK:
                    conn().execute("UPDATE nodes SET summary = ? WHERE id = ? AND state = 'running'", (line[:300], self.nid))
            except Exception:
                pass

    def expect(self, seconds):
        """How long this step should take, when the work knows better than history (a transcription's length)."""
        if self.nid and seconds:
            EXPECTED[self.nid] = int(seconds)

    def __enter__(self):
        from . import providers                  # model calls in this step stream and report progress (WS-2 step 5)
        self._ptok = providers.PROGRESS.set(self._tokens if self.tid else None)   # no card, no streaming
        self._answered = []
        self._atok = providers.ANSWERED.set(self._answered)
        if self.tid:
            try:
                row = conn().execute("SELECT max(seq) AS m, count(*) AS n FROM nodes WHERE task_id = ?", (self.tid,)).fetchone()
                self.nid = start_node(self.tid, self.specialist, self.model, int(row["m"] or 0) + 0.01 * (1 + int(row["n"] or 0)),
                                      progress=False)
            except Exception:
                self.nid = None                  # the view is a courtesy: it never stops the work
        return self

    def __exit__(self, kind, err, tb):
        try:
            from . import providers
            providers.PROGRESS.reset(self._ptok)
        except Exception:
            pass
        try:
            providers.ANSWERED.reset(self._atok)
        except Exception:
            pass
        if not self.nid:
            return False
        # the card names the model that answered: the one that wrote most of this step's calls
        used = [m for m in getattr(self, "_answered", []) if m]
        if used and str(self.model or "").strip().lower() not in ("rules", "code (no model)", ""):
            actual = max(set(used), key=used.count)
            if actual != self.model:
                self.model = actual
                try:
                    with _LOCK:
                        conn().execute("UPDATE nodes SET model = ? WHERE id = ?", (actual, self.nid))
                except Exception:
                    pass
        try:
            if err is not None:
                finish_node(self.nid, None, None, error=str(err)[:300])
            else:
                t = get_task(self.tid)
                p = safe_path(t["engagement_id"], f"results/tasks/{self.tid}/steps/{self.nid}.json")
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w", encoding="utf-8", newline="\n") as fh:
                    json.dump({"step": self.specialist, "model": self.model, "result": self.said or "done"}, fh, ensure_ascii=False)
                finish_node(self.nid, p, self.said or "done")
        except Exception:
            pass
        return False


def stage(tid, specialist, model):
    return _Stage(tid, specialist, model)


def finish_node(nid, result_path=None, summary=None, error=None):
    """A node with an error, or without a non-empty result file, is failed: never reported as available."""
    tok = _NODE_PROGRESS.pop(nid, None)
    if tok is not None:
        try:
            from . import providers
            providers.PROGRESS.reset(tok)
        except (ValueError, RuntimeError):
            pass                                 # finished from another thread: that thread's value is its own
    ok = (error is None and result_path and os.path.isfile(result_path) and os.path.getsize(result_path) > 0)
    state = "available" if ok else "failed"
    if not ok and error is None:
        error = "the specialist returned no result"
    with _LOCK:
        conn().execute("UPDATE nodes SET state = ?, finished = ?, result_path = ?, summary = ?, error = ? WHERE id = ?",
                       (state, _now(), result_path, summary, error, nid))
    r = conn().execute("SELECT task_id, specialist FROM nodes WHERE id = ?", (nid,)).fetchone()
    t = get_task(r["task_id"])
    event("node_" + state, {"specialist": r["specialist"], "summary": summary, "error": error}, t["engagement_id"], r["task_id"])
    return state


def set_node_state(nid, state):
    with _LOCK:
        conn().execute("UPDATE nodes SET state = ? WHERE id = ?", (state, nid))


# ---- evidence ----------------------------------------------------------------------------------
def add_evidence(engagement_id, source_id, url, title, text):
    eid = new_id("ev")
    with _LOCK:
        conn().execute("INSERT INTO evidence VALUES (?,?,?,?,?,?,?)", (eid, engagement_id, source_id, url, title, text, _now()))
    return eid


def search_evidence(query, engagement_id=None, limit=8):
    terms = " OR ".join(w for w in "".join(c if c.isalnum() else " " for c in query).split() if len(w) > 2)
    if not terms:
        return []
    q = ("SELECT e.* FROM evidence_fts f JOIN evidence e ON e.rowid = f.rowid WHERE evidence_fts MATCH ?"
         + (" AND e.engagement_id = ?" if engagement_id else "") + " ORDER BY rank LIMIT ?")
    args = (terms, engagement_id, limit) if engagement_id else (terms, limit)
    return [dict(r) for r in conn().execute(q, args)]


def evidence_for(engagement_id):
    return [dict(r) for r in conn().execute("SELECT * FROM evidence WHERE engagement_id = ? ORDER BY added", (engagement_id,))]
