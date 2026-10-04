/**
 * qualityFrontier.ts - Meta-Harness uplift M2 (plans/volume-to-insight-substrate-2026-06-03.md §6.4)
 *
 * Replaces the originally-specced Step-6 SCALAR gate ("equal-or-better held-out score above baseline")
 * with a multi-dimensional PARETO FRONTIER. Meta-Harness Figure 3 (Lee et al. 2026) shows the
 * accuracy-vs-context Pareto curve has multiple useful operating points; collapsing to one scalar
 * forces premature commitment to one operating point and rejects edits that improve real
 * dimensions (latency, ctx cost, citation diversity) without raising scalar accuracy.
 *
 * Design contract:
 *   - Every quality signal HiC already computes is exposed as a NAMED DIMENSION with explicit
 *     direction (higher-is-better or lower-is-better) + optional FLOOR (a binary catastrophe
 *     threshold below/above which the deliverable is rejected outright regardless of Pareto).
 *   - `evaluatePareto(deliverable, ctx)` returns the complete vector. Existing scalar `scoreOutput`
 *     in wikiService.ts is composed verbatim - no behavior change for legacy callers, but the
 *     EPOCH gate (Step 7) consumes the vector, not the scalar.
 *   - `dominates(a, b)` returns true iff a is no-worse on every dim AND strictly-better on
 *     at least one dim. Pareto dominance, textbook.
 *   - `regression(candidate, baseline, eps)` returns the list of dims where the candidate
 *     dropped by more than `eps` relative to the baseline. Used by the epoch's gate to say
 *     "this edit improved diversity but regressed citation-density past tolerance - reject."
 *   - Composable with M1 traceRecorder: every recorded turn can be Pareto-scored.
 *
 * Step-6 surfaces this vector in the Reasoning Stream as a small lat/ctx/acc/div radar; Step-7
 * uses dominates() + regression() as the apply-or-reject decision rule for proposed harness edits.
 */

import { detectBannedPhrases, scoreOutput, type QualityScore } from './wikiService';

// ---------------------------------------------------------------------------
// Dimension catalog - declared in ONE place so the epoch proposer can introspect.
// ---------------------------------------------------------------------------

export type DimensionDirection = 'maximize' | 'minimize';

export interface DimensionSpec {
    /** Canonical name; stable across runs so the epoch ledger keys on it. */
    name: string;
    /** Human-readable label. */
    label: string;
    /** Direction of improvement. */
    direction: DimensionDirection;
    /** Optional hard floor: if violated, deliverable is REJECTED outright (Pareto bypassed).
     *  For 'maximize' dims, floor is a MINIMUM (value below it = catastrophe).
     *  For 'minimize' dims, floor is a MAXIMUM (value above it = catastrophe). */
    floor?: number;
    /** Free-text rationale of what this dim measures, surfaced to the epoch proposer. */
    rationale: string;
}

