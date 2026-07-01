import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCachedItemsByGoal } from './wikiCacheLoader';

// WS-C regression guard (2026-06-30). Auto-reuse of the cached second brain by objective must stay wired:
// loadCachedItemsByGoal exists + returns [] safely for empty input, AND App.tsx folds its result into the
// corpus merge (not just the MANUAL Knowledge Library blend). Source-level asserts (style of opusCapConvergence).

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');

describe('WS-C: cached second-brain auto-reuse by objective', () => {
    it('loadCachedItemsByGoal is exported and fails safe on empty/short goals', async () => {
        expect(typeof loadCachedItemsByGoal).toBe('function');
        expect(await loadCachedItemsByGoal('')).toEqual([]);
        expect(await loadCachedItemsByGoal('short')).toEqual([]);
    });

    it('App.tsx auto-folds goal-matched cached items into the corpus merge (not manual-only)', () => {
        const app = read('App.tsx');
        expect(app, 'calls the auto-reuse loader').toMatch(/loadCachedItemsByGoal\(researchGoal\)/);
        // the auto-reused items are merged alongside uploads + the manual blend
        expect(app).toMatch(/_mergeUploads\s*=\s*\[\s*\.\.\.uploadedCorpusItems\s*,\s*\.\.\._blendCached\s*,\s*\.\.\._autoCached\s*\]/);
    });

    it('cached items carry the source:cached fold-in marker + provenance', () => {
        const loader = read('services/wikiCacheLoader.ts');
        expect(loader).toMatch(/\(it as any\)\.source = 'cached'/);
        expect(loader).toMatch(/cachedProvenance/);
        expect(loader).toMatch(/scoreGoalSimilarity\(goal, archiveGoal\)/);
    });
});
