/**
 * THE COVERAGE HOLE (2026-08-21) - artifacts that are not slides never met a gate.
 *
 * Everything built in the deer-flow transfer runs inside `runArtifactChain`, and
 * the chain was wired at exactly two call sites, both fed by `parseSlideBlocks`.
 * Artifacts that come back as `:::deliverable:TYPE` blocks (persona,
 * recommendation, journey_stage, roadmap_item, gap, prd_feature,
 * competitive_peer, theme) went straight to the UI:
 *
 *   no lexical scrub, no pointer binding, no provenance verification, no evidence
 *   slots, no prose signal, no grader, no repair.
 *
 * That is what "verified on #slides only" actually meant, and it is a wiring hole
 * rather than a testing gap: a persona set could assert an unsourced factual claim
 * and nothing in the pipeline would look at it. This module adapts a deliverable
 * into the shape the chain already understands and maps the result back.
 *
 * Two deliberate differences from the deck path:
 *
 *  1. `deckQuality` is SKIPPED. Its checks are about deck SHAPE (archetype
 *     variety, the connective-to-content ratio, whether this deck opens like the
 *     last one). Run against five personas they produce nonsense, and
 *     `noteDeckSequence` would poison the real cross-deck comparison with a
 *     sequence that was never a deck.
 *  2. `subjectDomain` and the sub-questions still apply, because the evidence
 *     rules are about CLAIMS, and a persona's pain point is as much a claim as a
 *     slide's takeaway.
 */

import { runArtifactChain, type ChainContext, type ChainResult, type StageId } from './artifactChain';
import { repairArtifact, type RepairResult } from './artifactRepair';

export interface DeliverableLike {
    id: string;
    type: string;
    data: any;
    [k: string]: any;
}

/** The shape the chain and the WS-4 edit contract understand. */
export interface ChainSubject {
    id: string;
    template: string;
    title: string;
    status: string;
    timestamp: number;
    composerPayload: any;
    /** Carried through untouched (underscore keys are never scrubbed or edited). */
    _deliverableType: string;
    _textHistory?: any[];
}

/**
 * `isComposerSlide` keys off the `slides:` prefix to decide whether to walk
 * `composerPayload`, so the subject must carry it. The type lives in a separate
 * underscore carrier rather than being encoded in the template string, so no gate
 * can mistake a persona for a registered deck archetype: `slides:deliverable` is
 * not in the exhibit catalog, and the fit check therefore abstains, which is the
 * correct verdict for a payload that was never an exhibit.
 */
const SUBJECT_TEMPLATE = 'slides:deliverable';

function titleOf(item: DeliverableLike): string {
    const d = item?.data || {};
    for (const k of ['title', 'name', 'theme', 'label', 'headline', 'feature']) {
        if (typeof d[k] === 'string' && d[k].trim()) return d[k].trim();
    }
    return String(item?.type || 'deliverable');
}

export function toChainSubjects(items: DeliverableLike[]): ChainSubject[] {
    return (items || [])
        .filter(it => it && it.id && it.data && typeof it.data === 'object')
        .map(it => ({
            id: String(it.id),
            template: SUBJECT_TEMPLATE,
            title: titleOf(it),
            status: 'draft',
            timestamp: Number(it.timestamp) || 0,
            composerPayload: it.data,
            _deliverableType: String(it.type || 'unknown'),
        }));
}

/**
 * Map the chain's output back onto the original items. Matched by id, so a
 * subject the chain dropped in `normalize` leaves its original untouched rather
 * than silently deleting a deliverable from the user's screen.
 */
export function fromChainSubjects<T extends DeliverableLike>(items: T[], subjects: ChainSubject[]): T[] {
    const byId = new Map(subjects.map(s => [s.id, s]));
    return (items || []).map(it => {
        const s = byId.get(String(it?.id));
        if (!s || !s.composerPayload) return it;
        const next: any = { ...it, data: s.composerPayload };
        if (s._textHistory) next._textHistory = s._textHistory;
        return next as T;
    });
}

