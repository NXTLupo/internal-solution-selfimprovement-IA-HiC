# Copilot Studio Journey Mapper: Prompt Optimization Recipe

## Objective

Replace the existing Pass 1 and Pass 2 system prompts inside your "BATCH ENGINE - Journey Map Synthesis" flow to emulate the output quality of the Intelligence Augmentation Journey Mapper -- richer HTML, better quotes/citations, WCAG AAA accessibility, interactive JavaScript, and modern visual design -- without changing the flow skeleton, trigger inputs, action names, variable names, Do Until loop logic, or topic wiring.

---

## Your Existing Architecture (Preserved)

```
TOPIC: Start Button Bridge
  |
  +-- Single file upload -> Save Uploaded Research Document flow
  |   -> extracted_text -> Global.DocumentContent
  |
  +-- Batch process multiple files -> SharePoint folder
      -> Action: BATCH ENGINE - Journey Map Synthesis
         Inputs: persona_scope, journey_start, journey_end, requestor_email
         Output: journey_id -> Global.JourneyID
      -> Redirect to Journey Analysis Request topic

FLOW: BATCH ENGINE - Journey Map Synthesis
  |
  1.  Skills (trigger)
  2.  Initialize variable (general)
  3.  Respond to Copilot 2 (early async response)
  4.  Get Anthropic Key (secured)
  5.  Initialize variable varStopReason
  6.  Initialize variable varAssistantText
  7.  Initialize variable varAllBatchText
  8.  Initialize variable varAllDocumentsArray
  9.  Get files (properties only) -- SharePoint
  10. Filter array
  11. Apply to each (read + concatenate file contents)
  12. Build Synthesis Report (Compose)
  13. Build Pass1 System Prompt (Compose)        <-- CHANGE THIS
  14. Build Pass1 User Prompt (Compose)           <-- CHANGE THIS
  15. Do Until (varStopReason != max_tokens)
      |-- HTTP Pass1 (Claude API)                 <-- CHANGE MODEL + MAX_TOKENS
      |-- Set variable (varStopReason)
      |-- Append to string variable (varAssistantText)
  16. Count Stages
  17. Save Pass1 to SharePoint
  18. Initialize variable varStopReasonHTML
  19. Initialize variable varAssistantHTML
  20. Build Pass2 System Prompt (Compose)          <-- CHANGE THIS
  21. Build Pass2 User Prompt (Compose)            <-- CHANGE THIS
  22. Do Until (varStopReasonHTML != max_tokens)
      |-- HTTP Pass2 (Claude API)                  <-- CHANGE MODEL + MAX_TOKENS
      |-- Set variable (varStopReasonHTML)
      |-- Append to string variable (varAssistantHTML)
  23. Save HTML to SharePoint
  24. Create sharing link / email notification
  25. Final Respond to Copilot
```

**What changes: 6 actions (3 per pass)**
**What stays the same: Everything else -- trigger, variables, Do Until loops, SharePoint actions, Apply to each, Filter array, async response pattern, topic wiring**

---

## What You Are Changing (and NOT Changing)

| Component | Changed? | Details |
|---|---|---|
| Flow trigger (Skills) | NO | Same trigger, same inputs |
| Initialize variables (5) | NO | Same names, same types |
| Respond to Copilot 2 (async) | NO | Still fires early for batch processing |
| Get Anthropic Key | NO | Same secured action |
| Get files + Filter array | NO | Same SharePoint file reading |
| Apply to each (file processing) | NO | Same document concatenation |
| Build Synthesis Report | NO | Same report Compose |
| `Build Pass1 System Prompt` | **YES** | Replace Inputs content with new prompt |
| `Build Pass1 User Prompt` | **YES** | Update format (minor) |
| Do Until loop (Pass 1) | NO | Same loop condition: varStopReason != max_tokens |
| `HTTP Pass1` inside Do Until | **YES** | Change model + max_tokens |
| Set variable + Append (Pass 1) | NO | Same variable operations |
| Count Stages | NO | Same expression |
| Save Pass1 to SharePoint | NO | Same SharePoint action |
| `Build Pass2 System Prompt` | **YES** | Replace Inputs content with new prompt |
| `Build Pass2 User Prompt` | **YES** | Update format (minor) |
| Do Until loop (Pass 2) | NO | Same loop condition: varStopReasonHTML != max_tokens |
| `HTTP Pass2` inside Do Until | **YES** | Change model + max_tokens |
| Set variable + Append (Pass 2) | NO | Same variable operations |
| Save HTML + sharing link | NO | Same SharePoint actions |
| Topic: Start Button Bridge | NO | Same nodes, same variable mappings |
| Tool registrations | NO | Same 5 flows connected |

