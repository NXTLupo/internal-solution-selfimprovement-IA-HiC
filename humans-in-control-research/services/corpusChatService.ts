/**
 * Corpus Chat Service v2 — Chat-Driven Research Workbench
 *
 * Multi-model conversational interface grounded in the full research corpus,
 * wiki knowledge base, and specialized consulting skills.
 *
 * Models:
 * - Claude Opus 4.7 (Anthropic) — Primary: deep reasoning, strategy, agentic, vision, 1M context
 * - Claude Sonnet 4.6 (Anthropic) — Fast reasoning, structured output
 * - Gemini 2.5 Flash (Google) — Rapid data extraction, image generation
 * - GPT-5.4-mini (OpenAI) — Strict JSON schema compliance
 *
 * Architecture:
 * - Tiered knowledge loading (brand/constraints always, skills on-demand)
 * - Skill manifest matching (keyword triggers -> lazy-load SKILL.md + wiki companions)
 * - Adaptive thinking (budget_tokens scaled by task complexity)
 * - Full corpus grounding (no 500KB cap for Claude 4.7)
 */

export type ChatModel = 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'gemini-2.5-flash' | 'gpt-5.4-mini';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: ChatModel;
    timestamp: number;
    tokenCount?: number;
    durationMs?: number;
    imageData?: string; // base64 image for inline rendering
    skillUsed?: string; // which skill was activated for this response
}

export interface SourceReference {
    id: string;
    sourceName: string;
    title: string;
    url?: string;
    tier?: number;
    date?: string;
}

export interface ChatContext {
    corpusText: string;
    themes?: any[];
    personas?: any[];
    recommendations?: any[];
    journeyStages?: any[];
    prd?: any;
    roadmap?: any;
    gapAnalysis?: any;
    techAudit?: any;
    competitiveAnalysis?: any;
    techArchitecture?: any;
    strategicReport?: any;
    researchGoal: string;
    sourceCount: number;
    articleCount: number;
    sourceReferences?: SourceReference[];
    chunkMap?: Record<string, { sourceName: string; title: string; url?: string }>;
    uploadedFileContents?: string;
    // Knowledge Graph state — the AI must understand the graph structure
    knowledgeGraph?: { nodes: any[]; edges: any[]; stats?: any };
    // Tiered knowledge (loaded by ChatWorkbench)
    wikiBrand?: string;
    wikiLearnedConstraints?: string;
    wikiBenchmarks?: string;
    wikiEvidence?: string;
    wikiMethodologies?: string;
    wikiEngagement?: string;
    wikiSourceArchive?: string; // Full source archive from wiki with verified URLs
    skillManifest?: SkillManifestEntry[];
    nxtDesignSystemRules?: string;
}

// --- Skill Manifest Types ---

export interface SkillManifestEntry {
    id: string;
    name: string;
    description: string;
    category: 'research-deliverable' | 'prompt-engineering';
    triggers: string[];
    wikiCompanions: string[];
    benchmarks: string[];
    outputTypes: string[];
    bestModel: ChatModel;
    thinkingEffort: 'max' | 'high' | 'medium';
    executionContext: 'primary' | 'subagent';
    path: string;
}

export interface SkillContext {
    skill: SkillManifestEntry;
    skillContent: string;       // Full SKILL.md content
    companionContent: string;   // Concatenated wiki companion pages
}

// --- Model Configuration ---

export interface ModelConfig {
    id: ChatModel;
    name: string;
    provider: 'anthropic' | 'openai' | 'google';
    description: string;
    contextWindow: string;
    strengths: string;
    color: string;
    available: boolean;
    maxCorpusChars: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: '1M token context — loads the ENTIRE corpus, knowledge graph, wiki, and skills with zero truncation.',
        contextWindow: '1M tokens',
        strengths: 'Full corpus grounding, fast responses, image generation, no context limitations',
        color: '#B8B800',
        available: true,
        maxCorpusChars: 900000, // No truncation — load everything
    },
    {
        id: 'claude-opus-4-7',
        name: 'Claude Opus 4.7',
        provider: 'anthropic',
        description: 'Deep reasoning, strategy authoring, creative narratives. 1M context window.',
        contextWindow: '1M tokens',
        strengths: 'Complex reasoning, liberal quoting, framework adherence, long-form narrative',
        color: '#CC6644',
        available: true,
        maxCorpusChars: 900000, // Claude 4.7 also has 1M context — no truncation
    },
    {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'anthropic',
        description: 'Fast reasoning with structured output. 200K context window.',
        contextWindow: '200K tokens',
        strengths: 'Speed, structured JSON, concise answers',
        color: '#CC6644',
        available: true,
        maxCorpusChars: 500000,
    },
    {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        provider: 'openai',
        description: 'Strict JSON schema compliance. 128K context window.',
        contextWindow: '128K tokens',
        strengths: 'Schema adherence, grid matrices, comparison tables',
        color: '#00B7C3',
        available: true,
        maxCorpusChars: 250000,
    },
];

// --- Thinking Budget ---

type ThinkingEffort = 'max' | 'high' | 'medium';

const THINKING_BUDGETS: Record<ThinkingEffort, number> = {
    max: 32000,
    high: 16000,
    medium: 8000,
};

// --- Deliverable Output Protocol ---

