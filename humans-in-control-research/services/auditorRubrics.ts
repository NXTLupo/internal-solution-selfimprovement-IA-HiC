// services/auditorRubrics.ts - 2026-10-01 (plan Stage 2.6, 3.7, 5.4; audit C6, C8)
//
// The per-deliverable auditor rubrics that used to live as prose in
// .claude/agents/*-deliverable-auditor.md (zero runtime references, verdict file never written)
// are now data: hic-workspace/wiki/eval/rubrics/<kind>-rubric.json, registered in
// hic-workspace/wiki/eval/rubrics/index.json. This module is the runtime half:
//
//   - loadRubricForKind(): resolves an ArtifactKind through the index (aliases included).
//     A kind the index cannot resolve is a MISSING RUBRIC; the caller (runExpertPanel) fails
//     the panel as a degradation event instead of shipping unreviewed.
//   - scoreRubric(): scores every criterion 1-5. Deterministic checks run here; a model score
//     (when the panel could afford one) can only LOWER a deterministic score, never raise it,
//     per the auditGate doctrine that the gate declares verified, not the model.
//   - verdictFor(): pass / refine / withhold. A blocking criterion scored 1 withholds.
//   - appendAuditorVerdict(): one JSONL line per artifact to wiki/eval/auditor-verdicts.jsonl.
//
// Everything here is pure except the two fetch wrappers, and both take an injectable fetch.

import { detectAllSlop, detectDetectOnlySlop } from './slidePostProcessor';
import { evaluateTitle } from './titleGate';
import { checkPrdTraceIntegrity } from './prdTraceIntegrity';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RubricCriterion {
    id: string;
    n: number;
    label: string;
    five: string;
    one: string;
    /** Minimum passing score for this criterion (default 3). */
    floor: number;
    /** A score of 1 on a blocking criterion withholds the artifact. */
    blocking: boolean;
    /** Id of a DETERMINISTIC_CHECKS entry, or null when only a model can score it. */
    deterministic_check: string | null;
}

export interface AuditorRubric {
    rubric_id: string;
    kind: string;
    version: string;
    title?: string;
    description?: string;
    criteria: RubricCriterion[];
    blocking: string[];
    decision?: Record<string, string>;
}

export interface RubricIndexEntry {
    path: string;
    version?: string;
    criteria?: number;
    blocking?: string[];
}

export interface CriticResolution {
    /** Served path of the critic's SKILL.md (nested skills live under /skills/diagrams/). */
    path?: string;
    /** The critic is a deterministic check, not a model call. */
    deterministic?: string;
}

export interface RubricIndex {
    version: string;
    updated?: string;
    rubrics: Record<string, RubricIndexEntry>;
    aliases: Record<string, string>;
    critics: Record<string, CriticResolution>;
}

export type PanelVerdict = 'pass' | 'refine' | 'withhold' | 'fail';

export interface CriterionScore {
    id: string;
    label: string;
    /** 1-5, or null when nothing could score it this run. */
    score: number | null;
    source: 'deterministic' | 'model' | 'both' | 'unscored';
    finding: string;
    blocking: boolean;
    floor: number;
}

export interface ModelCriterionScore {
    score: number;
    finding?: string;
}

export interface RubricScoreResult {
    rubric_id: string;
    rubric_version: string;
    scores: CriterionScore[];
    verdict: PanelVerdict;
    blocking_hits: string[];
    below_floor: string[];
    unscored: string[];
    /** Findings from deterministic checks that scored below the floor. */
    deterministic_failures: string[];
}

export interface AuditorVerdictRecord {
    ts: string;
    /** The ArtifactKind the panel ran for (e.g. 'persona'). */
    panel_kind: string;
    /** The rubric kind it resolved to (e.g. 'personas'). */
    kind: string;
    rubric_id: string;
    rubric_version: string;
    artifact_id?: string;
    run_id?: string;
    scores: Record<string, number | null>;
    blocking: string[];
    below_floor: string[];
    verdict: PanelVerdict;
    rebuilds: number;
    critic_errors: string[];
    deterministic_failures: string[];
    findings: string[];
    experts_fired: string[];
    cost_usd: number;
}

export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<any>; headers?: { get(name: string): string | null } }>;

export interface RubricLoadOpts {
    proxyBase?: string;
    fetchImpl?: FetchLike;
    /** Pre-supplied index (tests, or a caller that already fetched it). */
    index?: RubricIndex | null;
    /** Pre-supplied rubric bodies keyed by rubric kind (tests). */
    rubrics?: Record<string, unknown>;
}

const RUBRIC_INDEX_WIKI_PATH = 'eval/rubrics/index.json';
const AUDITOR_VERDICTS_WIKI_PATH = 'eval/auditor-verdicts.jsonl';
const DEFAULT_PROXY = 'http://localhost:5012';

// ─── Index + rubric loading ──────────────────────────────────────────────────

let _indexCache: RubricIndex | null | undefined;
const _rubricCache = new Map<string, AuditorRubric>();

/** Tests and hot-reload callers clear the module caches. */
export function resetRubricCache(): void {
    _indexCache = undefined;
    _rubricCache.clear();
}

