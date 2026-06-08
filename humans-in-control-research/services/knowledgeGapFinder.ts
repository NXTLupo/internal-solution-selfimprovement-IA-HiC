/**
 * Knowledge Gap Finder - Karpathy Plan Phase 2.3.
 *
 * Surfaces what the corpus CANNOT answer about the engagement goal and the
 * deliverable frameworks, before the deliverables ship. Designed to make the
 * absence of evidence visible instead of letting it disappear into a confident-
 * looking deliverable that quietly omits half the required dimensions.
 *
 * Two baselines per the spec:
 *   A. Engagement goal - parsed into sub-questions; check coverage in corpus
 *   B. Framework page for each deliverable type - required dimensions become
 *      questions; check coverage
 *   D. Cached prior engagements - if a question is uncovered, search
 *      sessions/_topic-cache/ and wiki/engagements/ for prior-engagement
 *      content that might answer it
 *
 * For each detected gap, proposes active remediation: specific web searches,
 * subreddit pulls, YouTube fetches, with a runnable prompt the user (or the
 * system) can execute to close the gap.
 *
 * Gaps feed FIVE surfaces:
 *   1. wiki/synthesis/knowledge-gaps-<engagement-slug>.md (per-run page)
 *   2. Reasoning Stream events as gaps are detected
 *   3. KnowledgeGapsPanel in the Knowledge Library
 *   4. Inline N-gap chip on each affected deliverable card
 *   5. Self-improvement loop: repeated gaps become wiki/known-gaps/<topic>.md
 *      which next-session retrieval reads
 *
 * The deliverable itself NEVER references its own gaps. Gap fields are omitted
 * from the rendered output - no annotations, no hallucinated fill. Gaps are a
 * META layer the user reads to act, not content the model narrates in the
 * artifact.
 *
 * Created 2026-05-23 in response to user spec answers to the audit doc's
 * "What specs you need to complete findKnowledgeGaps" question.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

// ============================================================================
// TYPES
// ============================================================================

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export type GapStatus = 'open' | 'in_progress' | 'covered' | 'accepted';
export type SuggestedSourceType = 'web_search' | 'subreddit' | 'youtube' | 'article' | 'cached_engagement' | 'academic';

export interface SuggestedSource {
    type: SuggestedSourceType;
    query: string;
    rationale: string;
    url?: string;            // for cached_engagement, the wiki path
    estimatedYield?: 'high' | 'medium' | 'low';
}

export interface KnowledgeGap {
    id: string;
    engagementSlug: string;
    detectedAt: string;
    question: string;
    severity: GapSeverity;

    triggeredBy: {
        type: 'engagement_goal' | 'framework_dimension' | 'persona_dimension';
        source: string;        // the goal phrase or framework section that implied this question
    };

    affectedDeliverables: string[];   // e.g., ['personas', 'recommendations']
    affectedKpis: string[];           // KPIs this gap blocks measurement of
    affectedJourneyPhases: string[];  // journey phases this gap leaves thin

    suggestedSources: SuggestedSource[];
    remediationPrompt: string;        // ready-to-paste prompt for closing the gap

    coverageScore: number;            // 0..1; how well the corpus covers this question
    confidence: number;               // 0..1; model's confidence the gap is real

    status: GapStatus;
}

export interface FindGapsInput {
    goal: string;
    engagementSlug: string;
    industry?: string;
    deliverableTypes: string[];       // which deliverables we're checking coverage for
    corpusSummary: string;            // condensed view of corpus topics (from themes)
    corpusChunkCount: number;         // for cost-throttling decisions
}

export interface FindGapsResult {
    gaps: KnowledgeGap[];
    durationMs: number;
    questionsExamined: number;
    questionsCovered: number;
    cachedEngagementMatches: number;  // how many gaps found a cached-engagement remediation
}

// ============================================================================
// QUESTION EXTRACTION
// ============================================================================

/**
 * Parse the engagement goal into N specific sub-questions the corpus must
 * answer for the engagement to be properly scoped. Uses Gemini 3.5 Flash -
 * structured output, cheap.
 */
