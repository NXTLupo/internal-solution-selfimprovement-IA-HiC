import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 2026-06-16 - SLIDE CONTRACT PARITY GUARD.
// Root class behind the "#org -> No org tiers" bug: a slide template is defined in
// types.ts + the renderers + the generation protocol, but its PAYLOAD field is not
// carried at some OTHER layer (parseSlideBlocks dropped orgChart + executiveBrief).
// Each layer hand-maintains its own field list, so a new template silently breaks at
// whichever layer wasn't updated. This advisory guard fails CI when a template's
// payload field is missing from a consuming layer - so the next template can't drift.
//
// THE CONTRACT (single source of truth for this test): template -> payload field that
// every consuming layer must reference. When you add a slide template, add it here AND
// wire its payload at each layer below; this test tells you which layer you missed.
const TEMPLATE_PAYLOAD: Record<string, string> = {
    'persona-card': 'persona',
    'recommendation': 'recommendation',
    'theme-cluster': 'themeCluster',
    'theme-spotlight': 'themeCluster',
    'theme-arc': 'themeCluster',
    'theme-mosaic': 'themeCluster',
    'competitive-matrix': 'matrix',
    'block-quote': 'quote',
    'case-study': 'caseStudy',
    'principles': 'principles',
    'stat-row': 'statRow',
    'timeline': 'timeline',
    'section-divider': 'sectionDivider',
    'service-blueprint': 'serviceBlueprint',
    'gap-matrix': 'gapMatrix',
    'architecture-map': 'architectureMap',
    'prd-feature': 'prdFeature',
    'systems-inventory': 'systemsInventory',
    'org-chart': 'orgChart',
    'executive-brief': 'executiveBrief',
    'journey-map': 'journeyMap',
};

// services/ -> repo root for HiC is one level up.
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

// Layers that map a parsed slide's RAW PAYLOAD FIELD into the pipeline. Each MUST
// reference every template's payload field by name. NOTE: web.tsx render components
// receive an already-normalized `data` prop (SlideCanvas maps slide.orgChart -> data),
// so they do NOT reference the raw field name and are intentionally excluded here -
// SlideCanvas is the dispatch layer that carries the field. CorpusChatPanel is the
// chat render PARSER, the layer that actually dropped org-chart/executive-brief.
const CONSUMING_LAYERS = [
    'components/CorpusChatPanel.tsx',     // parse :::slide JSON -> SlideData
    'components/SlideCanvas.tsx',          // dispatch slide.<field> -> renderer data prop
    'services/slideToStageHtml.ts',        // 1920x1080 stage/export renderer (reads slide.<field>)
    'components/slideTemplates/pptx.ts',   // native PPTX exporter
];

describe('slide-template contract parity (drift guard)', () => {
    const typesSrc = read('components/slideTemplates/types.ts');
    // The SlideTemplate union is a discriminated union: `{ template: 'X'; data: Y }`.
    // Extract via the `template: '...'` discriminant so variant enums (variant: '...')
    // and other unions are NOT captured.
    const unionTemplates = Array.from(typesSrc.matchAll(/template:\s*'([a-z-]+)'/gm)).map(m => m[1]);
    const templates = Array.from(new Set(unionTemplates));

    it('every SlideTemplate union member has a payload-contract entry', () => {
        const missing = templates.filter(t => !(t in TEMPLATE_PAYLOAD));
        expect(missing, `templates missing from TEMPLATE_PAYLOAD (add them + wire each layer): ${missing.join(', ')}`).toEqual([]);
    });

    it('every payload field is referenced at every consuming layer (no silent drop)', () => {
        const failures: string[] = [];
        for (const layer of CONSUMING_LAYERS) {
            const src = read(layer);
            for (const [tpl, field] of Object.entries(TEMPLATE_PAYLOAD)) {
                if (!src.includes(field)) failures.push(`${layer} missing payload "${field}" (template ${tpl})`);
            }
        }
        expect(failures, `\n${failures.join('\n')}\n`).toEqual([]);
    });
});