---

# PHASE 1: Update Pass 1 -- Extract Journey Elements

## Step 1.1: Open the BATCH ENGINE Flow

WHERE AM I?: Power Automate > Solutions > Customer Journey Mapper Solution

1. Open Power Automate at make.powerautomate.com.
2. In the left navigation, click Solutions.
3. Open your Customer Journey Mapper Solution.
4. Find the flow named "BATCH ENGINE - Journey Map Synthesis" and click to open it.
5. Click Edit in the top toolbar.

## Step 1.2: Replace the Pass 1 System Prompt

WHERE AM I?: Flow Editor > Build Pass1 System Prompt (Compose action, action #13 in your flow)

1. Scroll down past the Apply to each and Build Synthesis Report actions.
2. Click on the Compose action named `Build Pass1 System Prompt` to expand it.
3. Select ALL text in the Inputs field and DELETE it completely.
4. Paste the following prompt into the Inputs field:

> **COPY-PASTE the entire block below:**

```
You are an EXPERT JOURNEY MAPPING SPECIALIST with exceptional data analysis and visualization skills. Analyze the provided research documents thoroughly and extract structured journey elements.

ANALYSIS METHODOLOGY:
1. Read the ENTIRE document corpus before identifying any stages.
2. Let the data tell you the stages -- do NOT impose a generic template (Awareness, Consideration, Purchase, etc.) unless the data genuinely follows that pattern.
3. Every claim must trace back to specific evidence in the source data.
4. Apply these quality gates to every insight:
   - "SO WHAT?" -- Does this insight lead to an actionable recommendation?
   - "COULD THIS APPEAR IN ANY JOURNEY MAP?" -- If yes, it is too generic. Reject it.
   - "DIFFERENT EVIDENCE" -- Each insight must cite different source evidence than other insights.
   - "DATA TOLD ME" -- You must be able to point to the exact passage that produced this insight.

QUOTE EXTRACTION RULES:
- Extract DIRECT QUOTES from the source data (minimum 10 words each).
- Quotes must be substantive voice -- real people speaking about real experiences. NOT titles, labels, section headings, or metadata.
- Each quote may appear ONCE in the quotes array. If the same evidence supports multiple stages, reference it by quote_id in the relevant stage's source_passage fields.
- Include a citation for every quote indicating source file and location (e.g., "File: interview_03.txt, Paragraph 12" or "File: survey_responses.csv, Row 47").
- If processing a single document without clear divisions, use approximate location (e.g., "Opening section" or "Discussion at midpoint").

DEDUPLICATION RULES:
- Each quote appears exactly once in the top-level quotes array.
- Each pain_point, opportunity, and touchpoint must cite DIFFERENT evidence than other items in the same array.
- If two stages share the same pain point, list it under the stage where it is MOST impactful.

OUTPUT TOKEN BUDGET: Target approximately 5,000 tokens of output. Prioritize in this order:
1. Stages with activities and evidence (most important)
2. Pain points with specific data references
3. Direct quotes with citations
4. Opportunities based on data patterns
5. Touchpoints and channels

CRITICAL: Return ONLY valid JSON matching the schema below. No markdown fencing (no ```json), no explanations, no commentary before or after the JSON.

