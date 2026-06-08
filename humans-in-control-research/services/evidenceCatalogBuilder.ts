// Shared evidence-catalog injection helper for deliverable generators.
//
// Centralizes the IRON LAW source-roster preamble + raw-intelligence catalog
// that previously only generateStrategicReport received. Wiring this block
// into themes/personas/journey/gap/competitive/recommendations/roadmap/PRD/
// tech-arch/tech-audit generators forces every deliverable to cite the
// ~200-article external corpus instead of frozen client-document snippets.
//
// Companion helper loadDeliverableContext() centralizes getActiveConstraints
// + loadEngagementMemory loading so each generator gets a single line of
// context-injection code.

import { getActiveConstraints } from './promptImprovementEngine';

export interface EvidenceCatalogOptions {
    deliverableName: string;
    minExternalPct?: number;
    minDistinctSources?: number;
    contentCapOverride?: { tier1?: number; tier2?: number; tier3?: number };
    /**
     * 2026-05-22 - Hard cap on the total chars emitted by this function.
     * Once the running total exceeds this, the iterator stops adding more
     * articles and appends a "truncated" notice. Default: 1.2M chars
     * (~300K tokens) - large enough that themes/personas don't hit it,
     * small enough that gap/competitive (which run late in the chain
     * after themes + personas + recs + journey have accumulated) leave
     * headroom under Gemini Flash's 1M-token context limit. Pass a
     * smaller value (e.g., 600_000) for late-chain deliverables.
     */
    maxTotalChars?: number;
}

export interface DeliverableContext {
    constraints: string;
    engagementMemory: string;
}

const TIER_LABELS: Record<number, string> = {
    1: 'TIER 1 (Academic/Gov)',
    2: 'TIER 2 (Industry/News)',
    3: 'TIER 3 (Community/Social)',
};

const DEFAULT_CONTENT_CAPS = { tier1: 1500, tier2: 1200, tier3: 2000 };

