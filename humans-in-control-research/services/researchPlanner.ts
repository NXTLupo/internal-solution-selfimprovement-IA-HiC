// services/researchPlanner.ts
// HiC Deep Research planner + reflector loop.
// See .claude/skills/research-planner/SKILL.md for the planning contract.
//
// 2026-05-24 - Phase 5 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

import { parseJSONWithRepair } from './aiOutputRepair';
import { stableHash, withResilience, isThrottleError, type DegradationEvent, emitDegradationEvent } from './multiModelResilience';
import { OPUS_CAP_ACTIVE } from './aiRouter';


export type SubQuestion = {
    id: string;
    question: string;
    angle: 'definition' | 'mechanism' | 'evidence' | 'counter_evidence' | 'second_order' | 'named_entities';
    expected_evidence_types: Array<'academic' | 'news' | 'government' | 'social' | 'client'>;
    expected_named_entities: string[];
    priority: 'high' | 'medium' | 'low';
};

export type SourceStrategyEntry = {
    source_id: string;
    sub_question_ids: string[];
    expected_yield: number;
    rationale: string;
};

export type ResearchPlan = {
    plan_version: number;
    plan_hash: string;
    goal: string;
    sub_questions: SubQuestion[];
    source_strategy: SourceStrategyEntry[];
    named_institutions: string[];
    expected_themes_count: number;
    budget_usd: number;
    reflection_threshold: number;
    max_iterations: number;
};

// =============================================================================
// WS-F (2026-06-30): OBJECTIVE-SUPREMACY - post-collection sub-question coverage.
// Deterministic (no LLM): after the corpus is assembled, score how well it covers
// each decomposed sub-question of the objective, and surface HIGH-priority ones the
// corpus under-covers so the user can run a targeted follow-up BEFORE generating.
// This makes the objective (not source volume) the measure of "did we collect enough".
// Pure function - unit-testable without the proxy.
// =============================================================================
export interface SubQuestionCoverage {
    id: string;
    priority: SubQuestion['priority'];
    salientTerms: number;
    presentTerms: number;
    coverageFraction: number;                 // 0-1
    status: 'uncovered' | 'partial' | 'covered';
}

export interface CoverageAudit {
    perQuestion: SubQuestionCoverage[];
    /** HIGH-priority sub-questions the corpus does NOT fully cover (the objective-supremacy alarm). */
    openHighPriority: string[];
    /** Fraction of high+medium priority sub-questions that are 'covered'. */
    coverage: number;
}

const _COV_STOP = new Set<string>([
    'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'these', 'those', 'their',
    'what', 'how', 'why', 'does', 'do', 'is', 'are', 'will', 'would', 'should', 'can', 'about',
    'which', 'when', 'where', 'who', 'whom', 'been', 'being', 'have', 'has', 'had',
]);

function _covSalientTerms(sq: SubQuestion): string[] {
    const fromQ = (sq.question || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(t => t.length >= 4 && !_COV_STOP.has(t));
    const fromEntities = (sq.expected_named_entities || []).flatMap(e =>
        String(e).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3));
    return Array.from(new Set([...fromQ, ...fromEntities]));
}

/** Score corpus coverage of each sub-question by salient-term presence. Deterministic. `covered` when
 *  >=60% of a sub-question's salient terms appear in the corpus; `partial` when some do; else `uncovered`. */
export function auditSubQuestionCoverage(corpusText: string, subQuestions: SubQuestion[]): CoverageAudit {
    const corpusLc = (corpusText || '').toLowerCase();
    const per: SubQuestionCoverage[] = [];
    for (const sq of subQuestions || []) {
        const terms = _covSalientTerms(sq);
        if (terms.length === 0) {
            per.push({ id: sq.id, priority: sq.priority, salientTerms: 0, presentTerms: 0, coverageFraction: 0, status: 'uncovered' });
            continue;
        }
        let present = 0;
        for (const t of terms) if (corpusLc.includes(t)) present++;
        const frac = present / terms.length;
        const status: SubQuestionCoverage['status'] = frac >= 0.6 ? 'covered' : frac > 0 ? 'partial' : 'uncovered';
        per.push({ id: sq.id, priority: sq.priority, salientTerms: terms.length, presentTerms: present, coverageFraction: Math.round(frac * 100) / 100, status });
    }
    const openHighPriority = per.filter(p => p.priority === 'high' && p.status !== 'covered').map(p => p.id);
    const scoped = per.filter(p => p.priority !== 'low');
    const coverage = scoped.length ? Math.round((scoped.filter(p => p.status === 'covered').length / scoped.length) * 100) / 100 : 0;
    return { perQuestion: per, openHighPriority, coverage };
}

