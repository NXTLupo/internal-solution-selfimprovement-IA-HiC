// chatInsightMemory.ts - WS-6 M2 (2026-10-30, plan harness-capability-curve-uplift); moved onto the ONE memory door
// in WS-B B1 (2026-10-31, plan agent-stack-shared-memory-skills-uplift).
//
// Curated memory in place of verbatim appends. An analyst-chat insight becomes ONE typed fact (category knowledge,
// scope engagement, durable, descriptive) built from the question and the answer's lead, and is admitted through
// the proxy's /api/memory/admit: the proxy redacts person names unless the engagement's retention flag keeps them,
// runs the admission gate (confidence floor, dedupe with provenance union, capacity eviction) under the store lock,
// and stamps the engagement. Every other agent recalls the same fact through /api/memory/recall. Forgetting goes
// through /api/memory/forget. The SPA no longer reads, redacts or rewrites the store itself.

import { memoryAdmit, memoryForget, type ProposedFact } from './memoryLifecycle';

/** The first sentences of an answer, under a budget, as the fact's substance. */
export function leadOf(answer: string, maxChars = 420): string {
    const flat = String(answer || '').replace(/\s+/g, ' ').trim();
    if (flat.length <= maxChars) return flat;
    const cut = flat.slice(0, maxChars);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
    return (end > maxChars * 0.5 ? cut.slice(0, end + 1) : cut).trim();
}

export interface AdmitInsightInput {
    question: string;
    answer: string;
    runId: string;
    engagement: string;
    /** Override the engagement flag (tests, explicit owner choice). Unset: the proxy reads the flag. */
    retainNames?: boolean;
}

export interface AdmitInsightResult {
    admitted: boolean;
    reason?: string;
    factId?: string;
    redacted?: number;
    total?: number;
    evicted?: number;
}

/** The fact a chat insight proposes. Exported for tests and for the other admission points (B3). */
export function insightFact(question: string, answer: string): ProposedFact | null {
    const q = String(question || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const lead = leadOf(answer);
    if (!q || lead.length < 80) return null;
    return {
        content: `Q: ${q} / A: ${lead}`, category: 'knowledge', confidence: 0.75, scope: 'engagement',
        durability: 'durable', authority: 'descriptive', expectedValidDays: 180,
    };
}

/**
 * Admit one chat insight. Returns what happened; never throws into the chat path.
 */
export async function admitChatInsight(input: AdmitInsightInput, fetchImpl: typeof fetch = globalThis.fetch): Promise<AdmitInsightResult> {
    try {
        const proposed = insightFact(input.question, input.answer);
        if (!proposed) return { admitted: false, reason: 'too short to be a fact' };
        const res = await memoryAdmit([proposed], input.runId, { engagement: input.engagement, retainNames: input.retainNames, surface: 'spa' }, fetchImpl);
        if (!res.ok) return { admitted: false, reason: `store unavailable: ${res.error || 'admit failed'}` };
        if (!res.report?.admitted) return { admitted: false, reason: res.report?.refusals?.[0] || 'not admitted', redacted: res.redacted };
        return { admitted: true, factId: res.admitted_ids?.[0], redacted: res.redacted, total: res.total, evicted: res.report.evicted };
    } catch (e: any) {
        return { admitted: false, reason: String(e?.message || e).slice(0, 120) };
    }
}

/** The forgetting path: drop facts by id, by text, or by engagement. Returns the ids removed. */
export async function forgetFacts(sel: { ids?: string[]; contains?: string; engagement?: string }, fetchImpl: typeof fetch = globalThis.fetch): Promise<{ removed: string[]; total: number; error?: string }> {
    if (!sel.ids?.length && !sel.contains && !sel.engagement) return { removed: [], total: 0, error: 'ids, contains or engagement required' };
    return memoryForget(sel, fetchImpl);
}

/** Forget every fact a run family or engagement produced (the S10 delete path). */
export async function forgetEngagementFacts(runIdPrefix: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<{ removed: string[]; total: number; error?: string }> {
    const p = String(runIdPrefix || '').trim();
    if (!p) return { removed: [], total: 0, error: 'engagement required' };
    return memoryForget({ engagement: p }, fetchImpl);
}
