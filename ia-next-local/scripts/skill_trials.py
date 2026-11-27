"""Agent-facing skill trials (harness WS-H9): each skill's tests.json prompts, run through the orchestration model with
the skill catalog in its instructions (use_skill available) and without it, so a skill is kept only when it helps.
Run inside the app container when the app is idle:

    docker exec -i -e PYTHONPATH=/app -w /app ia-next-local python -u - < scripts/skill_trials.py

Only use_skill runs for real; every other tool returns a stub result (a plan card shown, a short report), so nothing
starts. A turn is up to MAX_STEPS model calls. Each run is graded with agentskills.check_case (the expected tools in
order, no forbidden tool, the expected arguments). The router is bypassed: this measures the model's own choices.
Writes data/skill_trials.json.

TRIAL_REAL=N adds up to N real prompts per skill (Uber: most of a suite is real prompts graded on trajectory): recorded
turns that called one of the skill's making tools, each graded on reaching that same tool.
TRIAL_ABLATE=1 then runs every case once more per numbered step with that step removed (Uber: test removing words; more
words can hurt a newer model) and writes data/skill_ablation.json."""
import json
import os
import re
import time

import httpx

from ia_next import agent, agentskills, config, providers

MAX_STEPS = 4
STUB = {
    "start_research_report": {"plan_card": "shown", "message": "A plan card is now shown to the person; nothing has started."},
    "start_social_analysis": {"plan_card": "shown", "message": "A plan card is now shown to the person; nothing has started."},
    "read_report": {"title": "AI pricing assistants", "text": "Findings: shoppers compare prices with assistants before buying. [S1]"},
    "list_engagements": {"engagements": [{"id": "eng_trial", "title": "Retail AI", "task_count": 3, "recent_tasks": [
        {"id": "task_trial_report", "kind": "research_report", "status": "done", "title": "AI shopping assistants: pricing and trust"}]}]},
    "task_status": {"status": "done"},
    "recall": {"results": [{"pointer": "task_trial_report", "text": "Research report: AI shopping assistants: pricing and trust (done)"}]},
}


def idle():
    try:
        return not httpx.get("http://127.0.0.1:" + os.environ.get("IA_NEXT_PORT", "9460") + "/api/busy", timeout=10).json().get("busy")
    except Exception:
        return True


def run(system, tools, prompt, stop_at=(), forbidden=()):
    msgs = [{"role": "user", "content": prompt}]
    calls, secs = [], 0.0
    for _ in range(MAX_STEPS):
        led = providers.Ledger(limit_usd=1.0, purpose="skill_trials")
        t0 = time.time()
        text, usage, resp = providers.claude(config.SEATS["orchestration"]["primary"], system, msgs, led, tools=tools,
                                             max_tokens=900, effort="medium")
        secs += time.time() - t0
        uses = [b for b in resp.content if getattr(b, "type", None) == "tool_use"]
        if not uses:
            break
        msgs.append({"role": "assistant", "content": [{"type": "tool_use", "id": u.id, "name": u.name, "input": u.input} for u in uses]})
        results = []
        for u in uses:
            calls.append((u.name, dict(u.input or {})))
            out = agentskills.load((u.input or {}).get("name")) if u.name == "use_skill" else STUB.get(u.name, {"ok": True})
            results.append({"type": "tool_result", "tool_use_id": u.id, "content": json.dumps(out)})
        msgs.append({"role": "user", "content": results})
        # a turn ends at the case's last expected tool or a forbidden one, as the real turn would end there
        if any(u.name in stop_at or u.name in forbidden for u in uses):
            break
    return calls, round(secs, 1)


def real_cases(name, n):
    """Up to n recorded turns whose first making call is one of the skill's tools, as trajectory cases."""
    if n <= 0:
        return []
    from ia_next import store
    tools = [t for t in agentskills.package(name)["front"].get("tools", "").replace(" ", "").split(",") if t.startswith("start_")]
    c = store.conn()
    store._transcripts(c)
    out, seen = [], set()
    for r in c.execute("SELECT trace, said, steps FROM transcripts ORDER BY ts DESC LIMIT 400").fetchall():
        said = " ".join(str(r["said"] or "").split())
        if not said or said.lower() in seen:
            continue
        made = [st.get("tool") for st in json.loads(r["steps"] or "[]") if str(st.get("tool") or "").startswith("start_")]
        if made and made[0] in tools:
            seen.add(said.lower())
            out.append({"prompt": said, "expected_tools": [made[0]], "forbidden_tools": [], "outcome": f"real turn {r['trace']}",
                        "real": r["trace"]})
        if len(out) >= n:
            break
    return out


def steps_of(body):
    """[(number, text of that step)] for the numbered steps before the recovery table."""
    head = body.split(agentskills.RECOVERY_HEADING)[0]
    parts = re.split(r"(?m)^(?=\d+\.\s)", head)
    return [(re.match(r"(\d+)\.", p).group(1), p) for p in parts if re.match(r"\d+\.\s", p)]


