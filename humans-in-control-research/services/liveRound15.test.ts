/** 2026-10-27 (run 43: the owner's research + attached "Work" deck, v5). Each case is a defect measured on that deck. */
import { describe, it, expect } from 'vitest';
import { composeSlide, quoteCell, caseSourceLine, harmonizeSiblingPeriods, tidyInlineSources } from './slideComposer';
import { candidateBaseIds } from './iconLibrary';
import { attachContentTrueIcons } from './artifactIconResolver';
import { freezeCitationLabels, slideDataToStageHtml } from './slideToStageHtml';
import { extractPointers, squashedDomainName } from './citationPointerRegistry';
import { describeVisual, notesWithVisual } from './slideComposer';
import { attachSectionMaps } from './sectionMaps';
import { evaluateDeckPlan, plainResearchFences, spliceRedrawnFences, drawnShare, isDrawnFence } from './deckPlanGate';
import { copyRewriteVerdict } from './copyCritic';

const fence = (t: string, p: any) => `:::slide template=${t}\n${JSON.stringify(p)}\n:::`;

describe('run 43 defects', () => {
    it('every card row of the live deck resolves a distinct content-true glyph', () => {
        const rows = [
            ['Architects define rules and constraints', 'Agents build in isolated branches', 'An adversarial model gates changes', 'Seniors review money and auth', 'NXT ships and prices the outcome'],
            ['Diagnose', 'Design', 'Build & embed', 'Expand'],
            ['Baseline 14 organizations', 'Prioritize up to four journeys', 'Define the AI-first help path', 'Carry milestones into Q1 2027', 'Grow the adjacent pipeline'],
        ];
        for (const titles of rows) {
            const p: any = { steps: titles.map(title => ({ title })) };
            expect(attachContentTrueIcons('slides:flow-arc', p, 'nxt', 'light')).toBe(titles.length);
            expect(new Set(p.stepIcons).size).toBe(titles.length);
        }
        expect(candidateBaseIds('Outcome pricing')).toEqual(expect.arrayContaining(['target', 'cost']));
        expect(candidateBaseIds('Qzxv wbnk')).toEqual([]);
    });

    it('a four-message numbered-themes slide carries a glyph per column', () => {
        const items = [
            { number: '01', name: 'Outcome pricing', body: 'Fees follow the business result the client names.', quote: 'You price the work on the outcome.' },
            { number: '02', name: 'Working software in weeks', body: 'Delivery teams ship working software within client timelines.', quote: 'clients demand working code' },
            { number: '03', name: 'Expertise as software', body: 'Senior know-how lives in tools and reusable workflows.', quote: 'Your IP needs to be software.' },
            { number: '04', name: 'Senior risk ownership', body: 'Named senior reviewers sign off on quality and security.', quote: 'People keep final judgment.' },
        ];
        const html = composeSlide('numbered-themes', { kicker: 'KEY MESSAGES', title: 'Four messages', items, sourceLine: 'Source: OpenAI Blog' }, 'nxt') as string;
        expect((html.match(/data:image\/svg\+xml/g) || []).length).toBe(4);
        // the lowercase fragment reads as a quote that starts mid-sentence
        expect(html).toContain('“…clients demand working code”');
    });

    it('a quote cell takes marks, a fragment ellipsis and its named source; a parenthetical in the quote stays', () => {
        expect(quoteCell({ quote: 'clients demand live proofs of concept (PoCs).' })).toBe('“…clients demand live proofs of concept (PoCs).”');
        expect(quoteCell({ quote: 'Now all your IP needs to be software (Source: Reddit r/agency)' })).toBe('“Now all your IP needs to be software” (Reddit r/agency)');
        expect(quoteCell({ quote: '“Give it eight weeks.”', quoteSource: 'Dermatology Times' })).toBe('“Give it eight weeks.” (Dermatology Times)');
        expect(quoteCell({ quote: quoteCell({ quote: 'My routine is five brands.', quoteSource: 'Allure' }), quoteSource: 'Allure' })).toBe('“My routine is five brands.” (Allure)');
    });

    it('lowercase feed names print the way the publisher writes them; subreddits and dated entries keep their form', () => {
        expect(caseSourceLine('Sources: Reddit r/agency (Oct 2026); nvidia ai blog (Sep 2026)')).toBe('Sources: Reddit r/agency (Oct 2026); NVIDIA AI Blog (Sep 2026)');
        expect(caseSourceLine('Sources: databricks ai; r/consulting')).toBe('Sources: Databricks AI; r/consulting');
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: Reddit r/chatgptcoding; databricks ai; OpenAI Blog' }).sourceLine)
            .toBe('Sources: Reddit r/chatgptcoding; Databricks AI; OpenAI Blog');
    });

    it('sibling captions share one ending: the one MEANS line without a period takes it', () => {
        const p = harmonizeSiblingPeriods({ stats: [
            { figure: 'THIN', means: 'Payroll absorbs a significant share of client fees.' },
            { figure: 'HIGH', means: 'Software infrastructure replaces portions of routine staffing.' },
            { figure: 'HIGHER', means: 'Traditional agency growth relies on expanding staff headcount' },
        ] });
        expect(p.stats[2].means).toBe('Traditional agency growth relies on expanding staff headcount.');
        expect(p.stats[0].figure).toBe('THIN');
        const phrases = { cells: [{ a: 'Hourly fees' }, { a: 'Design-led builds take months' }] };
        expect(harmonizeSiblingPeriods(phrases)).toBe(phrases);
    });

    it('the export prints the source labels frozen at generation, even when the live registry cannot resolve them', () => {
        const ptr = 'articles/zz-run43-feed/abc123def0.md#c4';
        const slide: any = { id: 's1', template: 'slides:evidence-table', brand: 'nxt', title: 'x', composerPayload: {
            kicker: 'K', title: 'Agencies bill hours while clients buy outcomes', intro: 'Agencies still bill by the hour.',
            columns: ['Model', 'Pricing', 'Speed', 'Source type'], rows: [{ subject: 'A', prove: 'b', implication: 'c', evidenceGrade: 'News' }],
            sourceLine: `Sources: [${ptr}]` } };
        const key = extractPointers(`[${ptr}]`).pointers[0];
        slide._citeLabels = { ...freezeCitationLabels(slide), [key]: 'Run43 Feed Weekly (Oct 2026)' };
        expect(slideDataToStageHtml(slide)).toContain('Run43 Feed Weekly (Oct 2026)');
    });

    it('a per-slide visualization ask holds every research body slide to a drawing; the redraw splices only those slides', () => {
        const deck = [
            fence('slides:cover', { title: 'T' }),
            fence('slides:means-matters', { title: 'a' }),
            fence('slides:flow-arc', { title: 'b', steps: [] }),
            fence('slides:numbered-themes', { title: 'c', items: [] }),
            fence('slides:quadrant', { title: 'd' }),
            fence('slides:ranked-bars', { title: 'e' }),
            fence('slides:comparison-panels', { title: 'f' }),
        ].join('\n\n');
        const r = evaluateDeckPlan(deck, { drawnFloor: 1 });
        expect(r.violations.some(v => v.includes('carry a DRAWN visual') && v.includes('floor 100%'))).toBe(true);
        const plain = plainResearchFences(deck);
        expect(plain.map(p => p.template)).toEqual(['slides:means-matters', 'slides:numbered-themes', 'slides:comparison-panels']);
        const reply = [
            fence('slides:infographic-exhibit', { title: 'a', nodes: [{ id: 'n1', label: 'x' }, { id: 'n2', label: 'y' }, { id: 'n3', label: 'z' }], edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }] }),
            fence('slides:flow-arc', { title: 'c', steps: [{ title: 's' }, { title: 't' }, { title: 'u' }] }),
            fence('slides:evidence-table', { title: 'f' }),   // not a drawing: the original slide stands
        ].join('\n');
        const s = spliceRedrawnFences(deck, plain, reply);
        expect(s.replaced).toBe(2);
        expect(drawnShare(s.text)).toBeGreaterThan(drawnShare(deck));
        expect(s.text).toContain('slides:comparison-panels');
        expect(s.text).not.toContain('slides:means-matters');
    });

    it('a deck slide carries its per-slide description in the PPTX notes, not on the slide face', () => {
        const html = slideDataToStageHtml({ id: 'n1', template: 'slides:flow-arc', brand: 'nxt', title: 'x', composerPayload: {
            kicker: 'DELIVERY LOOP', title: 'Rules come before agents build', steps: [{ title: 'Architects define rules' }, { title: 'Agents build in branches' }, { title: 'Seniors review money and auth' }],
            speakerNotes: 'The loop traces a change from rules to review.' } } as any);
        expect(html).toContain('<template class="pptx-notes">Workflow visualization: The flow runs in 3 steps');
        expect(html).toContain('The loop traces a change from rules to review.</template>');
        expect(html.split('<template')[0]).not.toContain('The loop traces a change');
    });

    it('run 44: a quote ending a caption keeps one stop; a provider label leaves no comma and no topic phrase in the footer', () => {
        const p = harmonizeSiblingPeriods({ steps: [
            { title: 'a', description: 'An r/agency practitioner: "Now, all your IP needs to be software. Either tools or agents."' },
            { title: 'b', description: 'Named seniors decide on quality and security before release.' },
            { title: 'c', description: 'Faster delivery raises the margin while the bill stays the same.' },
        ] });
        expect(p.steps[0].description.endsWith('agents."')).toBe(true);
        const t = tidyInlineSources({ title: 'x', sourceLine: '(focused research), workforce restructuring findings (engagement research synthesis); gemini (focused research); Synthesis of Zoomsphere, Finalroundai, Bluelinesearch +10 more' });
        expect(t.sourceLine).toBe('Sources: Zoomsphere; Finalroundai; Bluelinesearch');
    });

    it('run 44: an exhibit of two text panels is not a drawing; a flowchart or step flow is', () => {
        expect(isDrawnFence('slides:infographic-exhibit', JSON.stringify({ beforeAfter: { before: { points: ['a'] }, after: { points: ['b'] } } }))).toBe(false);
        expect(isDrawnFence('slides:infographic-exhibit', JSON.stringify({ nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] }))).toBe(true);
        expect(isDrawnFence('slides:infographic-exhibit', JSON.stringify({ steps: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] }))).toBe(true);
        expect(isDrawnFence('slides:quadrant', '{}')).toBe(true);
        expect(isDrawnFence('slides:comparison-panels', '{}')).toBe(false);
    });

    it('run 44: a client account slide on role-recommendation carries no recommendation labels, and every one carries its footer', () => {
        const base = { eyebrow: 'E', title: 'Northeastern moves to a student-service operating model', thesis: 'x', actions: [{ numeral: '01', heading: 'Scope of work', body: 'b' }], impact: [{ label: 'ENGAGEMENT MODEL', headline: 'Fixed fee', body: 'b' }], sourceLine: 'Source: NXT Humans Client Portfolio 2027 Continuity' };
        const own = composeSlide('role-recommendation', { ...base, _provided: true }, 'nxt') as string;
        expect(own).not.toMatch(/SUPPORTING ACTIONS|PROJECTED IMPACT/i);
        expect(own).toContain('NXT Humans Client Portfolio 2027 Continuity');
        const research = composeSlide('role-recommendation', base, 'nxt') as string;
        expect(research).toMatch(/SUPPORTING ACTIONS/i);
    });

    it('run 44: a card glyph names the act or object before the actor', () => {
        expect(candidateBaseIds('Clients get working software in weeks')[0]).not.toBe('customer');
        expect(candidateBaseIds('Students')[0]).toBe('higher-ed:cap');
        expect(candidateBaseIds('Engineers set rules up front')[0]).toBe('governance');
    });

    it('run 45: a quoted band with a source label keeps one stop; a bar note is never cut mid-phrase', () => {
        const items = [
            { label: 'AI-native, top of range', value: 4, note: 'Top AI-native firms generate high revenue per employee' },
            { label: 'AI-native, bottom of range', value: 3, note: 'Bottom-range AI-native firms hold high gross margins as compute and targeted quality assurance (QA) replace salaries' },
            { label: 'Traditional, top of range', value: 2, note: 'Top traditional agencies average lower revenue per employee' },
            { label: 'Traditional, bottom of range', value: 1, note: 'Traditional agencies face lower gross margins when payroll costs represent a large share of delivery expense' },
        ];
        const html = composeSlide('ranked-bars', { kicker: 'K', title: 'Salary-heavy agencies earn less per employee than AI-native firms', bars: items,
            takeaway: { label: 'SO WHAT', statement: '“An AI-native agency can drive more profit than a traditional agency.” (engagement research synthesis)' }, sourceLine: 'Source: Zoomsphere' }, 'nxt') as string;
        expect(html).not.toMatch(/”\./);
        expect(html).toContain('replace salaries');
        expect(html).toContain('share of delivery expense');
    });

    it('run 45: the client\'s own slides take no added glyphs; a model-chosen icon id wins on research cards', () => {
        const items = [{ number: '01', name: 'Scope of work', body: 'b.' }, { number: '02', name: 'Team involved', body: 'b.' }, { number: '03', name: 'What the client is buying', body: 'b.' }, { number: '04', name: '2027 continuity path', body: 'b.' }];
        const own = composeSlide('numbered-themes', { title: 'x', items, _provided: true }, 'nxt') as string;
        expect(own).not.toContain('data:image/svg+xml');
        const p: any = { steps: [{ title: 'Leadership cuts staff', icon: 'risk' }, { title: 'Firms bill unchecked output', icon: 'cost' }, { title: 'Failures surface after handoff', icon: 'incident' }] };
        expect(attachContentTrueIcons('slides:flow-arc', p, 'nxt', 'light')).toBe(3);
        const q: any = { steps: [{ title: 'Leadership cuts staff' }, { title: 'Firms bill unchecked output' }, { title: 'Failures surface after handoff' }] };
        attachContentTrueIcons('slides:flow-arc', q, 'nxt', 'light');
        expect(p.stepIcons[0]).not.toBe(q.stepIcons[0]);
    });

    it('the copy guard keeps a hedged status and refuses a firm one the source does not state', () => {
        expect(copyRewriteVerdict('Benefits Cortex has a draft monthly-capacity SOW', 'Benefits Cortex has a signed monthly-capacity SOW', 'blocks[0].body', '').text).toBeNull();
        expect(copyRewriteVerdict('Growth depends on proposal conversion', 'Growth depends on converting new work', 'body', '').text).toBeNull();
        expect(copyRewriteVerdict('Growth depends on proposal conversion', 'Growth depends on converting the proposals', 'body', '').text).toBe('Growth depends on converting the proposals');
    });
});

