#!/usr/bin/env python
"""validate_journey_overview_slide.py — Stop hook (guardrail layer).

Runs at Stop on every Claude turn whose tool output includes a journey-typed
slide deck. Rejects the output if any of the following three rules fails,
returning a structured rejection that the calling agent must respond to.

Architecture position:
  - SKILL (`.claude/skills/diagrams/journey-illustrator/SKILL.md` §13) is the
    PER-DELIVERABLE EXPERT — it tells the model HOW to compose a journey deck.
  - HOOK (this file) is the GUARDRAIL — it inspects the rendered output and
    enforces the contract regardless of whether the model followed it.
  - The two layers are complementary: skill = first line of instruction;
    hook = last line of defense before the user sees the slop.

Rules enforced:

  R1 (overview-diagram MANDATE):
      Among slides at positions 1..3, at least ONE slide MUST contain
      either a `.nxt-process` class or a `.nxt-grid` of `.nxt-card` AND
      reference at least 80% of the phase names that appear in the deck's
      per-phase slides. If the deck has 7 phases the overview slide must
      name at least 6 of them.

  R2 (metaphor-title BAN):
      No slide title may match any of the METAPHOR_TITLE_PATTERNS (clock,
      journey-as-metaphor, war/sports, anthropomorphism, hyperbole).

  R3 (structure-description / reading-instruction BAN):
      No slide content may match the META_KICKER_PATTERNS list (HOW TO READ
      THIS, One frame per phase, evidenced by X voices, Each row represents,
      etc.). These describe the artifact's structure rather than carrying
      its content.

The hook reads the Stop tool output looking for any of:
  - inline `:::slide template=…` fenced blocks in chat replies
  - a JSON SlideData[] payload
  - rendered HTML containing `<section class="nxt-slide …">`

If any are present AND the deck appears to be journey-typed, the hook runs
all three rules and returns either:
  {"ok": true}                # all rules pass; turn completes normally
  {"ok": false, "block": ...} # rules failed; agent must fix and retry
"""
from __future__ import annotations

import json
import re
import sys
from typing import Any


# ---------------------------------------------------------------------------
# Pattern lists — keep in sync with services/slidePostProcessor.ts
# ---------------------------------------------------------------------------

METAPHOR_TITLE_PATTERNS = [
    # Clock / time-as-actor
    r"\b(the|a)?\s*clock\s+(is|starts|begins|runs|keeps|will be|has been|was already)\s+(ticking|running|already running|out of time)",
    r"\b(running|ticking|sands? of time|hourglass)",
    r"\b(time|window|deadline|clock|opportunity)\s+(is|was|has)\s+(running out|closing|slipping|narrowing|tight|short)",
    # Anthropomorphism of abstract nouns
    r"\b(the\s+)?(prep|preparation|process|system|institution|workflow|pipeline|strategy|approach|model|data|evidence|research|corpus|landscape|gap|tension|challenge|opportunity|culture|brand)\s+(feels|wants|demands|cries out for|begs for|calls for|asks for|knows|expects|hopes|fears)",
    # Journey-as-metaphor (specifically banned in a JOURNEY deliverable — too on-the-nose)
    r"\b(the\s+)?(road|path|crossroads|bridge|milestone|chapter|turning point|inflection point|fork in the road|long road|winding road|road ahead|road less travel)",
    # War / sports
    r"\b(battle|war|fight|trench|battlefield|arms race|playbook|game plan|home run|slam dunk|moving the goalposts|tip of the spear)",
    # Construction
    r"\b(lay(ing)?\s+(the\s+)?(foundation|groundwork|cornerstone)|building\s+blocks?|cornerstone\s+of|pillar(s)?\s+of)",
    # Hyperbole
    r"\b(unprecedented|paradigm[\s-]shift|seismic|game[\s-]chang(er|ing)|revolutionary|once[\s-]in[\s-]a[\s-](generation|lifetime))",
    r"\bthe\s+(single\s+)?most\s+(important|critical|essential|fundamental|consequential)\s+\w+\s+(of|in|for)",
]

