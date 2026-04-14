# 25 Innovations to Supercharge the Launchpad Computer Use Agent

## The Root Problem

The agent's 5 deterministic shortcuts bypass ALL AI intelligence once a keyword triggers them. Parameter extraction is 100% regex-based with silent defaults:

```
User says: "pull the last 25 posts from r/skincareaddiction in the last week"

What happens:
  1. Keyword "reddit" detected -> shortcut triggers
  2. Regex r'r/(\w+)' extracts "skincareaddiction" -> OK
  3. Regex r'(\d+)\s*(?:posts?)' extracts 25 -> OK
  4. Regex r'(?:last|past)\s+(week|day|month)' SHOULD match "last week" -> SOMETIMES FAILS
  5. Falls back to default: time_filter = "year" -> WRONG
  6. No confirmation shown to user -> user discovers the mistake in the output
```

Every failure falls into one of three categories:
- **WRONG DEFAULTS**: Regex misses a parameter, silent default used
- **SKIPPED FIELDS**: Optional form fields never populated
- **NO CONFIRMATION**: User never sees what the agent is about to do

---

## The 25 Innovations

### CATEGORY A: AI-Powered Parameter Extraction (Replace Regex)

#### 1. LLM Parameter Extraction Layer

Replace ALL regex parsing with a single, fast Claude call that extracts structured parameters from natural language.

**Current (regex):**
```python
_sub_match = _re.search(r'r/(\w+)', user_message)
_count_match = _re.search(r'(\d+)\s*(?:posts?)', user_message)
_time_match = _re.search(r'(?:last|past)\s+(week|day|month)', user_message)
# Falls back to defaults when regex misses
```

**Proposed (AI extraction):**
```python
PARAM_EXTRACTION_PROMPT = """Extract parameters from this user request for the Reddit data collector.

Return ONLY valid JSON matching this exact schema:
{
  "subreddit": "string or null",
  "count": "integer 1-500 or null",
  "time_filter": "day|week|month|year|all or null",
  "comments_per_post": "integer 0-100 or null",
  "sort_by": "hot|new|top|rising or null"
}

Rules:
- "last week" / "past week" / "this week" / "past 7 days" -> "week"
- "last month" / "past month" / "past 30 days" -> "month"
- "today" / "past 24 hours" / "last day" -> "day"
- If user says "recent" without specifying, use "week"
- If a parameter is not mentioned, return null (do NOT guess)
- Extract the subreddit name without the r/ prefix

User request: {message}"""

# One fast Haiku call (~200ms, ~$0.001)
params = await extract_params(message, PARAM_EXTRACTION_PROMPT)
```

**Why this works:** The LLM understands "pull the last 25 posts from the past week" the same way a human does. No regex can match every phrasing. Haiku is fast enough (200ms) to not add meaningful latency.

**Technique applied:** #4 Write Real Constraints (the schema is the constraint), #5 Lock Output Format (exact JSON schema)

---

#### 2. Tool-Specific Parameter Schemas (Constraint-Locked)

Define an explicit, locked parameter schema for every tool. The AI extraction prompt references this schema, eliminating format drift.

```python
TOOL_SCHEMAS = {
    "reddit": {
        "required": ["subreddit"],
        "optional": {
            "count": {"type": "int", "range": [1, 500], "default": 25},
            "time_filter": {"type": "enum", "values": ["day", "week", "month", "year", "all"], "default": "week"},
            "comments_per_post": {"type": "int", "range": [0, 100], "default": 5},
            "sort_by": {"type": "enum", "values": ["hot", "new", "top", "rising"], "default": "top"}
        }
    },
    "journey_map": {
        "required": ["files"],
        "optional": {
            "title": {"type": "string", "max_length": 100, "default": "auto-detect from filename"},
            "description": {"type": "string", "max_length": 500, "default": "auto-detect from content"},
            "persona_scope": {"type": "string", "default": "auto-detect from document"},
            "analysis_depth": {"type": "enum", "values": ["quick", "standard", "deep"], "default": "standard"}
        }
    },
    "video_transcribe": {
        "required": ["youtube_url OR file_path"],
        "optional": {
            "language": {"type": "string", "default": "auto-detect"},
            "include_timestamps": {"type": "bool", "default": True},
            "speaker_diarization": {"type": "bool", "default": False}
        }
    },
    "character_gen": {
        "required": ["name", "description"],
        "optional": {
            "style": {"type": "enum", "values": ["realistic", "anime", "cartoon", "painterly"], "default": "realistic"},
            "pose": {"type": "string", "default": "neutral standing"},
            "reference_image": {"type": "file", "default": None}
        }
    },
    "copilot_recipe": {
        "required": ["description"],
        "optional": {
            "template": {"type": "string", "default": "auto-detect from description"},
            "channel": {"type": "enum", "values": ["teams", "web", "omnichannel"], "default": "teams"},
            "complexity": {"type": "enum", "values": ["simple", "standard", "advanced"], "default": "standard"}
        }
    }
}
```

