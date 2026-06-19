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

export interface ArtifactImageSpec {
    /** Stable artifact key (matches the slide template id the twins dispatch on). */
    artifact: string;
    /** 'none' = registered as deliberately image-free (NEVER generate). 'panel'/'hero' = ONE image.
     *  'per-element' = one image per item in `elementField`, index-aligned. 'glyph' = small marks. */
    mode: 'none' | 'panel' | 'hero' | 'per-element' | 'glyph';
    /** Slide background the image floats on -> drives the illustrator canvas-contrast rule. */
    ground?: SlotGround;
    /** Composition class requested from the illustrator. */
    kind?: SlotKind;
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
export const ARTIFACT_IMAGE_SPECS: Record<string, ArtifactImageSpec> = {
    // ---- WIRED reference -------------------------------------------------------------------
    'journey-map': {
        artifact: 'journey-map', mode: 'per-element', ground: 'light', kind: 'thumbnail',
        elementField: 'stages', carrier: 'phaseImages', max: 6, optional: false, wired: true,
        note: 'per-phase thumbnail row (base/T2/T3/in-table share contract; count from stages.length)',
    },

    // ---- PER-ELEMENT matrices (mirror the journey pattern) ---------------------------------
    // CORRECTED 2026-06-17 from live Figma: persona-DENSE (322:123) has NO img-slot. The persona
    // imagery lives on the personas OVERVIEW component (111:159) as 4 persona-TYPE thumbnails, which
    // maps to a different renderer than persona-card. Marked none here until the overview twin is
    // mapped + wired from the real slot bounds. (Earlier per-behavior wiring was invented - reverted.)
    'persona-card': {
        artifact: 'persona-card', mode: 'none', carrier: '',
        note: 'persona-dense 322:123 has no slot; persona imagery is on personas overview 111:159 (different twin)',
    },
    'competitive-matrix': {
        artifact: 'competitive-matrix', mode: 'per-element', ground: 'light', kind: 'thumbnail',
        elementField: 'rowsProse', carrier: 'peerImages', max: 4, optional: true, wired: false,
        note: 'competitive 603:3 self-serve-resolution - one emblem per peer (optional accent marks)',
    },
    'strategy': {
        artifact: 'strategy', mode: 'per-element', ground: 'light', kind: 'thumbnail',
        elementField: 'actions', carrier: 'actionImages', max: 5, optional: true, wired: false,
        note: 'strategy 604:2 - one thumbnail per coherent action column',
    },
    'prd-feature': {
        artifact: 'prd-feature', mode: 'per-element', ground: 'light', kind: 'thumbnail',
        elementField: 'milestones', carrier: 'milestoneImages', max: 4, optional: true, wired: false,
        note: 'prd 04 milestones - one thumbnail per milestone card (+ separate story-detail panel)',
    },

    // ---- SINGLE-PANEL deliverables ---------------------------------------------------------
    'recommendation': {
        artifact: 'recommendation', mode: 'panel', ground: 'light', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false,
        note: 'recommendation detail 597:4 - one supporting panel (RecommendationData also has heroImage)',
    },
    'tech-audit': {
        artifact: 'tech-audit', mode: 'panel', ground: 'dark', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false,
        note: 'tech-audit 02 risk-detail - one shared-knowledge-base panel',
    },
    'timeline': {
        artifact: 'timeline', mode: 'panel', ground: 'dark', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false,
        note: 'roadmap NOW horizon detail 599:3 - one foundation-layers panel',
    },
    'theme-cluster': {
        artifact: 'theme-cluster', mode: 'panel', ground: 'light', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false,
        note: 'themes theme-detail 590:11 - one convergence panel (overview/arc/mosaic are NO-IMAGE)',
    },
    'persona-detail': {
        artifact: 'persona-detail', mode: 'panel', ground: 'light', kind: 'panel',
        carrier: 'panelImage', optional: false, wired: false,
        note: 'persona-detail 602:2 portrait panel / 602:3 fingerprint panel (dark)',
    },

    // ---- GLYPH marks -----------------------------------------------------------------------
    'meta-themes': {
        artifact: 'meta-themes', mode: 'glyph', ground: 'light', kind: 'glyph',
        elementField: 'patterns', carrier: 'glyphImages', max: 4, optional: true, wired: false,
        note: 'meta-themes 613:2 - one 72px glyph per portfolio-pattern card',
    },
    'mindmap': {
        artifact: 'mindmap', mode: 'glyph', ground: 'light', kind: 'glyph',
        carrier: 'centralGlyph', optional: true, wired: false,
        note: 'mindmap 612:2 - one central-question glyph',
    },

    // ---- #slides archetypes (left-anchored -> full-bleed right panel) ----------------------
    'slides:cover': {
        artifact: 'slides:cover', mode: 'panel', ground: 'dark', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false, note: 'cover 609:2 full-bleed right panel',
    },
    'slides:section-divider': {
        artifact: 'slides:section-divider', mode: 'panel', ground: 'dark', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false, note: 'section-divider 609:4 right panel',
    },
    'slides:thesis-interstitial': {
        artifact: 'slides:thesis-interstitial', mode: 'panel', ground: 'dark', kind: 'panel',
        carrier: 'panelImage', optional: true, wired: false, note: 'thesis 609:5 content-left/full-bleed-right',
    },
    'slides:agenda': {
        artifact: 'slides:agenda', mode: 'hero', ground: 'light', kind: 'hero',
        carrier: 'panelImage', optional: true, wired: false, note: 'agenda 609:3 lower-right hero',
    },

    // ---- DELIBERATELY image-free (registered decisions - NEVER generate) -------------------
    'case-study': { artifact: 'case-study', mode: 'none', carrier: '', note: 'all variants content-complete' },
    'gap-matrix': { artifact: 'gap-matrix', mode: 'none', carrier: '', note: 'dense 4-col gap matrix' },
    'architecture-map': { artifact: 'architecture-map', mode: 'none', carrier: '', note: 'connector-collision ban' },
    'service-blueprint': { artifact: 'service-blueprint', mode: 'none', carrier: '', note: 'Bitner matrix IS the body' },
    'org-model': { artifact: 'org-model', mode: 'none', carrier: '', note: 'tier matrix + connectors' },
    'systems-inventory': { artifact: 'systems-inventory', mode: 'none', carrier: '', note: 'dense table' },
    'block-quote': { artifact: 'block-quote', mode: 'none', carrier: '', note: 'right data panel already' },
    'stat-row': { artifact: 'stat-row', mode: 'none', carrier: '', note: 'content-complete data slide' },
    'section-divider': { artifact: 'section-divider', mode: 'none', carrier: '', note: 'GOLD divider (slides: variant carries the panel)' },
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
