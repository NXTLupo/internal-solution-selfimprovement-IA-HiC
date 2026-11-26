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


def active_text(skill, default_text):
    seed(skill, default_text)
    r = _db().execute("SELECT text, version FROM skill_versions WHERE skill = ? AND status = 'active' ORDER BY version DESC LIMIT 1", (skill,)).fetchone()
    try:                                      # the live view shows the skill on the step that loaded it; never blocks the work
        from . import store
        tid, eid = store.current_task()
        if tid:
            store.event("skill_used", {"skill": skill, "version": r["version"] if r else 0}, eid, tid)
    except Exception:
        pass
    return r["text"] if r else default_text


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


def held_out_cases(limit=2):
    """Finished research tasks, oldest first, as the held-out split (they were not used to write the candidate)."""
    rows = store.conn().execute("SELECT * FROM tasks WHERE kind = 'research_report' AND status = 'done' ORDER BY created LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


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
    if cand["skill"] != "writer":
        return _evaluate_replay(cand, cases, ledger)
    from . import studio
    incumbent = active_text(cand["skill"], studio.WRITER_SYSTEM)
    ledger = ledger or providers.Ledger(limit_usd=4.0)
    results = []
    for t in (cases if cases is not None else held_out_cases()):
        eid, brief = t["engagement_id"], json.loads(t["brief"]) if isinstance(t["brief"], str) else t["brief"]
        findings = json.load(open(store.safe_path(eid, "results/findings.json"), encoding="utf-8"))["findings"]
        sources = json.load(open(store.safe_path(eid, "results/sources.json"), encoding="utf-8"))["sources"]
        row = {"task": t["id"]}
        for label, system in (("incumbent", incumbent), ("candidate", cand["text"])):
            text, author = writer_fn(eid, brief, findings, sources, ledger, system)
            f = verify.deterministic(text, sources)
            v = verify.judge(text, brief, sources, author, ledger)
            row[label] = verify.score(f, v)
        results.append(row)
    passed = bool(results) and all(r["candidate"] >= r["incumbent"] for r in results) and \
        sum(r["candidate"] for r in results) > sum(r["incumbent"] for r in results)
    ev = {"cases": results, "passed": passed, "spent_usd": ledger.spent_usd, "at": time.time()}
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
    results = []
    for c in (cases if cases is not None else prompt_cases(skill)):
        try:
            sources = json.load(open(store.safe_path(c["engagement_id"], "results/sources.json"), encoding="utf-8"))["sources"]
        except (FileNotFoundError, ValueError):
            sources = []
        row = {"task": c.get("task_id")}
        for label, system in (("incumbent", incumbent), ("candidate", cand["text"])):
            raw, _, _ = providers.claude(c["model"], system, [{"role": "user", "content": c["msg"]}], ledger,
                                         max_tokens=int(c.get("max_tokens") or 16000), effort=c.get("effort") or "medium",
                                         json_schema=schema)
            text = _reply_text(raw)
            row[label] = verify.score(verify.deterministic(text, sources),
                                      verify.judge(text, {"goal": f"the {skill.replace('_', ' ')}'s output"}, sources, c["model"], ledger))
        results.append(row)
    passed = bool(results) and all(r["candidate"] >= r["incumbent"] for r in results) and \
        sum(r["candidate"] for r in results) > sum(r["incumbent"] for r in results)
    ev = {"cases": results, "passed": passed, "spent_usd": ledger.spent_usd, "at": time.time(),
          "note": "" if results else "no finished work of this kind has a recorded message yet"}
    _db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(ev), cand["id"]))
    store.event("skill_evaluated", {"id": cand["id"], "passed": passed})
    return ev


def promote(version_id):
    """The person's decision. A candidate needs a passing evaluation; any earlier version may be restored."""
    r = _db().execute("SELECT * FROM skill_versions WHERE id = ?", (version_id,)).fetchone()
    if not r:
        return {"error": "no such version"}
    if r["status"] == "candidate":
        ev = json.loads(r["eval_json"] or "{}")
        if not ev.get("passed"):
            return {"error": "the candidate has not passed its held-out evaluation"}
    _db().execute("UPDATE skill_versions SET status = 'retired' WHERE skill = ? AND status = 'active'", (r["skill"],))
    _db().execute("UPDATE skill_versions SET status = 'active' WHERE id = ?", (version_id,))
    store.event("skill_promoted", {"id": version_id, "skill": r["skill"], "version": r["version"]})
    return {"promoted": version_id, "skill": r["skill"], "version": r["version"]}
