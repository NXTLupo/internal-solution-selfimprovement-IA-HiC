import { describe, it, expect } from 'vitest';
import { normalizeSlideShape } from './slideShapeNormalizer';
import { slideDataToStageHtml } from './slideToStageHtml';

describe('normalizeSlideShape', () => {
    it('maps a phases/actors journey onto stages/lanes so the export renders it (live #journey "No journey stages.")', () => {
        const slide: any = normalizeSlideShape({
            title: 'Students meet their advisor after readiness should have started',
            journeyMap: {
                phases: ['Orientation (Sept)', 'Exploration (Nov)', 'Preparation (Jan)', 'Advising (March)'],
                actors: [
                    { name: 'The Unaimed Starter', role: 'First-Year Student', cells: ['Finds resources', 'Explores clubs', 'Drafts a resume', 'Shares a summary'] },
                    { name: 'Co-op Advisors', role: 'Advising Staff', cells: ['Not engaged', 'Not engaged', 'Not engaged', 'Reviews the summary'] },
                ],
                painPoints: [['Fragmented portals'], ['No advisor yet'], ['Guessing keywords'], ['Intake repeats']],
            },
        });
        expect(slide.journeyMap.stages.map((s: any) => s.name)).toEqual(['Orientation (Sept)', 'Exploration (Nov)', 'Preparation (Jan)', 'Advising (March)']);
        expect(slide.journeyMap.lanes[0]).toEqual({ actor: 'The Unaimed Starter', role: 'First-Year Student', cells: ['Finds resources', 'Explores clubs', 'Drafts a resume', 'Shares a summary'] });
        const html = slideDataToStageHtml({ ...slide, id: 's1', template: 'journey-map', brand: 'nxt' } as any);
        expect(html).not.toMatch(/No journey stages/);
        expect(html).toMatch(/Orientation/);
    });

    it('renders a journey written under serviceBlueprint on the journey-map template (live payload shape)', () => {
        const live: any = {
            id: 's2', template: 'journey-map', brand: 'nxt', title: 'Students navigate multiple disconnected platforms to prepare for co-op',
            serviceBlueprint: { stages: [
                { name: 'Onboarding & Discovery', summary: 'Students struggle to navigate fragmented resources.', pain: 'No assigned co-op advisor in the first year.', emotion: 'Anxious', intensity: 65 },
                { name: 'Skill & Profile Building', summary: 'Students join clubs and project courses.', pain: 'Difficulty translating theory to practice.', emotion: 'Determined', intensity: 50 },
                { name: 'Readiness Assessment', summary: 'Students identify skill gaps.', pain: 'The CLR pilot delays competency tracking.', emotion: 'Skeptical', intensity: 70 },
                { name: 'Search & Application Prep', summary: 'Students submit many applications.', pain: 'NUworks lacks application status tracking.', emotion: 'Frustrated', intensity: 85 },
            ] },
        };
        const html = slideDataToStageHtml(live);
        expect(html).not.toMatch(/No journey stages/);
        expect(html).toMatch(/Onboarding/);
        expect(html).toMatch(/No assigned co-op advisor/);
        // a #blueprint slide keeps its blueprint
        expect(normalizeSlideShape({ serviceBlueprint: { stages: [{ name: 'A' }] } }, 'service-blueprint').serviceBlueprint).toBeTruthy();
    });

    it('renders a bare principles array and a title/description recommendation (live blank slides)', () => {
        const pr = slideDataToStageHtml({ id: 'p', template: 'principles', brand: 'nxt', title: 'Integration follows three rules',
            principles: [{ name: 'No Net-New Platforms', description: 'Use existing systems like Microsoft Copilot and Snowflake.' }, { name: 'Graceful Degradation', description: 'Show cached states when a source fails.' }, { name: 'Human-in-the-Loop AI', description: 'Advisors keep the final decision.' }] } as any);
        expect(pr).toMatch(/No Net-New Platforms/);
        expect(pr).toMatch(/Graceful Degradation/);
        const rec = slideDataToStageHtml({ id: 'r', template: 'recommendation', brand: 'nxt', title: 'Advisors shift from administration to coaching',
            recommendation: { title: 'Automate administrative checks and early readiness milestones', description: 'A first-year digital readiness pathway preserves advisor capacity for strategic guidance.', impactLevel: 'critical' } } as any);
        expect(rec).toMatch(/preserves advisor capacity/);
    });

    it('renders live timeline, org-chart and theme-detail payloads with their text (round-5 blanks)', () => {
        const tl = slideDataToStageHtml({ id: 't', template: 'timeline', brand: 'nxt', title: 'A phased roadmap resolves technical constraints',
            timeline: { phases: [{ name: 'Quick Wins', description: 'Deploy the unbranded dashboard container.', pain: 'Student 360 integration delays.' }, { name: 'Tactical', description: 'Integrate academic systems.' }, { name: 'Strategic', description: 'Launch the companion.' }] } } as any);
        expect(tl).toMatch(/Deploy the unbranded dashboard container/);
        const org = slideDataToStageHtml({ id: 'o', template: 'org-chart', brand: 'nxt', title: 'Governance defines roles across ITS and Experiential Learning',
            orgChart: { tiers: [{ name: 'DECIDES', roles: [{ title: 'Chief Information Officer', owner: 'J. Brant-Gargan', description: 'Grants final acceptance.' }] }, { name: 'DELIVERS', roles: [{ title: 'Integration lead', description: 'Maps approved sources.' }] }] } } as any);
        expect(org).toMatch(/Chief Information Officer/);
        expect(org).toMatch(/Grants final acceptance/);
        const td = slideDataToStageHtml({ id: 'd', template: 'theme-detail', brand: 'nxt', title: 'Students must learn to describe their own skills',
            themeCluster: { themes: [{ name: 'Competency Articulation', description: 'Students need help naming the skills they built.', quote: 'Curation and connection of skills to experiences help students build their own vocabulary.', source: 'Symplicity documentation' }] } } as any);
        expect(td).toMatch(/build their own vocabulary/);
        expect(td).toMatch(/naming the skills/);
    });

    it('renders a plural recommendations list and ctext journey cells (round-6 live shapes)', () => {
        const rec = slideDataToStageHtml({ id: 'r2', template: 'recommendation', brand: 'nxt', title: 'Deploy modular Hub features on an interim data plane',
            recommendations: [{ title: '1. Deploy First-Year Pathways', description: 'Implement a lightweight intake assessment to personalize the starting point.' }, { title: '2. Unify Journey State', description: 'Build one next-steps view inside the Student Hub.' }] } as any);
        expect(rec).toMatch(/Deploy First-Year Pathways/);
        expect(rec).toMatch(/lightweight intake assessment/);
        const jm = slideDataToStageHtml({ id: 'j2', template: 'journey-map', brand: 'nxt', title: 'Students navigate multiple digital tools to prepare for co-op',
            journeyMap: { stages: [{ name: 'Exploration' }, { name: 'Skill Building' }, { name: 'Material Prep' }, { name: 'Advisor Engagement' }],
                lanes: [{ actor: 'STUDENT', role: 'first-year undergraduate', cells: [{ ctext: 'Student explores career communities.' }, { ctext: 'Joins clubs and project courses.' }, { ctext: 'Drafts a first resume.' }, { ctext: 'Meets the advisor with a summary.' }] }] } } as any);
        expect(jm).toMatch(/Student explores career communities/);
        expect(jm).not.toMatch(/not engaged/i);
    });

    it('renders an org chart written as top-level decides/directs/delivers (round-7 live "No org tiers.")', () => {
        const html = slideDataToStageHtml({ id: 'o2', template: 'org-chart', brand: 'nxt', title: 'Three-tier governance aligns executives, program management and delivery',
            decides: [{ role: 'Chief Information Officer (CIO)', owner: 'J. Brant-Gargan', responsibility: 'Holds final acceptance authority.' }],
            directs: [{ role: 'ITS Project Delegate', responsibility: 'Coordinates interaction with the build team.' }],
            delivers: [{ role: 'Integration lead', responsibility: 'Maps approved data sources.' }] } as any);
        expect(html).not.toMatch(/No org tiers/);
        expect(html).toMatch(/Chief Information Officer/);
        expect(html).toMatch(/Maps approved data sources/);
    });

    it('renders an unwrapped prose competitive matrix and blueprint *Action lanes (round-8 live)', () => {
        const cm = slideDataToStageHtml({ id: 'c', template: 'competitive-matrix', brand: 'nxt', title: 'The Hub orchestrates readiness while legacy platforms handle postings',
            patternLine: 'Legacy platforms manage the transactional end of the funnel.',
            rowsProse: [{ name: 'Experiential Learning Hub', prove: 'Acts as an orchestration layer inside the Student Hub.', implication: 'Embeds readiness milestones in existing workflows.', tier: 'top' },
                { name: 'Symplicity CSM', prove: 'Provides centralized co-op tracking and transcript curation.', implication: 'Lacks first-year scaffolding.', tier: 'top' },
                { name: 'Handshake', prove: 'Dominates broad job matching and virtual fairs.', implication: 'Starts at the transaction.' }] } as any);
        expect(cm).toMatch(/Symplicity CSM/);
        expect(cm).toMatch(/centralized co-op tracking/);
        const sb = slideDataToStageHtml({ id: 'b', template: 'service-blueprint', brand: 'nxt', title: 'Automated readiness tracking shifts advisor intake to coaching',
            serviceBlueprint: { stages: [1, 2, 3, 4].map(i => ({ phase: `Stage ${i}`, customerAction: `Student does ${i}`, frontstageAction: `Hub shows banner ${i}`, backstageAction: `Data sync ${i}`, supportProcesses: `Snowflake load ${i}` })) } } as any);
        expect(sb).toMatch(/Hub shows banner 1/);
        expect(sb).toMatch(/Data sync 2/);
        expect(sb).toMatch(/Snowflake load 3/);
    });

    it('fills architecture node names from label', () => {
        const slide: any = normalizeSlideShape({ architectureMap: { layers: [{ name: 'Systems of Record', nodes: [{ label: 'Banner SIS', type: 'External' }] }] } });
        expect(slide.architectureMap.layers[0].nodes[0].name).toBe('Banner SIS');
    });

    it('leaves a canonical journey untouched', () => {
        const jm = { stages: [{ name: 'A' }], lanes: [{ actor: 'X', cells: ['c'] }] };
        expect(normalizeSlideShape({ journeyMap: { ...jm } }).journeyMap).toEqual(jm);
    });
});
