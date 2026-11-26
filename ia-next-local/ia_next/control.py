"""Approval classes, enforced in code (plan 6.8), with approvals bound to the exact call (plan 3.5, Kortix).

Classes: `spend` (a task whose budget passes the threshold), `send` (anything that leaves the system:
email, export to a client system), `delete` (anything irreversible). An approval records a hash of the
tool name and its canonical arguments; only that exact call may run under it. A call that differs asks
again. A denied approval is final for that call: the agent may not reach the same effect by another tool.
"""
import hashlib
import json
import time

from . import store

CLASSES = {"spend", "send", "delete"}


def call_hash(tool, args):
    canon = json.dumps({"tool": tool, "args": args}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def request(cls, tool, args, reason):
    if cls not in CLASSES:
        raise ValueError(f"unknown approval class {cls}")
    h = call_hash(tool, args)
    existing = store.conn().execute("SELECT * FROM approvals WHERE args_hash = ? ORDER BY created DESC LIMIT 1", (h,)).fetchone()
    if existing and existing["status"] in ("pending", "approved", "denied"):
        return dict(existing)
    aid = store.new_id("appr")
    store.conn().execute("INSERT INTO approvals VALUES (?,?,?,?,?,?,?,?,?)",
                         (aid, cls, tool, json.dumps(args, sort_keys=True), h, reason, "pending", time.time(), None))
    store.event("approval_requested", {"id": aid, "class": cls, "tool": tool, "reason": reason})
    return dict(store.conn().execute("SELECT * FROM approvals WHERE id = ?", (aid,)).fetchone())


def decide(aid, approve: bool, with_change=False):
    """Approve or deny a pending call. The change is one conditional UPDATE, so of two clicks in the same second
    (two tabs, a double click) exactly one changes the row; `with_change=True` also returns whether THIS call
    changed it, and only that call may launch the work (enhancement plan B8)."""
    row = store.conn().execute("SELECT * FROM approvals WHERE id = ?", (aid,)).fetchone()
    if not row:
        raise KeyError(aid)
    status = "approved" if approve else "denied"
    cur = store.conn().execute("UPDATE approvals SET status = ?, decided = ? WHERE id = ? AND status = 'pending'",
                               (status, time.time(), aid))
    changed = cur.rowcount == 1
    if changed:
        store.event("approval_" + status, {"id": aid, "tool": row["tool"]})
    out = dict(store.conn().execute("SELECT * FROM approvals WHERE id = ?", (aid,)).fetchone())
    return (out, changed) if with_change else out


def status_for(tool, args):
    """'approved', 'denied', 'pending' or None for this exact call."""
    row = store.conn().execute("SELECT status FROM approvals WHERE args_hash = ? ORDER BY created DESC LIMIT 1",
                               (call_hash(tool, args),)).fetchone()
    return row["status"] if row else None


def pending():
    return [dict(r) for r in store.conn().execute("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created")]
