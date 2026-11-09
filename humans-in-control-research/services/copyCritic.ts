/**
 * COPY CRITIC (2026-10-26). Owner, on two live decks: "The descriptions, summaries, and headlines are fragments, and
 * not clearly written business statements that are devoid of AI slop writing! Don't we have a critic for this?"
 *
 * We had detectors that only advised: the title gate marks a verbless headline detect-only, nothing checked a
 * description or summary for sentence completeness, and a reformat skips the verification chain entirely. This pass
 * DECIDES. A copy editor reads every user-visible field of the deck in one call and rewrites only the fields that
 * fail the rubric; a deterministic guard rejects any rewrite that adds a figure or drops a name or figure. Every
 * accepted change rides the WS-4 edit contract (applyTextEdits), so per-slide Undo still works.
 */
import { enumerateTextFields, scrubRewrite, type TextEdit } from './slideTextEditing';
import { callAIWithRetry } from './aiRetryClient';
import { anthropicText, CLAUDE_REASONING_MODEL } from './claudeModelPolicy';
import { SLOP_PHRASES } from './slidePostProcessor';

export interface CopyCriticResult { checked: number; flagged: number; rewritten: number; rejected: number; line: string }

/** The banned vocabulary comes from the one runtime lexicon, so the critic and the scrubber never disagree. */
function rubric(): string {
    const banned = Array.from(new Set(SLOP_PHRASES.map(e => e.phrase))).slice(0, 120).join(', ');
    return [
        'You are the copy editor and the engagement partner signing off a client slide deck. Read every field below and rewrite ONLY the fields that fail a rule. Return ONLY a JSON object {"<slide id>": {"<field path>": "<rewritten text>"}} holding the fields you changed; omit every field you leave alone. Return {} when nothing fails.',
        '',
        'RULES',
        '1. Titles, statements, takeaways, outcomes, summaries, subtitles and descriptions are complete business sentences: a named actor (a client, team, system or role), a finite verb and a concrete object. A verbless phrase ("Four anchor relationships, one repeatable delivery model"), a dangling noun list, or an instruction with no actor ("Enter through a high-value workflow") fails.',
        '2. The field path decides the form. Paths ending in body, description, statement, summary, subtitle, lede, outcome, takeaway, note, prove, implication, means or matters are SENTENCES under rule 1 (a box body like "Brand and marketing automation across The Ordinary and Origins" fails; "NXT Humans automates brand and marketing work across The Ordinary and Origins" passes). Paths ending in label, name, kicker, topicKicker, header, status, subject, value, figure or evidenceGrade are LABELS: short noun phrases of one to five words. A kicker names the subject; it never carries a second headline after a separator.',
        '3. A body never opens by repeating its own heading as its subject ("Diagnose finds..." under the heading "Diagnose"); it starts with the actor.',
        `4. Plain business English a partner would say aloud: none of these words or phrases (${banned}); no metaphors, no "not X, it is Y", no rhythm triads, no hedges.`,
        '5. The deck is about its subject, never about itself or how to present it. No field refers to the deck, an appendix, a slide, a section or the narrative ("The appendix separates ...", "APPENDIX: HOW TO PRESENT ...", "keep the narrative ambitious", "use the phrase ..."); each is rewritten as the business fact it protects, for example "FY2027 amounts stay proposal-backed until the follow-on SOWs are signed." A kicker that is advice becomes the subject it labels ("CONTRACT STATUS").',
        '6. Keep every fact: every name, number, currency amount, date, product and status stays with the same meaning and strength. Never add a fact, number, source or claim.',
        '7. Two fields never carry the same sentence; when the source gave one shared fact, state it once and give each other field what is specific to it.',
        '5a. A subtitle or lede states the subject, never the document: "NXT Humans sets out its services ... for stakeholder review" and "Prepared for stakeholder review" fail; state what the subject is or does.',
        '6a. A title states a judgment: who does what, and what changes for whom. A title that restates its own subject ("Preparation materials help students prepare for advisor discussions") or names no consequence fails.',
        '6b. A title is SHORT: at most 12 words and 80 characters, one line (2026-11-09 QA: a live theme card shipped a 20-word title that restated its own takeaway). Tighten an over-long title by dropping subordinate clauses and the conditions the body already carries; keep the exact judgment and the actor. "Students trust AI connections when the work stays theirs, writes wait for a yes and access is chosen per capability" becomes "Students connect AI only on their own permission terms".',
        '7a. Name the actor without repeating it (2026-10-26 live: most bodies and six titles opened with the company name). Use the MOST SPECIFIC actor: the client, the named team or role, the system, or the program ("Canon CFS", "the engineering lead", "the Azure DevOps backlog"). No more than two fields on one slide, and no more than a third of the titles in the deck, open with the same subject. Leave a field alone when it already passes.',
        '7b. Cells of one table column share one form: either every cell is a short phrase without a closing period, or every cell is a sentence. A cell that states a status ("not yet signed") stays a short phrase.',
        '7c. A list label names what its items are (2026-10-26 live: "TEAMS" over "Guidance tiles", "Next-Steps View" and "AI Companion"): items that are tools take "Tools", channels "Channels", people "Teams". A recommendation title states the decision and who makes it ("Leadership puts the readiness tools into one Student Hub path"), never the recommended state as present-tense fact ("Northeastern integrates the tools inside Student Hub").',
        '7d. Keep acronyms and product names exactly as the deck uses them (AI, CRM, SOW, OCR): never spell one out (live: "AI" became "artificial intelligence" on one slide while every other slide said "AI").',
        '8. Keep each rewrite about as long as the original; a title stays at most 80 characters.',
        '9. QUANTITATIVE CLAIM RULE (house rule; it overrides rule 6 for these numbers): on a slide NOT marked "attached", a number may appear only inside a verbatim quote that carries its source. A stat figure (a path ending in figure or value) that no quote on the slide carries becomes a one- or two-word qualitative label in capitals that states the judgment ("THIN", "HIGHER", "WEEKS, NOT QUARTERS"); a sentence that carries a bare number states the pattern without it ("Accenture cut thousands of delivery roles"). A number inside quotation marks with its source stays. When a figure becomes a label, rewrite the caption or headline beside it so it reads on its own (run 42: "FEW" over "of companies have redesigned processes around AI" read as a fragment; "Few companies have redesigned their processes around AI" reads). On a slide marked "attached" (the client\'s own document) every number stays exactly as written.',
    ].join('\n');
}

