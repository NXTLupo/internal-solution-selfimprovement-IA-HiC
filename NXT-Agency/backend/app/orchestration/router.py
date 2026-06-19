"""
Task-shape model router.

Routes tasks to models based on modality, context size, tool requirements,
latency target, budget, execution risk, and need for deterministic schema output.
This is separate from the existing ModelRouter which maps keys to providers --
this router SELECTS which key to use based on task characteristics.
"""

from __future__ import annotations

import logging
from typing import Any

from .contracts import TaskType, TaskNode, ModelRoute, ToolPermission

logger = logging.getLogger("orchestration.router")


# Primary routing table (spec section 5.1)
_ROUTING_TABLE: dict[str, dict[str, str]] = {
    # task_type -> {"primary": model_key, "secondary": model_key}
    "research_synthesis": {"primary": "gemini-pro", "secondary": "claude-opus", "reason": "Best for broad multimodal evidence intake"},
    "strategy_synthesis": {"primary": "claude-opus", "secondary": "gpt-5", "reason": "Best for dense reasoning and strategic synthesis"},
    "ux_design": {"primary": "gpt-5", "secondary": "claude-opus", "reason": "Strongest when tool execution and computer use matter"},
    "engineering_diagnosis": {"primary": "claude-opus", "secondary": "gpt-5", "reason": "Best for repo-scale debugging and refactor planning"},
    "engineering_patch": {"primary": "claude-opus", "secondary": "gpt-5", "reason": "Best for large-codebase reliability"},
    "growth_experiment": {"primary": "gpt-5", "secondary": "gemini-pro", "reason": "Best for tool-heavy execution and campaign ops"},
    "revenue_intelligence": {"primary": "gemini-pro", "secondary": "claude-opus", "reason": "Best for broad ingestion, Claude for final strategy"},
    "verification": {"primary": "claude-opus", "secondary": "gpt-5", "reason": "Verification requires strongest reasoning"},
    "custom": {"primary": "claude-sonnet", "secondary": "claude-opus", "reason": "Default route for unclassified tasks"},
}


class TaskRouter:
    """
    Routes tasks to optimal models based on task shape.

    Follows the routing policy from spec section 5.2:
    - modality
    - context size
    - tool requirement
    - latency target
    - budget target
    - execution risk
    - need for deterministic schema output
    - need for multimodal evidence handling
    """

    def route(self, task: TaskNode) -> ModelRoute:
        """Select the best model route for a task."""
        entry = _ROUTING_TABLE.get(task.type.value, _ROUTING_TABLE["custom"])

        route = ModelRoute(
            primary_model=entry["primary"],
            secondary_model=entry.get("secondary"),
            reasoning=entry.get("reason", ""),
        )

        # Upgrade to premium model if high risk flags present
        if task.risk_flags and any(f in task.risk_flags for f in [
            "payment_path", "release_critical", "security", "compliance", "legal"
        ]):
            route.primary_model = "claude-opus"
            route.reasoning += " [upgraded: high-risk flags detected]"

        # Downgrade if tool permission is live_write (need most careful model)
        if task.tool_permission == ToolPermission.LIVE_WRITE:
            route.primary_model = "claude-opus"
            route.reasoning += " [upgraded: live-write permission requires premium reasoning]"

        logger.info(
            "Routed task %s (%s) -> %s (reason: %s)",
            task.task_id, task.type.value, route.primary_model, route.reasoning
        )
        return route

    def classify_task_type(self, description: str, inputs: list[str]) -> TaskType:
        """Classify a task description into a TaskType for routing.

        This is a heuristic classifier. In production, this could be an LLM call.
        """
        desc_lower = description.lower()

        if any(kw in desc_lower for kw in ["research", "analyze", "mine", "survey", "interview", "review"]):
            return TaskType.RESEARCH_SYNTHESIS
        elif any(kw in desc_lower for kw in ["strategy", "plan", "roadmap", "kpi", "initiative"]):
            return TaskType.STRATEGY_SYNTHESIS
        elif any(kw in desc_lower for kw in ["design", "ux", "ui", "wireframe", "prototype", "flow", "screen"]):
            return TaskType.UX_DESIGN
        elif any(kw in desc_lower for kw in ["diagnose", "debug", "root cause", "incident", "error", "log"]):
            return TaskType.ENGINEERING_DIAGNOSIS
        elif any(kw in desc_lower for kw in ["patch", "fix", "refactor", "implement", "build", "code"]):
            return TaskType.ENGINEERING_PATCH
        elif any(kw in desc_lower for kw in ["growth", "campaign", "experiment", "seo", "content", "audience"]):
            return TaskType.GROWTH_EXPERIMENT
        elif any(kw in desc_lower for kw in ["sales", "revenue", "rfp", "deal", "qualification", "pursuit"]):
            return TaskType.REVENUE_INTELLIGENCE
        elif any(kw in desc_lower for kw in ["verify", "check", "audit", "review", "validate"]):
            return TaskType.VERIFICATION

        return TaskType.CUSTOM
