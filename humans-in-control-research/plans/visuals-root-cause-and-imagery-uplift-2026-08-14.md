# Deck imagery: root causes of the colleague's dissatisfaction + the uplift idea set

2026-08-14. Input: the colleague's email thread (18-slide NXT deck, "Include graphics and
images" in the prompt, 2 slides carried images; #refine "add images and graphics" produced
pasted, uneditable graphics on one slide; she cannot find any image control besides chat
prompting) + this session's history + the Figma canon (iSQhAVM7 GOLD pages, EOWX9 HiC-DS
hashtag pages). Advances Unified Vision phases 6 (routing), 8 (componentized GOLD imagery),
9 (native PPTX). Extends F1 of `sota-elevation-loops-caching-rsi-okf-2026-08-07.md`.

## Part 1: Root causes (verified in code, file:line)

RC1. HER ASK NEVER PARSED. `sessionConstraints.ts:121` MORE_VISUALS_RE requires
     "more|additional|extra|add + graphics/images" or "make it more visual". She wrote
     "INCLUDE graphics and images" - no match, so no directive compiled, no floor raise,
     no echo-back telling her it registered. The V3/V4 machinery shipped 2026-08-07 was
     never engaged by the exact phrasing a real user chose.

RC2. THE GATE COUNTS DIAGRAMS, NOT IMAGES. `deckPlanGate.ts:97-106`: the 40% "visual"
     floor counts VIZ ARCHETYPES (flow-arc, evidence-table, stat-row, ranked-bars...).
     A deck of tables passes the floor with zero photographs. There is NO image quota,
     no imageRatio concept anywhere in the gate. Her complaint is about IMAGES; the
     system's only quota is about diagrams. Currency mismatch.

RC3. IMAGE SLOTS EXIST IN CANON BUT FILL IS OPT-IN. The Figma exemplars carry img-slots
     (numbered-themes item thumbs 380x204, role-needs portrait 560x236, block-quote scene
     panel 900x200, cover full-bleed) and the photo lane shipped 2026-07-03. But the deck
     composer only MANDATES cover imagery; body-slide slots fill only when the model
     volunteers payload fields or the registry resolver fires. Result: cover + one panel =
     exactly what she got (2/18). The slots are a capability, not a contract.

RC4. #REFINE BYPASSES THE VISUAL MACHINERY. Refine/edit paths apply per-slide changes;
     a deck-wide ask ("images on at least half the slides") has no compiler, no quota,
     no slot-fill pass - so one slide changed. And the graphics it adds arrive as pasted
     pictures: the native-exhibit lane (D17) produces PNG panels BY DESIGN, but on the
     refine path they land as plain pictures without the native-editable treatment the
     gold exporter gives stat/comparison families (native text runs + shapes).

RC5. ZERO DISCOVERABILITY. #img=generate/diagram/icon/none exists (hashtagParser), the
     Designer desk does per-slide imagery, the persona pipeline has an imagery contract -
     none of it is surfaced in the UI. Her literal words: "I'm not sure if I'm missing a
     different way to make images other than prompting in the chat." She wasn't missing
     one; there isn't one she could find.

## Part 2: The idea set

### A. Figma exemplars (canon changes)

A1. IMAGERY=ON VARIANTS FOR EVERY BODY ARCHETYPE. Each slides:* archetype in canon gets
    a designed image-on variant showing the slot filled at CD quality: numbered-themes
    (item thumbs), role-needs (portrait), block-quote (scene band), flow-arc (step art
    strip), milestone-timeline (phase art), evidence-table (subject thumbnails in the
    header row), section-divider (full-bleed treatment already exists). Variant property
    Imagery=On/Off so the composer picks by directive, and the exemplar-manifest lists
    both node ids per archetype.

A2. A CANONICAL PHOTO-RICH DECK PAGE. One 8-10 slide GOLD deck exemplar (synthetic data,
    one industry) at the TARGET image density (image-bearing slide fraction ~0.5): the
    visual reference the agents consult and the calibration target for the gate. Lives
    beside GOLD - slides; catalogued in figma-node-map + exemplar-manifest.

