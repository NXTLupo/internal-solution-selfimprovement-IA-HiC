/**
 * chatIntentRouter.ts - WS-6 of the v2 single-workspace program (2026-08-14,
 * plans/hic-v2-single-workspace-program-2026-08-14.md).
 *
 * FLUID CHAT: natural-language messages reach the same executors the hashtags
 * invoke, so the user never needs hashtag syntax for the common asks (PDF item
 * 10). Hashtags remain as shortcuts; this router only runs on NON-hashtag
 * messages, and only when a cheap regex pre-filter says the message looks like
 * an actionable ask - ordinary Q&A never pays the classifier's latency.
 *
 * Executors:
 *  - deck_edit        -> rewrites the active deck's text through the WS-4 edit
 *                        contract (applyTextEdits), skipping _locked slides.
 *  - client_email     -> drafts the client follow-up email from the deck +
 *                        research context (PDF item 1), as chat prose.
 *  - slide_narrative  -> drafts the strategic slide structure from research
 *                        (PDF item 1, "Generate Slide Narrative from Research").
 *
 * Models route through aiRouter (DEFAULT_MODELS for the classifier and per-
 * slide passes; artifactModelFor for the narrative deliverables). No model id
 * is hardcoded at a call site (Unified Vision phase 6).
 */

import { callAIWithRetry, type AIEndpointId } from './aiRetryClient';
import { DEFAULT_MODELS, artifactModelFor, endpointForModel, salvageJsonObject } from './aiRouter';
import { enumerateTextFields, applyTextEdits, scrubRewrite, type TextEdit } from './slideTextEditing';

export type DeckEditOp = 'concise' | 'executive' | 'specific' | 'plainer';

export type ChatIntent =
    | { kind: 'plain' }
    | { kind: 'deck_edit'; op: DeckEditOp; slideIndex?: number }
    | { kind: 'client_email' }
    | { kind: 'slide_narrative' };

/** Minimal structural slide shape this router needs (SlideData satisfies it). */
export interface EditableSlide {
    id: string;
    template: string;
    title: string;
    status: string;
    composerPayload?: any;
    _locked?: boolean;
    _textHistory?: any[];
    [k: string]: any;
}

const EMAIL_RE = /\b(draft|write|creat\w*|generat\w*|compose|send|prepare)\b[\s\S]{0,60}\b(e-?mail|follow[- ]?up)\b|\bclient e-?mail\b/i;
const NARRATIVE_RE = /\b(slide|deck|presentation)\s+(narrative|structure|outline|storyline|brief)\b|\bnarrative\s+for\s+(the\s+)?(deck|slides|presentation)\b/i;
const DECK_EDIT_RE = /\b(make|tighten|shorten|rewrite|sharpen|condense|simplify|punch\w*|improve)\b[\s\S]{0,80}\b(deck|slides?|presentation|copy|titles?)\b|\b(deck|slides?|presentation)\b[\s\S]{0,60}\b(more concise|shorter|sharper|tighter|less generic|less wordy|more specific|more executive|plainer|less ai)\b/i;

/**
 * Cheap gate: does this non-hashtag message look like an actionable ask?
 * Ordinary corpus Q&A fails this and goes straight to plain chat with zero
 * added latency (the owner's fluidity requirement cuts both ways).
 */
export function quickIntentFilter(query: string, hasDeck: boolean): boolean {
    if (/#[a-z]/i.test(query)) return false;
    if (EMAIL_RE.test(query)) return true;
    if (NARRATIVE_RE.test(query)) return true;
    if (hasDeck && DECK_EDIT_RE.test(query)) return true;
    return false;
}

/** Model classification (flash, temp 0, fail-open to plain chat). */
export async function classifyChatIntent(query: string, opts: { hasDeck: boolean }): Promise<ChatIntent> {
    const system = [
        'Classify one chat message from a research-workbench user into an intent. Return ONLY JSON:',
        '{"kind":"plain"|"deck_edit"|"client_email"|"slide_narrative","op":"concise"|"executive"|"specific"|"plainer","slideIndex":<1-based number>}',
        'kind=deck_edit ONLY for asks to rewrite/tighten/sharpen the EXISTING slide deck text.',
        'op: concise (shorter/tighter), executive (decision-first), specific (name actors/systems), plainer (kill buzzwords/generic language). Default concise.',
        'slideIndex ONLY when the user names one slide ("slide 3"). Omit otherwise.',
        'kind=client_email for drafting a client follow-up email. kind=slide_narrative for a slide/deck narrative, outline, or structure.',
        'Anything else, including questions ABOUT the deck: {"kind":"plain"}.',
        opts.hasDeck ? 'A generated deck exists.' : 'NO deck exists: deck_edit is invalid; classify those as plain.',
    ].join('\n');
    try {
        const parsed = await callAIWithRetry('gemini', {
            model: DEFAULT_MODELS.fast_generation,
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: query.slice(0, 1200) }] }],
            config: { temperature: 0, maxOutputTokens: 120, responseMimeType: 'application/json' },
        }, { label: 'Chat intent classify', maxAttempts: 2, requestTimeoutMs: 12_000 });
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const obj = salvageJsonObject<any>(text);
        const kind = String((obj as any)?.kind || 'plain');
        if (kind === 'deck_edit' && opts.hasDeck) {
            const op = (['concise', 'executive', 'specific', 'plainer'] as DeckEditOp[]).includes((obj as any).op) ? (obj as any).op : 'concise';
            const idx = Number((obj as any).slideIndex);
            return { kind: 'deck_edit', op, slideIndex: Number.isFinite(idx) && idx >= 1 ? idx : undefined };
        }
        if (kind === 'client_email') return { kind: 'client_email' };
        if (kind === 'slide_narrative') return { kind: 'slide_narrative' };
        return { kind: 'plain' };
    } catch {
        return { kind: 'plain' };
    }
}

