/**
 * prdCompiler: the model-facing side of the one PRD contract (Stage 3.2 of
 * plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md; vision phases 1, 3, 5, 6).
 *
 * Two jobs, both deterministic around one model call the CALLER makes (routing stays with
 * `aiRouter.artifactModelFor`; this module never picks a model and never calls one):
 *
 *   1. `buildPrdCompilerPrompt(inputs)` builds the generation prompt for the one shape from TYPED AIR
 *      references: the approved personas, themes, journey pain points and competitive gaps, plus the
 *      grounding evidence chunks. Finding F1 showed the pipeline PRD received these as EMPTY arrays and
 *      the chat PRD received a knowledge-graph node list; neither could trace a requirement to a
 *      persona. This builder refuses to run without at least one evidence root.
 *
 *   2. `compilePrdAir(rawModelText, inputs)` parses the model's JSON into `PrdAir`. Source identity is
 *      the SYSTEM's, never the model's (citation provenance lock): every quote the model emits is
 *      verified verbatim against the evidence it was shown, its source and pointer are copied from
 *      that evidence item, and an unverifiable quote is dropped. A requirement left with no pain and
 *      no competitive gap is typed HYPOTHESIS and rendered as a bet. Tiers are then DERIVED from the
 *      evidence columns (`applyDerivedTiers`); the model's tier survives only as `proposedTier`.
 */

import type { BrandId } from '../components/slideTemplates/brands';
import {
    type PrdAir, type PrdQuote, type PrdSource, type PrdPain, type PrdRequirement, type PrdAcceptanceTest,
    type PrdSignal, type PrdTier, type PrdKanoType, type RequirementTarget, type PrdAirValidation,
    type PrdLedgerItem, type PrdLedgerCoverage, type PrdRequirementOrigin,
    createPrdAir, makeRequirementTarget, isRequirementTarget, applyDerivedTiers, typeUntraceableAsHypothesis,
    validatePrdAir, hasNakedNumber, PRD_SECTION_ORDER, ledgerCoverage, type PrdArea,
} from './prdAir';
import { formatReceiptLines, type DeliverableReceipt } from './deliverableRules';

// ---- typed inputs -----------------------------------------------------------------------------------

export interface PrdPersonaInput {
    id: string;
    name: string;
    role?: string;
    primary?: boolean;
    stageOfStruggle?: string;
    painPoints: Array<{ text: string; quote?: string; source?: string; pointer?: string }>;
}
export interface PrdThemeInput {
    id: string;
    name: string;
    insight?: string;
    sentiment?: string;
    category?: string;
    /** Origin of a cached theme ("cached") and its synthesis file: what the board-admission gate reads. */
    source?: string;
    source_synthesis_path?: string;
    quotes: Array<{ text: string; source: string; pointer?: string }>;
}
export interface PrdJourneyPainInput {
    id: string;
    stage: string;
    text: string;
    quote?: string;
    source?: string;
    pointer?: string;
    personaIds?: string[];
}
export interface PrdCompetitiveGapInput {
    id: string;
    text: string;
    competitor?: string;
    quote?: string;
    source?: string;
    pointer?: string;
}
/** GateChunk-compatible: the same shape `runHtmlArtifactChain` receives as `chunks`. */
export interface PrdEvidenceChunk {
    id: string;
    text: string;
    sources?: Array<{ n?: string; u?: string }>;
    kind?: string;
    date?: string;
}
export interface PrdCompilerInputs {
    artifactId: string;
    runId?: string;
    objective: string;
    decisionToSupport?: string;
    audience?: string;
    brand?: BrandId;
    personas: PrdPersonaInput[];
    themes: PrdThemeInput[];
    journeyPains: PrdJourneyPainInput[];
    competitiveGaps: PrdCompetitiveGapInput[];
    evidenceChunks: PrdEvidenceChunk[];
    /** e.g. "six weeks": the caller's appetite when the engagement has one. */
    appetiteHint?: string;
    /**
     * Scope and feedback ledger (services/prdScopeLedger.ts): every feature and piece of feedback the client
     * articulated in its documents, read in full and provenance-locked. Each item is a requirement root.
     */
    ledger?: PrdLedgerItem[];
    /** Feature areas derived from this project's ledger (`assignAreas`); ledger items carry the area id. */
    areas?: PrdArea[];
    /** Per-document read stats from the ledger build (chunks registered vs read), for the receipt. */
    ledgerStats?: { engagement?: string; documents: Array<{ wikiPath: string; title: string; chunksRegistered: number; chunksRead: number }>; foreignPages?: string[] };
    /** Prompt budget guards. Client-upload chunks are listed first; theme quotes are capped. */
    maxChunks?: number;
    maxChunkChars?: number;
    maxThemeQuotes?: number;
}

export class PrdInputsError extends Error {
    constructor(public readonly missing: string[]) {
        super(`#prd cannot compile without typed evidence roots; missing: ${missing.join(', ')}`);
        this.name = 'PrdInputsError';
    }
}

// ---- the evidence table the model quotes from -----------------------------------------------------

export interface EvidenceItem {
    id: string;
    text: string;
    sourceName: string;
    kind: string;
    pointer?: string;
    url?: string;
    date?: string;
}

