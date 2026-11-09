/**
 * prdRulesContract: the PRD's implementation of the deliverable rule engine (services/deliverableRules.ts).
 *
 *   ADAPTER      `prdAdapter(evidence, stats)` normalizes a PrdAir into a DeliverableClaimSet: every prose unit
 *                (requirement text, acceptance-test clauses, section prose, signal fields, pain text) with a setter,
 *                every quote with a drop closure, every source with a setter, every declared id and reference.
 *   COVERAGE     `PRD_COVERAGE`: the universe is every STATED, FEEDBACK and THEME ledger id plus every board theme
 *                id; a requirement covers the ledger ids it lists, the theme ids of its THEME roots and its own
 *                theme ids; the deterministic fill writes one requirement per uncovered ledger item.
 *   EXTRA RULES  one outcome per requirement (split), Given/When/Then on every requirement (fill), tiers derived
 *                from evidence (client-stated required => must), unique sequential R-/AT- ids (renumber).
 *
 * `enforcePrdRules` runs the engine in-path after compile and stores the receipt on the record. Never throws.
 */
import {
    runDeliverableRules, type DeliverableAdapter, type DeliverableClaimSet, type DeliverableRule, type CoverageContract,
    type CoverageSourceItem, type ClaimUnit, type ClaimRef, type EvidenceRef, type LedgerReadStats, type DeliverableReceipt,
} from './deliverableRules';
import {
    type PrdAir, type PrdRequirement, type PrdAcceptanceTest, isRequirementTarget, applyDerivedTiers, typeUntraceableAsHypothesis,
} from './prdAir';
import { flattenEvidence, compoundOutcome, fallbackRequirementDraft, areaLabelOf, type PrdCompilerInputs } from './prdCompiler';
import type { LedgerItem } from './engagementLedger';

// ---- adapter -------------------------------------------------------------------------------------------

const SKIP_KEY_RE = /^(id|ids|quoteIds|supportingQuoteIds|personaId|jobStoryId|governingThemeId|primaryPersonaIds|requirementIds|signalIds|designLink|level|kind|quadrant|likelihood|severity|direction|type|triggered|measurable)$/;
// 2026-10-20 (root-cause audit A7, plan item 9): acceptance criteria and targets are SPECIFICATIONS, not claims. The
// number rule used to turn "the page renders within 2 seconds for 95% of requests" into "the stated threshold"
// twice over, which leaves a test no one can run. Given / When / Then, a threshold and a target keep their figures;
// requirement text, pains, theme prose and section prose stay under the rule.
const NUMBER_EXEMPT_KEY_RE = /^(due|date|regime|exposedCriteria|properties|event|given|when|then|threshold|target)$/;

function sectionUnits(node: any, path: string, out: ClaimUnit[], parentKey = ''): void {
    if (!node || typeof node !== 'object' || isRequirementTarget(node)) return;
    const entries: Array<[string | number, any]> = Array.isArray(node) ? node.map((v, i) => [i, v] as [number, any]) : Object.entries(node);
    for (const [k, v] of entries) {
        const key = typeof k === 'number' ? parentKey : k;
        if (typeof k === 'string' && SKIP_KEY_RE.test(k)) continue;
        const p = `${path}.${k}`;
        if (typeof v === 'string') {
            if (!v.trim()) continue;
            out.push({ id: p, kind: 'section', text: v, numbersChecked: !NUMBER_EXEMPT_KEY_RE.test(String(key)), set: t => { (node as any)[k] = t; } });
        } else if (v && typeof v === 'object') sectionUnits(v, p, out, String(key));
    }
}

function dropQuote(air: PrdAir, qid: string): void {
    const g = air.graph, s = air.sections;
    g.quotes = g.quotes.filter(q => q.id !== qid);
    const strip = (arr?: string[]) => (arr || []).filter(x => x !== qid);
    for (const p of g.pains) p.quoteIds = strip(p.quoteIds);
    for (const c of g.competitiveGaps) c.quoteIds = strip(c.quoteIds);
    for (const l of g.ledger || []) if (l.quoteId === qid) l.quoteId = undefined;
    s.problem.quoteIds = strip(s.problem.quoteIds);
    s.whyNow.quoteIds = strip(s.whyNow.quoteIds);
    for (const j of s.usersAndJobs.jobStories) j.quoteIds = strip(j.quoteIds);
    for (const a of s.hypotheses.assumptions) a.supportingQuoteIds = strip(a.supportingQuoteIds);
}

