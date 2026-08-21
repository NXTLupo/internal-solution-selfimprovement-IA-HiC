/**
 * DF-A2. The point of this ledger is that a degraded turn is DISTINGUISHABLE from
 * a clean one, so the tests assert exactly that: an enrichment step that throws,
 * and one that quietly returns nothing, both land in the record.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    beginGenerationLedger, enrich, readGenerationLedger, buildEnrichmentRecord,
    buildDegradationNotice, resetGenerationLedgers, noteGenerationStep,
} from './generationLedger';
import { ok } from './stepEnvelope';

beforeEach(() => {
    resetGenerationLedgers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('enrichment never throws and is always recorded', () => {
    it('records a success with its value', async () => {
        beginGenerationLedger('t1');
        const env = await enrich('gen:designTokens', async () => 'token block');
        expect(env.status).toBe('success');
        expect(env.value).toBe('token block');
        expect(readGenerationLedger('t1')).toHaveLength(1);
    });

    it('swallows a throw, classifies it, and keeps the turn alive', async () => {
        beginGenerationLedger('t1');
        const env = await enrich('gen:designTokens', async () => { throw new Error('failed to fetch'); });
        expect(env.status).toBe('error');
        expect(env.errorType).toBe('transient');
        const record = buildEnrichmentRecord('t1');
        expect(record.degraded).toBe(1);
        expect(record.losses[0]).toMatchObject({ stepId: 'gen:designTokens', weight: 'material', errorType: 'transient' });
    });

    it('catches the failure the console.warn version could not see: an EMPTY success', async () => {
        beginGenerationLedger('t1');
        await enrich('gen:exemplarContract', async () => null);
        const record = buildEnrichmentRecord('t1');
        expect(record.degraded).toBe(1);
        expect(record.losses[0].empty).toBe(true);
        expect(record.losses[0].errorType).toBeNull();
    });
});

describe('weights separate a thin deck from a broken one', () => {
    it('reports grounding intact when only minor steps degraded', async () => {
        beginGenerationLedger('t1');
        await enrich('gen:componentSpec', async () => { throw new Error('404 not found'); });
        await enrich('gen:manifestGrounding', async () => ['chunk']);
        const record = buildEnrichmentRecord('t1');
        expect(record.groundingIntact).toBe(true);
        expect(buildDegradationNotice(record)).toBe('');
    });

    it('reports grounding LOST and emits a narrowing notice when a critical step fails', async () => {
        beginGenerationLedger('t1');
        await enrich('gen:manifestGrounding', async () => { throw new Error('empty corpus'); });
        const record = buildEnrichmentRecord('t1');
        expect(record.groundingIntact).toBe(false);
        const notice = buildDegradationNotice(record);
        expect(notice).toContain('RETRIEVAL DEGRADED');
        expect(notice).toContain('manifestGrounding');
        expect(notice).toMatch(/Do not assert a finding you cannot point at/);
    });

    it('orders losses worst-weight first', async () => {
        beginGenerationLedger('t1');
        await enrich('gen:componentSpec', async () => { throw new Error('boom'); });
        await enrich('gen:groundingProjection', async () => { throw new Error('boom'); });
        await enrich('gen:designTokens', async () => { throw new Error('boom'); });
        const record = buildEnrichmentRecord('t1');
        expect(record.losses.map(l => l.weight)).toEqual(['critical', 'material', 'minor']);
    });
});

describe('the record itself', () => {
    it('summarizes a clean turn honestly', async () => {
        beginGenerationLedger('t1');
        await enrich('gen:designTokens', async () => 'x');
        await enrich('gen:wikiPrefetch', async () => ['a']);
        const record = buildEnrichmentRecord('t1');
        expect(record.summary).toBe('all 2 enrichment step(s) succeeded');
        expect(record.trace).toHaveLength(2);
        expect(record.trace[0]).toMatchObject({ stepId: 'gen:designTokens', status: 'success' });
    });

    it('reports an empty ledger as empty rather than as a pass', () => {
        beginGenerationLedger('t1');
        expect(buildEnrichmentRecord('t1').summary).toBe('no enrichment steps recorded');
    });

    it('keeps turns separate', async () => {
        beginGenerationLedger('turnA');
        await enrich('gen:designTokens', async () => 'x', { turnId: 'turnA' });
        beginGenerationLedger('turnB');
        await enrich('gen:designTokens', async () => { throw new Error('boom'); }, { turnId: 'turnB' });
        expect(buildEnrichmentRecord('turnA').degraded).toBe(0);
        expect(buildEnrichmentRecord('turnB').degraded).toBe(1);
    });

    it('ignores a note for a turn that was never opened', () => {
        noteGenerationStep(ok('gen:designTokens', 'x'), 'never-began');
        expect(readGenerationLedger('never-began')).toHaveLength(0);
    });
});
