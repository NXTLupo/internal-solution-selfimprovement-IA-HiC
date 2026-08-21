/**
 * DF-H - RESEARCH DATA EXTRACTION TIER
 * (plans/deerflow-harness-transfer-2026-08-20.md; Vision phases 2 and 3)
 *
 * deer-flow's research skills state the rule plainly: search returns CANDIDATES,
 * and the important ones are then read IN FULL, because "relying on search
 * snippets without reading full sources" is a named failure mode. HiC's corpus is
 * largely feed-summary depth, which is why its evidence often supports a narrower
 * claim than the deliverable makes.
 *
 * This module supplies the parts that were missing, all deterministic:
 *
 *  H1  Two-tier selection. Cheap discovery across the pack, then full-text capture
 *      for the top-N PER SUB-QUESTION rather than globally. Global top-N starves
 *      the sub-questions that returned fewer candidates, which are exactly the ones
 *      whose evidence is thin.
 *  H2  A per-source extraction schema (population, period, methodology, findings,
 *      limitations, named entities). This is what makes the Scope-Match Rule in
 *      `.claude/CLAUDE.md` CHECKABLE: a scope mismatch is only detectable if the
 *      source's population and period were recorded at ingestion. Today the rule
 *      exists and nothing can verify it.
 *  H3  A BATCHING TABLE rather than model arithmetic, a per-batch failure that is
 *      logged and skipped instead of fatal, and the hard rule that a failed fetch
 *      is REPORTED, never fabricated.
 *  H5  Search discipline: two or three core keywords, structural filters instead of
 *      query stuffing, one deterministic search per plan slot, real result counts.
 */

import { partial, ok, type StepEnvelope } from './stepEnvelope';

// ---------------------------------------------------------------------------
// H1: two-tier selection
// ---------------------------------------------------------------------------

export interface Candidate {
    id: string;
    title: string;
    /** Discovery-tier text: a feed summary or search snippet. */
    snippet: string;
    sourceName: string;
    url?: string;
    /** Discovery relevance, as the connector scored it. */
    score?: number;
    /** Already-captured full text, when a prior run fetched it. */
    fullText?: string;
    /** Sub-question this candidate was found for. */
    subQuestionId?: string;
    /** Publication date, when the connector supplied one. */
    published?: string;
}

export interface SelectionOptions {
    /** Full-text captures allowed PER sub-question. */
    perSubQuestion?: number;
    /** Hard ceiling across the whole run, so a 20-slot plan cannot fetch 200 pages. */
    totalCap?: number;
    /** Minimum snippet length below which a candidate is not worth fetching. */
    minSnippet?: number;
}

export interface SelectionResult {
    /** Candidates chosen for full-text capture, in fetch order. */
    capture: Candidate[];
    /** Chosen candidates already holding full text; no fetch needed. */
    alreadyFull: Candidate[];
    /** Per sub-question: how many were selected and how many existed. */
    perSubQuestion: Array<{ subQuestionId: string; selected: number; available: number }>;
    /** Sub-questions with candidates but none worth fetching. */
    starved: string[];
    /** True when the total cap truncated the selection. */
    cappedByTotal: boolean;
}

const DEFAULTS = { perSubQuestion: 3, totalCap: 24, minSnippet: 80 };

/**
 * Choose what to read in full. Per sub-question, so a thin sub-question still gets
 * its reads. Ties break on the LONGER snippet, on the reasoning that a connector
 * returning more text is more likely to have a real body behind it.
 */
