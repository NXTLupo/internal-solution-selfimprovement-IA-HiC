/**
 * THE HTML ARTIFACT CHAIN (2026-09-11)
 * plans/report-evidence-integrity-and-primary-source-discovery-2026-09-11.md, WS-3.
 *
 * `#report`, `#whitepaper`, `#brief` and `#explainer` produce a prose HTML document
 * instead of slide JSON, and until this file that document went from the model to
 * `saveArtifact` with a fence strip and a meta scrub in between. Decks run ten chain
 * stages; deliverable blocks run nine; the document that a client reads end to end
 * ran none. The 2026-09-10 white paper shipped with raw file paths as citations,
 * dates projected from the objective onto year-old sources, hedged forum text
 * promoted to a capability inventory, and a footer of buttons the model wrote
 * because a skill told it to.
 *
 * Order, and why:
 *   chrome     -> the reader document never carries model-authored chrome
 *   gate       -> claim ledger over the text the reader will see
 *   fixes      -> deterministic: strip dead pointers and bracket commentary
 *   repair     -> bounded, narrowing only, never sourcing; then the gate AGAIN
 *   citations  -> pointers become linked, dated citations; a dated source index is appended
 *   record     -> AIR carries the ledger and the shipped HTML (the diff is the training signal)
 *
 * Never throws: the artifact the user asked for survives a bookkeeping failure.
 */

import {
    stripModelChrome, evaluateClaimLedger, applyDeterministicFixes, buildNarrowingInstruction, ledgerSummaryLine,
    type ClaimLedger, type ClaimGateContext, type GateChunk, type LedgerFinding,
} from './claimLedgerGate';
import { renderPointerCitationsHtml, shortCiteLabel, formatCitationLabel, lookupPageMeta, lookupPointerUrl, lookupSourceUrl, formatCitationDate, prettifyPagePath } from './citationPointerRegistry';
import { lookupFrontmatterUrl, type PageFetcher } from './citationVerifier';
import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS } from './aiRouter';
import { scrubRewrite, stripCitationArtifacts } from './slideTextEditing';
import { readLastEmittedAir } from './airPostChain';
import { analyzeProse, buildProseRepairInstruction, carriesContrastTemplate, endsOnVerdict } from './proseSignal';

const PROXY_BASE = 'http://127.0.0.1:5012';
// 2026-11-09: 2 rounds. One capped round of 30 rows left a large #prd at 74 blocking; the loop
// already exits early the moment blocking reaches zero, so the second round costs nothing on
// documents the first round clears.
const MAX_REPAIR_ROUNDS = 2;

/**
 * RAW page fetcher for the gate. `citationVerifier.makeWikiPageFetcher` returns the page
 * already normalized, frontmatter included; the gate needs the raw body so it can strip the
 * frontmatter (which carries the research goal on every ingested article) before matching.
 */
function makeRawWikiPageFetcher(): PageFetcher {
    const cache = new Map<string, string | null>();
    return async (pagePath: string) => {
        if (cache.has(pagePath)) return cache.get(pagePath)!;
        let text: string | null = null;
        try {
            const r = await fetch(`${PROXY_BASE}/api/wiki/read/${pagePath.split('/').map(encodeURIComponent).join('/')}`);
            if (r.ok) {
                const d = await r.json();
                if (d?.exists && typeof d.content === 'string' && d.content) text = d.content;
            }
        } catch { /* offline proxy: the pointer reports UNRESOLVED_SOURCE */ }
        cache.set(pagePath, text);
        return text;
    };
}

export interface HtmlChainOptions {
    goalText: string;
    chunks: GateChunk[];
    /** Run the narrowing repair on blocking findings (one model call, Flash, temperature 0). Default true. */
    repair?: boolean;
    /** Run the deterministic prose signal + one bounded voice-only repair (2026-11-08). Default true. */
    prose?: boolean;
    /** Append the dated source index. Default true. */
    sourceIndex?: boolean;
    /** Patch the last emitted AIR with the ledger. Default true when an AIR ref exists. */
    recordAir?: boolean;
    onProgress?: (msg: string) => void;
    /** Injected in tests. */
    fetchPage?: ClaimGateContext['fetchPage'];
    repairFn?: (instruction: string, sentences: Array<{ id: string; text: string }>) => Promise<Record<string, string>>;
}

export interface HtmlChainResult {
    html: string;
    ledgerBefore: ClaimLedger;
    ledgerAfter: ClaimLedger;
    chromeStripped: string[];
    repairRounds: number;
    sentencesRepaired: number;
    /** Distinct cited pointers that rendered as citations. */
    citationsRendered: number;
    pass: boolean;
    summaryLine: string;
    airPatched: boolean;
    /** Prose-signal overall score (0..1) before/after the voice repair; null when the stage was skipped. */
    proseOverallBefore: number | null;
    proseOverallAfter: number | null;
    proseBlocksRepaired: number;
}

// ---------------------------------------------------------------------------
// Repair: narrowing only
// ---------------------------------------------------------------------------

