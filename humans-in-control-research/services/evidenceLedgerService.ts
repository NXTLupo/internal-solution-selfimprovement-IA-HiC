/**
 * EVIDENCE LEDGER — the typed provenance spine of the AIR (WS-0).
 * Every claim a HiC artifact makes is backed by EvidencePointer[] that dereference to real cited chunks with
 * per-type source attribution. This module defines the types + the minimum-support policy (the claim-evidence
 * compiler contract, WS-A) and helpers to assemble a ledger from manifest-resolved chunks. It does NOT call a
 * model; it operates on already-resolved chunk records.
 *
 * Anti-RAG (ratified 2026-06-30): evidence is objective+manifest-first; a pointer ALWAYS dereferences to a
 * cited chunk; embeddings/ANN may rank candidates but every retained pointer carries its manifest pointer +
 * source lineage. Bulk injection of un-pointered nearest-neighbors is forbidden.
 */

export type EvidenceSourceType = 'upload' | 'web' | 'cached_wiki' | 'deep_research' | 'connector' | 'social';

export interface EvidenceSource {
    sourceId: string;
    sourceType: EvidenceSourceType;
    /** real per-type attribution: outlet / subreddit / platform / publication — never a provider bucket. */
    sourceName: string;
    title?: string;
    author?: string;
    url?: string;
    observedAt?: string;
    /** the rendered citation label, e.g. "Higher Ed Dive: <title>" or "Reddit r/NEU: u/<user>". */
    attributionLabel: string;
}

export interface EvidencePointer {
    /** the manifest chunk pointer, e.g. "articles/x.md#c3". ALWAYS dereferenceable. */
    pointer: string;
    wikiPath: string;
    chunkId: string;
    charSpan?: [number, number];
    /** verbatim quote sliced from the chunk (optional but preferred for Evidence-labeled fields). */
    quote?: string;
    /** the REAL underlying source(s); a synthesis lists all, never a single false primary. */
    sources: EvidenceSource[];
    /** 0-100 relevance to the research objective. */
    objectiveScore: number;
    /** which decomposed sub-questions this evidence answers. */
    subQuestionIds: string[];
    concepts: string[];
    relatedChunks: string[];
    /** 0-1 confidence the attribution is correct (drops on stale char_span / unresolved redirect). */
    provenanceConfidence: number;
}

/** A claim compiled from a support set, with the minimum-support policy (WS-A claim-evidence compiler). */
export interface CompiledClaim {
    claimId: string;
    text: string;
    support: EvidencePointer[];
    supportCount: number;
    sourceDiversity: number;   // count of distinct sourceName across support
    verifierPass: boolean;     // set by the citation verifier
}

export interface ClaimSupportPolicy {
    minSupportCount: number;     // default 2
    minSourceDiversity: number;  // default 2
    requireVerifierPass: boolean;
}

export const DEFAULT_CLAIM_POLICY: ClaimSupportPolicy = {
    minSupportCount: 2,
    minSourceDiversity: 2,
    requireVerifierPass: true,
};

/** Distinct sourceName count across a support set. */
export function sourceDiversity(support: EvidencePointer[]): number {
    const names = new Set<string>();
    for (const p of support) for (const s of p.sources) if (s.sourceName) names.add(s.sourceName.trim().toLowerCase());
    return names.size;
}

/** Does a claim's support meet the policy? (the WS-A gate input, evaluated per claim). */
export function claimMeetsPolicy(claim: CompiledClaim, policy: ClaimSupportPolicy = DEFAULT_CLAIM_POLICY): boolean {
    if (claim.supportCount < policy.minSupportCount) return false;
    if (claim.sourceDiversity < policy.minSourceDiversity) return false;
    if (policy.requireVerifierPass && !claim.verifierPass) return false;
    return true;
}

/** Build a CompiledClaim from raw text + support pointers, computing diversity. verifierPass defaults false
 *  (the verifier sets it true after the accessibility/relevance/factual check). */
export function compileClaim(claimId: string, text: string, support: EvidencePointer[]): CompiledClaim {
    return {
        claimId,
        text,
        support,
        supportCount: support.length,
        sourceDiversity: sourceDiversity(support),
        verifierPass: false,
    };
}

