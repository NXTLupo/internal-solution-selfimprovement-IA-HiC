/**
 * wikiPointerResolver.ts
 *
 * Manifest -> wiki resolver. The HiC architecture is:
 *   - The MANIFEST (engagement.manifest.json + user-selections/active.json)
 *     holds POINTERS (IDs, source paths) that declare which content to draw
 *     from.
 *   - The WIKI (hic-workspace/wiki/) holds the actual CONTENT (themes.json,
 *     personas.json, journey.json, recs.json, gap.json, prd.json, roadmap.json,
 *     competitive.json, blueprint.json, tech-audit.json, tech-arch.json, etc.).
 *   - The LOADER (this file) resolves pointers to content at generation time
 *     and exposes a typed result object. Generators receive RESOLVED bodies
 *     instead of re-serializing in-memory state into prompts (the anti-pattern
 *     the user flagged 2026-06-06).
 *
 * Replaces five duplicated read-paths:
 *   - geminiService.ts strategic-report-writer (~30KB inlined per call)
 *   - geminiService.ts buildDeckDigest (~15KB inlined)
 *   - deliverableChunkers.ts (5 chunkers each JSON.stringify-ing inputs)
 *   - CorpusChatPanel.tsx PRIOR FINDINGS injection (~60KB)
 *
 * Side benefit: a single resolver, a single cache, a single audit trail.
 * Generators no longer need to thread in-memory state through their call
 * graph; they just declare which engagement and which kinds they need.
 *
 * 2026-06-06 - Initial implementation. Cache is per-engagement, in-memory,
 * cleared when the engagement slug changes. Single source of truth: wiki.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export type DeliverableKind =
    | 'themes' | 'personas' | 'journey' | 'recs' | 'recommendations'
    | 'prd' | 'roadmap' | 'gap' | 'gapAnalysis'
    | 'techAudit' | 'tech-audit' | 'competitive' | 'competitiveAnalysis'
    | 'techArch' | 'tech-arch' | 'blueprint';

// Canonical map from any-flavor kind name to the wiki filename suffix.
const KIND_TO_WIKI_FILE: Record<string, string> = {
    themes: 'themes.json',
    personas: 'personas.json',
    journey: 'journey.json',
    blueprint: 'blueprint.json',
    recs: 'recs.json',
    recommendations: 'recs.json',
    prd: 'prd.json',
    roadmap: 'roadmap.json',
    gap: 'gap.json',
    gapAnalysis: 'gap.json',
    techAudit: 'tech-audit.json',
    'tech-audit': 'tech-audit.json',
    competitive: 'competitive.json',
    competitiveAnalysis: 'competitive.json',
    techArch: 'tech-arch.json',
    'tech-arch': 'tech-arch.json',
};

export interface ResolvedDeliverables {
    /** Slug the resolver was called with - echoed back for audit. */
    engagementSlug: string;
    /** Which keys were requested. */
    requestedKinds: DeliverableKind[];
    /** Map of canonical-key -> wiki path that was read (for audit / prompt
     *  declarations). Keyed by the canonical kind name (themes / personas /
     *  recs / prd / roadmap / gap / techAudit / competitive / techArch /
     *  journey / blueprint). */
    pointers: Record<string, string>;
    /** Resolved bodies. Same canonical keys as `pointers`. Body shape mirrors
     *  whatever was in the wiki JSON file's `data` field (or the file root if
     *  no data wrapper). Missing kinds are simply absent. */
    bodies: Record<string, any>;
    /** Wallclock ms taken to resolve all requested kinds. */
    elapsedMs: number;
    /** Number of wiki reads (one per requested kind that exists). */
    readCount: number;
    /** Kinds that were requested but not present in wiki. */
    missingKinds: string[];
}

// Per-engagement cache. Cleared automatically when the engagement slug
// changes. Tiny (~100KB per engagement) so we keep at most 4 engagements'
// worth of cache in memory at once.
const _cache: Map<string, { ts: number; resolved: ResolvedDeliverables }> = new Map();
const CACHE_TTL_MS = 60_000; // 60s - long enough to dedupe a single deck-build cascade

function _cacheKey(slug: string, kinds: DeliverableKind[]): string {
    return `${slug}::${[...kinds].sort().join(',')}`;
}

function _canonicalKey(kind: DeliverableKind): string {
    // Collapse the aliases so the result map has consistent keys.
    const k = kind as string;
    if (k === 'recommendations') return 'recs';
    if (k === 'gapAnalysis') return 'gap';
    if (k === 'tech-audit') return 'techAudit';
    if (k === 'competitiveAnalysis') return 'competitive';
    if (k === 'tech-arch') return 'techArch';
    return k;
}