{
  "persona": {
    "name": "string -- derived from data (e.g., 'Amateur Astrophotographer' or 'New Employee')",
    "description": "string -- one sentence describing who this persona is based on the data"
  },
  "journey_scope": {
    "start": "string -- where the journey begins based on data evidence",
    "end": "string -- where the journey ends based on data evidence",
    "granularity": "string -- high-level, standard, or micro-moments"
  },
  "stages": [
    {
      "id": "stage_1",
      "name": "string -- data-derived stage name, NOT a generic label",
      "description": "string -- what happens in this stage, grounded in evidence",
      "activities": [
        {
          "description": "string -- specific activity observed in data",
          "source_passage": "string -- brief quote or paraphrase proving this activity exists in the data"
        }
      ],
      "emotion": {
        "valence": "positive|negative|mixed|neutral",
        "intensity": "high|medium|low",
        "label": "string -- e.g., 'Excited but overwhelmed'",
        "evidence": "string -- what in the data indicates this emotional state"
      },
      "pain_points": [
        {
          "description": "string -- specific pain point with actionable detail",
          "severity": "critical|high|medium|low",
          "frequency": "string -- how often this appears in the data (e.g., 'Mentioned by 6 of 12 respondents')",
          "source_passage": "string -- the data evidence for this pain point"
        }
      ],
      "opportunities": [
        {
          "description": "string -- actionable opportunity derived from the pain point or gap",
          "impact": "high|medium|low",
          "source_passage": "string -- what data pattern suggests this opportunity"
        }
      ],
      "touchpoints": [
        {
          "channel": "string -- e.g., 'Website', 'Mobile App', 'Customer Support', 'Reddit Community'",
          "description": "string -- what interaction happens at this touchpoint"
        }
      ]
    }
  ],
  "quotes": [
    {
      "quote_id": "q1",
      "text": "string -- the exact quote from the source data (minimum 10 words)",
      "speaker": "string -- who said it (e.g., 'Interview Participant 3' or 'Reddit user u/stargazer42')",
      "citation": "string -- source file and location",
      "stage_id": "string -- which stage this quote best illustrates",
      "theme": "string -- what aspect of the journey this quote reveals"
    }
  ],
  "metrics": {
    "total_data_points_analyzed": 0,
    "total_stages_identified": 0,
    "total_pain_points": 0,
    "total_opportunities": 0,
    "total_quotes_extracted": 0
  }
}

CRITICAL RULES:
- Return ONLY the JSON object. No markdown, no explanations, no text outside the JSON.
- Every stage name must be derived from the data, not from a generic journey template.
- If the data does not support emotions, set valence to "neutral" and note "Insufficient evidence" in the evidence field.
- If fewer than 3 stages are evident, that is acceptable -- do not pad with invented stages.
- Actor-agnostic: the persona could be a customer, employee, patient, researcher, student -- derive it from the data.
- When processing batch documents, synthesize across ALL files to find the complete journey, not separate journeys per file.
```

5. Click outside the Compose action to collapse it and save.

> **VERIFY**: The Inputs field starts with "You are an EXPERT JOURNEY MAPPING SPECIALIST" and ends with "not separate journeys per file."

## Step 1.3: Update the Pass 1 User Prompt

WHERE AM I?: Flow Editor > Build Pass1 User Prompt (Compose action, action #14)

1. Click on the Compose action named `Build Pass1 User Prompt` to expand it.
2. Review your existing content. It likely uses dynamic content references to the trigger inputs and the concatenated document text from the Apply to each loop.
3. Update the Inputs to follow this format, keeping your existing dynamic content references (lightning bolt tokens) in place:

> **COPY-PASTE** (preserve your existing dynamic content tokens -- replace only the label text around them):

```
Extract journey elements from the following research documents.

SCOPE PARAMETERS:
- Persona focus: [YOUR EXISTING DYNAMIC: persona_scope] (if "auto-detect from document", analyze all personas found)
- Journey start point: [YOUR EXISTING DYNAMIC: journey_start] (if "auto-detect from document", determine from data)
- Journey end point: [YOUR EXISTING DYNAMIC: journey_end] (if "auto-detect from document", determine from data)

SYNTHESIS REPORT:
[YOUR EXISTING DYNAMIC: output from Build Synthesis Report]

