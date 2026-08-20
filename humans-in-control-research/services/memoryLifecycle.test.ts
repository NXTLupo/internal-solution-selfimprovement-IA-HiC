/**
 * DF-D second-brain lifecycle. The acceptance fixture from the plan: 40 facts
 * across 6 categories, three stale and eight fragmented in one category, must
 * produce (a) zero admitted session-scoped facts, (b) exactly the protected set
 * surviving staleness, (c) one consolidated fact carrying the EARLIEST source
 * deadline, (d) shadow-mode disagreement logged with nothing evicted.
 */
import { describe, it, expect } from 'vitest';
import {
    admitFacts, mergeFacts, factId,
    selectStaleCandidates, applyStalenessDecisions,
    selectConsolidationGroups, applyConsolidation,
    detectReinforcement, applyReinforcement,
    evictToCapacity, hybridScore, renderFactsForInjection,
    runLifecyclePass, DEFAULT_CONFIG,
    type MemoryFact, type ProposedFact,
} from './memoryLifecycle';

const NOW = '2026-08-20T00:00:00.000Z';
const daysAgo = (n: number) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

const fact = (over: Partial<MemoryFact> = {}): MemoryFact => ({
    id: over.id || factId(over.content || 'a fact'),
    content: over.content || 'a fact',
    category: over.category || 'context',
    confidence: over.confidence ?? 0.9,
    scope: over.scope || 'user',
    durability: over.durability || 'durable',
    authority: over.authority || 'descriptive',
    createdAt: over.createdAt || daysAgo(10),
    expectedValidDays: over.expectedValidDays ?? 90,
    confirmationCount: over.confirmationCount ?? 0,
    sourceRunIds: over.sourceRunIds || ['r0'],
    lastConfirmedAt: over.lastConfirmedAt,
    lastAccessedAt: over.lastAccessedAt,
});

describe('admission gate (fail-closed, per item, observable)', () => {
    const base: ProposedFact = {
        content: 'The owner rejects raster slide exports', category: 'preference',
        confidence: 0.95, scope: 'user', durability: 'durable', authority: 'descriptive',
    };

    it('admits a fully labeled durable descriptive fact', () => {
        const r = admitFacts([base], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted).toHaveLength(1);
        expect(r.rejectedByScopeGate).toBe(0);
    });

    it('rejects a session-scoped fact so it can never leak into a later engagement', () => {
        const r = admitFacts([{ ...base, scope: 'session' }], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted).toHaveLength(0);
        expect(r.rejectedByScopeGate).toBe(1);
        expect(r.rejected[0].reason).toMatch(/scope gate/);
    });

    it('rejects a fact with MISSING labels rather than defaulting it to durable', () => {
        const { scope, ...unlabeled } = base as any;
        const r = admitFacts([unlabeled], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted).toHaveLength(0);
        expect(r.rejectedByScopeGate).toBe(1);
    });

    it('rejects transactional authority and temporary durability', () => {
        expect(admitFacts([{ ...base, authority: 'transactional' }], 'r1', DEFAULT_CONFIG, NOW).admitted).toHaveLength(0);
        expect(admitFacts([{ ...base, durability: 'temporary' }], 'r1', DEFAULT_CONFIG, NOW).admitted).toHaveLength(0);
    });

    it('rejects below-threshold confidence without counting it as a scope failure', () => {
        const r = admitFacts([{ ...base, confidence: 0.4 }], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted).toHaveLength(0);
        expect(r.rejectedByScopeGate).toBe(0);
    });

    it('one bad item never aborts the batch', () => {
        const r = admitFacts([base, { ...base, content: 'second', scope: 'session' }, { ...base, content: 'third' }], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted).toHaveLength(2);
        expect(r.rejected).toHaveLength(1);
    });

    it('clamps an over-long expectedValidDays at creation time', () => {
        const r = admitFacts([{ ...base, expectedValidDays: 999_999 }], 'r1', DEFAULT_CONFIG, NOW);
        expect(r.admitted[0].expectedValidDays).toBe(DEFAULT_CONFIG.stalenessAgeDays * DEFAULT_CONFIG.stalenessMaxLifetimeMultiplier);
    });

    it('mergeFacts dedupes by content id and unions provenance', () => {
        const a = admitFacts([base], 'r1', DEFAULT_CONFIG, NOW).admitted;
        const b = admitFacts([base], 'r2', DEFAULT_CONFIG, NOW).admitted;
        const merged = mergeFacts(a, b);
        expect(merged).toHaveLength(1);
        expect(merged[0].sourceRunIds).toEqual(['r1', 'r2']);
    });
});

