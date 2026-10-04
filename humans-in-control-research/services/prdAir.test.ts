import { describe, it, expect } from 'vitest';
import {
    validatePrdAir, checkTraceIntegrity, deriveTier, applyDerivedTiers, typeUntraceableAsHypothesis,
    scanNakedNumbers, hasNakedNumber, deriveTraceMatrix, usedSources, prdAirToPrdCandidate, buildReadinessChecklist,
    isPrdAir, isRequirementTarget, makeRequirementTarget, PRD_SECTION_ORDER, mustHaveCap,
} from './prdAir';
import { makePrdAirFixture } from './prdAir.fixture';

// Stage 3.1 / 3.4 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md): the one PRD contract,
// its trace-integrity rules, the evidence-derived tiers and the typed-target number rule.
describe('PrdAir contract', () => {
    it('the fixture is a valid, trace-clean record with twelve sections', () => {
        const air = makePrdAirFixture();
        expect(isPrdAir(air)).toBe(true);
        expect(PRD_SECTION_ORDER).toHaveLength(12);
        for (const sec of PRD_SECTION_ORDER) expect(air.sections[sec.key]).toBeTruthy();
        const v = validatePrdAir(air);
        expect(v.errors).toEqual([]);
        expect(v.ok).toBe(true);
        expect(v.traceIntegrity.ok).toBe(true);
        expect(v.traceIntegrity.counts).toEqual({ S: 3, Q: 4, P: 2, T: 2, PE: 2, CG: 1, R: 4, AT: 4, M: 2 });
    });

    it('rejects a record that is not PrdAir', () => {
        const v = validatePrdAir({} as any);
        expect(v.ok).toBe(false);
        expect(v.errors[0]).toMatch(/not a PrdAir/);
    });
});

describe('trace integrity (spec 3.2)', () => {
    it('every Q has exactly one S', () => {
        const air = makePrdAirFixture();
        air.graph.quotes[0].sourceId = 'S-missing';
        const r = checkTraceIntegrity(air);
        expect(r.ok).toBe(false);
        expect(r.violations.some(v => v.rule === 'Q_HAS_ONE_S' && v.nodeId === 'Q-1')).toBe(true);
    });
    it('every P has at least one Q', () => {
        const air = makePrdAirFixture();
        air.graph.pains[1].quoteIds = [];
        const r = checkTraceIntegrity(air);
        expect(r.violations.some(v => v.rule === 'P_HAS_Q' && v.nodeId === 'P-2')).toBe(true);
    });
    it('every R has a root (pain, gap, theme, stated item or feedback) unless typed HYPOTHESIS', () => {
        const air = makePrdAirFixture();
        air.graph.requirements[0].painIds = [];
        air.graph.requirements[0].competitiveGapIds = [];
        air.graph.requirements[0].themeIds = [];
        const r = checkTraceIntegrity(air);
        expect(r.violations.some(v => v.rule === 'R_HAS_ROOT' && v.nodeId === 'R-1')).toBe(true);
        // the HYPOTHESIS requirement with no roots is not a violation
        expect(r.violations.some(v => v.rule === 'R_HAS_ROOT' && v.nodeId === 'R-3')).toBe(false);
    });
    it('every must-have has two independent origins', () => {
        const air = makePrdAirFixture();
        air.graph.requirements[1].tier = 'must';   // R-2 has one origin (Reddit)
        const r = checkTraceIntegrity(air);
        expect(r.violations.some(v => v.rule === 'MUST_HAS_TWO_ORIGINS' && v.nodeId === 'R-2')).toBe(true);
    });
    it('every AT and M points back to a requirement', () => {
        const air = makePrdAirFixture();
        air.graph.acceptanceTests.push({ id: 'AT-9', requirementId: 'R-9', given: 'a', when: 'b', then: 'c' });
        air.graph.signals.push({ ...air.graph.signals[0], id: 'M-9', requirementIds: ['R-9'] });
        const r = checkTraceIntegrity(air);
        expect(r.violations.some(v => v.rule === 'AT_POINTS_TO_R' && v.nodeId === 'AT-9')).toBe(true);
        expect(r.violations.some(v => v.rule === 'M_POINTS_TO_R' && v.nodeId === 'M-9')).toBe(true);
    });
    it('every non-hypothesis R has an acceptance test', () => {
        const air = makePrdAirFixture();
        air.graph.acceptanceTests = air.graph.acceptanceTests.filter(t => t.requirementId !== 'R-2');
        const r = checkTraceIntegrity(air);
        expect(r.violations.some(v => v.rule === 'R_HAS_AT' && v.nodeId === 'R-2' && v.severity === 'error')).toBe(true);
    });
});

