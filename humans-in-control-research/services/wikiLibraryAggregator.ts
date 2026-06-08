/**
 * wikiLibraryAggregator.ts - 2026-05-14
 *
 * Walks the wiki via the existing /api/wiki/list and /api/wiki/read proxy
 * endpoints and assembles a structured summary of everything the researcher
 * has previously paid the model to produce. Powers the Knowledge Library
 * panel on the IDLE page so the user can see WHAT'S IN THE WIKI before
 * deciding whether to run fresh research or reuse cached intelligence.
 *
 * Returns one summary object covering all six axes:
 *   - engagements: per-engagement manifest + brief count + prototype count
 *   - themes: cross-engagement theme clusters from wiki/synthesis/topics-tm_*.json
 *   - sources: aggregate source catalog from wiki/sources/*.md frontmatter
 *   - social: Reddit-deep posts per subreddit + sentiment-tagged topic clusters
 *   - articles: jina-reader cached article extracts (just counts + titles)
 *   - uploads: per-engagement client document archive (counts + size)
 *
 * Intentionally lightweight - does NOT read full bodies. Caller decides
 * which items to hydrate based on selection.
 */

import { listEngagementManifests, type EngagementManifest } from './wikiService';

const PROXY_BASE = 'http://127.0.0.1:5012';

// =============================================================================
// Result shapes
// =============================================================================

/** Cleaned term entry. Source data stores 'term,0.221...' as a raw string;
 *  we parse it into { term, score } so the UI can render the term as a pill
 *  and surface the score only on hover/tooltip. */
export interface ThemeTerm {
    term: string;
    score?: number;
}

export interface LibraryThemeCluster {
    id: string;
    /** Stable signature for de-dup: name + sentiment + post_count rounded. */
    signature: string;
    name: string;
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown';
    post_count: number;
    top_terms: ThemeTerm[];
    source_synthesis_path: string;
    source_engagement_goal?: string;
    /** Set when this cluster has been merged with N near-duplicates from other syntheses. */
    duplicate_count?: number;
    completed_at?: string;
}

export interface LibrarySourceCategory {
    name: string;                       // e.g. "Higher Ed Dive", "OpenAlex", "Reddit r/neu"
    engagement_slug: string;            // the engagement that captured it
    engagement_goal?: string;
    item_count: number;
    source_archive_path: string;
    extracted_at?: string;
}

export interface LibrarySocialBucket {
    subreddit: string;                  // without r/ prefix
    post_count: number;
    sample_titles: string[];            // up to 3
    last_fetched?: string;
}

/** 2026-05-14 - Per-source bucket inside the articles/ tree. The wiki has
 *  56+ subdirectories under articles/ (jina-reader, client-uploads,
 *  reddit-deep-r-*, youtube-*, hic-theme-synthesis) and the Knowledge
 *  Library used to count only jina-reader (41 of 1,388). This bucket lets
 *  the UI surface the full breakdown so RAG uploads, deep-research pulls,
 *  and synthesis articles are all visible to the researcher. */
export interface LibraryArticleBucket {
    source: string;             // subfolder name, e.g. "client-uploads", "jina-reader", "reddit-deep-r-neu"
    label: string;              // human label, e.g. "Client uploads (RAG)", "Reddit deep-research: r/neu"
    article_count: number;
    sample_titles: string[];    // up to 3 frontmatter titles
}

export interface LibraryArticleSummary {
    total_articles: number;
    sample_titles: string[];            // up to 6 representative titles or URLs across all buckets
    total_chars_estimated: number;
    /** 2026-05-14 - Per-source breakdown. Empty array on legacy summaries (back-compat). */
    buckets: LibraryArticleBucket[];
}

export interface LibraryUploadGroup {
    engagement_slug: string;
    upload_count: number;
    total_size_kb: number;
}

export interface LibraryEngagementSummary {
    slug: string;
    research_goal: string;
    brand?: 'NXT' | 'NU';
    updated_at: string;
    brief_count: number;
    prototype_count: number;
    cost_usd_total?: number;
}

