// E1 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, Stage 2.2; vision phases 3 + 9).
// Manifest pointers ("[articles/exs-clockwork/5af374bb9c.md#c3]") shipped as visible text on the
// PPTX export surface: slideDataToStageHtml handed slides:* payloads to composeSlide untouched and
// composeSlide has no .md#c handling. These tests pin the ONE chokepoint that now runs on every
// slide before dispatch, with the shipped payload shapes from the audit: a quadrant sourceLine
// carrying two pointers, a numbered-themes quote carrying a trailing pointer with commentary, and
// a GOLD recommendation whose `sources` array and evidence source carry pointers.
import { describe, it, expect, beforeAll } from 'vitest';
import { slideDataToStageHtml, scrubCitationPointersDeep } from './slideToStageHtml';
import { registerPageMeta } from './citationPointerRegistry';

const P1 = 'articles/exs-clockwork/5af374bb9c.md#c3';
const P2 = 'articles/hunt-scanlon/9d2f0e11aa.md#c7';
const LABEL1 = 'Clockwork: Executive search trends for 2026 (Mar 2026)';
const LABEL2 = 'Hunt Scanlon: Search firms adopt AI sourcing (Feb 2026)';
const RAW_POINTER_RE = /[\w./\\-]+\.md#c\d+/i;

beforeAll(() => {
    // The registry resolves pointers from page provenance registered at corpus-assembly time.
    registerPageMeta('articles/exs-clockwork/5af374bb9c.md', { title: 'Executive search trends for 2026', sourceName: 'Clockwork', date: '2026-03-04' });
    registerPageMeta('articles/hunt-scanlon/9d2f0e11aa.md', { title: 'Search firms adopt AI sourcing', sourceName: 'Hunt Scanlon', date: '2026-02-11' });
});

describe('E1 pointer chokepoint: slides:* archetype payloads', () => {
    it('replaces both pointers in a quadrant sourceLine with the named, dated labels', () => {
        const slide: any = {
            template: 'slides:quadrant',
            brand: 'nxt',
            title: 'Retained firms split on AI sourcing',
            composerPayload: {
                kicker: 'Market map',
                title: 'Retained firms split on AI sourcing',
                xAxis: 'AI adoption',
                yAxis: 'Fee pressure',
                quadrants: [
                    { title: 'Boutique adopters', items: ['Fast shortlists'] },
                    { title: 'Global holdouts', items: ['Relationship-led'] },
                    { title: 'Price fighters', items: ['Contingent model'] },
                    { title: 'Specialists', items: ['Sector depth'] },
                ],
                subjects: [{ label: 'Firm A', quadrant: 1 }, { label: 'Firm B', quadrant: 2 }],
                sourceLine: `Sources: [${P1}], [${P2}]`,
            },
        };
        const html = slideDataToStageHtml(slide);
        expect(html).not.toMatch(RAW_POINTER_RE);
        expect(html).not.toContain('5af374bb9c');
        expect(html).not.toContain('9d2f0e11aa');
        expect(html).toContain(LABEL1);
        expect(html).toContain(LABEL2);
    });

    it('strips a trailing pointer with bracket commentary from a numbered-themes quote', () => {
        const items = [1, 2, 3, 4].map(n => ({
            number: `0${n}`,
            name: `Theme ${n}`,
            body: 'Boutiques win mandates on turnaround speed.',
            quote: n === 1
                ? `We lost two mandates to a boutique this quarter. [${P1}, paraphrased from theme]`
                : 'Clients now ask for the shortlist in a week.',
        }));
        const html = slideDataToStageHtml({
            template: 'slides:numbered-themes',
            brand: 'nxt',
            title: 'Four pressures reshape retained search',
            composerPayload: { kicker: 'Themes', title: 'Four pressures reshape retained search', items, sourceLine: `[${P2}]` },
        } as any);
        expect(html).not.toMatch(RAW_POINTER_RE);
        expect(html).not.toContain('paraphrased from theme');
        expect(html).toContain('We lost two mandates to a boutique this quarter.');
        expect(html).toContain(LABEL2);
    });
});

