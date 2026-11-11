"""The verification ladder (plan 6.5): cheapest checks first, then a judge from another vendor.

Rung 1, deterministic, no model: the format bans (em-dash, slop phrases, meta-narration), every [S#]
resolves to a collected source, every quoted passage appears verbatim in its cited source (the
scope-match rule's mechanical half), and no bare number stands outside a cited quote.
Rung 2, a model judge from a vendor different from the author, scoring a checklist drawn from the brief
(human-verified checklists beat overall impressions, plan 4.2).
A repair keeps the earlier version when the repaired one scores worse (OpenScholar, plan 4.1).
"""
import re

from . import config, providers

EM_DASH = "\u2014"
SLOP = [
    "paradigm shift", "game-changer", "holistic approach", "cutting-edge", "best-in-class", "leverage synergies",
    "robust solution", "seamless integration", "actionable insights", "thought leadership", "move the needle",
    "deep dive", "low-hanging fruit", "in today's rapidly evolving landscape", "it's important to note",
    "it's worth noting", "needless to say", "at the end of the day", "delve", "tapestry", "testament to",
    "meticulous", "pivotal role", "plays a crucial role", "unprecedented", "transformative", "revolutionary",
    "groundbreaking", "world-class", "overarching", "undergird", "fostering", "showcasing", "multifaceted",
]
META = ["this report", "this deck", "this slide", "in this section", "as you can see", "in conclusion", "to summarize",
        "based on the research", "the data indicates", "research shows", "studies show", "more research is needed"]
CITE_RE = re.compile(r"\[S(\d+)\]")
QUOTE_RE = re.compile(r"“([^”]{12,400})”|\"([^\"]{12,400})\"")
NUM_RE = re.compile(r"(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(%|percent|x\b|times\b|million|billion|USD|\$)?")


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def deterministic(text, sources):
    """Rung 1. sources: list of {id: 'S1', text, title}. Returns list of findings (empty = pass)."""
    findings = []
    low = (text or "").lower()
    if EM_DASH in text:
        findings.append({"rule": "em-dash", "detail": f"{text.count(EM_DASH)} em-dash characters"})
    for p in SLOP:
        if p in low:
            findings.append({"rule": "slop", "detail": p})
    for p in META:
        if p in low:
            findings.append({"rule": "meta-narration", "detail": p})
    by_id = {s["id"]: s for s in sources}
    cited = {f"S{n}" for n in CITE_RE.findall(text)}
    for c in sorted(cited - set(by_id)):
        findings.append({"rule": "unknown-citation", "detail": c})
    if sources and not cited:
        findings.append({"rule": "no-citations", "detail": "no [S#] citation anywhere"})
    # every quote must appear verbatim in the source cited right after it (or anywhere in the cited set)
    for m in QUOTE_RE.finditer(text):
        q = _norm(m.group(1) or m.group(2))
        tail = text[m.end(): m.end() + 40]
        cm = CITE_RE.search(tail)
        pool = [by_id[f"S{cm.group(1)}"]] if cm and f"S{cm.group(1)}" in by_id else [by_id[c] for c in cited if c in by_id]
        if not any(q in _norm(s.get("text", "")) for s in pool):
            findings.append({"rule": "quote-not-in-source", "detail": (m.group(1) or m.group(2))[:120]})
    # a number outside a quote is a naked number (Quantitative Claim Rule). The Sources list and URLs are
    # references, not claims (a live run flagged a filing URL's digits).
    body = re.split(r"(?im)^#{1,6}\s*sources\s*$", text)[0]
    stripped = re.sub(r"https?://\S+", " ", QUOTE_RE.sub(" ", body))
    for line in stripped.split("\n"):
        if line.lstrip().startswith("#"):
            continue
        for m in NUM_RE.finditer(line):
            n = m.group(1)
            if len(n) == 4 and n.startswith(("19", "20")) and not m.group(2):
                continue      # a year
            if re.fullmatch(r"\d", n) and not m.group(2):
                continue      # list counts and ordinals
            findings.append({"rule": "naked-number", "detail": line.strip()[:120]})
            break
    return findings


def judge_model_for(author_model):
    """A vendor different from the author's (plan 6.5)."""
    primary, secondary = config.SEATS["verifier"]["primary"], config.SEATS["verifier"]["secondary"]
    if config.vendor_of(primary) != config.vendor_of(author_model):
        return primary
    return secondary


