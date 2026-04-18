"""
Deterministic Output Validation Hook for Humans-in-Control Research Workbench.

Registered as a Claude Code Stop hook in .claude/settings.json. Fires after every
assistant turn. Behaviour:

1.  Reads the Stop event JSON payload from stdin, locates the transcript file,
    and extracts the last assistant message text.
2.  If that message contains NO structured blocks (:::slide, :::deliverable:,
    :::nxt:) the hook exits 0 (pass) — conversational replies are not audited.
3.  If structured blocks are present, the hook validates them against:
      - banned slop phrases / meta-narration / generic citations
      - citation density (>=3 named citations per 200 words of block content)
      - NXT block source-attribution requirement
      - topic-label titles (action titles only)
4.  Exit codes:
      0 — pass
      2 — blocking failure (Claude re-runs with corrective feedback)

Can also be invoked directly (`python validate_output.py path/to/text.md`) for
ad-hoc testing outside the hook system.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import List, Optional, Tuple

# ---------------------------------------------------------------------------
# Banned-phrase corpora. Only enforced inside structured blocks so normal prose
# replies like "at the end of the day" don't accidentally fail validation.
# ---------------------------------------------------------------------------

SLOP_HIGH = [
    "paradigm shift", "game-changer", "holistic approach", "cutting-edge",
    "best-in-class", "leverage synergies", "robust solution", "seamless integration",
    "actionable insights", "thought leadership", "value proposition", "core competency",
    "move the needle", "circle back", "deep dive", "low-hanging fruit", "synergy",
    "ecosystem", "disruptive", "innovative solution",
    "in today's rapidly evolving landscape", "it's important to note",
    "it's worth noting", "it should be noted", "needless to say",
    "at the end of the day", "the reality is", "the fact of the matter",
    "when it comes to", "as we navigate", "in this ever-changing", "the landscape of",
]

SLOP_MEDIUM = [
    "it seems", "may or may not", "to some extent", "in some ways",
    "conceivably", "it could be said",
    "moving forward", "going forward", "at this point in time",
    "in the current climate", "as we move forward", "on a go-forward basis",
    "at the present time",
    "seismic shift", "trailblazing",
]

META_NARRATION = [
    "good morning", "good afternoon", "good evening",
    "welcome to", "thank you for being here", "thank you for joining",
    "today we will", "today we'll", "we will present",
    "we now move to", "we are now entering", "let us now examine",
    "in this section", "in this presentation", "in this deck",
    "this slide shows", "the next slide",
    "our objective is to", "allow me to", "before we begin",
    "i'd like to start by", "let's dive into", "let's explore",
]

GENERIC_CITATIONS = [
    "research shows", "studies indicate", "data suggests", "sources confirm",
    "evidence points to", "analysis reveals", "intelligence suggests",
    "multiple sources", "various sources",
]

TOPIC_TITLES = [
    "the landscape", "key findings", "recommendations", "the path forward",
    "overview", "introduction", "background", "conclusion", "summary",
    "the complication", "the situation", "next steps", "action items",
]

ALL_BANNED = (
    [(p, "slop-high") for p in SLOP_HIGH]
    + [(p, "slop-medium") for p in SLOP_MEDIUM]
    + [(p, "meta-narration") for p in META_NARRATION]
    + [(p, "generic-citation") for p in GENERIC_CITATIONS]
)

# Fence patterns for the three structured-output systems
BLOCK_PATTERNS = [
    re.compile(r":::slide(?:\s+[a-z]+=[a-z-]+)*\s*\n([\s\S]*?):::", re.MULTILINE),
    re.compile(r":::deliverable:[a-z_-]+\s*\n([\s\S]*?):::", re.MULTILINE),
    re.compile(r":::nxt:([a-z-]+)\s*\n([\s\S]*?):::", re.MULTILINE),
]


def extract_structured_blocks(text: str) -> List[str]:
    """Return every structured-block body in the response as plain text."""
    chunks: List[str] = []
    for pat in BLOCK_PATTERNS:
        for m in pat.finditer(text):
            # nxt pattern has 2 groups; others have 1. Always take the last one (body).
            chunks.append(m.group(m.lastindex))
    return chunks


def validate_block(block: str) -> List[str]:
    """Run all checks against a single structured block's text."""
    errors: List[str] = []
    lower = block.lower()

    # 1. Banned phrases (exact substring, lowercase)
    for phrase, category in ALL_BANNED:
        if phrase in lower:
            errors.append(f"[{category}] banned phrase: \"{phrase}\"")

    # 2. Topic-label titles  ("title": "Key Findings")
    for pattern in TOPIC_TITLES:
        regex = re.compile(rf'"title"\s*:\s*"({re.escape(pattern)})"', re.IGNORECASE)
        if regex.search(block):
            errors.append(
                f"[action-title] \"{pattern}\" is a topic label, not a conclusion. "
                f"Rewrite the title as a complete sentence with specific data."
            )

    # 3. Source attribution on data blocks (stat-row, grid, comparison-table)
    #    These blocks MUST contain a "source" field.
    if any(needle in lower for needle in ("stat-row", "grid-matrix", "comparison-table")):
        if '"source"' not in lower and 'source:' not in lower:
            errors.append(
                "[nxt-attribution] Data block is missing a 'source' field. "
                "Every stat, row, or matrix cell needs an attributed source."
            )

    return errors


