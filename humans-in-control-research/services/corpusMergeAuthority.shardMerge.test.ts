/**
 * 2026-10-20 (root-cause audit A1, plan item 10): the shard merge folds same-identity and
 * near-duplicate-name themes INTO the kept theme with their citations, instead of dropping
 * the later shard's theme (and its corroboration) on an exact lower-cased name match.
 */
import { describe, it, expect } from 'vitest';
import {
  mergeShardThemes,
  mergeThemeSets,
  themeNamesNearDuplicate,
  themeNameTokens,
  citationOriginKey,
  foldThemeEvidence,
  recountThemeSources,
} from './corpusMergeAuthority';

const cit = (sourceName: string, url: string, text: string, extra: any = {}) => ({ sourceName, url, text, ...extra });

const shardOne = () => [
  {
    name: 'Advisors lose students between the first two visits',
    description: 'Students who miss the second advising visit rarely return to the office that term.',
    citations: [cit('Higher Ed Dive', 'https://www.highereddive.com/news/advising-gap/1', 'students who miss the second advising visit rarely return that term')],
    goalAlignment: 72,
  },
  {
    name: 'Donors stop giving after the first gift',
    description: 'First-time donors who receive no personal follow-up within a month do not give again.',
    citations: [cit('Chronicle of Philanthropy', 'https://philanthropy.com/article/first-gift', 'first-time donors who get no personal follow-up do not give again')],
  },
];

const shardTwo = () => [
  {
    // exact same name, different casing and trailing space: the old dedupe matched this one and DROPPED it
    name: 'advisors lose students between the first two visits ',
    description: 'Students skip the second visit and the advising office never sees them again that term, per the Reddit thread.',
    citations: [
      cit('Reddit r/NEU', 'https://reddit.com/r/NEU/comments/abc', 'I skipped the second appointment and never went back'),
      // the same Higher Ed Dive span again (same origin + same span): must not double-count
      cit('Higher Ed Dive', 'https://www.highereddive.com/news/advising-gap/1/?utm_source=x', 'students who miss the second advising visit rarely return that term'),
    ],
    keyQuotes: ['I skipped the second appointment and never went back'],
    goalAlignment: 80,
  },
  {
    // near-duplicate name (token Jaccard 5/6): the old dedupe let this survive as a twin
    name: 'Donors stop giving after the first gift arrives',
    description: 'A first gift without a thank-you call is usually the last gift.',
    citations: [cit('Giving USA', 'https://givingusa.org/report/retention', 'a first gift without a thank-you call is usually the last gift')],
  },
  {
    name: 'Co-op employers hire from a short list of programs',
    description: 'Recruiters say they return to the same four programs every cycle.',
    citations: [cit('Reddit r/cscareerquestions', 'https://reddit.com/r/cscareerquestions/comments/xyz', 'we go back to the same four programs every cycle')],
  },
];

describe('themeNameTokens / themeNamesNearDuplicate', () => {
  it('normalizes case, punctuation and stopwords', () => {
    expect(themeNameTokens('The Advisors lose Students, between the first two visits!')).toEqual(['advisors', 'lose', 'students', 'between', 'first', 'two', 'visits']);
  });
  it('treats exact, contained and high-Jaccard names as the same theme', () => {
    expect(themeNamesNearDuplicate('Advisors lose students between visits', 'advisors lose students between visits')).toBe(true);
    expect(themeNamesNearDuplicate('AI assistants reshape retail search', 'AI assistants reshape retail search traffic')).toBe(true);
    expect(themeNamesNearDuplicate('Donor retention', 'First-year donor retention falls')).toBe(true);
  });
  it('does not collapse themes that only share a buzzword', () => {
    expect(themeNamesNearDuplicate('AI in sales', 'AI in advising')).toBe(false);
    expect(themeNamesNearDuplicate('AI', 'AI assistants reshape retail search')).toBe(false);
    expect(themeNamesNearDuplicate('Advisors lose students between visits', 'Donors stop giving after the first gift')).toBe(false);
  });
});