JUDGE_SCHEMA = {
    "type": "object",
    "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {
        "criterion": {"type": "string"}, "pass": {"type": "boolean"}, "reason": {"type": "string"}},
        "required": ["criterion", "pass", "reason"]}}},
    "required": ["items"],
}


def checklist_for(brief):
    items = [
        "Answers the stated goal directly in the opening paragraph",
        "Every factual claim is supported by a cited source passage, and the wording does not go beyond what the passage says",
        "Names who acts in each claim (a team, a system, an organization), not abstract nouns",
        "States what remains uncertain by narrowing claims, never with QA notes such as 'evidence gap' or 'TBD'",
        "Plain, literal business language with no metaphors or slogans",
    ]
    for s in (brief.get("success") or [])[:5]:
        items.append(str(s))
    return items


def cited_excerpts(text, sources, window=700, head=600):
    """What the judge must see of each source: its opening plus the passage around every quote the
    document attributes to it. A live run showed a judge given only each page's first 1,200 characters
    failing quotes that sat further down the page and had passed the verbatim check."""
    by_id = {s["id"]: s for s in sources}
    wanted = {sid: [] for sid in by_id}
    for m in QUOTE_RE.finditer(text):
        q = (m.group(1) or m.group(2)).strip()
        cm = CITE_RE.search(text[m.end(): m.end() + 40])
        if cm and f"S{cm.group(1)}" in by_id:
            wanted[f"S{cm.group(1)}"].append(q)
    out = []
    for sid, s in by_id.items():
        body = s.get("text", "")
        parts = [body[:head]]
        low = _norm(body)
        for q in wanted[sid]:
            i = low.find(_norm(q))
            if i >= 0:
                parts.append("... " + re.sub(r"\s+", " ", body)[max(0, i - window // 2): i + len(q) + window // 2] + " ...")
        out.append(f"[{sid}] {s.get('title', '')}: " + "\n".join(parts))
    return "\n\n".join(out)


def judge(text, brief, sources, author_model, ledger):
    model = judge_model_for(author_model)
    # The judge reads every source in full when they fit (each is capped at 14,000 characters by the
    # Research Lead), so unquoted claims can be checked too; excerpts are the overflow path only.
    full = "\n\n".join(f"[{s['id']}] {s.get('title', '')}: {s.get('text', '')}" for s in sources[:20])
    src = full if len(full) <= 200_000 else cited_excerpts(text, sources[:20])
    checklist = checklist_for(brief)
    prompt = (f"You are an independent reviewer. Score the document against each criterion, using only the sources "
              f"given. Goal of the document: {brief.get('goal')}\nAudience: {brief.get('audience')}\n\nCRITERIA:\n"
              + "\n".join(f"- {c}" for c in checklist) + f"\n\nSOURCES:\n{src}\n\nDOCUMENT:\n{text[:30000]}\n\n"
              "Return JSON: {\"items\": [{\"criterion\", \"pass\", \"reason\"}]} with one item per criterion, in order.")
    # 2026-11-11 live run: at a 4,096-token cap the judge's own thinking used the budget and no JSON came
    # back. The cap is generous, and one retry follows a reply that is not JSON, naming the stop reason.
    data, last = None, ""
    for _attempt in range(2):
        if config.vendor_of(model) == "google":
            raw, _, full = providers.gemini_generate(model, prompt, ledger, json_schema=JUDGE_SCHEMA, max_output_tokens=24000)
            last = ((full.get("candidates") or [{}])[0]).get("finishReason", "")
        else:
            raw, _, _ = providers.openai_text(model, prompt + "\nReply with the JSON only.", ledger, max_output_tokens=16000)
        try:
            data = providers.parse_json(raw)
            break
        except ValueError:
            continue
    if data is None:
        raise providers.ProviderError(f"the verifier ({model}) returned no JSON verdict twice (stop reason {last or 'unknown'})")
    items = data.get("items") or []
    passed = sum(1 for i in items if i.get("pass"))
    return {"judge_model": model, "items": items, "score": round(passed / max(1, len(items)), 3)}


def score(findings, verdict):
    """One number for comparing a draft with its repair: judge score minus a penalty per finding."""
    return round((verdict or {}).get("score", 0) - 0.05 * len(findings), 3)
