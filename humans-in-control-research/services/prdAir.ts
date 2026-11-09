import type { BrandId } from '../components/slideTemplates/brands';
import type { LedgerType, LedgerDisposition, LedgerLabel, LedgerSourceRef, LedgerItem, LedgerArea } from './engagementLedger';
import type { DeliverableReceipt } from './deliverableRules';
import { stripNameNumbers } from './deliverableRules';
/**
 * PrdAir: the ONE PRD contract on AIR (Stage 3.1 of
 * plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md; vision phases 1, 3, 5, 6, 8, 9).
 *
 * Before this file the system carried four PRD shapes with no shared contract (finding F1): the
 * pipeline stage's 16 Cagan sections, the `prd-feature` slide cards, the `:::deliverable:prd_feature`
 * chat block, and the prototype brief's `prd_candidate`. Each was authored by a model from a different
 * prompt and none could be traced to an approved persona, pain or quote. This module is the Artifact
 * Graph for kind `prd`: the twelve sections of spec 3.1, requirement nodes with trace ids, acceptance
 * tests, success signals, and the DERIVED traceability matrix. Every other PRD surface (the `#prd`
 * document, the deck projection, the pipeline tab, `#proto`'s `prd_candidate`) consumes this shape.
 *
 * Traceability model (spec 3.2, adapted from FDA four-layer and DO-178C bidirectionality):
 *   Source (S) -> Quote (Q) -> Pain or opportunity (P) -> Theme (T) and Persona (PE)
 *     -> Requirement (R) -> Acceptance test (AT) -> Signal (M).
 *   Competitive gaps (CG) are a second permitted root for R.
 * The matrix is a VIEW over this graph, never a model-authored table.
 *
 * The number rule (spec 3.5, owner decision 1 on 2026-10-01): EVIDENCE numbers describe the world and
 * live only inside verbatim quotes; REQUIREMENT numbers are design decisions and live only in typed
 * `RequirementTarget` fields. `scanNakedNumbers` exempts exactly those two homes and flags every
 * other digit in user-visible prose.
 *
 * Pure data + pure functions: no model calls, no fetch, no DOM. Deterministic for a given input.
 */

const PRD_AIR_VERSION = 'hic-prd-air-2026-10-01' as const;

export type PrdClaimType =
    | 'SUPPORTED_FACT'
    | 'DERIVATION'
    | 'DEFENSIBLE_INFERENCE'
    | 'HYPOTHESIS'
    | 'EDITORIAL_JUDGMENT'
    | 'UNKNOWN';

export type PrdTier = 'must' | 'should' | 'could' | 'wont';
export type PrdKanoType = 'must-be' | 'one-dimensional' | 'attractive' | 'indifferent' | 'unknown';

/**
 * The one legitimate home for a number outside a verbatim quote. `kind` is the machine-checkable
 * discriminator every scanner (this module, the AIR naked-number signal, the post-processor) keys on.
 * `rationale` cites evidence QUALITATIVELY: it names the pattern or the source, never a second figure.
 */
export interface RequirementTarget {
    kind: 'requirement_target';
    metric: string;
    value: number | string;
    unit: string;
    baseline?: string;
    source_pointer?: string;
    rationale?: string;
}

// ---- graph nodes ---------------------------------------------------------------------------------

export interface PrdSource {            // S
    id: string;
    name: string;
    /** article | social-post | transcript | upload | documentation | ... (manifest kinds). */
    kind?: string;
    pointer?: string;
    url?: string;
    date?: string;
}
export interface PrdQuote {             // Q (exactly one S)
    id: string;
    text: string;
    sourceId: string;
    pointer?: string;
    attribution?: string;
}
export interface PrdPain {              // P (at least one Q)
    id: string;
    text: string;
    kind: 'pain' | 'opportunity';
    quoteIds: string[];
    personaIds: string[];
    themeIds: string[];
    journeyStage?: string;
}
export interface PrdThemeRef {          // T (reference to the approved theme record)
    id: string;
    name: string;
    insight?: string;
    sentiment?: string;
    category?: string;
}
export interface PrdPersonaRef {        // PE (reference to the approved persona record)
    id: string;
    name: string;
    role?: string;
    primary: boolean;
    stageOfStruggle?: string;
}
export interface PrdCompetitiveGap {    // CG (second permitted root for R)
    id: string;
    text: string;
    competitor?: string;
    quoteIds: string[];
}
export interface PrdAcceptanceTest {    // AT (declarative Given/When/Then, points back to one R)
    id: string;
    requirementId: string;
    given: string;
    when: string;
    then: string;
    target?: RequirementTarget;
}
export interface PrdSignal {            // M (seven fields, spec 3.4)
    id: string;
    signal: string;
    instrument: string;
    population: { personaId?: string; stage?: string };
    direction: 'up' | 'down' | 'hold';
    /** "to be measured by [owner] by [date]" or a cited figure inside a quote; never a bare number. */
    baselineStatus: string;
    type: 'leading' | 'lagging';
    guardrail: { statement: string; rollbackAuthority: string };
    requirementIds: string[];
}
export interface PrdBet {
    statement: string;
    test: string;
    /** The condition under which the alternative wins (claim-type discipline, .claude/CLAUDE.md). */
    conditionWhereAlternativeWins: string;
}
/**
 * The ledger roots (2026-10-02) are the SHARED engagement ledger (services/engagementLedger.ts): STATED (SF-n),
 * FEEDBACK (FB-n) and THEME (TH-n) items read from the engagement's own documents and board themes. Feature areas
 * are derived per project (`assignAreas`), never a fixed list. These aliases keep the PRD names.
 */
export type PrdLedgerType = LedgerType;
export type PrdFeatureArea = string;
export type PrdDisposition = LedgerDisposition;
export type PrdLedgerLabel = LedgerLabel;
export type PrdLedgerSourceRef = LedgerSourceRef;
export type PrdLedgerItem = LedgerItem;
export type PrdArea = LedgerArea;
export type PrdRequirementOrigin = 'area-pass' | 'gap-fill' | 'research-pass' | 'fallback' | 'model' | 'out-of-scope' | 'project-work';

export interface PrdRequirement {       // R
    id: string;
    text: string;
    kind: 'functional' | 'non-functional';
    /** Derived from evidence columns by `deriveTier`; the model's proposal is kept as `proposedTier`. */
    tier: PrdTier;
    proposedTier?: PrdTier;
    tierRationale: string;
    claimType: PrdClaimType;
    mapsToThesis: boolean;
    kano: PrdKanoType;
    cagansBar: boolean;
    painIds: string[];
    competitiveGapIds: string[];
    personaIds: string[];
    themeIds: string[];
    acceptanceTestIds: string[];
    signalIds: string[];
    target?: RequirementTarget;
    /** Present when claimType is HYPOTHESIS: the requirement ships as a NON-OBVIOUS BET. */
    bet?: PrdBet;
    /** Scope and feedback ledger roots (SF-n / FB-n) this requirement documents. */
    ledgerIds?: string[];
    /** Which compile pass wrote it; `fallback` = built deterministically from a ledger item no model pass covered. */
    origin?: PrdRequirementOrigin;
    /** Reader-facing notes ("Needs refinement: ..."). */
    notes?: string;
}

