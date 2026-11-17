/**
 * Corpus-suggested report formats (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-B2b).
 *
 * The live Gemini Notebook run proposed report templates from the sources it held; HiC had the
 * formats but no suggestion surface. These pins cover the two properties that matter: the
 * mapping is driven by the corpus SHAPE, and it is deterministic (same corpus, same formats),
 * because the determinism rule for cached runs forbids a model call here.
 */
import { describe, it, expect } from 'vitest';
import { suggestReportFormats, withReportFormats, type SuggestionState, type PromptSuggestion } from './dynamicPromptSuggestions';

const GOAL = 'Understand how students use AI assistants for co-op applications';

function stateWith(items: string[], uploads: string[] = []): SuggestionState {
    return {
        researchGoal: GOAL,
        uploadedFiles: uploads.map(name => ({ name })),
        liveSourceResults: [{ source: 'feed', items: items.map(title => ({ title })) }],
    };
}

describe('suggestReportFormats', () => {
    it('proposes a chronology when the corpus is dated news', () => {
        const out = suggestReportFormats(stateWith(['Ars Technica: Google admits AI search makes less money']), 1);
        expect(out[0].text.startsWith('#chronology')).toBe(true);
        expect(out[0].kind).toBe('report-format');
        expect(out[0].rationale).toMatch(/dated news/i);
    });

    it('proposes an FAQ when the corpus is discussion threads', () => {
        const out = suggestReportFormats(stateWith(['How are yall handling AI screening : r/jobs']), 1);
        expect(out[0].text.startsWith('#faq')).toBe(true);
    });

    it('proposes a study guide when the corpus carries transcripts', () => {
        const out = suggestReportFormats(stateWith(['Advancement call'], ['interview transcript 2026.txt']), 1);
        expect(out.some(s => s.text.startsWith('#studyguide'))).toBe(true);
    });

    it('falls back to brief and blog post when nothing specific matches', () => {
        const out = suggestReportFormats(stateWith(['An untyped item about nothing in particular']), 2);
        expect(out.map(s => s.text.split(' ')[0])).toEqual(['#brief', '#blogpost']);
    });

    it('returns nothing when there is no corpus to read', () => {
        expect(suggestReportFormats({ researchGoal: GOAL }, 2)).toEqual([]);
    });

    it('is deterministic: the same corpus yields the same formats', () => {
        const s = stateWith(['NVIDIA Technical Blog: federated Kubernetes identity']);
        expect(JSON.stringify(suggestReportFormats(s, 2))).toBe(JSON.stringify(suggestReportFormats(s, 2)));
    });

    it('carries the objective into the chip text so the composer line is complete', () => {
        const out = suggestReportFormats(stateWith(['r/NEU thread about co-op']), 1);
        expect(out[0].text.length).toBeGreaterThan('#faq '.length);
    });
});

describe('withReportFormats', () => {
    const base: PromptSuggestion[] = [
        { text: 'Drill into the retention theme', kind: 'theme-exploration' },
        { text: 'Compare the top 3 themes', kind: 'comparison' },
        { text: 'What is the most defensible recommendation?', kind: 'synthesis' },
    ];

    it('reserves the last slot for a format once the corpus exists', () => {
        const out = withReportFormats(base, 'post-collection', stateWith(['r/jobs thread']), 3);
        expect(out).toHaveLength(3);
        expect(out[2].kind).toBe('report-format');
        expect(out[0]).toEqual(base[0]);
    });

    it('leaves earlier phases untouched', () => {
        const out = withReportFormats(base, 'mid-collection', stateWith(['r/jobs thread']), 3);
        expect(out.every(s => s.kind !== 'report-format')).toBe(true);
    });

    it('never duplicates a format the model already proposed', () => {
        const withFaq: PromptSuggestion[] = [{ text: '#faq what students ask', kind: 'document-drill' }, ...base.slice(0, 2)];
        const out = withReportFormats(withFaq, 'post-collection', stateWith(['r/jobs thread']), 3);
        expect(out.filter(s => s.text.includes('#faq'))).toHaveLength(1);
    });

    it('does not crash or pad when there is no corpus', () => {
        const out = withReportFormats(base, 'post-collection', { researchGoal: GOAL }, 3);
        expect(out).toEqual(base);
    });
});
