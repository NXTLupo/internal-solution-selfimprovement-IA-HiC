/**
 * DF-D - THE SECOND BRAIN AS A LIFECYCLE (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * HiC's second brain grew and never breathed. `learningEngine.reviewConstraintEffectiveness`
 * retires a constraint only after 20 applications below an effectiveness floor,
 * so a constraint that is simply OUT OF DATE lives forever; nothing consolidates
 * fragments; nothing caps capacity; and a "positive signal" was whatever the model
 * said it was. The measured consequence is wiki rot: 17,775 broken links and 103
 * orphan pages.
 *
 * Ported from deer-flow's deermem (`agents/memory/backends/deermem/`), which
 * solves each of those with a specific, guardrailed pass:
 *
 *   1. TYPED FACTS with scope / durability / authority labels.
 *   2. A FAIL-CLOSED ADMISSION GATE: only user-or-engagement + durable +
 *      descriptive facts may be injected into future runs. Per-item rejection
 *      never aborts the batch, and the rejection count is observable, so a broken
 *      prompt template shows up as `rejectedByScopeGate` instead of silently
 *      emptying the store.
 *   3. STALENESS REVIEW with a per-fact `expectedValidDays`, protected categories,
 *      and apply-time guardrails that hold REGARDLESS of what the model proposes.
 *   4. CONSOLIDATION with four guardrails, including the subtle one: the merged
 *      fact inherits the EARLIEST source review deadline, so a volatile detail
 *      cannot hide inside a stable sibling's long window and escape review.
 *   5. REINFORCEMENT ONLY ON A DETERMINISTIC SIGNAL. The model may nominate; only
 *      a regex over the user's own words confirms. This is the antidote to the
 *      self-confirming loop that the RSI survey names as the primary collapse mode.
 *   6. CAPACITY EVICTION, shadow first: compute the hybrid score, log the
 *      disagreement, enforce nothing until the owner has seen it.
 *
 * Every function here is pure and synchronous. The IO wrapper at the bottom is the
 * only part that touches the proxy, so the whole lifecycle is unit-testable.
 */

import { runStep, type StepEnvelope } from './stepEnvelope';

const PROXY_BASE = (import.meta as any)?.env?.VITE_PROXY_BASE || 'http://127.0.0.1:5012';

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

export type FactCategory = 'preference' | 'knowledge' | 'context' | 'behavior' | 'goal' | 'correction';
export type FactScope = 'user' | 'engagement' | 'session';
export type FactDurability = 'durable' | 'temporary';
export type FactAuthority = 'descriptive' | 'transactional';

export interface MemoryFact {
    id: string;
    content: string;
    category: FactCategory;
    /** 0..1. Explicit statement 0.9+, implied 0.6-0.8 (deermem's own calibration). */
    confidence: number;
    scope: FactScope;
    durability: FactDurability;
    authority: FactAuthority;
    createdAt: string;
    /** Days from createdAt before this fact is re-reviewed. */
    expectedValidDays: number;
    lastConfirmedAt?: string;
    confirmationCount: number;
    sourceRunIds: string[];
    /** Decaying retrieval heat, only collected under hybrid or shadow mode. */
    accessCount?: number;
    lastAccessedAt?: string;
}

export interface ProposedFact {
    content: string;
    category?: FactCategory;
    confidence?: number;
    scope?: FactScope;
    durability?: FactDurability;
    authority?: FactAuthority;
    expectedValidDays?: number;
}

export interface LifecycleConfig {
    maxFacts: number;
    factConfidenceThreshold: number;
    stalenessAgeDays: number;
    stalenessMinCandidates: number;
    stalenessMaxRemovalsPerCycle: number;
    stalenessProtectedCategories: FactCategory[];
    stalenessMaxLifetimeMultiplier: number;
    stalenessMaxExtensionDays: number;
    consolidationMinFacts: number;
    consolidationMaxGroupsPerCycle: number;
    consolidationMaxSources: number;
    evictionPolicy: 'confidence' | 'hybrid-v1';
    evictionShadowEnabled: boolean;
    evictionConfidenceWeight: number;
    evictionConfirmationWeight: number;
    evictionAccessWeight: number;
    evictionConfirmationHalfLifeDays: number;
    evictionAccessHalfLifeDays: number;
    evictionCorrectionReservedFraction: number;
}

