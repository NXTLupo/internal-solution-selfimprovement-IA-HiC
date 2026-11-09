// runState.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-1 T1/T2/T3)
//
// THE typed run state. One record per run, one writer API, persisted per change.
//
// Before this module the application's "state" was fifteen `window.__hic*` globals, a
// handful of module singletons and a `GenAISession.accumulatedContext` string that re-fed
// stage output as prose. Nothing shared, nothing persisted, nothing a later stage could
// read without knowing which global a former stage had happened to set. The Google ADK
// harness talk names the layer this replaces: STATE, the application's key-value
// scratchpad, distinct from the SESSION transcript and from LONG-TERM memory.
//
// The run's goal/blocker machinery (`goalState.ts`, built in the DeerFlow transfer and
// never wired) is the routing core here; this file gives it the record it was missing.
//
// Persistence: `sessions/<engagement>/runs/<run_id>/state.json`, written through the
// proxy (`/api/sessions/{slug}/runs/{run_id}`), debounced, never blocking. The
// `research_run_manifest` (schemas/research_run_manifest.schema.json) is emitted from
// this record at run end (`emitRunManifest`).

import { advanceGoal, initGoalState, routeGoalState, satisfyGoal, type GoalState, type ProgressSignal } from './goalState';
import { proxyBase, setRequestContextProvider } from './proxyConfig';
import { listPriceFor } from './costMeter';

export type RunKind = 'research' | 'chat' | 'artifact' | 'proto' | 'unknown';
export type RunMode = 'fresh' | 'blend' | 'reuse-only';

export interface RunStep {
    ts: number;
    stage: string;
    model?: string;
    attempt?: number;
    elapsed_ms?: number;
    usage?: Record<string, number>;
    cost_usd?: number;
    tool?: string;
    tool_input?: unknown;
    result_chars?: number;
    message_id?: string;
    failed?: boolean;
    note?: string;
}

export interface RunVerdict {
    ts: number;
    judge_id: string;
    score?: number;
    pass: boolean;
    slide_id?: string;
    message_id?: string;
    detail?: string;
}

export interface RunStateRecord {
    run_id: string;
    engagement: string;
    objective: string;
    kind: RunKind;
    mode: RunMode;
    cached_only: boolean;
    blend: boolean;
    started_at: number;
    updated_at: number;
    stage: string;
    plan: { sub_questions: any[]; decomposition?: any };
    corpus_composition?: any;
    knowledge_gaps?: any;
    steps: RunStep[];
    verdicts: RunVerdict[];
    instruction_overrides: Record<string, string>;
    artifacts: string[];
    goal: GoalState;
    turn_counter: number;
    current_message_id?: string;
}

const STEP_CAP = 2000;
const VERDICT_CAP = 4000;

function newRunId(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `run_${Date.now().toString(36)}_${rand}`;
}

function freshRecord(engagement = '', objective = '', kind: RunKind = 'unknown'): RunStateRecord {
    const now = Date.now();
    return {
        run_id: newRunId(),
        engagement,
        objective,
        kind,
        mode: 'fresh',
        cached_only: false,
        blend: false,
        started_at: now,
        updated_at: now,
        stage: 'idle',
        plan: { sub_questions: [] },
        steps: [],
        verdicts: [],
        instruction_overrides: {},
        artifacts: [],
        goal: initGoalState(objective),
        turn_counter: 0,
    };
}

let _run: RunStateRecord = freshRecord();
// every proxy-bound fetch carries the run and message ids (proxyConfig interceptor)
setRequestContextProvider(() => ({ runId: _run.run_id, messageId: _run.current_message_id }));
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
let _persistImpl: ((rec: RunStateRecord) => Promise<void>) | null = null;
const _subs = new Set<(rec: RunStateRecord) => void>();

function touch(): void {
    _run.updated_at = Date.now();
    for (const cb of Array.from(_subs)) {
        try { cb(_run); } catch { /* a broken subscriber never breaks the run */ }
    }
    schedulePersist();
}

// ------------------------------------------------------------------ lifecycle

