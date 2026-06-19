"""
Verification framework for the Multi-Agent OS.

Implements the 5-stage verification pipeline from spec section 14.1:
1. Structural verification (schema valid, required sections present)
2. Evidence verification (claims linked, evidence sufficient)
3. Policy verification (no disallowed content/action)
4. Domain verification (engineering, accessibility, brand, commercial)
5. Action readiness verification (rollback exists, deployment path clear)
"""

from __future__ import annotations

import logging
from typing import Any

from .contracts import (
    VerificationResult, VerificationDimension, Defect, Severity,
    TaskNode, WorkerHandoff, EvidenceRef
)

logger = logging.getLogger("orchestration.verifier")


class Verifier:
    """
    Multi-dimensional output verifier.

    Checks worker outputs against structural, evidence, policy, domain,
    and action readiness criteria before they reach clients or trigger actions.
    """

    def verify(
        self,
        task: TaskNode,
        output: dict[str, Any],
        worker_contract_outputs: list[str],
        evidence: list[EvidenceRef] | None = None,
    ) -> VerificationResult:
        """Run all verification stages on a task output."""
        defects: list[Defect] = []
        dimensions: list[VerificationDimension] = []

        # Stage 1: Structural
        dimensions.append(VerificationDimension.STRUCTURAL)
        defects.extend(self._check_structural(output, worker_contract_outputs))

        # Stage 2: Evidence
        dimensions.append(VerificationDimension.EVIDENCE)
        defects.extend(self._check_evidence(output, evidence or []))

        # Stage 3: Policy
        dimensions.append(VerificationDimension.POLICY)
        defects.extend(self._check_policy(task, output))

        # Stage 4: Domain (basic checks)
        dimensions.append(VerificationDimension.DOMAIN)
        defects.extend(self._check_domain(task, output))

        # Stage 5: Action readiness
        if task.approval_required or task.tool_permission.value in ("staged_write", "live_write"):
            dimensions.append(VerificationDimension.ACTION_READINESS)
            defects.extend(self._check_action_readiness(task, output))

        # Determine overall status
        critical = [d for d in defects if d.severity == Severity.CRITICAL]
        high = [d for d in defects if d.severity == Severity.HIGH]

        if critical:
            status = "fail"
            recommendation = "blocked"
        elif high:
            status = "fail"
            recommendation = "blocked"
        elif defects:
            status = "pass"
            recommendation = "conditional"
        else:
            status = "pass"
            recommendation = "approved"

        result = VerificationResult(
            target_artifact=task.task_id,
            status=status,
            defects=defects,
            dimensions_checked=dimensions,
            approval_recommendation=recommendation,
        )

        logger.info(
            "Verification %s: task=%s status=%s defects=%d recommendation=%s",
            result.verification_id, task.task_id, status, len(defects), recommendation,
        )
        return result

    def _check_structural(self, output: dict, required_sections: list[str]) -> list[Defect]:
        """Check that all required output sections are present."""
        defects = []
        for section in required_sections:
            if section not in output or not output[section]:
                defects.append(Defect(
                    severity=Severity.HIGH,
                    category="structural",
                    issue=f"Required output section '{section}' is missing or empty",
                    remediation_owner="worker",
                ))
        return defects

    def _check_evidence(self, output: dict, evidence: list[EvidenceRef]) -> list[Defect]:
        """Check that claims are linked to evidence."""
        defects = []

        # Check for evidence_refs or citations in output
        has_evidence = bool(evidence) or any(
            isinstance(v, dict) and ("evidence" in v or "source" in v or "citation" in v)
            for v in output.values()
            if isinstance(v, (dict, list))
        )

        if not has_evidence and len(output) > 2:
            defects.append(Defect(
                severity=Severity.MEDIUM,
                category="evidence",
                issue="Output contains claims but no evidence references or citations",
                remediation_owner="worker",
            ))

        return defects

    def _check_policy(self, task: TaskNode, output: dict) -> list[Defect]:
        """Check for policy violations."""
        defects = []
        output_str = str(output).lower()

        # Check for sensitive content patterns
        sensitive_patterns = [
            ("password", "Possible password exposure in output"),
            ("api_key", "Possible API key exposure in output"),
            ("secret", "Possible secret exposure in output"),
        ]
        for pattern, msg in sensitive_patterns:
            if pattern in output_str:
                defects.append(Defect(
                    severity=Severity.CRITICAL,
                    category="policy",
                    issue=msg,
                    remediation_owner="verifier",
                ))

        return defects

    def _check_domain(self, task: TaskNode, output: dict) -> list[Defect]:
        """Domain-specific checks based on task type."""
        defects = []

        # Engineering: check for rollback plan
        if task.type.value.startswith("engineering"):
            if "rollback_plan" not in output:
                defects.append(Defect(
                    severity=Severity.MEDIUM,
                    category="engineering",
                    issue="Engineering output missing rollback plan",
                    remediation_owner="worker",
                ))

        # UX: check for accessibility
        if task.type.value == "ux_design":
            if "accessibility" not in str(output).lower():
                defects.append(Defect(
                    severity=Severity.MEDIUM,
                    category="accessibility",
                    issue="UX output does not mention accessibility considerations",
                    remediation_owner="worker",
                ))

        return defects

    def _check_action_readiness(self, task: TaskNode, output: dict) -> list[Defect]:
        """Check if output is ready for live action."""
        defects = []

        if task.approval_required and "risks" not in output:
            defects.append(Defect(
                severity=Severity.HIGH,
                category="action_readiness",
                issue="Approval-required task output missing risk assessment",
                remediation_owner="worker",
            ))

        return defects
