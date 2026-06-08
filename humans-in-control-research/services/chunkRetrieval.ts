/**
 * chunkRetrieval.ts - the manifest-driven retrieval contract.
 *
 * Replaces the four anti-patterns the user flagged 2026-06-06:
 *   1. Bulk-injecting full article bodies into LLM prompts.
 *   2. Sampling top-N by relevance and silently dropping the rest.
 *   3. Generators reading in-memory state instead of the wiki source of truth.
 *   4. Generated insights existing only in transient JSON, never as
 *      addressable wiki chunks future runs can build on.
 *
 * The contract - see .claude/skills/manifest-chunk-retrieval/SKILL.md for
 * the agent-facing protocol:
 *   - The wiki is the addressable second-brain memory.
 *   - The MANIFEST declares which chunks are in the engagement's corpus.
 *   - This service queries the manifest, pre-ranks chunks against the
 *     prompt by their declared key_terms (CPU-only, deterministic, no LLM
 *     calls), resolves the selected subset via the wiki page frontmatter,
 *     and hands the generator a prompt-ready corpus block.
 *   - Every emitted insight is written back as a wiki chunk so the
 *     manifest grows from generation, not just from external ingestion.
 *     The next run can cite past insights by pointer - the second-brain
 *     feedback loop the user demanded.
 *
 * Composes with:
 *   - wikiPointerResolver.ts (listEngagementChunkIds, resolveChunks)
 *   - proxy/wiki_chunker.py (chunk_for_manifest, upsert_chunks_into_frontmatter)
 *   - .claude/hooks/scripts/validate_chunk_citations.py (Stop hook, every
 *     deliverable; rejects emissions that don't cite by chunk pointer)
 *   - .claude/hooks/scripts/validate_insight_provenance.py (Stop hook;
 *     validates persisted insight chunks reference real manifest chunks)
 *   - .claude/agents/chunk-retrieval-strategist.md (deep planner subagent
 *     for non-trivial chunk-selection tasks)
 *
 * Created 2026-06-06.
 */

import {
    listEngagementChunkIds,
    resolveChunks,
    type ResolvedChunk,
} from './wikiPointerResolver';

const PROXY_BASE = 'http://127.0.0.1:5012';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Default token budget for a generation's CORPUS block. ~30K tokens leaves
 *  generous headroom inside any modern context window after the system
 *  prompt + schema + instructions + output are accounted for. Callers can
 *  override per generation type (deck might want larger; chat-driven might
 *  want smaller). */
export const DEFAULT_CORPUS_TOKEN_BUDGET = 30_000;

/** Token-per-char heuristic. ~4 chars/token for English is the widely cited
 *  rough rate. We use this only for greedy-pack budgeting against the
 *  CORPUS block; downstream LLM calls do real tokenization. */
const CHARS_PER_TOKEN_ESTIMATE = 4;

// ---------------------------------------------------------------------------
// Manifest catalog read (with shape + cache around the proxy endpoint)
// ---------------------------------------------------------------------------

export interface ManifestChunkRecord {
    chunkId: string;        // <wikiPath>#c<index>
    sourcePath: string;
    chunkIndex: number;
    /** Manifest-declared key_terms for this source page (the page-level
     *  key_terms, not per-chunk). Sufficient for coarse pre-rank; the per-
     *  chunk key_terms are read from the page's chunks: frontmatter only
     *  when the resolver dereferences. */
    sourceKeyTerms: string[];
    sourceTitle: string;
    sourceSubreddit: string;
    sourceRelevance: number;
}

const _CATALOG_CACHE = new Map<string, { ts: number; records: ManifestChunkRecord[] }>();
const _CATALOG_TTL_MS = 60_000;

/**
 * Phase 2.0 (intent-realization-plan) - build the chunk catalog from the user's
 * KL SELECTION pages when the engagement-scoped catalog is empty (the cached-only
 * case: a fresh goal slug matches no wiki page, so /api/manifest/chunks returns 0
 * and MCR would no-op into bulk RAG). The selected pages carry chunk_count>0;
 * this resolves the selection to their chunk pointers. theme_cluster_ids are
 * NOT used here (topic-identity pointers, a different scheme).
 */
