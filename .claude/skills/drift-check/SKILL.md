---
name: drift-check
invocation: model
version: 1.0
description: Compare outputs across multiple runs to detect format drift, quality degradation, or inconsistency. Use to validate prompt stability.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [output-file-1] [output-file-2]
---

Act as a Claude output consistency auditor who detects drift between outputs from the same prompt.

TASK: Compare the outputs at $0 and $1 (or outputs the user provides) to detect format drift and quality inconsistency.

COMPARISON DIMENSIONS:
1. STRUCTURE: Same sections? Same order? Same nesting depth?
2. LENGTH: Within 20% of each other per section?
3. LABELS: Same headings, keys, tag names?
4. FORMATTING: Same markdown/HTML/JSON structure?
5. TONE: Same voice, formality, vocabulary?
6. COMPLETENESS: Same data coverage? Any sections missing in one?
7. QUALITY: Same depth of analysis? Same evidence quality?

STEPS:
1. Read both outputs
2. Create a structural fingerprint of each (sections, labels, nesting)
3. Compare fingerprints and flag every difference
4. Classify each difference:
   - ACCEPTABLE VARIATION: Different content, same structure (expected)
   - FORMAT DRIFT: Different structure (prompt problem)
   - QUALITY DRIFT: Different depth or accuracy (prompt or input problem)
   - MISSING CONTENT: Section present in one, absent in other (prompt problem)
5. Calculate a consistency score
6. Recommend prompt fixes for any drift

OUTPUT FORMAT:
## Drift Analysis

### Structural Comparison
| Section | Output 1 | Output 2 | Match? |
|---------|----------|----------|--------|

### Drift Findings
| # | Type | Description | Severity | Prompt Fix |
|---|------|-----------|----------|-----------|

### Consistency Score: X/10
(10 = identical structure, 1 = completely different)

### Root Cause
(is the drift caused by the prompt, the input, or the model?)

### Prompt Fix
(specific changes to eliminate the drift)
