// DECIEM brand mode (2026-10-01) - renderer contract for the 1920x1080 stage twin (the PPTX export
// surface). The brand is a token-set flip selected by `#deciem`; these tests pin what the DECIEM
// PowerPoint template dictates: data-brand carries 'deciem', Poppins is the title face, there is NO
// rail and NO dot-mark anywhere, dark / pop canvases carry the boxed lockup, body slides carry ONE
// corner line-art background served from /api/design-assets/deciem/, and consecutive titles rotate
// it. NXT output must stay byte-identical to the pre-DECIEM renderer paths.
import { describe, it, expect } from 'vitest';
import {
    slideDataToStageHtml, brandTokens, brandBodyArtUrl, brandDividerFill, brandCanvasFor, stableIndex, lockupHtml,
} from './slideToStageHtml';
import { composeSlide } from './slideComposer';
import { getBrandArt } from '../components/slideTemplates/brands';

const LOCKUP_LINE = 'THE ABNORMAL BEAUTY COMPANY.';

describe('DECIEM brand tokens (stage twin)', () => {
    it('resolves the DECIEM token set from any brand spelling', () => {
        for (const b of ['deciem', 'DECIEM', '#deciem', '#DECIEM']) {
            const T = brandTokens(b);
            expect(T.brandId).toBe('deciem');
            expect(T.accent.toUpperCase()).toBe('#FB48C4');
            expect(T.titleFont).toContain('Poppins');
            expect(T.bodyFont).toContain('Josefin Sans');
            // label role = Poppins (kickers / eyebrows / small-cap labels); mono role = the data /
            // source / table face (Nunito once the lead's deciemBrand FONT_MONO flips from Questrial;
            // either way it is never the title or body face).
            expect(T.labelFont).toContain('Poppins');
            expect(T.monoFont).not.toContain('Poppins');
            expect(T.monoFont).not.toContain('Josefin');
            expect(T.titleTransform).toBe('uppercase');
            expect(T.lockup).toContain(LOCKUP_LINE);
            expect(T.band.toUpperCase()).toBe('#000000');
            expect(T.bandText.toUpperCase()).toBe('#FFFFFF');
        }
    });
    it('NXT and NU keep sentence case and no lockup', () => {
        expect(brandTokens('nxt').titleTransform).toBe('none');
        expect(brandTokens('nu').titleTransform).toBe('none');
        expect(brandTokens('nxt').lockup).toBe('');
        expect(brandTokens('nu').lockup).toBe('');
    });
    it('the lockup box is two lines, bold first line, bordered, class brandlogo lockup', () => {
        const html = lockupHtml(brandTokens('deciem'), '#FFFFFF');
        expect(html).toContain('class="brandlogo lockup"');
        expect(html).toContain(LOCKUP_LINE);
        expect(html).toContain('>DECIEM<');
        expect(html).toContain('border:1px solid #FFFFFF');
        expect(html).toContain('font-weight:700');
        expect(lockupHtml(brandTokens('nxt'), '#000')).toBe('');
    });
});

describe('DECIEM art picks are deterministic and shared', () => {
    it('stableIndex is a pure function of its input', () => {
        expect(stableIndex('A title', 12)).toBe(stableIndex('A title', 12));
        expect(stableIndex('', 5)).toBe(stableIndex('', 5));
        expect(stableIndex('', 5)).toBeLessThan(5);
        expect(stableIndex('x', 0)).toBe(0);
    });
    it('body art resolves to the design-assets route and rotates across titles', () => {
        const art = getBrandArt('deciem')!;
        const urls = new Set<string>();
        for (let i = 0; i < 40; i++) urls.add(brandBodyArtUrl('deciem', `Slide title number ${i}`));
        expect(urls.size).toBeGreaterThan(3);
        for (const u of urls) {
            expect(u).toContain('/api/design-assets/deciem/');
            expect(art.bodyBackgrounds.some(b => u.endsWith(b.file))).toBe(true);
        }
        expect(brandBodyArtUrl('nxt', 'anything')).toBe('');
        expect(brandBodyArtUrl('nu', 'anything')).toBe('');
    });
    it('divider fills rotate through the POP palette (never black) and carry a text color', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const d = brandDividerFill('deciem', `Section ${i}`)!;
            expect(d.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(d.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(d.fill.toUpperCase()).not.toBe('#000000');
            seen.add(d.fill);
        }
        expect(seen.size).toBeGreaterThan(2);
        expect(brandDividerFill('nxt', 'x')).toBeNull();
        // deck-order: ordinal 0..3 walk cyan, purple, pink, orange in order and wrap
        const byOrd = [0, 1, 2, 3, 4].map(o => brandDividerFill('deciem', 'same title', o)!.fill.toUpperCase());
        expect(new Set(byOrd.slice(0, 4)).size).toBe(4);
        expect(byOrd[4]).toBe(byOrd[0]);
    });
    it('canvas roles follow the brand art block', () => {
        expect(brandCanvasFor('deciem', 'cover')).toBe('dark');
        expect(brandCanvasFor('deciem', 'section')).toBe('pop');
        expect(brandCanvasFor('deciem', 'thesis')).toBe('dark');
        expect(brandCanvasFor('deciem', 'body')).toBe('paper');
        expect(brandCanvasFor('nxt', 'cover')).toBe('paper');
    });
});

