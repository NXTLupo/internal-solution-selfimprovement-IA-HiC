import { describe, it, expect } from 'vitest';
import { slideDataToStageHtml } from './slideToStageHtml';

// 2026-07-01 (D17, owner-chosen) - a journey-map slide renders the native GOLD swimlane MATRIX by
// default, BUT when a full-bleed exhibit image (diagramImage) is attached it renders WALL-TO-WALL as
// that single 16:9 picture (the image already carries the full GOLD exhibit, composed natively by the
// proxy). This reverses the 2026-06-27 "flat-image retired" decision per the owner's D17 call.
describe('journey-map: native matrix by default, full-bleed image when attached', () => {
    const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const journey = (extra: any) => ({ template: 'journey-map', brand: 'nxt', title: 'Donor journey', journeyMap: { stages: [{ name: 'Awareness' }, { name: 'Gift' }], lanes: [{ actor: 'Donor', cells: ['a', 'b'] }] }, ...extra } as any);

    it('renders the swimlane matrix grid when no diagram image is attached', () => {
        const html = slideDataToStageHtml(journey({}));
        expect(html).toContain('class="jmgrid"');
        expect(html).not.toContain(img);
    });
    it('renders the attached diagram image wall-to-wall (matrix suppressed)', () => {
        const html = slideDataToStageHtml(journey({ diagramImage: img }));
        expect(html).toContain(img);
        expect(html).not.toContain('class="jmgrid"');
    });
});
