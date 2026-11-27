"""Agent-facing skills as packages, loaded on demand (harness WS-H9, 26 Nov; paper items 12, 33, 34; Uber items 34-36).

A skill is a folder under ia_next/agent_skills/<name>/:
- SKILL.md: front matter (name, description of at most 100 tokens, when_to_use, version, owner, tools) and a body under
  500 lines: numbered steps, each with one objective and a "Check:" line, then an error-recovery table;
- spec.md: goal, outputs, required and forbidden actions, target models;
- tests.json: prompts with the tools a good turn calls (in order), the tools it must not call, and the outcome.

Progressive disclosure: the agent's instructions list only each skill's name, description and when to use it; the
`use_skill` tool loads the body when a request needs it (event `skill_used`, chosen_by "agent", a live step).

The linter (`lint`) is the Uber check, enforced on every package: numbered steps with a check each, concrete commands
(each step names a tool or a field in backticks, and every tool the front matter lists exists), and an error-recovery
table where "try again" alone never counts as a recovery. The specialist prompts (writer, analyst, deck composer and
the rest) stay governed in skill_versions; `metrics` reports both kinds side by side.
"""
import json
import os
import re
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent_skills")
FRONT_KEYS = ("name", "description", "when_to_use", "version", "owner", "tools", "tier")
# (Uber: three tiers, and a skill graduates by evals) domain: any skill that passes the linter; core: needs trial evidence
# that it helps (with the skill at least as many cases pass as without, and at least 70% pass); always-on: core skills
# every conversation should carry. The evidence is the last skill trial (data/skill_trials.json).
TIERS = ("domain", "core", "always-on")
TRIALS_NAME = "skill_trials.json"
DESC_TOKENS = 100
BODY_LINES = 500
SPEC_SECTIONS = ("Goal", "Outputs", "Required", "Forbidden", "Target models")
RECOVERY_HEADING = "## If something goes wrong"
_STEP = re.compile(r"^(\d+)\.\s+\S")
_ONLY_RETRY = re.compile(r"^(just\s+)?(try( it)? again|retry|try later|try again later)\.?$", re.I)


def _read(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def parse(text):
    """(front matter dict, body) of a SKILL.md."""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text or "", re.S)
    if not m:
        return {}, text or ""
    front = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            front[k.strip()] = v.strip()
    return front, m.group(2)


def names():
    try:
        return sorted(n for n in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, n, "SKILL.md")))
    except OSError:
        return []


def package(name):
    """{name, front, body, spec, tests} of one skill, or None."""
    if name not in names():
        return None
    folder = os.path.join(ROOT, name)
    front, body = parse(_read(os.path.join(folder, "SKILL.md")))
    try:
        tests = json.loads(_read(os.path.join(folder, "tests.json")) or "null")
    except ValueError:
        tests = "invalid"
    refs = os.path.join(folder, "references")
    references = sorted(f for f in os.listdir(refs) if f.endswith(".md")) if os.path.isdir(refs) else []
    return {"name": name, "front": front, "body": body, "spec": _read(os.path.join(folder, "spec.md")), "tests": tests,
            "references": references}


def catalog():
    """What the agent's instructions list: name, description, when to use, version."""
    out = []
    for n in names():
        f = package(n)["front"]
        out.append({"name": f.get("name") or n, "description": f.get("description", ""), "when_to_use": f.get("when_to_use", ""),
                    "version": f.get("version", "1"), "tier": f.get("tier", "domain"),
                    "tools": [t.strip() for t in f.get("tools", "").split(",") if t.strip()]})
    return out


def catalog_text():
    """The block the agent's instructions carry (names and descriptions only; bodies load through use_skill)."""
    rows = catalog()
    if not rows:
        return ""
    return ("Skills you can load with use_skill before doing the work they cover (each gives numbered steps with checks):\n"
            + "\n".join(f"- {r['name']}: {r['description']} Use when: {r['when_to_use']}" for r in rows))


