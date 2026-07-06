// 2026-07-03 slides-imagery uplift (owner-directed ideal-deck parity): photographic image
// variants on cover/agenda/numbered-themes/role-needs. Pins (a) the variant activates when its
// carrier is filled, (b) fail-open: image-free payloads render the base anatomy unchanged,
// (c) registry contracts carry the photo styles the resolver forwards.
import { describe, it, expect } from 'vitest';
import { composeSlide } from './slideComposer';
import { imageSpecFor } from './artifactImageSlots';

const PNG = 'data:image/png;base64,AAAA';

describe('slides-imagery uplift - composer variants', () => {
    it('cover with backgroundImage renders full-bleed photo + scrim + white title', () => {
        const html = composeSlide('cover', { title: 'T', subtitle: 'S', backgroundImage: PNG }, 'nxt')!;
        expect(html).toContain(PNG);
        expect(html).toContain('object-fit:cover');
        expect(html).toContain('linear-gradient');
    });

    it('cover without backgroundImage is the unchanged dark canvas (fail-open)', () => {
        const html = composeSlide('cover', { title: 'T', subtitle: 'S' }, 'nxt')!;
        expect(html).not.toContain('linear-gradient');
        expect(html).not.toContain('<img');
    });

    it('agenda with backgroundImage renders the scene + translucent group panels', () => {
        const html = composeSlide('agenda', {
            title: 'What we cover', backgroundImage: PNG,
            groups: [{ label: 'A', items: ['01: x'] }, { label: 'B', items: ['02: y'] }],
        }, 'nxt')!;
        expect(html).toContain(PNG);
        expect(html).toContain('rgba(');   // scrim + translucent panels
    });

    it('numbered-themes with itemImages renders one cover-cropped thumb per item', () => {
        const items = [1, 2, 3, 4].map((n) => ({ number: `0${n}`, name: `N${n}`, body: 'b', quote: 'q' }));
        const html = composeSlide('numbered-themes', { title: 'T', items, itemImages: [PNG, PNG, PNG, PNG] }, 'nxt')!;
        expect((html.match(/object-fit:cover/g) || []).length).toBe(4);
    });

    it('numbered-themes without itemImages keeps the base text anatomy', () => {
        const items = [1, 2, 3, 4].map((n) => ({ number: `0${n}`, name: `N${n}`, body: 'b', quote: 'q' }));
        const html = composeSlide('numbered-themes', { title: 'T', items }, 'nxt')!;
        expect(html).not.toContain('<img');
    });

    it('role-needs with portraitImage renders the portrait-led card', () => {
        const payload = {
            eyebrow: 'E', title: 'T', portraitImage: PNG,
            challenges: [{ numeral: '01', heading: 'H', body: 'B' }],
            persona: { needsLabel: 'PERSONA NEEDS', name: 'P', needs: [{ kind: 'EXPERIENCE', body: 'x' }] },
        };
        const html = composeSlide('role-needs', payload, 'nxt')!;
        expect(html).toContain(PNG);
        expect(html).toContain('object-fit:cover');
    });

    it('registry carries the photographic contracts', () => {
        expect(imageSpecFor('slides:cover')).toMatchObject({ carrier: 'backgroundImage', style: 'photo-background', wired: true });
        expect(imageSpecFor('slides:agenda')).toMatchObject({ carrier: 'backgroundImage', style: 'photo-background' });
        expect(imageSpecFor('slides:numbered-themes')).toMatchObject({ carrier: 'itemImages', style: 'photo-scene', elementField: 'items', max: 4 });
        expect(imageSpecFor('slides:role-needs')).toMatchObject({ carrier: 'portraitImage', style: 'photo-portrait' });
    });
});
