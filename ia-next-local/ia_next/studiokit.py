"""Evidence handling shared by the studio outputs (plan Part 6: S1 audio overview, S4 mind map, S7 data table, S8
infographic).

Each output is built from the engagement's manifest chunks (the second brain, secondbrain.material), not only from
the extracted findings: the 16 Nov recheck showed a data table built from findings alone lost the system names the
uploads hold. Every label, cell and spoken line carries the pointer of the passage it rests on and words copied from
that passage; this module checks those words against the passage before anything is drawn, tabulated or voiced, and
lets a number through only where the passage itself carries it (the Quantitative Claim Rule).
"""
import html
import re

from . import deck, secondbrain, store, verify

_QUOTE_MAP = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-",
                            " ": " "})
_NUM = re.compile(r"\d[\d,.]*%?")


def norm(s):
    """Lower case, one space, typographic quotes and dashes folded, outer punctuation dropped."""
    s = str(s or "").translate(_QUOTE_MAP)
    return re.sub(r"\s+", " ", s.lower()).strip(" .,;:\"'")


def scrub(s):
    """Display text: no em-dash characters, no markdown emphasis (deck._scrub, the format bans). Runs only after a
    quote has been checked, so the check always sees the words as the source wrote them."""
    return deck._scrub(s)


def load_material(eid, brief, budget=secondbrain.BUDGET_CHARS):
    """(goal, sources, chunks, by_pointer, evidence report) for the sources the person pointed at. Chunks without a
    manifest pointer (HiC down) get a local one, so every passage can still be cited and checked. Raises
    FileNotFoundError when the engagement has no analysed material."""
    from . import material                   # research, analysed uploads and Reddit listening alike (18 Nov)
    findings, sources, info = material.load(eid, {} if brief.get("source_ids") else material.wanted(brief))
    _, sources = deck.scope_material(findings, sources, brief.get("source_ids"))
    if not sources:
        raise FileNotFoundError("no analysed sources match this request")
    goal = brief.get("goal") or (store.get_engagement(eid) or {}).get("objective") or ""
    if info["required_ids"]:                 # every studio prompt reads the goal, so the requested sources ride with it
        goal = f"{goal}\n{material.instruction(info)}"
    chunks, evidence = secondbrain.material(eid, sources, goal, budget=budget, **material.prefer(info))
    by_ptr = {}
    for i, c in enumerate(chunks):
        p = c.get("pointer") or f"{c['source_id']}#local{i}"
        by_ptr[p] = dict(c, pointer=p)
    return goal, sources, list(by_ptr.values()), by_ptr, evidence


def passages_xml(chunks, each=2500):
    """The passages for a prompt, each tagged with its pointer, source id and title."""
    out = []
    for c in chunks:
        text = str(c.get("text") or "")[:each].replace("</passage", "</ passage")
        out.append(f'<passage pointer="{html.escape(c["pointer"])}" source="{html.escape(c["source_id"])}" '
                   f'title="{html.escape(c.get("title") or c["source_id"])}">{text}</passage>')
    return "\n".join(out)


def check_quote(quote, pointer, by_ptr, min_chars=6):
    """The verified evidence {quote, pointer, source_id, title} when `quote` is in the passage at `pointer`, else None.
    A quote copied across a table row narrows to its longest cell (verify.narrow_table_quote)."""
    c = by_ptr.get(str(pointer or "").strip())
    q = verify.narrow_table_quote(quote)
    if not c or len(norm(q)) < min_chars or norm(q) not in norm(c.get("text")):
        return None
    return {"quote": q.strip(), "pointer": c["pointer"], "source_id": c["source_id"], "title": c.get("title") or c["source_id"]}


def check_evidence(items, by_ptr):
    """Every verified entry of an evidence list, one per pointer."""
    out, seen = [], set()
    for e in items or []:
        if not isinstance(e, dict):
            continue
        ok = check_quote(e.get("quote"), e.get("pointer"), by_ptr)
        if ok and ok["pointer"] not in seen:
            seen.add(ok["pointer"])
            out.append(ok)
    return out


# A figure written in words is still a figure (19 Nov: a local mind map said "seven percent" and "a four-to-one
# ratio would save over one hundred million dollars" to get past the digits check). spelled_figures finds them and
# gives each its digits, so it is checked against the cited passage exactly like a number typed in digits.
_UNITS = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
          "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
          "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
          "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
