"""
Agency Control Tower -- the only agent permitted to orchestrate other agents.

Implements spec section 6.1: intake, normalization, task decomposition,
routing, permissioning, approval gates, worker dispatch, verification,
and final assembly.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .contracts import (
    EngagementPlan, TaskNode, TaskType, TaskStatus, WorkerHandoff,
    ModelRoute, RunLog, DecisionRecord, Phase, ToolPermission,
    BudgetCap, ApprovalGateSpec, EvidenceRef
)
from .router import TaskRouter
from .state import StateManager
from .workers import WorkerRegistry, WorkerContract
from .verifier import Verifier
from .approval import ApprovalGate

logger = logging.getLogger("orchestration.control_tower")


class ControlTower:
    """
    The Control Tower is the spine of the Multi-Agent OS.

    It accepts client intake, decomposes work into a task graph,
    routes each task to the best-fit model and worker, manages
    approval gates, triggers verification, and assembles deliverables.

    Forbidden actions:
    - Direct production changes
    - Direct external contact
    - Direct publication
    - Direct spend changes
    """

    def __init__(
        self,
        state: StateManager,
        router: TaskRouter,
        workers: WorkerRegistry,
        verifier: Verifier,
        approval_gate: ApprovalGate,
    ):
        self.state = state
        self.router = router
        self.workers = workers
        self.verifier = verifier
        self.approval = approval_gate

    def create_engagement(
        self,
        objective: str,
        client_id: str = "",
        constraints: list[str] = None,
        budget_usd: float = 0,
        inputs: list[str] = None,
    ) -> EngagementPlan:
        """
        Phase 1: Create an engagement plan from a client objective.

        This decomposes the objective into tasks, routes them,
        assigns permissions, and sets up approval gates.
        """
        plan = EngagementPlan(
            client_id=client_id,
            objective=objective,
            constraints=constraints or [],
            budget_cap=BudgetCap(usd=budget_usd),
        )

        # Default approval gate for any external actions
        plan.approval_gates.append(ApprovalGateSpec(
            trigger="external_publish_or_send",
            approver_role="Engagement Lead",
        ))

        logger.info(
            "Created engagement %s: %s",
            plan.engagement_id, objective[:100]
        )

        self.state.save_engagement(plan)
        return plan

    def decompose_tasks(
        self,
        plan: EngagementPlan,
        task_descriptions: list[dict[str, Any]],
    ) -> EngagementPlan:
        """
        Phase 2: Decompose the objective into routed, permissioned tasks.

        Each task_description dict should have:
            description: str
            inputs: list[str] (optional)
            approval_required: bool (optional)
            risk_flags: list[str] (optional)
        """
        for desc in task_descriptions:
            task_type = self.router.classify_task_type(
                desc.get("description", ""),
                desc.get("inputs", []),
            )

            worker = self.workers.get_for_task_type(task_type)

            task = TaskNode(
                type=task_type,
                description=desc.get("description", ""),
                owner_agent=worker.name if worker else "Unassigned",
                inputs=desc.get("inputs", []),
                outputs_required=worker.required_output_sections if worker else [],
                acceptance_criteria=worker.acceptance_criteria if worker else [],
                approval_required=desc.get("approval_required", False),
                tool_permission=ToolPermission(desc.get("tool_permission", "read_only")),
                risk_flags=desc.get("risk_flags", []),
                status=TaskStatus.PENDING,
                phase=Phase.PLAN,
            )

            # Route the task
            route = self.router.route(task)
            task.route = route

            plan.tasks.append(task)

            logger.info(
                "Task %s: type=%s owner=%s model=%s",
                task.task_id, task.type.value, task.owner_agent, route.primary_model
            )

        plan.updated_at = datetime.now(timezone.utc)
        self.state.save_engagement(plan)
        return plan

    def build_handoff(self, task: TaskNode, plan: EngagementPlan) -> WorkerHandoff:
        """Build a typed handoff object for a task."""
        worker = self.workers.get_for_task_type(task.type)

        return WorkerHandoff(
            to_agent=task.owner_agent,
            objective=task.description,
            business_context={
                "engagement_id": plan.engagement_id,
                "client_id": plan.client_id,
                "objective": plan.objective,
                "constraints": plan.constraints,
            },
            inputs=[{"type": "artifact_ref", "ref": ref} for ref in task.inputs],
            required_outputs=task.outputs_required,
            acceptance_criteria=task.acceptance_criteria,
            risk_flags=task.risk_flags,
            approval_required=task.approval_required,
            tool_permission=task.tool_permission,
        )

    def verify_task_output(
        self,
        task: TaskNode,
        output: dict[str, Any],
        evidence: list[EvidenceRef] = None,
    ) -> TaskNode:
        """Run verification on a completed task output."""
        result = self.verifier.verify(
            task=task,
            output=output,
            worker_contract_outputs=task.outputs_required,
            evidence=evidence,
        )
        task.verification = result

        if result.status == "pass":
            if self.approval.requires_approval(task):
                task.status = TaskStatus.AWAITING_APPROVAL
            else:
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.now(timezone.utc)
        else:
            task.status = TaskStatus.BLOCKED

        return task

    def get_engagement_status(self, plan: EngagementPlan) -> dict[str, Any]:
        """Get a summary of engagement progress."""
        total = len(plan.tasks)
        by_status = {}
        for task in plan.tasks:
            by_status[task.status.value] = by_status.get(task.status.value, 0) + 1

        return {
            "engagement_id": plan.engagement_id,
            "objective": plan.objective,
            "total_tasks": total,
            "task_status": by_status,
            "pending_approvals": len(self.approval.list_pending()),
            "all_complete": all(t.status == TaskStatus.COMPLETED for t in plan.tasks),
        }
