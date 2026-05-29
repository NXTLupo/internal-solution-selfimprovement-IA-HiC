/**
 * Industry Taxonomy (added 2026-05-29 — industry-aware second brain).
 *
 * The second brain is organized by industry vertical as a MULTI-VALUED tag
 * dimension (not a folder partition), so cross-over content belongs to several
 * verticals at once and the chunk-store path keys stay intact.
 *
 * Canonical vertical list mirrors `KNOWN_VERTICALS` in briefParser.ts — kept
 * here as the dependency-free source of truth for tagging/classification so
 * the compiler, retrieval, and UI can import it without pulling in the brief
 * parser. If you add a vertical, add it in BOTH places (briefParser.ts +
 * here) and in AGENTS.md PART III "The Industry Dimension".
 */

export const INDUSTRY_VERTICALS = [
    'higher_ed', 'fundraising', 'healthcare', 'life_sciences', 'saas',
    'enterprise_it', 'retail', 'dtc', 'cpg', 'financial_services', 'insurance',
    'nonprofit', 'government', 'policy', 'media', 'education', 'manufacturing',
    'energy', 'real_estate', 'ai_research', 'workforce', 'sustainability',
] as const;

export type IndustryVertical = typeof INDUSTRY_VERTICALS[number];

/** Used when content is genuinely vertical-agnostic (pure methodology). */
export const CROSS_INDUSTRY = 'cross_industry';

const VERTICAL_SET = new Set<string>(INDUSTRY_VERTICALS as readonly string[]);

export function isKnownVertical(v: string): v is IndustryVertical {
    return VERTICAL_SET.has(v);
}

/** Human label for display. */
export function industryLabel(v: string): string {
    const map: Record<string, string> = {
        higher_ed: 'Higher Education',
        fundraising: 'Fundraising / Advancement',
        healthcare: 'Healthcare',
        life_sciences: 'Life Sciences',
        saas: 'B2B SaaS',
        enterprise_it: 'Enterprise IT',
        retail: 'Retail',
        dtc: 'DTC / E-commerce',
        cpg: 'CPG',
        financial_services: 'Financial Services',
        insurance: 'Insurance',
        nonprofit: 'Nonprofit',
        government: 'Government',
        policy: 'Policy',
        media: 'Media',
        education: 'Education (K-12)',
        manufacturing: 'Manufacturing',
        energy: 'Energy',
        real_estate: 'Real Estate',
        ai_research: 'AI Research',
        workforce: 'Workforce / HR / Talent',
        sustainability: 'Sustainability / ESG',
        [CROSS_INDUSTRY]: 'Cross-Industry',
    };
    return map[v] || v;
}

/**
 * Deterministic source/subreddit/title -> industries classifier.
 *
 * Deterministic by design (no LLM): the same article always maps to the same
 * verticals, honoring the determinism-first standing rule. Source names and
 * subreddits map cleanly to verticals; we match the most specific signals
 * first. Returns 1-3 verticals (most specific first), or [CROSS_INDUSTRY] when
 * nothing matches (vertical-agnostic methodology content).
 *
 * Inputs are the fields available on a wiki article entry / frontmatter:
 *   source (e.g. "Reddit Deep: r/cscareerquestions", "Higher Ed Dive",
 *           "Client Uploads"), title, url, kind.
 */
