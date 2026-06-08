/**
 * Reinforcement Inference (RI) - Anchored re-asks for low-confidence outputs.
 *
 * The R2/R3 pillar of plans/reinforcement-inference-uplift.md. Before this
 * module existed, the 5 regen sites in geminiService.ts threw away the prior
 * answer and re-asked the model from scratch - exactly the anti-pattern the
 * RI paper identifies as the load-bearing problem.
 *
 * This module exports `reinforceIfUncertain`: a wrapper that takes the prior
 * answer + its selfAssessment + the failures, and re-asks the model with the
 * prior answer pinned in the prompt so the model only revises the weak parts.
 *
 * Created 2026-05-23 to close the gap surfaced by the honest audit at
 * plans/hic-honest-audit-and-remediation-2026-05-23.md.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface UncertaintySignal {
    /** Self-assessed overall confidence (HIGH / MEDIUM / LOW). Lower = stronger trigger. */
    overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    /** Claims the model flagged as least defensible. */
    leastDefensibleClaims: string[];
    /** Calibration mismatch - fraction of HIGH-confidence claims that fail evidence checks. */
    calibrationMismatch?: number;
    /** Validation failures from the deliverable schema check. */
    validationFailures: string[];
    /** Composite score 0..1; > TRIGGER_SCORE means reinforce. */
    score?: number;
}

const TRIGGER_SCORE = 0.4; // any signal at or above this score triggers reinforcement

export function computeUncertaintyScore(signal: Omit<UncertaintySignal, 'score'>): number {
    let score = 0;
    if (signal.overallConfidence === 'LOW') score += 0.4;
    else if (signal.overallConfidence === 'MEDIUM') score += 0.2;
    if ((signal.leastDefensibleClaims || []).length > 0) {
        score += Math.min(0.3, (signal.leastDefensibleClaims.length * 0.1));
    }
    if (typeof signal.calibrationMismatch === 'number' && signal.calibrationMismatch > 0) {
        score += Math.min(0.3, signal.calibrationMismatch);
    }
    if ((signal.validationFailures || []).length > 0) {
        score += Math.min(0.3, signal.validationFailures.length * 0.08);
    }
    return Math.min(1.0, score);
}

export function shouldReinforce(signal: Omit<UncertaintySignal, 'score'>): boolean {
    return computeUncertaintyScore(signal) >= TRIGGER_SCORE;
}

export interface ReinforceInput<T> {
    /** What the model produced last time. Anchored into the re-ask prompt. */
    priorAnswer: T;
    /** Signal that triggered reinforcement. */
    signal: Omit<UncertaintySignal, 'score'>;
    /** Deliverable name for prompt clarity (e.g., "PRD", "Roadmap"). */
    deliverableName: string;
    /** Original prompt to use as the base - re-asks build on this. */
    basePrompt: string;
    /** Append the anchored prior answer + failures into the prompt. */
    buildReAsk?: (basePrompt: string, prior: T, signal: Omit<UncertaintySignal, 'score'>) => string;
}

/**
 * Build the anchored re-ask prompt that keeps the prior answer's correct
 * parts and only revises what the signal flagged.
 */
export function buildAnchoredReAsk<T>(input: ReinforceInput<T>): string {
    if (input.buildReAsk) return input.buildReAsk(input.basePrompt, input.priorAnswer, input.signal);

    const priorAsString = typeof input.priorAnswer === 'string'
        ? input.priorAnswer
        : JSON.stringify(input.priorAnswer, null, 2).slice(0, 24000);

    const failuresBlock = (input.signal.validationFailures || []).length > 0
        ? `\nVALIDATION FAILURES (must address ALL):\n${input.signal.validationFailures.map(f => `  - ${f}`).join('\n')}`
        : '';

    const leastDefensibleBlock = (input.signal.leastDefensibleClaims || []).length > 0
        ? `\nMODEL'S OWN FLAGGED WEAK CLAIMS (re-check these first):\n${input.signal.leastDefensibleClaims.map(c => `  - "${c}"`).join('\n')}`
        : '';

    return `${input.basePrompt}

=== REINFORCEMENT PASS: KEEP-AND-REVISE ===
The prior generation produced the answer below. Do NOT regenerate from scratch - KEEP every claim that already has solid evidence, and REVISE only the specific items flagged below. Output the FULL deliverable in the same schema, with the kept items unchanged and the revised items strengthened.

PRIOR ANSWER (JSON of the deliverable):
${priorAsString}
${failuresBlock}
${leastDefensibleBlock}

REINFORCEMENT INSTRUCTIONS:
1. For each flagged claim, find the matching item in the prior answer and re-check its evidence basis + citations against the corpus. If you cannot evidence it from the corpus, REMOVE the claim and adjust the surrounding narrative.
2. For each validation failure, fix the specific schema/coverage gap (e.g., add the missing field, expand the thin section, add the required citation count).
3. Preserve all items the prior answer got RIGHT. Don't relitigate evidence that is already cited from named sources.
4. Maintain the same output JSON shape as the prior answer.
=== END REINFORCEMENT PASS ===
`;
}

