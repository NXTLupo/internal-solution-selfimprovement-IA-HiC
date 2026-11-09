// deckLoop.ts - WS-4 (2026-10-30, plan harness-capability-curve-uplift, clause 3: the model verifies its own
// rendered output).
//
// Two tools the deck model holds during a DECK MODE turn, and the verdict they return in the SAME conversation:
//
//   render_slide  - one :::slide fence in, the composed 1920x1080 slide measured in the proxy's Chromium (the engine
//                   the PPTX export renders with) out: overflow, clipping, collisions, dead space, the items the
//                   composer could not draw, and a screenshot the model can look at.
//   submit_deck   - the whole deck in; the harness runs the deck plan gate, the density floor, pointer binding and
//                   the layout measurement IN PARALLEL, joins them, and answers with a scored verdict that names the
//                   slide and the exact failing text. The model revises and resubmits. The accepted submission IS the
//                   deliverable (no re-emission). After DECK_LOOP_MAX_SUBMISSIONS the deck is accepted with its open
//                   findings and the run routes to `ask_user`: the chat shows a card with the findings and three
//                   choices. A gate error is a finding, never a pass.
//
// Before this, the deck gate re-asked in a NEW conversation (`history: []`), so the repair model never saw its own
// reasoning, and the layout gate ran after the reply shipped, so the model never saw a measurement at all.

import {
    evaluateDeckPlan, measureDeckDensity, noteDeckPlanVerdict, verdictOf,
    type DeckPlanGateOptions, type DeckPlanReport,
} from './deckPlanGate';
import { measureViaProxy, hasLayoutFailure, noteLayoutVerdict, summarizeLayoutGate, type SlideLayoutDefects } from './layoutGate';
import { bindPointers, readGroundingChunks } from './pointerBinder';
import { recordStep, advanceRunGoal } from './runState';
import { recordJudgeVerdict } from './judgeRegistry';
import { enterNode, recordFanOut } from './workflowTable';
import { normalizeBrandId } from '../components/slideTemplates/brands';

export const DECK_LOOP_MAX_SUBMISSIONS = 3;

// ---------------------------------------------------------------------------------------------- tool definitions
export const RENDER_SLIDE_TOOL = {
    name: 'render_slide',
    description: `Compose ONE :::slide fence into its real 1920x1080 slide and measure it in the same browser engine the PowerPoint export uses. Returns text that runs off the canvas, text clipped inside its box, text boxes or pictures that collide, hairlines through text, the share of empty canvas, the items the archetype could not draw (a five-item list on a four-box template), and a screenshot of the composed slide for you to inspect.

Call it on every DENSE slide before you submit (tables, infographics, four-item rows, long quotes, timelines) and on any slide you are unsure fits. Fix what it reports in the payload (shorter text, fewer items, a different archetype), then re-render until the slide measures clean.`,
    input_schema: {
        type: 'object',
        properties: {
            fence: { type: 'string', description: 'The complete fence, from ":::slide template=slides:<archetype> brand=<brand>" through the closing ":::".' },
            position: { type: 'number', description: 'OPTIONAL: the slide\'s 0-based position in the deck (drives divider art rotation). Default 0.' },
        },
        required: ['fence'],
    },
};

export const SUBMIT_DECK_TOOL = {
    name: 'submit_deck',
    description: `Submit the COMPLETE deck (every :::slide fence, in order, with the :::thesis-options block ahead of the first fence when the contract asks for one). The harness checks the deck plan (archetype variety, caps, the visual floor), the substance floor per slide, pointer binding (which factual fields the runtime can tie to a manifest chunk) and the rendered layout of every slide, all at once, and returns ONE verdict naming each failing slide and the exact text at fault.

When the verdict says accepted, STOP: the submitted deck is the deliverable; do not print it again. When it is not accepted, revise ONLY what the verdict names (keep every other field verbatim) and call submit_deck again with the full deck. You have ${DECK_LOOP_MAX_SUBMISSIONS} submissions; after the last one the deck ships with its open findings shown to the user.`,
    input_schema: {
        type: 'object',
        properties: {
            deck: { type: 'string', description: 'The full deck text: optional :::thesis-options block, then every :::slide fence in order.' },
            note: { type: 'string', description: 'OPTIONAL: one sentence on what changed since the previous submission.' },
        },
        required: ['deck'],
    },
};

