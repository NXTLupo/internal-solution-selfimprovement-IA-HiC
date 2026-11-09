/**
 * DETERMINISTIC POINTER BINDING (2026-08-21) - G1, after three prompt attempts failed
 *
 * Four consecutive live decks bound ZERO manifest pointers. The decks were not
 * ignoring citation: they cite by NAME into the fields the archetype contracts
 * give them (`"source": "Clockwork"`, `"attributionName": "Clockwork"`), and the
 * contract cells say `source` with no mention of a pointer. Three prompt-level
 * fixes were tried and measured, and all three failed:
 *
 *   1. a worked example in the corpus block          -> 0 pointers
 *   2. a binding contract at the top of DECK MODE    -> 0 pointers
 *   3. `sourceLine` defined as pointer-carrying      -> 0 pointers
 *
 * So stop asking. The pointer is not something the model has to remember, it is
 * something the runtime can COMPUTE: the chunk set the model was shown is in
 * hand, each chunk carries its id and its real source names, and the claim text
 * is right there in the field. This is the same move the provenance lock already
 * made for source NAMES, applied one level down to the pointer itself.
 *
 * TWO STRATEGIES, most precise first:
 *
 *   A. LABEL MATCH. A field already naming a source ("Clockwork") is matched to
 *      the chunk whose RECORDED source is that name. High precision: the model
 *      supplied the identity, the runtime supplies the address. This is the one
 *      that fires on real decks, because naming the source is exactly what the
 *      model does do.
 *
 *   B. CLAIM MATCH. A claim-bearing field with no pointer and no label is matched
 *      to the chunk it was drawn from by DISTINCTIVE-TERM overlap (rare words,
 *      numbers, proper nouns), with a verbatim-run bonus.
 *
 * THE BAR IS DELIBERATELY HIGH. Under-binding leaves the evidence gate to narrow
 * the claim, which is merely conservative. Over-binding attaches a real pointer
 * to a claim that span does not support, which is fabrication wearing a citation.
 * Every binding this module makes is then re-checked by `citationVerifier`, which
 * reads the pointed chunk and can strip a label that does not hold up.
 */

import { enumerateTextFields, applyTextEdits, type TextEdit } from './slideTextEditing';
import { isFactualClaim, pointersOf } from './evidenceSlots';

export interface BindableChunk {
    /** Full pointer, e.g. `articles/clockwork-blog/9f2a71c4de.md#c2`. */
    id: string;
    text: string;
    /** Recorded real source names for this chunk. */
    sourceNames: string[];
}

export interface BindingDecision {
    slideId: string;
    field: string;
    pointer: string;
    strategy: 'label' | 'claim' | 'declared';
    score: number;
    /** Why this pointer, in one line, for the log and the durable record. */
    reason: string;
}

export interface BindReport {
    bound: BindingDecision[];
    /** Fields that needed a pointer and did not clear the bar. */
    unbound: Array<{ slideId: string; field: string; reason: string }>;
    fieldsConsidered: number;
}

// ---------------------------------------------------------------------------
// Text signals
// ---------------------------------------------------------------------------

/** Words too common to identify a source. Kept small: the rarity test does the work. */
const STOP = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'they', 'their', 'have', 'has', 'are', 'was', 'were',
    'but', 'not', 'all', 'can', 'will', 'would', 'more', 'than', 'when', 'what', 'which', 'while', 'into',
    'about', 'over', 'after', 'before', 'because', 'been', 'being', 'other', 'some', 'most', 'such', 'only',
    'also', 'then', 'them', 'these', 'those', 'there', 'where', 'how', 'who', 'why', 'its', 'his', 'her',
    'search', 'firms', 'firm', 'team', 'teams', 'work', 'working', 'process', 'data', 'time', 'first', 'new',
]);

function tokens(text: string): string[] {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9%$.\s-]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOP.has(t));
}

/**
 * Terms that actually identify a passage: numbers, hyphenated compounds, long
 * words, and capitalized names (checked on the original casing).
 */
