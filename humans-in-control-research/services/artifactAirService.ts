/**
 * ARTIFACT AIR — the canonical Artifact Intermediate Representation (WS-0, the backbone).
 * Every research run and every hashtag artifact emits an ArtifactAIR BEFORE any final prose, slide, HTML,
 * image, or PPTX render. AIR is the shared contract across ingestion, retrieval, both chat desks, artifacts,
 * routing, imagery, Figma filling, PPTX export, QA, and self-improvement. It CONVERGES today's scattered
 * structures (GenerationReceipt, epoch traces, registry.json, the manifest) into one IR; it is not a parallel
 * store. Renderers consume AIR; none renders from raw model prose (enforced by air_schema_integrity, ramped
 * shadow -> blocking per path through Stage 3).
 *
 * Plan: plans/hic-definitive-vision-and-100-percent-plan-v2-2026-06-30.md (WS-0). Persistence is via the proxy
 * (POST /api/air/write); writeAir degrades gracefully (persisted:false) if the proxy endpoint is absent so this
 * module never breaks a running build before the endpoint ships.
 */

import { catalogEntryFor, type ArtifactCatalogEntry } from './artifactCatalog';
import type { EvidencePointer } from './evidenceLedgerService';
import { isWellFormedPointer } from './evidenceLedgerService';
import type { RunTrace } from './runTraceService';
import { newRunTrace } from './runTraceService';

export const AIR_VERSION = 'hic-air-2026-06-30' as const;

export type CoverageStatus = 'uncovered' | 'partial' | 'covered' | 'overcovered';

export interface SubQuestion {
    id: string;
    text: string;
    priority: 1 | 2 | 3 | 4 | 5;
    requiredEvidenceTypes?: string[];
    coverageStatus: CoverageStatus;
}

export interface ResearchObjective {
    objectiveId: string;
    userObjective: string;
    decomposedQuestions: SubQuestion[];
    decisionToSupport?: string;
    audience?: string;
}

export interface InsightHierarchy {
    situation: string[];
    complication: string[];
    rootCauses: string[];
    implications: string[];
    strategicChoices: string[];
}

export interface ImageSlotDecision {
    slotId: string;
    templateId?: string;
    figmaNodeId?: string;
    mode: 'none' | 'brand_image' | 'diagram' | 'icon' | 'data_viz' | 'uploaded_asset';
    modelTier?: string;            // e.g. 'gemini-3.1-flash-image-preview' | 'native_shape' (router owns the id)
    promptSource?: 'air_insight' | 'evidence_ledger' | 'user_prompt' | 'deterministic_icon_map';
    wired: boolean;
    altText?: string;
}

export interface RenderPlan {
    targetModes: Array<'analyst' | 'designer' | 'figma' | 'pptx' | 'html'>;
    templateCandidates: string[];
    imageSlots: ImageSlotDecision[];
    density: 'base' | 'dense';
}

export interface AirQualityReport {
    shadowMode: boolean;           // true while this path is pre-blocking (ramped enforcement)
    deterministicFailures: string[];
    reviewScores: Record<string, number>;
    promotedToSkillOpt: boolean;
}

export interface ArtifactAIR {
    airVersion: typeof AIR_VERSION;
    runId: string;
    artifactId: string;
    artifactType: string;          // catalog id, e.g. 'strategy', 'gap'
    trigger: string;               // the raw directive, e.g. '#strategy'
    objective: ResearchObjective;
    evidenceLedger: EvidencePointer[];
    insightHierarchy: InsightHierarchy;
    artifactPayload: unknown;      // the deliverable-specific structured payload the renderer consumes
    renderPlan: RenderPlan;
    modelTrace: RunTrace['modelSteps'];
    toolTrace?: RunTrace['toolSteps'];
    qualityReport?: AirQualityReport;
    createdAtIso?: string;         // stamped by the caller / proxy (Date.* avoided in deterministic paths)
}

export interface BuildAirInput {
    runId: string;
    artifactId: string;
    trigger: string;               // raw hashtag directive
    objective: ResearchObjective;
    evidenceLedger?: EvidencePointer[];
    insightHierarchy?: Partial<InsightHierarchy>;
    artifactPayload?: unknown;
    renderPlan?: Partial<RenderPlan>;
    trace?: RunTrace;
    shadowMode?: boolean;
}

const EMPTY_HIERARCHY: InsightHierarchy = {
    situation: [], complication: [], rootCauses: [], implications: [], strategicChoices: [],
};