META_KICKER_PATTERNS = [
    r"\bhow\s+to\s+read\s+(this|below|above|the\s+(slide|chart|diagram|map|deck))",
    r"\b(reading|interpretation|navigation)\s+guide",
    r"\bone\s+(frame|row|column|tile|card|cell|slide|panel|block|swimlane|lane)\s+per\s+(phase|stage|theme|persona|recommendation|item|category)",
    r"\b(each|every)\s+(frame|row|column|tile|card|cell|slide|panel|block|swimlane|lane)\s+(represents|shows|captures|maps to|depicts|illustrates)",
    r"\bthe\s+(chart|diagram|map|table|figure|graphic|slide)\s+(below|above|on the (left|right))",
    r"\b(evidenced|grounded|anchored|substantiated)\s+by\s+(student|user|expert|stakeholder|interview|reddit|forum)\s+(voices|posts|comments|threads|narratives|input)",
]


# ---------------------------------------------------------------------------
# Deck shape detection
# ---------------------------------------------------------------------------

def is_journey_deck(text: str) -> bool:
    """Returns True if the output looks like a journey-typed slide deck.
    Heuristic: explicit '#journey' OR a SlideData payload with template
    matching a journey-related template OR a rendered HTML body containing
    journey-stage markers (phase/persona/touchpoint)."""
    t = text.lower()
    if "#journey" in t:
        return True
    if re.search(r"template\s*=\s*[\"']?(journey|phase-row|swimlane)[\"']?", t):
        return True
    if "nxt-slide" in t and ("phase" in t or "journey" in t) and "slide" in t:
        return True
    return False


def extract_slides(text: str) -> list[dict[str, Any]]:
    """Extract every slide-like block from the output. Three sources:
      - :::slide ... ::: fenced JSON blocks
      - rendered <section class="nxt-slide ..."> HTML fragments
      - SlideData[] JSON arrays under a `slides` key
    Returns a list of {title, content, position, raw} dicts."""
    slides: list[dict[str, Any]] = []
    pos = 0

    # 1. ::: slide JSON blocks
    for m in re.finditer(r":::slide(?:\s+\w+=[a-z-]+)*\s*\n([\s\S]*?):::", text):
        body = m.group(1).strip()
        try:
            j = json.loads(body)
            pos += 1
            slides.append({
                "position": pos,
                "title": str(j.get("title") or j.get("kicker") or "").strip(),
                "content": " ".join(str(c) for c in (j.get("content") or []) if c),
                "raw": body,
                "html_class": j.get("template") or "",
            })
        except Exception:
            pass

    # 2. Rendered nxt-slide HTML sections
    for m in re.finditer(r'<section[^>]*class="[^"]*nxt-slide[^"]*"[^>]*>([\s\S]*?)</section>', text, re.IGNORECASE):
        section = m.group(0)
        body = m.group(1)
        pos += 1
        title_m = re.search(r'<h[1-3][^>]*>([\s\S]*?)</h[1-3]>', body)
        title = re.sub(r"<[^>]+>", "", (title_m.group(1) if title_m else "")).strip()
        text_only = re.sub(r"<[^>]+>", " ", body)
        text_only = re.sub(r"\s+", " ", text_only).strip()
        slides.append({
            "position": pos,
            "title": title,
            "content": text_only,
            "raw": section,
            "html_class": " ".join(re.findall(r'class="([^"]*)"', section)),
        })

    return slides


def detect_phase_names(slides: list[dict[str, Any]]) -> list[str]:
    """Pick out phase names from per-phase deep-dive slides. Heuristic:
    a slide whose title starts with a phase-number kicker (PHASE 01, PHASE
    ONE, Stage 02) or matches a known phase-name register."""
    out: list[str] = []
    PHASE_RE = re.compile(r"\bphase\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b", re.IGNORECASE)
    STAGE_RE = re.compile(r"\bstage\s+(\d+)\b", re.IGNORECASE)
    for s in slides:
        kicker_or_title = (s.get("title") or "") + " " + (s.get("content") or "")[:80]
        if PHASE_RE.search(kicker_or_title) or STAGE_RE.search(kicker_or_title):
            title = s.get("title", "").strip()
            if title and title not in out:
                out.append(title)
    return out


# ---------------------------------------------------------------------------
# Rule enforcement
# ---------------------------------------------------------------------------

