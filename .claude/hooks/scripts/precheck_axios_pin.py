#!/usr/bin/env python3
"""
PreToolUse hook — Axios version-pin enforcer.

Rule (memory: project_axios_audit): axios is pinned and must not be
auto-updated. Current pins:
    - internal-solutions-miro-generator        axios@1.6.2
    - internal-solutions-socialresearch        axios@1.7.9

Blocks any Edit/Write to package.json / package-lock.json that changes the
axios version line. Allows initial introduction (when there was no previous
pin) but flags it for review.

Exit codes:
    0 — allow
    2 — block + feedback
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, tool_input, file_path, normalize_path, block, allow

AXIOS_RX = re.compile(r'"axios"\s*:\s*"([^"]+)"')


def axios_version_in(text: str) -> str | None:
    m = AXIOS_RX.search(text or "")
    return m.group(1) if m else None


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write"}:
        allow()

    p = normalize_path(file_path(event))
    if not (p.endswith("/package.json") or p.endswith("/package-lock.json")):
        allow()

    ti = tool_input(event)
    new_text = ti.get("new_string", "") or ti.get("content", "")
    old_text = ti.get("old_string", "")

    new_v = axios_version_in(new_text)
    old_v = axios_version_in(old_text)

    if new_v is None:
        # Edit doesn't touch the axios line at all
        allow()

    # If this is a Write (full-file replace), read the current pin from disk
    # so we can compare against what was previously there.
    if tool_name(event) == "Write" and not old_v:
        try:
            current = Path(file_path(event)).read_text(encoding="utf-8", errors="ignore")
            old_v = axios_version_in(current)
        except Exception:
            pass

    if old_v and new_v != old_v:
        block(
            f"Blocked: axios version change in {p}.\n"
            f"\n  Current: {old_v}\n"
            f"  New:     {new_v}\n"
            f"\nRule (memory: project_axios_audit, 2026-03-31): axios is pinned and must not be\n"
            f"auto-updated. Known supply-chain concerns drove the decision to freeze these versions:\n"
            f"  - internal-solutions-miro-generator → axios@1.6.2\n"
            f"  - internal-solutions-socialresearch → axios@1.7.9\n"
            f"\nIf this change is genuinely required (e.g., security CVE the user has approved),\n"
            f"have the user authorize and run the version bump manually outside the agent session.\n"
        )

    allow()


if __name__ == "__main__":
    main()
