/**
 * Artifact visual layer (2026-11-09, owner directive: every artifact carries imagery).
 *
 * Measured defect: 22 of 24 audited artifacts contained ZERO images. These pins cover the contract
 * that fixes it, and the safety properties that keep a failed image from damaging the document.
 */
import { describe, it, expect } from 'vitest';
import {
    extractVisualRequests,
    renderVisualFigure,
    renderArtifactVisuals,
    VISUAL_CONTRACT,
    ARTIFACT_VISUAL_STYLE,
} from './artifactVisuals';

const ok = async (c: string) => `data:image/png;base64,AAA${c.length}`;
const dead = async () => '';

describe('extractVisualRequests', () => {
    it('finds each directive in document order', () => {
        const html = '<p>a</p>[[visual: a student granting read-only calendar access]]<p>b</p>[[visual: an advisor reading a prepared brief before a meeting]]';
        const r = extractVisualRequests(html);
        expect(r).toHaveLength(2);
        expect(r[0].concept).toBe('a student granting read-only calendar access');
    });

    it('ignores a directive too short to describe a picture', () => {
        expect(extractVisualRequests('[[visual: a cat]]')).toHaveLength(0);
    });

    it('handles empty input', () => {
        expect(extractVisualRequests('')).toEqual([]);
    });
});

describe('renderVisualFigure', () => {
    it('emits a figure with the concept as alt text and caption', () => {
        const out = renderVisualFigure('a student granting access', 'data:image/png;base64,AAA');
        expect(out).toContain('<figure class="hic-visual">');
        expect(out).toContain('alt="a student granting access"');
        expect(out).toContain('<figcaption>a student granting access</figcaption>');
    });

    it('escapes a hostile concept', () => {
        const out = renderVisualFigure('<img onerror=alert(1)>', 'data:x');
        expect(out).not.toContain('<img onerror');
        expect(out).toContain('&lt;img');
    });
});

describe('renderArtifactVisuals', () => {
    const doc = '<h2>Findings</h2>[[visual: a student granting read-only calendar access]]<p>text</p>';

    it('replaces the directive with a rendered figure and injects the style once', async () => {
        const r = await renderArtifactVisuals(doc, ok);
        expect(r.rendered).toBe(1);
        expect(r.html).toContain('<figure class="hic-visual">');
        expect(r.html).not.toContain('[[visual:');
        expect((r.html.match(/id="hic-visual-style"/g) || [])).toHaveLength(1);
    });

    it('removes a directive whose image could not be drawn, leaving no placeholder', async () => {
        const r = await renderArtifactVisuals(doc, dead);
        expect(r.rendered).toBe(0);
        expect(r.requested).toBe(1);
        expect(r.html).not.toContain('[[visual:');
        expect(r.html).not.toContain('hic-visual-style');
        expect(r.html).toContain('<h2>Findings</h2>');
    });

    it('treats a renderer throw as an undrawable figure rather than failing the artifact', async () => {
        const r = await renderArtifactVisuals(doc, async () => { throw new Error('proxy down'); });
        expect(r.rendered).toBe(0);
        expect(r.html).not.toContain('[[visual:');
    });

    it('caps how many images one artifact may generate', async () => {
        const many = Array.from({ length: 9 }, (_, i) => `[[visual: a named actor doing specific thing number ${i}]]`).join('<p>x</p>');
        const r = await renderArtifactVisuals(many, ok, 3);
        expect(r.requested).toBe(9);
        expect(r.rendered).toBe(3);
        expect(r.html).not.toContain('[[visual:');
    });

    it('leaves a document with no directives untouched', async () => {
        const plain = '<p>no visuals here</p>';
        const r = await renderArtifactVisuals(plain, ok);
        expect(r.html).toBe(plain);
        expect(r.requested).toBe(0);
    });

    it('draws a repeated concept once and reuses it', async () => {
        const twice = '[[visual: a student granting read-only calendar access]]<p>x</p>[[visual: a student granting read-only calendar access]]';
        const r = await renderArtifactVisuals(twice, ok);
        expect(r.rendered).toBe(2);
        expect((r.html.match(/<figure/g) || [])).toHaveLength(2);
    });
});

describe('VISUAL_CONTRACT', () => {
    it('bans the stock-AI imagery tells by name', () => {
        const c = VISUAL_CONTRACT.toLowerCase();
        for (const ban of ['glowing brains', 'robots', 'futuristic cityscapes', 'handshakes']) {
            expect(c).toContain(ban);
        }
    });

    it('forbids text inside the image and self-reference in the prose', () => {
        expect(VISUAL_CONTRACT).toContain('No text, labels, charts, logos or words inside the image');
        expect(VISUAL_CONTRACT).toContain('the image below');
    });

    it('ships a style block the figure markup can use', () => {
        expect(ARTIFACT_VISUAL_STYLE).toContain('.hic-visual');
    });
});