COMBINED RESEARCH DOCUMENTS:
[YOUR EXISTING DYNAMIC: varAllBatchText or equivalent concatenated document content]
```

> **IMPORTANT**: Do NOT delete your existing dynamic content tokens (the purple/blue pills). Only change the static label text around them. The dynamic content references to your trigger inputs and variables must stay exactly as they are.

> **BEGINNER TIP**: If your current user prompt already references the synthesis report and batch text, you may only need to add the "SCOPE PARAMETERS" label section at the top. The key change is giving Claude clear section headers so it can parse the inputs.

## Step 1.4: Update HTTP Pass1 -- Model and max_tokens

WHERE AM I?: Flow Editor > Do Until loop > HTTP Pass1 (HTTP action inside the loop)

1. Click on the `Do Until` loop to expand it.
2. Click on the `HTTP Pass1` action inside the loop.
3. Find the Body field. It contains a `concat()` expression or a JSON template.

**Change 1: Model ID**

Find:
```
"model":"claude-opus-4-5-20251101"
```
or whatever model string is currently there.

Change to:
```
"model":"claude-sonnet-4-6"
```

**Change 2: max_tokens**

Find:
```
"max_tokens":64000
```

Change to:
```
"max_tokens":8000
```

> **WHY these values?**
> - **claude-sonnet-4-6**: Fast enough to complete extraction within each Do Until iteration's timeout budget. Quality is excellent for structured JSON extraction with well-crafted prompts.
> - **max_tokens: 8000**: The system prompt targets ~5000 tokens of JSON output. 8000 provides buffer for structural overhead. With the Do Until continuation pattern, if the response hits max_tokens, the loop will continue -- but with this prompt, the JSON should complete in a single iteration.
> - **Your Do Until loop still works**: If varStopReason equals "max_tokens", the loop continues. With the new prompt targeting 5K tokens and max_tokens set to 8K, the response will almost always complete in one iteration (stop_reason = "end_turn", not "max_tokens"). The loop acts as a safety net.

4. Save the action.

## Step 1.5: Verify the Do Until Loop Condition

WHERE AM I?: Flow Editor > Do Until loop header

1. Verify the loop condition is still: `varStopReason` is not equal to `max_tokens`
2. This should already be correct -- do not change it.
3. If your loop has a "Change limits" section, verify:
   - Count: 5 (or your existing value)
   - Timeout: PT10M (or your existing value)

> **WHY keep the Do Until?** Even though the new prompt should complete in one iteration, the continuation loop is your safety net. If Claude ever hits max_tokens (unlikely with 8K limit on a 5K-target prompt), the loop catches it and continues. This is a belt-and-suspenders approach that costs nothing when it doesn't trigger.

---

# PHASE 2: Update Pass 2 -- Synthesize Journey Map (HTML Generation)

## Step 2.1: Locate the Pass 2 Actions

WHERE AM I?: Flow Editor > Below the Save Pass1 to SharePoint action

1. Scroll past `Count Stages` and `Save Pass1 to SharePoint`.
2. You should see `Initialize variable varStopReasonHTML` and `Initialize variable varAssistantHTML`.
3. Below those, find `Build Pass2 System Prompt`.

## Step 2.2: Replace the Pass 2 System Prompt

WHERE AM I?: Flow Editor > Build Pass2 System Prompt (Compose action)

1. Click on the Compose action named `Build Pass2 System Prompt` (or your equivalent -- it may be named slightly differently).
2. Select ALL text in the Inputs field and DELETE it completely.
3. Paste the following prompt:

> **COPY-PASTE the entire block below:**

```
You are an EXPERT JOURNEY MAP VISUALIZATION SPECIALIST. Generate a complete, self-contained, interactive HTML document that visualizes a customer journey map from structured JSON data.

YOUR RESPONSE MUST BE A COMPLETE HTML DOCUMENT.
- Start with <!DOCTYPE html>
- End with </html>
- Include ALL closing tags: </style>, </head>, </body>, </html>
- Return ONLY HTML -- no markdown fencing, no explanations, no commentary before or after the HTML

DOCUMENT ARCHITECTURE (6 sections):

1. JOURNEY ANALYSIS SUMMARY (top of page)
   - 150-250 word narrative overview of the entire journey
   - KPI cards row: total stages, total pain points, total opportunities, total quotes extracted
   - One-sentence "bottom line" insight displayed in bold

2. HORIZONTAL JOURNEY TIMELINE (main section)
   - Stages displayed left-to-right in a horizontally scrollable container
   - Each stage is a card with:
     a. Stage name as h3 header
     b. Stage description (2-3 sentences grounded in evidence)
     c. Emotion indicator: colored pill badge (green=positive, amber=mixed, red=negative) with emotion label
     d. Activities list with source evidence
     e. Pain points subsection (red accent) with severity badges (Critical/High/Medium/Low)
     f. Opportunities subsection (green accent) with impact badges (High/Medium/Low)
     g. Touchpoints as small channel tags
   - CSS arrows or connector lines between stage cards
   - Each stage card uses a unique accent color from: #3b82f6, #8b5cf6, #14b8a6, #f97316, #ec4899, #22c55e