/** True if a pointer is well-formed (dereferenceable): has a wikiPath#cN shape + at least one named source. */
export function isWellFormedPointer(p: EvidencePointer): boolean {
    return !!p.pointer && /#c\d+$/i.test(p.pointer) && Array.isArray(p.sources) && p.sources.some(s => !!s.sourceName);
}

// -----------------------------------------------------------------------------
// Stage-3 (2026-06-30): build a REAL evidence ledger from the manifest-resolved chunks that grounded a
// generation. Maps each ResolvedChunk (wikiPointerResolver) to an EvidencePointer, carrying its per-chunk
// sources (WS-A), concepts + related_chunks (WS-G). This replaces the beachhead's empty ledger so AIR
// evidence is the actual cited corpus. A chunk with no per-chunk sources still yields a dereferenceable
// pointer (page-level attribution applies); the shadow gate reports how many lack named sources - the
// upstream pressure to populate per-chunk sources (WS-A data-lag).
// -----------------------------------------------------------------------------

/** Minimal structural shape of a wikiPointerResolver.ResolvedChunk (imported structurally to avoid a
 *  hard import cycle; the fields used here are stable). */
export interface ResolvedChunkLike {
    id: string;
    sourcePath?: string;
    text?: string;
    sources?: Array<{ n: string; u: string }>;
    concepts?: string[];
    relatedChunks?: string[];
}

/** STRAGGLER D3/#15 forward-fix (2026-07-01): recover named sources from a chunk's INLINE "Source:" line
 *  when the manifest chunk carries no structured `sources:` frontmatter (the common case for pages chunked
 *  before the WS-A wiki_chunker began extracting per-chunk sources). Live-validated on a real #slides AIR:
 *  13/92 pointers carried "Source: [Name](url)" in the body but shipped an empty sources[] (un-well-formed).
 *  HIGH-PRECISION by design: fires only on a "Source(s):" label, so bot/boilerplate text is never mis-read as
 *  a source. Fallback only - never overrides structured manifest sources. Confidence 0.6 (real name, parsed
 *  from body not frontmatter) sits between structured (0.85) and none (0.4). */
// D3 guard (2026-07-01): reject junk "source names" - provider buckets (never cite "gemini"/"openai" per the
// citation rules) and URL-as-name (raw redirect links). Deep-research bodies carry "Source: [gemini](vertexai
// redirect)" placeholders that are NOT real sources; their real attribution is the doc-level resolved_sources
// (resolved via the #14 page-level tier at cite time), so inline junk must be dropped. Mirrors the Python
// _is_junk_source_name in proxy/wiki_chunker.py.
const PROVIDER_BUCKET_NAMES = new Set([
    'gemini', 'openai', 'claude', 'anthropic', 'deepseek', 'gpt', 'chatgpt',
    'vertex', 'vertexai', 'model', 'ai', 'bot', 'source', 'sources', 'n/a', 'na',
]);
function isJunkSourceName(name: string): boolean {
    const n = (name || '').trim().toLowerCase();
    if (!n || n.startsWith('http://') || n.startsWith('https://')) return true;
    return PROVIDER_BUCKET_NAMES.has(n);
}

export function extractInlineSources(text: string): EvidenceSource[] {
    if (!text) return [];
    const out: EvidenceSource[] = [];
    const seen = new Set<string>();
    const labelRe = /\bSources?:\s*(.+?)(?:\n|$)/gi;   // the source clause on its line
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = labelRe.exec(text)) !== null && out.length < 6) {
        const clause = m[1];
        let hadLink = false;
        let lm: RegExpExecArray | null;
        linkRe.lastIndex = 0;
        while ((lm = linkRe.exec(clause)) !== null) {
            hadLink = true;
            const name = lm[1].trim();
            const url = lm[2].trim();
            const key = name.toLowerCase();
            if (name && !seen.has(key) && !isJunkSourceName(name)) {
                seen.add(key);
                out.push({ sourceId: url, sourceType: 'web', sourceName: name, url, attributionLabel: name });
            }
        }
        if (!hadLink) {
            const name = clause.replace(/[)\]]+\s*$/, '').trim().slice(0, 80);   // "(Source: X)" / "[Source: X]" -> X
            const key = name.toLowerCase();
            if (name.length >= 2 && !seen.has(key) && !isJunkSourceName(name)) {
                seen.add(key);
                out.push({ sourceId: `inline:${key}`, sourceType: 'web', sourceName: name, attributionLabel: name });
            }
        }
    }
    return out;
}