function distinctiveTerms(text: string): Set<string> {
    const out = new Set<string>();
    for (const t of tokens(text)) {
        if (/\d/.test(t) || t.includes('-') || t.length >= 8) out.add(t);
    }
    for (const m of String(text || '').matchAll(/\b[A-Z][a-zA-Z]{3,}(?:\s+[A-Z][a-zA-Z]{3,})?/g)) {
        const term = m[0].toLowerCase();
        if (!STOP.has(term)) out.add(term);
    }
    return out;
}

/** Longest run of consecutive shared tokens, the verbatim-overlap signal. */
function longestSharedRun(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0;
    const bSet = new Set(b);
    let best = 0;
    let run = 0;
    for (const t of a) {
        if (bSet.has(t)) { run++; best = Math.max(best, run); } else { run = 0; }
    }
    return best;
}

function normalizeName(s: string): string {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fields whose value is a source LABEL rather than prose. */
const LABEL_FIELD = /^(source|sourceline|attribution|attributionname|sourcename|citedfrom|byline)$/i;

const lastSegment = (path: string) => path.split(/[.[\]]/).filter(Boolean).pop() || path;

// The bars. Raised deliberately: a wrong binding is worse than none.
const CLAIM_MIN_TERMS = 3;      // shared distinctive terms
const CLAIM_MIN_RUN = 5;        // consecutive shared tokens
const CLAIM_MIN_SCORE = 0.34;   // combined score

/**
 * Bind pointers into a deck. Returns NEW slides (the WS-4 edit contract records
 * every change, so per-slide Undo still works) plus the decision record.
 */
export function bindPointers<T extends { id: string; template: string; title: string; _textHistory?: any[]; composerPayload?: any }>(
    slides: T[],
    chunks: BindableChunk[],
): { slides: T[]; report: BindReport } {
    const bound: BindingDecision[] = [];
    const unbound: BindReport['unbound'] = [];
    let fieldsConsidered = 0;

    const pool = (chunks || []).filter(c => c && c.id && c.text);
    if (!pool.length || !Array.isArray(slides) || !slides.length) {
        return { slides: slides || [], report: { bound, unbound, fieldsConsidered } };
    }

    // Precompute per-chunk signals once.
    //
    // 2026-08-21, from real production data: the model writes the PUBLISHER or
    // PLATFORM name ("Clockwork") while the chunk records the ARTICLE TITLE
    // ("Some Brands Consider..."), so name-to-name matching found nothing on a
    // live deck whose evidence was right there. The page slug carries the source:
    // `articles/exs-clockwork/5af374bb9c.md#c1` is the Clockwork article, and that
    // slug is derived from the source at ingest. Matching the label against the
    // slug as well as the recorded names is what makes strategy A fire on real
    // decks rather than only on tidy fixtures.
    // 2026-10-20 (root-cause audit P0.4): a generated synthesis / insight page is never a binding target; binding a
    // claim to the system's own prior prose is how 633 artifact pointers came to cite hic-theme-synthesis pages.
    const prepared = pool.filter(c => !/(?:^|\/)(?:hic-theme-synthesis|insights?|synthesis)\//i.test(c.id)).map(c => ({
        id: c.id,
        tokens: tokens(c.text),
        terms: distinctiveTerms(c.text),
        names: (c.sourceNames || []).map(normalizeName).filter(Boolean),
        slugWords: c.id
            .replace(/#c\d+$/, '')
            .replace(/\.md$/, '')
            .split(/[/\\_-]+/)
            // Drop the container segment and the content hash: `articles`,
            // `transcripts`, and the 10-hex id carry no source identity.
            .filter(w => w.length > 2 && !/^(articles|transcripts|uploads|sources|wiki)$/i.test(w) && !/^[0-9a-f]{8,}$/i.test(w))
            .map(w => w.toLowerCase()),
    }));

    // name -> pointers, for strategy A.
    const byName = new Map<string, string[]>();
    for (const c of prepared) {
        for (const n of c.names) {
            if (!byName.has(n)) byName.set(n, []);
            if (!byName.get(n)!.includes(c.id)) byName.get(n)!.push(c.id);
        }
    }

    const preparedById = new Map(prepared.map(c => [c.id, c]));

    const out = slides.map(slide => {
        const fields = enumerateTextFields(slide);
        const edits: TextEdit[] = [];

        // 2026-11-03 (NotebookLM reverse-engineering, the deck-grounding fix after a live
        // 0-of-45 deck): DECK MODE now asks every content slide for a top-level
        // `evidence: ["<path#cN>", ...]` array SELECTED from the corpus block. Selecting ids
        // from a menu is a task the model does reliably, unlike interleaving pointer syntax
        // into prose (the three failed prompt attempts above). A slide's declared chunks are
        // model-asserted provenance made at generation time, so claim matching against THEM
        // runs at a proportionate bar; citationVerifier still re-reads every bound span and
        // strips any binding the chunk does not support. Invented ids never bind: only
        // pointers present in the grounding pool survive the filter.
        const declaredIds = Array.from(new Set(
            ([] as any[])
                .concat((slide as any).evidence || [], (slide as any).composerPayload?.evidence || [])
                .map(p => String(p || '').trim().replace(/^\[+|\]+$/g, ''))
                .filter(p => /\.md#c\d+$/i.test(p)),
        ));
        const declared = declaredIds.map(id => preparedById.get(id)).filter(Boolean) as typeof prepared;

        for (const f of fields) {
            const value = String(f.value || '');
            if (pointersOf(value).length) continue;          // already bound
            const leaf = lastSegment(f.path);

            // ---- Strategy A: the field names a source; supply its address ----
            if (LABEL_FIELD.test(leaf)) {
                fieldsConsidered++;
                // A label may carry several names ("Source: A; B; C").
                const parts = value.replace(/^\s*sources?\s*:\s*/i, '').split(/\s*[;,]\s*/).filter(Boolean);
                const attach: string[] = [];
                for (const part of parts) {
                    const norm = normalizeName(part);
                    if (!norm) continue;
                    // 1. Exact recorded name.
                    let hit = byName.get(norm);
                    // 2. Containment either way (recorded names are often longer
                    //    than the label the model writes).
                    if (!hit) {
                        for (const [name, ptrs] of byName) {
                            if (name.includes(norm) || norm.includes(name)) { hit = ptrs; break; }
                        }
                    }
                    // 3. The page slug. This is the tier that fires on real decks:
                    //    the model names the publisher, the chunk records the
                    //    article title, and the slug is the only place both meet.
                    if (!hit) {
                        // Require a slug word of real length so a two-letter
                        // fragment cannot claim an unrelated source.
                        const labelWords = norm.split(' ').filter(w => w.length >= 5);
                        for (const c of prepared) {
                            if (labelWords.some(w => c.slugWords.includes(w))) { hit = [c.id]; break; }
                        }
                    }
                    if (hit && hit.length && !attach.includes(hit[0])) attach.push(hit[0]);
                }
                if (attach.length) {
                    const marker = attach.slice(0, 2).map(p => `[${p}]`).join(' ');
                    edits.push({ path: f.path, value: `${value} ${marker}`.trim() });
                    for (const p of attach.slice(0, 2)) {
                        bound.push({
                            slideId: slide.id, field: f.path, pointer: p, strategy: 'label', score: 1,
                            reason: `the field names a source whose recorded chunk is ${p}`,
                        });
                    }
                } else {
                    unbound.push({ slideId: slide.id, field: f.path, reason: `no chunk records a source matching "${value.slice(0, 60)}"` });
                }
                continue;
            }

            // ---- Strategy B: a factual claim with no pointer and no label ----
            if (!isFactualClaim(value)) continue;
            fieldsConsidered++;
            const fTokens = tokens(value);
            const fTerms = distinctiveTerms(value);

            // ---- Strategy B0: the slide DECLARED its chunks; match within them first ----
            // Proportionate bar (2 shared terms, 3-token run, 0.22): the model asserted at
            // generation time that these spans are where this slide's facts came from, and
            // the provenance stage re-verifies every binding against the pointed chunk.
            if (declared.length && fTerms.size >= 2) {
                let bestD: { id: string; score: number; shared: number; run: number } | null = null;
                for (const c of declared) {
                    let shared = 0;
                    for (const t of fTerms) if (c.terms.has(t)) shared++;
                    if (shared < 2) continue;
                    const run = longestSharedRun(fTokens, c.tokens);
                    const score = (shared / fTerms.size) * 0.7 + Math.min(run / 12, 1) * 0.3;
                    if (!bestD || score > bestD.score) bestD = { id: c.id, score, shared, run };
                }
                if (bestD && bestD.score >= 0.22 && bestD.run >= 3) {
                    edits.push({ path: f.path, value: `${value} [${bestD.id}]` });
                    bound.push({
                        slideId: slide.id, field: f.path, pointer: bestD.id, strategy: 'declared',
                        score: Number(bestD.score.toFixed(3)),
                        reason: `slide-declared evidence: ${bestD.shared} distinctive term(s), ${bestD.run}-token run within the slide's own chunk set`,
                    });
                    continue;
                }
            }

            if (fTerms.size < CLAIM_MIN_TERMS) {
                unbound.push({ slideId: slide.id, field: f.path, reason: 'claim carries too few distinctive terms to match a span safely' });
                continue;
            }

            let best: { id: string; score: number; shared: number; run: number } | null = null;
            for (const c of prepared) {
                let shared = 0;
                for (const t of fTerms) if (c.terms.has(t)) shared++;
                if (shared < CLAIM_MIN_TERMS) continue;
                const run = longestSharedRun(fTokens, c.tokens);
                // Coverage of the CLAIM's distinctive terms, plus a verbatim bonus.
                const score = (shared / fTerms.size) * 0.7 + Math.min(run / 12, 1) * 0.3;
                if (!best || score > best.score) best = { id: c.id, score, shared, run };
            }

            if (best && best.score >= CLAIM_MIN_SCORE && best.run >= CLAIM_MIN_RUN) {
                edits.push({ path: f.path, value: `${value} [${best.id}]` });
                bound.push({
                    slideId: slide.id, field: f.path, pointer: best.id, strategy: 'claim',
                    score: Number(best.score.toFixed(3)),
                    reason: `${best.shared} distinctive term(s) and a ${best.run}-token verbatim run match this span`,
                });
            } else {
                unbound.push({
                    slideId: slide.id, field: f.path,
                    reason: best
                        ? `best candidate scored ${best.score.toFixed(2)} with a ${best.run}-token run, below the bar`
                        : 'no chunk shares enough distinctive terms with this claim',
                });
            }
        }

        return edits.length ? (applyTextEdits(slide, edits) as T) : slide;
    });

    return { slides: out, report: { bound, unbound, fieldsConsidered } };
}

// ---------------------------------------------------------------------------
// The grounding-chunk projection
// ---------------------------------------------------------------------------

/**
 * The chunk set the model was actually shown, recorded at the moment it becomes
 * model-facing evidence (`assembleChunkCorpus`). Same projection pattern as the
 * durable-artifact and AIR stores: whoever knows records it, whoever needs it
 * reads it, and nothing has to reconstruct it later.
 */
let _grounding: BindableChunk[] = [];

export function noteGroundingChunks(chunks: Array<{ id?: string; text?: string; sources?: Array<{ n?: string }> }>): void {
    const next: BindableChunk[] = [];
    for (const c of chunks || []) {
        if (!c?.id || !c?.text) continue;
        next.push({
            id: String(c.id),
            text: String(c.text),
            sourceNames: (c.sources || []).map(s => String(s?.n || '')).filter(Boolean),
        });
    }
    if (next.length) _grounding = next;
}

export function readGroundingChunks(): BindableChunk[] {
    return _grounding;
}

export function resetGroundingChunks(): void {
    _grounding = [];
}

/** One-line summary for the log and the durable record. */
export function bindSummary(report: BindReport): string {
    const byStrategy = report.bound.reduce((acc, b) => {
        acc[b.strategy] = (acc[b.strategy] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return `${report.bound.length} pointer(s) bound (${Object.entries(byStrategy).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}), `
        + `${report.unbound.length} field(s) left unbound of ${report.fieldsConsidered} considered`;
}