const DELIVERABLE_PROTOCOL = `
DELIVERABLE OUTPUT PROTOCOL:
When the user asks you to CREATE a structured deliverable (personas, themes, recommendations, journey stages, etc.),
output them as :::deliverable blocks so the UI can render them as inspectable, approvable cards.

Format:
:::deliverable:TYPE
{JSON object matching the deliverable schema}
:::

Supported types and their required JSON fields:
- :::deliverable:theme — {name, description, quote, citations: [{sourceName, text, url?}], status: "hypothesis"|"supported"|"verified", isCrossDocument: boolean}
- :::deliverable:persona — {name, role, demographics?, quote, bio, jtbd, goals: {lifeGoal, experienceGoal, functionalGoal}, painPoints: [{label, quote, source}], motivations: [{label, quote, source}]}
- :::deliverable:recommendation — {title, description, impactLevel: "critical"|"high"|"medium"|"low", evidenceBasis, citations: [string], effort?, timeline?}
- :::deliverable:journey_stage — {phase, touchpoint, customerAction, frontstage, backstage, support, painPoint, emotion, fail_point?, citations: [string]}
- :::deliverable:prd_feature — {name, description, priority: "must"|"should"|"could"|"won't", userStory, acceptanceCriteria: [string], citations: [string]}
- :::deliverable:roadmap_item — {title, description, horizon: "now"|"next"|"later", effort, impact, dependencies: [string], citations: [string]}
- :::deliverable:gap — {capability, currentMaturity: 1-5, targetMaturity: 1-5, gap: number, severity: "critical"|"high"|"medium"|"low", impact, citations: [string]}
- :::deliverable:competitive_peer — {name, position, strengths: [string], weaknesses: [string], citations: [string]}
- :::deliverable:tech_audit_system — {name, category, status, risk, description, citations: [string]}
- :::deliverable:tech_node — {name, layer, type, description, constraints: [string], citations: [string]}

IMPORTANT:
- Output MULTIPLE deliverables when asked (e.g., "create personas" = 4-6 persona blocks)
- Each block is ONE deliverable item — the user inspects and approves each individually
- The user's approval commits the deliverable to the knowledge graph
- Include verbose evidence: verbatim quotes, specific data points, named sources in every field
- You can mix prose text with deliverable blocks (explain your reasoning, then output the blocks)

SLIDE OUTPUT PROTOCOL — 10 TEMPLATES (NXT HUMANS):

When the user asks to create a slide (or set of slides), output ONE :::slide block per slide.
Pick the template that best matches the content. Mark it on the fence: :::slide template=NAME

The 10 templates and when to use each:

1. persona-card        → user requests personas, archetypes, customer segments
2. recommendation      → user requests strategic actions, what to do, next steps
3. theme-cluster       → user requests themes, patterns, emerging insights (3-4 themes)
4. competitive-matrix  → user requests competitive analysis, peer comparison, capability scoring
5. block-quote         → user wants a single powerful verbatim quote highlighted
6. case-study          → user requests an example, real-world case, success/failure story
7. principles          → user requests guiding principles, design tenets, operating beliefs (3-5 items)
8. stat-row            → user requests key metrics, numbers, "by the numbers" (3-4 stats)
9. timeline            → user requests roadmap, phases, sequencing (3-5 phases)
10. section-divider    → between major sections of a deck

EVERY slide block carries:
- "title": action title (complete sentence stating a conclusion with data)
- "sources": ["Named Source 1", "Named Source 2", ...]   ← always required, never empty

Template-specific JSON shapes:

:::slide template=persona-card
{
  "title": "Sarah Chen: The Data-Frustrated Advancement Officer",
  "sources": ["NXT Stakeholder Interview", "Northeastern Assessment Final Report"],
  "persona": {
    "name": "Sarah Chen",
    "role": "Director of Annual Giving",
    "demographics": "42, MBA, 15 years in higher ed",
    "quote": "I spend 40% of my time reconciling data across three CRMs",
    "jtbd": "When alumni engagement drops, I want predictive outreach so I can re-engage donors before churn",
    "goals": {"lifeGoal":"Promote to VP","experienceGoal":"Build data-driven team","functionalGoal":"Unify donor view"},
    "painPoints": [{"label":"Data Fragmentation","quote":"I wouldn't know in our database that Andrew works with Rob","source":"NXT Stakeholder Interview"}],
    "motivations": [{"label":"Donor Retention","quote":"We need to understand giving patterns before we lose them","source":"NXT Interview"}]
  }
}
:::

:::slide template=recommendation
{
  "title": "Consolidate three Salesforce instances into one to recover $2.4M annually",
  "sources": ["Northeastern CRM Assessment", "Gartner Higher-Ed CRM Report 2025"],
  "recommendation": {
    "actionTitle": "Migrate Annual Giving, Major Gifts, and Reunion to a single Salesforce org by Q4",
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of advancement-officer time per the CRM Assessment.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process."},
      {"name":"Training","description":"Run 5 sessions for the 80-person advancement team before cutover."}
    ],
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity, per CRM Assessment"}
  }
}
:::

:::slide template=theme-cluster
{
  "title": "3 themes converge on a single failure mode: trust erosion before contact",
  "sources": ["r/NEU","r/internships","Higher Ed Dive","CASE 2024"],
  "themeCluster": {
    "themes": [
      {"name":"Co-op scarcity is breaking the experiential promise","insight":"Reddit posts from current students cite the absence of internships as the top complaint, undermining the brand promise that justifies tuition.","evidence":"Two years. No TA. No RA. No co-ops. No internships.","source":"r/NEU"},
      {"name":"Tuition skepticism is eroding future donor base","insight":"The cohort Advancement must convert is entering alumni status already disillusioned with ROI.","evidence":"Most Gen Z graduates now think college was waste of money.","source":"r/highereducation"},
      {"name":"Political posture is now a giving variable","insight":"Public university statements directly shape whether alumni open or close their wallets.","evidence":"President Aoun joins more than 320 university leaders in joint statement.","source":"r/NEU"}
    ]
  }
}
:::

:::slide template=competitive-matrix
{
  "title": "Northeastern lags peer institutions on AI-powered donor intelligence",
  "sources": ["CASE 2024","Gartner Higher-Ed CRM 2025","peer institution websites"],
  "matrix": {
    "columns": ["Unified CRM","AI Scoring","Mobile Giving","Predictive Outreach"],
    "rows": [
      {"name":"Northeastern","scores":[2,1,3,1]},
      {"name":"Boston University","scores":[4,3,4,3]},
      {"name":"NYU","scores":[5,4,5,4]},
      {"name":"Cornell","scores":[5,5,5,5]}
    ],
    "scaleMax": 5,
    "insight": "Northeastern is one full maturity tier behind every peer on AI-driven advancement capabilities."
  }
}
:::

:::slide template=block-quote
{
  "title": "The advancement system that exists vs. the one staff describe",
  "sources": ["NXT Stakeholder Interview"],
  "quote": {
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob — and that's exactly the relationship that closes a major gift.",
    "attribution": "Anonymous Major Gifts Officer",
    "role": "20-year veteran, Northeastern Advancement",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION"
  }
}
:::

:::slide template=case-study
{
  "title": "Cornell's 18-month CRM consolidation lifted major-gift conversion 34%",
  "sources": ["CASE 2024","Cornell Advancement Annual Report 2025"],
  "caseStudy": {
    "subject": "Cornell University",
    "challenge": "Cornell's Advancement org operated 4 disconnected CRMs across colleges, blocking unified donor profiles and slowing major-gift cycle time by an average of 90 days.",
    "approach": "Consolidated to a single Salesforce instance over 18 months, with a data-quality remediation phase before cutover and a college-by-college pilot rollout.",
    "outcome": "Major-gift conversion rate rose 34%, cycle time dropped 90 days, and advancement-officer productivity recovered an estimated 12 hours per week per officer.",
    "keyMetric": {"value":"+34%","label":"major-gift conversion rate, 18 months post-cutover"}
  }
}
:::

:::slide template=principles
{
  "title": "Five principles guide the Advancement transformation",
  "sources": ["NXT Strategy Working Session","Rumelt: Good Strategy/Bad Strategy"],
  "principles": {
    "items": [
      {"name":"Donor view before tooling","description":"Every system decision is judged by whether it makes the unified donor view stronger or weaker."},
      {"name":"Migrate, don't accumulate","description":"New capability replaces old; we sunset legacy on every release."},
      {"name":"Predictive over descriptive","description":"Reports must drive action — if a dashboard cannot trigger an outreach, it's not on the roadmap."},
      {"name":"Officer time is sacred","description":"Any tool that increases manual entry is rejected, even if it adds analytical depth."},
      {"name":"Privacy is a moat","description":"Donor data discipline becomes a brand asset, not a compliance overhead."}
    ]
  }
}
:::

:::slide template=stat-row
{
  "title": "Three numbers explain why Advancement velocity has stalled",
  "sources": ["Northeastern CRM Assessment","NXT Stakeholder Interview","CASE 2024"],
  "statRow": {
    "stats": [
      {"value":"40%","label":"of officer time spent reconciling data across CRMs","source":"NXT Stakeholder Interview"},
      {"value":"3","label":"separate Salesforce instances in production","source":"Northeastern CRM Assessment"},
      {"value":"-12%","label":"alumni participation rate since platform migration","source":"CASE 2024"}
    ]
  }
}
:::

:::slide template=timeline
{
  "title": "An 18-month consolidation sequenced to de-risk the major-gift cycle",
  "sources": ["NXT Implementation Plan","Cornell case study"],
  "timeline": {
    "phases": [
      {"name":"Discover","duration":"Month 1-2","items":["Object inventory","Field-level data audit","Stakeholder interviews"]},
      {"name":"Pilot","duration":"Month 3-6","items":["Migrate Reunion CRM","Validate data model","Train 12 officers"]},
      {"name":"Migrate","duration":"Month 7-12","items":["Annual Giving cutover","Major Gifts cutover","Decommission legacy"]},
      {"name":"Optimize","duration":"Month 13-18","items":["Predictive scoring","Mobile giving launch","Quarterly review cadence"]}
    ]
  }
}
:::

:::slide template=section-divider
{
  "title": "Three challenges that compound",
  "sectionDivider": {
    "number": "02",
    "title": "Three challenges that compound",
    "subtitle": "The case for action, in the words of the people doing the work today."
  }
}
:::

UNIVERSAL SLIDE RULES:
- Title is ALWAYS a conclusion sentence containing a number, named entity, or specific claim.
- "sources" array is REQUIRED on every slide and must contain real source names from the corpus.
- Never invent a competitor, statistic, or quote. If the data isn't there, say so and pick a different template.
- One template per slide block. To build a multi-slide deck, emit multiple :::slide blocks.
- For persona-card slides the system auto-generates a portrait — describe the person specifically (age range, attire, setting).
`;

