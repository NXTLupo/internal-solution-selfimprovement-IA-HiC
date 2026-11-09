#!/usr/bin/env python3
"""validate_speculative_claims.py - Stop hook (2026-05-26)

Catches commonly-unverified statistics in HiC deliverable output. The
cross-engagement-patterns memory has a registry of "Speculative and
Pending Portfolio Patterns" — recurring claims that generators emit
without grounding:

  - "McKinsey 70% [digital transformation] failure rate"
  - "MarTech utilization at 33%"
  - "Customer Data Platform adoption rate of N%"
  - "Gartner 5-stage [maturity] model"
  - "Forrester 4-stage [maturity] model"
  - any percentage / dollar figure / N-fold multiplier with no named source

When generators reach for these stats without naming a source AND a
date, they slip the speculative-pattern flag through to user-facing
output. This hook blocks that.

Behavior:
  - Scans transcript output for the catalogued speculative claim
    fingerprints listed in SPECULATIVE_PATTERNS.
  - For each match, requires a co-located named-source citation
    (a parenthetical with publication name, OR a [CHUNK_XXX] resolved
    to a real source, OR an inline "Source: <Publisher>, <Year>" block).
  - If the speculative claim appears WITHOUT co-located attribution,
    blocks the Stop event with a structured message that names the
    specific phrase and the rule it violated.

Exit codes:
  0 — clean, all speculative-pattern claims have attribution
  2 — block + show feedback (claim emitted without named source)

Cross-references:
  - .claude/CLAUDE.md "No Fabrication" rule
  - hic-workspace/wiki/synthesis/cross-engagement-patterns.md
    (Speculative and Pending Portfolio Patterns section)
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

# Each entry: (regex-pattern, human-readable-label, severity)
# Severity 'hard' = block; 'soft' = warn-only (exit 0 with stderr note).
SPECULATIVE_PATTERNS: list[tuple[re.Pattern, str, str]] = [
    # Quantitative claims that need explicit publisher + year attribution.
    (re.compile(r"\b70\s*%\s*(?:digital\s*)?(?:transformation\s*)?(?:failure|fail)", re.I),
     "McKinsey 70% transformation failure-rate",
     "hard"),
    (re.compile(r"\bMarTech\s+(?:utilization|stack|adoption).{0,30}\b\d{1,3}\s*%", re.I),
     "MarTech utilization percentage",
     "hard"),
    (re.compile(r"\b(?:CDP|Customer\s+Data\s+Platform)\s+adoption.{0,30}\b\d{1,3}\s*%", re.I),
     "CDP adoption rate",
     "hard"),
    (re.compile(r"\bGartner\b.{0,40}\b(?:5|five)[- ]stage\b.{0,30}\bmaturity", re.I),
     "Gartner 5-stage maturity model",
     "soft"),
    (re.compile(r"\bForrester\b.{0,40}\b(?:4|four)[- ]stage\b.{0,30}\bmaturity", re.I),
     "Forrester 4-stage maturity model",
     "soft"),
    # Generic catch-alls — unsourced multipliers and dollar figures
    (re.compile(r"\b(?:\d+(?:\.\d+)?)\s*x\s+(?:revenue|growth|ROI|productivity|efficiency|conversion)", re.I),
     "Unsourced N-fold multiplier",
     "soft"),
    (re.compile(r"\$\s*\d+(?:\.\d+)?\s*(?:B|billion|M|million|T|trillion)\b", re.I),
     "Unsourced dollar figure",
     "soft"),
]

# Co-located attribution patterns. If ANY of these appear within 200
# characters of the speculative claim, the claim is considered sourced.
ATTRIBUTION_PATTERNS = [
    re.compile(r"\(\s*[A-Z][\w\.\& ]+,\s*\d{4}\s*\)"),                  # (McKinsey, 2024)
    re.compile(r"Source:\s*[A-Z][\w\.\& ]+", re.I),                     # Source: Higher Ed Dive
    re.compile(r"\[CHUNK_[A-Z0-9_]+\]"),                                # [CHUNK_123] (left unresolved is OK at the hook level — citation-resolution hook handles that)
    re.compile(r"\baccording to\s+(?:[A-Z][\w\.\&]+\s*){1,4}", re.I),   # according to McKinsey
    re.compile(r"\bper\s+(?:[A-Z][\w\.\&]+\s*){1,4}", re.I),            # per Gartner
    re.compile(r"\bcited by\s+[A-Z][\w\.\& ]+", re.I),
]

TEXT_KEYS = ("content", "text", "message", "value", "narrative", "speakerNotes", "evidenceBasis", "summary")


def _extract_text_blocks(payload) -> list[str]:
    out: list[str] = []
    if isinstance(payload, str):
        out.append(payload)
    elif isinstance(payload, dict):
        for k, v in payload.items():
            if k in TEXT_KEYS and isinstance(v, str):
                out.append(v)
            else:
                out.extend(_extract_text_blocks(v))
    elif isinstance(payload, list):
        for item in payload:
            out.extend(_extract_text_blocks(item))
    return out


def has_colocated_attribution(text: str, match_start: int, match_end: int, window: int = 200) -> bool:
    """True if any attribution pattern appears within `window` characters
    of the speculative-claim span."""
    start = max(0, match_start - window)
    end = min(len(text), match_end + window)
    region = text[start:end]
    for pat in ATTRIBUTION_PATTERNS:
        if pat.search(region):
            return True
    return False


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return 0
    try:
        event = json.loads(raw)
    except Exception:
        return 0

    candidates: list[str] = []
    candidates.extend(_extract_text_blocks(event.get("message")))
    candidates.extend(_extract_text_blocks(event.get("response")))
    candidates.extend(_extract_text_blocks(event.get("output")))
    candidates.extend(_extract_text_blocks(event.get("transcript")))
    candidates.extend(_extract_text_blocks(event.get("messages")))
    candidates.extend(_extract_text_blocks(event))

    hard_violations: list[tuple[str, str]] = []  # (label, snippet)
    soft_violations: list[tuple[str, str]] = []

    for block in candidates:
        for pat, label, severity in SPECULATIVE_PATTERNS:
            for m in pat.finditer(block):
                if has_colocated_attribution(block, m.start(), m.end()):
                    continue
                snippet_start = max(0, m.start() - 30)
                snippet_end = min(len(block), m.end() + 30)
                snippet = block[snippet_start:snippet_end].replace("\n", " ")
                if severity == "hard":
                    hard_violations.append((label, snippet))
                else:
                    soft_violations.append((label, snippet))

    if not hard_violations and not soft_violations:
        return 0

    # Deduplicate by label+snippet
    hard_unique = list(dict.fromkeys(hard_violations))[:6]
    soft_unique = list(dict.fromkeys(soft_violations))[:6]

    msg = [
        "[speculative-claims] Output contains commonly-unverified statistics without co-located named-source attribution.",
        "",
        "Cross-engagement-patterns.md flags these claim families as recurring slip-throughs. .claude/CLAUDE.md No Fabrication rule requires named-source attribution within ~200 chars of the claim.",
        "",
    ]
    if hard_unique:
        msg.append("HARD violations (block):")
        for label, snippet in hard_unique:
            msg.append(f"  - {label}: ...{snippet}...")
        msg.append("")
    if soft_unique:
        msg.append("SOFT violations (warn-only):")
        for label, snippet in soft_unique:
            msg.append(f"  - {label}: ...{snippet}...")
        msg.append("")
    msg.append("Fix: add (Publisher, Year) parenthetical OR 'Source: ...' OR 'according to <Publisher>' within ~200 characters of the claim. If no source can be cited, OMIT the claim and adjust the surrounding narrative.")

    print("\n".join(msg), file=sys.stderr)
    return 2 if hard_unique else 0


if __name__ == "__main__":
    sys.exit(main())
