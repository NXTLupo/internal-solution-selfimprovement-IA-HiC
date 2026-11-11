"""Durable state for IA Next in one SQLite file (plan 6.3, 6.4, 6.8).

Tables: engagements, tasks, nodes (one per specialist step, with handoff states), events (append-only,
what the person can replay), approvals (bound to a hash of the exact call), evidence (passages with
provenance, full-text indexed), spend.

Handoff states follow teamknitt (plan 4.2): queued -> running -> available (result file written) ->
published (shown to the person) -> acknowledged (the person reacted). A node that returned nothing is
`failed`, never `available` (the OpenManus failure in 3.5).
"""
import json
import os
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
        return _CONN


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


def events_after(after_id=0, engagement_id=None, limit=200):
    q = "SELECT * FROM events WHERE id > ?" + (" AND engagement_id = ?" if engagement_id else "") + " ORDER BY id LIMIT ?"
    args = (after_id, engagement_id, limit) if engagement_id else (after_id, limit)
    return [dict(r) | {"data": json.loads(r["data"])} for r in conn().execute(q, args)]


# ---- engagements -------------------------------------------------------------------------------
def create_engagement(title, objective):
    eid = new_id("eng")
    with _LOCK:
        conn().execute("INSERT INTO engagements VALUES (?,?,?,?)", (eid, title, objective, _now()))
    os.makedirs(os.path.join(config.ENGAGEMENTS_DIR, eid, "results"), exist_ok=True)
    os.makedirs(os.path.join(config.ENGAGEMENTS_DIR, eid, "sources"), exist_ok=True)
    event("engagement_created", {"title": title}, eid)
    return eid


def get_engagement(eid):
    r = conn().execute("SELECT * FROM engagements WHERE id = ?", (eid,)).fetchone()
    return dict(r) if r else None


def list_engagements():
    return [dict(r) for r in conn().execute("SELECT * FROM engagements ORDER BY created DESC")]


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
def create_task(engagement_id, kind, brief, budget_usd, idem_key=None):
    """Idempotent by key: the same key returns the existing task instead of starting a second one."""
    with _LOCK:
        if idem_key:
            r = conn().execute("SELECT id FROM tasks WHERE idem_key = ?", (idem_key,)).fetchone()
            if r:
                return r["id"], False
        tid = new_id("task")
        conn().execute("INSERT INTO tasks (id, engagement_id, kind, brief, status, created, updated, budget_usd, idem_key) "
                       "VALUES (?,?,?,?,?,?,?,?,?)", (tid, engagement_id, kind, json.dumps(brief), "queued", _now(), _now(), budget_usd, idem_key))
    event("task_queued", {"kind": kind, "brief": brief}, engagement_id, tid)
    return tid, True


def update_task(tid, **fields):
    fields["updated"] = _now()
    cols = ", ".join(f"{k} = ?" for k in fields)
    with _LOCK:
        conn().execute(f"UPDATE tasks SET {cols} WHERE id = ?", (*fields.values(), tid))


def get_task(tid):
    r = conn().execute("SELECT * FROM tasks WHERE id = ?", (tid,)).fetchone()
    if not r:
        return None
    t = dict(r)
    t["brief"] = json.loads(t["brief"] or "{}")
    t["nodes"] = [dict(n) for n in conn().execute("SELECT * FROM nodes WHERE task_id = ? ORDER BY seq", (tid,))]
    return t


def list_tasks(engagement_id=None, limit=50):
    q = "SELECT id, engagement_id, kind, status, summary, spent_usd, created, updated, error FROM tasks"
    args = ()
    if engagement_id:
        q += " WHERE engagement_id = ?"
        args = (engagement_id,)
    q += " ORDER BY created DESC LIMIT ?"
    return [dict(r) for r in conn().execute(q, (*args, limit))]


def start_node(tid, specialist, model, seq):
    nid = new_id("node")
    with _LOCK:
        conn().execute("INSERT INTO nodes (id, task_id, specialist, model, state, started, seq) VALUES (?,?,?,?,?,?,?)",
                       (nid, tid, specialist, model, "running", _now(), seq))
    t = get_task(tid)
    event("node_running", {"specialist": specialist, "model": model}, t["engagement_id"], tid)
    return nid


def finish_node(nid, result_path=None, summary=None, error=None):
    """A node with an error, or without a non-empty result file, is failed: never reported as available."""
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
