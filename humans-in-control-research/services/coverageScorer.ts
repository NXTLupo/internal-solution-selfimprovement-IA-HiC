/**
 * coverageScorer - multi-metric per-question coverage analysis.
 *
 * The April 2026 research consensus (Amazing Agent Race, Trustworthy Report
 * Generation) argued that a single "coverage score" hides where research
 * pipelines actually fail. This scorer decomposes coverage into five
 * independent signals so the patch-query loop and the user can see exactly
 * which dimension is thin:
 *
 *   1. density        - # of records that substantively address the question
 *   2. diversity      - # of distinct sources contributing
 *   3. recency        - fraction of records inside the brief's date window
 *   4. avgConfidence  - mean extraction confidence of contributing records
 *   5. entityHonorRate - fraction of brief-named entities that produced evidence
 *
 * Each metric has a `score` (normalized 0-1 against vertical-aware targets)
 * and a `compositeScore` rolls them up for UI sorting only - never gating.
 *
 * The scorer is DETERMINISTIC. No AI calls. Pure function over (brief, records).
 *
 * For records that lack questionIds (legacy items wrapped via fromLegacyItem
 * before the planner's per-source question attribution lands in a later tier),
 * the scorer falls back to keyword-overlap matching against question text.
 * Imperfect but workable - the target is "useful diagnostic", not "100%
 * recall on question-record assignment".
 */

import type { EvidenceRecord, ParsedBrief, QuestionCoverage } from './evidenceRecord';

// --- TARGETS ---
// Default thresholds for "full" coverage per metric. Vertical skills can override
// in a future tier; for MVP we use the same targets across all verticals.

const DEFAULT_TARGETS = {
    densityFull: 5,         // 5+ records per question = full density
    diversityFull: 3,       // 3+ distinct sources per question = full diversity
    minRecencyFraction: 0.6, // 60% in date window = strong recency
};

// --- PUBLIC API ---

export interface ScoreCoverageOpts {
    /** If true, post-match records to questions via keyword overlap when questionIds is empty */
    autoMatchQuestions?: boolean;
    /** Custom densityFull / diversityFull / etc. */
    targets?: Partial<typeof DEFAULT_TARGETS>;
}

function scoreCoverage(
    brief: ParsedBrief,
    records: EvidenceRecord[],
    opts: ScoreCoverageOpts = {}
): QuestionCoverage[] {
    const targets = { ...DEFAULT_TARGETS, ...(opts.targets || {}) };
    const autoMatch = opts.autoMatchQuestions !== false;

    // Pre-compute the question→records mapping. Honors record.questionIds when
    // populated; falls back to keyword-overlap matching otherwise.
    const recordsByQuestion = mapRecordsToQuestions(brief, records, autoMatch);

    return brief.questions.map(q => {
        const qRecords = recordsByQuestion.get(q.id) || [];

        const density = qRecords.length;
        const densityScore = Math.min(1, density / targets.densityFull);

        const distinctSources = new Set(qRecords.map(r => r.sourceId));
        const diversity = distinctSources.size;
        const diversityScore = Math.min(1, diversity / targets.diversityFull);

        const recency = computeRecencyFraction(qRecords, brief);

        const avgConfidence = qRecords.length > 0
            ? qRecords.reduce((s, r) => s + (r.extractionConfidence || 0), 0) / qRecords.length
            : 0;

        const entityHonorRate = computeEntityHonorRate(brief, qRecords);

        // Composite - straight average of the five normalized scores
        const compositeScore = (densityScore + diversityScore + recency + avgConfidence + entityHonorRate) / 5;

        const diagnostic = buildDiagnostic({
            density, densityScore,
            diversity, diversityScore,
            recency, avgConfidence, entityHonorRate,
            qRecordsCount: qRecords.length,
            briefHasDateFilter: !!brief.dateFilter,
            briefEntityCount: countNamedEntities(brief),
        });

        return {
            questionId: q.id,
            density,
            densityScore,
            diversity,
            diversityScore,
            recency,
            avgConfidence,
            entityHonorRate,
            compositeScore,
            diagnostic,
        };
    });
}

// --- QUESTION → RECORDS MAPPING ---

/**
 * Build a Map<questionId, EvidenceRecord[]>.
 * Honors record.questionIds when populated.
 * Falls back to keyword-overlap matching otherwise.
 */
function mapRecordsToQuestions(
    brief: ParsedBrief,
    records: EvidenceRecord[],
    autoMatch: boolean
): Map<string, EvidenceRecord[]> {
    const out = new Map<string, EvidenceRecord[]>();
    for (const q of brief.questions) out.set(q.id, []);

    // Pre-extract question keyword sets for fallback matching
    const questionTokens = new Map<string, Set<string>>();
    if (autoMatch) {
        for (const q of brief.questions) {
            questionTokens.set(q.id, tokenize(q.text));
        }
    }

    for (const rec of records) {
        // Strong path: record explicitly tagged with questionIds
        if (rec.questionIds && rec.questionIds.length > 0) {
            for (const qid of rec.questionIds) {
                const arr = out.get(qid);
                if (arr) arr.push(rec);
            }
            continue;
        }

        // Fallback path: keyword-overlap matching
        if (!autoMatch) continue;
        const recTokens = tokenize(`${rec.title} ${rec.excerpt}`);
        let bestQ: string | null = null;
        let bestScore = 0;
        for (const [qid, qToks] of questionTokens.entries()) {
            const overlap = countOverlap(recTokens, qToks);
            // Normalize by question token count so short questions don't dominate
            const score = overlap / Math.max(qToks.size, 1);
            if (score > bestScore && overlap >= 2) {
                bestScore = score;
                bestQ = qid;
            }
        }
        if (bestQ) {
            out.get(bestQ)!.push(rec);
        }
    }

    return out;
}

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not', 'this', 'that',
    'it', 'its', 'their', 'they', 'them', 'what', 'which', 'who', 'how', 'when', 'where',
    'about', 'into', 'through', 'during', 'before', 'after', 'between', 'over', 'under',
    'we', 'our', 'i', 'you', 'your', 'me', 'my',
]);

