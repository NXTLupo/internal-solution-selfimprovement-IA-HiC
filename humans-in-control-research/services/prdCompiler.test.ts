import { describe, it, expect } from 'vitest';
import { buildPrdCompilerPrompt, compilePrdAir, extractJsonObject, quoteIsVerbatim, flattenEvidence, PrdInputsError, readableSourceName, inferPrivacyRegime, compoundOutcome, type PrdCompilerInputs } from './prdCompiler';
import { PRD_SECTION_ORDER } from './prdAir';

// Stage 3.2: typed inputs in, provenance-locked PrdAir out. No model call here; the draft JSON stands in
// for the model's reply.
const WEEKLY = 'articles/agriculture-weekly/ab12cd34ef.md#c3';
const REDDIT = 'social/reddit/r-farming/9f8e7d6c5b.md#c1';

function inputs(over: Partial<PrdCompilerInputs> = {}): PrdCompilerInputs {
    return {
        artifactId: 'prd-test',
        objective: 'Decide whether to build a mid-season coverage review for small-scale growers',
        brand: 'nxt',
        personas: [
            { id: 'PE-1', name: 'The deciding grower', role: 'owner-operator', primary: true, stageOfStruggle: 'renewal', painPoints: [{ text: 'Static plan never revisited', quote: 'We renew the same thing every year because nobody asks what changed.', source: 'Agriculture Weekly', pointer: WEEKLY }] },
            { id: 'PE-2', name: 'The field agent', primary: false, painPoints: [{ text: 'No prompt after a claim closes' }] },
        ],
        themes: [{ id: 'T-1', name: 'Coverage drifts from risk', quotes: [{ text: 'Carriers are re-pricing mid-season for the first time in a decade.', source: 'Agriculture Weekly', pointer: 'articles/agriculture-weekly/ab12cd34ef.md#c5' }] }],
        journeyPains: [{ id: 'JP-1', stage: 'claim', text: 'Silence after the claim', quote: 'My agent has not called since the hail claim.', source: 'Reddit r/farming', pointer: REDDIT, personaIds: ['PE-1'] }],
        competitiveGaps: [{ id: 'CG-1', text: 'Peer carriers offer a mid-season review call', competitor: 'Peer carrier' }],
        evidenceChunks: [
            { id: WEEKLY, text: 'A grower in the panel said: We renew the same thing every year because nobody asks what changed. The agents agreed.', sources: [{ n: 'Agriculture Weekly' }] },
            { id: REDDIT, text: 'My agent has not called since the hail claim. Anyone else?', sources: [{ n: 'Reddit r/farming' }] },
        ],
        ...over,
    };
}

