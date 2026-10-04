/** deckPlanGate.test.ts (WS-3b) - the strategic-visual governance invariants. */
import { describe, it, expect } from 'vitest';
import {
    evaluateDeckPlan, buildDeckRepairInstruction, remapSurplusArchetypes, numberedThemesToEvidenceTable,
    noteDeckPlanVerdict, readLastDeckPlanVerdict, verdictOf,
} from './deckPlanGate';

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

describe('Stage 2.1 (2026-10-01): deterministic remap of surplus numbered-themes', () => {
    const nt = (n: number) => `:::slide template=slides:numbered-themes brand=nxt\n${JSON.stringify({
        kicker: 'THEMES', title: `Theme group ${n} shows one pattern`,
        items: [
            { number: '01', name: `Subject ${n}A`, body: 'What it means for the team.', quote: 'A verbatim line from the source.' },
            { number: '02', name: `Subject ${n}B`, body: 'A second implication.', quote: '' },
            { number: '03', name: `Subject ${n}C`, body: 'A third implication.', quote: 'Another verbatim line.' },
        ],
        sourceLine: 'Sources: Higher Ed Dive; Reddit r/NEU',
    })}\n:::\n`;

    it('maps every item to a named evidence-table row without inventing text', () => {
        const out = numberedThemesToEvidenceTable(JSON.parse(nt(1).split('\n').slice(1, -2).join('\n')));
        expect(out.rows).toHaveLength(3);
        expect(out.rows[0]).toEqual({ subject: 'Subject 1A', prove: 'A verbatim line from the source.', implication: 'What it means for the team.', evidenceGrade: 'Verbatim' });
        expect(out.rows[1].evidenceGrade).toBe('');       // no quote, no invented grade
        expect(out.columns).toHaveLength(4);
        expect(out.sourceLine).toBe('Sources: Higher Ed Dive; Reddit r/NEU');
        expect(out.takeaway).toEqual({ label: 'Pattern', statement: 'Theme group 1 shows one pattern' });
    });

    it('rewrites only the fences beyond the clamp and leaves the first two alone', () => {
        const deck = fence('slides:cover') + nt(1) + fence('slides:flow-arc') + nt(2) + fence('slides:quadrant') + nt(3) + nt(4);
        const r = remapSurplusArchetypes(deck);
        expect(r.remapped.map(x => x.index)).toEqual([5, 6]);
        expect(r.remapped.every(x => x.to === 'slides:evidence-table')).toBe(true);
        const after = evaluateDeckPlan(r.text);
        expect(after.archetypeCounts['slides:numbered-themes']).toBe(2);
        expect(after.archetypeCounts['slides:evidence-table']).toBe(2);
        expect(after.violations.some(v => v.includes('max 2'))).toBe(false);
        expect(JSON.parse(r.text.split(':::slide template=slides:evidence-table brand=nxt\n')[1].split('\n:::')[0]).rows[0].subject).toBe('Subject 3A');
    });

    it('leaves a fence whose JSON does not parse untouched', () => {
        const deck = nt(1) + nt(2) + ':::slide template=slides:numbered-themes brand=nxt\n{not json\n:::\n';
        const r = remapSurplusArchetypes(deck);
        expect(r.remapped).toHaveLength(0);
        expect(r.text).toBe(deck);
    });

    it('records one verdict per turn for the AIR patch to read', () => {
        noteDeckPlanVerdict(null);
        expect(readLastDeckPlanVerdict()).toBeNull();
        const plan = evaluateDeckPlan(fence('slides:cover') + nt(1) + nt(2) + nt(3) + fence('slides:quadrant'));
        noteDeckPlanVerdict(verdictOf(plan, 'deterministic_remap', [{ index: 3, from: 'slides:numbered-themes', to: 'slides:evidence-table' }]));
        const v = readLastDeckPlanVerdict();
        expect(v?.resolution).toBe('deterministic_remap');
        expect(v?.remapped).toHaveLength(1);
        expect(v?.violations.length).toBe(plan.violations.length);
        noteDeckPlanVerdict(null);
    });
});
