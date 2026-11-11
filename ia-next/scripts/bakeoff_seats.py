"""Seat bake-offs for the held seats (plan 6.10 step 4), run inside the ia-next container.

    docker exec -e PYTHONPATH=/app ia-next python /tmp/bakeoff_seats.py <research_task_id>

deep_reasoning: write a short cited diagnosis from verified findings; scored by the deterministic rung
                and a judge from another vendor.
research:       findings extraction over the collected sources (same metric as bakeoff_analysis.py).
search:         grounded web search; readable sources returned and distinct domains.
fast:           intent routing on a labeled set of requests; accuracy and latency.
One run per model: a first reading, not a verdict. Writes bakeoff_seats.json in the engagement.
"""
import json
import sys
import time
from urllib.parse import urlparse

from ia_next import providers, store, studio, verify

INTENTS = ["research_report", "journey_map", "deck", "social", "prototype", "recall", "other"]
LABELED = [
    ("Find out how hospitals are using AI scribes this year and write me a brief", "research_report"),
    ("Map the journey of a first-year student applying for co-op", "journey_map"),
    ("Turn that research into slides for the board", "deck"),
    ("What are people on Reddit saying about our competitor's new app?", "social"),
    ("Build a clickable mock of the advisor dashboard", "prototype"),
    ("What did we decide last week about the methodology appendix?", "recall"),
    ("Thanks, that's all for now", "other"),
    ("Pull together evidence on four-day work weeks in professional services", "research_report"),
    ("Show the steps a patient goes through from referral to first appointment", "journey_map"),
    ("Make a short presentation from the findings for the managing partner", "deck"),
    ("Analyze sentiment in r/personalfinance about robo-advisors", "social"),
    ("Do you remember which brand colors the client prefers?", "recall"),
]


def deep_reasoning(model, brief, findings, sources, led):
    fl = "\n".join(f"- [{f['source_id']}] {f['claim']} | quote: \"{f['quote']}\"" for f in findings)
    system = ("Write a diagnosis of about 150 words for a managing partner: name the central challenge and one guiding policy "
              "(a decision, not a goal). Cite every claim with [S#]. Numbers only inside quotes. No em-dash characters.")
    msg = f"Goal: {brief['goal']}\n\nFINDINGS:\n{fl}"
    t0 = time.time()
    if model.startswith("claude-"):
        text, _, _ = providers.claude(model, system, [{"role": "user", "content": msg}], led, max_tokens=16000, effort="high")
    else:
        text, _, _ = providers.openai_text(model, msg, led, system=system, max_output_tokens=8000)
    secs = round(time.time() - t0, 1)
    f = verify.deterministic(text, sources)
    v = verify.judge(text, dict(brief, success=["Names one central challenge", "States one guiding policy that is a decision"]), sources, model, led)
    return {"model": model, "seconds": secs, "deterministic_findings": len(f), "judge": v["judge_model"], "judge_score": v["score"],
            "score": verify.score(f, v), "words": len(text.split())}


def search(model, brief, led):
    t0 = time.time()
    _, _, raw = providers.gemini_generate(model, f"Research: {brief['goal']}. Cite named sources.", led, search=True, max_output_tokens=4096)
    secs = round(time.time() - t0, 1)
    chunks = (((raw.get("candidates") or [{}])[0]).get("groundingMetadata") or {}).get("groundingChunks") or []
    readable, domains = 0, set()
    for ch in chunks[:10]:
        uri = (ch.get("web") or {}).get("uri")
        if not uri:
            continue
        body, final = studio._page_text(uri)
        if len(body) >= 400:
            readable += 1
            domains.add(urlparse(final).netloc)
    return {"model": model, "seconds": secs, "grounding_chunks": len(chunks), "readable_sources": readable, "distinct_domains": len(domains)}


def fast(model, led):
    prompt = ("Classify the request into exactly one label: " + ", ".join(INTENTS) + ". Reply with the label only.\nRequest: ")
    right, secs = 0, []
    for text, label in LABELED:
        t0 = time.time()
        if model.startswith("claude-"):
            out, _, _ = providers.claude(model, None, [{"role": "user", "content": prompt + text}], led, max_tokens=2000, effort="low")
        elif model.startswith("gpt-"):
            out, _, _ = providers.openai_text(model, prompt + text, led, max_output_tokens=400)
        else:
            out, _, _ = providers.gemini_generate(model, prompt + text, led, max_output_tokens=400)
        secs.append(time.time() - t0)
        right += int(out.strip().lower().strip(".`'\" ") == label)
    return {"model": model, "accuracy": round(right / len(LABELED), 3), "mean_seconds": round(sum(secs) / len(secs), 2)}


def main():
    t = store.get_task(sys.argv[1])
    eid, brief = t["engagement_id"], t["brief"]
    findings = json.load(open(store.safe_path(eid, "results/findings.json"), encoding="utf-8"))["findings"]
    sources = json.load(open(store.safe_path(eid, "results/sources.json"), encoding="utf-8"))["sources"]
    out = {"run": time.strftime("%Y-%m-%d %H:%M"), "task": t["id"], "note": "One run per model: a first reading, not a verdict.", "seats": {}}
    plan = {
        "deep_reasoning": [("claude-fable-5-2", lambda m, l: deep_reasoning(m, brief, findings, sources, l)),
                           ("claude-opus-5-5", lambda m, l: deep_reasoning(m, brief, findings, sources, l)),
                           ("gpt-6-astra", lambda m, l: deep_reasoning(m, brief, findings, sources, l))],
        "search": [("gemini-4-argon", lambda m, l: search(m, brief, l)), ("gemini-3.5-flash", lambda m, l: search(m, brief, l))],
        "fast": [("gpt-6-luna", fast), ("claude-haiku-5-5", fast), ("gemini-3.5-flash", fast)],
    }
    for seat, runs in plan.items():
        rows = []
        for model, fn in runs:
            led = providers.Ledger(limit_usd=2.0)
            try:
                r = fn(model, led)
            except Exception as e:
                r = {"model": model, "error": str(e)[:300]}
            r["usd"] = led.spent_usd
            rows.append(r)
            print(seat, json.dumps(r))
        out["seats"][seat] = rows
    with open(store.safe_path(eid, "results/bakeoff_seats.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print("WROTE results/bakeoff_seats.json")


if __name__ == "__main__":
    main()