async function _readWiki(path: string): Promise<any | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${path}`);
        if (!resp.ok) return null;
        const text = await resp.text();
        try {
            const parsed = JSON.parse(text);
            // Wiki write wrapper: the proxy stores deliverables as
            // { content: "...", ... }. Try to unwrap if needed.
            if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
                try { return JSON.parse(parsed.content); } catch { return parsed; }
            }
            return parsed;
        } catch {
            return null;
        }
    } catch {
        return null;
    }
}

/**
 * Resolve manifest pointers to wiki bodies for an engagement.
 *
 * Caller declares which kinds they need; the resolver fetches each from
 * wiki/engagements/<slug>/<kind>.json once. Missing kinds are reported in
 * `missingKinds` rather than throwing; generators decide whether to fall
 * back to in-memory state.
 *
 * Example:
 *   const r = await resolveDeliverableBodies('my-slug', ['themes', 'personas']);
 *   if (r.bodies.themes) { ...use themes... }
 *   prompt += `MANIFEST_POINTER: ${r.pointers.themes}`;
 */
export async function resolveDeliverableBodies(
    engagementSlug: string,
    kinds: DeliverableKind[],
): Promise<ResolvedDeliverables> {
    const t0 = Date.now();
    if (!engagementSlug) {
        return {
            engagementSlug: '',
            requestedKinds: kinds,
            pointers: {},
            bodies: {},
            elapsedMs: 0,
            readCount: 0,
            missingKinds: kinds.map(_canonicalKey),
        };
    }
    const key = _cacheKey(engagementSlug, kinds);
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.resolved;
    }

    const pointers: Record<string, string> = {};
    const bodies: Record<string, any> = {};
    const missing: string[] = [];
    let reads = 0;

    // Dedup canonical keys so themes + themes alias isn't fetched twice.
    const canonicalRequested = new Set<string>();
    for (const k of kinds) canonicalRequested.add(_canonicalKey(k));

    await Promise.all(Array.from(canonicalRequested).map(async (ck) => {
        const filename = KIND_TO_WIKI_FILE[ck] || `${ck}.json`;
        const wikiPath = `engagements/${engagementSlug}/${filename}`;
        const body = await _readWiki(wikiPath);
        if (body && (Array.isArray(body) || typeof body === 'object')) {
            // The data is often nested under a `data` key (per emitDeliverable
            // wrapper). Unwrap one level when that key exists and looks like
            // the actual payload.
            const unwrapped = (body && typeof body === 'object' && body.data && typeof body.data === 'object')
                ? body.data
                : body;
            bodies[ck] = unwrapped;
            pointers[ck] = wikiPath;
            reads++;
        } else {
            missing.push(ck);
        }
    }));

    const resolved: ResolvedDeliverables = {
        engagementSlug,
        requestedKinds: kinds,
        pointers,
        bodies,
        elapsedMs: Date.now() - t0,
        readCount: reads,
        missingKinds: missing,
    };
    // Prune cache to last 4 engagements.
    if (_cache.size > 4) {
        const oldest = Array.from(_cache.entries())
            .sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) _cache.delete(oldest[0]);
    }
    _cache.set(key, { ts: Date.now(), resolved });
    return resolved;
}

/**
 * Helper for generators: build a manifest-pointer declaration block for the
 * prompt header so the model knows which wiki files informed each section.
 *
 *   const decl = manifestPointerBlock(resolved);
 *   prompt += decl + actualContent;
 *
 * The declaration block is a few lines of plain text - no body data, just
 * the pointers. Bodies still go into the prompt via the corpus-style
 * sections the generator builds; the declaration is metadata.
 */
export function manifestPointerBlock(resolved: ResolvedDeliverables): string {
    const entries = Object.entries(resolved.pointers);
    if (entries.length === 0) return '';
    const lines = [
        '=== MANIFEST POINTERS (wiki resolutions for this generation) ===',
        `engagement_slug: ${resolved.engagementSlug}`,
        `resolved_in_ms: ${resolved.elapsedMs}`,
        ...entries.map(([k, p]) => `  ${k}: ${p}`),
    ];
    if (resolved.missingKinds.length > 0) {
        lines.push(`missing_in_wiki: ${resolved.missingKinds.join(', ')}`);
    }
    lines.push('=== END MANIFEST POINTERS ===');
    return lines.join('\n');
}

/**
 * Clear the cache. Called when an engagement is changed or reset.
 */
export function clearResolverCache(slug?: string): void {
    if (!slug) {
        _cache.clear();
        return;
    }
    for (const k of Array.from(_cache.keys())) {
        if (k.startsWith(`${slug}::`)) _cache.delete(k);
    }
}

/**
 * Try to discover the current engagement slug from the runtime. Used by
 * call sites that don't have the slug threaded through but need to resolve.
 * Falls back to '' when unavailable - the resolver then degrades gracefully
 * by returning empty bodies, and the caller falls back to in-memory data.
 */
export function currentEngagementSlug(): string {
    if (typeof window !== 'undefined') {
        const slug = (window as any).__hicCurrentEngagementSlug;
        if (typeof slug === 'string') return slug;
    }
    return '';
}

// ===========================================================================
// 2026-06-06 - Manifest-pointer chunk resolution.
// Each wiki page carries a `chunks:` frontmatter block declaring its
// addressable spans (id, char_span, key_terms). Generators reference chunks
// by pointer (<source-path>#c<index>) through the manifest, and this
// resolver dereferences pointers to text spans by reading the source page
// and extracting the declared char_span.
//
// Companion contract (in proxy/wiki_chunker.py):
//   - chunk_for_manifest(body, source_path) -> [{id, char_span, ...}]
//   - upsert_chunks_into_frontmatter(text, chunks) -> text with chunks: block
//   - has_chunks_frontmatter(text) -> bool
// ===========================================================================

export interface ResolvedChunk {
    id: string;
    sourcePath: string;
    text: string;
    keyTerms: string[];
    section: string;
    charSpan: [number, number];
    sentenceCount: number;
}

export interface ResolvedChunks {
    chunks: ResolvedChunk[];
    notFound: string[];
    sourcesRead: number;
    elapsedMs: number;
}

// Page cache (sourcePath -> raw page text). Pages can be large; bound to 32
// entries and evict oldest. Per-render TTL of 60s matches the per-engagement
// resolver cache above.
const _PAGE_CACHE = new Map<string, { ts: number; text: string }>();
const _PAGE_CACHE_MAX = 32;
const _PAGE_CACHE_TTL_MS = 60_000;

async function _readWikiPageRaw(sourcePath: string): Promise<string | null> {
    const cached = _PAGE_CACHE.get(sourcePath);
    if (cached && Date.now() - cached.ts < _PAGE_CACHE_TTL_MS) return cached.text;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${sourcePath}`);
        if (!resp.ok) return null;
        // The wiki read endpoint can return either raw text or a JSON
        // envelope { content: "..." }. Sniff and unwrap.
        const text = await resp.text();
        let unwrapped = text;
        try {
            const j = JSON.parse(text);
            if (j && typeof j === 'object' && typeof j.content === 'string') {
                unwrapped = j.content;
            }
        } catch { /* not JSON - text is the body */ }
        // Evict if over cap.
        if (_PAGE_CACHE.size >= _PAGE_CACHE_MAX) {
            const oldest = Array.from(_PAGE_CACHE.entries())
                .sort((a, b) => a[1].ts - b[1].ts)[0];
            if (oldest) _PAGE_CACHE.delete(oldest[0]);
        }
        _PAGE_CACHE.set(sourcePath, { ts: Date.now(), text: unwrapped });
        return unwrapped;
    } catch {
        return null;
    }
}