const DRAFT = {
    title: 'Growers decide coverage from a static plan the agent never revisits',
    thesis: { statement: 'The deciding grower renews a plan nobody re-reads. Approve the mid-season review.', user: 'The deciding grower', pain: 'Static plan never revisited', decisionRequested: 'Approve the mid-season coverage review', whatItDoes: 'Re-reads the plan before the quote', governingThemeId: 'T-1' },
    problem: {
        story: { user: 'A small-scale grower renews the same policy every year.', need: 'She needs the plan to change when her risk changes.', insight: 'Growers decide coverage from a static plan the agent never revisits.' },
        quotes: [
            { text: 'We renew the same thing every year because nobody asks what changed.', evidenceId: WEEKLY, attribution: 'Grower interview' },
            { text: 'My agent has not called since the hail claim.', evidenceId: REDDIT },
            { text: 'Nobody in the county trusts the renewal letter anymore.', evidenceId: REDDIT },   // NOT verbatim: dropped
        ],
    },
    whyNow: { statement: 'Carriers now re-price mid-season.', change: 'Mid-season re-pricing', quotes: [{ text: 'Carriers are re-pricing mid-season for the first time in a decade.', evidenceId: 'T-1.q.0' }] },
    usersAndJobs: { primaryPersonaIds: ['PE-1'], jobStories: [{ id: 'JS-1', personaId: 'PE-1', when: 'my renewal notice arrives', iWantTo: 'see what changed on my farm', soICan: 'decide from this year', quotes: [{ text: 'We renew the same thing every year because nobody asks what changed.', evidenceId: WEEKLY }] }] },
    goalsNonGoalsAppetite: { goals: [{ text: 'A season-aware plan before every renewal.', measurable: true }], nonGoals: [{ text: 'Rebuilding the quoting engine', reason: 'the quote is correct' }], appetite: { value: 6, unit: 'weeks', rationale: 'one renewal cycle' } },
    competitiveGapQuotes: [{ gapId: 'CG-1', quotes: [{ text: 'My agent has not called since the hail claim.', evidenceId: REDDIT }] }],
    pains: [
        { id: 'P-1', text: 'Static plan never revisited', kind: 'pain', quotes: [{ text: 'We renew the same thing every year because nobody asks what changed.', evidenceId: WEEKLY }], personaIds: ['PE-1'], themeIds: ['T-1'] },
        { id: 'P-2', text: 'Silence after the claim', kind: 'pain', quotes: [{ text: 'My agent has not called since the hail claim.', evidenceId: REDDIT }], personaIds: ['PE-1', 'PE-2'], themeIds: [] },
        { id: 'P-3', text: 'The renewal letter is distrusted', kind: 'pain', quotes: [{ text: 'Nobody in the county trusts the renewal letter anymore.', evidenceId: REDDIT }], personaIds: ['PE-1'], themeIds: [] },
    ],
    requirements: [
        { id: 'R-1', text: 'The grower sees the plan re-read against the season before renewal.', kind: 'functional', proposedTier: 'must', tierRationale: 'core', mapsToThesis: true, kano: 'must-be', cagansBar: true, painIds: ['P-1'], competitiveGapIds: ['CG-1'], personaIds: ['PE-1'], themeIds: ['T-1'], acceptanceTests: [{ id: 'AT-1', given: 'a renewal is due', when: 'the grower opens the plan', then: 'the prior season review appears before the quote' }] },
        { id: 'R-2', text: 'The agent receives a prompt when a claim closes without a follow-up call.', kind: 'functional', proposedTier: 'must', tierRationale: 'core', mapsToThesis: true, kano: 'one-dimensional', cagansBar: true, painIds: ['P-2'], competitiveGapIds: [], personaIds: ['PE-1'], themeIds: [], acceptanceTests: [{ id: 'AT-2', given: 'a claim closed', when: 'a week passes', then: 'the agent sees the grower in the queue' }] },
        { id: 'R-3', text: 'The renewal letter opens with the season summary.', kind: 'functional', proposedTier: 'should', tierRationale: '', mapsToThesis: true, kano: 'attractive', cagansBar: false, painIds: ['P-3'], competitiveGapIds: [], personaIds: ['PE-1'], themeIds: [], acceptanceTests: [{ id: 'AT-3', given: 'a letter is generated', when: 'the grower opens it', then: 'the summary precedes the quote' }] },
        { id: 'R-4', text: 'The review renders before the quote on a rural connection.', kind: 'non-functional', proposedTier: 'must', tierRationale: '', mapsToThesis: true, kano: 'one-dimensional', cagansBar: true, painIds: ['P-1'], competitiveGapIds: [], personaIds: ['PE-1'], themeIds: ['T-1'], target: { metric: 'review latency', value: 2, unit: 's p95', rationale: 'rural connections are slow in the interviews' }, acceptanceTests: [{ id: 'AT-4', given: 'a rural connection', when: 'the grower opens the review', then: 'it renders before the quote', target: { metric: 'review latency', value: 2, unit: 's p95' } }] },
    ],
    signals: [
        { id: 'M-1', signal: 'plan_review_opened', instrument: 'analytics event', population: { personaId: 'PE-1', stage: 'renewal' }, direction: 'up', baselineStatus: 'to be measured by the product analyst by the first renewal cycle', type: 'leading', guardrail: { statement: 'renewal abandonment does not rise', rollbackAuthority: 'head of product' }, requirementIds: ['R-1', 'R-4'] },
        { id: 'M-2', signal: 'renewal_completed_with_change', instrument: 'policy admin system', population: { personaId: 'PE-1', stage: 'renewal' }, direction: 'up', baselineStatus: 'to be measured by the actuarial lead by the first renewal cycle', type: 'lagging', guardrail: { statement: 'loss ratio holds', rollbackAuthority: 'chief underwriter' }, requirementIds: ['R-1', 'R-2'] },
    ],
    hypotheses: { assumptions: [{ id: 'A-1', text: 'Growers open a review they did not ask for.', quadrant: 'test-now', test: 'pilot group', owner: 'product lead', quotes: [] }] },
    solutionFlows: { flows: [{ jobStoryId: 'JS-1', name: 'Renewal review', steps: ['assemble', 'approve', 'open'] }], screenStates: [{ screen: 'Plan review', states: ['empty', 'loading', 'error'] }], businessRules: ['The agent approves before the grower sees it.'] },
    quality: { characteristics: [{ characteristic: 'performance efficiency', statement: 'Renders before the quote on a rural connection.', target: { metric: 'review latency', value: 2, unit: 's p95' } }], accessibility: { level: 'WCAG 2.2 AA', exposedCriteria: ['focus visible'] }, privacy: { dataMinimization: 'Reads records already held.', dpiaTrigger: { triggered: false, reason: 'no new purpose' } } },
    risks: { register: [{ id: 'RK-1', failureMode: 'Agents ignore the queue', likelihood: 'medium', severity: 'high', earlySignal: 'items age', owner: 'ops lead', mitigation: 'escalate aged items' }], alternatives: [{ option: 'reminder email', rejectedBecause: 'repeats the static plan', tradeoff: 'cheaper, no decision change' }] },
    delivery: { releaseCriteria: ['All must-have tests pass.'], rollout: [{ phase: 'Pilot', gate: 'agents approve drafts', killCriteria: 'abandonment rises', rollbackAuthority: 'head of product' }], trackingPlan: [{ event: 'plan_review_opened', properties: ['persona'], owner: 'analyst' }], dependencies: [{ name: 'Claims API', kind: 'api', owner: 'claims team' }], openQuestions: [{ question: 'Which agencies pilot?', owner: 'ops lead', due: 'before the first renewal cycle' }], accountableApprover: 'Head of product' },
};

