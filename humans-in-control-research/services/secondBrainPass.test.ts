/** The runner that makes the DF-D lifecycle live. Since 2026-10-31 (WS-B B1/B3) it drives the proxy's ONE memory
 *  door: admission and reinforcement through /api/memory/admit, the staleness + consolidation review through
 *  /api/memory/lifecycle. The guardrails themselves are pinned by the parity fixture (memoryParity.test.ts and
 *  proxy/tests/test_memory_store.py); these tests pin the runner's calls and how it reads the answers. */
import { describe, it, expect, vi } from 'vitest';
import { runSecondBrainPass, constraintToProposedFact } from './secondBrainPass';
import { DEFAULT_CONFIG, factId, type MemoryFact } from './memoryLifecycle';

const report = (over: Record<string, any> = {}) => ({ admitted: 0, rejected: 0, rejectedByScopeGate: 0, removed: 0, extended: 0, merged: 0, confirmed: 0, evicted: 0, shadowDisagreement: 0, refusals: [], total: 0, ...over });

function door(routes: Record<string, { status?: number; body: any }>) {
    const calls: Array<{ url: string; body: any }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
        const key = Object.keys(routes).find(k => String(url).includes(k));
        if (!key) return new Response('{}', { status: 404 });
        return new Response(JSON.stringify(routes[key].body), { status: routes[key].status ?? 200 });
    }) as any;
    return { calls, fetchImpl };
}

describe('runSecondBrainPass (through the memory door)', () => {
    it('admits the learning pass constraints, then asks for the review, and sums the two reports', async () => {
        const { calls, fetchImpl } = door({
            '/api/memory/admit': { body: { ok: true, report: report({ admitted: 1, total: 5 }), admitted_ids: ['f1'] } },
            '/api/memory/lifecycle': { body: { report: report({ removed: 1, total: 4, refusals: ['staleness x: not an aged candidate'] }), stale_candidates: 3, consolidation_groups: 0, model_called: true } },
        });
        const res = await runSecondBrainPass({
            runId: 'r1', proposed: [constraintToProposedFact('Name the subreddit in social attributions', { fromNegativeSignal: true })],
        }, fetchImpl);
        expect(calls.map(c => c.url.replace(/^.*\/api/, '/api'))).toEqual(['/api/memory/admit', '/api/memory/lifecycle']);
        expect(calls[0].body.facts[0].category).toBe('correction');
        expect(calls[1].body).toEqual({ deterministic_only: false });
        expect(res.report).toMatchObject({ admitted: 1, removed: 1, total: 4 });
        expect(res.reviewed).toEqual({ staleCandidates: 3, consolidationGroups: 0, modelCalled: true });
        expect(res.report?.refusals.join(' ')).toMatch(/not an aged candidate/);
    });

    it('a failed review still keeps the admission and reports success', async () => {
        const { fetchImpl } = door({
            '/api/memory/admit': { body: { ok: true, report: report({ admitted: 1, total: 2 }) } },
            '/api/memory/lifecycle': { status: 500, body: {} },
        });
        const res = await runSecondBrainPass({ runId: 'r3', proposed: [constraintToProposedFact('Cite the pack name when the source is a pack article')] }, fetchImpl);
        expect(res.reviewed.modelCalled).toBe(false);
        expect(res.report?.admitted).toBe(1);
        expect(res.envelope.status).toBe('success');
    });

    it('an admission failure reports the error and asks for no review', async () => {
        const { calls, fetchImpl } = door({ '/api/memory/admit': { status: 503, body: { error: 'memory store unavailable' } } });
        const res = await runSecondBrainPass({ runId: 'r4', proposed: [constraintToProposedFact('x y z a b c')] }, fetchImpl);
        expect(res.report).toBeNull();
        expect(res.envelope.status).toBe('error');
        expect(calls.some(c => c.url.includes('/api/memory/lifecycle'))).toBe(false);
    });

    it('nothing to admit: only the review runs; deterministicOnly asks the proxy to skip the model', async () => {
        const { calls, fetchImpl } = door({ '/api/memory/lifecycle': { body: { report: report({ total: 3 }), stale_candidates: 3, consolidation_groups: 0, model_called: false } } });
        const res = await runSecondBrainPass({ runId: 'r6', deterministicOnly: true }, fetchImpl);
        expect(calls).toHaveLength(1);
        expect(calls[0].body).toEqual({ deterministic_only: true });
        expect(res.reviewed.staleCandidates).toBe(3);
    });

    it('nominated reinforcements travel with the user words that must confirm them', async () => {
        const { calls, fetchImpl } = door({
            '/api/memory/admit': { body: { ok: true, report: report({ confirmed: 1, total: 1 }) } },
            '/api/memory/lifecycle': { body: { report: report({ total: 1 }), stale_candidates: 0, consolidation_groups: 0, model_called: false } },
        });
        await runSecondBrainPass({ runId: 'r9', reinforceIds: ['fa'], userMessages: ['yes, exactly right'] }, fetchImpl);
        expect(calls[0].body).toMatchObject({ facts: [], reinforce_ids: ['fa'], user_messages: ['yes, exactly right'] });
    });

    it('dryRun computes the report from a read of the store and writes nothing', async () => {
        const store: MemoryFact[] = [{ id: factId('one'), content: 'one', category: 'context', confidence: 0.9, scope: 'user', durability: 'durable', authority: 'descriptive', createdAt: new Date().toISOString(), expectedValidDays: 90, confirmationCount: 0, sourceRunIds: ['r0'] }];
        const { calls, fetchImpl } = door({ '/api/memory/facts': { body: { total: 1, facts: store } } });
        const res = await runSecondBrainPass({ runId: 'r5', dryRun: true, proposed: [constraintToProposedFact('Prefer native exports')] }, fetchImpl);
        expect(res.report?.admitted).toBe(1);
        expect(calls.every(c => c.url.includes('/api/memory/facts'))).toBe(true);
    });
});

describe('constraintToProposedFact', () => {
    it('types a negative-signal constraint as a protected correction with a long window', () => {
        const f = constraintToProposedFact('Never open a slide with the framework name', { fromNegativeSignal: true, confidence: 0.95 });
        expect(f.category).toBe('correction');
        expect(f.expectedValidDays).toBe(DEFAULT_CONFIG.stalenessAgeDays * 4);
        expect(f.scope).toBe('user');
        expect(f.durability).toBe('durable');
        expect(f.authority).toBe('descriptive');
    });

    it('types an ordinary constraint as a preference on the default window', () => {
        const f = constraintToProposedFact('Prefer two-column layouts for comparisons', { deliverableType: 'deck' });
        expect(f.category).toBe('preference');
        expect(f.content).toMatch(/applies to deck/);
        expect(f.expectedValidDays).toBe(DEFAULT_CONFIG.stalenessAgeDays);
    });

    it('floors confidence at the admission threshold so a weak signal cannot be admitted by accident', () => {
        expect(constraintToProposedFact('x', { confidence: 0.1 }).confidence).toBeGreaterThanOrEqual(DEFAULT_CONFIG.factConfidenceThreshold);
    });
});
