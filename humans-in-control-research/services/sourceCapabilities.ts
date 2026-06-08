/**
 * sourceCapabilities - the loud-failure contract for every data source.
 *
 * Each source declares what it can and cannot honor: date filters, domain
 * exclusion, search semantics, lookback window, rate limits. Consumed by:
 *   - The Research Bibliography (surfaces "can't honor date filter" badges)
 *   - The collection preview UI (Tier 2.5) for honest expectation setting
 *   - The query selector (Tier 2.1) to skip date-filtered queries for
 *     date-unsupported sources
 *   - The coverage scorer to attribute failures correctly
 *
 * Until a source is hand-curated here, it resolves through defaultCapabilityFor()
 * using its type (rss, rest, web_search, reddit, academic_api, etc.). The
 * defaults are conservative: if we're not sure whether a source honors a
 * filter, we say "unsupported" rather than "best-effort" - better to under-
 * promise than to silently degrade the user's brief.
 */

import type { SourceCapabilityManifest } from './evidenceRecord';
import { defaultCapabilityFor } from './evidenceRecord';

// --- TYPE INFERENCE from sourceId ---
// The proxy's source catalog (proxy/app.py) groups sources by type. Until we
// expose those types over an API, we mirror the inference here.

function inferType(sourceId: string): SourceCapabilityManifest['type'] {
    // RSS feeds - trade press, AI news, AI lab blogs, higher-ed news
    const rssPatterns = [
        'higher_ed_dive', 'inside_higher_ed', 'edsurge', 'hechinger', 'campus_tech', 'ecampus',
        'the_conversation', 'pie_news', 'open_campus', 'gdelt',
        'mit_tech_review', 'ieee_spectrum', 'venturebeat', 'techcrunch', 'ars_technica',
        'wired_ai', 'the_verge', 'synced_review', 'marktechpost', 'kdnuggets',
        'the_gradient', 'engadget', 'analytics_vidhya', 'towards_ai', 'ai_alignment_forum',
        'import_ai', 'ml_mastery', 'the_guardian_ai', 'zdnet_ai', 'the_register_ml',
        'openai_blog', 'google_ai_blog', 'deepmind_blog', 'meta_ai_blog', 'microsoft_research',
        'nvidia_dev_blog', 'huggingface_blog', 'anthropic_blog', 'bair_blog', 'apple_ml',
        'amazon_science', 'aws_ml_blog', 'ibm_research', 'salesforce_ai', 'cohere_blog',
        'allen_ai', 'stanford_hai', 'databricks_ai', 'stability_ai', 'mistral_ai',
        'brookings_ai', 'oecd_ai', 'eff_ai', 'ada_lovelace', 'partnership_on_ai',
        'neurips_proc', 'acl_anthology',
    ];
    if (rssPatterns.some(p => sourceId.startsWith(p) || sourceId === p)) return 'rss';

    // Reddit - both CX mesh and AI communities
    if (sourceId.startsWith('reddit') || sourceId.startsWith('r_')) return 'reddit';

    // Academic APIs
    if (['openalex', 'semantic_scholar', 'crossref', 'doaj', 'europe_pmc', 'core_ac', 'datacite', 'zenodo', 'eric', 'openreview', 'dblp'].includes(sourceId)) return 'academic_api';
    if (sourceId.startsWith('arxiv_')) return 'academic_api';

    // Government / open-data APIs
    if (['college_scorecard', 'usaspending', 'federal_register', 'sec_edgar', 'congress', 'nist_ai',
         'worldbank', 'fred', 'bls', 'imf_data', 'oecd_data',
         'data_gov', 'data_gov_uk', 'nyc_open_data', 'california_data', 'chicago_data',
         'data_gov_au', 'data_gov_ca', 'eu_data_portal', 'la_open_data', 'sf_open_data', 'texas_open_data'].includes(sourceId)) return 'gov_api';

    // YouTube
    if (sourceId.startsWith('youtube') || sourceId.startsWith('yt_')) return 'youtube';

    // Web extract (Jina Reader for named URLs)
    if (sourceId.includes('jina') || sourceId === 'web_extract') return 'web_extract';

    // Web search - Jina search scoped to a domain
    if (['university_world_news'].includes(sourceId)) return 'web_search';
    if (sourceId.startsWith('openai_research') || sourceId.includes('_research') && !sourceId.startsWith('arxiv_') && !sourceId.includes('ai_research')) return 'web_search';

    // Hacker News, HuggingFace, GitHub - REST APIs
    if (['hackernews', 'hf_models', 'hf_datasets', 'openml', 'kaggle_datasets', 'paperswithcode',
         'github_repos', 'github_trending', 'stackoverflow_ai'].includes(sourceId)) return 'rest';

    // Default fallback
    return 'rest';
}