export interface WikiLibrarySummary {
    generated_at: string;
    engagements: LibraryEngagementSummary[];
    themes: LibraryThemeCluster[];
    sources: LibrarySourceCategory[];
    social: LibrarySocialBucket[];
    articles: LibraryArticleSummary;
    uploads: LibraryUploadGroup[];
    /** Aggregate estimated cost-to-regenerate if the researcher discarded everything. */
    estimated_regeneration_cost_usd: number;
}

// =============================================================================
// Helpers
// =============================================================================

async function listWikiDir(relPath: string): Promise<string[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/${relPath}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const entries = Array.isArray(data?.entries) ? data.entries
            : Array.isArray(data?.files) ? data.files
            : Array.isArray(data) ? data
            : [];
        return entries.map((e: any) => typeof e === 'string' ? e : (e?.name || e?.path || '')).filter(Boolean);
    } catch (e) {
        console.warn(`[WikiLibrary] list failed for ${relPath}:`, e);
        return [];
    }
}

/** 2026-05-14 - Lists SUBDIRECTORIES of a wiki path, not files. The proxy
 *  /api/wiki/list endpoint was extended to return a `dirs` array; this helper
 *  uses it so we can walk dir-of-dirs structures like reddit-deep/<sub>/ or
 *  engagements/<slug>/. */
async function listWikiSubdirs(relPath: string): Promise<string[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/${relPath}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const dirs = Array.isArray(data?.dirs) ? data.dirs : [];
        return dirs.map((d: any) => String(d).replace(/\/$/, '')).filter(Boolean);
    } catch (e) {
        console.warn(`[WikiLibrary] subdir list failed for ${relPath}:`, e);
        return [];
    }
}

async function readWikiJson<T = any>(relPath: string): Promise<T | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${relPath}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch (e) {
        return null;
    }
}

async function readWikiText(relPath: string): Promise<string | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${relPath}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        return raw || null;
    } catch (e) {
        return null;
    }
}

/** Parse simple YAML frontmatter (just the top-level scalars we need - no full YAML parser). */
function parseFrontmatter(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!text || !text.startsWith('---')) return out;
    const end = text.indexOf('---', 3);
    if (end < 0) return out;
    const fm = text.slice(3, end).trim();
    fm.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon <= 0) return;
        const key = line.slice(0, colon).trim();
        let val = line.slice(colon + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    });
    return out;
}

// =============================================================================
// Per-axis collectors
// =============================================================================

async function collectEngagements(): Promise<LibraryEngagementSummary[]> {
    const manifests = await listEngagementManifests();
    return manifests.map((m: EngagementManifest) => ({
        slug: m.slug,
        research_goal: m.research_goal || '(no research goal recorded)',
        brand: m.brand,
        updated_at: m.updated_at || '',
        brief_count: m.cached?.briefs?.count || 0,
        prototype_count: m.cached?.prototypes?.count || 0,
        cost_usd_total: m.cost_usd_total,
    }));
}

/** Parse a raw top_terms entry (either 'term,0.221...' string or [term, score] tuple) into ThemeTerm. */
function parseThemeTerm(raw: any): ThemeTerm {
    if (Array.isArray(raw) && raw.length >= 1) {
        return { term: String(raw[0]).trim(), score: typeof raw[1] === 'number' ? raw[1] : undefined };
    }
    const s = String(raw || '').trim();
    const commaIdx = s.indexOf(',');
    if (commaIdx > 0) {
        const term = s.slice(0, commaIdx).trim();
        const scoreStr = s.slice(commaIdx + 1).trim();
        const score = parseFloat(scoreStr);
        return { term, score: isFinite(score) ? score : undefined };
    }
    return { term: s };
}

