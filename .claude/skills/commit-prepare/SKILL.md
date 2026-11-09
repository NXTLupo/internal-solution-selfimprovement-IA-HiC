---
name: commit-prepare
description: Stage changes and produce a pre-commit report (slop scan of staged HiC files, rebuild reminder, diff stat) without committing. Use before asking the owner to approve a commit; the commit itself waits for explicit approval.
invocation: human
disable-model-invocation: true
version: "1"
status: active
---

# Commit Prepare

## Scope

Stage changes for commit and emit a structured pre-commit report. Runs the slop scanner against staged HiC files, reminds the user if HiC files were touched (Docker rebuild needed), and outputs the diff stat — but does NOT commit. The user reviews and either gives the green light or asks for fixes. Encodes the "build → test → commit, only after explicit approval" rule end-to-end.

You are running the user's commit-prep workflow. This skill is user-invocable only — never self-trigger.

## Hard Rules

1. **Never run `git commit` or `git push`.** This skill stages and reports, nothing else.
2. **Never override the commit-approval hook.** Do not set `CLAUDE_COMMIT_OK=1`, do not include `COMMIT_APPROVED` in any string you write.
3. **Never merge to main or rebase onto main.** Block this internally even if asked.

## Inputs

The user invokes with optional arguments:
- `--files <paths>` — explicit file list to stage
- `--scope <pattern>` — glob to limit staging (e.g., `humans-in-control-research/services/**`)
- No args — auto-stage modified + untracked working-tree files, EXCLUDING wiki content (`hic-workspace/wiki/`), embeddings, generated dist, and per-run session JSON.

## Sequence

### 1. Branch sanity check
```bash
git branch --show-current
git status --short
```
If current branch is `main`, STOP and tell the user — you cannot commit on main. Suggest creating a feature branch off the latest `HiC-*`.

### 2. Stage files
- With `--files`: `git add <files>`
- With `--scope`: `git add <scope>` (expanded)
- No args: `git add` only the files the user has clearly been editing this session. Be conservative — never `git add -A` or `git add .`.

Exclude by default:
- `humans-in-control-research/hic-workspace/wiki/articles/`
- `humans-in-control-research/hic-workspace/wiki/transcripts/`
- `humans-in-control-research/hic-workspace/wiki/.manifest.json`
- `humans-in-control-research/hic-workspace/sessions/*/`
- Any `dist/`, `node_modules/`, `.venv/`, `__pycache__/`

### 3. Diff stat + verbose summary
```bash
git diff --cached --stat
git diff --cached --shortstat
```
Capture file count + line counts.

### 4. Re-run the slop scanner against staged code
For every staged file matching the HiC code paths (extensions: .ts, .tsx, .js, .jsx, .py, .json, .yml, .html, .css; under `humans-in-control-research/` except wiki/plans/design-desk), feed the file content through the same checks the `precheck_slop.py` hook performs:

- 27 high-severity banned phrases (see SLOP_HIGH in `humans-in-control-research/hooks/validate_output.py`)
- 12 meta-narration regexes (subset of META_NARRATION_PATTERNS in `services/slidePostProcessor.ts:149`)
- QA-annotation tokens: `[needs baseline]`, `evidence gap`, `[tbd]`, `baseline tbd`

If any violations are found, STOP and report them. The user must clean those up before committing.

### 5. HiC rebuild reminder
If any staged file is under `humans-in-control-research/` AND matches `.tsx|.ts|.css|.html|.json|.jsx`:
> Staged files include HiC frontend code. Before claiming this works in the browser:
>   `docker compose -f docker-compose-all.yml up -d --build research-generator`
> If you've already done this, ignore.

If any staged file matches `humans-in-control-research/proxy/app.py`:
> Staged files include the HiC proxy. Restart it:
>   `docker compose -f docker-compose-all.yml up -d --build research-proxy`

### 6. MCP / agent restart reminder
If any staged file matches `mcp-services/.+/app\.py$`:
> Staged files include the agent or an MCP wrapper. After commit (whenever that happens), restart:
>   `docker compose -f docker-compose-all.yml restart agent <wrapper-names>`

### 7. Suggested commit message
Draft a commit message following the repo convention:
- Prefix: `feat(hic):` / `fix(hic):` / `chore(hic):` for HiC work; `feat(<service>):` / `fix(<service>):` otherwise
- Subject: imperative, <= 72 chars, no period
- Body (optional): one blank line then prose, with each behavior change as a separate line
- Trailers: standard sign-offs, NO `Co-Authored-By` unless the user has explicitly asked for it

Output the message inside a fenced block so the user can copy or amend.

### 8. Output the report

```
COMMIT PREPARE — <branch>
========================================
Staged: N files, +X / -Y lines

Files (top 20 by churn):
  humans-in-control-research/services/aiRouter.ts        +42 -11
  ...

HiC frontend touched: yes/no — rebuild required if not already done
HiC proxy touched: yes/no — restart required
MCP/agent touched: yes/no — restart required

Slop scan: PASS | <N violations>
  - file:line — phrase
  - ...

Suggested message:
  feat(hic): one-line subject

  optional body

Next step: review the diff, test, then run `git commit` yourself when ready.
```

## What this skill does NOT do

- Does not commit
- Does not push
- Does not modify files
- Does not unstage (use `git restore --staged` yourself)
- Does not auto-amend
