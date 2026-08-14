/** deckPlanGate.test.ts (WS-3b) - the strategic-visual governance invariants. */
import { describe, it, expect } from 'vitest';
import { evaluateDeckPlan, buildDeckRepairInstruction } from './deckPlanGate';

const fence = (t: string) => `:::slide template=${t} brand=nxt\n{"title":"x"}\n:::\n`;

describe('deckPlanGate', () => {
    it('ignores non-deck replies', () => {
        expect(evaluateDeckPlan('plain prose answer').isDeck).toBe(false);
        expect(evaluateDeckPlan(fence('slides:cover') + fence('slides:stat-row')).isDeck).toBe(false);
    });
    it('passes a varied visual deck', () => {
        const deck = [
            'slides:cover', 'slides:agenda', 'slides:means-matters', 'slides:flow-arc',
            'slides:numbered-themes', 'slides:evidence-table', 'slides:section-divider',
            'slides:quadrant', 'slides:block-quote', 'slides:thesis-interstitial',
        ].map(fence).join('');
        const r = evaluateDeckPlan(deck);
        expect(r.pass).toBe(true);
        expect(r.visualRatio).toBeGreaterThanOrEqual(0.4);
    });
    it('fails a text-column rut and names the conversions', () => {
        const deck = [
            'slides:cover', 'slides:numbered-themes', 'slides:block-quote', 'slides:org-model',
            'slides:role-needs', 'slides:block-quote', 'slides:role-recommendation',
            'slides:problem-diptych', 'slides:role-roadmap',
        ].map(fence).join('');
        const r = evaluateDeckPlan(deck);
        expect(r.pass).toBe(false);
        expect(r.violations.join(' ')).toContain('floor 40%');
        expect(buildDeckRepairInstruction(r)).toContain('composition gate');
    });
    it('flags adjacency and the numbered-themes clamp', () => {
        const deck = [
            'slides:cover', 'slides:numbered-themes', 'slides:numbered-themes',
            'slides:numbered-themes', 'slides:stat-row', 'slides:evidence-table',
            'slides:flow-arc', 'slides:quadrant',
        ].map(fence).join('');
        const r = evaluateDeckPlan(deck);
        expect(r.violations.some(v => v.includes('twice in a row'))).toBe(true);
        expect(r.violations.some(v => v.includes('max 2'))).toBe(true);
    });
    it('flags connective padding', () => {
        const deck = [
            'slides:cover', 'slides:agenda', 'slides:section-divider', 'slides:thesis-interstitial',
            'slides:section-divider', 'slides:scene', 'slides:means-matters', 'slides:flow-arc',
        ].map(fence).join('');
        const r = evaluateDeckPlan(deck);
        expect(r.violations.some(v => v.includes('connective'))).toBe(true);
    });
});

// 2026-08-14 - imagery uplift C2: images are a separate currency from viz.
describe('image quota floor (colleague defect RC2)', () => {
    const deckOf = (...templates: string[]) =>
        templates.map(t => `:::slide template=${t}\n{"title":"x"}\n:::`).join('\n');

    it('a table-heavy deck PASSES the visual floor but FAILS an image floor', () => {
        const deck = deckOf(
            'slides:cover', 'slides:agenda',
            'slides:evidence-table', 'slides:stat-row', 'slides:ranked-bars',
            'slides:evidence-table', 'slides:stat-row', 'slides:ranked-bars',
        );
        const noFloor = evaluateDeckPlan(deck, {});
        expect(noFloor.violations.some(v => v.includes('imagery'))).toBe(false);
        const withFloor = evaluateDeckPlan(deck, { imageQuotaFloor: 0.5 });
        expect(withFloor.imageFloorApplied).toBe(0.5);
        expect(withFloor.violations.some(v => v.includes('image-capable'))).toBe(true);
    });

    it('an image-capable plan at the floor passes', () => {
        const deck = deckOf(
            'slides:cover', 'slides:numbered-themes', 'slides:role-needs',
            'slides:block-quote', 'slides:evidence-table', 'slides:stat-row',
            'slides:infographic-exhibit', 'slides:ranked-bars',
        );
        const r = evaluateDeckPlan(deck, { imageQuotaFloor: 0.5 });
        expect(r.violations.some(v => v.includes('image-capable'))).toBe(false);
    });
});
