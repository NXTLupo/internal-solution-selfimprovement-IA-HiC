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
// WS-A: register per-chunk REAL sources at the assembleChunkCorpus chokepoint so cite-time resolution
// (resolveManifestPointers) uses the chunk's actual attribution, not the page title.
import { registerResolvedChunkSources } from './citationPointerRegistry';
import { noteGroundingChunks } from './pointerBinder';
// W6 (2026-07-01, scorecard "corpus bias toward Reddit"): stop junk grounding AT RETRIEVAL - the same
// non-evidence predicate the ledger uses (bot/mod boilerplate, tombstones) now excludes chunks BEFORE
// they ground a generation, not just before they enter the AIR ledger.
import { isNonEvidenceChunk } from './evidenceLedgerService';

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

/**
 * 2026-06-23 — centralized social/community-source classifier for the
 * SOURCE-TYPE BALANCE soft-cap. Originally inline + reddit-only; generalized so
 * the cap automatically balances EVERY community/social platform (the new free
 * connectors — Hacker News, Bluesky, Lobsters — plus X/Mastodon/Threads) against
 * curated news/academic/government sources. New social connectors persist under
 * `social-intelligence/<platform>/`, so the path test catches them; the source-
 * name tokens are belt-and-suspenders. Curated sources never match.
 */
const SOCIAL_SOURCE_RE = /reddit|social-intelligence|hacker[\s_-]?news|hackernews|\bhn\b|bluesky|\bbsky\b|lobste\.?rs|lobsters|mastodon|\btwitter\b|\bx\.com\b|threads|\bdigg\b/i;
export function isSocialSource(sourcePath?: string, sourceTitle?: string): boolean {
    const hay = `${sourcePath || ''} ${sourceTitle || ''}`;
    return SOCIAL_SOURCE_RE.test(hay);
}

