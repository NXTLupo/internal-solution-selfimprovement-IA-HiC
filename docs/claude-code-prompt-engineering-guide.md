# Claude Code Prompt Engineering Commands: Usage Guide

This guide shows how to use the 15 custom prompt engineering skills in real development workflows. Each example shows the exact command you type, what it does, and when to use it in your workflow.

---

## Quick Reference

| Command | One-liner | When to Use |
|---------|-----------|-------------|
| `/diagnose-prompt` | Find and fix failure patterns | Prompt producing bad output |
| `/stress-test` | Break it on purpose | Before deploying anything |
| `/constrain` | Kill vague language | Prompt has "be concise" type instructions |
| `/lock-format` | Stop output drift | Output structure changes between runs |
| `/score-prompt` | 5-dimension reliability score | Final check before production |
| `/trim-prompt` | Cut every weak word | After writing, before shipping |
| `/preflight` | Full pre-deploy audit | Gate before any production prompt |
| `/decompose` | Split into phases | Single prompt doing too much |
| `/self-review` | Check my own work | After Claude makes changes |
| `/failure-log` | Log and learn from errors | Something just broke |
| `/escape-audit` | Validate PA escape chains | Power Automate HTTP actions |
| `/before-after` | Structured change comparison | After modifying a prompt |
| `/guard` | Add failure prevention | Making code more resilient |
| `/drift-check` | Compare outputs for consistency | Outputs vary between runs |
| `/qa-gate` | Validate output before delivery | Before saving/sending AI output |

---

## Workflow 1: Writing a New System Prompt

You are building a new system prompt for a service. Use these commands in sequence.

### Step 1: Write the prompt, then constrain it

```
Write a system prompt for the Video Transcriber that takes a YouTube URL
and returns a structured transcript with timestamps, speaker labels, and
a summary. Target output: JSON with sections array.
```

After Claude writes the prompt:

```
/constrain
```

This audits every vague instruction and replaces it with measurable rules.

**What you see:**

```
## Vague Instruction Audit
| # | Original Instruction          | Problem              | Rewritten Constraint                    |
|---|-------------------------------|----------------------|-----------------------------------------|
| 1 | "provide a good summary"      | Subjective quality   | "write a 2-3 sentence summary (40-75 words)" |
| 2 | "include relevant timestamps"  | What is relevant?    | "include a timestamp every 30 seconds minimum" |
| 3 | "try to identify speakers"     | Qualifier weakens    | "label every speaker as Speaker_1, Speaker_2, etc." |
```

### Step 2: Lock the output format

```
/lock-format
```

This designs an explicit output template so JSON structure never drifts between runs.

### Step 3: Score before deploying

```
/score-prompt
```

**What you see:**

```
## Prompt Reliability Scorecard

| Dimension            | Score | Evidence                              | Launch Risk? |
|----------------------|-------|---------------------------------------|-------------|
| Instruction Clarity  | 9/10  | All instructions use exact counts     | NO          |
| Output Format        | 8/10  | JSON schema provided with types       | NO          |
| Constraint Strength  | 7/10  | Missing: max transcript length limit  | NO          |
| Edge Case Handling   | 5/10  | No handling for: private videos, age-restricted, live streams | YES |
| Tone Consistency     | 8/10  | Locked to neutral technical voice     | NO          |

## Overall Reliability Score: 7.4/10
## Launch Risks: Edge Case Handling (5/10) -- add fallback for inaccessible videos
```

### Step 4: Fix the launch risk and run preflight

```
Add error handling for private videos, age-restricted content, and live
streams to the system prompt. Return a structured error JSON instead of
failing silently.
```

Then:

```
/preflight
```

This runs the combined score + stress + constrain check. If the verdict is CLEAR FOR LAUNCH, deploy it.

---

## Workflow 2: Debugging a Failed Power Automate Flow

Your PA flow just returned a 400 error from the Claude API.

### Step 1: Log the failure

```
/failure-log The BATCH ENGINE flow returned 400: "This model does not
support assistant message prefill." on HTTP Pass1 when using
claude-sonnet-4-6 with the Do Until continuation loop.
```

**What you see:**

