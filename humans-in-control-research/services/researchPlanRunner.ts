// services/researchPlanRunner.ts
// 2026-05-26 - Deep Research plan-act-reflect iteration runner.
//
// Takes an approved ResearchPlan (post-editor) and runs the
// plan-act-reflect loop end-to-end. Each iteration:
//   1. Pick the next unresolved sub-question (priority-ordered).
//   2. ACT - fire data fabric via /api/search for the sub-question.
//   3. REFLECT - Sonnet evaluates whether the evidence resolves the
//      sub-question, leaves it open, or surfaces a NEW sub-question.
//   4. PERSIST - write a reflection trace row to engagements/<slug>/
//      research_log.json so the next training pass can learn from it.
//
// Bounded by plan.max_iterations + plan.budget_usd. Aborts cleanly on
// AbortSignal so the UI cancel button works.
//
// Composes with services/researchPlanner.ts (which produces the plan +
// has the reflectOnCollection function this runner calls) and
// components/ResearchPlanEditor.tsx (the UI that gates the runner).

import type { ResearchPlan, SubQuestion } from './researchPlanner';
import { reflectOnCollection } from './researchPlanner';

const PROXY_BASE = 'http://127.0.0.1:5012';

export type ReflectionVerdict = 'covered' | 'gap_remains' | 'new_question' | 'rejected';

export interface ReflectionTraceEntry {
    iteration: number;
    sub_question_id: string;
    sub_question_text: string;
    verdict: ReflectionVerdict;
    evidence_count: number;
    spend_so_far_usd: number;
    ms_elapsed: number;
    new_question_text?: string;
    notes?: string;
    timestamp: string;
}

export interface RunnerStatus {
    iteration: number;
    maxIterations: number;
    spendUsd: number;
    currentSubQuestion?: string;
    verdict?: string;
    completed: boolean;
    aborted: boolean;
}

export interface RunnerInput {
    plan: ResearchPlan;
    engagementSlug: string;
    signal?: AbortSignal;
    /** Per-iteration progress callback so the UI can render the live trace. */
    onProgress?: (status: RunnerStatus) => void;
    /** Per-reflection callback so the UI can append trace rows. */
    onReflection?: (entry: ReflectionTraceEntry) => void;
    /** Override base proxy URL for testing. */
    proxyBase?: string;
}

export interface RunnerResult {
    completed: boolean;
    aborted: boolean;
    iterations_run: number;
    final_spend_usd: number;
    trace: ReflectionTraceEntry[];
    resolved_count: number;
    unresolved_count: number;
    new_questions_added: number;
    /** Optional path the runner persisted the trace to. */
    persisted_to?: string;
}

const REFLECT_TIMEOUT_MS = 90_000;
const ACT_TIMEOUT_MS = 120_000;
// Conservative estimate: one act+reflect pair runs ~$0.10-0.30 on
// Sonnet. Use 0.18 as the midpoint for spend tracking until the proxy
// surfaces real spend telemetry.
const COST_PER_ITERATION_USD = 0.18;

function nowIso(): string {
    return new Date().toISOString();
}

function pickNextSubQuestion(plan: ResearchPlan, resolved: Set<string>): SubQuestion | null {
    const priorityOrder: SubQuestion['priority'][] = ['high', 'medium', 'low'];
    for (const prio of priorityOrder) {
        for (const sq of plan.sub_questions) {
            if (sq.priority === prio && !resolved.has(sq.id)) return sq;
        }
    }
    return null;
}

