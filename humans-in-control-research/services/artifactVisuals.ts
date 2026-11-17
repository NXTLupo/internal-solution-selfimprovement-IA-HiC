/**
 * artifactVisuals.ts - 2026-11-09
 *
 * MEASURED DEFECT (owner directive, sample audit of 24 shipped artifacts): 22 of 24 contained ZERO
 * image elements. Reports, briefs, explainers, FAQs, study guides, quizzes, data tables, PRDs and
 * blog posts were well-cited TEXT documents, because the HTML artifact prompt never asked for a
 * picture and the chain had no step that could make one. The comparison product illustrates every
 * page, so our artifacts read as unfinished no matter how good the prose is.
 *
 * The contract is one line the model can place anywhere in the document:
 *
 *     [[visual: a student reviewing an approval prompt before granting calendar access]]
 *
 * and this module replaces each one with a real generated brand illustration inside a <figure>,
 * with the description kept as the caption so the picture is content-true and the page stays
 * readable when an image fails. Deterministic, best-effort per request: a visual that cannot be
 * generated is REMOVED rather than left as a broken placeholder, and the prose around it stands on
 * its own because the directive always sits between paragraphs, never inside a sentence.
 *
 * Why a directive and not "ask the model for an <img>": a model cannot produce an image URL, and an
 * invented src is a broken page. The model names WHAT to draw; code draws it.
 */

export interface VisualRequest {
    /** The full directive text, for replacement. */
    raw: string;
    /** The content-true description the model wrote. */
    concept: string;
}

const VISUAL_RE = /\[\[\s*visual\s*:\s*([^\]]{12,320}?)\s*\]\]/gi;

/** Every visual the document asks for, in document order. */
export function extractVisualRequests(html: string): VisualRequest[] {
    const out: VisualRequest[] = [];
    for (const m of String(html || '').matchAll(VISUAL_RE)) {
        const concept = m[1].replace(/\s+/g, ' ').trim();
        if (concept) out.push({ raw: m[0], concept });
    }
    return out;
}

function escapeAttr(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The figure markup for one rendered visual. Caption carries the concept, never a process note. */
export function renderVisualFigure(concept: string, src: string): string {
    return `<figure class="hic-visual"><img alt="${escapeAttr(concept)}" src="${escapeAttr(src)}" loading="lazy"/><figcaption>${escapeAttr(concept)}</figcaption></figure>`;
}

/** Host-page styling for artifact visuals. Injected once per document that has one. */
/**
 * 2026-11-09, found by reading a live #blogpost rather than its metrics: the illustration endpoint
 * returns a PORTRAIT canvas (896x1200), and `width:100%` scaled it to 760x1018, taller than the
 * reader's viewport. A figure that fills a whole screen stops being a figure. The cap is on HEIGHT
 * with `width:auto`, so a portrait is bounded by its height and a landscape still runs the column
 * width, and neither is stretched.
 */
export const ARTIFACT_VISUAL_STYLE = `<style id="hic-visual-style">.hic-visual{margin:1.75rem 0;padding:0;}.hic-visual img{display:block;width:auto;max-width:100%;max-height:440px;height:auto;margin:0 auto;}.hic-visual figcaption{margin:.6rem auto 0;max-width:760px;font-family:var(--nxt-mono,ui-monospace,monospace);font-size:.78rem;line-height:1.45;letter-spacing:.02em;color:var(--nxt-text-secondary,#73757A);text-align:center;}</style>`;

export type VisualRenderer = (concept: string) => Promise<string>;

export interface VisualRenderResult {
    html: string;
    rendered: number;
    requested: number;
}

/**
 * Replace every `[[visual: ...]]` directive with a generated figure.
 *
 * `cap` bounds how many images one artifact may generate, because each is a model call: a report
 * asking for twenty pictures is a cost bug, not a richer report. Requests past the cap are removed
 * so no placeholder text reaches the reader.
 */
export async function renderArtifactVisuals(
    html: string,
    render: VisualRenderer,
    cap = 4,
): Promise<VisualRenderResult> {
    const requests = extractVisualRequests(html);
    if (requests.length === 0) return { html: String(html || ''), rendered: 0, requested: 0 };

    const allowed = requests.slice(0, Math.max(0, cap));
    const srcByConcept = new Map<string, string>();
    await Promise.all(allowed.map(async (r) => {
        if (srcByConcept.has(r.concept)) return;
        try {
            const src = await render(r.concept);
            if (src) srcByConcept.set(r.concept, src);
        } catch { /* a figure that cannot be drawn is dropped, never left broken */ }
    }));

    let rendered = 0;
    const out = String(html || '').replace(VISUAL_RE, (_full, rawConcept: string) => {
        const concept = String(rawConcept).replace(/\s+/g, ' ').trim();
        const src = srcByConcept.get(concept);
        if (!src) return '';
        rendered += 1;
        return renderVisualFigure(concept, src);
    });

    const withStyle = (rendered > 0 && !out.includes('id="hic-visual-style"'))
        ? ARTIFACT_VISUAL_STYLE + out
        : out;
    return { html: withStyle, rendered, requested: requests.length };
}

/**
 * The prompt clause that asks for the visuals. Appended to the artifact payload so every long-form
 * artifact carries pictures, which is the parity gap the owner measured.
 */
export const VISUAL_CONTRACT = `=== VISUAL CONTRACT (binding: a long-form artifact without pictures is unfinished) ===
Place 2 to 4 visual directives in the document, each on its own line BETWEEN paragraphs, never
inside a sentence and never inside a heading, table, list item or quote:

    [[visual: <one concrete sentence naming exactly what the picture shows>]]

Rules for the description:
- It depicts the SUBJECT, drawn from this document's own evidence: a named actor doing the specific
  thing a cited passage describes. "A student granting read-only calendar access from an approval
  prompt" is a picture; "innovation" and "the future of AI" are not.
- Concrete nouns and one visible action. No text, labels, charts, logos or words inside the image.
- No abstract concept art, no glowing brains, no robots, no futuristic cityscapes, no handshakes.
- One per major section at most, placed where it supports the argument being made there.
- Never describe the picture in the prose around it, and never write "the image below" or "as
  shown": the figure carries its own caption.
=== END VISUAL CONTRACT ===`;
