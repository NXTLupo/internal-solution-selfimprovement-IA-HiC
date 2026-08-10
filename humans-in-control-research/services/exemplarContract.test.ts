// Exemplar-contract consultation tests (2026-08-07 hashtag design-system build).
// Contract: every hashtag deliverable turn injects its exemplar section + the
// usage rules; non-artifact messages inject nothing; kinds map to hashtags.
import { describe, it, expect } from 'vitest';
import { sliceExemplarSections } from './exemplarContract';

const MANIFEST = [
    '---', 'id: x', '---', '', '# EXEMPLAR MANIFEST', '', 'Intro prose.',
    '## THE GRID (Law 11)', '- 12 col x 120, gutter 20',
    '## THE IMAGERY CONTRACT (Law 12 - every img-slot, every deliverable)',
    '- GENERATE: [style] - DERIVED FROM: [quoted field] - SOURCE ANALYSIS: [field + source]',
    '## #slides (deck)', '- cover 16:7 · DS/LogoMark 16:2',
    '## #themes', '- DS/ThemeCard 17:43 variants Spotlight/Half/Third/Quarter',
    '## #personas', '- DS/PersonaIdentity 18:2 · DS/TraitPanel 18:30',
    '## #journey', '- DS/StageHeader 20:6 · DS/JourneyCell 20:17',
    '## #arch', '- DS/ArchNode 19:17',
    '## Usage rules (enforced)',
    '0. THE ACTOR RULE (anti-slop): every user-visible sentence names its actor',
    '1. CONSULT FIRST', '2. Tokens only',
].join('\n');

describe('sliceExemplarSections', () => {
    it('keeps the requested hashtag section + usage rules', () => {
        const out = sliceExemplarSections(MANIFEST, 'Please build the #personas set');
        expect(out).toContain('DS/PersonaIdentity 18:2');
        expect(out).toContain('CONSULT FIRST');
        expect(out).not.toContain('DS/ThemeCard');
    });

    it('multi-hashtag messages keep every matching section', () => {
        const out = sliceExemplarSections(MANIFEST, '#journey then #arch please');
        expect(out).toContain('DS/JourneyCell 20:17');
        expect(out).toContain('DS/ArchNode 19:17');
    });

    it('#strategy and #presentation resolve to the #slides section', () => {
        const out = sliceExemplarSections(MANIFEST, 'give me a #strategy deck');
        expect(out).toContain('DS/LogoMark 16:2');
    });

    it('plain chat injects nothing', () => {
        expect(sliceExemplarSections(MANIFEST, 'what are the top retention themes?')).toBe('');
    });

    it('wraps with the consultation header naming the gate consequence', () => {
        const out = sliceExemplarSections(MANIFEST, '#themes');
        expect(out).toMatch(/EXEMPLAR CONTRACT/);
        expect(out).toMatch(/gate violation/);
    });

    it('EVERY artifact turn carries the ACTOR RULE (usage rule 0) - the anti-slop floor', () => {
        for (const msg of ['#personas', '#slides deck please', '#journey', '#recs']) {
            const out = sliceExemplarSections(MANIFEST, msg);
            if (out === '') continue; // #recs not in this fixture
            expect(out, msg).toContain('THE ACTOR RULE');
            expect(out, msg).toContain('names its actor');
        }
    });

    it('EVERY artifact turn carries the IMAGERY CONTRACT (DERIVED FROM template)', () => {
        const out = sliceExemplarSections(MANIFEST, '#personas');
        expect(out).toContain('THE IMAGERY CONTRACT');
        expect(out).toContain('DERIVED FROM');
    });
});

describe('slop lexicon catches the AI-jargon family (owner evidence 2026-08-07)', () => {
    it('flags the -powered/-driven and intelligent-insights compounds', async () => {
        const { detectOutputAntiPatterns } = await import('./slidePostProcessor');
        const offenders = [
            'Deploy AI-powered tools that enable intelligent relationship insights.',
            'The path to value-driven advancement.',
            'Alumni service AI enables network activation.',
        ];
        for (const text of offenders) {
            const res = detectOutputAntiPatterns(text, 'deck');
            expect(res.violations.length, text).toBeGreaterThan(0);
        }
    });
});

describe('fetchExemplarContractForKind mapping', () => {
    // The mapper is exercised through its regexes without a network fetch by
    // importing the module and checking sliceExemplarSections composition -
    // here we assert the KIND->tag regex table via the exported fetch's
    // deterministic empty-string behavior for unknown kinds.
    it('unknown kinds resolve to no contract (fail-open)', async () => {
        const { fetchExemplarContractForKind } = await import('./exemplarContract');
        expect(await fetchExemplarContractForKind('mystery-kind')).toBe('');
    });
});
