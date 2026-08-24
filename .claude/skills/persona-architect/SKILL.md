---
name: persona-architect
invocation: runtime
disable-model-invocation: true
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

## IMAGERY CONTRACT (2026-08-07, owner-directed - BINDING for every persona artifact)

Personas are VISUAL artifacts. Every persona emits image-slot payloads for the runtime
generators (visual router / Nano-Banana lane), derived from EVIDENCE, never from stereotype:

1. PORTRAIT (one per persona): `GENERATE: photorealistic editorial portrait derived from THIS
   persona's research-evidenced demographics and behaviors; neutral studio background; natural
   light; no text.` The portrait prompt names only attributes the corpus evidences (age range,
   work context, energy); NEVER invented ethnicity/gender specifics beyond evidence, NEVER
   glamour-stock aesthetics.
2. LIFESTYLE/BEHAVIOR SCENES (2-3 per persona): each scene visualizes ONE evidenced behavior
   or context from the persona's data - the scene prompt QUOTES the behavior it renders (e.g.
   "portfolio rebuild at a kitchen table, late-night laptop glow" from the evidenced
   night-before-deadline behavior). Contract per scene: content-true to a named behavior;
   muted duotone with brand accent; no readable faces in scenes; no embedded text.
3. PROMPT SHAPE (mandatory): every image-slot prompt uses `GENERATE: [photo-portrait|
   photo-scene] - [subject, one plain clause] - DERIVED FROM: [the persona field this image
   depicts, quoted] - SOURCE ANALYSIS: [field name + its cited source]`. The DERIVED FROM
   clause quotes the actual demographics sentence (portrait) or the exact behaviors[] entry
   (scene); when the field carries a verbatim corpus quote, depict the situation in the
   quote. A bare topic word in place of the quoted field is a violation - the image depicts
   the FINDING, not the industry.
4. REUSE FIRST (owner cost rule, 2026-08-07): the runtime lane (`/api/ai/illustration`)
   reuses catalog images by concept id; check GET /api/ai/illustrations for a
   content-matching image before proposing a fresh concept. Never burn generation budget on
   a concept the library already depicts.