describe('buildPrdCompilerPrompt (typed references, never empty arrays)', () => {
    it('refuses to build without evidence roots', () => {
        expect(() => buildPrdCompilerPrompt(inputs({ personas: [], themes: [], journeyPains: [], competitiveGaps: [], evidenceChunks: [] }))).toThrow(PrdInputsError);
        try { buildPrdCompilerPrompt(inputs({ personas: [], themes: [], journeyPains: [], competitiveGaps: [], evidenceChunks: [] })); }
        catch (e: any) { expect(e.missing.length).toBeGreaterThanOrEqual(2); }
    });
    it('names every persona, theme, journey pain, gap and evidence id, and lists the twelve sections', () => {
        const p = buildPrdCompilerPrompt(inputs());
        for (const id of ['PE-1', 'PE-2', 'T-1', 'JP-1', 'CG-1', WEEKLY, REDDIT, 'T-1.q.0', 'PE-1.pain.0']) expect(p.user, id).toContain(id);
        for (const sec of PRD_SECTION_ORDER) expect(p.system).toContain(sec.label);
        expect(p.system).toContain('THE NUMBER RULE');
        expect(p.system).toContain('THE TRACEABILITY MODEL');
        expect(p.system + p.user).not.toContain('—');
        // two chunks + the persona pain quote + the theme quote + the journey pain quote
        expect(p.digest).toEqual({ personas: 2, themes: 1, journeyPains: 1, competitiveGaps: 1, evidenceItems: 5 });
    });
    it('flattens evidence with the source name taken from the chunk, never from the model', () => {
        const ev = flattenEvidence(inputs());
        expect(ev.find(e => e.id === WEEKLY)?.sourceName).toBe('Agriculture Weekly');
        expect(ev.find(e => e.id === 'JP-1.q')?.sourceName).toBe('Reddit r/farming');
        expect(ev.find(e => e.id === 'PE-2.pain.0')).toBeUndefined();   // a pain without a quote is not evidence
    });
});