def agent_tools():
    """Every tool name the agent can call (its own list and the specialists')."""
    from . import agent
    return {t["name"] for t in agent.TOOLS} | set(agent.MODULE_FOR_TOOL)


def _tokens(text):
    return (len(text or "") + 3) // 4


def lint_package(pkg, tools=None):
    """The problems with one skill package, in plain words; [] when it passes."""
    why = []
    front, body = pkg["front"], pkg["body"]
    for k in FRONT_KEYS:
        if not front.get(k):
            why.append(f"front matter has no {k}")
    if _tokens(front.get("description", "")) > DESC_TOKENS:
        why.append(f"the description runs past {DESC_TOKENS} tokens")
    if len(body.splitlines()) > BODY_LINES:
        why.append(f"the body runs past {BODY_LINES} lines")
    text = "\n".join([*front.values(), body, pkg.get("spec") or ""])
    if "—" in text:
        why.append("contains an em-dash")
    tools = agent_tools() if tools is None else set(tools)
    listed = [t.strip() for t in front.get("tools", "").split(",") if t.strip()]
    for t in listed:
        if t not in tools:
            why.append(f"front matter lists a tool the agent does not have: {t}")
    # numbered steps, each with one objective and a check, each naming a concrete tool or field
    head = body.split(RECOVERY_HEADING)[0]
    steps, cur = [], None
    for line in head.splitlines():
        if _STEP.match(line):
            cur = [line]
            steps.append(cur)
        elif cur is not None and line.startswith("#"):
            cur = None
        elif cur is not None:
            cur.append(line)
    if len(steps) < 2:
        why.append("needs at least two numbered steps")
    for s in steps:
        n = _STEP.match(s[0]).group(1)
        block = "\n".join(s)
        if not any(ln.strip().startswith("Check:") for ln in s):
            why.append(f"step {n} has no Check: line")
        if not re.search(r"`[^`]+`", block):
            why.append(f"step {n} names no tool or field (a concrete command in backticks)")
    # the error-recovery table
    if RECOVERY_HEADING not in body:
        why.append(f"has no error-recovery table under \"{RECOVERY_HEADING}\"")
    else:
        rows = [ln for ln in body.split(RECOVERY_HEADING, 1)[1].splitlines() if ln.strip().startswith("|")]
        data = [r for r in rows[2:] if r.strip("|- \t")]
        if len(data) < 2:
            why.append("the error-recovery table needs at least two rows")
        for r in data:
            cells = [c.strip() for c in r.strip().strip("|").split("|")]
            if len(cells) < 2 or not cells[-1]:
                why.append(f"an error-recovery row has no recovery: {cells[0][:60] if cells else r[:60]}")
            elif _ONLY_RETRY.match(cells[-1]):
                why.append(f"\"{cells[-1]}\" alone is not a recovery ({cells[0][:60]})")
    spec = pkg.get("spec") or ""
    for sec in SPEC_SECTIONS:
        if not re.search(rf"^##\s+{re.escape(sec)}\b", spec, re.M):
            why.append(f"spec.md has no {sec} section")
    if front.get("tier") and front.get("tier") not in TIERS:
        why.append(f"tier must be one of {', '.join(TIERS)}")
    # (Uber: scripts and references, read only by the step that needs them) every reference the body names exists
    for ref in sorted(set(re.findall(r"references/([\w.-]+\.md)", body))):
        if ref not in (pkg.get("references") or []):
            why.append(f"the body names references/{ref}, which the package does not have")
    tests = pkg.get("tests")
    if not isinstance(tests, list) or len(tests) < 3:
        why.append("tests.json needs at least three cases")
    else:
        for i, c in enumerate(tests, 1):
            if not isinstance(c, dict) or not str(c.get("prompt") or "").strip() or not str(c.get("outcome") or "").strip():
                why.append(f"test {i} needs a prompt and an outcome")
            elif not isinstance(c.get("expected_tools"), list) or not c["expected_tools"]:
                why.append(f"test {i} names no expected tools")
            else:
                for t in c["expected_tools"] + list(c.get("forbidden_tools") or []):
                    if t not in tools:
                        why.append(f"test {i} names a tool the agent does not have: {t}")
    return why


