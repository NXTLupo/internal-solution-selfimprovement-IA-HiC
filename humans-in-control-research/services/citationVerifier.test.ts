/** PROVENANCE LOCK (2026-08-17): the verifier must catch every failure class
 *  from the live incident: fabricated report titles on real content, quotes
 *  not present in the pointed source, sourced-looking claims with no pointer,
 *  and it must relabel/strip rather than let a fabricated label render.
 *  Real-corpus fixture at the bottom per the standing test-against-real-data rule. */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    extractEvidenceClaims, verifyDeckEvidence, applyVerificationFixes,
    quoteAppearsIn, statsAppearIn, attributionMatches, normalizeForMatch,
    type PageFetcher,
} from './citationVerifier';
import { registerChunkSources, registerResolvedChunkSources, lookupPointerUrl } from './citationPointerRegistry';

const PAGE_TEXT = normalizeForMatch(`
Intuit debuts AI tools for middle-market companies. PYMNTS reports that Ashley Still,
executive vice president, said the rollout targets QuickBooks Online Advanced users.
The companies most likely to enjoy returns are the ones beginning with a defined
operating problem, not a generalized desire to "use AI." The survey found 52% of
mid-market businesses already use AI to manage part of their expense process.
`);

const fetcher: PageFetcher = async (page: string) =>
    page === 'articles/pymnts/abc123.md' ? PAGE_TEXT : null;

const deckSlide = (payload: any, id = 's1'): any => ({
    id, status: 'draft', timestamp: 1, template: 'slides:block-quote',
    title: 'Mid-market AI returns start from a defined operating problem',
    composerPayload: { title: 'Mid-market AI returns start from a defined operating problem', ...payload },
});

describe('extractEvidenceClaims', () => {
    it('captures quote fields with pointers, attribution siblings, and pointer-carrying strings', () => {
        const slide = deckSlide({
            quote: 'The companies most likely to enjoy returns are the ones beginning with a defined operating problem [articles/pymnts/abc123.md#c2]',
            attribution: 'Intuit Mid-Market AI Report, 2026',
            body: 'Mid-market adoption is accelerating [articles/pymnts/abc123.md#c1]',
        });
        const claims = extractEvidenceClaims(slide);
        const quote = claims.find(c => c.kind === 'quote')!;
        expect(quote.pointers).toEqual(['articles/pymnts/abc123.md#c2']);
        expect(quote.attribution).toBe('Intuit Mid-Market AI Report, 2026');
        expect(quote.attributionField).toBe('attribution');
        expect(quote.text).not.toContain('.md#c');
        expect(claims.some(c => c.field === 'body' && c.pointers.length === 1)).toBe(true);
    });
});

describe('matching primitives', () => {
    it('quoteAppearsIn: verbatim passes, fabricated fails, ellipsis segments each check', () => {
        expect(quoteAppearsIn('The companies most likely to enjoy returns are the ones beginning with a defined operating problem', PAGE_TEXT)).toBe(true);
        expect(quoteAppearsIn('AI transforms every club back office within a quarter', PAGE_TEXT)).toBe(false);
        expect(quoteAppearsIn('The companies most likely to enjoy returns ... a defined operating problem', PAGE_TEXT)).toBe(true);
    });
    it('statsAppearIn: present numbers pass, invented numbers fail', () => {
        expect(statsAppearIn('52% of mid-market businesses already use AI', PAGE_TEXT)).toBe(true);
        expect(statsAppearIn('92% of organizations are using AI, 7% strategic', PAGE_TEXT)).toBe(false);
    });
    it('attributionMatches: invented report titles fail even when brand words appear; real outlets pass', () => {
        // "Intuit" appears in the article text, but the REPORT TITLE phrase does not: fabricated.
        expect(attributionMatches('Intuit Mid-Market AI Report, 2026', PAGE_TEXT, ['PYMNTS'])).toBe(false);
        expect(attributionMatches('PYMNTS', PAGE_TEXT, ['PYMNTS'])).toBe(true);
        expect(attributionMatches('Ashley Still, Intuit', PAGE_TEXT, ['PYMNTS'])).toBe(true);
    });
});

