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

/**
 * 2026-10-23 (#slides elevation, owner: "information poor"): a DENSITY FLOOR per body slide, measured on the
 * payload itself. Substance = every string value in the payload with the manifest pointers removed (a pointer
 * is evidence binding, not reading matter); the floor is per archetype, set at roughly 45% of the archetype's
 * rendered text capacity (services/archetypeDensity.audit.test.ts). A slide under its floor is a bare-label
 * slide: the gate names it and the one anchored re-ask fills it from the evidence already in the prompt.
 */
const DENSITY_FLOOR: Record<string, number> = {
    'slides:numbered-themes': 520, 'slides:brief-card': 520, 'slides:comparison-panels': 480,
    'slides:evidence-table': 440, 'slides:flow-arc': 400, 'slides:means-matters': 380,
    'slides:role-recommendation': 360, 'slides:role-needs': 340, 'slides:org-model': 320,
    'slides:infographic-exhibit': 340, 'slides:quadrant': 300, 'slides:ranked-bars': 300,
    'slides:stat-row': 260, 'slides:milestone-timeline': 260, 'slides:problem-diptych': 240,
    'slides:role-roadmap': 240, 'slides:aggregate-roadmap': 220, 'slides:block-quote': 200,
};
const DENSITY_EXEMPT = new Set(['slides:prd-ledger', 'slides:prd-signals', 'slides:prd-trace', 'slides:prd-story', 'slides:screen-critique', 'slides:screen-redesign']);
const POINTER_RE = /\[[a-z0-9_./-]+\.md#c\d+(?:\s*,\s*[a-z0-9_./-]+\.md#c\d+)*\]/gi;
const QUOTE_KEYS = new Set(['quote', 'prove', 'evidence', 'note', 'pullQuote', 'verbatim']);

export interface SlideSubstance { chars: number; pointers: number; quotes: number }

/** Reading matter in a payload: every string at any depth, carriers and underscore keys skipped, pointers removed. */
export function substanceOf(payload: any): SlideSubstance {
    const out: SlideSubstance = { chars: 0, pointers: 0, quotes: 0 };
    const walk = (v: any, key: string, depth: number) => {
        if (v == null || depth > 6) return;
        if (typeof v === 'string') {
            if (key.startsWith('_') || /^(?:data:|https?:\/\/)/.test(v) || /image$/i.test(key) || key === 'itemImages') return;
            const ptrs = v.match(POINTER_RE);
            if (ptrs) out.pointers += ptrs.length;
            const clean = v.replace(POINTER_RE, '').replace(/\s+/g, ' ').trim();
            out.chars += clean.length;
            if (QUOTE_KEYS.has(key) && clean.length >= 12) out.quotes++;
            return;
        }
        if (Array.isArray(v)) { v.forEach(x => walk(x, key, depth + 1)); return; }
        if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, depth + 1);
    };
    walk(payload, '', 0);
    return out;
}

/** Per-slide density verdicts for a reply (exported for the AIR patch and tests). */
export function measureDeckDensity(replyText: string): Array<{ index: number; template: string; floor: number } & SlideSubstance> {
    const rows: Array<{ index: number; template: string; floor: number } & SlideSubstance> = [];
    let index = 0;
    for (const m of String(replyText || '').matchAll(/:::slide\s+template=(slides:[a-z0-9-]+)[^\n]*\n([\s\S]*?)\n:::/g)) {
        index++;
        const template = m[1];
        if (CONNECTIVE.has(template) || DENSITY_EXEMPT.has(template)) continue;
        let payload: any = null;
        try { payload = JSON.parse(m[2]); } catch { continue; }
        rows.push({ index, template, floor: DENSITY_FLOOR[template] ?? 300, ...substanceOf(payload) });
    }
    return rows;
}

/** Native exhibit slides in a reply, and how many of them are flowcharts (nodes + edges). */
/** A flowchart this wide cannot be drawn at a legible size in the 1622 x 600 exhibit slot (2026-10-26 live: 11-13 nodes
 *  drew node text at ~16 px); the contract asks for 3-8. */
export const FLOWCHART_MAX_NODES = 9;

