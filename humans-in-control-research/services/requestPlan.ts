/**
 * Request plan (2026-10-20, root-cause audit P1.6): ONE model reading of the user's message that every downstream
 * pass honors. Until now every decision before the model (deliverable, scope, counts, audience, length, brand,
 * whether the message is a question ABOUT an artifact or a request FOR one) was a regex or a fixed table, and the
 * model saw the raw message only after the plan was fixed. The catalog supplies the vocabulary; the model supplies
 * the reading. A fast model is used because this is a routing decision (owner rule: Flash for speed, Opus for
 * reasoning). On failure the deterministic reading (hashtag present = generate) applies and nothing is lost.
 */
import { callAIWithRetry } from './aiRetryClient';
import { primaryCatalogHit, matchCatalogDirectives } from './artifactCatalog';

export type RequestMode = 'generate' | 'question' | 'edit' | 'chat';

export interface RequestPlan {
    /** generate = produce the deliverable; question = answer about an existing artifact / the evidence; edit = change an existing artifact; chat = plain question. */
    mode: RequestMode;
    /** Catalog id of the deliverable the user wants (bare catalog id, e.g. "slides", "persona"), or null. */
    deliverable: string | null;
    /** The subject the user named, in their words. */
    scope: string;
    /** Counts the user stated ("only two personas", "a 6-slide deck"); absent when the user named none. */
    counts: { items?: number; slides?: number };
    /** Audience the user named ("for the CIO"), or ''. */
    audience: string;
    length: 'short' | 'standard' | 'long';
    brand: 'nxt' | 'nu' | 'deciem' | null;
    /** The user wants the deliverable built ONLY from the attachment / pasted content, not from the corpus. */
    useOnlyProvidedContent: boolean;
    /** The attachment supplies one part of the deliverable (a section the user named) while the research corpus grounds
     *  the rest; its content is carried in full there (2026-10-26). Set by the send path from the attachment decision. */
    carryAttachment?: boolean;
    /** The user limited the scope or counts, so nothing is appended beyond what they asked for. */
    userLimitedScope: boolean;
    /** The name the user gave the section that holds the attachment's content ("Work"), or ''. */
    attachmentSection?: string;
    /** Elements the user asked for on EACH slide ("a core headline", "a workflow visualization", "proof points"). */
    perSlide?: string[];
    note: string;
    decidedBy: 'model' | 'fallback';
}

export type PlanGen = (prompt: string) => Promise<string>;