describe('staleness', () => {
    it('selects only facts past their OWN window and never a protected category', () => {
        const facts = [
            fact({ content: 'stale', createdAt: daysAgo(200), expectedValidDays: 90 }),
            fact({ content: 'fresh', createdAt: daysAgo(10), expectedValidDays: 90 }),
            fact({ content: 'old correction', category: 'correction', createdAt: daysAgo(400), expectedValidDays: 30 }),
        ];
        const c = selectStaleCandidates(facts, DEFAULT_CONFIG, NOW);
        expect(c.map(f => f.content)).toEqual(['stale']);
    });

    it('a confirmation resets the staleness clock', () => {
        const facts = [fact({ content: 'confirmed recently', createdAt: daysAgo(300), expectedValidDays: 90, lastConfirmedAt: daysAgo(5) })];
        expect(selectStaleCandidates(facts, DEFAULT_CONFIG, NOW)).toHaveLength(0);
    });

    it('refuses a removal the model proposed for a NON-candidate', () => {
        const facts = [fact({ id: 'keep', content: 'fresh', createdAt: daysAgo(2) })];
        const r = applyStalenessDecisions(facts, [{ id: 'keep', verdict: 'REMOVE' }], DEFAULT_CONFIG, NOW);
        expect(r.facts).toHaveLength(1);
        expect(r.refused[0].reason).toMatch(/not an aged candidate/);
    });

    it('caps removals per cycle and keeps the lowest-confidence ones', () => {
        const cfg = { ...DEFAULT_CONFIG, stalenessMaxRemovalsPerCycle: 2 };
        const facts = [0.9, 0.5, 0.3, 0.7].map((c, i) => fact({ id: `f${i}`, content: `s${i}`, confidence: c, createdAt: daysAgo(200) }));
        const r = applyStalenessDecisions(facts, facts.map(f => ({ id: f.id, verdict: 'REMOVE' as const })), cfg, NOW);
        expect(r.removed.sort()).toEqual(['f1', 'f2']);
        expect(r.refused.some(x => /removal cap/.test(x.reason))).toBe(true);
    });

    it('never extends a fact it also proposed for removal', () => {
        const facts = [fact({ id: 'f1', content: 's', createdAt: daysAgo(200), expectedValidDays: 90 })];
        const cfg = { ...DEFAULT_CONFIG, stalenessMaxRemovalsPerCycle: 0 };
        const r = applyStalenessDecisions(facts, [
            { id: 'f1', verdict: 'REMOVE' }, { id: 'f1', verdict: 'EXTEND', extendByDays: 900 },
        ], cfg, NOW);
        expect(r.facts[0].expectedValidDays).toBe(90);
        expect(r.refused.some(x => /extension ignored/.test(x.reason))).toBe(true);
    });

    it('clamps an extension at the absolute ceiling', () => {
        const facts = [fact({ id: 'f1', content: 's', createdAt: daysAgo(200), expectedValidDays: 90 })];
        const r = applyStalenessDecisions(facts, [{ id: 'f1', verdict: 'EXTEND', extendByDays: 999_999 }], DEFAULT_CONFIG, NOW);
        expect(r.facts[0].expectedValidDays).toBe(DEFAULT_CONFIG.stalenessMaxExtensionDays);
    });
});