interface SelectionCatalog { ids: string[]; pages: Record<string, { key_terms: string[]; relevance: number; title?: string }>; }
async function _fetchSelectionCatalogIds(): Promise<SelectionCatalog> {
    const empty: SelectionCatalog = { ids: [], pages: {} };
    try {
        const selResp = await fetch(`${PROXY_BASE}/api/user-selection/active`);
        if (!selResp.ok) return empty;
        const sel = await selResp.json();
        if (!sel || sel._uncommitted) return empty;
        const body = {
            social_subreddits: Array.isArray(sel.social_subreddits) ? sel.social_subreddits : [],
            article_sources: Array.isArray(sel.article_sources) ? sel.article_sources : [],
            source_archive_paths: Array.isArray(sel.source_archive_paths) ? sel.source_archive_paths : [],
        };
        if (!body.social_subreddits.length && !body.article_sources.length && !body.source_archive_paths.length) return empty;
        const resp = await fetch(`${PROXY_BASE}/api/manifest/chunks-from-selection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!resp.ok) return empty;
        const data = await resp.json();
        return {
            ids: Array.isArray(data?.chunk_ids) ? data.chunk_ids : [],
            pages: (data && typeof data.pages === 'object' && data.pages) ? data.pages : {},
        };
    } catch (e: any) {
        console.warn('[chunkRetrieval] selection catalog read failed:', e?.message || e);
        return empty;
    }
}

async function _readManifestCatalog(engagementSlug: string, bypassCache = false): Promise<ManifestChunkRecord[]> {
    if (!engagementSlug) return [];
    // ENHANCEMENT E (2026-06-08): bypass the 60s catalog TTL during sharded
    // breadth (excludeIds non-empty). Otherwise parallel shards read a stale
    // catalog and select OVERLAPPING windows despite excludeIds, defeating the
    // breadth diversity the sharding exists to produce.
    if (!bypassCache) {
        const cached = _CATALOG_CACHE.get(engagementSlug);
        if (cached && Date.now() - cached.ts < _CATALOG_TTL_MS) return cached.records;
    }
    try {
        const url = `${PROXY_BASE}/api/manifest/chunks?engagement=${encodeURIComponent(engagementSlug)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        let ids: string[] = Array.isArray(data?.chunk_ids) ? data.chunk_ids : [];
        let pages: Record<string, { key_terms: string[]; relevance: number; title?: string }> = {};
        // Phase 2.0 cached-only fallback: empty engagement catalog -> use the KL
        // selection's pages (the chunks exist; the engagement-slug filter just
        // excluded them). This is what lets MCR serve the cached corpus instead
        // of falling back to bulk RAG. The selection endpoint also returns
        // page-level key_terms so pickChunksForPrompt can PRE-RANK cheaply.
        if (ids.length === 0) {
            const sel = await _fetchSelectionCatalogIds();
            ids = sel.ids;
            pages = sel.pages;
            if (ids.length) console.log(`[chunkRetrieval] engagement catalog empty for "${engagementSlug}" - using KL-selection catalog (${ids.length} chunk pointers, ${Object.keys(pages).length} pages w/ key_terms)`);
        }
        const records: ManifestChunkRecord[] = ids.map((id) => {
            const [src, frag] = id.split('#');
            const idx = frag && frag.startsWith('c') ? parseInt(frag.slice(1), 10) : 0;
            const pm = pages[src || ''];
            // Cheap pre-rank signal WITHOUT resolving: prefer manifest key_terms,
            // but those are empty for social-post/article records, so fall back to
            // tokenizing the page TITLE (which always exists and is goal-specific).
            const ktRaw = pm && Array.isArray(pm.key_terms) ? pm.key_terms : [];
            const sourceKeyTerms = ktRaw.length
                ? ktRaw
                : (pm && pm.title ? Array.from(_tokenize(pm.title)) : []);
            return {
                chunkId: id,
                sourcePath: src || '',
                chunkIndex: Number.isFinite(idx) ? idx : 0,
                sourceKeyTerms,
                sourceTitle: pm && pm.title ? pm.title : '',
                sourceSubreddit: '',
                sourceRelevance: pm ? (pm.relevance || 0) : 0,
            };
        });
        _CATALOG_CACHE.set(engagementSlug, { ts: Date.now(), records });
        return records;
    } catch (e: any) {
        console.warn('[chunkRetrieval] manifest catalog read failed:', e?.message || e);
        return [];
    }
}

// ---------------------------------------------------------------------------
// pickChunksForPrompt - the pre-rank step
// ---------------------------------------------------------------------------

export interface PickChunksOptions {
    /** Token budget for the CORPUS block. Defaults to DEFAULT_CORPUS_TOKEN_BUDGET. */
    tokenBudget?: number;
    /** Additional context to mix into the keyword scorer (e.g. the research
     *  goal, the deliverable type, prior chat turns). Strengthens the
     *  match when the user's prompt is short ("themes" alone is too vague
     *  to rank against). */
    extraContext?: string;
    /** Chunk pointers the caller wants forced into the selection regardless
     *  of relevance (e.g. user explicitly named a source, or a prior
     *  generation's insight chunk that must carry forward). */
    pinnedChunkIds?: string[];
    /** 2026-06-08 - SHARDED BREADTH. Chunk pointers already covered by prior
     *  shards; removed from the candidate pool so this shard selects the NEXT
     *  relevance-ranked window over fresh corpus. Enables coverage-driven
     *  sharding (the lever is relevance coverage, not a fixed shard count). */
    excludeIds?: string[];
    /** 2026-06-08 - Skip the automatic cached-selection auto-pin. Shard 0 covers
     *  the pinned cached chunks; shards 1..K must NOT re-pin them (that would
     *  waste each shard's budget re-selecting the same 557 cached chunks). */
    skipAutoPin?: boolean;
}

export interface PickedChunks {
    chunkIds: string[];
    droppedZeroScore: number;
    droppedOverBudget: number;
    catalogSize: number;
    tokenBudget: number;
    estimatedTokens: number;
    elapsedMs: number;
}

const _WORD_RE = /\b[a-z][a-z0-9'-]{2,}\b/g;

function _tokenize(text: string): Set<string> {
    if (!text) return new Set();
    const lowered = text.toLowerCase();
    const out = new Set<string>();
    const matches = lowered.match(_WORD_RE);
    if (!matches) return out;
    for (const m of matches) {
        if (m.length > 2) out.add(m);
    }
    return out;
}

/**
 * Pre-rank the engagement's chunk catalog against the user prompt and
 * select the chunks that fit inside the token budget. Deterministic
 * (no LLM call). Returns the SHORTLIST of chunk pointers the generator
 * should resolve.
 *
 * The ranker reads each chunk's PER-CHUNK key_terms by fetching the
 * declaring page's frontmatter via the resolver. This makes the pre-rank
 * a single network round-trip per source page (cached by the resolver
 * after the first request).
 */
export async function pickChunksForPrompt(
    userPrompt: string,
    engagementSlug: string,
    opts: PickChunksOptions = {},
): Promise<PickedChunks> {
    const t0 = Date.now();
    const tokenBudget = opts.tokenBudget ?? DEFAULT_CORPUS_TOKEN_BUDGET;
    const pinned = new Set(opts.pinnedChunkIds || []);

    // C2 (2026-06-06) - Always pin cached-selection chunks. Read the
    // user-curated KL selection and merge ANY chunk pointers it declares
    // (theme_cluster_ids that look like wikiPath#cN, plus chunk pointers
    // resolvable from cached deliverable pages) into the pinned set so
    // the budget-greedy pack always includes them. Failure to read the
    // selection is silent - falls back to unpinned ranking.
    if (!opts.skipAutoPin) {
        try {
            const _selResp = await fetch(`${PROXY_BASE}/api/user-selection/active`);
            if (_selResp.ok) {
                const _sel = await _selResp.json();
                if (_sel && !_sel._uncommitted) {
                    const ids = Array.isArray(_sel.theme_cluster_ids) ? _sel.theme_cluster_ids : [];
                    for (const id of ids) {
                        if (typeof id === 'string' && id.includes('#c')) pinned.add(id);
                    }
                }
            }
        } catch { /* silent - pin set stays as caller provided */ }
    }

    // 2026-06-08 - SHARDED BREADTH: drop chunks already covered by prior shards
    // so this shard selects the NEXT relevance-ranked window. Excluded ids are
    // also removed from the pin set (a prior shard already carried them).
    const _exclude = new Set(opts.excludeIds || []);
    for (const id of _exclude) pinned.delete(id);
    // Enhancement E: sharded runs (excludeIds present) bypass the catalog TTL
    // cache so each shard sees concurrent writes and picks non-overlapping windows.
    let catalog = await _readManifestCatalog(engagementSlug, _exclude.size > 0);
    if (_exclude.size > 0) {
        const before = catalog.length;
        catalog = catalog.filter(r => !_exclude.has(r.chunkId));
        if (before !== catalog.length) {
            console.log(`[chunkRetrieval] shard window: excluded ${before - catalog.length} prior-shard chunks; ${catalog.length} remain in catalog`);
        }
    }
    if (catalog.length === 0) {
        return {
            chunkIds: Array.from(pinned),
            droppedZeroScore: 0,
            droppedOverBudget: 0,
            catalogSize: 0,
            tokenBudget,
            estimatedTokens: 0,
            elapsedMs: Date.now() - t0,
        };
    }

    const promptKeywords = _tokenize(`${userPrompt}\n${opts.extraContext || ''}`);

    // Phase 2.0 perf (intent-realization-plan) - candidate selection.
    // For a LARGE catalog (the cached-only KL case: thousands of chunks),
    // resolving every chunk to read its per-chunk key_terms floods the proxy
    // with thousands of /api/wiki/read calls (the observed 166x
    // ERR_INSUFFICIENT_RESOURCES). Instead PRE-RANK on the cheap page-level
    // key_terms the catalog already carries, shortlist the top candidates, and
    // resolve ONLY those. Small catalogs (a real engagement / chat) keep the
    // precise resolve-all path.
    const LARGE_CATALOG = 600;
    const hasPageKeyTerms = catalog.some(r => Array.isArray(r.sourceKeyTerms) && r.sourceKeyTerms.length > 0);
    let candidateRecs = catalog;
    if (catalog.length > LARGE_CATALOG && hasPageKeyTerms) {
        // Phase A2 (go-forward plan) - widen the cheap pre-rank pool so MMR has
        // diversity to work with. Score = title-token overlap; tie-break by
        // manifest relevance then chunkId (deterministic). Title-matching pages
        // lead, but BACKFILL with highest-relevance non-matching pages so a goal
        // whose tokens rarely appear in titles still gets a broad pool (defeats
        // the narrow-shortlist collapse - root cause H-A/H-B). Off-goal backfill
        // pages that don't survive the precise per-chunk score below are simply
        // dropped, so this widens reach without polluting the final selection.
        const prelim = catalog.map(rec => {
            let overlap = 0;
            for (const t of rec.sourceKeyTerms) if (promptKeywords.has(t.toLowerCase())) overlap++;
            return { rec, overlap, rel: rec.sourceRelevance || 0 };
        });
        // ~1KB/chunk avg; 8x margin (raised from 4x) gives MMR a wider field while
        // staying far under the resolve-flood threshold (480 resolved cleanly; cap 1200).
        const shortlist = Math.min(1200, Math.max(400, Math.ceil((tokenBudget * CHARS_PER_TOKEN_ESTIMATE) / 1000) * 8));
        const matched = prelim.filter(s => s.overlap > 0)
            .sort((a, b) => (b.overlap - a.overlap) || (b.rel - a.rel) || (a.rec.chunkId < b.rec.chunkId ? -1 : 1));
        let picked = matched.slice(0, shortlist);
        if (picked.length < shortlist) {
            const backfill = prelim.filter(s => s.overlap === 0)
                .sort((a, b) => (b.rel - a.rel) || (a.rec.chunkId < b.rec.chunkId ? -1 : 1));
            picked = picked.concat(backfill.slice(0, shortlist - picked.length));
        }
        candidateRecs = picked.map(s => s.rec);
        const inShortlist = new Set(candidateRecs.map(r => r.chunkId));
        for (const rec of catalog) {
            if (pinned.has(rec.chunkId) && !inShortlist.has(rec.chunkId)) candidateRecs.push(rec);
        }
        console.log(`[chunkRetrieval] large catalog (${catalog.length}) - pre-rank shortlisted ${candidateRecs.length} (matched=${matched.length}, target=${shortlist}) to resolve`);
    }

    // Resolve the candidate set (all of catalog for small catalogs; the
    // shortlist for large ones). The resolver's per-page cache means N chunks
    // across M pages is M fetches not N.
    const resolved = await resolveChunks(candidateRecs.map(c => c.chunkId));
    const byId = new Map<string, ResolvedChunk>();
    for (const c of resolved.chunks) byId.set(c.id, c);

    // Score each resolved chunk on its PRECISE per-chunk key_terms.
    interface Scored {
        chunk: ResolvedChunk;
        score: number;
        charLen: number;
    }
    const scored: Scored[] = [];
    let droppedZeroScore = 0;
    for (const rec of candidateRecs) {
        const ch = byId.get(rec.chunkId);
        if (!ch) continue;
        let overlap = 0;
        for (const t of ch.keyTerms) {
            if (promptKeywords.has(t.toLowerCase())) overlap++;
        }
        const score = overlap * Math.max(1, ch.sentenceCount);
        const isPinned = pinned.has(ch.id);
        if (!isPinned && score === 0) {
            droppedZeroScore++;
            continue;
        }
        scored.push({ chunk: ch, score: isPinned ? Number.POSITIVE_INFINITY : score, charLen: ch.text.length });
    }

    // Phase A1 (go-forward plan) - MMR diversity packing. The old pack took pure
    // score-desc, which clusters near-duplicate chunks (root cause H-A: themes
    // collapsed to 10 when the corpus was ~60 near-identical chunks). MMR greedily
    // picks the candidate maximizing  LAMBDA*relevance - (1-LAMBDA)*maxSimToSelected,
    // where similarity is per-chunk key_term Jaccard (CPU-only, no embeddings).
    // Deterministic: candidates are pre-sorted (score desc, shorter, chunkId asc)
    // and ties use strict-greater, so the first in that stable order wins.
    scored.sort((a, b) => (b.score - a.score) || (a.charLen - b.charLen) || (a.chunk.id < b.chunk.id ? -1 : 1));
    const _termSet = (ch: ResolvedChunk): Set<string> => new Set(ch.keyTerms.map(t => t.toLowerCase()));
    const _jaccard = (a: Set<string>, b: Set<string>): number => {
        if (a.size === 0 || b.size === 0) return 0;
        let inter = 0;
        for (const t of a) if (b.has(t)) inter++;
        return inter / (a.size + b.size - inter);
    };
    const selected: string[] = [];
    let budgetChars = tokenBudget * CHARS_PER_TOKEN_ESTIMATE;
    let usedChars = 0;
    const selectedSets: Set<string>[] = [];
    // Force-select pinned (score=Infinity) - budget override, as before.
    for (const s of scored) {
        if (s.score !== Number.POSITIVE_INFINITY) continue;
        selected.push(s.chunk.id);
        usedChars += s.charLen;
        budgetChars -= s.charLen;
        selectedSets.push(_termSet(s.chunk));
    }
    const LAMBDA = 0.7;   // relevance weight; (1-LAMBDA) penalizes redundancy
    const pool = scored
        .filter(s => s.score !== Number.POSITIVE_INFINITY)
        .map(s => ({ s, set: _termSet(s.chunk), norm: 0, taken: false }));
    const maxScore = pool.reduce((m, p) => Math.max(m, p.s.score), 0) || 1;
    for (const p of pool) p.norm = p.s.score / maxScore;
    while (true) {
        let bestIdx = -1;
        let bestMmr = -Infinity;
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (p.taken || p.s.charLen > budgetChars) continue;
            let maxSim = 0;
            for (const sel of selectedSets) { const j = _jaccard(p.set, sel); if (j > maxSim) maxSim = j; }
            const mmr = LAMBDA * p.norm - (1 - LAMBDA) * maxSim;
            if (mmr > bestMmr) { bestMmr = mmr; bestIdx = i; }   // strict > -> first in stable order wins ties
        }
        if (bestIdx === -1) break;   // nothing left fits the budget
        const chosen = pool[bestIdx];
        chosen.taken = true;
        selected.push(chosen.s.chunk.id);
        usedChars += chosen.s.charLen;
        budgetChars -= chosen.s.charLen;
        selectedSets.push(chosen.set);
    }
    const droppedOverBudget = pool.filter(p => !p.taken).length;
    console.log(`[chunkRetrieval] MMR pack: selected ${selected.length} chunks (lambda=${LAMBDA}, ~${Math.round(usedChars / CHARS_PER_TOKEN_ESTIMATE)} tok) from ${pool.length} scored candidates`);

    return {
        chunkIds: selected,
        droppedZeroScore,
        droppedOverBudget,
        catalogSize: catalog.length,
        tokenBudget,
        estimatedTokens: Math.round(usedChars / CHARS_PER_TOKEN_ESTIMATE),
        elapsedMs: Date.now() - t0,
    };
}

// ---------------------------------------------------------------------------
// assembleChunkCorpus - turn resolved chunks into a prompt block
// ---------------------------------------------------------------------------

export interface CorpusBlockOptions {
    /** Drop chunks below this length (chars) when assembling. Defaults to 0
     *  (include everything pickChunksForPrompt selected). */
    minChunkChars?: number;
    /** Custom intro text. Defaults to the SKILL-aligned instruction. */
    introText?: string;
}

/**
 * Render resolved chunks as a prompt block the generator pastes verbatim.
 * The CHUNK POINTER is placed on its own line above each text span so
 * the model can cite it cleanly: `[<wikiPath>#cN]`.
 *
 * Pair with the citation instruction emitted by `chunkCitationInstructions()`
 * in the generator's system prompt - that tells the model to attach the
 * pointer at the END of each evidence sentence.
 */
export function assembleChunkCorpus(
    chunks: ResolvedChunk[],
    opts: CorpusBlockOptions = {},
): string {
    if (!chunks || chunks.length === 0) {
        return '=== CORPUS (chunk-addressed) === [empty: no chunks in scope]\n=== END CORPUS ===';
    }
    const minChars = opts.minChunkChars ?? 0;
    const intro = opts.introText ?? (
        'CORPUS (chunk-addressed). Each entry below is a verbatim span from a wiki ' +
        'source page; the pointer in square brackets is its stable chunk id. Cite by ' +
        'pointer in your output. Do not paraphrase as evidence; quote verbatim from ' +
        'these spans only.'
    );
    const lines: string[] = [
        '=== CORPUS (chunk-addressed, cite by pointer) ===',
        intro,
        '',
    ];
    for (const c of chunks) {
        if (c.text.length < minChars) continue;
        const sectionTag = c.section ? ` (section: ${c.section})` : '';
        lines.push(`[${c.id}]${sectionTag}`);
        lines.push(c.text.trim());
        lines.push('');
    }
    lines.push('=== END CORPUS ===');
    return lines.join('\n');
}

/**
 * Returns the CITATION INSTRUCTION block to inject into the generator's
 * system prompt. Same wording across all deliverables so the validator
 * can rely on a stable contract. */
export function chunkCitationInstructions(): string {
    return [
        'CITATION DISCIPLINE - MANDATORY (UNIVERSAL):',
        '  - Every evidence sentence in your output MUST end with the pointer of',
        '    the chunk that supports it: [<wikiPath>#cN].',
        '  - Quoted text in double quotes ALWAYS gets a pointer.',
        '  - Statistics, named entities, attributions ("according to X"), and any',
        '    claim about prior research ALWAYS get a pointer.',
        '  - Synthesis statements (interpretation, recommendation, framing) may',
        '    omit a pointer, but any reference to corpus evidence within a synthesis',
        '    sentence DOES require a pointer.',
        '  - NEVER invent a chunk pointer. NEVER cite a pointer that wasn\'t in the',
        '    CORPUS block above. The Stop hook validate_chunk_citations.py rejects',
        '    both cases with a structured error the user sees.',
        '  - Avoid sourcing phrases ("research shows", "studies indicate", "the data',
        '    reveals", "according to the corpus"). Cite the chunk pointer instead.',
    ].join('\n');
}

// ---------------------------------------------------------------------------
// validateCitations - call-site helper that runs the same check as the hook
// ---------------------------------------------------------------------------

export interface ValidatedCitations {
    citationsFound: string[];
    fabricated: string[];           // citation ids NOT in manifestChunkIds
    evidenceSentencesMissingCitation: string[]; // sentences with evidence tells but no citation
}

const _CITATION_RE = /\[([^\]\s]+#c\d+)\]/g;
const _EVIDENCE_TELL_RE = /(\d+(?:\.\d+)?%|\$\d+(?:[.,]\d+)?[KMB]?|\baccording to\b|\breported\b|\bfound that\b|\bstudy\b|\bresearch\b|\bsurvey\b|"[^"]{20,}")/i;

/**
 * Pre-flight check that callers can run BEFORE sending an emission to the
 * hook. Returns the same structured result the hook computes. Useful for
 * client-side retries: if validateCitations flags fabricated pointers, the
 * caller can ask the model to re-emit before the Stop event fires.
 */
export function validateCitations(
    text: string,
    manifestChunkIds: Set<string>,
): ValidatedCitations {
    const citationsFound = new Set<string>();
    for (const m of text.matchAll(_CITATION_RE)) {
        citationsFound.add(m[1]);
    }
    const fabricated = Array.from(citationsFound).filter(c => !manifestChunkIds.has(c));

    // Sentence-scan for evidence tells lacking a citation.
    const evidenceMissing: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
        if (s.length < 30) continue;
        if (!_EVIDENCE_TELL_RE.test(s)) continue;
        if (!_CITATION_RE.test(s)) {
            evidenceMissing.push(s.slice(0, 180));
            if (evidenceMissing.length >= 8) break;
        }
        // Reset the global regex's lastIndex after .test()
        _CITATION_RE.lastIndex = 0;
        _EVIDENCE_TELL_RE.lastIndex = 0;
    }

    return {
        citationsFound: Array.from(citationsFound),
        fabricated,
        evidenceSentencesMissingCitation: evidenceMissing,
    };
}

// ---------------------------------------------------------------------------
// persistInsightAsChunk - close the second-brain feedback loop
// ---------------------------------------------------------------------------

export interface InsightPersistInput {
    /** Engagement slug (URL-safe). */
    engagementSlug: string;
    /** Deliverable kind: theme | persona | recommendation | gap | etc. */
    kind: string;
    /** Stable id of this insight inside the deliverable (cluster id, persona
     *  id, recommendation index). Used in the wiki page filename. */
    insightId: string;
    /** The insight's text (the name + summary + body that the model emitted). */
    text: string;
    /** The chunk pointers this insight cited as its evidence base. */
    sourceChunks: string[];
    /** Model used to generate the insight (e.g. "gemini-3.1-pro-preview"). */
    model: string;
    /** Reproducibility hash for the deliverable that contained this insight. */
    reproducibilityHash?: string;
    /** Goal of the engagement (frontmatter context for future ranking). */
    researchGoal?: string;
    /** Optional title for the insight (defaults to the first sentence). */
    title?: string;
}

export interface InsightPersistResult {
    ok: boolean;
    wikiPath?: string;
    chunkCount?: number;
    error?: string;
}

/**
 * Write a generated insight as its own wiki page so the manifest grows
 * from generation, not just from external ingestion. The new page is
 * chunked at write-time (by /api/wiki/write-article's chunker hook) and
 * its pointers join the manifest automatically.
 *
 * Frontmatter contract:
 *   kind: insight-<kind>     # insight-theme, insight-persona, etc.
 *   engagement: <slug>
 *   insight_id: <stable>
 *   generated_at: <iso8601>
 *   generation_provenance:
 *     source_chunks: [<wikiPath>#cN, ...]
 *     model: <model_id>
 *     reproducibility_hash: <hash>
 *   chunks: [...]            # auto-injected by chunker
 *
 * After this writes, the next generation that calls listEngagementChunkIds
 * will see the insight pointers in the catalog. Subsequent deliverables
 * can cite past insights - the second-brain feedback loop.
 *
 * Composes with:
 *   - /api/wiki/write-article (proxy endpoint, chunks at write time)
 *   - validate_insight_provenance.py (validates source_chunks are real)
 *   - epoch-proposer (mines hook-rejection-log to learn from drift)
 */
export async function persistInsightAsChunk(input: InsightPersistInput): Promise<InsightPersistResult> {
    if (!input.engagementSlug || !input.kind || !input.insightId || !input.text) {
        return { ok: false, error: 'engagementSlug + kind + insightId + text are required' };
    }
    const safeKind = String(input.kind).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const safeId = String(input.insightId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'noid';
    const wikiPath = `synthesis/insights/${input.engagementSlug}/${safeKind}/${safeId}.md`;
    const title = input.title || input.text.split(/\n|\./)[0].slice(0, 120).trim();
    const provenance = {
        source_chunks: (input.sourceChunks || []).filter(c => typeof c === 'string'),
        model: input.model || '',
        reproducibility_hash: input.reproducibilityHash || '',
    };
    // Build the post body. The /api/wiki/write-article endpoint will add its
    // own frontmatter and then call the chunker. We pre-bake the insight-
    // specific frontmatter into the markdown body using a `<!-- provenance:
    // ... -->` HTML comment block so the chunker preserves it. The retrofit
    // and reader recognize the same shape.
    const provenanceBlock = JSON.stringify(provenance, null, 2);
    const content = [
        `# ${title}`,
        '',
        `<!-- nxt:provenance ${JSON.stringify({ kind: `insight-${safeKind}`, engagement: input.engagementSlug, insight_id: safeId, generated_at: new Date().toISOString(), generation_provenance: provenance })} -->`,
        '',
        input.text.trim(),
        '',
        '## Generation provenance',
        '',
        '```json',
        provenanceBlock,
        '```',
        '',
    ].join('\n');

    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write-article`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: `nxt://insights/${input.engagementSlug}/${safeKind}/${safeId}`,
                title,
                content,
                source: 'NXT-Insight',
                kind: `insight-${safeKind}`,
                tier: 1,
                engagement: input.engagementSlug,
                engagementGoal: input.researchGoal || '',
                channel: 'synthesis',
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text().catch(() => resp.statusText);
            return { ok: false, error: `write-article failed HTTP ${resp.status}: ${errText.slice(0, 200)}` };
        }
        const data = await resp.json();
        // P2 (2026-06-06) - Notify App.tsx that a deliverable was persisted
        // so the wiki-hydration listener re-reads engagement deliverables
        // and lights up the Analyst Desk metric tiles + Knowledge Graph.
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hic:deliverable-persisted', {
                    detail: { engagementSlug: input.engagementSlug, kind: input.kind, insightId: input.insightId },
                }));
            }
        } catch { /* non-fatal */ }
        return {
            ok: true,
            wikiPath: data.wikiPath || wikiPath,
            chunkCount: data.chunkCount || 0,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
    }
}

