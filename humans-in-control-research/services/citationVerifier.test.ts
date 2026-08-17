/** PROVENANCE LOCK (2026-08-17, revised after adversarial review): fixtures use
 *  the REAL archetype payload contracts (attributionName/attributionRole/
 *  sourceLine, quotes[].text+source, groups[].items strings, figure siblings),
 *  not an idealized `attribution` key. Every review blocker has a regression
 *  test here. Real-corpus fixture at the bottom per the standing rule. */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    extractEvidenceClaims, verifyDeckEvidence, applyVerificationFixes,
    quoteAppearsIn, statsAppearIn, attributionMatches, inTextSourcePhrases, normalizeForMatch,
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

const slideOf = (template: string, payload: any, id = 's1'): any => ({
    id, status: 'draft', timestamp: 1, template,
    title: 'Mid-market AI returns start from a defined operating problem',
    composerPayload: { title: 'Mid-market AI returns start from a defined operating problem', ...payload },
});

describe('BLOCKER 1 regression: the REAL block-quote contract (attributionName/sourceLine)', () => {
    it('catches and relabels a fabricated attributionName on a verbatim quote', async () => {
        registerChunkSources('articles/pymnts/abc123.md#c2', ['PYMNTS']);
        const slide = slideOf('slides:block-quote', {
            quote: 'The companies most likely to enjoy returns are the ones beginning with a defined operating problem [articles/pymnts/abc123.md#c2]',
            attributionName: 'Intuit Mid-Market AI Report, 2026',
            attributionRole: 'Executive vice president',
            sourceLine: 'Intuit Mid-Market AI Report',
        });
        const rows = await verifyDeckEvidence([slide], fetcher);
        const row = rows.find(r => r.kind === 'quote')!;
        expect(row.verdict).toBe('ATTRIBUTION_FIXED');
        expect(row.realSources).toContain('PYMNTS');
        // BOTH fabricated label fields get fixes; the role (present in the article) survives
        const fixFields = (row.fixes || []).map(f => f.field);
        expect(fixFields).toContain('attributionName');
        expect(fixFields).toContain('sourceLine');
        expect(fixFields).not.toContain('attributionRole');
        const { slides, fixed } = applyVerificationFixes([slide], rows);
        expect(fixed).toBe(2);
        expect(slides[0].composerPayload.attributionName).toBe('PYMNTS');
        expect(slides[0].composerPayload.sourceLine).toBe('PYMNTS');
        expect(slides[0].composerPayload.attributionRole).toBe('Executive vice president');
        // original untouched; verifier fixes stay OUT of the user's undo ring
        expect(slide.composerPayload.attributionName).toMatch(/^Intuit/);
        expect((slides[0] as any)._textHistory).toBeUndefined();
    });
});

describe('BLOCKER 3 regression: unreachable source pages are never acted on', () => {
    it('marks rows UNREACHABLE and applies zero fixes when no page loads', async () => {
        const slide = slideOf('slides:block-quote', {
            quote: 'A legitimate quote whose page happens to be down right now [articles/pymnts/abc123.md#c2]',
            attributionName: 'PYMNTS',
        }, 's3');
        const rows = await verifyDeckEvidence([slide], async () => null);
        expect(rows[0].verdict).toBe('UNREACHABLE');
        expect(rows[0].fixes).toBeUndefined();
        const { slides, fixed, stripped } = applyVerificationFixes([slide], rows);
        expect(fixed + stripped).toBe(0);
        expect(slides[0].composerPayload.attributionName).toBe('PYMNTS');
    });
});

describe('BLOCKER 4 regression: array-of-strings content is walked', () => {
    it('flags a fabricated in-text report name inside groups[].items', async () => {
        const slide = slideOf('slides:numbered-themes', {
            groups: [{ label: 'Findings', items: [
                '52% of mid-market businesses already use AI per the Intuit Mid-Market AI Report [articles/pymnts/abc123.md#c2]',
            ] }],
        }, 's4');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows).toHaveLength(1);
        expect(rows[0].verdict).toBe('UNVERIFIED');
        expect(rows[0].note).toMatch(/names a source not found/i);
    });
});

describe('real quote shapes: quotes[].text + source sibling', () => {
    it('a fully fabricated quote object with no pointer is UNSOURCED', async () => {
        const slide = slideOf('slides:evidence-table', {
            quotes: [{ text: 'Private clubs that deploy agentic AI close their books nine days faster', source: 'Global Club Finance Index' }],
        }, 's5');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows).toHaveLength(1);
        expect(rows[0].verdict).toBe('UNSOURCED');
        expect(rows[0].citedAs).toBe('Global Club Finance Index');
    });

    it('both source and attribution siblings get checked and fixed', async () => {
        const slide = slideOf('slides:block-quote', {
            quote: { text: 'The companies most likely to enjoy returns are the ones beginning with a defined operating problem [articles/pymnts/abc123.md#c2]', source: 'BILL Case Study', attribution: 'Dakota Data Summit, 2026' },
        }, 's6');
        const rows = await verifyDeckEvidence([slide], fetcher);
        const row = rows[0];
        expect(row.verdict).toBe('ATTRIBUTION_FIXED');
        expect((row.fixes || []).map(f => f.field).sort()).toEqual(['quote.attribution', 'quote.source']);
    });
});

