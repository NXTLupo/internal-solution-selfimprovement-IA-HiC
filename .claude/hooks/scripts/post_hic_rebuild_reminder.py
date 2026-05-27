#!/usr/bin/env python3
"""
PostToolUse hook — HiC Docker rebuild reminder.

The `research-generator` container is nginx serving a static Vite dist with
NO HMR (humans-in-control-research/CLAUDE.md and memory: feedback_hic_research_rebuild).
Any change to .tsx/.ts/.css/.html in humans-in-control-research/ is invisible
in the browser at :5011 until a rebuild.

This hook is informational — it emits a reminder to the agent so it doesn't
forget the rebuild step. It does NOT block.

Scope: only fires on HiC code paths (same filter as precheck_slop.py).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, allow

REBUILD_TRIGGER_EXTS = (".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json")
PROXY_TRIGGER = re.compile(r"humans-in-control-research/proxy/")


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write", "NotebookEdit"}:
        allow()

    path = file_path(event)
    p = normalize_path(path)

    if "humans-in-control-research/" not in p:
        allow()

    # Skip docs, wiki, plans — they don't go through the SPA bundle
    skip = (
        "/hic-workspace/",
        "/plans/",
        "/design-desk/",
        "/migrated_prompt_history/",
        "handoff_",
        "claude.md",
        "readme.md",
        "changelog.md",
        ".md",  # all markdown
    )
    if any(s in p for s in skip):
        allow()

    if PROXY_TRIGGER.search(p):
        allow(
            "[HiC reminder] proxy/app.py edited — restart the proxy container:\n"
            "  docker compose -f docker-compose-all.yml up -d --build research-proxy"
        )

    if not p.endswith(REBUILD_TRIGGER_EXTS):
        allow()

    allow(
        f"[HiC reminder] {Path(path).name} edited — HiC has NO HMR in Docker.\n"
        "Run before testing in the browser:\n"
        "  docker compose -f docker-compose-all.yml up -d --build research-generator\n"
        "Then hard-refresh the browser at http://localhost:5011 (Ctrl+Shift+R)."
    )


if __name__ == "__main__":
    main()
