/** 2026-10-23 (live defect): evidence-table with long subjects and a long column heading must fit its columns. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide } from './slideComposer';

const LONG = {
    kicker: 'CROSS-INDUSTRY ANALOGS',
    title: 'Analogs show shared workflows simplify cross-team hand-offs',
    intro: 'Analogs from enterprise programs, web operations, and consulting show shared platforms with role-specific views and clear next steps.',
    columns: ['ANALOG', 'WHAT IT SHOWS', 'LESSON FOR THE CO-OP HUB', 'EVIDENCE'],
    rows: [
        { subject: 'RingCentral PMO (enterprise program management)', prove: 'Replaced scattered notes and chat history with AI workflows for status tracking (Source: OpenAI Blog)', implication: 'Advisors start each check-in already knowing the blockers and owners.', evidenceGrade: 'Primary case study', featured: true },
        { subject: 'Webflow Source (marketing web operations)', prove: 'Offers shared workspaces for team members', implication: 'Students, advisors and employers each get a view built for their own task.', evidenceGrade: 'Vendor announcement', featured: true },
        { subject: 'Independent Salesforce consulting', prove: 'Clients report frustration when waiting on isolated build processes', implication: 'Students see their readiness grow week by week instead of at the deadline.', evidenceGrade: 'Practitioner account' },
        { subject: 'Freelance web design workflow', prove: 'A reusable workflow tells clients exactly what you need from them (Source: webflow blog)', implication: 'Employers receive structured requests with clear submission steps.', evidenceGrade: 'Practitioner guide' },
        { subject: 'Freelance designer content delays', prove: 'Clients sometimes hold up progress by withholding content or approvals', implication: 'The hub has to chase missing inputs, not just store finished ones.', evidenceGrade: 'Practitioner account' },
        { subject: 'Agency retainer operations', prove: 'Retainers fail when the scope is not visible to both sides', implication: 'The hub publishes the scope of each placement to every party.', evidenceGrade: 'Practitioner guide' },
    ],
    takeaway: { label: 'PEER PATTERN', statement: 'Shared platforms with role-specific views remove the hand-off gaps every analog describes.' },
    sourceLine: 'Sources: OpenAI Blog; Webflow blog; practitioner accounts',
    sceneImage: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="1536" height="1024" fill="#4a5a62"/></svg>'),
};

it('long subjects shrink to their column and the long heading stays on one line', () => {
    const html = composeSlide('evidence-table', JSON.parse(JSON.stringify(LONG)), 'nxt') as string;
    expect(html).toBeTruthy();
    // the three-line subject is fitted below the 24 px heading size
    const subjectCell = html.split('RingCentral PMO')[0].split('<div').pop() || '';
    const size = Number((subjectCell.match(/font-size:(\d+(?:\.\d+)?)px/) || [])[1]);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(24);
    // the long heading is fitted (shrunk) rather than wrapped
    const headCell = html.split('LESSON FOR THE ')[0].split('<div').pop() || '';   // "CO-OP" rides a nowrap span (2026-10-26)
    expect(headCell).toMatch(/font-size:(1[0-7])(?:\.\d+)?px/);
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    if (dir) fs.writeFileSync(path.join(dir, 'evidence-table-long.html'), html);
});
