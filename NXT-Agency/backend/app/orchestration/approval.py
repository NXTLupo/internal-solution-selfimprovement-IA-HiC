"""
Approval gate framework.

Implements the approval-required actions from spec section 11.1 and
the approval packet format from spec section 11.2.
"""

from __future__ import annotations

import logging
from typing import Any

from .contracts import (
    ApprovalPacket, ApprovalStatus, TaskNode, ToolPermission, EvidenceRef
)
from .state import StateManager

logger = logging.getLogger("orchestration.approval")

# Actions that ALWAYS require approval (spec section 11.1)
ALWAYS_REQUIRE_APPROVAL = {
    "send_external_email",
    "publish_content",
    "change_ad_spend",
    "merge_to_production",
    "edit_production_infra",
    "modify_contracts",
    "modify_pricing",
    "push_crm_notes",
    "delete_data",
    "disable_systems",
}


class ApprovalGate:
    """
    Manages approval gates for the Multi-Agent OS.

    Default posture: least privilege. Live writes are always gated.
    """

    def __init__(self, state: StateManager):
        self._state = state

    def requires_approval(self, task: TaskNode, proposed_action: str = "") -> bool:
        """Check if a task or action requires human approval."""
        # Live writes always require approval
        if task.tool_permission == ToolPermission.LIVE_WRITE:
            return True

        # Explicit approval flag on task
        if task.approval_required:
            return True

        # Check against always-require list
        if proposed_action in ALWAYS_REQUIRE_APPROVAL:
            return True

        # High-risk flags
        if any(f in task.risk_flags for f in ["payment_path", "security", "legal", "compliance"]):
            return True

        return False

    def create_approval_request(
        self,
        task: TaskNode,
        proposed_action: str,
        reason: str,
        expected_impact: str = "",
        risks: list[str] = None,
        rollback_plan: str = "",
        evidence: list[EvidenceRef] = None,
    ) -> ApprovalPacket:
        """Create and store an approval request."""
        packet = ApprovalPacket(
            proposed_action=proposed_action,
            reason=reason,
            expected_impact=expected_impact,
            risks=risks or list(task.risk_flags),
            rollback_plan=rollback_plan,
            source_evidence=evidence or [],
            affected_systems=[],
        )
        self._state.submit_approval(packet)
        logger.info(
            "Approval gate triggered for task %s: %s (approval_id=%s)",
            task.task_id, proposed_action, packet.approval_id
        )
        return packet

    def approve(self, approval_id: str, approver: str) -> ApprovalPacket | None:
        return self._state.resolve_approval(approval_id, "approved", approver)

    def reject(self, approval_id: str, approver: str) -> ApprovalPacket | None:
        return self._state.resolve_approval(approval_id, "rejected", approver)

    def list_pending(self) -> list[ApprovalPacket]:
        return self._state.list_pending_approvals()
