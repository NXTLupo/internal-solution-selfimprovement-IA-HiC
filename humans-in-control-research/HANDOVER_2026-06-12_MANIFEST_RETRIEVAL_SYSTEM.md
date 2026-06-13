# HiC Anti-RAG: The Wiki + Manifest Retrieval System — Developer Deep-Dive

Companion to `HANDOVER_2026-06-12_NEW_DEVELOPER.md` (read that first for the
platform overview). This document covers ONE subsystem exhaustively: how HiC
grounds every AI generation in evidence WITHOUT classic RAG, how the wiki and
manifest store that evidence, how retrieval works at generation time, how
citations are enforced and resolved, and how the loop feeds itself. Current
as of 2026-06-12; every file path and endpoint verified against the code.

---

## 1. Why "anti-RAG" — the design philosophy

Classic RAG (embed the corpus, cosine-rank at query time, paste top-K bodies
into the prompt) was tried here and is the **documented root cause of hollow
deliverables**. Four anti-patterns were flagged on 2026-06-06 and designed
out (the header comment of `services/chunkRetrieval.ts` lists them):

1. **Bulk-injecting full article bodies into prompts** — bloats the context
   with off-topic material, breaks single-source-of-truth, and the model
   paraphrases instead of quoting.
2. **Top-N similarity sampling that silently drops the rest** — opaque,
   non-reproducible; nobody can say why a source was or wasn't consulted.
3. **Generators reading in-memory SPA state instead of the wiki** — evidence
   that exists only in a React state object can't be audited, edited, or
   reused by the next run.
4. **Generated insights living only in transient JSON** — each run started
   from zero instead of building on prior runs.

The replacement contract is **manifest-chunk retrieval (MCR)**:

> The wiki is the addressable second-brain memory. The MANIFEST declares
> which chunks exist. Retrieval is a deterministic, CPU-only, transparent
> ranking over manifest metadata — no embedding store in the hot path, no
> LLM call to decide relevance. The generator receives verbatim spans, each
> with a stable pointer, and must cite by pointer. A Stop hook rejects
> output that cites pointers that don't exist or asserts evidence without a
> pointer. Generated insights are written BACK as chunks, so the corpus
> compounds across runs.

Key properties vs RAG: **auditable** (every citation dereferences to an
exact char span in a versioned markdown file), **deterministic** (same
corpus + same prompt = same chunk pack; no embedding drift), **scoped** (the
manifest, the user's Knowledge Library selection, and the engagement slug
bound what is in-corpus), **editable** (fix a wiki page and every future
generation sees the fix).

Note: embeddings still exist (`wiki/.vectors.db`, `/api/wiki/embed-search`,
`/api/wiki/fetch-articles`) but they are LEGACY/auxiliary — used for broad
semantic article lookup in chat tools, never as the deliverable grounding
contract. Don't add new generation paths on them.

The canonical agent-facing protocol lives at
`.claude/skills/manifest-chunk-retrieval/SKILL.md`. This doc is the
code-facing twin.

---

## 2. The storage layer — chunks in wiki frontmatter

### 2.1 The chunk contract

Every retrievable wiki page (`hic-workspace/wiki/**/*.md`) carries YAML
frontmatter with a `chunks:` block. One real example:

```yaml
---
id: brand/figma-node-map.md
title: Figma Node Map (design-system files)
type: brand
updated: 2026-06-11
chunks:
  - id: "brand/figma-node-map.md#c10"
    char_span: [11443, 12874]    # exact span into the POST-frontmatter body
    sentence_count: 6
    key_terms: [recommendation, evidence, gold, impact, dense, band]
    section: DENSE-LAYOUT PROGRAM W1 (2026-06-11)
    token_count: 405
---
# Figma Node Map
... body ...
```

Rules of the contract:
- The pointer `"<wikiPath>#c<index>"` is STABLE — downstream citations,
  insight provenance, and the embeddings sidecar all key on it.
- `char_span` indexes into the body AFTER the closing `---` of the
  frontmatter. Editing the frontmatter never invalidates spans; editing the
  BODY requires a re-chunk.