describe('mergeShardThemes', () => {
  it('folds the same-named theme from a later shard into the kept theme WITH its citations', () => {
    const acc: any[] = [];
    const r1 = mergeShardThemes(acc, shardOne());
    expect(r1.added).toBe(2);
    expect(r1.folded).toBe(0);
    const r2 = mergeShardThemes(acc, shardTwo());
    expect(r2.added).toBe(1);
    expect(r2.folded).toBe(2);
    expect(acc.map(t => t.name)).toEqual([
      'Advisors lose students between the first two visits',
      'Donors stop giving after the first gift',
      'Co-op employers hire from a short list of programs',
    ]);
    const advisors = acc[0];
    // Higher Ed Dive + Reddit: the union, with the repeated Higher Ed Dive span not double-counted
    expect(advisors.citations).toHaveLength(2);
    expect(advisors.citations.map((c: any) => c.sourceName)).toEqual(['Higher Ed Dive', 'Reddit r/NEU']);
    expect(advisors.distinct_source_count).toBe(2);
    expect(advisors.evidence_tier).toBe('thick');
    expect(advisors.keyQuotes).toEqual(['I skipped the second appointment and never went back']);
    expect(advisors.goalAlignment).toBe(80);          // the twin's higher alignment is kept
    expect(advisors.shard_corroboration).toBe(2);
    expect(advisors.citations_folded).toBe(1);
    expect(advisors.merged_from).toContain('advisors lose students between the first two visits');
  });

  it('treats a near-duplicate name as the same theme and unions its sources', () => {
    const acc: any[] = [];
    mergeShardThemes(acc, shardOne());
    mergeShardThemes(acc, shardTwo());
    const donors = acc[1];
    expect(donors.citations.map((c: any) => c.sourceName)).toEqual(['Chronicle of Philanthropy', 'Giving USA']);
    expect(donors.distinct_source_count).toBe(2);
    expect(donors.evidence_tier).toBe('thick');
  });

  it('keeps the canonical theme first-seen and appends twin citations AFTER the originals (indices stay valid)', () => {
    const acc: any[] = [];
    mergeShardThemes(acc, shardOne());
    const before = acc[0].citations[0];
    mergeShardThemes(acc, shardTwo());
    expect(acc[0].citations[0]).toBe(before);
  });

  it('also folds by summary fingerprint when the names differ', () => {
    const acc: any[] = [{ name: 'Theme A', description: 'Students who miss the second advising visit rarely return.', citations: [cit('A', 'https://a.com/1', 'x')] }];
    const r = mergeShardThemes(acc, [{ name: 'An entirely different label', description: 'Students who miss the second advising visit rarely return.', citations: [cit('B', 'https://b.com/2', 'y')] }]);
    expect(r.folded).toBe(1);
    expect(acc).toHaveLength(1);
    expect(acc[0].distinct_source_count).toBe(2);
  });

  it('is a no-op on empty input and skips nameless themes', () => {
    const acc: any[] = [];
    expect(mergeShardThemes(acc, [])).toEqual({ added: 0, folded: 0, addedThemes: [] });
    expect(mergeShardThemes(acc, [{ description: 'no name' }, null as any]).added).toBe(0);
    expect(acc).toHaveLength(0);
  });
});

describe('mergeThemeSets folds twin citations (cached + fresh)', () => {
  it('a fresh twin of a cached theme contributes its citations and the recount reflects the union', () => {
    const cached = [{ id: 'themes.md#0', name: 'Cached theme', description: 'Same summary text here.', citations: [cit('A', 'https://a.com/1', 'one')] }];
    const fresh = [{ id: 'themes.md#0', name: 'Fresh twin', description: 'Same summary text here.', citations: [cit('B', 'https://b.com/2', 'two')] }];
    const { merged, stats } = mergeThemeSets(cached, fresh);
    expect(stats.collapsed).toBe(1);
    expect(merged).toHaveLength(1);
    expect(merged[0].citations).toHaveLength(2);
    expect(merged[0].distinct_source_count).toBe(2);
  });
});

describe('citationOriginKey / foldThemeEvidence / recountThemeSources', () => {
  it('keys the origin by canonical host + path, else by normalized name', () => {
    expect(citationOriginKey({ url: 'https://www.HigherEdDive.com/news/a/?utm=x' })).toBe('highereddive.com/news/a');
    expect(citationOriginKey({ sourceName: 'Reddit: r/NEU' })).toBe('reddit r neu');
    expect(citationOriginKey({})).toBe('');
  });
  it('folding is idempotent for the same citation set', () => {
    const t: any = { name: 'T', citations: [cit('A', 'https://a.com/1', 'one')] };
    foldThemeEvidence(t, { citations: [cit('A', 'https://a.com/1', 'one')] });
    expect(t.citations).toHaveLength(1);
    expect(recountThemeSources(t)).toBe(1);
    expect(t.evidence_tier).toBe('single_source');
  });
});
