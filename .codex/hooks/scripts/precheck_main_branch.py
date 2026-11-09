#!/usr/bin/env python3
"""
PreToolUse hook — Main-branch merge/push protector.

Hard rule (memory: never_merge_to_main): main is owner-controlled and runs
months behind feature branches. Never merge or push to main from an agent
session. Branch FROM the latest HiC-* feature branch to inherit recent
work; main is months stale.

Blocks:
    git merge ... main / origin/main
    git merge main ... (when current branch is not main)
    git push ... main / origin main
    git push --force ... main
    git rebase main (when current branch should be feature-based)
    git checkout main; git merge ...
    git reset --hard origin/main (would wipe local feature work)

Exit codes:
    0 — allow
    2 — block + feedback
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, bash_command, block, allow

# Patterns that target main. Order matters — most specific first.
DENY_PATTERNS = [
    (re.compile(r"\bgit\s+merge\b.*\bmain\b"),
     "git merge with main — never merge to main, ever. Branch FROM the latest HiC-* feature branch instead."),
    (re.compile(r"\bgit\s+push\b.*\bmain\b"),
     "git push to main — main is owner-controlled and runs months behind feature branches. Push to your feature branch instead."),
    (re.compile(r"\bgit\s+push\s+--force\b.*\bmain\b"),
     "force-push to main — destructive and forbidden. Push to a feature branch."),
    (re.compile(r"\bgit\s+rebase\s+main\b"),
     "git rebase main — main is months stale. Rebase onto the latest HiC-* branch you forked from."),
    (re.compile(r"\bgit\s+reset\s+--hard\s+(origin/)?main\b"),
     "git reset --hard onto main — would destroy local feature work. Reset to your feature branch's tip instead."),
    (re.compile(r"\bgit\s+checkout\s+main\b.*&&.*\bgit\s+merge\b"),
     "checkout main + merge — never land changes on main. Stay on your feature branch."),
]

# Allow listing the branch graph, fetching, diffing — read-only ops.
READ_ONLY_OK = re.compile(
    r"\bgit\s+(log|diff|status|show|fetch|remote|branch(\s+-[avr])?|ls-remote|rev-parse|describe|blame|stash\s+list)\b"
)


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Bash"}:
        allow()

    cmd = bash_command(event)
    if not cmd:
        allow()

    if READ_ONLY_OK.search(cmd) and "merge" not in cmd and "push" not in cmd:
        allow()

    for pattern, reason in DENY_PATTERNS:
        if pattern.search(cmd):
            block(
                f"Blocked: {reason}\n"
                f"\nCommand: {cmd}\n"
                f"\nRule (memory: never_merge_to_main): main is owner-controlled. "
                f"Branch FROM the latest HiC-* feature branch — never from main, never to main.\n"
                f"If this is genuinely intentional and authorized, the user can run it manually outside the agent session."
            )

    allow()


if __name__ == "__main__":
    main()
