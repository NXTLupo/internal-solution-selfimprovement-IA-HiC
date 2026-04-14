# UNIVERSAL RESEARCH PROMPT TEMPLATE
# Generalized from HiC Research + Deep Research reference prompt
# Applicable to any research request — substitute {{variables}} with specifics

---

## TEMPLATE STRUCTURE (12 mandatory sections)

### SECTION 1: IDENTITY AND TEMPORAL CONTEXT
```
You are a {{ROLE}} performing {{TASK_TYPE}} research.
Date of research: {{DATE}} ({{TIMEZONE}}).
Language: {{LANGUAGE}}.
```

**Why this matters:** Grounds the model in a specific role and time. Prevents use of outdated information. The date is critical for freshness verification.

### SECTION 2: TASK DEFINITION WITH HARD CONSTRAINTS
```
TASK: {{SPECIFIC_OBJECTIVE}}

HARD CONSTRAINTS:
- Generate EXACTLY {{COUNT}} items (not fewer, not more)
- Each item MUST include ALL {{REQUIRED_FIELD_COUNT}} required fields
- If a field value is unknown after checking, write "unspecified" (do NOT guess)
- Total output must be a single valid JSON object matching the schema below
```

**Why this matters:** Vague objectives produce vague output. "Find some sources" vs "Find EXACTLY 100 sources with 15 fields each" produces categorically different quality. Hard counts prevent truncation.

### SECTION 3: DEDUPLICATION AND EXCLUSION
```
DEDUPLICATION REQUIREMENT:
1. Build an exclusion set from prior context:
   - Extract all {{ENTITY_TYPE}} previously identified in this conversation
   - Normalize for comparison (lowercase, strip variants, canonicalize)
2. Your output MUST NOT include anything in the exclusion set
3. Deduplicate WITHIN your output: no near-duplicates
```

**Why this matters:** Without explicit dedup instructions, models repeat themselves across runs and within outputs. The normalization rules prevent surface-level name changes from bypassing dedup.

### SECTION 4: CATEGORICAL FRAMEWORK (forced multi-dimensional coverage)
```
CATEGORIES (every item MUST be labeled with exactly one):
{{CATEGORY_LIST}}

DIMENSIONAL COVERAGE REQUIREMENT:
Analyze through these {{N}} lenses simultaneously. Every lens MUST produce at least 1 result:
1. {{DIMENSION_1}}: {{DESCRIPTION}}
2. {{DIMENSION_2}}: {{DESCRIPTION}}
...
```

**Why this matters:** Without forced dimensions, the model gravitates toward whatever's easiest. Mandatory multi-lens analysis prevents blind spots. This is HiC's strongest pattern.

### SECTION 5: QUALITY AND SOURCE RULES
```
SOURCE QUALITY RULES:
- Prioritize {{PRIMARY_SOURCE_TYPES}} over {{SECONDARY_SOURCE_TYPES}}
- NO PRE-ASSIGNED CREDIBILITY TIERS: judge every source by its SPECIFIC CONTRIBUTION
  to the research objective, not its category
- The strongest findings have CONVERGENT evidence: multiple independent sources pointing
  to the same conclusion
- If a source has both free and paid tiers, include ONLY if a meaningful free tier exists
- Every claim must be traceable to a specific source

ANTI-HALLUCINATION:
- If a detail is unknown after checking, write "unspecified"
- Do NOT fabricate statistics, vendor names, or URLs
- Do NOT infer capabilities that aren't documented
```

**Why this matters:** The source-equality principle from HiC is more sophisticated than static tier lists. Combined with the anti-hallucination rules from the reference template, it produces honest output.

### SECTION 6: MULTI-STEP RESEARCH METHODOLOGY
```
RESEARCH STEPS (follow in order):

A) DISCOVER: {{DISCOVERY_INSTRUCTIONS}}
   - Look specifically for: {{DISCOVERY_TARGETS}}
   - Search across: {{SEARCH_SCOPE}}

B) VERIFY: For each candidate:
   - Confirm {{VERIFICATION_CRITERIA}}
   - If verification fails, discard and replace

C) COLLECT: For each verified item, capture ALL required fields:
   {{FIELD_SCHEMA}}

D) VALIDATE: Before finalizing:
   - Confirm count == {{EXPECTED_COUNT}}
   - Confirm no duplicates within output
   - Confirm no overlap with exclusion set
   - Confirm every item has all required fields populated (or "unspecified")
```

**Why this matters:** Single-step "find me stuff" produces shallow results. Multi-step (discover, verify, collect, validate) forces thoroughness and catches errors before output.

### SECTION 7: REQUIRED FIELD SCHEMA
```
FOR EACH {{ENTITY_TYPE}}, provide ALL fields below:
- {{field_1}}: {{description}} (REQUIRED)
- {{field_2}}: {{description}} (REQUIRED)
- {{field_3}}: {{description}} (if unknown, "unspecified")
...

OUTPUT SCHEMA:
{
  "methodology": "string — brief description of research approach taken",
  "items": [
    { {{FIELD_DEFINITIONS}} }
  ]
}
```