def validate_transcript_text(text: str) -> Tuple[bool, List[str]]:
    """Top-level validator. Returns (passed, errors)."""
    blocks = extract_structured_blocks(text)
    if not blocks:
        # Conversational reply — nothing to audit.
        return True, []

    all_errors: List[str] = []
    combined_block_text = "\n".join(blocks)

    # Citation-density check across ALL structured blocks combined.
    citations = re.findall(r'\[([^\]]+?):\s*"[^"]+"\]', combined_block_text)
    block_words = len(combined_block_text.split())
    if block_words > 200 and len(citations) < 3:
        all_errors.append(
            f"[citation-density] Only {len(citations)} named-source citations in "
            f"{block_words} words of structured output. Minimum is 3 per 200 words."
        )

    # Per-block checks
    for i, block in enumerate(blocks, 1):
        for err in validate_block(block):
            all_errors.append(f"block {i}: {err}")

    return (len(all_errors) == 0), all_errors


# ---------------------------------------------------------------------------
# Hook payload plumbing
# ---------------------------------------------------------------------------

def last_assistant_text(transcript_path: str) -> Optional[str]:
    """Read a Claude Code transcript JSONL and return the last assistant message."""
    try:
        p = Path(transcript_path)
        if not p.exists():
            return None
        last_text: Optional[str] = None
        with p.open("r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                role = entry.get("role") or entry.get("type")
                if role not in ("assistant", "message"):
                    continue
                # Content can be a string or a list of content blocks
                content = entry.get("content") or entry.get("text")
                if isinstance(content, list):
                    parts = [c.get("text", "") for c in content if isinstance(c, dict)]
                    text = "\n".join(p for p in parts if p)
                elif isinstance(content, str):
                    text = content
                else:
                    continue
                if text:
                    last_text = text
        return last_text
    except Exception:
        return None


def main() -> None:
    raw = sys.stdin.read().strip()

    text: Optional[str] = None

    # 1. Try hook payload (JSON with transcript_path)
    if raw.startswith("{"):
        try:
            payload = json.loads(raw)
            tp = payload.get("transcript_path") or payload.get("transcriptPath")
            if tp:
                text = last_assistant_text(tp)
        except json.JSONDecodeError:
            pass

    # 2. Direct file argument for ad-hoc testing
    if text is None and len(sys.argv) > 1:
        try:
            text = Path(sys.argv[1]).read_text(encoding="utf-8")
        except OSError:
            pass

    # 3. Fall back to treating stdin as raw text
    if text is None:
        text = raw

    if not text:
        # Nothing to validate — pass silently so conversational turns don't
        # produce noise.
        sys.exit(0)

    passed, errors = validate_transcript_text(text)

    if passed:
        sys.exit(0)

    # Fail with an agent-readable message. The Stop hook surfaces exit-2 stderr
    # back to Claude so the next turn can self-correct.
    print("Deliverable output failed validation:", file=sys.stderr)
    for i, err in enumerate(errors, 1):
        print(f"  {i}. {err}", file=sys.stderr)
    print(
        "\nRewrite the offending structured block(s) so every banned phrase is "
        "removed, titles are conclusion sentences with data, and every stat "
        "block carries a named source.",
        file=sys.stderr,
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
