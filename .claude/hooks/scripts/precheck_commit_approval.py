#!/usr/bin/env python3
"""
PreToolUse hook — Commit & push gatekeeper.

Standing rule (memory: feedback_no_commit_without_approval): no commits or
pushes without explicit user approval. The agent should stage changes
(`git add`) and wait. This hook catches the reflexive `git commit` /
`git push` at the end of a task.

Override mechanism: set env var CLAUDE_COMMIT_OK=1 before invoking the
command, OR include the literal token COMMIT_APPROVED inside the commit
message itself. Both are deliberate enough that an accidental trigger is
extremely unlikely.

Exit codes:
    0 — allow (override present, or command is read-only / non-commit / non-push)
    2 — block + feedback
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, bash_command, block, allow

# Catches `git commit`, `git commit -m`, `git -C <path> commit`, etc.
COMMIT_PATTERN = re.compile(r"\bgit(\s+-C\s+\S+)?\s+commit\b")

# Catches any `git push` (push to feature branch is also gated — user wants
# to test first).
PUSH_PATTERN = re.compile(r"\bgit(\s+-C\s+\S+)?\s+push\b")

# Catches gh CLI shortcuts that wrap a push (PR create with auto-push, etc.)
GH_PUSH_PATTERN = re.compile(r"\bgh\s+pr\s+create\b")


def has_override(cmd: str) -> bool:
    if os.environ.get("CLAUDE_COMMIT_OK") == "1":
        return True
    if "COMMIT_APPROVED" in cmd:
        return True
    return False


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Bash"}:
        allow()

    cmd = bash_command(event)
    if not cmd:
        allow()

    is_commit = bool(COMMIT_PATTERN.search(cmd))
    is_push = bool(PUSH_PATTERN.search(cmd))
    is_pr_create = bool(GH_PUSH_PATTERN.search(cmd))

    if not (is_commit or is_push or is_pr_create):
        allow()

    if has_override(cmd):
        allow(f"[commit gate] Override detected — proceeding with: {cmd[:120]}")

    action = "commit" if is_commit else ("push" if is_push else "gh pr create (implies push)")
    block(
        f"Blocked: git {action} requires explicit user approval.\n"
        f"\nCommand: {cmd}\n"
        f"\nStanding rule: build → test → commit, ONLY after the user has tested and approved.\n"
        f"Stage with `git add` and report what's ready; wait for the user's explicit go-ahead.\n"
        f"\nOverride mechanisms (use ONLY when the user has explicitly approved this specific action):\n"
        f"  - set CLAUDE_COMMIT_OK=1 in the environment, or\n"
        f"  - include the literal token COMMIT_APPROVED in the commit message."
    )


if __name__ == "__main__":
    main()
