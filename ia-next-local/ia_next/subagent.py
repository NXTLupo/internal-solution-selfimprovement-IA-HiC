"""Sub-agents (harness WS-H14, 26 Nov; Harness Engineering R12 and items 24-26, 40; Uber: a worker on a cheaper model
returns a bounded summary).

`run(task, tools=...)` works a narrow question in its own fresh messages, under a fixed system prompt, with the tools it
is given intersected with the parent's and a blocklist that keeps every outward or lasting action with the parent: no
starting work, no memory writes, no scheduling, no email, no further delegation. It runs on the fast seat by default,
within a step and time budget, and returns a summary of at most SUMMARY_CHARS with its trace. Large tool results stay in
the worker; only the summary goes back. Stays in-process (R13: sub-agents are not a protocol concern).
"""
import json
import time

from . import config, providers, store

SUMMARY_CHARS = 2000
RESULT_CHARS = 6000
BLOCKED = {"remember", "forget", "schedule_task", "send_email", "find_tools", "stop_task", "retry_task", "update_plan",
           "ask_worker"}                     # no further delegation
SYSTEM = ("You are a research worker for an assistant. Answer the one question you are given, using the tools when they "
          "help, then reply with a summary of at most 250 words: what you found, with the source ids or pointers the tools "
          "returned, and what you could not find. Never invent a source. No em-dash characters.")


def allowed_tools(parent_tools, wanted=None):
    """The specs a worker may use: the parent's tools it asked for (all of them when None), minus the blocklist and any
    tool that starts work."""
    names = {t["name"] for t in parent_tools}
    pick = names if wanted is None else names & set(wanted)
    pick = {n for n in pick if n not in BLOCKED and not n.startswith("start_") and not n.startswith("transcribe_")}
    return [t for t in parent_tools if t["name"] in pick]


def run(task, tools=None, parent_tools=None, model=None, max_steps=4, max_seconds=180, call=None, ledger=None, execute=None):
    """(summary, trace) for one narrow question."""
    from . import agent
    call = call or providers.claude
    execute = execute or agent.execute_tool
    specs = allowed_tools(parent_tools if parent_tools is not None else agent.TOOLS, tools)
    allowed = {t["name"] for t in specs}
    model = model or config.SEATS["fast"]["primary"]
    ledger = ledger or providers.Ledger(limit_usd=0.5, purpose="subagent")
    cid = (store.TURN.get() or {}).get("conversation")
    store.event("subagent_started", {"conversation": cid, "task": str(task)[:200], "tools": sorted(allowed), "model": model})
    messages, trace, t0 = [{"role": "user", "content": str(task)}], [], time.time()
    reply = ""
    for _step in range(max_steps):
        if time.time() - t0 > max_seconds:
            break
        reply, _u, resp = call(model, SYSTEM, messages, ledger, tools=specs or None, max_tokens=1500, effort="low")
        uses = [b for b in resp.content if getattr(b, "type", None) == "tool_use"]
        messages.append({"role": "assistant", "content": [b.model_dump(exclude_none=True) if hasattr(b, "model_dump") else b for b in resp.content]})
        if not uses:
            break
        results = []
        for u in uses:
            out = execute(u.name, dict(u.input)) if u.name in allowed else {"error": f"{u.name} is not available to a worker"}
            trace.append({"tool": u.name, "input": dict(u.input), "ok": not (isinstance(out, dict) and out.get("error"))})
            results.append({"type": "tool_result", "tool_use_id": u.id, "content": json.dumps(out, ensure_ascii=False)[:RESULT_CHARS]})
        messages.append({"role": "user", "content": results})
    else:
        reply = ""
    if not str(reply or "").strip():                    # the budget ran out mid-work: one last call, no tools, for the summary
        messages.append({"role": "user", "content": "Reply now with your summary; no more tool calls."})
        reply, _u, _r = call(model, SYSTEM, messages, ledger, tools=None, max_tokens=800, effort="low")
    summary = " ".join(str(reply or "").split())[:SUMMARY_CHARS]
    store.event("subagent_finished", {"conversation": cid, "steps": len(trace), "seconds": round(time.time() - t0, 1),
                                      "summary": summary[:300]})
    return summary, trace
