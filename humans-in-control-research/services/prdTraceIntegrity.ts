// services/prdTraceIntegrity.ts - 2026-10-01 (plan Stage 3.7 / audit C6)
//
// The deterministic half of the PRD rubric (hic-workspace/wiki/eval/rubrics/prd-rubric.json,
// item 6 "requirements_trace"). Pure function, no model call: every requirement R must trace to
// at least one persona P or competitive gap CG; every open question Q must trace to at least one
// source S. When the PRD lists its personas, gaps or sources, a reference to an id that is not in
// that list is a dangling pointer and counts against the requirement or question the same way an
// empty trace does.
//
// Operates on a PrdAir-shaped object (services/prdAir.ts does not exist yet; the shape is typed
// structurally here so the check keeps working when PrdAir lands). The legacy `PRD` type
// (types.ts: features[] with citations) is adapted so the panel can score today's #prd output
// honestly: a legacy feature has no persona or gap trace, so it is an orphan until the producer
// emits one.

export interface PrdRequirementTrace {
    personaIds?: string[];
    competitiveGapIds?: string[];
    /** Accepted aliases some producers use; folded into the two trace families above. */
    personas?: string[];
    gaps?: string[];
    competitiveGaps?: string[];
}

export interface PrdRequirementLike {
    id?: string;
    title?: string;
    name?: string;
    trace?: PrdRequirementTrace;
    personaIds?: string[];
    competitiveGapIds?: string[];
}

export interface PrdQuestionLike {
    id?: string;
    text?: string;
    question?: string;
    sourceIds?: string[];
    sources?: string[];
}

export interface PrdAirLike {
    requirements?: PrdRequirementLike[];
    questions?: PrdQuestionLike[];
    openQuestions?: PrdQuestionLike[];
    personas?: Array<{ id?: string } | string>;
    competitiveGaps?: Array<{ id?: string } | string>;
    sources?: Array<{ id?: string; sourceId?: string } | string>;
}

export interface PrdTraceIntegrityResult {
    ok: boolean;
    requirementCount: number;
    questionCount: number;
    /** Requirement ids (or ordinal labels) with neither a persona nor a competitive-gap trace. */
    orphanRequirements: string[];
    /** Requirement ids whose every trace id points at a persona or gap the PRD does not list. */
    danglingRequirements: string[];
    /** Question ids with no source trace. */
    unsourcedQuestions: string[];
    /** Question ids whose every source id points at a source the PRD does not list. */
    danglingQuestions: string[];
    /** Rubric item 6 score: 5 complete, 3 partially traced, 1 absent or untraced. */
    score: 1 | 2 | 3 | 4 | 5;
    summary: string;
}

const ids = (xs: unknown): string[] =>
    Array.isArray(xs) ? xs.map(x => String(x ?? '').trim()).filter(Boolean) : [];

const listedIds = (xs: unknown, extraKey?: string): Set<string> | null => {
    if (!Array.isArray(xs) || xs.length === 0) return null;
    const out = new Set<string>();
    for (const x of xs) {
        if (typeof x === 'string') { if (x.trim()) out.add(x.trim()); continue; }
        if (x && typeof x === 'object') {
            const o = x as Record<string, unknown>;
            const v = o.id ?? (extraKey ? o[extraKey] : undefined);
            if (v !== undefined && v !== null && String(v).trim()) out.add(String(v).trim());
        }
    }
    return out.size ? out : null;
};

function requirementTraceIds(r: PrdRequirementLike): { personas: string[]; gaps: string[] } {
    const t = r.trace || {};
    return {
        personas: [...ids(t.personaIds), ...ids(t.personas), ...ids(r.personaIds)],
        gaps: [...ids(t.competitiveGapIds), ...ids(t.gaps), ...ids(t.competitiveGaps), ...ids(r.competitiveGapIds)],
    };
}

/**
 * Accept either a PrdAir-shaped object, a legacy `PRD` (features[]), or a `{ prd }` wrapper
 * (StepResult_PRD) and return the PrdAir-shaped view the check operates on.
 */
