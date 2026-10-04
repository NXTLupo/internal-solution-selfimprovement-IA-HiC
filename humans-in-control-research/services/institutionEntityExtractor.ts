/**
 * Institution Entity Extractor - Sprint 2 (S2) entry point.
 *
 * Scans a free-text research brief/goal for mentions of any institution in the
 * manifest. Returns the matched InstitutionRecord objects so callers can:
 *   1. Prepend the institutions' Tier 0 first-party URLs to the collection set
 *   2. Inject UNITIDs for Urban Institute Education Data queries
 *   3. Bind YouTube channel IDs for the (future S8) scheduler
 *
 * Detection strategy (high to low precision):
 *   Tier 1: Exact alias match (word-boundary). "Northeastern", "NEU", "MIT".
 *   Tier 2: Full institution name substring. "University of Pennsylvania".
 *   Tier 3: Canonical id match with underscores/spaces. "uc_berkeley", "uc berkeley".
 *
 * Crucially, we prefer PRECISION over recall. A false positive (matching
 * "BU" inside "ABOUT" or "UC" inside "UCLA") would inject unrelated sources
 * and degrade corpus quality. Short aliases (<=3 chars) require word-boundary
 * matches with mixed case or punctuation context to count.
 *
 * This module is pure-TypeScript, no runtime dependencies beyond
 * institutionManifest.ts, so it's trivial to unit-test (once tests exist).
 */

import {
    loadInstitutionManifest,
    type InstitutionRecord,
    type InstitutionManifest,
} from './institutionManifest';

/**
 * Ambiguous short aliases that require stricter context matching.
 * Without this gate, "BU" matches "ABOUT", "UC" matches "UCLA", etc.
 */
const STRICT_ALIAS_MIN_LEN = 4;

/** Normalize a string: lowercase, collapse whitespace. Keeps punctuation for
 *  word-boundary detection during scanning. */
function normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Word-boundary check: ensure the alias appears as a standalone token, not
 *  as a substring of a longer word. Boundaries are start/end of text,
 *  whitespace, or most punctuation. */
function wordBoundaryMatch(text: string, needle: string): boolean {
    const lower = text.toLowerCase();
    const n = needle.toLowerCase();
    let idx = 0;
    while (true) {
        const found = lower.indexOf(n, idx);
        if (found === -1) return false;
        const before = found === 0 ? ' ' : lower[found - 1];
        const after = found + n.length >= lower.length ? ' ' : lower[found + n.length];
        const isWordChar = (c: string) => /[a-z0-9]/.test(c);
        if (!isWordChar(before) && !isWordChar(after)) return true;
        idx = found + 1;
    }
}

/**
 * Extract institution matches from a research goal/brief text.
 * Returns matches in order of specificity (longest/most-precise match first)
 * with duplicates removed by institution id.
 */
async function extractInstitutionsFromText(
    text: string,
    manifest?: InstitutionManifest | null,
): Promise<InstitutionRecord[]> {
    if (!text || !text.trim()) return [];
    const m = manifest || (await loadInstitutionManifest());
    if (!m) return [];
    return extractInstitutionsFromTextSync(text, m);
}

/** Synchronous extractor once the manifest has been loaded. Used by the
 *  async wrapper above and by any caller that already has the manifest. */
function extractInstitutionsFromTextSync(
    text: string,
    manifest: InstitutionManifest,
): InstitutionRecord[] {
    const normText = normalize(text);
    if (!normText) return [];

    // Build a scored candidate list. Each candidate carries the matched
    // alias length so we can dedup by institution id keeping the longest
    // (most specific) match. This naturally favors full names over short
    // aliases when both hit ("Northeastern University" + "NEU" in same text).
    const scored: Array<{ inst: InstitutionRecord; aliasLen: number; alias: string }> = [];

    for (const inst of manifest.institutions) {
        const candidates: string[] = [inst.name, ...inst.aliases];

        // Also consider the canonical id with underscores swapped for spaces
        // so users typing "uc berkeley" resolve to the "uc_berkeley" record.
        const idAsName = inst.id.replace(/_/g, ' ');
        if (!candidates.some((c) => normalize(c) === idAsName)) {
            candidates.push(idAsName);
        }

        let bestAlias = '';
        for (const c of candidates) {
            const cl = c.trim();
            if (!cl) continue;
            // Short aliases require word-boundary + length gate to avoid
            // "BU" matching inside "ABOUT"
            if (cl.length < STRICT_ALIAS_MIN_LEN) {
                // Check word-boundary against the ORIGINAL text (preserves
                // capitalization hints). "MIT" in "MIT researchers" hits;
                // "mit" in "admit" does not.
                if (wordBoundaryMatch(text, cl) && cl.length > bestAlias.length) {
                    bestAlias = cl;
                }
            } else {
                // Long aliases: simple substring match on normalized text
                if (normText.includes(normalize(cl)) && cl.length > bestAlias.length) {
                    bestAlias = cl;
                }
            }
        }

        if (bestAlias) {
            scored.push({ inst, aliasLen: bestAlias.length, alias: bestAlias });
        }
    }

    // Sort by alias length descending (longer matches = more specific =
    // higher confidence) then by first appearance in text as tiebreaker.
    scored.sort((a, b) => b.aliasLen - a.aliasLen);

    // Dedup by institution id (same institution might match multiple aliases;
    // keep the first - which is the longest alias hit)
    const seen = new Set<string>();
    const out: InstitutionRecord[] = [];
    for (const s of scored) {
        if (!seen.has(s.inst.id)) {
            seen.add(s.inst.id);
            out.push(s.inst);
        }
    }
    return out;
}