export type ResearchPlannerInput = {
    research_goal: string;
    uploaded_brief?: string;
    named_institutions?: string[];
    budget_usd?: number;
    target_theme_count?: number;
    proxy_base?: string;
};


const PLANNER_PROMPT = `You are the planner for HiC Deep Research. Emit a structured research plan that a human operator will review and edit BEFORE any data collection runs.

RESEARCH GOAL:
{{GOAL}}

UPLOADED BRIEF (if any):
{{BRIEF}}

NAMED INSTITUTIONS (if any):
{{INSTITUTIONS}}

BUDGET CAP (USD): {{BUDGET}}
TARGET THEME COUNT: {{TARGET_THEMES}}

Decompose the goal into 5-10 sub-questions spanning these angles:
- definition (background, terminology, scope)
- mechanism (how something works, causal pathways)
- evidence (measurements, data, case studies)
- counter_evidence (failures, exceptions, opposing views)
- second_order (downstream effects, what something enables/blocks)
- named_entities (specific organizations / people / products)

For each sub-question:
- assign priority (high/medium/low)
- list expected_evidence_types
- list expected_named_entities

Then propose a source_strategy mapping sub-questions to HiC connectors. Available connector families: academic (OpenAlex, Crossref, arXiv, Semantic Scholar), news (RSS, mainstream press), government (CKAN, BLS, NCES, ed.gov), social (Reddit, forums), client (uploads).

Set reflection_threshold (0.0-1.0): the coverage % at which the reflector loop should exit.
Set max_iterations: typically 6.

Return ONLY this JSON:
{
  "sub_questions": [...],
  "source_strategy": [...],
  "named_institutions": [...],
  "expected_themes_count": 20,
  "reflection_threshold": 0.75,
  "max_iterations": 6
}`;


export async function buildResearchPlan(input: ResearchPlannerInput): Promise<ResearchPlan> {
    const proxyBase = input.proxy_base ?? 'http://localhost:5012';
    const budget = input.budget_usd ?? 5.0;
    const targetThemes = input.target_theme_count ?? 22;

    const prompt = PLANNER_PROMPT
        .replace('{{GOAL}}', input.research_goal)
        .replace('{{BRIEF}}', input.uploaded_brief?.slice(0, 4000) ?? '(none)')
        .replace('{{INSTITUTIONS}}', (input.named_institutions ?? []).join(', ') || '(none)')
        .replace('{{BUDGET}}', String(budget))
        .replace('{{TARGET_THEMES}}', String(targetThemes));

    const { result } = await withResilience<{
        sub_questions: SubQuestion[];
        source_strategy: SourceStrategyEntry[];
        named_institutions?: string[];
        expected_themes_count?: number;
        reflection_threshold?: number;
        max_iterations?: number;
    }>({
        // 2026-06-30 - cap-aware: the cap-400 body ("usage limits") does NOT match
        // isThrottleError, so an Opus primary would re-throw instead of falling back.
        // While capped, make Gemini the primary so #deep-research planning never 400s.
        primary: OPUS_CAP_ACTIVE ? 'gemini' : 'anthropic',
        fallbacks: OPUS_CAP_ACTIVE ? [] : ['gemini'],
        stage: 'research_planner:plan',
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: 'claude-opus-4-8',
                    max_tokens: 8000,
                    temperature: 0.1,  // planning is exploration; not strictly identity-class
                    thinking: { type: 'enabled', budget_tokens: 4000 },  // extended thinking for plan quality
                    messages: [{ role: 'user', content: prompt }],
                }
                : {
                    model: 'gemini-3.1-pro-preview',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { temperature: 0.1, responseMimeType: 'application/json' },
                };
            const resp = await fetch(`${proxyBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(`${provider} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
            }
            const data = await resp.json();
            const text = provider === 'anthropic'
                ? (data.content?.[0]?.text ?? data.content?.find((c: any) => c.type === 'text')?.text ?? '')
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair(text, { calling_context: 'research_planner:plan' });
        },
    });

    const planHash = stableHash(
        input.research_goal,
        input.uploaded_brief ?? '',
        (input.named_institutions ?? []).join(','),
        String(budget),
        String(targetThemes),
    );

    return {
        plan_version: 1,
        plan_hash: planHash,
        goal: input.research_goal,
        sub_questions: result.sub_questions || [],
        source_strategy: result.source_strategy || [],
        named_institutions: result.named_institutions ?? input.named_institutions ?? [],
        expected_themes_count: result.expected_themes_count ?? targetThemes,
        budget_usd: budget,
        reflection_threshold: result.reflection_threshold ?? 0.75,
        max_iterations: result.max_iterations ?? 6,
    };
}