// ------------------------------------------------------------------------------------------------- fence parsing
export interface ParsedFence {
    order: number;
    template: string;
    brand: string;
    payload: any;
    fence: string;
    parseError?: string;
}

const FENCE_RE = /:::slide((?:\s+[a-z]+=[a-z:-]+)*)\s*\n([\s\S]*?):::/g;

/** The deck's fences, in order. A fence whose JSON does not parse is kept with its error (a finding, not a drop). */
export function parseDeckFences(text: string): ParsedFence[] {
    const src = String(text || '')
        .replace(/:{6,}\s*slide\b/g, '\n:::\n:::slide')
        .replace(/:{4,5}\s*slide\b/g, '\n:::slide');
    const out: ParsedFence[] = [];
    let m: RegExpExecArray | null;
    let i = 0;
    FENCE_RE.lastIndex = 0;
    while ((m = FENCE_RE.exec(src)) !== null) {
        const attrs = m[1] || '';
        const template = (attrs.match(/\btemplate=([a-z:-]+)/i)?.[1] || '').toLowerCase();
        const brand = normalizeBrandId((attrs.match(/\bbrand=([a-z]+)/i)?.[1] || 'nxt').toLowerCase());
        let payload: any = null;
        let parseError: string | undefined;
        try { payload = JSON.parse(m[2].trim()); } catch (e: any) { parseError = String(e?.message || e).slice(0, 120); }
        out.push({ order: i++, template, brand, payload, fence: m[0], parseError });
    }
    return out;
}

function slideLikeOf(f: ParsedFence, idPrefix = 'loop'): any {
    const p = f.payload && typeof f.payload === 'object' ? f.payload : {};
    return {
        id: `${idPrefix}_${f.order}`,
        template: f.template,
        brand: f.brand,
        title: String(p.title || p.thesis || p.statement || p.supporting || p.quote?.text || ''),
        composerPayload: p,
    };
}

function labelOf(f: ParsedFence): string {
    const t = f.template.replace(/^slides:/, '');
    const title = String(f.payload?.title || f.payload?.thesis || f.payload?.statement || '').slice(0, 60);
    return `slide ${f.order + 1} (${t}${title ? `: "${title}"` : ''})`;
}

// ------------------------------------------------------------------------------------------------- composition
/**
 * Compose every fence to its stage document. Pulled lazily so this module stays importable in tests that never
 * touch the DOM-sized composer. Returns `{ html, findings }` per fence; a fence that cannot compose carries the error.
 */
async function composeFences(fences: ParsedFence[]): Promise<Array<{ id: string; html: string; composerFindings: string[]; error?: string }>> {
    const [{ slideDataToStageHtml, deckPositions }, composer] = await Promise.all([
        import('./slideToStageHtml'), import('./slideComposer'),
    ]);
    const slides = fences.map(f => slideLikeOf(f));
    const positions = deckPositions(slides);
    return fences.map((f, i) => {
        const id = slides[i].id;
        if (f.parseError) return { id, html: '', composerFindings: [], error: `JSON does not parse: ${f.parseError}` };
        if (!f.template.startsWith('slides:')) return { id, html: '', composerFindings: [], error: `template "${f.template || '(none)'}" is not a slides: archetype` };
        composer.beginComposerFindings();
        try {
            const html = slideDataToStageHtml(slides[i], positions[i]);
            return { id, html, composerFindings: composer.takeComposerFindings() };
        } catch (e: any) {
            composer.takeComposerFindings();
            return { id, html: '', composerFindings: [], error: `compose failed: ${String(e?.message || e).slice(0, 120)}` };
        }
    });
}

// ------------------------------------------------------------------------------------------------- render_slide
export interface RenderSlideResult {
    text: string;
    screenshot?: { data: string; mime: string };
}

