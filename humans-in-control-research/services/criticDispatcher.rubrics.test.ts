// 2026-10-01 (plan Stage 2.6 "panels that decide", 3.7, 5.4; audit C6 + C8).
// The 22 *-deliverable-auditor agents are now rubric JSON under wiki/eval/rubrics/, resolved
// through index.json; a missing rubric fails the panel as a degradation event; `refine` triggers a
// bounded rebuild; the panel writes one auditor-verdicts.jsonl line per artifact; the dispatcher
// fails closed; the em-dash telemetry counts U+2014, not the ASCII hyphen.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runExpertPanel, EXPERT_PANELS, type ArtifactKind, type PanelRebuildFeedback } from './artifactExpertPanel';
import { dispatchCritic, resetCriticSkillCache } from './criticDispatcher';
import { criticReviseLoop } from './criticReviseLoop';
import {
    normalizeRubric, resolveRubricKind, scoreRubric, resetRubricCache, loadRubricForKind,
    type RubricIndex, type AuditorVerdictRecord,
} from './auditorRubrics';

const RUBRICS_DIR = path.resolve(__dirname, '..', 'hic-workspace', 'wiki', 'eval', 'rubrics');
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const diskIndex = (): RubricIndex => readJson(path.join(RUBRICS_DIR, 'index.json'));
const diskRubrics = (): Record<string, unknown> => {
    const idx = diskIndex();
    const out: Record<string, unknown> = {};
    for (const [kind, entry] of Object.entries(idx.rubrics)) {
        out[kind] = readJson(path.join(RUBRICS_DIR, path.basename(entry.path)));
    }
    return out;
};

const EM = String.fromCharCode(0x2014);

// A test invoker: every LLM critic accepts, so the rubric alone decides.
const acceptAll = vi.fn(async (o: { skill_name: string }) => ({
    verdict: { accept: true, edits: [], rationale: `${o.skill_name}: ok`, confidence: 'high' as const },
    cost_usd: 0.01,
}));

beforeEach(() => {
    resetRubricCache();
    resetCriticSkillCache();
    acceptAll.mockClear();
});
afterEach(() => {
    vi.unstubAllGlobals();
});

describe('rubric manifest on disk', () => {
    it('index.json registers 22 rubrics and every path resolves to a parseable file', () => {
        const idx = diskIndex();
        expect(Object.keys(idx.rubrics).length).toBe(22);
        for (const [kind, entry] of Object.entries(idx.rubrics)) {
            const file = path.join(RUBRICS_DIR, path.basename(entry.path));
            expect(fs.existsSync(file), `${kind}: ${entry.path}`).toBe(true);
            const rubric = normalizeRubric(readJson(file), kind);
            expect(rubric, kind).not.toBeNull();
            expect(rubric!.criteria.length, kind).toBeGreaterThanOrEqual(10);
            for (const c of rubric!.criteria) expect(c.floor, `${kind}.${c.id}`).toBeGreaterThanOrEqual(1);
            // every blocking id names a real criterion
            for (const b of rubric!.blocking) expect(rubric!.criteria.some(c => c.id === b), `${kind} blocking ${b}`).toBe(true);
        }
    });

    it('the PRD rubric is the ten-item plan rubric with items 2, 6 and 8 blocking', () => {
        const rubric = normalizeRubric(readJson(path.join(RUBRICS_DIR, 'prd-rubric.json')), 'prd')!;
        expect(rubric.criteria.length).toBe(10);
        const blockingNs = rubric.criteria.filter(c => c.blocking).map(c => c.n).sort();
        expect(blockingNs).toEqual([2, 6, 8]);
        expect(rubric.criteria.find(c => c.n === 6)!.deterministic_check).toBe('prd_trace_integrity');
    });

    it('every ArtifactKind the panel knows resolves to a rubric kind', () => {
        const idx = diskIndex();
        for (const kind of Object.keys(EXPERT_PANELS) as ArtifactKind[]) {
            expect(resolveRubricKind(idx, kind), kind).not.toBeNull();
        }
    });

    it('no rubric text carries an em-dash', () => {
        for (const f of fs.readdirSync(RUBRICS_DIR)) {
            const text = fs.readFileSync(path.join(RUBRICS_DIR, f), 'utf-8');
            expect(text.includes(EM), f).toBe(false);
        }
    });

    it('the absorbed agent files are gone from .claude/agents', () => {
        const agentsDir = path.resolve(__dirname, '..', '..', '.claude', 'agents');
        const left = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter(f => f.endsWith('-deliverable-auditor.md')) : [];
        expect(left).toEqual([]);
    });
});