/** Defaults mirror deermem's shipped values; they are field-tested, not guessed. */
export const DEFAULT_CONFIG: LifecycleConfig = {
    maxFacts: 100,
    factConfidenceThreshold: 0.7,
    stalenessAgeDays: 90,
    stalenessMinCandidates: 3,
    stalenessMaxRemovalsPerCycle: 10,
    stalenessProtectedCategories: ['correction'],
    stalenessMaxLifetimeMultiplier: 20,
    stalenessMaxExtensionDays: 3650,
    consolidationMinFacts: 8,
    consolidationMaxGroupsPerCycle: 3,
    consolidationMaxSources: 8,
    evictionPolicy: 'confidence',
    evictionShadowEnabled: true,
    evictionConfidenceWeight: 0.65,
    evictionConfirmationWeight: 0.25,
    evictionAccessWeight: 0.10,
    evictionConfirmationHalfLifeDays: 90,
    evictionAccessHalfLifeDays: 30,
    evictionCorrectionReservedFraction: 0.10,
};

const DAY_MS = 86_400_000;
const daysBetween = (aIso: string, bIso: string) =>
    Math.max(0, (new Date(bIso).getTime() - new Date(aIso).getTime()) / DAY_MS);

const VALID_CATEGORIES: FactCategory[] = ['preference', 'knowledge', 'context', 'behavior', 'goal', 'correction'];

/** Stable id from content, so the same fact proposed twice cannot duplicate. */
export function factId(content: string): string {
    const norm = content.toLowerCase().replace(/\s+/g, ' ').trim();
    let h = 5381;
    for (let i = 0; i < norm.length; i++) h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
    return `f${(h >>> 0).toString(36)}`;
}

// ---------------------------------------------------------------------------
// 1 + 2. Admission (fail-closed, per item, observable)
// ---------------------------------------------------------------------------

export interface AdmissionResult {
    admitted: MemoryFact[];
    rejected: Array<{ content: string; reason: string }>;
    /** The observable that makes a broken template loud instead of silent. */
    rejectedByScopeGate: number;
}

/**
 * Only a fact that is (user OR engagement) + durable + descriptive may be
 * injected into unrelated future runs. A session-scoped instruction leaking into
 * every future engagement is the classic second-brain failure, and this is the
 * one rule that prevents it. Missing labels are a REJECTION, never a default:
 * defaulting an unlabeled fact to "durable" is how an un-migrated prompt quietly
 * poisons the store.
 */
export function admitFacts(
    proposed: ProposedFact[],
    runId: string,
    cfg: LifecycleConfig = DEFAULT_CONFIG,
    nowIso = new Date().toISOString(),
): AdmissionResult {
    const admitted: MemoryFact[] = [];
    const rejected: AdmissionResult['rejected'] = [];
    let byScope = 0;
    const seen = new Set<string>();

    for (const p of proposed || []) {
        const content = String(p?.content || '').trim();
        if (!content) { rejected.push({ content: '', reason: 'empty content' }); continue; }

        if (!p.category || !VALID_CATEGORIES.includes(p.category)) {
            rejected.push({ content, reason: 'missing or invalid category' }); byScope++; continue;
        }
        if (!p.scope || !p.durability || !p.authority) {
            rejected.push({ content, reason: 'missing scope/durability/authority label' }); byScope++; continue;
        }
        if (p.scope === 'session' || p.durability !== 'durable' || p.authority !== 'descriptive') {
            rejected.push({ content, reason: `scope gate: ${p.scope}/${p.durability}/${p.authority}` }); byScope++; continue;
        }
        const confidence = typeof p.confidence === 'number' ? p.confidence : 0;
        if (confidence < cfg.factConfidenceThreshold) {
            rejected.push({ content, reason: `confidence ${confidence} below ${cfg.factConfidenceThreshold}` }); continue;
        }

        const id = factId(content);
        if (seen.has(id)) { rejected.push({ content, reason: 'duplicate in batch' }); continue; }
        seen.add(id);

        // Creation-time clamp: the model cannot defer its own first review forever.
        const creationCap = cfg.stalenessAgeDays * cfg.stalenessMaxLifetimeMultiplier;
        const expected = Math.min(
            Math.max(1, Math.round(p.expectedValidDays ?? cfg.stalenessAgeDays)),
            creationCap,
        );

        admitted.push({
            id, content, category: p.category, confidence,
            scope: p.scope, durability: p.durability, authority: p.authority,
            createdAt: nowIso, expectedValidDays: expected,
            confirmationCount: 0, sourceRunIds: [runId],
        });
    }
    return { admitted, rejected, rejectedByScopeGate: byScope };
}