describe('run 45 follow-up: every slide carries a visual and a described workflow', () => {
    it('a squashed domain publisher reads as its domain; real names pass through', () => {
        expect(squashedDomainName('Finalroundai', 'https://www.finalroundai.com/blog/x')).toBe('finalroundai.com');
        expect(squashedDomainName('Bluelinesearch', 'https://bluelinesearch.ai/insights/y')).toBe('bluelinesearch.ai');
        expect(squashedDomainName('Business Insider', 'https://www.businessinsider.com/z')).toBe('Business Insider');
        expect(squashedDomainName('Zoomsphere', '')).toBe('Zoomsphere');
    });

    it('a research timeline with unsourced week ranges reads as a sequence; years and quarters stay', () => {
        const ms = (dates: string[]) => dates.map((date, i) => ({ date, title: `Milestone ${i + 1}`, detail: 'd.' }));
        const html = composeSlide('milestone-timeline', { kicker: 'K', title: 'Clients expect working pilots much faster', milestones: ms(['WEEK 2-3', '4-5', '8-10', '13-26']) }, 'nxt') as string;
        expect(html).not.toMatch(/WEEK 2-3|8-10|13-26/);
        expect(html).toContain('FIRST');
        const dated = composeSlide('milestone-timeline', { kicker: 'K', title: 'x', milestones: ms(['Q1 2027', 'H2 2027', '2028']) }, 'nxt') as string;
        expect(dated).toContain('Q1 2027');
        const own = composeSlide('milestone-timeline', { kicker: 'K', title: 'x', _provided: true, milestones: ms(['WEEK 2-3', '4-5', '8-10']) }, 'nxt') as string;
        expect(own).toContain('WEEK 2-3');
    });

    it('speaker notes lead with the drawing unless they already describe it', () => {
        const p = { steps: [{ title: 'Senior leads set rules' }, { title: 'The team builds a pilot' }, { title: 'Reviewers sign off' }] };
        expect(describeVisual('slides:flow-arc', p)).toBe('The flow runs in 3 steps: Senior leads set rules, then The team builds a pilot, then Reviewers sign off.');
        expect(notesWithVisual('flow-arc', p, 'Pricing follows the result.').startsWith('Workflow visualization: The flow runs in 3 steps')).toBe(true);
        const already = 'Senior leads set rules first, the team builds a pilot, and reviewers sign off before release.';
        expect(notesWithVisual('flow-arc', p, already)).toBe(already);
        const fc = { nodes: [{ id: 'a', label: 'Agent opens a pull request', kind: 'input' }, { id: 'b', label: 'Money or auth?', kind: 'decision' }, { id: 'c', label: 'Merge and ship', kind: 'outcome' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] };
        expect(describeVisual('infographic-exhibit', fc)).toBe('The flowchart starts at "Agent opens a pull request" and ends at "Merge and ship" across 3 nodes, branching at "Money or auth?".');
        expect(describeVisual('brief-card', { blocks: [] })).toBe('');
        expect(describeVisual('section-divider', { viz: { labels: ['Agency unit economics', 'Hourly billing'] } })).toBe('The stacked map lists what this section covers, in order: Agency unit economics and Hourly billing.');
        const html = slideDataToStageHtml({ id: 'n', template: 'slides:flow-arc', brand: 'nxt', title: 'x', composerPayload: { kicker: 'K', title: 'Rules come first', ...p } } as any);
        expect(html).toContain('<template class="pptx-notes">Workflow visualization: The flow runs in 3 steps');
    });

    it('a divider without a picture draws a map of its section; the cover maps the deck from the agenda', () => {
        const deck: any[] = [
            { template: 'slides:cover', composerPayload: { title: 'AI-native delivery' } },
            { template: 'slides:agenda', composerPayload: { groups: [{ label: 'The market', items: ['Hourly economics fail', 'Clients buy working software'] }, { label: 'The response', items: ['Governed outcomes'] }] } },
            { template: 'slides:section-divider', composerPayload: { title: 'HOURLY AGENCY ECONOMICS FAIL UNDER AI' } },
            { template: 'slides:ranked-bars', composerPayload: { kicker: 'AGENCY UNIT ECONOMICS' } },
            { template: 'slides:infographic-exhibit', composerPayload: { kicker: 'HOURLY BILLING' } },
            { template: 'slides:section-divider', composerPayload: { title: 'WORK', heroImage: 'data:image/png;base64,AAAA' } },
            { template: 'slides:brief-card', composerPayload: { kicker: '01 | FORTUNE 500 BEAUTY · T&M' } },
            { template: 'slides:brief-card', composerPayload: { kicker: '02 | FINANCIAL SERVICES' } },
        ];
        expect(attachSectionMaps(deck)).toBe(2);
        expect(deck[2].composerPayload.viz).toEqual({ family: 'capabilityStack', labels: ['Agency unit economics', 'Hourly billing'] });
        expect(deck[5].composerPayload.viz).toBeUndefined();   // its photograph stands
        expect(deck[0].composerPayload.viz.labels).toEqual(['Agency unit economics', 'Fortune 500 beauty']);
        const brand: any[] = [
            { template: 'slides:section-divider', composerPayload: { title: 'x' } },
            { template: 'slides:flow-arc', composerPayload: { kicker: 'THE NXT HUMANS OFFER' } },
            { template: 'slides:milestone-timeline', composerPayload: { kicker: 'AI-NATIVE ENGINEERING' } },
        ];
        attachSectionMaps(brand);
        expect(brand[0].composerPayload.viz.labels).toEqual(['The NXT Humans offer', 'AI-native engineering']);
    });
});