async function extractGoalQuestions(goal: string, industry?: string): Promise<string[]> {
    const prompt = `You are extracting researchable sub-questions from a consulting engagement goal.

GOAL: "${goal}"
${industry ? `INDUSTRY: ${industry}` : ''}

Output 8-15 SPECIFIC, ANSWERABLE research questions implied by this goal. Each question MUST be:
- Concrete (not "What is the future of X?")
- Evidence-seekable (could be answered by an article, study, dataset, or stakeholder interview)
- Distinct from the others (no near-duplicates)
- Worded as a question

Anti-patterns:
- Vague: "How can we improve outcomes?"
- Restating the goal: "How do we [goal phrase]?"
- Definitions: "What is donor retention?"

Examples of GOOD questions for a higher-ed advancement goal:
- "What is the current donor retention rate at peer institutions of similar size?"
- "Which donor segments contribute the largest share of mid-major gifts ($1K-10K)?"
- "How do advancement officers currently allocate their time across prospect research vs. outreach?"

Output STRICT JSON: { "questions": ["q1", "q2", ...] }`;

    const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: { temperature: 0.3, maxOutputTokens: 2000, responseMimeType: 'application/json' },
        }),
    });
    if (!resp.ok) throw new Error(`Goal question extraction failed: HTTP ${resp.status}`);
    const data = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    try {
        const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        return Array.isArray(parsed?.questions) ? parsed.questions.slice(0, 15) : [];
    } catch {
        return [];
    }
}

/**
 * Read the framework page for a deliverable type and extract the required
 * dimensions that the corpus must support. Each dimension becomes a question.
 */
async function extractFrameworkQuestions(deliverableType: string): Promise<Array<{ question: string; dimension: string }>> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/frameworks/${encodeURIComponent(deliverableType)}.md`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const framework: string = data.content || '';
        if (framework.length < 200) return [];

        const prompt = `You are extracting evidence-requirement questions from a consulting framework page.

FRAMEWORK (for "${deliverableType}" deliverable):
${framework.slice(0, 12000)}

Extract 5-10 SPECIFIC questions the corpus must answer for this framework to produce a credible deliverable. Each question MUST be:
- Tied to a specific framework dimension (name the dimension)
- Worded as a question the corpus could answer
- Concrete and evidence-seekable

