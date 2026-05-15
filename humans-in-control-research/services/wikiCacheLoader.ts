/**
 * wikiCacheLoader.ts — 2026-05-14
 *
 * Phase B: surgical cache-hydration helpers for the Knowledge Library
 * selection. Each function is OPT-IN (only fires when the selection
 * contains matching items), FAILS SAFE (returns null/empty on any
 * error so the live pipeline path runs unchanged), and CHATTY (logs
 * cache hits + savings to the console).
 *
 * Currently implemented:
 *   - loadCachedRedditPostsFromWiki(subreddits): reads cached posts
 *     from wiki/social-intelligence/reddit-deep/<sub>/ so the deep-
 *     fetch step can skip the live Reddit API call.
 *
 * Pending (require deliverable persistence to populate first):
 *   - loadCachedDeliverable(slug, kind): once writeEngagementDeliverable
 *     has populated wiki/engagements/<slug>/<kind>.json, hydrate
 *     themes/personas/journey/etc. from cache.
 */

const PROXY_BASE = 'http://localhost:5012';

// =============================================================================
// Reddit-deep cache loader
// =============================================================================

interface CachedRedditPost {
    id?: string;
    title?: string;
    selftext?: string;
    subreddit?: string;
    score?: number;
    num_comments?: number;
    url?: string;
    permalink?: string;
    created_utc?: number;
    author?: string;
    comments?: any[];
    [key: string]: any;
}

async function listSubredditFiles(subreddit: string): Promise<string[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/social-intelligence/reddit-deep/${subreddit}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const files = Array.isArray(data?.files) ? data.files : [];
        return files.filter((f: string) => typeof f === 'string' && f.endsWith('.md'));
    } catch (e) {
        console.warn(`[CacheLoader] listing subreddit ${subreddit} failed:`, e);
        return [];
    }
}

async function readSubredditPost(subreddit: string, file: string): Promise<CachedRedditPost | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/social-intelligence/reddit-deep/${subreddit}/${file}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        if (!raw) return null;
        return parseRedditPostMarkdown(raw, subreddit);
    } catch (e) {
        return null;
    }
}

/**
 * Parse a Reddit-deep markdown file into a post object compatible with the
 * shape produced by the live `reddit_deep` connector. The proxy writes
 * frontmatter (yaml) + markdown body; comments are typically encoded as a
 * sub-list under a "## Comments" heading.
 */
