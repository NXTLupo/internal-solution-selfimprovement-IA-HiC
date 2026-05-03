/**
 * SourceCoverage.tsx — Per-category visibility panel.
 *
 * Shows the user EXACTLY what's happening for every source category they
 * toggled on. Three signals per category:
 *   1. Items collected — count + top-rated chunk preview
 *   2. Citation count in current chat — how many times the model has
 *      cited this category in its responses
 *   3. CATEGORY GAP markers — categories the model self-flagged as having
 *      no usable content for the current question
 *
 * The user has been blind to half of the data flow for months. This panel
 * is the visibility surface that makes every other improvement testable.
 */

import React, { useMemo } from 'react';
import type { ChatMessage } from '../services/corpusChatService';

interface ActiveCategory {
    name: string;
    sourceCount: number;
    itemCount: number;
}

interface Props {
    activeCategories: ActiveCategory[];
    chatMessages: ChatMessage[];
    liveSourceResults?: Array<{ source?: string; id?: string; items?: any[] }>;
    isOpen: boolean;
    onClose: () => void;
}

// Bucket the 920+ source IDs into the ~47 user-facing category names
// Mirrors the layout the user toggles in the data-collection UI.
const CATEGORY_PATTERNS: Record<string, RegExp> = {
    'Higher-Ed News':            /^(inside_higher_ed|chronicle_higher_ed|diverse_higher_ed|edsurge|hechinger|higher_ed_dive|open_campus|pie_news|the_conversation_edu|university_business|university_world_news|campus_tech)/i,
    'Global News (GDELT)':       /^gdelt/i,
    'Academic Papers':           /^(openalex|crossref|semantic_scholar|doaj|europe_pmc|core_ac|datacite|zenodo)/i,
    'Education Data':            /^(college_scorecard|eric|ipeds|urban_education_data)/i,
    'Economic Data':             /^(worldbank|fred|bls|imf|oecd_data)/i,
    'Government':                /^(usaspending|federal_register|sec_edgar|congress|aau_news|ace_news|aplu_news|agb|nacubo|ncn_articles|nist_ai|nsf_herd|sheeo|thecb|schev|ftc_press|irs_charities|charity_navigator_methodology|fep_reports|giving_usa|ibhe|naicu|bea_pce|nasco_state|nccs_urban|ipeds_finance|lilly_philanthropy|data_gov_charitable|candid_apis|irs_eos|afp_research)/i,
    'Open Data Portals':         /^(data_gov|nyc_open_data|chicago_data|california_data|la_open_data|sf_open_data|texas_open_data|eu_data_portal)/i,
    'Tech & Social':             /^hackernews/i,
    'YouTube Videos':            /^(youtube|yt_)/i,
    'Social Listening':          /^(reddit_|trustpilot|playstore)/i,
    'AI News & Labs':            /^(mit_tech_review_ai|ieee_spectrum_ai|venturebeat_ai|techcrunch_ai|wired_ai|ars_technica_ai|the_verge_ai|zdnet_ai|the_register_ml|the_guardian_ai|synced_review|marktechpost|kdnuggets|the_gradient|engadget_ai|the_conversation_ai|analytics_vidhya|towards_ai|ai_alignment_forum|import_ai|ml_mastery|oreilly_radar|deeplearning_ai_batch|distill_pub|arxiv_sanity|openai_blog|google_ai_blog|deepmind_blog|meta_ai_blog|microsoft_research|nvidia_dev_blog|huggingface_blog|anthropic_blog|stability_ai|mistral_ai|bair_blog|apple_ml|amazon_science|aws_ml_blog|ibm_research|salesforce_ai|cohere_blog|allen_ai|stanford_hai|databricks_ai|openai_research|anthropic_research|google_research|nvidia_research|adobe_research|qualcomm_ai|intel_ai|brookings_ai|oecd_ai|eff_ai|ada_lovelace|ai_now_institute|cset_georgetown|partnership_on_ai|unesco_ai)/i,
    'AI Research & Code':        /^(arxiv_|openreview|dblp|hf_models|hf_datasets|openml|kaggle_datasets|paperswithcode|papers_with_code_sota|hf_leaderboard|lmarena|mlperf|helm_stanford|tf_datasets|pytorch_hub|ollama_library|github_repos|github_trending|langchain_docs|llamaindex_docs|reddit_ml|reddit_ai|reddit_llm|stackoverflow_ai|hf_forums|pytorch_forums|tf_forum|neurips_proc|acl_anthology|neurips_conf|icml_conf|iclr_conf|aaai_conf|ijcai_conf|cvpr_conf|acl_conf|emnlp_conf|kdd_conf|pmlr_proc)/i,
    'Philanthropy':              /^(propublica_np|every_org|cra_t3010|acnc_au|charities_ie|irs_990|chronicle_philanthropy|nonprofit_times|center_effective_philanthropy|rnl_blog|gravyty_blog|fundraiseup_blog|philanthropy_news_digest|nonprofit_quarterly|ncfp|case_advancement|higheredjobs_alumni|evertrue|givecampus)/i,
    'Retail News':               /^(retail_dive|ris_news|modern_retail|wwd|sourcing_journal)/i,
    'eCommerce & D2C':           /^(shopify|bigcommerce|future_commerce|klaviyo|2pm)/i,
    'Digital Marketing':         /^(hubspot|martech|adweek|search_engine_land|moz_blog|ahrefs)/i,
    'Social Media Marketing':    /^(social_media_today|hootsuite|sprout_social|buffer_resources|influencer_hub|jeff_bullas|later_blog|brian_solis)/i,
    'Consumer Insights':         /^(pew|mckinsey|bcg|bain|deloitte|gartner|statista|think_with_google)/i,
    'Retail Tech':               /^(retailnext|square|lightspeed|salesforce_commerce|adobe_dei|aws_retail)/i,
    'Retail Economic Data':      /^(census_marts|bea|bls_cpi|fred_retail|usda|ons|eurostat)/i,
    'Search & Trends APIs':      /^(newsapi|guardian|nyt|wikipedia|duckduckgo|common_crawl|search_engine_watch|wordstream)/i,
    'Social & Sentiment':        /^(reddit_json|pushshift|mastodon|bluesky|product_hunt|threads)/i,
    'Reddit: Retail/Marketing':  /^reddit_(retail|ecommerce|seo|ppc|dtcmarketing|entrepreneur)/i,
    'Checkout-Charity Tech':     /^(shoppinggives|pledge_to|daffy|givelify|klarna_giving|stripe_climate_checkout|shopify_round_up)/i,
    'Cause-Brand Impact':        /^(wayfair_impact|bombas|toms|warby_parker|allbirds|patagonia_news|1_for_planet|newmans_own)/i,
    'Donation Platforms':        /^(gofundme|donorschoose|benevity|blackbaud|fidelity_charitable|schwab_daf|beam|acorns)/i,
    'Climate-at-Checkout':       /^(stripe_climate|frontier|ecocart|cloverly|patch|pachama|watershed|triplepundit)/i,
    'Philanthropy Press':        /^(chronicle_phil|nonprofit_times|inside_philanthropy|ssir|devex|engage_for_good|mr_benchmarks)/i,
    'Payments & Fintech Press':  /^(pymnts|the_paypers|finextra|tearsheet|retail_brew|business_of_home)/i,
    'CSR & Consumer Research':   /^(cone|edelman|porter_novelli|kantar|mckinsey_sustainability|bcg_csr|accenture|ypulse|ibm_ibv|wef)/i,
    'Charity Reg & Compliance':  /^(irs_tax_exempt|propublica_990|candid|nasco|charity_navigator|ftc_charity)/i,
    'Press Wires (Cause)':       /^(pr_newswire|business_wire|globenewswire|csrwire|3bl)/i,
    'Reddit: Cause/Nonprofit':   /^reddit_(nonprofit|fundraising|effectivealtruism|ethicalfashion|wayfair)/i,
    'Retail Competitive Set':    /^(williams_sonoma|rh_brand|millerknoll|steelcase|walmart|target|costco|amazon_brand|home_depot|lowes|macys|nordstrom|ikea_brand|wayfair_brand)/i,
    'Home/Furniture Trade':      /^(furniture_today|home_news_now|hfn|business_of_home|dezeen|architectural_digest|dwell|apartment_therapy|houzz|ahfa)/i,
    'Retail Tech Vendors':       /^(toast|square_block|ncr_voyix|zebra|manhattan_associates|blue_yonder|autostore|symbotic|aifi|standard_ai)/i,
    'Payments & Checkout':       /^(adyen|worldpay|fiserv|visa|mastercard|paypal|affirm|klarna|sezzle|stripe_pay|marqeta|plaid|riskified)/i,
    'Retail Analysts':           /^(forrester|gartner_retail|idc|coresight|mintel|euromonitor|circana|placer_ai|safegraph|mastercard_spending_pulse|nrf)/i,
    'Supply Chain':              /^(supply_chain_dive|freightwaves|loadstar|joc|modern_materials_handling|project44|fourkites|shipbob|xpo|ch_robinson)/i,
    'Specialty Verticals':       /^(beauty_independent|drug_store_news|supermarket_news|grocery_dive|csp_daily|pet_business|sgb|footwear_plus|outdoor_industry)/i,
    'International Retail':      /^(retail_week_uk|drapers|internet_retailing_uk|retail_insider_canada|inside_retail_asia|krasia|caixin|nikkei_asia)/i,
    'Strategy Consultancies':    /^(kearney|occ|alixpartners|kpmg|ey_future|capgemini|lippincott|interbrand|common_thread|shopify_plus)/i,
    'Retail Deal Intelligence':  /^(pymnts_retail|bloomberg|reuters|wsj|ft_retail|cnbc|forbes|robin_report|modern_retail_daily|pitchbook|cb_insights|reorg)/i,
    'Social Listening Pro':      /^(tiktok_creative|pinterest_predicts|trustpilot_pro|bazaarvoice|glassdoor_research|indeed_hiring_lab|sensor_tower|similarweb)/i,
    'Brand Reddit':              /^reddit_(bombas|allbirdsshoes|patagonia|costco|target_brand)/i,
    'Retail Operator Reddit':    /^reddit_(retailmanagers|walmart|homedepot|lowes|ikea|sephora|ulta|homeimprovement)/i,
    'Open Data APIs':            /^(uspto|openstreetmap|opencorporates|fda_recalls|cpsc_recalls|bls_ppi|usitc_dataweb|oecd_data)/i,
    'Web Extracts (Jina)':       /^(jina|web_extract:|news\.|finance\.|give\.|president\.|experiencepoweredby\.|projects\.propublica)/i,
    'Uploaded Documents':        /^(client[_-]uploads?|upload|user[_-]upload)/i,
};

