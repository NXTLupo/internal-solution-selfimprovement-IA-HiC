/**
 * ARTIFACT CATALOG — the single, authoritative enumeration of every HiC artifact directive.
 * WS-0 (the AIR backbone). Per the v2 plan, the catalog is written FIRST so no hashtag is ever
 * silently omitted from the analysis: the router, the AIR builder, and the coverage gate all read
 * THIS list. The human-readable mirror lives at config/artifact_catalog.yaml (this .ts is authoritative;
 * if they disagree, fix the yaml). The omission guard is services/artifactCatalogCoverage.test.ts, which
 * asserts every ARTIFACT_TPL template id + every directive in corpusChatService resolves to a catalog entry.
 *
 * Plan: plans/hic-definitive-vision-and-100-percent-plan-v2-2026-06-30.md (WS-0).
 * Routing classes mirror aiRouter.artifactModelFor(): schema-bounded -> Flash; evidence/imagery/narrative ->
 * Gemini 3.1 Pro while OPUS_CAP_ACTIVE, Claude Opus 4.8 after. NEVER hardcode a model id here; the router owns
 * the model. This catalog owns the CONTRACT (tier, modality, editability, image-bearing), not the model id.
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
    | 'analysis'          // structured analysis surfaced in chat
    | 'external_render'   // handed to a separate renderer service (e.g. :5014)
    | 'multi';            // a multi-template deck (#slides)

export type ArtifactEditability =
    | 'native_pptx'       // must export as native editable PPTX (text runs, picture placeholders)
    | 'html_document'     // editable HTML
    | 'spa_only'          // rendered inside the SPA, no export contract
    | 'external_renderer';

export type RoutingClass =
    | 'schema_flash'      // SCHEMA_FLASH_ARTIFACTS in aiRouter -> gemini-3.5-flash
    | 'evidence_pro'      // -> gemini-3.1-pro-preview (capped) / claude-opus-4-8 (after)
    | 'code'              // #proto build path
    | 'collection'        // deep-research planner path
    | 'external';         // presentation renderer path

export interface ArtifactCatalogEntry {
    /** canonical directive id, no leading '#', singular (e.g. 'gap', 'case-study'). */
    id: string;
    /** every hashtag (with #) that routes to this entry, including plurals/aliases. */
    aliases: string[];
    /** the ARTIFACT_TPL slide-template id, or null for non-slide-template directives. */
    templateId: string | null;
    /** the owning skill (corpusChatService directive->skill map). */
    ownerSkill: string;
    tier: ArtifactTier;
    modality: ArtifactModality;
    editability: ArtifactEditability;
    routingClass: RoutingClass;
    /** whether model-authored / Nano-Banana imagery is load-bearing for this artifact. */
    imageBearing: boolean;
}

/**
 * THE CATALOG. Every directive HiC accepts. None omitted. Keep in sync with:
 *  - corpusChatService.ts ARTIFACT_TPL (template ids) + the directive->skill map
 *  - aiRouter.ts SCHEMA_FLASH_ARTIFACTS (routingClass schema_flash)
 *  - components/slideTemplates/types.ts (templateId existence)
 * The coverage test fails the build if a directive is added there without an entry here.
 */
