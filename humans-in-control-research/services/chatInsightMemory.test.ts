// chatInsightMemory.test.ts - WS-6 M2 (2026-10-30); WS-B B1 (2026-10-31): insights go through the ONE memory door.
// Redaction, the admission gate and the lock now run in the proxy (proxy/tests/test_memory_api.py covers them);
// these tests pin the SPA's side of the contract: what it proposes, what it sends, how it reads the answer.
import { describe, it, expect, vi } from 'vitest';
import { admitChatInsight, leadOf, insightFact, forgetEngagementFacts, forgetFacts } from './chatInsightMemory';

const ANSWER = 'The advancement team re-keys every gift into the CRM by hand each Friday, so receipts go out a week late. Maria Alvarez (maria@example.org) confirmed the backlog in the ops review. The second sentence names the mechanism; the third repeats the consequence for emphasis and length.';

function door(response: any, status = 200) {
    const calls: Array<{ url: string; body: any }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
        return new Response(JSON.stringify(response), { status });
    }) as any;
    return { calls, fetchImpl };
}

describe('leadOf', () => {
    it('keeps whole sentences under the budget', () => {
        const lead = leadOf(ANSWER, 160);
        expect(lead.endsWith('.')).toBe(true);
        expect(lead.length).toBeLessThanOrEqual(160);
    });
});

describe('insightFact', () => {
    it('proposes one typed, durable, engagement-scoped knowledge fact', () => {
        const f = insightFact('Why are receipts late?', ANSWER)!;
        expect(f.content.startsWith('Q: Why are receipts late? / A: ')).toBe(true);
        expect([f.category, f.scope, f.durability, f.authority]).toEqual(['knowledge', 'engagement', 'durable', 'descriptive']);
        expect(insightFact('Q', 'Too short.')).toBeNull();
    });
});

describe('admitChatInsight (through /api/memory/admit)', () => {
    it('sends the fact, the run and the engagement, and leaves redaction to the proxy', async () => {
        const { calls, fetchImpl } = door({ ok: true, report: { admitted: 1, rejected: 0, rejectedByScopeGate: 0, removed: 0, extended: 0, merged: 0, confirmed: 0, evicted: 0, shadowDisagreement: 0, refusals: [], total: 3 }, admitted_ids: ['fabc'], redacted: 2, total: 3 });
        const r = await admitChatInsight({ question: 'Why are receipts late?', answer: ANSWER, runId: 'run_eng1_a', engagement: 'eng1' }, fetchImpl);
        expect(r).toMatchObject({ admitted: true, factId: 'fabc', redacted: 2, total: 3 });
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toMatch(/\/api\/memory\/admit$/);
        expect(calls[0].body).toMatchObject({ run_id: 'run_eng1_a', engagement: 'eng1', surface: 'spa' });
        expect(calls[0].body.retain_names).toBeUndefined();
        expect(calls[0].body.facts[0].content).toContain('Maria Alvarez');   // the PROXY redacts, under the flag
    });

    it('passes an explicit retention choice through', async () => {
        const { calls, fetchImpl } = door({ ok: true, report: { admitted: 1, refusals: [], evicted: 0 }, admitted_ids: ['f1'] });
        await admitChatInsight({ question: 'Who confirmed the backlog?', answer: ANSWER, runId: 'r', engagement: 'eng2', retainNames: true }, fetchImpl);
        expect(calls[0].body.retain_names).toBe(true);
    });

    it('reports a refusal from the gate and a store outage without throwing', async () => {
        const refused = door({ ok: true, report: { admitted: 0, refusals: ['admit: confidence 0.6 below 0.7'] }, admitted_ids: [] });
        expect(await admitChatInsight({ question: 'Q', answer: ANSWER, runId: 'r1', engagement: 'e' }, refused.fetchImpl)).toMatchObject({ admitted: false, reason: 'admit: confidence 0.6 below 0.7' });
        const down = door({ error: 'memory store unavailable: busy' }, 503);
        expect((await admitChatInsight({ question: 'Q', answer: ANSWER, runId: 'r2', engagement: 'e' }, down.fetchImpl)).reason).toMatch(/store unavailable/);
        const short = door({});
        expect(await admitChatInsight({ question: 'Q', answer: 'Too short.', runId: 'r3', engagement: 'e' }, short.fetchImpl)).toMatchObject({ admitted: false });
        expect(short.calls).toHaveLength(0);
    });
});

describe('forgetting (through /api/memory/forget)', () => {
    it('forgetEngagementFacts sends the run-family prefix', async () => {
        const { calls, fetchImpl } = door({ ok: true, removed: ['f1'], total: 1 });
        const f = await forgetEngagementFacts('run_engA', fetchImpl);
        expect(f.removed).toEqual(['f1']);
        expect(calls[0].body).toEqual({ engagement: 'run_engA' });
    });

    it('forgetFacts refuses an empty selector instead of deleting everything', async () => {
        const { calls, fetchImpl } = door({});
        expect((await forgetFacts({}, fetchImpl)).error).toMatch(/required/);
        expect(calls).toHaveLength(0);
    });
});
