/**
 * Upload ingestion + evidence hygiene (2026-10-02). Pins the live NU PRD failures:
 * mojibake from `atob()` on UTF-8 text, duplicate document copies spending the
 * admission budget, other engagements' theme synthesis grounding this one, and a
 * restored session saving `file_names: []`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { repairMojibake, _safeB64Decode, extractTextFromUpload, ingestUploadedDocuments, UPLOAD_ANALYSIS_EVENT } from './wikiService';
import { applyEvidenceHygiene, uploadDocStem } from './chunkRetrieval';
import { noteUploadedFileNames, mergeUploadedFileNames, buildSessionSnapshot, restoreSessionSnapshot } from './sessionService';

const ENG = 'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ';

function utf8B64(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

describe('mojibake repair', () => {
    it('repairs the exact live pattern (UTF-8 read as latin-1)', () => {
        const broken = 'THE STUDENTâ\u0080\u0099S INFORMATION. Building the newÂ Co-op Student Dashboard';
        expect(repairMojibake(broken)).toBe('THE STUDENT’S INFORMATION. Building the new Co-op Student Dashboard');
    });
    it('repairs the cp1252 flavour', () => {
        expect(repairMojibake('resourcesâ€”all')).toBe('resources—all');
    });
    it('leaves clean accented prose alone and is idempotent', () => {
        for (const s of ['café à la carte', 'naïve résumé', 'Âge', 'plain']) expect(repairMojibake(s)).toBe(s);
        const once = repairMojibake('studentâ\u0080\u0099s');
        expect(repairMojibake(once)).toBe(once);
    });
});

describe('UTF-8 safe upload decoding', () => {
    it('decodes mammoth-converted DOCX text (base64 of UTF-8) without mojibake', () => {
        const text = '[CONVERTED FROM Chris_Boland_Feedback.docx]\n\nIN NU WORKS, ADVISOR CAN SEE ALMOST ALL OF THE STUDENT’S INFORMATION.';
        expect(_safeB64Decode(utf8B64(text))).toBe(text);
        const out = extractTextFromUpload({ name: 'Chris_Boland_Feedback.txt', type: 'text/plain', data: utf8B64(text) });
        expect(out).toContain('STUDENT’S INFORMATION');
        expect(out).not.toMatch(/â/);
    });
    it('heals parsedText that arrived already mangled', () => {
        const out = extractTextFromUpload({ name: 'x.pptx', parsedText: 'The studentâ\u0080\u0099s journey across co-op, career and alumni stages.' });
        expect(out).toBe('The student’s journey across co-op, career and alumni stages.');
    });
});

describe('evidence hygiene on the unioned catalog', () => {
    it('collapses a cached-reuse alias onto the original upload page', () => {
        const ids = [
            'articles/client-uploads/d832673667.md#c0', 'articles/client-uploads/d832673667.md#c1',
            'articles/cached-reuse-nxt-humans-nu-coop-kickoff/7c74496538.md#c0',
            'articles/riipen-blog/b909ce0016.md#c0',
        ];
        const pages = {
            'articles/client-uploads/d832673667.md': { title: 'NXT_Humans_NU_Coop_Kickoff.pdf' },
            'articles/cached-reuse-nxt-humans-nu-coop-kickoff/7c74496538.md': { title: 'NXT_Humans_NU_Coop_Kickoff' },
            'articles/riipen-blog/b909ce0016.md': { title: 'Riipen Blog' },
        };
        const r = applyEvidenceHygiene(ids, pages, ENG);
        expect(r.ids).toEqual(['articles/client-uploads/d832673667.md#c0', 'articles/client-uploads/d832673667.md#c1', 'articles/riipen-blog/b909ce0016.md#c0']);
        expect(r.dropped[0].reason).toContain('duplicate of articles/client-uploads/d832673667.md');
    });
    it('drops theme synthesis owned by another engagement or by nobody, keeps this engagement', () => {
        const ids = [
            'articles/hic-theme-synthesis/19068873a5.md#c183',
            'articles/hic-theme-synthesis/d64c43d1a7.md#c0',
            'articles/hic-theme-synthesis/aaaaaaaaaa.md#c0',
            'synthesis/insights/produce-a-client-facing-product-marketing-report-for-the-nxt/theme/t1.md#c0',
        ];
        const pages = {
            'articles/hic-theme-synthesis/19068873a5.md': { synthesis_engagement: 'produce-a-client-facing-product-marketing-report-for-the-nxt' },
            'articles/hic-theme-synthesis/d64c43d1a7.md': { synthesis_engagement: ENG },
            'articles/hic-theme-synthesis/aaaaaaaaaa.md': {},
        };
        const r = applyEvidenceHygiene(ids, pages, ENG);
        expect(r.ids).toEqual(['articles/hic-theme-synthesis/d64c43d1a7.md#c0']);
        expect(r.dropped).toHaveLength(3);
    });
    it('stems equate SOW copies but not distinct documents', () => {
        expect(uploadDocStem('SOW012_NXT_Humans_NU_Dashboard_Final_REDACTED.txt')).toBe(uploadDocStem('SOW012_NXT_Humans_NU_Dashboard_Final'));
        expect(uploadDocStem('NXT_Northeastern_applyjourney_vision.pdf')).not.toBe(uploadDocStem('NXT_Northeastern_applyjourney_vision_prioritization.pdf'));
    });
});

describe('uploaded file names persist into session state', () => {
    it('a restored session keeps its names on the next save', () => {
        const goal = 'Generate a PRD for the Experiential Learning Hub (restore test)';
        restoreSessionSnapshot({
            metadata: { research_goal: goal } as any,
            state: { file_names: ['SOW012.pdf', 'Vision-Project.pptx'] } as any,
        } as any);
        const snap = buildSessionSnapshot({ researchGoal: goal, fileNames: [] });
        expect(snap.state.file_names).toEqual(['SOW012.pdf', 'Vision-Project.pptx']);
    });
    it('chat attachments are unioned in, and another goal never inherits them', () => {
        const goal = 'Union test goal for upload names';
        noteUploadedFileNames(goal, ['Chris_Boland_Feedback.docx']);
        expect(mergeUploadedFileNames(goal, ['a.pdf', 'Chris_Boland_Feedback.docx'])).toEqual(['a.pdf', 'Chris_Boland_Feedback.docx']);
        expect(mergeUploadedFileNames('a different engagement', ['b.pdf'])).toEqual(['b.pdf']);
    });
});

describe('ingestUploadedDocuments (shared research-start + analyst-chat path)', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
    it('writes through write-article tagged to the engagement, records names, and never throws without the proxy', async () => {
        const calls: any[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: any) => {
            calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
            if (String(url).endsWith('/api/wiki/write-article')) {
                return new Response(JSON.stringify({ status: 'ok', wikiPath: 'articles/client-uploads/abc1234567.md' }), { status: 200 });
            }
            return new Response('{}', { status: 404 });
        }));
        const goal = 'Ingestion test goal for the experiential learning hub';
        const r = await ingestUploadedDocuments(
            [{ name: 'Vision-Project.pptx', parsedText: 'Project: NU Co-Op Digital Experience. A personalized coach to support students from co-op through career.' }],
            goal, { surface: 'analyst-chat', analyze: false },
        );
        expect(r.archived).toBe(1);
        expect(r.pages).toEqual([{ name: 'Vision-Project.pptx', wikiPath: 'articles/client-uploads/abc1234567.md' }]);
        const w = calls.find(c => c.url.endsWith('/api/wiki/write-article'));
        expect(w.body.source).toBe('Client Uploads');
        expect(w.body.method).toBe('upload');
        expect(typeof w.body.engagement).toBe('string');
        expect(w.body.engagement.length).toBeGreaterThan(10);
        expect(mergeUploadedFileNames(goal, [])).toEqual(['Vision-Project.pptx']);
    });
    it('exposes the analysis event name the chat listens on', () => {
        expect(UPLOAD_ANALYSIS_EVENT).toBe('hic:upload-analysis');
    });
});