const OP_INSTRUCTION: Record<DeckEditOp, string> = {
    concise: 'Rewrite each field more concisely. Keep the claim and any named source. Cut every word that adds no fact.',
    executive: 'Rewrite each field for an executive reader: the judgment or consequence first, plain subject, direct verb.',
    specific: 'Rewrite each field to name the actor, system, or named source instead of abstractions.',
    plainer: 'Rewrite each field in plain literal business language. Remove buzzwords, metaphors, and generic consulting phrasing.',
};

const HOUSE_RULES = [
    'House rules for every rewritten field: plain literal business language; name actors and systems; no em-dash;',
    'no emoji; no meta-narration; no corporate cliches; never invent numbers, names, or sources; numbers only inside',
    'quotes that carry a named source; slide titles state a judgment in <= 10 words.',
].join(' ');

/** One flash call per slide: fields in, {path: rewritten} map out. */
async function rewriteSlideFields(slide: EditableSlide, op: DeckEditOp, userAsk: string): Promise<TextEdit[]> {
    const fields = enumerateTextFields(slide);
    if (!fields.length) return [];
    const system = [
        'You rewrite the text fields of one consulting slide. Return ONLY a JSON object mapping each field path to its rewritten text.',
        'Rewrite every field you can improve; return a path ONLY with a genuinely better rewrite. Keep meaning and evidence.',
        OP_INSTRUCTION[op], HOUSE_RULES,
    ].join('\n');
    const user = [
        `User request (context): ${userAsk.slice(0, 300)}`,
        `Slide template: ${slide.template}`,
        'Fields (path -> current text):',
        JSON.stringify(Object.fromEntries(fields.map(f => [f.path, f.value])), null, 1),
    ].join('\n');
    const parsed = await callAIWithRetry('gemini', {
        model: DEFAULT_MODELS.fast_generation,
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: { temperature: 0.2, maxOutputTokens: 4000, responseMimeType: 'application/json' },
    }, { label: `Deck pass (${op})`, maxAttempts: 2, requestTimeoutMs: 45_000 });
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const map = salvageJsonObject<string>(text);
    const valid = new Set(fields.map(f => f.path));
    const edits: TextEdit[] = [];
    for (const [path, value] of Object.entries(map || {})) {
        if (!valid.has(path) || typeof value !== 'string') continue;
        const scrubbed = scrubRewrite(value);
        const original = fields.find(f => f.path === path)!.value;
        if (scrubbed.length >= 2 && scrubbed !== original) edits.push({ path, value: scrubbed });
    }
    return edits;
}

export interface DeckPassResult<T> {
    updated: T[];          // slides that changed (new objects, history recorded)
    skippedLocked: number; // _locked slides left untouched
    failed: number;        // slides whose rewrite call failed (left untouched)
    editedFields: number;
}

/**
 * Apply a deck-wide text pass through the WS-4 edit contract. Locked slides
 * are SKIPPED (standing lock semantics); every change lands in _textHistory so
 * per-slide Undo works afterward. Slides run in parallel.
 */
export async function applyDeckTextPass<T extends EditableSlide>(
    slides: T[], op: DeckEditOp, userAsk: string, slideIndex?: number,
): Promise<DeckPassResult<T>> {
    const targets = slideIndex ? slides.filter((_s, i) => i === slideIndex - 1) : slides;
    const unlocked = targets.filter(s => !s._locked);
    const skippedLocked = targets.length - unlocked.length;
    let failed = 0;
    let editedFields = 0;
    const updated: T[] = [];
    await Promise.all(unlocked.map(async slide => {
        try {
            const edits = await rewriteSlideFields(slide, op, userAsk);
            if (edits.length) {
                updated.push(applyTextEdits(slide, edits));
                editedFields += edits.length;
            }
        } catch (e: any) {
            failed++;
            console.warn(`[chatIntentRouter] deck pass failed for slide ${slide.id}:`, e?.message || e);
        }
    }));
    return { updated, skippedLocked, failed, editedFields };
}

