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
