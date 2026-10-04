/**
 * Institution Manifest Loader - Sprint 1 (S1) foundation layer.
 *
 * Produced by S0 + S1: a curated registry of 30 higher-ed institutions,
 * each with stable identifiers (US EIN, Canadian BN, or state-instrumentality
 * flag), current campaign status, 7 authoritative first-party source URLs,
 * YouTube channel bindings, key-people records, and peer-group assignments.
 *
 * Loaded at runtime from /hic-workspace/institution-manifest.json via the
 * same Vite middleware that serves the wiki and skill manifest.
 *
 * IMPORTANT: This module is INERT in S1. It exports types + loaders + a
 * fuzzy resolver, but nothing in App.tsx or the chat/research flow imports
 * it yet. S2 will wire `resolveInstitution()` into the brief parser so that
 * named entities resolve to manifest IDs and the institution's first-party
 * URLs get prepended to the collection set as Tier 0 sources.
 *
 * Singleton cache: the manifest is fetched once per app session and memoized.
 * The artifact is ~72 KB - trivial to hold in memory.
 */

// --- Identifier kinds (polymorphic to cover edge cases in the 30-institution set) ---

export type InstitutionIdentifier =
    | { kind: 'us_501c3'; ein: string; entity_name?: string }
    | { kind: 'cra_t3010'; bn: string; entity_name?: string }
    | { kind: 'state_instrumentality_no_990'; entity_name?: string }
    | { kind: 'ipeds_unitid'; unitid: number };

// --- Campaign status ---

export type CampaignStatus = 'active' | 'recently_closed' | 'between' | 'in_planning';

export interface CampaignPriorRecord {
    name: string;
    goal_usd?: number;
    closed?: string;
}

export interface CampaignRecord {
    status: CampaignStatus;
    name: string | null;
    goal_usd?: number | null;
    launched?: string | null;
    closed?: string | null;
    microsite?: string | null;
    prior_campaign?: CampaignPriorRecord;
}

// --- YouTube channel record ---

export type YouTubeChannelRole =
    | 'main'
    | 'alumni'
    | 'foundation'
    | 'advancement';

export interface YouTubeChannelRecord {
    role: YouTubeChannelRole;
    channel_id: string;           // Stable UC... identifier
    rss_feed: string;             // https://www.youtube.com/feeds/videos.xml?channel_id={UC}
    focus?: string;
}

// --- Key-person record ---

export interface KeyPersonRecord {
    role: string;
    name: string | null;
    linkedin?: string;
    office_url?: string;
    note?: string;
}

// --- Source URL slots (keys vary slightly per institution; all optional) ---

export interface InstitutionSources {
    newsroom?: string;
    newsroom_rss?: string;
    giving?: string;
    alumni_content?: string;
    alumni_content_rss?: string;
    president_office?: string;
    campaign_microsite?: string;
    filing_990_url?: string;
    filing_t3010_url?: string;
    filing_aggregator?: string;
    financial_report?: string | null;
    youtube_channels: YouTubeChannelRecord[];
}

// --- Full institution record ---

export interface InstitutionRecord {
    id: string;                              // lowercased canonical key (e.g. "northeastern")
    name: string;                            // formal name (e.g. "Northeastern University")
    aliases: string[];                       // common short forms, mascots
    identifiers: InstitutionIdentifier[];
    fiscal_year_end: string;                 // "MM-DD" format
    campaign: CampaignRecord;
    sources: InstitutionSources;
    key_people: KeyPersonRecord[];
    peer_group: string[];                    // institution ids of peers
    last_verified: string;                   // ISO date
}

// --- Peer-group reference table ---

export type PeerGroupKey =
    | 'ivy_plus'
    | 'ivy'
    | 'ivy_ext'
    | 'private_high'
    | 'boston_private'
    | 'la_tech'
    | 'public_flagship'
    | 'r1_stem_focused'
    | 'canadian_r1';

export interface InstitutionManifest {
    version: number;
    generated_at: string;
    generator: string;
    total_institutions: number;
    peer_groups: Record<PeerGroupKey, string[]>;
    institutions: InstitutionRecord[];
}

// --- Loader (memoized singleton) ---

let cachedManifest: InstitutionManifest | null = null;
let inflight: Promise<InstitutionManifest | null> | null = null;

/**
 * Load the institution manifest. Cached after the first successful fetch.
 * Returns null if the artifact is missing or unparseable - callers should
 * treat that as "no institutions available" and proceed without prepending
 * Tier 0 sources.
 */
