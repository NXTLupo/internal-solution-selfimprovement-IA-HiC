---
name: deck-composer
description: "The authority for #slides, #strategy and #presentation deck composition: archetype choice by content shape, the visual floor and variety rules, the Minto, Rumelt and SCQA arc, title craft and subject discipline. Injected whole into the DECK MODE prompt."
invocation: model
version: "1.1"
status: active
triggers:
  - deck
  - presentation
  - slides
  - pitch
  - strategy deck
  - slide deck
  - pitch deck
composes_with:
  - slide-title-lab
  - second-order-thinker
  - human-voice-editor
loader:
  title: Deck Composer
  role: research-deliverable
  execution_context: primary
  thinking_effort: max
  wiki_companions:
    - frameworks/deck.md
    - anti-patterns/deck.md
    - anti-patterns/deck_structure.md
  output_types:
    - stat-row
    - evidence-block
    - recommendation
    - split-panel
    - section-divider
    - quote-block
    - color-block-grid
skillopt: trainable
---

# Deck Composer - the DECK MODE authority

## Scope

The single versioned authority for #slides / #strategy / #presentation deck composition (DECK MODE, SLIDES archetype registry, Figma 609). Covers archetype selection by content shape (including the six native diagram bricks), the gate-enforced visual floor and variety rules, the narrative arc (Minto / Rumelt / SCQA), title craft, subject discipline, the infographic-exhibit depth contract, and reference-deck language. Injected whole into the DECK MODE prompt; it also carries the legacy GOLD Slide-object contract (section 8, folded from the deleted deck-narrative-composer) and folds in infographic-composer.

> DESIGN CONSTITUTION (2026-08-07, D1): every deck surface is bound by the ten HiC Design Laws
> in `hic-workspace/wiki/brand/design-laws.md` (tokens only; compose from registered bricks;
> frozen brick APIs; numbers only in cited quotes; citation-as-selection; provenance; honest
> gaps; data geometry in instances; collision bans). Deviations are never silent: fix or log in
> `humans-in-control-research/design-desk/deviation-register.md`. Settled arguments:
> `design-desk/adr/`. New archetypes/bricks walk the D4 gate spine, never straight to prod.

A `#slides` / `#strategy` / `#presentation` deck is COMPOSED from the registered SLIDES
archetypes (catalog: `hic-workspace/wiki/design-system/slides-component-manifest.md`) the way
`#proto` composes from its component manifest. Every slide is one fence:

```
:::slide template=slides:<archetype> brand=nxt|nu
{ ...payload exactly as the catalog's PAYLOAD contract specifies (key names + array lengths verbatim)... }
:::
```

The `slides:` prefix is MANDATORY; it routes through the registry composer. A fence without it
falls back to a legacy template and is a hard failure in deck mode. GOLD template names
(persona-card, theme-cluster, recommendation, timeline, case-study, ...) are NOT deck archetypes;
never use them in a deck.

SUPERSESSION: on deck surfaces this skill is the one contract. The former `deck-narrative-composer`
skill (the 12-content-block architecture) was folded into section 8 below on 2026-10-01 and deleted;
section 8 applies only to legacy GOLD Slide-object flows, never to DECK MODE. `infographic-composer`
remains the detailed per-family reference for `slides:infographic-exhibit`; its load-bearing rules are
folded into section 5 below and this skill governs when that archetype is used at all.

## 0. Reformat mode (provided content only; 2026-10-21)

When the request plan reads the turn as PROVIDED-CONTENT-ONLY (the user attached or pasted a document and asked for
it as a deck), the deck is a reformat, and these rules replace sections 2 and 3:
- INFORMATION PARITY is the bar. Every source slide becomes at least one output slide, in source order. A source slide
  with labeled sections (OBJECTIVE / APPROACH / STATUS / BUSINESS VALUE and the like) maps to ONE `slides:brief-card`
  whose four blocks are those sections, label for label, with their full sentences. Keep every named entity, product
  name, figure and status statement as written; tighten wording, never drop a unit.
- Parity beats variety: the same archetype may repeat for sibling source slides; the visual floor and the adjacency
  rule do not apply.
- The governing thesis is the source document's own main message (its cover title or stated through-line); offer no
  alternatives and never a judgment the source does not make.
- Kickers and section labels carry verbatim ("02 BENEFITS CORTEX / PLAN PULSE" keeps its number).
- No corpus: no external citations, no pointer binding, no market context, no appendix. Every slide cites the source
  document by name. The source slide's own pictures ride onto the mapped output slides; do not describe new scenes.
- A deterministic parity check runs on the reply (title idea or half the sections, plus every named entity and
  figure); an uncovered source slide gets one re-ask and then a brief card built from the source text.

## 1. The archetype selection table (content shape -> archetype)

PLAN FIRST (mandatory): before emitting any fence, decide the archetype for EACH slide from ITS
content and its role in the arc, then emit in that order. Never default to one archetype.

