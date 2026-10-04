/**
 * prdCompilerProvenance: the 2026-10-01 live-replay fixes on the compile side.
 *   - a quote the model cites by a root id that lost its manifest pointer recovers the pointer from a
 *     pointer-carrying evidence item holding the same verbatim text (the system derives it, never the model);
 *   - model prose is normalized in form only (Given/When/Then lead words, restated job-story actors,
 *     id parentheticals, the schema's placeholder target);
 *   - the record carries only the themes it references, with insights narrowed to unnumbered sentences;
 *   - the naked-number rule reads prose, not provenance (source names) or reference-name identity digits.
 */
import { describe, it, expect } from 'vitest';
import { compilePrdAir, type PrdCompilerInputs } from './prdCompiler';
import { scanNakedNumbers, validatePrdAir } from './prdAir';
import { makePrdAirFixture } from './prdAir.fixture';

const THEME_PAGE = 'articles/hic-theme-synthesis/0576b762c2.md#c7';
const BRIEF = 'articles/client-uploads/1888cf18a6.md#c1';
const QUOTE_A = 'Students create their own resources to track their applications because NUworks does not provide it';
const QUOTE_B = 'The product UI must deterministically mirror the established Student Hub design system.';

function inputs(): PrdCompilerInputs {
    return {
        artifactId: 'prd-prov', objective: 'Specify the Experiential Learning Hub', brand: 'nu',
        personas: [
            // the root lost its pointer upstream: quote present, pointer absent
            { id: 'P1', name: 'Co-op Seeking Student', primary: true, stageOfStruggle: 'tracking applications', painPoints: [{ text: 'Students build their own trackers', quote: QUOTE_A, source: 'HiC Theme Synthesis' }] },
            { id: 'P2', name: 'Incoming First-Year Student', primary: false, painPoints: [{ text: 'Co-op crowds out other options' }] },
        ],
        themes: [
            { id: 'T1', name: 'A 360 learner profile is the data-integration spine', insight: 'Records sit in separate systems. Only 40% of students open the portal [articles/x/y.md#c2]. Advisors cannot see one record.', quotes: [{ text: QUOTE_A, source: 'HiC Theme Synthesis', pointer: THEME_PAGE }] },
            { id: 'T2', name: '95% generative AI adoption outpaces official systems', quotes: [] },
            { id: 'T3', name: 'Cluster 38', quotes: [] },
        ],
        journeyPains: [],
        competitiveGaps: [{ id: 'G1', text: 'NUworks shows no application status', competitor: 'NUworks' }],
        evidenceChunks: [
            { id: BRIEF, text: `Design Directive: ${QUOTE_B} Adopting it keeps trust.`, sources: [{ n: 'Northeastern Student 360 Product Brief (1).pdf' }] },
            { id: 'articles/cached-reuse-sow012-nxt-humans-nu-dashboard-fina/68a29b3589.md#c1', text: 'SOW012 covers the dashboard engagement and its acceptance window.', sources: [{ n: 'Cached reuse: SOW012_NXT_Humans_NU_Dashboard' }] },
        ],
    };
}