function pickFetch(opts?: RubricLoadOpts): FetchLike | null {
    if (opts?.fetchImpl) return opts.fetchImpl;
    if (typeof fetch === 'function') return fetch as unknown as FetchLike;
    return null;
}

/** Read a wiki file body through the proxy (`/api/wiki/read`, JSON {content, exists}) and, failing
 *  that, through the static mount (`/hic-workspace/wiki/...`, served by Vite in dev and nginx in Docker). */
async function readWikiText(wikiPath: string, opts?: RubricLoadOpts): Promise<string | null> {
    const f = pickFetch(opts);
    if (!f) return null;
    const proxyBase = opts?.proxyBase ?? DEFAULT_PROXY;
    try {
        const r = await f(`${proxyBase}/api/wiki/read/${wikiPath}`);
        if (r.ok) {
            const data = await r.json();
            if (data && data.exists !== false && typeof data.content === 'string' && data.content.trim()) return data.content;
        }
    } catch { /* fall through to the static mount */ }
    try {
        const r = await f(`/hic-workspace/wiki/${wikiPath}`);
        if (r.ok) {
            const text = await r.text();
            // The SPA fallback answers unknown paths with index.html and HTTP 200.
            if (text && !/^\s*<(!doctype|html)/i.test(text)) return text;
        }
    } catch { /* missing */ }
    return null;
}

function normalizeIndex(raw: unknown): RubricIndex | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, any>;
    const rubrics = (o.rubrics && typeof o.rubrics === 'object') ? o.rubrics as Record<string, RubricIndexEntry> : {};
    if (Object.keys(rubrics).length === 0) return null;
    return {
        version: String(o.version ?? '0'),
        updated: typeof o.updated === 'string' ? o.updated : undefined,
        rubrics,
        aliases: (o.aliases && typeof o.aliases === 'object') ? o.aliases : {},
        critics: (o.critics && typeof o.critics === 'object') ? o.critics : {},
    };
}

export async function loadRubricIndex(opts?: RubricLoadOpts): Promise<RubricIndex | null> {
    if (opts?.index !== undefined) return opts.index;
    if (_indexCache !== undefined) return _indexCache;
    const text = await readWikiText(RUBRIC_INDEX_WIKI_PATH, opts);
    let parsed: RubricIndex | null = null;
    if (text) {
        try { parsed = normalizeIndex(JSON.parse(text)); } catch { parsed = null; }
    }
    // A failed read is not cached: the next panel retries instead of inheriting a transient miss.
    if (parsed) _indexCache = parsed;
    return parsed;
}

/** ArtifactKind -> rubric kind via the index (direct key first, then aliases). */
export function resolveRubricKind(index: RubricIndex | null, kind: string): string | null {
    if (!index) return null;
    const k = String(kind || '').trim();
    if (!k) return null;
    if (index.rubrics[k]) return k;
    const alias = index.aliases?.[k];
    if (alias && index.rubrics[alias]) return alias;
    return null;
}

const slugId = (s: string): string => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);

/** Tolerant normalizer: accepts `criteria[]` or `items[]`, ids or item numbers for `blocking`. */
export function normalizeRubric(raw: unknown, kind: string): AuditorRubric | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, any>;
    const list: any[] = Array.isArray(o.criteria) ? o.criteria : Array.isArray(o.items) ? o.items : [];
    if (list.length === 0) return null;
    const criteria: RubricCriterion[] = list.map((c: any, i: number) => {
        const n = Number(c?.n ?? c?.item ?? c?.number ?? i + 1);
        const label = String(c?.label ?? c?.name ?? c?.title ?? c?.text ?? `Item ${n}`);
        const id = String(c?.id || slugId(label) || `item_${n}`);
        return {
            id, n: Number.isFinite(n) ? n : i + 1, label,
            five: String(c?.five ?? c?.['5'] ?? c?.pass ?? ''),
            one: String(c?.one ?? c?.['1'] ?? c?.fail ?? ''),
            floor: Number.isFinite(Number(c?.floor)) ? Number(c.floor) : 3,
            blocking: c?.blocking === true,
            deterministic_check: typeof c?.deterministic_check === 'string' ? c.deterministic_check
                : typeof c?.check === 'string' ? c.check : null,
        };
    });
    const rawBlocking: any[] = Array.isArray(o.blocking) ? o.blocking
        : Array.isArray(o.withhold_on_one) ? o.withhold_on_one
            : Array.isArray(o.fail_on_one) ? o.fail_on_one : [];
    const blocking = new Set<string>();
    for (const b of rawBlocking) {
        if (typeof b === 'number') { const hit = criteria.find(c => c.n === b); if (hit) blocking.add(hit.id); }
        else if (typeof b === 'string') {
            const hit = criteria.find(c => c.id === b || c.n === Number(b));
            if (hit) blocking.add(hit.id);
        }
    }
    for (const c of criteria) if (c.blocking) blocking.add(c.id);
    for (const c of criteria) c.blocking = blocking.has(c.id);
    return {
        rubric_id: String(o.rubric_id || `${kind}-rubric`),
        kind: String(o.kind || kind),
        version: String(o.version ?? '0'),
        title: typeof o.title === 'string' ? o.title : undefined,
        description: typeof o.description === 'string' ? o.description : undefined,
        criteria,
        blocking: Array.from(blocking),
        decision: (o.decision && typeof o.decision === 'object') ? o.decision : undefined,
    };
}