/** Merge admitted facts into a store, deduping by id and unioning provenance. */
export function mergeFacts(store: MemoryFact[], incoming: MemoryFact[]): MemoryFact[] {
    const byId = new Map(store.map(f => [f.id, { ...f }]));
    for (const f of incoming) {
        const prior = byId.get(f.id);
        if (!prior) { byId.set(f.id, f); continue; }
        prior.confidence = Math.max(prior.confidence, f.confidence);
        prior.sourceRunIds = Array.from(new Set([...prior.sourceRunIds, ...f.sourceRunIds]));
    }
    return Array.from(byId.values());
}

// ---------------------------------------------------------------------------
// 3. Staleness
// ---------------------------------------------------------------------------

export interface StalenessDecision {
    id: string;
    verdict: 'KEEP' | 'REMOVE' | 'EXTEND';
    reason?: string;
    extendByDays?: number;
}

/**
 * A fact is a candidate only when it has passed its OWN review window and its
 * category is not protected. Protected categories default to `correction`:
 * removing a correction re-opens a mistake the user already fixed.
 */
export function selectStaleCandidates(
    facts: MemoryFact[],
    cfg: LifecycleConfig = DEFAULT_CONFIG,
    nowIso = new Date().toISOString(),
): MemoryFact[] {
    return (facts || []).filter(f => {
        if (cfg.stalenessProtectedCategories.includes(f.category)) return false;
        const clock = f.lastConfirmedAt || f.createdAt;   // a confirmation resets the clock
        const age = daysBetween(clock, nowIso);
        return age >= (f.expectedValidDays || cfg.stalenessAgeDays);
    });
}

export interface StalenessResult {
    facts: MemoryFact[];
    removed: string[];
    extended: string[];
    /** Proposals the guardrails refused, with the reason. Never silent. */
    refused: Array<{ id: string; reason: string }>;
}

/**
 * Apply decisions with guardrails that hold whatever the model returned:
 *  - a target must be in the deterministic candidate set;
 *  - removals are capped per cycle, keeping the LOWEST-confidence ones;
 *  - a fact proposed for removal is never also extended.
 */
export function applyStalenessDecisions(
    facts: MemoryFact[],
    decisions: StalenessDecision[],
    cfg: LifecycleConfig = DEFAULT_CONFIG,
    nowIso = new Date().toISOString(),
): StalenessResult {
    const candidates = new Map(selectStaleCandidates(facts, cfg, nowIso).map(f => [f.id, f]));
    const refused: StalenessResult['refused'] = [];

    const removalIds: string[] = [];
    const extensions: StalenessDecision[] = [];
    for (const d of decisions || []) {
        if (!candidates.has(d.id)) {
            refused.push({ id: d.id, reason: 'not an aged candidate (protected, absent, or still inside its window)' });
            continue;
        }
        if (d.verdict === 'REMOVE') removalIds.push(d.id);
        else if (d.verdict === 'EXTEND') extensions.push(d);
    }

    // Cap removals: keep the lowest-confidence entries when the model asks for
    // more than the cycle allows, matching deermem's own tie-break.
    let effectiveRemovals = removalIds;
    if (removalIds.length > cfg.stalenessMaxRemovalsPerCycle) {
        effectiveRemovals = removalIds
            .map(id => candidates.get(id)!)
            .sort((a, b) => a.confidence - b.confidence)
            .slice(0, cfg.stalenessMaxRemovalsPerCycle)
            .map(f => f.id);
        for (const id of removalIds.filter(x => !effectiveRemovals.includes(x))) {
            refused.push({ id, reason: 'per-cycle removal cap reached' });
        }
    }
    const removedSet = new Set(effectiveRemovals);
    const proposedForRemoval = new Set(removalIds);

    const extendedIds: string[] = [];
    const out = facts
        .filter(f => !removedSet.has(f.id))
        .map(f => {
            const ext = extensions.find(e => e.id === f.id);
            if (!ext) return f;
            if (proposedForRemoval.has(f.id)) {
                refused.push({ id: f.id, reason: 'proposed for removal in the same cycle; extension ignored' });
                return f;
            }
            const daysSince = daysBetween(f.createdAt, nowIso);
            const next = Math.min(
                Math.round(daysSince + Math.max(1, ext.extendByDays || cfg.stalenessAgeDays)),
                cfg.stalenessMaxExtensionDays,
            );
            extendedIds.push(f.id);
            return { ...f, expectedValidDays: next };
        });

    return { facts: out, removed: effectiveRemovals, extended: extendedIds, refused };
}

