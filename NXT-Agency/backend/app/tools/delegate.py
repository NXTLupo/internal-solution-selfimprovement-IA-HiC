"""
Agent delegation tool.

Allows an agent to delegate a sub-task to another agent by slug.
This tool will be wired up to the AgentEngine once the full engine
dependency graph is resolved at application startup.  Until then,
calling ``execute`` raises ``NotImplementedError``.

Tier 4: only available to orchestrator-level agents.
"""

from __future__ import annotations

import logging
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.delegate")


class DelegateToAgentTool(BaseTool):
    """Delegate a task to another agent by its slug."""

    name = "delegate_to_agent"
    description = (
        "Delegate a task to another specialised agent. Provide the target "
        "agent's slug and a clear message describing what you need. "
        "The target agent will process the request and return its response."
    )
    parameters = {
        "type": "object",
        "properties": {
            "agent_slug": {
                "type": "string",
                "description": "The slug (identifier) of the agent to delegate to.",
            },
            "message": {
                "type": "string",
                "description": "The task or question to send to the target agent.",
            },
        },
        "required": ["agent_slug", "message"],
    }
    tier = 4

    def __init__(self) -> None:
        self._engine_run_fn = None

    def wire_engine(self, engine_run_fn) -> None:
        """
        Wire the engine's ``run`` coroutine so delegation actually works.

        Called at application startup once the ``AgentEngine`` is constructed:

            delegate_tool.wire_engine(engine.run)
        """
        self._engine_run_fn = engine_run_fn
        logger.info("DelegateToAgentTool wired to engine.run")

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        agent_slug = params.get("agent_slug", "").strip()
        message = params.get("message", "").strip()

        if not agent_slug:
            return {"error": "agent_slug parameter is required"}
        if not message:
            return {"error": "message parameter is required"}

        if self._engine_run_fn is None:
            raise NotImplementedError(
                "DelegateToAgentTool has not been wired to an AgentEngine. "
                "Call delegate_tool.wire_engine(engine.run) at startup."
            )

        logger.info(
            "Delegating to agent %r from %r (session %s)",
            agent_slug,
            ctx.agent_slug,
            ctx.session_id,
        )

        try:
            result = await self._engine_run_fn(
                agent_slug=agent_slug,
                session_id=ctx.session_id,
                user_message=message,
            )
            return {
                "agent_slug": agent_slug,
                "response": result.get("response", ""),
            }
        except Exception as exc:
            logger.exception(
                "Delegation to %r failed (session %s)", agent_slug, ctx.session_id
            )
            return {
                "agent_slug": agent_slug,
                "error": f"Delegation failed: {exc}",
            }
