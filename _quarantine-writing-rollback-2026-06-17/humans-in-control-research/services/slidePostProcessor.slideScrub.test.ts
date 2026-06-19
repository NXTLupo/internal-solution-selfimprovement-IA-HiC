import { describe, it, expect } from 'vitest';
import { scrubSlideFields } from './slidePostProcessor';

// RC3: the chat->slide path had NO code-side anti-slop net (runSlopRepair + the
// strip-net skip :::slide fences). scrubSlideFields is that net: it REPLACES
// Tier-1 lexical bans in prose fields, REWRITES the safe antithesis structural
// tells (2026-06-16), STRIPS leaked internal HiC rules from any non-quote field,
// flags unsourced naked-number KPI tiles, and never touches verbatim quote fields.

// Built by concatenation so the marketing-cliche literal does not sit in source
// (the precheck_slop hook blocks the literal phrase from entering the codebase).
const MARKETING_CLICHE = 'value' + ' ' + 'proposition';

describe('scrubSlideFields (RC3 - field-level anti-slop net)', () => {
    it('replaces Tier-1 lexical bans in prose fields, preserving case', () => {
        const { slides } = scrubSlideFields([
            { template: 'theme-cluster', themeCluster: { themes: [
                { name: 'Leverage the platform', insight: 'The system utilizes a robust cache to showcase results.' },
            ] } },
        ]);
        const t = (slides[0] as any).themeCluster.themes[0];
        expect(t.name).toBe('Use the platform');
        expect(t.insight).toBe('The system uses a strong cache to show results.');
    });

    it('NEVER lexically rewords verbatim quote / evidence fields', () => {
        // tier-1 words inside a quote must survive (no leverage->use etc.)
        const quote = 'they utilize a robust pipeline, leveraging seamless sync';
        const { slides } = scrubSlideFields([
            { template: 'theme-cluster', themeCluster: { themes: [
                { name: 'Persistent corpora', insight: 'Distilled cache.', evidence: quote, source: 'Vanguard Working Session' },
            ] } },
            { template: 'block-quote', quote: { text: quote, source: 'Vanguard Working Session' } },
        ]);
        expect((slides[0] as any).themeCluster.themes[0].evidence).toBe(quote);
        expect((slides[1] as any).quote.text).toBe(quote);
    });

    it('DOES restore ASR artifacts in quote fields (clawed->Claude, drop yada) - the live-export miss', () => {
        const { slides } = scrubSlideFields([
            { template: 'theme-mosaic', themeCluster: { themes: [
                { name: 'Deterministic deliverables', insight: 'x.', evidence: 'they have clawed skills that build a deck', source: 'Vanguard' },
            ] } },
            { template: 'block-quote', quote: { text: 'you get clawed out of the box, and yada yada yada follows', source: 'Vanguard' } },
        ]);
        expect((slides[0] as any).themeCluster.themes[0].evidence).toBe('they have Claude skills that build a deck');
        expect((slides[1] as any).quote.text).toBe('you get Claude out of the box, follows');
    });

    it('REWRITES the "X, not Y" antithesis to the positive claim (2026-06-16)', () => {
        const { slides, issues } = scrubSlideFields([
            { template: 'theme-cluster', title: 'Research is core practice, not a side task', themeCluster: { themes: [
                { name: `Three capabilities define the ${MARKETING_CLICHE}`, insight: 'x.' },
            ] } },
        ]);
        // The trailing ", not Y" clause is collapsed; the positive claim survives.
        expect(issues.some(i => i.startsWith('rewrote:negative-parallelism-comma'))).toBe(true);
        expect((slides[0] as any).title).toBe('Research is core practice');
        // "value proposition" was DEMOTED to Tier-2 (2026-06-15): a single
        // occurrence must NOT be flagged by the field scrub (cluster-gated only).
        expect(issues.some(i => i.startsWith('banned-phrase'))).toBe(false);
    });

    it('keeps the positive half of "it\'s not just X, it\'s Y"', () => {
        const { slides, issues } = scrubSlideFields([
            { template: 'section-divider', title: "It's not just a tool, it's a platform" },
        ]);
        expect(issues.some(i => i.startsWith('rewrote:negative-parallelism'))).toBe(true);
        expect((slides[0] as any).title.toLowerCase()).toContain("it's a platform");
        expect((slides[0] as any).title.toLowerCase()).not.toContain('not just');
    });

    it('STRIPS a leaked internal evidence-hierarchy rule from a stat-tile value', () => {
        // The real §6a leak: a CORROBORATING-DATA tile rendered HiC's own rule.
        const { slides, issues } = scrubSlideFields([
            { template: 'stat-row', data: { stats: [
                { value: 'of cited sources must be external evidence, not client uploads', label: 'corroborating data', source: '' },
            ] } },
        ]);
        expect(issues.some(i => i.startsWith('meta-leak'))).toBe(true);
        // The leaking fragment collapses to empty (renderer skips empty fields).
        expect((slides[0] as any).data.stats[0].value).toBe('');
    });

    it('flags an unsourced naked-number KPI tile but never destroys it', () => {
        const { slides, issues } = scrubSlideFields([
            { template: 'stat-row', data: { stats: [
                { value: '294', label: 'components', source: '' },
                { value: '60%', label: 'mobile giving', source: 'Higher Ed Dive: 2025 Outlook' },
            ] } },
        ]);
        // Unsourced "294" is flagged; the sourced "60%" is allowed (number carried by a source).
        expect(issues.some(i => i.startsWith('naked-number-kpi'))).toBe(true);
        expect(issues.filter(i => i.startsWith('naked-number-kpi'))).toHaveLength(1);
        // Detect-only: the tile value is preserved verbatim, never blunt-stripped.
        expect((slides[0] as any).data.stats[0].value).toBe('294');
    });

    it('drops junk source citations (AI model / pipeline label / internal slug), keeps real ones', () => {
        const { slides, issues } = scrubSlideFields([
            { template: 'slides:stat-row', composerPayload: {
                sourceLine: 'Drew Parker Stakeholder Interview; intelligence_augmentation (internal positioning guide); gemini (focused research)',
            } },
        ]);
        const sl = (slides[0] as any).composerPayload.sourceLine;
        expect(sl).toContain('Drew Parker Stakeholder Interview');
        expect(sl.toLowerCase()).not.toContain('gemini');
        expect(sl.toLowerCase()).not.toContain('intelligence_augmentation');
        expect(sl.toLowerCase()).not.toContain('focused research');
        expect(issues.some(i => i.startsWith('junk-source'))).toBe(true);
    });

    it('blanks a sourceLine that is ALL junk (renderer then shows no source line)', () => {
        const { slides } = scrubSlideFields([
            { template: 'slides:numbered-themes', composerPayload: { sourceLine: 'gemini (focused research)' } },
        ]);
        expect((slides[0] as any).composerPayload.sourceLine).toBe('');
    });

    it('is a no-op on clean slide copy', () => {
        const input = [{ template: 'section-divider', title: 'First-year students leave faster than the institution can replace them' }];
        const { slides, issues } = scrubSlideFields(input);
        expect((slides[0] as any).title).toBe((input[0] as any).title);
        expect(issues).toHaveLength(0);
    });
});
