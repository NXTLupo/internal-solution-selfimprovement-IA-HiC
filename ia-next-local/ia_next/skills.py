"""Self-improvement behind a held-out gate (plan 6.6; Hermes and OpenClaw's failures in 3.5).

A specialist's instructions are a versioned skill. Edits, whether the person's or the system's, are
CANDIDATES and never take effect on write. A candidate moves only through:
  1. a lint (no em-dash, within size, keeps the rules every version must keep);
  2. an evaluation on held-out past work: for each finished research task in the held-out split, the
     Writer runs with the incumbent and with the candidate on the same findings, and both drafts go
     through the deterministic rung and the cross-vendor judge. The candidate passes only if it scores
     at least as well on every case and better on average. Running it spends, so it needs approval;
  3. the person's promotion. Every version is kept; rolling back is promoting an earlier one.
Model-written skill edits gave no measured gain in the literature (plan 4.1), so nothing here
proposes edits on its own. Since the uplift plan of 23 Nov, improve.py drafts candidates from repeated scorecard
failures and the owner's rejections; they pass through exactly this gate (lint, approved held-out evaluation, the
owner's promotion), so a model-written edit that does not measure better never takes effect.
"""
import json
import re
import threading
import time

from . import config, control, providers, store, verify

SCHEMA = """CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY, skill TEXT, version INTEGER, text TEXT, status TEXT, reason TEXT, created REAL, eval_json TEXT)"""

# One governed expert skill per creator (plan Part 8, P7). Each entry names the default instructions in code (the
# seed), the reply schema its builder asks for, and the rules every version must keep. A builder reads the ACTIVE
# version through active_text(), and records the exact message it sent (record_prompt), so a candidate is evaluated
# by replaying held-out messages under the incumbent and the candidate (evaluate below).
REGISTRY = {
    "writer": {"seed": ("studio", "WRITER_SYSTEM"), "schema": None, "keep": ["cite", "quote", "em-dash"]},
    # (harness WS-H10, 26 Nov) IA Next Local's writer: the model writes JSON blocks naming its evidence and code inserts the
    # quotes (localwriter.py). It read no governed skill, so a promoted "writer" version never reached a local report.
    "local_writer": {"seed": ("localwriter", "SYSTEM"), "schema": None, "keep": ["evidence", "quote", "em-dash"]},
    "local_journey": {"seed": ("journeymap", "SYSTEM"), "schema": None, "keep": ["verbatim", "quote", "evidence"]},
    "deck_composer": {"seed": ("deckstudio", "SYSTEM"), "schema": ("deckstudio", "SCHEMA"), "keep": ["quote", "em-dash"]},
    "prototyper": {"seed": ("prototype", "PROTOTYPER_SYSTEM"), "schema": None, "keep": ["brand", "screen", "em-dash"]},
    "creative_director": {"seed": ("prototype", "DIRECTOR_SYSTEM"), "schema": ("prototype", "DIRECTION_SCHEMA"), "keep": ["brand", "screen"]},
    "journey_cartographer": {"seed": ("journey", "JOURNEY_SYSTEM"), "schema": ("journey", "JOURNEY_SCHEMA"), "keep": ["verbatim", "quote"]},
    "social_analyst": {"seed": ("social", "ANALYST_SYSTEM"), "schema": ("social", "SOCIAL_SCHEMA"), "keep": ["quote"]},
    "transcript_analyst": {"seed": ("transcripts", "ANALYST_SYSTEM"), "schema": ("transcripts", "TRANSCRIPT_FINDINGS_SCHEMA"), "keep": ["quote", "verbatim"]},
    "theme_namer": {"seed": ("themes", "NAMER_SYSTEM"), "schema": ("themes", "NAME_SCHEMA"), "keep": ["quote"]},
    # The studio outputs (plan Part 6: S8 infographic and S4 mind map, S7 data table, S1 audio overview).
    "information_designer": {"seed": ("diagram", "DESIGNER_SYSTEM"), "schema": ("diagram", "SPEC_SCHEMA"), "keep": ["quote", "pointer"]},
    "table_analyst": {"seed": ("datatable", "TABLE_SYSTEM"), "schema": ("datatable", "TABLE_SCHEMA"), "keep": ["quote", "pointer"]},
    "audio_producer": {"seed": ("audio", "SCRIPT_SYSTEM"), "schema": ("audio", "SCRIPT_SCHEMA"), "keep": ["quote", "pointer"]},
}
EDITABLE = set(REGISTRY)
MUST_KEEP = {k: v["keep"] for k, v in REGISTRY.items()}


