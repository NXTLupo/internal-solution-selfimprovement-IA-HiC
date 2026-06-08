---
id: sources-registry/credibility-tiers.md
title: "Source Credibility Tier System"
type: source-summary
created: 2026-04-10
updated: 2026-04-10
sources: [types.ts, dataSourceConnectors.ts]
confidence: high
status: active
tags: [credibility, tiers, source-quality, provenance]
evidence_count: 0
chunks:
  - id: "sources-registry/credibility-tiers.md#c0"
    char_span: [0, 453]
    sentence_count: 3
    key_terms: [tier, source, credibility, research, system, data, aggregation, definitions]
    token_count: 84
  - id: "sources-registry/credibility-tiers.md#c1"
    char_span: [475, 2409]
    sentence_count: 6
    key_terms: [data, sources, open, institutional, tier, credibility, government, gov]
    section: The Three Tiers
    token_count: 448
  - id: "sources-registry/credibility-tiers.md#c2"
    char_span: [2411, 4424]
    sentence_count: 3
    key_terms: [sources, reddit, community, news, tier, web-only, content, user-generated]
    section: The Three Tiers
    token_count: 485
  - id: "sources-registry/credibility-tiers.md#c3"
    char_span: [4426, 6561]
    sentence_count: 5
    key_terms: [string, credibilitytier, sourceprovenance, tier, export, typescript, publicationdate, content]
    section: The Three Tiers / Type Definitions
    token_count: 505
  - id: "sources-registry/credibility-tiers.md#c4"
    char_span: [6563, 8116]
    sentence_count: 2
    key_terms: [citationspan, output, source, string, generatedtextstart, generatedtextend, ai-generated, char]
    section: Type Definitions
    token_count: 344
  - id: "sources-registry/credibility-tiers.md#c5"
    char_span: [8148, 9436]
    sentence_count: 3
    key_terms: [return, date, agedays, days, score, computefreshnessscore, publication, freshness]
    section: Freshness Scoring Formula
    token_count: 370
  - id: "sources-registry/credibility-tiers.md#c6"
    char_span: [9476, 10205]
    sentence_count: 3
    key_terms: [hash, content, computecontenthash, string, research, corpus, cryptographically, char]
    section: Content Hashing for Deduplication
    token_count: 172
  - id: "sources-registry/credibility-tiers.md#c7"
    char_span: [10238, 11639]
    sentence_count: 3
    key_terms: [items, number, totalafterrelevancefilter, included, totalafteruserreview, averagefreshness, averagerelevance, tierdistribution]
    section: ResearchCorpus Aggregation
    token_count: 305
  - id: "sources-registry/credibility-tiers.md#c8"
    char_span: [11675, 12531]
    sentence_count: 4
    key_terms: [tier, sentiment, analysis, emerging, evidence, provides, current, factual]
    section: Tier Distribution in Practice
    token_count: 182
  - id: "sources-registry/credibility-tiers.md#c9"
    char_span: [12572, 13814]
    sentence_count: 2
    key_terms: [tier, credibility, researchfabricorchestrator, analysis, badges, corpus, export, scores]
    section: Integration with Research Workflow
    token_count: 280
  - id: "sources-registry/credibility-tiers.md#c10"
    char_span: [13837, 14263]
    sentence_count: 1
    key_terms: [research, tier, connector-catalog, deep, sources-registry, research-fabric, research-modes, specifications]
    section: Cross-References
    token_count: 99
---
# Source Credibility Tier System

The HiC Research platform assigns every data source a credibility tier that governs how its evidence is weighted, displayed, and cited throughout the research pipeline. The tier system is defined in `types.ts` and applied at collection time by the data source connectors. This page documents the tier definitions, the provenance tracking schema, the freshness scoring formula, and the corpus aggregation structure.

---

## The Three Tiers

Every source in the platform is classified into one of three credibility tiers. The tier determines the color-coded badge shown in the UI, the weight given during AI synthesis, and the citation prominence in exported deliverables.

### Tier 1: Peer-Reviewed / Government

**Color**: `#115054` (teal)

The highest credibility level. Reserved for sources that undergo formal peer review, are published by government agencies, or represent authoritative institutional data. Evidence from Tier 1 sources receives the strongest weight in theme extraction, persona construction, and strategic recommendations.

