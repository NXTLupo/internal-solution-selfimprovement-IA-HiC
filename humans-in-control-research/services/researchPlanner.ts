// services/researchPlanner.ts
// HiC Deep Research planner + reflector loop.
// See .claude/skills/research-planner/SKILL.md for the planning contract.
//
// 2026-05-24 - Phase 5 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
// 2026-10-01 - Stage 1 item 1.6 (B8 / R-D1) + R-D2 groundwork of
//              plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md: objective decomposition is
//              mandatory and recorded (ensureObjectiveDecomposition, one anchored re-ask), every
//              sub-question carries expected evidence types / named entities / coverage_status, and
//              collectionBudgetFor hands the collection stage per-sub-question query budgets.

import { parseJSONWithRepair } from './aiOutputRepair';
import { stableHash, withResilience, isThrottleError, type DegradationEvent, emitDegradationEvent } from './multiModelResilience';
import { OPUS_CAP_ACTIVE, artifactModelFor, applyAnthropicRequestDefaults, chooseUtilityModel, CLAUDE_STRUCTURED_MODEL } from './aiRouter';


export type CoverageStatus = 'uncovered' | 'partial' | 'covered';

export type EvidenceType = 'academic' | 'news' | 'government' | 'social' | 'client' | 'documentation';

export type SubQuestionAngle = 'definition' | 'mechanism' | 'evidence' | 'counter_evidence' | 'second_order' | 'named_entities';

export type SubQuestion = {
    id: string;
    question: string;
    angle: SubQuestionAngle;
    expected_evidence_types: EvidenceType[];
    expected_named_entities: string[];
    priority: 'high' | 'medium' | 'low';
    /** 1.6: written by `applyCoverageToSubQuestions` after `auditSubQuestionCoverage`. Every planner
     *  output carries it (`normalizePlannerSubQuestions` defaults it to 'uncovered'), so a persisted
     *  plan always says whether its questions were answered by the corpus. Optional in the TYPE only
     *  so hand-built literals elsewhere keep compiling; the planner never emits it missing. */
    coverage_status?: CoverageStatus;
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
// 1.6: sub-question schema normalization. The planner model returns loosely shaped JSON; the
// objective plan that every AIR record and the evidence-slot gate read must be exact. One
// normalizer, applied to every planner response (first ask and anchored re-ask alike).
// =============================================================================
const _EVIDENCE_TYPES = new Set<EvidenceType>(['academic', 'news', 'government', 'social', 'client', 'documentation']);
const _ANGLES = new Set<SubQuestionAngle>(['definition', 'mechanism', 'evidence', 'counter_evidence', 'second_order', 'named_entities']);
const _PRIORITIES = new Set<SubQuestion['priority']>(['high', 'medium', 'low']);
const _COVERAGE = new Set<CoverageStatus>(['uncovered', 'partial', 'covered']);

/** Model vocabulary -> the connector-family evidence types the collection stage understands. */
const _EVIDENCE_SYNONYMS: Record<string, EvidenceType> = {
    academic: 'academic', research: 'academic', journal: 'academic', paper: 'academic', papers: 'academic', arxiv: 'academic',
    news: 'news', press: 'news', media: 'news', trade_press: 'news', industry: 'news',
    government: 'government', gov: 'government', regulatory: 'government', policy: 'government', statistics: 'government',
    social: 'social', reddit: 'social', forum: 'social', forums: 'social', community: 'social',
    client: 'client', upload: 'client', uploads: 'client', internal: 'client', interview: 'client', interviews: 'client',
    documentation: 'documentation', docs: 'documentation', official: 'documentation', vendor: 'documentation', product: 'documentation',
    filings: 'documentation', standards: 'documentation', transcript: 'documentation', transcripts: 'documentation',
};

function _normEvidenceTypes(raw: unknown): EvidenceType[] {
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,;/|]/) : [];
    const out: EvidenceType[] = [];
    for (const v of list) {
        const key = String(v ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const mapped = _EVIDENCE_TYPES.has(key as EvidenceType) ? (key as EvidenceType) : _EVIDENCE_SYNONYMS[key];
        if (mapped && !out.includes(mapped)) out.push(mapped);
    }
    return out;
}

function _normStringList(raw: unknown): string[] {
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,;|]/) : [];
    const out: string[] = [];
    for (const v of list) {
        const s = String(v ?? '').trim();
        if (s && !out.includes(s)) out.push(s.slice(0, 120));
    }
    return out;
}

/** Normalize a planner response's `sub_questions` into the exact schema. Entries without a question
 *  are dropped (an unmatchable slot would inflate coverage). Defaults: id `sq_N`, angle `evidence`,
 *  priority `medium`, `expected_evidence_types: []`, `expected_named_entities: []`,
 *  `coverage_status: 'uncovered'`. */