def _attr(ref):
    import importlib
    return getattr(importlib.import_module(f"ia_next.{ref[0]}"), ref[1]) if ref else None


def default_text(skill):
    return _attr(REGISTRY[skill]["seed"])


def seed_all():
    for k in REGISTRY:
        seed(k, default_text(k))


def record_prompt(eid, tid, skill, model, msg, max_tokens, effort):
    """Keep the exact message a builder sent, so a candidate skill can be evaluated on it later. Never breaks a build."""
    if not (eid and tid and skill in REGISTRY):
        return
    try:
        import os
        p = store.safe_path(eid, f"results/tasks/{tid}/prompts/{skill}.json")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"skill": skill, "task_id": tid, "model": model, "msg": msg, "max_tokens": max_tokens,
                       "effort": effort, "at": time.time()}, fh, ensure_ascii=False)
    except Exception:
        pass


def prompt_cases(skill, limit=5):            # uplift plan WS-1 step 4: at least five held-out cases per kind
    """Recorded messages of finished tasks for `skill`, oldest first: the held-out split for a candidate."""
    import os
    out = []
    for r in store.conn().execute("SELECT id, engagement_id FROM tasks WHERE status = 'done' ORDER BY created").fetchall():
        try:
            p = store.safe_path(r["engagement_id"], f"results/tasks/{r['id']}/prompts/{skill}.json")
        except Exception:
            continue
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as fh:
                out.append(dict(json.load(fh), engagement_id=r["engagement_id"]))
        if len(out) >= limit:
            break
    return out


def _reply_text(raw):
    """The words of a reply for scoring: the string values of a JSON reply, or the visible text of HTML."""
    try:
        data = providers.parse_json(raw)
        parts = []

        def walk(x):
            if isinstance(x, str):
                parts.append(x)
            elif isinstance(x, dict):
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(data)
        return "\n".join(parts)
    except ValueError:
        from .artifacts import visible_text
        return visible_text(raw)


def _db():
    c = store.conn()
    c.execute(SCHEMA)
    return c


def seed(skill, default_text):
    if not _db().execute("SELECT 1 FROM skill_versions WHERE skill = ?", (skill,)).fetchone():
        _db().execute("INSERT INTO skill_versions VALUES (?,?,?,?,?,?,?,?)",
                      (store.new_id("skill"), skill, 1, default_text, "active", "seed", time.time(), None))


CANARY_EVERY = 3                              # (WS-H9) a canary version serves one call in three
CANARY_MIN_TASKS = 3


def active_text(skill, default_text):
    seed(skill, default_text)
    r = _db().execute("SELECT text, version FROM skill_versions WHERE skill = ? AND status = 'active' ORDER BY version DESC LIMIT 1", (skill,)).fetchone()
    can = _db().execute("SELECT text, version, created FROM skill_versions WHERE skill = ? AND status = 'canary' ORDER BY version DESC LIMIT 1", (skill,)).fetchone()
    canary = False
    if can:                                   # Uber: canary a skill change before it serves everyone
        served = store.conn().execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'skill_used' AND json_extract(data, '$.skill') = ? "
                                      "AND ts >= ?", (skill, can["created"])).fetchone()["n"]
        if served % CANARY_EVERY == 0:
            r, canary = can, True
    try:                                      # the live view shows the skill on the step that loaded it; never blocks the work
        tid, eid = store.current_task()
        if tid:
            store.event("skill_used", {"skill": skill, "version": r["version"] if r else 0, "canary": canary,
                                       "chosen_by": "code", "kind": "specialist"}, eid, tid)
    except Exception:
        pass
    return r["text"] if r else default_text