`sourceLine` (2026-08-21, ROOT-CAUSE FIX): this field appears in twelve payload
contracts below and was never defined, so the model filled it with a bare source
name ("Source: Clockwork; Recruiterflow") and bound ZERO manifest pointers across
four consecutive live decks. Every evidence gate downstream then had nothing to
check, and the repair pass had to narrow real claims away. `sourceLine` carries the
NAME **and** the pointer:

    "sourceLine": "Source: Clockwork [articles/clockwork-blog/9f2a71c4de.md#c2]"

Multiple sources are separated by a semicolon, each with its own pointer. The same
rule applies to `source`, `attribution` and `attributionName`: a source label
without its pointer is an unverifiable claim, and the runtime treats it as one. A
fact stated in a body field carries its pointer inside that field as well; the
source line is a caption, not a substitute.

| The slide's content is... | Archetype | Payload core |
|---|---|---|
| Deck opener (one per deck) | `slides:cover` | `{ wordmark, title, subtitle }` |
| Contents, decks of 6+ slides | `slides:agenda` | `{ title, groups: [{ label, items }] }` (subject domains, never deck-process steps) |
| A major section break | `slides:section-divider` | `{ number, title, supporting }` |
| One contestable assertion between sections | `slides:thesis-interstitial` | `{ kicker, thesis }` (ONE sentence) |
| A 3-6 step SEQUENCE or process (phases, pipelines, operating loops) | `slides:flow-arc` | `{ kicker, title, steps: [{ title, description }] (3-6), outcome?, sourceLine }`; NEVER text columns for a process |
| 2x2 positioning or tradeoff space (value vs effort, urgency vs impact) | `slides:quadrant` | `{ kicker, title, xAxis, yAxis, quadrants (4, TL/TR/BL/BR), subjects: [{ label, quadrant }] (3-8), sourceLine }` |
| Dated milestones, rollout gates, history arcs (WHEN carries the argument) | `slides:milestone-timeline` | `{ kicker, title, milestones: [{ date, title, detail }] (3-6, chronological), sourceLine }` |
| 2-3 evidence-carried figures, each needing an interpretation AND a consequence | `slides:means-matters` | `{ kicker, title, stats: [{ figure, caption, means, matters }] (2-3), sourceLine }`; prefer over bare stat-row when the WHY matters |
| A RANKING or distribution (where the hours go, which drivers dominate) | `slides:ranked-bars` | `{ kicker, title, bars: [{ label, value, note }] (3-6, sorted descending; value = 0-100 relative, sets bar length only), sourceLine }` |
| Side-by-side OPTIONS down a shared criteria list (build vs buy, vendor A vs B) | `slides:comparison-panels` | `{ kicker, title, criteria (3-5), panels: [{ name, cells }] (2-3), sourceLine }` |
| Exactly 3 hard proof figures, by-the-numbers | `slides:stat-row` | `{ kicker, title, stats: [{ figure, headline, means, matters }] (exactly 3), sourceLine }` |
| One hero verbatim quote + corroboration (single deep-dive subject with a voice) | `slides:block-quote` | `{ topicKicker, title (action title), quote, attributionName, attributionRole, corroborating (exactly 3), sourceLine }` |
| EXACTLY 4 items profiled at a glance (themes, plays, apps) | `slides:numbered-themes` | `{ kicker, title, items: [{ number, name, body, quote, quoteSource }] (4), sourceLine }` (quote = a verbatim line, quoteSource = the named source it came from); NOT a catch-all, max 2 per deck, never for one-subject-per-slide content |
| Named subjects compared across criteria on ONE axis | `slides:evidence-table` | `{ kicker, title, intro, columns (4), rows (~6, first 2 featured), takeaway, sourceLine }` |
| Two contrasting forces as equals | `slides:problem-diptych` | `{ eyebrow, title, subhead, cards: [{ numeral, heading, body }] (exactly 2) }` |
| A 3-part operating model (peer columns, not a reporting chart) | `slides:org-model` | `{ eyebrow, title, columns: [{ name, definition, teams, outcomes }] (3) }` |
| One role's current challenges + persona needs | `slides:role-needs` | `{ eyebrow, title, role, challenges (3), persona: { name, needs (3) } }` |
| One role's recommendation: thesis + actions + impact | `slides:role-recommendation` | `{ eyebrow, title, role, thesis, actionsLabel, actions (3), impactLabel, impact (3), sourceLine }` (the two labels name what each column holds; on a slide carrying the user's attachment they come from the source, never "SUPPORTING ACTIONS" over account facts) |
| One role's phased roadmap | `slides:role-roadmap` | `{ eyebrow, title, role, phases (4) }` |
| The cross-role roadmap matrix (closer) | `slides:aggregate-roadmap` | `{ eyebrow, title, horizons (4), roles: [{ name, cells }] }` |
| A STRUCTURAL finding prose would bury (a 3-5 move sequence, a before/after contrast, a labeled qualitative distribution, an evidence-source mix) | `slides:infographic-exhibit` | `{ kicker, title, takeaway, sourceLine }` + exactly ONE of `steps` / `beforeAfter` / `stats` / `citations`; see section 5 |
| A #presentation narrative scene that wants a supporting visual | `slides:scene` | `{ kicker, title, body, imageConcept, canvas: "dark" }`; imageConcept = literal shapes-as-content description, no image URL |
| The #prd problem (quotes), goals and non-goals, or risks: a story column + up to three evidence cards + a band | `slides:prd-story` | `{ kicker, title, storyLabel, story, cards: [{ heading, body, foot }] (<=3), band: { label, statement } (a typed requirement_target object when the band carries the appetite), sourceLine }` |
| The #prd requirements ledger | `slides:prd-ledger` | `{ kicker, title, columns (5), rows: [{ id, tier, text, traces, test, target?: requirement_target }] (<=6), takeaway: { label, statement }, sourceLine }`; a HYPOTHESIS requirement carries tier `BET` |
| The #prd seven-field success signals | `slides:prd-signals` | `{ kicker, title, columns (7), rows: [{ signal, instrument, population, direction, baseline, type, guardrail }] (<=5), takeaway, sourceLine }`; baseline is a sentence, never a bare figure |
| The #prd traceability matrix (closer) | `slides:prd-trace` | `{ kicker, title, columns (9), rows: [{ id, tier, pain, persona, theme, quote, source, test, signal }] (<=7), takeaway, sourceLine }` |

