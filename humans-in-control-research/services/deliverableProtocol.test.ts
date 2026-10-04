// 2026-10-01 (plan R-T2 / Stage 4.1, audit A5): the 18-template slide protocol is injected
// per turn, not on every call. Pins the size and content of each mode. The response-mode
// rules legitimately MENTION the fence syntax in instructions; what must not ride along are
// the per-template EXAMPLE BLOCKS (a fence line followed by its JSON body).
import { describe, it, expect } from 'vitest';
import { deliverableProtocolFor, requestedSlideTemplates } from './corpusChatService';

const exampleBlock = (name: string) => new RegExp(`\\n:::slide template=${name}\\s*\\n\\s*\\{`);

describe('deliverableProtocolFor', () => {
    const full = deliverableProtocolFor('all');
    it('plain chat carries only the response-mode rules (no example blocks)', () => {
        const none = deliverableProtocolFor('none');
        expect(none.length).toBeLessThan(full.length * 0.35);
        expect(none).not.toMatch(exampleBlock('persona-card'));
        expect(none).not.toContain('SLIDE OUTPUT PROTOCOL - 18 TEMPLATES');
        expect(none).toContain('RESPONSE MODE');
    });
    it('deck mode carries no GOLD template example blocks (DECK MODE supplies the archetype catalog)', () => {
        const deck = deliverableProtocolFor('deck');
        expect(deck).not.toMatch(exampleBlock('persona-card'));
        expect(deck).not.toContain('SLIDE OUTPUT PROTOCOL - 18 TEMPLATES');
    });
    it('a single-template request carries only that template example block (prd-feature is retired: #prd is document-first)', () => {
        const one = deliverableProtocolFor({ templates: ['persona-card'] });
        expect(one).toMatch(exampleBlock('persona-card'));
        expect(one).not.toMatch(exampleBlock('competitive-matrix'));
        expect(one).not.toMatch(exampleBlock('gap-matrix'));
        expect(one).toContain('DECOMPOSITION RULE');          // shared rules stay
        expect(full).not.toMatch(exampleBlock('prd-feature'));
        expect(one.length).toBeLessThan(full.length * 0.65);
    });
    it('theme family: asking for theme-overview keeps the theme sibling examples', () => {
        const th = deliverableProtocolFor({ templates: ['theme-overview'] });
        expect(th).toMatch(exampleBlock('theme-overview'));
        expect(th).toMatch(exampleBlock('theme-arc'));
        expect(th).not.toMatch(exampleBlock('gap-matrix'));
    });
    it('requestedSlideTemplates returns every catalog hit in a multi-hashtag message', () => {
        const hits = requestedSlideTemplates('#gap #personas #slides on retention');
        expect(hits).toContain('gap-matrix');
        expect(hits).toContain('persona-card');
    });
    it('the full protocol is what artifact requests without a resolvable template still get', () => {
        expect(full.length).toBeGreaterThan(deliverableProtocolFor({ templates: ['prd-feature'] }).length);
    });
});