export function getRun(): RunStateRecord {
    return _run;
}

export function subscribeRunState(cb: (rec: RunStateRecord) => void): () => void {
    _subs.add(cb);
    return () => { _subs.delete(cb); };
}

/** Start a new run. The engagement and objective are kept when not given, so a chat turn
 *  inside a restored engagement inherits them. */
export function beginRun(opts: { engagement?: string; objective?: string; kind?: RunKind } = {}): RunStateRecord {
    const prev = _run;
    _run = freshRecord(opts.engagement ?? prev.engagement, opts.objective ?? prev.objective, opts.kind ?? prev.kind);
    // run-level settings the user chose on the landing bar carry across runs
    _run.mode = prev.mode;
    _run.cached_only = prev.cached_only;
    _run.blend = prev.blend;
    _run.plan = prev.plan;
    _run.instruction_overrides = { ...prev.instruction_overrides };
    _run.stage = 'started';
    touch();
    return _run;
}

/** Restore a persisted record (session restore). */
export function hydrateRunState(rec: Partial<RunStateRecord> | null | undefined): RunStateRecord {
    if (!rec || typeof rec !== 'object') return _run;
    _run = { ...freshRecord(), ...rec, steps: Array.isArray(rec.steps) ? rec.steps : [], verdicts: Array.isArray(rec.verdicts) ? rec.verdicts : [] } as RunStateRecord;
    if (!_run.goal) _run.goal = initGoalState(_run.objective);
    touch();
    return _run;
}

export function setStage(stage: string): void {
    _run.stage = String(stage || '');
    touch();
}

// ------------------------------------------------------------------ the former globals

export function engagementSlug(): string { return _run.engagement || ''; }
export function setEngagementSlug(slug: string | undefined | null): void {
    _run.engagement = String(slug || '');
    touch();
}

export function researchGoal(): string { return _run.objective || ''; }
export function setResearchGoal(goal: string | undefined | null): void {
    _run.objective = String(goal || '');
    if (!_run.goal.objective) _run.goal = { ..._run.goal, objective: _run.objective };
    touch();
}

export function cachedOnlyMode(): boolean { return !!_run.cached_only; }
export function setCachedOnlyMode(v: boolean): void { _run.cached_only = !!v; touch(); }

export function blendMode(): boolean { return !!_run.blend; }
export function setBlendMode(v: boolean): void { _run.blend = !!v; touch(); }

export function runMode(): RunMode { return _run.mode || 'fresh'; }
export function setRunMode(m: RunMode): void { _run.mode = m; touch(); }

export function corpusComposition<T = any>(): T | undefined { return _run.corpus_composition as T | undefined; }
export function setCorpusComposition(c: unknown): void { _run.corpus_composition = c; touch(); }

export function knowledgeGaps<T = any>(): T | undefined { return _run.knowledge_gaps as T | undefined; }
export function setKnowledgeGaps(g: unknown): void { _run.knowledge_gaps = g; touch(); }

export function planSubQuestions(): any[] { return Array.isArray(_run.plan?.sub_questions) ? _run.plan.sub_questions : []; }
export function setPlanSubQuestions(sqs: any[] | null | undefined): void {
    _run.plan = { ..._run.plan, sub_questions: Array.isArray(sqs) ? sqs : [] };
    touch();
}
export function planDecomposition<T = any>(): T | undefined { return _run.plan?.decomposition as T | undefined; }
export function setPlanDecomposition(d: unknown): void {
    _run.plan = { ..._run.plan, decomposition: d };
    touch();
}

export function instructionOverride(kind: string): string | undefined { return _run.instruction_overrides[kind]; }
export function setInstructionOverride(kind: string, text: string | null | undefined): void {
    if (text) _run.instruction_overrides[kind] = text; else delete _run.instruction_overrides[kind];
    touch();
}

// ------------------------------------------------------------------ trajectory

export function nextTurnIndex(): number {
    _run.turn_counter += 1;
    touch();
    return _run.turn_counter;
}