Output STRICT JSON: { "items": [{ "question": "q", "dimension": "framework section name" }, ...] }`;

        const aiResp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 1500, responseMimeType: 'application/json' },
            }),
        });
        if (!aiResp.ok) return [];
        const aiData = await aiResp.json();
        const text: string = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        return Array.isArray(parsed?.items) ? parsed.items.slice(0, 10) : [];
    } catch {
        return [];
    }
}

// ============================================================================
// COVERAGE CHECK
// ============================================================================

interface CoverageVerdict {
    covered: boolean;
    coverageScore: number;
    confidence: number;
    evidenceChunks: string[];
    rationale: string;
}

/**
 * Check whether the corpus covers a question. Uses semantic similarity for
 * candidate retrieval, then LLM verdict for the binary answered/not-answered
 * call.
 */
async function checkCoverage(question: string, corpusSummary: string): Promise<CoverageVerdict> {
    let evidenceText = '';
    try {
        const retrievalResp = await fetch(`${PROXY_BASE}/api/wiki/fetch-articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: question, limit: 5, maxCharsPerArticle: 1500 }),
        });
        if (retrievalResp.ok) {
            const data = await retrievalResp.json();
            const articles = Array.isArray(data.articles) ? data.articles : [];
            evidenceText = articles.map((a: any) => `[${a.source || a.title || 'unknown'}] ${(a.content || a.text || '').slice(0, 1500)}`).join('\n\n');
        }
    } catch {
        // If retrieval fails, fall through with empty evidence
    }

    const prompt = `You are judging whether a corpus answers a specific research question.

QUESTION: "${question}"

CORPUS SUMMARY (topic coverage from theme analysis):
${corpusSummary.slice(0, 6000)}

TOP RETRIEVED EVIDENCE (semantically similar chunks):
${evidenceText.slice(0, 8000) || '(no semantically relevant chunks retrieved)'}

Judge:
- Is the question DIRECTLY answered by the corpus? (covered = true if a competent consultant could answer the question from the evidence above without inventing anything)
- Coverage score 0..1 (0 = no signal, 1 = fully answered with data)
- Your confidence in this judgment 0..1

Output STRICT JSON: { "covered": boolean, "coverageScore": 0..1, "confidence": 0..1, "rationale": "1-2 sentences explaining the judgment" }`;

    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.1, maxOutputTokens: 600, responseMimeType: 'application/json' },
            }),
        });
        if (!resp.ok) {
            return { covered: false, coverageScore: 0, confidence: 0.3, evidenceChunks: [], rationale: `Coverage check failed: HTTP ${resp.status}` };
        }
        const data = await resp.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        return {
            covered: !!parsed.covered,
            coverageScore: typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 0,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            evidenceChunks: [],
            rationale: parsed.rationale || '',
        };
    } catch (e: any) {
        return { covered: false, coverageScore: 0, confidence: 0.3, evidenceChunks: [], rationale: `Coverage check error: ${e?.message || e}` };
    }
}

// ============================================================================
// CACHED ENGAGEMENT SEARCH (Baseline D)
// ============================================================================

async function searchCachedEngagements(question: string): Promise<{ engagementSlug: string; matchedSummary: string; topicCacheFile?: string }[]> {
    try {
        const matches: Array<{ engagementSlug: string; matchedSummary: string; topicCacheFile?: string }> = [];

        const cacheResp = await fetch(`${PROXY_BASE}/api/topic-cache/list`);
        if (cacheResp.ok) {
            const cacheData = await cacheResp.json();
            const files: string[] = Array.isArray(cacheData.files) ? cacheData.files.slice(0, 20) : [];
            for (const file of files) {
                try {
                    const fileResp = await fetch(`${PROXY_BASE}/api/topic-cache/read/${encodeURIComponent(file)}`);
                    if (!fileResp.ok) continue;
                    const fileData = await fileResp.json();
                    const payload = JSON.parse(fileData.content || '{}');
                    const goal = payload.research_goal || '';
                    const topics = Array.isArray(payload.result?.topics) ? payload.result.topics : [];
                    const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 4);
                    const hitTopics = topics.filter((t: any) => {
                        const topicText = (t.name || '').toLowerCase() + ' ' + (t.summary || '').toLowerCase();
                        return questionWords.some(w => topicText.includes(w));
                    });
                    if (hitTopics.length > 0) {
                        matches.push({
                            engagementSlug: payload.engagement_slug || file.replace(/^topics-/, '').replace(/\.json$/, ''),
                            matchedSummary: `Prior engagement "${goal.slice(0, 60)}" covered: ${hitTopics.slice(0, 3).map((t: any) => t.name).join(', ')}`,
                            topicCacheFile: file,
                        });
                    }
                } catch {
                    // skip malformed file
                }
                if (matches.length >= 3) break;
            }
        }
        return matches.slice(0, 3);
    } catch {
        return [];
    }
}

// ============================================================================
// REMEDIATION PROPOSAL
// ============================================================================