**Categories assigned to Tier 1:**
- Academic Literature (OpenAlex, Semantic Scholar, Crossref, DOAJ, Europe PMC, CORE, DataCite, Zenodo)
- Education Data (College Scorecard, ERIC)
- Economic Data (World Bank, FRED)
- Government Data (USAspending, Federal Register, Congress.gov, SEC EDGAR)
- Open Data Portals (Data.gov, Data.gov.uk, NYC Open Data, Data.gov.au, Open Canada, EU Open Data, LA Open Data, SF Open Data, Texas Open Data)
- AI Research (arXiv CS.AI, CS.LG, CS.CL, CS.CV, CS.RO, stat.ML, CS.IR, CS.HC, OpenReview, DBLP)
- AI Conferences (NeurIPS Proceedings, ACL Anthology, and all web-only conference sources: ICML, ICLR, AAAI, IJCAI, CVPR, ACL, EMNLP, KDD, PMLR)

**Characteristics:**
- Formal peer review or institutional editorial process
- Persistent identifiers (DOIs, ORCID links, official URLs)
- Citation counts available for academic sources
- Reproducible methodology documented
- Often includes structured metadata (publication date, authors, institutions)

### Tier 2: Established News / Think Tank

**Color**: `#fd8e2e` (orange)

Mid-level credibility. Applies to sources with professional editorial standards, recognized domain expertise, or institutional backing, but which do not undergo formal peer review. These sources are valuable for current developments, expert commentary, and policy analysis.

**Categories assigned to Tier 2:**
- Higher-Ed News (Higher Ed Dive, Inside Higher Ed, EdSurge, Hechinger Report, Campus Technology, The Conversation, Open Campus)
- AI News (all 21 API sources + 4 web-only sources, including MIT Tech Review, IEEE Spectrum, VentureBeat, TechCrunch, Ars Technica, WIRED, The Verge, The Guardian, and others)
- AI Lab Blogs (all 20 API sources + 7 web-only sources, including OpenAI, Google AI, DeepMind, Meta AI, Microsoft Research, NVIDIA, Anthropic, and others)
- AI Policy (Brookings AI, Stanford HAI, OECD AI, EFF, Ada Lovelace Institute, AI Now, Georgetown CSET, Partnership on AI, NIST AI, UNESCO AI)
- AI Models & Datasets (Hugging Face Models/Datasets, OpenML, Kaggle, Papers With Code, plus 8 web-only benchmark/leaderboard sources)
- Video (YouTube Search, YouTube AI Content, Two Minute Papers, Yannic Kilcher, Lex Fridman, AI Explained, Sentdex)
- Web Intelligence (Jina Reader)
- GDELT (categorized as News & Media)

**Characteristics:**
- Professional editorial oversight or recognized subject matter expertise
- Named authors with verifiable credentials
- Regular publication cadence
- May include primary research or original reporting
- Less formal than peer review but more reliable than user-generated content

### Tier 3: Community / Social

**Color**: `#acacac` (gray)

The lowest credibility tier. Applied to user-generated content, community forums, social media, and crowd-sourced platforms. These sources are valuable for capturing real user sentiment, emerging trends, and community discourse, but claims derived from them require corroboration from higher-tier sources.

**Categories assigned to Tier 3:**
- Tech & Social (Hacker News)
- AI Communities (Stack Overflow AI, Reddit r/MachineLearning, Reddit r/artificial, Reddit r/LocalLLaMA, HF Forums, PyTorch Forums, TF Forum)
- AI Code (GitHub Repos, GitHub Code Search, GitHub Trending AI, LangChain Docs, LlamaIndex Docs)
- CX Mesh Sources (Reddit subreddits, TrustPilot reviews, Play Store reviews)

**Characteristics:**
- User-generated content with no editorial review
- Anonymous or pseudonymous contributors
- High volume but variable quality
- Valuable for sentiment analysis and trend detection
- Claims should be triangulated with Tier 1 or Tier 2 evidence

---

## Type Definitions

The credibility system is implemented through several TypeScript interfaces defined in `types.ts`.

### CredibilityTier Type

