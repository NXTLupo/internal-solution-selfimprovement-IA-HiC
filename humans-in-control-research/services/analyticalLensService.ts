/**
 * Analytical Lens Framework Service
 * Provides industry-agnostic configurable frameworks that shape
 * persona schemas, journey stages, and prompt segments per engagement type.
 *
 * AUTO-DETECTION (2026-04-10):
 * The lens is now AI-selected based on research goal + uploaded documents.
 * The user doesn't choose - the system reads the goal, detects domain
 * signals, selects the best lens, and explains WHY in the reasoning stream.
 * New lenses can be added via the wiki self-improvement engine.
 */

import { AnalyticalLens, LensConfig } from '../types';

export const LENS_CONFIGS: Record<AnalyticalLens, LensConfig> = {
    general_cx: {
        lens: 'general_cx',
        personaExtensions: [],
        journeyStages: ['Awareness', 'Consideration', 'Decision', 'Onboarding', 'Usage', 'Advocacy'],
        specializedPromptSegment: '',
    },
    fundraising_advancement: {
        lens: 'fundraising_advancement',
        personaExtensions: [
            { key: 'givingCapacity', label: 'Giving Capacity', type: 'select', options: ['Annual (<$1K)', 'Leadership ($1K-$25K)', 'Major ($25K-$100K)', 'Principal ($100K+)'] },
            { key: 'engagementTier', label: 'Engagement Tier', type: 'select', options: ['Prospect', 'Annual Donor', 'Leadership Donor', 'Major Gift Prospect', 'Principal Gift Prospect'] },
            { key: 'affinityAreas', label: 'Affinity Areas', type: 'text' },
            { key: 'lifecycleStage', label: 'Lifecycle Stage', type: 'select', options: ['Acquisition', 'Cultivation', 'Solicitation', 'Stewardship', 'Renewal', 'Lapsed'] },
            { key: 'preferredChannels', label: 'Preferred Channels', type: 'text' },
        ],
        journeyStages: ['Awareness', 'Engagement', 'Cultivation', 'Solicitation', 'Stewardship', 'Renewal'],
        specializedPromptSegment: `DOMAIN CONTEXT: Fundraising and donor advancement. Extract all mentions of giving amounts, donor segments, campaigns, alumni engagement, CRM/Salesforce references, wealth indicators, gift officers, stewardship activities. Themes must map to: Donor Acquisition, Donor Retention, Stewardship Quality, Data Infrastructure, Channel Strategy, Personalization, Pipeline Progression. Personas must include giving capacity tier, engagement tier, affinity areas, lifecycle stage, and preferred channels as extension fields.`,
    },
    student_learner: {
        lens: 'student_learner',
        personaExtensions: [
            { key: 'academicProgram', label: 'Academic Program', type: 'text' },
            { key: 'readinessLevel', label: 'Readiness Level', type: 'select', options: ['Exploring', 'Developing', 'Prepared', 'Experienced'] },
            { key: 'skillProfile', label: 'Key Skills', type: 'text' },
            { key: 'experientialLearning', label: 'Experiential Learning', type: 'text' },
        ],
        journeyStages: ['Application', 'Orientation', 'Coursework', 'Experiential Prep', 'Experiential Learning', 'Career Transition', 'Alumni'],
        specializedPromptSegment: `DOMAIN CONTEXT: Student and learner experience. Extract all mentions of academic programs, co-op/internships, skill development, career readiness, advising, student organizations, learning outcomes, competency frameworks. Themes must relate to: Academic Experience, Career Readiness, Skills Development, Experiential Learning, Student Support, Technology in Learning. Personas must include academic program, readiness level, skill profile, and experiential learning as extension fields.`,
    },
    digital_product: {
        lens: 'digital_product',
        personaExtensions: [
            { key: 'techProficiency', label: 'Tech Proficiency', type: 'select', options: ['Novice', 'Intermediate', 'Advanced', 'Expert'] },
            { key: 'deviceMix', label: 'Primary Devices', type: 'text' },
            { key: 'usageFrequency', label: 'Usage Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Occasional'] },
            { key: 'accessibilityNeeds', label: 'Accessibility Needs', type: 'text' },
        ],
        journeyStages: ['Discovery', 'Onboarding', 'Core Usage', 'Advanced Usage', 'Integration', 'Advocacy/Churn'],
        specializedPromptSegment: `DOMAIN CONTEXT: Digital product and mobile experience. Extract all mentions of app usage patterns, feature adoption, onboarding friction, mobile vs desktop, performance, accessibility, integration with other tools. Themes must relate to: Discovery, Onboarding, Core Value, Feature Adoption, Mobile Experience, Accessibility, Performance, Integration. Personas must include tech proficiency, device mix, usage frequency, and accessibility needs as extension fields.`,
    },
    enterprise_technology: {
        lens: 'enterprise_technology',
        personaExtensions: [
            { key: 'department', label: 'Department', type: 'text' },
            { key: 'systemRole', label: 'System Role', type: 'select', options: ['End User', 'Power User', 'Admin', 'Decision Maker'] },
            { key: 'systemAccess', label: 'Systems Used', type: 'text' },
            { key: 'painTolerance', label: 'Change Tolerance', type: 'select', options: ['Low', 'Medium', 'High'] },
        ],
        journeyStages: ['Evaluate', 'Procure', 'Implement', 'Adopt', 'Optimize', 'Sunset/Migrate'],
        specializedPromptSegment: `DOMAIN CONTEXT: Enterprise technology ecosystem. Extract all mentions of systems, platforms, vendors, integrations, data flows, governance, security, compliance, change management, adoption rates, training needs. Themes must relate to: Data Infrastructure, System Integration, User Adoption, Governance, Security, Vendor Management, Change Management, Scalability. Personas must include department, system role, systems used, and change tolerance as extension fields.`,
    },
    custom: {
        lens: 'custom',
        personaExtensions: [],
        journeyStages: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5'],
        specializedPromptSegment: '',
    },
};