- Chunks are 500-1500 char, paragraph-bounded spans; `section` is the
  nearest h2/h3 heading; `key_terms` drive the retrieval pre-rank.

### 2.2 The writer: `proxy/wiki_chunker.py`

Two functions own all chunk frontmatter, nothing else may write it:

- `chunk_for_manifest(body: str, source_path: str) -> list[dict]` — wraps
  the paragraph chunker and remaps to the contract shape above.
- `upsert_chunks_into_frontmatter(page_text, chunks, page_id=...) -> str` —
  inserts or REPLACES the `chunks:` block idempotently, synthesizing
  frontmatter if the page has none.

Write paths that invoke them (all in `proxy/app.py`):
- `POST /api/wiki/write` with `chunk: true` (~line 9497) — full-page writes.
- `POST /api/wiki/write-article` (~line 9966) — article ingestion (the
  research fabric, deep-research custody, reddit-deep, transcripts).
- `POST /api/wiki/retrofit-chunks?force=1` (~line 12766) — one-time/backfill
  re-chunk across the whole wiki (`wiki_retrofit.py`). Heavy; use only after
  bumping the chunker version.
- `POST /api/wiki/append` does NOT re-chunk — appends to a page body leave
  the existing chunks valid (spans are start-anchored) but the appended tail
  is unindexed until the next full write or retrofit. Acceptable for logs
  (learned-constraints, ledgers); not acceptable for evidence pages.

