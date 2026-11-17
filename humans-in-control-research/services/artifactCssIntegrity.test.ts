/**
 * artifactCssIntegrity.test.ts - 2026-11-09
 *
 * The owner reported a shipped #brief as "AI slop looking and not professional and lacks much
 * graphical content", then "that black isometric stack is awful". Both were one defect, and it
 * was not a writing defect.
 *
 * `scrubArtifactHtmlMeta` ended with a prose tidy, `/ +([.,;:])/g -> '$1'`, applied to the whole
 * document. Inside a <style> block that rewrote every DESCENDANT selector: `.brief .stack` became
 * `.brief.stack` (an element carrying BOTH classes), which matches nothing. The artifacts shipped
 * with dead stylesheets: serif body text, collapsed grids, and inline SVG exhibits falling back to
 * the SVG default fill, which is BLACK. 34 of the 69 stored artifacts with a <style> block were
 * damaged.
 *
 * These tests pin the contract: prose rules never reach <style>, <script>, <pre>, <code>.
 */
import { describe, it, expect } from 'vitest';
import { scrubArtifactHtmlMeta, maskNonProseRegions } from './slidePostProcessor';

describe('scrubArtifactHtmlMeta leaves non-prose regions byte-identical', () => {
    it('keeps the combinator in a descendant CSS selector', () => {
        const html = '<style>.brief .stack{display:grid}.brief .s-top{fill:var(--nxt-bg)}</style><p>Ok.</p>';
        const out = scrubArtifactHtmlMeta(html);
        expect(out).toContain('.brief .stack{display:grid}');
        expect(out).toContain('.brief .s-top{fill:var(--nxt-bg)}');
        expect(out).not.toContain('.brief.stack');
    });

    it('survives the exact selector shapes a brief emits', () => {
        const css = [
            '.brief .hero .big{font-size:76px}',
            '.brief .rules li .hot::before{left:8px}',
            '.brief .cube .s-left{fill:var(--nxt-cyan)}',
            '.brief h2{font-size:28px}',
        ].join('');
        const out = scrubArtifactHtmlMeta(`<style>${css}</style><p>Body.</p>`);
        expect(out).toContain(css);
    });

    it('does not touch script or pre or code', () => {
        const html = '<script>const a = arr .map(x => x);</script><pre>a  ,b</pre><code>x .y</code><p>Fine.</p>';
        expect(scrubArtifactHtmlMeta(html)).toContain('arr .map(x => x)');
        expect(scrubArtifactHtmlMeta(html)).toContain('<pre>a  ,b</pre>');
        expect(scrubArtifactHtmlMeta(html)).toContain('<code>x .y</code>');
    });

    it('still tidies a real space-before-punctuation in prose', () => {
        const out = scrubArtifactHtmlMeta('<style>.a .b{color:red}</style><p>on terms , not by default .</p>');
        expect(out).toContain('on terms, not by default.');
        expect(out).toContain('.a .b{color:red}');
    });

    it('still strips self-reference outside the style block', () => {
        const out = scrubArtifactHtmlMeta('<style>.r .s{top:0}</style><p>Based on the research, churn is the failure.</p>');
        expect(out).toContain('churn is the failure.');
        expect(out).not.toContain('Based on the research');
        expect(out).toContain('.r .s{top:0}');
    });
});

describe('maskNonProseRegions', () => {
    it('round-trips a document unchanged when nothing is rewritten', () => {
        const html = '<style>.a .b{x:1}</style><p>Text.</p><script>let z = 1;</script>';
        const { masked, restore } = maskNonProseRegions(html);
        expect(masked).not.toContain('.a .b');
        expect(restore(masked)).toBe(html);
    });

    it('does not re-interpret a dollar sign inside the masked block', () => {
        const html = '<style>.a .b{content:"$&"}</style><p>Text.</p>';
        const { masked, restore } = maskNonProseRegions(html);
        expect(restore(masked)).toBe(html);
    });

    it('handles a document with no non-prose region', () => {
        const html = '<p>Just prose.</p>';
        const { masked, restore } = maskNonProseRegions(html);
        expect(masked).toBe(html);
        expect(restore(masked)).toBe(html);
    });
});