export function buildEvidenceCatalogBlock(
    rawSources: any[] | undefined,
    opts: EvidenceCatalogOptions
): string {
    if (!rawSources || rawSources.length === 0) return '';

    const minExternalPct = opts.minExternalPct ?? 30;
    const minDistinctSources = opts.minDistinctSources ?? 8;
    const caps = { ...DEFAULT_CONTENT_CAPS, ...(opts.contentCapOverride || {}) };
    const maxTotalChars = opts.maxTotalChars ?? 1_200_000;

    const evidenceEntries: string[] = [];
    const sourceNames = new Set<string>();
    let totalArticlesInjected = 0;
    let runningChars = 0;
    let truncated = false;

    // 2026-06-03 - RELEVANCE-ORDERED, SOURCE-TYPE-NEUTRAL.
    // Previously the catalog was emitted in credibility-tier order (Tier 1
    // articles first, social Tier 3 last) with per-tier content caps, so when the
    // char budget truncated it dropped SOCIAL content FIRST. That ranks by source
    // TYPE, which is wrong: relevance to the research goal is the ONLY ranking
    // axis, and uploaded docs / articles / social posts / videos / papers are all
    // equal. We now flatten every item and rank purely by user-priority then
    // goal-relevance; truncation drops the LEAST goal-relevant items regardless of
    // origin. One uniform content cap, zero tier bias.
    const UNIFORM_CONTENT_CAP = Math.max(caps.tier1, caps.tier2, caps.tier3);
    const flatItems = rawSources
        .filter((s: any) => s.items?.length > 0)
        .flatMap((src: any) => {
            const sourceName = src.source || src.sourceId || 'Unknown Source';
            return (src.items || []).map((item: any) => ({ sourceName, item }));
        })
        .sort((a: any, b: any) => {
            const ap = a.item.priority ? 1 : 0, bp = b.item.priority ? 1 : 0;
            if (ap !== bp) return bp - ap;                                      // user-flagged first
            return (b.item.relevanceScore || 0) - (a.item.relevanceScore || 0); // then goal-relevance
        });
    for (const { sourceName, item } of flatItems) {
        if (truncated) break;
        sourceNames.add(sourceName);
        const content = item.content ? String(item.content).substring(0, UNIFORM_CONTENT_CAP) : '';
        const date = item.date ? ` | Date: ${item.date}` : '';
        const url = item.url ? ` | URL: ${item.url}` : '';
        const relevance = item.relevanceScore ? ` | Relevance: ${item.relevanceScore}/100` : '';
        const author = item.author ? ` | Author: ${item.author}` : '';
        const entry = `\n  ARTICLE: "${item.title || 'Untitled'}" | SOURCE: ${sourceName}${author}${date}${url}${relevance}\n  ${content}`;
        if (runningChars + entry.length > maxTotalChars && !item.priority) {
            truncated = true;
            break;
        }
        evidenceEntries.push(entry);
        runningChars += entry.length;
        if (item.priority) {
            const note = `  *** PRIORITY CITATION - User flagged this article for MANDATORY prominent placement ***`;
            evidenceEntries.push(note);
            runningChars += note.length;
        }
        totalArticlesInjected++;
    }
    if (truncated) {
        evidenceEntries.push(
            `\n*** EVIDENCE CATALOG TRUNCATED to fit within ${maxTotalChars.toLocaleString()}-char budget. Cited ${totalArticlesInjected} of ${rawSources.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)} available articles. Cite from the SOURCE CATALOG names - do not invent claims from sources not shown above. ***`
        );
    }

    if (evidenceEntries.length === 0) return '';

    const totalCollected = rawSources.reduce(
        (s: number, r: any) => s + (r.items?.length || 0),
        0
    );

    const sourceCatalog =
        sourceNames.size > 0
            ? `\n=== SOURCE CATALOG (${sourceNames.size} sources - cite by exact name) ===\n${Array.from(sourceNames).map(s => `- ${s}`).join('\n')}\n=== END SOURCE CATALOG ===\n`
            : '';

    // IRON LAW preamble - extracted from narrative composer rules + strategic-report-writer.
    // This is what makes each deliverable cite the wide external corpus rather than
    // collapsing onto the same 4-5 client documents.
    const ironLaw = `
=== IRON LAW: EVIDENCE PROVENANCE FOR ${opts.deliverableName.toUpperCase()} ===
Your output is being graded on EVIDENCE BREADTH, EVIDENCE DEPTH, and CITATION SPECIFICITY.

CITATION DISCIPLINE (non-negotiable):
1. Cite specific source names from the SOURCE CATALOG above. Examples: "Higher Ed Dive", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024", "Hechinger Report".
2. NEVER use generic references: "research", "studies", "intelligence_sources", "sources", "data", "evidence", "analysis", "findings", "literature", "various sources", "multiple sources" - these are auto-rejected.
3. Every claim must trace to a named source - articles, posts, papers, government data - not to your training data.

EVIDENCE BREADTH FLOOR:
- At least ${minDistinctSources} DISTINCT named sources must appear across the citations of this deliverable.
- Draw on the BREADTH of the catalog; do not collapse onto a handful of sources.
- SOURCE TYPE IS IRRELEVANT TO VALUE. Uploaded documents, news articles, social posts, forum threads, videos, and academic papers are ALL equal. Rank every source by RELEVANCE TO THE RESEARCH OBJECTIVE, never by where it came from. A Reddit post that names exactly the problem in the goal outranks an off-goal academic paper. The user deliberately selected this data; use whatever is most relevant.

EVIDENCE DEPTH:
- Quote VERBATIM from articles when possible. "Dr. Jane Smith of MIT noted: '...'" beats "research suggests that..."
- Extract specific NUMBERS, DATES, DOLLAR AMOUNTS, PERCENTAGES from articles. Never approximate when the article gives a number.
- When 3+ sources agree, note the convergence explicitly: "This finding is corroborated by [src1], [src2], and [src3]."
- When sources disagree, note the tension: "While [src1] reports growth, [src2] documents contraction in the same segment."

ANTI-FABRICATION + ANTI-ANNOTATION RULE (composer rule 8):
- NEVER invent percentages, dollar amounts, dates, statistics, or named entities (people, companies, institutions).
- If a number you want to cite is not in the catalog above, do NOT invent one. Either find a different evidenced claim, or omit the metric (rephrase the sentence directionally without the number).
- NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", "baseline TBD", or any other QA-style meta-annotation in any user-facing field. This output is a finished consulting deliverable read by executives - not an annotated draft. If a claim is not evidenced, omit the claim; do not announce its absence.
- A fabricated "73%" anywhere - or a self-referential "EVIDENCE GAP" placeholder anywhere - is grounds for rejection.

CASE STUDIES > ABSTRACTIONS:
- When an article describes a specific organization's experience, present it as a 2-3 sentence case study. "Southern Oregon University received a $15M state lifeline in March 2025 after enrollment dropped below sustainability thresholds [GDELT News]."
- Reddit / forum / review evidence is PRIMARY practitioner evidence - quote it directly with attribution.

PRIORITY CITATIONS:
- Articles marked "*** PRIORITY CITATION ***" were user-flagged for mandatory prominent placement. Cite each one by name with a direct quote or specific data point.

=== END IRON LAW ===
`;

    const evidenceCatalog = `\n=== RAW INTELLIGENCE EVIDENCE FOR ${opts.deliverableName.toUpperCase()} (${totalArticlesInjected} articles injected from ${totalCollected} total collected across ${rawSources.length} sources) ===
This is the SAME evidence base the knowledge graph displays. Your deliverable must cite it with the same depth.

${evidenceEntries.join('\n')}
=== END RAW INTELLIGENCE EVIDENCE ===
`;

    return `${ironLaw}${sourceCatalog}${evidenceCatalog}`;
}

export async function loadDeliverableContext(goal: string): Promise<DeliverableContext> {
    let constraints = '';
    try {
        constraints = getActiveConstraints() || '';
    } catch (e) { /* no constraints available */ }

    let engagementMemory = '';
    try {
        // 2026-05-22 - Use buildEngagementSlug for slug consistency across
        // every read/write site (see geminiService.ts companion fix).
        const { loadEngagementMemory, buildEngagementSlug } = await import('./wikiService');
        const goalSlug = buildEngagementSlug(goal || '', 60);
        if (goalSlug) {
            const memory = await loadEngagementMemory(goalSlug, goal);
            if (memory) {
                engagementMemory = typeof memory === 'string'
                    ? memory
                    : (memory as any).body || (memory as any).content || '';
            }
        }
    } catch (e) { /* no engagement memory available */ }

    return { constraints, engagementMemory };
}

export function renderDeliverableContextBlock(ctx: DeliverableContext): string {
    const parts: string[] = [];
    if (ctx.constraints) {
        parts.push(`\nLEARNED CONSTRAINTS (from prior user feedback - apply to this generation):\n${ctx.constraints}`);
    }
    if (ctx.engagementMemory) {
        parts.push(`\nENGAGEMENT MEMORY (prior research on similar goals - build on, do not repeat):\n${ctx.engagementMemory}`);
    }
    return parts.join('\n');
}