/**
 * Stages that do not apply to a non-deck artifact. `titles` is the slide Partner Test; a
 * persona's name or a theme's label is not a slide title.
 */
export const DELIVERABLE_SKIP: StageId[] = ['deckQuality', 'titles'];

export interface DeliverableChainOutcome<T extends DeliverableLike> {
    items: T[];
    result: ChainResult<ChainSubject>;
    /** Deliverables whose payload the chain changed. */
    changedIds: string[];
}

/**
 * Run the chain over deliverable-block artifacts. Never throws: the artifact the
 * user already sees must survive a bookkeeping failure.
 */
export async function runDeliverableChain<T extends DeliverableLike>(
    items: T[],
    ctx: Omit<ChainContext, 'skip'> & { skip?: StageId[] },
): Promise<DeliverableChainOutcome<T>> {
    const subjects = toChainSubjects(items);
    const result = await runArtifactChain(subjects, {
        ...ctx,
        artifactType: ctx.artifactType || 'deliverable',
        skip: Array.from(new Set([...(ctx.skip || []), ...DELIVERABLE_SKIP])),
    });
    const mapped = fromChainSubjects(items, result.slides as ChainSubject[]);
    const changedIds = mapped
        .filter((m, i) => m !== items[i] && JSON.stringify(m.data) !== JSON.stringify(items[i]?.data))
        .map(m => String(m.id));
    return { items: mapped, result, changedIds };
}

/** One line for the console, naming the types actually inspected. */
export function deliverableChainSummary<T extends DeliverableLike>(
    outcome: DeliverableChainOutcome<T>,
): string {
    const types = Array.from(new Set(outcome.items.map(i => String(i.type))));
    const violations = outcome.result.slotReport?.violations.length ?? 0;
    const bound = outcome.result.bindReport?.bound.length ?? 0;
    return `${outcome.items.length} deliverable(s) [${types.join(', ')}], pass=${outcome.result.pass}, `
        + `${bound} pointer(s) bound, ${violations} evidence violation(s), ${outcome.changedIds.length} changed`;
}

export interface GatedDeliverablesOutcome<T extends DeliverableLike> extends DeliverableChainOutcome<T> {
    /** Null when the chain passed or had no repair instruction. */
    repair: RepairResult<ChainSubject> | null;
    /** The chain result the UI should trust: post-repair when a repair ran. */
    finalResult: ChainResult<ChainSubject>;
}

/**
 * 2026-10-01 (plan Stage 2.1): the deliverable-block path gets the SAME repair the deck
 * path has. Until now `runDeliverableChain` inspected a persona set and logged what it
 * found; nothing acted on it. This runs the chain, repairs through the narrow-never-source
 * edit contract when the chain refused, re-checks, and maps the result back onto the items.
 */
export async function runGatedDeliverables<T extends DeliverableLike>(
    items: T[],
    ctx: Omit<ChainContext, 'skip'> & { skip?: StageId[] },
): Promise<GatedDeliverablesOutcome<T>> {
    const subjects = toChainSubjects(items);
    const chainCtx: ChainContext = {
        ...ctx,
        artifactType: ctx.artifactType || 'deliverable',
        skip: Array.from(new Set([...(ctx.skip || []), ...DELIVERABLE_SKIP])),
    };
    const result = await runArtifactChain(subjects, chainCtx);
    let repair: RepairResult<ChainSubject> | null = null;
    let finalSubjects = result.slides as ChainSubject[];
    if (!result.pass && result.repairInstruction) {
        try {
            repair = await repairArtifact(result.slides as ChainSubject[], result, chainCtx);
            if (repair.rounds.length) finalSubjects = repair.slides;
        } catch (e: any) {
            console.warn('[deliverable-chain] repair failed (non-fatal):', e?.message || e);
        }
    }
    const mapped = fromChainSubjects(items, finalSubjects);
    const changedIds = mapped
        .filter((m, i) => m !== items[i] && JSON.stringify(m.data) !== JSON.stringify(items[i]?.data))
        .map(m => String(m.id));
    return { items: mapped, result, changedIds, repair, finalResult: repair?.finalChain || result };
}
