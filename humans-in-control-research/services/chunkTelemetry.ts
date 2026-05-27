/**
 * Chunk Telemetry — Per-chunk JSONL persistence.
 *
 * Every chunked generation logs a record to wiki/synthesis/chunk-telemetry.jsonl
 * with chunk-level outcomes (success / retry / failure), per-chunk latency,
 * and any truncation findings from the completeness validator.
 *
 * The learning engine reads this monthly to derive:
 *   - Which artifact types truncate most often
 *   - Which chunk sizes correlate with truncation
 *   - Which models truncate at what output sizes
 *
 * These insights feed back into chunkBudgetCalculator's defaults via the
 * existing learning-engine routing rule (target: chunk-config).
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phase 1.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface ChunkRunRecord {
    runId: string;
    artifactType: string;
    startedAt: string;
    durationMs: number;
    chunkCount: number;
    completedCount: number;
    failedCount: number;
    truncationDetected: boolean;
    completenessFindings?: string[];
    perChunk: Array<{
        id: string;
        ok: boolean;
        durationMs: number;
        retries: number;
        error?: string;
    }>;
}

/**
 * Append a chunk-run record to wiki/synthesis/chunk-telemetry.jsonl.
 * Single-line JSON per record (true JSONL).
 */
export async function logChunkRun(record: ChunkRunRecord): Promise<boolean> {
    const line = JSON.stringify(record) + '\n';
    try {
        // The proxy's /api/wiki/append adds markdown-style spacing — not what
        // we want for JSONL. Use /api/wiki/write with read-modify-write
        // semantics. For high-throughput use a dedicated append endpoint
        // (future). For now this is acceptable because chunk runs are
        // single-digit-per-minute.
        let existing = '';
        try {
            const readResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/chunk-telemetry.jsonl`);
            if (readResp.ok) {
                const data = await readResp.json();
                existing = data.content || '';
            }
        } catch {
            // First run — no existing file
        }
        const writeResp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'synthesis/chunk-telemetry.jsonl',
                content: existing + line,
            }),
        });
        return writeResp.ok;
    } catch (err) {
        console.warn('[chunkTelemetry] persist failed (non-fatal):', err);
        return false;
    }
}

/**
 * Read recent chunk telemetry for a specific artifact type.
 * Used by the learning engine to detect patterns.
 */
export async function readRecentChunkRuns(
    artifactType?: string,
    limit: number = 100,
): Promise<ChunkRunRecord[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/chunk-telemetry.jsonl`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const lines = (data.content || '').split('\n').filter((l: string) => l.trim());
        const records: ChunkRunRecord[] = [];
        for (const line of lines.slice(-limit * 2)) {
            try {
                const rec = JSON.parse(line);
                if (!artifactType || rec.artifactType === artifactType) {
                    records.push(rec);
                }
            } catch { /* skip malformed line */ }
        }
        return records.slice(-limit);
    } catch {
        return [];
    }
}

/**
 * Aggregate stats for an artifact type — used to drive chunk-plan adjustments.
 */
export async function getArtifactStats(artifactType: string): Promise<{
    totalRuns: number;
    truncationRate: number;
    avgChunkCount: number;
    avgDurationMs: number;
    avgFailureRate: number;
}> {
    const runs = await readRecentChunkRuns(artifactType, 100);
    if (runs.length === 0) {
        return { totalRuns: 0, truncationRate: 0, avgChunkCount: 0, avgDurationMs: 0, avgFailureRate: 0 };
    }
    const truncations = runs.filter(r => r.truncationDetected).length;
    const totalChunks = runs.reduce((s, r) => s + r.chunkCount, 0);
    const totalDuration = runs.reduce((s, r) => s + r.durationMs, 0);
    const totalFailures = runs.reduce((s, r) => s + r.failedCount, 0);
    return {
        totalRuns: runs.length,
        truncationRate: truncations / runs.length,
        avgChunkCount: totalChunks / runs.length,
        avgDurationMs: totalDuration / runs.length,
        avgFailureRate: totalFailures / totalChunks,
    };
}
