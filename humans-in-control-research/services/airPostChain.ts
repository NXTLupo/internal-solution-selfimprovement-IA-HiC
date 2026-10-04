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
import { buildEnrichmentRecord } from './generationLedger';
import type { RepairResult } from './artifactRepair';
import { readLastDeckPlanVerdict } from './deckPlanGate';

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

let _pending: PostChainRecord | null = null;

export function noteEmittedAir(ref: EmittedAirRef): void {
    _lastAir = ref;
    // Drain a patch that arrived before the record existed (see the race note in
    // patchAirWithPostChain).
    if (_pending) {
        const record = _pending;
        _pending = null;
        void patchAirWithPostChain(record, ref).then(r => {
            if (r.patched) console.info(`[air-postchain] queued chain verdicts recorded on ${r.path}`);
            else console.warn(`[air-postchain] queued patch failed: ${r.error}`);
        });
    }
}

/** Test surface: is a patch waiting for its AIR record? */
export function hasPendingPostChain(): boolean { return _pending !== null; }
export function clearPendingPostChain(): void { _pending = null; }

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
        /**
         * E1.1 follow-up (2026-08-24). The live run exposed the other half of this item:
         * `SlotReport` carried `planAbsent` but the AIR record dropped it, so the durable
         * record still showed a bare `p0Coverage: 1` with no way to tell "every claim we
         * noticed was sourced" from "the objective was covered". Threading the flag is
         * what makes the record able to say NOT MEASURED.
         */
        planAbsent: boolean;
        plannedSubQuestions: number;
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
    /** Exhibit fit and dangling references (DF-V4, exhibits before prose). */
    exhibits: {
        checked: number;
        fitted: number;
        findings: Array<{ kind: string; template: string; detail: string }>;
    } | null;
    /**
     * Which grounding steps degraded on the turn that produced this artifact
     * (DF-A2). Before this field, a deck generated without design tokens, without
     * the exemplar contract, or on bulk corpus instead of manifest grounding was
     * indistinguishable in the record from a fully-grounded one.
     */
    enrichment: {
        total: number;
        degraded: number;
        groundingIntact: boolean;
        losses: Array<{ stepId: string; weight: string; errorType: string | null; empty: boolean }>;
    } | null;
    /** 2026-10-01 (Stage 2.1): the Partner Test verdict after the final pass. */
    titles: { checked: number; findings: Array<{ slideId: string; kinds: string[]; title: string }> } | null;
    /** Banned-phrase sites that SURVIVED the final pass. */
    slop: { sites: number; phrases: string[] } | null;
    /** The DECK MODE composition gate's verdict for the turn (recorded by the chat service). */
    deckPlan: { pass: boolean; violations: string[]; visualRatio: number; resolution: string; remapped: number } | null;
    /** R-M1: per-family before/after counts from the repair pass. */
    ri: { before: Record<string, number>; after: Record<string, number>; resolved: number; survived: number; improved: boolean } | null;
    /** Slides withheld from the shipped deck (a naked-number title repair could not clear). */
    withheld: Array<{ slideId: string; reason: string }>;
    /** The fences the user actually received, when the chain changed them. */
    shippedPayload?: unknown;
}

