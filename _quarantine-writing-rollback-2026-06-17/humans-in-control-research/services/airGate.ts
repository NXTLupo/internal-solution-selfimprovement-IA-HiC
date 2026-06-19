// AIR runtime client (2026-06-16). The generation loop emits an Artifact Intermediate
// Representation (AIR) BEFORE slides, then calls gateAir() to objective-gate + score it. A gate
// failure triggers a bounded re-ask (Reinforcement Inference) before rendering. Gate logic is
// CANONICAL in the proxy (proxy/air_gate.py via POST /api/ai/air-gate) so there is no TS/Python
// drift - this module is a thin client, exactly like the headless render gate. See
// .claude/skills/_shared/air.schema.json + air-authoring-contract.md + plans/air-authoring-contract-2026-06-16.md.

const PROXY_BASE = 'http://127.0.0.1:5012';

export type AirSourceType = 'external_research' | 'client_interview' | 'client_document' | 'social' | 'benchmark';

export interface AirEvidence {
    claim_id: string;
    statement: string;
    source_name: string;
    source_type: AirSourceType;
    kind: 'observed' | 'inference';
    verbatim_quote?: string;
    confidence?: 'high' | 'medium' | 'low';
    date?: string;
    validates_with?: string;
}

export interface AirRenderSlide {
    slide_id: string;
    slide_role: string;       // maps to a registered SlideTemplate + the Figma COMPONENT REGISTRY
    title: string;            // a conclusion, not a topic
    claim_ids: string[];
    visual_intent?: string;
    template_constraints?: string;
}

export interface AIR {
    brief: {
        artifact_type: string;
        hashtag?: string;
        brand?: 'NXT' | 'NU';
        audience: string;
        business_question: string;
        decision_supported: string;
    };
    evidence_ledger: AirEvidence[];
    insight_hierarchy: {
        situation: string;
        complication: string;
        root_cause: string;
        strategic_choice: string;
        implication: string;
        moves?: string[];
    };
    artifact_payload: Record<string, any>;
    render_plan: { brand?: 'NXT' | 'NU'; density?: 'base' | 'dense'; slides?: AirRenderSlide[] };
    quality_report?: Record<string, any>;
}

export interface AirGateResult {
    gate: { status: 'pass' | 'fail'; errors: string[] };
    score: {
        evidence_count: number;
        external_evidence_pct: number;
        inference_labeled: number;
        slides: number;
        action_title_rate: number;
        topic_titles: number;
        missing_claim_links: number;
        repeated_role_runs: number;
        spine_complete: boolean;
        warnings: string[];
    };
    available: boolean;   // false if the proxy gate could not be reached (never blocks generation)
}

/**
 * Objective-gate + score an AIR via the canonical proxy endpoint. NEVER throws and NEVER blocks
 * generation on transport failure - returns available:false so the caller proceeds (the gate is a
 * quality lever, not a single point of failure). A gate.status of 'fail' means the caller should
 * re-ask the generating model with gate.errors as the concrete fix list (Reinforcement Inference).
 */
export async function gateAir(air: AIR | Record<string, any>): Promise<AirGateResult> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/air-gate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ air }),
        });
        if (!resp.ok) {
            return { gate: { status: 'pass', errors: [] }, score: {} as any, available: false };
        }
        const data = await resp.json();
        return { gate: data.gate, score: data.score, available: true };
    } catch {
        return { gate: { status: 'pass', errors: [] }, score: {} as any, available: false };
    }
}

/** Build the re-ask note from gate errors (Reinforcement Inference repair prompt). */
export function airRepairNote(result: AirGateResult): string {
    const errs = result.gate?.errors || [];
    if (!errs.length) return '';
    return (
        'Your AIR failed the objective quality gate. Fix EXACTLY these defects and re-emit the ' +
        'COMPLETE corrected AIR (every required field; never a fragment):\n- ' + errs.join('\n- ')
    );
}
