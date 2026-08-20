/** The runner that makes the DF-D lifecycle live (it had no caller). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callMock = vi.fn();
vi.mock('./aiRetryClient', () => ({ callAIWithRetry: (...a: any[]) => callMock(...a) }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { runSecondBrainPass, constraintToProposedFact } from './secondBrainPass';
import { DEFAULT_CONFIG, factId, type MemoryFact } from './memoryLifecycle';

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const fact = (over: Partial<MemoryFact>): MemoryFact => ({
    id: over.id || factId(over.content || 'x'),
    content: over.content || 'x',
    category: over.category || 'context',
    confidence: over.confidence ?? 0.9,
    scope: 'user', durability: 'durable', authority: 'descriptive',
    createdAt: over.createdAt || daysAgo(5),
    expectedValidDays: over.expectedValidDays ?? 90,
    confirmationCount: 0, sourceRunIds: ['r0'],
    ...over,
});

const storeResponse = (facts: MemoryFact[]) => ({
    ok: true,
    json: async () => ({ path: 'synthesis/memory-facts.json', exists: true, content: JSON.stringify(facts) }),
});
const writeOk = { ok: true, json: async () => ({ ok: true }) };

beforeEach(() => { callMock.mockReset(); fetchMock.mockReset(); });

describe('runSecondBrainPass', () => {
    it('skips the model call when nothing is due for review', async () => {
        fetchMock.mockResolvedValueOnce(storeResponse([fact({ content: 'fresh fact' })])).mockResolvedValue(writeOk);
        const res = await runSecondBrainPass({
            runId: 'r1',
            proposed: [constraintToProposedFact('Name the subreddit in social attributions', { fromNegativeSignal: true })],
        });
        expect(res.reviewed.modelCalled).toBe(false);
        expect(callMock).not.toHaveBeenCalled();
        expect(res.report?.admitted).toBe(1);
    });

    it('makes ONE model call when aged candidates exist and enforces the guardrails on its answer', async () => {
        const store = [
            fact({ id: 'a', content: 'stale a', createdAt: daysAgo(200) }),
            fact({ id: 'b', content: 'stale b', createdAt: daysAgo(210) }),
            fact({ id: 'c', content: 'stale c', createdAt: daysAgo(220) }),
            fact({ id: 'prot', content: 'never use raster slides', category: 'correction', createdAt: daysAgo(400), expectedValidDays: 30 }),
            fact({ id: 'fresh', content: 'fresh one', createdAt: daysAgo(2) }),
        ];
        fetchMock.mockResolvedValueOnce(storeResponse(store)).mockResolvedValue(writeOk);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                staleFactsToRemove: [
                    { id: 'a', reason: 'superseded' },
                    { id: 'prot', reason: 'model tried to drop a correction' },
                    { id: 'fresh', reason: 'model tried to drop a fresh fact' },
                ],
            }) }] } }],
        });

        const res = await runSecondBrainPass({ runId: 'r2' });
        expect(callMock).toHaveBeenCalledTimes(1);
        expect(res.reviewed.staleCandidates).toBe(3);
        expect(res.report?.removed).toBe(1);                    // only 'a'
        expect(res.report?.refusals.join(' ')).toMatch(/not an aged candidate/);
    });

    it('a failed review still runs admission and capacity rather than skipping the cycle', async () => {
        const store = [
            fact({ id: 'a', content: 'stale a', createdAt: daysAgo(200) }),
            fact({ id: 'b', content: 'stale b', createdAt: daysAgo(210) }),
            fact({ id: 'c', content: 'stale c', createdAt: daysAgo(220) }),
        ];
        fetchMock.mockResolvedValueOnce(storeResponse(store)).mockResolvedValue(writeOk);
        callMock.mockRejectedValue(new Error('provider 500'));
        const res = await runSecondBrainPass({
            runId: 'r3',
            proposed: [constraintToProposedFact('Cite the pack name when the source is a pack article')],
        });
        expect(res.reviewed.modelCalled).toBe(false);
        expect(res.report?.admitted).toBe(1);
        expect(res.report?.removed).toBe(0);
        expect(res.envelope.status).toBe('success');
    });

    it('a store read failure leaves the store untouched and reports the error', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
        const res = await runSecondBrainPass({ runId: 'r4' });
        expect(res.report).toBeNull();
        expect(res.envelope.status).toBe('error');
        // No write was attempted.
        expect(fetchMock.mock.calls.every(c => !String(c[0]).includes('/api/wiki/write'))).toBe(true);
    });

    it('dryRun computes the report and never writes', async () => {
        fetchMock.mockResolvedValueOnce(storeResponse([fact({ content: 'one' })])).mockResolvedValue(writeOk);
        const res = await runSecondBrainPass({
            runId: 'r5', dryRun: true,
            proposed: [constraintToProposedFact('Prefer native exports')],
        });
        expect(res.report?.admitted).toBe(1);
        expect(fetchMock.mock.calls.some(c => String(c[0]).includes('/api/wiki/write'))).toBe(false);
    });

    it('deterministicOnly never calls the model even with aged candidates', async () => {
        const store = [1, 2, 3].map(i => fact({ id: `s${i}`, content: `stale ${i}`, createdAt: daysAgo(200 + i) }));
        fetchMock.mockResolvedValueOnce(storeResponse(store)).mockResolvedValue(writeOk);
        const res = await runSecondBrainPass({ runId: 'r6', deterministicOnly: true });
        expect(callMock).not.toHaveBeenCalled();
        expect(res.reviewed.staleCandidates).toBe(3);
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

describe('DF-A4 read-before-write on the fact store', () => {
    it('presents the hash it read, and a 409 leaves the store untouched', async () => {
        const store = [fact({ id: 'a', content: 'one' })];
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ exists: true, content: JSON.stringify(store), content_sha256: 'abc123' }),
            })
            .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ current_sha256: 'def456' }) });

        const res = await runSecondBrainPass({
            runId: 'r7',
            proposed: [constraintToProposedFact('Prefer named actors in every claim')],
        });
        const write = fetchMock.mock.calls.find(c => String(c[0]).includes('/api/wiki/write'));
        expect(write).toBeTruthy();
        expect(JSON.parse(String((write![1] as any).body)).expected_sha256).toBe('abc123');
        // The pass reports the failure instead of pretending the write landed.
        expect(res.envelope.status).toBe('error');
        expect(res.envelope.errorType).toBe('stale_write');
    });

    it('omits the precondition when the read did not supply a hash', async () => {
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ exists: false, content: '' }) })
            .mockResolvedValue(writeOk);
        await runSecondBrainPass({ runId: 'r8', proposed: [constraintToProposedFact('x y z a b c')] });
        const write = fetchMock.mock.calls.find(c => String(c[0]).includes('/api/wiki/write'));
        expect(JSON.parse(String((write![1] as any).body)).expected_sha256).toBeUndefined();
    });
});
