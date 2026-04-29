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
    'AI News': 'news',
    'AI Lab Blogs': 'news',
    'AI Research': 'academic',
    'AI Models & Datasets': 'academic',
    'AI Policy': 'news',
    'AI Communities': 'social',
    'AI Code': 'social',
    'AI Conferences': 'academic',
    'AI Communities': 'social',
    'AI Code': 'social',
    // 2026-04-29 — Checkout-fundraising / cause-commerce intelligence pack
    'Cause-Commerce Tech': 'web',
    'Cause-Brand Impact': 'web',
    'Donation Tech Platforms': 'web',
    'Sustainability-at-Checkout': 'web',
    'Philanthropy Press': 'news',
    'Retail News': 'news',
    'Consumer/CSR Research': 'web',
    'Press Wires': 'news',
    'Cause Reddit': 'social',
    // 2026-04-29 — 400-source retail expansion pack
    'Retail Competitive Set': 'news',
    'Home/Furniture Trade': 'news',
    'Retail Tech Vendors': 'web',
    'Payments & Checkout': 'news',
    'Retail Analysts': 'web',
    'Supply Chain': 'news',
    'Specialty Verticals': 'news',
    'International Retail': 'news',
    'Strategy Consultancies': 'web',
    'Retail Deal Intelligence': 'news',
    'Social Listening Pro': 'web',
    'Brand Reddit': 'social',
    'Retail Operator Reddit': 'social',
    'Open Data APIs': 'government',
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

// --- Video Transcriber (custom — POST /api/transcribe-youtube, not search-based) ---
// The research orchestrator pushes sources with config.connector === 'Video Transcriber'
// for every user-supplied YouTube URL. Before this connector existed, those sources
// silently failed with "Unknown connector" — Promise.allSettled swallowed the reject
// and zero transcripts ever reached the corpus. This connector calls the Whisper
// transcription endpoint (which also auto-persists the full transcript to the wiki),
// unwraps the response, and returns a single DataSourceItem with the full transcript
// in `content`. Downstream enrichment leaves it alone (content.length >> 5000).
export const videoTranscriberConnector: DataSourceConnector = {
    id: 'video_transcriber',
    name: 'Video Transcriber',
    category: 'Video',
    description: 'Whisper-based transcription for user-supplied YouTube URLs',
    async query(params: DataSourceQuery): Promise<DataSourceResult> {
        const start = Date.now();
        const url = (params.query || '').trim();
        // Whisper transcription on a 30-60 min video can legitimately take 2-4 min.
        // The proxy chunks 25MB segments; generous ceiling prevents spurious aborts.
        const TRANSCRIBE_TIMEOUT_MS = 6 * 60 * 1000;

        if (!url || !/^https?:\/\//i.test(url)) {
            console.warn(`[Video Transcriber] invalid URL: "${url.substring(0, 80)}"`);
            return { source: 'Video Transcriber', category: 'Video', items: [], totalAvailable: 0, query: url, durationMs: Date.now() - start };
        }

        try {
            const resp = await fetch(`${PROXY}/api/transcribe-youtube`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
                signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
            });
            if (!resp.ok) {
                const err = await resp.text().catch(() => '');
                console.warn(`[Video Transcriber] proxy returned ${resp.status} for ${url.substring(0, 80)}: ${err.substring(0, 200)}`);
                return { source: 'Video Transcriber', category: 'Video', items: [], totalAvailable: 0, query: url, durationMs: Date.now() - start };
            }
            const data = await resp.json();
            const transcript = (data?.content || '').trim();
            if (!transcript || transcript.length < 200) {
                console.warn(`[Video Transcriber] empty/short transcript for ${url.substring(0, 80)} (${transcript.length} chars)`);
                return { source: 'Video Transcriber', category: 'Video', items: [], totalAvailable: 0, query: url, durationMs: Date.now() - start };
            }
            const videoId = data.video_id || '';
            const title = data.title || `YouTube transcript — ${videoId || url.substring(0, 50)}`;
            const uploader = data.uploader || data.channel_id || 'YouTube';
            const item: DataSourceItem = {
                id: `video_transcriber_${videoId || Date.now()}`,
                title,
                content: transcript,
                url,
                date: data.published || undefined,
                sourceType: 'social',
                sourceName: `YouTube: ${uploader}`,
                credibilityTier: 2,
            };
            console.log(`[Video Transcriber] transcribed "${title.substring(0, 60)}" (${transcript.length} chars, wiki: ${data.wikiPath || 'none'})`);
            return {
                source: 'Video Transcriber',
                category: 'Video',
                items: [item],
                totalAvailable: 1,
                query: url,
                durationMs: Date.now() - start,
            };
        } catch (e: any) {
            console.warn(`[Video Transcriber] failed for ${url.substring(0, 80)}:`, e?.message || e);
            return { source: 'Video Transcriber', category: 'Video', items: [], totalAvailable: 0, query: url, durationMs: Date.now() - start };
        }
    },
};

// --- Web Intelligence ---
export const jinaReaderConnector = createProxyConnector('jina', 'Jina Reader', 'Web Intelligence', 'Extract content from any URL');

// --- AI News ---
export const mitTechReviewAiConnector = createProxyConnector('mit_tech_review_ai', 'MIT Tech Review AI', 'AI News', 'MIT Technology Review AI coverage');
export const ieeeSpectrumAiConnector = createProxyConnector('ieee_spectrum_ai', 'IEEE Spectrum AI', 'AI News', 'IEEE Spectrum AI and robotics');
export const ventureBeatAiConnector = createProxyConnector('venturebeat_ai', 'VentureBeat AI', 'AI News', 'VentureBeat AI and ML news');
export const techCrunchAiConnector = createProxyConnector('techcrunch_ai', 'TechCrunch AI', 'AI News', 'TechCrunch AI startup coverage');
export const arsTechnicaAiConnector = createProxyConnector('ars_technica_ai', 'Ars Technica AI', 'AI News', 'Ars Technica AI reporting');
export const wiredAiConnector = createProxyConnector('wired_ai', 'WIRED AI', 'AI News', 'WIRED magazine AI coverage');
export const theVergeAiConnector = createProxyConnector('the_verge_ai', 'The Verge AI', 'AI News', 'The Verge AI and tech news');
export const syncedReviewConnector = createProxyConnector('synced_review', 'Synced Review', 'AI News', 'AI research news and summaries');
export const markTechPostConnector = createProxyConnector('marktechpost', 'MarkTechPost', 'AI News', 'AI research news and tutorials');
export const kdNuggetsConnector = createProxyConnector('kdnuggets', 'KDnuggets', 'AI News', 'Data science and AI news');
export const theGradientConnector = createProxyConnector('the_gradient', 'The Gradient', 'AI News', 'Long-form AI research journalism');

// --- AI Lab Blogs ---
export const openAiBlogConnector = createProxyConnector('openai_blog', 'OpenAI Blog', 'AI Lab Blogs', 'OpenAI research and product updates');
export const googleAiBlogConnector = createProxyConnector('google_ai_blog', 'Google AI Blog', 'AI Lab Blogs', 'Google AI research and announcements');
export const deepMindBlogConnector = createProxyConnector('deepmind_blog', 'DeepMind Blog', 'AI Lab Blogs', 'DeepMind research publications');
export const metaAiBlogConnector = createProxyConnector('meta_ai_blog', 'Meta AI Blog', 'AI Lab Blogs', 'Meta AI research and open source');
export const microsoftResearchConnector = createProxyConnector('microsoft_research', 'Microsoft Research', 'AI Lab Blogs', 'Microsoft Research AI papers and posts');
export const nvidiaDevBlogConnector = createProxyConnector('nvidia_dev_blog', 'NVIDIA Developer', 'AI Lab Blogs', 'NVIDIA AI and GPU computing blog');
export const huggingFaceBlogConnector = createProxyConnector('huggingface_blog', 'Hugging Face Blog', 'AI Lab Blogs', 'Hugging Face community and model updates');
export const anthropicBlogConnector = createProxyConnector('anthropic_blog', 'Anthropic Blog', 'AI Lab Blogs', 'Anthropic safety research and updates');
export const bairBlogConnector = createProxyConnector('bair_blog', 'BAIR (Berkeley)', 'AI Lab Blogs', 'Berkeley AI Research lab blog');

// --- AI Research ---
export const arxivCsAiConnector = createProxyConnector('arxiv_cs_ai', 'arXiv CS.AI', 'AI Research', 'arXiv Artificial Intelligence papers');
export const arxivCsLgConnector = createProxyConnector('arxiv_cs_lg', 'arXiv CS.LG', 'AI Research', 'arXiv Machine Learning papers');
export const arxivCsClConnector = createProxyConnector('arxiv_cs_cl', 'arXiv CS.CL', 'AI Research', 'arXiv Computation and Language papers');
export const openReviewConnector = createProxyConnector('openreview', 'OpenReview', 'AI Research', 'Peer-reviewed AI conference papers');
export const dblpConnector = createProxyConnector('dblp', 'DBLP', 'AI Research', 'Computer science bibliography');

// --- AI Models & Datasets ---
export const hfModelsConnector = createProxyConnector('hf_models', 'Hugging Face Models', 'AI Models & Datasets', 'Open source ML model registry');
export const hfDatasetsConnector = createProxyConnector('hf_datasets', 'Hugging Face Datasets', 'AI Models & Datasets', 'Open source dataset registry');

// --- AI Policy ---
export const brookingsAiConnector = createProxyConnector('brookings_ai', 'Brookings AI', 'AI Policy', 'Brookings Institution AI policy research');
export const stanfordHaiConnector = createProxyConnector('stanford_hai', 'Stanford HAI', 'AI Policy', 'Stanford Human-Centered AI Institute');

// --- AI Communities ---
export const stackOverflowAiConnector = createProxyConnector('stackoverflow_ai', 'Stack Overflow AI', 'AI Communities', 'Stack Overflow AI and ML discussions');

// --- AI Code ---
export const githubReposConnector = createProxyConnector('github_repos', 'GitHub Repos', 'AI Code', 'GitHub trending AI repositories');
export const githubCodeConnector = createProxyConnector('github_trending', 'GitHub Code Search', 'AI Code', 'Search AI code across GitHub');

// --- MORE AI News ---
export const engadgetAiConnector = createProxyConnector('engadget_ai', 'Engadget AI', 'AI News', 'Consumer tech AI coverage');
export const conversationAiConnector = createProxyConnector('the_conversation_ai', 'The Conversation AI', 'AI News', 'Academic commentary on AI');
export const analyticsVidhyaConnector = createProxyConnector('analytics_vidhya', 'Analytics Vidhya', 'AI News', 'Data science community');
export const towardsAiConnector = createProxyConnector('towards_ai', 'Towards AI', 'AI News', 'AI community publication');
export const alignmentForumConnector = createProxyConnector('ai_alignment_forum', 'AI Alignment Forum', 'AI News', 'AI safety discourse');
export const importAiConnector = createProxyConnector('import_ai', 'Import AI', 'AI News', 'Jack Clark AI newsletter');
export const mlMasteryConnector = createProxyConnector('ml_mastery', 'ML Mastery', 'AI News', 'ML tutorials and guides');
export const guardianAiConnector = createProxyConnector('the_guardian_ai', 'The Guardian AI', 'AI News', 'Public-interest AI reporting');
export const zdnetAiConnector = createProxyConnector('zdnet_ai', 'ZDNet AI', 'AI News', 'Enterprise AI coverage');
export const registerMlConnector = createProxyConnector('the_register_ml', 'The Register ML', 'AI News', 'Infrastructure AI coverage');

// --- MORE AI Lab Blogs ---
export const appleMlConnector = createProxyConnector('apple_ml', 'Apple ML Research', 'AI Lab Blogs', 'Apple machine learning research');
export const amazonScienceConnector = createProxyConnector('amazon_science', 'Amazon Science', 'AI Lab Blogs', 'Amazon research publications');
export const awsMlConnector = createProxyConnector('aws_ml_blog', 'AWS ML Blog', 'AI Lab Blogs', 'AWS machine learning blog');
export const ibmResearchConnector = createProxyConnector('ibm_research', 'IBM Research', 'AI Lab Blogs', 'IBM research publications');
export const salesforceAiConnector = createProxyConnector('salesforce_ai', 'Salesforce AI', 'AI Lab Blogs', 'Salesforce AI research');
export const cohereBlogConnector = createProxyConnector('cohere_blog', 'Cohere Blog', 'AI Lab Blogs', 'Cohere model and product posts');
export const allenAiConnector = createProxyConnector('allen_ai', 'Allen AI', 'AI Lab Blogs', 'Allen Institute for AI');
export const stanfordHaiBlogConnector = createProxyConnector('stanford_hai_blog', 'Stanford HAI Blog', 'AI Lab Blogs', 'Stanford HAI news');
export const databricksAiConnector = createProxyConnector('databricks_ai', 'Databricks AI', 'AI Lab Blogs', 'Databricks AI posts');
export const stabilityAiConnector = createProxyConnector('stability_ai', 'Stability AI', 'AI Lab Blogs', 'Stability AI releases');
export const mistralAiConnector = createProxyConnector('mistral_ai', 'Mistral AI', 'AI Lab Blogs', 'Mistral model releases');

// --- MORE AI Research ---
export const arxivCsCvConnector = createProxyConnector('arxiv_cs_cv', 'arXiv CS.CV', 'AI Research', 'Computer vision preprints');
export const arxivCsRoConnector = createProxyConnector('arxiv_cs_ro', 'arXiv CS.RO', 'AI Research', 'Robotics preprints');
export const arxivStatMlConnector = createProxyConnector('arxiv_stat_ml', 'arXiv stat.ML', 'AI Research', 'Statistical ML preprints');
export const arxivCsIrConnector = createProxyConnector('arxiv_cs_ir', 'arXiv CS.IR', 'AI Research', 'Information retrieval preprints');
export const arxivCsHcConnector = createProxyConnector('arxiv_cs_hc', 'arXiv CS.HC', 'AI Research', 'Human-computer interaction preprints');
export const dataciteConnector = createProxyConnector('datacite', 'DataCite', 'AI Research', 'Dataset DOI registry');
export const zenodoConnector = createProxyConnector('zenodo', 'Zenodo', 'AI Research', 'Research outputs and DOIs');

// --- MORE AI Models & Datasets ---
export const openMlConnector = createProxyConnector('openml', 'OpenML', 'AI Models & Datasets', 'ML datasets and tasks');
export const kaggleConnector = createProxyConnector('kaggle_datasets', 'Kaggle Datasets', 'AI Models & Datasets', 'Kaggle dataset registry');
export const papersWithCodeConnector = createProxyConnector('paperswithcode', 'Papers With Code', 'AI Models & Datasets', 'Papers with code and benchmarks');

// --- MORE AI Policy ---
export const oecdAiConnector = createProxyConnector('oecd_ai', 'OECD AI Policy', 'AI Policy', 'OECD AI policy observatory');
export const effAiConnector = createProxyConnector('eff_ai', 'EFF AI & Rights', 'AI Policy', 'Electronic Frontier Foundation AI');
export const adaLovelaceConnector = createProxyConnector('ada_lovelace', 'Ada Lovelace Institute', 'AI Policy', 'AI ethics research');
export const aiNowConnector = createProxyConnector('ai_now_institute', 'AI Now Institute', 'AI Policy', 'AI policy research');
export const csetConnector = createProxyConnector('cset_georgetown', 'Georgetown CSET', 'AI Policy', 'Tech policy research');
export const partnershipAiConnector = createProxyConnector('partnership_on_ai', 'Partnership on AI', 'AI Policy', 'AI governance organization');
export const nistAiConnector = createProxyConnector('nist_ai', 'NIST AI Standards', 'AI Policy', 'US AI standards body');

// --- MORE AI Communities ---
export const redditMlConnector = createProxyConnector('reddit_ml', 'Reddit r/MachineLearning', 'AI Communities', 'ML community discussion');
export const redditAiConnector = createProxyConnector('reddit_ai', 'Reddit r/artificial', 'AI Communities', 'AI community discussion');
export const redditLlmConnector = createProxyConnector('reddit_llm', 'Reddit r/LocalLLaMA', 'AI Communities', 'Local LLM community');

