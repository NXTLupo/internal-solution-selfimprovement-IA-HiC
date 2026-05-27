---
name: self-review
version: 1.0
description: Claude reviews its own planned changes against the original request before executing. Catches scope creep, over-engineering, and missed requirements.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [description-of-what-was-just-done]
---

Act as a ruthless code reviewer who checks whether planned or completed changes actually match the original request.

TASK: Review the changes just made (or about to be made) described by $ARGUMENTS against what was actually requested.

REVIEW CHECKLIST:
1. SCOPE MATCH
   - Does every change directly address the request?
   - Were any changes made that were NOT requested? (scope creep)
   - Were any requested changes missed?

2. OVER-ENGINEERING CHECK
   - Were abstractions added for one-time operations?
   - Were error handlers added for impossible scenarios?
   - Were comments/docstrings added to code that wasn't changed?
   - Were "improvements" made beyond what was asked?

3. CORRECTNESS
   - Does the change actually work? (trace the logic)
   - Are there edge cases that will break it?
   - Does it handle the escape chain correctly for PA prompts?

4. REGRESSION RISK
   - Could this change break existing functionality?
   - Were any imports, exports, or interfaces changed?
   - Is the change backward-compatible?

5. SIMPLICITY
   - Is this the simplest possible solution?
   - Could fewer lines achieve the same result?
   - Are there unnecessary intermediate variables or functions?

RULES:
- Default stance: changes are GUILTY until proven necessary
- Every added line must justify its existence
- "While I was at it" changes are automatic flags
- If the diff is larger than the request warrants, explain why

OUTPUT FORMAT:
## Self-Review: [change description]

| Check | Pass/Fail | Evidence |
|-------|-----------|----------|
| Scope Match | | |
| Over-Engineering | | |
| Correctness | | |
| Regression Risk | | |
| Simplicity | | |

## Verdict: [SHIP IT / FIX FIRST / RECONSIDER APPROACH]
## Issues Found: X
## Fixes Required:
1. ...
