import { describe, it, expect } from 'vitest';
import {
    registerPointerSource,
    registerChunkSources,
    registerResolvedChunkSources,
    registerPageResolvedSources,
    resolveManifestPointers,
    extractPointers,
    pointerToWikiPath,
    quoteWithAffordance,
    splitProseWithPointers,
} from './citationPointerRegistry';

describe('citationPointerRegistry', () => {
    it('resolves a registered pointer to its named source', () => {
        registerPointerSource('articles/client-uploads/4fe24ed6a9.md', 'NXT Stakeholder Interviews');
        const out = resolveManifestPointers(
            'Advancement is blind to high-capacity families [articles/client-uploads/4fe24ed6a9.md#c15].'
        );
        expect(out).toContain('(Source: NXT Stakeholder Interviews)');
        expect(out).not.toContain('.md#c');
    });

    it('#14: a chunk with no per-chunk source falls back to its page doc-level resolved_sources (honest synthesis)', () => {
        registerPageResolvedSources('articles/gemini-focused-research/e36bf713ff.md', ['JD Power', 'OpenText Blogs', 'Insurance Journal', 'Capgemini']);
        const out = resolveManifestPointers('Shoppers switch on price [articles/gemini-focused-research/e36bf713ff.md#c3].');
        expect(out).toContain('Synthesis of JD Power, OpenText Blogs, Insurance Journal +1 more');
        expect(out).not.toContain('.md#c');
    });

    it('#14: a registered per-chunk source still WINS over the page-level fallback (tier order)', () => {
        registerPageResolvedSources('articles/deep/x.md', ['Aggregate A', 'Aggregate B']);
        registerChunkSources('articles/deep/x.md#c0', ['Insurance Business']);
        const out = resolveManifestPointers('Claim [articles/deep/x.md#c0].');
        expect(out).toContain('(Source: Insurance Business)');
        expect(out).not.toContain('Synthesis of Aggregate');
    });

    it('dedupes multi-pointer groups into a Sources list', () => {
        registerPointerSource('sources/a.md', 'Higher Ed Dive');
        registerPointerSource('sources/b.md', 'Inside Higher Ed');
        const out = resolveManifestPointers('Claim [sources/a.md#c1, sources/b.md#c2, sources/a.md#c9].');
        expect(out).toContain('(Sources: Higher Ed Dive; Inside Higher Ed)');
    });

    it('prettifies unregistered dated stems', () => {
        const out = resolveManifestPointers('Quote [sources/2026-04-21-identify-named-university-case-studies-f.md#c11].');
        expect(out).toContain('(Source: Identify Named University Case Studies F)');
        expect(out).not.toContain('2026-04-21');
    });

    it('falls back to the directory label for content-hash filenames', () => {
        const out = resolveManifestPointers('Quote [articles/client-uploads/e841b4de17.md#c6].');
        expect(out).toContain('(Source: Client Uploads)');
        expect(out).not.toContain('e841b4de17');
    });

    it('strips bare (unbracketed) pointers without eating prose', () => {
        const out = resolveManifestPointers('See articles/client-uploads/ab12cd34ef.md#c3 for detail.');
        expect(out).not.toContain('.md#c');
        expect(out).toContain('for detail');
    });

    it('sanitizes quotes out of registered names (JSON safety)', () => {
        registerPointerSource('sources/q.md', 'The "Annual" Report');
        const out = resolveManifestPointers('Claim [sources/q.md#c2].');
        expect(out).toContain('The Annual Report');
        expect(out).not.toContain('"Annual"');
    });

    it('leaves pointer-free text untouched', () => {
        const text = 'Plain text with a hyphen-word and [CHUNK_004].';
        expect(resolveManifestPointers(text)).toBe(text);
    });

    // --- WS-A: per-chunk REAL source resolution wins over the page-level title ---
    it('chunk-level (Tier 1) sources override the page-level synthesis title', () => {
        // A deep-research synthesis page registered page-level as the provider bucket...
        registerPointerSource('articles/gemini-focused-research/syn1.md', 'Gemini Focused Research');
        // ...but the specific chunk carries its REAL underlying source.
        registerChunkSources('articles/gemini-focused-research/syn1.md#c3', ['Higher Ed Dive']);
        const out = resolveManifestPointers('AI raises conversion [articles/gemini-focused-research/syn1.md#c3].');
        expect(out).toContain('(Source: Higher Ed Dive)');
        expect(out).not.toContain('Gemini Focused Research');
    });

    it('a multi-source chunk resolves to an honest synthesis label, never a single false primary', () => {
        registerChunkSources('articles/gemini-focused-research/syn2.md#c1', ['Dakota', 'Deloitte Insights', 'BCG', 'The WealthAdvisor']);
        const out = resolveManifestPointers('Claim [articles/gemini-focused-research/syn2.md#c1].');
        expect(out).toContain('Synthesis of Dakota, Deloitte Insights, BCG +1 more');
        expect(out).not.toMatch(/\+\d+ sources/); // never the old false-primary "Dakota +N sources"
    });

    it('registerResolvedChunkSources bridges resolved chunks ({id, sources:[{n,u}]})', () => {
        registerResolvedChunkSources([
            { id: 'articles/x/p.md#c7', sources: [{ n: 'Chronicle of Higher Ed', u: 'https://chronicle.com/a' }] },
        ]);
        const out = resolveManifestPointers('Finding [articles/x/p.md#c7].');
        expect(out).toContain('(Source: Chronicle of Higher Ed)');
    });
});

