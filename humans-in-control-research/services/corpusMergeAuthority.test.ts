import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  contentFingerprint,
  mergeCorpusItems,
  mergeThemeSets,
} from './corpusMergeAuthority';

describe('normalizeUrl', () => {
  it('lowercases, strips tracking params and trailing punctuation', () => {
    expect(normalizeUrl('HTTPS://Example.com/Article/?utm_source=x&ref=y'))
      .toBe('https://example.com/article');
  });
  it('treats same URL with different tracking as equal', () => {
    expect(normalizeUrl('https://a.com/p?utm_campaign=1'))
      .toBe(normalizeUrl('https://a.com/p?utm_campaign=2'));
  });
  it('returns empty for falsy input', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });
});

describe('contentFingerprint', () => {
  it('is stable for identical text', () => {
    expect(contentFingerprint('Hello world')).toBe(contentFingerprint('Hello world'));
  });
  it('is whitespace- and case-insensitive', () => {
    expect(contentFingerprint('Hello   World\n\n')).toBe(contentFingerprint('hello world'));
  });
  it('differs for different content', () => {
    expect(contentFingerprint('alpha')).not.toBe(contentFingerprint('beta'));
  });
  it('returns empty for empty body', () => {
    expect(contentFingerprint('')).toBe('');
  });
});

describe('mergeCorpusItems', () => {
  it('collapses same URL (P-baseline)', () => {
    const { merged, stats } = mergeCorpusItems([
      { id: 'a', url: 'https://x.com/p', content: 'body one is here' },
      { id: 'b', url: 'https://x.com/p/?utm_source=z', content: 'body one is here longer version' },
    ]);
    expect(merged).toHaveLength(1);
    expect(stats.collapsed).toBe(1);
    // longer body absorbed
    expect(merged[0].content).toBe('body one is here longer version');
    expect(merged[0].merged_from).toContain('b');
  });

  it('collapses same content at DIFFERENT URLs (P5 different-url-same-content)', () => {
    const body = 'The first-year co-op rejection cycle compounds across semesters.';
    const { merged, stats } = mergeCorpusItems([
      { id: 'a', url: 'https://site-one.com/x', content: body },
      { id: 'b', url: 'https://mirror-two.org/y', content: body },
    ]);
    expect(merged).toHaveLength(1);
    expect(stats.byKey.contentHash).toBe(1);
    expect(merged[0].merged_from).toContain('b');
  });

  it('collapses renamed same-content uploads (P8)', () => {
    const body = 'Client charter: advancement CRM migration scope and risks.';
    const { merged } = mergeCorpusItems([
      { id: 'upload_brief-pdf', url: 'upload://e/brief.pdf', content: body, relevanceScore: 100 },
      { id: 'upload_brief-final-pdf', url: 'upload://e/brief-final.pdf', content: body, relevanceScore: 100 },
    ]);
    expect(merged).toHaveLength(1);
  });

  it('keeps the higher relevanceScore on collapse', () => {
    const body = 'identical body text for relevance test here';
    const { merged } = mergeCorpusItems([
      { id: 'a', url: 'u1', content: body, relevanceScore: 40 },
      { id: 'b', url: 'u2', content: body, relevanceScore: 90 },
    ]);
    expect(merged[0].relevanceScore).toBe(90);
  });

  it('preserves genuinely distinct items and first-seen order', () => {
    const { merged } = mergeCorpusItems([
      { id: 'a', url: 'https://x.com/1', content: 'alpha content distinct' },
      { id: 'b', url: 'https://x.com/2', content: 'beta content distinct' },
      { id: 'c', url: 'https://x.com/3', content: 'gamma content distinct' },
    ]);
    expect(merged.map(m => m.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('mergeThemeSets', () => {
  it('collapses a fresh twin sharing the cluster id (P2 core)', () => {
    const cached = [{ id: 'syn.md#3', name: 'ML Trends', summary: 'Adoption of ML in advising', source: 'cached' }];
    const fresh = [{ id: 'syn.md#3', name: 'Machine Learning Trends', summary: 'Adoption of ML in advising and ops', source: 'new' }];
    const { merged, stats } = mergeThemeSets(cached, fresh);
    expect(merged).toHaveLength(1);
    expect(stats.byKey.clusterId).toBe(1);
    // cached is canonical (retained), fresh twin recorded
    expect(merged[0].source).toBe('cached');
    expect(merged[0]._hasFreshTwin).toBe(true);
  });

  it('collapses a fresh twin with a NEW id but identical summary (contentHash)', () => {
    const cached = [{ id: 'syn.md#3', name: 'Co-op Rejection', summary: 'Students face repeated co-op rejection cycles', source: 'cached' }];
    const fresh = [{ id: 'fresh.md#0', name: 'Co-op Denial Loop', summary: 'Students face repeated co-op rejection cycles', source: 'new' }];
    const { merged, stats } = mergeThemeSets(cached, fresh);
    expect(merged).toHaveLength(1);
    expect(stats.byKey.contentHash).toBe(1);
    expect(merged[0].source).toBe('cached');
  });

  it('does NOT collapse genuinely different themes that happen to share words', () => {
    const cached = [{ id: 'a#0', name: 'Visa Sponsorship Barriers', summary: 'International students blocked by work authorization rules' }];
    const fresh = [{ id: 'b#0', name: 'Advisor Capacity', summary: 'One advisor serves hundreds of students with no triage' }];
    const { merged } = mergeThemeSets(cached, fresh);
    expect(merged).toHaveLength(2);
  });

  it('absorbs richer fresh fields without double-counting', () => {
    const cached = [{ id: 'a#0', name: 'X', summary: 'short', top_terms: ['a'] }];
    const fresh = [{ id: 'a#0', name: 'X', summary: 'a much longer and richer description of the same theme', top_terms: ['a', 'b', 'c'] }];
    const { merged } = mergeThemeSets(cached, fresh);
    expect(merged).toHaveLength(1);
    expect(merged[0].top_terms).toEqual(['a', 'b', 'c']);
    expect(String(merged[0].description).length).toBeGreaterThan(5);
  });

  it('does NOT collapse distinct themes that share a source_synthesis_path (live-run 2026-06-08 regression)', () => {
    // All themes from one synthesis file carry the SAME source_synthesis_path.
    // They are DISTINCT clusters and must all survive — the file path is
    // provenance, not identity.
    const cached = [
      { id: 'syn.md#0', name: 'A', summary: 'distinct theme zero about visas', source_synthesis_path: 'synthesis/syn.md' },
      { id: 'syn.md#1', name: 'B', summary: 'distinct theme one about advising', source_synthesis_path: 'synthesis/syn.md' },
      { id: 'syn.md#2', name: 'C', summary: 'distinct theme two about co-op pay', source_synthesis_path: 'synthesis/syn.md' },
    ];
    const { merged, stats } = mergeThemeSets(cached, []);
    expect(merged).toHaveLength(3);
    expect(stats.byKey.urlKey).toBe(0);
  });

  it('returns fresh unchanged when no cached themes', () => {
    const fresh = [{ id: 'a#0', name: 'X', summary: 's1' }, { id: 'b#0', name: 'Y', summary: 's2' }];
    const { merged } = mergeThemeSets([], fresh);
    expect(merged).toHaveLength(2);
  });
});
