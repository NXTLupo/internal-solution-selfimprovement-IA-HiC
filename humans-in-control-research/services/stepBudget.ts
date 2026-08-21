/**
 * DF-C2 - STEP-OUTPUT BUDGET WITH TYPED SYNOPSIS
 * (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * deer-flow writes any oversized step result to its sandbox filesystem and puts a
 * TYPED synopsis plus a pointer in the prompt instead. Two details in that design
 * are the whole value, and both were copied deliberately:
 *
 *  1. The synopsis is TYPED. "[truncated]" tells the model nothing it can act on.
 *     A synopsis that says "42 article bodies, 380KB, 12 shown, fetch the rest at
 *     <pointer>" lets the model decide whether it needs more, and lets a human
 *     reading the log know what the model was actually shown.
 *  2. The offload directory is EXCLUDED from the artifact scanner. deer-flow is
 *     explicit that process feedback must never be mistaken for a deliverable.
 *     HiC has the same hazard: `hic-workspace/sessions/<slug>/artifacts/` is
 *     walked by `check-content.mjs` and by the session restore path, and a step
 *     dump landing there would be graded as a shipped deck.
 *
 * Why HiC needs this at all: the wiki article pre-fetch already hard-codes a
 * 48,000 / 200,000 character cap and simply DROPS the remainder mid-sentence, with
 * no record of how much was lost. The corpus block is assembled the same way. When
 * a deck is thin, there is currently no way to tell whether the corpus was thin or
 * the corpus was truncated.
 */

const PROXY_BASE = (import.meta as any)?.env?.VITE_PROXY_BASE || 'http://127.0.0.1:5012';

/** Default ceiling per step result, in characters. Chosen to match the existing
 *  artifact-path article cap so behavior does not change for a normal turn. */
export const STEP_BUDGET_CHARS = 48_000;

/** The offload directory, relative to the session. NEVER under `artifacts/`. */
export const STEP_RESULTS_DIR = '.step-results';

/**
 * Directory names the artifact scanners must skip. Exported so the scanner and
 * this module cannot disagree about which paths are process feedback.
 */
export const SCANNER_EXCLUDED_DIRS: readonly string[] = [STEP_RESULTS_DIR];

export function isProcessFeedbackPath(path: string): boolean {
    const p = String(path || '').replace(/\\/g, '/');
    return SCANNER_EXCLUDED_DIRS.some(d => p.includes(`/${d}/`) || p.startsWith(`${d}/`));
}

export type ElidedKind = 'article_bodies' | 'chunk_corpus' | 'search_results' | 'table_rows' | 'transcript' | 'text';

export interface StepSynopsis {
    /** What kind of thing was elided. The model branches on this. */
    kind: ElidedKind;
    /** How many discrete items the full result held, when countable. */
    itemsTotal: number | null;
    itemsShown: number | null;
    charsTotal: number;
    charsShown: number;
    /** Where the full result lives, when it was persisted. */
    pointer: string | null;
    /** One line, model-facing. Never parsed. */
    note: string;
}

export interface BudgetedResult {
    /** The text to put in the prompt. */
    text: string;
    /** null when the result fitted inside the budget. */
    synopsis: StepSynopsis | null;
    withinBudget: boolean;
}

const KIND_LABEL: Record<ElidedKind, string> = {
    article_bodies: 'article bodies',
    chunk_corpus: 'corpus chunks',
    search_results: 'search results',
    table_rows: 'table rows',
    transcript: 'transcript segments',
    text: 'characters of text',
};

/**
 * Split on a real boundary rather than mid-word. `separator` is the delimiter the
 * caller used to join its items, so the kept portion is a whole number of items
 * and `itemsShown` is a true count rather than an estimate.
 */
function truncateOnBoundary(text: string, budget: number, separator: string): { kept: string; itemsShown: number | null } {
    if (!separator) {
        const cut = text.lastIndexOf(' ', budget);
        return { kept: text.slice(0, cut > budget * 0.8 ? cut : budget), itemsShown: null };
    }
    const parts = text.split(separator);
    const kept: string[] = [];
    let used = 0;
    for (const p of parts) {
        const cost = p.length + separator.length;
        if (used + cost > budget) break;
        kept.push(p);
        used += cost;
    }
    // Never return nothing: one oversized item is better than an empty block, and
    // the synopsis will say it was cut.
    if (!kept.length && parts.length) {
        return { kept: parts[0].slice(0, budget), itemsShown: 1 };
    }
    return { kept: kept.join(separator), itemsShown: kept.length };
}

