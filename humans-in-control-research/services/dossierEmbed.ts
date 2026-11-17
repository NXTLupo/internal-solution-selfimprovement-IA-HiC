/**
 * dossierEmbed.ts - 2026-11-09 (plans/gemini-notebook-parity-closeout-2026-11-09.md, WS-B1)
 *
 * The live Gemini Notebook run (2026-11-09) showed one capability HiC had no answer to: its
 * default report format embeds studio content inside the document. The same run also showed
 * HOW Gemini does it, and why that is the weaker half of the idea: the quiz and the flashcards
 * render in a cross-origin usercontent.goog iframe, so the host page cannot read its own
 * content, nothing is selectable or searchable across the boundary, and nothing exports.
 *
 * `#dossier` takes the capability and drops the boundary. The report prose is written by the
 * normal HTML artifact chain (so the claim-ledger gate, pointer citations and prose signal all
 * still apply), and `[[embed:<slug>]]` directives are resolved HERE, against artifacts already
 * saved in the gallery, by INLINING each one into the same document.
 *
 * Isolation without a boundary: each embed is inlined under a declarative shadow root
 * (`<template shadowrootmode="open">`). The embedded artifact keeps its own styles and ids with
 * no bleed into the host page, while the content stays same-document and same-origin, so the
 * page can read it, the viewer can select it, and the gallery can relaunch the whole dossier.
 *
 * Deliberately NOT inlined: <script> elements from embedded artifacts. Several artifacts in one
 * document would otherwise race on globals. Every HTML artifact kind HiC embeds (report, table,
 * mindmap export, infographic) renders without script.
 */

/** One artifact as the resolver needs it. Matches ArtifactPayload's relevant fields. */
export interface EmbeddableArtifact {
    slug: string;
    title?: string;
    generator?: string;
    html_source: string;
}

export type EmbedFetcher = (slug: string) => Promise<EmbeddableArtifact | null>;

export interface DossierEmbedResult {
    /** The report HTML with every directive resolved. */
    html: string;
    /** Slugs successfully inlined, in document order. */
    embedded: string[];
    /** Slugs the directive named that the gallery does not hold. */
    missing: string[];
}

/** `[[embed:some-slug]]`, case-insensitive on the keyword, slug chars only. */
const EMBED_RX = /\[\[embed:\s*([A-Za-z0-9][A-Za-z0-9_-]*)\s*\]\]/g;

/** Every slug a dossier draft asks for, de-duplicated, in first-appearance order. */
export function extractEmbedSlugs(html: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const m of String(html || '').matchAll(EMBED_RX)) {
        const slug = m[1];
        if (!seen.has(slug)) { seen.add(slug); out.push(slug); }
    }
    return out;
}

/** The parts of an artifact document that can live inside a shadow root. */
export function extractEmbeddableParts(htmlSource: string): { styles: string; body: string } {
    const src = String(htmlSource || '');
    // Styles travel with the content so the embed still looks like itself.
    const styles = Array.from(src.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)).map(m => m[0]).join('\n');
    const bodyMatch = src.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    // A fragment (no <body>) is already the body.
    let body = bodyMatch ? bodyMatch[1] : src.replace(/<!doctype[^>]*>/gi, '');
    if (!bodyMatch) {
        body = body
            .replace(/<\/?html\b[^>]*>/gi, '')
            .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
    }
    // Scripts never cross into the dossier (see the file header).
    body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<script\b[^>]*\/>/gi, '');
    return { styles, body: body.trim() };
}

function escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render one artifact as an inlined dossier section.
 *
 * The caption names the embedded artifact so the reader knows what they are looking at. It
 * carries the artifact's own title, never a process note: no "embedded from", no slug, no
 * generator id in the visible text (those ride data attributes, per the reporting-depth ban).
 */
export function renderEmbedSection(a: EmbeddableArtifact): string {
    const { styles, body } = extractEmbeddableParts(a.html_source);
    const heading = (a.title || '').trim();
    const caption = heading ? `<h3 class="dossier-embed__title">${escapeHtml(heading)}</h3>` : '';
    return [
        `<section class="dossier-embed" data-embed-slug="${escapeHtml(a.slug)}"${a.generator ? ` data-embed-generator="${escapeHtml(a.generator)}"` : ''}>`,
        caption,
        `<div class="dossier-embed__frame">`,
        `<template shadowrootmode="open">`,
        styles,
        body,
        `</template>`,
        `</div>`,
        `</section>`,
    ].filter(Boolean).join('\n');
}

/**
 * Replace every `[[embed:<slug>]]` directive with the named artifact, inlined.
 *
 * A slug the gallery does not hold is removed, not annotated: the reader of a finished artifact
 * never sees the model's note about what is missing. The caller gets the list in `missing` so it
 * can say so in the chat reply instead.
 */
export async function resolveDossierEmbeds(html: string, fetcher: EmbedFetcher): Promise<DossierEmbedResult> {
    const slugs = extractEmbedSlugs(html);
    if (slugs.length === 0) return { html: String(html || ''), embedded: [], missing: [] };

    const fetched = new Map<string, EmbeddableArtifact | null>();
    await Promise.all(slugs.map(async slug => {
        try {
            fetched.set(slug, await fetcher(slug));
        } catch {
            fetched.set(slug, null);
        }
    }));

    const embedded: string[] = [];
    const missing: string[] = [];
    const out = String(html || '').replace(EMBED_RX, (_full, slug: string) => {
        const a = fetched.get(slug);
        if (!a || !a.html_source) {
            if (!missing.includes(slug)) missing.push(slug);
            return '';
        }
        if (!embedded.includes(slug)) embedded.push(slug);
        return renderEmbedSection(a);
    });

    return { html: out, embedded, missing };
}

/** Host-page styling for inlined sections. Injected once per dossier. */
export const DOSSIER_EMBED_STYLES = `
.dossier-embed { margin: 2rem 0; }
.dossier-embed__title { font-size: 1.05rem; letter-spacing: 0.02em; text-transform: uppercase; margin: 0 0 0.75rem; }
.dossier-embed__frame { border: 1px solid rgba(0,0,0,0.12); border-radius: 2px; padding: 1.25rem; overflow-x: auto; }
`.trim();