// --- DOMAIN SIGNAL DETECTION ---

/**
 * Signal patterns that indicate a specific analytical lens.
 * Each lens has keyword clusters and contextual indicators.
 * These are scored against the research goal + document filenames.
 */
const LENS_SIGNALS: Record<AnalyticalLens, { keywords: string[]; weight: number; explanation: string }> = {
    fundraising_advancement: {
        keywords: [
            'fundraising', 'donor', 'giving', 'advancement', 'alumni', 'endowment',
            'stewardship', 'solicitation', 'cultivation', 'gift officer', 'gift officers',
            'annual fund', 'major gift', 'principal gift', 'planned giving', 'campaign',
            'development office', 'philanthropy', 'nonprofit', 'contribution', 'pledge',
            'wealth screening', 'prospect research', 'donor retention', 'lapsed donor',
            'nu giving', 'nu advancement', 'northeastern', 'university advancement',
        ],
        weight: 1.5,
        explanation: 'Research involves fundraising, donor engagement, or advancement operations',
    },
    student_learner: {
        keywords: [
            'student', 'learner', 'academic', 'enrollment', 'orientation', 'coursework',
            'co-op', 'internship', 'experiential learning', 'career readiness', 'advising',
            'curriculum', 'degree', 'graduation', 'retention rate', 'student success',
            'financial aid', 'admissions', 'registrar', 'student affairs', 'campus life',
            'learning outcomes', 'competency', 'student experience', 'higher education',
        ],
        weight: 1.3,
        explanation: 'Research focuses on student or learner experience in education',
    },
    digital_product: {
        keywords: [
            'app', 'mobile', 'saas', 'platform', 'onboarding', 'feature adoption',
            'user engagement', 'churn', 'activation', 'retention', 'product-market fit',
            'ux', 'ui', 'usability', 'accessibility', 'wcag', 'responsive', 'api',
            'freemium', 'conversion', 'signup', 'dashboard', 'analytics', 'product led',
            'feature flag', 'a/b test', 'cohort', 'daily active', 'monthly active',
        ],
        weight: 1.2,
        explanation: 'Research centers on a digital product, app, or SaaS platform',
    },
    enterprise_technology: {
        keywords: [
            'enterprise', 'crm', 'erp', 'salesforce', 'sap', 'oracle', 'workday',
            'digital transformation', 'cloud migration', 'legacy system', 'tech stack',
            'integration', 'middleware', 'api gateway', 'data warehouse', 'etl',
            'governance', 'compliance', 'security posture', 'vendor management',
            'change management', 'adoption rate', 'shadow it', 'technical debt',
            'devops', 'ci/cd', 'infrastructure', 'system implementation', 'rfi', 'rfp',
        ],
        weight: 1.2,
        explanation: 'Research involves enterprise technology ecosystem, platforms, or digital transformation',
    },
    general_cx: {
        keywords: [
            'customer experience', 'cx', 'nps', 'csat', 'customer journey',
            'touchpoint', 'voice of customer', 'service design', 'customer satisfaction',
        ],
        weight: 1.0,
        explanation: 'General customer experience research with no specific domain specialization',
    },
    custom: {
        keywords: [],
        weight: 0,
        explanation: 'Custom framework for domains not covered by predefined lenses',
    },
};

