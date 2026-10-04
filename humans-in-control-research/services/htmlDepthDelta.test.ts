import { describe, it, expect } from 'vitest';
import { planHtmlExtension, mergeExtendedSections, visibleWordCount } from './htmlDepthDelta';

const words = (n: number, w = 'evidence') => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ');

const PRIOR = [
    '<main>',
    '<h1>Advisors lose students between the first two check-ins</h1>',
    `<h2>Where the drop happens</h2><p>${words(120)}</p>`,
    `<h2>Why the registrar cannot see it</h2><p>${words(20)}</p>`,
    `<h2>What the advising team changes first</h2><p>${words(15)}</p>`,
    '</main>',
].join('\n');

describe('htmlDepthDelta', () => {
    it('splits on headings and counts visible words without tags', () => {
        const sections = planHtmlExtension(PRIOR, 800).sections;
        expect(sections.map(s => s.heading)).toEqual(['', 'Advisors lose students between the first two check-ins', 'Where the drop happens', 'Why the registrar cannot see it', 'What the advising team changes first']);
        expect(visibleWordCount('<p>a b <b>c</b></p><script>x y z</script>')).toBe(3);
    });

    it('names the thin sections by heading and word count and anchors the prior answer verbatim', () => {
        const plan = planHtmlExtension(PRIOR, 800);
        expect(plan.thinSections.map(s => s.heading)).toEqual(['What the advising team changes first', 'Why the registrar cannot see it', 'Where the drop happens']);
        expect(plan.deltaPrompt).not.toContain('"Advisors lose students between the first two check-ins" (');
        const registrar = plan.sections.find(s => s.heading === 'Why the registrar cannot see it')!;
        expect(plan.deltaPrompt).toContain(`"Why the registrar cannot see it" (${registrar.words} words`);
        expect(plan.deltaPrompt).toContain('EXTEND IN PLACE');
        expect(plan.deltaPrompt).toContain(PRIOR);
        expect(plan.wordsBefore).toBe(visibleWordCount(PRIOR));
    });

    it('merges returned sections in place by heading, never shrinks a section, and appends unmatched ones', () => {
        const plan = planHtmlExtension(PRIOR, 800);
        const reply = [
            '```html',
            `<h2>Why the registrar cannot see it</h2><p>${words(140, 'registrar')}</p>`,
            `<h2>What the advising team changes first</h2><p>${words(5, 'short')}</p>`,
            `<h2>A section that was not asked for</h2><p>${words(30, 'extra')}</p>`,
            '```',
        ].join('\n');
        const merged = mergeExtendedSections(PRIOR, reply, plan);
        expect(merged.replaced).toBe(1);
        expect(merged.appended).toBe(1);
        expect(merged.html).toContain('registrar139');
        expect(merged.html).toContain(`<p>${words(15)}</p>`);          // the shrunken section kept the prior body
        expect(merged.html).toContain(`<p>${words(120)}</p>`);         // untouched section verbatim
        expect(merged.html.indexOf('extra0')).toBeLessThan(merged.html.indexOf('</main>'));
        expect(visibleWordCount(merged.html)).toBeGreaterThan(visibleWordCount(PRIOR));
    });

    it('returns the prior answer unchanged when the reply carries no headed section', () => {
        const plan = planHtmlExtension(PRIOR, 800);
        const merged = mergeExtendedSections(PRIOR, '<p>nothing structured</p>', plan);
        expect(merged).toEqual({ html: PRIOR, replaced: 0, appended: 0 });
    });
});
