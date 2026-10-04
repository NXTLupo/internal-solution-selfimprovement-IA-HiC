/**
 * CLAIM LEDGER GATE for prose artifacts (2026-09-11)
 * plans/report-evidence-integrity-and-primary-source-discovery-2026-09-11.md, WS-2.
 *
 * Born from the external review of the 2026-09-10 `#report` white paper, which logged
 * 36 findings against an artifact whose AIR record said `deterministicFailures: []`.
 * The HTML document path (#report, #whitepaper, #brief, #explainer) had never met a
 * gate: decks and deliverable blocks run ten chain stages, prose documents ran none.
 *
 * The reviewer's failure classes map one-to-one onto the reason codes below, and each
 * one was located in the replay of the stored prompt, response, themes and source
 * records (see the plan, section 1). The gate is DETERMINISTIC and calls no model:
 * it reads the sentences the reader will read, the pointers they cite, the chunk text
 * and page provenance the writer was shown, and the objective text. A model may later
 * NARROW a flagged sentence (never source it); the gate decides, the model edits.
 *
 * Generic by construction: nothing here names an industry, a vendor or a product. The
 * subject entities come from the objective; the source entities come from page
 * provenance; the dates come from frontmatter. The same code catches "the September
 * 2026 beta" on a March 2026 launch, "Endpoint Security Bot" on a page that says
 * "Baseline", and "every practitioner account converges" on two pointers to one
 * Reddit thread, for any subject the user names.
 */

import { normalizeForMatch, quoteAppearsIn, type PageFetcher } from './citationVerifier';
import { isFactualClaim } from './evidenceSlots';
import { lookupPageMeta, type PointerPageMeta } from './citationPointerRegistry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReasonCode =
    | 'UNRESOLVED_SOURCE'      // pointer not among the grounding chunks and not loadable
    | 'UNSOURCED_FACT'         // declarative factual claim with no pointer
    | 'UNVERIFIED_QUOTE'       // quoted span not verbatim in any cited chunk
    | 'DATE_SCOPE_MISMATCH'    // a month/year the cited sources do not carry (as-of window projected onto sources)
    | 'UNSUPPORTED_MODALITY'   // guarantee language over sources that only say can / helps / lets
    | 'PRODUCT_SCOPE_MISMATCH' // a vendor-owned source about another product used to describe the subject
    | 'INDEPENDENCE_INFLATED'  // population / consensus language over fewer than three independent origins
    | 'UNVERIFIED_IDENTIFIER'  // identifier or proper-noun phrase absent from every cited chunk, or only hedged in social text
    | 'DERIVED_AS_SOURCE'      // "via theme" / "paraphrased from theme": a cached summary cited as evidence
    | 'CHROME_LEAK';           // model-emitted footer / buttons / audit / metadata in the reader document

/**
 * `spec` and `ref` rows are NOT claims about the world (2026-10-01, #prd consulting-grade pass).
 * `spec` is specification text: a requirement, an acceptance test, a guardrail, a flow step, a screen
 * state, a business rule, a rollout step, a goal. It is a decision the document makes, so it needs no
 * source pointer and is never handed to the narrowing repair (the live #prd run had 82 sentences
 * "narrowed", most of them acceptance tests and spec text). `ref` names an approved graph record (a
 * persona or theme name, a section label). A projection marks either with `data-claim-kind="spec"` or
 * `data-claim-kind="ref"` on the block or on any ancestor element; the gate skips the evidence checks
 * for them and keeps the verbatim quote check. Evidence-bearing prose is never marked and stays gated.
 */
export type ClaimKind = 'quote' | 'stat' | 'text' | 'spec' | 'ref';
export type ClaimType = 'fact' | 'recommendation' | 'judgment' | 'label' | 'decision';
export type Severity = 'block' | 'warn';
export type RepairAction = 'narrow' | 'reframe_as_recollection' | 'name_the_analogy' | 'strip_pointer' | 'strip_tail' | 'remove_quote_marks' | 'none';

export interface ClaimRow {
    id: string;
    /** Block element tag the sentence came from (p, li, td, h2, ...). */
    tag: string;
    /** Reader-facing text with pointers and tags removed. */
    text: string;
    /** The block's inner HTML as emitted (for exact replacement by the repair). */
    rawInner: string;
    /** Pointers cited on this block, deduped, in order. */
    pointers: string[];
    /** Commentary tails found inside citation brackets ("paraphrased from theme"). */
    bracketTails: string[];
    kind: ClaimKind;
    claimType: ClaimType;
}

export interface LedgerFinding {
    code: ReasonCode;
    severity: Severity;
    rowId: string;
    sentence: string;
    pointers: string[];
    detail: string;
    repair: RepairAction;
}

export interface ClaimLedger {
    rows: ClaimRow[];
    findings: LedgerFinding[];
    /** Count per reason code, zero-filled so consumers can rely on every key. */
    summary: Record<ReasonCode, number>;
    blocking: number;
    warnings: number;
    pass: boolean;
    /** Distinct independent origins (URLs) cited across the artifact. */
    independentOrigins: number;
    /** Pointers cited that resolved to a chunk or page. */
    resolvedPointers: number;
    unresolvedPointers: string[];
    /** Rows marked `spec` or `ref` by the projection: present in `rows`, exempt from the evidence checks. */
    exemptRows: number;
}

export interface GateChunk {
    id: string;
    text: string;
    sources?: Array<{ n?: string; u?: string }>;
    pageMeta?: Partial<PointerPageMeta> | null;
}

export interface ClaimGateContext {
    /** Objective plus the artifact topic; the subject entities and as-of window are derived from it. */
    goalText: string;
    /** The chunks the writer was shown. Pointers outside this set are fetched through `fetchPage`. */
    chunks: GateChunk[];
    /** Loads a wiki page by path for pointers that were not in the grounding set. Optional. */
    fetchPage?: PageFetcher;
    /** Extra page metadata by page path (tests, or callers that already have it). */
    pageMetaByPath?: Record<string, Partial<PointerPageMeta>>;
}

const REASON_CODES: ReasonCode[] = [
    'UNRESOLVED_SOURCE', 'UNSOURCED_FACT', 'UNVERIFIED_QUOTE', 'DATE_SCOPE_MISMATCH', 'UNSUPPORTED_MODALITY',
    'PRODUCT_SCOPE_MISMATCH', 'INDEPENDENCE_INFLATED', 'UNVERIFIED_IDENTIFIER', 'DERIVED_AS_SOURCE', 'CHROME_LEAK',
];

// ---------------------------------------------------------------------------
// Chrome the model must never emit (the view endpoint owns it)
// ---------------------------------------------------------------------------