async function collectThemes(): Promise<LibraryThemeCluster[]> {
    // 2026-05-23 - P0.3: topic-cache files moved out of wiki/synthesis to
    // sessions/_topic-cache/. Read from the new endpoint which falls through
    // to the legacy location for any files not yet migrated.
    let jsonFiles: string[] = [];
    try {
        const resp = await fetch(`${PROXY_BASE}/api/topic-cache/list`);
        if (resp.ok) {
            const data = await resp.json();
            jsonFiles = (data.files || []).filter((f: string) => f.endsWith('.json'));
        }
    } catch {
        // fallback: legacy synthesis dir
        const files = await listWikiDir('synthesis');
        jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('topics-tm_'));
    }
    const all: LibraryThemeCluster[] = [];
    for (const file of jsonFiles) {
        // Try the new endpoint first; fall through to legacy wiki path for files
        // that haven't been migrated yet.
        let payload: any = null;
        try {
            const resp = await fetch(`${PROXY_BASE}/api/topic-cache/read/${encodeURIComponent(file)}`);
            if (resp.ok) {
                const data = await resp.json();
                try { payload = JSON.parse(data.content); } catch { /* fall through */ }
            }
        } catch { /* fall through */ }
        if (!payload) {
            payload = await readWikiJson<any>(`synthesis/${file}`);
        }
        if (!payload) continue;
        const engagementGoal = payload.research_goal || '';
        const completedAt = payload.completed_at || '';
        const topics = Array.isArray(payload.result?.topics) ? payload.result.topics : [];
        topics.forEach((t: any, i: number) => {
            const name = String(t.name || `Topic ${i + 1}`).trim();
            const sentiment = ['positive', 'neutral', 'negative', 'mixed'].includes(t.sentiment) ? t.sentiment : 'unknown';
            const postCount = Number(t.post_count) || 0;
            // Signature for de-dup: same name + sentiment + post-count bucket
            // (round post_count to nearest 5 so near-duplicates with slightly
            // different counts still collapse).
            const bucket = Math.round(postCount / 5) * 5;
            const signature = `${name.toLowerCase()}|${sentiment}|${bucket}`;
            all.push({
                id: `${file}#${t.id ?? i}`,
                signature,
                name,
                summary: String(t.summary || '').trim(),
                sentiment: sentiment as LibraryThemeCluster['sentiment'],
                post_count: postCount,
                top_terms: Array.isArray(t.top_terms) ? t.top_terms.slice(0, 8).map(parseThemeTerm) : [],
                source_synthesis_path: `synthesis/${file}`,
                source_engagement_goal: engagementGoal,
                completed_at: completedAt,
            });
        });
    }
    // De-duplicate by signature. Keep the FIRST occurrence (already in synthesis-
    // file order); track how many other duplicates exist so the UI can show
    // "appears in N other engagements". Preserves the source_engagement_goal
    // of the first occurrence.
    const seen = new Map<string, LibraryThemeCluster>();
    all.forEach(c => {
        const existing = seen.get(c.signature);
        if (!existing) {
            seen.set(c.signature, { ...c, duplicate_count: 0 });
        } else {
            existing.duplicate_count = (existing.duplicate_count || 0) + 1;
        }
    });
    return Array.from(seen.values()).sort((a, b) => b.post_count - a.post_count);
}

async function collectSources(): Promise<LibrarySourceCategory[]> {
    const files = await listWikiDir('sources');
    const mdFiles = files.filter(f => f.endsWith('.md'));
    const out: LibrarySourceCategory[] = [];
    for (const file of mdFiles) {
        const text = await readWikiText(`sources/${file}`);
        if (!text) continue;
        const fm = parseFrontmatter(text);
        // Each source archive aggregates many categories; we count per archive
        // for the Library overview. The detail view (click-into) can show
        // the per-category breakdown by re-parsing on demand.
        const evidenceCount = Number(fm.evidence_count) || 0;
        const goalSlug = (fm.slug || file.replace(/\.md$/, '')).slice(0, 80);
        out.push({
            name: fm.title || file.replace(/\.md$/, ''),
            engagement_slug: goalSlug,
            engagement_goal: fm.research_goal || fm.title || '',
            item_count: evidenceCount,
            source_archive_path: `sources/${file}`,
            extracted_at: fm.created || fm.extracted_at,
        });
    }
    return out.sort((a, b) => b.item_count - a.item_count);
}