export interface LensDetectionResult {
    selectedLens: AnalyticalLens;
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
    scores: Record<string, number>;
    signalsDetected: string[];
}

/**
 * Auto-detect the best analytical lens based on the research goal
 * and optional document filenames. Returns the selected lens with
 * a natural language explanation of why it was chosen.
 */
export function detectAnalyticalLens(
    researchGoal: string,
    documentNames?: string[]
): LensDetectionResult {
    const textToScan = [
        researchGoal.toLowerCase(),
        ...(documentNames || []).map(n => n.toLowerCase()),
    ].join(' ');

    const scores: Record<string, number> = {};
    const signalsDetected: string[] = [];

    for (const [lens, signals] of Object.entries(LENS_SIGNALS)) {
        if (lens === 'custom') continue;
        let score = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of signals.keywords) {
            if (textToScan.includes(keyword)) {
                score += signals.weight;
                matchedKeywords.push(keyword);
            }
        }

        scores[lens] = score;
        if (matchedKeywords.length > 0) {
            signalsDetected.push(`${lens}: matched "${matchedKeywords.slice(0, 3).join('", "')}"`);
        }
    }

    // Find the highest-scoring lens
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topLens = sorted[0];
    const runnerUp = sorted[1];

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (topLens[1] >= 4) {
        confidence = 'high';
    } else if (topLens[1] >= 2) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    // If no strong signal, default to general_cx
    const selectedLens = topLens[1] >= 1.5
        ? topLens[0] as AnalyticalLens
        : 'general_cx' as AnalyticalLens;

    // Build explanation
    const lensConfig = LENS_SIGNALS[selectedLens];
    let explanation: string;

    if (selectedLens === 'general_cx' && topLens[1] < 1.5) {
        explanation = 'No strong domain signals detected in the research goal. Using General CX Research as the baseline framework. As the analysis progresses, the system may detect domain-specific patterns and recommend switching to a specialized lens.';
    } else {
        const matchCount = signalsDetected.filter(s => s.startsWith(selectedLens)).length;
        explanation = `${lensConfig.explanation}. Detected ${Math.round(topLens[1])} domain signals in the research goal${runnerUp && runnerUp[1] > 0 ? ` (${(LENS_SIGNALS[runnerUp[0] as AnalyticalLens])?.explanation} was also considered but scored lower)` : ''}. This lens customizes personas with domain-specific fields and maps the journey to ${LENS_CONFIGS[selectedLens].journeyStages.join(' -> ')}.`;
    }

    return {
        selectedLens,
        confidence,
        explanation,
        scores,
        signalsDetected,
    };
}

// --- AUTO-ENABLE DATA SOURCES ---

/**
 * Recommend which data source categories to enable based on the detected lens
 * and research goal. LENS-SPECIFIC, not blanket enable-all.
 *
 * Philosophy: Only enable sources that could PLAUSIBLY contain content
 * relevant to the research domain. A fundraising study doesn't need
 * PyTorch forums, ML model registries, or AI conference proceedings.
 */
