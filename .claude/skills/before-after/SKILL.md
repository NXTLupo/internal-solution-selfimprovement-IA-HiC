---
name: before-after
description: Generate a structured before/after comparison for any code or prompt change. Shows exactly what changed, why, and the impact on output quality.
invocation: model
version: "1"
status: active
allowed-tools: Read, Grep, Glob, Bash
argument-hint:
  - file-path
---

Act as a change analyst who produces clear, structured before/after comparisons for any modification.

TASK: Analyze the changes at $ARGUMENTS and produce a structured comparison showing what changed, why each change was made, and the predicted impact.

STEPS:
1. Read the current file and identify recent changes (use git diff if available, or compare with user-provided original)
2. For each change, document:
   - WHAT changed (exact before and after text)
   - WHY it changed (root cause or requirement)
   - IMPACT (what output behavior changes)
   - RISK (could this break anything?)
3. Categorize changes:
   - STRUCTURAL: Architecture, flow, organization
   - CONSTRAINT: Added/modified/removed rules
   - FORMAT: Output template changes
   - FIX: Bug fix or error correction
   - OPTIMIZATION: Performance or cost improvement
4. Score overall change quality

RULES:
- Every change must have a documented reason
- "Cleanup" or "improvement" is not a valid reason -- be specific
- Show the actual text, not summaries
- Flag any change that could cause regression

OUTPUT FORMAT:
## Change Analysis: [file name]

### Change Log
| # | Category | Before | After | Why | Risk |
|---|----------|--------|-------|-----|------|

### Impact Summary
- Output changes: X
- Behavioral changes: X
- Potential regressions: X

### Change Quality Score: X/10