describe('runExpertPanel: missing rubric fails the panel', () => {
    it('emits a degradation event, verdict fail, and still writes a verdict line', async () => {
        const written: AuditorVerdictRecord[] = [];
        const res = await runExpertPanel({
            deliverable: { title: 'A plain artifact', content: ['one', 'two'] },
            kind: 'mindmap',
            invoke_critic: acceptAll,
            score_rubric: null,
            rubric_loader: { index: { version: 't', rubrics: { journey: { path: 'eval/rubrics/journey-rubric.json' } }, aliases: {}, critics: {} }, rubrics: {} },
            write_verdict: async (r) => { written.push(r); return true; },
        });
        expect(res.verdict).toBe('fail');
        expect(res.rubric).toBeNull();
        const ev = res.degradation_events.find(e => e.stage === 'expert_panel:mindmap');
        expect(ev).toBeDefined();
        expect(ev!.recoverable).toBe(false);
        expect(ev!.detail).toMatch(/no rubric registered for kind 'mindmap'/);
        expect(written.length).toBe(1);
        expect(written[0].verdict).toBe('fail');
        expect(written[0].rubric_id).toBe('missing');
    });

    it('an unreadable index is also a missing rubric', async () => {
        const res = await runExpertPanel({
            deliverable: { title: 'x' },
            kind: 'journey',
            invoke_critic: acceptAll,
            score_rubric: null,
            rubric_loader: { index: null },
            write_verdict: null,
        });
        expect(res.verdict).toBe('fail');
        expect(res.degradation_events.some(e => /rubric index unreadable/.test(e.detail))).toBe(true);
    });
});

describe('runExpertPanel: refine triggers a bounded rebuild (max 2, progressGuard)', () => {
    // A rubric with one deterministic criterion: raw chunk markers must be resolved.
    const rubric = {
        rubric_id: 'test-rubric', kind: 'journey', version: '9',
        criteria: [
            { id: 'citation_resolution', n: 1, label: 'Citation resolution', five: 'resolved', one: 'raw markers', floor: 3, blocking: false, deterministic_check: 'raw_chunk_markers' },
        ],
        blocking: [],
    };
    const loader = {
        index: { version: 't', rubrics: { journey: { path: 'eval/rubrics/journey-rubric.json' } }, aliases: {}, critics: {} },
        rubrics: { journey: rubric },
    };
    const dirty = { title: 'Students leave before the second term', content: ['Advising queues grow [CHUNK_001] and [CHUNK_002] and [CHUNK_003]'] };
    const clean = { title: 'Students leave before the second term', content: ['Advising queues grow (Higher Ed Dive: Advising report)'] };

    it('calls rebuild once when the first rebuild clears the floor', async () => {
        const rebuild = vi.fn(async (_f: PanelRebuildFeedback) => clean);
        const res = await runExpertPanel({
            deliverable: dirty, kind: 'journey', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: loader, write_verdict: null, rebuild, artifact_id: 'a1', run_id: 'r1',
        });
        expect(rebuild).toHaveBeenCalledTimes(1);
        expect(rebuild.mock.calls[0][0].instructions[0]).toMatch(/Citation resolution scored 1\/5/);
        expect(res.verdict).toBe('pass');
        expect(res.rebuilds).toBe(1);
        expect(res.result).toEqual(clean);
    });

    it('stops at two rebuilds when the artifact never clears the floor', async () => {
        let n = 0;
        const rebuild = vi.fn(async (_f: PanelRebuildFeedback) => ({ ...dirty, content: [`${dirty.content[0]} attempt ${++n} with different wording each time so the guard sees progress`] }));
        const res = await runExpertPanel({
            deliverable: dirty, kind: 'journey', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: loader, write_verdict: null, rebuild, artifact_id: 'a2', run_id: 'r2',
        });
        expect(rebuild).toHaveBeenCalledTimes(2);
        expect(res.rebuilds).toBe(2);
        expect(res.verdict).toBe('refine');
        expect(res.rebuild_stop_reason).toBe('iteration_capped');
    });

    it('the progress guard ends the loop early when a rebuild returns the same content', async () => {
        const rebuild = vi.fn(async (_f: PanelRebuildFeedback) => dirty);
        const res = await runExpertPanel({
            deliverable: dirty, kind: 'journey', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: loader, write_verdict: null, rebuild, artifact_id: 'a3', run_id: 'r3',
        });
        expect(rebuild.mock.calls.length).toBeLessThanOrEqual(2);
        expect(res.verdict).toBe('refine');
        expect(res.rebuild_stop_reason).toBeDefined();
    });

    it('without a rebuild callback the bounded rebuild re-runs the critic loop', async () => {
        const res = await runExpertPanel({
            deliverable: dirty, kind: 'journey', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: loader, write_verdict: null, artifact_id: 'a4', run_id: 'r4',
        });
        expect(res.verdict).toBe('refine');
        expect(res.rebuilds).toBeGreaterThanOrEqual(1);
        expect(res.rebuilds).toBeLessThanOrEqual(2);
    });
});

