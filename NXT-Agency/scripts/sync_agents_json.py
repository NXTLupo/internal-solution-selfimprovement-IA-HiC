#!/usr/bin/env python3
"""
Sync agents.json from the backend registry.

Reads agent .md files from agent-prompts/, parses frontmatter + configs,
and writes the launchpad's agents.json with proper prompts and capabilities.

Usage:
    python scripts/sync_agents_json.py
"""

import json
import sys
from pathlib import Path

# Add backend to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.registry import AgentRegistry

PROMPTS_DIR = ROOT / "agent-prompts"
CONFIGS_DIR = ROOT / "backend" / "app" / "agents" / "configs"
OUTPUT = ROOT / "agency-agents-launchpad" / "src" / "data" / "agents.json"


def main():
    registry = AgentRegistry(
        prompts_dir=str(PROMPTS_DIR),
        configs_dir=str(CONFIGS_DIR),
    )

    agents = []
    for agent in registry.list_all():
        d = agent.to_dict()
        # Add fields the launchpad expects
        d["filename"] = f"{agent.category}-{agent.slug.split('-', 1)[-1] if '-' in agent.slug else agent.slug}.md"
        # Use the slug-based filename
        d["filename"] = f"{agent.slug}.md"
        d["mission"] = ""
        agents.append(d)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(agents, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(agents)} agents to {OUTPUT}")


if __name__ == "__main__":
    main()