function parseRedditPostMarkdown(text: string, subreddit: string): CachedRedditPost {
    const out: CachedRedditPost = { subreddit };
    if (text.startsWith('---')) {
        const end = text.indexOf('---', 3);
        if (end > 0) {
            const fm = text.slice(3, end);
            fm.split('\n').forEach(line => {
                const colon = line.indexOf(':');
                if (colon <= 0) return;
                const key = line.slice(0, colon).trim();
                let val = line.slice(colon + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                if (key === 'id' || key === 'post_id') out.id = val;
                else if (key === 'title') out.title = val;
                else if (key === 'score') out.score = Number(val) || 0;
                else if (key === 'num_comments') out.num_comments = Number(val) || 0;
                else if (key === 'url') out.url = val;
                else if (key === 'permalink') out.permalink = val;
                else if (key === 'author') out.author = val;
                else if (key === 'created_utc' || key === 'created') out.created_utc = Number(val) || 0;
            });
            // Body after the frontmatter — treat as selftext if it looks like prose,
            // not a structured comments dump. Strip ## headings + comment blocks.
            const body = text.slice(end + 3).trim();
            const beforeComments = body.split(/##\s*Comments?/i)[0] || '';
            out.selftext = beforeComments.trim().slice(0, 6000);
            // Comments: best-effort parse — each comment block typically starts with
            // "### author (score: N)" or similar. We just count them for now; the
            // downstream topic-model and corpus use post + body, not full threads.
            const commentsBlock = body.split(/##\s*Comments?/i)[1] || '';
            const commentCount = (commentsBlock.match(/^[#>\-\*]/gm) || []).length;
            out.comments = new Array(commentCount).fill({}); // shape-only; downstream uses length
        }
    }
    return out;
}

export interface RedditCacheLoadResult {
    posts: CachedRedditPost[];
    subreddits_loaded: string[];
    posts_per_subreddit: Record<string, number>;
    bytes_loaded_estimate: number;
}

// =============================================================================
// Engagement-bundle loader — read ALL persisted deliverables for an engagement
// =============================================================================

export interface CachedEngagementBundle {
    slug: string;
    themes?: any;
    personas?: any;
    journey?: any;
    gap?: any;
    recs?: any;
    competitive?: any;
    blueprint?: any;
    /** Count of deliverables successfully loaded. Zero means the engagement
     *  predates Phase B persistence; caller should fall back to live generation. */
    loaded_count: number;
}

const DELIVERABLE_KINDS = ['themes', 'personas', 'journey', 'gap', 'recs', 'competitive', 'blueprint'] as const;

/**
 * Load every persisted deliverable for an engagement in parallel. Returns
 * { loaded_count } so the caller can decide whether the engagement has
 * anything worth using (zero = legacy engagement, fall back to generation).
 *
 * Reads from wiki/engagements/<slug>/<kind>.json which the Phase B WRITE
 * side populates after each generate*() call in the auto-synthesis chain.
 */
export async function loadEngagementBundle(slug: string): Promise<CachedEngagementBundle> {
    if (!slug) return { slug: '', loaded_count: 0 };
    const t0 = Date.now();
    const results = await Promise.all(DELIVERABLE_KINDS.map(async (kind) => {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/wiki/read/engagements/${slug}/${kind}.json`);
            if (!resp.ok) return { kind, payload: null };
            const data = await resp.json();
            const raw = typeof data === 'string' ? data : (data?.content || '');
            if (!raw) return { kind, payload: null };
            const parsed = JSON.parse(raw);
            // writeEngagementDeliverable wraps as { schema_version, kind, slug, saved_at, data }
            return { kind, payload: parsed?.data ?? parsed };
        } catch (e) {
            return { kind, payload: null };
        }
    }));
    const bundle: CachedEngagementBundle = { slug, loaded_count: 0 };
    results.forEach(({ kind, payload }) => {
        if (payload != null) {
            (bundle as any)[kind] = payload;
            bundle.loaded_count++;
        }
    });
    if (bundle.loaded_count > 0) {
        console.log(`[CacheLoader] engagement bundle ${slug} HIT — ${bundle.loaded_count}/${DELIVERABLE_KINDS.length} deliverables loaded in ${Date.now() - t0}ms.`);
    }
    return bundle;
}

/** Convenience: load multiple engagement bundles in parallel. */
export async function loadEngagementBundles(slugs: string[]): Promise<CachedEngagementBundle[]> {
    return Promise.all(slugs.map(loadEngagementBundle));
}

// =============================================================================
// Cached-corpus assembly — turn library selections into a synthesis-ready
// corpus string so the pipeline can run themes / personas / etc. on cached
// inputs WITHOUT any live data collection.
// =============================================================================

/** Read a source archive markdown body (wiki/sources/<path>.md). */
export async function loadSourceArchiveBody(archivePath: string): Promise<string | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${archivePath}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        return raw || null;
    } catch (e) {
        console.warn(`[CacheLoader] source archive read failed for ${archivePath}:`, e);
        return null;
    }
}

/** Light frontmatter parser — just the fields we need (research_goal + title). */
function readFrontmatterField(text: string, field: string): string | null {
    if (!text || !text.startsWith('---')) return null;
    const end = text.indexOf('---', 3);
    if (end < 0) return null;
    const fm = text.slice(3, end);
    const lines = fm.split('\n');
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx <= 0) continue;
        if (line.slice(0, idx).trim() === field) {
            let val = line.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            return val;
        }
    }
    return null;
}

/** Cheap word-overlap score (Jaccard-ish) for matching legacy archives to engagement goals. */
function scoreGoalSimilarity(a: string, b: string): number {
    const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'these', 'those', 'their', 'identify', 'understand', 'analyze', 'explore', 'develop', 'create', 'build', 'design', 'comprehensive', 'strategy', 'based', 'current', 'new', 'research', 'analysis']);
    const norm = (s: string) => new Set((s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 4 && !STOP.has(t)));
    const A = norm(a);
    const B = norm(b);
    if (A.size === 0 || B.size === 0) return 0;
    let overlap = 0;
    A.forEach(t => { if (B.has(t)) overlap++; });
    return overlap / Math.min(A.size, B.size);
}

/**
 * 2026-05-14 — Resolve an engagement's source archive even when the file
 * doesn't sit at the expected `sources/<slug>.md` path.
 *
 * Legacy engagements were archived under date-prefixed slugs (e.g.
 * `sources/2026-04-21-identify-named-university-case-studies-f.md`) that
 * don't match the engagement directory slug. This helper scans the
 * entire `wiki/sources/` directory and finds the markdown file whose
 * `research_goal` frontmatter field has the highest keyword overlap
 * with the engagement's goal. Returns the matched body + the path so
 * the caller can log the resolution for debugging.
 */
export async function resolveEngagementSourceArchive(engagementSlug: string, engagementGoal: string): Promise<{ body: string; path: string } | null> {
    // Try the expected path first (Phase B engagements live here).
    const directPath = `sources/${engagementSlug}.md`;
    const direct = await loadSourceArchiveBody(directPath);
    if (direct && direct.length > 200) return { body: direct, path: directPath };

    // Fall back: list everything in wiki/sources/ and goal-match.
    try {
        const listResp = await fetch(`${PROXY_BASE}/api/wiki/list/sources`);
        if (!listResp.ok) return null;
        const listData = await listResp.json();
        const files: string[] = Array.isArray(listData?.files) ? listData.files : [];
        const mdFiles = files.filter(f => typeof f === 'string' && f.endsWith('.md'));
        if (mdFiles.length === 0) return null;

        // Read each candidate's frontmatter (cheap — just the first 1KB).
        const candidates: Array<{ path: string; score: number; body: string }> = [];
        for (const file of mdFiles) {
            try {
                const body = await loadSourceArchiveBody(`sources/${file}`);
                if (!body || body.length < 200) continue;
                const goal = readFrontmatterField(body, 'research_goal') || readFrontmatterField(body, 'title') || '';
                const score = scoreGoalSimilarity(engagementGoal, goal);
                if (score > 0) candidates.push({ path: `sources/${file}`, score, body });
            } catch {}
        }

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        if (best.score < 0.20) {
            console.log(`[CacheLoader] best source-archive match for engagement "${engagementSlug}" was ${best.path} (score=${best.score.toFixed(2)}) — too weak, treating as cache miss`);
            return null;
        }
        console.log(`[CacheLoader] resolved engagement "${engagementSlug}" -> ${best.path} via goal-match (score=${best.score.toFixed(2)})`);
        return { body: best.body, path: best.path };
    } catch (e) {
        console.warn(`[CacheLoader] resolveEngagementSourceArchive failed for ${engagementSlug}:`, e);
        return null;
    }
}

/**
 * Load the selected theme clusters from their synthesis JSON files and
 * turn each into a corpus-ready text block: cluster name + summary +
 * top terms + sample post titles. The shape mirrors what the
 * generateThemes() prompt expects to see in the corpus.
 */
export async function loadSynthesisClustersAsCorpus(clusterIds: string[]): Promise<{ text: string; clusterCount: number; filesScanned: number }> {
    if (!Array.isArray(clusterIds) || clusterIds.length === 0) {
        return { text: '', clusterCount: 0, filesScanned: 0 };
    }
    // Cluster IDs look like "topics-tm_<job>_<hash>.json#<index>" — group by file
    const byFile = new Map<string, Set<number>>();
    clusterIds.forEach(id => {
        const [file, indexStr] = id.split('#');
        const idx = Number(indexStr);
        if (!file || !isFinite(idx)) return;
        if (!byFile.has(file)) byFile.set(file, new Set());
        byFile.get(file)!.add(idx);
    });

    const blocks: string[] = [];
    let clusterCount = 0;
    let filesScanned = 0;
    for (const [file, indices] of byFile) {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/${file}`);
            if (!resp.ok) continue;
            const data = await resp.json();
            const raw = typeof data === 'string' ? data : (data?.content || '');
            if (!raw) continue;
            const payload = JSON.parse(raw);
            filesScanned++;
            const topics = Array.isArray(payload?.result?.topics) ? payload.result.topics : [];
            const engagementGoal = payload?.research_goal || '';
            topics.forEach((t: any, i: number) => {
                const tid = t.id ?? i;
                if (!indices.has(tid)) return;
                clusterCount++;
                const lines: string[] = [];
                lines.push(`=== CACHED THEME CLUSTER (${t.sentiment || 'unknown'} sentiment, ${t.post_count || 0} posts) ===`);
                lines.push(`Name: ${t.name || `Topic ${tid}`}`);
                if (t.summary) lines.push(`Summary: ${t.summary}`);
                const terms = Array.isArray(t.top_terms) ? t.top_terms : [];
                if (terms.length > 0) {
                    const cleanTerms = terms.slice(0, 10).map((x: any) => {
                        const s = String(x);
                        const c = s.indexOf(',');
                        return c > 0 ? s.slice(0, c) : s;
                    }).join(', ');
                    lines.push(`Top terms: ${cleanTerms}`);
                }
                // Sample post titles if the synthesis stores them
                const samplePosts = Array.isArray(t.sample_posts) ? t.sample_posts.slice(0, 5)
                    : Array.isArray(t.representative_posts) ? t.representative_posts.slice(0, 5) : [];
                if (samplePosts.length > 0) {
                    lines.push(`Representative posts:`);
                    samplePosts.forEach((p: any) => {
                        const title = typeof p === 'string' ? p : (p?.title || '');
                        if (title) lines.push(`  - ${title}`);
                    });
                }
                if (engagementGoal) lines.push(`(from prior engagement: ${engagementGoal.slice(0, 80)})`);
                blocks.push(lines.join('\n'));
            });
        } catch (e) {
            console.warn(`[CacheLoader] synthesis cluster scan failed for ${file}:`, e);
        }
    }

    if (clusterCount > 0) {
        console.log(`[CacheLoader] theme-cluster corpus assembled — ${clusterCount} clusters from ${filesScanned} synthesis files.`);
    }
    return { text: blocks.join('\n\n'), clusterCount, filesScanned };
}

export interface AssembledCachedCorpus {
    text: string;
    /** How many distinct cached items contributed. */
    itemCount: number;
    /** Total characters (rough corpus size — for cost estimation + UI). */
    chars: number;
    /** Per-axis breakdown for the thinking-stream log. */
    breakdown: {
        engagements: number;
        themeClusters: number;
        sources: number;
        socialPosts: number;
    };
}

/**
 * Assemble a full synthesis-ready corpus from a Library selection. Combines:
 *   - Engagement source archives (read via wiki/sources/<archive>.md)
 *   - Selected theme clusters (from wiki/synthesis/*.json)
 *   - Selected source archives (markdown bodies)
 *   - Selected subreddits (cached reddit-deep posts as prose)
 *
 * Output is a single text blob the GenAISession can ingest as if it were a
 * freshly-collected corpus. Caller is responsible for setting it into state
 * and triggering the synthesis chain.
 *
 * Fails safe — any individual loader error is logged and that section is
 * skipped; the rest of the corpus still assembles.
 */
export async function assembleCachedCorpus(selection: {
    engagementSlugs: string[];
    themeClusterIds: string[];
    sourceArchivePaths: string[];
    socialSubreddits: string[];
}): Promise<AssembledCachedCorpus> {
    const t0 = Date.now();
    const sections: string[] = [];
    let engagementCount = 0;
    let themeClusterCount = 0;
    let sourceCount = 0;
    let socialPostCount = 0;

    // Engagement source archives — each engagement may have a source archive
    // at wiki/sources/<slug>.md that lists every source pulled during that run.
    // Legacy engagements were archived under date-prefixed paths that don't
    // match the slug; resolveEngagementSourceArchive falls back to a goal-
    // overlap scan of wiki/sources/ to find the right file.
    if (selection.engagementSlugs.length > 0) {
        // We don't have the engagement's research_goal in scope here, but the
        // manifest does. Read each engagement's manifest first.
        const engagementSections = await Promise.all(selection.engagementSlugs.map(async (slug) => {
            let goal = slug.replace(/-/g, ' ');
            try {
                const manifestResp = await fetch(`${PROXY_BASE}/api/wiki/read/engagements/${slug}/manifest.json`);
                if (manifestResp.ok) {
                    const data = await manifestResp.json();
                    const raw = typeof data === 'string' ? data : (data?.content || '');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        goal = parsed?.research_goal || goal;
                    }
                }
            } catch {}
            const resolved = await resolveEngagementSourceArchive(slug, goal);
            if (!resolved) return null;
            engagementCount++;
            return `=== CACHED ENGAGEMENT SOURCES (${slug} -> ${resolved.path}) ===\n${resolved.body.slice(0, 80000)}`;
        }));
        engagementSections.filter(Boolean).forEach(s => sections.push(s as string));
    }

    // Standalone source archives
    if (selection.sourceArchivePaths.length > 0) {
        const sourceSections = await Promise.all(selection.sourceArchivePaths.map(async (path) => {
            const body = await loadSourceArchiveBody(path);
            if (!body) return null;
            sourceCount++;
            return `=== CACHED SOURCE ARCHIVE (${path}) ===\n${body.slice(0, 80000)}`;
        }));
        sourceSections.filter(Boolean).forEach(s => sections.push(s as string));
    }

    // Theme clusters
    if (selection.themeClusterIds.length > 0) {
        const themeBlock = await loadSynthesisClustersAsCorpus(selection.themeClusterIds);
        if (themeBlock.text) {
            sections.push(themeBlock.text);
            themeClusterCount = themeBlock.clusterCount;
        }
    }

    // Social — turn cached posts into prose blocks
    if (selection.socialSubreddits.length > 0) {
        const social = await loadCachedRedditPostsFromWiki(selection.socialSubreddits);
        if (social && social.posts.length > 0) {
            socialPostCount = social.posts.length;
            const lines: string[] = [`=== CACHED SOCIAL INTELLIGENCE (${social.posts.length} Reddit posts from ${social.subreddits_loaded.length} subreddit${social.subreddits_loaded.length === 1 ? '' : 's'}) ===`];
            social.posts.slice(0, 200).forEach((p, i) => {
                const sub = p.subreddit || '?';
                const score = typeof p.score === 'number' ? `score=${p.score}` : '';
                const title = (p.title || '').slice(0, 200);
                const body = (p.selftext || '').slice(0, 1500);
                lines.push(`--- post ${i + 1} · r/${sub} · ${score} ---\nTitle: ${title}\n${body ? `Body: ${body}` : ''}`);
            });
            sections.push(lines.join('\n\n'));
        }
    }

    const text = sections.join('\n\n');
    const elapsed = Date.now() - t0;
    const itemCount = engagementCount + themeClusterCount + sourceCount + socialPostCount;
    console.log(`[CacheLoader] assembled cached corpus — ${text.length.toLocaleString()} chars from ${itemCount} items (${engagementCount} engagements, ${themeClusterCount} clusters, ${sourceCount} source archives, ${socialPostCount} social posts) in ${elapsed}ms.`);
    return {
        text,
        itemCount,
        chars: text.length,
        breakdown: {
            engagements: engagementCount,
            themeClusters: themeClusterCount,
            sources: sourceCount,
            socialPosts: socialPostCount,
        },
    };
}

/**
 * Load cached reddit-deep posts for the supplied subreddit slugs. Reads in
 * parallel for speed. Returns null if no subreddits selected; empty result
 * if the cache miss happened across all selections (caller falls back to
 * live fetch).
 */
export async function loadCachedRedditPostsFromWiki(subreddits: string[]): Promise<RedditCacheLoadResult | null> {
    if (!Array.isArray(subreddits) || subreddits.length === 0) return null;
    const t0 = Date.now();
    const perSub = await Promise.all(subreddits.map(async (subreddit) => {
        const files = await listSubredditFiles(subreddit);
        if (files.length === 0) return { subreddit, posts: [] as CachedRedditPost[] };
        // Cap per-subreddit at 50 to mirror the live fetcher's default limit.
        const slice = files.slice(0, 50);
        const posts = await Promise.all(slice.map(f => readSubredditPost(subreddit, f)));
        const cleaned = posts.filter((p): p is CachedRedditPost => p !== null && (!!p.id || !!p.title));
        return { subreddit, posts: cleaned };
    }));

    const allPosts: CachedRedditPost[] = [];
    const postsPerSubreddit: Record<string, number> = {};
    const subredditsLoaded: string[] = [];
    perSub.forEach(({ subreddit, posts }) => {
        if (posts.length === 0) return;
        allPosts.push(...posts);
        postsPerSubreddit[subreddit] = posts.length;
        subredditsLoaded.push(subreddit);
    });

    const bytes = allPosts.reduce((n, p) => n + (p.selftext?.length || 0) + (p.title?.length || 0), 0);
    const elapsed = Date.now() - t0;
    if (allPosts.length > 0) {
        console.log(`[CacheLoader] Reddit-deep cache HIT — ${allPosts.length} posts from ${subredditsLoaded.length} subreddit(s) in ${elapsed}ms (saved a live Reddit deep-fetch call).`);
    } else {
        console.log(`[CacheLoader] Reddit-deep cache MISS for selected subreddits: ${subreddits.join(', ')}`);
    }

    return {
        posts: allPosts,
        subreddits_loaded: subredditsLoaded,
        posts_per_subreddit: postsPerSubreddit,
        bytes_loaded_estimate: bytes,
    };
}
