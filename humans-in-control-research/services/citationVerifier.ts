/**
 * citationVerifier.ts - WS-B of the provenance-lock plan
 * (plans/citation-integrity-provenance-lock-2026-08-17.md).
 *
 * The runtime claims gate born from the 2026-08-17 field incident: a client
 * deck shipped with REAL corpus content wearing FABRICATED source identities
 * ("Intuit Mid-Market AI Report", "BILL Case Study", "HFTP") plus off-industry
 * evidence framed as in-industry proof. Every claim existed in the corpus;
 * attribution was the failure. This module makes the check deterministic and
 * in-path: quotes must appear verbatim in their pointed source, statistics'
 * numbers must exist in the source text, and attribution labels must match the
 * source's REAL recorded identity, or they are fixed/stripped before render.
 *
 * Zero model calls. Page text loads once per deck via /api/wiki/read (cached).
 */

import { lookupChunkAttribution, lookupPointerUrl, lookupSourceUrl } from './citationPointerRegistry';
import { applyTextEdits } from './slideTextEditing';

const PROXY_BASE = 'http://127.0.0.1:5012';

/** [path.md#cN] markers as they appear in raw payload strings (pre-resolution). */
const POINTER_RE = /([\w./\\-]+\.md)#c(\d+)/gi;

export interface EvidenceClaim {
    slideId: string;
    slideTitle: string;
    /** payload path of the CLAIM text field. */
    field: string;
    /** payload path of the attribution field on the same object, when present. */
    attributionField?: string;
    kind: 'quote' | 'stat' | 'text';
    text: string;
    attribution?: string;
    pointers: string[];
}

export type Verdict = 'VERIFIED' | 'ATTRIBUTION_FIXED' | 'UNVERIFIED' | 'UNSOURCED';

export interface LedgerRow {
    slideId: string;
    slideTitle: string;
    field: string;
    kind: 'quote' | 'stat' | 'text';
    claim: string;
    citedAs: string;
    realSources: string[];
    url: string | null;
    verdict: Verdict;
    note: string;
}

const ATTRIBUTION_KEY = /^(attribution|source|speaker|citedFrom|sourceName|cite|byline)$/i;
const QUOTEISH_KEY = /quote|evidence/i;
const MEDIA_KEY = /image|icon|url|src|logo|glyph/i;