function hashtagsIn(message: string): string[] {
    return (String(message || '').match(/#[a-z][\w-]*/gi) || []).map(h => h.toLowerCase());
}

export function fallbackRequestPlan(message: string): RequestPlan {
    const hit = primaryCatalogHit(message);
    const tags = hashtagsIn(message);
    const brand = tags.includes('#deciem') ? 'deciem' : tags.includes('#nu') ? 'nu' : tags.includes('#nxt') ? 'nxt' : null;
    const countM = /\b(?:only|exactly|just|top)\s+(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(message || '');
    const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const n = countM ? (words[countM[1].toLowerCase()] ?? Number(countM[1])) : undefined;
    const slidesM = /\b(\d{1,2})[- ]slide\b/i.exec(message || '');
    return {
        mode: hit ? 'generate' : 'chat',
        deliverable: hit?.entry?.id || null,
        scope: String(message || '').replace(/#[\w-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
        counts: { ...(n ? { items: n } : {}), ...(slidesM ? { slides: Number(slidesM[1]) } : {}) },
        audience: '',
        length: 'standard',
        brand,
        useOnlyProvidedContent: false,
        userLimitedScope: !!(n || slidesM),
        attachmentSection: attachmentSectionFrom(message),
        note: '',
        decidedBy: 'fallback',
    };
}

export function buildRequestPlanPrompt(message: string, opts: { catalogIds: string[]; objective?: string; hasAttachment?: boolean; priorDeliverables?: string[] }): string {
    return [
        'You read a consultant\'s chat message to a research assistant and return the PLAN the assistant must follow. The message may carry #hashtags: each names a deliverable from the catalog below, a brand (#NXT, #NU, #deciem), or a control (#help, #artifacts, #refine). Read the WHOLE sentence: a hashtag inside a question about an existing artifact ("why did the #gap matrix rate data maturity 2?") is a QUESTION, not a request to generate; "make it shorter" after a deck is an EDIT; "only two #personas" is a count of two; "from the attached deck" means build ONLY from the attachment.',
        `Catalog ids: ${opts.catalogIds.join(', ')}`,
        'Return ONLY JSON: {"mode":"generate"|"question"|"edit"|"chat","deliverable":"<catalog id or null>","scope":"<the subject in the user\'s words, under 30 words>","counts":{"items":<int, omit if none>,"slides":<int, omit if none>},"audience":"<named audience or empty>","length":"short"|"standard"|"long","brand":"nxt"|"nu"|"deciem"|null,"useOnlyProvidedContent":true|false,"attachmentSection":"<the name the user gives the section that holds the attachment content, e.g. Work; empty if none>","perSlide":["<an element the user asks for on EACH slide, in their words>"],"userLimitedScope":true|false,"note":"<one plain sentence under 20 words, no em dash>"}',
        'Rules: deliverable is null unless the user asks for one to be produced (a hashtag in a question stays null). userLimitedScope is true when the user names a count, a subset ("only the onboarding module"), or says "just" / "exactly". length is short when the user asks for brief / one page / N words under 300. brand only from an explicit hashtag or a named brand.',
        'useOnlyProvidedContent is true ONLY when the attachment or paste is the whole subject ("reformat the attached deck", "turn this into slides"). It is false whenever the message also asks for research, data, statistics, proof points, evidence, market or industry context, a landscape or trend, or a section the attachment does not hold, even when another part of the request reuses the attachment ("...data-backed proof points from the research, then add a Work section with the attached slides" is false: the attachment supplies the Work section and the research supplies the rest).',
        `Engagement objective: ${(opts.objective || '').slice(0, 300) || '(none)'}`,
        `Attachment on this turn: ${opts.hasAttachment ? 'yes' : 'no'}. Deliverables already in the session: ${(opts.priorDeliverables || []).slice(0, 8).join(', ') || 'none'}.`,
        `MESSAGE: ${String(message || '').slice(0, 1500)}`,
    ].join('\n');
}

/** The section the user names for attached content, in their own words (2026-10-26 live: the plan model left the field
 *  empty for 'add a "Work" section that includes all the content from the attached slides'). '' when none. */
export function attachmentSectionFrom(message: string): string {
    const m = String(message || '');
    const quoted = /\b(?:a|an|the)\s+["“']([^"”']{2,30})["”']\s+section\b/i.exec(m);
    if (quoted) return quoted[1].trim();
    const bare = /\b(?:a|an|the)\s+([A-Z][\w&/-]{1,24}(?:\s+[A-Z][\w&/-]{1,24}){0,2})\s+section\b[^.]{0,80}\battach/i.exec(m);
    return bare ? bare[1].trim() : '';
}

export function parseRequestPlan(raw: string, message: string, catalogIds: string[], opts: { hasAttachment?: boolean } = {}): RequestPlan | null {
    const m = /\{[\s\S]*\}/.exec(String(raw || ''));
    if (!m) return null;
    let j: any;
    try { j = JSON.parse(m[0]); } catch { return null; }
    const mode: RequestMode = (['generate', 'question', 'edit', 'chat'] as RequestMode[]).includes(j?.mode) ? j.mode : null as any;
    if (!mode) return null;
    // Catalog ids are bare ("persona", "themes"); the model may answer with or without the hashtag, or with an alias.
    let deliverable: string | null = typeof j.deliverable === 'string' && j.deliverable.trim() ? j.deliverable.trim().toLowerCase().replace(/^#/, '') : null;
    if (deliverable && !catalogIds.includes(deliverable)) {
        const hit = matchCatalogDirectives(`#${deliverable}`).find(h => h.entry?.id);
        deliverable = hit?.entry?.id || null;
    }
    const fb = fallbackRequestPlan(message);
    const counts: RequestPlan['counts'] = {};
    if (Number.isInteger(j?.counts?.items) && j.counts.items > 0) counts.items = j.counts.items;
    if (Number.isInteger(j?.counts?.slides) && j.counts.slides > 0) counts.slides = j.counts.slides;
    return {
        mode,
        deliverable: mode === 'generate' ? (deliverable || fb.deliverable) : (mode === 'edit' ? (deliverable || fb.deliverable) : null),
        scope: String(j.scope || fb.scope).slice(0, 200),
        counts: Object.keys(counts).length ? counts : fb.counts,
        audience: String(j.audience || '').slice(0, 80),
        length: (['short', 'standard', 'long'] as const).includes(j.length) ? j.length : 'standard',
        brand: (['nxt', 'nu', 'deciem'] as const).includes(j.brand) ? j.brand : fb.brand,
        // 2026-10-31 (live UI test): the model read "ground every slide in the corpus" as "only the provided content"
        // on a message with NO attachment, the corpus was dropped and Opus refused to invent a deck. Provided-content
        // mode needs provided content: without an attachment or pasted document the flag cannot be true.
        useOnlyProvidedContent: !!j.useOnlyProvidedContent && opts.hasAttachment === true,
        userLimitedScope: !!j.userLimitedScope || fb.userLimitedScope || Object.keys(counts).length > 0,
        attachmentSection: (typeof j.attachmentSection === 'string' ? j.attachmentSection.replace(/["'“”]/g, '').trim().slice(0, 40) : '') || attachmentSectionFrom(message),
        perSlide: Array.isArray(j.perSlide) ? j.perSlide.filter((x: unknown) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 120)).slice(0, 6) : [],
        note: String(j.note || '').replace(/—/g, ',').slice(0, 200),
        decidedBy: 'model',
    };
}

function flashGen(timeoutMs: number): PlanGen {
    return async (prompt: string) => {
        const data: any = await callAIWithRetry('gemini', {
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0, responseMimeType: 'application/json' },
        }, { label: 'request plan', maxAttempts: 1, requestTimeoutMs: timeoutMs });
        return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
    };
}

export async function interpretRequest(opts: {
    message: string;
    catalogIds: string[];
    objective?: string;
    hasAttachment?: boolean;
    priorDeliverables?: string[];
    gen?: PlanGen;
    timeoutMs?: number;
}): Promise<RequestPlan> {
    const msg = String(opts.message || '').trim();
    if (!msg) return fallbackRequestPlan(msg);
    try {
        const raw = await (opts.gen || flashGen(opts.timeoutMs ?? 15_000))(buildRequestPlanPrompt(msg, opts));
        const plan = parseRequestPlan(raw, msg, opts.catalogIds, { hasAttachment: opts.hasAttachment === true });
        if (plan) return plan;
        console.warn('[request-plan] the model reply did not parse; deterministic reading applies');
    } catch (e: any) {
        console.warn('[request-plan] decision failed; deterministic reading applies:', e?.message || e);
    }
    return fallbackRequestPlan(msg);
}

/** The block the generation prompt carries so the model and every pass honor the same reading. */
export function requestPlanBlock(plan: RequestPlan | null | undefined): string {
    if (!plan) return '';
    const lines = [`=== REQUEST PLAN (the user's ask as read; honor it over any default count, floor, or template habit) ===`];
    lines.push(`Mode: ${plan.mode}${plan.deliverable ? ` | Deliverable: ${plan.deliverable}` : ''}`);
    if (plan.scope) lines.push(`Scope: ${plan.scope}`);
    if (plan.counts.items) lines.push(`Count: exactly ${plan.counts.items} item(s); produce no more and no fewer, whatever a skill's minimum says.`);
    if (plan.counts.slides) lines.push(`Slides: exactly ${plan.counts.slides}; no appendix.`);
    if (plan.audience) lines.push(`Audience: ${plan.audience}`);
    if (plan.length !== 'standard') lines.push(`Length: ${plan.length}${plan.length === 'short' ? ' (brief; no word floor applies)' : ''}`);
    if (plan.useOnlyProvidedContent) lines.push('Content: build ONLY from the content the user provided on this turn (the attachment or paste); do not import corpus material, prior deliverables, or a new thesis the user did not ask for.');
    else if (plan.carryAttachment) lines.push('Content: TWO sources, each in its own place. The slides the user asked for beyond the attachment (the argument, the market context, the proof points) are built from the research corpus with cited evidence, never from the attachment. The section the user named for the attachment (for example a "Work" section) carries EVERY slide of the attachment with its names, figures and dates, under a section divider that names it; nothing from the attachment is dropped and nothing from the research is put into it.');
    if (plan.userLimitedScope) lines.push('The user limited the scope: cover what they named and nothing beyond it.');
    // 2026-10-26 (live: "for each slide, provide ... a conceptual description for a workflow visualization" produced six
    // visuals in 24 slides): what the user asked for on EVERY slide is a per-slide requirement, not a deck-level hint.
    if (plan.perSlide?.length) lines.push(`On EVERY body slide (everything but the cover, agenda and dividers), the user asked for: ${plan.perSlide.join('; ')}. A requested visualization is DRAWN on the slide (a flow, process, flowchart or diagram exhibit built from that slide's own content), never only described in prose. Anything the user wants DESCRIBED for each slide (a conceptual description of its visualization, talking points, a presenter narrative) is written in that slide's speakerNotes field (two to four plain sentences that name what the drawing traces, how to read it and the point it proves; never "this slide" or "as you can see"), never on the slide face.`);
    if (plan.carryAttachment && plan.attachmentSection) lines.push(`The attached section is named "${plan.attachmentSection}": its divider says so.`);
    if (plan.mode === 'question') lines.push('This is a QUESTION about existing work or evidence: answer it in prose; do not generate a new artifact.');
    lines.push('=== END REQUEST PLAN ===');
    return lines.join('\n');
}
