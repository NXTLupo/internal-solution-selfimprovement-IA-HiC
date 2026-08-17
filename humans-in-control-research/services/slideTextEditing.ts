/**
 * slideTextEditing.ts - WS-4 of the v2 single-workspace program (2026-08-14,
 * plans/hic-v2-single-workspace-program-2026-08-14.md).
 *
 * Inline text editing for every slide in the deck preview: the text twin of the
 * user-directed imagery seam. Edits write payload fields; the preview iframe
 * re-renders from the payload; export carries the edit for free because stage
 * HTML and PPTX both render FROM the payload (Unified Vision phase 9 untouched).
 *
 * One generic contract for BOTH slide families:
 *  - slides:* archetypes  -> fields enumerate from composerPayload
 *  - classic templates    -> fields enumerate from the slide's data object(s)
 * No per-archetype field maps to maintain; the walker discovers editable
 * strings and skips config tokens, URLs, and underscore-prefixed carriers.
 */

import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS } from './aiRouter';
import {
    stripEmDashes, stripEmoji, deClicheText, removeMetaNarration,
    stripProcessReferences, stripMarkdown,
} from './slidePostProcessor';

export interface TextFieldRef {
    /** dot/bracket path relative to the edit root (composerPayload for slides:*, the slide for classic). */
    path: string;
    label: string;
    value: string;
    multiline: boolean;
}

export interface TextEdit { path: string; value: string; }

/** Keys that are never editable content (config, identity, media pointers). */
const KEY_DENYLIST = /^(id|template|brand|status|model|kind|fit|align|variant|density|slug|key|type|emphasis|level|payload)$/i;
const MEDIA_KEY = /image|imageurl|icon|url|src|logo|hex|color|glyph|href|avatar/i;
const URLISH = /^(https?:\/\/|data:|\/api\/|blob:)/i;
/** all-lowercase-token values are config (style tokens, enum values), not prose. */
const CONFIG_TOKEN = /^[a-z0-9][a-z0-9-_]*$/;

// 2026-08-14 owner live test: two-column archetypes (problem-diptych, evidence
// tables) nest fields deeper than the first caps allowed, which made whole
// slides read as "not editable". Depth 6 covers every registered payload shape.
const MAX_FIELDS = 60;
const MAX_DEPTH = 6;
const HISTORY_CAP = 10;

function humanize(path: string): string {
    return path
        .replace(/\[(\d+)\]/g, (_m, i) => ` ${Number(i) + 1}`)
        .split('.')
        .map(seg => seg.replace(/([a-z])([A-Z])/g, '$1 $2'))
        .join(' - ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function isEditableString(key: string, value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (v.length < 3) return false;
    if (KEY_DENYLIST.test(key) || MEDIA_KEY.test(key)) return false;
    if (URLISH.test(v)) return false;
    if (CONFIG_TOKEN.test(v)) return false;
    return true;
}

function walk(node: any, prefix: string, out: TextFieldRef[], depth: number): void {
    if (!node || typeof node !== 'object' || depth > MAX_DEPTH || out.length >= MAX_FIELDS) return;
    if (Array.isArray(node)) {
        node.forEach((item, i) => {
            if (out.length >= MAX_FIELDS) return;
            const p = `${prefix}[${i}]`;
            if (typeof item === 'string') {
                // array-of-strings items (bullets, list rows): key is the array name
                const key = prefix.replace(/^.*\./, '').replace(/\[\d+\]/g, '');
                if (isEditableString(key, item)) {
                    out.push({ path: p, label: humanize(p), value: item, multiline: item.length > 80 });
                }
            } else {
                walk(item, p, out, depth + 1);
            }
        });
        return;
    }
    for (const [key, value] of Object.entries(node)) {
        if (out.length >= MAX_FIELDS) return;
        if (key.startsWith('_')) continue;
        const p = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
            if (isEditableString(key, value)) {
                out.push({ path: p, label: humanize(p), value, multiline: value.length > 80 });
            }
        } else if (value && typeof value === 'object') {
            walk(value, p, out, depth + 1);
        }
    }
}

/** true when the slide is a slides:* archetype (edit root = composerPayload). */
export function isComposerSlide(slide: { template: string }): boolean {
    return String(slide.template).startsWith('slides:');
}

