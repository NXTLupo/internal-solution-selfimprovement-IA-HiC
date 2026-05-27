#!/usr/bin/env python3
"""
Minimum Yield Validator — Stop hook.

Evidence from the last 20 runs (chunk-telemetry.jsonl):
  - "Chunk technology returned 0 gaps, expected >= 1" (10 instances)
  - "Early retry produced 0 themes (was 0)... Keeping original"
  - "[PRD] chunked generation failed... Falling back to single-shot
     (KNOWN truncation risk)"

The retry storms exist because the pipeline ships thin deliverables
silently. This hook fails the Stop if any deliverable section is below
its minimum yield, forcing visible failure instead of silent thin ship.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json

# Minimum counts per deliverable shape. These match what slidePostProcessor
# and the framework specs assume, derived from .claude/skills/*-architect
# expectations and the deliverable_frameworks.ts schemas.
MINIMUM_YIELDS = {
    'themes': 4,
    'theme_set': 4,
    'gaps': 5,
    'gap_set': 5,
    'gap_analysis': 5,
    'recommendations': 5,
    'recommendation_set': 5,
    'personas': 3,
    'persona_set': 3,
    'persona_roster': 3,
    'roadmap_items': 5,
    'roadmap': 5,
    'horizons': 3,
    'journey_stages': 4,
    'journey': 4,
    'service_blueprint_stages': 4,
    'blueprint_stages': 4,
    'principles': 3,
    'capabilities': 4,
    'competitors': 3,
    'competitive_set': 3,
    'risks': 3,
    'risk_register': 3,
    'failure_modes': 5,  # pre-mortem expects 5 per recommendation
    'opportunities': 3,
    'quick_wins': 3,
    'archetypes': 3,
    'sources': 5,
    'citations': 5,
    'slides': 6,
}

# Some fields are nested under different parent names — map them.
PATH_SYNONYMS = {
    'roadmap.now': 'horizons',
    'roadmap.next': 'horizons',
    'roadmap.later': 'horizons',
    'roadmap.horizons.now': 'horizons',
    'roadmap.horizons.next': 'horizons',
    'roadmap.horizons.later': 'horizons',
}


def get_minimum_for(key, path=""):
    """Look up minimum yield for a field, considering path-based synonyms."""
    if path in PATH_SYNONYMS:
        return MINIMUM_YIELDS.get(PATH_SYNONYMS[path])
    return MINIMUM_YIELDS.get(key.lower())


def walk_counts(obj, path=""):
    """Yield (path, key, count, minimum) for every list field that has a
    minimum yield rule."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            sub_path = f"{path}.{k}" if path else k
            if isinstance(v, list):
                minimum = get_minimum_for(k, sub_path)
                if minimum is not None:
                    yield (sub_path, k, len(v), minimum)
                # Recurse into list items
                for i, item in enumerate(v):
                    if isinstance(item, (dict, list)):
                        yield from walk_counts(item, f"{sub_path}[{i}]")
            elif isinstance(v, dict):
                yield from walk_counts(v, sub_path)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, (dict, list)):
                yield from walk_counts(item, f"{path}[{i}]")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = []
    checked_anything = False

    for path, key, count, minimum in walk_counts(data):
        checked_anything = True
        if count < minimum:
            failures.append(
                f"UNDERSHOOT: {path} has {count} items, minimum {minimum} "
                f"(deliverable type: {key})"
            )

    # If no recognized fields, exempt — this Stop event isn't a deliverable
    if not checked_anything:
        sys.exit(0)

    if failures:
        sys.stderr.write("MINIMUM YIELD VALIDATION FAILED:\n")
        for f in failures[:10]:
            sys.stderr.write(f"  - {f}\n")
        if len(failures) > 10:
            sys.stderr.write(f"  ... and {len(failures) - 10} more\n")
        sys.stderr.write(
            "\nGuidance: a thin deliverable usually indicates a generator "
            "that returned empty and was silently kept. Invoke the "
            "empty-result-diagnostician skill to inspect WHY the count is low "
            "(prompt too constraining? corpus too thin? wrong source mix?) "
            "and produce a corrected retry — not a blind retry.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
