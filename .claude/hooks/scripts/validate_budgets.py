#!/usr/bin/env python3
"""
Content Budget Validator — Ensures slide fields stay within character limits.
Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Also checks for meta-narration patterns that should never appear in output.
"""
import sys
import json
import re

SKIP_LAYOUTS = {'SECTION_HEADER', 'TITLE_SLIDE'}

BUDGETS = {
    'title': 120,
    'quote': 250,
    'speakerNotes': 600,
    'narrative': 400,
}

CONTENT_ITEM_BUDGET = 200
BENTO_TEXT_BUDGET = 100
SOLUTION_DESC_BUDGET = 150

META_NARRATION = [
    re.compile(r'\bwe\s+(now|are now)\s+(move|enter|moving|entering|transition)', re.I),
    re.compile(r'\bthis is (where|the section|the phase|the part)\b', re.I),
    re.compile(r"\blet['u]s?\s+(now\s+)?(examine|explore|look at|discuss|turn to|move to|dive into)", re.I),
    re.compile(r'\bin this (section|slide|part|phase|presentation|deck|document)\b', re.I),
    re.compile(r'\bwe will (now\s+)?(examine|explore|discuss|look at|analyze|present|review)', re.I),
    re.compile(r'\btoday (we|I)', re.I),
    re.compile(r'\bgood (morning|afternoon|evening)\b', re.I),
    re.compile(r'\bthank you for (being here|joining|coming|attending)', re.I),
    re.compile(r'\bas you can see\b', re.I),
    re.compile(r'\bthis slide shows\b', re.I),
    re.compile(r'\bour (objective|goal|aim|purpose) (is|here is) to\b', re.I),
    re.compile(r'\bwelcome to\b', re.I),
    re.compile(r'\ballow me to\b', re.I),
    re.compile(r'\bbefore we (begin|start|dive in|get started)\b', re.I),
]


def check_meta_narration(text):
    """Return matched meta-narration patterns."""
    matches = []
    for pattern in META_NARRATION:
        m = pattern.search(text or '')
        if m:
            matches.append(m.group())
    return matches


def validate(data):
    failures = []

    slides = data if isinstance(data, list) else data.get('slides', [])
    if not slides:
        return []

    for slide in slides:
        layout = slide.get('layout', '')
        num = slide.get('slideNumber', '?')

        if layout in SKIP_LAYOUTS:
            continue

        # Check field budgets
        for field, limit in BUDGETS.items():
            val = slide.get(field, '')
            if isinstance(val, str) and len(val) > limit:
                failures.append(f"Slide {num}: {field} is {len(val)} chars (limit {limit})")

        # Check content items
        for i, item in enumerate(slide.get('content', []) or []):
            if isinstance(item, str) and len(item) > CONTENT_ITEM_BUDGET:
                failures.append(f"Slide {num}: content[{i}] is {len(item)} chars (limit {CONTENT_ITEM_BUDGET})")

        # Check bento cells
        for i, cell in enumerate(slide.get('bentoCells', []) or []):
            text = cell.get('text', '')
            if isinstance(text, str) and len(text) > BENTO_TEXT_BUDGET:
                failures.append(f"Slide {num}: bentoCells[{i}].text is {len(text)} chars (limit {BENTO_TEXT_BUDGET})")

        # Check solution points
        for i, sp in enumerate(slide.get('solutionPoints', []) or []):
            desc = sp.get('description', '')
            if isinstance(desc, str) and len(desc) > SOLUTION_DESC_BUDGET:
                failures.append(f"Slide {num}: solutionPoints[{i}].description is {len(desc)} chars (limit {SOLUTION_DESC_BUDGET})")

        # Check meta-narration in ALL text fields
        all_text_fields = [
            slide.get('title', ''),
            slide.get('narrative', ''),
            slide.get('speakerNotes', ''),
            slide.get('quote', ''),
        ] + (slide.get('content', []) or [])

        for text in all_text_fields:
            if isinstance(text, str):
                meta = check_meta_narration(text)
                if meta:
                    failures.append(f"Slide {num}: meta-narration detected: {meta[0]}")

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("CONTENT BUDGET VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