export function normalizePlannerSubQuestions(raw: unknown): SubQuestion[] {
    if (!Array.isArray(raw)) return [];
    const out: SubQuestion[] = [];
    const seen = new Set<string>();
    raw.forEach((sq: any, i: number) => {
        const question = String(sq?.question ?? sq?.text ?? '').trim();
        if (!question) return;
        let id = String(sq?.id ?? '').trim() || `sq_${i + 1}`;
        while (seen.has(id)) id = `${id}_${i + 1}`;
        seen.add(id);
        const angle = String(sq?.angle ?? '').trim().toLowerCase() as SubQuestionAngle;
        const priority = String(sq?.priority ?? '').trim().toLowerCase() as SubQuestion['priority'];
        const coverage = String(sq?.coverage_status ?? '').trim().toLowerCase() as CoverageStatus;
        out.push({
            id,
            question: question.slice(0, 400),
            angle: _ANGLES.has(angle) ? angle : 'evidence',
            expected_evidence_types: _normEvidenceTypes(sq?.expected_evidence_types ?? sq?.evidence_types),
            expected_named_entities: _normStringList(sq?.expected_named_entities ?? sq?.named_entities ?? sq?.entities),
            priority: _PRIORITIES.has(priority) ? priority : 'medium',
            coverage_status: _COVERAGE.has(coverage) ? coverage : 'uncovered',
        });
    });
    return out;
}

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
    status: CoverageStatus;
}

export interface CoverageAudit {
    perQuestion: SubQuestionCoverage[];
    /** HIGH-priority sub-questions the corpus does NOT fully cover (the objective-supremacy alarm). */
    openHighPriority: string[];
    /** Fraction of high+medium priority sub-questions that are 'covered'. */
    coverage: number;
}

/** The minimum a sub-question needs for the coverage audit: the planner's SubQuestion and the
 *  objectivePlan reader's PlanSubQuestionLike both satisfy it. */
export type CoverageSubQuestion = {
    id: string;
    question: string;
    priority: SubQuestion['priority'];
    expected_named_entities?: string[];
};

const _COV_STOP = new Set<string>([
    'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'these', 'those', 'their',
    'what', 'how', 'why', 'does', 'do', 'is', 'are', 'will', 'would', 'should', 'can', 'about',
    'which', 'when', 'where', 'who', 'whom', 'been', 'being', 'have', 'has', 'had',
]);

function _covSalientTerms(sq: CoverageSubQuestion): string[] {
    const fromQ = (sq.question || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(t => t.length >= 4 && !_COV_STOP.has(t));
    const fromEntities = (sq.expected_named_entities || []).flatMap(e =>
        String(e).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3));
    return Array.from(new Set([...fromQ, ...fromEntities]));
}

/** Score corpus coverage of each sub-question by salient-term presence. Deterministic. `covered` when
 *  >=60% of a sub-question's salient terms appear in the corpus; `partial` when some do; else `uncovered`. */