/** Build an ArtifactAIR. artifactType is resolved from the trigger via the catalog (none omitted). */
export function buildAir(input: BuildAirInput): { air: ArtifactAIR; entry: ArtifactCatalogEntry | null } {
    const entry = catalogEntryFor(input.trigger);
    const trace = input.trace || newRunTrace(input.runId);
    const air: ArtifactAIR = {
        airVersion: AIR_VERSION,
        runId: input.runId,
        artifactId: input.artifactId,
        artifactType: entry ? entry.id : String(input.trigger || '').toLowerCase().replace(/^#/, '').trim(),
        trigger: input.trigger,
        objective: input.objective,
        evidenceLedger: input.evidenceLedger || [],
        insightHierarchy: { ...EMPTY_HIERARCHY, ...(input.insightHierarchy || {}) },
        artifactPayload: input.artifactPayload ?? null,
        renderPlan: {
            targetModes: input.renderPlan?.targetModes || [],
            templateCandidates: input.renderPlan?.templateCandidates || (entry?.templateId ? [entry.templateId] : []),
            imageSlots: input.renderPlan?.imageSlots || [],
            density: input.renderPlan?.density || 'base',
        },
        modelTrace: trace.modelSteps,
        toolTrace: trace.toolSteps,
        qualityReport: {
            shadowMode: input.shadowMode !== false,
            deterministicFailures: [],
            reviewScores: {},
            promotedToSkillOpt: false,
        },
    };
    return { air, entry };
}

export interface AirValidationResult {
    ok: boolean;
    /** hard, structural contract violations — block once shadowMode is false. */
    failures: string[];
    /** quality signals (e.g. evidence source-lag) — reported, never block. */
    warnings: string[];
    /** fraction of evidence pointers that are well-formed (0..1); 1 when the ledger is empty. */
    wellFormedRatio: number;
    /** in shadow mode failures are reported but ok stays true so the path does not block pre-migration. */
    shadowMode: boolean;
}

/** D12 (2026-07-01): the evidence grounding-collapse FLOOR. Pointer well-formedness is a RATIO, not an
 *  all-or-nothing block: pre-migration corpus pages legitimately carry chunks without structured `sources:`
 *  frontmatter, so requiring 100% well-formed is unrealizable until the D3 corpus re-chunk. Blocking below
 *  this floor catches a genuine grounding collapse (retrieval attached almost no named sources) while letting
 *  a legitimately-grounded pre-migration run pass. RAISE toward ~0.9 once the D3 re-chunk populates sources. */
export const MIN_WELLFORMED_RATIO = 0.10;

/**
 * Validate an AIR against the contract (the TS-side mirror of the air_schema_integrity gate check).
 * Two tiers: STRUCTURAL failures (airVersion / ids / catalog / objective) always block when not shadow;
 * evidence well-formedness is a RATIO — it blocks only below MIN_WELLFORMED_RATIO (grounding collapse) and
 * is otherwise a warning. In shadow mode nothing blocks (ok=true) so a path can ramp before it flips.
 */
export function validateAir(air: ArtifactAIR): AirValidationResult {
    const failures: string[] = [];
    const warnings: string[] = [];
    const shadow = air.qualityReport?.shadowMode !== false;
    // STRUCTURAL contract — a real AIR always satisfies these; any violation blocks when not shadow.
    if (air.airVersion !== AIR_VERSION) failures.push(`airVersion mismatch: ${air.airVersion}`);
    if (!air.runId) failures.push('missing runId');
    if (!air.artifactId) failures.push('missing artifactId');
    if (!catalogEntryFor(air.trigger) && !catalogEntryFor(air.artifactType)) {
        failures.push(`artifactType/trigger not in catalog: ${air.artifactType} / ${air.trigger}`);
    }
    if (!air.objective || !air.objective.userObjective) failures.push('missing objective.userObjective');
    // EVIDENCE well-formedness (anti-RAG provenance) as a RATIO — see MIN_WELLFORMED_RATIO.
    const ledger = air.evidenceLedger || [];
    const badPointers = ledger.filter(p => !isWellFormedPointer(p));
    const wellFormedRatio = ledger.length ? (ledger.length - badPointers.length) / ledger.length : 1;
    if (ledger.length > 0 && wellFormedRatio < MIN_WELLFORMED_RATIO) {
        failures.push(`evidence grounding collapse: ${Math.round(wellFormedRatio * 100)}% well-formed (${badPointers.length}/${ledger.length} pointers not well-formed; floor ${Math.round(MIN_WELLFORMED_RATIO * 100)}%)`);
    } else if (badPointers.length > 0) {
        warnings.push(`${badPointers.length}/${ledger.length} evidence pointer(s) not well-formed (no named source: pre-migration source-lag)`);
    }
    return { ok: shadow ? true : failures.length === 0, failures, warnings, wellFormedRatio, shadowMode: shadow };
}

const PROXY_BASE = 'http://127.0.0.1:5012';

/** Persist an AIR via the proxy. Degrades gracefully (persisted:false) if the endpoint is absent, so this
 *  never breaks a build before POST /api/air/write ships. The proxy writes to sessions/<runId>/artifacts/. */
export async function writeAir(air: ArtifactAIR, proxyBase: string = PROXY_BASE): Promise<{ persisted: boolean; path?: string; error?: string }> {
    try {
        const resp = await fetch(`${proxyBase}/api/air/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId: air.runId, artifactId: air.artifactId, air }),
        });
        if (!resp.ok) return { persisted: false, error: `HTTP ${resp.status}` };
        const data = await resp.json().catch(() => ({}));
        return { persisted: true, path: (data as any)?.path };
    } catch (e: any) {
        return { persisted: false, error: e?.message || 'air write failed' };
    }
}
