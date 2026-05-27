#!/usr/bin/env python3
"""
Evidence Tier Distribution Validator — Stop hook.

Per the standing rule (feedback_quality_first_never_relax_default 2026-05-24):
relaxation tiers (single_source, unresolved_citation, inherited_from_cache)
are EMERGENCY safety nets, not load-bearing paths. If they dominate the
shipped theme set, the upstream quality layer has failed and the user is
seeing degraded output dressed up as a quantity guarantee.

This hook walks the deliverable for shipped themes, inspects each one's
evidence_tier marker, and fails when relaxation-tier themes exceed
thresholds. Companion to validate_theme_yield.py: that one ensures count;
this one ensures the count was earned by strict quality, not by lowering
standards.

Thresholds (calibrated to the user's expectation of "20-25 robust themes"):
  - HARD FAIL if `inherited_from_cache` > 20% (cache should rarely fire)
  - HARD FAIL if `unresolved_citation` > 15% (signals citation resolver broken)
  - HARD FAIL if relaxation tiers combined > 30% (signals upstream broken)
  - WARN if `single_source` > 40% (acceptable but suggests retrieval thin)

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json

# Thresholds per the 2026-05-24 standing rule
INHERITED_HARD_PCT = 20
UNRESOLVED_HARD_PCT = 15
TOTAL_RELAXATION_HARD_PCT = 30
SINGLE_SOURCE_WARN_PCT = 40


def walk_themes(obj):
    if isinstance(obj, dict):
        v = obj.get('themes')
        if isinstance(v, list):
            yield from (t for t in v if isinstance(t, dict))
        for val in obj.values():
            if isinstance(val, (dict, list)):
                yield from walk_themes(val)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk_themes(item)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    themes = list(walk_themes(data))
    if len(themes) < 5:
        # Too few to compute meaningful distribution
        sys.exit(0)

    tiers = {}
    for t in themes:
        tier = str(t.get('evidence_tier', 'unmarked')).lower()
        tiers[tier] = tiers.get(tier, 0) + 1

    total = sum(tiers.values())
    thick_count = tiers.get('thick', 0)
    single_source_count = tiers.get('single_source', 0)
    unresolved_count = tiers.get('unresolved_citation', 0)
    inherited_count = tiers.get('inherited_from_cache', 0)
    unmarked_count = tiers.get('unmarked', 0)

    inherited_pct = (inherited_count / total) * 100
    unresolved_pct = (unresolved_count / total) * 100
    single_source_pct = (single_source_count / total) * 100
    relaxation_total = inherited_count + unresolved_count + single_source_count
    relaxation_pct = (relaxation_total / total) * 100

    failures = []
    warnings = []

    if unmarked_count > total * 0.5:
        failures.append(
            f"UNTAGGED_THEMES: {unmarked_count}/{total} themes have no evidence_tier marker. "
            f"The tiered policy in geminiService.ts should tag every theme — either the policy "
            f"was bypassed OR the tier-tagging code regressed."
        )

    if inherited_pct > INHERITED_HARD_PCT:
        failures.append(
            f"CACHE_RELIANCE: {inherited_count}/{total} themes ({inherited_pct:.0f}%) are "
            f"inherited_from_cache — above the {INHERITED_HARD_PCT}% hard limit. The TIER 4 "
            f"cached-merge is an EMERGENCY safety net, not a default. The live extraction "
            f"failed to produce sufficient themes — investigate corpus retrieval, framework "
            f"page presence, and the multi-angle aggregator coverage."
        )

    if unresolved_pct > UNRESOLVED_HARD_PCT:
        failures.append(
            f"UNRESOLVED_CITATIONS: {unresolved_count}/{total} themes ({unresolved_pct:.0f}%) "
            f"have unresolved citations — above the {UNRESOLVED_HARD_PCT}% hard limit. The "
            f"citationResolver is failing to bind [CHUNK_X] refs to named sources."
        )

    if relaxation_pct > TOTAL_RELAXATION_HARD_PCT:
        failures.append(
            f"RELAXATION_DOMINATES: {relaxation_total}/{total} themes ({relaxation_pct:.0f}%) "
            f"come from relaxation tiers (single_source + unresolved + inherited) — above the "
            f"{TOTAL_RELAXATION_HARD_PCT}% hard limit. Per the 2026-05-24 standing rule, "
            f"relaxation tiers are emergency safety nets. The strict thick-evidence path "
            f"(TIER 1) should produce the majority of shipped themes. Upstream quality is broken."
        )

    if single_source_pct > SINGLE_SOURCE_WARN_PCT:
        warnings.append(
            f"SINGLE_SOURCE_HEAVY: {single_source_count}/{total} themes ({single_source_pct:.0f}%) "
            f"are single-source — above the {SINGLE_SOURCE_WARN_PCT}% warn threshold. Retrieval "
            f"coverage may be thin; consider firing wiki-query-expander for additional angles "
            f"on the dominant topic clusters."
        )

    if failures:
        sys.stderr.write("EVIDENCE TIER DISTRIBUTION VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            f"\n  Tier breakdown: thick={thick_count}, single_source={single_source_count}, "
            f"unresolved={unresolved_count}, inherited={inherited_count}, unmarked={unmarked_count}\n"
        )
        if warnings:
            sys.stderr.write("  WARNINGS (non-blocking but worth investigating):\n")
            for w in warnings:
                sys.stderr.write(f"    - {w}\n")
        sys.stderr.write(
            "\nGuidance per feedback_quality_first_never_relax_default (2026-05-24):\n"
            "  • Relaxation tiers exist as EMERGENCY safety nets only — they must not dominate.\n"
            "  • Fix the upstream layer: multi-angle-theme-aggregator, topic-cluster-to-theme-converter, "
            "evidence-density-pre-checker, wiki-query-expander, framework page presence.\n"
            "  • Do NOT widen the thresholds in this hook. Fix the cause.\n"
        )
        sys.exit(2)

    if warnings:
        sys.stderr.write("EVIDENCE TIER DISTRIBUTION WARNING:\n")
        for w in warnings:
            sys.stderr.write(f"  - {w}\n")
        # Warning only — exit 0
    sys.exit(0)


if __name__ == '__main__':
    main()
