import { describe, it, expect, vi, afterEach } from 'vitest';
import { compileWiki } from './wikiCompiler';

/**
 * WS-C C3 (2026-10-31): the cross-engagement pattern step compiles once five engagement pages share an engagement
 * type and an industry. The pages here are in the EXACT format `saveEngagementMemory` writes ("## Research Goal"
 * paragraph, "## Themes Found", "## Personas Identified", "## Recommendations Made", plus the engagement_type and
 * industry keys added on 2026-10-31); before that change no page carried the keys or matched the headings, so the
 * step never compiled. The proxy is stubbed by URL; the model reply is a fixed page.
 */
const page = (i: number, industry = 'higher_ed') => `---
title: "Engagement ${i}: improve alumni giving at a research university"
type: engagement
engagement_type: research
industry: ${industry}
created: "2026-10-0${i}"
updated: "2026-10-0${i}"
---

## Research Goal

Engagement ${i}: improve alumni giving at a research university

## Themes Found

- **Fragmented donor records**: three CRMs hold the same donor
- **Lapsed young alumni**: no second gift after graduation

## Personas Identified

- **Annual fund officer** (Officer): "I rebuild the list by hand."

## Recommendations Made

- **[High] Consolidate the CRM**: one record per donor
`;

function stubProxy(pages: Record<string, string>, writes: Array<{ path: string; content: string }>, modelCalls: string[]) {
    return vi.fn(async (input: any, init?: any) => {
        const url = String(typeof input === 'string' ? input : input?.url);
        const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/api/wiki/list/engagements')) return json({ files: Object.keys(pages).map(p => p.replace('engagements/', '')), dirs: [] });
        if (url.includes('/api/wiki/list/')) return json({ files: [], dirs: [] });
        const read = /\/api\/wiki\/read\/(.+)$/.exec(url);
        if (read) return pages[read[1]] ? json({ content: pages[read[1]] }) : new Response('nf', { status: 404 });
        if (url.includes('/api/wiki/write')) { writes.push(JSON.parse(init.body)); return json({ status: 'ok' }); }
        if (url.includes('/api/wiki/append')) return json({ status: 'ok' });
        if (url.includes('/api/ai/gemini')) {
            modelCalls.push(String(JSON.parse(init.body).contents).slice(0, 4000));
            return json({ candidates: [{ content: { parts: [{ text: '---\ntitle: research higher_ed engagement patterns\ntype: synthesis\nengagement_type: research\nindustry: higher_ed\nsample_size: 5\nstatus: active\n---\n\n## Themes\n- Fragmented donor records (5 of 5)\n\n## Personas\n- Annual fund officer (5 of 5)\n\n## Recommendations\n- Consolidate the CRM (5 of 5)\n\n## Gaps\n- No engagement measured second-gift conversion.\n' }] } }] });
        }
        return new Response('nf', { status: 404 });
    });
}

describe('cross-engagement pattern compile (WS-C C3)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('five pages in one type and industry compile synthesis/patterns/research-higher-ed.md from their real sections', async () => {
        const pages: Record<string, string> = {};
        for (let i = 1; i <= 5; i++) pages[`engagements/e${i}.md`] = page(i);
        pages['engagements/retail.md'] = page(6, 'retail');
        const writes: Array<{ path: string; content: string }> = [];
        const modelCalls: string[] = [];
        vi.stubGlobal('fetch', stubProxy(pages, writes, modelCalls));
        const res = await compileWiki({ scope: 'patterns' });
        expect(res.crossEngagementPatternsCompiled).toEqual(['synthesis/patterns/research-higher-ed.md']);
        const written = writes.find(w => w.path === 'synthesis/patterns/research-higher-ed.md')!;
        expect(written.content).toContain('industry: higher_ed');
        expect(modelCalls).toHaveLength(1);
        // the prompt carries the parsed sections, not empty summaries (the pre-fix failure)
        expect(modelCalls[0]).toContain('Fragmented donor records');
        expect(modelCalls[0]).toContain('Annual fund officer');
        expect(modelCalls[0]).toContain('Consolidate the CRM');
        expect(modelCalls[0]).toContain('improve alumni giving at a research university');
    });

    it('four pages in a group compile nothing', async () => {
        const pages: Record<string, string> = {};
        for (let i = 1; i <= 4; i++) pages[`engagements/e${i}.md`] = page(i);
        const writes: Array<{ path: string; content: string }> = [];
        const modelCalls: string[] = [];
        vi.stubGlobal('fetch', stubProxy(pages, writes, modelCalls));
        const res = await compileWiki({ scope: 'patterns' });
        expect(res.crossEngagementPatternsCompiled).toEqual([]);
        expect(modelCalls).toHaveLength(0);
    });
});

describe('compiled patterns reach generation (WS-C C3)', () => {
    const compiled = {
        frontmatter: { sample_size: 21 },
        content: [
            '## Themes', '', '1. **Experiential Learning & Co-Op Placement Navigation** (15/21 engagements)', '   Students and university leaders analyze friction around co-op placements and employer partnerships.', '',
            '## Personas', '', '1. **Higher Ed Technology Architect** (9/21 appearances)', '   Evaluates CRM platform migrations for enrollment teams.', '',
            '## Gaps', '', '- No engagement measured donor retention after a gift officer change.',
        ].join('\n'),
    };
    const reads: string[] = [];
    const read = async (p: string) => { reads.push(p); return p === 'synthesis/patterns/research-higher-ed.md' ? compiled : null; };

    it('a higher-ed objective receives the relevant sections of research-higher-ed, labelled and listed for the receipt', async () => {
        const { compiledPatternFor } = await import('./wikiService');
        const got = await compiledPatternFor('Develop a co-op placement strategy for a university experiential learning office', read);
        expect(got!.path).toBe('synthesis/patterns/research-higher-ed.md');
        expect(got!.block.startsWith('### Compiled from 21 prior higher_ed engagements (synthesis/patterns/research-higher-ed.md)')).toBe(true);
        expect(got!.block).toContain('Co-Op Placement Navigation');
        expect(got!.refs).toContain('research-higher-ed: Themes');
        expect(got!.refs).not.toContain('research-higher-ed: Gaps');          // shares too few terms with this objective
    });

    it('another industry never reads the higher-ed page; no vertical reads nothing', async () => {
        const { compiledPatternFor } = await import('./wikiService');
        reads.length = 0;
        expect(await compiledPatternFor('Map omnichannel retail checkout conversion for a DTC brand', read)).toBeNull();
        expect(reads).toEqual(['synthesis/patterns/research-retail.md']);
        reads.length = 0;
        expect(await compiledPatternFor('Name the quarterly offsite', read)).toBeNull();
        expect(reads).toEqual([]);
    });
});