export async function executeRenderSlide(input: any): Promise<RenderSlideResult> {
    const fence = String(input?.fence || '');
    const parsed = parseDeckFences(fence);
    if (!parsed.length) return { text: 'render_slide: no :::slide fence found in the input. Pass the complete fence, opening line through the closing ":::".' };
    const f = { ...parsed[0], order: Math.max(0, Number(input?.position) || 0) };
    const [c] = await composeFences([f]);
    if (c.error) return { text: `render_slide: ${labelOf(f)} could not be composed. ${c.error}` };
    let measured: Record<string, SlideLayoutDefects & { screenshot?: string; screenshotMime?: string }> = {};
    try {
        measured = await measureViaProxy([{ id: c.id, html: c.html }], { screenshot: true }) as any;
    } catch (e: any) {
        return { text: `render_slide: ${labelOf(f)} composed, but the measurement engine is unavailable (${String(e?.message || e).slice(0, 100)}). Composer notes: ${c.composerFindings.join('; ') || 'none'}.` };
    }
    const d = measured[c.id];
    recordStep({ stage: 'tool', tool: 'render_slide', note: `${labelOf(f)}: ${d ? describeDefects(d) : 'no measurement'}` });
    if (!d) return { text: `render_slide: ${labelOf(f)} composed, but the engine returned no measurement. Composer notes: ${c.composerFindings.join('; ') || 'none'}.` };
    const lines = [
        `render_slide verdict for ${labelOf(f)}: ${hasLayoutFailure(d) || c.composerFindings.length ? 'NOT CLEAN' : 'clean'}.`,
        describeDefects(d),
        ...(c.composerFindings.length ? [`Composer could not draw: ${c.composerFindings.join('; ')}.`] : []),
        ...(d.details.length ? ['Details:', ...d.details.slice(0, 12).map(x => `  - ${x}`)] : []),
        d.screenshot ? 'The screenshot of the composed slide follows; check that every text block is readable and nothing sits on a picture or a rule.' : '',
    ].filter(Boolean);
    return { text: lines.join('\n'), ...(d.screenshot ? { screenshot: { data: d.screenshot, mime: d.screenshotMime || 'image/jpeg' } } : {}) };
}

function describeDefects(d: SlideLayoutDefects): string {
    return `off-canvas ${d.offCanvas}, clipped ${d.clipped}, collisions ${d.overlaps}, citation fragments ${d.fragments}, empty canvas ${Math.round((d.deadSpace || 0) * 100)}%`;
}

// ------------------------------------------------------------------------------------------------- submit_deck
export interface DeckFinding {
    slide: number | null;      // 1-based, null for deck-level
    rule: 'plan' | 'density' | 'pointers' | 'layout' | 'compose' | 'gate-error';
    text: string;
}

export interface DeckVerdict {
    accepted: boolean;
    /** Submission number (1-based) this verdict answers. */
    submission: number;
    /** True when the loop is over: accepted, or the submission budget is spent. */
    final: boolean;
    /** The budget was spent and the deck ships with open findings; the run routes to ask_user. */
    exhausted: boolean;
    score: number;
    findings: DeckFinding[];
    plan: DeckPlanReport | null;
    layout: { measured: number; failing: number };
    pointers: { bound: number; unbound: number };
    deck: string;
}

export interface DeckLoopState {
    active: boolean;
    gateOpts: DeckPlanGateOptions;
    submissions: number;
    verdicts: DeckVerdict[];
    /** The deck text the harness accepted (or shipped on exhaustion). */
    acceptedDeck: string | null;
}

let _state: DeckLoopState = { active: false, gateOpts: {}, submissions: 0, verdicts: [], acceptedDeck: null };

/** Arm the loop for the current DECK MODE turn. Called by sendChatMessage before the model call. */
export function beginDeckLoop(gateOpts: DeckPlanGateOptions): void {
    _state = { active: true, gateOpts, submissions: 0, verdicts: [], acceptedDeck: null };
}
export function endDeckLoop(): void { _state = { ..._state, active: false }; }
export function deckLoopActive(): boolean { return _state.active; }
export function readDeckLoop(): DeckLoopState { return _state; }
export function lastDeckVerdict(): DeckVerdict | null { return _state.verdicts[_state.verdicts.length - 1] || null; }
export function _resetDeckLoopForTests(): void { _state = { active: false, gateOpts: {}, submissions: 0, verdicts: [], acceptedDeck: null }; }

