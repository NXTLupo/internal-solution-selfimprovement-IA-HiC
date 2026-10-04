/**
 * EvidenceRecord - the foundational data contract for the modernized research pipeline.
 *
 * Research-window consensus (Apr 2026) coalesced around this shape:
 * - Exa / LangChain "structured JSON output at every boundary"
 * - MemMachine sentence-level provenance links
 * - Trustworthy Report Generation's per-claim confidence calibration
 * - Anthropic Managed Agents' decoupling of planning from execution (data flows
 *   between sub-agents as structured records, not text blobs)
 *
 * Every item collected by any connector is wrapped in this record. The record is
 * the unit that:
 *   1. The KG builder reads (to create evidence nodes with provenance)
 *   2. The Research Bibliography reads (to render browseable entries)
 *   3. The AI chat reads (to cite specific claims)
 *   4. The coverage scorer reads (to compute density/diversity/recency)
 *   5. The wiki-compile skill reads (to build the compounding artifact)
 *
 * This file is ADDITIVE. Existing code paths keep working; new code reads records.
 * The migration is connector-by-connector as Tier 2 lands.
 */

// --- THE CORE RECORD ---

export interface EvidenceRecord {
    /** Stable ID of form EV_<sourceId>_<nnn> - used by KG, bibliography, citations */
    id: string;

    /** Extracted primary claim if AI has summarized, or null for pure verbatim items */
    claim: string | null;

    /** Human-readable source name, e.g. "Higher Ed Dive", "r/fatFIRE" */
    source: string;

    /** Connector/registry ID, e.g. "higher_ed_dive", "reddit_r_fatfire" */
    sourceId: string;

    /** Credibility tier at collection time: 1 academic/gov · 2 trade/news · 3 community/UGC */
    sourceTier: 1 | 2 | 3;

    /** Original item title (RSS title, paper title, Reddit post title, etc.) */
    title: string;

    /** Short extracted passage (2-3 sentences) used for display in bibliography + chat context */
    excerpt: string;

    /** Full original content - addressable on demand, NOT loaded by default in prompts */
    rawContent: string;

    /** Public URL to the source if any */
    url?: string;

    /** Published date in ISO-8601 if known */
    publishedDate?: string;

    /** When this record was produced */
    extractedAt: string;

    /**
     * Confidence 0-1 that the excerpt accurately represents the source.
     * 1.0 = verbatim passage, 0.7-0.9 = AI-paraphrased with quote, 0.3-0.6 = AI-summarized.
     */
    extractionConfidence: number;

    /**
     * Connector's honest report on which brief-level filters it could actually honor.
     * This is the "loud failure" contract: no silent degradation allowed.
     */
    honoredFilters: {
        dateRange: boolean;       // did the source honor the brief's date filter
        domainExclude: boolean;   // did it honor excluded-domain rules
        exactMatch: boolean;      // did it do exact-term matching vs fuzzy
    };

    /**
     * IDs of the brief's research questions this record addresses.
     * One record can answer multiple questions.
     */
    questionIds: string[];

    /** Named entities (orgs, people, vendors, products) mentioned in this item */
    entityRefs: string[];

    /**
     * Freshness score 0-1.
     * 1.0 = published today, decays on a vertical-specific half-life (e.g. ~90 days for news).
     */
    freshness: number;

    /**
     * Relevance 0-100 produced by the scorer. Carried forward from the legacy pipeline
     * so existing KG-node sizing still works until the scorer is replaced in Tier 2.
     */
    relevanceScore?: number;

    /**
     * Was the raw content enriched (fetched full-text) beyond the original snippet?
     * Matches the existing `enriched` flag on items so the KG's visual encoding stays consistent.
     */
    enriched?: boolean;

    /**
     * Per-record extraction notes - e.g. "fetched via Jina reader", "backup RSS snippet only",
     * "translated from Chinese". Surfaced in the bibliography detail view.
     */
    extractionNotes?: string;
}

// --- SOURCE CAPABILITY MANIFEST ---

/**
 * Static capability profile for a connector/source. Read by:
 *   - The collection preview UI (surface "can't honor date filter" warnings)
 *   - The query selector (skip date-filtered queries for date-unsupported sources)
 *   - The coverage check (attribute failures correctly)
 */
export interface SourceCapabilityManifest {
    sourceId: string;
    type: 'rss' | 'rest' | 'web_search' | 'reddit' | 'academic_api' | 'gov_api' | 'youtube' | 'web_extract';

    /** Search semantics supported */
    searchMode: 'keyword-match' | 'fulltext' | 'semantic' | 'latest-only';

    /** How far back the source can see (paginated APIs vs latest-N RSS windows) */
    maxLookback: 'unlimited' | 'full-archive' | '~year' | '~month' | '~30-entries' | 'latest-only';

    /** Date-filter passthrough behavior */
    dateFilter: 'supported' | 'best-effort' | 'unsupported';

    /** Domain-exclude passthrough behavior */
    domainExclude: 'supported' | 'post-filter' | 'unsupported';

