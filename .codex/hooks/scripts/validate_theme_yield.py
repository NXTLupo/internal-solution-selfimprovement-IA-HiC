#!/usr/bin/env python3
"""
Theme Yield Validator — Stop hook.

User directive 2026-05-24: "I want at least 20-25 robust themes on every pull
(even with cached data). There should be no excuses for this themes."

This hook enforces the floor. After the geminiService.ts patch on 2026-05-24,
the pipeline has a 4-tier relaxation policy that should always produce >=20
themes (TIER 4 merges from cached engagements if live extraction undershoots).
This hook is the final backstop — if for any reason the deliverable ships
with <20 themes, this catches it before the user sees it.

Pairs with .claude/skills/theme-yield-guarantee/SKILL.md (the contract) and
.claude/hooks/scripts/validate_no_silent_fallback.py (the in-pipeline silent
fallback detector).

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json

THEME_GUARANTEE_MIN = 20
THEME_GUARANTEE_MAX = 25


def walk_themes_arrays(obj):
    """Yield (path, themes_list) for every themes[] field in the tree."""
    if isinstance(obj, dict):
        for key in ('themes', 'theme_set', 'themeRoster', 'theme_synthesis'):
            v = obj.get(key)
            if isinstance(v, list):
                yield (key, v)
        for k, v in obj.items():
            if k in ('themes', 'theme_set'):
                continue
            if isinstance(v, (dict, list)):
                yield from walk_themes_arrays(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk_themes_arrays(item)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = []

    for path, themes in walk_themes_arrays(data):
        if len(themes) == 0:
            continue  # empty themes[] means this deliverable section wasn't generated
        if len(themes) < THEME_GUARANTEE_MIN:
            # Check whether the receipt has a theme_guarantee_breach event
            # — if so, the pipeline already flagged this and we should still
            # block (the breach should NEVER ship, only be flagged in dev)
            tier_breakdown = {}
            for t in themes:
                if isinstance(t, dict):
                    tier = t.get('evidence_tier', 'unmarked')
                    tier_breakdown[tier] = tier_breakdown.get(tier, 0) + 1
            tier_summary = ', '.join(f"{k}: {v}" for k, v in sorted(tier_breakdown.items()))
            failures.append(
                f"THEME_YIELD_BREACH at {path}: shipped {len(themes)} themes, "
                f"minimum is {THEME_GUARANTEE_MIN}. Tier breakdown: {tier_summary}. "
                f"The 4-tier relaxation policy in geminiService.ts should have "
                f"reached the floor via cached-merge — investigate why TIER 4 "
                f"failed to inherit from disk."
            )
        elif len(themes) > THEME_GUARANTEE_MAX:
            # Soft warning — over-yield is less bad than under, but uncapped
            # theme counts make the analyst desk unscannable
            failures.append(
                f"THEME_YIELD_OVERFLOW at {path}: shipped {len(themes)} themes, "
                f"cap is {THEME_GUARANTEE_MAX}. The density-sort should have "
                f"trimmed to top {THEME_GUARANTEE_MAX} — check the slice in "
                f"geminiService.ts."
            )

    # Hard failures: any UNDER yield blocks; over yield is warning-only
    under_yields = [f for f in failures if 'YIELD_BREACH' in f]
    if under_yields:
        sys.stderr.write("THEME YIELD VALIDATION FAILED:\n")
        for f in under_yields:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nUser directive 2026-05-24: never ship fewer than 20 themes. "
            "The 4-tier relaxation policy and the cached-merge fallback exist "
            "specifically to prevent this. Investigate:\n"
            "  1. geminiService.ts ~line 1340 — is the tiered policy still in place?\n"
            "  2. themeCacheLoader.ts — is the cached read returning results?\n"
            "  3. wiki/engagements/*/themes.json — does any prior engagement have themes to inherit?\n"
            "  4. validate_corpus_relevance_distribution.py — was the corpus too thin to feed the live extraction?\n"
        )
        sys.exit(2)

    if failures:  # only overflow warnings remain
        sys.stderr.write("THEME YIELD WARNING:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        # Warning only — exit 0
    sys.exit(0)


if __name__ == '__main__':
    main()