async function proposeRemediation(
    gap: Omit<KnowledgeGap, 'suggestedSources' | 'remediationPrompt' | 'id' | 'status' | 'detectedAt'>,
    cachedMatches: { engagementSlug: string; matchedSummary: string; topicCacheFile?: string }[],
): Promise<{ suggestedSources: SuggestedSource[]; remediationPrompt: string }> {
    const cachedBlock = cachedMatches.length > 0
        ? `CACHED ENGAGEMENTS THAT MIGHT ALREADY ANSWER THIS:\n${cachedMatches.map(m => `- ${m.matchedSummary} (path: ${m.topicCacheFile || m.engagementSlug})`).join('\n')}\n`
        : '';

    const prompt = `You are proposing concrete remediation steps to close a research-coverage shortfall in a consulting engagement.

THE SHORTFALL:
Question: "${gap.question}"
Severity: ${gap.severity}
Triggered by: ${gap.triggeredBy.type} - "${gap.triggeredBy.source}"
Affected deliverables: ${gap.affectedDeliverables.join(', ')}
Affected KPIs: ${gap.affectedKpis.join(', ') || '(none specified)'}
Affected journey phases: ${gap.affectedJourneyPhases.join(', ') || '(none specified)'}

${cachedBlock}

Propose 3-5 SPECIFIC sources to close this shortfall. Each source must include:
- type: one of "web_search" | "subreddit" | "youtube" | "article" | "cached_engagement" | "academic"
- query: the EXACT search query / subreddit URL / YouTube search to run (be specific - name the subreddit, name the journal, etc.)
- rationale: 1 sentence explaining why this source would answer the question
- estimatedYield: "high" | "medium" | "low"

If cached engagements are provided above, include AT LEAST ONE source of type "cached_engagement" pointing to that engagement.

Examples of GOOD remediation sources:
- type: "subreddit", query: "site:reddit.com/r/cscareerquestions \\"first job advisor\\" 2024..2025", rationale: "First-hand student voice on advisor experience", estimatedYield: "high"
- type: "academic", query: "Google Scholar: 'donor retention rate' 'higher education' 2022-2024", rationale: "Peer-reviewed retention benchmarks", estimatedYield: "high"
- type: "youtube", query: "youtube.com/results?search_query=university+advisor+ratemyprofessor+experience", rationale: "Long-form student testimony", estimatedYield: "medium"

Also write a single OPTIMIZED RESEARCH PROMPT the user can paste into ChatGPT/Claude/Perplexity to research this directly. The prompt should:
- Specify the exact question
- Name 2-3 source types to consult
- Specify the output format (e.g., "Return 5 bullet points with named sources and direct quotes")
- Avoid vague language

Output STRICT JSON: { "suggestedSources": [...], "remediationPrompt": "..." }`;

    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.4, maxOutputTokens: 2000, responseMimeType: 'application/json' },
            }),
        });
        if (!resp.ok) {
            return { suggestedSources: [], remediationPrompt: '' };
        }
        const data = await resp.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        const suggestedSources: SuggestedSource[] = Array.isArray(parsed.suggestedSources) ? parsed.suggestedSources : [];

        for (const cm of cachedMatches) {
            if (!suggestedSources.find(s => s.type === 'cached_engagement' && s.query?.includes(cm.engagementSlug))) {
                suggestedSources.unshift({
                    type: 'cached_engagement',
                    query: cm.engagementSlug,
                    url: cm.topicCacheFile ? `sessions/_topic-cache/${cm.topicCacheFile}` : `wiki/engagements/${cm.engagementSlug}.md`,
                    rationale: cm.matchedSummary,
                    estimatedYield: 'high',
                });
            }
        }

        return {
            suggestedSources: suggestedSources.slice(0, 8),
            remediationPrompt: parsed.remediationPrompt || '',
        };
    } catch {
        return { suggestedSources: [], remediationPrompt: '' };
    }
}

// ============================================================================
// SEVERITY SCORING
// ============================================================================

