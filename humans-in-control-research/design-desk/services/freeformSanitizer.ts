/**
 * Lightweight HTML sanitizer for freeform-HTML artifacts. Strips scripts,
 * event handlers, and javascript: URLs without pulling in DOMPurify (which
 * we'll add as a hardening pass later). The freeform pipeline renders inside
 * an iframe with `sandbox="allow-same-origin"` (no scripts allowed at the
 * browser level), so this is defense-in-depth — even if the regex misses
 * something, the iframe sandbox prevents script execution.
 *
 * IMPORTANT: this sanitizer must NOT touch <style> blocks, <link> tags for
 * Google Fonts, or SVG primitives — the exemplars rely on all of those.
 */

const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const SCRIPT_OPEN_RE = /<script\b[^>]*>/gi;
const ON_HANDLER_RE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_RE = /(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:[^"'>\s]*["']?/gi;
const IFRAME_RE = /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi;
const IFRAME_OPEN_RE = /<iframe\b[^>]*\/?>/gi;
const FORM_RE = /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi;
const FORM_OPEN_RE = /<form\b[^>]*\/?>/gi;
const OBJECT_EMBED_RE = /<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi;

// 2026-05-12 — VS-thinking reasoning block patterns. The emphasis-VS preamble
// for freeform artifacts (chatToFreeform.ts buildEmphasisVSPreamble) asks the
// model to emit <vs_thinking>, <emphasis_vs>, <commit_to>, <why_committed>
// scratch blocks before the body content. Strip them here so they never reach
// the rendered iframe. Idempotent.
const VS_THINKING_TAG_RE = /<(?:vs_thinking|emphasis_vs|commit_to|why_committed|thinking)\b[^>]*>[\s\S]*?<\/(?:vs_thinking|emphasis_vs|commit_to|why_committed|thinking)\s*>/gi;
const VS_STRAY_TAG_RE = /<\/?(?:vs_thinking|emphasis_vs|commit_to|why_committed|thinking)\b[^>]*>/gi;
const VS_PLAINTEXT_PREAMBLE_RE = /^[\s\S]*?(?=<(?:main|article|section|header|div|h1|figure|aside|nav)\b)/i;
// Markers that, when found in the FIRST ~3KB of content, indicate a leaked
// VS preamble that needs the plain-text strip.
const VS_FINGERPRINTS = [
    /\bLayer\s*:\s*(?:Visual\s+Layout|Diagram|Information|Interaction|Iconography)/i,
    /\bCandidate\s+\d+\s*[—-]\s*p\s*[≈~]\s*0\./i,
    /\bCOMMIT\s*:\s*\d+\s*[—-]/i,
    /\bVisual\s+Layout\s+Candidates\b/i,
    /\bCentered-card\b/i,
    /\bEditorial-asymmetric\b/i,
    /\bSplit-screen\s+quote-led\b/i,
    /\bp\s*[≈~]\s*0\.\d+\b/i,
];

function stripVsReasoning(html: string): string {
    let out = html;
    out = out.replace(VS_THINKING_TAG_RE, '');
    out = out.replace(VS_STRAY_TAG_RE, '');
    // Plain-text preamble: only strip when 2+ fingerprint markers appear in
    // the first ~3KB (avoids false positives on artifacts that legitimately
    // contain words like "Layer:" in their content).
    const head = out.slice(0, 3000);
    const matches = VS_FINGERPRINTS.reduce((n, re) => n + (re.test(head) ? 1 : 0), 0);
    if (matches >= 2) {
        const m = out.match(VS_PLAINTEXT_PREAMBLE_RE);
        if (m && m[0]) {
            // Verify the captured prefix is dominated by VS markers before stripping.
            const prefix = m[0];
            const prefixMatches = VS_FINGERPRINTS.reduce((n, re) => n + (re.test(prefix) ? 1 : 0), 0);
            if (prefixMatches >= 2) out = out.slice(m[0].length);
        }
    }
    return out.replace(/^\s+/, '');
}

export function sanitizeFreeformHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    let out = html;
    // 2026-05-12 — VS reasoning FIRST so the rest of the sanitizer doesn't
    // accidentally pattern-match against scratch content.
    out = stripVsReasoning(out);
    out = out.replace(SCRIPT_TAG_RE, '');
    out = out.replace(SCRIPT_OPEN_RE, '');
    out = out.replace(IFRAME_RE, '');
    out = out.replace(IFRAME_OPEN_RE, '');
    out = out.replace(FORM_RE, '');
    out = out.replace(FORM_OPEN_RE, '');
    out = out.replace(OBJECT_EMBED_RE, '');
    out = out.replace(ON_HANDLER_RE, '');
    out = out.replace(JAVASCRIPT_URL_RE, '');

    return out;
}
