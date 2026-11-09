// 2026-10-31 (agent-stack plan, sixth pass): a 170 M-character session snapshot passed to fetch as a string froze the
// main thread 9-11 s per autosave; the save body is a Blob now.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sessionBody, saveSession } from './sessionService';

describe('session save body', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('is a JSON Blob that round-trips the payload', async () => {
        const b = sessionBody({ slug: 'nu', sections: { state: { slides: [{ id: 's1', note: 'it’s fine' }] } } });
        expect(b).toBeInstanceOf(Blob);
        expect((b as Blob).type).toBe('application/json');
        expect(JSON.parse(await (b as Blob).text())).toEqual({ slug: 'nu', sections: { state: { slides: [{ id: 's1', note: 'it’s fine' }] } } });
    });

    it('saveSession posts the Blob with its JSON content type', async () => {
        const seen: any[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
            seen.push({ url, init, body: JSON.parse(await (init.body as Blob).text()) });
            return new Response(JSON.stringify({ ok: true, slug: 'nu', title: 't', saved_at: 'x' }), { status: 200 });
        }));
        const res = await saveSession({ metadata: { title: 'NU co-op' }, state: { slides: [] }, chat: [] } as any, 'nu');
        expect(res.ok).toBe(true);
        expect(seen[0].url).toMatch(/\/api\/sessions$/);
        expect(seen[0].init.body).toBeInstanceOf(Blob);
        expect(seen[0].init.headers['Content-Type']).toBe('application/json');
        expect(seen[0].body).toMatchObject({ slug: 'nu', title: 'NU co-op', sections: { state: { slides: [] }, chat: [] } });
    });
});
