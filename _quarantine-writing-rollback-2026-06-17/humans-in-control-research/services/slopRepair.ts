/**
 * Slop repair pass (2026-06-14, Anti-Slop Field Guide Stage 5 / Rules 95-96).
 *
 * The field guide's key finding: stripping/paraphrasing a slop-laden draft PRESERVES the
 * cadence and structural tells. The fix is ONE bounded "rewrite-from-source" pass that
 * lists the exact offending terms/patterns and asks the model to write a FRESH draft, then
 * keeps whichever of the two attempts scores lower. This is the reinforcement-inference
 * pattern (anchored re-ask) applied to writing quality - the lever that produces NOTICEABLE
 * improvement, not just deletion.
 *
 * Provider-agnostic: the caller passes a `reask(prompt) => Promise<string>` closure bound to
 * whatever model produced the draft. Scoring reuses detectOutputAntiPatterns (the 350-phrase
 * runtime scorer); structural tells come from the SINGLE canonical lexicon (anti-slop-lexicon
 * .json) so there is no second hardcoded regex list.
 */
import { detectOutputAntiPatterns } from './slidePostProcessor';

const PROXY = 'http://127.0.0.1:5012';

let _structuralCache: Array<{ name: string; rx: RegExp }> | null = null;

/** Load the structural-tell regexes from the canonical lexicon (cached, fail-soft). */
async function loadStructural(): Promise<Array<{ name: string; rx: RegExp }>> {
    if (_structuralCache) return _structuralCache;
    const out: Array<{ name: string; rx: RegExp }> = [];
    try {
        const r = await fetch(`${PROXY}/api/wiki/read-article/frameworks/anti-slop-lexicon.json`).catch(() => null as any)
            || await fetch(`/hic-workspace/wiki/frameworks/anti-slop-lexicon.json`);
        if (r && r.ok) {
            const txt = await r.text();
            const json = JSON.parse(txt.replace(/^---[\s\S]*?---\s*/, '')); // tolerate a wrapper
            const sr = json?.structural_regex || {};
            for (const [name, src] of Object.entries(sr)) {
                if (name.startsWith('_') || typeof src !== 'string') continue;
                try { out.push({ name, rx: new RegExp(src as string) }); } catch { /* skip bad regex */ }
            }
        }
    } catch { /* fail-soft: structural detection off, phrase scorer still runs */ }
    _structuralCache = out;
    return out;
}

export interface SlopAssessment {
    slopScore: number;          // phrase score (higher = worse)
    phrases: string[];          // offending banned phrases
    structural: string[];       // structural tells fired (negative parallelism, triad, ...)
    total: number;              // weighted: phrase score + 3 per structural tell (Rule 95)
}

export async function assessSlop(text: string, deliverableType = 'chat'): Promise<SlopAssessment> {
    const { violations, slopScore } = detectOutputAntiPatterns(text || '', deliverableType);
    const phrases = violations.map(v => v.phrase);
    const structuralHits: string[] = [];
    const sample = (text || '').slice(0, 12000);
    for (const { name, rx } of await loadStructural()) {
        if (rx.test(sample)) structuralHits.push(name);
    }
    return {
        slopScore,
        phrases,
        structural: structuralHits,
        total: slopScore + structuralHits.length * 3,
    };
}

/** The anchored rewrite-from-source prompt (Rule 96). Lists exact offenders + the prior draft
 *  verbatim, and demands a fresh draft - never a paraphrase. */
export function buildRewritePrompt(draft: string, a: SlopAssessment, evidence?: string): string {
    const offenders = [
        ...a.phrases.slice(0, 24).map(p => `  - banned phrase: "${p}"`),
        ...a.structural.map(s => `  - structural tell: ${s.replace(/_/g, ' ')}`),
    ].join('\n');
    return `=== REWRITE FROM SOURCE (anti-slop repair) ===
Your previous draft below reads like AI slop. The following specific tells were detected:
${offenders}

Write a FRESH draft from scratch. Do NOT paraphrase the draft - paraphrasing keeps the same
cadence and the same tells. Instead:
- Lead with the answer (the finding/recommendation) in the first sentence.
- Replace every banned word with the plain word (leverage->use, utilize->use, robust->strong,
  showcase->show, foster->build, garner->get). Cut the structural tells entirely (no "not X,
  it's Y", no rule-of-three triads, no dangling "-ing" significance clauses, no rhetorical
  question then a two-word answer).
- Active voice with a named actor. Vary sentence length: at least one short punchy sentence
  and one longer one; never three same-shape or same-opener sentences in a row.
- Take a position; at most one qualifier per claim. Keep every fact and citation intact.
- Reuse the exact domain terms from the draft verbatim; do not synonym-rotate them.
${evidence ? `\nGround it in this evidence (quote/cite as in the draft):\n"""\n${evidence.slice(0, 6000)}\n"""\n` : ''}
PRIOR DRAFT (rewrite this, do not echo it):
"""
${draft.slice(0, 9000)}
"""
Output ONLY the rewritten text, no preamble.`;
}

/**
 * Run the bounded repair. Scores the draft; if it is over `threshold`, makes ONE anchored
 * rewrite call via `reask` and returns whichever of {original, rewrite} scores lower
 * (Rule 96: keep the better of the two attempts). Below threshold, returns the draft
 * unchanged. Fail-soft: any error returns the original draft.
 */
export async function runSlopRepair(
    draft: string,
    reask: (prompt: string) => Promise<string>,
    opts?: { deliverableType?: string; threshold?: number; evidence?: string; onProgress?: (s: string) => void },
): Promise<{ text: string; repaired: boolean; before: number; after: number }> {
    const threshold = opts?.threshold ?? 10;
    const before = await assessSlop(draft, opts?.deliverableType || 'chat');
    // Trigger on a high weighted score OR any structural tell (the highest-signal cases).
    if (before.total <= threshold && before.structural.length === 0) {
        return { text: draft, repaired: false, before: before.total, after: before.total };
    }
    try {
        opts?.onProgress?.('Rewriting to remove slop (anti-slop repair pass)...');
        const prompt = buildRewritePrompt(draft, before, opts?.evidence);
        const rewrite = (await reask(prompt) || '').trim();
        if (!rewrite || rewrite.length < Math.min(40, draft.length * 0.3)) {
            return { text: draft, repaired: false, before: before.total, after: before.total };
        }
        const after = await assessSlop(rewrite, opts?.deliverableType || 'chat');
        if (after.total < before.total) {
            console.log(`[slop-repair] rewrite-from-source: ${before.total} -> ${after.total} (kept rewrite)`);
            return { text: rewrite, repaired: true, before: before.total, after: after.total };
        }
        console.log(`[slop-repair] rewrite did not improve (${before.total} -> ${after.total}); kept original`);
        return { text: draft, repaired: false, before: before.total, after: after.total };
    } catch (e: any) {
        console.warn('[slop-repair] non-fatal:', e?.message || e);
        return { text: draft, repaired: false, before: before.total, after: before.total };
    }
}