def lint(name):
    pkg = package(name)
    return ["no such skill"] if pkg is None else lint_package(pkg)


def load(name, reference=""):
    """The body for the agent (use_skill), or one of its references when `reference` names one (Uber: references are read
    only by the step that needs them). Records skill_used with chosen_by "agent"."""
    pkg = package(str(name or "").strip())
    if pkg is None:
        return {"error": f"no skill named {name}; the skills are: {', '.join(names()) or 'none'}"}
    version = pkg["front"].get("version", "1")
    ref = os.path.basename(str(reference or "").strip())
    if ref:
        if ref not in pkg["references"]:
            return {"error": f"{name} has no reference {ref}; it has: {', '.join(pkg['references']) or 'none'}"}
        return {"name": pkg["name"], "version": version, "reference": ref,
                "text": _read(os.path.join(ROOT, pkg["name"], "references", ref)).strip()}
    try:
        from . import store
        turn = store.TURN.get() or {}
        tid, eid = store.current_task()
        store.event("skill_used", {"skill": pkg["name"], "version": version, "chosen_by": "agent", "kind": "agent",
                                   "conversation": turn.get("conversation", "")}, eid or None, tid or None)
    except Exception:
        pass
    return {"name": pkg["name"], "version": version, "instructions": pkg["body"].strip(), "references": pkg["references"]}


def trials(name):
    """The last skill trial's result for one skill: {with_skill, without, of} or None."""
    try:
        from . import config
        with open(os.path.join(config.DATA_DIR, TRIALS_NAME), encoding="utf-8") as fh:
            d = json.load(fh)
    except (OSError, ValueError):
        return None
    rows = [r for r in d.get("rows") or [] if r.get("skill") == name and not r.get("ablated")]
    if not rows:
        return None
    return {"with_skill": sum(1 for r in rows if r["with_skill"]["passed"]), "without": sum(1 for r in rows if r["without"]["passed"]),
            "of": len(rows), "at": d.get("at")}


def graduation(name):
    """(Uber: a skill graduates by evals) whether the skill's tier is earned: domain always; core and always-on need the
    last trial to show it helps. Returns {tier, earned, why}."""
    pkg = package(name)
    tier = (pkg or {}).get("front", {}).get("tier", "domain")
    if tier == "domain":
        return {"tier": tier, "earned": True, "why": "domain skills need only the linter"}
    t = trials(name)
    if not t:
        return {"tier": tier, "earned": False, "why": "no skill trial recorded yet"}
    ok = t["with_skill"] >= t["without"] and t["with_skill"] >= 0.7 * t["of"]
    return {"tier": tier, "earned": ok, "why": f"trial: {t['with_skill']} of {t['of']} with the skill, {t['without']} without"}


def _norm(v):
    return " ".join(str(v or "").lower().split())


def check_case(case, calls):
    """(Trajectory grading) whether the tool calls of a turn meet a test case: the expected tools appear in order, no
    forbidden tool appears, and each list the case expects in a tool's arguments is contained in that tool's last call
    (case and spacing ignored). `calls` are tool names or (name, arguments) pairs. Returns (passed, reason)."""
    pairs = [c if isinstance(c, tuple) else (c, {}) for c in calls]
    pairs = [(n, a or {}) for n, a in pairs if n != "use_skill"]
    names_ = [n for n, _ in pairs]
    it = iter(names_)
    missing = [t for t in case.get("expected_tools") or [] if not any(c == t for c in it)]
    if missing:
        return False, f"expected {missing[0]} in order after the earlier tools"
    bad = [t for t in case.get("forbidden_tools") or [] if t in names_]
    if bad:
        return False, f"called {bad[0]}, which this case forbids"
    for tool, want in (case.get("expect_args") or {}).items():
        got = next((a for n, a in reversed(pairs) if n == tool), None)
        if got is None:
            return False, f"{tool} was not called"
        for field, items in want.items():
            have = {_norm(x) for x in (got.get(field) or [])} if isinstance(got.get(field), list) else {_norm(got.get(field))}
            lost = [x for x in items if _norm(x) not in have]
            if lost:
                return False, f"{tool} {field} lacks {lost[0]}"
    return True, "the right tools in the right order, with the expected arguments"


