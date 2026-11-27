"""Routing comparison for deferred tool loading (harness WS-H6). Run inside the app container when the app is idle:

    docker exec -i -e PYTHONPATH=/app -w /app ia-next-local python scripts/bakeoff_tools.py

Each request goes to the orchestration model twice: with every tool, and with deferred loading (core tools plus
find_tools; a find_tools call is run and the model asked again). The tool it ends up choosing is compared with the
expected one; prompt tokens and seconds are recorded. The router (hashtags, named outputs) is bypassed on purpose: this
measures the model's own choice. It waits whenever the app reports work in flight. Writes data/bakeoff_tools.json."""
import json
import os
import time

import httpx

from ia_next import agent, config, providers

CASES = [
    ("Make a deck on AI shopping assistants for the retail leadership team", "start_deck"),
    ("Write a research report on agentic checkout in retail", "start_research_report"),
    ("Map the journey of a shopper who uses an AI assistant to buy running shoes", "start_journey_map"),
    ("Draw a mind map of the main themes in the retail AI research", "start_diagram"),
    ("Build a prototype of an AI shopping assistant screen for a grocery app", "start_prototype"),
    ("Make a data table of retailers and the AI assistants they launched", "start_datatable"),
    ("Make an audio overview of the retail findings for my commute", "start_audio_overview"),
    ("Listen to what people on Reddit say about AI shopping assistants", "start_social_analysis"),
    ("Write a one-page brief on agentic checkout for the CFO", "start_artifact"),
    ("Find the main themes across the retail sources", "start_themes"),
    ("What is in my Library about Walmart and AI?", "recall"),
    ("What engagements do I have?", "list_engagements"),
    ("Remember that I prefer decks under fifteen slides", "remember"),
    ("Read me the finished retail report", "read_report"),
    ("Stop the deck that is running", "stop_task"),
]


def idle():
    try:
        return not httpx.get("http://127.0.0.1:" + os.environ.get("IA_NEXT_PORT", "9460") + "/api/busy", timeout=10).json().get("busy")
    except Exception:
        return True


def wait_idle():
    while not idle():
        time.sleep(30)


def ask(system, messages, tools):
    led = providers.Ledger(limit_usd=1.0, purpose="bakeoff")
    t0 = time.time()
    text, usage, resp = providers.claude(config.SEATS["orchestration"]["primary"], system, messages, led, tools=tools,
                                         max_tokens=700, effort="medium")
    uses = [b for b in resp.content if getattr(b, "type", None) == "tool_use"]
    return (uses[0] if uses else None), round(time.time() - t0, 1), getattr(usage, "input_tokens", 0)


def run_case(system, said, deferred):
    agent.LOADED_TOOLS.set(set())
    tools = agent.step_tools(agent.TOOLS) if deferred else agent.TOOLS
    msgs = [{"role": "user", "content": said}]
    use, secs, tok = ask(system, msgs, tools)
    steps = [use.name if use else None]
    if deferred and use is not None and use.name == "find_tools":
        found = agent.find_tools((use.input or {}).get("query") or said)
        msgs += [{"role": "assistant", "content": [{"type": "tool_use", "id": use.id, "name": use.name, "input": use.input}]},
                 {"role": "user", "content": [{"type": "tool_result", "tool_use_id": use.id, "content": json.dumps(found)}]}]
        use, s2, t2 = ask(system, msgs, agent.step_tools(agent.TOOLS))
        secs, tok = secs + s2, tok + t2
        steps.append(use.name if use else None)
    return {"chosen": steps[-1], "steps": steps, "seconds": secs, "input_tokens": tok}


def main():
    conv = agent.Conversation("conv_bakeoff")
    rows = []
    for said, want in CASES:
        row = {"request": said, "expected": want}
        for mode, deferred in (("full", False), ("deferred", True)):
            wait_idle()
            prev = agent.DEFERRED_TOOLS
            agent.DEFERRED_TOOLS = deferred
            try:
                row[mode] = run_case(conv.system, said, deferred)
            except Exception as e:
                row[mode] = {"chosen": None, "error": f"{type(e).__name__}: {str(e)[:160]}"}
            finally:
                agent.DEFERRED_TOOLS = prev
        rows.append(row)
        print(json.dumps({k: (v if not isinstance(v, dict) else {x: v.get(x) for x in ("chosen", "seconds", "input_tokens")})
                          for k, v in row.items()}), flush=True)
    summary = {mode: {"correct": sum(1 for r in rows if r[mode].get("chosen") == r["expected"]), "of": len(rows),
                      "mean_seconds": round(sum(r[mode].get("seconds") or 0 for r in rows) / len(rows), 1),
                      "mean_input_tokens": int(sum(r[mode].get("input_tokens") or 0 for r in rows) / len(rows))}
               for mode in ("full", "deferred")}
    out = {"at": time.time(), "summary": summary, "rows": rows}
    with open(os.path.join(config.DATA_DIR, "bakeoff_tools.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
