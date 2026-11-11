// judgeRegistry.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-2 E5/E6)
//
// THE registry of every verifier that judges HiC output. The two talks agree on the rule
// this file enforces: choose and validate the judge BEFORE a loop depends on it. A judge
// that has never been compared with a human may REPORT, but it may not BLOCK a ship or
// drive self-improvement. Deterministic checkers encode a rule and may block; LLM judges
// earn blocking rights through measured agreement with human labels.
//
// The registry lives in evals/judges.json (served by the proxy at /api/eval/judges and
// updated by the nightly agreement job). This module carries the embedded defaults so a
// test or a cold start never lacks a registry, and the two must agree
// (`scripts/check-judges.mjs` verifies).

import { getRun, recordVerdict as runRecordVerdict } from './runState';
import { proxyBase } from './proxyConfig';

export type JudgeKind = 'deterministic' | 'llm' | 'human';

export interface HumanAgreement {
    /** Labelled items the judge also judged. */
    n: number;
    /** Simple agreement rate, 0..1. */
    agreement: number;
    /** Cohen's kappa, -1..1. */
    kappa: number;
    last_calibrated: string;
}

export interface JudgeSpec {
    id: string;
    kind: JudgeKind;
    /** What the score measures, in words. */
    metric: string;
    /** Pass when score >= threshold (scores are 0..1). */
    threshold: number;
    /** Whether a failing verdict may stop a ship. Subject to `judgeMayBlock`. */
    blocking: boolean;
    version: string;
    rubric_ref?: string;
    description?: string;
    human_agreement?: HumanAgreement;
}

export const CALIBRATION_MIN_N = 30;
export const CALIBRATION_MIN_KAPPA = 0.4;

/** Embedded defaults. Mirror of evals/judges.json; the file wins when it loads. */
export const DEFAULT_JUDGES: JudgeSpec[] = [
    // artifact chain stages (services/artifactChain.ts), scored 0..1 by services/chainScores.ts
    { id: 'chain:normalize', kind: 'deterministic', metric: 'stage ran without error', threshold: 0.99, blocking: true, version: '1.0' },
    { id: 'chain:lexical', kind: 'deterministic', metric: '1 - banned-phrase sites per slide (cap 2/slide)', threshold: 0.9, blocking: true, version: '1.0' },
    { id: 'chain:titles', kind: 'deterministic', metric: 'share of titles passing the Partner Test heuristics', threshold: 0.8, blocking: true, version: '1.0' },
    { id: 'chain:bindPointers', kind: 'deterministic', metric: 'bound / (bound + unbound) factual fields', threshold: 0.6, blocking: false, version: '1.0', description: 'reports; binding is the runtime\'s job and a low ratio is a corpus signal, not a ship stop' },
    { id: 'chain:provenance', kind: 'deterministic', metric: 'stage ran; pointers resolved to real sources', threshold: 0.99, blocking: true, version: '1.0' },
    { id: 'chain:claims', kind: 'deterministic', metric: '1 - blocking claim findings / rows checked', threshold: 0.9, blocking: true, version: '1.0' },
    { id: 'chain:evidenceSlots', kind: 'deterministic', metric: 'P0 slot coverage (plan present) or 1 - violations/slots', threshold: 0.7, blocking: true, version: '1.0' },
    { id: 'chain:exhibits', kind: 'deterministic', metric: 'stage ran without error', threshold: 0.99, blocking: false, version: '1.0' },
    { id: 'chain:prose', kind: 'deterministic', metric: 'prose signal overall (actor rule, read-aloud, variety)', threshold: 0.7, blocking: true, version: '1.0' },
    { id: 'chain:grade', kind: 'deterministic', metric: '1 - (unverified + superficial) / claims', threshold: 0.8, blocking: true, version: '1.0' },
    { id: 'chain:renderPlan', kind: 'deterministic', metric: 'stage ran without error', threshold: 0.99, blocking: false, version: '1.0' },
    { id: 'chain:deckQuality', kind: 'deterministic', metric: '1 - layout findings / 5', threshold: 0.6, blocking: true, version: '1.0' },
    // other deterministic gates
    { id: 'deckPlanGate', kind: 'deterministic', metric: '1 - violations / slides', threshold: 0.8, blocking: true, version: '1.0' },
    { id: 'layoutGate', kind: 'deterministic', metric: '1 - slides with open overflow or overlap / slides', threshold: 0.9, blocking: true, version: '1.0' },
    { id: 'titleGate', kind: 'deterministic', metric: 'titles without a bare figure / titles', threshold: 0.99, blocking: true, version: '1.0' },
    // WS-4 (2026-10-30): the in-conversation deck loop's joined verdict (plan 0.3, layout 0.3, density 0.2, pointers 0.1, compose 0.1)
    { id: 'deckLoop.submit', kind: 'deterministic', metric: 'weighted join of plan, layout, density, pointer and compose checks on a submit_deck call', threshold: 0.9, blocking: true, version: '1.0', description: 'services/deckLoop.ts judgeDeck' },
    { id: 'slideVisionCritic', kind: 'llm', metric: 'accept rate of composed slides judged as a reader sees them', threshold: 0.7, blocking: false, version: '1.0', rubric_ref: 'proxy/app.py _SLIDE_CRITIC_RULES' },
    // LLM judges: report-only until calibrated against human labels (E5)
    { id: 'copyCritic', kind: 'llm', metric: 'copy-edit flags per field (rewrites applied only through the fact guard)', threshold: 0.8, blocking: false, version: '1.0', rubric_ref: 'services/copyCritic.ts' },
    { id: 'criticDispatcher.rubric', kind: 'llm', metric: 'rubric criteria scored 1-5; pass when none below floor', threshold: 0.6, blocking: false, version: '1.0', rubric_ref: 'hic-workspace/wiki/eval/rubrics/index.json' },
    { id: 'imageCritic', kind: 'llm', metric: 'accept rate of generated photographs', threshold: 0.5, blocking: false, version: '1.0', rubric_ref: 'proxy/app.py _CRITIC_RULES' },
    // human
    { id: 'human.slideApproval', kind: 'human', metric: 'Approve / Reject on the slide card', threshold: 1, blocking: false, version: '1.0' },
];