/** Route a one-shot text generation through the artifact authority's model. */
async function callRoutedText(model: string, system: string, user: string, maxTokens: number, label: string): Promise<string> {
    const endpoint: AIEndpointId = endpointForModel(model) as AIEndpointId;
    if (endpoint === 'anthropic') {
        const parsed = await callAIWithRetry('anthropic', {
            model, max_tokens: maxTokens, system,
            messages: [{ role: 'user', content: user }],
        }, { label, maxAttempts: 2, requestTimeoutMs: 120_000 });
        return parsed?.content?.[0]?.text ?? '';
    }
    const parsed = await callAIWithRetry('gemini', {
        model,
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: { maxOutputTokens: maxTokens },
    }, { label, maxAttempts: 2, requestTimeoutMs: 120_000 });
    return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export interface EngagementContext {
    researchGoal?: string;
    corpusText?: string;
    deckTitles?: string[];
    themeLines?: string[];
    clientName?: string;
}

function contextBlock(ctx: EngagementContext, corpusChars: number): string {
    return [
        ctx.researchGoal ? `Research objective: ${ctx.researchGoal}` : '',
        ctx.clientName ? `Client: ${ctx.clientName}` : '',
        ctx.deckTitles?.length ? `Deck slide titles (the argument, in order):\n${ctx.deckTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}` : '',
        ctx.themeLines?.length ? `Research themes:\n${ctx.themeLines.slice(0, 8).map(t => `- ${t}`).join('\n')}` : '',
        ctx.corpusText ? `Research corpus excerpt:\n${ctx.corpusText.slice(0, corpusChars)}` : '',
    ].filter(Boolean).join('\n\n');
}

/**
 * Client follow-up email (PDF item 1): a sendable email summarizing what the
 * research established and what NXT Humans proposes, for when a live
 * presentation is not possible or to set up the meeting. Chat prose, not an
 * HTML artifact (owner direction 2026-08-14 on summary-type asks).
 */
export async function draftClientEmail(ctx: EngagementContext, userAsk: string): Promise<string> {
    const model = artifactModelFor('report');
    const system = [
        'You draft a client-ready follow-up email for NXT Humans, a customer-experience consultancy.',
        'Structure: subject line ("Subject: ..."), greeting, 2-3 short paragraphs, a specific next step (a meeting), sign-off "The NXT Humans team".',
        'Content: lead with the sharpest research finding relevant to the client; state plainly what NXT Humans can do for them; reference the deck by its argument, never by slide numbers.',
        'Voice: plain literal business language a person would say aloud. No em-dash, no emoji, no corporate cliches, no meta-narration,',
        'no "I hope this finds you well", no invented numbers, names, or claims: only what the provided context establishes.',
        'Return ONLY the email text.',
    ].join(' ');
    const user = `${userAsk.slice(0, 400)}\n\n${contextBlock(ctx, 6000)}`;
    const out = await callRoutedText(model, system, user, 1500, 'Client follow-up email');
    return scrubRewrite(out);
}

/**
 * Slide narrative from research (PDF item 1): the strategic slide structure the
 * user previously asked Claude for. Ends with a ready-to-send #slides prompt so
 * the next step never leaves the workspace.
 */
export async function draftSlideNarrative(ctx: EngagementContext, userAsk: string): Promise<string> {
    const model = artifactModelFor('strategy');
    const system = [
        'You are a senior strategy consultant planning a client deck from completed research.',
        'Produce a slide-by-slide narrative plan: 10-14 slides. For each: "N. <action title>" then one sentence on what the slide shows and which evidence carries it.',
        'Action titles state a judgment in <= 10 words, literal business language, no metaphor. The titles alone must read as the complete argument (Minto: answer first).',
        'Follow SCQA proportions: situation brief, complication sharp, resolution the bulk. No em-dash, no emoji, no cliches, no invented numbers.',
        'End with one line the user can send as-is to build the deck, on its own paragraph:',
        '#slides <one-sentence deck instruction naming the subject and the argument>',
    ].join(' ');
    const user = `${userAsk.slice(0, 400)}\n\n${contextBlock(ctx, 8000)}`;
    const out = await callRoutedText(model, system, user, 3000, 'Slide narrative plan');
    return scrubRewrite(out);
}
