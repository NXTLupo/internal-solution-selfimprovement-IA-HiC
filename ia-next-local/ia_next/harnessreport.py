"""What the harness has been doing (harness WS-H18, 26 Nov): one report over a period, read from the trace data the loop
already records, so the owner (and the next engineer) can see how turns end, what the loop had to step in for, how the
models were loaded, what the learning loops proposed and where task time went, without reading code or logs."""
import json
import time

from . import control, store

LOOP_EVENTS = ("args_coerced", "agent_repeat_noted", "agent_repeat_stopped", "agent_grace", "hook_denied", "hook_rewrite",
               "hook_context", "hook_continue", "hook_replace", "tool_result_fitted", "model_window_grown",
               "conversation_compacted", "routed_in_code", "tool_call_truncated")
MODEL_EVENTS = ("models_released_for_load", "model_load_waiting", "stage_failed", "ollama_version_changed", "ollama_contract_checked")
LEARNING_EVENTS = ("dreaming_applied", "dreaming_retired", "skill_evaluated", "skill_promoted", "skill_canary",
                   "skill_canary_reviewed", "skill_model_checked", "library_migration_paused")


def _count(c, kinds, since):
    q = ",".join("?" * len(kinds))
    rows = c.execute(f"SELECT kind, COUNT(*) AS n FROM events WHERE ts >= ? AND kind IN ({q}) GROUP BY kind", (since, *kinds))
    got = {r["kind"]: r["n"] for r in rows}
    return {k: got.get(k, 0) for k in kinds}


def report(days=7):
    since = time.time() - float(days) * 86400
    c = store.conn()
    store._transcripts(c)
    from . import providers
    providers._spend_table(c)                     # created on the first model call; a fresh store has none yet
    exits = {r["exit"] or "unknown": r["n"] for r in c.execute(
        "SELECT exit, COUNT(*) AS n FROM transcripts WHERE ts >= ? GROUP BY exit", (since,))}
    turns = c.execute("SELECT COUNT(*) AS n, AVG(seconds) AS s FROM transcripts WHERE ts >= ?", (since,)).fetchone()
    calls = c.execute("SELECT model, COUNT(*) AS n, SUM(load_seconds) AS load_s, SUM(CASE WHEN load_seconds > 5 THEN 1 ELSE 0 END) AS loads, "
                      "AVG(prompt_seconds) AS prefill_s, SUM(output_tokens) AS out_tok, SUM(seconds) AS secs FROM spend WHERE ts >= ? "
                      "GROUP BY model ORDER BY secs DESC", (since,)).fetchall()
    from . import papercuts, skills
    cuts = papercuts.grouped()
    pending = [a for a in control.pending() if a["tool"] == "apply_dream"]
    tasks = [dict(r) for r in c.execute("SELECT id, kind, status, created, updated FROM tasks WHERE created >= ? AND status IN "
                                        "('done', 'failed', 'stopped') ORDER BY created DESC LIMIT 8", (since,))]
    for t in tasks:
        t["minutes"] = round(((t.get("updated") or 0) - (t.get("created") or 0)) / 60, 1)
        by = {}
        for line in store.timeline(t["id"]):
            by[line["specialist"]] = round(by.get(line["specialist"], 0) + line["seconds"], 1)
        t["seconds_by_step"] = by
    return {
        "period_days": days,
        "turns": {"count": turns["n"] or 0, "mean_seconds": round(turns["s"] or 0, 1), "how_they_ended": exits},
        "loop_interventions": _count(c, LOOP_EVENTS, since),
        "models": {"calls": [{"model": r["model"], "calls": r["n"], "loads_over_5s": r["loads"] or 0,
                              "load_seconds": round(r["load_s"] or 0, 1), "mean_prefill_seconds": round(r["prefill_s"] or 0, 2),
                              "output_tokens": r["out_tok"] or 0, "seconds": round(r["secs"] or 0, 1)} for r in calls],
                   "events": _count(c, MODEL_EVENTS, since)},
        "learning": {"events": _count(c, LEARNING_EVENTS, since), "dreaming_proposals_waiting": len(pending),
                     "papercuts_open": sum(1 for p in cuts if p["state"] != "fixed"),
                     "papercuts_top": [{"area": p["area"], "happened": p["happened"], "count": p["count"], "state": p["state"]}
                                       for p in cuts[:5]],
                     "skills": {name: skills.quality(name) for name in sorted(skills.REGISTRY)}},
        "recent_tasks": tasks,
        "trajectory": _trajectory(since),
        "skill_cost": _skill_cost(c, since),
    }


def _skill_cost(c, since):
    """(Uber: cost per skill invocation) per governed skill, over the tasks it shaped in the period: how many tasks, the
    model seconds and output tokens those tasks spent. Locally the cost is time, not money."""
    out = {}
    rows = c.execute("SELECT DISTINCT json_extract(data, '$.skill') AS skill, task_id FROM events WHERE kind = 'skill_used' "
                     "AND task_id IS NOT NULL AND ts >= ?", (since,)).fetchall()
    for r in rows:
        sp = c.execute("SELECT SUM(seconds) AS s, SUM(output_tokens) AS o FROM spend WHERE label = ?", (r["task_id"],)).fetchone()
        d = out.setdefault(r["skill"], {"tasks": 0, "model_seconds": 0.0, "output_tokens": 0})
        d["tasks"] += 1
        d["model_seconds"] = round(d["model_seconds"] + float(sp["s"] or 0), 1)
        d["output_tokens"] += int(sp["o"] or 0)
    for d in out.values():
        d["mean_seconds_per_task"] = round(d["model_seconds"] / d["tasks"], 1) if d["tasks"] else 0.0
    return out


def _trajectory(since):
    """(WS-H15) the recorded turns graded on the right tools in the right order."""
    try:
        from . import trajectory
        return trajectory.report(since=since)
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:120]}"}
