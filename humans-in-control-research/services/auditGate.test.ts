/**
 * auditGate.test.ts (2026-07-08 critique-rigor P2, item 31)
 *
 * The nine taxonomy fixtures from reasoning-runbook.md seeded against the PURE gate
 * invariants, plus collapseAndScore units and the Critic kill-only assertion. These pin
 * the STRUCTURAL contract (severity mapping, subsumption, advisory discipline, nav,
 * fidelity floor, content parity, standard scoping, preserve, framing) - the layer the
 * rounds-1-3 cosmetic tests never touched.
 */

import { describe, it, expect } from 'vitest';
import {
    assembleAuditGate, checkSeverityMapped, checkSubsumption, checkAdvisoryDiscipline,
    checkNavFlagged, checkFloor, checkContentParity, checkStandardScope, checkPreserve,
    checkFraming, gateToMarkdown, severityLabel, type ScreenFidelity,
} from './auditGate';
import { collapseAndScore, applyCriticActions, type CriticAction } from './heuristicAnalysisService';
import type { HeuristicFinding, HeuristicScreenSummary } from '../types';

const finding = (over: Partial<HeuristicFinding>): HeuristicFinding => ({
    id: 'f1', dimension: 'traditional_usability', screenshotRefs: [1], severity: 2,
    confidence: 'HIGH', title: 'Buttons are too faint to read',
    description: 'Visitors miss the main action because the button label fades into the background.',
    recommendation: 'Darken button labels to charcoal',
    severity_basis: 'every visitor; blocks the quote task; persists site-wide',
    evidenceKind: 'dom', subcategory: 'Heuristic 8: Aesthetic design',
    ...over,
});

const summary = (over: Partial<HeuristicScreenSummary>): HeuristicScreenSummary => ({
    screenshot: 1, verdict: 'Strong stats undermined by a missing next step',
    preserve: ['The three sourced statistics'], non_issues: ['Body text passes contrast'],
    proposedSections: [
        { pattern: 'nav-bar', label: 'Farm Risk Ready', items: ['Overview', 'Risk score'], cta: 'Check my risk' },
        { pattern: 'hero', label: 'Know your farm risk before the season does', items: ['Check flood and drought risk', 'Check my farm risk'] },
        { pattern: 'kpi-row', label: 'The numbers', items: ['Agricultural losses'], values: ['$3.8T'], subs: ['three sourced statistics'] },
    ],
    ...over,
});

const goodFidelity: ScreenFidelity = {
    components: 1, nav: 1, primary_action: 1,
    bound_slots: 6, sample_slots: 0, content_ratio: 1, unknown_patterns: [],
};

describe('taxonomy fixture 1 (R7): severity without a basis', () => {
    it('flags a finding missing severity_basis', () => {
        const r = checkSeverityMapped([finding({ severity_basis: '' })]);
        expect(r.pass).toBe(false);
        expect(r.violations[0].code).toBe('SEVERITY-UNMAPPED');
    });
    it('flags a non-integer severity', () => {
        const r = checkSeverityMapped([finding({ severity: 2.5 as any })]);
        expect(r.pass).toBe(false);
    });
    it('derives labels from the one map', () => {
        expect(severityLabel(4)).toBe('Blocking');
        expect(severityLabel(1)).toBe('Cosmetic');
    });
});