PRD PROJECTION NOTE (2026-10-01, Stage 3.3): `slides:prd-feature` is NOT an archetype and must never be
emitted. A `#prd` deck is a PROJECTION of the one PRD contract (`services/prdAir.ts` -> `services/prdProjection.ts`)
onto the four `prd-*` archetypes above plus `cover`, `thesis-interstitial`, `role-needs` (users and jobs) and
`flow-arc` (rollout and decision). The model writes the PrdAir record through the prd-compiler skill; the deck
payloads are derived from it deterministically. Any number on a PRD slide rides in a typed `requirement_target`
object (metric, value, unit, rationale), never in a prose cell.

The role trio (`role-needs` / `role-recommendation` / `role-roadmap`) is ONE narrative set per
role: emit all three with the same `role` value; `aggregate-roadmap` folds them into one matrix.

For "one slide per X" coverage (e.g. nine apps): do NOT emit nine identical numbered-themes.
GROUP them four per numbered-themes slide, OR give each a single-subject archetype, and
intersperse stat-row / block-quote / evidence-table / section-divider so consecutive slides differ.

<!-- SLOW_UPDATE_START -->
## 2. Gate-enforced composition floors (compose right the first time)

A deterministic gate (`services/deckPlanGate.ts`) evaluates every deck AFTER generation. It does
not negotiate; a failed plan costs a full model round trip (one anchored repair re-ask with the
violations named). Satisfy these floors in the first pass:

- CLASSES: CONNECTIVE = cover, agenda, section-divider, thesis-interstitial, scene. VISUAL =
  stat-row, evidence-table, aggregate-roadmap, infographic-exhibit, quadrant, flow-arc,
  milestone-timeline, means-matters, ranked-bars, comparison-panels. Everything else is a
  text-column body archetype.
- VISUAL FLOOR (the core lever; raised 40% -> 70% on 2026-11-09 by owner directive): when the deck
  has 6+ BODY slides (non-connective), at least 70% of body slides MUST be VISUAL archetypes.
  Content with SHAPE (a sequence, a comparison, a ranking, a position, a timeline, hard numbers)
  lands on its matching visual archetype, never a text-column layout. The benchmark is the Gemini
  Notebook deck, which carries artwork on every slide; a majority-text deck is a defect now, not a
  style choice. If content will not fit a visual archetype, the content is wrong for the slide:
  split it, or cut it, rather than falling back to a text column.
- ONE VISUAL LANGUAGE: the same illustration treatment, stroke weight and palette across the deck.
  Three consecutive slides in three different visual idioms read as three decks stapled together.
- WHAT NEVER TRADES AWAY FOR LOOKS: the deck exports as NATIVE EDITABLE PPTX (real text frames and
  shapes). The measured Gemini deck is 15 full-slide rasters with zero text runs, so it cannot be
  edited, searched or made accessible; matching its appearance by rasterizing ours would surrender
  the one advantage it cannot answer. Citations, the claim-ledger gate and the prose gates also
  stay exactly as they are.
- VARIETY: decks of 8+ slides need at least min(5, max(3, floor(slideCount / 3))) distinct
  archetypes; target 5+ distinct in any real deck. A deck that is mostly one archetype is wrong.
- ADJACENCY: never the same BODY archetype twice in a row (connective slides are exempt). Vary
  the archetype or merge the content.