// --- MORE Open Data ---
export const dataGovAuConnector = createProxyConnector('data_gov_au', 'Data.gov.au', 'Open Data Portals', 'Australian open data');
export const dataGovCaConnector = createProxyConnector('data_gov_ca', 'Open Canada', 'Open Data Portals', 'Canadian open data');
export const euDataConnector = createProxyConnector('eu_data_portal', 'EU Open Data', 'Open Data Portals', 'European Union data');
export const laOpenDataConnector = createProxyConnector('la_open_data', 'LA Open Data', 'Open Data Portals', 'Los Angeles city data');
export const sfOpenDataConnector = createProxyConnector('sf_open_data', 'SF Open Data', 'Open Data Portals', 'San Francisco city data');
export const texasDataConnector = createProxyConnector('texas_open_data', 'Texas Open Data', 'Open Data Portals', 'Texas state data');

// --- AI Conferences ---
export const neuripsConnector = createProxyConnector('neurips_proc', 'NeurIPS Proceedings', 'AI Conferences', 'Neural information processing');
export const aclAnthologyConnector = createProxyConnector('acl_anthology', 'ACL Anthology', 'AI Conferences', 'NLP conference papers');

// --- More Video ---
export const youtubeAiConnector = createProxyConnector('youtube_ai', 'YouTube AI Content', 'Video', 'AI video content');

// ============================================================
// WEB-ONLY SOURCES (via Jina site-scoped search)
// ============================================================

// AI News (Web-only)
const oreillyRadarConnector = createProxyConnector('oreilly_radar', "O'Reilly Radar", 'AI News', 'Industry AI essays');
const dlAiBatchConnector = createProxyConnector('deeplearning_ai_batch', 'DeepLearning.AI Batch', 'AI News', 'Weekly AI roundup');
const distillPubConnector = createProxyConnector('distill_pub', 'Distill.pub', 'AI News', 'ML explainers');
const arxivSanityConnector = createProxyConnector('arxiv_sanity', 'arXiv Sanity', 'AI News', 'Paper discovery');

// Conferences (Web-only)
const neuripsConfConnector = createProxyConnector('neurips_conf', 'NeurIPS', 'AI Conferences', 'ML conference');
const icmlConfConnector = createProxyConnector('icml_conf', 'ICML', 'AI Conferences', 'ML conference');
const iclrConfConnector = createProxyConnector('iclr_conf', 'ICLR', 'AI Conferences', 'Deep learning conference');
const aaaiConfConnector = createProxyConnector('aaai_conf', 'AAAI', 'AI Conferences', 'AI conference');
const ijcaiConfConnector = createProxyConnector('ijcai_conf', 'IJCAI', 'AI Conferences', 'AI conference');
const cvprConfConnector = createProxyConnector('cvpr_conf', 'CVPR', 'AI Conferences', 'Vision conference');
const aclConfConnector = createProxyConnector('acl_conf', 'ACL', 'AI Conferences', 'NLP conference');
const emnlpConfConnector = createProxyConnector('emnlp_conf', 'EMNLP', 'AI Conferences', 'NLP conference');
const kddConfConnector = createProxyConnector('kdd_conf', 'KDD', 'AI Conferences', 'Data mining');
const pmlrConnector = createProxyConnector('pmlr_proc', 'PMLR', 'AI Conferences', 'ML proceedings');

// Benchmarks & Leaderboards (Web-only)
const pwcSotaConnector = createProxyConnector('papers_with_code_sota', 'PwC SOTA', 'AI Models & Datasets', 'State-of-the-art tracking');
const hfLeaderboardConnector = createProxyConnector('hf_leaderboard', 'HF LLM Leaderboard', 'AI Models & Datasets', 'Model rankings');
const lmarenaConnector = createProxyConnector('lmarena', 'LMSys Arena', 'AI Models & Datasets', 'Model comparisons');
const mlperfConnector = createProxyConnector('mlperf', 'MLPerf', 'AI Models & Datasets', 'Performance benchmarks');
const helmConnector = createProxyConnector('helm_stanford', 'HELM Stanford', 'AI Models & Datasets', 'Eval framework');
const tfDatasetsConnector = createProxyConnector('tf_datasets', 'TF Datasets', 'AI Models & Datasets', 'Dataset catalog');
const pytorchHubConnector = createProxyConnector('pytorch_hub', 'PyTorch Hub', 'AI Models & Datasets', 'Model recipes');
const ollamaLibConnector = createProxyConnector('ollama_library', 'Ollama Library', 'AI Models & Datasets', 'Local model registry');

// Lab Research Pages (Web-only)
const openaiResearchConnector = createProxyConnector('openai_research', 'OpenAI Research', 'AI Lab Blogs', 'Research posts');
const anthropicResearchConnector = createProxyConnector('anthropic_research', 'Anthropic Research', 'AI Lab Blogs', 'Research posts');
const googleResearchConnector = createProxyConnector('google_research', 'Google Research', 'AI Lab Blogs', 'Research releases');
const nvidiaResearchConnector = createProxyConnector('nvidia_research', 'NVIDIA Research', 'AI Lab Blogs', 'Papers and code');
const adobeResearchConnector = createProxyConnector('adobe_research', 'Adobe Research', 'AI Lab Blogs', 'Papers/projects');
const qualcommAiConnector = createProxyConnector('qualcomm_ai', 'Qualcomm AI', 'AI Lab Blogs', 'Applied AI');
const intelAiConnector = createProxyConnector('intel_ai', 'Intel AI', 'AI Lab Blogs', 'AI programs');

// Policy (Web-only)
const unescoAiConnector = createProxyConnector('unesco_ai', 'UNESCO AI', 'AI Policy', 'Ethics/policy');
const nistAiWebConnector = createProxyConnector('nist_ai_web', 'NIST AI Framework', 'AI Policy', 'US AI standards');

// Communities (Web-only)
const hfForumsConnector = createProxyConnector('hf_forums', 'HF Forums', 'AI Communities', 'Community support');
const pytorchForumsConnector = createProxyConnector('pytorch_forums', 'PyTorch Forums', 'AI Communities', 'Framework Q&A');
const tfForumConnector = createProxyConnector('tf_forum', 'TF Forum', 'AI Communities', 'Framework Q&A');

// Code (Web-only)
const githubTrendingAiConnector = createProxyConnector('github_trending_ai', 'GitHub Trending AI', 'AI Code', 'Trending repos');
const langchainDocsConnector = createProxyConnector('langchain_docs', 'LangChain Docs', 'AI Code', 'Agent/RAG framework');
const llamaindexDocsConnector = createProxyConnector('llamaindex_docs', 'LlamaIndex Docs', 'AI Code', 'RAG framework');

// ============================================================
// CHECKOUT-FUNDRAISING / CAUSE-COMMERCE INTELLIGENCE PACK (2026-04-29)
// 153 connectors covering checkout-charity tech, brand impact pages,
// donation platforms, sustainability-at-checkout, philanthropy press,
// retail/commerce additions, consumer/CSR research, government data,
// press wires, and cause-focused subreddits.
// ============================================================

// --- Cause-Commerce Tech (23) ---
const shoppinggivesBlogConnector = createProxyConnector('shoppinggives_blog', 'ShoppingGives Blog', 'Cause-Commerce Tech', 'ShoppingGives Blog');
const shoppinggivesNewsConnector = createProxyConnector('shoppinggives_news', 'ShoppingGives Newsroom', 'Cause-Commerce Tech', 'ShoppingGives Newsroom');
const pledgeToResourcesConnector = createProxyConnector('pledge_to_resources', 'Pledge.to Resources', 'Cause-Commerce Tech', 'Pledge.to Resources');
const pledgeShopifyGiveGrowConnector = createProxyConnector('pledge_shopify_give_grow', 'Pledge Give and Grow Shopify', 'Cause-Commerce Tech', 'Pledge Give and Grow Shopify');
const pledgelingFoundationConnector = createProxyConnector('pledgeling_foundation', 'Pledgeling Foundation', 'Cause-Commerce Tech', 'Pledgeling Foundation');
const roundupAppConnector = createProxyConnector('roundup_app', 'RoundUp App', 'Cause-Commerce Tech', 'RoundUp App');
const rounditupAmericaConnector = createProxyConnector('rounditup_america', 'Round It Up America', 'Cause-Commerce Tech', 'Round It Up America');
const daffyResourcesConnector = createProxyConnector('daffy_resources', 'Daffy Resources', 'Cause-Commerce Tech', 'Daffy Resources');
const daffyDeveloperConnector = createProxyConnector('daffy_developer', 'Daffy Developer Docs', 'Cause-Commerce Tech', 'Daffy Developer Docs');
const daffyForWorkConnector = createProxyConnector('daffy_for_work', 'Daffy for Work', 'Cause-Commerce Tech', 'Daffy for Work');
const givelifyBlogConnector = createProxyConnector('givelify_blog', 'Givelify Blog', 'Cause-Commerce Tech', 'Givelify Blog');
const givelifyPressConnector = createProxyConnector('givelify_press', 'Givelify Press', 'Cause-Commerce Tech', 'Givelify Press');
const charitybuzzConnector = createProxyConnector('charitybuzz', 'Charitybuzz', 'Cause-Commerce Tech', 'Charitybuzz');
const charitybuzzPressConnector = createProxyConnector('charitybuzz_press', 'Charitybuzz Press', 'Cause-Commerce Tech', 'Charitybuzz Press');
const stripeClimateConnector = createProxyConnector('stripe_climate', 'Stripe Climate', 'Cause-Commerce Tech', 'Stripe Climate');
const frontierClimateConnector = createProxyConnector('frontier_climate', 'Frontier Climate', 'Cause-Commerce Tech', 'Frontier Climate');
const stripeNewsroomConnector = createProxyConnector('stripe_newsroom', 'Stripe Newsroom', 'Cause-Commerce Tech', 'Stripe Newsroom');
const klarnaNewsroomConnector = createProxyConnector('klarna_newsroom', 'Klarna Newsroom', 'Cause-Commerce Tech', 'Klarna Newsroom');
const klarnaSustainabilityConnector = createProxyConnector('klarna_sustainability', 'Klarna Sustainability', 'Cause-Commerce Tech', 'Klarna Sustainability');
const shopifyAppsRoundupConnector = createProxyConnector('shopify_apps_roundup', 'Shopify Round-Up Apps', 'Cause-Commerce Tech', 'Shopify Round-Up Apps');
const shopifyEngineeringConnector = createProxyConnector('shopify_engineering', 'Shopify Engineering Blog', 'Cause-Commerce Tech', 'Shopify Engineering Blog');
const shopifyNewsConnector = createProxyConnector('shopify_news', 'Shopify News', 'Cause-Commerce Tech', 'Shopify News');
const salesforceOrgBlogConnector = createProxyConnector('salesforce_org_blog', 'Salesforce.org Blog', 'Cause-Commerce Tech', 'Salesforce.org Blog');

// --- Cause-Brand Impact (25) ---
const wayfairNewsConnector = createProxyConnector('wayfair_news', 'Wayfair Newsroom', 'Cause-Brand Impact', 'Wayfair Newsroom');
const wayfairImpactConnector = createProxyConnector('wayfair_impact', 'Wayfair Social Impact', 'Cause-Brand Impact', 'Wayfair Social Impact');
const wayfairIrConnector = createProxyConnector('wayfair_ir', 'Wayfair Investor Relations', 'Cause-Brand Impact', 'Wayfair Investor Relations');
const bombasImpactConnector = createProxyConnector('bombas_impact', 'Bombas Impact (Bee Better)', 'Cause-Brand Impact', 'Bombas Impact (Bee Better)');
const bombasPressConnector = createProxyConnector('bombas_press', 'Bombas Press', 'Cause-Brand Impact', 'Bombas Press');
const tomsImpactConnector = createProxyConnector('toms_impact', 'TOMS Impact Reports', 'Cause-Brand Impact', 'TOMS Impact Reports');
const tomsNewsConnector = createProxyConnector('toms_news', 'TOMS Newsroom', 'Cause-Brand Impact', 'TOMS Newsroom');
const warbyBuyPairConnector = createProxyConnector('warby_buy_pair', 'Warby Parker Buy a Pair', 'Cause-Brand Impact', 'Warby Parker Buy a Pair');
const warbyPressConnector = createProxyConnector('warby_press', 'Warby Parker Press', 'Cause-Brand Impact', 'Warby Parker Press');
const allbirdsSustainabilityConnector = createProxyConnector('allbirds_sustainability', 'Allbirds Sustainability', 'Cause-Brand Impact', 'Allbirds Sustainability');
const patagoniaActivismConnector = createProxyConnector('patagonia_activism', 'Patagonia Activism', 'Cause-Brand Impact', 'Patagonia Activism');
const onepercentPlanetConnector = createProxyConnector('onepercent_planet', '1 Percent for the Planet', 'Cause-Brand Impact', '1 Percent for the Planet');
const benjerryNewsConnector = createProxyConnector('benjerry_news', 'Ben and Jerrys Issues', 'Cause-Brand Impact', 'Ben and Jerrys Issues');
const honestCoConnector = createProxyConnector('honest_co', 'Honest Company', 'Cause-Brand Impact', 'Honest Company');
const lushCharityPotConnector = createProxyConnector('lush_charity_pot', 'Lush Charity Pot', 'Cause-Brand Impact', 'Lush Charity Pot');
const bodyShopActivismConnector = createProxyConnector('body_shop_activism', 'The Body Shop Activism', 'Cause-Brand Impact', 'The Body Shop Activism');
const cotopaxiImpactConnector = createProxyConnector('cotopaxi_impact', 'Cotopaxi Impact', 'Cause-Brand Impact', 'Cotopaxi Impact');
const thinxImpactConnector = createProxyConnector('thinx_impact', 'Thinx Impact', 'Cause-Brand Impact', 'Thinx Impact');
const parkerClayConnector = createProxyConnector('parker_clay', 'Parker Clay Impact', 'Cause-Brand Impact', 'Parker Clay Impact');
const tentreeConnector = createProxyConnector('tentree', 'Tentree Impact', 'Cause-Brand Impact', 'Tentree Impact');
const puraVidaCharityConnector = createProxyConnector('pura_vida_charity', 'Pura Vida Charity', 'Cause-Brand Impact', 'Pura Vida Charity');
const sandCloudCharityConnector = createProxyConnector('sand_cloud_charity', 'Sand Cloud Charity', 'Cause-Brand Impact', 'Sand Cloud Charity');
const sevenlyConnector = createProxyConnector('sevenly', 'Sevenly', 'Cause-Brand Impact', 'Sevenly');
const newmansOwnConnector = createProxyConnector('newmans_own', 'Newmans Own Foundation', 'Cause-Brand Impact', 'Newmans Own Foundation');
const redOrgConnector = createProxyConnector('red_org', 'Project RED', 'Cause-Brand Impact', 'Project RED');

