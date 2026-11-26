"""The self-improvement loop, closed (uplift plan 2026-11-23, WS-1 step 4).

Until now the parts existed and nothing connected them: skills could be proposed, evaluated on held-out work and
promoted, but no failure ever turned into a proposal; every defect the owner found between 19 and 23 Nov was fixed by
hand. Here, every few finished tasks, the failures are grouped:

  - the scorecard's failed checks (scorecard.py), per kind and check name;
  - the owner's rejections with their words (POST /api/tasks/{tid}/feedback).

A group the instructions of a governed skill can fix (a quote not found in the sources, a repeated slide, a rejection
in the owner's words) becomes a candidate edit drafted by the artifact model and proposed through skills.propose; its
held-out evaluation waits for the owner's approval card, and promotion stays the owner's decision (skills.py rules).
A group only code can fix (a slide that overflows, text under 10 pt, footnotes left open) becomes an attention item
naming the check and examples. Nothing is promoted or changed without the owner.
"""
import json
import threading
import time

from . import config, providers, store

EVERY_TASKS = 10                  # run after this many newly scored tasks
MIN_GROUP = 2                     # a failure seen once is noise; twice is a pattern
WINDOW_DAYS = 21
SKILL_FOR_KIND = {"deck": "deck_composer", "journey_map": "journey_cartographer", "diagram": "information_designer",
                  "datatable": "table_analyst", "audio_overview": "audio_producer", "social": "social_analyst",
                  "themes": "theme_namer", "research_report": "writer", "transcript": "transcript_analyst"}
# checks a change to a skill's instructions can fix; every other failed check needs code
PROMPT_FIXABLE = {"quotes_in_sources", "no_repeated_slides", "owner_rejected"}
_LOCK = threading.Lock()

DRAFT_SYSTEM = ("You revise the instructions of one specialist in a research studio. You receive its current instructions and "
                "the failures seen in its recent work. Return the complete revised instructions: keep every existing rule and "
                "its wording, and add at most three short sentences, each preventing one failure listed. Plain words, no "
                "em-dash characters, no markdown. Return only the instructions.")


def _prefs():
    c = store.conn()
    c.execute("CREATE TABLE IF NOT EXISTS prefs (k TEXT PRIMARY KEY, v TEXT)")
    return c


def _get(k, default=""):
    r = _prefs().execute("SELECT v FROM prefs WHERE k = ?", (k,)).fetchone()
    return r["v"] if r else default


def _set(k, v):
    _prefs().execute("INSERT OR REPLACE INTO prefs (k, v) VALUES (?, ?)", (k, str(v)))


# Field test 23 Nov (H): the loop learned only from hard checks and rejections. A deck that failed outright, a report
# that took 55 minutes and a collection built on weak sources taught it nothing. Three more signals feed it now: a task
# that failed (with its error), a task that ran past its bar, and a soft check that did not pass.
TOO_LONG_SECONDS = {"research_report": 900, "themes": 600, "deck": 900, "journey_map": 600, "audio_overview": 600,
                    "prototype": 900, "artifact": 900, "diagram": 600}
TOO_LONG_DEFAULT = 1200


def groups(since=None):
    """{(kind, check): {"tasks": [...], "details": [...]}} from the scorecard and feedback events of the window, the
    tasks that failed, and the tasks that ran past their bar."""
    since = since if since is not None else time.time() - WINDOW_DAYS * 86400
    rows = store.conn().execute("SELECT e.kind AS ek, e.data AS data, e.task_id AS tid, t.kind AS tk FROM events e "
                                "LEFT JOIN tasks t ON t.id = e.task_id WHERE e.kind IN ('scorecard', 'task_feedback') AND e.ts >= ?",
                                (since,)).fetchall()
    extra = {}
    try:
        for t in store.conn().execute("SELECT id, kind, status, created, updated, error FROM tasks WHERE created >= ?", (since,)):
            took = (t["updated"] or 0) - (t["created"] or 0)
            if t["status"] == "failed":
                g = extra.setdefault((t["kind"], "task_failed"), {"tasks": [], "details": []})
                g["tasks"].append(t["id"])
                if t["error"]:
                    g["details"].append(str(t["error"])[:300])
            elif t["status"] == "done" and took > TOO_LONG_SECONDS.get(t["kind"], TOO_LONG_DEFAULT):
                g = extra.setdefault((t["kind"], "took_too_long"), {"tasks": [], "details": []})
                g["tasks"].append(t["id"])
                g["details"].append(f"ran {round(took / 60)} minutes against a bar of {round(TOO_LONG_SECONDS.get(t['kind'], TOO_LONG_DEFAULT) / 60)}")
    except Exception:
        extra = {}
    out = {}
    for r in rows:
        try:
            d = json.loads(r["data"] or "{}")
        except ValueError:
            continue
        kind = r["tk"] or d.get("kind") or "unknown"
        if r["ek"] == "scorecard":
            for check in list(d.get("hard_failed") or []) + list(d.get("soft_failed") or []):
                g = out.setdefault((kind, check), {"tasks": [], "details": []})
                g["tasks"].append(r["tid"])
        elif d.get("verdict") == "reject":
            g = out.setdefault((kind, "owner_rejected"), {"tasks": [], "details": []})
            g["tasks"].append(r["tid"])
            if d.get("text"):
                g["details"].append(str(d["text"])[:400])
    for key, g in extra.items():
        have = out.setdefault(key, {"tasks": [], "details": []})
        have["tasks"] += g["tasks"]
        have["details"] += g["details"]
    for g in out.values():
        g["tasks"] = list(dict.fromkeys(t for t in g["tasks"] if t))
    return out