// ---------------------------------------------------------------------------
// 4. Consolidation
// ---------------------------------------------------------------------------

export interface ConsolidationGroup { category: FactCategory; factIds: string[] }

export function selectConsolidationGroups(
    facts: MemoryFact[],
    cfg: LifecycleConfig = DEFAULT_CONFIG,
): ConsolidationGroup[] {
    const byCat = new Map<FactCategory, MemoryFact[]>();
    for (const f of facts || []) {
        if (!byCat.has(f.category)) byCat.set(f.category, []);
        byCat.get(f.category)!.push(f);
    }
    return Array.from(byCat.entries())
        .filter(([, list]) => list.length >= cfg.consolidationMinFacts)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, cfg.consolidationMaxGroupsPerCycle)
        .map(([category, list]) => ({ category, factIds: list.map(f => f.id) }));
}

export interface ConsolidationProposal {
    sourceIds: string[];
    consolidated: {
        content: string;
        category: FactCategory;
        confidence: number;
        scope: FactScope;
        durability: FactDurability;
        authority: FactAuthority;
    };
}

export interface ConsolidationResult {
    facts: MemoryFact[];
    mergedIds: string[];
    refused: Array<{ sourceIds: string[]; reason: string }>;
}

/**
 * Four guardrails, all enforced here rather than trusted to the prompt:
 *   (a) every source id must exist;
 *   (b) source sets must not overlap across groups in one cycle;
 *   (c) the group is capped at consolidationMaxSources;
 *   (d) merged confidence cannot exceed the source maximum.
 * Plus the subtle one: the merged fact keeps the NEWEST source's createdAt (so
 * the staleness clock reflects the information, not the synthesis) and inherits
 * the EARLIEST source review deadline (so a volatile sub-detail cannot hide
 * inside a stable sibling's long window and skip review for years).
 */
export function applyConsolidation(
    facts: MemoryFact[],
    proposals: ConsolidationProposal[],
    cfg: LifecycleConfig = DEFAULT_CONFIG,
    nowIso = new Date().toISOString(),
): ConsolidationResult {
    const byId = new Map(facts.map(f => [f.id, f]));
    const refused: ConsolidationResult['refused'] = [];
    const consumed = new Set<string>();
    const merged: MemoryFact[] = [];
    const mergedIds: string[] = [];

    for (const p of proposals || []) {
        const ids = Array.from(new Set(p?.sourceIds || []));
        if (ids.length < 2) { refused.push({ sourceIds: ids, reason: 'fewer than two sources' }); continue; }
        if (ids.length > cfg.consolidationMaxSources) { refused.push({ sourceIds: ids, reason: 'over the per-group source cap' }); continue; }
        if (ids.some(id => !byId.has(id))) { refused.push({ sourceIds: ids, reason: 'unknown source id' }); continue; }
        if (ids.some(id => consumed.has(id))) { refused.push({ sourceIds: ids, reason: 'source already consumed by another group' }); continue; }

        const sources = ids.map(id => byId.get(id)!);
        const c = p.consolidated;
        if (!c?.content || !c.category || !c.scope || !c.durability || !c.authority) {
            refused.push({ sourceIds: ids, reason: 'consolidated fact is missing classification' }); continue;
        }
        if (c.scope === 'session' || c.durability !== 'durable' || c.authority !== 'descriptive') {
            refused.push({ sourceIds: ids, reason: 'consolidated fact fails the admission gate' }); continue;
        }
        const maxConf = Math.max(...sources.map(s => s.confidence));
        const confidence = Math.min(typeof c.confidence === 'number' ? c.confidence : maxConf, maxConf);
        if (confidence < cfg.factConfidenceThreshold) {
            refused.push({ sourceIds: ids, reason: 'merged confidence below threshold' }); continue;
        }

        // createdAt: the NEWEST source. Review deadline: the EARLIEST source's.
        const newestCreated = sources.reduce((a, s) => (new Date(s.createdAt) > new Date(a) ? s.createdAt : a), sources[0].createdAt);
        const earliestDeadlineMs = Math.min(...sources.map(s =>
            new Date(s.createdAt).getTime() + (s.expectedValidDays || cfg.stalenessAgeDays) * DAY_MS));
        const rawWindow = (earliestDeadlineMs - new Date(newestCreated).getTime()) / DAY_MS;
        const creationCap = cfg.stalenessAgeDays * cfg.stalenessMaxLifetimeMultiplier;
        const expectedValidDays = Math.min(Math.max(1, Math.round(rawWindow)), creationCap);

        ids.forEach(id => consumed.add(id));
        mergedIds.push(...ids);
        merged.push({
            id: factId(c.content), content: c.content, category: c.category, confidence,
            scope: c.scope, durability: c.durability, authority: c.authority,
            createdAt: newestCreated, expectedValidDays,
            confirmationCount: Math.max(...sources.map(s => s.confirmationCount || 0)),
            sourceRunIds: Array.from(new Set(sources.flatMap(s => s.sourceRunIds))),
        });
    }

    const kept = facts.filter(f => !consumed.has(f.id));
    return { facts: mergeFacts(kept, merged), mergedIds, refused };
}

