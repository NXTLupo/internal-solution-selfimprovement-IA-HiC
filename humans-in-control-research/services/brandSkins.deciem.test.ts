/**
 * 2026-10-01 - THIRD brand mode (DECIEM, The Abnormal Beauty Company) on the Analyst-chat side.
 *
 * The contract these tests pin: `#deciem` on any deliverable hashtag flips the token set the same
 * way `#NU` does. Every renderer that used to carry an NXT / NU pair must now resolve DECIEM from
 * the brand token mirror (components/slideTemplates/brands.ts) and never fall through to NXT.
 */
import { describe, it, expect } from 'vitest';
import { getBrand, normalizeBrandId, brandVariantOfId, detectBrandFromText } from '../components/slideTemplates/brands';
import { renderBriefDialogHtml } from './briefDialogService';
import { renderResearchPlanHtml } from './researchPlanRenderer';
import { DIRECTIVES } from './hashtagRegistry';
import { CATALOG_MODIFIERS, isCatalogModifier } from './artifactCatalog';
import { createPrdAir } from './prdAir';

const D = getBrand('deciem');
const PINK = '#' + D.CHARTREUSE;          // FB48C4
const NXT_ACCENT = '#' + getBrand('nxt').CHARTREUSE;   // B8B800
const NU_ACCENT = '#' + getBrand('nu').CHARTREUSE;     // C8102E

describe('brand normalizer contract the chat side relies on', () => {
    it('maps every spelling the chat carries to one brand id', () => {
        for (const x of ['deciem', 'DECIEM', '#deciem', '#DECIEM', ' Deciem ']) expect(normalizeBrandId(x)).toBe('deciem');
        for (const x of ['nu', 'NU', '#NU', 'northeastern']) expect(normalizeBrandId(x)).toBe('nu');
        for (const x of ['nxt', 'NXT', '', undefined, null, 'anything-else']) expect(normalizeBrandId(x)).toBe('nxt');
        expect(brandVariantOfId('deciem')).toBe('DECIEM');
        expect(brandVariantOfId('DECIEM')).toBe('DECIEM');
        expect(brandVariantOfId('nu')).toBe('NU');
        expect(brandVariantOfId(undefined)).toBe('NXT');
        expect(detectBrandFromText('#personas #deciem for the routine builder')).toBe('deciem');
    });

    it('the DECIEM token set carries the template values the skins read', () => {
        expect(D.CHARTREUSE).toBe('FB48C4');
        expect(D.INK).toBe('000000');
        expect(D.FONT_DISPLAY).toBe('Poppins');
        expect(D.FONT_BODY).toBe('Josefin Sans');
        // FONT_MONO is the tables / data / meta face (Nunito once the brands.ts font-role correction lands); not pinned here
        expect(typeof D.FONT_MONO).toBe('string');
        expect(D.TITLE_TRANSFORM).toBe('uppercase');
        expect(D.BRAND_LOGO_WORDMARK).toBe('DECIEM');
    });
});

