/**
 * citationPointerRegistry - render-time resolution of manifest chunk pointers.
 *
 * The retrieval layer (chunkRetrieval.ts) instructs models to cite evidence
 * by stable pointer: [<wikiPath>#cN], e.g. [articles/client-uploads/4fe24ed6a9.md#c15].
 * That contract is correct for VALIDATION (validate_chunk_citations.py checks
 * pointers against the manifest), but raw pointers must NEVER reach a rendered
 * surface - chat prose, slide JSON fields, exports. The 2026-06-11 #journey run
 * leaked them into both the web blueprint and the PPTX.
 *
 * This module is the bridge: retrieval registers pointer -> source-name pairs
 * at corpus-assembly time; every render/post-process surface calls
 * resolveManifestPointers() to swap pointers for named sources.
 *
 * Resolution ladder per pointer:
 *   1. Registered sourceTitle from the manifest catalog  -> "(Source: <title>)"
 *   2. Prettified path stem (date prefix + hex ids removed) when meaningful
 *   3. Directory-derived label ("client uploads", "wiki sources")
 * Unresolvable brackets are stripped rather than leaked - a finished consulting
 * artifact never shows file paths (.claude/CLAUDE.md citation protocol).
 */

const _pointerSources = new Map<string, string>(); // pagePath (no #cN) -> display name

// WS-A (2026-06-30): per-CHUNK real source attribution. A chunk's frontmatter `sources:` field (written at
// ingest by wiki_chunker.attribute_chunks_to_grounding from Gemini grounding) names the REAL underlying
// source(s) of THAT specific span. Keyed on the FULL pointer (path#cN), this is Tier 1 of resolveOne, so a
// deep-research synthesis chunk resolves to its real sources (e.g. "Higher Ed Dive") instead of the page-level
// synthesis title ("Gemini Focused Research"). Closes the "sources written but never read at cite time" gap.
const _chunkSources = new Map<string, string[]>(); // full pointer (path#cN) -> real source name(s)
// STRAGGLER #14 (2026-07-01): DOC-LEVEL resolved_sources bridge. Deep-research synthesis pages carry a rich
// `resolved_sources: [{sourceName,...}]` frontmatter array (the REAL external sources the doc synthesized:
// JD Power, Insurance Journal, ...) but their chunks often have no per-chunk `sources:`. Without this, such a
// chunk resolves to the generic page bucket ("AI Research (gemini): ..."). This map lets a chunk with no
// per-chunk source fall back to its page's real synthesized sources as an HONEST multi-source label.
const _pageResolvedSources = new Map<string, string[]>(); // pagePath -> real synthesized source name(s)
// PROVENANCE LOCK WS-C (2026-08-17, plans/citation-integrity-provenance-lock-2026-08-17.md):
// the resolved-chunk source pairs carry URLs ({n, u}) but the registry dropped them, so
// no rendered citation could ever be spot-checked. Stored per source NAME (urls are a
// property of the source, not the chunk) + per pointer for direct lookup.
const _sourceUrls = new Map<string, string>();   // lowercased source name -> url
const _pointerUrls = new Map<string, string>();  // full pointer (path#cN) -> first url
// WS-1 (2026-09-11, report-evidence-integrity plan): PAGE PROVENANCE at cite time. The resolver parses the
// page frontmatter (title, source, url, date, kind, method, extracted_at) and registers it here, so a
// rendered citation can carry the publication date and a working link, and the claim ledger gate can
// check a sentence's dates against the cited page's real date instead of the objective's as-of window.
export interface PointerPageMeta {
    title: string; sourceName: string; url: string; date: string; kind: string; method: string; extractedAt: string;
}
const _pageMeta = new Map<string, PointerPageMeta>(); // pagePath (no #cN) -> frontmatter provenance

