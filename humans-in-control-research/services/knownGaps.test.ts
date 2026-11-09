import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseKnownGapPage, selectKnownGaps, renderKnownGaps, loadKnownGapPages, __resetKnownGapsCache } from './knownGaps';
import { parseEngagementPage } from './wikiCompiler';
import { primaryIndustry } from './industryTaxonomy';

const page = (family: string, kinds: string, cases: number, appliesTo = 'generation') => `---
id: known-gaps/failure-${family.toLowerCase()}.md
title: "Recurring failure: ${family} title"
type: known-gap
source: eval-frontier
family: ${family}
applies_to: ${appliesTo}
kinds: [${kinds}]
cases: ${cases}
updated: 2026-10-31
source_hash: abc
---
# Recurring failure: ${family} title

What fails: ${family} fails this way.

Seen in ${cases} frontier eval case(s).

What the harness does about it: ${family} remedy.

## 2026-10-02 | eng-a
- prd prd_1: 3 blocking row(s) (frontier case prd-prd_1)
`;

describe('known gaps for generation (WS-C C3)', () => {
    it('parses a page the brain-growth pass writes', () => {
        const p = parseKnownGapPage('known-gaps/failure-unsourced-fact.md', page('UNSOURCED_FACT', 'prd, slides', 12))!;
        expect(p).toMatchObject({ family: 'UNSOURCED_FACT', title: 'UNSOURCED_FACT title', appliesTo: 'generation', kinds: ['prd', 'slides'], cases: 12,
            whatFails: 'UNSOURCED_FACT fails this way.', whatHelps: 'UNSOURCED_FACT remedy.' });
        expect(parseKnownGapPage('known-gaps/x.md', '---\ntype: synthesis-index\n---\n# x')).toBeNull();
    });

    it('selects by the deliverable kind, most cases first, and never a harness-only gap', () => {
        const pages = [
            parseKnownGapPage('a', page('UNSOURCED_FACT', 'prd, slides', 12))!,
            parseKnownGapPage('b', page('UNVERIFIED_QUOTE', 'slides', 30))!,
            parseKnownGapPage('c', page('unrecorded', 'slides, prd', 99, 'harness'))!,
            parseKnownGapPage('d', page('action-titles', 'slides', 3))!,
        ];
        expect(selectKnownGaps(pages, 'PRD').map(p => p.path)).toEqual(['a']);
        expect(selectKnownGaps(pages, 'STRATEGY_DECK').map(p => p.path)).toEqual(['b', 'a', 'd']);
        expect(selectKnownGaps(pages, 'ORG_CHART')).toEqual([]);
        expect(renderKnownGaps([pages[0]])).toBe('- UNSOURCED_FACT title: UNSOURCED_FACT fails this way. UNSOURCED_FACT remedy.');
    });

    describe('loading through the proxy', () => {
        beforeEach(() => __resetKnownGapsCache());
        afterEach(() => vi.unstubAllGlobals());
        it('reads only failure pages and skips an unreadable one', async () => {
            const calls: string[] = [];
            const fake = vi.fn(async (url: string) => {
                calls.push(url);
                if (url.endsWith('/api/wiki/list/known-gaps')) return new Response(JSON.stringify({ files: ['README.md', 'failure-unsourced-fact.md', 'failure-broken.md', 'donor-retention.md'] }));
                if (url.includes('failure-unsourced-fact')) return new Response(JSON.stringify({ content: page('UNSOURCED_FACT', 'prd', 4) }));
                return new Response('nope', { status: 500 });
            });
            const pages = await loadKnownGapPages(fake as any);
            expect(pages.map(p => p.family)).toEqual(['UNSOURCED_FACT']);
            expect(calls.some(c => c.includes('README') || c.includes('donor-retention'))).toBe(false);
        });
    });
});

describe('engagement pages feed the pattern step (WS-C C3)', () => {
    // the exact shape saveEngagementMemory writes
    const saved = `---
title: "Improve alumni giving at a research university"
type: engagement
engagement_type: research
industry: higher_ed
created: "2026-10-31"
updated: "2026-10-31"
---

## Research Goal

Improve alumni giving at a research university

## Themes Found

- **Fragmented donor records**: three CRMs
- **Lapsed young alumni**: no second gift

## Personas Identified

- **Annual fund officer** (Officer): "I rebuild the list by hand."

## Recommendations Made

- **[High] Consolidate the CRM**: one record per donor
`;

    it('reads goals, themes, personas, recommendations, type and industry', () => {
        const e = parseEngagementPage('engagements/improve-alumni-giving.md', saved);
        expect(e.engagementType).toBe('research');
        expect(e.industry).toBe('higher_ed');
        expect(e.goals).toEqual(['Improve alumni giving at a research university']);
        expect(e.themes).toHaveLength(2);
        expect(e.personas).toHaveLength(1);
        expect(e.recommendations[0]).toContain('Consolidate the CRM');
    });

    it('a goal names its vertical; cross-cutting verticals rank after a primary; no vertical is null', () => {
        expect(primaryIndustry('AI hiring workflows at university advancement offices')).toBe('higher_ed');
        expect(primaryIndustry('Workforce reskilling with generative AI across a hospital network')).toBe('healthcare');
        expect(primaryIndustry('How should we name the quarterly offsite?')).toBeNull();
    });
});

describe('deck turns receive the second brain (2026-10-31 live check)', () => {
    it('the companion de-dup skips only the duplicated framework pages, not facts, patterns or known gaps', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const src = readFileSync(join(__dirname, 'corpusChatService.ts'), 'utf8');
        const gate = src.split('\n').find(l => l.includes('isArtifactGenerationMessage(userMessage) || messageTargetsArtifact(userMessage)) && !providedContentOnly()') && l.trim().startsWith('if ('))!;
        expect(gate).toBeTruthy();
        expect(gate).not.toContain('_companionsAlreadyInjected');
        expect(src).toContain("if (gc?.framework && !_companionsAlreadyInjected)");
        expect(src).toContain("if (gc?.knownGaps) parts.push(");
    });
});

describe('wiki reads under nginx-denied directories go straight to the proxy', () => {
    it('PROXY_ONLY_WIKI_DIRS matches the nginx deny rule', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const conf = readFileSync(join(__dirname, '..', 'nginx.conf'), 'utf8');
        const m = /location ~ \^\/hic-workspace\/wiki\/\(([^)]+)\)/.exec(conf);
        expect(m).toBeTruthy();
        const { PROXY_ONLY_WIKI_DIRS } = await import('./wikiService');
        expect([...PROXY_ONLY_WIKI_DIRS].sort()).toEqual(m![1].split('|').sort());
    });
});