def _served_tasks(skill, version, since):
    rows = store.conn().execute("SELECT DISTINCT task_id FROM events WHERE kind = 'skill_used' AND task_id IS NOT NULL AND ts >= ? "
                                "AND json_extract(data, '$.skill') = ? AND json_extract(data, '$.version') = ?", (since, skill, version))
    return [r["task_id"] for r in rows]


def _outcome(tids):
    """(mean hard check failures, rejections) over finished tasks."""
    from . import scorecard
    fails, rejects, n = 0, 0, 0
    for tid in tids:
        t = store.get_task(tid)
        if not t or t.get("status") != "done":
            continue
        n += 1
        sc = scorecard.read(t) or {}
        fails += len(sc.get("hard_failed") or [])
        rejects += store.conn().execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'task_feedback' AND task_id = ? "
                                        "AND json_extract(data, '$.verdict') = 'reject'", (tid,)).fetchone()["n"]
    return (fails / n if n else None), rejects, n


def review_canaries():
    """Each canary that has shaped enough finished work is kept (made active) when its work is no worse than the active
    version's over the same period, on hard check failures and the owner's rejections; otherwise it is retired. Called
    by the idle pass. Returns the decisions."""
    out = []
    for c in _db().execute("SELECT * FROM skill_versions WHERE status = 'canary'").fetchall():
        act = _db().execute("SELECT version FROM skill_versions WHERE skill = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
                            (c["skill"],)).fetchone()
        cf, cr, cn = _outcome(_served_tasks(c["skill"], c["version"], c["created"]))
        if cn < CANARY_MIN_TASKS:
            continue
        af, ar, an = _outcome(_served_tasks(c["skill"], act["version"], c["created"])) if act else (None, 0, 0)
        keep = af is None or (cf <= af and (cr / cn) <= ((ar / an) if an else 0))
        if keep:
            _db().execute("UPDATE skill_versions SET status = 'retired' WHERE skill = ? AND status = 'active'", (c["skill"],))
            _db().execute("UPDATE skill_versions SET status = 'active' WHERE id = ?", (c["id"],))
        else:
            _db().execute("UPDATE skill_versions SET status = 'retired' WHERE id = ?", (c["id"],))
        d = {"skill": c["skill"], "version": c["version"], "kept": keep, "canary_tasks": cn, "canary_failures": cf,
             "active_failures": af, "canary_rejections": cr, "active_rejections": ar}
        store.event("skill_canary_reviewed", d)
        out.append(d)
    return out


def versions(skill):
    return [dict(r) for r in _db().execute("SELECT id, skill, version, status, reason, created, eval_json FROM skill_versions WHERE skill = ? ORDER BY version", (skill,))]


def lint(skill, text):
    why = []
    if skill not in EDITABLE:
        why.append(f"skill {skill} is not editable")
    if "\u2014" in text:
        why.append("contains an em-dash")
    top = max(6000, int(1.5 * len(default_text(skill) or ""))) if skill in REGISTRY else 6000
    if not 200 <= len(text) <= top:
        why.append(f"length must be 200 to {top:,} characters")
    for k in MUST_KEEP.get(skill, []):
        if k not in text.lower():
            why.append(f"drops the required rule about '{k}'")
    return why


def propose(skill, text, reason):
    why = lint(skill, text)
    if why:
        return {"accepted": False, "why": why}
    v = (_db().execute("SELECT MAX(version) m FROM skill_versions WHERE skill = ?", (skill,)).fetchone()["m"] or 0) + 1
    sid = store.new_id("skill")
    _db().execute("INSERT INTO skill_versions VALUES (?,?,?,?,?,?,?,?)", (sid, skill, v, text, "candidate", reason, time.time(), None))
    store.event("skill_candidate", {"id": sid, "skill": skill, "version": v, "reason": reason})
    return {"accepted": True, "id": sid, "version": v, "status": "candidate"}


