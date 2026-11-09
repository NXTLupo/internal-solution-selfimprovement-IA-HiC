#!/usr/bin/env python3
"""
Citation Validator Hook — Deterministic quality gate for deliverable output.
Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Validates:
1. Priority sources are cited
2. No empty citations arrays on deliverable items
3. No unresolved [CHUNK_XXX] references
4. No generic source names in citations
"""
import sys
import json
import re
import os

GENERIC_SOURCES = {
    'research', 'studies', 'data', 'sources', 'intelligence_sources',
    'analysis', 'evidence', 'findings', 'reports', 'literature',
    'research data', 'various sources', 'multiple sources', 'industry reports',
    'academic research', 'recent studies', 'available data'
}

CHUNK_PATTERN = re.compile(r'\[CHUNK_\d+\]')


def load_priority_sources():
    """Load user-flagged priority sources from persistent storage."""
    path = os.path.join(os.path.dirname(__file__), 'priority_sources.json')
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return []
    return []


def walk_json(obj, path=""):
    """Recursively walk JSON and yield (path, key, value) for all string/array fields."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk_json(v, f"{path}.{k}")
            if k == 'citations' and isinstance(v, list):
                yield (path, 'citations', v)
            elif k == 'evidenceBasis' and isinstance(v, str):
                yield (path, 'evidenceBasis', v)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from walk_json(item, f"{path}[{i}]")


def find_all_text(obj):
    """Extract all string values from a JSON object."""
    texts = []
    if isinstance(obj, str):
        texts.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            texts.extend(find_all_text(v))
    elif isinstance(obj, list):
        for item in obj:
            texts.extend(find_all_text(item))
    return texts


def validate(data):
    failures = []
    all_text = ' '.join(find_all_text(data))

    # CHECK 1: Priority sources must appear in output
    priority = load_priority_sources()
    for ps in priority:
        if ps.lower() not in all_text.lower():
            failures.append(f"PRIORITY MISSING: Mandatory source '{ps}' not found in output")

    # CHECK 2: No empty citations arrays on deliverable items
    citation_arrays = []
    for path, key, value in walk_json(data):
        if key == 'citations':
            citation_arrays.append((path, value))

    empty_count = 0
    for path, citations in citation_arrays:
        if not citations or len(citations) == 0:
            empty_count += 1
            if empty_count <= 5:  # Report first 5
                failures.append(f"EMPTY CITATIONS: {path} has no citations")

    if empty_count > 5:
        failures.append(f"... and {empty_count - 5} more items with empty citations")

    # CHECK 3: No unresolved CHUNK references
    chunk_matches = CHUNK_PATTERN.findall(all_text)
    if chunk_matches:
        unique = set(chunk_matches)
        failures.append(f"UNRESOLVED CHUNKS: {len(unique)} unresolved references: {', '.join(list(unique)[:5])}")

    # CHECK 4: No generic source names
    for path, citations in citation_arrays:
        for c in (citations or []):
            if isinstance(c, str) and c.lower().strip() in GENERIC_SOURCES:
                failures.append(f"GENERIC SOURCE: '{c}' at {path} is not a real source name")

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, Exception) as e:
        # If input isn't valid JSON, skip validation (may be non-deliverable output)
        sys.exit(0)

    failures = validate(data)

    if failures:
        sys.stderr.write("CITATION VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.exit(2)

    sys.exit(0)


if __name__ == '__main__':
    main()