export function currentMessageId(): string | undefined { return _run.current_message_id; }
export function setCurrentMessageId(id: string | undefined | null): void {
    _run.current_message_id = id || undefined;
    touch();
}

/** Tokens in/out from any provider's usage object (Anthropic, Gemini, OpenAI field names). */
export function tokensFromUsage(u: Record<string, number> | undefined): { input: number; output: number } {
    if (!u) return { input: 0, output: 0 };
    const input = Number(u.input_tokens ?? u.promptTokenCount ?? u.prompt_tokens ?? 0) + Number(u.cache_read_input_tokens ?? 0) + Number(u.cache_creation_input_tokens ?? 0);
    const output = Number(u.output_tokens ?? u.candidatesTokenCount ?? u.completion_tokens ?? 0);
    return { input: Number.isFinite(input) ? input : 0, output: Number.isFinite(output) ? output : 0 };
}

export function recordStep(step: Omit<RunStep, 'ts'> & { ts?: number }): RunStep {
    const s: RunStep = { ts: step.ts ?? Date.now(), message_id: step.message_id ?? _run.current_message_id, ...step };
    // WS-2 E10 (2026-10-30): every AI step carries a list-price cost; `costEstimateUsd: 0` on 838 of 838 AIRs
    // was the symptom this closes. Priced from costMeter's table (USD per 1M tokens).
    if (s.cost_usd === undefined && s.usage && s.model) {
        try {
            const { input, output } = tokensFromUsage(s.usage);
            const price = listPriceFor(s.model);
            s.cost_usd = Math.round(((input * price.in + output * price.out) / 1_000_000) * 1_000_000) / 1_000_000;
        } catch { /* pricing never breaks a step */ }
    }
    _run.steps.push(s);
    if (_run.steps.length > STEP_CAP) _run.steps.splice(0, _run.steps.length - STEP_CAP);
    touch();
    return s;
}

export function recordVerdict(v: Omit<RunVerdict, 'ts'> & { ts?: number }): RunVerdict {
    const r: RunVerdict = { ts: v.ts ?? Date.now(), message_id: v.message_id ?? _run.current_message_id, ...v };
    _run.verdicts.push(r);
    if (_run.verdicts.length > VERDICT_CAP) _run.verdicts.splice(0, _run.verdicts.length - VERDICT_CAP);
    touch();
    return r;
}

export function recordArtifact(artifactId: string): void {
    if (artifactId && !_run.artifacts.includes(artifactId)) {
        _run.artifacts.push(artifactId);
        touch();
    }
}

// ------------------------------------------------------------------ goal routing

export function advanceRunGoal(signal: ProgressSignal): GoalState {
    _run.goal = advanceGoal(_run.goal, signal);
    touch();
    return _run.goal;
}

export function satisfyRunGoal(evidenceSummary: string): GoalState {
    _run.goal = satisfyGoal(_run.goal, evidenceSummary);
    touch();
    return _run.goal;
}

export function routeRun() {
    return routeGoalState(_run.goal);
}

/** Cost and step summary for receipts and the manifest. */
export function runSummary(): { steps: number; models: Record<string, number>; cost_usd: number; verdicts: number; failed_steps: number } {
    const models: Record<string, number> = {};
    let cost = 0; let failed = 0;
    for (const s of _run.steps) {
        if (s.model) models[s.model] = (models[s.model] || 0) + 1;
        if (typeof s.cost_usd === 'number') cost += s.cost_usd;
        if (s.failed) failed += 1;
    }
    return { steps: _run.steps.length, models, cost_usd: Math.round(cost * 10000) / 10000, verdicts: _run.verdicts.length, failed_steps: failed };
}

// ------------------------------------------------------------------ persistence

export function setRunStatePersister(fn: ((rec: RunStateRecord) => Promise<void>) | null): void {
    _persistImpl = fn;
}

