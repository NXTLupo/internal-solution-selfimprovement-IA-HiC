"""
Worker agent definitions for the Multi-Agent OS.

Each worker is a contract (spec section 3.1): explicit scope, allowed inputs,
allowed tools, required outputs, pass/fail rubric, escalation conditions.

Workers are NOT personas. They are bounded contracts that the Control Tower
dispatches with typed handoffs.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .contracts import TaskType, ToolPermission

logger = logging.getLogger("orchestration.workers")


@dataclass
class WorkerContract:
    """
    A worker agent contract defining scope, tools, outputs, and escalation.
    """
    name: str
    agent_id: int  # Maps to spec section 6 numbering (0-7)
    purpose: str
    task_types: list[TaskType]
    preferred_model: str
    secondary_model: str = ""
    max_tool_permission: ToolPermission = ToolPermission.READ_ONLY
    required_output_sections: list[str] = field(default_factory=list)
    acceptance_criteria: list[str] = field(default_factory=list)
    escalation_conditions: list[str] = field(default_factory=list)
    forbidden_actions: list[str] = field(default_factory=list)

    # Map to existing NXT Agency agent slugs for delegation
    delegate_slugs: list[str] = field(default_factory=list)


# --- Worker definitions (spec sections 6.1-6.8) ---

WORKERS: dict[str, WorkerContract] = {
    "control_tower": WorkerContract(
        name="Agency Control Tower",
        agent_id=0,
        purpose="The only agent permitted to orchestrate other agents. Accepts intake, normalizes inputs, classifies job type, decomposes into tasks, assigns routes, defines approvals, launches workers, collects outputs, triggers verification, assembles final deliverable.",
        task_types=[],  # Orchestrator, not a task worker
        preferred_model="claude-opus",
        max_tool_permission=ToolPermission.DRAFT,
        required_output_sections=["engagement_plan", "task_graph", "routing_plan", "approval_gates", "budget_cap", "risk_register"],
        acceptance_criteria=["Task graph is complete", "Routes are justified", "All high-risk actions have gates", "All deliverables have owners"],
        forbidden_actions=["Direct production changes", "Direct external contact", "Direct publication", "Direct spend changes"],
        delegate_slugs=["agents-orchestrator"],
    ),
    "strategy": WorkerContract(
        name="Strategic Intelligence Lead",
        agent_id=1,
        purpose="Turn messy business inputs into a concise operating thesis and initiative plan.",
        task_types=[TaskType.STRATEGY_SYNTHESIS],
        preferred_model="claude-opus",
        max_tool_permission=ToolPermission.DRAFT,
        required_output_sections=["executive_summary", "hidden_bottlenecks", "strategic_options", "recommended_direction", "kpi_hierarchy", "tradeoffs", "immediate_next_actions"],
        acceptance_criteria=["At least one evidentiary citation per major claim", "Options include explicit tradeoffs", "Recommendation ties to measurable KPIs", "Downstream briefs are machine-parseable"],
        escalation_conditions=["Conflicting source data with no resolution", "Missing critical business context"],
        delegate_slugs=["support-executive-summary-generator", "product-manager", "support-analytics-reporter"],
    ),
    "research": WorkerContract(
        name="Customer & Market Signal Miner",
        agent_id=2,
        purpose="Convert large research corpora into evidence-backed patterns, gaps, and message territories.",
        task_types=[TaskType.RESEARCH_SYNTHESIS],
        preferred_model="gemini-pro",
        secondary_model="claude-opus",
        max_tool_permission=ToolPermission.READ_ONLY,
        required_output_sections=["insight_clusters", "quote_bank", "issue_taxonomy", "emotional_journey_map", "whitespace_analysis", "signal_confidence_scores"],
        acceptance_criteria=["Every insight cluster has source refs", "Confidence score present", "Counts/frequencies included", "Unknowns explicitly listed"],
        escalation_conditions=["Insufficient source material", "Contradictory signals above threshold"],
        delegate_slugs=["product-trend-researcher", "product-feedback-synthesizer", "marketing-seo-specialist"],
    ),
    "ux_product": WorkerContract(
        name="Product Experience Architect",
        agent_id=3,
        purpose="Translate research and strategy into flows, screens, component logic, and implementation-ready UX specs.",
        task_types=[TaskType.UX_DESIGN],
        preferred_model="gpt-5",
        secondary_model="claude-opus",
        max_tool_permission=ToolPermission.STAGED_WRITE,
        required_output_sections=["user_flows", "state_maps", "information_architecture", "wireframes", "interaction_specs", "component_specs", "implementation_tickets"],
        acceptance_criteria=["All key flows covered", "All critical states covered", "Accessibility checklist passed", "Handoff includes tokens, components, and behaviors"],
        escalation_conditions=["Missing design system tokens", "Accessibility violation cannot be resolved"],
        delegate_slugs=["design-ui-designer", "design-ux-architect", "design-ux-researcher"],
    ),
    "engineering": WorkerContract(
        name="Engineering Delivery Lead",
        agent_id=4,
        purpose="Diagnose, patch, refactor, test, and prepare release candidates safely.",
        task_types=[TaskType.ENGINEERING_DIAGNOSIS, TaskType.ENGINEERING_PATCH],
        preferred_model="claude-opus",
        secondary_model="gpt-5",
        max_tool_permission=ToolPermission.STAGED_WRITE,
        required_output_sections=["root_cause_analysis", "patch_plan", "code_diff", "tests", "migration_notes", "rollout_plan", "rollback_plan"],
        acceptance_criteria=["Issue reproduced or clearly bounded", "Tests added or updated", "Contract changes explicit", "Rollback path exists", "Security review complete for sensitive changes"],
        escalation_conditions=["Root cause cannot be reproduced", "Patch changes external contract", "Secret exposure risk detected"],
        delegate_slugs=["engineering-backend-architect", "engineering-frontend-developer", "engineering-code-reviewer", "engineering-security-engineer", "engineering-devops-automator"],
    ),
    "growth": WorkerContract(
        name="Growth Systems Operator",
        agent_id=5,
        purpose="Design and prepare growth experiments, content, channel actions, and performance recommendations.",
        task_types=[TaskType.GROWTH_EXPERIMENT],
        preferred_model="gpt-5",
        secondary_model="gemini-pro",
        max_tool_permission=ToolPermission.DRAFT,
        required_output_sections=["experiment_plans", "creative_variants", "copy_variants", "audience_hypotheses", "seo_recommendations", "approval_queue"],
        acceptance_criteria=["Experiment has hypothesis and metric", "Asset changes tied to evidence", "Statistical logic declared", "Live actions placed in approval queue"],
        forbidden_actions=["Budget edits without approval", "Live campaign launches without approval", "CMS publish without approval"],
        escalation_conditions=["Budget impact exceeds threshold", "Brand compliance concern"],
        delegate_slugs=["marketing-growth-hacker", "marketing-seo-specialist", "marketing-content-creator"],
    ),
    "revenue": WorkerContract(
        name="Revenue Intelligence Operator",
        agent_id=6,
        purpose="Support enterprise sales with evidence-backed qualification, strategy, response mapping, and pursuit materials.",
        task_types=[TaskType.REVENUE_INTELLIGENCE],
        preferred_model="gemini-pro",
        secondary_model="claude-opus",
        max_tool_permission=ToolPermission.DRAFT,
        required_output_sections=["meddpicc_scorecard", "buying_committee_map", "incumbent_risk_map", "response_matrix", "executive_summary", "objection_model", "pursuit_strategy"],
        acceptance_criteria=["All claims tied to account evidence", "Qualification score explicit", "Risks separated from assumptions", "No unsupported overpromising"],
        escalation_conditions=["Missing critical account data", "Competitive intelligence gap"],
        delegate_slugs=["sales-deal-strategist", "sales-discovery-coach", "sales-proposal-strategist"],
    ),
    "verifier": WorkerContract(
        name="Verifier / Red Team",
        agent_id=7,
        purpose="Check outputs before they reach clients or trigger actions.",
        task_types=[TaskType.VERIFICATION],
        preferred_model="claude-opus",
        max_tool_permission=ToolPermission.READ_ONLY,
        required_output_sections=["pass_fail", "defect_list", "severity_ratings", "remediation_tasks", "approval_recommendation"],
        acceptance_criteria=["All critical defects resolved before release", "Open medium defects explicitly disclosed", "High-risk actions require human approval"],
        escalation_conditions=["Cannot determine factual grounding", "Policy ambiguity"],
        delegate_slugs=["testing-reality-checker", "testing-evidence-collector", "engineering-code-reviewer"],
    ),
}


class WorkerRegistry:
    """Registry of worker contracts."""

    def __init__(self):
        self._workers = dict(WORKERS)

    def get(self, worker_key: str) -> WorkerContract | None:
        return self._workers.get(worker_key)

    def get_for_task_type(self, task_type: TaskType) -> WorkerContract | None:
        """Find the worker responsible for a task type."""
        for worker in self._workers.values():
            if task_type in worker.task_types:
                return worker
        return None

    def list_all(self) -> list[WorkerContract]:
        return list(self._workers.values())

    def list_names(self) -> list[str]:
        return list(self._workers.keys())
