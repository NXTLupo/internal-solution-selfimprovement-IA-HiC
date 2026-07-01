/**
 * RUN TRACE — the per-step model + tool trace that rides inside the AIR (WS-0).
 * Every model call and every tool call in a run records a step here, so cost/quota/routing are auditable and
 * the Improvement Graph (self-improvement, WS-D) can read full rollouts (Meta-Harness), not lossy summaries.
 * Provider-agnostic: it records the routed model id + the routing reason regardless of which provider-native
 * surface (proxy -> Responses API / Interactions / Anthropic) actually executed the call.
 */

export type QuotaState = 'healthy' | 'degraded' | 'exhausted' | 'unknown';

export interface ModelTraceStep {
    step: string;                 // e.g. 'air:generate', 'themes:breadth-shard-3', 'render:pptx'
    selectedModel: string;        // routed model id (HiC canonical), e.g. 'gemini-3.1-pro-preview'
    routingReason: string;        // why this model (bake-off tier / cap fallback / eval-score / quota)
    provider: 'gemini' | 'anthropic' | 'openai';
    costEstimateUsd: number;
    quotaState: QuotaState;
    promptTokens?: number;
    outputTokens?: number;
    cacheHit?: boolean;
    startedAt?: string;
    elapsedMs?: number;
}

export interface ToolTraceStep {
    step: string;
    toolPack?: string;            // WS-J: which signed tool pack authorized this
    toolName: string;
    objectiveId?: string;
    sourcePack?: string;
    outputHash?: string;
    downstreamArtifactIds?: string[];
    startedAt?: string;
    elapsedMs?: number;
}

export interface RunTrace {
    runId: string;
    modelSteps: ModelTraceStep[];
    toolSteps: ToolTraceStep[];
}

export function newRunTrace(runId: string): RunTrace {
    return { runId, modelSteps: [], toolSteps: [] };
}

export function recordModelStep(trace: RunTrace, step: ModelTraceStep): RunTrace {
    trace.modelSteps.push(step);
    return trace;
}

export function recordToolStep(trace: RunTrace, step: ToolTraceStep): RunTrace {
    trace.toolSteps.push(step);
    return trace;
}

/** Total estimated spend across the run (for cost telemetry + budget gates). */
export function traceTotalCostUsd(trace: RunTrace): number {
    return trace.modelSteps.reduce((sum, s) => sum + (Number.isFinite(s.costEstimateUsd) ? s.costEstimateUsd : 0), 0);
}

/** Did any step route to a model while its quota was exhausted? (a routing-correctness alarm). */
export function hasExhaustedRoute(trace: RunTrace): boolean {
    return trace.modelSteps.some(s => s.quotaState === 'exhausted');
}
