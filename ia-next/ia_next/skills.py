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
proposes edits automatically; the queue is filled by people and by reviewed feedback.
"""
import json
import time

from . import config, control, providers, store, verify

SCHEMA = """CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY, skill TEXT, version INTEGER, text TEXT, status TEXT, reason TEXT, created REAL, eval_json TEXT)"""
EDITABLE = {"writer"}
MUST_KEEP = {"writer": ["cite", "quote", "em-dash"]}


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
    r = _db().execute("SELECT text FROM skill_versions WHERE skill = ? AND status = 'active' ORDER BY version DESC LIMIT 1", (skill,)).fetchone()
    return r["text"] if r else default_text


def versions(skill):
    return [dict(r) for r in _db().execute("SELECT id, skill, version, status, reason, created, eval_json FROM skill_versions WHERE skill = ? ORDER BY version", (skill,))]


def lint(skill, text):
    why = []
    if skill not in EDITABLE:
        why.append(f"skill {skill} is not editable")
    if "\u2014" in text:
        why.append("contains an em-dash")
    if not 200 <= len(text) <= 6000:
        why.append("length must be 200 to 6,000 characters")
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