// ---------------------------------------------------------------------------
// 5. Reinforcement (deterministic signal only)
// ---------------------------------------------------------------------------

/**
 * Externalized so phrases can be added without touching code, mirroring
 * deermem's `message_patterns/reinforcement.yaml`. Bare "yes" and "ok" are
 * deliberately ABSENT: they appear inside ordinary sentences and would confirm
 * facts the user never endorsed.
 */
export const REINFORCEMENT_PATTERNS: RegExp[] = [
    /\byes[,.]?\s+(?:exactly|perfect|that(?:'s| is) (?:right|correct|it))\b/i,
    /\bperfect(?:[.!?]|$)/i,
    /\bexactly\s+(?:right|correct|what i (?:wanted|needed|meant))\b/i,
    /\bthat(?:'s| is)\s+(?:exactly\s+)?(?:right|correct|what i (?:wanted|needed|meant))\b/i,
    /\bkeep\s+(?:doing\s+)?that\b/i,
    /\bthis is (?:great|helpful|what i wanted)\b/i,
    /\bnailed it\b/i,
];

/** True only when the USER's own words carry a confirmation. */
export function detectReinforcement(userMessages: string[]): { confirmed: boolean; matched?: string } {
    for (const m of (userMessages || []).slice(-6)) {
        for (const re of REINFORCEMENT_PATTERNS) {
            if (re.test(m || '')) return { confirmed: true, matched: re.source };
        }
    }
    return { confirmed: false };
}

/**
 * The model may NOMINATE facts to reinforce; only `detectReinforcement` confirms.
 * Without this gate, duplicate extraction and prompt injection both read as
 * agreement, and the store converges on whatever it already believed.
 */
export function applyReinforcement(
    facts: MemoryFact[],
    nominatedIds: string[],
    userMessages: string[],
    nowIso = new Date().toISOString(),
): { facts: MemoryFact[]; confirmed: string[]; ignored: string[] } {
    const signal = detectReinforcement(userMessages);
    if (!signal.confirmed) return { facts, confirmed: [], ignored: nominatedIds || [] };
    const want = new Set(nominatedIds || []);
    const confirmed: string[] = [];
    const out = facts.map(f => {
        if (!want.has(f.id)) return f;
        confirmed.push(f.id);
        return { ...f, lastConfirmedAt: nowIso, confirmationCount: (f.confirmationCount || 0) + 1 };
    });
    return { facts: out, confirmed, ignored: (nominatedIds || []).filter(id => !confirmed.includes(id)) };
}

// ---------------------------------------------------------------------------
// 6. Capacity eviction (confidence enforced; hybrid shadowed)
// ---------------------------------------------------------------------------

const halfLifeDecay = (days: number, halfLife: number) => Math.pow(0.5, days / Math.max(1, halfLife));

export function hybridScore(f: MemoryFact, cfg: LifecycleConfig, nowIso: string): number {
    const conf = Math.max(0, Math.min(1, f.confidence));
    const confirmFresh = f.lastConfirmedAt ? halfLifeDecay(daysBetween(f.lastConfirmedAt, nowIso), cfg.evictionConfirmationHalfLifeDays) : 0;
    const heat = f.lastAccessedAt ? halfLifeDecay(daysBetween(f.lastAccessedAt, nowIso), cfg.evictionAccessHalfLifeDays) : 0;
    return cfg.evictionConfidenceWeight * conf
        + cfg.evictionConfirmationWeight * confirmFresh
        + cfg.evictionAccessWeight * heat;
}

export interface EvictionResult {
    facts: MemoryFact[];
    evicted: string[];
    /** Populated in shadow mode: what hybrid would have evicted instead. */
    shadowDisagreement: string[];
}

/**
 * Enforce the configured policy; when shadow mode is on, ALSO compute what the
 * hybrid policy would have done and report the disagreement without acting on
 * it. `correction` facts get a reserved floor, because the cheapest way to
 * regress is to evict the record of a mistake the user already corrected.
 */
export function evictToCapacity(
    facts: MemoryFact[],
    cfg: LifecycleConfig = DEFAULT_CONFIG,
    nowIso = new Date().toISOString(),
): EvictionResult {
    if (facts.length <= cfg.maxFacts) return { facts, evicted: [], shadowDisagreement: [] };

    const reserved = Math.min(
        Math.ceil(cfg.maxFacts * cfg.evictionCorrectionReservedFraction),
        facts.filter(f => f.category === 'correction').length,
    );
    const corrections = facts.filter(f => f.category === 'correction')
        .sort((a, b) => b.confidence - a.confidence);
    const protectedIds = new Set(corrections.slice(0, reserved).map(f => f.id));

    const rank = (f: MemoryFact) => cfg.evictionPolicy === 'hybrid-v1' ? hybridScore(f, cfg, nowIso) : f.confidence;
    const contenders = facts.filter(f => !protectedIds.has(f.id)).sort((a, b) => rank(b) - rank(a));
    const keepCount = Math.max(0, cfg.maxFacts - protectedIds.size);
    const kept = new Set([...protectedIds, ...contenders.slice(0, keepCount).map(f => f.id)]);
    const evicted = facts.filter(f => !kept.has(f.id)).map(f => f.id);

    let shadowDisagreement: string[] = [];
    if (cfg.evictionShadowEnabled && cfg.evictionPolicy === 'confidence') {
        const hybridKept = new Set([
            ...protectedIds,
            ...facts.filter(f => !protectedIds.has(f.id))
                .sort((a, b) => hybridScore(b, cfg, nowIso) - hybridScore(a, cfg, nowIso))
                .slice(0, keepCount).map(f => f.id),
        ]);
        shadowDisagreement = facts.filter(f => kept.has(f.id) !== hybridKept.has(f.id)).map(f => f.id);
    }

    return { facts: facts.filter(f => kept.has(f.id)), evicted, shadowDisagreement };
}

// ---------------------------------------------------------------------------
// Injection + IO
// ---------------------------------------------------------------------------

/**
 * Render the admitted store for prompt injection, newest-confirmed first, under
 * a token budget. Only admitted facts exist in the store, so nothing here can
 * leak a session-scoped instruction into a later engagement.
 */
export function renderFactsForInjection(facts: MemoryFact[], maxChars = 2400): string {
    const ordered = [...facts].sort((a, b) => {
        const ac = a.lastConfirmedAt || a.createdAt;
        const bc = b.lastConfirmedAt || b.createdAt;
        if (ac !== bc) return bc.localeCompare(ac);
        return b.confidence - a.confidence;
    });
    const lines: string[] = [];
    let used = 0;
    for (const f of ordered) {
        const line = `- [${f.category}] ${f.content}`;
        if (used + line.length > maxChars) break;
        lines.push(line);
        used += line.length + 1;
    }
    return lines.join('\n');
}

const STORE_PATH = 'synthesis/memory-facts.json';

/**
 * DF-A4 read-before-write: the hash of the store as it was last READ. The fact
 * store is the one true read-modify-write file in this service (load, mutate,
 * save), which is exactly the pattern a stale write corrupts, so it presents the
 * precondition on save. A 409 means another writer won; the caller re-loads and
 * re-runs the pass rather than clobbering.
 */
let _lastReadHash: string | null = null;

export async function loadFactStore(): Promise<StepEnvelope<MemoryFact[]>> {
    return runStep('memory:load', async () => {
        const r = await fetch(`${PROXY_BASE}/api/wiki/read/${STORE_PATH}`);
        if (!r.ok) throw new Error(`wiki read failed: ${r.status}`);
        const data = await r.json();
        _lastReadHash = typeof data?.content_sha256 === 'string' ? data.content_sha256 : null;
        if (!data?.exists || !data?.content) return [];
        const parsed = JSON.parse(data.content);
        return Array.isArray(parsed) ? parsed as MemoryFact[] : [];
    });
}

export async function saveFactStore(facts: MemoryFact[]): Promise<StepEnvelope<number>> {
    return runStep('memory:save', async () => {
        const r = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: STORE_PATH,
                content: JSON.stringify(facts, null, 2),
                ...(_lastReadHash ? { expected_sha256: _lastReadHash } : {}),
            }),
        });
        if (r.status === 409) {
            // Do not retry blindly: the next pass re-reads and recomputes, which
            // is the only safe resolution for a snapshot-derived write.
            throw new Error('stale write: the fact store changed since it was read');
        }
        if (!r.ok) throw new Error(`wiki write failed: ${r.status}`);
        // The write succeeded, so the caller's in-memory view is now the file.
        _lastReadHash = null;
        return facts.length;
    });
}

