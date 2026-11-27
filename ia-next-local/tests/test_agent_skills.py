"""Agent-facing skills as packages (harness WS-H9, 26 Nov): the linter, the converted deep-research skill, progressive
disclosure through use_skill, trajectory checks from tests.json, and the metrics endpoint."""
import json

from fastapi.testclient import TestClient

from ia_next import agent, agentskills, app as app_module, skills, store

TOOLS = {"start_research_report", "read_report", "task_status"}
GOOD_BODY = """
1. Read the request for the subject and the period (the `scope`).
   Check: each is taken from the person's words.

2. Call `start_research_report` once with the brief.
   Check: the tool was called once.

## If something goes wrong

| What happened | What to do |
|---|---|
| The engagement already has findings | Ask the person before researching again |
| The task failed | Read the reason with `task_status` and tell the person |
"""
GOOD_SPEC = "## Goal\nx\n## Outputs\nx\n## Required\nx\n## Forbidden\nx\n## Target models\nx\n"
GOOD_TESTS = [{"prompt": f"p{i}", "expected_tools": ["start_research_report"], "outcome": "o"} for i in range(3)]


def _pkg(body=GOOD_BODY, front=None, spec=GOOD_SPEC, tests=None):
    f = {"name": "s", "description": "Runs research.", "when_to_use": "research", "version": "1", "owner": "me",
         "tools": "start_research_report, task_status", "tier": "domain"}
    f.update(front or {})
    return {"name": "s", "front": f, "body": body, "spec": spec, "tests": GOOD_TESTS if tests is None else tests}


def test_a_complete_package_passes_the_linter():
    assert agentskills.lint_package(_pkg(), tools=TOOLS) == []


def test_the_linter_names_each_missing_part():
    no_check = GOOD_BODY.replace("   Check: the tool was called once.\n", "")
    assert "step 2 has no Check: line" in agentskills.lint_package(_pkg(body=no_check), tools=TOOLS)
    vague = GOOD_BODY.replace("Call `start_research_report` once", "Start the research once")
    assert "step 2 names no tool or field (a concrete command in backticks)" in agentskills.lint_package(_pkg(body=vague), tools=TOOLS)
    retry = GOOD_BODY.replace("Read the reason with `task_status` and tell the person", "Try again")
    assert any("alone is not a recovery" in w for w in agentskills.lint_package(_pkg(body=retry), tools=TOOLS))
    no_table = GOOD_BODY.split("## If something goes wrong")[0]
    assert any("error-recovery table" in w for w in agentskills.lint_package(_pkg(body=no_table), tools=TOOLS))
    long_desc = {"description": "word " * 120}
    assert any("100 tokens" in w for w in agentskills.lint_package(_pkg(front=long_desc), tools=TOOLS))
    assert any("does not have: start_deck" in w for w in agentskills.lint_package(_pkg(front={"tools": "start_deck"}), tools=TOOLS))
    assert any("spec.md has no Forbidden" in w for w in agentskills.lint_package(_pkg(spec=GOOD_SPEC.replace("## Forbidden\nx\n", "")), tools=TOOLS))
    assert "tests.json needs at least three cases" in agentskills.lint_package(_pkg(tests=GOOD_TESTS[:2]), tools=TOOLS)


def test_the_deep_research_skill_is_converted_and_passes():
    assert "deep-research-with-packs" in agentskills.names()
    assert agentskills.lint("deep-research-with-packs") == []
    listed = agentskills.catalog_text()
    assert "deep-research-with-packs:" in listed and "1. Read the request" not in listed      # names only, no body


def test_the_agent_lists_skills_and_use_skill_loads_the_body():
    conv = agent.Conversation("conv_skills_1")
    assert "Skills you can load with use_skill" in conv.system and "deep-research-with-packs" in conv.system
    assert any(t["name"] == "use_skill" for t in agent.TOOLS)
    tok = store.TURN.set({"conversation": "conv_skills_1", "request": "r", "focus": ""})
    try:
        got = agent.execute_tool("use_skill", {"name": "deep-research-with-packs"})
    finally:
        store.TURN.reset(tok)
    assert got["version"] == "3" and got["instructions"].startswith("# Deep research with data packs")
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'skill_used' ORDER BY id DESC LIMIT 1").fetchone()
    d = json.loads(ev["data"])
    assert d["skill"] == "deep-research-with-packs" and d["chosen_by"] == "agent" and d["conversation"] == "conv_skills_1"
    assert "error" in agent.execute_tool("use_skill", {"name": "nope"})


