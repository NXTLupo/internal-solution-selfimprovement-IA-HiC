/**
 * verticalRegistry - composable research-vertical skills.
 *
 * The April 2026 research consensus argued for replacing the hardcoded lens →
 * sources switch statement with a skill mesh: each vertical declares its own
 * canonical sources, named entities, and exclusion rules. Briefs that touch
 * multiple verticals (e.g. higher-ed × fundraising) compose their skills.
 *
 * This file defines the vertical skills as TypeScript constants for fast
 * iteration. They can migrate into skill-manifest.json entries later when
 * the full Anthropic-Skills-style loader pattern is wired (Tier 3).
 *
 * The resolver is ADDITIVE to the existing analyticalLensService:
 *   - lens service still runs on raw goal text (no brief required)
 *   - vertical resolver runs ON TOP using the parsed brief's verticals[] tags
 *   - their contributions are unioned: more sources, more named entities,
 *     more exclusion rules - never override the user's explicit toggles
 *
 * Anything the brief explicitly names ALWAYS wins; vertical skills only
 * suggest defaults to fill in what the brief left unspecified.
 */

import type { Vertical } from './briefParser';
import type { ParsedBrief, TrajectoryEvent } from './evidenceRecord';

// --- VERTICAL SKILL TYPE ---

export interface VerticalSkill {
    id: string;
    name: string;
    /** Vertical tags from KNOWN_VERTICALS that activate this skill */
    verticals: Vertical[];
    /** Short human-readable description shown in the trajectory log */
    description: string;
    researchLayer: {
        /** SourceIds in the proxy catalog this vertical strongly prefers */
        preferredSources: string[];
        /** Default subreddits if the brief didn't name any */
        subreddits: string[];
        /** Trade publications typical for this vertical (named-entity hints
         *  for the query fabric - surfaced even without a dedicated connector) */
        publications: string[];
        /** Domains to exclude by default for this vertical */
        excludedDomains: string[];
        /** Vertical-specific freshness half-life in days (overrides default 180) */
        freshnessHalfLifeDays: number;
        /** Additional named-entity hints (vendors, frameworks, programs) */
        knownVendors: string[];
    };
}

// --- BUILT-IN VERTICAL SKILLS ---

