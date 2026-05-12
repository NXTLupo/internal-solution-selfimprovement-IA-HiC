/**
 * Verbalized Confidence — the R1 layer of the Reinforcement-Inference uplift.
 *
 * Reusable utilities for asking any deliverable-generating model call to
 * (a) emit a per-claim confidence on each atomic output it produces, and
 * (b) emit a top-level `selfAssessment` envelope naming which claims it
 * itself would expect a senior reviewer to push back on.
 *
 * This is the entropy proxy that makes Reinforcement Inference (R2/R3)
 * possible without logprobs. We do not have token-level distributions in
 * production for Gemini, Claude, or OpenAI chat completions. We do have
 * a model that can verbalize a metacognitive judgment when asked.
 *
 * The directive is a free-standing string. It is prompt-system-agnostic —
 * any Gemini, Claude, or OpenAI call can append it to its existing prompt.
 *
 * Sites that adopt this in R1:
 *   - Theme synthesis (Pass 1 BREADTH)             — generateThemes()
 *   - Cross-cutting synthesis                       — generateCrossCuttingSynthesis()
 *   - Persona roster (Phase A) + enrichment (Phase B) — generatePersonas()
 *   - Recommendations                               — generateRecommendations()
 *   - Journey map, PRD, roadmap, gap analysis,
 *     competitive analysis, strategic report        — corresponding generate*()
 *   - Prototype Stage 1-4                           — services/prototypeBuilder.ts
 *
 * See `.claude/skills/reinforcement-inference/SKILL.md` for the technique.
 * See `humans-in-control-research/plans/reinforcement-inference-uplift.md`
 * for the rollout plan and acceptance criteria.
 */

import type { ClaimConfidence, SelfAssessment } from '../types';

// --- Directive builder -------------------------------------------------------

export interface VerbalizedConfidenceOptions {
    /**
     * The kind of artifact being generated. Used to phrase the prompt
     * naturally and to log calibration distribution per surface.
     */
    deliverable: string;
    /**
     * Singular noun for atomic claims in the payload — "theme", "persona",
     * "recommendation", "slide", "stage decision", etc. Used in the rationale
     * shape ("identify the 1-3 themes you would expect a senior partner to
     * push back on").
     */
    claimNoun: string;
    /**
     * The plural form of claimNoun — "themes", "personas", etc.
     */
    claimNounPlural: string;
    /**
     * Maximum fraction of claims allowed to carry `confidence: 'high'`.
     * Defaults to 0.60. The directive forces a sub-uniform distribution so
     * the model cannot collapse to "everything is high." The paper's
     * uncertainty trigger is meaningless if calibration is broken; this is
     * the calibration discipline.
     */
    maxHighFraction?: number;
    /**
     * Per-deliverable extension axes when the simple high/medium/low scale is
     * not specific enough — e.g. prototype Stage 3 wants visual_originality,
     * brand_fidelity, hierarchy_clarity, accessibility. When provided, the
     * directive prompts the model for one rating per axis instead of (or in
     * addition to) the single overall scale.
     */
    axes?: Array<{ key: string; description: string }>;
}

const DEFAULT_MAX_HIGH_FRACTION = 0.60;