/**
 * SECOND SITE (2026-11-09). Fixing `scrubArtifactHtmlMeta` alone appeared to work: a regenerated
 * #blogpost and #datatable came back with zero dead rules. A #chronology on the same build came
 * back with EIGHT, because `renderPointerCitationsHtml` carries its own copy of the same tidy and
 * returns early when the document has no `.md#c` pointer. The first two documents had none left by
 * that stage; the chronology did. A document WITH pointers is therefore the case that matters.
 */
describe('renderPointerCitationsHtml leaves CSS alone', () => {
    it('keeps the combinator while rendering a pointer group', async () => {
        const { renderPointerCitationsHtml } = await import('./citationPointerRegistry');
        const html = '<style>.chron .era{padding:0}.chron .takeaway strong{color:red}</style>'
            + '<p>A claim [wiki/articles/x.md#c3] stands.</p>';
        const out = renderPointerCitationsHtml(html);
        expect(out).toContain('.chron .era{padding:0}');
        expect(out).toContain('.chron .takeaway strong{color:red}');
        expect(out).not.toContain('.chron.era');
    });

    it('returns a pointerless document untouched', async () => {
        const { renderPointerCitationsHtml } = await import('./citationPointerRegistry');
        const html = '<style>.a .b{x:1}</style><p>No pointers here.</p>';
        expect(renderPointerCitationsHtml(html)).toBe(html);
    });
});

/**
 * THIRD AND FOURTH SITES (2026-11-09). Chasing callers found the same tidy copied into
 * `stripEmoji`, `stripProviderArtifactTags` and `stripEmDashesInPlace`. Each one exists only to
 * clean up after its OWN deletion, and each ran unconditionally, so any caller that passed a whole
 * HTML document rewrote its CSS. `artifactChain.scrubStrings` walks every string in an artifact,
 * `html` included, which is how a #chronology came back with 16 dead rules on a build that already
 * had the first two fixes. The contract that closes the whole class: a string with nothing to
 * strip comes back byte-identical.
 */
describe('scrub primitives return untouched input when there is nothing to strip', () => {
    const CSS_DOC = '<style>\n.chron .era{padding:0}\n.chron .takeaway strong{color:red}\n</style>\n<p>Plain sentence.</p>';

    it('stripEmoji leaves an emoji-free document byte-identical', async () => {
        const { stripEmoji } = await import('./slidePostProcessor');
        expect(stripEmoji(CSS_DOC)).toBe(CSS_DOC);
    });

    it('stripEmoji keeps CSS intact even when it does remove an emoji', async () => {
        const { stripEmoji } = await import('./slidePostProcessor');
        const out = stripEmoji(CSS_DOC.replace('Plain sentence.', 'Plain \u{1F600} sentence.'));
        expect(out).toContain('.chron .era{padding:0}');
        expect(out).not.toContain('\u{1F600}');
    });

    it('stripProviderArtifactTags leaves a tag-free document byte-identical', async () => {
        const { stripProviderArtifactTags } = await import('./slidePostProcessor');
        expect(stripProviderArtifactTags(CSS_DOC)).toBe(CSS_DOC);
    });

    it('stripEmDashesInPlace leaves a dash-free artifact byte-identical', async () => {
        const { stripEmDashesInPlace } = await import('./artifactExpertPanel');
        const artifact = { id: 'a1', title: 'A title', html: CSS_DOC };
        expect(stripEmDashesInPlace(artifact).html).toBe(CSS_DOC);
    });

    it('stripEmDashesInPlace still removes an em-dash when one is present', async () => {
        const { stripEmDashesInPlace } = await import('./artifactExpertPanel');
        const out = stripEmDashesInPlace({ html: 'one \u2014 two' }) as { html: string };
        expect(out.html).not.toContain('\u2014');
    });
});
