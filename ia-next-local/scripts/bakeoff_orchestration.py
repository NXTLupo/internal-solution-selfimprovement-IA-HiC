"""Which model should hold the orchestration seat (uplift plan 2026-11-23, WS-2 step 4)?

Option A keeps Nemotron for the conversation and Qwen for the studio: two large models on one 24 GB card, so every
hand-off from the agent to a studio task reloads a model and drops its prompt cache. Option B uses Qwen for both: one
resident model. Since WS-4 the rules route most requests before any model sees them, so the seat's remaining job is
what the rules leave: questions, Reddit listening and research briefs (which need judgement), and vague asks. This
measures each model on exactly that job: the tool it chooses, the time, and the model loads, then one studio-sized Qwen
call after each, which is the hand-off cost.

    docker exec -e PYTHONPATH=/app ia-next-local python /app/scripts/bakeoff_orchestration.py
Writes /data/bakeoff_orchestration.json and prints a table.
"""
import json
import time

from ia_next import agent, config, providers, router

# (request, acceptable tools; "" means a reply with no tool)
CASES = [
    ("What are students on Reddit saying about AI tutors this term?", {"start_social_analysis", ""}),
    ("Listen to r/college and r/gradschool about AI detectors", {"start_social_analysis"}),
    ("Find out how universities are setting AI policy this year and write me a report", {"start_research_report"}),
    ("Pull together evidence on four-day work weeks in professional services", {"start_research_report"}),
    ("Research what employers expect from graduates on AI skills", {"start_research_report"}),
    ("Why do students hide their AI use from instructors?", {""}),
    ("What did the second source say about detection tools?", {"", "recall"}),
    ("Thanks, that's all for now", {""}),
    ("Can you help me think about what the provost should do next?", {"", "start_artifact", "start_research_report"}),
    ("Summarize what we have on career preparation", {"", "start_artifact"}),
    ("What can you make for me from this evidence?", {""}),
    ("Remember that I prefer the Northeastern brand for decks", {"remember"}),
    ("Show me the work that is running", {"", "list_tasks", "task_status"}),
    ("Compare how three peer universities handle AI in coursework", {"start_artifact", "start_research_report", "start_datatable"}),
    ("I need something for the board about student AI use", {"start_deck", "start_artifact", ""}),
]
MODELS = [("A: Nemotron (today)", config.NEMOTRON), ("B: Qwen (one resident model)", config.QWEN)]
STUDIO_MSG = "<material>\n" + ("Students describe using AI to explain readings and draft outlines. " * 300) + "\n</material>\nName one theme."


def one(model, said):
    system = agent.SYSTEM.format(user="(nothing recorded yet)", memory="(nothing recorded yet)")
    t0 = time.time()
    try:
        _, u, resp = providers.chat(model, system, [{"role": "user", "content": said}], None, max_tokens=800, tools=agent.TOOLS)
    except providers.ProviderError as e:
        return {"tool": "error", "seconds": round(time.time() - t0, 1), "load": 0.0, "error": str(e)[:120]}
    tools = [b["name"] for b in resp.content if b["type"] == "tool_use"]
    return {"tool": tools[0] if tools else "", "seconds": round(time.time() - t0, 1), "load": u.load_seconds}


def handoff():
    """One studio-sized call on Qwen right after the conversation's call: its load time is the hand-off cost."""
    t0 = time.time()
    _, u, _ = providers.chat(config.QWEN, "You name themes.", [{"role": "user", "content": STUDIO_MSG}], None, max_tokens=60)
    return round(time.time() - t0, 1), u.load_seconds


def main():
    out = {"run_at": time.time(), "cases": len(CASES), "models": {}}
    for label, model in MODELS:
        rows, right, loads, handoffs = [], 0, 0.0, []
        for said, ok in CASES:
            routed = router.route(said)
            r = one(model, said)
            hit = r["tool"] in ok
            right += hit
            loads += r["load"]
            secs, hload = handoff()
            handoffs.append(hload)
            rows.append({"said": said, "chose": r["tool"], "ok": hit, "seconds": r["seconds"], "load": r["load"],
                         "handoff_load": hload, "rules_route": (routed or {}).get("tool")})
            print(f"{label[:2]} {'ok ' if hit else 'MISS'} {r['tool'] or '(reply)':24} {r['seconds']:6.1f}s load {r['load']:5.1f}s "
                  f"handoff load {hload:5.1f}s | {said[:60]}", flush=True)
        out["models"][label] = {"model": model, "accuracy": round(right / len(CASES), 3), "conversation_load_seconds": round(loads, 1),
                                "handoff_load_seconds": round(sum(handoffs), 1),
                                "median_seconds": sorted(x["seconds"] for x in rows)[len(rows) // 2], "rows": rows}
    with open("/data/bakeoff_orchestration.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    for label, m in out["models"].items():
        print(f"{label}: accuracy {m['accuracy']:.0%}, median {m['median_seconds']} s, conversation loads {m['conversation_load_seconds']} s, "
              f"hand-off loads {m['handoff_load_seconds']} s")


if __name__ == "__main__":
    main()
