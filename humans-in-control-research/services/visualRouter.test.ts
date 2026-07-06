import { describe, it, expect, afterEach } from 'vitest';
import { routeSlot, setDesignerBranchEnabled, isDesignerBranchEnabled } from './visualRouter';
import { parseImgDirective } from './hashtagParser';

afterEach(() => setDesignerBranchEnabled(undefined)); // deprecated no-op; kept for import compat

describe('parseImgDirective (#img override)', () => {
    it('parses #img=diagram | generate | none', () => {
        expect(parseImgDirective('#competitive #img=diagram')).toBe('diagram');
        expect(parseImgDirective('#slides #img=generate')).toBe('generate');
        expect(parseImgDirective('#journey #img=none')).toBe('none');
    });
    it('accepts value aliases', () => {
        expect(parseImgDirective('#img=viz')).toBe('diagram');
        expect(parseImgDirective('#img=art')).toBe('generate');
        expect(parseImgDirective('#img=off')).toBe('none');
    });
    it('accepts bare-flag aliases', () => {
        expect(parseImgDirective('a deck #no-image please')).toBe('none');
        expect(parseImgDirective('a deck #img-diagram')).toBe('diagram');
        expect(parseImgDirective('a deck #img-generate')).toBe('generate');
    });
    it('returns undefined when no directive (router auto-decides)', () => {
        expect(parseImgDirective('#competitive analysis of fintech')).toBeUndefined();
        expect(parseImgDirective('')).toBeUndefined();
    });
});

describe('routeSlot - explicit #img override wins', () => {
    it('#img=none suppresses', () => {
        expect(routeSlot({ artifact: 'journey-map', override: 'none', slotWired: true, hasAuthoredData: true }).branch).toBe('none');
    });
    it('#img=diagram forces the deterministic viz even on an infographic surface', () => {
        expect(routeSlot({ artifact: 'journey-map', override: 'diagram', slotWired: true }).branch).toBe('diagram');
    });
    it('#img=icon forces a tokenized glyph', () => {
        expect(routeSlot({ artifact: 'slides:cover', override: 'icon' }).branch).toBe('icon');
    });
    it('#img=generate forces the native infographic lane (E4: diffusion branch retired)', () => {
        expect(routeSlot({ artifact: 'competitive-matrix', override: 'generate', mode: 'per-element' }).branch).toBe('infographic');
    });
});

describe('routeSlot - GOLD audit branch is authoritative on auto', () => {
    it('registry image-free / unknown -> none', () => {
        // gap-matrix remains a registered image-free deliverable.
        expect(routeSlot({ artifact: 'gap-matrix' }).branch).toBe('none');
        expect(routeSlot({ artifact: 'unknown-thing' }).branch).toBe('none');
    });
    it('case-study + recommendation per-item content panels route native -> infographic (E4)', () => {
        // The runtime caller (resolveRoutedSlotImages) passes slotWired from the registry spec.
        // Post-E4 the legacy 'emotive' audit value and 'infographic' both resolve to the native
        // infographic lane, UNGATED (deterministic Chromium render, no diffusion risk).
        expect(routeSlot({ artifact: 'case-study', slotWired: true }).branch).toBe('infographic');
        expect(routeSlot({ artifact: 'recommendation', slotWired: true }).branch).toBe('infographic');
    });
    it('audit ICON branches route to icon (deterministic)', () => {
        expect(routeSlot({ artifact: 'competitive-matrix' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'strategy' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'prd-feature' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'personas-overview' }).branch).toBe('icon');
        // 2026-06-27 container audit: journey per-phase is 150x150 square -> ICON (not infographic)
        expect(routeSlot({ artifact: 'journey-map', slotWired: true }).branch).toBe('icon');
    });
    it('audit CHART branches route to diagram', () => {
        expect(routeSlot({ artifact: 'tech-audit' }).branch).toBe('diagram');
        expect(routeSlot({ artifact: 'timeline' }).branch).toBe('diagram');
    });
    it('meta-themes + mindmap carry live Figma glyph slots (added 2026-06-27) -> icon', () => {
        expect(routeSlot({ artifact: 'meta-themes' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'mindmap' }).branch).toBe('icon');
    });
    it('legacy emotive audit value routes to the native infographic lane, ungated (E4)', () => {
        expect(routeSlot({ mode: 'panel', branch: 'emotive', slotWired: true }).branch).toBe('infographic');
        // 2026-06-27 USER OVERRIDE: themes carries per-theme content-true thumbnails (wired).
        expect(routeSlot({ artifact: 'theme-cluster', slotWired: true }).branch).toBe('infographic');
    });
    it('infographic audit value routes native regardless of wiring or gate args (section-8 gate retired)', () => {
        expect(routeSlot({ mode: 'panel', branch: 'infographic', slotWired: false }).branch).toBe('infographic');
        expect(routeSlot({ mode: 'panel', branch: 'infographic', slotWired: false, designerEnabled: false }).branch).toBe('infographic');
    });
    it('slides:cover routes to a fill branch (2026-07-03 owner-directed photographic cover; supersedes the interim image-free registration)', () => {
        // The emotive audit value folds into the infographic route; the resolver then honors the
        // registry spec.style (photo-background) and fills via the illustration photo lane.
        expect(routeSlot({ artifact: 'slides:cover' }).branch).toBe('infographic');
    });
});

describe('routeSlot - heuristic fallback (no audit branch on the spec)', () => {
    it('single panel WITH authored data and no audit branch -> diagram', () => {
        expect(routeSlot({ mode: 'panel', hasAuthoredData: true }).branch).toBe('diagram');
    });
    it('glyph slot with no audit branch -> icon', () => {
        expect(routeSlot({ mode: 'glyph' }).branch).toBe('icon');
    });
    it('conceptual slot with no audit branch and no authored data -> infographic (native)', () => {
        expect(routeSlot({ mode: 'panel' }).branch).toBe('infographic');
    });
});

describe('section-8 gate retired (E4, 2026-07-02)', () => {
    it('isDesignerBranchEnabled is a deprecated always-true no-op (native lane needs no diffusion gate)', () => {
        setDesignerBranchEnabled(undefined);
        expect(isDesignerBranchEnabled()).toBe(true);
        setDesignerBranchEnabled(false);
        expect(isDesignerBranchEnabled()).toBe(true);
    });
});
