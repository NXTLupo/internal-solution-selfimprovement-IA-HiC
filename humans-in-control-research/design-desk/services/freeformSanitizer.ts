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

export function sanitizeFreeformHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    let out = html;
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
