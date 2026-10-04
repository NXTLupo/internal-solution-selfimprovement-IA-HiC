/**
 * deliverableRules: the ONE deterministic rule engine every consulting deliverable runs in-path after generation
 * (2026-10-02, owner rules: "these rules must be deterministically enforced and generalized for ANY RESEARCH
 * PROJECT"; "these rules should also be enforced with ALL other hashtag outputs, not just PRD. Consulting grade
 * deliverables must be comprehensive.").
 *
 * The engine runs: violation -> targeted repair -> deterministic fill. It never refuses and never withholds an
 * output; it returns a RECEIPT (per rule: checked, violations left, repaired, filled, pass) that the deliverable
 * stores on its record and renders for the reader.
 *
 * ---- HOW TO ADD A DELIVERABLE (the contract a follow-up agent implements) ------------------------------------
 *
 * 1. ADAPTER (`DeliverableAdapter<A>`): `claimSet(artifact)` normalizes the artifact into a `DeliverableClaimSet`:
 *    every user-visible prose UNIT (id, kind, text, the quotes and pointers it rests on, a `set` closure that
 *    rewrites its text in the artifact), every QUOTE (text, pointer, source id, `drop` closure that removes it),
 *    every SOURCE (id, name, pointer, `set` closure), every declared id and every id REFERENCE (with a `drop`
 *    closure), the EVIDENCE the generator was shown (id, full text, pointer) and the ledger read stats. The engine
 *    repairs through those closures only, so it never needs to know the artifact's shape. Rebuild the claim set
 *    from the artifact on every call (the engine calls it again after each repair).
 * 2. COVERAGE CONTRACT (`CoverageContract<A>`): `universe(ledger)` lists the source items the deliverable must
 *    cover (for most deliverables: every STATED, FEEDBACK and THEME ledger id plus every board theme id; see
 *    services/engagementLedger.ts); `unitsOf(artifact)` lists the deliverable's units (requirements, slides,
 *    persona cards, recommendations ...); `covers(unit, artifact)` returns the source item ids a unit documents;
 *    `gapFill` (optional, async) asks the model to cover the missing items; `deterministicFill` adds one unit per
 *    item still missing, built from the item itself and flagged for refinement. Coverage is 100% by construction.
 * 3. EXTRA RULES (`DeliverableRule<A>[]`): rules specific to the deliverable (for the PRD: one outcome per
 *    requirement, Given/When/Then on every requirement, tiers derived from evidence, sequential ids). Each is a
 *    pure `check` plus an optional `repair` that returns { repaired, filled }.
 * 4. Call `runDeliverableRules(artifact, adapter, { coverage, ledger, extraRules })`, store the receipt on the
 *    record, and render `formatReceiptLines(receipt)` in the reply and the export. The PRD implementation is
 *    services/prdRulesContract.ts.
 *
 * Generic by rule: nothing here names a client, an industry, a product or a deliverable's internal shape.
 */
import { stripEmDashes, removeDeleteSafeFiller, stripFormatTells } from './slidePostProcessor';
import type { LedgerItem } from './engagementLedger';

// ---- the normalized claim set ------------------------------------------------------------------------

export interface ClaimQuote {
    id: string;
    text: string;
    pointer?: string;
    sourceId?: string;
    /** The evidence id the quote was admitted against, when the deliverable records it. */
    evidenceId?: string;
    /** Remove this quote (and every reference to it) from the artifact. */
    drop?: () => void;
}
export interface ClaimSource {
    id: string;
    name: string;
    pointer?: string;
    /** Rewrite the source record from an evidence item (provenance repair). */
    set?: (v: { name: string; pointer?: string }) => void;
}
export interface ClaimUnit {
    id: string;
    kind: string;
    text: string;
    /** Rewrite this unit's text in the artifact. Absent for text the engine must not touch. */
    set?: (text: string) => void;
    /** False for text the number rule exempts (a typed target, a standard name field). */
    numbersChecked?: boolean;
}
export interface ClaimRef { from: string; to: string; drop?: () => void }
export interface EvidenceRef { id: string; text: string; pointer?: string; sourceName?: string }
export interface LedgerReadStats {
    engagement?: string;
    /** Every client-upload page of the engagement with chunks registered vs chunks read. */
    documents: Array<{ wikiPath: string; title: string; chunksRegistered: number; chunksRead: number }>;
    /** Generated-synthesis pages that belong to another engagement (proxy /api/engagement/page-owners). */
    foreignPages?: string[];
}
export interface DeliverableClaimSet {
    deliverable: string;
    units: ClaimUnit[];
    quotes: ClaimQuote[];
    sources: ClaimSource[];
    evidence: EvidenceRef[];
    declaredIds: string[];
    refs: ClaimRef[];
    ledgerStats?: LedgerReadStats;
}