const REPAIR_SYSTEM = [
    'You repair individual sentences of a consulting document that failed an evidence check. Return ONLY a JSON object mapping each sentence id you changed to its corrected sentence. Omit ids you did not change.',
    '',
    'WHAT YOU MUST DO: narrow each flagged sentence to what its cited passage itself supports. Drop a date the source does not carry, a guarantee the source states as a possibility, a count or "every / all / consensus" the sources cannot bear, a name the source does not use. When the finding says the identifier is a practitioner recollection, restate it as a report ("a practitioner described tools ranging from ...") rather than as a documented capability. When the finding says another product is cited as an analogy, name that product as the analogy or delete the comparison.',
    '',
    'WHAT YOU MUST NEVER DO:',
    '- NEVER add a citation, a source name, a publication, a study, a report title, an author, a URL or a manifest pointer. You have no evidence in front of you; any source you write would be fabricated.',
    '- NEVER add a number, percentage, date, month, year or version that is not already in the sentence.',
    '- NEVER keep an unsupported claim by hedging it ("roughly", "reportedly", "it seems"). Remove it.',
    '- NEVER write a note about missing evidence, a caveat in brackets, or any QA annotation. The reader must never see the awareness of a gap.',
    '- NEVER delete a citation pointer ([path.md#cN]) that is already in the sentence; keep pointers exactly where they are.',
    '',
    'STYLE: plain business language, one idea per sentence, name the actor, no em-dash, no emoji, no markdown, no buzzwords, no metaphor.',
].join('\n');