export function recommendDataSources(
    researchGoal: string,
    detectedLens: AnalyticalLens
): Record<string, boolean> {
    const goal = researchGoal.toLowerCase();

    // Start with NOTHING enabled, then add based on lens + goal
    const sources: Record<string, boolean> = {};

    // Deep research is always valuable (AI-powered web search)
    sources.enableDeepResearch = true;

    // Lens-specific source selection
    switch (detectedLens) {
        case 'fundraising_advancement':
            sources.enableHigherEdNews = true;   // Core domain sources
            sources.enableEducationData = true;   // College Scorecard, ERIC
            sources.enableAcademic = true;        // Research on philanthropy
            sources.enableNews = true;            // GDELT for current events
            sources.enableGovernment = true;      // Tax policy, federal grants
            // Social listening for practitioner sentiment
            sources.enableCxMesh = true;
            // NO: AI News, AI Research, AI Models, YouTube, Open Data (unless goal mentions them)
            break;

        case 'student_learner':
            sources.enableHigherEdNews = true;
            sources.enableEducationData = true;
            sources.enableAcademic = true;
            sources.enableNews = true;
            // NO: AI-specific, economic, government (unless goal mentions them)
            break;

        case 'digital_product':
            sources.enableAcademic = true;
            sources.enableNews = true;
            sources.enableSocialTrends = true;    // HackerNews for tech sentiment
            sources.enableCxMesh = true;          // Product reviews
            // Only enable AI sources if the product IS an AI product
            if (/ai |artificial intelligence|machine learning|llm|genai/.test(goal)) {
                sources.enableAINews = true;
                sources.enableAIResearch = true;
            }
            break;

        case 'enterprise_technology':
            sources.enableAcademic = true;
            sources.enableNews = true;
            sources.enableSocialTrends = true;
            // AI sources only if goal mentions AI/ML specifically
            if (/ai |artificial intelligence|machine learning|llm|genai|automation/.test(goal)) {
                sources.enableAINews = true;
                sources.enableAIResearch = true;
            }
            break;

        case 'general_cx':
        default:
            sources.enableAcademic = true;
            sources.enableNews = true;
            break;
    }

    // Goal-specific overrides (add sources if goal explicitly mentions a domain)
    if (/government|policy|regulation|federal|compliance|public sector|legislation/.test(goal)) {
        sources.enableGovernment = true;
    }
    if (/economic|market size|gdp|inflation|employment|financial|revenue/.test(goal)) {
        sources.enableEconomic = true;
    }
    if (/social media|reddit|twitter|sentiment|voice of customer|voc|reviews|trustpilot/.test(goal)) {
        sources.enableCxMesh = true;
        sources.enableSocialTrends = true;
    }
    if (/video|youtube|webinar|tutorial|demo/.test(goal)) {
        sources.enableYouTube = true;
    }
    if (/\bai\b|artificial intelligence|machine learning|llm|gpt|claude|genai|generative ai/.test(goal)) {
        sources.enableAINews = true;
        sources.enableAIResearch = true;
    }
    if (/open data|census|demographics|population|public data/.test(goal)) {
        sources.enableOpenData = true;
    }

    return sources;
}

// --- ORIGINAL API (preserved) ---

/**
 * Build the lens-specific prompt segment to inject into the system instruction.
 */
export function getLensPromptSegment(lens: AnalyticalLens): string {
    const config = LENS_CONFIGS[lens];
    if (!config.specializedPromptSegment) return '';
    return `\n\n${config.specializedPromptSegment}`;
}

/**
 * Get the persona extension field definitions for a lens.
 */
export function getLensPersonaExtensions(lens: AnalyticalLens) {
    return LENS_CONFIGS[lens].personaExtensions;
}

/**
 * Get the default journey stages for a lens.
 */
export function getLensJourneyStages(lens: AnalyticalLens) {
    return LENS_CONFIGS[lens].journeyStages;
}
