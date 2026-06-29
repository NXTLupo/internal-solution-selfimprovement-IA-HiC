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

// 2026-06-28 TWIN-SYNC GUARD. The export twin (slideToStageHtml) and the React
// fallback twin (goldPreviews) must agree on which carriers they paint, or the
// preview diverges from the export + Figma. The per-theme emotive thumbnail
// (Figma 590:9 per-card slot 895:338..340) and the per-recommendation panel
// (Figma 678:5526) were synced into goldPreviews this session; this hermetic
// source-parse guard (same approach as figmaRegistryParity) keeps them painted.
describe('twin-sync: goldPreviews paints the per-element image carriers slideToStageHtml does', () => {
    const root = resolve(__dirname, '..');
    const gold = readFileSync(resolve(root, 'components/slideTemplates/goldPreviews.tsx'), 'utf-8');
    const stage = readFileSync(resolve(root, 'services/slideToStageHtml.ts'), 'utf-8');

    it('goldPreviews has a per-theme ThemeThumb twin of slideToStageHtml themeThumb()', () => {
        expect(stage).toContain('function themeThumb(');           // export twin
        expect(gold).toContain('const ThemeThumb');                // React twin helper
        // painted in every themes layout that has a Figma per-card slot
        const paints = (gold.match(/<ThemeThumb /g) || []).length;
        expect(paints, 'ThemeThumb painted in overview/cluster/arc/mosaic/detail (>=5)').toBeGreaterThanOrEqual(5);
    });

    it('goldPreviews RecommendationSlide paints r.panelImage like slideToStageHtml .recimg', () => {
        expect(stage).toContain('r.panelImage');                   // export twin paints it
        expect(gold).toContain('r.panelImage');                    // React twin paints it
    });

    it('goldPreviews keeps painting the already-synced peer/feature/persona carriers', () => {
        expect(gold).toContain('peerImages');                      // competitive
        expect(gold).toContain('featureImages');                   // prd-feature
        expect(gold).toMatch(/imageUrl/);                          // persona portrait
    });
});
