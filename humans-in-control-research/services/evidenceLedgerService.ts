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