/**
 * Model-authored chrome. The 2026-09-10 artifact carried a `<footer>` with Copy-as-prompt and
 * Save-as-PDF buttons, a "Generation audit (verbalized-sampling commitment)" details block and a
 * `__HIC_ARTIFACT_META__` JSON script, because the composer skill's checklist required them and the
 * proxy then wrapped a second set. Every one of these is reporting-depth chrome under
 * .claude/CLAUDE.md and is stripped here before the reader sees the document.
 */
const CHROME_PATTERNS: Array<{ name: string; re: RegExp }> = [
    { name: 'vs_thinking block', re: /<(vs_thinking|emphasis_vs|commit_to|why_committed|thinking)\b[^>]*>[\s\S]*?<\/\1>/gi },
    { name: 'artifact metadata script', re: /<script[^>]*id=["']__HIC_ARTIFACT_META__["'][^>]*>[\s\S]*?<\/script>/gi },
    { name: 'artifact metadata script', re: /<script[^>]*type=["']application\/json["'][^>]*>\s*\{[\s\S]*?"generator"[\s\S]*?<\/script>/gi },
    { name: 'generation audit block', re: /<details\b[^>]*>(?:(?!<\/details>)[\s\S])*?(?:generation audit|verbalized[- ]sampling|vs[- ]audit|committed:?)(?:(?!<\/details>)[\s\S])*?<\/details>/gi },
    { name: 'chrome footer', re: /<footer\b[^>]*>(?:(?!<\/footer>)[\s\S])*?(?:copy as prompt|copy-as-prompt|save as pdf|save-as-pdf|open in chat|open-in-chat|generation audit|artifact metadata)(?:(?!<\/footer>)[\s\S])*?<\/footer>/gi },
    { name: 'chrome button', re: /<button\b[^>]*(?:id=["'](?:copy-as-prompt|save-as-pdf|open-in-chat|print-btn)["']|class=["'][^"']*copy-btn[^"']*["'])[^>]*>[\s\S]*?<\/button>/gi },
    { name: 'chrome button', re: /<button\b[^>]*>\s*(?:copy as prompt|save as pdf|open in (?:hic )?chat|download (?:pdf|png|pptx))\s*<\/button>/gi },
    { name: 'export bar', re: /<(?:div|nav|section)\b[^>]*class=["'][^"']*(?:export-bar|copy-buttons|__hic_artifact_export_bar|__hic_copy_buttons)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|nav|section)>/gi },
    { name: 'chrome text', re: /<p\b[^>]*>\s*(?:artifact metadata|hic artifact\s*[·-]\s*#\w+)[\s\S]*?<\/p>/gi },
];

export interface ChromeStrip { html: string; stripped: string[]; }

export function stripModelChrome(html: string): ChromeStrip {
    let out = String(html || '');
    const stripped: string[] = [];
    for (const { name, re } of CHROME_PATTERNS) {
        out = out.replace(re, () => { stripped.push(name); return ''; });
    }
    // A footer left empty by the button strip is noise.
    out = out.replace(/<footer\b[^>]*>\s*<\/footer>/gi, '');
    return { html: out, stripped };
}

// ---------------------------------------------------------------------------
// Claim row extraction
// ---------------------------------------------------------------------------

const BLOCK_TAGS = 'p|li|td|th|dd|dt|h1|h2|h3|h4|h5|h6|blockquote|figcaption|summary';
const BLOCK_RE = new RegExp(`<(${BLOCK_TAGS})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
/** Pointer (chunk-level `path.md#cN`, or page-level `dir/path.md`) with an optional commentary tail inside the bracket. */
const BRACKET_RE = /\[\s*((?:[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)(?:\s*[,;]\s*[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?)*)((?:\s*[,;]\s*[^\]\n]{1,80})?)\s*\]/gi;
const BARE_POINTER_RE = /[\w.\\-]+\/[\w./\\-]+\.md#c\d+/gi;
const DERIVED_TAIL_RE = /\b(via|from|paraphrased from|per|according to|summari[sz]ed from)\s+(?:the\s+)?(theme|themes|analysis|synthesis|summary|cluster)\b/i;

function decodeEntities(s: string): string {
    return s
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/&quot;|&ldquo;|&rdquo;|&#822[01];/gi, '"').replace(/&#39;|&apos;|&lsquo;|&rsquo;|&#821[67];/gi, "'")
        .replace(/&hellip;|&#8230;/gi, '...').replace(/&mdash;|&#8212;/gi, ', ').replace(/&ndash;|&#8211;/gi, '-')
        .replace(/&rarr;|&#8594;/gi, ' to ').replace(/&#(\d+);/g, (_m, n) => { try { return String.fromCodePoint(parseInt(n, 10)); } catch { return ' '; } });
}

function innerText(inner: string): string {
    return decodeEntities(inner.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Pull pointers + bracket tails out of a text, returning the pointer-free prose. */
function splitPointers(text: string): { text: string; pointers: string[]; tails: string[] } {
    const pointers: string[] = [];
    const tails: string[] = [];
    const cleaned = String(text || '')
        .replace(BRACKET_RE, (_m, group: string, tail: string) => {
            for (const p of group.split(/[,;]/)) { const t = p.trim(); if (t && !pointers.includes(t)) pointers.push(t); }
            const tt = String(tail || '').replace(/^\s*[,;]\s*/, '').trim();
            if (tt) tails.push(tt);
            return '';
        })
        .replace(BARE_POINTER_RE, (m) => { if (!pointers.includes(m)) pointers.push(m); return ''; })
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:])/g, '$1')
        .trim();
    return { text: cleaned, pointers, tails };
}

/**
 * Quoted spans, paired SEQUENTIALLY. A single regex over `"..."` re-pairs the closing quote of one
 * quotation with the opening quote of the next and yields the prose between them as a "quote" (seen on
 * the 2026-09-10 replay: `... and vice versa" [ptr]. Annotations extend this: teams who add "` was
 * checked as a quotation and failed). Curly quotes are normalized first, then odd segments are quotes.
 */
function quotedSpans(text: string, minLen = 24): string[] {
    const t = String(text || '').replace(/[“”„]/g, '"');
    const parts = t.split('"');
    if (parts.length < 3) return [];
    const out: string[] = [];
    for (let i = 1; i < parts.length; i += 2) {
        const seg = parts[i].trim();
        if (seg.length >= minLen) out.push(seg);
    }
    return out;
}
const QUOTE_SPAN_RE = /["“”]([^"“”]{24,})["“”]/;
const STAT_RE = /(?<![\w.])\d+(?:\.\d+)?\s?(?:%|percent|x\b|bps)|\$\s?\d|(?<![\w.])\d{2,}(?![\w%])/i;
const NON_FACTUAL_RE = /\b(should|must|recommend\w*|consider|propose\w*|we will|plan to|could|may|might|adopt|install|build|wire|let the|make the|start with|author an?)\b/i;
const DECLARATIVE_RE = /\b(is|are|was|were|has|have|ships?|shipped|launch\w*|announc\w*|support\w*|expos\w*|provid\w*|requir\w*|lack\w*|document\w*|deliver\w*|route\w*|run\w*|depend\w*|correct\w*|detect\w*|emit\w*|scan\w*|output\w*|bring\w*|post\w*|ensur\w*|guarantee\w*|prove\w*|proves|eliminat\w*|converg\w*|corrupt\w*)\b/i;
const PROPER_RE = /\b[A-Z][a-zA-Z0-9]+(?:[ -][A-Z][a-zA-Z0-9]+)*\b/;

/**
 * An absolute word that is part of a compound or a proper noun is not an absolute claim: "First-Year
 * Student", "first-year cohort", "the First Year Experience Program", "all-hands". The live #prd run
 * blocked "Incoming First-Year Student" as an unsourced absolute. The word is neutralized before the
 * factual-claim and population tests read the sentence; the sentence itself is never changed.
 */
function neutralizeCompoundAbsolutes(text: string): string {
    return String(text || '')
        // hyphenated compound, any case: first-year, First-Year, all-hands
        .replace(/\b(first|all|every|only|each)(?=-[A-Za-z])/gi, 'compound')
        // a capitalized absolute inside a proper-noun run, mid-sentence: "the First Year Experience Program"
        .replace(/(?<=[a-z,;:)]\s+)(First|All|Every|Only|Each|Most)(?=\s+[A-Z][a-z])/g, 'Proper');
}

function factualClaim(text: string): boolean {
    return isFactualClaim(neutralizeCompoundAbsolutes(text));
}

/** The prose of a row with every quoted span removed: what the DELIVERABLE says, not what a source said. */
function unquotedProse(text: string): string {
    return String(text || '').replace(/[“”„]/g, '"').split('"').filter((_, i) => i % 2 === 0).join(' ').replace(/\s+/g, ' ').trim();
}

export function classifyClaim(text: string): ClaimType {
    const t = String(text || '').trim();
    if (t.split(/\s+/).length < 6) return 'label';
    if (NON_FACTUAL_RE.test(t)) return 'recommendation';
    if (factualClaim(t)) return 'fact';
    if (DECLARATIVE_RE.test(t) && PROPER_RE.test(t)) return 'fact';
    return 'judgment';
}

// ---- block scanner ----------------------------------------------------------------------------------
//
// 2026-10-01: the gate used to read blocks with one lazy regex and SKIP any block that held another
// block; the regex then consumed the outer block, so its inner blocks were never visited either. A
// <blockquote><p>, a <td><p> or an <li><p> was invisible. The scanner below walks the tag stream with
// an element stack and emits LEAF blocks as rows. When a block holds both prose and child blocks
// (`<li>Lead text<ul><li>a</li></ul></li>`), each contiguous run of its own prose between the children
// is a row of its own, so nothing is read twice and nothing is dropped. Unclosed <p>, <li>, <dt>, <dd>,
// <td>, <th> close the way an HTML parser closes them.

const BLOCK_TAG_SET = new Set(BLOCK_TAGS.split('|'));
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'template', 'noscript', 'textarea']);
const IMPLIED_CLOSE_FAMILY: Record<string, string[]> = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], td: ['td', 'th'], th: ['td', 'th'] };
/** A typed design-decision target is exempt from the number rule: its text never reaches a row (spec 3.5). */
const TARGET_ELEMENT_RE = /<(div|span|p|li|td|dd)\b[^>]*\bdata-requirement-target\b[^>]*>[\s\S]*?<\/\1>/gi;

type MarkedKind = 'spec' | 'ref' | null;
interface RawBlock { pos: number; tag: string; openTag: string; rawInner: string; marked: MarkedKind; target: boolean }
interface OpenElement {
    tag: string; openStart: number; openEnd: number; openTag: string; block: boolean; marked: MarkedKind;
    hasChildBlock: boolean; segStart: number; segments: Array<[number, number]>;
}

function markedKindOf(openTag: string): MarkedKind {
    const m = /\bdata-claim-kind\s*=\s*["']?(spec|ref)\b/i.exec(openTag);
    return m ? (m[1].toLowerCase() as 'spec' | 'ref') : null;
}

function scanLeafBlocks(html: string): RawBlock[] {
    const src = String(html || '');
    // Comments are blanked in a scan copy (same offsets) so a commented-out tag never opens an element.
    const scan = src.replace(/<!--[\s\S]*?-->/g, c => ' '.repeat(c.length));
    const lowerScan = scan.toLowerCase();
    const out: RawBlock[] = [];
    const stack: OpenElement[] = [];
    const innermostBlock = (): OpenElement | null => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].block) return stack[k]; return null; };
    const finalize = (el: OpenElement, closeStart: number) => {
        if (!el.block) return;
        const target = /\bdata-requirement-target\b/i.test(el.openTag);
        if (!el.hasChildBlock) {
            out.push({ pos: el.openStart, tag: el.tag, openTag: el.openTag, rawInner: src.slice(el.openEnd, closeStart), marked: el.marked, target });
            return;
        }
        const segs: Array<[number, number]> = [...el.segments, [el.segStart, closeStart]];
        for (const [a, b] of segs) {
            if (b > a) out.push({ pos: a, tag: el.tag, openTag: '', rawInner: src.slice(a, b), marked: el.marked, target });
        }
    };
    /** Close stack[idx] and every element above it at [closeStart, closeEnd). */
    const closeAt = (idx: number, closeStart: number, closeEnd: number) => {
        while (stack.length > idx) finalize(stack.pop()!, closeStart);
        const parent = innermostBlock();
        if (parent) parent.segStart = closeEnd;
    };
    const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = TAG_RE.exec(scan)) !== null) {
        const closing = m[1] === '/';
        const tag = m[2].toLowerCase();
        const start = m.index;
        const end = start + m[0].length;
        if (!closing && RAW_TEXT_TAGS.has(tag)) {
            const close = lowerScan.indexOf('</' + tag, end);
            TAG_RE.lastIndex = close < 0 ? scan.length : close;
            continue;
        }
        if (closing) {
            let idx = -1;
            for (let k = stack.length - 1; k >= 0; k--) if (stack[k].tag === tag) { idx = k; break; }
            if (idx >= 0) closeAt(idx, start, end);
            continue;
        }
        if (VOID_TAGS.has(tag) || /\/>$/.test(m[0])) continue;
        const block = BLOCK_TAG_SET.has(tag);
        if (block) {
            // HTML's implied closes: a block opening inside an open <p>, or a list item / cell / term opening
            // directly inside an open sibling of its family.
            const top = stack[stack.length - 1];
            if (top && (top.tag === 'p' || (IMPLIED_CLOSE_FAMILY[tag] || []).includes(top.tag))) closeAt(stack.length - 1, start, start);
            const parent = innermostBlock();
            if (parent) { parent.hasChildBlock = true; parent.segments.push([parent.segStart, start]); }
        }
        let inherited: MarkedKind = null;
        for (let k = stack.length - 1; k >= 0; k--) if (stack[k].marked) { inherited = stack[k].marked; break; }
        stack.push({ tag, openStart: start, openEnd: end, openTag: src.slice(start, end), block, marked: markedKindOf(m[0]) || inherited, hasChildBlock: false, segStart: end, segments: [] });
    }
    while (stack.length) finalize(stack.pop()!, src.length);
    return out.sort((a, b) => a.pos - b.pos);
}

export function extractClaimRows(html: string): ClaimRow[] {
    const rows: ClaimRow[] = [];
    let i = 0;
    for (const blk of scanLeafBlocks(html)) {
        const tag = blk.tag;
        const rawInner = blk.rawInner;
        const flat = innerText(rawInner.replace(TARGET_ELEMENT_RE, ' '));
        if (!flat) continue;
        const { text, pointers, tails } = splitPointers(flat);
        if (text.length < 12) {
            // A pointer-only block (`<p class="cite">[articles/x.md#c3]</p>`) is the citation of the block
            // before it: a pull quote whose attribution lives in a sibling element. Adopt it there.
            if (pointers.length && rows.length && text.replace(/[\s.,;:()]/g, '').length < 3) {
                const prev = rows[rows.length - 1];
                for (const p of pointers) if (!prev.pointers.includes(p)) prev.pointers.push(p);
                prev.bracketTails.push(...tails);
            }
            continue;
        }
        let kind: ClaimKind;
        let claimType: ClaimType;
        if (blk.marked === 'ref') { kind = 'ref'; claimType = 'label'; }
        else if (blk.marked === 'spec' || blk.target) { kind = 'spec'; claimType = 'decision'; }
        else {
            const isQuote = tag === 'blockquote' || /class=["'][^"']*quote/i.test(blk.openTag) || quotedSpans(text).length > 0 || /^["“].{20,}["”]$/.test(text);
            kind = isQuote ? 'quote' : (STAT_RE.test(text) ? 'stat' : 'text');
            claimType = classifyClaim(text);
        }
        rows.push({ id: `r${++i}`, tag, text, rawInner, pointers, bracketTails: tails, kind, claimType });
    }
    return rows;
}

/** Spec and ref rows are decisions and references: exempt from every evidence check but the quote check. */
function isExempt(row: ClaimRow): boolean { return row.kind === 'spec' || row.kind === 'ref'; }

// ---------------------------------------------------------------------------
// Objective analysis: subject entities and the as-of window
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
    jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH_WORD = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MONTH_YEAR_RE = new RegExp(`\\b(${MONTH_WORD})\\.?\\s+((?:19|20)\\d{2})\\b`, 'gi');
const MONTH_EVENT_RE = new RegExp(`\\b(${MONTH_WORD})\\.?\\s+(?:(?:19|20)\\d{2}\\s+)?(beta|launch|release|announcement|rollout|update|version)\\b`, 'gi');
const YEAR_RE = /\b(?:in|as of|since|by|until|before|after|the|late|early|mid)\s+((?:19|20)\d{2})\b/gi;

const ENTITY_STOP = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'these', 'those', 'what', 'which', 'when', 'where', 'how', 'why',
    'generate', 'produce', 'structure', 'cover', 'detail', 'detailing', 'scour', 'identify', 'deliver', 'define', 'as', 'of',
    'technical', 'white', 'paper', 'whitepaper', 'report', 'brief', 'explainer', 'strategy', 'analysis', 'research',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'model', 'context', 'protocol', 'design', 'system', 'systems', 'integration', 'integrations', 'agentic', 'agent', 'agents',
    'ai', 'api', 'apis', 'mcp', 'html', 'pdf', 'no', 'earlier', 'later', 'all', 'possible', 'use', 'cases',
]);

export interface ObjectiveProfile {
    /** Lowercased subject tokens, most frequent first (e.g. ["figma", "webhooks"]). */
    subjects: string[];
    /** The as-of window the user asked for, as year-month numbers. */
    asOf: { fromYm: number | null; toYm: number | null };
}

function ym(year: number, month: number): number { return year * 100 + month; }

export function profileObjective(goalText: string): ObjectiveProfile {
    const g = String(goalText || '');
    const counts = new Map<string, number>();
    for (const m of g.match(/\b[A-Z][a-zA-Z0-9]{2,}(?:'s)?\b/g) || []) {
        const w = m.replace(/'s$/, '').toLowerCase();
        if (ENTITY_STOP.has(w)) continue;
        counts.set(w, (counts.get(w) || 0) + 1);
    }
    // Possessive or parenthetical subjects ("Figma's", "Figma (the design tool)") are the strongest signal.
    for (const m of g.match(/\b([A-Z][a-zA-Z0-9]{2,})(?:'s|\s*\()/g) || []) {
        const w = m.replace(/'s|\s*\(/g, '').toLowerCase();
        if (!ENTITY_STOP.has(w)) counts.set(w, (counts.get(w) || 0) + 3);
    }
    const subjects = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([w]) => w);

    let fromYm: number | null = null;
    let toYm: number | null = null;
    const lower = g.toLowerCase();
    // "August-September 2026", "as of September 2026", "no earlier than January 2026"
    const range = new RegExp(`\\b(${MONTH_WORD})\\s*[-–to]+\\s*(${MONTH_WORD})\\s+((?:19|20)\\d{2})`, 'i').exec(lower);
    if (range) {
        fromYm = ym(parseInt(range[3], 10), MONTHS[range[1]]);
        toYm = ym(parseInt(range[3], 10), MONTHS[range[2]]);
    }
    const asOf = new RegExp(`as of\\s+(?:the\\s+)?(${MONTH_WORD})\\s+((?:19|20)\\d{2})`, 'i').exec(lower);
    if (asOf) toYm = ym(parseInt(asOf[2], 10), MONTHS[asOf[1]]);
    const noEarlier = new RegExp(`no earlier than\\s+(${MONTH_WORD})\\s+((?:19|20)\\d{2})`, 'i').exec(lower);
    if (noEarlier) fromYm = ym(parseInt(noEarlier[2], 10), MONTHS[noEarlier[1]]);
    return { subjects, asOf: { fromYm, toYm } };
}

// ---------------------------------------------------------------------------
// Source-side helpers
// ---------------------------------------------------------------------------

function pageOf(pointer: string): string { return String(pointer || '').replace(/#c\d+$/i, '').trim(); }

function normalizeUrl(u: string): string {
    let s = String(u || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
    // A Reddit thread is one origin regardless of the comment permalink.
    const reddit = /^(?:old\.)?reddit\.com\/r\/([^/]+)\/comments\/([a-z0-9]+)/.exec(s);
    if (reddit) s = `reddit.com/r/${reddit[1]}/comments/${reddit[2]}`;
    return s;
}

function parseYm(dateStr: string): number | null {
    const s = String(dateStr || '').trim();
    if (!s) return null;
    const iso = /^(\d{4})-(\d{2})/.exec(s);
    if (iso) return ym(parseInt(iso[1], 10), parseInt(iso[2], 10));
    const dmy = /\b\d{1,2}\s+([A-Za-z]{3,9})\s+((?:19|20)\d{2})\b/.exec(s);
    if (dmy && MONTHS[dmy[1].toLowerCase()]) return ym(parseInt(dmy[2], 10), MONTHS[dmy[1].toLowerCase()]);
    const mdy = /\b([A-Za-z]{3,9})\s+\d{1,2},?\s+((?:19|20)\d{2})\b/.exec(s);
    if (mdy && MONTHS[mdy[1].toLowerCase()]) return ym(parseInt(mdy[2], 10), MONTHS[mdy[1].toLowerCase()]);
    return null;
}

/** Vendor token for a vendor-owned source ("webflow_blog" -> "webflow", "Figma Blog" -> "figma"). */
function vendorOfSource(meta: Partial<PointerPageMeta> | null | undefined, pagePath: string): string | null {
    const name = String(meta?.sourceName || '').toLowerCase().trim();
    const slug = pagePath.split('/')[1] || '';
    const candidate = name || slug.toLowerCase();
    if (!/(blog|newsroom|docs|developer|help|release|engineering|changelog)/.test(candidate)) return null;
    const first = candidate.split(/[\s_/-]+/)[0];
    if (!first || first.length < 4 || /^(the|blog|news|docs|help|developer|engineering)$/.test(first)) return null;
    return first;
}

export const HEDGE_RE = /\b(or something|i think|something like|if i recall|iirc|not sure|maybe|i believe|i guess|kind of|sort of)\b/i;
const RECOLLECTION_FRAME_RE = /\b(reported|recalled|recollect\w*|described|according to (?:a|one) practitioner|one practitioner|a practitioner|a designer|a user|posted|wrote|said|commenter|remembered|paraphras\w+)\b/i;
const STRONG_MODAL_RE = /\b(ensures?|ensuring|guarantee[sd]?|guaranteeing|requires?|required|proves?|proven|eliminates?|non-negotiable|cannot|can't|never|always|the only|does not drift|will not|makes? (?:\w+ ){0,3}(?:correct|deterministic|impossible|certain)|is the (?:whole|entire) (?:point|justification|answer))\b/i;
const SOFT_MODAL_RE = /\b(can|could|may|might|help|helps|helping|lets|let|allow|allows|allowing|aim|aims|working toward|reduc\w+|more predictable|makes it easier|enable\w*|intended to|designed to|meant to)\b/i;
const POPULATION_RE = /\b(every|all|each|consensus|converg\w+|unanimous\w*|universal\w*|across the (?:corpus|board|industry|field)|practitioners agree|no one|nobody|everyone|the dominant|dominant (?:finding|pattern|practitioner)|without exception|invariably)\b/i;
const IDENT_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|(?<![\w/:.])\/[a-z][\w-]{2,}\b|\b[a-z]+[A-Z][A-Za-z]{2,}\b/g;
const PROPER_PHRASE_RE = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,4})\b/g;
const PROPER_STOP_WORDS = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'For', 'With', 'As', 'By', 'To', 'Of', 'And', 'Or', 'But', 'If', 'When', 'While', 'Because', 'Every', 'All', 'This', 'That', 'These', 'Those', 'It', 'Its', 'Give', 'Make', 'Build', 'Install', 'Wire', 'Signal', 'Treat', 'Any', 'Each']);

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export async function evaluateClaimLedger(html: string, ctx: ClaimGateContext): Promise<ClaimLedger> {
    const rows = extractClaimRows(html);
    const findings: LedgerFinding[] = [];
    const objective = profileObjective(ctx.goalText);

    // Source text per pointer: grounding chunks first, then page fetch for strays.
    const chunkById = new Map<string, GateChunk>();
    for (const c of ctx.chunks || []) if (c && c.id) chunkById.set(c.id, c);
    const pageTextCache = new Map<string, string | null>();
    const metaFor = (pointer: string): Partial<PointerPageMeta> | null => {
        const page = pageOf(pointer);
        const c = chunkById.get(pointer);
        return c?.pageMeta || ctx.pageMetaByPath?.[page] || lookupPageMeta(page) || null;
    };
    const sourceTextFor = async (pointer: string): Promise<{ norm: string; raw: string } | null> => {
        const c = chunkById.get(pointer);
        if (c && c.text) return { norm: normalizeForMatch(c.text), raw: c.text };
        const page = pageOf(pointer);
        if (!pageTextCache.has(page)) {
            let t: string | null = null;
            if (ctx.fetchPage) { try { t = await ctx.fetchPage(page); } catch { t = null; } }
            pageTextCache.set(page, t);
        }
        const t = pageTextCache.get(page);
        if (!t) return null;
        // A fetched page arrives RAW. Strip the frontmatter before matching: every ingested article
        // carries the research goal in `engagement_goal:`, so matching against the whole file would
        // let the objective's own "as of <Month Year>" attest a date no source stated (found by the
        // replay of the 2026-09-10 artifact).
        const body = t.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
        return { norm: normalizeForMatch(body), raw: body };
    };
    const originOf = (pointer: string): string => {
        const meta = metaFor(pointer);
        const c = chunkById.get(pointer);
        const u = meta?.url || (c?.sources || []).find(s => s?.u)?.u || '';
        return u ? normalizeUrl(u) : pageOf(pointer);
    };
    const kindOf = (pointer: string): string => {
        const meta = metaFor(pointer);
        const k = String(meta?.kind || '').toLowerCase();
        if (k) return k;
        return pageOf(pointer).startsWith('social-intelligence/') || /\/reddit-/i.test(pageOf(pointer)) ? 'social-post' : 'article';
    };

    const allOrigins = new Set<string>();
    const unresolved: string[] = [];
    let resolvedCount = 0;

    for (const row of rows) {
        const push = (code: ReasonCode, severity: Severity, detail: string, repair: RepairAction, pointers: string[] = row.pointers) =>
            findings.push({ code, severity, rowId: row.id, sentence: row.text.slice(0, 240), pointers, detail, repair });

        // DERIVED_AS_SOURCE: commentary inside the bracket that names a summary layer.
        for (const tail of row.bracketTails) {
            if (DERIVED_TAIL_RE.test(tail)) push('DERIVED_AS_SOURCE', 'warn', `Citation bracket credits a derived summary ("${tail}"); only the pointer is a source.`, 'strip_tail');
        }
        if (/\b(?:via|per|from)\s+(?:the\s+)?theme\b/i.test(row.text)) push('DERIVED_AS_SOURCE', 'warn', 'Sentence cites "the theme" as a source; a theme is a derived summary.', 'strip_tail');

        // Resolve pointers.
        const resolvedTexts: Array<{ pointer: string; norm: string; raw: string }> = [];
        for (const p of row.pointers) {
            const t = await sourceTextFor(p);
            if (t) { resolvedTexts.push({ pointer: p, ...t }); resolvedCount++; allOrigins.add(originOf(p)); }
            else {
                unresolved.push(p);
                push('UNRESOLVED_SOURCE', 'block', `Pointer ${p} is not among the grounding chunks and its page could not be loaded.`, 'strip_pointer', [p]);
            }
        }
        const unionNorm = resolvedTexts.map(t => t.norm).join(' \n ');
        const unionRaw = resolvedTexts.map(t => t.raw).join(' \n ');

        // UNSOURCED_FACT.
        if (row.claimType === 'fact' && resolvedTexts.length === 0 && row.tag !== 'summary') {
            // A heading is an action title: a judgment by contract (.claude/CLAUDE.md), so it earns a
            // warning, not a block, unless it carries a number. Body sentences hold the sourced facts.
            const isHeading = /^h[1-6]$/.test(row.tag);
            const hard = (isHeading ? STAT_RE.test(row.text) : (factualClaim(row.text) || row.kind !== 'text'));
            push('UNSOURCED_FACT', hard ? 'block' : 'warn', hard
                ? 'Declarative factual claim (quantity, absolute, comparison, causal link or quoted material) carries no resolvable pointer.'
                : 'Declarative statement about a named entity carries no pointer; state it as judgment or source it.', 'narrow');
        }
        if (resolvedTexts.length === 0) continue;

        // UNVERIFIED_QUOTE: every quoted span of 24+ chars must be verbatim in a cited chunk. A spec or ref row
        // that carries a quotation is still checked: the exemption covers decisions, never a quotation.
        if (row.kind === 'quote' || (isExempt(row) && quotedSpans(row.text).length > 0)) {
            const spans: string[] = quotedSpans(row.text);
            if (!spans.length && /^["“].{20,}["”]$/.test(row.text)) spans.push(row.text.replace(/^["“]|["”]$/g, ''));
            if (!spans.length && row.tag === 'blockquote') spans.push(row.text);
            for (const span of spans) {
                if (!quoteAppearsIn(span, unionNorm)) {
                    push('UNVERIFIED_QUOTE', 'block', `Quoted span is not verbatim in any cited chunk: "${span.slice(0, 120)}".`, 'remove_quote_marks');
                }
            }
        }

        // Spec and ref rows stop here: a date, a scope or a name in a decision is the decision's, not a source's.
        if (isExempt(row)) continue;

        // DATE_SCOPE_MISMATCH: month-year mentions must appear in cited text or equal a cited publication month.
        const citedYms = new Set<number>();
        const citedYears = new Set<number>();
        for (const t of resolvedTexts) {
            const meta = metaFor(t.pointer);
            const y = parseYm(String(meta?.date || ''));
            if (y) { citedYms.add(y); citedYears.add(Math.floor(y / 100)); }
        }
        const mentions: Array<{ label: string; y: number | null; m: number | null; eventWord?: string }> = [];
        let dm: RegExpExecArray | null;
        const myre = new RegExp(MONTH_YEAR_RE.source, 'gi');
        while ((dm = myre.exec(row.text)) !== null) mentions.push({ label: dm[0], y: parseInt(dm[2], 10), m: MONTHS[dm[1].toLowerCase()] || null });
        const mere = new RegExp(MONTH_EVENT_RE.source, 'gi');
        while ((dm = mere.exec(row.text)) !== null) {
            if (mentions.some(x => x.label.toLowerCase().startsWith(dm![1].toLowerCase()))) continue;
            mentions.push({ label: dm[0], y: null, m: MONTHS[dm[1].toLowerCase()] || null, eventWord: dm[2] });
        }
        const yre = new RegExp(YEAR_RE.source, 'gi');
        while ((dm = yre.exec(row.text)) !== null) {
            const yv = parseInt(dm[1], 10);
            if (mentions.some(x => x.y === yv)) continue;
            mentions.push({ label: dm[0], y: yv, m: null });
        }
        for (const mention of mentions) {
            const inText = new RegExp(mention.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i').test(unionRaw)
                || (mention.y !== null && mention.m !== null && new RegExp(`\\b${mention.y}-${String(mention.m).padStart(2, '0')}\\b`).test(unionRaw));
            if (inText) continue;
            if (mention.y !== null && mention.m !== null) {
                if (citedYms.has(ym(mention.y, mention.m))) continue;
                const projected = objective.asOf.toYm === ym(mention.y, mention.m) || objective.asOf.fromYm === ym(mention.y, mention.m);
                const cited = Array.from(citedYms).map(v => `${Math.floor(v / 100)}-${String(v % 100).padStart(2, '0')}`).join(', ') || 'undated';
                push('DATE_SCOPE_MISMATCH', 'block', projected
                    ? `"${mention.label}" is the objective's as-of window projected onto sources published ${cited}. The as-of window is the review date; date the capability by its source.`
                    : `"${mention.label}" appears in no cited chunk and matches no cited publication month (${cited}).`, 'narrow');
            } else if (mention.m !== null && mention.eventWord) {
                if (Array.from(citedYms).some(v => v % 100 === mention.m)) continue;
                push('DATE_SCOPE_MISMATCH', 'block', `"${mention.label}" dates a ${mention.eventWord} to a month no cited source was published in.`, 'narrow');
            } else if (mention.y !== null) {
                if (citedYears.has(mention.y) || new RegExp(`\\b${mention.y}\\b`).test(unionRaw)) continue;
                push('DATE_SCOPE_MISMATCH', 'warn', `Year ${mention.y} appears in no cited chunk and matches no cited publication year.`, 'narrow');
            }
        }

        // UNSUPPORTED_MODALITY: guarantee language over sources that only say can / helps / lets.
        if (row.claimType === 'fact' && row.kind !== 'quote' && STRONG_MODAL_RE.test(row.text)) {
            const strongInSource = STRONG_MODAL_RE.test(unionRaw);
            const softInSource = SOFT_MODAL_RE.test(unionRaw);
            if (!strongInSource && softInSource) {
                const strong = row.text.match(new RegExp(STRONG_MODAL_RE.source, 'i'))?.[0] || '';
                const soft = unionRaw.match(new RegExp(SOFT_MODAL_RE.source, 'i'))?.[0] || '';
                push('UNSUPPORTED_MODALITY', 'block', `Sentence says "${strong}" where the cited sources say "${soft}". Keep the source's modality.`, 'narrow');
            }
        }

        // PRODUCT_SCOPE_MISMATCH: a vendor-owned page about another product describing the subject.
        if (objective.subjects.length) {
            const lower = row.text.toLowerCase();
            const namesSubject = objective.subjects.slice(0, 3).some(s => lower.includes(s));
            for (const t of resolvedTexts) {
                const vendor = vendorOfSource(metaFor(t.pointer), pageOf(t.pointer));
                if (!vendor) continue;
                if (objective.subjects.some(s => s.includes(vendor) || vendor.includes(s))) continue;
                if (lower.includes(vendor)) continue;              // the analogy is named
                if (!namesSubject) continue;                        // sentence is not about the subject
                push('PRODUCT_SCOPE_MISMATCH', 'block', `Cites a ${vendor} source to describe ${objective.subjects[0]}; name the analogy ("by analogy, ${vendor} ...") or repoint to a ${objective.subjects[0]} source.`, 'name_the_analogy', [t.pointer]);
            }
        }

        // INDEPENDENCE_INFLATED: population words need three independent origins. Only the deliverable's own
        // prose is read: a population word inside a VERBATIM quote is the source speaking ("Salesforce is all
        // over the place"), not the document generalizing across sources. A first-person job story ("I want to
        // see every application") states a user's goal, not a population claim.
        const ownProse = neutralizeCompoundAbsolutes(unquotedProse(row.text));
        if (row.claimType === 'fact' && POPULATION_RE.test(ownProse) && !/\b(every|all|each) (?:day|week|month|quarter|year|session|edit|frame|write|read|call|request|page|file)s?\b/i.test(ownProse)
            && !/\bI want to\b/i.test(ownProse)) {
            const origins = new Set(resolvedTexts.map(t => originOf(t.pointer)));
            if (origins.size < 3) {
                const dupNote = resolvedTexts.length > origins.size ? ` ${resolvedTexts.length} pointers resolve to ${origins.size} origin(s); duplicates share one URL.` : '';
                push('INDEPENDENCE_INFLATED', 'block', `Population or consensus language ("${ownProse.match(new RegExp(POPULATION_RE.source, 'i'))?.[0]}") rests on ${origins.size} independent origin(s).${dupNote} State the count or name the sources.`, 'narrow');
            }
        }

        // UNVERIFIED_IDENTIFIER: identifiers and proper-noun phrases must exist in the cited chunks.
        if (row.claimType === 'fact' || row.kind === 'quote') {
            const idents = new Set<string>();
            let im: RegExpExecArray | null;
            const ire = new RegExp(IDENT_RE.source, 'g');
            while ((im = ire.exec(row.text)) !== null) idents.add(im[0]);
            for (const ident of idents) {
                const needle = ident.toLowerCase();
                const present = resolvedTexts.filter(t => t.raw.toLowerCase().includes(needle));
                if (!present.length) {
                    push('UNVERIFIED_IDENTIFIER', 'block', `Identifier "${ident}" appears in no cited chunk.`, 'narrow');
                    continue;
                }
                const onlySocial = present.every(t => kindOf(t.pointer) === 'social-post');
                const hedged = present.some(t => {
                    const idx = t.raw.toLowerCase().indexOf(needle);
                    return HEDGE_RE.test(t.raw.slice(Math.max(0, idx - 90), idx + needle.length + 90));
                });
                if ((onlySocial || hedged) && !RECOLLECTION_FRAME_RE.test(row.text) && !/["“]/.test(row.text)) {
                    push('UNVERIFIED_IDENTIFIER', 'block', `Identifier "${ident}" is attested only ${onlySocial ? 'in social-post text' : 'in hedged text'}${hedged ? ' ("or something", "I think")' : ''}; report it as a practitioner recollection, not a documented capability.`, 'reframe_as_recollection');
                }
            }
            {
                // Proper-noun phrases in the UNQUOTED prose (quoted spans are verbatim-checked above; the
                // invented expansion "Endpoint Security Bot" sat outside the quotation marks on the replay).
                const unquoted = row.text.replace(/[“”„]/g, '"').split('"').filter((_, i) => i % 2 === 0).join(' ');
                const hasWord = (w: string) => new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(unionNorm);
                let pm: RegExpExecArray | null;
                const pre = new RegExp(PROPER_PHRASE_RE.source, 'g');
                while ((pm = pre.exec(unquoted)) !== null) {
                    const words = pm[1].split(/\s+/).filter(w => !PROPER_STOP_WORDS.has(w));
                    if (words.length < 2) continue;
                    const phraseNorm = words.join(' ').toLowerCase();
                    if (objective.subjects.length && words.every(w => objective.subjects.includes(w.toLowerCase()))) continue;
                    if (unionNorm.includes(normalizeForMatch(phraseNorm))) continue;
                    // Loose form: every word (as a whole word) within a short window of the cited text.
                    const wordHits = words.map(hasWord);
                    if (wordHits.every(Boolean)) {
                        const first = unionNorm.search(new RegExp(`\\b${words[0].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
                        const window = unionNorm.slice(Math.max(0, first - 120), first + 160);
                        if (words.every(w => new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(window))) continue;
                    }
                    if (!wordHits.some(Boolean)) continue;         // not about the sources at all; a heading or a framing
                    push('UNVERIFIED_IDENTIFIER', wordHits.every(Boolean) ? 'warn' : 'block',
                        `Named phrase "${pm[1]}" does not appear in the cited chunks${wordHits.every(Boolean) ? ' as written' : ` (missing: ${words.filter((_, i) => !wordHits[i]).join(', ')})`}. Use the name the source uses.`, 'narrow');
                }
            }
        }
    }

    // DOCUMENT-LEVEL DATE PASS. A pointer-less row (a kicker, a title, a caption) that dates the
    // subject to the objective's as-of month, when no cited source anywhere in the document carries
    // that month, is the as-of window projected onto the headline. This is exactly the review's C01
    // ("TECHNICAL WHITE PAPER · SEP 2026 · BETA-STATE" over sources from 2025-04 to 2026-06).
    const docYms = new Set<number>();
    const docTextParts: string[] = [];
    for (const [ptr, c] of chunkById) { if (c.text) docTextParts.push(c.text); const y = parseYm(String(metaFor(ptr)?.date || '')); if (y) docYms.add(y); }
    for (const row of rows) for (const p of row.pointers) { const y = parseYm(String(metaFor(p)?.date || '')); if (y) docYms.add(y); }
    for (const t of pageTextCache.values()) if (t) docTextParts.push(t.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ''));
    const docText = docTextParts.join(' \n ');
    const asOfTargets = [objective.asOf.toYm, objective.asOf.fromYm].filter((v): v is number => v !== null);
    if (asOfTargets.length) {
        for (const row of rows) {
            if (row.pointers.length || isExempt(row)) continue;
            let dm: RegExpExecArray | null;
            const myre = new RegExp(MONTH_YEAR_RE.source, 'gi');
            while ((dm = myre.exec(row.text)) !== null) {
                const y = ym(parseInt(dm[2], 10), MONTHS[dm[1].toLowerCase()] || 0);
                if (!asOfTargets.includes(y) || docYms.has(y)) continue;
                if (new RegExp(dm[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i').test(docText)) continue;
                findings.push({
                    code: 'DATE_SCOPE_MISMATCH', severity: 'block', rowId: row.id, sentence: row.text.slice(0, 240), pointers: [],
                    detail: `"${dm[0]}" is the objective's as-of window used as a headline date; no cited source in the document is published in or mentions that month. Date the subject by its sources, or say "as of this review".`,
                    repair: 'narrow',
                });
            }
        }
    }

    // DOCUMENT-LEVEL IDENTIFIER PASS. A pointer-less fact row (a capability table cell, a caption) that
    // names a tool, command or API must still find that identifier somewhere in the document's cited
    // sources; hedged text there ("or something") makes it a recollection, not an inventory entry.
    // The replay's capability table listed get_variable and make_design_system_kit with no citation.
    const docLower = docText.toLowerCase();
    for (const row of rows) {
        if (row.pointers.length || row.claimType !== 'fact') continue;
        if (RECOLLECTION_FRAME_RE.test(row.text) || /["“]/.test(row.text)) continue;
        let im: RegExpExecArray | null;
        const ire = new RegExp(IDENT_RE.source, 'g');
        const seen = new Set<string>();
        while ((im = ire.exec(row.text)) !== null) {
            const ident = im[0];
            if (seen.has(ident)) continue;
            seen.add(ident);
            const needle = ident.toLowerCase();
            const idx = docLower.indexOf(needle);
            if (idx < 0) {
                findings.push({ code: 'UNVERIFIED_IDENTIFIER', severity: 'block', rowId: row.id, sentence: row.text.slice(0, 240), pointers: [], detail: `Identifier "${ident}" appears in none of the document's cited sources.`, repair: 'narrow' });
                continue;
            }
            const hedged = HEDGE_RE.test(docText.slice(Math.max(0, idx - 90), idx + needle.length + 90));
            if (hedged) {
                findings.push({ code: 'UNVERIFIED_IDENTIFIER', severity: 'block', rowId: row.id, sentence: row.text.slice(0, 240), pointers: [], detail: `Identifier "${ident}" is attested only in hedged text ("or something", "I think"); report it as a practitioner recollection, not a documented capability.`, repair: 'reframe_as_recollection' });
            }
        }
    }

    const summary = Object.fromEntries(REASON_CODES.map(c => [c, 0])) as Record<ReasonCode, number>;
    for (const f of findings) summary[f.code]++;
    const blocking = findings.filter(f => f.severity === 'block').length;
    return {
        rows, findings, summary, blocking, warnings: findings.length - blocking, pass: blocking === 0,
        independentOrigins: allOrigins.size, resolvedPointers: resolvedCount,
        unresolvedPointers: Array.from(new Set(unresolved)),
        exemptRows: rows.filter(isExempt).length,
    };
}

// ---------------------------------------------------------------------------
// Deterministic fixes and the narrowing instruction
// ---------------------------------------------------------------------------

/** Remove commentary tails from citation brackets and drop unresolved pointers. Never adds anything. */
export function applyDeterministicFixes(html: string, ledger: ClaimLedger): string {
    let out = String(html || '');
    const dead = new Set(ledger.unresolvedPointers);
    out = out.replace(BRACKET_RE, (_m, group: string) => {
        const keep = group.split(/[,;]/).map(s => s.trim()).filter(p => p && !dead.has(p));
        return keep.length ? `[${keep.join(', ')}]` : '';
    });
    return out;
}

/** The model-facing repair text. Narrowing only: the prohibitions are the point. */
export function buildNarrowingInstruction(ledger: ClaimLedger): string {
    // Spec and ref rows are never narrowed: a requirement or an acceptance test is a decision, and the repair
    // model rewriting it changes the specification (the live #prd run "narrowed" acceptance tests).
    const exempt = new Set(ledger.rows.filter(isExempt).map(r => r.id));
    const blocking = ledger.findings.filter(f => f.severity === 'block' && f.repair !== 'strip_pointer' && f.repair !== 'strip_tail' && (!exempt.has(f.rowId) || f.repair === 'remove_quote_marks'));
    if (!blocking.length) return '';
    const lines = blocking.map(f => {
        const how = f.repair === 'reframe_as_recollection' ? 'Reframe as what a practitioner reported, in quotation marks or with "a practitioner on the forum described".'
            : f.repair === 'name_the_analogy' ? 'Name the other product explicitly as an analogy, or delete the comparison.'
            : f.repair === 'remove_quote_marks' ? 'Remove the quotation marks and restate as plain prose, or replace with a verbatim span from the cited chunk (copy exactly).'
            : 'Narrow the sentence to what the cited text itself says; drop the unsupported date, guarantee, count or name.';
        return `- [${f.code}] ${f.detail}\n  Sentence: "${f.sentence}"\n  Fix: ${how}`;
    });
    return lines.join('\n');
}

export function ledgerSummaryLine(ledger: ClaimLedger): string {
    const parts = REASON_CODES.filter(c => ledger.summary[c] > 0).map(c => `${c} ${ledger.summary[c]}`);
    const exempt = ledger.exemptRows ? ` (${ledger.exemptRows} spec/ref rows exempt)` : '';
    return `${ledger.rows.length} claim rows${exempt}, ${ledger.resolvedPointers} pointers resolved, ${ledger.independentOrigins} independent origins, ${ledger.blocking} blocking, ${ledger.warnings} warning(s)${parts.length ? `: ${parts.join(', ')}` : ''}`;
}