describe('compilePrdAir (provenance lock, HYPOTHESIS typing, derived tiers)', () => {
    const result = compilePrdAir('```json\n' + JSON.stringify(DRAFT) + '\n```', inputs());
    const { air, report } = result;

    it('extracts fenced JSON', () => {
        expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
        expect(extractJsonObject('Here you go: {"a":{"b":2}} thanks')).toEqual({ a: { b: 2 } });
        expect(() => extractJsonObject('no json here')).toThrow();
    });
    it('verifies quotes verbatim against the evidence shown', () => {
        expect(quoteIsVerbatim('We renew the same thing every year because nobody asks what changed.', 'A grower said: "We renew the same thing every year because nobody asks what changed." Agents agreed.')).toBe(true);
        expect(quoteIsVerbatim('Nobody trusts the renewal letter.', 'My agent has not called since the hail claim.')).toBe(false);
    });
    it('attaches source identity from the evidence item and drops the unverifiable quote', () => {
        expect(report.droppedQuotes).toHaveLength(2);   // once in problem.quotes, once in P-3
        expect(report.droppedQuotes[0].text).toMatch(/^Nobody in the county/);
        const q1 = air.graph.quotes.find(q => q.text.startsWith('We renew'))!;
        expect(q1.pointer).toBe(WEEKLY);
        const s1 = air.graph.sources.find(s => s.id === q1.sourceId)!;
        expect(s1.name).toBe('Agriculture Weekly');
        expect(s1.pointer).toBe('articles/agriculture-weekly/ab12cd34ef.md');
        expect(air.graph.quotes.map(q => q.text)).not.toContain('Nobody in the county trusts the renewal letter anymore.');
        // the same verbatim quote cited twice is one Q
        expect(air.graph.quotes.filter(q => q.text.startsWith('We renew'))).toHaveLength(1);
    });
    it('types the requirement whose only pain lost its quote as HYPOTHESIS and renders it as a bet', () => {
        expect(air.graph.pains.map(p => p.id)).not.toContain('P-3');
        expect(report.hypothesisRequirementIds).toEqual(['R-3']);
        const r3 = air.graph.requirements.find(r => r.id === 'R-3')!;
        expect(r3.claimType).toBe('HYPOTHESIS');
        expect(r3.tier).toBe('could');
        expect(r3.bet?.test).toBeTruthy();
    });
    it('derives tiers from the evidence columns and records the changes', () => {
        const r1 = air.graph.requirements.find(r => r.id === 'R-1')!;
        const r2 = air.graph.requirements.find(r => r.id === 'R-2')!;
        expect(r1.tier).toBe('must');                         // Agriculture Weekly via P-1 + Reddit via CG-1 = two independent origins
        expect(r2.proposedTier).toBe('must');
        expect(r2.tier).toBe('should');                       // one origin (Reddit) behind P-2
        expect(report.tierChanges.some(c => c.id === 'R-2' && c.from === 'must' && c.to === 'should')).toBe(true);
    });
    it('keeps typed targets and reference nodes from the inputs', () => {
        const r4 = air.graph.requirements.find(r => r.id === 'R-4')!;
        expect(r4.target?.kind).toBe('requirement_target');
        expect(r4.target?.value).toBe(2);
        expect(air.sections.goalsNonGoalsAppetite.appetite).toMatchObject({ kind: 'requirement_target', metric: 'appetite', value: 6, unit: 'weeks' });
        expect(air.graph.personas.map(p => p.id)).toEqual(['PE-1', 'PE-2']);
        expect(air.graph.competitiveGaps[0].id).toBe('CG-1');
        expect(air.sections.usersAndJobs.primaryPersonaIds).toEqual(['PE-1']);
        expect(air.graph.acceptanceTests.find(t => t.id === 'AT-4')?.target?.unit).toBe('s p95');
    });
    it('runs the validator and reports no naked numbers for a clean draft', () => {
        expect(report.validation.nakedNumbers).toEqual([]);
        expect(report.validation.traceIntegrity.violations.filter(v => v.severity === 'error')).toEqual([]);
    });
});

// 2026-10-01 consulting-grade pass: the content defects found on the live Northeastern #prd, each pinned
// as a prompt rule AND, where a deterministic check exists, as a compile-time behavior.
describe('compiler prompt: the content rules the live document broke', () => {
    const p = buildPrdCompilerPrompt(inputs());
    it('keeps problem and why-now about the user and the subject, never the product or the engagement', () => {
        expect(p.system).toContain('PROBLEM AND WHY NOW ARE ABOUT THE USER AND THE SUBJECT');
        expect(p.system).toMatch(/never names the product being specified, the engagement, the vendor, a contract, a statement of work or a design document/);
    });
    it('caps must-have, demands singular requirements, sourced or decided rationales, the right privacy regime, roles over unevidenced names, primary over synthesis', () => {
        expect(p.system).toContain('propose must for at most a third of the requirements');
        expect(p.system).toContain('SINGULAR: one outcome per requirement and one observable event per signal');
        expect(p.system).toContain('TARGET RATIONALE');
        expect(p.system).toContain('Never default to GDPR');
        expect(p.system).toContain('FERPA');
        expect(p.system).toContain('PEOPLE: name a person');
        expect(p.system).toContain('EVIDENCE HIERARCHY');
        expect(p.system).not.toMatch(/Article 25|Article 35/);
        expect(p.system + p.user).not.toContain('\u2014');
    });
});

