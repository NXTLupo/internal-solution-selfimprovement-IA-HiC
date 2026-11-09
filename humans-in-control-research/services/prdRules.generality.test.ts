/**
 * GENERALITY proof for the deliverable rule engine and the ledger-first #prd compile (2026-10-02 owner rules:
 * "deterministically enforced and generalized for ANY RESEARCH PROJECT").
 *
 * Two projects run the SAME pipeline the chat panel runs (ledger -> board themes -> derived areas -> per-area
 * compile -> rule registry -> workbook with the independent export check), with every model call mocked
 * deterministically:
 *   1. a synthetic regional-hospital patient-intake portal (two contract-like documents, one meeting summary
 *      with prototype feedback, one feedback memo, 30 board themes including near-duplicates);
 *   2. the real 2026-10-02 university engagement pages and board themes on disk (skipped when absent).
 * Both must reach 100% coverage of STATED, FEEDBACK and THEME ids, pass every registry rule after repair/fill,
 * and produce a workbook whose independent checks all pass.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
    buildEngagementLedger, loadBoardThemes, mergeBoardThemes, themeLedgerItems, assignAreas, type ThemeInput,
} from './engagementLedger';
import { themesFromContext } from './prdInputs';
import { compilePrdFromLedger, formatCoverageReply, type PrdCompilerInputs, type PrdPersonaInput } from './prdCompiler';
import { ledgerCoverage, type PrdAir } from './prdAir';
import { formatReceiptLines } from './deliverableRules';

const ROOT = path.resolve(__dirname, '..');
const WIKI = path.join(ROOT, 'hic-workspace', 'wiki');

import { hospitalFixture, universityFixture, mockFetch, extractionGen, type Fixture } from './__fixtures__/coverageProjects';

/** Compile mock: covers half the batch per pass (gap fill, then the deterministic fill do the rest), writes a set for themes. */
async function compileGen({ user, label }: { user: string; label: string }): Promise<string> {
    if (/sections/.test(label)) {
        const ev = user.split('\n').map(l => /^\[((?:SF|FB)-\d+\.s0)\] \([^)]*\) (.{20,})$/.exec(l)).filter(Boolean).slice(0, 2) as RegExpExecArray[];
        return JSON.stringify({
            title: 'The portal lets patients finish intake before they arrive',
            thesis: { statement: 'Patients repeat intake at the desk. The team approves the first release.', user: 'Returning patient', pain: 'Repeated forms', decisionRequested: 'Approve the first release', whatItDoes: 'Moves intake online' },
            problem: { story: { user: 'A returning patient', need: 'Finish forms once', insight: 'Forms live on paper' }, quotes: ev.map(m => ({ text: m[2], evidenceId: m[1] })) },
            whyNow: { statement: 'Patients expect online forms.', change: 'Online forms are standard', quotes: [] },
            usersAndJobs: { primaryPersonaIds: ['PE1'], jobStories: [] },
            goalsNonGoalsAppetite: { goals: [{ text: 'Patients finish intake online', measurable: true }], nonGoals: [{ text: 'Claims processing', reason: 'Outside the release' }], appetite: { metric: 'appetite', value: 6, unit: 'weeks', rationale: 'We set this budget for the first release.' } },
            signals: [
                { signal: 'intake_completed', instrument: 'event log', population: { personaId: 'PE1' }, direction: 'up', baselineStatus: 'to be measured by the product owner', type: 'leading', guardrail: { statement: 'complaints do not rise', rollbackAuthority: 'product owner' }, requirementIds: ['R-1'] },
                { signal: 'desk_time_recorded', instrument: 'front desk log', population: { personaId: 'PE1' }, direction: 'down', baselineStatus: 'to be measured by operations', type: 'lagging', guardrail: { statement: 'no rise in errors', rollbackAuthority: 'operations lead' }, requirementIds: ['R-1'] },
            ],
            quality: { characteristics: [{ characteristic: 'Usability', statement: 'Patients finish the form without help' }], accessibility: { level: 'WCAG 2.2 AA', exposedCriteria: [] }, privacy: { regime: '', dataMinimization: 'Collect only what intake needs', dpiaTrigger: { triggered: false, reason: '' } } },
            risks: { register: [{ failureMode: 'Patients abandon long forms', likelihood: 'medium', severity: 'medium', earlySignal: 'drop-off rises', owner: 'product owner', mitigation: 'save progress' }], alternatives: [{ option: 'Kiosk only', rejectedBecause: 'does not reach home', tradeoff: 'cost' }] },
            delivery: { releaseCriteria: ['All must-haves pass their tests'], rollout: [{ phase: 'Pilot', gate: 'tests pass', killCriteria: 'error rate rises', rollbackAuthority: 'product owner' }], trackingPlan: [], dependencies: [], openQuestions: [], accountableApprover: 'product owner' },
        });
    }
    if (/research/.test(label)) return '{"requirements": []}';
    const ids: Array<{ id: string; type: string; name: string }> = [];
    const lines = user.split('\n');
    lines.forEach((l, i) => {
        const m = /^- ((?:SF|FB|TH)-\d+) \| (\w+)/.exec(l);
        if (m) ids.push({ id: m[1], type: m[2], name: (/^\s+(?:item|theme): (.*)$/.exec(lines[i + 1] || '')?.[1] || m[1]).replace(/[^a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() });
    });
    const take = ids.filter((_, i) => i % 2 === 0);
    const reqs: any[] = [];
    take.forEach((x, k) => {
        const at = [{ given: 'a patient opens the portal', when: 'they reach the step', then: `the portal handles ${x.name}` }];
        if (x.type === 'THEME') {
            reqs.push({ text: `The portal addresses ${x.name} for every patient.`, ledgerIds: [x.id], personaIds: ['PE1'], acceptanceTests: at });
            reqs.push({ text: `Staff can see how the portal handles ${x.name}.`, ledgerIds: [x.id], acceptanceTests: at });
        } else if (k === 0) {
            // A compound requirement with a naked number and an em dash: the registry must split, fill and scrub it.
            reqs.push({ text: `The portal saves ${x.name} within 3 days — and sends each patient a receipt.`, ledgerIds: [x.id], acceptanceTests: at });
        } else {
            reqs.push({ text: `The portal delivers ${x.name}.`, ledgerIds: [x.id], acceptanceTests: k % 5 === 1 ? [] : at });
        }
    });
    return JSON.stringify({ requirements: reqs });
}

function pythonChecks(air: PrdAir): { ok: boolean; checks: any[]; skipped?: boolean } {
    const tmp = path.join(os.tmpdir(), `prd-air-${process.pid}-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(air));
    const script = 'import sys,json; sys.path.insert(0, sys.argv[2]); from prd_xlsx import build_prd_workbook_with_checks; air=json.load(open(sys.argv[1],encoding="utf-8")); d,c=build_prd_workbook_with_checks(air,"NXT"); print(json.dumps({"bytes":len(d),"checks":c}))';
    const r = spawnSync('python', ['-c', script, tmp, path.join(ROOT, 'proxy')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    fs.unlinkSync(tmp);
    if (r.error || r.status !== 0) {
        if ((r.error as any)?.code === 'ENOENT') return { ok: true, checks: [], skipped: true };
        throw new Error(`python workbook build failed: ${r.stderr || r.error}`);
    }
    const out = JSON.parse(r.stdout.trim().split('\n').pop()!);
    return { ok: out.checks.every((c: any) => c.pass), checks: out.checks };
}

async function runProject(fx: Fixture) {
    const store = new Map<string, string>();
    const io = { proxyBase: 'http://proxy.test', fetchImpl: mockFetch(fx, store) };
    const led = await buildEngagementLedger({ ...io, engagement: fx.engagement, requestText: fx.request, gen: extractionGen as any });
    const boardThemes = mergeBoardThemes(fx.boardThemes, themesFromContext(await loadBoardThemes(fx.engagement, io)));
    const themeItems = themeLedgerItems(boardThemes);
    const ledger = [...led.items, ...themeItems];
    const areas = assignAreas(ledger);
    const chunks = Object.entries(fx.pages).flatMap(([wp, raw]) => {
        const fm = raw.indexOf('\n---', 4);
        return [{ id: `${wp}#c0`, text: raw.slice(fm + 4, fm + 1500), kind: 'upload' }];
    });
    const inputs: PrdCompilerInputs = {
        artifactId: `prd_${fx.engagement.slice(0, 12)}`, objective: fx.objective, personas: fx.personas, themes: boardThemes,
        journeyPains: [], competitiveGaps: [], evidenceChunks: chunks, ledger, areas,
        ledgerStats: { engagement: fx.engagement, documents: led.documentStats },
    };
    const res = await compilePrdFromLedger(inputs, compileGen);
    return { led, boardThemes, themeItems, ledger, areas, res };
}