export interface ManifestChunkRecord {
    chunkId: string;        // <wikiPath>#c<index>
    /** 2026-06-16 - true when this chunk came from the user's COMMITTED KL
     *  selection (the cached-wiki data the user explicitly chose). User
     *  selections TRUMP auto-ranking: these are never dropped by the keyword
     *  gates and rank in a tier above non-selected chunks. */
    userSelected?: boolean;
    /** 2026-06-25 - true when this chunk's page TITLE fuzzy-matched a document the
     *  user NAMED in the prompt (the by-name retrieval tier). Treated with the same
     *  never-dropped priority as userSelected: an explicitly named document must
     *  reach the prompt, not lose to embedding/objective ranking. */
    namedRef?: boolean;
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
    /** W6 (2026-07-01) - true when this record was admitted by a CROSS-ENGAGEMENT tier (tier-1.5
     *  objective-ranked whole-store admission or the tier-3 whole-wiki fallback), NOT by the engagement's
     *  own corpus or the user's KL selection. Off-engagement chunks are held to a stricter admission bar:
     *  they never enter via zero-overlap broaden backfill (the documented path by which r/waterloo Reddit
     *  chunks grounded an asset-management run). Objective-relevant off-engagement evidence still enters
     *  via keyword match / concept adjacency - this is a leakage guard, not an isolation wall. */
    offEngagement?: boolean;
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
/** OWNER-RATIFIED floor (2026-07-01): a DORMANT KL selection must be at least this goal-similar to the
 *  CURRENT research objective before it may ground a deliverable. Live failure this closes: a leftover
 *  r/healthinsurance selection from a prior session expanded to 929 chunk pointers, rode the
 *  user-selection priority tier, and filled 100% of every theme shard's grounding budget on an
 *  AGRICULTURAL-insurance run (all 12 themes came back health-insurance). An explicitly committed
 *  (non-dormant) selection is NEVER gated - user selections trump auto-ranking remains absolute
 *  for deliberate, current choices. */
const DORMANT_SELECTION_MIN_GOAL_SIM = 0.2;
async function _fetchSelectionCatalogIds(researchObjective = ''): Promise<SelectionCatalog> {
    const empty: SelectionCatalog = { ids: [], pages: {} };
    try {
        const selResp = await fetch(`${PROXY_BASE}/api/user-selection/active`);
        if (!selResp.ok) return empty;
        const sel = await selResp.json();
        if (!sel) return empty;
        // 2026-06-16 - USER SELECTIONS AUTO-PASS THE GATES (user rule, stated twice).
        // A committed KL selection that is merely DORMANT this session (_uncommitted -
        // the no-auto-arm fresh-load state) STILL grounds deliverables: its IDs are
        // preserved by the proxy by design. The no-auto-arm rule governs the scope-bar
        // UI and EXTERNAL COLLECTION (different consumers that read /api/user-selection
        // directly), NOT deliverable grounding - this function is ONLY called by the
        // grounding-catalog reader (_readManifestCatalog). When the user explicitly
        // requests a deliverable, their curated selection must be usable without a
        // manual re-apply. (Supersedes the retrieval-consumer half of the prior
        // no-auto-arm rule per the owner's current directive; UI/collection unchanged.)
        const _dormant = !!sel._uncommitted;
        // 2026-07-01 REFINEMENT (owner-approved): a DORMANT selection only auto-passes when its
        // CONTENT is plausibly about the current objective. Objective-supremacy: a selection made
        // for a different engagement must not silently hijack this one's grounding. Scored with the
        // same scoreGoalSimilarity the cache loader uses (converge, no new similarity brain).
        if (_dormant && researchObjective.trim().length >= 8) {
            const descriptor = [
                ...(Array.isArray(sel.social_subreddits) ? sel.social_subreddits : []),
                ...(Array.isArray(sel.article_sources) ? sel.article_sources : []),
                ...(Array.isArray(sel.source_archive_paths) ? sel.source_archive_paths : []).map(
                    (p: string) => String(p).replace(/^sources\//, '').replace(/\.md$/i, '').replace(/[-_/]+/g, ' ')),
                String(sel.goal || ''),
            ].join(' ').trim();
            if (descriptor) {
                const { scoreGoalSimilarity } = await import('./wikiCacheLoader');
                const sim = scoreGoalSimilarity(researchObjective, descriptor);
                if (sim < DORMANT_SELECTION_MIN_GOAL_SIM) {
                    console.warn(`[chunkRetrieval] DORMANT KL selection SKIPPED for grounding: goal similarity ${sim.toFixed(2)} < ${DORMANT_SELECTION_MIN_GOAL_SIM} floor (selection: "${descriptor.slice(0, 120)}"). Re-commit the selection via Curate to use it deliberately; an explicitly committed selection is always honored.`);
                    return empty;
                }
                console.log(`[chunkRetrieval] dormant KL selection goal-similarity ${sim.toFixed(2)} >= ${DORMANT_SELECTION_MIN_GOAL_SIM} - honored for grounding`);
            }
        }
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
        const ids = Array.isArray(data?.chunk_ids) ? data.chunk_ids : [];
        if (_dormant && ids.length) {
            console.log(`[chunkRetrieval] grounding on DORMANT committed KL selection (${ids.length} chunk pointers): user selections auto-pass the gates for deliverable grounding (no-auto-arm still governs the scope-bar UI + external collection).`);
        }
        return {
            ids,
            pages: (data && typeof data.pages === 'object' && data.pages) ? data.pages : {},
        };
    } catch (e: any) {
        console.warn('[chunkRetrieval] selection catalog read failed:', e?.message || e);
        return empty;
    }
}

async function _readManifestCatalog(engagementSlug: string, bypassCache = false, researchObjective = ''): Promise<ManifestChunkRecord[]> {
    if (!engagementSlug) return [];
    const _obj = (researchObjective || '').trim();
    // Cache key folds in the objective: the objective-ranked union (tier-1.5)
    // changes the catalog, so a different goal must not reuse a prior goal's cache.
    const cacheKey = `${engagementSlug}::${_obj.slice(0, 48)}`;
    // ENHANCEMENT E (2026-06-08): bypass the 60s catalog TTL during sharded
    // breadth (excludeIds non-empty). Otherwise parallel shards read a stale
    // catalog and select OVERLAPPING windows despite excludeIds, defeating the
    // breadth diversity the sharding exists to produce.
    if (!bypassCache) {
        const cached = _CATALOG_CACHE.get(cacheKey);
        if (cached && Date.now() - cached.ts < _CATALOG_TTL_MS) return cached.records;
    }
    try {
        // 2026-06-08 PATH UNIFICATION (Layer 4): tier-1 = engagement-scoped chunks
        // (the run's freshly-collected, now engagement-tagged corpus). include_pages=true
        // so title+relevance pre-ranking works; types scoped to the two the theme/persona
        // pipelines consume. This is what fresh runs now resolve through, the SAME clean-
        // chunk path cached runs use - no more raw-blob fallback.
        const url = `${PROXY_BASE}/api/manifest/chunks?engagement=${encodeURIComponent(engagementSlug)}&types=${encodeURIComponent('social-post,article,upload,insight')}&include_pages=true`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        let ids: string[] = Array.isArray(data?.chunk_ids) ? data.chunk_ids : [];
        let pages: Record<string, { key_terms: string[]; relevance: number; title?: string }> =
            (data && typeof data.pages === 'object' && data.pages) ? data.pages : {};
        if (ids.length) console.log(`[chunkRetrieval] engagement-scoped catalog for "${engagementSlug}": ${ids.length} chunk pointers, ${Object.keys(pages).length} pages`);
        // tier-2 = the COMMITTED KL selection (cached corpus the user explicitly chose).
        // UNION it onto tier-1 so the three modes collapse to one path:
        //   fresh-only  -> selection empty  -> tier-1 chunks only
        //   cached-only -> tier-1 empty     -> selection chunks only
        //   BLEND       -> both, deduped    -> this run's fresh corpus + chosen cached corpus
        // _fetchSelectionCatalogIds already returns empty for an _uncommitted (dormant)
        // selection, honoring the no-auto-arm rule, so a fresh page load never injects it.
        const sel = await _fetchSelectionCatalogIds(_obj);
        // 2026-06-16 - the user's COMMITTED KL selection. These chunk ids TRUMP
        // auto-ranking: tagged userSelected on the record below so they are never
        // dropped by the keyword gates and rank above non-selected chunks.
        const _userSelectedIds = new Set<string>(sel.ids || []);
        if (sel.ids.length) {
            const have = new Set(ids);
            let added = 0;
            for (const id of sel.ids) { if (!have.has(id)) { ids.push(id); have.add(id); added++; } }
            // tier-1 (engagement) page metadata wins on key collision; sel fills the rest.
            pages = { ...sel.pages, ...pages };
            console.log(`[chunkRetrieval] unioned KL-selection catalog: +${added} new chunk pointers (total ${ids.length}, ${Object.keys(pages).length} pages)`);
        }
        // 2026-06-15 - tier-1.5 OBJECTIVE-RANKED admission. Engagement-slug tagging
        // is a crude proxy; the real selector is RELEVANCE TO THE RESEARCH OBJECTIVE.
        // Rank the WHOLE chunk store by semantic similarity to the goal (goal-blended
        // cosine via the proven fetch-articles engine) and UNION the top manifest-TIED
        // pointers. This is the fix for engagement-slug starvation (tier-1 alone
        // returned 1 page): untagged-but-on-objective corpus is admitted by relevance,
        // with engagement-tagged chunks BOOSTED (x1.15) not gated. The server validates
        // every pointer against the manifest (chunk_count), so grounding stays
        // frontmatter-tied - resolveChunks dereferences spans; raw store text never
        // enters the prompt (anti-RAG: feedback_deliverables_manifest_wiki_not_rag).
        // W6 (2026-07-01): track which pointers were admitted by a CROSS-ENGAGEMENT tier (tier-1.5 /
        // tier-3) so pickChunksForPrompt can hold them to a stricter bar (no zero-overlap backfill).
        const _offEngagementIds = new Set<string>();
        if (_obj) {
            try {
                const goalUrl = `${PROXY_BASE}/api/manifest/chunks-by-goal?goal=${encodeURIComponent(_obj)}&engagement=${encodeURIComponent(engagementSlug)}&types=${encodeURIComponent('social-post,article,upload,insight')}&limit=600`;
                const gResp = await fetch(goalUrl);
                if (gResp.ok) {
                    const gData = await gResp.json();
                    const gIds: string[] = Array.isArray(gData?.chunk_ids) ? gData.chunk_ids : [];
                    const gPages = (gData && typeof gData.pages === 'object' && gData.pages) ? gData.pages : {};
                    if (gIds.length) {
                        const have = new Set(ids);
                        let added = 0;
                        for (const id of gIds) { if (!have.has(id)) { ids.push(id); have.add(id); _offEngagementIds.add(id); added++; } }
                        // tier-1 (engagement) + tier-2 (KL) page metadata WINS on collision;
                        // objective-ranked pages fill the rest of the candidate pool.
                        pages = { ...gPages, ...pages };
                        console.log(`[chunkRetrieval] OBJECTIVE-RANKED admission: +${added} on-objective chunk pointers (manifest-tied, relevance to research goal; total ${ids.length}, ${Object.keys(pages).length} pages)`);
                    }
                }
            } catch (e: any) {
                console.warn('[chunkRetrieval] objective-ranked admission skipped (non-fatal):', e?.message || e);
            }
        }
        // 2026-06-12 - tier-3 WHOLE-WIKI fallback. When tier-1 (engagement-
        // tagged records) AND tier-2 (committed KL selection) are both empty -
        // e.g. a restored session whose slug matches no manifest record and no
        // KL selection armed this session - the old behavior returned [] and
        // the chat silently degraded to bulk-RAG injection (the exact anti-
        // pattern the manifest engine exists to kill: standing rule
        // feedback_deliverables_manifest_wiki_not_rag). Instead, read the
        // WHOLE-WIKI catalog (engagement="" is an explicitly supported query;
        // the 2026-06-08 include_pages work was added for this case) and let
        // pickChunksForPrompt's key-term pre-rank + MMR token budget select
        // the on-goal slice. Grounding stays manifest-pointer-based with
        // verbatim chunk citations; bulk-RAG never carries a deliverable.
        if (ids.length === 0) {
            const wholeUrl = `${PROXY_BASE}/api/manifest/chunks?engagement=&types=${encodeURIComponent('social-post,article,upload,insight')}&include_pages=true`;
            const wResp = await fetch(wholeUrl);
            if (wResp.ok) {
                const wData = await wResp.json();
                ids = Array.isArray(wData?.chunk_ids) ? wData.chunk_ids : [];
                pages = (wData && typeof wData.pages === 'object' && wData.pages) ? wData.pages : {};
                for (const id of ids) _offEngagementIds.add(id);   // W6: whole-wiki fallback = all cross-engagement
                console.warn(`[chunkRetrieval] tier-1 (engagement "${engagementSlug}") + tier-2 (KL selection) catalogs EMPTY - tier-3 WHOLE-WIKI manifest fallback: ${ids.length} chunk pointers, ${Object.keys(pages).length} pages (pre-rank narrows to the on-goal slice; grounding stays manifest-based, never bulk RAG)`);
            }
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
                userSelected: _userSelectedIds.has(id),
                offEngagement: _offEngagementIds.has(id) && !_userSelectedIds.has(id),
            };
        });
        _CATALOG_CACHE.set(cacheKey, { ts: Date.now(), records });
        // 2026-06-11 - feed the render-time pointer resolver so [path.md#cN]
        // citations the model emits can resolve to NAMED sources on every
        // surface (chat prose, slide JSON, exports). Raw pointers leaking into
        // rendered artifacts was the 2026-06-11 #journey failure.
        try {
            const { registerPointerSource } = await import('./citationPointerRegistry');
            for (const [src, pm] of Object.entries(pages)) {
                if (pm && pm.title) registerPointerSource(src, pm.title);
            }
        } catch { /* non-blocking */ }
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
    /** 2026-06-15 - the RESEARCH OBJECTIVE (engagement goal) text. Drives the
     *  tier-1.5 objective-ranked admission: the whole chunk store is ranked by
     *  semantic similarity to this objective and the top manifest-tied pointers
     *  are unioned into the candidate pool, so untagged-but-on-objective corpus
     *  is admitted by relevance rather than excluded by a missing engagement slug.
     *  Falls back to extraContext when omitted. */
    researchObjective?: string;
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
    /** 2026-06-08 PHASE 2 (broader retrieval). When the strict pass under-delivers
     *  (breadth-floor violation), the caller re-runs with broaden=true: zero-overlap
     *  chunks are NOT dropped but kept as relevance-ranked backfill below the matched
     *  set, so the breadth window widens to adjacent evidence (and more shards become
     *  available) instead of re-prompting the same narrow chunk set. Strict-first,
     *  broaden-on-need preserves precision on the first pass and trades it for recall
     *  only when the floor is missed - meeting the floor via UPSTREAM retrieval, not
     *  by manufacturing themes from the same chunks. */
    broaden?: boolean;
    /** 2026-06-25 - skip the by-name (named-document) admission tier. Off by
     *  default; sharded breadth passes set it so each shard's window is purely
     *  relevance-ranked (a named ref only makes sense for the first/whole pass). */
    skipNamedRefs?: boolean;
    /** K1 (2026-08-13, WS-K OpenScholar audit) - skip the LLM rerank of the auto
     *  tier. Rerank is ON by default when the auto pool is large enough; latency-
     *  critical callers (sharded breadth passes) opt out. The proxy endpoint
     *  falls back to identity ordering on any failure, so retrieval never breaks. */
    skipRerank?: boolean;
}

export interface PickedChunks {
    chunkIds: string[];
    /** W6 (2026-07-01): normalized objective-relevance per selected chunk (0-100; pinned=100,
     *  user-selected=95, auto picks scaled by keyword score). Feeds EvidencePointer.objectiveScore. */
    scores?: Record<string, number>;
    droppedZeroScore: number;
    droppedOverBudget: number;
    catalogSize: number;
    tokenBudget: number;
    estimatedTokens: number;
    elapsedMs: number;
    /** 2026-06-25 - documents the user NAMED in the prompt that a by-name lookup
     *  matched to a real manifest page (titles). */
    namedRefsMatched?: string[];
    /** 2026-06-25 - documents the user NAMED that matched NO manifest page. The
     *  honesty floor: the chat must say it could not find these, never fabricate. */
    namedRefsMissing?: string[];
}

/**
 * 2026-06-25 - BY-NAME retrieval. Extract document references a user NAMED in a
 * prompt: quoted phrases ("...", '...', curly quotes) and explicit filename tokens
 * (foo.pdf / notes.docx / transcript.json). These are the handles a user gives when
 * they mean ONE specific document; embedding/objective ranking alone misses them.
 * Returns a deduped, length-bounded list (empty when nothing is named).
 */
export function extractNamedReferences(text: string): string[] {
    if (!text) return [];
    const out = new Set<string>();
    const add = (s?: string) => {
        const v = (s || '').trim().replace(/\s+/g, ' ');
        // require a couple of real words so "ok", "yes", a stray quote don't match
        if (v.length >= 4 && /[a-z]{3,}.*[a-z]{2,}/i.test(v)) out.add(v);
    };
    // straight + curly quotes (double and single)
    const quoteRes = [
        /"([^"]{3,120})"/g,
        /“([^”]{3,120})”/g,
        /'([^']{4,120})'/g,
        /‘([^’]{4,120})’/g,
    ];
    for (const re of quoteRes) {
        for (const m of text.matchAll(re)) add(m[1]);
    }
    // explicit filenames (with or without surrounding quotes)
    for (const m of text.matchAll(/\b([\w][\w .()&-]{2,}\.(?:pdf|docx?|txt|json|csv|vtt|pptx?|md))\b/gi)) {
        add(m[1]);
    }
    return Array.from(out).slice(0, 4); // cap: at most a few named docs per turn
}

