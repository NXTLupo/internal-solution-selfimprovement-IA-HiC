/**
 * DECK QUALITY GATE (2026-08-21) - the two visual-quality mechanisms deer-flow
 * has and HiC did not.
 *
 * 1. EXHIBIT DATA FIT (from `skills/public/chart-visualization`). Every chart
 *    type in deer-flow declares its required data shape AND a usage note: a
 *    column chart with more than 12 categories should take Top-N, a fishbone
 *    needs at least three branches. HiC's archetypes carry PAYLOAD contracts
 *    (which keys, which array lengths) but no FIT rule, so a `slides:ranked-bars`
 *    with two rows or a `slides:quadrant` plotting one subject renders as a
 *    legitimate-looking exhibit that says nothing. A payload can be schema-valid
 *    and visually empty at the same time.
 *
 * 2. CROSS-DECK CONVERGENCE (from `skills/public/frontend-design`, which states
 *    "NEVER converge on common choices across generations"). DECK MODE already
 *    tells the model to use at least five distinct archetypes, and nothing ever
 *    measured whether it did, or whether this deck is shaped exactly like the
 *    last one. Two of the three audited decks opened with the same three-beat
 *    sequence. A client who receives two decks that look identical notices.
 *
 * Deterministic, no model call, so it runs on every generation.
 */

import { exhibitFitRules } from './exhibitCatalog';
import { evaluateGrounding, type GroundingReport } from './groundingCheck';

export interface DeckQualityFinding {
    kind: 'exhibit_underfilled' | 'archetype_monotony' | 'connective_heavy' | 'sequence_repeat' | 'ungrounded_concept';
    slideId?: string;
    template?: string;
    detail: string;
    /** What to do about it, in the words the repair pass can act on. */
    remedy: string;
}

export interface DeckQualityReport {
    findings: DeckQualityFinding[];
    /**
     * E2.1: whether the deck introduces each concept before arguing from it. Kept as its
     * own report rather than flattened into findings, because the repair instruction for
     * an ungrounded concept differs from the one for a thin exhibit.
     */
    grounding: GroundingReport;
    distinctArchetypes: number;
    contentRatio: number;      // content slides / total
    /** Archetype sequence for this deck, for the next run to compare against. */
    sequence: string[];
    pass: boolean;
}

/**
 * Per-archetype minimum data for the exhibit to CARRY meaning: the payload array
 * that makes the archetype worth using and the floor below which the slide is a
 * shell.
 *
 * DERIVED from `exhibitCatalog.ts` (DF-V3), which is the single authority. These
 * rules were declared here first; keeping a second copy meant a threshold could
 * drift between the gate that enforces it and the guidance the model is given,
 * which is the same duplicate-brain problem the routing convergence removed.
 */
const FIT_RULES: Record<string, { field: string; min: number; why: string }> = exhibitFitRules();

/** Archetypes that carry connective tissue rather than content. */
const CONNECTIVE = new Set([
    'slides:cover', 'slides:agenda', 'slides:section-divider', 'slides:thesis-interstitial',
]);

/** Count the entries in a payload field, tolerating the shapes archetypes use. */
function countField(payload: any, field: string): number | null {
    if (!payload || typeof payload !== 'object') return null;
    const v = payload[field];
    if (Array.isArray(v)) return v.length;
    // Some archetypes nest their collection one level down (left.items, right.items).
    if (v && typeof v === 'object') {
        if (Array.isArray((v as any).items)) return (v as any).items.length;
        return Object.keys(v).length ? 1 : 0;
    }
    if (typeof v === 'string') return v.trim() ? 1 : 0;
    return null;   // field absent: the payload contract check owns that, not this gate
}

export interface DeckQualityOptions {
    /** Archetype sequence of the previous deck in this engagement, if any. */
    previousSequence?: string[];
}