/** Single-word values (section labels such as "OBJECTIVE", statuses) are not sent; every phrase is (2026-10-26 live:
 *  the two-word band label "INVESTOR-SAFE WORDING" was never read because labels under four words were skipped). */
function readable(path: string, value: string): boolean {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    return words >= 2 || /(^|\.)(title|statement|outcome|takeaway|subtitle|kicker|topicKicker)$/.test(path)
        // a list label is judged against its items (7c), so a one-word "Teams" over product names is read
        || /\.(?:teams|outcomes|items)\.label$/.test(path)
        // a stat figure is judged by the quantitative claim rule (9), so a one-word "20-35%" is read
        || (/(?:^|\.)(?:figure|value)$/.test(path) && /\d/.test(value));
}

/** Evidence pointers ride inside a field ("...cohorts [wiki/x/abc.md#c16802]"). The editor never sees them and the guard
 *  never reads their digits as a figure (2026-10-26 live: a label rewrite was refused for "dropping figure 16802", the
 *  chunk index); an accepted rewrite gets the same pointers back so the claim keeps its grounding. */
const BRACKET_POINTER_RE = /\s*\[[^\[\]]*?\.md(?:#c\d+)?[^\[\]]*\]/gi;
const BARE_POINTER_RE = /\s*[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi;
export function splitPointers(s: string): { text: string; pointers: string[] } {
    const pointers: string[] = [];
    const text = String(s || '')
        .replace(BRACKET_POINTER_RE, m => { pointers.push(m.trim()); return ''; })
        .replace(BARE_POINTER_RE, m => { pointers.push(m.trim()); return ''; })
        .replace(/\s{2,}/g, ' ').trim();
    return { text, pointers };
}

const FIGURE_RE = /[$€£]?\d[\d,.]*\s*(?:%|[kKmMbB]\b|x\b)?/g;
const figuresOf = (s: string) => (String(s).match(FIGURE_RE) || []).map(f => f.replace(/[\s,]/g, '').replace(/\.$/, '').toLowerCase()).filter(Boolean);
/** Capitalized words after the first word of a sentence: the proper names a rewrite must keep. */
function namesOf(s: string): string[] {
    const out: string[] = [];
    // 2026-10-26 (live: "...pipeline.' Avoid ..." made "Avoid" a name because the sentence ended on a closing quote;
    // "H1-2027" was a "name"): a sentence may end on a quote, and a token with digits is a figure, not a name.
    for (const sentence of String(s).split(/(?<=[.!?:;]['"’”]?)\s+/)) {
        for (const w of sentence.split(/\s+/).slice(1)) {
            const t = w.replace(/^[^A-Za-z]+|[^A-Za-z0-9]+$/g, '');
            if (t.length >= 3 && /^[A-Z]/.test(t) && !/\d/.test(t)) out.push(t.toLowerCase());
        }
    }
    return out;
}

/**
 * The guard: a rewrite is accepted only when it adds no figure, keeps every figure and most names, and fits.
 * `context` is the rest of the slide's text: a figure the slide already states elsewhere (a year, an amount) may move
 * into the rewritten field. An ALL-CAPS label has no names to keep (2026-10-26 live: "APPENDIX: HOW TO PRESENT THESE
 * NUMBERS CREDIBLY" -> "CONTRACT STATUS" was refused because every capitalized word counted as a name).
 */
export function acceptCopyRewrite(original: string, rewrite: string, path = '', context = ''): string | null {
    return copyRewriteVerdict(original, rewrite, path, context).text;
}

/** The guard with its reason, so a refused rewrite can be read in the console (2026-10-26). */
/** A figure the original states outside any quotation marks: the Quantitative Claim Rule's naked number. */
/** Status words a rewrite must keep (hedges) and must not introduce on its own (firm claims). Stems, matched at a word start. */
const STATUS_HEDGES = ['draft', 'propos', 'pending', 'unsigned', 'risk-adjusted', 'outlook', 'forecast', 'estimat', 'planned', 'expected'];
const STATUS_FIRM = ['signed', 'contracted', 'secured', 'committed', 'guaranteed', 'locked', 'booked'];

function nakedIn(original: string, figure: string): boolean {
    const outside = String(original || '').replace(/[“"][^”"]*[”"]/g, ' ');
    return figuresOf(outside).includes(figure);
}

export function copyRewriteVerdict(original: string, rewrite: string, path = '', context = '', opts: { research?: boolean } = {}): { text: string | null; reason: string } {
    const o = String(original || '').trim();
    const r = scrubRewrite(String(rewrite || '').trim()).replace(/\s{2,}/g, ' ');
    if (!r || r === o) return { text: null, reason: 'unchanged' };
    if (/(^|\.)title$/.test(path) && r.length > 90) return { text: null, reason: 'title over 90 chars' };
    if (r.length > Math.max(o.length * 1.7, o.length + 90)) return { text: null, reason: 'much longer than the original' };
    const of = figuresOf(o), rf = figuresOf(r), cf = figuresOf(context);
    const added = rf.find(f => !of.includes(f) && !cf.includes(f));
    if (added) return { text: null, reason: `adds figure ${added}` };
    // 2026-10-27 (Quantitative Claim Rule, .claude/CLAUDE.md): on a research slide a naked number may be dropped; a number
    // inside a quote, and every number on the client's own attached slides, must survive
    const dropped = of.find(f => !rf.includes(f) && !(opts.research && nakedIn(o, f)));
    if (dropped) return { text: null, reason: `drops figure ${dropped}` };
    // 2026-10-27 (run 43: a draft SOW shipped as "signed"): a status word is a fact. A rewrite keeps every hedged status
    // the original states and never introduces a firm one the original and its slide do not state.
    const lowO = o.toLowerCase(), lowR = r.toLowerCase(), lowC = String(context || '').toLowerCase();
    const hedgesO = STATUS_HEDGES.filter(w => new RegExp(`\\b${w}`).test(lowO));
    if (hedgesO.length && !STATUS_HEDGES.some(w => new RegExp(`\\b${w}`).test(lowR))) return { text: null, reason: `drops status ${hedgesO[0]}` };
    const firm = STATUS_FIRM.find(w => new RegExp(`\\b${w}`).test(lowR) && !new RegExp(`\\b${w}`).test(lowO) && !new RegExp(`\\b${w}`).test(lowC));
    if (firm) return { text: null, reason: `adds status ${firm}` };
    if (o === o.toUpperCase() && /[A-Z]/.test(o)) return { text: r, reason: 'ok' };
    const names = Array.from(new Set(namesOf(o)));
    if (names.length) {
        const low = r.toLowerCase();
        // a headline may hand a name to the body it heads: a title or kicker that drops a name the slide still states
        // elsewhere loses nothing (2026-10-26 live: a recommendation title stated as present-tense fact was kept because
        // its decision-framed rewrite moved "Student Hub" to the subtitle, which already named it)
        const headline = /(^|\.)(title|kicker|topicKicker|eyebrow)$/.test(path);
        const ctx = context.toLowerCase();
        const missing = names.filter(n => !low.includes(n) && !(headline && ctx.includes(n)));
        if ((names.length - missing.length) / names.length < 0.75) return { text: null, reason: `drops names ${missing.slice(0, 3).join(', ')}` };
    }
    return { text: r, reason: 'ok' };
}

/**
 * Run the critic over a deck. Returns the accepted edits per slide id (apply them with applyTextEdits to the LIVE
 * slide) and a receipt. Fail-open: any error returns no edits and a receipt saying the pass did not run.
 */
export async function critiqueDeckCopy(
    slides: Array<{ id: string; template: string; title: string; composerPayload?: any; _locked?: boolean }>,
    opts: { call?: (system: string, user: string) => Promise<string> } = {},
): Promise<{ edits: Map<string, TextEdit[]>; result: CopyCriticResult }> {
    const edits = new Map<string, TextEdit[]>();
    const fieldsById = new Map<string, Map<string, string>>();
    const pointersById = new Map<string, Map<string, string[]>>();
    const input: Array<{ id: string; template: string; attached?: boolean; fields: Record<string, string> }> = [];
    const researchIds = new Set<string>();
    for (const s of slides) {
        if (!s || s._locked) continue;
        const attached = !!s.composerPayload?._provided;
        if (!attached) researchIds.add(String(s.id));
        const fields: Record<string, string> = {};
        const ptrs = new Map<string, string[]>();
        for (const f of enumerateTextFields(s)) {
            const { text, pointers } = splitPointers(f.value);
            if (!text || !readable(f.path, text)) continue;
            fields[f.path] = text;
            if (pointers.length) ptrs.set(f.path, pointers);
        }
        if (ptrs.size) pointersById.set(String(s.id), ptrs);
        if (!Object.keys(fields).length) continue;
        fieldsById.set(String(s.id), new Map(Object.entries(fields)));
        input.push({ id: String(s.id), template: String(s.template || ''), ...(attached ? { attached: true } : {}), fields });
    }
    const checked = input.reduce((n, s) => n + Object.keys(s.fields).length, 0);
    if (!checked) return { edits, result: { checked: 0, flagged: 0, rewritten: 0, rejected: 0, line: 'Copy edit: nothing to read.' } };
    // 2026-10-30 (WS-2 E9): a judge call carries a per-run nonce so the proxy's exact-match cache never
    // serves an earlier judgment for the same text; independent repeat judgments are what calibration measures.
    const call = opts.call || (async (system: string, user: string) => anthropicText(await callAIWithRetry('anthropic', {
        model: CLAUDE_REASONING_MODEL, max_tokens: 16000, system, messages: [{ role: 'user', content: `${user}\n\n[judge run ${Date.now().toString(36)}]` }], _hicEffort: 'medium',
    }, { label: 'Copy critic', maxAttempts: 2, requestTimeoutMs: 170_000 })));
    // 2026-10-27 (run 39: 347 fields in one call came back with 0 rewrites and no error; a reply that long is cut or
    // unparseable and was dropped in silence): the deck is read in batches of 8 slides, two at a time, and a batch whose
    // reply does not parse says so.
    const BATCH = 8;
    const batches: typeof input[] = [];
    for (let i = 0; i < input.length; i += BATCH) batches.push(input.slice(i, i + BATCH));
    const parsed: Record<string, Record<string, unknown>> = {};
    let failed = 0, unparsed = 0;
    const runBatch = async (b: typeof input) => {
        let reply = '';
        try { reply = await call(rubric(), `DECK FIELDS (JSON):\n${JSON.stringify(b)}`); }
        catch (e: any) { failed++; console.warn(`[copy-critic] batch of ${b.length} slide(s) did not run: ${String(e?.message || e).slice(0, 120)}`); return; }
        try {
            const start = reply.indexOf('{'), end = reply.lastIndexOf('}');
            // a reply cut off before its closing brace, or with no JSON at all, is a failure, never "no edits"
            if (start < 0 || end <= start) throw new Error('no complete JSON object');
            const j = JSON.parse(reply.slice(start, end + 1));
            for (const [k, v] of Object.entries(j || {})) if (v && typeof v === 'object') parsed[k] = v as Record<string, unknown>;
        } catch {
            unparsed++;
            console.warn(`[copy-critic] batch of ${b.length} slide(s): the reply did not parse (${reply.length} chars; ends "${reply.slice(-60).replace(/\s+/g, ' ')}")`);
        }
    };
    for (let i = 0; i < batches.length; i += 2) await Promise.all(batches.slice(i, i + 2).map(runBatch));
    if (failed === batches.length) {
        return { edits, result: { checked, flagged: 0, rewritten: 0, rejected: 0, line: 'Copy edit did not run (every batch failed).' } };
    }
    let flagged = 0, rewritten = 0, rejected = 0;
    for (const [id, changes] of Object.entries(parsed || {})) {
        const known = fieldsById.get(String(id));
        if (!known || !changes || typeof changes !== 'object') continue;
        const accepted: TextEdit[] = [];
        for (const [path, value] of Object.entries(changes)) {
            if (!known.has(path) || typeof value !== 'string') continue;
            flagged++;
            const context = Array.from(known.entries()).filter(([p]) => p !== path).map(([, v]) => v).join(' ');
            const v = copyRewriteVerdict(known.get(path)!, splitPointers(value).text, path, context, { research: researchIds.has(String(id)) });
            const ptrs = pointersById.get(String(id))?.get(path) || [];
            if (v.text) { accepted.push({ path, value: ptrs.length ? `${v.text} ${ptrs.join(' ')}` : v.text }); rewritten++; }
            else if (v.reason !== 'unchanged') { rejected++; console.info(`[copy-critic] refused ${id}.${path} (${v.reason}): "${known.get(path)!.slice(0, 90)}" -> "${String(value).slice(0, 90)}"`); }
        }
        if (accepted.length) edits.set(String(id), accepted);
    }
    const line = `Copy edit: ${checked} fields read; ${rewritten} rewritten as complete business sentences${rejected ? `; ${rejected} rewrite(s) refused by the fact guard` : ''}${failed || unparsed ? `; ${failed + unparsed} of ${batches.length} batch(es) did not return usable edits` : ''}.`;
    return { edits, result: { checked, flagged, rewritten, rejected, line } };
}
