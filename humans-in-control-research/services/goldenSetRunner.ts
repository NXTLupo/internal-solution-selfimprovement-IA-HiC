/**
 * goldenSetRunner.ts - Meta-Harness uplift M3 (plans/volume-to-insight-substrate-2026-06-03.md §6.4)
 *
 * The evaluation muscle the Step-7 epoch needs. Without this, the epoch can
 * apply ~1 edit per week instead of Meta-Harness's 5-10 edits per cycle -
 * gold-set scoring is the per-iteration bottleneck.
 *
 * Design contract:
 *   - Reads wiki/eval/golden-set.json - the FROZEN held-out evaluation set.
 *   - Loads every registered positive_exemplar (gold deliverables that should
 *     score HIGH) and a deterministic sample of the negative_failure_corpus
 *     (cached deliverables that should score LOW).
 *   - Scores each via M2 qualityFrontier.evaluatePareto.
 *   - Computes DISCRIMINATION = mean(exemplar scalar) - mean(failure scalar).
 *   - Returns a GoldenSetReport: per-case vectors + aggregate + verdict.
 *   - Comparable across epochs via compareReports(before, after): the gate
 *     accepts an edit only if discrimination did not shrink AND exemplar
 *     scores did not regress on any catastrophic-floor dim.
 *
 * Cheap by design:
 *   - No LLM calls in this v1 - mechanical layer only (scoreOutput +
 *     detectBannedPhrases + meta_narration patterns + citation diversity
 *     + action-title heuristic). LLM-judge layer is a later concern.
 *   - File reads ride the existing /hic-workspace/ static path.
 *   - Failure-corpus enumeration via /api/golden-set/failure-corpus.
 *   - Deterministic sampling so two consecutive gate runs at the same repo
 *     state produce identical reports (essential for the SkillOpt loop's
 *     reproducibility claim).
 */

import { evaluatePareto, type QualityVector, type EvaluatePareto } from './qualityFrontier';

const PROXY_BASE = 'http://127.0.0.1:5012';

// ---------------------------------------------------------------------------
// Schema mirrors (golden-set.json v2)
// ---------------------------------------------------------------------------

export interface GoldenSet {
    version: number;
    purpose: string;
    frozen_at: string;
    tiers: {
        positive_exemplars?: {
            role: string;
            status?: string;
            registered: Array<{
                deliverable: string;
                html_twin?: string;
                brand?: string;
                slide_twins?: {
                    slide_singular?: { html?: string; pptx?: string };
                    slide_plural?: { html?: string; pptx?: string };
                };
                measured?: Record<string, number>;
            }>;
        };
        negative_failure_corpus?: {
            role: string;
            engagement_root: string;
            members?: string;
        };
    };
    failure_taxonomy?: Array<{ id: number; name: string; lens: string; layer: string }>;
    acceptance?: {
        discrimination?: string;
        content_edit?: string;
        wiring_edit?: string;
        hard_zero_checks?: string[];
    };
}

export interface GoldenSetCaseReport {
    /** Stable case id (label + path slug). */
    id: string;
    /** 'exemplar' or 'failure_corpus_sample'. */
    tier: 'exemplar' | 'failure_corpus_sample';
    /** Human-readable label (deliverable type + brand for exemplars; engagement+kind for failure). */
    label: string;
    /** The artifact source path that was scored. */
    source_path: string;
    /** Per-case quality vector from M2. */
    vector: QualityVector;
    /** Single-scalar collapse for discrimination: mean of {completeness, depth, evidence_density, specificity, visual_quality} on 0-5 scale. Used for discrimination delta only; the FULL vector is what the epoch gate consumes. */
    scalar: number;
}