// --- HAND-CURATED CAPABILITY MANIFESTS ---
// Key sources that the UI should show with maximum accuracy. Add to this list
// as we validate each connector's real behavior. Anything not here resolves
// through the default-for-type function below.

const CURATED: Record<string, SourceCapabilityManifest> = {
    'higher_ed_dive': {
        sourceId: 'higher_ed_dive',
        type: 'rss',
        searchMode: 'keyword-match',
        maxLookback: '~30-entries',
        dateFilter: 'unsupported',
        domainExclude: 'unsupported',
        rateLimit: {},
        description: 'Higher-ed trade news via RSS feed. Only the ~30 most-recent articles are visible at any time.',
        knownLimitations: [
            'RSS window limits visibility to last ~30 items (roughly 3-7 days of coverage)',
            'Date filter cannot be honored upstream - use fallback web search for older content',
            'Keyword matching only - no semantic search',
        ],
    },
    'inside_higher_ed': {
        sourceId: 'inside_higher_ed',
        type: 'rss',
        searchMode: 'keyword-match',
        maxLookback: '~30-entries',
        dateFilter: 'unsupported',
        domainExclude: 'unsupported',
        rateLimit: {},
        description: 'Higher-ed industry analysis via RSS feed. Latest entries only.',
        knownLimitations: ['RSS window', 'No date filter', 'Keyword-only search'],
    },
    'openalex': {
        sourceId: 'openalex',
        type: 'academic_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 100 },
        description: 'Open Alex academic-paper API, 250M+ works indexed. Full-text search with date filtering supported via publication_year.',
        knownLimitations: ['Domain exclusion not supported - filter by venue/publisher via post-processing'],
    },
    'semantic_scholar': {
        sourceId: 'semantic_scholar',
        type: 'academic_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 100 },
        description: 'Semantic Scholar API. Full archive search with year filter. Citation graphs included.',
        knownLimitations: [],
    },
    'gdelt': {
        sourceId: 'gdelt',
        type: 'rest',
        searchMode: 'keyword-match',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'supported',
        rateLimit: { callsPerMinute: 60 },
        description: 'GDELT Global Knowledge Graph. Full global-news index with date and domain filters supported natively.',
        knownLimitations: ['Returns summary-level metadata; full article bodies require separate fetch'],
    },
    'hackernews': {
        sourceId: 'hackernews',
        type: 'rest',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'HN via Algolia search. Full-text match on title + body, date filter via numericFilters.',
        knownLimitations: ['Comments not searched; only submissions'],
    },
    'reddit_cx_mesh': {
        sourceId: 'reddit_cx_mesh',
        type: 'reddit',
        searchMode: 'keyword-match',
        maxLookback: '~year',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 30 },
        description: 'Reddit search scoped to a named subreddit. Time filter via t=year|month|week|day.',
        knownLimitations: [
            'Subreddits the brief names are always queried; AI-discovered subreddits now cap at 20 (was 6)',
            'Comments not searched in bulk - only post titles and self-text',
        ],
    },
    'college_scorecard': {
        sourceId: 'college_scorecard',
        type: 'gov_api',
        searchMode: 'keyword-match',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'US Dept of Education College Scorecard. Institutional data with full archive access.',
        knownLimitations: ['Returns tabular data, not narrative content'],
    },
    'federal_register': {
        sourceId: 'federal_register',
        type: 'gov_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'US Federal Register. Full-text search of federal rules, notices, executive orders with date ranges.',
        knownLimitations: [],
    },
    'sec_edgar': {
        sourceId: 'sec_edgar',
        type: 'gov_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 30 },
        description: 'SEC EDGAR filings. Public company disclosures, 10-Ks, 10-Qs, proxies, 8-Ks.',
        knownLimitations: ['Private-company data not available'],
    },
    'worldbank': {
        sourceId: 'worldbank',
        type: 'gov_api',
        searchMode: 'keyword-match',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'World Bank Open Data - 16K economic indicators across 200+ countries.',
        knownLimitations: ['Returns numeric time series, not narrative analysis'],
    },
    'fred': {
        sourceId: 'fred',
        type: 'gov_api',
        searchMode: 'keyword-match',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'Federal Reserve Economic Data - 800K US economic time series.',
        knownLimitations: ['Numeric data only'],
    },
    'crossref': {
        sourceId: 'crossref',
        type: 'academic_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'supported',
        rateLimit: { callsPerMinute: 50 },
        description: 'Crossref DOI registry - 150M+ scholarly records with full metadata.',
        knownLimitations: [],
    },
    'eric': {
        sourceId: 'eric',
        type: 'academic_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 60 },
        description: 'ERIC - Institute of Education Sciences. 1.9M education research records.',
        knownLimitations: ['Education-specific; won\'t cover general industry'],
    },
    'arxiv_cs_ai': {
        sourceId: 'arxiv_cs_ai',
        type: 'academic_api',
        searchMode: 'fulltext',
        maxLookback: 'full-archive',
        dateFilter: 'supported',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 30 },
        description: 'arXiv cs.AI category - AI research preprints.',
        knownLimitations: ['Preprints - not peer-reviewed; rapid recency is a feature not a bug'],
    },
    'youtube': {
        sourceId: 'youtube',
        type: 'youtube',
        searchMode: 'keyword-match',
        maxLookback: 'full-archive',
        dateFilter: 'best-effort',
        domainExclude: 'unsupported',
        rateLimit: { callsPerMinute: 10 },
        description: 'YouTube search via Invidious. Video content - transcribe for full analysis.',
        knownLimitations: ['Captions may be auto-generated and low-quality', 'Rate limit stricter than other sources'],
    },
    'web_extract': {
        sourceId: 'web_extract',
        type: 'web_extract',
        searchMode: 'latest-only',
        maxLookback: 'latest-only',
        dateFilter: 'unsupported',
        domainExclude: 'supported',
        rateLimit: { callsPerMinute: 10 },
        description: 'Jina Reader - fetches and readabilifies a specific URL. Only returns current page state.',
        knownLimitations: ['Point-in-time extraction only', 'Some sites block Jina', 'No historical versions'],
    },
};

