import { describe, it, expect, vi } from 'vitest';
import { makePrdAirFixture } from './prdAir.fixture';
import {
    summarizePrdRequirements, formatPrdWorkbookReply, prdWorkbookFilename, exportPrdWorkbook,
    rememberPrdWorkbook, redownloadPrdWorkbook, hasPrdWorkbook, stripPointers,
} from './prdXlsx';

// 2026-11-16: the body is plain bytes with a Content-Type header, not a Blob. Under the jsdom environment `Blob` is
// jsdom's, which has no stream(), while `Response` is Node's, which streams its body: `new Response(jsdomBlob)` threw
// "object.stream is not a function" before any assertion ran. resp.blob() still yields the typed workbook.
function okResponse(bytes = 'PK', headers: Record<string, string> = {}) {
    return new Response(bytes, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                   'Content-Disposition': 'attachment; filename="growers-requirements-nxt.xlsx"', 'X-Requirement-Count': '4', ...headers },
    });
}

describe('prdXlsx summary', () => {
    it('counts requirements by priority and lists must-haves in record order', () => {
        const s = summarizePrdRequirements(makePrdAirFixture());
        expect(s.total).toBe(4);
        expect(s.counts).toEqual({ must: 2, should: 1, could: 1, wont: 0 });
        expect(s.mustHaves.map(m => m.id)).toEqual(['R-1', 'R-4']);
    });

    it('leads the reply with the workbook, lists must-haves by id, and carries no em dash', () => {
        const air = makePrdAirFixture();
        const text = formatPrdWorkbookReply({ title: air.title, summary: summarizePrdRequirements(air), filename: 'x.xlsx', claimCheck: 'ok' });
        expect(text.startsWith('Requirements workbook ready')).toBe(true);
        expect(text).toContain('Downloaded x.xlsx');
        expect(text).toContain("Must 2, Should 1, Could 1, Won't 0");
        expect(text).toContain('- R-1: The grower sees the plan re-read');
        expect(text).not.toMatch(/—/);
    });

    it('says the export failed in one line and still shows the summary', () => {
        const air = makePrdAirFixture();
        const text = formatPrdWorkbookReply({ title: air.title, summary: summarizePrdRequirements(air), exportError: 'HTTP 500' });
        const first = text.split('\n')[0];
        expect(first).toMatch(/^Requirements workbook could not be built \(HTTP 500\)/);
        expect(text).toContain('Must-haves:');
        expect(text).toContain('- R-4:');
    });

    it('strips inline pointer brackets from display text', () => {
        expect(stripPointers('Plan never revisited [articles/a.md#c3] at renewal')).toBe('Plan never revisited at renewal');
    });

    it('slugs the filename the same way as proxy/prd_xlsx.py slug_filename', () => {
        expect(prdWorkbookFilename('Growers decide coverage!', 'NU')).toBe('growers-decide-coverage-requirements-nu.xlsx');
        expect(prdWorkbookFilename('', 'nxt')).toBe('prd-requirements-nxt.xlsx');
    });
});

describe('prdXlsx export', () => {
    it('POSTs the record and returns the workbook with the server filename', async () => {
        const air = makePrdAirFixture();
        const fetchImpl = vi.fn(async () => okResponse());
        const r = await exportPrdWorkbook(air, { brand: 'NXT', title: air.title, slug: 'grower-prd', proxyBase: 'http://proxy', fetchImpl: fetchImpl as any });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0] as any;
        expect(url).toBe('http://proxy/api/prd/export-xlsx');
        const body = JSON.parse(init.body);
        expect(body.brand).toBe('nxt');
        expect(body.slug).toBe('grower-prd');
        expect(body.air.graph.requirements).toHaveLength(4);
        expect(r.filename).toBe('growers-requirements-nxt.xlsx');
        expect(r.requirementCount).toBe(4);
    });

    it('throws with the proxy detail on failure', async () => {
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ detail: 'prd workbook export failed: boom' }), { status: 500 }));
        await expect(exportPrdWorkbook(makePrdAirFixture(), { proxyBase: '', fetchImpl: fetchImpl as any })).rejects.toThrow(/HTTP 500: prd workbook export failed: boom/);
    });

    it('re-downloads cached bytes without a second build, and retries a failed build from the cached record', async () => {
        const air = makePrdAirFixture();
        const download = vi.fn();
        const fetchImpl = vi.fn(async () => okResponse());
        rememberPrdWorkbook('msg-retry', { air, brand: 'NXT', title: air.title });
        expect(hasPrdWorkbook('msg-retry')).toBe(true);
        const first = await redownloadPrdWorkbook('msg-retry', { proxyBase: '', fetchImpl: fetchImpl as any, download });
        const second = await redownloadPrdWorkbook('msg-retry', { proxyBase: '', fetchImpl: fetchImpl as any, download });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(download).toHaveBeenCalledTimes(2);
        expect(second.filename).toBe(first.filename);
    });

    it('explains a missing record instead of failing silently', async () => {
        await expect(redownloadPrdWorkbook('never-built', { download: vi.fn() })).rejects.toThrow(/run #prd again/);
    });
});