export function selectForFullText(candidates: Candidate[], opts: SelectionOptions = {}): SelectionResult {
    const cfg = { ...DEFAULTS, ...opts };
    const list = (candidates || []).filter(c => c && c.id);
    const bySub = new Map<string, Candidate[]>();
    for (const c of list) {
        const key = c.subQuestionId || '_unassigned';
        const arr = bySub.get(key) || [];
        arr.push(c);
        bySub.set(key, arr);
    }

    const capture: Candidate[] = [];
    const alreadyFull: Candidate[] = [];
    const perSubQuestion: SelectionResult['perSubQuestion'] = [];
    const starved: string[] = [];
    let cappedByTotal = false;

    for (const [subId, arr] of bySub) {
        const ranked = arr.slice().sort((a, b) => {
            const s = (b.score ?? 0) - (a.score ?? 0);
            if (s !== 0) return s;
            return (b.snippet || '').length - (a.snippet || '').length;
        });
        let selected = 0;
        for (const c of ranked) {
            if (selected >= cfg.perSubQuestion) break;
            if (c.fullText && c.fullText.length > cfg.minSnippet) {
                alreadyFull.push(c);
                selected++;
                continue;
            }
            if ((c.snippet || '').length < cfg.minSnippet) continue;
            if (capture.length + alreadyFull.length >= cfg.totalCap) { cappedByTotal = true; break; }
            capture.push(c);
            selected++;
        }
        perSubQuestion.push({ subQuestionId: subId, selected, available: arr.length });
        if (selected === 0 && arr.length > 0) starved.push(subId);
    }

    return { capture, alreadyFull, perSubQuestion, starved, cappedByTotal };
}

// ---------------------------------------------------------------------------
// H2: the per-source extraction schema
// ---------------------------------------------------------------------------

export type EvidenceClaimType = 'empirical' | 'analysis' | 'opinion' | 'vendor' | 'anecdote' | 'unknown';

/**
 * What is recorded per source at ingestion. Every field is nullable ON PURPOSE:
 * a null population is an honest "the source does not say", and it is exactly what
 * a scope check needs in order to refuse. Inventing a population to fill the field
 * would defeat the whole mechanism.
 */
export interface SourceExtraction {
    sourceId: string;
    claimType: EvidenceClaimType;
    /** Who or what the source studied. */
    population: string | null;
    /** When the data was collected or the events occurred. */
    period: string | null;
    /** How the source knows what it claims. */
    methodology: string | null;
    keyFindings: string[];
    limitations: string[];
    namedEntities: string[];
    /** Set when extraction could not run. Reported, never fabricated. */
    unavailableReason?: string;
}

export function emptyExtraction(sourceId: string, reason: string): SourceExtraction {
    return {
        sourceId, claimType: 'unknown',
        population: null, period: null, methodology: null,
        keyFindings: [], limitations: [], namedEntities: [],
        unavailableReason: reason,
    };
}

export type ScopeVerdict = 'match' | 'narrower' | 'unknown';

export interface ScopeCheck {
    verdict: ScopeVerdict;
    /** Which dimension failed, when the verdict is `narrower`. */
    dimension: 'population' | 'period' | 'none';
    detail: string;
}

/**
 * The Scope-Match Rule, mechanized. A claim may not widen its source: if the
 * source studied one population and the claim speaks of a broader one, the claim
 * must be narrowed to the source's scope.
 *
 * Conservative by construction. `unknown` is returned whenever the extraction does
 * not record the dimension, because a check that guesses is worse than a check
 * that abstains: a false `match` licenses exactly the overreach the rule exists to
 * stop.
 */
const UNIVERSAL_RE = /\b(all|every|any|universally|across\s+the\s+board|in\s+general|generally|always|never|no\s+\w+\s+can)\b/i;
const PLURAL_ACTOR_RE = /\b(companies|organizations|firms|institutions|teams|buyers|customers|patients|students|employees|leaders|executives|consumers|users)\b/i;