/** Map one resolved chunk to an EvidencePointer. objectiveScore defaults to 0 (retrieval-time score is
 *  wired in WS-F/AIR-objective work); provenanceConfidence reflects whether per-chunk sources were present. */
export function resolvedChunkToEvidence(chunk: ResolvedChunkLike, objectiveScore = 0): EvidencePointer {
    const id = chunk.id || '';
    const hashIdx = id.indexOf('#');
    const wikiPath = chunk.sourcePath || (hashIdx >= 0 ? id.slice(0, hashIdx) : id);
    const chunkId = hashIdx >= 0 ? id.slice(hashIdx + 1) : id;
    const structured: EvidenceSource[] = (chunk.sources || [])
        .map((s, i) => ({
            sourceId: s.u || `${id}-s${i}`,
            sourceType: 'web' as EvidenceSourceType,   // best-effort; refined when source metadata carries type
            sourceName: (s.n || '').trim(),
            url: s.u || undefined,
            attributionLabel: (s.n || '').trim(),
        }))
        .filter(s => s.sourceName);
    // D3/#15 forward-fix: when the manifest chunk has no structured sources, recover them from the inline
    // "Source:" line in the body. Fallback only - structured manifest sources always win.
    const sources = structured.length ? structured : extractInlineSources(chunk.text || '');
    const provenanceConfidence = structured.length ? 0.85 : (sources.length ? 0.6 : 0.4);
    return {
        pointer: id,
        wikiPath,
        chunkId,
        quote: (chunk.text || '').slice(0, 400),
        sources,
        objectiveScore,
        subQuestionIds: [],
        concepts: chunk.concepts || [],
        relatedChunks: chunk.relatedChunks || [],
        provenanceConfidence,
    };
}

/** D12-enabler / quality (2026-07-01): recognise NON-EVIDENCE chunks - platform/bot/moderator boilerplate
 *  and tombstones that carry no claim-supporting content. Live-validated on a real #slides AIR whose ledger
 *  cited "I am a bot, and this action was performed automatically. Please contact the moderators of this
 *  subreddit". Such text backs no claim, so it must not appear in an EVIDENCE ledger (and should not ground a
 *  generation). HIGH-PRECISION: matches known automated-boilerplate markers, not ordinary prose. Exported so
 *  the retrieval path (wikiPointerResolver/chunkRetrieval) can adopt the same predicate to stop junk grounding
 *  at source (deploy-gated follow-up). */
const NON_EVIDENCE_MARKERS: RegExp[] = [
    /\bI am a bot\b/i,
    /this action was performed automatically/i,
    /contact the moderators of this subreddit/i,
    /\byour (post|submission|comment) (has been|was) removed\b/i,
    /\bposts?\s+must\b.*\bremoved\b/i,
    /^\s*\[(deleted|removed)\]\s*$/i,
    /\bI'm a bot\b/i,
];
export function isNonEvidenceChunk(text?: string): boolean {
    const t = (text || '').trim();
    if (t.length < 12) return true;                                  // empty / stub
    if (/^\s*\[(deleted|removed)\]\s*$/i.test(t)) return true;
    return NON_EVIDENCE_MARKERS.some(re => re.test(t));
}

/** Build an evidence ledger from the resolved chunks that grounded a generation. Non-evidence chunks
 *  (bot/mod boilerplate, tombstones) are dropped: an evidence ledger lists only claim-supporting corpus.
 *  A chunk carrying structured manifest sources is citable regardless of body text (the drop is text-based). */
export function buildEvidenceLedger(chunks: ResolvedChunkLike[]): EvidencePointer[] {
    return (chunks || [])
        .filter(c => {
            if (!c || !c.id) return false;
            if (c.sources && c.sources.length) return true;   // structured sources -> citable, keep
            return !isNonEvidenceChunk(c.text);                // else drop bot/mod boilerplate + stubs
        })
        .map(c => resolvedChunkToEvidence(c));
}