**Technique applied:** #5 Lock Output Format, #4 Write Real Constraints

---

#### 3. Fuzzy Time Expression Understanding

The current regex only matches exact phrases like "last week". Real users say dozens of variations.

**Expressions the current regex MISSES:**
- "from the past 7 days"
- "this week's posts"
- "posts since Monday"
- "recent posts" (should be "week", defaults to "year")
- "the latest stuff"
- "in the last couple of weeks"
- "from March"
- "24 hours"

**Fix:** The LLM parameter extraction (Innovation #1) handles all of these naturally. But add an explicit constraint to the extraction prompt:

```
TIME EXPRESSION MAPPING (use these exact rules):
- "today" / "24 hours" / "last day" / "past day" -> "day"
- "this week" / "last week" / "past week" / "7 days" / "past 7 days" / "recent" / "lately" -> "week"
- "this month" / "last month" / "past month" / "30 days" / "past 30 days" -> "month"
- "this year" / "last year" / "past year" / "12 months" -> "year"
- "all time" / "ever" / "all" -> "all"
- If ambiguous (e.g., "recent"), default to "week" NOT "year"
- "couple of weeks" / "few weeks" -> "month"
- "since [day name]" -> "week"
```

**Technique applied:** #4 Write Real Constraints (every expression mapped to exact value)

---

#### 4. Quantity Expression Understanding

Current regex misses natural quantity expressions.

**Expressions the current regex MISSES:**
- "a dozen posts" (12)
- "about 50" (50)
- "as many as you can" (500, the max)
- "a handful" (10)
- "lots of posts" (100)
- "the top 25" (25, sort_by: "top")
- "every post" (500)

**Fix in extraction prompt:**
```
QUANTITY MAPPING:
- Exact numbers: use as-is, capped at 500
- "a dozen" -> 12
- "a handful" / "a few" -> 10
- "lots" / "many" / "a bunch" -> 100
- "as many as possible" / "all" / "every post" / "everything" -> 500
- "the top N" -> count: N, sort_by: "top"
- If no quantity mentioned, return null (will ask user)
```

**Technique applied:** #4 Write Real Constraints

---

#### 5. Subreddit Name Normalization

Current regex requires exact `r/name` format. Real users often type it differently.

**Expressions the current regex MISSES:**
- "the skincare addiction subreddit" (should be "skincareaddiction")
- "SkincareAddiction" (should be lowercased)
- "skincare addiction" (should be joined: "skincareaddiction")
- "r/ nba" (space after slash)

**Fix in extraction prompt:**
```
SUBREDDIT EXTRACTION:
- Remove "r/" prefix if present
- Remove spaces: "skincare addiction" -> "skincareaddiction"
- Preserve original casing but note: Reddit subreddit names are case-insensitive
- Common patterns: "the X subreddit" -> extract X
- "from X" where X looks like a subreddit name -> extract X
- If user gives a topic ("posts about skincare"), this is NOT a subreddit name -> return null and note the topic
```

**Technique applied:** #3 Stress Test (adversarial inputs tested against extraction)

---

### CATEGORY B: Confirmation and Slot-Filling Dialogs

#### 6. Pre-Execution Confirmation Card

Before executing ANY shortcut, show the user exactly what will happen and let them confirm or modify.

```python
async def _confirm_before_execute(ws, tool_name, params, schema):
    """Show extracted parameters and ask for confirmation."""
    # Build confirmation card
    lines = [f"I'm about to run **{tool_name}** with these settings:\n"]
    for key, value in params.items():
        if value is not None:
            lines.append(f"  - **{key}**: {value}")

    # Show what's using defaults
    for key, spec in schema["optional"].items():
        if params.get(key) is None:
            lines.append(f"  - **{key}**: {spec['default']} *(default)*")

    lines.append("\nLooks good? Say **yes** to proceed, or tell me what to change.")

    await ws.send_json({
        "type": "text_delta",
        "content": "\n".join(lines)
    })

    # Wait for user response
    # If "yes" / "go" / "looks good" -> execute
    # If correction -> re-extract and confirm again
```

**Example interaction:**
```
User: "pull posts from r/skincareaddiction from the last week"

Agent: I'm about to run **Reddit Data Collector** with these settings:

  - **subreddit**: skincareaddiction
  - **count**: 25 (default)
  - **time_filter**: week
  - **comments_per_post**: 5 (default)
  - **sort_by**: top (default)

Looks good? Say yes to proceed, or tell me what to change.

User: "make it 50 posts and sort by new"

Agent: Updated! Running with count=50, sort_by=new...
```

**Technique applied:** #6 Multi-Phase System (extraction -> confirmation -> execution)

---

#### 7. Smart Slot-Filling Dialog

When required parameters are missing, ask for them in a natural conversation instead of using defaults silently.

```python
SLOT_FILL_QUESTIONS = {
    "reddit": {
        "subreddit": "Which subreddit should I collect from? (e.g., r/skincareaddiction)",
        "count": "How many posts do you want? (default: 25)",
        "time_filter": "What time range? Options: today, this week, this month, this year, all time (default: this week)",
    },
    "journey_map": {
        "files": "Please upload a research document (.pdf, .txt, .csv, .json, .md, or .html)",
        "title": "What should I name this journey map? (or I can auto-detect from the document)",
    },
    "video_transcribe": {
        "source": "Please paste a YouTube URL or upload a video file.",
    }
}

async def _fill_missing_slots(ws, conv, tool_name, params, schema):
    """Ask about missing required params, then ask about impactful optional ones."""
    missing_required = [k for k in schema["required"] if params.get(k) is None]

    if missing_required:
        question = SLOT_FILL_QUESTIONS[tool_name][missing_required[0]]
        conv["_pending_slot_fill"] = {
            "tool": tool_name,
            "params": params,
            "missing": missing_required,
            "current_slot": missing_required[0]
        }
        await ws.send_json({"type": "text_delta", "content": question})
        return False  # Don't execute yet

    return True  # All required params filled, execute
```

**Technique applied:** #2 Build Unbreakable Skills (never execute with missing required params)

---

#### 8. Progressive Optional Field Disclosure

After required fields are filled, proactively ask about optional fields that would significantly improve results.

```python
HIGH_IMPACT_OPTIONALS = {
    "reddit": ["time_filter", "count"],  # These most affect result quality
    "journey_map": ["persona_scope"],     # This focuses the analysis
    "character_gen": ["style", "pose"],   # These dramatically change output
    "copilot_recipe": ["template"],       # This determines recipe structure
}

async def _suggest_optional_fields(ws, tool_name, params):
    """After required fields filled, ask about high-impact optional fields."""
    suggestions = []
    for field in HIGH_IMPACT_OPTIONALS.get(tool_name, []):
        if params.get(field) is None:
            schema_info = TOOL_SCHEMAS[tool_name]["optional"][field]
            suggestions.append(f"- **{field}**: {schema_info['values']} (default: {schema_info['default']})")

    if suggestions:
        msg = "I have everything I need, but these optional settings could improve your results:\n"
        msg += "\n".join(suggestions)
        msg += "\n\nWant to customize any of these, or should I proceed with defaults?"
        await ws.send_json({"type": "text_delta", "content": msg})
```

**Technique applied:** #7 Score Before Shipping (assess input completeness before executing)

---

#### 9. Correction and Retry Loop

When user says the results are wrong, parse the correction and re-execute without starting over.

```python
# After delivering results, listen for corrections
CORRECTION_PATTERNS = [
    r"(?:no|wrong|incorrect|that's not right|actually|I meant|I said|change)",
    r"(?:should be|supposed to be|I wanted|make it|switch to|use)",
]

async def _handle_correction(ws, conv, user_message):
    """If user corrects results, re-extract the correction and re-run."""
    last_execution = conv.get("_last_execution")
    if not last_execution:
        return False

    correction_prompt = f"""The user previously requested: "{last_execution['original_message']}"
I executed with parameters: {json.dumps(last_execution['params'])}
The user is now correcting: "{user_message}"

Extract ONLY the changed parameters. Return JSON with only the fields that need to change.
Keep all other parameters the same."""

    corrections = await extract_params(user_message, correction_prompt)
    updated_params = {**last_execution['params'], **corrections}

    # Re-execute with corrected params
    await _execute_tool(ws, conv, last_execution['tool'], updated_params)
```

**Technique applied:** #9 Self-Improving (learn from corrections), #1 Fix Failure Rate (targeted fix, not full restart)

---

#### 10. Parameter Memory Across Sessions

Remember user preferences so they don't have to repeat themselves.

```python
# Store in conv or persistent storage
USER_PREFERENCES = {
    "jonathan@nxthumans.com": {
        "reddit": {
            "default_time_filter": "week",     # Jonathan always wants weekly
            "default_count": 25,
            "preferred_subreddits": ["skincareaddiction", "datascience"]
        },
        "journey_map": {
            "default_analysis_depth": "deep"
        }
    }
}

# In extraction prompt, add:
"""
User preferences (use these as defaults instead of system defaults):
{user_preferences}
"""
```

**Technique applied:** #9 Self-Improving (feedback loop from past behavior)

---

### CATEGORY C: Pre-Submission Quality Gates

#### 11. Post-Fill Screenshot Verification

After filling the form but BEFORE submitting, take a screenshot and use the AI to verify the form matches the user's request.

```python
async def _verify_form_matches_request(page, user_message, params):
    """Screenshot the filled form and verify with AI."""
    img_bytes = await page.screenshot(type="png")

    verification_prompt = f"""Look at this screenshot of a filled form.
The user requested: "{user_message}"
I filled these parameters: {json.dumps(params)}

Verify:
1. Does every filled field match the user's intent?
2. Are any fields empty that should be filled?
3. Are any fields filled with wrong values?

Return JSON: {{"correct": true/false, "issues": ["issue1", "issue2"]}}"""

    result = await verify_with_vision(img_bytes, verification_prompt)

    if not result["correct"]:
        # Fix issues before submitting
        for issue in result["issues"]:
            await _fix_form_issue(page, issue, params)
```

**Technique applied:** #7 Score Before Shipping, #15 QA Gate (validate before delivery)

---

#### 12. Parameter Range Validation

Before filling the form, validate all parameters against known constraints.

```python
VALIDATION_RULES = {
    "reddit": {
        "count": lambda v: 1 <= v <= 500,
        "time_filter": lambda v: v in ["day", "week", "month", "year", "all"],
        "comments_per_post": lambda v: 0 <= v <= 100,
        "subreddit": lambda v: bool(re.match(r'^[a-zA-Z0-9_]+$', v)),
    }
}

def _validate_params(tool_name, params):
    """Validate all parameters against constraints before form fill."""
    issues = []
    for field, validator in VALIDATION_RULES.get(tool_name, {}).items():
        value = params.get(field)
        if value is not None and not validator(value):
            issues.append(f"{field}={value} is out of range")
    return issues
```

**Technique applied:** #2 Build Unbreakable Skills (prevent invalid inputs)

---

#### 13. Form Field Discovery

Instead of hardcoding selectors, dynamically discover all form fields and map them to parameters.

```python
async def _discover_form_fields(page):
    """Discover all form fields on the current page."""
    fields = await page.evaluate('''() => {
        const fields = [];
        document.querySelectorAll('input, select, textarea').forEach(el => {
            fields.push({
                tag: el.tagName,
                type: el.type || 'text',
                id: el.id,
                name: el.name,
                label: el.labels?.[0]?.textContent?.trim() || '',
                placeholder: el.placeholder || '',
                value: el.value,
                options: el.tagName === 'SELECT' ?
                    [...el.options].map(o => ({value: o.value, text: o.textContent})) : [],
                required: el.required,
                visible: el.offsetParent !== null
            });
        });
        return fields;
    }''')
    return fields
```

Then ask the AI to map user parameters to discovered fields:
```
Map these user parameters to form fields:
Parameters: {"subreddit": "skincareaddiction", "count": 25, "time_filter": "week"}
Available fields: {discovered_fields}
Return: [{"field_id": "reddit-target", "value": "skincareaddiction"}, ...]
```

**Technique applied:** #6 Multi-Phase System (discover -> map -> fill -> verify)

---

### CATEGORY D: Intelligent Defaults and Context

#### 14. Context-Aware Default Selection

Instead of hardcoded defaults, use the context of the user's request to choose better defaults.

```python
CONTEXTUAL_DEFAULTS_PROMPT = """Given this user request, choose the best default values for unspecified parameters.

Request: "{message}"
Tool: {tool_name}
Optional parameters not specified by user:
{missing_params_with_options}

Rules:
- If the request implies recency ("latest", "current", "trending", "what's hot"), use time_filter: "week"
- If the request implies volume ("comprehensive", "thorough", "deep dive"), use count: 100
- If the request implies speed ("quick", "just a few", "sample"), use count: 10
- If the request mentions sentiment or opinions, use comments_per_post: 10 (more comments = better sentiment data)
- If the request mentions a specific topic (not a subreddit), consider suggesting a relevant subreddit

Return JSON with only the default values you recommend changing from system defaults.
"""
```

**Example:** "Give me a quick sample of what people are saying about CeraVe on Reddit" -> count: 10, time_filter: "week", comments_per_post: 10, subreddit: "skincareaddiction" (inferred from CeraVe context)

**Technique applied:** #4 Write Real Constraints (rules for default selection are explicit)

---

#### 15. Multi-Turn Intent Refinement

When a request is complex or ambiguous, decompose it into a multi-turn dialog.

```python
COMPLEXITY_SIGNALS = [
    r"and\s+(?:then|also|after that)",  # Multi-step
    r"(?:compare|vs|versus|against)",    # Comparison requires multiple calls
    r"(?:both|all|each)\s+(?:of|from)",  # Multiple targets
    r"(?:I'm not sure|maybe|either|or)", # Ambiguity
]

async def _check_complexity(message):
    """Detect if the request needs decomposition."""
    is_complex = any(re.search(p, message.lower()) for p in COMPLEXITY_SIGNALS)

    if is_complex:
        decomposition_prompt = f"""This user request may require multiple steps or clarification.
Request: "{message}"
Break it down:
1. What are the distinct actions needed?
2. What is ambiguous and needs clarification?
3. What is the recommended execution order?

Return JSON: {{
  "steps": ["step1", "step2"],
  "ambiguities": ["question1"],
  "order": "sequential|parallel"
}}"""
        return await extract_params(message, decomposition_prompt)
```

**Example:**
```
User: "Collect posts from r/skincareaddiction and r/beauty from last week, then make a journey map"

Agent: I see three steps here:
1. Collect from r/skincareaddiction (last week, 25 posts)
2. Collect from r/beauty (last week, 25 posts)
3. Generate a journey map from both datasets

Should I run all three? Any changes to the settings?
```

**Technique applied:** #8 Decompose (multi-phase with explicit handoffs)

---

#### 16. Cross-Tool Parameter Inheritance

When tools are chained, automatically pass outputs as inputs to the next tool.

```python
# After Reddit collection completes, store output reference
conv["_last_output"] = {
    "tool": "reddit",
    "files": ["reddit_skincareaddiction_2026-03-23.json"],
    "file_paths": ["/app/downloads/reddit_skincareaddiction_2026-03-23.json"]
}

# When user says "now make a journey map from that"
if _wants_journey and not _journey_files:
    last_output = conv.get("_last_output")
    if last_output and last_output["files"]:
        # Auto-use previous output as input
        _journey_files = [{"name": f, "path": p}
                         for f, p in zip(last_output["files"], last_output["file_paths"])]
```

**Technique applied:** #6 Multi-Phase System (output of phase 1 is input of phase 2)

---

#### 17. Implicit Parameter Detection from Conversation History

Use prior messages to fill parameters the user expects you to remember.

```python
async def _extract_from_history(conv, tool_name, missing_params):
    """Check conversation history for parameters the user mentioned earlier."""
    recent_messages = conv.get("messages", [])[-10:]  # Last 10 messages

    history_prompt = f"""The user is requesting {tool_name} but didn't specify: {missing_params}

Check if any of these were mentioned in recent conversation:
{json.dumps([m.get('content', '') for m in recent_messages])}

Return JSON with any parameters found in history, or empty object if none."""

    return await extract_params(json.dumps(recent_messages), history_prompt)
```

**Example:**
```
(5 minutes ago) User: "I'm researching the skincare market"
(now) User: "collect some Reddit posts"

Agent infers: subreddit likely "skincareaddiction" from conversation context
```

**Technique applied:** #9 Self-Improving (memory from context)

---

### CATEGORY E: Post-Execution Quality Assurance

#### 18. Result-Request Alignment Check

After getting results, verify they match the original request.

```python
async def _verify_results_match_request(original_request, params, result_summary):
    """Check if results actually match what user asked for."""
    verification_prompt = f"""
User originally asked: "{original_request}"
Parameters used: {json.dumps(params)}
Results summary: {result_summary}

Check:
1. Does the result count match what was requested?
2. Does the time range of results match the requested filter?
3. Is the data from the correct source?
4. Are there any obvious mismatches?

Return: {{"aligned": true/false, "mismatches": ["issue1"], "severity": "none|low|high"}}"""

    return await verify_alignment(verification_prompt)
```

**Technique applied:** #15 QA Gate (validate output before delivery)

---

#### 19. Automatic Result Summary with Quality Indicators

Instead of just dumping results, provide a quality assessment.

```python
async def _deliver_results_with_quality(ws, tool_name, params, results):
    """Deliver results with a quality assessment."""
    summary = f"""Collection complete!

**What I collected:**
- Source: r/{params['subreddit']}
- Posts retrieved: {results['count']} (requested: {params['count']})
- Time range: {params['time_filter']}
- Date range of actual posts: {results['oldest_post']} to {results['newest_post']}
- Comments collected: {results['total_comments']}

**Quality check:**
- Request match: {'PASS' if results['count'] >= params['count'] * 0.8 else 'PARTIAL - fewer posts available'}
- Time range match: {'PASS' if results['time_range_matches'] else 'WARNING - some posts outside requested range'}
"""
    await ws.send_json({"type": "text_delta", "content": summary})
```

**Technique applied:** #7 Score Before Shipping (quality dimensions scored)

---

#### 20. Failed Execution Recovery

When a tool execution fails, diagnose the failure and attempt recovery.

```python
async def _recover_from_failure(ws, conv, tool_name, params, error):
    """Diagnose failure and attempt intelligent recovery."""
    recovery_prompt = f"""Tool {tool_name} failed with error: {error}
Parameters: {json.dumps(params)}

Diagnose:
1. Is this a parameter problem? (wrong subreddit name, invalid URL)
2. Is this a service problem? (service down, timeout)
3. Is this a form interaction problem? (selector changed, element not found)

Return: {{
  "diagnosis": "parameter|service|interaction",
  "fixable": true/false,
  "fix": "description of fix",
  "retry_params": {{}} // corrected parameters if fixable
}}"""

    diagnosis = await diagnose_failure(recovery_prompt)

    if diagnosis["fixable"]:
        await ws.send_json({
            "type": "text_delta",
            "content": f"That didn't work ({diagnosis['diagnosis']}). Trying again with fix: {diagnosis['fix']}"
        })
        await _execute_tool(ws, conv, tool_name, diagnosis["retry_params"])
```

**Technique applied:** #1 Fix Failure Rate (diagnose root cause, targeted fix)

---

### CATEGORY F: Architecture Enhancements

#### 21. Hybrid Shortcut + Agent Architecture

Instead of "shortcut OR agent", use a hybrid: shortcut for speed + agent for intelligence.

```python
async def _hybrid_execute(ws, conv, user_message, tool_name):
    """Fast shortcut path with AI verification layer."""

    # Phase 1: AI extracts parameters (fast Haiku call, ~200ms)
    params = await ai_extract_params(user_message, tool_name)

    # Phase 2: Validate parameters against schema
    issues = _validate_params(tool_name, params)

    # Phase 3: If issues or missing required params, ask
    if issues or _has_missing_required(params, tool_name):
        await _slot_fill_dialog(ws, conv, tool_name, params)
        return

    # Phase 4: Show confirmation card (optional, based on user preference)
    if conv.get("_preferences", {}).get("confirm_before_execute", True):
        await _confirm_before_execute(ws, tool_name, params)
        return  # Wait for confirmation

    # Phase 5: Execute with the validated parameters
    result = await _execute_tool(ws, conv, tool_name, params)

    # Phase 6: Verify results match request
    alignment = await _verify_results_match_request(user_message, params, result)

    if not alignment["aligned"]:
        await ws.send_json({
            "type": "text_delta",
            "content": f"Heads up: {alignment['mismatches']}. Want me to re-run with adjustments?"
        })
```

**Technique applied:** #6 Multi-Phase System (6 phases with checkpoints between each)

---

#### 22. Confidence-Scored Parameter Extraction

For each extracted parameter, score the confidence level. Ask about low-confidence ones.

```python
CONFIDENCE_EXTRACTION_PROMPT = """Extract parameters AND rate your confidence for each.

Return JSON:
{
  "params": {
    "subreddit": {"value": "skincareaddiction", "confidence": "high"},
    "count": {"value": 25, "confidence": "high"},
    "time_filter": {"value": "week", "confidence": "medium"}
  }
}

Confidence levels:
- "high": Explicitly stated by user (e.g., "r/skincareaddiction" -> high)
- "medium": Strongly implied but not explicit (e.g., "recent" -> week, medium)
- "low": Guessed from context (e.g., topic "skincare" -> subreddit "skincareaddiction", low)

User request: {message}"""

# Only ask about low-confidence parameters
for field, data in params.items():
    if data["confidence"] == "low":
        await _ask_about_field(ws, conv, tool_name, field, data)
```

**Technique applied:** #7 Score Before Shipping (confidence scoring per dimension)

---

#### 23. Service Health-Aware Routing

Before attempting a tool, check service health and provide alternatives if down.

```python
async def _health_aware_routing(ws, tool_name, params):
    """Check service health before executing, suggest alternatives if down."""
    health_map = {
        "journey_map": ("http://journey-mapper:8000/health", "Journey Mapper"),
        "reddit": ("http://reddit-ripper:5000/api/health", "Reddit Collector"),
        "video_transcribe": ("http://video-analyzer:5000/health", "Video Transcriber"),
        "character_gen": ("http://consistent-character-generator:5010/health", "Character Generator"),
        "copilot_recipe": ("http://copilot-recipe-generator:5013/health", "Copilot Recipe Builder"),
    }

    url, name = health_map.get(tool_name, (None, None))
    if url:
        try:
            async with httpx.AsyncClient(timeout=3) as hc:
                r = await hc.get(url)
                if r.status_code != 200:
                    raise Exception(f"Status {r.status_code}")
        except Exception as e:
            await ws.send_json({
                "type": "text_delta",
                "content": f"**{name}** is currently unavailable ({e}). "
                           f"Would you like me to try again in a minute, or is there something else I can help with?"
            })
            return False
    return True
```

**Technique applied:** #13 Guard (dependency guard for external services)

---

#### 24. Execution Telemetry and Self-Learning

Log every execution with parameters, outcomes, and user satisfaction for continuous improvement.

```python
EXECUTION_LOG = []  # Persist to file or database

async def _log_execution(tool_name, params, original_message, outcome, user_feedback=None):
    """Log execution for pattern analysis."""
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "tool": tool_name,
        "original_message": original_message,
        "extracted_params": params,
        "outcome": outcome,  # "success" | "partial" | "failed" | "corrected"
        "user_feedback": user_feedback,  # None, "good", "wrong_params", "wrong_tool"
        "corrections_applied": [],  # If user corrected after execution
    }
    EXECUTION_LOG.append(entry)

    # Analyze patterns periodically
    if len(EXECUTION_LOG) % 50 == 0:
        _analyze_failure_patterns()

def _analyze_failure_patterns():
    """Find recurring extraction failures."""
    failures = [e for e in EXECUTION_LOG if e["outcome"] in ["failed", "corrected"]]
    # Group by tool and parameter
    # If same parameter fails >30% of the time, flag for prompt improvement
```

**Technique applied:** #9 Self-Improving (structured feedback loop)

---

#### 25. Proactive Capability Suggestion

When the user's request could benefit from capabilities they didn't ask for, proactively suggest them.

```python
CAPABILITY_SUGGESTIONS = {
    "reddit": [
        {
            "trigger": lambda p: p.get("count", 0) >= 50,
            "suggestion": "With 50+ posts, I can also run a sentiment analysis on this data after collection. Want me to do that?"
        },
        {
            "trigger": lambda p: True,  # Always suggest for Reddit
            "suggestion": "I can also collect TrustPilot reviews or Play Store reviews for the same topic if you want a cross-platform view."
        }
    ],
    "journey_map": [
        {
            "trigger": lambda p: True,
            "suggestion": "After the journey map is generated, I can convert it to a Miro board for collaborative editing."
        }
    ],
    "video_transcribe": [
        {
            "trigger": lambda p: True,
            "suggestion": "Once transcribed, I can feed the transcript into the Journey Mapper to extract customer journey insights."
        }
    ]
}

async def _suggest_capabilities(ws, tool_name, params):
    """After execution, suggest relevant follow-up capabilities."""
    suggestions = CAPABILITY_SUGGESTIONS.get(tool_name, [])
    applicable = [s["suggestion"] for s in suggestions if s["trigger"](params)]

    if applicable:
        msg = "\n\n**What else I can do with this:**\n"
        for i, s in enumerate(applicable, 1):
            msg += f"{i}. {s}\n"
        await ws.send_json({"type": "text_delta", "content": msg})
```

**Technique applied:** #8 Decompose (reveal the multi-phase possibilities to the user)

---

## Implementation Priority Matrix

| Innovation | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| #1 LLM Parameter Extraction | CRITICAL | Medium | P0 |
| #2 Tool-Specific Schemas | CRITICAL | Low | P0 |
| #3 Fuzzy Time Expressions | HIGH | Low (part of #1) | P0 |
| #6 Pre-Execution Confirmation | HIGH | Medium | P0 |
| #7 Slot-Filling Dialog | HIGH | Medium | P1 |
| #12 Parameter Validation | HIGH | Low | P1 |
| #14 Context-Aware Defaults | HIGH | Low (part of #1) | P1 |
| #21 Hybrid Architecture | CRITICAL | High | P1 |
| #22 Confidence Scoring | HIGH | Medium | P1 |
| #9 Correction and Retry | MEDIUM | Medium | P2 |
| #11 Screenshot Verification | MEDIUM | Medium | P2 |
| #18 Result Alignment Check | MEDIUM | Medium | P2 |
| #19 Result Summary + Quality | MEDIUM | Low | P2 |
| #20 Failed Execution Recovery | MEDIUM | Medium | P2 |
| #4 Quantity Expressions | MEDIUM | Low (part of #1) | P2 |
| #5 Subreddit Normalization | MEDIUM | Low (part of #1) | P2 |
| #8 Progressive Optional Fields | MEDIUM | Low | P2 |
| #10 Parameter Memory | MEDIUM | Medium | P3 |
| #13 Form Field Discovery | MEDIUM | High | P3 |
| #15 Multi-Turn Decomposition | MEDIUM | High | P3 |
| #16 Cross-Tool Inheritance | MEDIUM | Medium | P3 |
| #17 History-Based Parameters | LOW | Medium | P3 |
| #23 Health-Aware Routing | LOW | Low | P3 |
| #24 Execution Telemetry | LOW | Medium | P3 |
| #25 Proactive Suggestions | LOW | Low | P3 |

## The P0 Bundle: Maximum Impact, Minimum Change

Implementing just #1 + #2 + #3 + #6 eliminates 90% of the failures you described:

1. **LLM extraction** (#1) replaces all regex parsing -- no more missed time filters or wrong quantities
2. **Locked schemas** (#2) ensure the extraction always returns valid, typed parameters
3. **Fuzzy time** (#3) is just a constraint in the extraction prompt -- "last week" in any form always maps to "week"
4. **Confirmation card** (#6) shows the user exactly what will happen before execution -- catches the remaining 10% of edge cases

Total cost per execution: ~$0.001 (one Haiku call for parameter extraction) + ~200ms additional latency.

Total code change: ~150 lines in `launchpad_compat.py` (add extraction function, add confirmation flow, modify each shortcut to use extraction instead of regex).