async function defaultPersister(rec: RunStateRecord): Promise<void> {
    if (!rec.engagement || typeof fetch !== 'function') return;
    // 2026-10-31 (live deck turn): the single 5 s attempt aborted while the proxy was busy with layout
    // measurements, the record of the whole deck run was never written, and a non-2xx answer was treated as
    // success. Two attempts with a wider window, and a failed status is a failure.
    const url = `${proxyBase()}/api/sessions/${encodeURIComponent(rec.engagement)}/runs/${encodeURIComponent(rec.run_id)}`;
    const body = JSON.stringify(rec);
    let lastErr: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        try {
            const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal });
            if (!res.ok) throw new Error(`run record PUT ${res.status}`);
            return;
        } catch (e) {
            lastErr = e;
            if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
}

function schedulePersist(): void {
    if (typeof setTimeout !== 'function') return;
    if (_persistTimer) return;
    _persistTimer = setTimeout(() => {
        _persistTimer = null;
        void persistRunState();
    }, 1500);
}

export async function persistRunState(): Promise<void> {
    const fn = _persistImpl || defaultPersister;
    try {
        await fn(_run);
        (persistRunState as any)._warned = false;
    } catch (e: any) {
        if (!(persistRunState as any)._warned) {
            (persistRunState as any)._warned = true;
            console.warn('[runState] persistence failed (will retry on the next change):', e?.message || e);
        }
        // the next touch() re-arms the timer, so a transient failure is retried instead of lost
        schedulePersist();
    }
}

// ------------------------------------------------------------------ manifest (T2)

export interface ResearchRunManifest {
    runId: string;
    createdAtIso: string;
    objective: { objectiveId: string; userObjective: string };
    corpus: { totalChunks?: number; sources: Array<{ sourceName: string; sourceType?: string; provenance: 'fresh' | 'upload' | 'cached_reuse'; itemCount?: number }>; subQuestionCoverage?: Array<{ id: string; coverageStatus: string }> };
    artifacts: Array<{ artifactId: string; artifactType: string; airPath?: string }>;
    run: { kind: RunKind; mode: RunMode; stage: string; steps: number; models: Record<string, number>; cost_usd: number; verdicts: number; goal: Record<string, unknown> };
}

/** Build the schema-shaped manifest from the current record plus the caller's corpus view. */
export function buildRunManifest(extra: { sources?: ResearchRunManifest['corpus']['sources']; totalChunks?: number; artifacts?: ResearchRunManifest['artifacts'] } = {}): ResearchRunManifest {
    const sum = runSummary();
    const sqs = planSubQuestions();
    return {
        runId: _run.run_id,
        createdAtIso: new Date(_run.started_at).toISOString(),
        objective: { objectiveId: `${_run.engagement || 'engagement'}:${_run.run_id}`, userObjective: _run.objective || '(no objective recorded)' },
        corpus: {
            totalChunks: extra.totalChunks,
            sources: extra.sources || [],
            subQuestionCoverage: sqs.map((sq: any, i: number) => ({ id: String(sq?.id || `sq_${i + 1}`), coverageStatus: String(sq?.coverage_status || 'uncovered') })),
        },
        artifacts: extra.artifacts || _run.artifacts.map(id => ({ artifactId: id, artifactType: id.split('_')[0] || 'artifact' })),
        run: { kind: _run.kind, mode: _run.mode, stage: _run.stage, steps: sum.steps, models: sum.models, cost_usd: sum.cost_usd, verdicts: sum.verdicts, goal: { satisfied: _run.goal.satisfied, blocker: _run.goal.blocker, reason: _run.goal.reason } },
    };
}

export async function emitRunManifest(extra: Parameters<typeof buildRunManifest>[0] = {}): Promise<ResearchRunManifest> {
    const manifest = buildRunManifest(extra);
    if (_run.engagement && typeof fetch === 'function') {
        try {
            await fetch(`${proxyBase()}/api/sessions/${encodeURIComponent(_run.engagement)}/runs/${encodeURIComponent(_run.run_id)}/manifest`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manifest),
            });
        } catch (e: any) {
            console.warn('[runState] manifest write failed (non-fatal):', e?.message || e);
        }
    }
    return manifest;
}

/** Test seam. */
export function _resetRunStateForTests(): void {
    _run = freshRecord();
    if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
    _persistImpl = null;
    _subs.clear();
}