describe('runExpertPanel: PRD withhold on a blocking 1', () => {
    it('a PRD whose requirements trace to nothing scores item 6 = 1 and is withheld, with no rebuild', async () => {
        const rebuild = vi.fn(async (f: any) => f);
        const prd = {
            title: 'Advisors need one queue',
            problem: { quotes: [{ quote: 'I waited three weeks for an advising slot.', source: 'Reddit r/NEU' }] },
            requirements: [{ id: 'R1', title: 'Single advising queue', trace: {} }, { id: 'R2', title: 'Slot alerts', trace: {} }],
            questions: [],
            successMetrics: ['Advisors report fewer duplicate requests'],
        };
        const res = await runExpertPanel({
            deliverable: prd, kind: 'prd', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: { index: diskIndex(), rubrics: diskRubrics() }, write_verdict: null, rebuild,
            artifact_id: 'prd1', run_id: 'r5',
        });
        expect(res.verdict).toBe('withhold');
        expect(res.rubric_scores!.blocking_hits).toContain('requirements_trace');
        expect(rebuild).not.toHaveBeenCalled();
        expect(res.rubric!.kind).toBe('prd');
    });

    it('a fully traced PRD does not trip item 6', () => {
        const rubric = normalizeRubric(readJson(path.join(RUBRICS_DIR, 'prd-rubric.json')), 'prd')!;
        const prd = {
            problem: { quotes: [
                { quote: 'I waited three weeks for an advising slot.', source: 'Reddit r/NEU' },
                { quote: 'Students cannot see who owns their case.', source: 'Higher Ed Dive: Advising backlog' },
            ] },
            requirements: [{ id: 'R1', trace: { personaIds: ['P1'] } }],
            questions: [{ id: 'Q1', sourceIds: ['S1'] }],
            successMetrics: ['Advisors report fewer duplicate requests'],
        };
        const r = scoreRubric(rubric, prd, null);
        const item6 = r.scores.find(s => s.id === 'requirements_trace')!;
        expect(item6.score).toBe(5);
        expect(r.blocking_hits).toEqual([]);
        expect(r.verdict).not.toBe('withhold');
    });
});

describe('verdict file line shape', () => {
    it('writes one line per artifact with kind, rubric version, per-item scores, blocking, verdict', async () => {
        const written: AuditorVerdictRecord[] = [];
        const res = await runExpertPanel({
            deliverable: {
                personas: [
                    { name: 'First-Year Co-op Applicant', quote: 'I applied to sixty co-ops and heard back from four.', source: 'Reddit r/NEU', isExternal: true },
                    { name: 'Mid-Career Returner', quote: 'The portal logged me out before I finished.', source: 'Higher Ed Dive: Portal audit', isExternal: true },
                ],
            },
            kind: 'persona', invoke_critic: acceptAll, score_rubric: null,
            rubric_loader: { index: diskIndex(), rubrics: diskRubrics() },
            write_verdict: async (r) => { written.push(r); return true; },
            artifact_id: 'personas_42', run_id: 'run_7',
        });
        expect(written.length).toBe(1);
        const line = written[0];
        expect(line).toMatchObject({
            panel_kind: 'persona', kind: 'personas', rubric_id: 'personas-rubric', rubric_version: '1.0.0',
            artifact_id: 'personas_42', run_id: 'run_7', verdict: res.verdict,
        });
        expect(typeof line.ts).toBe('string');
        expect(Object.keys(line.scores).length).toBe(11);
        expect(line.scores).toHaveProperty('persona_quote_authenticity');
        expect(Array.isArray(line.blocking)).toBe(true);
        expect(Array.isArray(line.below_floor)).toBe(true);
        expect(Array.isArray(line.critic_errors)).toBe(true);
        expect(typeof line.rebuilds).toBe('number');
        expect(['pass', 'refine', 'withhold', 'fail']).toContain(line.verdict);
        // JSONL: the record round-trips as one line.
        expect(JSON.stringify(line).includes('\n')).toBe(false);
        expect(res.auditor_verdict).toEqual(line);
    });

    it('the default writer appends to wiki/eval/auditor-verdicts.jsonl through the proxy', async () => {
        const calls: Array<{ url: string; body: any }> = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: any) => {
            calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
            return { ok: true, status: 200, json: async () => ({ status: 'ok' }), text: async () => '' };
        }));
        const { appendAuditorVerdict } = await import('./auditorRubrics');
        const ok = await appendAuditorVerdict({
            ts: 'now', panel_kind: 'journey', kind: 'journey', rubric_id: 'journey-rubric', rubric_version: '1.0.0',
            scores: { a: 5 }, blocking: [], below_floor: [], verdict: 'pass', rebuilds: 0, critic_errors: [],
            deterministic_failures: [], findings: [], experts_fired: [], cost_usd: 0,
        }, { proxyBase: 'http://proxy' });
        expect(ok).toBe(true);
        expect(calls[0].url).toBe('http://proxy/api/wiki/append');
        expect(calls[0].body.path).toBe('eval/auditor-verdicts.jsonl');
        expect(JSON.parse(calls[0].body.content).verdict).toBe('pass');
    });
});