// --- PUBLIC API ---

/**
 * Get the capability manifest for a given sourceId.
 * Returns hand-curated entries first, then falls back to type-inferred defaults.
 */
export function getSourceCapability(sourceId: string): SourceCapabilityManifest {
    if (CURATED[sourceId]) return CURATED[sourceId];
    const type = inferType(sourceId);
    return defaultCapabilityFor(type, sourceId, prettyNameFor(sourceId));
}

/**
 * Get capabilities for a batch of sources. Useful for preview UI rendering.
 */
export function getCapabilitiesFor(sourceIds: string[]): SourceCapabilityManifest[] {
    return sourceIds.map(getSourceCapability);
}

/**
 * Summarize how many sources in a batch can honor a given filter.
 * Returns `{ supported, bestEffort, unsupported }` counts for each filter type.
 * Feeds the preview UI's honest-expectation display.
 */
export interface FilterCoverage {
    dateFilter: { supported: number; bestEffort: number; unsupported: number };
    domainExclude: { supported: number; postFilter: number; unsupported: number };
    total: number;
}

export function summarizeFilterCoverage(manifests: SourceCapabilityManifest[]): FilterCoverage {
    const out: FilterCoverage = {
        dateFilter: { supported: 0, bestEffort: 0, unsupported: 0 },
        domainExclude: { supported: 0, postFilter: 0, unsupported: 0 },
        total: manifests.length,
    };
    for (const m of manifests) {
        if (m.dateFilter === 'supported') out.dateFilter.supported++;
        else if (m.dateFilter === 'best-effort') out.dateFilter.bestEffort++;
        else out.dateFilter.unsupported++;
        if (m.domainExclude === 'supported') out.domainExclude.supported++;
        else if (m.domainExclude === 'post-filter') out.domainExclude.postFilter++;
        else out.domainExclude.unsupported++;
    }
    return out;
}

// --- HELPERS ---

function prettyNameFor(sourceId: string): string {
    // Quick mapping for a few common ones; UI sourceName is still pulled from
    // liveSourceResults where available. This is a fallback-only prettifier.
    const map: Record<string, string> = {
        'higher_ed_dive': 'Higher Ed Dive',
        'inside_higher_ed': 'Inside Higher Ed',
        'openalex': 'OpenAlex',
        'semantic_scholar': 'Semantic Scholar',
        'hackernews': 'Hacker News',
        'gdelt': 'GDELT',
    };
    if (map[sourceId]) return map[sourceId];
    return sourceId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Map a user-facing filter honor status to a badge label + color.
 * Used by the Research Bibliography to surface source honesty.
 */
export function honorStatusBadge(mode: 'supported' | 'best-effort' | 'post-filter' | 'unsupported'): { label: string; color: string } {
    switch (mode) {
        case 'supported': return { label: 'HONORED', color: '#0CCE6B' };
        case 'best-effort': return { label: 'BEST-EFFORT', color: '#B8B800' };
        case 'post-filter': return { label: 'POST-FILTERED', color: '#00B7C3' };
        default: return { label: 'NOT HONORED', color: '#CC6644' };
    }
}
