/**
 * YouTube Channel Registry - lens-aware selection of high-signal channels.
 *
 * Previously the YouTube pipeline hardcoded 5 AI-focused channels
 * (yt_lex_fridman, yt_yannic_kilcher, yt_two_minute_papers, yt_ai_explained,
 * yt_sentdex) regardless of the research topic. On a university-advancement
 * brief these returned zero relevant content. The user audit called this out:
 * "I selected YouTube - why didn't it analyze videos?" because the lens was
 * fundraising, not AI.
 *
 * This registry:
 *   1. Loads the 100-channel manifest at /hic-workspace/youtube-channels.json
 *      (populated by the scheduler-side resolver, contains institution,
 *      focus, role, channel_id, primary+fallback RSS feeds).
 *   2. Provides a static AI-lens channel set (the original 5 connectors).
 *   3. Exposes pickYouTubeChannelIdsForLens(lens, opts) that returns
 *      channel_id strings ranked by fitness for the active lens.
 *
 * The returned channel_ids feed a new proxy endpoint
 * /api/youtube/discover-by-channels that fans out to each channel's RSS,
 * scores videos against the research goal, and returns the top N video URLs
 * ready for Whisper transcription via the existing Video Transcriber path.
 *
 * Non-blocking: manifest load failure falls back to the AI-lens defaults so
 * the pipeline keeps working even if the JSON is missing.
 */

export interface YouTubeChannelEntry {
    idx: number;
    url: string;
    channel_id: string;
    institution: string;
    focus: string;                  // human-readable category ("Alumni engagement", "Institution + giving", ...)
    role: string;                   // 'alumni' | 'institution' | 'foundation' | 'advancement' | 'peer'
    group: string;                  // 'target' | 'peer' | 'aspirant' | 'experiential' | 'vendor'
    rss_feed_primary: string;
    rss_feed_fallback: string;
    uploads_playlist_id: string;
}

export interface YouTubeChannelManifest {
    version: number;
    generated_at: string;
    total_channels: number;
    channels: YouTubeChannelEntry[];
}

export interface PickChannelsOptions {
    limit?: number;                  // max channel_ids to return (default 10)
    prioritizedInstitutions?: string[]; // named institutions to elevate (from brief parser)
    includeGenericAI?: boolean;      // include static AI-lens connectors too (default false)
}

/** The five original AI-focused channels, kept for backward compat with
 *  briefs that ARE AI-topic-focused. These map to connector IDs in
 *  dataSourceConnectors.ts. */
const AI_LENS_CHANNEL_SOURCE_IDS = [
    'yt_two_minute_papers',
    'yt_yannic_kilcher',
    'yt_lex_fridman',
    'yt_ai_explained',
    'yt_sentdex',
];

// In-memory cache for the manifest so we don't re-fetch on every lens change.
let _manifestCache: YouTubeChannelManifest | null = null;
let _manifestLoadedAt = 0;
const MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Load the channel manifest via the Vite dev server's /hic-workspace/ route.
 *  Returns null on failure so callers can fall back to AI defaults. */
async function loadYouTubeChannelManifest(): Promise<YouTubeChannelManifest | null> {
    const now = Date.now();
    if (_manifestCache && (now - _manifestLoadedAt) < MANIFEST_CACHE_TTL_MS) {
        return _manifestCache;
    }
    try {
        const resp = await fetch('/hic-workspace/youtube-channels.json', {
            signal: AbortSignal.timeout(6000),
        });
        if (!resp.ok) {
            console.warn(`[YouTubeRegistry] manifest fetch failed: HTTP ${resp.status}`);
            return null;
        }
        const data = await resp.json();
        if (!data || !Array.isArray(data.channels)) {
            console.warn('[YouTubeRegistry] manifest malformed (no channels array)');
            return null;
        }
        _manifestCache = data;
        _manifestLoadedAt = now;
        return data;
    } catch (err: any) {
        console.warn('[YouTubeRegistry] manifest load error:', err?.message || err);
        return null;
    }
}

/**
 * Pick the best channels for the current lens. Returns channel_ids
 * (UC-prefixed YouTube IDs) that the /api/youtube/discover-by-channels
 * endpoint can fan out to via RSS.
 *
 * Lens routing:
 *   - fundraising / advancement / higher-ed → top advancement channels
 *     from the 100-channel manifest, prioritized by role + named institutions
 *   - AI / tech / ml → empty (caller should fall back to AI_LENS_CHANNEL_SOURCE_IDS)
 *   - generic / unknown → top 10 advancement channels anyway (safer default
 *     than 5 AI channels for most enterprise research)
 */
export async function pickYouTubeChannelIdsForLens(
    lens: string | undefined,
    opts: PickChannelsOptions = {},
): Promise<string[]> {
    const limit = opts.limit ?? 10;
    const prioritized = new Set((opts.prioritizedInstitutions || []).map(s => s.toLowerCase()));

    const lensKey = (lens || '').toLowerCase();
    const isAILens = /\b(ai|ml|tech|software|product|startup)\b/.test(lensKey);
    const isFundraisingLens = /\b(fundrais|advancement|donor|alumni|philanthrop|nonprofit|higher[-\s]?ed|universit)\b/.test(lensKey);

    // AI lens: return empty so caller uses static AI connector list
    if (isAILens && !isFundraisingLens) {
        return [];
    }

    const manifest = await loadYouTubeChannelManifest();
    if (!manifest) {
        console.warn('[YouTubeRegistry] no manifest - returning empty channel set');
        return [];
    }

    // Score every channel by fitness: named institution matches get biggest
    // bump; 'advancement' / 'foundation' roles outrank 'institution' /
    // 'alumni' for research-on-fundraising questions.
    const ROLE_SCORE: Record<string, number> = {
        advancement: 3.0,
        foundation: 3.0,
        donor: 2.5,
        alumni: 2.0,
        institution: 1.5,
        peer: 1.0,
    };
    const GROUP_SCORE: Record<string, number> = {
        target: 2.0,
        peer: 1.5,
        aspirant: 1.2,
        experiential: 1.0,
        vendor: 0.8,
    };

    const scored = manifest.channels.map(ch => {
        let score = 0;
        score += ROLE_SCORE[ch.role] ?? 1.0;
        score += GROUP_SCORE[ch.group] ?? 1.0;
        if (prioritized.has((ch.institution || '').toLowerCase())) score += 5.0;
        // Non-target/peer groups demoted slightly for focused briefs
        return { ch, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // Dedup by channel_id (defensive - manifest shouldn't have dupes but belt-and-suspenders)
    const picked: string[] = [];
    const seen = new Set<string>();
    for (const { ch } of scored) {
        if (!ch.channel_id || seen.has(ch.channel_id)) continue;
        seen.add(ch.channel_id);
        picked.push(ch.channel_id);
        if (picked.length >= limit) break;
    }
    console.log(`[YouTubeRegistry] Picked ${picked.length}/${manifest.total_channels} channels for lens="${lens}" (${prioritized.size} prioritized institutions)`);
    return picked;
}

/** Convenience: get full channel entries (not just IDs) for UI display. */
async function pickYouTubeChannelsForLens(
    lens: string | undefined,
    opts: PickChannelsOptions = {},
): Promise<YouTubeChannelEntry[]> {
    const ids = await pickYouTubeChannelIdsForLens(lens, opts);
    if (ids.length === 0) return [];
    const manifest = await loadYouTubeChannelManifest();
    if (!manifest) return [];
    const byId = new Map(manifest.channels.map(c => [c.channel_id, c]));
    return ids.map(id => byId.get(id)).filter((c): c is YouTubeChannelEntry => !!c);
}