// --- Donation Tech Platforms (27) ---
const donatestockBlogConnector = createProxyConnector('donatestock_blog', 'DonateStock Blog', 'Donation Tech Platforms', 'DonateStock Blog');
const givingblockBlogConnector = createProxyConnector('givingblock_blog', 'The Giving Block', 'Donation Tech Platforms', 'The Giving Block');
const engivenBlogConnector = createProxyConnector('engiven_blog', 'Engiven', 'Donation Tech Platforms', 'Engiven');
const gofundmePressConnector = createProxyConnector('gofundme_press', 'GoFundMe Newsroom', 'Donation Tech Platforms', 'GoFundMe Newsroom');
const donorschoosePressConnector = createProxyConnector('donorschoose_press', 'DonorsChoose Press', 'Donation Tech Platforms', 'DonorsChoose Press');
const nfgBlogConnector = createProxyConnector('nfg_blog', 'Network for Good', 'Donation Tech Platforms', 'Network for Good');
const fidelityCharitableInsightsConnector = createProxyConnector('fidelity_charitable_insights', 'Fidelity Charitable Insights', 'Donation Tech Platforms', 'Fidelity Charitable Insights');
const schwabCharitableInsightsConnector = createProxyConnector('schwab_charitable_insights', 'Schwab Charitable Insights', 'Donation Tech Platforms', 'Schwab Charitable Insights');
const vanguardCharitableInsightsConnector = createProxyConnector('vanguard_charitable_insights', 'Vanguard Charitable Insights', 'Donation Tech Platforms', 'Vanguard Charitable Insights');
const nptrustDafReportConnector = createProxyConnector('nptrust_daf_report', 'NPTrust DAF Report', 'Donation Tech Platforms', 'NPTrust DAF Report');
const chariotBlogConnector = createProxyConnector('chariot_blog', 'Chariot Blog', 'Donation Tech Platforms', 'Chariot Blog');
const pledge1pctNewsConnector = createProxyConnector('pledge1pct_news', 'Pledge 1 Percent News', 'Donation Tech Platforms', 'Pledge 1 Percent News');
const benevityBlogConnector = createProxyConnector('benevity_blog', 'Benevity Blog', 'Donation Tech Platforms', 'Benevity Blog');
const blackbaudBlogConnector = createProxyConnector('blackbaud_blog', 'Blackbaud Blog', 'Donation Tech Platforms', 'Blackbaud Blog');
const submittableBlogConnector = createProxyConnector('submittable_blog', 'Submittable Blog', 'Donation Tech Platforms', 'Submittable Blog');
const percentPledgeConnector = createProxyConnector('percent_pledge', 'Percent Pledge', 'Donation Tech Platforms', 'Percent Pledge');
const givingaBlogConnector = createProxyConnector('givinga_blog', 'Givinga Insights', 'Donation Tech Platforms', 'Givinga Insights');
const groundswellBlogConnector = createProxyConnector('groundswell_blog', 'Groundswell Blog', 'Donation Tech Platforms', 'Groundswell Blog');
const millieBlogConnector = createProxyConnector('millie_blog', 'Millie Giving', 'Donation Tech Platforms', 'Millie Giving');
const doublethedonationBlogConnector = createProxyConnector('doublethedonation_blog', 'Double the Donation', 'Donation Tech Platforms', 'Double the Donation');
const virtueImpactBlogConnector = createProxyConnector('virtue_impact_blog', 'Virtue Impact Shopify', 'Donation Tech Platforms', 'Virtue Impact Shopify');
const dailykarmaBlogConnector = createProxyConnector('dailykarma_blog', 'DailyKarma Blog', 'Donation Tech Platforms', 'DailyKarma Blog');
const beamImpactBlogConnector = createProxyConnector('beam_impact_blog', 'Beam Impact Blog', 'Donation Tech Platforms', 'Beam Impact Blog');
const getchangeBlogConnector = createProxyConnector('getchange_blog', 'Change Mastercard Blog', 'Donation Tech Platforms', 'Change Mastercard Blog');
const aspirationPressConnector = createProxyConnector('aspiration_press', 'Aspiration Press', 'Donation Tech Platforms', 'Aspiration Press');
const acornsPressConnector = createProxyConnector('acorns_press', 'Acorns Press', 'Donation Tech Platforms', 'Acorns Press');
const opencollectiveBlogConnector = createProxyConnector('opencollective_blog', 'OpenCollective Blog', 'Donation Tech Platforms', 'OpenCollective Blog');

// --- Sustainability-at-Checkout (15) ---
const stripeClimateCustomersConnector = createProxyConnector('stripe_climate_customers', 'Stripe Climate Customers', 'Sustainability-at-Checkout', 'Stripe Climate Customers');
const frontierClimateNewsConnector = createProxyConnector('frontier_climate_news', 'Frontier Climate Blog', 'Sustainability-at-Checkout', 'Frontier Climate Blog');
const ecocartBlogConnector = createProxyConnector('ecocart_blog', 'EcoCart Blog', 'Sustainability-at-Checkout', 'EcoCart Blog');
const cloverlyBlogConnector = createProxyConnector('cloverly_blog', 'Cloverly Blog', 'Sustainability-at-Checkout', 'Cloverly Blog');
const patchIoBlogConnector = createProxyConnector('patch_io_blog', 'Patch carbon API Blog', 'Sustainability-at-Checkout', 'Patch carbon API Blog');
const pachamaBlogConnector = createProxyConnector('pachama_blog', 'Pachama Insights', 'Sustainability-at-Checkout', 'Pachama Insights');
const climateNeutralBlogConnector = createProxyConnector('climate_neutral_blog', 'Climate Neutral Certified', 'Sustainability-at-Checkout', 'Climate Neutral Certified');
const watershedBlogConnector = createProxyConnector('watershed_blog', 'Watershed Blog', 'Sustainability-at-Checkout', 'Watershed Blog');
const persefoniBlogConnector = createProxyConnector('persefoni_blog', 'Persefoni Insights', 'Sustainability-at-Checkout', 'Persefoni Insights');
const southPoleNewsConnector = createProxyConnector('south_pole_news', 'South Pole News', 'Sustainability-at-Checkout', 'South Pole News');
const carbonCreditsNewsConnector = createProxyConnector('carbon_credits_news', 'Carbon Credits News', 'Sustainability-at-Checkout', 'Carbon Credits News');
const trellisFeedConnector = createProxyConnector('trellis_feed', 'Trellis (formerly GreenBiz)', 'Sustainability-at-Checkout', 'Trellis (formerly GreenBiz)');
const sustainableBrandsConnector = createProxyConnector('sustainable_brands', 'Sustainable Brands', 'Sustainability-at-Checkout', 'Sustainable Brands');
const triplePunditConnector = createProxyConnector('triple_pundit', 'TriplePundit', 'Sustainability-at-Checkout', 'TriplePundit');
const threeblMediaConnector = createProxyConnector('threebl_media', '3BL Media News', 'Sustainability-at-Checkout', '3BL Media News');

// --- Philanthropy Press (16) ---
const chroniclePhilanthropyFundraisingConnector = createProxyConnector('chronicle_philanthropy_fundraising', 'Chronicle of Philanthropy: Fundraising', 'Philanthropy Press', 'Chronicle of Philanthropy: Fundraising');
const nonprofitTimesFeedConnector = createProxyConnector('nonprofit_times_feed', 'NonProfit Times', 'Philanthropy Press', 'NonProfit Times');
const insidePhilanthropyConnector = createProxyConnector('inside_philanthropy', 'Inside Philanthropy', 'Philanthropy Press', 'Inside Philanthropy');
const nonprofitQuarterlyConnector = createProxyConnector('nonprofit_quarterly', 'Nonprofit Quarterly', 'Philanthropy Press', 'Nonprofit Quarterly');
const philanthropyNewsDigestConnector = createProxyConnector('philanthropy_news_digest', 'Philanthropy News Digest', 'Philanthropy Press', 'Philanthropy News Digest');
const devexNewsConnector = createProxyConnector('devex_news', 'Devex', 'Philanthropy Press', 'Devex');
const allianceMagazineConnector = createProxyConnector('alliance_magazine', 'Alliance Magazine', 'Philanthropy Press', 'Alliance Magazine');
const forbesNonprofitCouncilConnector = createProxyConnector('forbes_nonprofit_council', 'Forbes Nonprofit Council', 'Philanthropy Press', 'Forbes Nonprofit Council');
const ntenConnector = createProxyConnector('nten', 'NTEN', 'Philanthropy Press', 'NTEN');
const nptechforgoodConnector = createProxyConnector('nptechforgood', 'Nonprofit Tech for Good', 'Philanthropy Press', 'Nonprofit Tech for Good');
const globalImpactBlogConnector = createProxyConnector('global_impact_blog', 'Global Impact Greater Giving', 'Philanthropy Press', 'Global Impact Greater Giving');
const engageForGoodConnector = createProxyConnector('engage_for_good', 'Engage for Good', 'Philanthropy Press', 'Engage for Good');
const selfishGivingConnector = createProxyConnector('selfish_giving', 'Selfish Giving (Joe Waters)', 'Philanthropy Press', 'Selfish Giving (Joe Waters)');
const mrBenchmarksConnector = createProxyConnector('mr_benchmarks', 'M+R Benchmarks', 'Philanthropy Press', 'M+R Benchmarks');
const agitatorDonorvoiceConnector = createProxyConnector('agitator_donorvoice', 'The Agitator / DonorVoice', 'Philanthropy Press', 'The Agitator / DonorVoice');
const charityNavigatorNewsConnector = createProxyConnector('charity_navigator_news', 'Charity Navigator News', 'Philanthropy Press', 'Charity Navigator News');

// --- Retail News (6) ---
const pymntsConnector = createProxyConnector('pymnts', 'PYMNTS', 'Retail News', 'PYMNTS');
const thePaypersConnector = createProxyConnector('the_paypers', 'The Paypers', 'Retail News', 'The Paypers');
const finextraConnector = createProxyConnector('finextra', 'Finextra', 'Retail News', 'Finextra');
const tearsheetConnector = createProxyConnector('tearsheet', 'Tearsheet', 'Retail News', 'Tearsheet');
const retailBrewConnector = createProxyConnector('retail_brew', 'Retail Brew', 'Retail News', 'Retail Brew');
const businessOfHomeConnector = createProxyConnector('business_of_home', 'Business of Home', 'Retail News', 'Business of Home');

// --- Consumer/CSR Research (15) ---
const coneCommunicationsConnector = createProxyConnector('cone_communications', 'Cone Communications', 'Consumer/CSR Research', 'Cone Communications');
const edelmanTrustConnector = createProxyConnector('edelman_trust', 'Edelman Trust Barometer', 'Consumer/CSR Research', 'Edelman Trust Barometer');
const porterNovelliConnector = createProxyConnector('porter_novelli', 'Porter Novelli Intelligence', 'Consumer/CSR Research', 'Porter Novelli Intelligence');
const kantarSustainabilityConnector = createProxyConnector('kantar_sustainability', 'Kantar Sustainability', 'Consumer/CSR Research', 'Kantar Sustainability');
const mckinseySustainabilityConnector = createProxyConnector('mckinsey_sustainability', 'McKinsey Sustainability', 'Consumer/CSR Research', 'McKinsey Sustainability');
const bcgCustomerConnector = createProxyConnector('bcg_customer', 'BCG Customer Insight', 'Consumer/CSR Research', 'BCG Customer Insight');
const accentureLifeTrendsConnector = createProxyConnector('accenture_life_trends', 'Accenture Life Trends', 'Consumer/CSR Research', 'Accenture Life Trends');
const pewReligionConnector = createProxyConnector('pew_religion', 'Pew Religion and Charitable Giving', 'Consumer/CSR Research', 'Pew Religion and Charitable Giving');
const ypulseBlogConnector = createProxyConnector('ypulse_blog', 'YPulse Blog', 'Consumer/CSR Research', 'YPulse Blog');
const morningConsultConnector = createProxyConnector('morning_consult', 'Morning Consult Brand', 'Consumer/CSR Research', 'Morning Consult Brand');
const civicScienceConnector = createProxyConnector('civic_science', 'Civic Science Insights', 'Consumer/CSR Research', 'Civic Science Insights');
const numeratorBlogConnector = createProxyConnector('numerator_blog', 'Numerator Insights', 'Consumer/CSR Research', 'Numerator Insights');
const firstInsightConnector = createProxyConnector('first_insight', 'First Insight Gen Z', 'Consumer/CSR Research', 'First Insight Gen Z');
const ibmIbvSustainabilityConnector = createProxyConnector('ibm_ibv_sustainability', 'IBM Institute Sustainability', 'Consumer/CSR Research', 'IBM Institute Sustainability');
const wefStakeholderCapitalismConnector = createProxyConnector('wef_stakeholder_capitalism', 'WEF Stakeholder Capitalism', 'Consumer/CSR Research', 'WEF Stakeholder Capitalism');

// --- Government Data (9) ---
const irsEosConnector = createProxyConnector('irs_eos', 'IRS Tax Exempt Org Search', 'Government Data', 'IRS Tax Exempt Org Search');
const irsCharitiesNewsConnector = createProxyConnector('irs_charities_news', 'IRS Charities Newsroom', 'Government Data', 'IRS Charities Newsroom');
const candidApisConnector = createProxyConnector('candid_apis', 'Candid APIs', 'Government Data', 'Candid APIs');
const nascoStateConnector = createProxyConnector('nasco_state', 'NASCO state regulators', 'Government Data', 'NASCO state regulators');
const ncnArticlesConnector = createProxyConnector('ncn_articles', 'National Council of Nonprofits', 'Government Data', 'National Council of Nonprofits');
const beaPceConnector = createProxyConnector('bea_pce', 'BEA Personal Consumption', 'Government Data', 'BEA Personal Consumption');
const dataGovCharitableConnector = createProxyConnector('data_gov_charitable', 'data.gov charitable', 'Government Data', 'data.gov charitable');
const ftcPressConnector = createProxyConnector('ftc_press', 'FTC Consumer Protection', 'Government Data', 'FTC Consumer Protection');
const charityNavigatorMethodologyConnector = createProxyConnector('charity_navigator_methodology', 'Charity Navigator Methodology', 'Government Data', 'Charity Navigator Methodology');

// --- Press Wires (7) ---
const prnewswireRetailConnector = createProxyConnector('prnewswire_retail', 'PR Newswire Retail', 'Press Wires', 'PR Newswire Retail');
const prnewswireTechConnector = createProxyConnector('prnewswire_tech', 'PR Newswire Technology', 'Press Wires', 'PR Newswire Technology');
const businesswireRetailConnector = createProxyConnector('businesswire_retail', 'Business Wire Retail', 'Press Wires', 'Business Wire Retail');
const businesswireOnlineRetailConnector = createProxyConnector('businesswire_online_retail', 'Business Wire Online Retail', 'Press Wires', 'Business Wire Online Retail');
const globenewswireRetailConnector = createProxyConnector('globenewswire_retail', 'GlobeNewswire Retail', 'Press Wires', 'GlobeNewswire Retail');
const csrwireConnector = createProxyConnector('csrwire', 'CSRwire', 'Press Wires', 'CSRwire');
const justmeans3blConnector = createProxyConnector('justmeans_3bl', 'Justmeans / 3BL', 'Press Wires', 'Justmeans / 3BL');

// --- Cause Reddit (10) ---
const redditNonprofitMainConnector = createProxyConnector('reddit_nonprofit_main', 'Reddit r/nonprofit', 'Cause Reddit', 'Reddit r/nonprofit');
const redditFundraisingConnector = createProxyConnector('reddit_fundraising', 'Reddit r/fundraising', 'Cause Reddit', 'Reddit r/fundraising');
const redditCharitynavigatorConnector = createProxyConnector('reddit_charitynavigator', 'Reddit r/CharityNavigator', 'Cause Reddit', 'Reddit r/CharityNavigator');
const redditEffectivealtruismConnector = createProxyConnector('reddit_effectivealtruism', 'Reddit r/EffectiveAltruism', 'Cause Reddit', 'Reddit r/EffectiveAltruism');
const redditSocialenterpriseConnector = createProxyConnector('reddit_socialenterprise', 'Reddit r/socialenterprise', 'Cause Reddit', 'Reddit r/socialenterprise');
const redditSustainabilityMainConnector = createProxyConnector('reddit_sustainability_main', 'Reddit r/sustainability', 'Cause Reddit', 'Reddit r/sustainability');
const redditEthicalfashionConnector = createProxyConnector('reddit_ethicalfashion', 'Reddit r/ethicalfashion', 'Cause Reddit', 'Reddit r/ethicalfashion');
const redditDtcmarketingConnector = createProxyConnector('reddit_dtcmarketing', 'Reddit r/DTCMarketing', 'Cause Reddit', 'Reddit r/DTCMarketing');
const redditWayfairConnector = createProxyConnector('reddit_wayfair', 'Reddit r/wayfair', 'Cause Reddit', 'Reddit r/wayfair');
const redditPersonalfinanceDafConnector = createProxyConnector('reddit_personalfinance_daf', 'Reddit r/personalfinance', 'Cause Reddit', 'Reddit r/personalfinance');

// ============================================================
// 400-SOURCE RETAIL EXPANSION PACK (2026-04-29)
// 386 connectors across 14 categories.
// ============================================================

