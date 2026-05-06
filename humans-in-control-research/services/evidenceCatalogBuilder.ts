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

    const evidenceEntries: string[] = [];
    const sourceNames = new Set<string>();
    let totalArticlesInjected = 0;

    for (const tier of [1, 2, 3]) {
        const tierSources = rawSources.filter(
            (s: any) => (s.credibilityTier || 3) === tier && s.items?.length > 0
        );
        if (tierSources.length === 0) continue;

        const contentCap = tier === 1 ? caps.tier1 : tier === 2 ? caps.tier2 : caps.tier3;
        const totalTierArticles = tierSources.reduce(
            (s: number, src: any) => s + (src.items?.length || 0),
            0
        );

        evidenceEntries.push(
            `\n--- ${TIER_LABELS[tier]} (${tierSources.length} sources, ${totalTierArticles} total articles) ---`
        );

        for (const src of tierSources) {
            const sourceName = src.source || src.sourceId || 'Unknown Source';
            sourceNames.add(sourceName);
            evidenceEntries.push(
                `\nSOURCE: ${sourceName} (T${tier}, ${src.items.length} articles)`
            );

            const sortedItems = [...(src.items || [])].sort((a: any, b: any) => {
                if (a.priority && !b.priority) return -1;
                if (!a.priority && b.priority) return 1;
                return (b.relevanceScore || 0) - (a.relevanceScore || 0);
            });

            for (const item of sortedItems) {
                const content = item.content ? String(item.content).substring(0, contentCap) : '';
                const date = item.date ? ` | Date: ${item.date}` : '';
                const url = item.url ? ` | URL: ${item.url}` : '';
                const relevance = item.relevanceScore ? ` | Relevance: ${item.relevanceScore}/100` : '';
                const author = item.author ? ` | Author: ${item.author}` : '';
                evidenceEntries.push(
                    `  ARTICLE: "${item.title || 'Untitled'}"${author}${date}${url}${relevance}\n  ${content}`
                );
                if (item.priority) {
                    evidenceEntries.push(
                        `  *** PRIORITY CITATION — User flagged this article for MANDATORY prominent placement ***`
                    );
                }
                totalArticlesInjected++;
            }
        }
    }

    if (evidenceEntries.length === 0) return '';

    const totalCollected = rawSources.reduce(
        (s: number, r: any) => s + (r.items?.length || 0),
        0
    );

    const sourceCatalog =
        sourceNames.size > 0
            ? `\n=== SOURCE CATALOG (${sourceNames.size} sources — cite by exact name) ===\n${Array.from(sourceNames).map(s => `- ${s}`).join('\n')}\n=== END SOURCE CATALOG ===\n`
            : '';

    // IRON LAW preamble — extracted from narrative composer rules + strategic-report-writer.
    // This is what makes each deliverable cite the wide external corpus rather than
    // collapsing onto the same 4-5 client documents.
    const ironLaw = `
=== IRON LAW: EVIDENCE PROVENANCE FOR ${opts.deliverableName.toUpperCase()} ===
Your output is being graded on EVIDENCE BREADTH, EVIDENCE DEPTH, and CITATION SPECIFICITY.

CITATION DISCIPLINE (non-negotiable):
1. Cite specific source names from the SOURCE CATALOG above. Examples: "Higher Ed Dive", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024", "Hechinger Report".
2. NEVER use generic references: "research", "studies", "intelligence_sources", "sources", "data", "evidence", "analysis", "findings", "literature", "various sources", "multiple sources" — these are auto-rejected.
3. Every claim must trace to a named source — articles, posts, papers, government data — not to your training data.

EVIDENCE BREADTH FLOOR:
- At least ${minDistinctSources} DISTINCT named sources must appear across the citations of this deliverable.
- At least ${minExternalPct}% of citations must come from EXTERNAL intelligence (the SOURCE CATALOG above), NOT from uploaded client documents.
- If the corpus contains ${totalArticlesInjected}+ external articles, citing only client PDFs is a failure mode.

EVIDENCE DEPTH:
- Quote VERBATIM from articles when possible. "Dr. Jane Smith of MIT noted: '...'" beats "research suggests that..."
- Extract specific NUMBERS, DATES, DOLLAR AMOUNTS, PERCENTAGES from articles. Never approximate when the article gives a number.
- When 3+ sources agree, note the convergence explicitly: "This finding is corroborated by [src1], [src2], and [src3]."
- When sources disagree, note the tension: "While [src1] reports growth, [src2] documents contraction in the same segment."

ANTI-FABRICATION + ANTI-ANNOTATION RULE (composer rule 8):
- NEVER invent percentages, dollar amounts, dates, statistics, or named entities (people, companies, institutions).
- If a number you want to cite is not in the catalog above, do NOT invent one. Either find a different evidenced claim, or omit the metric (rephrase the sentence directionally without the number).
- NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", "baseline TBD", or any other QA-style meta-annotation in any user-facing field. This output is a finished consulting deliverable read by executives — not an annotated draft. If a claim is not evidenced, omit the claim; do not announce its absence.
- A fabricated "73%" anywhere — or a self-referential "EVIDENCE GAP" placeholder anywhere — is grounds for rejection.

CASE STUDIES > ABSTRACTIONS:
- When an article describes a specific organization's experience, present it as a 2-3 sentence case study. "Southern Oregon University received a $15M state lifeline in March 2025 after enrollment dropped below sustainability thresholds [GDELT News]."
- Reddit / forum / review evidence is PRIMARY practitioner evidence — quote it directly with attribution.

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
        const { loadEngagementMemory } = await import('./wikiService');
        const goalSlug = (goal || '').substring(0, 60).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
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
        parts.push(`\nLEARNED CONSTRAINTS (from prior user feedback — apply to this generation):\n${ctx.constraints}`);
    }
    if (ctx.engagementMemory) {
        parts.push(`\nENGAGEMENT MEMORY (prior research on similar goals — build on, do not repeat):\n${ctx.engagementMemory}`);
    }
    return parts.join('\n');
}