function scoreSeverity(opts: {
    triggeredByType: KnowledgeGap['triggeredBy']['type'];
    coverageScore: number;
    affectedDeliverableCount: number;
}): GapSeverity {
    if (opts.triggeredByType === 'engagement_goal' && opts.coverageScore < 0.2 && opts.affectedDeliverableCount >= 2) {
        return 'critical';
    }
    if (opts.coverageScore < 0.1) return 'high';
    if (opts.coverageScore < 0.3) return 'medium';
    return 'low';
}

// ============================================================================
// AFFECTED DELIVERABLES / KPIS / JOURNEY PHASES
// ============================================================================

const QUESTION_TO_DELIVERABLE_HINTS: Array<{ keywords: RegExp; deliverables: string[] }> = [
    { keywords: /\b(persona|user|stakeholder|customer|student|donor|alumni)\b/i, deliverables: ['personas'] },
    { keywords: /\b(roadmap|initiative|horizon|timeline|sequence)\b/i, deliverables: ['roadmap'] },
    { keywords: /\b(feature|requirement|product|prd|user story)\b/i, deliverables: ['prd'] },
    { keywords: /\b(journey|touchpoint|stage|moment of truth|service blueprint)\b/i, deliverables: ['journey_map'] },
    { keywords: /\b(capability|maturity|operational|process)\b/i, deliverables: ['gap_analysis'] },
    { keywords: /\b(competitor|peer|benchmark|positioning|differentiator)\b/i, deliverables: ['competitive_analysis'] },
    { keywords: /\b(architecture|system|integration|tech stack|platform)\b/i, deliverables: ['tech_architecture', 'tech_audit'] },
    { keywords: /\b(strategy|guiding policy|diagnosis|coherent action)\b/i, deliverables: ['recommendations'] },
];

const QUESTION_TO_JOURNEY_HINTS: Array<{ keywords: RegExp; phases: string[] }> = [
    { keywords: /\b(awareness|discover|find out|first hear)\b/i, phases: ['awareness'] },
    { keywords: /\b(consider|compare|evaluate|research)\b/i, phases: ['consideration'] },
    { keywords: /\b(onboard|signup|start|begin|join)\b/i, phases: ['onboarding'] },
    { keywords: /\b(engage|use|active|daily|workflow)\b/i, phases: ['engagement'] },
    { keywords: /\b(renew|retain|loyalty|repeat)\b/i, phases: ['retention'] },
    { keywords: /\b(advocate|recommend|refer)\b/i, phases: ['advocacy'] },
];

function inferAffectedDeliverables(question: string, deliverableTypes: string[]): string[] {
    const hits = new Set<string>();
    for (const hint of QUESTION_TO_DELIVERABLE_HINTS) {
        if (hint.keywords.test(question)) {
            for (const d of hint.deliverables) if (deliverableTypes.includes(d)) hits.add(d);
        }
    }
    return Array.from(hits);
}