// --- Retail Competitive Set (50) ---
const wayfairSecConnector = createProxyConnector('wayfair_sec', 'Wayfair IR / SEC Filings', 'Retail Competitive Set', 'Wayfair IR / SEC Filings');
const wsmIrConnector = createProxyConnector('wsm_ir', 'Williams-Sonoma IR', 'Retail Competitive Set', 'Williams-Sonoma IR');
const rhIrConnector = createProxyConnector('rh_ir', 'RH Restoration Hardware IR', 'Retail Competitive Set', 'RH Restoration Hardware IR');
const ikeaNewsroomConnector = createProxyConnector('ikea_newsroom', 'IKEA Newsroom', 'Retail Competitive Set', 'IKEA Newsroom');
const ikeaAnnualConnector = createProxyConnector('ikea_annual', 'Inter IKEA annual reports', 'Retail Competitive Set', 'Inter IKEA annual reports');
const ashleyPressConnector = createProxyConnector('ashley_press', 'Ashley Furniture press', 'Retail Competitive Set', 'Ashley Furniture press');
const lzbIrConnector = createProxyConnector('lzb_ir', 'La-Z-Boy IR', 'Retail Competitive Set', 'La-Z-Boy IR');
const hoftIrConnector = createProxyConnector('hoft_ir', 'Hooker Furnishings IR', 'Retail Competitive Set', 'Hooker Furnishings IR');
const etdIrConnector = createProxyConnector('etd_ir', 'Ethan Allen IR', 'Retail Competitive Set', 'Ethan Allen IR');
const mlknIrConnector = createProxyConnector('mlkn_ir', 'MillerKnoll IR', 'Retail Competitive Set', 'MillerKnoll IR');
const scsIrConnector = createProxyConnector('scs_ir', 'Steelcase IR', 'Retail Competitive Set', 'Steelcase IR');
const hniIrConnector = createProxyConnector('hni_ir', 'HNI Corp IR', 'Retail Competitive Set', 'HNI Corp IR');
const kirkIrConnector = createProxyConnector('kirk_ir', 'Kirklands IR', 'Retail Competitive Set', 'Kirklands IR');
const athomePressConnector = createProxyConnector('athome_press', 'At Home press', 'Retail Competitive Set', 'At Home press');
const biglotsIrConnector = createProxyConnector('biglots_ir', 'Big Lots IR', 'Retail Competitive Set', 'Big Lots IR');
const tuesdaymorningPressConnector = createProxyConnector('tuesdaymorning_press', 'Tuesday Morning press', 'Retail Competitive Set', 'Tuesday Morning press');
const crateandbarrelPressConnector = createProxyConnector('crateandbarrel_press', 'Crate and Barrel press', 'Retail Competitive Set', 'Crate and Barrel press');
const arhsIrConnector = createProxyConnector('arhs_ir', 'Arhaus IR', 'Retail Competitive Set', 'Arhaus IR');
const loveIrConnector = createProxyConnector('love_ir', 'Lovesac IR', 'Retail Competitive Set', 'Lovesac IR');
const fndIrConnector = createProxyConnector('fnd_ir', 'Floor and Decor IR', 'Retail Competitive Set', 'Floor and Decor IR');
const ttshIrConnector = createProxyConnector('ttsh_ir', 'Tile Shop IR', 'Retail Competitive Set', 'Tile Shop IR');
const llFlooringPressConnector = createProxyConnector('ll_flooring_press', 'LL Flooring press', 'Retail Competitive Set', 'LL Flooring press');
const byonIrConnector = createProxyConnector('byon_ir', 'Beyond Inc BBBY IR', 'Retail Competitive Set', 'Beyond Inc BBBY IR');
const tjxIrConnector = createProxyConnector('tjx_ir', 'TJX Companies IR', 'Retail Competitive Set', 'TJX Companies IR');
const rostIrConnector = createProxyConnector('rost_ir', 'Ross Stores IR', 'Retail Competitive Set', 'Ross Stores IR');
const burlIrConnector = createProxyConnector('burl_ir', 'Burlington Stores IR', 'Retail Competitive Set', 'Burlington Stores IR');
const walmartIrConnector = createProxyConnector('walmart_ir', 'Walmart IR', 'Retail Competitive Set', 'Walmart IR');
const targetIrConnector = createProxyConnector('target_ir', 'Target IR', 'Retail Competitive Set', 'Target IR');
const costIrConnector = createProxyConnector('cost_ir', 'Costco IR', 'Retail Competitive Set', 'Costco IR');
const amznIrConnector = createProxyConnector('amzn_ir', 'Amazon IR', 'Retail Competitive Set', 'Amazon IR');
const hdIrConnector = createProxyConnector('hd_ir', 'Home Depot IR', 'Retail Competitive Set', 'Home Depot IR');
const lowIrConnector = createProxyConnector('low_ir', 'Lowes IR', 'Retail Competitive Set', 'Lowes IR');
const tscoIrConnector = createProxyConnector('tsco_ir', 'Tractor Supply IR', 'Retail Competitive Set', 'Tractor Supply IR');
const harborfreightPressConnector = createProxyConnector('harborfreight_press', 'Harbor Freight press', 'Retail Competitive Set', 'Harbor Freight press');
const shwIrConnector = createProxyConnector('shw_ir', 'Sherwin-Williams IR', 'Retail Competitive Set', 'Sherwin-Williams IR');
const dgIrConnector = createProxyConnector('dg_ir', 'Dollar General IR', 'Retail Competitive Set', 'Dollar General IR');
const dltrIrConnector = createProxyConnector('dltr_ir', 'Dollar Tree IR', 'Retail Competitive Set', 'Dollar Tree IR');
const fiveIrConnector = createProxyConnector('five_ir', 'Five Below IR', 'Retail Competitive Set', 'Five Below IR');
const macysIrConnector = createProxyConnector('macys_ir', 'Macys IR', 'Retail Competitive Set', 'Macys IR');
const kssIrConnector = createProxyConnector('kss_ir', 'Kohls IR', 'Retail Competitive Set', 'Kohls IR');
const jwnIrConnector = createProxyConnector('jwn_ir', 'Nordstrom IR', 'Retail Competitive Set', 'Nordstrom IR');
const jcpenneyPressConnector = createProxyConnector('jcpenney_press', 'JCPenney Newsroom', 'Retail Competitive Set', 'JCPenney Newsroom');
const belkPressConnector = createProxyConnector('belk_press', 'Belk press', 'Retail Competitive Set', 'Belk press');
const ddsIrConnector = createProxyConnector('dds_ir', 'Dillards IR', 'Retail Competitive Set', 'Dillards IR');
const saksPressConnector = createProxyConnector('saks_press', 'Saks press', 'Retail Competitive Set', 'Saks press');
const neimanPressConnector = createProxyConnector('neiman_press', 'Neiman Marcus press', 'Retail Competitive Set', 'Neiman Marcus press');
const tcsIrConnector = createProxyConnector('tcs_ir', 'Container Store IR', 'Retail Competitive Set', 'Container Store IR');
const bollandbranchPressConnector = createProxyConnector('bollandbranch_press', 'Boll and Branch press', 'Retail Competitive Set', 'Boll and Branch press');
const brooklinenPressConnector = createProxyConnector('brooklinen_press', 'Brooklinen press', 'Retail Competitive Set', 'Brooklinen press');
const parachutePressConnector = createProxyConnector('parachute_press', 'Parachute Home press', 'Retail Competitive Set', 'Parachute Home press');

// --- Home/Furniture Trade (39) ---
const furnitureTodayConnector = createProxyConnector('furniture_today', 'Furniture Today', 'Home/Furniture Trade', 'Furniture Today');
const homeNewsNowConnector = createProxyConnector('home_news_now', 'Home News Now', 'Home/Furniture Trade', 'Home News Now');
const hfnDigitalConnector = createProxyConnector('hfn_digital', 'Home Furnishings News HFN', 'Home/Furniture Trade', 'Home Furnishings News HFN');
const homeTextilesTodayConnector = createProxyConnector('home_textiles_today', 'Home Textiles Today', 'Home/Furniture Trade', 'Home Textiles Today');
const furnitureNewsUkConnector = createProxyConnector('furniture_news_uk', 'Furniture News UK', 'Home/Furniture Trade', 'Furniture News UK');
const casualLivingConnector = createProxyConnector('casual_living', 'Casual Living', 'Home/Furniture Trade', 'Casual Living');
const bigFurnitureGroupConnector = createProxyConnector('big_furniture_group', 'Big Furniture Group', 'Home/Furniture Trade', 'Big Furniture Group');
const designersTodayConnector = createProxyConnector('designers_today', 'Designers Today', 'Home/Furniture Trade', 'Designers Today');
const kbbOnlineConnector = createProxyConnector('kbb_online', 'Kitchen and Bath Business', 'Home/Furniture Trade', 'Kitchen and Bath Business');
const kbdnConnector = createProxyConnector('kbdn', 'Kitchen and Bath Design News', 'Home/Furniture Trade', 'Kitchen and Bath Design News');
const hospitalityDesignConnector = createProxyConnector('hospitality_design', 'Hospitality Design', 'Home/Furniture Trade', 'Hospitality Design');
const adProConnector = createProxyConnector('ad_pro', 'Architectural Digest Pro', 'Home/Furniture Trade', 'Architectural Digest Pro');
const adMainConnector = createProxyConnector('ad_main', 'Architectural Digest', 'Home/Furniture Trade', 'Architectural Digest');
const interiorDesignMagConnector = createProxyConnector('interior_design_mag', 'Interior Design Magazine', 'Home/Furniture Trade', 'Interior Design Magazine');
const dezeenConnector = createProxyConnector('dezeen', 'Dezeen', 'Home/Furniture Trade', 'Dezeen');
const wallpaperMagConnector = createProxyConnector('wallpaper_mag', 'Wallpaper', 'Home/Furniture Trade', 'Wallpaper');
const dwellConnector = createProxyConnector('dwell', 'Dwell', 'Home/Furniture Trade', 'Dwell');
const housebeautifulConnector = createProxyConnector('housebeautiful', 'House Beautiful', 'Home/Furniture Trade', 'House Beautiful');
const elledecorConnector = createProxyConnector('elledecor', 'Elle Decor', 'Home/Furniture Trade', 'Elle Decor');
const verandaConnector = createProxyConnector('veranda', 'Veranda', 'Home/Furniture Trade', 'Veranda');
const apartmentTherapyConnector = createProxyConnector('apartment_therapy', 'Apartment Therapy', 'Home/Furniture Trade', 'Apartment Therapy');
const remodelistaConnector = createProxyConnector('remodelista', 'Remodelista', 'Home/Furniture Trade', 'Remodelista');
const houzzProConnector = createProxyConnector('houzz_pro', 'Houzz Pro', 'Home/Furniture Trade', 'Houzz Pro');
const theSpruceConnector = createProxyConnector('the_spruce', 'The Spruce', 'Home/Furniture Trade', 'The Spruce');
const curbedVoxConnector = createProxyConnector('curbed_vox', 'Curbed', 'Home/Furniture Trade', 'Curbed');
const designboomConnector = createProxyConnector('designboom', 'DesignBoom', 'Home/Furniture Trade', 'DesignBoom');
const designMilkConnector = createProxyConnector('design_milk', 'Design Milk', 'Home/Furniture Trade', 'Design Milk');
const core77Connector = createProxyConnector('core77', 'Core77', 'Home/Furniture Trade', 'Core77');
const yankoDesignConnector = createProxyConnector('yanko_design', 'Yanko Design', 'Home/Furniture Trade', 'Yanko Design');
const ahfaNewsConnector = createProxyConnector('ahfa_news', 'AHFA news', 'Home/Furniture Trade', 'AHFA news');
const hfaBlogConnector = createProxyConnector('hfa_blog', 'Home Furnishings Association', 'Home/Furniture Trade', 'Home Furnishings Association');
const icfaNewsConnector = createProxyConnector('icfa_news', 'Intl Casual Furnishings Assn', 'Home/Furniture Trade', 'Intl Casual Furnishings Assn');
const wfcaNewsConnector = createProxyConnector('wfca_news', 'World Floor Covering Assn', 'Home/Furniture Trade', 'World Floor Covering Assn');
const asidNewsConnector = createProxyConnector('asid_news', 'ASID news', 'Home/Furniture Trade', 'ASID news');
const iidaNewsConnector = createProxyConnector('iida_news', 'IIDA news', 'Home/Furniture Trade', 'IIDA news');
const highpointMarketConnector = createProxyConnector('highpoint_market', 'High Point Market press', 'Home/Furniture Trade', 'High Point Market press');
const vegasMarketConnector = createProxyConnector('vegas_market', 'Las Vegas Market press', 'Home/Furniture Trade', 'Las Vegas Market press');
const andmoreNewsConnector = createProxyConnector('andmore_news', 'Andmore news', 'Home/Furniture Trade', 'Andmore news');
const stumpFurnitureMaConnector = createProxyConnector('stump_furniture_ma', 'Stump and Co furniture M&A', 'Home/Furniture Trade', 'Stump and Co furniture M&A');

// --- Retail Tech Vendors (35) ---
const tostIrConnector = createProxyConnector('tost_ir', 'Toast IR', 'Retail Tech Vendors', 'Toast IR');
const lspdIrConnector = createProxyConnector('lspd_ir', 'Lightspeed IR', 'Retail Tech Vendors', 'Lightspeed IR');
const sqIrConnector = createProxyConnector('sq_ir', 'Square Block IR', 'Retail Tech Vendors', 'Square Block IR');
const cloverNewsConnector = createProxyConnector('clover_news', 'Clover Fiserv news', 'Retail Tech Vendors', 'Clover Fiserv news');
const ncrvoyixPressConnector = createProxyConnector('ncrvoyix_press', 'NCR Voyix press', 'Retail Tech Vendors', 'NCR Voyix press');
const dieboldPressConnector = createProxyConnector('diebold_press', 'Diebold Nixdorf press', 'Retail Tech Vendors', 'Diebold Nixdorf press');
const zbraIrConnector = createProxyConnector('zbra_ir', 'Zebra Tech IR', 'Retail Tech Vendors', 'Zebra Tech IR');
const honeywellPssConnector = createProxyConnector('honeywell_pss', 'Honeywell PSS', 'Retail Tech Vendors', 'Honeywell PSS');
const manhIrConnector = createProxyConnector('manh_ir', 'Manhattan Associates IR', 'Retail Tech Vendors', 'Manhattan Associates IR');
const aptosBlogConnector = createProxyConnector('aptos_blog', 'Aptos retail blog', 'Retail Tech Vendors', 'Aptos retail blog');
const mi9BlogConnector = createProxyConnector('mi9_blog', 'Mi9 Retail blog', 'Retail Tech Vendors', 'Mi9 Retail blog');
const relexBlogConnector = createProxyConnector('relex_blog', 'RELEX Solutions blog', 'Retail Tech Vendors', 'RELEX Solutions blog');
const blueyonderBlogConnector = createProxyConnector('blueyonder_blog', 'Blue Yonder blog', 'Retail Tech Vendors', 'Blue Yonder blog');
const o9BlogConnector = createProxyConnector('o9_blog', 'o9 Solutions blog', 'Retail Tech Vendors', 'o9 Solutions blog');
const vusionNewsConnector = createProxyConnector('vusion_news', 'VusionGroup ESL', 'Retail Tech Vendors', 'VusionGroup ESL');
const pricerPressConnector = createProxyConnector('pricer_press', 'Pricer ESL press', 'Retail Tech Vendors', 'Pricer ESL press');
const traxNewsConnector = createProxyConnector('trax_news', 'Trax Retail news', 'Retail Tech Vendors', 'Trax Retail news');
const standardAiPressConnector = createProxyConnector('standard_ai_press', 'Standard AI press', 'Retail Tech Vendors', 'Standard AI press');
const aifiNewsConnector = createProxyConnector('aifi_news', 'AiFi press', 'Retail Tech Vendors', 'AiFi press');
const grabangoNewsConnector = createProxyConnector('grabango_news', 'Grabango', 'Retail Tech Vendors', 'Grabango');
const trigoBlogConnector = createProxyConnector('trigo_blog', 'Trigo Retail', 'Retail Tech Vendors', 'Trigo Retail');
const caperNewsConnector = createProxyConnector('caper_news', 'Caper Instacart', 'Retail Tech Vendors', 'Caper Instacart');
const focalBlogConnector = createProxyConnector('focal_blog', 'Focal Systems Walmart', 'Retail Tech Vendors', 'Focal Systems Walmart');
const pensaNewsConnector = createProxyConnector('pensa_news', 'Pensa Systems', 'Retail Tech Vendors', 'Pensa Systems');
const bossanovaNewsConnector = createProxyConnector('bossanova_news', 'Bossa Nova Robotics', 'Retail Tech Vendors', 'Bossa Nova Robotics');
const simbeNewsConnector = createProxyConnector('simbe_news', 'Simbe Robotics Tally', 'Retail Tech Vendors', 'Simbe Robotics Tally');
const braincorpBlogConnector = createProxyConnector('braincorp_blog', 'Brain Corp', 'Retail Tech Vendors', 'Brain Corp');
const ocadoNewsConnector = createProxyConnector('ocado_news', 'Ocado Technology', 'Retail Tech Vendors', 'Ocado Technology');
const autostoreInsightsConnector = createProxyConnector('autostore_insights', 'AutoStore press', 'Retail Tech Vendors', 'AutoStore press');
const symIrConnector = createProxyConnector('sym_ir', 'Symbotic IR', 'Retail Tech Vendors', 'Symbotic IR');
const greyorangeBlogConnector = createProxyConnector('greyorange_blog', 'GreyOrange', 'Retail Tech Vendors', 'GreyOrange');
const locusNewsConnector = createProxyConnector('locus_news', 'Locus Robotics', 'Retail Tech Vendors', 'Locus Robotics');
const sixRiverConnector = createProxyConnector('six_river', '6 River Systems Shopify', 'Retail Tech Vendors', '6 River Systems Shopify');
const berkshireGreyNewsConnector = createProxyConnector('berkshire_grey_news', 'Berkshire Grey', 'Retail Tech Vendors', 'Berkshire Grey');
const fabricBlogConnector = createProxyConnector('fabric_blog', 'Fabric micro-fulfillment', 'Retail Tech Vendors', 'Fabric micro-fulfillment');

