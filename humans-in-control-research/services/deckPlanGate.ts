/**
 * deckPlanGate.ts (WS-3b, plans/slides-strategic-visual-uplift-2026-07-09.md)
 *
 * Deterministic post-parse governance for DECK MODE output: the prompt's SELECTION
 * DOCTRINE proposes, THIS gate disposes (the collapseAndScore pattern applied to deck
 * planning). Pure functions, no model calls - the caller runs ONE anchored repair
 * re-ask with the violations named when the gate fails.
 *
 * Classes:
 *   CONNECTIVE - transitions/openers; never counted as body substance.
 *   VISUAL     - archetypes whose body is a diagram, comparison, matrix, or figure
 *                (the strategic-visual quota numerator).
 * Everything else is a text-column body archetype.
 */

const CONNECTIVE = new Set([
    'slides:cover', 'slides:agenda', 'slides:section-divider',
    'slides:thesis-interstitial', 'slides:scene',
]);

const VISUAL = new Set([
    'slides:stat-row', 'slides:evidence-table', 'slides:aggregate-roadmap',
    'slides:infographic-exhibit', 'slides:quadrant', 'slides:flow-arc',
    'slides:milestone-timeline', 'slides:means-matters', 'slides:ranked-bars',
    'slides:comparison-panels', 'slides:screen-critique', 'slides:screen-redesign',
]);

export interface DeckPlanReport {
    isDeck: boolean;
    pass: boolean;
    violations: string[];
    templates: string[];
    visualRatio: number;
    archetypeCounts: Record<string, number>;
}

export function evaluateDeckPlan(replyText: string): DeckPlanReport {
    const templates = [...(replyText || '').matchAll(/:::slide\s+template=(slides:[a-z0-9-]+)/g)].map(m => m[1]);
    const counts: Record<string, number> = {};
    for (const t of templates) counts[t] = (counts[t] || 0) + 1;
    const report: DeckPlanReport = {
        isDeck: templates.length >= 4,
        pass: true,
        violations: [],
        templates,
        visualRatio: 0,
        archetypeCounts: counts,
    };
    if (!report.isDeck) return report;   // single artifacts and short replies are not governed

    const body = templates.filter(t => !CONNECTIVE.has(t));
    const visualBody = body.filter(t => VISUAL.has(t));
    report.visualRatio = body.length ? visualBody.length / body.length : 1;

    // 1. Variety floor (the prompt's ">= 5 distinct" rule, now enforced in code).
    const distinct = new Set(templates).size;
    const varietyFloor = Math.min(5, Math.max(3, Math.floor(templates.length / 3)));
    if (templates.length >= 8 && distinct < varietyFloor) {
        report.violations.push(`only ${distinct} distinct archetypes across ${templates.length} slides; use at least ${varietyFloor}`);
    }

    // 2. Adjacency: same BODY archetype twice in a row reads as a template rut.
    for (let i = 1; i < templates.length; i++) {
        if (templates[i] === templates[i - 1] && !CONNECTIVE.has(templates[i])) {
            report.violations.push(`${templates[i]} appears twice in a row at slides ${i}-${i + 1}; vary the archetype or merge the content`);
            break;
        }
    }

    // 3. numbered-themes clamp (the documented anti-catch-all).
    if ((counts['slides:numbered-themes'] || 0) > 2) {
        report.violations.push(`slides:numbered-themes used ${counts['slides:numbered-themes']} times (max 2); regroup or move subjects to single-subject archetypes`);
    }

    // 4. Overuse: any body archetype more than 3 times.
    for (const [t, n] of Object.entries(counts)) {
        if (!CONNECTIVE.has(t) && n > 3) {
            report.violations.push(`${t} used ${n} times; a deck that leans on one archetype is a template rut - redistribute`);
        }
    }

    // 5. STRATEGIC-VISUAL QUOTA (the plan's core lever): decks with real body length
    //    must argue visually, not in text columns. Floor: 40% of body slides visual.
    if (body.length >= 6 && report.visualRatio < 0.4) {
        const texty = body.filter(t => !VISUAL.has(t));
        report.violations.push(
            `only ${visualBody.length} of ${body.length} body slides are visual (${Math.round(report.visualRatio * 100)}%; floor 40%). ` +
            `Convert text-column slides (${[...new Set(texty)].join(', ')}) whose content has SHAPE: a sequence -> slides:flow-arc, ` +
            `a comparison -> slides:comparison-panels or slides:evidence-table, hard numbers -> slides:means-matters or slides:stat-row, ` +
            `a distribution/ranking -> slides:ranked-bars, positioning -> slides:quadrant, phased time -> slides:milestone-timeline`);
    }

    // 6. Connective padding: a deck that is mostly transitions is empty.
    if (templates.length >= 8 && body.length < templates.length * 0.6) {
        report.violations.push(`${templates.length - body.length} of ${templates.length} slides are connective (cover/agenda/divider/thesis); substance belongs in body archetypes`);
    }

    report.pass = report.violations.length === 0;
    return report;
}

/** The anchored repair instruction for a failed plan (RI pattern: prior output +
 *  named violations; the model may keep what already satisfies the gate). */
export function buildDeckRepairInstruction(report: DeckPlanReport): string {
    return `The deck you produced fails the composition gate. Violations:
${report.violations.map(v => `- ${v}`).join('\n')}

Re-emit the COMPLETE deck (every fence), keeping every slide that already serves the argument and its evidence EXACTLY as written, and restructuring only what the violations name. Honor the original request, the narrative arc, and every payload contract. Do not mention this instruction or the gate.`;
}