def held_out_cases(limit=2, exclude=()):
    """Finished research tasks, oldest first, as the held-out split: never the tasks whose failures the candidate was
    drafted from (harness WS-H10: the split used to include them, so a candidate was scored on its own training work)."""
    skip = set(exclude or ())
    rows = store.conn().execute("SELECT * FROM tasks WHERE kind = 'research_report' AND status = 'done' ORDER BY created").fetchall()
    return [dict(r) for r in rows if r["id"] not in skip][:limit]


def drafted_from(cand):
    """The task ids a candidate was drafted from, as recorded in its reason ("...; tasks: t1, t2")."""
    m = re.search(r"tasks:\s*([A-Za-z0-9_,\s]+)$", str(cand["reason"] if not isinstance(cand, dict) else cand.get("reason") or ""))
    return [t.strip() for t in m.group(1).split(",") if t.strip()] if m else []


# (harness WS-H15, from the Uber article) Two identical runs differ. The incumbent is run a second time on each case and
# the mean difference between its two scores is the noise band; a candidate passes only when it is never worse on a case
# and better on average by more than that band. Without it, a candidate could pass on run-to-run noise alone.
NOISE_RUNS = True


def _verdict(results):
    """(passed, noise band, mean gain) from rows {incumbent, candidate, incumbent_again?}."""
    if not results:
        return False, 0.0, 0.0
    again = [abs(r["incumbent"] - r["incumbent_again"]) for r in results if "incumbent_again" in r]
    noise = round(sum(again) / len(again), 4) if again else 0.0
    gain = round(sum(r["candidate"] - r["incumbent"] for r in results) / len(results), 4)
    passed = all(r["candidate"] >= r["incumbent"] for r in results) and gain > noise
    return passed, noise, gain


def evaluate(candidate_id, writer_fn, cases=None, ledger=None):
    """Score incumbent and candidate on the held-out cases. `writer_fn(eid, brief, findings, sources, ledger, system)`
    returns (text, model). Needs a spend approval for this exact evaluation."""
    cand = _db().execute("SELECT * FROM skill_versions WHERE id = ?", (candidate_id,)).fetchone()
    if not cand or cand["status"] != "candidate":
        return {"error": "no such candidate"}
    spec = {"evaluate_skill": candidate_id}
    if control.status_for("evaluate_skill", spec) != "approved":
        a = control.request("spend", "evaluate_skill", spec, f"Evaluate {cand['skill']} v{cand['version']} on held-out work")
        return {"approval": a["status"], "approval_id": a["id"]}
    if cand["skill"] not in ("writer", "local_writer"):
        return _evaluate_replay(cand, cases, ledger)
    incumbent = active_text(cand["skill"], default_text(cand["skill"]))
    ledger = ledger or providers.Ledger(limit_usd=4.0)
    results = []
    for t in (cases if cases is not None else held_out_cases(exclude=drafted_from(cand))):
        eid, brief = t["engagement_id"], json.loads(t["brief"]) if isinstance(t["brief"], str) else t["brief"]
        findings = json.load(open(store.safe_path(eid, "results/findings.json"), encoding="utf-8"))["findings"]
        sources = json.load(open(store.safe_path(eid, "results/sources.json"), encoding="utf-8"))["sources"]
        row = {"task": t["id"]}
        runs = (("incumbent", incumbent), ("candidate", cand["text"])) + ((("incumbent_again", incumbent),) if NOISE_RUNS else ())
        for label, system in runs:
            with providers.seed_as(8 if label == "incumbent_again" else 7):   # the noise band is variation across seeds
                text, author = writer_fn(eid, brief, findings, sources, ledger, system)
                f = verify.deterministic(text, sources)
                v = verify.judge(text, brief, sources, author, ledger)
            row[label] = verify.score(f, v)
        results.append(row)
    passed, noise, gain = _verdict(results)
    ev = {"cases": results, "passed": passed, "noise_band": noise, "mean_gain": gain, "spent_usd": ledger.spent_usd, "at": time.time(),
          "model": config.SEATS["artifact"]["primary"]}             # (WS-H9) the model this version was judged on
    _db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(ev), candidate_id))
    store.event("skill_evaluated", {"id": candidate_id, "passed": passed})
    return ev