**Why this matters:** Explicit field schemas prevent the model from deciding what's "important enough" to include. The "if unknown, unspecified" pattern is critical — it separates verified absence from lazy omission.

### SECTION 8: CITATION REQUIREMENTS
```
CITATION REQUIREMENTS:
- Every non-trivial factual claim MUST cite its source
- Use {{CITATION_FORMAT}} format (e.g., [CHUNK_XXX], inline URL, parenthetical)
- Prefer primary/official documentation over secondary summaries
- Do not exceed 25 words quoted from a single source
- Citations must span the FULL range of available evidence — not just the first items
```

**Why this matters:** Without citation requirements, models confabulate freely. With them, every claim has a paper trail.

### SECTION 9: CROSS-CORPUS COVERAGE MANDATE
```
MANDATORY COVERAGE — READ THE ENTIRE INPUT:
- Your input contains {{N}} items organized by {{ORGANIZATION_METHOD}}
- You MUST process items from ALL sections, not just the first {{SMALL_NUMBER}}
- Valid analysis has citations spread across: early items, middle items, AND late items
- If all your citations come from the first 20% of the input, your analysis is INCOMPLETE
```

**Why this matters:** This is HiC's killer innovation. Without this instruction, models process the first ~30% of input and stop. Explicit coverage mandates force full-corpus analysis.

### SECTION 10: ANTI-PATTERNS AND REJECTION CRITERIA
```
ANTI-PATTERNS (output matching any of these will be rejected):
- {{AP_1}}: {{description}} — {{detection_rule}}
- {{AP_2}}: {{description}} — {{detection_rule}}
...

If you detect your own output matching an anti-pattern, revise it before submitting.
```

**Why this matters:** Telling the model what NOT to do is as important as telling it what to do. Explicit rejection criteria create a self-check loop.

### SECTION 11: OUTPUT FORMAT LOCK
```
OUTPUT FORMAT (STRICT):
1. {{FORMAT_ELEMENT_1}}: {{specification}}
2. {{FORMAT_ELEMENT_2}}: {{specification}}
...

FORMAT VALIDATION:
- Confirm {{VALIDATION_CHECK_1}}
- Confirm {{VALIDATION_CHECK_2}}
- If any check fails, fix before outputting
```

**Why this matters:** Format drift is the #1 cause of downstream parsing failures. Explicit format locks with self-validation prevent it.

### SECTION 12: FEEDBACK INTEGRATION
```
{{IF_FEEDBACK}}
CRITICAL USER FEEDBACK (OVERRIDE ALL DEFAULTS):
The user has reviewed previous output and is requesting changes.
Their feedback takes PRIORITY over all other instructions:
"{{FEEDBACK_TEXT}}"
Follow their direction exactly. If they ask for more items, generate more.
If they ask for different focus, shift focus entirely.
{{END_IF}}
```

**Why this matters:** This is the Human-in-Control pattern. User feedback must be architecturally integrated into the prompt, not appended as an afterthought.

---

## USAGE EXAMPLE: Adapting for a Market Research Request

```
You are a senior market intelligence analyst performing competitive landscape research.
Date: 2026-04-12 (America/Los_Angeles). Language: English.

TASK: Identify EXACTLY 15 direct competitors and 5 adjacent-market players
for {{COMPANY}} in the {{INDUSTRY}} space.

HARD CONSTRAINTS:
- 20 total profiles (15 direct + 5 adjacent)
- Each profile MUST include ALL 12 required fields
- If unknown, write "unspecified"

DEDUPLICATION: No company may appear twice. Normalize names (ignore Inc/Ltd/Corp suffixes).

CATEGORIES: direct_competitor | adjacent_market

DIMENSIONAL COVERAGE (every lens must produce at least 1 competitor):
1. PRODUCT: Who competes on features/capabilities?
2. MARKET: Who competes for the same customer segment?
3. TECHNOLOGY: Who has comparable or superior tech stack?
4. PRICING: Who competes on cost structure?
5. GEOGRAPHIC: Who competes in the same markets?

... [continues with Sections 5-12]
```

---

## KEY DIFFERENCES FROM HiC'S CURRENT APPROACH

| Current HiC | This Template Adds |
|---|---|
| Query refinement is 1 step (4-8 keywords) | Multi-step: Discover → Verify → Collect → Validate |
| No deduplication across runs | Explicit exclusion sets with normalization |
| Theme count is a range (12-25) | Hard count with validation ("EXACTLY N") |
| "unspecified" only in some prompts | Systematic "unspecified" fallback for ALL unknown fields |
| Anti-patterns in wiki, not in prompt | Anti-patterns embedded directly in the generation prompt |
| Feedback appended at end of prompt | Feedback as OVERRIDE block with priority instruction |
| No output self-validation | Explicit validation checklist before finalizing |