A3. SLOTS-AS-CONTRACT METADATA. Per-archetype `imageSlots` entries in the exemplar
    manifest (slot name, px frame, style lane: photo-scene | photo-portrait | line |
    native-exhibit) so the runtime knows every fillable slot without inference, and an
    empty slot on an imagery-directed run is detectable by the gate (Law 12 already
    declares empty-slot-in-shipped-artifact a violation; this makes it checkable).

### B. Skills + agent instructions

B1. DECK-COMPOSER IMAGERY QUOTA CONTRACT. New binding section: when the session carries
    a visuals directive OR the prompt asks for imagery, the deck plan must (a) choose
    image-capable archetypes for at least the asked fraction of body slides, (b) emit a
    Law 12 GENERATE instruction (DERIVED FROM + SOURCE ANALYSIS, reuse-first) for every
    slot on those slides, (c) never satisfy the ask with diagrams alone - images and
    diagrams are DIFFERENT currencies (RC2's lesson, stated as doctrine).

B2. POST-COMPOSE SLOT-FILL PASS (designer skill). After the deck composes, the visual
    router iterates every slide's declared imageSlots: fill from the illustration
    catalog first (reuse-first, zero cost), generate only for unmatched concepts under
    a per-deck budget cap (e.g. 6 generations), leave NOTHING empty on an
    imagery-directed run. This is the mechanism that turns 2/18 into 9/18 without the
    model having to volunteer anything.

B3. REFINE/EDIT INSTRUCTIONS. Deck-wide edit asks compile through the SAME directive
    compiler (a "half the slides" ask parses a numeric fraction into the floor), then
    re-run the B2 slot-fill pass across the whole deck, not a single-slide patch. The
    analyst-chat echo-back confirms what registered ("Imagery floor raised to 50% for
    this session").

### C. Pipeline/gate (the enforcement layer)

C1. TWO-TIER INTENT COMPILER (owner direction 2026-08-14: reasoning model, not regex,
    for understanding the user). Tier 1: hashtags stay exact-match commands (a command
    language should never be reinterpreted). Tier 2: every artifact-bound prompt goes to
    gemini-3.5-flash with the SessionConstraints schema as forced structured output
    (visuals directives, exclusions, numeric fractions "at least half" -> 0.5, tone),
    temperature 0; the existing regexes demote to fast-path pre-check and offline
    fallback; the existing clamps (0.4-0.7) still bound whatever the model emits; the
    compiled result ALWAYS echoes back in chat ("Registered: imagery on at least half
    the slides") so a silent miss (RC1) is impossible even when parsing fails. Flash
    call runs parallel with retrieval: no perceived latency, negligible cost.

C2. imageRatio IN deckPlanGate, SEPARATE FROM visualRatio. Count body slides whose
    archetype carries a filled/declared image slot; enforce the directive floor on
    IMAGES specifically; keep the existing 40% diagram floor unchanged. Violation text
    names which slides to convert and which slots to fill.

C3. NATIVE-EDITABLE GRAPHICS ON EVERY PATH. Refine-inserted panels route through the
    gold exporter's native lane (stat/comparison/process families = native text + shapes;
    photo/diagram exhibits = replaceable pictures at slot bounds). The pasted-flat-image
    experience (RC4) becomes impossible on any path that reaches PPTX.

C4. DISCOVERABILITY SURFACE. (a) A post-deck suggestion chip: "Add imagery to half the
    slides" (compiles the directive + triggers B3). (b) #help gains an IMAGERY section
    documenting #img=, the directive phrases, and the Designer desk per-slide flow.
    (c) The deck-ready chat message names the image count ("9 of 18 slides carry
    imagery") so the user sees the number without opening the deck.

### D. Sequencing (proposal)

P0 (highest leverage, smallest): C1 regex+echo, C2 imageRatio, B1 skill contract.
P1: B2 slot-fill pass + A3 slot metadata (they are one feature seen from two sides).
P2: A1 imagery variants + A2 photo-rich canon page (Figma authoring session).
P3: C3 refine-path native graphics + C4 discoverability chrome.

Cost note: B2's reuse-first + budget cap keeps the marginal cost of an imagery-directed
deck at <= N generations (owner cost rule 2026-08-07); catalog reuse covers the rest.
