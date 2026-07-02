// E4 guard tests (artifact-total-elevation-2026-07-02): the native infographic lane derives its
// spec from the ELEMENT'S OWN data, content-true or nothing. These tests pin the derivation
// contract + the retirement of the memphis-iso diffusion lane.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { infographicSpecFrom } from './artifactIllustrator';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('infographicSpecFrom - content-true derivation (E4)', () => {
    it('3+ actions derive a process-flow (recommendation mechanism)', () => {
        const spec = infographicSpecFrom({
            actions: ['Stand up the advising pod', 'Migrate the intake form', 'Retire the shadow spreadsheet'],
        }, 'ignored');
        expect(spec).not.toBeNull();
        expect(spec!.kind).toBe('process-flow');
        expect((spec!.steps as Array<{ name: string }>).map(s => s.name)).toContain('Migrate the intake form');
    });

    it('fewer than 3 steps is NOT enough for a process-flow', () => {
        const spec = infographicSpecFrom({ steps: ['One', 'Two'] }, '');
        expect(spec).toBeNull();
    });

    it('object-shaped steps resolve via name/title/label fields', () => {
        const spec = infographicSpecFrom({
            coherentActions: [{ title: 'Consolidate the CRM' }, { name: 'Train the officers' }, { label: 'Sunset legacy exports' }],
        }, '');
        expect(spec?.kind).toBe('process-flow');
    });

    it('beforeAfter with 2+ points per side derives a comparison', () => {
        const spec = infographicSpecFrom({
            beforeAfter: {
                before: { points: ['Manual data entry', 'Fragmented records'] },
                after: { points: ['Single donor record', 'Automated gift entry'] },
            },
        }, '');
        expect(spec?.kind).toBe('comparison');
        expect((spec!.left as any).points).toHaveLength(2);
    });

    it('2+ labeled kpi tiles derive a stat-row carrying quote + source through', () => {
        const spec = infographicSpecFrom({
            kpiTiles: [
                { label: 'Advisor load', value: 'ONE FOR MANY', quote: 'I am the only advisor for the whole college.', source: 'Reddit r/NEU' },
                { label: 'Record state', value: 'FRAGMENTED' },
            ],
        }, '');
        expect(spec?.kind).toBe('stat-row');
        const stats = spec!.stats as Array<Record<string, unknown>>;
        expect(stats[0].source).toBe('Reddit r/NEU');
    });

    it('citations across 2+ source types derive an evidence-mix composition', () => {
        const spec = infographicSpecFrom({
            citations: ['Reddit: r/highereducation', 'Higher Ed Dive: Retention analysis', 'client-charter.pdf'],
        }, '');
        expect(spec?.kind).toBe('composition');
        const labels = (spec!.segments as Array<{ label: string }>).map(s => s.label);
        expect(labels).toContain('Social');
        expect(labels).toContain('External research');
    });

    it('citations all of ONE type do NOT force a composition (needs a real mix)', () => {
        const spec = infographicSpecFrom({
            citations: ['Higher Ed Dive: A', 'Chronicle: B', 'EdSurge: C'],
        }, '');
        expect(spec).toBeNull();
    });

    it('EMPTY BEATS INVENTED: an element with no structurable substance returns null', () => {
        expect(infographicSpecFrom({ title: 'A theme with prose only', narrative: 'words' }, 'a concept')).toBeNull();
        expect(infographicSpecFrom(undefined, 'a concept')).toBeNull();
        expect(infographicSpecFrom('just a string', '')).toBeNull();
    });

    it('the authored concept never substitutes for element data (no scene descriptions)', () => {
        // A rich concept string with an empty element must still yield NO panel.
        expect(infographicSpecFrom({}, 'advancement officers celebrating a major gift, isometric')).toBeNull();
    });
});

describe('E4 retirement wiring (source asserts)', () => {
    const illus = src('services/artifactIllustrator.ts');
    const router = src('services/visualRouter.ts');
    const proxy = src('proxy/app.py');

    it('the native branch posts /api/ai/diagram chromeless, never fetches /api/ai/brand-image', () => {
        expect(illus).toContain("/api/ai/diagram");
        expect(illus).toContain("spec['chrome'] = 'none'");
        // retirement comments may NAME the old endpoint; no fetch may CALL it
        expect(illus).not.toMatch(/fetch\([^)]*brand-image/);
    });

    it('the router resolves legacy emotive audits to the native infographic branch', () => {
        expect(router).toContain("audit === 'emotive' || audit === 'infographic'");
        expect(router).toMatch(/branch:\s*'infographic'/);
    });

    it('the proxy brand-image endpoint is retired (deprecated stub, no generation)', () => {
        const idx = proxy.indexOf('@app.post("/api/ai/brand-image")');
        expect(idx).toBeGreaterThan(-1);
        const stub = proxy.slice(idx, idx + 1500);
        expect(stub).toContain('RETIRED');
        expect(proxy).not.toContain('def _brand_image_prompt');
        expect(proxy).not.toContain('_BRANDIMG_STYLES');
    });

    it('the diagram renderer carries the five infographic families', () => {
        const render = src('proxy/nxt_diagram_render.py');
        for (const fam of ['stat-row', 'process-flow', 'comparison', 'ranked-bars', 'composition']) {
            expect(render).toContain(`"${fam}"`);
        }
        expect(render).toContain('_chromeless_shell');
        expect(render).toContain('_INFO_BODIES');
    });
});