```
## Failure Log Entry

| Field         | Value                                                    |
|---------------|----------------------------------------------------------|
| Date          | 2026-03-23                                               |
| Service       | BATCH ENGINE - Journey Map Synthesis (Power Automate)    |
| Category      | MODEL_ERROR                                              |
| Severity      | CRITICAL                                                 |
| Input Trigger | Do Until loop iteration 2+ sends assistant message prefill |
| Expected      | Claude continues generation from previous chunk          |
| Actual        | 400 error: assistant prefill not supported               |
| Root Cause    | claude-sonnet-4-6 does not support assistant prefill     |

## Prevention Constraint
Use claude-opus-4-6 (not Sonnet) for any flow that uses Do Until
continuation with assistant message prefill. Add a comment in the HTTP
action: "MUST USE OPUS -- Sonnet does not support prefill continuation."

Add to: Optimization recipe doc, MEMORY.md, HTTP Pass1/Pass2 action notes
```

### Step 2: Audit the escape chain while you are in the flow

```
/escape-audit Paste the concat() expression from the HTTP Pass1 body
```

Then paste the expression. The audit validates all 4 escape layers and flags any issues.

---

## Workflow 3: Improving an Existing Prompt

The Journey Mapper Pass 2 system prompt is producing inconsistent HTML. Sometimes it has all 6 sections, sometimes it skips the Quotes section.

### Step 1: Diagnose

```
/diagnose-prompt docs/copilot-journey-mapper-optimization-recipe.md
```

Focus on the Pass 2 system prompt (lines 335-456). The diagnosis maps every failure pattern:

```
## Failure Diagnosis
| # | Pattern          | Location in Prompt        | Severity | Root Cause                               |
|---|------------------|---------------------------|----------|------------------------------------------|
| 1 | MISSING CONTENT  | Section 3 (Quotes)        | 3        | No REQUIRED keyword -- model treats as optional |
| 2 | FORMAT DRIFT     | Stage card structure       | 2        | "2-3 sentences" allows variance           |
| 3 | WEAK CONSTRAINT  | "2-3 most impactful quotes"| 2        | "most impactful" is subjective            |
```

### Step 2: Check what changed after fixing

```
/before-after docs/copilot-journey-mapper-optimization-recipe.md
```

Shows the exact before/after for every modification, with risk scoring.

### Step 3: Stress test the improved prompt

```
/stress-test The updated Pass 2 system prompt for journey map HTML generation
```

Paste the prompt. Gets tested against:
- Empty JSON input (no stages extracted)
- Single-stage journey (minimal data)
- 15-stage journey (maximum complexity)
- JSON with no quotes array (missing data)
- JSON with special characters in stage names

### Step 4: Trim any remaining weak language

```
/trim-prompt
```

Cuts qualifiers like "when appropriate" and "if needed" that crept into the prompt.

---

## Workflow 4: Building a Multi-Phase System

You want to add a new capability to the IA Suite that requires multiple AI calls.

### Step 1: Decompose the monolithic approach

```
/decompose I want to build a competitive analysis generator that takes a
company URL, scrapes key pages, extracts positioning data, compares
against 3 competitors, and produces a visual HTML report with charts.
```

**What you see:**

```
## Workflow Map
Phase 1: Scrape & Extract -> Checkpoint 1 -> Phase 2: Competitive Analysis -> Checkpoint 2 -> Phase 3: HTML Report

## Phase 1: Scrape & Extract
- Input: company URL + 3 competitor URLs
- Output: JSON with { company: {name, positioning, features, pricing}, competitors: [...] }
- Checkpoint: JSON valid? All 4 companies have data? No empty fields?
- Failure: If scrape fails for a URL, return partial data with missing flag

## Phase 2: Competitive Analysis
- Input: Phase 1 JSON
- Output: JSON with { strengths: [], weaknesses: [], opportunities: [], differentiators: [] }
- Checkpoint: Analysis references specific data from Phase 1? No hallucinated claims?

## Phase 3: HTML Report
- Input: Phase 1 + Phase 2 JSON
- Output: Complete HTML document with comparison tables, radar charts, positioning map
- Checkpoint: HTML valid? All sections present? Charts render?
```

### Step 2: Guard each phase

```
/guard The Phase 1 scraping function -- add guardrails for timeout,
empty responses, and rate limiting
```

### Step 3: Lock the output format for each phase

```
/lock-format The Phase 2 competitive analysis JSON output
```

### Step 4: Full preflight before deploying

```
/preflight The complete 3-phase competitive analysis system prompts
```

---

## Workflow 5: Reviewing Claude's Own Work