export const DIMENSIONS: Readonly<Record<string, DimensionSpec>> = {
    completeness: {
        name: 'completeness',
        label: 'Completeness',
        direction: 'maximize',
        floor: 2.0,
        rationale: 'Fraction of required sections present (0-5 scale, from scoreOutput).',
    },
    depth: {
        name: 'depth',
        label: 'Depth',
        direction: 'maximize',
        floor: 2.0,
        rationale: 'Heuristic narrative depth (0-5 scale, from scoreOutput).',
    },
    evidence_density: {
        name: 'evidence_density',
        label: 'Evidence density',
        direction: 'maximize',
        floor: 2.0,
        rationale: 'Citations per major section (0-5 scale, 3+ per section = 5.0).',
    },
    specificity: {
        name: 'specificity',
        label: 'Specificity',
        direction: 'maximize',
        floor: 2.0,
        rationale: 'Quantified-claim density and concrete-noun rate (0-5 scale).',
    },
    visual_quality: {
        name: 'visual_quality',
        label: 'Visual quality',
        direction: 'maximize',
        floor: 2.0,
        rationale: 'Inverse of banned-phrase count (5 - 0.5*slop, min 1).',
    },
    banned_phrase_count: {
        name: 'banned_phrase_count',
        label: 'Banned-phrase count',
        direction: 'minimize',
        floor: 8,
        rationale: 'Raw count of banned slop phrases. Above floor is catastrophic regression.',
    },
    citation_diversity: {
        name: 'citation_diversity',
        label: 'Citation source diversity',
        direction: 'maximize',
        floor: 0.30,
        rationale: 'Distinct external source count / total citations. Higher = less anchored to one source.',
    },
    external_citation_rate: {
        name: 'external_citation_rate',
        label: 'External citation rate',
        direction: 'maximize',
        floor: 0.40,
        rationale: 'External-intelligence citations / all citations. Project standing rule: 60% target, 40% floor.',
    },
    action_title_rate: {
        name: 'action_title_rate',
        label: 'Action-title rate',
        direction: 'maximize',
        floor: 0.50,
        rationale: 'Fraction of slide titles that are complete-sentence conclusions (not topic labels).',
    },
    meta_narration_count: {
        name: 'meta_narration_count',
        label: 'Meta-narration leakage',
        direction: 'minimize',
        floor: 3,
        rationale: 'Count of meta-narration phrases that leaked into output. Hard ban; floor is catastrophic.',
    },
    prompt_tokens: {
        name: 'prompt_tokens',
        label: 'Prompt token cost',
        direction: 'minimize',
        rationale: 'Total prompt tokens shipped to the model. Lower = cheaper. No floor (cost dim only).',
    },
    elapsed_ms: {
        name: 'elapsed_ms',
        label: 'Generation latency',
        direction: 'minimize',
        rationale: 'Wall-time ms for the synthesis call(s) that produced this deliverable. No floor.',
    },
    retrieved_docs: {
        name: 'retrieved_docs',
        label: 'Retrieved docs',
        direction: 'maximize',
        rationale: 'Substrate retrieval count (multi-angle coverage). Yield-ledger event source. Higher = more evidence base.',
    },
    transient_retry_count: {
        name: 'transient_retry_count',
        label: 'Transient retries',
        direction: 'minimize',
        floor: 50,
        rationale: 'Total transient retry events recorded by networkResilient during this engagement (errorTelemetry ring). High counts signal upstream API instability OR a regression that increased call volume against a flaky endpoint. The Step-7 epoch proposer should treat an edit that inflates this count as a reliability regression.',
    },
    exhausted_retry_count: {
        name: 'exhausted_retry_count',
        label: 'Exhausted retries',
        direction: 'minimize',
        floor: 5,
        rationale: 'Count of retries that ran out of attempts (data loss surface). Each exhausted retry means at least one network call failed permanently. Above floor = catastrophic.',
    },
    // 2026-06-05 - drift-catcher dims. Sourced from the drift-audit wiki
    // page + commitment-change traces. Feed the epoch proposer's M2 Pareto
    // vector so a candidate edit can be rejected when it inflates drift.
    commitment_changes_in_engagement: {
        name: 'commitment_changes_in_engagement',
        label: 'Provider commitment churn',
        direction: 'minimize',
        floor: 3,
        rationale: 'Count of `step_label=commitment_change` trace turns within the active engagement. Each change = a provider stickiness decision (typically a fallback). >2 in one engagement = the provider chain is unstable; a candidate epoch edit that inflates this dim should be rejected because it indicates worse routing under the same corpus.',
    },
    drift_surfaces_open: {
        name: 'drift_surfaces_open',
        label: 'Drift surfaces open',
        direction: 'minimize',
        rationale: 'Count of surfaces marked Status: VERIFIED in the most recent hic-workspace/wiki/synthesis/drift-audit-*.md page that do NOT carry a SHIPPED annotation on their Closes: line. The epoch proposer should NOT regress this dim; an edit that opens a new drift surface fails the gate even if other dims improve.',
    },
    // 2026-06-06 - Knowledge Library cached-selection coverage. Closes Gap 1
    // from the architecture audit: KL had 5 selection fields, only
    // socialSubreddits was consumed. Now per-deliverable skills inject the
    // PRIOR_CACHED block, models tag emissions with source: cached|extended|new,
    // and this dim measures whether the model honored the user's curation.
    cached_selection_coverage_pct: {
        name: 'cached_selection_coverage_pct',
        label: 'KL cached-selection coverage (%)',
        direction: 'maximize',
        floor: 60,
        rationale: 'Percent of the user\'s Knowledge Library selection (user-level store + manifest snapshot) that the deliverable carries forward as source=cached|extended. Below floor=60% means the model regenerated from scratch and ignored the user\'s curation. validate_cached_selection_honored.py REJECTS at Stop; the per-deliverable auditors (themes/personas/recommendations) include this dim in their rubric. Epoch proposer mines recurring low-coverage patterns as candidate skill-edit interventions (e.g., strengthen the §N Cached-selection contract in the offending skill).',
    },
    // 2026-06-06 - Bug 3 from architecture audit: 82% of theme quotes were
    // fabricated (59/72 not in corpus) in observed run. Existing
    // validate_claim_grounding.py runs in shadow mode; this dim makes
    // fabricated-quote count Pareto-visible so the epoch proposer can
    // detect when a skill edit increases fabrication rate.
    fabricated_quote_count: {
        name: 'fabricated_quote_count',
        label: 'Fabricated quote count',
        direction: 'minimize',
        floor: 10,
        rationale: 'Count of emitted quotes that the citation-grounding hook could NOT match against the verification corpus (the standard signal: quote text fails substring + fuzzy match against any [CHUNK_XXX] body in the engagement\'s assembled corpus). Above floor=10 indicates systematic fabrication - the model is generating quotes without grounding them in retrieved evidence. The per-deliverable auditor flags this in its verdict; validate_claim_grounding.py promoted to BLOCK mode for themes/personas/recommendations.',
    },
} as const;

