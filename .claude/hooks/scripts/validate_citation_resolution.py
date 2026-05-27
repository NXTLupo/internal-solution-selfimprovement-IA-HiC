#!/usr/bin/env python3
"""
Citation Resolution Validator — Stop hook.

Catches unresolved [CHUNK_NNN] references AND placeholder citations
('unknown', 'tbd', 'n/a', 'various sources') in any user-facing field.

Evidence from the last 20 runs (uncertainty-ledger.md):
  - "VAGUE EVIDENCE: 'unknown' has no specifics" (4 instances)
  - "UNRESOLVED: 12 CHUNK refs: [CHUNK_402], [CHUNK_403], [CHUNK_501]"

These survive slidePostProcessor and ship to the reader. The fix is a
hard Stop hook that refuses to let the deliverable leave the Claude Code
session with any reader-visible chunk reference or placeholder citation.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json
import re

CHUNK_PATTERN = re.compile(r'\[CHUNK_\d+\]', re.IGNORECASE)
PLACEHOLDER_PATTERNS = re.compile(
    r'\b(unknown|n/a|tbd|to be determined|to be confirmed|forthcoming|'
    r'placeholder|various sources|multiple sources|several sources|'
    r'literature|the research|the studies|the data|intelligence_sources|'
    r'\[needs.*?\]|\[insert.*?\])\b',
    re.IGNORECASE
)

# Fields that the user actually reads — leak here = ship failure
USER_VISIBLE_FIELDS = {
    'citations', 'sources', 'citation', 'source', 'evidenceBasis',
    'evidence', 'quote', 'key_quote', 'keyQuote', 'speakerNotes',
    'speaker_notes', 'narrative', 'content', 'title', 'subtitle',
    'description', 'summary', 'caption', 'finding', 'insight',
}

# Fields that may legitimately contain a chunk reference as machine data
MACHINE_ONLY_FIELDS = {
    'chunk_id', 'chunkId', 'raw_chunk_ref', 'rawChunkRef',
    '_internal', 'debug_info',
}


def find_violations(obj, path=""):
    """Yield (path, kind, snippet) for every leak in a user-visible field."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            sub_path = f"{path}.{k}" if path else k
            if k in MACHINE_ONLY_FIELDS:
                continue
            if isinstance(v, str):
                in_user_field = k in USER_VISIBLE_FIELDS or any(
                    field in k.lower() for field in USER_VISIBLE_FIELDS
                )
                if in_user_field or k in ('citations', 'sources'):
                    # Check for unresolved chunk references
                    chunk_hits = CHUNK_PATTERN.findall(v)
                    if chunk_hits:
                        yield (sub_path, 'unresolved_chunk_ref',
                               f"{chunk_hits[0]} in field — should resolve to 'SourceName: ArticleTitle'")
                    # Check for placeholders — only flag when the WHOLE field looks
                    # placeholder-ish, not when it's part of a longer sentence
                    if k in ('citations', 'sources') or k.endswith('_citations'):
                        # citations array entry: any placeholder = fail
                        if PLACEHOLDER_PATTERNS.search(v):
                            match = PLACEHOLDER_PATTERNS.search(v).group(0)
                            yield (sub_path, 'placeholder_in_citation',
                                   f"'{match}' is a forbidden generic citation; cite by named source")
                    elif in_user_field and len(v.strip()) < 80:
                        # Short user-facing field consisting mostly of placeholder
                        if PLACEHOLDER_PATTERNS.search(v):
                            stripped = v.strip()
                            ratio = len(PLACEHOLDER_PATTERNS.search(v).group(0)) / max(len(stripped), 1)
                            if ratio > 0.3:
                                yield (sub_path, 'placeholder_in_field',
                                       f"'{stripped[:60]}' field is mostly placeholder text")
            elif isinstance(v, list):
                # Special case: citations/sources arrays of strings
                if k in ('citations', 'sources'):
                    for i, c in enumerate(v):
                        if isinstance(c, str):
                            chunk_hits = CHUNK_PATTERN.findall(c)
                            if chunk_hits:
                                yield (f"{sub_path}[{i}]", 'unresolved_chunk_ref',
                                       f"{chunk_hits[0]} in citation — must resolve to named source")
                            if PLACEHOLDER_PATTERNS.search(c):
                                match = PLACEHOLDER_PATTERNS.search(c).group(0)
                                yield (f"{sub_path}[{i}]", 'placeholder_in_citation',
                                       f"'{match}' is a forbidden generic citation")
                yield from find_violations(v, sub_path)
            elif isinstance(v, dict):
                yield from find_violations(v, sub_path)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from find_violations(item, f"{path}[{i}]")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    violations = list(find_violations(data))

    if not violations:
        sys.exit(0)

    # Group by kind
    unresolved_chunks = [v for v in violations if v[1] == 'unresolved_chunk_ref']
    placeholders = [v for v in violations if 'placeholder' in v[1]]

    sys.stderr.write("CITATION RESOLUTION VALIDATION FAILED:\n")
    if unresolved_chunks:
        sys.stderr.write(
            f"  {len(unresolved_chunks)} unresolved [CHUNK_NNN] reference(s) leaked into user-visible fields.\n"
            f"  Every [CHUNK_NNN] must resolve to 'SourceName: ArticleTitle' format via citationResolver.ts.\n"
        )
        for path, kind, snippet in unresolved_chunks[:5]:
            sys.stderr.write(f"    - {path}: {snippet}\n")
        if len(unresolved_chunks) > 5:
            sys.stderr.write(f"    ... and {len(unresolved_chunks) - 5} more\n")
    if placeholders:
        sys.stderr.write(
            f"\n  {len(placeholders)} placeholder citation(s) — 'unknown', 'tbd', 'various sources', etc.\n"
            f"  Per .claude/CLAUDE.md, every citation must be a real named source identifier.\n"
        )
        for path, kind, snippet in placeholders[:5]:
            sys.stderr.write(f"    - {path}: {snippet}\n")
        if len(placeholders) > 5:
            sys.stderr.write(f"    ... and {len(placeholders) - 5} more\n")

    sys.stderr.write(
        "\nGuidance: invoke the chunk-reference-resolver skill (or equivalent) "
        "to map every [CHUNK_NNN] to a named source via getChunkSourceMap(). "
        "For placeholder citations, either source the claim or remove the claim — "
        "do not ship the placeholder.\n"
    )
    sys.exit(2)


if __name__ == '__main__':
    main()