def _evaluate_replay(cand, cases=None, ledger=None):
    """A creator skill's held-out evaluation: each recorded message is sent again under the incumbent and under the
    candidate, on the same model and settings; both replies go through the deterministic rung and the cross-vendor
    judge against that engagement's sources. Same pass rule as the Writer: never worse on a case, better on average."""
    skill = cand["skill"]
    incumbent = active_text(skill, default_text(skill))
    schema = _attr(REGISTRY[skill]["schema"])
    ledger = ledger or providers.Ledger(limit_usd=6.0)
    results, models = [], []
    for c in (cases if cases is not None else prompt_cases(skill)):
        models.append(c.get("model") or "")
        try:
            sources = json.load(open(store.safe_path(c["engagement_id"], "results/sources.json"), encoding="utf-8"))["sources"]
        except (FileNotFoundError, ValueError):
            sources = []
        row = {"task": c.get("task_id")}
        for label, system in (("incumbent", incumbent), ("candidate", cand["text"])) + ((("incumbent_again", incumbent),) if NOISE_RUNS else ()):
            with providers.seed_as(8 if label == "incumbent_again" else 7):   # the noise band is variation across seeds
                raw, _, _ = providers.claude(c["model"], system, [{"role": "user", "content": c["msg"]}], ledger,
                                             max_tokens=int(c.get("max_tokens") or 16000), effort=c.get("effort") or "medium",
                                             json_schema=schema)
            text = _reply_text(raw)
            row[label] = verify.score(verify.deterministic(text, sources),
                                      verify.judge(text, {"goal": f"the {skill.replace('_', ' ')}'s output"}, sources, c["model"], ledger))
        results.append(row)
    passed, noise, gain = _verdict(results)
    ev = {"cases": results, "passed": passed, "noise_band": noise, "mean_gain": gain, "spent_usd": ledger.spent_usd, "at": time.time(),
          "model": max(set(models), key=models.count) if models else "",
          "note": "" if results else "no finished work of this kind has a recorded message yet"}
    _db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(ev), cand["id"]))
    store.event("skill_evaluated", {"id": cand["id"], "passed": passed})
    return ev


# ---- (harness WS-H9, from the Uber article) a skill's quality and the model it was judged on ---------------------------
def current_model(skill):
    """The model the skill's work runs on now: the writing seat for the writers, else the model of its newest recorded
    message."""
    if skill in ("writer", "local_writer", "local_journey"):
        return config.SEATS["artifact"]["primary"]
    try:
        cases = prompt_cases(skill)
    except Exception:
        cases = []
    return (cases[0].get("model") if cases else "") or ""