describe('matching primitives (hardened)', () => {
    it('quote segments must appear in source ORDER: stitched quotes fail', () => {
        expect(quoteAppearsIn('The companies most likely to enjoy returns ... a defined operating problem', PAGE_TEXT)).toBe(true);
        expect(quoteAppearsIn('52% of mid-market businesses already use AI ... beginning with a defined operating problem', PAGE_TEXT)).toBe(false);
    });
    it('numeric tokens are boundary-checked: 20% does not pass on 120%', () => {
        const src = normalizeForMatch('operating costs rose 120% while headcount held');
        expect(statsAppearIn('costs rose 20%', src)).toBe(false);
        expect(statsAppearIn('costs rose 120%', src)).toBe(true);
        expect(statsAppearIn('52% of mid-market businesses', PAGE_TEXT)).toBe(true);
    });
    it('invented report titles fail even when brand words appear; real outlets pass', () => {
        expect(attributionMatches('Intuit Mid-Market AI Report, 2026', PAGE_TEXT, ['PYMNTS'])).toBe(false);
        expect(attributionMatches('PYMNTS', PAGE_TEXT, ['PYMNTS'])).toBe(true);
        expect(attributionMatches('Ashley Still, Intuit', PAGE_TEXT, ['PYMNTS'])).toBe(true);
        // extended artifact keywords: "Analysis" now counts as a named artifact
        expect(attributionMatches('McKinsey Quarterly Analysis', PAGE_TEXT, ['PYMNTS'])).toBe(false);
    });
    it('inTextSourcePhrases finds fabricated named sources woven into prose', () => {
        expect(inTextSourcePhrases('Adoption doubled per the Intuit Mid-Market AI Report this year', PAGE_TEXT, ['PYMNTS'])).toHaveLength(1);
        expect(inTextSourcePhrases('Adoption doubled according to PYMNTS reporting', PAGE_TEXT, ['PYMNTS'])).toHaveLength(0);
    });
});

describe('figure siblings ride their object pointers', () => {
    it('a fabricated hero numeral on a means-matters card is UNVERIFIED', async () => {
        const slide = slideOf('slides:means-matters', {
            stats: [{ figure: '92%', means: 'of organizations already run AI in expense workflows [articles/pymnts/abc123.md#c2]', matters: 'The close accelerates.' }],
        }, 's7');
        const rows = await verifyDeckEvidence([slide], fetcher);
        const figureRow = rows.find(r => r.field.endsWith('.figure'))!;
        expect(figureRow.kind).toBe('stat');
        expect(figureRow.verdict).toBe('UNVERIFIED');
    });
});

describe('UNVERIFIED quotes get honest replacement labels, not blank ones', () => {
    it('replaces a fabricated label on an unverifiable quote with recorded provenance', async () => {
        const slide = slideOf('slides:block-quote', {
            quote: 'Users can select bills and see reconciliation in near real time without leaving the ERP [articles/pymnts/abc123.md#c4]',
            attributionName: 'BILL Case Study',
        }, 's8');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows[0].verdict).toBe('UNVERIFIED');
        const { slides, stripped } = applyVerificationFixes([slide], rows);
        expect(stripped).toBe(1);
        const label = slides[0].composerPayload.attributionName;
        expect(label).not.toBe('BILL Case Study');
        expect(label.length).toBeGreaterThan(0); // honest label, never a bare unattributed quote
    });
});

describe('URL propagation (WS-C)', () => {
    it('carries the checkable URL from the registry into the ledger', async () => {
        registerResolvedChunkSources([{ id: 'articles/pymnts/abc123.md#c9', sources: [{ n: 'PYMNTS', u: 'https://www.pymnts.com/intuit-mid-market' }] }]);
        expect(lookupPointerUrl('articles/pymnts/abc123.md#c9')).toBe('https://www.pymnts.com/intuit-mid-market');
        const slide = slideOf('slides:stat-row', {
            stats: [{ label: 'Mid-market AI use', value: 'The survey found 52% of mid-market businesses already use AI to manage part of their expense process [articles/pymnts/abc123.md#c9]' }],
        }, 's9');
        const rows = await verifyDeckEvidence([slide], fetcher);
        expect(rows[0].verdict).toBe('VERIFIED');
        expect(rows[0].url).toBe('https://www.pymnts.com/intuit-mid-market');
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
        const bodyText = article.body.replace(/^---[\s\S]*?---/, '');
        const sentence = (bodyText.match(/[A-Z][^.!?\n]{60,180}[.!?]/g) || [])[1];
        expect(sentence, `no extractable sentence in ${article.rel}`).toBeTruthy();
        const realFetcher: PageFetcher = async (page: string) =>
            page === article.rel ? normalizeForMatch(article.body) : null;
        const slide = slideOf('slides:block-quote', {
            quote: `${sentence} [${article.rel}#c1]`,
        }, 'real1');
        const fake = slideOf('slides:block-quote', {
            quote: `Private clubs that deploy agentic AI close their books nine days faster than peers [${article.rel}#c1]`,
            attributionName: 'Global Club Finance Index, 2026',
        }, 'real2');
        const rows = await verifyDeckEvidence([slide, fake], realFetcher);
        const realRow = rows.find(r => r.slideId === 'real1')!;
        const fakeRow = rows.find(r => r.slideId === 'real2')!;
        expect(['VERIFIED', 'ATTRIBUTION_FIXED']).toContain(realRow.verdict);
        expect(fakeRow.verdict).toBe('UNVERIFIED');
        expect(fakeRow.fixes?.length).toBeGreaterThan(0); // the fabricated label is replaced
    });
});
