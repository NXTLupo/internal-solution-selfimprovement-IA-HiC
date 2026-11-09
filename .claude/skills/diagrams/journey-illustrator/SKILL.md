---
name: journey-illustrator
description: "Current-state journey map illustrator with a draft-then-deepen two-pass method: grid-table HTML with per-cell verbatim evidence and sources, named touchpoints, emotion intensity and a journey-level KPI dashboard. Used for #journey; NXT and NU differ only in color and type."
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
triggers:
  - journey
  - journeys
  - journey map
  - customer journey
  - user journey
  - experience flow
  - end-to-end
  - end to end
  - pain points by stage
  - moments that matter
  - student journey
  - employee journey
  - patient journey
composes_with:
  - source-ranker
  - human-voice-editor
loader:
  title: Journey Map Illustrator
  role: research-deliverable
  execution_context: subagent
  thinking_effort: high
  wiki_companions:
    - frameworks/blueprint.md
    - anti-patterns/blueprint.md
  benchmarks:
    - benchmarks/cx-metrics.md
  output_types:
    - grid-matrix
    - evidence-block
    - stat-row
skillopt: trainable
---

# Journey map (current-state) illustrator

## Scope

Journey map (CURRENT-state) illustrator. Two-pass depth pattern ported from the Intelligence Augmentation Journey Mapper - first pass drafts; second pass critiques and deepens. Output is a finished consulting HTML report (grid-table layout, per-cell verbatim evidence quotes with Source: citations, named touchpoints with importance scores, emotion intensity 0-100, journey-level KPI dashboard with overall pain points + overall opportunities). Shares grid layout with the service-blueprint exemplar - they differ ONLY semantically (current/pain vs future/gain). NU and NXT brand exemplars carry only color and typography differences; structural rules are identical for both brands.

## What changed 2026-05-25 (this rewrite)

Two changes layered on top of the prior swimlane retirement:

1. **Depth ported from the Intelligence Augmentation Journey Mapper.** That app's two-pass HTML generation produces visibly deeper journey reports than HiC's single-pass JSON. The instructional discipline is folded into this skill so HiC journey output reaches the same depth in its first emission, and the existing reinforcement-inference path serves as the second pass when validation fails.

2. **Grid-table layout retained.** The 2026-05-25 retirement of the swimlane/absolute-positioning layout stands. JM's analytical density now lives INSIDE the grid-table cells rather than across an emotion-arc SVG overlay + voice-of-user row + opportunity row + synthesis band. Each cell carries: one activity sentence, one named touchpoint with channel, one emotion + intensity, one verbatim voice quote with `Source:` citation, optionally one pain point. The journey-level KPI dashboard rendered above the grid carries the personas, the overall pain points, the overall opportunities, and the type-detected scaffold.

The journey-map quality incident root cause (collisions whenever cell density rose above one item) is structurally prevented by the grid; the depth that incident accidentally suppressed is restored here through cell-internal richness.

---

## Framing

This is the **as-is** workflow. Pain points are real, observed, evidenced from the corpus. Opportunities are mentioned only in the journey-level KPI dashboard (NOT inside body cells) or in the deck's *next* slide (a blueprint, recommendations slide, or roadmap). Narrative is descriptive, never prescriptive. The reader of a finished consulting artifact should leave understanding TODAY'S system - the recommendations come next.

<!-- SLOW_UPDATE_START -->
## Brand consistency rule

The structural rules below apply IDENTICALLY to #NU and #NXT journeys. The brand exemplar controls ONLY color palette, font family, atmospheric overlays. It does NOT control content layout, cell anatomy, or evidence requirements.

---
<!-- SLOW_UPDATE_END -->

## 0. Journey-type detection (FIRST move)

Before any layout work, classify the journey type from the corpus. This determines the phase scaffold the cells will be evidenced against.

