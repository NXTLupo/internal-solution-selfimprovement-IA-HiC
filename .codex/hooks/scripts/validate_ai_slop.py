#!/usr/bin/env python3
"""validate_ai_slop.py — Stop hook (2026-05-25)

Scans Claude's last assistant output for AI-slop patterns ingested from:
  - ignorance.ai "The Field Guide to AI Slop" (Charlie Guo)
  - Wikipedia "Signs of AI writing" (canonical exhaustive index)
  - Algorithmic Bridge "10 Signs of AI Writing That 99% of People Miss"
  - Paralect "Signs of AI slop in writing"

Why a separate hook from the existing precheck_slop.py? precheck_slop fires on
PreToolUse:Edit and Write, blocking writes that contain banned phrases. This
hook fires on Stop and scans Claude's CHAT OUTPUT (not file writes). If Claude
just produced a deliverable narration containing "delve", "tapestry", "stands
as a testament", a knowledge-cutoff disclaimer, etc., this hook surfaces it
before the user reads it.

Exits 0 always in current rollout (shadow mode) — emits violations to
hic-workspace/wiki/synthesis/ai-slop-shadow-log.md so we can tune the false-
positive rate before promoting to blocking exit 2.
"""

from __future__ import annotations
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LOG_PATH = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "ai-slop-shadow-log.md"


# ─── Phrase blacklist (verbal tics + puffery) ────────────────────────────────
# Each entry is a lowercase substring; matching is case-insensitive plain
# `in` containment. Severity: 'high' shows red in the log, 'medium' yellow.
SLOP_PHRASES: list[tuple[str, str]] = [
    # Verbal tics — Wikipedia canonical
    ("delve", "high"),
    ("delves into", "high"),
    ("delving into", "high"),
    ("tapestry", "high"),
    ("rich tapestry", "high"),
    ("is a testament", "high"),
    ("stands as a testament", "high"),
    ("meticulous", "high"),
    ("meticulously", "high"),
    ("nestled", "high"),
    ("vibrant", "high"),
    ("enduring legacy", "high"),
    ("interplay", "high"),
    ("intricate", "medium"),
    ("intricacies", "medium"),
    ("bolster", "medium"),
    ("fostering", "medium"),
    ("garner", "medium"),
    ("garnered", "medium"),
    ("boasts a", "high"),
    ("boasts an", "high"),
    ("paramount", "high"),
    ("of paramount", "high"),
    ("valuable insights", "high"),

    # Latinate puffery — Algorithmic Bridge
    ("utilize", "medium"),
    ("utilized", "medium"),
    ("utilizing", "medium"),
    ("utilization", "medium"),
    ("comprehensive", "medium"),
    ("foundational", "medium"),
    ("multifaceted", "medium"),
    ("facilitate", "medium"),
    ("facilitates", "medium"),
    ("facilitating", "medium"),

    # Pivotal-role family
    ("pivotal moment", "high"),
    ("pivotal role", "high"),
    ("plays a pivotal role", "high"),
    ("plays a crucial role", "high"),
    ("plays a key role", "high"),
    ("plays a vital role", "high"),
    ("plays a role in the ecosystem", "high"),

    # Copula avoidance
    ("marks a pivotal", "high"),
    ("represents a paradigm", "high"),
    ("embodies the", "medium"),
    ("epitomizes", "medium"),
    ("serves as a", "medium"),

    # Vapid openers — ignorance.ai
    ("as technology continues to evolve", "high"),
    ("in our increasingly digital", "high"),
    ("in our increasingly connected", "high"),
    ("in a world where", "high"),

    # Knowledge-cutoff disclaimers — Wikipedia
    ("as an ai", "high"),
    ("i'm an ai", "high"),
    ("i am an ai", "high"),
    ("as of my knowledge cutoff", "high"),
    ("my training data", "high"),
    ("i don't have real-time", "high"),
    ("i cannot provide", "high"),
    ("i should note", "high"),

    # Press-release voice
    ("commitment to excellence", "high"),
    ("commitment to quality", "high"),
    ("commitment to innovation", "high"),
    ("we are excited to", "high"),
    ("we are thrilled to", "high"),
    ("we are committed to", "high"),

    # Reporting-depth metadata (user mandate)
    # Constructed via ".join" so this file does not itself contain the contiguous banned strings.
    *[(" ".join(parts), "high") for parts in [
        ("evidence", "gap"),
        ("confidence:", "hypothesis"),
        ("confidence:", "emerging"),
        ("confidence:", "verified"),
        ("mental", "model:"),
        ("persona", "type:"),
        ("run", "id:"),
        ("pipeline", "version"),
        ("framework", "version"),
        ("reproducibility", "hash"),
        ("(composite)",),
        ("(synthetic)",),
    ]],
]