const SIGNAL_MAP: Array<{ re: RegExp; verticals: IndustryVertical[] }> = [
    // Higher education + co-op + students
    { re: /\b(higher ?ed|university|universit|college|campus|undergrad|co-?op|coop|student|admission|enrol|alumni|provost|faculty|northeastern|ncaa|registrar|fafsa|tuition)\b/i, verticals: ['higher_ed'] },
    { re: /r\/(cscareerquestions|engineeringstudents|gradadmissions|college|professors|academia|highereducation|students)/i, verticals: ['higher_ed', 'workforce'] },
    // Fundraising / advancement / nonprofit
    { re: /\b(advancement|donor|fundrais|philanthrop|giving|endowment|gift officer|capital campaign|annual fund|major gift)\b/i, verticals: ['fundraising', 'nonprofit'] },
    { re: /\b(nonprofit|non-profit|ngo|charit|foundation grant)\b/i, verticals: ['nonprofit'] },
    // Healthcare / life sciences
    { re: /\b(health ?care|hospital|patient|clinical|physician|nurse|payer|provider network|ehr|epic systems|telehealth|medicaid|medicare)\b/i, verticals: ['healthcare'] },
    { re: /\b(pharma|biotech|life ?science|clinical trial|fda approval|drug develop|genomic)\b/i, verticals: ['life_sciences', 'healthcare'] },
    // Workforce / HR / talent
    { re: /r\/(recruiting|humanresources|jobs|careerguidance|antiwork|workreform)/i, verticals: ['workforce'] },
    { re: /\b(workforce|talent acquisition|recruit|hiring|hr tech|employee experience|upskill|reskill|labor market|gig economy)\b/i, verticals: ['workforce'] },
    // SaaS / enterprise IT / AI
    { re: /\b(b2b saas|saas|product-led|plg|arr|churn rate|enterprise software|devops|kubernetes|api platform)\b/i, verticals: ['saas', 'enterprise_it'] },
    { re: /r\/(artificial|machinelearning|openai|gpt|chatgpt|localllama|singularity)/i, verticals: ['ai_research'] },
    { re: /\b(generative ai|large language model|\bllm\b|machine learning|ai agent|foundation model|prompt engineering)\b/i, verticals: ['ai_research'] },
    // Retail / DTC / CPG
    { re: /r\/(ecommerce|shopify|dropship|marketing|digital_?marketing|marketingautomation|fulfillmentbyamazon)/i, verticals: ['retail', 'dtc'] },
    { re: /\b(e-?commerce|dtc|direct-to-consumer|retail|merchandis|shopify|omnichannel|point of sale|cpg|consumer packaged)\b/i, verticals: ['retail', 'dtc'] },
    // Financial services / insurance
    { re: /\b(bank|fintech|financial services|wealth manage|capital markets|payments|lending|underwrit|insurance|insurtech|actuar|claims process)\b/i, verticals: ['financial_services'] },
    // Government / policy
    { re: /\b(government|public sector|federal agency|gov ?tech|policy|regulat|legislation|municipal|civic)\b/i, verticals: ['government', 'policy'] },
    // Media
    { re: /\b(media|publishing|journalism|streaming|broadcast|newsroom|subscription media)\b/i, verticals: ['media'] },
    // Manufacturing / energy / real estate / sustainability
    { re: /\b(manufactur|industrial|supply chain|factory|plant floor|oem)\b/i, verticals: ['manufacturing'] },
    { re: /\b(energy|utility|grid|renewable|solar|oil ?& ?gas|power generation)\b/i, verticals: ['energy'] },
    { re: /\b(real estate|proptech|property manage|commercial real|leasing)\b/i, verticals: ['real_estate'] },
    { re: /\b(sustainab|esg|carbon|net zero|climate|decarboniz)\b/i, verticals: ['sustainability'] },
    // Education (K-12, distinct from higher_ed)
    { re: /\b(k-?12|school district|edtech|primary education|secondary education|teacher)\b/i, verticals: ['education'] },
];

export function classifyIndustries(input: {
    source?: string | null;
    title?: string | null;
    url?: string | null;
    kind?: string | null;
}): string[] {
    const hay = [input.source, input.title, input.url, input.kind]
        .filter(Boolean)
        .join('  ');
    const hits: string[] = [];
    for (const { re, verticals } of SIGNAL_MAP) {
        if (re.test(hay)) {
            for (const v of verticals) if (!hits.includes(v)) hits.push(v);
        }
    }
    if (hits.length === 0) return [CROSS_INDUSTRY];
    // Cap at 3, most-specific-first (insertion order already prioritizes).
    return hits.slice(0, 3);
}
