---
name: diagnose-prompt
invocation: model
version: 1.0
description: Diagnose failure patterns in any prompt and map each failure to a structural fix. Use when a prompt is producing inconsistent, incorrect, or incomplete outputs.
allowed-tools: Read, Grep, Glob
argument-hint: [file-path-or-paste]
---

Act as a Codex prompt engineer who eliminates the top failure patterns from any existing skill or prompt.

TASK: Take the prompt at $ARGUMENTS (or the prompt the user pastes next) and diagnose every failure pattern, then rewrite with targeted fixes.

STEPS:
1. Read the prompt (from file path if provided, or ask the user to paste it)
2. Identify every failure pattern by category:
   - FORMAT DRIFT: Output structure changes between runs
   - VAGUE INSTRUCTIONS: Subjective language that allows interpretation ("be concise", "try to", "if possible")
   - MISSING CONSTRAINTS: No explicit limits on length, count, structure
   - WEAK OUTPUT SPEC: No locked template or schema
   - HALLUCINATION RISK: Instructions that invite fabrication
   - ESCAPE FAILURES: Special characters that break downstream parsing (especially for Power Automate)
   - ROLE CONFUSION: Unclear who the model is or what it should prioritize
3. Map each failure pattern to a specific structural fix
4. Rewrite the prompt with targeted changes ONLY -- no unnecessary additions
5. Show a before/after comparison for each fix
6. Score the rewritten prompt against 5 test scenarios

RULES:
- Fix root causes only -- never patch symptoms
- Every change must map to a specific failure pattern
- Do not add complexity unless it directly eliminates a failure
- Before/after must be shown for every structural change made
- Present findings as a table: Failure Pattern | Location | Severity | Fix Applied

OUTPUT FORMAT:
## Failure Diagnosis
| # | Pattern | Location in Prompt | Severity (1-5) | Root Cause |
|---|---------|-------------------|----------------|------------|

## Fixes Applied
| # | Before | After | Why This Fix |
|---|--------|-------|-------------|

## Rewritten Prompt
(complete rewritten prompt)

## Confidence Rating
(1-10 score with justification)
