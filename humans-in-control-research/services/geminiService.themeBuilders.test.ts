/**
 * 2026-10-20 (root-cause audit A2, plan item 10): the two pure prompt builders behind the
 * theme passes. Relevance scoring no longer tells the model to score HIGHER when uncertain
 * (uncertain means 50, and the plan's sub-questions are given when published); the depth
 * pass sees the full quoted span of each citation (up to 1,200 chars) plus its chunk
 * pointer, with the per-theme block bounded by trimming the citation COUNT, not the text.
 */
import { describe, it, expect } from 'vitest';
import {
    buildObjectiveRelevancePrompt,
    buildDepthCitationBlock,
    DEPTH_CITATION_CHARS,
    DEPTH_INPUT_BUDGET,
} from './geminiService';

describe('buildObjectiveRelevancePrompt', () => {
    const goal = 'Why do first-year co-op students at Northeastern fail to land a placement?';
    const list = '0. Advisors lose students between visits - Students who miss the second visit rarely return.\n1. Co-op employers hire from a short list - Recruiters return to the same programs.';

    it('removes the score-higher-when-uncertain bias and calibrates uncertainty to 50', () => {
        const p = buildObjectiveRelevancePrompt(goal, list);
        expect(p).not.toMatch(/score HIGHER/i);
        expect(p).toMatch(/genuinely unsure, score 50/);
        expect(p).toMatch(/do not round up or down under uncertainty/);
        expect(p).toMatch(/DEGREE to which it answers/);
    });

    it('keeps the objective, the theme list, the full band ladder and the output schema', () => {
        const p = buildObjectiveRelevancePrompt(goal, list);
        expect(p).toContain(`RESEARCH OBJECTIVE: "${goal}"`);
        expect(p).toContain(`THEMES:\n${list}`);
        for (const band of ['90-100', '60-89', '30-59', '1-29', '0      =']) expect(p).toContain(band);
        expect(p).toContain('Return ONLY JSON: {"scores":[{"i":<index>,"r":<0-100>}]}');
        expect(p).toMatch(/do NOT penalize a theme for being single-source or thin/);
        expect(p).not.toContain('SUB-QUESTIONS');
    });

    it('gives the model the objective sub-questions when the plan published them', () => {
        const p = buildObjectiveRelevancePrompt(goal, list, [
            'Which stage of the co-op search loses the most first-year students?',
            '  ',
            'What do employers say about first-year candidates?',
        ]);
        expect(p).toContain('SUB-QUESTIONS');
        expect(p).toContain('Q1. Which stage of the co-op search loses the most first-year students?');
        expect(p).toContain('Q2. What do employers say about first-year candidates?');
        expect(p).not.toContain('Q3.');
        expect(p).toMatch(/or a direct answer to one sub-question/);
        expect(p.indexOf('SUB-QUESTIONS')).toBeLessThan(p.indexOf('Score EACH candidate theme'));
    });

    it('is deterministic for identical inputs (the proxy exact-match cache depends on it)', () => {
        expect(buildObjectiveRelevancePrompt(goal, list, ['a'])).toBe(buildObjectiveRelevancePrompt(goal, list, ['a']));
    });

    it('never carries an em dash', () => {
        expect(buildObjectiveRelevancePrompt(goal, list, ['q'])).not.toContain('—');
    });
});

describe('buildDepthCitationBlock', () => {
    const longText = (seed: number) => `Span ${seed}: ` + 'the advising office never sees the student again that term and the co-op coordinator hears about it only at the deadline. '.repeat(14);

    const longCitation = (i: number) => ({
        sourceName: `Source ${i}`,
        sourceFile: `articles/source-${i}/ab${i}.md#c${i}`,
        url: `https://source-${i}.example.com/a/${i}`,
        publicationDate: '2026-03-01',
        text: longText(i),
    });

    it('renders the full quoted span up to 1,200 chars (not 280) and notes the chunk pointer', () => {
        const c = longCitation(1);
        expect(c.text.length).toBeGreaterThan(DEPTH_CITATION_CHARS);
        const b = buildDepthCitationBlock([c]);
        expect(b.used).toBe(1);
        expect(b.total).toBe(1);
        expect(b.withPointer).toBe(1);
        const quoted = b.text.match(/"([^"]*)"/)?.[1] || '';
        expect(quoted.length).toBe(DEPTH_CITATION_CHARS);
        expect(quoted.startsWith('Span 1: the advising office')).toBe(true);
        expect(b.text).toContain('pointer: articles/source-1/ab1.md#c1');
        expect(b.text).toContain('[0] Source 1 · 2026-03-01');
    });

    it('keeps the block under the 40K budget by trimming the citation COUNT, never the text', () => {
        const cits = Array.from({ length: 60 }, (_, i) => longCitation(i));
        const b = buildDepthCitationBlock(cits);
        expect(b.chars).toBeLessThanOrEqual(DEPTH_INPUT_BUDGET);
        expect(b.text.length).toBe(b.chars);
        expect(b.used).toBeLessThan(60);
        expect(b.used).toBeGreaterThanOrEqual(28);    // 60 x 1,300 would be 78K; roughly 30 fit
        expect(b.total).toBe(60);
        // every rendered citation keeps its full 1,200-char span and its own index
        const spans = Array.from(b.text.matchAll(/"([^"]*)"/g)).map(m => m[1]);
        expect(spans).toHaveLength(b.used);
        for (const s of spans) expect(s.length).toBe(DEPTH_CITATION_CHARS);
        for (let i = 0; i < b.used; i++) expect(b.text).toContain(`[${i}] Source ${i}`);
        expect(b.text).not.toContain(`[${b.used}] Source ${b.used}`);
    });

    it('renders a citation without a pointer with no pointer line and tolerates the quote field', () => {
        const b = buildDepthCitationBlock([
            { sourceName: 'Reddit r/NEU', url: 'https://reddit.com/r/NEU/comments/abc', quote: 'I skipped   the second appointment\n and never went back', author: 'u/coop' },
            { sourceFile: 'uploads/charter.pdf', text: 'short' },
        ]);
        expect(b.used).toBe(2);
        expect(b.withPointer).toBe(0);
        expect(b.text).not.toContain('pointer:');
        expect(b.text).toContain('[0] Reddit r/NEU · u/coop');
        expect(b.text).toContain('"I skipped the second appointment and never went back"');
        expect(b.text).toContain('[1] uploads/charter.pdf');
    });

    it('always renders at least the first citation and honors overrides', () => {
        const b = buildDepthCitationBlock([longCitation(1), longCitation(2)], { perCitationChars: 100, budgetChars: 50 });
        expect(b.used).toBe(1);
        expect(b.text.match(/"([^"]*)"/)?.[1].length).toBe(100);
        expect(buildDepthCitationBlock([]).text).toBe('');
        expect(buildDepthCitationBlock(undefined as any).used).toBe(0);
    });
});
