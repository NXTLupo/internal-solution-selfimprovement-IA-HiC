#!/usr/bin/env python3
"""
Evidence Recency Validator — Flags % of stale citations for fast-moving topics.

Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Pairs with .claude/skills/source-ranker/SKILL.md volatility-tier framework:
  - fast-moving (AI, labor markets, post-2023 tech): floor 18 months
  - moderate (higher-ed strategy, B2B SaaS, healthcare policy): floor 3 years
  - stable (academic frameworks, foundational research): floor 10 years

The deliverable JSON should carry a top-level `topic_volatility_tier` field;
if absent, the hook attempts inference from deliverable title/topic keywords
and defaults to "moderate".

Thresholds:
  warn  if >30% of citations are stale for the detected tier
  fail  if >50% of citations are stale for the detected tier
  fail  if any single section's citations are 100% stale (concentrated rot)
"""
import sys
import json
import re
from datetime import datetime

CURRENT_YEAR = datetime.now().year

# Volatility tier => years for "current"
TIER_RECENCY_YEARS = {
    'fast': 2,        # ~18 months rounded
    'fast-moving': 2,
    'moderate': 3,
    'stable': 10,
}

# Keyword inference for tier when not declared
FAST_KEYWORDS = (
    'ai', 'generative', 'llm', 'genai', 'chatgpt', 'gpt',
    'crypto', 'web3', 'agentic',
    'post-pandemic', 'remote work', 'hybrid work',
    'labor market', 'gig economy',
)
STABLE_KEYWORDS = (
    'persona theory', 'cooper goal', 'rumelt',
    'classical', 'foundational', 'literature review',
)

# Pattern to extract a 4-digit year from a citation string
YEAR_PATTERN = re.compile(r'\b(19[89]\d|20\d{2})\b')


def detect_topic_tier(data):
    """Return one of: fast, moderate, stable."""
    if isinstance(data, dict):
        declared = data.get('topic_volatility_tier') or data.get('volatility_tier')
        if declared:
            normalized = str(declared).lower().strip()
            if normalized in TIER_RECENCY_YEARS:
                return 'fast' if normalized in ('fast', 'fast-moving') else normalized

    # Inference from title/topic strings
    blob = json.dumps(data).lower() if isinstance(data, (dict, list)) else str(data).lower()
    fast_hits = sum(1 for kw in FAST_KEYWORDS if kw in blob)
    stable_hits = sum(1 for kw in STABLE_KEYWORDS if kw in blob)

    if fast_hits >= 2:
        return 'fast'
    if stable_hits >= 2:
        return 'stable'
    return 'moderate'


def extract_year(citation):
    """Pull the first plausible 4-digit publication year from a citation string."""
    if not isinstance(citation, str):
        return None
    matches = YEAR_PATTERN.findall(citation)
    if not matches:
        return None
    # Take the most recent matched year as the publication date
    years = sorted(int(y) for y in matches)
    plausible = [y for y in years if y <= CURRENT_YEAR]
    return plausible[-1] if plausible else None


def collect_citations_per_section(obj, path=""):
    """Yield (section_path, list_of_citation_strings) for each section that has citations."""
    if isinstance(obj, dict):
        section_citations = []
        for k in ('citations', 'sources'):
            v = obj.get(k)
            if isinstance(v, list):
                for c in v:
                    if isinstance(c, str) and len(c.strip()) > 3:
                        section_citations.append(c.strip())
        if section_citations:
            yield (path, section_citations)
        for k, v in obj.items():
            yield from collect_citations_per_section(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from collect_citations_per_section(item, f"{path}[{i}]")


def validate(data):
    failures = []
    tier = detect_topic_tier(data)
    recency_window = TIER_RECENCY_YEARS[tier]
    floor_year = CURRENT_YEAR - recency_window

    all_citations = []
    stale_citations = []
    sections_all_stale = []

    for section_path, citations in collect_citations_per_section(data):
        section_year_count = 0
        section_stale_count = 0
        for c in citations:
            yr = extract_year(c)
            all_citations.append((c, yr))
            if yr is None:
                # Cannot evaluate — skip from staleness ratios but track
                continue
            section_year_count += 1
            if yr < floor_year:
                stale_citations.append((c, yr))
                section_stale_count += 1
        # Concentrated rot: a section with multiple citations all stale
        if section_year_count >= 3 and section_stale_count == section_year_count:
            sections_all_stale.append(section_path)

    datable = [c for c in all_citations if c[1] is not None]
    if len(datable) < 3:
        # Too few datable citations to compute a meaningful ratio
        return []

    stale_ratio = len(stale_citations) / len(datable)
    pct = round(stale_ratio * 100)

    if pct > 50:
        failures.append(
            f"STALE_EVIDENCE_RATIO: {pct}% of datable citations are older than "
            f"{recency_window} years (tier: {tier}, floor: {floor_year}). "
            f"Threshold for fail: 50%."
        )
    if pct > 30 and pct <= 50:
        failures.append(
            f"STALE_EVIDENCE_WARN: {pct}% of datable citations are older than "
            f"{recency_window} years (tier: {tier}). Threshold for fail: 50%."
        )

    if sections_all_stale:
        failures.append(
            f"CONCENTRATED_ROT: {len(sections_all_stale)} section(s) have "
            f"100% stale citations (3+ citations, all > {recency_window} years old). "
            f"First: {sections_all_stale[0]}"
        )

    # Show the worst offenders
    if stale_citations:
        oldest = sorted(stale_citations, key=lambda x: x[1])[:5]
        for c, yr in oldest:
            failures.append(f"  oldest cite: {yr} — {c[:90]}")

    # Failures with only WARN-level severity should not block; convert to a
    # nonblocking notice if no FAIL-level entry is present.
    has_fail = any(f.startswith('STALE_EVIDENCE_RATIO') or f.startswith('CONCENTRATED_ROT') for f in failures)
    if not has_fail:
        return []  # Treat WARN as non-blocking

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("EVIDENCE RECENCY VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: invoke source-ranker to identify citations that should "
            "be replaced; invoke analog-finder to add more recent precedents; "
            "invoke wiki-query-expander on the stale topics to surface current "
            "sources before regenerating.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