/** Slide-level keys that hold classic-template content (walked for non-composer slides). */
const CLASSIC_SKIP = /^(id|template|brand|status|model|timestamp|density|sources|imageUrl|imagePrompt|diagramImage|blocks|evidenceGap|composerPayload|journeyBrief)$/;

/**
 * Enumerate the editable text fields for a slide. Paths are relative to the
 * edit root: composerPayload for slides:*, the slide object for classic
 * templates (whose title/subtitle plus data objects walk generically).
 */
export function enumerateTextFields(slide: any): TextFieldRef[] {
    const out: TextFieldRef[] = [];
    if (isComposerSlide(slide)) {
        walk(slide.composerPayload || {}, '', out, 0);
        // title first for a stable, expected order
        out.sort((a, b) => (a.path === 'title' ? -1 : b.path === 'title' ? 1 : 0));
        return out;
    }
    const root: Record<string, any> = {};
    if (typeof slide.title === 'string') root.title = slide.title;
    if (typeof slide.subtitle === 'string') root.subtitle = slide.subtitle;
    if (typeof slide.body === 'string') root.body = slide.body;
    if (Array.isArray(slide.bullets)) root.bullets = slide.bullets;
    for (const [k, v] of Object.entries(slide)) {
        if (CLASSIC_SKIP.test(k) || k.startsWith('_') || k in root) continue;
        if (v && typeof v === 'object') root[k] = v;
    }
    walk(root, '', out, 0);
    out.sort((a, b) => (a.path === 'title' ? -1 : b.path === 'title' ? 1 : 0));
    return out;
}

function parsePath(path: string): (string | number)[] {
    const parts: (string | number)[] = [];
    for (const seg of path.split('.')) {
        const m = seg.match(/^([^[\]]+)((\[\d+\])*)$/);
        if (!m) { parts.push(seg); continue; }
        parts.push(m[1]);
        const idxs = m[2].match(/\d+/g) || [];
        for (const i of idxs) parts.push(Number(i));
    }
    return parts;
}

export function getAtPath(root: any, path: string): unknown {
    let cur = root;
    for (const p of parsePath(path)) {
        if (cur == null) return undefined;
        cur = cur[p as any];
    }
    return cur;
}

function setAtPath(root: any, path: string, value: string): void {
    const parts = parsePath(path);
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur == null) return;
        cur = cur[parts[i] as any];
    }
    if (cur != null) cur[parts[parts.length - 1] as any] = value;
}

/**
 * Apply text edits IMMUTABLY: returns a new slide object with a new edit-root
 * reference (so the preview iframe re-renders) and the pre-edit values pushed
 * onto the `_textHistory` ring for undo. Manual edits are never silently lost:
 * callers replace the slide in state; nothing mutates the original.
 */
export function applyTextEdits<T extends { template: string; title: string; composerPayload?: any; _textHistory?: any[] }>(
    slide: T, edits: TextEdit[],
): T {
    if (!edits.length) return slide;
    const composer = isComposerSlide(slide);
    const snapshot = edits.map(e => ({
        path: e.path,
        prev: String(getAtPath(composer ? (slide.composerPayload || {}) : slide, e.path) ?? ''),
    }));
    const history = [...(slide._textHistory || []), { at: Date.now(), edits: snapshot }].slice(-HISTORY_CAP);

    if (composer) {
        const payload = JSON.parse(JSON.stringify(slide.composerPayload || {}));
        for (const e of edits) setAtPath(payload, e.path, e.value);
        return {
            ...slide,
            composerPayload: payload,
            // deck nav + exports read slide.title; keep it in sync with the payload
            title: typeof payload.title === 'string' && payload.title ? payload.title : slide.title,
            _textHistory: history,
        };
    }
    const next: any = { ...slide, _textHistory: history };
    // clone the objects that edits touch so React sees new refs end to end
    const touchedRoots = new Set(edits.map(e => String(parsePath(e.path)[0])));
    for (const rootKey of touchedRoots) {
        const cur = (next as any)[rootKey];
        if (cur && typeof cur === 'object') (next as any)[rootKey] = JSON.parse(JSON.stringify(cur));
    }
    for (const e of edits) setAtPath(next, e.path, e.value);
    return next;
}