| Type | Canonical phases (corpus may rename/reorder) |
|---|---|
| `customer-purchase` | Awareness, Consideration, Evaluation, Decision, Checkout, Fulfillment, Post-Purchase |
| `educational` | Awareness, Application, Onboarding, Core Experience, Completion, Alumni |
| `coop` | Preparation, Job Search, Application, Interview, Placement, Work Term, Reflection |
| `healthcare` | Symptom Awareness, Care Seeking, Diagnosis, Treatment Planning, Treatment, Recovery, Follow-up |
| `employee` | Recruitment, Hiring, Onboarding, Development, Engagement, Transition, Exit/Alumni |
| `software-user` | Discovery, Evaluation, Onboarding, Adoption, Regular Use, Mastery, Renewal |
| `general` | Use only when none of the above fit. Phases come entirely from corpus evidence. |

**Detection rule.** Count occurrences of type-discriminator terms across the unstructured corpus (e.g., "student/co-op/internship" → coop; "patient/clinical/treatment" → healthcare; "subscriber/onboard/feature" → software-user). The dominant term cluster wins. Record the detected type as `journey_type` and emit it in the KPI dashboard's kicker line.

If the detected type's canonical phases conflict with what the corpus actually shows, FOLLOW THE CORPUS. The scaffold is a starting point, not a constraint. Re-name a phase, drop one that the corpus doesn't evidence, add one the scaffold misses. The journey is descriptive of the data, not prescriptive from the type.

---

## 1. Canvas, frame, and safe area

- Artboard is **1920 × 1080**, locked.
- 80px safe area on every side.
- Three regions stacked top-to-bottom: HEADER → KPI-DASHBOARD → GRID-TABLE. The KPI-DASHBOARD is strictly MANDATORY and must always be rendered.
- KPI-DASHBOARD replaces the earlier KPI-row at the bottom. It carries: journey_type kicker line, personas array, 3-5 journey-level KPIs (overall pain count, overall opportunity count, persona count, stage count, headline metric drawn from the corpus).
- No floating SVG layers. No absolute positioning of cell content. The grid is responsible for all alignment.
- **No Em-Dashes:** Do not use em-dashes (`—` or `&mdash;`) anywhere in the text. Use a standard hyphen `-` or colon `:` instead.

---

## 2. Title and headline system

- Title is a **diagnostic action-title sentence** stating the central friction with a number from the corpus.
- Kicker above title (the ONE permitted top label): `JOURNEY MAP · CURRENT STATE · {journey_type}` - 10px tracked uppercase. Self-identifies the artifact AND the detected type.
- Optional lede paragraph (≤2 lines) below title - sets up what the grid shows.

BAD title (topic): "Internship search lifecycle, current state"
GOOD title (diagnostic, numbered): "ATS keyword filters reject 48% of qualified applicants before any recruiter reviews them"

If the corpus does not evidence a quantified headline finding, surface the strongest named-friction pattern instead. Never default to a topic phrase.

---

## 3. KPI dashboard (above the grid)

```html
<section class="kpi-dashboard">
  <div class="kpi-kicker">JOURNEY MAP · {journey_type} · {persona count} personas · {stage count} stages</div>

  <div class="personas">
    <div class="persona-eye">PERSONAS</div>
    <ul>
      <li>Persona name (role) - one-line characterization</li>
      <!-- 2-5 personas, evidenced from corpus -->
    </ul>
  </div>

  <div class="overall-row">
    <div class="overall-pain">
      <div class="oeye">OVERALL PAIN POINTS</div>
      <ol>
        <li>Major pain pattern across the journey, with source citation</li>
        <!-- 3-5 entries, journey-level not phase-level -->
      </ol>
    </div>
    <div class="overall-opp">
      <div class="oeye">STRATEGIC OPPORTUNITIES</div>
      <ol>
        <li>High-leverage opportunity, with source citation</li>
        <!-- 3-5 entries, journey-level not phase-level -->
      </ol>
    </div>
  </div>

  <div class="kpi-tiles">
    <!-- 3-5 tiles; numerals drawn from corpus, NEVER invented -->
    <div class="kpi-tile">
      <div class="kpi-val">48%</div>
      <div class="kpi-lbl">APPLICANT REJECT RATE</div>
      <div class="kpi-sup">ATS keyword filter, Submission phase</div>
    </div>
  </div>
</section>
```