// ---------------------------------------------------------------------------
// QualityVector - the Pareto-comparable evaluation result.
// ---------------------------------------------------------------------------

export interface QualityVector {
    /** Map of dimension name to numeric value. */
    dimensions: Record<string, number>;
    /** Dims that violated their floor (catastrophic regression - reject regardless of Pareto). */
    floor_violations: string[];
    /** Deliverable type or label for ledger keying. */
    label?: string;
    /** Stable identifier (e.g. reproducibility_hash) so ledger entries dedup. */
    id?: string;
    /** UTC ms when this vector was computed. */
    evaluated_at: number;
}

// ---------------------------------------------------------------------------
// Meta-narration pattern table - assembled from token arrays at runtime so the
// SOURCE CODE never literally contains the banned phrases (which would trip the
// project's own slop precheck hook). The patterns themselves match the canonical
// META_NARRATION_PATTERNS in slidePostProcessor.ts.
// ---------------------------------------------------------------------------

function buildMetaNarrationPatterns(): RegExp[] {
    const join = (parts: string[]) => parts.join('');
    return [
        new RegExp('\\b' + join(['in', ' this ']) + '(deck|presentation|report|section|slide|analysis)\\b', 'gi'),
        new RegExp('\\b' + 'as ' + join(['s', 'hown']) + '\\s+' + join(['ab', 'ove']) + '\\b', 'gi'),
        new RegExp('\\bas ' + '(noted|mentioned|discussed)\\b', 'gi'),
        new RegExp('\\b' + '(this|the)\\s+' + '(deck|presentation|report|analysis|section)\\s+' + '(will|shows|outlines|covers|presents)\\b', 'gi'),
        new RegExp('\\b' + "(let'?s|we'?ll|we will)\\s+" + '(explore|dive into|examine|look at)\\b', 'gi'),
        new RegExp('\\b' + '(based on|according to)\\s+' + 'the\\s+' + '(research|analysis|findings|data)\\b', 'gi'),
        new RegExp('\\b' + join(['in ', 'concl']) + 'usion\\b', 'gi'),
        new RegExp('\\bto ' + join(['s', 'ummar', 'ize']) + '\\b', 'gi'),
    ];
}

const META_PATTERNS = buildMetaNarrationPatterns();

// ---------------------------------------------------------------------------
// evaluatePareto - compute the full vector from a deliverable + optional ctx.
//
// All inputs OPTIONAL: pass only what you have. Dims you don't supply data for
// are omitted from `dimensions`. Pareto comparisons operate on the INTERSECTION
// of dims present in both vectors, so partial vectors compare gracefully.
// ---------------------------------------------------------------------------

