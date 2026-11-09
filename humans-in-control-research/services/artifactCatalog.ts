/**
 * ARTIFACT CATALOG - the single, authoritative enumeration of every HiC artifact directive.
 * WS-0 (the AIR backbone). Per the v2 plan, the catalog is written FIRST so no hashtag is ever
 * silently omitted from the analysis: the router, the AIR builder, and the coverage gate all read
 * THIS list. The human-readable mirror lives at config/artifact_catalog.yaml (this .ts is authoritative;
 * if they disagree, fix the yaml).
 *
 * Stage 6.1 (2026-10-01, plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, finding A7): the
 * catalog now GENERATES the vocabularies that used to drift as five hand-kept copies:
 *   - the directive -> owning-skill map            (CATALOG_HASHTAG_TO_SKILL_ID)
 *   - the alias -> canonical-hashtag map           (CATALOG_HASHTAG_ALIASES)
 *   - the modifier set (#NU, #slides, #dense, ...)  (CATALOG_MODIFIERS / isCatalogModifier)
 *   - the slide-template rules (ARTIFACT_TPL rows)  (CATALOG_TEMPLATE_RULES)
 *   - the Design Desk content vocabulary            (designDeskVocabulary)
 * plus word-boundary, multi-hit directive matching (matchCatalogDirectives / primaryCatalogHit) so
 * `#gap #personas #slides` returns every hit and `#arch` never matches `#architecture-x`.
 * The omission guard is services/artifactCatalog.coverage.test.ts (all five vocabularies agree) and
 * services/artifactCatalogCoverage.test.ts (every corpusChatService directive resolves here).
 *
 * Plan: plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md (WS-0).
 * Routing classes mirror aiRouter.artifactModelFor(): schema-bounded -> Flash; evidence/imagery/narrative ->
 * the Claude reasoning model. NEVER hardcode a model id here; the router owns the model. This catalog owns
 * the CONTRACT (tier, modality, editability, image-bearing, owning skill, aliases), not the model id.
 */

export type ArtifactTier =
    | 'schema'      // template bounds the output shape (matrices, tables, timelines)
    | 'evidence'    // evidence-dense, multi-source curation
    | 'narrative'   // long-form prose / argument
    | 'imagery'     // model-authored brand imagery is load-bearing
    | 'collection'  // a research/collection action, not a rendered artifact
    | 'code';       // generated interactive code (#proto)

export type ArtifactModality =
    | 'slides'            // GOLD slide template(s), exportable to native PPTX
    | 'html'              // self-contained HTML document
    | 'figma_spec'        // a spec consumed by a Figma/renderer surface
    | 'image'             // an image deliverable
    | 'analysis'          // structured analysis surfaced in chat / the Design Desk
    | 'external_render'   // handed to a separate renderer service (e.g. :5014)
    | 'multi';            // a multi-template deck (#slides)

export type ArtifactEditability =
    | 'native_pptx'       // must export as native editable PPTX (text runs, picture placeholders)
    | 'html_document'     // editable HTML
    | 'spa_only'          // rendered inside the SPA, no export contract
    | 'external_renderer';

export type RoutingClass =
    | 'schema_flash'      // SCHEMA_FLASH_ARTIFACTS in aiRouter -> gemini-3.5-flash
    | 'evidence_pro'      // -> the Claude reasoning model (Opus 5.5) / Gemini Pro while capped
    | 'code'              // #proto build path
    | 'collection'        // deep-research planner path
    | 'external';         // presentation renderer path

export interface ArtifactCatalogEntry {
    /** canonical directive id, no leading '#', singular (e.g. 'gap', 'case-study'). */
    id: string;
    /** every hashtag (with #) that routes to this entry, including plurals/aliases. The first is canonical. */
    aliases: string[];
    /** the ARTIFACT_TPL slide-template id, or null for non-slide-template directives. */
    templateId: string | null;
    /** the owning skill (the corpusChatService directive->skill map is generated from this). */
    ownerSkill: string;
    tier: ArtifactTier;
    modality: ArtifactModality;
    editability: ArtifactEditability;
    routingClass: RoutingClass;
    /** whether model-authored / Nano-Banana imagery is load-bearing for this artifact. */
    imageBearing: boolean;
    /** The dedicated AIR builder kind, when the artifact has one (Stage 3: 'prdAir' for #prd). */
    airKind?: string;
    /** The Design Desk / FreeformKind name when it differs from `id` (design-desk/services/hashtagParser.ts). */
    designDeskKind?: string;
}

