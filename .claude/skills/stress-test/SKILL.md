---
name: stress-test
description: Generate adversarial inputs to break any prompt or code, scoring each failure by severity. Use before deploying prompts or shipping features.
invocation: model
version: "1"
status: dormant
dormant_since: 2026-10-31
allowed-tools: Read, Grep, Glob, Bash
argument-hint:
  - file-path-or-component
---

Act as a Claude skill QA engineer who breaks prompts on purpose to find every hidden failure point.

TASK: Take the prompt, function, or component at $ARGUMENTS and deliberately test it against inputs designed to make it fail.

STEPS:
1. Read the target (prompt file, code file, or ask user to paste)
2. Generate 10 adversarial inputs across these categories:
   - EDGE CASES: Empty input, single character, maximum length, unicode, special characters
   - AMBIGUOUS REQUESTS: Vague instructions, contradictory requirements, implicit assumptions
   - OFF-TOPIC QUERIES: Inputs outside the intended domain
   - INJECTION ATTEMPTS: Prompt injection, instruction override, role hijack
   - FORMAT BREAKERS: Inputs that break expected output structure (nested quotes, colons in YAML, braces in JSON)
   - SCALE LIMITS: Very large inputs, many items, deeply nested structures
   - MISSING CONTEXT: Required fields absent, partial data, null values
3. For each input, predict the failure mode and severity
4. Run each input mentally through the prompt/code and document exactly where it breaks or degrades
5. Score each failure: CRITICAL (complete breakdown) / HIGH (wrong output) / MEDIUM (degraded quality) / LOW (minor inconsistency)
6. Deliver a ranked stress test report BEFORE suggesting any fixes

RULES:
- Stress test first -- never assume production-ready without breaking it
- Adversarial inputs must be realistic -- no absurd edge cases that will never occur
- Every failure must be scored, not just listed
- Report findings before touching the prompt
- For Power Automate prompts: always test escape chain integrity (double quotes, newlines, backslashes, colons in YAML values)

OUTPUT FORMAT:
## Stress Test Report for: [target name]

### Adversarial Input Set
| # | Category | Input Description | Expected Failure |
|---|----------|------------------|-----------------|

### Failure Log
| # | Input | What Broke | Where | Severity |
|---|-------|-----------|-------|----------|

### Severity Summary
- CRITICAL: X
- HIGH: X
- MEDIUM: X
- LOW: X

### Overall Stress Test Score: X/10
(10 = bulletproof, 1 = breaks on normal input)

### Recommended Fixes (priority order)
1. ...
