#!/usr/bin/env python3
"""
Action Title Validator — Ensures slide titles are insight-driven sentences.
Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Rejects topic labels like "The Landscape", "Key Findings", "Recommendations".
Requires data (numbers/names) + verb + minimum length.
"""
import sys
import json
import re

SKIP_LAYOUTS = {'SECTION_HEADER', 'TITLE_SLIDE'}

TOPIC_LABEL_PATTERNS = [
    re.compile(r'^The\s+\w+$', re.I),                    # "The Landscape"
    re.compile(r'^Key\s+\w+$', re.I),                    # "Key Findings"
    re.compile(r'^\w+\s+Overview$', re.I),                # "Market Overview"
    re.compile(r'^Our\s+\w+$', re.I),                     # "Our Strategy"
    re.compile(r'^(Introduction|Conclusion|Summary|Recommendations|Next Steps|The Path Forward|The Way Forward)$', re.I),
    re.compile(r'^(The Complication|The Resolution|The Situation|Forging|Building|Creating)\s', re.I),
]

VERBS = re.compile(
    r'\b(declin|increas|drop|grew|grow|cost|requir|fac[ei]|creat|driv|enabl|prevent|exceed|lack|'
    r'report|found|reveal|confirm|show|demonstrat|impact|reduc|rais|improv|threaten|disrupt|'
    r'transform|eliminat|generat|produc|caus|result|lead|demand|necessitat|undermin|'
    r'spend|waste|invest|save|recover|lose|gain|outperform|trail|exceed|miss|fail|succeed)',
    re.I
)

DATA_PATTERN = re.compile(r'\d+%|\$[\d,.]+|\d+\s+(students|users|institutions|companies|employees|organizations|universities|colleges|members|applicants|donors|alumni|sources|articles)')


def is_action_title(title):
    """Action titles contain data + verbs + are complete sentences."""
    words = title.strip().split()
    if len(words) < 8:
        return False, "fewer than 8 words"

    has_data = bool(DATA_PATTERN.search(title))
    has_verb = bool(VERBS.search(title))

    if not has_data and not has_verb:
        return False, "no data point AND no action verb"

    for pattern in TOPIC_LABEL_PATTERNS:
        if pattern.search(title.strip()):
            return False, f"matches topic label pattern"

    return True, ""


def validate(data):
    failures = []

    slides = data if isinstance(data, list) else data.get('slides', [])
    if not slides:
        # Not a slides payload, skip
        return []

    for slide in slides:
        layout = slide.get('layout', '')
        if layout in SKIP_LAYOUTS:
            continue

        title = slide.get('title', '')
        num = slide.get('slideNumber', '?')

        ok, reason = is_action_title(title)
        if not ok:
            failures.append(f"Slide {num}: \"{title}\" — {reason}")

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("TITLE VALIDATION FAILED (topic labels detected):\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write("\nEvery body slide title must be a COMPLETE SENTENCE with data (numbers, names) and an action verb.\n")
        sys.stderr.write("BAD: 'The Landscape' | GOOD: '35% of first-year students do not return, costing $9B annually'\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
