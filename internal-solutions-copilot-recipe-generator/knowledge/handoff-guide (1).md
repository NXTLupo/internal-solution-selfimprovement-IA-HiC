# AI UX/UI Analyst Agent — Developer Handoff Guide

**Project:** NXT Humans AI UX/UI Analyst Agent
**Owner:** Jonathan Lupo, NXT Humans
**Platform:** Microsoft Copilot Studio + Power Automate Cloud Flows + Anthropic Claude API
**Date:** March 9, 2026
**Status:** Functional with active enhancements in progress

---

## 1. WHAT THIS AGENT DOES

The AI UX/UI Analyst is a Copilot Studio agent deployed in Microsoft Teams that accepts website/app screenshots (PNG/JPG), analyzes them against a comprehensive UX evaluation framework using Claude's vision API, and produces interactive HTML heuristic reports. The agent's primary lens is AI experience quality — conversational AI patterns, agentic commerce readiness, social commerce integration — with traditional Nielsen heuristics and WCAG accessibility as supporting dimensions.

**End-to-end flow:**
1. User places 5-20 screenshots in SharePoint Research Documents folder
2. User initiates analysis via Teams chat with the Copilot Studio agent
3. Agent collects configuration (scope, audience, platform, goals, brief)
4. Agent triggers Power Automate flow that retrieves images, analyzes each via Claude vision, synthesizes findings, generates HTML report
5. Report saves to SharePoint, notification sent via Teams and email

---

## 2. ENVIRONMENT AND ACCESS

| Resource | Location |
|---|---|
| Copilot Studio Agent | "AI UX/UI Analyst" in Jonathan Lupo's Environment |
| Power Automate Flow | "Retrieve and Analyze Screenshots" in AI UX Analyst Solution |
| SharePoint Site | https://nxthumans.sharepoint.com/sites/Research |
| Screenshots Input | /Shared Documents/Research Documents/ |
| JSON Output | /Shared Documents/JSON Output/ |
| HTML Reports | /Shared Documents/Final Reports/UX Analysis Reports/ |
| Knowledge Docs | /Shared Documents/Templates/ (3 documents) |
| API Key | Anthropic API Key stored as Power Platform Environment Variable (Secret type), also referenced via Compose fallback with Secure Inputs/Outputs ON |
| API Key Variable Names | lupo_AnthropicAPIKey |

**NXT Humans Brand Colors (used in reports):**
- Black: #0D0D0D
- Chartreuse: #B8B800
- Cyan: #00B7C3

