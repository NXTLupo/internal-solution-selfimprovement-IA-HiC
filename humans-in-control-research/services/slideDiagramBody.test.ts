import { describe, it, expect } from 'vitest';
import { slideDataToStageHtml } from './slideToStageHtml';

// 2026-06-27 - The flat-image diagram path (diagramImage -> <img>) is RETIRED. journey-map renders
// the canonical GOLD swimlane MATRIX (Figma 595:2 / 595:5): actor lanes x phase columns, filled
// cells, hairline grid. A diagramImage on the slide is ignored - the matrix is always the body.
describe('journey-map renders the GOLD swimlane matrix (flat-image path retired)', () => {
    const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const journey = (extra: any) => ({ template: 'journey-map', brand: 'nxt', title: 'Donor journey', journeyMap: { stages: [{ name: 'Awareness' }, { name: 'Gift' }], lanes: [{ actor: 'Donor', cells: ['a', 'b'] }] }, ...extra } as any);

    it('renders the swimlane matrix grid', () => {
        const html = slideDataToStageHtml(journey({}));
        expect(html).toContain('class="jmgrid"');
        expect(html).not.toContain('class="diagram-body"');
    });
    it('ignores a stale diagramImage and still renders the matrix (flat-image retired)', () => {
        const html = slideDataToStageHtml(journey({ diagramImage: img }));
        expect(html).toContain('class="jmgrid"');
        expect(html).not.toContain('class="diagram-body"');
        expect(html).not.toContain(img);
    });
});
