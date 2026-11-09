---
name: manifest-chunk-retrieval
description: How every HiC generator pulls evidence from the wiki via manifest chunk pointers instead of bulk body injection. Replaces RAG.
invocation: model
version: "1"
status: active
thinking: high
applies_to:
  - "#themes"
  - "#personas"
  - "#recommendations"
  - "#journey"
  - "#blueprint"
  - "#prd"
  - "#roadmap"
  - "#gap"
  - "#competitive"
  - "#tech-audit"
  - "#tech-arch"
  - "#strategy"
  - "#report"
  - "#brief"
  - "#case-study"
  - "#explainer"
  - "#meta-themes"
  - "#mindmap"
  - "#org"
  - "#proto"
  - "#presentation"
  - freeform chat (Analyst Desk + Designer Desk)
---

# Manifest-Chunk Retrieval Protocol

## The architecture you live inside

HiC's wiki is the addressable second-brain memory. Every ingested artifact (article, Reddit post, YouTube transcript, uploaded PDF) is chunked at ingest into 500–1500-char paragraph-bounded spans. Each chunk gets a STABLE pointer of the form `<wikiPath>#c<index>` recorded in the page's frontmatter `chunks:` block.

The MANIFEST (the wiki's journal at `wiki/.manifest.json` plus the active user selection (`GET /api/user-selection/active`) + each engagement's `manifest.json`) is the index over those chunks. It is the binding contract about what's in the corpus.

When you generate ANY deliverable, you do NOT dump full article bodies into your prompt. You do NOT call an embedding store. You do NOT guess at relevance. You pull a chunk catalog from the manifest, pre-rank chunks by their declared `key_terms` against the user's request, resolve only the relevant chunks to text via the wiki, and cite each evidence statement with its chunk pointer.

## The protocol (mandatory, every generation)

```
1. Determine the engagement slug (the global __hicCurrentEngagementSlug
   on the SPA side, or the slug passed in the proxy request).

2. Call listEngagementChunkIds(slug) → string[] of every chunk pointer
   the manifest knows about for this engagement. Each pointer is
   "<wikiPath>#c<index>".

3. Pre-rank with pickChunksForPrompt(userPrompt, slug, tokenBudget).
   This is a deterministic CPU-only scorer (no LLM call): it reads each
   chunk's manifest-declared key_terms and ranks by keyword overlap with
   the user prompt + research goal. Returns the chunk-id set that fits
   inside tokenBudget (default 30,000 tokens of corpus per generation).

4. Resolve to bodies with resolveChunks(chunkIds[]). Each ResolvedChunk
   carries {id, text, sourcePath, keyTerms, section, charSpan,
   sentenceCount}. The .text is the exact span between the declared
   char_span — verbatim from the wiki source, never paraphrased.

5. Assemble the prompt CORPUS section using assembleChunkCorpus(chunks).
   The block looks like:

       === CORPUS (chunk-addressed, cite by pointer) ===
       [articles/openalex/2024-smith-coop.md#c3]
       <verbatim text of that span>

       [social-intelligence/reddit-deep/r-neu/abc123.md#c0]
       <verbatim text of that span>
       ...
       === END CORPUS ===

6. Generate. Every evidence statement in your output MUST end with the
   pointer of the chunk that supports it. Never say "research shows X"
   or "the corpus indicates Y" without a [<wikiPath>#cN] citation.
   Never invent a chunk id. Never cite a chunk id that wasn't in the
   resolved set above — the Stop hook validate_chunk_citations.py
   rejects you if you do either.

7. Synthesis statements (interpretation, recommendation, framing) that
   are NOT direct evidence quotes may omit a [chunk_id] citation, but
   any quote, statistic, named entity, claim about prior research, or
   reference to a corpus finding MUST carry its [chunk_id].
```

## Why this replaces RAG and bulk body injection

| Pattern | Status | Why |
|---|---|---|
| Bulk inject full article bodies into prompts | **BANNED** | The 4 audit-flagged sites (geminiService strategic-report, deliverableChunkers, CorpusChatPanel PRIOR FINDINGS, buildDeckDigest) were stringifying in-memory state into prompts. That breaks single-source-of-truth, can't be edited downstream, and bloats prompts with off-topic material. |
| Embedding-based RAG (top-K nearest) | **NOT THE CONTRACT** | Embeddings exist in HiC for the legacy `/api/wiki/embed-search` endpoint but they are NOT the manifest contract. Embeddings rank by semantic similarity opaquely; the manifest contract ranks by declared key_terms transparently. |
| Manifest chunk pointers (this skill) | **MANDATORY** | The wiki is the source of truth; the manifest declares what's in the corpus; the resolver dereferences pointers; the generator cites by pointer; the hook validates. Auditable, deterministic, scoped. |

## What appears in your prompt

