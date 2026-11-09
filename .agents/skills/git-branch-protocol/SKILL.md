---
name: git-branch-protocol
invocation: model
version: 1.0
description: Background ruleset that loads NXT Humans CX Workbench git discipline whenever Codex touches git. Encodes the never-merge-to-main rule, the branch-from-feature-branches convention, and the no-commit-without-approval rule. Use this as ambient context — Codex reads it but the user does not invoke it directly.
user-invocable: false
---

# NXT Humans CX Workbench — Git Branch & Commit Protocol

Hard rules. Violating any of these has cost time or risked work in the past. They override Codex's general git habits.

## Rule 1 — NEVER merge into main

`main` is owner-controlled. It is months behind feature branches by design.

- Do not run `git merge` targeting `main` under any circumstance.
- Do not propose `git merge main into <branch>` to "pick up the latest" — main is not the source of latest work, feature branches are.
- Do not run `git rebase main` for the same reason.
- Do not auto-resolve a merge with `--theirs` or `--ours` against main.

If the user asks "is this branch up to date" or "should I merge X", surface this rule before answering.

## Rule 2 — Branch from feature branches, not main

When the user asks for a new branch:

1. Identify the most-recent active HiC feature branch (typically `HiC-*` prefix).
2. Confirm with the user: "Branching from `<current-feature-branch>` to inherit recent HiC work, OK?"
3. Branch from there, not from `main`.

The exception: a user explicitly says "branch from main" or "clean cut". Otherwise default to the active feature branch.

## Rule 3 — NEVER auto-commit

Hard rule. Build → wait for the user to test → commit only after explicit approval.

- Stage files with `git add` when explicitly asked.
- Do not run `git commit` proactively — even when a "natural commit point" appears (end of task, end of plan step, after fixing a bug).
- Do not interpret "save", "wrap up", "finish", or "ship it" as commit authorization.
- Direct quotes that ARE commit authorization: "commit it", "commit these changes", "go ahead and commit", "make the commit".

If you think a commit is warranted, ASK: "Ready to commit `<short summary>`?" — do not act.

## Rule 4 — NEVER force-push to main, NEVER skip hooks

- `git push --force` targeting `main` is forbidden. Even with explicit user request, warn and confirm twice.
- `--no-verify` (skip hooks) and `--no-gpg-sign` are forbidden unless the user explicitly asks for them.
- If a pre-commit hook fails, fix the underlying issue. Do NOT amend or bypass.

## Rule 5 — Investigate destructive-action signals before acting

If the user types something that could trigger destructive git ops:

- "Reset everything" — ASK what state they want to reset to before running `git reset --hard`.
- "Get rid of these changes" — confirm whether they mean stash, discard, or remove a file.
- "Clean up the branch" — never assume `git clean -fd` is the answer.

A 10-second confirmation prevents lost work.

## Rule 6 — Working-tree state etiquette

- When asked for "git status" output, run `git status --short` (terse) unless they ask for full output.
- Use `--exclude-from=.git/info/exclude` semantics — files listed there are intentionally untracked by user directive.
- When proposing edits, briefly call out tracked vs untracked surface so the user knows what would show up in a future commit.

## Rule 7 — Sacred branches

These branches have load-bearing state. Treat them as read-only unless the user explicitly says otherwise:

- `main` — owner-controlled, do not touch.
- Any branch the user mentions as "in progress" or "active" — do not switch off it without confirmation.

If the user asks you to checkout away from a sacred branch, confirm: "Currently on `<branch>` with `<N>` modified files — switch away to `<target>`?"

## Surfacing this protocol

When Codex is about to do anything git-related, scan this file FIRST. If a planned action would violate any rule, raise it to the user before acting. Never silently work around these rules.