def metrics(days=30):
    """(Uber skill telemetry) per skill, agent-facing and governed alike, over the period: uses, who chose it, versions
    served, reach (engagements and conversations), tasks it shaped, hard failures on those tasks, model seconds and
    output tokens of those tasks, and the skills used with it in the same task or turn."""
    from . import store
    since = time.time() - float(days) * 86400
    c = store.conn()
    from . import providers
    providers._spend_table(c)
    rows = c.execute("SELECT engagement_id, task_id, data FROM events WHERE kind = 'skill_used' AND ts >= ?", (since,)).fetchall()
    by, groups = {}, {}
    for r in rows:
        try:
            d = json.loads(r["data"] or "{}")
        except ValueError:
            continue
        name = d.get("skill")
        if not name:
            continue
        m = by.setdefault(name, {"kind": d.get("kind") or "specialist", "uses": 0, "chosen_by": {}, "versions": {},
                                 "engagements": set(), "conversations": set(), "tasks": set()})
        m["uses"] += 1
        who = d.get("chosen_by") or "code"
        m["chosen_by"][who] = m["chosen_by"].get(who, 0) + 1
        v = str(d.get("version"))
        m["versions"][v] = m["versions"].get(v, 0) + 1
        if r["engagement_id"]:
            m["engagements"].add(r["engagement_id"])
        if d.get("conversation"):
            m["conversations"].add(d["conversation"])
        if r["task_id"]:
            m["tasks"].add(r["task_id"])
        key = r["task_id"] or d.get("trace")
        if key:
            groups.setdefault(key, set()).add(name)
    failed = {}
    for r in c.execute("SELECT task_id, data FROM events WHERE kind = 'scorecard' AND ts >= ? ORDER BY id", (since,)):
        try:
            failed[r["task_id"]] = bool(json.loads(r["data"] or "{}").get("hard_failed"))
        except ValueError:
            pass
    out = {}
    for name, m in sorted(by.items()):
        secs = toks = 0.0
        for tid in m["tasks"]:
            sp = c.execute("SELECT SUM(seconds) AS s, SUM(output_tokens) AS o FROM spend WHERE label = ?", (tid,)).fetchone()
            secs += float(sp["s"] or 0)
            toks += float(sp["o"] or 0)
        co = {}
        for members in groups.values():
            if name in members:
                for other in members - {name}:
                    co[other] = co.get(other, 0) + 1
        out[name] = {"kind": m["kind"], "uses": m["uses"], "chosen_by": m["chosen_by"], "versions": m["versions"],
                     "reach": {"engagements": len(m["engagements"]), "conversations": len(m["conversations"])},
                     "tasks": len(m["tasks"]), "tasks_failing_hard_checks": sum(1 for t in m["tasks"] if failed.get(t)),
                     "model_seconds": round(secs, 1), "output_tokens": int(toks),
                     "mean_seconds_per_task": round(secs / len(m["tasks"]), 1) if m["tasks"] else 0.0,
                     "used_with": dict(sorted(co.items(), key=lambda kv: -kv[1])[:5])}
    for n in names():                       # an agent-facing skill no one has loaded yet still shows, with its lint
        out.setdefault(n, {"kind": "agent", "uses": 0})
        out[n]["lint"] = lint(n)
        out[n]["graduation"] = graduation(n)
    return {"period_days": days, "skills": out}
