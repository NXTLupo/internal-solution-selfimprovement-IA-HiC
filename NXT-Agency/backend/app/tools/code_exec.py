"""
Sandboxed code execution tools.

Code is written to a temporary file inside the agent's sandbox and executed
in a subprocess with a hard timeout.  Tier 3: only available to agents with
elevated privileges.
"""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.code_exec")

EXECUTION_TIMEOUT_SECONDS = 30
MAX_OUTPUT_BYTES = 65_536  # 64 KiB per stream


def _sandbox_dir(ctx: AgentContext) -> Path:
    """Return (and create) the session sandbox directory."""
    sandbox = Path(ctx.working_dir) / ctx.session_id
    sandbox.mkdir(parents=True, exist_ok=True)
    return sandbox


class ExecutePythonTool(BaseTool):
    """Execute Python code in a sandboxed subprocess."""

    name = "execute_python"
    description = (
        "Execute Python code in an isolated subprocess. "
        "Returns stdout, stderr, and exit code. Timeout: 30 seconds."
    )
    parameters = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python source code to execute.",
            },
        },
        "required": ["code"],
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        code = params.get("code", "")
        if not code.strip():
            return {"error": "code parameter is required and must be non-empty"}
        # 2026-10-31 (agent-stack plan D4): code that sends anything outbound waits for review like a computer action
        from app.tools import review_gate
        return await review_gate.gate("python", {"code": code}, "", lambda: self._run(code, ctx))

    async def _run(self, code: str, ctx: AgentContext) -> dict[str, Any]:
        sandbox = _sandbox_dir(ctx)

        # Write code to a temp file inside the sandbox
        script_path = sandbox / f"_exec_{os.getpid()}.py"
        try:
            script_path.write_text(code, encoding="utf-8")

            logger.info(
                "execute_python code_len=%d (session %s)",
                len(code),
                ctx.session_id,
            )

            proc = await asyncio.create_subprocess_exec(
                "python3",
                str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(sandbox),
                env={
                    **os.environ,
                    "PYTHONDONTWRITEBYTECODE": "1",
                },
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=EXECUTION_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "stdout": "",
                    "stderr": f"Execution timed out after {EXECUTION_TIMEOUT_SECONDS}s",
                    "exit_code": -1,
                }

            stdout = stdout_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
            stderr = stderr_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")

            return {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": proc.returncode or 0,
            }
        finally:
            # Clean up the temp script
            try:
                script_path.unlink(missing_ok=True)
            except OSError:
                pass


class ExecuteJavaScriptTool(BaseTool):
    """Execute JavaScript code via Node.js in a sandboxed subprocess."""

    name = "execute_javascript"
    description = (
        "Execute JavaScript code using Node.js in an isolated subprocess. "
        "Returns stdout, stderr, and exit code. Timeout: 30 seconds."
    )
    parameters = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "JavaScript source code to execute.",
            },
        },
        "required": ["code"],
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        code = params.get("code", "")
        if not code.strip():
            return {"error": "code parameter is required and must be non-empty"}
        # 2026-10-31 (agent-stack plan D4): code that sends anything outbound waits for review like a computer action
        from app.tools import review_gate
        return await review_gate.gate("javascript", {"code": code}, "", lambda: self._run(code, ctx))

    async def _run(self, code: str, ctx: AgentContext) -> dict[str, Any]:
        sandbox = _sandbox_dir(ctx)

        script_path = sandbox / f"_exec_{os.getpid()}.js"
        try:
            script_path.write_text(code, encoding="utf-8")

            logger.info(
                "execute_javascript code_len=%d (session %s)",
                len(code),
                ctx.session_id,
            )

            proc = await asyncio.create_subprocess_exec(
                "node",
                str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(sandbox),
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=EXECUTION_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "stdout": "",
                    "stderr": f"Execution timed out after {EXECUTION_TIMEOUT_SECONDS}s",
                    "exit_code": -1,
                }

            stdout = stdout_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
            stderr = stderr_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")

            return {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": proc.returncode or 0,
            }
        finally:
            try:
                script_path.unlink(missing_ok=True)
            except OSError:
                pass
