/**
 * engagementLedger: the SHARED analysis of every client document an engagement uploaded (2026-10-02, owner rules:
 * "Document uploads, whether in the beginning of a research project or in the analyst chat SHOULD ALWAYS BE
 * THOROUGHLY ANALYZED"; "there should be requirements documented against every articulated feature and piece of
 * feedback"; "make sure all captured themes in the Research Assembly Board are ALSO ALL reflected"; "these rules
 * must be deterministically enforced and generalized for ANY RESEARCH PROJECT").
 *
 * Every deliverable reads the same ledger (`loadEngagementLedger`); the PRD is its first consumer. Three item
 * types, each a coverage root for any deliverable's coverage contract (services/deliverableRules.ts):
 *   STATED   (SF-n) a feature, capability, deliverable, acceptance item or constraint a document states.
 *   FEEDBACK (FB-n) a stakeholder reaction, decision, change request or open question from meeting notes,
 *            a feedback note or a review, including comments on a prototype or design.
 *   THEME    (TH-n) a group of Research Assembly Board themes (near-duplicates collapsed; every theme id kept).
 *
 * Every client-upload page is read IN FULL (every chunk; never similarity-sampled); each document is analyzed by
 * the reasoning model with a strict JSON contract; every quote is located in the chunk text by the system and the
 * pointer, source name and document title are copied from the page, never authored by the model. Feature AREAS
 * are derived per project from the ledger's own text (`assignAreas`), never from a fixed list.
 *
 * Persistence: wiki `engagements/<slug>/ledger.json` through /api/wiki/write with a read-before-write precondition
 * (multi-worker safe), incremental by document content hash + extractor version.
 *
 * Generic by rule: nothing in this file names a client, an industry, a product or a vendor.
 */

export type LedgerType = 'stated' | 'feedback' | 'theme';
export type LedgerDisposition = 'add' | 'change' | 'remove' | 'reprioritize' | 'open-question';
/** The label the SOURCE puts on the item; `required` and `decision` carry their own authority. */
export type LedgerLabel = 'required' | 'recommended' | 'optional' | 'out-of-scope' | 'decision' | 'request' | 'unspecified';
export interface LedgerSourceRef {
    quote: string;
    sourceName: string;
    /** `<wikiPath>#cN`, or REQUEST_POINTER for an item read from the user's request. */
    pointer: string;
    documentTitle: string;
    date?: string;
    speaker?: string;
}
export interface LedgerItem {
    id: string;                          // SF-n | FB-n | TH-n
    type: LedgerType;
    /** Short name of the feature, the feedback or the theme. */
    item: string;
    /** The item restated as one single-outcome sentence (used by deterministic fills). */
    statement: string;
    quote: string;
    sourceName: string;
    pointer: string;
    documentTitle: string;
    speaker?: string;
    date?: string;
    /** Derived area id (`AREA-n`), assigned per project by `assignAreas`. */
    featureArea: string;
    disposition?: LedgerDisposition;
    label: LedgerLabel;
    /** The heading the source groups the item under. */
    group?: string;
    /** Every source behind the item after dedupe; the first is the primary. */
    sources: LedgerSourceRef[];
    /** Set by a consumer's provenance lock (the Q id of the primary quote). */
    quoteId?: string;
    /** THEME items: every original board theme id in the group. */
    themeIds?: string[];
    themeMembers?: Array<{ id: string; name: string; sentiment?: string; category?: string }>;
    /** The document kind recognized from structure and generic cues. */
    documentKind?: DocumentKind;
}
export interface LedgerArea { id: string; label: string; items: number }
/** A board theme as the ledger reads it (structurally the PRD's theme input). */
export interface ThemeInput {
    id: string;
    name: string;
    insight?: string;
    sentiment?: string;
    category?: string;
    /** Origin of a cached theme ("cached") and its synthesis file: what the board-admission gate reads. */
    source?: string;
    source_synthesis_path?: string;
    quotes: Array<{ text: string; source: string; pointer?: string }>;
}
export type DocumentKind = 'contract' | 'brief' | 'meeting-notes' | 'feedback' | 'requirements-list' | 'deck' | 'spreadsheet' | 'document';

const LEDGER_EXTRACTOR_VERSION = 'engagement-ledger-2026-10-02.3';
const DEFAULT_PROXY = 'http://127.0.0.1:5012';
/** Characters of document text per extraction call. Smaller parts raise recall on long contracts. */
const PART_BUDGET = 16000;
const REQUEST_POINTER = 'request';

// ---- pages ---------------------------------------------------------------------------------------------

export interface UploadChunk { id: string; text: string }
export interface UploadPage {
    wikiPath: string;
    title: string;
    date?: string;
    contentHash: string;
    extractedAt?: string;
    body: string;
    chunks: UploadChunk[];
    kind?: DocumentKind;
}

/** FNV-1a over the body: a stable content hash when the page frontmatter carries none. */
function hashText(s: string): string {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const fmField = (fm: string, key: string): string => {
    const m = new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm').exec(fm);
    return m ? m[1].trim() : '';
};

/**
 * Parse a wiki article page (frontmatter + body) into its chunks. Offsets in `chunks:` are into the
 * post-frontmatter body (the same contract as proxy `_slice_chunk_from_article`). A page without a chunk map
 * becomes one chunk `#c0` holding the whole body, so no document is ever skipped.
 */
export function parseUploadPage(raw: string, wikiPath: string): UploadPage | null {
    const text = String(raw || '');
    if (!text.trim()) return null;
    let fm = '', body = text;
    if (text.startsWith('---')) {
        const end = text.indexOf('\n---', 4);
        if (end > 0) {
            fm = text.slice(0, end);
            body = text.slice(end + 4).replace(/^\n+/, '');
        }
    }
    const chunks: UploadChunk[] = [];
    const re = /-\s*id:\s*"([^"\n]*#(c\d+))"\s*\n\s*char_span:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fm))) {
        const a = +m[3], b = +m[4];
        if (b > a && a < body.length) chunks.push({ id: `${wikiPath}#${m[2]}`, text: body.slice(a, Math.min(b, body.length)) });
    }
    if (!chunks.length && body.trim()) chunks.push({ id: `${wikiPath}#c0`, text: body });
    const rawTitle = fmField(fm, 'title') || (/^#\s+(.+)$/m.exec(body)?.[1] || wikiPath.split('/').pop() || wikiPath);
    return {
        wikiPath,
        title: rawTitle.trim(),
        date: fmField(fm, 'date') || undefined,
        contentHash: fmField(fm, 'content_hash') || hashText(body),
        extractedAt: fmField(fm, 'extracted_at') || fmField(fm, 'collected_at') || undefined,
        body,
        chunks,
        kind: documentKind(rawTitle, body),
    };
}

