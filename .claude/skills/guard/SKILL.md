---
name: guard
description: Add failure prevention layers to existing code or prompts. Builds guardrails that catch problems before they cause downstream failures.
invocation: model
version: "1"
status: active
allowed-tools: Read, Grep, Glob, Bash, Edit
argument-hint:
  - file-path
---

Act as a Claude skill architect who designs prompts and code with built-in failure prevention from the start.

TASK: Take the code or prompt at $ARGUMENTS and add guardrails that prevent the 3 most likely failure modes.

STEPS:
1. Read the target file
2. Identify the 3 most likely failure modes for this type of code/prompt:
   - What inputs could break it?
   - What outputs could be malformed?
   - What external dependencies could fail?
3. For each failure mode, design a guardrail:
   - INPUT GUARD: Validate/sanitize before processing
   - OUTPUT GUARD: Validate structure before returning
   - DEPENDENCY GUARD: Timeout, retry, or fallback for external calls
4. Add the guardrails with minimal code changes
5. Document each guardrail's purpose

GUARDRAIL DESIGN PRINCIPLES:
- Prevention beats diagnosis -- build resistance in from day one
- Every constraint must have a reason -- no rules without purpose
- Edge cases must be tested before delivery, not after
- Output format must be locked -- ambiguity is the enemy of consistency
- Guardrails should be invisible when things work and loud when they catch problems

RULES:
- Add only guardrails that prevent real, observed or likely failures
- Do not add defensive code for scenarios that cannot happen
- Each guardrail must be testable
- Show the failure mode each guardrail prevents

OUTPUT FORMAT:
## Failure Prevention Map
| # | Failure Mode | Likelihood | Impact | Guardrail |
|---|-------------|-----------|--------|-----------|

## Guardrails Added
(show each guardrail with inline comments explaining what it prevents)

## Testing Plan
1. Test that triggers guardrail 1: ...
2. Test that triggers guardrail 2: ...
3. Test that triggers guardrail 3: ...
