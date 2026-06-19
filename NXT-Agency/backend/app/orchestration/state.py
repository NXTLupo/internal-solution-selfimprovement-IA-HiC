"""
State management for the Multi-Agent OS.

Implements the memory architecture from spec section 9:
- Session memory (temporary, per-run)
- Project memory (reusable across runs)
- Evidence memory (immutable, source-bound)
- Decision ledger (approvals, rejections, rationale)
- Run logs (observability)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .contracts import (
    EngagementPlan, EvidenceRef, DecisionRecord, RunLog,
    ApprovalPacket, ApprovalStatus, VerificationResult, Phase
)

logger = logging.getLogger("orchestration.state")


class StateManager:
    """
    Central state store for the Multi-Agent OS.

    For MVP, uses file-based storage. Production should use a proper
    database (relational for ledger, vector for evidence).
    """

    def __init__(self, base_dir: str = "/tmp/nxt-agency-state"):
        self._base = Path(base_dir)
        self._base.mkdir(parents=True, exist_ok=True)

        # Sub-stores
        self._engagements_dir = self._base / "engagements"
        self._evidence_dir = self._base / "evidence"
        self._decisions_dir = self._base / "decisions"
        self._runs_dir = self._base / "runs"
        self._approvals_dir = self._base / "approvals"
        self._artifacts_dir = self._base / "artifacts"

        for d in [self._engagements_dir, self._evidence_dir, self._decisions_dir,
                   self._runs_dir, self._approvals_dir, self._artifacts_dir]:
            d.mkdir(exist_ok=True)

    # --- Engagement plans ---

    def save_engagement(self, plan: EngagementPlan) -> str:
        path = self._engagements_dir / f"{plan.engagement_id}.json"
        path.write_text(plan.model_dump_json(indent=2), encoding="utf-8")
        logger.info("Saved engagement plan: %s", plan.engagement_id)
        return plan.engagement_id

    def load_engagement(self, engagement_id: str) -> Optional[EngagementPlan]:
        path = self._engagements_dir / f"{engagement_id}.json"
        if not path.exists():
            return None
        return EngagementPlan.model_validate_json(path.read_text(encoding="utf-8"))

    def list_engagements(self) -> list[str]:
        return [p.stem for p in self._engagements_dir.glob("ENG-*.json")]

    # --- Evidence ---

    def store_evidence(self, evidence: EvidenceRef) -> str:
        path = self._evidence_dir / f"{evidence.evidence_id}.json"
        path.write_text(evidence.model_dump_json(indent=2), encoding="utf-8")
        return evidence.evidence_id

    def get_evidence(self, evidence_id: str) -> Optional[EvidenceRef]:
        path = self._evidence_dir / f"{evidence_id}.json"
        if not path.exists():
            return None
        return EvidenceRef.model_validate_json(path.read_text(encoding="utf-8"))

    def search_evidence(self, tags: list[str]) -> list[EvidenceRef]:
        """Search evidence by tags (simple file scan for MVP)."""
        results = []
        for path in self._evidence_dir.glob("EV-*.json"):
            ev = EvidenceRef.model_validate_json(path.read_text(encoding="utf-8"))
            if any(t in ev.tags for t in tags):
                results.append(ev)
        return results

    # --- Decision ledger ---

    def record_decision(self, decision: DecisionRecord) -> str:
        path = self._decisions_dir / f"{decision.decision_id}.json"
        path.write_text(decision.model_dump_json(indent=2), encoding="utf-8")
        logger.info("Recorded decision: %s", decision.decision_id)
        return decision.decision_id

    def get_decisions(self, engagement_id: str) -> list[DecisionRecord]:
        results = []
        for path in self._decisions_dir.glob("DEC-*.json"):
            dec = DecisionRecord.model_validate_json(path.read_text(encoding="utf-8"))
            if dec.engagement_id == engagement_id:
                results.append(dec)
        return sorted(results, key=lambda d: d.decided_at)

    # --- Run logs ---

    def log_run(self, run: RunLog) -> str:
        path = self._runs_dir / f"{run.run_id}.json"
        path.write_text(run.model_dump_json(indent=2), encoding="utf-8")
        return run.run_id

    def get_run(self, run_id: str) -> Optional[RunLog]:
        path = self._runs_dir / f"{run_id}.json"
        if not path.exists():
            return None
        return RunLog.model_validate_json(path.read_text(encoding="utf-8"))

    # --- Approval packets ---

    def submit_approval(self, packet: ApprovalPacket) -> str:
        path = self._approvals_dir / f"{packet.approval_id}.json"
        path.write_text(packet.model_dump_json(indent=2), encoding="utf-8")
        logger.info("Submitted approval request: %s", packet.approval_id)
        return packet.approval_id

    def resolve_approval(self, approval_id: str, status: str, resolver: str) -> Optional[ApprovalPacket]:
        path = self._approvals_dir / f"{approval_id}.json"
        if not path.exists():
            return None
        packet = ApprovalPacket.model_validate_json(path.read_text(encoding="utf-8"))
        packet.status = ApprovalStatus(status)
        packet.resolver = resolver
        packet.resolved_at = datetime.now(timezone.utc)
        path.write_text(packet.model_dump_json(indent=2), encoding="utf-8")
        return packet

    def list_pending_approvals(self) -> list[ApprovalPacket]:
        results = []
        for path in self._approvals_dir.glob("AP-*.json"):
            packet = ApprovalPacket.model_validate_json(path.read_text(encoding="utf-8"))
            if packet.status == "pending":
                results.append(packet)
        return sorted(results, key=lambda p: p.requested_at)

    # --- Artifacts ---

    def store_artifact(self, name: str, content: str | bytes, metadata: dict = None) -> str:
        """Store an artifact and return its reference."""
        artifact_id = f"artifact://{name}"
        path = self._artifacts_dir / name
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")
        if metadata:
            meta_path = self._artifacts_dir / f"{name}.meta.json"
            meta_path.write_text(json.dumps(metadata, default=str), encoding="utf-8")
        return artifact_id

    def load_artifact(self, name: str) -> Optional[str]:
        path = self._artifacts_dir / name
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")