async function actOnSubQuestion(
    subQuestion: SubQuestion,
    plan: ResearchPlan,
    proxyBase: string,
    signal?: AbortSignal,
): Promise<{ evidence_count: number; evidence_summary: string }> {
    // Match source ids in plan.source_strategy that target this sub-question.
    const sources = plan.source_strategy
        .filter(s => s.sub_question_ids.includes(subQuestion.id))
        .map(s => s.source_id);

    if (sources.length === 0) {
        return { evidence_count: 0, evidence_summary: '' };
    }

    // The proxy /api/multi-search endpoint accepts an array of source ids
    // + a query. Use the sub-question text as the query.
    const resp = await fetch(`${proxyBase}/api/multi-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: subQuestion.question,
            sources,
            limit: 12,
        }),
        signal: signal ?? AbortSignal.timeout(ACT_TIMEOUT_MS),
    });
    if (!resp.ok) {
        const errTxt = await resp.text().catch(() => '');
        throw new Error(`multi-search ${resp.status}: ${errTxt.slice(0, 200)}`);
    }
    const data = await resp.json();
    const items = Array.isArray(data.results) ? data.results : (Array.isArray(data.items) ? data.items : []);
    const evidence_summary = items.slice(0, 6).map((r: any, i: number) =>
        `[${i + 1}] ${(r.title || r.source || 'untitled').slice(0, 120)}: ${(r.snippet || r.body || '').slice(0, 240)}`
    ).join('\n');
    return { evidence_count: items.length, evidence_summary };
}

async function reflectOnSubQuestion(
    subQuestion: SubQuestion,
    evidence_summary: string,
    plan: ResearchPlan,
    proxyBase: string,
    signal?: AbortSignal,
): Promise<{ verdict: ReflectionVerdict; new_question_text?: string; notes: string }> {
    // Delegate to the existing reflector in researchPlanner.ts. It returns
    // a structured verdict that we translate into our trace-row shape.
    try {
        // Match the existing reflectOnCollection signature in researchPlanner.ts
        const coverage_per_sub_question: Record<string, { article_count: number; high_relevance_count: number }> = {
            [subQuestion.id]: {
                article_count: evidence_summary ? evidence_summary.split('\n').filter(l => l.startsWith('[')).length : 0,
                high_relevance_count: 0,
            },
        };
        const reflection: any = await reflectOnCollection({
            plan,
            coverage_per_sub_question,
            iteration: 0,  // planner-side reflector tracks its own iteration
            budget_remaining: plan.budget_usd,  // optimistic - real spend tracked by runner
            proxy_base: proxyBase,
        });
        // Map the planner's verdict shape to ours. The planner returns
        // `decision: continue | exit_covered | exit_budget | exit_max_iterations`
        // plus per-subq covered/open lists. Translate.
        const decision: string = reflection.decision || '';
        const coveredIds: string[] = reflection.covered_sub_question_ids || [];
        const newSubQ = (reflection.plan_adjustments || []).find((a: any) => a.kind === 'add_sub_question' || a.type === 'add_sub_question');
        let verdict: ReflectionVerdict;
        let new_question_text: string | undefined;
        if (coveredIds.includes(subQuestion.id) || decision === 'exit_covered') {
            verdict = 'covered';
        } else if (newSubQ) {
            verdict = 'new_question';
            new_question_text = newSubQ.text || newSubQ.question || newSubQ.proposed_question;
        } else if (decision.startsWith('exit_')) {
            verdict = 'rejected';
        } else {
            verdict = 'gap_remains';
        }
        const notes = reflection.rationale || '';
        return { verdict, new_question_text, notes };
    } catch (err: any) {
        // Reflection failure shouldn't kill the loop; mark gap and continue
        return { verdict: 'gap_remains', notes: `reflection failed: ${err?.message || err}` };
    }
}

async function persistTrace(
    engagementSlug: string,
    trace: ReflectionTraceEntry[],
    proxyBase: string,
): Promise<string | undefined> {
    const path = `engagements/${engagementSlug}/research_log.json`;
    try {
        await fetch(`${proxyBase}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path,
                content: JSON.stringify({
                    engagement: engagementSlug,
                    updated_at: nowIso(),
                    trace,
                }, null, 2),
            }),
        });
        return path;
    } catch (err) {
        console.warn('[researchPlanRunner] persist failed:', err);
        return undefined;
    }
}

