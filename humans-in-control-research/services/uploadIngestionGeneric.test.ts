/**
 * Engagement-agnostic ingestion contract (2026-10-02 owner rules: uploads are ALWAYS
 * thoroughly analyzed from BOTH entry points, and every rule is generalized for ANY
 * research project). Runs against a SYNTHETIC hospital patient-intake engagement with
 * an in-memory proxy, so nothing passes by being tuned to one client.
 *
 * Proves: every accepted type is ingested; chunks read back == chunks registered per
 * document (the receipt invariant); a duplicate upload is reported as collapsed;
 * analyst-chat attachments are ingested and analyzed EXACTLY like research-start
 * uploads (same write payload, same analyzer call, same receipts); the chat line
 * carries the receipt.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    ingestUploadedDocuments, formatUploadAnalysisLine, takeUndeliveredUploadAnalyses,
    buildEngagementSlug, type UploadAnalysisEventDetail,
} from './wikiService';
import { mergeUploadedFileNames } from './sessionService';
import { ACCEPTED_EXTS } from '../components/ChatAttachmentDropzone';
import { UPLOAD_ACCEPT } from '../components/FileUpload';

const GOAL = 'Redesign emergency department patient intake for a regional hospital so triage, registration and interpreter booking happen once';
const TEXT = (n: string) => `${n}: triage nurses re-enter the chief complaint at the kiosk, in the EHR and on the bed board. `
    + 'Patients wait without a status update after registration. Interpreters are booked by phone. '.repeat(6);

/** In-memory proxy: write-article chunks the body into ~300-char spans and stores the
 *  page; an identical body is aliased onto the first page (content-hash dedupe);
 *  read-batch returns stored pages. */
function fakeProxy() {
    const pages = new Map<string, string>();
    const byHash = new Map<string, string>();
    const writes: any[] = [];
    let n = 0;
    const fetchImpl = vi.fn(async (url: string, init?: any) => {
        const body = init?.body ? JSON.parse(init.body) : null;
        if (url.endsWith('/api/wiki/write-article')) {
            writes.push(body);
            const content: string = body.content;
            if (byHash.has(content)) {
                return new Response(JSON.stringify({ status: 'ok', wikiPath: `articles/client-uploads/alias${n++}.md`, canonicalPath: byHash.get(content), aliased: true }), { status: 200 });
            }
            const path = `articles/client-uploads/page${String(n++).padStart(6, '0')}.md`;
            const md = `# ${body.title}\n\n${content}\n`;
            const spans: Array<[number, number]> = [];
            for (let a = 0; a < md.length; a += 300) spans.push([a, Math.min(md.length, a + 300)]);
            const fm = ['---', `id: ${path}`, `title: "${body.title}"`, `engagement: "${body.engagement}"`, 'chunks:',
                ...spans.flatMap(([a, b], i) => [`  - id: "${path}#c${i}"`, `    char_span: [${a}, ${b}]`]), '---'].join('\n');
            pages.set(path, `${fm}\n\n${md}`);
            byHash.set(content, path);
            return new Response(JSON.stringify({ status: 'ok', wikiPath: path, chunkCount: spans.length }), { status: 200 });
        }
        if (url.endsWith('/api/wiki/read-batch')) {
            const out: Record<string, any> = {};
            for (const p of body.paths) out[p] = pages.has(p) ? { exists: true, content: pages.get(p) } : { exists: false };
            return new Response(JSON.stringify({ pages: out }), { status: 200 });
        }
        return new Response('{}', { status: 404 });
    });
    return { fetchImpl, writes, pages };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); takeUndeliveredUploadAnalyses(); });

describe('one accepted-type list for both entry points', () => {
    it('research-start and chat attach accept the same types, including decks, workbooks and images', () => {
        expect(UPLOAD_ACCEPT).toBe(ACCEPTED_EXTS);
        for (const t of ['.pdf', '.docx', '.pptx', '.xlsx', '.ppt', '.xls', '.doc', '.txt', '.md', '.csv', '.json', '.xml', '.png']) {
            expect(ACCEPTED_EXTS.split(',')).toContain(t);
        }
    });
});

