"""
Agent Registry -- loads, indexes, and serves agent definitions.

Agent definitions live as Markdown files with YAML frontmatter.  An optional
per-agent YAML config file can override runtime parameters such as model,
tier, or temperature.  Agents without a dedicated config inherit values
from ``_defaults.yaml``.

Directory layout example::

    prompts/
        academic/
            anthropologist.md
            geographer.md
        engineering/
            backend-architect.md
    configs/
        _defaults.yaml
        backend-architect.yaml   # optional overrides
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("agents.registry")

# Keys that can be overridden via per-agent config YAML
_CONFIGURABLE_FIELDS = {
    "model", "tier", "temperature", "max_tokens", "max_turns",
}


def _slugify(filename: str) -> str:
    """
    Derive a URL-safe slug from a markdown filename.

    ``backend-architect.md`` -> ``backend-architect``
    ``academic-anthropologist.md`` -> ``academic-anthropologist``
    """
    return Path(filename).stem.lower()


def _parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """
    Split a markdown file into YAML frontmatter dict and body string.

    Returns (metadata_dict, body_text).  If no frontmatter is found,
    returns an empty dict and the full text.
    """
    pattern = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)", re.DOTALL)
    match = pattern.match(text)
    if not match:
        return {}, text

    try:
        metadata = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:
        logger.warning("Failed to parse YAML frontmatter: %s", exc)
        metadata = {}

    body = match.group(2)
    return metadata, body


@dataclass
class AgentDefinition:
    """Fully-resolved definition of a single agent."""

    slug: str
    name: str
    description: str
    system_prompt: str
    category: str
    emoji: str = ""
    color: str = "#6366f1"
    vibe: str = ""
    model: str = "claude-sonnet"
    tier: int = 1
    temperature: float = 0.7
    max_tokens: int = 4096
    max_turns: int = 10

    def _generate_prompts(self) -> list[str]:
        """Generate contextual suggested prompts based on agent category and capabilities."""
        # Category-specific prompt templates
        category_prompts: dict[str, list[str]] = {
            "engineering": [
                f"Review this code and suggest improvements for performance and maintainability",
                f"Help me architect a scalable solution for a new feature",
                f"Debug this issue and explain the root cause",
            ],
            "design": [
                f"Fetch our Figma design system and build a prototype of the header",
                f"Inspect this Figma component and generate a matching HTML prototype",
                f"Design a new screen using our NXT Humans design tokens",
            ],
            "marketing": [
                f"Analyze our content strategy and identify growth opportunities",
                f"Create a multi-channel campaign brief for a product launch",
                f"Research trending topics in our industry and suggest content ideas",
            ],
            "academic": [
                f"Analyze this subject through your expert lens and provide deep insights",
                f"Help me understand the key frameworks and theories in your field",
                f"Evaluate this concept for coherence and suggest improvements",
            ],
            "product": [
                f"Help prioritize our feature backlog using a data-driven framework",
                f"Create user personas based on our target market research",
                f"Draft a product requirements document for this feature idea",
            ],
            "testing": [
                f"Review this system for potential quality issues and test gaps",
                f"Create a comprehensive test plan for our latest feature",
                f"Analyze these test results and identify patterns",
            ],
            "sales": [
                f"Help me craft a compelling outreach sequence for enterprise prospects",
                f"Analyze this deal and build a win strategy",
                f"Review my discovery call approach and suggest improvements",
            ],
            "project-management": [
                f"Help me break down this project into actionable milestones",
                f"Create a risk assessment for our current sprint",
                f"Review our team's workflow and suggest process improvements",
            ],
            "specialized": [
                f"Walk me through your specialized process step by step",
                f"Analyze this situation using your domain expertise",
                f"Create a detailed deliverable based on these requirements",
            ],
            "support": [
                f"Help me analyze our support metrics and identify trends",
                f"Create a report summarizing key insights from recent data",
                f"Draft an executive summary of our current performance",
            ],
            "game-dev": [
                f"Help me design the core gameplay loop for my game concept",
                f"Review this game system for balance and player engagement",
                f"Create a technical design document for this game feature",
            ],
        }
        return category_prompts.get(self.category, [
            f"Help me with a task that leverages your expertise as {self.name}",
            f"Analyze this situation and provide your expert recommendations",
            f"Walk me through your approach to solving this problem",
        ])

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a plain dict suitable for JSON responses."""
        # Map tier to human-readable tool capability descriptions
        tier_tools: dict[int, list[str]] = {
            1: [],
            2: ["Web Search", "Text Analysis", "Image Generation", "Figma"],
            3: ["Web Search", "Text Analysis", "Image Generation", "Figma", "File Ops", "Code Exec", "Prototyping"],
            4: ["Web Search", "Text Analysis", "Image Generation", "Figma", "File Ops", "Code Exec", "Prototyping", "Delegation", "Computer Use", "Bash", "Text Editor"],
        }
        return {
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "emoji": self.emoji,
            "color": self.color,
            "vibe": self.vibe,
            "model": self.model,
            "tier": self.tier,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "max_turns": self.max_turns,
            "tools": tier_tools.get(self.tier, []),
            "supports_vision": True,  # All current models (Claude, GPT, Gemini) support vision
            "prompts": self._generate_prompts(),
        }