function prdAdapter(evidence: EvidenceRef[], stats?: LedgerReadStats): DeliverableAdapter<PrdAir> {
    return {
        deliverable: 'prd',
        claimSet: (air: PrdAir): DeliverableClaimSet => {
            const g = air.graph, s = air.sections;
            const units: ClaimUnit[] = [{ id: 'title', kind: 'title', text: air.title, set: t => { air.title = t; } }];
            for (const r of g.requirements) {
                units.push({ id: r.id, kind: 'requirement', text: r.text, set: t => { r.text = t; } });
                if (r.notes) units.push({ id: `${r.id}.notes`, kind: 'note', text: r.notes, numbersChecked: false, set: t => { r.notes = t; } });
                if (r.tierRationale) units.push({ id: `${r.id}.tier`, kind: 'rationale', text: r.tierRationale, set: t => { r.tierRationale = t; } });
            }
            // Acceptance tests are specifications: the writing scrub reaches them, the number rule does not (A7).
            for (const at of g.acceptanceTests) {
                for (const f of ['given', 'when', 'then'] as const) units.push({ id: `${at.id}.${f}`, kind: 'test', text: at[f], numbersChecked: false, set: t => { at[f] = t; } });
                const thr = (at as any).threshold;
                if (typeof thr === 'string' && thr.trim()) units.push({ id: `${at.id}.threshold`, kind: 'test', text: thr, numbersChecked: false, set: t => { (at as any).threshold = t; } });
            }
            for (const p of g.pains) units.push({ id: p.id, kind: 'pain', text: p.text, set: t => { p.text = t; } });
            // Theme records render in the workbook's Themes sheet and the brief: their names and insights are prose
            // the number rule and the writing scrub must reach (2026-10-02: 107 theme names carried naked figures).
            for (const t of g.themes as any[]) {
                if (t.name) units.push({ id: `${t.id}.name`, kind: 'theme', text: t.name, set: v => { t.name = v; } });
                if (t.insight) units.push({ id: `${t.id}.insight`, kind: 'theme', text: t.insight, set: v => { t.insight = v; } });
            }
            for (const m of g.signals) {
                for (const f of ['signal', 'instrument', 'baselineStatus'] as const) if (m[f]) units.push({ id: `${m.id}.${f}`, kind: 'signal', text: m[f], numbersChecked: f !== 'baselineStatus', set: t => { m[f] = t; } });
                if (m.guardrail?.statement) units.push({ id: `${m.id}.guardrail`, kind: 'signal', text: m.guardrail.statement, set: t => { m.guardrail.statement = t; } });
                // A success signal's target is a specification (A7): scrubbed for writing, exempt from the number rule.
                const tgt = (m as any).target;
                if (typeof tgt === 'string' && tgt.trim()) units.push({ id: `${m.id}.target`, kind: 'signal', text: tgt, numbersChecked: false, set: t => { (m as any).target = t; } });
            }
            sectionUnits(s, 'sections', units);
            const quotes = g.quotes.map(q => ({ id: q.id, text: q.text, pointer: q.pointer, sourceId: q.sourceId, drop: () => dropQuote(air, q.id) }));
            const sources = g.sources.map(src => ({ id: src.id, name: src.name, pointer: src.pointer, set: (v: { name: string; pointer?: string }) => { src.name = v.name; src.pointer = v.pointer; } }));
            const declared = [
                ...g.requirements.map(x => x.id), ...g.acceptanceTests.map(x => x.id), ...g.signals.map(x => x.id), ...g.pains.map(x => x.id),
                ...g.competitiveGaps.map(x => x.id), ...g.personas.map(x => x.id), ...g.themes.map(x => x.id), ...(g.ledger || []).map(x => x.id),
                ...g.quotes.map(x => x.id), ...g.sources.map(x => x.id),
            ];
            const refs: ClaimRef[] = [];
            const listRef = (from: string, arr: string[], set: (next: string[]) => void) => { for (const to of arr) refs.push({ from, to, drop: () => set(arr.filter(x => x !== to)) }); };
            for (const r of g.requirements) {
                listRef(r.id, r.painIds, n => { r.painIds = n; });
                listRef(r.id, r.competitiveGapIds, n => { r.competitiveGapIds = n; });
                listRef(r.id, r.personaIds, n => { r.personaIds = n; });
                listRef(r.id, r.themeIds, n => { r.themeIds = n; });
                listRef(r.id, r.ledgerIds || [], n => { r.ledgerIds = n; });
                listRef(r.id, r.acceptanceTestIds, n => { r.acceptanceTestIds = n; });
                listRef(r.id, r.signalIds, n => { r.signalIds = n; });
            }
            for (const at of g.acceptanceTests) refs.push({ from: at.id, to: at.requirementId, drop: () => { g.acceptanceTests = g.acceptanceTests.filter(x => x !== at); } });
            for (const m of g.signals) listRef(m.id, m.requirementIds, n => { m.requirementIds = n; });
            for (const q of g.quotes) refs.push({ from: q.id, to: q.sourceId, drop: () => dropQuote(air, q.id) });
            for (const p of g.pains) listRef(p.id, p.quoteIds, n => { p.quoteIds = n; });
            listRef('sections.requirements', s.requirements.requirementIds, n => { s.requirements.requirementIds = n; });
            listRef('sections.successSignals', s.successSignals.signalIds, n => { s.successSignals.signalIds = n; });
            listRef('sections.problem', s.problem.quoteIds, n => { s.problem.quoteIds = n; });
            listRef('sections.whyNow', s.whyNow.quoteIds, n => { s.whyNow.quoteIds = n; });
            for (const l of g.ledger || []) if (l.quoteId) refs.push({ from: l.id, to: l.quoteId, drop: () => { l.quoteId = undefined; } });
            return { deliverable: 'prd', units, quotes, sources, evidence, declaredIds: declared, refs, ledgerStats: stats };
        },
    };
}