export function registerPageMeta(pagePath: string, meta: Partial<PointerPageMeta> | null | undefined): void {
    if (!pagePath || !meta) return;
    const key = pagePath.replace(/#c\d+$/i, '').trim();
    if (!key) return;
    const clean: PointerPageMeta = {
        title: String(meta.title || '').trim(),
        sourceName: String(meta.sourceName || '').trim(),
        url: /^https?:\/\//i.test(String(meta.url || '')) ? String(meta.url).trim() : '',
        date: String(meta.date || '').trim(),
        kind: String(meta.kind || '').trim(),
        method: String(meta.method || '').trim(),
        extractedAt: String(meta.extractedAt || '').trim(),
    };
    const prior = _pageMeta.get(key);
    // First non-empty wins per field; a later resolve never blanks a field an earlier one filled.
    _pageMeta.set(key, prior ? {
        title: prior.title || clean.title, sourceName: prior.sourceName || clean.sourceName, url: prior.url || clean.url,
        date: prior.date || clean.date, kind: prior.kind || clean.kind, method: prior.method || clean.method,
        extractedAt: prior.extractedAt || clean.extractedAt,
    } : clean);
    if (clean.url && clean.sourceName && !_sourceUrls.has(clean.sourceName.toLowerCase())) _sourceUrls.set(clean.sourceName.toLowerCase(), clean.url);
    if (clean.title && !_pointerSources.has(key)) registerPointerSource(key, clean.sourceName ? `${clean.sourceName}: ${clean.title}` : clean.title);
}

/** The page provenance for a pointer or page path, or null when this run never resolved the page. */
export function lookupPageMeta(pointerOrPage: string): PointerPageMeta | null {
    const key = String(pointerOrPage || '').replace(/#c\d+$/i, '').trim();
    return _pageMeta.get(key) || null;
}

/** Every page path with registered provenance (for source indexes). */
export function listPageMeta(): Array<{ pagePath: string; meta: PointerPageMeta }> {
    return Array.from(_pageMeta.entries()).map(([pagePath, meta]) => ({ pagePath, meta }));
}

/** "Mar 2026" from an ISO-ish or RFC date string; '' when unparseable. Deterministic, locale-free. */
export function formatCitationDate(raw: string): string {
    const s = String(raw || '').trim();
    if (!s) return '';
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const iso = /^(\d{4})-(\d{2})/.exec(s);
    if (iso) { const m = parseInt(iso[2], 10); return m >= 1 && m <= 12 ? `${MON[m - 1]} ${iso[1]}` : iso[1]; }
    const dmy = /\b(\d{1,2})\s+([A-Z][a-z]{2})[a-z]*\s+(\d{4})\b/.exec(s);
    if (dmy) return MON.includes(dmy[2]) ? `${dmy[2]} ${dmy[3]}` : dmy[3];
    const mdy = /\b([A-Z][a-z]{2})[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/.exec(s);
    if (mdy) return MON.includes(mdy[1]) ? `${mdy[1]} ${mdy[3]}` : mdy[3];
    const year = /\b(19|20)\d{2}\b/.exec(s);
    return year ? year[0] : '';
}

/** The reader-facing citation label for a pointer: "Figma Blog: Agents, meet the Figma canvas (Mar 2026)". */
export function formatCitationLabel(pointer: string): string {
    const name = resolveOne(String(pointer || '').trim());
    if (!name) return '';
    const meta = lookupPageMeta(pointer);
    const when = meta ? formatCitationDate(meta.date) : '';
    if (when) return `${name} (${when})`;
    if (meta && meta.extractedAt && /^(documentation|docs|help|reference)$/i.test(meta.kind)) {
        const got = formatCitationDate(meta.extractedAt);
        return got ? `${name} (live documentation, retrieved ${got})` : name;
    }
    return name;
}

/**
 * Render every pointer group in an HTML string as a linked, dated citation. Used by the HTML artifact
 * chain (reader surface) where `resolveManifestPointers` (plain "(Source: X)" text) would throw the
 * address away. Unresolvable pointers render as nothing: a file path never reaches the reader.
 */
export function renderPointerCitationsHtml(html: string): string {
    if (!html || html.indexOf('.md#c') === -1) return html;
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return html
        .replace(POINTER_GROUP_RE, (_m, group: string) => {
            const seen = new Set<string>();
            const parts: string[] = [];
            for (const raw of group.split(/[,;]/)) {
                const ptr = raw.trim();
                if (!/\.md(?:#c\d+)?$/i.test(ptr)) continue;
                const label = formatCitationLabel(ptr);
                if (!label || seen.has(label)) continue;
                seen.add(label);
                const url = lookupPointerUrl(ptr) || lookupPageMeta(ptr)?.url || '';
                parts.push(url
                    ? `<a class="hic-cite" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-pointer="${esc(ptr)}">${esc(label)}</a>`
                    : `<span class="hic-cite" data-pointer="${esc(ptr)}">${esc(label)}</span>`);
            }
            return parts.length ? ` <span class="hic-cites">(${parts.join('; ')})</span>` : '';
        })
        .replace(/(?<!\[)[\w./\-]+\.md#c\d+/gi, '')
        .replace(/ {2,}/g, ' ')
        .replace(/ +([.,;:])/g, '$1');
}

/** Register the REAL source name(s) for one chunk pointer (path#cN). Idempotent; first non-empty wins. */
export function registerChunkSources(pointer: string, names: string[]): void {
    if (!pointer) return;
    const key = pointer.trim();
    if (!/#c\d+$/i.test(key)) return;
    const clean: string[] = [];
    for (const raw of names || []) {
        const safe = String(raw || '').replace(/["\\]/g, '').replace(/\s{2,}/g, ' ').trim();
        if (safe && !clean.includes(safe)) clean.push(safe);
    }
    if (clean.length && !_chunkSources.has(key)) _chunkSources.set(key, clean);
}

/** Bulk-register per-chunk sources from resolved chunks ({ id: 'path#cN', sources: [{n,u}] }). The bridge
 *  called by assembleChunkCorpus so every model-facing chunk carries its real attribution to cite time. */
export function registerResolvedChunkSources(chunks: Array<{ id?: string; sources?: Array<{ n?: string; u?: string }> }>): void {
    for (const c of chunks || []) {
        if (c && c.id && Array.isArray(c.sources) && c.sources.length) {
            const names = c.sources.map(s => (s?.n || '').trim()).filter(Boolean);
            if (names.length) registerChunkSources(c.id, names);
            // WS-C: keep the URLs the pairs already carry (previously dropped).
            for (const s of c.sources) {
                const n = (s?.n || '').trim();
                const u = (s?.u || '').trim();
                if (u && /^https?:\/\//i.test(u)) {
                    if (n && !_sourceUrls.has(n.toLowerCase())) _sourceUrls.set(n.toLowerCase(), u);
                    const key = String(c.id).trim();
                    if (key && !_pointerUrls.has(key)) _pointerUrls.set(key, u);
                }
            }
        }
    }
}

/** WS-C: the checkable URL for a pointer (chunk-level first, then any of its
 *  resolved source names). Null when the provenance is a non-web source
 *  (client upload, wiki synthesis) - the honest answer, never a guess. */
export function lookupPointerUrl(pointer: string): string | null {
    const clean = String(pointer || '').trim();
    const direct = _pointerUrls.get(clean);
    if (direct) return direct;
    const attribution = lookupChunkAttribution(clean);
    for (const name of [...attribution.chunkSources, ...attribution.pageResolvedSources, attribution.pageTitle || '']) {
        const u = name ? _sourceUrls.get(name.toLowerCase()) : undefined;
        if (u) return u;
    }
    return null;
}

/** WS-C: the checkable URL for a bare source NAME (ledger fallback lookups). */
export function lookupSourceUrl(name: string): string | null {
    return _sourceUrls.get(String(name || '').trim().toLowerCase()) || null;
}

/** STRAGGLER #14: register a page's DOC-LEVEL real sources (from `resolved_sources:` frontmatter). Used as a
 *  fallback in resolveOne when a chunk from this page has no per-chunk source. Idempotent; first non-empty wins. */
export function registerPageResolvedSources(pagePath: string, names: string[]): void {
    if (!pagePath) return;
    const key = pagePath.replace(/#c\d+$/i, '').trim();
    if (!key || _pageResolvedSources.has(key)) return;
    const clean: string[] = [];
    for (const raw of names || []) {
        const safe = String(raw || '').replace(/["\\]/g, '').replace(/\s{2,}/g, ' ').trim();
        if (safe && !clean.includes(safe)) clean.push(safe);
    }
    if (clean.length) _pageResolvedSources.set(key, clean);
}

/** Register one page path -> human-readable source name. Idempotent. */
export function registerPointerSource(pagePath: string, name: string): void {
    if (!pagePath || !name) return;
    const key = pagePath.replace(/#c\d+$/i, '').trim();
    if (!key) return;
    // Resolution output gets spliced into prose AND into :::slide JSON string
    // fields - quotes/backslashes in a title would break JSON.parse downstream.
    const safe = name.replace(/["\\]/g, '').replace(/\s{2,}/g, ' ').trim();
    if (!safe) return;
    // First registration wins unless the existing value is empty/identical-to-path.
    const existing = _pointerSources.get(key);
    if (!existing || existing === key) _pointerSources.set(key, safe);
}

/** Bulk-register from resolved chunks ({ id: 'path.md#cN', sourceTitle }). */
export function registerResolvedChunks(chunks: Array<{ id?: string; sourceTitle?: string }>): void {
    for (const c of chunks || []) {
        if (c && c.id && c.sourceTitle) registerPointerSource(c.id, c.sourceTitle);
    }
}

const HEXISH = /^[0-9a-f]{8,}$/i;

/** PROVENANCE LOCK: the citationVerifier needs the same honest page-derived
 *  label the render ladder uses when it must replace a fabricated attribution
 *  and the registry has no real names (e.g. after a session reload). */
export function prettifyPagePath(pagePath: string): string | null {
    return prettifyPath(pagePath);
}

/** Derive a readable label from a wiki page path when no registration exists. */
function prettifyPath(pagePath: string): string | null {
    const noExt = pagePath.replace(/\.md$/i, '');
    const segs = noExt.split('/').filter(Boolean);
    if (segs.length === 0) return null;
    let stem = segs[segs.length - 1];
    // Strip leading date stamps: 2026-04-21-foo -> foo
    stem = stem.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (HEXISH.test(stem)) {
        // Content-hash filename carries no meaning; fall back to the directory.
        const dir = segs.length >= 2 ? segs[segs.length - 2] : '';
        if (!dir) return null;
        const dirLabel = dir.replace(/[-_]+/g, ' ').trim();
        return dirLabel ? dirLabel.replace(/\b\w/g, ch => ch.toUpperCase()) : null;
    }
    const label = stem.replace(/[-_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (label.length < 4) return null;
    return label.replace(/\b\w/g, ch => ch.toUpperCase());
}

function resolveOne(pointer: string): string | null {
    const clean = pointer.trim();
    // Tier 1 (WS-A): per-chunk REAL sources from the chunk's frontmatter `sources:`. A single real source
    // resolves to its name; a synthesis span backed by several resolves to an HONEST multi-source label
    // (never a single false primary - matches proxy _relabel_from_resolved).
    const chunkNames = _chunkSources.get(clean);
    if (chunkNames && chunkNames.length) {
        if (chunkNames.length === 1) return chunkNames[0];
        const top = chunkNames.slice(0, 3);
        const extra = chunkNames.length - top.length;
        return `Synthesis of ${top.join(', ')}${extra > 0 ? ` +${extra} more` : ''}`;
    }
    const pagePath = clean.replace(/#c\d+$/i, '').trim();
    // Tier 1.5 (#14): doc-level real synthesized sources. Ranks ABOVE the page sourceTitle because for a
    // deep-research synthesis doc the page title is a generic bucket ("AI Research (gemini): ...") while
    // resolved_sources names the REAL external sources. Honest multi-source label, never a false single primary.
    const pageSrcs = _pageResolvedSources.get(pagePath);
    if (pageSrcs && pageSrcs.length) {
        if (pageSrcs.length === 1) return pageSrcs[0];
        const top = pageSrcs.slice(0, 3);
        const extra = pageSrcs.length - top.length;
        return `Synthesis of ${top.join(', ')}${extra > 0 ? ` +${extra} more` : ''}`;
    }
    // Tier 2: page-level registered sourceTitle (manifest catalog).
    const hit = _pointerSources.get(pagePath);
    if (hit) return hit;
    // Tier 3: prettified path stem.
    return prettifyPath(pagePath);
}

// A bracket group of one or more comma/semicolon-separated pointers:
// [articles/x.md#c15] or [sources/a.md#c3, sources/b.md#c9]
// 2026-09-11: tolerates a trailing commentary tail inside the bracket. The 2026-09-10 white paper wrote
// `[articles/x.md#c2, paraphrased from theme]` 57 times; the old shape matched none of them, so every
// one shipped to the reader as a file path. The tail is consumed and discarded, never rendered.
const POINTER_GROUP_RE = /\[\s*((?:[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)(?:\s*[,;]\s*[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)*)(?:\s*[,;]\s*[^\]\n]{1,80})?\s*\]/gi;

/**
 * Replace every [path.md#cN(, ...)] bracket group with named-source attribution.
 * Multiple pointers dedupe: [a#c1, b#c2] -> "(Sources: A; B)".
 * Unresolvable groups are removed (path leakage is worse than no bracket).
 */
export function resolveManifestPointers(text: string): string {
    if (!text || text.indexOf('.md#c') === -1) return text;
    return text
        .replace(POINTER_GROUP_RE, (_m, group: string) => {
            const names: string[] = [];
            for (const raw of group.split(/[,;]/)) {
                const name = resolveOne(raw.trim());
                if (name && !names.includes(name)) names.push(name);
            }
            if (names.length === 0) return '';
            return names.length === 1
                ? ` (Source: ${names[0]})`
                : ` (Sources: ${names.join('; ')})`;
        })
        // Bare (unbracketed) pointers that slip through: strip the path, keep prose.
        .replace(/(?<!\[)[\w./\\-]+\.md#c\d+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:])/g, '$1');
}

/**
 * SPLIT a pointer-carrying string into readable prose plus the pointers it carried.
 *
 * `resolveManifestPointers` above is the RENDER answer: it rewrites the pointer into
 * "(Source: Name)" for surfaces that can only show text, which is why deck slides and
 * the PPTX export never leak a path. It is the wrong answer for a surface that can
 * offer an affordance, because it throws the address away and the reader is left with
 * a name they cannot open.
 *
 * The 2026-08-21 verification run found the third case: a surface that did NEITHER.
 * Theme cards rendered `q.text` verbatim, so 87 raw `[articles/x.md#c1]` markers were
 * on screen, while the card's own "open in wiki" button stayed hidden because the
 * pointer sat inside the quote instead of in the field the button reads. The evidence
 * was addressable and the reader still could not reach it.
 *
 * So: text for the eye, pointers for the affordance, from ONE parse.
 */
export interface PointerSplit {
    /** The prose with every pointer group removed, whitespace and punctuation repaired. */
    text: string;
    /** Every pointer found, in document order, deduped. */
    pointers: string[];
}
export function extractPointers(text: string): PointerSplit {
    const raw = String(text || '');
    if (raw.indexOf('.md#c') === -1) return { text: raw, pointers: [] };
    const pointers: string[] = [];
    const push = (p: string) => {
        const t = p.trim();
        if (t && !pointers.includes(t)) pointers.push(t);
    };
    const cleaned = raw
        .replace(POINTER_GROUP_RE, (_m, group: string) => {
            for (const one of group.split(/[,;]/)) push(one);
            return '';
        })
        // Bare pointers, same tolerance as the render path.
        .replace(/(?<!\[)[\w./\\-]+\.md#c\d+/gi, (m) => { push(m); return ''; })
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:])/g, '$1')
        // A quote whose pointer sat before the closing mark leaves a dangling space.
        .replace(/([("'“‘])\s+/g, '$1')
        .replace(/\s+([)"'”’])/g, '$1')
        .trim();
    return { text: cleaned, pointers };
}

/**
 * E1.2 (2026-08-21). POSITIONAL split, for a surface that can render an affordance
 * INSIDE the prose rather than beside it.
 *
 * `extractPointers` above answers "what does this string say, and what did it cite",
 * which is what a card needs when the citation lives in a separate control. It throws
 * position away, so it cannot drive a chip that sits where the citation actually was.
 * Card prose has been shipping with the pointer stripped for exactly that reason, which
 * loses the link between a specific sentence and the passage behind it.
 *
 * Segments come back in document order: prose runs and pointer runs, ready to map to
 * text nodes and chips.
 */
export type ProseSegment =
    | { kind: 'text'; value: string }
    | { kind: 'pointer'; pointer: string; wikiPath: string | null };

export function splitProseWithPointers(text: string): ProseSegment[] {
    const raw = String(text || '');
    if (!raw) return [];
    if (raw.indexOf('.md#c') === -1) return [{ kind: 'text', value: raw }];

    const segments: ProseSegment[] = [];
    let cursor = 0;
    const pushText = (value: string) => {
        if (!value) return;
        const last = segments[segments.length - 1];
        if (last && last.kind === 'text') last.value += value;
        else segments.push({ kind: 'text', value });
    };

    // One pass over bracket groups; a group may hold several pointers, and each becomes
    // its own chip so the reader can open any of them.
    const groupRe = new RegExp(POINTER_GROUP_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = groupRe.exec(raw)) !== null) {
        pushText(raw.slice(cursor, m.index));
        for (const one of m[1].split(/[,;]/)) {
            const pointer = one.trim();
            if (pointer) segments.push({ kind: 'pointer', pointer, wikiPath: pointerToWikiPath(pointer) });
        }
        cursor = m.index + m[0].length;
    }
    pushText(raw.slice(cursor));

    // Tidy the prose runs the removal left behind, without touching chip order. A text
    // run that ends right before a chip loses its trailing space: a citation marker sits
    // tight against the word it cites, the way a footnote does, and the chip's own left
    // margin supplies the hairline gap.
    const tidied = segments.map((seg, i) => {
        if (seg.kind !== 'text') return seg;
        let value = seg.value.replace(/[ 	]{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1');
        if (segments[i + 1]?.kind === 'pointer') value = value.replace(/[ 	]+$/, '');
        return { kind: 'text' as const, value };
    });
    return tidied.filter(seg => seg.kind !== 'text' || seg.value !== '');
}

/** The wiki page a pointer addresses, with the chunk fragment removed. `null` when the
 *  string is not a pointer, so a caller can never hand a bare label to a file open. */
export function pointerToWikiPath(pointer: string): string | null {
    const m = /^([\w./\\-]+\.md)#c\d+$/i.exec(String(pointer || '').trim());
    return m ? m[1] : null;
}

/**
 * Turn a raw evidence string into a card-ready quote: clean prose for the reader, plus
 * the two fields a card needs to offer a way into the source.
 *
 * This lives here rather than in the component because the component is not the only
 * surface that shows evidence, and a transform duplicated per surface is how the
 * 2026-08-21 leak happened in the first place. A pointer already on the record wins over
 * one parsed out of prose, since that one was recorded rather than written.
 */
export interface CardQuoteFields {
    sourceLabel?: string;
    sourceDate?: string;
    externalUrl?: string;
    wikiPath?: string;
    chunkPointer?: string;
}
export function quoteWithAffordance<T extends CardQuoteFields>(
    rawText: string,
    base: T
): T & { text: string; chunkPointer: string; wikiPath: string } {
    const { text, pointers } = extractPointers(rawText);
    const pointer = base.chunkPointer || pointers[0] || '';
    return {
        ...base,
        text,
        chunkPointer: pointer,
        // Without a wikiPath a card cannot draw its "open in wiki" control, so derive one
        // from the pointer we just recovered rather than leaving addressable evidence
        // unreachable. An explicit path from the record is never overwritten.
        wikiPath: base.wikiPath || (pointer ? (pointerToWikiPath(pointer) || '') : ''),
    };
}

/** W1 (2026-07-01, scorecard gap "64% pointers unsourced"): expose the full attribution ladder for ONE
 *  pointer so the AIR evidence ledger (evidenceLedgerService.resolvedChunkToEvidence) can fall back to the
 *  SAME page-level attribution the render path uses. Most "unsourced" pointers are social/Reddit or upload
 *  pages whose REAL attribution is the page title ("Reddit Deep: r/waterloo") or the doc-level
 *  resolved_sources — per-chunk `sources:` is legitimately absent there. One attribution authority
 *  (this registry), consumed by BOTH cite-time resolution and the evidence ledger (converge, no fork). */
export interface ChunkAttribution {
    /** Tier 1: per-chunk real sources (frontmatter `sources:`). */
    chunkSources: string[];
    /** Tier 1.5: the page's doc-level resolved_sources (real synthesized sources). */
    pageResolvedSources: string[];
    /** Tier 2: the page-level registered sourceTitle (manifest catalog). */
    pageTitle: string | null;
}
export function lookupChunkAttribution(pointer: string): ChunkAttribution {
    const clean = String(pointer || '').trim();
    const pagePath = clean.replace(/#c\d+$/i, '').trim();
    return {
        chunkSources: _chunkSources.get(clean) || [],
        pageResolvedSources: _pageResolvedSources.get(pagePath) || [],
        pageTitle: _pointerSources.get(pagePath) || null,
    };
}

/** Test/diagnostic surface. */
export function pointerRegistrySize(): number { return _pointerSources.size; }
export function chunkSourceRegistrySize(): number { return _chunkSources.size; }
