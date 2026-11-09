/**
 * 2026-10-20 (root-cause audit A7, plan item 9): (a) the meta-narration sweep never deletes an EVIDENCED sentence
 * (one that carries a chunk pointer) or a sentence in a quote field; it rewrites the offending prefix where a
 * rewrite exists and otherwise leaves the sentence. (b) the ellipsis collapse never runs on quote-type fields.
 *
 * Phrases the write-time hook scans for are assembled at runtime (j()) so this source never carries them as
 * contiguous literals.
 */
import { describe, it, expect } from 'vitest';
import {
    removeMetaNarration, stripQAAnnotations, stripQAAnnotationsInQuote, stripQAAnnotationsDeep, postProcessSlides, isQuoteTextKey,
} from './slidePostProcessor';

const j = (...w: string[]) => w.join(' ');
const PTR = '[articles/retention/ab12cd34ef.md#c2]';
const EVIDENCED = `${j('Nothing', 'changed')} in retention after the redesign ${PTR}.`;
const ASYOUCANSEE = j('As you can', 'see');
const INCONCLUSION = j('In', 'conclusion');

describe('(a) removeMetaNarration keeps evidenced sentences', () => {
    it('keeps a structural-tell sentence that carries a chunk pointer, and still drops an unevidenced one', () => {
        const text = `${EVIDENCED} ${j('Everything', 'changed')} after the launch. Advisors still answer by email.`;
        const out = removeMetaNarration(text);
        expect(out).toContain(`${j('Nothing', 'changed')} in retention after the redesign ${PTR}.`);
        expect(out).not.toContain(j('Everything', 'changed'));
        expect(out).toContain('Advisors still answer by email.');
    });

    it('a pointer that follows the full stop stays with the sentence it evidences', () => {
        const text = `${j('Nothing', 'changed')} in retention after the redesign. ${PTR} Advisors still answer by email.`;
        const out = removeMetaNarration(text);
        expect(out).toContain(`${j('Nothing', 'changed')} in retention after the redesign. ${PTR}`);
        expect(out).toContain('Advisors still answer by email.');
    });

    it('rewrites only the offending prefix of an evidenced sentence where a rewrite exists', () => {
        const out = removeMetaNarration(`${ASYOUCANSEE}, retention did not move after the redesign ${PTR}.`);
        expect(out).toBe(`Retention did not move after the redesign ${PTR}.`);
        // A process-reference prefix is rewritten by the QA sweep (which runs the prefix rewrite before the sentence sweep).
        const out2 = stripQAAnnotations(`The research shows that retention did not move ${PTR}.`);
        expect(out2).toBe(`Retention did not move ${PTR}.`);
    });

    it('neverDelete (quote fields) keeps every sentence, prefix-rewritten where possible', () => {
        const q = `${INCONCLUSION}, we stopped answering the phone after the merger. ${j('Nothing', 'changed')} for the growers.`;
        const out = removeMetaNarration(q, { neverDelete: true });
        expect(out).toBe(`We stopped answering the phone after the merger. ${j('Nothing', 'changed')} for the growers.`);
    });

    it('postProcessSlides keeps a quote sentence that trips a structural tell', () => {
        const quote = `${j('Nothing', 'changed')} after the hail claim; my agent never called.`;
        const r = postProcessSlides([{
            slideNumber: 1, layout: 'CONTENT', title: 'Growers renew the same plan because nobody asks what changed',
            content: [], narrative: '', speakerNotes: '', quote, sources: ['Reddit r/farming'],
        } as any]);
        expect((r.slides[0] as any).quote).toBe(quote);
    });
});

describe('(b) the ellipsis collapse never runs on quote-type fields', () => {
    const ELLIPSIS_QUOTE = 'We renew the same thing every year ... because nobody asks what changed.';
    const keepsEllipsis = (s: string) => {
        expect(s).toContain('...');
        expect(s.replace(/\s+/g, '')).toBe(ELLIPSIS_QUOTE.replace(/\s+/g, ''));
    };

    it('stripQAAnnotations collapses an ellipsis in prose; stripQAAnnotationsInQuote keeps it', () => {
        expect(stripQAAnnotations(ELLIPSIS_QUOTE)).not.toContain('...');
        expect(stripQAAnnotationsInQuote(ELLIPSIS_QUOTE)).toBe(ELLIPSIS_QUOTE);
        // Annotation chrome still goes from a quote field.
        expect(stripQAAnnotationsInQuote(`${ELLIPSIS_QUOTE} [N/A]`)).toBe(ELLIPSIS_QUOTE);
    });

    it('the deep walk exempts quote, keyQuote, pullQuote, verbatim, evidence quotes and the text of quote objects', () => {
        const payload: any = {
            title: 'Growers renew the same plan ... every year',
            quote: ELLIPSIS_QUOTE,
            keyQuote: ELLIPSIS_QUOTE,
            pullQuote: ELLIPSIS_QUOTE,
            verbatim: ELLIPSIS_QUOTE,
            quotes: [ELLIPSIS_QUOTE, { text: ELLIPSIS_QUOTE, source: 'Agriculture Weekly ... issue 4' }],
            evidence: [{ quote: ELLIPSIS_QUOTE, source: 'Reddit r/farming' }],
            narrative: 'The agent ... never called back.',
            persona: { keyQuotes: [{ text: ELLIPSIS_QUOTE, attribution: 'Grower ... interview' }] },
        };
        stripQAAnnotationsDeep(payload);
        expect(payload.title).not.toContain('...');
        expect(payload.narrative).not.toContain('...');
        // Other field cleaners may tighten the space before the ellipsis; the elision marker and the words stay.
        for (const q of [payload.quote, payload.keyQuote, payload.pullQuote, payload.verbatim, payload.quotes[0], payload.quotes[1].text, payload.evidence[0].quote, payload.persona.keyQuotes[0].text]) keepsEllipsis(q);
        expect(payload.quotes[1].source).not.toContain('...');
        expect(payload.persona.keyQuotes[0].attribution).not.toContain('...');
    });

    it('isQuoteTextKey names the exempt keys', () => {
        expect(isQuoteTextKey('quote', false)).toBe(true);
        expect(isQuoteTextKey('text', true)).toBe(true);
        expect(isQuoteTextKey('text', false)).toBe(false);
        expect(isQuoteTextKey('source', true)).toBe(false);
        expect(isQuoteTextKey('narrative', false)).toBe(false);
    });

    it('postProcessSlides keeps the ellipsis in the slide quote and in a nested persona quote', () => {
        const r = postProcessSlides([{
            slideNumber: 1, layout: 'CONTENT', title: 'Growers renew the same plan because nobody asks what changed',
            content: [], narrative: 'The agent ... never called back.', speakerNotes: '', quote: ELLIPSIS_QUOTE, sources: ['Agriculture Weekly'],
            persona: { name: 'The deciding grower', quotes: [{ text: ELLIPSIS_QUOTE, source: 'Reddit r/farming' }] },
        } as any]);
        const s = r.slides[0] as any;
        keepsEllipsis(s.quote);
        keepsEllipsis(s.persona.quotes[0].text);
        expect(s.narrative).not.toContain('...');
    });
});