// 2026-10-30 (WS-3 P4): THE archetype caps. The DECK MODE prompt used to restate these numbers by hand and
// drifted from the gate ("never more than twice" vs 3; "capped at 3" vs 5 with a per-slide visual ask).
// The prompt now injects `describeDeckCaps()`, so the model reads the gate's own numbers.
export const NUMBERED_THEMES_CAP = 2;
export const BODY_ARCHETYPE_CAP = 3;
export const INFOGRAPHIC_CAP_DRAWN = 5;

export function describeDeckCaps(drawnFloor = 0): string {
    const infographic = drawnFloor >= 1 ? INFOGRAPHIC_CAP_DRAWN : BODY_ARCHETYPE_CAP;
    return `ARCHETYPE CAPS (the gate's own numbers): no body archetype more than ${BODY_ARCHETYPE_CAP} times per deck; ` +
        `slides:numbered-themes at most ${NUMBERED_THEMES_CAP}; slides:infographic-exhibit at most ${infographic}` +
        `${drawnFloor >= 1 ? ' (raised because the request asks for a drawing on each slide)' : ''}, each with real evidenced fields; ` +
        `section-dividers are exempt.`;
}

export function measureDeckExhibits(replyText: string): { exhibits: number; flowcharts: number; oversized: number[] } {
    let exhibits = 0, flowcharts = 0;
    const oversized: number[] = [];
    for (const m of String(replyText || '').matchAll(/:::slide\s+template=(slides:[a-z0-9-]+)[^\n]*\n([\s\S]*?)\n:::/g)) {
        if (m[1] !== 'slides:infographic-exhibit') continue;
        exhibits++;
        try {
            const p = JSON.parse(m[2]);
            if (Array.isArray(p?.nodes) && Array.isArray(p?.edges) && p.nodes.length >= 3 && p.edges.length >= 2) {
                flowcharts++;
                if (p.nodes.length > FLOWCHART_MAX_NODES) oversized.push(p.nodes.length);
            }
        } catch { /* unparsable payload counts as an exhibit, not a flowchart */ }
    }
    return { exhibits, flowcharts, oversized };
}

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
    /** 2026-10-23 (owner: "zero diagrams which I asked for"): the user's message names a flowchart / diagram /
     *  decision tree / escalation path, so the deck must carry a flowchart exhibit. */
    requireFlowchart?: boolean;
    /** V2 (2026-08-07, sota-elevation plan): session-constraint override of the
     *  strategic-visual floor. Compiled from user directives ("include more
     *  graphics") by sessionConstraints.ts; deterministic enforcement of the
     *  user's ask, per [S] user-selections-trump-auto-ranking. Clamped 0.4-0.7. */
    visualQuotaFloor?: number;
    /** 2026-10-27 (owner: "for each slide ... a conceptual description for a workflow visualization"; run 40 drew a
     *  visual on most, not every, body slide because tables and stat tiles count as "visual"): when the user asks for a
     *  visualization on every slide, this share of research body slides must carry a DRAWN visual (a flow, flowchart
     *  exhibit, timeline, bar chart or quadrant). */
    drawnFloor?: number;
    /** Fences that carry the user's attached document are the client's own slides: the drawn floor does not count them. */
    isAttachedFence?: (fence: string) => boolean;
}
/** Archetypes whose body is a drawn visual, not a table or a text grid. */
const DRAWN = new Set(['slides:infographic-exhibit', 'slides:flow-arc', 'slides:milestone-timeline', 'slides:ranked-bars', 'slides:quadrant']);
/**
 * 2026-10-27 (run 44: an infographic-exhibit holding only before/after text panels counted as a drawing): an exhibit is
 * drawn when it carries a flowchart (nodes and edges) or a step flow; text panels, quote lists and stat tiles are not.
 */
