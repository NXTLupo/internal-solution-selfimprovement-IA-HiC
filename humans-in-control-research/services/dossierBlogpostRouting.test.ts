/**
 * #dossier and #blogpost routing (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-B1/B2a).
 *
 * The parser list is GENERATED from the catalog plus HTML_GENERATOR_LABELS, so a new report kind
 * is wired by data alone. These pins prove the wiring actually resolves: each directive triggers
 * its own generator with the right label, its aliases map back to the right catalog entry, each
 * appears exactly once in the generated list, and #report is not hijacked by either of them.
 */
import { describe, it, expect } from 'vitest';
import { parseHtmlArtifactDirective, HTML_ARTIFACT_PARSERS } from './hashtagParser';
import { catalogEntryFor } from './artifactCatalog';

describe('new directives resolve end to end', () => {
    it('#blogpost triggers its own generator', () => {
        const r = parseHtmlArtifactDirective('#blogpost what the co-op evidence says #NXT');
        expect(r?.directive.generator).toBe('#blogpost');
        expect(r?.label).toBe('blog post');
        expect(r?.directive.brand).toBe('NXT');
        expect(r?.directive.topic).toBe('what the co-op evidence says');
    });
    it('#dossier triggers its own generator', () => {
        const r = parseHtmlArtifactDirective('#dossier the case for redesigning advising');
        expect(r?.directive.generator).toBe('#dossier');
        expect(r?.label).toBe('evidence dossier');
    });
    it('#interactive-report aliases to dossier entry', () => {
        expect(catalogEntryFor('#interactive-report')?.id).toBe('dossier');
    });
    it('#blog aliases to the blogpost entry', () => {
        expect(catalogEntryFor('#blog')?.id).toBe('blogpost');
    });
    it('both appear exactly once in the generated parser list', () => {
        const gens = HTML_ARTIFACT_PARSERS.map(p => p.generator);
        expect(gens.filter(g => g === '#blogpost')).toHaveLength(1);
        expect(gens.filter(g => g === '#dossier')).toHaveLength(1);
    });
    it('#report still does not trigger dossier or blogpost', () => {
        expect(parseHtmlArtifactDirective('#report quarterly findings')?.directive.generator).toBe('#report');
    });
});
