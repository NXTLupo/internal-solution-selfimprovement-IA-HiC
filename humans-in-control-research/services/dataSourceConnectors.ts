/**
 * Data Source Connectors v2 — Unified proxy-based architecture
 * ALL calls go through research-proxy (port 5012) which handles CORS,
 * rate limits, retries, and connector-type-specific formatting.
 *
 * The proxy exposes:
 *   GET /api/sources — list all registered sources
 *   GET /api/search/{source_id}?q=...&limit=... — search any source
 *   GET /api/multi-search?q=...&sources=id1,id2&limit=... — parallel multi-source
 */

const PROXY = 'http://localhost:5012';

// --- TYPES ---

export interface DataSourceItem {
    id: string;
    title: string;
    content: string;
    url?: string;
    date?: string;
    sourceType: 'news' | 'academic' | 'economic' | 'company' | 'social' | 'web' | 'government' | 'education';
    sourceName: string;
    credibilityTier?: 1 | 2 | 3;
    relevanceScore?: number;
}

export interface DataSourceResult {
    source: string;
    category: string;
    items: DataSourceItem[];
    totalAvailable: number;
    query: string;
    durationMs: number;
}

export interface DataSourceQuery {
    query: string;
    dateRange?: { from: string; to: string };
    limit?: number;
    filters?: Record<string, string>;
}

export interface DataSourceConnector {
    name: string;
    id: string;
    category: string;
    description: string;
    query(params: DataSourceQuery): Promise<DataSourceResult>;
}

// --- CATEGORY TYPE MAP ---
const CATEGORY_SOURCE_TYPE: Record<string, DataSourceItem['sourceType']> = {
    'Higher-Ed News': 'news',
    'News & Media': 'news',
    'Academic Literature': 'academic',
    'Education Data': 'education',
    'Economic Data': 'economic',
    'Government Data': 'government',
    'Open Data Portals': 'government',
    'Tech & Social': 'social',
    'Video': 'social',
    'Web Intelligence': 'web',
};

// --- GENERIC PROXY CONNECTOR FACTORY ---

function createProxyConnector(id: string, name: string, category: string, description: string): DataSourceConnector {
    return {
        name, id, category, description,
        async query(params: DataSourceQuery): Promise<DataSourceResult> {
            const start = Date.now();
            const limit = Math.min(params.limit || 15, 50);
            const url = `${PROXY}/api/search/${id}?q=${encodeURIComponent(params.query)}&limit=${limit}`;

            try {
                const resp = await fetch(url, { signal: AbortSignal.timeout(35000) });
                if (!resp.ok) throw new Error(`Proxy returned ${resp.status}`);
                const data = await resp.json();

                const sourceType = CATEGORY_SOURCE_TYPE[category] || 'web';
                const tier = data.credibilityTier || 3;
                const items: DataSourceItem[] = (data.items || []).map((item: any, i: number) => ({
                    id: `${id}_${i}`,
                    title: item.title || '',
                    content: item.content || '',
                    url: item.url || undefined,
                    date: item.date || undefined,
                    sourceType,
                    sourceName: name,
                    credibilityTier: tier,
                }));

                return {
                    source: name, category,
                    items,
                    totalAvailable: data.total || items.length,
                    query: params.query,
                    durationMs: Date.now() - start,
                };
            } catch (e: any) {
                console.warn(`Connector ${id} failed:`, e.message);
                return { source: name, category, items: [], totalAvailable: 0, query: params.query, durationMs: Date.now() - start };
            }
        },
    };
}

// ============================================================
// CONNECTOR INSTANCES — One per registered proxy source
// ============================================================

// --- Higher-Ed News (RSS) ---
export const higherEdDiveConnector = createProxyConnector('higher_ed_dive', 'Higher Ed Dive', 'Higher-Ed News', 'Higher education industry news');
export const insideHigherEdConnector = createProxyConnector('inside_higher_ed', 'Inside Higher Ed', 'Higher-Ed News', 'Higher education news and opinion');
export const edSurgeConnector = createProxyConnector('edsurge', 'EdSurge', 'Higher-Ed News', 'Education technology news');
export const hechingerConnector = createProxyConnector('hechinger', 'Hechinger Report', 'Higher-Ed News', 'Nonprofit education journalism');
export const campusTechConnector = createProxyConnector('campus_tech', 'Campus Technology', 'Higher-Ed News', 'Higher-ed IT and edtech');
export const theConversationConnector = createProxyConnector('the_conversation_edu', 'The Conversation', 'Higher-Ed News', 'Academic commentary on education');
export const openCampusConnector = createProxyConnector('open_campus', 'Open Campus', 'Higher-Ed News', 'Nonprofit higher ed news');