// ---- coverage contract ------------------------------------------------------------------------------------

function nextIds(air: PrdAir): { r: () => string; at: () => string } {
    let rn = air.graph.requirements.reduce((m, r) => Math.max(m, +(/^R-(\d+)$/.exec(r.id)?.[1] || 0)), 0);
    let an = air.graph.acceptanceTests.reduce((m, a) => Math.max(m, +(/^AT-(\d+)$/.exec(a.id)?.[1] || 0)), 0);
    return { r: () => `R-${++rn}`, at: () => `AT-${++an}` };
}

/** Materialize a requirement draft (the compiler's fallback shape) directly on the record. */
function materialize(air: PrdAir, draft: any, ids: ReturnType<typeof nextIds>): PrdRequirement {
    const id = ids.r();
    const tests: PrdAcceptanceTest[] = (draft.acceptanceTests || []).map((t: any) => ({ id: ids.at(), requirementId: id, given: String(t.given || ''), when: String(t.when || ''), then: String(t.then || '') }));
    const themeIds = new Set(air.graph.themes.map(t => t.id));
    const req: PrdRequirement = {
        id, text: draft.text, kind: 'functional', tier: draft.proposedTier || 'should', proposedTier: draft.proposedTier || 'should', tierRationale: '',
        claimType: 'DEFENSIBLE_INFERENCE', mapsToThesis: true, kano: 'unknown', cagansBar: !!draft.cagansBar,
        painIds: [], competitiveGapIds: [], personaIds: (draft.personaIds || []).filter((p: string) => air.graph.personas.some(x => x.id === p)),
        themeIds: (draft.themeIds || []).filter((t: string) => themeIds.has(t)),
        acceptanceTestIds: tests.map(t => t.id), signalIds: [], ledgerIds: [...(draft.ledgerIds || [])], origin: 'fallback', notes: draft.notes,
    };
    air.graph.requirements.push(req);
    air.graph.acceptanceTests.push(...tests);
    air.sections.requirements.requirementIds.push(id);
    return req;
}