/**
 * Convenience: dispatch the deliverable-persisted event directly from a
 * call site that wrote to wiki/engagements/<slug>/<kind>.json outside of
 * persistInsightAsChunk (e.g., the freeform-artifact write path in chat).
 * App.tsx's wiki-hydration listener triggers from this event.
 */
export function notifyDeliverablePersisted(engagementSlug: string, kind: string): void {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hic:deliverable-persisted', {
                detail: { engagementSlug, kind },
            }));
        }
    } catch { /* non-fatal */ }
}

/**
 * Convenience: turn a manifest chunk-id list into a Set for fast
 * membership checks in validateCitations(). Memoized by engagement slug.
 */
const _ID_SET_CACHE = new Map<string, { ts: number; set: Set<string> }>();
export async function getEngagementChunkIdSet(engagementSlug: string): Promise<Set<string>> {
    const cached = _ID_SET_CACHE.get(engagementSlug);
    if (cached && Date.now() - cached.ts < _CATALOG_TTL_MS) return cached.set;
    const ids = await listEngagementChunkIds(engagementSlug);
    const set = new Set<string>(ids);
    _ID_SET_CACHE.set(engagementSlug, { ts: Date.now(), set });
    return set;
}

// ---------------------------------------------------------------------------
// SkillOpt trajectory writer (2026-06-06)
// ---------------------------------------------------------------------------