// --- Academic Literature ---
export const openAlexConnector = createProxyConnector('openalex', 'OpenAlex', 'Academic Literature', '250M+ academic papers with citations');
export const semanticScholarConnector = createProxyConnector('semantic_scholar', 'Semantic Scholar', 'Academic Literature', 'Paper search with citation graphs');
export const crossrefConnector = createProxyConnector('crossref', 'Crossref', 'Academic Literature', '150M+ DOI records, bibliographic metadata');
export const doajConnector = createProxyConnector('doaj', 'DOAJ', 'Academic Literature', 'Directory of Open Access Journals');
export const europePmcConnector = createProxyConnector('europe_pmc', 'Europe PMC', 'Academic Literature', 'Biomedical and life sciences literature');
export const coreConnector = createProxyConnector('core_ac', 'CORE', 'Academic Literature', '300M+ open access papers');

// --- Education Data ---
export const collegeScorecardConnector = createProxyConnector('college_scorecard', 'College Scorecard', 'Education Data', 'U.S. postsecondary institution data');
export const ericConnector = createProxyConnector('eric', 'ERIC', 'Education Data', 'Education research index');

// --- Economic Data ---
export const worldBankConnector = createProxyConnector('worldbank', 'World Bank', 'Economic Data', '16,000+ development indicators');
export const fredConnector = createProxyConnector('fred', 'FRED', 'Economic Data', '800K+ economic time series');

// --- Government Data ---
export const usaSpendingConnector = createProxyConnector('usaspending', 'USAspending', 'Government Data', 'Federal spending and awards');
export const federalRegisterConnector = createProxyConnector('federal_register', 'Federal Register', 'Government Data', 'Federal rules and notices');
export const congressConnector = createProxyConnector('congress', 'Congress.gov', 'Government Data', 'Bills, members, committees');
export const secEdgarConnector = createProxyConnector('sec_edgar', 'SEC EDGAR', 'Government Data', 'Company filings and XBRL data');

// --- Open Data Portals ---
export const dataGovConnector = createProxyConnector('data_gov', 'Data.gov', 'Open Data Portals', 'U.S. federal open data catalog');
export const dataGovUkConnector = createProxyConnector('data_gov_uk', 'Data.gov.uk', 'Open Data Portals', 'UK government open data');
export const nycOpenDataConnector = createProxyConnector('nyc_open_data', 'NYC Open Data', 'Open Data Portals', 'New York City datasets');

// --- Tech & Social ---
export const hackerNewsConnector = createProxyConnector('hackernews', 'Hacker News', 'Tech & Social', 'Tech industry discourse');
export const gdeltConnector = createProxyConnector('gdelt', 'GDELT', 'News & Media', 'Global news monitoring, 65+ languages');

// --- Video ---
export const youtubeSearchConnector = createProxyConnector('youtube', 'YouTube Search', 'Video', 'Video search via Invidious');

// --- Web Intelligence ---
export const jinaReaderConnector = createProxyConnector('jina', 'Jina Reader', 'Web Intelligence', 'Extract content from any URL');

// ============================================================
// REGISTRY
// ============================================================

export const ALL_CONNECTORS: DataSourceConnector[] = [
    // News
    gdeltConnector, higherEdDiveConnector, insideHigherEdConnector, edSurgeConnector,
    hechingerConnector, campusTechConnector, theConversationConnector, openCampusConnector,
    // Academic
    openAlexConnector, semanticScholarConnector, crossrefConnector, doajConnector, europePmcConnector, coreConnector,
    // Education
    collegeScorecardConnector, ericConnector,
    // Economic
    worldBankConnector, fredConnector,
    // Government
    usaSpendingConnector, federalRegisterConnector, congressConnector, secEdgarConnector,
    // Open Data
    dataGovConnector, dataGovUkConnector, nycOpenDataConnector,
    // Social/Tech
    hackerNewsConnector,
    // Video
    youtubeSearchConnector,
    // Web
    jinaReaderConnector,
];

export const CONNECTORS_BY_CATEGORY: Record<string, DataSourceConnector[]> = {};
for (const c of ALL_CONNECTORS) {
    if (!CONNECTORS_BY_CATEGORY[c.category]) CONNECTORS_BY_CATEGORY[c.category] = [];
    CONNECTORS_BY_CATEGORY[c.category].push(c);
}

/**
 * Multi-source parallel search via proxy.
 */
export async function multiSearch(query: string, sourceIds: string[], limit: number = 10): Promise<DataSourceResult[]> {
    const url = `${PROXY}/api/multi-search?q=${encodeURIComponent(query)}&sources=${sourceIds.join(',')}&limit=${limit}`;
    try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
        const data = await resp.json();
        return (data.results || []).map((r: any, i: number) => ({
            source: r.source || sourceIds[i],
            category: r.category || '',
            items: (r.items || []).map((item: any, j: number) => ({
                id: `multi_${i}_${j}`,
                title: item.title || '',
                content: item.content || '',
                url: item.url,
                date: item.date,
                sourceType: 'web' as const,
                sourceName: r.source || '',
            })),
            totalAvailable: r.total || 0,
            query,
            durationMs: 0,
        }));
    } catch (e) {
        console.error('Multi-search failed:', e);
        return [];
    }
}

export async function checkProxyHealth(): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY}/health`, { signal: AbortSignal.timeout(3000) });
        return resp.ok;
    } catch {
        return false;
    }
}