def quality(skill):
    """{version, held_out, evaluated_on, model_now, recheck, uses, accepted, rejected} for the active version: its
    held-out score (the candidate's mean when it was promoted), how often it shaped work, the owner's verdicts on that
    work, and whether the model changed since it was judged (Uber: skills are compiled per model and re-checked when the
    model changes)."""
    vs = versions(skill)
    act = next((v for v in reversed(vs) if v["status"] == "active"), None)
    if not act:
        return {"version": None}
    ev = json.loads(act.get("eval_json") or "{}")
    cases = ev.get("cases") or []
    held = round(sum(c.get("candidate", 0) for c in cases) / len(cases), 3) if cases else None
    c = store.conn()
    uses = c.execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'skill_used' AND json_extract(data, '$.skill') = ? "
                     "AND json_extract(data, '$.version') = ?", (skill, act["version"])).fetchone()["n"]
    tasks = [r["task_id"] for r in c.execute("SELECT DISTINCT task_id FROM events WHERE kind = 'skill_used' AND task_id IS NOT NULL "
                                             "AND json_extract(data, '$.skill') = ?", (skill,))]
    verdicts = {}
    if tasks:
        q = ",".join("?" * len(tasks))
        for r in c.execute(f"SELECT json_extract(data, '$.verdict') AS v, COUNT(*) AS n FROM events WHERE kind = 'task_feedback' "
                           f"AND task_id IN ({q}) GROUP BY v", tasks):
            verdicts[r["v"]] = r["n"]
    judged_on, now = ev.get("model") or "", current_model(skill)
    return {"version": act["version"], "held_out": held, "evaluated_on": judged_on, "model_now": now,
            "recheck": bool(judged_on and now and judged_on != now), "uses": uses,
            "accepted": verdicts.get("accept", 0), "rejected": verdicts.get("reject", 0)}


# ---- (harness WS-H9, Uber: compile per model; re-check when the model changes) ------------------------------------------
# A version is judged on a model. When the seat's model changes, or a version has never been judged, the idle pass scores
# the active version on the model its work runs on now: twice on each held-out case (the two scores give the noise band),
# against the score it earned when it was judged. The check measures; it never promotes or retires a version. A drop
# beyond the noise band files a papercut and an event, so the owner decides. Locally the cost is time on an idle machine.
RECHECK_CASES = 2
WRITER_SKILLS = ("writer", "local_writer", "local_journey")
_RECHECK_LOCK = threading.Lock()
RECHECK_PAUSE = {"until": 0.0}                # POST /api/skills/recheck/pause: a measurement or the owner holds the card


def recheck_paused():
    return time.time() < RECHECK_PAUSE["until"]


def pause_rechecks(minutes):
    RECHECK_PAUSE["until"] = time.time() + max(0.0, float(minutes)) * 60
    store.event("skill_recheck_paused", {"minutes": float(minutes)})
    return {"paused_until": RECHECK_PAUSE["until"]}


def _active_row(skill):
    return _db().execute("SELECT * FROM skill_versions WHERE skill = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
                         (skill,)).fetchone()


def recheck_due():
    """The skills whose active version needs a check on today's model: the model changed since it was judged (recheck),
    or it was never judged and has recorded work to replay (a baseline). Cheapest replies first."""
    due = []
    for skill in REGISTRY:
        try:
            q = quality(skill)
        except Exception:
            continue
        if q.get("version") is None:
            continue
        act = _active_row(skill)
        ev = json.loads((act["eval_json"] if act else None) or "{}")
        if q.get("recheck") or (not ev.get("model") and skill not in WRITER_SKILLS and prompt_cases(skill, limit=1)):
            due.append(skill)
    budget = {c.get("skill"): int(c.get("max_tokens") or 16000) for sk in due for c in prompt_cases(sk, limit=1)}
    return sorted(due, key=lambda sk: budget.get(sk, 99999))


def _score_writer(text, brief, sources, author, ledger):
    return verify.score(verify.deterministic(text, sources), verify.judge(text, brief, sources, author, ledger))