3. QUOTES AND VOICES SECTION
   - Section heading derived from persona (e.g., "CUSTOMER VOICES", "EMPLOYEE PERSPECTIVES", "RESEARCHER INSIGHTS", "COMMUNITY VOICES")
   - Each quote as a styled blockquote with: quote text in italics, speaker attribution, citation, colored tag for related stage
   - 2-3 most impactful quotes displayed as large pull quotes with special styling

4. PAIN POINTS DEEP DIVE
   - Grid of cards sorted by severity (critical first)
   - Each card: description, severity badge, frequency, related stage tag, source evidence
   - Red/amber color coding

5. OPPORTUNITIES ROADMAP
   - Grid of cards sorted by impact (high first)
   - Each card: description, impact badge, related stage tag, source evidence
   - Green/teal color coding

6. DATA PROVENANCE FOOTER
   - Total data points analyzed, number of direct quotes, methodology note

CSS FOUNDATION (use these exact variables):

:root {
  --bg-primary: #FAFAF8;
  --bg-card: #FFFFFF;
  --bg-card-alt: #F5F5F0;
  --text-primary: #2D2D2D;
  --text-secondary: #5A5A5A;
  --text-muted: #8A8A8A;
  --accent-warm: #92400E;
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-teal: #14b8a6;
  --accent-orange: #f97316;
  --accent-pink: #ec4899;
  --accent-green: #22c55e;
  --pain-bg: #FEF2F2;
  --pain-border: #EF4444;
  --pain-text: #991B1B;
  --opp-bg: #F0FDF4;
  --opp-border: #22C55E;
  --opp-text: #166534;
  --quote-bg: rgba(146, 64, 14, 0.06);
  --quote-border: #92400E;
  --badge-critical: #DC2626;
  --badge-high: #EA580C;
  --badge-medium: #D97706;
  --badge-low: #65A30D;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.1);
}

ACCESSIBILITY (WCAG AAA -- MANDATORY):
- ALL text: minimum 7:1 contrast ratio against background
- Semantic HTML: header, main, section, article, blockquote, footer
- Skip-to-content link as first element in body
- Font sizes: body 16px minimum, headings 20px+, quotes 18px
- Pre-tested badge colors (DO NOT DEVIATE):
  - Critical: white #FFFFFF on red #DC2626
  - High: white #FFFFFF on dark orange #EA580C
  - Medium: dark #78350F on amber #FDE68A
  - Low: dark #166534 on light green #BBF7D0
  - Positive emotion: dark #166534 on #DCFCE7
  - Negative emotion: dark #991B1B on #FEE2E2
  - Mixed emotion: dark #78350F on #FEF3C7
  - Neutral emotion: dark #374151 on #F3F4F6

RESPONSIVE DESIGN:
- Full viewport width, max-width: 1400px centered
- Horizontal scroll for timeline on small screens
- Grid collapses to single column below 768px
- Print media query: white background, no shadows

INTERACTIVE JAVASCRIPT:
- Click stage cards to expand/collapse detailed content
- Smooth scroll when clicking KPI cards
- Hover elevation effects on cards
- Horizontal scroll arrows if timeline overflows

QUOTE RENDERING:
- Each quote appears ONCE in the Quotes section
- In stage cards, show "See Quote" links that scroll to the quote
- Pull quotes between major sections for the most impactful statements
- NEVER fabricate quotes -- only render what exists in the input JSON
- Citation format: "-- Speaker, Citation" below each blockquote

CRITICAL RULES:
- No text before <!DOCTYPE html> or after </html>
- All data comes from the input JSON -- do not rename stages or invent content
- Emotion pills use the badge colors defined above (no other colors)
- All CSS in one style tag in head
- All JavaScript in one script tag before closing body
- Target 8,000-10,000 tokens of HTML output
- ENSURE the document ends with </script></body></html>
```

4. Click outside to save.

> **VERIFY**: Prompt starts with "You are an EXPERT JOURNEY MAP VISUALIZATION SPECIALIST" and ends with "ENSURE the document ends with </script></body></html>"

## Step 2.3: Update the Pass 2 User Prompt

WHERE AM I?: Flow Editor > Build Pass2 User Prompt (Compose action)

1. Click on `Build Pass2 User Prompt` to expand it.
2. Update the format to clearly separate the JSON input from any document re-send. Keep your existing dynamic content tokens:

> **COPY-PASTE** (preserve existing dynamic content references):

```
Generate a complete, self-contained interactive HTML journey map from the following data.

CONTENT SECTIONS TO INCLUDE: summary, stages, painPoints, opportunities, quotes, insights, touchpoints, emotions