/** Pure: the verdict for one deck text. Exported so the gate path and the eval lane score the same way. */
export async function judgeDeck(deck: string, gateOpts: DeckPlanGateOptions, opts: { measure?: boolean } = {}): Promise<Omit<DeckVerdict, 'submission' | 'final' | 'exhausted'>> {
    const findings: DeckFinding[] = [];
    const fences = parseDeckFences(deck);
    if (fences.length < 2) {
        findings.push({ slide: null, rule: 'plan', text: `only ${fences.length} :::slide fence(s) found; a deck is several fences in order` });
    }

    // 1. plan gate (sync) and 2. density floor (sync), 3. pointer binding (sync, in-memory chunks), 4. layout (async)
    const planP = (async () => { try { return evaluateDeckPlan(deck, gateOpts); } catch (e: any) { findings.push({ slide: null, rule: 'gate-error', text: `deck plan gate failed: ${String(e?.message || e).slice(0, 120)}` }); return null; } })();
    const densityP = (async () => { try { return measureDeckDensity(deck); } catch (e: any) { findings.push({ slide: null, rule: 'gate-error', text: `density floor failed: ${String(e?.message || e).slice(0, 120)}` }); return []; } })();
    const pointersP = (async () => {
        try {
            const pool = readGroundingChunks();
            if (!pool.length) return { bound: 0, unbound: 0, unboundFields: [] as Array<{ slideId: string; field: string; reason: string }> };
            const slides = fences.filter(f => !f.parseError).map(f => slideLikeOf(f));
            const { report } = bindPointers(slides as any, pool);
            return { bound: report.bound.length, unbound: report.unbound.length, unboundFields: report.unbound };
        } catch (e: any) {
            findings.push({ slide: null, rule: 'gate-error', text: `pointer binding failed: ${String(e?.message || e).slice(0, 120)}` });
            return { bound: 0, unbound: 0, unboundFields: [] };
        }
    })();
    const layoutP = (async () => {
        if (opts.measure === false) return { measured: 0, failing: 0, byId: {} as Record<string, SlideLayoutDefects>, composed: [] as Awaited<ReturnType<typeof composeFences>> };
        const composed = await composeFences(fences);
        for (const c of composed) {
            const f = fences.find(x => `loop_${x.order}` === c.id)!;
            if (c.error) findings.push({ slide: f.order + 1, rule: 'compose', text: `${labelOf(f)}: ${c.error}` });
            for (const n of c.composerFindings) findings.push({ slide: f.order + 1, rule: 'compose', text: `${labelOf(f)}: ${n}` });
        }
        const toMeasure = composed.filter(c => c.html).map(c => ({ id: c.id, html: c.html }));
        let byId: Record<string, SlideLayoutDefects> = {};
        try { byId = toMeasure.length ? await measureViaProxy(toMeasure) : {}; }
        catch (e: any) { findings.push({ slide: null, rule: 'gate-error', text: `layout measurement unavailable: ${String(e?.message || e).slice(0, 120)}` }); }
        let failing = 0;
        for (const f of fences) {
            const d = byId[`loop_${f.order}`];
            if (!d) continue;
            if (hasLayoutFailure(d)) {
                failing++;
                findings.push({ slide: f.order + 1, rule: 'layout', text: `${labelOf(f)}: ${describeDefects(d)}${d.details.length ? `; ${d.details.slice(0, 3).join('; ')}` : ''}` });
            }
        }
        return { measured: Object.keys(byId).length, failing, byId, composed };
    })();

    const [plan, density, pointers, layout] = await Promise.all([planP, densityP, pointersP, layoutP]);

    if (plan && plan.isDeck) {
        for (const v of plan.violations) findings.push({ slide: null, rule: 'plan', text: v });
    }
    // measureDeckDensity numbers fences from 1 (connective slides counted, not judged)
    for (const row of density) {
        if (row.chars < row.floor) {
            const f = fences[row.index - 1];
            findings.push({ slide: row.index, rule: 'density', text: `${f ? labelOf(f) : `slide ${row.index}`} carries ${row.chars} characters of substance against a floor of ${row.floor} for ${row.template}; add the evidence line, the mechanism or the named actor, or merge it into a neighbour` });
        }
    }
    // pointers: a finding only when the binder could tie fewer than 60% of factual fields (the registered threshold)
    const considered = pointers.bound + pointers.unbound;
    if (considered >= 4 && pointers.bound / considered < 0.6) {
        const sample = pointers.unboundFields.slice(0, 6).map(u => {
            const idx = Number(String(u.slideId).replace(/^loop_/, ''));
            const f = fences[idx];
            return `${f ? labelOf(f) : u.slideId} field ${u.field} (${u.reason})`;
        });
        findings.push({ slide: null, rule: 'pointers', text: `only ${pointers.bound} of ${considered} factual fields could be tied to a manifest chunk; copy the corpus block's [path#cN] pointer into each factual field. Unbound: ${sample.join('; ')}` });
    }

    // score: each dimension 0..1, weighted; plan 0.3, layout 0.3, density 0.2, pointers 0.1, compose 0.1
    const slides = Math.max(1, fences.length);
    const planScore = plan && plan.isDeck ? Math.max(0, 1 - plan.violations.length / slides) : (fences.length >= 2 ? 1 : 0);
    const layoutScore = layout.measured ? 1 - layout.failing / layout.measured : (findings.some(f => f.rule === 'gate-error' && /layout/.test(f.text)) ? 0 : 1);
    const densityScore = 1 - Math.min(slides, density.filter(r => r.chars < r.floor).length) / slides;
    const pointerScore = considered ? pointers.bound / considered : 1;
    const composeScore = 1 - Math.min(slides, findings.filter(f => f.rule === 'compose').length) / slides;
    const score = Number((0.3 * planScore + 0.3 * layoutScore + 0.2 * densityScore + 0.1 * pointerScore + 0.1 * composeScore).toFixed(3));

    // acceptance at the registered thresholds: plan clean, every measured slide clean, no compose or gate errors,
    // density floor met on every slide, binding at or above 0.6 when there were fields to bind
    const accepted = findings.length === 0;
    return {
        accepted, score, findings, plan,
        layout: { measured: layout.measured, failing: layout.failing },
        pointers: { bound: pointers.bound, unbound: pointers.unbound },
        deck,
    };
}