### Personas block
- 2-5 personas. Each persona = NAME (role/segment) + one-line characterization grounded in corpus voice. Never demographics-first ("28-year-old urban professional"); ALWAYS goals/JTBD-first ("Career-changer rebuilding portfolio after layoff").
- Persona names must reuse the names from any persona deliverable already generated for this engagement. If none exist, derive 2-3 personas from the corpus.

### Overall pain points / opportunities
- 3-5 entries each. JOURNEY-level patterns, not phase-level (those live in cells). Each entry carries an inline source citation in parentheses, e.g. "Buyers discover integration gaps late, after committing to the platform (G2 Reviews; Industry Analyst Brief 2024)."
- Opportunities live HERE in the dashboard. They do NOT live inside body cells - the cells describe today's friction, the dashboard summarizes where the recommendations could intervene.

### KPI tiles
- 3-5 tiles. Each tile = numeral (48-64px) + label (uppercase tracked 10px) + supporting line (12px, ≤50 chars, naming which phase the metric characterizes).
- Numerals MUST be real numbers from the corpus, never invented. If a tile would need an invented number, REPLACE that tile with a qualitative finding tile (numeral becomes a short word like "MULTIPLE" or "FRAGMENTED" in display type).
- At most ONE inverted tile (dark bg, brand-accent text) - and only for the headline finding. The mono meta label on that tile reads "KEY FINDING".

---

## 4. Grid-table structure (THE LAYOUT)

```html
<div class="grid">
  <div class="phase-head empty"></div>
  <div class="phase-head"><div class="pname">Phase 1</div><div class="psys">System callouts</div></div>
  <div class="phase-head"><div class="pname">Phase 2</div>...</div>
  <div class="phase-head focal"><div class="pname">Phase 3</div>...</div>
  <div class="phase-head"><div class="pname">Phase 4</div>...</div>
  <div class="phase-head"><div class="pname">Phase 5</div>...</div>

  <div class="lane-row">
    <div class="lane-label">Actor A<span class="lrole">role</span></div>
    <div class="cell">
      <!-- ALL FIVE elements optional; .ctext required -->
      <div class="ctext">One complete sentence: subject + verb + outcome.</div>
      <div class="tp"><span class="ch">CHANNEL</span> Named touchpoint, importance N/10</div>
      <div class="emo" data-intensity="62">Anxious - reason in one clause</div>
      <blockquote class="vq">"Verbatim quote pulled from the corpus."<cite>Source: Customer Forum, 2024-09</cite></blockquote>
      <div class="pain">One short clause naming a specific friction with a number, system, or proper noun</div>
    </div>
    <div class="cell">...</div>
    <div class="cell focal">...</div>
  </div>

  <div class="lane-row">...</div>
</div>
```

### Grid sizing
- `grid-template-columns: 160px repeat(N, 1fr)` where N = phase count.
- Supports 3-6 phase columns. Beyond 6, split into a second journey map.
- Maximum 4 lane-rows. Beyond 4, split.

### Phase-head anatomy
- `.pname` - concrete behavioral event (NOT a gerund category). Examples: `Submission`, `Interview cycle`, `Decision`, `Skill triage`.
  - BAD: `Application`, `Assessment`, `Preparation` - gerund categories.
  - BAD: `Phase 0X · Wk YY-ZZ` - reporting-depth metadata, banned 2026-05-25.
- `.psys` - optional system callouts (the named systems the corpus references for this phase).

