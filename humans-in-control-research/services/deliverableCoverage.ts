/**
 * deliverableCoverage: the coverage contracts for every hashtag deliverable other than #prd, on the ONE rule engine
 * (services/deliverableRules.ts). 2026-10-02 owner rules: "these rules should also be enforced with ALL other hashtag
 * outputs, not just PRD. Consulting grade deliverables must be comprehensive"; "these rules must be deterministically
 * enforced and generalized for ANY RESEARCH PROJECT". Spec: plans/deliverable-rules-and-coverage-all-hashtags-2026-10-02.md.
 *
 *   UNIVERSE   per hashtag (`COVERAGE_SPECS`): which engagement-ledger items (STATED SF-n, FEEDBACK FB-n, THEME TH-n,
 *              derived feature AREA-n, named PERSON-n) the deliverable must account for.
 *   BINDING    after generation, every unit (a slide, an HTML section) is matched to the items it carries, by the
 *              item's verbatim quote or its name terms; the ids are written onto the unit (`_coverageIds` on a slide,
 *              `data-covers` on a section) so the export re-check reads ids, not prose. Deterministic: same artifact,
 *              same ledger, same bindings.
 *   FILL       an item no unit carries is added from the item itself: a theme card for theme deliverables, otherwise
 *              an appendix exhibit that quotes the source verbatim with its attribution. Nothing is invented: the
 *              heading is the item's name, the body its one-outcome statement, the quote the provenance-locked span.
 *   RULES      the universal rules (uploads read in full, engagement scope, verbatim quotes, provenance, numbers,
 *              writing scrub, ids) run over the filled units; the receipt goes to the chat and the export.
 *
 * "Comprehensive" allows merging items into one unit that cites them all; it never allows an item to be unaccounted
 * for. Generic by rule: nothing here names a client, an industry or a product.
 */
import {
    runDeliverableRules, type CoverageContract, type CoverageSourceItem, type DeliverableAdapter, type DeliverableReceipt,
    type LedgerReadStats, type ClaimUnit, type ClaimQuote, type ClaimSource, type EvidenceRef,
} from './deliverableRules';
import type { LedgerItem, LedgerArea, LedgerIo, ThemeInput } from './engagementLedger';
import { plainWords, nakedNumbers } from './deliverableRules';
import { displaySourceName } from './citationPointerRegistry';

// ---- which deliverable --------------------------------------------------------------------------------

export type CoverageKind =
    | 'personas' | 'journey' | 'blueprint' | 'themes' | 'gap' | 'competitive' | 'recs' | 'deck' | 'report' | 'brief'
    | 'roadmap' | 'arch' | 'org' | 'questionnaire' | 'mindmap' | 'proto' | 'research-plan';

type UniversePart = 'stated' | 'feedback' | 'theme' | 'area' | 'stated-must' | 'stated-system' | 'feedback-decision' | 'feedback-question' | 'person';

export interface CoverageSpec {
    kind: CoverageKind;
    /** What the deliverable is called in the receipt ("the persona set"). */
    label: string;
    universe: UniversePart[];
    /** Theme deliverables fill with theme cards; every other deliverable with an appendix exhibit. */
    fill: 'theme-cards' | 'appendix';
    /** 2026-10-05: at most this many board THEMES enter the universe, the ones most relevant to the request. A board
     *  can hold hundreds of themes; a narrative deliverable that had to restate every one shipped 118 sections. Client
     *  STATED items and FEEDBACK are never capped (every upload item is still accounted for). Unset = all themes. */
    themeCap?: number;
    /** 2026-10-05: at most this many client STATED items for a narrative SLIDE deliverable (a #gap deck over a 920-item
     *  ledger shipped 24 appendix slides). Required items and decisions rank first, then request relevance. The full set
     *  is carried by the #prd requirements workbook. Unset = every stated item (the #prd, #proto and HTML contracts). */
    statedCap?: number;
}

/** The table in plans/deliverable-rules-and-coverage-all-hashtags-2026-10-02.md, as data. */
export const COVERAGE_SPECS: Record<CoverageKind, CoverageSpec> = {
    // 2026-10-05: every theme-based kind is capped to the request-relevant board themes (a 516-theme board produced
    // 113 appendix slides on #themes and 37 on #gap). Stated items and feedback are never capped.
    personas: { kind: 'personas', label: 'persona set', universe: ['theme', 'feedback'], fill: 'appendix', themeCap: 12 },
    journey: { kind: 'journey', label: 'journey map', universe: ['theme', 'feedback'], fill: 'appendix', themeCap: 12 },
    blueprint: { kind: 'blueprint', label: 'service blueprint', universe: ['stated', 'theme'], fill: 'appendix', themeCap: 16, statedCap: 24 },
    themes: { kind: 'themes', label: 'theme set', universe: ['theme'], fill: 'theme-cards', themeCap: 32 },
    gap: { kind: 'gap', label: 'gap analysis', universe: ['stated', 'theme'], fill: 'appendix', themeCap: 16, statedCap: 24 },
    competitive: { kind: 'competitive', label: 'competitive analysis', universe: ['theme'], fill: 'appendix', themeCap: 16 },
    recs: { kind: 'recs', label: 'recommendation set', universe: ['theme', 'feedback'], fill: 'appendix', themeCap: 16 },
    deck: { kind: 'deck', label: 'deck', universe: ['theme', 'area'], fill: 'appendix', themeCap: 24 },
    report: { kind: 'report', label: 'document', universe: ['theme', 'area'], fill: 'appendix', themeCap: 40 },
    brief: { kind: 'brief', label: 'brief', universe: ['theme', 'area'], fill: 'appendix', themeCap: 24 },
    roadmap: { kind: 'roadmap', label: 'roadmap', universe: ['stated-must', 'feedback-decision'], fill: 'appendix', statedCap: 24 },
    arch: { kind: 'arch', label: 'architecture', universe: ['stated-system'], fill: 'appendix', statedCap: 20 },
    org: { kind: 'org', label: 'org chart', universe: ['person'], fill: 'appendix' },
    questionnaire: { kind: 'questionnaire', label: 'questionnaire', universe: ['feedback-question', 'theme'], fill: 'appendix', themeCap: 16 },
    mindmap: { kind: 'mindmap', label: 'mind map', universe: ['theme'], fill: 'appendix', themeCap: 30 },
    proto: { kind: 'proto', label: 'prototype brief', universe: ['stated', 'feedback'], fill: 'appendix' },
    'research-plan': { kind: 'research-plan', label: 'research plan', universe: ['theme'], fill: 'appendix', themeCap: 16 },
};

