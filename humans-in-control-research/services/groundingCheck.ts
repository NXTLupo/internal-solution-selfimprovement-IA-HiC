/**
 * E2.1 (2026-08-21). THE GROUNDING CHECK.
 *
 * From `writing-beats` in Matt Pocock's skills library: "Every concept has to be
 * grounded before a beat can lean on it... The unit is the concept, not the word for
 * it." That is a checkable form of something HiC has only ever judged by feel.
 *
 * The Partner Test in `.claude/CLAUDE.md` says a senior partner reading ONLY the slide
 * titles must follow the whole argument. A deck fails that test the moment slide four
 * argues from a mechanism no earlier slide introduced: the reader is asked to accept a
 * conclusion about a thing they have not been told about yet. The existing deck gate
 * measures archetype variety and exhibit fit, which are shape problems. This measures
 * whether the ARGUMENT is in a readable order.
 *
 * Deterministic, no model call. Two decisions keep the false-positive rate low, because
 * a gate that cries wolf gets ignored:
 *
 *   1. Only DISTINCTIVE concepts count. A concept is a proper noun or a multi-word
 *      domain phrase, never a common business word. "the CRM" and "the finalist stage"
 *      qualify; "the process" and "the team" do not.
 *   2. A concept introduced ON the slide that leans on it is grounded there. Writers
 *      legitimately name and explain a thing in the same breath, and flagging that
 *      would fight good writing rather than bad.
 */

import { enumerateTextFields } from './slideTextEditing';

export interface GroundingFinding {
    slideId: string;
    slideIndex: number;
    /** The concept the slide leans on without introducing it. */
    concept: string;
    /** The sentence that leans on it. */
    sentence: string;
    field: string;
}

export interface GroundingReport {
    findings: GroundingFinding[];
    /** Concepts introduced, in the order the deck introduces them. */
    introduced: string[];
    conceptsChecked: number;
    pass: boolean;
}

/**
 * Words that look like concepts and are not. A deck may lean on "the process" from the
 * first slide without owing the reader a definition, so these can never be findings.
 */
const COMMON = new Set([
    'process', 'team', 'client', 'clients', 'business', 'company', 'market', 'value',
    'data', 'time', 'work', 'people', 'stage', 'stages', 'change', 'result', 'results',
    'system', 'systems', 'tool', 'tools', 'report', 'reports', 'reporting', 'research',
    'firm', 'firms', 'partner', 'partners', 'customer', 'customers', 'product',
    'service', 'services', 'model', 'models', 'approach', 'level', 'levels', 'point',
    'points', 'area', 'areas', 'role', 'roles', 'need', 'needs', 'goal', 'goals',
    'issue', 'issues', 'risk', 'risks', 'cost', 'costs', 'price', 'growth', 'quality',
    'first', 'second', 'third', 'next', 'other', 'others', 'same', 'more', 'most',
    'today', 'tomorrow', 'year', 'years', 'month', 'months', 'quarter', 'week',
]);

/** Sentence-initial position makes capitalization uninformative, so it is excluded. */
function properNouns(text: string): string[] {
    const out: string[] = [];
    for (const sentence of String(text || '').split(/(?<=[.!?])\s+/)) {
        const tokens = sentence.trim().split(/\s+/);
        tokens.forEach((tok, i) => {
            const word = tok.replace(/[^A-Za-z0-9.&/-]/g, '');
            if (i === 0 || word.length < 4) return;
            if (!/^[A-Z]/.test(word)) return;
            if (/^[A-Z]+$/.test(word) && word.length <= 3) return;    // an initialism is not a concept
            if (COMMON.has(word.toLowerCase())) return;
            out.push(word);
        });
    }
    return out;
}

/**
 * Multi-word domain phrases: two or three lowercase content words in sequence, at
 * least one of them long enough to carry meaning. "governed data layer" and "finalist
 * assessment stage" survive; "of the process" does not.
 */
const STOP = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'that', 'this',
    'these', 'those', 'it', 'its', 'their', 'they', 'we', 'our', 'you', 'your', 'not',
    'no', 'can', 'will', 'should', 'must', 'may', 'more', 'less', 'than', 'then',
    'when', 'where', 'while', 'because', 'so', 'if', 'into', 'out', 'up', 'down',
    'over', 'under', 'about', 'across', 'before', 'after', 'still', 'already', 'own',
    'each', 'every', 'any', 'all', 'some', 'both', 'has', 'have', 'had', 'does', 'do',
]);

