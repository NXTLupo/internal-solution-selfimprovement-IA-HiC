/**
 * 2026-10-06: artifact turns must not replay every earlier deck's slide JSON to the model (#recs took 13-15 minutes
 * on a 36-turn session with ~790K characters of history).
 */
import { describe, it, expect } from 'vitest';
import { compactHistoryForArtifactTurn } from './corpusChatService';

describe('compactHistoryForArtifactTurn', () => {
    const deck = (n: number) => Array.from({ length: n }, (_, i) => `:::slide template=recommendation brand=nxt\n{ "title": "Recommendation ${i + 1} title", "body": "${'x'.repeat(3000)}" }\n:::`).join('\n');
    const history: any[] = Array.from({ length: 30 }, (_, i) => (i % 2
        ? { role: 'assistant', content: `Here is the deck.\n${deck(8)}` }
        : { role: 'user', content: `#recs request ${i}` }));

    it('keeps the last 12 turns, collapses slide fences to titles, and shrinks history by an order of magnitude', () => {
        const before = history.reduce((n, m) => n + m.content.length, 0);
        const out = compactHistoryForArtifactTurn(history);
        const after = out.reduce((n, m) => n + String(m.content).length, 0);
        expect(out).toHaveLength(12);
        expect(after).toBeLessThan(before / 10);
        const a = out.find(m => m.role === 'assistant')!;
        expect(a.content).toMatch(/Earlier deliverable: 8 slides\. Titles: Recommendation 1 title \| Recommendation 2 title/);
        expect(a.content).not.toMatch(/:::slide/);
    });

    it('leaves short plain turns untouched', () => {
        const h: any[] = [{ role: 'user', content: 'What do advisors need?' }, { role: 'assistant', content: 'A shared readiness view.' }];
        expect(compactHistoryForArtifactTurn(h)).toEqual(h);
    });
});