// --- Payments & Checkout (34) ---
const paymentsDiveConnector = createProxyConnector('payments_dive', 'Payments Dive', 'Payments & Checkout', 'Payments Dive');
const digitalTransactionsConnector = createProxyConnector('digital_transactions', 'Digital Transactions', 'Payments & Checkout', 'Digital Transactions');
const americanbankerPaymentsConnector = createProxyConnector('americanbanker_payments', 'American Banker Payments', 'Payments & Checkout', 'American Banker Payments');
const glenbrookPaymentsConnector = createProxyConnector('glenbrook_payments', 'Glenbrook Payments News', 'Payments & Checkout', 'Glenbrook Payments News');
const mobilePaymentsTodayConnector = createProxyConnector('mobile_payments_today', 'Mobile Payments Today', 'Payments & Checkout', 'Mobile Payments Today');
const retailBankerIntlConnector = createProxyConnector('retail_banker_intl', 'Retail Banker International', 'Payments & Checkout', 'Retail Banker International');
const adyenPressConnector = createProxyConnector('adyen_press', 'Adyen press', 'Payments & Checkout', 'Adyen press');
const worldpayFisConnector = createProxyConnector('worldpay_fis', 'Worldpay FIS press', 'Payments & Checkout', 'Worldpay FIS press');
const fiservPressConnector = createProxyConnector('fiserv_press', 'Fiserv press', 'Payments & Checkout', 'Fiserv press');
const gpnIrConnector = createProxyConnector('gpn_ir', 'Global Payments IR', 'Payments & Checkout', 'Global Payments IR');
const visaBlogConnector = createProxyConnector('visa_blog', 'Visa Business News', 'Payments & Checkout', 'Visa Business News');
const mastercardPressConnector = createProxyConnector('mastercard_press', 'Mastercard Newsroom', 'Payments & Checkout', 'Mastercard Newsroom');
const amexPressConnector = createProxyConnector('amex_press', 'American Express Newsroom', 'Payments & Checkout', 'American Express Newsroom');
const discoverPressConnector = createProxyConnector('discover_press', 'Discover Newsroom', 'Payments & Checkout', 'Discover Newsroom');
const paypalNewsroomRssConnector = createProxyConnector('paypal_newsroom_rss', 'PayPal Newsroom RSS', 'Payments & Checkout', 'PayPal Newsroom RSS');
const afrmIrConnector = createProxyConnector('afrm_ir', 'Affirm IR', 'Payments & Checkout', 'Affirm IR');
const afterpayBlockConnector = createProxyConnector('afterpay_block', 'Afterpay Block press', 'Payments & Checkout', 'Afterpay Block press');
const sezlIrConnector = createProxyConnector('sezl_ir', 'Sezzle IR', 'Payments & Checkout', 'Sezzle IR');
const zipIrConnector = createProxyConnector('zip_ir', 'Zip Co IR', 'Payments & Checkout', 'Zip Co IR');
const splititPressConnector = createProxyConnector('splitit_press', 'Splitit press', 'Payments & Checkout', 'Splitit press');
const shopPayEditionsConnector = createProxyConnector('shop_pay_editions', 'Shop Pay Shopify Editions', 'Payments & Checkout', 'Shop Pay Shopify Editions');
const boltBlogConnector = createProxyConnector('bolt_blog', 'Bolt Commerce blog', 'Payments & Checkout', 'Bolt Commerce blog');
const checkoutPressConnector = createProxyConnector('checkout_press', 'Checkout.com press', 'Payments & Checkout', 'Checkout.com press');
const stripePressConnector = createProxyConnector('stripe_press', 'Stripe Press', 'Payments & Checkout', 'Stripe Press');
const mqIrConnector = createProxyConnector('mq_ir', 'Marqeta IR', 'Payments & Checkout', 'Marqeta IR');
const lithicBlogConnector = createProxyConnector('lithic_blog', 'Lithic blog', 'Payments & Checkout', 'Lithic blog');
const plaidNewsConnector = createProxyConnector('plaid_news', 'Plaid Newsroom', 'Payments & Checkout', 'Plaid Newsroom');
const rskdIrConnector = createProxyConnector('rskd_ir', 'Riskified IR', 'Payments & Checkout', 'Riskified IR');
const forterBlogConnector = createProxyConnector('forter_blog', 'Forter blog', 'Payments & Checkout', 'Forter blog');
const signifydBlogConnector = createProxyConnector('signifyd_blog', 'Signifyd blog', 'Payments & Checkout', 'Signifyd blog');
const pazeBlogConnector = createProxyConnector('paze_blog', 'Paze CMA wallet', 'Payments & Checkout', 'Paze CMA wallet');
const clearinghousePressConnector = createProxyConnector('clearinghouse_press', 'The Clearing House', 'Payments & Checkout', 'The Clearing House');
const fednowNewsConnector = createProxyConnector('fednow_news', 'Federal Reserve FedNow', 'Payments & Checkout', 'Federal Reserve FedNow');
const nilsonArchiveConnector = createProxyConnector('nilson_archive', 'Nilson Report headlines', 'Payments & Checkout', 'Nilson Report headlines');

// --- Retail Analysts (27) ---
const forresterCxIndexConnector = createProxyConnector('forrester_cx_index', 'Forrester CX Index', 'Retail Analysts', 'Forrester CX Index');
const idcRetailConnector = createProxyConnector('idc_retail', 'IDC Retail Insights', 'Retail Analysts', 'IDC Retail Insights');
const coresightResearchConnector = createProxyConnector('coresight_research', 'Coresight Research', 'Retail Analysts', 'Coresight Research');
const globaldataRetailConnector = createProxyConnector('globaldata_retail', 'GlobalData Retail', 'Retail Analysts', 'GlobalData Retail');
const wgsnInsightConnector = createProxyConnector('wgsn_insight', 'WGSN Insight', 'Retail Analysts', 'WGSN Insight');
const mintelRetailConnector = createProxyConnector('mintel_retail', 'Mintel Retail Reports', 'Retail Analysts', 'Mintel Retail Reports');
const euromonitorRetailConnector = createProxyConnector('euromonitor_retail', 'Euromonitor Retail', 'Retail Analysts', 'Euromonitor Retail');
const circanaInsightsConnector = createProxyConnector('circana_insights', 'Circana NPD Insights', 'Retail Analysts', 'Circana NPD Insights');
const niqInsightsConnector = createProxyConnector('niq_insights', 'NIQ NielsenIQ Insights', 'Retail Analysts', 'NIQ NielsenIQ Insights');
const circanaNewsConnector = createProxyConnector('circana_news', 'Circana news/press', 'Retail Analysts', 'Circana news/press');
const placerBlogConnector = createProxyConnector('placer_blog', 'Placer.ai blog', 'Retail Analysts', 'Placer.ai blog');
const placerResearchConnector = createProxyConnector('placer_research', 'Placer.ai research reports', 'Retail Analysts', 'Placer.ai research reports');
const safegraphBlogConnector = createProxyConnector('safegraph_blog', 'SafeGraph Insights', 'Retail Analysts', 'SafeGraph Insights');
const foursquareBlogConnector = createProxyConnector('foursquare_blog', 'Foursquare Insights', 'Retail Analysts', 'Foursquare Insights');
const earnestAnalyticsConnector = createProxyConnector('earnest_analytics', 'Earnest Analytics', 'Retail Analysts', 'Earnest Analytics');
const secondMeasureConnector = createProxyConnector('second_measure', 'Bloomberg Second Measure', 'Retail Analysts', 'Bloomberg Second Measure');
const yipitConnector = createProxyConnector('yipit', 'Yipit Data', 'Retail Analysts', 'Yipit Data');
const consumerEdgeConnector = createProxyConnector('consumer_edge', 'Consumer Edge Insights', 'Retail Analysts', 'Consumer Edge Insights');
const mScienceConnector = createProxyConnector('m_science', 'M Science', 'Retail Analysts', 'M Science');
const adobeDeiConnector = createProxyConnector('adobe_dei', 'Adobe Digital Economy Index', 'Retail Analysts', 'Adobe Digital Economy Index');
const salesforceShoppingIndexConnector = createProxyConnector('salesforce_shopping_index', 'Salesforce Shopping Index', 'Retail Analysts', 'Salesforce Shopping Index');
const shopifyCommerceTrendsConnector = createProxyConnector('shopify_commerce_trends', 'Shopify Commerce Trends', 'Retail Analysts', 'Shopify Commerce Trends');
const mastercardSpendingpulseConnector = createProxyConnector('mastercard_spendingpulse', 'Mastercard SpendingPulse', 'Retail Analysts', 'Mastercard SpendingPulse');
const visaSmiConnector = createProxyConnector('visa_smi', 'Visa Spending Momentum Index', 'Retail Analysts', 'Visa Spending Momentum Index');
const confBoardConsumerConnector = createProxyConnector('conf_board_consumer', 'Conference Board Consumer Confidence', 'Retail Analysts', 'Conference Board Consumer Confidence');
const umichConsumerSurveysConnector = createProxyConnector('umich_consumer_surveys', 'U Michigan Consumer Surveys', 'Retail Analysts', 'U Michigan Consumer Surveys');
const nrfEconomicReviewConnector = createProxyConnector('nrf_economic_review', 'NRF Monthly Economic Review', 'Retail Analysts', 'NRF Monthly Economic Review');

// --- Supply Chain (25) ---
const supplyChainDiveConnector = createProxyConnector('supply_chain_dive', 'Supply Chain Dive', 'Supply Chain', 'Supply Chain Dive');
const freightwavesConnector = createProxyConnector('freightwaves', 'FreightWaves', 'Supply Chain', 'FreightWaves');
const theLoadstarConnector = createProxyConnector('the_loadstar', 'The Loadstar', 'Supply Chain', 'The Loadstar');
const americanShipperConnector = createProxyConnector('american_shipper', 'American Shipper', 'Supply Chain', 'American Shipper');
const jocConnector = createProxyConnector('joc', 'Journal of Commerce', 'Supply Chain', 'Journal of Commerce');
const mmhConnector = createProxyConnector('mmh', 'Modern Materials Handling', 'Supply Chain', 'Modern Materials Handling');
const inboundLogisticsConnector = createProxyConnector('inbound_logistics', 'Inbound Logistics', 'Supply Chain', 'Inbound Logistics');
const logisticsBureauConnector = createProxyConnector('logistics_bureau', 'Logistics Bureau', 'Supply Chain', 'Logistics Bureau');
const mhlnewsConnector = createProxyConnector('mhlnews', 'Material Handling and Logistics', 'Supply Chain', 'Material Handling and Logistics');
const rlaNewsConnector = createProxyConnector('rla_news', 'Reverse Logistics Association', 'Supply Chain', 'Reverse Logistics Association');
const cscmpNewsConnector = createProxyConnector('cscmp_news', 'CSCMP news', 'Supply Chain', 'CSCMP news');
const nptcNewsConnector = createProxyConnector('nptc_news', 'Natl Private Truck Council', 'Supply Chain', 'Natl Private Truck Council');
const ataNewsConnector = createProxyConnector('ata_news', 'American Trucking Assn', 'Supply Chain', 'American Trucking Assn');
const lastMileBlogConnector = createProxyConnector('last_mile_blog', 'Last Mile Experts', 'Supply Chain', 'Last Mile Experts');
const pitneyShippingIndexConnector = createProxyConnector('pitney_shipping_index', 'Pitney Bowes Parcel Shipping Index', 'Supply Chain', 'Pitney Bowes Parcel Shipping Index');
const project44BlogConnector = createProxyConnector('project44_blog', 'Project44 blog', 'Supply Chain', 'Project44 blog');
const fourkitesBlogConnector = createProxyConnector('fourkites_blog', 'FourKites blog', 'Supply Chain', 'FourKites blog');
const flexeInsightsConnector = createProxyConnector('flexe_insights', 'Flexe insights', 'Supply Chain', 'Flexe insights');
const shipbobBlogConnector = createProxyConnector('shipbob_blog', 'ShipBob blog', 'Supply Chain', 'ShipBob blog');
const shipstationBlogConnector = createProxyConnector('shipstation_blog', 'ShipStation blog', 'Supply Chain', 'ShipStation blog');
const easyshipBlogConnector = createProxyConnector('easyship_blog', 'Easyship blog', 'Supply Chain', 'Easyship blog');
const xpoIrConnector = createProxyConnector('xpo_ir', 'XPO Logistics IR', 'Supply Chain', 'XPO Logistics IR');
const saiaIrConnector = createProxyConnector('saia_ir', 'Saia IR', 'Supply Chain', 'Saia IR');
const wernIrConnector = createProxyConnector('wern_ir', 'Werner Enterprises IR', 'Supply Chain', 'Werner Enterprises IR');
const chrwIrConnector = createProxyConnector('chrw_ir', 'C.H. Robinson IR', 'Supply Chain', 'C.H. Robinson IR');

