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
    // Stage 3 (2026-10-01): the PRD projections are ledgers, signal tables and a trace matrix.
    'slides:prd-ledger', 'slides:prd-signals', 'slides:prd-trace',
]);

export interface DeckPlanReport {
    isDeck: boolean;
    pass: boolean;
    violations: string[];
    templates: string[];
    visualRatio: number;
    archetypeCounts: Record<string, number>;
    /** V2 (2026-08-07): the visual floor this evaluation enforced (gate default
     *  0.4, or the session-constraint override from a "more graphics" directive). */
    visualFloorApplied?: number;
}

export interface DeckPlanGateOptions {
    /** V2 (2026-08-07, sota-elevation plan): session-constraint override of the
     *  strategic-visual floor. Compiled from user directives ("include more
     *  graphics") by sessionConstraints.ts; deterministic enforcement of the
     *  user's ask, per [S] user-selections-trump-auto-ranking. Clamped 0.4-0.7. */
    visualQuotaFloor?: number;
}

export function evaluateDeckPlan(replyText: string, opts: DeckPlanGateOptions = {}): DeckPlanReport {
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
    //    must argue visually, not in text columns. Floor: 40% of body slides visual,
    //    raisable per-session by a user directive (V2; clamped so a bad parse can
    //    never demand an all-visual or sub-default deck).
    const visualFloor = Math.min(0.7, Math.max(0.4, opts.visualQuotaFloor ?? 0.4));
    report.visualFloorApplied = visualFloor;
    if (body.length >= 6 && report.visualRatio < visualFloor) {
        const texty = body.filter(t => !VISUAL.has(t));
        report.violations.push(
            `only ${visualBody.length} of ${body.length} body slides are visual (${Math.round(report.visualRatio * 100)}%; floor ${Math.round(visualFloor * 100)}%${visualFloor > 0.4 ? ', raised by the user\'s explicit request for more graphics' : ''}). ` +
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

// ============================================================================
// 2026-10-01 (plan Stage 2.1 / R-M1): the verdict is RECORDED, and the surplus
// numbered-themes clamp is REPAIRED DETERMINISTICALLY when the model's re-ask does not.
// ============================================================================

export interface DeckPlanVerdict {
    pass: boolean;
    violations: string[];
    visualRatio: number;
    templates: number;
    /** Fences the deterministic remap rewrote (index, from -> to). */
    remapped: Array<{ index: number; from: string; to: string }>;
    /** 'pass' | 'model_repair' | 'deterministic_remap' | 'unrepaired' */
    resolution: 'pass' | 'model_repair' | 'deterministic_remap' | 'unrepaired';
}

let _lastVerdict: DeckPlanVerdict | null = null;

/** One slot per turn: the chat service records the deck-plan verdict, the AIR patch reads it. */
export function noteDeckPlanVerdict(v: DeckPlanVerdict | null): void { _lastVerdict = v; }
export function readLastDeckPlanVerdict(): DeckPlanVerdict | null { return _lastVerdict; }

export function verdictOf(report: DeckPlanReport, resolution: DeckPlanVerdict['resolution'], remapped: DeckPlanVerdict['remapped'] = []): DeckPlanVerdict {
    return { pass: report.pass, violations: report.violations.slice(), visualRatio: Number(report.visualRatio.toFixed(2)), templates: report.templates.length, remapped, resolution };
}

const FENCE_RE = /:::slide\s+template=(slides:[a-z0-9-]+)([^\n]*)\n([\s\S]*?)\n:::/g;

/**
 * numbered-themes -> evidence-table, payload to payload, using the two archetypes'
 * documented contracts (deck-composer skill table):
 *   numbered-themes  { kicker, title, items: [{ number, name, body, quote }], sourceLine }
 *   evidence-table   { kicker, title, intro, columns (4), rows: [{ subject, prove, implication, evidenceGrade }], takeaway: { label, statement }, sourceLine }
 * Every row is a named subject; `prove` carries the item's verbatim quote (the evidence),
 * `implication` the item's body (what it means), and the grade says whether a verbatim
 * quote backs the row. Nothing is invented: a missing quote is an empty cell, never text.
 */
export function numberedThemesToEvidenceTable(payload: any): any | null {
    const items = Array.isArray(payload?.items) ? payload.items : null;
    if (!items || items.length < 2) return null;
    const rows = items.slice(0, 6).map((it: any) => {
        const quote = String(it?.quote || '').trim();
        return {
            subject: String(it?.name || it?.title || '').trim(),
            prove: quote,
            implication: String(it?.body || it?.description || '').trim(),
            evidenceGrade: quote ? 'Verbatim' : '',
        };
    }).filter((r: any) => r.subject);
    if (rows.length < 2) return null;
    const firstBody = rows.find((r: any) => r.implication)?.implication || '';
    return {
        kicker: payload.kicker || '',
        title: payload.title || '',
        intro: firstBody ? '' : String(payload.intro || ''),
        columns: ['Subject', 'Evidence', 'What it means', 'Grade'],
        rows,
        takeaway: payload.takeaway && typeof payload.takeaway === 'object'
            ? payload.takeaway
            : { label: 'Pattern', statement: String(payload.takeaway || payload.title || '') },
        sourceLine: payload.sourceLine || '',
    };
}

export interface RemapResult { text: string; remapped: Array<{ index: number; from: string; to: string }>; }

/**
 * Rewrite every numbered-themes fence beyond the second into an evidence-table fence.
 * Pure text transform on the reply; a fence whose JSON does not parse is left alone.
 */
export function remapSurplusArchetypes(replyText: string, maxNumbered = 2): RemapResult {
    const remapped: RemapResult['remapped'] = [];
    let seenNumbered = 0;
    let index = -1;
    const text = String(replyText || '').replace(FENCE_RE, (whole, template: string, attrs: string, body: string) => {
        index++;
        if (template !== 'slides:numbered-themes') return whole;
        seenNumbered++;
        if (seenNumbered <= maxNumbered) return whole;
        let payload: any;
        try { payload = JSON.parse(body); } catch { return whole; }
        const next = numberedThemesToEvidenceTable(payload);
        if (!next) return whole;
        remapped.push({ index, from: template, to: 'slides:evidence-table' });
        return `:::slide template=slides:evidence-table${attrs}\n${JSON.stringify(next, null, 2)}\n:::`;
    });
    return { text, remapped };
}