⚠ **History you must know**: a one-character regex bug in the upsert
(`chunks:\s*` — the `\s*` consumed the newline plus the first item's indent)
made every re-chunk APPEND a new block instead of replacing, and orphaned
the old one. 8,367 pages accumulated duplicate/orphaned chunk frontmatter;
4 synthesis pages were truncated to frontmatter-only. Fully purged
2026-06-11 (regex fixed to `[ \t]*`, plus a self-healing orphan sweep inside
the upsert). **Tripwire**: if you ever see `- id:` chunk lines ABOVE the
`chunks:` key, or two `chunks:` keys in one frontmatter, a writer has
regressed — check the upsert call sites first, then run the parity audit
(section 3.3).

### 2.3 Where chunked content comes from

| Source | Ingest path | Lands at |
|---|---|---|
| External articles (OpenAlex, RSS, news, arXiv...) | research fabric → `/api/wiki/write-article` | `wiki/articles/<source>/<hash>.md` |
| Reddit deep posts | reddit-deep collector | `wiki/social-intelligence/reddit-deep/<sub>/<id>.md` |
| Client uploads | `/api/parse-upload` → seeding | `wiki/articles/client-uploads/`, `wiki/sources/`, `wiki/uploads/` |
| YouTube transcripts | `/api/transcribe-youtube` | `wiki/transcripts/` |
| Generated deliverables + insights | write-back (section 6) | `wiki/engagements/<slug>/`, `wiki/synthesis/` |
| Design-system knowledge | curated pages | `wiki/brand/`, `wiki/design-system/` |

Design-pattern knowledge rides the SAME rails: `brand/figma-node-map.md`
(every Figma GOLD frame id + anatomy) is a chunked page; the chat engine's
`assembleDesignSystem` pulls it via manifest chunks, which is literally how
the model knows which slide layouts exist.

---

## 3. The manifest — the index over the chunks

### 3.1 Files

- `wiki/.manifest.json` — `{version, count, records: {<wikiPath>: record}}`.
  One record per page: `type` (article / social-post / upload / synthesis /
  brand / ...), `title`, `key_terms`, `relevance`, `engagement` tag,
  `chunk_count`, mtime.
- `wiki/.manifest.journal.jsonl` — append-only journal of per-page updates;
  replayed over the base manifest at read time (last write per wikiPath
  wins). Keeps writes cheap; compaction folds it into the base.
- `wiki/user-selections/active.json` — the user's Knowledge Library (KL)
  selection (subreddits, article sources, archive paths). Per-session
  commitment: a fresh app load marks it `_uncommitted: true` (dormant) until
  the user re-applies it — retrieval honors this.
- `wiki/engagements/<slug>/manifest.json` — per-engagement deliverable
  registry (which themes/personas/etc. exist for that goal).

### 3.2 The load-bearing field: `chunk_count`

`chunk_count > 0` is the tier-1 retrievability gate. The proxy emits chunk
pointers as `<wikiPath>#c0 .. #c<chunk_count-1>`; if the count is wrong in
either direction, generation starves silently (over-count → notFound
pointers; under-count → real evidence invisible). Counting rule, baked into
BOTH `_manifest_record` (proxy/app.py ~10346) and the parity hook: count
ONLY pointer-shaped ids (`- id: "...#cN"`) INSIDE the frontmatter — never a
naive `- id:` grep (page bodies quote pointers; lint reports list them) —
and read past 8KB until the frontmatter closes (some pages carry 60+ chunks
= 30-47KB of frontmatter).

### 3.3 Operations

```bash
# Full rebuild from disk (10K+ records, ~1 min):
curl -X POST http://localhost:5012/api/wiki/manifest/rebuild

# Parity audit (manifest chunk_count vs actual frontmatter, run weekly +
# after any bulk wiki operation; 0 mismatches is the healthy state):
python .claude/hooks/scripts/validate_manifest_chunk_parity.py --limit 20000 --report D:/tmp/parity.md

# Catalog endpoints the SPA consumes:
GET  /api/manifest/chunks?engagement=<slug>&types=social-post,article,upload,transcript,synthesis
POST /api/manifest/chunks-from-selection   # body: {social_subreddits, article_sources, source_archive_paths}
GET  /api/wiki/manifest                    # raw manifest read
```

Current healthy baseline: ~10,400 records, ~9,780 with chunk_count > 0,
parity 0 mismatches.

---

## 4. Retrieval at generation time (the MCR hot path)

Implementation: `services/chunkRetrieval.ts` (frontend) +
`services/wikiPointerResolver.ts` (dereferencing). Console tags to watch:
`[chunkRetrieval]`, `[MCR]`, `[yield-ledger]`.

### Step 1 — Build the chunk CATALOG
`listEngagementChunkIds(slug)` (wikiPointerResolver.ts:489) asks
`/api/manifest/chunks?engagement=<slug>&types=...` for every pointer the
manifest declares for this engagement. **Cached-only fallback**: when the
engagement-scoped catalog is empty (fresh goal, no ingested corpus), the
catalog is built from the user's KL selection instead via
`/api/manifest/chunks-from-selection` (chunkRetrieval.ts
`_fetchSelectionCatalogIds`, honoring the `_uncommitted` dormancy flag).
Typical catalog: ~9,300 pointers across ~475 pages.

### Step 2 — Deterministic pre-rank (CPU-only, no LLM)
`pickChunksForPrompt(userPrompt, slug, tokenBudget)` (chunkRetrieval.ts:271):
tokenize the user prompt + research goal into a keyword set; score each
catalog entry by overlap with its manifest-declared `key_terms` (weighted by
sentence_count and source relevance); drop zero-score chunks; shortlist a
wide pool (~960 on large catalogs) for resolution. Chunks explicitly named
by pointer in the prompt are always included.

### Step 3 — MMR diversity packing
Pure greedy-by-score collapsed onto near-identical chunks when a corpus had
60 copies of the same finding, so packing is **Maximal Marginal Relevance**
(lambda = 0.7: 70% relevance, 30% novelty against already-selected chunks),
greedy until the token budget is full. Default budget:
`DEFAULT_CORPUS_TOKEN_BUDGET = 30_000` tokens (~4 chars/token heuristic;
callers override per deliverable). Sharded generators (themes breadth
passes) exclude prior-shard chunks so consecutive shards see fresh evidence
("shard window: excluded N prior-shard chunks").

### Step 4 — Resolve pointers to verbatim text
`resolveChunks(chunkIds[])` (wikiPointerResolver.ts:414) fetches each page,
parses its `chunks:` frontmatter, and slices the body by `char_span`. Each
`ResolvedChunk` = `{id, text, sourcePath, keyTerms, section, charSpan,
sentenceCount}`. The text is the EXACT span — never paraphrased,
never summarized. Unresolvable pointers come back in `notFound` (deleted
page, stale manifest) and are dropped, never guessed.

### Step 5 — Assemble the prompt corpus block
`assembleChunkCorpus(chunks)` (chunkRetrieval.ts:508) emits:

```
=== CORPUS (chunk-addressed, cite by pointer) ===
[articles/openalex/2024-smith-coop.md#c3]
<verbatim span text>

[social-intelligence/reddit-deep/r-neu/abc123.md#c0]
<verbatim span text>
=== END CORPUS ===
```

plus `chunkCitationInstructions()` (the cite-by-pointer rules injected into
the system prompt). This block is the generator's ONLY evidence base.
Anything in the conversation that looks like evidence but lacks a pointer
is, by contract, not corpus.

### Who runs this path
- Analyst Desk chat (`corpusChatService.sendChatMessage`) for every
  artifact-hashtag generation and freeform answer.
- `generateThemes` in geminiService.ts — the reference implementation for
  staged deliverables.
- Designer Desk generators, deck composition, meta-themes, mindmap.
- **Standing migration rule**: any generator still injecting `rawSources`
  or embed-search results is LEGACY to migrate, never a pattern to copy
  (CLAUDE.md "Manifest-chunk retrieval, not RAG injection").

Telemetry: every retrieval logs a `[yield-ledger]` line (consumer,
engagement, retrieved count) so coverage shortfalls are visible across runs.

---

## 5. The citation contract — enforcement and resolution

### 5.1 What the model must emit
Every evidence sentence (quote, statistic, named entity, claim about prior
research) ends with its pointer:

```
Co-op advising scarcity limits placement velocity; one r/neu commenter wrote
"I waited 7 weeks for a 15-minute meeting" [social-intelligence/reddit-deep/r-neu/abc123.md#c0].
```

Synthesis/interpretation sentences may omit pointers. Banned: "research
shows", "the data indicates", inventing pointers, citing pointers outside
the resolved set.

### 5.2 Enforcement (two layers)
- `validateCitations()` (chunkRetrieval.ts:580) — in-process check against
  the resolved set.
- `.claude/hooks/scripts/validate_chunk_citations.py` — UNIVERSAL Stop-hook
  validator: extracts every `[<path>#c<N>]` token, cross-references the
  engagement's manifest catalog, exits 2 on fabricated pointers or on
  evidence-shaped sentences with no pointer. Rejections log to
  `wiki/synthesis/hook-rejection-log.md` (mined by the epoch proposer).

### 5.3 Render-time resolution (the reader never sees raw pointers)
`services/citationPointerRegistry.ts`: `registerPointerSource()` records
pointer → human-readable source name at retrieval time;
`resolveManifestPointers()` deep-sweeps chat prose AND nested slide payloads
at finalize/parse time, rewriting `[articles/x.md#c12]` →
`(Source: Higher Ed Dive)` style attributions. A raw `#cN` pointer visible
to the user is a bug (it was: fixed 2026-06-11, chat finalize +
slide-payload sweep). `services/slidePostProcessor.ts` is the second net.

---

## 6. Write-back — the corpus compounds

Generation is not read-only:
- `persistInsightAsChunk()` (chunkRetrieval.ts:671) writes generated
  insights back to the wiki as chunk-addressed pages, so the NEXT run can
  cite past insights by pointer. Provenance is validated by the
  `validate_insight_provenance.py` Stop hook (a persisted insight must
  reference real manifest chunks it derived from).
- Deliverables persist under `wiki/engagements/<slug>/` and register in the
  engagement manifest (`notifyDeliverablePersisted()`).
- Articles fetched during research are archived to `wiki/articles/` (chunked
  at write time), so external evidence becomes permanent corpus.

This is the "second brain" loop: ingest → chunk → manifest → retrieve →
generate → cite → persist-as-chunks → richer manifest for the next run.

---

## 7. Coupling to self-improvement

- **Learned constraints** (`wiki/synthesis/learned-constraints.md`) are
  injected into every generation AND every Claude Code session; several
  govern this subsystem directly (`[all/deliverables-manifest-wiki-not-rag]`
  is repeated user feedback: deliverables ground via manifest chunks, NEVER
  RAG-inject; themes synthesis depth is the quality benchmark).
- **Hook rejection log** + **yield ledger** + **uncertainty ledger** feed
  the cross-engagement-pattern-miner and the epoch proposer, which propose
  bounded harness edits (e.g., pre-rank pool widening, MMR lambda) — each
  gated before applying.
- **chunk-retrieval-strategist** subagent (`.claude/agents/`) is the deep
  planner for non-trivial selection (dense catalogs >1000 chunks, ambiguous
  prompts, repeated citation-validation failures) — it operates on manifest
  metadata only, no LLM in its core path.
- **SkillOpt** trains the generator skills from session rollouts;
  `logSkillOptTrajectory()` (chunkRetrieval.ts:804) records retrieval
  trajectories as training signal. The promotion gate is never bypassed.

---

## 8. Failure modes + runbook

| Symptom | Likely cause | Fix |
|---|---|---|
| Deliverable cites generic "research shows" / hollow content | a legacy path bulk-injected bodies, or corpus block missing | trace the generator; migrate it to MCR (generateThemes is the template) |
| `validate_chunk_citations` exit 2: fabricated pointer | model invented an id, or manifest is stale | rebuild manifest; check the RI re-ask fired |
| Many `notFound` from resolveChunks | manifest chunk_count > actual (drift) | run parity audit; `POST /api/wiki/manifest/rebuild` |
| Retrieval returns 0 chunks on a fresh goal | engagement catalog empty AND KL selection dormant/empty | user applies a KL selection (per-session act, by design); or ingest corpus |
| Duplicate `chunks:` blocks / orphan `- id:` lines in frontmatter | chunk writer regression (see 2.2 history) | fix the writer FIRST, then bulk-repair + retrofit + manifest rebuild + parity audit |
| Page edited on disk by hand, retrieval returns shifted text | body changed without re-chunk (char_span stale) | re-chunk the page (`chunk_for_manifest` + upsert, or retrofit force=1 scoped) |
| Same prompt retrieves different chunks across runs | someone introduced randomness/embeddings into the pre-rank | revert; determinism is a standing rule for cached runs |

Health checks in one block:
```bash
curl -s http://localhost:5012/health
curl -s -X POST http://localhost:5012/api/wiki/manifest/rebuild | head -c 200
python .claude/hooks/scripts/validate_manifest_chunk_parity.py --limit 20000 --report D:/tmp/parity.md && head -8 D:/tmp/parity.md
```

---

## 9. Extending the system (recipes)

**Make a new wiki page retrievable**: write it via
`POST /api/wiki/write {path, content, chunk: true}` — chunked + manifest
journal entry in one step. Direct file edits require a manual re-chunk and a
manifest rebuild; prefer the proxy path.

**Add a new content type to retrieval**: give its pages a distinct
frontmatter `type`, ensure ingest goes through a chunking write path, then
include the type in the `types=` filter of the catalog calls in
`chunkRetrieval.ts`.

**Migrate a legacy RAG-injecting generator**: replace its corpus assembly
with `pickChunksForPrompt` → `resolveChunks` → `assembleChunkCorpus` +
`chunkCitationInstructions()`; make the output schema carry pointers; the
universal citation hook then covers it for free. Follow `generateThemes`.

**Tune retrieval**: budget per deliverable via the `tokenBudget` arg;
diversity via LAMBDA (0.7) in the MMR pack; pre-rank pool width in
chunkRetrieval.ts Phase A2 comments. Change ONE knob, run the e2e suite,
watch the yield ledger.

Reference reading order for the new developer:
1. `.claude/skills/manifest-chunk-retrieval/SKILL.md` (the contract)
2. `services/chunkRetrieval.ts` top comment + `pickChunksForPrompt`
3. `services/wikiPointerResolver.ts` (`resolveChunks`, `listEngagementChunkIds`)
4. `proxy/wiki_chunker.py` (writer) + `proxy/app.py` manifest endpoints
5. `.claude/hooks/scripts/validate_chunk_citations.py` +
   `validate_manifest_chunk_parity.py` (the gates)
6. `hic-workspace/AGENTS.md` (the wiki schema this all sits on)