export interface PrdGraph {
    sources: PrdSource[];
    quotes: PrdQuote[];
    pains: PrdPain[];
    themes: PrdThemeRef[];
    personas: PrdPersonaRef[];
    competitiveGaps: PrdCompetitiveGap[];
    requirements: PrdRequirement[];
    acceptanceTests: PrdAcceptanceTest[];
    signals: PrdSignal[];
    /** Scope and feedback ledger (absent on records compiled before 2026-10-02). */
    ledger?: PrdLedgerItem[];
    /** Feature areas derived from this project's ledger (id + label). */
    areas?: PrdArea[];
}

// ---- the twelve sections (spec 3.1) -------------------------------------------------------------

export interface PrdJobStory {
    id: string;
    personaId: string;
    when: string;
    iWantTo: string;
    soICan: string;
    journeyStage?: string;
    quoteIds: string[];
}
export interface PrdAssumption {
    id: string;
    text: string;
    /** Experiment quadrant: test-now (risky, unknown), plan (supported by quotes), monitor, defer. */
    quadrant: 'test-now' | 'plan' | 'monitor' | 'defer';
    test: string;
    owner: string;
    supportingQuoteIds: string[];
}
export interface PrdFlow {
    jobStoryId: string;
    name: string;
    steps: string[];
}
export interface PrdScreenState {
    screen: string;
    /** empty, loading, partial, error, conflict, permission, degraded provider ... */
    states: string[];
}
export interface PrdQualityCharacteristic {
    /** ISO/IEC 25010:2023 characteristic name (performance efficiency, reliability, security, ...). */
    characteristic: string;
    statement: string;
    target?: RequirementTarget;
}
export interface PrdRisk {
    id: string;
    failureMode: string;
    likelihood: 'low' | 'medium' | 'high';
    severity: 'low' | 'medium' | 'high';
    earlySignal: string;
    owner: string;
    mitigation: string;
}
export interface PrdAlternative {
    option: string;
    rejectedBecause: string;
    tradeoff: string;
}
export interface PrdRolloutPhase {
    phase: string;
    gate: string;
    killCriteria: string;
    rollbackAuthority: string;
}
export interface PrdTrackingEvent {
    event: string;
    properties: string[];
    owner: string;
}
export interface PrdDependency {
    name: string;
    kind: 'api' | 'data' | 'team' | 'vendor' | 'other';
    owner: string;
}
export interface PrdOpenQuestion {
    question: string;
    owner: string;
    due: string;
}

export interface PrdSections {
    /** 1. The user, the pain, the decision requested, what the product does for that user. */
    thesis: {
        statement: string;
        user: string;
        pain: string;
        decisionRequested: string;
        whatItDoes: string;
        governingThemeId?: string;
    };
    /** 2. One specific story showing why the status quo fails, then verbatim quotes. No solution. */
    problem: { story: { user: string; need: string; insight: string }; quoteIds: string[] };
    /** 3. The named change that makes waiting costly. */
    whyNow: { statement: string; change: string; quoteIds: string[] };
    /** 4. Primary personas by id with their stage of struggle, job stories in Klement form. */
    usersAndJobs: { primaryPersonaIds: string[]; jobStories: PrdJobStory[] };
    /** 5. Goals (including immeasurable ones), non-goals with reasons, appetite as a time budget. */
    goalsNonGoalsAppetite: {
        goals: Array<{ text: string; measurable: boolean }>;
        nonGoals: Array<{ text: string; reason: string }>;
        appetite: RequirementTarget;
    };
    /** 6. Signals live in graph.signals; this section orders them. */
    successSignals: { signalIds: string[] };
    /** 7. Riskiest assumptions in the experiment quadrant. */
    hypotheses: { assumptions: PrdAssumption[] };
    /** 8. Behavior, never UI prescription. */
    solutionFlows: { flows: PrdFlow[]; screenStates: PrdScreenState[]; businessRules: string[]; designLink?: string };
    /** 9. Requirement nodes live in graph.requirements; this section orders them. */
    requirements: { requirementIds: string[] };
    /**
     * 10. 25010 characteristics, WCAG 2.2 AA criteria, and the privacy statements under the regime that
     * applies to the subject's jurisdiction and sector (FERPA for US student education records, HIPAA for US
     * patient data, GDPR only for personal data of people in the EU). `regime` names it; it is never defaulted.
     * `dpiaTrigger` keeps its field name for compatibility and holds the privacy impact assessment trigger
     * under that regime.
     */
    quality: {
        characteristics: PrdQualityCharacteristic[];
        accessibility: { level: string; exposedCriteria: string[] };
        privacy: { regime?: string; dataMinimization: string; dpiaTrigger: { triggered: boolean; reason: string } };
    };
    /** 11. Risk register and the alternatives rejected. */
    risks: { register: PrdRisk[]; alternatives: PrdAlternative[] };
    /** 12. Startable and stoppable. */
    delivery: {
        releaseCriteria: string[];
        rollout: PrdRolloutPhase[];
        trackingPlan: PrdTrackingEvent[];
        dependencies: PrdDependency[];
        openQuestions: PrdOpenQuestion[];
        accountableApprover: string;
    };
}

export interface PrdAir {
    prdAirVersion: typeof PRD_AIR_VERSION;
    artifactId: string;
    runId?: string;
    objective: string;
    title: string;
    brand?: BrandId;
    createdAtIso?: string;
    graph: PrdGraph;
    sections: PrdSections;
    /** The deterministic rule registry's receipt (services/deliverableRules.ts): per rule, checked / repaired / filled / pass. */
    receipt?: DeliverableReceipt;
}

export const PRD_SECTION_ORDER: Array<{ key: keyof PrdSections; label: string; tier: 1 | 2 }> = [
    { key: 'thesis', label: 'Thesis', tier: 1 },
    { key: 'problem', label: 'Problem with evidence', tier: 1 },
    { key: 'whyNow', label: 'Why now', tier: 1 },
    { key: 'usersAndJobs', label: 'Users and jobs', tier: 1 },
    { key: 'goalsNonGoalsAppetite', label: 'Goals, non-goals, appetite', tier: 1 },
    { key: 'successSignals', label: 'Success signals', tier: 1 },
    { key: 'hypotheses', label: 'Hypotheses and assumption map', tier: 2 },
    { key: 'solutionFlows', label: 'Solution flows, states, logic', tier: 2 },
    { key: 'requirements', label: 'Requirements with acceptance tests and trace ids', tier: 2 },
    { key: 'quality', label: 'Quality, accessibility, privacy', tier: 2 },
    { key: 'risks', label: 'Risks, pre-mortem, alternatives considered', tier: 2 },
    { key: 'delivery', label: 'Delivery', tier: 2 },
];

// ---- builders -------------------------------------------------------------------------------------

export function makeRequirementTarget(metric: string, value: number | string, unit: string, extra: Partial<Omit<RequirementTarget, 'kind' | 'metric' | 'value' | 'unit'>> = {}): RequirementTarget {
    return { kind: 'requirement_target', metric, value, unit, ...extra };
}

export function isRequirementTarget(v: unknown): v is RequirementTarget {
    return !!v && typeof v === 'object' && (v as any).kind === 'requirement_target'
        && typeof (v as any).metric === 'string' && typeof (v as any).unit === 'string' && (v as any).value != null;
}

