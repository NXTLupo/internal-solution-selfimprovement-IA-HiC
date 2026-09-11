/**
 * Tests for Algorithm 1 (CONSTRUCTCONTEXT) from "Less Context, Better Agents"
 * (arXiv 2606.10209v1), as implemented in contextEngineering.ts.
 *
 * The load-bearing test is PAIR INTEGRITY. Both Gemini and Anthropic reject a
 * tool RESULT whose originating tool CALL is missing from the request, so a
 * pruning policy that splits a pair does not degrade output quality, it makes
 * the API call fail outright. Every eviction must remove the call and its
 * response as a unit. That is the property worth a permanent regression guard.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    constructContext, geminiIsToolCall, geminiIsToolResponse, geminiSummaryMessage,
    geminiEvictedToText, DEFAULT_KEEP_WINDOW, DEFAULT_SUMMARY_WINDOW, SUMMARY_PREFIX,
} from './contextEngineering';

type G = { role?: string; parts?: any[] };

const userText = (t: string): G => ({ role: 'user', parts: [{ text: t }] });
const modelText = (t: string): G => ({ role: 'model', parts: [{ text: t }] });
const toolCall = (name: string, i: number): G =>
    ({ role: 'model', parts: [{ functionCall: { name, args: { q: `arg${i}` } } }] });
const toolResp = (name: string, body: string): G =>
    ({ role: 'user', parts: [{ functionResponse: { name, response: { result: body } } }] });

/** A realistic chat loop history: opening question, then `pairs` tool cycles. */
const buildHistory = (pairs: number): G[] => {
    const h: G[] = [userText('what are the trends in the corpus')];
    for (let i = 0; i < pairs; i += 1) {
        h.push(toolCall('fetch_wiki_articles', i));
        h.push(toolResp('fetch_wiki_articles', `article body ${i} `.repeat(50)));
    }
    return h;
};

const opts = (over: any = {}) => ({
    isToolCall: geminiIsToolCall,
    isToolResponse: geminiIsToolResponse,
    makeSummaryMessage: geminiSummaryMessage,
    ...over,
});

describe('constructContext: the paper defaults', () => {
    it('uses N=5 and W=3, the knee of both sensitivity curves (Appendix H)', () => {
        expect(DEFAULT_KEEP_WINDOW).toBe(5);
        expect(DEFAULT_SUMMARY_WINDOW).toBe(3);
    });
});

describe('constructContext: eviction arithmetic (Algorithm 1 lines 2-6)', () => {
    it('returns the history BY REFERENCE when tool count is at or under N', async () => {
        const h = buildHistory(5);
        const r = await constructContext(h, opts());
        expect(r.unchanged).toBe(true);
        expect(r.kept).toBe(h);          // same reference: zero copying on the common path
        expect(r.evictedCount).toBe(0);
        expect(r.evictedPairs).toBe(0);
    });

    it('evicts exactly (toolCount - N) pairs, oldest first', async () => {
        const r = await constructContext(buildHistory(8), opts({ summaryWindow: 0 }));
        expect(r.evictedPairs).toBe(3);          // 8 - 5
        expect(r.evictedCount).toBe(6);          // 3 pairs = 3 calls + 3 responses
        expect(r.kept).toHaveLength(1 + 5 * 2);  // opening question + 5 surviving pairs
        // the SURVIVORS are the most recent ones: arg3..arg7, never arg0..arg2
        const keptArgs = r.kept.flatMap(m => (m.parts || [])
            .filter((p: any) => p.functionCall).map((p: any) => p.functionCall.args.q));
        expect(keptArgs).toEqual(['arg3', 'arg4', 'arg5', 'arg6', 'arg7']);
    });

    it('treats keepWindow=Infinity as the paper C2 full-context baseline', async () => {
        const h = buildHistory(40);
        const r = await constructContext(h, opts({ keepWindow: Infinity }));
        expect(r.unchanged).toBe(true);
        expect(r.kept).toBe(h);
    });

    it('handles an empty or non-array history without throwing', async () => {
        expect((await constructContext([], opts())).kept).toEqual([]);
        expect((await constructContext(null as any, opts())).kept).toEqual([]);
    });
});

describe('constructContext: PAIR INTEGRITY (the API-breaking failure mode)', () => {
    /**
     * This is the regression guard that matters. A dropped-prefix prune leaves
     * an orphaned functionResponse, which Gemini rejects with a 400. Assert the
     * structural invariant directly rather than trusting the eviction count.
     */
    const assertPairsIntact = (kept: G[]) => {
        for (let i = 0; i < kept.length; i += 1) {
            if (!geminiIsToolResponse(kept[i])) continue;
            const prev = kept[i - 1];
            expect(
                prev !== undefined && geminiIsToolCall(prev),
                `orphaned tool response at index ${i}: no preceding tool call`,
            ).toBe(true);
        }
        // and no tool call may dangle without its response following it
        for (let i = 0; i < kept.length; i += 1) {
            if (!geminiIsToolCall(kept[i])) continue;
            const next = kept[i + 1];
            expect(
                next !== undefined && geminiIsToolResponse(next),
                `dangling tool call at index ${i}: no following tool response`,
            ).toBe(true);
        }
    };

    it('never orphans a tool response nor dangles a tool call, across many sizes', async () => {
        for (const pairs of [0, 1, 4, 5, 6, 7, 11, 25]) {
            const r = await constructContext(buildHistory(pairs), opts({ summaryWindow: 0 }));
            assertPairsIntact(r.kept);
        }
    });

    it('keeps pairs intact when a summary is ALSO inserted', async () => {
        const r = await constructContext(buildHistory(9), opts({
            summarize: async () => 'opened three articles, gathered pricing evidence',
        }));
        expect(r.summarized).toBe(true);
        assertPairsIntact(r.kept);
    });

    it('preserves interleaved plain text turns that are not tool traffic', async () => {
        const h: G[] = [
            userText('first question'),
            toolCall('t', 0), toolResp('t', 'r0'),
            modelText('interim thought'),
            toolCall('t', 1), toolResp('t', 'r1'),
            userText('follow-up question'),
            toolCall('t', 2), toolResp('t', 'r2'),
        ];
        const r = await constructContext(h, opts({ keepWindow: 1, summaryWindow: 0 }));
        const texts = r.kept.flatMap(m => (m.parts || [])
            .filter((p: any) => typeof p.text === 'string').map((p: any) => p.text));
        // every non-tool message survives; only tool pairs are evicted
        expect(texts).toEqual(['first question', 'interim thought', 'follow-up question']);
        expect(r.evictedPairs).toBe(2);
        assertPairsIntact(r.kept);
    });
});

