/**
 * E1.3. Two things are under test here.
 *
 * The provider-artifact stripper: `.claude/CLAUDE.md` bans "oaicite" and its family
 * outright and `check:content` fails the build on them, but nothing removed them at
 * runtime until now. The risky part of a stripper is over-reach, so most cases below
 * check that it leaves real prose alone.
 *
 * The slop detector: its predecessor deleted the banned word and left broken grammar.
 * This one reports the site and asks for a rewrite. The first implementation reached
 * across an import cycle with `require()`, threw in the ESM build, and silently reported
 * zero sites on a deck that had two, so the no-silent-fallback case is pinned.
 */
import { describe, it, expect } from 'vitest';
import { stripProviderArtifactTags, stripFormatTells } from './slidePostProcessor';
import { detectSlopInSlides, buildSlopRepairInstruction } from './slopDetector';

describe('stripProviderArtifactTags', () => {
    it('removes the ChatGPT-family tags the house rules ban', () => {
        expect(stripProviderArtifactTags('a claim oaicite:12')).toBe('a claim');
        expect(stripProviderArtifactTags('text [oai_citation:5] more')).toBe('text more');
        expect(stripProviderArtifactTags('see turn0search0 here')).toBe('see here');
        expect(stripProviderArtifactTags('file attached_file:report.pdf here')).toBe('file here');
    });

    it('keeps the sentence punctuation it found', () => {
        expect(stripProviderArtifactTags('ends with tag oaicite:3.')).toBe('ends with tag.');
    });

    it('never fuses the words either side of a removed tag', () => {
        expect(stripProviderArtifactTags('before turn1search2 after')).toBe('before after');
    });

    it('does NOT eat the word after a bare colon', () => {
        // The first version's value pattern swallowed the next token, which would have
        // deleted real prose in the name of hygiene.
        expect(stripProviderArtifactTags('x contentReference: y')).toBe('x y');
    });

    it('leaves ordinary prose and real citations untouched', () => {
        const prose = 'Clockwork reports enrichment shortens research (Source: Clockwork).';
        expect(stripProviderArtifactTags(prose)).toBe(prose);
        const pointer = 'A claim [articles/exs-clockwork/63e5475889.md#c1]';
        expect(stripProviderArtifactTags(pointer)).toBe(pointer);
    });

    it('is reachable from the shared chokepoint, so every surface gets it', () => {
        expect(stripFormatTells('a claim oaicite:12')).toBe('a claim');
    });
});

const tableSlide = (rows: string[][], extra: any = {}) => ({
    id: 's2', template: 'slides:evidence-table', status: 'draft', timestamp: 1,
    title: 'A finding',
    composerPayload: { title: 'A finding', columns: ['A', 'B', 'C'], rows: rows.map(cells => ({ cells })), ...extra },
});

describe('detectSlopInSlides', () => {
    it('finds a banned phrase in a NESTED field and names the path', () => {
        const sites = detectSlopInSlides([tableSlide([
            ['Research', 'Enrichment shortens the phase', 'Clockwork'],
            ['Reporting', 'Firms utilize a comprehensive approach to reporting', 'Clockwork'],
        ])]);
        const phrases = sites.map(s => s.phrase);
        expect(phrases).toContain('utilize');
        expect(sites.find(s => s.phrase === 'utilize')!.field).toBe('rows[1].cells[1]');
    });

    it('quotes the sentence so the repair prompt can show it back', () => {
        const sites = detectSlopInSlides([tableSlide([
            ['Reporting', 'The team ships weekly. Firms utilize a broad approach.', 'Clockwork'],
        ])]);
        expect(sites[0].sentence).toBe('Firms utilize a broad approach.');
    });

    it('EXEMPTS a verbatim quote field, because the lexicon governs the model voice only', () => {
        const sites = detectSlopInSlides([tableSlide(
            [['Research', 'Enrichment shortens the phase', 'Clockwork']],
            { quote: 'A.I. utilizes position details, project and company data' },
        )]);
        expect(sites).toHaveLength(0);
    });

    it('reports nothing on clean copy', () => {
        expect(detectSlopInSlides([tableSlide([['Research', 'Enrichment shortens the research phase', 'Clockwork']])])).toHaveLength(0);
    });

    it('THROWS rather than reporting zero when it cannot enumerate a slide', () => {
        // A deck we could not inspect must never look like a deck with no findings.
        const hostile = { id: 'bad', get composerPayload(): any { throw new Error('boom'); } };
        expect(() => detectSlopInSlides([hostile as any])).toThrow(/could not enumerate/);
    });

    it('is safe on an empty deck', () => {
        expect(detectSlopInSlides([])).toEqual([]);
        expect(detectSlopInSlides(null as any)).toEqual([]);
    });
});

describe('buildSlopRepairInstruction', () => {
    it('asks for a rewrite and forbids deletion or annotation', () => {
        const sites = detectSlopInSlides([tableSlide([['Reporting', 'Firms utilize a broad approach.', 'Clockwork']])]);
        const instr = buildSlopRepairInstruction(sites);
        expect(instr).toMatch(/Rewrite each sentence/i);
        expect(instr).toMatch(/Do not delete the sentence/i);
        expect(instr).toContain('utilize');
        expect(instr).toContain('rows[0].cells[1]');
    });

    it('is empty when there is nothing to fix, so the chain stays quiet', () => {
        expect(buildSlopRepairInstruction([])).toBe('');
    });
});