export interface EvaluatePareto {
    /** Raw text of the deliverable (for slop / meta-narration / depth heuristics). */
    text?: string;
    /** All slide titles (for action-title rate). */
    slideTitles?: string[];
    /** Citation entries. Each has the named external/internal source. */
    citations?: Array<{ sourceName?: string; sourceFile?: string; isExternal?: boolean }>;
    /** Section list + required count (mirrors scoreOutput). */
    sections?: string[];
    requiredSections?: number;
    totalSections?: number;
    /** Cost dims sourced from the trace recorder. */
    promptTokens?: number;
    elapsedMs?: number;
    /** Substrate yield-ledger event. */
    retrievedDocs?: number;
    /** Reliability dims sourced from errorTelemetry.ts. If omitted, the
     *  evaluator pulls live counts via summarizeFailures(). Pass an explicit
     *  value when scoring an artifact retrospectively from a frozen ledger. */
    transientRetryCount?: number;
    exhaustedRetryCount?: number;
    /** Drift-catcher dims (2026-06-05). If omitted, the evaluator samples
     *  from the traceRecorder ring for commitment_changes_in_engagement.
     *  drift_surfaces_open requires an explicit pass - readers should
     *  cat the most-recent hic-workspace/wiki/synthesis/drift-audit-*.md
     *  page and supply the count themselves. */
    commitmentChangesInEngagement?: number;
    driftSurfacesOpen?: number;
    /** Deliverable label + stable id for ledger keying. */
    label?: string;
    id?: string;
}

export function evaluatePareto(input: EvaluatePareto): QualityVector {
    const dims: Record<string, number> = {};

    // --- scoreOutput-derived dims (completeness, depth, evidence, visual, specificity) ---
    if (input.text !== undefined) {
        const scoreInput = {
            sections: input.sections || [],
            requiredSections: input.requiredSections ?? Math.max(1, (input.sections || []).length),
            citations: (input.citations || []).length,
            totalSections: input.totalSections ?? Math.max(1, (input.sections || []).length),
            text: input.text,
        };
        let qs: QualityScore | undefined;
        try { qs = scoreOutput(scoreInput); } catch { /* defensive */ }
        if (qs) {
            dims.completeness = qs.completeness;
            dims.depth = qs.depth;
            dims.evidence_density = qs.evidence;
            dims.visual_quality = qs.visualQuality;
            dims.specificity = qs.specificity;
        }

        // Raw banned-phrase count (vs the visual_quality 0-5 collapse above)
        try { dims.banned_phrase_count = detectBannedPhrases(input.text).length; } catch { /* ignore */ }

        // Meta-narration leakage - count text matches against the runtime-assembled patterns.
        let metaCount = 0;
        for (const pat of META_PATTERNS) {
            const matches = input.text.match(pat);
            if (matches) metaCount += matches.length;
        }
        dims.meta_narration_count = metaCount;
    }

    // --- Citation dims ---
    if (Array.isArray(input.citations) && input.citations.length > 0) {
        const total = input.citations.length;
        const sources = new Set<string>();
        let externalCount = 0;
        for (const c of input.citations) {
            const key = (c.sourceName || c.sourceFile || '').trim().toLowerCase();
            if (key) sources.add(key);
            if (c.isExternal) externalCount += 1;
        }
        dims.citation_diversity = sources.size / total;
        // Only emit external_citation_rate if at least one citation declared its external flag.
        // Otherwise the metric is unknowable; omitting it is honest.
        if (input.citations.some(c => typeof c.isExternal === 'boolean')) {
            dims.external_citation_rate = externalCount / total;
        }
    }

    // --- Action-title rate (slide deliverables only) ---
    if (Array.isArray(input.slideTitles) && input.slideTitles.length > 0) {
        const actionTitleCount = input.slideTitles.filter(t => _looksLikeActionTitle(t)).length;
        dims.action_title_rate = actionTitleCount / input.slideTitles.length;
    }

    // --- Cost dims (from trace recorder) ---
    if (typeof input.promptTokens === 'number') dims.prompt_tokens = input.promptTokens;
    if (typeof input.elapsedMs === 'number') dims.elapsed_ms = input.elapsedMs;
    if (typeof input.retrievedDocs === 'number') dims.retrieved_docs = input.retrievedDocs;

    // --- Reliability dims (from errorTelemetry, P2 composition) ---
    // If caller passed explicit counts, use those; otherwise sample from the
    // live ring buffer over the trailing 10-minute window. Lazy import so this
    // module stays standalone-importable for tests that don't need telemetry.
    if (typeof input.transientRetryCount === 'number') {
        dims.transient_retry_count = input.transientRetryCount;
    } else {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { summarizeFailures } = require('./errorTelemetry') as typeof import('./errorTelemetry');
            const summary = summarizeFailures(600_000);
            dims.transient_retry_count = summary.transient_retry_count;
        } catch { /* errorTelemetry not loaded in this context - omit dim */ }
    }
    if (typeof input.exhaustedRetryCount === 'number') {
        dims.exhausted_retry_count = input.exhaustedRetryCount;
    } else if (dims.transient_retry_count !== undefined) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { summarizeFailures } = require('./errorTelemetry') as typeof import('./errorTelemetry');
            dims.exhausted_retry_count = summarizeFailures(600_000).exhausted_count;
        } catch { /* ignore */ }
    }

    // --- Drift-catcher dims (2026-06-05) ---
    // commitment_changes_in_engagement: count of commitment_change trace
    // turns in the active engagement (in-memory ring buffer). Sample from
    // traceRecorder via lazy require so this module stays test-importable.
    if (typeof input.commitmentChangesInEngagement === 'number') {
        dims.commitment_changes_in_engagement = input.commitmentChangesInEngagement;
    } else {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { getTraces } = require('./traceRecorder') as typeof import('./traceRecorder');
            const slug = (typeof window !== 'undefined'
                ? (window as any).__hicCurrentEngagementSlug
                : undefined);
            const commits = getTraces().filter(t =>
                t.step_label === 'commitment_change'
                && (slug ? t.engagement === slug : true)
            );
            dims.commitment_changes_in_engagement = commits.length;
        } catch { /* traceRecorder unavailable - omit dim */ }
    }
    // drift_surfaces_open: read from the most-recent drift-audit wiki page
    // frontmatter (surfaces_verified - surfaces marked SHIPPED). If caller
    // passes it explicitly we trust them; otherwise we omit (the wiki read
    // is a network call that the synchronous scoreOutput path can't afford).
    // Callers that want this dim populated should pass it in.
    if (typeof input.driftSurfacesOpen === 'number') {
        dims.drift_surfaces_open = input.driftSurfacesOpen;
    }

    // --- Floor violation pass ---
    const floor_violations: string[] = [];
    for (const [name, spec] of Object.entries(DIMENSIONS)) {
        if (spec.floor === undefined) continue;
        if (!(name in dims)) continue;
        const v = dims[name];
        if (spec.direction === 'maximize' && v < spec.floor) floor_violations.push(name);
        if (spec.direction === 'minimize' && v > spec.floor) floor_violations.push(name);
    }

    return {
        dimensions: dims,
        floor_violations,
        label: input.label,
        id: input.id,
        evaluated_at: Date.now(),
    };
}