/** Undo the most recent edit batch. Returns the restored slide, or null when no history. */
export function undoLastTextEdit<T extends { template: string; title: string; composerPayload?: any; _textHistory?: any[] }>(
    slide: T,
): T | null {
    const history = slide._textHistory || [];
    if (!history.length) return null;
    const last = history[history.length - 1];
    const restored = applyTextEdits(slide, last.edits.map((e: any) => ({ path: e.path, value: e.prev })));
    // applyTextEdits pushed a new history entry for the undo itself; drop both
    return { ...restored, _textHistory: history.slice(0, -1) };
}

/**
 * Map a CLICKED preview element's text back to its payload field (owner UX
 * 2026-08-14: click the text on the slide itself, no card flip). Renderers may
 * uppercase or lightly truncate text, so matching is case-insensitive with a
 * containment fallback; the deepest exact match wins.
 */
/**
 * Strip citation machinery from a string for CLICK MATCHING and for what the
 * user edits: raw manifest pointers ([articles/x.md#c3]) live in the STORED
 * field while the RENDERED element shows the clean sentence (or a resolved
 * "(Source: X)" suffix). Without this strip, every citation-carrying field
 * (most list items) failed to match and read as "not editable" (owner live
 * report 2026-08-17).
 */
export function stripCitationArtifacts(s: string): string {
    return String(s || '')
        .replace(/\[\s*[\w./\\-]+\.md#c\d+(?:\s*[,;]\s*[\w./\\-]+\.md#c\d+)*\s*\]/gi, '')
        .replace(/[\w./\\-]+\.md#c\d+/gi, '')
        .replace(/\(Sources?:\s*[^)]+\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** The citation markers of a stored field value, verbatim, for re-attachment. */
export function citationMarkersOf(value: string): string {
    return (String(value || '').match(/\[\s*[\w./\\-]+\.md#c\d+(?:\s*[,;]\s*[\w./\\-]+\.md#c\d+)*\s*\]/gi) || []).join(' ');
}

/**
 * Merge a user's inline edit back into a stored field WITHOUT destroying its
 * provenance: the original value's pointer markers re-attach to the edited
 * text (the user edits the sentence; the citation is the system's).
 */
export function mergeEditPreservingCitations(originalValue: string, editedText: string): string {
    const markers = citationMarkersOf(originalValue);
    const clean = editedText.trim();
    if (!markers || clean.includes('.md#c')) return clean;
    return `${clean} ${markers}`.trim();
}

export function matchFieldByText(slide: any, clickedText: string): TextFieldRef | null {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    // composers bake enumeration prefixes ("01:", "3.") into the rendered
    // element; the payload field carries only the text, so match both forms.
    const stripEnum = (s: string) => s.replace(/^\d{1,2}\s*[:.)-]\s*/, '');
    const clickedRaw = stripCitationArtifacts(clickedText || '');
    const clicked = norm(clickedRaw);
    const clickedStripped = norm(stripEnum(clickedRaw));
    if (clicked.length < 3 || clicked.length > 600) return null;
    const fields = enumerateTextFields(slide);
    let best: TextFieldRef | null = null;
    let bestScore = 0;
    for (const f of fields) {
        const v = norm(stripCitationArtifacts(f.value));
        if (!v) continue;
        let score = 0;
        for (const c of [clicked, clickedStripped]) {
            if (!c) continue;
            if (v === c) score = Math.max(score, 3);
            else if (c.includes(v) && v.length / c.length >= 0.5) score = Math.max(score, 1 + v.length / c.length);
            else if (v.includes(c) && c.length / v.length >= 0.5) score = Math.max(score, 1 + c.length / v.length);
        }
        if (score > bestScore) { bestScore = score; best = f; }
    }
    return bestScore >= 1.5 ? best : null;
}

/**
 * Three alternative phrasings for one field (the toolbar's AI suggestions).
 * One flash call, JSON array out, each variant scrubbed. Empty array on failure.
 */
export async function suggestFieldRewrites(current: string, slideTitle?: string): Promise<string[]> {
    const system = [
        'You offer alternative phrasings for one text field on a consulting slide. Return ONLY a JSON array of exactly 3 strings:',
        '[0] a tighter version (fewest words, same claim), [1] a more specific version (name the actor or system),',
        '[2] a plainer version (kill any buzzword or abstraction). Rules: plain literal business language; no em-dash;',
        'no emoji; never invent numbers, names, or sources; keep any named source attribution verbatim; keep each a complete thought.',
    ].join(' ');
    const user = [
        slideTitle ? `Slide title (context): ${slideTitle}` : '',
        `Current text:\n${current}`,
    ].filter(Boolean).join('\n\n');
    try {
        const parsed = await callAIWithRetry('gemini', {
            model: DEFAULT_MODELS.fast_generation,
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            config: { temperature: 0.4, maxOutputTokens: 900, responseMimeType: 'application/json' },
        }, { label: 'Field rewrite suggestions', maxAttempts: 2, requestTimeoutMs: 20_000 });
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const cleaned = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        let arr: any = null;
        try { arr = JSON.parse(cleaned); } catch {
            const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']');
            if (s >= 0 && e > s) { try { arr = JSON.parse(cleaned.slice(s, e + 1)); } catch { /* give up */ } }
        }
        if (!Array.isArray(arr)) return [];
        return arr.filter((v: any) => typeof v === 'string')
            .map((v: string) => scrubRewrite(v))
            .filter((v: string) => v.length >= 2 && v !== current)
            .slice(0, 3);
    } catch (e: any) {
        console.warn('[slideTextEditing] suggestions failed (toolbar shows none):', e?.message || e);
        return [];
    }
}

/** The per-field AI rewrite actions (PDF item 12). Instructions are literal and minimal. */
export const REWRITE_ACTIONS: Record<string, string> = {
    concise: 'Rewrite this more concisely. Keep the core claim and any named sources. Cut every word that adds no fact.',
    executive: 'Rewrite this for an executive reader: plain subject, direct verb, the decision or consequence up front.',
    specific: 'Rewrite this to be more specific: name the actor, the system, or the named source instead of abstractions.',
    plainer: 'Rewrite this in plain literal business language. Remove buzzwords, metaphors, and generic consulting phrasing.',
    conversational: 'Rewrite this so a presenter could say it aloud naturally in a live meeting, without losing the claim.',
};

/** Anti-slop scrub applied to EVERY model-returned string (standing rule). */
export function scrubRewrite(text: string): string {
    let t = stripMarkdown(String(text || ''));
    t = stripEmDashes(t);
    t = stripEmoji(t);
    t = removeMetaNarration(t);
    t = stripProcessReferences(t);
    t = deClicheText(t);
    return t.replace(/^["']|["']$/g, '').trim();
}

/**
 * Rewrite one field's text via the routed fast model (gemini-3.5-flash per
 * DEFAULT_MODELS.fast_generation - the model id is never hardcoded here).
 * Returns the scrubbed rewrite, or '' on any failure (caller keeps the original).
 */
export async function rewriteFieldText(
    current: string, action: keyof typeof REWRITE_ACTIONS | string, slideTitle?: string,
): Promise<string> {
    const instruction = REWRITE_ACTIONS[action as string] || String(action);
    const system = [
        'You rewrite one text field on a consulting slide. Return ONLY the rewritten text, no preamble, no quotes, no markdown.',
        'Rules: plain literal business language; name actors and systems; no em-dash; no emoji; no meta-narration;',
        'no corporate cliches; never invent numbers, names, or sources; keep any existing named source attribution verbatim.',
    ].join(' ');
    const user = [
        slideTitle ? `Slide title (context): ${slideTitle}` : '',
        `Instruction: ${instruction}`,
        `Text to rewrite:\n${current}`,
    ].filter(Boolean).join('\n\n');
    try {
        const parsed = await callAIWithRetry('gemini', {
            model: DEFAULT_MODELS.fast_generation,
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            config: { temperature: 0.3, maxOutputTokens: 800 },
        }, { label: 'Slide text rewrite', maxAttempts: 2, requestTimeoutMs: 25_000 });
        const out = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
            ?? parsed?.choices?.[0]?.message?.content ?? '';
        const scrubbed = scrubRewrite(out);
        return scrubbed.length >= 2 ? scrubbed : '';
    } catch (e: any) {
        console.warn('[slideTextEditing] rewrite failed (field keeps original):', e?.message || e);
        return '';
    }
}