const SKILLS: VerticalSkill[] = [
    {
        id: 'higher-ed-research',
        name: 'Higher Education Research',
        verticals: ['higher_ed', 'education'],
        description: 'Universities, advancement offices, accreditors, ED policy. Trade press = Chronicle, Inside Higher Ed, EdSurge, CASE.',
        researchLayer: {
            preferredSources: [
                'higher_ed_dive', 'inside_higher_ed', 'edsurge', 'hechinger',
                'campus_tech', 'ecampus', 'the_conversation_edu', 'university_world_news',
                'pie_news', 'open_campus', 'college_scorecard', 'eric',
            ],
            subreddits: ['highereducation', 'professors', 'college', 'AskAcademia'],
            publications: ['CASE', 'Chronicle of Philanthropy', 'Chronicle of Higher Education', 'EAB', 'Ruffalo Noel Levitz', 'Inside Higher Ed'],
            excludedDomains: [],
            freshnessHalfLifeDays: 240,  // higher-ed news cycles slowly
            knownVendors: ['Salesforce.org', 'Ellucian', 'Workday Student', 'PeopleSoft Campus', 'Slate', 'Blackbaud', 'EverTrue'],
        },
    },
    {
        id: 'fundraising-research',
        name: 'Fundraising / Advancement Research',
        verticals: ['fundraising', 'nonprofit'],
        description: 'Donor cultivation, major gifts, planned giving, advancement operations. Trade press = NPT, Chronicle, EverTrue.',
        researchLayer: {
            preferredSources: [
                // Dedicated fundraising connectors are sparse in the catalog;
                // the brief-named publications carry most of the load via
                // queryFabric named-entity strategy.
                'gdelt',  // surfaces general fundraising news
            ],
            subreddits: ['nonprofit', 'fundraising', 'Advancement', 'majorgifts', 'HENRYfinance', 'fatFIRE'],
            publications: [
                'CASE', 'Chronicle of Philanthropy', 'NonProfit Times',
                'Philanthropy News Digest', 'Inside Philanthropy', 'Stanford Social Innovation Review',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 365,  // strategic fundraising content has long shelf life
            knownVendors: [
                'Blackbaud', 'EverTrue', 'iWave', 'DonorSearch', 'WealthEngine', 'GiveCampus',
                'ScaleFunder', 'Almabase', 'Graduway', 'Salesforce.org', 'Pega Marketing',
            ],
        },
    },
    {
        id: 'healthcare-research',
        name: 'Healthcare Research',
        verticals: ['healthcare', 'life_sciences'],
        description: 'Hospitals, payers, life sciences, patient experience, clinical operations.',
        researchLayer: {
            preferredSources: [
                // Most healthcare trade press lacks a dedicated connector - flows via
                // brief-named publications + web_search-capable sources.
                'gdelt', 'openalex', 'semantic_scholar', 'europe_pmc',
            ],
            subreddits: ['medicine', 'nursing', 'healthIT', 'Hospitals', 'medicalschool', 'Residency'],
            publications: [
                'Modern Healthcare', "Becker's Hospital Review", 'KFF Health News', 'STAT News',
                'Fierce Healthcare', 'HIMSS', 'Healthcare Dive', 'JAMA', 'NEJM', 'BMJ',
            ],
            excludedDomains: ['paid-pr-distribution.example'],
            freshnessHalfLifeDays: 180,
            knownVendors: ['Epic', 'Cerner', 'Oracle Health', 'Athenahealth', 'eClinicalWorks', 'Veeva', 'IQVIA', 'Optum'],
        },
    },
    {
        id: 'saas-research',
        name: 'B2B SaaS / Enterprise Tech Research',
        verticals: ['saas', 'enterprise_it'],
        description: 'Vendors, GTM, RevOps, product-led growth, enterprise IT modernization.',
        researchLayer: {
            preferredSources: [
                'gdelt', 'hackernews', 'github_repos',
                'sec_edgar',  // for public-vendor 10-Ks
            ],
            subreddits: ['SaaS', 'startups', 'Entrepreneur', 'sales', 'productmanagement', 'devops', 'salesforce'],
            publications: [
                'The Information', 'SaaStr', 'Protocol', 'Gartner',
                'Forrester', 'G2', 'TrustRadius', 'a16z Enterprise', 'Sequoia',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 120,  // SaaS market moves fast
            knownVendors: [
                'Salesforce', 'HubSpot', 'Microsoft', 'Oracle', 'SAP', 'Workday',
                'Snowflake', 'Databricks', 'MongoDB', 'Stripe', 'Twilio', 'Segment',
            ],
        },
    },
    {
        id: 'retail-dtc-research',
        name: 'Retail / DTC / E-commerce Research',
        verticals: ['retail', 'dtc', 'cpg'],
        description: 'Retailers, DTC brands, e-commerce platforms, supply chain, customer experience.',
        researchLayer: {
            preferredSources: ['gdelt', 'sec_edgar'],
            subreddits: ['ecommerce', 'Shopify', 'amazonseller', 'FulfillmentByAmazon', 'retailhell'],
            publications: [
                'Retail Dive', 'Modern Retail', 'Business of Fashion', 'RetailWire',
                'Glossy', 'Marketing Brew', 'Adweek', 'Ad Age',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 90,  // retail trends move very fast
            knownVendors: ['Shopify', 'Amazon', 'Klaviyo', 'Attentive', 'Yotpo', 'Gorgias', 'Recharge'],
        },
    },
    {
        id: 'financial-services-research',
        name: 'Financial Services / Insurance Research',
        verticals: ['financial_services', 'insurance'],
        description: 'Banks, asset managers, insurers, fintech. Trade press = American Banker, Banking Dive, S&P, Bloomberg.',
        researchLayer: {
            preferredSources: ['gdelt', 'sec_edgar', 'fred', 'worldbank', 'imf_data'],
            subreddits: ['finance', 'wallstreetbets', 'personalfinance', 'fintech', 'Insurance', 'CFA'],
            publications: [
                'American Banker', 'Banking Dive', 'S&P Global', 'Bloomberg',
                'Financial Times', 'Reuters', 'PitchBook', 'CB Insights',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 150,
            knownVendors: ['Plaid', 'Stripe', 'Adyen', 'Marqeta', 'Brex', 'Chime', 'Coinbase'],
        },
    },
    {
        id: 'government-policy-research',
        name: 'Government / Policy Research',
        verticals: ['government', 'policy'],
        description: 'Federal agencies, regulators, policy think tanks, public sector procurement.',
        researchLayer: {
            preferredSources: [
                'federal_register', 'congress', 'usaspending', 'sec_edgar',
                'data_gov', 'gdelt',
            ],
            subreddits: ['policy', 'PoliticalScience', 'govt', 'Federalists'],
            publications: [
                'Brookings', 'Pew Research', 'Urban Institute', 'RAND Corporation',
                'CSIS', 'Heritage Foundation', 'Politico Pro', 'Federal News Network',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 180,
            knownVendors: ['Carahsoft', 'GovDeals', 'Granicus', 'Tyler Technologies'],
        },
    },
    {
        id: 'workforce-research',
        name: 'Workforce / HR / Talent Research',
        verticals: ['workforce'],
        description: 'Hiring, retention, compensation, remote work, employee experience.',
        researchLayer: {
            preferredSources: ['gdelt', 'bls', 'fred', 'hackernews'],
            subreddits: ['humanresources', 'recruitinghell', 'remotework', 'antiwork', 'Layoffs', 'cscareerquestions'],
            publications: [
                'SHRM', 'HR Brew', 'HR Dive', 'Harvard Business Review',
                'MIT Sloan Management Review', 'McKinsey Quarterly',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 150,
            knownVendors: ['Workday', 'BambooHR', 'Gusto', 'Rippling', 'Greenhouse', 'Lever', 'LinkedIn Recruiter'],
        },
    },
    {
        id: 'sustainability-research',
        name: 'Sustainability / ESG Research',
        verticals: ['sustainability'],
        description: 'Climate, ESG reporting, circular economy, carbon accounting, decarbonization.',
        researchLayer: {
            preferredSources: ['gdelt', 'openalex', 'worldbank', 'oecd_data'],
            subreddits: ['sustainability', 'ClimateOffensive', 'esg', 'renewableenergy'],
            publications: [
                'GreenBiz', 'Triple Pundit', 'Reuters Sustainable Business',
                'MIT Climate Portal', 'Project Drawdown', 'Carbon Brief',
            ],
            excludedDomains: [],
            freshnessHalfLifeDays: 240,
            knownVendors: ['Watershed', 'Persefoni', 'Plan A', 'Sweep', 'Salesforce Net Zero'],
        },
    },
];

// --- RESOLVED OUTPUT ---

export interface ResolvedVerticalContribution {
    /** Skills that activated for this brief */
    activatedSkills: VerticalSkill[];
    /** Aggregated source recommendations (deduplicated) */
    suggestedSources: string[];
    /** Default subreddits to add to the brief's pool (if brief didn't name them) */
    defaultSubreddits: string[];
    /** Default publications (named-entity hints for queryFabric) */
    defaultPublications: string[];
    /** Aggregated excluded domains */
    excludedDomains: string[];
    /** Aggregated known vendors (named-entity hints) */
    knownVendors: string[];
    /** Best vertical-specific freshness half-life (min across activated skills) */
    freshnessHalfLifeDays: number;
    /** Trajectory events emitted by the resolver */
    trajectory: TrajectoryEvent[];
}

// --- RESOLVER ---

/**
 * Given the brief's verticals[] tags, return aggregated source-pool
 * contributions from all matching skills.
 *
 * Idempotent. Pure function - no AI calls. Result merges with the user's
 * explicit toggles + brief's explicit named entities; never overrides.
 */
function resolveVerticals(verticals: string[]): ResolvedVerticalContribution {
    const activated = SKILLS.filter(s =>
        s.verticals.some(v => verticals.includes(v))
    );

    const trajectory: TrajectoryEvent[] = [];
    const now = new Date().toISOString();

    if (activated.length === 0) {
        trajectory.push({
            id: `traj_${Date.now()}_vert_none`,
            timestamp: now,
            type: 'phase',
            summary: `No vertical skills matched verticals=[${verticals.join(', ') || 'none'}]; using generalist source pool only`,
        });
        return {
            activatedSkills: [],
            suggestedSources: [],
            defaultSubreddits: [],
            defaultPublications: [],
            excludedDomains: [],
            knownVendors: [],
            freshnessHalfLifeDays: 180,
            trajectory,
        };
    }

    for (const skill of activated) {
        trajectory.push({
            id: `traj_${Date.now()}_vert_${skill.id}`,
            timestamp: now,
            type: 'skill_activated',
            summary: `Vertical skill activated: ${skill.name} (matched ${skill.verticals.filter(v => verticals.includes(v)).join(', ')})`,
            payload: {
                skillId: skill.id,
                contributedSources: skill.researchLayer.preferredSources.length,
                contributedSubreddits: skill.researchLayer.subreddits.length,
                contributedPublications: skill.researchLayer.publications.length,
            },
        });
    }

    const dedupe = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));
    const suggestedSources = dedupe(activated.flatMap(s => s.researchLayer.preferredSources));
    const defaultSubreddits = dedupe(activated.flatMap(s => s.researchLayer.subreddits));
    const defaultPublications = dedupe(activated.flatMap(s => s.researchLayer.publications));
    const excludedDomains = dedupe(activated.flatMap(s => s.researchLayer.excludedDomains));
    const knownVendors = dedupe(activated.flatMap(s => s.researchLayer.knownVendors));
    const freshnessHalfLifeDays = Math.min(...activated.map(s => s.researchLayer.freshnessHalfLifeDays));

    return {
        activatedSkills: activated,
        suggestedSources,
        defaultSubreddits,
        defaultPublications,
        excludedDomains,
        knownVendors,
        freshnessHalfLifeDays,
        trajectory,
    };
}

/**
 * Merge a vertical resolution into a ParsedBrief. Returns a new brief with
 * vertical defaults appended where the brief didn't already specify entities.
 *
 * Brief's explicit entities ALWAYS win - vertical defaults only fill blanks.
 * Excluded domains are unioned (vertical excludes ADD to brief excludes).
 */
function applyVerticalDefaults(
    brief: ParsedBrief,
    contribution: ResolvedVerticalContribution
): ParsedBrief {
    const subreddits = brief.namedEntities.subreddits.length > 0
        ? brief.namedEntities.subreddits
        : contribution.defaultSubreddits;

    // Publications - UNION: brief-named publications stay, vertical defaults
    // fill in the rest as known-entity hints for the query fabric.
    const publications = Array.from(new Set([
        ...brief.namedEntities.publications,
        ...contribution.defaultPublications,
    ]));

    // Vendors - UNION: brief-named vendors stay, vertical-known vendors fill in.
    const vendors = Array.from(new Set([
        ...brief.namedEntities.vendors,
        ...contribution.knownVendors,
    ]));

    return {
        ...brief,
        namedEntities: {
            ...brief.namedEntities,
            subreddits,
            publications,
            vendors,
        },
        excludedDomains: Array.from(new Set([
            ...brief.excludedDomains,
            ...contribution.excludedDomains,
        ])),
    };
}