function inferAffectedJourneyPhases(question: string): string[] {
    const hits = new Set<string>();
    for (const hint of QUESTION_TO_JOURNEY_HINTS) {
        if (hint.keywords.test(question)) {
            for (const p of hint.phases) hits.add(p);
        }
    }
    return Array.from(hits);
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

export async function findKnowledgeGaps(input: FindGapsInput, onProgress?: (msg: string) => void): Promise<FindGapsResult> {
    const t0 = Date.now();
    const report = (m: string) => { if (onProgress) onProgress(m); };

    report('Knowledge gap finder: extracting questions from goal + frameworks...');

    const [goalQuestions, ...frameworkQuestionsPerDeliverable] = await Promise.all([
        extractGoalQuestions(input.goal, input.industry),
        ...input.deliverableTypes.map(dt => extractFrameworkQuestions(dt)),
    ]);

    const frameworkQuestions: Array<{ question: string; deliverable: string; dimension: string }> = [];
    for (let i = 0; i < frameworkQuestionsPerDeliverable.length; i++) {
        const dt = input.deliverableTypes[i];
        for (const fq of frameworkQuestionsPerDeliverable[i]) {
            frameworkQuestions.push({ question: fq.question, deliverable: dt, dimension: fq.dimension });
        }
    }

    const totalQuestions = goalQuestions.length + frameworkQuestions.length;
    report(`Knowledge gap finder: ${goalQuestions.length} goal questions + ${frameworkQuestions.length} framework questions = ${totalQuestions} total to check.`);

    const goalCoverageChecks = await Promise.all(
        goalQuestions.map(q => checkCoverage(q, input.corpusSummary).then(v => ({ q, v, source: 'engagement_goal' as const, sourceText: 'engagement goal' })))
    );
    const fwCoverageChecks = await Promise.all(
        frameworkQuestions.map(fq => checkCoverage(fq.question, input.corpusSummary).then(v => ({ q: fq.question, v, source: 'framework_dimension' as const, sourceText: `${fq.deliverable}/${fq.dimension}`, deliverable: fq.deliverable })))
    );

    const allChecks = [...goalCoverageChecks, ...fwCoverageChecks];
    const coveredCount = allChecks.filter(c => c.v.covered).length;
    const uncovered = allChecks.filter(c => !c.v.covered);

    report(`Knowledge gap finder: ${coveredCount} of ${totalQuestions} questions covered. ${uncovered.length} shortfalls to enrich.`);

    let cachedEngagementMatches = 0;
    const gaps: KnowledgeGap[] = await Promise.all(uncovered.map(async (uc, idx) => {
        const cachedMatches = await searchCachedEngagements(uc.q);
        if (cachedMatches.length > 0) cachedEngagementMatches += 1;

        const affectedDeliverables = uc.source === 'framework_dimension' && 'deliverable' in uc
            ? [uc.deliverable as string]
            : inferAffectedDeliverables(uc.q, input.deliverableTypes);
        const affectedJourneyPhases = inferAffectedJourneyPhases(uc.q);

        const gapShell: Omit<KnowledgeGap, 'suggestedSources' | 'remediationPrompt' | 'id' | 'status' | 'detectedAt'> = {
            engagementSlug: input.engagementSlug,
            question: uc.q,
            severity: scoreSeverity({
                triggeredByType: uc.source,
                coverageScore: uc.v.coverageScore,
                affectedDeliverableCount: affectedDeliverables.length,
            }),
            triggeredBy: { type: uc.source, source: uc.sourceText },
            affectedDeliverables,
            affectedKpis: [],
            affectedJourneyPhases,
            coverageScore: uc.v.coverageScore,
            confidence: uc.v.confidence,
        };

        const { suggestedSources, remediationPrompt } = await proposeRemediation(gapShell, cachedMatches);

        return {
            ...gapShell,
            id: `gap_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
            detectedAt: new Date().toISOString(),
            status: 'open',
            suggestedSources,
            remediationPrompt,
        } as KnowledgeGap;
    }));

    report(`Knowledge gap finder: ${gaps.length} shortfalls detected, ${cachedEngagementMatches} matched cached engagements.`);

    await persistGapsToWiki(gaps, input.engagementSlug);
    await persistGapsToKnownGaps(gaps);

    return {
        gaps,
        durationMs: Date.now() - t0,
        questionsExamined: totalQuestions,
        questionsCovered: coveredCount,
        cachedEngagementMatches,
    };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

async function persistGapsToWiki(gaps: KnowledgeGap[], engagementSlug: string): Promise<void> {
    if (gaps.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const content = `---
title: Knowledge Shortfalls - ${engagementSlug}
type: synthesis
engagement: ${engagementSlug}
detected_at: ${new Date().toISOString()}
shortfall_count: ${gaps.length}
critical_count: ${gaps.filter(g => g.severity === 'critical').length}
high_count: ${gaps.filter(g => g.severity === 'high').length}
exclude_from_compile: true
---

# Knowledge Shortfalls - ${engagementSlug}

Detected ${gaps.length} corpus-coverage shortfalls on ${today}.

Each entry is a question the engagement goal or a deliverable framework implies, but the current corpus cannot answer. These inform what evidence to collect next; they are NOT rendered inside the deliverables themselves.

${gaps.map(g => `
## ${g.severity.toUpperCase()} - ${g.question}

- **Triggered by**: ${g.triggeredBy.type} (${g.triggeredBy.source})
- **Coverage score**: ${g.coverageScore.toFixed(2)} (confidence ${g.confidence.toFixed(2)})
- **Affected deliverables**: ${g.affectedDeliverables.join(', ') || '(none specifically identified)'}
- **Affected journey phases**: ${g.affectedJourneyPhases.join(', ') || '(none specifically identified)'}

### Suggested sources to close this shortfall

${g.suggestedSources.map(s => `- **${s.type}**: \`${s.query}\` (${s.estimatedYield || 'medium'} yield) - ${s.rationale}${s.url ? ` [path: ${s.url}]` : ''}`).join('\n')}

### Ready-to-paste remediation prompt

\`\`\`
${g.remediationPrompt}
\`\`\`
`).join('\n')}
`;
    try {
        await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: `synthesis/knowledge-gaps-${engagementSlug}.md`,
                content,
            }),
        });
    } catch {
        // Best-effort
    }
}

async function persistGapsToKnownGaps(gaps: KnowledgeGap[]): Promise<void> {
    if (gaps.length === 0) return;
    const topics = new Map<string, KnowledgeGap[]>();
    for (const g of gaps) {
        const topic = extractTopicSlug(g.question);
        if (!topics.has(topic)) topics.set(topic, []);
        topics.get(topic)!.push(g);
    }
    for (const [topic, topicGaps] of topics) {
        const path = `known-gaps/${topic}.md`;
        const today = new Date().toISOString().split('T')[0];
        const entry = `\n## ${today} | ${topicGaps[0].engagementSlug}\n` +
            topicGaps.map(g => `- ${g.question} (severity: ${g.severity}, coverage: ${g.coverageScore.toFixed(2)})`).join('\n') +
            `\n`;
        try {
            await fetch(`${PROXY_BASE}/api/wiki/append`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content: entry }),
            });
        } catch {
            // Best-effort
        }
    }
}