export interface GoldenSetReport {
    /** UTC ms when this report was assembled. */
    ran_at: number;
    /** Path to the golden-set.json that drove this run, for traceability. */
    golden_set_version: number;
    /** Per-case scores. */
    exemplars: GoldenSetCaseReport[];
    /** Per-case scores from the negative corpus sample. */
    failure_sample: GoldenSetCaseReport[];
    /** Aggregate scalars and means. */
    aggregate: {
        exemplar_mean_scalar: number;
        failure_mean_scalar: number;
        /** DISCRIMINATION: the gate's primary acceptance metric. */
        discrimination: number;
        /** Any exemplar that hit a floor violation. The gate rejects edits that introduce floor violations on the EXEMPLAR side. */
        exemplar_floor_violations: Array<{ case_id: string; dims: string[] }>;
    };
    /** Anything that failed to score (file missing, parse error, etc.). */
    errors: Array<{ case_id: string; reason: string }>;
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

const GOLDEN_SET_URL = '/hic-workspace/wiki/eval/golden-set.json';

export async function loadGoldenSet(): Promise<GoldenSet> {
    const resp = await fetch(GOLDEN_SET_URL);
    if (!resp.ok) throw new Error(`loadGoldenSet: HTTP ${resp.status} on ${GOLDEN_SET_URL}`);
    return resp.json();
}

interface FailureCorpusListing {
    total_population: number;
    sample_size: number;
    kinds_filter: string[] | null;
    members: Array<{
        engagement: string;
        kind: string;
        path: string;
        bytes: number;
    }>;
}

export async function listFailureCorpusSample(
    n: number = 10,
    kinds?: string[],
): Promise<FailureCorpusListing> {
    const qs = new URLSearchParams({ n: String(n) });
    if (kinds && kinds.length > 0) qs.set('kinds', kinds.join(','));
    const url = `${PROXY_BASE}/api/golden-set/failure-corpus?${qs.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`listFailureCorpusSample: HTTP ${resp.status}`);
    return resp.json();
}

// ---------------------------------------------------------------------------
// Scoring helpers - pull artifact text + meta into the EvaluatePareto shape.
// ---------------------------------------------------------------------------

/** Fetch a text artifact (HTML twin or JSON deliverable) by path relative to
 *  /hic-workspace/. Path is the value coming back from the failure-corpus
 *  enumerator OR the html_twin field of a registered exemplar. */
async function fetchArtifactText(relPath: string): Promise<string> {
    // golden-set exemplar paths are repo-relative like
    //   '../internal-solutions-journeymapper/journey_maps/journey_map_xxx.html'
    // or 'hic-workspace/wiki/eval/exemplars/journey-nu-slide.html'.
    // We normalize: anything starting with `hic-workspace/` we strip the
    // prefix and fetch via the static /hic-workspace/ mount. Anything else
    // we route through the existing /api/file/read endpoint.
    const cleaned = relPath.replace(/^\.\.?\//, '').replace(/^\/+/, '');
    if (cleaned.startsWith('hic-workspace/')) {
        const url = '/' + cleaned;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`fetch ${url}: HTTP ${r.status}`);
        return r.text();
    }
    // Out-of-tree path: try proxy file-read.
    const r2 = await fetch(`${PROXY_BASE}/api/file/read?path=${encodeURIComponent(cleaned)}`);
    if (!r2.ok) throw new Error(`fetch out-of-tree ${cleaned}: HTTP ${r2.status}`);
    return r2.text();
}

/** Extract plain text from HTML for scoring. Conservative: strip tags,
 *  collapse whitespace, preserve text content. Not meant to be perfect; the
 *  M2 dims that depend on text (banned phrases, meta narration, depth) only
 *  need the actual prose, not the HTML structure. */
function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/** Extract slide titles from HTML (heading elements + .nxt-slide title classes). */
function extractSlideTitles(html: string): string[] {
    const titles: string[] = [];
    const re = /<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const t = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (t.length > 0) titles.push(t);
    }
    return titles;
}

/** Score an exemplar (HTML twin file). */
async function scoreExemplar(
    exemplar: { deliverable: string; html_twin?: string; brand?: string; slide_twins?: any },
): Promise<GoldenSetCaseReport | { error: string }> {
    // Prefer the slide_plural HTML twin (richer); fall back to html_twin.
    const path = exemplar.slide_twins?.slide_plural?.html
        || exemplar.slide_twins?.slide_singular?.html
        || exemplar.html_twin;
    if (!path) return { error: `No HTML twin path for ${exemplar.deliverable}/${exemplar.brand}` };
    let html: string;
    try { html = await fetchArtifactText(path); }
    catch (e: any) { return { error: `Fetch ${path}: ${e?.message || e}` }; }
    const text = htmlToText(html);
    const slideTitles = extractSlideTitles(html);
    const input: EvaluatePareto = {
        text,
        slideTitles,
        // Exemplars don't carry structured citation arrays in the HTML;
        // citation-diversity scoring is OMITTED for exemplars in v1
        // (would require parsing Source: chips, deferred to a later pass).
        label: `exemplar:${exemplar.deliverable}-${exemplar.brand || 'nxt'}`,
        id: `exemplar:${exemplar.deliverable}-${exemplar.brand || 'nxt'}`,
    };
    const vector = evaluatePareto(input);
    return {
        id: input.id!,
        tier: 'exemplar',
        label: `${exemplar.deliverable} (${exemplar.brand || 'NXT'}) exemplar`,
        source_path: path,
        vector,
        scalar: collapseToScalar(vector),
    };
}

/** Score a failure-corpus deliverable (JSON file). */
async function scoreFailureCase(
    member: { engagement: string; kind: string; path: string },
): Promise<GoldenSetCaseReport | { error: string }> {
    let raw: string;
    try { raw = await fetchArtifactText(member.path); }
    catch (e: any) { return { error: `Fetch ${member.path}: ${e?.message || e}` }; }
    // Flatten the JSON into a text blob so banned-phrase + meta-narration +
    // depth heuristics can grade it. Recursive string extraction.
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch (e: any) { return { error: `Parse ${member.path}: ${e?.message || e}` }; }
    const text = flattenJsonToText(parsed);
    const slideTitles: string[] = [];
    // Best-effort extract: themes have name fields, recs have title, etc.
    if (Array.isArray(parsed?.themes)) {
        for (const t of parsed.themes) {
            if (typeof t?.name === 'string') slideTitles.push(t.name);
            else if (typeof t?.title === 'string') slideTitles.push(t.title);
        }
    }
    if (Array.isArray(parsed?.recommendations)) {
        for (const r of parsed.recommendations) {
            if (typeof r?.title === 'string') slideTitles.push(r.title);
        }
    }
    if (Array.isArray(parsed?.personas)) {
        for (const p of parsed.personas) {
            if (typeof p?.name === 'string') slideTitles.push(p.name);
        }
    }
    // Citation array (when present)
    const citations: EvaluatePareto['citations'] = [];
    walkForCitations(parsed, citations);
    const input: EvaluatePareto = {
        text,
        slideTitles: slideTitles.length > 0 ? slideTitles : undefined,
        citations: citations.length > 0 ? citations : undefined,
        label: `failure:${member.engagement}/${member.kind}`,
        id: `failure:${member.engagement}/${member.kind}`,
    };
    const vector = evaluatePareto(input);
    return {
        id: input.id!,
        tier: 'failure_corpus_sample',
        label: `${member.kind} (${member.engagement.slice(0, 40)})`,
        source_path: member.path,
        vector,
        scalar: collapseToScalar(vector),
    };
}

function flattenJsonToText(node: unknown, acc: string[] = [], depth: number = 0): string {
    if (depth > 6) return acc.join(' ');
    if (typeof node === 'string') {
        if (node.trim().length > 0) acc.push(node);
    } else if (Array.isArray(node)) {
        for (const item of node) flattenJsonToText(item, acc, depth + 1);
    } else if (node && typeof node === 'object') {
        for (const v of Object.values(node)) flattenJsonToText(v, acc, depth + 1);
    }
    return acc.join(' ');
}

function walkForCitations(node: unknown, out: NonNullable<EvaluatePareto['citations']>, depth: number = 0): void {
    if (depth > 5) return;
    if (Array.isArray(node)) {
        for (const item of node) walkForCitations(item, out, depth + 1);
    } else if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        // Recognized citation shapes in HiC deliverables.
        if (typeof obj.sourceName === 'string' || typeof obj.sourceFile === 'string') {
            out.push({
                sourceName: typeof obj.sourceName === 'string' ? obj.sourceName : undefined,
                sourceFile: typeof obj.sourceFile === 'string' ? obj.sourceFile : undefined,
                isExternal: typeof obj.isExternal === 'boolean' ? obj.isExternal : undefined,
            });
            return;
        }
        if (Array.isArray(obj.citations)) {
            walkForCitations(obj.citations, out, depth + 1);
            return;
        }
        for (const v of Object.values(obj)) walkForCitations(v, out, depth + 1);
    }
}

/** Single-scalar collapse for discrimination only. Mean of the 0-5 quality
 *  dims that are present, so partial vectors compare honestly. */
function collapseToScalar(v: QualityVector): number {
    const FIVE_SCALE_DIMS = ['completeness', 'depth', 'evidence_density', 'specificity', 'visual_quality'];
    let sum = 0, count = 0;
    for (const d of FIVE_SCALE_DIMS) {
        const val = v.dimensions[d];
        if (typeof val === 'number') { sum += val; count += 1; }
    }
    return count > 0 ? sum / count : 0;
}

// ---------------------------------------------------------------------------
// runGate - the entry point used by Step-7 epoch and the Step-6 surface.
// ---------------------------------------------------------------------------

export interface RunGateOpts {
    /** Number of failure-corpus members to sample. Default 10. */
    failureSampleSize?: number;
    /** Restrict failure-corpus sample to deliverable kinds (e.g. ['recs', 'gap']). */
    failureKinds?: string[];
    /** Limit to specific exemplar deliverables (e.g. ['journey']). Empty = all registered. */
    exemplarDeliverables?: string[];
}

export async function runGate(opts: RunGateOpts = {}): Promise<GoldenSetReport> {
    const ran_at = Date.now();
    const gs = await loadGoldenSet();
    const exemplarFilter = opts.exemplarDeliverables;
    const exemplarsList = (gs.tiers.positive_exemplars?.registered || []).filter(e =>
        !exemplarFilter || exemplarFilter.length === 0 || exemplarFilter.includes(e.deliverable),
    );

    const exemplarReports: GoldenSetCaseReport[] = [];
    const failureReports: GoldenSetCaseReport[] = [];
    const errors: Array<{ case_id: string; reason: string }> = [];

    // Exemplars first (sequential - usually only a handful).
    for (const exemplar of exemplarsList) {
        const r = await scoreExemplar(exemplar);
        if ('error' in r) {
            errors.push({ case_id: `exemplar:${exemplar.deliverable}`, reason: r.error });
        } else {
            exemplarReports.push(r);
        }
    }

    // Failure-corpus sample - small parallel batch (limit 5 in flight).
    const listing = await listFailureCorpusSample(opts.failureSampleSize ?? 10, opts.failureKinds);
    const concurrency = 5;
    for (let i = 0; i < listing.members.length; i += concurrency) {
        const slice = listing.members.slice(i, i + concurrency);
        const settled = await Promise.all(slice.map(scoreFailureCase));
        for (const r of settled) {
            if ('error' in r) errors.push({ case_id: 'failure-batch', reason: r.error });
            else failureReports.push(r);
        }
    }

    const exMean = exemplarReports.length > 0
        ? exemplarReports.reduce((s, r) => s + r.scalar, 0) / exemplarReports.length
        : 0;
    const fMean = failureReports.length > 0
        ? failureReports.reduce((s, r) => s + r.scalar, 0) / failureReports.length
        : 0;
    const exFloorViolations = exemplarReports
        .filter(r => r.vector.floor_violations.length > 0)
        .map(r => ({ case_id: r.id, dims: r.vector.floor_violations }));

    return {
        ran_at,
        golden_set_version: gs.version,
        exemplars: exemplarReports,
        failure_sample: failureReports,
        aggregate: {
            exemplar_mean_scalar: exMean,
            failure_mean_scalar: fMean,
            discrimination: exMean - fMean,
            exemplar_floor_violations: exFloorViolations,
        },
        errors,
    };
}

// ---------------------------------------------------------------------------
// compareReports - Step-7 acceptance rule.
// ---------------------------------------------------------------------------

export interface GoldenSetGateDecision {
    decision: 'apply' | 'reject';
    reason: string;
    /** Discrimination delta (after - before). Positive = improvement; negative = regression. */
    discrimination_delta: number;
    /** Exemplar-mean delta (after - before). Negative = exemplars got worse. */
    exemplar_delta: number;
    /** Failure-mean delta (after - before). Positive = failure corpus got HIGHER (worse for the gate). */
    failure_delta: number;
    /** New exemplar floor violations not present in the baseline. */
    new_floor_violations: string[];
}

/** Apply the golden-set.json acceptance rules to two reports:
 *    - discrimination must not shrink (exemplar - failure stays equal-or-larger)
 *    - exemplar score must not regress (content_edit rule)
 *    - any new exemplar floor violations are catastrophic
 *
 *  `wiringEdit=true` raises the bar to STRICTLY greater (the json's wiring_edit rule).
 */
export function compareReports(
    before: GoldenSetReport,
    after: GoldenSetReport,
    opts: { wiringEdit?: boolean } = {},
): GoldenSetGateDecision {
    const discDelta = after.aggregate.discrimination - before.aggregate.discrimination;
    const exDelta = after.aggregate.exemplar_mean_scalar - before.aggregate.exemplar_mean_scalar;
    const fDelta = after.aggregate.failure_mean_scalar - before.aggregate.failure_mean_scalar;

    const beforeFloorIds = new Set(before.aggregate.exemplar_floor_violations.map(v => v.case_id));
    const newFloor = after.aggregate.exemplar_floor_violations
        .filter(v => !beforeFloorIds.has(v.case_id))
        .flatMap(v => v.dims);

    if (newFloor.length > 0) {
        return {
            decision: 'reject',
            reason: `New exemplar floor violations: ${newFloor.join(', ')}`,
            discrimination_delta: discDelta,
            exemplar_delta: exDelta,
            failure_delta: fDelta,
            new_floor_violations: newFloor,
        };
    }
    if (exDelta < -0.05) {
        return {
            decision: 'reject',
            reason: `Exemplar mean regressed by ${(-exDelta).toFixed(3)} (>0.05 tolerance).`,
            discrimination_delta: discDelta,
            exemplar_delta: exDelta,
            failure_delta: fDelta,
            new_floor_violations: [],
        };
    }
    if (opts.wiringEdit) {
        if (discDelta <= 0) {
            return {
                decision: 'reject',
                reason: `Wiring edit requires STRICTLY-better discrimination, got Δ=${discDelta.toFixed(3)}.`,
                discrimination_delta: discDelta,
                exemplar_delta: exDelta,
                failure_delta: fDelta,
                new_floor_violations: [],
            };
        }
    } else if (discDelta < -0.05) {
        return {
            decision: 'reject',
            reason: `Discrimination shrank by ${(-discDelta).toFixed(3)} (>0.05 tolerance).`,
            discrimination_delta: discDelta,
            exemplar_delta: exDelta,
            failure_delta: fDelta,
            new_floor_violations: [],
        };
    }
    return {
        decision: 'apply',
        reason: `Discrimination Δ=${discDelta.toFixed(3)}, exemplar Δ=${exDelta.toFixed(3)}, failure Δ=${fDelta.toFixed(3)}. Within tolerance.`,
        discrimination_delta: discDelta,
        exemplar_delta: exDelta,
        failure_delta: fDelta,
        new_floor_violations: [],
    };
}

// ---------------------------------------------------------------------------
// Formatter for ledger / Reasoning Stream display.
// ---------------------------------------------------------------------------

export function formatReport(report: GoldenSetReport): string {
    const lines: string[] = [];
    lines.push(`Golden-set report (v${report.golden_set_version}, ran ${new Date(report.ran_at).toISOString()}):`);
    lines.push(`  exemplars: ${report.exemplars.length}, mean=${report.aggregate.exemplar_mean_scalar.toFixed(3)}`);
    lines.push(`  failure sample: ${report.failure_sample.length}, mean=${report.aggregate.failure_mean_scalar.toFixed(3)}`);
    lines.push(`  DISCRIMINATION: ${report.aggregate.discrimination.toFixed(3)}`);
    if (report.aggregate.exemplar_floor_violations.length > 0) {
        lines.push(`   exemplar floor violations:`);
        for (const v of report.aggregate.exemplar_floor_violations) {
            lines.push(`    - ${v.case_id}: ${v.dims.join(', ')}`);
        }
    }
    if (report.errors.length > 0) {
        lines.push(`  errors: ${report.errors.length}`);
        for (const e of report.errors.slice(0, 5)) {
            lines.push(`    - ${e.case_id}: ${e.reason.slice(0, 80)}`);
        }
    }
    return lines.join('\n');
}