async function collectSocial(): Promise<LibrarySocialBucket[]> {
    // FIXED 2026-05-14: was calling listWikiDir which only returns files;
    // reddit-deep/ contains SUBDIRECTORIES per subreddit, so this returned 0.
    // Now uses listWikiSubdirs which hits the dirs[] field of the proxy.
    const subreddits = await listWikiSubdirs('social-intelligence/reddit-deep');
    const buckets: LibrarySocialBucket[] = [];
    for (const subreddit of subreddits) {
        const posts = await listWikiDir(`social-intelligence/reddit-deep/${subreddit}`);
        const postFiles = posts.filter(p => p.endsWith('.md'));
        // Sample a few titles from frontmatter without reading bodies
        const sampleTitles: string[] = [];
        for (const pf of postFiles.slice(0, 3)) {
            const text = await readWikiText(`social-intelligence/reddit-deep/${subreddit}/${pf}`);
            if (!text) continue;
            const fm = parseFrontmatter(text);
            if (fm.title) sampleTitles.push(fm.title.slice(0, 120));
        }
        buckets.push({
            subreddit,
            post_count: postFiles.length,
            sample_titles: sampleTitles,
        });
    }
    return buckets.sort((a, b) => b.post_count - a.post_count);
}

/** 2026-05-14 - Map a subfolder name to a human-readable label. Falls back
 *  to the raw folder name if no match. Keeps the UI scannable for the 56+
 *  article source buckets without hard-coding every one. */
function labelForArticleSource(folder: string): string {
    if (folder === 'client-uploads') return 'Client uploads (RAG)';
    if (folder === 'jina-reader') return 'Jina Reader extracts';
    if (folder === 'hic-theme-synthesis') return 'HiC theme syntheses';
    if (folder.startsWith('reddit-deep-r-')) return `Reddit deep-research: r/${folder.slice('reddit-deep-r-'.length)}`;
    if (folder.startsWith('reddit-')) return `Reddit: r/${folder.slice('reddit-'.length)}`;
    if (folder.startsWith('youtube-')) return `YouTube: ${folder.slice('youtube-'.length).replace(/-/g, ' ')}`;
    return folder;
}

async function collectArticles(): Promise<LibraryArticleSummary> {
    // 2026-05-14 - Walk EVERY subdirectory under articles/, not just jina-reader.
    // The wiki/articles/ tree has 56+ subdirs (client-uploads with the RAG docs,
    // deep-research pulls, jina extracts, YouTube transcripts, theme syntheses).
    // The previous implementation only counted jina-reader (41) and missed
    // 1,347+ other files including all RAG uploaded documents - the Knowledge
    // Library was effectively invisible to them.
    const subdirs = await listWikiSubdirs('articles');
    const buckets: LibraryArticleBucket[] = [];
    const allSampleTitles: string[] = [];
    let totalArticles = 0;

    for (const folder of subdirs) {
        const files = await listWikiDir(`articles/${folder}`);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        if (mdFiles.length === 0) continue;
        totalArticles += mdFiles.length;

        // Sample up to 3 titles per bucket via frontmatter
        const bucketSamples: string[] = [];
        for (const f of mdFiles.slice(0, 3)) {
            const text = await readWikiText(`articles/${folder}/${f}`);
            if (!text) continue;
            const fm = parseFrontmatter(text);
            const title = fm.title || fm.url || f;
            const clipped = title.length > 120 ? title.slice(0, 117) + '...' : title;
            bucketSamples.push(clipped);
            if (allSampleTitles.length < 6) allSampleTitles.push(clipped);
        }

        buckets.push({
            source: folder,
            label: labelForArticleSource(folder),
            article_count: mdFiles.length,
            sample_titles: bucketSamples,
        });
    }

    // Highest-volume buckets first so the UI surfaces the biggest pools at top
    buckets.sort((a, b) => b.article_count - a.article_count);

    return {
        total_articles: totalArticles,
        sample_titles: allSampleTitles,
        total_chars_estimated: totalArticles * 8000,
        buckets,
    };
}