// ---- results + receipt -----------------------------------------------------------------------------

export interface RuleResult {
    ruleId: string;
    title: string;
    checked: number;
    pass: boolean;
    /** Violations left AFTER repair and fill. */
    violations: string[];
    /** Violations found before repair. */
    found: number;
    repaired: number;
    filled: number;
}
export interface DeliverableReceipt {
    deliverable: string;
    at: string;
    pass: boolean;
    rules: RuleResult[];
}

export interface DeliverableRule<A> {
    id: string;
    title: string;
    check: (artifact: A, cs: DeliverableClaimSet) => { checked: number; violations: string[] };
    repair?: (artifact: A, cs: DeliverableClaimSet, violations: string[]) => { repaired: number; filled: number };
}
export interface DeliverableAdapter<A> {
    deliverable: string;
    claimSet: (artifact: A) => DeliverableClaimSet;
}

export interface CoverageSourceItem {
    id: string;
    type: string;
    label: string;
    /** The ledger item behind it (a theme id points at its TH group). */
    ledgerId?: string;
    document?: string;
}
export interface CoverageUnit { id: string; origin?: string }
export interface CoverageContract<A> {
    deliverable: string;
    universe: (ledger: LedgerItem[]) => CoverageSourceItem[];
    unitsOf: (artifact: A) => CoverageUnit[];
    covers: (unit: CoverageUnit, artifact: A) => string[];
    gapFill?: (artifact: A, missing: CoverageSourceItem[]) => Promise<number>;
    deterministicFill: (artifact: A, missing: CoverageSourceItem[]) => number;
}

// ---- text helpers ------------------------------------------------------------------------------------