interface NamedRefFetch {
    records: ManifestChunkRecord[];
    matchedTitles: string[];
    missingRefs: string[];
}

/** Fetch manifest chunk pointers for documents the user named, via the proxy
 *  /api/manifest/chunks-by-title fuzzy title match. Records are tagged namedRef so
 *  pickChunksForPrompt lifts them into the never-dropped priority tier. Anti-RAG:
 *  the endpoint returns manifest-tied pointers only; bodies are resolved by span. */
async function _fetchChunksByTitle(refs: string[]): Promise<NamedRefFetch> {
    const records: ManifestChunkRecord[] = [];
    const matchedTitles: string[] = [];
    const missingRefs: string[] = [];
    const seen = new Set<string>();
    for (const ref of refs) {
        try {
            const url = `${PROXY_BASE}/api/manifest/chunks-by-title?q=${encodeURIComponent(ref)}&limit=3`;
            const resp = await fetch(url);
            if (!resp.ok) { missingRefs.push(ref); continue; }
            const data = await resp.json();
            const ids: string[] = Array.isArray(data?.chunk_ids) ? data.chunk_ids : [];
            const pages: Record<string, { key_terms?: string[]; relevance?: number; title?: string }> =
                (data && typeof data.pages === 'object' && data.pages) ? data.pages : {};
            const titles: string[] = Array.isArray(data?.matched_titles) ? data.matched_titles : [];
            if (!ids.length) { missingRefs.push(ref); continue; }
            for (const t of titles) if (t) matchedTitles.push(t);
            for (const id of ids) {
                if (seen.has(id)) continue;
                seen.add(id);
                const [src, frag] = id.split('#');
                const idx = frag && frag.startsWith('c') ? parseInt(frag.slice(1), 10) : 0;
                const pm = pages[src || ''];
                const kt = pm && Array.isArray(pm.key_terms) ? pm.key_terms : [];
                records.push({
                    chunkId: id,
                    sourcePath: src || '',
                    chunkIndex: Number.isFinite(idx) ? idx : 0,
                    sourceKeyTerms: kt.length ? kt : (pm && pm.title ? Array.from(_tokenize(pm.title)) : []),
                    sourceTitle: pm && pm.title ? pm.title : '',
                    sourceSubreddit: '',
                    sourceRelevance: pm ? (pm.relevance || 0) : 0,
                    namedRef: true,
                });
            }
        } catch {
            missingRefs.push(ref);
        }
    }
    return { records, matchedTitles, missingRefs };
}

