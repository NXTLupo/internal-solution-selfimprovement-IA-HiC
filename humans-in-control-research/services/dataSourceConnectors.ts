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