const _FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * Parse the chunks: block from a wiki page's YAML frontmatter. Returns the
 * list of {id, char_span, key_terms, section, sentence_count} entries, or
 * [] when no chunks block is present. Mirrors the Python
 * `extract_chunk_spans` in wiki_chunker.py - must stay in sync.
 */
function _parseChunksFrontmatter(pageText: string): Array<{
    id: string;
    charSpan: [number, number];
    keyTerms: string[];
    section: string;
    sentenceCount: number;
}> {
    if (!pageText) return [];
    const m = _FRONTMATTER_RE.exec(pageText);
    if (!m) return [];
    const fm = m[1];
    const out: any[] = [];
    let cur: any = null;
    let insideChunks = false;
    for (const rawLine of fm.split('\n')) {
        const line = rawLine.replace(/\s+$/, '');
        if (!insideChunks) {
            if (/^chunks:\s*$/.test(line)) insideChunks = true;
            continue;
        }
        if (line.startsWith('  - id:')) {
            if (cur) out.push(cur);
            cur = {
                id: line.slice('  - id:'.length).trim().replace(/^"|"$/g, ''),
                charSpan: [0, 0] as [number, number],
                keyTerms: [] as string[],
                section: '',
                sentenceCount: 0,
            };
        } else if (cur && line.startsWith('    char_span:')) {
            const v = line.slice('    char_span:'.length).trim();
            const mm = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/.exec(v);
            if (mm) cur.charSpan = [parseInt(mm[1], 10), parseInt(mm[2], 10)];
        } else if (cur && line.startsWith('    sentence_count:')) {
            const v = line.slice('    sentence_count:'.length).trim();
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) cur.sentenceCount = n;
        } else if (cur && line.startsWith('    key_terms:')) {
            const v = line.slice('    key_terms:'.length).trim();
            const mm = /\[(.*)\]/.exec(v);
            if (mm) {
                const inner = mm[1];
                const parts = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"|([^,]+)/g) || [];
                cur.keyTerms = parts
                    .map(p => p.trim().replace(/^"|"$/g, ''))
                    .filter(Boolean);
            }
        } else if (cur && line.startsWith('    section:')) {
            cur.section = line.slice('    section:'.length).trim().replace(/^"|"$/g, '');
        } else if (!line.startsWith(' ') && !line.startsWith('\t')) {
            // Top-level key terminates the chunks block.
            if (cur) { out.push(cur); cur = null; }
            break;
        }
    }
    if (cur) out.push(cur);
    return out;
}