def recheck(skill, cases=None, ledger=None, idle=lambda: True, writer_fn=None, say=lambda line: None):
    """Score the active version of `skill` on the model its work runs on now (see the block comment). Returns the record,
    or {"skipped": why} / {"paused": True} when the person's work started between runs."""
    act = _active_row(skill)
    if not act:
        return {"skipped": "no active version"}
    ev = json.loads(act["eval_json"] or "{}")
    now, before = current_model(skill), ev.get("model") or ""
    ledger = ledger or providers.Ledger(limit_usd=6.0, purpose="skill_recheck")
    rows = []
    if skill in WRITER_SKILLS:
        if writer_fn is None:
            return {"skipped": "a writer is re-checked through its held-out reports, which need the writer function"}
        for t in (cases if cases is not None else held_out_cases(limit=RECHECK_CASES)):
            if not idle():
                return {"paused": True}
            eid, brief = t["engagement_id"], json.loads(t["brief"]) if isinstance(t["brief"], str) else t["brief"]
            findings = json.load(open(store.safe_path(eid, "results/findings.json"), encoding="utf-8"))["findings"]
            sources = json.load(open(store.safe_path(eid, "results/sources.json"), encoding="utf-8"))["sources"]
            row = {"task": t["id"]}
            for label in ("now", "now_again"):
                with providers.seed_as(7 if label == "now" else 8):       # the band is variation across seeds
                    text, author = writer_fn(eid, brief, findings, sources, ledger, act["text"])
                    row[label] = _score_writer(text, brief, sources, author, ledger)
            rows.append(row)
            say(f"case {len(rows)}: scored {row['now']:.2f}, then {row['now_again']:.2f} on the second run")
    else:
        schema = _attr(REGISTRY[skill]["schema"])
        for c in (cases if cases is not None else prompt_cases(skill, limit=RECHECK_CASES)):
            if not idle():
                return {"paused": True}
            try:
                sources = json.load(open(store.safe_path(c["engagement_id"], "results/sources.json"), encoding="utf-8"))["sources"]
            except (FileNotFoundError, ValueError):
                sources = []
            row = {"task": c.get("task_id")}
            for label in ("now", "now_again"):
                with providers.seed_as(7 if label == "now" else 8):       # the band is variation across seeds
                    raw, _, _ = providers.claude(now or c["model"], act["text"], [{"role": "user", "content": c["msg"]}], ledger,
                                                 max_tokens=int(c.get("max_tokens") or 16000), effort=c.get("effort") or "medium",
                                                 json_schema=schema)
                row[label] = verify.score(verify.deterministic(_reply_text(raw), sources),
                                          verify.judge(_reply_text(raw), {"goal": f"the {skill.replace('_', ' ')}'s output"},
                                                       sources, now or c["model"], ledger))
            rows.append(row)
            say(f"case {len(rows)}: scored {row['now']:.2f}, then {row['now_again']:.2f} on the second run")
    if not rows:
        return {"skipped": "no held-out work to score"}
    score_now = round(sum(r["now"] for r in rows) / len(rows), 4)
    noise = round(sum(abs(r["now"] - r["now_again"]) for r in rows) / len(rows), 4)
    judged = ev.get("cases") or []
    score_before = round(sum(c.get("candidate", 0) for c in judged) / len(judged), 4) if judged else None
    holds = score_before is None or score_now >= score_before - noise
    say(f"{score_now:.2f} on {now}" + (f" against {score_before:.2f} when judged, noise band {noise:.2f}: "
                                         + ("holds" if holds else "dropped") if score_before is not None
                                         else f", recorded as this version's baseline (noise band {noise:.2f})"))
    rec = {"model": now, "against": before, "score": score_now, "score_before": score_before, "noise_band": noise,
           "holds": holds, "baseline": score_before is None, "at": time.time(), "cases": rows}
    ev.setdefault("model_checks", []).append(rec)
    if holds:
        ev["model"] = now                     # judged on today's model now: the recheck flag clears
    _db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(ev), act["id"]))
    store.event("skill_model_checked", {"skill": skill, "version": act["version"], **{k: rec[k] for k in
                ("model", "against", "score", "score_before", "noise_band", "holds", "baseline")}})
    if not holds:
        from . import papercuts
        papercuts.file(f"skill {skill}", f"re-checked version {act['version']} on {now}",
                       f"at least {score_before - noise:.2f} (its judged score less the noise band)",
                       f"scored {score_now:.2f} on {now}, against {score_before:.2f} when judged on {before or 'an earlier model'}",
                       fix="evaluate a candidate written for this model, or move the seat back", filed_by="skill recheck")
    return rec


