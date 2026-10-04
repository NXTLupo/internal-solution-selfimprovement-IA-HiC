import { resolveCitations } from './slidePostProcessor';
import type { ChunkSourceInfo } from './researchFabricOrchestrator';
/**
 * Citation Resolver - Maps ALL raw citation references to human-readable sources.
 *
 * G-02: Zero raw references should appear in any rendered output:
 * - [CHUNK_XXX] -> "(Source: [Document Name], [date])"
 * - [FILE N]    -> "(Source: [Filename])"
 * - (baseline: X%) -> "(baseline: to be measured in first 30 days)"
 * - Orphaned [CHUNK_XXX] with no map entry -> stripped entirely
 *
 * The resolver builds a lookup map from the research corpus (which contains
 * chunk headers with SOURCE, URL, and Date metadata) and a file map from
 * the uploaded file names.
 */

export interface ResolvedCitation {
    chunkId: string;
    sourceName: string;
    sourceUrl?: string;
    date?: string;
    title?: string;
    tier?: number;
}

/**
 * Build a citation map from the raw corpus text.
 * The corpus contains chunks formatted as:
 * --- CHUNK_001 ---
 * SOURCE: Higher Ed Dive
 * URL: https://...
 * Date: 2026-04-01
 * Title: Article Title
 * [content]
 */
export function buildCitationMap(corpusText: string): Map<string, ResolvedCitation> {
    const map = new Map<string, ResolvedCitation>();

    // Match chunk headers
    const chunkRegex = /---\s*(CHUNK_\d+)\s*---\s*\n([\s\S]*?)(?=---\s*CHUNK_\d+\s*---|$)/g;
    let match;

    while ((match = chunkRegex.exec(corpusText)) !== null) {
        const chunkId = match[1];
        const header = match[2].substring(0, 500); // Only parse first 500 chars for metadata

        const sourceName = header.match(/SOURCE:\s*(.+)/i)?.[1]?.trim() || 'Unknown Source';
        const sourceUrl = header.match(/URL:\s*(https?:\/\/\S+)/i)?.[1]?.trim();
        const date = header.match(/Date:\s*(.+)/i)?.[1]?.trim();
        const title = header.match(/Title:\s*(.+)/i)?.[1]?.trim();
        const tierMatch = header.match(/TIER:\s*(\d)/i);
        const tier = tierMatch ? parseInt(tierMatch[1]) : undefined;

        map.set(chunkId, { chunkId, sourceName, sourceUrl, date, title, tier });
    }

    return map;
}

/**
 * Build a file reference map from the raw corpus text.
 * The ingestion step wraps files as: --- FILE 1: "filename.pdf" ---
 * Gemini then outputs [FILE 1], [FILE 2], etc. in generated text.
 */
export function buildFileMap(corpusText: string): Map<number, string> {
    const map = new Map<number, string>();
    const fileRegex = /---\s*FILE\s+(\d+):\s*"([^"]+)"\s*---/g;
    let match;
    while ((match = fileRegex.exec(corpusText)) !== null) {
        map.set(parseInt(match[1]), match[2]);
    }
    return map;
}

/**
 * Resolve all [CHUNK_XXX] references in text to human-readable citations.
 *
 * Input:  "Donor retention declined 18% [CHUNK_001]"
 * Output: "Donor retention declined 18% (Source: Bank of America Study of Philanthropy, 2025)"
 */
function resolveChunkReferences(
    text: string,
    citationMap: Map<string, ResolvedCitation>,
    fileMap?: Map<number, string>
): string {
    if (!text) return text;
    // 2026-10-01 (plan Stage 6.3 / A9): ONE text resolver. The [CHUNK_XXX] / [FILE N] / pointer
    // rewriting lives in slidePostProcessor.resolveCitations (which delegates manifest pointers to
    // citationPointerRegistry); this adapter only translates the pipeline's maps into its inputs.
    // The old local copy also REPLACED "(baseline: X%)" with a written-in placeholder sentence; that
    // is a QA annotation the reader must never see, so the placeholder is now stripped, not reworded.
    const chunkSourceMap: Record<string, ChunkSourceInfo> = {};
    for (const [id, c] of citationMap.entries()) {
        chunkSourceMap[id] = { sourceName: c.sourceName, title: c.title || '', url: c.sourceUrl } as ChunkSourceInfo;
    }
    const fileNames: string[] = [];
    if (fileMap && fileMap.size) {
        const maxIdx = Math.max(...Array.from(fileMap.keys()));
        for (let i = 1; i <= maxIdx; i++) fileNames.push(fileMap.get(i) || '');
    }
    let resolved = resolveCitations(text, fileNames.length ? fileNames : undefined, chunkSourceMap);
    resolved = resolved
        .replace(/\s*\(baseline:\s*[A-Za-z]%?\)/gi, '')
        .replace(/\[\s*(?:FILE\s*\d+|CHUNK_\d+)(?:\s*,\s*(?:FILE\s*\d+|CHUNK_\d+))*\s*\]/gi, '')
        .replace(/\[CHUNK_\d+\]/g, '')
        .replace(/\[FILE\s*\d+\]/gi, '')
        .replace(/\(Source #\d+\)/g, '')
        .replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1');
    return resolved;
}

/**
 * Resolve citations in all string fields of a result object recursively.
 * Walks the entire result tree and resolves any [CHUNK_XXX] and [FILE N] found.
 */
export function resolveAllCitations<T>(obj: T, citationMap: Map<string, ResolvedCitation>, fileMap?: Map<number, string>): T {
    if (!obj) return obj;
    if (typeof obj === 'string') {
        return resolveChunkReferences(obj, citationMap, fileMap) as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => resolveAllCitations(item, citationMap, fileMap)) as unknown as T;
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = resolveAllCitations(value, citationMap, fileMap);
        }
        return result as T;
    }
    return obj;
}