/** The tool: judge, count the submission, decide whether the loop is over, record everything on the run. */
export async function executeSubmitDeck(input: any): Promise<{ text: string; verdict: DeckVerdict }> {
    const deck = String(input?.deck || '');
    _state.submissions += 1;
    const n = _state.submissions;
    const t0 = Date.now();
    // WS-6 M3: verify is the parallel node of the artifact workflow; route follows it; repair when the verdict sends it back
    enterNode('artifact', 'verify', `submission ${n}`);
    const j = await judgeDeck(deck, _state.gateOpts);
    recordFanOut('artifact', 'verify', ['deckPlanGate', 'densityFloor', 'pointerBinder', 'layoutMeasure'], Date.now() - t0);
    const exhausted = !j.accepted && n >= DECK_LOOP_MAX_SUBMISSIONS;
    const verdict: DeckVerdict = { ...j, submission: n, final: j.accepted || exhausted, exhausted };
    enterNode('artifact', 'route', j.accepted ? 'accepted' : exhausted ? 'budget spent -> ask' : 'findings -> repair');
    if (!verdict.final) enterNode('artifact', 'repair', `${j.findings.length} finding(s) back to the model`);
    _state.verdicts.push(verdict);
    if (verdict.final) _state.acceptedDeck = deck;

    recordStep({ stage: 'tool', tool: 'submit_deck', elapsed_ms: Date.now() - t0, note: `submission ${n}: ${j.accepted ? 'accepted' : `${j.findings.length} finding(s)`}; score ${j.score}` });
    // 2026-10-31 (live deck turn): these verdicts reached the run record only and never the eval store, so the
    // rescore and agreement jobs could not see the loop's own judges. recordJudgeVerdict writes both.
    recordJudgeVerdict({ judge_id: 'deckLoop.submit', score: j.score, pass: j.accepted, detail: j.findings.slice(0, 8).map(f => f.text).join(' | ') });
    if (j.plan) {
        const planPass = j.plan.violations.length === 0;
        recordJudgeVerdict({ judge_id: 'deckPlanGate', score: j.plan.isDeck ? Math.max(0, 1 - j.plan.violations.length / Math.max(1, j.plan.templates.length)) : 1, pass: planPass, detail: j.plan.violations.slice(0, 5).join(' | ') });
    }
    if (j.layout.measured) recordJudgeVerdict({ judge_id: 'layoutGate', score: 1 - j.layout.failing / j.layout.measured, pass: j.layout.failing === 0, detail: `${j.layout.failing} of ${j.layout.measured} slides fail layout` });

    if (verdict.final) {
        // the deck plan and layout verdicts the AIR reads come from the accepted submission
        try {
            if (j.plan) noteDeckPlanVerdict(verdictOf(j.plan, j.plan.violations.length === 0 ? 'pass' : (n > 1 ? 'model_repair' : 'unrepaired')));
            if (j.layout.measured) {
                const rows = Object.entries(_lastLayoutById(deck, j)).map(([id, d]) => ({ slideId: id, before: d }));
                noteLayoutVerdict(summarizeLayoutGate(rows));
            }
        } catch { /* the verdict text is the record of last resort */ }
        if (exhausted) {
            advanceRunGoal({ advanced: true, needsUser: true, note: `deck accepted after ${n} submissions with ${j.findings.length} open finding(s); the user decides` });
        }
    }

    const head = j.accepted
        ? `submit_deck: ACCEPTED (submission ${n}, score ${j.score}). The submitted deck is the deliverable. Stop here; do not print the deck again.`
        : exhausted
            ? `submit_deck: submission ${n} of ${DECK_LOOP_MAX_SUBMISSIONS} (score ${j.score}). The submission budget is spent; the deck ships as submitted and the user sees the open findings below. Stop here; do not print the deck again.`
            : `submit_deck: NOT ACCEPTED (submission ${n} of ${DECK_LOOP_MAX_SUBMISSIONS}, score ${j.score}). Revise ONLY the slides and fields named below, keep everything else verbatim, then call submit_deck again with the full deck.`;
    const body = j.findings.length
        ? ['Findings:', ...j.findings.slice(0, 40).map(f => `  - [${f.rule}] ${f.text}`)]
        : ['No findings.'];
    const stats = `Checked: plan ${j.plan?.isDeck ? `${j.plan.templates.length} slides, ${j.plan.violations.length} violation(s), visual ratio ${Math.round(j.plan.visualRatio * 100)}%` : 'n/a'}; layout ${j.layout.measured} measured, ${j.layout.failing} failing; pointers ${j.pointers.bound} bound, ${j.pointers.unbound} unbound.`;
    return { text: [head, stats, ...body].join('\n'), verdict };
}

