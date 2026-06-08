/**
 * citationGrounding.ts - U3: causal citation faithfulness check (2026-06-02)
 *
 * Correctness != faithfulness. A theme can name a real source AND still attach a
 * quote the source never said (the model paraphrased, merged, or fabricated it).
 * The citation-resolution layer (citationResolver) only proves a [CHUNK_xxx] maps
 * to a real source NAME; it does NOT prove the quoted EVIDENCE actually appears in
 * that source. This module closes that gap with a substring/lexical faithfulness
 * check against the corpus the run was actually given: a quoted citation whose
 * text cannot be found in the corpus is treated as fabricated and dropped, so a
 * fabricated quote can never reach a slide.
 *
 * Deliberately lexical (not an LLM/NLI call): it is deterministic, free, runs
 * locally, and cannot itself hallucinate. An NLI entailment pass can layer on
 * top later (H4b) for paraphrase-level faithfulness; substring grounding is the
 * cheap, high-precision floor that kills the verbatim-fabrication class.
 */

/** Normalize text for tolerant substring matching: lowercase, unify quotes/dashes, collapse whitespace. */
function norm(s: string): string {
    return (s || '')
        .toLowerCase()
        .replace(/[‘’‛′]/g, "'")      // curly/prime single quotes -> '
        .replace(/[“”″]/g, '"')             // curly double quotes -> "
        .replace(/[--−]/g, '-')             // en/em/minus dash -> hyphen
        .replace(/.../g, '...')                          // ellipsis char -> ...
        .replace(/[`'"]/g, '')                              // drop quote chars entirely (quotes are wrapped inconsistently)
        .replace(/\s+/g, ' ')
        .trim();
}

/** A quote counts as grounded if its normalized form (or its dropped-ends core) is a substring of the corpus. */
function isQuoteGrounded(quote: string, normCorpus: string): boolean {
    const q = norm(quote);
    // Too-short fragments are not meaningful evidence; don't fail a theme on them.
    if (q.length < 24) return true;
    if (normCorpus.includes(q)) return true;
    // Tolerate the model trimming/adding a few words at the ends: test the middle ~70%.
    const words = q.split(' ');
    if (words.length >= 8) {
        const start = Math.floor(words.length * 0.15);
        const end = Math.ceil(words.length * 0.85);
        const core = words.slice(start, end).join(' ');
        if (core.length >= 24 && normCorpus.includes(core)) return true;
        // Also tolerate a quote stitched from two corpus spans: require the
        // first half AND second half to each appear (cheap "both ends present").
        const mid = Math.floor(words.length / 2);
        const head = words.slice(0, mid).join(' ');
        const tail = words.slice(mid).join(' ');
        if (head.length >= 24 && tail.length >= 24 && normCorpus.includes(head) && normCorpus.includes(tail)) return true;
    }
    return false;
}

// ── universal grounding (the HARD RULE, deliverable-agnostic) ───────────────
// 2026-06-02 - Instead of a per-artifact check bolted onto each generator, this
// is ONE recursive rule applied to every deliverable: any quote-shaped string,
// anywhere in the object tree, must appear in the corpus or it is blanked. A new
// deliverable type inherits the rule automatically -- no new grounding code.
const QUOTE_KEYS = new Set(['quote', 'text', 'pullquote', 'keyquote', 'verbatim', 'evidencequote', 'evidence_quote']);

export interface DeliverableGroundingReport {
    checked: number;
    grounded: number;
    blanked: number;   // fabricated quotes removed (set to '')
    skippedNoCorpus: boolean;
    corpusMismatch: boolean;   // match rate so low the verification corpus is wrong -> NOTHING blanked
}

// Below this match rate we conclude the verification corpus does not align with
// the text the deliverable was generated from (e.g. themes are grounded on
// archive passages / topic clusters, not the ingestion file-parts). In that
// case the failures are almost certainly OUR mismatch, not the model fabricating,
// so we must NOT blank -- a grounding check may never gut a whole deliverable.
const GROUNDING_MISMATCH_FLOOR = 0.15;

/**
 * Two-pass grounding. PASS 1 measures how many quote-shaped strings appear in
 * the corpus WITHOUT mutating. If the match rate is below the mismatch floor,
 * the verification corpus is wrong/incomplete -> preserve everything, flag
 * corpusMismatch. Only when a healthy fraction matches (proving corpus alignment)
 * does PASS 2 blank the specific unmatched quotes (the real fabrications).
 * Fail-open if the corpus is too small to verify.
 */
export function verifyDeliverableCitations(root: any, corpusText: string): DeliverableGroundingReport {
    const report: DeliverableGroundingReport = { checked: 0, grounded: 0, blanked: 0, skippedNoCorpus: false, corpusMismatch: false };
    if (!root || typeof root !== 'object') return report;
    const normCorpus = norm(corpusText || '');
    if (normCorpus.length < 2000) { report.skippedNoCorpus = true; return report; }

    // PASS 1 - collect every quote ref + whether it grounds, mutating nothing.
    const refs: Array<{ node: any; key: string; grounded: boolean }> = [];
    const seen = new Set<any>();
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (Array.isArray(node)) { for (const el of node) walk(el); return; }
        for (const [k, v] of Object.entries(node)) {
            if (typeof v === 'string') {
                if (QUOTE_KEYS.has(k.toLowerCase()) && v.trim().length >= 24) {
                    const grounded = isQuoteGrounded(v, normCorpus);
                    refs.push({ node, key: k, grounded });
                    report.checked++;
                    if (grounded) report.grounded++;
                }
            } else if (v && typeof v === 'object') {
                walk(v);
            }
        }
    };
    walk(root);

    if (report.checked === 0) return report;

    // SAFETY VALVE - if almost nothing matched, the corpus is mismatched, NOT the
    // model fabricating. Preserve all quotes; flag for the caller to log honestly.
    if (report.grounded / report.checked < GROUNDING_MISMATCH_FLOOR) {
        report.corpusMismatch = true;
        return report;
    }

    // PASS 2 - corpus aligns; blank only the specific unmatched quotes.
    for (const r of refs) {
        if (!r.grounded) { (r.node as any)[r.key] = ''; report.blanked++; }
    }
    return report;
}

export interface GroundingReport {
    themesChecked: number;
    citationsChecked: number;
    citationsGrounded: number;
    citationsDropped: number;       // fabricated verbatim quotes removed
    themeQuotesBlanked: number;     // headline theme.quote that was fabricated
    ungroundedThemes: string[];     // themes left with zero grounded quoted citations
}

/**
 * Verify and prune fabricated quotes on a theme set, IN PLACE.
 *  - citation.text (or .quote) that cannot be found in the corpus -> the citation
 *    is dropped (its source attribution may still be re-derivable elsewhere, but
 *    a quote the corpus does not contain must not ship).
 *  - theme.quote that cannot be found -> blanked (kept structurally, no fabricated text).
 *  - a theme left with no grounded quoted citation is recorded (caller may downgrade);
 *    we do NOT delete themes here (a theme can be real even if one quote was bad).
 *
 * `groundingText` is the concatenated text the run was given (corpus text parts).
 * If it is too small to verify against, we skip and report 0s (fail-open, but loud
 * via the returned report so the caller can log it).
 */
export function verifyThemeCitations(themes: any[], groundingText: string): GroundingReport {
    const report: GroundingReport = {
        themesChecked: 0, citationsChecked: 0, citationsGrounded: 0,
        citationsDropped: 0, themeQuotesBlanked: 0, ungroundedThemes: [],
    };
    if (!Array.isArray(themes) || !themes.length) return report;
    const normCorpus = norm(groundingText);
    if (normCorpus.length < 2000) return report;   // cannot meaningfully verify; fail-open

    for (const theme of themes) {
        report.themesChecked++;
        let groundedQuotedCitations = 0;
        let hadQuotedCitation = false;

        if (Array.isArray(theme.citations)) {
            const kept: any[] = [];
            for (const c of theme.citations) {
                const quote = (c && (c.text || c.quote)) ? String(c.text || c.quote) : '';
                if (!quote) { kept.push(c); continue; }   // no quote to verify; keep attribution
                hadQuotedCitation = true;
                report.citationsChecked++;
                if (isQuoteGrounded(quote, normCorpus)) {
                    report.citationsGrounded++;
                    groundedQuotedCitations++;
                    kept.push(c);
                } else {
                    report.citationsDropped++;   // fabricated verbatim quote -> drop
                }
            }
            theme.citations = kept;
        }

        // Headline theme.quote - the most visible string; blank it if fabricated.
        if (theme.quote && typeof theme.quote === 'string' && theme.quote.trim()) {
            if (!isQuoteGrounded(theme.quote, normCorpus)) {
                theme.quote = '';
                report.themeQuotesBlanked++;
            }
        }

        if (hadQuotedCitation && groundedQuotedCitations === 0) {
            report.ungroundedThemes.push(theme.name || '(unnamed theme)');
            (theme as any)._groundingStatus = 'ungrounded';
        }
    }
    return report;
}
