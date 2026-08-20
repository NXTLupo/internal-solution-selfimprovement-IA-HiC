/** DF-A1 typed step envelope: one classification table, derived attributes. */
import { describe, it, expect } from 'vitest';
import {
    classifyError, ok, partial, fail, refuse, runStep, runStepSync, hasUsableValue, envelopeTrace,
} from './stepEnvelope';

describe('classifyError', () => {
    it('routes the failures HiC actually hits to actionable next steps', () => {
        expect(classifyError('401 Unauthorized')).toMatchObject({ errorType: 'auth', nextAction: 'stop', recoverableByModel: false });
        expect(classifyError('429 RESOURCE_EXHAUSTED')).toMatchObject({ errorType: 'rate_limited', nextAction: 'try_alternative' });
        expect(classifyError('fetch failed: ECONNRESET')).toMatchObject({ errorType: 'transient', nextAction: 'try_alternative' });
        // The live 2026-08-17 failure: flash thinking tokens truncated valid JSON.
        expect(classifyError('Unexpected end of JSON input')).toMatchObject({ errorType: 'truncated', nextAction: 'retry_same', recoverableByModel: true });
        expect(classifyError('no results found for query')).toMatchObject({ errorType: 'no_results', nextAction: 'rewrite_query' });
    });

    it('does not read a year or a longer number as an HTTP status', () => {
        expect(classifyError('the 2026 outlook for 5049 respondents').errorType).toBe('unknown');
        expect(classifyError('server returned 503').errorType).toBe('transient');
    });

    it('falls back to a recoverable unknown rather than guessing', () => {
        expect(classifyError('something odd happened')).toMatchObject({ errorType: 'unknown', recoverableByModel: true, nextAction: 'try_alternative' });
    });
});

describe('constructors', () => {
    it('ok carries the value and continues', () => {
        const e = ok('retrieval:pickChunks', [1, 2, 3]);
        expect(e).toMatchObject({ status: 'success', nextAction: 'continue', errorType: null });
        expect(hasUsableValue(e)).toBe(true);
    });

    it('partial keeps usable output and derives the action from the problem', () => {
        const e = partial('gen:deck', ['slide'], 'response was truncated');
        expect(e.status).toBe('partial');
        expect(e.errorType).toBe('truncated');
        expect(hasUsableValue(e)).toBe(true);
    });

    it('fail never claims a value and derives attributes from an explicit errorType', () => {
        const e = fail('wiki:write', new Error('boom'), { errorType: 'stale_write' });
        expect(e).toMatchObject({ status: 'error', errorType: 'stale_write', nextAction: 'retry_same', recoverableByModel: true, source: 'exception' });
        expect(hasUsableValue(e)).toBe(false);
    });

    it('refuse is a gate verdict: the machinery worked, the OUTPUT failed, so narrow', () => {
        const e = refuse('gate:evidenceSlots', ['slide'], '2 unsupported claims');
        expect(e).toMatchObject({ status: 'partial', source: 'gate', nextAction: 'narrow_scope' });
        expect(hasUsableValue(e)).toBe(true);
    });
});

describe('runStep', () => {
    it('converts a throw into an envelope instead of a silent catch', async () => {
        const e = await runStep('x:y', async () => { throw new Error('rate limit exceeded'); });
        expect(e.status).toBe('error');
        expect(e.errorType).toBe('rate_limited');
        expect(e.nextAction).toBe('try_alternative');
    });

    it('passes the value through on success', async () => {
        const e = await runStep('x:y', async () => 42);
        expect(e.value).toBe(42);
    });

    it('runStepSync behaves identically for gates and pure transforms', () => {
        expect(runStepSync('g', () => 'v').value).toBe('v');
        expect(runStepSync('g', () => { throw new Error('invalid shape'); }).errorType).toBe('schema_invalid');
    });
});

describe('envelopeTrace', () => {
    it('records the decision fields and never the message text', () => {
        const t = envelopeTrace(fail('s', new Error('secret internals 500')));
        expect(t).toEqual({ stepId: 's', status: 'error', errorType: 'internal', nextAction: 'stop' });
        expect(JSON.stringify(t)).not.toContain('secret');
    });
});