function categorizeSource(sourceName: string): string {
    const trimmed = (sourceName || '').trim();
    if (!trimmed) return 'Uncategorized';
    for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
        if (pattern.test(trimmed)) return cat;
    }
    return 'Other';
}

// Count how many times each category was cited in the chat transcript.
// Looks for [SOURCE_NAME: "..."] style citations and CATEGORY GAP markers.
function countCategoryCitations(messages: ChatMessage[]): {
    citationsByCategory: Record<string, number>;
    gapsByCategory: Record<string, number>;
} {
    const citationsByCategory: Record<string, number> = {};
    const gapsByCategory: Record<string, number> = {};
    const citationRe = /\[([^:\]]+):\s*"[^"]*"\]/g;
    const gapRe = /CATEGORY\s*GAP\s*:\s*([^\n—-]+)/gi;

    for (const msg of messages) {
        if (msg.role !== 'assistant') continue;
        const text = msg.content || '';
        let m: RegExpExecArray | null;
        while ((m = citationRe.exec(text)) !== null) {
            const cat = categorizeSource(m[1]);
            citationsByCategory[cat] = (citationsByCategory[cat] || 0) + 1;
        }
        gapRe.lastIndex = 0;
        while ((m = gapRe.exec(text)) !== null) {
            const cat = m[1].trim();
            gapsByCategory[cat] = (gapsByCategory[cat] || 0) + 1;
        }
    }

    return { citationsByCategory, gapsByCategory };
}