export function createPrdAir(meta: { artifactId: string; objective: string; title: string; runId?: string; brand?: BrandId; createdAtIso?: string }): PrdAir {
    return {
        prdAirVersion: PRD_AIR_VERSION,
        artifactId: meta.artifactId,
        runId: meta.runId,
        objective: meta.objective,
        title: meta.title,
        brand: meta.brand,
        createdAtIso: meta.createdAtIso,
        graph: {
            sources: [], quotes: [], pains: [], themes: [], personas: [], competitiveGaps: [],
            requirements: [], acceptanceTests: [], signals: [], ledger: [],
        },
        sections: {
            thesis: { statement: '', user: '', pain: '', decisionRequested: '', whatItDoes: '' },
            problem: { story: { user: '', need: '', insight: '' }, quoteIds: [] },
            whyNow: { statement: '', change: '', quoteIds: [] },
            usersAndJobs: { primaryPersonaIds: [], jobStories: [] },
            goalsNonGoalsAppetite: { goals: [], nonGoals: [], appetite: makeRequirementTarget('appetite', '', 'weeks') },
            successSignals: { signalIds: [] },
            hypotheses: { assumptions: [] },
            solutionFlows: { flows: [], screenStates: [], businessRules: [] },
            requirements: { requirementIds: [] },
            quality: {
                characteristics: [],
                accessibility: { level: 'WCAG 2.2 AA', exposedCriteria: [] },
                privacy: { dataMinimization: '', dpiaTrigger: { triggered: false, reason: '' } },
            },
            risks: { register: [], alternatives: [] },
            delivery: { releaseCriteria: [], rollout: [], trackingPlan: [], dependencies: [], openQuestions: [], accountableApprover: '' },
        },
    };
}

export function isPrdAir(x: unknown): x is PrdAir {
    return !!x && typeof x === 'object'
        && (x as any).prdAirVersion === PRD_AIR_VERSION
        && !!(x as any).graph && Array.isArray((x as any).graph.requirements)
        && !!(x as any).sections && !!(x as any).sections.thesis;
}

// ---- graph lookups --------------------------------------------------------------------------------

function byId<T extends { id: string }>(arr: T[]): Map<string, T> {
    const m = new Map<string, T>();
    for (const x of arr || []) if (x && x.id) m.set(x.id, x);
    return m;
}

/** Quotes reachable from a requirement through its ledger roots (the client's own words first), pains and gaps. */
export function quotesForRequirement(req: PrdRequirement, air: PrdAir): PrdQuote[] {
    const pains = byId(air.graph.pains);
    const gaps = byId(air.graph.competitiveGaps);
    const quotes = byId(air.graph.quotes);
    const ledger = byId(air.graph.ledger || []);
    const ids = new Set<string>();
    for (const lid of req.ledgerIds || []) { const q = ledger.get(lid)?.quoteId; if (q) ids.add(q); }
    for (const pid of req.painIds || []) for (const q of pains.get(pid)?.quoteIds || []) ids.add(q);
    for (const gid of req.competitiveGapIds || []) for (const q of gaps.get(gid)?.quoteIds || []) ids.add(q);
    return [...ids].map(id => quotes.get(id)).filter((q): q is PrdQuote => !!q);
}

/**
 * Independent origins behind a requirement's evidence (the Independence Rule): distinct sources,
 * collapsing sources that share a name OR share a pointer page. Two mastheads quoting one press
 * release are one origin; the caller cannot see that here, so the collapse is by identity only.
 */