def rule_overview_diagram(slides: list[dict[str, Any]], phase_names: list[str]) -> str | None:
    """R1: at least one slide in positions 1..3 must be a journey overview
    diagram listing the phase names. Returns None on PASS, error string on FAIL."""
    if not phase_names:
        return None  # nothing to check against; skip rule (probably not a journey)
    head_slides = [s for s in slides if s["position"] <= 3]
    for s in head_slides:
        cls = (s.get("html_class") or "").lower()
        if "nxt-process" not in cls and "nxt-grid" not in cls and "nxt-swimlane" not in cls:
            continue
        # Count how many phase names appear in this slide's content
        content_lower = (s.get("content") or "").lower()
        matched = sum(1 for p in phase_names if p.lower() and p.lower() in content_lower)
        if matched >= max(1, int(len(phase_names) * 0.8)):
            return None  # PASS
    return (
        f"R1 FAIL: No journey-overview-diagram slide in positions 1-3. "
        f"Per .claude/skills/diagrams/journey-illustrator/SKILL.md §13.1, every "
        f"#journey #slides deck MUST have a single slide between positions 1-3 "
        f"that displays ALL {len(phase_names)} phase names as a horizontal phase "
        f"strip (class='nxt-process' for <=5 phases, 'nxt-grid' of 'nxt-card' for "
        f"more). This slide is the reader's MAP of the whole journey before "
        f"drilling into individual phases. Detected phases: {phase_names!r}"
    )


def rule_no_metaphor_titles(slides: list[dict[str, Any]]) -> list[str]:
    """R2: no slide title may contain a banned metaphor."""
    fails: list[str] = []
    for s in slides:
        title = s.get("title") or ""
        for pat in METAPHOR_TITLE_PATTERNS:
            if re.search(pat, title, re.IGNORECASE):
                fails.append(f"slide {s['position']} title: '{title[:80]}' contains banned metaphor (pattern: {pat!r})")
                break
    return fails


def rule_no_meta_kicker(slides: list[dict[str, Any]]) -> list[str]:
    """R3: no slide content may contain reading-instruction / structure-
    description / 'evidenced by X voices' phrasing."""
    fails: list[str] = []
    for s in slides:
        body = (s.get("title") or "") + " " + (s.get("content") or "")
        for pat in META_KICKER_PATTERNS:
            if re.search(pat, body, re.IGNORECASE):
                fails.append(f"slide {s['position']}: '{body[:120]}' contains banned meta-kicker (pattern: {pat!r})")
                break
    return fails


# ---------------------------------------------------------------------------
# Hook entry point
# ---------------------------------------------------------------------------

def main() -> int:
    # Stop hooks receive the model output via stdin as JSON with `output` field.
    try:
        payload = json.load(sys.stdin)
    except Exception:
        # No stdin or bad JSON — pass through, never block on hook self-failure.
        return 0

    text = ""
    if isinstance(payload, dict):
        text = (payload.get("output") or payload.get("text") or "")
    elif isinstance(payload, str):
        text = payload

    if not text or not is_journey_deck(text):
        return 0  # not a journey deck; nothing to enforce

    slides = extract_slides(text)
    if len(slides) < 2:
        return 0  # not enough slides to assess

    phase_names = detect_phase_names(slides)

    failures: list[str] = []

    r1 = rule_overview_diagram(slides, phase_names)
    if r1:
        failures.append(r1)

    failures.extend(rule_no_metaphor_titles(slides))
    failures.extend(rule_no_meta_kicker(slides))

    if not failures:
        return 0

    # FAIL — emit a structured rejection the agent must address.
    msg = "Journey #slides deliverable REJECTED by validate_journey_overview_slide.py:\n"
    for f in failures:
        msg += f"  - {f}\n"
    msg += (
        "\nFix the deliverable per .claude/skills/diagrams/journey-illustrator/SKILL.md §13 "
        "and resubmit. The overview-diagram slide (positions 1-3) is the reader's MAP; the "
        "metaphor + meta-kicker bans keep titles plain and concrete."
    )
    print(json.dumps({"ok": False, "block": True, "reason": msg}))
    return 2  # non-zero exit signals failure to the harness


if __name__ == "__main__":
    sys.exit(main())
