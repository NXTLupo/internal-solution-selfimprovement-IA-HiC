#!/usr/bin/env python3
"""validate_no_emoji.py - Stop hook (2026-05-27)

Hard-enforces the repo-wide EMOJI BAN (CLAUDE.md user-preferences + the
2026-05-27 "eliminate all emoji" directive). Emoji are an AI-output tell and,
on this platform, break Power Automate JSON escaping and read unprofessionally
in deliverables.

Runtime defense already exists:
  - proxy/app.py::_EMOJI_RE strips emoji from JM-rendered HTML
  - services/slidePostProcessor.ts::stripEmoji / stripFormatTells strips emoji
    from chat replies, router output, and deliverables

This hook is the AUTHORING defense: it scans the assistant's own transcript
output for emoji and fails the Stop event if any are present, so emoji never
get written into code, skills, prompts, or chat by the agent itself.

Exits with code 2 (block + show feedback) when emoji are found in output.
Geometric-shape bullets (U+25xx) and typographic arrows (U+21xx) are NOT
treated as emoji - they are legitimate layout glyphs - matching the runtime
strip's allow-list.
"""

from __future__ import annotations
import json
import re
import sys

# Emoji / pictograph ranges. Mirrors slidePostProcessor.ts EMOJI_RE and
# proxy/app.py _EMOJI_RE. Excludes U+25xx (geometric shapes / bullets) and
# U+21xx (arrows) deliberately.
EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"
    "\U00002600-\U000026FF"
    "\U00002700-\U000027BF"
    "\U00002B00-\U00002BFF"
    "\U0000231A-\U0000231B"
    "\U000023E0-\U000023FF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D"
    "]",
    flags=re.UNICODE,
)

TEXT_KEYS = ("content", "text", "message", "value")


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


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return 0
    try:
        event = json.loads(raw)
    except Exception:
        return 0

    candidates: list[str] = []
    for key in ("message", "response", "output", "transcript", "messages"):
        candidates.extend(_extract_text_blocks(event.get(key)))
    candidates.extend(_extract_text_blocks(event))  # fallback: scan everything

    violations: list[str] = []
    for block in candidates:
        for m in EMOJI_RE.finditer(block):
            idx = m.start()
            start = max(0, idx - 30)
            end = min(len(block), idx + 30)
            snippet = block[start:end].replace("\n", " ")
            violations.append(snippet)

    if not violations:
        return 0

    unique = list(dict.fromkeys(violations))[:8]
    msg = [
        "[emoji-ban] Output contains emoji / pictographic characters.",
        "Repo-wide HARD BAN: no emoji in code, skills, prompts, deliverables,",
        "or chat. They break Power Automate JSON escaping and read as an",
        "AI-output tell.",
        "",
        "Remove every emoji. Geometric bullets (U+25xx) and arrows (U+21xx)",
        "are allowed as layout glyphs; faces / hands / symbols are not.",
        "",
        "Snippets:",
    ]
    for i, snippet in enumerate(unique, 1):
        msg.append(f"  {i}. ...{snippet}...")

    print("\n".join(msg), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
