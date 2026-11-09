#!/usr/bin/env python3
"""
PreToolUse hook — Slop & Meta-Narration Write Blocker.

Blocks Edit/Write operations that would introduce banned phrases or
meta-narration regexes into HiC code (system prompts, exemplars, fallback
strings, tests, etc.). The runtime post-processor `slidePostProcessor.ts`
catches these at output time; this hook catches them at the source.

Scope: only fires on files inside humans-in-control-research/ that are
       code / config (.ts, .tsx, .js, .py, .json, .yml, .html, .css).
       Wiki content, plans, design notes, handoffs, and generated dist/
       are exempt — those are working docs, not generation logic.

Exit codes:
    0 — allow
    2 — block + feedback
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import (
    read_event,
    tool_name,
    file_path,
    proposed_text,
    is_hic_code_path,
    block,
    allow,
)

# Banned phrases — high severity. Mirror of validate_output.py SLOP_HIGH.
# Keep in sync if the source list is updated.
BANNED_PHRASES_HIGH = [
    "paradigm shift", "game-changer", "holistic approach", "cutting-edge",
    "best-in-class", "leverage synergies", "robust solution", "seamless integration",
    "actionable insights", "thought leadership", "value proposition", "core competency",
    "move the needle", "circle back", "deep dive", "low-hanging fruit",
    "in today's rapidly evolving landscape", "it's important to note",
    "it's worth noting", "it should be noted", "needless to say",
    "at the end of the day", "the reality is", "the fact of the matter",
    "as we navigate", "in this ever-changing", "the landscape of",
]

# False-positive guard: these phrases legitimately appear as identifiers,
# CSS class names, or imports in code. Skip the audit for lines containing
# obvious code structures.
CODE_LINE_SKIP = re.compile(
    r"""(
        ^\s*import\s |
        ^\s*from\s |
        ^\s*//        |
        ^\s*\#        |
        ^\s*\*        |
        className=    |
        @import       |
        url\(
    )""",
    re.VERBOSE,
)

# Meta-narration regexes — subset of META_NARRATION_PATTERNS from
# services/slidePostProcessor.ts. These catch the most common offenders
# at write time without exploding false positives.
META_NARRATION_REGEXES = [
    re.compile(r"\bgood (morning|afternoon|evening)\b", re.I),
    re.compile(r"\bthank you for (being here|joining|coming|attending)\b", re.I),
    re.compile(r"\bwelcome to\b", re.I),
    re.compile(r"\bas you can see\b", re.I),
    re.compile(r"\bthis slide shows\b", re.I),
    re.compile(r"\bin this (section|slide|part|presentation|deck|document|report)\b", re.I),
    re.compile(r"\b(in conclusion|to summarize|to conclude|in summary|to sum up)\b", re.I),
    re.compile(r"\bas (shown|outlined|described|discussed|noted|mentioned|illustrated)\s+(above|below|earlier|previously)\b", re.I),
    re.compile(r"\b(more|further|additional)\s+(research|investigation|analysis)\s+(is|will be|may be)?\s*(needed|required|warranted)\b", re.I),
    re.compile(r"\bevidence\s+(is|remains)\s+(limited|sparse|insufficient|lacking)\b", re.I),
    re.compile(r"\bdue to\s+(limited|insufficient|sparse|missing)\s+(data|evidence|research)\b", re.I),
    re.compile(r"\bevidence gap\b", re.I),
]

# QA annotations that must never ship in generated content.
QA_ANNOTATIONS = [
    "[needs baseline]", "[needs citation]", "baseline tbd",
    "[tbd]", "evidence gap",
]


def audit(text: str) -> list[str]:
    """Return list of violation messages. Empty list = clean."""
    violations: list[str] = []

    # Audit line by line so we can skip imports / class names / comments
    # without losing per-violation context.
    for lineno, line in enumerate(text.splitlines(), start=1):
        if CODE_LINE_SKIP.search(line):
            continue
        lower = line.lower()
        for phrase in BANNED_PHRASES_HIGH:
            if phrase in lower:
                violations.append(f"line {lineno}: banned slop phrase {phrase!r}")
        for rx in META_NARRATION_REGEXES:
            m = rx.search(line)
            if m:
                violations.append(f"line {lineno}: meta-narration {m.group(0)!r}")
        for qa in QA_ANNOTATIONS:
            if qa in lower:
                violations.append(f"line {lineno}: QA annotation {qa!r} — readers must never see these")

    return violations


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write", "NotebookEdit"}:
        allow()

    path = file_path(event)
    if not is_hic_code_path(path):
        allow()

    text = proposed_text(event)
    if not text:
        allow()

    violations = audit(text)
    if not violations:
        allow()

    msg_lines = [
        f"Blocked: {len(violations)} banned phrase / meta-narration / QA-annotation hit(s) in proposed write to {path}.",
        "",
        "Violations:",
    ]
    msg_lines.extend(f"  - {v}" for v in violations[:20])
    if len(violations) > 20:
        msg_lines.append(f"  - … and {len(violations) - 20} more")
    msg_lines += [
        "",
        "These are forbidden by .claude/CLAUDE.md (350+ banned phrases, meta-narration ban,",
        "no QA annotations). The runtime post-processor would strip them at output time —",
        "but they should never enter the codebase. Rewrite without these phrases.",
        "",
        "Authoritative source: humans-in-control-research/services/slidePostProcessor.ts",
        "(SLOP_PHRASES + META_NARRATION_PATTERNS) and .claude/hooks/scripts/validate_output.py.",
    ]
    block("\n".join(msg_lines))


if __name__ == "__main__":
    main()
