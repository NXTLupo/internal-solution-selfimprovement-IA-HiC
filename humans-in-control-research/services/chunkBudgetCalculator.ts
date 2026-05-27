/**
 * Chunk Budget Calculator — Per-artifact chunk plan resolution.
 *
 * Encodes the per-artifact chunking strategy from the chunking-and-output-
 * quality plan (Part 3) in executable form. Every chunker calls this to
 * find out how many chunks to create, how many items per chunk, and what
 * parallelism to use.
 *
 * Feedback signals from the learning engine bump the chunk count for the
 * specific artifact type — so a "this was incomplete" signal on slides
 * durably increases slide-deck chunk count for the next run AND, after
 * 3+ matching signals, gets promoted to a permanent skill-frontmatter
 * change via the learning engine routing rule.
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phase 1.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export type ArtifactType =
    | 'slides'
    | 'themes'
    | 'personas'
    | 'recommendations'
    | 'roadmap'
    | 'prd'
    | 'blueprint'
    | 'journey'
    | 'gap'
    | 'tech-audit'
    | 'architecture'
    | 'competitive'
    | 'report'
    | 'prototype';

export interface FeedbackSignalsForChunking {
    /** Has the user said "incomplete", "truncated", "cut off" about this artifact type recently? */
    incomplete?: boolean;
    /** Has the user said "needs more depth", "too short", "expand" about this artifact type recently? */
    tooShort?: boolean;
    /** Explicit override — typically applied by the learning engine after promoting a feedback cluster. */
    bumpChunkCount?: number;
    /** Explicit override on per-chunk output budget. */
    bumpOutputBudget?: number;
}

export interface ChunkPlanConfig {
    /** How many parallel chunks to run. */
    chunkCount: number;
    /** Soft target for items per chunk (e.g., slides per theme). */
    perChunkItemCount: number;
    /** Max concurrent calls. */
    parallelism: number;
    /** Per-chunk output token budget. Drives prompt instruction. */
    perChunkOutputBudget: number;
    /** Floor on % of expected items that must arrive before the run is "complete". */
    truncationFloor: number;
    /** Human-readable rationale shown in telemetry + receipts. */
    rationale: string;
}

const DEFAULT_PLANS: Record<ArtifactType, ChunkPlanConfig> = {
    slides: {
        chunkCount: 4,
        perChunkItemCount: 5,
        parallelism: 4,
        perChunkOutputBudget: 8000,
        truncationFloor: 0.9,
        rationale: 'Slides chunk per theme. 4 themes × 5 slides each. Parallel; each call emits ~3-4K tokens — well under soft-stop.',
    },
    themes: {
        chunkCount: 2,
        perChunkItemCount: 10,
        parallelism: 2,
        perChunkOutputBudget: 12000,
        truncationFloor: 0.85,
        rationale: 'Pass 1 BREADTH single-shot + per-theme DEPTH already chunked in generateThemes.',
    },
    personas: {
        chunkCount: 6,
        perChunkItemCount: 1,
        parallelism: 6,
        perChunkOutputBudget: 6000,
        truncationFloor: 1.0,
        rationale: 'Phase A roster + Phase B per-persona enrichment (one call per persona). 6 personas typical.',
    },
    recommendations: {
        chunkCount: 4,
        perChunkItemCount: 3,
        parallelism: 4,
        perChunkOutputBudget: 7000,
        truncationFloor: 0.9,
        rationale: 'Cluster pain points into 3-5 problem clusters; generate recs per cluster in parallel.',
    },
    roadmap: {
        chunkCount: 3,
        perChunkItemCount: 4,
        parallelism: 3,
        perChunkOutputBudget: 8000,
        truncationFloor: 1.0,
        rationale: 'One call per horizon (NOW / NEXT / LATER). Three parallel calls. Each emits ~5-8K tokens.',
    },
    prd: {
        chunkCount: 4,
        perChunkItemCount: 4,
        parallelism: 4,
        perChunkOutputBudget: 8000,
        truncationFloor: 1.0,
        rationale: '16 Cagan/SVPG sections split into 4 family chunks: Problem, Solution, Execution, Risk.',
    },
    blueprint: {
        chunkCount: 4,
        perChunkItemCount: 5,
        parallelism: 4,
        perChunkOutputBudget: 6000,
        truncationFloor: 1.0,
        rationale: 'One call per persona × Bitner 5-component grid. 4-6 personas typical.',
    },
    journey: {
        chunkCount: 6,
        perChunkItemCount: 1,
        parallelism: 6,
        perChunkOutputBudget: 5000,
        truncationFloor: 1.0,
        rationale: 'One call per journey stage. 5-7 stages typical, each with full activity/emotion/pain/opp set.',
    },
    gap: {
        chunkCount: 5,
        perChunkItemCount: 2,
        parallelism: 5,
        perChunkOutputBudget: 6000,
        truncationFloor: 0.85,
        rationale: 'One call per capability domain (people / process / technology / data / governance).',
    },
    'tech-audit': {
        chunkCount: 2,
        perChunkItemCount: 8,
        parallelism: 1,
        perChunkOutputBudget: 8000,
        truncationFloor: 0.9,
        rationale: 'Pass 1: systems inventory list. Pass 2: per-system audit entry in parallel.',
    },
    architecture: {
        chunkCount: 2,
        perChunkItemCount: 6,
        parallelism: 1,
        perChunkOutputBudget: 7000,
        truncationFloor: 0.95,
        rationale: 'Pass 1: C4 Context. Pass 2: Container per major node in parallel.',
    },
    competitive: {
        chunkCount: 4,
        perChunkItemCount: 1,
        parallelism: 4,
        perChunkOutputBudget: 5000,
        truncationFloor: 1.0,
        rationale: 'One call per peer (4-6 named peers). Each emits the full comparison matrix slice.',
    },
    report: {
        chunkCount: 6,
        perChunkItemCount: 1,
        parallelism: 4,
        perChunkOutputBudget: 8000,
        truncationFloor: 1.0,
        rationale: 'One call per section in the whitepaper section manifest. Dynamic count based on available deliverables.',
    },
    prototype: {
        chunkCount: 2,
        perChunkItemCount: 1,
        parallelism: 1,
        perChunkOutputBudget: 16000,
        truncationFloor: 1.0,
        rationale: 'Pass 1: scaffold + named slots. Pass 2: component fill (sequential because slots may share state).',
    },
};