describe('readable source labels (never a path, slug or hash)', () => {
    it('turns file stems, cached-reuse labels, synthesis pages and subreddit slugs into reader labels', () => {
        expect(readableSourceName('Cached reuse: SOW014_Acme_Student_Companion_Final', 'articles/cached-reuse-sow014-acme/ab12cd34ef.md#c2')).toBe('Client document: SOW014 Acme Student Companion');
        expect(readableSourceName('Product Brief (1).pdf')).toBe('Client document: Product Brief');
        expect(readableSourceName('Research_Findings_Clean')).toBe('Client document: Research Findings');
        expect(readableSourceName('Client Uploads', 'articles/client-uploads/ab12cd34ef.md#c1')).toBe('Client document');
        expect(readableSourceName('HiC Theme Synthesis', 'articles/hic-theme-synthesis/00c469fde8.md#c4')).toBe('Engagement research synthesis');
        expect(readableSourceName('reddit-deep: r/cscareerquestions')).toBe('Reddit r/cscareerquestions');
        expect(readableSourceName('labor_market_tracker')).toBe('Labor Market Tracker');
        expect(readableSourceName('Higher Ed Dive')).toBe('Higher Ed Dive');
        expect(readableSourceName('', 'social-intelligence/reddit-deep/edtech/1qxkv3v.md#c0')).toBe('Reddit r/edtech');
    });
});