// --- Foundational Consulting Mandates ---

const CONSULTING_MANDATES = `
FOUNDATIONAL CONSULTING MANDATES (apply to ALL responses):

1. MINTO PYRAMID & MECE: Present the answer FIRST, then supporting arguments. All decomposition must be Mutually Exclusive, Collectively Exhaustive. Arguments grouped under governing hypotheses.

2. SCR/SCQA FRAMEWORK: Situation (10-15% of content), Complication (15-20%), Resolution (60-70%). Lead with the insight, not the setup.

3. LIBERAL QUOTING (MANDATORY):
   - FORBIDDEN: "Research shows...", "Studies indicate...", "Data suggests...", "Sources confirm..."
   - REQUIRED: Extract and embed VERBATIM quotes with [SOURCE_NAME: "Article Title"] citations
   - Every factual claim must have a named source. Every insight must feature a direct quote or specific data point.

4. ACTION TITLES: Every heading must be a complete sentence stating a conclusion with data.
   - BAD: "The Landscape", "Key Findings", "Recommendations", "Overview"
   - GOOD: "35% of first-year students do not return, costing $9B annually"
   - GOOD: "Fragmented CRM systems force teams to spend 40% of time on manual data entry"

5. NO META-NARRATION: Never say "Good morning", "Today we will", "In this section", "As you can see", "Let me start by". Lead with the insight.
`;