```typescript
export type CredibilityTier = 1 | 2 | 3;

export const CREDIBILITY_LABELS: Record<CredibilityTier, string> = {
    1: 'Tier 1: Peer-Reviewed / Government',
    2: 'Tier 2: Established News / Think Tank',
    3: 'Tier 3: Community / Social',
};

export const CREDIBILITY_COLORS: Record<CredibilityTier, string> = {
    1: '#115054',   // teal
    2: '#fd8e2e',   // orange
    3: '#acacac',   // gray
};
```

### SourceProvenance Interface

Every item collected by the research fabric is wrapped in a `SourceProvenance` record that tracks its full provenance chain. This is the atomic unit of evidence in the platform.

```typescript
export interface SourceProvenance {
    id: string;                     // unique chunk ID, e.g. "CHUNK_001"
    sourceId: string;               // connector ID, e.g. "openalex"
    sourceName: string;             // display name, e.g. "OpenAlex"
    sourceUrl?: string;             // URL to the original item
    credibilityTier: CredibilityTier;
    collectionTimestamp: string;    // ISO 8601 when collected
    publicationDate?: string;       // ISO 8601 when originally published
    freshnessScore: number;         // 0-100 computed from publicationDate
    relevanceScore: number;         // 0-100 from AI relevance scoring
    relevanceReason?: string;       // AI-generated explanation of relevance
    citationCount?: number;         // for academic sources
    peerReviewed?: boolean;         // explicit peer review flag
    contentHash: string;            // for deduplication and audit trail
    title: string;
    content: string;                // the actual text content
    included: boolean;              // user toggle at DATA_REVIEW checkpoint
}
```

**Field notes:**
- `id` is assigned sequentially during corpus assembly (`CHUNK_001`, `CHUNK_002`, etc.) and used as the citation anchor in downstream AI output.
- `sourceId` maps directly to the connector ID in `dataSourceConnectors.ts` (e.g., `openalex`, `fred`, `reddit_ml`).
- `included` defaults to `true` and can be toggled by the user at the DATA_REVIEW human-in-the-loop checkpoint, allowing manual exclusion of irrelevant or low-quality items.
- `contentHash` is computed via `computeContentHash()` -- a browser-safe hash function (not crypto-grade) used for deduplication within a single research session.

### CitationSpan Interface

When AI-generated output references a source, the citation is tracked as a `CitationSpan` that links back to the source provenance record.

```typescript
export interface CitationSpan {
    chunkId: string;                // links to SourceProvenance.id
    sourceTitle: string;
    sourceUrl?: string;
    sourceTier: CredibilityTier;
    citedText: string;              // the quoted passage from the source
    generatedTextStart: number;     // char offset in generated output (start)
    generatedTextEnd: number;       // char offset in generated output (end)
}
```

This structure enables precise provenance tracking: for any span of AI-generated text, the system can identify which source chunk it draws from, at what tier of credibility, and the exact quoted passage. The char offsets (`generatedTextStart` / `generatedTextEnd`) allow UI highlighting of cited passages in the final deliverable.

---

## Freshness Scoring Formula

Publication recency is quantified as a 0-100 freshness score computed from the item's publication date. The score is calculated by `computeFreshnessScore()` in `types.ts`:

| Age of Publication | Freshness Score |
|-------------------|-----------------|
| 30 days or less | 100 |
| 31-180 days (up to 6 months) | 85 |
| 181-365 days (up to 1 year) | 70 |
| 366-730 days (up to 2 years) | 50 |
| 731-1825 days (up to 5 years) | 25 |
| More than 1825 days (over 5 years) | 5 |
| No date available | 0 |

```typescript
export function computeFreshnessScore(dateStr?: string): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) return 100;
    if (ageDays <= 180) return 85;
    if (ageDays <= 365) return 70;
    if (ageDays <= 730) return 50;
    if (ageDays <= 1825) return 25;
    return 5;
}
```

The freshness score is used in the corpus display (shown alongside each chunk in the merged corpus output) and is available for downstream AI models to prioritize recent evidence over older material. Items with no parseable date receive a score of 0, which means they are still included in the corpus but flagged as undated.

---

## Content Hashing for Deduplication