5. Slots ride the standard `img-slot` contract (exemplar canon: DS/PersonaIdentity portrait +
   lifestyle-imagery strip, Figma EOWX9FhPtdoP05udKTxN94 page #personas). Image-free is a
   FAILURE for personas unless the corpus is too thin to evidence any behavior - in which
   case say so in the trace, never fill with decoration.

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


## Dimensional Extensibility Contract

The hand-authored exemplar for this deliverable is a FLOOR, not a ceiling. It shows the
minimum viable shape; a real engagement should grow the artifact to the depth the data
and the client conversation justify. Treat every dimension below as an axis to populate
when there is evidence, and to expand on request.

### Dimensions this artifact can carry
- archetype name (defining behavior, not a first name)
- tagline / defining quote-of-self
- context and environment
- scenario (a day-in-the-life moment)
- observable behaviors
- end goals
- experience goals
- motivations / what drives them
- frustrations / pains
- needs / what would help
- jobs-to-be-done
- verbatim sourced quote(s)
- tools and channels used
- relationships / stakeholders
- anti-persona contrast
- evidence citations (3+ named external)

### When to add or deepen a dimension
1. EVIDENCE-DRIVEN (default). For each dimension above, populate it when the corpus /
   manifest contains supporting evidence (a named source plus a verbatim quote or named
   entity). More evidence means more dimensions populated and more items per dimension:
   volume of insight is proportional to volume of data (see the yield ledger). Never pad
   to fill a dimension; if the evidence is not there, omit the dimension rather than
   fabricate (No-Fabrication rule), and record it as available-on-future-data.
2. REQUEST-DRIVEN. When the user asks for changes or additions in the AI Analyst Desk
   chat or the Designer Chat, treat the request as authoritative. Add or expand the named
   dimension, re-grounding it in corpus evidence. If the user asks for a dimension the
   corpus cannot support, say so plainly and offer to ingest sources that would; do not
   invent content to satisfy the request.
3. SURGICAL RE-GENERATION. A chat-driven update is additive and anchored: preserve the
   approved content the user has not asked to change, modify only the named dimension
   (the reinforcement-inference anchored re-ask pattern). Do not silently rewrite the
   whole artifact on a scoped request.

### Invariants every added dimension must still satisfy
- Citation protocol: named sources, verbatim quotes; numbers only inside cited quotes
  (Quantitative Claim Rule).
- No slop, no meta-narration, no reporting-depth chrome.
- Purposeful color (red = pain, teal = need/fix, neutral = structure), block anchoring,
  AA contrast: the house style holds at any depth.
- The deliverable stays on-objective; added dimensions serve the engagement goal.

This is what makes the exemplars elegantly extensible: the same skill renders a thin
first pass on sparse data and a deep, multi-dimensional artifact on a rich corpus or an
engaged analyst, without a different code path.


## Representative-Content Firewall (exemplar vs real artifact)

A gold-standard EXEMPLAR for this deliverable lives in `hic-workspace/wiki/eval/exemplars/`. It uses
REPRESENTATIVE content to demonstrate the artifact's full dimensional depth, layout, and house style.
The exemplar's specific values (names, quotes, ratings, numbers, peer entities) are ILLUSTRATIVE
samples, NOT facts to reuse.

When generating a REAL artifact:
- Query the MANIFEST first to know what the corpus actually holds; populate every dimension ONLY from
  corpus-evidenced material (named source + verbatim quote or named entity).
- NEVER copy the exemplar's sample values, and NEVER invent data to match the exemplar's depth. If the
  corpus does not support a dimension, OMIT it or mark it explicitly (e.g. the competitive matrix marks
  a silent cell "No signal") -- do not hallucinate to fill the shape (No-Fabrication rule).
- Match the exemplar's STRUCTURE, dimensional coverage, and house style; do not match its CONTENT.
- Depth is proportional to evidence: a thin corpus yields a smaller (still honest) artifact; a rich
  corpus fills more dimensions and more items. Representative depth in the exemplar is the ceiling of
  FORM, never a quota to fabricate toward.

## Visual Output (GOLD design language)

Render to the canonical GOLD visual language. Full spec: `hic-workspace/wiki/design-system/gold-visual-language.md`.
Your reference twin(s): `personas-nu.html` / `personas-nxt.html`, `persona-detail-nu.html` / `persona-detail-nxt.html` in `hic-workspace/wiki/design-system/gold/`.

Layout: Roster slide: column per behavior (num + name + phase line + colored frustration/need blocks, color carries pain vs need, NO eyebrow labels) + a journey strip showing where each peaks. Detail slide: A DAY IN THE LIFE, GOALS (COOPER HIERARCHY), behaviors, frustration block.

Invariants (from the spec): 1920x1080 stage, brand rail + 3x3 dot mark, IBM Plex Mono kicker,
serif(NU)/Archivo(NXT) action-title h1, dark takeaway band with exactly one accent-bold phrase.
Color is meaning (accent = pain/critical/diagnosis; cool = need/target/fix/source; neutral = structure).
NO eyebrow microlabels that color/position already convey (WHAT FRUSTRATES THEM, WHAT THEY NEED,
DESIGN RESPONSE, PROOF IT WORKED, PEAKS). NO em-dash. Content is data-dependent; the language is fixed.

---

## Cached-selection contract (2026-06-06, MANDATORY)

When the engagement manifest carries `cached_selection.theme_cluster_ids[]` /
`cached_selection.engagement_slugs[]` (the user explicitly selected prior
artifacts via the Knowledge Library), the `assembleEnhancedPrompt()` function
injects a `PRIOR CACHED SELECTION` block into your system prompt. You MUST
honor it:

1. For each emitted item (recommendation / persona), set a `source` field:
   - `"cached"`   — carried forward unchanged from the user's selection
   - `"extended"` — carried forward with refinement on the new corpus
   - `"new"`      — from the new corpus, not in the selection

2. **NO FLOORS, NO OMISSIONS — 100% coverage required.** EVERY one of
   the user's selected items below MUST appear in your emission tagged
   `source: cached` or `source: extended`. The user explicitly curated
   them via the Knowledge Library; the manifest is the binding contract;
   silent omission of any selected id is rejected by the Stop hook
   `validate_cached_selection_honored.py` (coverage threshold raised
   from 60% to 100% on 2026-06-06). New corpus discoveries go in IN
   ADDITION to the cached set as `source: new`.


3. **Net new ≥4 (recommendations) / ≥2 (personas).** On top of carried-
   forward items, you MUST produce at least the floor of NEW items the new
   corpus reveals.

4. **Why this matters.** The user curated the Knowledge Library selection
   deliberately. Regenerating from scratch ignores their curation and breaks
   the recursive self-improvement loop. The product is
   {cached + extended + new}, not {new alone}.

5. **Trace + frontier.** The per-deliverable auditor reads
   `items[].source` and computes `cached_selection_coverage_pct` as a
   qualityFrontier dim (direction: maximize, floor: 100). Epoch proposer
   mines low-coverage patterns as candidate interventions.
## Element-Data Imagery Contract (E4, 2026-07-02 — supersedes the 2026-06-27 Brand-Imagery Prompting Contract)

The diffusion brand-image lane (`POST /api/ai/brand-image`, memphis-iso scene concepts, `brandImage: { concept }`) is RETIRED. Each persona's detail panel is now a NATIVE infographic composed deterministically from THAT persona's OWN structured data (`services/artifactIllustrator.ts::infographicSpecFrom` -> `/api/ai/diagram`; chromeless, token-locked, typeset natively).

GOVERNING RULE unchanged (user-locked, HARD): NO PURE DECORATION; the panel represents THAT persona's content, per-element never per-slide. The MECHANISM changes: do not describe a portrait scene; author the persona's structured fields richly. Concretely: labeled goal/pain/context entries and the persona's citation mix (2+ named sources) drive the panel; a workflow of 3+ named steps renders as a process-flow. EMPTY BEATS INVENTED: a persona with no derivable structured data gets no panel; never pad fields to force one. Do not emit `brandImage` / `imageConcept`; the native lane ignores them. Full routing contract: the `designer` skill + `nxt-visual-renderer` section 6.

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

Two tests every user-visible sentence must pass, on top of the banned-phrase lexicon in
`.claude/CLAUDE.md`:

1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or
   audience. Abstract nouns (engagement, advancement, alignment, transformation, adoption)
   never act; dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never
   substitute for the mechanism. Ground cause and effect: X fails because Y, so Z happens.
   BAD: "Engagement leaks at three stages advancement cannot see."
   GOOD: "Alumni drop off at three stages the advancement team cannot see."

2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it. Kill
   broken grammar, buzzwords forced into the wrong part of speech, and word-salad
   compression. Plain subject, direct verb, concrete object; delete every word that adds no
   fact or step.