async function collectUploads(): Promise<LibraryUploadGroup[]> {
    // FIXED 2026-05-14: uploads/ contains per-engagement subdirs; use listWikiSubdirs.
    const slugs = await listWikiSubdirs('uploads');
    const out: LibraryUploadGroup[] = [];
    for (const slug of slugs) {
        const files = await listWikiDir(`uploads/${slug}`);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        out.push({
            engagement_slug: slug,
            upload_count: mdFiles.length,
            total_size_kb: 0,
        });
    }
    return out.sort((a, b) => b.upload_count - a.upload_count);
}

// =============================================================================
// Aggregate + cost estimation
// =============================================================================

/**
 * Estimate the dollar cost of regenerating everything currently in the wiki
 * if the researcher discarded it. Used for the "cost savings preview" banner.
 *
 * Rough pricing model (matches costMeter.ts):
 *   - One engagement's themes (Gemini Pro Pass 1 + 2):              ~$3
 *   - One engagement's deliverables (personas/journey/gap/etc):      ~$5
 *   - One engagement's 5 briefs (hybrid: Opus skeleton + GPT deepen): ~$8
 *   - One prototype build (Gemini stages 2-5):                       ~$25
 *   - One subreddit deep-fetch (Reddit API + scoring):               ~$0.50
 *   - One jina article extract (Jina + embedding):                   ~$0.05
 */
function estimateRegenerationCost(summary: Omit<WikiLibrarySummary, 'estimated_regeneration_cost_usd' | 'generated_at'>): number {
    let total = 0;
    summary.engagements.forEach(e => {
        total += 3;                                 // themes
        total += 5;                                 // deliverables
        total += e.brief_count > 0 ? 8 : 0;         // briefs (if any)
        total += e.prototype_count * 25;            // each prototype
    });
    summary.social.forEach(b => { total += 0.5; });
    total += summary.articles.total_articles * 0.05;
    return total;
}

/**
 * Lightweight count-only aggregator for the landing-page preview tile.
 * Just hits the dir-list endpoints (5 fetches, < 500ms typical) - no body
 * reads, no frontmatter parsing. Used when we only need totals, not detail.
 */
export interface WikiLibraryCounts {
    engagements: number;
    themes: number;
    sources: number;
    social: number;
    articles: number;
    uploads: number;
    /** Most-recent engagements (slug + research goal + brand + updated_at) for the preview strip. */
    recent_engagements: LibraryEngagementSummary[];
    estimated_value_usd: number;
}

export async function getLibraryCounts(): Promise<WikiLibraryCounts> {
    const [
        engagementManifests,
        synthesisFiles,
        sourceFiles,
        socialDirs,
        articleFiles,
        uploadDirs,
    ] = await Promise.all([
        // engagements (already aggregated by wikiService)
        collectEngagements(),
        // 2026-05-23 - P0.3: topic caches moved to sessions/_topic-cache. New
        // /api/topic-cache/list endpoint reads both new and legacy locations.
        (async () => {
            try {
                const resp = await fetch(`${PROXY_BASE}/api/topic-cache/list`);
                if (resp.ok) {
                    const data = await resp.json();
                    return (data.files || []).filter((f: string) => f.endsWith('.json'));
                }
            } catch { /* fall through */ }
            return (await listWikiDir('synthesis')).filter(f => f.endsWith('.json') && f.includes('topics-tm_'));
        })(),
        listWikiDir('sources').then(fs => fs.filter(f => f.endsWith('.md'))),
        // FIXED 2026-05-14: these were calling listWikiDir which only returns
        // files; the data lives in SUBDIRECTORIES (reddit-deep/<sub>/,
        // uploads/<slug>/). Now hits the proxy's dirs[] field directly.
        listWikiSubdirs('social-intelligence/reddit-deep'),
        listWikiDir('articles/jina-reader').then(fs => fs.filter(f => f.endsWith('.md'))),
        listWikiSubdirs('uploads'),
    ]);

    // For "themes" count we want number of theme CLUSTERS across all synthesis
    // files, not file count. But that requires reading each file - for the
    // preview we approximate with "synthesis files × 20" or just show files.
    // We'll use file count as a proxy here; the modal shows exact cluster counts.
    const themesApprox = synthesisFiles.length * 20;

    // Recent engagements: most-recently-updated 3
    const recent = engagementManifests.slice(0, 3);

    // Estimated value: simple recombination of engagement value
    let value = 0;
    engagementManifests.forEach(e => {
        value += 3 + 5;
        value += e.brief_count > 0 ? 8 : 0;
        value += e.prototype_count * 25;
    });
    value += socialDirs.length * 0.5;
    value += articleFiles.length * 0.05;

    return {
        engagements: engagementManifests.length,
        themes: themesApprox,
        sources: sourceFiles.length,
        social: socialDirs.length,
        articles: articleFiles.length,
        uploads: uploadDirs.length,
        recent_engagements: recent,
        estimated_value_usd: value,
    };
}