/**
 * Append a structured record to the unified SkillOpt trajectory store
 * (`wiki/synthesis/hook-rejection-log.md`). This is the SAME file that
 * (a) hook validators write rejections to, (b) the artifact-engine
 * auditor writes audit verdicts to, and (c) deliverable-auditor
 * subagents log their findings to. The SkillOpt validation gate and
 * the epoch-proposer skill mine this file to propose SKILL.md edits.
 *
 * Call this from any user-feedback surface (chat thumbs-down, edit-an-
 * emission, regenerate-with-feedback) so SkillOpt's self-improvement
 * loop sees user signals alongside auditor signals.
 */
export interface SkillOptTrajectoryRecord {
    source: 'user_feedback' | 'user_edit' | 'user_regenerate' | 'user_thumbs_down'
          | 'deliverable_auditor' | 'subagent_verdict' | 'export_failure'
          | 'pptx_audit' | 'manual';
    deliverable?: string;       // hashtag, e.g. '#themes'
    engagementSlug?: string;
    model?: string;
    verdict?: 'accept' | 'warn' | 'advance' | 'reject' | 'regenerate';
    reason: string;             // human-readable
    detail?: Record<string, any>;
}

export async function logSkillOptTrajectory(rec: SkillOptTrajectoryRecord): Promise<boolean> {
    const payload = {
        ts_ms: Date.now(),
        ...rec,
    };
    try {
        const resp = await fetch(`${PROXY_BASE}/api/skillopt/trajectory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return resp.ok;
    } catch {
        return false;
    }
}
