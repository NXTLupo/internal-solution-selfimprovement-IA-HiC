/**
 * 2026-10-21: the brief-card archetype composes with and without its picture panel and carries all four blocks.
 */
import { describe, it, expect } from 'vitest';
import { composeSlide } from './slideComposer';

const payload = {
    kicker: '01 NORTHEASTERN',
    title: 'A clearer path into co-op readiness',
    subtitle: 'Create one coherent experience that helps students understand what to do, when to do it, and where to get support.',
    blocks: [
        { label: 'OBJECTIVE', body: 'Improve student readiness and make early support more proactive, while keeping advisors central to the experience.' },
        { label: 'APPROACH', body: 'Define a focused readiness journey, align it with the Student Hub and Student 360, and turn requirements into practical, bite-sized releases.' },
        { label: 'STATUS', body: 'Discovery and requirements work are active; the team is finalizing readiness definitions, data needs, and the first product requirements.' },
        // "front door" is on the banned-metaphor list and the composer rewrites it; the test body stays literal.
        { label: 'BUSINESS VALUE', body: 'A simpler starting point for students, earlier intervention for advisors, and a foundation that can expand across the co-op journey.' },
    ],
    sourceLine: 'Source: Current Initiatives Portfolio Narrative',
};

describe('slides:brief-card', () => {
    it('renders the four labeled blocks without a picture', () => {
        const html = composeSlide('brief-card', payload, 'nxt' as any);
        expect(html).toBeTruthy();
        // visible text: short hyphenated words ("co-op") ride a nowrap span since 2026-10-26
        const text = String(html).replace(/<span style="white-space:nowrap">([^<]*)<\/span>/g, '$1');
        for (const b of payload.blocks) {
            expect(text).toContain(b.label);
            expect(text).toContain(b.body.slice(0, 40));
        }
        expect(text).toContain('A clearer path into co-op readiness');
        expect(html).toContain('<span style="white-space:nowrap">co-op</span>');
        expect(html).not.toContain('<img');
    });

    it('renders the picture panel when heroImage is present', () => {
        const html = composeSlide('brief-card', { ...payload, heroImage: 'data:image/jpeg;base64,/9j/4AAQ' }, 'nxt' as any);
        expect(html).toBeTruthy();
        expect(html).toContain('data:image/jpeg;base64,/9j/4AAQ');
        expect(html).toContain('BUSINESS VALUE');
    });
});