export async function loadInstitutionManifest(): Promise<InstitutionManifest | null> {
    if (cachedManifest) return cachedManifest;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const resp = await fetch('/hic-workspace/institution-manifest.json');
            if (!resp.ok) {
                console.warn(`[InstitutionManifest] fetch failed: HTTP ${resp.status}`);
                return null;
            }
            const data = (await resp.json()) as InstitutionManifest;
            if (!data || !Array.isArray(data.institutions)) {
                console.warn('[InstitutionManifest] malformed manifest - missing institutions array');
                return null;
            }
            cachedManifest = data;
            console.log(`[InstitutionManifest] loaded ${data.total_institutions} institutions`);
            return data;
        } catch (e) {
            console.warn('[InstitutionManifest] load error:', e);
            return null;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

// --- Fuzzy resolver ---

/**
 * Normalize a candidate string for comparison. Lowercases, strips
 * punctuation, collapses whitespace. Robust to the variations that appear
 * in real research briefs ("U-M", "U of M", "UMich", "University of Michigan").
 */
function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Resolve a free-text institution reference to a manifest record.
 *
 * Match strategy (highest to lowest confidence):
 *   1. Exact match against the canonical id.
 *   2. Exact match against normalized name.
 *   3. Exact match against any normalized alias.
 *   4. Substring match: query is a substring of the normalized name, or
 *      any alias is a substring of the query. Tie-breaker: longest alias
 *      wins (more specific match).
 *
 * Returns null if no match is confident enough. Callers should NOT guess
 * - if the parser produces the entity "Boston", matching to "Boston
 * University" would be wrong (could be Boston College). We prefer
 * precision over recall at this layer.
 */
function resolveInstitution(
    query: string,
    manifest: InstitutionManifest,
): InstitutionRecord | null {
    if (!query || !manifest) return null;
    const q = normalize(query);
    if (!q) return null;

    // Tier 1: exact id match
    for (const inst of manifest.institutions) {
        if (inst.id === q.replace(/\s+/g, '_')) return inst;
    }

    // Tier 2: exact name match
    for (const inst of manifest.institutions) {
        if (normalize(inst.name) === q) return inst;
    }

    // Tier 3: exact alias match
    for (const inst of manifest.institutions) {
        for (const alias of inst.aliases) {
            if (normalize(alias) === q) return inst;
        }
    }

    // Tier 4: substring match with specificity tie-break
    let bestMatch: InstitutionRecord | null = null;
    let bestMatchLen = 0;
    for (const inst of manifest.institutions) {
        const candidates = [inst.name, ...inst.aliases];
        for (const c of candidates) {
            const nc = normalize(c);
            if (!nc) continue;
            // Only consider specific enough aliases (4+ chars) to avoid
            // false positives like "UC" matching "University of Cincinnati"
            // when the query is just "UC".
            if (nc.length < 4) continue;
            const matches = q.includes(nc) || (q.length >= 4 && nc.includes(q));
            if (matches && nc.length > bestMatchLen) {
                bestMatch = inst;
                bestMatchLen = nc.length;
            }
        }
    }
    return bestMatch;
}

/**
 * Resolve multiple candidate strings. Useful when a brief parser emits a
 * list of named entities; this returns the set of unique institutions they
 * resolve to. Preserves order of first appearance.
 */
function resolveInstitutions(
    queries: string[],
    manifest: InstitutionManifest,
): InstitutionRecord[] {
    const seen = new Set<string>();
    const out: InstitutionRecord[] = [];
    for (const q of queries) {
        const match = resolveInstitution(q, manifest);
        if (match && !seen.has(match.id)) {
            seen.add(match.id);
            out.push(match);
        }
    }
    return out;
}

/**
 * Expand an institution to its peer group. Used by S2 query fabric for
 * "vs peers" expansion - when a brief says "Northeastern vs its peers",
 * this returns Northeastern plus its boston_private peer set.
 */
function expandWithPeers(
    inst: InstitutionRecord,
    manifest: InstitutionManifest,
): InstitutionRecord[] {
    const ids = new Set<string>([inst.id, ...inst.peer_group]);
    return manifest.institutions.filter((i) => ids.has(i.id));
}

/**
 * Collect all first-party source URLs from an institution record. Used by
 * S2 to prepend Tier 0 sources to the collection set. Returns a flat list
 * of { url, kind } tuples so callers can tag each URL's provenance.
 */
export interface TierZeroSource {
    url: string;
    kind:
        | 'newsroom'
        | 'newsroom_rss'
        | 'giving'
        | 'alumni_content'
        | 'alumni_content_rss'
        | 'president_office'
        | 'campaign_microsite'
        | 'filing_990'
        | 'filing_t3010'
        | 'filing_aggregator'
        | 'financial_report'
        | 'youtube_rss';
    institution_id: string;
    role?: string;
}

export function collectTierZeroSources(inst: InstitutionRecord): TierZeroSource[] {
    const out: TierZeroSource[] = [];
    const s = inst.sources;
    const add = (url: string | null | undefined, kind: TierZeroSource['kind']) => {
        if (url) out.push({ url, kind, institution_id: inst.id });
    };
    add(s.newsroom_rss, 'newsroom_rss');
    add(s.newsroom, 'newsroom');
    add(s.giving, 'giving');
    add(s.alumni_content_rss, 'alumni_content_rss');
    add(s.alumni_content, 'alumni_content');
    add(s.president_office, 'president_office');
    add(s.campaign_microsite, 'campaign_microsite');
    add(s.filing_990_url, 'filing_990');
    add(s.filing_t3010_url, 'filing_t3010');
    add(s.filing_aggregator, 'filing_aggregator');
    add(s.financial_report, 'financial_report');
    for (const yt of s.youtube_channels || []) {
        out.push({
            url: yt.rss_feed,
            kind: 'youtube_rss',
            institution_id: inst.id,
            role: yt.role,
        });
    }
    return out;
}