- NUMBERED-THEMES CLAMP: `slides:numbered-themes` at most 2 per deck.
- OVERUSE: no body archetype more than 3 times total.
- CONNECTIVE PADDING: in decks of 8+ slides, at least 60% of slides are BODY slides. Substance
  lives in content-dense archetypes; cover/agenda/divider/thesis are transitions, not content.
- `slides:infographic-exhibit` caps at 3 per deck, and only with genuinely evidenced fields.
- PER-SLIDE VISUAL ASK (2026-10-27, gate-enforced): when the user asks for a visualization, diagram or workflow on
  EACH slide, EVERY research body slide is a drawn archetype (infographic-exhibit, flow-arc, milestone-timeline,
  ranked-bars, quadrant); a stat tile, table or text grid does not count. infographic-exhibit may then appear up
  to 5 times across different exhibit shapes (flowchart, process flow, before/after, composition). The slides
  carrying the user's attached document are exempt.
- CARD ICONS (2026-10-27): each card in a row (flow-arc `steps`, comparison-panels `panels`, org-model `columns`,
  numbered-themes `items`) may carry `icon`: ONE id naming the card's ACT or OBJECT (not its actor), a different id per
  card, from: risk, opportunity, growth, governance, compliance, data, insight, workflow, automation, integration,
  people, team, customer, time, roadmap, milestone, target, decision, alert, cost, value, security, channel, network,
  document, search, ai, feedback, scale, churn, retention, acquisition, conversion, funnel, segmentation,
  personalization, loyalty, satisfaction, sentiment, adoption, engagement, onboarding, resolution, backlog,
  throughput, capacity, efficiency, benchmark, forecast, trend, experiment, hypothesis, prototype, priority,
  dependency, blocker, handoff, consent, privacy, transparency, accountability, sustainability, partnership, contract,
  sla, incident, monitoring, migration, campaign, touchpoint. Omit `icon` on a card when none fits; the slides that
  carry the user's attached document take no icons.
- TIMELINE LABELS (2026-10-27): a milestone `date` is a calendar marker ("Q1 2027", "H2 2026", "2028") or a
  sequence word; a duration a source reports ("pilots in four to five weeks") rides in a quoted, sourced detail
  line, never as a bare label such as "WEEK 4-5". The composer replaces unsourced duration labels on research
  slides with FIRST / NEXT / THEN / LATER, so detail lines must not lean on the label ("took this long").
- SPEAKER NOTES: every `slides:*` payload may carry `speakerNotes` (plain text, <= 600 chars). It is exported to the
  PPTX notes page and never drawn on the slide. When the user asks for something to be DESCRIBED on each slide (a
  conceptual description of the visualization, talking points), it goes there; the visualization itself is drawn.