def run_recheck(skill, idle=lambda: True, writer_fn=None):
    """The re-check as a task with a visible stage (the owner's rule: every loop step shows in the page)."""
    from . import dreaming
    eid = dreaming._engagement()
    model = current_model(skill) or "the seat's model"
    tid, _ = store.create_task(eid, "skill_check", {"goal": f"re-check the {skill.replace('_', ' ')} skill on {model}", "skill": skill},
                               0.0, idem_key=f"recheck-{skill}-{int(time.time())}")
    store.update_task(tid, status="running")
    try:
        with store.stage(tid, f"Scoring the {skill.replace('_', ' ')} skill on today's model", model) as st:
            rec = recheck(skill, idle=idle, writer_fn=writer_fn, say=st.say)
        if rec.get("paused"):
            summary = "Paused for your work; it runs again when the machine is idle"
        elif rec.get("skipped"):
            summary = "Not checked: " + rec["skipped"]
        elif rec.get("baseline"):
            summary = f"Baseline recorded: {rec['score']:.2f} on {rec['model']} (noise band {rec['noise_band']:.2f})"
        else:
            summary = (f"{'Holds' if rec['holds'] else 'Dropped'}: {rec['score']:.2f} on {rec['model']} against "
                       f"{rec['score_before']:.2f} when judged (noise band {rec['noise_band']:.2f})"
                       + ("" if rec["holds"] else "; a papercut is filed for you"))
        store.update_task(tid, status="done", summary=summary)
        return dict(rec, task_id=tid)
    except Exception as e:
        store.update_task(tid, status="failed", error=f"{type(e).__name__}: {str(e)[:300]}")
        raise


def recheck_pass(idle):
    """(Idle pass) re-check one due skill in the background, at most one at a time. Returns the skill started or None."""
    if recheck_paused():
        return None
    due = recheck_due()
    if not due or not idle() or not _RECHECK_LOCK.acquire(blocking=False):
        return None

    def go(skill):
        try:
            writer_fn = None
            if skill in WRITER_SKILLS:
                from . import studio
                writer_fn = lambda eid, brief, f, s_, led, system: studio.writer(eid, brief, f, s_, led, system=system)
            run_recheck(skill, idle=lambda: idle() and not recheck_paused(), writer_fn=writer_fn)
        except Exception as e:
            store.event("scheduler_error", {"error": f"skill recheck {skill}: {str(e)[:240]}"})
        finally:
            _RECHECK_LOCK.release()
    threading.Thread(target=go, args=(due[0],), daemon=True, name=f"skill-recheck-{due[0]}").start()
    return due[0]


def promote(version_id, canary=False):
    """The person's decision. A candidate needs a passing evaluation; any earlier version may be restored. With canary,
    the version serves one call in CANARY_EVERY first and the idle pass keeps or retires it (review_canaries)."""
    r = _db().execute("SELECT * FROM skill_versions WHERE id = ?", (version_id,)).fetchone()
    if not r:
        return {"error": "no such version"}
    if r["status"] == "candidate":
        ev = json.loads(r["eval_json"] or "{}")
        if not ev.get("passed"):
            return {"error": "the candidate has not passed its held-out evaluation"}
    if canary:
        _db().execute("UPDATE skill_versions SET status = 'retired' WHERE skill = ? AND status = 'canary'", (r["skill"],))
        _db().execute("UPDATE skill_versions SET status = 'canary', created = ? WHERE id = ?", (time.time(), version_id))
        store.event("skill_canary", {"id": version_id, "skill": r["skill"], "version": r["version"]})
        return {"canary": version_id, "skill": r["skill"], "version": r["version"]}
    _db().execute("UPDATE skill_versions SET status = 'retired' WHERE skill = ? AND status = 'active'", (r["skill"],))
    _db().execute("UPDATE skill_versions SET status = 'active' WHERE id = ?", (version_id,))
    store.event("skill_promoted", {"id": version_id, "skill": r["skill"], "version": r["version"]})
    return {"promoted": version_id, "skill": r["skill"], "version": r["version"]}
