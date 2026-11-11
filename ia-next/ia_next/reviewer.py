"""The background memory reviewer (plan 6.4, from Hermes and OpenClaw in 3.5).

After every few conversation turns a small, cheap model (the `fast` seat's Haiku 5.5, fastest and
cheapest in the 2026-11-11 bake-off) reads only what the PERSON said in those turns and proposes durable
facts about the person or their work as candidate notes. Rules:
- it reads the person's own words only, never tool results or web text, so nothing a web page says can
  become memory (untrusted content is never promoted);
- a candidate is stored, never injected; it reaches MEMORY.md only through memory.consolidate()'s gate
  (score, repeated recall by distinct queries, a source line, at most a quarter of entries lost);
- the reviewer may only add candidates; edits and removals are the person's.
"""
import json
import threading

from . import config, memory, providers, store

EVERY_N_TURNS = 4
SCHEMA = {"type": "object", "additionalProperties": False, "required": ["notes"],
          "properties": {"notes": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                                                "required": ["text", "score", "quote"],
                                                                "properties": {"text": {"type": "string"}, "score": {"type": "number"},
                                                                               "quote": {"type": "string"}}}}}}
_counts = {}
_LOCK = threading.Lock()


def person_lines(messages):
    """The person's own words from a conversation; tool results and assistant turns are excluded."""
    out = []
    for m in messages:
        if m.get("role") != "user":
            continue
        c = m.get("content")
        if isinstance(c, str):
            out.append(c)
        elif isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "text" and not b.get("text", "").startswith("(Two steps remain"):
                    out.append(b["text"])
    return out


def review(cid, messages, call=None):
    """Propose candidate notes from the person's words. Returns the candidates proposed."""
    lines = person_lines(messages)[-EVERY_N_TURNS * 2:]
    if not lines:
        return []
    call = call or providers.claude
    system = ("Read what a person said to their research assistant. Propose at most three durable facts worth remembering "
              "across future work: their preferences, standing instructions, recurring clients or projects. Skip one-off requests "
              "and anything about a single task. For each, give the fact in one sentence, a score from 0 to 1 for how durable and "
              "useful it is, and the person's exact words that support it. If nothing qualifies, return an empty list.")
    text, _, _ = call(config.SEATS["fast"]["secondary"], system, [{"role": "user", "content": "\n".join(f"- {l}" for l in lines)}],
                      providers.Ledger(limit_usd=0.05), max_tokens=2000, effort="low", json_schema=SCHEMA)
    proposed = []
    for n in providers.parse_json(text).get("notes", [])[:3]:
        quote = str(n.get("quote") or "")
        if not quote or not any(quote.strip().lower() in l.lower() for l in lines):
            continue                                  # a note must quote the person's own words verbatim
        proposed.append(memory.propose(n["text"], float(n.get("score", 0)), f"conversation {cid}: \"{quote[:160]}\"", untrusted=False))
    if proposed:
        store.event("memory_candidates", {"conversation": cid, "count": len(proposed)})
    return proposed


def after_turn(cid, messages, call=None):
    """Count turns per conversation and run the reviewer in the background every EVERY_N_TURNS."""
    with _LOCK:
        _counts[cid] = _counts.get(cid, 0) + 1
        due = _counts[cid] % EVERY_N_TURNS == 0
    if due:
        snapshot = json.loads(json.dumps(messages, default=str))

        def work():
            _safe(review, cid, snapshot, call)
            _safe(memory.consolidate)                 # promotion pass: only notes that clear the gate move
        threading.Thread(target=work, daemon=True).start()
    return due


def _safe(fn, *a):
    try:
        fn(*a)
    except Exception as e:
        store.event("reviewer_error", {"error": str(e)[:200]})
