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


# Constraints that contradict the master Quantitative Claim Rule in
# .claude/CLAUDE.md (numbers ride inside cited quotes, never as mandated dollar
# assertions). Mirrors services/constraintQualityGate.ts so the agent session
# and the SPA enforce the SAME bar. A deduped duplicate is still a violation;
# dedup alone was letting "quantify in dollars" reach the prompt.
_MASTER_RULE_PATTERNS = [
    re.compile(r'quantif\w*.{0,60}(dollar|financial|monetary|\$)', re.I),
    re.compile(r'\b(in|with|using|provide|state|give|express)\s+(precise\s+|concrete\s+|specific\s+)?(dollar|financial|monetary)\b', re.I),
    re.compile(r'(concrete|precise|specific|hard)\s+financial\s+metric', re.I),
    re.compile(r'\bdollar\s+(figure|amount|value|impact|metric)', re.I),
    re.compile(r'(include|add|put|place|state|use|insert|lead with).{0,40}(percentage|percent|statistic|number|figure|metric|dollar).{0,40}(title|heading|headline|kpi|tile|label)', re.I),
]

# Low-signal boilerplate (generateConstraint output + vague user mutterings).
_GENERIC_STUB_PATTERNS = [
    re.compile(r'needs attention', re.I),
    re.compile(r'user edits detected', re.I),
    re.compile(r'requires more accuracy', re.I),
    re.compile(r'review factual claims and specificity', re.I),
    re.compile(r'\badd more detail', re.I),
    re.compile(r'clean up the output', re.I),
    re.compile(r'\bmake it clear(er)?\b', re.I),
    re.compile(r'free of jargon', re.I),
    re.compile(r'structure needs revision', re.I),
]


def _rule_body(line):
    """Strip the '- CONSTRAINT [scope]:' prefix and trailing '(source: ...)'."""
    s = re.sub(r'^[-*]\s*', '', line.strip())
    s = re.sub(r'^CONSTRAINT\s*(\[[^\]]*\])?\s*:\s*', '', s, flags=re.I)
    s = re.sub(r'\(source:.*?\)\s*$', '', s, flags=re.I)
    return s.strip()


# 2026-06-14 - lexicon-feedback rules are legitimately terse; exempt from the 40-char
# floor so a writing-voice correction injects (mirrors constraintQualityGate.ts).
_LEXICON_RULE_PATTERNS = [
    re.compile(r"\b(never|don'?t|do not|stop|avoid|ban)\s+(use|using|say|saying|write|writing|reword|rephrase)\b", re.I),
    re.compile(r"\bis (slop|fine|acceptable|allowed|banned|forbidden|the correct term)\b", re.I),
    re.compile(r"\b(prefer|replace)\s+[\"'\w-]+\s+(with|over)\s+[\"'\w-]+", re.I),
]


def _is_acceptable(line):
    body = _rule_body(line)
    is_lexicon = any(rx.search(body) for rx in _LEXICON_RULE_PATTERNS)
    if not is_lexicon and len(body) < 40:
        return False
    for rx in _MASTER_RULE_PATTERNS:
        if rx.search(body):
            return False
    for rx in _GENERIC_STUB_PATTERNS:
        if rx.search(body):
            return False
    return True


def dedupe_constraints(raw_text):
    """The current learned-constraints.md is dominated by duplicates of the
    persona-quote and gap-impact constraints. First REJECT master-rule
    violations and generic stubs, then group by the normalized rule head and
    keep the longest variant per group."""
    if not raw_text:
        return []

    # Constraint lines start with "- CONSTRAINT" (with optional bracket tag)
    lines = [l.rstrip() for l in raw_text.splitlines() if l.strip().startswith('- CONSTRAINT')]
    # QUALITY GATE: drop violations + stubs before dedup.
    lines = [l for l in lines if _is_acceptable(l)]

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