    /** Rate limit hints so the batching layer can pace appropriately */
    rateLimit: { callsPerMinute?: number; concurrent?: number };

    /** Free-form capability description shown in the collection preview UI */
    description: string;

    /** Known failure modes the user should be warned about in the preview */
    knownLimitations: string[];
}

// --- COLLECTION TRAJECTORY ---

/**
 * Audit log of what the research pipeline actually did during collection.
 * Rendered in the Research Bibliography's "Trajectory" tab so engineers can debug
 * and researchers can trust.
 *
 * One TrajectoryEvent = one concrete decision or action.
 */
export type TrajectoryEventType =
    | 'brief_parsed'             // brief → ParsedBrief output
    | 'skill_activated'          // a research skill matched the brief
    | 'planner_frontier'         // query planner produced N candidate queries for a question
    | 'selector_pick'            // selector chose K queries from the frontier for a source
    | 'query_fired'              // actual HTTP call to a connector
    | 'query_result'             // items returned (or empty/error)
    | 'filter_degraded'          // connector couldn't honor a filter; recorded loudly
    | 'coverage_check'           // post-collection scoring event
    | 'patch_query'              // gap-detected, additional query fired
    | 'enrichment_fetch'         // full-text extraction for a top item
    | 'scorer_verdict'           // relevance/confidence assigned
    | 'phase'                    // high-level phase marker (collection start/end, etc.)
    | 'warning'
    | 'error';

export interface TrajectoryEvent {
    id: string;
    timestamp: string;
    type: TrajectoryEventType;

    /** Short human-readable description */
    summary: string;

    /** Structured payload - shape depends on type */
    payload?: Record<string, any>;

    /** If this event relates to one or more research questions */
    questionIds?: string[];

    /** If this event relates to a specific source */
    sourceId?: string;

    /** If this event produced evidence records */
    producedEvidenceIds?: string[];
}

// --- PARSED BRIEF (Tier 1.3 foundation) ---

/**
 * Structured output of the brief-parser skill.
 * Extracted once per research goal, edited by the user in the collection preview,
 * then handed to the skill mesh and query fabric.
 */
export interface ParsedBrief {
    mission: string;

    /** Detected verticals (higher_ed, healthcare, saas, etc.) used to activate vertical skills */
    verticals: string[];

    /** Every explicit research question from the brief, each its own addressable unit */
    questions: Array<{
        id: string;               // Q1, Q2, ...
        text: string;
        priority?: 'critical' | 'important' | 'nice-to-have';
    }>;

    /** Date-window filter if declared */
    dateFilter?: {
        from: string;
        to?: string;
    };

    /** Inclusion rules from the brief (positive filters) */
    includeRules: string[];

    /** Exclusion rules - excluded content themes, domains, categories */
    excludeRules: string[];

    /** Excluded domains - surfaced separately because connectors need them explicit */
    excludedDomains: string[];

    /** Entities the brief explicitly names, which must always be queried */
    namedEntities: {
        subreddits: string[];
        publications: string[];
        peerEntities: string[];
        vendors: string[];
        hashtags: string[];
        authors: string[];
    };

    /** Raw brief text preserved for downstream prompts that need the full context */
    rawBrief: string;

    /** Parse confidence 0-1 - low values prompt the UI to ask for clarification */
    parseConfidence: number;

    /** Any unrecognized segments of the brief - flagged to the user */
    unparsedSegments: string[];
}

// --- COVERAGE METRICS ---

/**
 * Multi-metric coverage score per research question.
 * Replaces the single 0-100 coverage number with five separable signals so the
 * gap-patching loop can target the right remedy.
 */
export interface QuestionCoverage {
    questionId: string;

    /** Evidence density - # of records that substantively address this question */
    density: number;            // raw count
    densityScore: number;       // normalized 0-1 against target

    /** Source diversity - # of distinct named sources contributing */
    diversity: number;
    diversityScore: number;

    /** Recency - fraction of records within the brief's date window */
    recency: number;

    /** Per-claim confidence avg across contributing records */
    avgConfidence: number;

    /** Named-entity honor rate - fraction of brief's named entities that produced evidence */
    entityHonorRate: number;

    /** Overall 0-1 rollup for UI sorting (not for gating) */
    compositeScore: number;

    /** Narrative diagnostic for the UI - why the score is where it is */
    diagnostic: string;
}

// --- HELPERS ---

/**
 * Minimal projection of an EvidenceRecord used in AI prompt context.
 * Carries only the fields the AI needs to cite and reason, not the full raw content.
 * Chat can call a tool to fetch the full record on demand.
 */
export interface EvidenceProjection {
    id: string;
    source: string;
    title: string;
    excerpt: string;
    url?: string;
    publishedDate?: string;
    questionIds: string[];
    confidence: number;
}


/**
 * Freshness decay - returns 0-1 score from a publication date.
 * Default half-life 180 days (reasonable for trade-press; vertical skills can override).
 */
