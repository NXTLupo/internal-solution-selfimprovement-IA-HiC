import { describe, it, expect } from 'vitest';
import { renderMetaThemesHtml, type MetaThemesOutput } from './metaThemesService';
import { renderMindMapHtml } from './mindMapRenderer';
import type { MindMapOutput, MindMapNode } from './mindMapArchitect';

// 2026-06-27 - De-hardcode + glyph-paint guard for the two standalone NotebookLM
// renderers. Previously both carried hand-keyed hex palettes + stale fonts (Bebas
// Neue / Roboto Condensed / Open Sans) and painted no glyph. These tests lock in:
//   (1) NO hardcoded brand hex literal in the SOURCE (colour resolves from tokens),
//   (2) NO stale font literal in the SOURCE,
//   (3) the tokenized glyph carrier is actually painted in the OUTPUT,
//   (4) the brand flip (NXT vs NU) flows through tokens (output differs).
// NB: the RENDERED output legitimately contains resolved token hex (that is what a
// token resolves TO); the de-hardcode guard is therefore against the SOURCE file,
// mirroring the vizSlot.test.ts "no hardcoded brand hex in source" pattern.

const STALE_FONTS = ['Bebas Neue', 'Roboto Condensed', 'Open Sans', 'JetBrains Mono'];

function readSource(rel: string): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs') as typeof import('node:fs');
    for (const c of [rel, `humans-in-control-research/${rel}`]) {
        try { return fs.readFileSync(c, 'utf8'); } catch { /* try next */ }
    }
    return '';
}

/** Strip the comment block + the comment markers so a font name mentioned only in a
 *  provenance comment ("replaced Bebas Neue") does not count as a live literal. */
function codeOnly(src: string): string {
    return src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function mtOut(): MetaThemesOutput {
    return {
        // canonical names carry resolvable concepts (automation / security risk) -> content-true glyphs
        themes: [
            { canonical_name: 'Automation Displaces Manual Work', summary: 'Repetitive tasks shift to automated pipelines.', engagement_count: 5, engagements: [{ slug: 'acme', theme_name: 'automation' }], is_platform_pattern: true, is_portfolio_pattern: true, sample_quotes: [] },
            { canonical_name: 'Security Risk Concentrates', summary: 'Risk pools where controls are weakest.', engagement_count: 3, engagements: [{ slug: 'globex', theme_name: 'risk' }], is_portfolio_pattern: true, is_platform_pattern: false, sample_quotes: [] },
        ],
        engagement_count: 8, portfolio_pattern_count: 2, platform_pattern_count: 1, generated_at: '2026-06-27T00:00:00Z',
    };
}

function mmOut(): MindMapOutput {
    const child = (id: string, label: string, type: MindMapNode['type']): MindMapNode => ({ id, label, type, children: [], chunk_ids: [], visual_treatment: 'normal' } as any);
    const root: MindMapNode = { id: 'root', label: 'How does AI change the funnel?', type: 'root', visual_treatment: 'normal', chunk_ids: [], children: [child('g1', 'Awareness', 'theme_group'), child('g2', 'Conversion', 'theme_group')] } as any;
    return { root, convergent_count: 1 } as any;
}

describe('metaThemesService source - de-hardcoded', () => {
    it('no 6-digit hex literal in source (colour from tokens)', () => {
        const code = codeOnly(readSource('services/metaThemesService.ts'));
        expect(code.length, 'could not locate metaThemesService.ts').toBeGreaterThan(0);
        expect(code.match(/#[0-9A-Fa-f]{6}\b/g) || []).toEqual([]);
    });
    it('no stale font literal in source', () => {
        const code = codeOnly(readSource('services/metaThemesService.ts'));
        for (const f of STALE_FONTS) expect(code).not.toContain(f);
    });
});

describe('renderMetaThemesHtml - glyph paint + brand flip', () => {
    it('paints a tokenized glyph per portfolio-pattern card', () => {
        const html = renderMetaThemesHtml({ output: mtOut(), brand: 'nxt' });
        const glyphs = html.match(/class="mt-glyph"/g) || [];
        expect(glyphs.length).toBe(2); // one per theme card
        expect(html).toContain('data:image/svg+xml;base64,');
    });
    it('brand flip flows through tokens (NXT vs NU differ)', () => {
        expect(renderMetaThemesHtml({ output: mtOut(), brand: 'nxt' }))
            .not.toBe(renderMetaThemesHtml({ output: mtOut(), brand: 'nu' }));
    });
});

describe('mindMapRenderer source - de-hardcoded', () => {
    it('no 6-digit hex literal in source (colour from tokens)', () => {
        const code = codeOnly(readSource('services/mindMapRenderer.ts'));
        expect(code.length, 'could not locate mindMapRenderer.ts').toBeGreaterThan(0);
        expect(code.match(/#[0-9A-Fa-f]{6}\b/g) || []).toEqual([]);
    });
    it('no stale font literal in source', () => {
        const code = codeOnly(readSource('services/mindMapRenderer.ts'));
        for (const f of STALE_FONTS) expect(code).not.toContain(f);
    });
});

describe('renderMindMapHtml - hub glyph + brand flip', () => {
    it('paints the central hub glyph as an HTML <img> overlay (native-picture-capturable in PPTX)', () => {
        const html = renderMindMapHtml({ output: mmOut(), brand: 'nxt', researchGoal: 'How does AI change the funnel?' });
        // HTML <img> (not SVG <image>) so the gold PPTX GEO walker emits a native picture placeholder
        expect(html).toContain('class="mm-hub-glyph"');
        expect(html).toContain('src="data:image/svg+xml;base64,');
        expect(html).not.toContain('<image href='); // hub is no longer baked into the SVG
    });
    it('brand flip flows through tokens (NXT vs NU differ)', () => {
        expect(renderMindMapHtml({ output: mmOut(), brand: 'nxt', researchGoal: 'x' }))
            .not.toBe(renderMindMapHtml({ output: mmOut(), brand: 'nu', researchGoal: 'x' }));
    });
});