// ================================================================
// TYPO-01: Proper noun spell-check with fuzzy matching
// ================================================================

/**
 * Dictionary of correct spellings for technology brand names, frameworks,
 * and industry terms. Maps lowercase misspellings -> correct spelling.
 * The key is the canonical lowercase form; fuzzyCorrectProperNouns()
 * checks edit distance against these.
 */
const PROPER_NOUN_DICTIONARY: Record<string, string> = {
    // Cloud & Data platforms
    'databricks': 'Databricks', 'snowflake': 'Snowflake', 'redshift': 'Redshift',
    'bigquery': 'BigQuery', 'synapse': 'Synapse', 'firebolt': 'Firebolt',
    'dbt': 'dbt', 'airflow': 'Airflow', 'kafka': 'Kafka', 'spark': 'Spark',
    'terraform': 'Terraform', 'kubernetes': 'Kubernetes', 'docker': 'Docker',
    // CRM & Marketing
    'salesforce': 'Salesforce', 'hubspot': 'HubSpot', 'marketo': 'Marketo',
    'pardot': 'Pardot', 'eloqua': 'Eloqua', 'dynamics': 'Dynamics',
    'servicenow': 'ServiceNow', 'zendesk': 'Zendesk', 'intercom': 'Intercom',
    // Cloud providers
    'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'google cloud': 'Google Cloud',
    // Analytics & BI
    'tableau': 'Tableau', 'power bi': 'Power BI', 'looker': 'Looker',
    'mixpanel': 'Mixpanel', 'amplitude': 'Amplitude', 'segment': 'Segment',
    // Dev tools
    'github': 'GitHub', 'gitlab': 'GitLab', 'jira': 'Jira', 'confluence': 'Confluence',
    'jenkins': 'Jenkins', 'circleci': 'CircleCI', 'vercel': 'Vercel',
    // AI/ML
    'openai': 'OpenAI', 'anthropic': 'Anthropic', 'tensorflow': 'TensorFlow',
    'pytorch': 'PyTorch', 'langchain': 'LangChain', 'hugging face': 'Hugging Face',
    // Communication
    'slack': 'Slack', 'microsoft teams': 'Microsoft Teams', 'zoom': 'Zoom',
    'twilio': 'Twilio', 'sendgrid': 'SendGrid',
    // Identity & Security
    'okta': 'Okta', 'auth0': 'Auth0', 'cloudflare': 'Cloudflare',
    // Database
    'postgresql': 'PostgreSQL', 'mongodb': 'MongoDB', 'redis': 'Redis',
    'elasticsearch': 'Elasticsearch', 'neo4j': 'Neo4j', 'supabase': 'Supabase',
    // Ecommerce & Payments
    'stripe': 'Stripe', 'shopify': 'Shopify', 'magento': 'Magento',
    // Higher Ed specific
    'ellucian': 'Ellucian', 'blackbaud': 'Blackbaud', 'workday': 'Workday',
    'banner': 'Banner', 'peoplesoft': 'PeopleSoft', 'colleague': 'Colleague',
    // Consulting frameworks
    'mckinsey': 'McKinsey', 'gartner': 'Gartner', 'forrester': 'Forrester',
    // General industry terms that get misspelled
    'experiential': 'experiential', 'technologies': 'technologies',
    'website': 'website', 'infrastructure': 'infrastructure',
    'architecture': 'architecture', 'personalization': 'personalization',
};

/**
 * Calculate Levenshtein edit distance between two strings.
 */
function editDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Fuzzy-match and correct misspelled proper nouns in text.
 * For each word 5+ chars, check edit distance against the dictionary.
 * Auto-correct matches with distance <= 2 and similarity > 80%.
 */
function fuzzyCorrectProperNouns(text: string): string {
    if (!text) return text;

    // Build a reverse lookup: for each canonical, store the correct form
    const canonicals = Object.keys(PROPER_NOUN_DICTIONARY);

    // Match words that could be brand names (capitalized or all-caps, 4+ chars)
    return text.replace(/\b[A-Za-z][A-Za-z0-9.]{3,}\b/g, (word) => {
        const lower = word.toLowerCase();

        // Exact match - just fix casing
        if (PROPER_NOUN_DICTIONARY[lower]) {
            return PROPER_NOUN_DICTIONARY[lower];
        }

        // Fuzzy match - only for words 5+ chars to avoid false positives
        if (word.length < 5) return word;

        let bestMatch = '';
        let bestDist = Infinity;

        for (const canonical of canonicals) {
            // Only compare words of similar length (within 3 chars)
            if (Math.abs(canonical.length - lower.length) > 3) continue;

            const dist = editDistance(lower, canonical);
            const similarity = 1 - dist / Math.max(lower.length, canonical.length);

            if (dist <= 2 && similarity > 0.8 && dist < bestDist) {
                bestDist = dist;
                bestMatch = PROPER_NOUN_DICTIONARY[canonical];
            }
        }

        return bestMatch || word;
    });
}

/**
 * Apply proper-noun correction to all string fields recursively.
 */
export function correctAllProperNouns<T>(obj: T): T {
    if (!obj) return obj;
    if (typeof obj === 'string') {
        return fuzzyCorrectProperNouns(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => correctAllProperNouns(item)) as unknown as T;
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip image URLs and other non-text fields
            if (key === 'imageUrl' || key === 'videoUrl' || key === 'sourceUrl' || key === 'url' || key === 'data') {
                result[key] = value;
            } else {
                result[key] = correctAllProperNouns(value);
            }
        }
        return result as T;
    }
    return obj;
}