def test_trajectory_checks_follow_the_cases():
    case = {"expected_tools": ["start_social_analysis", "start_research_report"], "forbidden_tools": ["start_deck"],
            "expect_args": {"start_research_report": {"required_sources": ["reddit:r/NEU"]}}}
    good = [("use_skill", {}), ("start_social_analysis", {}), ("start_research_report", {"required_sources": ["reddit:r/neu"]})]
    assert agentskills.check_case(case, good)[0]
    assert not agentskills.check_case(case, [("start_research_report", {}), ("start_social_analysis", {})])[0]   # wrong order
    assert not agentskills.check_case(case, good + [("start_deck", {})])[0]
    assert "lacks reddit:r/NEU" in agentskills.check_case(case, good[:2] + [("start_research_report", {"required_sources": []})])[1]


def test_specialist_skills_are_marked_chosen_by_code_and_metrics_report_both(monkeypatch):
    eid = store.create_engagement("metrics", "o")
    tid, _ = store.create_task(eid, "deck", {"goal": "g"}, 1.0)
    monkeypatch.setattr(store, "current_task", lambda: (tid, eid))
    skills.active_text("deck_composer", skills.default_text("deck_composer"))
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'skill_used' AND task_id = ? ORDER BY id DESC LIMIT 1", (tid,)).fetchone()
    assert json.loads(ev["data"])["chosen_by"] == "code"
    agentskills.load("deep-research-with-packs")                      # same task: used together
    r = TestClient(app_module.app).get("/api/skills/metrics?days=1").json()["skills"]
    assert r["deck_composer"]["chosen_by"].get("code", 0) >= 1 and r["deck_composer"]["kind"] == "specialist"
    assert r["deep-research-with-packs"]["chosen_by"].get("agent", 0) >= 1
    assert r["deck_composer"]["used_with"].get("deep-research-with-packs", 0) >= 1
    assert r["deep-research-with-packs"]["lint"] == []
    listed = TestClient(app_module.app).get("/api/skills/agent").json()["skills"]
    assert listed[0]["name"] == "deep-research-with-packs" and listed[0]["lint"] == []


def test_references_load_on_demand_and_must_exist():
    """Uber: scripts and references are read only by the step that needs them."""
    got = agentskills.load("deep-research-with-packs", "packs.md")
    assert got["reference"] == "packs.md" and "| retail | Retail & Commerce |" in got["text"]
    assert "error" in agentskills.load("deep-research-with-packs", "nope.md")
    assert "packs.md" in agentskills.load("deep-research-with-packs")["references"]
    body = GOOD_BODY.replace("Call `start_research_report` once", "Call `start_research_report` once (see references/ids.md)")
    assert any("references/ids.md" in w for w in agentskills.lint_package(_pkg(body=body), tools=TOOLS))
    assert agentskills.lint_package(dict(_pkg(body=body), references=["ids.md"]), tools=TOOLS) == []


def test_a_tier_is_named_and_core_is_earned_by_a_trial(tmp_path, monkeypatch):
    """Uber: three tiers; a skill graduates by evals."""
    assert any("tier must be one of" in w for w in agentskills.lint_package(_pkg(front={"tier": "gold"}), tools=TOOLS))
    from ia_next import config
    monkeypatch.setattr(config, "DATA_DIR", str(tmp_path))
    assert agentskills.graduation("deep-research-with-packs")["earned"] is False          # core with no trial yet
    rows = [{"skill": "deep-research-with-packs", "with_skill": {"passed": True}, "without": {"passed": i > 0}} for i in range(9)]
    (tmp_path / "skill_trials.json").write_text(json.dumps({"at": 1, "rows": rows}), encoding="utf-8")
    g = agentskills.graduation("deep-research-with-packs")
    assert g["tier"] == "core" and g["earned"] and "9 of 9 with the skill, 8 without" in g["why"]