export function buildVerbalizedConfidenceDirective(opts: VerbalizedConfidenceOptions): string {
    const { deliverable, claimNoun, claimNounPlural, axes } = opts;
    const maxHighFraction = opts.maxHighFraction ?? DEFAULT_MAX_HIGH_FRACTION;

    const axisBlock = axes && axes.length > 0
        ? `\nPer-axis confidence (override the single high/medium/low scale; emit one rating per axis named below):\n${axes.map(a => `  - ${a.key}: ${a.description}`).join('\n')}\n`
        : '';

    return `=== VERBALIZED CONFIDENCE DIRECTIVE ===

For this ${deliverable} generation, emit two additional things alongside the payload:

1. PER-CLAIM CONFIDENCE
   On every ${claimNoun} you produce, attach a "confidence" field with value
   "high" | "medium" | "low" and a "confidenceRationale" (<= 12 words) naming
   the SPECIFIC reason for that score.

     - "high"   = you would defend this ${claimNoun} against a skeptical senior partner
     - "medium" = the ${claimNoun} is sound but at least one supporting claim is reaching
     - "low"    = the ${claimNoun} extrapolates beyond the evidence, or relies on a single
                  source, or required a guess on a load-bearing detail
${axisBlock}
2. SELF-ASSESSMENT ENVELOPE
   After the payload, append a top-level "selfAssessment" object:

     {
       "overallConfidence": "high" | "medium" | "low",
       "leastDefensibleClaims": [ <1-3 short descriptors or IDs of the ${claimNounPlural}
                                   you would most expect senior pushback on> ],
       "rationale": "<1-2 sentences naming the SPECIFIC weakness — evidence thin,
                     segment overgeneralized, citation indirect, claim extrapolated.
                     Do NOT use generic phrases (\\"limited data\\", \\"more research
                     needed\\") and do NOT use QA-annotation strings (\\"evidence gap\\",
                     \\"TBD\\", \\"[needs baseline]\\") — those are stripped by the
                     post-processor and degrade output trust.>"
     }

   leastDefensibleClaims MAY be an empty array, but ONLY if you genuinely
   cannot identify a single weakest link. Across a typical ${deliverable}, that
   is rare — most have a weakest claim.

CALIBRATION DISCIPLINE (the load-bearing rule):
   No more than ${Math.round(maxHighFraction * 100)}% of your ${claimNounPlural} may carry
   "confidence": "high". If you would naturally rate every ${claimNoun} as "high",
   you are not calibrated — most synthesis tasks have weaker and stronger
   claims, and an honest distribution will span the scale. Force yourself to
   pick the relatively weakest ${claimNounPlural} and mark them "medium" or "low",
   even if their absolute quality is acceptable.

This is not a hedging directive. You are not being asked to be uncertain about
strong claims. You ARE being asked to surface YOUR OWN doubt where it exists
so the downstream system can re-ask the weakest claims with the prior answer
anchored. That second pass is what materially improves output quality. If your
self-assessment collapses to "everything is high", the second pass never fires
and the quality gain is forfeited.

=== END VERBALIZED CONFIDENCE DIRECTIVE ===
`;
}

// --- Calibration logging -----------------------------------------------------

export interface CalibrationSnapshot {
    deliverable: string;
    timestamp: string;
    claimCount: number;
    distribution: {
        high: number;
        medium: number;
        low: number;
        missing: number;          // claims that emitted no confidence field
    };
    highFraction: number;          // 0..1
    overallConfidence?: ClaimConfidence;
    leastDefensibleCount: number;
    rationaleLength: number;
    calibrationStatus: 'calibrated' | 'collapsed-high' | 'no-data';
}

/**
 * Inspect a generated payload's confidence distribution. Logs a one-line
 * summary to the console and returns a structured snapshot for any caller
 * that wants to persist it (eventually: the wiki uncertainty ledger).
 *
 * `claims` accepts any array of objects shaped like { confidence?: 'high'|... }.
 * Unknown shapes are silently treated as missing.
 */