function computeFreshness(publishedDate: string | undefined, halfLifeDays = 180): number {
    if (!publishedDate) return 0.5;  // unknown date
    const pub = new Date(publishedDate).getTime();
    const now = Date.now();
    if (!Number.isFinite(pub) || pub > now) return 0.5;
    const ageDays = (now - pub) / (1000 * 60 * 60 * 24);
    return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Wrap a legacy collector item (from liveSourceResults) in an EvidenceRecord.
 * Used by the migration shim so existing collectors don't have to be rewritten
 * all at once. Tier 2 will replace this with native record emission.
 */
export function fromLegacyItem(
    item: { title?: string; content?: string; url?: string; date?: string; relevanceScore?: number; enriched?: boolean },
    ctx: {
        source: string;
        sourceId: string;
        tier: 1 | 2 | 3;
        index: number;
        questionIds?: string[];
        honoredFilters?: Partial<EvidenceRecord['honoredFilters']>;
    }
): EvidenceRecord {
    const id = `EV_${ctx.sourceId}_${String(ctx.index).padStart(3, '0')}`;
    const rawContent = item.content || '';
    const excerpt = rawContent.length > 400 ? rawContent.substring(0, 397).replace(/\s+\S*$/, '') + '...' : rawContent;
    return {
        id,
        claim: null,   // legacy items don't have AI-extracted claims yet - that comes in Tier 2
        source: ctx.source,
        sourceId: ctx.sourceId,
        sourceTier: ctx.tier,
        title: item.title || '',
        excerpt,
        rawContent,
        url: item.url,
        publishedDate: item.date,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.6,  // legacy default; full verbatim would be 1.0, pure AI summary 0.3
        honoredFilters: {
            dateRange: ctx.honoredFilters?.dateRange ?? false,
            domainExclude: ctx.honoredFilters?.domainExclude ?? false,
            exactMatch: ctx.honoredFilters?.exactMatch ?? false,
        },
        questionIds: ctx.questionIds ?? [],
        entityRefs: [],
        freshness: computeFreshness(item.date),
        relevanceScore: item.relevanceScore,
        enriched: item.enriched,
    };
}

/**
 * Minimal capability manifest for a given connector type - conservative defaults
 * so that even un-migrated connectors declare their limitations loudly.
 * Connector-specific manifests will replace these in Tier 2.
 */
export function defaultCapabilityFor(
    type: SourceCapabilityManifest['type'],
    sourceId: string,
    description = ''
): SourceCapabilityManifest {
    const base: Record<SourceCapabilityManifest['type'], Omit<SourceCapabilityManifest, 'sourceId' | 'description'>> = {
        rss: {
            type: 'rss',
            searchMode: 'keyword-match',
            maxLookback: '~30-entries',
            dateFilter: 'unsupported',
            domainExclude: 'unsupported',
            rateLimit: {},
            knownLimitations: ['Only latest ~30 entries visible', 'Date filter not enforced', 'No full-text search'],
        },
        rest: {
            type: 'rest',
            searchMode: 'fulltext',
            maxLookback: 'full-archive',
            dateFilter: 'best-effort',
            domainExclude: 'post-filter',
            rateLimit: { callsPerMinute: 60 },
            knownLimitations: [],
        },
        web_search: {
            type: 'web_search',
            searchMode: 'semantic',
            maxLookback: 'unlimited',
            dateFilter: 'best-effort',
            domainExclude: 'supported',
            rateLimit: { callsPerMinute: 30 },
            knownLimitations: ['Results depend on upstream search quality'],
        },
        reddit: {
            type: 'reddit',
            searchMode: 'keyword-match',
            maxLookback: '~year',
            dateFilter: 'supported',
            domainExclude: 'unsupported',
            rateLimit: { callsPerMinute: 30 },
            knownLimitations: [],
        },
        academic_api: {
            type: 'academic_api',
            searchMode: 'fulltext',
            maxLookback: 'full-archive',
            dateFilter: 'supported',
            domainExclude: 'unsupported',
            rateLimit: { callsPerMinute: 60 },
            knownLimitations: [],
        },
        gov_api: {
            type: 'gov_api',
            searchMode: 'keyword-match',
            maxLookback: 'full-archive',
            dateFilter: 'supported',
            domainExclude: 'unsupported',
            rateLimit: { callsPerMinute: 60 },
            knownLimitations: [],
        },
        youtube: {
            type: 'youtube',
            searchMode: 'keyword-match',
            maxLookback: 'full-archive',
            dateFilter: 'best-effort',
            domainExclude: 'unsupported',
            rateLimit: { callsPerMinute: 15 },
            knownLimitations: ['Video content needs transcription for full analysis'],
        },
        web_extract: {
            type: 'web_extract',
            searchMode: 'latest-only',
            maxLookback: 'latest-only',
            dateFilter: 'unsupported',
            domainExclude: 'unsupported',
            rateLimit: { callsPerMinute: 10 },
            knownLimitations: ['Returns only what is on the page today'],
        },
    };
    return { ...base[type], sourceId, description: description || sourceId };
}
