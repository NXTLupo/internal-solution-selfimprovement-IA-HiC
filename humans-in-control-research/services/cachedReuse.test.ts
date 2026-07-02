import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCachedItemsByGoal, scoreGoalSimilarity } from './wikiCacheLoader';

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

// ============================================================================
// 2026-07-01 objective-contamination guards (the r/healthinsurance takeover).
// Live failure: a DORMANT KL selection from a prior session (subreddit
// 'healthinsurance') expanded to 929 chunk pointers, rode the user-selection
// priority tier, and filled 100% of every theme shard's grounding budget on an
// AGRICULTURAL-insurance run. Fixes: (A) dormant selections are goal-gated
// before grounding; (B) auto-reuse floor raised 0.2 -> 0.45 (higher-ed archives
// scored 0.29-0.38 into an agriculture corpus; the real match scored 0.67).
// ============================================================================
describe('objective-contamination guards (2026-07-01)', () => {
    const AGRI_GOAL = 'Deliver a comprehensive 2026 risk and market analysis for the agricultural insurance industry and modern farmers, focusing on emerging property risks and macroeconomic factors';

    it('scoreGoalSimilarity: the live takeover case scores below the dormant floor', () => {
        // the exact stale-selection descriptor from the incident
        expect(scoreGoalSimilarity(AGRI_GOAL, 'healthinsurance')).toBeLessThan(0.2);
        // higher-ed marketing archives that contaminated the corpus at the old 0.2 floor
        expect(scoreGoalSimilarity(AGRI_GOAL, 'identify emerging trends in higher education related only to advancement')).toBeLessThan(0.45);
    });

    it('scoreGoalSimilarity: a genuinely adjacent objective still passes', () => {
        const sim = scoreGoalSimilarity(AGRI_GOAL, 'agricultural insurance market risks for farmers');
        expect(sim).toBeGreaterThanOrEqual(0.45);
    });

    it('chunkRetrieval gates DORMANT selections by goal similarity; committed selections stay absolute', () => {
        const src = read('services/chunkRetrieval.ts');
        expect(src).toMatch(/DORMANT_SELECTION_MIN_GOAL_SIM/);
        expect(src).toMatch(/DORMANT KL selection SKIPPED for grounding/);
        // the gate only fires on _dormant - explicit selections are never scored away
        expect(src).toMatch(/if \(_dormant && researchObjective/);
        // the objective is threaded into the selection fetch
        expect(src).toMatch(/_fetchSelectionCatalogIds\(_obj\)/);
    });

    it('auto-reuse floor is 0.45 (contamination band 0.29-0.38 excluded)', () => {
        const loader = read('services/wikiCacheLoader.ts');
        expect(loader).toMatch(/minScore \?\? 0\.45/);
    });

    it('CLEAN GROUNDING RULE: every new run clears dormant KL selections at kickoff (owner directive)', () => {
        const app = read('App.tsx');
        expect(app).toMatch(/CLEAN GROUNDING RULE/);
        // the kickoff clears ONLY dormant selections with content - a Curate-committed
        // selection (not _uncommitted) survives, and the restore path never runs this.
        expect(app).toMatch(/_sel\._uncommitted && _hasContent/);
        expect(app).toMatch(/api\/user-selection\/active',\s*\{\s*method:\s*'DELETE'\s*\}/);
    });
});
