"""The house prose rules applied in code to text a model wrote (field test 2026-11-23, U7).

The field test shipped "unprecedented", "leveraging" and "cutting-edge" in themes, a journey map and a report whose
deterministic check had found "transformative" and scored 0.95 anyway. Finding a banned phrase is not enough: it is
repaired here, before anything is scored or shown. `scrub(text)` returns the repaired text; `found(text)` lists what a
text still holds, for the scorecard. Quotes are never passed through this: a quote is the source's words.

The lists follow .claude/CLAUDE.md (banned slop phrases, format tells) and HiC's slidePostProcessor. Only repairs that
keep a sentence grammatical are made; a phrase that cannot be swapped safely is reported by `found` instead.
"""
import re

# word or phrase -> plain replacement ("" removes it and the space before it)
_SWAP = [
    (r"\butili[sz]e(s|d)?\b", lambda m: "use" + (m.group(1) or "")), (r"\butili[sz]ing\b", "using"),
    (r"\bleverag(?:e|es)\b(?! (?:ratio|buyout))", "use"), (r"\bleveraged\b(?! (?:buyout|loan|finance))", "used"),
    (r"\bleveraging\b", "using"),
    (r"\bcutting[- ]edge\b", "new"), (r"\bstate[- ]of[- ]the[- ]art\b", "current"), (r"\bbest[- ]in[- ]class\b", "leading"),
    (r"\bworld[- ]class\b", "leading"), (r"\bgame[- ]chang(?:er|ing)\b", "major change"),
    (r"\b(?:an )?unprecedented\b ?", ""), (r"\btransformative\b ?", ""), (r"\brevolutionary\b ?", ""),
    (r"\bgroundbreaking\b ?", ""), (r"\btrailblazing\b ?", ""),
    (r"\bseamless(ly)?\b", lambda m: "smooth" + (m.group(1) or "")), (r"\brobust\b", "strong"),
    (r"\bholistic\b", "whole"), (r"\bsynerg(?:y|ies)\b", "combined effect"),
    (r"\bdelv(?:e|es) into\b", "examines"), (r"\bdelving into\b", "examining"),
    (r"\bfoster(s|ed)?\b", lambda m: "build" + {"s": "s", "ed": "t"}.get(m.group(1) or "", "")), (r"\bfostering\b", "building"),
    (r"\bbolster(s|ed)?\b", lambda m: "strengthen" + (m.group(1) or "")), (r"\bbolstering\b", "strengthening"),
    (r"\bfacilitat(?:e|es)\b", "help"), (r"\bfacilitating\b", "helping"),
    (r"\bshowcas(?:e|es)\b", "show"), (r"\bshowcasing\b", "showing"),
    (r"\bgarner(s|ed)?\b", lambda m: "gain" + (m.group(1) or "")),
    (r"\bmeticulous(ly)?\b", lambda m: "careful" + (m.group(1) or "")),
    (r"\bmultifaceted\b", "varied"), (r"\bparamount\b", "essential"), (r"\bpivotal\b", "central"),
    (r"\bintricate\b", "complex"), (r"\bintricacies\b", "details"), (r"\bvibrant\b ?", ""),
    (r"\bplays? a (?:pivotal|crucial|key|vital) role in\b", "shapes"),
    (r"\bserves? as\b", "is"), (r"\bstands? as\b", "is"),
    (r"\bin today'?s (?:rapidly evolving |fast[- ]changing |ever[- ]changing )?(?:landscape|world|environment),? ?", ""),
    (r"\bit(?:'s| is) (?:important|worth) (?:to note|noting) that ?", ""), (r"\bit should be noted that ?", ""),
    (r"\bneedless to say,? ?", ""), (r"\bat the end of the day,? ?", ""), (r"\bmoving forward,? ?", ""),
    (r"\bgoing forward,? ?", ""), (r"\bin terms of\b", "in"), (r"\bwhen it comes to\b", "for"),
    (r"\bactionable insights\b", "findings"), (r"\bvaluable insights\b", "findings"), (r"\bdeep dive\b", "close look"),
    # process references: the claim stays, the announcement of where it came from goes
    (r"\b(?:the )?(?:research|studies|evidence|data|findings|analysis) (?:shows?|indicates?|suggests?|reveals?|finds?) that ?", ""),
    (r"\bbased on (?:the|our) (?:research|analysis|findings|evidence|data),? ?", ""),
    # a heading or sentence that opens "Research shows mixed outcomes ..." keeps its claim: "Mixed outcomes ..."
    (r"(?:^|(?<=[.!?] ))(?:the )?(?:research|studies|evidence) (?:shows?|indicates?|suggests?|reveals?|finds?) (?!that\b)", ""),
    (r"\blearning ecosystems?\b", "learning environment"), (r"\becosystems\b", "systems"), (r"\becosystem\b", "system"),
    (r"\bparadigm shift\b", "change"), (r"\b(?:fundamental|seismic) shift\b", "change"),
    (r"\boverarching\b ?", ""), (r"\bundergird(?:s|ing)?\b", "supports"),
    (r"\b(the|today's|the current|the broader|the wider) (\w+ )?landscape\b",
     lambda m: m.group(0)[:-len("landscape")] + ("market" if (m.group(2) or "").strip().lower() in ("", "competitive", "vendor", "business") else "field")),
    (r"\bunlock(s|ed)?\b", lambda m: "release" + {"s": "s", "ed": "d"}.get(m.group(1) or "", "")), (r"\bunlocking\b", "releasing"),
]
_SWAPS = [(re.compile(rx, re.I), sub) for rx, sub in _SWAP]
# reported, not repaired: removing them would break the sentence
_REPORT = re.compile(r"(?i)\b(tapestry|testament|landscape of|ecosystem|nestled|embod(?:y|ies)|epitomi[sz]es?|"
                     r"not just [^.,;]{3,40}, (?:it'?s|but)|let'?s (?:dive|explore)|in conclusion|to summari[sz]e|"
                     r"as an ai|studies show|research (?:shows|indicates)|more research is needed)\b")


def _keep_case(old, new):
    return new[:1].upper() + new[1:] if old[:1].isupper() and new else new


def scrub(text):
    """The text with em-dashes and the banned words repaired. Safe to call on any model-written field."""
    t = str(text or "")
    if not t:
        return t
    t = re.sub(r"\s*[—―]\s*", ", ", t)                      # em-dash: the most reliable tell
    t = re.sub(r"[\U0001D400-\U0001D7FF]", "", t)                     # mathematical bold and italic letters
    for rx, sub in _SWAPS:
        if callable(sub):
            t = rx.sub(lambda m, s=sub: _keep_case(m.group(0), s(m)), t)
        else:
            t = rx.sub(lambda m, s=sub: _keep_case(m.group(0), s), t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r" ([,.;:!?])", r"\1", t)
    t = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    return t.strip()


def found(text):
    """The banned words and phrases a text still holds (after scrub, only those that cannot be swapped safely)."""
    t = str(text or "")
    hits = [m.group(0).lower() for rx, _ in _SWAPS for m in rx.finditer(t) if m.group(0).strip()]
    hits += [m.group(0).lower() for m in _REPORT.finditer(t)]
    if "—" in t:
        hits.append("em-dash")
    return sorted(set(h.strip() for h in hits))