export function isDrawnFence(template: string, body: string): boolean {
    if (!DRAWN.has(template)) return false;
    if (template !== 'slides:infographic-exhibit') return true;
    try {
        const p = JSON.parse(body);
        return (Array.isArray(p?.nodes) && p.nodes.length >= 3 && Array.isArray(p?.edges) && p.edges.length >= 2)
            || (Array.isArray(p?.steps) && p.steps.length >= 3);
    } catch { return false; }
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
    if ((counts['slides:numbered-themes'] || 0) > NUMBERED_THEMES_CAP) {
        report.violations.push(`slides:numbered-themes used ${counts['slides:numbered-themes']} times (max 2); regroup or move subjects to single-subject archetypes`);
    }

    // 4. Overuse: any body archetype more than 3 times.
    for (const [t, n] of Object.entries(counts)) {
        // 2026-10-27: a deck the user asked to draw slide by slide may carry up to five exhibits (flowcharts, process
        // flows, contrasts and compositions read as different pictures); every other archetype keeps the cap of three.
        const cap = t === 'slides:infographic-exhibit' && (opts.drawnFloor || 0) >= 1 ? INFOGRAPHIC_CAP_DRAWN : BODY_ARCHETYPE_CAP;
        if (!CONNECTIVE.has(t) && n > cap) {
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

    // 5b. DRAWN FLOOR (2026-10-27): a per-slide visualization ask is met by drawings, counted on the research slides.
    if (opts.drawnFloor && opts.drawnFloor > 0) {
        const fences = [...(replyText || '').matchAll(FENCE_RE)].filter(m => !CONNECTIVE.has(m[1]) && !(opts.isAttachedFence && opts.isAttachedFence(m[0])));
        const research = fences.map(m => m[1]);
        const drawn = fences.filter(m => isDrawnFence(m[1], m[3]));
        // 2026-10-27 (run 43: 7 of 11 research slides drawn at a 60% floor; the user asked for a visualization on EACH
        // slide): the floor can be every research body slide.
        const floor = Math.min(1, Math.max(0.3, opts.drawnFloor));
        if (research.length >= 4 && drawn.length / research.length < floor) {
            const plain = [...new Set(fences.filter(m => !isDrawnFence(m[1], m[3])).map(m => (m[1] === 'slides:infographic-exhibit' ? 'slides:infographic-exhibit (text panels)' : m[1])))];
            report.violations.push(
                `only ${drawn.length} of ${research.length} research body slides carry a DRAWN visual (${Math.round((drawn.length / research.length) * 100)}%; floor ${Math.round(floor * 100)}%: the user asked for a workflow visualization on each slide). ` +
                `Redraw slides (${plain.join(', ')}) as drawings of their own content: a sequence or loop -> slides:flow-arc; a process, decision or system -> slides:infographic-exhibit with a flowchart (nodes and labelled edges from the slide's own words); phased time -> slides:milestone-timeline; a ranking -> slides:ranked-bars; positioning -> slides:quadrant. Keep each slide's evidence and quotes in its fields.`);
        }
    }

    // 6. Connective padding: a deck that is mostly transitions is empty.
    if (templates.length >= 8 && body.length < templates.length * 0.6) {
        report.violations.push(`${templates.length - body.length} of ${templates.length} slides are connective (cover/agenda/divider/thesis); substance belongs in body archetypes`);
    }

    // 6b. DIAGRAM FLOOR (2026-10-23, owner: "there are zero diagrams which I asked for"): a deck with real body
    //     length carries at least one NATIVE EXHIBIT (slides:infographic-exhibit: flowchart / process-flow /
    //     stat-row / comparison / composition), two from nine body slides; a request that names a flowchart or
    //     diagram carries a flowchart exhibit (nodes + edges). Tables and panels are visual, not diagrams.
    {
        const ex = measureDeckExhibits(replyText);
        const want = body.length >= 9 ? 2 : (body.length >= 6 ? 1 : 0);
        if (want && ex.exhibits < want) {
            report.violations.push(`diagram floor: ${ex.exhibits} native exhibit slide(s) for ${body.length} body slides (floor ${want}). Add slides:infographic-exhibit slide(s) drawn from the evidence: a FLOWCHART (nodes with kinds step|decision|system|actor|outcome, labeled edges, optional groups) for any branching path, hand-off or escalation; a process-flow for a plain sequence; a stat-row for cited figures; a composition for a mix. Convert the slide whose content has that shape; never add a decorative one.`);
        }
        for (const n of ex.oversized) {
            report.violations.push(`a flowchart carries ${n} nodes; at more than ${FLOWCHART_MAX_NODES} its labels cannot be read in the exhibit slot. Condense it to ${FLOWCHART_MAX_NODES} or fewer nodes: merge consecutive steps owned by the same actor into one node, keep every decision and every hand-off between actors, and keep the edge labels.`);
        }
        if (opts.requireFlowchart && ex.flowcharts === 0) {
            report.violations.push('the request asks for a flowchart / diagram and the deck carries none: add ONE slides:infographic-exhibit whose payload has nodes (3-8, kinds step|decision|system|actor|outcome|input) and edges (2-24, labeled with the condition or hand-off), drawn from the evidence; optional groups for teams or systems; direction TB for a decision tree.');
        }
    }

    // 7. DENSITY FLOOR (2026-10-23): every body slide carries real reading matter, and in a corpus-grounded
    //    deck every body slide binds at least one manifest pointer. Listed per slide (first six), so the re-ask
    //    fills the named slides instead of rewriting the deck.
    const density = measureDeckDensity(replyText);
    const thin = density.filter(d => d.chars < d.floor);
    if (thin.length) {
        const named = thin.slice(0, 6).map(d => `slide ${d.index} ${d.template} (${d.chars} chars, floor ${d.floor})`).join('; ');
        report.violations.push(
            `${thin.length} body slide(s) are under the density floor: ${named}${thin.length > 6 ? `; and ${thin.length - 6} more` : ''}. ` +
            'Fill EVERY field of each payload contract with complete sentences of substance (actor, mechanism, named evidence), never bare labels or phrases; keep the archetype.');
    }
    const totalPointers = density.reduce((n, d) => n + d.pointers, 0);
    if (totalPointers >= 3) {
        const unbound = density.filter(d => d.pointers === 0);
        if (unbound.length) {
            const named = unbound.slice(0, 6).map(d => `slide ${d.index} ${d.template}`).join('; ');
            report.violations.push(`${unbound.length} body slide(s) bind no manifest pointer: ${named}${unbound.length > 6 ? `; and ${unbound.length - 6} more` : ''}. Every factual field carries its [path#cN] pointer inside the string, and sourceLine names the source with its pointer.`);
        }
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


/**
 * 2026-10-23 DIAGRAM FLOOR fallback: when the model's re-ask still carries no native exhibit (or no flowchart on a
 * request that named one), the first step sequence in the deck (flow-arc, or milestone-timeline) becomes a
 * slides:infographic-exhibit FLOWCHART: every step a node, a linear edge chain, the outcome an outcome node, the
 * step descriptions kept as `steps` so the fail-visible base layout renders cards until the native panel lands.
 * Lossless on content; the archetype changes from cards to a drawn diagram.
 */
export function remapForDiagramFloor(replyText: string): RemapResult {
    const remapped: RemapResult['remapped'] = [];
    let done = false;
    let index = -1;
    const text = String(replyText || '').replace(FENCE_RE, (whole, template: string, attrs: string, body: string) => {
        index++;
        if (done || (template !== 'slides:flow-arc' && template !== 'slides:milestone-timeline')) return whole;
        let p: any;
        try { p = JSON.parse(body); } catch { return whole; }
        const items: any[] = Array.isArray(p?.steps) ? p.steps : (Array.isArray(p?.milestones) ? p.milestones : []);
        const steps = items.map((it: any) => ({
            title: String(it?.title || it?.name || '').trim(),
            description: String(it?.description || it?.detail || '').trim(),
        })).filter((x: any) => x.title);
        if (steps.length < 3) return whole;
        const nodes = steps.map((st: any, i: number) => ({ id: `s${i + 1}`, label: st.title.slice(0, 60), kind: i === 0 ? 'input' : 'step' }));
        const edges = steps.slice(1).map((st: any, i: number) => ({ from: `s${i + 1}`, to: `s${i + 2}`, label: String(steps[i].description || '').split(/[.;:]/)[0].slice(0, 40) }));
        const outcome = String(p?.outcome || p?.takeaway?.statement || '').trim();
        if (outcome) { nodes.push({ id: 'out', label: outcome.slice(0, 60), kind: 'outcome' }); edges.push({ from: `s${steps.length}`, to: 'out', label: '' }); }
        const next = {
            kicker: p.kicker || '', title: p.title || '',
            nodes, edges, direction: 'LR', steps,
            takeaway: p.takeaway && typeof p.takeaway === 'object' ? p.takeaway : { label: 'OUTCOME', statement: outcome || String(p.title || '') },
            sourceLine: p.sourceLine || '',
        };
        done = true;
        remapped.push({ index, from: template, to: 'slides:infographic-exhibit' });
        return `:::slide template=slides:infographic-exhibit${attrs}\n${JSON.stringify(next, null, 2)}\n:::`;
    });
    return { text, remapped };
}

/**
 * 2026-10-27 (run 43: the deck-wide repair lifted drawn research slides to 7 of 11 and stopped; the user asked for a
 * workflow visualization on each slide): the research body slides that still carry no drawing, by fence order, so a
 * focused second pass redraws only those slides instead of re-writing the whole deck.
 */
export function plainResearchFences(replyText: string, opts: DeckPlanGateOptions = {}): Array<{ order: number; template: string; fence: string }> {
    const out: Array<{ order: number; template: string; fence: string }> = [];
    let order = -1;
    for (const m of String(replyText || '').matchAll(FENCE_RE)) {
        order++;
        const t = m[1];
        if (CONNECTIVE.has(t) || isDrawnFence(t, m[3])) continue;
        if (opts.isAttachedFence && opts.isAttachedFence(m[0])) continue;
        out.push({ order, template: t, fence: m[0] });
    }
    return out;
}

/** The share of research body slides that carry a drawn visual (1 when there are none to count). */
export function drawnShare(replyText: string, opts: DeckPlanGateOptions = {}): number {
    const fences = [...String(replyText || '').matchAll(FENCE_RE)].filter(m => !CONNECTIVE.has(m[1]) && !(opts.isAttachedFence && opts.isAttachedFence(m[0])));
    return fences.length ? fences.filter(m => isDrawnFence(m[1], m[3])).length / fences.length : 1;
}

/** The redraw request for the plain research slides: each comes back as a drawn archetype of its OWN content. */
export function buildRedrawInstruction(plain: Array<{ fence: string }>): string {
    return [
        `The user asked for a workflow visualization on EACH slide. These ${plain.length} research slide(s) are not drawn yet.`,
        'Redraw EACH one as a drawing of its own content. Keep its kicker, its action title, its evidence, its quotes, its takeaway, its sourceLine and every [path#cN] pointer; change the archetype and shape the same facts into the drawing:',
        '- a sequence or loop -> slides:flow-arc (steps with title and description);',
        '- a process, decision, hand-off or system -> slides:infographic-exhibit with a flowchart: nodes (kinds step | decision | system | actor | outcome | input, at most 9) and labelled edges written from the slide\'s own words;',
        '- a before/after or us/them contrast -> slides:infographic-exhibit with a flowchart that draws the two paths side by side (groups "Today" and "With NXT", or the two named options), never two text panels;',
        '- phased time -> slides:milestone-timeline; a ranking -> slides:ranked-bars; positions on two axes -> slides:quadrant.',
        'No figure appears outside a quoted, sourced line. Return EXACTLY one :::slide fence per slide below, in the same order, and nothing else.',
        '',
        ...plain.map((p, i) => `SLIDE ${i + 1}:\n${p.fence}`),
    ].join('\n');
}

/** Splice redrawn fences back in place of the plain ones (by fence order). A reply fence that is not a drawn archetype
 *  or whose payload does not parse leaves the original slide standing. */
export function spliceRedrawnFences(replyText: string, plain: Array<{ order: number }>, redrawReply: string): { text: string; replaced: number } {
    const fresh = [...String(redrawReply || '').matchAll(FENCE_RE)];
    const byOrder = new Map<number, string>();
    plain.forEach((p, i) => {
        const f = fresh[i];
        if (!f || !isDrawnFence(f[1], f[3])) return;
        try { JSON.parse(f[3]); } catch { return; }
        byOrder.set(p.order, f[0]);
    });
    if (!byOrder.size) return { text: replyText, replaced: 0 };
    let order = -1;
    const text = String(replyText || '').replace(FENCE_RE, (whole) => { order++; return byOrder.get(order) ?? whole; });
    return { text, replaced: byOrder.size };
}
