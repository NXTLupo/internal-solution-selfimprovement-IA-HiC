#!/usr/bin/env python3
"""
Text-Hierarchy Validator - content-side enforcement of the 2026-06-14 typographic
doctrine (plans/typographic-system-redesign-2026-06-14.md + the typographic-system
skill reference). Runs as a Stop-hook validator. Exit 0 = pass, exit 2 = block.

The renderer enforces SIZE/WEIGHT (it paints from the Figma type system). This hook
enforces the things only the MODEL controls in the emitted content:
  1. HERO CAP: a hero/KPI/stat "value" is evidence, a word or short phrase - NOT a
     full sentence. A value paired with a label that runs > 6 words reads as a
     headline competing with the action title (the audited stat-row 31pt inversion).
  2. NO SHOUTING: primary prose (insight, body, narrative, rationale, description,
     keyInsight, takeaway) must not be ALL-CAPS. Uppercase is reserved for the kicker;
     an all-caps content line out-weights the title and reads as label noise.

High precision by design (it blocks generation): only clear violations fire.
"""
import sys
import json
import re

# prose fields that must never be ALL-CAPS shouting
PROSE_FIELDS = {
    "insight", "body", "narrative", "rationale", "description", "keyInsight",
    "takeaway", "implication", "contextParagraph", "result", "characterization",
    "patternSignal", "convergentInsight", "flowSummary", "synthesis", "meaning",
    "matters", "actionTitle",
}
# fields that ARE labels/eyebrows - uppercase is allowed here, skip them
LABEL_FIELDS = {
    "label", "kicker", "eyebrow", "context", "subject", "journeyType", "framingTag",
    "actionsLabel", "headline", "phase", "name", "role", "title", "subtitle",
    "scope", "actors", "phasesLabel", "category", "status", "severity", "priority",
    "duration", "timeframe", "investment", "attribution", "source", "tier",
}

_word = re.compile(r"[A-Za-z]")
_lower = re.compile(r"[a-z]")


def is_all_caps_prose(s):
    if not isinstance(s, str):
        return False
    t = s.strip()
    if len(t) < 24:
        return False
    # has letters but zero lowercase -> shouting
    return bool(_word.search(t)) and not _lower.search(t)


def hero_is_sentence(value):
    """A KPI/stat hero value should be a word or short phrase, not a sentence."""
    if not isinstance(value, str):
        return False
    words = value.strip().split()
    # > 6 words, or ends like a sentence with >4 words = a headline, not a hero datum
    if len(words) > 6:
        return True
    if len(words) > 4 and value.strip().endswith((".", "!", "?")):
        return True
    return False


def walk(node, failures, path="$"):
    if isinstance(node, dict):
        # KPI / stat hero pattern: an object carrying BOTH a label and a value
        if "value" in node and ("label" in node or "sub" in node):
            v = node.get("value")
            if hero_is_sentence(v):
                failures.append(f'{path}.value is a sentence, not a hero datum: "{str(v)[:60]}" (keep hero values to a word/short phrase; the number rides in a cited quote)')
        for k, val in node.items():
            if isinstance(val, str):
                if k in PROSE_FIELDS and is_all_caps_prose(val):
                    failures.append(f'{path}.{k} is ALL-CAPS prose (shouting): "{val[:60]}" (uppercase is for the kicker only; write sentence-case)')
            else:
                walk(val, failures, f"{path}.{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            walk(item, failures, f"{path}[{i}]")


def validate(data):
    failures = []
    slides = data if isinstance(data, list) else data.get("slides", [])
    if not slides and isinstance(data, dict):
        # also accept a bare deliverable object
        slides = [data]
    for idx, slide in enumerate(slides or []):
        walk(slide, failures, f"slide[{idx}]")
    # cap noise
    return failures[:20]


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    failures = validate(data)
    if failures:
        sys.stderr.write("TEXT-HIERARCHY VALIDATION FAILED (typographic doctrine):\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write("\nDoctrine: the action title is the one governing line; hero values are short evidence, not headlines; prose is sentence-case (UPPERCASE only on the kicker). See the typographic-system skill reference.\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