_SCALES = {"hundred": 100, "thousand": 1_000, "million": 1_000_000, "billion": 1_000_000_000, "trillion": 1_000_000_000_000}
_W = "(?:" + "|".join(list(_UNITS) + list(_SCALES)) + ")"
_NUMWORDS = rf"{_W}(?:[\s-]+(?:and[\s-]+)?{_W})*"
_MEASURE = (r"(?:percent(?:age points?)?|per\s?cent|dollars?|euros?|pounds?|cents?|fold|times|x\b|hundred|thousand|million|billion|"
            r"trillion)")
_SPELLED = re.compile(rf"\b({_NUMWORDS})[\s-]+{_MEASURE}|\b({_NUMWORDS})[\s-]to[\s-]({_NUMWORDS})\b"
                      rf"|\b({_W}[\s-]+(?:and[\s-]+)?{_W}(?:[\s-]+(?:and[\s-]+)?{_W})*)\b", re.I)


def _to_int(words):
    total = cur = 0
    for w in re.findall(r"[a-z]+", words.lower()):
        if w in _UNITS:
            cur += _UNITS[w]
        elif w == "hundred":
            cur = (cur or 1) * 100
        elif w in _SCALES:
            total += (cur or 1) * _SCALES[w]
            cur = 0
    return total + cur


def spelled_figures(text):
    """[(the words as written, their digits)] for every figure spelled out in `text`: a number word with a measure
    ("seven percent", "one hundred million dollars"), a ratio ("four-to-one") or a compound number ("twenty five").
    A lone small number word ("two voices", "one advisor") is ordinary prose and is not a figure."""
    out = []
    for m in _SPELLED.finditer(str(text or "")):
        if m.group(1):
            out.append((m.group(0), str(_to_int(m.group(1)))))
        elif m.group(2):
            out.append((m.group(0), str(_to_int(m.group(2)))))
            out.append((m.group(0), str(_to_int(m.group(3)))))
        elif m.group(4) and _to_int(m.group(4)) >= 21:
            out.append((m.group(0), str(_to_int(m.group(4)))))
    return out


def numbers(text):
    """Every figure in `text`: typed in digits, or spelled out (as its digits)."""
    typed = [n.rstrip(".,") for n in _NUM.findall(str(text or "")) if n.rstrip(".,")]
    return typed + [digits for _, digits in spelled_figures(text)]


def numbers_supported(text, haystacks):
    """True when every number in `text` also appears in one of `haystacks` (verified quotes or cited passages)."""
    hay = [norm(h) for h in haystacks if h]
    return all(any(n in h for h in hay) for n in numbers(text))


def passage_texts(evidence, by_ptr):
    """The full text of the passages behind verified evidence (for names and years that sit outside the quote)."""
    return [by_ptr[e["pointer"]].get("text") or "" for e in evidence if e["pointer"] in by_ptr]


def sources_used(evidence_lists):
    """Distinct sources behind the evidence, in first-use order: [{source_id, title, pointers: [...]}]."""
    order, by = [], {}
    for ev in evidence_lists:
        for e in ev:
            s = by.get(e["source_id"])
            if not s:
                s = by[e["source_id"]] = {"source_id": e["source_id"], "title": e["title"], "pointers": []}
                order.append(e["source_id"])
            if e["pointer"] not in s["pointers"]:
                s["pointers"].append(e["pointer"])
    return [by[k] for k in order]


def sources_html(used):
    """The Sources list for a page: each named source with the passages it supplied."""
    e = html.escape
    rows = "".join(f'<li id="src-{e(s["source_id"])}"><span class="srcname">{e(scrub(s["title"]))}</span>'
                   # the pointers stay in the page as data; a reader sees how many passages were used (U4)
                   f'<span class="ptrs" data-pointers="{e(" ".join(s["pointers"]))}">'
                   f'{len(s["pointers"])} passage{"s" if len(s["pointers"]) != 1 else ""} used</span></li>' for s in used)
    return f'<section class="section sources"><p class="k">Sources</p><ol>{rows}</ol></section>' if rows else ""


SOURCES_CSS = (".sources ol{margin:8px 0 0;padding-left:20px;display:grid;gap:6px}"
               ".sources li{line-height:1.45}.srcname{display:block}"
               ".ptrs{display:block;font-size:12px;color:var(--muted);word-break:break-all}")
