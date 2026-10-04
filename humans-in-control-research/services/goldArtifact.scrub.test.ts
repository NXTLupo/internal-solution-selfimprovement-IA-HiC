// E9 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, Stage 2.2; vision phase 9).
// The export surface had no em-dash / emoji scrub: gold_pptx_export.py renders whatever text the
// stage HTML carries. exportGoldPptx / exportGoldDeckPptx now run scrubStageHtmlText over the
// stage HTML before the POST. These tests pin the contract on small HTML strings: text nodes only,
// never tag names, attribute values or <style>/<script> contents, and byte-identical output for a
// text node that carries neither glyph.
import { describe, it, expect } from 'vitest';
import { scrubStageHtmlText } from './goldArtifact';

describe('scrubStageHtmlText', () => {
    it('rewrites em-dashes and strips emoji inside text nodes only', () => {
        const html = '<div class="k—v" data-mark="\u{1F680}" title="a — b">Clause one — clause two \u{1F680}</div>';
        const out = scrubStageHtmlText(html);
        expect(out).toContain('class="k—v"');          // attribute value untouched
        expect(out).toContain('data-mark="\u{1F680}"');     // attribute value untouched
        expect(out).toContain('title="a — b"');        // attribute value untouched
        expect(out).toMatch(/>Clause one, clause two\s*</); // text node scrubbed
        expect(out).not.toMatch(/>[^<]*—[^<]*</);      // no em-dash left in any text node
        expect(out).not.toMatch(/>[^<]*\u{1F680}[^<]*</u);  // no emoji left in any text node
    });

    it('normalizes the &mdash; entity and keeps hyphenated compounds and numeric ranges intact', () => {
        // spaced dash = clause break -> comma; touching alphanumerics = compound -> ASCII hyphen;
        // the ASCII hyphens already present ("donor-centric", "2026-27") are never touched.
        const out = scrubStageHtmlText('<p>donor-centric 2026-27 range &mdash; and 12—month plan</p>');
        expect(out).toBe('<p>donor-centric 2026-27 range, and 12-month plan</p>');
    });

    it('leaves <style> and <script> blocks verbatim', () => {
        const css = "<style>.x::before{content:'—'} .y{font-family:'IBM Plex Mono'}</style>";
        const js = '<script>const s = "a — b \u{1F680}";</script>';
        const out = scrubStageHtmlText(`${css}<div>x — y</div>${js}`);
        expect(out.startsWith(css)).toBe(true);
        expect(out.endsWith(js)).toBe(true);
        expect(out).toContain('<div>x, y</div>');
    });

    it('returns a text node byte-identical when it carries neither glyph (pre-wrap meta rows depend on it)', () => {
        const html = '<div class="metarow">RETAINED  ·  BOUTIQUE  ·  2026</div><div>Fees ,</div>';
        expect(scrubStageHtmlText(html)).toBe(html);
    });

    it('is a no-op on empty input', () => {
        expect(scrubStageHtmlText('')).toBe('');
    });
});