Each item's content is hashed using `computeContentHash()` to detect and prevent duplicate entries in the research corpus:

```typescript
export function computeContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'hash_' + Math.abs(hash).toString(36);
}
```

This is a simple browser-safe hash (not cryptographically secure) that produces a string like `hash_1a2b3c`. It is sufficient for detecting exact duplicates within a single research session. The hash is stored on the `SourceProvenance.contentHash` field and checked during corpus assembly.

---

## ResearchCorpus Aggregation

The `ResearchCorpus` interface represents the fully assembled, scored, and reviewed collection of evidence for a research session. It tracks both the raw collection metrics and the post-filter state.

```typescript
export interface ResearchCorpus {
    items: SourceProvenance[];
    totalCollected: number;
    totalAfterRelevanceFilter: number;
    totalAfterUserReview: number;
    averageFreshness: number;
    averageRelevance: number;
    tierDistribution: Record<CredibilityTier, number>;
    dateRange: { earliest: string; latest: string };
}
```

**Field descriptions:**
- `totalCollected`: Raw number of items returned by all connectors before any filtering.
- `totalAfterRelevanceFilter`: Items remaining after AI relevance scoring (items scoring below 30 are dropped).
- `totalAfterUserReview`: Items remaining after the human DATA_REVIEW checkpoint (user can toggle `included` off for any item).
- `averageFreshness`: Mean freshness score across all included items.
- `averageRelevance`: Mean relevance score across all included items.
- `tierDistribution`: Count of included items per credibility tier, e.g., `{ 1: 12, 2: 35, 3: 8 }`.
- `dateRange`: Earliest and latest publication dates across the corpus.

This metadata is displayed to the user at the DATA_REVIEW checkpoint and is available for quality assessment of the research corpus before it enters the AI analysis pipeline.

---

## Tier Distribution in Practice

A typical research session with a balanced source selection might produce a tier distribution like:

| Tier | Typical Share | Role in Analysis |
|------|--------------|------------------|
| Tier 1 | 20-30% | Anchors factual claims, provides statistical evidence, grounds academic citations |
| Tier 2 | 50-60% | Provides current context, expert commentary, policy positions, product announcements |
| Tier 3 | 15-25% | Captures user sentiment, community concerns, emerging signals, real-world friction |

The AI analysis pipeline references tier labels in the structured corpus (each chunk header includes its tier), enabling the AI to:
1. Prioritize Tier 1 evidence for factual claims.
2. Use Tier 2 for contextual framing and current events.
3. Draw on Tier 3 for user voice, sentiment, and emerging signals, while noting the lower confidence level.

---

## Integration with Research Workflow

The credibility tier system touches every stage of the research pipeline:

1. **Collection** (`dataSourceConnectors.ts`): Each connector's factory assigns the credibility tier from the proxy response or defaults to Tier 3.

2. **Corpus Assembly** (`researchFabricOrchestrator.ts`): The `mergeResultsToCorpus()` function tags each chunk with its tier label: `Tier 1: Peer-Reviewed/Government`, `Tier 2: Established News`, or `Tier 3: Community`.

3. **DATA_REVIEW Checkpoint** (human-in-the-loop): The user sees tier badges, freshness scores, and relevance scores for every collected item and can toggle individual items on or off before analysis proceeds.

4. **AI Analysis Stages**: The structured corpus includes tier annotations in each chunk header, giving the AI model visibility into source quality when generating themes, personas, and recommendations.

5. **Citation Tracking**: The `CitationSpan` interface preserves the `sourceTier` field, so exported deliverables (slides, PRDs, roadmaps) can display tier-coded citations.

6. **Export / Presentation**: Tier colors (`#115054`, `#fd8e2e`, `#acacac`) are used in the UI for source badges and are available for export templates. See [[brand/identity]] for the full color system.

---

## Cross-References

- [[sources-registry/connector-catalog]] -- Master catalog of all data source connectors with tier assignments
- [[brand/identity]] -- Color definitions for tier badges (`#115054`, `#fd8e2e`, `#acacac`)
- [[methodologies/research-fabric]] -- Research fabric orchestration workflow that uses tier metadata
- [[deep-research/research-modes]] -- Deep research mode specifications (sources from deep research are also tier-tagged)