const DRAFT = {
    title: 'Northeastern should build the Hub as a layer over existing systems (P1).',
    thesis: { statement: 'Students track applications by hand. Approve the first phase.', user: 'The co-op seeking student (P1) is the primary user; the first-year student (P2) is secondary.', pain: 'Students rebuild trackers by hand.', decisionRequested: 'Approve the first phase', whatItDoes: 'Shows next steps and status', governingThemeId: 'T1' },
    problem: { story: { user: 'A co-op student', need: 'One place for status', insight: 'Students rebuild trackers' }, quotes: [
        { text: QUOTE_A, evidenceId: 'P1.pain.0' },
        { text: QUOTE_B, evidenceId: BRIEF },
    ] },
    whyNow: { statement: 'The Hub consolidates now.', change: 'Student Hub consolidation', quotes: [] },
    usersAndJobs: { primaryPersonaIds: ['P1'], jobStories: [{ id: 'JS-1', personaId: 'P1', when: 'When the student has applications open in NUworks and on outside job sites.', iWantTo: 'The student wants to see the status of every application in one place.', soICan: 'The student can decide where to follow up.', quotes: [{ text: QUOTE_A, evidenceId: 'P1.pain.0' }] }] },
    goalsNonGoalsAppetite: { goals: [{ text: 'Status in one view', measurable: true }], nonGoals: [{ text: 'Employer features', reason: 'out of the contracted phase' }], appetite: { value: 12, unit: 'weeks', rationale: 'the contracted window' } },
    pains: [{ id: 'P-1', text: 'Students rebuild trackers by hand', kind: 'pain', quotes: [{ text: QUOTE_A, evidenceId: 'P1.pain.0' }], personaIds: ['P1'], themeIds: ['T1'] }],
    competitiveGapQuotes: [],
    requirements: [{ id: 'R-1', text: 'A student sees every application status in one place.', kind: 'functional', proposedTier: 'must', tierRationale: 'core', mapsToThesis: true, kano: 'must-be', cagansBar: true, painIds: ['P-1'], competitiveGapIds: ['G1'], personaIds: ['P1'], themeIds: ['T1'],
        bet: { statement: '', test: '', conditionWhereAlternativeWins: '' },
        acceptanceTests: [
            { id: 'AT-1', given: 'Given a student has submitted an application through NUworks', when: 'When the status changes', then: 'Then the student sees the new status.', target: { metric: 'status propagation delay', value: 24, unit: 'hours maximum' } },
            { id: 'AT-2', given: 'Given NUworks is unavailable', when: 'When the student opens the list', then: 'Then each application shows its last known status', target: { metric: '', value: 0, unit: '' } },
        ] }],
    signals: [
        { id: 'M-1', signal: 'status_viewed', instrument: 'events', population: { personaId: 'P1', stage: 'tracking' }, direction: 'up', baselineStatus: 'to be measured by the analyst by the pilot close', type: 'leading', guardrail: { statement: 'support tickets do not rise', rollbackAuthority: 'product owner' }, requirementIds: ['R-1'] },
        { id: 'M-2', signal: 'tracker_abandoned', instrument: 'survey', population: { personaId: 'P1', stage: 'tracking' }, direction: 'down', baselineStatus: 'to be measured by the analyst by the pilot close', type: 'lagging', guardrail: { statement: 'completion holds', rollbackAuthority: 'product owner' }, requirementIds: ['R-1'] },
    ],
    hypotheses: { assumptions: [] },
    solutionFlows: { flows: [], screenStates: [], businessRules: [] },
    quality: { characteristics: [], accessibility: { level: 'WCAG 2.2 AA', exposedCriteria: [] }, privacy: { dataMinimization: 'Reads only named fields.', dpiaTrigger: { triggered: false, reason: '' } } },
    risks: { register: [], alternatives: [] },
    delivery: { releaseCriteria: [], rollout: [], trackingPlan: [], dependencies: [], openQuestions: [], accountableApprover: 'Product owner' },
};