function tokenize(text: string): Set<string> {
    return new Set(
        (text || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2 && !STOP_WORDS.has(t))
    );
}

function countOverlap(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n;
}

// --- METRIC HELPERS ---

function computeRecencyFraction(records: EvidenceRecord[], brief: ParsedBrief): number {
    if (records.length === 0) return 0;
    if (!brief.dateFilter || !brief.dateFilter.from) {
        // No explicit date window - use freshness as proxy. Mean of (1 - age/year_decay)
        return records.reduce((s, r) => s + (r.freshness || 0.5), 0) / records.length;
    }

    const fromMs = Date.parse(brief.dateFilter.from);
    const toMs = brief.dateFilter.to ? Date.parse(brief.dateFilter.to) : Date.now();
    if (!Number.isFinite(fromMs)) return 0.5;

    let inWindow = 0;
    let withDate = 0;
    for (const r of records) {
        if (!r.publishedDate) continue;
        const ms = Date.parse(r.publishedDate);
        if (!Number.isFinite(ms)) continue;
        withDate++;
        if (ms >= fromMs && ms <= toMs) inWindow++;
    }

    if (withDate === 0) return 0.3;  // can't tell - penalize but not zero
    return inWindow / withDate;
}

function computeEntityHonorRate(brief: ParsedBrief, records: EvidenceRecord[]): number {
    const entities = [
        ...brief.namedEntities.subreddits.map(s => 'r/' + s),
        ...brief.namedEntities.subreddits,  // also bare-name match
        ...brief.namedEntities.publications,
        ...brief.namedEntities.peerEntities,
        ...brief.namedEntities.vendors,
        ...brief.namedEntities.hashtags,
    ].filter(Boolean);

    // Dedupe (subreddit list contributes both r/X and X)
    const uniqueEntities = Array.from(new Set(entities));
    if (uniqueEntities.length === 0) return 1;   // brief named no entities - vacuously honored

    if (records.length === 0) return 0;

    let honored = 0;
    for (const ent of uniqueEntities) {
        const lower = ent.toLowerCase();
        const found = records.some(r =>
            (r.entityRefs && r.entityRefs.some(e => e.toLowerCase().includes(lower))) ||
            r.source.toLowerCase().includes(lower) ||
            r.title.toLowerCase().includes(lower) ||
            (r.excerpt || '').toLowerCase().includes(lower)
        );
        if (found) honored++;
    }
    return honored / uniqueEntities.length;
}

function countNamedEntities(brief: ParsedBrief): number {
    return brief.namedEntities.subreddits.length
        + brief.namedEntities.publications.length
        + brief.namedEntities.peerEntities.length
        + brief.namedEntities.vendors.length
        + brief.namedEntities.hashtags.length;
}

// --- DIAGNOSTIC NARRATIVE ---

function buildDiagnostic(stats: {
    density: number;
    densityScore: number;
    diversity: number;
    diversityScore: number;
    recency: number;
    avgConfidence: number;
    entityHonorRate: number;
    qRecordsCount: number;
    briefHasDateFilter: boolean;
    briefEntityCount: number;
}): string {
    if (stats.qRecordsCount === 0) {
        return 'No evidence collected for this question. Add a patch query, expand the source pool, or rephrase the question.';
    }

    const issues: string[] = [];

    if (stats.densityScore < 0.5) {
        issues.push(`only ${stats.density} record${stats.density === 1 ? '' : 's'} (target: ${DEFAULT_TARGETS.densityFull})`);
    }
    if (stats.diversityScore < 0.5) {
        issues.push(`only ${stats.diversity} source${stats.diversity === 1 ? '' : 's'} (target: ${DEFAULT_TARGETS.diversityFull}+)`);
    }
    if (stats.briefHasDateFilter && stats.recency < DEFAULT_TARGETS.minRecencyFraction) {
        issues.push(`${Math.round(stats.recency * 100)}% in date window (target: ${Math.round(DEFAULT_TARGETS.minRecencyFraction * 100)}%+)`);
    }
    if (stats.avgConfidence < 0.5) {
        issues.push(`avg extraction confidence ${Math.round(stats.avgConfidence * 100)}%`);
    }
    if (stats.briefEntityCount > 0 && stats.entityHonorRate < 0.5) {
        issues.push(`only ${Math.round(stats.entityHonorRate * 100)}% of named entities produced evidence`);
    }

    if (issues.length === 0) {
        return `Strong coverage: ${stats.density} records across ${stats.diversity} sources, ${Math.round(stats.recency * 100)}% in date window, avg confidence ${Math.round(stats.avgConfidence * 100)}%.`;
    }

    return `Thin: ${issues.join(' · ')}. Patch suggestions in the Gaps tab.`;
}

// --- ROLL-UP STATS (for collection-preview UI in Tier 2.5) ---

export interface CoverageRollup {
    totalQuestions: number;
    fullyCoveredCount: number;
    thinCount: number;
    avgComposite: number;
    weakestQuestionId: string | null;
    weakestComposite: number;
}

