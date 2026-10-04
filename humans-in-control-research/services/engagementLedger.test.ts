/**
 * engagementLedger unit tests (synthetic text; generic by construction).
 */
import { describe, it, expect } from 'vitest';
import {
    parseUploadPage, collapseDuplicateDocuments, locateVerbatim, requestLedgerItems, dedupeLedgerItems,
    lockExtractedItems, documentKind, assignAreas, groupThemes, themeLedgerItems, mergeBoardThemes, buildEngagementLedger,
    type UploadPage, type LedgerDraftItem, type LedgerItem, type ThemeInput,
} from './engagementLedger';
import { hospitalFixture, mockFetch, extractionGen } from './__fixtures__/coverageProjects';

const RAW = ['---', 'id: articles/x/a.md', 'title: "Contract099_Thing_Final.txt"', 'content_hash: "abc"', 'chunks:', '  - id: "articles/x/a.md#c0"', '    char_span: [0, 20]', '  - id: "articles/x/a.md#c1"', '    char_span: [20, 77]', '---', '# Heading one here.', 'Learn how sub -lets alternate classes with full -time work'].join('\n');

describe('page parsing and verbatim location', () => {
    it('parses chunks by char_span into the post-frontmatter body', () => {
        const p = parseUploadPage(RAW, 'articles/x/a.md')!;
        expect(p.chunks.map(c => c.id)).toEqual(['articles/x/a.md#c0', 'articles/x/a.md#c1']);
        expect(p.chunks[0].text).toBe('# Heading one here.\n');
        expect(p.contentHash).toBe('abc');
    });
    it('locates a quote whose spacing the model fixed, returning the source characters', () => {
        const loc = locateVerbatim('Learn how sub-lets alternate classes with full-time work', 'x\nLearn how sub -lets alternate classes with full -time work\ny')!;
        expect(loc.method).toBe('squash');
        expect(loc.text).toBe('Learn how sub -lets alternate classes with full -time work');
    });
    it('falls back to the line that carries most of the words, never to model text', () => {
        const loc = locateVerbatim('the prototype starts too late in the customer journey', 'Current prototype begins too late in the journey. The prototype focuses on billing.')!;
        expect(loc.method).toBe('segment');
        expect(loc.text).toBe('Current prototype begins too late in the journey.');
        expect(locateVerbatim('completely unrelated words here today', 'Current prototype begins too late.')).toBeNull();
    });
    it('collapses duplicate copies of a document and keeps the newest', () => {
        const mk = (wp: string, title: string, at: string, h: string): UploadPage => ({ wikiPath: wp, title, contentHash: h, extractedAt: at, body: '', chunks: [] });
        const r = collapseDuplicateDocuments([mk('a.md', 'Brief (1).pdf', '2026-10-01', 'h1'), mk('b.md', 'Brief.pdf', '2026-10-02', 'h2'), mk('c.md', 'Other.txt', '2026-10-01', 'h1x')]);
        expect(r.kept.map(k => k.wikiPath).sort()).toEqual(['b.md', 'c.md']);
        expect(r.dropped).toEqual([{ wikiPath: 'a.md', duplicateOf: 'b.md' }]);
    });
    it('recognizes document kinds from structure and generic cues', () => {
        expect(documentKind('notes.txt', 'Meeting Summary\nAttendees: A, B\nAction Items\n- x')).toBe('meeting-notes');
        expect(documentKind('x.txt', 'Statement of Work\nDeliverables\n1. Portal')).toBe('contract');
        expect(documentKind('memo.txt', 'Feedback on the draft design')).toBe('feedback');
    });
    it('reads requirement-like items from the request itself', () => {
        const items = requestLedgerItems('Generate a comprehensive PRD for the portal. Ground it in the uploads, focusing on intake forms, billing transparency, and appointment reminders.');
        expect(items.map(i => i.item)).toEqual(['Intake forms', 'Billing transparency', 'Appointment reminders']);
        expect(items.every(i => i.sourceName === 'Request' && i.type === 'stated')).toBe(true);
    });
    it('dedupes near-identical items across documents and keeps every source', () => {
        const base: LedgerDraftItem = { type: 'stated', item: 'Progress indicators on guided paths', statement: 'The portal shows progress indicators on guided paths.', quote: 'progress indicators', pointer: 'a/x.md#c1', sourceName: 'Client document: A', documentTitle: 'A', label: 'recommended' };
        const out = dedupeLedgerItems([base, { ...base, pointer: 'a/y.md#c2', documentTitle: 'B', sourceName: 'Client document: B', label: 'required' }, { ...base, type: 'feedback', item: 'Prototype begins too late', statement: 'Start at first contact.' }]);
        expect(out.map(o => o.id)).toEqual(['SF-1', 'FB-1']);
        expect(out[0].sources.map(s => s.documentTitle)).toEqual(['A', 'B']);
        expect(out[0].label).toBe('required');
    });
    it('locks extracted items: unverifiable quotes are dropped, source identity comes from the page', () => {
        const page = parseUploadPage(RAW, 'articles/x/a.md')!;
        const lock = lockExtractedItems(JSON.stringify({ items: [
            { type: 'stated', item: 'Explain sub-lets', statement: 'The hub explains sub-lets.', quote: 'Learn how sub-lets alternate classes with full-time work', chunk: 'c1', label: 'REQUIRED' },
            { type: 'stated', item: 'Invented', statement: 'x', quote: 'nothing like this appears anywhere in the page text', chunk: 'c0', label: 'required' },
        ] }), [{ page, chunks: page.chunks, part: 1, parts: 1 }]);
        expect(lock.items).toHaveLength(1);
        expect(lock.items[0].pointer).toBe('articles/x/a.md#c1');
        expect(lock.items[0].sourceName).toBe('Client document: Contract099 Thing Final');
        expect(lock.items[0].label).toBe('required');
        expect(lock.dropped).toHaveLength(1);
    });
});