function prdCoverage(inputs: Pick<PrdCompilerInputs, 'areas'>): CoverageContract<PrdAir> {
    return {
        deliverable: 'PRD',
        universe: (ledger: LedgerItem[]) => {
            const out: CoverageSourceItem[] = [];
            for (const li of ledger) {
                out.push({ id: li.id, type: li.type, label: li.item, ledgerId: li.id, document: li.documentTitle });
                if (li.type === 'theme') for (const m of li.themeMembers || (li.themeIds || []).map(id => ({ id, name: li.item }))) out.push({ id: `theme:${m.id}`, type: 'theme id', label: m.name, ledgerId: li.id, document: li.documentTitle });
            }
            return out;
        },
        unitsOf: (air) => air.graph.requirements.map(r => ({ id: r.id, origin: r.origin })),
        covers: (unit, air) => {
            const r = air.graph.requirements.find(x => x.id === unit.id);
            if (!r) return [];
            const ledger = new Map((air.graph.ledger || []).map(l => [l.id, l] as const));
            const out = new Set<string>(r.ledgerIds || []);
            for (const id of r.ledgerIds || []) for (const t of ledger.get(id)?.themeIds || []) out.add(`theme:${t}`);
            for (const t of r.themeIds || []) out.add(`theme:${t}`);
            return [...out];
        },
        deterministicFill: (air, missing) => {
            const ledger = new Map((air.graph.ledger || []).map(l => [l.id, l] as const));
            const want = Array.from(new Set(missing.map(m => m.ledgerId).filter((x): x is string => !!x)));
            const ids = nextIds(air);
            const primary = air.graph.personas.find(p => p.primary)?.id;
            let n = 0;
            for (const lid of want) {
                const li = ledger.get(lid);
                if (!li) continue;
                materialize(air, fallbackRequirementDraft(li, areaLabelOf(inputs, li.featureArea), primary), ids);
                n++;
            }
            return n;
        },
    };
}

// ---- PRD rules -------------------------------------------------------------------------------------------

const lowerLead = (t: string) => t.replace(/^(The|A|An|Each|Every)\b/, m => m.toLowerCase());
const noStop = (t: string) => t.replace(/[.;:,\s]+$/, '');

/** Words that open a verb's object: a third-person verb directly followed by one of these is a verb, not a noun. */
const OBJECT_OPENER = /^(?:each|every|a|an|the|its|their|his|her|our|your|any|all|one|that|it|them|whether|why|how|when|which|what|who|no|only|both|either|this|these|those)$/i;
/**
 * Split "<Subject> <verb>s <object>, and <verb>s <object>" into two single-outcome sentences, or return null.
 * 2026-10-02 live #prd read-through: the old split took the first word ending in "s" as the verb ("readiness"),
 * split shared-object pairs ("reviews and approves each answer" left "A co-op advisor reviews.") and noun lists
 * ("guidance, navigation help, and answers to questions"): 194 garbled requirements. A split now happens only when
 * the result is provably two sentences: the subject ends at a third-person verb followed by its object, the left
 * half keeps an object, and each half has at least five words. Otherwise the requirement stays as written.
 */
export function splitCompound(text: string): [string, string] | null {
    const joint = compoundOutcome(text);
    if (!joint) return null;
    const at = text.indexOf(joint);
    if (at <= 0) return null;
    const left = text.slice(0, at).trim().replace(/[,;]+$/, '');
    const right = text.slice(at).replace(/^[,\s]*and\s+(?:then\s+|also\s+)?/i, '').trim();
    // Run 3 (2026-10-02): "and resources that apply ..." read as a verb pair. A plural noun followed by a relative
    // pronoun is not a verb; a pair that might be one is left unsplit.
    if (/^\S+\s+(?:that|which|who|whose)\b/i.test(right)) return null;
    // 2026-10-03 live (a second project): "record alternative suppliers and vendors the farm could use" split into
    // "The plan builder vendors the farm ...". A plural noun joined by a bare "and" (no comma) to another word ending
    // in s is a noun pair ("suppliers and vendors", "threats and risks"), not two verbs.
    const sep = text.slice(0, at + joint.length).match(/(,)?\s*and\s+(?:then\s+|also\s+)?[a-z]+(?:s|es)\s+\S+$/i);
    if (sep && !sep[1] && /[a-z]s$/i.test(left.split(/\s+/).pop() || '')) return null;
    const words = left.split(/\s+/);
    const verbAt = words.findIndex((w, i) => i > 0 && /^[a-z]+(?:s|es)$/.test(w) && OBJECT_OPENER.test(words[i + 1] || ''));
    if (verbAt <= 0) return null;
    if (words.length - verbAt - 1 < 2) return null;              // the left half must keep its object
    const subject = words.slice(0, verbAt).join(' ');
    const a = `${noStop(left)}.`, b = `${subject} ${noStop(right)}.`;
    if (a.split(/\s+/).length < 5 || b.split(/\s+/).length < 5) return null;
    return [a, b];
}

