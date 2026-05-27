#!/usr/bin/env python3
"""
PreToolUse hook — Sacred ports & wrong-startup-mode guard.

Rules (memory: feedback_sacred_ports, feedback_no_individual_starts):
    1. Port 3000 inside Docker belongs to social-research-frontend. Running
       `npm run dev` for HiC on :3000 collides with that service.
    2. The HiC SPA should be tested via Docker rebuild, not `npm run dev`
       (memory: feedback_hic_research_rebuild).
    3. Always use docker-compose-all.yml — never docker-compose.yml alone.
    4. Never start individual services with uvicorn / flask run / python app.py
       when docker compose handles the same service.

Block:
    - `npm run dev` inside humans-in-control-research/
    - `docker compose -f docker-compose.yml ...` (wrong compose file)
    - `docker-compose -f docker-compose.yml ...` (legacy form)
    - `uvicorn` / `flask run` / `python app.py` for services that exist in
      docker-compose-all.yml when an alternative exists.

Warn (allow with message):
    - Bare `docker compose ...` without -f flag (ambiguous which file)

Exit codes:
    0 — allow
    2 — block + feedback
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, bash_command, block, allow

# `npm run dev` is fine in OTHER service dirs (social-research, character-gen)
# but NOT in humans-in-control-research/ — the user has explicitly said to
# always rebuild Docker for HiC changes.
HIC_NPM_DEV = re.compile(
    r"(cd\s+.*humans-in-control-research|humans-in-control-research[\\/])"
    r".*npm\s+run\s+dev",
    re.S,
)

# Standalone npm run dev when the user appears to be in HiC context already
# (no cd, no path) — harder to detect; we let it pass to avoid false positives.

WRONG_COMPOSE_FILE = re.compile(
    r"docker(?:-|\s+)compose\s+(?:-f\s+)?docker-compose\.yml\b"
)

# Individual service starts that should go through docker compose
INDIVIDUAL_SERVICE_START = re.compile(
    r"\b(uvicorn|flask\s+run|python\s+app\.py|python3\s+app\.py)\b"
)


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Bash"}:
        allow()

    cmd = bash_command(event)
    if not cmd:
        allow()

    if HIC_NPM_DEV.search(cmd):
        block(
            "Blocked: `npm run dev` for HiC is discouraged.\n"
            "\nReason: the HiC Docker container is nginx serving a static dist and is what the\n"
            "team tests against. Running the Vite dev server locally diverges from prod behaviour\n"
            "and collides with port 3000 (social-research-frontend) when Docker is up.\n"
            "\nUse instead:\n"
            "  docker compose -f docker-compose-all.yml up -d --build research-generator\n"
            "Then test at http://localhost:5011.\n"
            "\nIf you genuinely need local Vite dev (e.g., active debugging) and Docker is down,\n"
            "the user can run this manually outside the agent session."
        )

    if WRONG_COMPOSE_FILE.search(cmd):
        block(
            "Blocked: wrong compose file.\n"
            f"\nCommand: {cmd}\n"
            "\nThe platform uses docker-compose-all.yml — `docker-compose.yml` alone is incomplete.\n"
            "Replace with:\n"
            "  docker compose -f docker-compose-all.yml ...\n"
        )

    if INDIVIDUAL_SERVICE_START.search(cmd):
        # Only block if the cwd hint suggests it's a known platform service dir
        # — otherwise it's likely a one-off script the user actually wants.
        platform_service_hints = (
            "internal-solutions-", "mcp-services/", "launchpad/", "humans-in-control-research/proxy",
        )
        if any(h in cmd for h in platform_service_hints):
            block(
                "Blocked: starting an individual platform service directly.\n"
                f"\nCommand: {cmd}\n"
                "\nRule (memory: feedback_no_individual_starts): start services via\n"
                "  docker compose -f docker-compose-all.yml up -d [service-name]\n"
                "so they share the network, volume mounts, and env vars defined in compose.\n"
            )

    allow()


if __name__ == "__main__":
    main()