export const SourceCoverage: React.FC<Props> = ({
    activeCategories,
    chatMessages,
    liveSourceResults = [],
    isOpen,
    onClose,
}) => {
    // Aggregate live sources into category buckets
    const categoryRollup = useMemo(() => {
        const buckets: Record<string, { items: number; sources: Set<string>; sample?: string }> = {};
        for (const r of liveSourceResults) {
            const sourceId = r.source || r.id || 'unknown';
            const cat = categorizeSource(sourceId);
            if (!buckets[cat]) buckets[cat] = { items: 0, sources: new Set() };
            buckets[cat].items += (r.items?.length || 0);
            buckets[cat].sources.add(sourceId);
            if (!buckets[cat].sample && r.items && r.items.length > 0) {
                const first = r.items[0];
                buckets[cat].sample = first?.title || first?.heading || '';
            }
        }
        return buckets;
    }, [liveSourceResults]);

    const { citationsByCategory, gapsByCategory } = useMemo(
        () => countCategoryCitations(chatMessages),
        [chatMessages]
    );

    // Build the unified row list — every category visible
    const rows = useMemo(() => {
        const allCats = new Set<string>([
            ...Object.keys(categoryRollup),
            ...Object.keys(citationsByCategory),
            ...Object.keys(gapsByCategory),
        ]);
        return Array.from(allCats).map(cat => ({
            category: cat,
            items: categoryRollup[cat]?.items || 0,
            sourceCount: categoryRollup[cat]?.sources.size || 0,
            sample: categoryRollup[cat]?.sample || '',
            citations: citationsByCategory[cat] || 0,
            gaps: gapsByCategory[cat] || 0,
        })).sort((a, b) => {
            // Sort by: cited > has-content-but-not-cited > empty
            const aTier = a.citations > 0 ? 0 : a.items > 0 ? 1 : 2;
            const bTier = b.citations > 0 ? 0 : b.items > 0 ? 1 : 2;
            if (aTier !== bTier) return aTier - bTier;
            return b.items - a.items;
        });
    }, [categoryRollup, citationsByCategory, gapsByCategory]);

    if (!isOpen) return null;

    const totalCategoriesWithContent = rows.filter(r => r.items > 0).length;
    const totalCategoriesCited = rows.filter(r => r.citations > 0).length;
    const totalCategoriesGap = rows.filter(r => r.gaps > 0).length;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '600px',
            maxWidth: '100vw',
            background: '#0D0D0D',
            color: '#fff',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            overflow: 'auto',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <div style={{
                position: 'sticky',
                top: 0,
                background: '#0D0D0D',
                borderBottom: '1px solid #2a2a2a',
                padding: '20px',
                zIndex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#B8B800' }}>SOURCE COVERAGE AUDIT</div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', color: '#999', border: 'none', cursor: 'pointer', fontSize: 18 }}
                        aria-label="Close source coverage panel"
                    >×</button>
                </div>
                <div style={{ display: 'flex', gap: 24, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    <div>
                        <div style={{ color: '#666', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.15em' }}>With content</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#B8B800' }}>{totalCategoriesWithContent}</div>
                    </div>
                    <div>
                        <div style={{ color: '#666', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.15em' }}>Cited in chat</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#00B7C3' }}>{totalCategoriesCited}</div>
                    </div>
                    <div>
                        <div style={{ color: '#666', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.15em' }}>Marked gap</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#CC6644' }}>{totalCategoriesGap}</div>
                    </div>
                </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
                    Every category the user toggled ON. Color-coded by status:
                    <span style={{ color: '#00B7C3', marginLeft: 8 }}>● cited</span> ·
                    <span style={{ color: '#B8B800', marginLeft: 8 }}>● has content</span> ·
                    <span style={{ color: '#CC6644', marginLeft: 8 }}>● flagged gap</span> ·
                    <span style={{ color: '#555', marginLeft: 8 }}>● empty</span>
                </div>

                {rows.map(row => {
                    const status = row.citations > 0 ? 'cited' :
                                   row.gaps > 0 ? 'gap' :
                                   row.items > 0 ? 'has-content' : 'empty';
                    const accent = status === 'cited' ? '#00B7C3'
                        : status === 'gap' ? '#CC6644'
                        : status === 'has-content' ? '#B8B800'
                        : '#555';
                    return (
                        <div key={row.category} style={{
                            padding: '14px 0',
                            borderBottom: '1px solid #1f1f1f',
                            display: 'grid',
                            gridTemplateColumns: '4px 1fr auto',
                            gap: 12,
                            alignItems: 'start',
                        }}>
                            <div style={{ width: 4, alignSelf: 'stretch', background: accent }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                                    {row.category}
                                </div>
                                {row.sample && (
                                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, marginBottom: 4 }}>
                                        Top item: "{row.sample.slice(0, 80)}{row.sample.length > 80 ? '…' : ''}"
                                    </div>
                                )}
                                <div style={{ fontSize: 10, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {row.items} items · {row.sourceCount} source{row.sourceCount === 1 ? '' : 's'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {row.citations > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#00B7C3', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {row.citations} cite{row.citations === 1 ? '' : 's'}
                                    </span>
                                )}
                                {row.gaps > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#CC6644', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {row.gaps} gap{row.gaps === 1 ? '' : 's'}
                                    </span>
                                )}
                                {row.citations === 0 && row.gaps === 0 && row.items > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#888' }}>not yet cited</span>
                                )}
                                {row.items === 0 && row.citations === 0 && row.gaps === 0 && (
                                    <span style={{ fontSize: 10, color: '#444' }}>—</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