function prdRules(): DeliverableRule<PrdAir>[] {
    return [
        {
            id: 'one-outcome', title: 'One outcome per requirement',
            // Counted only where the split is provably two sentences (splitCompound); a pair it cannot split safely is
            // a shared object or a noun list, not two outcomes, and the requirement is left as written.
            check: (air) => ({ checked: air.graph.requirements.length, violations: air.graph.requirements.filter(r => splitCompound(r.text)).map(r => `${r.id} joins two outcomes`) }),
            repair: (air, _cs, violations) => {
                const ids = nextIds(air);
                let filled = 0;
                const queue = violations.map(line => air.graph.requirements.find(x => x.id === line.split(' ')[0])).filter((x): x is PrdRequirement => !!x);
                for (let guard = 0; queue.length && guard < 4 * violations.length + 8; guard++) {
                    const r = queue.shift()!;
                    const parts = splitCompound(r.text);
                    if (!parts) continue;
                    r.text = parts[0];
                    const id = ids.r();
                    const clone: PrdRequirement = { ...r, id, text: parts[1], acceptanceTestIds: [], signalIds: [], ledgerIds: [...(r.ledgerIds || [])], painIds: [...r.painIds], competitiveGapIds: [...r.competitiveGapIds], personaIds: [...r.personaIds], themeIds: [...r.themeIds], notes: [r.notes, `Split from ${r.id}: one outcome per requirement.`].filter(Boolean).join(' ') };
                    const idx = air.graph.requirements.indexOf(r);
                    air.graph.requirements.splice(idx + 1, 0, clone);
                    const order = air.sections.requirements.requirementIds;
                    const oi = order.indexOf(r.id);
                    order.splice(oi < 0 ? order.length : oi + 1, 0, id);
                    filled++;
                    // A split half that still joins two outcomes is split again.
                    if (splitCompound(r.text)) queue.push(r);
                    if (splitCompound(clone.text)) queue.push(clone);
                }
                return { repaired: 0, filled };
            },
        },
        {
            id: 'given-when-then', title: 'Every requirement has a Given / When / Then acceptance test',
            check: (air) => {
                const ok = new Set(air.graph.acceptanceTests.filter(t => t.given?.trim() && t.when?.trim() && t.then?.trim()).map(t => t.requirementId));
                return { checked: air.graph.requirements.length, violations: air.graph.requirements.filter(r => !ok.has(r.id)).map(r => `${r.id} has no complete Given/When/Then`) };
            },
            repair: (air, _cs, violations) => {
                const ids = nextIds(air);
                let filled = 0;
                for (const line of violations) {
                    const r = air.graph.requirements.find(x => x.id === line.split(' ')[0]);
                    if (!r) continue;
                    air.graph.acceptanceTests = air.graph.acceptanceTests.filter(t => !(t.requirementId === r.id && !(t.given?.trim() && t.when?.trim() && t.then?.trim())));
                    const at: PrdAcceptanceTest = { id: ids.at(), requirementId: r.id, given: 'the release candidate is deployed to the test environment', when: 'a tester exercises the behavior this requirement names', then: lowerLead(noStop(r.text)) };
                    air.graph.acceptanceTests.push(at);
                    r.acceptanceTestIds = [...r.acceptanceTestIds.filter(id => air.graph.acceptanceTests.some(t => t.id === id)), at.id];
                    filled++;
                }
                return { repaired: 0, filled };
            },
        },
        {
            // 2026-10-02 live #prd: 11 synthesized pains lost their only quote to the verbatim rule and stayed in the
            // record as unsupported claims. A pain is evidence or it is nothing: it is removed and unlinked; a
            // requirement left with no root at all is typed HYPOTHESIS (carried as a bet), never given a quote.
            id: 'pain-has-quote', title: 'Every pain rests on a verbatim quote',
            check: (air) => {
                const quotes = new Set(air.graph.quotes.map(q => q.id));
                return { checked: air.graph.pains.length, violations: air.graph.pains.filter(p => !(p.quoteIds || []).some(id => quotes.has(id))).map(p => `${p.id} has no verbatim quote`) };
            },
            repair: (air, _cs, violations) => {
                const bad = new Set(violations.map(v => v.split(' ')[0]));
                air.graph.pains = air.graph.pains.filter(p => !bad.has(p.id));
                for (const r of air.graph.requirements) r.painIds = (r.painIds || []).filter(id => !bad.has(id));
                typeUntraceableAsHypothesis(air);
                applyDerivedTiers(air);
                return { repaired: bad.size, filled: 0 };
            },
        },
        {
            id: 'tier-derived', title: 'Tiers derived from evidence (client-stated required items and decisions are must)',
            check: (air) => {
                const clone: PrdAir = JSON.parse(JSON.stringify(air));
                applyDerivedTiers(clone);
                const v = air.graph.requirements.filter((r, i) => clone.graph.requirements[i]?.tier !== r.tier).map(r => `${r.id} tier ${r.tier} is not the derived tier`);
                return { checked: air.graph.requirements.length, violations: v };
            },
            repair: (air, _cs, violations) => { applyDerivedTiers(air); return { repaired: violations.length, filled: 0 }; },
        },
        {
            id: 'sequential-ids', title: 'Requirement and acceptance-test ids are unique and sequential',
            check: (air) => {
                const v: string[] = [];
                air.graph.requirements.forEach((r, i) => { if (r.id !== `R-${i + 1}`) v.push(`${r.id} is out of sequence (expected R-${i + 1})`); });
                orderedTests(air).forEach((t, i) => { if (t.id !== `AT-${i + 1}`) v.push(`${t.id} is out of sequence (expected AT-${i + 1})`); });
                return { checked: air.graph.requirements.length + air.graph.acceptanceTests.length, violations: v };
            },
            repair: (air) => ({ repaired: renumber(air), filled: 0 }),
        },
    ];
}

