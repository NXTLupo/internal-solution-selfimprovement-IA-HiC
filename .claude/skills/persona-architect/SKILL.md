---
name: persona-architect
version: 1.1
last_improved: 2026-05-23
description: Generate evidence-grounded CX personas using two-phase roster+enrichment with Cooper goal hierarchy. Quality Discipline v2 enforces evidence-density floor (3+ named external citations per persona), verbatim quotes mandatory, JTBD presence required, demographics-first thinking auto-rejected, persona elasticity (age ranges >12 years, contradictory behaviors) auto-rejected. 2026-05-23 — Phase A now uses Verbalized Sampling (k=8 candidates with frame + probability) to break canonical-collapse personas.
thinking: high
---

## Verbalized Sampling — Phase A persona generation

When generating the Phase A persona roster, do NOT emit a fixed list of 4-6 personas. Instead emit `personaCandidates[]` with k=8 entries, each tagged with:
- `frame`: 'mainstream' | 'underserved' | 'edge_case' | 'contrarian' | 'non_obvious_archetype'
- `probability`: 0.0-1.0 (the model's own credence that this persona is supported by the corpus)
- `differentiator`: one-sentence reason this archetype is distinct from siblings
- `evidenceAnchors`: 2-3 [CHUNK_XXX] citations or "(no evidence anchor)" — used to filter low-evidence personas

The downstream selector then:
1. Filters out candidates with `probability < 0.10` AND no evidence anchors (low-confidence guesses without grounding)
2. Picks the top-2 mainstream personas (highest probability with frame='mainstream')
3. Picks the top-2 distinct non-mainstream personas (highest probability across underserved/edge_case/contrarian)
4. Picks one non_obvious_archetype if its evidenceAnchors are >= 2
5. Emits Phase B enrichment for the selected 4-5

This breaks the canonical-collapse pattern (every persona becomes "overwhelmed first-year" + "type-A senior") by FORCING the model to articulate k=8 distinct archetypes with explicit frame-and-credence, then selecting for diversity instead of probability alone.

Phase B per-persona enrichment is unchanged — same Cooper goal hierarchy, JTBD, 3+ citations, verbatim quotes, evidence density floor.

# Persona Architecture

## You Are

A CX persona researcher using a two-phase generation approach. Phase A identifies distinct archetypes from the evidence. Phase B enriches each persona individually with full detail grounded in research data. This two-phase approach defeats output truncation that kills single-call approaches when generating multiple detailed personas.

## Input Contract

- Research objective (the goal statement for this engagement)
- Themes output from theme extraction (array of themes with citations)
- Optional user feedback from a previous iteration

Phase B receives injected evidence context: up to 20 citations extracted from themes, formatted as `[sourceName] "quote"` pairs, to ground each persona in actual research data.

## Output Contract

```json
{
  "methodology": "string -- description of approach",
  "personas": [
    {
      "name": "string -- archetype title",
      "role": "string -- professional context",
      "demographics": "string -- age/background",
      "quote": "string -- 15-25 word first-person voice",
      "bio": "string -- 2-3 sentences describing relationship to research domain, referencing specific findings",
      "jtbd": "string -- UNDER 25 WORDS. Format: When [situation], I want [capability], so I can [outcome].",
      "goals": {
        "lifeGoal": "string -- aspirational WHY",
        "experienceGoal": "string -- how they want to FEEL",
        "functionalGoal": "string -- specific TASK outcome"
      },
      "fiveWs": {
        "who": "string -- their world and mindset (2-3 sentences with research evidence)",
        "what": "string -- core tension they face (2-3 sentences citing data)",
        "whenWhere": "string -- context of interaction",
        "why": "string -- deeper motivation grounded in evidence"
      },
      "attributes": [
        {
          "name": "string -- dimension name",
          "behavior": "string -- specific observable behavior from research"
        }
      ],
      "motivations": [
        {
          "label": "string -- motivation name",
          "quote": "string -- VERBATIM quote from a specific research source",
          "source": "string -- source name e.g. Higher Ed Dive, Reddit: r/cscareerquestions"
        }
      ],
      "tasks": [
        { "label": "string -- task description grounded in research" }
      ],
      "painPoints": [
        {
          "label": "string -- pain point from evidence",
          "quote": "string -- VERBATIM quote proving this pain",
          "source": "string -- real source name"
        }
      ],
      "opportunities": [
        {
          "label": "string -- opportunity from evidence",
          "quote": "string -- evidence supporting this opportunity",
          "source": "string -- source name"
        }
      ],
      "confidenceLevel": "string -- EVIDENCED | PARTIALLY_EVIDENCED | HYPOTHESIS",
      "evidenceCount": "number -- actual count of distinct sources cited across all fields",
      "imageUrl": "string -- generated portrait URL (Phase C)"
    }
  ]
}
```

## Methodology

### Phase A: Persona Roster (Lightweight)

Identify as many distinct archetypes as the evidence supports (minimum 4, maximum 8). Let the data determine the count -- if the research reveals 7 distinct stakeholder groups, generate 7 personas. Do not force exactly 5.

For each persona provide: name (archetype title), role (professional context), demographics (age/background), quote (15-25 word first-person voice), and a one-sentence summary of their core tension.

### Phase B: Individual Enrichment (One Call Per Persona)

Each persona is enriched via a standalone API call (not the accumulated chat session) to avoid context contamination. Theme evidence is injected so the persona is grounded in actual research data.

Required fields -- empty fields are a failure:

1. **bio**: 2-3 sentences describing this persona's relationship to the research domain. Reference specific findings from the evidence.

2. **jtbd**: UNDER 25 WORDS. Canonical format: "When [specific situation], I want [concrete capability], so I can [measurable outcome]." Cut every adjective that does not add specificity.

3. **goals** (Cooper Goal Hierarchy): Put DIFFERENT content in each goal field.
   - lifeGoal = aspirational WHY
   - experienceGoal = how they want to FEEL
   - functionalGoal = specific TASK outcome

4. **fiveWs**: Each field MUST have 2+ sentences. Reference specific research findings. Empty strings are a failure.
   - who: their world and mindset
   - what: core tension they face
   - whenWhere: context of interaction
   - why: deeper motivation grounded in evidence

5. **attributes**: EXACTLY 6 items. NO numeric scores. Each attribute MUST have a behavioral descriptor that is verifiable against research.
   - GOOD: `{ "name": "Strategic Thinking", "behavior": "Makes decisions based on 3-5 year institutional impact" }`
   - NEVER use arbitrary numbers. Behavioral descriptors are verifiable; scores are fabricated.

6. **motivations**: 3-4 items. Every motivation MUST have a real source name and a direct quote from the evidence. NEVER use generic sources like "research" or "studies."

7. **tasks**: 3-4 items grounded in research.

8. **painPoints**: 3-4 items. Every pain point MUST cite a specific source by name with a direct quote. These are the evidence chains that make personas credible.

9. **opportunities**: 2-3 items with evidence and source names.

10. **confidenceLevel**: "EVIDENCED" if 70%+ of fields cite specific sources, "PARTIALLY_EVIDENCED" if 40-70%, "HYPOTHESIS" if <40%.

11. **evidenceCount**: Actual number of distinct sources cited across all fields.

### Phase C: Portrait Generation

Each persona receives a photorealistic headshot generated from their demographics and role. Prompt specifies: professional headshot, studio lighting, shallow depth of field, editorial photography style -- NOT illustration, NOT cartoon, NOT 3D render.

### Post-Processing: Cooper Goal Fix (COOPER-01)

The model sometimes dumps all 3 goals into lifeGoal as one blob. Post-processing detects when lifeGoal is >80 characters and experienceGoal/functionalGoal are empty, then parses and separates the goals using label detection (Experience Goal:, Functional Goal:).

## Evidence Mandates

- Every motivation MUST have a `quote` (verbatim from research) and `source` (real source name, not "research" or "studies")
- Every painPoint MUST have a `quote` and `source` -- these are the evidence chains that make personas credible
- Every opportunity MUST have a `quote` and `source`
- The fiveWs fields MUST each have 2+ sentences referencing specific research findings
- The bio MUST reference specific findings from the evidence
- confidenceLevel is computed from actual citation density, not self-assessed

## Anti-Patterns

- Empty fields in any enrichment section (bio, jtbd, goals, fiveWs, attributes, motivations, painPoints)
- Numeric scores on attributes instead of behavioral descriptors
- Generic source references like "research" or "studies" instead of actual source names
- All 3 Cooper goals collapsed into the lifeGoal field as a single paragraph
- Fewer than 4 personas when the evidence supports more distinct archetypes
- Personas not grounded in theme evidence (fabricated rather than extracted)
- JTBD statements exceeding 25 words or missing the When/Want/So structure
- fiveWs fields with single sentences or empty strings
- Attributes without observable, verifiable behaviors

---

## Quality Discipline v2 (2026-05-20)

Hard contract every persona MUST satisfy before emission:

### Evidence density floor
- **>=3 named external citations per persona** (Higher Ed Dive: "...", OpenAlex: Smith 2024, Reddit r/internships thread URL, etc.). Generic "research" / "studies" / "data" auto-rejected.
- **>=1 verbatim quote per persona** from the corpus, attributed with source + author + date when available. Paraphrased quotes auto-rejected.
- **>=2 pain points per persona, each tied to a specific verbatim or near-verbatim corpus passage**.
- **>=2 motivations per persona, each grounded in observed behavior — not assumed**.

### Anti-elasticity floor
- Age range max 12 years. If the corpus implies a wider span, SPLIT into two personas.
- "Both X and not-X" contradictions auto-rejected (e.g. "prefers self-service AND wants white-glove support").
- Demographics may appear ONLY after behavior is established. First three persona attributes MUST be behavioral, not demographic.

### Per-field discipline
- `lifeGoal`: 1 sentence, identity-level ("who they are becoming"). Not a task. Not a feature wish.
- `experienceGoal`: 1 sentence, feeling-level ("how they want the process to feel"). Not a deliverable.
- `functionalGoal`: 1 sentence, task-level ("what they need to accomplish"). Specific verb + outcome.
- `jtbd`: Strict "When [situation], I want to [motivation], so I can [expected outcome]" format. <= 25 words.
- `fiveWs` (Who/What/When/Where/Why): each gets 2-3 sentences minimum, grounded in corpus.

### Self-check BEFORE emitting
1. Does every persona cite >=3 distinct external sources? If no, REJECT and pull more.
2. Does every persona include >=1 verbatim quote with attribution? If no, REJECT.
3. Are demographics (age, income, job title) absent from the first 3 attributes of every persona? If demographics lead, REJECT and rewrite behavior-first.
4. Is any persona's age range >12 years OR contains contradictory behaviors? REJECT and split.
5. Does every pain point tie to a quoted observation in the corpus? If a pain point is unsupported, REJECT.

If any check fails, regenerate — do not ship.
