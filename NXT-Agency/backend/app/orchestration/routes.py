"""
FastAPI routes for the Multi-Agent Operating System.

Exposes the orchestration layer as REST endpoints for:
- Engagement management (create, decompose, status)
- Approval inbox (list, approve, reject)
- Evidence and decision queries
- Run log inspection

These routes layer on top of the existing /api/agents/ routes.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .contracts import TaskStatus, ToolPermission
from .control_tower import ControlTower
from .router import TaskRouter
from .state import StateManager
from .workers import WorkerRegistry
from .verifier import Verifier
from .approval import ApprovalGate

logger = logging.getLogger("orchestration.routes")

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])

# --- Singletons (wired at startup from main.py) ---
_state: StateManager | None = None
_control_tower: ControlTower | None = None
_approval: ApprovalGate | None = None


def init_orchestration():
    """Initialize orchestration singletons. Called from main.py at startup."""
    global _state, _control_tower, _approval

    _state = StateManager()
    task_router = TaskRouter()
    workers = WorkerRegistry()
    verifier = Verifier()
    _approval = ApprovalGate(_state)
    _control_tower = ControlTower(
        state=_state,
        router=task_router,
        workers=workers,
        verifier=verifier,
        approval_gate=_approval,
    )
    logger.info("Multi-Agent OS orchestration initialized")


def _ct() -> ControlTower:
    if not _control_tower:
        raise HTTPException(500, "Orchestration not initialized")
    return _control_tower


# --- Request/Response models ---

class CreateEngagementRequest(BaseModel):
    objective: str
    client_id: str = ""
    constraints: list[str] = Field(default_factory=list)
    budget_usd: float = 0
    inputs: list[str] = Field(default_factory=list)


class TaskDescription(BaseModel):
    description: str
    inputs: list[str] = Field(default_factory=list)
    approval_required: bool = False
    tool_permission: str = "read_only"
    risk_flags: list[str] = Field(default_factory=list)


class DecomposeRequest(BaseModel):
    tasks: list[TaskDescription]


class ApprovalAction(BaseModel):
    approver: str


class VerifyTaskRequest(BaseModel):
    output: dict[str, Any]


# --- Engagement endpoints ---

@router.post("/engagements")
async def create_engagement(req: CreateEngagementRequest):
    """Create a new engagement plan from a client objective."""
    plan = _ct().create_engagement(
        objective=req.objective,
        client_id=req.client_id,
        constraints=req.constraints,
        budget_usd=req.budget_usd,
        inputs=req.inputs,
    )
    return plan.model_dump()


@router.post("/engagements/{engagement_id}/decompose")
async def decompose_engagement(engagement_id: str, req: DecomposeRequest):
    """Decompose an engagement into routed, permissioned tasks."""
    plan = _state.load_engagement(engagement_id)
    if not plan:
        raise HTTPException(404, f"Engagement {engagement_id} not found")

    task_descs = [t.model_dump() for t in req.tasks]
    plan = _ct().decompose_tasks(plan, task_descs)
    return plan.model_dump()


@router.get("/engagements/{engagement_id}")
async def get_engagement(engagement_id: str):
    """Get full engagement plan."""
    plan = _state.load_engagement(engagement_id)
    if not plan:
        raise HTTPException(404, f"Engagement {engagement_id} not found")
    return plan.model_dump()


@router.get("/engagements/{engagement_id}/status")
async def get_engagement_status(engagement_id: str):
    """Get engagement progress summary."""
    plan = _state.load_engagement(engagement_id)
    if not plan:
        raise HTTPException(404, f"Engagement {engagement_id} not found")
    return _ct().get_engagement_status(plan)


@router.get("/engagements")
async def list_engagements():
    """List all engagement IDs."""
    return {"engagements": _state.list_engagements()}


@router.post("/engagements/{engagement_id}/tasks/{task_id}/verify")
async def verify_task(engagement_id: str, task_id: str, req: VerifyTaskRequest):
    """Run verification on a task output."""
    plan = _state.load_engagement(engagement_id)
    if not plan:
        raise HTTPException(404, f"Engagement {engagement_id} not found")

    task = next((t for t in plan.tasks if t.task_id == task_id), None)
    if not task:
        raise HTTPException(404, f"Task {task_id} not found")

    task = _ct().verify_task_output(task, req.output)
    _state.save_engagement(plan)

    return {
        "task_id": task.task_id,
        "status": task.status.value,
        "verification": task.verification.model_dump() if task.verification else None,
    }


@router.post("/engagements/{engagement_id}/tasks/{task_id}/handoff")
async def build_handoff(engagement_id: str, task_id: str):
    """Build a typed worker handoff for a task."""
    plan = _state.load_engagement(engagement_id)
    if not plan:
        raise HTTPException(404, f"Engagement {engagement_id} not found")

    task = next((t for t in plan.tasks if t.task_id == task_id), None)
    if not task:
        raise HTTPException(404, f"Task {task_id} not found")

    handoff = _ct().build_handoff(task, plan)
    return handoff.model_dump()


# --- Approval endpoints ---

@router.get("/approvals")
async def list_approvals():
    """List pending approval requests."""
    if not _approval:
        raise HTTPException(500, "Orchestration not initialized")
    return {"approvals": [p.model_dump() for p in _approval.list_pending()]}


@router.post("/approvals/{approval_id}/approve")
async def approve(approval_id: str, req: ApprovalAction):
    """Approve a pending request."""
    if not _approval:
        raise HTTPException(500, "Orchestration not initialized")
    packet = _approval.approve(approval_id, req.approver)
    if not packet:
        raise HTTPException(404, f"Approval {approval_id} not found")
    return packet.model_dump()


@router.post("/approvals/{approval_id}/reject")
async def reject(approval_id: str, req: ApprovalAction):
    """Reject a pending request."""
    if not _approval:
        raise HTTPException(500, "Orchestration not initialized")
    packet = _approval.reject(approval_id, req.approver)
    if not packet:
        raise HTTPException(404, f"Approval {approval_id} not found")
    return packet.model_dump()


# --- Workers endpoint ---

@router.get("/workers")
async def list_workers():
    """List all worker contracts."""
    workers = WorkerRegistry()
    return {
        "workers": [
            {
                "key": key,
                "name": w.name,
                "agent_id": w.agent_id,
                "purpose": w.purpose,
                "task_types": [t.value for t in w.task_types],
                "preferred_model": w.preferred_model,
                "max_tool_permission": w.max_tool_permission.value,
                "delegate_slugs": w.delegate_slugs,
            }
            for key, w in zip(workers.list_names(), workers.list_all())
        ]
    }


# --- Evidence endpoints ---

@router.get("/evidence")
async def search_evidence(tags: str = ""):
    """Search evidence by comma-separated tags."""
    if not _state:
        raise HTTPException(500, "Orchestration not initialized")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    results = _state.search_evidence(tag_list) if tag_list else []
    return {"evidence": [e.model_dump() for e in results]}


# --- Decision ledger ---

@router.get("/decisions/{engagement_id}")
async def get_decisions(engagement_id: str):
    """Get all decisions for an engagement."""
    if not _state:
        raise HTTPException(500, "Orchestration not initialized")
    decisions = _state.get_decisions(engagement_id)
    return {"decisions": [d.model_dump() for d in decisions]}
