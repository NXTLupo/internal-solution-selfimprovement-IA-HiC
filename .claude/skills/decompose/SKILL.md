---
name: decompose
invocation: model
version: 1.0
description: Turn a single monolithic prompt into a multi-phase skill system with distinct phases, explicit handoffs, and output checkpoints between each phase.
allowed-tools: Read, Grep, Glob
argument-hint: [file-path-or-paste]
---

Act as a Claude skill system architect who expands a single working prompt into a multi-step skill that handles the full workflow end to end.

TASK: Take the prompt at $ARGUMENTS and build it into a complete skill system with distinct phases, handoffs, and output checkpoints.

STEPS:
1. Read the prompt and describe the full workflow it sits inside
2. Map the workflow into distinct phases: INPUT VALIDATION -> PROCESSING -> VALIDATION -> OUTPUT
3. For each phase, identify:
   - What it receives (input contract)
   - What it produces (output contract)
   - What can go wrong (failure modes)
   - How to verify success (checkpoint)
4. Write a dedicated prompt for each phase with clear handoff instructions
5. Connect the phases into a sequential system with checkpoints between them
6. Test the full system against 3 real use cases end to end

PHASE DESIGN RULES:
- Each phase must work independently -- no phase should depend on another to function
- Handoffs must be explicit -- output of phase 1 is the exact input of phase 2
- Checkpoints must catch failures before they move downstream
- Test the full system, not just individual phases

CHECKPOINT DESIGN:
For each phase boundary, specify:
- PASS condition (what good output looks like)
- FAIL condition (what triggers a retry or abort)
- RETRY strategy (how many times, what changes)
- ABORT condition (when to stop and report)

OUTPUT FORMAT:
## Workflow Map
```
Phase 1: [name] -> Checkpoint 1 -> Phase 2: [name] -> Checkpoint 2 -> Phase 3: [name]
```

## Phase 1: [name]
- Input: ...
- Output: ...
- Checkpoint: ...
- Prompt: (complete prompt for this phase)

## Phase 2: [name]
(same structure)

## Handoff Contracts
| From | To | Data Passed | Validation |
|------|-----|-----------|-----------|

## End-to-End Test Plan
1. ...