def _details(kind, check, tasks):
    """The failing checks' own words from the saved scorecards (up to five)."""
    from . import scorecard
    said = []
    for tid in tasks[:5]:
        sc = scorecard.read(store.get_task(tid) or {})
        for c in (sc or {}).get("checks") or []:
            if c.get("name") == check and not c.get("passed"):
                said.append(c.get("detail") or "")
    return said


def draft(skill, failures, call=None):
    """A candidate revision of a governed skill's instructions from the failures listed (the artifact model)."""
    from . import skills
    call = call or providers.claude
    current = skills.active_text(skill, skills.default_text(skill))
    msg = (f"<instructions>\n{current}\n</instructions>\n\n<failures>\n" + "\n".join(f"- {f}" for f in failures[:8])
           + "\n</failures>\n\nReturn the complete revised instructions.")
    text, _, _ = call(config.SEATS["artifact"]["primary"], DRAFT_SYSTEM, [{"role": "user", "content": msg}],
                      providers.Ledger(limit_usd=1.0, purpose="improve"), max_tokens=6000, effort="medium")
    return str(text or "").strip()


def run(call=None, now=None):
    """One pass of the loop. Returns {proposed: [...], attention: [...], skipped: [...]}; never raises."""
    from . import control, skills
    result = {"proposed": [], "attention": [], "skipped": []}
    with _LOCK:
        try:
            for (kind, check), g in sorted(groups().items()):
                if len(g["tasks"]) < MIN_GROUP:
                    continue
                sig = f"improve:{kind}:{check}:{len(g['tasks'])}"
                if _get(sig):
                    result["skipped"].append({"kind": kind, "check": check, "why": "already handled at this count"})
                    continue
                skill = SKILL_FOR_KIND.get(kind)
                details = g["details"] or _details(kind, check, g["tasks"])
                if check in PROMPT_FIXABLE and skill:
                    text = draft(skill, [f"{check}: {d}" for d in details] or [check], call)
                    got = skills.propose(skill, text, f"from {len(g['tasks'])} {kind} tasks failing {check}")
                    if got.get("accepted"):
                        a = control.request("spend", "evaluate_skill", {"evaluate_skill": got["id"]},
                                            f"Evaluate {skill} v{got['version']} on held-out work: drafted from {len(g['tasks'])} "
                                            f"{kind} tasks failing {check.replace('_', ' ')}")
                        result["proposed"].append({"skill": skill, "candidate": got["id"], "approval": a.get("id"), "check": check})
                    else:
                        result["skipped"].append({"kind": kind, "check": check, "why": "; ".join(got.get("why") or [])})
                else:
                    store.event("attention_item", {"kind": kind, "check": check, "tasks": g["tasks"][:8], "examples": details[:3],
                                                   "why": "a code change is needed" if check not in PROMPT_FIXABLE else
                                                   "no governed skill writes this kind"})
                    result["attention"].append({"kind": kind, "check": check, "tasks": len(g["tasks"])})
                _set(sig, now or time.time())
            store.event("improve_pass", {k: len(v) for k, v in result.items()})
        except Exception as e:                     # the loop never breaks the work it watches
            result["error"] = f"{type(e).__name__}: {str(e)[:200]}"
    return result


def maybe_run():
    """Called after each scorecard: runs the loop in the background once EVERY_TASKS new tasks have been scored."""
    try:
        last = int(_get("improve:last_event", "0") or 0)
        n = store.conn().execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'scorecard' AND id > ?", (last,)).fetchone()["n"]
        if n < EVERY_TASKS:
            return False
        top = store.conn().execute("SELECT MAX(id) AS m FROM events").fetchone()["m"] or 0
        _set("improve:last_event", top)
        threading.Thread(target=run, daemon=True, name="improve").start()
        return True
    except Exception:
        return False
