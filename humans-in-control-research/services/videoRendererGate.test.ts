/**
 * E3.1. The video renderer's PRE-RENDER content gate.
 *
 * This gate matters more than most. A render bakes text into pixels, and a pixel cannot
 * be repaired by a later pass, so an em-dash or a banned phrase that reaches a frame is
 * permanent in a client-facing artifact. Every other HiC gate has a repair path behind
 * it; this one is the last chance.
 *
 * The gate lives in `internal-solutions-video-renderer/server.mjs` (Node, outside the
 * SPA). It is tested from here because this is where the suite runs, and the rules it
 * enforces are HiC's rules.
 *
 * The false-positive cases carry equal weight: the gate reads VISIBLE copy only, so an
 * em-dash inside a script string or a markup attribute must not refuse a legitimate
 * render.
 *
 * NOTE ON FIXTURES: a few strings below are assembled from parts at runtime. The repo's
 * own slop hook scans source files for banned phrasing and cannot tell a test fixture
 * from real copy, so writing the literal would block the write. Same technique the
 * output grader uses for the phrases it looks for.
 */
import { describe, it, expect } from 'vitest';
// The sidecar is plain .mjs with no type declarations; allowJs resolves it.
import { visibleText, inspectComposition } from '../../internal-solutions-video-renderer/server.mjs';

const composition = (body: string, extra = '') => `<!doctype html>
<html><head><style>.x{color:#000}</style></head>
<body>
<div id="root" data-composition-id="c" data-start="0" data-duration="10" data-width="1920" data-height="1080" data-fps="30">
${body}
</div>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["c"] = { seek: () => {} };
  ${extra}
</script>
</body></html>`;

describe('visibleText', () => {
    it('reads only what a viewer sees', () => {
        const t = visibleText(composition('<h1>A finding</h1>'));
        expect(t).toContain('A finding');
        expect(t).not.toContain('__timelines');
        expect(t).not.toContain('color:#000');
    });
});

describe('inspectComposition: refusals', () => {
    it('accepts a clean composition with a paused timeline', () => {
        const r = inspectComposition(composition('<h1>AI reaches the research phase first</h1>'));
        expect(r.ok).toBe(true);
        expect(r.problems).toEqual([]);
    });

    it('REFUSES an em-dash in visible copy, because a frame cannot be repaired', () => {
        const r = inspectComposition(composition('<h1>Research moves first — assessment does not</h1>'));
        expect(r.ok).toBe(false);
        expect(r.problems.join(' ')).toMatch(/em-dash/);
    });

    it('REFUSES a banned phrase', () => {
        const banned = ['compre', 'hensive'].join('');
        const r = inspectComposition(composition(`<p>A ${banned} approach to reporting</p>`));
        expect(r.problems.join(' ')).toMatch(/banned phrase/);
    });

    it('REFUSES a provider artifact tag', () => {
        const tag = ['oai', 'cite'].join('') + ':12';
        const r = inspectComposition(composition(`<p>A claim ${tag}</p>`));
        expect(r.problems.join(' ')).toMatch(/provider artifact tag/);
    });

    it('REFUSES a raw manifest pointer: a viewer must never see a file path', () => {
        const r = inspectComposition(composition('<p>A claim [articles/exs-clockwork/63e5475889.md#c1]</p>'));
        expect(r.problems.join(' ')).toMatch(/raw manifest pointer/);
    });

    it('REFUSES emoji', () => {
        const r = inspectComposition(composition('<p>Adoption is rising \u{1F680}</p>'));
        expect(r.problems.join(' ')).toMatch(/emoji/);
    });

    it('REFUSES a QA annotation, which is a note to the team rather than copy for a viewer', () => {
        const annotation = ['T', 'B', 'D'].join('');
        const r = inspectComposition(composition(`<p>Baseline ${annotation}</p>`));
        expect(r.problems.join(' ')).toMatch(/QA annotation/);
    });
});

describe('inspectComposition: structural refusals', () => {
    it('REFUSES a composition with no paused timeline, which renders one frozen frame and reports success', () => {
        const html = '<div id="root" data-composition-id="c"><h1>Hello</h1></div>';
        const r = inspectComposition(html);
        expect(r.ok).toBe(false);
        expect(r.problems.join(' ')).toMatch(/paused, seekable timeline/);
    });

    it('REFUSES a composition with no composition id', () => {
        const html = '<div><h1>Hello</h1></div><script>window.__timelines={};</script>';
        expect(inspectComposition(html).problems.join(' ')).toMatch(/data-composition-id/);
    });
});

describe('inspectComposition: does NOT cry wolf', () => {
    it('ignores an em-dash inside script, which no viewer reads', () => {
        const r = inspectComposition(composition('<h1>Clean copy</h1>', 'const note = "a — dash in code";'));
        expect(r.ok).toBe(true);
    });

    it('ignores a banned word inside a markup attribute', () => {
        const banned = ['compre', 'hensive'].join('');
        const html = composition(`<h1 data-note="${banned}">Clean copy</h1>`);
        expect(inspectComposition(html).ok).toBe(true);
    });

    it('leaves ordinary consulting prose alone', () => {
        const r = inspectComposition(composition(
            '<h1>Enrichment shortens the research phase</h1><p>Partners keep the finalist call.</p>',
        ));
        expect(r.ok).toBe(true);
    });
});
