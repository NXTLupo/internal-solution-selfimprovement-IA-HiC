"""
Core abstractions for the tool subsystem.

Every concrete tool inherits from ``BaseTool`` and registers itself with the
``ToolRegistry`` singleton.  ``AgentContext`` carries per-invocation state
(session ID, agent slug, sandboxed working directory).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("tools")


@dataclass
class AgentContext:
    """Per-invocation context passed to every tool execution."""

    session_id: str
    agent_slug: str
    working_dir: str = "/tmp/agent-workspaces"


class BaseTool(ABC):
    """
    Abstract base class for all tools.

    Subclasses must set ``name``, ``description``, ``parameters`` (JSON Schema
    dict), and implement ``execute``.  ``tier`` controls which agents may
    access the tool (higher tier = more powerful / riskier).
    """

    name: str = ""
    description: str = ""
    parameters: dict = field(default_factory=dict)  # type: ignore[assignment]
    tier: int = 1

    @abstractmethod
    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        """Run the tool with validated *params* and return a result dict."""
        ...

    def to_schema(self) -> dict:
        """Return the unified tool schema consumed by the LLM provider layer."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


class ToolRegistry:
    """
    Central registry that maps tool names to ``BaseTool`` instances and
    exposes them to the agent engine by tier.

    Also holds *Anthropic-defined* tool definitions (computer use, bash,
    text editor) that bypass normal schema conversion and are sent
    directly to the Anthropic Messages API.
    """

    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {}
        self._anthropic_tools: list[dict] = []

    # ---- Anthropic-defined (schema-less) tools -----------------------------

    def register_anthropic_tool(self, tool_def: dict) -> None:
        """Register an Anthropic-defined tool (computer, bash, text_editor).

        These are passed directly to the Claude API without conversion.
        """
        label = tool_def.get("name", tool_def.get("type", "unknown"))
        logger.info("Registered Anthropic-defined tool: %s", label)
        self._anthropic_tools.append(tool_def)

    def get_anthropic_tools(self) -> list[dict]:
        """Return raw Anthropic-defined tool definitions for passthrough."""
        return list(self._anthropic_tools)

    # ---- Standard tools ---------------------------------------------------

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance.  Duplicate names overwrite silently."""
        if not tool.name:
            raise ValueError("Tool must have a non-empty name")
        logger.info(
            "Registered tool %r (tier %d)", tool.name, tool.tier
        )
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        """Look up a single tool by name."""
        return self._tools.get(name)

    def get_tools(self, max_tier: int = 1) -> list[dict]:
        """Return JSON-Schema definitions for all tools up to *max_tier*."""
        return [
            tool.to_schema()
            for tool in self._tools.values()
            if tool.tier <= max_tier
        ]

    def get_tool_names(self, max_tier: int = 1) -> list[str]:
        """Return tool names available at the given tier."""
        return [
            tool.name
            for tool in self._tools.values()
            if tool.tier <= max_tier
        ]

    async def execute(
        self, name: str, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        """
        Execute a registered tool by name.

        Raises ``KeyError`` if the tool does not exist and propagates any
        exception from the tool's ``execute`` method.
        """
        tool = self._tools.get(name)
        if tool is None:
            available = ", ".join(sorted(self._tools))
            raise KeyError(
                f"Unknown tool {name!r}. Registered tools: {available}"
            )
        logger.info(
            "Executing tool %r for agent %s (session %s)",
            name,
            ctx.agent_slug,
            ctx.session_id,
        )
        return await tool.execute(params, ctx)
