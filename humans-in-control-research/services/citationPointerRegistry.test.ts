import { describe, it, expect } from 'vitest';
import {
    registerPointerSource,
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
});
