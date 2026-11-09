"""
Shared utilities for NXT Humans IA Suite hook scripts.

Hook contract (PreToolUse / PostToolUse / Stop / UserPromptSubmit):
    Input  — JSON on stdin describing the event.
    Output — exit 0 (allow) or exit 2 (block / emit feedback). Messages written
             to stderr are surfaced back to the model.

Common shape of stdin (PreToolUse / PostToolUse):
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": { ... }
}

This file intentionally has no external deps — stdlib only — so hooks fire
reliably even when project venvs are not active.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any

# Windows console default codepage mangles non-ASCII. Force UTF-8 on the
# streams the hook talks to (stderr is the feedback channel back to the model).
for _stream_name in ("stdout", "stderr"):
    _s = getattr(sys, _stream_name, None)
    if _s is not None and hasattr(_s, "reconfigure"):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def read_event() -> dict[str, Any]:
    """Read and parse the hook event JSON from stdin. Returns {} on failure."""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        return json.loads(raw)
    except Exception:
        return {}


def tool_input(event: dict[str, Any]) -> dict[str, Any]:
    return event.get("tool_input", {}) or {}


def tool_name(event: dict[str, Any]) -> str:
    return event.get("tool_name", "") or ""


def block(message: str) -> None:
    """Block the tool call and surface `message` to the model. Exit 2."""
    sys.stderr.write(message.rstrip() + "\n")
    sys.exit(2)


def allow(message: str = "") -> None:
    """Allow the tool call. Optionally emit an informational message."""
    if message:
        sys.stderr.write(message.rstrip() + "\n")
    sys.exit(0)


def proposed_text(event: dict[str, Any]) -> str:
    """For Edit/Write, return the text the model is trying to write."""
    ti = tool_input(event)
    name = tool_name(event)
    if name == "Write":
        return ti.get("content", "") or ""
    if name == "Edit":
        return ti.get("new_string", "") or ""
    if name == "NotebookEdit":
        return ti.get("new_source", "") or ""
    return ""


def file_path(event: dict[str, Any]) -> str:
    """For Edit/Write, return the absolute file_path the model is targeting."""
    ti = tool_input(event)
    return ti.get("file_path", "") or ti.get("notebook_path", "") or ""


def bash_command(event: dict[str, Any]) -> str:
    """For Bash, return the command string."""
    ti = tool_input(event)
    return ti.get("command", "") or ""


def normalize_path(p: str) -> str:
    """Lowercase + forward-slash a path so matchers are OS-portable."""
    return (p or "").replace("\\", "/").lower()


def is_hic_code_path(path: str) -> bool:
    """
    True when `path` is inside humans-in-control-research/ AND is code
    (not docs / wiki / plans / design notes / handoff files / generated artifacts).
    """
    p = normalize_path(path)
    if "humans-in-control-research/" not in p:
        return False
    # Exclude paths that are content/docs, not generation logic
    excluded = (
        "/hic-workspace/",
        "/plans/",
        "/design-desk/",
        "/migrated_prompt_history/",
        "/dist/",
        "/node_modules/",
        "/public/",
        "handoff_",
        "changelog.md",
        "readme.md",
        "claude.md",
        ".md.lock",
    )
    if any(x in p for x in excluded):
        return False
    # Only audit code/config files
    code_exts = (".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".html", ".css", ".yml", ".yaml")
    return p.endswith(code_exts)