/**
 * THE CATALOG. Every directive HiC accepts. None omitted. Consumers read it at module load:
 *  - corpusChatService.ts ARTIFACT_TPL + HASHTAG_TO_SKILL_ID + HASHTAG_ALIASES (via the generated maps below)
 *  - aiRouter.ts SCHEMA_FLASH_ARTIFACTS (routingClass schema_flash)
 *  - components/slideTemplates/types.ts (templateId existence)
 *  - services/hashtagRegistry.ts DIRECTIVES aliases (UI autocomplete + #help)
 *  - design-desk/services/hashtagParser.ts CONTENT vocabulary
 * The coverage tests fail the build if a directive is added anywhere without an entry here.
 */
export const ARTIFACT_CATALOG: ArtifactCatalogEntry[] = [
    // ---- SCHEMA-BOUNDED slide deliverables (routingClass schema_flash) ----
    { id: 'gap', aliases: ['#gap', '#gaps', '#gap-analysis', '#gapanalysis'], templateId: 'gap-matrix', ownerSkill: 'gap-analysis-evaluator', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'journey', aliases: ['#journey', '#journeys', '#journey-map', '#journeymap'], templateId: 'journey-map', ownerSkill: 'journey-illustrator', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'blueprint', aliases: ['#blueprint', '#blueprints', '#service-blueprint'], templateId: 'service-blueprint', ownerSkill: 'service-blueprint-mapper', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'compete', aliases: ['#compete', '#competes', '#competitive', '#competitives', '#competitors', '#competitor', '#competition'], templateId: 'competitive-matrix', ownerSkill: 'competitive-analyst', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'org', aliases: ['#org', '#orgs', '#orgchart', '#orgcharts', '#org-chart', '#org-charts'], templateId: 'org-chart', ownerSkill: 'org-chart', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'audit', aliases: ['#audit', '#audits', '#techaudit', '#tech-audit', '#techaudits', '#tech-audits'], templateId: 'systems-inventory', ownerSkill: 'tech-audit-inspector', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'arch', aliases: ['#arch', '#arches', '#architecture', '#architectures', '#tech-arch', '#techarch'], templateId: 'architecture-map', ownerSkill: 'tech-arch-generator', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'roadmap', aliases: ['#roadmap', '#roadmaps', '#road'], templateId: 'timeline', ownerSkill: 'roadmap-builder', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },

    // ---- EVIDENCE / IMAGERY / NARRATIVE slide deliverables (routingClass evidence_pro) ----
    { id: 'case-study', aliases: ['#case-study', '#case-studies', '#casestudy', '#casestudies'], templateId: 'case-study', ownerSkill: 'case-study-analyst', tier: 'evidence', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'persona', aliases: ['#persona', '#personas'], templateId: 'persona-card', ownerSkill: 'persona-architect', tier: 'imagery', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'themes', aliases: ['#themes', '#theme', '#themecluster', '#theme-cluster', '#themeclusters', '#theme-clusters'], templateId: 'theme-overview', ownerSkill: 'theme-analyst', tier: 'imagery', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'recommendations', aliases: ['#recommendations', '#recommendation', '#recs', '#rec'], templateId: 'recommendation', ownerSkill: 'recommendation-architect', tier: 'narrative', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true, designDeskKind: 'recommendations' },
    // Stage 3 (2026-10-01): #prd is document-first with a dedicated AIR builder (services/prdAir.ts, kind 'prdAir').
    // 2026-10-01 (plan Stage 3, owner decision 2): #prd is DOCUMENT-FIRST. The PrdAir contract compiles to
    // the two-tier HTML document through the HTML artifact chain; `#prd #slides` adds the slides:prd-*
    // projection. The legacy prd-feature slide template is no longer the #prd target.
    { id: 'prd', aliases: ['#prd', '#prds'], templateId: null, ownerSkill: 'prd-compiler', tier: 'evidence', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false, airKind: 'prdAir' },
    { id: 'strategy', aliases: ['#strategy', '#strategies'], templateId: null, ownerSkill: 'strategy-author', tier: 'narrative', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },

    // ---- HTML document deliverables ----
    { id: 'brief', aliases: ['#brief', '#briefs'], templateId: 'executive-brief', ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'explainer', aliases: ['#explainer', '#explainers'], templateId: 'executive-brief', ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    // #whitepaper (2026-05-23, Sprint H3) is the long-form strategic-report HTML; it was parser-and-panel only
    // (finding A7: the AIR warned "not in artifact catalog" on every run). It is an alias of the report entry.
    { id: 'report', aliases: ['#report', '#reports', '#whitepaper', '#whitepapers'], templateId: 'executive-brief', ownerSkill: 'strategic-report-writer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'playground', aliases: ['#playground', '#playgrounds'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'approaches', aliases: ['#approaches', '#approach'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    // E2.5 (2026-08-21): the artifact for a decision the corpus cannot settle. Asks the
    // person who holds the answer, instead of writing that evidence is limited.
    { id: 'questionnaire', aliases: ['#questionnaire', '#questionnaires', '#questions'], templateId: null, ownerSkill: 'questionnaire-author', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    // 2026-11-03 - NotebookLM Studio report + study formats (plans/notebooklm-studio-reverse-engineering-2026-11-03.md,
    // Part 6 W3; Unified Vision phase 6: all route through artifactModelFor, evidence tier). Every one rides the
    // HTML artifact chain, so the claim-ledger gate and pointer citations apply: HiC's studio outputs stay cited,
    // which NotebookLM's do not (spec clause S10).
    { id: 'faq', aliases: ['#faq', '#faqs'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'study-guide', aliases: ['#studyguide', '#study-guide', '#studyguides', '#study-guides'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    // 'chronology', never '#timeline': the bare timeline name belongs to the #roadmap slide template (forward plan);
    // this is the NotebookLM Timeline report, a dated chronology drawn FROM the sources.
    { id: 'chronology', aliases: ['#chronology', '#chronologies', '#timeline-report', '#source-timeline'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'evidence', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'flashcards', aliases: ['#flashcards', '#flashcard'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'schema', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'quiz', aliases: ['#quiz', '#quizzes'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'schema', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'datatable', aliases: ['#datatable', '#datatables', '#data-table', '#data-tables'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'schema', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'critique', aliases: ['#critique', '#critiques'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'evidence', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },

    // ---- Graph / cross-engagement / dialogue (the NotebookLM kinds; rendered in the Design Desk) ----
    { id: 'mindmap', aliases: ['#mindmap', '#mindmaps', '#mind-map', '#mind-maps'], templateId: null, ownerSkill: 'mind-map-architect', tier: 'schema', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'meta-themes', aliases: ['#meta-themes', '#meta-theme', '#metathemes', '#portfolio-themes', '#platform-patterns'], templateId: null, ownerSkill: 'meta-themes', tier: 'evidence', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'brief-dialog', aliases: ['#brief-dialog', '#brief-dialogue', '#dialog', '#dialogue'], templateId: null, ownerSkill: 'brief-dialog', tier: 'narrative', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    // 2026-11-03 W5 (NotebookLM reverse-engineering, spec S1): the two-voice dialogue rendered to SPEECH.
    // Rides the brief-dialog script engine, then the proxy /api/tts/dialogue (ElevenLabs) renders the MP3;
    // without a TTS key the handler degrades to the text transcript.
    { id: 'audio-overview', aliases: ['#audio-overview', '#audiooverview', '#audio', '#podcast'], templateId: null, ownerSkill: 'brief-dialog', tier: 'narrative', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    // 2026-11-03 W9 (NotebookLM reverse-engineering, spec S2): the Video Overview. Composes a
    // brand-tokened recap (services/recapComposition.ts, deterministic, slop-gated) and renders
    // it to MP4 on the video-renderer sidecar via the proxy /api/video/* passthrough.
    { id: 'video-overview', aliases: ['#video-overview', '#videooverview', '#video'], templateId: null, ownerSkill: 'deck-composer', tier: 'narrative', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    // 2026-11-09 (NotebookLM S8 parity; plans/hic-vs-notebooklm-artifact-audit-2026-11-09.md):
    // standalone infographic. The model writes a content-true element (steps / comparison / cited
    // stats) from the grounded corpus; infographicSpecFrom builds the spec; the proxy's native
    // renderer (/api/ai/diagram, nxt_diagram_render E4 families) draws it. A leading aspect word
    // steers the frame (landscape default / portrait / square).
    { id: 'infographic', aliases: ['#infographic', '#infographics'], templateId: null, ownerSkill: 'infographic-composer', tier: 'narrative', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: true },

    // ---- Code / external-renderer / collection ----
    { id: 'proto', aliases: ['#proto', '#prototypes'], templateId: null, ownerSkill: 'experience-prototype-composer', tier: 'code', modality: 'figma_spec', editability: 'spa_only', routingClass: 'code', imageBearing: true },
    { id: 'presentation', aliases: ['#presentation', '#presentations'], templateId: null, ownerSkill: 'deck-composer', tier: 'narrative', modality: 'external_render', editability: 'external_renderer', routingClass: 'external', imageBearing: true },
    { id: 'deep-research', aliases: ['#deep-research', '#deepresearch', '#research-deep', '#research-plan'], templateId: null, ownerSkill: 'research-planner', tier: 'collection', modality: 'analysis', editability: 'spa_only', routingClass: 'collection', imageBearing: false, designDeskKind: 'research-plan' },

    // ---- Multi-template deck mode ----
    { id: 'slides', aliases: ['#slides', '#slide'], templateId: null, ownerSkill: 'deck-composer', tier: 'narrative', modality: 'multi', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
];

// ---------------------------------------------------------------------------------------------
// MODIFIERS - hashtags that decorate a directive instead of selecting one. Their presence never
// selects a skill and never produces an "[Unknown directive]" leader (finding A7).
// ---------------------------------------------------------------------------------------------

export type ModifierKind = 'brand' | 'view' | 'theme' | 'export' | 'density' | 'value' | 'browse' | 'system' | 'edit';

export interface ModifierSpec {
    /** The token with '#', lowercase. Value-taking tokens are listed WITHOUT the '=value' part. */
    token: string;
    kind: ModifierKind;
    /** True when the user writes `#token=value` (the parser strips the value before lookup). */
    takesValue?: boolean;
}

export const CATALOG_MODIFIERS: ModifierSpec[] = [
    { token: '#nxt', kind: 'brand' },
    { token: '#nu', kind: 'brand' },
    { token: '#deciem', kind: 'brand' },   // 2026-10-01 - DECIEM (The Abnormal Beauty Company), third brand mode
    { token: '#slide', kind: 'view' },
    { token: '#slides', kind: 'view' },
    { token: '#dense', kind: 'density' },
    { token: '#dark', kind: 'theme' },
    { token: '#light', kind: 'theme' },
    { token: '#preview', kind: 'export' },
    { token: '#export-pptx', kind: 'export' },
    { token: '#auto-open', kind: 'export' },
    { token: '#help', kind: 'system' },
    { token: '#artifacts', kind: 'browse' },
    { token: '#refine', kind: 'edit' },
    { token: '#count', kind: 'value', takesValue: true },
    { token: '#img', kind: 'value', takesValue: true },
    { token: '#hero', kind: 'value', takesValue: true },
    { token: '#model', kind: 'value', takesValue: true },
    { token: '#sections', kind: 'value', takesValue: true },
    { token: '#name', kind: 'value', takesValue: true },
    { token: '#rec', kind: 'value', takesValue: true },
    // bare-flag image aliases accepted by parseImgDirective
    { token: '#img-diagram', kind: 'value' },
    { token: '#img-generate', kind: 'value' },
    { token: '#img-icon', kind: 'value' },
    { token: '#img-none', kind: 'value' },
    { token: '#no-image', kind: 'value' },
    { token: '#noimage', kind: 'value' },
    { token: '#generate-image', kind: 'value' },
];

const _modifierTokens: Set<string> = new Set(CATALOG_MODIFIERS.map(m => m.token));

/** Normalize any typed tag to its lookup key: lowercase, '#'-prefixed, value stripped (`#img=diagram` -> `#img`). */
function normalizeHashtag(tag: string): string {
    const raw = String(tag || '').trim().toLowerCase();
    if (!raw) return '';
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    const eq = withHash.indexOf('=');
    return (eq > 0 ? withHash.slice(0, eq) : withHash).replace(/['"]+$/, '');
}

/** True when the tag is a modifier (brand, view, density, value-taking, browse, edit, system). */
export function isCatalogModifier(tag: string): boolean {
    const k = normalizeHashtag(tag);
    if (!k) return false;
    // `#rec=slug` (a #proto value modifier) is a modifier; a bare `#rec` is the recommendations alias.
    if (k === '#rec' || k === '#name') return /=/.test(String(tag || ''));
    return _modifierTokens.has(k);
}

// ---------------------------------------------------------------------------------------------
// GENERATED VOCABULARIES
// ---------------------------------------------------------------------------------------------

const _byAlias: Map<string, ArtifactCatalogEntry> = (() => {
    const m = new Map<string, ArtifactCatalogEntry>();
    for (const e of ARTIFACT_CATALOG) {
        for (const a of e.aliases) m.set(a.toLowerCase().replace(/^#/, '').trim(), e);
        m.set(e.id.toLowerCase(), e);
        if (e.designDeskKind) m.set(e.designDeskKind.toLowerCase(), e);
    }
    return m;
})();

/** Resolve a directive (hashtag, id, Design Desk kind, or ARTIFACT_TPL template id) to its catalog entry, or null.
 *  A6: the chat path passes '#gap-matrix' style triggers; template ids resolve with or without the '#'. */
export function catalogEntryFor(directiveOrTemplateId?: string | null): ArtifactCatalogEntry | null {
    const raw = String(directiveOrTemplateId || '').toLowerCase().replace(/^#/, '').trim();
    if (!raw) return null;
    const exact = _byAlias.get(raw);
    if (exact) return exact;
    const k = raw.replace(/s$/, '');
    const direct = _byAlias.get(k) || _byAlias.get(k + 's');
    if (direct) return direct;
    // fall back to template-id match (e.g. 'gap-matrix' or '#gap-matrix')
    const byTpl = ARTIFACT_CATALOG.find(e => e.templateId === raw);
    return byTpl || null;
}

/** Every canonical artifact id (for coverage + enumeration). */
export function allArtifactIds(): string[] {
    return ARTIFACT_CATALOG.map(e => e.id);
}

/** The canonical hashtag for an entry (its first alias). */
function canonicalHashtag(entry: ArtifactCatalogEntry): string {
    return entry.aliases[0] || `#${entry.id}`;
}

/** GENERATED: canonical hashtag -> owning skill id (replaces the hand-kept corpusChatService HASHTAG_TO_SKILL_ID). */
export const CATALOG_HASHTAG_TO_SKILL_ID: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    for (const e of ARTIFACT_CATALOG) out[canonicalHashtag(e)] = e.ownerSkill;
    return out;
})();

/** GENERATED: non-canonical alias -> canonical hashtag (replaces the hand-kept corpusChatService HASHTAG_ALIASES). */
export const CATALOG_HASHTAG_ALIASES: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    for (const e of ARTIFACT_CATALOG) {
        const canon = canonicalHashtag(e);
        for (const a of e.aliases.slice(1)) out[a] = canon;
    }
    return out;
})();

/** GENERATED: the modifier token set in the shape corpusChatService HASHTAG_MODIFIERS used (lowercase, with '#'). */
export const CATALOG_MODIFIER_TOKENS: ReadonlySet<string> = _modifierTokens;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A word-boundary regex for a set of hashtag aliases. Matches `#arch` and `#architecture` as whole tags,
 * never `#architecture-x`, `#archive`, or `foo#arch`. Longest alias first so `#case-studies` wins over
 * `#case-study` inside the alternation. Not global by default; pass 'gi' for stripping.
 */
export function catalogDirectiveRegex(aliases: string[], flags = 'i'): RegExp {
    const alts = Array.from(new Set(aliases.map(a => a.toLowerCase().replace(/^#/, ''))))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map(escapeRe);
    return new RegExp(`(?<![\\w#-])#(?:${alts.join('|')})(?![\\w-])`, flags);
}

/** GENERATED: one [regex, templateId] rule per templated entry (replaces the hand-kept corpusChatService ARTIFACT_TPL). */
export const CATALOG_TEMPLATE_RULES: Array<[RegExp, string]> = ARTIFACT_CATALOG
    .filter(e => e.templateId)
    .map(e => [catalogDirectiveRegex(e.aliases), e.templateId as string]);

export interface CatalogHit {
    entry: ArtifactCatalogEntry;
    /** The alias as the user typed it (lowercased, with '#'). */
    alias: string;
    /** Character offset of the hit in the message (document order). */
    index: number;
}

const _entryRegexes: Array<{ entry: ArtifactCatalogEntry; re: RegExp }> = ARTIFACT_CATALOG
    .map(entry => ({ entry, re: catalogDirectiveRegex(entry.aliases, 'gi') }));

/**
 * MULTI-HIT directive matching (finding A2). Returns EVERY catalog entry the message names, in document
 * order, one hit per entry. `#gap #personas #slides` -> [gap, persona, slides]. Modifiers never appear here.
 */
export function matchCatalogDirectives(message: string): CatalogHit[] {
    const text = String(message || '');
    if (!text || text.indexOf('#') === -1) return [];
    const hits: CatalogHit[] = [];
    for (const { entry, re } of _entryRegexes) {
        re.lastIndex = 0;
        const m = re.exec(text);
        if (m) hits.push({ entry, alias: m[0].toLowerCase(), index: m.index });
    }
    return hits.sort((a, b) => a.index - b.index);
}

/** Routing rank: the artifact whose quality bar is highest decides the model for a mixed request. */
const ROUTING_RANK: Record<RoutingClass, number> = {
    evidence_pro: 3,
    code: 2,
    external: 2,
    collection: 1,
    schema_flash: 0,
};

/**
 * The hit that should decide routing for a mixed request: the highest-ranked routing class, ties broken by
 * document order. `#gap #personas` -> persona (evidence_pro), not gap (schema_flash). `#slides` beside a
 * named deliverable is the view modifier and never decides routing; bare `#slides` routes as a deck.
 */
export function primaryCatalogHit(message: string): CatalogHit | null {
    const all = matchCatalogDirectives(message);
    if (all.length === 0) return null;
    // `#slides` / `#slide` beside a named deliverable is the VIEW modifier (render as a deck), not the
    // deliverable: `#gap #slides` stays a gap-matrix (Flash, bake-off validated). Bare `#slides` is a deck.
    const named = all.filter(h => h.entry.modality !== 'multi');
    const hits = named.length ? named : all;
    let best = hits[0];
    for (const h of hits.slice(1)) {
        if (ROUTING_RANK[h.entry.routingClass] > ROUTING_RANK[best.entry.routingClass]) best = h;
    }
    return best;
}

/** The Design Desk / FreeformKind name for an entry. */
export function designDeskKindFor(entry: ArtifactCatalogEntry): string {
    return entry.designDeskKind || entry.id;
}

/**
 * GENERATED: the Design Desk content vocabulary (design-desk/services/hashtagParser.ts reads this).
 * `content` is the set of canonical kinds; `aliases` maps every typed form (no '#') to its kind.
 */
export function designDeskVocabulary(): { content: string[]; aliases: Record<string, string> } {
    const content: string[] = [];
    const aliases: Record<string, string> = {};
    for (const e of ARTIFACT_CATALOG) {
        if (e.modality === 'multi') continue;              // #slides / #slide are composition + view modifiers there
        const kind = designDeskKindFor(e);
        if (!content.includes(kind)) content.push(kind);
        for (const a of e.aliases) {
            const bare = a.replace(/^#/, '').toLowerCase();
            if (bare !== kind) aliases[bare] = kind;
        }
        if (e.id !== kind) aliases[e.id] = kind;
    }
    return { content, aliases };
}

/** The NotebookLM kinds that dispatch from the panel table instead of the chat engine (finding A1). */
export const UPLIFT_CATALOG_IDS: ReadonlySet<string> = new Set(
    ARTIFACT_CATALOG.filter(e => e.modality === 'analysis').map(e => e.id),
);
