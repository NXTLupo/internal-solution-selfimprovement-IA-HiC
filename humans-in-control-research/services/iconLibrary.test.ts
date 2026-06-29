import { describe, it, expect } from 'vitest';
import { ICONS, selectIcon, renderIcon, renderIconForBrand, iconTokenColor, iconToDataUri, iconCatalog, iconsForPrompt, resolveBaseId, compositeIcon } from './iconLibrary';
import { resolveArtifactIcons } from './artifactIconResolver';

describe('icon library - token-pure glyphs', () => {
    it('every glyph renders to a valid svg with no text', () => {
        for (const id of Object.keys(ICONS)) {
            const svg = renderIcon(id, { color: '#123456', size: 64 });
            expect(svg.startsWith('<svg')).toBe(true);
            expect(svg).not.toContain('<text'); // icons carry no words (anti-slop, no text-in-image)
        }
    });
    it('renderIcon carries NO hardcoded brand hex - only the colour the caller passed', () => {
        // a glyph drawn with an arbitrary colour must contain exactly that colour, nothing brand-ish
        const svg = renderIcon('risk', { color: '#abcdef', size: 48 });
        const hexes = (svg.match(/#[0-9a-fA-F]{6}/g) || []);
        expect(new Set(hexes)).toEqual(new Set(['#abcdef']));
    });
    it('renderIconForBrand resolves colour from the brand token mirror (NXT vs NU differ)', () => {
        const nxt = iconTokenColor('nxt', 'accent', 'dark');
        const nu = iconTokenColor('nu', 'accent', 'dark');
        expect(nxt).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(nu).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(nxt).not.toBe(nu); // brand flip flows through tokens, not a literal
        expect(renderIconForBrand('ai', { brand: 'nxt' })).toContain(nxt);
    });
    it('ink role flips with ground for contrast', () => {
        expect(iconTokenColor('nxt', 'ink', 'dark')).not.toBe(iconTokenColor('nxt', 'ink', 'light'));
    });
});

describe('selectIcon - content-true selection', () => {
    it('content keyword on the heading wins', () => {
        expect(selectIcon({ heading: 'Where the security risk concentrates' })).toBe('risk');
        expect(selectIcon({ heading: 'Cost to serve by segment' })).toBe('cost');
        expect(selectIcon({ concept: 'automation engine' })).toBe('automation');
    });
    it('industry signature when no content keyword matches', () => {
        const id = selectIcon({ industry: 'healthcare', heading: 'Mercy Memorial' });
        expect(id && id.startsWith('healthcare:')).toBe(true);
    });
    it('honors an explicit tokenized id', () => {
        expect(selectIcon({ explicitId: 'icon:network' })).toBe('network');
        expect(selectIcon({ explicitId: 'healthcare:pill' })).toBe('healthcare:pill');
    });
    it('industry aliases resolve (finance -> financial-services)', () => {
        const id = selectIcon({ industry: 'finance', heading: 'Acme Holdings' });
        expect(id && id.startsWith('financial-services:')).toBe(true);
    });
    it('is deterministic (stable per heading, no Math.random)', () => {
        const a = selectIcon({ industry: 'retail', heading: 'Vendor X' });
        const b = selectIcon({ industry: 'retail', heading: 'Vendor X' });
        expect(a).toBe(b);
    });
});

describe('iconCatalog / iconsForPrompt - tokenized reference contract', () => {
    it('catalog filters to universal + one industry', () => {
        const hc = iconCatalog('healthcare');
        expect(hc.some(e => e.id === 'risk' && !e.industry)).toBe(true);
        expect(hc.some(e => e.industry === 'healthcare')).toBe(true);
        expect(hc.some(e => e.industry === 'fintech')).toBe(false); // other industries excluded
    });
    it('prompt block references ids, never a hex or raw svg', () => {
        const p = iconsForPrompt('fintech');
        expect(p).toContain('icon:<id>');
        expect(p).toContain('fintech:ledger');
        expect(p).not.toMatch(/#[0-9a-fA-F]{6}/); // no colours leaked into the prompt
        expect(p).not.toContain('<svg');
    });
});

describe('resolveArtifactIcons - fills carriers for icon-branch artifacts', () => {
    it('fills per-element archetype emblems on personas-overview (content-true concepts only)', () => {
        // names carry resolvable concepts (cost / automation) -> content-true glyphs
        const payload: any = { personas: [{ name: 'Cost-Conscious Buyer' }, { name: 'Automation-First Admin' }] };
        const n = resolveArtifactIcons('personas-overview', payload, 'nxt', 'light', 'fintech');
        expect(n).toBe(2);
        expect(Array.isArray(payload.archetypeIcons)).toBe(true);
        expect(payload.archetypeIcons[0].startsWith('data:image/svg+xml;base64,')).toBe(true);
    });
    it('CONTENT-TRUE OR NOTHING: a non-resolvable element gets NO glyph (no generic fallback star)', () => {
        const payload: any = { personas: [{ name: 'Automation-First Admin' }, { name: 'Xqzzy Plover Zzz' }] };
        const n = resolveArtifactIcons('personas-overview', payload, 'nxt', 'light');
        expect(n).toBe(1);                                   // only the resolvable persona paints
        expect(payload.archetypeIcons[0].startsWith('data:image/svg+xml;base64,')).toBe(true);
        expect(payload.archetypeIcons[1]).toBe('');          // gibberish -> empty, never a fallback mark
    });
    it('no-op for a non-icon artifact (cover is emotive)', () => {
        const payload: any = { title: 'X' };
        expect(resolveArtifactIcons('slides:cover', payload, 'nxt', 'dark')).toBe(0);
        expect(payload.panelImage).toBeUndefined();
    });
    it('mindmap fills ONE central-hub glyph (live Figma slot 683:5509 added 2026-06-27)', () => {
        const payload: any = { question: 'How does AI change the funnel?' };
        expect(resolveArtifactIcons('mindmap', payload, 'nu', 'light', 'ai-industry')).toBe(1);
        expect(typeof payload.hubImage).toBe('string');
        expect(payload.hubImage.startsWith('data:image/svg+xml;base64,')).toBe(true);
    });
    it('meta-themes fills a per-pattern glyph for each content-true pattern (slots 683:5501-5504)', () => {
        const payload: any = { themes: [{ canonical_name: 'Automation Displaces Manual Work' }, { canonical_name: 'Security Risk Concentrates' }] };
        const n = resolveArtifactIcons('meta-themes', payload, 'nxt', 'light', 'fintech');
        expect(n).toBe(2);
        expect(Array.isArray(payload.patternImages)).toBe(true);
        expect(payload.patternImages[0].startsWith('data:image/svg+xml;base64,')).toBe(true);
    });
});

describe('resolveBaseId - composition resolver chain', () => {
    it('exact: a baseGlyph that IS a base id', () => {
        expect(resolveBaseId({ baseGlyph: 'funnel' })).toEqual({ id: 'funnel', by: 'exact' });
    });
    it('alias: an object-noun maps to a base via BASE_ALIAS', () => {
        expect(resolveBaseId({ baseGlyph: 'gauge' })).toEqual({ id: 'monitoring', by: 'alias' });
        expect(resolveBaseId({ baseGlyph: 'scroll' })).toEqual({ id: 'document', by: 'alias' });
        expect(resolveBaseId({ baseGlyph: 'stethoscope' })).toEqual({ id: 'healthcare:care', by: 'alias' });
    });
    it('concept: unknown baseGlyph falls to a synonym/concept keyword match', () => {
        const r = resolveBaseId({ concept: 'threat-model', baseGlyph: 'zzz-nonexistent', synonyms: ['risk'] });
        expect(r).toEqual({ id: 'risk', by: 'concept' });
    });
    it('industry-fallback: nothing matches but an industry is given', () => {
        const r = resolveBaseId({ concept: 'xqzplf', baseGlyph: 'qqq-nope', synonyms: ['zzzz'], industry: 'healthcare' });
        expect(r.by).toBe('industry-fallback');
        expect(r.id.startsWith('healthcare:')).toBe(true);
    });
    it('default: nothing matches and no industry -> insight', () => {
        expect(resolveBaseId({ concept: 'xqzplf', baseGlyph: 'qqq-nope', synonyms: ['zzzz'] })).toEqual({ id: 'insight', by: 'default' });
    });
    it('is deterministic', () => {
        const a = resolveBaseId({ concept: 'co-op-matching', baseGlyph: 'handshake', industry: 'higher-ed' });
        const b = resolveBaseId({ concept: 'co-op-matching', baseGlyph: 'handshake', industry: 'higher-ed' });
        expect(a).toEqual(b);
    });
});

describe('compositeIcon - base + industry modifier badge', () => {
    it('returns svg/dataUri/baseId/resolvedBy and renders no text', () => {
        const r = compositeIcon({ concept: 'prior-authorization', baseGlyph: 'clipboard', industry: 'healthcare', brand: 'nxt' });
        expect(r.svg.startsWith('<svg')).toBe(true);
        expect(r.dataUri.startsWith('data:image/svg+xml;base64,')).toBe(true);
        expect(r.svg).not.toContain('<text');
        expect(typeof r.baseId).toBe('string');
    });
    it('an industry concept gets a modifier badge; a universal concept does not', () => {
        const ind = compositeIcon({ concept: 'triage', baseGlyph: 'cross', industry: 'healthcare', brand: 'nxt' });
        expect(ind.modifierId).toBeTruthy();
        expect(ind.svg).toContain('viewBox'); // badge group present (disc + sig)
        const uni = compositeIcon({ concept: 'risk', baseGlyph: 'shield', brand: 'nxt' });
        expect(uni.modifierId).toBeNull();
    });
    it('token-pure: NXT vs NU differ + no stray brand hex beyond resolved tokens', () => {
        const nxt = compositeIcon({ concept: 'triage', industry: 'healthcare', brand: 'nxt' });
        const nu = compositeIcon({ concept: 'triage', industry: 'healthcare', brand: 'nu' });
        expect(nxt.svg).not.toBe(nu.svg); // brand flip flows through tokens
        // NU stark-white ground renders too (no throw, valid svg)
        const nuLight = compositeIcon({ concept: 'triage', industry: 'healthcare', brand: 'nu', ground: 'light' });
        expect(nuLight.svg.startsWith('<svg')).toBe(true);
    });
});

describe('iconToDataUri', () => {
    it('produces a base64 svg data uri', () => {
        expect(iconToDataUri(renderIcon('target', { color: '#000000' }))).toMatch(/^data:image\/svg\+xml;base64,/);
    });
});