function extractTopicSlug(question: string): string {
    const cleaned = question
        .toLowerCase()
        .replace(/^(what|how|why|when|where|which|who|does|do|is|are|can|should|could|would)\s+/i, '')
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'their', 'they', 'them', 'have', 'will'].includes(w))
        .slice(0, 4)
        .join('-');
    return cleaned.slice(0, 64) || 'misc';
}

// ============================================================================
// REMEDIATION EXECUTION (active-proposer mode)
// ============================================================================

export interface RemediationRunResult {
    gapId: string;
    sourceResults: Array<{
        source: SuggestedSource;
        success: boolean;
        resultCount?: number;
        error?: string;
        previewUrl?: string;
    }>;
    totalDurationMs: number;
}

export async function runRemediationForGap(gap: KnowledgeGap): Promise<RemediationRunResult> {
    const t0 = Date.now();
    const sourceResults: RemediationRunResult['sourceResults'] = [];

    for (const source of gap.suggestedSources) {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/knowledge-gaps/run-remediation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gapId: gap.id,
                    source,
                    engagementSlug: gap.engagementSlug,
                }),
            });
            if (resp.ok) {
                const data = await resp.json();
                sourceResults.push({
                    source,
                    success: true,
                    resultCount: data.resultCount,
                    previewUrl: data.previewUrl,
                });
            } else {
                const err = await resp.text();
                sourceResults.push({ source, success: false, error: err });
            }
        } catch (e: any) {
            sourceResults.push({ source, success: false, error: e?.message || String(e) });
        }
    }

    return {
        gapId: gap.id,
        sourceResults,
        totalDurationMs: Date.now() - t0,
    };
}