export function inspectCalibration(
    deliverable: string,
    claims: Array<{ confidence?: ClaimConfidence } | unknown>,
    envelope?: SelfAssessment,
    maxHighFraction: number = DEFAULT_MAX_HIGH_FRACTION,
): CalibrationSnapshot {
    const distribution = { high: 0, medium: 0, low: 0, missing: 0 };
    for (const c of claims) {
        const conf = (c as any)?.confidence as ClaimConfidence | undefined;
        if (conf === 'high') distribution.high++;
        else if (conf === 'medium') distribution.medium++;
        else if (conf === 'low') distribution.low++;
        else distribution.missing++;
    }
    const scored = distribution.high + distribution.medium + distribution.low;
    const highFraction = scored > 0 ? distribution.high / scored : 0;

    let calibrationStatus: CalibrationSnapshot['calibrationStatus'] = 'no-data';
    if (scored === 0) calibrationStatus = 'no-data';
    else if (highFraction > maxHighFraction + 0.10) calibrationStatus = 'collapsed-high'; // 10pp grace
    else calibrationStatus = 'calibrated';

    const snapshot: CalibrationSnapshot = {
        deliverable,
        timestamp: new Date().toISOString(),
        claimCount: claims.length,
        distribution,
        highFraction,
        overallConfidence: envelope?.overallConfidence,
        leastDefensibleCount: envelope?.leastDefensibleClaims?.length ?? 0,
        rationaleLength: envelope?.rationale?.length ?? 0,
        calibrationStatus,
    };

    const tag = calibrationStatus === 'calibrated' ? 'OK' : calibrationStatus === 'collapsed-high' ? 'COLLAPSED' : 'NO-DATA';
    console.log(
        `[VerbalizedConfidence:${deliverable}] calibration=${tag} ` +
        `claims=${snapshot.claimCount} ` +
        `dist={high:${distribution.high},med:${distribution.medium},low:${distribution.low},missing:${distribution.missing}} ` +
        `highFrac=${(highFraction * 100).toFixed(0)}% ` +
        `overall=${envelope?.overallConfidence ?? 'n/a'} ` +
        `leastDef=${snapshot.leastDefensibleCount}`
    );
    if (calibrationStatus === 'collapsed-high') {
        console.warn(
            `[VerbalizedConfidence:${deliverable}] calibration COLLAPSED — ` +
            `${(highFraction * 100).toFixed(0)}% of ${claims.length} ${deliverable} claims came back "high" ` +
            `(max allowed ${(maxHighFraction * 100).toFixed(0)}% + 10pp grace). ` +
            `The directive's calibration rule is being ignored. ` +
            `If this persists, harden the directive or accept that downstream RI triggers will be silent here.`
        );
    }
    return snapshot;
}

// --- Sanitization ------------------------------------------------------------

/**
 * Defensive scrub of the self-assessment rationale against the QA-annotation
 * patterns that .claude/CLAUDE.md forbids in user-facing fields. The rationale
 * is NOT user-facing (it's a meta field consumed by the RI trigger), but the
 * post-processor may surface it in debug views, so we keep it clean.
 */
const QA_ANNOTATION_PATTERNS = [
    /\bevidence\s+gap\b/gi,
    /\bTBD\b/g,
    /\[\s*needs\s+baseline\s*\]/gi,
    /\bbaseline\s+TBD\b/gi,
    /\bmore\s+research\s+needed\b/gi,
    /\bfurther\s+investigation\s+required\b/gi,
    /\badditional\s+research\s+needed\b/gi,
    /\bdue\s+to\s+limited\s+data\b/gi,
    /\bin\s+the\s+absence\s+of\b/gi,
    /\bpending\s+additional\s+research\b/gi,
];

export function sanitizeRationale(rationale: string | undefined): string {
    if (!rationale || typeof rationale !== 'string') return '';
    let out = rationale;
    for (const pat of QA_ANNOTATION_PATTERNS) {
        out = out.replace(pat, '');
    }
    // Collapse double spaces and trim
    return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Normalize a raw model self-assessment into the strict SelfAssessment shape.
 * Drops malformed fields silently and returns undefined if the input is
 * non-object or missing all required fields — callers should treat that as
 * "no self-assessment produced this run" and skip RI triggering.
 */
export function normalizeSelfAssessment(raw: unknown): SelfAssessment | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const overall = r.overallConfidence;
    if (overall !== 'high' && overall !== 'medium' && overall !== 'low') return undefined;
    const leastDefensible = Array.isArray(r.leastDefensibleClaims)
        ? (r.leastDefensibleClaims as unknown[]).filter(s => typeof s === 'string').slice(0, 3) as string[]
        : [];
    const rationale = sanitizeRationale(typeof r.rationale === 'string' ? r.rationale : '');
    return {
        overallConfidence: overall as ClaimConfidence,
        leastDefensibleClaims: leastDefensible,
        rationale,
    };
}