class AgentRegistry:
    """
    Central registry of all agent definitions.

    Scans ``prompts_dir`` recursively for ``*.md`` files, parses their YAML
    frontmatter + body, and optionally merges runtime config from
    ``configs_dir``.
    """

    def __init__(
        self,
        prompts_dir: str,
        configs_dir: str | None = None,
    ) -> None:
        self._agents: dict[str, AgentDefinition] = {}
        self._prompts_dir = Path(prompts_dir)
        self._configs_dir = Path(configs_dir) if configs_dir else None
        self._defaults: dict[str, Any] = {}
        self.load()

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load_defaults(self) -> dict[str, Any]:
        """Load ``_defaults.yaml`` from configs_dir, if it exists."""
        if not self._configs_dir:
            return {}
        defaults_path = self._configs_dir / "_defaults.yaml"
        if not defaults_path.is_file():
            return {}
        try:
            with open(defaults_path, encoding="utf-8") as fh:
                data = yaml.safe_load(fh) or {}
            logger.info("Loaded defaults from %s", defaults_path)
            return data
        except Exception as exc:
            logger.warning("Failed to load _defaults.yaml: %s", exc)
            return {}

    def _load_agent_config(self, slug: str) -> dict[str, Any]:
        """Load optional per-agent config overrides."""
        if not self._configs_dir:
            return {}
        config_path = self._configs_dir / f"{slug}.yaml"
        if not config_path.is_file():
            return {}
        try:
            with open(config_path, encoding="utf-8") as fh:
                data = yaml.safe_load(fh) or {}
            logger.debug("Loaded config override for %r from %s", slug, config_path)
            return {k: v for k, v in data.items() if k in _CONFIGURABLE_FIELDS}
        except Exception as exc:
            logger.warning(
                "Failed to load config for %r: %s", slug, exc
            )
            return {}

    def load(self) -> None:
        """Scan prompts directory and build the internal agent index."""
        self._agents.clear()
        self._defaults = self._load_defaults()

        if not self._prompts_dir.is_dir():
            logger.warning(
                "Prompts directory does not exist: %s -- registry will be empty",
                self._prompts_dir,
            )
            return

        md_files = sorted(self._prompts_dir.rglob("*.md"))
        logger.info(
            "Scanning %s: found %d .md files", self._prompts_dir, len(md_files)
        )

        for md_path in md_files:
            try:
                self._load_agent_file(md_path)
            except Exception as exc:
                logger.warning(
                    "Skipping %s: %s", md_path, exc, exc_info=True
                )

        logger.info(
            "Agent registry loaded: %d agents in %d categories",
            len(self._agents),
            len(self.categories()),
        )

    def _load_agent_file(self, md_path: Path) -> None:
        """Parse a single agent markdown file and register it."""
        text = md_path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(text)

        if not meta.get("name"):
            logger.debug("Skipping %s: no 'name' in frontmatter", md_path)
            return

        # Derive slug from filename (e.g. "backend-architect.md" -> "backend-architect")
        slug = _slugify(md_path.name)

        # Derive category from parent directory name, fallback to "general"
        category_dir = md_path.parent
        if category_dir == self._prompts_dir:
            category = "general"
        else:
            category = category_dir.name

        # Merge: hardcoded defaults < _defaults.yaml < frontmatter < per-agent config
        config = {**self._defaults, **self._load_agent_config(slug)}

        agent = AgentDefinition(
            slug=slug,
            name=meta.get("name", slug),
            description=meta.get("description", ""),
            system_prompt=body.strip(),
            category=category,
            emoji=meta.get("emoji", ""),
            color=meta.get("color", config.get("color", "#6366f1")),
            vibe=meta.get("vibe", ""),
            model=config.get("model", meta.get("model", "claude-sonnet")),
            tier=int(config.get("tier", meta.get("tier", 1))),
            temperature=float(
                config.get("temperature", meta.get("temperature", 0.7))
            ),
            max_tokens=int(
                config.get("max_tokens", meta.get("max_tokens", 4096))
            ),
            max_turns=int(
                config.get("max_turns", meta.get("max_turns", 10))
            ),
        )

        self._agents[slug] = agent
        logger.debug("Loaded agent %r (%s/%s)", slug, category, agent.name)

    # ------------------------------------------------------------------
    # Query interface
    # ------------------------------------------------------------------

    def get(self, slug: str) -> AgentDefinition | None:
        """Return an agent by slug, or ``None`` if not found."""
        return self._agents.get(slug)

    def list_all(self) -> list[AgentDefinition]:
        """Return all registered agents sorted by name."""
        return sorted(self._agents.values(), key=lambda a: a.name)

    def list_by_category(self, category: str) -> list[AgentDefinition]:
        """Return agents belonging to a specific category."""
        return sorted(
            [a for a in self._agents.values() if a.category == category],
            key=lambda a: a.name,
        )

    def categories(self) -> list[dict[str, Any]]:
        """
        Return a list of categories with counts.

        Each entry: ``{"id": "engineering", "label": "Engineering", "count": 12}``
        """
        cat_counts: dict[str, int] = {}
        for agent in self._agents.values():
            cat_counts[agent.category] = cat_counts.get(agent.category, 0) + 1

        return sorted(
            [
                {
                    "id": cat_id,
                    "label": cat_id.replace("-", " ").title(),
                    "count": count,
                }
                for cat_id, count in cat_counts.items()
            ],
            key=lambda c: c["label"],
        )

    def reload(self) -> None:
        """Discard the current index and reload from disk."""
        logger.info("Reloading agent registry...")
        self.load()
