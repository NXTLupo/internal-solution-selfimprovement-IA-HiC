/**
 * citationVerifier.ts - WS-B of the provenance-lock plan
 * (plans/citation-integrity-provenance-lock-2026-08-17.md).
 *
 * The runtime claims gate born from the 2026-08-17 field incident: a client
 * deck shipped with REAL corpus content wearing FABRICATED source identities
 * ("Intuit Mid-Market AI Report", "BILL Case Study", "HFTP") plus off-industry
 * evidence framed as in-industry proof. Every claim existed in the corpus;
 * attribution was the failure. This module makes the check deterministic and
 * in-path: quotes must appear verbatim (in order) in their pointed source,
 * statistics' numbers must exist with boundaries in the source text, and every
 * attribution-carrying field must match the source's REAL recorded identity or
 * be relabeled to it before render.
 *
 * REVISED 2026-08-17 after adversarial review (all four blockers + majors):
 * - attribution keys match the REAL archetype contracts (attributionName,
 *   attributionRole, sourceLine, source, ...), ALL siblings per object;
 * - array-of-strings content (bullets, groups[].items) is walked;
 * - quotes[].text objects count as quotes when an attribution sibling exists;
 * - an unreachable source page is UNREACHABLE: reported, NEVER fix-applied,
 *   so a proxy outage cannot strip legitimate labels;
 * - ellipsis segments must appear in source ORDER (no stitched quotes);
 * - numeric tokens are boundary-checked ("20%" no longer passes on "120%");
 * - figure/value siblings of pointer-carrying fields are stat-checked;
 * - named-source phrases INSIDE claim text ("per the X Report") are checked;
 * - relabel/strip always writes an HONEST label (real sources or the page-
 *   derived label), and verifier edits do not pollute the user's undo history.
 *
 * Zero model calls. Page text loads once per cited page (cached per run).
 */

import { lookupChunkAttribution, lookupPointerUrl, lookupSourceUrl, prettifyPagePath } from './citationPointerRegistry';
import { applyTextEdits } from './slideTextEditing';

const PROXY_BASE = 'http://127.0.0.1:5012';

/** [path.md#cN] markers as they appear in raw payload strings (pre-resolution). */
const POINTER_RE = /([\w./\\-]+\.md)#c(\d+)/gi;

export interface AttributionRef { field: string; value: string; }

export interface EvidenceClaim {
    slideId: string;
    slideTitle: string;
    /** payload path of the CLAIM text field. */
    field: string;
    /** ALL attribution-carrying siblings on the same object. */
    attributions: AttributionRef[];
    kind: 'quote' | 'stat' | 'text';
    text: string;
    pointers: string[];
    /** pointers written INSIDE the claim field (kept on a snapped quote). */
    inlinePointers?: string[];
}

export type Verdict = 'VERIFIED' | 'ATTRIBUTION_FIXED' | 'UNVERIFIED' | 'UNSOURCED' | 'UNREACHABLE';

export interface LedgerRow {
    slideId: string;
    slideTitle: string;
    field: string;
    kind: 'quote' | 'stat' | 'text';
    claim: string;
    citedAs: string;
    realSources: string[];
    url: string | null;
    /**
     * 2026-08-26 (owner correction). `url` now also falls back to the cited
     * page's own frontmatter `url:` field (see `lookupFrontmatterUrl`), so any
     * claim whose source page records a real external origin gets a real
     * external link, not just claims the in-memory registry happened to
     * capture during this generation. `pointer` is the raw manifest pointer
     * ("articles/x.md#c3") the claim resolved against, kept only as an
     * internal key (e.g. to build the "search corpus for this quote" query
     * context). The owner was explicit: HiC's own stored copy of a page is
     * NOT independent verification, only a real external URL is - so the UI
     * must never render `pointer` as a clickable "view source" link when
     * `url` is null. A null `url` with a non-null `pointer` means the source
     * page itself never had a real external origin on record (chained,
     * synthesis, or cached pages); a null `pointer` means no source was cited
     * at all. Both cases are equally unverifiable to the reader and must be
     * shown as such, never disguised behind an internal link.
     */
    pointer: string | null;
    verdict: Verdict;
    note: string;
    /** attribution fields that must be rewritten, with their replacement. */
    fixes?: Array<{ field: string; value: string }>;
}

