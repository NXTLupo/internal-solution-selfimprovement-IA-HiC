/** deckPlanGate.test.ts (WS-3b) - the strategic-visual governance invariants. */
import { describe, it, expect } from 'vitest';
import {
    evaluateDeckPlan, buildDeckRepairInstruction, remapSurplusArchetypes, numberedThemesToEvidenceTable,
    noteDeckPlanVerdict, readLastDeckPlanVerdict, verdictOf, measureDeckDensity, substanceOf, measureDeckExhibits, remapForDiagramFloor,
} from './deckPlanGate';

const fence = (t: string) => `:::slide template=${t} brand=nxt\n{"title":"x"}\n:::\n`;
// A body payload at consulting density: full sentences with manifest pointers (the 2026-10-23 density floor).
const SENT = 'The advising team re-keys every intake form into the CRM by hand, so a student waits a week for a reply [articles/higher-ed-dive/ab12cd34ef.md#c3].';
const dense = (t: string) => `:::slide template=${t} brand=nxt\n${JSON.stringify({ title: 'Advisors lose a week to manual intake', items: [1, 2, 3, 4].map(n => ({ name: `Subject ${n}`, body: SENT, quote: SENT })), sourceLine: 'Source: Higher Ed Dive [articles/higher-ed-dive/ab12cd34ef.md#c3]' })}\n:::\n`;

