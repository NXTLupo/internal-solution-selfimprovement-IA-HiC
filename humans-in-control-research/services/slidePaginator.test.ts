import { describe, it, expect } from 'vitest';
import { paginateSlide, paginateSlides } from './slidePaginator';

const stages10 = Array.from({ length: 10 }, (_, i) => ({ name: `Phase ${i + 1}`, critical: i === 2 }));
const lanes = [
    { actor: 'Customer', role: 'end user', cells: Array.from({ length: 10 }, (_, i) => `customer act ${i + 1}`) },
    { actor: 'Agent', role: 'tier 1', cells: Array.from({ length: 10 }, (_, i) => `agent act ${i + 1}`) },
];

describe('slidePaginator', () => {
    it('decomposes a 10-phase journey into overview + continuation, no stage dropped', () => {
        const pages = paginateSlide({
            id: 's1', template: 'journey-map', title: 'The journey breaks at the handoffs',
            journeyMap: {
                stages: stages10, lanes,
                painPoints: Array.from({ length: 10 }, (_, i) => `pain ${i + 1}`),
                personas: ['p1', 'p2'], kpiTiles: [{ label: 'KEY', value: 'Routed' }],
                keyInsight: 'the synthesis',
            },
        });
        expect(pages.length).toBe(2);
        const total = pages.reduce((n, p) => n + p.journeyMap.stages.length, 0);
        expect(total).toBe(10);
        // overview keeps dashboard + insight; continuation does not
        expect(pages[0].journeyMap.personas).toBeDefined();
        expect(pages[0].journeyMap.keyInsight).toBe('the synthesis');
        expect(pages[1].journeyMap.personas).toBeUndefined();
        expect(pages[1].title).toContain('part 2 of 2');
        // lane cells align to each page's stages
        expect(pages[0].journeyMap.lanes[0].cells.length).toBe(pages[0].journeyMap.stages.length);
        expect(pages[1].journeyMap.lanes[0].cells[0]).toBe('customer act 6');
        expect(pages[1].journeyMap.painPoints[0]).toBe('pain 6');
        // unique ids
        expect(pages[0].id).not.toBe(pages[1].id);
    });

    it('decomposes 10 themes into clusters of 4 with patternSignal on page 1 only', () => {
        const themes = Array.from({ length: 10 }, (_, i) => ({ name: `T${i + 1}`, insight: 'x', source: 'S' }));
        const pages = paginateSlide({ id: 's2', template: 'theme-cluster', title: 'Themes converge', themeCluster: { themes, patternSignal: 'the pattern' } });
        expect(pages.length).toBe(3);
        expect(pages.reduce((n, p) => n + p.themeCluster.themes.length, 0)).toBe(10);
        expect(pages[0].themeCluster.patternSignal).toBe('the pattern');
        expect(pages[1].themeCluster.patternSignal).toBeUndefined();
    });

    it('caps deep PRD features at 2 per slide', () => {
        const features = Array.from({ length: 5 }, (_, i) => ({
            name: `F${i + 1}`, priority: 'must', userStory: 'As a user...',
            acceptanceCriteria: ['a', 'b', 'c'],
        }));
        const pages = paginateSlide({ id: 's3', template: 'prd-feature', title: 'Features', prdFeature: { features } });
        expect(pages.length).toBe(3);
        expect(pages[0].prdFeature.features.length).toBe(2);
        expect(pages.reduce((n, p) => n + p.prdFeature.features.length, 0)).toBe(5);
    });

    it('moves overflow case-study evidence to an evidence-stack continuation', () => {
        const evidence = Array.from({ length: 6 }, (_, i) => ({ quote: `q${i + 1}`, source: 'S' }));
        const pages = paginateSlide({ id: 's4', template: 'case-study', title: 'Zappos rebuilt loyalty', caseStudy: { subject: 'Zappos', evidence, lesson: 'L' } });
        expect(pages.length).toBe(2);
        expect(pages[0].caseStudy.evidence.length).toBe(3);
        expect(pages[1].caseStudy.variant).toBe('evidence-stack');
        expect(pages[1].caseStudy.evidence.length).toBe(3);
        expect(pages[1].title).toContain('evidence continued');
    });

    it('repeats the subject row on every competitive-matrix page', () => {
        const rows = [{ name: 'Subject Co', scores: [1] }, ...Array.from({ length: 14 }, (_, i) => ({ name: `Peer ${i + 1}`, scores: [3] }))];
        const pages = paginateSlide({ id: 's5', template: 'competitive-matrix', title: 'Peers separate', matrix: { columns: ['Cap'], rows, subjectRow: 'Subject Co' } });
        expect(pages.length).toBeGreaterThan(1);
        for (const p of pages) expect(p.matrix.rows[0].name).toBe('Subject Co');
    });

    it('leaves slides under ceilings untouched', () => {
        const s = { id: 's6', template: 'theme-cluster', title: 'T', themeCluster: { themes: [{ name: 'a' }, { name: 'b' }] } };
        expect(paginateSlide(s)).toEqual([s]);
        expect(paginateSlides([s]).length).toBe(1);
    });
});