describe('consolidation', () => {
    const eight = Array.from({ length: 8 }, (_, i) => fact({
        id: `p${i}`, content: `preference ${i}`, category: 'preference',
        createdAt: daysAgo(100 - i * 10), expectedValidDays: i === 3 ? 30 : 365,
    }));

    it('selects only fragmented categories, largest first, capped per cycle', () => {
        const groups = selectConsolidationGroups([...eight, fact({ content: 'lonely', category: 'goal' })], DEFAULT_CONFIG);
        expect(groups).toHaveLength(1);
        expect(groups[0].category).toBe('preference');
    });

    it('merges and inherits the EARLIEST source review deadline', () => {
        const r = applyConsolidation(eight, [{
            sourceIds: eight.map(f => f.id),
            consolidated: { content: 'the owner prefers native editable exports', category: 'preference', confidence: 0.95, scope: 'user', durability: 'durable', authority: 'descriptive' },
        }], DEFAULT_CONFIG, NOW);
        expect(r.facts).toHaveLength(1);
        const merged = r.facts[0];
        // p3 was volatile (30d from 70 days ago -> deadline 40 days ago), so the
        // merged fact must already be due for review, not inherit 365 days.
        expect(merged.expectedValidDays).toBeLessThan(30);
        expect(merged.createdAt).toBe(eight[7].createdAt);   // newest source
    });

    it('refuses overlapping source sets, unknown ids, oversized groups and confidence inflation', () => {
        const two = eight.slice(0, 2);
        const good = { content: 'merged', category: 'preference' as const, confidence: 0.9, scope: 'user' as const, durability: 'durable' as const, authority: 'descriptive' as const };
        const r = applyConsolidation(eight, [
            { sourceIds: [two[0].id, two[1].id], consolidated: good },
            { sourceIds: [two[1].id, eight[2].id], consolidated: good },      // overlap
            { sourceIds: ['nope', eight[3].id], consolidated: good },         // unknown id
            { sourceIds: eight.map(f => f.id).slice(0, 9), consolidated: good }, // over cap
        ], { ...DEFAULT_CONFIG, consolidationMaxSources: 4 }, NOW);
        expect(r.refused.map(x => x.reason)).toEqual(expect.arrayContaining([
            expect.stringMatching(/already consumed/),
            expect.stringMatching(/unknown source id/),
            expect.stringMatching(/source cap/),
        ]));
    });

    it('caps merged confidence at the source maximum', () => {
        const two = [fact({ id: 'a', content: 'a', confidence: 0.75 }), fact({ id: 'b', content: 'b', confidence: 0.8 })];
        const r = applyConsolidation(two, [{
            sourceIds: ['a', 'b'],
            consolidated: { content: 'merged claim', category: 'context', confidence: 0.99, scope: 'user', durability: 'durable', authority: 'descriptive' },
        }], DEFAULT_CONFIG, NOW);
        expect(r.facts[0].confidence).toBe(0.8);
    });
});

describe('reinforcement (deterministic signal only)', () => {
    it('detects a real confirmation in the user\'s own words', () => {
        expect(detectReinforcement(['that is exactly right, keep doing that']).confirmed).toBe(true);
        expect(detectReinforcement(['perfect.']).confirmed).toBe(true);
    });

    it('does not treat a bare yes or an ordinary sentence as confirmation', () => {
        expect(detectReinforcement(['yes I uploaded the file']).confirmed).toBe(false);
        expect(detectReinforcement(['ok now do the deck']).confirmed).toBe(false);
    });

    it('ignores the model nomination when the user never confirmed', () => {
        const facts = [fact({ id: 'f1' })];
        const r = applyReinforcement(facts, ['f1'], ['make the deck shorter'], NOW);
        expect(r.confirmed).toEqual([]);
        expect(r.ignored).toEqual(['f1']);
        expect(r.facts[0].lastConfirmedAt).toBeUndefined();
    });

    it('advances the clock only for nominated facts once a signal exists', () => {
        const facts = [fact({ id: 'f1' }), fact({ id: 'f2', content: 'other' })];
        const r = applyReinforcement(facts, ['f1'], ['that is exactly what I wanted'], NOW);
        expect(r.confirmed).toEqual(['f1']);
        expect(r.facts[0].lastConfirmedAt).toBe(NOW);
        expect(r.facts[1].lastConfirmedAt).toBeUndefined();
    });
});