function independentOriginsForRequirement(req: PrdRequirement, air: PrdAir): PrdSource[] {
    const sources = byId(air.graph.sources);
    const seen = new Map<string, PrdSource>();
    for (const q of quotesForRequirement(req, air)) {
        const s = sources.get(q.sourceId);
        if (!s) continue;
        const key = (s.pointer ? s.pointer.replace(/#c\d+$/i, '') : '') || s.name.trim().toLowerCase();
        if (!seen.has(key)) seen.set(key, s);
    }
    return [...seen.values()];
}

// ---- evidence-derived prioritization (spec 3.3) ----------------------------------------------------

export interface TierDerivation {
    tier: PrdTier;
    reasons: string[];
}

/**
 * Tier assignment is derived from evidence columns, not typed by the model. Must-have requires ALL of:
 * maps to the thesis; must-be or one-dimensional Kano type read from the corpus; at least two
 * independent origins; a primary persona; Cagan's bar. Should-have: one origin or a secondary
 * persona. Could-have: single-source or inferred. Won't-have: named by the model with its reason
 * (kept as proposed; the derivation never promotes a deferral).
 */
/**
 * The authority a requirement's ledger roots carry (2026-10-02). A contract or a client-stated REQUIRED item, and an
 * explicit stakeholder DECISION, are their own authority: the client said so, and no second independent origin is
 * needed for must-have. Out-of-scope roots make the requirement a won't; optional roots cap it at could.
 */
function ledgerAuthority(req: PrdRequirement, air: PrdAir): 'authoritative' | 'out-of-scope' | 'optional' | 'none' {
    const ledger = byId(air.graph.ledger || []);
    const items = (req.ledgerIds || []).map(id => ledger.get(id)).filter((x): x is PrdLedgerItem => !!x);
    if (!items.length) return 'none';
    if (items.some(i => i.label === 'required' || i.label === 'decision')) return 'authoritative';
    if (items.every(i => i.label === 'out-of-scope')) return 'out-of-scope';
    if (items.every(i => i.label === 'optional')) return 'optional';
    return 'none';
}

/** The root kinds behind a requirement, for the workbook and the compile report. */
export type PrdRootType = 'stated' | 'feedback' | 'pain' | 'competitive-gap' | 'theme' | 'bet';
export function requirementRootTypes(req: PrdRequirement, air: PrdAir): PrdRootType[] {
    const ledger = byId(air.graph.ledger || []);
    const pains = byId(air.graph.pains), gaps = byId(air.graph.competitiveGaps), themes = byId(air.graph.themes);
    const out: PrdRootType[] = [];
    const lt = new Set((req.ledgerIds || []).map(id => ledger.get(id)?.type).filter(Boolean));
    if (lt.has('stated')) out.push('stated');
    if (lt.has('feedback')) out.push('feedback');
    if ((req.painIds || []).some(id => pains.has(id))) out.push('pain');
    if ((req.competitiveGapIds || []).some(id => gaps.has(id))) out.push('competitive-gap');
    if (lt.has('theme') || (req.themeIds || []).some(id => themes.has(id))) out.push('theme');
    if (!out.length) out.push('bet');
    return out;
}

export function deriveTier(req: PrdRequirement, air: PrdAir): TierDerivation {
    const reasons: string[] = [];
    const proposed = req.proposedTier || req.tier;
    if (proposed === 'wont') return { tier: 'wont', reasons: ['named as deferred with its reason'] };
    if (req.claimType === 'HYPOTHESIS') return { tier: 'could', reasons: ['typed HYPOTHESIS: carried as a bet, never above could'] };
    const authority = ledgerAuthority(req, air);
    if (authority === 'authoritative') return { tier: 'must', reasons: ['client-stated required item or stakeholder decision'] };
    if (authority === 'out-of-scope') return { tier: 'wont', reasons: ['the client document places it out of scope'] };
    if (authority === 'optional') return { tier: 'could', reasons: ['the client document labels it optional'] };
    const origins = independentOriginsForRequirement(req, air);
    const personas = byId(air.graph.personas);
    const hasPrimary = (req.personaIds || []).some(id => personas.get(id)?.primary);
    const hasAnyPersona = (req.personaIds || []).length > 0 || (req.ledgerIds || []).length > 0;
    const kanoOk = req.kano === 'must-be' || req.kano === 'one-dimensional';
    if (req.mapsToThesis && kanoOk && origins.length >= 2 && hasPrimary && req.cagansBar) {
        return { tier: 'must', reasons: ['maps to thesis', `${req.kano} Kano type read from the corpus`, 'two or more independent origins', 'primary persona', 'the product should not ship without it'] };
    }
    if (!req.mapsToThesis) reasons.push('does not map to the thesis');
    if (!kanoOk) reasons.push(`Kano type ${req.kano} is not must-be or one-dimensional`);
    if (origins.length < 2) reasons.push(origins.length === 1 ? 'one independent origin' : 'no independent origin');
    if (!hasPrimary) reasons.push('no primary persona');
    if (!req.cagansBar) reasons.push('the product could ship without it');
    if (origins.length >= 1 || hasAnyPersona) return { tier: 'should', reasons };
    reasons.push('single-source or inferred');
    return { tier: 'could', reasons };
}

/**
 * Must-have is rare: at most a third of the requirements (never fewer than one when any requirement
 * qualifies). The 2026-10-01 live run derived seven must-haves out of twelve, which is a priority list
 * with no priority. The cap is enforced deterministically after derivation: the must-haves are ranked by
 * the strength of the evidence behind them and the weakest are demoted to should-have.
 */
export function mustHaveCap(requirementCount: number): number {
    return requirementCount <= 0 ? 0 : Math.max(1, Math.floor(requirementCount / 3));
}

/** Evidence strength of a must-have, for the cap: origins, then verified quotes, then Kano, then primary personas. */
function evidenceStrength(req: PrdRequirement, air: PrdAir): number[] {
    const personas = byId(air.graph.personas);
    return [
        independentOriginsForRequirement(req, air).length,
        quotesForRequirement(req, air).length,
        req.kano === 'must-be' ? 1 : 0,
        (req.personaIds || []).filter(id => personas.get(id)?.primary).length,
    ];
}

/** Apply `deriveTier` to every requirement, keeping the model's proposal as `proposedTier`; then cap must-haves. */
/**
 * 2026-10-01 consulting grade: the derived tier rationale is written as ONE plain sentence a reader can act
 * on, never as the internal checklist ("maps to thesis; one-dimensional Kano type read from the corpus; ...").
 */
function tierRationaleSentence(tier: string, reasons: string[]): string {
    const r = reasons.map(x => x.trim()).filter(Boolean);
    if (tier === 'must' && r.some(x => /client-stated required item or stakeholder decision/.test(x))) return 'Must-have: the client states it as required, or a stakeholder decided it, in a source document.';
    if (tier === 'wont' && r.some(x => /out of scope/.test(x))) return 'Not in this release: the client document places it out of scope.';
    if (tier === 'could' && r.some(x => /labels it optional/.test(x))) return 'Could-have: the client document labels it optional.';
    if (tier === 'must') return 'Must-have: it serves the thesis and the primary persona, users expect it, at least two independent sources show the need, and the release fails without it.';
    if (tier === 'wont') return 'Deferred, with the reason stated in non-goals.';
    if (r.some(x => /HYPOTHESIS/.test(x))) return 'Could-have: the need is not yet evidenced, so it ships only as a stated bet.';
    const why: string[] = [];
    if (r.some(x => /does not map to the thesis/.test(x))) why.push('it sits outside the thesis');
    if (r.some(x => /Kano type/.test(x))) why.push('users would welcome it rather than expect it');
    if (r.some(x => /one independent origin/.test(x))) why.push('only one independent source shows the need');
    if (r.some(x => /no independent origin|single-source or inferred/.test(x))) why.push('no independent source shows the need yet');
    if (r.some(x => /no primary persona/.test(x))) why.push('it serves a secondary persona');
    if (r.some(x => /could ship without it/.test(x))) why.push('the release can ship without it');
    const label = tier === 'should' ? 'Should-have' : 'Could-have';
    if (!why.length) return `${label}.`;
    const list = why.length === 1 ? why[0] : `${why.slice(0, -1).join(', ')} and ${why[why.length - 1]}`;
    return `${label}: ${list}.`;
}

/** The model's own tier reason per requirement, captured once, so repeated derivations compose from it and never stack. */
const MODEL_RATIONALE = new WeakMap<PrdRequirement, string>();
export function applyDerivedTiers(air: PrdAir): PrdAir {
    for (const r of air.graph.requirements) {
        if (!r.proposedTier) r.proposedTier = r.tier;
        const d = deriveTier(r, air);
        r.tier = d.tier;
        // 2026-10-02 QA of the live workbook: 154 model rationales said "at least two independent sources show the
        // need" on requirements with zero or one origin, because a model rationale survived whenever the tier did.
        // The derived sentence always leads; the model's subject-specific reason is kept after it only when it does
        // not claim more sources than the record holds.
        const derived = tierRationaleSentence(d.tier, d.reasons);
        if (!MODEL_RATIONALE.has(r)) MODEL_RATIONALE.set(r, String(r.tierRationale || '').trim());
        const model = MODEL_RATIONALE.get(r)!;
        const overclaims = /\b(?:two|three|several|multiple|many|\d+)\s+(?:independent\s+)?(?:sources|origins|documents|stakeholders)\b|\bindependent\s+(?:sources|origins)\b/i.test(model)
            && independentOriginsForRequirement(r, air).length < 2;
        r.tierRationale = !model || overclaims || model === derived ? derived : `${derived} ${model}`;
    }
    const reqs = air.graph.requirements;
    // Client-stated required items and stakeholder decisions are exempt from the cap: the client set them.
    const exempt = new Set(reqs.filter(r => r.tier === 'must' && ledgerAuthority(r, air) === 'authoritative').map(r => r.id));
    const capped = reqs.filter(r => !exempt.has(r.id));
    const cap = mustHaveCap(capped.length);
    const musts = capped.map((r, i) => ({ r, i, k: evidenceStrength(r, air) })).filter(x => x.r.tier === 'must');
    if (musts.length > cap) {
        // Strongest first; ties keep document order. Everything past the cap is demoted.
        musts.sort((a, b) => {
            for (let j = 0; j < a.k.length; j++) if (b.k[j] !== a.k[j]) return b.k[j] - a.k[j];
            return a.i - b.i;
        });
        for (const x of musts.slice(cap)) {
            x.r.tier = 'should';
            x.r.tierRationale = 'meets the must-have bar, demoted to should: must-haves are capped at a third of the requirements and this one carries thinner evidence than the must-haves kept';
        }
    }
    return air;
}

/**
 * A requirement with no pain and no competitive gap behind it has no evidence root. It is typed
 * HYPOTHESIS and carried as a NON-OBVIOUS BET (spec 3.2 integrity rule; .claude/CLAUDE.md claim-type
 * discipline: unsupported factual claims do not earn prose). The bet keeps the test the model
 * proposed, or names the missing one.
 */
export function typeUntraceableAsHypothesis(air: PrdAir): string[] {
    const pains = byId(air.graph.pains);
    const gaps = byId(air.graph.competitiveGaps);
    const themes = byId(air.graph.themes);
    const ledger = byId(air.graph.ledger || []);
    const changed: string[] = [];
    for (const r of air.graph.requirements) {
        const livePains = (r.painIds || []).filter(id => pains.has(id));
        const liveGaps = (r.competitiveGapIds || []).filter(id => gaps.has(id));
        const liveLedger = (r.ledgerIds || []).filter(id => ledger.has(id));
        r.painIds = livePains;
        r.competitiveGapIds = liveGaps;
        if (r.ledgerIds) r.ledgerIds = liveLedger;
        // 2026-10-02 (owner directive): a requirement is a bet ONLY when it has no root of any kind. Pains, gaps,
        // themes, client-stated items and stakeholder feedback are all roots.
        const liveThemes = (r.themeIds || []).filter(id => themes.has(id));
        if (livePains.length === 0 && liveGaps.length === 0 && liveLedger.length === 0 && liveThemes.length === 0 && r.claimType !== 'HYPOTHESIS') {
            r.claimType = 'HYPOTHESIS';
            if (!r.proposedTier) r.proposedTier = r.tier;
            r.tier = r.tier === 'wont' ? 'wont' : 'could';
            if (!r.bet) {
                r.bet = {
                    statement: r.text,
                    test: 'Run the smallest experiment that would show this requirement changes the primary persona\'s behavior.',
                    conditionWhereAlternativeWins: 'The alternative wins if the experiment shows no change in the primary persona\'s behavior.',
                };
            }
            changed.push(r.id);
        }
    }
    return changed;
}

// ---- trace integrity (spec 3.2 rules) ---------------------------------------------------------------

export interface TraceViolation {
    rule: 'R_HAS_ROOT' | 'P_HAS_Q' | 'Q_HAS_ONE_S' | 'MUST_HAS_TWO_ORIGINS' | 'R_HAS_AT' | 'AT_POINTS_TO_R' | 'M_POINTS_TO_R' | 'REF_EXISTS' | 'LEDGER_COVERED';
    nodeId: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface TraceIntegrityReport {
    ok: boolean;
    violations: TraceViolation[];
    counts: { S: number; Q: number; P: number; T: number; PE: number; CG: number; R: number; AT: number; M: number };
}

export function checkTraceIntegrity(air: PrdAir): TraceIntegrityReport {
    const g = air.graph;
    const v: TraceViolation[] = [];
    const sources = byId(g.sources), quotes = byId(g.quotes), pains = byId(g.pains), gaps = byId(g.competitiveGaps);
    const reqs = byId(g.requirements), themes = byId(g.themes), personas = byId(g.personas);

    for (const q of g.quotes) {
        if (!q.sourceId || !sources.has(q.sourceId)) v.push({ rule: 'Q_HAS_ONE_S', nodeId: q.id, message: `quote ${q.id} does not resolve to exactly one source`, severity: 'error' });
    }
    for (const p of g.pains) {
        const live = (p.quoteIds || []).filter(id => quotes.has(id));
        if (live.length === 0) v.push({ rule: 'P_HAS_Q', nodeId: p.id, message: `pain ${p.id} has no verbatim quote behind it`, severity: 'error' });
        for (const id of p.personaIds || []) if (!personas.has(id)) v.push({ rule: 'REF_EXISTS', nodeId: p.id, message: `pain ${p.id} references unknown persona ${id}`, severity: 'warning' });
        for (const id of p.themeIds || []) if (!themes.has(id)) v.push({ rule: 'REF_EXISTS', nodeId: p.id, message: `pain ${p.id} references unknown theme ${id}`, severity: 'warning' });
    }
    for (const cg of g.competitiveGaps) {
        for (const id of cg.quoteIds || []) if (!quotes.has(id)) v.push({ rule: 'REF_EXISTS', nodeId: cg.id, message: `competitive gap ${cg.id} references unknown quote ${id}`, severity: 'warning' });
    }
    const atByReq = new Map<string, number>();
    for (const at of g.acceptanceTests) {
        if (!reqs.has(at.requirementId)) v.push({ rule: 'AT_POINTS_TO_R', nodeId: at.id, message: `acceptance test ${at.id} points to unknown requirement ${at.requirementId}`, severity: 'error' });
        else atByReq.set(at.requirementId, (atByReq.get(at.requirementId) || 0) + 1);
    }
    for (const m of g.signals) {
        const live = (m.requirementIds || []).filter(id => reqs.has(id));
        if (live.length === 0) v.push({ rule: 'M_POINTS_TO_R', nodeId: m.id, message: `signal ${m.id} points back to no requirement`, severity: 'error' });
    }
    const ledger = byId(g.ledger || []);
    for (const r of g.requirements) {
        const roots = (r.painIds || []).filter(id => pains.has(id)).length + (r.competitiveGapIds || []).filter(id => gaps.has(id)).length
            + (r.ledgerIds || []).filter(id => ledger.has(id)).length + (r.themeIds || []).filter(id => themes.has(id)).length;
        if (roots === 0 && r.claimType !== 'HYPOTHESIS') v.push({ rule: 'R_HAS_ROOT', nodeId: r.id, message: `requirement ${r.id} has no root (pain, gap, theme, stated item or feedback) and is not typed HYPOTHESIS`, severity: 'error' });
        for (const id of r.ledgerIds || []) if (!ledger.has(id)) v.push({ rule: 'REF_EXISTS', nodeId: r.id, message: `requirement ${r.id} references unknown ledger item ${id}`, severity: 'warning' });
        if (r.tier === 'must' && ledgerAuthority(r, air) !== 'authoritative' && independentOriginsForRequirement(r, air).length < 2) v.push({ rule: 'MUST_HAS_TWO_ORIGINS', nodeId: r.id, message: `must-have ${r.id} has fewer than two independent origins`, severity: 'error' });
        if (!atByReq.get(r.id)) v.push({ rule: 'R_HAS_AT', nodeId: r.id, message: `requirement ${r.id} has no acceptance test`, severity: r.claimType === 'HYPOTHESIS' ? 'warning' : 'error' });
    }
    // Every ledger item is documented by at least one requirement (coverage by construction at compile).
    const covered = new Set(g.requirements.flatMap(r => r.ledgerIds || []));
    for (const li of g.ledger || []) if (!covered.has(li.id)) v.push({ rule: 'LEDGER_COVERED', nodeId: li.id, message: `ledger item ${li.id} is covered by no requirement`, severity: 'error' });
    return {
        ok: v.every(x => x.severity !== 'error'),
        violations: v,
        counts: { S: g.sources.length, Q: g.quotes.length, P: g.pains.length, T: g.themes.length, PE: g.personas.length, CG: g.competitiveGaps.length, R: g.requirements.length, AT: g.acceptanceTests.length, M: g.signals.length },
    };
}

// ---- the derived traceability matrix -----------------------------------------------------------

export interface TraceRow {
    requirementId: string;
    tier: PrdTier;
    claimType: PrdClaimType;
    requirement: string;
    pains: string[];
    personas: string[];
    themes: string[];
    /** First 80 characters of each quote (spec 3.2 rendering rule). */
    quoteExcerpts: string[];
    sources: string[];
    acceptanceTests: string[];
    signals: string[];
    /** Scope and feedback ledger roots (SF-n / FB-n). */
    ledger: string[];
}

export function deriveTraceMatrix(air: PrdAir): TraceRow[] {
    const g = air.graph;
    const pains = byId(g.pains), personas = byId(g.personas), themes = byId(g.themes), sources = byId(g.sources);
    const order = air.sections.requirements.requirementIds.length ? air.sections.requirements.requirementIds : g.requirements.map(r => r.id);
    const reqs = byId(g.requirements);
    const rows: TraceRow[] = [];
    for (const id of order) {
        const r = reqs.get(id);
        if (!r) continue;
        const qs = quotesForRequirement(r, air);
        const srcNames = Array.from(new Set(qs.map(q => sources.get(q.sourceId)?.name).filter((n): n is string => !!n)));
        rows.push({
            requirementId: r.id,
            tier: r.tier,
            claimType: r.claimType,
            requirement: r.text,
            pains: (r.painIds || []).map(p => pains.get(p)?.text || p),
            personas: (r.personaIds || []).map(p => personas.get(p)?.name || p),
            themes: (r.themeIds || []).map(t => themes.get(t)?.name || t),
            quoteExcerpts: qs.map(q => q.text.length > 80 ? q.text.slice(0, 80).trimEnd() : q.text),
            sources: srcNames,
            acceptanceTests: g.acceptanceTests.filter(at => at.requirementId === r.id).map(at => at.id),
            signals: g.signals.filter(m => (m.requirementIds || []).includes(r.id)).map(m => m.id),
            ledger: [...(r.ledgerIds || [])],
        });
    }
    return rows;
}

/** Sources cited by at least one quote that reaches a requirement; unused S are dropped (spec 3.2). */
export function usedSources(air: PrdAir): PrdSource[] {
    const sources = byId(air.graph.sources);
    const ids = new Set<string>();
    for (const r of air.graph.requirements) for (const q of quotesForRequirement(r, air)) ids.add(q.sourceId);
    for (const id of [...air.sections.problem.quoteIds, ...air.sections.whyNow.quoteIds]) {
        const q = air.graph.quotes.find(x => x.id === id);
        if (q) ids.add(q.sourceId);
    }
    return [...ids].map(id => sources.get(id)).filter((s): s is PrdSource => !!s);
}

// ---- scope and feedback coverage (2026-10-02) -----------------------------------------------------------

export interface PrdLedgerCoverageRow {
    ledgerId: string;
    type: PrdLedgerType;
    item: string;
    featureArea: PrdFeatureArea;
    documentTitle: string;
    requirementIds: string[];
    /** True when at least one covering requirement came from a model pass (area, gap-fill or research). */
    coveredByModel: boolean;
    /** Requirement ids built deterministically from this item (no model pass covered it). */
    fallbackRequirementIds: string[];
}
export interface PrdLedgerCoverage {
    items: number;
    stated: number;
    feedback: number;
    covered: number;
    coveragePct: number;
    /** Board themes: groups (TH items), original theme ids, and theme ids covered by at least one requirement. */
    themeGroups: number;
    themeIds: number;
    themeIdsCovered: number;
    themeCoveragePct: number;
    /** STATED + FEEDBACK only (the client-document scope). */
    scopeItems: number;
    scopeCovered: number;
    byArea: Record<string, number>;
    byDocument: Record<string, number>;
    requirementsByRootType: Record<PrdRootType, number>;
    rows: PrdLedgerCoverageRow[];
    /** Items no model pass covered, with the requirement the deterministic fallback gave each. */
    uncoveredByModel: PrdLedgerCoverageRow[];
}

/** Coverage computed over the FINAL record (requirements x ledger): the same data the workbook carries. */
export function ledgerCoverage(air: PrdAir): PrdLedgerCoverage {
    const ledger = air.graph.ledger || [];
    const reqs = air.graph.requirements || [];
    const rows: PrdLedgerCoverageRow[] = ledger.map(li => {
        const mine = reqs.filter(r => (r.ledgerIds || []).includes(li.id));
        return {
            ledgerId: li.id, type: li.type, item: li.item, featureArea: li.featureArea, documentTitle: li.documentTitle,
            requirementIds: mine.map(r => r.id),
            coveredByModel: mine.some(r => r.origin !== 'fallback'),
            fallbackRequirementIds: mine.filter(r => r.origin === 'fallback').map(r => r.id),
        };
    });
    const covered = rows.filter(r => r.requirementIds.length > 0).length;
    const count = (f: (li: PrdLedgerItem) => string) => ledger.reduce((m, li) => { const k = f(li); m[k] = (m[k] || 0) + 1; return m; }, {} as Record<string, number>);
    const byRoot: Record<PrdRootType, number> = { stated: 0, feedback: 0, pain: 0, 'competitive-gap': 0, theme: 0, bet: 0 };
    for (const r of reqs) for (const t of requirementRootTypes(r, air)) byRoot[t] += 1;
    const themeItems = ledger.filter(l => l.type === 'theme');
    const allThemeIds = new Set(themeItems.flatMap(l => l.themeIds || []));
    const coveredThemeIds = new Set<string>();
    for (const r of reqs) {
        for (const id of r.themeIds || []) if (allThemeIds.has(id)) coveredThemeIds.add(id);
        for (const lid of r.ledgerIds || []) { const li = ledger.find(l => l.id === lid); for (const id of li?.themeIds || []) coveredThemeIds.add(id); }
    }
    const scopeRows = rows.filter(r => r.type !== 'theme');
    return {
        items: ledger.length,
        stated: ledger.filter(l => l.type === 'stated').length,
        feedback: ledger.filter(l => l.type === 'feedback').length,
        covered,
        coveragePct: ledger.length ? Math.round((covered / ledger.length) * 1000) / 10 : 100,
        themeGroups: themeItems.length,
        themeIds: allThemeIds.size,
        themeIdsCovered: coveredThemeIds.size,
        themeCoveragePct: allThemeIds.size ? Math.round((coveredThemeIds.size / allThemeIds.size) * 1000) / 10 : 100,
        scopeItems: scopeRows.length,
        scopeCovered: scopeRows.filter(r => r.requirementIds.length > 0).length,
        byArea: count(l => l.featureArea),
        byDocument: count(l => l.documentTitle),
        requirementsByRootType: byRoot,
        rows,
        uncoveredByModel: rows.filter(r => r.requirementIds.length > 0 && !r.coveredByModel),
    };
}

// ---- the number rule (spec 3.5) --------------------------------------------------------------------

export interface NakedNumberFinding {
    path: string;
    text: string;
    match: string;
}

/** Standards and identifiers that carry digits but are names, not quantitative claims. */
const STANDARD_NAME_RE = /\b(?:WCAG\s*\d+(?:\.\d+)?(?:\s*(?:AA|AAA|A))?|ISO(?:\/IEC)?(?:\/IEEE)?\s*\d+(?::\d{4})?|IEEE\s*\d+|Article\s*\d+|DO-\d+[A-Z]?|GDPR|p\d{2}\b)/gi;
const ID_RE = /\b[A-Z]{1,4}-\d+[a-z]?\b/g;              // R-1, AT-12, US-3, CG-2, FR-1
const POINTER_RE = /[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi;
/** Provenance dates (an ISO date, a month-year, a bare year) are attribution, not quantitative claims. */
const DATE_RE = /\b(?:19|20)\d{2}(?:-\d{2}(?:-\d{2})?)?\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\b/g;
const DIGIT_RE = /(?:\$\s?)?\d[\d,.]*\s*(?:%|percent|x\b|k\b|m\b|bn\b|ms\b|s\b)?/g;

function stripExemptTokens(s: string): string {
    return stripNameNumbers(String(s || '')).replace(STANDARD_NAME_RE, ' ').replace(POINTER_RE, ' ').replace(ID_RE, ' ').replace(DATE_RE, ' ');
}

/** True when a prose string carries a digit that is not a standard name, an id, a pointer or a year. */
export function hasNakedNumber(s: string): boolean {
    return /\d/.test(stripExemptTokens(s));
}

/**
 * A digit inside a NAME is identity, not a claim ("Acme 360 Product Brief", "Contract 012",
 * "Cluster 38"); a quantity inside a name is still a claim ("95% generative AI adoption ...", "70% job
 * placement within 180 days"). Names of reference nodes are scanned for quantities only.
 */
const NAME_QUANTITY_RE = /(?:\$\s?\d)|\d[\d,.]*\s*(?:%|percent\b|x\b|-?fold\b)|\b\d[\d,.]*\s*(?:k|m|bn)\b|\b\d[\d,.]*[ -](?:days?|weeks?|months?|years?|hours?|minutes?|points?|times|percent)\b/i;

/**
 * Paths that hold PROVENANCE, never model prose: a source record is copied by the provenance lock from
 * the evidence item the quote matched (name, kind, pointer, url, date), so its digits are part of a
 * document or channel name ("Contract014_Vendor_...", "Platform 360"), not a claim about the world.
 */
// A quote's attribution / pointer / sourceId are copied from the cited evidence item by the provenance
// lock (e.g. "Acme 360 Product Brief"), so they are names, not claims.
const PROVENANCE_PATH_RE = /^graph\.(?:sources\.\d+\.(?:name|kind|pointer|url|date|id)|quotes\.\d+\.(?:attribution|pointer|sourceId|id))$/;
/** Reference-node names: approved records named upstream; scanned for quantities only. */
const REFERENCE_NAME_PATH_RE = /^graph\.(?:themes|personas)\.\d+\.name$/;

/**
 * Walk every user-visible string in the PRD. Exempt: verbatim quote text (`graph.quotes[].text`),
 * typed `requirement_target` objects, ids, pointers and source provenance records. Reference names
 * (theme and persona names) are checked for quantities only. Everything else that carries a digit is
 * a finding: titles, statements, requirement text, insights, model-authored attribution. The AIR
 * naked-number signal and the post-processor apply the same exemption.
 */
export function scanNakedNumbers(air: PrdAir): NakedNumberFinding[] {
    const out: NakedNumberFinding[] = [];
    const walk = (v: any, path: string) => {
        if (v == null) return;
        if (isRequirementTarget(v)) return;
        if (typeof v === 'string') {
            if (/(^|\.)(id|sourceId|requirementId|personaId|themeId|jobStoryId|governingThemeId|pointer|url|source_pointer|date|createdAtIso|artifactId|runId|prdAirVersion|designLink|level)$/.test(path)) return;
            if (/Ids?(\.\d+)?$/.test(path)) return;
            if (PROVENANCE_PATH_RE.test(path)) return;
            // The scope and feedback ledger is a source record (verbatim quotes, document titles and the client's
            // own item names), copied by the system from the documents; requirement prose is scanned where it lives.
            if (/^graph\.ledger\./.test(path)) return;
            const stripped = stripExemptTokens(v);
            if (REFERENCE_NAME_PATH_RE.test(path)) {
                const q = stripped.match(NAME_QUANTITY_RE);
                if (q) out.push({ path, text: v, match: q[0].trim() });
                return;
            }
            const m = stripped.match(DIGIT_RE);
            if (m) out.push({ path, text: v, match: m[0].trim() });
            return;
        }
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}.${i}`)); return; }
        if (typeof v === 'object') {
            for (const [k, x] of Object.entries(v)) {
                if (path === 'graph.quotes' || /^graph\.quotes\.\d+$/.test(path)) { if (k === 'text') continue; }
                walk(x, path ? `${path}.${k}` : k);
            }
        }
    };
    walk(air.graph, 'graph');
    walk(air.sections, 'sections');
    walk(air.title, 'title');
    return out;
}

// ---- validation ------------------------------------------------------------------------------------

export interface PrdAirValidation {
    ok: boolean;
    errors: string[];
    warnings: string[];
    traceIntegrity: TraceIntegrityReport;
    nakedNumbers: NakedNumberFinding[];
}

const SEVEN_SIGNAL_FIELDS: Array<keyof PrdSignal | 'guardrail.statement' | 'guardrail.rollbackAuthority'> = ['signal', 'instrument', 'population', 'direction', 'baselineStatus', 'type', 'guardrail.statement', 'guardrail.rollbackAuthority'];

export function validatePrdAir(air: PrdAir): PrdAirValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!isPrdAir(air)) {
        errors.push('not a PrdAir record');
        return { ok: false, errors, warnings, traceIntegrity: { ok: false, violations: [], counts: { S: 0, Q: 0, P: 0, T: 0, PE: 0, CG: 0, R: 0, AT: 0, M: 0 } }, nakedNumbers: [] };
    }
    const s = air.sections;
    if (!s.thesis.statement.trim()) errors.push('thesis.statement is empty');
    if (!s.thesis.decisionRequested.trim()) errors.push('thesis.decisionRequested is empty (the thesis must name the decision)');
    if (s.problem.quoteIds.length < 2) errors.push('problem needs at least two verbatim quotes');
    else {
        const sources = byId(air.graph.sources), quotes = byId(air.graph.quotes);
        const kinds = new Set(s.problem.quoteIds.map(id => sources.get(quotes.get(id)?.sourceId || '')?.kind || sources.get(quotes.get(id)?.sourceId || '')?.name || ''));
        if (kinds.size < 2) warnings.push('problem quotes come from a single source type or source');
    }
    if (!s.whyNow.statement.trim()) errors.push('whyNow.statement is empty');
    if (s.usersAndJobs.primaryPersonaIds.length === 0) errors.push('usersAndJobs needs at least one primary persona id');
    if (s.usersAndJobs.primaryPersonaIds.length > 2) warnings.push('more than two primary personas (spec: one or two)');
    for (const js of s.usersAndJobs.jobStories) if (!js.quoteIds.length) warnings.push(`job story ${js.id} cites no quote`);
    if (s.goalsNonGoalsAppetite.nonGoals.some(n => !n.reason.trim())) errors.push('every non-goal needs a reason');
    if (!isRequirementTarget(s.goalsNonGoalsAppetite.appetite) || String(s.goalsNonGoalsAppetite.appetite.value).trim() === '') errors.push('appetite must be a typed requirement_target time budget');
    if (air.graph.signals.length === 0) errors.push('no success signals');
    const types = new Set(air.graph.signals.map(m => m.type));
    if (air.graph.signals.length && (!types.has('leading') || !types.has('lagging'))) errors.push('signals need at least one leading and one lagging');
    for (const m of air.graph.signals) {
        for (const f of SEVEN_SIGNAL_FIELDS) {
            const val = f === 'guardrail.statement' ? m.guardrail?.statement : f === 'guardrail.rollbackAuthority' ? m.guardrail?.rollbackAuthority : (m as any)[f];
            const empty = val == null || (typeof val === 'string' && !val.trim()) || (typeof val === 'object' && !Object.values(val).some(Boolean));
            if (empty) errors.push(`signal ${m.id} is missing ${f}`);
        }
    }
    if (air.graph.requirements.length === 0) errors.push('no requirements');
    for (const r of air.graph.requirements) {
        if (/\band\b.*\b(and|or)\b/.test(r.text) && r.text.length > 160) warnings.push(`requirement ${r.id} may not be singular (29148)`);
        if (!r.tierRationale.trim()) warnings.push(`requirement ${r.id} has no tier rationale`);
        if (r.claimType === 'HYPOTHESIS' && !r.bet) errors.push(`requirement ${r.id} is HYPOTHESIS but carries no bet`);
    }
    for (const at of air.graph.acceptanceTests) {
        if (!at.given.trim() || !at.when.trim() || !at.then.trim()) errors.push(`acceptance test ${at.id} is not a complete Given/When/Then`);
    }
    if (!s.quality.accessibility.level.trim()) errors.push('quality.accessibility.level is empty');
    if (!s.quality.privacy.dataMinimization.trim()) warnings.push('quality.privacy.dataMinimization is empty');
    if (s.risks.register.length === 0) warnings.push('risk register is empty');
    if (s.risks.alternatives.length === 0) warnings.push('no alternatives considered');
    if (s.delivery.rollout.some(p => !p.killCriteria.trim())) errors.push('every rollout phase needs kill criteria');
    if (!s.delivery.accountableApprover.trim()) errors.push('delivery needs one accountable approver');
    for (const q of s.delivery.openQuestions) if (!q.owner.trim() || !q.due.trim()) errors.push('every open question needs an owner and a due date');

    const traceIntegrity = checkTraceIntegrity(air);
    for (const v of traceIntegrity.violations) (v.severity === 'error' ? errors : warnings).push(v.message);
    const nakedNumbers = scanNakedNumbers(air);
    for (const n of nakedNumbers) errors.push(`naked number "${n.match}" at ${n.path}`);
    return { ok: errors.length === 0, errors, warnings, traceIntegrity, nakedNumbers };
}

// ---- the #proto bridge (spec 3.6) ---------------------------------------------------------------

/** The `prd_candidate` shape the prototype brief and `buildPrototype` already consume (converge, no fork). */
export interface PrdCandidate {
    features: Array<{
        name: string;
        priority: PrdTier;
        description: string;
        acceptanceCriteria: string[];
        citations: string[];
        evidenceBasis: string;
    }>;
    success_metrics: Array<{ metric: string; baseline: string; target: string; guardrail: string }>;
    risks: string[];
    out_of_scope: string[];
}

export function formatRequirementTarget(t?: RequirementTarget): string {
    if (!t) return '';
    const v = String(t.value).trim();
    if (!v) return '';
    return `${t.metric}: ${v}${t.unit ? ' ' + t.unit : ''}`.trim();
}

export function acceptanceTestSentence(at: PrdAcceptanceTest): string {
    const base = `Given ${at.given.replace(/^given\s+/i, '')}, when ${at.when.replace(/^when\s+/i, '')}, then ${at.then.replace(/^then\s+/i, '')}`.replace(/\s+/g, ' ').trim();
    const tgt = formatRequirementTarget(at.target);
    return tgt ? `${base} (${tgt})` : base;
}

export function prdAirToPrdCandidate(air: PrdAir): PrdCandidate {
    const g = air.graph;
    const sources = byId(g.sources);
    const features = g.requirements.map(r => {
        const qs = quotesForRequirement(r, air);
        const citations = Array.from(new Set(qs.map(q => sources.get(q.sourceId)?.name).filter((n): n is string => !!n)));
        const first = qs[0];
        const evidenceBasis = first
            ? `"${first.text}" (${sources.get(first.sourceId)?.name || 'source'})`
            : (r.bet ? `NON-OBVIOUS BET: ${r.bet.statement}. Test: ${r.bet.test}` : '');
        return {
            name: r.text.length > 90 ? r.text.slice(0, 90).trimEnd() : r.text,
            priority: r.tier,
            description: [r.text, r.tierRationale ? `Tier: ${r.tierRationale}.` : ''].filter(Boolean).join(' '),
            acceptanceCriteria: g.acceptanceTests.filter(at => at.requirementId === r.id).map(acceptanceTestSentence),
            citations,
            evidenceBasis,
        };
    });
    return {
        features,
        success_metrics: g.signals.map(m => ({
            metric: m.signal,
            baseline: m.baselineStatus,
            target: `${m.direction === 'up' ? 'Move up' : m.direction === 'down' ? 'Move down' : 'Hold'}; set at the named post-baseline event`,
            guardrail: `${m.guardrail.statement} (rollback: ${m.guardrail.rollbackAuthority})`,
        })),
        risks: air.sections.risks.register.map(r => `${r.failureMode}: early signal ${r.earlySignal}; mitigation ${r.mitigation} (${r.owner})`),
        out_of_scope: air.sections.goalsNonGoalsAppetite.nonGoals.map(n => `${n.text} (${n.reason})`),
    };
}

/** The build-readiness checklist the prototype brief reads as its input (spec 3.6). */
export interface BuildReadinessChecklist {
    statesInventory: Array<{ screen: string; states: string[] }>;
    dataTouchpoints: string[];
    dependencies: Array<{ name: string; kind: string; owner: string }>;
    trackingPlan: Array<{ event: string; properties: string[]; owner: string }>;
    agentBoundaries: string[];
    registeredComponentInventory: string[];
    featureToScreenSeed: Array<{ requirementId: string; feature: string; priority: PrdTier; flows: string[] }>;
}

export function buildReadinessChecklist(air: PrdAir): BuildReadinessChecklist {
    const s = air.sections;
    const flowsByReq = new Map<string, string[]>();
    const jobByReq = new Map<string, string[]>();
    for (const r of air.graph.requirements) {
        const personaIds = new Set(r.personaIds || []);
        const jobs = s.usersAndJobs.jobStories.filter(j => personaIds.has(j.personaId)).map(j => j.id);
        jobByReq.set(r.id, jobs);
        flowsByReq.set(r.id, s.solutionFlows.flows.filter(f => jobs.includes(f.jobStoryId)).map(f => f.name));
    }
    return {
        statesInventory: s.solutionFlows.screenStates.map(x => ({ screen: x.screen, states: [...x.states] })),
        dataTouchpoints: s.delivery.dependencies.filter(d => d.kind === 'data' || d.kind === 'api').map(d => `${d.name} (${d.owner})`),
        dependencies: s.delivery.dependencies.map(d => ({ name: d.name, kind: d.kind, owner: d.owner })),
        trackingPlan: s.delivery.trackingPlan.map(t => ({ event: t.event, properties: [...t.properties], owner: t.owner })),
        agentBoundaries: s.solutionFlows.businessRules.filter(b => /\b(agent|model|AI|assistant|automat)/i.test(b)),
        registeredComponentInventory: s.solutionFlows.screenStates.map(x => x.screen),
        featureToScreenSeed: air.graph.requirements.map(r => ({ requirementId: r.id, feature: r.text, priority: r.tier, flows: flowsByReq.get(r.id) || [] })),
    };
}