**Note:** The HTML reports currently use an indigo-based design system (#6366f1 primary), not the NXT Humans brand palette. This was a deliberate choice for report readability but could be updated.

---

## 3. ARCHITECTURE — HOW THE FLOW ACTUALLY WORKS

The entire analysis pipeline runs in a single Power Automate Cloud Flow called "Retrieve and Analyze Screenshots." This is a deliberate architectural decision — passing base64 image data between separate flows would exceed Copilot Studio's ~4MB message size limit (documented as CRASH #1 in the Developer Guide).

### 3.1 Flow Structure (Top to Bottom)

```
TRIGGER: When an agent calls the flow
    Inputs: folder_path, analysis_scope, heuristic_categories,
            severity_threshold, target_audience, platform_type,
            business_goals, ux_brief
    ↓
INITIALIZE VARIABLES (7 total):
    varRollingMemory (String, empty)
    varFileCount (Integer, 0)
    varScreenAnalyses (String, empty)
    varAssistantHTML (String, empty)
    varHTMLStopReason (String, empty)
    varHTMLLoopCount (Integer, 0)
    varImageMap (String, empty)
    ↓
Get Screenshot Files (SharePoint — Get files properties only)
    Site: Research, Library: Shared Documents
    Folder: /Research Documents
    Filter: PNG/JPG files only, Top Count: 20
    ↓
Get Anthropic Key (Compose with Secure Inputs/Outputs ON)
    ↓
Respond to Copilot (returns screenshot_count early so agent can
    display progress — placed BEFORE the loop)
    ↓
Loop_System_Prompt (Compose — static evaluation framework text)
    ↓
Escape_Loop_System_Prompt (Compose — replace chain for JSON safety)
    ↓
═══════════════════════════════════════════════════
APPLY TO EACH (over screenshot files)
    Concurrency Control: ON, Parallelism: 1
═══════════════════════════════════════════════════
    ↓
    Get Image Content (SharePoint — Get file content)
        ↓
    Determine Media Type (Compose — PNG vs JPEG detection)
        ↓
    Append to varImageMap (Append to string — filename:::base64data)
        ↓
    Increment variable (varFileCount +1)
        ↓
    Loop User Prompt (Compose — per-screen analysis instructions
        with FileLeafRef filename, rolling memory, project context)
        ↓
    Loop Payload (Compose — Claude API request body with system
        prompt, user prompt with image, model: claude-sonnet-4-6,
        max_tokens: 4000, temperature: 0.2)
        ↓
    HTTP Loop Vision (HTTP POST to api.anthropic.com/v1/messages)
        ↓
    Loop Raw JSON (Compose — extract response text)
        ↓
    Clean Loop JSON (Compose — strip markdown code fences)
        ↓
    Append Screen Analysis (Append to varScreenAnalyses)
        ↓
    Build Memory Note (Compose — compact memory for next iteration)
        ↓
    Append to String varRollingMemory
═══════════════════════════════════════════════════
END APPLY TO EACH
═══════════════════════════════════════════════════
    ↓
Synthesis System Prompt (Compose — executive synthesis instructions
    with JSON schema including screen_analyses array)
    ↓
Synthesis User Prompt (Compose — rolling memory + context)
    ↓
Synthesis Payload (Compose — Claude API body, Haiku model,
    max_tokens: 4000)
    ↓
HTTP Synthesis (HTTP POST)
    ↓
Synthesis Stop Reason (Compose)
    ↓
Synthesis Raw Text (Compose — extract response)
    ↓
Clean JSON Response (Compose — strip code fences)
    ↓
Parse Clean JSON (Compose — json() parser)
    ↓
Extract Total Issues (Compose)
    ↓
Extract Critical Count (Compose)
    ↓
Extract Major Count (Compose)
    ↓
Build Executive Summary (Compose)
    ↓
Resolved Screens Analyzed Count (Compose)
    ↓
Is Screen Coverage Complete (Compose)
    ↓
Merge Final JSON (Compose — combines synthesis JSON with
    screen_analyses from varScreenAnalyses)
    ↓
All Screens Covered Check (Condition)
    ├── TRUE branch:
    │   Serialized Final JSON → Final JSON Binary →
    │   Save Analysis JSON (SharePoint) →
    │   HTML System Prompt → HTML User Prompt →
    │   Escape_HTML_System_Prompt → Escape_HTML_User_Prompt →
    │   ┌─────────────────────────────────────┐
    │   │ DO UNTIL (varHTMLStopReason = end_turn)
    │   │   Build HTML Request (Compose)
    │   │   HTTP Generate HTML Loop (HTTP POST)
    │   │   Extract HTML Chunk (Compose)
    │   │   Strip Code Fences (Compose)
    │   │   Append to varAssistantHTML
    │   │   Set varHTMLStopReason
    │   │   Increment varHTMLLoopCount
    │   └─────────────────────────────────────┘
    │   ┌─────────────────────────────────────┐
    │   │ INJECT IMAGES (Apply to each)
    │   │   Compute_Replaced_HTML (Compose)
    │   │   Update_varAssistantHTML (Set variable)
    │   └─────────────────────────────────────┘
    │   Save HTML Report (SharePoint) →
    │   Post message in a chat or channel (Teams) →
    │   Send an email (V2) (Outlook)
    │
    └── FALSE branch:
        3 actions (error handling)
```

### 3.2 Key Architectural Decisions

**Per-image loop with rolling memory (not batch):** Each screenshot is analyzed individually with Claude Sonnet vision. A rolling memory string carries context from screen to screen, enabling cross-screen continuity analysis. This was chosen over batch (all images in one call) to stay within token limits and timeout constraints.

**Synthesis pass:** After all individual screens are analyzed, a synthesis call (currently Haiku) merges findings into a unified executive JSON report with severity ratings, recommendations, and a screen_analyses array mapping findings to screens.

**Do Until HTML continuation loop:** The HTML report generation uses a Do Until loop (max 15 iterations, PT10M timeout) that checks `stop_reason`. If Claude hits `max_tokens` (8000 per iteration), it sends a continuation request with the partial HTML as assistant pre-fill. Claude resumes exactly where it stopped. This prevents truncated reports.

**Base64 image embedding (in progress):** Rather than linking to SharePoint URLs (which require authentication), the flow captures base64-encoded image data during the per-image loop and injects it into the HTML after generation via string replacement.

---

## 4. MODEL USAGE

| Call | Model | max_tokens | Purpose |
|---|---|---|---|
| HTTP Loop Vision (per-image) | claude-sonnet-4-6 | 4000 | Individual screen analysis with vision |
| HTTP Synthesis | claude-haiku-4-5-20251001 | 16000 | Executive JSON synthesis |
| HTTP Generate HTML Loop | claude-sonnet-4-6 | 8000 | HTML report generation (multi-pass via Do Until, max 15 iterations, Sonnet on ALL passes) |

**Why Sonnet for HTML generation:** Originally Haiku was used for HTML to stay within timeout constraints. However, Haiku prematurely closed HTML documents on continuation passes (stopping at 9 of 20 screens). Sonnet at 8000 tokens per iteration completes in 15-30 seconds — well within the 120s timeout — and maintains structural integrity across multi-pass HTML generation. Sonnet requires conversations to end with a user message (no assistant prefill), so continuation passes include an explicit "Continue generating..." user message after the assistant content.

**Important:** The Build HTML Request Compose uses manual JSON string construction with escaped prompts — NOT the `json()` function. Power Automate's `json()` is a parser (like JSON.parse), not a stringifier. Plain text passed to `json()` crashes immediately. See CRASH #5 in the Developer Guide.

---

## 5. PROMPT ARCHITECTURE

### 5.1 Loop System Prompt
Located as a Compose action outside the Apply to each loop (static, no dynamic content). Contains the full evaluation framework:
- Six Agentic UX Patterns (Progressive Disclosure, Guided Narrowing, Confidence Signals, Transparent Limitations, Action Audit/Undo, Contextual Progress Narration)
- 8-Dimension Conversational AI Rubric
- Trust Architecture principles (Google PAIR, NNGroup, Klarna reversal)
- Agentic Commerce evaluation criteria
- Shopping/Commerce UX criteria
- Traditional Nielsen heuristics (supporting)
- WCAG 2.1 AA accessibility (supporting)
- Severity scale (0-4)
- Filename preservation enforcement

### 5.2 Loop User Prompt
Inside the Apply to each loop. Dynamic content includes:
- `FileLeafRef` (exact screenshot filename)
- Filename preservation instruction (CRITICAL line)
- All trigger inputs (scope, categories, threshold, audience, platform, goals, brief)
- `varRollingMemory` (accumulated context from prior screens)
- Evaluation priority order
- Mockup literacy rules (don't flag lorem ipsum unless material)
- Required JSON output schema

### 5.3 Synthesis System Prompt
Instructs Claude to produce the executive JSON report including the `screen_analyses` array. Key constraints:
- Max 8 findings, max 5 recommendations
- Strict word limits on all fields
- Filename preservation rules
- Priority order matching Loop System Prompt

### 5.4 Synthesis User Prompt
Combines trigger inputs with varRollingMemory. Explicitly instructs Claude NOT to regenerate per-screen objects.

### 5.5 HTML System Prompt
Detailed design specification for the HTML report including:
- Design system colors and typography
- 9-section structure (header, severity dashboard, executive summary, top findings, screen-by-screen analysis, detailed findings, accessibility summary, recommendations, footer)
- IMAGE_BASE_URL pattern for screenshot embedding
- Interactive features (details/summary elements)
- Output rules (no code fences, inline CSS only, responsive, print-friendly)

### 5.6 HTML User Prompt
Provides IMAGE_BASE_URL, analysis metadata, and the serialized JSON. Built as a Power Automate `concat()` expression with `decodeUriComponent('%0A')` for newlines.

---

## 6. JSON SCHEMA

The synthesis pass produces this structure:

```json
{
  "executive_summary": {
    "overall_score": 0-100,
    "score_confidence": "low|medium|high",
    "overall_readout": "string (max 90 words)",
    "brief_alignment_summary": "string (max 90 words)",
    "ai_experience_verdict": "string (max 75 words)",
    "total_issues": 0,
    "severity_breakdown": {
      "catastrophic": 0, "major": 0, "minor": 0, "cosmetic": 0
    },
    "top_findings": ["string x5 (max 28 words each)"],
    "strengths": ["string x3 (max 20 words each)"],
    "screens_covered": 0,
    "mockup_content_summary": "string"
  },
  "screen_analyses": [
    {
      "filename": "exact-original-filename.png",
      "screen_type": "chatbot response|product listing|...",
      "micro_analysis": "string (max 25 words)",
      "severity_flag": "clean|minor|major|critical",
      "finding_ids": ["F001", "F003"]
    }
  ],
  "findings": [
    {
      "id": "F001",
      "screenshot": "filename.png",
      "category": "Conversational AI UX|...",
      "heuristic": "string",
      "title": "string",
      "description": "string (max 2 sentences)",
      "severity": 0-4,
      "confidence": "high|medium|low",
      "ui_element": "string",
      "remediation": "string (max 2 sentences)",
      "evidence": "string (max 1 sentence)",
      "brief_impact": "string",
      "systemic": true|false
    }
  ],
  "accessibility_summary": {
    "estimated_wcag_level": "string",
    "critical_barriers": ["string"],
    "contrast_issues": 0,
    "missing_indicators": ["string"],
    "static_analysis_limitations": ["string"]
  },
  "recommendations_priority": [
    {
      "priority": 1-5,
      "title": "string",
      "finding_ids": ["F001"],
      "recommendation": "string",
      "rationale": "string",
      "estimated_impact": "high|medium|low",
      "screens": ["filename1", "filename2"]
    }
  ]
}
```

---

## 7. COPILOT STUDIO AGENT CONFIGURATION

| Setting | Value |
|---|---|
| Name | AI UX/UI Analyst |
| Orchestration | Generative (AI planner routes to topics) |
| General Knowledge | OFF (answers only from knowledge sources and flows) |
| Knowledge Strictness | High |
| Authentication | Authenticate with Microsoft |

### 7.1 Knowledge Sources (4)
1. **UX Heuristic Framework** — SharePoint/Templates — Nielsen's 10, WCAG, Gestalt, severity scales
2. **Conversation Design Best Practices** — SharePoint/Templates — Six agentic patterns, 8-dimension rubric, trust architecture, industry cases
3. **Agentic Commerce and Discovery Optimization** — SharePoint/Templates — Shopper Schism, GEO, social commerce, UCP
4. **Screenshot Library** — SharePoint/Research Documents — Source images

**Important limitation:** These knowledge sources are available to Copilot Studio's generative answers but are NOT injected into the Power Automate Claude API calls. The evaluation framework must be embedded directly in the Loop System Prompt for Claude to reference it.

### 7.2 Custom Entities (3)
- **Analysis Scope:** Full Experience Audit, Specific Screens, Comparative Review
- **Heuristic Categories:** 9 items including Conversational AI UX, Agentic Commerce, Shopping UX, All Categories
- **Platform Type:** Web Desktop, Mobile App, Mobile Web, Both

### 7.3 Topics (5 custom + system)
- **Brief Intake** — 5-step guided requirement gathering → redirects to Run Analysis
- **Analysis Configuration** — Adaptive Card with toggles for heuristic categories and severity threshold
- **Run Analysis** — Core orchestration, calls the flow, presents executive summary
- **Review Results** — Displays detailed findings and report link
- **Export and Deliver** — Teams/email delivery

### 7.4 Global Variables (16)
All initialized in Conversation Start system topic:
AnalysisScope, HeuristicCategories, SeverityThreshold, TargetAudience, PlatformType, BusinessGoals, UXBrief, AnalysisJSON, ReportId, ReportUrl, ExecutiveSummary, TotalIssues, CriticalCount, MajorCount, ScreenshotCount, RequestorEmail (auto-captured from System.User.UserPrincipalName)

---

## 8. BUGS FIXED DURING THIS BUILD SESSION

### 8.1 Teams Message `body()` vs `outputs()` (CRITICAL)
**Error:** `InvalidTemplate: function 'first' expects array or string, provided value is Null`
**Root cause:** Parse_Clean_JSON is a Compose action. `body('Parse_Clean_JSON')` returns null for Compose actions — must use `outputs('Parse_Clean_JSON')`.
**Fix:** Replaced every `body('Parse_Clean_JSON')` with `outputs('Parse_Clean_JSON')` in the Teams message and email expressions.
**Rule:** For Compose actions, always use `outputs()`. For SharePoint/HTTP/connector actions, `body()` is correct.

### 8.2 HTML Truncation — Missing Do Until Loop
**Error:** HTML reports cut off mid-sentence. `stop_reason: "max_tokens"` in Claude response.
**Root cause:** Single HTTP call with max_tokens: 4000 insufficient for full HTML report.
**Fix:** Implemented Do Until continuation loop with assistant pre-fill pattern. Loop checks `stop_reason` and continues until `end_turn`.

### 8.3 `json()` Function Misuse in Build HTML Request
**Error:** `InvalidTemplate: function 'json' parameter is not valid. Unexpected character 'Y'`
**Root cause:** `json()` is a parser, not a stringifier. Passing plain English text to it crashes.
**Fix:** Manual escaping with `replace()` chains for backslashes, double quotes, newlines, carriage returns. Separate Escape_HTML_System_Prompt and Escape_HTML_User_Prompt Compose actions.

### 8.4 Trailing Whitespace in Assistant Pre-fill
**Error:** `messages: final assistant content cannot end with trailing whitespace`
**Root cause:** Extract_HTML_Chunk had a trailing `\r\n` baked into the expression. When escaped to `\n`, Claude's API interprets it as a real newline (trailing whitespace).
**Fix:** Removed trailing `\r\n` from Extract_HTML_Chunk expression. Added `trim()` INSIDE the escape chain (before escaping) in Build HTML Request: `trim(variables('varAssistantHTML'))` wrapped before the replace chain.

### 8.5 HTTP Generate HTML Loop Missing Headers
**Error:** `invalid x-api-key`
**Root cause:** Newly created HTTP action doesn't inherit headers from deleted actions. Headers must be configured from scratch.
**Fix:** Added x-api-key, anthropic-version, Content-Type headers manually. Set Secure Inputs ON and timeout PT120S.

### 8.6 Build HTML Request and HTTP Action in Wrong Order
**Error:** HTTP action fires before request body is built.
**Root cause:** Actions added in wrong sequence inside Do Until loop.
**Fix:** Reordered so Build HTML Request runs before HTTP Generate HTML Loop.

### 8.7 varHTMLStopReason Not Being Set
**Error:** Do Until loop runs to max count and fails because exit condition never met.
**Root cause:** Set variable action had no value expression configured.
**Fix:** Added expression: `coalesce(body('HTTP_Generate_HTML_Loop')?['stop_reason'], 'error')`

### 8.8 Self-Reference Error in Set Variable
**Error:** `Self reference is not supported when updating the value of variable 'varAssistantHTML'`
**Root cause:** Power Automate prohibits a Set Variable action from reading and writing the same variable.
**Fix:** Split into two actions: Compose (Compute_Replaced_HTML) that reads the variable and computes the replacement, then Set Variable (Update_varAssistantHTML) that writes the Compose output back.

---

## 9. KNOWN ISSUES AND IN-PROGRESS WORK

### 8.11 Substring Collision in Image Placeholder Replacement
**Error:** 11 of 20 images rendered as broken (`ERR_INVALID_URL` in browser console). 9 images worked fine.
**Root cause:** Power Automate's `replace()` function replaces ALL occurrences. When replacing `screen-image-1` with base64 data, it also matched the `screen-image-1` substring inside `screen-image-10`, `screen-image-11`, through `screen-image-19`. This appended stray digits to the end of base64 data URIs, corrupting them.
**Fix:** Wrapped placeholders in double curly braces: `{{screen-image-1}}`. The braces act as delimiters that prevent `{{screen-image-1}}` from matching inside `{{screen-image-10}}`. Applied to three locations: Append to varImageMap expression, HTML System Prompt placeholder instructions, and Compute_Replaced_HTML expression.
**Rule:** When using sequential numbered placeholders with Power Automate `replace()`, always wrap them in unique delimiters (e.g., `{{...}}`) to prevent substring collision.

### 8.12 Sonnet Does Not Support Assistant Message Prefill
**Error:** `400 BadRequest: This model does not support assistant message prefill. The conversation must end with a user message.`
**Root cause:** Claude Sonnet 4.6 requires conversations to end with a user message. The Do Until continuation loop was sending `[user, assistant]` message pairs for continuation — valid for Haiku but rejected by Sonnet.
**Fix:** Added a third message to the continuation branch: `{"role":"user","content":"Continue generating the HTML report exactly from where you stopped..."}`. This satisfies the API requirement while preserving the partial HTML as context in the assistant message.

### 8.13 Haiku Prematurely Closing HTML on Continuation Passes
**Error:** HTML report contained only 9 of 20 screen cards despite Do Until loop running 4 iterations. All iterations succeeded with `stop_reason: end_turn`.
**Root cause:** Build HTML Request used Sonnet for the first iteration but Haiku for continuations. Haiku closed the HTML document prematurely (adding `</body></html>`) after screen 9 instead of continuing through all 20 screens.
**Fix:** Changed continuation branch model from `claude-haiku-4-5-20251001` to `claude-sonnet-4-6`. Both branches now use Sonnet for consistent HTML generation quality across all passes.

### 8.14 Synthesis JSON Truncation at 4000 Tokens
**Error:** `Parse_Clean_JSON failed: json() parameter is not valid` — but the JSON was valid, just incomplete (cut off mid-word).
**Root cause:** Synthesis call at max_tokens: 4000 was insufficient for the expanded schema with 20 screen_analyses objects. Claude hit max_tokens before completing the JSON.
**Fix:** Increased max_tokens on Synthesis Payload from 4000 to 16000. Haiku completes text-only synthesis in 10-20 seconds at 16000 tokens, well within 120s timeout.

### 8.10 Filename Invention Breaking Image Embedding
**Error:** Images not rendering in HTML report. Claude invented descriptive filenames like "Screen 01 - AI Conversational Commerce - Product Discovery Result.png" instead of preserving the actual "Screenshot 2026-03-05 093731.png".
**Root cause:** Despite filename preservation instructions in prompts, Claude's instinct to describe what it sees overrides the instruction to preserve the original filename.
**Fix:** Eliminated filename dependency entirely. Switched to sequential index-based placeholders:
- varImageMap stores `screen-image-1:::base64data|||screen-image-2:::base64data...`
- HTML System Prompt instructs Claude to use `src="screen-image-N"` where N is the 1-based position in screen_analyses
- Inject_Images loop replaces each `screen-image-N` placeholder with the corresponding base64 data URI
- No filename matching required — alignment is by processing order

### 9.2 Base64 Image Embedding (WORKING — FULLY OPERATIONAL)
**Status:** All 20 images embedding successfully. Reports are fully self-contained.
**Architecture:** During the per-image loop, captures sequential-numbered base64 data URI mappings in varImageMap using delimited placeholders (`{{screen-image-1}}:::data:image/png;base64,...|||{{screen-image-2}}:::...`). HTML System Prompt instructs Claude to use `{{screen-image-N}}` placeholders as img src values. After HTML generation, the Inject_Images loop replaces each placeholder with the corresponding base64 data URI.
**Three bugs were solved to get here:**
  1. **Filename invention (SOLVED):** Claude invented descriptive filenames instead of preserving originals. Fixed by switching to index-based `{{screen-image-N}}` placeholders that don't depend on filename preservation at all.
  2. **HTML truncation (SOLVED):** Haiku was prematurely closing HTML after 9 screens. Fixed by switching continuation passes to Sonnet and adding explicit user continuation message (Sonnet doesn't support assistant prefill — conversation must end with user message).
  3. **Substring collision (SOLVED):** `replace('screen-image-1', ...)` matched inside `screen-image-10` through `screen-image-19`, corrupting 11 base64 data URIs with trailing digits. Fixed by wrapping placeholders in double curly braces: `{{screen-image-1}}` cannot match inside `{{screen-image-10}}`.
**Self-reference fix:** Uses Compose (Compute_Replaced_HTML) → Set Variable (Update_varAssistantHTML) pattern because Power Automate prohibits a Set Variable from reading and writing the same variable.

### 9.3 Only 9 of 20 Images Embedding (ACTIVE — UNDER INVESTIGATION)
**Status:** Partially working. Reports render 9 embedded screenshots, remaining 11 are missing.
**Possible causes (need run history to diagnose):**
1. **varImageMap string variable truncation:** 20 base64-encoded screenshots is 20-60MB of text. Power Automate string variables may silently truncate after ~15-25MB, meaning only the first 9-10 entries survive the Append operations.
2. **replace() hitting size ceiling:** After 9 successful base64 replacements, varAssistantHTML is 15-25MB. The Compose action's replace() function may fail or produce empty output when operating on strings of this size.
3. **HTML generation still incomplete:** The Do Until loop (now max 15 iterations at 8000 tokens = 120K ceiling) may still not be generating all 20 screen cards. If the HTML cuts off at screen 9, placeholders 10-20 don't exist in the HTML and Inject_Images has nothing to replace.
**Diagnosis:** Open the run history → expand Inject_Images loop → count iterations and check for errors. This distinguishes cause 1 (fewer than 20 iterations) from causes 2-3 (20 iterations but replacement fails or placeholders missing).
**Potential solutions:**
- If variable size limit: Reduce image resolution before upload, or split the injection into batches
- If replace() limit: Use a different injection strategy (e.g., build the HTML with base64 data directly instead of post-processing replacement)
- If HTML incomplete: Further increase Do Until count or max_tokens

### 9.4 Knowledge Base Not Cited in Analysis
**Status:** Partially fixed
**Problem:** Claude API calls bypass Copilot Studio's knowledge retrieval. The knowledge documents (Conversation Design Best Practices, Agentic Commerce framework) are not injected into the API calls.
**Fix applied:** Created Loop_System_Prompt with the evaluation framework embedded directly. This gives Claude the rubric dimensions, pattern definitions, and severity scales. However, it's a condensed version — not the full 15,000-word knowledge documents.

### 9.4 Report File Size
**Status:** Expected behavior after base64 embedding
**Impact:** Reports will be 20-60MB with embedded images. SharePoint handles this fine (250GB limit). Email attachments may exceed 25MB limits — email should contain a link to the SharePoint report, not the report as an attachment.

---

## 10. POWER AUTOMATE EXPRESSION PATTERNS (QUICK REFERENCE)

**Escaping plain text for JSON embedding:**
```
replace(replace(replace(replace(
  outputs('My_Compose'),
  '\', '\\'),
  '"', '\"'),
  decodeUriComponent('%0A'), '\n'),
  decodeUriComponent('%0D'), '')
```

**Extracting Claude API response text (null-safe):**
```
coalesce(body('HTTP_Action')?['content']?[0]?['text'], '')
```

**Extracting stop_reason (null-safe):**
```
coalesce(body('HTTP_Action')?['stop_reason'], 'error')
```

**For Compose actions — use outputs(), not body():**
```
outputs('Parse_Clean_JSON')?['executive_summary']?['overall_score']
```

**For SharePoint/HTTP/connector actions — body() is correct:**
```
body('Save_HTML_Report')?['Path']
```

**Stripping markdown code fences:**
```
replace(replace(outputs('My_Compose'), '```json', ''), '```', '')
```

**Building timestamp filename:**
```
concat('ux_report_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.html')
```

**Newlines in fx expressions:**
```
decodeUriComponent('%0A')
```

**Self-reference workaround for variables:**
Cannot do: Set Variable X = replace(variables('X'), ...)
Must do: Compose → outputs('Compose') → Set Variable X

---

## 11. HARD RULES (FROM DEVELOPER GUIDE)

1. **Never return base64/binary data from a flow to Copilot Studio.** Process entirely within the flow.
2. **Never pre-bracket JSON sub-arrays.** Build as raw comma-separated, add brackets only at final assembly.
3. **Always set Concurrency Control = 1** on any Apply to Each that writes to shared variables.
4. **Always use Do Until continuation loop** for any Claude call generating long output (HTML, reports).
5. **`json()` is a PARSER, not a stringifier.** Use `replace()` chains to escape text for JSON embedding.
6. **Use `{FullPath}` not `Id`** when chaining SharePoint Get files → Get file content.
7. **Every Global variable must be initialized in Conversation Start.** Every flow output needs an explicit Set Variable node.
8. **Wrap entity-typed variables in `Text()`** when passing to flow inputs.
9. **HTTP timeout must be PT120S** for all Claude API calls.
10. **Secure Inputs ON** for all HTTP actions that include API keys.

---

## 12. COST PER ANALYSIS RUN (ESTIMATED)

| Component | Estimated Cost |
|---|---|
| 20x Claude Sonnet vision calls (per-image) | ~$0.80-1.50 |
| 1x Claude Haiku synthesis call | ~$0.02-0.05 |
| 4-5x Claude Sonnet HTML generation calls | ~$0.30-0.60 |
| **Total Anthropic API per run** | **~$1.12-2.15** |
| Power Platform flow actions | ~50-70 premium credits |

---

## 13. FILE INVENTORY

| File | Location | Purpose |
|---|---|---|
| UX Heuristic Analysis Framework.docx | SharePoint/Templates | Nielsen's 10, WCAG, Gestalt reference |
| Conversation Design Best Practices 2026.docx | SharePoint/Templates | Six agentic patterns, AI rubric, trust |
| Agentic Commerce and Discovery Optimization 2026.docx | SharePoint/Templates | Shopper Schism, GEO, social commerce |
| ux_analysis_*.json | SharePoint/JSON Output | Raw analysis JSON per run |
| ux_report_*.html | SharePoint/Final Reports/UX Analysis Reports | HTML reports per run |
| Developer Guide (developer-guide.html) | Reference document | 21 failure catalog, YAML rules, checklist |
| Build Recipe (ux-analyst-recipe.html) | Reference document | Original step-by-step build instructions |

---

## 14. NEXT STEPS (PRIORITY ORDER)

1. **Diagnose the 9-of-20 image embedding limit** — Open run history, expand Inject_Images loop, count iterations and check for errors. This is the critical diagnostic that determines the fix path.
2. **Fix remaining image embedding** — Based on diagnosis: if varImageMap truncation, reduce image resolution or split injection; if replace() limit, explore alternative injection strategy; if HTML incomplete, increase Do Until iterations/tokens further.
3. **Improve analysis quality** — The Loop System Prompt now contains the evaluation framework but may need tuning. Compare outputs against the full knowledge documents. Consider whether Sonnet should replace Haiku for synthesis and/or HTML generation.
4. **Strengthen filename preservation** — Although the index-based placeholder approach bypasses the filename problem for images, the JSON report still contains invented filenames in the screen_analyses and findings arrays. This affects traceability. Consider injecting a filename array into the Synthesis User Prompt so Claude can map real filenames to screens.
5. **Email delivery optimization** — Large base64 reports (20-60MB) will exceed email attachment limits. Ensure email contains SharePoint link only, not the report as attachment.
6. **Update Developer Guide** — Add bugs 8.1-8.10 from this session to the existing developer-guide.html catalog. Current document covers CRASH #1-6 and ERROR #7-12; this session adds 10 more documented failures.
7. **Consider NXT Humans brand palette for reports** — Current reports use indigo (#6366f1) design system. Could be updated to NXT Humans palette (#0D0D0D, #B8B800, #00B7C3) by modifying the HTML System Prompt.
8. **Explore alternative image strategies if base64 hits hard limits** — Options include: generating lower-resolution thumbnails, embedding only the first N most-critical screens, or using a dedicated image hosting solution that doesn't require SharePoint authentication.