export function auditSubQuestionCoverage(corpusText: string, subQuestions: ReadonlyArray<CoverageSubQuestion>): CoverageAudit {
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

/** 1.6: write the audit's per-question status back onto the sub-questions (new objects; input untouched),
 *  so the plan that App.tsx republishes and the session snapshot persists carries `coverage_status`.
 *  A sub-question the audit did not score keeps its prior status (default 'uncovered'). */
export function applyCoverageToSubQuestions<T extends { id: string; coverage_status?: CoverageStatus }>(
    subQuestions: ReadonlyArray<T>,
    audit: CoverageAudit,
): T[] {
    const byId = new Map(audit.perQuestion.map(p => [p.id, p.status] as const));
    return subQuestions.map(sq => ({ ...sq, coverage_status: byId.get(sq.id) ?? sq.coverage_status ?? 'uncovered' }));
}

// =============================================================================
// R-D2 groundwork: per-sub-question collection budgets. Pure; NOT wired into collection yet
// (chunkRetrieval / researchFabricOrchestrator consume it in a later item).
// =============================================================================
export const QUERY_BUDGET_BY_PRIORITY: Readonly<Record<SubQuestion['priority'], number>> = { high: 3, medium: 2, low: 1 };

export interface CollectionBudgetEntry {
    id: string;
    priority: SubQuestion['priority'];
    coverage_status: CoverageStatus;
    /** Queries the collection stage may spend on this sub-question in the next pass. */
    queries: number;
}

const _COVERAGE_RANK: Record<CoverageStatus, number> = { uncovered: 0, partial: 1, covered: 2 };
const _PRIORITY_RANK: Record<SubQuestion['priority'], number> = { high: 0, medium: 1, low: 2 };

/** Per-sub-question query budgets for the collection stage: high 3, medium 2, low 1. Ordered uncovered
 *  first (then partial, then covered), high priority first within a coverage band, original order as the
 *  final tie-break. A `covered` sub-question gets 0: per R-D2 collection stops adding pack results for a
 *  covered sub-question and keeps spending on uncovered ones. A missing `coverage_status` reads as
 *  'uncovered' (the first pass has measured nothing yet). */
export function collectionBudgetFor(
    subQuestions: ReadonlyArray<{ id: string; priority?: string; coverage_status?: string }>,
): CollectionBudgetEntry[] {
    const rows = (subQuestions || []).map((sq, index) => {
        const p = String(sq.priority ?? '').toLowerCase();
        const priority = (_PRIORITIES.has(p as SubQuestion['priority']) ? p : 'medium') as SubQuestion['priority'];
        const c = String(sq.coverage_status ?? '').toLowerCase();
        const coverage_status = (_COVERAGE.has(c as CoverageStatus) ? c : 'uncovered') as CoverageStatus;
        return { index, id: sq.id, priority, coverage_status };
    });
    rows.sort((a, b) =>
        (_COVERAGE_RANK[a.coverage_status] - _COVERAGE_RANK[b.coverage_status])
        || (_PRIORITY_RANK[a.priority] - _PRIORITY_RANK[b.priority])
        || (a.index - b.index));
    return rows.map(r => ({
        id: r.id,
        priority: r.priority,
        coverage_status: r.coverage_status,
        queries: r.coverage_status === 'covered' ? 0 : QUERY_BUDGET_BY_PRIORITY[r.priority],
    }));
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
- list expected_evidence_types from: academic, news, government, social, client, documentation
- list expected_named_entities

Then propose a source_strategy mapping sub-questions to HiC connectors. Available connector families: academic (OpenAlex, Crossref, arXiv, Semantic Scholar), news (RSS, mainstream press), government (CKAN, BLS, NCES, ed.gov), social (Reddit, forums), client (uploads), documentation (the subject's official documentation, filings, standards, transcripts).

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


type PlannerResponse = {
    sub_questions?: unknown;
    source_strategy?: SourceStrategyEntry[];
    named_institutions?: string[];
    expected_themes_count?: number;
    reflection_threshold?: number;
    max_iterations?: number;
};

/** One planner call through the routing authority + provider resilience. Shared by the first ask and
 *  the anchored re-ask so both travel the same provider path and the same JSON repair. */
async function callPlanner(prompt: string, stage: string, proxyBase: string): Promise<PlannerResponse> {
    const { result } = await withResilience<PlannerResponse>({
        // 2026-06-30 - cap-aware: the cap-400 body ("usage limits") does NOT match
        // isThrottleError, so an Opus primary would re-throw instead of falling back.
        // While capped, make Gemini the primary so #deep-research planning never 400s.
        primary: OPUS_CAP_ACTIVE ? 'gemini' : 'anthropic',
        fallbacks: OPUS_CAP_ACTIVE ? [] : ['gemini'],
        stage,
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                // 2026-09-30 (plan Stage 0.5): model via the routing authority; adaptive thinking
                // + output_config.effort (medium for planning) applied by applyAnthropicRequestDefaults.
                // No temperature and no budget_tokens: both are 400s on Claude 5.x.
                ? applyAnthropicRequestDefaults({
                    model: artifactModelFor('research-plan'),
                    max_tokens: 8000,
                    messages: [{ role: 'user', content: prompt }],
                }, { kind: 'research-plan' })
                : {
                    // Stage 4.3 / D7: the Gemini fallback for planning is the Flash utility tier.
                    model: chooseUtilityModel('research-plan').model,
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
            return parseJSONWithRepair(text, { calling_context: stage });
        },
    });
    return (result && typeof result === 'object') ? result : {};
}

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

    const result = await callPlanner(prompt, 'research_planner:plan', proxyBase);

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
        sub_questions: normalizePlannerSubQuestions(result.sub_questions),
        source_strategy: Array.isArray(result.source_strategy) ? result.source_strategy : [],
        named_institutions: result.named_institutions ?? input.named_institutions ?? [],
        expected_themes_count: result.expected_themes_count ?? targetThemes,
        budget_usd: budget,
        reflection_threshold: result.reflection_threshold ?? 0.75,
        max_iterations: result.max_iterations ?? 6,
    };
}


// =============================================================================
// 1.6 (B8 / R-D1): objective decomposition is MANDATORY and RECORDED.
// The research-run path used to call the orchestrator's source plan (which never carried
// sub_questions) and audit coverage only "when the plan carries real sub-questions", so 91 of
// 93 AIR records had no decomposition and the gate measured nothing while reading as passed.
// This entry point guarantees one of two recorded outcomes: a decomposed plan, or an explicit
// `unavailable` with a reason, after exactly ONE anchored re-ask (reinforcement-inference
// contract: the prior answer travels verbatim with the hint; a bare "try again" underperforms).
// =============================================================================
export const ANCHORED_REASK_INSTRUCTION =
    'sub_questions is empty; decompose the objective into 4-8 sub-questions with priority and expected evidence types';

/** The anchored re-ask prompt: the prior plan VERBATIM plus the one instruction. Exported so the test can
 *  pin that the second call carries both. */
export function buildAnchoredDecompositionReask(priorPlan: ResearchPlan): string {
    return [
        'You are the planner for HiC Deep Research. Your prior answer for the research goal below is reproduced verbatim.',
        '',
        'RESEARCH GOAL:',
        priorPlan.goal,
        '',
        'PRIOR PLAN (verbatim):',
        JSON.stringify(priorPlan, null, 2),
        '',
        ANCHORED_REASK_INSTRUCTION + '.',
        'Each sub-question: { "id", "question", "angle" (definition|mechanism|evidence|counter_evidence|second_order|named_entities),',
        '"priority" (high|medium|low), "expected_evidence_types" (from: academic, news, government, social, client, documentation),',
        '"expected_named_entities" }. Keep source_strategy, named_institutions, expected_themes_count, reflection_threshold and',
        'max_iterations from the prior plan unless a sub-question requires a change.',
        '',
        'Return ONLY this JSON: { "sub_questions": [...], "source_strategy": [...], "named_institutions": [...],',
        '"expected_themes_count": N, "reflection_threshold": 0.75, "max_iterations": 6 }',
    ].join('\n');
}

export type DecompositionOutcome =
    | { status: 'decomposed'; plan: ResearchPlan; subQuestions: SubQuestion[]; attempts: 1 | 2; reasked: boolean }
    | { status: 'unavailable'; plan: ResearchPlan | null; subQuestions: []; attempts: 1 | 2; reason: string };

/** Build the plan; if it carries no sub-questions, re-ask ONCE with the prior plan anchored; if still
 *  empty (or the planner fails), report `unavailable` with the reason. Never throws. */
export async function ensureObjectiveDecomposition(input: ResearchPlannerInput): Promise<DecompositionOutcome> {
    const proxyBase = input.proxy_base ?? 'http://localhost:5012';
    let plan: ResearchPlan;
    try {
        plan = await buildResearchPlan(input);
    } catch (e: any) {
        return { status: 'unavailable', plan: null, subQuestions: [], attempts: 1, reason: `planner call failed: ${String(e?.message || e).slice(0, 200)}` };
    }
    if (plan.sub_questions.length > 0) {
        return { status: 'decomposed', plan, subQuestions: plan.sub_questions, attempts: 1, reasked: false };
    }
    try {
        const second = await callPlanner(buildAnchoredDecompositionReask(plan), 'research_planner:decompose-reask', proxyBase);
        const subQuestions = normalizePlannerSubQuestions(second.sub_questions);
        if (subQuestions.length > 0) {
            const revised: ResearchPlan = {
                ...plan,
                plan_version: plan.plan_version + 1,
                sub_questions: subQuestions,
                source_strategy: Array.isArray(second.source_strategy) && second.source_strategy.length ? second.source_strategy : plan.source_strategy,
                named_institutions: Array.isArray(second.named_institutions) && second.named_institutions.length ? second.named_institutions : plan.named_institutions,
            };
            return { status: 'decomposed', plan: revised, subQuestions, attempts: 2, reasked: true };
        }
        return { status: 'unavailable', plan, subQuestions: [], attempts: 2, reason: 'planner returned no sub-questions after one anchored re-ask' };
    } catch (e: any) {
        return { status: 'unavailable', plan, subQuestions: [], attempts: 2, reason: `anchored re-ask failed: ${String(e?.message || e).slice(0, 200)}` };
    }
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
                ? applyAnthropicRequestDefaults({
                    // Stage 4.3 / D7 (_utility): reflection is structured JSON work; the structured
                    // Claude model (no temperature: a 400 on 5.x), Flash first by provider order.
                    model: CLAUDE_STRUCTURED_MODEL,
                    max_tokens: 3000,
                    messages: [{ role: 'user', content: prompt }],
                }, { kind: 'utility' })
                : {
                    model: chooseUtilityModel('research-reflect').model,
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