// --- Specialty Verticals (23) ---
const beautyIndependentConnector = createProxyConnector('beauty_independent', 'Beauty Independent', 'Specialty Verticals', 'Beauty Independent');
const glossyBeautyConnector = createProxyConnector('glossy_beauty', 'Glossy Beauty', 'Specialty Verticals', 'Glossy Beauty');
const wwdBeautyConnector = createProxyConnector('wwd_beauty', 'WWD Beauty', 'Specialty Verticals', 'WWD Beauty');
const cewNewsConnector = createProxyConnector('cew_news', 'CEW Cosmetic Executive Women', 'Specialty Verticals', 'CEW Cosmetic Executive Women');
const happiRssConnector = createProxyConnector('happi_rss', 'Happi personal care', 'Specialty Verticals', 'Happi personal care');
const cosmeticsBusinessConnector = createProxyConnector('cosmetics_business', 'Cosmetics Business', 'Specialty Verticals', 'Cosmetics Business');
const chainDrugReviewConnector = createProxyConnector('chain_drug_review', 'Chain Drug Review', 'Specialty Verticals', 'Chain Drug Review');
const pharmacyTimesConnector = createProxyConnector('pharmacy_times', 'Pharmacy Times', 'Specialty Verticals', 'Pharmacy Times');
const shelbyReportConnector = createProxyConnector('shelby_report', 'Shelby Report grocery', 'Specialty Verticals', 'Shelby Report grocery');
const winsightGroceryConnector = createProxyConnector('winsight_grocery', 'Winsight Grocery Business', 'Specialty Verticals', 'Winsight Grocery Business');
const nacsOnlineConnector = createProxyConnector('nacs_online', 'NACS Convenience Online', 'Specialty Verticals', 'NACS Convenience Online');
const petBusinessConnector = createProxyConnector('pet_business', 'Pet Business', 'Specialty Verticals', 'Pet Business');
const petProductNewsConnector = createProxyConnector('pet_product_news', 'Pet Product News', 'Specialty Verticals', 'Pet Product News');
const sportsoneSourceConnector = createProxyConnector('sportsone_source', 'Sporting Goods Dealer', 'Specialty Verticals', 'Sporting Goods Dealer');
const sgbOnlineConnector = createProxyConnector('sgb_online', 'SGB Media sporting goods', 'Specialty Verticals', 'SGB Media sporting goods');
const footwearplusConnector = createProxyConnector('footwearplus', 'Footwear Plus', 'Specialty Verticals', 'Footwear Plus');
const toyBookConnector = createProxyConnector('toy_book', 'Toy Insider Toy Book', 'Specialty Verticals', 'Toy Insider Toy Book');
const toyHobbyAuConnector = createProxyConnector('toy_hobby_au', 'Toy and Hobby Retailer', 'Specialty Verticals', 'Toy and Hobby Retailer');
const hobbyMerchandiserConnector = createProxyConnector('hobby_merchandiser', 'Hobby Merchandiser', 'Specialty Verticals', 'Hobby Merchandiser');
const kidsTodayConnector = createProxyConnector('kids_today', 'Kids Today', 'Specialty Verticals', 'Kids Today');
const earnshawsConnector = createProxyConnector('earnshaws', 'Earnshaws kids fashion', 'Specialty Verticals', 'Earnshaws kids fashion');
const oiaOutdoorConnector = createProxyConnector('oia_outdoor', 'Outdoor Industry Association', 'Specialty Verticals', 'Outdoor Industry Association');
const outsideBusinessJournalConnector = createProxyConnector('outside_business_journal', 'Outside Business Journal Snews', 'Specialty Verticals', 'Outside Business Journal Snews');

// --- International Retail (25) ---
const retailWeekUkMainConnector = createProxyConnector('retail_week_uk_main', 'Retail Week UK', 'International Retail', 'Retail Week UK');
const drapersUkConnector = createProxyConnector('drapers_uk', 'Drapers UK fashion', 'International Retail', 'Drapers UK fashion');
const theGrocerUkConnector = createProxyConnector('the_grocer_uk', 'The Grocer UK', 'International Retail', 'The Grocer UK');
const retailGazetteConnector = createProxyConnector('retail_gazette', 'Retail Gazette UK', 'International Retail', 'Retail Gazette UK');
const internetRetailingEuConnector = createProxyConnector('internet_retailing_eu', 'Internet Retailing UK EU', 'International Retail', 'Internet Retailing UK EU');
const chargedretailConnector = createProxyConnector('chargedretail', 'Chargedretail UK', 'International Retail', 'Chargedretail UK');
const textilwirtschaftDeConnector = createProxyConnector('textilwirtschaft_de', 'TextilWirtschaft Germany', 'International Retail', 'TextilWirtschaft Germany');
const ehiDeConnector = createProxyConnector('ehi_de', 'EHI Retail Institute Germany', 'International Retail', 'EHI Retail Institute Germany');
const lsaConsoFrConnector = createProxyConnector('lsa_conso_fr', 'LSA Conso France', 'International Retail', 'LSA Conso France');
const retailDetailBeneluxConnector = createProxyConnector('retail_detail_benelux', 'Retail Detail Benelux', 'International Retail', 'Retail Detail Benelux');
const retailInsiderCaConnector = createProxyConnector('retail_insider_ca', 'Retail Insider Canada', 'International Retail', 'Retail Insider Canada');
const canadianGrocerConnector = createProxyConnector('canadian_grocer', 'Canadian Grocer', 'International Retail', 'Canadian Grocer');
const insideRetailAuConnector = createProxyConnector('inside_retail_au', 'Inside Retail Australia', 'International Retail', 'Inside Retail Australia');
const insideRetailAsiaConnector = createProxyConnector('inside_retail_asia', 'Inside Retail Asia', 'International Retail', 'Inside Retail Asia');
const cnaBusinessConnector = createProxyConnector('cna_business', 'Channel News Asia Business', 'International Retail', 'Channel News Asia Business');
const krasiaConnector = createProxyConnector('krasia', 'KrASIA Asia tech retail', 'International Retail', 'KrASIA Asia tech retail');
const techInAsiaConnector = createProxyConnector('tech_in_asia', 'Tech in Asia', 'International Retail', 'Tech in Asia');
const pandailyConnector = createProxyConnector('pandaily', 'Pandaily China', 'International Retail', 'Pandaily China');
const yicaiGlobalConnector = createProxyConnector('yicai_global', 'Yicai Global China', 'International Retail', 'Yicai Global China');
const caixinGlobalConnector = createProxyConnector('caixin_global', 'Caixin Global', 'International Retail', 'Caixin Global');
const nikkeiRetailConnector = createProxyConnector('nikkei_retail', 'Nikkei Asia Retail', 'International Retail', 'Nikkei Asia Retail');
const latamIntersectConnector = createProxyConnector('latam_intersect', 'LatAm Intersect Retail', 'International Retail', 'LatAm Intersect Retail');
const bloombergLineaConnector = createProxyConnector('bloomberg_linea', 'Bloomberg Linea LatAm', 'International Retail', 'Bloomberg Linea LatAm');
const dcBrazilConnector = createProxyConnector('dc_brazil', 'Diario do Comercio Brazil', 'International Retail', 'Diario do Comercio Brazil');
const retailAsiaMagConnector = createProxyConnector('retail_asia_mag', 'Retail Asia magazine', 'International Retail', 'Retail Asia magazine');

// --- Strategy Consultancies (24) ---
const kearneyConsumerConnector = createProxyConnector('kearney_consumer', 'Kearney Consumer Institute', 'Strategy Consultancies', 'Kearney Consumer Institute');
const occStrategyConnector = createProxyConnector('occ_strategy', 'OC&C Strategy Retail', 'Strategy Consultancies', 'OC&C Strategy Retail');
const alixpartnersRetailConnector = createProxyConnector('alixpartners_retail', 'AlixPartners Retail', 'Strategy Consultancies', 'AlixPartners Retail');
const rsmRetailConnector = createProxyConnector('rsm_retail', 'RSM Retail Insights', 'Strategy Consultancies', 'RSM Retail Insights');
const kpmgConsumerConnector = createProxyConnector('kpmg_consumer', 'KPMG Consumer Retail', 'Strategy Consultancies', 'KPMG Consumer Retail');
const eyFutureConsumerConnector = createProxyConnector('ey_future_consumer', 'EY Future Consumer Index', 'Strategy Consultancies', 'EY Future Consumer Index');
const capgeminiRetailConnector = createProxyConnector('capgemini_retail', 'Capgemini Retail Research', 'Strategy Consultancies', 'Capgemini Retail Research');
const wiproRetailConnector = createProxyConnector('wipro_retail', 'Wipro Retail Insights', 'Strategy Consultancies', 'Wipro Retail Insights');
const cognizantRetailConnector = createProxyConnector('cognizant_retail', 'Cognizant Retail', 'Strategy Consultancies', 'Cognizant Retail');
const publicisSapientRetailConnector = createProxyConnector('publicis_sapient_retail', 'Publicis Sapient Retail', 'Strategy Consultancies', 'Publicis Sapient Retail');
const materialPlusConnector = createProxyConnector('material_plus', 'LRW Material Plus', 'Strategy Consultancies', 'LRW Material Plus');
const lippincottConnector = createProxyConnector('lippincott', 'Lippincott', 'Strategy Consultancies', 'Lippincott');
const interbrandConnector = createProxyConnector('interbrand', 'Interbrand Best Global Brands', 'Strategy Consultancies', 'Interbrand Best Global Brands');
const siegelGaleConnector = createProxyConnector('siegel_gale', 'Siegel+Gale Simplicity Index', 'Strategy Consultancies', 'Siegel+Gale Simplicity Index');
const landorFitchConnector = createProxyConnector('landor_fitch', 'Landor & Fitch', 'Strategy Consultancies', 'Landor & Fitch');
const wolffolinsConnector = createProxyConnector('wolffolins', 'Wolff Olins', 'Strategy Consultancies', 'Wolff Olins');
const rgaFutureConnector = createProxyConnector('rga_future', 'R/GA FutureVision', 'Strategy Consultancies', 'R/GA FutureVision');
const hugeArticlesConnector = createProxyConnector('huge_articles', 'Huge', 'Strategy Consultancies', 'Huge');
const codeAndTheoryConnector = createProxyConnector('code_and_theory', 'Code and Theory', 'Strategy Consultancies', 'Code and Theory');
const wpromoteBlogConnector = createProxyConnector('wpromote_blog', 'Wpromote digital marketing', 'Strategy Consultancies', 'Wpromote digital marketing');
const tinuitiBlogConnector = createProxyConnector('tinuiti_blog', 'Tinuiti performance marketing', 'Strategy Consultancies', 'Tinuiti performance marketing');
const ctcCoachsCornerConnector = createProxyConnector('ctc_coachs_corner', 'Common Thread Coachs Corner', 'Strategy Consultancies', 'Common Thread Coachs Corner');
const shopifyPlusBlogConnector = createProxyConnector('shopify_plus_blog', 'Shopify Plus blog', 'Strategy Consultancies', 'Shopify Plus blog');
const commercetoolsBlogConnector = createProxyConnector('commercetools_blog', 'commercetools blog', 'Strategy Consultancies', 'commercetools blog');

// --- Retail Deal Intelligence (25) ---
const pymntsRetailConnector = createProxyConnector('pymnts_retail', 'PYMNTS Retail', 'Retail Deal Intelligence', 'PYMNTS Retail');
const bloombergRetailConnector = createProxyConnector('bloomberg_retail', 'Bloomberg Retail', 'Retail Deal Intelligence', 'Bloomberg Retail');
const reutersRetailConnector = createProxyConnector('reuters_retail', 'Reuters Retail and Consumer', 'Retail Deal Intelligence', 'Reuters Retail and Consumer');
const wsjRetailConnector = createProxyConnector('wsj_retail', 'WSJ Retail', 'Retail Deal Intelligence', 'WSJ Retail');
const ftRetailConnector = createProxyConnector('ft_retail', 'FT Retail and Consumer', 'Retail Deal Intelligence', 'FT Retail and Consumer');
const cnbcRetailConnector = createProxyConnector('cnbc_retail', 'CNBC Retail', 'Retail Deal Intelligence', 'CNBC Retail');
const forbesRetailConnector = createProxyConnector('forbes_retail', 'Forbes Retail', 'Retail Deal Intelligence', 'Forbes Retail');
const fortuneRetailConnector = createProxyConnector('fortune_retail', 'Fortune Retail', 'Retail Deal Intelligence', 'Fortune Retail');
const crainsChicagoConnector = createProxyConnector('crains_chicago', 'Crains Chicago Retail', 'Retail Deal Intelligence', 'Crains Chicago Retail');
const bostonGlobeBusinessConnector = createProxyConnector('boston_globe_business', 'Boston Globe Business', 'Retail Deal Intelligence', 'Boston Globe Business');
const theInformationCommerceConnector = createProxyConnector('the_information_commerce', 'The Information Commerce', 'Retail Deal Intelligence', 'The Information Commerce');
const axiosBusinessConnector = createProxyConnector('axios_business', 'Axios Business Retail', 'Retail Deal Intelligence', 'Axios Business Retail');
const modernRetailDailyConnector = createProxyConnector('modern_retail_daily', 'Modern Retail Daily', 'Retail Deal Intelligence', 'Modern Retail Daily');
const robinReportMainConnector = createProxyConnector('robin_report_main', 'Robin Report Substack', 'Retail Deal Intelligence', 'Robin Report Substack');
const puckLaurenShermanConnector = createProxyConnector('puck_lauren_sherman', 'Puck Lauren Sherman', 'Retail Deal Intelligence', 'Puck Lauren Sherman');
const offpricenewsConnector = createProxyConnector('offpricenews', 'Off Price News', 'Retail Deal Intelligence', 'Off Price News');
const retaildiveBankruptcyConnector = createProxyConnector('retaildive_bankruptcy', 'RetailDIVE Bankruptcy tracker', 'Retail Deal Intelligence', 'RetailDIVE Bankruptcy tracker');
const debtwireRetailConnector = createProxyConnector('debtwire_retail', 'Debtwire Retail', 'Retail Deal Intelligence', 'Debtwire Retail');
const pitchbookRetailConnector = createProxyConnector('pitchbook_retail', 'PitchBook Retail', 'Retail Deal Intelligence', 'PitchBook Retail');
const cbInsightsRetailConnector = createProxyConnector('cb_insights_retail', 'CB Insights Retail', 'Retail Deal Intelligence', 'CB Insights Retail');
const crunchbaseRetailConnector = createProxyConnector('crunchbase_retail', 'Crunchbase News Retail', 'Retail Deal Intelligence', 'Crunchbase News Retail');
const reorgResearchConnector = createProxyConnector('reorg_research', 'Reorg Bankruptcy Research', 'Retail Deal Intelligence', 'Reorg Bankruptcy Research');
const mergermarketConsumerConnector = createProxyConnector('mergermarket_consumer', 'Mergermarket Consumer', 'Retail Deal Intelligence', 'Mergermarket Consumer');
const dealstreetAsiaRetailConnector = createProxyConnector('dealstreet_asia_retail', 'DealStreetAsia Retail', 'Retail Deal Intelligence', 'DealStreetAsia Retail');
const retailtechInnovationHubConnector = createProxyConnector('retailtech_innovation_hub', 'Retail Tech Innovation Hub RSS', 'Retail Deal Intelligence', 'Retail Tech Innovation Hub RSS');

// --- Social Listening Pro (19) ---
const tiktokCreativeCenterConnector = createProxyConnector('tiktok_creative_center', 'TikTok Creative Center', 'Social Listening Pro', 'TikTok Creative Center');
const tiktokBusinessBlogMainConnector = createProxyConnector('tiktok_business_blog_main', 'TikTok for Business', 'Social Listening Pro', 'TikTok for Business');
const pinterestPredictsConnector = createProxyConnector('pinterest_predicts', 'Pinterest Predicts', 'Social Listening Pro', 'Pinterest Predicts');
const pinterestTrendsConnector = createProxyConnector('pinterest_trends', 'Pinterest Trends Tool', 'Social Listening Pro', 'Pinterest Trends Tool');
const trustpilotBlogMainConnector = createProxyConnector('trustpilot_blog_main', 'Trustpilot Business Insights', 'Social Listening Pro', 'Trustpilot Business Insights');
const trustpilotElectronicsConnector = createProxyConnector('trustpilot_electronics', 'Trustpilot reviews electronics', 'Social Listening Pro', 'Trustpilot reviews electronics');
const reviewsIoBlogConnector = createProxyConnector('reviews_io_blog', 'Reviews.io blog', 'Social Listening Pro', 'Reviews.io blog');
const yotpoInsightsBlogConnector = createProxyConnector('yotpo_insights_blog', 'Yotpo Insights', 'Social Listening Pro', 'Yotpo Insights');
const bazaarvoiceBlogConnector = createProxyConnector('bazaarvoice_blog', 'Bazaarvoice Resources', 'Social Listening Pro', 'Bazaarvoice Resources');
const powerreviewsInsightsConnector = createProxyConnector('powerreviews_insights', 'PowerReviews insights', 'Social Listening Pro', 'PowerReviews insights');
const glassdoorResearchConnector = createProxyConnector('glassdoor_research', 'Glassdoor Economic Research', 'Social Listening Pro', 'Glassdoor Economic Research');
const indeedHiringLabConnector = createProxyConnector('indeed_hiring_lab', 'Indeed Hiring Lab', 'Social Listening Pro', 'Indeed Hiring Lab');
const linkedinWorkforceConnector = createProxyConnector('linkedin_workforce', 'LinkedIn Workforce Reports', 'Social Listening Pro', 'LinkedIn Workforce Reports');
const comparablyNewsConnector = createProxyConnector('comparably_news', 'Comparably news', 'Social Listening Pro', 'Comparably news');
const dataAiInsightsConnector = createProxyConnector('data_ai_insights', 'data.ai retail apps', 'Social Listening Pro', 'data.ai retail apps');
const sensorTowerBlogConnector = createProxyConnector('sensor_tower_blog', 'Sensor Tower blog', 'Social Listening Pro', 'Sensor Tower blog');
const apptopiaBlogConnector = createProxyConnector('apptopia_blog', 'Apptopia retail apps', 'Social Listening Pro', 'Apptopia retail apps');
const similarwebBlogConnector = createProxyConnector('similarweb_blog', 'SimilarWeb Retail', 'Social Listening Pro', 'SimilarWeb Retail');
const comscoreBlogConnector = createProxyConnector('comscore_blog', 'Comscore Retail Reports', 'Social Listening Pro', 'Comscore Retail Reports');