export interface BudgetOptions {
    kind: ElidedKind;
    /** Total discrete items in the full result, when the caller knows it. */
    itemsTotal?: number | null;
    /** The delimiter the caller joined items with, so the cut lands cleanly. */
    separator?: string;
    budget?: number;
    /** Session slug: when present the full result is persisted and pointed at. */
    engagementSlug?: string;
    stepId?: string;
}

/**
 * Apply the budget. Synchronous and pure: persistence is a separate, awaited call
 * so a slow proxy can never delay prompt assembly.
 */
export function applyStepBudget(fullText: string, opts: BudgetOptions): BudgetedResult {
    const text = String(fullText || '');
    const budget = opts.budget ?? STEP_BUDGET_CHARS;
    if (text.length <= budget) {
        return { text, synopsis: null, withinBudget: true };
    }
    const { kept, itemsShown } = truncateOnBoundary(text, budget, opts.separator || '');
    const itemsTotal = opts.itemsTotal ?? null;
    const label = KIND_LABEL[opts.kind];
    const countPart = itemsTotal !== null && itemsShown !== null
        ? `${itemsShown} of ${itemsTotal} ${label} shown`
        : `${Math.round(kept.length / 1024)}KB of ${Math.round(text.length / 1024)}KB shown`;
    const synopsis: StepSynopsis = {
        kind: opts.kind,
        itemsTotal,
        itemsShown,
        charsTotal: text.length,
        charsShown: kept.length,
        pointer: null,
        note: `${countPart}. The remainder was elided to fit the step budget, not because it was irrelevant.`,
    };
    return { text: kept, synopsis, withinBudget: false };
}

/**
 * The block that replaces the elided remainder in the prompt. The model must know
 * that what it holds is a SAMPLE, or it will treat absence of evidence as evidence
 * of absence, which on this project reads as a confident thin deck.
 */
export function renderSynopsis(synopsis: StepSynopsis | null): string {
    if (!synopsis) return '';
    const lines = [
        '',
        `=== ELIDED: ${KIND_LABEL[synopsis.kind].toUpperCase()} ===`,
        synopsis.note,
    ];
    if (synopsis.pointer) lines.push(`Full result: ${synopsis.pointer}`);
    lines.push('Treat this as a sample. Do not conclude that a topic is absent from the corpus because it');
    lines.push('does not appear above.');
    return lines.join('\n');
}

/**
 * Persist the full result under `<slug>/.step-results/` and return the pointer.
 * Fire-and-forget from the caller's perspective: a failure here costs the pointer,
 * never the turn.
 */
export async function persistStepResult(
    fullText: string,
    opts: { engagementSlug: string; stepId: string; kind: ElidedKind },
): Promise<string | null> {
    if (!opts.engagementSlug || !fullText) return null;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/step-result/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: opts.engagementSlug,
                step_id: opts.stepId,
                kind: opts.kind,
                content: fullText,
            }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return typeof data?.pointer === 'string' ? data.pointer : null;
    } catch {
        return null;
    }
}

/**
 * Convenience: budget, then persist and attach the pointer if the result spilled.
 * The prompt text is available synchronously from `applyStepBudget`; this is for
 * callers that can await.
 */
export async function budgetAndPersist(
    fullText: string,
    opts: BudgetOptions & { engagementSlug?: string; stepId?: string },
): Promise<BudgetedResult> {
    const result = applyStepBudget(fullText, opts);
    if (result.synopsis && opts.engagementSlug && opts.stepId) {
        const pointer = await persistStepResult(fullText, {
            engagementSlug: opts.engagementSlug,
            stepId: opts.stepId,
            kind: opts.kind,
        });
        if (pointer) result.synopsis.pointer = pointer;
    }
    return result;
}