### Focal phase
- Exactly ONE `.phase-head.focal` per journey. Do not mark multiple phases as focal. The `.cell.focal` for that column also gets the tinted background, creating a vertical "spotlight" through the grid.
- The focal phase is where the recommendations will primarily intervene. Pick it as the phase with the highest pain density OR the phase tied to the headline finding.

### Cell anatomy (THE FIVE INTERNAL ELEMENTS - depth ported from Journey Mapper)

Each cell carries up to five internal elements, vertically stacked. To prevent low-density failures, **every cell must contain at least 3 of the 5 elements** (specifically `.ctext`, `.tp`, and `.emo` are highly recommended, along with `.vq` for verbatim quotes). Simple single-sentence 

1. **`.ctext` (REQUIRED)** - ONE complete sentence describing what the actor does in this phase. Subject + verb + outcome. Max ~110 chars. Never a gerund fragment.

2. **`.tp` (RECOMMENDED)** - ONE named touchpoint with channel and importance. Format: `<span class="ch">CHANNEL</span> Touchpoint name (importance N/10)`. CHANNEL is one of `DIGITAL`, `IN-PERSON`, `PHONE`, `MAIL`, `SOCIAL`, `PORTAL`, `EMAIL`, etc. Touchpoint name is the specific system or interaction the corpus names (e.g., a named portal or job board, an in-person desk, a Slack channel). Importance is corpus-evidenced where possible; if not evidenced, omit the number.

3. **`.emo` (RECOMMENDED)** - ONE emotion + intensity for the actor at this phase. Format: emotion name + ` - ` + one-clause reason. The intensity (0-100) goes in `data-intensity="N"` on the element; the CSS renders it as a width bar OR color gradient. Emotions: `Frustrated`, `Anxious`, `Skeptical`, `Determined`, `Neutral`, `Hopeful`, `Engaged`, `Delighted`. Intensity scale: 0-20 (very low), 21-40 (low), 41-60 (medium), 61-80 (high), 81-100 (very high).

4. **`.vq` (STRONGLY RECOMMENDED for evidence depth)** - ONE verbatim voice-of-user quote pulled directly from the corpus, with inline `<cite>` carrying `Source: {source name}, {date if known}`. VERBATIM ONLY - never paraphrased, never composed. If the corpus does not carry a usable verbatim quote for this cell, OMIT the `.vq` element. The journey reads as deeply evidenced only when verbatim quotes anchor the cell-level claims; failing that, the cell remains evidenced via the source citation in the `.tp` or `.pain` element.

5. **`.pain` (OPTIONAL, max one per cell)** - ONE short clause naming a SPECIFIC friction with a number, system, or proper noun. Max ~80 chars. CSS `::before` renders the "PAIN" mono meta label automatically - DO NOT prefix the body with "Pain:" or "PAIN:".

For inactive (actor × phase) cells: emit `<div class="empty">- not active in this phase</div>` rather than leaving the cell empty.

### Lane label
- Actor name in uppercase + role beneath in lowercase.
- Actors must be human or organizational roles with intent ("Student", "Career Advisor", "Employer Recruiter"). Never "Technology" / "Systems" / "Tools" - those are touchpoints inside cells, not lanes.
- Maximum 4 lanes; if more actors, split into a second journey map.

---

<!-- SLOW_UPDATE_START -->
## 5. Evidence depth contract (the JM ambition)

A finished journey artifact must score on FIVE depth dimensions. Self-check each before emitting.

| Dimension | Minimum | Stretch |
|---|---|---|
| **Verbatim quote density** | ≥40% of cells carry a `.vq` from corpus | ≥60% |
| **Named touchpoints** | ≥60% of cells carry a `.tp` with a real system/channel | ≥80% |
| **Emotion specificity** | ≥80% of cells carry `.emo` with intensity 0-100 + reason | All cells |
| **Pain evidencing** | every `.pain` names a number, system, or proper noun (zero generic frictions) | All `.pain` carry source attribution inline |
| **Source diversity** | ≥3 distinct named sources across all cell quotes + KPI tiles + overall rows | ≥6 distinct sources |

