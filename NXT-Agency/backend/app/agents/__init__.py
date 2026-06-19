"""
Agent subsystem: registry, execution engine, and API routes.

Exports:
    AgentRegistry  - Loads agent definitions from markdown prompt files.
    AgentEngine    - Core agentic execution loop with tool calling.
"""

from .registry import AgentRegistry, AgentDefinition
from .engine import AgentEngine

__all__ = ["AgentDefinition", "AgentEngine", "AgentRegistry"]
