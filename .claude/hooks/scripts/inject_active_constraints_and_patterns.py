#!/usr/bin/env python3
"""
UserPromptSubmit Hook — Inject Active Constraints and Cross-Engagement Patterns.

Fires on every user prompt to Claude Code in this repo. Loads:
  1. wiki/synthesis/cross-engagement-patterns.md (produced by
     cross-engagement-pattern-miner skill)
  2. wiki/synthesis/learned-constraints.md (raw constraint log; we compact
     it inline before injection so the 50+ duplicate entries don't drown
     the signal)

Then emits a <learned_context> JSON block on stdout that Claude Code merges
into the system prompt for the current session.

If neither file exists or both are stale (>30 days), the hook emits nothing
and exits 0 — never blocks the user.

Stays small. Never reaches the network. Strict byte budget: emits at most
6 KB into the system prompt; trims if over.
"""
import sys
import os
import re
import json
import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WIKI_DIR = os.path.join(REPO_ROOT, 'humans-in-control-research', 'hic-workspace', 'wiki', 'synthesis')
PATTERNS_FILE = os.path.join(WIKI_DIR, 'cross-engagement-patterns.md')
CONSTRAINTS_FILE = os.path.join(WIKI_DIR, 'learned-constraints.md')

MAX_BYTES = 6 * 1024  # 6 KB budget for the injection
MAX_CONSTRAINTS = 12  # cap distinct constraints injected
STALE_DAYS = 30


def is_fresh(path):
    if not os.path.exists(path):
        return False
    try:
        mtime = os.path.getmtime(path)
        age_days = (datetime.datetime.now().timestamp() - mtime) / 86400
        return age_days <= STALE_DAYS
    except Exception:
        return False


def read_or_empty(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ''


def dedupe_constraints(raw_text):
    """The current learned-constraints.md is dominated by duplicates of the
    persona-quote and gap-impact constraints. Group by the normalized rule
    head and keep the longest variant per group."""
    if not raw_text:
        return []

    # Constraint lines start with "- CONSTRAINT" (with optional bracket tag)
    lines = [l.rstrip() for l in raw_text.splitlines() if l.strip().startswith('- CONSTRAINT')]

    groups = {}
    for line in lines:
        # Normalize: strip tag, source counts, confidence; keep the rule
        rule_part = re.sub(r'\(source:.*?\)', '', line)
        rule_part = re.sub(r'\[.*?\]', '', rule_part)
        rule_part = re.sub(r'\s+', ' ', rule_part).strip().lower()
        # Use the first 80 chars of the normalized rule as the dedup key
        key = rule_part[:80]
        existing = groups.get(key)
        if not existing or len(line) > len(existing):
            groups[key] = line

    # Stable order: longest constraints (richest detail) first
    result = sorted(groups.values(), key=lambda x: -len(x))
    return result[:MAX_CONSTRAINTS]


def compact_patterns(raw_text):
    """Take the cross-engagement-patterns.md body and return the top entries
    from each of the 5 pattern sections. If the file is missing or empty,
    return an empty string."""
    if not raw_text:
        return ''

    # Strip frontmatter
    body = re.sub(r'^---[\s\S]*?---\n', '', raw_text, count=1)

    # Keep section headings + their first 3 bullet/entry lines each
    out_lines = []
    current_section = None
    section_entries = 0
    for line in body.splitlines():
        stripped = line.rstrip()
        if stripped.startswith('## '):
            current_section = stripped
            section_entries = 0
            out_lines.append(stripped)
            continue
        if current_section and stripped and section_entries < 3:
            if stripped.startswith(('- ', '* ', 'RECURRENT', 'REJECTED_FRAMING',
                                     'SOURCE_GOLD', 'SHORTFALL', 'QUALITY_ANCHOR')):
                out_lines.append(stripped)
                section_entries += 1
        # ignore other lines

    return '\n'.join(out_lines).strip()


def build_payload():
    payload_parts = []
    have_signal = False

    # Patterns block
    if is_fresh(PATTERNS_FILE):
        patterns_compact = compact_patterns(read_or_empty(PATTERNS_FILE))
        if patterns_compact:
            payload_parts.append('CROSS-ENGAGEMENT PATTERNS (from prior runs):')
            payload_parts.append(patterns_compact)
            have_signal = True

    # Constraints block
    if is_fresh(CONSTRAINTS_FILE):
        constraints = dedupe_constraints(read_or_empty(CONSTRAINTS_FILE))
        if constraints:
            if payload_parts:
                payload_parts.append('')
            payload_parts.append('LEARNED CONSTRAINTS (deduped from user edit history):')
            payload_parts.extend(constraints)
            have_signal = True

    if not have_signal:
        return None

    text = '\n'.join(payload_parts)
    # Enforce byte budget
    encoded = text.encode('utf-8')
    if len(encoded) > MAX_BYTES:
        # Trim from the bottom (lowest-signal entries)
        trimmed = encoded[:MAX_BYTES]
        # Avoid cutting mid-character
        text = trimmed.decode('utf-8', errors='ignore').rstrip() + '\n[truncated]'

    return text


def main():
    payload = build_payload()
    if not payload:
        sys.exit(0)

    # Claude Code UserPromptSubmit hook contract: stdout content is added to
    # the assistant's system context for the prompt that triggered the hook.
    output = {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": (
                "<learned_context>\n"
                f"{payload}\n"
                "</learned_context>\n"
                "Apply the constraints and patterns above to any HiC research-generation "
                "work in this session. These reflect deduped lessons from prior engagements "
                "and edit-history corrections; they are not optional preferences."
            )
        }
    }
    sys.stdout.write(json.dumps(output))
    sys.exit(0)


if __name__ == '__main__':
    main()
