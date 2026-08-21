/**
 * AIR POST-CHAIN RECORD (2026-08-21 audit of the 2026-08-20 runs)
 *
 * The audit of the three `#slides` runs on 2026-08-20 found the sharpest bug of
 * the whole transfer, and it was mine: **AIR records the model's RAW output and
 * nothing after it.** `emitDeliverable` wraps the generation call itself, so
 * `air.buildPayload` sees the text the model returned. Every post-generation
 * improvement is therefore invisible to the durable record:
 *
 *   - the lexical scrub,
 *   - the provenance relabeling,
 *   - the evidence-slot narrowing,
 *   - the repair pass (which on the 11:22 run rewrote 5 fields and took
 *     violations from 4 to 0).
 *
 * Worse, `qualityReport` reported `deterministicFailures: []` on a deck the chain
 * had simultaneously refused with four evidence violations. Anything reading AIR
 * (the epoch proposer, the pareto evaluator, SkillOpt rollout mining) sees a
 * clean record of an artifact that was not clean. SkillOpt in particular would
 * be training on the unrepaired text WITH a passing grade attached.
 *
 * The plan's own principle was "every artifact rides AIR; nothing new is invented
 * as a parallel record", and the chain violated it by living in console logs and
 * React state. This module is the fix.
 *
 * DESIGN NOTE: the generated payload is NOT overwritten. AIR keeps
 * `artifactPayload` as generated and gains `shippedPayload` plus the chain
 * verdicts, so the record carries the DIFF. That diff is the most valuable
 * training signal in the system: it is a labeled pair of (what the model wrote,
 * what the gates made it say) for every run.
 */

import type { ChainResult } from './artifactChain';
import type { RepairResult } from './artifactRepair';

const PROXY_BASE = (import.meta as any)?.env?.VITE_PROXY_BASE || 'http://127.0.0.1:5012';

export interface EmittedAirRef {
    runId: string;
    artifactId: string;
    artifactType: string;
}

/**
 * The last AIR this page emitted. Same projection pattern as the durable
 * artifacts store: the emitter records the id when it writes, the post-chain
 * patcher reads it, and nothing has to guess an id from a timestamp (the AIR id
 * and the chat message id differ by a few milliseconds, so deriving one from the
 * other would be a coin flip).
 */
let _lastAir: EmittedAirRef | null = null;

export function noteEmittedAir(ref: EmittedAirRef): void {
    _lastAir = ref;
}

export function readLastEmittedAir(): EmittedAirRef | null {
    return _lastAir;
}

export interface PostChainRecord {
    /** Per-stage decision fields, exactly as the chain recorded them. */
    chainTrace: Record<string, unknown>[];
    chainPass: boolean;
    evidence: {
        p0Coverage: number;
        violations: Array<{ sectionId: string; field: string; kind: string; claim: string }>;
    } | null;
    prose: { overall: number; concerns: Array<{ id: string; score: number }> } | null;
    grade: {
        factualClaims: number;
        unverified: number;
        superficial: number;
        rubricCritique: string[];
    } | null;
    repair: {
        rounds: number;
        fieldsEdited: number;
        violationsBefore: number;
        violationsAfter: number;
        stopReason?: string;
    } | null;
    /** Deterministic pointer binding: what the runtime attached, and what it refused. */
    binding: {
        bound: number;
        unbound: number;
        byStrategy: Record<string, number>;
        pointers: string[];
    } | null;
    /** Layout quality: exhibit fit, archetype variety, cross-deck convergence. */
    deckQuality: {
        distinctArchetypes: number;
        contentRatio: number;
        findings: Array<{ kind: string; template?: string; detail: string }>;
    } | null;
    /** The fences the user actually received, when the chain changed them. */
    shippedPayload?: unknown;
}

