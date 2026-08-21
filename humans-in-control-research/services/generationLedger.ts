/**
 * DF-A2 - CATCH CONVERSION ON THE GENERATION PATH
 * (plans/deerflow-harness-transfer-2026-08-20.md; owner decision 1: generation
 * path only, which is what this covers.)
 *
 * `stepEnvelope.runStep` gave HiC a typed result. This file gives the generation
 * path somewhere to PUT those results, which is the half that was missing: a
 * converted catch that logs an envelope to the console and drops it is a prettier
 * bare catch.
 *
 * The problem being fixed is specific and was visible in production logs. A deck
 * turn runs about a dozen best-effort enrichment steps before the model is called:
 * design tokens from Figma, the component-spec registry, the exemplar contract,
 * multi-angle planned retrieval, the wiki article pre-fetch, manifest-chunk
 * grounding, learned constraints, the grounding projection. Every one of them was
 * a bare `catch` with a `console.warn`, and every one of them is allowed to fail
 * without stopping the run. The consequence: a turn where the tokens failed, the
 * exemplar was skipped and grounding fell back to bulk corpus produced a deck that
 * looked, in the durable record, exactly like a turn where all three succeeded.
 * The deck was measurably worse and nothing said so.
 *
 * These steps stay non-fatal. What changes is that each one now records WHY it
 * degraded, in a field, and the enrichment state lands in AIR next to the chain
 * trace. A deck generated without design tokens is now a deck you can find later.
 *
 * Deliberately NOT converted: catches inside `JSON.parse` fallback ladders, where
 * the next candidate parse IS the recovery and an envelope per attempt is noise.
 */

import { runStep, envelopeTrace, hasUsableValue, type StepEnvelope } from './stepEnvelope';

/** How much a degraded step costs the artifact. Drives the AIR summary. */
export type EnrichmentWeight = 'critical' | 'material' | 'minor';

export interface LedgerEntry {
    stepId: string;
    weight: EnrichmentWeight;
    envelope: StepEnvelope<unknown>;
    /** Set when the step succeeded but returned nothing usable. */
    empty: boolean;
}

/**
 * What each generation-path step costs when it degrades. `critical` steps are the
 * ones whose absence changes what the model can honestly say; `material` steps
 * change quality; `minor` steps change polish.
 */
const WEIGHTS: Record<string, EnrichmentWeight> = {
    'gen:manifestGrounding': 'critical',   // no grounding = no pointers = no evidence
    'gen:groundingProjection': 'critical', // the pointer binder's input
    'gen:designTokens': 'material',        // absence forces "tokens unavailable" copy
    'gen:learnedConstraints': 'material',
    'gen:plannedRetrieval': 'material',
    'gen:wikiPrefetch': 'material',
    'gen:componentSpec': 'minor',
    'gen:exemplarContract': 'minor',
    'gen:skillsManifest': 'minor',
};

const _ledgers = new Map<string, LedgerEntry[]>();
/** The turn the un-keyed helpers write to. Set once per generation turn. */
let _activeTurn = '';

export function beginGenerationLedger(turnId: string): string {
    const id = String(turnId || `turn_${_ledgers.size + 1}`);
    _ledgers.set(id, []);
    _activeTurn = id;
    return id;
}

export function noteGenerationStep(envelope: StepEnvelope<unknown>, turnId?: string): void {
    const id = turnId || _activeTurn;
    if (!id) return;
    const list = _ledgers.get(id);
    if (!list) return;
    list.push({
        stepId: envelope.stepId,
        weight: WEIGHTS[envelope.stepId] || 'minor',
        envelope,
        empty: envelope.status === 'success' && !hasUsableValue(envelope),
    });
}

/**
 * Run a best-effort enrichment step: never throws, always recorded. The caller
 * gets the envelope and decides, by reading a field, whether to use the value.
 *
 * `emptyIsPartial` exists because an enrichment step that returns nothing is the
 * failure mode the console.warn version could not see at all: the fetch resolved
 * 200 with an empty body, the code took the falsy branch, and no warning fired.
 */
export async function enrich<T>(
    stepId: string,
    fn: () => Promise<T>,
    opts: { turnId?: string; meta?: Record<string, unknown> } = {},
): Promise<StepEnvelope<T>> {
    const env = await runStep<T>(stepId, fn, { meta: opts.meta });
    noteGenerationStep(env as StepEnvelope<unknown>, opts.turnId);
    return env;
}

export function readGenerationLedger(turnId?: string): LedgerEntry[] {
    const id = turnId || _activeTurn;
    return id ? (_ledgers.get(id) || []).slice() : [];
}

export interface EnrichmentRecord {
    turnId: string;
    total: number;
    degraded: number;
    /** Steps that failed or returned nothing, worst weight first. */
    losses: Array<{ stepId: string; weight: EnrichmentWeight; errorType: string | null; nextAction: string; empty: boolean }>;
    /** True when no critical enrichment step degraded. */
    groundingIntact: boolean;
    trace: Record<string, unknown>[];
    summary: string;
}

const WEIGHT_RANK: Record<EnrichmentWeight, number> = { critical: 0, material: 1, minor: 2 };

/** The AIR-facing record. Compact, field-readable, never parsed prose. */
export function buildEnrichmentRecord(turnId?: string): EnrichmentRecord {
    const id = turnId || _activeTurn;
    const entries = readGenerationLedger(id);
    const degradedEntries = entries.filter(e => e.envelope.status !== 'success' || e.empty);
    const losses = degradedEntries
        .slice()
        .sort((a, b) => WEIGHT_RANK[a.weight] - WEIGHT_RANK[b.weight])
        .map(e => ({
            stepId: e.stepId,
            weight: e.weight,
            errorType: e.envelope.errorType,
            nextAction: e.envelope.nextAction,
            empty: e.empty,
        }));
    const groundingIntact = !degradedEntries.some(e => e.weight === 'critical');
    const summary = entries.length === 0
        ? 'no enrichment steps recorded'
        : degradedEntries.length === 0
            ? `all ${entries.length} enrichment step(s) succeeded`
            : `${degradedEntries.length}/${entries.length} enrichment step(s) degraded: ${losses.map(l => `${l.stepId}(${l.empty ? 'empty' : l.errorType})`).join(', ')}`;
    return {
        turnId: id,
        total: entries.length,
        degraded: degradedEntries.length,
        losses,
        groundingIntact,
        trace: entries.map(e => envelopeTrace(e.envelope)),
        summary,
    };
}

/**
 * Model-facing honesty line. When grounding degraded, the model must be TOLD, so
 * it narrows instead of asserting against evidence it never received. This is the
 * `narrow_scope` action applied at the input side rather than as a repair.
 */
export function buildDegradationNotice(record: EnrichmentRecord): string {
    if (!record.degraded) return '';
    const critical = record.losses.filter(l => l.weight === 'critical');
    if (!critical.length) return '';
    const names = critical.map(l => l.stepId.replace(/^gen:/, '')).join(', ');
    return [
        '=== RETRIEVAL DEGRADED FOR THIS TURN ===',
        `The following grounding step(s) did not deliver: ${names}.`,
        'You are working with less evidence than a normal turn. Write the artifact around what the',
        'corpus block in this prompt actually contains. Do not assert a finding you cannot point at,',
        'and do not compensate with general knowledge about the industry.',
    ].join('\n');
}

/** Test-only reset. */
export function resetGenerationLedgers(): void {
    _ledgers.clear();
    _activeTurn = '';
}
