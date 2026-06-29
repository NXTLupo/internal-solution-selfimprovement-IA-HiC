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

    it('paints a per-peer emblem on the competitive prose table when peerImages is present', () => {
        const img = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; // tiny stub data-URI
        const html = slideDataToStageHtml({
            template: 'competitive-matrix',
            brand: 'nxt',
            title: 'Where peers prove the model',
            matrix: {
                rowsProse: [
                    { name: 'Acme', tier: 'top', prove: 'They prove X', implication: 'So Y', evidenceTag: 'Src A' },
                    { name: 'Globex', tier: 'second', prove: 'They prove Z', implication: 'So W', evidenceTag: 'Src B' },
                ],
                // index-aligned to rowsProse (resolver carrier)
                peerImages: [img, img],
            },
        } as any);
        const glyphs = html.match(/class="etglyph"/g) || [];
        expect(glyphs.length).toBe(2);            // emblem survives the top/second filter, indexed correctly
        expect(html).toContain('data:image/svg+xml;base64,');
    });

    it('omits the peer emblem cleanly when peerImages is absent (no broken img)', () => {
        const html = slideDataToStageHtml({
            template: 'competitive-matrix',
            brand: 'nxt',
            title: 'No emblems here',
            matrix: {
                rowsProse: [
                    { name: 'Acme', tier: 'top', prove: 'X', implication: 'Y', evidenceTag: 'A' },
                    { name: 'Globex', tier: 'second', prove: 'Z', implication: 'W', evidenceTag: 'B' },
                ],
            },
        } as any);
        expect(html).not.toContain('class="etglyph"'); // no peer-emblem <img> when the carrier is absent (CSS rule may still exist)
    });

    it('paints a per-feature emblem on the prd-feature card when featureImages is present', () => {
        // 2026-06-28 carrier-to-renderer sync: registry prd-feature carrier featureImages
        // (icon branch), index-aligned to features, painted in the grid path .fglyph.
        const img = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
        const html = slideDataToStageHtml({
            template: 'prd-feature',
            brand: 'nxt',
            title: 'Three features ship this quarter',
            prdFeature: {
                features: [
                    { name: 'Inline diffing', priority: 'must', userStory: 'As a dev I see changes', acceptanceCriteria: ['a'] },
                    { name: 'Audit log', priority: 'should', userStory: 'As an admin I trace edits', acceptanceCriteria: ['b'] },
                    { name: 'Export', priority: 'could', userStory: 'As a PM I export', acceptanceCriteria: ['c'] },
                ],
                featureImages: [img, img, img],
            },
        } as any);
        const glyphs = html.match(/class="fglyph"/g) || [];
        expect(glyphs.length).toBe(3);
        expect(html).toContain('data:image/svg+xml;base64,');
    });

    it('paints a per-feature emblem on the prd-feature DENSE card (deep path) when featureImages is present', () => {
        const img = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
        const html = slideDataToStageHtml({
            template: 'prd-feature',
            brand: 'nxt',
            title: 'Two deep features',
            prdFeature: {
                features: [
                    { name: 'Inline diffing', priority: 'must', userStory: 'As a dev I see changes side by side', acceptanceCriteria: ['a', 'b', 'c'] },
                    { name: 'Audit log', priority: 'should', userStory: 'As an admin I trace every edit', acceptanceCriteria: ['d', 'e', 'f'] },
                ],
                featureImages: [img, img],
            },
        } as any);
        const glyphs = html.match(/class="pdglyph"/g) || [];
        expect(glyphs.length).toBe(2);  // routes to the dense/deep twin and paints both
    });

    it('omits the prd-feature emblem cleanly when featureImages is absent', () => {
        const html = slideDataToStageHtml({
            template: 'prd-feature',
            brand: 'nxt',
            title: 'No emblems',
            prdFeature: {
                features: [
                    { name: 'Inline diffing', priority: 'must', userStory: 'x', acceptanceCriteria: ['a'] },
                    { name: 'Audit log', priority: 'should', userStory: 'y', acceptanceCriteria: ['b'] },
                ],
            },
        } as any);
        expect(html).not.toContain('class="fglyph"');
        expect(html).not.toContain('class="pdglyph"');
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
        // No thumbnail ROW renders (the .jmthumb CSS rule is always defined; the cell is not).
        expect(html).not.toContain('class="jmthumb"');
        // No per-phase thumbnail imgs (lane actor icons may still render via laneIcon).
        expect(html).not.toContain('class="jmti"');
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
        // Exactly two phases have art -> exactly two thumbnail <img> tags (lane icons excluded).
        expect((html.match(/class="jmti"/g) || []).length).toBe(2);
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
        expect((html.match(/class="jmti"/g) || []).length).toBe(1);
    });
});