describe('evidence-derived prioritization (spec 3.3)', () => {
    it('must requires thesis + Kano + two origins + primary persona + the bar; otherwise should or could', () => {
        const air = makePrdAirFixture();
        expect(deriveTier(air.graph.requirements[0], air).tier).toBe('must');
        expect(deriveTier(air.graph.requirements[1], air).tier).toBe('should');
        expect(deriveTier(air.graph.requirements[2], air).tier).toBe('could');   // HYPOTHESIS never above could
        expect(deriveTier(air.graph.requirements[3], air).tier).toBe('must');
    });
    it('a must-have proposal with one origin derives to should and keeps the proposal', () => {
        const air = makePrdAirFixture();
        const r1 = air.graph.requirements[0];
        r1.painIds = ['P-2'];               // one origin behind P-2
        r1.personaIds = ['PE-1'];
        applyDerivedTiers(air);
        expect(r1.proposedTier).toBe('must');
        expect(r1.tier).toBe('should');
        expect(r1.tierRationale).toMatch(/only one independent source shows the need/);
    });
    it('a wont proposal is never promoted', () => {
        const air = makePrdAirFixture();
        air.graph.requirements[0].proposedTier = 'wont';
        expect(deriveTier(air.graph.requirements[0], air).tier).toBe('wont');
    });
});

describe('HYPOTHESIS typing for untraceable requirements', () => {
    it('a requirement with no pain and no gap becomes a bet, capped at could, and carries a bet', () => {
        const air = makePrdAirFixture();
        air.graph.requirements.push({
            id: 'R-5', text: 'The grower exports the review as a document.', kind: 'functional', tier: 'must', tierRationale: '',
            claimType: 'DEFENSIBLE_INFERENCE', mapsToThesis: true, kano: 'must-be', cagansBar: true,
            painIds: ['P-nope'], competitiveGapIds: [], personaIds: ['PE-1'], themeIds: [], acceptanceTestIds: [], signalIds: [],
        });
        const changed = typeUntraceableAsHypothesis(air);
        expect(changed).toEqual(['R-5']);
        const r5 = air.graph.requirements.find(r => r.id === 'R-5')!;
        expect(r5.claimType).toBe('HYPOTHESIS');
        expect(r5.tier).toBe('could');
        expect(r5.painIds).toEqual([]);
        expect(r5.bet?.conditionWhereAlternativeWins).toBeTruthy();
        // already-typed bets are untouched
        expect(changed).not.toContain('R-3');
    });
});

describe('the number rule (spec 3.5): typed requirement_target is the one exemption', () => {
    it('the fixture carries numbers only inside quotes and typed targets', () => {
        const air = makePrdAirFixture();
        expect(scanNakedNumbers(air)).toEqual([]);
    });
    it('flags a bare figure in prose and leaves quote text, targets, ids, standards and years alone', () => {
        const air = makePrdAirFixture();
        air.sections.thesis.statement = 'Growers lose 40% of their coverage every third season.';
        air.graph.quotes[0].text = 'We lost 30 acres and nobody called.';
        air.graph.requirements[3].target = makeRequirementTarget('review latency', 1.5, 's p95');
        const findings = scanNakedNumbers(air);
        expect(findings).toHaveLength(1);
        expect(findings[0].path).toBe('sections.thesis.statement');
        expect(findings[0].match).toMatch(/40/);
        expect(hasNakedNumber('WCAG 2.2 AA and ISO/IEC 25010:2023 and Article 35')).toBe(false);
        expect(hasNakedNumber('R-1 traces to AT-12 via articles/x/ab12cd.md#c3 since 2024')).toBe(false);
        expect(hasNakedNumber('conversion improved by 15%')).toBe(true);
        expect(hasNakedNumber('$9B annually')).toBe(true);
    });
    it('isRequirementTarget recognizes only the typed carrier', () => {
        expect(isRequirementTarget(makeRequirementTarget('m', 1, 'u'))).toBe(true);
        expect(isRequirementTarget({ metric: 'm', value: 1, unit: 'u' })).toBe(false);
        expect(isRequirementTarget('2 weeks')).toBe(false);
    });
    it('validatePrdAir reports naked numbers as errors', () => {
        const air = makePrdAirFixture();
        air.sections.whyNow.statement = 'Premiums rose 12% last season.';
        const v = validatePrdAir(air);
        expect(v.ok).toBe(false);
        expect(v.errors.some(e => /naked number/.test(e))).toBe(true);
    });
});