describe('#deciem is a catalog modifier and a #help registry entry', () => {
    it('CATALOG_MODIFIERS lists #deciem as a brand modifier beside #nxt and #nu', () => {
        const brands = CATALOG_MODIFIERS.filter(m => m.kind === 'brand').map(m => m.token).sort();
        expect(brands).toEqual(['#deciem', '#nu', '#nxt']);
        expect(isCatalogModifier('#deciem')).toBe(true);
        expect(isCatalogModifier('#DECIEM')).toBe(true);
    });

    it('the registry has a #DECIEM entry whose copy is token-derived', () => {
        const d = DIRECTIVES.find(x => x.id === '#DECIEM');
        expect(d).toBeTruthy();
        expect(d!.category).toBe('system');
        expect(d!.summary).toMatch(/DECIEM brand/);
        expect(d!.summary).toMatch(/Poppins Bold uppercase/);
        expect(d!.summary).toMatch(/applies to any deliverable hashtag/);
        expect(d!.description).toContain(PINK);
        expect(d!.description).toMatch(/Josefin Sans/);
        expect(d!.examples.some(e => /#DECIEM/.test(e))).toBe(true);
        // the two older brands are untouched
        expect(DIRECTIVES.find(x => x.id === '#NU')!.description).toMatch(/Lato/);
        expect(DIRECTIVES.find(x => x.id === '#NXT')!.description).toMatch(/Saira Condensed/);
    });
});

describe('brief-dialog skin', () => {
    const transcript = {
        topic: 'Ingredient transparency in skincare retail',
        finding_under_test: 'Customers read the ingredient list before the price',
        turns: [
            { speaker: 'Skeptical Partner' as const, line: 'Shoppers compare price first; show me the counter-evidence.', citations: ['CHUNK_001'] },
            { speaker: 'Curious Strategist' as const, line: 'Store interviews put the ingredient list ahead of price for repeat buyers.', citations: ['CHUNK_004'] },
            { speaker: 'Skeptical Partner' as const, line: 'Repeat buyers, granted. First-time buyers are a different population.', citations: ['CHUNK_002'], is_concession: true },
        ],
        final_stance: 'qualified' as const,
        word_count: 60,
    };

    it('DECIEM renders the DECIEM tokens (Poppins, pink, black ink) and not the NXT or NU accent', () => {
        const html = renderBriefDialogHtml({ transcript, brand: 'deciem' });
        expect(html).toContain('Poppins');
        expect(html).toContain('Josefin Sans');
        expect(html).toContain(PINK);
        expect(html).toContain('text-transform: uppercase');
        // labels are Poppins Bold uppercase; meta / cite lines take the FONT_MONO (data) face
        expect(html).toMatch(/\.bd-kicker \{ font-family: 'Poppins', sans-serif; font-weight: 700;/);
        expect(html).toMatch(new RegExp(`\\.bd-meta \\{ font-family: '${D.FONT_MONO}'`));
        expect(html).not.toContain(NXT_ACCENT);
        expect(html).not.toContain(NU_ACCENT);
        expect(html).not.toContain('Bebas Neue');
    });

    it('NXT and NU still render their own skins', () => {
        expect(renderBriefDialogHtml({ transcript, brand: 'nxt' })).toContain(NXT_ACCENT);
        expect(renderBriefDialogHtml({ transcript, brand: 'nu' })).toContain(NU_ACCENT);
        expect(renderBriefDialogHtml({ transcript, brand: 'nu' })).not.toContain(PINK);
    });
});

describe('research-plan skin', () => {
    const plan: any = {
        plan_version: 1,
        goal: 'How do skincare shoppers decide between two serums with the same active ingredient',
        sub_questions: [
            { id: 'SQ1', question: 'Which signals do shoppers read first on the product page?', angle: 'behavioral', priority: 'high', expected_named_entities: ['DECIEM'], expected_evidence_types: ['interview'] },
            { id: 'SQ2', question: 'How do staff explain concentration differences in store?', angle: 'operational', priority: 'medium', expected_named_entities: [], expected_evidence_types: ['observation'] },
        ],
        source_strategy: [{ source_id: 'Reddit r/SkincareAddiction', sub_question_ids: ['SQ1'], expected_yield: 12, rationale: 'first-hand routine talk' }],
        named_institutions: ['DECIEM'],
        budget_usd: 4,
        expected_themes_count: 6,
        reflection_threshold: 0.4,
        max_iterations: 3,
    };

    it('DECIEM renders the DECIEM tokens and the brand label, never the NXT skin', () => {
        const html = renderResearchPlanHtml({ plan, brand: 'deciem' });
        expect(html).toContain('Poppins');
        expect(html).toContain(PINK);
        expect(html).toContain('DECIEM');
        expect(html).toMatch(/\.rp-kicker \{ font-family: 'Poppins', sans-serif; font-weight: 700;/);
        expect(html).toMatch(new RegExp(`\\.rp-source-list \\{ font-family: '${D.FONT_MONO}'`));
        expect(html).not.toContain(NXT_ACCENT);
        expect(html).not.toContain(NU_ACCENT);
    });

    it('NXT and NU are unchanged', () => {
        expect(renderResearchPlanHtml({ plan, brand: 'nxt' })).toContain(NXT_ACCENT);
        expect(renderResearchPlanHtml({ plan, brand: 'nu' })).toContain(NU_ACCENT);
    });
});

describe('PRD AIR carries the deciem brand id', () => {
    it('createPrdAir accepts brand deciem and keeps it on the record', () => {
        const air = createPrdAir({ artifactId: 'a-deciem', objective: 'Objective', title: 'Title', brand: 'deciem' });
        expect(air.brand).toBe('deciem');
    });
});
