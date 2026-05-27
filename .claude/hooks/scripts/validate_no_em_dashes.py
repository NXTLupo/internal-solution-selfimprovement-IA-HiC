#!/usr/bin/env python3
"""validate_no_em_dashes.py - Stop hook (2026-05-26)

Hard-enforces the em-dash ban from .claude/CLAUDE.md "Format Tells":

    NEVER use the em-dash character (U+2014) anywhere in any rendered output.
    Em-dashes are the single most reliable AI-writing tell.

The `slidePostProcessor.ts::stripEmDashes` function auto-replaces em-dashes
in slide content at runtime, but that function was not being applied to:
  - chat-reply text (just fixed in services/corpusChatService.ts on 2026-05-26)
  - design-desk freeform-HTML artifacts at first emit
  - any future surface that bypasses slidePostProcessor

This hook is the final defense: it scans the assistant's transcript output
for U+2014 and fails the Stop event if any are present.

Exits with code 2 (block + show feedback to Claude) when violations are
found in CHAT OUTPUT (not file writes - the precheck hooks cover those).
ASCII hyphens (U+002D) and en-dashes (U+2013) are left alone.

Aligns with the existing validate_ai_slop.py pattern - both run on Stop and
both scan transcript output rather than file writes.
"""

from __future__ import annotations
import json
import sys
from pathlib import Path

EM_DASH = "—"  # the only character we ban

# Fields inside a transcript message we care about. Other surfaces (tool
# inputs, file paths) may legitimately carry hyphens for non-text reasons.
TEXT_KEYS = ("content", "text", "message", "value")


def _extract_text_blocks(payload) -> list[str]:
    """Walk a JSON-ish structure and yield every string under TEXT_KEYS."""
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


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return 0
    try:
        event = json.loads(raw)
    except Exception:
        # If we can't parse the event, do not block - this hook is defensive,
        # not the sole line of defense. Slip-through is logged by other layers.
        return 0

    # The Stop event carries the latest assistant message under varying keys
    # depending on Claude Code version. Walk everything under TEXT_KEYS and
    # also any "transcript" / "messages" arrays.
    candidates: list[str] = []
    candidates.extend(_extract_text_blocks(event.get("message")))
    candidates.extend(_extract_text_blocks(event.get("response")))
    candidates.extend(_extract_text_blocks(event.get("output")))
    candidates.extend(_extract_text_blocks(event.get("transcript")))
    candidates.extend(_extract_text_blocks(event.get("messages")))
    candidates.extend(_extract_text_blocks(event))  # fallback: scan everything

    violations: list[str] = []
    for block in candidates:
        if EM_DASH in block:
            # Capture a 60-char snippet centered on the em-dash for the log.
            idx = block.find(EM_DASH)
            start = max(0, idx - 30)
            end = min(len(block), idx + 30)
            snippet = block[start:end].replace("\n", " ")
            violations.append(snippet)

    if not violations:
        return 0

    # Deduplicate by snippet so we don't spam the same em-dash 50 times when
    # one block was copied into multiple transcript shapes.
    unique_violations = list(dict.fromkeys(violations))[:8]

    msg = [
        "[em-dash-ban] Output contains U+2014 (em-dash) characters.",
        ".claude/CLAUDE.md Format Tells declares this a HARD BAN - em-dashes",
        "are the single most reliable AI-writing tell.",
        "",
        "Replace each em-dash with a comma, semicolon, colon, period, or",
        "parenthesis. ASCII hyphens in compound words are fine.",
        "",
        "Snippets:",
    ]
    for i, snippet in enumerate(unique_violations, 1):
        msg.append(f"  {i}. ...{snippet}...")

    print("\n".join(msg), file=sys.stderr)
    return 2  # block + show feedback to Claude


if __name__ == "__main__":
    sys.exit(main())
