"""
Typed data contracts for the Multi-Agent OS.

These are the handoff, evidence, verification, and engagement plan objects
that flow between agents. They enforce schema validation on every handoff,
preventing the 'incomplete handoff' failure mode (spec section 13.1).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


# --- Enums ---

class TaskType(str, Enum):
    RESEARCH_SYNTHESIS = "research_synthesis"
    STRATEGY_SYNTHESIS = "strategy_synthesis"
    UX_DESIGN = "ux_design"
    ENGINEERING_DIAGNOSIS = "engineering_diagnosis"
    ENGINEERING_PATCH = "engineering_patch"
    GROWTH_EXPERIMENT = "growth_experiment"
    REVENUE_INTELLIGENCE = "revenue_intelligence"
    VERIFICATION = "verification"
    CUSTOM = "custom"


class TaskStatus(str, Enum):
    PENDING = "pending"
    ROUTED = "routed"
    IN_PROGRESS = "in_progress"
    AWAITING_VERIFICATION = "awaiting_verification"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ToolPermission(str, Enum):
    READ_ONLY = "read_only"
    DRAFT = "draft"
    STAGED_WRITE = "staged_write"
    LIVE_WRITE = "live_write"


class Phase(str, Enum):
    PLAN = "plan"
    EXECUTE = "execute"
    VERIFY = "verify"


class VerificationDimension(str, Enum):
    STRUCTURAL = "structural"
    EVIDENCE = "evidence"
    POLICY = "policy"
    DOMAIN = "domain"
    ACTION_READINESS = "action_readiness"


# --- Core objects ---

class ModelRoute(BaseModel):
    """Model routing decision for a task."""
    primary_model: str  # e.g., "claude-opus", "gpt-5", "gemini-pro"
    secondary_model: Optional[str] = None
    reasoning: str = ""  # Why this model was chosen


class EvidenceRef(BaseModel):
    """Evidence reference object (spec section 8.3)."""
    evidence_id: str = Field(default_factory=lambda: _id("EV"))
    artifact_ref: str = ""  # e.g., "artifact://support-log-jan"
    locator: dict[str, Any] = Field(default_factory=dict)  # type, start, end
    excerpt: str = ""
    tags: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    created_at: datetime = Field(default_factory=_now)


class Defect(BaseModel):
    """A single defect found during verification."""
    severity: Severity
    category: str  # e.g., "accessibility", "evidence", "policy"
    issue: str
    remediation_owner: str = ""
    evidence: Optional[EvidenceRef] = None


class VerificationResult(BaseModel):
    """Verification result object (spec section 8.4)."""
    verification_id: str = Field(default_factory=lambda: _id("VR"))
    target_artifact: str = ""
    status: str = "pending"  # "pass", "fail", "blocked"
    defects: list[Defect] = Field(default_factory=list)
    dimensions_checked: list[VerificationDimension] = Field(default_factory=list)
    approval_recommendation: str = ""  # "approved", "blocked", "conditional"
    verified_at: datetime = Field(default_factory=_now)


class ApprovalPacket(BaseModel):
    """Approval request (spec section 11.2)."""
    approval_id: str = Field(default_factory=lambda: _id("AP"))
    proposed_action: str
    reason: str
    expected_impact: str = ""
    risks: list[str] = Field(default_factory=list)
    rollback_plan: str = ""
    source_evidence: list[EvidenceRef] = Field(default_factory=list)
    affected_systems: list[str] = Field(default_factory=list)
    status: ApprovalStatus = ApprovalStatus.PENDING
    requested_at: datetime = Field(default_factory=_now)
    resolved_at: Optional[datetime] = None
    resolver: str = ""


class TaskNode(BaseModel):
    """A single task in the engagement plan (spec section 8.1 tasks array)."""
    task_id: str = Field(default_factory=lambda: _id("T"))
    type: TaskType = TaskType.CUSTOM
    description: str = ""
    owner_agent: str = ""  # Worker agent name
    route: ModelRoute = Field(default_factory=lambda: ModelRoute(primary_model="claude-sonnet"))
    inputs: list[str] = Field(default_factory=list)  # artifact refs
    outputs_required: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    approval_required: bool = False
    tool_permission: ToolPermission = ToolPermission.READ_ONLY
    risk_flags: list[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    phase: Phase = Phase.PLAN
    evidence: list[EvidenceRef] = Field(default_factory=list)
    result: Optional[dict[str, Any]] = None
    verification: Optional[VerificationResult] = None
    created_at: datetime = Field(default_factory=_now)
    completed_at: Optional[datetime] = None


class ApprovalGateSpec(BaseModel):
    """An approval gate in the engagement plan."""
    gate_id: str = Field(default_factory=lambda: _id("G"))
    trigger: str  # e.g., "external_publish_or_send"
    approver_role: str = "Engagement Lead"


class BudgetCap(BaseModel):
    """Budget constraints."""
    usd: float = 0.0
    max_tokens: int = 0
    max_turns: int = 0


class EngagementPlan(BaseModel):
    """Core engagement plan object (spec section 8.1)."""
    engagement_id: str = Field(default_factory=lambda: _id("ENG"))
    client_id: str = ""
    objective: str = ""
    constraints: list[str] = Field(default_factory=list)
    tasks: list[TaskNode] = Field(default_factory=list)
    approval_gates: list[ApprovalGateSpec] = Field(default_factory=list)
    budget_cap: BudgetCap = Field(default_factory=BudgetCap)
    status: str = "active"
    created_at: datetime = Field(default_factory=_now)
    updated_at: Optional[datetime] = None


class WorkerHandoff(BaseModel):
    """Worker handoff object (spec section 8.2)."""
    handoff_id: str = Field(default_factory=lambda: _id("HX"))
    from_agent: str = "Agency Control Tower"
    to_agent: str = ""
    objective: str = ""
    business_context: dict[str, Any] = Field(default_factory=dict)
    inputs: list[dict[str, str]] = Field(default_factory=list)  # [{"type": "...", "ref": "..."}]
    required_outputs: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    approval_required: bool = False
    tool_permission: ToolPermission = ToolPermission.READ_ONLY
    created_at: datetime = Field(default_factory=_now)


class RunLog(BaseModel):
    """Observability log for a single run (spec section 12.1)."""
    run_id: str = Field(default_factory=lambda: _id("RUN"))
    user: str = ""
    client_id: str = ""
    project_id: str = ""
    engagement_id: str = ""
    agent_invoked: str = ""
    model_used: str = ""
    phase: Phase = Phase.EXECUTE
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    artifacts_read: list[str] = Field(default_factory=list)
    artifacts_written: list[str] = Field(default_factory=list)
    approval_gates_triggered: list[str] = Field(default_factory=list)
    verifier_result: Optional[str] = None
    token_estimate: int = 0
    cost_estimate_usd: float = 0.0
    status: str = "running"
    started_at: datetime = Field(default_factory=_now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class DecisionRecord(BaseModel):
    """Decision ledger entry (spec section 9.1)."""
    decision_id: str = Field(default_factory=lambda: _id("DEC"))
    engagement_id: str = ""
    task_id: str = ""
    decision: str = ""
    rationale: str = ""
    evidence_refs: list[str] = Field(default_factory=list)
    approved_by: str = ""
    decided_at: datetime = Field(default_factory=_now)
