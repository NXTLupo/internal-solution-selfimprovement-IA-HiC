// services/reproducibilityHash.ts
// Stamp every deliverable with a deterministic reproducibility_hash.
// Two runs with the same hash MUST produce byte-identical identity fields.
//
// 2026-05-24 — Phase 4 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
// Backlog item: Section 20 "Observability — Reproducibility hash stamping"

import { stableHash } from './multiModelResilience';

const HIC_PIPELINE_VERSION = 'v4.2-uplift-2026-05-24';


export type ReproducibilityInputs = {
    corpus_items: Array<{ id?: string; title?: string; body?: string }>;
    research_goal: string;
    framework_versions?: Record<string, string>;
    deliverable_type: string;       // 'themes' | 'personas' | 'recommendations' | 'mind_map' | etc.
    additional_seed?: string;
};


export function computeReproducibilityHash(inputs: ReproducibilityInputs): string {
    const corpusFingerprint = (inputs.corpus_items || [])
        .map(it => `${it.id ?? ''}|${(it.title ?? '').slice(0, 80)}|${(it.body ?? '').slice(0, 200)}`)
        .sort()
        .join('||');

    const frameworkFingerprint = Object.entries(inputs.framework_versions ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(';');

    return stableHash(
        HIC_PIPELINE_VERSION,
        inputs.deliverable_type,
        inputs.research_goal,
        corpusFingerprint,
        frameworkFingerprint,
        inputs.additional_seed ?? '',
    );
}


/**
 * Convenience: stamp the hash onto a deliverable JSON object as a top-level field.
 */
export function stampReproducibilityHash<T extends object>(
    deliverable: T,
    inputs: ReproducibilityInputs,
): T & { reproducibility_hash: string; pipeline_version: string; stamped_at: string } {
    const hash = computeReproducibilityHash(inputs);
    return {
        ...deliverable,
        reproducibility_hash: hash,
        pipeline_version: HIC_PIPELINE_VERSION,
        stamped_at: new Date().toISOString(),
    };
}