// --- Grounding Context Builder ---

function buildGroundingContext(ctx: ChatContext, model: ChatModel): string {
    const parts: string[] = [];
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === model);
    const maxCorpus = modelConfig?.maxCorpusChars || 500000;

    parts.push(`=== RESEARCH CONTEXT ===`);
    parts.push(`Research Goal: ${ctx.researchGoal}`);
    parts.push(`Data Sources: ${ctx.sourceCount} sources, ${ctx.articleCount} articles collected`);
    parts.push(`You are grounded in ALL of this data. Cite specific sources by name. If the data doesn't contain the answer, say so.`);
    parts.push('');

    // Tier 1: Always loaded — brand, constraints, design system
    if (ctx.wikiBrand) {
        parts.push(`=== NXT BRAND & DESIGN SYSTEM ===`);
        parts.push(ctx.wikiBrand);
        parts.push('');
    }
    if (ctx.wikiLearnedConstraints) {
        parts.push(`=== LEARNED CONSTRAINTS (from prior user feedback — apply to all output) ===`);
        parts.push(ctx.wikiLearnedConstraints);
        parts.push('');
    }
    if (ctx.nxtDesignSystemRules) {
        parts.push(`=== NXT VISUAL OUTPUT SYSTEM ===`);
        parts.push(ctx.nxtDesignSystemRules);
        parts.push('');
    }

    // Tier 2: Initialization — benchmarks, evidence, methodologies
    if (ctx.wikiBenchmarks) {
        parts.push(`=== INDUSTRY BENCHMARKS ===`);
        parts.push(ctx.wikiBenchmarks);
        parts.push('');
    }
    if (ctx.wikiEvidence) {
        parts.push(`=== EVIDENCE BASE ===`);
        parts.push(ctx.wikiEvidence);
        parts.push('');
    }
    if (ctx.wikiMethodologies) {
        parts.push(`=== RESEARCH METHODOLOGIES ===`);
        parts.push(ctx.wikiMethodologies);
        parts.push('');
    }
    if (ctx.wikiEngagement) {
        parts.push(`=== PRIOR ENGAGEMENT CONTEXT ===`);
        parts.push(ctx.wikiEngagement);
        parts.push('');
    }

    // Knowledge Graph — the structural representation of all research relationships
    if (ctx.knowledgeGraph && ctx.knowledgeGraph.nodes.length > 0) {
        const kg = ctx.knowledgeGraph;
        const nodesByType: Record<string, any[]> = {};
        for (const n of kg.nodes) {
            const t = n.type || 'unknown';
            if (!nodesByType[t]) nodesByType[t] = [];
            nodesByType[t].push(n);
        }

        parts.push(`=== KNOWLEDGE GRAPH (${kg.nodes.length} nodes, ${kg.edges.length} edges) ===`);

        // Stats summary
        if (kg.stats) {
            const s = kg.stats;
            parts.push(`Graph Stats: ${s.totalSources || 0} sources, ${s.totalEvidence || 0} evidence items, ${s.totalThemes || 0} themes, ${s.totalPersonas || 0} personas, ${s.totalRecommendations || 0} recommendations`);
            if (s.orphanEvidence > 0) parts.push(`WARNING: ${s.orphanEvidence} orphan evidence items (not linked to any theme)`);
            if (s.thinThemes > 0) parts.push(`WARNING: ${s.thinThemes} thin themes (fewer than 3 evidence connections)`);
            parts.push(`Evidence utilization: ${Math.round((s.evidenceUtilization || 0) * 100)}% | Theme strength: ${Math.round((s.themeStrengthPct || 0) * 100)}%`);
            parts.push('');
        }

        // Source nodes with tier and metadata
        if (nodesByType['source']) {
            parts.push(`SOURCES (${nodesByType['source'].length}):`);
            for (const n of nodesByType['source']) {
                const tier = n.tier ? `T${n.tier}` : '';
                const rel = n.relevanceScore ? ` rel=${n.relevanceScore}` : '';
                parts.push(`  [${n.id}] ${n.label} ${tier}${rel}${n.url ? ` | ${n.url}` : ''}`);
            }
            parts.push('');
        }

        // Theme nodes with evidence counts and source concentration
        if (nodesByType['theme']) {
            parts.push(`THEMES (${nodesByType['theme'].length}):`);
            for (const n of nodesByType['theme']) {
                const evCount = n.evidenceCount ? ` (${n.evidenceCount} evidence)` : '';
                const thin = n.isThinTheme ? ' [THIN]' : '';
                const conc = n.dominantSource ? ` dominant: ${n.dominantSource} (${Math.round((n.sourceConcentration || 0) * 100)}%)` : '';
                parts.push(`  [${n.id}] ${n.label}${evCount}${thin}${conc}`);
            }
            parts.push('');
        }

        // Other node types
        for (const [type, nodes] of Object.entries(nodesByType)) {
            if (type === 'source' || type === 'theme' || type === 'evidence') continue;
            parts.push(`${type.toUpperCase()}S (${nodes.length}):`);
            for (const n of nodes) {
                parts.push(`  [${n.id}] ${n.label}`);
            }
            parts.push('');
        }

        // Key edges — show the relationships
        const edgeSummary: Record<string, number> = {};
        for (const e of kg.edges) {
            edgeSummary[e.type] = (edgeSummary[e.type] || 0) + 1;
        }
        parts.push(`RELATIONSHIPS: ${Object.entries(edgeSummary).map(([t, c]) => `${t}: ${c}`).join(', ')}`);

        // Show strongest connections (highest weight edges)
        const topEdges = [...kg.edges].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 20);
        if (topEdges.length > 0) {
            parts.push(`TOP CONNECTIONS:`);
            for (const e of topEdges) {
                const srcNode = kg.nodes.find((n: any) => n.id === e.source);
                const tgtNode = kg.nodes.find((n: any) => n.id === e.target);
                parts.push(`  ${srcNode?.label || e.source} --[${e.type}]--> ${tgtNode?.label || e.target}${e.label ? ` (${e.label})` : ''}`);
            }
        }
        parts.push(`=== END KNOWLEDGE GRAPH ===`);
        parts.push('');
    }

    // Existing deliverable context (if any generated via chat or legacy pipeline)
    if (ctx.themes?.length) {
        parts.push(`=== THEMES (${ctx.themes.length}) ===`);
        for (const t of ctx.themes) {
            const citations = (t.citations || []).map((c: any) => c.sourceName || c.sourceFile || '').filter(Boolean).join(', ');
            parts.push(`Theme: ${t.name}\nDescription: ${t.description}\nQuote: "${t.quote}"\nSources: ${citations}\n`);
        }
    }

    if (ctx.personas?.length) {
        parts.push(`=== PERSONAS (${ctx.personas.length}) ===`);
        for (const p of ctx.personas) {
            const pains = (p.painPoints || []).map((pp: any) => `${pp.label}: "${pp.quote}" (${pp.source || pp.citation?.sourceName || ''})`).join('; ');
            parts.push(`Persona: ${p.name} (${p.role})\nJTBD: ${p.jtbd || ''}\nPain Points: ${pains}\nBio: ${p.bio || ''}\n`);
        }
    }

    if (ctx.recommendations?.length) {
        parts.push(`=== RECOMMENDATIONS (${ctx.recommendations.length}) ===`);
        for (const r of ctx.recommendations) {
            parts.push(`[${r.impactLevel}] ${r.title}: ${r.description}\nEvidence: ${r.evidenceBasis || ''}\nSources: ${(r.citations || []).join(', ')}\n`);
        }
    }

    if (ctx.journeyStages?.length) {
        parts.push(`=== SERVICE BLUEPRINT (${ctx.journeyStages.length} stages) ===`);
        for (const s of ctx.journeyStages) {
            parts.push(`Stage: ${s.phase} | Pain: ${s.painPoint} | Emotion: ${s.emotion} | Fail: ${s.fail_point || 'none'} | Sources: ${(s.citations || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.gapAnalysis) {
        parts.push(`=== GAP ANALYSIS ===`);
        for (const g of (ctx.gapAnalysis.gaps || [])) {
            parts.push(`[${g.severity}] ${g.capability}: ${g.currentMaturity}/5 -> ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${g.impact}`);
        }
        parts.push('');
    }

    if (ctx.competitiveAnalysis) {
        parts.push(`=== COMPETITIVE ANALYSIS ===`);
        for (const p of (ctx.competitiveAnalysis.peers || [])) {
            parts.push(`${p.name}: ${p.position}. Strengths: ${(p.strengths || []).join(', ')}. Weaknesses: ${(p.weaknesses || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.strategicReport) {
        parts.push(`=== STRATEGIC REPORT ===`);
        parts.push(`Diagnosis: ${ctx.strategicReport.diagnosis}`);
        parts.push(`Guiding Policy: ${ctx.strategicReport.guidingPolicy}`);
        parts.push(`Pillars: ${(ctx.strategicReport.strategicPillars || []).join('; ')}`);
        for (const s of (ctx.strategicReport.sections || [])) {
            parts.push(`\nSection ${s.sectionNumber}: ${s.title}\n${s.content?.substring(0, 800)}`);
        }
        parts.push('');
    }

    // Uploaded client documents
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.trim().length > 10) {
        parts.push(`=== UPLOADED CLIENT DOCUMENTS ===`);
        parts.push(ctx.uploadedFileContents.substring(0, 200000));
        parts.push(`=== END CLIENT DOCUMENTS ===`);
        parts.push('');
    }

    // VERIFIED SOURCE ARCHIVE — the ONLY source of truth for URLs
    // Prefer the wiki source archive (persisted, complete, verified URLs from actual API responses)
    // Fall back to in-memory sourceReferences if wiki archive not loaded
    if (ctx.wikiSourceArchive && ctx.wikiSourceArchive.length > 100) {
        parts.push(`=== VERIFIED SOURCE ARCHIVE (ONLY use URLs from this archive — NEVER fabricate URLs) ===`);
        parts.push(ctx.wikiSourceArchive);
        parts.push(`=== END VERIFIED SOURCE ARCHIVE ===`);
    } else if (ctx.sourceReferences?.length) {
        parts.push(`=== SOURCE ARTICLE INDEX (${ctx.sourceReferences.length} articles — ONLY use URLs listed here) ===`);
        for (const ref of ctx.sourceReferences.slice(0, 500)) {
            parts.push(`[${ref.id}] ${ref.sourceName}: "${ref.title}"${ref.url ? ` | URL: ${ref.url}` : ''}${ref.date ? ` | ${ref.date}` : ''}`);
        }
        parts.push(`=== END SOURCE INDEX ===`);
    }

    // Raw corpus — model-specific cap
    if (ctx.corpusText) {
        const corpus = ctx.corpusText.length > maxCorpus
            ? ctx.corpusText.substring(0, maxCorpus) + `\n[CORPUS TRUNCATED TO ${Math.round(maxCorpus / 1000)}KB FOR ${model}]`
            : ctx.corpusText;
        parts.push(`=== RAW RESEARCH CORPUS ===`);
        parts.push(corpus);
        parts.push(`=== END CORPUS ===`);
    }

    return parts.join('\n');
}

// --- Skill Manifest Matching ---

/**
 * Match a user message against the skill manifest to find relevant skills.
 * Returns matched skills sorted by trigger relevance (most matches first).
 */
export function matchSkills(userMessage: string, manifest: SkillManifestEntry[]): SkillManifestEntry[] {
    const lower = userMessage.toLowerCase();
    const scored: Array<{ skill: SkillManifestEntry; score: number }> = [];

    for (const skill of manifest) {
        if (skill.category !== 'research-deliverable') continue;
        let score = 0;
        for (const trigger of skill.triggers) {
            if (lower.includes(trigger.toLowerCase())) {
                score += trigger.length; // longer triggers = more specific = higher score
            }
        }
        if (score > 0) {
            scored.push({ skill, score });
        }
    }

    return scored.sort((a, b) => b.score - a.score).map(s => s.skill);
}

/**
 * Fetch a skill's SKILL.md content and its wiki companion pages.
 * Uses the Vite dev server /skills/ route and wiki fetch path.
 */
export async function loadSkillContext(skill: SkillManifestEntry): Promise<SkillContext> {
    const fetches: Promise<string>[] = [];

    // Fetch the SKILL.md
    fetches.push(
        fetch(skill.path).then(r => r.ok ? r.text() : '').catch(() => '')
    );

    // Fetch wiki companions
    for (const companion of skill.wikiCompanions) {
        fetches.push(
            fetch(`/hic-workspace/wiki/${companion}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

    // Fetch benchmark companions
    for (const benchmark of skill.benchmarks) {
        fetches.push(
            fetch(`/hic-workspace/wiki/${benchmark}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

    const results = await Promise.all(fetches);
    const skillContent = results[0];
    const companionContent = results.slice(1).filter(Boolean).join('\n\n---\n\n');

    return { skill, skillContent, companionContent };
}

// --- Main Send Function ---

const PROXY_BASE = 'http://localhost:5012';

export async function sendChatMessage(
    model: ChatModel,
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: ChatContext,
): Promise<ChatMessage> {
    const startTime = Date.now();

    // Skill matching: find relevant skills from manifest
    let skillContext: SkillContext | null = null;
    let skillUsed: string | undefined;
    if (context.skillManifest?.length) {
        const matched = matchSkills(userMessage, context.skillManifest);
        if (matched.length > 0) {
            const topSkill = matched[0];
            skillContext = await loadSkillContext(topSkill);
            skillUsed = topSkill.id;
            // Auto-select best model if user hasn't explicitly chosen
            // (Only upgrade, never downgrade — if user picked Opus, don't switch to Flash)
        }
    }

    const groundingContext = buildGroundingContext(context, model);

    // Build provenance index for citation rendering
    const provenanceIndex = (context.sourceReferences || []).map(s =>
        `[${s.id}] ${s.sourceName}: "${s.title}"${s.url ? ` URL: ${s.url}` : ''}${s.date ? ` (${s.date})` : ''}`
    ).join('\n');

    // Build skill-aware system prompt
    let skillInstructions = '';
    if (skillContext) {
        skillInstructions = `
=== ACTIVE SKILL: ${skillContext.skill.name} ===
${skillContext.skillContent}
=== END SKILL ===

=== SKILL WIKI CONTEXT ===
${skillContext.companionContent}
=== END SKILL WIKI ===
`;
    }

    // Skill manifest summary (always present so the AI knows what's available)
    const manifestSummary = context.skillManifest?.length
        ? `\nAVAILABLE CONSULTING SKILLS (activate by requesting the output type):\n${context.skillManifest.filter(s => s.category === 'research-deliverable').map(s => `- ${s.name}: ${s.description}`).join('\n')}\n`
        : '';

    const systemPrompt = `You are a McKinsey-trained research intelligence analyst operating in the NXT Humans Chat-Driven Research Workbench.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

${CONSULTING_MANDATES}

CITATION FORMAT (MANDATORY):
[SOURCE_NAME: "Article Title"]
Examples: [Higher Ed Dive: "Universities Struggle with Skills Gap"], [Reddit r/philanthropy: "nonprofit laid off staff due to funding cuts"]

ANTI-HALLUCINATION RULES (STRICTLY ENFORCED):
- Answer ONLY from evidence that EXISTS in the corpus below. Do not invent, fabricate, or extrapolate.
- NEVER fabricate URLs. You may ONLY include a URL if it appears verbatim in the SOURCE PROVENANCE INDEX or the RAW RESEARCH CORPUS above. If no URL exists for a source, cite it by name only WITHOUT a URL.
- NEVER invent case studies, institutions, dollar amounts, percentages, or quotes that are not explicitly present in the corpus. If the corpus contains 3 case studies, you have 3 case studies — not 10.
- NEVER generate plausible-looking article URLs by pattern (e.g., highereddive.com/news/fake-slug/123456). A fabricated URL is worse than no URL.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation matching an actual source in the provenance index.
- When quoting, use EXACT words from the corpus. Do not paraphrase and present it as a quote.
- If the corpus does not contain enough evidence to answer the question, say explicitly: "The collected data contains limited evidence on this topic. Here is what was found:" and cite ONLY what actually exists.
- When asked for "top N" or "N case studies", only provide as many as actually exist in the corpus. If only 4 exist, provide 4 — never pad to reach the requested number.
${DELIVERABLE_PROTOCOL}
${manifestSummary}
${skillInstructions}
${provenanceIndex ? `=== SOURCE PROVENANCE INDEX (${context.sourceReferences?.length || 0} sources) ===\n${provenanceIndex}\n=== END PROVENANCE ===\n` : ''}

${groundingContext}

=== CRITICAL OUTPUT FORMAT REMINDER (re-read before responding) ===
When the user asks for SLIDES, follow the SLIDE OUTPUT PROTOCOL above. Pick ONE of the 10 templates per slide.
Mark the template on the fence: :::slide template=NAME

When the user asks for DELIVERABLES (personas, themes, recommendations, etc.), use :::deliverable:TYPE delimiters:

:::deliverable:theme
{"name": "Theme Name", "description": "...", "quote": "verbatim quote", "citations": [{"sourceName": "...", "text": "..."}]}
:::

When the user asks for VISUAL COMPONENTS (stat rows, evidence blocks, tables), use :::nxt:TYPE delimiters:

:::nxt:stat-row
[{"value": "41%", "label": "at CX Maturity Level 1", "source": "Gartner, 2025"}]
:::

NEVER output raw JSON without these delimiters. The delimiters trigger visual rendering in the UI.

=== ANTI-HALLUCINATION REMINDER (re-read before responding) ===
BEFORE including any URL in your response, verify it exists VERBATIM in the SOURCE PROVENANCE INDEX above. If you cannot find the exact URL, DO NOT include one — cite by source name only.
BEFORE stating any statistic, dollar amount, or percentage, verify the EXACT number appears in the corpus text above. If you cannot find it, do not state it.
BEFORE quoting anyone, verify the EXACT words appear in the corpus. If you cannot find the quote, paraphrase and label it as a paraphrase.
If asked for N examples and the corpus only contains M < N, provide M and say "The corpus contains M examples on this topic."
=== END REMINDERS ===`;

    try {
        // Determine thinking effort from skill or default
        const thinkingEffort: ThinkingEffort = skillContext?.skill.thinkingEffort || 'medium';

        let responseText: string;
        const modelConfig = AVAILABLE_MODELS.find(m => m.id === model);

        if (modelConfig?.provider === 'anthropic') {
            responseText = await callAnthropic(systemPrompt, userMessage, conversationHistory, model, thinkingEffort);
        } else if (modelConfig?.provider === 'openai') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory);
        } else {
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory);
        }

        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: responseText,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
            skillUsed,
        };
    } catch (error: any) {
        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Error from ${model}: ${error.message || 'Unknown error'}. Check your API key and network connection.`,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
        };
    }
}

// --- Provider Implementations ---

async function callAnthropic(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: ChatModel = 'claude-opus-4-7',
    thinkingEffort: ThinkingEffort = 'medium',
): Promise<string> {
    const messages = [
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    // Claude 4.7 uses adaptive thinking with effort levels (not budget_tokens)
    const effortMap: Record<ThinkingEffort, string> = {
        max: 'high',
        high: 'medium',
        medium: 'low',
    };

    const body: any = {
        model,
        max_tokens: 32000,
        system,
        messages,
        thinking: {
            type: 'adaptive',
        },
        output_config: {
            effort: effortMap[thinkingEffort] || 'medium',
        },
    };

    const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(`Anthropic API error ${resp.status}: ${errorData.error?.message || JSON.stringify(errorData).substring(0, 200)}`);
    }

    const data = await resp.json();

    // Extract text blocks (skip thinking blocks)
    if (Array.isArray(data.content)) {
        return data.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('');
    }
    return data.content?.[0]?.text || 'No response';
}

async function callOpenAI(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const messages = [
        { role: 'system' as const, content: system },
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    const resp = await fetch(`${PROXY_BASE}/api/ai/openai`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-openai-endpoint': 'chat',
        },
        body: JSON.stringify({
            model: 'gpt-5.4-mini',
            messages,
            max_tokens: 16000,
            temperature: 0.2,
        }),
    });

    if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text || 'No response';
}

async function callGemini(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });
    const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${system}\n\n${conversationText ? `Previous conversation:\n${conversationText}\n\n` : ''}User question: ${userMsg}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: fullPrompt }] },
        config: { temperature: 0.2, maxOutputTokens: 65536 },
    });

    return response.text || 'No response';
}

// --- Citation Parsing (unchanged) ---

export function parseChatCitations(
    text: string,
    sourceRefs?: SourceReference[]
): { segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> } {
    const segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> = [];

    let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    const citationPattern = /\[([^\]]+?):\s*"([^"]+)"\]|\[([^\]]+?)::\d+:\s*"([^"]+)"\]|\[(CHUNK_\d+)\]/g;

    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(cleaned)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: cleaned.substring(lastIndex, match.index) });
        }

        let sourceName = (match[1] || match[3] || '').trim();
        let articleTitle = (match[2] || match[4] || '').trim();
        const chunkRef = match[5];

        if (sourceName.includes('_') || sourceName.includes('::')) {
            const cleanId = sourceName.split('::')[0].replace(/_/g, ' ');
            const ref = sourceRefs?.find(r =>
                r.id.startsWith(sourceName.split('::')[0]) ||
                r.sourceName.toLowerCase().replace(/\s+/g, '_') === sourceName.split('::')[0]
            );
            sourceName = ref?.sourceName || cleanId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        if (chunkRef) {
            sourceName = chunkRef;
            articleTitle = '';
        }

        let url: string | undefined;
        if (sourceRefs) {
            let ref = sourceRefs.find(r => {
                if (!articleTitle || !r.title) return false;
                const citTitle = articleTitle.toLowerCase().trim();
                const refTitle = r.title.toLowerCase().trim();
                return refTitle.includes(citTitle.substring(0, 30)) ||
                       citTitle.includes(refTitle.substring(0, 30));
            });

            if (!ref) {
                ref = sourceRefs.find(r => {
                    const nameMatch = r.sourceName.toLowerCase().includes(sourceName.toLowerCase()) ||
                        sourceName.toLowerCase().includes(r.sourceName.toLowerCase()) ||
                        r.id.startsWith(sourceName.split('::')[0]);
                    if (!nameMatch) return false;
                    if (articleTitle && r.title) {
                        const words = articleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                        const titleLower = r.title.toLowerCase();
                        const matchingWords = words.filter(w => titleLower.includes(w));
                        return matchingWords.length >= 2;
                    }
                    return false;
                });
            }

            if (!ref && (chunkRef || !articleTitle)) {
                ref = sourceRefs.find(r =>
                    r.id.startsWith(sourceName.split('::')[0])
                );
            }

            if (ref?.url) {
                url = ref.url;
                if (!articleTitle && ref.title) articleTitle = ref.title;
                if (sourceName === chunkRef && ref.sourceName) sourceName = ref.sourceName;
            }
        }

        segments.push({
            type: 'citation',
            content: match[0],
            sourceName,
            title: articleTitle || sourceName,
            url,
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleaned.length) {
        segments.push({ type: 'text', content: cleaned.substring(lastIndex) });
    }

    if (segments.length === 0) {
        segments.push({ type: 'text', content: cleaned });
    }

    return { segments };
}

// --- Helpers ---

export function buildSourceReferences(liveSourceResults: any[]): SourceReference[] {
    const refs: SourceReference[] = [];
    for (const src of liveSourceResults) {
        for (let j = 0; j < (src.items || []).length; j++) {
            const item = src.items[j];
            refs.push({
                id: `${src.sourceId}::${j}`,
                sourceName: src.source || src.sourceId || '',
                title: item.title || '',
                url: item.url || '',
                tier: src.credibilityTier || 3,
                date: item.date || '',
            });
        }
    }
    return refs;
}

export function getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS.map(m => ({
        ...m,
        available: m.provider === 'anthropic' ? !!(process.env.ANTHROPIC_API_KEY)
            : m.provider === 'openai' ? !!(process.env.OPENAI_API_KEY)
            : !!(process.env.API_KEY || process.env.GEMINI_API_KEY),
    }));
}

/**
 * Load the skill manifest from the workspace.
 */
export async function loadSkillManifest(): Promise<SkillManifestEntry[]> {
    try {
        const resp = await fetch('/hic-workspace/skill-manifest.json');
        if (!resp.ok) return [];
        return await resp.json();
    } catch {
        return [];
    }
}