When you receive a generation prompt, look for the `=== CORPUS (chunk-addressed, cite by pointer) ===` block. That is your evidence base. The chunks were selected by the manifest-chunk pre-ranker against the current request. Nothing else in the conversation is corpus — anything that LOOKS like evidence but doesn't come from a `[<wikiPath>#cN]` chunk is suspect.

If the corpus block is missing, you're being run outside the contract (a legacy path that hasn't been retrofitted yet). In that case: do your best with what you have, but flag in the trace that the manifest contract wasn't honored at this site.

## What appears in your output

Each evidence sentence ends with `[<wikiPath>#cN]`. Pattern:

```
Co-op advising scarcity is the constraint that limits placement velocity, with one r/neu commenter writing that "I waited 7 weeks for a 15-minute meeting" [social-intelligence/reddit-deep/r-neu/abc123.md#c0]. The same theme appears in the Northeastern CoopUsecases PDF, which records the 1:147 advisor-to-student ratio as the root cause [articles/client-uploads/NXT_Northeastern_CoopUsecases.md#c4].
```

Notice:
- Verbatim quote in double quotes.
- Pointer immediately after the quote.
- Source named in prose (the model speaks plainly about WHERE the evidence is — "an r/neu commenter", "the Northeastern CoopUsecases PDF") in addition to the pointer.
- No "research shows...", "studies indicate...", "the data reveals..." — those phrases are slop tells and bypass the citation contract.

## How the validator catches you

`validate_chunk_citations.py` is registered in the dispatcher as a UNIVERSAL_VALIDATOR, so it runs on EVERY deliverable. On each Stop event it:

1. Extracts every `[<path>#c<N>]` token from the output.
2. Cross-references each against the engagement's manifest chunk catalog (the same `/api/manifest/chunks` endpoint you used at step 2 of the protocol).
3. **Rejects (exit 2)** if any citation references a chunk id NOT in the manifest — that's a fabricated reference.
4. **Rejects (exit 2)** if the output contains evidence sentences (sentences mentioning numbers, named entities, "according to", "found", "reported", quoted text in double quotes) but the sentence has no `[<path>#c<N>]` citation.
5. Logs every rejection to `wiki/synthesis/hook-rejection-log.md` so the epoch-proposer can mine the pattern across runs.

## How to pre-rank chunks (the cheap step you do first)

`pickChunksForPrompt` does this for you, but understand the algorithm so your prompt-side reasoning aligns:

1. Lower-case and tokenize the user prompt + the engagement research goal into a keyword set.
2. For each chunk in the manifest catalog: score = sum of (chunk.key_terms[i] ∈ keywords) weighted by chunk.sentence_count.
3. Drop chunks with score == 0 (no keyword overlap with the request).
4. Greedily pack remaining chunks (highest score first) until tokenBudget is reached.
5. Always include any chunk that's explicitly named in the user prompt by its pointer.

If pickChunksForPrompt returns fewer chunks than you expected, the manifest is sparse — the engagement's corpus hasn't been retrofitted with chunks yet, or the engagement is empty. Surface that condition in the trace rather than fabricating evidence to fill the gap.

## What to do when chunks are missing

- **Manifest empty for this engagement** (`listEngagementChunkIds` returned `[]`): the engagement has no ingested corpus yet, or the retrofit hasn't run on this wiki. Generate from the user's brief alone, and tell the user in the response: "this engagement has no chunk-indexed corpus yet — recommendations are framing only, not evidence-grounded."
- **Some chunk pointers in your citations don't resolve** (`resolveChunks` returned `notFound`): the source wiki page may have been deleted or never had chunks: frontmatter. Cite an alternative chunk that IS resolvable, or drop the claim entirely. Never re-cite a non-resolvable pointer.
- **All chunks ranked 0**: your prompt has no keyword overlap with any manifest chunk. Either the prompt is mis-scoped (asking about something not in the corpus) or the manifest needs broader coverage. Report this honestly.

## How this composes with other HiC skills

- **theme-analyst**, **persona-architect**, **recommendation-architect**, **strategy-author**, **service-blueprint-mapper**, **gap-analysis-evaluator**, **prd-compiler**, **roadmap-builder**, **competitive-analyst**, **tech-audit-inspector**, **tech-arch-generator**, **case-study-analyst**, **brief-dialog**, **explainer**, **report**, **meta-themes**, **mind-map-architect**, **org-chart**, **strategic-report-writer**, **deck-narrative-composer** — every one of these now operates ON the chunk-addressed corpus this skill assembles. They do NOT reach into in-memory state, embedding stores, or whole article bodies. The MCR contract is the input.
- **research-planner** — when planning a deep-research loop, the plan should declare which chunk pointers it will consult per phase, not which "sources" or "topics" in the abstract.
- **brief-dialog**, **deck-narrative-composer** — when synthesizing across deliverables, do so over chunks the manifest declares are in the engagement's corpus. Inter-deliverable references go via pointer.