function extractPointers(s: string): string[] {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(POINTER_RE.source, 'gi');
    while ((m = re.exec(s)) !== null) {
        const p = `${m[1].replace(/\\/g, '/')}#c${m[2]}`;
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

    const visit = (node: any, prefix: string, depth: number) => {
        if (!node || typeof node !== 'object' || depth > 6 || claims.length >= 80) return;
        if (Array.isArray(node)) {
            node.forEach((item, i) => visit(item, `${prefix}[${i}]`, depth + 1));
            return;
        }
        // attribution sibling on this object (one per object is the schema norm)
        let attribution: string | undefined;
        let attributionField: string | undefined;
        for (const [k, v] of Object.entries(node)) {
            if (ATTRIBUTION_KEY.test(k) && typeof v === 'string' && v.trim()) {
                attribution = stripPointerMarkers(v.trim());
                attributionField = prefix ? `${prefix}.${k}` : k;
                break;
            }
        }
        for (const [k, v] of Object.entries(node)) {
            if (k.startsWith('_') || MEDIA_KEY.test(k)) continue;
            const p = prefix ? `${prefix}.${k}` : k;
            if (typeof v === 'string') {
                if (ATTRIBUTION_KEY.test(k)) continue; // the label, not a claim
                const pointers = extractPointers(v);
                const quoteish = QUOTEISH_KEY.test(k);
                if (!pointers.length && !(quoteish && v.trim().length >= 20)) continue;
                const text = stripPointerMarkers(v);
                if (text.length < 8) continue;
                const kind: EvidenceClaim['kind'] = quoteish ? 'quote' : (/\d/.test(text) ? 'stat' : 'text');
                claims.push({ slideId, slideTitle, field: p, attributionField, kind, text, attribution, pointers });
            } else if (v && typeof v === 'object') {
                visit(v, p, depth + 1);
            }
        }
    };
    visit(root, '', 0);
    return claims;
}

/** Normalization shared by both sides of every containment check. */
export function normalizeForMatch(s: string): string {
    return String(s || '')
        .toLowerCase()
        .replace(/[‘’‚′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/[–—]/g, '-')
        .replace(/[^a-z0-9%$.']+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Quote check: every ellipsis-separated segment must appear verbatim in the source. */
export function quoteAppearsIn(quote: string, sourceNorm: string): boolean {
    const segments = String(quote).split(/\.\.\.|…/).map(s => normalizeForMatch(s)).filter(s => s.length >= 15);
    if (!segments.length) {
        const whole = normalizeForMatch(quote);
        return whole.length >= 8 && sourceNorm.includes(whole);
    }
    return segments.every(seg => sourceNorm.includes(seg));
}

/** Stat check: every numeric token in the claim must exist in the source text. */
export function statsAppearIn(claim: string, sourceNorm: string): boolean {
    const tokens = (claim.match(/\d[\d,]*(?:\.\d+)?%?/g) || []).map(t => t.replace(/,/g, ''));
    if (!tokens.length) return true;
    const src = sourceNorm.replace(/,/g, '');
    return tokens.every(t => src.includes(t));
}

const NAMED_ARTIFACT = /\b(report|study|survey|summit|index|whitepaper|case stud|benchmark|census)\b/i;
const ATTR_STOPWORDS = new Set(['report', 'study', 'survey', 'summit', 'index', 'case', 'whitepaper', 'review', 'article', 'blog', 'data', 'the', 'and', 'for', 'with', 'from', 'internal', 'client', 'upload']);

/**
 * Attribution check, two tiers:
 * - A NAMED ARTIFACT label ("X Report, 2026") must appear as a PHRASE (year
 *   stripped) in the source text or the registry's real names: invented report
 *   titles die here even when their brand words appear in the article.
 * - A person/org label needs at least one significant token in the real names
 *   or source text.
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
    if (!tokens.length) return true; // nothing checkable ("2026"): leave to the quote check
    return tokens.some(t => namesNorm.includes(t) || sourceNorm.includes(t));
}

/** Page-text loader with per-run cache. Exposed for test injection. */
export type PageFetcher = (pagePath: string) => Promise<string | null>;

export function makeWikiPageFetcher(): PageFetcher {
    const cache = new Map<string, string | null>();
    return async (pagePath: string) => {
        if (cache.has(pagePath)) return cache.get(pagePath)!;
        let text: string | null = null;
        try {
            const r = await fetch(`${PROXY_BASE}/api/wiki/read/${pagePath.split('/').map(encodeURIComponent).join('/')}`);
            if (r.ok) {
                const d = await r.json();
                if (d?.exists && typeof d.content === 'string' && d.content) text = normalizeForMatch(d.content);
            }
        } catch { /* offline proxy: rows become UNVERIFIED(page unreachable), never a silent pass */ }
        cache.set(pagePath, text);
        return text;
    };
}

/** Honest display label for a pointer's real identity (registry tiers). */
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
    for (const slide of slides || []) {
        for (const claim of extractEvidenceClaims(slide)) {
            const row: LedgerRow = {
                slideId: claim.slideId, slideTitle: claim.slideTitle, field: claim.field,
                kind: claim.kind, claim: claim.text.slice(0, 220), citedAs: claim.attribution || '',
                realSources: [], url: null, verdict: 'UNSOURCED', note: '',
            };
            if (!claim.pointers.length) {
                row.note = claim.attribution
                    ? 'Carries a source label but no corpus pointer: the label cannot be trusted and will not render.'
                    : 'No corpus pointer: unsourced content.';
                rows.push(row);
                continue;
            }
            // try each pointer; first page containing the claim wins
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
            row.realSources = realSourceNames(primary);
            row.url = lookupPointerUrl(primary) || (row.realSources[0] ? lookupSourceUrl(row.realSources[0]) : null);
            if (!verifiedOn) {
                row.verdict = 'UNVERIFIED';
                row.note = anyPageLoaded
                    ? (claim.kind === 'quote' ? 'Quote text not found in the pointed source.' : 'Statistic not found in the pointed source.')
                    : 'Pointed source page could not be loaded for verification.';
                rows.push(row);
                continue;
            }
            const attrOk = attributionMatches(claim.attribution || '', sourceNorm, row.realSources);
            if (!attrOk) {
                row.verdict = 'ATTRIBUTION_FIXED';
                row.note = `Cited label does not match the real source; relabeled to ${row.realSources.join('; ') || 'the recorded source'}.`;
            } else {
                row.verdict = 'VERIFIED';
                row.note = claim.kind === 'quote' ? 'Verbatim in source.' : 'Present in source.';
            }
            rows.push(row);
        }
    }
    return rows;
}

/**
 * Enforce the lock on the slides (immutably, through the WS-4 edit contract):
 * - ATTRIBUTION_FIXED: the attribution field is rewritten to the REAL source
 *   name(s); the model's invented label never renders.
 * - UNVERIFIED with a source label: the label is STRIPPED so fabricated-looking
 *   attribution cannot ship; the ledger row carries the warning.
 * Returns the updated slides (same refs where nothing changed).
 */
export function applyVerificationFixes<T extends { id: string; template: string; title: string }>(
    slides: T[], rows: LedgerRow[],
): { slides: T[]; fixed: number; stripped: number } {
    let fixed = 0;
    let stripped = 0;
    const bySlide = new Map<string, LedgerRow[]>();
    for (const r of rows) {
        if (r.verdict !== 'ATTRIBUTION_FIXED' && r.verdict !== 'UNVERIFIED') continue;
        const l = bySlide.get(r.slideId) || [];
        l.push(r);
        bySlide.set(r.slideId, l);
    }
    const out = slides.map(slide => {
        const flagged = bySlide.get(slide.id);
        if (!flagged?.length) return slide;
        const edits: Array<{ path: string; value: string }> = [];
        const claims = extractEvidenceClaims(slide);
        for (const r of flagged) {
            const claim = claims.find(c => c.field === r.field);
            if (!claim?.attributionField) continue;
            if (r.verdict === 'ATTRIBUTION_FIXED' && r.realSources.length) {
                edits.push({ path: claim.attributionField, value: r.realSources.slice(0, 2).join('; ') });
                fixed++;
            } else if (r.verdict === 'UNVERIFIED' && claim.attribution) {
                edits.push({ path: claim.attributionField, value: '' });
                stripped++;
            }
        }
        return edits.length ? applyTextEdits(slide as any, edits) as T : slide;
    });
    return { slides: out, fixed, stripped };
}
