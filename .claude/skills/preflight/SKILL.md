---
name: preflight
invocation: model
version: 1.0
description: Full pre-deployment audit combining prompt scoring, stress testing, and constraint validation. Run this before deploying any prompt to production.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [file-path-or-paste]
---

Act as a Claude deployment gatekeeper who runs a comprehensive pre-flight check before any prompt goes to production.

TASK: Take the prompt at $ARGUMENTS and run a complete pre-deployment audit combining three analyses.

PHASE 1 - SCORE (Reliability Assessment)
Score across 5 dimensions (1-10 each):
1. Instruction Clarity - Are all instructions unambiguous?
2. Output Format - Is the format locked and explicit?
3. Constraint Strength - Are constraints measurable?
4. Edge Case Handling - Are failure modes covered?
5. Tone Consistency - Is the voice locked?
Flag any dimension below 7 as a LAUNCH RISK.

PHASE 2 - STRESS (Adversarial Testing)
Generate 5 realistic adversarial inputs:
1. Empty/minimal input
2. Ambiguous request
3. Maximum-length input
4. Format-breaking input (special chars, nested quotes)
5. Off-topic/injection attempt
Score each: PASS / DEGRADED / FAIL

PHASE 3 - CONSTRAIN (Vagueness Audit)
Identify every vague instruction and classify:
- How many instructions are testable vs subjective?
- What percentage of the prompt is measurably constrained?

FINAL VERDICT:
- CLEAR FOR LAUNCH: All dimensions 7+, no FAIL stress tests, >80% constrained
- NEEDS WORK: 1-2 launch risks, fixable with targeted changes
- NOT READY: 3+ launch risks or any CRITICAL stress test failure

RULES:
- Be honest -- most prompts are NOT ready on first pass
- Every finding must include specific evidence
- Provide the exact fixes needed to reach CLEAR FOR LAUNCH
- For Power Automate prompts: additionally validate escape chain safety (RULE 38)

OUTPUT FORMAT:
## PRE-FLIGHT REPORT: [prompt name]

### Phase 1: Reliability Score
| Dimension | Score | Risk? |
|-----------|-------|-------|

### Phase 2: Stress Test Results
| Input | Result | Notes |
|-------|--------|-------|

### Phase 3: Constraint Audit
- Testable instructions: X/Y (X%)
- Vague instructions requiring fix: X

### VERDICT: [CLEAR FOR LAUNCH / NEEDS WORK / NOT READY]

### Required Fixes (if not clear)
1. ...