The dashboard KPI tiles + overall pain points + overall opportunities must reflect the SAME corpus the cells cite. The journey is internally consistent - what gets evidenced in cells gets summarized in the dashboard.

---
<!-- SLOW_UPDATE_END -->

## 6. Extended-thinking instructions (ported from Journey Mapper)

Before drafting cells, run these analytical moves. These are the JM disciplines that produce visibly deeper journeys than single-pass JSON generation.

1. **Beyond obvious patterns** - look for subtle correlations across the corpus (e.g., the same persona reports the same friction across different phases - that's a cross-cutting pain pattern that belongs in `overall_pain_points`, not just one cell).
2. **Challenge the scaffold** - do not impose the canonical type-phases if the corpus suggests different boundaries. Rename, drop, add phases as the data dictates.
3. **Quantify wherever possible** - corpus numbers go into cells and tiles. "48% rejection rate" beats "many applicants rejected."
4. **Cross-persona divergence** - if the data suggests persona-specific patterns at the same phase, note this in the cell prose or in the overall pain points. The journey reveals where personas diverge.
5. **Time-based patterns** - if the corpus carries temporal signal (e.g., "students who apply in week 1 vs week 4"), surface this in the cell or the dashboard.
6. **Frequency × severity** - rate pain points by both how often they occur and how severe the impact. The headline KPI tile usually combines both.
7. **Peak-end** - readers anchor on the journey's emotional low and its ending. Make sure the focal phase is the emotional low AND the recommendation entry point.
8. **Verbatim, never paraphrase** - `.vq` must be exact corpus text. If you cannot pull verbatim, omit the element rather than fabricate.
9. **Citation per claim** - every numerical claim in the dashboard carries a source. Every `.pain` carries either a number, named system, or proper noun. Every `.vq` carries Source: attribution.
10. **Omit > fabricate** - if a cell genuinely has thin evidence, render `.ctext` only and skip the optional elements. Padding cells with invented quotes/numbers fails the depth contract harder than a sparse cell.
11. **Identify cross-cutting themes** - what binds the journey together besides chronology? (e.g., trust erosion, capability gaps, expectation mismatch, friction cascade). This becomes the lede.
12. **Stage-emotion congruence** - the emotional low must align with where the recommendations will land. If the lowest `.emo` intensity is in Phase 2 but the focal column is Phase 4, RE-EXAMINE which phase the recommendations actually target.
13. **System fragmentation** - count distinct named systems across all `.tp` elements. Fragmentation patterns (e.g., 14 distinct systems across 5 phases) are first-class findings, often becoming the headline.
14. **Backstage vs frontstage** - the cells should describe FRONTSTAGE behavior (what the actor sees and does). Backstage actions (what the institution does behind the scenes) belong in the blueprint, not the journey.
15. **Anti-fabrication** - never invent percentages, frequencies, system names, or quote text. Quality over quantity. A 3-element cell with rock-solid evidence beats a 5-element cell with two fabricated pieces.
16. **Calibrated confidence** - if a cell or tile is corpus-supported but speculative, mark `data-confidence="emerging"` or `data-confidence="hypothesis"` for downstream rendering. The HTML report can show this as a confidence dot. Strong claims need no marker. Never show "HYPOTHESIS:" as visible text - it's a data attribute the renderer interprets.
17. **What the reader leaves understanding** - a finished journey report must answer ONE diagnostic question with confidence. State that question implicitly through the title and lede; answer it through the dashboard + grid. If the question is fuzzy, regenerate.

---

<!-- SLOW_UPDATE_START -->
## 7. Anti-patterns (auto-reject)

- More than ONE `.pain` element per cell. Concentrate density INTO a single specific, evidenced friction.
- More than ONE `.vq` element per cell. If a cell has multiple corpus quotes, pick the strongest.
- "PAIN:" or "Pain:" literal text inside the `.pain` body - the CSS `::before` adds that prefix automatically.
- Empty cells without the `.empty` placeholder.
- Lane labeled "Technology" or "Systems" or "Tools" - convert to a human/org actor.
- Gerund phase names - use concrete behavioral events.
- `.ph-eye` phase-metadata stamps like "Phase 0X · Wk YY-ZZ" - removed permanently.
- `[Life]/[Experience]/[Functional]` tier brackets, `(composite)` suffixes, "Confidence:" debug labels, Run ID stamps - banned across all deliverables.
- Future-state interventions or "what we recommend" cells in a journey body. Those belong in the dashboard's overall_opportunities, in a blueprint, in a recommendations slide, or in a roadmap. The journey body is descriptive only.
- Emotion-arc SVG overlays, voice-of-user rows as separate horizontal bands, synthesis bands, opportunity rows, swimlane dots - ALL the prior journey-only chrome stays retired. Use the clean grid-table with cell-internal richness.
- More than 4 lanes. More than 6 phases.
- Fabricated quotes inside `.vq`. If the corpus does not carry the quote verbatim, OMIT the element.
- Fabricated numerals in KPI tiles. If the corpus does not carry the number, REPLACE the tile with a qualitative finding.
- Generic pain points like "frustrating user experience" or "poor user satisfaction." Always name the friction with a number, system, or proper noun.
- Demographics-first personas ("28-year-old male, urban") in the dashboard. Always goals/JTBD-first.

---

## 8. Self-check BEFORE emitting

1. Does each lane row have EXACTLY N `.cell` children where N = phase count? If not, REJECT.
2. Does each `.cell` contain ≤ ONE of each: `.ctext`, `.tp`, `.emo`, `.vq`, `.pain`? `.ctext` REQUIRED, others optional. If duplicated, REJECT.
3. Is there EXACTLY ONE `.phase-head.focal`? Not zero, not two.
4. Does each `.ctext` start with the actor noun? Gerund-only fragments REJECT.
5. Do inactive cells use the `.empty` placeholder rather than being blank?
6. Does the dashboard carry: journey_type kicker line, personas array (2-5), overall_pain_points (3-5), overall_opportunities (3-5), KPI tiles (3-5)?
7. Verbatim quote density ≥40% of cells? Named touchpoints ≥60%? Emotion specificity ≥80%? Source diversity ≥3 distinct named sources? If under floor, REGENERATE before emitting.
8. No banned phrases (delve, tapestry, testament, "plays a pivotal role", knowledge-cutoff disclaimers, reporting-depth metadata, em-dashes)?
9. Title is diagnostic with a number, not a topic phrase?
10. Same content would render identically in #NU and #NXT (only colors/fonts differ)?

If any check fails, regenerate with corrected structure. Do not ship.

---
<!-- SLOW_UPDATE_END -->

## 9. Two-pass deepening (uses HiC's existing reinforcement-inference primitive)

The Intelligence Augmentation Journey Mapper achieves its depth via an explicit two-pass call: first pass generates HTML, second pass critiques and deepens. HiC's existing reinforcement-inference path achieves the same outcome when validation fails - the validator (`validateDeliverableOutput`) flags low evidence density or missing fields, and `generateJourneyMap` retries with a reinforcement prompt that quotes the failures back.

This skill REQUIRES the first-pass output to meet the §5 depth contract. When it doesn't, the validator's reinforcement loop fires. To minimize reinforcement frequency (which doubles the cost), draft the first pass at full JM depth: load this skill's full instructions into the prompt, run the §6 extended-thinking discipline, fill cells to the §5 floors. Reinforcement is the safety net, not the planned path.

---

## 10. Journey vs blueprint - semantic difference

| Aspect | Journey (current state) | Blueprint (future state) |
|---|---|---|
| Time frame | What IS today | What WILL BE after intervention |
| Cell `.ctext` | Describes today's behavior | Describes redesigned behavior |
| Accent row | `.pain` (rust) - evidenced friction | `.gain` (chartreuse) - intervention benefit |
| Cell `.vq` | Verbatim user quote about friction or experience | Verbatim user quote about desired outcome |
| Dashboard | overall_pain_points + KPIs (often rust) | overall_interventions + projected_impact (often improving) |
| Lane labels | Today's actor org chart | Future-state actor org chart (may include new roles) |
| Title format | Diagnostic sentence with a number | Resolution sentence with a target |
| Phase names | Concrete events as they happen today | Concrete events post-redesign |

The grid HTML structure is **identical**. The only renderer-visible differences are: `.pain` vs `.gain` row classes, dashboard composition (overall_pain_points vs overall_interventions), and the cell prose framing.

This shared layout means every collision-prevention rule, every cell-anatomy contract, every validator hook applies equally to both deliverables.

---

## 11. NU and NXT brand alignment

The grid layout, cell anatomy, dashboard structure, evidence requirements, and extended-thinking discipline are IDENTICAL between brands. Differences:

| Element | NXT | NU |
|---|---|---|
| Background | `--nxt-bg: #FFFFFF` | `--nxt-bg: #FFFFFF` |
| Primary text | `--nxt-text-primary: #0D0D0D` | `--nxt-text-primary: #000000` |
| Accent | `--nxt-lime: #B8B800` (chartreuse) | `--nu-red: #C8102E` (PANTONE 200 C) |
| Friction | `--nxt-rust: #CC6644` | `--nxt-rust: #CC6644` (shared) |
| Display font | `Bebas Neue` | `Roboto Condensed` |
| Body font | `Archivo` | `Open Sans` |
| Quote font | `JetBrains Mono` (subdued) | `Spectral` (editorial italic) |
| Corner radius | 2px (sharp) | 2px (sharp) |

The renderer ships both brand variants from the same data JSON. The model emits structure + content; the rendering layer applies brand tokens.

---

## 12. Composition with HiC infrastructure

- `services/geminiService.ts::generateJourneyMap` - the JSON-emitting generation function. Schema MUST carry the per-cell depth fields (touchpoint, emotion + intensity, verbatim quote with source, optional pain) AND the journey-level dashboard fields (journey_type, personas, overall_pain_points, overall_opportunities, kpi_tiles).
- `design-desk/services/chatToFreeform.ts::perKindGuidance('journey')` - the HTML body-content generator for the Design Desk `#journey` path. MUST mirror this skill's discipline so the two surfaces produce equivalent depth.
- `services/slidePostProcessor.ts` - sanitizes citations, strips em-dashes, enforces evidence hierarchy. Journey output passes through the same chokepoint as every deliverable.
- `services/artifactExpertPanel.ts::EXPERT_PANELS.journey` - the LLM-side critic panel. Should fire: journey-illustrator (this skill) + evidence-quality-auditor (verbatim quote authenticity) + contradiction-finder (cross-source disagreement on the headline finding).
- `.claude/hooks/scripts/validate_freeform_structure.py` and the validators it dispatches enforce structural rules at Stop. The §5 depth contract maps to validator gates.

The skill markdown alone is not the contract - the contract is the skill + the schema + the validators + the rendering layer agreeing on the same cell anatomy. Updating any one of those requires updating all four.

---

<!-- SLOW_UPDATE_START -->
## 13. #slides emission contract (2026-06-06, MANDATORY)

When the user invokes `#journey` together with `#slides` (any brand), the
output is a slide DECK, not a single-page artifact. The deck has a
mandatory composition. Skipping any rule fails the Stop hook
`validate_journey_overview_slide.py` and the deliverable is rejected.

### 13.1 Mandatory slide sequence

| # | Slide kind | Mandatory? | Content contract |
|---|------------|------------|------------------|
| 1 | Title / cover | Yes | The diagnostic action-title (a judgment, not a topic) plus the persona/standfirst line. No metadata strip, no corpus counts. |
| 2 | **JOURNEY OVERVIEW DIAGRAM** | **YES — STOP HOOK REJECTS DECKS THAT SKIP THIS** | A SINGLE slide showing ALL phases at once as a horizontal phase strip (one column per phase, left-to-right). Each column carries: phase number + phase name, a one-line phase summary, the dominant pain label, and the qualitative emotion label (one word, never a curve). This is the reader's MAP of the whole journey before drilling into individual phases. Class hooks: `.nxt-process` for ≤5 phases, `.nxt-grid` of `.nxt-card` for >5 phases. NO emotion curve. NO chart. |
| 3 | KPI dashboard | Yes | 3-4 KPI tiles, large. Drawn from the journey-level dashboard contract in §3. |
| 4..N | Per-phase deep-dive | One per phase | Each carries that phase's activities, named pains (with severity + frequency), 2-3 VERBATIM quotes with source attribution, the touchpoint, and the qualitative emotion label. |
| N+1 | Synthesis | Yes | Cross-cutting pains paired by name with opportunities. |
| N+2 | Source index | Yes | Clean named-source list per §11 of the skill. |

### 13.2 Why the overview-diagram slide is non-negotiable

The journey artifact is a MAP. Readers consume maps by seeing the whole
territory first, then drilling into specific cells. A deck that opens with
per-phase deep-dives without the overview forces readers to assemble the
journey in their head from N sequential slides. The overview slide is
the reader's orienting frame. The Stop hook reads the rendered deck and
fails it if no slide between positions 1 and 3 contains all phase names.

### 13.3 Anti-slop rules SPECIFIC to journey #slides

These are stricter than the general anti-slop rules in `.claude/CLAUDE.md`
because journey #slides have historically been the highest-slop deliverable:

1. **No structure-description sentences.** Banned: "HOW TO READ THIS",
   "One frame per phase", "Each row represents…", "The chart below shows…",
   "evidenced by student voices from r/X" (the last as a structural
   description; verbatim quotes with attribution remain fine).
2. **No metaphor titles.** Banned families: clock/race ("the clock is
   running", "running out of time"), journey-as-metaphor ("road ahead",
   "long road", "crossroads"), construction ("building blocks", "lay
   the foundation"), war/sports ("battle", "war chest"), anthropomorphism
   ("prep feels abstract", "the system wants"). Use plain descriptive
   titles: "Students apply to 100+ co-ops in the first cycle" not
   "First-year prep feels abstract until the clock is already running."
3. **No hyperbole.** Banned: "unprecedented", "transformative",
   "paradigm shift", "game-changer", "the most important", "revolutionary".
4. **Numbers only in cited quotes.** A standalone "60-to-4 ratio" in a
   title or KPI is forbidden; the same ratio inside a Reddit quote with
   attribution is fine.
5. **Action titles, not topic labels.** "Students apply to 100+ co-ops"
   is an action title (states a finding); "The Application Phase" is a
   topic label (forbidden).

### 13.4 Rendering layer hooks the Stop hook reads

- `validate_journey_overview_slide.py` — runs at Stop on every journey-
  typed deck. Reads the rendered HTML (or the SlideData[] for the gold
  pipeline) and asserts:
    (a) ≥1 slide between positions 1–3 contains the overview-diagram
        class (`.nxt-process` or `.nxt-grid` of `.nxt-card`) AND every
        detected phase name from the per-phase slides appears within it
    (b) NO slide title matches the metaphor pattern list
    (c) NO slide content contains structure-description phrases
- `services/slidePostProcessor.ts::detectMetaphors` and `::detectAllSlop`
  fire on every text field at runtime; flags + auto-corrects.
<!-- SLOW_UPDATE_END -->
