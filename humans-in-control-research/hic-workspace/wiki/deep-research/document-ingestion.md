---
title: "User Document Ingestion & RAG Architecture"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [App.tsx, geminiService.ts, components/FileUpload.tsx, types.ts]
confidence: high
status: active
tags: [rag, document-upload, file-ingestion, corpus, base64, user-documents]
evidence_count: 0
---

# User Document Ingestion & RAG Architecture

This page documents how user-uploaded documents flow through the HiC Research platform, from drag-and-drop upload through corpus construction to AI analysis. User documents are a primary evidence source -- they represent client-specific data that no external connector can provide.

---

## Upload Interface

**Component**: `components/FileUpload.tsx`

Users upload research documents via drag-and-drop or file picker. Accepted formats:

| Format | MIME Type | Processing Method |
|--------|-----------|-------------------|
| PDF | application/pdf | Sent as inline binary data to multimodal AI |
| TXT | text/plain | Base64-decoded to plain text |
| JSON | application/json | Base64-decoded to plain text |
| CSV | application/csv | Base64-decoded to plain text |
| MD | text/markdown | Base64-decoded to plain text |
| DOC/DOCX | application/* | Sent as inline binary (limited support) |

**Storage**: Files are read via `FileReader.readAsDataURL()`, Base64-encoded, and stored in React state as `FileUpload[]`:

```typescript
interface FileUpload {
    name: string;    // Original filename
    type: string;    // MIME type
    size: number;    // Bytes
    data: string;    // Base64-encoded content
}
```

Files persist in browser memory for the duration of the session. They are included in `SavedProject` snapshots for localStorage persistence.

---

## Corpus Construction

**Location**: `App.tsx`, `startAnalysis()` function (~line 960)

User-uploaded files are merged with intelligence source data into a unified corpus:

### Step 1: User Files as Baseline
```
collectedDataFiles = [...files]  // Start with user uploads
```

### Step 2: Intelligence Source Collection (if enabled)
The research fabric orchestrator collects data from enabled connectors (up to 150+ sources). Results are:
1. Relevance-filtered (AI scoring 0-100, drop below 30)
2. Content-enriched (full text via Jina Reader for top items)
3. Merged into a single text corpus with CHUNK_XXX IDs and source attribution
4. Base64-encoded and added as a synthetic file:
```
collectedDataFiles.push({
    name: `intelligence_sources_${timestamp}.txt`,
    type: 'text/plain',
    size: corpus.length,
    data: btoa(unescape(encodeURIComponent(fullCorpus)))
})
```

### Step 3: Deep Research (if enabled)
Deep research results (Gemini Interactions API, Claude Web Search, or OpenAI Web Search) are similarly base64-encoded and added as synthetic files to the corpus.

### Step 4: CX Mesh Social Data (if enabled)
Reddit posts, TrustPilot reviews, and PlayStore reviews collected via Reddit Ripper are processed through the sentiment pipeline and added to the corpus.

### Final Corpus
All files -- user uploads, intelligence sources, deep research, and social data -- are unified into `collectedDataFiles[]` and passed to the AI ingestion stage.

---

## AI Ingestion

**Function**: `GenAISession.ingestContext(files, onStream)` in `services/geminiService.ts`

The ingestion function processes each file based on type:

1. **Text-based files** (TXT, JSON, CSV, MD): Decoded from Base64 via `atob()` and sent as text parts
2. **Binary files** (PDF, images, audio, video): Sent as `inlineData` with MIME type for multimodal processing
3. **Unsupported types**: Logged as `[Unsupported file type: filename]`

Each file is wrapped with a header: `--- FILE N: "filename.ext" ---`

The AI model receives the full corpus as a multi-part message and produces:
- Summary of all ingested content
- Data type identification
- Confidence score
- Key themes identified
- Source attribution mapping

---

## How User Documents Feed the Wiki

User-uploaded documents are the wiki's Layer 1 ("Raw Sources"). The INGEST operation should process them as follows:

### During Research Session
1. Files uploaded by the user enter `collectedDataFiles[]`
2. AI ingestion extracts themes, evidence, and data points
3. These flow through the 7-stage pipeline producing deliverables
4. Evidence from user documents receives Tier 1 credibility (client-provided primary data)

### Post-Session Wiki Integration (via INGEST operation)
1. Each uploaded document should generate a `wiki/sources/[document-name].md` summary page
2. Extracted data points fan out to `wiki/evidence/` pages with full citation chains
3. Domain-specific findings update relevant `wiki/frameworks/` pages
4. Client-specific context populates `wiki/engagements/[client].md`
5. Industry-specific data updates `wiki/industries/[industry].md`

### Persistence Model
- **Browser session**: Files live in React state + localStorage (SavedProject)
- **Wiki layer**: Source summaries and extracted evidence persist in markdown
- **pgvector**: Social data from CX Mesh can be indexed for semantic search across sessions
- **Gap**: User-uploaded PDFs and DOCX files are NOT currently persisted in the wiki's `sources/` directory automatically. This is a manual step or requires implementing an auto-ingest hook.

---

## Evidence Quality from User Documents

User-uploaded documents typically represent the highest-quality evidence in any research project:

| Source Type | Typical Credibility | Freshness | Examples |
|-------------|-------------------|-----------|----------|
| Client internal data | Tier 1 (primary) | Current | Strategy docs, research reports, survey results |
| Client transcripts | Tier 1 (primary) | Current | Interview transcripts, meeting notes, focus group data |
| Client financials | Tier 1 (primary) | Current | Budget spreadsheets, SOWs, proposals |
| Third-party reports | Tier 1-2 | Varies | Gartner reports, Forrester studies, industry benchmarks |
| Competitor intel | Tier 2 | Varies | Battle cards, win/loss reports, market analyses |

**Wiki integration rule**: Evidence extracted from user-uploaded documents should always be marked with higher confidence than evidence from external connectors, because it represents verified client-specific data.

---

## Cross-References

- [[sources-registry/connector-catalog]] -- External data sources that complement user uploads
- [[sources-registry/credibility-tiers]] -- How user documents map to the 3-tier credibility system
- [[deep-research/research-modes]] -- How deep research results merge with user documents
- [[social-intelligence/cx-mesh]] -- How social data merges with user documents
- [[methodologies/research-fabric]] -- The full corpus construction pipeline
