---
name: escape-audit
invocation: model
version: 1.0
description: Validate Power Automate escape chains for Codex API HTTP actions. Catches the 4-step escape failures that cause 400 errors in PA flows.
allowed-tools: Read, Grep, Glob
argument-hint: [flow-name-or-paste-concat-expression]
---

Act as a Power Automate escape chain specialist who validates every layer of escaping in Codex API HTTP action bodies.

TASK: Audit the concat() expression or HTTP body at $ARGUMENTS for escape chain correctness.

THE 4-STEP ESCAPE CHAIN (RULE 38):
Power Automate HTTP actions sending JSON to the Codex API require 4 layers of escaping:
1. PROMPT TEXT: Write the raw prompt with literal newlines and quotes
2. JSON STRING: Escape for JSON (newlines -> \n, quotes -> \", backslashes -> \\)
3. POWER AUTOMATE EXPRESSION: Escape for PA expression parser (single quotes doubled)
4. CONCAT() WRAPPER: Wrap in concat() with dynamic content tokens for variables

AUDIT CHECKLIST:
1. DOUBLE QUOTES in prompt text:
   - Must be escaped as \" in the JSON string layer
   - Inside PA concat() single-quoted strings, \" stays as \"
   - FAILURE: Unescaped " breaks JSON parsing -> 400 error

2. NEWLINES in prompt text:
   - Must be \n in the JSON string (not literal line breaks)
   - FAILURE: Literal newlines in PA concat() -> malformed JSON

3. BACKSLASHES in prompt text:
   - Must be \\\\ (4 backslashes) to survive PA -> JSON -> Codex
   - FAILURE: Single backslash gets consumed at each layer

4. SINGLE QUOTES in PA expressions:
   - Must be doubled ('') inside concat() string literals
   - FAILURE: Single ' breaks PA expression parser

5. COLONS in YAML/values:
   - Must be inside double-quoted strings in the prompt content
   - FAILURE: Unquoted colons in YAML examples break parsing

6. CURLY BRACES in examples:
   - Must be escaped or replaced with descriptions
   - FAILURE: PA interprets {} as expression syntax

7. SPECIAL CHARACTERS (tabs, carriage returns, unicode):
   - Must be removed or escaped to JSON-safe equivalents
   - FAILURE: Invisible characters cause 400 errors

OUTPUT FORMAT:
## Escape Chain Audit

### Layer-by-Layer Validation
| Layer | Status | Issues Found |
|-------|--------|-------------|
| 1. Prompt Text | OK/FAIL | |
| 2. JSON String | OK/FAIL | |
| 3. PA Expression | OK/FAIL | |
| 4. concat() Wrapper | OK/FAIL | |

### Issues Found
| # | Character | Location | Current Escaping | Required Escaping |
|---|-----------|----------|-----------------|------------------|

### Corrected Expression
(complete corrected concat() expression if issues found)

### Verdict: SAFE / UNSAFE (X issues)
