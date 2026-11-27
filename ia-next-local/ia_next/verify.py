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
QUOTE_RE = re.compile(r"“([^”]{12,600})”|\"([^\"]{12,600})\"")
NUM_RE = re.compile(r"(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(%|percent|x\b|times\b|million|billion|USD|\$)?")


_FOLD = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201a": "'", "\u2032": "'", "\u201c": "'", "\u201d": "'", '"': "'",
                       "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u00a0": " ", "\u202f": " ", "\u2009": " "})


def _norm(s):
    """Text as compared for a verbatim check: lower case, one space, and typography folded. 2026-11-19 replay of a
    failed local report: all nine "quote not in source" findings were real quotes from the cited source. The source
    had curly apostrophes and the report straight ones, an inner quotation changed quote style, and one source had a
    stray space before a full stop. The words must match exactly; the shape of a quote mark or a dash need not."""
    s = re.sub(r"\s+", " ", (s or "").translate(_FOLD).lower()).strip()
    return re.sub(r"\s+([.,;:!?])", r"\1", s)


def narrow_table_quote(quote, min_chars=20):
    """A quote copied across a table row ("Production readiness | ITS can name a source owner ...") reads as broken
    text: uploaded tables arrive as cells joined by "|". The quote narrows to its longest cell, which is still verbatim
    (it is part of the verbatim quote); "" when no cell is long enough to stand as a quote. 17 Nov themes page."""
    q = str(quote or "").strip()
    if "|" not in q:
        return q
    best = max((c.strip(" .,;:") for c in q.split("|")), key=len, default="")
    return best if len(best) >= min_chars else ""


def deterministic(text, sources):
    """Rung 1. sources: list of {id: 'S1', text, title}. Returns list of findings (empty = pass)."""
    findings = []
    low = (text or "").lower()
    # An em-dash inside a cited source's own title, or in the Sources list, is the source's typography, not the
    # writer's (same replay: both em-dashes sat in two publication titles).
    prose = re.split(r"(?im)^#{1,6}\s*sources\s*$", text)[0]
    for s in sources:
        title = " ".join(str(s.get("title") or "").split())
        if EM_DASH in title:
            prose = prose.replace(title, " ")
    # A verbatim quote is the source's wording, not the writer's: its em-dash or its "groundbreaking" is evidence, and
    # must stay exactly as written (19 Nov: a report was marked down for both, each inside a checked quote).
    own = QUOTE_RE.sub(" ", prose)
    own_low = own.lower()
    if EM_DASH in own:
        findings.append({"rule": "em-dash", "detail": f"{own.count(EM_DASH)} em-dash characters"})
    for p in SLOP:
        if p in own_low:
            findings.append({"rule": "slop", "detail": p})
    for p in META:
        if p in own_low:
            # "to summarize" is banned as a way to open a sentence, not as the verb in "they use it to summarize papers"
            if p == "to summarize" and not re.search(r"(?:^|[.!?:;]\s+|\n\s*)to summarize\b\s*[,:]", own_low):
                continue
            findings.append({"rule": "meta-narration", "detail": p})
    by_id = {s["id"]: s for s in sources}
    cited = {f"S{n}" for n in CITE_RE.findall(text)}
    for c in sorted(cited - set(by_id)):
        findings.append({"rule": "unknown-citation", "detail": c})
    if sources and not cited:
        findings.append({"rule": "no-citations", "detail": "no [S#] citation anywhere"})
    # every quote must appear verbatim in the source cited right after it (or anywhere in the cited set)
    for m in QUOTE_RE.finditer(text):
        # the quote's own closing punctuation is the writer's sentence end, not the source's words (same replay: a
        # quote ended with a full stop where the source went on with a comma)
        q = _norm(m.group(1) or m.group(2)).rstrip(" .,;:!?'")
        tail = text[m.end(): m.end() + 40]
        cm = CITE_RE.search(tail)
        pool = [by_id[f"S{cm.group(1)}"]] if cm and f"S{cm.group(1)}" in by_id else [by_id[c] for c in cited if c in by_id]
        if not any(q in _norm(s.get("text", "")) for s in pool):
            findings.append({"rule": "quote-not-in-source", "detail": (m.group(1) or m.group(2))[:120]})
    # a number outside a quote is a naked number (Quantitative Claim Rule). The Sources list and URLs are
    # references, not claims (a live run flagged a filing URL's digits).
    body = re.split(r"(?im)^#{1,6}\s*sources\s*$", text)[0]
    stripped = re.sub(r"https?://\S+", " ", QUOTE_RE.sub(" ", body))
    # A cited source's own title is a reference too ("HR Tech 2026", "Top 50 Search Firms"): its digits are not the
    # writer's claim (16 Nov audit: the writer spelled years out inside titles to dodge this rule).
    for s in sources:
        title = " ".join(str(s.get("title") or "").split())
        if len(title) >= 8 and re.search(r"\d", title):
            stripped = re.sub(re.escape(title), " ", stripped, flags=re.I)
    # ... and so is a publisher's name ("Digital Commerce 360", "Retail TouchPoints 2.0"): 26 Nov, the attribution line
    # "> Digital Commerce 360, November 2026: [S8]" was flagged, set off a full rewrite of the report, and stayed open
    pubs = {" ".join(str(s.get("publisher") or "").split()) for s in sources}
    pubs |= {" ".join(str(s.get("title") or "").split(":", 1)[0].split()) for s in sources if ":" in str(s.get("title") or "")}
    for pub in sorted((p for p in pubs if len(p) >= 4 and re.search(r"\d", p)), key=len, reverse=True):
        stripped = re.sub(r"(?<!\w)" + re.escape(pub) + r"(?!\w)", " ", stripped, flags=re.I)
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
        else:
            from . import studiokit
            if studiokit.spelled_figures(line):          # a figure spelled out in words is still the writer's figure
                findings.append({"rule": "naked-number", "detail": line.strip()[:120]})
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
    if brief.get("checklist"):                 # a format with its own bar (a quiz is not judged as a report)
        return list(brief["checklist"])
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
    # IA Next Local: the full-text path is for sources that fit a 32K context with the document; past that the judge
    # reads the passages around each cited quote (the overflow path IA Next already had)
    src = full if len(full) <= 30_000 else cited_excerpts(text, sources[:20])
    checklist = checklist_for(brief)
    prompt = (f"You are an independent reviewer. Score the document against each criterion, using only the sources "
              f"given. Goal of the document: {brief.get('goal')}\nAudience: {brief.get('audience')}\n\nCRITERIA:\n"
              + "\n".join(f"- {c}" for c in checklist) + f"\n\nSOURCES:\n{src}\n\nDOCUMENT:\n{text[:30000]}\n\n"
              "Return JSON: {\"items\": [{\"criterion\", \"pass\", \"reason\"}]} with one item per criterion, in order.")
    # 2026-11-11 live run: at a 4,096-token cap the judge's own thinking used the budget and no JSON came
    # back. The cap is generous, and one retry follows a reply that is not JSON, naming the stop reason.
    data, last = None, ""
    for _attempt in range(2):
        if config.LOCAL or config.vendor_of(model) == "google":      # local judges always answer to the schema
            raw, _, full = providers.gemini_generate(model, prompt, ledger, json_schema=JUDGE_SCHEMA, max_output_tokens=4000)
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