function orderedTests(air: PrdAir): PrdAcceptanceTest[] {
    const pos = new Map(air.graph.requirements.map((r, i) => [r.id, i] as const));
    return air.graph.acceptanceTests.map((t, i) => ({ t, i })).sort((a, b) => ((pos.get(a.t.requirementId) ?? 1e9) - (pos.get(b.t.requirementId) ?? 1e9)) || (a.i - b.i)).map(x => x.t);
}

/** Renumber R-n in record order and AT-n in requirement order; every reference is remapped. */
export function renumber(air: PrdAir): number {
    const g = air.graph;
    const rmap = new Map<string, string>();
    g.requirements.forEach((r, i) => rmap.set(r.id, `R-${i + 1}`));
    const tests = orderedTests(air);
    const amap = new Map<string, string>();
    // Duplicate test ids are resolved by object, not by id.
    const byObj = new Map<PrdAcceptanceTest, string>();
    tests.forEach((t, i) => { byObj.set(t, `AT-${i + 1}`); if (!amap.has(t.id)) amap.set(t.id, `AT-${i + 1}`); });
    let changed = 0;
    for (const r of g.requirements) { const n = rmap.get(r.id)!; if (n !== r.id) changed++; }
    for (const t of tests) { const n = byObj.get(t)!; if (n !== t.id) changed++; t.id = n; t.requirementId = rmap.get(t.requirementId) || t.requirementId; }
    g.acceptanceTests = tests;
    for (const r of g.requirements) {
        r.id = rmap.get(r.id)!;
        r.acceptanceTestIds = g.acceptanceTests.filter(t => t.requirementId === r.id).map(t => t.id);
    }
    for (const m of g.signals) m.requirementIds = m.requirementIds.map(id => rmap.get(id) || id);
    air.sections.requirements.requirementIds = g.requirements.map(r => r.id);
    return changed;
}

// ---- entry point --------------------------------------------------------------------------------------

export async function enforcePrdRules(air: PrdAir, ctx: { inputs: PrdCompilerInputs }): Promise<DeliverableReceipt> {
    const inputs = ctx.inputs;
    const ev = flattenEvidence({ ...inputs, maxChunks: Number.MAX_SAFE_INTEGER, maxChunkChars: Number.MAX_SAFE_INTEGER, maxThemeQuotes: Number.MAX_SAFE_INTEGER });
    const evidence: EvidenceRef[] = ev.map(e => ({ id: e.id, text: e.text, pointer: e.pointer, sourceName: e.sourceName }));
    const receipt = await runDeliverableRules(air, prdAdapter(evidence, inputs.ledgerStats), {
        coverage: prdCoverage(inputs), ledger: air.graph.ledger || [], extraRules: prdRules(),
    });
    air.receipt = receipt;
    return receipt;
}