export async function runResearchPlan(input: RunnerInput): Promise<RunnerResult> {
    const { plan, engagementSlug, signal } = input;
    const proxyBase = input.proxyBase || PROXY_BASE;
    const trace: ReflectionTraceEntry[] = [];
    const resolved = new Set<string>();
    let spendUsd = 0;
    let iteration = 0;
    let aborted = false;
    let new_questions_added = 0;

    // Working copy so we can append new_question sub-questions discovered
    // mid-loop without mutating the caller's plan reference.
    const workingPlan: ResearchPlan = { ...plan, sub_questions: [...plan.sub_questions] };

    const emitStatus = (currentSubQuestion?: string, verdict?: string) => {
        input.onProgress?.({
            iteration,
            maxIterations: workingPlan.max_iterations,
            spendUsd,
            currentSubQuestion,
            verdict,
            completed: false,
            aborted: false,
        });
    };

    while (iteration < workingPlan.max_iterations) {
        if (signal?.aborted) {
            aborted = true;
            break;
        }
        if (spendUsd >= workingPlan.budget_usd) {
            console.info(`[researchPlanRunner] budget cap $${workingPlan.budget_usd} reached at iter ${iteration}; halting`);
            break;
        }

        const sq = pickNextSubQuestion(workingPlan, resolved);
        if (!sq) {
            // All sub-questions resolved
            break;
        }

        iteration += 1;
        const iterStart = Date.now();
        emitStatus(sq.question, 'acting...');

        let evidence_count = 0;
        let evidence_summary = '';
        try {
            const actResult = await actOnSubQuestion(sq, workingPlan, proxyBase, signal);
            evidence_count = actResult.evidence_count;
            evidence_summary = actResult.evidence_summary;
        } catch (actErr: any) {
            if (actErr?.name === 'AbortError') {
                aborted = true;
                break;
            }
            trace.push({
                iteration,
                sub_question_id: sq.id,
                sub_question_text: sq.question,
                verdict: 'rejected',
                evidence_count: 0,
                spend_so_far_usd: spendUsd,
                ms_elapsed: Date.now() - iterStart,
                notes: `act failed: ${actErr?.message || actErr}`,
                timestamp: nowIso(),
            });
            resolved.add(sq.id);
            input.onReflection?.(trace[trace.length - 1]);
            continue;
        }

        if (signal?.aborted) {
            aborted = true;
            break;
        }

        emitStatus(sq.question, 'reflecting...');
        const reflection = await reflectOnSubQuestion(sq, evidence_summary, workingPlan, proxyBase, signal);
        spendUsd += COST_PER_ITERATION_USD;

        const traceEntry: ReflectionTraceEntry = {
            iteration,
            sub_question_id: sq.id,
            sub_question_text: sq.question,
            verdict: reflection.verdict,
            evidence_count,
            spend_so_far_usd: spendUsd,
            ms_elapsed: Date.now() - iterStart,
            new_question_text: reflection.new_question_text,
            notes: reflection.notes,
            timestamp: nowIso(),
        };
        trace.push(traceEntry);
        input.onReflection?.(traceEntry);
        emitStatus(sq.question, reflection.verdict);

        if (reflection.verdict === 'covered' || reflection.verdict === 'rejected') {
            resolved.add(sq.id);
        } else if (reflection.verdict === 'new_question' && reflection.new_question_text) {
            // Append a new sub-question for the next iteration to pick up
            const newId = `sq_new_${iteration}`;
            workingPlan.sub_questions.push({
                id: newId,
                question: reflection.new_question_text,
                angle: sq.angle,
                expected_evidence_types: sq.expected_evidence_types,
                expected_named_entities: sq.expected_named_entities,
                priority: 'medium',
            });
            resolved.add(sq.id);
            new_questions_added += 1;
        }
        // If gap_remains, the sub-question stays unresolved for a future iteration
    }

    const persisted_to = await persistTrace(engagementSlug, trace, proxyBase);

    const final: RunnerResult = {
        completed: !aborted,
        aborted,
        iterations_run: iteration,
        final_spend_usd: spendUsd,
        trace,
        resolved_count: resolved.size,
        unresolved_count: workingPlan.sub_questions.length - resolved.size,
        new_questions_added,
        persisted_to,
    };

    // Final status emit
    input.onProgress?.({
        iteration,
        maxIterations: workingPlan.max_iterations,
        spendUsd,
        completed: final.completed,
        aborted: final.aborted,
    });

    return final;
}