describe('criticDispatcher fails closed (C8)', () => {
    it('a critic whose rubric text cannot be loaded returns error, never accept', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (/api\/wiki\/read\/eval\/rubrics\/index\.json/.test(url)) {
                return { ok: true, status: 200, json: async () => ({ exists: true, content: JSON.stringify({ version: 't', rubrics: { journey: { path: 'x' } }, aliases: {}, critics: {} }) }), text: async () => '' };
            }
            // The SPA fallback answers unknown paths with index.html and HTTP 200.
            if (/\/skills\//.test(url)) return { ok: true, status: 200, text: async () => '<!doctype html><html><body>SPA</body></html>', json: async () => ({}) };
            return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) };
        }));
        const r = await dispatchCritic({ skill_name: 'no-such-skill', deliverable: { a: 1 }, invocation_model: 'sonnet-4.6', proxy_base: 'http://proxy' });
        expect(r.verdict.accept).toBe(false);
        expect(r.verdict.error).toMatch(/rubric missing for critic 'no-such-skill'/);
        expect(r.verdict.edits).toEqual([]);
    });

    it('a manifest-declared deterministic critic runs in-process with no model call', async () => {
        const fetchSpy = vi.fn(async (url: string) => {
            if (/index\.json/.test(url)) {
                return { ok: true, status: 200, json: async () => ({ exists: true, content: JSON.stringify({ version: 't', rubrics: { journey: { path: 'x' } }, aliases: {}, critics: { 'verbatim-quote-auditor': { deterministic: 'quote_attribution' } } }) }), text: async () => '' };
            }
            throw new Error(`unexpected fetch ${url}`);
        });
        vi.stubGlobal('fetch', fetchSpy);
        const r = await dispatchCritic({
            skill_name: 'verbatim-quote-auditor',
            deliverable: { quote: 'I waited three weeks for an advising slot.', source: 'Reddit r/NEU' },
            invocation_model: 'sonnet-4.6', proxy_base: 'http://proxy',
        });
        expect(r.verdict.accept).toBe(true);
        expect(r.verdict.error).toBeUndefined();
        expect(r.cost_usd).toBe(0);
        expect(fetchSpy.mock.calls.some(c => /api\/ai\/anthropic/.test(String(c[0])))).toBe(false);
    });

    it('the loop records an errored verdict as a degradation event and keeps going', async () => {
        const invoker = vi.fn(async (o: { skill_name: string }) => o.skill_name === 'broken'
            ? { verdict: { accept: false, edits: [], rationale: 'x', confidence: 'low' as const, error: 'rubric missing' }, cost_usd: 0 }
            : { verdict: { accept: true, edits: [], rationale: 'ok', confidence: 'high' as const }, cost_usd: 0 });
        const out = await criticReviseLoop({
            deliverable: { a: 1 },
            critics: [
                { skill_name: 'broken', max_iterations: 2, invocation_model: 'sonnet-4.6' },
                { skill_name: 'fine', max_iterations: 1, invocation_model: 'sonnet-4.6' },
            ],
            revisor_model: 'sonnet-4.6', halt_when: 'all_accept', surface_critique_log: false, invoke_critic: invoker,
        });
        expect(out.critic_errors).toEqual(['broken: rubric missing']);
        expect(out.degradation_events.some(e => e.stage === 'critic_revise_loop:broken' && /could not review/.test(e.detail))).toBe(true);
        // the second critic still ran
        expect(invoker.mock.calls.map(c => c[0].skill_name)).toEqual(['broken', 'fine']);
        expect(out.halted_reason).toBe('critic_error');
    });

    it('a panel with an errored critic cannot declare pass', async () => {
        const invoker = vi.fn(async (o: { skill_name: string }) => ({
            verdict: { accept: false, edits: [], rationale: 'x', confidence: 'low' as const, error: `${o.skill_name} unavailable` }, cost_usd: 0,
        }));
        const res = await runExpertPanel({
            deliverable: { title: 'Students leave before the second term', content: ['Advising queues grow (Higher Ed Dive: Advising report)'] },
            kind: 'journey', invoke_critic: invoker, score_rubric: null, skip_universal: true,
            custom_panel: [{ skill_name: 'journey-illustrator', max_iterations: 1, invocation_model: 'sonnet-4.6' }],
            rubric_loader: {
                index: { version: 't', rubrics: { journey: { path: 'eval/rubrics/journey-rubric.json' } }, aliases: {}, critics: {} },
                rubrics: { journey: { rubric_id: 'j', kind: 'journey', version: '1', criteria: [{ id: 'cr', n: 1, label: 'Citation resolution', five: '', one: '', floor: 3, blocking: false, deterministic_check: 'raw_chunk_markers' }], blocking: [] } },
            },
            write_verdict: null, max_rebuilds: 0,
        });
        expect(res.rubric_scores!.verdict).toBe('pass');
        expect(res.verdict).toBe('refine');
        expect(res.critic_errors.length).toBe(1);
    });
});