describe('taxonomy fixture 2 (R8): subsumption - example.com blank page', () => {
    it('collapseAndScore folds peers under the severity-4 broken-page root', () => {
        const out = collapseAndScore([
            finding({ id: 'root', severity: 4, title: 'The page does not exist', description: 'Visitors reach a blank placeholder page with no content at all.' }),
            finding({ id: 'child1', title: 'No visible navigation anywhere', recommendation: 'Add a navigation bar' }),
            finding({ id: 'child2', title: 'No call to action offered', recommendation: 'Add a primary action button' }),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe('root');
        expect(out[0].subsumes).toEqual(expect.arrayContaining(['child1', 'child2']));
    });
    it('the gate catches an un-collapsed dependsOn survivor', () => {
        const r = checkSubsumption([
            finding({ id: 'root', severity: 4 }),
            finding({ id: 'child', dependsOn: 'root', recommendation: 'Different fix' }),
        ]);
        expect(r.violations.some(v => v.code === 'SUBSUMED')).toBe(true);
    });
});

describe('taxonomy fixture 3 (R9): duplicate fix+heuristic', () => {
    it('collapseAndScore merges into instances[] and re-raises severity', () => {
        const out = collapseAndScore([
            finding({ id: 'a', severity: 2, screenshotRefs: [1] }),
            finding({ id: 'b', severity: 3, screenshotRefs: [2], evidenceKind: 'axe' }),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].severity).toBe(3);
        expect(out[0].instances).toHaveLength(1);
        expect(out[0].screenshotRefs).toEqual([1, 2]);
    });
    it('the gate flags surviving duplicates', () => {
        const r = checkSubsumption([finding({ id: 'a' }), finding({ id: 'b' })]);
        expect(r.violations.some(v => v.code === 'DUP')).toBe(true);
    });
});

describe('taxonomy fixture 4 (R5/R6): vlm-only advisory discipline + FP contrast', () => {
    it('flags an unmarked vlm-only finding', () => {
        const r = checkAdvisoryDiscipline([finding({ evidenceKind: 'vlm', needsManualReview: false })], []);
        expect(r.violations.some(v => v.code === 'UNVERIFIED-AS-DEFECT')).toBe(true);
    });
    it('flags vlm-only severity above the advisory cap, contrast doubly', () => {
        const r = checkAdvisoryDiscipline([finding({
            evidenceKind: 'vlm', needsManualReview: true, severity: 3,
            title: 'Text contrast looks too low', description: 'Grey text on white appears to fail contrast.',
        })], []);
        expect(r.violations.some(v => v.code === 'UNVERIFIED-AS-DEFECT')).toBe(true);
        expect(r.violations.some(v => v.code === 'FP-CONTRAST')).toBe(true);
    });
    it('never lets an advisory finding headline', () => {
        const r = checkAdvisoryDiscipline([finding({ evidenceKind: 'vlm', needsManualReview: true, severity: 2 })], ['f1']);
        expect(r.violations.some(v => v.code === 'ADVISORY-AS-HEADLINE')).toBe(true);
    });
    it('passes an axe-bound severity 4', () => {
        const r = checkAdvisoryDiscipline([finding({ evidenceKind: 'axe', severity: 4 })], []);
        expect(r.pass).toBe(true);
    });
});

describe('taxonomy fixture 5 (R3): nav absence must be flagged', () => {
    it('fails when a multi-screen live run has nav_present=false and no wayfinding finding', () => {
        const r = checkNavFlagged([finding({})], { 2: false }, { 1: 'live', 2: 'live' }, 3);
        expect(r.violations.some(v => v.code === 'NAV-MISSING-UNFLAGGED')).toBe(true);
    });
    it('passes when a wayfinding finding exists on that screen', () => {
        const r = checkNavFlagged(
            [finding({ screenshotRefs: [2], title: 'No navigation leaves visitors stranded', recommendation: 'Add a navigation bar' })],
            { 2: false }, { 1: 'live', 2: 'live' }, 3);
        expect(r.pass).toBe(true);
    });
    it('never demands nav findings from slides', () => {
        const r = checkNavFlagged([], { 2: false }, { 2: 'slide' }, 3);
        expect(r.pass).toBe(true);
    });
});

describe('taxonomy fixture 6 (R13/R15): TOTAL content parity', () => {
    it('catches a proposal that drops one caption (the Farm $3.8T case)', () => {
        const s = summary({
            contentInventory: [
                { kind: 'value', text: '$3.8T agricultural losses' },
                { kind: 'value', text: '>50% drought probability' },
                { kind: 'text', text: 'Source: UNDP insurance market report' },
            ],
        });
        const violations = checkContentParity(s);
        // $3.8T binds via the kpi-row; >50% and the UNDP source are unbound + unjustified
        expect(violations.length).toBe(2);
        expect(violations.every(v => v.code === 'PROPOSAL-BELOW-FLOOR')).toBe(true);
        expect(violations.map(v => v.detail).join(' ')).toContain('>50%');
    });
    it('a justified omission is the only legal drop', () => {
        const s = summary({
            contentInventory: [{ kind: 'text', text: 'Copyright 2019 legacy footer notice' }],
            omitted: [{ item: 'Copyright 2019 legacy footer notice', reason: 'stale legal line replaced by the current footer' }],
        });
        expect(checkContentParity(s)).toHaveLength(0);
    });
});

describe('taxonomy fixture 7 (R12): component binding + fidelity floor', () => {
    const known = new Set(['nav-bar', 'hero', 'kpi-row', 'cta-row', 'footer', 'list', 'cite']);
    it('flags a pattern outside the mirrored registry and withholds', () => {
        const s = summary({ proposedSections: [{ pattern: 'fancy-carousel', label: 'X' }] });
        const r = checkFloor([s], { 1: goodFidelity }, known);
        expect(r.violations.some(v => v.code === 'NO-COMPONENT-BINDING')).toBe(true);
        expect(r.disposition[1]).toBe('withheld');
    });
    it('withholds on a failed nav/primary-action axis', () => {
        const r = checkFloor([summary({})], { 1: { ...goodFidelity, nav: 0 } }, known);
        expect(r.violations.some(v => v.detail.includes('nav axis'))).toBe(true);
        expect(r.disposition[1]).toBe('withheld');
    });
    it('ships a full-parity, full-fidelity proposal', () => {
        const r = checkFloor([summary({ contentInventory: [{ kind: 'value', text: '$3.8T' }] })], { 1: goodFidelity }, known);
        expect(r.pass).toBe(true);
        expect(r.disposition[1]).toBe('ship');
    });
});

describe('taxonomy fixture 8 (R11 + R14): standard scoping + positives', () => {
    it('flags WCAG asserted definitively on a vlm-only finding', () => {
        const r = checkStandardScope([finding({ evidenceKind: 'vlm', description: 'Fails WCAG 1.4.3 contrast for body text on the hero.' })]);
        expect(r.violations.some(v => v.code === 'STANDARD-OVERCLAIMED')).toBe(true);
    });
    it('permits an advisory-flagged finding that names the criterion to verify', () => {
        const r = checkStandardScope([finding({ evidenceKind: 'vlm', needsManualReview: true, description: 'Body text may sit below the WCAG 1.4.3 threshold; verify with a measurement.' })]);
        expect(r.pass).toBe(true);
    });
    it('flags a screen with no positives at all', () => {
        const r = checkPreserve([summary({ preserve: [], non_issues: [] })]);
        expect(r.violations.some(v => v.code === 'NO-POSITIVES')).toBe(true);
    });
    it('flags a preserve item dropped from the proposal', () => {
        const r = checkPreserve([summary({ preserve: ['The interactive county risk map'] })]);
        expect(r.violations.some(v => v.code === 'PRESERVE-DROPPED')).toBe(true);
    });
});

describe('taxonomy fixture 9 (R1/R2/R10): framing', () => {
    it('kills interface findings against slides', () => {
        const r = checkFraming([finding({ screenshotRefs: [2] })], true, { 2: 'slide' });
        expect(r.violations.some(v => v.code === 'NO-TASK-MODEL')).toBe(true);
    });
    it('caps severity-3 interaction findings without a task model', () => {
        const r = checkFraming([finding({ severity: 3 })], false, { 1: 'live' });
        expect(r.violations.some(v => v.code === 'NO-TASK-MODEL')).toBe(true);
    });
    it('flags a vlm opinion with no heuristic anchor', () => {
        const r = checkFraming([finding({ subcategory: '', evidenceKind: 'vlm' })], true, { 1: 'live' });
        expect(r.violations.some(v => v.code === 'OPINION-AS-HEURISTIC')).toBe(true);
    });
});

describe('assembleAuditGate + gate.md', () => {
    const base = {
        navPresent: { 1: true }, artifactTypes: { 1: 'live' as const },
        fidelity: { 1: goodFidelity }, knownPatterns: new Set(['nav-bar', 'hero', 'kpi-row']),
        headlineFindingIds: [], hasTaskModel: true, totalScreens: 1, now: '2026-07-08T00:00:00Z',
    };
    it('passes a clean run and renders markdown', () => {
        const gate = assembleAuditGate({ ...base, findings: [finding({})], screenSummaries: [summary({})] });
        expect(gate.status).toBe('pass');
        expect(gate.proposalDisposition[1]).toBe('ship');
        const md = gateToMarkdown(gate, 'farm-risk-ready');
        expect(md).toContain('Audit gate: PASS');
        expect(md).toContain('screen 1: ship');
    });
    it('floor failure withholds but does not fail the run; other violations do', () => {
        const withheld = assembleAuditGate({
            ...base, fidelity: { 1: { ...goodFidelity, primary_action: 0 } },
            findings: [finding({})], screenSummaries: [summary({})],
        });
        expect(withheld.status).toBe('pass');
        expect(withheld.proposalDisposition[1]).toBe('withheld');
        const failed = assembleAuditGate({
            ...base, findings: [finding({ severity_basis: '' })], screenSummaries: [summary({})],
        });
        expect(failed.status).toBe('fail');
        expect(failed.reasonCodes).toContain('SEVERITY-UNMAPPED');
    });
});

describe('Critic kill-only application (item 20)', () => {
    const fs = [finding({ id: 'a' }), finding({ id: 'b', recommendation: 'Add alt text to hero image', severity: 3 })];
    it('applies kill/downgrade/advisory/subsume and logs every action', () => {
        const actions: CriticAction[] = [
            { finding_id: 'a', action: 'advisory', reason_code: 'UNVERIFIED-AS-DEFECT' },
            { finding_id: 'b', action: 'downgrade', reason_code: 'SEVERITY-UNMAPPED', severity: 2 },
        ];
        const { findings: out, log } = applyCriticActions(fs, actions);
        expect(out).toHaveLength(2);
        expect(out.find(f => f.id === 'a')?.needsManualReview).toBe(true);
        expect(out.find(f => f.id === 'b')?.severity).toBe(2);
        expect(log).toHaveLength(2);
    });
    it('ignores unknown ids: the Critic cannot add findings', () => {
        const { findings: out } = applyCriticActions(fs, [
            { finding_id: 'ghost', action: 'kill', reason_code: 'DUP' },
        ]);
        expect(out.map(f => f.id).sort()).toEqual(['a', 'b']);
    });
    it('downgrade never raises severity', () => {
        const { findings: out } = applyCriticActions(fs, [
            { finding_id: 'a', action: 'downgrade', reason_code: 'SEVERITY-UNMAPPED', severity: 4 },
        ]);
        expect(out.find(f => f.id === 'a')?.severity).toBe(2);
    });
});