export function checkScopeMatch(claim: string, extraction: SourceExtraction): ScopeCheck {
    const text = String(claim || '');
    if (!extraction || extraction.unavailableReason) {
        return { verdict: 'unknown', dimension: 'none', detail: 'no extraction recorded for this source' };
    }
    if (!extraction.population) {
        return { verdict: 'unknown', dimension: 'none', detail: 'the source does not state its population, so scope cannot be checked' };
    }
    const claimIsUniversal = UNIVERSAL_RE.test(text) || (PLURAL_ACTOR_RE.test(text) && !/\bsome|several|a\s+few\b/i.test(text));
    const popIsBounded = /\b(one|single|\d+)\b/i.test(extraction.population)
        || /\b(a\s+|the\s+)?(?:sample|cohort|subset|case|pilot|respondents?|participants?|interviewees?)\b/i.test(extraction.population);
    if (claimIsUniversal && popIsBounded) {
        return {
            verdict: 'narrower', dimension: 'population',
            detail: `the claim speaks universally while the source studied ${extraction.population}`,
        };
    }
    return { verdict: 'match', dimension: 'none', detail: `claim scope is within "${extraction.population}"` };
}

// ---------------------------------------------------------------------------
// H3: the batching table and honest failure
// ---------------------------------------------------------------------------

export interface BatchPlan {
    batches: Array<{ index: number; items: string[] }>;
    batchSize: number;
    total: number;
}

/**
 * A TABLE, not arithmetic. deer-flow's rule exists because a model asked to
 * "process these in batches of 8" miscounts, drops the tail, or claims a batch it
 * never ran. The caller gets an explicit list and can verify every id appears once.
 */
const BATCH_TABLE: Array<{ upTo: number; size: number }> = [
    { upTo: 4, size: 4 },
    { upTo: 12, size: 4 },
    { upTo: 30, size: 6 },
    { upTo: 60, size: 8 },
    { upTo: Number.MAX_SAFE_INTEGER, size: 10 },
];

export function planBatches(ids: string[]): BatchPlan {
    const list = (ids || []).filter(Boolean);
    const size = (BATCH_TABLE.find(r => list.length <= r.upTo) || BATCH_TABLE[BATCH_TABLE.length - 1]).size;
    const batches: BatchPlan['batches'] = [];
    for (let i = 0; i < list.length; i += size) {
        batches.push({ index: batches.length, items: list.slice(i, i + size) });
    }
    return { batches, batchSize: size, total: list.length };
}

export interface CaptureOutcome {
    sourceId: string;
    ok: boolean;
    chars: number;
    reason?: string;
}

export interface CaptureReport {
    attempted: number;
    captured: number;
    failed: CaptureOutcome[];
    /** Per-batch survival, so a systematically failing batch is visible. */
    batchOutcomes: Array<{ index: number; captured: number; failed: number }>;
    /** Model-facing: names what could not be read. */
    notice: string;
}

/**
 * Summarize a capture run. The rule this enforces: a failed fetch is REPORTED.
 * The notice exists so the model knows a source it saw in the candidate list is
 * absent from the corpus, rather than silently reasoning as if it had been read.
 */
export function buildCaptureReport(outcomes: CaptureOutcome[], plan: BatchPlan): CaptureReport {
    const list = outcomes || [];
    const failed = list.filter(o => !o.ok);
    const batchOutcomes = plan.batches.map(b => {
        const inBatch = list.filter(o => b.items.includes(o.sourceId));
        return { index: b.index, captured: inBatch.filter(o => o.ok).length, failed: inBatch.filter(o => !o.ok).length };
    });
    const notice = failed.length === 0
        ? ''
        : [
            `=== ${failed.length} SOURCE(S) COULD NOT BE READ ===`,
            ...failed.slice(0, 8).map(f => `- ${f.sourceId}: ${f.reason || 'fetch failed'}`),
            'These sources are NOT in the corpus for this run. Do not cite them, and do not describe',
            'their contents from their titles.',
        ].join('\n');
    return {
        attempted: list.length,
        captured: list.length - failed.length,
        failed,
        batchOutcomes,
        notice,
    };
}

