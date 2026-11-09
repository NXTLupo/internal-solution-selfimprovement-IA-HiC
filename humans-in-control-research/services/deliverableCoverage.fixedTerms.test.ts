/**
 * 2026-10-20 (root-cause audit A7, plan item 9): the coverage softener changed facts ("1-year" -> "multi-year", years
 * deleted, "by 9%" -> "by few", "64%" -> "about half"). A year, a year range and an "N-year" term are fixed terms
 * and stay as written; a measure of change drops the measure; a majority is never "about half"; and a figure inside
 * a fill unit's verbatim quote is never touched, in the quote or in the heading the quote sources.
 */
import { describe, it, expect } from 'vitest';
import { softenFigures, runCoverageContract, deckCoverageDoc, figuresSourced } from './deliverableCoverage';
import type { LedgerItem, LedgerArea } from './engagementLedger';

describe('softenFigures keeps fixed terms and does not change facts', () => {
    it('leaves "N-year" terms, years and year ranges as they are', () => {
        expect(softenFigures('1-year members churn before the second renewal')).toBe('1-year members churn before the second renewal');
        expect(softenFigures('The 2024 cohort abandons onboarding at the second step')).toBe('The 2024 cohort abandons onboarding at the second step');
        expect(softenFigures('2024 cohort members renew less often')).toBe('2024 cohort members renew less often');
        expect(softenFigures('Renewals for 2024-25 slipped after the pricing change')).toBe('Renewals for 2024-25 slipped after the pricing change');
        expect(softenFigures('Onboarding changed in FY2026 and again in Q3 2026')).toBe('Onboarding changed in FY2026 and again in Q3 2026');
    });

    it('a majority is never "about half"; a measure of change drops the measure instead of taking a quantifier', () => {
        expect(softenFigures('64% abandon the form at the address step')).toBe('A majority abandon the form at the address step');
        expect(softenFigures('Retention fell by 9% after the redesign')).toBe('Retention fell after the redesign');
        expect(softenFigures('Renewals rose by 12 points in 2025')).toBe('Renewals rose in 2025');
        for (const s of ['64% abandon the form', 'Retention fell by 9% after the redesign']) expect(softenFigures(s)).not.toMatch(/\d|about half|by few/);
    });

    it('the live run 7 strings still soften as before', () => {
        expect(softenFigures('Advisor AI fluency lags a 95%-adopted student baseline')).toBe('Advisor AI fluency lags a widely adopted student baseline');
        expect(softenFigures('Students draw an ethical line at AI authorship: 80% refuse to claim AI work')).toBe('Students draw an ethical line at AI authorship: most refuse to claim AI work');
    });
});

describe('a fill unit with a verbatim quote keeps the figures the quote carries', () => {
    const item = (over: Partial<LedgerItem>): LedgerItem => ({
        id: 'FB-1', type: 'feedback', item: '64% abandon the form at the address step', statement: '64% abandon the form at the address step.',
        quote: 'In our test 64% abandon the form at the address step.', sourceName: 'Client document: Intake usability memo', pointer: 'articles/client-uploads/memo.md#c4',
        documentTitle: 'Intake usability memo', featureArea: 'AREA-1', label: 'request', sources: [], ...over,
    });
    const areas: LedgerArea[] = [{ id: 'AREA-1', label: 'Intake form', items: 1 }];

    it('keeps 64% in the quote and in the heading the quote sources; softens the same heading when the quote lacks it', async () => {
        const sourced = item({});
        sourced.sources = [{ quote: sourced.quote, sourceName: sourced.sourceName, pointer: sourced.pointer, documentTitle: sourced.documentTitle }];
        expect(figuresSourced(sourced.item, sourced.quote)).toBe(true);
        const r1 = await runCoverageContract(deckCoverageDoc('deck', [], { idPrefix: 'fill' }), [sourced], areas);
        expect(r1.filled).toHaveLength(1);
        expect(r1.filled[0].quote).toBe('In our test 64% abandon the form at the address step.');
        expect(r1.filled[0].heading).toContain('64%');
        expect(r1.filled[0].source).toContain('Intake usability memo');

        const unsourced = item({ quote: 'Growers stop at the address step and call us instead.' });
        unsourced.sources = [{ quote: unsourced.quote, sourceName: unsourced.sourceName, pointer: unsourced.pointer, documentTitle: unsourced.documentTitle }];
        const r2 = await runCoverageContract(deckCoverageDoc('deck', [], { idPrefix: 'fill' }), [unsourced], areas);
        expect(r2.filled[0].quote).toBe('Growers stop at the address step and call us instead.');
        // Unsourced: the heading never shows the figure, and never misstates it as "about half"; the quote carries the entry.
        expect(r2.filled[0].heading).not.toMatch(/\d|about half/);
    });

    it('a "1-year" item name and a year survive the fill heading unchanged', async () => {
        const li = item({ id: 'FB-2', item: '1-year members churn before the 2025 renewal', statement: '1-year members churn before the 2025 renewal.', quote: 'Most first-year members do not come back for the renewal.' });
        li.sources = [{ quote: li.quote, sourceName: li.sourceName, pointer: li.pointer, documentTitle: li.documentTitle }];
        const r = await runCoverageContract(deckCoverageDoc('deck', [], { idPrefix: 'fill' }), [li], areas);
        expect(r.filled[0].heading).toBe('1-year members churn before the 2025 renewal');
    });
});
