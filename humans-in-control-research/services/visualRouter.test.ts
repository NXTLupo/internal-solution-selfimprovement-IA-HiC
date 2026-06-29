import { describe, it, expect, afterEach } from 'vitest';
import { routeSlot, setDesignerBranchEnabled, isDesignerBranchEnabled } from './visualRouter';
import { parseImgDirective } from './hashtagParser';

afterEach(() => setDesignerBranchEnabled(undefined)); // reset the section-8 gate between tests

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
    it('#img=diagram forces the deterministic viz even on an emotive surface', () => {
        expect(routeSlot({ artifact: 'journey-map', override: 'diagram', slotWired: true }).branch).toBe('diagram');
    });
    it('#img=icon forces a tokenized glyph', () => {
        expect(routeSlot({ artifact: 'slides:cover', override: 'icon' }).branch).toBe('icon');
    });
    it('#img=generate forces the designer skill even when the gate is off', () => {
        expect(isDesignerBranchEnabled()).toBe(false);
        expect(routeSlot({ artifact: 'competitive-matrix', override: 'generate', mode: 'per-element' }).branch).toBe('emotive');
    });
});

describe('routeSlot - GOLD audit branch is authoritative on auto', () => {
    it('registry image-free / unknown -> none', () => {
        // 2026-06-28 USER OVERRIDE moved case-study off the image-free set (it now carries a wired
        // per-case emotive panel). gap-matrix remains a registered image-free deliverable.
        expect(routeSlot({ artifact: 'gap-matrix' }).branch).toBe('none');
        expect(routeSlot({ artifact: 'unknown-thing' }).branch).toBe('none');
    });
    it('2026-06-28 USER OVERRIDE: case-study + recommendation carry wired per-item emotive panels -> emotive', () => {
        // The runtime caller (resolveRoutedSlotImages) passes slotWired from the registry spec
        // (wired:true), so these route to the designer/emotive branch even with the section-8 gate off.
        expect(routeSlot({ artifact: 'case-study', slotWired: true }).branch).toBe('emotive');
        expect(routeSlot({ artifact: 'recommendation', slotWired: true }).branch).toBe('emotive');
    });
    it('audit ICON branches route to icon (deterministic, NOT gated)', () => {
        expect(isDesignerBranchEnabled()).toBe(false);
        expect(routeSlot({ artifact: 'competitive-matrix' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'strategy' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'prd-feature' }).branch).toBe('icon');
        expect(routeSlot({ artifact: 'personas-overview' }).branch).toBe('icon');
        // 2026-06-27 container audit: journey per-phase is 150x150 square -> ICON (not emotive)
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
    it('emotive audit branch on a WIRED surface satisfies the section-8 gate', () => {
        expect(routeSlot({ mode: 'panel', branch: 'emotive', slotWired: true }).branch).toBe('emotive');
        // 2026-06-27 USER OVERRIDE: themes carries per-theme content-true emotive thumbnails (wired).
        expect(routeSlot({ artifact: 'theme-cluster', slotWired: true }).branch).toBe('emotive');
    });
    it('audit EMOTIVE branch on an UNWIRED surface is gated OFF by default (section 8)', () => {
        expect(routeSlot({ artifact: 'slides:cover', slotWired: false }).branch).toBe('none');
    });
    it('UNWIRED emotive surface turns on once the designer branch is enabled', () => {
        setDesignerBranchEnabled(true);
        expect(routeSlot({ artifact: 'slides:cover', slotWired: false }).branch).toBe('emotive');
    });
    it('explicit designerEnabled arg overrides the global gate', () => {
        expect(routeSlot({ artifact: 'recommendation', slotWired: false, designerEnabled: true }).branch).toBe('emotive');
    });
});

describe('routeSlot - heuristic fallback (no audit branch on the spec)', () => {
    it('single panel WITH authored data and no audit branch -> diagram', () => {
        expect(routeSlot({ mode: 'panel', hasAuthoredData: true }).branch).toBe('diagram');
    });
    it('glyph slot with no audit branch -> icon', () => {
        expect(routeSlot({ mode: 'glyph' }).branch).toBe('icon');
    });
});

describe('isDesignerBranchEnabled - default-off gate', () => {
    it('defaults to false (verify-before-default, plan section 8)', () => {
        setDesignerBranchEnabled(undefined);
        expect(isDesignerBranchEnabled()).toBe(false);
    });
    it('honors an explicit override', () => {
        setDesignerBranchEnabled(true);
        expect(isDesignerBranchEnabled()).toBe(true);
    });
});