const POINTER_RE = /^[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?$/i;

function sourceNameFromPointer(p: string): string {
    const page = p.replace(/#c\d+$/i, '');
    const parts = page.split('/').filter(Boolean);
    // articles/<source-slug>/<hash>.md -> the source slug, title-cased
    const slug = parts.length >= 3 ? parts[parts.length - 2] : (parts[parts.length - 1] || page).replace(/\.md$/i, '');
    return slug.split(/[-_]/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** A derived synthesis page or label: a cached summary of other sources, never primary evidence (B7). */
const DERIVED_PAGE_RE = /(?:^|\/)(?:hic-theme-synthesis|synthesis)\//i;
const DERIVED_NAME_RE = /^(?:hic theme synthesis|engagement research synthesis|geminiflash analysis|gemini[- ]focused[- ]research|corpus|unknown source|nxt humans wiki)$/i;
function isDerivedEvidence(e: { pointer?: string; sourceName?: string; id?: string }): boolean {
    const page = String(e.pointer || '').replace(/#c\d+$/i, '');
    return (!!page && DERIVED_PAGE_RE.test(page)) || DERIVED_NAME_RE.test(String(e.sourceName || '').trim());
}

/** A token that is a content hash or a thread id, not a name ("1qxkv3v", "ab12cd34ef"). */
const HASHLIKE_RE = /^(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{5,12}$/i;
const UPLOAD_EXT_RE = /\.(?:pdf|docx?|txt|csv|xlsx?|pptx?|md|rtf)$/i;

/**
 * The reader-facing name of a source (2026-10-01, B8). The live #prd rendered "Cached Reuse Contract012 ...",
 * "1qxkv3v" and "Hic Theme Synthesis": labels derived from a file path, a slug or a hash. The registered
 * name is kept when it is a name; a file name or slug is made readable and typed ("Client document: ...");
 * a derived synthesis page is labelled as one; a subreddit reads "Reddit r/neu". Generic: nothing here
 * names a client, an industry or a vendor.
 */
export function readableSourceName(raw: string, pointer?: string): string {
    const page = String(pointer || '').replace(/#c\d+$/i, '');
    let n = String(raw || '').replace(/\s+/g, ' ').trim();
    // Already a readable label (a second pass over a recovered or re-pointed item): never prefix twice.
    if (/^Client document(?::|$)/.test(n)) return n.replace(/^(?:Client document:\s*)+/, 'Client document: ').replace(/^Client document: $/, 'Client document');
    if (DERIVED_NAME_RE.test(n) || (page && DERIVED_PAGE_RE.test(page) && (!n || /synthesis/i.test(n)))) return 'Engagement research synthesis';
    const reddit = /^reddit(?:[ -]deep)?\s*:\s*(r\/[\w-]+)/i.exec(n) || (!n ? /reddit[^/]*\/(?:r-)?([\w-]+)\//i.exec(page) : null);
    if (reddit) return `Reddit ${reddit[1].startsWith('r/') ? reddit[1] : `r/${reddit[1]}`}`;
    let upload = /(?:^|\/)(?:client-uploads|cached-reuse[^/]*|uploads?)\//i.test(page) || /^articles\/cached-reuse/i.test(page);
    const cached = /^cached reuse\s*:\s*/i.exec(n);
    if (cached) { n = n.slice(cached[0].length); upload = true; }
    if (/^(?:client uploads?|[\w ]*uploads)$/i.test(n)) return 'Client document';
    // A file extension, or a mixed-case file stem with underscores ("Research_Findings_Clean"), is a document
    // the engagement ingested; an all-lowercase slug ("labor_market_tracker") is a feed name.
    if (UPLOAD_EXT_RE.test(n) || (/_/.test(n) && /[A-Z]/.test(n) && !/\s/.test(n))) upload = true;
    n = n.replace(UPLOAD_EXT_RE, '').replace(/\s*\(\d+\)\s*$/, '').trim();
    if (/_/.test(n) || /^[a-z0-9-]+$/.test(n)) {
        // A slug or file stem: words, title-cased where lower, trailing revision words dropped.
        n = n.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s+(?:final|clean|draft|v\d+)$/i, '').trim();
        n = n.split(' ').map(w => /^[a-z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
    }
    if (!n || HASHLIKE_RE.test(n)) {
        if (upload) return 'Client document';
        if (/reddit|social-intelligence/i.test(page)) return 'Reddit discussion';
        return n || 'Named source';
    }
    return upload ? `Client document: ${n}` : n;
}

/** A client-document chunk: primary evidence the PRD must not crowd out with theme quotes (2026-10-02). */
function isClientUploadChunk(c: { id?: string; kind?: string }): boolean {
    return /(?:^|\/)(?:client-uploads|uploads|cached-reuse[^/]*)\//i.test(String(c.id || '')) || /^(?:upload|client-document)$/i.test(String(c.kind || ''));
}

export function flattenEvidence(inputs: PrdCompilerInputs): EvidenceItem[] {
    const items: EvidenceItem[] = [];
    const seen = new Set<string>();
    const push = (it: EvidenceItem) => {
        const text = String(it.text || '').trim();
        if (!text || seen.has(it.id)) return;
        seen.add(it.id);
        items.push({ ...it, text });
    };
    // Ledger quotes come first: the client's own words, already provenance-locked against the full chunk.
    for (const li of inputs.ledger || []) {
        (li.sources?.length ? li.sources : [{ quote: li.quote, sourceName: li.sourceName, pointer: li.pointer, documentTitle: li.documentTitle, date: li.date }]).forEach((src, k) => {
            const pointer = POINTER_RE.test(src.pointer || '') ? src.pointer : undefined;
            push({ id: `${li.id}.s${k}`, text: src.quote, sourceName: src.sourceName || li.sourceName, kind: pointer ? 'client-document' : 'request', pointer, date: src.date });
        });
    }
    // 2026-10-02: the live compile saw 16 upload chunks among 411 items (60 x 700 chars). Client-document
    // chunks now lead, and the budgets are raised so primary documents are not crowded out.
    const maxChunks = inputs.maxChunks ?? 120;
    const maxChars = inputs.maxChunkChars ?? 900;
    const chunks = [...(inputs.evidenceChunks || [])].map((c, i) => ({ c, i })).sort((a, b) => (Number(isClientUploadChunk(b.c)) - Number(isClientUploadChunk(a.c))) || (a.i - b.i)).map(x => x.c);
    for (const c of chunks.slice(0, maxChunks)) {
        const pointer = POINTER_RE.test(c.id) ? c.id : undefined;
        const name = readableSourceName(c.sources?.[0]?.n || (pointer ? sourceNameFromPointer(pointer) : c.id), pointer);
        push({ id: c.id, text: c.text.length > maxChars ? c.text.slice(0, maxChars) : c.text, sourceName: name, kind: c.kind || (pointer ? 'article' : 'chunk'), pointer, url: c.sources?.[0]?.u, date: c.date });
    }
    for (const p of inputs.personas || []) {
        p.painPoints.forEach((pp, i) => {
            if (!pp.quote) return;
            push({ id: `${p.id}.pain.${i}`, text: pp.quote, sourceName: pp.source ? readableSourceName(pp.source, pp.pointer) : `Approved persona: ${p.name}`, kind: pp.source ? 'persona-evidence' : 'persona-record', pointer: pp.pointer });
        });
    }
    let themeQuotes = 0;
    const maxThemeQuotes = inputs.maxThemeQuotes ?? 120;
    for (const t of inputs.themes || []) {
        t.quotes.forEach((q, i) => {
            if (themeQuotes >= maxThemeQuotes) return;
            themeQuotes++;
            push({ id: `${t.id}.q.${i}`, text: q.text, sourceName: readableSourceName(q.source, q.pointer), kind: 'theme-evidence', pointer: q.pointer });
        });
    }
    for (const j of inputs.journeyPains || []) {
        if (j.quote) push({ id: `${j.id}.q`, text: j.quote, sourceName: j.source ? readableSourceName(j.source, j.pointer) : `Approved journey map: ${j.stage}`, kind: j.source ? 'journey-evidence' : 'journey-record', pointer: j.pointer });
    }
    for (const g of inputs.competitiveGaps || []) {
        if (g.quote) push({ id: `${g.id}.q`, text: g.quote, sourceName: g.source ? readableSourceName(g.source, g.pointer) : `Competitive analysis: ${g.competitor || 'peer'}`, kind: g.source ? 'competitive-evidence' : 'competitive-record', pointer: g.pointer });
    }
    return items;
}

// ---- prompt --------------------------------------------------------------------------------------

export interface PrdCompilerPrompt {
    system: string;
    user: string;
    digest: { personas: number; themes: number; journeyPains: number; competitiveGaps: number; evidenceItems: number };
}

const DRAFT_SCHEMA = `{
  "title": "action title: a complete sentence stating the judgment, under seventy characters",
  "thesis": { "statement": "two sentences: the user, the pain, the decision requested, what the product does", "user": "", "pain": "", "decisionRequested": "", "whatItDoes": "", "governingThemeId": "T-id" },
  "problem": { "story": { "user": "the user, in the world the evidence describes", "need": "what fails for that user today", "insight": "why it fails; never the product, the engagement or a document" }, "quotes": [ { "text": "VERBATIM from EVIDENCE", "evidenceId": "the EVIDENCE id", "attribution": "optional speaker/role" } ] },
  "whyNow": { "statement": "the external change that makes waiting costly for the user", "change": "the named market, regulatory, technology, institutional or user-behavior change; never a contract or a build plan", "quotes": [ QUOTE ] },
  "usersAndJobs": { "primaryPersonaIds": ["PE-id"], "jobStories": [ { "id": "JS-1", "personaId": "PE-id", "when": "situation", "iWantTo": "motivation", "soICan": "outcome", "journeyStage": "", "quotes": [ QUOTE ] } ] },
  "goalsNonGoalsAppetite": { "goals": [ { "text": "", "measurable": true } ], "nonGoals": [ { "text": "", "reason": "" } ], "appetite": { "value": 6, "unit": "weeks", "rationale": "qualitative" } },
  "pains": [ { "id": "P-1", "text": "", "kind": "pain|opportunity", "quotes": [ QUOTE ], "personaIds": ["PE-id"], "themeIds": ["T-id"], "journeyStage": "" } ],
  "competitiveGapQuotes": [ { "gapId": "CG-id", "quotes": [ QUOTE ] } ],
  "requirements": [ {
    "id": "R-1", "text": "singular, verifiable, an outcome not an implementation", "kind": "functional|non-functional",
    "proposedTier": "must|should|could|wont", "tierRationale": "", "mapsToThesis": true,
    "kano": "must-be|one-dimensional|attractive|indifferent|unknown", "cagansBar": true,
    "ledgerIds": ["SF-id", "FB-id"], "painIds": ["P-1"], "competitiveGapIds": ["CG-id"], "personaIds": ["PE-id"], "themeIds": ["T-id"],
    "target": { "metric": "", "value": 0, "unit": "", "baseline": "", "source_pointer": "the evidenceId the target rests on, or empty", "rationale": "qualitative: cites the evidence item named in source_pointer, or reads as the team's decision (We set ...)" },
    "bet": { "statement": "", "test": "", "conditionWhereAlternativeWins": "" },
    "acceptanceTests": [ { "id": "AT-1", "given": "", "when": "", "then": "", "target": { "metric": "", "value": 0, "unit": "" } } ]
  } ],
  "signals": [ { "id": "M-1", "signal": "event in tracking-plan vocabulary", "instrument": "", "population": { "personaId": "PE-id", "stage": "" }, "direction": "up|down|hold", "baselineStatus": "to be measured by [owner] by [date]", "type": "leading|lagging", "guardrail": { "statement": "", "rollbackAuthority": "" }, "requirementIds": ["R-1"] } ],
  "hypotheses": { "assumptions": [ { "id": "A-1", "text": "", "quadrant": "test-now|plan|monitor|defer", "test": "", "owner": "", "quotes": [ QUOTE ] } ] },
  "solutionFlows": { "flows": [ { "jobStoryId": "JS-1", "name": "", "steps": [""] } ], "screenStates": [ { "screen": "", "states": ["empty", "loading", "partial", "error", "conflict", "permission", "degraded provider"] } ], "businessRules": [""], "designLink": "" },
  "quality": { "characteristics": [ { "characteristic": "ISO/IEC 25010 name", "statement": "verifiable, qualitative", "target": { "metric": "", "value": 0, "unit": "" } } ], "accessibility": { "level": "WCAG 2.2 AA", "exposedCriteria": [""] }, "privacy": { "regime": "the privacy and compliance regime for this subject's jurisdiction and sector", "dataMinimization": "", "dpiaTrigger": { "triggered": false, "reason": "the privacy impact assessment trigger under that regime" } } },
  "risks": { "register": [ { "id": "RK-1", "failureMode": "", "likelihood": "low|medium|high", "severity": "low|medium|high", "earlySignal": "", "owner": "a role, or a person an EVIDENCE item names in that role", "mitigation": "" } ], "alternatives": [ { "option": "", "rejectedBecause": "", "tradeoff": "" } ] },
  "delivery": { "releaseCriteria": [""], "rollout": [ { "phase": "", "gate": "", "killCriteria": "", "rollbackAuthority": "" } ], "trackingPlan": [ { "event": "", "properties": [""], "owner": "" } ], "dependencies": [ { "name": "", "kind": "api|data|team|vendor|other", "owner": "" } ], "openQuestions": [ { "question": "", "owner": "", "due": "" } ], "accountableApprover": "" }
}`;

function buildSystem(): string {
    const sections = PRD_SECTION_ORDER.map((s, i) => `${i + 1}. ${s.label} (tier ${s.tier})`).join('\n');
    return [
        'You are a senior product manager writing a product requirements document that an engineer and a designer could start from without a clarifying meeting, and that an auditor could trace to its sources. You write about the SUBJECT the objective names, never about how to write the document.',
        '',
        'THE SHAPE: two tiers, twelve sections, one traceability graph.',
        sections,
        'Tier one is the one-page brief a partner reads in a quiet quarter hour. Tier two is the build spec engineering and design read in full.',
        '',
        'THE TRACEABILITY MODEL: Source -> Quote -> Root -> Requirement -> Acceptance test -> Signal. A requirement roots on any of: a client-stated item (SF id), a stakeholder feedback item (FB id), a pain, a competitive gap or a theme. Name every root that applies.',
        '- Every scope and feedback ledger item (SF, FB) is documented by at least one requirement that carries its id in `ledgerIds`. Only a requirement with no root of any kind is a bet: fill `bet` with the statement, the smallest test, and the condition under which the alternative wins.',
        '- Every pain names at least one quote. Every quote is VERBATIM text copied from the EVIDENCE block and carries that item\'s `evidenceId`. Never write a quote from memory. Never invent a source, author, publication or date; the system attaches the source from the evidence id.',
        '- Every requirement has at least one acceptance test written declaratively as Given / When / Then, each clause a complete sentence fragment, observable, no UI prescription.',
        '- Every signal points back to at least one requirement id. At least one leading and one lagging signal.',
        '',
        'PROBLEM AND WHY NOW ARE ABOUT THE USER AND THE SUBJECT: the problem story names the user, the situation and what fails for that user today, in the world the evidence describes. It never names the product being specified, the engagement, the vendor, a contract, a statement of work or a design document, and it never describes the solution. Why now names the external change (market, regulation, technology, institutional policy, user behavior) that makes waiting costly, carried by a quote; "the client signed a contract" or "the team is consolidating systems" is a build plan, not a why-now.',
        '',
        'PRIORITIZATION IS DERIVED, NOT TYPED: you propose a tier (`proposedTier`) and fill the evidence columns honestly (`mapsToThesis`, `kano` as read from the corpus, `cagansBar`, the pain and persona ids). The system assigns the final tier from those columns. MUST-HAVE IS RARE: propose must for at most a third of the requirements, only where the product cannot ship to the primary persona without it and two independent origins stand behind it. The system enforces the cap and demotes the must-haves with the thinnest evidence.',
        '',
        'SINGULAR: one outcome per requirement and one observable event per signal. A requirement that joins two outcomes ("shows the status and records the reason") is two requirements; split it and give each its own acceptance test. The system flags compound requirements and signals in its compile report.',
        '',
        'THE NUMBER RULE: a number describing the world appears only inside a verbatim quote. A number that is a design decision (a latency bound, an accessibility level, a rollout share, the appetite in weeks) appears ONLY inside a `target` object with metric, value, unit and a qualitative rationale. No other field carries a digit except standard names (WCAG 2.2, ISO/IEC 25010) and ids.',
        '',
        'TARGET RATIONALE: every target rationale either rests on evidence, with that item\'s evidenceId in `target.source_pointer`, or reads as the team\'s own decision ("We set this bound because ..."). Never attribute a target to a document ("the brief sets", "the contract requires") unless that document is an EVIDENCE item and its evidenceId is in `source_pointer`.',
        '',
        'PRIVACY AND COMPLIANCE: put the regime that applies to the subject\'s jurisdiction and sector in `quality.privacy.regime`, derived from the objective and the evidence: student education records at a United States institution fall under FERPA plus the applicable state privacy law; United States patient data under HIPAA; personal data of people in the European Union under GDPR, in the United Kingdom under UK GDPR. Never default to GDPR. When the evidence does not establish the jurisdiction, name the sector regime and add an open question for legal review, owned by a role.',
        '',
        'PEOPLE: name a person (an owner, an approver, a rollback authority, a baseline owner) only when an EVIDENCE item names that person; otherwise write the role ("Director of Operations", "product owner"). The system replaces a name that no evidence item carries with its role.',
        '',
        'EVIDENCE HIERARCHY: prefer primary evidence (client documents, articles, interview transcripts, social posts) over derived synthesis items (sources labelled "Engagement research synthesis"). When the same verbatim text appears in both, cite the primary item\'s evidenceId. The system re-points a synthesis quote to a primary item that carries the same text.',
        '',
        'SUCCESS SIGNALS carry seven fields each: the observable event, the instrument, the population (persona id and stage), the direction, the baseline status ("to be measured by [owner] by [date]"), the type (leading or lagging), and a guardrail with its rollback authority. Targets are set at a named post-baseline event, never here.',
        '',
        'WRITING RULES (hard): every title is a complete sentence stating a judgment, plain and literal, no metaphor. Name the actor in every sentence. No greeting, no narration of the document, no reference to the research process, no note about missing evidence: narrow a section to what the quotes support. No em-dash character anywhere; use a comma, a colon or a period. Plain text only, no markdown.',
        '',
        'OUTPUT: one JSON object matching the schema below. No preamble, no code fence. Where the evidence does not support a field, leave it an empty string or empty array; never pad.',
        '',
        DRAFT_SCHEMA,
    ].join('\n');
}

function fmtRef(label: string, lines: string[]): string {
    return lines.length ? `${label}\n${lines.join('\n')}` : `${label}\n(none provided)`;
}

export function buildPrdCompilerPrompt(inputs: PrdCompilerInputs): PrdCompilerPrompt {
    const missing: string[] = [];
    const painRoots = (inputs.personas || []).some(p => p.painPoints?.length) || (inputs.journeyPains || []).length > 0 || (inputs.themes || []).length > 0;
    if (!painRoots && !(inputs.competitiveGaps || []).length) missing.push('pain roots (personas with pain points, journey pains or themes) or competitive gaps');
    if (!(inputs.personas || []).length) missing.push('approved personas');
    const evidence = flattenEvidence(inputs);
    if (!evidence.length) missing.push('evidence items (chunks or quotes) to quote verbatim from');
    if (missing.length) throw new PrdInputsError(missing);

    const personas = (inputs.personas || []).map(p => {
        const pains = p.painPoints.map((pp, i) => `    - pain: ${pp.text}${pp.quote ? ` [evidenceId ${p.id}.pain.${i}]` : ''}`).join('\n');
        return `- ${p.id} | ${p.name}${p.role ? ` | ${p.role}` : ''}${p.primary ? ' | PRIMARY' : ''}${p.stageOfStruggle ? ` | stage of struggle: ${p.stageOfStruggle}` : ''}\n${pains}`;
    });
    const themes = (inputs.themes || []).map(t => `- ${t.id} | ${t.name}${t.insight ? ` | ${t.insight}` : ''} | quotes: ${t.quotes.map((_, i) => `${t.id}.q.${i}`).join(', ') || 'none'}`);
    const journey = (inputs.journeyPains || []).map(j => `- ${j.id} | stage ${j.stage} | ${j.text}${j.quote ? ` [evidenceId ${j.id}.q]` : ''}${j.personaIds?.length ? ` | personas ${j.personaIds.join(', ')}` : ''}`);
    const gaps = (inputs.competitiveGaps || []).map(g => `- ${g.id} | ${g.competitor ? `${g.competitor}: ` : ''}${g.text}${g.quote ? ` [evidenceId ${g.id}.q]` : ''}`);
    const ev = evidence.map(e => `[${e.id}] (${e.sourceName}${e.date ? `, ${e.date}` : ''}) ${e.text.replace(/\s+/g, ' ')}`);

    const user = [
        `OBJECTIVE: ${inputs.objective}`,
        inputs.decisionToSupport ? `DECISION TO SUPPORT: ${inputs.decisionToSupport}` : '',
        inputs.audience ? `AUDIENCE: ${inputs.audience}` : '',
        inputs.appetiteHint ? `APPETITE HINT: ${inputs.appetiteHint} (express it as the appetite target)` : '',
        '',
        fmtRef('APPROVED PERSONAS (PE). Reference by id; primary personas are marked.', personas),
        '',
        fmtRef('APPROVED THEMES (T). Reference by id.', themes),
        '',
        fmtRef('JOURNEY PAIN POINTS (JP). Each may become a pain (P) that cites its evidence id.', journey),
        '',
        fmtRef('COMPETITIVE GAPS (CG). Reference by id as a requirement root.', gaps),
        '',
        'EVIDENCE. Quote VERBATIM from these items only and carry the bracketed id as `evidenceId`:',
        ...ev,
        '',
        'Write the PRD for this objective as one JSON object.',
    ].filter(l => l !== undefined).join('\n');

    return {
        system: buildSystem(),
        user,
        digest: { personas: (inputs.personas || []).length, themes: (inputs.themes || []).length, journeyPains: (inputs.journeyPains || []).length, competitiveGaps: (inputs.competitiveGaps || []).length, evidenceItems: evidence.length },
    };
}

// ---- parse + provenance lock ---------------------------------------------------------------------

export interface PrdCompileReport {
    droppedQuotes: Array<{ text: string; evidenceId?: string; reason: string }>;
    hypothesisRequirementIds: string[];
    tierChanges: Array<{ id: string; from: PrdTier; to: PrdTier }>;
    validation: PrdAirValidation;
    parseWarnings: string[];
    /** B3: requirements and signals that join two outcomes ("X and Y"); each should be split. */
    singularityFlags: Array<{ id: string; kind: 'requirement' | 'signal'; text: string; joint: string }>;
    /** B1: problem / why-now fields that name the product, the engagement, a contract or a document. */
    problemNamesSolution: Array<{ field: string; match: string }>;
    /** B4: target rationales that credited a document with no pointer, restated as the team's decision. */
    rationalesRestated: Array<{ path: string; was: string }>;
    /** B4: target rationales that credited a document the evidence holds, now bound to that document's pointer. */
    rationalesSourced: Array<{ path: string; pointer: string }>;
    /** B6: person names no evidence item carries, replaced by the role. */
    namesReplacedByRole: Array<{ path: string; name: string; role: string }>;
    /** B7: derived-synthesis quotes re-pointed to a primary chunk with the same verbatim text. */
    repointedToPrimary: Array<{ from: string; to: string }>;
    /** B5: how the privacy regime was set: by the model, derived from objective + evidence, or left empty. */
    privacyRegime: { value: string; origin: 'model' | 'derived' | 'none'; warning?: string };
    /** Scope and feedback coverage over the final record (requirements x ledger). */
    coverage?: PrdLedgerCoverage;
    /** Set by `compilePrdFromLedger`: the per-area passes, gap fills and fallbacks. */
    passes?: PrdPassReport;
    /** The deterministic rule registry's receipt (services/deliverableRules.ts), also stored on the record. */
    receipt?: DeliverableReceipt;
}
export interface PrdCompileResult {
    air: PrdAir;
    report: PrdCompileReport;
}

export function extractJsonObject(raw: string): any {
    let s = String(raw || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try { return JSON.parse(s); } catch { /* fall through */ }
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
        const slice = s.slice(start, end + 1);
        try { return JSON.parse(slice); } catch { /* fall through */ }
    }
    // Name the actual defect: a reply that opens an object but never closes it was cut off at the
    // output limit (the 2026-10-01 live compile), which is a different fix from a prose reply.
    const opens = s.indexOf('{');
    if (opens >= 0 && (s.lastIndexOf('}') < opens || !s.trimEnd().endsWith('}'))) {
        throw new Error(`prdCompiler: model output is a truncated JSON object (${s.length} chars; the reply stopped before the closing brace)`);
    }
    throw new Error('prdCompiler: model output is not a JSON object');
}

function norm(s: string): string {
    return String(s || '')
        .replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/…/g, '...')
        .replace(/[\u2013\u2014]/g, '-')
        .toLowerCase().replace(/[^a-z0-9'"$%.,:;!?()\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strict verbatim: the whole normalized quote is a substring (no prefix tolerance). Used to re-point. */
function quoteIsVerbatimStrict(quote: string, evidenceText: string): boolean {
    const q = norm(quote).replace(/\.\.\.$/, '').replace(/^"|"$/g, '').trim();
    return q.length >= 12 && norm(evidenceText).includes(q);
}

/** Verbatim check: the normalized quote (minus a trailing ellipsis) must be a substring of the evidence text. */
export function quoteIsVerbatim(quote: string, evidenceText: string): boolean {
    const q = norm(quote).replace(/\.\.\.$/, '').replace(/^"|"$/g, '').trim();
    if (q.length < 12) return false;
    const e = norm(evidenceText);
    if (e.includes(q)) return true;
    // model truncation tolerance: a long quote whose first fifty normalized characters match
    return q.length >= 60 && e.includes(q.slice(0, 50));
}

interface QuoteDraft { text?: string; evidenceId?: string; attribution?: string }

class ProvenanceLock {
    private sources = new Map<string, PrdSource>();
    private quotes: PrdQuote[] = [];
    private qn = 0;
    private sn = 0;
    readonly dropped: PrdCompileReport['droppedQuotes'] = [];
    /** Quotes whose manifest pointer was recovered from a second evidence item that carries the same verbatim text. */
    readonly recoveredPointers: Array<{ quoteId: string; from: string; pointer: string }> = [];
    /**
     * `evidence` is the table the model saw (chunk text clipped to the prompt budget). `pointerItems` are the
     * same chunks at FULL length plus every quote item that carries a manifest pointer: the recovery set.
     */
    constructor(private evidence: EvidenceItem[], private pointerItems: EvidenceItem[] = evidence.filter(e => !!e.pointer)) {}

    /**
     * Provenance recovery (2026-10-01 live replay): a persona or journey quote the model cites by its root id
     * (`P1.pain.0`, `J3.q`) is the same verbatim text as a theme quote or a grounding chunk that DOES carry a
     * manifest pointer, but the root item itself lost the pointer upstream. The system re-derives the pointer by
     * the same verbatim test the lock already applies; the model never supplies it. A quote found in no
     * pointer-carrying item keeps its evidence id and renders without a citation.
     */
    private withPointer(hit: EvidenceItem, text: string): EvidenceItem {
        // EVIDENCE HIERARCHY (B7): a quote located in a derived synthesis page (or in an item with no pointer)
        // is re-pointed to a PRIMARY chunk that carries the same verbatim text, when one is in the evidence set.
        // The re-point needs the full quote, not the truncation-tolerant prefix: the gate will verify it.
        if (hit.pointer && !isDerivedEvidence(hit)) return hit;
        const primary = this.pointerItems.find(e => e.pointer && !isDerivedEvidence(e) && quoteIsVerbatimStrict(text, e.text));
        if (primary) {
            if (hit.pointer && isDerivedEvidence(hit)) this.repointedToPrimary.push({ from: hit.pointer, to: primary.pointer! });
            return primary;
        }
        if (hit.pointer) return hit;
        const alt = this.pointerItems.find(e => e.pointer && quoteIsVerbatim(text, e.text));
        return alt || hit;
    }
    /** Derived-synthesis quotes moved to a primary chunk carrying the same text. */
    readonly repointedToPrimary: Array<{ from: string; to: string }> = [];

    private sourceFor(e: EvidenceItem): PrdSource {
        // One source per page AND name: an aggregate upload page holds several documents, and a quote from the
        // second must not be attributed to the first (independence still collapses by page in prdAir).
        const key = `${e.pointer ? e.pointer.replace(/#c\d+$/i, '') : ''}|${e.sourceName.toLowerCase()}`;
        let s = this.sources.get(key);
        if (!s) {
            s = { id: `S-${++this.sn}`, name: e.sourceName, kind: e.kind, pointer: e.pointer ? e.pointer.replace(/#c\d+$/i, '') : undefined, url: e.url, date: e.date };
            this.sources.set(key, s);
        }
        return s;
    }

    /** Verify and register a quote; returns its Q id or null when dropped. */
    admit(d: QuoteDraft | string | null | undefined): string | null {
        const text = typeof d === 'string' ? d : String(d?.text || '');
        const evidenceId = typeof d === 'string' ? undefined : d?.evidenceId;
        if (!text.trim()) return null;
        let hit = evidenceId ? this.evidence.find(e => e.id === evidenceId && quoteIsVerbatim(text, e.text)) : undefined;
        if (!hit) hit = this.evidence.find(e => quoteIsVerbatim(text, e.text));
        if (!hit) {
            this.dropped.push({ text, evidenceId, reason: evidenceId ? 'quote is not verbatim in the cited evidence item' : 'quote matches no evidence item' });
            return null;
        }
        const located = this.withPointer(hit, text);
        const existing = this.quotes.find(q => q.text === text.trim() && q.pointer === (located.pointer || located.id));
        if (existing) return existing.id;
        const s = this.sourceFor(located);
        const q: PrdQuote = { id: `Q-${++this.qn}`, text: text.trim(), sourceId: s.id, pointer: located.pointer || located.id, attribution: typeof d === 'string' ? undefined : (str(d?.attribution) || undefined) };
        if (located !== hit) this.recoveredPointers.push({ quoteId: q.id, from: hit.id, pointer: located.pointer! });
        this.quotes.push(q);
        return q.id;
    }
    admitAll(arr: any): string[] {
        return (Array.isArray(arr) ? arr : []).map(x => this.admit(x)).filter((x): x is string => !!x);
    }
    get allSources(): PrdSource[] { return [...this.sources.values()]; }
    get allQuotes(): PrdQuote[] { return this.quotes; }
}

const TIERS: PrdTier[] = ['must', 'should', 'could', 'wont'];
const KANO: PrdKanoType[] = ['must-be', 'one-dimensional', 'attractive', 'indifferent', 'unknown'];
const str = (v: any): string => (v == null ? '' : String(v)).trim();
const arrStr = (v: any): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const pick = <T extends string>(v: any, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(str(v)) ? (str(v) as T) : fallback;

function toTarget(v: any, defaultMetric: string): RequirementTarget | undefined {
    if (!v || typeof v !== 'object') return undefined;
    if (isRequirementTarget(v)) return v;
    const value = v.value;
    if (value == null || str(value) === '') return undefined;
    // The schema's placeholder ({ metric: "", value: 0, unit: "" }) is not a design decision: a target
    // needs a named metric or a unit, or it renders as "acceptance: 0".
    if (!str(v.metric) && !str(v.unit)) return undefined;
    return makeRequirementTarget(str(v.metric) || defaultMetric, typeof value === 'number' ? value : str(value), str(v.unit), {
        baseline: str(v.baseline) || undefined,
        source_pointer: str(v.source_pointer || v.sourcePointer) || undefined,
        rationale: str(v.rationale) || undefined,
    });
}

/** Full-length grounding chunks plus every pointer-carrying evidence item: the set a lost pointer is recovered from. */
function pointerRecoveryItems(inputs: PrdCompilerInputs, evidence: EvidenceItem[]): EvidenceItem[] {
    const full = flattenEvidence({ ...inputs, maxChunkChars: Number.MAX_SAFE_INTEGER, maxChunks: Number.MAX_SAFE_INTEGER, personas: [], themes: [], journeyPains: [], competitiveGaps: [] });
    const seen = new Set<string>();
    const out: EvidenceItem[] = [];
    for (const e of [...full, ...evidence]) {
        if (!e.pointer || !POINTER_RE.test(e.pointer) || seen.has(e.id)) continue;
        seen.add(e.id);
        out.push(e);
    }
    return out;
}

/**
 * Model prose normalizers. They change form, never meaning: the clause keywords the projection adds
 * itself, the persona restated inside a job-story clause, an id parenthetical a reader cannot resolve.
 */
const CLAUSE_LEAD_RE: Record<'given' | 'when' | 'then', RegExp> = { given: /^given\s+/i, when: /^when\s+/i, then: /^then\s+/i };
function clause(v: any, kind: 'given' | 'when' | 'then'): string {
    return str(v).replace(CLAUSE_LEAD_RE[kind], '').replace(/[.;,\s]+$/, '').trim();
}
function lowerLeadArticle(t: string): string {
    return t.replace(/^(The|A|An)\b/, m => m.toLowerCase());
}
/** "When <situation>": drop the keyword and the closing period; a leading article reads mid-sentence. */
function jobWhen(v: any): string {
    return lowerLeadArticle(str(v).replace(/^when\s+/i, '').replace(/[.;,\s]+$/, ''));
}
/** "I want to <motivation>": drop a restated actor ("The student wants to", "I want to"). */
function jobWant(v: any): string {
    const t = str(v).replace(/[.;,\s]+$/, '');
    const withTo = t.replace(/^(?:i\s+want\s+to|(?:the|a|an)\s+[\w' -]{1,60}?\s+wants?\s+to)\s+/i, '');
    if (withTo !== t) return withTo;
    // "The student wants an answer ..." (a noun object): the Klement clause reads "I want to get an answer ...".
    const noun = t.replace(/^(?:i\s+want|(?:the|a|an)\s+[\w' -]{1,60}?\s+wants?)\s+(?!to\b)/i, '');
    return noun !== t ? `get ${noun}` : t;
}
/** "so I can <outcome>": drop "so", a restated actor and "can". */
function jobOutcome(v: any): string {
    return str(v).replace(/^so\s+/i, '').replace(/^(?:i|they|he|she|we|(?:the|a|an)\s+[\w' -]{1,60}?)\s+(?:can|could|will be able to|is able to|are able to)\s+/i, '').replace(/[.;,\s]+$/, '');
}

/**
 * Strip parentheticals that hold nothing but graph ids ("(P1)", "(R-2, R-4)"): the reader cannot resolve
 * an id, and a bare "1" inside one reads as a naked number. Ids stay in the typed id fields.
 */
function stripIdParentheticals(text: string, ids: Set<string>): string {
    return text.replace(/\s*\(([^()]{1,80})\)/g, (m, inner: string) => {
        const parts = inner.split(/\s*[,;/]\s*|\s+and\s+/).map(x => x.trim()).filter(Boolean);
        return parts.length && parts.every(x => ids.has(x)) ? '' : m;
    }).replace(/\s+([.,;:])/g, '$1');
}
const ID_FIELD_KEY_RE = /^(id|ids|sourceId|requirementId|personaId|themeId|jobStoryId|governingThemeId|pointer|url|source_pointer|date|kind|level)$|Ids$/;
function scrubIdParentheticals(node: any, ids: Set<string>, skipQuoteText = false): void {
    if (!node || typeof node !== 'object') return;
    if (isRequirementTarget(node)) return;
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            if (typeof node[i] === 'string') node[i] = stripIdParentheticals(node[i], ids);
            else scrubIdParentheticals(node[i], ids, skipQuoteText);
        }
        return;
    }
    for (const [k, v] of Object.entries(node)) {
        if (ID_FIELD_KEY_RE.test(k)) continue;
        if (skipQuoteText && k === 'text') continue;
        if (typeof v === 'string') (node as any)[k] = stripIdParentheticals(v, ids);
        else scrubIdParentheticals(v, ids, skipQuoteText);
    }
}

/**
 * A theme reference carries the approved theme's NAME and, when present, its insight. The insight is a
 * cached synthesis summary, not verbatim source text, so a figure inside it cannot be carried as a quote
 * (.claude/CLAUDE.md, Quantitative Claim Rule: numbers live only inside a verbatim, attributed quote).
 * The insight is narrowed to its sentences that carry no naked number; the figure stays with its source,
 * reachable through the theme's own verified quotes.
 */
function narrowInsight(insight: string | undefined): string | undefined {
    const t = str(insight);
    if (!t) return undefined;
    // Drop inline manifest pointers first: they are provenance, not prose, and they carry digits.
    const clean = t.replace(/\s*\[[^\]]*\.md(?:#c\d+)?[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
    const sentences = clean.match(/[^.!?]+(?:[.!?]+|$)/g) || [clean];
    const kept = sentences.map(x => x.trim()).filter(x => x && !hasNakedNumber(x));
    const out = kept.join(' ').trim();
    return out || undefined;
}

// ---- deterministic content checks (B1, B3, B4, B5, B6) -------------------------------------------

/**
 * B3, ISO/IEC/IEEE 29148 singularity: a requirement or a signal that joins a second outcome with "and" plus
 * a verb ("resolves each student to one record and takes each field from ..."). Lists of nouns ("clubs,
 * courses and Experiential Network opportunities") do not match: the joined word must read as a verb
 * followed by its object.
 */
const COMPOUND_OUTCOME_RE = /(?:,\s*|\s)and\s+(?:then\s+|also\s+)?([a-z]+(?:s|es))\s+(?:each|every|a|an|the|its|their|any|all|one|that|it|them|to|whether|why|how|when)\b/;
export function compoundOutcome(text: string): string | null {
    const t = String(text || '');
    // Two tracking events joined into one signal ("status_viewed and application_recorded").
    const ev = /\b[a-z]+(?:_[a-z]+)+\s+(?:and|or)\s+[a-z]+(?:_[a-z]+)+\b/.exec(t);
    if (ev) return ev[0];
    const m = COMPOUND_OUTCOME_RE.exec(t);
    return m ? m[0].trim() : null;
}

/** B1: what a problem or why-now must never name: the solution, the engagement, a contract or a design document. */
const SOLUTION_LEAK_RE = /\b(?:statement of work|contract(?:ed|s)?|engagement|vendor|design document|solution design|the (?:product|platform|solution|tool|app|hub)|this (?:product|release|PRD|document)|first phase|phase one|go-live)\b/i;

/** B4: a rationale that credits a document ("the brief sets", "per the contract"). */
const DOC_ATTRIBUTION_RE = /\b(?:contract(?:ed|ual)?|statement of work|(?:the|product|project|design) brief|the charter|the RFP|the proposal)\b|\b(?:(?:the|per the|as the|according to the)\s+)?(?:brief|statement of work|contract|charter|RFP|proposal|scope document|design document|engagement|client)\s+(?:sets?|says|requires?|specif(?:ies|y)|defines?|fix(?:es)?|calls? for|mandates?|commits?|states?)\b/i;

/** B6: "Firstname Lastname, Role" inside an owner-like field. */
const NAME_WITH_ROLE_RE = /\b([A-Z][a-z]+(?:[ '-][A-Z][a-z]+){1,2}),\s+([^,;()]{3,80})/g;

/**
 * B5: the privacy regime from the objective and the evidence, when the model left it empty. Sector from
 * the subject's vocabulary, jurisdiction from source URLs (.edu, .gov, .ac.uk, an EU country domain) and
 * explicit place words. Returns '' when either is unclear: no regime is better than a wrong one.
 */
export function inferPrivacyRegime(objective: string, evidence: Array<{ text?: string; url?: string; sourceName?: string }>): string {
    const urls = evidence.map(e => String(e.url || '')).join(' ').toLowerCase();
    const text = `${objective} ${evidence.slice(0, 80).map(e => `${e.sourceName || ''} ${String(e.text || '').slice(0, 400)}`).join(' ')}`;
    const education = /\b(universit(?:y|ies)|college|student records?|students?|registrar|campus|higher ed(?:ucation)?|school district|K-12)\b/i.test(objective);
    const health = /\b(patients?|clinic(?:al)?|hospital|health ?care|provider network|payer|EHR|medical record)\b/i.test(objective);
    const us = /\.(?:edu|gov|us)\b/.test(urls) || /\b(United States|U\.S\.|USA|Massachusetts|California|New York|Texas|federal financial aid|Title IV)\b/.test(text);
    const eu = /\.(?:eu|de|fr|nl|ie|es|it|se|dk|fi|be|at|pt|pl)\b/.test(urls) || /\b(European Union|EU member|GDPR)\b/.test(objective);
    const uk = /\.(?:ac\.uk|gov\.uk|co\.uk|nhs\.uk)\b/.test(urls) || /\b(United Kingdom|UK GDPR)\b/.test(objective);
    if (education && us && !eu && !uk) return 'FERPA (student education records), plus the privacy and breach-notification law of each state where students reside';
    if (health && us && !eu && !uk) return 'HIPAA (protected health information), plus applicable state health privacy law';
    if (uk && !eu) return 'UK GDPR and the Data Protection Act 2018';
    if (eu && !us) return 'GDPR';
    return '';
}

function walkStrings(node: any, path: string, fn: (s: string, path: string) => string | void): void {
    if (!node || typeof node !== 'object' || isRequirementTarget(node)) return;
    for (const [k, v] of Object.entries(node)) {
        const p = path ? `${path}.${k}` : k;
        if (typeof v === 'string') { const r = fn(v, p); if (typeof r === 'string') (node as any)[k] = r; }
        else walkStrings(v, p, fn);
    }
}

export function compilePrdAir(rawModelText: string, inputs: PrdCompilerInputs): PrdCompileResult {
    const draft = extractJsonObject(rawModelText);
    // The theme-quote cap trims the PROMPT; the lock verifies against every quote the inputs carry.
    const evidence = flattenEvidence({ ...inputs, maxThemeQuotes: Number.MAX_SAFE_INTEGER });
    const lock = new ProvenanceLock(evidence, pointerRecoveryItems(inputs, evidence));
    const warnings: string[] = [];

    const air = createPrdAir({
        artifactId: inputs.artifactId, runId: inputs.runId, objective: inputs.objective,
        title: str(draft.title) || 'Product requirements', brand: inputs.brand,
    });
    const g = air.graph;
    const s = air.sections;

    // Reference nodes come from the INPUTS (typed AIR references), never from the model.
    g.personas = (inputs.personas || []).map(p => ({ id: p.id, name: p.name, role: p.role, primary: !!p.primary, stageOfStruggle: p.stageOfStruggle }));
    g.themes = (inputs.themes || []).map(t => ({ id: t.id, name: t.name, insight: narrowInsight(t.insight), ...(t.sentiment ? { sentiment: t.sentiment } : {}), ...(t.category ? { category: t.category } : {}) }));
    const personaIds = new Set(g.personas.map(p => p.id));
    const themeIds = new Set(g.themes.map(t => t.id));
    const gapQuoteDrafts = new Map<string, any[]>();
    for (const gq of Array.isArray(draft.competitiveGapQuotes) ? draft.competitiveGapQuotes : []) gapQuoteDrafts.set(str(gq?.gapId), gq?.quotes);
    g.competitiveGaps = (inputs.competitiveGaps || []).map(cg => {
        const own = cg.quote ? lock.admitAll([{ text: cg.quote, evidenceId: `${cg.id}.q` }]) : [];
        return { id: cg.id, text: cg.text, competitor: cg.competitor, quoteIds: [...own, ...lock.admitAll(gapQuoteDrafts.get(cg.id))] };
    });
    const gapIds = new Set(g.competitiveGaps.map(c => c.id));

    // Tier-one sections.
    const th = draft.thesis || {};
    s.thesis = { statement: str(th.statement), user: str(th.user), pain: str(th.pain), decisionRequested: str(th.decisionRequested || inputs.decisionToSupport), whatItDoes: str(th.whatItDoes), governingThemeId: themeIds.has(str(th.governingThemeId)) ? str(th.governingThemeId) : undefined };
    const pr = draft.problem || {};
    s.problem = { story: { user: str(pr.story?.user), need: str(pr.story?.need), insight: str(pr.story?.insight) }, quoteIds: lock.admitAll(pr.quotes) };
    const wn = draft.whyNow || {};
    s.whyNow = { statement: str(wn.statement), change: str(wn.change), quoteIds: lock.admitAll(wn.quotes) };
    const uj = draft.usersAndJobs || {};
    const primaries = arrStr(uj.primaryPersonaIds).filter(id => personaIds.has(id));
    if (!primaries.length) {
        const fallback = g.personas.filter(p => p.primary).map(p => p.id).slice(0, 2);
        if (fallback.length) { primaries.push(...fallback); warnings.push('model named no valid primary persona; inputs\' primary personas used'); }
    }
    for (const p of g.personas) if (primaries.includes(p.id)) p.primary = true;
    s.usersAndJobs = {
        primaryPersonaIds: primaries.slice(0, 2),
        jobStories: (Array.isArray(uj.jobStories) ? uj.jobStories : []).map((j: any, i: number) => ({
            id: str(j.id) || `JS-${i + 1}`, personaId: personaIds.has(str(j.personaId)) ? str(j.personaId) : (primaries[0] || ''),
            when: jobWhen(j.when), iWantTo: jobWant(j.iWantTo), soICan: jobOutcome(j.soICan), journeyStage: str(j.journeyStage) || undefined, quoteIds: lock.admitAll(j.quotes),
        })).filter((j: any) => j.when && j.iWantTo),
    };
    const gn = draft.goalsNonGoalsAppetite || {};
    const appetite = toTarget(gn.appetite, 'appetite') || makeRequirementTarget('appetite', str(inputs.appetiteHint), 'weeks');
    s.goalsNonGoalsAppetite = {
        goals: (Array.isArray(gn.goals) ? gn.goals : []).map((x: any) => ({ text: str(x?.text ?? x), measurable: !!x?.measurable })).filter((x: any) => x.text),
        nonGoals: (Array.isArray(gn.nonGoals) ? gn.nonGoals : []).map((x: any) => ({ text: str(x?.text ?? x), reason: str(x?.reason) })).filter((x: any) => x.text),
        appetite: { ...appetite, kind: 'requirement_target', metric: appetite.metric || 'appetite' },
    };

    // Pains (P) with their verified quotes.
    g.pains = (Array.isArray(draft.pains) ? draft.pains : []).map((p: any, i: number): PrdPain => ({
        id: str(p.id) || `P-${i + 1}`, text: str(p.text), kind: str(p.kind) === 'opportunity' ? 'opportunity' : 'pain',
        quoteIds: lock.admitAll(p.quotes),
        personaIds: arrStr(p.personaIds).filter(id => personaIds.has(id)),
        themeIds: arrStr(p.themeIds).filter(id => themeIds.has(id)),
        journeyStage: str(p.journeyStage) || undefined,
    })).filter((p: PrdPain) => p.text);
    const unquotedPains = g.pains.filter(p => p.quoteIds.length === 0).map(p => p.id);
    if (unquotedPains.length) warnings.push(`pains dropped for lacking a verified quote: ${unquotedPains.join(', ')}`);
    g.pains = g.pains.filter(p => p.quoteIds.length > 0);
    const painIds = new Set(g.pains.map(p => p.id));

    // Scope and feedback ledger (2026-10-02): the items are system records (provenance-locked at extraction);
    // their primary quote is admitted through the same lock so the source and pointer land in the graph.
    g.areas = (inputs.areas || []).map(a => ({ ...a }));
    g.ledger = (inputs.ledger || []).map(li => ({ ...li, sources: [...(li.sources || [])], quoteId: lock.admit({ text: li.quote, evidenceId: `${li.id}.s0` }) || undefined }));
    const ledgerIdSet = new Set(g.ledger.map(l => l.id));

    // Input pain roots (persona pain points `PE.pain.i`, journey pains `J1.2`) referenced by requirements become
    // graph pains carrying their verified quote; a root whose quote cannot be verified is not a pain.
    const reqDrafts: any[] = Array.isArray(draft.requirements) ? draft.requirements : [];
    const inputPains = new Map<string, { text: string; evidenceId: string; quote?: string; personaIds: string[]; stage?: string }>();
    for (const p of inputs.personas || []) p.painPoints.forEach((pp, i) => inputPains.set(`${p.id}.pain.${i}`, { text: pp.text, evidenceId: `${p.id}.pain.${i}`, quote: pp.quote, personaIds: [p.id] }));
    for (const j of inputs.journeyPains || []) inputPains.set(j.id, { text: j.text, evidenceId: `${j.id}.q`, quote: j.quote, personaIds: j.personaIds || [], stage: j.stage });
    for (const pid of new Set(reqDrafts.flatMap((r: any) => arrStr(r?.painIds)))) {
        if (painIds.has(pid)) continue;
        const ip = inputPains.get(pid);
        if (!ip || !ip.quote) continue;
        const qid = lock.admit({ text: ip.quote, evidenceId: ip.evidenceId });
        if (!qid) continue;
        g.pains.push({ id: pid, text: ip.text, kind: 'pain', quoteIds: [qid], personaIds: ip.personaIds.filter(x => personaIds.has(x)), themeIds: [], journeyStage: ip.stage });
        painIds.add(pid);
    }

    // Requirements (R) + acceptance tests (AT).
    let atCounter = 0;
    g.requirements = reqDrafts.map((r: any, i: number): PrdRequirement => {
        const id = str(r.id) || `R-${i + 1}`;
        const tests: PrdAcceptanceTest[] = (Array.isArray(r.acceptanceTests) ? r.acceptanceTests : []).map((t: any) => ({
            // Acceptance-test ids are document-wide and sequential (AT-1..AT-n). The model numbers each
            // requirement's tests from AT-1, which made ids collide across requirements (2026-10-02).
            id: `AT-${++atCounter}`, requirementId: id,
            given: clause(t.given, 'given'), when: clause(t.when, 'when'), then: clause(t.then, 'then'), target: toTarget(t.target, 'acceptance'),
        })).filter((t: PrdAcceptanceTest) => t.given && t.when && t.then);
        g.acceptanceTests.push(...tests);
        const proposed = pick(r.proposedTier ?? r.tier, TIERS, 'should');
        const bet = r.bet && typeof r.bet === 'object' && str(r.bet.statement) ? { statement: str(r.bet.statement), test: str(r.bet.test), conditionWhereAlternativeWins: str(r.bet.conditionWhereAlternativeWins) } : undefined;
        return {
            id, text: str(r.text), kind: str(r.kind) === 'non-functional' ? 'non-functional' : 'functional',
            tier: proposed, proposedTier: proposed, tierRationale: str(r.tierRationale),
            claimType: bet ? 'HYPOTHESIS' : 'DEFENSIBLE_INFERENCE',
            mapsToThesis: !!r.mapsToThesis, kano: pick(r.kano, KANO, 'unknown'), cagansBar: !!r.cagansBar,
            painIds: arrStr(r.painIds).filter(x => painIds.has(x)),
            competitiveGapIds: arrStr(r.competitiveGapIds).filter(x => gapIds.has(x)),
            personaIds: arrStr(r.personaIds).filter(x => personaIds.has(x)),
            themeIds: arrStr(r.themeIds).filter(x => themeIds.has(x)),
            acceptanceTestIds: tests.map(t => t.id), signalIds: [],
            target: toTarget(r.target, 'requirement'), bet,
            ledgerIds: arrStr(r.ledgerIds).filter(x => ledgerIdSet.has(x)),
            origin: (['area-pass', 'gap-fill', 'research-pass', 'fallback', 'model'] as PrdRequirementOrigin[]).includes(str(r.origin) as PrdRequirementOrigin) ? str(r.origin) as PrdRequirementOrigin : 'model',
            notes: str(r.notes) || undefined,
        };
    }).filter((r: PrdRequirement) => r.text);
    const reqIds = new Set(g.requirements.map(r => r.id));
    // A requirement whose pains all carry a persona inherits those personas when it named none.
    for (const r of g.requirements) {
        if (!r.personaIds.length) {
            const inherited = new Set<string>();
            for (const pid of r.painIds) for (const pe of g.pains.find(p => p.id === pid)?.personaIds || []) inherited.add(pe);
            r.personaIds = [...inherited];
        }
        if (!r.themeIds.length) {
            const inherited = new Set<string>();
            for (const pid of r.painIds) for (const t of g.pains.find(p => p.id === pid)?.themeIds || []) inherited.add(t);
            r.themeIds = [...inherited];
        }
    }
    s.requirements = { requirementIds: g.requirements.map(r => r.id) };

    // Signals (M).
    g.signals = (Array.isArray(draft.signals) ? draft.signals : []).map((m: any, i: number): PrdSignal => ({
        id: str(m.id) || `M-${i + 1}`, signal: str(m.signal), instrument: str(m.instrument),
        population: { personaId: personaIds.has(str(m.population?.personaId)) ? str(m.population?.personaId) : undefined, stage: str(m.population?.stage) || undefined },
        direction: pick(m.direction, ['up', 'down', 'hold'] as const, 'up'),
        baselineStatus: str(m.baselineStatus), type: pick(m.type, ['leading', 'lagging'] as const, 'lagging'),
        guardrail: { statement: str(m.guardrail?.statement), rollbackAuthority: str(m.guardrail?.rollbackAuthority) },
        requirementIds: arrStr(m.requirementIds).filter(x => reqIds.has(x)),
    })).filter((m: PrdSignal) => m.signal);
    for (const m of g.signals) for (const rid of m.requirementIds) { const r = g.requirements.find(x => x.id === rid); if (r && !r.signalIds.includes(m.id)) r.signalIds.push(m.id); }
    s.successSignals = { signalIds: g.signals.map(m => m.id) };

    // Tier-two sections.
    const hy = draft.hypotheses || {};
    s.hypotheses = { assumptions: (Array.isArray(hy.assumptions) ? hy.assumptions : []).map((a: any, i: number) => ({
        id: str(a.id) || `A-${i + 1}`, text: str(a.text), quadrant: pick(a.quadrant, ['test-now', 'plan', 'monitor', 'defer'] as const, 'test-now'),
        test: str(a.test), owner: str(a.owner), supportingQuoteIds: lock.admitAll(a.quotes),
    })).filter((a: any) => a.text) };
    const sf = draft.solutionFlows || {};
    const jobIds = new Set(s.usersAndJobs.jobStories.map(j => j.id));
    s.solutionFlows = {
        flows: (Array.isArray(sf.flows) ? sf.flows : []).map((f: any) => ({ jobStoryId: jobIds.has(str(f.jobStoryId)) ? str(f.jobStoryId) : (s.usersAndJobs.jobStories[0]?.id || ''), name: str(f.name), steps: arrStr(f.steps) })).filter((f: any) => f.name),
        screenStates: (Array.isArray(sf.screenStates) ? sf.screenStates : []).map((x: any) => ({ screen: str(x.screen), states: arrStr(x.states) })).filter((x: any) => x.screen),
        businessRules: arrStr(sf.businessRules),
        designLink: str(sf.designLink) || undefined,
    };
    const qu = draft.quality || {};
    s.quality = {
        characteristics: (Array.isArray(qu.characteristics) ? qu.characteristics : []).map((c: any) => ({ characteristic: str(c.characteristic), statement: str(c.statement), target: toTarget(c.target, str(c.characteristic) || 'quality') })).filter((c: any) => c.characteristic),
        accessibility: { level: str(qu.accessibility?.level) || 'WCAG 2.2 AA', exposedCriteria: arrStr(qu.accessibility?.exposedCriteria) },
        privacy: { regime: str(qu.privacy?.regime) || undefined, dataMinimization: str(qu.privacy?.dataMinimization), dpiaTrigger: { triggered: !!qu.privacy?.dpiaTrigger?.triggered, reason: str(qu.privacy?.dpiaTrigger?.reason) } },
    };
    const rk = draft.risks || {};
    s.risks = {
        register: (Array.isArray(rk.register) ? rk.register : []).map((r: any, i: number) => ({ id: str(r.id) || `RK-${i + 1}`, failureMode: str(r.failureMode), likelihood: pick(r.likelihood, ['low', 'medium', 'high'] as const, 'medium'), severity: pick(r.severity, ['low', 'medium', 'high'] as const, 'medium'), earlySignal: str(r.earlySignal), owner: str(r.owner), mitigation: str(r.mitigation) })).filter((r: any) => r.failureMode),
        alternatives: (Array.isArray(rk.alternatives) ? rk.alternatives : []).map((a: any) => ({ option: str(a.option), rejectedBecause: str(a.rejectedBecause), tradeoff: str(a.tradeoff) })).filter((a: any) => a.option),
    };
    const dl = draft.delivery || {};
    s.delivery = {
        releaseCriteria: arrStr(dl.releaseCriteria),
        rollout: (Array.isArray(dl.rollout) ? dl.rollout : []).map((p: any) => ({ phase: str(p.phase), gate: str(p.gate), killCriteria: str(p.killCriteria), rollbackAuthority: str(p.rollbackAuthority) })).filter((p: any) => p.phase),
        trackingPlan: (Array.isArray(dl.trackingPlan) ? dl.trackingPlan : []).map((t: any) => ({ event: str(t.event), properties: arrStr(t.properties), owner: str(t.owner) })).filter((t: any) => t.event),
        dependencies: (Array.isArray(dl.dependencies) ? dl.dependencies : []).map((d: any) => ({ name: str(d.name), kind: pick(d.kind, ['api', 'data', 'team', 'vendor', 'other'] as const, 'other'), owner: str(d.owner) })).filter((d: any) => d.name),
        openQuestions: (Array.isArray(dl.openQuestions) ? dl.openQuestions : []).map((q: any) => ({ question: str(q.question), owner: str(q.owner), due: str(q.due) })).filter((q: any) => q.question),
        accountableApprover: str(dl.accountableApprover),
    };

    // Provenance-locked graph.
    g.sources = lock.allSources;
    g.quotes = lock.allQuotes;
    if (lock.recoveredPointers.length) warnings.push(`manifest pointer recovered by verbatim match for ${lock.recoveredPointers.length} quote(s): ${lock.recoveredPointers.map(r => `${r.quoteId} (${r.from})`).join(', ')}`);

    // The record carries the themes it references, not the whole approved set (the 2026-10-01 live run carried
    // 596 theme references for a PRD that cites 39, and their cached names and insights raised 113 of its
    // 117 validation errors). Unused sources are already absent: a source exists only behind a verified quote.
    const usedThemeIds = new Set<string>([
        ...(s.thesis.governingThemeId ? [s.thesis.governingThemeId] : []),
        ...g.pains.flatMap(p => p.themeIds),
        ...g.requirements.flatMap(r => r.themeIds),
    ]);
    g.themes = g.themes.filter(t => usedThemeIds.has(t.id));

    // Id parentheticals in model prose ("The returning customer (P1) is the primary user") are stripped.
    const graphIds = new Set<string>([
        ...g.personas.map(x => x.id), ...(inputs.themes || []).map(x => x.id), ...g.pains.map(x => x.id),
        ...g.competitiveGaps.map(x => x.id), ...g.requirements.map(x => x.id), ...g.acceptanceTests.map(x => x.id),
        ...g.signals.map(x => x.id), ...s.usersAndJobs.jobStories.map(x => x.id), ...s.hypotheses.assumptions.map(x => x.id),
        ...(inputs.journeyPains || []).map(x => x.id), ...s.risks.register.map(x => x.id), ...(g.ledger || []).map(x => x.id),
    ]);
    scrubIdParentheticals(s, graphIds);
    for (const coll of [g.pains, g.requirements, g.acceptanceTests, g.signals, g.competitiveGaps]) scrubIdParentheticals(coll, graphIds);
    air.title = stripIdParentheticals(air.title, graphIds);

    // B5: the privacy regime. The model's when it named one; otherwise derived from the objective and the
    // evidence; never GDPR by default. A GDPR regime on a subject whose evidence reads as United States
    // education or health is reported, not silently kept.
    const recovery = pointerRecoveryItems(inputs, evidence);
    const corpus = [...evidence, ...recovery];
    const derivedRegime = inferPrivacyRegime(inputs.objective, corpus);
    let privacyRegime: PrdCompileReport['privacyRegime'] = { value: '', origin: 'none' };
    if (s.quality.privacy.regime) {
        privacyRegime = { value: s.quality.privacy.regime, origin: 'model' };
        if (/\bGDPR\b/.test(s.quality.privacy.regime) && derivedRegime && !/GDPR/.test(derivedRegime)) {
            privacyRegime.warning = `model named GDPR; the objective and evidence read as ${derivedRegime}`;
            warnings.push(`privacy regime: ${privacyRegime.warning}`);
        }
    } else if (derivedRegime) {
        s.quality.privacy.regime = derivedRegime;
        privacyRegime = { value: derivedRegime, origin: 'derived' };
    }

    // B6: a person named in an owner-like field that no evidence item carries is replaced by the role.
    const corpusText = corpus.map(e => e.text).join(' \n ').toLowerCase();
    const namesReplacedByRole: PrdCompileReport['namesReplacedByRole'] = [];
    const OWNER_PATH_RE = /(?:owner|rollbackAuthority|accountableApprover|baselineStatus)$/;
    const replaceNames = (v: string, path: string): string | void => {
        if (!OWNER_PATH_RE.test(path)) return;
        let changed = false;
        const out = v.replace(NAME_WITH_ROLE_RE, (m, name: string, role: string) => {
            if (corpusText.includes(name.toLowerCase())) return m;
            changed = true;
            namesReplacedByRole.push({ path, name, role: role.trim() });
            return role.trim();
        });
        return changed ? out : undefined;
    };
    walkStrings(s, 'sections', replaceNames);
    walkStrings(g.signals, 'graph.signals', replaceNames);

    // B4: a target rationale that credits a document without a resolvable pointer is restated as a decision.
    const rationalesRestated: PrdCompileReport['rationalesRestated'] = [];
    const rationalesSourced: PrdCompileReport['rationalesSourced'] = [];
    const evidenceIds = new Map(corpus.map(e => [e.id, e] as const));
    const fixRationale = (t: RequirementTarget | undefined, path: string) => {
        if (!t) return;
        const sp = str(t.source_pointer);
        if (sp) {
            const hit = evidenceIds.get(sp) || corpus.find(e => e.pointer === sp);
            t.source_pointer = hit?.pointer || (POINTER_RE.test(sp) ? sp : undefined);
        }
        if (t.rationale && !t.source_pointer && DOC_ATTRIBUTION_RE.test(t.rationale)) {
            // The credited document may be IN the evidence: bind the rationale to its pointer by the document's
            // registered name ("product brief" -> "Client document: ... Product Brief"). Otherwise restate it as
            // the team's decision: a document the reader cannot open is not a source.
            const doc = /\b((?:product|project|design)\s+brief|statement of work|charter|RFP|proposal|brief)\b/i.exec(t.rationale)?.[1]?.toLowerCase();
            const named = doc ? corpus.find(e => !!e.pointer && POINTER_RE.test(e.pointer) && (e.sourceName.toLowerCase().includes(doc) || (doc === 'statement of work' && /\bstatement of work\b/i.test(e.sourceName)))) : undefined;
            if (named) {
                t.source_pointer = named.pointer;
                rationalesSourced.push({ path, pointer: named.pointer! });
            } else {
                rationalesRestated.push({ path, was: t.rationale });
                t.rationale = 'We set this target as a design decision for this release.';
            }
        }
    };
    fixRationale(s.goalsNonGoalsAppetite.appetite, 'sections.goalsNonGoalsAppetite.appetite');
    g.requirements.forEach((r, i) => fixRationale(r.target, `graph.requirements.${i}.target`));
    g.acceptanceTests.forEach((t, i) => fixRationale(t.target, `graph.acceptanceTests.${i}.target`));
    s.quality.characteristics.forEach((c, i) => fixRationale(c.target, `sections.quality.characteristics.${i}.target`));

    // B1: the problem and why-now must be about the user and the subject.
    const problemNamesSolution: PrdCompileReport['problemNamesSolution'] = [];
    for (const [field, v] of [['problem.story.user', s.problem.story.user], ['problem.story.need', s.problem.story.need], ['problem.story.insight', s.problem.story.insight], ['whyNow.statement', s.whyNow.statement], ['whyNow.change', s.whyNow.change]] as const) {
        const m = SOLUTION_LEAK_RE.exec(v || '');
        if (m) problemNamesSolution.push({ field, match: m[0] });
    }
    if (problemNamesSolution.length) warnings.push(`problem / why-now name the solution or the engagement: ${problemNamesSolution.map(x => `${x.field} ("${x.match}")`).join(', ')}`);

    // B3: singularity.
    const singularityFlags: PrdCompileReport['singularityFlags'] = [];
    for (const r of g.requirements) { const j = compoundOutcome(r.text); if (j) singularityFlags.push({ id: r.id, kind: 'requirement', text: r.text, joint: j }); }
    for (const m of g.signals) { const j = compoundOutcome(m.signal); if (j) singularityFlags.push({ id: m.id, kind: 'signal', text: m.signal, joint: j }); }
    if (singularityFlags.length) warnings.push(`not singular (one outcome each): ${singularityFlags.map(f => f.id).join(', ')}`);
    if (lock.repointedToPrimary.length) warnings.push(`${lock.repointedToPrimary.length} synthesis quote(s) re-pointed to a primary chunk`);

    // Untraceable requirements become bets; tiers are derived from the evidence columns.
    const hypothesisRequirementIds = typeUntraceableAsHypothesis(air);
    const before = new Map(g.requirements.map(r => [r.id, r.proposedTier || r.tier] as const));
    applyDerivedTiers(air);
    const tierChanges = g.requirements.filter(r => before.get(r.id) !== r.tier).map(r => ({ id: r.id, from: before.get(r.id) as PrdTier, to: r.tier }));

    const validation = validatePrdAir(air);
    return { air, report: {
        droppedQuotes: lock.dropped, hypothesisRequirementIds, tierChanges, validation, parseWarnings: warnings,
        singularityFlags, problemNamesSolution, rationalesRestated, rationalesSourced, namesReplacedByRole, repointedToPrimary: lock.repointedToPrimary, privacyRegime,
        coverage: ledgerCoverage(air),
    } };
}


// ---- ledger-first compile (2026-10-02, owner rules) -------------------------------------------------------
//
// "There should be requirements documented against every articulated feature and piece of feedback"; "all captured
// themes ... ALSO ALL reflected in requirements"; "deterministically enforced and generalized for ANY RESEARCH
// PROJECT". The single giant call is replaced by:
//   (a) the engagement ledger (services/engagementLedger.ts): STATED, FEEDBACK and THEME items, every client
//       document read in full, feature areas derived from the project's own text;
//   (b) requirements per derived AREA, batched (scope items and theme groups in separate batches of at most
//       AREA_BATCH), every item in a batch to be documented;
//   (c) a coverage check, one gap-fill call per area batch for what the first pass missed, and a deterministic
//       requirement for anything still unmapped (coverage is 100% by construction);
//   (d) a research pass for pains and gaps no requirement addresses yet;
//   (e) the remaining PRD sections compiled against the full requirement set;
//   (f) the deterministic rule registry (services/deliverableRules.ts via services/prdRulesContract.ts) in-path:
//       violation -> repair -> fill, with the receipt stored on the record.
// Routing stays with the caller (`gen`).

export type PrdGen = (call: { system: string; user: string; label: string; maxTokens?: number }) => Promise<string>;

export interface PrdPassReport {
    areaCalls: number;
    gapFillCalls: number;
    researchCalls: number;
    sectionsCall: 'ok' | 'failed';
    requirementsByOrigin: Record<string, number>;
    requirementsByArea: Record<string, number>;
    ledgerItemsByArea: Record<string, number>;
    failures: string[];
}

const AREA_BATCH = 25;
const CROSS_CUTTING: PrdArea = { id: 'AREA-X', label: 'Cross-cutting', items: 0 };
const TIER_FROM_LABEL: Record<string, PrdTier> = { required: 'must', decision: 'must', recommended: 'should', request: 'should', unspecified: 'should', optional: 'could', 'out-of-scope': 'wont' };

function toks(s: string): Set<string> {
    return new Set((String(s || '').toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []));
}
function overlap(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n;
}
function rankBy<T>(items: T[], text: (t: T) => string, against: Set<string>, cap: number): T[] {
    return items.map((t, i) => ({ t, i, s: overlap(toks(text(t)), against) })).sort((a, b) => (b.s - a.s) || (a.i - b.i)).slice(0, cap).map(x => x.t);
}

/** Lenient parse of a `{ "<key>": [ ... ] }` reply: whole object, else every complete object in the array. */
function parseJsonItems(raw: string, key: string): any[] {
    try {
        const obj = extractJsonObject(raw);
        if (Array.isArray(obj)) return obj;
        return Array.isArray(obj?.[key]) ? obj[key] : [];
    } catch { /* salvage below */ }
    const s = String(raw || '');
    const start = s.indexOf('[');
    const out: any[] = [];
    if (start < 0) return out;
    let depth = 0, from = -1, inStr = false, esc = false;
    for (let i = start + 1; i < s.length; i++) {
        const ch = s[i];
        if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === '{') { if (depth === 0) from = i; depth++; }
        else if (ch === '}') { depth--; if (depth === 0 && from >= 0) { try { out.push(JSON.parse(s.slice(from, i + 1))); } catch { /* skip */ } from = -1; } }
    }
    return out;
}

const REQUIREMENT_ITEM_SCHEMA = `{ "text": "one sentence, one outcome, names the actor, an outcome not an implementation", "kind": "functional|non-functional",
  "proposedTier": "must|should|could|wont", "tierRationale": "", "mapsToThesis": true, "kano": "must-be|one-dimensional|attractive|indifferent|unknown", "cagansBar": true,
  "ledgerIds": ["SF-n", "FB-n", "TH-n"], "painIds": ["pain root ids"], "competitiveGapIds": ["CG ids"], "themeIds": ["T ids"], "personaIds": ["persona ids"],
  "target": { "metric": "", "value": 0, "unit": "", "rationale": "qualitative" },
  "bet": { "statement": "", "test": "", "conditionWhereAlternativeWins": "" },
  "notes": "optional: open question or refinement note",
  "acceptanceTests": [ { "given": "", "when": "", "then": "", "target": { "metric": "", "value": 0, "unit": "" } } ] }`;

function areaSystem(): string {
    return [
        'You are a senior product manager writing the requirements for ONE feature area of a product requirements document. An engineer and a designer will build from these requirements without a clarifying meeting, and an auditor will trace each one to its source.',
        '',
        'COVERAGE (hard): every ledger item listed is documented by at least one requirement that carries the item id in `ledgerIds`. An item that bundles several outcomes becomes several requirements. Never drop an item because it looks small, duplicated or obvious; two items that ask for the same outcome may share one requirement that lists both ids.',
        '- STATED items (SF) are features, capabilities, deliverables, constraints or acceptance items the client wrote down. Write the requirement for the outcome the item states.',
        '- FEEDBACK items (FB) are stakeholder reactions, decisions and change requests. Write the requirement for the behavior the feedback asks for: a change request produces the changed behavior; a remove produces the requirement that the thing is absent; positive feedback on a prototype element produces the requirement that keeps that element; an open question produces a requirement that states the outcome the decision must secure, with the question in `notes`.',
        '- THEME items (TH) are research themes the team captured. Each theme generates a SET of requirements: at least one, and one per distinct need the theme states. Write what the product does about the need the theme names.',
        '',
        'ROOTS: a requirement roots on ledger items (SF, FB, TH), pain roots, competitive gaps (CG) or themes (T). Name every root that applies. A requirement with no root of any kind is a bet: fill `bet` with the statement, the smallest test and the condition under which the alternative wins.',
        '',
        'TIER PROPOSAL: an item the source labels required (or a contracted deliverable), and a stakeholder decision, are must; recommended is should; optional is could; out of scope is wont. The system derives the final tier.',
        '',
        'SINGULAR: one outcome per requirement. ACCEPTANCE: at least one acceptance test per requirement, declarative Given / When / Then, observable, no UI prescription.',
        '',
        'THE NUMBER RULE: a number that describes the world stays in the source quote; a number that is a design decision (a threshold, a bound, a count) goes ONLY in a `target` object with metric, value, unit and a qualitative rationale. Requirement text carries no digits except standard names.',
        '',
        'WRITING RULES (hard): plain, literal business language; name the actor in every sentence; no metaphor; no em-dash character; no markdown; never describe the document or the research process.',
        '',
        `OUTPUT: one JSON object {"requirements": [ ${REQUIREMENT_ITEM_SCHEMA} ]}. No preamble, no code fence.`,
    ].join('\n');
}

function ledgerLine(li: PrdLedgerItem): string {
    const docs = Array.from(new Set((li.sources || []).map(s => s.documentTitle))).join('; ') || li.documentTitle;
    if (li.type === 'theme') {
        return `- ${li.id} | THEME${(li.themeIds || []).length > 1 ? ` | ${(li.themeIds || []).length} board themes` : ''}\n    theme: ${li.item}\n    summary: ${li.statement}${li.quote ? `\n    quote: "${li.quote.replace(/\s+/g, ' ')}" (${docs})` : ''}`;
    }
    const meta = [li.type.toUpperCase(), `label ${li.label}`, li.disposition ? `disposition ${li.disposition}` : '', li.group ? `group: ${li.group}` : '', li.speaker ? `speaker: ${li.speaker}` : '', li.date ? `date ${li.date}` : ''].filter(Boolean).join(' | ');
    return `- ${li.id} | ${meta}\n    item: ${li.item}\n    statement: ${li.statement}\n    quote: "${li.quote.replace(/\s+/g, ' ')}" (${docs})`;
}

interface RootContext { personas: string[]; pains: string[]; gaps: string[]; themes: string[] }

function rootContext(inputs: PrdCompilerInputs, against: Set<string>, caps = { pains: 40, gaps: 25, themes: 30 }): RootContext {
    const personas = (inputs.personas || []).map(p => `- ${p.id} | ${p.name}${p.role ? ` | ${p.role}` : ''}${p.primary ? ' | PRIMARY' : ''}`);
    const painRows: Array<{ id: string; text: string; who: string }> = [];
    for (const p of inputs.personas || []) p.painPoints.forEach((pp, i) => { if (pp.quote) painRows.push({ id: `${p.id}.pain.${i}`, text: pp.text, who: `persona ${p.id}` }); });
    for (const j of inputs.journeyPains || []) if (j.quote) painRows.push({ id: j.id, text: j.text, who: `journey stage ${j.stage}` });
    const pains = rankBy(painRows, r => r.text, against, caps.pains).map(r => `- ${r.id} | ${r.who} | ${r.text}`);
    const gaps = rankBy(inputs.competitiveGaps || [], g => `${g.competitor || ''} ${g.text}`, against, caps.gaps).map(g => `- ${g.id} | ${g.competitor ? `${g.competitor}: ` : ''}${g.text}`);
    const themes = rankBy(inputs.themes || [], t => `${t.name} ${t.insight || ''}`, against, caps.themes).map(t => `- ${t.id} | ${t.name}`);
    return { personas, pains, gaps, themes };
}

function rootBlock(rc: RootContext): string {
    return [
        fmtRef('PERSONAS (reference by id).', rc.personas), '',
        fmtRef('PAIN ROOTS (reference by id in painIds).', rc.pains), '',
        fmtRef('COMPETITIVE GAPS (reference by id).', rc.gaps), '',
        fmtRef('THEMES (reference by id).', rc.themes),
    ].join('\n');
}

export function areaLabelOf(inputs: Pick<PrdCompilerInputs, 'areas'>, id: string): string {
    return (inputs.areas || []).find(a => a.id === id)?.label || CROSS_CUTTING.label;
}

function buildAreaPrompt(inputs: PrdCompilerInputs, areaId: string, items: PrdLedgerItem[], mode: 'area' | 'gap-fill'): { system: string; user: string } {
    const against = toks(items.map(i => `${i.item} ${i.statement} ${i.quote}`).join(' '));
    const rc = rootContext(inputs, against);
    const label = areaLabelOf(inputs, areaId);
    const lead = mode === 'gap-fill'
        ? 'The ledger items below were NOT documented by the first pass. Write at least one requirement for EACH of them, carrying its id in `ledgerIds`.'
        : `Write the requirements for the feature area "${label}". Every ledger item below is documented by at least one requirement.`;
    return {
        system: areaSystem(),
        user: [
            `OBJECTIVE: ${inputs.objective}`,
            inputs.decisionToSupport ? `DECISION TO SUPPORT: ${inputs.decisionToSupport}` : '',
            `FEATURE AREA: ${label}`,
            '',
            lead,
            '',
            `LEDGER ITEMS (${items.length}):`,
            ...items.map(ledgerLine),
            '',
            rootBlock(rc),
            '',
            'Return {"requirements": [...]}.',
        ].filter(l => l !== '').join('\n'),
    };
}

function buildResearchPassPrompt(inputs: PrdCompilerInputs, written: string[]): { system: string; user: string } {
    const rc = rootContext(inputs, toks(inputs.objective), { pains: 60, gaps: 40, themes: 40 });
    return {
        system: areaSystem(),
        user: [
            `OBJECTIVE: ${inputs.objective}`,
            '',
            'The requirements below are already written from the ledger. Write requirements ONLY for pain roots and competitive gaps that none of them addresses; at most twelve; each roots on the pain or gap ids it serves and carries `ledgerIds: []`. Return an empty list when every pain and gap is already addressed.',
            '',
            fmtRef('REQUIREMENTS ALREADY WRITTEN.', written.map(w => `- ${w.length > 160 ? w.slice(0, 160) : w}`)),
            '',
            rootBlock(rc),
            '',
            'Return {"requirements": [...]}.',
        ].join('\n'),
    };
}

/** The deterministic requirement for a ledger item no model pass documented. Coverage is 100% by construction. */
export function fallbackRequirementDraft(li: PrdLedgerItem, areaLabel: string, primaryPersonaId?: string): any {
    const base = (li.type === 'theme' ? `The product addresses the need named by the research theme: ${li.item}` : (li.statement || li.item || '')).replace(/\s+/g, ' ').trim().replace(/[.;:,\s]+$/, '');
    const text = `${base.charAt(0).toUpperCase()}${base.slice(1)}.`;
    const tier = TIER_FROM_LABEL[li.label] || 'should';
    return {
        text, kind: 'functional', proposedTier: tier, tierRationale: '', mapsToThesis: true, kano: 'unknown', cagansBar: tier === 'must',
        ledgerIds: [li.id], painIds: [], competitiveGapIds: [], themeIds: [...(li.themeIds || [])], personaIds: primaryPersonaId ? [primaryPersonaId] : [],
        origin: 'fallback',
        notes: `Needs refinement: written directly from ${li.id} (${li.documentTitle}) because no model pass documented it.`,
        acceptanceTests: [{
            given: `the ${areaLabel.toLowerCase()} release candidate`,
            when: `the product owner checks it against the source of ${li.id}`,
            then: `${base.charAt(0).toLowerCase()}${base.slice(1)}`,
        }],
    };
}

function sectionsPromptFor(inputs: PrdCompilerInputs, reqs: any[]): { system: string; user: string } {
    let base: PrdCompilerPrompt | null = null;
    // The sections call sees the themes most related to the objective (the requirements already carry every theme).
    const themes = rankBy(inputs.themes || [], t => `${t.name} ${t.insight || ''}`, toks(inputs.objective), 80);
    try { base = buildPrdCompilerPrompt({ ...inputs, themes, ledger: (inputs.ledger || []).filter(l => l.type !== 'theme') }); } catch { base = null; }
    const system = [
        base?.system || buildSystem(),
        '',
        'THIS CALL: the requirements are ALREADY WRITTEN and listed below with their ids. Do NOT emit a `requirements` array. Write every other field of the schema against them: the thesis and problem cover the whole requirement set; signals point back to these requirement ids; non-goals name what the ledger places out of scope; risks, rollout and open questions cover the client-stated scope.',
    ].join('\n');
    const reqLines = reqs.map(r => { const t = String(r.text || ''); return `- ${r.id} | ${r.proposedTier || 'should'} | ${t.length > 160 ? t.slice(0, 160) : t}`; });
    const user = [
        base?.user || `OBJECTIVE: ${inputs.objective}`,
        '',
        fmtRef(`REQUIREMENTS ALREADY WRITTEN (${reqs.length}).`, reqLines),
        '',
        'Write every PRD field except requirements as one JSON object.',
    ].join('\n');
    return { system, user };
}

/**
 * Ledger-first compile. `inputs.ledger` carries STATED, FEEDBACK and THEME items with derived area ids and
 * `inputs.areas` their labels; `gen` makes one model call (the caller routes it). Never throws on a failed call:
 * a failed batch falls to gap-fill, then to the deterministic requirement; a failed sections call compiles the
 * requirements with empty sections, and the rule registry repairs and fills what it can.
 */
export async function compilePrdFromLedger(inputs: PrdCompilerInputs, gen: PrdGen, opts: { concurrency?: number; onProgress?: (msg: string) => void; outOfScope?: Map<string, string>; isProjectWork?: (text: string) => boolean } = {}): Promise<PrdCompileResult> {
    // 2026-10-06: items OUTSIDE the requested scope (a module PRD) and meeting admin tasks are still ACCOUNTED FOR
    // (owner rule: every ledger item and board theme is covered), but deterministically, as Won't rows with the reason,
    // never through a model batch. A 920-item engagement ran 68 batches (~36 minutes) and wrote program-admin tasks
    // ("schedules a mock advisor session") as product requirements.
    const outOfScope = opts.outOfScope || new Map<string, string>();
    const allLedger = inputs.ledger || [];
    const ledger = allLedger.filter(l => !outOfScope.has(l.id));
    const failures: string[] = [];
    const conc = Math.max(1, opts.concurrency ?? 10);   // 2026-10-06: 6 -> 10 parallel area batches
    const run = async (label: string, prompt: { system: string; user: string }, maxTokens: number): Promise<string> => {
        try { return await gen({ system: prompt.system, user: prompt.user, label, maxTokens }); }
        catch (e: any) { failures.push(`${label}: ${e?.message || e}`); return ''; }
    };
    const pool = async <T,>(xs: T[], fn: (x: T) => Promise<void>) => {
        let i = 0;
        await Promise.all(Array.from({ length: Math.min(conc, xs.length) }, async () => { while (i < xs.length) { const x = xs[i++]; await fn(x); } }));
    };
    const ledgerById = new Map(allLedger.map(l => [l.id, l] as const));
    const inputThemeIds = new Set((inputs.themes || []).map(t => t.id));
    const clean = (r: any, origin: string) => {
        const ledgerIds = arrStr(r?.ledgerIds).filter(id => ledgerById.has(id));
        // A THEME root carries its board theme ids onto the requirement deterministically.
        const themeIds = new Set(arrStr(r?.themeIds));
        for (const id of ledgerIds) for (const t of ledgerById.get(id)!.themeIds || []) if (inputThemeIds.has(t)) themeIds.add(t);
        return { ...r, origin, ledgerIds, themeIds: [...themeIds] };
    };
    const areas: PrdArea[] = [...(inputs.areas || [])];
    const known = new Set(areas.map(a => a.id));
    if (ledger.some(l => !known.has(l.featureArea)) && !known.has(CROSS_CUTTING.id)) areas.push({ ...CROSS_CUTTING });
    const areaOf = (li: PrdLedgerItem) => (known.has(li.featureArea) ? li.featureArea : CROSS_CUTTING.id);
    const areaInputs: PrdCompilerInputs = { ...inputs, areas };
    const byArea = new Map<string, PrdLedgerItem[]>(areas.map(a => [a.id, []] as [string, PrdLedgerItem[]]));
    for (const li of ledger) byArea.get(areaOf(li))!.push(li);

    // (b) per-area passes: scope items and theme groups in separate batches.
    const drafts = new Map<string, any[]>(areas.map(a => [a.id, []] as [string, any[]]));
    const batches = (items: PrdLedgerItem[]) => {
        const out: PrdLedgerItem[][] = [];
        for (const group of [items.filter(i => i.type !== 'theme'), items.filter(i => i.type === 'theme')]) for (let i = 0; i < group.length; i += AREA_BATCH) out.push(group.slice(i, i + AREA_BATCH));
        return out;
    };
    const jobs: Array<{ area: string; items: PrdLedgerItem[]; n: number }> = [];
    for (const [area, items] of byArea) batches(items).forEach((b, k) => jobs.push({ area, items: b, n: k + 1 }));
    let areaCalls = 0;
    await pool(jobs, async (job) => {
        const label = areaLabelOf(areaInputs, job.area);
        opts.onProgress?.(`writing "${label}" requirements (${job.items.length} ledger item(s); batch ${areaCalls + 1} of ${jobs.length})`);
        const raw = await run(`#prd requirements: ${label} ${job.n}`, buildAreaPrompt(areaInputs, job.area, job.items, 'area'), 48000);
        areaCalls++;
        drafts.get(job.area)!.push(...parseJsonItems(raw, 'requirements').filter(r => r && str(r.text)).map(r => clean(r, 'area-pass')));
    });

    // (c) coverage check, gap-fill per area batch, deterministic fallback.
    const coveredIds = () => new Set([...drafts.values()].flat().flatMap((r: any) => r.ledgerIds || []));
    let covered = coveredIds();
    const gapJobs: Array<{ area: string; items: PrdLedgerItem[] }> = [];
    for (const [area, items] of byArea) for (const b of batches(items.filter(li => !covered.has(li.id)))) gapJobs.push({ area, items: b });
    let gapFillCalls = 0;
    await pool(gapJobs, async (job) => {
        const label = areaLabelOf(areaInputs, job.area);
        opts.onProgress?.(`documenting ${job.items.length} uncovered "${label}" item(s)`);
        const raw = await run(`#prd gap fill: ${label}`, buildAreaPrompt(areaInputs, job.area, job.items, 'gap-fill'), 32000);
        gapFillCalls++;
        const allowed = new Set(job.items.map(i => i.id));
        drafts.get(job.area)!.push(...parseJsonItems(raw, 'requirements').filter(r => r && str(r.text)).map(r => clean(r, 'gap-fill')).filter(r => r.ledgerIds.some((id: string) => allowed.has(id))));
    });
    covered = coveredIds();
    const primary = (inputs.personas || []).find(p => p.primary)?.id;
    for (const [area, items] of byArea) for (const li of items) if (!covered.has(li.id)) drafts.get(area)!.push(clean(fallbackRequirementDraft(li, areaLabelOf(areaInputs, area), primary), 'fallback'));
    // Out-of-scope items: one deterministic Won't row each, carrying the reason (accounted for, not built).
    const outRows: any[] = [];
    for (const li of allLedger) {
        const why = outOfScope.get(li.id);
        if (!why) continue;
        const d = fallbackRequirementDraft(li, 'Out of scope', undefined);
        outRows.push(clean({ ...d, proposedTier: 'wont', cagansBar: false, mapsToThesis: false, tierRationale: `Won't (this release): ${why}.`, notes: `Accounted for, not built in this release: ${why}.` }, 'out-of-scope'));
    }

    // (d) research pass: pains and gaps no requirement addresses yet.
    let researchCalls = 0;
    const research: any[] = [];
    const hasResearchRoots = (inputs.personas || []).some(p => p.painPoints.some(pp => pp.quote)) || (inputs.journeyPains || []).some(j => j.quote) || (inputs.competitiveGaps || []).length > 0;
    if (hasResearchRoots) {
        opts.onProgress?.('writing requirements for research pains and gaps the ledger does not cover');
        const written = [...drafts.values()].flat().map((r: any) => str(r.text));
        const raw = await run('#prd requirements: research pains and gaps', buildResearchPassPrompt(inputs, written), 32000);
        researchCalls++;
        research.push(...parseJsonItems(raw, 'requirements').filter(r => r && str(r.text)).slice(0, 12).map(r => clean(r, 'research-pass')));
    }

    // Merge in area order and number R-n; AT-n is numbered by compilePrdAir.
    const merged: any[] = [];
    const reqArea = new Map<any, string>();
    const order: Record<string, number> = { 'area-pass': 0, 'gap-fill': 1, fallback: 2 };
    for (const a of areas) for (const r of drafts.get(a.id)!.map((r, i) => ({ r, i })).sort((x, y) => ((order[x.r.origin] ?? 3) - (order[y.r.origin] ?? 3)) || (x.i - y.i)).map(x => x.r)) { merged.push(r); reqArea.set(r, a.id); }
    merged.push(...research);
    // Project work written as a requirement ("<Vendor> holds design review sessions", "The project team obtains
    // approval") is accounted for, not built: Won't with the reason (2026-10-06 live: 81 of 371 Musts).
    if (opts.isProjectWork) {
        for (const r of merged) {
            if (r.origin === 'out-of-scope' || !opts.isProjectWork(str(r.text))) continue;
            r.proposedTier = 'wont';
            r.cagansBar = false;
            r.mapsToThesis = false;
            r.tierRationale = "Won't (this release): an engagement obligation (project or delivery work, not product behaviour).";
            r.notes = `${r.notes ? `${r.notes} ` : ''}Engagement obligation: tracked on the Engagement Obligations sheet, not built.`;
            r.origin = 'project-work';
        }
    }
    merged.push(...outRows);
    merged.forEach((r, i) => { r.id = `R-${i + 1}`; });

    // (e) the remaining sections against the full requirement set.
    opts.onProgress?.(`compiling the PRD sections against ${merged.length} requirement(s)`);
    const sectionsRaw = await run('#prd sections (PrdAir contract)', sectionsPromptFor(inputs, merged.filter(r => r.origin !== 'out-of-scope')), 64000);
    let sections: any = {};
    let sectionsCall: PrdPassReport['sectionsCall'] = 'ok';
    try { sections = extractJsonObject(sectionsRaw) || {}; } catch (e: any) { sectionsCall = 'failed'; failures.push(`sections parse: ${e?.message || e}`); }
    const result = compilePrdAir(JSON.stringify({ ...sections, requirements: merged }), { ...inputs, areas });

    // (f) the deterministic rule registry, in-path.
    opts.onProgress?.('checking every rule (coverage, quotes, provenance, numbers, writing, ids) and repairing in place');
    const { enforcePrdRules } = await import('./prdRulesContract');
    const receipt = await enforcePrdRules(result.air, { inputs: { ...inputs, areas } });
    result.report.receipt = receipt;
    result.report.coverage = ledgerCoverage(result.air);
    result.report.validation = validatePrdAir(result.air);

    const byOrigin: Record<string, number> = {};
    for (const r of result.air.graph.requirements) byOrigin[r.origin || 'model'] = (byOrigin[r.origin || 'model'] || 0) + 1;
    const byAreaReq: Record<string, number> = {};
    const ledgerArea = new Map(ledger.map(l => [l.id, areaOf(l)] as const));
    for (const r of result.air.graph.requirements) {
        const a = (r.ledgerIds || []).map(id => ledgerArea.get(id)).find(Boolean) || 'research';
        const label = a === 'research' ? 'Research pains and gaps' : areaLabelOf(areaInputs, a);
        byAreaReq[label] = (byAreaReq[label] || 0) + 1;
    }
    const ledgerItemsByArea: Record<string, number> = {};
    for (const [a, items] of byArea) if (items.length) ledgerItemsByArea[areaLabelOf(areaInputs, a)] = items.length;
    result.report.passes = { areaCalls, gapFillCalls, researchCalls, sectionsCall, requirementsByOrigin: byOrigin, requirementsByArea: byAreaReq, ledgerItemsByArea, failures };
    if (failures.length) result.report.parseWarnings.push(`compile calls that failed or returned nothing usable: ${failures.join('; ')}`);
    return result;
}

/** The coverage block for the chat reply: counts, then every item only the fallback covered, by name. */
export function formatCoverageReply(cov: PrdLedgerCoverage | undefined, receipt?: DeliverableReceipt): string {
    const lines: string[] = [];
    if (cov && cov.items) {
        if (cov.scopeItems) lines.push(`Scope and feedback coverage: ${cov.stated} stated feature${cov.stated === 1 ? '' : 's'} and ${cov.feedback} feedback item${cov.feedback === 1 ? '' : 's'} from the client documents; ${cov.scopeCovered} of ${cov.scopeItems} covered by requirements (${cov.scopeItems ? Math.round((cov.scopeCovered / cov.scopeItems) * 1000) / 10 : 100}%).`);
        if (cov.themeIds) lines.push(`Theme coverage: ${cov.themeIds} board theme${cov.themeIds === 1 ? '' : 's'} in ${cov.themeGroups} group${cov.themeGroups === 1 ? '' : 's'}; ${cov.themeIdsCovered} covered by requirements (${cov.themeCoveragePct}%).`);
        const docs = Object.entries(cov.byDocument).filter(([d]) => d).map(([d, n]) => `${d} (${n})`).join(', ');
        if (docs) lines.push(`Ledger items by source: ${docs}.`);
        const roots = cov.requirementsByRootType;
        lines.push(`Requirements by root (one requirement can have several): stated ${roots.stated}, feedback ${roots.feedback}, theme ${roots.theme}, pain ${roots.pain}, competitive gap ${roots['competitive-gap']}, bet ${roots.bet} in total.`);
        if (cov.uncoveredByModel.length) {
            lines.push('', 'Items no model pass documented, each given its own requirement (flagged "needs refinement" in the workbook):');
            const label: Record<string, string> = { stated: 'stated feature', feedback: 'feedback', theme: 'theme' };
            for (const r of cov.uncoveredByModel) lines.push(`- ${r.ledgerId} (${label[r.type] || r.type}, ${r.documentTitle}): ${r.item} -> ${r.fallbackRequirementIds.join(', ')}`);
        } else {
            lines.push('Every ledger item was documented by a model-written requirement; no deterministic fallback was needed.');
        }
    }
    const rl = formatReceiptLines(receipt);
    if (rl.length) lines.push('', 'Rule receipt (the requirements record and the workbook built from it):', ...rl.map(l => `- ${l}`));
    return lines.join('\n');
}
