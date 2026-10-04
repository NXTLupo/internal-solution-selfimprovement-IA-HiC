/**
 * HTML DEPTH DELTA - the anchored extend-in-place turn for a thin HTML artifact.
 *
 * D8 / Stage 4.4 (2026-10-01, plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md). The HTML
 * depth-floor retry in CorpusChatPanel used to re-send the whole payload (about 137K characters) and
 * regenerate the artifact from scratch when the visible word count was under the floor. That paid for
 * the full prefix twice and threw away a draft the reader may already have approved in spirit.
 *
 * This module turns the retry into a DELTA turn under the reinforcement-inference contract: the same
 * system prompt (so the cached prefix hits), the prior answer anchored verbatim, and a short instruction
 * that names the thin sections by heading and word count and asks for those sections only, extended in
 * place. `mergeExtendedSections` then splices the returned sections back into the prior HTML by heading;
 * the caller never regenerates from scratch.
 *
 * Pure functions, no model call: the panel owns the call and the logging of before/after word counts.
 */

export interface HtmlSection {
    /** Heading text (tags stripped, whitespace collapsed); '' for the preamble before the first heading. */
    heading: string;
    /** Heading level (1-3); 0 for the preamble. An h1 is the document title, never a section to extend. */
    level: number;
    /** The section's HTML, from its heading tag to the next heading tag (or the end). */
    html: string;
    /** Visible words (tags, scripts, styles, vs_thinking removed). */
    words: number;
}

export interface ExtensionPlan {
    sections: HtmlSection[];
    /** The sections the delta turn asks the model to extend, thinnest first. */
    thinSections: HtmlSection[];
    /** Total visible words before the turn. */
    wordsBefore: number;
    /** The short user turn: anchor + named thin sections + the extend-in-place instruction. */
    deltaPrompt: string;
}

export interface MergeResult {
    html: string;
    /** Sections replaced by heading match. */
    replaced: number;
    /** Returned sections with no heading match, appended before the end of the document. */
    appended: number;
}

/** Visible words in an HTML fragment, the same count the panel's depth floor uses. */
export function visibleWordCount(html: string): number {
    return String(html || '')
        .replace(/<vs_thinking>[\s\S]*?<\/vs_thinking>/i, '')
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
}

const HEADING_RE = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

function headingText(inner: string): string {
    return String(inner || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Split an HTML document into heading-delimited sections (h1-h3). Preamble before the first heading is section 0. */
function splitHtmlSections(html: string): HtmlSection[] {
    const src = String(html || '');
    const marks: Array<{ index: number; heading: string; level: number }> = [];
    HEADING_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HEADING_RE.exec(src)) !== null) {
        marks.push({ index: m.index, heading: headingText(m[2]), level: Number(m[1]) });
    }
    if (marks.length === 0) return [{ heading: '', level: 0, html: src, words: visibleWordCount(src) }];
    const out: HtmlSection[] = [];
    if (marks[0].index > 0) {
        const pre = src.slice(0, marks[0].index);
        out.push({ heading: '', level: 0, html: pre, words: visibleWordCount(pre) });
    }
    for (let i = 0; i < marks.length; i++) {
        const start = marks[i].index;
        const end = i + 1 < marks.length ? marks[i + 1].index : src.length;
        const chunk = src.slice(start, end);
        out.push({ heading: marks[i].heading, level: marks[i].level, html: chunk, words: visibleWordCount(chunk) });
    }
    return out;
}

/**
 * Decide which sections the delta turn extends and author the short anchored prompt.
 * Thin = below the per-section share of the floor (floor / body-section count), floored at 60 words.
 * At least one section is always named when the document is under the floor, so the turn has work to do.
 */
export function planHtmlExtension(html: string, floor: number): ExtensionPlan {
    const sections = splitHtmlSections(html);
    const wordsBefore = visibleWordCount(html);
    const body = sections.filter(s => s.heading && s.level > 1);
    const perSection = Math.max(60, Math.round(floor / Math.max(1, body.length)));
    let thin = body.filter(s => s.words < perSection).sort((a, b) => a.words - b.words);
    if (thin.length === 0 && body.length > 0 && wordsBefore < floor) {
        thin = [...body].sort((a, b) => a.words - b.words).slice(0, Math.max(1, Math.ceil(body.length / 3)));
    }
    const deficit = Math.max(0, floor - wordsBefore);
    const named = thin.map(s => `- "${s.heading}" (${s.words} words; extend to at least ${perSection})`).join('\n');
    const deltaPrompt = [
        'EXTEND IN PLACE (delta turn). Your prior answer is below, verbatim. It is the anchor: keep its thesis,',
        `its headings, its order, and every section it already develops. The document is ${wordsBefore} visible`,
        `words against a floor of ${floor} (${deficit} short). Only the sections named here are thin:`,
        named || '- (no heading-delimited sections found; extend the main body)',
        '',
        'Return ONLY those sections, each as a complete HTML fragment that starts with the SAME heading tag and',
        'heading text as in the prior answer, extended with more evidence: named-source verbatim quotes with',
        'their citations, case detail where the corpus supports it, and convergent sources. Do not return the',
        'other sections, do not add new headings, do not summarize, do not change the heading text. Every',
        'sentence obeys the evidence contract from the first turn.',
        '',
        '=== PRIOR ANSWER (verbatim HTML; the anchor) ===',
        html,
    ].join('\n');
    return { sections, thinSections: thin, wordsBefore, deltaPrompt };
}

function normHeading(h: string): string {
    return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Splice the returned sections into the prior HTML by heading. A returned section whose heading matches a
 * prior section replaces it; one with no match is appended before the closing of the document. Sections the
 * model did not return stay exactly as they were. If the reply holds no headed section, the prior HTML
 * is returned unchanged (nothing to merge).
 */
export function mergeExtendedSections(priorHtml: string, reply: string, plan: ExtensionPlan): MergeResult {
    const cleaned = String(reply || '')
        .replace(/^```(?:html)?\s*\n/i, '')
        .replace(/\n```\s*$/i, '')
        .replace(/<vs_thinking>[\s\S]*?<\/vs_thinking>/i, '')
        .trim();
    const returned = splitHtmlSections(cleaned).filter(s => s.heading && s.level > 1 && s.words > 0);
    if (returned.length === 0) return { html: priorHtml, replaced: 0, appended: 0 };

    const byHeading = new Map<string, HtmlSection>();
    for (const s of returned) byHeading.set(normHeading(s.heading), s);

    let replaced = 0;
    const merged = plan.sections.map(s => {
        if (!s.heading) return s.html;
        const hit = byHeading.get(normHeading(s.heading));
        if (!hit) return s.html;
        byHeading.delete(normHeading(s.heading));
        // Never shrink a section: an extension that lost words is not an extension.
        if (hit.words <= s.words) return s.html;
        replaced += 1;
        return hit.html;
    });

    let appended = 0;
    const leftovers = Array.from(byHeading.values());
    let html = merged.join('');
    if (leftovers.length) {
        const extra = leftovers.map(s => s.html).join('\n');
        appended = leftovers.length;
        const closeMain = html.search(/<\/main>\s*$/i);
        html = closeMain >= 0 ? html.slice(0, closeMain) + extra + '\n' + html.slice(closeMain) : html + '\n' + extra;
    }
    return { html, replaced, appended };
}
