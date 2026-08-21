/**
 * DF-C2. Two properties carry the value and both are tested here: the cut lands on
 * an item boundary (so `itemsShown` is a true count, not an estimate), and the
 * offload directory is excluded from the artifact scanner.
 */
import { describe, it, expect } from 'vitest';
import {
    applyStepBudget, renderSynopsis, isProcessFeedbackPath, STEP_RESULTS_DIR,
    SCANNER_EXCLUDED_DIRS, STEP_BUDGET_CHARS,
} from './stepBudget';

const article = (i: number) => `ARTICLE ${i}\n${'body '.repeat(40)}`;
const corpus = (n: number) => Array.from({ length: n }, (_, i) => article(i)).join('\n---\n');

describe('a result inside the budget is untouched', () => {
    it('returns the text with no synopsis', () => {
        const res = applyStepBudget('short text', { kind: 'text' });
        expect(res.withinBudget).toBe(true);
        expect(res.synopsis).toBeNull();
        expect(res.text).toBe('short text');
        expect(renderSynopsis(res.synopsis)).toBe('');
    });

    it('treats the default budget as the existing artifact-path cap', () => {
        expect(STEP_BUDGET_CHARS).toBe(48_000);
    });
});

describe('an oversized result is cut on a boundary and described', () => {
    it('keeps whole items and reports a true count', () => {
        const full = corpus(40);
        const res = applyStepBudget(full, { kind: 'article_bodies', itemsTotal: 40, separator: '\n---\n', budget: 2000 });
        expect(res.withinBudget).toBe(false);
        expect(res.text.length).toBeLessThanOrEqual(2000);
        // Every kept item is complete: no half article at the tail.
        const kept = res.text.split('\n---\n');
        expect(res.synopsis!.itemsShown).toBe(kept.length);
        for (const k of kept) expect(k.startsWith('ARTICLE ')).toBe(true);
    });

    it('types the synopsis so the model can act on it', () => {
        const res = applyStepBudget(corpus(40), { kind: 'article_bodies', itemsTotal: 40, separator: '\n---\n', budget: 2000 });
        const s = res.synopsis!;
        expect(s.kind).toBe('article_bodies');
        expect(s.itemsTotal).toBe(40);
        expect(s.charsTotal).toBeGreaterThan(s.charsShown);
        expect(s.note).toMatch(/of 40 article bodies shown/);
        expect(s.note).toMatch(/not because it was irrelevant/);
    });

    it('tells the model the block is a SAMPLE, which is the anti-thin-deck rule', () => {
        const res = applyStepBudget(corpus(40), { kind: 'chunk_corpus', separator: '\n---\n', budget: 1500 });
        const rendered = renderSynopsis(res.synopsis);
        expect(rendered).toContain('ELIDED: CORPUS CHUNKS');
        expect(rendered).toMatch(/Do not conclude that a topic is absent/);
    });

    it('never returns an empty block, even when one item exceeds the whole budget', () => {
        const res = applyStepBudget('x'.repeat(5000), { kind: 'text', separator: '\n---\n', budget: 500 });
        expect(res.text.length).toBe(500);
        expect(res.synopsis!.itemsShown).toBe(1);
    });

    it('falls back to a word boundary with no separator', () => {
        const words = 'alpha beta gamma delta epsilon '.repeat(60);
        const res = applyStepBudget(words, { kind: 'text', budget: 200 });
        expect(res.text.length).toBeLessThanOrEqual(200);
        expect(res.text.endsWith(' ')).toBe(false);
        expect(res.synopsis!.itemsShown).toBeNull();
        expect(res.synopsis!.note).toMatch(/KB of/);
    });
});

describe('the offload directory is process feedback, never a deliverable', () => {
    it('is excluded from the artifact scanner', () => {
        expect(SCANNER_EXCLUDED_DIRS).toContain(STEP_RESULTS_DIR);
        expect(STEP_RESULTS_DIR).toBe('.step-results');
    });

    it('recognizes an offload path on both separators', () => {
        expect(isProcessFeedbackPath('sessions/x/.step-results/gen-wiki.abc.txt')).toBe(true);
        expect(isProcessFeedbackPath('sessions\\x\\.step-results\\gen-wiki.abc.txt')).toBe(true);
        expect(isProcessFeedbackPath('.step-results/gen.txt')).toBe(true);
    });

    it('does NOT sweep up a real artifact', () => {
        expect(isProcessFeedbackPath('sessions/x/artifacts/slides_1.air.json')).toBe(false);
        expect(isProcessFeedbackPath('sessions/x/step-results-summary.md')).toBe(false);
    });
});