describe('themes and derived areas', () => {
    const th = (id: string, name: string, insight = ''): ThemeInput => ({ id, name, insight, quotes: [] });
    it('groups exact and near-duplicate themes, keeping every id', () => {
        const g = groupThemes([th('a', 'PROFILE / READINESS / ASSESSMENT'), th('b', 'Profile readiness assessment'), th('c', 'Billing is opaque to patients')]);
        expect(g.map(x => x.members.map(m => m.id))).toEqual([['a', 'b'], ['c']]);
        const items = themeLedgerItems([th('a', 'X one'), th('b', 'X one'), th('c', 'Y two')]);
        expect(items.map(i => [i.id, i.themeIds])).toEqual([['TH-1', ['a', 'b']], ['TH-2', ['c']]]);
    });
    it('merges board themes by id and by name without dropping any', () => {
        const m = mergeBoardThemes([th('a', 'One')], [th('a', 'One'), th('z', 'one'), th('q', 'Two')]);
        expect(m.map(t => t.id)).toEqual(['a', 'q']);
    });
    it('derives areas from the ledger text, named from their own terms, deterministic', () => {
        const mk = (id: string, item: string): LedgerItem => ({ id, type: 'stated', item, statement: item, quote: item, sourceName: 'd', pointer: 'p', documentTitle: 'Doc', featureArea: '', label: 'required', sources: [] });
        const items = [
            mk('SF-1', 'Billing statement shows each charge'), mk('SF-2', 'Billing estimate before the visit'), mk('SF-3', 'Billing disputes tracked online'),
            mk('SF-4', 'Intake form saves progress'), mk('SF-5', 'Intake form prefilled from records'), mk('SF-6', 'Intake form in Spanish'),
            mk('SF-7', 'Reminder texts before appointments'), mk('SF-8', 'Reminder settings per patient'),
        ];
        const a1 = assignAreas(items.map(i => ({ ...i })));
        const a2 = assignAreas(items);
        expect(a1).toEqual(a2);
        expect(a2.length).toBeGreaterThanOrEqual(2);
        const labels = a2.map(a => a.label).join(' | ');
        expect(labels).toMatch(/Billing/);
        expect(labels).toMatch(/Intake/);
        expect(labels).toMatch(/Reminder/);
        expect(items.every(i => /^AREA-/.test(i.featureArea))).toBe(true);
    });
    it('falls back to grouping by document when clustering cannot form two areas', () => {
        const mk = (id: string, item: string, doc: string): LedgerItem => ({ id, type: 'stated', item, statement: item, quote: item, sourceName: doc, pointer: 'p', documentTitle: doc, featureArea: '', label: 'required', sources: [] });
        const items = [mk('SF-1', 'Alpha', 'Doc A'), mk('SF-2', 'Beta', 'Doc B')];
        expect(assignAreas(items).map(a => a.label)).toEqual(['Doc A', 'Doc B']);
    });
});

