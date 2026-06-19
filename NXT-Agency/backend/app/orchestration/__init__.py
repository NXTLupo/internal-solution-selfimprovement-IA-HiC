"""
NXT Agency Multi-Agent Operating System.

A governed, auditable, task-routed agent architecture for production client delivery.
Layers on top of the existing agent engine without breaking the 155-agent chat system.
"""

from .contracts import EngagementPlan, TaskNode, WorkerHandoff, EvidenceRef, VerificationResult
from .control_tower import ControlTower
from .router import TaskRouter
from .state import StateManager
from .workers import WorkerRegistry
from .verifier import Verifier
from .approval import ApprovalGate

__all__ = [
    "EngagementPlan", "TaskNode", "WorkerHandoff", "EvidenceRef", "VerificationResult",
    "ControlTower", "TaskRouter", "StateManager", "WorkerRegistry", "Verifier", "ApprovalGate",
]