export const ARTIFACT_CATALOG: ArtifactCatalogEntry[] = [
    // ---- SCHEMA-BOUNDED slide deliverables (routingClass schema_flash) ----
    { id: 'gap', aliases: ['#gap'], templateId: 'gap-matrix', ownerSkill: 'gap-analysis-evaluator', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'journey', aliases: ['#journey', '#journeys'], templateId: 'journey-map', ownerSkill: 'service-blueprint-mapper', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'blueprint', aliases: ['#blueprint', '#blueprints'], templateId: 'service-blueprint', ownerSkill: 'service-blueprint-mapper', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'compete', aliases: ['#compete', '#competitive', '#competitives', '#competitors'], templateId: 'competitive-matrix', ownerSkill: 'competitive-analyst', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'org', aliases: ['#org', '#orgs', '#orgchart', '#orgcharts', '#org-chart', '#org-charts'], templateId: 'org-chart', ownerSkill: 'org-chart', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'audit', aliases: ['#audit', '#audits', '#techaudit', '#tech-audit'], templateId: 'systems-inventory', ownerSkill: 'tech-audit-inspector', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'arch', aliases: ['#arch', '#architecture'], templateId: 'architecture-map', ownerSkill: 'tech-arch-generator', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },
    { id: 'roadmap', aliases: ['#roadmap', '#roadmaps'], templateId: 'timeline', ownerSkill: 'roadmap-builder', tier: 'schema', modality: 'slides', editability: 'native_pptx', routingClass: 'schema_flash', imageBearing: false },

    // ---- EVIDENCE / IMAGERY / NARRATIVE slide deliverables (routingClass evidence_pro) ----
    { id: 'case-study', aliases: ['#case-study', '#case-studies', '#casestudy', '#casestudies'], templateId: 'case-study', ownerSkill: 'case-study-analyst', tier: 'evidence', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'persona', aliases: ['#persona', '#personas'], templateId: 'persona-card', ownerSkill: 'persona-architect', tier: 'imagery', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'themes', aliases: ['#themes', '#theme', '#themecluster', '#theme-cluster'], templateId: 'theme-overview', ownerSkill: 'theme-analyst', tier: 'imagery', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'recommendations', aliases: ['#recommendations', '#recommendation', '#recs', '#rec'], templateId: 'recommendation', ownerSkill: 'recommendation-architect', tier: 'narrative', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
    { id: 'prd', aliases: ['#prd', '#prds'], templateId: 'prd-feature', ownerSkill: 'prd-compiler', tier: 'evidence', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'strategy', aliases: ['#strategy', '#strategies'], templateId: null, ownerSkill: 'strategy-author', tier: 'narrative', modality: 'slides', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },

    // ---- HTML document deliverables ----
    { id: 'brief', aliases: ['#brief', '#briefs'], templateId: 'executive-brief', ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'explainer', aliases: ['#explainer', '#explainers'], templateId: 'executive-brief', ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'report', aliases: ['#report', '#reports'], templateId: 'executive-brief', ownerSkill: 'strategic-report-writer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'playground', aliases: ['#playground'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'approaches', aliases: ['#approaches'], templateId: null, ownerSkill: 'html-deliverable-composer', tier: 'narrative', modality: 'html', editability: 'html_document', routingClass: 'evidence_pro', imageBearing: false },

    // ---- Graph / cross-engagement / dialogue ----
    { id: 'mindmap', aliases: ['#mindmap', '#mind-map'], templateId: null, ownerSkill: 'mind-map-architect', tier: 'schema', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'meta-themes', aliases: ['#meta-themes', '#metathemes'], templateId: null, ownerSkill: 'meta-themes', tier: 'evidence', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },
    { id: 'brief-dialog', aliases: ['#brief-dialog', '#dialog', '#brief-dialogue'], templateId: null, ownerSkill: 'brief-dialog', tier: 'narrative', modality: 'analysis', editability: 'spa_only', routingClass: 'evidence_pro', imageBearing: false },

    // ---- Code / external-renderer / collection ----
    { id: 'proto', aliases: ['#proto', '#prototypes'], templateId: null, ownerSkill: 'experience-prototype-composer', tier: 'code', modality: 'figma_spec', editability: 'spa_only', routingClass: 'code', imageBearing: true },
    { id: 'presentation', aliases: ['#presentation', '#presentations'], templateId: null, ownerSkill: 'deck-narrative-composer', tier: 'narrative', modality: 'external_render', editability: 'external_renderer', routingClass: 'external', imageBearing: true },
    { id: 'deep-research', aliases: ['#deep-research', '#research-plan'], templateId: null, ownerSkill: 'research-planner', tier: 'collection', modality: 'analysis', editability: 'spa_only', routingClass: 'collection', imageBearing: false },

    // ---- Multi-template deck mode ----
    { id: 'slides', aliases: ['#slides', '#slide'], templateId: null, ownerSkill: 'deck-narrative-composer', tier: 'narrative', modality: 'multi', editability: 'native_pptx', routingClass: 'evidence_pro', imageBearing: true },
];

const _byAlias: Map<string, ArtifactCatalogEntry> = (() => {
    const m = new Map<string, ArtifactCatalogEntry>();
    for (const e of ARTIFACT_CATALOG) {
        for (const a of e.aliases) m.set(a.toLowerCase().replace(/^#/, '').trim(), e);
        m.set(e.id.toLowerCase(), e);
    }
    return m;
})();

/** Resolve a directive (hashtag, id, or ARTIFACT_TPL template id) to its catalog entry, or null. */
export function catalogEntryFor(directiveOrTemplateId?: string | null): ArtifactCatalogEntry | null {
    const k = String(directiveOrTemplateId || '').toLowerCase().replace(/^#/, '').replace(/s$/, '').trim();
    if (!k) return null;
    const direct = _byAlias.get(k) || _byAlias.get(k + 's');
    if (direct) return direct;
    // fall back to template-id match (e.g. 'gap-matrix')
    const byTpl = ARTIFACT_CATALOG.find(e => e.templateId === directiveOrTemplateId);
    return byTpl || null;
}

/** Every canonical artifact id (for coverage + enumeration). */
export function allArtifactIds(): string[] {
    return ARTIFACT_CATALOG.map(e => e.id);
}
