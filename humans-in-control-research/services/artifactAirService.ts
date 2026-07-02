/**
 * ARTIFACT AIR — the canonical Artifact Intermediate Representation (WS-0, the backbone).
 * Every research run and every hashtag artifact emits an ArtifactAIR BEFORE any final prose, slide, HTML,
 * image, or PPTX render. AIR is the shared contract across ingestion, retrieval, both chat desks, artifacts,
 * routing, imagery, Figma filling, PPTX export, QA, and self-improvement. It CONVERGES today's scattered
 * structures (GenerationReceipt, epoch traces, registry.json, the manifest) into one IR; it is not a parallel
 * store. Renderers consume AIR; none renders from raw model prose (enforced by air_schema_integrity, ramped
 * shadow -> blocking per path through Stage 3).
 *
 * Plan: plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md (WS-0). Persistence is via the proxy
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

// W4 (2026-07-01, scorecard "renderPlan empty"): derive the render plan FROM THE CATALOG when the caller
// does not supply one. The catalog already declares each artifact's modality/editability/image-bearing
// contract; an empty targetModes/imageSlots was a mapping gap, not missing information (converge, no fork).
const _DIAGRAM_TEMPLATES = new Set(['journey-map', 'architecture-map', 'service-blueprint']);
const _DIAGRAM_IDS = new Set(['journey', 'arch', 'blueprint', 'mindmap']);
function deriveTargetModes(entry: ArtifactCatalogEntry | null): RenderPlan['targetModes'] {
    if (!entry) return ['analyst'];
    switch (entry.modality) {
        case 'slides':
        case 'multi': return ['analyst', 'pptx'];
        case 'html': return ['analyst', 'html'];
        case 'figma_spec': return ['figma'];
        case 'external_render': return ['html'];
        case 'image': return ['analyst'];
        case 'analysis':
        default: return ['analyst'];
    }
}
function deriveImageSlots(entry: ArtifactCatalogEntry | null): ImageSlotDecision[] {
    if (!entry) return [{ slotId: 'canvas', mode: 'none', wired: true }];
    const slots: ImageSlotDecision[] = [];
    if ((entry.templateId && _DIAGRAM_TEMPLATES.has(entry.templateId)) || _DIAGRAM_IDS.has(entry.id)) {
        // D17: journeys/arch/blueprints/mindmaps render as a full-bleed native GOLD exhibit image
        // (HTML/CSS from brand tokens -> headless Chromium via /api/ai/diagram), never diffusion image-gen.
        slots.push({
            slotId: 'exhibit:full-bleed-diagram',
            templateId: entry.templateId || undefined,
            mode: 'diagram',
            modelTier: 'native_render_chromium',
            promptSource: 'evidence_ledger',
            wired: true,
            altText: `${entry.id} exhibit composed from brand tokens + slide data (D17 native render)`,
        });
    }
    if (entry.imageBearing) {
        slots.push({
            slotId: 'element-imagery',
            templateId: entry.templateId || undefined,
            mode: 'brand_image',
            promptSource: 'air_insight',
            wired: true,
        });
    }
    if (slots.length === 0) {
        // Deliberately image-free layout - recorded, never silently unfilled (phase 8).
        slots.push({ slotId: 'canvas', templateId: entry.templateId || undefined, mode: 'none', wired: true });
    }
    return slots;
}

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
            targetModes: input.renderPlan?.targetModes?.length ? input.renderPlan.targetModes : deriveTargetModes(entry),
            templateCandidates: input.renderPlan?.templateCandidates || (entry?.templateId ? [entry.templateId] : []),
            imageSlots: input.renderPlan?.imageSlots?.length ? input.renderPlan.imageSlots : deriveImageSlots(entry),
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
// W5 (2026-07-01, scorecard "36 generic citations"): provider-bucket citations in the RENDERED PAYLOAD
// are an objective credibility defect - "(Source: Gemini Focused Research)" leaks model provenance as if
// it were a source. Mirrors .claude/hooks/checks/citation_resolution.py (keep in sync).
const PAYLOAD_BUCKET_CITATION_RE = /\(\s*sources?\s*:\s*(gemini|openai|deepseek|anthropic|claude|gpt)\b[^)]*\)|gemini\s*\(\s*focused\s+research\s*\)|\bsource\s*:\s*(gemini|openai|deepseek)\b/gi;
// W8: naked quantitative claims OUTSIDE double-quoted verbatim quotes (the #1 AI-slop tell per
// .claude/CLAUDE.md Quantitative Claim Rule). Heuristic count, surfaced as a review score, never a block.
function countNakedNumbers(text: string): number {
    if (!text) return 0;
    // strip double-quoted spans (a number inside a verbatim quote is allowed)
    const outsideQuotes = text.replace(/"[^"]{10,400}"/g, ' ');
    const m = outsideQuotes.match(/\b\d+(?:\.\d+)?\s*%|\$\s?\d[\d,.]*(?:\s?[KMB]\b|billion|million)?/gi);
    return m ? m.length : 0;
}

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
    // W5: provider-bucket citations in the payload are a CONTRACT failure (objective defect - blocks
    // when the path is non-shadow). The real source must come from the chunk/page attribution ladder.
    let payloadText = '';
    try { payloadText = typeof air.artifactPayload === 'string' ? air.artifactPayload : JSON.stringify(air.artifactPayload || ''); } catch { /* non-serializable payload */ }
    if (payloadText) {
        const buckets = payloadText.match(PAYLOAD_BUCKET_CITATION_RE);
        if (buckets && buckets.length) {
            failures.push(`${buckets.length} provider-bucket citation(s) in payload (e.g. ${String(buckets[0]).slice(0, 60)}) - resolve to the REAL source, never a model/provider label`);
        }
        // W8: naked-number review signal (Quantitative Claim Rule). Reported, never blocks.
        const naked = countNakedNumbers(payloadText);
        if (air.qualityReport) air.qualityReport.reviewScores['naked_numbers_outside_quotes'] = naked;
        if (naked > 0) warnings.push(`${naked} naked quantitative claim(s) outside verbatim quotes (Quantitative Claim Rule review signal)`);
    }
    // W2/W3 observability: an empty modelTrace or undecomposed objective is a hydration gap the
    // scorecard flagged - surface it every run so it can never be silently absent again.
    if (!air.modelTrace || air.modelTrace.length === 0) warnings.push('modelTrace empty: no routed model/reason recorded for this artifact');
    if (!air.objective?.decomposedQuestions || air.objective.decomposedQuestions.length === 0) warnings.push('objective.decomposedQuestions empty: sub-question coverage not recorded');
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
