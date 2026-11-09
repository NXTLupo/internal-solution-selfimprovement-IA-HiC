// 2026-10-31 (agent-stack plan, sixth pass): about 300 identical receipt/feedback GETs on one session load held the
// browser's six proxy connections; one shared request per URL replaces them.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sharedJson, forgetShared } from './sharedGet';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('sharedJson', () => {
    beforeEach(() => forgetShared());

    it('a hundred concurrent callers make one request and all get the body', async () => {
        const f = vi.fn(async () => ok({ skills: [{ name: 'deck-composer', version: '2.1' }] })) as any;
        const all = await Promise.all(Array.from({ length: 100 }, () => sharedJson('http://p/api/skill/list-versions', 60_000, f)));
        expect(f).toHaveBeenCalledTimes(1);
        expect(all.every(d => d?.skills?.[0]?.version === '2.1')).toBe(true);
    });

    it('reuses the body inside the window and asks again after it', async () => {
        vi.useFakeTimers();
        try {
            const f = vi.fn(async () => ok({ n: 1 })) as any;
            await sharedJson('http://p/x', 1000, f);
            await sharedJson('http://p/x', 1000, f);
            expect(f).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(1001);
            await sharedJson('http://p/x', 1000, f);
            expect(f).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('a failure or non-OK answer is not remembered; forgetShared drops a URL after a write', async () => {
        const down = vi.fn(async () => { throw new Error('offline'); }) as any;
        expect(await sharedJson('http://p/y', 60_000, down)).toBeNull();
        const notOk = vi.fn(async () => new Response('no', { status: 503 })) as any;
        expect(await sharedJson('http://p/y', 60_000, notOk)).toBeNull();
        const up = vi.fn(async () => ok({ index: { slides: {} } })) as any;
        expect(await sharedJson('http://p/y', 60_000, up)).toEqual({ index: { slides: {} } });
        forgetShared('http://p/y');
        await sharedJson('http://p/y', 60_000, up);
        expect(up).toHaveBeenCalledTimes(2);
    });
});
