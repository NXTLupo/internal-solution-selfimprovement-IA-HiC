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
import { renderPointerCitationsHtml, formatCitationLabel, lookupPageMeta, lookupPointerUrl, lookupSourceUrl, formatCitationDate } from './citationPointerRegistry';
import { lookupFrontmatterUrl, type PageFetcher } from './citationVerifier';
import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS } from './aiRouter';
import { scrubRewrite, stripCitationArtifacts } from './slideTextEditing';
import { readLastEmittedAir } from './airPostChain';

const PROXY_BASE = 'http://127.0.0.1:5012';
const MAX_REPAIR_ROUNDS = 1;

/**
 * RAW page fetcher for the gate. `citationVerifier.makeWikiPageFetcher` returns the page
 * already normalized, frontmatter included; the gate needs the raw body so it can strip the
 * frontmatter (which carries the research goal on every ingested article) before matching.
 */
export function makeRawWikiPageFetcher(): PageFetcher {
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
        config: { temperature: 0, maxOutputTokens: 4000, responseMimeType: 'application/json', thinkingBudget: 0 },
    }, { label: 'HTML artifact repair', maxAttempts: 2, requestTimeoutMs: 60_000 });
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

/**
 * Replace a flagged block's inner HTML with the repaired sentence. The row's original
 * pointers are re-attached in a single bracket at the end, so the repair can neither add
 * nor lose provenance. Inline markup inside the repaired block is dropped; a narrowed
 * sentence in plain text beats an overclaim in bold.
 */
function applySentenceRepairs(html: string, ledger: ClaimLedger, repaired: Record<string, string>, findings: LedgerFinding[]): { html: string; applied: number } {
    let out = html;
    let applied = 0;
    const flaggedIds = new Set(findings.map(f => f.rowId));
    for (const row of ledger.rows) {
        const raw = repaired[row.id];
        if (typeof raw !== 'string' || !flaggedIds.has(row.id)) continue;
        // Provenance is the system's: strip anything the model wrote that looks like a pointer or source
        // suffix, then re-attach exactly the pointers the block already carried.
        const cleaned = stripCitationArtifacts(scrubRewrite(raw)).trim();
        if (cleaned.length < 8 || cleaned === row.text) continue;
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

const CITE_STYLE = '<style id="hic-cite-style">.hic-cites{font-family:var(--nxt-mono,var(--font-mono,ui-monospace,monospace));font-size:0.82em;color:var(--nxt-text-secondary,inherit);}.hic-cite{text-decoration:none;border-bottom:1px solid currentColor;}.hic-cite:hover{color:var(--nxt-teal,inherit);}.hic-sources ol{padding-left:1.4em;}.hic-sources li{margin:0 0 .45em 0;font-size:0.92em;line-height:1.45;}.hic-sources .hic-src-kind{font-family:var(--nxt-mono,ui-monospace,monospace);font-size:0.8em;color:var(--nxt-text-secondary,inherit);margin-left:.5em;}</style>';

function collectPointers(html: string): string[] {
    const found = String(html || '').match(/[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi) || [];
    return Array.from(new Set(found.map(p => p.trim())));
}

/** A dated, linked bibliography built from the pointers the document actually cites. */
export function buildSourceIndexHtml(pointers: string[], retrievedAt = new Date()): string {
    const byPage = new Map<string, string>();
    for (const p of pointers) { const page = p.replace(/#c\d+$/i, ''); if (!byPage.has(page)) byPage.set(page, p); }
    const items: string[] = [];
    for (const [page, pointer] of byPage) {
        const label = formatCitationLabel(pointer);
        if (!label) continue;
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

async function patchAir(before: ClaimLedger, after: ClaimLedger, shippedHtml: string, chromeStripped: string[], repairRounds: number, sentencesRepaired: number): Promise<boolean> {
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
                        deterministicFailures: codes(after),
                        reviewScores: {
                            claim_rows: after.rows.length,
                            claim_blocking: after.blocking,
                            claim_warnings: after.warnings,
                            independent_origins: after.independentOrigins,
                            pointers_resolved: after.resolvedPointers,
                            chrome_stripped: chromeStripped.length,
                            repaired_sentences: sentencesRepaired,
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

    // 1. Chrome.
    const chrome = stripModelChrome(inputHtml);
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
            const sentences = current.rows.filter(r => ids.has(r.id)).map(r => ({ id: r.id, text: r.text }));
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

    // 5. Citations and the source index.
    const pointers = collectPointers(html);
    html = renderPointerCitationsHtml(html);
    if (opts.sourceIndex !== false) html = appendSourceIndex(html, buildSourceIndexHtml(pointers));
    if (pointers.length && !html.includes('id="hic-cite-style"')) html = CITE_STYLE + html;

    // 6. Record.
    let airPatched = false;
    if (opts.recordAir !== false) airPatched = await patchAir(ledgerBefore, ledgerAfter, html, chrome.stripped, repairRounds, sentencesRepaired);

    const summaryLine = `${ledgerSummaryLine(ledgerAfter)}; ${chrome.stripped.length} chrome element(s) stripped; ${sentencesRepaired} sentence(s) narrowed; ${pointers.length} citation(s) rendered`;
    return {
        html, ledgerBefore, ledgerAfter, chromeStripped: chrome.stripped, repairRounds, sentencesRepaired,
        citationsRendered: pointers.length, pass: ledgerAfter.pass, summaryLine, airPatched,
    };
}
