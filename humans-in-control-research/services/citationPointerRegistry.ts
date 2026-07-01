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
        }
    }
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
const POINTER_GROUP_RE = /\[\s*((?:[\w./\\-]+\.md#c\d+)(?:\s*[,;]\s*[\w./\\-]+\.md#c\d+)*)\s*\]/gi;

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

/** Test/diagnostic surface. */
export function pointerRegistrySize(): number { return _pointerSources.size; }
export function chunkSourceRegistrySize(): number { return _chunkSources.size; }