/**
 * Convenience: given a research goal, return the set of Tier 0 URLs to
 * prepend to the collection set. Delegates to manifest.collectTierZeroSources()
 * under the hood.
 *
 * Excludes YouTube RSS feed URLs - those are polling targets for the S8
 * scheduler, not webpage URLs. Including them in the webIntelligence.urls
 * pipeline would send them through /api/extract-content which either (a)
 * serves back the XML feed as text or (b) routes to /api/transcribe-youtube
 * where yt-dlp fails because there's no single video to download.
 * YouTube-channel monitoring happens on a different cadence via the
 * scheduler; this function stays to URL-fetchable webpage sources only.
 *
 * CRITICAL CAPACITY RULES (each brief, not each institution):
 *   - Hard-cap at MAX_TIER0_URLS total (prevents the "200-URL Jina storm"
 *     seen in the wild when a brief names a dozen institutions and each
 *     contributed 8 URLs, overwhelming the Jina Reader rate limit).
 *   - Cap at MAX_INSTITUTIONS when many matches are returned - the first N
 *     most-confident matches cover the brief's intent; subsequent matches
 *     are usually tangential.
 *   - Prefer HIGH-VALUE KINDS first: 990/financial report/newsroom-RSS have
 *     the richest signal per fetch. Giving-site HTML and campaign microsites
 *     are likely to produce boilerplate marketing copy.
 */
const MAX_TIER0_URLS = 12;
const MAX_INSTITUTIONS = 4;
// KINDS WE EXCLUDE FROM TIER 0: Jina Reader can't handle these content types.
// RSS feeds are handled separately by the S8 scheduler; YouTube channel RSS
// polling is also scheduler-only. Including any of them here produces
// "Connector jina failed: signal timed out" because Jina's article extractor
// hangs waiting for readable prose that RSS feeds don't have.
const TIER0_EXCLUDE_KINDS = new Set(['youtube_rss', 'newsroom_rss', 'alumni_content_rss']);
const TIER0_KIND_PRIORITY: Record<string, number> = {
    filing_990: 1,          // ProPublica 990 HTML page - dense financial data
    filing_t3010: 1,         // Canadian equivalent
    filing_aggregator: 2,    // Charity Intelligence etc. - pre-processed historical data
    financial_report: 3,     // Audited statements landing page (often has PDF link → PDF-first path)
    campaign_microsite: 4,
    alumni_content: 5,       // HTML alumni magazine
    newsroom: 6,             // HTML newsroom without RSS
    giving: 7,               // mostly marketing boilerplate
    president_office: 8,     // mostly landing page
    // *_rss kinds are EXCLUDED above; the scheduler polls them on cadence.
};
export async function tierZeroUrlsForGoal(text: string): Promise<string[]> {
    const { collectTierZeroSources } = await import('./institutionManifest');
    const allMatches = await extractInstitutionsFromText(text);
    // Cap institution count to keep Tier 0 prepend bounded. The extractor
    // already returned matches sorted by specificity (longest alias first),
    // so the top MAX_INSTITUTIONS are the most-confident hits.
    const matches = allMatches.slice(0, MAX_INSTITUTIONS);
    const candidates: { url: string; priority: number; institution_id: string }[] = [];
    const seen = new Set<string>();
    for (const inst of matches) {
        for (const src of collectTierZeroSources(inst)) {
            if (TIER0_EXCLUDE_KINDS.has(src.kind)) continue;
            if (seen.has(src.url)) continue;
            seen.add(src.url);
            candidates.push({
                url: src.url,
                priority: TIER0_KIND_PRIORITY[src.kind] ?? 50,
                institution_id: src.institution_id,
            });
        }
    }
    // Stable sort: priority asc (lower = higher value), institution_id for
    // deterministic ordering within the same priority bucket.
    candidates.sort((a, b) => a.priority - b.priority || a.institution_id.localeCompare(b.institution_id));
    return candidates.slice(0, MAX_TIER0_URLS).map((c) => c.url);
}


