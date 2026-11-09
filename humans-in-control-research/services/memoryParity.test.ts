/**
 * WS-B B1 (2026-10-31, plan agent-stack-shared-memory-skills-uplift): the TS/Python memory parity pin.
 *
 * The proxy's /api/memory/* door runs proxy/memory_store.py, a port of memoryLifecycle.ts and
 * memoryRetrieval.ts. Two implementations of one rule set drift unless something pins them: this test
 * computes every case in evals/fixtures/memory-parity.json with the TS reference and compares it to the
 * fixture's `expected`; proxy/tests/test_memory_store.py compares the Python port to the SAME `expected`.
 * Regenerate after an intentional TS change with UPDATE_MEMORY_PARITY=1 (then the Python test must pass).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    factId, admitFacts, mergeFacts, evictToCapacity, applyStalenessDecisions, selectStaleCandidates,
    applyConsolidation, selectConsolidationGroups, applyReinforcement, runLifecyclePass, renderFactsForInjection,
    DEFAULT_CONFIG, type MemoryFact,
} from './memoryLifecycle';
import { salientTerms, selectMemoryFacts } from './memoryRetrieval';

const FIXTURE = resolve(__dirname, '..', 'evals', 'fixtures', 'memory-parity.json');
const r10 = (x: number) => Math.round(x * 1e10) / 1e10;

export function computeParity(doc: any) {
    const now = doc.now;
    const I = doc.inputs;
    const cfg = (o?: any) => ({ ...DEFAULT_CONFIG, ...(o || {}) });
    const ids = (fs: MemoryFact[]) => fs.map(f => f.id);
    const ev = evictToCapacity(I.evict.store, cfg(), now);
    const evh = evictToCapacity(I.evictHybrid.store, cfg(I.evictHybrid.cfg), now);
    const st = applyStalenessDecisions(I.staleness.store, I.staleness.decisions, cfg(I.staleness.cfg), now);
    const co = applyConsolidation(I.consolidation.store, I.consolidation.proposals, cfg(), now);
    const rConf = applyReinforcement(I.reinforce.store, I.reinforce.nominated, I.reinforce.confirming, now);
    const rSilent = applyReinforcement(I.reinforce.store, I.reinforce.nominated, I.reinforce.silent, now);
    const life = runLifecyclePass(I.lifecycle.store, { ...I.lifecycle.input, nowIso: now });
    return {
        factId: I.factId.map((s: string) => factId(s)),
        admit: admitFacts(I.admit.proposed, I.admit.runId, cfg(), now),
        merge: mergeFacts(I.merge.store, I.merge.incoming),
        evict: { kept: ids(ev.facts), evicted: ev.evicted, shadowDisagreement: ev.shadowDisagreement },
        evictHybrid: { kept: ids(evh.facts), evicted: evh.evicted, shadowDisagreement: evh.shadowDisagreement },
        staleCandidates: selectStaleCandidates(I.staleness.store, cfg(I.staleness.cfg), now).map(f => f.id),
        staleness: st,
        consolidation: co,
        consolidationGroups: selectConsolidationGroups(I.consolidationGroups.store, cfg(I.consolidationGroups.cfg)),
        reinforceConfirmed: rConf,
        reinforceSilent: rSilent,
        salient: I.salient.map((t: string) => Array.from(salientTerms(t)).sort()),
        select: I.select.objectives.map((o: string) => selectMemoryFacts(I.select.facts, o, { nowIso: now })
            .map(r => ({ id: r.fact.id, relevance: r10(r.relevance), score: r10(r.score) }))),
        lifecycle: { facts: life.facts, report: life.report },
        render: renderFactsForInjection(I.render.facts, I.render.maxChars),
    };
}

describe('memory parity reference (TS)', () => {
    it('matches the pinned expected outputs the Python port is also held to', () => {
        const doc = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        const got = JSON.parse(JSON.stringify(computeParity(doc)));
        if (process.env.UPDATE_MEMORY_PARITY === '1' || !doc.expected) {
            doc.expected = got;
            writeFileSync(FIXTURE, JSON.stringify(doc, null, 1) + '\n', 'utf8');
        }
        expect(got).toEqual(doc.expected);
    });

    it('covers the guardrails the parity is meant to pin (sanity on the fixture itself)', () => {
        const doc = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        const e = doc.expected;
        expect(e.admit.admitted.length).toBeGreaterThanOrEqual(3);
        expect(e.admit.rejectedByScopeGate).toBeGreaterThanOrEqual(3);
        expect(e.evict.evicted.length).toBe(4);
        expect(e.staleness.refused.length).toBeGreaterThan(0);
        expect(e.consolidation.mergedIds.length).toBeGreaterThan(0);
        expect(e.consolidation.refused.length).toBeGreaterThanOrEqual(4);
        expect(e.reinforceConfirmed.confirmed).toEqual(['x401']);
        expect(e.reinforceSilent.confirmed).toEqual([]);
        expect(e.select[0].length).toBeGreaterThan(0);
        expect(e.select[2]).toEqual([]);
    });
});