// The REAL archetype contracts (slides-component-manifest + corpusChatService
// quote shapes) emit attributionName / attributionRole / sourceLine / source.
const ATTRIBUTION_KEY = /^(attribution|attributionName|attributionRole|source|sourceLine|speaker|citedFrom|sourceName|cite|byline)$/i;
/** role/speaker labels cannot be relabeled from the registry; mismatches strip to the honest page label. */
const ROLE_KEY = /^(attributionRole|speaker)$/i;
const QUOTEISH_KEY = /quote|evidence/i;
const FIGURE_KEY = /^(figure|value|stat|number|metric|numeral)$/i;
const MEDIA_KEY = /image|icon|url|src|logo|glyph/i;

function extractPointers(s: string): string[] {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(POINTER_RE.source, 'gi');
    while ((m = re.exec(s)) !== null) {
        // tolerate model-emitted "wiki/" prefixes: the wiki root is implicit
        const page = m[1].replace(/\\/g, '/').replace(/^\/?(hic-workspace\/)?wiki\//i, '');
        const p = `${page}#c${m[2]}`;
        if (!out.includes(p)) out.push(p);
    }
    return out;
}

function stripPointerMarkers(s: string): string {
    return s
        .replace(/\[\s*[\w./\\-]+\.md#c\d+(?:\s*[,;]\s*[\w./\\-]+\.md#c\d+)*\s*\]/gi, '')
        .replace(/[\w./\\-]+\.md#c\d+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Walk one slide's payload and pull out every evidence-bearing claim. */
export function extractEvidenceClaims(slide: any): EvidenceClaim[] {
    const claims: EvidenceClaim[] = [];
    const isComposer = String(slide?.template || '').startsWith('slides:');
    const root = isComposer ? (slide.composerPayload || {}) : slide;
    const slideId = String(slide?.id || '');
    const slideTitle = String(slide?.title || '');

    const pushClaim = (field: string, raw: string, key: string, attrs: AttributionRef[], extraPointers: string[] = []) => {
        const pointers = [...new Set([...extractPointers(raw), ...extraPointers])];
        const quoteish = QUOTEISH_KEY.test(key) || (key === 'text' && attrs.length > 0);
        if (!pointers.length && !(quoteish && raw.trim().length >= 20)) return;
        const text = stripPointerMarkers(raw);
        if (text.length < 8) return;
        const kind: EvidenceClaim['kind'] = quoteish ? 'quote' : (/\d/.test(text) ? 'stat' : 'text');
        claims.push({ slideId, slideTitle, field, attributions: attrs, kind, text, pointers, inlinePointers: extractPointers(raw) });
    };

    const visit = (node: any, prefix: string, depth: number, inheritedAttrs: AttributionRef[]) => {
        if (!node || typeof node !== 'object' || depth > 6 || claims.length >= 80) return;
        if (Array.isArray(node)) {
            const arrayKey = prefix.replace(/^.*\./, '').replace(/\[\d+\]$/, '');
            node.forEach((item, i) => {
                if (typeof item === 'string') {
                    // BLOCKER-4 fix: bullets / groups[].items / string arrays are claims too
                    pushClaim(`${prefix}[${i}]`, item, arrayKey, inheritedAttrs);
                } else {
                    visit(item, `${prefix}[${i}]`, depth + 1, inheritedAttrs);
                }
            });
            return;
        }
        // ALL attribution siblings on this object (real contracts carry several:
        // attributionName + attributionRole, or source + attribution).
        const attrs: AttributionRef[] = [];
        for (const [k, v] of Object.entries(node)) {
            if (ATTRIBUTION_KEY.test(k) && typeof v === 'string' && v.trim()) {
                attrs.push({ field: prefix ? `${prefix}.${k}` : k, value: stripPointerMarkers(v.trim()) });
            }
        }
        // pointers found anywhere on this object (for figure-sibling checks)
        const objectPointers: string[] = [];
        for (const v of Object.values(node)) {
            if (typeof v === 'string') for (const p of extractPointers(v)) if (!objectPointers.includes(p)) objectPointers.push(p);
        }
        for (const [k, v] of Object.entries(node)) {
            if (k.startsWith('_') || MEDIA_KEY.test(k)) continue;
            const p = prefix ? `${prefix}.${k}` : k;
            if (typeof v === 'string') {
                if (ATTRIBUTION_KEY.test(k)) continue; // labels are verified via their claims
                if (FIGURE_KEY.test(k) && /\d/.test(v) && !extractPointers(v).length && objectPointers.length) {
                    // MAJOR-10 fix: the hero numeral rides its object's pointers
                    claims.push({ slideId, slideTitle, field: p, attributions: attrs, kind: 'stat', text: stripPointerMarkers(v), pointers: objectPointers });
                    continue;
                }
                // 2026-10-02: a quote may carry its pointer in a sibling field ({quote, source, pointer}) instead of
                // inline text; the coverage fills do, so a provenance-locked quote is not reported as label-only.
                pushClaim(p, v, k, attrs, QUOTEISH_KEY.test(k) ? objectPointers : []);
            } else if (v && typeof v === 'object') {
                visit(v, p, depth + 1, attrs.length ? attrs : inheritedAttrs);
            }
        }
    };
    visit(root, '', 0, []);
    return claims;
}

/** Normalization shared by both sides of every containment check. */
export function normalizeForMatch(s: string): string {
    return String(s || '')
        .toLowerCase()
        .replace(/[‘’‚′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/[–—]/g, '-')
        // 2026-10-01: a single quote used as QUOTATION punctuation ('platform') is treated like a double
        // quote (dropped), so nested quote marks never decide a verbatim match; apostrophes inside a word
        // (don't, student's) are kept.
        .replace(/(^|[^a-z0-9])'+|'+(?=[^a-z0-9]|$)/g, '$1 ')
        .replace(/[^a-z0-9%$.']+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Quote check: ellipsis-separated segments must each appear verbatim AND in
 * source ORDER (a quote stitched from out-of-order fragments is an assembly,
 * which the provenance contract bans).
 */
export function quoteAppearsIn(quote: string, sourceNorm: string): boolean {
    const rawSegments = String(quote).split(/\.\.\.|…/);
    const segments = rawSegments.map(s => normalizeForMatch(s)).filter(s => s.length >= 10);
    if (!segments.length) {
        const whole = normalizeForMatch(String(quote).replace(/\.\.\.|…/g, ' '));
        return whole.length >= 8 && sourceNorm.includes(whole);
    }
    let cursor = 0;
    for (const seg of segments) {
        const idx = sourceNorm.indexOf(seg, cursor);
        if (idx < 0) return false;
        cursor = idx + seg.length;
    }
    return true;
}

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Stat check: every numeric token must exist in the source with boundaries
 *  ("20%" must not pass on "120%"; "2026" must not pass inside "12026"). */
export function statsAppearIn(claim: string, sourceNorm: string): boolean {
    const tokens = (claim.match(/\d[\d,]*(?:\.\d+)?%?/g) || []).map(t => t.replace(/,/g, ''));
    if (!tokens.length) return true;
    const src = sourceNorm.replace(/,/g, '');
    return tokens.every(t => new RegExp(`(?<![\\d.])${escapeRe(t)}${t.endsWith('%') ? '' : '(?![\\d%])'}`).test(src));
}

const NAMED_ARTIFACT = /\b(report|study|survey|summit|index|whitepaper|case stud|benchmark|census|analysis|outlook|brief|guide|panel|interview|playbook)\b/i;
const ATTR_STOPWORDS = new Set(['report', 'study', 'survey', 'summit', 'index', 'case', 'whitepaper', 'review', 'article', 'blog', 'data', 'the', 'and', 'for', 'with', 'from', 'internal', 'client', 'upload', 'analysis', 'outlook', 'brief', 'guide', 'panel', 'interview', 'playbook', 'source']);

function wordBoundaryHit(token: string, haystackNorm: string): boolean {
    return new RegExp(`(?<![a-z0-9])${escapeRe(token)}(?![a-z0-9])`).test(haystackNorm);
}

/**
 * Attribution check, two tiers:
 * - A NAMED ARTIFACT label ("X Report, 2026") must appear as a PHRASE (year
 *   stripped) in the source text or the registry's real names: invented report
 *   titles die here even when their brand words appear in the article.
 * - A person/org label needs a MAJORITY of significant tokens present with
 *   word boundaries ("BILL" no longer passes on "pay bills" alone... boundary
 *   matching still accepts the standalone word, so majority rule carries it).
 */
export function attributionMatches(attribution: string, sourceNorm: string, realNames: string[]): boolean {
    const attr = String(attribution || '').trim();
    if (!attr) return true;
    const namesNorm = normalizeForMatch(realNames.join(' | '));
    if (NAMED_ARTIFACT.test(attr)) {
        const phrase = normalizeForMatch(attr.replace(/[,(]?\s*(19|20)\d{2}\s*[)]?/g, ''));
        if (phrase.length < 4) return false;
        return sourceNorm.includes(phrase) || namesNorm.includes(phrase);
    }
    const tokens = normalizeForMatch(attr).split(' ')
        .filter(t => t.length >= 4 && !ATTR_STOPWORDS.has(t) && !/^(19|20)\d{2}$/.test(t));
    if (!tokens.length) return true; // nothing checkable ("2026"): the quote check decides
    const hits = tokens.filter(t => wordBoundaryHit(t, namesNorm) || wordBoundaryHit(t, sourceNorm)).length;
    return hits >= Math.ceil(tokens.length / 2);
}

/** MAJOR-5: named-source phrases woven INTO claim text ("per the X Report",
 *  "according to Y", "Source: Z"). Returns the phrases that FAIL the match. */
export function inTextSourcePhrases(text: string, sourceNorm: string, realNames: string[]): string[] {
    const failed: string[] = [];
    const re = /(?:per|according to|source:|says|from)\s+(?:the\s+)?([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,5}\s+(?:Report|Study|Survey|Summit|Index|Whitepaper|Benchmark|Census|Analysis|Outlook|Playbook))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (!attributionMatches(m[1], sourceNorm, realNames)) failed.push(m[1]);
    }
    return failed;
}

/** Page-text loader with per-run cache. Exposed for test injection. */
export type PageFetcher = (pagePath: string) => Promise<string | null>;

/**
 * 2026-08-26 (owner correction, live). "The source should always link out to
 * an external source. How can I trust an unverified source stored in the
 * wiki?" - correct: HiC's own stored copy of a page is not independent
 * verification, only the real external origin is. The frontmatter `url:`
 * field on an ingested article page carries that real origin (see
 * `hic-workspace/wiki/articles/*.md`), but the in-memory pointer registry
 * (citationPointerRegistry) is only populated when a generation explicitly
 * registered one, and a session reload starts that registry empty. Reading
 * the frontmatter directly closes that gap. When a page's own `url:` field is
 * itself an internal wiki path (chained/synthesis/cached pages, no external
 * permalink was ever captured at ingest), this returns null - there is no
 * external source, and nothing should claim otherwise.
 */
const _wikiFrontmatterUrls = new Map<string, string | null>(); // pagePath (no #cN) -> real external url, or null

export function lookupFrontmatterUrl(pagePath: string): string | null {
    return _wikiFrontmatterUrls.get(pagePath) ?? null;
}

/** Raw page body by its normalized text (2026-10-06): quote snapping needs the original casing and punctuation. */
const _wikiRawBodies = new Map<string, string>();

/**
 * The closest VERBATIM span of a page to a model-written quote (2026-10-06: "not found verbatim" flags on persona and
 * theme quotes the model lightly reworded). Sentences and adjacent sentence pairs are scored by content-word recall
 * and F1 against the quote; the best span is returned when recall >= 0.75 and F1 >= 0.7, else null (the quote stays
 * flagged). Deterministic; the replacement text is lifted from the source, never authored.
 */
export function bestVerbatimSpan(quote: string, rawBody: string): string | null {
    const STOP = new Set(['the', 'and', 'for', 'have', 'has', 'had', 'are', 'was', 'were', 'with', 'that', 'this', 'from', 'their', 'they', 'them', 'its', 'not', 'nor', 'but', 'you', 'your', 'our', 'can', 'will', 'into', 'than', 'then', 'what', 'who', 'which']);
    const words = (t: string) => normalizeForMatch(t).split(/[^a-z0-9']+/).filter(w => w.length >= 3 && !STOP.has(w));
    const q = words(quote);
    if (q.length < 4 || !rawBody) return null;
    const qs = new Set(q);
    const sents = String(rawBody).replace(/\s+/g, ' ').split(/(?<=[.!?]["”']?)\s+(?=[A-Z0-9"“(])/).map(x => x.trim()).filter(x => x.length >= 12 && x.length <= 600);
    const cands: string[] = [...sents];
    for (let i = 0; i + 1 < sents.length; i++) if (sents[i].length + sents[i + 1].length <= 600) cands.push(`${sents[i]} ${sents[i + 1]}`);
    let best: { span: string; f1: number; recall: number } | null = null;
    for (const c of cands) {
        const cw = words(c);
        if (!cw.length) continue;
        const cs = new Set(cw);
        let hit = 0;
        for (const w of qs) if (cs.has(w)) hit++;
        const recall = hit / qs.size, precision = hit / cs.size;
        const f1 = recall + precision ? (2 * recall * precision) / (recall + precision) : 0;
        // recall first (a quote is often PART of a long source sentence), then precision, then the shorter span
        if (precision < 0.35) continue;
        if (!best || recall > best.recall || (recall === best.recall && (f1 > best.f1 || (f1 === best.f1 && c.length < best.span.length)))) best = { span: c, f1, recall };
    }
    if (!best || best.recall < 0.8) return null;
    return best.span.replace(/^[\s"“”]+|[\s"“”]+$/g, '').replace(/\s*\[[^\]]*\.md(?:#c\d+)?\]/g, '').trim();
}

export function makeWikiPageFetcher(): PageFetcher {
    const cache = new Map<string, string | null>();
    return async (pagePath: string) => {
        if (cache.has(pagePath)) return cache.get(pagePath)!;
        let text: string | null = null;
        try {
            const r = await fetch(`${PROXY_BASE}/api/wiki/read/${pagePath.split('/').map(encodeURIComponent).join('/')}`);
            if (r.ok) {
                const d = await r.json();
                if (d?.exists && typeof d.content === 'string' && d.content) {
                    if (!_wikiFrontmatterUrls.has(pagePath)) {
                        const fm = d.content.match(/^---\n([\s\S]*?)\n---/);
                        const urlLine = fm?.[1]?.match(/^url:\s*"?([^"\n]+?)"?\s*$/m);
                        const raw = urlLine?.[1]?.trim();
                        _wikiFrontmatterUrls.set(pagePath, raw && /^https?:\/\//i.test(raw) ? raw : null);
                    }
                    text = normalizeForMatch(d.content);
                    _wikiRawBodies.set(text, d.content.replace(/^---\n[\s\S]*?\n---\n?/, ''));
                }
            }
        } catch { /* offline proxy: rows become UNREACHABLE and are never fix-applied */ }
        cache.set(pagePath, text);
        return text;
    };
}

/** Honest display label for a pointer's real identity (registry tiers, then the page path). */
function honestLabelFor(pointer: string, realSources: string[]): string {
    if (realSources.length) return realSources.slice(0, 2).join('; ');
    return prettifyPagePath(pointer.replace(/#c\d+$/i, '')) || 'Research corpus';
}

function realSourceNames(pointer: string): string[] {
    const a = lookupChunkAttribution(pointer);
    if (a.chunkSources.length) return a.chunkSources;
    if (a.pageResolvedSources.length) return a.pageResolvedSources;
    return a.pageTitle ? [a.pageTitle] : [];
}

/** Verify every claim in a deck. Deterministic; one page fetch per cited page. */
export async function verifyDeckEvidence(slides: any[], fetchPage?: PageFetcher): Promise<LedgerRow[]> {
    const fetcher = fetchPage || makeWikiPageFetcher();
    const rows: LedgerRow[] = [];
    // Every page this deck cites (2026-10-06): a quote attached to the WRONG pointer is often verbatim on another page
    // the same deck cites (live #personas: three different quotes all pointed at one r/internships thread).
    const deckPages: string[] = [];
    let corpusLookups = 0;
    for (const slide of slides || []) for (const c of extractEvidenceClaims(slide)) for (const ptr of c.pointers) if (!deckPages.includes(ptr)) deckPages.push(ptr);
    for (const slide of slides || []) {
        for (const claim of extractEvidenceClaims(slide)) {
            const citedAs = claim.attributions.map(a => a.value).filter(Boolean).join(' / ');
            const row: LedgerRow = {
                slideId: claim.slideId, slideTitle: claim.slideTitle, field: claim.field,
                kind: claim.kind, claim: claim.text.slice(0, 220), citedAs,
                realSources: [], url: null, pointer: null, verdict: 'UNSOURCED', note: '',
            };
            if (!claim.pointers.length) {
                row.note = citedAs
                    ? 'Carries a source label but no corpus pointer: the label cannot be trusted.'
                    : 'No corpus pointer: unsourced content.';
                rows.push(row);
                continue;
            }
            let verifiedOn: string | null = null;
            let anyPageLoaded = false;
            let sourceNorm = '';
            for (const pointer of claim.pointers) {
                const page = pointer.replace(/#c\d+$/i, '');
                const text = await fetcher(page);
                if (text == null) continue;
                anyPageLoaded = true;
                const quoteOk = claim.kind === 'quote' ? quoteAppearsIn(claim.text, text) : true;
                const statOk = statsAppearIn(claim.text, text);
                if (quoteOk && statOk) { verifiedOn = pointer; sourceNorm = text; break; }
            }
            const primary = verifiedOn || claim.pointers[0];
            row.pointer = primary;
            row.realSources = realSourceNames(primary);
            row.url = lookupPointerUrl(primary)
                || (row.realSources[0] ? lookupSourceUrl(row.realSources[0]) : null)
                || lookupFrontmatterUrl(primary.replace(/#c\d+$/i, ''));
            if (!anyPageLoaded) {
                // BLOCKER-3 fix: an unreachable page is reported, never acted on.
                row.verdict = 'UNREACHABLE';
                row.note = 'Pointed source page could not be loaded; claim left untouched and unchecked.';
                rows.push(row);
                continue;
            }
            // Quote snapping (2026-10-06): a lightly reworded quote is replaced by the exact source sentence.
            if (!verifiedOn && claim.kind === 'quote') {
                for (const pointer of claim.pointers) {
                    const norm = await fetcher(pointer.replace(/#c\d+$/i, ''));
                    const raw = norm != null ? _wikiRawBodies.get(norm) : undefined;
                    const span = raw ? bestVerbatimSpan(claim.text, raw) : null;
                    if (span) {
                        row.pointer = pointer;
                        row.verdict = 'VERIFIED';
                        row.note = 'Quote matched to the exact source text.';
                        const inline = (claim.inlinePointers || []).map(ptr => ` [${ptr}]`).join('');
                        row.fixes = [{ field: claim.field, value: `${span}${inline}` }];
                        break;
                    }
                }
                // Corpus-level candidates (2026-10-06): the quote's true page is often one the deck never cites. The
                // manifest retrieval ranks chunks by the quote's own words; those pages join the candidates.
                let corpusPages: string[] = [];
                // The chunks the model was actually shown come first: a verbatim match there names the true page
                // without a fetch or a retrieval call.
                if (row.verdict !== 'VERIFIED') {
                    try {
                        const { promptedChunkTexts } = await import('./chunkRetrieval');
                        for (const [id, text] of promptedChunkTexts()) {
                            if (claim.pointers.includes(id)) continue;
                            if (quoteAppearsIn(claim.text, normalizeForMatch(text))) corpusPages.push(id);
                            if (corpusPages.length >= 3) break;
                        }
                    } catch { /* non-fatal */ }
                }
                if (row.verdict !== 'VERIFIED' && !corpusPages.length && corpusLookups < 15) {
                    corpusLookups++;
                    try {
                        const [{ pickChunksForPrompt }, { currentEngagementSlug }] = await Promise.all([import('./chunkRetrieval'), import('./wikiPointerResolver')]);
                        const slug = currentEngagementSlug();
                        if (slug) corpusPages = ((await pickChunksForPrompt(claim.text, slug, { tokenBudget: 2500, skipRerank: true, skipAutoPin: true })).chunkIds || []).slice(0, 8);
                    } catch { corpusPages = []; }
                }
                if (row.verdict !== 'VERIFIED') {
                    for (const ptr of [...deckPages.slice(0, 60), ...corpusPages.filter(p => !deckPages.includes(p))]) {
                        if (claim.pointers.includes(ptr)) continue;
                        const norm = await fetcher(ptr.replace(/#c\d+$/i, ''));
                        if (norm == null) continue;
                        const raw = _wikiRawBodies.get(norm);
                        const exact = quoteAppearsIn(claim.text, norm);
                        const span = exact ? null : (raw ? bestVerbatimSpan(claim.text, raw) : null);
                        if (!exact && !span) continue;
                        const page = ptr.replace(/#c\d+$/i, '');
                        const realNames = realSourceNames(ptr);
                        row.pointer = ptr;
                        row.realSources = realNames;
                        row.url = lookupPointerUrl(ptr) || (realNames[0] ? lookupSourceUrl(realNames[0]) : null) || lookupFrontmatterUrl(page);
                        row.verdict = 'VERIFIED';
                        row.note = 'Quote re-pointed to the source that carries it.';
                        const labelFix = claim.attributions.map(a => ({ field: a.field, value: honestLabelFor(ptr, realNames) }));
                        row.fixes = [{ field: claim.field, value: `${span || claim.text} [${ptr}]` }, ...labelFix];
                        break;
                    }
                }
                if (row.verdict === 'VERIFIED') { rows.push(row); continue; }
            }
            if (!verifiedOn) {
                row.verdict = 'UNVERIFIED';
                row.note = claim.kind === 'quote' ? 'Quote text not found verbatim in the pointed source.' : 'Statistic not found in the pointed source.';
                if (citedAs) {
                    row.fixes = claim.attributions.map(a => ({ field: a.field, value: honestLabelFor(primary, row.realSources) }));
                    row.note += ' Source label replaced with the recorded provenance.';
                }
                rows.push(row);
                continue;
            }
            // attribution fields: check each; MISMATCHES get honest replacements
            const fixes: Array<{ field: string; value: string }> = [];
            for (const a of claim.attributions) {
                if (!attributionMatches(a.value, sourceNorm, row.realSources)) {
                    fixes.push({
                        field: a.field,
                        value: ROLE_KEY.test(a.field.split('.').pop() || '') ? '' : honestLabelFor(primary, row.realSources),
                    });
                }
            }
            // MAJOR-5: named sources woven into the claim text itself
            const badInText = inTextSourcePhrases(claim.text, sourceNorm, row.realSources);
            if (fixes.length) {
                row.verdict = 'ATTRIBUTION_FIXED';
                row.fixes = fixes;
                row.note = `Cited label does not match the real source; relabeled to ${honestLabelFor(primary, row.realSources)}.`;
                if (badInText.length) row.note += ` Also names an unrecognized source in the text: ${badInText.join('; ')}.`;
            } else if (badInText.length) {
                row.verdict = 'UNVERIFIED';
                row.note = `The text names a source not found in the pointed page: ${badInText.join('; ')}. Reword or repoint before shipping.`;
            } else {
                row.verdict = 'VERIFIED';
                row.note = claim.kind === 'quote' ? 'Verbatim in source.'
                    : claim.kind === 'stat' ? 'Figures present in source.'
                    : 'Pointer resolves; prose content is not verbatim-checked.';
            }
            rows.push(row);
        }
    }
    return rows;
}

/**
 * Enforce the lock on the slides IMMUTABLY. Only rows that carry explicit
 * `fixes` are applied (UNREACHABLE rows never have any). Replacement labels
 * are always honest (real recorded sources, or the page-derived label), so a
 * strip can no longer leave a bare unattributed "Evidence" quote. Verifier
 * edits do NOT enter the user's undo history (undo must never resurrect a
 * fabricated label). Duplicate edits to one field dedupe with the relabel
 * (ATTRIBUTION_FIXED) taking precedence over an UNVERIFIED replacement.
 */
export function applyVerificationFixes<T extends { id: string; template: string; title: string; _textHistory?: any[] }>(
    slides: T[], rows: LedgerRow[],
): { slides: T[]; fixed: number; stripped: number } {
    let fixed = 0;
    let stripped = 0;
    const bySlide = new Map<string, LedgerRow[]>();
    for (const r of rows) {
        if (!r.fixes?.length) continue;
        const l = bySlide.get(r.slideId) || [];
        l.push(r);
        bySlide.set(r.slideId, l);
    }
    const out = slides.map(slide => {
        const flagged = bySlide.get(slide.id);
        if (!flagged?.length) return slide;
        const editByPath = new Map<string, { value: string; relabel: boolean }>();
        for (const r of flagged) {
            for (const f of r.fixes || []) {
                const existing = editByPath.get(f.field);
                const relabel = r.verdict === 'ATTRIBUTION_FIXED';
                if (!existing || (relabel && !existing.relabel)) editByPath.set(f.field, { value: f.value, relabel });
            }
        }
        if (!editByPath.size) return slide;
        for (const e of editByPath.values()) (e.relabel ? fixed++ : stripped++);
        const priorHistory = slide._textHistory;
        const edited = applyTextEdits(slide as any, [...editByPath.entries()].map(([path, e]) => ({ path, value: e.value }))) as T;
        // verifier fixes are not user edits: keep them OUT of the undo ring
        edited._textHistory = priorHistory;
        return edited;
    });
    return { slides: out, fixed, stripped };
}
