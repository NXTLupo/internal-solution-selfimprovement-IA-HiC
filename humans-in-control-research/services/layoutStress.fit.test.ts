/** 2026-10-23 (live out9 defects): stress payloads for the archetypes that overflowed; renders to ARCHETYPE_RENDER_DIR. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide, tidyInlineSources } from './slideComposer';

const SRC = ' (Source: OpenAI Blog)';
const STRESS: Record<string, any> = {
    'comparison-panels': {
        kicker: 'ONE HUB VERSUS SEPARATE CHANNELS',
        title: 'A shared hub replaces separate tracking channels for student guidance across advisors and employers',
        criteria: ['Where status lives', 'Who sees it', 'Hand-off cost', 'Evidence of progress'],
        panels: [
            { name: 'Email and spreadsheets', cells: ['In each advisor\'s inbox and a shared sheet nobody refreshes' + SRC, 'The advisor only', 'Every hand-off is a re-typed summary', 'None until the deadline'] },
            { name: 'Department portal', cells: ['In the department system, behind a login students rarely use', 'Advisors and some staff', 'A ticket per hand-off', 'Monthly reports'] },
            { name: 'Shared readiness hub', cells: ['In one record every party updates' + SRC, 'Students, advisors and employers', 'None: the record travels', 'Weekly, visible to the student'] },
        ],
        takeaway: { label: 'SO WHAT', statement: 'One shared record removes every re-typed hand-off the other two channels require.' },
        sourceLine: 'Sources: OpenAI Blog (May 2026); webflow blog; (Source: webflow blog); OpenAI Blog',
        sceneImage: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="1536" height="1024" fill="#4a5a62"/></svg>'),
    },
    'aggregate-roadmap': {
        eyebrow: 'PILOT TO DEFAULT',
        title: 'Pilot the hub with selected cohorts before expanding access to every first-year student',
        horizons: ['FOCUS', 'PROVE', 'EXPAND', 'DEFAULT'],
        roles: [
            { name: 'Students', cells: ['Two cohorts record readiness steps weekly in the hub' + SRC, 'Readiness record reviewed before each co-op application window', 'Every first-year student has a record', 'The record is the application'] },
            { name: 'Advisors', cells: ['Advisors in the pilot colleges replace email check-ins with the record', 'Blockers and owners visible before each check-in', 'All advising offices on the hub', 'Advising load measured from the record'] },
            { name: 'Employers', cells: ['Three partner employers receive structured requests', 'Submission steps standard across partners', 'All partners onboarded', 'Employer feedback written back into the record'] },
            { name: 'NXT Humans', cells: ['Workflow and record schema defined with the pilot colleges', 'Metrics and owners defined (Source: OpenAI Blog)', 'Hand-off to the university product team', 'Quarterly review of the operating model'] },
        ],
        sourceLine: 'Source: rollout plan working session',
    },
    'org-model': {
        eyebrow: 'OPERATING MODEL',
        title: 'Multiple groups update sections of the readiness record',
        columns: [
            { name: 'Students', definition: 'Students own the readiness steps, log each completed task and attach the evidence an employer asks for, so the record tells the advisor what is needed from them before the meeting.', teams: { label: 'TEAMS', items: ['First-year cohorts', 'Peer mentors'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['A complete record before the application window', 'Fewer missed deadlines'] } },
            { name: 'Advisors', definition: 'Advisors review the record weekly, like the client "homework" in an embedded delivery, resolve blockers and confirm readiness, while the hub handles reminders and status so the advisor time goes to judgment calls.', teams: { label: 'TEAMS', items: ['College advising offices', 'Co-op coordinators'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['Blockers cleared within the week', 'Consistent readiness decisions'] } },
            { name: 'Employers', definition: 'Employers post structured requests and read the readiness record, which shapes interfaces to each job so the student knows exactly what to submit and when.', teams: { label: 'TEAMS', items: ['Partner employers', 'Hiring managers'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['Complete submissions first time', 'Faster interview scheduling'] } },
        ],
    },
    'block-quote': {
        topicKicker: 'GUIDANCE IS THE PRODUCT',
        quote: 'The real value of the counselor is not in the results. It is in making the process easier and avoiding pitfalls.',
        attributionName: 'reddit-deep: r/applyingtocollege: Should I hire a private college counselor? Looking for affordable options under $6k',
        attributionRole: 'Reddit-deep: r/applyingtocollege: Should I hire a private college counselor? Looking for affordable options under $6k',
        corroborating: [
            { figure: 'On track', label: 'Just having someone else to keep you on track can add value.', source: 'Webflow blog; webflow blog (Sep 2026)' },
            { figure: 'Milestones', label: 'A shared workflow shows clients how projects move through key milestones.; Reddit Deep: r/consulting (Apr 2026)', source: 'OpenAI Blog; OpenAI Blog (May 2026)' },
            { figure: 'Owners', label: 'RingCentral PMO walks in with blockers, owners, and actions already defined', source: 'OpenAI Blog' },
        ],
        sourceLine: 'Sources: reddit-deep: r/applyingtocollege: Should I hire a private college counselor?; webflow blog; OpenAI Blog',
    },
    'milestone-timeline': {
        kicker: 'PILOT PLAN', title: 'The project team tests the hub before adding programs',
        intro: 'Two cohorts and three partner employers run the full weekly cycle before any other program joins.',
        milestones: [
            { date: 'WEEKS 1-2', title: 'Agree the readiness checklist', detail: 'Advisors and employers define what ready means' },
            { date: 'WEEKS 3-4', title: 'Launch with one cohort', detail: 'Students receive regular tasks in the hub' },
            { date: 'WEEKS 5-10', title: 'Run weekly advisor sessions', detail: 'Advisors clear flagged blockers every week' },
            { date: 'WEEK 12', title: 'Decide on expansion', detail: 'Compare cohort readiness with last year' },
        ],
        takeaway: { label: 'SO WHAT', statement: 'Twelve weeks with one cohort settle the workflow before any other program depends on it.' },
        sourceLine: 'Source: AWS ML Blog; aws ml blog (Oct 2026)',
    },
    'problem-diptych': {
        eyebrow: 'OUR PERSPECTIVE',
        title: 'Hand-offs between working groups create project delays',
        subhead: 'The same three-party shape appears in every analog.',
        cards: [
            { numeral: '01', heading: 'Separate channels', body: 'A student, an advisor and an employer coordinating by email has the same three-party shape as a client, an agency and a contractor: each party waits on a summary the other two never see, and the delay compounds at every hand-off.' },
            { numeral: '02', heading: 'One shared record', body: 'When the record travels with the student, the advisor opens the check-in already knowing the blockers and the employer reads the same page.' },
        ],
    },
};

it('stress payloads compose and the inline sources are collected on the source line', () => {
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    for (const [k, pay] of Object.entries(STRESS)) {
        const html = composeSlide(k, JSON.parse(JSON.stringify(pay)), 'nxt') as string;
        expect(html, k).toBeTruthy();
        expect(html, k).not.toMatch(/\(Source: /);
        if (dir) fs.writeFileSync(path.join(dir, `stress-${k}.html`), html);
    }
    const org = composeSlide('org-model', JSON.parse(JSON.stringify(STRESS['org-model'])), 'nxt') as string;
    expect(org).toMatch(/client (?:&quot;|["“])homework(?:&quot;|["”]) in/);
    const tidy = tidyInlineSources(STRESS['comparison-panels']);
    expect(tidy.sourceLine).toBe('Sources: OpenAI Blog (May 2026); Webflow Blog');   // lowercase feed names print title-cased (2026-10-27)
    expect(tidy.panels[0].cells[0]).toBe('In each advisor’s inbox and a shared sheet nobody refreshes')   // apostrophes render typographic (2026-10-26);
    const bq = tidyInlineSources(STRESS['block-quote']);
    expect(bq.attributionRole).toBe('');
    expect(bq.corroborating[0].source).toBe('Webflow blog');
    expect(bq.corroborating[1].label).toBe('A shared workflow shows clients how projects move through key milestones. Reddit Deep: r/consulting (Apr 2026)');
    const mt = tidyInlineSources(STRESS['milestone-timeline']);
    expect(mt.sourceLine).toBe('Source: AWS ML Blog');
    expect(tidyInlineSources({ title: 'x', definition: 'like the client"homework"in a delivery' }).definition).toBe('like the client “homework” in a delivery');
    // a variant layout (flow-arc with an outcome band) keeps the header scene (live run 11: the scene was dropped)
    const fa = composeSlide('flow-arc', { kicker: 'K', title: 'Four hand-offs carry a student to placement', outcome: 'Placement confirmed on the record.',
        steps: [1, 2, 3, 4].map(n => ({ title: `Step ${n}`, description: 'A complete sentence that names the actor and the mechanism.' })),
        sceneImage: STRESS['comparison-panels'].sceneImage }, 'nxt') as string;
    expect(fa).toContain('OUTCOME');
    expect((fa.match(/<img /g) || []).length).toBeGreaterThanOrEqual(1);
    // one spelling per source, and quotes glued on either side
    expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: AWS Machine Learning Blog; aws ml blog; Reddit Deep: r/freelance; Reddit r/freelance; reddit-deep: r/freelance' }).sourceLine)
        .toBe('Sources: AWS Machine Learning Blog; Reddit r/freelance');
    expect(tidyInlineSources({ title: 'x', body: 'client delays are"a time one", not a technical issue' }).body).toBe('client delays are “a time one”, not a technical issue');
    // the so-what band renders on the exhibit archetypes that have room
    const cp = composeSlide('comparison-panels', JSON.parse(JSON.stringify(STRESS['comparison-panels'])), 'nxt') as string;
    expect(cp).toContain('One shared record removes every re-typed hand-off');
    expect(cp).toContain('SO WHAT');
    // untouched payloads come back by reference
    const plain = { title: 'x', sourceLine: 'Source: One' };
    expect(tidyInlineSources(plain)).toBe(plain);
});