// --- Brand Reddit (5) ---
const redditBombasConnector = createProxyConnector('reddit_bombas', 'Reddit r/Bombas', 'Brand Reddit', 'Reddit r/Bombas');
const redditAllbirdshoesConnector = createProxyConnector('reddit_allbirdshoes', 'Reddit r/AllbirdsShoes', 'Brand Reddit', 'Reddit r/AllbirdsShoes');
const redditPatagoniaBrandConnector = createProxyConnector('reddit_patagonia_brand', 'Reddit r/Patagonia', 'Brand Reddit', 'Reddit r/Patagonia');
const redditCostcoBrandConnector = createProxyConnector('reddit_costco_brand', 'Reddit r/Costco', 'Brand Reddit', 'Reddit r/Costco');
const redditTargetBrandConnector = createProxyConnector('reddit_target_brand', 'Reddit r/Target', 'Brand Reddit', 'Reddit r/Target');

// --- Retail Operator Reddit (25) ---
const redditRetailmanagersConnector = createProxyConnector('reddit_retailmanagers', 'Reddit r/RetailManagers', 'Retail Operator Reddit', 'Reddit r/RetailManagers');
const redditWalmartOpsConnector = createProxyConnector('reddit_walmart_ops', 'Reddit r/walmart', 'Retail Operator Reddit', 'Reddit r/walmart');
const redditHomedepotConnector = createProxyConnector('reddit_homedepot', 'Reddit r/HomeDepot', 'Retail Operator Reddit', 'Reddit r/HomeDepot');
const redditLowesConnector = createProxyConnector('reddit_lowes', 'Reddit r/Lowes', 'Retail Operator Reddit', 'Reddit r/Lowes');
const redditIkeaConnector = createProxyConnector('reddit_ikea', 'Reddit r/IKEA', 'Retail Operator Reddit', 'Reddit r/IKEA');
const redditHomegoodsConnector = createProxyConnector('reddit_homegoods', 'Reddit r/HomeGoods', 'Retail Operator Reddit', 'Reddit r/HomeGoods');
const redditPotterybarnConnector = createProxyConnector('reddit_potterybarn', 'Reddit r/PotteryBarn', 'Retail Operator Reddit', 'Reddit r/PotteryBarn');
const redditRestorationhardwareConnector = createProxyConnector('reddit_restorationhardware', 'Reddit r/restorationhardware', 'Retail Operator Reddit', 'Reddit r/restorationhardware');
const redditAskretailConnector = createProxyConnector('reddit_askretail', 'Reddit r/AskRetail', 'Retail Operator Reddit', 'Reddit r/AskRetail');
const redditFlippingConnector = createProxyConnector('reddit_flipping', 'Reddit r/Flipping', 'Retail Operator Reddit', 'Reddit r/Flipping');
const redditFrugalConnector = createProxyConnector('reddit_frugal', 'Reddit r/Frugal', 'Retail Operator Reddit', 'Reddit r/Frugal');
const redditPovertyfinanceConnector = createProxyConnector('reddit_povertyfinance', 'Reddit r/povertyfinance', 'Retail Operator Reddit', 'Reddit r/povertyfinance');
const redditDeclutterConnector = createProxyConnector('reddit_declutter', 'Reddit r/declutter', 'Retail Operator Reddit', 'Reddit r/declutter');
const redditMinimalismConnector = createProxyConnector('reddit_minimalism', 'Reddit r/minimalism', 'Retail Operator Reddit', 'Reddit r/minimalism');
const redditInteriordesignConnector = createProxyConnector('reddit_interiordesign', 'Reddit r/InteriorDesign', 'Retail Operator Reddit', 'Reddit r/InteriorDesign');
const redditMfaConnector = createProxyConnector('reddit_mfa', 'Reddit r/MaleFashionAdvice', 'Retail Operator Reddit', 'Reddit r/MaleFashionAdvice');
const redditFfaConnector = createProxyConnector('reddit_ffa', 'Reddit r/femalefashionadvice', 'Retail Operator Reddit', 'Reddit r/femalefashionadvice');
const redditSkincareaddictionConnector = createProxyConnector('reddit_skincareaddiction', 'Reddit r/SkincareAddiction', 'Retail Operator Reddit', 'Reddit r/SkincareAddiction');
const redditMakeupaddictionConnector = createProxyConnector('reddit_makeupaddiction', 'Reddit r/MakeupAddiction', 'Retail Operator Reddit', 'Reddit r/MakeupAddiction');
const redditSephoraConnector = createProxyConnector('reddit_sephora', 'Reddit r/Sephora', 'Retail Operator Reddit', 'Reddit r/Sephora');
const redditUltaConnector = createProxyConnector('reddit_ulta', 'Reddit r/Ulta', 'Retail Operator Reddit', 'Reddit r/Ulta');
const redditAmazonsellerOpsConnector = createProxyConnector('reddit_amazonseller_ops', 'Reddit r/AmazonSeller', 'Retail Operator Reddit', 'Reddit r/AmazonSeller');
const redditResellersConnector = createProxyConnector('reddit_resellers', 'Reddit r/Resellers', 'Retail Operator Reddit', 'Reddit r/Resellers');
const redditThriftstorehaulsConnector = createProxyConnector('reddit_thriftstorehauls', 'Reddit r/ThriftStoreHauls', 'Retail Operator Reddit', 'Reddit r/ThriftStoreHauls');
const redditHomeimprovementConnector = createProxyConnector('reddit_homeimprovement', 'Reddit r/HomeImprovement', 'Retail Operator Reddit', 'Reddit r/HomeImprovement');

// --- Open Data APIs (30) ---
const osmOverpassConnector = createProxyConnector('osm_overpass', 'OpenStreetMap Overpass', 'Open Data APIs', 'OpenStreetMap Overpass');
const overpassTurboConnector = createProxyConnector('overpass_turbo', 'Overpass Turbo', 'Open Data APIs', 'Overpass Turbo');
const yelpFusionConnector = createProxyConnector('yelp_fusion', 'Yelp Fusion API', 'Open Data APIs', 'Yelp Fusion API');
const googlePlacesConnector = createProxyConnector('google_places', 'Google Places API', 'Open Data APIs', 'Google Places API');
const foursquarePlacesConnector = createProxyConnector('foursquare_places', 'Foursquare Places API', 'Open Data APIs', 'Foursquare Places API');
const opencorporatesConnector = createProxyConnector('opencorporates', 'OpenCorporates', 'Open Data APIs', 'OpenCorporates');
const secEdgarSearchConnector = createProxyConnector('sec_edgar_search', 'SEC EDGAR full-text search', 'Open Data APIs', 'SEC EDGAR full-text search');
const secFinancialDataConnector = createProxyConnector('sec_financial_data', 'SEC Financial Statement Data', 'Open Data APIs', 'SEC Financial Statement Data');
const usptoPatentApiConnector = createProxyConnector('uspto_patent_api', 'USPTO Patent Search API', 'Open Data APIs', 'USPTO Patent Search API');
const usptoTsdrConnector = createProxyConnector('uspto_tsdr', 'USPTO TSDR Trademark API', 'Open Data APIs', 'USPTO TSDR Trademark API');
const openfdaRecallsConnector = createProxyConnector('openfda_recalls', 'FDA Adverse Events Recalls', 'Open Data APIs', 'FDA Adverse Events Recalls');
const cpscRecallsConnector = createProxyConnector('cpsc_recalls', 'CPSC Recalls API', 'Open Data APIs', 'CPSC Recalls API');
const oshaSearchConnector = createProxyConnector('osha_search', 'OSHA Establishment Search', 'Open Data APIs', 'OSHA Establishment Search');
const nlrbElectionConnector = createProxyConnector('nlrb_election', 'NLRB Election Case Search', 'Open Data APIs', 'NLRB Election Case Search');
const blsQcewConnector = createProxyConnector('bls_qcew', 'BLS QCEW employment', 'Open Data APIs', 'BLS QCEW employment');
const blsPpiConnector = createProxyConnector('bls_ppi', 'BLS Producer Price Index', 'Open Data APIs', 'BLS Producer Price Index');
const blsMxpConnector = createProxyConnector('bls_mxp', 'BLS Import Export Price Indexes', 'Open Data APIs', 'BLS Import Export Price Indexes');
const usitcDatawebConnector = createProxyConnector('usitc_dataweb', 'USITC DataWeb', 'Open Data APIs', 'USITC DataWeb');
const cbpAceConnector = createProxyConnector('cbp_ace', 'CBP ACE import data', 'Open Data APIs', 'CBP ACE import data');
const importgeniusBlogConnector = createProxyConnector('importgenius_blog', 'ImportGenius blog', 'Open Data APIs', 'ImportGenius blog');
const panjivaResearchConnector = createProxyConnector('panjiva_research', 'Panjiva research', 'Open Data APIs', 'Panjiva research');
const datasemblyBlogConnector = createProxyConnector('datasembly_blog', 'Datasembly insights', 'Open Data APIs', 'Datasembly insights');
const oecdConsumerConfidenceConnector = createProxyConnector('oecd_consumer_confidence', 'OECD Consumer Confidence', 'Open Data APIs', 'OECD Consumer Confidence');
const worldbankConsumptionPackConnector = createProxyConnector('worldbank_consumption_pack', 'World Bank Consumer Spending', 'Open Data APIs', 'World Bank Consumer Spending');
const uncomtradeConnector = createProxyConnector('uncomtrade', 'UN Comtrade', 'Open Data APIs', 'UN Comtrade');
const dataGovRetailIdxConnector = createProxyConnector('data_gov_retail_idx', 'data.gov retail datasets', 'Open Data APIs', 'data.gov retail datasets');
const eurostatRetailPackConnector = createProxyConnector('eurostat_retail_pack', 'Eurostat Retail Trade Volume', 'Open Data APIs', 'Eurostat Retail Trade Volume');
const onsRetailPackConnector = createProxyConnector('ons_retail_pack', 'UK ONS Retail Sales Index', 'Open Data APIs', 'UK ONS Retail Sales Index');
const statcanRetailConnector = createProxyConnector('statcan_retail', 'Statistics Canada Retail', 'Open Data APIs', 'Statistics Canada Retail');
const destatisRetailConnector = createProxyConnector('destatis_retail', 'Destatis German Retail', 'Open Data APIs', 'Destatis German Retail');


// Video Channels (Web-only)
const ytTwoMinPapersConnector = createProxyConnector('yt_two_minute_papers', 'Two Minute Papers', 'Video', 'Paper summaries');
const ytYannicConnector = createProxyConnector('yt_yannic_kilcher', 'Yannic Kilcher', 'Video', 'Paper deep-dives');
const ytLexFridmanConnector = createProxyConnector('yt_lex_fridman', 'Lex Fridman', 'Video', 'AI interviews');
const ytAiExplainedConnector = createProxyConnector('yt_ai_explained', 'AI Explained', 'Video', 'AI explainers');
const ytSentdexConnector = createProxyConnector('yt_sentdex', 'Sentdex', 'Video', 'Python ML tutorials');

// ============================================================
// REGISTRY — ALL CONNECTORS
// ============================================================

