import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { slideDataToStageHtml } from './slideToStageHtml';

// Render the user's REAL insurance themes through the actual export renderer so
// we can see exactly what Figma tokens/patterns the theme-cluster slide applies.
// Field mapping (Theme[] -> theme-cluster slide payload) mirrors the #themes
// generation: name->name, description->insight, quote->evidence, citation->source.
describe('render insurance themes (visual check harness)', () => {
    it('emits a theme-cluster stage HTML from the on-disk themes.json', () => {
        const root = resolve(__dirname, '..');
        const raw = JSON.parse(readFileSync(resolve(root,
            'hic-workspace/wiki/engagements/deliver-a-strategic-outlook-report-on-the-global-insurance-i/themes.json'), 'utf-8'));
        const all: any[] = raw?.data?.themes || [];
        // Top 4 by rank (renderer caps theme-cluster at 4 columns).
        const top = [...all].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 4);
        const srcName = (t: any): string => {
            const c = Array.isArray(t.citations) && t.citations[0] ? t.citations[0] : null;
            if (!c) return 'Source';
            const sf = String(c.sourceName || c.sourceFile || '').replace(/^articles\//, '').replace(/\/.+$/, '').replace(/-/g, ' ');
            return (sf || 'Source').slice(0, 40);
        };
        const slide = {
            template: 'theme-cluster',
            brand: 'nxt',
            title: 'Emerging themes — Global Insurance 2026',
            themeCluster: {
                themes: top.map(t => ({
                    name: String(t.name || '').slice(0, 90),
                    insight: String(t.description || '').slice(0, 200),
                    evidence: String(t.quote || (t.citations?.[0]?.text) || '').slice(0, 220),
                    source: srcName(t),
                })),
                patternSignal: 'Reconstructed from stored Theme[] to show the renderer styling.',
            },
        };
        const html = slideDataToStageHtml(slide as any);
        expect(html.length).toBeGreaterThan(500);
        writeFileSync(resolve(root, 'themes_render_check.html'), html, 'utf-8');
        // Surface what tokens actually landed in the output for a quick text check.
        const usesChartreuse = html.includes('#B8B800');
        const usesSaira = html.includes('Saira Condensed');
        const usesPlexMono = html.includes('IBM Plex Mono');
        console.log(`[themes-render] chartreuse(#B8B800)=${usesChartreuse} Saira=${usesSaira} IBMPlexMono=${usesPlexMono} | themes=${slide.themeCluster.themes.length}`);
        console.log(`[themes-render] theme names: ${slide.themeCluster.themes.map(t => t.name.slice(0,40)).join(' | ')}`);
    });
});
