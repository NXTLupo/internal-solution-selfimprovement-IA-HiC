/**
 * E2.2 (2026-08-21). CANDIDATE THESES, AND A REAL CHOICE.
 *
 * From `writing-shape`: "Draft 2-3 candidate openings. Each opening should imply a
 * different thesis... Force the user to pick." HiC already believes the underlying idea
 * (`verbalized-sampling` exists precisely because a single first answer collapses toward
 * the conventional one), but it applies that belief to slide narrative, not to the one
 * sentence the whole deck argues.
 *
 * That is the wrong place to skip it. DECK MODE tells the model to decide a thesis and
 * then ladder every slide up to it, so the thesis decides the deck. A thesis chosen
 * silently is the single highest-leverage unreviewed decision in the pipeline.
 *
 * Two things follow, and both matter:
 *   1. The user sees the alternatives and can take one, instead of receiving whichever
 *      framing the model reached for first.
 *   2. The rejected candidates are RECORDED. A rejected thesis beside a chosen one is
 *      genuine preference data, which is what SkillOpt has never had: today it infers
 *      preference from edits after the fact.
 *
 * Deterministic parsing and validation, no model call.
 */

export interface ThesisCandidate {
    /** Stable index, 1-based, as the model emitted them. */
    id: number;
    /** The contestable sentence itself. */
    thesis: string;
    /** What the deck becomes if this thesis is chosen: the argument it implies. */
    implies: string;
    /** True for the one the deck actually used. */
    chosen: boolean;
}

export interface ThesisOptionsReport {
    candidates: ThesisCandidate[];
    /** Whether the model met the contract: three distinct candidates, one marked chosen. */
    valid: boolean;
    /** Why not, when it did not. */
    problems: string[];
}

/**
 * The fence the model emits before its slides:
 *
 *   :::thesis-options
 *   [{"thesis": "...", "implies": "...", "chosen": true}, ...]
 *   :::
 */
const FENCE_RE = /:::thesis-options\s*([\s\S]*?):::/i;

/** Titles differ but argue the same thing when their content words mostly overlap. */
function overlap(a: string, b: string): number {
    const norm = (t: string) => new Set(
        t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3),
    );
    const A = norm(a), B = norm(b);
    if (!A.size || !B.size) return 0;
    let shared = 0;
    A.forEach(w => { if (B.has(w)) shared++; });
    return shared / Math.min(A.size, B.size);
}

export function parseThesisOptions(text: string): ThesisOptionsReport {
    const problems: string[] = [];
    const m = FENCE_RE.exec(String(text || ''));
    if (!m) return { candidates: [], valid: false, problems: ['no thesis-options block was emitted'] };

    let raw: any;
    try {
        raw = JSON.parse(m[1].trim());
    } catch (e: any) {
        return { candidates: [], valid: false, problems: [`thesis-options block is not valid JSON: ${e?.message || e}`] };
    }
    if (!Array.isArray(raw)) return { candidates: [], valid: false, problems: ['thesis-options block is not an array'] };

    const candidates: ThesisCandidate[] = [];
    raw.forEach((c: any, i: number) => {
        const thesis = String(c?.thesis || '').trim();
        const implies = String(c?.implies || '').trim();
        if (!thesis) return;
        candidates.push({ id: i + 1, thesis, implies, chosen: c?.chosen === true });
    });

    if (candidates.length < 2) problems.push(`${candidates.length} candidate(s): the point is a choice, so at least two are required`);
    const chosen = candidates.filter(c => c.chosen);
    if (chosen.length === 0) problems.push('no candidate is marked chosen, so the deck does not say which thesis it argued');
    if (chosen.length > 1) problems.push(`${chosen.length} candidates marked chosen: a deck argues one thesis`);
    candidates.forEach(c => {
        if (!c.implies) problems.push(`candidate ${c.id} states a thesis with no implied argument, so there is nothing to choose between`);
    });

    // Three restatements of one idea is not a choice. This is the failure mode
    // verbalized-sampling exists to catch, and it applies to the thesis too.
    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            if (overlap(candidates[i].thesis, candidates[j].thesis) >= 0.7) {
                problems.push(`candidates ${candidates[i].id} and ${candidates[j].id} argue the same thing in different words`);
            }
        }
    }

    return { candidates, valid: problems.length === 0, problems };
}

/** The AIR record: the chosen thesis and, more usefully, the ones that were not. */
export interface ThesisAirRecord {
    chosen: string | null;
    rejected: Array<{ thesis: string; implies: string }>;
    valid: boolean;
    problems: string[];
}

export function buildThesisAirRecord(report: ThesisOptionsReport): ThesisAirRecord {
    const chosen = report.candidates.find(c => c.chosen) || null;
    return {
        chosen: chosen ? chosen.thesis : null,
        rejected: report.candidates.filter(c => !c.chosen).map(c => ({ thesis: c.thesis, implies: c.implies })),
        valid: report.valid,
        problems: report.problems,
    };
}