describe('DECIEM stage HTML: cover / section-divider / body', () => {
    const cover = slideDataToStageHtml({
        template: 'slides:cover', brand: 'deciem', title: 'Skincare buyers now start with the ingredient, not the brand',
        composerPayload: { title: 'Skincare buyers now start with the ingredient, not the brand', subtitle: 'DECIEM AI strategy, 2026' },
    } as any);
    const divider = slideDataToStageHtml({
        template: 'section-divider', brand: 'deciem', title: 'The ingredient-first buyer',
        sectionDivider: { number: '02', title: 'The ingredient-first buyer', subtitle: 'What the corpus says about how people choose a serum.' },
    } as any);
    const composedDivider = slideDataToStageHtml({
        template: 'slides:section-divider', brand: 'deciem', title: 'The ingredient-first buyer',
        composerPayload: { number: '02', title: 'The ingredient-first buyer', supporting: 'What the corpus says about how people choose a serum.' },
    } as any);
    const body = slideDataToStageHtml({
        template: 'stat-row', brand: 'deciem', title: 'Ingredient literacy drives the first purchase',
        statRow: { stats: [
            { value: 'Literate', label: 'buyers name the active before the brand', source: 'r/SkincareAddiction', meaning: 'The shelf is read by ingredient.', matters: 'Education content is the first touchpoint.' },
            { value: 'Routine', label: 'buyers assemble regimens from several brands', source: 'Allure', meaning: 'Loyalty sits with the step, not the house.', matters: 'Cross-sell depends on regimen fit.' },
            { value: 'Patient', label: 'buyers wait weeks for visible results', source: 'Dermatology Times', meaning: 'Expectation setting precedes retention.', matters: 'Follow-up timing matters more than discounting.' },
        ] },
        sources: ['r/SkincareAddiction', 'Allure', 'Dermatology Times'],
    } as any);
    const composedBody = slideDataToStageHtml({
        template: 'slides:numbered-themes', brand: 'deciem', title: 'Four themes shape the ingredient-first buyer',
        composerPayload: { title: 'Four themes shape the ingredient-first buyer', items: [
            { title: 'Ingredient literacy', body: 'Buyers read the label first.', quote: 'I look for niacinamide, not a name.', source: 'r/SkincareAddiction' },
            { title: 'Regimen assembly', body: 'Routines mix brands by step.', quote: 'My routine is five brands.', source: 'Allure' },
            { title: 'Patience', body: 'Results take weeks.', quote: 'Give it eight weeks.', source: 'Dermatology Times' },
            { title: 'Proof', body: 'Clinical language earns trust.', quote: 'Show me the study.', source: 'Byrdie' },
        ] },
    } as any);

    it('every DECIEM doc carries data-brand="deciem" and loads Poppins / Josefin Sans / Nunito', () => {
        for (const html of [cover, divider, composedDivider, body, composedBody]) {
            expect(html).toContain('data-brand="deciem"');
            expect(html).toContain('Poppins');
            expect(html).toContain('Josefin+Sans');
            expect(html).toContain('Nunito:wght@400;700');
        }
    });
    it('NXT and NU kickers keep the mono face (labelFont equals monoFont there)', () => {
        expect(brandTokens('nxt').labelFont).toBe(brandTokens('nxt').monoFont);
        expect(brandTokens('nu').labelFont).toBe(brandTokens('nu').monoFont);
        const nxt = slideDataToStageHtml({ template: 'stat-row', brand: 'nxt', title: 'T', statRow: { stats: [] } } as any);
        expect(nxt).toMatch(/\.kicker\{font-family:'IBM Plex Mono', monospace;/);
    });
    it('never emits a rail or a dot-mark for DECIEM', () => {
        for (const html of [cover, divider, composedDivider, body, composedBody]) {
            expect(html).not.toContain('class="rail"');
            expect(html).not.toContain('class="dotmark"');
        }
    });
    it('the cover is a black canvas with the bordered lockup and an uppercase title', () => {
        expect(cover).toContain(LOCKUP_LINE);
        expect(cover).toContain('class="brandlogo lockup"');
        expect(cover.toLowerCase()).toContain('background:#000000');
        expect(cover).toContain('text-transform:uppercase');
        expect(cover).not.toContain('/api/design-assets/deciem/');
    });
    it('the GOLD section-divider rides a pop fill with the lockup and an uppercase title', () => {
        const pick = brandDividerFill('deciem', 'The ingredient-first buyer')!;
        expect(divider).toContain(`background:${pick.fill}`);
        expect(divider).toContain(LOCKUP_LINE);
        expect(divider).toContain('text-transform:uppercase');
        expect(divider).not.toContain('/api/design-assets/deciem/');
    });
    it('the composed section-divider uses the SAME fill the GOLD divider picked for the same title', () => {
        const pick = brandDividerFill('deciem', 'The ingredient-first buyer')!;
        expect(composedDivider).toContain(`background:${pick.fill}`);
        expect(composedDivider).toContain(LOCKUP_LINE);
    });
    it('body slides are white paper with ONE full-bleed design-asset background and no masthead', () => {
        for (const html of [body, composedBody]) {
            const imgs = html.match(/\/api\/design-assets\/deciem\/[a-z0-9-]+\.jpg/g) || [];
            expect(imgs.length).toBe(1);
            expect(html).toContain('object-fit:cover');
            expect(html).not.toContain(LOCKUP_LINE);
        }
        expect(body).toContain('class="bgart"');
        expect(body).toContain(`background:${brandTokens('deciem').paper}`);
    });
    it('the body background follows the title hash in both twins (GOLD shell and composer)', () => {
        expect(body).toContain(brandBodyArtUrl('deciem', 'Ingredient literacy drives the first purchase'));
        expect(composedBody).toContain(brandBodyArtUrl('deciem', 'Four themes shape the ingredient-first buyer'));
    });
    it('the thesis variant of the GOLD section-divider is a black canvas with the lockup', () => {
        const thesis = slideDataToStageHtml({
            template: 'section-divider', brand: 'deciem', title: 'Ingredient literacy is the first purchase driver',
            sectionDivider: { number: '', title: 'Ingredient literacy is the first purchase driver', variant: 'thesis' },
        } as any);
        expect(thesis.toLowerCase()).toContain('#stage{position:absolute;width:1920px;height:1080px;background:#000000');
        expect(thesis).toContain(LOCKUP_LINE);
    });
    it('the composed agenda flips to the black canvas (section header rule) with white type', () => {
        const html = composeSlide('agenda', { title: 'Agenda', groups: [{ label: '01', items: ['Buyers', 'Routines'] }, { label: '02', items: ['Proof', 'Follow-up'] }] }, 'deciem')!;
        expect(html).toContain('background:#000000');
        expect(html).toContain(LOCKUP_LINE);
        expect(html).not.toContain('class="rail"');
    });
});

describe('NXT / NU stay byte-identical across the DECIEM branches', () => {
    it('NXT and NU GOLD shells still carry the rail, dot-mark and masthead, and never the DECIEM art', () => {
        for (const brand of ['nxt', 'nu'] as const) {
            const html = slideDataToStageHtml({
                template: 'section-divider', brand, title: 'A section',
                sectionDivider: { number: '01', title: 'A section', subtitle: 'sub' },
            } as any);
            expect(html).toContain('class="rail"');
            expect(html).toContain('class="dotmark"');
            expect(html).not.toContain('/api/design-assets/');
            expect(html).not.toContain(LOCKUP_LINE);
            // the TITLE_TRANSFORM rule is emitted only for brands that ask for one
            expect(html).not.toContain('h1,h2,h3,.sdtitle,.thesis{text-transform:');
            expect(html).not.toContain('class="bgart"');
        }
    });
    it('the NXT composed cover has no lockup and keeps its dot-mark', () => {
        const html = composeSlide('cover', { title: 'A cover', subtitle: 's' }, 'nxt')!;
        expect(html).toContain('class="dotmark"');
        expect(html).not.toContain(LOCKUP_LINE);
    });
});