EXTRACTED JOURNEY ELEMENTS (JSON from Pass 1):
[YOUR EXISTING DYNAMIC: varAssistantText -- the accumulated Pass 1 output]

ORIGINAL RESEARCH DOCUMENTS (for cross-reference):
[YOUR EXISTING DYNAMIC: varAllBatchText -- the concatenated document content]
```

> **NOTE**: If your current Pass 2 user prompt does NOT include the original documents (varAllBatchText), you can omit the "ORIGINAL RESEARCH DOCUMENTS" section. Sending only the JSON makes Pass 2 faster and cheaper, but the HTML cannot cross-reference original passages. Both approaches work.

## Step 2.4: Update HTTP Pass2 -- Model and max_tokens

WHERE AM I?: Flow Editor > Second Do Until loop > HTTP Pass2

1. Expand the second Do Until loop (the one using varStopReasonHTML).
2. Click on the `HTTP Pass2` action inside it.
3. In the Body field:

**Change 1: Model**

From whatever model is currently set, change to:
```
"model":"claude-sonnet-4-6"
```

**Change 2: max_tokens**

From `64000` (or current value), change to:
```
"max_tokens":12000
```

**Change 3: temperature (recommended)**

If present, change from `0.3` to:
```
"temperature":0.2
```

> **WHY 12000 for Pass 2?**
> - HTML is structurally verbose (CSS variables, semantic tags, JavaScript). 12K tokens gives room for a rich, interactive document.
> - With the Do Until continuation loop, if the HTML exceeds 12K tokens, the loop will fire again and Claude will continue generating. But with the new prompt targeting 8-10K tokens of HTML, it should complete in one or two iterations.
> - Temperature 0.2 produces more consistent, predictable HTML structure.

4. Save the action.

## Step 2.5: Verify the Second Do Until Loop

WHERE AM I?: Flow Editor > Second Do Until loop header

1. Confirm condition: `varStopReasonHTML` is not equal to `max_tokens`
2. Confirm loop limits match your existing settings.
3. Do NOT change the loop -- it works as your continuation safety net.

## Step 2.6: Save the Flow

WHERE AM I?: Flow Editor top toolbar

1. Click **Save** in the top toolbar.
2. Click **Flow checker** to verify no errors were introduced.
3. If flow checker shows errors, they are likely in expression syntax within the HTTP body -- check for mismatched quotes or braces.

---

# PHASE 3: Test End-to-End

## Step 3.1: Test with a Small Batch

WHERE AM I?: Copilot Studio > Customer Journey Mapper > Test panel

1. Upload 1-2 small research files (under 10,000 characters each) to your SharePoint Research Documents folder.
2. Open the Copilot test panel.
3. Start a conversation and select "Batch process multiple files".
4. Confirm "Yes, begin batch analysis".
5. The agent should:
   a. Say "I am sweeping the Research Folder..."
   b. Call the BATCH ENGINE flow
   c. The flow processes asynchronously (Respond to Copilot 2 fires early)
   d. Pass 1 extracts JSON, saves to SharePoint
   e. Pass 2 generates HTML, saves to SharePoint
   f. Returns journey_id

6. Open the generated HTML file from SharePoint and verify:

> **VERIFY the HTML has these characteristics**:
> - Light cream background (#FAFAF8), NOT dark theme
> - Journey Analysis Summary with KPI cards at top
> - Horizontal timeline with colored stage cards
> - Each stage has activities, emotion pill, pain points (red), opportunities (green)
> - Quotes section with blockquotes, citations, and speaker names
> - Pain Points grid sorted by severity
> - Opportunities grid sorted by impact
> - Data provenance footer
> - Interactive: click stage cards to expand/collapse
> - Accessible: skip-link present, high contrast badges
> - Responsive: resize browser window to test

## Step 3.2: Test with Larger Batch

1. Upload 3-5 files totaling 50,000-100,000 characters.
2. Run the same flow.
3. Monitor timing -- Pass 1 should complete in 20-50s, Pass 2 in 30-70s.
4. If the Do Until loop fires more than once on either pass, check the flow run history to see how many iterations occurred.

## Step 3.3: Compare with IA Journey Mapper Output

1. Run the same documents through the Intelligence Augmentation Journey Mapper (localhost:8080).
2. Open both HTML outputs side by side.
3. Compare: quote quality, stage naming, visual design, accessibility, interactivity.
4. The Copilot version should now produce output with similar quality characteristics:
   - Data-derived stage names (not generic templates)
   - Direct quotes with citations
   - Light, accessible color scheme
   - Interactive expand/collapse behavior
   - Severity/impact badges with proper contrast

---

# PHASE 4: Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Pass 1 returns invalid JSON | Prompt not fully pasted or escape chain broken | Re-paste the complete system prompt. Verify your 4-step escape chain (RULE 38) is applied to the system prompt Compose output before it enters the concat() body. |
| Pass 1 JSON has generic stage names | Model reverting to template | Add to end of system prompt: "FORBIDDEN stage names: Awareness, Consideration, Decision, Purchase, Post-Purchase, Onboarding, Retention" |
| Pass 1 Do Until loops multiple times | Response exceeding 8K tokens | Normal for very complex documents. The loop handles continuation. If it loops more than 3 times, reduce the output token budget guidance in the system prompt from "5,000" to "3,000". |
| Pass 2 HTML has dark background | Old prompt cached or not fully replaced | Verify system prompt contains `--bg-primary: #FAFAF8`. Check that you deleted ALL of the old prompt before pasting the new one. |
| Pass 2 HTML truncated (no closing tags) | max_tokens too low for complex journey | Increase max_tokens from 12000 to 14000. The Do Until loop should also catch this and continue. |
| Pass 2 Do Until loops 3+ times | HTML very large, each chunk adding 12K tokens | This is working as designed -- the continuation loop assembles the full HTML. If the result is broken HTML, add to the Pass 2 user prompt: "If this is a continuation, resume from exactly where you left off. Do not restart the HTML." (You likely already have this in your continuation logic.) |
| 400 error from Claude API | Unescaped characters in prompt | Check the 4-step escape chain on both system and user prompts. Most common: unescaped double quotes or newlines in the document content. |
| Timeout on HTTP action | Document corpus too large | Reduce to fewer/shorter files, or change Pass 1 max_tokens to 5000 to ensure faster completion per iteration. |
| Badges have poor contrast | Model deviated from specified colors | The prompt includes exact hex values. If the model ignores them, add "FORBIDDEN: Do not use any badge colors not listed in the CSS FOUNDATION." |
| Quotes missing from HTML | Pass 1 extracted no quotes | Check the Pass 1 JSON -- if quotes array is empty, the source data may not contain quotable speech. Normal for numeric/structured data. |
| Model returns markdown-fenced JSON | Claude wrapping JSON in ```json blocks | Add a strip expression to the Compose after HTTP Pass1: `replace(replace(outputs('...'), '```json', ''), '```', '')` |
| "auto-detect from document" not working | Scope params passed as literal string | This is correct behavior -- the new Pass 1 system prompt handles "auto-detect from document" by analyzing all personas/stages found in the data. No change needed. |

---

# Summary: All Changes at a Glance

| # | Action Name | What to Change | Old | New |
|---|---|---|---|---|
| 1 | `Build Pass1 System Prompt` | Replace entire Inputs content | Old extraction prompt | New prompt (Step 1.2) |
| 2 | `Build Pass1 User Prompt` | Update label format around dynamic tokens | Old format | New format (Step 1.3) |
| 3 | `HTTP Pass1` (inside Do Until) | model in Body | claude-opus-4-5-20251101 | claude-sonnet-4-6 |
| 4 | `HTTP Pass1` (inside Do Until) | max_tokens in Body | 64000 | 8000 |
| 5 | `Build Pass2 System Prompt` | Replace entire Inputs content | Old visualization prompt | New prompt (Step 2.2) |
| 6 | `Build Pass2 User Prompt` | Update label format around dynamic tokens | Old format | New format (Step 2.3) |
| 7 | `HTTP Pass2` (inside Do Until) | model in Body | claude-opus-4-5-20251101 | claude-sonnet-4-6 |
| 8 | `HTTP Pass2` (inside Do Until) | max_tokens in Body | 64000 | 12000 |
| 9 | `HTTP Pass2` (inside Do Until) | temperature in Body | 0.3 | 0.2 |

**Total modifications: 9 field changes across 6 actions**
**Total actions in flow: ~25 (unchanged: ~19)**
**Topics changed: 0**
**Variables changed: 0**
**Loop logic changed: 0**
**Tool registrations changed: 0**
**SharePoint actions changed: 0**