describe('derived traceability matrix', () => {
    it('is a view over the graph: one row per requirement, quotes cut at eighty characters, unused sources dropped', () => {
        const air = makePrdAirFixture();
        air.graph.sources.push({ id: 'S-9', name: 'Never cited' });
        air.graph.quotes[0].text = 'This is a deliberately long verbatim sentence from the corpus that keeps going past the eighty character excerpt rule to prove the cut.';
        const rows = deriveTraceMatrix(air);
        expect(rows.map(r => r.requirementId)).toEqual(['R-1', 'R-2', 'R-3', 'R-4']);
        const r1 = rows[0];
        expect(r1.quoteExcerpts.every(q => q.length <= 80)).toBe(true);
        expect(r1.sources).toEqual(expect.arrayContaining(['Agriculture Weekly', 'Coverage review notes']));
        expect(r1.acceptanceTests).toEqual(['AT-1']);
        expect(r1.signals).toEqual(['M-1', 'M-2']);
        expect(rows[2].claimType).toBe('HYPOTHESIS');
        expect(rows[2].pains).toEqual([]);
        expect(usedSources(air).map(s => s.id)).not.toContain('S-9');
        expect(usedSources(air).map(s => s.id)).toEqual(expect.arrayContaining(['S-1', 'S-2', 'S-3']));
    });
});

describe('the #proto bridge (spec 3.6)', () => {
    it('projects PrdAir onto the prd_candidate shape buildPrototype already consumes', () => {
        const c = prdAirToPrdCandidate(makePrdAirFixture());
        expect(c.features).toHaveLength(4);
        expect(c.features.map(f => f.priority)).toEqual(['must', 'should', 'could', 'must']);
        expect(c.features[0].acceptanceCriteria[0]).toMatch(/^Given a renewal is due, when the grower opens the plan, then /);
        expect(c.features[0].citations).toEqual(expect.arrayContaining(['Agriculture Weekly', 'Coverage review notes']));
        expect(c.features[0].evidenceBasis).toMatch(/^"We renew the same thing/);
        expect(c.features[2].evidenceBasis).toMatch(/^NON-OBVIOUS BET/);
        expect(c.features[3].acceptanceCriteria[0]).toMatch(/\(review latency: 2 s p95\)$/);
        expect(c.success_metrics).toHaveLength(2);
        expect(c.success_metrics[0].guardrail).toMatch(/rollback: head of product/);
        expect(c.out_of_scope).toHaveLength(2);
        expect(c.risks[0]).toMatch(/Agents ignore the follow-up queue/);
    });
    it('builds the build-readiness checklist from flows, states, dependencies and the tracking plan', () => {
        const ck = buildReadinessChecklist(makePrdAirFixture());
        expect(ck.statesInventory[0].screen).toBe('Plan review');
        expect(ck.statesInventory[0].states).toContain('degraded provider');
        expect(ck.dataTouchpoints).toHaveLength(2);
        expect(ck.trackingPlan[0].event).toBe('plan_review_opened');
        expect(ck.agentBoundaries).toHaveLength(1);
        expect(ck.featureToScreenSeed).toHaveLength(4);
        expect(ck.featureToScreenSeed[0].flows).toEqual(['Renewal review']);
    });
});

describe('must-have is rare (2026-10-01): at most a third, weakest evidence demoted', () => {
    it('caps derived must-haves at a third of the requirements and keeps the best-evidenced one', () => {
        const air = makePrdAirFixture();
        // R-1 and R-4 both derive to must on four requirements: the cap is one.
        expect(mustHaveCap(4)).toBe(1);
        expect(mustHaveCap(12)).toBe(4);
        expect(mustHaveCap(2)).toBe(1);
        applyDerivedTiers(air);
        const musts = air.graph.requirements.filter(r => r.tier === 'must');
        expect(musts).toHaveLength(1);
        const demoted = air.graph.requirements.find(r => /capped at a third/.test(r.tierRationale));
        expect(demoted?.tier).toBe('should');
        expect(hasNakedNumber(demoted!.tierRationale)).toBe(false);
    });
});