describe('ledger persistence and read accounting (2026-10-02 audit)', () => {
    const fx = hospitalFixture();
    it('a failed extraction is never counted as read, and the document is re-analyzed next run', async () => {
        const store = new Map<string, string>();
        const io = { proxyBase: 'http://proxy.test', fetchImpl: mockFetch(fx, store) };
        let calls = 0;
        const failing = async () => { calls++; throw new Error('provider down'); };
        const led = await buildEngagementLedger({ ...io, engagement: fx.engagement, gen: failing as any });
        // Every call was tried twice (one retry), and no document reports its chunks as read.
        expect(calls).toBeGreaterThan(0);
        expect(calls % 2).toBe(0);
        for (const d of led.documentStats) expect(d.chunksRead).toBe(0);
        const persisted = JSON.parse([...store.values()][0]);
        expect(Object.values(persisted.documents).every((d: any) => d.incomplete === true)).toBe(true);
        // Next run: the incomplete documents are analyzed again, then reused.
        const led2 = await buildEngagementLedger({ ...io, engagement: fx.engagement, gen: extractionGen as any });
        expect(led2.analyzedNow.length).toBe(Object.keys(fx.pages).length);
        for (const d of led2.documentStats) expect(d.chunksRead).toBe(d.chunksRegistered);
        const led3 = await buildEngagementLedger({ ...io, engagement: fx.engagement, gen: (async () => { throw new Error('must not be called'); }) as any });
        expect(led3.analyzedNow).toEqual([]);
        expect(led3.items.length).toBe(led2.items.length);
    }, 60_000);

    it('an unreadable ledger file is never overwritten', async () => {
        const store = new Map<string, string>();
        const base = mockFetch(fx, store);
        let writes = 0;
        const flaky = (async (url: string, init?: any) => {
            const u = new URL(url);
            if (u.pathname.startsWith('/api/wiki/read/') && u.pathname.endsWith('ledger.json')) return { ok: false, status: 503, json: async () => ({}) } as any;
            if (u.pathname === '/api/wiki/write') writes++;
            return base(url as any, init);
        }) as any;
        await buildEngagementLedger({ proxyBase: 'http://proxy.test', fetchImpl: flaky, engagement: fx.engagement, gen: extractionGen as any });
        expect(writes).toBe(0);
    }, 60_000);

    it('feedback items with opposite dispositions are not merged', () => {
        const mk = (disposition: any, item: string) => ({ type: 'feedback' as const, item, statement: item, quote: `${item} because reviewers said so in the meeting.`, pointer: `articles/client-uploads/a.md#c${item.length}`, sourceName: 'x', documentTitle: 'Notes', label: 'request' as const, disposition });
        const out = dedupeLedgerItems([mk('remove', 'Progress bar on the intake form'), mk('change', 'Progress bar on the intake form')]);
        expect(out.length).toBe(2);
    });
});
