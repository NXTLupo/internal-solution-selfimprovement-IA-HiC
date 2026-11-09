// chainScores.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-2 E7)
//
// Every artifact-chain stage becomes a SCORE in 0..1 with a registered threshold (the
// `everyone_ate` pattern from the ADK talk: a checker needs a rule and a pass bar, not a
// binary flag). Before this, `artifactChain.pass` was true unless a stage errored or
// returned `partial + narrow_scope`; provenance, prose, deck-quality and exhibit findings
// were marked `continue` and so never counted. Now each stage reports a number, the
// registry says what passes, and the chain's verdict is the conjunction over the
// BLOCKING stages.

import type { ChainResult } from './artifactChain';
import { thresholdFor, getJudge, judgeMayBlock } from './judgeRegistry';

export type StageScores = Record<string, number>;

function clamp01(x: number): number {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
}

function envelopeScore(result: ChainResult<any>, stage: string): number {
    const env = result.envelopes.find(e => e.stepId === `chain:${stage}`);
    if (!env) return 1;
    if (env.status === 'error') return 0;
    if (env.status === 'partial') return 0.5;
    return 1;
}

/** Compute every stage's score from the reports the chain already produced. Pure. */
export function computeStageScores(result: ChainResult<any>): StageScores {
    const slides = Math.max(1, result.slides.length);
    const s: StageScores = {};
    s.normalize = envelopeScore(result, 'normalize');
    s.lexical = clamp01(1 - (result.slopFindings?.length || 0) / (slides * 2));
    s.titles = result.titleReport ? clamp01(1 - result.titleReport.findings.length / Math.max(1, result.titleReport.checked)) : 1;
    if (result.bindReport) {
        const bound = result.bindReport.bound.length, unbound = result.bindReport.unbound.length;
        s.bindPointers = bound + unbound === 0 ? 1 : clamp01(bound / (bound + unbound));
    } else s.bindPointers = 1;
    s.provenance = envelopeScore(result, 'provenance');
    s.claims = result.claimReport ? clamp01(1 - result.claimReport.blocking / Math.max(1, result.claimReport.rowsChecked)) : 1;
    if (result.slotReport) {
        const r = result.slotReport;
        s.evidenceSlots = r.planAbsent
            ? clamp01(1 - r.violations.length / Math.max(1, r.fills.length + r.violations.length))
            : clamp01(r.p0Coverage);
    } else s.evidenceSlots = 1;
    s.exhibits = envelopeScore(result, 'exhibits');
    s.prose = result.proseReport ? clamp01(result.proseReport.overall) : 1;
    if (result.gradeReport) {
        const g = result.gradeReport;
        s.grade = clamp01(1 - (g.unverified.length + g.superficial.length) / Math.max(1, g.claims.length));
    } else s.grade = 1;
    s.renderPlan = envelopeScore(result, 'renderPlan');
    s.deckQuality = result.deckQualityReport ? clamp01(1 - result.deckQualityReport.findings.length / 5) : 1;
    return s;
}

export interface ScoredVerdict {
    scores: StageScores;
    /** Stages whose score is below the registered threshold. */
    below: Array<{ stage: string; score: number; threshold: number; blocking: boolean }>;
    /** True when every BLOCKING stage meets its threshold. */
    pass: boolean;
}

export function scoreChain(result: ChainResult<any>): ScoredVerdict {
    const scores = computeStageScores(result);
    const below: ScoredVerdict['below'] = [];
    for (const [stage, score] of Object.entries(scores)) {
        const id = `chain:${stage}`;
        const threshold = thresholdFor(id, 0.8);
        if (score < threshold) below.push({ stage, score, threshold, blocking: judgeMayBlock(getJudge(id)) });
    }
    return { scores, below, pass: !below.some(b => b.blocking) };
}