export function toPrdAirLike(input: unknown): PrdAirLike {
    if (!input || typeof input !== 'object') return {};
    const o = input as Record<string, any>;
    if (o.prd && typeof o.prd === 'object' && !Array.isArray(o.requirements)) return toPrdAirLike(o.prd);
    // services/prdAir.ts (PrdAir.graph): R carries personaIds / competitiveGapIds flat; Q is a
    // verbatim quote with exactly one sourceId; S, PE and CG are listed on the graph.
    if (o.graph && typeof o.graph === 'object' && Array.isArray(o.graph.requirements)) {
        const g = o.graph as Record<string, any>;
        return {
            requirements: g.requirements,
            questions: Array.isArray(g.quotes)
                ? g.quotes.map((q: any, i: number) => ({
                    id: String(q?.id || `Q${i + 1}`),
                    text: q?.text,
                    sourceIds: q?.sourceId ? [String(q.sourceId)] : ids(q?.sourceIds),
                }))
                : [],
            personas: g.personas,
            competitiveGaps: g.competitiveGaps,
            sources: g.sources,
        };
    }
    if (Array.isArray(o.requirements)) return o as PrdAirLike;
    if (Array.isArray(o.features)) {
        return {
            requirements: o.features.map((f: any, i: number) => ({
                id: String(f?.id || `F${i + 1}`),
                title: f?.name,
                trace: f?.trace,
                personaIds: f?.personaIds,
                competitiveGapIds: f?.competitiveGapIds,
            })),
            questions: o.questions || o.openQuestions,
            personas: o.personas,
            competitiveGaps: o.competitiveGaps,
            sources: o.sources,
        };
    }
    return o as PrdAirLike;
}

/** Deterministic PRD trace-integrity check. Pure; never throws on odd shapes. */
export function checkPrdTraceIntegrity(input: unknown): PrdTraceIntegrityResult {
    const prd = toPrdAirLike(input);
    const reqs = Array.isArray(prd.requirements) ? prd.requirements : [];
    const qs = Array.isArray(prd.questions) ? prd.questions
        : Array.isArray(prd.openQuestions) ? prd.openQuestions : [];
    const personaSet = listedIds(prd.personas);
    const gapSet = listedIds(prd.competitiveGaps);
    const sourceSet = listedIds(prd.sources, 'sourceId');

    const orphanRequirements: string[] = [];
    const danglingRequirements: string[] = [];
    reqs.forEach((r, i) => {
        const label = String(r?.id || r?.title || r?.name || `R${i + 1}`);
        const { personas, gaps } = requirementTraceIds(r || {});
        if (personas.length === 0 && gaps.length === 0) { orphanRequirements.push(label); return; }
        const livePersona = personas.some(p => !personaSet || personaSet.has(p));
        const liveGap = gaps.some(g => !gapSet || gapSet.has(g));
        if (!livePersona && !liveGap) danglingRequirements.push(label);
    });

    const unsourcedQuestions: string[] = [];
    const danglingQuestions: string[] = [];
    qs.forEach((q, i) => {
        const label = String(q?.id || `Q${i + 1}`);
        const srcs = [...ids(q?.sourceIds), ...ids(q?.sources)];
        if (srcs.length === 0) { unsourcedQuestions.push(label); return; }
        if (sourceSet && !srcs.some(s => sourceSet.has(s))) danglingQuestions.push(label);
    });

    const badReq = orphanRequirements.length + danglingRequirements.length;
    const badQ = unsourcedQuestions.length + danglingQuestions.length;
    const ok = reqs.length > 0 && badReq === 0 && badQ === 0;

    let score: PrdTraceIntegrityResult['score'];
    if (reqs.length === 0) score = 1;
    else {
        const reqShare = badReq / reqs.length;
        const qShare = qs.length ? badQ / qs.length : 0;
        const worst = Math.max(reqShare, qShare);
        score = worst === 0 ? 5 : worst <= 0.1 ? 4 : worst <= 0.34 ? 3 : worst <= 0.67 ? 2 : 1;
    }

    const parts: string[] = [];
    parts.push(`${reqs.length} requirement(s)`);
    if (orphanRequirements.length) parts.push(`${orphanRequirements.length} without a persona or gap trace (${orphanRequirements.slice(0, 5).join(', ')})`);
    if (danglingRequirements.length) parts.push(`${danglingRequirements.length} tracing only to unlisted ids (${danglingRequirements.slice(0, 5).join(', ')})`);
    parts.push(`${qs.length} open question(s)`);
    if (unsourcedQuestions.length) parts.push(`${unsourcedQuestions.length} without a source (${unsourcedQuestions.slice(0, 5).join(', ')})`);
    if (danglingQuestions.length) parts.push(`${danglingQuestions.length} citing unlisted sources (${danglingQuestions.slice(0, 5).join(', ')})`);

    return {
        ok, requirementCount: reqs.length, questionCount: qs.length,
        orphanRequirements, danglingRequirements, unsourcedQuestions, danglingQuestions,
        score,
        summary: `${ok ? 'trace complete' : 'trace incomplete'}: ${parts.join('; ')}`,
    };
}
