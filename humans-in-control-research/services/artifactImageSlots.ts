// artifactImageSlots.ts
//
// 2026-06-17 - Machine-readable mirror of the IMAGE-SLOT REGISTRY
// (hic-workspace/wiki/brand/figma-node-map.md `## IMAGE-SLOT REGISTRY` + the 5 fragments in
// wiki/brand/image-slots/). This is the runtime COVERAGE CONTRACT for GOLD/#slides artifact
// illustrations: it states, per artifact, WHICH placeholders exist (so generation can cover every
// one), HOW they sit (per-element row vs single panel vs glyph vs none), the ground (contrast), and
// the payload CARRIER field the renderer twin reads. The illustrator generation loop
// (artifactIllustrator.ts) walks this; the renderer twins (slideToStageHtml.ts + web.tsx) read the
// carriers. The Figma file remains the design canon; this is the runtime projection of it.
//
// IMPORTANT: concepts are NOT taken from the registry's exemplar `imgRole` text (that describes the
// demo CX-support engagement). At runtime each artifact is about a different subject, so the concept
// for slot i is derived from the LIVE payload element at position i (its title/idea). The registry
// fixes WHERE/HOW-MANY/GROUND/KIND + the no-image set; the live content fixes WHAT.

export type SlotGround = 'dark' | 'light';
export type SlotKind = 'panel' | 'hero' | 'thumbnail' | 'glyph';
/** Which visual BRANCH fills this slot (the per-placeholder decision from the live-Figma GOLD audit,
 *  2026-06-26; E4 revision 2026-07-02). icon = a tokenized reduced glyph (deterministic, $0);
 *  chart = a content-true data diagram (vizEngine); infographic = a NATIVE chromeless infographic
 *  (nxt_diagram_render families, built from the element's own data - replaces the retired memphis-iso
 *  diffusion 'emotive' branch, which the router now aliases here); none = image-free. The visual
 *  router treats this as the authoritative auto decision (the #img override still wins). */
export type SlotBranch = 'icon' | 'chart' | 'infographic' | 'emotive' | 'none';

export interface ArtifactImageSpec {
    /** Stable artifact key (matches the slide template id the twins dispatch on). */
    artifact: string;
    /** 'none' = registered as deliberately image-free (NEVER generate). 'panel'/'hero' = ONE image.
     *  'per-element' = one image per item in `elementField`, index-aligned. 'glyph' = small marks. */
    mode: 'none' | 'panel' | 'hero' | 'per-element' | 'glyph';
    /** Verified per-placeholder branch (GOLD audit 2026-06-26, live Figma). */
    branch?: SlotBranch;
    /** Figma node id of the placeholder/component (canon; mirrored, never called live). */
    node?: string;
    /** Slide background the image floats on -> drives the illustrator canvas-contrast rule. */
    ground?: SlotGround;
    /** Composition class requested from the illustrator. */
    kind?: SlotKind;
    /** REAL Figma container bounds (live per-container audit 2026-06-27). Drives type-appropriate
     *  sizing: the rendered image is sized to THIS, and the branch is sanity-checked against it. */
    bounds?: { w: number; h: number; aspect: number };
    /** object-fit for the rendered image in its container: emotive = 'cover' (full-bleed, crop ok);
     *  diagram + icon = 'contain' (never crop labels/marks). Read by the composer/renderer twins. */
    fit?: 'cover' | 'contain';
    /** For chart/diagram slots: the vizEngine families the container ASPECT permits. A thin banner
     *  (aspect > ~3) can only hold a horizontal flow/timeline; a square can hold none (-> icon). */
    vizFamilies?: string[];
    /** For per-element/glyph modes: the payload array whose items the images align to. */
    elementField?: string;
    /** The payload field the renderer twin reads. Per-element -> string[] index-aligned to
     *  elementField; panel/hero -> a single string (URL). */
    carrier: string;
    /** Max images for this artifact (per-element cap; honors the deck-wide ~4-5 taste cap elsewhere). */
    max?: number;
    /** imgOptional=true -> droppable first under budget. */
    optional?: boolean;
    /** Whether the renderer twin already emits this carrier (journey is the reference). */
    wired?: boolean;
    /** Short why, for the no-image set + provenance. */
    note?: string;
}