/**
 * Resolve a chunk plan for an artifact, factoring in feedback signals and
 * any persisted overrides from `wiki/synthesis/chunk-config.json`.
 */
export async function calculateChunkPlan(opts: {
    artifactType: ArtifactType;
    expectedItemCount?: number;
    targetModel?: string;
    feedbackSignals?: FeedbackSignalsForChunking;
}): Promise<ChunkPlanConfig> {
    const base = { ...DEFAULT_PLANS[opts.artifactType] };

    // Apply persisted per-artifact overrides (set by learning engine after
    // 3+ feedback signals of the same kind cluster).
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/chunk-config.json`);
        if (resp.ok) {
            const data = await resp.json();
            const overrides = JSON.parse(data.content || '{}');
            const override = overrides[opts.artifactType];
            if (override) {
                // Absolute overrides
                if (typeof override.chunkCount === 'number') base.chunkCount = override.chunkCount;
                if (typeof override.perChunkItemCount === 'number') base.perChunkItemCount = override.perChunkItemCount;
                if (typeof override.parallelism === 'number') base.parallelism = override.parallelism;
                if (typeof override.perChunkOutputBudget === 'number') base.perChunkOutputBudget = override.perChunkOutputBudget;
                // 2026-05-23 — Relative bumps from learning-engine promotions.
                // Bumps compose with the defaults so the absolute override is
                // recalculated whenever defaults change. Stored alongside
                // (or instead of) absolute fields.
                if (typeof override.chunkCountBump === 'number') {
                    base.chunkCount += override.chunkCountBump;
                }
                if (typeof override.perChunkOutputBudgetBump === 'number') {
                    base.perChunkOutputBudget += override.perChunkOutputBudgetBump;
                }
                if (typeof override.parallelismBump === 'number') {
                    base.parallelism += override.parallelismBump;
                }
                if (override.rationale) base.rationale = `${base.rationale} (learned override: ${override.rationale})`;
            }
        }
    } catch {
        // No persisted overrides yet — first run
    }

    // Apply immediate feedback signals (single-run bump from current Apply-now).
    const signals = opts.feedbackSignals || {};
    if (signals.incomplete) {
        base.chunkCount = Math.ceil(base.chunkCount * 1.5);
        base.perChunkOutputBudget = Math.ceil(base.perChunkOutputBudget * 1.3);
        base.rationale = `${base.rationale} | INCOMPLETE-feedback bump: chunks ×1.5, budget ×1.3.`;
    }
    if (signals.tooShort) {
        base.perChunkOutputBudget = Math.ceil(base.perChunkOutputBudget * 1.5);
        base.rationale = `${base.rationale} | TOO-SHORT-feedback bump: budget ×1.5.`;
    }
    if (typeof signals.bumpChunkCount === 'number' && signals.bumpChunkCount > 0) {
        base.chunkCount += signals.bumpChunkCount;
        base.rationale = `${base.rationale} | Explicit chunk-count bump: +${signals.bumpChunkCount}.`;
    }
    if (typeof signals.bumpOutputBudget === 'number' && signals.bumpOutputBudget > 0) {
        base.perChunkOutputBudget += signals.bumpOutputBudget;
        base.rationale = `${base.rationale} | Explicit budget bump: +${signals.bumpOutputBudget} tokens.`;
    }

    // If the user's prompt specifies an explicit item count, scale chunkCount
    // so per-chunk item count stays ~constant.
    if (opts.expectedItemCount && opts.expectedItemCount > 0) {
        const idealChunks = Math.ceil(opts.expectedItemCount / Math.max(1, base.perChunkItemCount));
        if (idealChunks > base.chunkCount) {
            base.chunkCount = idealChunks;
            base.rationale = `${base.rationale} | Prompt asked for ${opts.expectedItemCount} items — chunks scaled to ${idealChunks}.`;
        }
    }

    // Cap parallelism at chunkCount (no point running more workers than chunks)
    base.parallelism = Math.min(base.parallelism, base.chunkCount);

    return base;
}

/**
 * Persist a permanent override for an artifact type. Called by the learning
 * engine when a feedback cluster (3+ matching signals) promotes a bump
 * from per-run to per-artifact.
 */
export async function persistChunkOverride(
    artifactType: ArtifactType,
    override: Partial<ChunkPlanConfig> & { rationale?: string },
): Promise<boolean> {
    try {
        // Read existing
        let existing: Record<string, any> = {};
        const readResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/chunk-config.json`);
        if (readResp.ok) {
            const data = await readResp.json();
            try { existing = JSON.parse(data.content || '{}'); } catch { existing = {}; }
        }
        existing[artifactType] = { ...(existing[artifactType] || {}), ...override, updatedAt: new Date().toISOString() };
        const writeResp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'synthesis/chunk-config.json',
                content: JSON.stringify(existing, null, 2),
            }),
        });
        return writeResp.ok;
    } catch {
        return false;
    }
}