export const ALL_CONNECTORS: DataSourceConnector[] = [
    // News & Higher-Ed
    gdeltConnector, higherEdDiveConnector, insideHigherEdConnector, edSurgeConnector,
    hechingerConnector, campusTechConnector, theConversationConnector, openCampusConnector,
    // Academic
    openAlexConnector, semanticScholarConnector, crossrefConnector, doajConnector, europePmcConnector, coreConnector,
    dataciteConnector, zenodoConnector,
    // Education
    collegeScorecardConnector, ericConnector,
    // Economic
    worldBankConnector, fredConnector,
    // Government
    usaSpendingConnector, federalRegisterConnector, congressConnector, secEdgarConnector,
    // Open Data
    dataGovConnector, dataGovUkConnector, nycOpenDataConnector, dataGovAuConnector, dataGovCaConnector,
    euDataConnector, laOpenDataConnector, sfOpenDataConnector, texasDataConnector,
    // Social/Tech
    hackerNewsConnector,
    // Video
    youtubeSearchConnector, youtubeAiConnector, videoTranscriberConnector,
    // Web
    jinaReaderConnector,
    // AI News (21)
    mitTechReviewAiConnector, ieeeSpectrumAiConnector, ventureBeatAiConnector, techCrunchAiConnector,
    arsTechnicaAiConnector, wiredAiConnector, theVergeAiConnector, syncedReviewConnector,
    markTechPostConnector, kdNuggetsConnector, theGradientConnector, engadgetAiConnector,
    conversationAiConnector, analyticsVidhyaConnector, towardsAiConnector, alignmentForumConnector,
    importAiConnector, mlMasteryConnector, guardianAiConnector, zdnetAiConnector, registerMlConnector,
    // AI Lab Blogs (20)
    openAiBlogConnector, googleAiBlogConnector, deepMindBlogConnector, metaAiBlogConnector,
    microsoftResearchConnector, nvidiaDevBlogConnector, huggingFaceBlogConnector, anthropicBlogConnector,
    bairBlogConnector, appleMlConnector, amazonScienceConnector, awsMlConnector, ibmResearchConnector,
    salesforceAiConnector, cohereBlogConnector, allenAiConnector, stanfordHaiBlogConnector,
    databricksAiConnector, stabilityAiConnector, mistralAiConnector,
    // AI Research (10)
    arxivCsAiConnector, arxivCsLgConnector, arxivCsClConnector, arxivCsCvConnector, arxivCsRoConnector,
    arxivStatMlConnector, arxivCsIrConnector, arxivCsHcConnector, openReviewConnector, dblpConnector,
    // AI Models & Datasets (5)
    hfModelsConnector, hfDatasetsConnector, openMlConnector, kaggleConnector, papersWithCodeConnector,
    // AI Policy (8)
    brookingsAiConnector, stanfordHaiConnector, oecdAiConnector, effAiConnector, adaLovelaceConnector,
    aiNowConnector, csetConnector, partnershipAiConnector, nistAiConnector,
    // AI Communities (4)
    stackOverflowAiConnector, redditMlConnector, redditAiConnector, redditLlmConnector,
    // AI Code (2)
    githubReposConnector, githubCodeConnector,
    // AI Conferences (RSS + Web)
    neuripsConnector, aclAnthologyConnector,
    neuripsConfConnector, icmlConfConnector, iclrConfConnector, aaaiConfConnector, ijcaiConfConnector,
    cvprConfConnector, aclConfConnector, emnlpConfConnector, kddConfConnector, pmlrConnector,
    // Web-only AI News
    oreillyRadarConnector, dlAiBatchConnector, distillPubConnector, arxivSanityConnector,
    // Web-only Benchmarks & Leaderboards
    pwcSotaConnector, hfLeaderboardConnector, lmarenaConnector, mlperfConnector,
    helmConnector, tfDatasetsConnector, pytorchHubConnector, ollamaLibConnector,
    // Web-only Lab Research
    openaiResearchConnector, anthropicResearchConnector, googleResearchConnector,
    nvidiaResearchConnector, adobeResearchConnector, qualcommAiConnector, intelAiConnector,
    // Web-only Policy
    unescoAiConnector, nistAiWebConnector,
    // Web-only Communities
    hfForumsConnector, pytorchForumsConnector, tfForumConnector,
    // Web-only Code
    githubTrendingAiConnector, langchainDocsConnector, llamaindexDocsConnector,
    // Web-only Video
    ytTwoMinPapersConnector, ytYannicConnector, ytLexFridmanConnector, ytAiExplainedConnector, ytSentdexConnector,
    // === CHECKOUT-FUNDRAISING / CAUSE-COMMERCE INTELLIGENCE PACK (153) ===
    // Cause-Commerce Tech (23)
    shoppinggivesBlogConnector, shoppinggivesNewsConnector, pledgeToResourcesConnector,
    pledgeShopifyGiveGrowConnector, pledgelingFoundationConnector, roundupAppConnector,
    rounditupAmericaConnector, daffyResourcesConnector, daffyDeveloperConnector, daffyForWorkConnector,
    givelifyBlogConnector, givelifyPressConnector, charitybuzzConnector, charitybuzzPressConnector,
    stripeClimateConnector, frontierClimateConnector, stripeNewsroomConnector, klarnaNewsroomConnector,
    klarnaSustainabilityConnector, shopifyAppsRoundupConnector, shopifyEngineeringConnector,
    shopifyNewsConnector, salesforceOrgBlogConnector,
    // Cause-Brand Impact (25)
    wayfairNewsConnector, wayfairImpactConnector, wayfairIrConnector, bombasImpactConnector,
    bombasPressConnector, tomsImpactConnector, tomsNewsConnector, warbyBuyPairConnector, warbyPressConnector,
    allbirdsSustainabilityConnector, patagoniaActivismConnector, onepercentPlanetConnector,
    benjerryNewsConnector, honestCoConnector, lushCharityPotConnector, bodyShopActivismConnector,
    cotopaxiImpactConnector, thinxImpactConnector, parkerClayConnector, tentreeConnector,
    puraVidaCharityConnector, sandCloudCharityConnector, sevenlyConnector, newmansOwnConnector,
    redOrgConnector,
    // Donation Tech Platforms (27)
    donatestockBlogConnector, givingblockBlogConnector, engivenBlogConnector, gofundmePressConnector,
    donorschoosePressConnector, nfgBlogConnector, fidelityCharitableInsightsConnector,
    schwabCharitableInsightsConnector, vanguardCharitableInsightsConnector, nptrustDafReportConnector,
    chariotBlogConnector, pledge1pctNewsConnector, benevityBlogConnector, blackbaudBlogConnector,
    submittableBlogConnector, percentPledgeConnector, givingaBlogConnector, groundswellBlogConnector,
    millieBlogConnector, doublethedonationBlogConnector, virtueImpactBlogConnector, dailykarmaBlogConnector,
    beamImpactBlogConnector, getchangeBlogConnector, aspirationPressConnector, acornsPressConnector,
    opencollectiveBlogConnector,
    // Sustainability-at-Checkout (15)
    stripeClimateCustomersConnector, frontierClimateNewsConnector, ecocartBlogConnector,
    cloverlyBlogConnector, patchIoBlogConnector, pachamaBlogConnector, climateNeutralBlogConnector,
    watershedBlogConnector, persefoniBlogConnector, southPoleNewsConnector, carbonCreditsNewsConnector,
    trellisFeedConnector, sustainableBrandsConnector, triplePunditConnector, threeblMediaConnector,
    // Philanthropy Press (16)
    chroniclePhilanthropyFundraisingConnector, nonprofitTimesFeedConnector, insidePhilanthropyConnector,
    nonprofitQuarterlyConnector, philanthropyNewsDigestConnector, devexNewsConnector,
    allianceMagazineConnector, forbesNonprofitCouncilConnector, ntenConnector, nptechforgoodConnector,
    globalImpactBlogConnector, engageForGoodConnector, selfishGivingConnector, mrBenchmarksConnector,
    agitatorDonorvoiceConnector, charityNavigatorNewsConnector,
    // Retail News (6)
    pymntsConnector, thePaypersConnector, finextraConnector, tearsheetConnector, retailBrewConnector,
    businessOfHomeConnector,
    // Consumer/CSR Research (15)
    coneCommunicationsConnector, edelmanTrustConnector, porterNovelliConnector,
    kantarSustainabilityConnector, mckinseySustainabilityConnector, bcgCustomerConnector,
    accentureLifeTrendsConnector, pewReligionConnector, ypulseBlogConnector, morningConsultConnector,
    civicScienceConnector, numeratorBlogConnector, firstInsightConnector, ibmIbvSustainabilityConnector,
    wefStakeholderCapitalismConnector,
    // Government Data (9)
    irsEosConnector, irsCharitiesNewsConnector, candidApisConnector, nascoStateConnector,
    ncnArticlesConnector, beaPceConnector, dataGovCharitableConnector, ftcPressConnector,
    charityNavigatorMethodologyConnector,
    // Press Wires (7)
    prnewswireRetailConnector, prnewswireTechConnector, businesswireRetailConnector,
    businesswireOnlineRetailConnector, globenewswireRetailConnector, csrwireConnector, justmeans3blConnector,
    // Cause Reddit (10)
    redditNonprofitMainConnector, redditFundraisingConnector, redditCharitynavigatorConnector,
    redditEffectivealtruismConnector, redditSocialenterpriseConnector, redditSustainabilityMainConnector,
    redditEthicalfashionConnector, redditDtcmarketingConnector, redditWayfairConnector,
    redditPersonalfinanceDafConnector,
    // === 400-SOURCE RETAIL EXPANSION PACK (386) ===
    // Retail Competitive Set (50)
    wayfairSecConnector, wsmIrConnector, rhIrConnector, ikeaNewsroomConnector, ikeaAnnualConnector, 
    ashleyPressConnector, lzbIrConnector, hoftIrConnector, etdIrConnector, mlknIrConnector, scsIrConnector, 
    hniIrConnector, kirkIrConnector, athomePressConnector, biglotsIrConnector, tuesdaymorningPressConnector, 
    crateandbarrelPressConnector, arhsIrConnector, loveIrConnector, fndIrConnector, ttshIrConnector, 
    llFlooringPressConnector, byonIrConnector, tjxIrConnector, rostIrConnector, burlIrConnector, 
    walmartIrConnector, targetIrConnector, costIrConnector, amznIrConnector, hdIrConnector, lowIrConnector, 
    tscoIrConnector, harborfreightPressConnector, shwIrConnector, dgIrConnector, dltrIrConnector, 
    fiveIrConnector, macysIrConnector, kssIrConnector, jwnIrConnector, jcpenneyPressConnector, 
    belkPressConnector, ddsIrConnector, saksPressConnector, neimanPressConnector, tcsIrConnector, 
    bollandbranchPressConnector, brooklinenPressConnector, parachutePressConnector,
    // Home/Furniture Trade (39)
    furnitureTodayConnector, homeNewsNowConnector, hfnDigitalConnector, homeTextilesTodayConnector, 
    furnitureNewsUkConnector, casualLivingConnector, bigFurnitureGroupConnector, designersTodayConnector, 
    kbbOnlineConnector, kbdnConnector, hospitalityDesignConnector, adProConnector, adMainConnector, 
    interiorDesignMagConnector, dezeenConnector, wallpaperMagConnector, dwellConnector, 
    housebeautifulConnector, elledecorConnector, verandaConnector, apartmentTherapyConnector, 
    remodelistaConnector, houzzProConnector, theSpruceConnector, curbedVoxConnector, designboomConnector, 
    designMilkConnector, core77Connector, yankoDesignConnector, ahfaNewsConnector, hfaBlogConnector, 
    icfaNewsConnector, wfcaNewsConnector, asidNewsConnector, iidaNewsConnector, highpointMarketConnector, 
    vegasMarketConnector, andmoreNewsConnector, stumpFurnitureMaConnector,
    // Retail Tech Vendors (35)
    tostIrConnector, lspdIrConnector, sqIrConnector, cloverNewsConnector, ncrvoyixPressConnector, 
    dieboldPressConnector, zbraIrConnector, honeywellPssConnector, manhIrConnector, aptosBlogConnector, 
    mi9BlogConnector, relexBlogConnector, blueyonderBlogConnector, o9BlogConnector, vusionNewsConnector, 
    pricerPressConnector, traxNewsConnector, standardAiPressConnector, aifiNewsConnector, 
    grabangoNewsConnector, trigoBlogConnector, caperNewsConnector, focalBlogConnector, pensaNewsConnector, 
    bossanovaNewsConnector, simbeNewsConnector, braincorpBlogConnector, ocadoNewsConnector, 
    autostoreInsightsConnector, symIrConnector, greyorangeBlogConnector, locusNewsConnector, 
    sixRiverConnector, berkshireGreyNewsConnector, fabricBlogConnector,
    // Payments & Checkout (34)
    paymentsDiveConnector, digitalTransactionsConnector, americanbankerPaymentsConnector, 
    glenbrookPaymentsConnector, mobilePaymentsTodayConnector, retailBankerIntlConnector, adyenPressConnector, 
    worldpayFisConnector, fiservPressConnector, gpnIrConnector, visaBlogConnector, mastercardPressConnector, 
    amexPressConnector, discoverPressConnector, paypalNewsroomRssConnector, afrmIrConnector, 
    afterpayBlockConnector, sezlIrConnector, zipIrConnector, splititPressConnector, shopPayEditionsConnector, 
    boltBlogConnector, checkoutPressConnector, stripePressConnector, mqIrConnector, lithicBlogConnector, 
    plaidNewsConnector, rskdIrConnector, forterBlogConnector, signifydBlogConnector, pazeBlogConnector, 
    clearinghousePressConnector, fednowNewsConnector, nilsonArchiveConnector,
    // Retail Analysts (27)
    forresterCxIndexConnector, idcRetailConnector, coresightResearchConnector, globaldataRetailConnector, 
    wgsnInsightConnector, mintelRetailConnector, euromonitorRetailConnector, circanaInsightsConnector, 
    niqInsightsConnector, circanaNewsConnector, placerBlogConnector, placerResearchConnector, 
    safegraphBlogConnector, foursquareBlogConnector, earnestAnalyticsConnector, secondMeasureConnector, 
    yipitConnector, consumerEdgeConnector, mScienceConnector, adobeDeiConnector, 
    salesforceShoppingIndexConnector, shopifyCommerceTrendsConnector, mastercardSpendingpulseConnector, 
    visaSmiConnector, confBoardConsumerConnector, umichConsumerSurveysConnector, nrfEconomicReviewConnector,
    // Supply Chain (25)
    supplyChainDiveConnector, freightwavesConnector, theLoadstarConnector, americanShipperConnector, 
    jocConnector, mmhConnector, inboundLogisticsConnector, logisticsBureauConnector, mhlnewsConnector, 
    rlaNewsConnector, cscmpNewsConnector, nptcNewsConnector, ataNewsConnector, lastMileBlogConnector, 
    pitneyShippingIndexConnector, project44BlogConnector, fourkitesBlogConnector, flexeInsightsConnector, 
    shipbobBlogConnector, shipstationBlogConnector, easyshipBlogConnector, xpoIrConnector, saiaIrConnector, 
    wernIrConnector, chrwIrConnector,
    // Specialty Verticals (23)
    beautyIndependentConnector, glossyBeautyConnector, wwdBeautyConnector, cewNewsConnector, 
    happiRssConnector, cosmeticsBusinessConnector, chainDrugReviewConnector, pharmacyTimesConnector, 
    shelbyReportConnector, winsightGroceryConnector, nacsOnlineConnector, petBusinessConnector, 
    petProductNewsConnector, sportsoneSourceConnector, sgbOnlineConnector, footwearplusConnector, 
    toyBookConnector, toyHobbyAuConnector, hobbyMerchandiserConnector, kidsTodayConnector, 
    earnshawsConnector, oiaOutdoorConnector, outsideBusinessJournalConnector,
    // International Retail (25)
    retailWeekUkMainConnector, drapersUkConnector, theGrocerUkConnector, retailGazetteConnector, 
    internetRetailingEuConnector, chargedretailConnector, textilwirtschaftDeConnector, ehiDeConnector, 
    lsaConsoFrConnector, retailDetailBeneluxConnector, retailInsiderCaConnector, canadianGrocerConnector, 
    insideRetailAuConnector, insideRetailAsiaConnector, cnaBusinessConnector, krasiaConnector, 
    techInAsiaConnector, pandailyConnector, yicaiGlobalConnector, caixinGlobalConnector, 
    nikkeiRetailConnector, latamIntersectConnector, bloombergLineaConnector, dcBrazilConnector, 
    retailAsiaMagConnector,
    // Strategy Consultancies (24)
    kearneyConsumerConnector, occStrategyConnector, alixpartnersRetailConnector, rsmRetailConnector, 
    kpmgConsumerConnector, eyFutureConsumerConnector, capgeminiRetailConnector, wiproRetailConnector, 
    cognizantRetailConnector, publicisSapientRetailConnector, materialPlusConnector, lippincottConnector, 
    interbrandConnector, siegelGaleConnector, landorFitchConnector, wolffolinsConnector, rgaFutureConnector, 
    hugeArticlesConnector, codeAndTheoryConnector, wpromoteBlogConnector, tinuitiBlogConnector, 
    ctcCoachsCornerConnector, shopifyPlusBlogConnector, commercetoolsBlogConnector,
    // Retail Deal Intelligence (25)
    pymntsRetailConnector, bloombergRetailConnector, reutersRetailConnector, wsjRetailConnector, 
    ftRetailConnector, cnbcRetailConnector, forbesRetailConnector, fortuneRetailConnector, 
    crainsChicagoConnector, bostonGlobeBusinessConnector, theInformationCommerceConnector, 
    axiosBusinessConnector, modernRetailDailyConnector, robinReportMainConnector, puckLaurenShermanConnector, 
    offpricenewsConnector, retaildiveBankruptcyConnector, debtwireRetailConnector, pitchbookRetailConnector, 
    cbInsightsRetailConnector, crunchbaseRetailConnector, reorgResearchConnector, 
    mergermarketConsumerConnector, dealstreetAsiaRetailConnector, retailtechInnovationHubConnector,
    // Social Listening Pro (19)
    tiktokCreativeCenterConnector, tiktokBusinessBlogMainConnector, pinterestPredictsConnector, 
    pinterestTrendsConnector, trustpilotBlogMainConnector, trustpilotElectronicsConnector, 
    reviewsIoBlogConnector, yotpoInsightsBlogConnector, bazaarvoiceBlogConnector, 
    powerreviewsInsightsConnector, glassdoorResearchConnector, indeedHiringLabConnector, 
    linkedinWorkforceConnector, comparablyNewsConnector, dataAiInsightsConnector, sensorTowerBlogConnector, 
    apptopiaBlogConnector, similarwebBlogConnector, comscoreBlogConnector,
    // Brand Reddit (5)
    redditBombasConnector, redditAllbirdshoesConnector, redditPatagoniaBrandConnector, 
    redditCostcoBrandConnector, redditTargetBrandConnector,
    // Retail Operator Reddit (25)
    redditRetailmanagersConnector, redditWalmartOpsConnector, redditHomedepotConnector, redditLowesConnector, 
    redditIkeaConnector, redditHomegoodsConnector, redditPotterybarnConnector, 
    redditRestorationhardwareConnector, redditAskretailConnector, redditFlippingConnector, 
    redditFrugalConnector, redditPovertyfinanceConnector, redditDeclutterConnector, 
    redditMinimalismConnector, redditInteriordesignConnector, redditMfaConnector, redditFfaConnector, 
    redditSkincareaddictionConnector, redditMakeupaddictionConnector, redditSephoraConnector, 
    redditUltaConnector, redditAmazonsellerOpsConnector, redditResellersConnector, 
    redditThriftstorehaulsConnector, redditHomeimprovementConnector,
    // Open Data APIs (30)
    osmOverpassConnector, overpassTurboConnector, yelpFusionConnector, googlePlacesConnector, 
    foursquarePlacesConnector, opencorporatesConnector, secEdgarSearchConnector, secFinancialDataConnector, 
    usptoPatentApiConnector, usptoTsdrConnector, openfdaRecallsConnector, cpscRecallsConnector, 
    oshaSearchConnector, nlrbElectionConnector, blsQcewConnector, blsPpiConnector, blsMxpConnector, 
    usitcDatawebConnector, cbpAceConnector, importgeniusBlogConnector, panjivaResearchConnector, 
    datasemblyBlogConnector, oecdConsumerConfidenceConnector, worldbankConsumptionPackConnector, 
    uncomtradeConnector, dataGovRetailIdxConnector, eurostatRetailPackConnector, onsRetailPackConnector, 
    statcanRetailConnector, destatisRetailConnector,
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