function normQ(s: string): string {
    return String(s || '').replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/…/g, '...')
        .replace(/[\u2013\u2014]/g, '-').toLowerCase().replace(/[^a-z0-9'"$%.,:;!?()\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** Verbatim: the normalized quote (minus a trailing ellipsis) is inside the evidence text; long quotes tolerate truncation. */
function isVerbatim(quote: string, evidence: string): boolean {
    const q = normQ(quote).replace(/\.\.\.$/, '').replace(/^"|"$/g, '').trim();
    if (q.length < 8) return false;
    const e = normQ(evidence);
    if (e.includes(q)) return true;
    const sq = q.replace(/[^a-z0-9]/g, ''), se = e.replace(/[^a-z0-9]/g, '');
    return (sq.length >= 8 && se.includes(sq)) || (q.length >= 60 && e.includes(q.slice(0, 50)));
}
const pageOf = (p?: string) => String(p || '').replace(/#c\d+$/i, '');
const UPLOAD_PAGE_RE = /(?:^|\/)(?:client-uploads|uploads)\//i;

const STANDARD_RE = /\b(?:WCAG\s*\d+(?:\.\d+)?(?:\s*(?:AA|AAA|A))?|ISO(?:\/IEC)?(?:\/IEEE)?\s*\d+(?::\d{4})?|IEEE\s*\d+|Article\s*\d+|p\d{2})\b/gi;
const ID_TOKEN_RE = /\b[A-Z]{1,5}-\d+[a-z]?\b/g;
// Any slash path whose first segment starts with a letter, with or without ".md" (run 3: a TRUNCATED pointer
// "[articles/hic-theme-synthesis/12e4b6fb89" lost its digits to the number repair).
const POINTER_TOKEN_RE = /\b[A-Za-z][\w.\\-]*\/[\w./\\-]+(?:#c\d+)?/gi;
const YEAR_RE = /\b(?:19|20)\d{2}(?:-\d{2}(?:-\d{2})?)?\b/g;
// 2026-10-02 live #prd read-through: the old pattern ended `[\d,.]*\s*(unit)?`, so a figure with no unit ate the
// space after it ("Acme 360 or" became "Acme the stated thresholdor") and a figure ending a sentence ate the
// full stop. The unit, and only the unit, now takes the space; the figure never ends on a separator.
const NUMBER_UNITS = '%|percent\\b|x\\b|k\\b|m\\b|bn\\b|ms\\b|seconds?\\b|minutes?\\b|hours?\\b|days?\\b|weeks?\\b|months?\\b|years?\\b|terms?\\b|times\\b|points?\\b';
const NUMBER_PHRASE_RE = new RegExp(`(?:\\$\\s?)?\\b\\d(?:[\\d,.]*\\d)?(?:\\s*(?:${NUMBER_UNITS}))?`, 'gi');
/**
 * A NAME that carries a number ("Acme 360", "Phase 2", "Platform Release 2.1"): a capitalized word directly
 * before a figure with no unit after it. Quantity openers ("Over 200", "Within 48 hours") are not names. Case
 * sensitive on purpose. 579 workbook cells of the 2026-10-02 live #prd had a product name rewritten as a figure.
 */
const QUANTITY_OPENERS = 'Over|Under|About|Around|Approximately|Roughly|Within|Up|Nearly|Almost|More|Less|Fewer|Only|Just|All|The|A|An|Some|Each|Every|At|By|In|On|For|To|Of|From|After|Before|Top|Last|First|Next|Reduce|Cut|Add|Save|Target|Than|With';
const NAME_NUMBER_RE = new RegExp(`\\b(?!(?:${QUANTITY_OPENERS})\\b)[A-Z][A-Za-z]+(?:[ -][A-Z][A-Za-z]+)? \\d+(?:\\.\\d+)?\\b(?!\\s*(?:${NUMBER_UNITS}))(?![-/:.]\\d)`, 'g');
/** Blank out names that carry a number (the one definition, shared with the PrdAir validator). */
export function stripNameNumbers(text: string): string { return String(text || '').replace(NAME_NUMBER_RE, ' '); }
// A figure of two or more digits that modifies a SINGULAR noun is a name, not a count ("a unified 360 student
// profile"); a count takes a plural ("400 students") or a unit, and stays subject to the rule.
const MODIFIER_NUMBER_RE = new RegExp(`\\b\\d{2,}(?:\\.\\d+)?\\s+(?!(?:${NUMBER_UNITS}))[a-z]*[a-rt-z]\\b`, 'g');
const PROTECTED_RE = new RegExp(`${STANDARD_RE.source}|${POINTER_TOKEN_RE.source}|${ID_TOKEN_RE.source}|${YEAR_RE.source}`, 'gi');
/** Base-26 letter key for a protected-span index (a..z, ba, bb, ...): no digit can reach the number rule. */
function markerKey(i: number): string { let k = ''; do { k = String.fromCharCode(97 + (i % 26)) + k; i = Math.floor(i / 26); } while (i > 0); return k; }
function markerIndex(k: string): number { let i = 0; for (const c of k) i = i * 26 + (c.charCodeAt(0) - 97); return i; }
function protect(text: string, spans: string[]): string {
    // The marker index is written in LETTERS: a digit inside the marker was itself rewritten by the number repair and
    // the span never came back (2026-10-03 offline audit: "In Purdue's the stated threshold Ag Economy Barometer").
    const keep = (m: string) => { spans.push(m); return `\u0000${markerKey(spans.length - 1)}\u0000`; };
    return String(text || '').replace(NAME_NUMBER_RE, keep).replace(PROTECTED_RE, keep).replace(MODIFIER_NUMBER_RE, keep);
}
/** A digit that is not an id, a pointer, a standard name, a year or part of a name: the number rule's "naked number". */
export function nakedNumbers(text: string): string[] {
    const t = protect(text, []);
    return (t.replace(/\u0000[a-z]+\u0000/g, ' ').match(NUMBER_PHRASE_RE) || []).map(x => x.trim()).filter(x => /\d/.test(x));
}
/** Deterministic number fill: a naked figure becomes a reference to the value its source states. */
function replaceNakedNumbers(text: string): string {
    const protectedSpans: string[] = [];
    let t = protect(text, protectedSpans);
    // A share of a population reads as a qualitative quantifier ("95% of students" -> "nearly all of the students");
    // a hyphenated measure as a qualitative compound ("a 3-day window" -> "a multi-day window"). Only what is left
    // falls back to "the stated threshold" (2026-10-02 live #prd: 107 board theme names carried figures).
    t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(?:(their|these|those|the|our|its|his|her|all)\b)?\s*/gi, (_m, n: string, det?: string) => {
        const v = Number(n);
        const q = v >= 90 ? 'nearly all' : v >= 65 ? 'most' : v >= 45 ? 'about half' : v >= 25 ? 'a large minority' : v >= 10 ? 'a minority' : 'few';
        return `${q} of ${det ? `${det} ` : 'the '}`;
    });
    t = t.replace(/\b\d+(?:\.\d+)?-(?=[a-z])/gi, 'multi-');
    t = t.replace(NUMBER_PHRASE_RE, m => (/\d/.test(m) ? 'the stated threshold' : m)).replace(/\bthe stated threshold(\s+the stated threshold)+/g, 'the stated threshold');
    return t.replace(/\u0000([a-z]+)\u0000/g, (_, k) => protectedSpans[markerIndex(k)]).replace(/\s{2,}/g, ' ');
}
/**
 * Plain words for banned vocabulary (.claude/CLAUDE.md verbal tics and corporate cliches). The post-processor only
 * DETECTS these; the writing-scrub rule replaces them in every deliverable unit (2026-10-02 live: "comprehensive",
 * "holistic", "facilitate", "serves as" in #prd requirements; "utilize", "bolster" on coverage fill slides).
 * Units are prose the deliverable authored; verbatim quotes are never units, so a quote is never rewritten.
 */
const PLAIN_WORDS: Record<string, string> = {
    utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using', leverage: 'use', leverages: 'uses', leveraged: 'used', leveraging: 'using',
    facilitate: 'support', facilitates: 'supports', facilitated: 'supported', facilitating: 'supporting',
    bolster: 'strengthen', bolsters: 'strengthens', bolstered: 'strengthened', bolstering: 'strengthening',
    enhance: 'improve', enhances: 'improves', enhanced: 'improved', enhancing: 'improving',
    showcase: 'show', showcases: 'shows', showcased: 'showed', showcasing: 'showing',
    foster: 'build', fosters: 'builds', fostered: 'built', fostering: 'building',
    comprehensive: 'full', holistic: 'whole', ecosystem: 'network', ecosystems: 'networks', robust: 'reliable', seamless: 'smooth',
    seamlessly: 'smoothly', paramount: 'essential', pivotal: 'central', multifaceted: 'varied',
};
const PLAIN_PHRASES: Array<[RegExp, string]> = [[/\bAI-driven\b/g, 'AI-based'], [/\bserves as\b/gi, 'is'], [/\bvalue proposition\b/gi, 'offer'], [/\bcutting-edge\b/gi, 'current'], [/\bactionable insights\b/gi, 'findings']];
export function plainWords(t: string): string {
    let out = String(t || '');
    for (const [re, sub] of PLAIN_PHRASES) out = out.replace(re, sub);
    return out.replace(/\b[A-Za-z]+\b/g, w => {
        const r = PLAIN_WORDS[w.toLowerCase()];
        if (!r) return w;
        return /^[A-Z]/.test(w) ? r.charAt(0).toUpperCase() + r.slice(1) : r;
    });
}

/** The writing scrub every deliverable shares (the runtime post-processor's own functions plus plain words). */
function scrubProse(text: string): string {
    return plainWords(stripFormatTells(removeDeleteSafeFiller(stripEmDashes(String(text || ''))))).replace(/\s{2,}/g, ' ').trim();
}

// ---- universal rules --------------------------------------------------------------------------------

/** A quote outside the engagement: an upload page the engagement did not register, or another engagement's synthesis. */
function outOfScope(q: ClaimQuote, cs: DeliverableClaimSet): boolean {
    const page = pageOf(q.pointer);
    if (!page) return false;
    const docs = cs.ledgerStats?.documents || [];
    if (docs.length && UPLOAD_PAGE_RE.test(page) && !docs.some(d => d.wikiPath === page)) return true;
    return (cs.ledgerStats?.foreignPages || []).includes(page);
}


function universalRules<A>(): DeliverableRule<A>[] {
    return [
        {
            id: 'uploads-read-in-full', title: 'Every client document read in full (chunks read equal chunks registered)',
            check: (_a, cs) => {
                const docs = cs.ledgerStats?.documents || [];
                return { checked: docs.length, violations: docs.filter(d => d.chunksRead < d.chunksRegistered).map(d => `${d.title}: ${d.chunksRead} of ${d.chunksRegistered} chunks read`) };
            },
        },
        {
            id: 'engagement-scope', title: 'Client-document evidence comes from this engagement only',
            check: (_a, cs) => {
                const bad = cs.quotes.filter(q => outOfScope(q, cs));
                if (!(cs.ledgerStats?.documents || []).length && !(cs.ledgerStats?.foreignPages || []).length) return { checked: 0, violations: [] };
                return { checked: cs.quotes.length, violations: bad.map(q => `${q.id} cites ${pageOf(q.pointer)}, ${UPLOAD_PAGE_RE.test(pageOf(q.pointer)) ? 'an upload' : 'synthesis'} outside this engagement`) };
            },
            repair: (_a, cs) => {
                let n = 0;
                for (const q of cs.quotes) if (outOfScope(q, cs) && q.drop) { q.drop(); n++; }
                return { repaired: n, filled: 0 };
            },
        },
        {
            id: 'verbatim-quotes', title: 'Every quote is verbatim in the evidence it cites',
            check: (_a, cs) => {
                const v: string[] = [];
                for (const q of cs.quotes) {
                    const ev = cs.evidence.filter(e => (q.evidenceId && e.id === q.evidenceId) || (q.pointer && (e.pointer === q.pointer || e.id === q.pointer)));
                    const pool = ev.length ? ev : cs.evidence;
                    if (!pool.some(e => isVerbatim(q.text, e.text))) v.push(`${q.id} is not verbatim in its evidence`);
                }
                return { checked: cs.quotes.length, violations: v };
            },
            repair: (_a, cs, violations) => {
                const ids = new Set(violations.map(x => x.split(' ')[0]));
                let n = 0;
                for (const q of cs.quotes) if (ids.has(q.id) && q.drop) { q.drop(); n++; }
                return { repaired: n, filled: 0 };
            },
        },
        {
            id: 'source-provenance', title: 'Sources and pointers are copied from evidence, never authored',
            check: (_a, cs) => {
                const v: string[] = [];
                const src = new Map(cs.sources.map(s => [s.id, s] as const));
                const evPointers = new Set(cs.evidence.map(e => e.pointer).filter(Boolean) as string[]);
                const evIds = new Set(cs.evidence.map(e => e.id));
                for (const q of cs.quotes) {
                    const s = q.sourceId ? src.get(q.sourceId) : undefined;
                    if (!s) { v.push(`${q.id} has no source record`); continue; }
                    if (q.pointer && !evPointers.has(q.pointer) && !evIds.has(q.pointer)) v.push(`${q.id} points at ${q.pointer}, which no evidence item carries`);
                    else if (s.pointer && q.pointer && pageOf(s.pointer) !== pageOf(q.pointer) && evPointers.has(q.pointer)) v.push(`${q.id} source ${s.id} names a different page than its pointer`);
                }
                return { checked: cs.quotes.length, violations: v };
            },
            repair: (_a, cs, violations) => {
                let n = 0;
                const src = new Map(cs.sources.map(s => [s.id, s] as const));
                for (const line of violations) {
                    const qid = line.split(' ')[0];
                    const q = cs.quotes.find(x => x.id === qid);
                    if (!q) continue;
                    const ev = cs.evidence.find(e => e.pointer === q.pointer) || cs.evidence.find(e => isVerbatim(q.text, e.text) && e.pointer);
                    const s = q.sourceId ? src.get(q.sourceId) : undefined;
                    if (ev && s?.set && /different page/.test(line)) { s.set({ name: ev.sourceName || s.name, pointer: pageOf(ev.pointer) }); n++; }
                    else if (!ev && q.drop) { q.drop(); n++; }
                }
                return { repaired: n, filled: 0 };
            },
        },
        {
            id: 'number-rule', title: 'Numbers appear only inside quotes or typed targets',
            check: (_a, cs) => {
                const units = cs.units.filter(u => u.numbersChecked !== false);
                return { checked: units.length, violations: units.filter(u => nakedNumbers(u.text).length).map(u => `${u.id}: "${nakedNumbers(u.text)[0]}"`) };
            },
            repair: (_a, cs) => {
                let n = 0;
                for (const u of cs.units) if (u.numbersChecked !== false && u.set && nakedNumbers(u.text).length) { u.set(replaceNakedNumbers(u.text)); n++; }
                return { repaired: n, filled: 0 };
            },
        },
        {
            id: 'writing-scrub', title: 'No em dash, format tell or removable slop phrase',
            check: (_a, cs) => {
                const v: string[] = [];
                for (const u of cs.units) {
                    if (/\u2014/.test(u.text)) v.push(`${u.id}: em dash`);
                    else if (scrubProse(u.text) !== String(u.text || '').replace(/\s{2,}/g, ' ').trim()) v.push(`${u.id}: removable slop or format tell`);
                }
                return { checked: cs.units.length, violations: v };
            },
            repair: (_a, cs, violations) => {
                const ids = new Set(violations.map(x => x.slice(0, x.lastIndexOf(': '))));
                let n = 0;
                for (const u of cs.units) if (ids.has(u.id) && u.set) { u.set(scrubProse(u.text)); n++; }
                return { repaired: n, filled: 0 };
            },
        },
        {
            id: 'id-integrity', title: 'Ids are unique and every reference resolves',
            check: (_a, cs) => {
                const v: string[] = [];
                const seen = new Set<string>();
                for (const id of cs.declaredIds) { if (seen.has(id)) v.push(`duplicate id ${id}`); seen.add(id); }
                for (const r of cs.refs) if (!seen.has(r.to)) v.push(`${r.from} references missing ${r.to}`);
                return { checked: cs.declaredIds.length + cs.refs.length, violations: v };
            },
            repair: (_a, cs) => {
                const seen = new Set(cs.declaredIds);
                let n = 0;
                for (const r of cs.refs) if (!seen.has(r.to) && r.drop) { r.drop(); n++; }
                return { repaired: n, filled: 0 };
            },
        },
    ];
}

// ---- coverage ------------------------------------------------------------------------------------------

function coverageMissing<A>(artifact: A, contract: CoverageContract<A>, ledger: LedgerItem[]): { universe: CoverageSourceItem[]; missing: CoverageSourceItem[] } {
    const universe = contract.universe(ledger);
    const covered = new Set<string>();
    for (const u of contract.unitsOf(artifact)) for (const id of contract.covers(u, artifact)) covered.add(id);
    return { universe, missing: universe.filter(s => !covered.has(s.id)) };
}

async function runCoverage<A>(artifact: A, contract: CoverageContract<A>, ledger: LedgerItem[]): Promise<RuleResult> {
    const first = coverageMissing(artifact, contract, ledger);
    let repaired = 0, filled = 0;
    if (first.missing.length && contract.gapFill) {
        try { await contract.gapFill(artifact, first.missing); } catch { /* the deterministic fill below covers it */ }
        repaired = first.missing.length - coverageMissing(artifact, contract, ledger).missing.length;
    }
    const still = coverageMissing(artifact, contract, ledger).missing;
    if (still.length) filled = contract.deterministicFill(artifact, still);
    const after = coverageMissing(artifact, contract, ledger);
    return {
        ruleId: 'coverage', title: `Every stated item, feedback item and theme is covered by the ${contract.deliverable}`,
        checked: first.universe.length, found: first.missing.length, repaired, filled,
        violations: after.missing.map(m => `${m.id} (${m.type}) ${m.label} is not covered`), pass: after.missing.length === 0,
    };
}

// ---- the engine ---------------------------------------------------------------------------------------

export async function runDeliverableRules<A>(artifact: A, adapter: DeliverableAdapter<A>, opts: {
    coverage?: CoverageContract<A>;
    ledger?: LedgerItem[];
    /** Deliverable rules run after coverage and before the universal rules (fills first, then scrubs). */
    extraRules?: DeliverableRule<A>[];
    at?: string;
} = {}): Promise<DeliverableReceipt> {
    const results: RuleResult[] = [];
    if (opts.coverage) results.push(await runCoverage(artifact, opts.coverage, opts.ledger || []));
    for (const rule of [...(opts.extraRules || []), ...universalRules<A>()]) {
        const cs0 = adapter.claimSet(artifact);
        const before = rule.check(artifact, cs0);
        let repaired = 0, filled = 0;
        if (before.violations.length && rule.repair) {
            const r = rule.repair(artifact, cs0, before.violations);
            repaired = r.repaired; filled = r.filled;
        }
        const after = before.violations.length && rule.repair ? rule.check(artifact, adapter.claimSet(artifact)) : before;
        results.push({ ruleId: rule.id, title: rule.title, checked: before.checked, found: before.violations.length, repaired, filled, violations: after.violations, pass: after.violations.length === 0 });
    }
    // Repairs late in the order (a dropped quote, a renumber) can reopen an earlier check: the 2026-10-02 live #prd
    // kept 174 must-haves whose tier was derived BEFORE the universal rules dropped the quotes that gave them two
    // independent origins. Rules that reopened are repaired again, up to two more rounds, until stable.
    const allRules = [...(opts.extraRules || []), ...universalRules<A>()];
    for (let round = 0; round < 2; round++) {
        let reopened = false;
        for (const rule of allRules) {
            if (!rule.repair) continue;
            const cs1 = adapter.claimSet(artifact);
            const now = rule.check(artifact, cs1);
            if (!now.violations.length) continue;
            reopened = true;
            const r = rule.repair(artifact, cs1, now.violations);
            const res = results.find(x => x.ruleId === rule.id)!;
            res.found += now.violations.length; res.repaired += r.repaired; res.filled += r.filled;
        }
        if (!reopened) break;
    }
    const cs = adapter.claimSet(artifact);
    for (const rule of [...(opts.extraRules || []), ...universalRules<A>()]) {
        const r = results.find(x => x.ruleId === rule.id)!;
        const now = rule.check(artifact, cs);
        r.violations = now.violations; r.pass = now.violations.length === 0;
    }
    if (opts.coverage) {
        const c = results.find(x => x.ruleId === 'coverage')!;
        const m = coverageMissing(artifact, opts.coverage, opts.ledger || []).missing;
        c.violations = m.map(x => `${x.id} (${x.type}) ${x.label} is not covered`); c.pass = !m.length;
    }
    return { deliverable: adapter.deliverable, at: opts.at || new Date().toISOString(), pass: results.every(r => r.pass), rules: results };
}

/** One plain-words line per rule, for the chat reply and the export. */
export function formatReceiptLines(receipt: DeliverableReceipt | undefined): string[] {
    if (!receipt) return [];
    return receipt.rules.map(r => {
        const fixes = [r.repaired ? `${r.repaired} repaired` : '', r.filled ? `${r.filled} filled` : ''].filter(Boolean).join(', ');
        const state = r.pass ? 'pass' : `${r.violations.length} open`;
        return `${r.title}: ${state} (${r.checked} checked${r.found ? `, ${r.found} found` : ''}${fixes ? `, ${fixes}` : ''}).`;
    });
}