function assertProject(name: string, r: Awaited<ReturnType<typeof runProject>>) {
    const air = r.res.air;
    const cov = ledgerCoverage(air);
    const receipt = air.receipt!;
    console.log(`\n[${name}] ledger: ${r.led.items.filter(i => i.type === 'stated').length} stated, ${r.led.items.filter(i => i.type === 'feedback').length} feedback from ${r.led.documents.length} document(s) (${r.led.chunksRead} chunks read); board themes ${r.boardThemes.length} in ${r.themeItems.length} group(s)`);
    console.log(`[${name}] derived areas: ${r.areas.map(a => `${a.label} (${a.items})`).join('; ')}`);
    console.log(`[${name}] requirements ${air.graph.requirements.length}; by area ${JSON.stringify(r.res.report.passes?.requirementsByArea)}; by origin ${JSON.stringify(r.res.report.passes?.requirementsByOrigin)}`);
    console.log(`[${name}] coverage: scope ${cov.scopeCovered}/${cov.scopeItems}, theme ids ${cov.themeIdsCovered}/${cov.themeIds} (${cov.themeCoveragePct}%)`);
    console.log(`[${name}] RECEIPT\n  ${formatReceiptLines(receipt).join('\n  ')}`);
    expect(cov.scopeCovered).toBe(cov.scopeItems);
    expect(cov.themeIds).toBe(r.boardThemes.length);
    expect(cov.themeIdsCovered).toBe(cov.themeIds);
    expect(cov.covered).toBe(cov.items);
    for (const rule of receipt.rules) expect({ rule: rule.ruleId, open: rule.violations.slice(0, 3) }).toEqual({ rule: rule.ruleId, open: [] });
    expect(receipt.pass).toBe(true);
    expect(receipt.rules.map(x => x.ruleId)).toEqual(['coverage', 'one-outcome', 'given-when-then', 'pain-has-quote', 'tier-derived', 'sequential-ids', 'uploads-read-in-full', 'engagement-scope', 'verbatim-quotes', 'source-provenance', 'number-rule', 'writing-scrub', 'id-integrity']);
    // The mocks force every repair and fill path at least once.
    const by = (id: string) => receipt.rules.find(x => x.ruleId === id)!;
    expect(r.res.report.passes!.requirementsByOrigin.fallback).toBeGreaterThan(0);
    expect(r.res.report.passes!.requirementsByOrigin['gap-fill']).toBeGreaterThan(0);
    expect(by('one-outcome').filled).toBeGreaterThan(0);
    expect(by('given-when-then').filled).toBeGreaterThan(0);
    expect(by('number-rule').repaired).toBeGreaterThan(0);
    expect(by('writing-scrub').repaired).toBeGreaterThan(0);
    // Client-stated required items are must without a second origin; no requirement is a bet when it has a root.
    expect(air.graph.requirements.filter(q => (q.ledgerIds || []).length && q.claimType === 'HYPOTHESIS')).toEqual([]);
    const reply = formatCoverageReply(cov, receipt);
    expect(reply).toMatch(/Items no model pass documented/);
    for (const row of cov.uncoveredByModel) expect(reply).toContain(`${row.ledgerId} (`);
    expect(reply).not.toMatch(/—/);
    const py = pythonChecks(air);
    if (!py.skipped) {
        console.log(`[${name}] independent export checks: ${py.checks.map((c: any) => `${c.check.split(':')[0]} ${c.pass ? 'pass' : `FAIL ${c.failures.slice(0, 3).join(', ')}`}`).join('; ')}`);
        // A failing row names its requirement text so the TypeScript and Python detectors can be compared directly.
        for (const c of py.checks.filter((c: any) => !c.pass)) {
            for (const f of (c.failures || []).slice(0, 5)) {
                const id = String(f).split(':')[0].trim();
                const r: any = (air.graph.requirements || []).find((x: any) => x.id === id);
                if (r) console.log(`[${name}] failing row ${id}: ${JSON.stringify(String(r.text || '').slice(0, 220))}`);
            }
        }
        expect(py.ok).toBe(true);
    }
}

describe('rule engine generality: two projects, one pipeline', () => {
    it('synthetic hospital intake portal reaches 100% coverage and passes every rule', async () => {
        const fx = hospitalFixture();
        const r = await runProject(fx);
        expect(r.led.documents.length).toBe(4);
        expect(r.led.items.some(i => i.type === 'feedback' && /insurance/i.test(i.item))).toBe(true);
        expect(r.themeItems.length).toBeLessThan(30);           // near-duplicates collapsed
        expect(r.themeItems.flatMap(t => t.themeIds || []).length).toBe(30);   // no theme dropped
        assertProject('hospital', r);
    }, 60000);

    const uni = universityFixture();
    it.skipIf(!uni)('real university engagement (pages and board themes on disk) reaches 100% coverage and passes every rule', async () => {
        const r = await runProject(uni!);
        expect(r.led.documents.length).toBeGreaterThanOrEqual(9);
        expect(r.led.documentStats.every(d => d.chunksRead === d.chunksRegistered)).toBe(true);
        expect(r.boardThemes.length).toBeGreaterThanOrEqual(590);
        assertProject('university', r);
    }, 180000);
});
