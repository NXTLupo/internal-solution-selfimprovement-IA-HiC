/**
 * Chunk Dispatcher - Generic chunk-and-merge orchestrator for HiC deliverables.
 *
 * Every per-artifact chunker (slide decks, roadmap horizons, PRD section
 * families, blueprint per-persona, etc.) calls into this service rather
 * than reimplementing parallel-call + retry + merge + completeness logic.
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phase 1.
 */

import { validateCompleteness, type CompletenessReport } from './outputCompletenessValidator';
import { logChunkRun, type ChunkRunRecord } from './chunkTelemetry';

export interface ChunkPlan<TInput, TChunkResult, TFinal> {
    /**
     * Human-readable artifact identifier - e.g., 'slides', 'roadmap',
     * 'prd', 'gap-analysis'. Used in telemetry and failure surfacing.
     */
    artifactType: string;

    /**
     * Split the input into N chunks. Each chunk represents one LLM call.
     * Returns an ordered list - order is preserved through merge.
     */
    split: (input: TInput) => Array<{ id: string; payload: any; description?: string }>;

    /**
     * Generate one chunk's output. Called once per chunk, in parallel
     * (subject to `parallelism`).
     */
    generate: (chunkId: string, payload: any) => Promise<TChunkResult>;

    /**
     * Validate a single chunk's output. If invalid, the chunk is retried
     * up to `perChunkRetries` times. If still invalid, the chunk fails
     * the run (no silent partial output).
     */
    validateChunk?: (result: TChunkResult, chunkId: string) => { ok: boolean; reason?: string };

    /**
     * Merge ordered chunk results into the final deliverable.
     */
    merge: (results: Array<{ id: string; result: TChunkResult }>) => TFinal;

    /**
     * Validate the final merged output. If invalid, the run is flagged
     * incomplete and surfaced to the user - no silent ship.
     */
    validateFinal?: (final: TFinal) => CompletenessReport;

    /**
     * Per-chunk retry budget. Default 1 (one retry per chunk before failing).
     */
    perChunkRetries?: number;

    /**
     * Max concurrent generate() calls. Default 6 - comfortably under most
     * provider rate limits while still parallelizing aggressively.
     */
    parallelism?: number;

    /**
     * Optional callback when a chunk completes. Use for live progress UI.
     */
    onChunkComplete?: (chunkId: string, ok: boolean) => void;
}

export interface ChunkRunResult<TFinal> {
    ok: boolean;
    result?: TFinal;
    completeness?: CompletenessReport;
    perChunkResults: Array<{
        id: string;
        ok: boolean;
        durationMs: number;
        retries: number;
        error?: string;
    }>;
    totalDurationMs: number;
    failures: string[];
}

/**
 * Run a chunked generation. Every chunk runs in parallel (up to the
 * parallelism cap). Each chunk has its own retry budget. Chunk failures
 * after retries surface as a structured failure in the result - no silent
 * partial output.
 */
export async function runChunked<TI, TC, TF>(
    plan: ChunkPlan<TI, TC, TF>,
    input: TI,
): Promise<ChunkRunResult<TF>> {
    const runId = `chunk_${plan.artifactType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const t0 = Date.now();
    const perChunkRetries = plan.perChunkRetries ?? 1;
    const parallelism = plan.parallelism ?? 6;

    const chunks = plan.split(input);
    if (chunks.length === 0) {
        return {
            ok: false,
            perChunkResults: [],
            totalDurationMs: Date.now() - t0,
            failures: ['split() returned no chunks - nothing to generate'],
        };
    }

    const perChunkResults: ChunkRunResult<TF>['perChunkResults'] = [];
    const chunkOutputs: Array<{ id: string; result: TC } | null> = new Array(chunks.length).fill(null);

    // Run with a semaphore-like queue. Simple promise-pool implementation.
    let cursor = 0;
    const runOne = async (): Promise<void> => {
        while (cursor < chunks.length) {
            const myIdx = cursor++;
            const chunk = chunks[myIdx];
            const chunkT0 = Date.now();
            let lastErr: any = null;
            let retries = 0;
            for (let attempt = 0; attempt <= perChunkRetries; attempt += 1) {
                try {
                    const result = await plan.generate(chunk.id, chunk.payload);
                    // Validate at chunk level if validator provided
                    if (plan.validateChunk) {
                        const v = plan.validateChunk(result, chunk.id);
                        if (!v.ok) {
                            lastErr = new Error(v.reason || 'Chunk validation failed');
                            retries += 1;
                            continue;
                        }
                    }
                    chunkOutputs[myIdx] = { id: chunk.id, result };
                    perChunkResults.push({
                        id: chunk.id,
                        ok: true,
                        durationMs: Date.now() - chunkT0,
                        retries,
                    });
                    plan.onChunkComplete?.(chunk.id, true);
                    break;
                } catch (err) {
                    lastErr = err;
                    retries += 1;
                }
            }
            // If we exited the loop without setting chunkOutputs[myIdx], chunk failed
            if (chunkOutputs[myIdx] === null) {
                perChunkResults.push({
                    id: chunk.id,
                    ok: false,
                    durationMs: Date.now() - chunkT0,
                    retries,
                    error: lastErr?.message || String(lastErr || 'unknown'),
                });
                plan.onChunkComplete?.(chunk.id, false);
            }
        }
    };

    const workerCount = Math.min(parallelism, chunks.length);
    await Promise.all(Array.from({ length: workerCount }, () => runOne()));

    const failedChunks = perChunkResults.filter(r => !r.ok);
    const completedChunks = chunkOutputs.filter((c): c is { id: string; result: TC } => c !== null);

    // No-silent-partial: if ANY chunk failed after retries, return ok:false with
    // diagnostics. The caller decides whether to ship-partial or revise-prompt.
    if (failedChunks.length > 0) {
        const report: ChunkRunRecord = {
            runId,
            artifactType: plan.artifactType,
            startedAt: new Date(t0).toISOString(),
            durationMs: Date.now() - t0,
            chunkCount: chunks.length,
            completedCount: completedChunks.length,
            failedCount: failedChunks.length,
            truncationDetected: false,
            perChunk: perChunkResults,
        };
        await logChunkRun(report);
        return {
            ok: false,
            perChunkResults,
            totalDurationMs: Date.now() - t0,
            failures: failedChunks.map(f => `Chunk ${f.id}: ${f.error || 'unknown'}`),
        };
    }

    // All chunks succeeded - merge in original order
    const merged = plan.merge(completedChunks);
    const completeness = plan.validateFinal ? plan.validateFinal(merged) : { ok: true, findings: [] };

    const record: ChunkRunRecord = {
        runId,
        artifactType: plan.artifactType,
        startedAt: new Date(t0).toISOString(),
        durationMs: Date.now() - t0,
        chunkCount: chunks.length,
        completedCount: completedChunks.length,
        failedCount: 0,
        truncationDetected: !completeness.ok,
        completenessFindings: completeness.findings?.map(f => `${f.severity}: ${f.message}`),
        perChunk: perChunkResults,
    };
    await logChunkRun(record);

    return {
        ok: completeness.ok,
        result: merged,
        completeness,
        perChunkResults,
        totalDurationMs: Date.now() - t0,
        failures: completeness.ok ? [] : (completeness.findings || []).map(f => f.message),
    };
}