// ──────────────────────────────────────────────────────────────────────────
// Reflector loop - runs AFTER plan approval, during collection
// ──────────────────────────────────────────────────────────────────────────

export type ReflectionResult = {
    iteration: number;
    coverage: number;                    // 0-1, fraction of sub-questions adequately covered
    covered_sub_question_ids: string[];
    open_sub_question_ids: string[];
    plan_adjustments: Array<{
        action: 'add_source' | 'drop_source' | 'add_sub_question' | 'lower_priority';
        target: string;
        rationale: string;
    }>;
    decision: 'continue' | 'exit_covered' | 'exit_budget' | 'exit_max_iterations';
    rationale: string;
};


const REFLECTOR_PROMPT = `You are the reflector for HiC Deep Research. After a batch of data collection, decide whether the plan is covered or needs adjustment.

PLAN:
{{PLAN}}

EVIDENCE COLLECTED SO FAR (per sub-question):
{{COVERAGE}}

REMAINING BUDGET: \${{BUDGET_REMAINING}}
CURRENT ITERATION: {{ITERATION}} of {{MAX_ITERATIONS}}

Decide:
- coverage: 0.0-1.0 (fraction of high+medium priority sub-questions with ≥10 relevant articles)
- covered_sub_question_ids: array
- open_sub_question_ids: array
- plan_adjustments: array of {action, target, rationale}
  - add_source: add a connector to a sub-question that's under-covered
  - drop_source: stop using a connector that's yielded only off-topic results
  - add_sub_question: emerging theme deserves its own sub-question
  - lower_priority: a sub-question is harder than expected; demote
- decision: continue | exit_covered | exit_budget | exit_max_iterations

Return ONLY this JSON.`;


export async function reflectOnCollection(opts: {
    plan: ResearchPlan;
    coverage_per_sub_question: Record<string, { article_count: number; high_relevance_count: number }>;
    iteration: number;
    budget_remaining: number;
    proxy_base?: string;
}): Promise<ReflectionResult> {
    const proxyBase = opts.proxy_base ?? 'http://localhost:5012';

    if (opts.budget_remaining <= 0) {
        return {
            iteration: opts.iteration,
            coverage: 0,
            covered_sub_question_ids: [],
            open_sub_question_ids: opts.plan.sub_questions.map(q => q.id),
            plan_adjustments: [],
            decision: 'exit_budget',
            rationale: `Budget exhausted at iteration ${opts.iteration}`,
        };
    }

    if (opts.iteration >= opts.plan.max_iterations) {
        return {
            iteration: opts.iteration,
            coverage: 0,
            covered_sub_question_ids: [],
            open_sub_question_ids: opts.plan.sub_questions.map(q => q.id),
            plan_adjustments: [],
            decision: 'exit_max_iterations',
            rationale: `Max iterations (${opts.plan.max_iterations}) reached`,
        };
    }

    const coverageBlock = opts.plan.sub_questions.map(q => {
        const c = opts.coverage_per_sub_question[q.id] ?? { article_count: 0, high_relevance_count: 0 };
        return `[${q.id}] priority=${q.priority}: ${c.article_count} articles, ${c.high_relevance_count} HIGH-relevance`;
    }).join('\n');

    const prompt = REFLECTOR_PROMPT
        .replace('{{PLAN}}', JSON.stringify(opts.plan, null, 2).slice(0, 3000))
        .replace('{{COVERAGE}}', coverageBlock)
        .replace('{{BUDGET_REMAINING}}', opts.budget_remaining.toFixed(2))
        .replace('{{ITERATION}}', String(opts.iteration))
        .replace('{{MAX_ITERATIONS}}', String(opts.plan.max_iterations));

    const { result } = await withResilience<ReflectionResult>({
        primary: 'anthropic',
        fallbacks: ['gemini'],
        stage: 'research_planner:reflect',
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: 'claude-sonnet-4-6',
                    max_tokens: 3000,
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                }
                : {
                    model: 'gemini-3.5-flash',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { temperature: 0, responseMimeType: 'application/json' },
                };
            const resp = await fetch(`${proxyBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(`${provider} HTTP ${resp.status}`);
            }
            const data = await resp.json();
            const text = provider === 'anthropic'
                ? (data.content?.[0]?.text ?? '')
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair(text, { calling_context: 'research_planner:reflect' });
        },
    });

    // Final decision overrides if coverage crossed threshold
    if (result.coverage >= opts.plan.reflection_threshold && result.decision === 'continue') {
        result.decision = 'exit_covered';
        result.rationale = `Coverage ${(result.coverage * 100).toFixed(0)}% ≥ threshold ${(opts.plan.reflection_threshold * 100).toFixed(0)}%; exiting`;
    }

    return result;
}