describe('panel telemetry counts U+2014, not the ASCII hyphen (C8)', () => {
    it('a hyphenated artifact reports zero em-dashes; an em-dash is counted and stripped', async () => {
        const loader = {
            index: { version: 't', rubrics: { journey: { path: 'p' } }, aliases: {}, critics: {} },
            rubrics: { journey: { rubric_id: 'j', kind: 'journey', version: '1', criteria: [{ id: 'cr', n: 1, label: 'Citation resolution', five: '', one: '', floor: 3, blocking: false, deterministic_check: 'raw_chunk_markers' }], blocking: [] } },
        };
        const hyphens = await runExpertPanel({
            deliverable: { title: 'Co-op applicants wait for first-round replies', content: ['UTF-8 device-width nxt-slide'] },
            kind: 'journey', invoke_critic: acceptAll, score_rubric: null, rubric_loader: loader, write_verdict: null,
        });
        expect(hyphens.panel_summary.em_dash_count_before).toBe(0);
        expect(hyphens.panel_summary.em_dash_count_after).toBe(0);
        expect(JSON.stringify(hyphens.result)).toContain('device-width');

        const emd = await runExpertPanel({
            deliverable: { title: `Applicants wait ${EM} then leave`, content: ['x'] },
            kind: 'journey', invoke_critic: acceptAll, score_rubric: null, rubric_loader: loader, write_verdict: null,
        });
        expect(emd.panel_summary.em_dash_count_before).toBe(1);
        expect(emd.panel_summary.em_dash_count_after).toBe(0);
    });
});

describe('loadRubricForKind reads through the proxy and tolerates the SPA fallback', () => {
    it('resolves an alias and caches the rubric', async () => {
        const idx = { version: 't', rubrics: { personas: { path: 'eval/rubrics/personas-rubric.json' } }, aliases: { persona: 'personas' }, critics: {} };
        const body = { rubric_id: 'personas-rubric', kind: 'personas', version: '1.0.0', criteria: [{ id: 'a', n: 1, label: 'A', five: '', one: '' }], blocking: ['a'] };
        const fetchSpy = vi.fn(async (url: string) => {
            if (/index\.json/.test(url)) return { ok: true, status: 200, json: async () => ({ exists: true, content: JSON.stringify(idx) }), text: async () => '' };
            if (/personas-rubric\.json/.test(url)) return { ok: true, status: 200, json: async () => ({ exists: true, content: JSON.stringify(body) }), text: async () => '' };
            return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
        });
        const r1 = await loadRubricForKind('persona', { fetchImpl: fetchSpy as any, proxyBase: 'http://proxy' });
        expect(r1.rubricKind).toBe('personas');
        expect(r1.rubric!.blocking).toEqual(['a']);
        expect(r1.rubric!.criteria[0].blocking).toBe(true);
        const before = fetchSpy.mock.calls.length;
        await loadRubricForKind('persona', { fetchImpl: fetchSpy as any, proxyBase: 'http://proxy' });
        expect(fetchSpy.mock.calls.length).toBe(before);
    });
});
