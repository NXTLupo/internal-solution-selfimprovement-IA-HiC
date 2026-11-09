/**
 * corpusMergeAuthority.ts — the single dedup authority for every corpus path.
 *
 * Enhancement B (plan: plans/data-pipeline-bulletproofing-2026-06-08.md).
 *
 * Before this module, each merge site invented its own dedup key:
 *   - mergeResultsToCorpus: dedup by item.id only (no URL/content match)
 *   - mergeCachedThemes: dedup by theme NAME (lexical; variant names double-count)
 *   - uploadsToDataSourceItems: dedup by filename only
 *   - reddit merge: dedup by post id
 * That scatter is exactly why cached + fresh + uploaded items double-counted.
 *
 * This module gives every corpus unit a content-addressed identity and one
 * deterministic merge with provenance preserved. Two items are duplicates if
 * they share, in PRECEDENCE order:
 *   1. clusterId   (themes: the cluster id `<file>#<index>`)
 *   2. contentHash (fingerprint of the first 4KB of normalized body)
 *   3. urlKey      (normalized URL, mirrors the proxy's _url_hash recipe)
 *
 * The FIRST item seen is canonical; later duplicates collapse INTO it,
 * appending their id/url to `merged_from` and folding in relevance. Callers
 * order their inputs so the item they want to keep canonical comes first
 * (uploads first; cached themes first).
 *
 * Pure + synchronous (no crypto.subtle await) so it is unit-testable and safe
 * to call inside hot synthesis loops. The fingerprint is a fast non-crypto
 * 53-bit string hash — this is a dedup key, not a security boundary.
 */

// ---------------------------------------------------------------------------
// Identity primitives
// ---------------------------------------------------------------------------

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'fbclid', 'gclid',
];

/**
 * Normalize a URL for dedup keying. Mirrors proxy/app.py::_url_hash
 * canonicalization: lowercase, strip tracking params, drop trailing /?&.
 * Returns '' for empty/synthetic-less input so the urlKey is simply skipped.
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  let u = String(url).trim().toLowerCase();
  if (!u) return '';
  for (const p of TRACKING_PARAMS) {
    u = u.replace(new RegExp(`[?&]${p}=[^&]*`, 'g'), '');
  }
  u = u.replace(/[/?&]+$/g, '');
  return u;
}

/**
 * Fast, stable, synchronous fingerprint of body text. Normalizes whitespace
 * + case, takes the first `maxChars`, then runs a 53-bit cyrb53-style hash.
 * Same text -> same hex string, across sessions and reloads.
 */
export function contentFingerprint(text: string | undefined | null, maxChars = 4096): string {
  if (!text) return '';
  const norm = String(text).replace(/\s+/g, ' ').trim().toLowerCase().slice(0, maxChars);
  if (!norm) return '';
  let h1 = 0xdeadbeef ^ norm.length;
  let h2 = 0x41c6ce57 ^ norm.length;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}


// ---------------------------------------------------------------------------
// Identity extraction
// ---------------------------------------------------------------------------

export interface MergeIdentity {
  clusterId: string;   // '' when not a theme
  contentHash: string; // '' when no body
  urlKey: string;      // '' when no resolvable URL
}

/** Identity for a raw corpus item (article / social post / upload). */
function identityOfItem(item: any): MergeIdentity {
  return {
    clusterId: '', // raw items carry no cluster identity
    contentHash: contentFingerprint(item?.content ?? item?.body ?? item?.selftext ?? ''),
    urlKey: normalizeUrl(item?.url ?? item?.permalink ?? ''),
  };
}

/**
 * Identity for a theme. clusterId is the authoritative key (the cluster the
 * theme came from); contentHash of the summary catches re-synthesized twins
 * that were assigned a fresh id. NAME is intentionally NOT a key — variant
 * names were the double-count bug.
 */