/** Hashtag -> contract. Order matters: the more specific deliverable wins over a #slides modifier. */
const HASHTAG_KIND: Array<[RegExp, CoverageKind]> = [
    [/#personas?\b/i, 'personas'],
    [/#(?:journey(?:-map)?|cjm)\b/i, 'journey'],
    [/#(?:service-)?blueprint\b/i, 'blueprint'],
    [/#(?:meta-themes|mindmap|mind-map)\b/i, 'mindmap'],
    [/#(?:themes?|theme-cluster)\b/i, 'themes'],
    [/#gap(?:-matrix|s)?\b/i, 'gap'],
    [/#compet\w*\b/i, 'competitive'],
    [/#rec(?:s|ommendations?)\b/i, 'recs'],
    [/#roadmap\b/i, 'roadmap'],
    [/#(?:arch|tech-arch|architecture|audit|tech-audit)\b/i, 'arch'],
    [/#org(?:-chart)?\b/i, 'org'],
    [/#questionnaire\b/i, 'questionnaire'],
    [/#(?:proto|playground)\b/i, 'proto'],
    [/#(?:research-plan|deep-research)\b/i, 'research-plan'],
    [/#brief\b/i, 'brief'],
    [/#(?:report|whitepaper|explainer)\b/i, 'report'],
    [/#(?:strategy|slides?|presentation)\b/i, 'deck'],
];

/** The contract for a request, or null for hashtags with no contract (#prd has its own; #case-study names its subjects). */
export function coverageKindForQuery(query: string): CoverageKind | null {
    const q = String(query || '');
    if (/#prd\b/i.test(q) || /#case-study\b/i.test(q)) return null;
    for (const [re, kind] of HASHTAG_KIND) if (re.test(q)) return kind;
    return null;
}

const TEMPLATE_KIND: Array<[RegExp, CoverageKind]> = [
    [/^persona/, 'personas'], [/^journey/, 'journey'], [/^service-blueprint$/, 'blueprint'], [/^theme-/, 'themes'],
    [/^gap-matrix$/, 'gap'], [/^competitive/, 'competitive'], [/^recommendation$/, 'recs'], [/^timeline$/, 'roadmap'],
    [/^(?:architecture-map|systems-inventory)$/, 'arch'], [/^org-chart$/, 'org'], [/^executive-brief$/, 'report'], [/^slides:/, 'deck'],
];
/** Fallback when the query names no hashtag: the most common template of the batch decides. */
export function coverageKindForTemplates(templates: string[]): CoverageKind | null {
    const counts = new Map<CoverageKind, number>();
    for (const t of templates) {
        if (/^prd-/.test(t)) return null;
        const hit = TEMPLATE_KIND.find(([re]) => re.test(t));
        if (hit) counts.set(hit[1], (counts.get(hit[1]) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// ---- universe ---------------------------------------------------------------------------------------

/** Generic cues for a system, a data source or an integration (no product names). */
const SYSTEM_RE = /\b(?:system|platform|integrat\w*|api|interface|database|data (?:source|feed|warehouse|lake|pipeline|model)|dashboard|portal|app(?:lication)?|crm|erp|lms|sis|sso|authentication|hosting|cloud|infrastructure|sync\w*|import|export|connector|repository|tool(?:ing)?)\b/i;

export interface CoveragePerson { id: string; name: string; sourceName: string; documentTitle: string; ledgerIds: string[] }

/** Distinct people the ledger names (speakers and owners), in first-seen order, with the items they speak to. */
function ledgerPeople(ledger: LedgerItem[]): CoveragePerson[] {
    const out: CoveragePerson[] = [];
    const byKey = new Map<string, CoveragePerson>();
    for (const li of ledger) {
        for (const src of [{ speaker: li.speaker, sourceName: li.sourceName, documentTitle: li.documentTitle }, ...(li.sources || [])]) {
            const name = String(src.speaker || '').replace(/\s+/g, ' ').trim();
            if (name.length < 3 || name.length > 80) continue;
            const key = name.toLowerCase();
            let p = byKey.get(key);
            if (!p) { p = { id: `PERSON-${out.length + 1}`, name, sourceName: src.sourceName || li.sourceName, documentTitle: src.documentTitle || li.documentTitle, ledgerIds: [] }; byKey.set(key, p); out.push(p); }
            if (!p.ledgerIds.includes(li.id)) p.ledgerIds.push(li.id);
        }
    }
    return out;
}

/** A board theme with nothing to account for: a generic cluster label, no statement of its own and no quote. */
/**
 * A meeting ACTION ITEM ("Send Peter the screenshot", "Schedule the follow-up", "... Completed") is housekeeping, not
 * product scope or feedback: no deliverable has to carry it (2026-10-05 live #journey appendix listed one).
 */
/**
 * #prd scope partition (2026-10-06). Returns the ledger items a PRD for THIS request accounts for deterministically
 * (id -> reason) instead of writing a requirement through a model batch:
 *   - meeting action items (engagement logistics, never product requirements);
 *   - when the request names a narrower scope than the engagement ("#prd for the first-year readiness module"), items
 *     sharing none of the request's DISTINCTIVE terms (terms common to the whole engagement do not scope anything).
 * Never narrows below `minInScope` items: a broad or vague request keeps the full ledger.
 */
/** Project / delivery verbs: a subject that takes one in the ledger is an engagement party. */
const PARTY_VERBS = /^(?:holds?|conducts?|delivers?|demonstrates?|reports?|schedules?|tracks?|manages?|coordinates?|reviews?|provides?|analy[sz]es|closes?|runs?|attends?|facilitates?|staffs?|submits?|sends?|shares?|communicates?|works?|meets?|maintains?|documents?|records?|hands?|prepares?|participates?|confirms?|approves?|signs?|grants?|presents?|consolidates?|issues?|leads?|owns?|supplies?|transfers?|drafts?|performs?|follows?|obtains?|accepts?|validates?|nominates?|designates?|assigns?|names?|defines?|escalates?|identifies?|selects?|decides?|determines?|agrees?|commits?)$/;
/** A subject phrase that names the product, not a party ("<Name> Dashboard", "<Name> Companion"). */
const PRODUCT_NOUN = /\b(?:Hub|Dashboard|Portal|Module|Coach|Framework|Platform|System|App|Application|Assistant|Companion|Experience|Tool|Summary|Profile|Guide|Advisor|Workspace|Pathway|Checklist|Bot|Agent)$/;

export function prdScopePartition(ledger: LedgerItem[], requestText: string, opts: { minInScope?: number } = {}): { outOfScope: Map<string, string>; focus: string[]; inScope: number; parties: string[] } {
    const out = new Map<string, string>();
    const parties = new Set<string>();
    for (const li of ledger) {
        if (isAdminTask(li)) out.set(li.id, 'engagement logistics (a meeting action item, not a product requirement)');
        else if (isEngagementObligation(li)) {
            out.set(li.id, 'an engagement obligation (a delivery or project task, not a product capability)');
            const subj = /^((?:[A-Z][\w&.'-]*)(?:\s+[A-Z][\w&.'-]*){0,3})\s/.exec(String(li.statement || li.item || '').trim())?.[1];
            if (subj) parties.add(subj);
        }
    }
    // 2026-10-06 live #prd round 12: the client side of the engagement ("<Client> schedules the working sessions",
    // "<Client office> reviews and approves") is never named in a contract title, so it never became a party. Any
    // subject that takes a project verb twice in the ledger, or once in a contract or meeting record, is a party too;
    // product nouns ("<Name> Dashboard", "<Name> Companion") never are.
    {
        const seen = new Map<string, number>();
        for (const li of ledger) {
            const m = /^(?:The\s+)?((?:[A-Z][\w&.'-]*)(?:\s+[A-Z][\w&.'-]*){0,3})\s+(?:will\s+|must\s+|shall\s+)?([a-z]+)\b/.exec(String(li.statement || li.item || '').trim());
            if (!m || !PARTY_VERBS.test(m[2]) || PRODUCT_NOUN.test(m[1]) || /^(?:The|A|An|Each|Every|All|Given|When|If|Students?|Advisors?|Users?|Employers?|Staff)$/.test(m[1].split(/\s+/)[0])) continue;
            const kind = String((li as any).documentKind || '');
            seen.set(m[1], (seen.get(m[1]) || 0) + (kind === 'contract' || kind === 'meeting-notes' ? 2 : 1));
        }
        for (const [s, n] of seen) if (n >= 2) parties.add(s);
    }
    const SKIP = new Set(['prd', 'prds', 'requirements', 'requirement', 'document', 'product', 'generate', 'write', 'build', 'create', 'module', 'modules', 'release', 'feature', 'features', 'platform', 'system']);
    const itemText = (li: LedgerItem) => `${li.item} ${li.statement || ''}`;
    const terms = [...focusTerms(requestText)].filter(w => !SKIP.has(w));
    const df = (w: string) => ledger.filter(li => focusTerms(itemText(li)).has(w)).length;
    const n = Math.max(1, ledger.length);
    const focus = terms.filter(w => { const d = df(w); return d > 0 && d / n <= 0.35; });
    const remaining = ledger.filter(li => !out.has(li.id));
    if (!focus.length) return { outOfScope: out, focus, inScope: remaining.length, parties: [...parties] };
    const hit = (li: LedgerItem) => { const t = focusTerms(itemText(li)); return focus.some(w => t.has(w)); };
    const inScope = remaining.filter(hit);
    if (inScope.length < (opts.minInScope ?? 30)) return { outOfScope: out, focus: [], inScope: remaining.length, parties: [...parties] };
    const reason = `outside the requested scope (${focus.join(', ')})`;
    for (const li of remaining) if (!hit(li)) out.set(li.id, reason);
    return { outOfScope: out, focus, inScope: inScope.length, parties: [...parties] };
}

/**
 * A GENERATED requirement that describes project work rather than product behaviour (2026-10-06 live #prd: 81 of 371
 * Musts, e.g. "<Vendor> holds solution architecture design review sessions", "<Client> schedules the working sessions",
 * "The project team obtains Change Advisory Board approval"). The subject is one of the engagement's own obligation
 * parties (derived from the ledger, never a fixed name list) or a generic project team, and the verb is project work.
 */
export function isProjectWorkRequirement(text: string, parties: string[]): boolean {
    const t = String(text || '').trim();
    // 2026-10-06 live #prd round 12: a verb whitelist kept missing project verbs ("escalates", "defines", "classifies",
    // "<Party> and <Team> jointly define"), leaving 35 Musts on the Engagement Obligations sheet. Inverted: when the
    // subject is an engagement party (optionally "The <Party> <role>", optionally "and <other party> jointly") or a
    // generic project team, the sentence is project work UNLESS its verb builds product.
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const names = parties.filter(Boolean).sort((a, b) => b.length - a.length).map(esc);
    const subject = [
        ...(names.length ? [`(?:The\\s+)?(?:${names.join('|')})(?:\\s+[A-Z][\\w-]*){0,3}`] : []),
        'The (?:project|development|delivery|program|implementation|engagement) team',
    ].join('|');
    const m = new RegExp(`^((?:${subject}))(?:\\s+and\\s+(?:the\\s+)?[A-Z][\\w&'-]*(?:\\s+[A-Z][\\w&'-]*){0,3})?\\s+(?:jointly\\s+|together\\s+)?(?:will\\s+|must\\s+|shall\\s+)?([a-z]+)\\b`).exec(t);
    if (!m || PRODUCT_NOUN.test(m[1])) return false;
    return !/^(?:builds?|embeds?|implements?|develops?|ships?|creates?|integrates?|configures?|codes?|engineers?|extends?|adds?|exposes?|renders?)$/.test(m[2]);
}

/**
 * An obligation on the ENGAGEMENT, not a product capability (2026-10-06 live #prd: ~100 of 392 Must rows were
 * "Kellianne Murphy reviews the draft...", "NXT Humans conducts content handoff sessions..."). Generic, mirroring
 * proxy/prd_xlsx.py is_engagement_requirement on the ledger side: a CONTRACT item whose subject is a party the
 * document's own title names, or a MEETING-NOTES item whose subject is a named person or party doing project work.
 */
function isEngagementObligation(li: LedgerItem): boolean {
    if (li.type === 'theme') return false;
    const text = String(li.statement || li.item || '').trim();
    const m = /^((?:[A-Z][\w&.'-]*)(?:\s+[A-Z][\w&.'-]*){0,3})\s+(?:will\s+|must\s+|shall\s+)?([a-z]+)\b/.exec(text);
    if (!m) return false;
    const subj = m[1];
    // Only PROCESS / DELIVERY verbs make an obligation. "NXT Humans builds a next-steps view in the dashboard" or
    // "... embeds the companion in the Student Hub" names a product capability (kept in scope); "holds working
    // sessions", "delivers the UX Design Package", "tracks each dependency" names project work.
    const OBLIGATION_VERBS = /^(?:holds?|conducts?|delivers?|demonstrates?|reports?|schedules?|tracks?|manages?|coordinates?|reviews?|provides?|analy[sz]es|closes?|runs?|attends?|facilitates?|staffs?|submits?|sends?|shares?|communicates?|works?|meets?|maintains?|documents?|records?|hands?|prepares?|participates?|confirms?|approves?|signs?|grants?|invoices?|bills?|presents?|consolidates?|issues?|walks?|walkthroughs?|leads?|owns?|supplies?|transfers?|plays?|drafts?|performs?|carries|carry|follows?|kicks?)$/;
    if (!OBLIGATION_VERBS.test(m[2])) return false;
    if (/^(?:The|A|An|Each|Every|All|Given|When|Students?|Advisors?|Users?|Employers?|Staff|Hub|Dashboard|System|Platform|Companion)\b/.test(subj)) return false;
    const kind = String((li as any).documentKind || '');
    const title = String(li.documentTitle || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    const s = subj.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (kind === 'contract') return !!s && ` ${title} `.includes(` ${s} `);
    if (kind === 'meeting-notes') return /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(subj) || ` ${title} `.includes(` ${s} `);
    return false;
}

function isAdminTask(li: LedgerItem): boolean {
    if (li.type !== 'feedback') return false;
    const item = String(li.item || '').trim();
    const quote = String((li as any).quote || '').trim();
    return /^(?:send|share|forward|email|circulate|schedule|book|set up a (?:call|meeting)|follow up|reach out|loop in|introduce|confirm (?:the )?(?:date|time|meeting))\b/i.test(item)
        || /\b(?:completed|done)\.?$/i.test(quote);
}

function isEmptyCluster(li: LedgerItem): boolean {
    const generic = /^(?:cluster|topic|theme|group)\s*#?\d+\.?$/i;
    return li.type === 'theme' && generic.test(String(li.item || '').trim())
        && (!li.statement || generic.test(String(li.statement).replace(/[.!?]$/, '').trim())) && !String(li.quote || '').trim();
}

/** Content words of a text, for request-relevance ranking (lowercase, 4+ letters, no stop words). */
function focusTerms(t: string): Set<string> {
    const STOP = new Set(['that', 'this', 'with', 'from', 'into', 'their', 'there', 'these', 'those', 'have', 'will', 'must', 'should', 'would', 'about', 'which', 'what', 'when', 'where', 'while', 'than', 'then', 'they', 'them', 'more', 'most', 'need', 'needs', 'make', 'over', 'only', 'also', 'each', 'every']);
    return new Set(String(t || '').toLowerCase().replace(/#[\w-]+/g, ' ').split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w)));
}

/** The board themes a capped deliverable must carry: the `cap` themes that share the most terms with the request. */
function capThemes(themes: LedgerItem[], cap: number, focus: string, boost: (li: LedgerItem) => number = () => 0): Set<string> {
    if (themes.length <= cap) return new Set(themes.map(t => t.id));
    const f = focusTerms(focus);
    const scored = themes.map((t, i) => {
        const terms = focusTerms(`${t.item} ${t.statement || ''}`);
        let hit = 0;
        for (const w of terms) if (f.has(w)) hit += 1;
        return { id: t.id, score: boost(t) + hit / Math.sqrt(Math.max(1, terms.size)), i };
    }).sort((a, b) => b.score - a.score || a.i - b.i);
    return new Set(scored.slice(0, cap).map(s => s.id));
}

export function coverageUniverse(spec: CoverageSpec, ledger: LedgerItem[], areas: LedgerArea[], focus = ''): CoverageSourceItem[] {
    const out: CoverageSourceItem[] = [];
    const want = new Set(spec.universe);
    const themeKeep = spec.themeCap && want.has('theme')
        ? capThemes(ledger.filter(li => li.type === 'theme' && !isEmptyCluster(li)), spec.themeCap, focus)
        : null;
    const statedKeep = spec.statedCap
        ? capThemes(ledger.filter(li => li.type === 'stated' && !isEmptyCluster(li)), spec.statedCap, focus, li => (li.label === 'required' || li.label === 'decision' ? 10 : 0)
            + (want.has('stated-system') && SYSTEM_RE.test(`${li.item} ${li.statement}`) ? 20 : 0))
        : null;
    for (const li of ledger) {
        if (themeKeep && li.type === 'theme' && !themeKeep.has(li.id)) continue;
        if (statedKeep && li.type === 'stated' && !statedKeep.has(li.id)) continue;
        if (isAdminTask(li)) continue;
        if (isEmptyCluster(li)) continue;
        const take = (li.type === 'stated' && (want.has('stated')
            || (want.has('stated-must') && (li.label === 'required' || li.label === 'decision' || li.label === 'recommended'))
            || (want.has('stated-system') && SYSTEM_RE.test(`${li.item} ${li.statement}`))))
            || (li.type === 'feedback' && (want.has('feedback')
                || (want.has('feedback-decision') && (li.label === 'decision' || li.disposition === 'add' || li.disposition === 'reprioritize'))
                || (want.has('feedback-question') && li.disposition === 'open-question')))
            || (li.type === 'theme' && want.has('theme'));
        if (take) out.push({ id: li.id, type: li.type, label: li.item, ledgerId: li.id, document: li.documentTitle });
    }
    if (want.has('area')) for (const a of areas) if (a.items > 0) out.push({ id: a.id, type: 'area', label: a.label });
    if (want.has('person')) for (const p of ledgerPeople(ledger)) out.push({ id: p.id, type: 'person', label: p.name, document: p.documentTitle });
    return out;
}

// ---- deterministic matching -------------------------------------------------------------------------

const MATCH_STOP = new Set(('the a an and or of to in on for with from by at as is are be it its this that these those their they them ' +
    'will can could should would must may each every into over under than then when which who what where while also more most all any ' +
    'some one new use used using via per not our your has have had was were been being does make makes need needs based across within ' +
    'without through about item items theme themes research client document documents feature features').split(' '));

function stemW(w: string): string {
    if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
}
export function matchTerms(s: string): Set<string> {
    const out = new Set<string>();
    for (const w of String(s || '').toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []) {
        if (MATCH_STOP.has(w)) continue;
        const st = stemW(w);
        if (!MATCH_STOP.has(st)) out.add(st);
    }
    return out;
}
const squash = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export interface MatchTarget { id: string; nameTerms: Set<string>; quoteKeys: string[]; personName?: string }

function matchTargets(universe: CoverageSourceItem[], ledger: LedgerItem[]): MatchTarget[] {
    const byId = new Map(ledger.map(l => [l.id, l] as const));
    const people = new Map(ledgerPeople(ledger).map(p => [p.id, p] as const));
    const out: MatchTarget[] = [];
    for (const u of universe) {
        if (u.type === 'area') continue;   // an area is covered through its member items
        if (u.type === 'person') { const p = people.get(u.id); if (p) out.push({ id: u.id, nameTerms: new Set(), quoteKeys: [], personName: p.name.toLowerCase() }); continue; }
        const li = byId.get(u.ledgerId || u.id);
        if (!li) continue;
        const names = [li.item, ...(li.themeMembers || []).map(m => m.name)];
        const quotes = [li.quote, ...(li.sources || []).map(s => s.quote)].map(q => squash(q)).filter(q => q.length >= 24).map(q => q.slice(0, 60));
        // One target per member name: a theme group is carried when ANY of its member themes is.
        for (const n of Array.from(new Set(names.filter(Boolean)))) out.push({ id: u.id, nameTerms: matchTerms(n), quoteKeys: quotes });
        if (!names.filter(Boolean).length) out.push({ id: u.id, nameTerms: matchTerms(li.statement), quoteKeys: quotes });
    }
    return out;
}

/** Ids a unit's text carries: the item's verbatim quote, or most of its name terms (all of them for a short name). */
function matchUnit(text: string, targets: MatchTarget[]): string[] {
    const terms = matchTerms(text);
    const sq = squash(text);
    const low = String(text || '').toLowerCase();
    const hit = new Set<string>();
    for (const t of targets) {
        if (hit.has(t.id)) continue;
        if (t.personName) { if (low.includes(t.personName)) hit.add(t.id); continue; }
        if (t.quoteKeys.some(k => sq.includes(k))) { hit.add(t.id); continue; }
        const n = t.nameTerms.size;
        if (!n) continue;
        let shared = 0;
        for (const w of t.nameTerms) if (terms.has(w)) shared++;
        const need = n <= 2 ? n : Math.max(2, Math.ceil(n * 0.6));
        if (shared >= need) hit.add(t.id);
    }
    return [...hit];
}

// ---- the artifact a contract runs on ---------------------------------------------------------------

/** One fill entry, built from a ledger item, never authored. */
export interface CoverageFillEntry {
    ids: string[];
    areaId?: string;
    areaLabel: string;
    heading: string;
    body: string;
    quote?: string;
    source?: string;
    pointer?: string;
}

/** What every coverage-checked deliverable exposes to the engine (a deck of slides, an HTML document). */
export interface CoverageDoc {
    kind: CoverageKind;
    units(): Array<{ id: string; text: string }>;
    bind(unitId: string, ids: string[]): void;
    bound(unitId: string): string[];
    /** Add fill units for the entries; returns the number of units added. */
    addFill(entries: CoverageFillEntry[]): number;
    /** Prose units and quotes of the FILL (the engine's universal rules scrub and verify deterministic text). */
    fillClaims(): { units: ClaimUnit[]; quotes: ClaimQuote[]; sources: ClaimSource[]; evidence: EvidenceRef[] };
}

function pickRepresentative(areaId: string, ledger: LedgerItem[]): LedgerItem | undefined {
    const rank = (l: LedgerItem) => (l.type === 'stated' ? 0 : l.type === 'feedback' ? 1 : 2) * 10 + (l.label === 'required' ? 0 : l.label === 'decision' ? 1 : 2);
    return ledger.filter(l => l.featureArea === areaId).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id, undefined, { numeric: true }))[0];
}

/** Pointer markers ("[articles/x.md#c3]") never ship in fill prose; the pointer rides in its own field. */
const stripPointerText = (t: string) => String(t || '').replace(/\[\s*[A-Za-z][\w.\\-]*\/[^\]\s]*\]?/g, '').replace(/\[\s*[\w./\\-]+\.md(?:#c\d+)?(?:\s*[,;]\s*[\w./\\-]+\.md(?:#c\d+)?)*\s*\]/gi, '').replace(/[\w./\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();

/** A topic-model cluster can reach the board unnamed ("Cluster 1023"); its statement or its first quote names it instead. */
const GENERIC_NAME_RE = /^(?:cluster|topic|theme|group)\s*#?\d+\.?$/i;
function readableHeading(li: LedgerItem, quote?: string): string {
    if (!GENERIC_NAME_RE.test(String(li.item || '').trim())) return li.item;
    const st = String(li.statement || '').trim();
    if (st && !GENERIC_NAME_RE.test(st)) return st.length > 110 ? `${st.slice(0, 107).replace(/\s+\S*$/, '')}...` : st;
    const q = String(quote || '').trim();
    return q ? `Research cluster: "${q.length > 90 ? `${q.slice(0, 87).replace(/\s+\S*$/, '')}...` : q}"` : 'Unlabelled research cluster';
}

/**
 * Fill prose prefers sentences without bare figures (2026-10-03 live: a foreign theme insight "A 61,000 email benchmark
 * dataset of 3.5 million widgets" became "A the stated threshold email benchmark dataset of the stated threshold
 * widgets"). The figures stay in the verbatim quote beside it, which is where a number may appear.
 */
/** True when every bare figure in the text also appears in the quote it rides with (a sourced figure). */
export function figuresSourced(text: string, quote?: string): boolean {
    const nums = nakedNumbers(text);
    if (!nums.length) return true;
    const q = String(quote || '').replace(/,/g, '');
    return nums.every(n => { const d = (n.match(/\d[\d.]*/) || [''])[0].replace(/,/g, ''); return !!d && q.includes(d); });
}
const sentencesOf = (t: string) => (String(t || '').match(/[^.!?]+[.!?]?/g) || []).map(x => x.trim()).filter(Boolean);
/** A heading: the item's own name when its figures are sourced or absent, else a sourced or figure-free sentence. */
function figureFree(text: string, fallback?: string, quote?: string): string {
    if (figuresSourced(text, quote)) return text;
    const alt = sentencesOf(String(fallback || '')).find(x => x.length > 12 && figuresSourced(x, quote) && !GENERIC_NAME_RE.test(x.replace(/[.!?]$/, '')));
    if (alt) return alt.replace(/[.!?]$/, '');
    const q = String(quote || '').trim();
    return q ? `Research theme: "${q.length > 90 ? `${q.slice(0, 87).replace(/\s+\S*$/, '')}...` : q}"` : text;
}
/** A body: only sentences whose figures are sourced (or that carry none); '' when nothing qualifies. */
function fillBody(li: LedgerItem, quote?: string): string {
    const raw = li.statement && li.statement !== li.item ? li.statement : (li.type === 'theme' ? `${li.item}.` : li.item);
    if (GENERIC_NAME_RE.test(String(raw || '').replace(/[.!?]$/, '').trim())) return '';
    return sentencesOf(raw).filter(x => figuresSourced(x, quote) && !GENERIC_NAME_RE.test(x.replace(/[.!?]$/, ''))).join(' ');
}

/**
 * Soften UNSOURCED figures in fill prose instead of substituting a placeholder (2026-10-03 live run 7: "lags a the
 * stated threshold-adopted student baseline"). A theme name the board wrote with a figure keeps its meaning without
 * the figure: a share before a verb becomes a quantifier ("80% refuse" -> "most refuse"), "95%-adopted" becomes
 * "widely adopted", "within 180 days" becomes "within a set period", and a figure after a preposition or opening the
 * sentence is dropped ("gates on 70% job placement" -> "gates on job placement"). Figures that also appear in the
 * entry's own verbatim quote are never touched (they are sourced).
 */
/**
 * 2026-10-20 (root-cause audit A7, plan item 9): the softener used to change facts. "1-year members" became
 * "multi-year members", "the 2024 cohort" lost its year, "fell by 9%" became "fell by few", and "64%" became "about
 * half". Terms that name a period rather than assert a quantity are now FIXED: a year, a year range, a fiscal or
 * quarter label and an "N-year" compound are protected before any rule runs and restored after. A measure of change
 * ("rose by 9%") drops the measure instead of taking a quantifier, and a share maps to a quantifier that is true of
 * the share (a majority is never "about half"). Figures inside a verbatim quote are never softened at all: the quote
 * is passed through `figuresSourced` by every caller (see `soft`).
 */
const FIXED_TERM_RE = /\b(?:FY\s?(?:19|20)?\d{2}(?:\s?[-\/]\s?(?:19|20)?\d{2})?|Q[1-4]\s?(?:19|20)\d{2}|(?:19|20)\d{2}(?:\s?[-\/]\s?(?:(?:19|20)?\d{2}))?|\d[\d,.]*-year(?:-old)?s?)\b|\[?[\w./\\-]+\.md(?:#c\d+)?\]?/gi;
const CHANGE_VERB_RE = /\b(rose|rises?|risen|fell|falls?|fallen|grew|grows?|grown|dropped|drops?|increased|increases?|decreased|decreases?|declined|declines?|improved|improves?|reduced|reduces?|cut|cuts|climbed|climbs?|slipped|slips?|raised|raises?|lowered|lowers?|lifted|lifts?|jumped|jumps?|shrank|shrinks?|expanded|expands?|up|down)\s+by\s+(?:only\s+|nearly\s+|about\s+|roughly\s+|over\s+|more than\s+|less than\s+|some\s+)?\$?\d[\d,.]*\s*(?:%|percent\b|x\b|points?\b|pp\b|k\b|m\b|bn\b)?/gi;
function protectFixedTerms(text: string): { t: string; spans: string[] } {
    const spans: string[] = [];
    const key = (i: number) => { let k = ''; do { k = String.fromCharCode(97 + (i % 26)) + k; i = Math.floor(i / 26); } while (i > 0); return k; };
    const t = String(text || '').replace(FIXED_TERM_RE, m => { spans.push(m); return `\u0000${key(spans.length - 1)}\u0000`; });
    return { t, spans };
}
function restoreFixedTerms(text: string, spans: string[]): string {
    const idx = (k: string) => { let i = 0; for (const c of k) i = i * 26 + (c.charCodeAt(0) - 97); return i; };
    return text.replace(/\u0000([a-z]+)\u0000/g, (_m, k: string) => spans[idx(k)] ?? '');
}
/** A quantifier that is true of the share: a majority is "most" or "a majority", never "about half". */
function shareWord(n: string): string {
    const v = Number(String(n).replace(/,/g, ''));
    return v >= 65 ? 'most' : v > 55 ? 'a majority' : v >= 45 ? 'about half' : v >= 15 ? 'some' : 'few';
}
export function softenFigures(text: string): string {
    const qty = shareWord;
    const { t: protectedText, spans } = protectFixedTerms(text);
    let t = protectedText;
    t = t.replace(/\b(\d[\d,.]*)\s*%-([a-z]+)/gi, 'widely $2');
    // A measure of change ("retention fell by 9%") keeps the direction and drops the measure; a quantifier after "by"
    // ("fell by few") is not English.
    t = t.replace(CHANGE_VERB_RE, '$1');
    // Hyphenated numeric compounds (2026-10-05 live #themes: "A 10-point ... gap" shipped as "A -point ... gap"):
    // a measured gap or multiple drops its size, a duration shorter than a year becomes "multi-", anything else "multi-".
    // ("N-year" is a fixed term, protected above.)
    t = t.replace(/\b\d[\d,.]*-(?:point|percentage-point|fold|percent)\s+/gi, '');
    t = t.replace(/\b\d[\d,.]*-(month|week|day|hour|semester|term)\b/gi, 'multi-$1');
    t = t.replace(/\b\d[\d,.]*-(?=[a-z])/gi, 'multi-');
    // A range of shares ("a goal of 30 to 40 percent") -> "a set target range"; a share closing its clause ("used by
    // 20%.") -> a quantifier ("used by some."). Round-8 live: both shipped as "goal of to percent." and "used."
    t = t.replace(/\b\d[\d,.]*\s*(?:%|percent)?\s*(?:to|-|–)\s*\d[\d,.]*\s*(?:%|percent)\b/gi, 'a set target range');
    t = t.replace(/\b(by|of|for|among|to|at|from)\s+(?:only\s+)?\$?(\d[\d,.]*)\s*(?:%|percent\b)(?=\s*[.,;:)]|\s*$)/gi,
        (_m, pre: string, n: string) => `${pre} ${qty(n)}`);
    t = t.replace(/\b(?:within|in|after|over|for)\s+(?:the\s+)?(?:first\s+|next\s+|last\s+)?\d[\d,.]*\s*(?:days?|weeks?|months?|years?|hours?|minutes?)\b/gi, m => `${m.split(/\s+/)[0]} a set period`);
    t = t.replace(/\b(on|at|of|with|by|for|to|from|than|a|an|the|global|annual|national)\s+\$?\d[\d,.]*\s*(?:%|percent\b|x\b|k\b|m\b|bn\b)?\s*(?=[A-Za-z])/gi, '$1 ');
    t = t.replace(/(^|[:;]\s*)(?:only\s+)?\$?(\d[\d,.]*)\s*(?:%|percent\b)\s+(?=[a-z])/gi, (_m, pre: string, n: string) => `${pre}${qty(n)} `);
    t = t.replace(/\b(\d[\d,.]*)\s*(?:%|percent\b)\s+(?=[a-z]+\b)/gi, (_m, n: string) => `${qty(n)} `);
    t = t.replace(/(^|[.:;]\s*)\$?\d[\d,.]*\s*(?:%|x|k|m|bn)?\s+(?=[A-Za-z])/g, '$1');
    t = restoreFixedTerms(t, spans);
    t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
/** A heading short enough to read in one line of an exhibit card: whole words, the first clause when it is long. */
function cardHeading(t: string): string {
    const s0 = String(t || '').trim();
    if (s0.length <= 90) return s0;
    const clause = s0.split(/[:;,]\s+/)[0];
    if (clause.length >= 30 && clause.length <= 90) return clause;
    return `${s0.slice(0, 87).replace(/\s+\S*$/, '')}...`;
}

/** Unsourced figures are softened; sourced ones (in the entry's own quote) are kept. */
function soft(t: string, quote?: string): string {
    if (figuresSourced(t, quote)) return t;
    const s1 = softenFigures(t);
    if (!nakedNumbers(s1).length) return s1;
    // Whatever figure survives the softening is removed outright: a placeholder is never written into fill prose.
    // Years, year ranges and "N-year" terms are fixed terms, never figures: they stay (2026-10-20, audit A7).
    const { t: p, spans } = protectFixedTerms(s1);
    const s2 = restoreFixedTerms(p.replace(/\$?\d[\d,.]*\s*(?:%|\+|x\b|k\b|m\b|bn\b)?(?:\s*[-–]\s*\$?\d[\d,.]*\s*(?:%|\+)?)?\s*/g, '')
        .replace(/\b(?:a|an|the|of|at|on|to|by|than|above|below|over|under|nearly|about|approximately|up to)\s+(?=[,.;:]|$)/gi, ''), spans)
        .replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
    return s2 ? s2.charAt(0).toUpperCase() + s2.slice(1) : s1;
}
/** A body that only repeats its heading says nothing: it is left empty (the quote and source carry the entry). */
function dedupeBody(body: string, heading: string): string {
    const n = (x: string) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return n(body) === n(heading) || n(heading).startsWith(n(body)) ? '' : body;
}

function fillEntryFor(li: LedgerItem, areas: LedgerArea[], extraIds: string[] = []): CoverageFillEntry {
    const area = areas.find(a => a.id === li.featureArea);
    const src = li.sources?.find(s => s.quote) || (li.quote ? { quote: li.quote, sourceName: li.sourceName, pointer: li.pointer, speaker: li.speaker, date: li.date } : undefined);
    // The internal upload bucket reads as a client document, once (round-9 live "CLIENT DOCUMENT; CLIENT UPLOADS (OCT 2026)").
    const _srcName = String(src?.sourceName || li.sourceName || '').replace(/\bClient Uploads?\b:?\s*/gi, 'Client document: ').replace(/^Client document:\s*Client document:?\s*/i, 'Client document: ').replace(/:\s*$/, '').replace(/;\s*Client document\b.*$/i, '').trim();
    const who = [_srcName, (src as any)?.speaker || li.speaker, (src as any)?.date || li.date].filter(Boolean).join(', ');
    return {
        ids: Array.from(new Set([li.id, ...extraIds, ...(li.featureArea ? [li.featureArea] : [])])),
        areaId: li.featureArea || undefined,
        areaLabel: area?.label || (li.type === 'theme' ? 'Research themes' : 'Client scope'),
        heading: cardHeading(plainWords(stripPointerText(soft(figureFree(readableHeading(li, src?.quote), li.statement, src?.quote), src?.quote)))),
        // The body keeps only sentences whose figures are sourced (or that carry none); never a fallback to the raw
        // statement, which reintroduced unsourced figures (offline audit on two real projects: 84 placeholders).
        body: dedupeBody(plainWords(stripPointerText(fillBody(li, src?.quote))), plainWords(stripPointerText(soft(figureFree(readableHeading(li, src?.quote), li.statement, src?.quote), src?.quote)))),
        // Rendered output never carries an em dash, a verbatim source span included; the verbatim check compares
        // punctuation-insensitively, so the normalized span still matches its evidence.
        quote: src?.quote ? src.quote.replace(/\s*\u2014\s*/g, ' - ') : undefined,
        source: src?.quote ? who : undefined,
        pointer: src?.pointer || undefined,
    };
}

function coverageContract(spec: CoverageSpec, areas: LedgerArea[], ledger: LedgerItem[]): CoverageContract<CoverageDoc> {
    const areaOf = new Map(ledger.map(l => [l.id, l.featureArea] as const));
    const people = ledgerPeople(ledger);
    return {
        deliverable: spec.label,
        universe: (lg) => coverageUniverse(spec, lg, areas),
        unitsOf: (doc) => doc.units().map(u => ({ id: u.id })),
        covers: (unit, doc) => {
            const ids = new Set(doc.bound(unit.id));
            for (const id of [...ids]) { const a = areaOf.get(id); if (a) ids.add(a); }
            return [...ids];
        },
        deterministicFill: (doc, missing) => {
            const byId = new Map(ledger.map(l => [l.id, l] as const));
            const entries: CoverageFillEntry[] = [];
            const done = new Set<string>();
            for (const m of missing) {
                if (done.has(m.id)) continue;
                if (m.type === 'area') {
                    const rep = pickRepresentative(m.id, ledger);
                    if (rep) { entries.push(fillEntryFor(rep, areas, [m.id])); done.add(m.id); done.add(rep.id); }
                    continue;
                }
                if (m.type === 'person') {
                    const p = people.find(x => x.id === m.id);
                    const li = p ? byId.get(p.ledgerIds[0]) : undefined;
                    if (p) {
                        entries.push({ ids: [p.id], areaLabel: 'People named in the client documents', heading: p.name, body: li ? `${p.name} speaks to ${li.item}.` : p.name, quote: li?.quote, source: li ? [li.sourceName, li.date].filter(Boolean).join(', ') : undefined, pointer: li?.pointer });
                        done.add(m.id);
                    }
                    continue;
                }
                const li = byId.get(m.ledgerId || m.id);
                if (li) { entries.push(fillEntryFor(li, areas)); done.add(m.id); }
            }
            return entries.length ? doc.addFill(entries) : 0;
        },
    };
}

/** Bind every unit of the doc to the universe items its text carries (deterministic; replaces earlier bindings). */
function bindCoverage(doc: CoverageDoc, universe: CoverageSourceItem[], ledger: LedgerItem[]): number {
    const targets = matchTargets(universe, ledger);
    let n = 0;
    for (const u of doc.units()) {
        const ids = Array.from(new Set([...doc.bound(u.id), ...matchUnit(u.text, targets)]));
        doc.bind(u.id, ids);
        n += ids.length;
    }
    return n;
}

function fillAdapter(doc: CoverageDoc, stats?: LedgerReadStats): DeliverableAdapter<CoverageDoc> {
    return {
        deliverable: doc.kind,
        claimSet: (d) => {
            const c = d.fillClaims();
            return { deliverable: d.kind, units: c.units, quotes: c.quotes, sources: c.sources, evidence: c.evidence, declaredIds: [], refs: [], ledgerStats: stats };
        },
    };
}

export interface CoverageRunResult {
    receipt: DeliverableReceipt;
    universe: number;
    boundByModel: number;
    filled: CoverageFillEntry[];
    kind: CoverageKind;
    /** The universe as the export re-check reads it: an area is carried when any of its member items is. */
    universeRecord: CoverageUniverseRecord;
}

export interface CoverageUniverseRecord { kind: CoverageKind; items: Array<{ id: string; label: string; anyOf?: string[] }> }

/**
 * Run one deliverable's contract in-path: bind, check, fill, universal rules, receipt. Pure apart from the doc's
 * own mutation (no network): the caller supplies the ledger, the areas and the read stats.
 */
export async function runCoverageContract(doc: CoverageDoc, ledger: LedgerItem[], areas: LedgerArea[], stats?: LedgerReadStats, focus = ''): Promise<CoverageRunResult> {
    const spec = COVERAGE_SPECS[doc.kind];
    const universe = coverageUniverse(spec, ledger, areas, focus);
    bindCoverage(doc, universe, ledger);
    const contract = coverageContract(spec, areas, ledger);
    const before = new Set<string>();
    for (const u of doc.units()) for (const id of contract.covers({ id: u.id }, doc)) before.add(id);
    const boundByModel = universe.filter(x => before.has(x.id)).length;
    const filled: CoverageFillEntry[] = [];
    const recording: CoverageContract<CoverageDoc> = {
        ...contract,
        deterministicFill: (d, missing) => {
            const n0 = d.units().length;
            const wrapped: CoverageDoc = { ...d, addFill: (entries) => { filled.push(...entries); return d.addFill(entries); } } as CoverageDoc;
            const n = contract.deterministicFill(wrapped, missing);
            return n || d.units().length - n0;
        },
    };
    const receipt = await runDeliverableRules(doc, fillAdapter(doc, stats), { coverage: recording, ledger });
    const universeRecord: CoverageUniverseRecord = {
        kind: doc.kind,
        items: universe.map(u => (u.type === 'area' ? { id: u.id, label: u.label, anyOf: [u.id, ...ledger.filter(l => l.featureArea === u.id).map(l => l.id)] } : { id: u.id, label: u.label })),
    };
    return { receipt, universe: universe.length, boundByModel, filled, kind: doc.kind, universeRecord };
}

/** Plain-words lines for the chat reply and the export. */
export function formatCoverageSummary(r: CoverageRunResult | null | undefined): string[] {
    if (!r) return [];
    const spec = COVERAGE_SPECS[r.kind];
    const lines: string[] = [];
    const fillUnit = spec.fill === 'theme-cards' ? (r.filled.length === 1 ? 'theme card' : 'theme cards') : (r.filled.length === 1 ? 'appendix exhibit entry' : 'appendix exhibit entries');
    lines.push(`Coverage: the ${spec.label} carries ${r.boundByModel} of ${r.universe} client item${r.universe === 1 ? '' : 's'} and research theme${r.universe === 1 ? '' : 's'}${r.filled.length ? `; ${r.filled.length} more added as ${fillUnit}, each quoting its source` : '; nothing needed filling'}.`);
    if (r.filled.length) {
        const names = r.filled.slice(0, 12).map(f => f.heading).join('; ');
        lines.push(`Added: ${names}${r.filled.length > 12 ? `; and ${r.filled.length - 12} more` : ''}.`);
    }
    const open = r.receipt.rules.filter(x => !x.pass);
    lines.push(open.length ? `Rule receipt: ${open.map(x => `${x.title} (${x.violations.length} open)`).join('; ')}.` : 'Rule receipt: every rule passes.');
    return lines;
}

// ---- deck (slide fences) ----------------------------------------------------------------------------

export interface CoverageSlide {
    id: string;
    template: string;
    title: string;
    subtitle?: string;
    brand?: any;
    status?: string;
    timestamp?: number;
    sources?: string[];
    _coverageIds?: string[];
    _coverageFill?: boolean;
    [k: string]: any;
}

const SKIP_KEYS = /^(?:id|_.*|imageUrl|imagePrompt|diagramImage|image|images|phaseImages|portrait|url|brand|status|timestamp|model|density|template)$/;
export function slideText(sl: CoverageSlide): string {
    const parts: string[] = [];
    const walk = (v: any, k = '') => {
        if (k && SKIP_KEYS.test(k)) return;
        if (typeof v === 'string') { if (!/^data:|^https?:\/\//.test(v)) parts.push(v); return; }
        if (Array.isArray(v)) { v.forEach(x => walk(x)); return; }
        if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, kk);
    };
    walk(sl);
    return parts.join(' \n ');
}

const MERGE_THRESHOLD = 24;      // above this many fill entries, related entries share one exhibit section
const DENSE_THRESHOLD = 120;     // above this many, six related entries share a section (one slide carries 36 items)
const SECTIONS_PER_SLIDE = 6;    // executive-brief dense ceiling (types.ts DENSITY_SPEC)
const THEMES_PER_SLIDE = 4;      // theme-overview ceiling

function chunk<T>(xs: T[], n: number): T[][] { const out: T[][] = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out; }

/** Group entries by area (stable), merging up to three per section once the fill is large. */
function exhibitSections(entries: CoverageFillEntry[]): Array<{ areaLabel: string; sections: Array<{ heading: string; body: string; evidence?: { quote: string; source: string }; ids: string[] }> }> {
    const byArea = new Map<string, CoverageFillEntry[]>();
    for (const e of entries) { const k = e.areaLabel; if (!byArea.has(k)) byArea.set(k, []); byArea.get(k)!.push(e); }
    const per = entries.length > DENSE_THRESHOLD ? 6 : entries.length > MERGE_THRESHOLD ? 3 : 1;
    return [...byArea.entries()].map(([areaLabel, list]) => ({
        areaLabel,
        sections: chunk(list, per).map(group => {
            const lead = group.find(g => g.quote) || group[0];
            // A merged section names every item it accounts for: the lead item heads it, the body lists the rest.
            const heading = group[0].heading;
            // The section shows only the lead item's quote, so the other items' figures are unsourced HERE: softened.
            const body = group.length === 1 ? group[0].body : `${group[0].body} Also: ${group.slice(1).map(g => soft(g.heading)).join('; ')}.`.trim();
            return {
                heading: heading.length > 120 ? `${heading.slice(0, 117).replace(/\s+\S*$/, '')}...` : heading,
                body: body.length > 400 ? `${body.slice(0, 397).replace(/\s+\S*$/, '')}...` : body,
                ...(lead.quote ? { evidence: { quote: lead.quote.length > 250 ? `${lead.quote.slice(0, 247).replace(/\s+\S*$/, '')}...` : lead.quote, source: lead.source || 'Client document', ...(lead.pointer ? { pointer: lead.pointer } : {}) } } : {}),
                ids: group.flatMap(g => g.ids),
            };
        }),
    }));
}

export interface DeckCoverageDoc extends CoverageDoc { slides: CoverageSlide[]; added: CoverageSlide[] }

export function deckCoverageDoc(kind: CoverageKind, slides: CoverageSlide[], opts: { idPrefix: string; brand?: any; timestamp?: number }): DeckCoverageDoc {
    const all = (): CoverageSlide[] => [...doc.slides, ...doc.added];
    const fillQuotes: Array<{ id: string; slide: CoverageSlide; get: () => { quote: string; source: string } | undefined; drop: () => void; pointer?: string }> = [];
    let seq = 0;
    const doc: DeckCoverageDoc = {
        kind,
        slides,
        added: [],
        units: () => all().map(s => ({ id: s.id, text: slideText(s) })),
        bind: (id, ids) => { const s = all().find(x => x.id === id); if (s) s._coverageIds = ids; },
        bound: (id) => all().find(x => x.id === id)?._coverageIds || [],
        addFill: (entries) => {
            const ts = opts.timestamp ?? Date.now();
            const before = doc.added.length;
            if (COVERAGE_SPECS[kind].fill === 'theme-cards') {
                for (const group of chunk(entries, THEMES_PER_SLIDE)) {
                    const sl: CoverageSlide = {
                        id: `${opts.idPrefix}_cov_${++seq}`, template: 'theme-overview', brand: opts.brand, status: 'draft', timestamp: ts,
                        // 2026-10-05: the strongest theme heads the card (a judgment), never a process label.
                        title: group[0].heading,
                        themeCluster: { themes: group.map(e => ({ name: e.heading, insight: e.body, ...(!e.body && e.quote ? { evidence: e.quote } : {}), ...(e.source ? { source: e.source } : {}), ...(e.quote ? { quotes: [{ text: e.quote, source: e.source || '', ...(e.pointer ? { pointer: e.pointer } : {}) }] } : {}) })) },
                        _coverageIds: group.flatMap(e => e.ids), _coverageFill: true,
                    };
                    group.forEach((e, i) => { if (e.quote) fillQuotes.push({ id: `${sl.id}.q${i}`, slide: sl, pointer: e.pointer, get: () => { const t = sl.themeCluster.themes[i]?.quotes?.[0]; return t ? { quote: t.text, source: t.source } : undefined; }, drop: () => { delete sl.themeCluster.themes[i].quotes; } }); });
                    doc.added.push(sl);
                }
            } else {
                for (const area of exhibitSections(entries)) {
                    const pages = chunk(area.sections, SECTIONS_PER_SLIDE);
                    pages.forEach((secs, pi) => {
                        const sl: CoverageSlide = {
                            id: `${opts.idPrefix}_cov_${++seq}`, template: 'executive-brief', brand: opts.brand, status: 'draft', timestamp: ts, density: 'dense',
                            // No page counter in the title (the title gate reads "(1 of 22)" as a naked figure).
                            title: `Appendix: ${area.areaLabel}${pi > 0 ? ', continued' : ''}`,
                            executiveBrief: { variant: 'report', subject: 'Client scope and research themes', sections: secs.map(({ heading, body, evidence }) => ({ heading, body, ...(evidence ? { evidence } : {}) })) },
                            _coverageIds: secs.flatMap(x => x.ids), _coverageFill: true,
                        };
                        secs.forEach((x, i) => {
                            if (!x.evidence) return;
                            const e = entries.find(en => x.ids.includes(en.ids[0]) && en.quote);
                            fillQuotes.push({ id: `${sl.id}.q${i}`, slide: sl, pointer: e?.pointer, get: () => sl.executiveBrief.sections[i]?.evidence, drop: () => { delete sl.executiveBrief.sections[i].evidence; } });
                        });
                        doc.added.push(sl);
                    });
                }
            }
            return doc.added.length - before;
        },
        fillClaims: () => {
            const units: ClaimUnit[] = [];
            for (const sl of doc.added) {
                units.push({ id: `${sl.id}.title`, kind: 'title', text: sl.title, numbersChecked: false, set: t => { sl.title = t; } });
                if (sl.executiveBrief) sl.executiveBrief.sections.forEach((sec: any, i: number) => {
                    units.push({ id: `${sl.id}.s${i}.heading`, kind: 'heading', text: sec.heading, numbersChecked: !figuresSourced(sec.heading, sec.evidence?.quote), set: t => { sec.heading = t; } });
                    units.push({ id: `${sl.id}.s${i}.body`, kind: 'body', text: sec.body, numbersChecked: !figuresSourced(sec.body, sec.evidence?.quote), set: t => { sec.body = t; } });
                });
                if (sl.themeCluster) sl.themeCluster.themes.forEach((th: any, i: number) => {
                    units.push({ id: `${sl.id}.t${i}.name`, kind: 'heading', text: th.name, numbersChecked: !figuresSourced(th.name, th.quotes?.[0]?.text), set: t => { th.name = t; } });
                    units.push({ id: `${sl.id}.t${i}.insight`, kind: 'body', text: th.insight, numbersChecked: !figuresSourced(th.insight, th.quotes?.[0]?.text), set: t => { th.insight = t; } });
                });
            }
            const live = fillQuotes.filter(q => q.get());
            const quotes: ClaimQuote[] = live.map(q => ({ id: q.id, text: q.get()!.quote, pointer: q.pointer, sourceId: `src:${q.id}`, drop: q.drop }));
            const sources: ClaimSource[] = live.map(q => ({ id: `src:${q.id}`, name: q.get()!.source, pointer: q.pointer?.replace(/#c\d+$/, '') }));
            const evidence: EvidenceRef[] = live.map(q => ({ id: q.pointer || q.id, text: q.get()!.quote.replace(/\.\.\.$/, ''), pointer: q.pointer, sourceName: q.get()!.source }));
            return { units, quotes, sources, evidence };
        },
    };
    return doc;
}

// ---- HTML documents (#report #whitepaper #explainer #brief #questionnaire, uplift HTML) -----------------

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s: string) => String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export interface HtmlCoverageDoc extends CoverageDoc { html(): string }

/** Sections are the spans between h1/h2/h3 headings; the appendix is appended before </body> (or at the end). */
export function htmlCoverageDoc(kind: CoverageKind, html: string, opts: { appendixTitle?: string } = {}): HtmlCoverageDoc {
    const parts = String(html || '').split(/(?=<h[1-3][\s>])/i);
    const sections = parts.map((p, i) => ({ id: `sec-${i + 1}`, text: stripTags(p) })).filter(s => s.text);
    const bound = new Map<string, string[]>();
    const fills: CoverageFillEntry[] = [];
    const dropped = new Set<number>();
    const render = (): string => {
        if (!fills.length) return html;
        const byArea = new Map<string, Array<{ e: CoverageFillEntry; i: number }>>();
        fills.forEach((e, i) => { if (!byArea.has(e.areaLabel)) byArea.set(e.areaLabel, []); byArea.get(e.areaLabel)!.push({ e, i }); });
        const body = [...byArea.entries()].map(([area, list]) => `<h3>${esc(area)}</h3>\n${list.map(({ e, i }) => `<div class="hic-coverage-item" data-covers="${esc(e.ids.join(' '))}"><h4>${esc(e.heading)}</h4>${e.body ? `<p>${esc(e.body)}</p>` : ''}${e.quote && !dropped.has(i) ? `<blockquote><p>"${esc(e.quote)}"</p><cite>${esc(displaySourceName(e.source || 'Client document'))}</cite></blockquote>` : ''}</div>`).join('\n')}`).join('\n');
        const block = `\n<section class="hic-coverage-index" data-coverage="fill" style="max-width:960px;margin:48px auto;padding:0 24px;box-sizing:border-box">\n<h2>${esc(opts.appendixTitle || 'Appendix: client scope and research themes')}</h2>\n${body}\n</section>\n`;
        // 2026-10-02 live #report: the model's reply stopped inside a <style> block, the appendix was appended INTO
        // it and the whole page rendered blank. A raw-text element (style, script, comment) left open is closed
        // before anything is appended, and the appendix goes before </body> only when that tag is real markup.
        let base = String(html || '');
        for (const tag of ['style', 'script']) {
            const open = (base.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length, close = (base.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
            if (open > close) base += `</${tag}>`.repeat(open - close);
        }
        if (base.lastIndexOf('<!--') > base.lastIndexOf('-->')) base += '-->';
        return /<\/body>/i.test(base) && base.search(/<\/body>(?![\s\S]*<\/body>)/i) > Math.max(base.lastIndexOf('</style>'), base.lastIndexOf('</script>'))
            ? base.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${block}</body>`) : base + block;
    };
    const doc: HtmlCoverageDoc = {
        kind,
        units: () => [...sections, ...fills.map((e, i) => ({ id: `fill-${i + 1}`, text: `${e.heading} ${e.body} ${e.quote || ''}` }))],
        bind: (id, ids) => { if (id.startsWith('fill-')) return; bound.set(id, ids); },
        bound: (id) => (id.startsWith('fill-') ? fills[+id.slice(5) - 1]?.ids || [] : bound.get(id) || []),
        addFill: (entries) => {
            // 2026-11-09 (independent QA of a live #report appendix): three entry pairs shipped as
            // verbatim duplicates, one heading carried a mid-word "..." cut, and one source sentence
            // repeated identically under three different headings. Dedupe by normalized heading,
            // reuse a quote only once (later entries keep their heading and body, lose the repeat),
            // and strip a truncation ellipsis that upstream theme names sometimes carry.
            const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            // 2026-11-09 (QA third review): six near-duplicate "portability" theme variants with
            // different wordings survived exact-heading dedupe, and entries with no quote at all
            // shipped under an evidence appendix. Near-duplicates collapse by content-word overlap,
            // and an entry ships only with its verbatim quote (the file's own contract: "an appendix
            // exhibit that quotes the source verbatim with its attribution").
            const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'for', 'in', 'on', 'over', 'with', 'via', 'by', 'their', 'own', 'that', 'as', 'at', 'is', 'are']);
            const wordsOf = (s: string) => new Set(norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
            const overlaps = (a: Set<string>, b: Set<string>) => {
                if (!a.size || !b.size) return 0;
                let inter = 0;
                for (const w of a) if (b.has(w)) inter++;
                return inter / Math.min(a.size, b.size);
            };
            // The coverage receipt needs EVERY item accounted for, so a duplicate is never dropped:
            // its ids MERGE into the surviving entry's data-covers and the reader sees one exhibit.
            const seenWordSets: Array<Set<string>> = fills.map(f => wordsOf(f.heading));
            const seenQuotes = new Set(fills.map(f => norm(f.quote || '')).filter(Boolean));
            let added = 0;
            // Board-theme text arrives with stored grammar defects ("a explicit division of labor",
            // "AI handle preparation"); the appendix is reader copy, so heading and body get a
            // conservative cleanup. Quotes stay verbatim and are never touched.
            const tidy = (s: string) => String(s || '')
                .replace(/\b([Aa]) (accessible|established|explicit|important|open|existing|additional|internal|external|official|individual|automated|approved|updated|integrated|independent|essential|entire|early|easy|active|annual|audit|auditable)\b/g,
                    (_m, a: string, w: string) => `${a === 'A' ? 'An' : 'an'} ${w}`)
                .replace(/\bAI handle\b/g, 'AI handles');
            for (const raw of entries) {
                const e = { ...raw };
                e.heading = tidy(String(e.heading || '').replace(/\s*(?:\.\.\.|…)\s*$/, '').trim());
                e.body = tidy(e.body);
                const h = norm(e.heading);
                const hw = wordsOf(e.heading);
                const matchAt = !h ? -1 : fills.findIndex((f, i) => norm(f.heading) === h || overlaps(hw, seenWordSets[i]) >= 0.6);
                if (matchAt >= 0) {
                    const tgt = fills[matchAt];
                    for (const id of e.ids) if (!tgt.ids.includes(id)) tgt.ids.push(id);
                    continue;
                }
                const q = norm(e.quote || '');
                if (q && seenQuotes.has(q)) { e.quote = undefined; e.pointer = undefined; }
                else if (q) seenQuotes.add(q);
                seenWordSets.push(hw);
                fills.push(e);
                added++;
            }
            return added;
        },
        fillClaims: () => {
            const units: ClaimUnit[] = [];
            fills.forEach((e, i) => {
                units.push({ id: `fill-${i + 1}.heading`, kind: 'heading', text: e.heading, numbersChecked: !figuresSourced(e.heading, e.quote), set: t => { e.heading = t; } });
                units.push({ id: `fill-${i + 1}.body`, kind: 'body', text: e.body, numbersChecked: !figuresSourced(e.body, e.quote), set: t => { e.body = t; } });
            });
            const live = fills.map((e, i) => ({ e, i })).filter(x => x.e.quote && !dropped.has(x.i));
            return {
                units,
                quotes: live.map(({ e, i }) => ({ id: `fill-${i + 1}.q`, text: e.quote!, pointer: e.pointer, sourceId: `src:${i}`, drop: () => { dropped.add(i); } })),
                sources: live.map(({ e, i }) => ({ id: `src:${i}`, name: e.source || 'Client document', pointer: e.pointer?.replace(/#c\d+$/, '') })),
                evidence: live.map(({ e, i }) => ({ id: e.pointer || `fill-${i + 1}`, text: e.quote!, pointer: e.pointer, sourceName: e.source })),
            };
        },
        html: render,
    };
    return doc;
}

// ---- in-path orchestration (network: ledger + board themes) ------------------------------------------

export interface CoverageInputs { ledger: LedgerItem[]; areas: LedgerArea[]; stats: LedgerReadStats; /** the request + objective, for theme-cap relevance */ focus?: string }

/**
 * Load what every contract reads: the engagement ledger (every client document read in full; persisted analysis
 * reused, missing documents analyzed now), the Research Assembly Board themes (session context unioned with the
 * persisted engagement themes, quotes scoped to this engagement), THEME groups and derived areas. Never throws;
 * null when the engagement has neither client documents nor themes.
 */
export async function loadCoverageInputs(opts: { engagement: string; requestText?: string; objective?: string; contextThemes?: unknown; io?: LedgerIo & { judge?: (p: { system: string; user: string }) => Promise<string> }; onProgress?: (m: string) => void }): Promise<CoverageInputs | null> {
    try {
        const L = await import('./engagementLedger');
        const { themesFromContext } = await import('./prdInputs');
        const io: LedgerIo = { ...(opts.io || {}), onProgress: opts.onProgress };
        const ledger = await L.buildEngagementLedger({ ...io, engagement: opts.engagement, requestText: opts.requestText });
        const merged = L.mergeBoardThemes(themesFromContext(opts.contextThemes) as ThemeInput[], themesFromContext(await L.loadBoardThemes(opts.engagement, io)) as ThemeInput[]);
        const scoped = await L.scopeThemeQuotesToEngagement(merged, opts.engagement, io);
        // Board-admission relevance gate (2026-10-03): off-topic themes from other engagements are not part of this
        // engagement's universe (cached verdicts; a theme is judged once).
        const { gateForeignThemes } = await import('./themeRelevanceGate');
        const objective = String(opts.requestText || '').trim();
        const gated = await gateForeignThemes(scoped.themes, { ...(opts.io || {}), engagement: opts.engagement, objective: opts.objective || objective, scope: ledger.items.map(i => i.item).slice(0, 40) });
        if (gated.held.length) console.info(`[coverage] ${gated.held.length} off-topic theme(s) from other engagements left out of the universe`);
        const all = [...ledger.items, ...L.themeLedgerItems(gated.kept)];
        if (!all.length) return null;
        const areas = L.assignAreas(all);
        return { ledger: all, areas, stats: { engagement: opts.engagement, documents: ledger.documentStats, foreignPages: scoped.foreignPages }, focus: [opts.requestText, opts.objective].filter(Boolean).join(' ') };
    } catch (e: any) {
        console.warn('[coverage] inputs unavailable (non-fatal):', e?.message || e);
        return null;
    }
}

// ---- #presentation payload (narrativeComposer) ---------------------------------------------------------

export interface PresentationCoverageDoc extends CoverageDoc { payload: any }

/** Units are payload sections; fills are native `themes` sections (mosaic, four themes each) placed before the CTA. */
export function presentationCoverageDoc(payload: any, kind: CoverageKind = 'deck'): PresentationCoverageDoc {
    const sections: any[] = Array.isArray(payload?.sections) ? payload.sections : [];
    const bound = new Map<any, string[]>();
    const added: any[] = [];
    const fillQuotes: Array<{ id: string; cit: any; drop: () => void }> = [];
    const all = () => sections;
    const idOf = (s: any) => `sec-${all().indexOf(s) + 1}`;
    const byId = (id: string) => all()[+id.slice(4) - 1];
    const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 3).replace(/\s+\S*$/, '')}...` : s);
    const doc: PresentationCoverageDoc = {
        kind,
        payload,
        units: () => all().map(s => ({ id: idOf(s), text: slideText({ id: '', template: '', title: '', ...s } as any) })),
        bind: (id, ids) => { const s = byId(id); if (s) bound.set(s, ids); },
        bound: (id) => bound.get(byId(id)) || [],
        addFill: (entries) => {
            const ctaAt = sections.findIndex(s => s?.kind === 'cta');
            let at = ctaAt < 0 ? sections.length : ctaAt;
            for (const group of chunk(entries, THEMES_PER_SLIDE)) {
                const sec = {
                    kind: 'themes',
                    data: {
                        layout: 'mosaic',
                        themes: group.map(e => ({
                            name: clip(e.heading, 120), description: clip(e.body, 400), status: 'emerging',
                            citations: e.quote ? [{ sourceFile: e.pointer || '', sourceName: e.source || 'Client document', text: clip(e.quote, 250), scope: /client-uploads|uploads\//.test(e.pointer || '') ? 'uploaded' : 'analysis' }] : [],
                        })),
                    },
                };
                sections.splice(at++, 0, sec);
                bound.set(sec, group.flatMap(e => e.ids));
                added.push(sec);
                sec.data.themes.forEach((th: any, i: number) => { if (th.citations[0]) fillQuotes.push({ id: `pres-fill-${added.length}.${i}`, cit: th.citations[0], drop: () => { th.citations = []; } }); });
            }
            return Math.ceil(entries.length / THEMES_PER_SLIDE);
        },
        fillClaims: () => {
            const units: ClaimUnit[] = [];
            added.forEach((sec, k) => sec.data.themes.forEach((th: any, i: number) => {
                units.push({ id: `pres-fill-${k + 1}.${i}.name`, kind: 'heading', text: th.name, numbersChecked: false, set: t => { th.name = t; } });
                units.push({ id: `pres-fill-${k + 1}.${i}.description`, kind: 'body', text: th.description, set: t => { th.description = t; } });
            }));
            const live = fillQuotes.filter(q => added.some(sec => sec.data.themes.some((th: any) => th.citations[0] === q.cit)));
            return {
                units,
                quotes: live.map(q => ({ id: q.id, text: q.cit.text, pointer: q.cit.sourceFile || undefined, sourceId: `src:${q.id}`, drop: q.drop })),
                sources: live.map(q => ({ id: `src:${q.id}`, name: q.cit.sourceName, pointer: (q.cit.sourceFile || '').replace(/#c\d+$/, '') || undefined })),
                evidence: live.map(q => ({ id: q.cit.sourceFile || q.id, text: q.cit.text.replace(/\.\.\.$/, ''), pointer: q.cit.sourceFile || undefined, sourceName: q.cit.sourceName })),
            };
        },
    };
    return doc;
}

// ---- #proto product briefs ------------------------------------------------------------------------------

export interface ClientScopeEntry { ledgerIds: string[]; item: string; requirement: string; quote?: string; source?: string; disposition?: string }
export interface ProtoBriefCoverageDoc extends CoverageDoc { brief: any }

/**
 * One brief is one unit (its whole text). Uncovered stated features and prototype feedback are added to the brief's
 * `client_scope` list, which the build stages read (the brief is serialized into spec, design, pods and reviewer).
 * A feedback item keeps its disposition so the build knows whether the reviewers asked to keep, change or remove it.
 */
export function protoBriefCoverageDoc(brief: any, ledger: LedgerItem[]): ProtoBriefCoverageDoc {
    const byId = new Map(ledger.map(l => [l.id, l] as const));
    let bound: string[] = [];
    const doc: ProtoBriefCoverageDoc = {
        kind: 'proto',
        brief,
        units: () => [{ id: 'brief', text: slideText({ id: '', template: '', title: '', ...brief, client_scope: undefined } as any) }, ...((brief.client_scope || []) as ClientScopeEntry[]).map((e, i) => ({ id: `scope-${i + 1}`, text: `${e.item} ${e.requirement}` }))],
        bind: (id, ids) => { if (id === 'brief') bound = ids; },
        bound: (id) => (id === 'brief' ? bound : ((brief.client_scope || [])[+id.slice(6) - 1]?.ledgerIds || [])),
        addFill: (entries) => {
            brief.client_scope = Array.isArray(brief.client_scope) ? brief.client_scope : [];
            for (const e of entries) {
                const li = byId.get(e.ids[0]);
                brief.client_scope.push({ ledgerIds: e.ids, item: e.heading, requirement: e.body, ...(e.quote ? { quote: e.quote, source: e.source } : {}), ...(li?.disposition ? { disposition: li.disposition } : {}), _pointer: e.pointer });
            }
            return entries.length;
        },
        fillClaims: () => {
            const list: any[] = brief.client_scope || [];
            const units: ClaimUnit[] = [];
            list.forEach((e, i) => {
                units.push({ id: `scope-${i + 1}.item`, kind: 'heading', text: e.item, numbersChecked: false, set: t => { e.item = t; } });
                units.push({ id: `scope-${i + 1}.requirement`, kind: 'body', text: e.requirement, set: t => { e.requirement = t; } });
            });
            const live = list.map((e, i) => ({ e, i })).filter(x => x.e.quote);
            return {
                units,
                quotes: live.map(({ e, i }) => ({ id: `scope-${i + 1}.q`, text: e.quote, pointer: e._pointer, sourceId: `src:${i}`, drop: () => { delete e.quote; delete e.source; } })),
                sources: live.map(({ e, i }) => ({ id: `src:${i}`, name: e.source || 'Client document', pointer: (e._pointer || '').replace(/#c\d+$/, '') || undefined })),
                evidence: live.map(({ e, i }) => ({ id: e._pointer || `scope-${i + 1}`, text: e.quote, pointer: e._pointer, sourceName: e.source })),
            };
        },
    };
    return doc;
}