describe('verifyDeckEvidence + applyVerificationFixes (the incident, end to end)', () => {
    it('relabels a fabricated report title to the real recorded source', async () => {
        registerChunkSources('articles/pymnts/abc123.md#c2', ['PYMNTS']);
        const slide = deckSlide({
            quote: 'The companies most likely to enjoy returns are the ones beginning with a defined operating problem [articles/pymnts/abc123.md#c2]',
            attribution: 'Intuit Mid-Market AI Report, 2026',
        });
        const rows = await verifyDeckEvidence([slide], fetcher);
        const row = rows.find(r => r.kind === 'quote')!;
        expect(row.verdict).toBe('ATTRIBUTION_FIXED');
        expect(row.realSources).toContain('PYMNTS');
        const { slides, fixed } = applyVerificationFixes([slide], rows);
        expect(fixed).toBe(1);
        expect(slides[0].composerPayload.attribution).toBe('PYMNTS');
        // immutable + undo-able through the WS-4 contract
        expect(slide.composerPayload.attribution).toBe('Intuit Mid-Market AI Report, 2026');
        expect((slides[0] as any)._textHistory).toHaveLength(1);
    });

    it('flags a quote absent from its pointed source and strips the fabricated label', async () => {
        const slide = deckSlide({
            quote: 'Users can select bills, pay them, and see reconciliation in near real time [articles/pymnts/abc123.md#c4]',
            attribution: 'BILL Case Study',
        }, 's2');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows[0].verdict).toBe('UNVERIFIED');
        const { slides, stripped } = applyVerificationFixes([slide], rows);
        expect(stripped).toBe(1);
        expect(slides[0].composerPayload.attribution).toBe('');
    });

    it('marks sourced-looking claims with no pointer as UNSOURCED', async () => {
        const slide = deckSlide({
            quote: 'An operational variance identified on the 10th represents 30 days of compounded overspend',
            attribution: 'HFTP',
        }, 's3');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows[0].verdict).toBe('UNSOURCED');
        expect(rows[0].note).toMatch(/label cannot be trusted/i);
    });

    it('verifies clean claims and carries the checkable URL from the registry', async () => {
        registerResolvedChunkSources([{ id: 'articles/pymnts/abc123.md#c9', sources: [{ n: 'PYMNTS', u: 'https://www.pymnts.com/intuit-mid-market' }] }]);
        expect(lookupPointerUrl('articles/pymnts/abc123.md#c9')).toBe('https://www.pymnts.com/intuit-mid-market');
        const slide = deckSlide({
            quote: 'The survey found 52% of mid-market businesses already use AI to manage part of their expense process [articles/pymnts/abc123.md#c9]',
            attribution: 'PYMNTS',
        }, 's4');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows[0].verdict).toBe('VERIFIED');
        expect(rows[0].url).toBe('https://www.pymnts.com/intuit-mid-market');
    });

    it('an unreachable source page is UNVERIFIED, never a silent pass', async () => {
        const slide = deckSlide({
            quote: 'Some claim from a page the proxy cannot serve [articles/missing/zzz.md#c1]',
        }, 's5');
        const rows = await verifyDeckEvidence([slide], async () => null);
        expect(rows[0].verdict).toBe('UNVERIFIED');
        expect(rows[0].note).toMatch(/could not be loaded/i);
    });
});

describe('real-corpus fixture (standing rule: test against real data)', () => {
    const wikiRoot = path.resolve(__dirname, '../hic-workspace/wiki/articles');
    const findRealArticle = (): { rel: string; body: string } | null => {
        try {
            for (const dir of fs.readdirSync(wikiRoot)) {
                const dirPath = path.join(wikiRoot, dir);
                if (!fs.statSync(dirPath).isDirectory()) continue;
                for (const f of fs.readdirSync(dirPath)) {
                    if (!f.endsWith('.md')) continue;
                    const body = fs.readFileSync(path.join(dirPath, f), 'utf-8');
                    if (body.length > 1500) return { rel: `articles/${dir}/${f}`, body };
                }
            }
        } catch { /* no wiki in this checkout */ }
        return null;
    };

    it('verifies a real sentence from a real wiki article and rejects a fabricated one', async () => {
        const article = findRealArticle();
        if (!article) { console.warn('[test] no wiki articles on disk; real-corpus fixture skipped'); return; }
        // pull a real mid-document sentence (past the frontmatter)
        const bodyText = article.body.replace(/^---[\s\S]*?---/, '');
        const sentence = (bodyText.match(/[A-Z][^.!?\n]{60,180}[.!?]/g) || [])[1];
        expect(sentence, `no extractable sentence in ${article.rel}`).toBeTruthy();
        const realFetcher: PageFetcher = async (page: string) =>
            page === article.rel.replace(/\.md$/, '') + '.md' || page === article.rel
                ? normalizeForMatch(article.body) : null;
        const slide = deckSlide({
            quote: `${sentence} [${article.rel}#c1]`,
        }, 'real1');
        const fake = deckSlide({
            quote: `Private clubs that deploy agentic AI close their books nine days faster than peers [${article.rel}#c1]`,
            attribution: 'Global Club Finance Index, 2026',
        }, 'real2');
        const rows = await verifyDeckEvidence([slide, fake], realFetcher);
        const realRow = rows.find(r => r.slideId === 'real1')!;
        const fakeRow = rows.find(r => r.slideId === 'real2')!;
        expect(['VERIFIED', 'ATTRIBUTION_FIXED']).toContain(realRow.verdict);
        expect(fakeRow.verdict).toBe('UNVERIFIED');
    });
});
