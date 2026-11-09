#!/usr/bin/env python3
"""
SessionStart Hook — Durable session context for the NXT Humans IA Suite.

Fires once when a Claude Code session starts (startup / resume / clear). Surfaces
the standing context the agent otherwise re-derives by hand every session:

  1. Current git branch + the never-merge-to-main / branch-from-feature-branch rule
     (memory: feedback_never_merge_to_main). Emphasized loudly if HEAD == main.
  2. Working-tree state (count of modified + untracked files) so the agent knows
     up front whether it's walking into a dirty tree.
  3. The HiC no-HMR rebuild rule (memory: feedback_hic_research_rebuild) and the
     :5011 sacred-port reminder (memory: feedback_sacred_ports).
  4. Pointers to the most recent active plan files under humans-in-control-research/plans/.

Deliberately COMPLEMENTARY to inject_active_constraints_and_patterns.py
(UserPromptSubmit) — that hook injects the deduped learned-constraints on every
prompt; this one injects session-durable orientation ONCE and does not duplicate
the constraint dump.

stdlib only, never reaches the network, never blocks. On any failure it emits
nothing and exits 0.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PLANS_DIR = os.path.join(REPO_ROOT, "humans-in-control-research", "plans")

MAX_BYTES = 4 * 1024  # keep the injection lean
MAX_PLANS = 4


def _git(*args: str) -> str:
    """Run a git command in the repo root; return stripped stdout or '' on failure."""
    try:
        out = subprocess.run(
            ["git", "-C", REPO_ROOT, *args],
            capture_output=True,
            text=True,
            timeout=8,
        )
        if out.returncode != 0:
            return ""
        return (out.stdout or "").strip()
    except Exception:
        return ""


def current_branch() -> str:
    return _git("rev-parse", "--abbrev-ref", "HEAD")


def worktree_counts() -> tuple[int, int]:
    """Return (tracked_changes, untracked_files)."""
    status = _git("status", "--porcelain")
    if not status:
        return (0, 0)
    tracked = 0
    untracked = 0
    for line in status.splitlines():
        if line.startswith("??"):
            untracked += 1
        elif line.strip():
            tracked += 1
    return (tracked, untracked)


def recent_plans() -> list[str]:
    """Most-recently-modified plan filenames under humans-in-control-research/plans/."""
    try:
        entries = []
        for name in os.listdir(PLANS_DIR):
            full = os.path.join(PLANS_DIR, name)
            if os.path.isfile(full) and name.lower().endswith(".md"):
                entries.append((os.path.getmtime(full), name))
        entries.sort(reverse=True)
        return [name for _, name in entries[:MAX_PLANS]]
    except Exception:
        return []


def build_context() -> str | None:
    branch = current_branch()
    if not branch:
        # Not a git repo or git unavailable — nothing durable to say.
        return None

    parts: list[str] = []
    parts.append(f"Active git branch: {branch}")

    if branch == "main":
        parts.append(
            "WARNING: you are on main. Main is owner-controlled and runs months "
            "behind feature branches. Do NOT commit here. Branch FROM the latest "
            "feature branch (e.g., a HiC-* branch) to inherit recent work before editing."
        )
    else:
        parts.append(
            "Git discipline: never merge to main; never commit without explicit user "
            "approval (build, then test, then commit). Branch from feature branches, not main."
        )

    tracked, untracked = worktree_counts()
    if tracked or untracked:
        parts.append(
            f"Working tree is dirty: {tracked} tracked change(s), {untracked} untracked "
            "file(s). Inspect before staging; do not assume a clean baseline."
        )
    else:
        parts.append("Working tree is clean.")

    parts.append(
        "HiC has NO HMR in Docker. After editing anything under humans-in-control-research/ "
        "code, rebuild: docker compose -f docker-compose-all.yml up -d --build research-generator, "
        "then hard-refresh http://localhost:5011 (Ctrl+Shift+R). Port 3000 is Social Research, NOT HiC."
    )

    plans = recent_plans()
    if plans:
        parts.append("Most recent HiC plan files (check before starting non-trivial HiC work):")
        for p in plans:
            parts.append(f"  - humans-in-control-research/plans/{p}")

    text = "\n".join(parts)
    encoded = text.encode("utf-8")
    if len(encoded) > MAX_BYTES:
        text = encoded[:MAX_BYTES].decode("utf-8", errors="ignore").rstrip() + "\n[truncated]"
    return text


def main() -> None:
    context = build_context()
    if not context:
        sys.exit(0)

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "<session_context>\n"
                f"{context}\n"
                "</session_context>\n"
                "This is durable orientation for the current session. The git discipline "
                "and HiC rebuild rules are standing requirements, not optional preferences."
            ),
        }
    }
    sys.stdout.write(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
