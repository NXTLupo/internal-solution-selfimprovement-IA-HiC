/**
 * #dossier embed resolver (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-B1).
 *
 * Pins the properties that make HiC's answer different from Gemini's: the embedded artifact is
 * INLINED in the same document (no iframe, so the host page can read it), its styles travel with
 * it under a shadow root, its scripts do not, and a slug the gallery lacks is removed rather
 * than annotated (the reader never sees a note about what is missing).
 */
import { describe, it, expect } from 'vitest';
import {
    extractEmbedSlugs,
    extractEmbeddableParts,
    renderEmbedSection,
    resolveDossierEmbeds,
    type EmbeddableArtifact,
} from './dossierEmbed';

const DOC = `<!doctype html><html><head><style>.t{color:#B8B800}</style></head><body><h1 class="t">Evidence table</h1><script>window.x=1</script><p>Row</p></body></html>`;

function artifact(slug: string, html = DOC, title = 'Evidence table'): EmbeddableArtifact {
    return { slug, title, generator: '#datatable', html_source: html };
}

const fetcherFor = (...arts: EmbeddableArtifact[]) => async (slug: string) =>
    arts.find(a => a.slug === slug) || null;

describe('extractEmbedSlugs', () => {
    it('finds each slug once, in document order', () => {
        const html = '<p>[[embed:alpha-1]]</p><p>[[embed:beta-2]]</p><p>[[embed:alpha-1]]</p>';
        expect(extractEmbedSlugs(html)).toEqual(['alpha-1', 'beta-2']);
    });

    it('tolerates whitespace and ignores malformed directives', () => {
        expect(extractEmbedSlugs('[[embed: spaced-slug ]] [[embed:]] [[embedx:no]]')).toEqual(['spaced-slug']);
    });

    it('returns nothing for empty input', () => {
        expect(extractEmbedSlugs('')).toEqual([]);
    });
});

describe('extractEmbeddableParts', () => {
    it('keeps styles and body, drops scripts', () => {
        const { styles, body } = extractEmbeddableParts(DOC);
        expect(styles).toContain('.t{color:#B8B800}');
        expect(body).toContain('<h1 class="t">Evidence table</h1>');
        expect(body).toContain('<p>Row</p>');
        expect(body).not.toContain('window.x');
        expect(body).not.toContain('<script');
    });

    it('treats a bare fragment as the body', () => {
        const { body } = extractEmbeddableParts('<div>just a fragment</div>');
        expect(body).toBe('<div>just a fragment</div>');
    });

    it('strips html and head wrappers from a document with no body tag', () => {
        const { body } = extractEmbeddableParts('<html><head><title>x</title></head><div>content</div></html>');
        expect(body).toBe('<div>content</div>');
        expect(body).not.toContain('<title>');
    });
});

describe('renderEmbedSection', () => {
    it('inlines under a declarative shadow root, never an iframe', () => {
        const out = renderEmbedSection(artifact('evidence-table-1'));
        expect(out).toContain('<template shadowrootmode="open">');
        expect(out).not.toContain('<iframe');
        expect(out).toContain('data-embed-slug="evidence-table-1"');
    });

    it('shows the artifact title and keeps the slug and generator out of visible text', () => {
        const out = renderEmbedSection(artifact('evidence-table-1'));
        expect(out).toContain('>Evidence table</h3>');
        const visible = out.replace(/<[^>]+>/g, ' ');
        expect(visible).not.toContain('evidence-table-1');
        expect(visible).not.toContain('#datatable');
    });

    it('escapes a hostile title', () => {
        const out = renderEmbedSection({ slug: 's', title: '<img src=x onerror=alert(1)>', html_source: '<p>ok</p>' });
        expect(out).not.toContain('<img src=x');
        expect(out).toContain('&lt;img');
    });

    it('omits the heading when the artifact has no title', () => {
        const out = renderEmbedSection({ slug: 's', html_source: '<p>ok</p>' });
        expect(out).not.toContain('dossier-embed__title');
    });
});

describe('resolveDossierEmbeds', () => {
    it('replaces the directive with the inlined artifact', async () => {
        const html = '<h2>Findings</h2><p>[[embed:tbl]]</p>';
        const r = await resolveDossierEmbeds(html, fetcherFor(artifact('tbl')));
        expect(r.embedded).toEqual(['tbl']);
        expect(r.missing).toEqual([]);
        expect(r.html).toContain('<h2>Findings</h2>');
        expect(r.html).toContain('<p>Row</p>');
        expect(r.html).not.toContain('[[embed:');
    });

    it('removes a missing slug instead of annotating the document', async () => {
        const r = await resolveDossierEmbeds('<p>[[embed:gone]]</p>', fetcherFor());
        expect(r.missing).toEqual(['gone']);
        expect(r.embedded).toEqual([]);
        expect(r.html).not.toContain('[[embed:');
        expect(r.html.toLowerCase()).not.toContain('not found');
        expect(r.html.toLowerCase()).not.toContain('missing');
    });

    it('resolves several embeds and repeats one slug in both places', async () => {
        const html = '[[embed:a]] middle [[embed:b]] end [[embed:a]]';
        const r = await resolveDossierEmbeds(html, fetcherFor(artifact('a', DOC, 'A'), artifact('b', DOC, 'B')));
        expect(r.embedded).toEqual(['a', 'b']);
        expect(r.html.match(/data-embed-slug="a"/g)).toHaveLength(2);
    });

    it('treats a fetcher throw as a missing artifact rather than failing the run', async () => {
        const r = await resolveDossierEmbeds('[[embed:boom]]', async () => { throw new Error('proxy down'); });
        expect(r.missing).toEqual(['boom']);
        expect(r.html).not.toContain('[[embed:');
    });

    it('returns the html untouched when there is no directive', async () => {
        const html = '<p>no embeds here</p>';
        const r = await resolveDossierEmbeds(html, fetcherFor(artifact('tbl')));
        expect(r.html).toBe(html);
        expect(r.embedded).toEqual([]);
    });
});
