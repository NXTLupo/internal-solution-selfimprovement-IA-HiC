/** DF-B stagnation + loop guards: the two failure modes COMPOSER_MAX_ITERATIONS misses. */
import { describe, it, expect, beforeEach } from 'vitest';
import { noteResult, noteAttempt, resetProgress, jaccard, runBoundedLoop } from './progressGuard';

beforeEach(() => resetProgress());

describe('noteResult (result-quality guard)', () => {
    it('treats an empty result as no-new-info and warns with an actionable hint', () => {
        const d = noteResult('r1', 'retrieval', { ok: true, emptyResult: true });
        expect(d.state).toBe('warned');
        expect(d.blocked).toBe(false);
        expect(d.hint).toMatch(/nothing new/i);
    });

    it('catches the loop that returns the SAME content again (the real composer failure)', () => {
        const draft = 'The advancement team answers alumni email in weeks, not days, and gift officers never see the attendance list.';
        expect(noteResult('r1', 'composer', { ok: true, output: draft }).state).toBe('active');
        const second = noteResult('r1', 'composer', { ok: true, output: draft });
        expect(second.state).toBe('warned');
        expect(second.hint).toMatch(/same content/i);
    });

    it('real progress resets the ladder: a step that recovers is not on probation', () => {
        noteResult('r1', 'composer', { ok: true, emptyResult: true });
        const good = noteResult('r1', 'composer', { ok: true, output: 'A genuinely different draft naming the registrar and the CRM.' });
        expect(good.state).toBe('active');
        expect(good.strikes).toBe(0);
    });

    it('blocks immediately on a terminal problem (auth/config), never retrying it', () => {
        const d = noteResult('r1', 'anthropic', { ok: false, recoverableByModel: false, nextAction: 'stop' });
        expect(d.blocked).toBe(true);
        expect(d.stopReason).toBe('no_progress');
    });

    it('escalates a non-model-fixable retryable failure to blocked after the warn budget', () => {
        const sig = { ok: false, recoverableByModel: false, nextAction: 'try_alternative' };
        expect(noteResult('r1', 'gemini', sig).blocked).toBe(false);
        expect(noteResult('r1', 'gemini', sig).blocked).toBe(false);
        expect(noteResult('r1', 'gemini', sig).blocked).toBe(true);
    });

    it('scopes state per run and per step', () => {
        noteResult('r1', 'a', { ok: false, recoverableByModel: false, nextAction: 'stop' });
        expect(noteResult('r2', 'a', { ok: true, output: 'fresh' }).state).toBe('active');
    });
});

describe('noteAttempt (call-pattern guard)', () => {
    it('hard-stops a loop issuing identical attempts', () => {
        const sig = 'regen slide 3 with the same prompt';
        expect(noteAttempt('r1', 'repair', sig).blocked).toBe(false);
        expect(noteAttempt('r1', 'repair', sig).blocked).toBe(false);
        const third = noteAttempt('r1', 'repair', sig);
        expect(third.blocked).toBe(true);
        expect(third.stopReason).toBe('loop_capped');
    });

    it('varied attempts are not a loop', () => {
        expect(noteAttempt('r1', 'repair', 'slide 1').blocked).toBe(false);
        expect(noteAttempt('r1', 'repair', 'slide 2').blocked).toBe(false);
        expect(noteAttempt('r1', 'repair', 'slide 3').blocked).toBe(false);
    });
});

describe('jaccard', () => {
    it('scores identical and disjoint sets at the bounds', () => {
        expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
        expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
    });
});

describe('runBoundedLoop', () => {
    it('returns the last value with iteration_capped instead of throwing', async () => {
        // Each pass must produce genuinely different prose, or the stagnation
        // guard (correctly) ends the loop before the iteration ceiling.
        const drafts = [
            'The registrar exports enrollment weekly and nobody reads the file.',
            'Gift officers never see the attendance list after an event closes.',
            'Advisors carry four hundred students and triage by whoever emails.',
        ];
        const res = await runBoundedLoop('r1', 'compose', 3, async (i) => ({ done: false, value: drafts[i], output: drafts[i] }));
        expect(res.stopReason).toBe('iteration_capped');
        expect(res.value).toBe(drafts[2]);
    });

    it('stops early when the loop stalls instead of paying for every pass', async () => {
        let calls = 0;
        const res = await runBoundedLoop('r1', 'compose', 8, async () => {
            calls++;
            return { done: false, value: 'same', output: '' };
        });
        expect(res.stopReason).toBe('no_progress');
        expect(res.iterations).toBeLessThan(8);
        expect(calls).toBeLessThan(8);
    });

    it('a completed loop reports no stop reason', async () => {
        const res = await runBoundedLoop('r1', 'compose', 5, async (i) => ({ done: i === 1, value: `v${i}`, output: `v${i}` }));
        expect(res.stopReason).toBeUndefined();
        expect(res.value).toBe('v1');
    });
});