describe('synthetic hospital engagement: every accepted type ingests with an exact receipt', () => {
    it('ingests one file of every accepted type; chunks read == chunks registered for each', async () => {
        const px = fakeProxy();
        vi.stubGlobal('fetch', px.fetchImpl);
        const exts = ACCEPTED_EXTS.split(',').map(e => e.replace('.', ''));
        // The proxy has already parsed each file (FileUpload / ChatAttachmentDropzone background parse).
        const files = exts.map(ext => ({ name: `intake-${ext}.${ext}`, parsedText: TEXT(`intake-${ext}`) }));
        const analyzer = vi.fn(async (_slug: string, paths: string[]) => ({ items: paths.length * 2, byDocument: {} }));
        const r = await ingestUploadedDocuments(files, GOAL, { surface: 'research-start', analyzer });
        expect(r.archived).toBe(exts.length);
        expect(r.receipts).toHaveLength(exts.length);
        for (const rc of r.receipts) {
            expect(rc.status).toBe('ingested');
            expect(rc.chunksRegistered).toBeGreaterThan(0);
            expect(rc.chunksRead).toBe(rc.chunksRegistered);
            expect(rc.chunkCountMatches).toBe(true);
        }
        expect(new Set(r.receipts.map(x => x.type))).toEqual(new Set(exts));
        const detail = await r.analysis;
        expect(analyzer).toHaveBeenCalledTimes(1);
        expect(analyzer.mock.calls[0][0]).toBe(buildEngagementSlug(GOAL));
        expect(detail?.items).toBe(exts.length * 2);
        // Every write is a Client Uploads article tagged to THIS engagement.
        for (const w of px.writes) {
            expect(w.source).toBe('Client Uploads');
            expect(w.method).toBe('upload');
            expect(w.engagement).toBe(buildEngagementSlug(GOAL));
        }
        // Names reach the session state.
        expect(mergeUploadedFileNames(GOAL, [])).toEqual(files.map(f => f.name));
    });

    it('a second copy of the same document is reported as a collapsed duplicate', async () => {
        const px = fakeProxy();
        vi.stubGlobal('fetch', px.fetchImpl);
        const body = TEXT('triage-sop');
        const r = await ingestUploadedDocuments([
            { name: 'Triage_SOP_Final.pdf', parsedText: body },
            { name: 'Triage_SOP_Final_REDACTED.docx', parsedText: body },
        ], GOAL, { analyze: false });
        const [a, b] = r.receipts;
        expect(a.status).toBe('ingested');
        expect(b.status).toBe('duplicate');
        expect(b.duplicateOf).toBe(a.wikiPath);
        expect(b.wikiPath).toBe(a.wikiPath);
        expect(b.chunksRead).toBe(a.chunksRead);
        expect(b.chunkCountMatches).toBe(true);
    });

    it('a file with no readable text gets a not-ingested receipt instead of vanishing', async () => {
        const px = fakeProxy();
        vi.stubGlobal('fetch', px.fetchImpl);
        const r = await ingestUploadedDocuments([{ name: 'scan.png', parsedText: '' }], GOAL, { analyze: false });
        expect(r.receipts[0]).toMatchObject({ document: 'scan.png', type: 'png', status: 'not-ingested' });
    });
});

describe('analyst-chat attachments are ingested and analyzed exactly like research-start uploads', () => {
    it('same write payloads, same analyzer call, same receipts; only the surface label differs', async () => {
        const files = [
            { name: 'ED_Intake_Workshop.pptx', parsedText: TEXT('workshop') },
            { name: 'Wait_Times.xlsx', parsedText: TEXT('wait-times') },
        ];
        const run = async (surface: 'research-start' | 'analyst-chat') => {
            const px = fakeProxy();
            vi.stubGlobal('fetch', px.fetchImpl);
            const analyzer = vi.fn(async (_s: string, paths: string[]) => ({ items: 3, byDocument: { 'ED Intake Workshop': 2, 'Wait Times': 1 } as Record<string, number> }));
            const r = await ingestUploadedDocuments(files, GOAL, { surface, analyzer });
            const detail = await r.analysis;
            vi.unstubAllGlobals();
            return { writes: px.writes, analyzerCalls: analyzer.mock.calls, receipts: r.receipts, detail };
        };
        const start = await run('research-start');
        const chat = await run('analyst-chat');
        expect(chat.writes).toEqual(start.writes);
        expect(chat.analyzerCalls).toEqual(start.analyzerCalls);
        expect(chat.receipts).toEqual(start.receipts);
        expect(start.detail?.surface).toBe('research-start');
        expect(chat.detail?.surface).toBe('analyst-chat');
        expect(chat.receipts.map(x => x.itemsExtracted)).toEqual([2, 1]);
    });

    it('the chat line names each document, its type, chunks registered and read, and items', () => {
        const d: UploadAnalysisEventDetail = {
            engagementSlug: 'x', surface: 'analyst-chat', documents: ['ED_Intake_Workshop.pptx', 'Triage_SOP_Final_REDACTED.docx'],
            items: 4, byDocument: {},
            receipts: [
                { document: 'ED_Intake_Workshop.pptx', type: 'pptx', status: 'ingested', wikiPath: 'a.md', chunksRegistered: 3, chunksRead: 3, chunkCountMatches: true, itemsExtracted: 4 },
                { document: 'Triage_SOP_Final_REDACTED.docx', type: 'docx', status: 'duplicate', wikiPath: 'b.md', chunksRegistered: 5, chunksRead: 5, chunkCountMatches: true, duplicateOf: 'b.md' },
            ],
        };
        const line = formatUploadAnalysisLine(d);
        expect(line).toContain('Analyzed 2 chat attachments');
        expect(line).toContain('ED_Intake_Workshop.pptx (pptx): 3 chunks registered, 3 read for analysis, 4 items extracted');
        expect(line).toContain('duplicate collapsed onto b.md');
        expect(line).not.toMatch(/—/);
    });
});
