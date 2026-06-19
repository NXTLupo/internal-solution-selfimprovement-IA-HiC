import { describe, it, expect } from 'vitest';
import { slideDataToStageHtml } from './slideToStageHtml';

// Regression guards for the 2026-06-15 deck export bugs (RC4):
//  - label glued to value in the NATIVE pptx flatten ("Pattern signalThree...",
//    "ImplicationEvery...") because the only separation was CSS margin-right,
//    which is lost when Playwright flattens HTML into pptx text runs.
//  - source attributions riding inside tight journey list items getting
//    word-cut ("...skill optimization (Vanguard").
//  - a complete recommendation actionTitle cut 1 char short by a 110 budget.

describe('slideDataToStageHtml export twin (RC4)', () => {
    it('separates the Pattern signal label from its value with a real character', () => {
        const html = slideDataToStageHtml({
            template: 'theme-arc',
            brand: 'nxt',
            title: 'Self-improvement runs three loops',
            themeCluster: {
                themes: [
                    { name: 'A critic agent watches the data', insight: 'A critic sub-agent evaluates freshness.', evidence: 'because you have this critic around it.', source: 'Vanguard Working Session', signal: 'Stale data is flagged' },
                ],
                patternSignal: 'Three loops compound: the critic catches problems, humans correct them.',
            },
        } as any);
        // The glue bug produced "Pattern signalThree"; the fix inserts a space.
        expect(html).not.toMatch(/Pattern signal<\/span>Three/);
        expect(html).not.toContain('Pattern signalThree');
        expect(html).toContain('</span> ');
    });

    it('strips an inline source attribution from a journey pain item', () => {
        const html = slideDataToStageHtml({
            template: 'journey-map',
            brand: 'nxt',
            title: 'A developer build view',
            sources: ['Vanguard Working Session'],
            journeyMap: {
                stages: [{ name: 'Ingest' }, { name: 'Build' }, { name: 'Ship' }],
                lanes: [{ actor: 'Developer', role: 'builds', cells: ['a', 'b', 'c'] }],
                overallPainPoints: [
                    'One improved artifact does not improve future runs without skill optimization (Vanguard Working Session)',
                ],
            },
        } as any);
        // The "(Vanguard Working Session)" tail must be gone, and the pain must
        // survive as a complete thought (not cut at "(Vanguard").
        expect(html).not.toContain('(Vanguard Working Session)');
        expect(html).not.toMatch(/\(Vanguard\b(?!\sWorking)/);
        expect(html).toContain('without skill optimization');
    });

    it('renders a 111-char actionTitle complete (no 1-char truncation)', () => {
        const title = "Ship a working demo plus a short enterprise deck that answers 'how does this work in an enterprise environment?'";
        const html = slideDataToStageHtml({
            template: 'recommendation',
            brand: 'nxt',
            title: 'Build the demoable version',
            recommendation: {
                actionTitle: title,
                rationale: 'The enterprise sponsor will ask how it works.',
                supportingActions: [{ name: 'Demo', description: 'Stand up a working version.' }],
            },
        } as any);
        expect(html).toContain('enterprise environment');
    });

    // 2026-06-17: per-phase illustration thumbnails (illustrator-agent output)
    // for the journey img-slots. The renderer adds a thumbnail row ONLY when at
    // least one phase carries an image, so the >99% of journeys with no art
    // render identically to before (no-regression empty-state guard).
    it('omits the thumbnail row entirely when no phase carries an image', () => {
        const html = slideDataToStageHtml({
            template: 'journey-map',
            brand: 'nxt',
            title: 'A developer build view',
            journeyMap: {
                stages: [{ name: 'Ingest' }, { name: 'Build' }, { name: 'Ship' }],
                lanes: [{ actor: 'Developer', role: 'builds', cells: ['a', 'b', 'c'] }],
            },
        } as any);
        expect(html).not.toContain('jmthumb');
        expect(html).not.toContain('<img');
    });

    it('renders a thumbnail per phase from phaseImages[] aligned to stages[]', () => {
        const html = slideDataToStageHtml({
            template: 'journey-map',
            brand: 'nxt',
            title: 'A developer build view',
            journeyMap: {
                stages: [{ name: 'Ingest' }, { name: 'Build' }, { name: 'Ship' }],
                lanes: [{ actor: 'Developer', role: 'builds', cells: ['a', 'b', 'c'] }],
                phaseImages: [
                    'https://cdn.example/ingest.png',
                    '',                                   // a phase with no art -> empty cell, no <img>
                    'data:image/png;base64,AAAA',
                ],
            },
        } as any);
        expect(html).toContain('jmthumb');
        expect(html).toContain('src="https://cdn.example/ingest.png"');
        expect(html).toContain('src="data:image/png;base64,AAAA"');
        // Exactly two phases have art -> exactly two <img> tags.
        expect((html.match(/<img\b/g) || []).length).toBe(2);
    });

    it('accepts a per-stage image carrier as an alternative to phaseImages[]', () => {
        const html = slideDataToStageHtml({
            template: 'journey-map',
            brand: 'nxt',
            title: 'A developer build view',
            journeyMap: {
                stages: [{ name: 'Ingest', image: 'https://cdn.example/a.png' }, { name: 'Build' }],
                lanes: [{ actor: 'Developer', role: 'builds', cells: ['a', 'b'] }],
            },
        } as any);
        expect(html).toContain('jmthumb');
        expect(html).toContain('src="https://cdn.example/a.png"');
        expect((html.match(/<img\b/g) || []).length).toBe(1);
    });
});
