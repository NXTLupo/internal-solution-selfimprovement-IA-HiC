// 2026-11-08 - pins the deterministic dialogue gate added after a live audio overview asserted
// a 2018 student-AI statistic that existed nowhere in the corpus (and the corpus was empty).
import { describe, it, expect } from 'vitest';
import { verifyDialogTurns, type BriefDialogTurn } from './briefDialogService';

const CORPUS = [
    'Background prose about student AI adoption.',
    '[articles/pew-internet/ab12cd34ef.md#c3] In a November 2026 survey, 62% of college students reported weekly assistant use.',
    'More prose. [CHUNK_004] Advisors reported rising co-op application volumes in 2026.',
].join('\n');

const t = (line: string, citations: string[] = []): BriefDialogTurn =>
    ({ speaker: 'Curious Strategist', line, citations, is_concession: false });

describe('verifyDialogTurns: figures live only where the cited passage carries them', () => {
    it('passes a figure whose cited passage carries it', () => {
        const turns = [t('A 2026 survey put weekly assistant use at 62% among students.', ['articles/pew-internet/ab12cd34ef.md#c3'])];
        expect(verifyDialogTurns(turns, CORPUS)).toHaveLength(0);
    });

    it('fails a figure with no citation at all', () => {
        const turns = [t('Back in 2018, 40% of students already used AI tools.')];
        const v = verifyDialogTurns(turns, CORPUS);
        expect(v).toHaveLength(1);
        expect(v[0].reason).toMatch(/no corpus citation/);
    });

    it('fails an INVENTED citation token', () => {
        const turns = [t('Adoption doubled in 2025.', ['CHUNK_999'])];
        const v = verifyDialogTurns(turns, CORPUS);
        expect(v).toHaveLength(1);
        expect(v[0].reason).toMatch(/not present in the corpus/);
    });

    it('fails a figure absent from the cited passage neighborhood', () => {
        const turns = [t('The 2018 cohort reached 90% adoption.', ['CHUNK_004'])];
        const v = verifyDialogTurns(turns, CORPUS);
        expect(v).toHaveLength(1);
        expect(v[0].reason).toMatch(/absent from the cited passage/);
    });

    it('a qualitative line with no figures always passes', () => {
        const turns = [t('Students lean on assistants for drafting, then bring judgment calls to advisors.')];
        expect(verifyDialogTurns(turns, CORPUS)).toHaveLength(0);
    });
});

// 2026-11-09 - NotebookLM S1 parity: four dialogue formats ride a leading format word.
import { parseDialogFormat } from './briefDialogService';

describe('parseDialogFormat', () => {
    it('defaults to deep-dive when no format word leads', () => {
        const r = parseDialogFormat('the strongest co-op findings so far');
        expect(r.format).toBe('deep-dive');
        expect(r.topic).toBe('the strongest co-op findings so far');
    });
    it('parses a leading debate word and strips it from the topic', () => {
        const r = parseDialogFormat('debate the connector bet against a campus assistant');
        expect(r.format).toBe('debate');
        expect(r.topic).toBe('the connector bet against a campus assistant');
    });
    it('parses critique and brief, with optional "as a" prefix', () => {
        expect(parseDialogFormat('critique the evidence behind the portability theme').format).toBe('critique');
        expect(parseDialogFormat('as a brief: student AI trust').format).toBe('brief');
    });
    it('a mid-sentence format word is content, not steering', () => {
        const r = parseDialogFormat('how students debate tool choices');
        expect(r.format).toBe('deep-dive');
        expect(r.topic).toBe('how students debate tool choices');
    });
});