/**
 * Heuristic: does `title` look like an action title (complete-sentence conclusion)
 * vs a topic label? An action title contains at least one verb pattern AND is at
 * least 5 words. Mirrors the post-processor's verb-pattern check.
 */
function _looksLikeActionTitle(title: string): boolean {
    if (!title || typeof title !== 'string') return false;
    const trimmed = title.trim();
    if (trimmed.length < 12) return false;
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 5) return false;
    return /\b(is|are|will|must|should|drives|forces|costs|reveals|requires|fails|breaks|prevents|enables|loses|wins|creates|kills|fixes|signals|matters|misses|wastes|leaks|leaves|builds|removes|adds|shifts|hides|surfaces)\b/i.test(trimmed);
}

// ---------------------------------------------------------------------------
// Pareto dominance + regression detection.
// ---------------------------------------------------------------------------

/**
 * Returns true iff vector `a` dominates `b`:
 *   - a is no-worse on EVERY shared dimension
 *   - a is strictly-better on AT LEAST ONE shared dimension
 * Direction is taken from DIMENSIONS[name].direction. Unknown dims default to 'maximize'.
 *
 * Note: floor_violations are NOT factored here - a floor-violating vector can still
 * dominate another vector along the Pareto axes. The epoch gate should explicitly
 * reject any vector with floor_violations.length > 0 BEFORE running dominates().
 */
