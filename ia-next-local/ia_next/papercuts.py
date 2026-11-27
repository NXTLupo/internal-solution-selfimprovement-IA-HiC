"""Papercuts: friction reported where it happens (harness WS-H13, 26 Nov; Uber's "log-papercut" skill).

Uber's agents file a report whenever something gets in their way: what was tried, what was expected, what happened and
what would fix it. All reports land in one place, grouped by skill or tool, and move through a lifecycle (new,
triaged, fixed, verified); a fixed papercut becomes an evaluation case so it stays fixed.

Here the agent has an always-available `log_papercut` tool, and IA Next's own specialists file one when they recover
from friction a person would want fixed: a source the site refused, a model swapped for another, a pack source that
answered nothing, YouTube refusing requests. Reports with the same group key (where plus a normalised reason) are
counted together rather than repeated. Dreaming (dreaming.py) reads them; the page lists them, grouped.
"""
import json
import re
import time

from . import store

STATES = ("new", "triaged", "fixed", "verified", "wont_fix")


def _table(c):
    c.execute("CREATE TABLE IF NOT EXISTS papercuts (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, area TEXT, tried TEXT, "
              "expected TEXT, happened TEXT, fix TEXT, state TEXT, count INTEGER, first REAL, last REAL, traces TEXT, filed_by TEXT)")


def group_key(area, happened):
    """Where it happened plus the reason with its particulars (numbers, addresses, ids) taken out."""
    reason = re.sub(r"https?://\S+", "<url>", str(happened or "").lower())
    reason = re.sub(r"\b[0-9a-f]{8,}\b|\d+(\.\d+)?", "#", reason)
    reason = " ".join(re.sub(r"[^a-z#<> ]", " ", reason).split())[:120]
    return f"{str(area or 'general').strip().lower()}|{reason}"


def file(area, tried, expected, happened, fix="", filed_by="ia-next"):
    """Record one papercut, or count it on the open papercut with the same group key. Never raises. Returns its id."""
    try:
        c = store.conn()
        key = group_key(area, happened)
        tr = store.TRACE.get()
        with store._LOCK:
            _table(c)
            row = c.execute("SELECT id, traces, state FROM papercuts WHERE key = ?", (key,)).fetchone()
            if row:
                traces = json.loads(row["traces"] or "[]")
                if tr and tr not in traces:
                    traces = (traces + [tr])[-20:]
                state = "new" if row["state"] in ("fixed", "verified") else row["state"]     # a fixed one that recurs reopens
                c.execute("UPDATE papercuts SET count = count + 1, last = ?, traces = ?, state = ? WHERE id = ?",
                          (time.time(), json.dumps(traces), state, row["id"]))
                pid = row["id"]
            else:
                cur = c.execute("INSERT INTO papercuts (key, area, tried, expected, happened, fix, state, count, first, last, traces, filed_by) "
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                                (key, str(area)[:80], str(tried)[:500], str(expected)[:500], str(happened)[:800], str(fix)[:500], "new", 1,
                                 time.time(), time.time(), json.dumps([tr] if tr else []), filed_by))
                pid = cur.lastrowid
        store.event("papercut_filed", {"id": pid, "area": area, "happened": str(happened)[:200], "by": filed_by})
        return pid
    except Exception:
        return None


def grouped(state=None, limit=100):
    """Open papercuts, most frequent first: [{id, area, tried, expected, happened, fix, state, count, first, last, traces}]."""
    c = store.conn()
    _table(c)
    q = "SELECT * FROM papercuts" + (" WHERE state = ?" if state else " WHERE state NOT IN ('verified', 'wont_fix')") + " ORDER BY count DESC, last DESC LIMIT ?"
    rows = c.execute(q, ((state, int(limit)) if state else (int(limit),))).fetchall()
    return [dict(r) | {"traces": json.loads(r["traces"] or "[]")} for r in rows]


def set_state(pid, state):
    if state not in STATES:
        raise ValueError(f"state is one of {', '.join(STATES)}")
    c = store.conn()
    _table(c)
    with store._LOCK:
        c.execute("UPDATE papercuts SET state = ? WHERE id = ?", (state, int(pid)))
    store.event("papercut_state", {"id": int(pid), "state": state})
    return {"id": int(pid), "state": state}


STR = {"type": "string"}
TOOLS = [
    {"name": "log_papercut", "strict": False,
     "description": ("Report friction you hit while working, so it gets fixed: a tool that failed or returned nothing useful, a "
                     "source that refused, an instruction that did not fit, a step that took far too long. Say what you tried, what "
                     "you expected, what happened and what would fix it. Use it whenever something got in your way, without being "
                     "asked; keep working afterwards. It does not reply to the person."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["area", "tried", "expected", "happened"],
                      "properties": {"area": STR, "tried": STR, "expected": STR, "happened": STR, "fix": STR}}},
]


def execute(name, args):
    if name != "log_papercut":
        return {"error": f"unknown tool {name}"}
    pid = file(args.get("area") or "general", args.get("tried") or "", args.get("expected") or "", args.get("happened") or "",
               args.get("fix") or "", filed_by="agent")
    return {"filed": bool(pid), "papercut": pid, "note": "Recorded; carry on with the person's request."}


def workaround(tool):
    """(harness WS-H13, from the Uber article: agents look up each other's workarounds) The fix recorded on a papercut
    filed against this tool, most frequent first, or "" when there is none."""
    try:
        for p in grouped(limit=200):
            if str(p.get("area") or "").strip().lower() == str(tool or "").strip().lower() and str(p.get("fix") or "").strip():
                return f"A known problem with {tool}: {p['happened'][:160]}. What works: {p['fix'][:240]}"
    except Exception:
        pass
    return ""


def workaround_hook(name, args):
    from . import hooks
    note = workaround(name)
    return hooks.Context(note) if note else hooks.ALLOW