describe('E1 pointer chokepoint: GOLD templates', () => {
    const slide: any = {
        template: 'recommendation',
        brand: 'nu',
        title: 'Bring sourcing research in-house before the next mandate cycle',
        sources: [`[${P1}]`, 'Hunt Scanlon'],
        recommendation: {
            actionTitle: 'Bring sourcing research in-house',
            rationale: `Boutiques already run their own research desks [${P2}].`,
            supportingActions: [
                { name: 'Hire two researchers', description: 'Staff the desk before the Q3 mandates land.' },
                { name: 'License one database', description: 'Replace the three overlapping subscriptions.' },
            ],
            evidence: [
                { text: 'We lost two mandates to a boutique this quarter.', attribution: 'Partner, retained search', source: P1 },
            ],
            implication: 'The research desk becomes the fee defence.',
        },
    };

    it('resolves pointers in the sources[] footer and the evidence source, and strips them from prose', () => {
        const html = slideDataToStageHtml(slide);
        expect(html).not.toMatch(RAW_POINTER_RE);
        expect(html).toContain(LABEL1);
        expect(html).toContain('Hunt Scanlon');
        expect(html).toContain('Boutiques already run their own research desks.');
    });

    it('never mutates the caller\'s slide object', () => {
        const before = JSON.stringify(slide);
        slideDataToStageHtml(slide);
        expect(JSON.stringify(slide)).toBe(before);
    });
});

describe('scrubCitationPointersDeep (unit)', () => {
    it('treats prose and source-type fields differently and leaves carriers alone', () => {
        const out: any = scrubCitationPointersDeep({
            body: `Fees fell after the pilot [${P1}].`,
            sourceLine: `[${P1}]`,
            source: P2,
            sources: [`[${P2}]`, 'Reddit: r/recruiting'],
            imageUrl: 'data:image/svg+xml;utf8,<svg>articles/x.md#c1</svg>',
            portrait: 'https://cdn.example.org/people/5af374bb9c.md#c3',
            nested: { quote: `Speed wins. [${P2}, paraphrased]`, attribution: `[${P1}]` },
        });
        expect(out.body).toBe('Fees fell after the pilot.');
        expect(out.sourceLine).toBe(LABEL1);
        expect(out.source).toBe(LABEL2);
        expect(out.sources).toEqual([LABEL2, 'Reddit: r/recruiting']);
        expect(out.imageUrl).toBe('data:image/svg+xml;utf8,<svg>articles/x.md#c1</svg>');
        expect(out.portrait).toBe('https://cdn.example.org/people/5af374bb9c.md#c3');
        expect(out.nested.quote).toBe('Speed wins.');
        expect(out.nested.attribution).toBe(LABEL1);
    });

    it('does not echo a label the source line already names, and drops nothing else', () => {
        const out: any = scrubCitationPointersDeep({ sourceLine: `Source: Clockwork: Executive search trends for 2026 (Mar 2026) [${P1}]` });
        expect(out.sourceLine).toBe('Source: Clockwork: Executive search trends for 2026 (Mar 2026)');
        const plain: any = scrubCitationPointersDeep({ title: 'README.md is not a pointer', n: 3, ok: true });
        expect(plain).toEqual({ title: 'README.md is not a pointer', n: 3, ok: true });
    });

    it('never leaks an unregistered pointer path, even when no label resolves', () => {
        const out: any = scrubCitationPointersDeep({ sourceLine: '[sources/client-uploads/0f9e8d7c6b.md#c12]', body: 'Churn rose. [sources/client-uploads/0f9e8d7c6b.md#c12]' });
        expect(out.sourceLine).not.toMatch(RAW_POINTER_RE);
        expect(out.body).toBe('Churn rose.');
    });
});
