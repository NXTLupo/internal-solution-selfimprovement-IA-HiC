/**
 * E1.3 (2026-08-21). BANNED-PHRASE DETECTION FOR THE ARTIFACT CHAIN.
 *
 * `scripts/check-content.mjs` fails the build when a shipped artifact carries a word
 * from the lexicon, and `detectOutputAntiPatterns` in slidePostProcessor can find those
 * words, but its remedy is to DELETE the phrase. That turns "firms utilize a
 * comprehensive approach to reporting" into "firms a approach to reporting", which is
 * worse than the slop it replaced.
 *
 * The chain's lexical stage needs a different shape: locate every site, name the field,
 * quote the sentence, and hand the list to the repair pass so a model rewrites it and
 * keeps the claim. Deletion stays out of it.
 *
 * This lives in its own module because `slideTextEditing` imports `slidePostProcessor`,
 * so putting the detector in the post-processor and reaching back for the field
 * enumerator is a cycle. The first attempt did exactly that with `require()`, which is
 * undefined in this ESM build: the call threw, the catch fell back to titles only, and
 * the detector reported zero sites on a deck that had two. A silent fallback inside a
 * gate is the failure mode this whole pass exists to remove, so it is worth naming.
 *
 * The lexicon itself stays in slidePostProcessor and is imported here. One list.
 */
import { SLOP_PHRASES } from './slidePostProcessor';
import { enumerateTextFields } from './slideTextEditing';

export interface SlopSite {
    slideId: string;
    field: string;
    phrase: string;
    severity: 'high' | 'medium' | 'low';
    /** The sentence the phrase sits in, so the repair prompt can quote it back. */
    sentence: string;
}

/** Word-boundary match, so "utilize" never fires inside an unrelated longer word. */
function phraseHit(haystack: string, phrase: string): boolean {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function sentenceAround(text: string, phrase: string): string {
    const parts = String(text || '').split(/(?<=[.!?])\s+/);
    const hit = parts.find(p => phraseHit(p, phrase));
    return (hit || text || '').trim().slice(0, 220);
}

/**
 * Verbatim quote fields are EXEMPT. The lexicon governs the model's own voice, and a
 * source that wrote "utilizes" may be quoted with attribution. `check:content` needed
 * this same exemption after it failed a live deck for a word the source itself wrote.
 */
const QUOTE_FIELD_RE = /(^|[.\[])(quote|quoteText|verbatim|evidenceQuote|pullQuote|keyQuote)([.\]]|$)/i;

/** Every banned-phrase site across a deck, with the field that carries it. */
export function detectSlopInSlides(slides: any[]): SlopSite[] {
    const out: SlopSite[] = [];
    for (const slide of slides || []) {
        const slideId = String(slide?.id || 'slide');
        let fields: Array<{ path: string; value: string }>;
        try {
            fields = enumerateTextFields(slide).map((f: any) => ({ path: f.path, value: f.value }));
        } catch {
            // Never swallow this into a partial answer: a deck we cannot enumerate is a
            // deck we did not inspect, and reporting zero sites would claim otherwise.
            throw new Error(`slop detection could not enumerate fields on ${slideId}`);
        }
        for (const f of fields) {
            if (!f.value || QUOTE_FIELD_RE.test(f.path)) continue;
            for (const entry of SLOP_PHRASES) {
                if (phraseHit(f.value, entry.phrase)) {
                    out.push({
                        slideId, field: f.path, phrase: entry.phrase, severity: entry.severity,
                        sentence: sentenceAround(f.value, entry.phrase),
                    });
                }
            }
        }
    }
    return out;
}

/**
 * The repair instruction. Names the field, quotes the sentence, and asks for a rewrite
 * rather than a deletion, because the reader still needs the point.
 */
export function buildSlopRepairInstruction(sites: SlopSite[]): string {
    if (!sites.length) return '';
    const lines = sites.slice(0, 12).map(s =>
        `- ${s.slideId} field "${s.field}": remove "${s.phrase}" from: "${s.sentence}"`);
    return [
        'BANNED PHRASING. Rewrite each sentence below in plain language, keeping the same',
        'claim and the same citation. Do not delete the sentence and do not annotate it.',
        'Name the actor, use a direct verb, and cut the flagged wording entirely.',
        ...lines,
    ].join('\n');
}