async function defaultRepair(instruction: string, sentences: Array<{ id: string; text: string }>): Promise<Record<string, string>> {
    const user = [
        'Findings to fix:',
        instruction,
        '',
        'Sentences (id -> current text). Keep every bracketed .md#cN pointer exactly where it is.',
        JSON.stringify(Object.fromEntries(sentences.map(s => [s.id, s.text])), null, 1),
    ].join('\n');
    const parsed = await callAIWithRetry('gemini', {
        model: DEFAULT_MODELS.fast_generation,
        systemInstruction: { parts: [{ text: REPAIR_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: { temperature: 0, maxOutputTokens: 12000, responseMimeType: 'application/json', thinkingBudget: 0 },
    }, { label: 'HTML artifact repair', maxAttempts: 2, requestTimeoutMs: 90_000 });
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    try { return JSON.parse(text); } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
    }
    return {};
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Prose repair: voice only, never facts (2026-11-08)
// ---------------------------------------------------------------------------

const PROSE_REPAIR_SYSTEM = [
    'You rewrite individual blocks of a consulting document whose WRITING failed a deterministic prose check (the facts passed; the voice did not). Return ONLY a JSON object mapping each block id you changed to its rewritten text. Omit ids you did not change.',
    '',
    'WHAT YOU MUST DO: rewrite for a human voice. Break the contrast template ("X, not Y", "not X, but Y", "is not X; it is Y", "rather than", the semicolon pivot): state the positive claim directly, or give the alternative its own plain sentence. Replace a short oracular verdict that closes a paragraph with an ending on the evidence or the mechanism. Vary sentence length and openings. Name the actor. Use "is".',
    '',
    'WHAT YOU MUST NEVER DO:',
    '- NEVER change, add or remove a fact, number, date, name, claim, comparison or conclusion. The meaning of every block stays identical; only the wording changes.',
    '- NEVER touch text inside quotation marks: a verbatim quote stays character-for-character.',
    '- NEVER add or delete a citation pointer ([path.md#cN]); keep pointers exactly where they are.',
    '- NEVER add a hedge, an intensifier, a metaphor, an em-dash or a buzzword.',
    '',
    'STYLE: plain business language a colleague would say aloud. One idea per sentence.',
].join('\n');

async function defaultProseRepair(instruction: string, sentences: Array<{ id: string; text: string }>): Promise<Record<string, string>> {
    const user = [
        'Prose findings to fix:',
        instruction,
        '',
        'Blocks (id -> current text). Rewrite the voice; keep every fact and every bracketed .md#cN pointer.',
        JSON.stringify(Object.fromEntries(sentences.map(s => [s.id, s.text])), null, 1),
    ].join('\n');
    const parsed = await callAIWithRetry('gemini', {
        model: DEFAULT_MODELS.fast_generation,
        systemInstruction: { parts: [{ text: PROSE_REPAIR_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: { temperature: 0, maxOutputTokens: 8000, responseMimeType: 'application/json', thinkingBudget: 0 },
    }, { label: 'HTML artifact prose repair', maxAttempts: 2, requestTimeoutMs: 90_000 });
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    try { return JSON.parse(text); } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
    }
    return {};
}

/**
 * Replace a flagged block's inner HTML with the repaired sentence. The row's original
 * pointers are re-attached in a single bracket at the end, so the repair can neither add
 * nor lose provenance. Inline markup inside the repaired block is dropped; a narrowed
 * sentence in plain text beats an overclaim in bold.
 */
/**
 * 2026-11-09 (QA third review): the repair model became the last writer and the only unchecked
 * one. It shipped "System engagement depends on maintain trust.", "record to a accessible log",
 * an unclosed quotation, and verbatim quotes flattened into "The text highlights..." narration.
 * A repair that reads broken is worse than the defect it fixes, so a rewrite that trips any of
 * these is REJECTED and the original sentence stays (the finding stays visible in the ledger).
 */
const REPAIR_BREAKAGE_RES: RegExp[] = [
    // bare verb after a preposition ("depends on maintain trust")
    /\b(?:on|of|for|in|by|with|to|from) (?:maintain|provide|create|ensure|support|deliver|build|record|transmit|manage|preserve|establish|improve|reduce)\b(?![a-z])/,
    // evidence-narration the writing contract bans ("The text highlights ...")
    /\b[Tt]he (?:text|setup|post|comment|material|content|passage) (?:highlights|relies|reports|indicates|suggests|shows|reflects)\b/,
];
/**
 * 2026-11-09 (owner, on a live #quiz: "this isnt proper English? It's jibberish! Not even a
 * sentence!! SLOP!"). The voice repair rewrote a question stem into a gerund fragment:
 *     Which part of the Student Hub lets one student look up personal profile information?
 *     -> Reviewing which part of the Student Hub lets one student look up personal profile
 * A question is a GRAMMATICAL FORM, not a style choice. The voice stage may tighten a stem; it may
 * not stop it being a question. Two of fifteen stems shipped broken this way.
 */
function sentenceTypeHeld(originalText: string, replacement: string): boolean {
    const o = originalText.trim(), r = replacement.trim();
    if (!o.endsWith('?')) return true;
    if (!r.endsWith('?')) return false;
    // A question that no longer starts with a question word or an auxiliary is a fragment wearing
    // a question mark ("Reviewing which part ...?"). Keep the interrogative opener.
    return /^(?:who|whose|whom|what|which|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|will|may|might|must|has|have|had|in|on|at|under|according|before|after|given|if|your|you|a|an|the)\b/i.test(r);
}

function repairIsSafe(originalText: string, replacement: string): boolean {
    for (const re of REPAIR_BREAKAGE_RES) if (re.test(replacement)) return false;
    if (!sentenceTypeHeld(originalText, replacement)) return false;
    // Unbalanced quotation marks (straight or curly) ship an unclosed quote.
    if ((replacement.match(/"/g) || []).length % 2 !== 0) return false;
    if ((replacement.match(/“/g) || []).length !== (replacement.match(/”/g) || []).length) return false;
    // A verbatim quoted span in the original must survive character-for-character (the marks may
    // go, per remove_quote_marks, but the words may not be paraphrased away).
    const spans = originalText.match(/"([^"]{24,})"|“([^”]{24,})”/g) || [];
    for (const s of spans) {
        const inner = s.replace(/^["“]|["”]$/g, '');
        if (!replacement.includes(inner)) return false;
    }
    return true;
}
/** Conservative article agreement for the exact class the repair model emits ("a accessible log"). */
/**
 * Mark a reported quote that the model left bare.
 *
 * 2026-11-09 (owner: a #blogpost read as "complete AI slop writing"). The model marks MOST quotes
 * with `<q>`, and the artifact CSS renders those correctly. The failures are the ones it leaves
 * bare after a reporting colon, which then splice into the author's own voice and garble the
 * sentence. From the flagged artifact, verbatim:
 *     A commenter described recruiters this way: Max they spend 15 seconds checking that you
 *     have no glaring red flags, your college and other basic signals.
 * The capital "Max" mid-sentence is somebody else's words presented as ours, and any figure
 * inside it reads as our own assertion, which is exactly what the Quantitative Claim Rule forbids.
 *
 * The repair is deliberately narrow: only a colon introduced by an explicit REPORTING phrase, only
 * when the tail is not already quoted or tagged, and only up to the end of that sentence group.
 * Everything else is left alone, because a colon usually introduces a list, not a quotation.
 */
export function markReportedQuotes(html: string): { html: string; marked: number } {
    if (!html) return { html, marked: 0 };
    let marked = 0;
    // "<reporting phrase>: <tail>" where the tail runs to the end of the text node.
    const REPORTED = /\b((?:described?|describes|put it|puts it|said|says|wrote|writes|reported|reports|worded it|in [A-Z][\w'’]*\s+words|this way|the observation that|advice on [a-z ]+ is[\w ]*)\s*:\s*)(?![“"'<])([A-Z][^<]{18,400}?[.!?])(?=\s*(?:<|$))/g;
    const out = html.replace(REPORTED, (_m, lead: string, quote: string) => {
        // Never double-wrap, and never swallow a citation chip into the quote.
        if (/<\/?q[ >]/.test(quote) || /hic-cite/.test(quote)) return _m;
        marked += 1;
        return `${lead}<q>${quote}</q>`;
    });
    return { html: out, marked };
}

function fixArticles(text: string): string {
    return text.replace(/\b([Aa]) (accessible|established|explicit|important|open|existing|additional|internal|external|official|individual|automated|approved|updated|integrated|independent|essential|entire|early|easy|active|annual|audit|auditable)\b/g,
        (_m, a: string, w: string) => `${a === 'A' ? 'An' : 'an'} ${w}`);
}

function applySentenceRepairs(html: string, ledger: ClaimLedger, repaired: Record<string, string>, flagged: LedgerFinding[] | Set<string>): { html: string; applied: number } {
    let out = html;
    let applied = 0;
    const flaggedIds = flagged instanceof Set ? flagged : new Set(flagged.map(f => f.rowId));
    for (const row of ledger.rows) {
        const raw = repaired[row.id];
        if (typeof raw !== 'string' || !flaggedIds.has(row.id)) continue;
        // Provenance is the system's: strip anything the model wrote that looks like a pointer or source
        // suffix, then re-attach exactly the pointers the block already carried.
        const cleaned = fixArticles(stripCitationArtifacts(scrubRewrite(raw)).trim());
        if (cleaned.length < 8 || cleaned === row.text) continue;
        // 2026-11-09, same live #quiz: the replacement is `escapeHtml(cleaned)`, so every inline tag
        // inside the row is DESTROYED. The model returns plain prose, so a rewritten option lost its
        // `<b>B</b>` letter: six of fifteen questions came back with missing labels and one lost all
        // four. A row carrying inline markup is not a plain prose span and is left alone. Pointer
        // brackets are exempt: the loop re-attaches those itself, just below.
        if (/<(?:b|strong|em|i|q|a|code|abbr|mark|span|sup|sub)\b/i.test(row.rawInner)) {
            console.warn(`[html-chain] repair skipped for ${row.id}: the span carries inline markup the rewrite would drop`);
            continue;
        }
        if (!repairIsSafe(row.text, cleaned)) { console.warn(`[html-chain] repair rejected for ${row.id}: rewrite reads broken or damages a quote`); continue; }
        const pointerSuffix = row.pointers.length ? ` [${row.pointers.join(', ')}]` : '';
        const replacement = `${escapeHtml(cleaned)}${pointerSuffix}`;
        const idx = out.indexOf(row.rawInner);
        if (idx < 0) continue;
        out = out.slice(0, idx) + replacement + out.slice(idx + row.rawInner.length);
        applied++;
    }
    return { html: out, applied };
}

// ---------------------------------------------------------------------------
// Citations and the source index
// ---------------------------------------------------------------------------

// 2026-11-09: the inline citation is a SUPERSCRIPT chip, not a parenthetical that breaks the
// sentence. Full label rides the title attribute; the appendix carries every source in full.
const CITE_STYLE = '<style id="hic-cite-style">.hic-cites{font-family:var(--nxt-mono,var(--font-mono,ui-monospace,monospace));font-size:0.62em;line-height:0;vertical-align:super;white-space:nowrap;color:var(--nxt-teal,#115054);}.hic-cites+.hic-cites{margin-left:.15em;}.hic-cite{text-decoration:none;border-bottom:none;padding:0 .12em;}.hic-cite:hover{color:var(--nxt-teal,inherit);}.hic-sources ol{padding-left:1.4em;}.hic-sources li{margin:0 0 .45em 0;font-size:0.92em;line-height:1.45;}.hic-sources .hic-src-kind{font-family:var(--nxt-mono,ui-monospace,monospace);font-size:0.8em;color:var(--nxt-text-secondary,inherit);margin-left:.5em;}</style>';

// ---- reader-facing source labels (2026-10-01, B8) ----------------------------------------------------
//
// A citation label must be a source's name, never a file path, slug or hash. The registry's last resort
// is a prettified path ("Hic Theme Synthesis", "Cached Reuse Sow012 Nxt Humans ...", "1qxkv3v"): the
// live #prd rendered 85 citations as "Hic Theme Synthesis". Two fixes, both generic:
//   1. an artifact may DECLARE its labels in <script type="application/json" id="hic-source-labels">
//      ({ pointer: { n: name, d?: date } }), written by a projection that holds the evidence item's
//      registered name (prdProjection). The chain reads it, strips it, and uses it first.
//   2. a label that is still path-derived is replaced by the page's source TYPE ("Client document",
//      "Reddit r/neu", "Engagement research synthesis").

export type DeclaredSourceLabels = Map<string, { n: string; d?: string }>;
const LABELS_SCRIPT_RE = /<script\b[^>]*id=["']hic-source-labels["'][^>]*>([\s\S]*?)<\/script>/i;

function readDeclaredSourceLabels(html: string): { html: string; labels: DeclaredSourceLabels } {
    const labels: DeclaredSourceLabels = new Map();
    const m = LABELS_SCRIPT_RE.exec(String(html || ''));
    if (!m) return { html, labels };
    try {
        const obj = JSON.parse(m[1]);
        for (const [k, v] of Object.entries(obj || {})) {
            const n = String((v as any)?.n || '').trim();
            if (k && n) labels.set(k.trim(), { n, d: (v as any)?.d ? String((v as any).d) : undefined });
        }
    } catch { /* a malformed declaration is ignored, never rendered */ }
    return { html: html.replace(LABELS_SCRIPT_RE, ''), labels };
}

const HASHLIKE_TOKEN_RE = /^(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{5,12}$/i;

/** The page's source type, for a pointer whose only label is its path. '' when the path says nothing. */
function sourceTypeLabel(pointer: string): string {
    const page = String(pointer || '').replace(/#c\d+$/i, '');
    const sub = /reddit[\w-]*\/(?:r-)?([\w-]+)\/[^/]+\.md$/i.exec(page) || /reddit-deep-r-([\w-]+)\//i.exec(page);
    if (sub) return `Reddit r/${sub[1]}`;
    if (/reddit|social-intelligence/i.test(page)) return 'Reddit discussion';
    if (/(?:^|\/)(?:client-uploads|cached-reuse[^/]*|uploads?|sources)\//i.test(page)) return 'Client document';
    if (/(?:^|\/)(?:hic-theme-synthesis|synthesis)\//i.test(page)) return 'Engagement research synthesis';
    return '';
}

function isPathDerivedLabel(label: string, pointer: string): boolean {
    const bare = String(label || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!bare) return true;
    const page = String(pointer || '').replace(/#c\d+$/i, '');
    if (bare === (prettifyPagePath(page) || '')) return true;
    return bare.split(/\s+/).some(w => HASHLIKE_TOKEN_RE.test(w)) && bare.split(/\s+/).length <= 2;
}

function citationLabelFor(pointer: string, declared?: DeclaredSourceLabels): string {
    const page = String(pointer || '').replace(/#c\d+$/i, '');
    const d = declared?.get(pointer) || declared?.get(page);
    if (d) {
        // The declaration owns the date too: an absent date is deliberate (an ingest date is not a publication date).
        const when = formatCitationDate(d.d || '');
        return when ? `${d.n} (${when})` : d.n;
    }
    const label = formatCitationLabel(pointer);
    if (label && !isPathDerivedLabel(label, pointer)) return label;
    const typed = sourceTypeLabel(pointer);
    if (!typed) return label;
    const when = formatCitationDate(lookupPageMeta(pointer)?.date || '');
    return when ? `${typed} (${when})` : typed;
}

const CITE_GROUP_RE = /\[\s*((?:[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)(?:\s*[,;]\s*[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)*)(?:\s*[,;]\s*[^\]\n]{1,80})?\s*\]/gi;

/**
 * Pointer groups as linked citations; then the registry strips any stray pointer.
 *
 * 2026-11-09: this renderer had drifted from `renderPointerCitationsHtml`, which already prints a
 * short superscript chip. Here a chip still printed the WHOLE label wrapped in its own parentheses,
 * so a label that carries its own parenthetical came out doubled - a live brief shipped
 * "(Anthropic documentation (live documentation, retrieved Nov 2026))" next to a pull quote. One
 * shape for both renderers: a superscript chip carrying the source NAME, the full label in the
 * hover title, the date and connector in the appendix. Repeats inside one block are dropped, since
 * the appendix lists every source once and a chip repeated mid-paragraph is noise, not provenance.
 */
function renderCitations(html: string, declared: DeclaredSourceLabels): string {
    const escA = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const src = String(html || '');
    let blockSeen = new Set<string>();
    let lastIndex = -1;
    const out = src.replace(CITE_GROUP_RE, (_m, group: string, offset: number) => {
        if (lastIndex >= 0 && /<\/(?:p|li|h[1-6]|blockquote|section|div|figcaption)>/i.test(src.slice(lastIndex, offset))) {
            blockSeen = new Set<string>();
        }
        lastIndex = offset;
        const seen = new Set<string>();
        const parts: string[] = [];
        for (const raw of group.split(/[,;]/)) {
            const ptr = raw.trim();
            if (!/\.md(?:#c\d+)?$/i.test(ptr)) continue;
            const label = citationLabelFor(ptr, declared);
            if (!label || seen.has(label)) continue;
            seen.add(label);
            const short = shortCiteLabel(label);
            if (blockSeen.has(short)) continue;
            blockSeen.add(short);
            const url = lookupPointerUrl(ptr) || lookupPageMeta(ptr)?.url || '';
            parts.push(url
                ? `<a class="hic-cite" href="${escA(url)}" target="_blank" rel="noopener noreferrer" title="${escA(label)}" data-pointer="${escA(ptr)}">${escA(short)}</a>`
                : `<span class="hic-cite" title="${escA(label)}" data-pointer="${escA(ptr)}">${escA(short)}</span>`);
        }
        return parts.length ? `<sup class="hic-cites">${parts.join(' ')}</sup>` : '';
    });
    return renderPointerCitationsHtml(out);
}

function collectPointers(html: string): string[] {
    const found = String(html || '').match(/[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi) || [];
    return Array.from(new Set(found.map(p => p.trim())));
}

/** A dated, linked bibliography built from the pointers the document actually cites. */
function buildSourceIndexHtml(pointers: string[], retrievedAt = new Date(), declared?: DeclaredSourceLabels): string {
    // One entry per reader-facing source (an aggregate upload page holds several documents).
    const byLabel = new Map<string, string>();
    for (const p of pointers) { const l = citationLabelFor(p, declared); if (l && !byLabel.has(l)) byLabel.set(l, p); }
    const items: string[] = [];
    for (const [label, pointer] of byLabel) {
        const page = pointer.replace(/#c\d+$/i, '');
        const meta = lookupPageMeta(page);
        const url = lookupPointerUrl(pointer) || meta?.url || lookupSourceUrl(meta?.sourceName || '') || lookupFrontmatterUrl(page) || '';
        const kind = (meta?.kind || '').toLowerCase();
        const kindLabel = kind === 'social-post' ? 'practitioner discussion'
            : /^(documentation|docs|help|reference)$/.test(kind) ? 'vendor documentation'
            : kind === 'upload' ? 'client document'
            : kind === 'transcript' ? 'transcript'
            : kind ? kind : '';
        const dated = meta?.date ? '' : (meta?.extractedAt ? ` undated page, retrieved ${formatCitationDate(meta.extractedAt)}` : '');
        const text = escapeHtml(label);
        items.push(`<li>${url ? `<a class="hic-cite" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>` : text}${kindLabel ? `<span class="hic-src-kind">${escapeHtml(kindLabel)}${escapeHtml(dated)}</span>` : ''}</li>`);
    }
    if (!items.length) return '';
    const accessed = retrievedAt.toISOString().slice(0, 10);
    return `\n<section class="nxt-section nxt-wrap nxt-source-index hic-sources"><h2 class="nxt-h2">Sources</h2><p class="nxt-prose">Publication dates are the sources' own; undated vendor pages describe documented behavior on the retrieval date. Links accessed ${accessed}.</p><ol>${items.join('')}</ol></section>\n`;
}

function appendSourceIndex(html: string, index: string): string {
    if (!index) return html;
    const closeMain = html.lastIndexOf('</main>');
    if (closeMain >= 0) return html.slice(0, closeMain) + index + html.slice(closeMain);
    return html + index;
}

// ---------------------------------------------------------------------------
// AIR record
// ---------------------------------------------------------------------------

async function patchAir(before: ClaimLedger, after: ClaimLedger, shippedHtml: string, chromeStripped: string[], repairRounds: number, sentencesRepaired: number, prose?: { before: number | null; after: number | null; repaired: number }): Promise<boolean> {
    const ref = readLastEmittedAir();
    if (!ref) return false;
    const codes = (l: ClaimLedger) => l.findings.filter(f => f.severity === 'block').map(f => `claim:${f.code}@${f.rowId}`);
    try {
        const resp = await fetch(`${PROXY_BASE}/api/air/patch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runId: ref.runId, artifactId: ref.artifactId,
                patch: {
                    postChain: {
                        htmlChain: {
                            chromeStripped,
                            repair: { rounds: repairRounds, sentencesRepaired },
                            ledgerBefore: { summary: before.summary, blocking: before.blocking, warnings: before.warnings, rows: before.rows.length, independentOrigins: before.independentOrigins },
                            ledgerAfter: { summary: after.summary, blocking: after.blocking, warnings: after.warnings, rows: after.rows.length, independentOrigins: after.independentOrigins },
                            findings: after.findings.slice(0, 200),
                            chainPass: after.pass,
                        },
                        shippedPayload: { kind: 'html', html: shippedHtml },
                    },
                    qualityReport: {
                        chainRan: true,
                        deterministicFailures: codes(after),
                        reviewScores: {
                            claim_rows: after.rows.length,
                            claim_blocking: after.blocking,
                            claim_warnings: after.warnings,
                            independent_origins: after.independentOrigins,
                            pointers_resolved: after.resolvedPointers,
                            chrome_stripped: chromeStripped.length,
                            repaired_sentences: sentencesRepaired,
                            ...(prose && prose.before !== null ? { prose_overall_before: prose.before, prose_overall_after: prose.after ?? prose.before, prose_blocks_repaired: prose.repaired } : {}),
                        },
                        chainPass: after.pass,
                    },
                },
            }),
        });
        return resp.ok;
    } catch { return false; }
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

export async function runHtmlArtifactChain(inputHtml: string, opts: HtmlChainOptions): Promise<HtmlChainResult> {
    const progress = opts.onProgress || (() => undefined);
    const fetchPage = opts.fetchPage || makeRawWikiPageFetcher();
    const gateCtx: ClaimGateContext = { goalText: opts.goalText, chunks: opts.chunks || [], fetchPage };

    // 1. Chrome, and the artifact's declared source labels (read once, never shown).
    const declaredRead = readDeclaredSourceLabels(inputHtml);
    const declared = declaredRead.labels;
    const chrome = stripModelChrome(declaredRead.html);
    let html = chrome.html;
    if (chrome.stripped.length) progress(`stripped ${chrome.stripped.length} model-authored chrome element(s)`);

    // 2. Gate.
    progress('claim ledger gate...');
    const ledgerBefore = await evaluateClaimLedger(html, gateCtx);
    let ledgerAfter = ledgerBefore;

    // 3. Deterministic fixes.
    html = applyDeterministicFixes(html, ledgerBefore);

    // 4. Repair (bounded, narrowing only), then gate again.
    let repairRounds = 0;
    let sentencesRepaired = 0;
    if (opts.repair !== false && ledgerBefore.blocking > 0) {
        const repairFn = opts.repairFn || defaultRepair;
        for (let round = 1; round <= MAX_REPAIR_ROUNDS; round++) {
            const current = round === 1 ? ledgerBefore : ledgerAfter;
            const instruction = buildNarrowingInstruction(current);
            if (!instruction) break;
            const targets = current.findings.filter(f => f.severity === 'block' && f.repair !== 'strip_pointer' && f.repair !== 'strip_tail');
            const ids = new Set(targets.map(f => f.rowId));
            // 2026-11-09 (live #prd defect): 123 blocking rows produced "0 sentence(s) narrowed"
            // because the whole set went to one repair call whose 4K-token JSON reply truncated
            // and failed to parse. The batch is capped so the reply always fits; one round of a
            // bounded cap repairs the worst rows instead of silently repairing none.
            const sentences = current.rows.filter(r => ids.has(r.id)).map(r => ({ id: r.id, text: r.text })).slice(0, 30);
            if (!sentences.length) break;
            progress(`narrowing ${sentences.length} flagged sentence(s)...`);
            repairRounds++;
            let repaired: Record<string, string> = {};
            try { repaired = await repairFn(instruction, sentences); } catch (e: any) { console.warn('[html-chain] repair failed:', e?.message || e); break; }
            const applied = applySentenceRepairs(html, current, repaired, targets);
            if (!applied.applied) break;
            sentencesRepaired += applied.applied;
            html = applied.html;
            ledgerAfter = await evaluateClaimLedger(html, gateCtx);
            html = applyDeterministicFixes(html, ledgerAfter);
            if (ledgerAfter.blocking === 0) break;
        }
    }
    if (ledgerAfter === ledgerBefore && (html !== chrome.html)) {
        // Deterministic fixes changed the text; measure what ships.
        ledgerAfter = await evaluateClaimLedger(html, gateCtx);
    }

    // 4.5. PROSE SIGNAL (2026-11-08, the live "#report full of AI slop" defect).
    // The claim gate checks what the document says; nothing checked how it says it,
    // so a report could clear every lexical ban and still ship saturated with the
    // contrast template and oracular paragraph enders. Measure the reader-visible
    // blocks, and when the signal fails, run ONE bounded voice-only repair over the
    // offending blocks (facts, quotes and pointers are preserved by contract and by
    // applySentenceRepairs re-attaching the row's own pointers), then re-gate.
    let proseBefore: ReturnType<typeof analyzeProse> | null = null;
    let proseAfter: ReturnType<typeof analyzeProse> | null = null;
    let proseBlocksRepaired = 0;
    if (opts.prose !== false) {
        try {
            const rowTexts = ledgerAfter.rows.map(r => r.text).filter(t => t && t.split(/\s+/).length >= 3);
            proseBefore = analyzeProse(rowTexts.join(' '), { paragraphs: rowTexts });
            proseAfter = proseBefore;
            // Over-long action titles are a voice defect on their own: tighten them even when the
            // sentence-level metrics pass.
            const _hasLongHeadings = ledgerAfter.rows.some(r => /^h[1-6]$/.test(r.tag) && (r.text || '').split(/\s+/).length > 13);
            if ((!proseBefore.pass || _hasLongHeadings) && rowTexts.length >= 5) {
                const offenderText = new Set(proseBefore.concerns.flatMap(c => c.offenders));
                const templateFlagged = proseBefore.concerns.some(c => c.id === 'templates');
                const endersFlagged = proseBefore.concerns.some(c => c.id === 'enders');
                // 2026-11-09 (independent QA): action titles that pass judgment and literalness but run
                // 16-19 words violate the hard "aim <= 10 words" concision clause. Over-long headings
                // are voice targets too; the instruction below tells the rewriter to tighten, and
                // applySentenceRepairs re-attaches the row's own pointers as with any block.
                const longHeadings = ledgerAfter.rows.filter(r => /^h[1-6]$/.test(r.tag) && (r.text || '').split(/\s+/).length > 13 && !/["“”]/.test(r.text || ''));
                const targets = [...longHeadings, ...ledgerAfter.rows.filter(r => {
                    const t = r.text || '';
                    if (/^h[1-6]$/.test(r.tag)) return false;      // handled above
                    if (t.split(/\s+/).length < 6) return false;
                    if (/["“”]/.test(t)) return false;   // verbatim quotes stay untouched
                    if ([...offenderText].some(o => o && t.includes(o.slice(0, 80)))) return true;
                    if (templateFlagged && carriesContrastTemplate(t)) return true;
                    if (endersFlagged && endsOnVerdict(t)) return true;
                    return false;
                })].slice(0, 20);
                if (targets.length) {
                    progress(`prose signal ${proseBefore.pass ? 'pass, tightening titles' : `below floor (${proseBefore.concerns.map(c => c.id).join(', ')})`}; rewriting ${targets.length} block(s) for voice...`);
                    const proseFn = opts.repairFn || defaultProseRepair;
                    const headingLine = longHeadings.length
                        ? `\nTITLES: ${longHeadings.length} heading(s) run past the action-title concision rule. Tighten each to 10 words or fewer while keeping the exact judgment, the named actor and literal language. Drop subordinate clauses; never drop the conclusion.`
                        : '';
                    const instruction = (buildProseRepairInstruction(proseBefore) || 'PROSE REVISION: voice only, never facts.') + headingLine;
                    let rewritten: Record<string, string> = {};
                    try { rewritten = await proseFn(instruction, targets.map(r => ({ id: r.id, text: r.text }))); }
                    catch (e: any) { console.warn('[html-chain] prose repair failed:', e?.message || e); }
                    const appliedProse = applySentenceRepairs(html, ledgerAfter, rewritten, new Set(targets.map(r => r.id)));
                    if (appliedProse.applied) {
                        proseBlocksRepaired = appliedProse.applied;
                        html = appliedProse.html;
                        // The voice rewrite must not regress the claim gate; measure what ships.
                        ledgerAfter = await evaluateClaimLedger(html, gateCtx);
                        html = applyDeterministicFixes(html, ledgerAfter);
                        const afterTexts = ledgerAfter.rows.map(r => r.text).filter(t => t && t.split(/\s+/).length >= 3);
                        proseAfter = analyzeProse(afterTexts.join(' '), { paragraphs: afterTexts });
                    }
                }
            }
        } catch (e: any) {
            console.warn('[html-chain] prose stage failed (non-fatal):', e?.message || e);
        }
    }

    // 4.9 Quotation marking, BEFORE citations so a citation chip is never swallowed into a quote.
    // 2026-11-09 (owner: a #blogpost read as slop): the model leaves some reported quotes bare
    // after a colon, and a bare quote reads as the author's own assertion.
    const _quoteFix = markReportedQuotes(html);
    html = _quoteFix.html;
    if (_quoteFix.marked > 0) progress(`marking ${_quoteFix.marked} reported quote(s)`);

    // 5. Citations and the source index.
    const pointers = collectPointers(html);
    html = renderCitations(html, declared);
    if (opts.sourceIndex !== false) html = appendSourceIndex(html, buildSourceIndexHtml(pointers, new Date(), declared));
    if (pointers.length && !html.includes('id="hic-cite-style"')) html = CITE_STYLE + html;

    // 6. Record.
    let airPatched = false;
    if (opts.recordAir !== false) airPatched = await patchAir(ledgerBefore, ledgerAfter, html, chrome.stripped, repairRounds, sentencesRepaired,
        { before: proseBefore ? Number(proseBefore.overall.toFixed(3)) : null, after: proseAfter ? Number(proseAfter.overall.toFixed(3)) : null, repaired: proseBlocksRepaired });

    // Final punctuation tidy (2026-11-09 QA: a deletion upstream left "at the moment of need , on
    // terms..." in the hero). A space before , . ; : after a word or closing quote never belongs
    // in prose; CSS and JS are unaffected by removing one.
    html = html.replace(/([\w"”]) +([,.;:])(?=\s)/g, '$1$2');

    const proseNote = proseBefore
        ? `; prose ${proseBefore.overall.toFixed(2)}${proseBlocksRepaired ? ` -> ${(proseAfter?.overall ?? proseBefore.overall).toFixed(2)} (${proseBlocksRepaired} block(s) rewritten for voice)` : (proseBefore.pass ? ' (pass)' : ' (below floor, no repairable block)')}`
        : '';
    const summaryLine = `${ledgerSummaryLine(ledgerAfter)}; ${chrome.stripped.length} chrome element(s) stripped; ${sentencesRepaired} sentence(s) narrowed; ${pointers.length} citation(s) rendered${proseNote}`;
    return {
        html, ledgerBefore, ledgerAfter, chromeStripped: chrome.stripped, repairRounds, sentencesRepaired,
        citationsRendered: pointers.length, pass: ledgerAfter.pass, summaryLine, airPatched,
        proseOverallBefore: proseBefore ? Number(proseBefore.overall.toFixed(3)) : null,
        proseOverallAfter: proseAfter ? Number(proseAfter.overall.toFixed(3)) : null,
        proseBlocksRepaired,
    };
}

/** Internals the chain tests drive directly. Not part of the chain's public surface. */
export const __testables = { repairIsSafe, sentenceTypeHeld, applySentenceRepairs };