describe('constructContext: summarization window W (Algorithm 1 lines 18-22)', () => {
    it('W=0 is pure pruning (paper C3): the summarizer is never called', async () => {
        const summarize = vi.fn();
        const r = await constructContext(buildHistory(9), opts({ summaryWindow: 0, summarize }));
        expect(summarize).not.toHaveBeenCalled();
        expect(r.summarized).toBe(false);
        expect(r.evictedPairs).toBe(4);
    });

    it('W=3 summarizes the 3 most recently evicted messages (paper C4)', async () => {
        const summarize = vi.fn(async (_evicted: G[]) => 'digest text');
        await constructContext(buildHistory(9), opts({ summaryWindow: 3, summarize }));
        expect(summarize).toHaveBeenCalledTimes(1);
        const slice = summarize.mock.calls[0][0];
        expect(slice).toHaveLength(3);
        // 4 pairs evicted (9-5) => E is [call0,resp0,...,call3,resp3]; last 3 are
        // resp2, call3, resp3 in chronological order.
        expect(geminiIsToolResponse(slice[0])).toBe(true);
        expect(geminiIsToolCall(slice[1])).toBe(true);
        expect((slice[1].parts as any)[0].functionCall.args.q).toBe('arg3');
        expect(geminiIsToolResponse(slice[2])).toBe(true);
    });

    it('W=-1 summarizes EVERY evicted message', async () => {
        const summarize = vi.fn(async (_evicted: G[]) => 'full digest');
        await constructContext(buildHistory(9), opts({ summaryWindow: -1, summarize }));
        expect(summarize.mock.calls[0][0]).toHaveLength(8); // 4 pairs
    });

    it('inserts the digest at the earliest evicted position, with the paper label', async () => {
        const r = await constructContext(buildHistory(7), opts({
            summarize: async () => 'gathered early evidence',
        }));
        // opening question stays first; digest takes the evicted pairs' old slot
        expect((r.kept[0].parts as any)[0].text).toBe('what are the trends in the corpus');
        expect((r.kept[1].parts as any)[0].text)
            .toBe(`${SUMMARY_PREFIX}gathered early evidence`);
        expect(r.kept[1].role).toBe('user');
    });

    it('degrades to pure pruning when the summarizer THROWS, never to full history', async () => {
        const r = await constructContext(buildHistory(9), opts({
            summarize: async () => { throw new Error('flash 503'); },
        }));
        expect(r.summarized).toBe(false);
        expect(r.evictedPairs).toBe(4);            // the prune still happened
        expect(r.kept).toHaveLength(1 + 5 * 2);    // no digest message inserted
    });

    it('degrades to pure pruning when the summarizer returns empty or whitespace', async () => {
        for (const bad of ['', '   ', '\n']) {
            const r = await constructContext(buildHistory(9), opts({ summarize: async () => bad }));
            expect(r.summarized).toBe(false);
            expect(r.kept).toHaveLength(1 + 5 * 2);
        }
    });

    it('does not summarize when no makeSummaryMessage is supplied (no stub digests)', async () => {
        const summarize = vi.fn(async () => 'digest');
        const r = await constructContext(buildHistory(9), {
            isToolCall: geminiIsToolCall,
            isToolResponse: geminiIsToolResponse,
            summarize,
        });
        expect(r.summarized).toBe(false);
        expect(r.evictedPairs).toBe(4);
    });
});

describe('constructContext: immutability', () => {
    it('never mutates the input history', async () => {
        const h = buildHistory(9);
        const before = JSON.stringify(h);
        await constructContext(h, opts({ summarize: async () => 'digest' }));
        expect(JSON.stringify(h)).toBe(before);
        expect(h).toHaveLength(1 + 9 * 2);
    });
});

describe('geminiEvictedToText', () => {
    it('renders calls, results, and prose as one compact transcript', () => {
        const out = geminiEvictedToText([
            toolCall('fetch_wiki_articles', 0),
            toolResp('fetch_wiki_articles', 'Retail Dive reports subscription growth'),
            modelText('the corpus skews social'),
        ]);
        expect(out).toContain('CALLED fetch_wiki_articles({"q":"arg0"})');
        expect(out).toContain('RESULT fetch_wiki_articles: Retail Dive reports subscription growth');
        expect(out).toContain('ASSISTANT: the corpus skews social');
    });

    it('caps each message so a verbose tool result cannot blow up the digest prompt', () => {
        const out = geminiEvictedToText([toolResp('t', 'x'.repeat(50_000))], 100);
        expect(out.length).toBeLessThan(400);
    });

    it('tolerates malformed parts without throwing', () => {
        expect(() => geminiEvictedToText([
            {} as G,
            { role: 'user' } as G,
            { role: 'user', parts: [null, undefined, { text: '' }] } as any,
        ])).not.toThrow();
    });
});
