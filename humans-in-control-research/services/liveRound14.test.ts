/** 2026-10-26 (run 36: the owner's research + attached "Work" deck, re-run after the mixed-mode fix). Each case is a
 *  defect measured on that deck. */
import { describe, it, expect } from 'vitest';
import { composeSlide, tidyInlineSources, wouldShowHeaderScene, stripResearchFromAttached } from './slideComposer';
import { requestPlanBlock, fallbackRequestPlan, parseRequestPlan } from './requestPlan';
import { runLayoutGate, type SlideLayoutDefects } from './layoutGate';
import { renderVizSlot } from './vizSlot';

const clean = (id: string): SlideLayoutDefects => ({ slideId: id, offCanvas: 0, clipped: 0, overlaps: 0, fragments: 0, deadSpace: 0, details: [] });

describe('run 36 defects', () => {
    it('a header scene never sits on a slide whose right column starts at the top', () => {
        expect(wouldShowHeaderScene('slides:role-recommendation', { title: 'Short title' })).toBe(false);
        expect(wouldShowHeaderScene('slides:block-quote', { title: 'Short title' })).toBe(false);
        expect(wouldShowHeaderScene('slides:evidence-table', { title: 'Short title' })).toBe(true);
    });

    it('the layout gate removes a picture that covers text, and the slide passes', async () => {
        let dropped = '';
        const r = await runLayoutGate(['a', 'b'], {
            measureMany: async (ids) => Object.fromEntries(ids.map(id => [id, id === 'a' && !dropped ? { ...clean(id), overlaps: 2, details: ['image over text: "PROJECTED IMPACT"'] } : clean(id)])),
            applyScale: () => { throw new Error('a smaller font cannot move a picture'); },
            dropImages: (id) => { dropped = id; }, waitMs: 0,
        });
        expect(dropped).toBe('a');
        expect(r.repaired.map(x => x.slideId)).toEqual(['a']);
        expect(r.open.length).toBe(0);
    });

    it('provider and synthesis labels are not sources; a synthesis names the publications it drew on', () => {
        const t = tidyInlineSources({ title: 'x', body: 'Most CIOs report data cleanup before AI (engagement research synthesis).', sourceLine: 'Sources: (focused research) (engagement research synthesis); Reddit r/agency; Synthesis of Zoomsphere, Finalroundai, Bluelinesearch +10 more' });
        expect(t.body).toBe('Most CIOs report data cleanup before AI.');
        expect(t.sourceLine).toBe('Sources: Reddit r/agency; Zoomsphere; Finalroundai; Bluelinesearch');
    });

    it('an attached slide in a research deck keeps only the attachment: no market-pattern sentence, card or source', () => {
        const p = stripResearchFromAttached({
            _attachedSection: true, title: 'Canon CFS modernizes document-heavy finance operations',
            body: 'Management outlook is $470K for FY2027. Market pattern: one pool per benefit gives "a number finance can defend".',
            impact: [{ label: 'FY2027 OUTLOOK', headline: '$470K management outlook' }, { label: 'MARKET PATTERN', headline: 'Data foundations first' }],
            sourceLine: 'Sources: NXT Humans Client Portfolio 2027 Continuity 1; market pattern: aws ml blog',
        });
        expect(p.body).toBe('Management outlook is $470K for FY2027.');
        expect(p.impact.map((x: any) => x.label)).toEqual(['FY2027 OUTLOOK']);
        expect(p.sourceLine).toBe('Source: NXT Humans Client Portfolio 2027 Continuity 1');
        // a reformat (no research in the deck) keeps the client's own words, whatever they say
        const reformat = { _provided: true, body: 'Market pattern: retainers return.' };
        expect(stripResearchFromAttached(reformat)).toBe(reformat);
    });

    it('descriptions, process labels and quote fragments are not source names (run 37 footers)', () => {
        const t = tidyInlineSources({ title: 'x', sourceLine: 'Sources: , Agency financial models show contrasting cost structures and staffing ratios across operating models; Reddit r/agency (Oct 2026)' });
        expect(t.sourceLine).toBe('Source: Reddit r/agency (Oct 2026)');
        const u = tidyInlineSources({ title: 'x', sourceLine: 'Sources: Sources include focused research synthesis alongside secondary research; Zoomsphere; Blog, Simplex defines"rules and constraints up front"; OpenAI Blog' });
        expect(u.sourceLine).toBe('Sources: Zoomsphere; OpenAI Blog');
        const v = tidyInlineSources({ title: 'x', sourceLine: 'Source: NXT Humans Client Portfolio 2027 Continuity 1.pptx. Current management outlook combines contracted carryover, proposed extensions and risk-adjusted pipeline.' });
        expect(v.sourceLine).toBe('Source: NXT Humans Client Portfolio 2027 Continuity 1');
        // real names stay, short or long
        const w = tidyInlineSources({ title: 'x', sourceLine: 'Sources: Experiential Learning 1 Meeting Summary (Oct 2026); Student AI Companion statement of work; EdSurge' });
        expect(w.sourceLine.split(';').length).toBe(3);
    });

    it('a #slides request with no deliverable hashtag loads the deck skill, never a keyword match', async () => {
        const { matchSkills } = await import('./corpusChatService');
        const manifest = [
            { id: 'deck-composer', category: 'render-contract', triggers: ['deck'] },
            { id: 'tech-audit-inspector', category: 'research-deliverable', triggers: ['systems inventory', 'tech audit'] },
        ];
        const out = matchSkills('Generate a #slides deck presenting the #NXT offer positioning its AI-native tools, accelerators, and processes', manifest as any);
        expect(out[0]?.id).toBe('deck-composer');
        expect(out.map(s => s.id)).not.toContain('tech-audit-inspector');
    });

    it('the section name is read from the request when the plan model leaves it empty', async () => {
        const { attachmentSectionFrom } = await import('./requestPlan');
        expect(attachmentSectionFrom('Then add a "Work" section that includes all the content from the attached slides.')).toBe('Work');
        expect(attachmentSectionFrom('Add a Case Studies section with the attached deck.')).toBe('Case Studies');
        expect(attachmentSectionFrom('Reformat the attached deck.')).toBe('');
    });

    it('run 38: the section name rides an internal field the copy edit cannot touch, and the title says it once', () => {
        const html = composeSlide('section-divider', { number: '03', _sectionKicker: 'Work', title: 'Work: Four anchor clients move to durable platforms' }, 'nxt' as any)!;
        expect(html).toMatch(/text-transform:uppercase[^>]*>Work</);
        expect(html).not.toMatch(/WORK: FOUR|Work: Four/i);
    });

    it('run 38 footers and quotes: descriptive parentheticals, a bare "Blog", an unclosed quote', () => {
        const t = tidyInlineSources({ title: 'x', body: 'Utilization targets "punish exactly the behaviors that produce good consulting.', sourceLine: 'Sources: NXT Humans Client Portfolio 2027 Continuity 1.pptx, slide 7 (current management outlook combines contracted carryover, proposed extensions and risk-adjusted pipeline); Blog, Simplex; Blog; OpenAI Blog (May 2026)' });
        expect(t.sourceLine).toBe('Sources: NXT Humans Client Portfolio 2027 Continuity 1.pptx, slide 7; Simplex; OpenAI Blog (May 2026)');
        expect(t.body).toBe('Utilization targets “punish exactly the behaviors that produce good consulting.”');
    });

    it('run 39 footers: a short descriptive sentence, a quote with a model name glued on, a lowercase description', () => {
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Source: Working pilots face shorter delivery expectations' }).sourceLine).toBe('');
        expect(tidyInlineSources({ title: 'x', sourceLine: '“Accenture exited more than 11,000 workers who could not transition” gemini' }).sourceLine).toBe('');
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: analysis on capacity and financial validation; aws ml blog (Oct 2026)' }).sourceLine).toBe('Source: AWS ML Blog (Oct 2026)');
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: Reddit r/consulting and r/agency; OpenAI Blog' }).sourceLine).toBe('Sources: Reddit r/consulting and r/agency; OpenAI Blog');
    });

    it('a picture slot that shows nothing closes, and the text below it moves up', () => {
        const items = [1, 2, 3, 4].map(n => ({ number: `0${n}`, name: `Theme ${n}`, body: `Body ${n} names the actor.` }));
        const none = composeSlide('numbered-themes', { title: 'Four themes', items }, 'nxt' as any)!;
        const withImgs = composeSlide('numbered-themes', { title: 'Four themes', items, itemImages: items.map((_, i) => `data:image/png;base64,X${i}`) }, 'nxt' as any)!;
        const topOf = (h: string) => Number((/top:(\d+)px;[^>]*>Body 1 names/.exec(h) || [])[1]);
        expect(topOf(none)).toBeLessThan(topOf(withImgs));
    });

    it('the copy edit reads a long deck in batches and says when a batch returns nothing usable', async () => {
        const { critiqueDeckCopy } = await import('./copyCritic');
        const slides = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, template: 'slides:means-matters', title: 'Agencies lose margin', composerPayload: { title: 'Agencies lose margin', body: 'Agencies lose margin when delivery speeds up.' } }));
        let calls = 0;
        const r = await critiqueDeckCopy(slides as any, { call: async (_s, user) => { calls++; return calls === 2 ? '{"s9": {"title": "cut' : (user.includes('"s0"') ? '{"s0":{"title":"Hourly agencies lose margin when delivery speeds up"}}' : '{}'); } });
        expect(calls).toBe(3);
        expect(r.result.rewritten).toBe(1);
        expect(r.result.line).toContain('1 of 3 batch(es) did not return usable edits');
    });

    it('run 40: the attached document reads by its clean name, a curly quote takes its space, exhibit text loses provider labels', async () => {
        const { documentNameOf, documentRawNameOf } = await import('./sourceParity');
        const fn = 'NXT_Humans_Client_Portfolio_2027_Continuity 1.pptx';
        expect(documentNameOf(fn)).toBe('NXT Humans Client Portfolio 2027 Continuity');
        const t = tidyInlineSources({ title: 'x', _sourceDoc: documentNameOf(fn), _sourceDocRaw: documentRawNameOf(fn), sourceLine: 'Source: NXT Humans Client Portfolio 2027 Continuity 1.pptx, slide 2' });
        expect(t.sourceLine).toBe('Source: NXT Humans Client Portfolio 2027 Continuity, slide 2');
        expect(tidyInlineSources({ title: 'x', body: 'AI-native teams see“41% fewer production incidents”in practice' }).body).toBe('AI-native teams see “41% fewer production incidents” in practice');
        const { infographicSpecFrom } = await import('./artifactIllustrator');
        const spec: any = infographicSpecFrom({ beforeAfter: { before: { title: 'Hourly retainer', points: ['Billing grows with hours (engagement research synthesis)'] }, after: { title: 'Outcome pricing', points: ['Fees follow results (engagement research synthesis)'] } } }, 'pricing');
        expect(JSON.stringify(spec || {})).not.toContain('engagement research synthesis');
    });

    it('run 41: a trailing description is cut, an attached slide names its document, the attribution drops pipeline labels', () => {
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Source: NXT Humans Client Portfolio 2027 Continuity, slide 7. The current management outlook combines contracted carryover, proposed extensions and risk-adjusted pipeline.' }).sourceLine)
            .toBe('Source: NXT Humans Client Portfolio 2027 Continuity, slide 7');
        expect(tidyInlineSources({ title: 'x', _provided: true, _sourceDoc: 'NXT Humans Client Portfolio 2027 Continuity' }).sourceLine).toBe('Source: NXT Humans Client Portfolio 2027 Continuity');
        expect(tidyInlineSources({ title: 'x', attributionName: 'IMO9225, r/agency; Reddit Deep: r/agency (Oct 2026)' }).attributionName).toBe('IMO9225, r/agency; Reddit r/agency (Oct 2026)');
        // a real dotted name keeps its words
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Source: U.S. Bureau of Labor Statistics' }).sourceLine).toBe('Source: U.S. Bureau of Labor Statistics');
    });

    it('run 42: "citing" footers name their sources, research bars show rank, a long qualitative figure stays on one line', async () => {
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: , citing PwC and SpeedMVPs; OpenAI Blog' }).sourceLine).toBe('Sources: PwC; SpeedMVPs; OpenAI Blog');
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: , citing company reports; Zoomsphere' }).sourceLine).toBe('Source: Zoomsphere');
        const bars = { title: 'Firms cut delivery staff', bars: [{ label: 'Accenture', value: 100 }, { label: 'McKinsey', value: 45 }, { label: 'EY', value: 41 }] };
        const widths = (h: string) => Array.from(h.matchAll(/width:(\d+)px;height:\d+px;background:#B8B800/g)).map(m => Number(m[1]));
        const research = widths(composeSlide('ranked-bars', bars, 'nxt' as any)!);
        const client = widths(composeSlide('ranked-bars', { ...bars, _provided: true }, 'nxt' as any)!);
        expect(research.length).toBe(3);
        // research: evenly stepped by rank; client: proportional to the stated values
        expect(Math.abs((research[0] - research[1]) - (research[1] - research[2]))).toBeLessThan(3);
        expect(client[1] / client[0]).toBeCloseTo(0.45, 1);
        const { compositeIcon } = await import('./iconLibrary');
        expect((compositeIcon({ concept: 'Agents build on isolated branches', brand: 'nxt', ground: 'light', role: 'accent', size: 96 } as any) as any).baseId).not.toBe('workforce:badge');
    });

    it('the divider that opens the attached section can carry the section name', () => {
        const html = composeSlide('section-divider', { number: '04', kicker: 'Work', title: 'Anchor clients move from projects to platforms' }, 'nxt' as any)!;
        expect(html).toMatch(/text-transform:uppercase[^>]*>Work</);
    });

    it('per-slide asks and the attached section name reach the plan block', () => {
        const parsed = parseRequestPlan('{"mode":"generate","deliverable":"slides","useOnlyProvidedContent":false,"attachmentSection":"Work","perSlide":["a core headline","a workflow visualization","data-backed proof points"]}', 'x', ['slides']);
        expect(parsed?.attachmentSection).toBe('Work');
        const b = requestPlanBlock({ ...(parsed || fallbackRequestPlan('x')), carryAttachment: true });
        expect(b).toContain('On EVERY body slide');
        expect(b).toContain('a workflow visualization');
        expect(b).toContain('DRAWN on the slide');
        expect(b).toContain('The attached section is named "Work"');
    });

    it('stack labels wrap whole words in a sans fallback, and every plate is named', () => {
        const r = renderVizSlot({ brand: 'nxt', explicitFamily: 'capabilityStack', heading: 'x', w: 820, h: 600,
            payload: { labels: ['Accountable senior judgment', 'Working, tested software', 'Raw AI output'] } } as any);
        expect(r.svg).not.toContain('judgm.');
        expect(r.svg).toContain('judgment');
        expect(r.svg).toMatch(/font-family="[^"]*sans-serif"/);
    });

    it('a row of cards with a picture on some cards only draws no pictures', () => {
        const items = [1, 2, 3, 4].map(n => ({ number: `0${n}`, name: `Theme ${n}`, body: 'A complete sentence names the actor.' }));
        const html = composeSlide('numbered-themes', { title: 'Four themes', items, itemImages: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB', '', 'data:image/png;base64,DDD'] }, 'nxt' as any)!;
        expect(html).not.toContain('data:image/png;base64,AAA');
        const all = composeSlide('numbered-themes', { title: 'Four themes', items, itemImages: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB', 'data:image/png;base64,CCC', 'data:image/png;base64,DDD'] }, 'nxt' as any)!;
        expect(all).toContain('data:image/png;base64,AAA');
    });
});
