"""
Sandboxed file-system tools.

All paths are resolved and validated to ensure they remain within the
agent's working directory (``ctx.working_dir / ctx.session_id``).
Tier 3: only available to agents with elevated privileges.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.file_ops")

MAX_READ_BYTES = 1_048_576  # 1 MiB
MAX_WRITE_BYTES = 5_242_880  # 5 MiB


def _resolve_sandboxed_path(raw_path: str, ctx: AgentContext) -> Path:
    """
    Resolve *raw_path* inside the session sandbox.

    Raises ``PermissionError`` if the resolved path escapes the sandbox.
    """
    sandbox = Path(ctx.working_dir) / ctx.session_id
    sandbox.mkdir(parents=True, exist_ok=True)

    # Join and resolve to an absolute path
    target = (sandbox / raw_path).resolve()
    sandbox_resolved = sandbox.resolve()

    # os.path.commonpath raises ValueError when paths are on different drives
    try:
        common = Path(os.path.commonpath([sandbox_resolved, target]))
    except ValueError:
        raise PermissionError(
            f"Path {raw_path!r} is outside the sandbox {sandbox_resolved}"
        )

    if common != sandbox_resolved:
        raise PermissionError(
            f"Path traversal detected: {raw_path!r} resolves outside "
            f"sandbox {sandbox_resolved}"
        )

    return target


class ReadFileTool(BaseTool):
    """Read the contents of a file inside the agent sandbox."""

    name = "read_file"
    description = (
        "Read a file from the agent workspace. Path is relative to the "
        "session working directory. Maximum file size: 1 MiB."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file to read.",
            },
        },
        "required": ["path"],
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        raw_path = params.get("path", "")
        if not raw_path:
            return {"error": "path parameter is required"}

        try:
            target = _resolve_sandboxed_path(raw_path, ctx)
        except PermissionError as exc:
            logger.warning("read_file path traversal attempt: %s", exc)
            return {"error": str(exc)}

        if not target.exists():
            return {"error": f"File not found: {raw_path}"}
        if not target.is_file():
            return {"error": f"Not a file: {raw_path}"}

        size = target.stat().st_size
        if size > MAX_READ_BYTES:
            return {
                "error": f"File too large ({size} bytes). Maximum: {MAX_READ_BYTES} bytes."
            }

        logger.info(
            "read_file path=%r size=%d (session %s)",
            raw_path,
            size,
            ctx.session_id,
        )

        try:
            content = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = target.read_text(encoding="utf-8", errors="replace")

        return {"path": raw_path, "content": content}


class WriteFileTool(BaseTool):
    """Write content to a file inside the agent sandbox."""

    name = "write_file"
    description = (
        "Write content to a file in the agent workspace. Path is relative to "
        "the session working directory. Creates parent directories as needed. "
        "Maximum content size: 5 MiB."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file to write.",
            },
            "content": {
                "type": "string",
                "description": "The content to write to the file.",
            },
        },
        "required": ["path", "content"],
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        raw_path = params.get("path", "")
        content = params.get("content", "")
        if not raw_path:
            return {"error": "path parameter is required"}

        content_bytes = len(content.encode("utf-8"))
        if content_bytes > MAX_WRITE_BYTES:
            return {
                "error": (
                    f"Content too large ({content_bytes} bytes). "
                    f"Maximum: {MAX_WRITE_BYTES} bytes."
                )
            }

        try:
            target = _resolve_sandboxed_path(raw_path, ctx)
        except PermissionError as exc:
            logger.warning("write_file path traversal attempt: %s", exc)
            return {"error": str(exc)}

        logger.info(
            "write_file path=%r bytes=%d (session %s)",
            raw_path,
            content_bytes,
            ctx.session_id,
        )

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

        return {"path": raw_path, "bytes_written": content_bytes}


class ListDirectoryTool(BaseTool):
    """List the contents of a directory inside the agent sandbox."""

    name = "list_directory"
    description = (
        "List files and directories in the agent workspace. "
        "Path is relative to the session working directory."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the directory (default: workspace root).",
                "default": ".",
            },
        },
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        raw_path = params.get("path", ".")

        try:
            target = _resolve_sandboxed_path(raw_path, ctx)
        except PermissionError as exc:
            logger.warning("list_directory path traversal attempt: %s", exc)
            return {"error": str(exc)}

        if not target.exists():
            return {"error": f"Directory not found: {raw_path}"}
        if not target.is_dir():
            return {"error": f"Not a directory: {raw_path}"}

        logger.info(
            "list_directory path=%r (session %s)", raw_path, ctx.session_id
        )

        entries = []
        try:
            for item in sorted(target.iterdir(), key=lambda p: p.name):
                entry: dict[str, Any] = {
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                }
                if item.is_file():
                    entry["size"] = item.stat().st_size
                entries.append(entry)
        except PermissionError:
            return {"error": f"Permission denied reading: {raw_path}"}

        return {"path": raw_path, "entries": entries}