describe('deterministic content checks at compile time', () => {
    it('flags a requirement or signal that joins two outcomes, and leaves noun lists alone', () => {
        expect(compoundOutcome('The companion offers a route to a human, and records each unanswered intent for review.')).toBeTruthy();
        expect(compoundOutcome('The hub resolves each student to one record and takes each field from its source of truth.')).toBeTruthy();
        expect(compoundOutcome('A first-year student sees clubs, courses and community opportunities beside required tasks.')).toBeNull();
    });
    it('derives the privacy regime from the subject and the evidence, never defaulting to GDPR', () => {
        const usEdu = inferPrivacyRegime('Specify the advising hub for a university co-op program', [{ url: 'https://www.example.edu/coop', text: 'Students apply through the portal.' }]);
        expect(usEdu).toMatch(/^FERPA/);
        expect(inferPrivacyRegime('Specify the advising hub for a university co-op program', [{ text: 'no jurisdiction signal at all' }])).toBe('');
        expect(inferPrivacyRegime('Specify the patient intake flow for a clinic network', [{ url: 'https://health.example.gov/x' }])).toMatch(/^HIPAA/);
    });
    it('demotes must-haves past a third, restates a document-credited rationale, replaces an unevidenced name with the role, and flags a problem that names the solution', () => {
        const draft = JSON.parse(JSON.stringify(DRAFT));
        draft.problem.story.insight = 'The dashboard engagement fixes this in the first phase.';
        draft.goalsNonGoalsAppetite.appetite = { value: 6, unit: 'weeks', rationale: 'The brief sets a six week window.' };
        draft.risks = { register: [{ id: 'RK-1', failureMode: 'Agents ignore the queue', likelihood: 'medium', severity: 'high', earlySignal: 'queue ages', owner: 'Dana Whitfield, Head of Agency Operations', mitigation: 'weekly review' }], alternatives: [] };
        draft.requirements = draft.requirements.map((r: any) => ({ ...r, proposedTier: 'must', mapsToThesis: true, kano: 'must-be', cagansBar: true, painIds: ['P-1', 'P-2'], competitiveGapIds: ['CG-1'], personaIds: ['PE-1'] }));
        const { air, report } = compilePrdAir(JSON.stringify(draft), inputs());
        const n = air.graph.requirements.length;
        expect(air.graph.requirements.filter(r => r.tier === 'must').length).toBeLessThanOrEqual(Math.max(1, Math.floor(n / 3)));
        expect(air.graph.requirements.some(r => /capped at a third/.test(r.tierRationale))).toBe(true);
        expect(report.rationalesRestated.map(x => x.path)).toContain('sections.goalsNonGoalsAppetite.appetite');
        expect(air.sections.goalsNonGoalsAppetite.appetite.rationale).toMatch(/^We set this target/);
        expect(report.namesReplacedByRole).toEqual([{ path: 'sections.risks.register.0.owner', name: 'Dana Whitfield', role: 'Head of Agency Operations' }]);
        expect(air.sections.risks.register[0].owner).toBe('Head of Agency Operations');
        expect(report.problemNamesSolution.map(x => x.field)).toContain('problem.story.insight');
    });
    it('binds a rationale that credits a document the evidence holds to that document\'s pointer', () => {
        const BRIEF = 'articles/client-uploads/bb11cc22dd.md#c2';
        const withBrief = inputs({ evidenceChunks: [...inputs().evidenceChunks, { id: BRIEF, text: 'The initial release covers general program knowledge only.', sources: [{ n: 'Coverage Review Product Brief.pdf' }] }] });
        const draft = JSON.parse(JSON.stringify(DRAFT));
        draft.requirements[3].target = { metric: 'review latency', value: 2, unit: 's p95', rationale: 'The product brief limits the first release.' };
        const { air, report } = compilePrdAir(JSON.stringify(draft), withBrief);
        expect(report.rationalesSourced).toEqual([{ path: 'graph.requirements.3.target', pointer: BRIEF }]);
        expect(air.graph.requirements[3].target?.source_pointer).toBe(BRIEF);
        expect(air.graph.requirements[3].target?.rationale).toBe('The product brief limits the first release.');
        expect(compoundOutcome('application_status_viewed and external_application_recorded')).toBe('application_status_viewed and external_application_recorded');
    });
    it('keeps a name an evidence item carries', () => {
        const draft = JSON.parse(JSON.stringify(DRAFT));
        draft.risks = { register: [{ id: 'RK-1', failureMode: 'Agents ignore the queue', likelihood: 'medium', severity: 'high', earlySignal: 'queue ages', owner: 'Dana Whitfield, Head of Agency Operations', mitigation: 'weekly review' }], alternatives: [] };
        const withName = inputs({ evidenceChunks: [...inputs().evidenceChunks, { id: 'articles/agency-memo/aa11bb22cc.md#c0', text: 'Dana Whitfield runs agency operations for the region.', sources: [{ n: 'Agency memo' }] }] });
        const { air, report } = compilePrdAir(JSON.stringify(draft), withName);
        expect(report.namesReplacedByRole).toEqual([]);
        expect(air.sections.risks.register[0].owner).toBe('Dana Whitfield, Head of Agency Operations');
    });
    it('re-points a quote found in a derived synthesis page to the primary chunk that carries the same verbatim text', () => {
        const SYN = 'articles/hic-theme-synthesis/00c469fde8.md#c4';
        const withSynthesis = inputs({
            themes: [{ id: 'T-1', name: 'Coverage drifts from risk', quotes: [{ text: 'We renew the same thing every year because nobody asks what changed.', source: 'HiC Theme Synthesis', pointer: SYN }] }],
            evidenceChunks: [{ id: SYN, text: 'Theme one. We renew the same thing every year because nobody asks what changed.', sources: [{ n: 'HiC Theme Synthesis' }] }, ...inputs().evidenceChunks],
        });
        const draft = JSON.parse(JSON.stringify(DRAFT));
        draft.pains[0].quotes = [{ text: 'We renew the same thing every year because nobody asks what changed.', evidenceId: 'T-1.q.0' }];
        const { air, report } = compilePrdAir(JSON.stringify(draft), withSynthesis);
        const q = air.graph.quotes.find(x => x.text.startsWith('We renew'))!;
        expect(q.pointer).toBe(WEEKLY);
        expect(report.repointedToPrimary.length).toBeGreaterThan(0);
        expect(air.graph.sources.find(s => s.id === q.sourceId)?.name).toBe('Agriculture Weekly');
    });
});