- COPY RULES (2026-10-25, from the partner / copy-editor audit of a live deck):
  - EVERY body slide carries an ACTION TITLE, block-quote included (`title`); the kicker names the subject, never the
    deck's structure ("THE RESPONSE", "WHY IT FAILS" are structure; "FIRST-YEAR ADVISING" is subject).
  - The title states what THIS slide's body shows; never a claim the body does not carry.
  - Spell out every acronym and internal product name on first use in the deck ("Comprehensive Learner Record
    (CLR)"); contract and work-order codes (SOW-style labels) never appear in body text.
  - Dates: today is the generation date given in the prompt. A milestone before today is shown as done ("Delivered
    Mar 2026") or left out; never as upcoming. Timelines use one date granularity.
  - Agenda items name the deck's actual sections in the deck's order, in one grammatical form.
  - One fact, one version: a capacity, owner or sequence stated on one slide is never contradicted on another.
- DIAGRAM FLOOR (2026-10-23, gate-enforced): a deck with 6+ body slides carries at least ONE `slides:infographic-exhibit`
  drawn from the evidence (two from 9 body slides): a FLOWCHART (`nodes` with kinds step | decision | system | actor |
  outcome | input, labeled `edges`, optional `groups`) for any branching path, hand-off or escalation; `process-flow`
  for a plain sequence; `stat-row` for cited figures; `composition` for a mix. When the request names a flowchart,
  diagram, decision tree or escalation path, a flowchart exhibit is MANDATORY. Tables and panels are visual, not
  diagrams; a sequence the reader must follow is drawn, never listed. The gate re-asks, then converts the first step
  sequence itself.
- SO-WHAT BAND: comparison-panels, milestone-timeline, ranked-bars and role-roadmap carry `takeaway: { label,
  statement }` (the judgment the exhibit proves, <= 140 chars); the composer closes the slide with it.
- DENSITY FLOOR (2026-10-23, gate-enforced on the payload): every BODY slide carries real reading matter,
  measured as the characters of every string in its payload with the pointers removed. Floors:
  numbered-themes / brief-card 520; comparison-panels 480; evidence-table 440; flow-arc 400; means-matters
  380; role-recommendation 360; role-needs 340; org-model / infographic-exhibit 320-340; quadrant /
  ranked-bars 300; stat-row / milestone-timeline 260; problem-diptych / role-roadmap 240; aggregate-roadmap
  220; block-quote 200. Fill EVERY field of the payload contract with complete sentences of substance (the
  actor, the mechanism, the named evidence); a bare label or a three-word phrase in a body field is what
  the gate catches. Write to the ceilings in section 6, not to a third of them.
- POINTER FLOOR: in a corpus-grounded deck every body slide binds at least one manifest pointer inside a
  factual field, and the archetype's quote-bearing field (quote / prove / note / evidence) carries a VERBATIM
  corpus sentence with its pointer. A slide with judgment only and no evidence is a connective slide in
  disguise.
<!-- SLOW_UPDATE_END -->

## 3. Narrative arc - plan the business argument FIRST (governs the whole deck)

A deck is ONE argument told start to finish, NOT an assortment of on-topic slides. BEFORE
choosing any archetype, decide the deck's spine and make every slide advance it:

1. THESIS: one contestable sentence the whole deck proves. State the answer up front (Minto);
   every slide ladders up to it.
2. ARC (Rumelt kernel + SCQA), in this order: (a) SETUP: context the audience accepts;
   (b) COMPLICATION / DIAGNOSIS: the central tension or failure named with evidence, why the
   status quo is unacceptable; (c) EVIDENCE: the themes and proof that establish the diagnosis;
   (d) IMPLICATION: the so-what for the business; (e) GUIDING POLICY + COHERENT ACTIONS: the
   recommendation and the moves that follow; (f) CLOSE: the decision or ask. A landscape or
   outlook deck STILL resolves to "and therefore..."; never end on a flat list.
3. CONNECTIVE TISSUE: consecutive slides must FOLLOW from one another. Read top to bottom, the
   titles alone must tell the whole argument (the Partner Test). Use section-divider /
   thesis-interstitial to mark arc TRANSITIONS, never as filler.
4. SUBSTANCE LIVES IN BODY SLIDES: the argument is carried by content-dense archetypes
   (numbered-themes, evidence-table, block-quote, org-model, means-matters, flow-arc, stat-row
   with real MEANS/MATTERS). A deck that is mostly sparse connective slides reads as empty.
5. AUTHORITATIVE SOURCE CONTENT: if the user pasted an enumerated set, build the arc AROUND it
   IN THE USER'S ORDER; sequence their items into setup -> diagnosis -> evidence -> so-what;
   never drop, merge, or reorder them.

<!-- SLOW_UPDATE_START -->
## 4. Title craft + subject discipline (HARD)

TITLE CRAFT (concise + literal, NO METAPHOR): every slide title is SHORT and PLAIN. Aim
<= 10 words / ~70 chars, one line; state the judgment in literal business language naming the
mechanism, system, actor, or proper noun. BANNED: figurative or cliche business metaphors and
imagery, e.g. "front door", "trust ceiling", "the meter", "margin closes" / "closes the margin",
"where value leaks", "bleeds", "...eat(s) it", "opens the door", "walk through first",
"redrawing the map". Name the literal thing instead. ("Funnel" terms, top/front of the funnel,
are legitimate marketing vocabulary, NOT banned.)

- BAD (wordy + metaphor): "AI moves the retail front door from search to the assistant, but the
  operators who win 2026 capture the premium before the platform tax and the trust ceiling eat it"
- GOOD (tight + literal): "AI assistants now originate retail traffic and convert better than search"
- BAD: "Retail 2026: The AI Front Door Opens, the Margin Closes"
- GOOD: "AI raises conversion and adds new costs in 2026"

The single deck THESIS line may run one sentence longer, but the metaphor ban has NO exception:
the thesis, the synthesis, and the closing/recommendation titles are where the temptation is
strongest; they stay just as literal as the body titles. Keep titles contestable (a named cause
or change a reader could disagree with), never topic labels.

SUBJECT DISCIPLINE (applies to EVERY field of EVERY slide): the deck is ABOUT THE SUBJECT (the
market, product, org, audience the user named), NEVER about the deck or report itself. Never
describe how the deck is built, structured, sequenced, or where to go next in it. BANNED as
content anywhere (title, subtitle, kicker, agenda items and group labels, section-divider
supporting, thesis, body): "how this deck/report is built", "where to ideate", "from diagnosis
to ideation", "the framework" (as a section name), "the takeaway" (as a section name), "at a
glance" (as a section name), "how might we questions" (as a LABEL; real HMW questions belong in
body content, never as a TOC entry), "the through-line", "the pattern behind", "the section
order", "setting up the narrative", and any "01: <name of a deck section>" agenda item pointing
at the deck's OWN parts. The AGENDA lists the SUBJECT'S domains in plain business language
(e.g. "Customer-facing failure modes", "Operational cost drivers", "The recommended response").
cover.subtitle / section-divider.supporting / thesis state a fact about the SUBJECT, never about
the document. A reader must never see that this is a generated deck or how it was assembled.

## 5. The infographic-exhibit depth contract (folded from infographic-composer)

`slides:infographic-exhibit` renders a NATIVE data panel composed from the payload's OWN
structured fields; the runtime draws ONLY what the payload carries. Full per-family reference:
`.claude/skills/infographic-composer/SKILL.md` (kept; this skill governs its use on decks).

THE ONE GOVERNING RULE: every visual element carries TWO layers, the LABEL (what it is) and the
SUBSTANCE (the evidence line that earns its place). A step without its description, a stat
without its quote, a bar without its basis is slop. If the corpus cannot fill the substance
layer, cut the element; if fewer than 3 elements survive, do not emit the infographic at all.

Family selection matches the slide's data shape, never a default:

| The slide's content is... | Family | Payload core |
|---|---|---|
| A sequence of 3-6 concrete moves or stages | `process-flow` | `steps[]` |
| Two contrasting states or approaches | `comparison` | `beforeAfter` |
| 2-5 hard figures, each carried by a cited quote | `stat-row` | `stats[]` |
| A ranked set (severity, frequency, priority) | `ranked-bars` | `items[]` |
| A labeled mix or distribution | `composition` / `citations` | `segments[]` / `citations[]` |

Across one deck, two infographics use two DIFFERENT families.

DEPTH (HARD): every `steps[]` / `actions[]` entry is an OBJECT
`{ "title": <the move, <=45 chars, verb-led>, "description": <one concrete line naming the
actor, system, or mechanism, <=90 chars> }`, NEVER a bare name string. A step without its
description renders as an empty card; compress the idea, never omit the line. Descriptions that
restate the title are padding, not substance. Numeric values ride ONLY with their verbatim cited
quote and named source (Quantitative Claim Rule); no cited quote means the value goes
QUALITATIVE or the stat is cut. The panel mirrors THE SLIDE's argument: same named systems,
actors, and sources as the surrounding deck section. Never author an image URL; `exhibitImage`
is runtime-owned.

NOTE: with the native diagram bricks available (flow-arc, ranked-bars, comparison-panels,
means-matters), prefer THOSE when the content is purely process / ranking / option-comparison /
stat shaped; reserve infographic-exhibit for the mixed structural finding (before/after
contrast, evidence-source mix) or where the takeaway-band anatomy fits best.

## 6. Reference-deck language rules (the voice)

- TERSE FOUNDER VOICE: short declarative sentences, plain verbs, zero throat-clearing. Every
  line earns its slot; if a clause can go, it goes. No hedging, no filler transitions, none of
  the banned slop phrases in `.claude/CLAUDE.md` (auto-rejected downstream).
- MEANS/MATTERS ANATOMY: a figure never stands alone. Each carried figure gets its MEANS (what
  the figure says, readable interpretation, <=110 chars) and its MATTERS (the business
  consequence, <=110 chars, rendered as the dark card on means-matters). ONE source line closes
  the slide; never per-stat source strips.
- QUALITATIVE TITLES, CITED NUMBERS: titles, kickers, and prose name the pattern, the system, or
  the proper noun, never a bare statistic. A number appears ONLY as a hero figure or in body
  copy whose verbatim cited quote rides with it in `sourceLine` (e.g. `Source: "One in three
  briefs stalls before synthesis." (Practice operations review)`). A naked number reads as
  fabricated and is rejected.
- BUDGETS BIND: body copy renders at the 14pt-readable scale, so compress the idea to the
  catalog's per-field ceilings (per-column body <= ~150 chars; MEANS/MATTERS <= ~110; takeaway
  <= ~140; evidence-table cells <= ~90). Compress, never truncate; emit `density=dense` only
  when the archetype's slots genuinely hold more.