function _stripFrontmatter(pageText: string): string {
    const m = _FRONTMATTER_RE.exec(pageText);
    return m ? m[2] : pageText;
}

/**
 * Resolve a list of chunk pointers to their text spans. Each pointer is
 * "<source-path>#c<index>". Groups pointers by source path so each page
 * is fetched at most once per call.
 *
 * Returns:
 *   chunks       - resolved {id, text, source, char_span, key_terms} entries
 *   notFound     - ids the resolver could not dereference (page missing,
 *                  chunks block absent, or id not declared in the page)
 *   sourcesRead  - count of distinct pages fetched
 *   elapsedMs    - wallclock for the resolve call
 *
 * This is the LOAD-BEARING bridge between the manifest layer (which holds
 * pointers) and the wiki layer (which holds bodies). Generators call it
 * with the chunk ids declared in the engagement's manifest; the model
 * sees a structured chunk catalog instead of bulk article bodies.
 */
export async function resolveChunks(chunkIds: string[]): Promise<ResolvedChunks> {
    const t0 = Date.now();
    const out: ResolvedChunk[] = [];
    const notFound: string[] = [];
    if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
        return { chunks: [], notFound: [], sourcesRead: 0, elapsedMs: 0 };
    }
    // Group by source path.
    const byPage = new Map<string, string[]>();
    for (const id of chunkIds) {
        if (typeof id !== 'string' || !id.includes('#c')) {
            notFound.push(id);
            continue;
        }
        const [src] = id.split('#');
        if (!src) {
            notFound.push(id);
            continue;
        }
        if (!byPage.has(src)) byPage.set(src, []);
        byPage.get(src)!.push(id);
    }
    let reads = 0;
    await Promise.all(Array.from(byPage.entries()).map(async ([src, ids]) => {
        const text = await _readWikiPageRaw(src);
        if (!text) {
            for (const id of ids) notFound.push(id);
            return;
        }
        reads++;
        const declared = _parseChunksFrontmatter(text);
        const body = _stripFrontmatter(text);
        const byId = new Map<string, typeof declared[0]>();
        for (const d of declared) byId.set(d.id, d);
        for (const id of ids) {
            const d = byId.get(id);
            if (!d) {
                notFound.push(id);
                continue;
            }
            const [a, b] = d.charSpan;
            const span = body.slice(a, b);
            out.push({
                id,
                sourcePath: src,
                text: span,
                keyTerms: d.keyTerms,
                section: d.section,
                charSpan: [a, b],
                sentenceCount: d.sentenceCount,
            });
        }
    }));
    return {
        chunks: out,
        notFound,
        sourcesRead: reads,
        elapsedMs: Date.now() - t0,
    };
}

/**
 * Discover all chunk pointers currently declared in an engagement's
 * corpus by walking the engagement's source archives + recent ingests.
 * Returns just the IDs; pair with `resolveChunks()` to get bodies.
 *
 * This is the manifest-driven retrieval entrypoint: instead of querying
 * an embedding store or injecting full bodies, the generator asks the
 * manifest "what chunks are in this engagement's corpus?", picks the
 * relevant subset by pre-rank against the goal (using the chunk
 * key_terms), then resolves only those.
 *
 * Best-effort: returns [] when the manifest isn't ready or the engagement
 * has no recorded source archives yet.
 */
export async function listEngagementChunkIds(engagementSlug: string): Promise<string[]> {
    if (!engagementSlug) return [];
    try {
        const resp = await fetch(`${PROXY_BASE}/api/manifest/chunks?engagement=${encodeURIComponent(engagementSlug)}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const ids = Array.isArray(data?.chunk_ids) ? data.chunk_ids : [];
        return ids.filter((x: any) => typeof x === 'string');
    } catch {
        return [];
    }
}
