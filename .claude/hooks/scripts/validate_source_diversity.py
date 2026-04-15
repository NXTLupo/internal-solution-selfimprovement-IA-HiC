#!/usr/bin/env python3
"""
Source Diversity Validator — Ensures external sources dominate over client documents.
Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

Client documents (uploaded PDFs, SOWs, charters) provide context but must not
dominate citations. At least 60% of cited sources must be external research.
"""
import sys
import json
import re

CLIENT_DOC_PATTERNS = [
    re.compile(r'project\s*charter', re.I),
    re.compile(r'\bsow\b', re.I),
    re.compile(r'strategy\s*document', re.I),
    re.compile(r'\bproposal\b', re.I),
    re.compile(r'\btranscript\b', re.I),
    re.compile(r'\buploaded\b', re.I),
    re.compile(r'client\s*(doc|document|file)', re.I),
    re.compile(r'CLR\s*Project', re.I),
    re.compile(r'Advancement\s*(Proposal|Strategy)', re.I),
    re.compile(r'ITS\s*(Strategy|Document)', re.I),
]


def is_client_doc(source_name):
    """Check if a source name matches a client document pattern."""
    for pattern in CLIENT_DOC_PATTERNS:
        if pattern.search(source_name):
            return True
    return False


def collect_sources(obj):
    """Recursively collect all cited source names."""
    sources = set()
    if isinstance(obj, dict):
        for key in ('citations', 'sources'):
            if key in obj and isinstance(obj[key], list):
                for s in obj[key]:
                    if isinstance(s, str) and len(s.strip()) > 2:
                        sources.add(s.strip())
        for v in obj.values():
            sources |= collect_sources(v)
    elif isinstance(obj, list):
        for item in obj:
            sources |= collect_sources(item)
    return sources


def validate(data):
    failures = []
    all_sources = collect_sources(data)

    if len(all_sources) < 3:
        # Too few sources to make a judgment — warn but don't block
        if len(all_sources) > 0:
            failures.append(f"WARNING: Only {len(all_sources)} distinct sources cited total. Expected 5+.")
        return failures  # Don't block on very small outputs

    client = {s for s in all_sources if is_client_doc(s)}
    external = all_sources - client

    pct_external = len(external) / len(all_sources) * 100

    if pct_external < 60:
        failures.append(
            f"SOURCE DIVERSITY FAILED: {pct_external:.0f}% external ({len(external)} of {len(all_sources)}). "
            f"Need >= 60% external sources."
        )
        failures.append(f"  Client docs cited: {', '.join(sorted(client)) if client else 'none'}")
        failures.append(f"  External cited: {', '.join(sorted(list(external)[:10]))}")
        if len(external) > 10:
            failures.append(f"  ... and {len(external) - 10} more external sources")

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    blocking = [f for f in failures if not f.startswith("WARNING")]

    if blocking:
        sys.stderr.write("SOURCE DIVERSITY VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  {f}\n")
        sys.stderr.write("\nThe output is dominated by client documents. Lead with external research.\n")
        sys.exit(2)

    # Warnings only — pass but log
    if failures:
        sys.stderr.write("SOURCE DIVERSITY WARNINGS:\n")
        for f in failures:
            sys.stderr.write(f"  {f}\n")

    sys.exit(0)


if __name__ == '__main__':
    main()