function identityOfTheme(theme: any): MergeIdentity {
  const cid = String(theme?.id ?? theme?.cluster_id ?? theme?.clusterId ?? '').trim();
  const summary = theme?.summary ?? theme?.description ?? theme?.name ?? theme?.title ?? '';
  return {
    clusterId: cid,
    contentHash: contentFingerprint(summary, 1024),
    // NO urlKey for themes. source_synthesis_path is the FILE, shared by every
    // theme in that synthesis file (file#0, file#1, ...), so using it as a key
    // wrongly collapses DISTINCT themes from the same file (live run 2026-06-08
    // showed 467 such false collapses). A theme's identity is its cluster id
    // (precise) plus a summary fingerprint (catches reworded twins). The file
    // path is provenance, not identity.
    urlKey: '',
  };
}

// ---------------------------------------------------------------------------
// Merge stats
// ---------------------------------------------------------------------------

export interface MergeStats {
  input: number;
  output: number;
  collapsed: number;
  byKey: { clusterId: number; contentHash: number; urlKey: number };
}

function emptyStats(input: number): MergeStats {
  return { input, output: 0, collapsed: 0, byKey: { clusterId: 0, contentHash: 0, urlKey: 0 } };
}

// Surfaced for traceRecorder / qualityFrontier (corpus_dedup_rate dim) and for
// the validate_no_corpus_duplicates Stop hook. Last merge wins; cheap to read.
export interface LastDedup { scope: string; stats: MergeStats; at: number }
function recordLastDedup(scope: string, stats: MergeStats): void {
  try {
    const g: any = (typeof window !== 'undefined' ? window : globalThis) as any;
    const log: LastDedup[] = g.__hicDedupLog || (g.__hicDedupLog = []);
    log.push({ scope, stats, at: Date.now() });
    if (log.length > 50) log.splice(0, log.length - 50);
    g.__hicLastDedup = { scope, stats, at: Date.now() };
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Core dedup engine
// ---------------------------------------------------------------------------

type IdentityFn<T> = (item: T) => MergeIdentity;
type AbsorbFn<T> = (canonical: T, duplicate: T) => void;

/**
 * Deterministic precedence dedup. First-seen item is canonical; later items
 * sharing ANY identity key (clusterId > contentHash > urlKey) collapse into
 * it via `absorb`. Returns survivors in first-seen order + stats.
 */
export function dedupe<T>(
  items: T[],
  identityFn: IdentityFn<T>,
  absorb: AbsorbFn<T>,
): { merged: T[]; stats: MergeStats } {
  const stats = emptyStats(Array.isArray(items) ? items.length : 0);
  if (!Array.isArray(items) || items.length === 0) return { merged: [], stats };

  const byCluster = new Map<string, T>();
  const byContent = new Map<string, T>();
  const byUrl = new Map<string, T>();
  const survivors: T[] = [];

  for (const item of items) {
    if (item == null) continue;
    const id = identityFn(item);

    let canonical: T | undefined;
    let hitKey: 'clusterId' | 'contentHash' | 'urlKey' | null = null;
    if (id.clusterId && byCluster.has(id.clusterId)) { canonical = byCluster.get(id.clusterId); hitKey = 'clusterId'; }
    else if (id.contentHash && byContent.has(id.contentHash)) { canonical = byContent.get(id.contentHash); hitKey = 'contentHash'; }
    else if (id.urlKey && byUrl.has(id.urlKey)) { canonical = byUrl.get(id.urlKey); hitKey = 'urlKey'; }

    if (canonical !== undefined && hitKey) {
      absorb(canonical, item);
      stats.byKey[hitKey]++;
      stats.collapsed++;
      // Register the duplicate's OTHER keys against the canonical so a later
      // item matching by a different facet still collapses to the same survivor.
      if (id.clusterId && !byCluster.has(id.clusterId)) byCluster.set(id.clusterId, canonical);
      if (id.contentHash && !byContent.has(id.contentHash)) byContent.set(id.contentHash, canonical);
      if (id.urlKey && !byUrl.has(id.urlKey)) byUrl.set(id.urlKey, canonical);
      continue;
    }

    survivors.push(item);
    if (id.clusterId) byCluster.set(id.clusterId, item);
    if (id.contentHash) byContent.set(id.contentHash, item);
    if (id.urlKey) byUrl.set(id.urlKey, item);
  }

  stats.output = survivors.length;
  return { merged: survivors, stats };
}

// ---------------------------------------------------------------------------
// Public merge functions (the sites callers use)
// ---------------------------------------------------------------------------

function pushMergedFrom(canonical: any, dup: any): void {
  const from: string[] = Array.isArray(canonical.merged_from) ? canonical.merged_from : (canonical.merged_from = []);
  const tag = String(dup?.id ?? dup?.url ?? dup?.permalink ?? dup?.name ?? '').trim();
  if (tag && !from.includes(tag)) from.push(tag);
}

function foldRelevanceByGoal(canonical: any, dup: any): void {
  const map: Record<string, number> = canonical.relevance_by_goal || (canonical.relevance_by_goal = {});
  const merge = (src: any) => {
    const m = src?.relevance_by_goal;
    if (m && typeof m === 'object') {
      for (const [k, v] of Object.entries(m)) {
        const n = Number(v);
        if (Number.isFinite(n)) map[k] = Math.max(map[k] ?? 0, n);
      }
    }
  };
  merge(canonical);
  merge(dup);
}

/**
 * Merge a list of raw corpus items (uploads + fresh + cached articles, in
 * caller-chosen order). Canonical = first seen. Absorb keeps the higher
 * relevanceScore, the longer body, folds relevance_by_goal, and records
 * provenance. Order is preserved.
 */
export function mergeCorpusItems(items: any[], opts?: { scope?: string }): { merged: any[]; stats: MergeStats } {
  const absorb: AbsorbFn<any> = (canonical, dup) => {
    pushMergedFrom(canonical, dup);
    foldRelevanceByGoal(canonical, dup);
    const cr = Number(canonical.relevanceScore);
    const dr = Number(dup?.relevanceScore);
    if (Number.isFinite(dr) && (!Number.isFinite(cr) || dr > cr)) canonical.relevanceScore = dr;
    const cBody = String(canonical.content ?? '');
    const dBody = String(dup?.content ?? '');
    if (dBody.length > cBody.length) canonical.content = dBody;
    if (!canonical.enriched && dup?.enriched) canonical.enriched = true;
  };
  const res = dedupe(items, identityOfItem, absorb);
  recordLastDedup(opts?.scope || 'corpus-items', res.stats);
  return res;
}

/**
 * Merge cached themes (canonical, first) with freshly synthesized themes.
 * Dedup is by clusterId then summary fingerprint, NOT by name. Returns the
 * merged list with cached themes retained and fresh twins collapsed (no
 * double-count). This is the fix for P2 (lexical theme dedup).
 */
export function mergeThemeSets(
  cached: any[],
  fresh: any[],
  opts?: { scope?: string },
): { merged: any[]; stats: MergeStats } {
  const cachedArr = Array.isArray(cached) ? cached : [];
  const freshArr = Array.isArray(fresh) ? fresh : [];
  const absorb: AbsorbFn<any> = (canonical, dup) => {
    pushMergedFrom(canonical, dup);
    absorbThemeFields(canonical, dup);
    // 2026-10-20 (root-cause audit A1): a twin's citations are corroboration, not
    // noise. Fold them into the kept theme so the union survives the merge.
    foldThemeEvidence(canonical, dup);
    canonical._hasFreshTwin = true;
  };
  const res = dedupe([...cachedArr, ...freshArr], identityOfTheme, absorb);
  recordLastDedup(opts?.scope || 'themes', res.stats);
  return res;
}

// ---------------------------------------------------------------------------
// Theme twin folding (2026-10-20, root-cause audit A1: cross-shard corroboration
// was discarded with its citations because the shard dedupe was an exact
// lower-cased name check). The helpers below are the ONE place a theme twin's
// evidence folds into the theme that is kept.
// ---------------------------------------------------------------------------

/** If the canonical theme is thinner than its twin, absorb the richer fields so retention does not cost depth. */
function absorbThemeFields(canonical: any, dup: any): void {
  const cSum = String(canonical.summary ?? canonical.description ?? '');
  const dSum = String(dup?.summary ?? dup?.description ?? '');
  if (dSum.length > cSum.length) {
    if (!canonical.description || String(canonical.description).length < dSum.length) canonical.description = dSum;
  }
  const cTerms = Array.isArray(canonical.top_terms) ? canonical.top_terms : [];
  const dTerms = Array.isArray(dup?.top_terms) ? dup.top_terms : [];
  if (dTerms.length > cTerms.length) canonical.top_terms = dTerms;
  if (!canonical.quote && dup?.quote) canonical.quote = dup.quote;
  const cAlign = Number(canonical.goalAlignment);
  const dAlign = Number(dup?.goalAlignment);
  if (Number.isFinite(dAlign) && (!Number.isFinite(cAlign) || dAlign > cAlign)) canonical.goalAlignment = dAlign;
}

/**
 * Origin of a citation: canonical host + path when it carries a URL, otherwise the
 * normalized source name / file. Two citations with the same origin are ONE source
 * for `distinct_source_count` (the same recipe the theme evidence gate uses).
 */
export function citationOriginKey(c: any): string {
  const url = String(c?.url || c?.sourceUrl || '').trim();
  if (url) {
    try {
      const u = new URL(url);
      return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '') || '/'}`;
    } catch { /* fall through to the name key */ }
  }
  return String(c?.sourceName || c?.sourceFile || c?.source || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Identity of ONE citation: its origin plus a fingerprint of its quoted span (same origin, different span = two citations). */
function citationKey(c: any): string {
  const origin = normalizeUrl(c?.url || c?.sourceUrl || '') || citationOriginKey(c);
  const span = contentFingerprint(String(c?.text ?? c?.quote ?? c?.excerpt ?? c?.snippet ?? ''), 512);
  return `${origin}::${span}`;
}

function unionStrings(a: unknown, b: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const v of list) {
      const s = typeof v === 'string' ? v : String(v?.quote ?? v?.text ?? v?.name ?? '');
      const k = s.replace(/\s+/g, ' ').trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

/** Distinct origins among a theme's citations, written onto `distinct_source_count` and `evidence_tier`. */
export function recountThemeSources(theme: any): number {
  const cits = Array.isArray(theme?.citations) ? theme.citations : [];
  const origins = new Set(cits.map(citationOriginKey).filter(Boolean));
  theme.distinct_source_count = origins.size;
  theme.evidence_tier = origins.size >= 2 ? 'thick' : 'single_source';
  return origins.size;
}

/**
 * Fold a twin's evidence into the kept theme: union of citations (by origin + span),
 * quotes / keyQuotes / sources, plus the recount of distinct origins. The twin's
 * citations are appended AFTER the canonical ones, so any `citationIndices` already
 * computed against the canonical theme stay valid.
 */
export function foldThemeEvidence(canonical: any, dup: any): void {
  const cCits: any[] = Array.isArray(canonical.citations) ? canonical.citations : (canonical.citations = []);
  const seen = new Set(cCits.map(citationKey));
  let added = 0;
  for (const c of (Array.isArray(dup?.citations) ? dup.citations : [])) {
    if (!c || typeof c !== 'object') continue;
    const k = citationKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    cCits.push(c);
    added++;
  }
  for (const field of ['keyQuotes', 'key_quotes', 'quotes', 'representativeQuotes', 'sources', 'sourceNames']) {
    if (Array.isArray(dup?.[field]) && dup[field].length) {
      canonical[field] = unionStrings(canonical[field], dup[field]);
    }
  }
  canonical.shard_corroboration = (Number(canonical.shard_corroboration) || 1) + 1;
  if (added) canonical.citations_folded = (Number(canonical.citations_folded) || 0) + added;
  recountThemeSources(canonical);
}

// ---------------------------------------------------------------------------
// Near-duplicate theme names (2026-10-20, audit A1 part b)
// ---------------------------------------------------------------------------

const NAME_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'with', 'by', 'from', 'as', 'at',
  'is', 'are', 'be', 'into', 'over', 'under', 'vs', 'versus', 'across', 'their', 'its', 'that',
  'this', 'than', 'how', 'what', 'when', 'where', 'who', 'which', 'not', 'no', 'but', 'it', 'they',
  'them', 'we', 'our', 'your', 'you', 'do', 'does', 'can', 'will', 'more', 'most', 'now', 'still',
]);

/** Normalized, stopword-stripped tokens of a theme name (lower-case, alphanumeric only). */
export function themeNameTokens(name: unknown): string[] {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(t => t.length > 0 && !NAME_STOPWORDS.has(t));
}

/** The near-duplicate bar: token Jaccard at or above this is the same theme. */
const THEME_NAME_JACCARD_FLOOR = 0.7;

/**
 * True when two theme names denote the same theme: identical after normalization,
 * one name's token sequence contained in the other's (two or more tokens, so a
 * single shared buzzword such as "ai" never collapses two themes), or token
 * Jaccard >= THEME_NAME_JACCARD_FLOOR.
 */
export function themeNamesNearDuplicate(a: unknown, b: unknown): boolean {
  const ta = themeNameTokens(a);
  const tb = themeNameTokens(b);
  if (!ta.length || !tb.length) return false;
  const ja = ta.join(' ');
  const jb = tb.join(' ');
  if (ja === jb) return true;
  const [shorter, longer] = ta.length <= tb.length ? [ja, jb] : [jb, ja];
  const shorterTokens = Math.min(ta.length, tb.length);
  if (shorterTokens >= 2 && ` ${longer} `.includes(` ${shorter} `)) return true;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union > 0 && inter / union >= THEME_NAME_JACCARD_FLOOR;
}

export interface ShardMergeResult {
  /** Themes appended to the accumulator (new identities). */
  added: number;
  /** Incoming themes folded into an existing theme (citations unioned). */
  folded: number;
  /** The themes that were appended, in order. */
  addedThemes: any[];
}

/**
 * Merge one shard's (or one retry's) themes INTO an accumulator, in place. A theme is
 * the same theme when it shares an identity key (cluster id, summary fingerprint)
 * with a kept theme OR its name is a near-duplicate of a kept theme's name. Twins
 * fold their citations, quotes and sources into the kept theme (first seen wins,
 * so an earlier shard's theme is canonical) and `distinct_source_count` reflects
 * the union. Nothing is dropped with its evidence any more.
 */
export function mergeShardThemes(accumulator: any[], incoming: any[], opts?: { scope?: string }): ShardMergeResult {
  const result: ShardMergeResult = { added: 0, folded: 0, addedThemes: [] };
  const list = Array.isArray(incoming) ? incoming : [];
  if (!Array.isArray(accumulator) || !list.length) return result;
  const stats = emptyStats(list.length);
  const byCluster = new Map<string, any>();
  const byContent = new Map<string, any>();
  const register = (t: any) => {
    const id = identityOfTheme(t);
    if (id.clusterId && !byCluster.has(id.clusterId)) byCluster.set(id.clusterId, t);
    if (id.contentHash && !byContent.has(id.contentHash)) byContent.set(id.contentHash, t);
  };
  for (const t of accumulator) if (t && typeof t === 'object') register(t);
  for (const t of list) {
    if (!t || typeof t !== 'object') continue;
    const name = String(t.name ?? t.title ?? '').trim();
    const id = identityOfTheme(t);
    let canonical: any | undefined;
    if (id.clusterId && byCluster.has(id.clusterId)) { canonical = byCluster.get(id.clusterId); stats.byKey.clusterId++; }
    else if (id.contentHash && byContent.has(id.contentHash)) { canonical = byContent.get(id.contentHash); stats.byKey.contentHash++; }
    else if (name) {
      canonical = accumulator.find(k => k && typeof k === 'object' && themeNamesNearDuplicate(k.name ?? k.title, name));
    }
    if (canonical && canonical !== t) {
      pushMergedFrom(canonical, t);
      absorbThemeFields(canonical, t);
      foldThemeEvidence(canonical, t);
      register(t);
      stats.collapsed++;
      result.folded++;
      continue;
    }
    if (!name) continue;   // a nameless theme cannot be shown or merged against
    accumulator.push(t);
    register(t);
    recountThemeSources(t);
    result.added++;
    result.addedThemes.push(t);
  }
  stats.output = result.added;
  recordLastDedup(opts?.scope || 'shard-themes', stats);
  return result;
}
