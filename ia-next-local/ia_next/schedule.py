"""Scheduled and standing work (plan 6.3, from Hermes, OpenClaw and Kortix in 3.5).

A schedule is a stored tool call plus an interval. Rules:
- the next run time is advanced BEFORE the call fires, so a crash can never run it twice;
- a schedule's call is any agent tool, executed through the same tool layer, so approval classes and
  budgets apply exactly as they do in conversation;
- consecutive failures lengthen the wait (2, 4, 8 ... minutes, capped at an hour) and after
  MAX_FAILURES the schedule pauses itself with the reason, for the person to resume;
- creating a schedule is a standing spend, so it needs the person's approval (class `spend`).
"""
import json
import threading
import time

from . import control, store

MAX_FAILURES = 5
TICK_SECONDS = 30
EMBED_RETRY_TICKS = 20            # every ten minutes
_started = False
_LOCK = threading.Lock()

SCHEMA = """CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY, tool TEXT, args_json TEXT, every_minutes INTEGER, next_run REAL, status TEXT,
  failures INTEGER DEFAULT 0, last_error TEXT, last_result TEXT, created REAL, approval_id TEXT)"""


def _db():
    c = store.conn()
    c.execute(SCHEMA)
    return c


def create(tool, args, every_minutes, first_run_in_minutes=0):
    """Returns the schedule, or a pending approval when the person has not approved this exact schedule."""
    every_minutes = max(15, int(every_minutes))
    spec = {"tool": tool, "args": args, "every_minutes": every_minutes}
    st = control.status_for("create_schedule", spec)
    if st != "approved":
        a = control.request("spend", "create_schedule", spec, f"Run {tool} every {every_minutes} minutes")
        return {"approval": a["status"], "approval_id": a["id"]}
    sid = store.new_id("sched")
    _db().execute("INSERT INTO schedules (id, tool, args_json, every_minutes, next_run, status, created) VALUES (?,?,?,?,?,?,?)",
                  (sid, tool, json.dumps(args, sort_keys=True), every_minutes, time.time() + 60 * first_run_in_minutes, "active", time.time()))
    store.event("schedule_created", {"id": sid, "tool": tool, "every_minutes": every_minutes})
    return get(sid)


def get(sid):
    r = _db().execute("SELECT * FROM schedules WHERE id = ?", (sid,)).fetchone()
    return dict(r) if r else None


def list_all():
    return [dict(r) for r in _db().execute("SELECT * FROM schedules ORDER BY created DESC")]


def set_status(sid, status):
    _db().execute("UPDATE schedules SET status = ?, failures = CASE WHEN ? = 'active' THEN 0 ELSE failures END WHERE id = ?", (status, status, sid))
    store.event("schedule_" + status, {"id": sid})
    return get(sid)


def tick(execute, now=None):
    """Fire every due schedule once. `execute(tool, args) -> dict` is the agent's tool layer.
    Returns the ids fired. Exposed for tests; the background thread calls it every TICK_SECONDS."""
    now = now or time.time()
    fired = []
    with _LOCK:
        due = [dict(r) for r in _db().execute("SELECT * FROM schedules WHERE status = 'active' AND next_run <= ?", (now,))]
        for s in due:
            # advance first: a crash after this line cannot fire the same run twice
            _db().execute("UPDATE schedules SET next_run = ? WHERE id = ?", (now + 60 * s["every_minutes"], s["id"]))
            try:
                out = execute(s["tool"], json.loads(s["args_json"]))
                if isinstance(out, dict) and out.get("error"):
                    raise RuntimeError(out["error"])
                _db().execute("UPDATE schedules SET failures = 0, last_error = NULL, last_result = ? WHERE id = ?",
                              (json.dumps(out)[:2000], s["id"]))
                store.event("schedule_fired", {"id": s["id"], "result": out})
            except Exception as e:
                f = s["failures"] + 1
                if f >= MAX_FAILURES:
                    _db().execute("UPDATE schedules SET failures = ?, last_error = ?, status = 'paused' WHERE id = ?", (f, str(e)[:500], s["id"]))
                    store.event("schedule_paused", {"id": s["id"], "error": str(e)[:300], "failures": f})
                else:
                    backoff = min(60, 2 ** f)
                    _db().execute("UPDATE schedules SET failures = ?, last_error = ?, next_run = ? WHERE id = ?",
                                  (f, str(e)[:500], now + 60 * backoff, s["id"]))
                    store.event("schedule_failed", {"id": s["id"], "error": str(e)[:300], "retry_in_minutes": backoff})
            fired.append(s["id"])
    return fired


def start_background(execute):
    global _started
    if _started:
        return
    _started = True

    def loop():
        n = 0
        while True:
            try:
                tick(execute)
            except Exception as e:
                store.event("scheduler_error", {"error": str(e)[:300]})
            n += 1
            if n % EMBED_RETRY_TICKS == 0:          # uplift plan WS-3 step 5: pages archived while the embedder was down
                try:
                    from . import secondbrain
                    secondbrain.embed_pending()
                except Exception as e:
                    store.event("scheduler_error", {"error": f"embed retry: {str(e)[:280]}"})
            if n % EMBED_RETRY_TICKS == 1:          # idle work: the local pack index and the Library's dates and vectors
                try:
                    busy = store.conn().execute("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('running', 'queued')").fetchone()["n"]
                    if not busy:
                        from . import hic, libraryview, packindex
                        libraryview.backfill(limit=96)
                        if packindex.suspects():           # feeds of failed batches, asked one at a time
                            packindex.probe(hic._call, owner=hic.pack_owner())
                        packindex.maybe_ingest(hic._call, idle=lambda: not store.conn().execute(
                            "SELECT COUNT(*) AS n FROM tasks WHERE status IN ('running', 'queued')").fetchone()["n"])
                except Exception as e:
                    store.event("scheduler_error", {"error": f"idle work: {str(e)[:280]}"})
            time.sleep(TICK_SECONDS)

    threading.Thread(target=loop, daemon=True, name="ia-next-scheduler").start()
