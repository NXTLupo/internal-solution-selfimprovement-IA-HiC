#!/usr/bin/env python3
"""
PostToolUse hook — Agent / MCP restart reminder.

Per repo-root CLAUDE.md: the agent caches MCP tool definitions on startup
via `fetch_and_cache_tools()`. Any edit to mcp-services/*/app.py or to the
`tool_services` dict in agent/app.py is invisible until the agent restarts.

This hook is informational — it emits a clear reminder. It does NOT block.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, proposed_text, allow

AGENT_APP = re.compile(r"mcp-services/agent/app\.py$")
MCP_WRAPPER = re.compile(r"mcp-services/(?!agent/)[^/]+/app\.py$")
COMPOSE_FILE = re.compile(r"docker-compose-all\.yml$")


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write", "NotebookEdit"}:
        allow()

    p = normalize_path(file_path(event))

    if AGENT_APP.search(p):
        text = proposed_text(event)
        touched_tool_services = "tool_services" in text
        msg = (
            "[agent reminder] mcp-services/agent/app.py edited — restart the agent so it re-fetches MCP tools:\n"
            "  docker compose -f docker-compose-all.yml restart agent\n"
        )
        if touched_tool_services:
            msg += (
                "\nNOTE: the edit appears to touch the `tool_services` dict. Before restart:\n"
                "  1. Confirm the new service exists in docker-compose-all.yml on network nxt-humans-network.\n"
                "  2. Confirm its /mcp endpoint implements JSON-RPC 2.0 tools/list and tools/call.\n"
                "  3. After restart, check `docker compose logs agent` for tool-discovery success — silent\n"
                "     failures are expected for missing services (see Dormant MCP Services in CLAUDE.md).\n"
            )
        allow(msg)

    if MCP_WRAPPER.search(p):
        wrapper = Path(p).parent.name
        allow(
            f"[agent reminder] MCP wrapper {wrapper} edited — restart the wrapper AND the agent so the\n"
            f"agent re-fetches tool definitions:\n"
            f"  docker compose -f docker-compose-all.yml restart {wrapper} agent\n"
        )

    if COMPOSE_FILE.search(p):
        allow(
            "[platform reminder] docker-compose-all.yml edited — affected services need recreate, not restart:\n"
            "  docker compose -f docker-compose-all.yml up -d [service-name]\n"
            "Or for a full re-create: docker compose -f docker-compose-all.yml up -d --force-recreate\n"
        )

    allow()


if __name__ == "__main__":
    main()