/** Reader-facing document title: the file name without extension, revision suffix or underscores. */
export function documentTitle(raw: string): string {
    let t = decodeURIComponent(String(raw || '')).replace(/\.(pdf|docx?|txt|md|pptx?|xlsx?|csv|rtf)$/i, '');
    t = t.replace(/\s*\(\d+\)\s*$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return t || 'Client document';
}

/** Key for collapsing duplicate copies of one document: normalized title. */
function documentKey(title: string): string {
    return documentTitle(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(final|clean|draft|copy|redacted|v\d+)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Collapse duplicate copies (same normalized title OR same content hash); keep the newest. */
export function collapseDuplicateDocuments(pages: UploadPage[]): { kept: UploadPage[]; dropped: Array<{ wikiPath: string; duplicateOf: string }> } {
    const newest = (a: UploadPage, b: UploadPage) => String(a.extractedAt || '') >= String(b.extractedAt || '') ? a : b;
    const byKey = new Map<string, UploadPage>();
    const keyOf = new Map<string, string>();
    for (const p of pages) {
        const kt = `t:${documentKey(p.title)}`, kh = `h:${p.contentHash}`;
        const existingKey = byKey.has(kt) ? kt : (byKey.has(kh) ? kh : null);
        if (!existingKey) { byKey.set(kt, p); byKey.set(kh, p); keyOf.set(p.wikiPath, kt); continue; }
        const cur = byKey.get(existingKey)!;
        const win = newest(p, cur);
        for (const [k, v] of [...byKey.entries()]) if (v === cur) byKey.set(k, win);
        byKey.set(kt, win); byKey.set(kh, win);
    }
    const kept = Array.from(new Set(byKey.values()));
    const keptPaths = new Set(kept.map(k => k.wikiPath));
    const dropped = pages.filter(p => !keptPaths.has(p.wikiPath)).map(p => {
        const win = byKey.get(`t:${documentKey(p.title)}`) || byKey.get(`h:${p.contentHash}`);
        return { wikiPath: p.wikiPath, duplicateOf: win?.wikiPath || '' };
    });
    kept.sort((a, b) => a.wikiPath.localeCompare(b.wikiPath));
    return { kept, dropped };
}

// ---- classification + normalization -------------------------------------------------------------------

/**
 * Document kind from STRUCTURE and generic cues (never a client name): meeting notes carry attendees, action items
 * or decisions; a contract carries deliverables, fees, terms or a scope section; a requirements list carries many
 * short bulleted lines with required / recommended / must / shall labels; a deck carries page or slide markers.
 */
export function documentKind(title: string, body: string): DocumentKind {
    const t = `${title}\n${body.slice(0, 20000)}`.toLowerCase();
    const lines = body.split(/\n/).map(l => l.trim()).filter(Boolean);
    const bullets = lines.filter(l => /^(?:[-*\u2022\u25aa\u25cf]|\d+[.)]|[a-z][.)])\s*\S/i.test(l)).length;
    const labels = (t.match(/\b(required|recommended|optional|must|shall|should)\b/g) || []).length;
    if (/\.(csv|xlsx?)$/i.test(title)) return 'spreadsheet';
    const hits = (re: RegExp) => (t.match(re) || []).length;
    const meeting = hits(/\b(attendees|action items|meeting summary|minutes|agenda|facilitated by|next steps|open questions)\b/g);
    const contract = hits(/\b(statement of work|scope of work|master services|deliverables?|fees|payment terms|term of this|acceptance criteria|consultant|services agreement|invoice)\b/g);
    // 2026-10-02 live ledger: three slide decks (a kickoff deck and two people-and-sessions decks, 321 items) were
    // typed "contract" because a deck says "deliverables" often. A contract carries its legal markers; a deck carries
    // slide or page markers or a deck file type. Strong markers decide first, the weak word count last.
    const strongContract = hits(/\b(statement of work|scope of work|master services|payment terms|services agreement|term of this|invoic(?:e|ing))\b/g);
    const deckMarkers = (t.match(/\[page \d+\]|\bslide \d+\b/g) || []).length;
    const deckFile = /\.(pptx?|key)$/i.test(title);
    if (meeting >= 2 && meeting >= contract) return 'meeting-notes';
    if (strongContract >= 1) return 'contract';
    if (deckFile || (deckMarkers >= 3 && !(labels >= 6 && bullets >= 8))) return 'deck';
    if (contract >= 2) return 'contract';
    if (/\bfeedback\b|\breview(?:er)? comments\b/.test(`${title}\n${body.slice(0, 600)}`.toLowerCase())) return 'feedback';
    if (meeting >= 1) return 'meeting-notes';
    if (labels >= 6 && bullets >= 8) return 'requirements-list';
    if ((t.match(/\[page \d+\]|\bslide \d+\b/g) || []).length >= 3) return 'deck';
    if (/\b(brief|overview|objectives|vision)\b/.test(t)) return 'brief';
    return 'document';
}

function normV(s: string): string {
    return String(s || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normLabel(v: any, type: LedgerType): LedgerLabel {
    const s = String(v || '').toLowerCase().trim();
    if (/^(required|must|in[- ]?scope|mandatory|contract(ual)?|deliverable)$/.test(s)) return 'required';
    if (/^(recommended|should|suggested)$/.test(s)) return 'recommended';
    if (/^(optional|nice[- ]to[- ]have|could)$/.test(s)) return 'optional';
    if (/^(out[- ]of[- ]scope|parked|deferred|excluded|phase ?2|later phase|wont|won't)$/.test(s)) return 'out-of-scope';
    if (/^(decision|decided|agreed|confirmed)$/.test(s)) return 'decision';
    if (/^(request|change request|ask|suggestion)$/.test(s)) return 'request';
    return type === 'feedback' ? 'request' : 'unspecified';
}

function normDisposition(v: any): LedgerDisposition | undefined {
    const s = String(v || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
    if (['add', 'change', 'remove', 'reprioritize', 'open-question'].includes(s)) return s as LedgerDisposition;
    if (s === 'question' || s === 'open') return 'open-question';
    if (s === 'reprioritise' || s === 'priority') return 'reprioritize';
    if (s === 'keep' || s === 'retain') return 'change';
    return undefined;
}

const str = (v: any): string => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const noEmDash = (s: string): string => s.replace(/\s*\u2014\s*/g, ', ').replace(/\u2013/g, '-');

// ---- verbatim location (provenance lock) -----------------------------------------------------------

/**
 * Find the quote in the chunk and return the SOURCE'S OWN characters for it. Three tiers:
 *   exact:   the normalized quote is a substring (whitespace collapsed in the returned slice);
 *   squash:  the quote matches once spacing and punctuation are ignored ("sub -let" in a PDF vs "sub-let"),
 *            and the chunk's own span is returned;
 *   segment: no span matches; the chunk line or sentence that carries most of the quote's words (>= 60%)
 *            is returned instead. The model never supplies the text that ships.
 */
export function locateVerbatim(quote: string, chunkText: string): { text: string; method: 'exact' | 'squash' | 'segment' } | null {
    const q = str(quote).replace(/^["'“]+|["'”]+$/g, '').replace(/(\.\.\.|…)$/, '').trim();
    const text = String(chunkText || '');
    if (q.length < 8 || !text) return null;
    const pieces = q.split(/\s*(?:\.\.\.|…)\s*/).filter(p => p.length >= 8).sort((a, b) => b.length - a.length);
    for (const piece of pieces.length ? pieces : [q]) {
        const idx: number[] = [];
        let sq = '';
        for (let i = 0; i < text.length; i++) {
            const c = text[i].toLowerCase();
            if (/[a-z0-9]/.test(c)) { sq += c; idx.push(i); }
        }
        const qq = piece.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (qq.length >= 8) {
            const at = sq.indexOf(qq);
            if (at >= 0) {
                const slice = text.slice(idx[at], idx[at + qq.length - 1] + 1).replace(/\s+/g, ' ').trim();
                return { text: slice, method: normV(text).includes(normV(piece)) && slice.toLowerCase() === piece.toLowerCase() ? 'exact' : 'squash' };
            }
        }
    }
    const words = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) || []));
    const qw = words(q);
    if (qw.size < 3) return null;
    const segs = text.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.length >= 12);
    let best = '', bestScore = 0;
    for (const sgm of segs) {
        const sw = words(sgm);
        let hit = 0;
        for (const w of qw) if (sw.has(w)) hit++;
        const score = hit / qw.size;
        if (score > bestScore) { best = sgm; bestScore = score; }
    }
    if (bestScore >= 0.6 && best) return { text: best.length > 400 ? best.slice(0, 400).replace(/\s+\S*$/, '') : best, method: 'segment' };
    return null;
}

// ---- extraction prompt --------------------------------------------------------------------------------

export interface ExtractionPart {
    page: UploadPage;
    chunks: UploadChunk[];
    part: number;
    parts: number;
}

/** Split documents into extraction parts of at most PART_BUDGET characters (chunk boundaries kept). */
function planExtractionParts(pages: UploadPage[], budget = PART_BUDGET): ExtractionPart[][] {
    const perDoc: ExtractionPart[] = [];
    for (const page of pages) {
        const groups: UploadChunk[][] = [];
        let cur: UploadChunk[] = [], n = 0;
        for (const c of page.chunks) {
            if (cur.length && n + c.text.length > budget) { groups.push(cur); cur = []; n = 0; }
            cur.push(c); n += c.text.length;
        }
        if (cur.length) groups.push(cur);
        groups.forEach((g, i) => perDoc.push({ page, chunks: g, part: i + 1, parts: groups.length }));
    }
    // Small parts share a call; a call never exceeds the budget unless one part alone does.
    const calls: ExtractionPart[][] = [];
    let batch: ExtractionPart[] = [], size = 0;
    for (const p of perDoc) {
        const len = p.chunks.reduce((a, c) => a + c.text.length, 0);
        if (batch.length && size + len > budget) { calls.push(batch); batch = []; size = 0; }
        batch.push(p); size += len;
    }
    if (batch.length) calls.push(batch);
    return calls;
}

const EXTRACTION_SYSTEM = [
    'You build the scope and feedback ledger for a consulting deliverable. You read client documents in full and list every distinct item a requirement must be written against. You never summarize several items into one, and you never skip an item because it seems minor.',
    '',
    'TWO ITEM TYPES:',
    '- "stated": a feature, capability, screen, deliverable, acceptance criterion, constraint, data source, integration, phase scope, or in-scope / out-of-scope item that the document states the product or the engagement provides. Contracts, kickoff decks, briefs and requirement lists are mostly stated items. Every deliverable a contract lists is its own item. Every capability a deck or a brief lists is its own item. In a requirement list grouped into sections, every section is an item AND every bullet inside it is its own item, with the section name in "group" and the section\'s label (required, recommended) in "label".',
    '- "feedback": a stakeholder reaction, decision, change request, concern, open question or agreed next step about the product, recorded in meeting notes, a feedback note or a review. Every comment about a prototype or a design is its own feedback item, both what reviewers liked and what they want changed. Every row under a requirements, considerations, decisions or open-questions heading in meeting notes is its own item.',
    '',
    'SKIP: legal boilerplate, payment and fee terms, signatures, confidentiality, insurance, generic contract clauses, and attendee lists. KEEP anything that constrains the product (data ownership, security, privacy, hosting, accessibility, acceptance, the timeline of a product deliverable).',
    '',
    'FIELDS for each item:',
    '- "type": "stated" or "feedback".',
    '- "item": a short name of the feature or the feedback, under twelve words, plain and literal.',
    '- "statement": the item restated as ONE requirement sentence with one outcome, naming the actor ("The portal shows each applicant the status of every submitted form."). No metaphor, no em dash.',
    '- "quote": a VERBATIM span copied character for character from ONE chunk: the sentence or list line that states the item, between twelve and three hundred characters. Never paraphrase, never fix spelling or spacing, never join text from two places.',
    '- "chunk": the id of the chunk the quote is copied from, exactly as shown in brackets (for example "c3").',
    '- "speaker": the person or role the text names as saying or owning it, else "".',
    '- "date": the date the document gives for the item or the meeting (YYYY-MM-DD when possible), else "".',
    '- "label": the label the SOURCE gives: required (also: in scope, must, a contracted deliverable), recommended, optional (nice to have), out-of-scope (also parked, later phase), decision (an agreed decision in a meeting), request (a suggestion or ask), or unspecified.',
    '- "disposition" (feedback only): add, change, remove, reprioritize or open-question; "" for stated items.',
    '- "group": the heading or section the item sits under in the source, else "".',
    '',
    'OUTPUT: one JSON object {"items": [ ... ]}, items in document order. No preamble, no code fence.',
].join('\n');

function buildLedgerExtractionPrompt(call: ExtractionPart[]): { system: string; user: string } {
    const blocks = call.map(p => {
        const head = `DOCUMENT "${documentTitle(p.page.title)}"${p.page.date ? ` (dated ${p.page.date})` : ''}${p.parts > 1 ? `, part ${p.part} of ${p.parts}` : ''}${p.page.kind && p.page.kind !== 'document' ? `; recognized kind: ${p.page.kind.replace(/-/g, ' ')}` : ''}`;
        const body = p.chunks.map(c => `[${c.id.split('#').pop()}] ${c.text}`).join('\n\n');
        return `${head}\nDOC_ID: ${p.page.wikiPath}\n${body}`;
    });
    const user = [
        'Extract the ledger from the documents below. When there is more than one document, add "doc": the DOC_ID of the document the item comes from.',
        '',
        ...blocks.map(b => `${b}\n\n=====`),
        '',
        'Return {"items": [...]} with every stated item and every piece of feedback.',
    ].join('\n');
    return { system: EXTRACTION_SYSTEM, user };
}

// ---- lock ------------------------------------------------------------------------------------------------

/** A locked, pre-dedupe ledger entry: what is persisted per document. */
export interface LedgerDraftItem {
    type: LedgerType;
    item: string;
    statement: string;
    quote: string;
    pointer: string;
    sourceName: string;
    documentTitle: string;
    speaker?: string;
    date?: string;
    disposition?: LedgerDisposition;
    label: LedgerLabel;
    group?: string;
    documentKind?: DocumentKind;
}

export interface LockReport {
    items: LedgerDraftItem[];
    dropped: Array<{ item: string; quote: string; reason: string }>;
    byMethod: Record<'exact' | 'squash' | 'segment', number>;
}

function parseItemsJson(raw: string): any[] {
    let s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const tryParse = (x: string) => { try { return JSON.parse(x); } catch { return undefined; } };
    let obj = tryParse(s);
    if (obj === undefined) {
        const a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a >= 0 && b > a) obj = tryParse(s.slice(a, b + 1));
    }
    if (obj === undefined) {
        // A reply cut off mid-array: keep every complete item object.
        const start = s.indexOf('[');
        const out: any[] = [];
        if (start >= 0) {
            let depth = 0, from = -1, inStr = false, esc = false;
            for (let i = start + 1; i < s.length; i++) {
                const ch = s[i];
                if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
                if (ch === '"') inStr = true;
                else if (ch === '{') { if (depth === 0) from = i; depth++; }
                else if (ch === '}') { depth--; if (depth === 0 && from >= 0) { const o = tryParse(s.slice(from, i + 1)); if (o) out.push(o); from = -1; } }
            }
        }
        return out;
    }
    if (Array.isArray(obj)) return obj;
    return Array.isArray(obj?.items) ? obj.items : [];
}

/**
 * Provenance-lock one extraction reply against the documents of the call. The quote must be found in the cited
 * chunk (or, failing that, anywhere in the same document); the shipped quote is the chunk's own text; the pointer,
 * source name and title are copied from the page. Items whose quote cannot be located are dropped and reported.
 */
export function lockExtractedItems(raw: string, call: ExtractionPart[]): LockReport {
    const out: LedgerDraftItem[] = [];
    const dropped: LockReport['dropped'] = [];
    const byMethod = { exact: 0, squash: 0, segment: 0 };
    const pages = Array.from(new Set(call.map(p => p.page)));
    for (const it of parseItemsJson(raw)) {
        if (!it || typeof it !== 'object') continue;
        const pageKind = (pages.find(p => p.wikiPath === str(it.doc)) || pages[0])?.kind;
        const type: LedgerType = /feed/i.test(String(it.type)) ? 'feedback' : /stat/i.test(String(it.type)) ? 'stated' : (pageKind === 'meeting-notes' || pageKind === 'feedback' ? 'feedback' : 'stated');
        const item = noEmDash(str(it.item));
        const quote = str(it.quote);
        if (!item && !quote) continue;
        const docHint = str(it.doc);
        const page = pages.find(p => p.wikiPath === docHint) || (pages.length === 1 ? pages[0] : undefined);
        const searchPages = page ? [page] : pages;
        const cid = str(it.chunk).replace(/^.*#/, '').replace(/^\[|\]$/g, '');
        let hit: { page: UploadPage; chunk: UploadChunk; text: string; method: 'exact' | 'squash' | 'segment' } | null = null;
        for (const pg of searchPages) {
            const cited = pg.chunks.find(c => c.id.endsWith(`#${cid}`));
            const order = cited ? [cited, ...pg.chunks.filter(c => c !== cited)] : pg.chunks;
            // Exact/squash in any chunk of the document beats a segment match in the cited one.
            for (const c of order) {
                const loc = locateVerbatim(quote, c.text);
                if (loc && loc.method !== 'segment') { hit = { page: pg, chunk: c, ...loc }; break; }
            }
            if (!hit) for (const c of order) {
                const loc = locateVerbatim(quote || `${item} ${str(it.statement)}`, c.text);
                if (loc) { hit = { page: pg, chunk: c, ...loc }; break; }
            }
            if (hit) break;
        }
        if (!hit) { dropped.push({ item, quote, reason: 'quote not found in the document' }); continue; }
        byMethod[hit.method] += 1;
        out.push({
            type,
            item: item || hit.text.slice(0, 80),
            statement: noEmDash(str(it.statement)) || item,
            quote: hit.text,
            pointer: hit.chunk.id,
            sourceName: `Client document: ${documentTitle(hit.page.title)}`,
            documentTitle: documentTitle(hit.page.title),
            speaker: str(it.speaker) || undefined,
            date: str(it.date) || hit.page.date || undefined,
            documentKind: hit.page.kind,
            disposition: type === 'feedback' ? (normDisposition(it.disposition) || 'change') : undefined,
            label: normLabel(it.label, type),
            group: noEmDash(str(it.group)) || undefined,
        });
    }
    return { items: out, dropped, byMethod };
}

// ---- the deliverable request itself --------------------------------------------------------------------------

/**
 * Requirement-like items in the user's request prompt, typed STATED with source "Request". A sentence with a
 * requirement verb is one item; a "focusing on X, Y and Z" list yields one item per element.
 */
export function requestLedgerItems(requestText: string): LedgerDraftItem[] {
    const text = str(requestText);
    if (!text) return [];
    const out: LedgerDraftItem[] = [];
    const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
    const mk = (item: string, statement: string, quote: string): LedgerDraftItem => ({
        type: 'stated', item, statement, quote: quote.trim(), pointer: REQUEST_POINTER, sourceName: 'Request',
        documentTitle: 'Request', label: 'request',
    });
    for (const s0 of sentences) {
        const s = s0.trim();
        if (s.length < 12) continue;
        const list = /\b(?:focus(?:ing|es)? on|including|includes?|covering|with emphasis on|emphasi[sz]ing)\s+(.+?)[.!?]?$/i.exec(s);
        if (list) {
            const parts = list[1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map(x => x.trim().replace(/^(?:the|a|an)\s+/i, '')).filter(x => x.length >= 3);
            for (const p of parts) {
                const name = p.charAt(0).toUpperCase() + p.slice(1);
                out.push(mk(name, `The product delivers ${p}.`, s));
            }
            continue;
        }
        if (/\b(must|should|needs? to|require[sd]?|shall)\b/i.test(s)) out.push(mk(s.replace(/[.!?]$/, ''), s, s));
    }
    return out;
}

// ---- dedupe + ids -------------------------------------------------------------------------------------

const STOP = new Set('the a an and or of to in on for with from by at as is are be it its this that their they will can each every into over'.split(' '));
function tokens(s: string): Set<string> {
    return new Set((String(s || '').toLowerCase().match(/[a-z0-9][a-z0-9'-]+/g) || []).filter(w => !STOP.has(w) && w.length > 2));
}
function jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n / (a.size + b.size - n);
}
const LABEL_RANK: Record<LedgerLabel, number> = { required: 6, decision: 5, recommended: 4, request: 3, optional: 2, unspecified: 1, 'out-of-scope': 0 };

/**
 * Merge near-identical items (same type; same verbatim quote, or item+statement token overlap >= 0.75) across
 * and within documents, keeping every source on the merged item, then assign SF-n / FB-n in a stable order:
 * documents by title, the request last, items in document order.
 */
export function dedupeLedgerItems(drafts: LedgerDraftItem[]): LedgerItem[] {
    const ordered = [...drafts].map((d, i) => ({ d, i })).sort((a, b) => {
        const ra = a.d.pointer === REQUEST_POINTER ? 1 : 0, rb = b.d.pointer === REQUEST_POINTER ? 1 : 0;
        if (ra !== rb) return ra - rb;
        const t = a.d.documentTitle.localeCompare(b.d.documentTitle);
        if (t) return t;
        const ca = +(/#c(\d+)$/.exec(a.d.pointer)?.[1] || 0), cb = +(/#c(\d+)$/.exec(b.d.pointer)?.[1] || 0);
        return (ca - cb) || (a.i - b.i);
    }).map(x => x.d);
    const merged: Array<{ base: LedgerDraftItem; sources: LedgerSourceRef[]; tok: Set<string>; label: LedgerLabel }> = [];
    for (const d of ordered) {
        const tok = tokens(`${d.item} ${d.statement}`);
        const qn = d.quote.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Feedback with opposite dispositions ("keep X" vs "remove X") shares most words but is two items.
        const same = merged.find(m => m.base.type === d.type && (d.type !== 'feedback' || m.base.disposition === d.disposition) && (
            (qn.length >= 20 && m.base.quote.toLowerCase().replace(/[^a-z0-9]/g, '') === qn && m.base.item.toLowerCase() === d.item.toLowerCase())
            || jaccard(m.tok, tok) >= 0.75));
        const ref: LedgerSourceRef = { quote: d.quote, sourceName: d.sourceName, pointer: d.pointer, documentTitle: d.documentTitle, date: d.date, speaker: d.speaker };
        if (same) {
            if (!same.sources.some(s => s.pointer === ref.pointer && s.quote === ref.quote)) same.sources.push(ref);
            if (LABEL_RANK[d.label] > LABEL_RANK[same.label]) same.label = d.label;
            continue;
        }
        merged.push({ base: d, sources: [ref], tok, label: d.label });
    }
    let sf = 0, fb = 0;
    return merged.map(m => ({
        id: m.base.type === 'stated' ? `SF-${++sf}` : `FB-${++fb}`,
        type: m.base.type, item: m.base.item, statement: m.base.statement, quote: m.base.quote,
        sourceName: m.base.sourceName, pointer: m.base.pointer, documentTitle: m.base.documentTitle,
        speaker: m.base.speaker, date: m.base.date, featureArea: '', disposition: m.base.disposition, documentKind: m.base.documentKind,
        label: m.label, group: m.base.group, sources: m.sources,
    }));
}

// ---- persistence + model access ----------------------------------------------------------------------

export type LedgerGen = (call: { system: string; user: string; label: string; maxTokens?: number }) => Promise<string>;

export interface PersistedDocument {
    wikiPath: string;
    title: string;
    contentHash: string;
    extractorVersion: string;
    analyzedAt: string;
    chunkCount: number;
    /** Chunks that reached an extraction prompt; equals chunkCount when the document was read in full. */
    chunksRead: number;
    items: LedgerDraftItem[];
    dropped: number;
    /** True when at least one extraction part failed (no parseable reply after a retry); re-analyzed next run. */
    incomplete?: boolean;
}
export interface PersistedLedger {
    version: 1;
    engagement: string;
    updatedAt: string;
    documents: Record<string, PersistedDocument>;
}
export interface EngagementLedger {
    engagement: string;
    documents: PersistedDocument[];
    items: LedgerItem[];
}

export interface LedgerIo {
    proxyBase?: string;
    fetchImpl?: typeof fetch;
    gen?: LedgerGen;
    concurrency?: number;
    onProgress?: (msg: string) => void;
}

function ledgerWikiPath(slug: string): string {
    const s = String(slug || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'engagement';
    return `engagements/${s}/ledger.json`;
}

function base(io: LedgerIo): string { return io.proxyBase ?? DEFAULT_PROXY; }
function fx(io: LedgerIo): typeof fetch { return io.fetchImpl || fetch; }

/**
 * `unreadable` is true when the ledger file could not be read or parsed (network failure, a 5xx, corrupt JSON).
 * It is distinct from "no ledger yet": a writer must never treat an unreadable ledger as empty, or one transient
 * failure would overwrite every other document's analysis.
 */
async function readLedgerFile(slug: string, io: LedgerIo): Promise<{ ledger: PersistedLedger | null; sha: string | null; unreadable: boolean }> {
    try {
        const r = await fx(io)(`${base(io)}/api/wiki/read/${ledgerWikiPath(slug)}`);
        if (r.status === 404) return { ledger: null, sha: null, unreadable: false };
        if (!r.ok) return { ledger: null, sha: null, unreadable: true };
        const j: any = await r.json();
        if (!j?.exists || !j.content) return { ledger: null, sha: null, unreadable: false };
        const parsed = JSON.parse(j.content);
        return { ledger: parsed && parsed.documents ? parsed : null, sha: j.content_sha256 || null, unreadable: !(parsed && parsed.documents) };
    } catch { return { ledger: null, sha: null, unreadable: true }; }
}

/** Merge new per-document entries into the persisted ledger with a read-before-write precondition. */
async function writeLedgerDocuments(slug: string, docs: PersistedDocument[], io: LedgerIo): Promise<boolean> {
    if (!docs.length) return true;
    for (let attempt = 0; attempt < 4; attempt++) {
        const { ledger, sha, unreadable } = await readLedgerFile(slug, io);
        if (unreadable) {
            console.warn(`[engagement-ledger] ${ledgerWikiPath(slug)} could not be read; analysis not persisted this run (the existing file is left untouched)`);
            return false;
        }
        const next: PersistedLedger = ledger || { version: 1, engagement: slug, updatedAt: '', documents: {} };
        for (const d of docs) next.documents[d.wikiPath] = d;
        next.updatedAt = new Date().toISOString();
        try {
            const r = await fx(io)(`${base(io)}/api/wiki/write`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: ledgerWikiPath(slug), content: JSON.stringify(next, null, 1), ...(sha ? { expected_sha256: sha } : {}) }),
            });
            if (r.ok) return true;
            if (r.status !== 409) return false;
        } catch { return false; }
    }
    return false;
}

/** The client-upload pages of an engagement: the engagement route first, the manifest chunk listing as the fallback. */
async function listEngagementUploadPages(slug: string, io: LedgerIo = {}): Promise<string[]> {
    const eng = encodeURIComponent(slug);
    try {
        const r = await fx(io)(`${base(io)}/api/engagement/upload-pages?engagement=${eng}`);
        if (r.ok) {
            const j: any = await r.json();
            if (Array.isArray(j?.pages)) return j.pages.map((p: any) => String(p.wikiPath || p)).filter(Boolean);
        }
    } catch { /* fall through */ }
    try {
        const r = await fx(io)(`${base(io)}/api/manifest/chunks?engagement=${eng}&types=&include_pages=true`);
        if (r.ok) {
            const j: any = await r.json();
            return Object.keys(j?.pages || {}).filter(p => /(^|\/)(client-uploads|uploads)\//i.test(p));
        }
    } catch { /* nothing listed */ }
    return [];
}

async function readPages(paths: string[], io: LedgerIo): Promise<UploadPage[]> {
    if (!paths.length) return [];
    const out: UploadPage[] = [];
    for (let i = 0; i < paths.length; i += 200) {
        const batch = paths.slice(i, i + 200);
        try {
            const r = await fx(io)(`${base(io)}/api/wiki/read-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: batch }) });
            const j: any = r.ok ? await r.json() : null;
            for (const p of batch) {
                const pg = j?.pages?.[p];
                if (pg?.exists && pg.content) { const parsed = parseUploadPage(pg.content, p); if (parsed) out.push(parsed); }
            }
        } catch {
            for (const p of batch) {
                try {
                    const r = await fx(io)(`${base(io)}/api/wiki/read/${p}`);
                    const j: any = r.ok ? await r.json() : null;
                    if (j?.exists && j.content) { const parsed = parseUploadPage(j.content, p); if (parsed) out.push(parsed); }
                } catch { /* unreadable page */ }
            }
        }
    }
    return out;
}

/** Default generator: the reasoning model the router picks for `prd`, through the model chain (browser path). */
async function defaultGen(kind = 'prd'): Promise<LedgerGen> {
    const { callWithModelChain } = await import('./deliverableModelRouter');
    const { artifactModelFor } = await import('./aiRouter');
    // Document analysis is evidence-tier extraction: routed like the PRD (the reasoning model) by the one authority.
    const model = artifactModelFor(kind);
    return async ({ system, user, label, maxTokens }) => {
        const r = await callWithModelChain({
            deliverable: kind as any, preferModel: model, label,
            buildBody: (modelId: string) => {
                const mt = maxTokens || 32000;
                if (modelId.startsWith('claude-')) return { endpoint: 'anthropic', body: { model: modelId, max_tokens: mt, system, messages: [{ role: 'user', content: user }] } };
                if (modelId.startsWith('gemini-')) return { endpoint: 'gemini', body: { model: modelId, systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], config: { temperature: 0, maxOutputTokens: 65536 } } };
                return { endpoint: 'openai', headers: { 'x-openai-endpoint': 'chat' }, body: { model: modelId, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_completion_tokens: mt } };
            },
        } as any);
        return r.text || '';
    };
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
    });
    await Promise.all(workers);
    return out;
}

/** Analyze documents in full (every chunk) and return one persisted entry per document. */
async function extractDocuments(pages: UploadPage[], gen: LedgerGen, opts: { concurrency?: number; onProgress?: (m: string) => void } = {}): Promise<PersistedDocument[]> {
    const calls = planExtractionParts(pages);
    // Chunks count as READ only when the call that carried them returned a parseable reply. A failed or empty
    // call used to count its chunks anyway, so "every document read in full" passed on a document nobody read.
    const readByDoc = new Map<string, number>();
    const failedDocs = new Set<string>();
    const perDoc = new Map<string, { items: LedgerDraftItem[]; dropped: number }>();
    for (const p of pages) perDoc.set(p.wikiPath, { items: [], dropped: 0 });
    let done = 0;
    await pool(calls, opts.concurrency ?? 4, async (call) => {
        const prompt = buildLedgerExtractionPrompt(call);
        const label = `#prd ledger: ${call.map(p => `${documentTitle(p.page.title)}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ''}`).join(', ')}`;
        let raw = '';
        // One retry: a transient provider failure must not leave a document unread.
        for (let attempt = 0; attempt < 2 && !replyParses(raw); attempt++) {
            try { raw = await gen({ system: prompt.system, user: prompt.user, label: attempt ? `${label} (retry)` : label, maxTokens: 32000 }); }
            catch (e: any) { console.warn(`[engagement-ledger] extraction failed for ${label}${attempt ? ' (retry)' : ''}: ${e?.message || e}`); raw = ''; }
        }
        if (replyParses(raw)) {
            for (const part of call) readByDoc.set(part.page.wikiPath, (readByDoc.get(part.page.wikiPath) || 0) + part.chunks.length);
        } else {
            for (const part of call) failedDocs.add(part.page.wikiPath);
        }
        const lock = lockExtractedItems(raw, call);
        for (const it of lock.items) {
            const wp = it.pointer.replace(/#c\d+$/, '');
            perDoc.get(wp)?.items.push(it);
        }
        // Dropped items are attributed to the call's first document (reporting only).
        const first = perDoc.get(call[0].page.wikiPath);
        if (first) first.dropped += lock.dropped.length;
        done++;
        opts.onProgress?.(`analyzed ${done} of ${calls.length} document part(s)`);
    });
    const now = new Date().toISOString();
    return pages.map(p => ({
        wikiPath: p.wikiPath, title: documentTitle(p.title), contentHash: p.contentHash, extractorVersion: LEDGER_EXTRACTOR_VERSION,
        analyzedAt: now, chunkCount: p.chunks.length, chunksRead: readByDoc.get(p.wikiPath) || 0, items: perDoc.get(p.wikiPath)?.items || [], dropped: perDoc.get(p.wikiPath)?.dropped || 0,
        ...(failedDocs.has(p.wikiPath) ? { incomplete: true } : {}),
    }));
}

/** A reply the lock can read: a JSON object or array, or a cut-off array with at least one complete item. */
function replyParses(raw: string): boolean {
    const s = String(raw || '').trim();
    if (!s) return false;
    if (parseItemsJson(s).length) return true;
    const body = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try { const o = JSON.parse(body); return !!o && typeof o === 'object'; } catch { return false; }
}

/** Reusable: same content, same extractor, every part read. An empty but complete analysis is reused too. */
function fresh(doc: PersistedDocument | undefined, page: UploadPage): boolean {
    return !!doc && doc.contentHash === page.contentHash && doc.extractorVersion === LEDGER_EXTRACTOR_VERSION && !doc.incomplete;
}

/**
 * UPLOAD-TIME analysis (owner rule: uploads are always thoroughly analyzed). Reads each page in full, analyzes
 * only documents whose content hash or extractor version changed, persists per engagement. Never throws.
 */
export async function analyzeUploadedDocuments(engagementSlug: string, wikiPaths: string[], io: LedgerIo = {}): Promise<{ items: number; byDocument: Record<string, number> }> {
    const byDocument: Record<string, number> = {};
    try {
        const pages = await readPages(Array.from(new Set(wikiPaths.filter(Boolean))), io);
        const { ledger } = await readLedgerFile(engagementSlug, io);
        const stale = pages.filter(p => !fresh(ledger?.documents?.[p.wikiPath], p));
        let docs: PersistedDocument[] = [];
        if (stale.length) {
            const gen = io.gen || await defaultGen();
            docs = await extractDocuments(stale, gen, { concurrency: io.concurrency, onProgress: io.onProgress });
            await writeLedgerDocuments(engagementSlug, docs, io);
        }
        for (const p of pages) {
            const d = docs.find(x => x.wikiPath === p.wikiPath) || ledger?.documents?.[p.wikiPath];
            byDocument[documentTitle(p.title)] = d?.items.length || 0;
        }
    } catch (e: any) {
        console.warn('[engagement-ledger] upload analysis failed (non-fatal):', e?.message || e);
    }
    return { items: Object.values(byDocument).reduce((a, b) => a + b, 0), byDocument };
}

/** Assemble the engagement ledger from persisted documents: duplicate copies collapsed, items deduped, ids assigned. */
function assembleLedger(engagement: string, docs: PersistedDocument[], requestText?: string): EngagementLedger {
    const pseudo: UploadPage[] = docs.map(d => ({ wikiPath: d.wikiPath, title: d.title, contentHash: d.contentHash, extractedAt: d.analyzedAt, body: '', chunks: [] }));
    const { kept } = collapseDuplicateDocuments(pseudo);
    const keep = new Set(kept.map(k => k.wikiPath));
    const live = docs.filter(d => keep.has(d.wikiPath));
    const drafts = [...live.flatMap(d => d.items), ...requestLedgerItems(requestText || '')];
    return { engagement, documents: live, items: dedupeLedgerItems(drafts) };
}

/** The shared reader: every deliverable consumes the same analysis. Null when the engagement has none persisted. */
export async function loadEngagementLedger(slug: string, io: LedgerIo = {}): Promise<EngagementLedger | null> {
    const { ledger } = await readLedgerFile(slug, io);
    if (!ledger) return null;
    return assembleLedger(slug, Object.values(ledger.documents || {}));
}

export interface ScopeLedgerResult extends EngagementLedger {
    /** Documents analyzed in this run (missing or changed since the last analysis). */
    analyzedNow: string[];
    /** Documents read from the persisted ledger. */
    reused: string[];
    duplicatesCollapsed: Array<{ wikiPath: string; duplicateOf: string }>;
    pagesRead: number;
    chunksRead: number;
    /** Per document: chunks registered on the page vs chunks that reached an extraction prompt. */
    documentStats: Array<{ wikiPath: string; title: string; chunksRegistered: number; chunksRead: number }>;
}

/**
 * What a deliverable calls: list every client-upload page of the engagement, read each IN FULL, reuse persisted
 * analysis where the content hash matches, analyze what is missing (in-run fallback), persist, and add the items
 * of the request itself. Never throws; an empty ledger is a valid result.
 */
export async function buildEngagementLedger(opts: LedgerIo & { engagement: string; requestText?: string; wikiPaths?: string[] }): Promise<ScopeLedgerResult> {
    const io: LedgerIo = opts;
    let pages: UploadPage[] = [];
    try {
        const paths = opts.wikiPaths?.length ? opts.wikiPaths : await listEngagementUploadPages(opts.engagement, io);
        pages = await readPages(paths, io);
    } catch (e: any) { console.warn('[engagement-ledger] page listing failed:', e?.message || e); }
    const { kept, dropped } = collapseDuplicateDocuments(pages);
    const { ledger } = await readLedgerFile(opts.engagement, io);
    const reusedDocs: PersistedDocument[] = [];
    const stale: UploadPage[] = [];
    for (const p of kept) {
        const d = ledger?.documents?.[p.wikiPath];
        if (fresh(d, p)) reusedDocs.push(d!); else stale.push(p);
    }
    let analyzed: PersistedDocument[] = [];
    if (stale.length) {
        opts.onProgress?.(`analyzing ${stale.length} client document(s) in full (${stale.reduce((a, p) => a + p.chunks.length, 0)} chunks)`);
        try {
            const gen = io.gen || await defaultGen();
            analyzed = await extractDocuments(stale, gen, { concurrency: io.concurrency, onProgress: io.onProgress });
            await writeLedgerDocuments(opts.engagement, analyzed, io);
        } catch (e: any) { console.warn('[engagement-ledger] in-run analysis failed:', e?.message || e); }
    }
    // The document KIND is recomputed from the page on every read (kind recognition improves without invalidating
    // the analysis): each item takes its page's current kind, not the kind stamped when it was extracted.
    const kindOf = new Map(kept.map(p => [p.wikiPath, p.kind] as const));
    const docs = [...reusedDocs, ...analyzed].map(d => (kindOf.get(d.wikiPath) ? { ...d, items: d.items.map(it => ({ ...it, documentKind: kindOf.get(d.wikiPath) })) } : d));
    const assembled = assembleLedger(opts.engagement, docs, opts.requestText);
    return {
        ...assembled,
        analyzedNow: analyzed.map(d => d.title),
        reused: reusedDocs.map(d => d.title),
        documentStats: kept.map(p => {
            const d = docs.find(x => x.wikiPath === p.wikiPath);
            return { wikiPath: p.wikiPath, title: documentTitle(p.title), chunksRegistered: p.chunks.length, chunksRead: d?.chunksRead ?? 0 };
        }),
        duplicatesCollapsed: dropped,
        pagesRead: pages.length,
        chunksRead: kept.reduce((a, p) => a + (docs.find(x => x.wikiPath === p.wikiPath)?.chunksRead ?? 0), 0),
    };
}

/** One-line counts for logs and the chat reply. */
export function ledgerCounts(items: LedgerItem[]): { stated: number; feedback: number; byArea: Record<string, number>; byDocument: Record<string, number> } {
    const byArea: Record<string, number> = {}, byDocument: Record<string, number> = {};
    for (const i of items) {
        byArea[i.featureArea] = (byArea[i.featureArea] || 0) + 1;
        byDocument[i.documentTitle] = (byDocument[i.documentTitle] || 0) + 1;
    }
    return { stated: items.filter(i => i.type === 'stated').length, feedback: items.filter(i => i.type === 'feedback').length, byArea, byDocument };
}

// ---- Research Assembly Board themes as THEME roots (owner rule 2026-10-02) ------------------------------
//
// "make sure all captured themes in the Research Assembly Board are ALSO ALL reflected in requirements (each
// theme should generate a set of requirements as well)". Every board theme is kept (relevance was gated
// upstream; nothing is dropped here). Near-duplicates collapse deterministically into THEME GROUPS (identical
// normalized names, or name + summary token Jaccard >= 0.8); every original theme id stays on its group.

export interface ThemeGroup { members: ThemeInput[] }

const normName = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function groupThemes(themes: ThemeInput[]): ThemeGroup[] {
    const list = themes.filter(t => t && (t.id || t.name));
    const parent = list.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const toks = list.map(t => tokens(`${t.name} ${t.insight || ''}`));
    const names = list.map(t => normName(t.name));
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            if ((names[i] && names[i] === names[j]) || jaccard(toks[i], toks[j]) >= 0.8) {
                const a = find(i), b = find(j);
                if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
            }
        }
    }
    const groups = new Map<number, ThemeInput[]>();
    list.forEach((t, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(t); });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, members]) => ({ members }));
}

function readableThemeSource(source: string, pointer?: string): string {
    if (/hic-theme-synthesis|\/synthesis\//i.test(String(pointer || '')) || /theme synthesis/i.test(source)) return 'Engagement research synthesis';
    return String(source || 'Research source').trim();
}

/** One THEME ledger item per group (TH-n). The quotes are the themes' own verbatim citations, never authored. */
export function themeLedgerItems(themes: ThemeInput[]): LedgerItem[] {
    return groupThemes(themes).map((g, i) => {
        const lead = g.members.find(m => m.quotes.length) || g.members[0];
        const quotes = g.members.flatMap(m => m.quotes).filter(q => q && String(q.text || '').trim());
        const sources: LedgerSourceRef[] = [];
        for (const q of quotes) {
            if (sources.length >= 6) break;
            if (sources.some(s => s.quote === q.text.trim())) continue;
            const name = readableThemeSource(q.source, q.pointer);
            sources.push({ quote: q.text.trim(), sourceName: name, pointer: q.pointer || '', documentTitle: name });
        }
        const first = String(lead.insight || '').match(/[^.!?]+[.!?]/)?.[0]?.trim();
        return {
            id: `TH-${i + 1}`, type: 'theme', item: noEmDash(str(lead.name)), statement: noEmDash(first || str(lead.name)),
            quote: sources[0]?.quote || '', sourceName: sources[0]?.sourceName || 'Research Assembly Board', pointer: sources[0]?.pointer || '',
            documentTitle: sources[0]?.documentTitle || 'Research Assembly Board', featureArea: '',
            label: 'unspecified', group: g.members.length > 1 ? `${g.members.length} board themes` : undefined, sources,
            themeIds: g.members.map(m => m.id), themeMembers: g.members.map(m => ({ id: m.id, name: m.name, sentiment: m.sentiment, category: m.category })),
        } as LedgerItem;
    });
}

/** The board themes persisted for an engagement (wiki engagements/<slug>/themes.json), raw records. */
export async function loadBoardThemes(slug: string, io: LedgerIo = {}): Promise<any[]> {
    try {
        const r = await fx(io)(`${base(io)}/api/wiki/read/${ledgerWikiPath(slug).replace(/ledger\.json$/, 'themes.json')}`);
        if (!r.ok) return [];
        const j: any = await r.json();
        if (!j?.exists || !j.content) return [];
        const d = JSON.parse(j.content);
        const arr = d?.data?.themes || d?.themes || (Array.isArray(d?.data) ? d.data : null) || (Array.isArray(d) ? d : []);
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

/** Union of the board's themes (context) and the persisted engagement themes: by id, else by normalized name. */
export function mergeBoardThemes(primary: ThemeInput[], extra: ThemeInput[]): ThemeInput[] {
    const ids = new Set(primary.map(t => t.id));
    const names = new Set(primary.map(t => normName(t.name)));
    const out = [...primary];
    for (const t of extra) {
        if (ids.has(t.id) || names.has(normName(t.name))) continue;
        out.push(t); ids.add(t.id); names.add(normName(t.name));
    }
    return out;
}

/** Back-compatible name used by the #prd path and the ingestion hook. */
export const buildScopeLedger = buildEngagementLedger;

// ---- feature areas, derived per project ------------------------------------------------------------
//
// Areas are NEVER a fixed list: they are clustered from the ledger's own text. Greedy set cover over shared
// content terms (each term present in at least two items and in at most two fifths of them), up to eight areas,
// each named by its two most frequent terms; items that share no seed term join the area whose vocabulary they
// overlap most, else a cross-cutting area. When clustering cannot form at least two areas (a tiny or uniform
// ledger), items are grouped by source document instead (themes form their own group). Deterministic: same
// ledger, same areas.

const AREA_STOP = new Set(('the a an and or of to in on for with from by at as is are be it its this that these those their they them ' +
    'will can could should would must may each every into over under than then when which who what where while also more most ' +
    'all any some one two new use used using via per not no yes our your his her has have had was were been being do does ' +
    'product products system systems user users provide provides provided support supports ensure ensures include includes ' +
    'including make makes allow allows able need needs based across within without through about item items requirement ' +
    'requirements feature features experience team teams article articles source sources document documents client ' +
    'theme themes synthesis research hic wiki page pages section ' +
    // 2026-10-03 live: areas were named "Key and Message", "Risk and Step", "Farm and Report": words that organize
    // a document, not a subject, never name an area.
    'key message messages step steps report reports slide slides part parts point points way ways thing things ' +
    'area areas option options detail details number numbers example examples level levels current new ' +
    // 2026-10-05 live: an area was named "Nxt and Humans". The platform vendor's own name is on every SOW and meeting
    // note; it names the consultancy, never a client capability.
    'nxt humans').split(' '));

function stem(w: string): string {
    if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
}
/** Surface form per stem (the most frequent original word), so area names read as words, not stems. Scoped to
 *  one `assignAreas` call: a module-level map let one project's wording pick another project's area labels. */
let SURFACE = new Map<string, Map<string, number>>();
function areaTokens(text: string): Set<string> {
    const out = new Set<string>();
    // A hyphenated run of three or more parts is a slug or a path, not a word: its parts count separately.
    const words = (String(text || '').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).flatMap(w => (w.split('-').length >= 3 ? w.split('-') : [w]));
    for (const w of words) {
        if (AREA_STOP.has(w)) continue;
        const st = stem(w);
        if (AREA_STOP.has(st) || st.length <= 2) continue;
        out.add(st);
        const m = SURFACE.get(st) || new Map<string, number>();
        m.set(w, (m.get(w) || 0) + 1);
        SURFACE.set(st, m);
    }
    return out;
}
const cap = (st: string) => {
    const forms = SURFACE.get(st);
    const w = forms ? [...forms.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0][0] : st;
    return w.split('-').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('-');
};

export function assignAreas(items: LedgerItem[], opts: { maxAreas?: number } = {}): LedgerArea[] {
    const maxAreas = opts.maxAreas ?? 8;
    const n = items.length;
    if (!n) return [];
    SURFACE = new Map();
    const toks = items.map(i => areaTokens(`${i.item} ${i.statement} ${i.group || ''}`));
    const df = new Map<string, number>();
    for (const t of toks) for (const w of t) df.set(w, (df.get(w) || 0) + 1);
    const minDf = Math.max(2, Math.ceil(n * 0.03));
    const maxDf = Math.max(minDf, Math.ceil(n * 0.4));
    const assigned = new Array<number>(n).fill(-1);
    const seeds: string[] = [];
    while (seeds.length < maxAreas) {
        let best = '', bestCount = 0;
        const counts = new Map<string, number>();
        toks.forEach((t, i) => { if (assigned[i] < 0) for (const w of t) { const d = df.get(w) || 0; if (d >= minDf && d <= maxDf) counts.set(w, (counts.get(w) || 0) + 1); } });
        for (const [w, c] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) if (c > bestCount) { best = w; bestCount = c; }
        if (!best || bestCount < Math.max(2, Math.ceil(n * 0.04))) break;
        const k = seeds.length;
        seeds.push(best);
        toks.forEach((t, i) => { if (assigned[i] < 0 && t.has(best)) assigned[i] = k; });
    }
    let areas: Array<{ label: string; members: number[] }>;
    if (seeds.length >= 2) {
        // Profiles: the most frequent terms of each area's members.
        const profiles = seeds.map((_, k) => {
            const c = new Map<string, number>();
            toks.forEach((t, i) => { if (assigned[i] === k) for (const w of t) c.set(w, (c.get(w) || 0) + 1); });
            return new Set([...c.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0])).slice(0, 20).map(x => x[0]));
        });
        const cross: number[] = [];
        toks.forEach((t, i) => {
            if (assigned[i] >= 0) return;
            let bk = -1, bo = 0;
            profiles.forEach((p, k) => { let o = 0; for (const w of t) if (p.has(w)) o++; if (o > bo) { bo = o; bk = k; } });
            if (bk >= 0) assigned[i] = bk; else cross.push(i);
        });
        areas = seeds.map((seed, k) => {
            const members = assigned.map((a, i) => (a === k ? i : -1)).filter(i => i >= 0);
            const c = new Map<string, number>();
            for (const i of members) for (const w of toks[i]) if (w !== seed) c.set(w, (c.get(w) || 0) + 1);
            const second = [...c.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0];
            return { label: second ? `${cap(seed)} and ${cap(second)}` : cap(seed), members };
        });
        if (cross.length) areas.push({ label: 'Cross-cutting', members: cross });
    } else {
        // Fallback: one area per source document; themes form their own area.
        const byDoc = new Map<string, number[]>();
        items.forEach((it, i) => { const k = it.type === 'theme' ? 'Research themes' : (it.documentTitle || 'Other'); if (!byDoc.has(k)) byDoc.set(k, []); byDoc.get(k)!.push(i); });
        areas = [...byDoc.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, members]) => ({ label, members }));
    }
    const out: LedgerArea[] = [];
    areas.filter(a => a.members.length).forEach((a, k) => {
        const id = `AREA-${k + 1}`;
        for (const i of a.members) items[i].featureArea = id;
        out.push({ id, label: a.label, items: a.members.length });
    });
    return out;
}

// ---- engagement scoping of board theme quotes (2026-10-02, handoff step 6) -----------------------------
//
// A board theme's quotes can point at a theme-synthesis or insight page another engagement generated (the
// write path re-tags shared pages, so the tag is not trusted; the proxy resolves the page's real owner).
// Those quotes are removed before any deliverable reads the themes; the theme itself is always kept.

const SYNTH_PAGE_RE = /^(?:articles\/hic-theme-synthesis\/|synthesis\/insights\/)/i;

/** Pages (no #cN) of every theme quote that points at generated synthesis. */
function themeSynthesisPages(themes: ThemeInput[]): string[] {
    const out = new Set<string>();
    for (const t of themes) for (const q of t.quotes || []) {
        const page = String(q.pointer || '').replace(/#c\d+$/i, '');
        if (page && SYNTH_PAGE_RE.test(page)) out.add(page);
    }
    return [...out];
}

/** Pure: drop every quote whose page is in `foreign`. Themes are never dropped. */
export function dropForeignThemeQuotes(themes: ThemeInput[], foreign: Iterable<string>): { themes: ThemeInput[]; dropped: number } {
    const bad = new Set(foreign);
    if (!bad.size) return { themes, dropped: 0 };
    let dropped = 0;
    const next = themes.map(t => {
        const quotes = (t.quotes || []).filter(q => {
            const keep = !bad.has(String(q.pointer || '').replace(/#c\d+$/i, ''));
            if (!keep) dropped++;
            return keep;
        });
        return quotes.length === (t.quotes || []).length ? t : { ...t, quotes };
    });
    return { themes: next, dropped };
}

/** Ask the proxy who owns each synthesis page the themes cite, then drop the foreign quotes. Never throws. */
export async function scopeThemeQuotesToEngagement(themes: ThemeInput[], engagement: string, io: LedgerIo = {}): Promise<{ themes: ThemeInput[]; dropped: number; foreignPages: string[] }> {
    const pages = themeSynthesisPages(themes);
    if (!pages.length) return { themes, dropped: 0, foreignPages: [] };
    try {
        const r = await fx(io)(`${base(io)}/api/engagement/page-owners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engagement, paths: pages }) });
        if (!r.ok) return { themes, dropped: 0, foreignPages: [] };
        const j: any = await r.json();
        const foreign: string[] = Array.isArray(j?.foreign) ? j.foreign.map(String) : [];
        const out = dropForeignThemeQuotes(themes, foreign);
        return { ...out, foreignPages: foreign };
    } catch { return { themes, dropped: 0, foreignPages: [] }; }
}
