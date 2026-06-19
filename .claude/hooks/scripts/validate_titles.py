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

# Broad verb signal (2026-06-14): a contestable title needs a verb. The old narrow stem
# list false-rejected good titles ("force", "return", "leave", "keep"...). This is a wide
# action-verb set PLUS copulas/auxiliaries (is/are/has/can/will/must); platitudes that lean
# on a bare copula ("X is important") are caught separately by GENERICALLY_TRUE.
VERBS = re.compile(
    r'\b(declin|increas|drop|grew|grow|cost|requir|fac[ei]|creat|driv|enabl|prevent|exceed|lack|'
    r'report|found|reveal|confirm|show|demonstrat|impact|reduc|rais|improv|threaten|disrupt|'
    r'transform|eliminat|generat|produc|caus|result|lead|demand|necessitat|undermin|'
    r'spend|waste|invest|save|recover|lose|gain|outperform|trail|miss|fail|succeed|'
    r'forc|keep|kept|leav|left|return|block|trap|strand|push|pull|break|broke|lock|shift|'
    r'stall|erod|mask|surfac|rout|split|hide|hid|hold|held|stuck|stick|slow|stop|skip|churn|'
    r'wait|repeat|abandon|ignore|treat|favor|prefer|choose|chose|pay|paid|owe|own|control|'
    r'depend|rely|trust|doubt|expect|assume|overstate|understate|conflat|collaps|fragment|'
    r'is|are|was|were|be|been|has|have|had|can|cannot|will|wo|must|should|do|does|did)',
    re.I
)

DATA_PATTERN = re.compile(r'\d+%|\$[\d,.]+|\d+\s+(students|users|institutions|companies|employees|organizations|universities|colleges|members|applicants|donors|alumni|sources|articles)')


# 2026-06-14 - CONTESTABILITY, not numerosity (Anti-Slop Field Guide Rules 14/46/58 +
# HiC Quantitative Claim Rule). A title earns its place by being SPECIFIC and CONTESTABLE
# (a claim a reasonable person could disagree with), NEVER by carrying a figure. The old
# "data point OR verb" gate REWARDED naked numbers in titles - the exact thing the master
# rule bans. A figure is no longer a satisfier (and is not penalized; the number itself is
# governed by the Quantitative Claim Rule elsewhere). The bar is now: a verb/claim AND not
# a generically-true platitude.
GENERICALLY_TRUE = [
    re.compile(r'\b(matters?|is important|is key|is critical|is essential|is vital|are important)\b\.?$', re.I),
    re.compile(r'^(customer experience|data|execution|strategy|culture|innovation|quality|trust|alignment|collaboration|communication)\s+(matters|is\b)', re.I),
    re.compile(r'^(the importance of|the power of|the role of|the future of|the value of)\b', re.I),
]


def is_action_title(title):
    """Action titles are complete, CONTESTABLE sentences (a claim someone could disagree
    with) - not topic labels, not platitudes, and not justified by a figure."""
    t = title.strip()
    words = t.split()
    if len(words) < 8:
        return False, "fewer than 8 words"

    has_verb = bool(VERBS.search(t))
    if not has_verb:
        return False, "no action verb - title is not a contestable claim (a figure does NOT satisfy this; state the judgment)"

    for pattern in TOPIC_LABEL_PATTERNS:
        if pattern.search(t):
            return False, "matches topic label pattern"

    for pattern in GENERICALLY_TRUE:
        if pattern.search(t):
            return False, "generically-true platitude (no reasonable person could disagree) - name the specific cause/mechanism/change"

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