/** Build the record from the chain (and optional repair) result. */
export function buildPostChainRecord<T>(
    chain: ChainResult<T>,
    repair?: RepairResult<T> | null,
    shippedPayload?: unknown,
): PostChainRecord {
    const final = repair?.finalChain || chain;
    return {
        chainTrace: final.trace,
        chainPass: final.pass,
        evidence: final.slotReport ? {
            p0Coverage: Number(final.slotReport.p0Coverage.toFixed(3)),
            violations: final.slotReport.violations.map(v => ({
                sectionId: v.sectionId, field: v.field, kind: v.kind, claim: v.claim.slice(0, 200),
            })),
        } : null,
        prose: final.proseReport ? {
            overall: Number(final.proseReport.overall.toFixed(3)),
            concerns: final.proseReport.concerns.map(c => ({ id: c.id, score: Number(c.score.toFixed(3)) })),
        } : null,
        grade: final.gradeReport ? {
            factualClaims: final.gradeReport.claims.filter(c => c.type === 'factual').length,
            unverified: final.gradeReport.unverified.length,
            superficial: final.gradeReport.superficial.length,
            rubricCritique: final.gradeReport.rubricCritique,
        } : null,
        binding: final.bindReport ? {
            bound: final.bindReport.bound.length,
            unbound: final.bindReport.unbound.length,
            byStrategy: final.bindReport.bound.reduce((acc, b) => {
                acc[b.strategy] = (acc[b.strategy] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            pointers: Array.from(new Set(final.bindReport.bound.map(b => b.pointer))).slice(0, 20),
        } : null,
        deckQuality: final.deckQualityReport ? {
            distinctArchetypes: final.deckQualityReport.distinctArchetypes,
            contentRatio: final.deckQualityReport.contentRatio,
            findings: final.deckQualityReport.findings.map(f => ({ kind: f.kind, template: f.template, detail: f.detail })),
        } : null,
        repair: repair && repair.rounds.length ? {
            rounds: repair.rounds.length,
            fieldsEdited: repair.rounds.reduce((a, r) => a + r.fieldsEdited, 0),
            violationsBefore: chain.slotReport?.violations.length ?? 0,
            violationsAfter: repair.finalChain.slotReport?.violations.length ?? 0,
            stopReason: repair.stopReason,
        } : null,
        ...(shippedPayload !== undefined ? { shippedPayload } : {}),
    };
}

/**
 * Patch the emitted AIR with what happened AFTER generation. Fire-and-forget and
 * non-fatal: a failed patch leaves the original record intact, which is strictly
 * better than blocking the user's deck on a bookkeeping write.
 */
export async function patchAirWithPostChain(
    record: PostChainRecord,
    ref: EmittedAirRef | null = readLastEmittedAir(),
): Promise<{ patched: boolean; path?: string; error?: string }> {
    if (!ref) return { patched: false, error: 'no emitted AIR to patch' };
    try {
        const resp = await fetch(`${PROXY_BASE}/api/air/patch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runId: ref.runId,
                artifactId: ref.artifactId,
                patch: {
                    postChain: record,
                    // Mirror the headline verdicts into qualityReport, because that
                    // is the field every existing AIR consumer already reads. A
                    // consumer that never learns about `postChain` still stops
                    // seeing a clean report on a refused artifact.
                    qualityReport: {
                        deterministicFailures: [
                            ...(record.evidence?.violations || []).map(v => `evidence:${v.kind}@${v.sectionId}`),
                            ...(record.prose?.concerns || []).map(c => `prose:${c.id}`),
                            ...(record.grade?.superficial ? [`grade:superficial=${record.grade.superficial}`] : []),
                            ...(record.deckQuality?.findings || []).map(f => `layout:${f.kind}${f.template ? `@${f.template}` : ''}`),
                        ],
                        reviewScores: {
                            p0_coverage: record.evidence?.p0Coverage ?? 1,
                            prose_overall: record.prose?.overall ?? 1,
                            unverified_factual_claims: record.grade?.unverified ?? 0,
                            pointers_bound: record.binding?.bound ?? 0,
                            distinct_archetypes: record.deckQuality?.distinctArchetypes ?? 0,
                            content_ratio: record.deckQuality?.contentRatio ?? 1,
                        },
                        chainPass: record.chainPass,
                    },
                },
            }),
        });
        if (!resp.ok) return { patched: false, error: `HTTP ${resp.status}` };
        const data = await resp.json().catch(() => ({}));
        return { patched: true, path: (data as any)?.path };
    } catch (e: any) {
        return { patched: false, error: e?.message || 'air patch failed' };
    }
}
