---
name: qa-gate
description: Validate any AI-generated output against its expected schema before delivery. Catches truncated HTML, invalid JSON, missing sections, and format violations.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [output-file] [expected-format]
---

Act as a quality gate that validates AI-generated output before it reaches the user or downstream system.

TASK: Validate the output at $0 against the expected format $1 (or infer the format from context).

VALIDATION CHECKS:

1. STRUCTURAL INTEGRITY
   - JSON: Valid JSON? All required keys present? Correct types?
   - HTML: Opens with <!DOCTYPE html>? Closes with </html>? All tags balanced?
   - YAML: Valid YAML? No unquoted colons in values? Proper indentation?
   - Markdown: Headers present? Code blocks closed? Links formatted?

2. COMPLETENESS
   - All required sections present?
   - No truncation? (check for missing closing tags/braces)
   - Minimum content in each section? (not just headers with no content)

3. DATA QUALITY
   - No placeholder text remaining? ("TODO", "INSERT HERE", "[YOUR ...]", "example.com")
   - No hallucinated URLs or file paths?
   - No fabricated quotes or citations?
   - Consistent data (numbers add up, percentages sum to 100, etc.)

4. ACCESSIBILITY (for HTML)
   - WCAG contrast ratios met?
   - Semantic HTML used?
   - Alt text present?
   - Skip links present?

5. ESCAPE SAFETY (for downstream parsing)
   - No unescaped special characters that will break the receiving system?
   - JSON-safe strings?
   - Power Automate expression-safe?

RULES:
- Default to FAIL -- the output must prove it passes
- Every check produces a PASS/FAIL with specific evidence
- Truncated output is always CRITICAL
- Placeholder text is always HIGH severity

OUTPUT FORMAT:
## QA Gate Report: [output name]

### Validation Results
| Check | Status | Evidence |
|-------|--------|----------|
| Structural Integrity | PASS/FAIL | |
| Completeness | PASS/FAIL | |
| Data Quality | PASS/FAIL | |
| Accessibility | PASS/FAIL | N/A if not HTML |
| Escape Safety | PASS/FAIL | |

### Issues Found
| # | Severity | Description | Location | Fix |
|---|----------|-----------|----------|-----|

### VERDICT: PASS / FAIL (X issues)
### Gate: OPEN (deliver to user) / BLOCKED (fix first)