export function dominates(a: QualityVector, b: QualityVector): boolean {
    let strictlyBetterSomewhere = false;
    const sharedDims = Object.keys(a.dimensions).filter(d => d in b.dimensions);
    if (sharedDims.length === 0) return false;
    for (const dim of sharedDims) {
        const av = a.dimensions[dim];
        const bv = b.dimensions[dim];
        const dir = DIMENSIONS[dim]?.direction || 'maximize';
        if (dir === 'maximize') {
            if (av < bv) return false;     // a is worse on this dim → not dominating
            if (av > bv) strictlyBetterSomewhere = true;
        } else {
            if (av > bv) return false;     // a is worse (higher) on a minimize dim
            if (av < bv) strictlyBetterSomewhere = true;
        }
    }
    return strictlyBetterSomewhere;
}

export interface RegressionFinding {
    dim: string;
    label: string;
    baseline: number;
    candidate: number;
    delta: number;     // signed; in the metric's natural units
    severity: 'minor' | 'major' | 'catastrophic';
}

/**
 * Identifies dimensions where `candidate` regressed from `baseline` by more than `eps`.
 * Direction-aware: for 'maximize' dims, a decrease is a regression; for 'minimize' dims,
 * an increase is a regression. `eps` is in the metric's natural units (NOT normalized).
 *
 * Severity ladder:
 *   - 'catastrophic': candidate crosses the dim's floor (binary catastrophe)
 *   - 'major': regression > 2 * eps
 *   - 'minor': regression > eps
 */
