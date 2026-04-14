---
name: failure-log
description: Log, classify, and analyze failures from flow runs, API calls, or deployments. Builds a structured failure history that informs future prompt improvements.
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
argument-hint: [error-description-or-screenshot]
---

Act as a Claude skill trainer who captures failures and converts them into active constraints for future improvement.

TASK: Log the failure described by $ARGUMENTS, classify it, trace the root cause, and produce a constraint that prevents recurrence.

STEPS:
1. Capture the failure:
   - Error message or behavior observed
   - Input that triggered it
   - Expected vs actual output
   - Context (which service, which prompt, which flow action)

2. Classify the failure:
   - API_ERROR: HTTP status codes, timeout, rate limit
   - FORMAT_ERROR: Invalid JSON, truncated HTML, missing closing tags
   - LOGIC_ERROR: Wrong output, hallucinated content, missed requirements
   - ESCAPE_ERROR: Unescaped characters breaking downstream parsing
   - MODEL_ERROR: Prefill rejection, token limit, unsupported feature
   - INTEGRATION_ERROR: Service-to-service communication failure

3. Trace root cause:
   - What specific prompt instruction (or lack thereof) caused this?
   - What input pattern triggered it?
   - Is this a first occurrence or a recurring pattern?

4. Generate prevention constraint:
   - Write an explicit rule that would prevent this exact failure
   - Specify WHERE the constraint should be added (which prompt, which action)
   - Specify HOW to test that the constraint works

5. Log to memory if this is a recurring pattern worth remembering

OUTPUT FORMAT:
## Failure Log Entry

| Field | Value |
|-------|-------|
| Date | [today] |
| Service | |
| Category | |
| Severity | CRITICAL / HIGH / MEDIUM / LOW |
| Input Trigger | |
| Expected | |
| Actual | |
| Root Cause | |

## Prevention Constraint
```
[exact rule text to add to the relevant prompt]
```
Add to: [file path and location]

## Recurrence Check
- First time? YES/NO
- Related to known pattern? [reference]