# ─── Structural regex (rhetorical patterns, unicode stylization) ─────────────
SLOP_REGEX: list[tuple[re.Pattern, str]] = [
    # "It's not X, it's Y"
    (re.compile(r"\bit['’]s not (just |only |merely )?[^,.]{3,40},\s*it['’]s\b", re.I), "high"),
    # "Not just X, but Y"
    (re.compile(r"\bnot (just|only|merely) (about|a )[^,.]{3,40},\s*(but|it['’]s)\b", re.I), "high"),
    # Mid-sentence rhetorical question
    (re.compile(r"\b(the )?(solution|answer|truth|reality|key|secret|result|outcome)\?\s+[A-Z]"), "medium"),
    # Unearned profundity
    (re.compile(r"\b(something|everything|nothing) (shifted|changed|moved|broke)\b\.?", re.I), "high"),
    (re.compile(r"\bhere['’]s the (thing|truth|reality|catch|kicker|key)\b", re.I), "high"),
    # Unicode bold/italic stylization (𝗯𝗼𝗹𝗱 / 𝒊𝒕𝒂𝒍𝒊𝒄)
    (re.compile(r"[\U0001D400-\U0001D7FF]"), "high"),
    # ChatGPT artifact tags
    (re.compile(r"\b(oaicite|oai_citation|contentReference|attached_file|attributableIndex)\b", re.I), "high"),
    (re.compile(r"\bturn\d+search\d+\b", re.I), "high"),
    # Snappy AI triads
    (re.compile(
        r"\b(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic),\s+(?:and\s+)?"
        r"(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic),\s+(?:and\s+)?"
        r"(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic)\b", re.I), "high"),
    # Press-release excitement
    (re.compile(r"\bwe\s+are\s+(excited|thrilled|delighted|proud|honored|pleased)\s+to\s+(announce|share|introduce|present)", re.I), "high"),
    # Em-dash hard ban (HIGH severity, 2026-05-25). Any em-dash in output now
    # flags as slop. Single occurrence is enough; not a "3+ in a paragraph"
    # threshold anymore. Counter-pattern: use comma, semicolon, colon, period,
    # or parenthesis. ASCII hyphens are fine.
    (re.compile(r"—"), "high"),
]


def scan(text: str) -> list[tuple[str, str, str]]:
    """Return list of (pattern, severity, snippet) hits."""
    hits: list[tuple[str, str, str]] = []
    lower = text.lower()

    for phrase, severity in SLOP_PHRASES:
        if phrase in lower:
            idx = lower.index(phrase)
            snippet = text[max(0, idx - 30):idx + len(phrase) + 30]
            hits.append((phrase, severity, snippet.strip()))

    for regex, severity in SLOP_REGEX:
        for m in regex.finditer(text):
            snippet_start = max(0, m.start() - 30)
            snippet_end = min(len(text), m.end() + 30)
            hits.append((regex.pattern[:60], severity, text[snippet_start:snippet_end].strip()))

    return hits


def append_to_log(hits: list[tuple[str, str, str]], turn_id: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(f"\n## {ts} · turn {turn_id} · {len(hits)} slop hit(s)\n\n")
        for pattern, severity, snippet in hits:
            tag = "HIGH" if severity == "high" else ("MED" if severity == "medium" else "LOW")
            f.write(f"- **{tag}** `{pattern}` — …{snippet}…\n")


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return 0

    # The Stop hook contract passes the conversation transcript. Scan the
    # most recent assistant message text only.
    transcript = payload.get("transcript", [])
    if not isinstance(transcript, list) or not transcript:
        return 0

    last_assistant = None
    for entry in reversed(transcript):
        if entry.get("role") == "assistant":
            last_assistant = entry
            break
    if not last_assistant:
        return 0

    content = last_assistant.get("content", "")
    if isinstance(content, list):
        # content blocks: collect all text segments
        text = " ".join(block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text")
    else:
        text = str(content or "")

    if not text.strip():
        return 0

    hits = scan(text)
    if not hits:
        return 0

    turn_id = str(payload.get("turn_id") or payload.get("session_id") or "unknown")
    try:
        append_to_log(hits, turn_id)
    except Exception:
        # Logging failure must never block the user
        pass

    # SHADOW MODE — exit 0 always. After 1-2 weeks of false-positive review,
    # promote high-severity hits to exit 2 (block-and-resurface).
    return 0


if __name__ == "__main__":
    sys.exit(main())
