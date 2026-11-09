/**
 * 2026-10-20 (root-cause audit P0.1): the chat's THEMES block puts this engagement's own themes first, ranked, with
 * evidence pointers; cached themes from other engagements are a capped reference list that cannot be cited; the
 * prompt trim cuts the prior list before the own list.
 */
import { describe, it, expect } from 'vitest';
import { shapeThemesForChat, themeEvidencePointers, citableThemePointer } from './intelligenceShaping';
import { budgetGroundingSections } from './corpusChatService';

const own = (rank: number, name: string, ptr: string) => ({
    name, rank, objectiveRelevance: 90 - rank, distinct_source_count: 2, evidence_tier: 'convergent', description: `About ${name}.`,
    citations: [{ sourceFile: ptr, text: `Quote for ${name}`, sourceName: 'Reddit r/NEU' }],
});
const cached = (i: number) => ({ id: `eng:other:${i}`, name: `Foreign theme ${i}`, summary: 'from another engagement', source: 'cached' });

describe('THEMES block for the chat', () => {
    it('puts own themes first, ranked, with citable pointers; prior themes are reference-only and capped', () => {
        const themes = [...Array.from({ length: 50 }, (_, i) => cached(i)), own(1, 'Second', 'articles/reddit-deep/neu/aaa.md#c2'), own(0, 'First', 'articles/hed/bbb.md#c0')];
        const block = shapeThemesForChat(themes, { maxPrior: 10 });
        expect(block.indexOf('[T1] First')).toBeLessThan(block.indexOf('[T2] Second'));
        expect(block).toContain('Evidence: "Quote for First" [articles/hed/bbb.md#c0]');
        expect(block).toContain('=== THEMES (2, this engagement');
        expect(block.indexOf('=== THEMES (2')).toBeLessThan(block.indexOf('PRIOR-ENGAGEMENT THEMES (50'));
        expect(block).toContain('(40 more not listed)');
        expect(block).toContain('cite nothing from this list');
    });

    it('never offers a synthesis page as a citable pointer', () => {
        expect(citableThemePointer({ sourceFile: 'articles/hic-theme-synthesis/0576b762c2.md#c7' })).toBeNull();
        expect(citableThemePointer({ sourceFile: 'articles/hed/bbb.md#c0' })).toBe('articles/hed/bbb.md#c0');
        const block = shapeThemesForChat([{ name: 'Synth', rank: 0, citations: [{ sourceFile: 'articles/hic-theme-synthesis/x.md#c1', text: 'derived', sourceName: 'HiC Theme Synthesis' }] }]);
        expect(block).toContain('(engagement synthesis; not citable)');
        expect(block).not.toContain('[articles/hic-theme-synthesis');
    });

    it('pins the top own themes\' evidence pointers, capped, skipping synthesis pages', () => {
        const themes = [cached(1), own(0, 'A', 'articles/a/1.md#c0'), own(1, 'B', 'articles/hic-theme-synthesis/s.md#c3'), own(2, 'C', 'articles/c/3.md#c1')];
        expect(themeEvidencePointers(themes, 24)).toEqual(['articles/a/1.md#c0', 'articles/c/3.md#c1']);
        expect(themeEvidencePointers(themes, 1)).toEqual(['articles/a/1.md#c0']);
    });

    it('the prompt trim cuts prior-engagement themes before the engagement\'s own', () => {
        const ownBody = Array.from({ length: 300 }, (_, i) => `[T${i + 1}] Own theme ${i} with an evidence line long enough to matter for the budget here`).join('\n');
        const priorBody = Array.from({ length: 900 }, (_, i) => `- Foreign theme ${i}: a summary line from another engagement that should be trimmed first`).join('\n');
        const text = `=== THEMES (300, this engagement, ranked) ===\n${ownBody}\n=== END THEMES ===\n=== PRIOR-ENGAGEMENT THEMES (900, reference only) ===\n${priorBody}\n=== END PRIOR-ENGAGEMENT THEMES ===\n=== CORPUS (chunk-addressed) ===\nevidence`;
        const out = budgetGroundingSections(text, 60000);
        expect(out).toContain('[PRIOR-ENGAGEMENT THEMES (900, reference only) shortened for this turn]');
        expect(out).toContain('[T300] Own theme 299');
    });
});