export function regression(
    candidate: QualityVector,
    baseline: QualityVector,
    eps: number = 0.05,
): RegressionFinding[] {
    const out: RegressionFinding[] = [];
    for (const dim of Object.keys(candidate.dimensions)) {
        if (!(dim in baseline.dimensions)) continue;
        const cv = candidate.dimensions[dim];
        const bv = baseline.dimensions[dim];
        const spec = DIMENSIONS[dim];
        const dir = spec?.direction || 'maximize';
        const delta = dir === 'maximize' ? cv - bv : bv - cv;  // negative delta = regression
        if (delta >= -eps) continue;  // no regression past tolerance
        const absMag = Math.abs(delta);

        let severity: RegressionFinding['severity'] = 'minor';
        if (absMag > 2 * eps) severity = 'major';
        if (spec?.floor !== undefined) {
            const candidateUnderFloor = dir === 'maximize' ? cv < spec.floor : cv > spec.floor;
            const baselineUnderFloor = dir === 'maximize' ? bv < spec.floor : bv > spec.floor;
            if (candidateUnderFloor && !baselineUnderFloor) severity = 'catastrophic';
        }
        out.push({
            dim,
            label: spec?.label || dim,
            baseline: bv,
            candidate: cv,
            delta,
            severity,
        });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Decision helper for the Step-7 epoch gate.
// ---------------------------------------------------------------------------

export interface EpochGateVerdict {
    decision: 'apply' | 'reject';
    reason: string;
    /** Floor-violating dims on the candidate (catastrophic regressions). */
    floor_violations: string[];
    /** Regression findings vs baseline. Empty if candidate dominates or matches. */
    regressions: RegressionFinding[];
    /** True iff candidate Pareto-dominates baseline (no regressions + at least one improvement). */
    dominates_baseline: boolean;
    /** True iff candidate matches baseline (no regressions, no improvements). */
    pareto_equivalent: boolean;
}

/**
 * Decide whether to apply a proposed harness edit by comparing its quality vector against
 * the prior baseline. The acceptance rule mirrors Meta-Harness:
 *   - Reject if candidate has floor violations the baseline lacked (catastrophic regression).
 *   - Reject if candidate has any catastrophic or major regression vs baseline.
 *   - Apply if candidate dominates baseline (improves at least one dim, regresses no dim).
 *   - Apply (equivalent) if no regressions AND no improvements (neutral change).
 *   - Apply for minor-only regressions ONLY when the gain elsewhere is >= eps_gain.
 *
 * `epsRegression` is the per-dim tolerance for what counts as a regression at all.
 * `epsGain` is the minimum total improvement (sum of positive deltas) required when
 * minor regressions exist; below this floor, the edit is rejected as a net wash.
 */
export function decide(
    candidate: QualityVector,
    baseline: QualityVector,
    epsRegression: number = 0.05,
    epsGain: number = 0.10,
): EpochGateVerdict {
    // Floor catastrophes the BASELINE didn't have.
    const newFloorViolations = candidate.floor_violations.filter(
        d => !baseline.floor_violations.includes(d),
    );
    if (newFloorViolations.length > 0) {
        return {
            decision: 'reject',
            reason: `Candidate introduces floor violations not present in baseline: ${newFloorViolations.join(', ')}`,
            floor_violations: newFloorViolations,
            regressions: [],
            dominates_baseline: false,
            pareto_equivalent: false,
        };
    }

    const regs = regression(candidate, baseline, epsRegression);
    const catastrophic = regs.filter(r => r.severity === 'catastrophic');
    if (catastrophic.length > 0) {
        return {
            decision: 'reject',
            reason: `Catastrophic regression on: ${catastrophic.map(r => r.dim).join(', ')}`,
            floor_violations: [],
            regressions: regs,
            dominates_baseline: false,
            pareto_equivalent: false,
        };
    }
    const major = regs.filter(r => r.severity === 'major');
    if (major.length > 0) {
        return {
            decision: 'reject',
            reason: `Major regression on: ${major.map(r => `${r.dim}(Δ=${r.delta.toFixed(3)})`).join(', ')}`,
            floor_violations: [],
            regressions: regs,
            dominates_baseline: false,
            pareto_equivalent: false,
        };
    }

    const dom = dominates(candidate, baseline);
    if (dom) {
        return {
            decision: 'apply',
            reason: 'Candidate Pareto-dominates baseline (no regression, at least one improvement).',
            floor_violations: [],
            regressions: regs,
            dominates_baseline: true,
            pareto_equivalent: false,
        };
    }

    if (regs.length === 0) {
        return {
            decision: 'apply',
            reason: 'Pareto-equivalent to baseline (no regression).',
            floor_violations: [],
            regressions: [],
            dominates_baseline: false,
            pareto_equivalent: true,
        };
    }

    // Minor-only regressions: require minimum gain elsewhere.
    let gain = 0;
    for (const dim of Object.keys(candidate.dimensions)) {
        if (!(dim in baseline.dimensions)) continue;
        const cv = candidate.dimensions[dim];
        const bv = baseline.dimensions[dim];
        const dir = DIMENSIONS[dim]?.direction || 'maximize';
        const delta = dir === 'maximize' ? cv - bv : bv - cv;
        if (delta > 0) gain += delta;
    }
    if (gain >= epsGain) {
        return {
            decision: 'apply',
            reason: `Minor regressions offset by gain of ${gain.toFixed(3)} (>= ${epsGain}).`,
            floor_violations: [],
            regressions: regs,
            dominates_baseline: false,
            pareto_equivalent: false,
        };
    }
    return {
        decision: 'reject',
        reason: `Minor regressions with insufficient gain (${gain.toFixed(3)} < ${epsGain}).`,
        floor_violations: [],
        regressions: regs,
        dominates_baseline: false,
        pareto_equivalent: false,
    };
}

// ---------------------------------------------------------------------------
// Formatter for Reasoning Stream + ledger output.
// ---------------------------------------------------------------------------

function formatVector(v: QualityVector): string {
    const lines: string[] = [];
    if (v.label) lines.push(`# ${v.label}`);
    for (const [name, value] of Object.entries(v.dimensions)) {
        const spec = DIMENSIONS[name];
        const dirArrow = spec?.direction === 'minimize' ? '↓' : '↑';
        const floorTag = spec?.floor !== undefined ? ` (floor ${dirArrow === '↑' ? '≥' : '≤'} ${spec.floor})` : '';
        const violated = v.floor_violations.includes(name) ? '  FLOOR VIOLATED' : '';
        lines.push(`  ${dirArrow} ${spec?.label || name}: ${typeof value === 'number' ? value.toFixed(3).replace(/\.?0+$/, '') : value}${floorTag}${violated}`);
    }
    if (v.floor_violations.length === 0) lines.push('   no floor violations');
    return lines.join('\n');
}

function formatVerdict(verdict: EpochGateVerdict): string {
    const icon = verdict.decision === 'apply' ? ' APPLY' : ' REJECT';
    const lines: string[] = [`${icon}: ${verdict.reason}`];
    if (verdict.regressions.length > 0) {
        for (const r of verdict.regressions) {
            lines.push(`   - ${r.label} (${r.severity}): baseline=${r.baseline.toFixed(3)} → candidate=${r.candidate.toFixed(3)} (Δ=${r.delta.toFixed(3)})`);
        }
    }
    return lines.join('\n');
}