// =============================================================================
// Goal-aware relevance scoring
// =============================================================================
//
// When the researcher has typed a goal, every Library item (theme, source,
// subreddit, engagement) gets a 0-1 relevance score based on word overlap
// between the goal and the item's identifying text. Items above
// RELEVANCE_HIGH are surfaced as "relevant" in the UI; items above
// RELEVANCE_MED still rank above unscored items but aren't flagged.
//
// Word-overlap is intentionally simple - instant, free, no LLM call. Phase
// B will swap this for semantic-embedding similarity via the existing
// /api/wiki/fetch-articles embedding pipeline.

export const RELEVANCE_HIGH = 0.30;   // chip badge + bumped to top
export const RELEVANCE_MED = 0.12;    // ranks above unscored but no badge

const RELEVANCE_STOP = new Set([
    'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'these',
    'those', 'their', 'which', 'where', 'while', 'within', 'about',
    'across', 'against', 'among', 'around', 'before', 'between',
    'identify', 'understand', 'analyze', 'explore', 'develop', 'create',
    'build', 'design', 'comprehensive', 'strategy', 'based', 'current',
    'new', 'research', 'analysis',
]);

function tokenizeForRelevance(s: string): Set<string> {
    return new Set(
        (s || '').toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length >= 4 && !RELEVANCE_STOP.has(t))
    );
}

/** Generic 0-1 relevance scorer: Jaccard-style word overlap between goal and item text. */
export function scoreItemRelevance(itemText: string, researchGoal: string): number {
    const goal = tokenizeForRelevance(researchGoal);
    const item = tokenizeForRelevance(itemText);
    if (goal.size === 0 || item.size === 0) return 0;
    let overlap = 0;
    goal.forEach(t => { if (item.has(t)) overlap++; });
    // Asymmetric: divide by goal-size so a focused goal can score 1.0
    // when an item covers most of its keywords.
    return overlap / goal.size;
}

export function scoreThemeRelevance(theme: LibraryThemeCluster, goal: string): number {
    const text = `${theme.name} ${theme.summary} ${theme.top_terms.map(t => t.term).join(' ')}`;
    return scoreItemRelevance(text, goal);
}
export function scoreSourceRelevance(source: LibrarySourceCategory, goal: string): number {
    const text = `${source.name} ${source.engagement_goal || ''}`;
    return scoreItemRelevance(text, goal);
}
export function scoreSocialRelevance(social: LibrarySocialBucket, goal: string): number {
    const text = `${social.subreddit} ${social.sample_titles.join(' ')}`;
    return scoreItemRelevance(text, goal);
}
export function scoreEngagementRelevance(eng: LibraryEngagementSummary, goal: string): number {
    return scoreItemRelevance(eng.research_goal, goal);
}

/**
 * Top-level aggregator. Fans out the per-axis collectors in parallel.
 * Total cost: ~30-50 lightweight proxy fetches; typically < 2s.
 */
export async function aggregateWikiLibrary(): Promise<WikiLibrarySummary> {
    const [engagements, themes, sources, social, articles, uploads] = await Promise.all([
        collectEngagements(),
        collectThemes(),
        collectSources(),
        collectSocial(),
        collectArticles(),
        collectUploads(),
    ]);
    const partial = { engagements, themes, sources, social, articles, uploads };
    return {
        generated_at: new Date().toISOString(),
        ...partial,
        estimated_regeneration_cost_usd: estimateRegenerationCost(partial),
    };
}