let _registry: Map<string, JudgeSpec> = new Map(DEFAULT_JUDGES.map(j => [j.id, j]));
let _loaded = false;

export function judgeMayBlock(spec: JudgeSpec | undefined): boolean {
    if (!spec || !spec.blocking) return false;
    if (spec.kind === 'deterministic') return true;
    const h = spec.human_agreement;
    return !!h && h.n >= CALIBRATION_MIN_N && h.kappa >= CALIBRATION_MIN_KAPPA;
}

export function getJudge(id: string): JudgeSpec | undefined {
    return _registry.get(id);
}

export function listJudges(): JudgeSpec[] {
    return Array.from(_registry.values());
}

export function thresholdFor(id: string, fallback = 0.8): number {
    const j = _registry.get(id);
    return typeof j?.threshold === 'number' ? j.threshold : fallback;
}

/** Load evals/judges.json through the proxy; defaults stay for anything the file lacks. */
export async function loadJudgeRegistry(fetchImpl: typeof fetch = globalThis.fetch): Promise<JudgeSpec[]> {
    try {
        const resp = await fetchImpl(`${proxyBase()}/api/eval/judges`, { cache: 'no-store' });
        if (resp.ok) {
            const j = await resp.json();
            const list: JudgeSpec[] = Array.isArray(j?.judges) ? j.judges : [];
            for (const spec of list) if (spec && spec.id) _registry.set(spec.id, { ..._registry.get(spec.id), ...spec });
            _loaded = true;
        }
    } catch (e: any) {
        console.warn('[judgeRegistry] registry unavailable; using embedded defaults:', e?.message || e);
    }
    return listJudges();
}

export function judgeRegistryLoaded(): boolean { return _loaded; }

export interface VerdictInput {
    judge_id: string;
    pass: boolean;
    score?: number;
    slide_id?: string;
    artifact_id?: string;
    detail?: string;
}

/** Record a verdict on the run AND in the eval store (so human labels can be joined to it later). */
export function recordJudgeVerdict(v: VerdictInput, fetchImpl: typeof fetch = globalThis.fetch): void {
    try { runRecordVerdict({ judge_id: v.judge_id, pass: v.pass, score: v.score, slide_id: v.slide_id, detail: v.detail }); } catch { /* never break the gate */ }
    if (typeof fetchImpl !== 'function') return;
    try {
        const run = getRun();
        const row = { ts: Date.now(), run_id: run.run_id, engagement: run.engagement, message_id: run.current_message_id, ...v };
        void fetchImpl(`${proxyBase()}/api/eval/verdicts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).catch(() => { /* fire-and-forget */ });
    } catch { /* never break the gate */ }
}

export interface HumanLabelInput {
    artifact_id?: string;
    /** 2026-11-11 (IA plan Phase 0): every id the label can be joined on (proxy/judge_agreement.py). */
    run_id?: string;
    message_id?: string;
    slide_id: string;
    label: 'approved' | 'rejected';
    source?: 'slide_card' | 'feedback_widget' | 'thumbs';
    /** The person's short reason, kept with the label so a judge's disagreement can be read, not only counted. */
    detail?: string;
}

/** Slide id for a label or verdict on the whole artifact. Mirrors proxy/judge_agreement.py WHOLE_ARTIFACT. */
export const WHOLE_ARTIFACT_SLIDE = '_artifact';

/** Record a human label (slide Approve/Reject). These calibrate every judge that judged the same slide. */
export function recordHumanLabel(l: HumanLabelInput, fetchImpl: typeof fetch = globalThis.fetch): void {
    try { runRecordVerdict({ judge_id: 'human.slideApproval', pass: l.label === 'approved', slide_id: l.slide_id, detail: l.source || 'slide_card' }); } catch { /* ignore */ }
    if (typeof fetchImpl !== 'function') return;
    try {
        const run = getRun();
        // The caller's run_id/message_id (the artifact's own) win over the ambient run's.
        const row = { ts: Date.now(), run_id: run.run_id, engagement: run.engagement, message_id: run.current_message_id, source: 'slide_card', ...l,
                      ...(l.detail ? { detail: l.detail.slice(0, 300) } : {}) };
        void fetchImpl(`${proxyBase()}/api/eval/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).catch(() => { /* fire-and-forget */ });
    } catch { /* ignore */ }
}

/** Cohen's kappa for two binary raters given a 2x2 confusion matrix. Exported for the proxy's twin to be tested against. */
export function cohensKappa(tp: number, fp: number, fn: number, tn: number): number {
    const n = tp + fp + fn + tn;
    if (n === 0) return 0;
    const po = (tp + tn) / n;
    const pYes = ((tp + fp) / n) * ((tp + fn) / n);
    const pNo = ((fn + tn) / n) * ((fp + tn) / n);
    const pe = pYes + pNo;
    if (pe >= 1) return 1;
    return (po - pe) / (1 - pe);
}

/** Test seam. */
export function _resetJudgeRegistryForTests(): void {
    _registry = new Map(DEFAULT_JUDGES.map(j => [j.id, j]));
    _loaded = false;
}