/** Build the record from the chain (and optional repair) result. */
export function buildPostChainRecord<T>(
    chain: ChainResult<T>,
    repair?: RepairResult<T> | null,
    shippedPayload?: unknown,
    withheld: Array<{ slideId: string; reason: string }> = [],
): PostChainRecord {
    const enrichmentRecord = buildEnrichmentRecord();
    const final = repair?.finalChain || chain;
    const deckPlan = readLastDeckPlanVerdict();
    // The initial pass is where binding happens; fall back to the final pass when
    // there was no repair (in which case they are the same object).
    const bindingSource = (chain.bindReport && chain.bindReport.bound.length)
        ? chain.bindReport
        : final.bindReport;
    return {
        chainTrace: final.trace,
        chainPass: final.pass,
        evidence: final.slotReport ? {
            p0Coverage: Number(final.slotReport.p0Coverage.toFixed(3)),
            violations: final.slotReport.violations.map(v => ({
                sectionId: v.sectionId, field: v.field, kind: v.kind, claim: v.claim.slice(0, 200),
            })),
            planAbsent: final.slotReport.planAbsent,
            plannedSubQuestions: final.slotReport.plannedSubQuestions,
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
        // 2026-08-21: report the binding from the pass that DID the work. The
        // repair re-runs the chain, and on that second pass the pointers are
        // already attached, so the final pass legitimately binds nothing. Taking
        // the final report made a live run that bound seven pointers record
        // `bound: 0`, which reads as a failure of the thing that just worked.
        binding: bindingSource ? {
            bound: bindingSource.bound.length,
            unbound: bindingSource.unbound.length,
            byStrategy: bindingSource.bound.reduce((acc, b) => {
                acc[b.strategy] = (acc[b.strategy] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            pointers: Array.from(new Set(bindingSource.bound.map(b => b.pointer))).slice(0, 20),
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
        exhibits: final.exhibitReport ? {
            checked: final.exhibitReport.exhibitsChecked,
            fitted: final.exhibitReport.fitted,
            findings: final.exhibitReport.findings.map(f => ({ kind: f.kind, template: f.template, detail: f.detail })),
        } : null,
        titles: final.titleReport ? {
            checked: final.titleReport.checked,
            findings: final.titleReport.findings.map(f => ({ slideId: f.slideId, kinds: f.kinds.slice(), title: f.title.slice(0, 120) })),
        } : null,
        slop: (final.slopFindings || []).length ? {
            sites: final.slopFindings.length,
            phrases: Array.from(new Set(final.slopFindings.map(s => s.phrase))).slice(0, 20),
        } : null,
        deckPlan: deckPlan ? {
            pass: deckPlan.pass, violations: deckPlan.violations.slice(0, 12), visualRatio: deckPlan.visualRatio,
            resolution: deckPlan.resolution, remapped: deckPlan.remapped.length,
        } : null,
        ri: repair?.ri ?? null,
        withheld,
        enrichment: enrichmentRecord.total ? {
            total: enrichmentRecord.total,
            degraded: enrichmentRecord.degraded,
            groundingIntact: enrichmentRecord.groundingIntact,
            losses: enrichmentRecord.losses.map(l => ({ stepId: l.stepId, weight: l.weight, errorType: l.errorType, empty: l.empty })),
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
    if (!ref) {
        // 2026-08-21 LIVE RACE: on the chat deck path the AIR write fires AFTER
        // the chain runs, so the patch arrived before the record existed and
        // logged "no emitted AIR to patch" while the file was written a second
        // later. Stash the record; `noteEmittedAir` applies it the moment the
        // writer registers. One slot is enough because one turn produces one
        // artifact, and a stale pending record is dropped by the next turn.
        _pending = record;
        return { patched: false, error: 'AIR not emitted yet; patch queued for the write' };
    }
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
                        chainRan: true,
                        deterministicFailures: [
                            ...(record.evidence?.violations || []).map(v => `evidence:${v.kind}@${v.sectionId}`),
                            ...(record.prose?.concerns || []).map(c => `prose:${c.id}`),
                            ...(record.grade?.superficial ? [`grade:superficial=${record.grade.superficial}`] : []),
                            ...(record.deckQuality?.findings || []).map(f => `layout:${f.kind}${f.template ? `@${f.template}` : ''}`),
                            ...(record.titles?.findings || []).filter(f => f.kinds.some(k => k !== 'no_verb')).map(f => `title:${f.kinds.filter(k => k !== 'no_verb').join('+')}@${f.slideId}`),
                            ...(record.slop?.phrases || []).map(p => `slop:${p}`),
                            ...(record.deckPlan && !record.deckPlan.pass ? [`deckplan:${record.deckPlan.violations.length}`] : []),
                            ...record.withheld.map(w => `withheld:${w.slideId}`),
                        ],
                        reviewScores: {
                            p0_coverage: record.evidence?.p0Coverage ?? 1,
                            prose_overall: record.prose?.overall ?? 1,
                            unverified_factual_claims: record.grade?.unverified ?? 0,
                            pointers_bound: record.binding?.bound ?? 0,
                            distinct_archetypes: record.deckQuality?.distinctArchetypes ?? 0,
                            content_ratio: record.deckQuality?.contentRatio ?? 1,
                            deck_plan_violations: record.deckPlan?.violations.length ?? 0,
                            title_findings: record.titles?.findings.filter(f => f.kinds.some(k => k !== 'no_verb')).length ?? 0,
                            slop_sites: record.slop?.sites ?? 0,
                            withheld_slides: record.withheld.length,
                        },
                        chainPass: record.chainPass,
                        // R-M4 (2026-10-01): the mechanism signals the golden-set runner reads.
                        ...(record.ri ? { ri: { fired: record.ri.resolved > 0 || record.ri.survived > 0, before: record.ri.before, after: record.ri.after, resolved: record.ri.resolved, survived: record.ri.survived } } : {}),
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
