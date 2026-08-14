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