describe('capacity eviction', () => {
    it('does nothing under capacity', () => {
        const r = evictToCapacity([fact()], DEFAULT_CONFIG, NOW);
        expect(r.evicted).toEqual([]);
    });

    it('reserves a floor for corrections and evicts the weakest others', () => {
        const cfg = { ...DEFAULT_CONFIG, maxFacts: 4, evictionCorrectionReservedFraction: 0.25 };
        const facts = [
            fact({ id: 'c1', content: 'c1', category: 'correction', confidence: 0.71 }),
            ...[0.99, 0.98, 0.97, 0.96].map((c, i) => fact({ id: `k${i}`, content: `k${i}`, confidence: c })),
        ];
        const r = evictToCapacity(facts, cfg, NOW);
        expect(r.facts.map(f => f.id)).toContain('c1');
        expect(r.facts).toHaveLength(4);
    });

    it('shadow mode reports disagreement and enforces nothing extra', () => {
        const cfg = { ...DEFAULT_CONFIG, maxFacts: 2, evictionPolicy: 'confidence' as const, evictionShadowEnabled: true };
        const facts = [
            fact({ id: 'a', content: 'a', confidence: 0.95 }),
            fact({ id: 'b', content: 'b', confidence: 0.90, lastConfirmedAt: daysAgo(1), lastAccessedAt: daysAgo(1) }),
            fact({ id: 'c', content: 'c', confidence: 0.92 }),
        ];
        const r = evictToCapacity(facts, cfg, NOW);
        expect(r.facts.map(f => f.id)).toEqual(['a', 'c']);        // confidence enforced
        expect(r.shadowDisagreement).toContain('b');               // hybrid would keep b
    });

    it('hybridScore rewards a recent confirmation over raw confidence alone', () => {
        const cold = fact({ confidence: 0.9 });
        const warm = fact({ confidence: 0.9, lastConfirmedAt: daysAgo(1), lastAccessedAt: daysAgo(1) });
        expect(hybridScore(warm, DEFAULT_CONFIG, NOW)).toBeGreaterThan(hybridScore(cold, DEFAULT_CONFIG, NOW));
    });
});

describe('runLifecyclePass (the acceptance fixture)', () => {
    it('admits, protects, consolidates and reports every refusal', () => {
        const store: MemoryFact[] = [
            ...Array.from({ length: 8 }, (_, i) => fact({
                id: `p${i}`, content: `preference ${i}`, category: 'preference',
                createdAt: daysAgo(100 - i * 5), expectedValidDays: i === 2 ? 20 : 365,
            })),
            fact({ id: 's1', content: 'stale one', createdAt: daysAgo(300) }),
            fact({ id: 's2', content: 'stale two', createdAt: daysAgo(280) }),
            fact({ id: 's3', content: 'stale three', createdAt: daysAgo(260) }),
            fact({ id: 'cor', content: 'never use raster slides', category: 'correction', createdAt: daysAgo(500), expectedValidDays: 30 }),
        ];

        const { facts, report } = runLifecyclePass(store, {
            runId: 'r9',
            nowIso: NOW,
            proposed: [
                { content: 'the owner reviews decks in the browser', category: 'behavior', confidence: 0.9, scope: 'user', durability: 'durable', authority: 'descriptive' },
                { content: 'this session used the executive-search pack', category: 'context', confidence: 0.9, scope: 'session', durability: 'durable', authority: 'descriptive' },
            ],
            stalenessDecisions: [
                { id: 's1', verdict: 'REMOVE', reason: 'superseded' },
                { id: 'cor', verdict: 'REMOVE', reason: 'model tried to drop a correction' },
            ],
            consolidationProposals: [{
                sourceIds: Array.from({ length: 8 }, (_, i) => `p${i}`),
                consolidated: { content: 'the owner prefers native editable exports with token-bound styling', category: 'preference', confidence: 0.95, scope: 'user', durability: 'durable', authority: 'descriptive' },
            }],
            reinforceIds: ['s2'],
            userMessages: ['make it shorter'],   // no confirmation signal
        });

        expect(report.admitted).toBe(1);                    // session-scoped one refused
        expect(report.rejectedByScopeGate).toBe(1);
        expect(report.removed).toBe(1);                     // s1 only
        expect(facts.some(f => f.id === 'cor')).toBe(true); // the correction survived
        expect(report.merged).toBe(8);
        expect(report.confirmed).toBe(0);                   // nomination without a signal
        expect(report.refusals.some(r => /correction|not an aged candidate/.test(r))).toBe(true);
    });
});

describe('renderFactsForInjection', () => {
    it('orders by confirmation recency and respects the budget', () => {
        const facts = [
            fact({ id: 'a', content: 'older', createdAt: daysAgo(50) }),
            fact({ id: 'b', content: 'confirmed yesterday', createdAt: daysAgo(60), lastConfirmedAt: daysAgo(1) }),
        ];
        const out = renderFactsForInjection(facts);
        expect(out.split('\n')[0]).toContain('confirmed yesterday');
        expect(renderFactsForInjection(facts, 20).split('\n')).toHaveLength(1);
    });
});