function domainPhrases(text: string): string[] {
    const words = String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
    /**
     * A phrase earns concept status only if it carries a word that is BOTH long and not
     * a common business word. "governed data layer" qualifies on "governed"; "research
     * phase" does not, because "research" is common and "phase" is short. The first
     * version tested length alone and flagged "research phase" on a healthy deck, which
     * is the false-positive class that gets a gate switched off.
     */
    const distinctive = (span: string[]) =>
        !span.some(w => STOP.has(w))
        && span.some(w => w.length >= 6 && !COMMON.has(w));

    /**
     * A concept must be REFERRED TO, not merely spoken. English marks the difference
     * with a determiner or a preposition: a reader meets "the governed data layer" or
     * "a finalist calibration panel", while "enrichment shortens" is a subject and its
     * verb. Requiring that marker is what separates a noun phrase from a verb phrase
     * without a part-of-speech tagger, and it is why the second version stopped
     * reporting "enrichment shortens" as an ungrounded concept on a healthy deck.
     */
    const REFERENT = new Set([
        'the', 'a', 'an', 'its', 'their', 'our', 'this', 'that', 'these', 'those',
        'of', 'on', 'in', 'for', 'with', 'from', 'at', 'to', 'into', 'across', 'via',
    ]);

    // Longest first, and a shorter phrase fully inside an accepted longer one is dropped:
    // otherwise "finalist calibration panel" also yields "finalist calibration" and the
    // same problem gets reported twice under two names.
    const accepted: string[] = [];
    for (let n = 3; n >= 2; n--) {
        for (let i = 0; i + n <= words.length; i++) {
            if (i === 0 || !REFERENT.has(words[i - 1])) continue;
            const span = words.slice(i, i + n);
            if (!distinctive(span)) continue;
            const phrase = span.join(' ');
            if (accepted.some(a => a.includes(phrase))) continue;
            accepted.push(phrase);
        }
    }
    return accepted;
}

/** Every distinctive concept a piece of text names. */
export function conceptsIn(text: string): string[] {
    const set = new Set<string>();
    properNouns(text).forEach(p => set.add(p.toLowerCase()));
    domainPhrases(text).forEach(p => set.add(p));
    return [...set];
}

/** Does this sentence carry an argument, or is it a label? Only arguments owe grounding. */
const LOAD_BEARING_RE = /\b(because|therefore|so|which means|drives|causes|leads to|results in|depends on|requires|fails|breaks|shortens|raises|lowers|blocks|prevents)\b/i;

function slideText(slide: any): Array<{ path: string; value: string }> {
    try {
        return enumerateTextFields(slide).map((f: any) => ({ path: f.path, value: String(f.value || '') }));
    } catch {
        return [{ path: 'title', value: String(slide?.title || '') }];
    }
}

/**
 * Walk the deck in order. A slide may lean on any concept an earlier slide named, or
 * one it names itself. Anything else is a concept the reader has not met.
 */
export function evaluateGrounding(slides: any[]): GroundingReport {
    const grounded = new Set<string>();
    const introduced: string[] = [];
    const findings: GroundingFinding[] = [];
    let conceptsChecked = 0;

    (slides || []).forEach((slide, index) => {
        const fields = slideText(slide);
        const slideId = String(slide?.id || `slide-${index}`);
        // Everything this slide names counts as grounded FOR THIS SLIDE, since a writer
        // may introduce and use a term in the same breath.
        const namedHere = new Set<string>();
        fields.forEach(f => conceptsIn(f.value).forEach(c => namedHere.add(c)));

        // The first slide cannot fail: it has no earlier deck to have grounded anything,
        // and a cover naming the subject is exactly how grounding starts.
        /**
         * Containment counts. If an earlier slide introduced "governed data layer", a
         * later slide leaning on "governed data" is leaning on the same thing, and
         * demanding a second introduction would be pedantry rather than a finding.
         */
        const isGrounded = (concept: string) => {
            if (grounded.has(concept)) return true;
            for (const g of grounded) {
                if (g.includes(concept) || concept.includes(g)) return true;
            }
            return false;
        };

        if (index > 0) {
            for (const f of fields) {
                for (const sentence of f.value.split(/(?<=[.!?])\s+/)) {
                    if (!LOAD_BEARING_RE.test(sentence)) continue;
                    for (const concept of conceptsIn(sentence)) {
                        conceptsChecked++;
                        if (isGrounded(concept)) continue;
                        // Named elsewhere on this same slide: grounded here.
                        const elsewhereHere = fields.some(o => o.path !== f.path && conceptsIn(o.value).includes(concept));
                        const introducedHere = elsewhereHere
                            || conceptsIn(String(slide?.title || '')).includes(concept);
                        if (introducedHere) continue;
                        // Report a concept family once, matching on containment for the
                        // same reason grounding does.
                        if (findings.some(x => x.concept.includes(concept) || concept.includes(x.concept))) continue;
                        findings.push({
                            slideId, slideIndex: index, concept,
                            sentence: sentence.trim().slice(0, 220), field: f.path,
                        });
                    }
                }
            }
        }

        namedHere.forEach(c => {
            if (!grounded.has(c)) { grounded.add(c); introduced.push(c); }
        });
    });

    return { findings, introduced, conceptsChecked, pass: findings.length === 0 };
}

/** The repair instruction: ground it earlier or name it here. Never annotate. */
export function buildGroundingInstruction(report: GroundingReport): string {
    if (!report.findings.length) return '';
    const lines = report.findings.slice(0, 8).map(f =>
        `- slide ${f.slideIndex + 1} (${f.slideId}) argues from "${f.concept}" before any earlier slide introduces it: "${f.sentence}"`);
    return [
        'UNGROUNDED CONCEPT. A reader who has only seen the earlier slides does not know',
        'what these terms refer to, so the argument does not land. For each one, either',
        'name and explain the term in the same slide that argues from it, or rewrite the',
        'sentence to argue from something the deck has already established. Do not add a',
        'note about the gap and do not delete the claim.',
        ...lines,
    ].join('\n');
}