export interface RubricResolution {
    rubric: AuditorRubric | null;
    rubricKind: string | null;
    index: RubricIndex | null;
    /** Why the rubric is missing, for the degradation event. Empty when resolved. */
    reason: string;
}

export async function loadRubricForKind(kind: string, opts?: RubricLoadOpts): Promise<RubricResolution> {
    const index = await loadRubricIndex(opts);
    if (!index) return { rubric: null, rubricKind: null, index: null, reason: `rubric index unreadable at wiki/${RUBRIC_INDEX_WIKI_PATH}` };
    const rubricKind = resolveRubricKind(index, kind);
    if (!rubricKind) return { rubric: null, rubricKind: null, index, reason: `no rubric registered for kind '${kind}' (index v${index.version})` };
    if (opts?.rubrics && rubricKind in opts.rubrics) {
        const rubric = normalizeRubric(opts.rubrics[rubricKind], rubricKind);
        return { rubric, rubricKind, index, reason: rubric ? '' : `rubric '${rubricKind}' has no criteria` };
    }
    const cached = _rubricCache.get(rubricKind);
    if (cached) return { rubric: cached, rubricKind, index, reason: '' };
    const entry = index.rubrics[rubricKind];
    const wikiPath = String(entry?.path || `eval/rubrics/${rubricKind}-rubric.json`).replace(/^\/?(hic-workspace\/)?wiki\//, '');
    const text = await readWikiText(wikiPath, opts);
    if (!text) return { rubric: null, rubricKind, index, reason: `rubric file missing: wiki/${wikiPath}` };
    let rubric: AuditorRubric | null = null;
    try { rubric = normalizeRubric(JSON.parse(text), rubricKind); } catch { rubric = null; }
    if (!rubric) return { rubric: null, rubricKind, index, reason: `rubric file unparseable or empty: wiki/${wikiPath}` };
    _rubricCache.set(rubricKind, rubric);
    return { rubric, rubricKind, index, reason: '' };
}

/** How the dispatcher should load a critic's rubric text. Unlisted critics default to the flat
 *  /skills/<name>/SKILL.md path; the dispatcher FAILS the critic when that path misses. */
export function resolveCriticSource(index: RubricIndex | null, skillName: string): CriticResolution & { path: string } {
    const entry = index?.critics?.[skillName];
    if (entry?.deterministic) return { deterministic: entry.deterministic, path: '' };
    if (entry?.path) return { path: entry.path };
    return { path: `/skills/${skillName}/SKILL.md` };
}

// ─── Deliverable walkers ─────────────────────────────────────────────────────

interface StringHit { path: string; key: string; value: string; parent: Record<string, unknown> | null }

function walkStrings(node: unknown, out: StringHit[], path = '$', key = '', parent: Record<string, unknown> | null = null, depth = 0): void {
    if (depth > 8 || out.length > 6000) return;
    if (typeof node === 'string') { out.push({ path, key, value: node, parent }); return; }
    if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, out, `${path}[${i}]`, key, parent, depth + 1)); return; }
    if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>;
        for (const [k, v] of Object.entries(o)) walkStrings(v, out, `${path}.${k}`, k, o, depth + 1);
    }
}

function htmlToText(html: string): string {
    return html
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function htmlHeadings(html: string): string[] {
    const out: string[] = [];
    const re = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const t = htmlToText(m[1]);
        if (t.length >= 6) out.push(t);
    }
    return out;
}

const HTML_KEYS = /^(html|body|document|rendered)$/i;
const TITLE_KEYS = /^(title|headline|actionTitle|slideTitle|action_title|slide_title)$/;
const PROSE_KEYS = /^(content|narrative|insight|insights|summary|thesis|description|body|text|speakerNotes|notes|takeaway|rationale|statement|finding|pain|painPoint|opportunity)$/i;
const QUOTE_KEYS = /quote|verbatim|^vq$|evidence_quote|pull_quote/i;
const SOURCE_KEYS = /^(source|sourceName|source_name|attribution|speaker|citation|sourceFile|sourceTitle|publisher|outlet)$/i;
const CITATION_LIST_KEYS = /^(citations|sources|evidence_sources|evidenceSources|evidenceBasis|references)$/i;
const GENERIC_SOURCES = new Set(['research', 'studies', 'study', 'data', 'sources', 'source', 'intelligence_sources', 'analysis', 'evidence', 'findings', 'reports', 'report', 'literature', 'various sources', 'multiple sources', 'internal research', 'industry research', 'the corpus', 'corpus', 'client documents', 'interviews', 'n/a', 'unknown', 'tbd']);
const SOURCE_INLINE_RE = /(?:\[|\()?\s*(?:source|via|per)\s*:\s*([^\]\)\n|]{2,120})/gi;
const NUMBER_CLAIM_RE = /(?:\$\s?\d[\d,.]*\s*(?:[kmb]|million|billion|thousand)?|\d+(?:\.\d+)?\s*(?:%|percent|percentage points|pp\b|x\b|×)|\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s*(?:million|billion|thousand)\b)/i;
const EM_DASH_RE_G = /\u2014/g;