After Claude makes code changes, verify quality before accepting.

### After any significant code change:

```
/self-review The changes just made to mcp-services/agent/app.py
```

**What you see:**

```
## Self-Review: Agent tool registration changes

| Check             | Pass/Fail | Evidence                                      |
|-------------------|-----------|-----------------------------------------------|
| Scope Match       | PASS      | All changes match the requested tool additions |
| Over-Engineering  | FAIL      | Added a retry wrapper that wasn't requested    |
| Correctness       | PASS      | Logic traces correctly                         |
| Regression Risk   | PASS      | No existing interfaces changed                 |
| Simplicity        | FAIL      | Helper function created for one-time use       |

## Verdict: FIX FIRST
## Issues Found: 2
## Fixes Required:
1. Remove the retry wrapper -- use the existing pattern from line 142
2. Inline the helper function -- it is only called once
```

---

## Workflow 6: Validating AI Output Before Delivery

The journey mapper just generated an HTML file. Validate before saving to SharePoint.

```
/qa-gate journey_maps/JM-20260323-abc123.html html
```

**What you see:**

```
## QA Gate Report: JM-20260323-abc123.html

### Validation Results
| Check                  | Status | Evidence                                  |
|------------------------|--------|-------------------------------------------|
| Structural Integrity   | PASS   | Opens with <!DOCTYPE html>, closes with </html> |
| Completeness           | FAIL   | Section 6 (Data Provenance Footer) missing |
| Data Quality           | PASS   | No placeholder text, all quotes have citations |
| Accessibility          | PASS   | Skip link present, contrast ratios met    |
| Escape Safety          | PASS   | No unescaped characters                   |

### VERDICT: FAIL (1 issue)
### Gate: BLOCKED -- fix missing Data Provenance Footer before saving
```

---

## Workflow 7: Comparing Outputs for Consistency

You ran the same document through the journey mapper twice and want to check for drift.

```
/drift-check journey_maps/JM-run1.html journey_maps/JM-run2.html
```

Shows whether the structure, sections, labels, and quality are consistent between runs. If drift is detected, recommends specific prompt fixes.

---

## Command Chaining Patterns

### The Full Production Pipeline (new prompt)
```
1. Write the prompt
2. /constrain          -- kill vague language
3. /lock-format        -- lock output structure
4. /trim-prompt        -- strip weak words
5. /stress-test        -- break it on purpose
6. /score-prompt       -- get reliability score
7. /preflight          -- final gate (combines 2+5+6)
8. Deploy
```

### The Fix Pipeline (broken prompt)
```
1. /failure-log        -- capture what broke
2. /diagnose-prompt    -- find root causes
3. Fix the issues
4. /before-after       -- verify changes are targeted
5. /stress-test        -- confirm fix works under pressure
6. /preflight          -- final gate
7. Deploy
```

### The Monitoring Pipeline (production prompt)
```
1. /drift-check        -- compare recent outputs
2. /qa-gate            -- validate latest output
3. /score-prompt       -- re-score if drift detected
4. /diagnose-prompt    -- if score dropped, find why
5. Fix and redeploy
```

### The Power Automate Pipeline (PA-specific)
```
1. Write the prompt
2. /constrain          -- measurable rules only
3. /escape-audit       -- validate 4-layer escape chain
4. /stress-test        -- include special char inputs
5. /preflight          -- with PA-specific checks
6. Deploy to flow
7. /failure-log        -- if flow fails, capture immediately
```

---

## Tips

- **Run `/preflight` before every production deployment.** It takes 30 seconds and catches the issues that cost hours to debug in production.
- **Use `/failure-log` immediately when something breaks.** The details are freshest right after the failure. The constraint it generates prevents the same error from recurring.
- **Chain `/constrain` then `/trim-prompt` on any prompt you inherit.** Most prompts have both vague instructions AND weak qualifiers. Fix both.
- **Run `/self-review` after large code changes.** It catches scope creep and over-engineering that you might miss in the diff.
- **Use `/escape-audit` on every Power Automate HTTP action body.** The 4-layer escape chain is the single most common failure point in PA flows calling Claude.
- **Run `/drift-check` weekly on critical prompts.** Model updates can change behavior even when the prompt hasn't changed. Catch drift early.
- **Use `/decompose` when a single prompt exceeds 2000 words.** Long prompts have more failure modes. Breaking into phases with checkpoints makes each phase more reliable.