// One entry per artifact. Keys are the deliverable/template ids used across the renderer twins.
// `branch` + `bounds` = the verified PER-CONTAINER decision from the live-Figma audit (2026-06-27):
// every GOLD page + every #slides variant's image container was read for real bounds/aspect, and the
// branch + fit + vizFamilies were set so the image TYPE matches the container SIZE. Notable fixes:
//   - journey per-phase 150x150 square is ICON real-estate (an emotive scene can't read at 150px) -> icon.
//   - slides cover/divider/thesis are PORTRAIT full-bleed emotive panels; a diagram routed there must
//     render CONTAIN at a landscape inner box, never cover-cropped portrait (handled in vizSlot).
//   - thin-banner chart slots (themes 4.13, prd-story 4.53) constrain vizFamilies to horizontal flow.
//   - meta-themes + mindmap: glyph slots ADDED to live Figma 2026-06-27 (613:2 = 4 pattern marks 72px;
//     612:2 = 1 central-hub mark 120px; NU twins inherit) -> branch icon (renderer-paint pending, wired:false).
export const ARTIFACT_IMAGE_SPECS: Record<string, ArtifactImageSpec> = {
    // ---- WIRED reference -------------------------------------------------------------------
    'journey-map': {
        artifact: 'journey-map', mode: 'per-element', branch: 'icon', node: '676:769',
        ground: 'light', kind: 'glyph', bounds: { w: 150, h: 150, aspect: 1 }, fit: 'contain',
        elementField: 'stages', carrier: 'phaseImages', max: 6, optional: false, wired: true,
        note: 'per-phase cell 150x150 square (676:769.. on 595:2; all T2/T3/in-table/NU variants same). AUDIT 2026-06-27: square @150px is ICON real-estate, not an emotive scene (was wrongly tagged emotive). A per-phase domain glyph (search/wait/resolve) reads; a flat-vector scene does not.',
    },

    // ---- PER-ELEMENT slots -> ICON (per-entity / per-card marks) ----------------------------
    'persona-card': {
        artifact: 'persona-card', mode: 'none', branch: 'none', carrier: '',
        note: 'persona-dense 614:10 has no slot; archetype emblems live on personas-overview (see below)',
    },
    'personas-overview': {
        artifact: 'personas-overview', mode: 'per-element', branch: 'icon', node: '678:5471',
        ground: 'light', kind: 'glyph', bounds: { w: 150, h: 150, aspect: 1 }, fit: 'contain',
        elementField: 'personas', carrier: 'archetypeIcons', max: 4, optional: true, wired: false,
        note: 'personas overview 596:2 - ARCHETYPE EMBLEM per persona (678:5471/5473/5475/5477) 150x150 square; NEVER a face. wired:false BY DESIGN (verified 2026-06-28): personas-overview is a GOLD Figma-PAGE artifact, not a chat-emitted slide template. The chat #personas path emits :::slide template=persona-card (single card, now paints persona.imageUrl). No personas-overview renderer exists in the slide-render twins (slideToStageHtml / goldPreviews / SlideCanvas) and no code path emits this template, so there is nothing to paint the archetypeIcons carrier into. It is filled only by the separate GOLD HTML-template fill pipeline (loadGoldTemplate + buildGoldFillPrompt). Leave wired:false until/unless a multi-persona overview slide template is added to the twins.',
    },
    'competitive-matrix': {
        artifact: 'competitive-matrix', mode: 'per-element', branch: 'icon', node: '603:3',
        ground: 'light', kind: 'glyph', bounds: { w: 80, h: 80, aspect: 1 }, fit: 'contain',
        elementField: 'rowsProse', carrier: 'peerImages', max: 4, optional: true, wired: true,
        note: 'competitive 603:3 - one emblem per peer (678:5530..) 80x80 square = icon. WIRED 2026-06-28: BOTH twins paint peerImages[i] beside the institution name in the prose evidence table (slideToStageHtml .etglyph + goldPreviews CompetitiveMatrixSlide prose rows); index-aligned to the ORIGINAL rowsProse array (top/second filter preserves index via a position map).',
    },
    'strategy': {
        artifact: 'strategy', mode: 'per-element', branch: 'icon', node: '604:2',
        ground: 'light', kind: 'glyph', bounds: { w: 104, h: 92, aspect: 1.13 }, fit: 'contain',
        elementField: 'actions', carrier: 'actionImages', max: 5, optional: true, wired: false,
        note: 'strategy 604:2 - per-action marker (678:5512..) 104x92 near-square = icon. wired:false BY DESIGN (verified 2026-06-28): #strategy routes to the strategy-author SKILL which emits a MULTI-SLIDE deck (recommendation / section-divider / theme slides), not a single strategy template with an actions[] array. The registry "strategy" entry describes the GOLD Figma strategy PAGE (604:2), filled by the separate GOLD HTML-template fill pipeline, not by a slide-render twin. There is no slide template named "strategy" in SlideCanvas/goldPreviews/slideToStageHtml to paint actionImages into. Leave wired:false until/unless a single-slide strategy template with actions[] is added to the twins.',
    },
    'prd-feature': {
        artifact: 'prd-feature', mode: 'per-element', branch: 'icon', node: '607:5',
        ground: 'light', kind: 'glyph', bounds: { w: 150, h: 110, aspect: 1.36 }, fit: 'contain',
        elementField: 'features', carrier: 'featureImages', max: 4, optional: true, wired: true,
        note: 'prd 04 milestones (607:5, 678:5488..) 150x110 = small per-item emblem = icon. WIRED 2026-06-28: the chat-emitted prd-feature payload uses features[] (NOT milestones[] - that name belonged to the GOLD page mock), so the carrier was realigned to elementField=features / carrier=featureImages and BOTH twins paint featureImages[i] in each feature-card header (slideToStageHtml renderPrdFeature/Dense + goldPreviews PrdFeatureSlide, deep + grid paths).',
    },
    'prd-story': {
        artifact: 'prd-story', mode: 'panel', branch: 'chart', node: '607:3',
        ground: 'light', kind: 'panel', bounds: { w: 680, h: 150, aspect: 4.53 }, fit: 'contain',
        vizFamilies: ['journeyLine', 'funnelFlow', 'timelineGantt', 'flowSchematic'],
        carrier: 'panelImage', optional: true, wired: false,
        note: 'prd 02 story-detail (607:3, 678:5492) 680x150 THIN BANNER (4.53): horizontal flow/timeline only, never a network/radar',
    },

    // ---- SINGLE-PANEL deliverables ---------------------------------------------------------
    'executive-brief': {
        artifact: 'executive-brief', mode: 'panel', branch: 'infographic', node: '938:962',
        ground: 'light', kind: 'panel', bounds: { w: 1660, h: 313, aspect: 5.3 }, fit: 'contain',
        carrier: 'exhibitImage', optional: true, wired: true,
        note: 'E3 2026-07-02 density-adaptive re-anatomy (plan artifact-total-elevation, evidence E-3): the brief page declares ONE full-width VISUAL slot - a native infographic composed from the brief sections OWN data (evidence-mix / process-flow via infographicSpecFrom). Both twins (slideToStageHtml renderExecutiveBrief + web ExecutiveBriefSlide) read executiveBrief.exhibitImage and COLLAPSE the band when absent (recorded decision, never an empty well); no-quote finding cards collapse to compact signal rows (evidence-or-collapse). FIGMA CANON LANDED 2026-07-02 (D16): frame 366:2 re-laid + componentized -> COMPONENT 938:962 with the named child brand-image-slot 937:973 (fill-width, renders 1660x313; the literal 1382 spec was rejected on-canvas because it left a 278px dead gutter). Token-bound: ecru/hairline; SIGNALS strip 937:962.',
    },
    'recommendation': {
        artifact: 'recommendation', mode: 'panel', branch: 'infographic', node: '678:5526',
        ground: 'light', kind: 'panel', bounds: { w: 560, h: 140, aspect: 4.0 }, fit: 'cover',
        carrier: 'panelImage', optional: true, wired: true,
        note: 'USER OVERRIDE 2026-06-28 scenes-where-they-fit: per-recommendation supporting EMOTIVE scene. LIVE-FIGMA AUDIT 2026-06-28: the recommendation-detail component 597:4 (page 66:2 GOLD recommendations nxt) carries a lower-right img-slot 678:5526 below the EXPECTED IMPACT quote - STYLED this round into a token-bound brand-image-slot (560x140 ecru/hairline/radius-base, matching themes 895:338). NU twin 625:1841 inherits via mode-flip. 560x140 is a thin banner (aspect 4.0): the scene must read at banner crop (cover). NOTE the recommendation-DENSE GOLD component 614:5 (the renderRecommendation export auto-route for >=4-action payloads) is content-packed with NO room and stays image-free; this panel paints only on the NON-dense recommendation slide (web RecommendationSlide right rail + slideToStageHtml default 2-col branch). Renderer reads recommendation.panelImage, falls back to heroImage.src.',
    },
    'tech-audit': {
        artifact: 'tech-audit', mode: 'panel', branch: 'chart', node: '605:3',
        ground: 'dark', kind: 'panel', bounds: { w: 404, h: 208, aspect: 1.94 }, fit: 'contain',
        vizFamilies: ['flowSchematic', 'operatingNetwork', 'capabilityStack', 'comparisonMatrix'],
        carrier: 'panelImage', optional: true, wired: false,
        note: 'tech-audit 02 risk-detail (605:3, 678:5466) 404x208 landscape ~2:1 - good for a labeled risk/arch diagram',
    },
    'timeline': {
        artifact: 'timeline', mode: 'panel', branch: 'chart', node: '599:3',
        ground: 'dark', kind: 'panel', bounds: { w: 468, h: 316, aspect: 1.48 }, fit: 'contain',
        vizFamilies: ['timelineGantt', 'capabilityStack', 'comparisonMatrix'],
        carrier: 'panelImage', optional: true, wired: false,
        note: 'roadmap NOW-horizon (599:3, 290:50) 468x316 landscape - gantt/foundation-layers diagram fits',
    },
    'theme-cluster': {
        artifact: 'theme-cluster', mode: 'per-element', branch: 'infographic', node: '590:9',
        ground: 'light', kind: 'thumbnail', bounds: { w: 492, h: 290, aspect: 1.7 }, fit: 'cover',
        elementField: 'themes', carrier: 'themeImages', max: 4, optional: true, wired: true,
        note: 'USER OVERRIDE 2026-06-27: each theme card carries its OWN content-true emotive thumbnail derived from THAT theme thesis. FIGMA RELAYOUT 2026-06-27: per-card brand-image-slot placed as the FIRST child of each theme card on overview 590:9 (slots 895:338/895:339/895:340, 492x290 ecru/hairline/radius-base token-bound; card+row grown 470->700h; the prior SHARED decorative strip 892:337 was REMOVED). NU twin 625:385 inherits the per-card slots + recolor as a mode flip. NO PURE DECORATION: per-theme image must trace to that theme. Renderer reads themeCluster.themeImages[i] (index-aligned to themes), falls back to themes[i].brandImage.',
    },
    'persona-detail': {
        artifact: 'persona-detail', mode: 'panel', branch: 'infographic', node: '602:2',
        ground: 'light', kind: 'panel', bounds: { w: 460, h: 230, aspect: 2 }, fit: 'cover',
        carrier: 'panelImage', optional: false, wired: false,
        note: 'persona-detail portrait 602:2 (380x150) / fingerprint 602:3 (460x230) landscape figure panels - emotive abstract, never a face',
    },

    // ---- GLYPH artifacts: live Figma slots ADDED 2026-06-27 (component-nested, NU twins inherit) --
    'meta-themes': {
        artifact: 'meta-themes', mode: 'per-element', branch: 'icon', node: '613:2',
        ground: 'light', kind: 'glyph', bounds: { w: 72, h: 72, aspect: 1 }, fit: 'contain',
        elementField: 'themes', carrier: 'patternImages', max: 4, optional: true, wired: true,
        note: 'SLOT ADDED 2026-06-27: meta-themes 613:2 carries 4 per-pattern glyph slots (683:5501/5502/5503/5504) 72x72 square on pattern-grid; NU twin 626:687 inherits. icon = a tokenized pattern mark per portfolio pattern. WIRED (verified 2026-06-28): renderMetaThemesHtml is fully token-bound (mtPalette resolves every colour/font from getBrand -> design tokens, NO literal hex) AND paints each card glyph via compositeIcon (content-true-or-nothing) - the .mt-glyph <img>. carrier name patternImages is the registry contract; this renderer derives the glyph deterministically from the canonical pattern name rather than reading a pre-generated URL array, so no async carrier write is needed.',
    },
    'mindmap': {
        artifact: 'mindmap', mode: 'glyph', branch: 'icon', node: '612:2',
        ground: 'light', kind: 'glyph', bounds: { w: 120, h: 120, aspect: 1 }, fit: 'contain',
        carrier: 'hubImage', optional: true, wired: true,
        note: 'SLOT ADDED 2026-06-27: mindmap 612:2 carries ONE central-hub glyph slot (683:5509) 120x120 crowning the radial decomposition; NU twin 626:615 inherits. icon = a tokenized mark for the central research question. WIRED (verified 2026-06-28): renderMindMapHtml is fully token-bound (tokensFor resolves every colour/font from getBrand, NO literal hex) AND paints the central hub glyph via compositeIcon (content-true-or-nothing) as the .mm-hub-glyph <img> overlay on the root disc. carrier name hubImage is the registry contract; the renderer derives the hub glyph deterministically from the research goal rather than reading a pre-generated URL, so no async carrier write is needed.',
    },

    // ---- #slides archetypes: PORTRAIT full-bleed panels -------------------------------------
    // E4 INTERIM (2026-07-02): the memphis-iso diffusion lane that filled these DECORATIVE heroes is
    // retired, and a chromeless data infographic is the wrong content for a cover/divider hero. These
    // slots are branch:'none' (recorded image-free decision, phase 8) until the E3 creative-director
    // pass defines the cover visual language (type-led covers / brand geometry are the candidates).
    'slides:cover': {
        artifact: 'slides:cover', mode: 'panel', branch: 'none', node: '659:502',
        ground: 'dark', kind: 'panel', bounds: { w: 820, h: 1080, aspect: 0.76 }, fit: 'cover',
        carrier: 'heroImage', optional: true, wired: true,
        note: 'cover 609:2 (659:502) 820x1080 portrait full-bleed - emotive signature visual. WIRED 2026-06-29: composer paints composerPayload.heroImage as a full-bleed <img> (slideComposer HERO_PANEL); GEO walker exports it as a native swappable picture placeholder. Nothing hardcoded (bounds=Figma canon, colors/fonts=tokens).',
    },
    'slides:section-divider': {
        artifact: 'slides:section-divider', mode: 'panel', branch: 'none', node: '661:473',
        ground: 'dark', kind: 'panel', bounds: { w: 820, h: 1080, aspect: 0.76 }, fit: 'cover',
        carrier: 'heroImage', optional: true, wired: true,
        note: 'section-divider 609:4 (661:473) 820x1080 portrait full-bleed - emotive transition visual. WIRED 2026-06-29: composer paints composerPayload.heroImage as a full-bleed <img> (slideComposer HERO_PANEL); GEO walker exports a native picture placeholder. Nothing hardcoded.',
    },
    'slides:thesis-interstitial': {
        artifact: 'slides:thesis-interstitial', mode: 'panel', branch: 'none', node: '661:474',
        ground: 'dark', kind: 'panel', bounds: { w: 920, h: 1080, aspect: 0.85 }, fit: 'cover',
        carrier: 'heroImage', optional: true, wired: true,
        note: 'thesis 609:5 (661:474) 920x1080 portrait full-bleed - emotive abstract of the thesis. WIRED 2026-06-29: composer paints composerPayload.heroImage as a full-bleed <img> (slideComposer HERO_PANEL); GEO walker exports a native picture placeholder. Nothing hardcoded.',
    },
    'slides:agenda': {
        artifact: 'slides:agenda', mode: 'hero', branch: 'none', node: '661:472',
        ground: 'light', kind: 'hero', bounds: { w: 500, h: 420, aspect: 1.19 }, fit: 'cover',
        carrier: 'panelImage', optional: true, wired: false,
        note: 'agenda 609:3 (661:472) 500x420 lower-right accent - small emotive',
    },

    // ---- #slides CONTENT archetypes: scenes-only-where-they-fit (USER OVERRIDE 2026-06-28) -----
    // These are the GOLD page 324:2 CONTENT archetypes (slides: namespace, rendered by slideComposer,
    // NOT the GOLD dispatch). LIVE-FIGMA ROOM AUDIT 2026-06-28 of all 10: only block-quote + org-model
    // had genuine empty container room without crowding text. The other 8 are full or tabular and stay
    // image-free (numbered-themes/role-recommendation columns packed; problem-diptych/role-needs cards
    // full to the bottom; evidence-table/aggregate-roadmap = the table/matrix IS the body; stat-row =
    // content-complete; role-roadmap = narrow phase columns -> per-phase mark = decoration). The
    // composer reads the carrier off the slide's composerPayload; the chat seam routes the carrier
    // write through SUBFIELD['slides:*'] = 'composerPayload' (CorpusChatPanel).
    'slides:block-quote': {
        artifact: 'slides:block-quote', mode: 'panel', branch: 'none', node: '901:477',
        ground: 'light', kind: 'panel', bounds: { w: 900, h: 200, aspect: 4.5 }, fit: 'cover',
        carrier: 'panelImage', optional: true, wired: true,
        note: 'USER OVERRIDE 2026-06-28 scenes-where-they-fit. LIVE-FIGMA AUDIT: block-quote 609:7 has a clear empty LEFT band between the quote (ends ~local y500) and the attribution (local y778). Added token-bound brand-image-slot 901:477 (900x200 ecru/hairline/radius-base, x209 y540) tracing to the quote subject; NU twin 626:95 inherits via mode-flip (verified navy/red/Lato). 900x200 is a thin banner (4.5) -> cover crop. Renderer twin = slideComposer block-quote image region (payload.panelImage).',
    },
    'slides:infographic-exhibit': {
        artifact: 'slides:infographic-exhibit', mode: 'panel', branch: 'infographic', node: '324:2',
        ground: 'light', kind: 'panel', bounds: { w: 1622, h: 600, aspect: 2.7 }, fit: 'contain',
        carrier: 'exhibitImage', optional: false, wired: true,
        note: '2026-07-02 #slides infographic uplift: the deck-native DATA VISUAL archetype. Composer spec slides:infographic-exhibit (slideComposer ARCHETYPE_SPECS) renders composerPayload.exhibitImage full-width between the title hairline and the takeaway band. The panel is composed from the slide payload OWN fields by the native lane (infographicSpecFrom: steps/actions -> process-flow; beforeAfter -> comparison; stats/kpiTiles -> stat-row; citations -> composition) via /api/ai/diagram chrome:none at these bounds. NOT optional: an infographic-exhibit slide without derivable data is a protocol violation (the model must only emit this archetype when it has the structured fields). Figma canon rides page 324:2 (exemplar frame pending the next canon pass); bounds here are the code-side contract.',
    },
    'slides:org-model': {
        artifact: 'slides:org-model', mode: 'per-element', branch: 'icon', node: '901:5476',
        ground: 'light', kind: 'glyph', bounds: { w: 72, h: 72, aspect: 1 }, fit: 'contain',
        elementField: 'columns', carrier: 'columnIcons', max: 3, optional: true, wired: true,
        note: 'USER OVERRIDE 2026-06-28 scenes-where-they-fit. LIVE-FIGMA AUDIT: org-model 609:11 cards (520x660) have ~127px empty card-bottom below OWNED OUTCOMES (content ends ~local y773). Added 3 per-column 72x72 token-bound icon slots 901:5476/5477/5478 (x card+24, y800); NU twin 626:236 inherits. icon = a CONTENT-TRUE per-column operating-model glyph, never decoration. Renderer twin = slideComposer org-model columns image cell (columns[i].icon). NOTE carrier columnIcons[] is index-aligned to columns; the composer cell reads columns[i].icon, so the chat-seam resolver writes each url onto columns[i].icon (per-element).',
    },

    // ---- DELIBERATELY image-free (registered decisions - NEVER generate) -------------------
    'case-study': {
        artifact: 'case-study', mode: 'panel', branch: 'infographic', node: '890:357',
        ground: 'light', kind: 'panel', bounds: { w: 544, h: 300, aspect: 1.81 }, fit: 'cover',
        carrier: 'panelImage', optional: true, wired: true,
        note: 'USER OVERRIDE 2026-06-28 scenes-where-they-fit: per-case supporting EMOTIVE scene. LIVE-FIGMA AUDIT 2026-06-28: the FOUR-BLOCK case-study component 588:7 (page 184:159) already carries a brand-image-slot 890:357 (544x300, IMAGE-fill placeholder, radius 4) at the top of the dark IN-THEIR-WORDS right panel; NU twin 625:314 inherits it (I625:314;890:357) via mode-flip. The other variants (before-after 585:2, evidence-stack 588:6, overview 588:4, Zappos-detail 588:5) are full-width dense layouts with NO room -> they stay image-free; this panel paints ONLY on the four-block variant. Renderer reads caseStudy.panelImage (four-block right panel only).',
    },
    'gap-matrix': { artifact: 'gap-matrix', mode: 'none', branch: 'none', carrier: '', note: 'dense 4-col gap matrix' },
    'architecture-map': { artifact: 'architecture-map', mode: 'none', branch: 'none', carrier: '', note: 'connector-collision ban' },
    'service-blueprint': { artifact: 'service-blueprint', mode: 'none', branch: 'none', carrier: '', note: 'Bitner matrix IS the body' },
    'org-model': { artifact: 'org-model', mode: 'none', branch: 'none', carrier: '', note: 'tier matrix + connectors' },
    'systems-inventory': { artifact: 'systems-inventory', mode: 'none', branch: 'none', carrier: '', note: 'dense table' },
    'block-quote': { artifact: 'block-quote', mode: 'none', branch: 'none', carrier: '', note: 'right data panel already' },
    'stat-row': { artifact: 'stat-row', mode: 'none', branch: 'none', carrier: '', note: 'content-complete data slide' },
    'section-divider': { artifact: 'section-divider', mode: 'none', branch: 'none', carrier: '', note: 'GOLD divider (slides: variant carries the panel)' },
};

/** Lookup an artifact's image spec by template/deliverable key. Unknown keys -> undefined (treated as
 *  no-image by callers: never invent slots the registry does not list). */
export function imageSpecFor(artifact: string | undefined | null): ArtifactImageSpec | undefined {
    if (!artifact) return undefined;
    return ARTIFACT_IMAGE_SPECS[artifact];
}

/** True when the registry explicitly lists this artifact as deliberately image-free. */
export function isImageFree(artifact: string | undefined | null): boolean {
    const s = imageSpecFor(artifact);
    return !!s && s.mode === 'none';
}