interface DeliverableView {
    text: string;
    titles: string[];
    prose: string[];
    quotes: Array<{ text: string; attributed: boolean; source: string | null; path: string }>;
    namedSources: string[];
    genericSources: string[];
    externalFlags: boolean[];
    selectionSources: string[];
    hits: StringHit[];
    isHtml: boolean;
}

function isGenericSource(s: string): boolean {
    const t = s.toLowerCase().replace(/[^a-z0-9_ /:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return true;
    if (GENERIC_SOURCES.has(t)) return true;
    return /^(the )?(research|studies|data|sources|evidence|findings|analysis|reports?)( (shows?|indicates?|suggests?))?$/.test(t);
}

function quoteAttribution(hit: StringHit): { attributed: boolean; source: string | null } {
    const parent = hit.parent;
    if (parent) {
        for (const [k, v] of Object.entries(parent)) {
            if (SOURCE_KEYS.test(k) && typeof v === 'string' && v.trim().length > 1 && !isGenericSource(v)) return { attributed: true, source: v.trim() };
            if (SOURCE_KEYS.test(k) && v && typeof v === 'object' && typeof (v as any).name === 'string') return { attributed: true, source: String((v as any).name) };
        }
    }
    SOURCE_INLINE_RE.lastIndex = 0;
    const m = SOURCE_INLINE_RE.exec(hit.value);
    if (m && !isGenericSource(m[1])) return { attributed: true, source: m[1].trim() };
    // "quote text" - Named Person, Outlet
    const dash = hit.value.match(/["”]\s*[-,]\s*([A-Z][\w.&' ]{2,80})$/);
    if (dash) return { attributed: true, source: dash[1].trim() };
    return { attributed: false, source: null };
}

function viewDeliverable(deliverable: unknown): DeliverableView {
    const hits: StringHit[] = [];
    walkStrings(deliverable, hits);
    const titles: string[] = [];
    const prose: string[] = [];
    const quotes: DeliverableView['quotes'] = [];
    const named: string[] = [];
    const generic: string[] = [];
    const externalFlags: boolean[] = [];
    const selectionSources: string[] = [];
    let isHtml = false;
    const textParts: string[] = [];

    const seenParents = new Set<Record<string, unknown>>();

    for (const h of hits) {
        const v = h.value;
        if (HTML_KEYS.test(h.key) && /<[a-z][\s\S]*>/i.test(v) && v.length > 100) {
            isHtml = true;
            const text = htmlToText(v);
            textParts.push(text);
            titles.push(...htmlHeadings(v));
            // Quotes in HTML: blockquotes and .vq cells; attribution = a Source: marker in the same block.
            const bq = /<(blockquote|q)\b[^>]*>([\s\S]*?)<\/\1>|<[^>]+class="[^"]*\b(?:vq|quote|pull-quote|verbatim)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span|td|li)>/gi;
            let m: RegExpExecArray | null;
            while ((m = bq.exec(v)) !== null) {
                const inner = htmlToText(m[2] || m[3] || '');
                if (inner.length < 12) continue;
                SOURCE_INLINE_RE.lastIndex = 0;
                const src = SOURCE_INLINE_RE.exec(inner);
                const cite = /<cite\b[^>]*>([\s\S]*?)<\/cite>/i.exec(m[0]);
                const source = src ? src[1].trim() : cite ? htmlToText(cite[1]) : null;
                quotes.push({ text: inner, attributed: !!source && !isGenericSource(source), source, path: h.path });
            }
            SOURCE_INLINE_RE.lastIndex = 0;
            let sm: RegExpExecArray | null;
            while ((sm = SOURCE_INLINE_RE.exec(text)) !== null) {
                const s = sm[1].trim();
                if (isGenericSource(s)) generic.push(s); else named.push(s);
            }
            continue;
        }
        textParts.push(v);
        if (TITLE_KEYS.test(h.key) && v.length >= 6 && v.length <= 240 && !/citations?|sources?/i.test(h.path.split('.').slice(-2, -1)[0] || '')) titles.push(v);
        if (PROSE_KEYS.test(h.key) && v.length >= 20) prose.push(v);
        if (QUOTE_KEYS.test(h.key) && v.length >= 12) {
            const a = quoteAttribution(h);
            quotes.push({ text: v, attributed: a.attributed, source: a.source, path: h.path });
            if (a.source) named.push(a.source);
        }
        if (SOURCE_KEYS.test(h.key) && !QUOTE_KEYS.test(h.key)) {
            if (isGenericSource(v)) generic.push(v); else named.push(v);
        }
        if (h.key === 'source' && /^(cached|extended|new)$/i.test(v.trim())) selectionSources.push(v.trim().toLowerCase());
        // Items of citation lists (strings) arrive with key = list name.
        if (CITATION_LIST_KEYS.test(h.key) && v.length >= 2 && v.length <= 200) {
            if (isGenericSource(v)) generic.push(v); else named.push(v);
        }
        if (h.parent && !seenParents.has(h.parent)) {
            seenParents.add(h.parent);
            if (typeof h.parent.isExternal === 'boolean') externalFlags.push(h.parent.isExternal as boolean);
        }
        SOURCE_INLINE_RE.lastIndex = 0;
        let sm: RegExpExecArray | null;
        while ((sm = SOURCE_INLINE_RE.exec(v)) !== null) {
            const s = sm[1].trim();
            if (isGenericSource(s)) generic.push(s); else named.push(s);
        }
    }
    return {
        text: textParts.join('\n'),
        titles: Array.from(new Set(titles)),
        prose,
        quotes,
        namedSources: named.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
        genericSources: generic,
        externalFlags,
        selectionSources,
        hits,
        isHtml,
    };
}

function distinctLower(xs: string[]): number {
    return new Set(xs.map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).filter(Boolean)).size;
}

function isQuoted(s: string): boolean {
    const t = s.trim();
    return /^["“‘']/.test(t) || /\bsource\s*:/i.test(t) || /["”]\s*[-,]\s*[A-Z]/.test(t);
}

function nakedNumberHits(strings: string[]): string[] {
    const out: string[] = [];
    for (const s of strings) {
        if (isQuoted(s)) continue;
        // Strip quoted spans before testing so a figure inside a quote does not count.
        const stripped = s.replace(/["“][^"”]{4,}["”]/g, '');
        if (NUMBER_CLAIM_RE.test(stripped)) out.push(s.slice(0, 120));
    }
    return out;
}

const tokens = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2));
const jacc = (a: Set<string>, b: Set<string>): number => {
    if (!a.size || !b.size) return 0;
    let inter = 0; for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
};

function findCollection(deliverable: unknown, keys: RegExp): any[] | null {
    if (Array.isArray(deliverable)) return deliverable;
    if (!deliverable || typeof deliverable !== 'object') return null;
    const o = deliverable as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) if (keys.test(k) && Array.isArray(v)) return v;
    for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) if (keys.test(k2) && Array.isArray(v2)) return v2;
        }
    }
    return null;
}

