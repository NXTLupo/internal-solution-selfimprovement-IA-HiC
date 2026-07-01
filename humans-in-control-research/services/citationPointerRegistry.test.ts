import { describe, it, expect } from 'vitest';
import {
    registerPointerSource,
    registerChunkSources,
    registerResolvedChunkSources,
    registerPageResolvedSources,
    resolveManifestPointers,
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