describe('compilePrdAir provenance recovery', () => {
    const { air, report } = compilePrdAir(JSON.stringify(DRAFT), inputs());
    const qa = air.graph.quotes.find(q => q.text === QUOTE_A)!;
    const qb = air.graph.quotes.find(q => q.text === QUOTE_B)!;

    it('a root quote without a pointer takes the pointer of the theme quote holding the same verbatim text', () => {
        expect(qa.pointer).toBe(THEME_PAGE);
        expect(report.parseWarnings.some(w => /manifest pointer recovered by verbatim match/.test(w))).toBe(true);
        // the source is the page the pointer resolves to, not the pointer-less root's label
        const src = air.graph.sources.find(s => s.id === qa.sourceId)!;
        expect(src.pointer).toBe(THEME_PAGE.replace(/#c\d+$/, ''));
    });

    it('a quote cited by its chunk id keeps that chunk pointer', () => {
        expect(qb.pointer).toBe(BRIEF);
    });

    it('a quote found in no pointer-carrying item keeps its evidence id (it renders without a citation)', () => {
        const inp = inputs();
        inp.themes[0].quotes[0].pointer = undefined;
        const r = compilePrdAir(JSON.stringify(DRAFT), inp);
        expect(r.air.graph.quotes.find(q => q.text === QUOTE_A)!.pointer).not.toMatch(/\.md#c\d+$/);
    });
});

describe('compilePrdAir form normalizers', () => {
    const { air } = compilePrdAir(JSON.stringify(DRAFT), inputs());

    it('acceptance-test clauses lose the lead keyword the projection adds and their closing period', () => {
        const at = air.graph.acceptanceTests.find(t => t.id === 'AT-1')!;
        expect(at.given).toBe('a student has submitted an application through NUworks');
        expect(at.when).toBe('the status changes');
        expect(at.then).toBe('the student sees the new status');
    });

    it('the schema placeholder target ({ metric: "", value: 0, unit: "" }) is not a target', () => {
        expect(air.graph.acceptanceTests.find(t => t.id === 'AT-2')!.target).toBeUndefined();
        expect(air.graph.acceptanceTests.find(t => t.id === 'AT-1')!.target?.value).toBe(24);
    });

    it('job-story clauses drop the keyword and the restated actor so the Klement form reads once', () => {
        const j = air.sections.usersAndJobs.jobStories[0];
        expect(j.when).toBe('the student has applications open in NUworks and on outside job sites');
        expect(j.iWantTo).toBe('see the status of every application in one place');
        expect(j.soICan).toBe('decide where to follow up');
        // a noun object ("wants an answer") reads as "I want to get an answer", never "I want to The student wants"
        const d2 = JSON.parse(JSON.stringify(DRAFT));
        d2.usersAndJobs.jobStories[0].iWantTo = 'The student wants an answer from official content immediately.';
        const j2 = compilePrdAir(JSON.stringify(d2), inputs()).air.sections.usersAndJobs.jobStories[0];
        expect(j2.iWantTo).toBe('get an answer from official content immediately');
    });

    it('id parentheticals are stripped from prose and the title, ids stay in id fields', () => {
        expect(air.sections.thesis.user).toBe('The co-op seeking student is the primary user; the first-year student is secondary.');
        expect(air.title).toBe('Northeastern should build the Hub as a layer over existing systems.');
        expect(air.sections.usersAndJobs.primaryPersonaIds).toEqual(['P1']);
    });

    it('an empty bet object does not turn a rooted requirement into a bet', () => {
        expect(air.graph.requirements[0].claimType).not.toBe('HYPOTHESIS');
        expect(air.graph.requirements[0].bet).toBeUndefined();
    });
});

describe('theme references and the naked-number rule', () => {
    const { air, report } = compilePrdAir(JSON.stringify(DRAFT), inputs());

    it('the record carries only referenced themes', () => {
        expect(air.graph.themes.map(t => t.id)).toEqual(['T1']);
    });

    it('a theme insight keeps only its sentences without a naked number, and drops inline pointers', () => {
        expect(air.graph.themes[0].insight).toBe('Records sit in separate systems. Advisors cannot see one record.');
    });

    it('source names with digits (document and SOW names) are provenance, not claims', () => {
        expect(air.graph.sources.some(s => /\d/.test(s.name))).toBe(true);
        expect(report.validation.errors.filter(e => /graph\.sources\./.test(e))).toEqual([]);
        expect(report.validation.errors.filter(e => /naked number/.test(e))).toEqual([]);
    });

    it('reference names keep identity digits but a quantity in a name is still flagged; prose digits are still flagged', () => {
        const fx = makePrdAirFixture();
        fx.graph.themes.push({ id: 'T-9', name: 'A 360 learner profile is the spine' }, { id: 'T-8', name: 'Cluster 38' }, { id: 'T-7', name: '95% generative AI adoption outpaces official systems' }, { id: 'T-6', name: 'Federal funding gates on placement within 180 days' });
        fx.graph.sources.push({ id: 'S-9', name: 'Cached reuse: SOW014_NXT_Humans_NU_Student_AI_Companion', kind: 'upload' });
        fx.sections.thesis.user = 'Students apply to 50 roles';
        const findings = scanNakedNumbers(fx).map(f => `${f.path}:${f.match}`);
        expect(findings.some(f => f.startsWith('graph.themes.2.'))).toBe(false);    // T-9 "360"
        expect(findings.some(f => f.startsWith('graph.themes.3.'))).toBe(false);    // "Cluster 38"
        expect(findings.some(f => f.startsWith('graph.themes.4.name'))).toBe(true); // "95%"
        expect(findings.some(f => f.startsWith('graph.themes.5.name'))).toBe(true); // "180 days"
        expect(findings.some(f => f.startsWith('graph.sources.'))).toBe(false);
        expect(findings).toContain('sections.thesis.user:50');
        // quote text stays exempt
        expect(validatePrdAir(makePrdAirFixture()).nakedNumbers).toEqual([]);
    });
});