/**
 * Append a row to the uncertainty ledger (wiki/synthesis/uncertainty-ledger.md).
 * This is the P2.2 ledger surface - keeps a forever record of every reinforcement
 * pass so the learning engine can detect patterns ("this deliverable type
 * consistently triggers RI on the same claim").
 */
export async function appendUncertaintyLedger(entry: {
    deliverableName: string;
    timestamp: string;
    triggerScore: number;
    overallConfidence: string;
    leastDefensibleClaims: string[];
    validationFailures: string[];
    resolution: 'reinforced' | 'failed' | 'accepted-as-is';
    notes?: string;
}): Promise<boolean> {
    try {
        const markdown = `\n## ${entry.timestamp} | ${entry.deliverableName}\n` +
            `- trigger_score: ${entry.triggerScore.toFixed(2)}\n` +
            `- overall_confidence: ${entry.overallConfidence}\n` +
            `- resolution: ${entry.resolution}\n` +
            (entry.leastDefensibleClaims.length > 0 ? `- flagged_claims:\n${entry.leastDefensibleClaims.map(c => `  - "${c.slice(0, 200)}"`).join('\n')}\n` : '') +
            (entry.validationFailures.length > 0 ? `- validation_failures:\n${entry.validationFailures.map(f => `  - ${f}`).join('\n')}\n` : '') +
            (entry.notes ? `- notes: ${entry.notes}\n` : '');
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/uncertainty-ledger.md', content: markdown }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

/**
 * High-level helper that callers invoke instead of `return this.generateX(failures.join('. '))`.
 *
 * Usage in geminiService.ts:
 *
 * ```ts
 * if (!validation.valid && !feedback) {
 *     const sig = {
 *         overallConfidence: assessment?.overallConfidence || 'MEDIUM',
 *         leastDefensibleClaims: assessment?.leastDefensibleClaims || [],
 *         validationFailures: validation.failures,
 *     };
 *     if (shouldReinforce(sig)) {
 *         // Use anchored re-ask instead of from-scratch
 *         const reAskPrompt = buildAnchoredReAsk({
 *             priorAnswer: result,
 *             signal: sig,
 *             deliverableName: 'roadmap',
 *             basePrompt: originalPrompt,
 *         });
 *         // ... run reAskPrompt through executeStep
 *         await appendUncertaintyLedger({...});
 *     }
 * }
 * ```
 *
 * For backwards compatibility with the legacy regen pattern that just calls
 * `this.generateX(feedbackString)`, callers can keep that path AND wrap the
 * feedback string with this helper to anchor the prior answer:
 */
export function buildReinforceFeedbackString<T>(opts: {
    priorAnswer: T;
    failures: string[];
    leastDefensibleClaims?: string[];
    deliverableName: string;
}): string {
    const priorAsString = typeof opts.priorAnswer === 'string'
        ? opts.priorAnswer
        : JSON.stringify(opts.priorAnswer, null, 2).slice(0, 16000);

    const failuresBlock = opts.failures.length > 0
        ? `Validation failures to address: ${opts.failures.join('; ')}`
        : '';
    const flaggedBlock = (opts.leastDefensibleClaims || []).length > 0
        ? `Prior model self-flagged weak claims: ${(opts.leastDefensibleClaims || []).map(c => `"${c}"`).join('; ')}`
        : '';

    return `${failuresBlock} ${flaggedBlock}

REINFORCEMENT MODE - Do NOT regenerate from scratch. Use the prior answer below as the starting point, and revise ONLY the items flagged by the failures and weak claims above. Keep every item already well-evidenced unchanged.

PRIOR ANSWER (anchor to this - do not lose its correct items):
${priorAsString}`.trim();
}
