#!/usr/bin/env python3
"""
Evidence Density Validator — Ensures deliverable items have real evidence.
Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Validates:
1. evidenceBasis fields are non-empty and contain specifics
2. Minimum distinct source count across the deliverable
"""
import sys
import json
import re


def has_specifics(text):
    """Check if text contains specific evidence (numbers, quotes, names)."""
    if not text or len(text) < 20:
        return False
    has_number = bool(re.search(r'\d+%|\$\d|20[12]\d|\d+\.\d+', text))
    has_quote = '"' in text or '\u201c' in text  # curly quotes too
    # Proper noun: word > 3 chars starting with uppercase (not first word)
    words = text.split()
    has_name = any(
        w[0].isupper() and len(w) > 3 and i > 0
        for i, w in enumerate(words) if w and w[0].isalpha()
    )
    return has_number or has_quote or has_name


def walk_evidence(obj, path=""):
    """Find all evidenceBasis fields."""
    if isinstance(obj, dict):
        if 'evidenceBasis' in obj:
            yield (path, obj.get('name', obj.get('title', obj.get('capability', obj.get('initiative', path)))), obj['evidenceBasis'])
        for k, v in obj.items():
            yield from walk_evidence(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from walk_evidence(item, f"{path}[{i}]")


def collect_all_citations(obj):
    """Collect all citation strings from the entire object."""
    sources = set()
    if isinstance(obj, dict):
        if 'citations' in obj and isinstance(obj['citations'], list):
            for c in obj['citations']:
                if isinstance(c, str) and len(c) > 2:
                    sources.add(c.strip())
        if 'sources' in obj and isinstance(obj['sources'], list):
            for s in obj['sources']:
                if isinstance(s, str) and len(s) > 2:
                    sources.add(s.strip())
        for v in obj.values():
            sources |= collect_all_citations(v)
    elif isinstance(obj, list):
        for item in obj:
            sources |= collect_all_citations(item)
    return sources


def validate(data):
    failures = []

    # CHECK 1: evidenceBasis fields must be non-empty and contain specifics
    empty_count = 0
    vague_count = 0
    for path, name, eb in walk_evidence(data):
        if not eb or len(eb.strip()) < 20:
            empty_count += 1
            if empty_count <= 3:
                failures.append(f"EMPTY EVIDENCE: '{name}' has no evidenceBasis")
        elif not has_specifics(eb):
            vague_count += 1
            if vague_count <= 3:
                failures.append(f"VAGUE EVIDENCE: '{name}' evidenceBasis has no specific numbers, quotes, or names")

    if empty_count > 3:
        failures.append(f"... and {empty_count - 3} more items with empty evidenceBasis")
    if vague_count > 3:
        failures.append(f"... and {vague_count - 3} more items with vague evidenceBasis")

    # CHECK 2: Minimum distinct sources across the deliverable
    all_sources = collect_all_citations(data)
    if len(all_sources) < 3 and len(list(walk_evidence(data))) > 0:
        failures.append(f"LOW SOURCE DIVERSITY: Only {len(all_sources)} distinct sources cited. Expected 5+.")

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("EVIDENCE VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
