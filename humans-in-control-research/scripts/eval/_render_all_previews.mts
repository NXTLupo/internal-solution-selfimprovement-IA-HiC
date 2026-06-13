/**
 * Preview SSR harness (task #32). Server-renders every GoldFrame PREVIEW
 * component (goldPreviews.tsx + the three already-GOLD components in web.tsx)
 * with the same representative payloads the stage harness uses, at the native
 * 960x540 canvas, plus a contact sheet for one-shot visual audit.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'fs';
import { SLIDES } from './_render_all_templates.mts';
import {
    PersonaCardSlide, RecommendationSlide, ThemeClusterSlide, ThemeSpotlightSlide,
    ThemeArcSlide, ThemeMosaicSlide, CompetitiveMatrixSlide, BlockQuoteSlide,
    PrinciplesSlide, StatRowSlide, TimelineSlide, GapMatrixSlide,
    ArchitectureMapSlide, PrdFeatureSlide, SystemsInventorySlide,
} from '../../components/slideTemplates/goldPreviews';
import { CaseStudySlide, ServiceBlueprintSlide, JourneyMapSlide } from '../../components/slideTemplates/web';
import { getBrand } from '../../components/slideTemplates/brands';

const RENDERERS: Record<string, (s: any, brand: any) => React.ReactElement | null> = {
    'persona-card': (s, b) => React.createElement(PersonaCardSlide, { data: s.persona, sources: s.sources, brand: b, density: s.density }),
    'recommendation': (s, b) => React.createElement(RecommendationSlide, { title: s.title, data: s.recommendation, sources: s.sources, brand: b, density: s.density }),
    'theme-cluster': (s, b) => React.createElement(ThemeClusterSlide, { title: s.title, data: s.themeCluster, sources: s.sources, brand: b, density: s.density }),
    'theme-spotlight': (s, b) => React.createElement(ThemeSpotlightSlide, { title: s.title, data: s.themeCluster, sources: s.sources, brand: b, density: s.density }),
    'theme-arc': (s, b) => React.createElement(ThemeArcSlide, { title: s.title, data: s.themeCluster, sources: s.sources, brand: b, density: s.density }),
    'theme-mosaic': (s, b) => React.createElement(ThemeMosaicSlide, { title: s.title, data: s.themeCluster, sources: s.sources, brand: b }),
    'competitive-matrix': (s, b) => React.createElement(CompetitiveMatrixSlide, { title: s.title, data: s.matrix, sources: s.sources, brand: b, density: s.density }),
    'block-quote': (s, b) => React.createElement(BlockQuoteSlide, { data: s.quote, sources: s.sources, brand: b, density: s.density }),
    'principles': (s, b) => React.createElement(PrinciplesSlide, { title: s.title, data: s.principles, sources: s.sources, brand: b, density: s.density }),
    'stat-row': (s, b) => React.createElement(StatRowSlide, { title: s.title, data: s.statRow, sources: s.sources, brand: b, density: s.density }),
    'timeline': (s, b) => React.createElement(TimelineSlide, { title: s.title, data: s.timeline, sources: s.sources, brand: b, density: s.density }),
    'gap-matrix': (s, b) => React.createElement(GapMatrixSlide, { title: s.title, data: s.gapMatrix, sources: s.sources, brand: b, density: s.density }),
    'architecture-map': (s, b) => React.createElement(ArchitectureMapSlide, { title: s.title, data: s.architectureMap, sources: s.sources, brand: b, density: s.density }),
    'prd-feature': (s, b) => React.createElement(PrdFeatureSlide, { title: s.title, data: s.prdFeature, sources: s.sources, brand: b, density: s.density }),
    'systems-inventory': (s, b) => React.createElement(SystemsInventorySlide, { title: s.title, data: s.systemsInventory, sources: s.sources, brand: b, density: s.density }),
    'case-study': (s, b) => React.createElement(CaseStudySlide, { title: s.title, data: s.caseStudy, sources: s.sources, brand: b, density: s.density }),
    'service-blueprint': (s, b) => React.createElement(ServiceBlueprintSlide, { title: s.title, data: s.serviceBlueprint, sources: s.sources, brand: b, density: s.density }),
    'journey-map': (s, b) => React.createElement(JourneyMapSlide, { title: s.title, data: s.journeyMap, sources: s.sources, brand: b, density: s.density }),
};

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wght@200..900&family=Lora:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Bebas+Neue&display=swap';
const page = (body: string, title: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="${FONTS}">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh}.canvas{width:960px;height:540px;overflow:hidden;background:#fff}</style>
</head><body><div class="canvas">${body}</div></body></html>`;

mkdirSync('D:/tmp/all-previews', { recursive: true });
const files: string[] = [];
const fails: string[] = [];
for (const s of SLIDES) {
    if (s.template === 'section-divider') continue; // full-bleed component unchanged
    const fn = RENDERERS[s.template];
    if (!fn) { fails.push(`${s.template}: no renderer`); continue; }
    for (const brand of ['nxt', 'nu'] as const) {
        try {
            const el = fn(s, getBrand(brand));
            const html = renderToStaticMarkup(el as React.ReactElement);
            const fname = `${s.template}-${brand}${(s as any)._stress ? '-stress' : ''}.html`;
            writeFileSync(`D:/tmp/all-previews/${fname}`, page(html, fname));
            files.push(fname);
        } catch (e: any) {
            fails.push(`${s.template}/${brand}: ${e?.message || e}`);
        }
    }
}
const index = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#222;font-family:monospace}
.tile{display:inline-block;margin:8px;vertical-align:top}
.tile div{color:#ddd;font-size:11px;padding:2px}
iframe{border:1px solid #555}
</style></head><body>
${files.map(f => `<span class="tile"><div>${f}</div><iframe src="${f}" width="480" height="270" scrolling="no" style="width:960px;height:540px;transform:scale(0.5);transform-origin:top left;margin-bottom:-270px;margin-right:-480px"></iframe></span>`).join('\n')}
</body></html>`;
writeFileSync('D:/tmp/all-previews/index.html', index);
console.log(`previews rendered ${files.length}/${SLIDES.length - 1}`, fails.length ? `FAILURES: ${fails.join(' | ')}` : 'all ok');
