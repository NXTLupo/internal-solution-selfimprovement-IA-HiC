"""Trajectory grading (harness WS-H15, from the Uber article: real prompts graded on the right tools in the right order,
alongside outcome checks; a 70 to 90% pass rate is the useful range, 100% means the grader misses things).

Each recorded turn (the `transcripts` table) is graded in code, with no model:
- a request that names an output (a hashtag, or a making verb with a named output) reaches that output's tool;
- a question does not start work;
- the turn ends answered, not at the step limit, on a repeated call, or with nothing made;
- no identical tool call is made twice.
"""
import json

from . import store

GOOD_EXITS = ("answered", "")


def grade(turn):
    """{"trace", "said", "passed", "problems": [...]} for one recorded turn."""
    from . import plan, router
    said = str(turn.get("said") or "")
    steps = turn.get("steps") or []
    if isinstance(steps, str):
        try:
            steps = json.loads(steps)
        except ValueError:
            steps = []
    tools = [s.get("tool") for s in steps]
    problems = []
    wanted = router.hashtag_tool(said) or router.named_tool(said)
    if wanted and wanted[1] not in tools:
        problems.append(f"asked for {wanted[0]} but {wanted[1]} was never called")
    if plan.is_question(said) and any(str(t or "").startswith("start_") for t in tools):
        problems.append("a question started work")
    if str(turn.get("exit") or "") not in GOOD_EXITS:
        problems.append(f"ended with {turn.get('exit')}")
    keys = [json.dumps([s.get("tool"), s.get("input")], sort_keys=True, default=str) for s in steps]
    if len(keys) != len(set(keys)):
        problems.append("the same tool call was made twice")
    return {"trace": turn.get("trace"), "said": said[:160], "passed": not problems, "problems": problems}


def report(limit=200, since=0):
    """{"graded", "passed", "rate", "in_useful_range", "failures": [...]} over the most recent recorded turns."""
    c = store.conn()
    store._transcripts(c)
    rows = [dict(r) for r in c.execute("SELECT trace, said, steps, exit FROM transcripts WHERE ts >= ? ORDER BY ts DESC LIMIT ?",
                                       (since, int(limit)))]
    graded = [grade(r) for r in rows]
    n = len(graded)
    ok = sum(1 for g in graded if g["passed"])
    rate = round(ok / n, 3) if n else None
    return {"graded": n, "passed": ok, "rate": rate, "in_useful_range": (rate is not None and 0.7 <= rate <= 0.9),
            "failures": [g for g in graded if not g["passed"]][:10]}