export interface LifecyclePassInput {
    runId: string;
    proposed?: ProposedFact[];
    stalenessDecisions?: StalenessDecision[];
    consolidationProposals?: ConsolidationProposal[];
    reinforceIds?: string[];
    userMessages?: string[];
    cfg?: LifecycleConfig;
    nowIso?: string;
}

export interface LifecyclePassReport {
    admitted: number;
    rejected: number;
    rejectedByScopeGate: number;
    removed: number;
    extended: number;
    merged: number;
    confirmed: number;
    evicted: number;
    shadowDisagreement: number;
    refusals: string[];
    total: number;
}

/**
 * ONE pass over the store, in the order the guardrails require: admit, reinforce
 * (so a confirmation resets the staleness clock before candidates are chosen),
 * staleness, consolidation, then capacity. Pure: the caller owns IO.
 */
export function runLifecyclePass(
    store: MemoryFact[],
    input: LifecyclePassInput,
): { facts: MemoryFact[]; report: LifecyclePassReport } {
    const cfg = input.cfg || DEFAULT_CONFIG;
    const now = input.nowIso || new Date().toISOString();
    const refusals: string[] = [];

    const adm = admitFacts(input.proposed || [], input.runId, cfg, now);
    let facts = mergeFacts(store || [], adm.admitted);
    adm.rejected.forEach(r => refusals.push(`admit: ${r.reason}`));

    const reinf = applyReinforcement(facts, input.reinforceIds || [], input.userMessages || [], now);
    facts = reinf.facts;
    if (reinf.ignored.length) refusals.push(`reinforce: ${reinf.ignored.length} nomination(s) ignored without a user signal`);

    const candidates = selectStaleCandidates(facts, cfg, now);
    let removed = 0; let extended = 0;
    if (candidates.length >= cfg.stalenessMinCandidates && (input.stalenessDecisions || []).length) {
        const st = applyStalenessDecisions(facts, input.stalenessDecisions!, cfg, now);
        facts = st.facts; removed = st.removed.length; extended = st.extended.length;
        st.refused.forEach(r => refusals.push(`staleness ${r.id}: ${r.reason}`));
    }

    let merged = 0;
    if ((input.consolidationProposals || []).length) {
        const co = applyConsolidation(facts, input.consolidationProposals!, cfg, now);
        facts = co.facts; merged = co.mergedIds.length;
        co.refused.forEach(r => refusals.push(`consolidation: ${r.reason}`));
    }

    const ev = evictToCapacity(facts, cfg, now);
    facts = ev.facts;

    return {
        facts,
        report: {
            admitted: adm.admitted.length,
            rejected: adm.rejected.length,
            rejectedByScopeGate: adm.rejectedByScopeGate,
            removed, extended, merged,
            confirmed: reinf.confirmed.length,
            evicted: ev.evicted.length,
            shadowDisagreement: ev.shadowDisagreement.length,
            refusals,
            total: facts.length,
        },
    };
}