def ablate(name, cases, system, tools, only=None):
    """Each case with the skill minus one step at a time, then a placebo (the title alone: does the content matter, or
    only the act of loading a skill?). `only` limits the runs to those labels. Returns rows."""
    original = agentskills.load
    body = agentskills.package(name)["body"]
    title = body.strip().splitlines()[0] if body.strip() else name
    steps = steps_of(body)
    variants = [(num, body.replace(step, "", 1)) for num, step in steps] + [("placebo", title)]
    # TRIAL_VARIANTS="drop:4+6,keep:4+6": steps removed together, or every step but those removed (a minimal skill)
    for spec in [v for v in os.environ.get("TRIAL_VARIANTS", "").split(",") if ":" in v]:
        how, nums = spec.split(":", 1)
        chosen = set(nums.split("+"))
        cut = body
        for num, step in steps:
            if (how == "drop" and num in chosen) or (how == "keep" and num not in chosen):
                cut = cut.replace(step, "", 1)
        variants.append((spec, cut))
    rows = []
    for num, cut in variants:
        if only and num not in only:
            continue
        agentskills.load = lambda n, reference="", _cut=cut: (dict(original(n, reference), instructions=_cut.strip())
                                                              if not reference else original(n, reference))
        try:
            passed = 0
            for case in cases:
                while not idle():
                    time.sleep(30)
                calls, _secs = run(system, tools, case["prompt"], stop_at=(case["expected_tools"][-1],),
                                   forbidden=tuple(case.get("forbidden_tools") or ()))
                passed += agentskills.check_case(case, calls)[0]
            rows.append({"skill": name, "without_step": num, "passed": passed, "of": len(cases)})
            print(json.dumps(rows[-1]), flush=True)
        finally:
            agentskills.load = original
    return rows


def main():
    with_skills = agent.Conversation("conv_skill_trials").system
    listed = agentskills.catalog_text()
    without = with_skills.replace("\n\n" + listed, "") if listed else with_skills
    tools_with = agent.TOOLS
    tools_without = [t for t in agent.TOOLS if t["name"] != "use_skill"]
    rows = []
    if os.environ.get("TRIAL_PLACEBO_ONLY") == "1" or os.environ.get("TRIAL_VARIANTS"):   # these variants alone
        abl = []
        want = {"placebo"} if os.environ.get("TRIAL_PLACEBO_ONLY") == "1" else set()
        want |= {v for v in os.environ.get("TRIAL_VARIANTS", "").split(",") if ":" in v}
        for name in agentskills.names():
            abl += ablate(name, list(agentskills.package(name)["tests"]), with_skills, tools_with, only=want)
        with open(os.path.join(config.DATA_DIR, "skill_placebo.json"), "w", encoding="utf-8") as fh:
            json.dump({"at": time.time(), "rows": abl}, fh, indent=1)
        return
    real_n = int(os.environ.get("TRIAL_REAL", "0") or 0)
    for name in agentskills.names():
        for case in list(agentskills.package(name)["tests"]) + real_cases(name, real_n):
            row = {"skill": name, "prompt": case["prompt"], "real": case.get("real", "")}
            for mode, system, tools in (("with_skill", with_skills, tools_with), ("without", without, tools_without)):
                while not idle():
                    time.sleep(30)
                try:
                    calls, secs = run(system, tools, case["prompt"], stop_at=(case["expected_tools"][-1],),
                                      forbidden=tuple(case.get("forbidden_tools") or ()))
                    ok, why = agentskills.check_case(case, calls)
                    row[mode] = {"passed": ok, "why": why, "tools": [c[0] for c in calls], "seconds": secs,
                                 "loaded_skill": any(c[0] == "use_skill" for c in calls)}
                except Exception as e:
                    row[mode] = {"passed": False, "why": f"{type(e).__name__}: {str(e)[:160]}", "tools": []}
            rows.append(row)
            print(json.dumps(row), flush=True)
    summary = {m: {"passed": sum(1 for r in rows if r[m]["passed"]), "of": len(rows),
                   "mean_seconds": round(sum(r[m].get("seconds") or 0 for r in rows) / max(1, len(rows)), 1)}
               for m in ("with_skill", "without")}
    summary["with_skill"]["loaded"] = sum(1 for r in rows if r["with_skill"].get("loaded_skill"))
    with open(os.path.join(config.DATA_DIR, "skill_trials.json"), "w", encoding="utf-8") as fh:
        json.dump({"at": time.time(), "summary": summary, "rows": rows}, fh, indent=1)
    print(json.dumps(summary, indent=1))
    if os.environ.get("TRIAL_ABLATE") == "1":
        abl = []
        for name in agentskills.names():
            cases = list(agentskills.package(name)["tests"])
            full = sum(1 for r in rows if r["skill"] == name and not r["real"] and r["with_skill"]["passed"])
            got = ablate(name, cases, with_skills, tools_with)
            for r in got:
                r["full"] = full
            abl += got
        with open(os.path.join(config.DATA_DIR, "skill_ablation.json"), "w", encoding="utf-8") as fh:
            json.dump({"at": time.time(), "rows": abl}, fh, indent=1)


if __name__ == "__main__":
    main()
