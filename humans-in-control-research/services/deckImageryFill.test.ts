/** deckImageryFill fence parsing (2026-08-14). The live e2e proof caught the
 *  brand-attribute miss: fences arrive as ":::slide template=slides:x brand=nxt".
 *  Network calls are stubbed; this pins PARSING + payload injection only. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fillDeckImagery } from './deckImageryFill';

const CATALOG = { illustrations: [
    { id: 'a1', concept: 'research teams use talent intelligence platforms to build candidate maps', url: '/hic-workspace/wiki/design-system/illustrations/a1.png' },
] };

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: any) => {
        if (String(url).includes('/api/ai/illustrations')) return { ok: true, json: async () => CATALOG } as any;
        return { ok: true, json: async () => ({ url: '/hic-workspace/wiki/design-system/illustrations/gen.png' }) } as any;
    }));
});

describe('fillDeckImagery fence parsing', () => {
    it('fills a fence that carries a brand attribute (the live-proof regression)', async () => {
        const deck = ':::slide template=slides:block-quote brand=nxt\n{"quote":"Research teams use talent intelligence platforms to build candidate maps in hours.","attributionRole":"Search research lead"}\n:::';
        const { text, report } = await fillDeckImagery(deck, { generationBudget: 1 });
        expect(report.filled).toBe(1);
        expect(text).toContain('panelImage');
    });

    it('reuses a catalog match instead of generating', async () => {
        const deck = ':::slide template=slides:block-quote brand=nxt\n{"quote":"Research teams use talent intelligence platforms to build candidate maps in hours."}\n:::';
        const { report } = await fillDeckImagery(deck, { generationBudget: 1 });
        expect(report.reused).toBe(1);
        expect(report.generated).toBe(0);
    });

    it('fills per-item scenes on numbered-themes and respects the budget', async () => {
        const deck = ':::slide template=slides:numbered-themes brand=nxt\n{"items":[{"heading":"Alpha topic","body":"Analysts map warm paths"},{"heading":"Beta topic","body":"Boards screen for judgment"}]}\n:::';
        const { text, report } = await fillDeckImagery(deck, { generationBudget: 1 });
        expect(report.filled).toBeGreaterThanOrEqual(1);
        expect(text).toContain('itemImages');
    });

    it('leaves a deck without image-capable archetypes untouched', async () => {
        const deck = ':::slide template=slides:stat-row brand=nxt\n{"title":"x"}\n:::';
        const { text, report } = await fillDeckImagery(deck, {});
        expect(report.filled).toBe(0);
        expect(text).toBe(deck);
    });
});