- NO chrome: no page numbers, no run metadata, no confidence labels, no em-dash characters, no
  emoji, plain text only (the renderer owns formatting).
- JUDGMENT TITLES ON EVERY CONTENT SLIDE (THIS APPLIES TO EVERY CONTENT SLIDE): capability
  lists, data-source inventories, measurement frameworks, and outcome slides included. The
  KICKER carries the topic label ("AI CAPABILITIES"); the TITLE carries the judgment ("The
  platform learns risk-scoring from every farmer interaction"). A kicker plus a descriptive
  subtitle is NOT a title. ONE message per slide: a title joining two claims with "and" becomes
  two slides. No colon-then-triad titles, no "X, not Y" antithesis, no preamble-noun-plus-colon
  openers ("The competitive thesis:").
- QUOTES ARE COMPLETE SENTENCES: never a lowercase mid-sentence fragment ("installing fire
  detection and protection equipment."). Pick a span that starts and ends as a sentence, or pick
  a different span. Quotes are verbatim; the only edits allowed are fixing an unambiguous
  transcription mis-hearing of a proper noun in the subject's own domain and dropping a filler
  word ("like,", "you know").
- DECK-LEVEL EVIDENCE DIVERSITY (MANDATORY): across the whole deck no single citation carries
  more than a third of the slides; the same verbatim quote never appears on two slides; at least
  60% of citations name external (non-upload) sources. If a draft leans on one document, swap in
  the next-strongest independent source before emitting.

## 7. Imagery rules (runtime-owned, payload-derived)

The runtime fills content-derived editorial photography AFTER generation: a full-bleed scene
behind the cover (continued behind the agenda), an environmental thumbnail per numbered-themes
item, an environmental portrait on role-needs. The scenes derive from YOUR OWN payload text
(title/subtitle, item name+body, persona.name), so write those fields as CONCRETE, DEPICTABLE
subject language: name the actor, place, or system, whatever domain the corpus is about. NEVER
author image URLs or carrier fields (backgroundImage / itemImages / portraitImage / heroImage /
exhibitImage / panelImage are runtime-owned). When a numbered-themes slide profiles people or
segments, keep each `items[].body` <= 140 chars so the thumbnail layout breathes. `slides:scene`
takes an `imageConcept` (a literal shapes-as-content description), never a URL; not every scene
needs one.
<!-- SLOW_UPDATE_END -->

## 8. Legacy GOLD Slide-object flows (folded from deck-narrative-composer, 2026-10-01)

Stage 6.3 of `plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md` (finding A9) converged the
two deck skills. `deck-narrative-composer` is DELETED; this section carries its binding content for
the one surface it still governed: legacy GOLD Slide-object flows (`resolveLayout()` picks an
archetype, `mapToFields()` produces standard Slide objects; `services/layoutResolver.ts`,
`services/narrativeComposer.ts` for the interactive `#presentation` lane). On DECK MODE surfaces
(`:::slide template=slides:*` fences) sections 1-7 are the only contract; never inject both output
schemas into one prompt (the G3 conflict the 2026-07-09 split resolved).

### 8.1 Report-derived architecture and per-slide context injection

Data flow: Strategic Report sections -> per-slide injection -> the model declares WHAT to communicate
as content blocks -> `resolveLayout()` decides HOW (which archetype) -> `mapToFields()` emits Slide
objects. This removes empty templates, broken layouts, and missing evidence by construction.

Each slide is matched to a report section by, in order: `sourceDeliverable` exact match, prefix
match, title substring overlap (first 25 characters), keyword fallback (words longer than 4
characters). The matched section's content, key metrics, key quote, and citations are the context
for that slide only. Validator telemetry stays internal: never write "EVIDENCE GAP", "TBD", or any
QA-style annotation in a slide field; the reader is an executive, not a QA reviewer.

### 8.2 The 12 content block types and their composition rules

1. `hero_stat`: one dominant figure, carried by a cited quote. Fields: value, unit, context.
2. `evidence_bullets`: 2-4 findings with sources. Fields: items[{text, source}].
3. `metric_cards`: 2-4 KPI points. Fields: items[{label, value, trend}].
4. `quote_block`: VERBATIM quote with provenance. Fields: text, attribution, source.
5. `persona_card`: persona reference (portrait auto-injected by exact name). Fields: name, role, jtbd, quote.
6. `problem_statement`: a challenge backed by evidence. Fields: value, description, severity.
7. `solution_points`: 2-3 actions. Fields: items[{title, description}].
8. `data_grid`: 3-6 points for a grid / bento layout. Fields: items[{label, value, description}].
9. `journey_strip`: one blueprint stage. Fields: phase, action, pain, emotion, mot.
10. `comparison_row`: competitive or gap comparison. Fields: dimension, ours, theirs, gap.
11. `narrative_text`: 2-3 sentences of analytical prose. Fields: text.
12. `section_label`: section divider (alone on a section header slide). Fields: text.

Composition: every body slide carries at least one block with a source attribution
(`evidence_bullets`, `quote_block`, or `metric_cards` with source); 2-5 blocks per slide, mixed
types. The renderer selects the template from the block mix: `section_label` alone = section header;
`problem_statement` + `solution_points` = problem/solution split; `hero_stat` + 3 or more
`metric_cards` = data insight chart; 4 or more distinct block types = bento grid; `evidence_bullets`
without metrics = full-width card; otherwise the 55/45 content/data panel. Monotone slides (only
`narrative_text`) are a failure.

### 8.3 Verbalized Sampling for per-slide narrative (k=3)

Do not emit one fixed narrative per slide. Emit `narrativeCandidates[]` with three candidates, each
tagged `frame` ('data_lead' opens with the strongest cited figure and its named source; 'story_lead'
opens with a verbatim persona quote or vignette; 'tension_lead' opens with the contradiction or the
stakes), `probability` (0.0-1.0, the model's credence the framing fits this slide's role in the deck),
and `narrativeBlocks` (2-5 blocks from the schema above). The selector keeps the highest-probability
candidate that satisfies the deck-level variety rule (section dividers prefer 'story_lead';
data-heavy slides prefer 'data_lead'), then falls back to highest probability, then to the order
data_lead, story_lead, tension_lead. This is what breaks the "the data shows X, suggesting Y, with
implications for Z" cadence.

### 8.4 Deterministic enrichment after generation

A deterministic step (no model call) injects metrics, quotes, and sources from the matched report
section when the slide has none, replaces label-only bullets under 40 characters with evidence
sentences from the report, and fills empty content arrays from the section prose. Evidence reaches
the final deck regardless of generation quality; the step never invents.

### 8.5 Element-data imagery contract (E4, 2026-07-02)

The diffusion brand-image lane (`/api/ai/brand-image`, scene descriptions, `brandImage: { concept }`)
is retired. Content slots on repeating-item templates (theme thumbnail, persona panel, case-study
panel, recommendation panel) are filled by NATIVE infographic panels composed from each element's
own structured data (`services/artifactIllustrator.ts::infographicSpecFrom` -> `/api/ai/diagram`;
families stat-row, process-flow, comparison, ranked-bars, composition; chromeless, token-locked).
Data-dense matrices (journey, architecture, gap, competitive, blueprint, roadmap) carry diagrams.

GOVERNING RULE (user-locked, HARD): no pure decoration; visuals represent the element's content. You
no longer describe a scene; you author the element's structured fields richly enough that a
content-true panel composes from them. Per element: recommendations carry 3 or more concrete
`actions` / `steps` (each a named move; a `beforeAfter` pair renders as a comparison); themes carry a
real, named, diverse citation mix (2 or more named sources across source types); personas carry
complete, specific goals / pains / context entries; case studies carry intervention steps or a
before/after outcome pair. EMPTY BEATS INVENTED: an element with no derivable structured data gets no
panel; never pad fields to force one. Numbers in any stat-like field obey the Quantitative Claim
Rule. Legacy `brandImage` / `imageConcept` fields on GOLD elements are ignored; do not emit them (the
interactive `#presentation` lane, via the `illustrator` skill, is the one place a composer-seeded
`imageConcept` still applies).

### 8.6 Evidence mandates, storytelling rules, anti-patterns

- Every body slide has at least one block with a source attribution; `sources[]` lists actual
  publication / platform names; quote blocks are verbatim with text, attribution, and source;
  metric values are specific figures from the evidence carried by their cited quote.
- Every title is a complete sentence stating a conclusion (section 4 governs the craft). Every slide
  creates urgency, surprise, opportunity, or concern. Speaker notes carry presenter context,
  audience objections, and transition cues; they never repeat slide content.
- Never hedge ("it seems", "perhaps", "it is possible that"). Never greet, announce, or narrate the
  structure (the meta-narration ban in `.claude/CLAUDE.md`). No SaaS calls to action on the closing
  slide: the close names specific next steps with action, owner, and timeline. Plain text only in
  every field. Generic sources ("research data", "intelligence sources") are rejected.

### 8.7 Quality floors, dimensional extensibility, and the exemplar firewall

The universal floors apply to every record this flow emits: 3 or more named external citations per
top-level record; 60 percent or more of citations external; at least one verbatim attributed quote
per record when the corpus supports it; no fabricated entities; the 350-phrase ban, meta-narration,
process language, and QA annotations rejected; every top-level title a complete-sentence finding;
every claim naming a specific entity, system, or mechanism. Before emitting, check each floor; if one
fails, regenerate.

Dimensions this deck can carry: slide sequence and arc, action titles (one judgment each), per-slide
evidence, pull quotes, stat callouts (inside cited quotes only), section dividers, speaker notes,
transitions and throughline. Populate a dimension when the corpus or manifest evidences it; the
volume of insight is proportional to the volume of data. A chat-driven change is additive and
anchored: preserve approved content, modify only the named dimension (the reinforcement-inference
anchored re-ask), never silently rewrite the whole deck. If the user asks for a dimension the corpus
cannot support, say so and offer to ingest sources; never invent.

The gold-standard exemplar in `hic-workspace/wiki/eval/exemplars/` shows REPRESENTATIVE content for
form and depth. Match its structure, dimensional coverage, and house style; never its values. A thin
corpus yields a smaller, honest deck; the exemplar's depth is the ceiling of form, never a quota.

### 8.8 Learned behaviors (consolidated from feedback signals)

- Strictly adhere to the user's specified topic, narrative structure, slide sequence, source
  materials, and precise UI / UX design elements.
- Always include a title page, a table of contents (the narrative-arc agenda), and a structured
  narrative framework with clear themes.
- Eliminate redundant source citations, increase body copy size, and align sources directly beneath
  the quotes they support.

<!-- SLOW_UPDATE_START -->
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

> FIELD-NAME NOTE (2026-08-07): the `eyebrow` payload field in the slides:* schemas renders as the CANON KICKER (IBM Plex Mono SemiBold 17/+5px, cyan, UPPERCASE) - exactly ONE per slide, always the artifact-type line. Never emit additional micro-labels above titles or section headings; per-section labels that color/position already convey are banned (the "eyebrow slop" rule, owner 2026-08-07).
<!-- SLOW_UPDATE_END -->