describe('deckPlanGate', () => {
    it('ignores non-deck replies', () => {
        expect(evaluateDeckPlan('plain prose answer').isDeck).toBe(false);
        expect(evaluateDeckPlan(fence('slides:cover') + fence('slides:stat-row')).isDeck).toBe(false);
    });
    it('passes a varied visual deck', () => {
        const deck = [
            'slides:cover', 'slides:agenda', 'slides:means-matters', 'slides:flow-arc',
            'slides:numbered-themes', 'slides:evidence-table', 'slides:section-divider',
            'slides:infographic-exhibit', 'slides:block-quote', 'slides:thesis-interstitial',
        ].map(t => (/cover|agenda|divider|interstitial/.test(t) ? fence(t) : dense(t))).join('');
        const r = evaluateDeckPlan(deck);
        expect(r.pass).toBe(true);
        expect(r.visualRatio).toBeGreaterThanOrEqual(0.4);
    });
    it('density floor (2026-10-23): bare-label body slides are named, dense ones pass', () => {
        const thinDeck = ['slides:cover', 'slides:means-matters', 'slides:flow-arc', 'slides:evidence-table', 'slides:quadrant', 'slides:block-quote'].map(fence).join('');
        const r = evaluateDeckPlan(thinDeck);
        expect(r.pass).toBe(false);
        const v = r.violations.find(x => x.includes('density floor'))!;
        expect(v).toContain('slide 2 slides:means-matters');
        expect(v).toContain('floor 380');
        const rows = measureDeckDensity(thinDeck);
        expect(rows).toHaveLength(5);
        expect(rows[0].chars).toBe(1);
        const dd = measureDeckDensity(dense('slides:numbered-themes'))[0];
        expect(dd.chars).toBeGreaterThan(520);
        expect(dd.pointers).toBe(9);
        expect(dd.quotes).toBe(4);
    });
    it('diagram floor (2026-10-23): six body slides need a native exhibit; a flowchart request needs a flowchart', () => {
        const noDiagram = ['slides:cover', 'slides:means-matters', 'slides:flow-arc', 'slides:numbered-themes', 'slides:evidence-table', 'slides:quadrant', 'slides:block-quote', 'slides:comparison-panels'].map(t => (/cover/.test(t) ? fence(t) : dense(t))).join('');
        const r = evaluateDeckPlan(noDiagram);
        expect(r.violations.some(v => v.startsWith('diagram floor'))).toBe(true);
        const r2 = evaluateDeckPlan(noDiagram, { requireFlowchart: true });
        expect(r2.violations.some(v => v.includes('asks for a flowchart'))).toBe(true);
        // the fallback draws the first step sequence as a flowchart exhibit
        const flowPayload = { kicker: 'K', title: 'Four hand-offs carry a student to placement', outcome: 'Placement confirmed on the record.', sourceLine: 'Source: X', steps: [1, 2, 3, 4].map(n => ({ title: `Step ${n} title`, description: `Step ${n} happens because the advisor acts; then the record updates.` })) };
        const flow = [':::slide template=slides:flow-arc brand=nxt', JSON.stringify(flowPayload), ':::', ''].join(String.fromCharCode(10));
        const d = remapForDiagramFloor(fence('slides:cover') + flow + dense('slides:evidence-table'));
        expect(d.remapped).toEqual([{ index: 1, from: 'slides:flow-arc', to: 'slides:infographic-exhibit' }]);
        const ex = measureDeckExhibits(d.text);
        expect(ex).toEqual({ exhibits: 1, flowcharts: 1, oversized: [] });
        const m = d.text.match(/:::slide template=slides:infographic-exhibit[^\n]*\n([\s\S]*?)\n:::/);
        const payload = JSON.parse(m![1]);
        expect(payload.nodes).toHaveLength(5);
        expect(payload.nodes[4]).toEqual({ id: 'out', label: 'Placement confirmed on the record.', kind: 'outcome' });
        expect(payload.edges).toHaveLength(4);
        expect(payload.edges[0].label).toBe('Step 1 happens because the advisor acts');
        expect(payload.steps).toHaveLength(4);
    });
    it('pointer floor: a corpus-grounded deck names the body slides that bind nothing', () => {
        const mixed = fence('slides:cover') + dense('slides:numbered-themes') + dense('slides:evidence-table') +
            `:::slide template=slides:flow-arc brand=nxt\n${JSON.stringify({ title: 'Unbound', steps: [1, 2, 3, 4].map(n => ({ title: `Step ${n}`, description: 'A complete sentence that names the actor and the mechanism in plain words without any pointer at all, long enough to pass the character floor for this archetype easily.' })) })}\n:::\n` +
            dense('slides:quadrant') + dense('slides:means-matters');
        const r = evaluateDeckPlan(mixed);
        const v = r.violations.find(x => x.includes('bind no manifest pointer'))!;
        expect(v).toContain('slide 4 slides:flow-arc');
        expect(substanceOf({ _provided: true, backgroundImage: 'data:image/png;base64,AAAA', title: 'Ten chars.' }).chars).toBe(10);
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

describe('flowchart legibility cap (2026-10-26)', () => {
    it('a flowchart over nine nodes is counted as oversized and flagged by the gate', () => {
        const flow = (n: number) => [':::slide template=slides:infographic-exhibit brand=nxt', JSON.stringify({ kicker: 'K', title: 'A readiness gap moves from student to staff to employer', nodes: Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `Step ${i}` })), edges: Array.from({ length: n - 1 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}`, label: 'then' })), sourceLine: 'Source: X' }), ':::', ''].join(String.fromCharCode(10));
        expect(measureDeckExhibits(flow(13)).oversized).toEqual([13]);
        expect(measureDeckExhibits(flow(8)).oversized).toEqual([]);
        const deck = (n: number) => fence('slides:cover') + ['slides:means-matters', 'slides:evidence-table', 'slides:quadrant', 'slides:block-quote', 'slides:comparison-panels'].map(t => dense(t)).join('') + flow(n);
        expect(evaluateDeckPlan(deck(13)).violations.join(' ')).toMatch(/carries 13 nodes/);
        expect(evaluateDeckPlan(deck(8)).violations.join(' ')).not.toMatch(/nodes; at more than/);
    });
});

describe('drawn floor (2026-10-27: "a workflow visualization for each slide")', () => {
    const fence = (t: string, body = '{"title":"x"}') => `:::slide template=${t} brand=nxt\n${body}\n:::`;
    it('counts only drawn visuals on research slides and ignores the attached ones', async () => {
        const { evaluateDeckPlan } = await import('./deckPlanGate');
        const research = ['slides:evidence-table', 'slides:means-matters', 'slides:block-quote', 'slides:comparison-panels', 'slides:flow-arc'].map(t => fence(t));
        const attached = ['slides:brief-card', 'slides:brief-card', 'slides:stat-row'].map(t => fence(t, '{"title":"ATTACHED portfolio"}'));
        const deck = [fence('slides:cover'), fence('slides:agenda'), ...research, ...attached].join('\n');
        const r = evaluateDeckPlan(deck, { drawnFloor: 0.6, isAttachedFence: f => f.includes('ATTACHED') });
        expect(r.violations.some(v => v.includes('1 of 5 research body slides carry a DRAWN visual'))).toBe(true);
        const drawnDeck = [fence('slides:cover'), ...['slides:flow-arc', 'slides:infographic-exhibit', 'slides:ranked-bars', 'slides:evidence-table', 'slides:quadrant'].map(t => fence(t)), ...attached].join('\n');
        expect(evaluateDeckPlan(drawnDeck, { drawnFloor: 0.6, isAttachedFence: f => f.includes('ATTACHED') }).violations.some(v => v.includes('DRAWN'))).toBe(false);
    });
});
