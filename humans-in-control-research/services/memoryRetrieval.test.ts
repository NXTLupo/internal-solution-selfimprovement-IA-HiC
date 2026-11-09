// memoryRetrieval.test.ts - WS-6 M1 (2026-10-30): long-term memory is retrieved by relevance, never wholesale.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { salientTerms, splitSections, rankSectionsByRelevance, renderRankedSections, selectMemoryFacts } from './memoryRetrieval';
import type { MemoryFact } from './memoryLifecycle';

const PAGE = `---
id: synthesis/cross-engagement-patterns.md
---

# Cross-Engagement Patterns

## AI-Enabled Personalized Student Support and Co-op Matching
## AI-Enabled Personalized Student Support and Co-op Matching
* Targeted readiness roadmaps analyze student profiles against employer requirements to improve co-op matching.
* Early skill gap identification helps students and advisors plan the academic term.

## Retail Loyalty Programs and Margin Pressure
* Retailers fund loyalty programs from promotional budgets while margin pressure rises.
* Store teams rely on the loyalty app to recover lapsed shoppers.

## Speculative and Pending Portfolio Patterns
* Organizational maturity levels correlate with employee outcomes and revenue performance.
`;

describe('salientTerms', () => {
    it('keeps content words, drops stop words and short tokens, keeps acronyms', () => {
        const t = salientTerms('Analyze the 2026 retail loyalty program landscape for CRM teams');
        expect(t.has('retail')).toBe(true);
        expect(t.has('loyalty')).toBe(true);
        expect(t.has('crm')).toBe(true);
        expect(t.has('the')).toBe(false);
        expect(t.has('2026')).toBe(false);
        expect(t.has('analyze')).toBe(false);
    });
});

describe('rankSectionsByRelevance', () => {
    it('splits sections and drops the duplicated heading the miner emits', () => {
        const s = splitSections(PAGE);
        expect(s.map(x => x.heading)).toEqual(['AI-Enabled Personalized Student Support and Co-op Matching', 'Retail Loyalty Programs and Margin Pressure', 'Speculative and Pending Portfolio Patterns']);
    });
    it('a retail objective receives the retail section and zero higher-ed patterns', () => {
        const out = rankSectionsByRelevance(PAGE, 'Deliver a 2026 outlook on retail loyalty programs, margin pressure and the store teams that run them');
        expect(out.map(s => s.heading)).toEqual(['Retail Loyalty Programs and Margin Pressure']);
        expect(out[0].shared).toEqual(expect.arrayContaining(['retail', 'loyalty', 'margin']));
        expect(renderRankedSections(out)).toContain('## Retail Loyalty Programs');
        expect(renderRankedSections(out)).not.toContain('co-op');
    });
    it('a co-op objective receives the student section and nothing about retail', () => {
        const out = rankSectionsByRelevance(PAGE, 'Map how first-year students find co-op placements and what advisors and employers need');
        expect(out.map(s => s.heading)).toEqual(['AI-Enabled Personalized Student Support and Co-op Matching']);
    });
    it('an objective that shares nothing injects nothing', () => {
        expect(rankSectionsByRelevance(PAGE, 'Assess the insurance claims process for commercial fleets')).toEqual([]);
        expect(rankSectionsByRelevance(PAGE, '')).toEqual([]);
    });
    it('the real pattern page: a retail objective gets no higher-ed section', () => {
        const real = readFileSync(join(__dirname, '..', 'hic-workspace', 'wiki', 'synthesis', 'cross-engagement-patterns.md'), 'utf-8');
        const out = rankSectionsByRelevance(real, 'Deliver a 2026 outlook report on retail loyalty programs and margin pressure for grocery chains');
        expect(out.some(s => /student|co-op/i.test(s.heading))).toBe(false);
    });
});

describe('selectMemoryFacts', () => {
    const fact = (content: string, days = 0, confidence = 0.8): MemoryFact => ({
        id: content.slice(0, 8), content, category: 'knowledge', confidence, scope: 'engagement', durability: 'durable', authority: 'descriptive',
        createdAt: new Date(Date.now() - days * 86_400_000).toISOString(), expectedValidDays: 180, confirmationCount: 0, sourceRunIds: ['r'],
    });
    it('ranks facts that share the objective\'s terms and leaves the rest out', () => {
        const facts = [fact('Q: retail loyalty margins / A: Grocery loyalty programs are funded from the promotional budget while margins fall'), fact('Q: co-op matching / A: Students apply to sixty placements before an interview'), fact('Q: retail store teams / A: Store teams recover lapsed shoppers through the loyalty app', 400)];
        const out = selectMemoryFacts(facts, 'retail loyalty programs and margin pressure for grocery chains');
        expect(out.map(o => o.fact.content.slice(3, 20))).toEqual(['retail loyalty ma', 'retail store team']);
        expect(out[0].score).toBeGreaterThan(out[1].score);
    });
    it('no objective, no facts', () => {
        expect(selectMemoryFacts([fact('anything about retail')], '')).toEqual([]);
    });
});