/**
 * extractPointers exists because a surface that can offer a click needs the address,
 * not a name. Every fixture below is a string the 2026-08-21 live run actually put on
 * screen in a theme card, where the pointer rendered raw and the card's own wiki button
 * stayed hidden.
 */
describe('extractPointers: prose for the eye, pointers for the affordance', () => {
    it('lifts a trailing pointer out of a live theme quote', () => {
        const live = '"Overvalue the number of AI features rather than how AI is applied to their process" [articles/exs-clockwork/8ad772998f.md#c1]';
        const { text, pointers } = extractPointers(live);
        expect(pointers).toEqual(['articles/exs-clockwork/8ad772998f.md#c1']);
        expect(text).toBe('"Overvalue the number of AI features rather than how AI is applied to their process"');
        expect(text).not.toContain('.md#c');
    });

    it('handles the social-intelligence path shape', () => {
        const { text, pointers } = extractPointers(
            'A consultant said partners will not let a model near the final assessment [social-intelligence/reddit-deep/consulting/1rlukge.md#c4].'
        );
        expect(pointers).toEqual(['social-intelligence/reddit-deep/consulting/1rlukge.md#c4']);
        expect(text).toBe('A consultant said partners will not let a model near the final assessment.');
    });

    it('keeps every pointer in a multi-pointer group, deduped and ordered', () => {
        const { text, pointers } = extractPointers(
            'Two sources converge [articles/a.md#c1, articles/b.md#c2] and one repeats [articles/a.md#c1].'
        );
        expect(pointers).toEqual(['articles/a.md#c1', 'articles/b.md#c2']);
        expect(text).toBe('Two sources converge and one repeats.');
    });

    it('takes a bare unbracketed pointer too, since the render path tolerates one', () => {
        const { text, pointers } = extractPointers('Enrichment shortens research articles/exs-clockwork/63e5475889.md#c1');
        expect(pointers).toEqual(['articles/exs-clockwork/63e5475889.md#c1']);
        expect(text).toBe('Enrichment shortens research');
    });

    it('leaves a clean quote exactly as it was', () => {
        const clean = 'We help clients think past the obvious candidate.';
        const out = extractPointers(clean);
        expect(out.text).toBe(clean);
        expect(out.pointers).toEqual([]);
    });

    it('is safe on empty and undefined input', () => {
        expect(extractPointers('')).toEqual({ text: '', pointers: [] });
        expect(extractPointers(undefined as any)).toEqual({ text: '', pointers: [] });
    });

    it('never leaves a dangling space inside the quote marks', () => {
        const { text } = extractPointers('"A finding [articles/a.md#c1]"');
        expect(text).toBe('"A finding"');
    });
});

describe('pointerToWikiPath', () => {
    it('drops the chunk fragment so the value can address a page', () => {
        expect(pointerToWikiPath('articles/exs-clockwork/63e5475889.md#c1')).toBe('articles/exs-clockwork/63e5475889.md');
    });

    it('REFUSES anything that is not a pointer, so a label can never reach a file open', () => {
        expect(pointerToWikiPath('Clockwork')).toBeNull();
        expect(pointerToWikiPath('articles/exs-clockwork/63e5475889.md')).toBeNull();
        expect(pointerToWikiPath('')).toBeNull();
    });
});

/**
 * REGRESSION for the card surface. The 2026-08-21 verification of the week's
 * promotional claims found a researcher could not open the passage behind a citation:
 * theme cards printed 87 raw `[articles/x.md#c1]` markers as body text while the card's
 * own "open in wiki" control stayed hidden, because the address sat inside the quote
 * instead of in the field the control reads. ResearchCard only draws that control when
 * `wikiPath` is set and the pointer chip when `chunkPointer` is set, so both must be
 * populated or addressable evidence stays unreachable.
 */