// ─── Deterministic checks ────────────────────────────────────────────────────

export interface DeterministicCheckResult { score: number | null; finding: string }
export type DeterministicCheck = (deliverable: unknown, view: DeliverableView) => DeterministicCheckResult;

const bandByShare = (bad: number, total: number): number => {
    if (total === 0) return 5;
    const share = bad / total;
    return share === 0 ? 5 : share <= 0.2 ? 4 : share <= 0.4 ? 3 : share <= 0.6 ? 2 : 1;
};

const DETERMINISTIC_CHECKS: Record<string, DeterministicCheck> = {
    anti_slop: (_d, view) => {
        const emDashes = (view.text.match(EM_DASH_RE_G) || []).length;
        const slop = detectAllSlop(view.text);
        const words = detectDetectOnlySlop(view.text);
        const hits = emDashes + slop.length + words.length;
        const score = hits === 0 ? 5 : hits <= 2 ? 4 : hits <= 5 ? 3 : hits <= 9 ? 2 : 1;
        const parts: string[] = [];
        if (emDashes) parts.push(`${emDashes} em-dash(es)`);
        if (slop.length) parts.push(`${slop.length} meta/metaphor hit(s): ${slop.slice(0, 3).map(s => s.phrase).join('; ')}`);
        if (words.length) parts.push(`${words.length} lexicon hit(s): ${words.slice(0, 4).map(w => w.phrase).join(', ')}`);
        return { score, finding: parts.length ? parts.join('; ') : 'no slop tells' };
    },
    raw_chunk_markers: (_d, view) => {
        const n = (view.text.match(/\[?CHUNK_\d{2,}/g) || []).length;
        return { score: n === 0 ? 5 : n <= 2 ? 2 : 1, finding: n ? `${n} raw chunk marker(s) visible` : 'every pointer resolved' };
    },
    naked_numbers: (_d, view) => {
        const titleHits = nakedNumberHits(view.titles);
        const proseHits = nakedNumberHits(view.prose);
        const n = titleHits.length * 2 + proseHits.length;
        const score = n === 0 ? 5 : n <= 1 ? 4 : n <= 3 ? 3 : n <= 6 ? 2 : 1;
        const finding = n === 0 ? 'no bare figures outside quotes'
            : `${titleHits.length} title(s) and ${proseHits.length} prose field(s) carry a bare figure${titleHits[0] ? `: "${titleHits[0]}"` : ''}`;
        return { score, finding };
    },
    action_titles: (_d, view) => {
        if (view.titles.length === 0) return { score: null, finding: 'no titles found to test' };
        const failing: string[] = [];
        for (const t of view.titles) {
            const kinds = evaluateTitle(t).filter(k => k !== 'no_verb');
            if (kinds.length) failing.push(`"${t.slice(0, 60)}" (${kinds.join(',')})`);
        }
        return { score: bandByShare(failing.length, view.titles.length), finding: failing.length ? `${failing.length}/${view.titles.length} titles fail the Partner Test: ${failing.slice(0, 3).join('; ')}` : `${view.titles.length} titles pass the Partner Test` };
    },
    citation_diversity: (_d, view) => {
        const distinct = distinctLower(view.namedSources);
        let score = distinct >= 5 ? 5 : distinct >= 3 ? 4 : distinct === 2 ? 3 : distinct === 1 ? 2 : 1;
        let note = `${distinct} distinct named source(s)`;
        if (view.externalFlags.length >= 3) {
            const ext = view.externalFlags.filter(Boolean).length / view.externalFlags.length;
            note += `; external share ${(ext * 100).toFixed(0)}%`;
            if (ext < 0.5) score = Math.min(score, 3);
            if (ext < 0.3) score = Math.min(score, 2);
        }
        if (view.genericSources.length) note += `; ${view.genericSources.length} generic citation(s)`;
        return { score, finding: note };
    },
    evidence_anchoring: (_d, view) => {
        const named = distinctLower(view.namedSources);
        const attributed = view.quotes.filter(q => q.attributed).length;
        const generic = view.genericSources.length;
        const total = view.namedSources.length + generic;
        if (named === 0 && attributed === 0) return { score: 1, finding: 'no named source and no attributed quote anywhere' };
        let score = named >= 4 && attributed >= 2 ? 5 : named >= 3 || attributed >= 2 ? 4 : named >= 2 || attributed >= 1 ? 3 : 2;
        if (total > 0 && generic / total > 0.3) score = Math.min(score, 2);
        else if (generic > 0) score = Math.min(score, 4);
        return { score, finding: `${named} named source(s), ${attributed} attributed quote(s), ${generic} generic citation(s)` };
    },
    cached_selection_coverage: (_d, view) => {
        const total = view.selectionSources.length;
        if (total === 0) return { score: null, finding: 'no source: cached/extended/new markers present' };
        const kept = view.selectionSources.filter(s => s !== 'new').length;
        const cov = kept / total;
        return { score: cov >= 0.8 ? 5 : cov >= 0.6 ? 3 : 1, finding: `${(cov * 100).toFixed(0)}% of emitted items came from the user's selection (${kept}/${total})` };
    },
    quote_attribution: (_d, view) => {
        const total = view.quotes.length;
        if (total === 0) return { score: 1, finding: 'no verbatim quote fields found' };
        const attributed = view.quotes.filter(q => q.attributed).length;
        const r = attributed / total;
        return { score: r === 1 ? 5 : r >= 0.8 ? 4 : r >= 0.5 ? 3 : r >= 0.25 ? 2 : 1, finding: `${attributed}/${total} quotes carry a named attribution` };
    },
    theme_yield: (d) => {
        const themes = findCollection(d, /^themes$/i);
        if (!themes) return { score: null, finding: 'no themes collection' };
        const n = themes.length;
        return { score: n >= 20 ? 5 : n >= 15 ? 3 : 1, finding: `${n} theme(s)` };
    },
    distinct_items: (d) => {
        const items = findCollection(d, /^(themes|personas|recommendations|concepts|tiles)$/i);
        if (!items || items.length < 2) return { score: null, finding: 'fewer than two items to compare' };
        const sigs = items.map((it: any) => tokens([it?.name, it?.title, it?.insight, it?.summary, it?.description, it?.jtbd, it?.thesis].filter(Boolean).join(' ')));
        let dupes = 0;
        for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) if (jacc(sigs[i], sigs[j]) >= 0.7) dupes++;
        return { score: dupes === 0 ? 5 : dupes === 1 ? 3 : 1, finding: dupes ? `${dupes} near-duplicate pair(s)` : 'items are distinct' };
    },
    cluster_id_presence: (d) => {
        const themes = findCollection(d, /^themes$/i);
        if (!themes || themes.length === 0) return { score: null, finding: 'no themes collection' };
        const withId = themes.filter((t: any) => t && (t.cluster_id ?? t.clusterId) !== null && (t.cluster_id ?? t.clusterId) !== undefined).length;
        const r = withId / themes.length;
        return { score: r >= 0.8 ? 5 : r >= 0.5 ? 3 : 1, finding: `${withId}/${themes.length} themes carry a cluster id` };
    },
    structural: (d, view) => {
        const issues: string[] = [];
        const markers = (view.text.match(/\[?CHUNK_\d{2,}/g) || []).length;
        if (markers) issues.push(`${markers} raw chunk marker(s)`);
        if (/\((composite|synthetic)\)/i.test(view.text)) issues.push('debug name suffix');
        if (/^\s*\[(Life|Experience|Functional)\]/im.test(view.text)) issues.push('tier bracket prefix');
        if (/\b(Run ID|Pipeline version|Reproducibility hash|Confidence: (HYPOTHESIS|EMERGING|VERIFIED))\b/.test(view.text)) issues.push('reporting-depth chrome');
        const name = (d as any)?.name;
        if (typeof name === 'string' && name.length > 80) issues.push('name over 80 chars');
        return { score: issues.length === 0 ? 5 : issues.length === 1 ? 3 : 1, finding: issues.length ? issues.join('; ') : 'no structural tells' };
    },
    prd_trace_integrity: (d) => {
        const r = checkPrdTraceIntegrity(d);
        return { score: r.score, finding: r.summary };
    },
    prd_problem_quotes: (d, view) => {
        // PrdAir (services/prdAir.ts): quotes live on graph.quotes with exactly one sourceId.
        const graph = (d as any)?.graph ?? (d as any)?.prd?.graph;
        if (graph && Array.isArray(graph.quotes)) {
            const sources = new Map<string, string>((Array.isArray(graph.sources) ? graph.sources : []).map((s: any) => [String(s?.id), String(s?.name || s?.id)]));
            const quotes = graph.quotes.filter((q: any) => typeof q?.text === 'string' && q.text.trim().length >= 12);
            if (quotes.length === 0) return { score: 1, finding: 'problem section carries no verbatim quote' };
            const attributed = quotes.filter((q: any) => (q.sourceId && (sources.size === 0 || sources.has(String(q.sourceId)))) || (typeof q.attribution === 'string' && q.attribution.trim()));
            const distinct = new Set(attributed.map((q: any) => sources.get(String(q.sourceId)) || String(q.sourceId || q.attribution))).size;
            return { score: distinct >= 2 ? 5 : distinct === 1 ? 3 : 1, finding: `${attributed.length}/${quotes.length} graph quotes resolve to a listed source, ${distinct} independent source(s)` };
        }
        const problemQuotes = view.quotes.filter(q => /problem|pain|complication|situation/i.test(q.path));
        const pool = problemQuotes.length ? problemQuotes : view.quotes.filter(q => /^\$\.(prd\.)?(sections|problem)/i.test(q.path));
        const attributed = pool.filter(q => q.attributed);
        const distinct = distinctLower(attributed.map(q => q.source || ''));
        const hasProblem = JSON.stringify(d ?? {}).toLowerCase().includes('problem');
        if (!hasProblem) return { score: 1, finding: 'no problem section' };
        if (pool.length === 0) return { score: 1, finding: 'problem section carries no verbatim quote' };
        const score = distinct >= 2 ? 5 : distinct === 1 ? 3 : 1;
        return { score, finding: `${attributed.length}/${pool.length} problem quotes attributed, ${distinct} independent source(s)` };
    },
    prd_signal_figures: (_d, view) => {
        const signalStrings = view.hits
            .filter(h => /successMetrics|successSignals|signals|kpis|metrics/i.test(h.path) && !/target|baseline|requirement_target/i.test(h.key))
            .map(h => h.value);
        if (signalStrings.length === 0) return { score: 1, finding: 'no success signals' };
        const naked = nakedNumberHits(signalStrings);
        return { score: naked.length === 0 ? 5 : naked.length === 1 ? 2 : 1, finding: naked.length ? `${naked.length} signal(s) carry an uncited figure: "${naked[0]}"` : `${signalStrings.length} signal field(s), no uncited figures` };
    },
};

export function runDeterministicCheck(checkId: string, deliverable: unknown, view?: DeliverableView): DeterministicCheckResult {
    const fn = DETERMINISTIC_CHECKS[checkId];
    if (!fn) return { score: null, finding: `unknown deterministic check '${checkId}'` };
    try {
        return fn(deliverable, view ?? viewDeliverable(deliverable));
    } catch (e: any) {
        return { score: null, finding: `check '${checkId}' threw: ${String(e?.message || e).slice(0, 120)}` };
    }
}

// ─── Scoring + verdict ───────────────────────────────────────────────────────

const clampScore = (n: unknown): number | null => {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.min(5, Math.max(1, Math.round(v)));
};

export function scoreRubric(
    rubric: AuditorRubric,
    deliverable: unknown,
    modelScores?: Record<string, ModelCriterionScore> | null,
): RubricScoreResult {
    const view = viewDeliverable(deliverable);
    const scores: CriterionScore[] = [];
    const deterministicFailures: string[] = [];
    for (const c of rubric.criteria) {
        const det = c.deterministic_check ? runDeterministicCheck(c.deterministic_check, deliverable, view) : null;
        const model = modelScores?.[c.id] ?? modelScores?.[String(c.n)] ?? null;
        const modelScore = model ? clampScore(model.score) : null;
        let score: number | null = null;
        let source: CriterionScore['source'] = 'unscored';
        let finding = '';
        if (det && det.score !== null && modelScore !== null) {
            // The gate declares verified: a model may lower a deterministic score, never raise it.
            score = Math.min(det.score, modelScore);
            source = 'both';
            finding = [det.finding, model?.finding].filter(Boolean).join(' | ');
        } else if (det && det.score !== null) {
            score = det.score; source = 'deterministic'; finding = det.finding;
        } else if (modelScore !== null) {
            score = modelScore; source = 'model'; finding = model?.finding || '';
        } else {
            finding = det?.finding || 'unscored this run';
        }
        if (det && det.score !== null && det.score < c.floor) deterministicFailures.push(`${c.id}: ${det.finding}`);
        scores.push({ id: c.id, label: c.label, score, source, finding, blocking: c.blocking, floor: c.floor });
    }
    const blockingHits = scores.filter(s => s.blocking && s.score === 1).map(s => s.id);
    const belowFloor = scores.filter(s => s.score !== null && s.score < s.floor).map(s => s.id);
    const unscored = scores.filter(s => s.score === null).map(s => s.id);
    return {
        rubric_id: rubric.rubric_id,
        rubric_version: rubric.version,
        scores,
        verdict: verdictFor(blockingHits, belowFloor),
        blocking_hits: blockingHits,
        below_floor: belowFloor,
        unscored,
        deterministic_failures: deterministicFailures,
    };
}

function verdictFor(blockingHits: string[], belowFloor: string[]): PanelVerdict {
    if (blockingHits.length > 0) return 'withhold';
    if (belowFloor.length > 0) return 'refine';
    return 'pass';
}

/** The findings a rebuild is asked to fix: every criterion below its floor, worst first. */
export function refineInstructions(result: RubricScoreResult, rubric: AuditorRubric): string[] {
    const byId = new Map(rubric.criteria.map(c => [c.id, c]));
    return result.scores
        .filter(s => s.score !== null && s.score < s.floor)
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .map(s => {
            const c = byId.get(s.id);
            return `${s.label} scored ${s.score}/5 (floor ${s.floor}): ${s.finding}. Required: ${c?.five || s.label}.`;
        });
}

// ─── Model scoring prompt (used by criticDispatcher) ─────────────────────────

export function buildRubricScoringPrompt(rubric: AuditorRubric, deliverable: unknown): string {
    const items = rubric.criteria.map(c => `${c.n}. [${c.id}] ${c.label}\n   5 = ${c.five}\n   1 = ${c.one}`).join('\n');
    return `You are the ${rubric.kind} deliverable auditor. Score the deliverable below on every rubric item from 1 to 5. 5 means an engineer, a designer and an auditor could act on it without a clarifying meeting; 3 means present but partially met; 1 means absent or fabricated. Score what is on the page, not what the author intended.

RUBRIC (${rubric.rubric_id} v${rubric.version})
${items}

DELIVERABLE UNDER REVIEW
${JSON.stringify(deliverable, null, 2).slice(0, 26000)}

Return ONLY a JSON object, no prose and no fences:
{"scores": {"<item id>": {"score": <1-5>, "finding": "<one sentence naming the specific evidence or defect>"}, ...}}

Every item id listed above must appear. Never invent corpus content in a finding; quote what is there.`;
}

export function parseRubricScores(parsed: unknown, rubric: AuditorRubric): Record<string, ModelCriterionScore> | null {
    if (!parsed || typeof parsed !== 'object') return null;
    const raw = ((parsed as any).scores && typeof (parsed as any).scores === 'object') ? (parsed as any).scores : parsed;
    const out: Record<string, ModelCriterionScore> = {};
    for (const c of rubric.criteria) {
        const v = raw[c.id] ?? raw[String(c.n)] ?? raw[c.label];
        const s = clampScore(typeof v === 'object' && v !== null ? (v as any).score : v);
        if (s === null) continue;
        out[c.id] = { score: s, finding: typeof (v as any)?.finding === 'string' ? (v as any).finding.slice(0, 300) : undefined };
    }
    return Object.keys(out).length ? out : null;
}

// ─── Verdict record + writer ─────────────────────────────────────────────────

export interface BuildVerdictInput {
    panelKind: string;
    rubricKind: string;
    result: RubricScoreResult;
    verdict: PanelVerdict;
    rebuilds: number;
    criticErrors: string[];
    expertsFired: string[];
    costUsd: number;
    artifactId?: string;
    runId?: string;
    now?: () => string;
}

export function buildVerdictRecord(input: BuildVerdictInput): AuditorVerdictRecord {
    const scores: Record<string, number | null> = {};
    for (const s of input.result.scores) scores[s.id] = s.score;
    return {
        ts: (input.now ?? (() => new Date().toISOString()))(),
        panel_kind: input.panelKind,
        kind: input.rubricKind,
        rubric_id: input.result.rubric_id,
        rubric_version: input.result.rubric_version,
        ...(input.artifactId ? { artifact_id: input.artifactId } : {}),
        ...(input.runId ? { run_id: input.runId } : {}),
        scores,
        blocking: input.result.blocking_hits,
        below_floor: input.result.below_floor,
        verdict: input.verdict,
        rebuilds: input.rebuilds,
        critic_errors: input.criticErrors,
        deterministic_failures: input.result.deterministic_failures,
        findings: input.result.scores.filter(s => s.score !== null && s.score < s.floor).map(s => `${s.id}: ${s.finding}`.slice(0, 300)),
        experts_fired: input.expertsFired,
        cost_usd: Number(input.costUsd.toFixed(4)),
    };
}

export type VerdictWriter = (record: AuditorVerdictRecord) => Promise<boolean>;

/** Append one line to wiki/eval/auditor-verdicts.jsonl through the proxy's true-append endpoint. */
export async function appendAuditorVerdict(record: AuditorVerdictRecord, opts?: { proxyBase?: string; fetchImpl?: FetchLike }): Promise<boolean> {
    const f = pickFetch(opts);
    if (!f) return false;
    const proxyBase = opts?.proxyBase ?? DEFAULT_PROXY;
    try {
        const r = await f(`${proxyBase}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: AUDITOR_VERDICTS_WIKI_PATH, content: JSON.stringify(record) }),
        });
        return r.ok;
    } catch (e: any) {
        console.warn('[auditorRubrics] verdict append failed (non-fatal):', e?.message || e);
        return false;
    }
}
