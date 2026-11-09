#!/usr/bin/env python3
"""
Quantification Validator — Ensures every recommendation has the finance-grade
four-tuple: baseline + target + measurement_method + refresh_cadence.

Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Pairs with .claude/skills/quantification-architect/SKILL.md.

Reads JSON deliverable from stdin (same contract as validate_evidence.py).
Looks for any object with a `recommendation` or `recommendations` field and
asserts each carries a complete `quantification` block.

The hook intentionally only fires when the deliverable contains
recommendation-shaped objects — themes, personas, journey stages, and
findings are not actionable and are exempt.
"""
import sys
import json
import re

# Fields required inside each recommendation's `quantification` block.
REQUIRED_BASELINE = ('value', 'source')
REQUIRED_TARGET = ('value', 'by_date', 'precedent')
REQUIRED_MEASUREMENT = ('instrument', 'owner_role')
REQUIRED_CADENCE = ('cadence', 'forum')

# Strings that auto-fail — these are QA annotations leaking into user-facing
# output and are also caught by validate_titles.py / .claude/CLAUDE.md rules.
FORBIDDEN_PLACEHOLDERS = (
    'tbd', 'to be determined', 'to be confirmed',
    'needs baseline', 'baseline tbd', 'evidence gap',
    'insert baseline', 'placeholder', 'n/a',
    '[needs', '[insert', '[tbd]', 'forthcoming',
)

# Date pattern — accept YYYY-MM-DD or quarter+year ("Q3 2026"). Reject bare
# quarters with no year ("Q3", "next quarter").
DATE_OK = re.compile(r'(\d{4}-\d{2}-\d{2})|(Q[1-4]\s*20\d{2})|(20\d{2}-Q[1-4])', re.IGNORECASE)


def is_recommendation(obj):
    """Heuristic: does this dict look like a recommendation that needs quantification?"""
    if not isinstance(obj, dict):
        return False
    # Strong signals
    for key in ('recommendation', 'action', 'initiative', 'horizon_item'):
        if key in obj and isinstance(obj[key], str) and len(obj[key]) > 10:
            return True
    # Title-shaped recommendations
    if 'title' in obj and 'priority' in obj:
        return True
    if 'title' in obj and 'horizon' in obj:
        return True
    return False


def is_exempt(obj):
    """Exempt discovery actions and pure descriptions."""
    if not isinstance(obj, dict):
        return True
    phase = str(obj.get('phase', '')).lower()
    if phase == 'discovery':
        return True
    rec_type = str(obj.get('type', '')).lower()
    if rec_type in ('theme', 'finding', 'persona', 'observation'):
        return True
    return False


def label(obj):
    return str(
        obj.get('recommendation')
        or obj.get('action')
        or obj.get('initiative')
        or obj.get('title')
        or obj.get('name')
        or '<unnamed>'
    )[:80]


def contains_placeholder(text):
    """Detect QA annotations leaking into user-facing fields."""
    if not isinstance(text, str):
        return False
    lower = text.lower()
    return any(p in lower for p in FORBIDDEN_PLACEHOLDERS)


def validate_quantification_block(rec, path):
    """Validate a single recommendation. Returns list of failure strings."""
    failures = []
    rec_label = label(rec)
    q = rec.get('quantification')

    if not isinstance(q, dict):
        failures.append(
            f"MISSING_QUANTIFICATION: '{rec_label}' has no quantification block."
        )
        return failures

    baseline = q.get('baseline') or {}
    target = q.get('target') or {}
    measurement = q.get('measurement_method') or {}
    cadence = q.get('refresh_cadence') or {}

    # Baseline
    for f in REQUIRED_BASELINE:
        v = baseline.get(f)
        if not v:
            failures.append(f"MISSING_BASELINE_{f.upper()}: '{rec_label}'")
        elif contains_placeholder(v):
            failures.append(
                f"PLACEHOLDER_IN_BASELINE_{f.upper()}: '{rec_label}' has '{v}' "
                f"in baseline.{f} (QA annotations forbidden in user-facing fields)"
            )

    # Target
    for f in REQUIRED_TARGET:
        v = target.get(f)
        if not v:
            failures.append(f"MISSING_TARGET_{f.upper()}: '{rec_label}'")
        elif contains_placeholder(v):
            failures.append(
                f"PLACEHOLDER_IN_TARGET_{f.upper()}: '{rec_label}' has '{v}' in target.{f}"
            )

    # Target date format
    by_date = target.get('by_date')
    if by_date and not DATE_OK.search(str(by_date)):
        failures.append(
            f"INVALID_TARGET_DATE: '{rec_label}' has '{by_date}' — "
            f"must be YYYY-MM-DD or 'Q[1-4] YYYY'"
        )

    # Measurement method
    for f in REQUIRED_MEASUREMENT:
        v = measurement.get(f)
        if not v:
            failures.append(f"MISSING_MEASUREMENT_{f.upper()}: '{rec_label}'")
        elif contains_placeholder(v):
            failures.append(
                f"PLACEHOLDER_IN_MEASUREMENT_{f.upper()}: '{rec_label}' has '{v}'"
            )

    # Refresh cadence
    for f in REQUIRED_CADENCE:
        v = cadence.get(f)
        if not v:
            failures.append(f"MISSING_CADENCE_{f.upper()}: '{rec_label}'")
        elif contains_placeholder(v):
            failures.append(
                f"PLACEHOLDER_IN_CADENCE_{f.upper()}: '{rec_label}' has '{v}'"
            )

    # Cadence sanity — annual is almost never right for digital/CX
    cadence_val = str(cadence.get('cadence', '')).lower()
    if cadence_val in ('annual', 'annually', 'yearly'):
        failures.append(
            f"CADENCE_TOO_SLOW: '{rec_label}' set to {cadence_val} — "
            f"digital/CX initiatives need quarterly or faster review"
        )

    return failures


def walk_recommendations(obj, path=""):
    """Yield every recommendation-shaped object in the tree."""
    if isinstance(obj, dict):
        if is_recommendation(obj) and not is_exempt(obj):
            yield (path, obj)
        for k, v in obj.items():
            yield from walk_recommendations(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from walk_recommendations(item, f"{path}[{i}]")


def validate(data):
    failures = []
    rec_count = 0
    missing_count = 0

    for path, rec in walk_recommendations(data):
        rec_count += 1
        item_failures = validate_quantification_block(rec, path)
        if item_failures:
            missing_count += 1
            if len(failures) < 15:
                failures.extend(item_failures)

    if rec_count == 0:
        # No recommendations in this deliverable — exempt entirely.
        return []

    if missing_count > 0:
        failures.insert(
            0,
            f"QUANTIFICATION SHORTFALL: {missing_count}/{rec_count} recommendations "
            f"are missing the four-tuple (baseline + target + measurement_method + refresh_cadence)."
        )

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        # No JSON on stdin — non-deliverable Stop event. Pass.
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("QUANTIFICATION VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: invoke the quantification-architect skill to add the "
            "four-tuple to each recommendation. Recommendations that cannot be "
            "quantified must be marked status: BLOCKED_BASELINE / "
            "BLOCKED_PRECEDENT / BLOCKED_INSTRUMENT, not shipped silently.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