/**
 * V7 (2026-08-07) - pure cap check for the MMR pack's SOURCE-TYPE BALANCE.
 * True when picking this candidate NOW would push its class share past its cap
 * among AUTO (non-user-selected) picks. Protected chunks never breach (user
 * selections trump auto-ranking). Exported for unit tests; the pack loop is the
 * only production caller. The intent (colleague finding F5): all corpora are
 * prioritized EQUALLY by objective relevance - no source class dominates
 * structurally, and none is ever universally excluded.
 */
export function wouldBreachSourceCaps(
    flags: { social: boolean; upload: boolean; protected: boolean },
    counters: { autoSocial: number; autoUpload: number; autoTotal: number },
    caps: { socialMaxFrac: number; uploadMaxFrac: number },
): boolean {
    if (flags.protected) return false;
    const newTotal = counters.autoTotal + 1;
    if (flags.social && counters.autoSocial + 1 > Math.ceil(caps.socialMaxFrac * newTotal)) return true;
    if (flags.upload && counters.autoUpload + 1 > Math.ceil(caps.uploadMaxFrac * newTotal)) return true;
    return false;
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
    let catalog = await _readManifestCatalog(engagementSlug, _exclude.size > 0, opts.researchObjective || opts.extraContext || '');
    if (_exclude.size > 0) {
        const before = catalog.length;
        catalog = catalog.filter(r => !_exclude.has(r.chunkId));
        if (before !== catalog.length) {
            console.log(`[chunkRetrieval] shard window: excluded ${before - catalog.length} prior-shard chunks; ${catalog.length} remain in catalog`);
        }
    }
    // V4 (2026-08-07, sota-elevation plan): SESSION-CONSTRAINT source exclusion.
    // User directives compiled by sessionConstraints.ts are enforced HERE, before
    // ranking, so an excluded source can never win relevance. Rung-1 enforcement
    // of [S] user-selections-trump-auto-ranking extended to chat directives.
    // The filter also strips excluded chunks from the pinned set: an explicit
    // NEW exclusion outranks an older KL pin (latest user intent wins).
    try {
        const { getSessionConstraints, isSourceExcluded, noteDirectiveEnforcement } = await import('./sessionConstraints');
        const _sc = getSessionConstraints(engagementSlug);
        if (_sc.excludeSources.length || _sc.includeOnly.length) {
            const before = catalog.length;
            catalog = catalog.filter(r => !isSourceExcluded(_sc, {
                title: r.sourceTitle, wikiPath: r.sourcePath, source: r.chunkId,
            }));
            const dropped = before - catalog.length;
            for (const id of Array.from(pinned)) {
                if (isSourceExcluded(_sc, { wikiPath: id, source: id })) pinned.delete(id);
            }
            if (dropped > 0) {
                console.log(`[chunkRetrieval] V4 session constraints: excluded ${dropped} chunk(s) from [${_sc.excludeSources.join('; ')}] before ranking`);
                noteDirectiveEnforcement(engagementSlug, 1);
            }
        }
    } catch { /* constraints module unavailable = pre-V4 behavior */ }
    // 2026-06-25 - BY-NAME admission. When the user named a specific document in
    // the prompt, fuzzy-match it against manifest page titles and merge that doc's
    // chunks into the candidate pool as a never-dropped priority tier (namedRef).
    // This is the fix for "what does <document> say?" returning nothing because the
    // doc lost to embedding/objective ranking. Tracks which named docs matched and
    // which did NOT (the honesty floor - the caller tells the model to say so).
    let namedRefsMatched: string[] = [];
    let namedRefsMissing: string[] = [];
    if (!opts.skipNamedRefs) {
        const refs = extractNamedReferences(userPrompt);
        if (refs.length) {
            const nr = await _fetchChunksByTitle(refs);
            namedRefsMatched = Array.from(new Set(nr.matchedTitles));
            namedRefsMissing = nr.missingRefs;
            if (nr.records.length) {
                // Clone-merge: never mutate the cached catalog array/records.
                const namedIds = new Set(nr.records.map(r => r.chunkId));
                const working = catalog.map(r => namedIds.has(r.chunkId) ? { ...r, namedRef: true } : r);
                const have = new Set(working.map(r => r.chunkId));
                let added = 0;
                for (const rec of nr.records) {
                    if (!have.has(rec.chunkId)) { working.push(rec); have.add(rec.chunkId); added++; }
                }
                catalog = working;
                console.log(`[chunkRetrieval] BY-NAME admission: matched doc(s) [${namedRefsMatched.join(' | ').slice(0, 160)}], +${added} priority chunk(s) merged; missing=${JSON.stringify(namedRefsMissing)}`);
            } else if (namedRefsMissing.length) {
                console.warn(`[chunkRetrieval] BY-NAME: named doc(s) NOT found in manifest: ${JSON.stringify(namedRefsMissing)} (honesty floor will apply)`);
            }
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
            namedRefsMatched,
            namedRefsMissing,
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
        // 2026-06-16 - USER SELECTIONS TRUMP AUTO RANKING: user-selected chunks sort
        // FIRST within both matched and backfill groups, so they claim the (capped)
        // resolve shortlist ahead of non-selected chunks - the auto-ranker can no
        // longer starve the user's committed selection out of the candidate pool.
        const _us = (x: { rec: ManifestChunkRecord }) => ((x.rec.userSelected || x.rec.namedRef) ? 1 : 0);
        const matched = prelim.filter(s => s.overlap > 0)
            .sort((a, b) => (_us(b) - _us(a)) || (b.overlap - a.overlap) || (b.rel - a.rel) || (a.rec.chunkId < b.rec.chunkId ? -1 : 1));
        let picked = matched.slice(0, shortlist);
        if (picked.length < shortlist) {
            const backfill = prelim.filter(s => s.overlap === 0)
                .sort((a, b) => (_us(b) - _us(a)) || (b.rel - a.rel) || (a.rec.chunkId < b.rec.chunkId ? -1 : 1));
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

    // WS-G(traversal, 2026-06-30): CONCEPT-GRAPH SEEDING. The manifest is a concept graph (WS-G-schema
    // added per-chunk `concepts` + `related_chunks`). Here that graph FEEDS retrieval: a chunk that is
    // concept-adjacent (1 hop via related_chunks) to a KEYWORD-MATCHED chunk is admitted even at zero
    // keyword overlap, so on-objective evidence the keyword pass misses (synonyms, adjacent framing) still
    // enters the pool. Ranked-first by keyword (manifest-first), concept-neighbors fill below matches, then
    // MMR refines - the ratified "manifest+objective first, refine after seeding" order. Bounded to 1 hop
    // off matched chunks, so it widens reach without flooding.
    const _conceptNeighbors = new Set<string>();
    {
        const _matched = new Set<string>();
        for (const rec of candidateRecs) {
            const ch = byId.get(rec.chunkId);
            if (!ch) continue;
            for (const t of ch.keyTerms) {
                if (promptKeywords.has(t.toLowerCase())) { _matched.add(ch.id); break; }
            }
        }
        for (const id of _matched) {
            const ch = byId.get(id);
            for (const rid of (ch?.relatedChunks || [])) {
                if (!_matched.has(rid)) _conceptNeighbors.add(rid);
            }
        }
    }

    // Score each resolved chunk on its PRECISE per-chunk key_terms.
    interface Scored {
        chunk: ResolvedChunk;
        score: number;
        charLen: number;
    }
    const scored: Scored[] = [];
    let droppedZeroScore = 0;
    let _userSelectedKept = 0;
    let _conceptAdmitted = 0;
    const _broaden = !!(opts && (opts as any).broaden);
    let _broadenBackfill = 0;
    // WS-G(traversal): concept-adjacency admit score. Positive so the neighbor is admitted + MMR-packed,
    // but < any keyword match (overlap*sentenceCount >= 1) so matched evidence always ranks first.
    const CONCEPT_ADJ_SCORE = 0.5;
    // 2026-06-16 - USER SELECTIONS TRUMP AUTO RANKING (user rule). A user-selected
    // chunk is NEVER dropped for zero keyword overlap and is lifted into a tier
    // ABOVE every non-selected chunk. The tier is FINITE (not Infinity), so the
    // token budget + MMR diversity still apply AMONG selected chunks - and they
    // stay ordered by their OWN request relevance (an #org request surfaces the
    // selected org chunks before the selected off-topic ones). Non-selected
    // (objective-admitted) chunks fill only the budget the selection leaves.
    const USER_SELECTED_TIER = 100000;
    let _droppedNonEvidence = 0;
    for (const rec of candidateRecs) {
        const ch = byId.get(rec.chunkId);
        if (!ch) continue;
        const isPinned = pinned.has(ch.id);
        const isUserSel = !!(rec.userSelected || rec.namedRef);
        // W6 (2026-07-01): NON-EVIDENCE chunks (bot/mod boilerplate, tombstones, stubs) never ground a
        // generation - drop at retrieval, the upstream twin of the ledger's buildEvidenceLedger filter.
        // User-selected/pinned chunks are exempt (user selections trump auto-ranking).
        if (!isPinned && !isUserSel && isNonEvidenceChunk(ch.text)) {
            _droppedNonEvidence++;
            continue;
        }
        let overlap = 0;
        for (const t of ch.keyTerms) {
            if (promptKeywords.has(t.toLowerCase())) overlap++;
        }
        const score = overlap * Math.max(1, ch.sentenceCount);
        if (!isPinned && !isUserSel && score === 0) {
            // WS-G(traversal): concept-graph neighbor of a matched chunk -> admit at a low positive score
            // (below every keyword match) so the concept graph feeds retrieval. Runs in BOTH strict and
            // broaden modes (it is objective-adjacent by construction, not indiscriminate backfill).
            if (_conceptNeighbors.has(ch.id)) {
                scored.push({ chunk: ch, score: CONCEPT_ADJ_SCORE, charLen: ch.text.length });
                _conceptAdmitted++;
                continue;
            }
            // NON-selected zero-overlap. 2026-06-08 PHASE 2 (broader retrieval):
            // strict pass DROPS these (precision); a broaden retry KEEPS them as
            // relevance-ranked backfill so adjacent evidence fills the budget
            // instead of starving the window at the matched set.
            // W6 (2026-07-01): CROSS-ENGAGEMENT chunks are EXCLUDED from zero-overlap backfill.
            // This was the leakage path: tier-1.5/tier-3 admitted the whole store, and broaden
            // backfilled zero-overlap chunks by sourceRelevance - which is relevance to their OWN
            // original engagement, not to THIS objective (how r/waterloo Reddit grounded an
            // asset-management run). Off-engagement evidence must earn admission via keyword
            // match or concept adjacency; the engagement's own corpus keeps the old behavior.
            if (_broaden && !rec.offEngagement) {
                const relScore = Math.max(0.01, Math.min(0.99, (rec.sourceRelevance || 0) / 100));
                scored.push({ chunk: ch, score: relScore, charLen: ch.text.length });
                _broadenBackfill++;
                continue;
            }
            droppedZeroScore++;
            continue;
        }
        let finalScore: number;
        if (isPinned) {
            finalScore = Number.POSITIVE_INFINITY;
        } else if (isUserSel) {
            // zero-overlap selected chunks get a relevance floor (rank last AMONG
            // selected, never dropped); overlap-matched selected chunks keep their
            // score - both lifted above every non-selected chunk by the tier.
            const within = score > 0 ? score : Math.max(0.01, (rec.sourceRelevance || 0) / 100);
            finalScore = USER_SELECTED_TIER + within;
            _userSelectedKept++;
        } else {
            finalScore = score;
        }
        scored.push({ chunk: ch, score: finalScore, charLen: ch.text.length });
    }
    if (_userSelectedKept > 0) {
        console.log(`[chunkRetrieval] USER-SELECTION priority: ${_userSelectedKept} committed-selection chunk(s) lifted above auto-ranked candidates (never dropped; ordered by request relevance within the tier)`);
    }
    if (_broaden && _broadenBackfill > 0) {
        console.log(`[chunkRetrieval] broaden: kept ${_broadenBackfill} zero-overlap chunk(s) as relevance-ranked backfill (was dropped in strict mode)`);
    }
    if (_conceptAdmitted > 0) {
        console.log(`[chunkRetrieval] concept-graph: admitted ${_conceptAdmitted} concept-adjacent chunk(s) (1-hop related_chunks of keyword-matched chunks) that had zero keyword overlap`);
    }
    if (_droppedNonEvidence > 0) {
        console.log(`[chunkRetrieval] non-evidence filter: dropped ${_droppedNonEvidence} bot/boilerplate/tombstone chunk(s) at retrieval (never ground a generation)`);
    }

    // Phase A1 (go-forward plan) - MMR diversity packing. The old pack took pure
    // score-desc, which clusters near-duplicate chunks (root cause H-A: themes
    // collapsed to 10 when the corpus was ~60 near-identical chunks). MMR greedily
    // picks the candidate maximizing  LAMBDA*relevance - (1-LAMBDA)*maxSimToSelected,
    // where similarity is per-chunk key_term Jaccard (CPU-only, no embeddings).
    // Deterministic: candidates are pre-sorted (score desc, shorter, chunkId asc)
    // and ties use strict-greater, so the first in that stable order wins.
    const _scoredCmp = (a: Scored, b: Scored) =>
        (b.score - a.score) || (a.charLen - b.charLen) || (a.chunk.id < b.chunk.id ? -1 : 1);
    scored.sort(_scoredCmp);

    // K1 (2026-08-13, WS-K OpenScholar audit): LLM RERANK of the AUTO tier before MMR.
    // OpenScholar's ablations show a rerank stage between candidate retrieval and
    // generation is load-bearing for correctness + citation F1. The keyword pre-rank
    // measures surface term overlap; the reranker reads chunk CONTENT against the
    // objective. Scope: AUTO-admitted candidates only (pinned/user-selected tiers are
    // authoritative and never reordered); top RERANK_POOL by current score; reranked
    // chunks are lifted to a band ABOVE keyword scores but BELOW the user tier, so
    // content-relevance beats term counting while user intent still beats everything.
    // The proxy endpoint (/api/wiki/rerank, Flash, session-cached, identity fallback)
    // makes this fail-open: any error keeps the deterministic keyword order.
    const RERANK_POOL = 40;
    const RERANK_MIN_AUTO = 12;
    const RERANK_BAND = 1000; // > any overlap*sentenceCount score observed; << USER_SELECTED_TIER
    // Sharded breadth passes (excludeIds) auto-skip: N shards would mean N rerank
    // calls over sliding windows for marginal gain; shard windows stay keyword-ranked.
    if (!opts.skipRerank && !(opts.excludeIds && opts.excludeIds.length > 0)) {
        try {
            const auto = scored.filter(s => Number.isFinite(s.score) && s.score > 0 && s.score < USER_SELECTED_TIER);
            if (auto.length >= RERANK_MIN_AUTO) {
                const pool = auto.slice(0, RERANK_POOL);
                const resp = await fetch(`${PROXY_BASE}/api/wiki/rerank`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        goal: (opts.researchObjective || opts.extraContext || '').slice(0, 800),
                        question: userPrompt.slice(0, 600),
                        candidates: pool.map(s => ({
                            chunk_id: s.chunk.id,
                            text: s.chunk.text.slice(0, 800),
                            source_name: s.chunk.id.split('#')[0],
                        })),
                    }),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    const ranked: Array<{ chunk_id?: string; score?: number }> = Array.isArray(data?.ranked) ? data.ranked : [];
                    const rs = new Map<string, number>();
                    for (const r of ranked) {
                        const id = String(r.chunk_id || '');
                        const sc = Number(r.score);
                        if (id && Number.isFinite(sc)) rs.set(id, Math.max(0, Math.min(1, sc)));
                    }
                    let lifted = 0;
                    for (const s of pool) {
                        const r = rs.get(s.chunk.id);
                        if (r !== undefined) { s.score = RERANK_BAND + r * 100; lifted++; }
                    }
                    if (lifted > 0) {
                        scored.sort(_scoredCmp);
                        console.log(`[chunkRetrieval] K1 rerank: content-reranked ${lifted}/${pool.length} auto candidate(s) (model=${data.model_used || '?'}, cache_hit=${!!data.cache_hit})`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[chunkRetrieval] K1 rerank unavailable - keyword order kept: ${String(e).slice(0, 120)}`);
        }
    }
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
    // 2026-06-18 - SOURCE-TYPE BALANCE (research-run-failure-analysis P0.1). Reddit/social chunks
    // out-mass curated news/article/academic on raw volume, so a pure relevance+MMR pack let one
    // engagement come back ~100% Reddit (themes cited reddit-deep 314x, external 0x). Apply a cap:
    // SOCIAL chunks may fill at most SOCIAL_MAX_FRAC of the AUTO-admitted pool WHILE non-social
    // candidates remain to fill the budget; once non-social is exhausted, social may use the remainder
    // (balance when both source types exist; never starve a genuinely social corpus).
    // 2026-06-29 (user rule, feedback_every_source_real_attribution): 90% social is UNACCEPTABLE
    // UNLESS it is the USER'S OWN selection. So the cap governs the AUTO (non-user-selected) picks
    // ONLY - the denominator excludes protected/user-selected chunks, which are authoritative and
    // NEVER capped or counted against the cap. Auto-social is held to <=40% of auto picks whenever a
    // non-social auto candidate still fits; the user's committed KL selection passes through untouched.
    const SOCIAL_MAX_FRAC = 0.4;
    const _isSocialId = new Set<string>();
    for (const rec of candidateRecs) {
        if (rec.sourceSubreddit || isSocialSource(rec.sourcePath, rec.sourceTitle)) _isSocialId.add(rec.chunkId);
    }
    // V7 (2026-08-07, sota-elevation plan; colleague finding F5 ROOT FIX). The feedback's intent
    // is EQUAL PRIORITIZATION of all corpora by objective relevance - a transcript/upload competes
    // like every other source and never dominates BECAUSE it is an upload. Same mechanism as the
    // social cap above (research-run-failure P0.1 pattern): UPLOAD-class chunks (client uploads,
    // transcripts, cached upload reuse) fill at most UPLOAD_MAX_FRAC of the AUTO-admitted pool
    // WHILE external candidates remain to fill the budget - the retrieval-time twin of the
    // evidence hierarchy's >=60%-external floor. Once externals are exhausted, uploads may use the
    // remainder (an upload-only corpus is never starved). User selections are never capped.
    // The V4 exclusion compiler stays as the EXPLICIT user override on top of this default balance.
    const UPLOAD_MAX_FRAC = 0.4;
    const _isUploadId = new Set<string>();
    for (const rec of candidateRecs) {
        const hay = `${rec.sourcePath || ''} ${rec.sourceTitle || ''}`.toLowerCase();
        if (/upload|transcript/.test(hay)) _isUploadId.add(rec.chunkId);
    }
    let _socialSel = selected.reduce((n, id) => n + (_isSocialId.has(id) ? 1 : 0), 0);  // total social (incl pinned)
    let _autoSocial = 0;   // social picked from the AUTO (non-user-selected) tier
    let _autoUpload = 0;   // upload-class picked from the AUTO tier (V7)
    let _autoTotal = 0;    // total picks from the AUTO tier (the caps' denominator)

    const LAMBDA = 0.7;   // relevance weight; (1-LAMBDA) penalizes redundancy
    const pool = scored
        .filter(s => s.score !== Number.POSITIVE_INFINITY)
        .map(s => ({ s, set: _termSet(s.chunk), norm: 0, taken: false,
            social: _isSocialId.has(s.chunk.id), upload: _isUploadId.has(s.chunk.id),
            prot: s.score >= USER_SELECTED_TIER }));
    const maxScore = pool.reduce((m, p) => Math.max(m, p.s.score), 0) || 1;
    for (const p of pool) p.norm = p.s.score / maxScore;
    while (true) {
        let bestIdx = -1, bestMmr = -Infinity;         // best overall
        let bestOkIdx = -1, bestOkMmr = -Infinity;     // best pick that breaches NO source-type cap
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (p.taken || p.s.charLen > budgetChars) continue;
            let maxSim = 0;
            for (const sel of selectedSets) { const j = _jaccard(p.set, sel); if (j > maxSim) maxSim = j; }
            const mmr = LAMBDA * p.norm - (1 - LAMBDA) * maxSim;
            if (mmr > bestMmr) { bestMmr = mmr; bestIdx = i; }   // strict > -> first in stable order wins ties
            const breaches = wouldBreachSourceCaps(
                { social: p.social, upload: p.upload, protected: p.prot },
                { autoSocial: _autoSocial, autoUpload: _autoUpload, autoTotal: _autoTotal },
                { socialMaxFrac: SOCIAL_MAX_FRAC, uploadMaxFrac: UPLOAD_MAX_FRAC },
            );
            if (!breaches && mmr > bestOkMmr) { bestOkMmr = mmr; bestOkIdx = i; }
        }
        if (bestIdx === -1) break;   // nothing left fits the budget
        // SOURCE-TYPE caps (AUTO tier only; V7 generalizes the social cap to uploads): defer a
        // non-protected pick that would push its class past its cap, in favor of the best candidate
        // that breaches no cap. When EVERY remaining candidate breaches (single-class corpus), the
        // best overall proceeds - balance when classes coexist, never starvation. Protected
        // (user-selected) chunks are never deferred and never counted in the denominator.
        const bestBreaches = wouldBreachSourceCaps(
            { social: pool[bestIdx].social, upload: pool[bestIdx].upload, protected: pool[bestIdx].prot },
            { autoSocial: _autoSocial, autoUpload: _autoUpload, autoTotal: _autoTotal },
            { socialMaxFrac: SOCIAL_MAX_FRAC, uploadMaxFrac: UPLOAD_MAX_FRAC },
        );
        const pickIdx = (bestBreaches && bestOkIdx !== -1) ? bestOkIdx : bestIdx;
        const chosen = pool[pickIdx];
        chosen.taken = true;
        selected.push(chosen.s.chunk.id);
        usedChars += chosen.s.charLen;
        budgetChars -= chosen.s.charLen;
        selectedSets.push(chosen.set);
        if (chosen.social) _socialSel++;
        if (!chosen.prot) {
            _autoTotal++;
            if (chosen.social) _autoSocial++;
            if (chosen.upload) _autoUpload++;
        }
    }
    const droppedOverBudget = pool.filter(p => !p.taken).length;
    const _userSocial = _socialSel - _autoSocial;  // social that came from the user's own selection
    console.log(`[chunkRetrieval] MMR pack: selected ${selected.length} chunks (lambda=${LAMBDA}, ~${Math.round(usedChars / CHARS_PER_TOKEN_ESTIMATE)} tok) from ${pool.length} scored candidates; source-type balance: ${_socialSel} social (${_userSocial} user-selected / ${_autoSocial} auto), ${_autoUpload} auto upload-class / ${_autoTotal} auto picks (caps: social ${Math.round(SOCIAL_MAX_FRAC * 100)}%, upload ${Math.round(UPLOAD_MAX_FRAC * 100)}%; user selections never capped; single-class corpora never starved)`);

    // W6 (2026-07-01): normalized objective-relevance per selected chunk (0-100) so the AIR evidence
    // ledger carries a real objectiveScore per pointer. Pinned=100, user-selected tier=95; auto picks
    // scale by their keyword score relative to the strongest auto candidate.
    const scores: Record<string, number> = {};
    {
        const _byIdScore = new Map<string, number>();
        for (const s of scored) _byIdScore.set(s.chunk.id, s.score);
        let maxPlain = 0;
        for (const s of scored) if (Number.isFinite(s.score) && s.score < USER_SELECTED_TIER && s.score > maxPlain) maxPlain = s.score;
        for (const id of selected) {
            const sc = _byIdScore.get(id);
            if (sc === undefined) { scores[id] = 0; continue; }
            if (!Number.isFinite(sc)) scores[id] = 100;
            else if (sc >= USER_SELECTED_TIER) scores[id] = 95;
            else scores[id] = maxPlain > 0 ? Math.max(1, Math.round((sc / maxPlain) * 90)) : 0;
        }
    }

    return {
        chunkIds: selected,
        scores,
        droppedZeroScore,
        droppedOverBudget,
        catalogSize: catalog.length,
        tokenBudget,
        estimatedTokens: Math.round(usedChars / CHARS_PER_TOKEN_ESTIMATE),
        elapsedMs: Date.now() - t0,
        namedRefsMatched,
        namedRefsMissing,
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
    // WS-A: this is the single chokepoint where resolved chunks become model-facing evidence, so it is the
    // right place to register each chunk's REAL sources for cite-time resolution (synchronous, before the
    // model generates + resolveManifestPointers runs at render).
    try { registerResolvedChunkSources(chunks); } catch { /* non-fatal: page-title fallback still applies */ }
    // 2026-08-21: this is also the moment the runtime knows exactly WHICH spans the
    // model was shown, which is what the deterministic pointer binder needs. Three
    // prompt-level attempts to make the model carry the pointer failed, so the
    // binder computes it from this set instead.
    try { noteGroundingChunks(chunks); } catch { /* non-fatal: the binder degrades to no-op without the set */ }
    const minChars = opts.minChunkChars ?? 0;
    // 2026-08-21: the pointer used to be printed on its own line with the bare
    // instruction "cite by pointer", and three consecutive live runs bound ZERO
    // pointers to their claims (evidence-slot coverage 0% every time). The model
    // was not refusing; it had never been shown what a bound field looks like.
    // deer-flow's output-patterns skill is explicit that examples teach format
    // where descriptions do not, so the copy-ready form now ships with a worked
    // pair.
    const intro = opts.introText ?? [
        'CORPUS (chunk-addressed). Each entry below is a verbatim span from a wiki source page; the pointer in square brackets is its stable chunk id.',
        'HOW TO CITE: append the pointer verbatim, in square brackets, INSIDE the same field whose text draws on the span. Copy the pointer character for character; never invent, shorten, or renumber one.',
        'WORKED EXAMPLE - the span [articles/retail-dive/aa11bb22cc.md#c4] reading "Assistant sessions converted at a higher rate than paid search in Q3" becomes the field value:',
        '  "heading": "Assistant sessions convert better than paid search [articles/retail-dive/aa11bb22cc.md#c4]"',
        'A field with no pointer may state only judgment, never a fact. Do not paraphrase as evidence; quote verbatim from these spans only.',
    ].join('\n');
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
/**
 * 2026-06-12 - THE SHARED MCR GROUNDING HELPER (supercharge 5.1). One entry
 * point for every deliverable engine that needs a manifest-grounded corpus:
 * #recommendations, the HTML directives (#strategy/#brief/#report/...), the
 * artifact engine, narrativeComposer. Replaces per-engine embedding-RAG
 * article-body injection (the documented root cause of hollow deliverables)
 * with the same deterministic pick -> resolve -> assemble path the chat and
 * theme shards use. Returns empty corpus on failure - callers keep their
 * existing fallback, so reliability is strictly added.
 */
export async function buildManifestCorpusForGoal(
    goal: string,
    engagementSlug: string,
    opts?: { tokenBudget?: number; extraContext?: string },
): Promise<{ corpus: string; chunkCount: number; sourcesRead: number; instructions: string; chunks: ResolvedChunk[] }> {
    // Stage-3: also return the RESOLVED CHUNKS so callers can build a real AIR evidence ledger
    // (buildEvidenceLedger) from the exact chunks that grounded the generation.
    const empty = { corpus: '', chunkCount: 0, sourcesRead: 0, instructions: '', chunks: [] as ResolvedChunk[] };
    try {
        const picked = await pickChunksForPrompt(goal, engagementSlug, {
            tokenBudget: opts?.tokenBudget ?? 30_000,
            extraContext: opts?.extraContext || '',
            // the goal IS the research objective for every deliverable engine routed
            // through here - admit on-objective corpus by relevance (tier-1.5).
            researchObjective: goal,
        });
        if (!picked.chunkIds.length) return empty;
        const resolved = await resolveChunks(picked.chunkIds);
        if (!resolved.chunks.length) return empty;
        console.log(`[MCR-helper] grounded "${goal.slice(0, 50)}...": ${resolved.chunks.length} chunks from ${resolved.sourcesRead} pages (catalog=${picked.catalogSize})`);
        // W6: attach the retrieval-time objective score to each chunk so the AIR evidence ledger
        // (buildEvidenceLedger -> EvidencePointer.objectiveScore) carries per-pointer alignment.
        const chunksScored = resolved.chunks.map(c => ({ ...c, retrievalScore: picked.scores?.[c.id] ?? 0 }));
        return {
            corpus: assembleChunkCorpus(chunksScored),
            chunkCount: chunksScored.length,
            sourcesRead: resolved.sourcesRead,
            instructions: chunkCitationInstructions(),
            chunks: chunksScored,
        };
    } catch (e: any) {
        console.warn('[MCR-helper] grounding failed (caller falls back):', e?.message || e);
        return empty;
    }
}

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
                // 2026-06-22 - STABLE single manifest type 'insight' (not
                // insight-<kind>): the manifest type filter is exact-match, so a
                // per-kind type would be excluded from chat retrieval. The
                // specific deliverable kind is preserved in the wikiPath
                // (synthesis/insights/<slug>/<kind>/) and the provenance block.
                // Kept DISTINCT from 'article' so synthesis never masquerades as
                // external evidence in the 60%-external evidence-hierarchy check.
                // Chat admission includes 'insight' (chunkRetrieval types= list).
                kind: 'insight',
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

// ---------------------------------------------------------------------------
// persistDeliverableInsights - UNIVERSAL second-brain loop (Gap C, 2026-06-22)
// ---------------------------------------------------------------------------

/** Pull a plausible item array out of a persisted-deliverable payload,
 *  whatever its envelope shape (array | {themes|personas|recommendations|
 *  items|data: [...]} | first array-valued property). */
function _extractDeliverableItems(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    const named = ['themes', 'personas', 'recommendations', 'recs', 'gaps', 'competitors',
        'features', 'initiatives', 'stages', 'systems', 'items', 'data', 'phases'];
    for (const k of named) {
        const v = (payload as any)[k];
        if (Array.isArray(v) && v.length) return v;
    }
    // Last resort: first array-valued property with object items.
    for (const v of Object.values(payload)) {
        if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v as any[];
    }
    return [];
}

function _slugifyInsightId(s: string): string {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/** Map an item's citations[] / sourceChunks / chunks to a flat string[] of
 *  provenance identifiers (chunk pointers when present, else source ids). */
function _itemSourceChunks(item: any): string[] {
    const out: string[] = [];
    const push = (x: any) => { if (typeof x === 'string' && x.trim()) out.push(x.trim()); };
    const cites = item?.citations ?? item?.sourceChunks ?? item?.chunks ?? item?.sources;
    if (Array.isArray(cites)) {
        for (const c of cites) {
            if (typeof c === 'string') push(c);
            else if (c && typeof c === 'object') push(c.chunkId || c.wikiPath || c.sourceFile || c.url || c.sourceName);
        }
    }
    return Array.from(new Set(out)).slice(0, 24);
}

/** Compose the substantive body of an insight item from whatever
 *  content-bearing fields the deliverable kind uses. */
function _itemText(item: any, title: string): string {
    const parts: string[] = [];
    const seen = new Set<string>();
    const add = (v: any) => {
        if (typeof v === 'string') {
            const s = v.trim();
            if (s && !seen.has(s)) { seen.add(s); parts.push(s); }
        }
    };
    add(title);
    for (const f of ['description', 'summary', 'narrative', 'rationale', 'recommendation',
        'text', 'body', 'detail', 'whatItShows', 'insight', 'so_what', 'soWhat',
        'problem', 'opportunity', 'quote', 'jtbd', 'mindset']) {
        add(item?.[f]);
    }
    return parts.join('\n\n').slice(0, 4000);
}

/**
 * UNIVERSAL second-brain write-back. Given a persisted engagement deliverable
 * (themes, personas, recommendations, gap, competitive, blueprint, journey,
 * ...), write each insight item back to the wiki as its own chunk-addressable
 * page via persistInsightAsChunk, so the manifest grows from synthesis and
 * future runs can cite past insights by pointer (UNIFIED_VISION principle #8).
 *
 * Gap C fix: previously this only fired on the two chat-path deliverables that
 * passed emitDeliverable.insightPersist; the flagship themes path (and most
 * others) persisted engagement JSON but never re-chunked. Calling this from the
 * single writeEngagementDeliverable chokepoint makes the loop UNIVERSAL with no
 * per-call-site wiring. Idempotent: persistInsightAsChunk writes a deterministic
 * path and /api/wiki/write-article content-hash-dedups, so re-persisting the
 * same item is an alias, never a duplicate (no manifest bloat, no code debt).
 *
 * Best-effort + fire-and-forget friendly: never throws into the writer path.
 * Returns the number of insights persisted.
 */
export async function persistDeliverableInsights(
    engagementSlug: string,
    kind: string,
    payload: any,
    model: string,
    researchGoal?: string,
): Promise<number> {
    try {
        if (!engagementSlug || !kind || payload == null) return 0;
        const items = _extractDeliverableItems(payload?.data ?? payload);
        if (!items.length) return 0;
        const singular = String(kind).replace(/s$/, '');  // themes->theme, recs->rec
        let persisted = 0;
        // Cap to keep a pathological payload from fanning out unbounded writes.
        const capped = items.slice(0, 80);
        await Promise.all(capped.map(async (item, i) => {
            if (!item || typeof item !== 'object') return;
            const title = (item.name || item.title || item.headline || item.competitor
                || item.feature || item.persona || item.phase || '').toString().slice(0, 120);
            const text = _itemText(item, title);
            if (!text || text.length < 40) return;   // skip empty / trivial items
            const insightId = _slugifyInsightId(
                item.clusterId || item.id || item.insightId || title || `${singular}-${i}`,
            ) || `${singular}-${i}`;
            const r = await persistInsightAsChunk({
                engagementSlug,
                kind: singular,
                insightId,
                text,
                sourceChunks: _itemSourceChunks(item),
                model: model || '',
                researchGoal,
                title: title || undefined,
            });
            if (r.ok) persisted++;
        }));
        if (persisted > 0) {
            console.info(`[persistDeliverableInsights] ${kind}: wrote ${persisted}/${capped.length} insight(s) to wiki/synthesis/insights/${engagementSlug}/${singular}/ (second-brain loop)`);
        }
        return persisted;
    } catch (e: any) {
        console.warn(`[persistDeliverableInsights] ${kind} failed (non-fatal):`, e?.message || e);
        return 0;
    }
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