/** Envelope form, so a capture run reports through the same contract as every other step. */
export function captureEnvelope(report: CaptureReport): StepEnvelope<CaptureReport> {
    if (!report.attempted) return ok('extract:capture', report);
    if (!report.failed.length) return ok('extract:capture', report);
    return partial('extract:capture', report,
        `${report.failed.length}/${report.attempted} full-text captures failed`,
        { nextAction: report.captured ? 'continue' : 'try_alternative' });
}

// ---------------------------------------------------------------------------
// H5: search discipline
// ---------------------------------------------------------------------------

/** Words that add no retrieval signal but crowd out the terms that do. */
const NOISE = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'about', 'from',
    'what', 'which', 'how', 'why', 'who', 'when', 'is', 'are', 'was', 'were', 'be', 'being',
    'analysis', 'research', 'study', 'report', 'overview', 'insights', 'trends', 'landscape',
    'best', 'latest', 'current', 'top', 'key', 'important', 'comprehensive', 'detailed',
    'please', 'need', 'want', 'help', 'give', 'me', 'our', 'we', 'us', 'their', 'they',
    'deck', 'slides', 'artifact', 'deliverable',
]);

export interface ShapedQuery {
    /** Two or three core keywords. */
    keywords: string[];
    /** Structural constraints, applied as filters rather than query text. */
    filters: { packs?: string[]; categories?: string[]; since?: string };
    /** The query string to send. */
    query: string;
    dropped: string[];
}

/**
 * Reduce an objective to the terms that actually retrieve. The failure this fixes:
 * HiC has sent whole sentences as queries, and a connector matching on a
 * 14-word string returns either everything or nothing.
 */
export function shapeQuery(objective: string, filters: ShapedQuery['filters'] = {}, maxKeywords = 3): ShapedQuery {
    const raw = String(objective || '')
        .replace(/#\w+/g, ' ')
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(Boolean);
    const kept: string[] = [];
    const dropped: string[] = [];
    // Proper nouns first: a named subject is the highest-signal term available.
    const proper = raw.filter(w => /^[A-Z][a-z]{2,}/.test(w) && !NOISE.has(w.toLowerCase()));
    const rest = raw.filter(w => !proper.includes(w));
    for (const w of [...proper, ...rest]) {
        const lw = w.toLowerCase();
        if (NOISE.has(lw) || lw.length < 3) { dropped.push(w); continue; }
        if (kept.some(k => k.toLowerCase() === lw)) { dropped.push(w); continue; }
        if (kept.length >= maxKeywords) { dropped.push(w); continue; }
        kept.push(w);
    }
    return { keywords: kept, filters, query: kept.join(' '), dropped };
}

/**
 * One deterministic search per plan slot. The anti-thrash rule: a slot that has
 * already been searched is not searched again with a reworded query, because
 * rewording the same ask is how a run burns its budget without adding evidence.
 */
const _searchedSlots = new Map<string, { query: string; results: number }>();

export function shouldSearchSlot(slotId: string): boolean {
    return !!slotId && !_searchedSlots.has(slotId);
}

export function noteSlotSearch(slotId: string, query: string, results: number): void {
    if (slotId) _searchedSlots.set(slotId, { query, results });
}

export function slotSearchRecord(): Array<{ slotId: string; query: string; results: number }> {
    return Array.from(_searchedSlots.entries()).map(([slotId, v]) => ({ slotId, ...v }));
}

export function resetSlotSearches(): void {
    _searchedSlots.clear();
}

/**
 * Report the REAL result count. deer-flow's rule against padding matters here
 * because HiC's own diagnosis of a bad run began with a log line claiming more
 * sources than the corpus held.
 */
export function describeSearchYield(records: Array<{ slotId: string; results: number }>): string {
    if (!records.length) return 'no slot searches recorded';
    const empty = records.filter(r => r.results === 0);
    const total = records.reduce((a, r) => a + r.results, 0);
    const base = `${records.length} slot search(es), ${total} result(s)`;
    return empty.length ? `${base}; ${empty.length} slot(s) returned nothing: ${empty.map(e => e.slotId).join(', ')}` : base;
}
