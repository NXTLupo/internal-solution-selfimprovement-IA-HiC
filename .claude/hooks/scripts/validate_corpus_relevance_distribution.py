#!/usr/bin/env python3
"""
Corpus Relevance Distribution Validator — Stop hook.

Evidence from 2026-05-24 Northeastern run:
  - Body-aware relevance scoring: 379/379 items scored across 16 batches
    (2 high, 47 moderate, 330 low)

Out of 379 items retrieved, only 2 were HIGH relevance and 330 were LOW
(87%). This is why themes failed the thick-evidence filter — there weren't
enough relevant sources per theme. The pipeline generated themes anyway
from low-relevance material.

This hook walks the deliverable for relevance-score distributions and
fails when >85% of items are LOW relevance. The threshold is calibrated
against the Northeastern case — that run shipped weak themes. We want
to refuse before that ship.

The distribution may live in different fields depending on how it's
serialized:
  - `corpus_relevance: {high: N, moderate: N, low: N}`
  - `relevanceScoring: {high, moderate, low}`
  - inline within the receipt as `body_aware_relevance`

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json


def find_relevance_distribution(obj):
    """Yield (path, {high, moderate, low}) for any relevance distribution found."""
    if isinstance(obj, dict):
        for key in ('corpus_relevance', 'relevance_scoring', 'relevanceScoring',
                    'body_aware_relevance', 'bodyAwareRelevance',
                    'corpus_quality', 'relevance_distribution'):
            v = obj.get(key)
            if isinstance(v, dict):
                high = v.get('high', v.get('HIGH', 0))
                mod = v.get('moderate', v.get('MODERATE', v.get('med', 0)))
                low = v.get('low', v.get('LOW', 0))
                if isinstance(high, (int, float)) and isinstance(low, (int, float)):
                    yield (key, {'high': int(high), 'moderate': int(mod), 'low': int(low)})
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                yield from find_relevance_distribution(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from find_relevance_distribution(item)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    distributions = list(find_relevance_distribution(data))
    if not distributions:
        sys.exit(0)

    failures = []
    for path, dist in distributions:
        total = dist['high'] + dist['moderate'] + dist['low']
        if total < 20:
            # Too few items to compute meaningful ratio
            continue
        low_pct = (dist['low'] / total) * 100
        high_pct = (dist['high'] / total) * 100

        if low_pct > 85:
            failures.append(
                f"CORPUS_LOW_RELEVANCE at {path}: {low_pct:.0f}% of "
                f"{total} retrieved items are LOW relevance "
                f"(distribution: {dist['high']} high / {dist['moderate']} "
                f"moderate / {dist['low']} low). "
                f"This was 87% in the 2026-05-24 Northeastern run; themes failed "
                f"thick-evidence filter as a direct downstream consequence."
            )
        elif low_pct > 70 and high_pct < 2:
            failures.append(
                f"CORPUS_THIN_HIGH_RELEVANCE at {path}: only {dist['high']} "
                f"HIGH-relevance items out of {total} ({high_pct:.1f}%) — "
                f"corpus is dominated by low-relevance material. Theme/persona "
                f"generation likely to produce weak output."
            )

    if failures:
        sys.stderr.write("CORPUS RELEVANCE DISTRIBUTION VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: a corpus dominated by LOW-relevance items signals one "
            "of three upstream issues:\n"
            "  1. Search queries were poorly targeted to the goal (check "
            "[refineSearchQueries] hallucination-guard rate — if >10% of "
            "queries were replaced with goal verbatim, the refinement is "
            "broken).\n"
            "  2. The framework page for this deliverable type is missing, so "
            "loadGenerationContext didn't constrain retrieval to the right "
            "evidence shape (validate_framework_page_exists.py catches this).\n"
            "  3. The wiki article corpus genuinely lacks evidence on this goal "
            "— invoke wiki-query-expander with explicit angle variants before "
            "regenerating.\n"
            "\nDo not ship deliverables generated from this corpus until one of "
            "these three is addressed.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