/** Remove the block before the payload is rendered: the reader sees a deck, not a menu. */
export function stripThesisOptions(text: string): string {
    return String(text || '').replace(FENCE_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * The follow-up a user sends to take a different thesis. Pinning it verbatim matters:
 * a paraphrase would hand the model back the same freedom the choice just removed.
 */
export function buildRecomposeDirective(candidate: ThesisCandidate): string {
    return `#slides Recompose the deck arguing this thesis verbatim, and ladder every slide up to it: "${candidate.thesis}"`;
}

/** The contract text injected into DECK MODE. */
export const THESIS_OPTIONS_CONTRACT = [
    'CANDIDATE THESES FIRST (before any slide fence):',
    '  A deck argues ONE contestable sentence, and that sentence decides every slide, so',
    '  it is not a decision to make silently. Emit exactly three candidates, each implying',
    '  a genuinely DIFFERENT argument from the same evidence, then mark the one this deck',
    '  argues and compose to it.',
    '  :::thesis-options',
    '  [{"thesis": "<contestable sentence>", "implies": "<what the deck argues if this wins>", "chosen": true},',
    '   {"thesis": "...", "implies": "...", "chosen": false},',
    '   {"thesis": "...", "implies": "...", "chosen": false}]',
    '  :::',
    '  Three restatements of one idea is not a choice and the runtime rejects it. Differ on',
    '  the CLAIM: which mechanism dominates, where the constraint really sits, which actor',
    '  must move. Each thesis obeys the title rules: short, literal, no metaphor.',
].join('\n');

// ---------------------------------------------------------------------------
// A DEDICATED CALL, because the embedded instruction was ignored
// ---------------------------------------------------------------------------

/**
 * E2.2 follow-up (2026-08-24). The first attempt put the thesis-options contract inside
 * DECK MODE and the live run came back with `no thesis-options block was emitted`. That
 * is the same failure the pointer binder hit: one paragraph inside a very large prompt
 * competes with everything else in it, and losing is the default outcome.
 *
 * So the alternatives get their own call, where they are the only thing being asked for.
 * The CHOSEN thesis is not generated here at all: it is the thesis the deck actually
 * argued, read off the deck. That ordering matters. Asking a model to pick after the fact
 * would produce a label with no relationship to the slides, while reading the deck's own
 * thesis means the chosen entry is true by construction and only the alternatives need
 * generating.
 *
 * Cheap by design: fast model, small token ceiling, two candidates, and a failure here
 * degrades to "no alternatives offered" rather than blocking the deck.
 */
export async function proposeAlternativeTheses(opts: {
    deckThesis: string;
    /** A few grounding spans, so an alternative is anchored in the same evidence. */
    evidence: string[];
    callAI: (body: any, options: any) => Promise<any>;
    model: string;
}): Promise<ThesisCandidate[]> {
    const thesis = String(opts.deckThesis || '').trim();
    if (!thesis) return [];

    const system = [
        'You produce ALTERNATIVE strategic theses from evidence a consulting deck already used.',
        'A thesis is ONE contestable sentence a reader could disagree with. Short, literal, no metaphor.',
        'Each alternative must argue a DIFFERENT claim from the same evidence: a different mechanism',
        'dominating, a different place the real constraint sits, or a different actor who must move.',
        'A restatement of the given thesis in other words is a failure.',
        'Reply with JSON only: [{"thesis": "...", "implies": "..."}, {"thesis": "...", "implies": "..."}]',
        'No em-dashes. No numbers unless they appear inside a quoted source sentence.',
    ].join('\n');

    const user = [
        `THE DECK ARGUED: "${thesis}"`,
        '',
        'EVIDENCE THE DECK USED:',
        ...opts.evidence.slice(0, 8).map(e => `- ${String(e).slice(0, 300)}`),
        '',
        'Give exactly two alternative theses the same evidence would also support.',
    ].join('\n');

    let raw: any;
    try {
        raw = await opts.callAI({
            model: opts.model,
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            // thinkingBudget 0 for the same truncation reason the field-rewrite call cites.
            config: { temperature: 0.7, maxOutputTokens: 900, responseMimeType: 'application/json', thinkingBudget: 0 },
            /**
             * This call fires immediately after a full deck generation, which is the
             * busiest the proxy ever is: the same request succeeds in about two seconds
             * against an idle proxy and returned nothing on a live run competing with the
             * deck's own embedding traffic. So the budget is generous and it retries.
             * A slow answer here costs a few seconds; no answer costs the whole feature.
             */
        }, { label: 'Alternative theses', maxAttempts: 3, requestTimeoutMs: 60_000 });
    } catch (e: any) {
        // Say WHY. A silent catch here is the same mistake the slop detector made earlier
        // in this program: the feature degrades to nothing and no log explains it, so the
        // next person cannot tell "the model declined" from "the call never happened".
        console.warn(`[thesis] alternative-thesis call failed, no alternatives offered: ${e?.message || e}`);
        return [];   // a missing choice is a smaller loss than a blocked deck
    }

    const parts = raw?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
        ? parts.map((p: any) => p?.text || '').join('')
        : (raw?.choices?.[0]?.message?.content ?? '');
    let parsed: any;
    try {
        parsed = JSON.parse(String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
    } catch {
        console.warn(`[thesis] alternative-thesis reply was not JSON (${String(text).slice(0, 80)})`);
        return [];
    }
    if (!Array.isArray(parsed)) {
        console.warn('[thesis] alternative-thesis reply was not an array');
        return [];
    }

    const chosen: ThesisCandidate = { id: 1, thesis, implies: 'The argument this deck makes.', chosen: true };
    const alternatives: ThesisCandidate[] = [];
    parsed.forEach((c: any) => {
        const t = String(c?.thesis || '').trim();
        if (!t) return;
        // Drop a restatement rather than presenting a choice that is not one.
        if (overlap(t, thesis) >= 0.7) return;
        alternatives.push({ id: alternatives.length + 2, thesis: t, implies: String(c?.implies || '').trim(), chosen: false });
    });
    if (!alternatives.length) {
        // Every candidate restated the deck's own thesis, so there is no choice to offer.
        // Worth logging: it is a model-quality signal, not a plumbing failure.
        console.warn(`[thesis] ${parsed.length} alternative(s) returned, all restatements of the deck thesis; no choice offered`);
        return [];
    }
    return [chosen, ...alternatives.slice(0, 2)];
}