export function evaluateDeckQuality(slides: any[], opts: DeckQualityOptions = {}): DeckQualityReport {
    const findings: DeckQualityFinding[] = [];
    const list = Array.isArray(slides) ? slides : [];
    const sequence = list.map(s => String(s?.template || '').toLowerCase());

    // 1. EXHIBIT FIT
    for (const s of list) {
        const template = String(s?.template || '').toLowerCase();
        const rule = FIT_RULES[template];
        if (!rule) continue;
        const n = countField(s?.composerPayload, rule.field);
        if (n === null) continue;
        if (n < rule.min) {
            findings.push({
                kind: 'exhibit_underfilled', slideId: String(s?.id || ''), template,
                detail: `${template} carries ${n} ${rule.field} (needs ${rule.min}): ${rule.why}`,
                remedy: `Either fill ${rule.field} to ${rule.min} entries from the evidence, or move this content to a prose archetype that fits ${n} item(s).`,
            });
        }
    }

    // 2. VARIETY within the deck (DECK MODE asks for it; nothing measured it)
    const contentSlides = sequence.filter(t => t && !CONNECTIVE.has(t));
    const distinct = new Set(sequence.filter(Boolean)).size;
    const contentRatio = sequence.length ? contentSlides.length / sequence.length : 0;

    const counts = new Map<string, number>();
    for (const t of sequence) counts.set(t, (counts.get(t) || 0) + 1);
    for (const [t, n] of counts) {
        // A content archetype used three or more times in one deck is a template
        // the model fell back on, not a choice it made.
        if (n >= 3 && !CONNECTIVE.has(t)) {
            findings.push({
                kind: 'archetype_monotony', template: t,
                detail: `${t} is used ${n} times in a ${sequence.length}-slide deck`,
                remedy: `Re-map at least ${n - 1} of those slides to the archetype that matches each one's actual shape.`,
            });
        }
    }
    // Only judge variety on a deck long enough for it to mean something.
    if (sequence.length >= 5 && distinct < 5) {
        findings.push({
            kind: 'archetype_monotony',
            detail: `${distinct} distinct archetype(s) across ${sequence.length} slides (DECK MODE requires at least 5)`,
            remedy: 'Choose each slide\'s archetype from its content shape rather than reusing one layout.',
        });
    }
    if (sequence.length >= 4 && contentRatio < 0.5) {
        findings.push({
            kind: 'connective_heavy',
            detail: `${contentSlides.length}/${sequence.length} slides carry content; the rest are cover, agenda or dividers`,
            remedy: 'Replace connective slides with content archetypes, or cut them.',
        });
    }

    // 3. CONVERGENCE against the previous deck in this engagement
    const prev = (opts.previousSequence || []).filter(Boolean);
    if (prev.length >= 3 && sequence.length >= 3) {
        const openingMatch = prev.slice(0, 3).join('>') === sequence.slice(0, 3).join('>');
        const overlap = sequence.filter(t => prev.includes(t)).length / sequence.length;
        if (openingMatch && overlap >= 0.8) {
            findings.push({
                kind: 'sequence_repeat',
                detail: `this deck opens with the same three archetypes as the previous deck and reuses ${Math.round(overlap * 100)}% of its layouts`,
                remedy: 'Vary the opening and the layout mix so two decks for the same client do not read as one template.',
            });
        }
    }

    /**
     * E2.1. Grounding runs here because it is a deck-level property: no single slide can
     * be judged for it, only the order. Each ungrounded concept becomes a finding so the
     * existing repair path picks it up, and the full report travels alongside for AIR.
     */
    const grounding = evaluateGrounding(slides);
    for (const g of grounding.findings) {
        findings.push({
            kind: 'ungrounded_concept',
            slideId: g.slideId,
            detail: `slide ${g.slideIndex + 1} argues from "${g.concept}" before any earlier slide introduces it`,
            remedy: `Introduce "${g.concept}" on this slide, or rewrite the sentence to argue from something already established.`,
        });
    }

    return {
        findings,
        grounding,
        distinctArchetypes: distinct,
        contentRatio: Number(contentRatio.toFixed(2)),
        sequence,
        pass: findings.length === 0,
    };
}

/**
 * Model-facing repair text. Names the slide, the shortfall and the fix.
 *
 * E2.1 follow-up (2026-08-24): grounding findings get their own block. They used to
 * travel with the layout findings under a header reading "Each item below is a layout
 * that does not carry its content", which told the model to fix a layout when the real
 * defect was narrative order. A repair instruction that names the wrong problem is worse
 * than none, because the model does what it is told.
 */
export function buildDeckQualityInstruction(report: DeckQualityReport): string {
    if (report.pass) return '';
    const grounding = report.findings.filter(f => f.kind === 'ungrounded_concept');
    const layout = report.findings.filter(f => f.kind !== 'ungrounded_concept');
    const blocks: string[] = [];

    if (grounding.length) {
        const g = [
            'NARRATIVE ORDER. These are not layout problems. A reader who has seen only the',
            'earlier slides does not know what these terms refer to, so the argument does not',
            'land. For each one, either introduce the term on the slide that argues from it, or',
            'rewrite the sentence to argue from something the deck has already established.',
            'Do not add a note about the gap and do not delete the claim:',
        ];
        for (const f of grounding.slice(0, 8)) g.push(`- ${f.detail}. ${f.remedy}`);
        blocks.push(g.join('\n'));
    }

    if (!layout.length) return blocks.join('\n\n');

    const lines = ['DECK QUALITY REVISION. Each item below is a layout that does not carry its content. Fix the layout or the content, never by padding with invented data:'];
    for (const f of layout.slice(0, 8)) {
        lines.push(`- ${f.template ? `${f.template}: ` : ''}${f.detail}. ${f.remedy}`);
    }
    blocks.push(lines.join('\n'));
    return blocks.join('\n\n');
}

/**
 * Remember this deck's shape so the NEXT deck in the engagement can be compared
 * against it. Module-level and per engagement, same projection pattern as the
 * durable-artifact store.
 */
const _lastSequence = new Map<string, string[]>();

export function noteDeckSequence(engagementSlug: string, sequence: string[]): void {
    if (engagementSlug && sequence.length) _lastSequence.set(engagementSlug, sequence);
}

export function previousDeckSequence(engagementSlug: string): string[] {
    return _lastSequence.get(engagementSlug) || [];
}