describe('quoteWithAffordance: clean sentence for the reader, reachable source', () => {
    const LIVE = '"Overvalue the number of AI features rather than how AI is applied to their process" [articles/exs-clockwork/8ad772998f.md#c1]';

    it('shows no machine marker and still populates both affordance fields', () => {
        const q = quoteWithAffordance(LIVE, { sourceLabel: 'Clockwork' });
        expect(q.text).not.toMatch(/\.md#c\d+/);
        expect(q.text).toContain('Overvalue the number of AI features');
        expect(q.chunkPointer).toBe('articles/exs-clockwork/8ad772998f.md#c1');
        expect(q.wikiPath).toBe('articles/exs-clockwork/8ad772998f.md');
    });

    it('prefers the recorded pointer over one parsed out of prose', () => {
        const q = quoteWithAffordance(LIVE, {
            sourceLabel: 'Clockwork',
            chunkPointer: 'articles/exs-clockwork/63e5475889.md#c1',
        });
        expect(q.chunkPointer).toBe('articles/exs-clockwork/63e5475889.md#c1');
        expect(q.text).not.toMatch(/\.md#c\d+/);
    });

    it('never overwrites an explicit wikiPath from the record', () => {
        const q = quoteWithAffordance(LIVE, { wikiPath: 'articles/exs-clockwork/curated.md' });
        expect(q.wikiPath).toBe('articles/exs-clockwork/curated.md');
    });

    it('offers NO affordance when there is no pointer, rather than a dead control', () => {
        const q = quoteWithAffordance('We help clients think past the obvious candidate.', { sourceLabel: 'DSG' });
        expect(q.text).toBe('We help clients think past the obvious candidate.');
        expect(q.chunkPointer).toBe('');
        expect(q.wikiPath).toBe('');
    });

    it('resolves a social-intelligence pointer to its page', () => {
        const q = quoteWithAffordance(
            'Partners will not let a model near the final assessment [social-intelligence/reddit-deep/consulting/1rlukge.md#c4].',
            { sourceLabel: 'Reddit r/consulting' }
        );
        expect(q.wikiPath).toBe('social-intelligence/reddit-deep/consulting/1rlukge.md');
        expect(q.text.endsWith('assessment.')).toBe(true);
    });

    it('carries every other field through untouched', () => {
        const q = quoteWithAffordance(LIVE, { sourceLabel: 'Clockwork', sourceDate: '2026-03-02', externalUrl: 'https://x.test/a' });
        expect(q.sourceLabel).toBe('Clockwork');
        expect(q.sourceDate).toBe('2026-03-02');
        expect(q.externalUrl).toBe('https://x.test/a');
    });
});

/**
 * E1.2. The positional splitter that lets prose carry a citation chip where the
 * citation actually was. `extractPointers` throws position away by design; this keeps
 * it, so a sentence can stay clean AND stay linked.
 */
describe('splitProseWithPointers', () => {
    it('splits a live theme summary into prose and one chip', () => {
        const segs = splitProseWithPointers(
            'Clockwork markets enrichment as an accelerant [articles/exs-clockwork/8ad772998f.md#c1].',
        );
        expect(segs.map(s => s.kind)).toEqual(['text', 'pointer', 'text']);
        expect((segs[0] as any).value).toBe('Clockwork markets enrichment as an accelerant');
        expect((segs[1] as any).pointer).toBe('articles/exs-clockwork/8ad772998f.md#c1');
        expect((segs[1] as any).wikiPath).toBe('articles/exs-clockwork/8ad772998f.md');
        expect((segs[2] as any).value).toBe('.');
    });

    it('gives every pointer in a group its own chip, so any of them can be opened', () => {
        const segs = splitProseWithPointers('Two sources agree [articles/a.md#c1, articles/b.md#c2].');
        expect(segs.filter(s => s.kind === 'pointer').map((s: any) => s.pointer))
            .toEqual(['articles/a.md#c1', 'articles/b.md#c2']);
    });

    it('keeps the prose in document order across several citations', () => {
        const segs = splitProseWithPointers('First [articles/a.md#c1] then second [articles/b.md#c2] ends.');
        expect(segs.filter(s => s.kind === 'text').map((s: any) => s.value.trim()))
            .toEqual(['First', 'then second', 'ends.']);
    });

    it('returns one text segment when there is nothing to cite', () => {
        expect(splitProseWithPointers('No citation here.')).toEqual([{ kind: 'text', value: 'No citation here.' }]);
    });

    it('never leaves an empty prose run between adjacent chips', () => {
        const segs = splitProseWithPointers('Claim [articles/a.md#c1][articles/b.md#c2]');
        expect(segs.filter(s => s.kind === 'text' && !(s as any).value)).toHaveLength(0);
    });

    it('is safe on empty input', () => {
        expect(splitProseWithPointers('')).toEqual([]);
        expect(splitProseWithPointers(undefined as any)).toEqual([]);
    });
});
