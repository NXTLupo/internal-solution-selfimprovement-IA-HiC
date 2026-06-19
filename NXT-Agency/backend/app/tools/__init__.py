"""
Tool subsystem for the NXT-Agency agent engine.

Exports:
    ToolRegistry  - Central registry for discovering and executing tools.
    BaseTool      - Abstract base class every tool must subclass.
    AgentContext   - Per-invocation context (session, agent, workspace).
"""

from .base import AgentContext, BaseTool, ToolRegistry

__all__ = ["AgentContext", "BaseTool", "ToolRegistry"]
