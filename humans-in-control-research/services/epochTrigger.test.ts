// 2026-10-01 (plan Stage 5.1, audit C2): the epoch job counter was computed and DISCARDED. These
// tests pin the end-of-run reader: a completed run is counted once, the status line is logged once
// per run, and a due epoch writes exactly ONE pending proposal through /api/epochs/proposals.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import {
    recordJobCompletion,
    ensureEpochDueProposal,
    formatEpochStatusLine,
    EPOCH_JOB_COUNTER_PATH,
    __resetEpochTriggerStateForTests,
    type EpochStatus,
} from './epochTrigger';

type Route = (url: string, init?: RequestInit) => any;

/** URL-routed fetch mock. Each handler returns the JSON body; a `status` key overrides HTTP status. */
function routeFetch(routes: Array<[RegExp, Route]>) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        for (const [re, handler] of routes) {
            if (re.test(url)) {
                const body = handler(url, init) ?? {};
                const status = typeof body.__status === 'number' ? body.__status : 200;
                return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
            }
        }
        return { ok: false, status: 404, json: async () => ({ error: 'no route' }), text: async () => '' };
    });
}

const calls = (re: RegExp, method?: string) => fetchMock.mock.calls.filter(([u, init]) =>
    re.test(String(u)) && (!method || String((init as RequestInit | undefined)?.method || 'GET').toUpperCase() === method));

const status = (over: Partial<EpochStatus> = {}): EpochStatus => ({
    due: false, jobs_since_last_epoch: 1, threshold: 5, last_epoch_at: '2026-09-01 10:00Z', next_epoch_id: 4,
    computed_at: '2026-10-01T00:00:00Z', ...over,
});

let infoSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
    fetchMock.mockReset();
    __resetEpochTriggerStateForTests();
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('recordJobCompletion (C2 end-of-run reader)', () => {
    it('counts the run once via the local counter when the proxy has no job endpoint, and does not propose below threshold', async () => {
        let counterOnDisk = '';
        routeFetch([
            [/\/api\/epochs\/jobs$/, () => ({ __status: 404 })],
            [/\/api\/epochs\/status/, () => status({ jobs_since_last_epoch: 2 })],
            [new RegExp(`/api/wiki/read/${EPOCH_JOB_COUNTER_PATH}`), () => ({ path: EPOCH_JOB_COUNTER_PATH, content: counterOnDisk, exists: !!counterOnDisk })],
            [/\/api\/wiki\/write$/, (_u, init) => { counterOnDisk = JSON.parse(String(init?.body)).content; return { status: 'ok' }; }],
        ]);

        const r1 = await recordJobCompletion('run-alpha', { deliverable: '#themes' });
        expect(r1.counted).toBe(true);
        expect(r1.status?.jobs_since_last_epoch).toBe(2); // max(proxy 2, local 1)
        expect(r1.status?.due).toBe(false);
        expect(r1.proposed).toBe(false);
        expect(calls(/\/api\/epochs\/proposals/).length).toBe(0);
        const persisted = JSON.parse(counterOnDisk);
        expect(persisted.jobs_since_last_epoch).toBe(1);
        expect(persisted.runs).toEqual(['run-alpha']);
        expect(persisted.since_epoch_at).toBe('2026-09-01 10:00Z');

        // The 2nd..Nth artifact of the SAME run: no second increment, status still read.
        const writesBefore = calls(/\/api\/wiki\/write$/, 'POST').length;
        const r2 = await recordJobCompletion('run-alpha', { deliverable: '#recs' });
        expect(r2.counted).toBe(false);
        expect(calls(/\/api\/wiki\/write$/, 'POST').length).toBe(writesBefore);
    });

    it('logs the formatted status line exactly once per run', async () => {
        routeFetch([
            [/\/api\/epochs\/jobs$/, () => status({ jobs_since_last_epoch: 3 })],
            [/\/api\/epochs\/status/, () => status({ jobs_since_last_epoch: 3 })],
        ]);
        await recordJobCompletion('run-beta', { deliverable: '#themes' });
        await recordJobCompletion('run-beta', { deliverable: '#personas' });
        await recordJobCompletion('run-beta', { deliverable: '#recs' });
        const lines = infoSpy.mock.calls.map(c => String(c[0])).filter(l => l.includes('[epochTrigger] Epoch'));
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain(formatEpochStatusLine(status({ jobs_since_last_epoch: 3 })));
    });

    it('when the epoch is due, writes ONE pending proposal with the epoch id and never applies anything', async () => {
        const posted: any[] = [];
        routeFetch([
            [/\/api\/epochs\/jobs$/, () => status({ jobs_since_last_epoch: 5, due: true })],
            [/\/api\/epochs\/proposals\?status=pending/, () => ({ proposals: [], count: 0, pending: 0 })],
            [/\/api\/epochs\/proposals$/, (_u, init) => { posted.push(JSON.parse(String(init?.body))); return { ok: true, id: 'prop_1' }; }],
        ]);
        const r = await recordJobCompletion('run-gamma', { deliverable: '#slides' });
        expect(r.status?.due).toBe(true);
        expect(r.proposed).toBe(true);
        expect(r.proposalId).toBe('prop_1');
        expect(posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({ kind: 'epoch_due', target_layer: 'epoch', epoch_id: 4, risk_class: 'low_risk', gate_verdict: null });
        expect(posted[0].summary).toMatch(/Epoch 4 due/);
        // nothing on the skill-write or epoch-apply surfaces
        expect(calls(/\/api\/skill\/write/).length).toBe(0);
    });

    it('does not duplicate a pending proposal for the same next epoch', async () => {
        routeFetch([
            [/\/api\/epochs\/jobs$/, () => status({ jobs_since_last_epoch: 7, due: true })],
            [/\/api\/epochs\/proposals\?status=pending/, () => ({ proposals: [{ id: 'prop_existing', target_layer: 'epoch', epoch_id: 4, status: 'pending' }], count: 1, pending: 1 })],
            [/\/api\/epochs\/proposals$/, () => ({ ok: true, id: 'prop_should_not_happen' })],
        ]);
        const r = await recordJobCompletion('run-delta');
        expect(r.proposed).toBe(false);
        expect(r.proposalId).toBe('prop_existing');
        expect(calls(/\/api\/epochs\/proposals$/, 'POST').length).toBe(0);
    });

    it('resets the local counter when the ledger gained a new epoch', async () => {
        let counterOnDisk = JSON.stringify({ jobs_since_last_epoch: 4, since_epoch_at: '2026-08-01 00:00Z', runs: ['old-1', 'old-2', 'old-3', 'old-4'], updated_at: '' });
        routeFetch([
            [/\/api\/epochs\/jobs$/, () => ({ __status: 404 })],
            [/\/api\/epochs\/status/, () => status({ jobs_since_last_epoch: 0, last_epoch_at: '2026-09-30 12:00Z', next_epoch_id: 5 })],
            [new RegExp(`/api/wiki/read/${EPOCH_JOB_COUNTER_PATH}`), () => ({ content: counterOnDisk, exists: true })],
            [/\/api\/wiki\/write$/, (_u, init) => { counterOnDisk = JSON.parse(String(init?.body)).content; return { status: 'ok' }; }],
        ]);
        const r = await recordJobCompletion('run-epsilon');
        expect(r.status?.jobs_since_last_epoch).toBe(1);
        const persisted = JSON.parse(counterOnDisk);
        expect(persisted.since_epoch_at).toBe('2026-09-30 12:00Z');
        expect(persisted.runs).toEqual(['run-epsilon']);
    });

    it('ensureEpochDueProposal returns null id when the ledger is unreachable (never throws)', async () => {
        fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
        const r = await ensureEpochDueProposal(status({ due: true }));
        expect(r).toEqual({ id: null, created: false });
    });
});

describe('emitDeliverable -> epochTrigger wiring', () => {
    it('calls recordJobCompletion with the run id after an AIR is emitted', async () => {
        vi.resetModules();
        const record = vi.fn().mockResolvedValue({ status: null, counted: true, proposalId: null, proposed: false, statusLine: '' });
        vi.doMock('./epochTrigger', () => ({ recordJobCompletion: record }));
        routeFetch([[/.*/, () => ({ ok: true, status: 'ok' })]]);
        const { setEngagementSlug } = await import('./runState');
        setEngagementSlug('eng-wiring');
        const { emitDeliverable } = await import('./emitDeliverable');
        await emitDeliverable<{ text: string }>({
            deliverable: '#themes',
            step_label: 'themes',
            model_id: 'gemini-3.5-flash',
            prompt: 'p',
            started_at: Date.now(),
            emit: async () => ({ text: 'Alumni drop off at three stages the advancement team cannot see.' }),
            extractText: r => r.text,
            air: { trigger: '#themes', objective: 'retention', runId: 'eng-wiring' },
        });
        // the hook is fire-and-forget; let the microtask queue drain
        await new Promise(r => setTimeout(r, 0));
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toBe('eng-wiring');
        expect(record.mock.calls[0][1]).toMatchObject({ deliverable: '#themes' });
        vi.doUnmock('./epochTrigger');
    });
});