// the layout measurement is not kept per verdict (the html is large); rebuild the receipt rows from the verdict's findings
function _lastLayoutById(_deck: string, j: Omit<DeckVerdict, 'submission' | 'final' | 'exhausted'>): Record<string, SlideLayoutDefects> {
    const out: Record<string, SlideLayoutDefects> = {};
    const fences = parseDeckFences(_deck);
    for (const f of fences) {
        const id = `loop_${f.order}`;
        const fail = j.findings.find(x => x.rule === 'layout' && x.slide === f.order + 1);
        out[id] = { slideId: id, offCanvas: 0, clipped: 0, overlaps: fail ? 1 : 0, fragments: 0, deadSpace: 0, details: fail ? [fail.text] : [] };
    }
    return out;
}

// ------------------------------------------------------------------------------------------------- the ask card
export interface DeckAskCard {
    submissions: number;
    score: number;
    findings: string[];
    /** The three choices the plan names. */
    choices: Array<{ id: 'accept' | 'narrow' | 'guide'; label: string; detail: string }>;
}

/** The card the chat shows when the loop spent its budget: the user, not the harness, decides. */
export function buildDeckAskCard(v: DeckVerdict): DeckAskCard {
    return {
        submissions: v.submission,
        score: v.score,
        findings: v.findings.slice(0, 12).map(f => f.text),
        choices: [
            { id: 'accept', label: 'Accept as is', detail: 'Keep the deck with these findings open; they stay in the record.' },
            { id: 'narrow', label: 'Narrow the scope', detail: 'Drop the slides the findings name and reflow the deck around what passed.' },
            { id: 'guide', label: 'Give guidance', detail: 'Tell the model what to change; it revises against the same findings.' },
        ],
    };
}

/** The follow-up message a choice sends (the panel pre-fills it; the user may edit before sending). */
export function deckAskFollowUp(choice: DeckAskCard['choices'][number]['id'], card: DeckAskCard): string {
    const named = card.findings.map(f => `- ${f}`).join('\n');
    if (choice === 'narrow') return `#slides Revise the last deck: remove or merge the slides these findings name and reflow the argument around the slides that passed; keep every other slide verbatim.\n${named}`;
    if (choice === 'guide') return `#slides Revise the last deck against these findings. Guidance: `;
    return '';
}
