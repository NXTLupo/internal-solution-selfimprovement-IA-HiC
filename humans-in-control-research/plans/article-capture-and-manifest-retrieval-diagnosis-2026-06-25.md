# Diagnosis: articles not captured in full + not retrievable via Analyst Desk (manifest, not RAG) - 2026-06-25

> Trigger: `chat-2026-06-25.txt`. User asked "What does 'Crowdfunding Survival (Thrive-ival) Guide'
> say, and does it support or contradict the corpus?" The Analyst Desk answered: *"the exact text of
> the 'Crowdfunding Survival (Thrive-ival) Guide' is not fully detailed in the retrieved corpus
> chunks"* and then fabricated a citation `(Source: Gemini)`. That is a retrieval miss followed by a
> hallucination. This diagnoses WHY, end to end, with code evidence. DIAGNOSIS ONLY - nothing changed.

## TL;DR (the answer first)

There are **two independent failures stacked on top of each other**, and either one alone produces
the symptom:

1. **CAPTURE - documents are truncated and duplicated.** Every corpus item (including client uploads)
   is hard-capped at **30,000 characters** when persisted to the wiki, and the same document is
   re-archived once per engagement run (the wiki dedup key includes the engagement slug). Result in
   the live wiki: **389 upload pages for only 57 unique documents (~7x duplication); 173 of 389 (44%)
   are truncated at exactly 30,000 chars.** Anything past ~30K chars of a long transcript/PDF has no
   chunk and cannot be retrieved by anything, ever.

2. **RETRIEVAL - there is no "by-name" path; retrieval is embedding/objective-ranked only.** When a
   user names a specific document ("the Crowdfunding Survival Guide"), the chat does NOT fetch that
   document. It embeds the question and takes the top-N chunks by cosine similarity to the research
   objective. The named document's page title is an opaque filename (`transcript_<uuid>.json`), its
   chunk `key_terms` are auto-extracted nouns (donors, giving, pennsylvania), and the human title
   often is not even in the (truncated) body - so the one signal the user gave (the title) matches
   nothing. The doc ranks below the cut and never enters the prompt. The model then answers from
   whatever generic fundraising chunks did rank, and hallucinates the rest.

Both are real. Fix capture and the content exists but still may not rank; fix retrieval and you can
find a document only up to the 30K you actually stored. They must both be fixed.

---

## Failure 1 - CAPTURE: 30K truncation + cross-engagement duplication

### 1a. The 30,000-char cap (the "not captured in full" mechanism)
`services/researchFabricOrchestrator.ts:1585`
```ts
const ENRICHMENT_PER_ITEM_CAP = 30_000; // 30KB per item (was 3KB) - fits comfortably in 1M-token...
```
Applied at THREE persist sites - every path that writes a body to the wiki truncates first:
- `:1805` wiki-cache rehydrate -> `cached.content.substring(0, ENRICHMENT_PER_ITEM_CAP)`
- `:1850` web extraction (jina/pdf) -> `fullContent.substring(0, ENRICHMENT_PER_ITEM_CAP)`
- `:1937` source-native (this is the path uploads reach) -> `(item.content||'').substring(0, ENRICHMENT_PER_ITEM_CAP)`

Evidence in the live wiki (`hic-workspace/wiki/articles/client-uploads/`):
- `0fa08a2643.md` frontmatter: `chars: 30000`, last chunk `char_span: [29159, 30187]` then STOPS.
- 173 of 389 upload pages have `chars: 30000` exactly - a round-number cap, not a coincidence.

A full stakeholder interview or a CASE benchmarking PDF runs well past 30K. The tail is silently
dropped at archive time, so it is never chunked, never in the manifest, never retrievable. This is
literally "articles are not being captured in full."

Note: `services/wikiService.ts::archiveUploadedDocs` (the landing-page upload archiver) itself sends
the FULL text with no slice - but the same uploads also flow through the corpus pipeline
(`uploadsToDataSourceItems` -> `enrichTopItems`) and are re-persisted under the 30K cap, which is
what lands as the canonical chunked page. The cap is the chokepoint regardless of which writer wins.

### 1b. A second, PDF-specific truncation: page caps
- `proxy/app.py:7873` `/api/extract-pdf` default `max_pages = 30` (URL-fetched PDFs).
- `proxy/app.py:8015` `_parse_pdf_bytes(raw, max_pages=80)` (uploaded PDF bytes).

A long PDF loses every page past 30 (remote) / 80 (upload) BEFORE the 30K char cap even applies. Two
truncation vectors compound.

### 1c. Cross-engagement duplication (dilutes ranking, multiplies cost)
`services/wikiService.ts:998`
```ts
const syntheticUrl = `upload://${engagementSlug}/${encodeURIComponent(f.name)}`;
```
The wiki dedup key is the URL hash, and the URL embeds the **engagement slug**. So uploading the same
file under five different research goals creates five different url_hashes -> five separate pages,
each independently truncated to 30K. Live evidence:
- `Jack McCorkle - ... Stakeholder Interview_anonymized.txt` -> **13 copies**
- `Drew Parker`, `Jamie Reyes`, `Taylor Brooks`, `Morgan Ellis`, `Riley Quinn`, `CASE Insights on
  VSE 2025`, `Casey Morrow` -> **12 copies each**
- 389 upload pages : 57 unique documents (~7x).

Effect on retrieval: the top-N candidate pool and the MMR token budget get spent on near-identical
duplicates of the same few docs, crowding out everything else and wasting the budget that should
cover breadth.

### 1d. Human title is lost on export-style uploads
`archiveUploadedDocs` sets `title: normalizedName` = the **filename**. For YouTube/transcript exports
the filename is `transcript_<uuid>.json`, so the page title is opaque. The document's real title
("Growing Donations in 2026..." / a "Crowdfunding Survival Guide") lives only inside the JSON body.
The manifest pre-rank signal (`chunkRetrieval.ts:262-268`) tokenizes the page TITLE when `key_terms`
are empty - and a uuid filename tokenizes to noise. So the most human-meaningful handle on the
document contributes zero retrieval signal.

---

## Failure 2 - RETRIEVAL: no by-name lookup; embedding/objective ranking only

The Analyst Desk grounding path (`services/corpusChatService.ts:3019-3058`):
```ts
const _picked = await pickChunksForPrompt(userMessage, _slug, {
    extraContext: context.researchGoal || '',
    researchObjective: [userMessage, context.researchGoal||''].join('\n').slice(0,800),
    tokenBudget: 30_000,
});
```
`pickChunksForPrompt` -> `_readManifestCatalog` (`chunkRetrieval.ts:156-280`) builds the candidate
pool from:
- **tier-1**: `/api/manifest/chunks?engagement=<slug>` - ONLY this engagement's tagged chunks.
- **tier-2**: committed KL selection (often empty).
- **tier-1.5**: `/api/manifest/chunks-by-goal?goal=<obj>&limit=600` - whole-store cosine ranking,
  engagement boosted x1.15 NOT gated (proxy `app.py:14064`). This is the only cross-engagement path.
- **tier-3 whole-wiki**: fires **only when tier-1 AND tier-2 are both empty** (`chunkRetrieval.ts:248`
  `if (ids.length === 0)`). An active engagement always has tier-1 chunks, so tier-3 never fires in a
  normal chat - the cross-engagement reach is entirely tier-1.5's top-600.

Why the named document loses:
1. **No name/title selector.** Nothing keys off "the user named a specific document." The only
   priority override is `userSelected` (committed KL chunks, `chunkRetrieval.ts:519-549`). A document
   referenced by name in the question gets no such lift. Contrast the standing rule
   `feedback_user_selections_trump_auto_ranking` - we honor explicit KL selections but not an
   explicit in-question document reference, which is the same intent.
2. **The user's signal is the title; the title indexes nothing.** The query embeds "Crowdfunding
   Survival (Thrive-ival) Guide"; the doc's chunks carry auto key_terms + a uuid title; the phrase
   is absent from the truncated body. Cosine similarity is weak, the doc misses the top-600 (a 56.5K
   chunk store per the UI), so it is never a candidate.
3. **Even if it ranked, the tail is gone.** `chunks-by-goal` drops any pointer beyond the page's
   declared `chunk_count` (`app.py:14134` `int(ci) >= cc`). Content truncated by Failure 1 has no
   pointer to return.
4. **Failure mode is hallucination, not honesty.** When manifest grounding returns nothing useful,
   the chat falls back to bulk corpus and the model answers from generic fundraising chunks, then
   fabricates `(Source: Gemini)`. There is no "I could not find that document in the corpus" path,
   which violates the no-fabrication and citation-protocol rules in `.claude/CLAUDE.md`.

---

## Remediation plan (CONVERGE / GATE, not build-new; VS + RI informed)

Ordered by leverage. P0/P1 are the load-bearing fixes; each is gated (typecheck 0, vitest, SPA
rebuild + live re-ask of the exact failing question).

### P0 - stop truncating capture (Failure 1a/1b)
- Raise/remove `ENRICHMENT_PER_ITEM_CAP` for **client uploads** specifically (tier-1 primary
  evidence): uploads are the user's own ground truth and must be captured in full. Keep a generous
  cap for web-fetched articles if cost demands, but uploads should not be silently cut. The chunker
  already handles long bodies; the manifest pointer model means full capture does NOT bloat prompts
  (only selected chunks are injected). The 30K cap predates the manifest engine - it is legacy.
- Raise the PDF page caps (`/api/extract-pdf` 30, `_parse_pdf_bytes` 80) or make them upload-aware
  (a 200-page benchmarking PDF must not lose 120 pages).
- RI check: verify against the live wiki that re-archiving a >30K interview now yields
  `chars == real length` and `char_span` reaches the end of the body.

### P0 - de-duplicate uploads across engagements (Failure 1c)
- Make the upload dedup key **content-hash based**, not engagement-slug-URL based: an identical file
  should be ONE page, tagged with multiple engagements (append to an `engagements:` list), not N
  pages. This reclaims the candidate-pool budget breadth is starved of and cuts storage ~7x.
- Backfill: collapse the existing 389->57 (a one-time migration; propose, do not auto-run).

### P1 - add a by-name retrieval path (Failure 2.1/2.2)
- When the user's message names a document (quoted title, filename, or a high-confidence title match
  against the manifest's page titles), fetch THAT page's chunks directly and inject them as a
  priority tier - the document-reference analogue of `userSelected` (reuse that never-dropped tier).
- Index human titles: when a transcript/JSON export carries an internal title, lift it into the page
  `title:`/`key_terms` at write time so the title the user will actually say becomes a retrieval
  signal (fixes Failure 1d at the source).

### P1 - honesty floor (Failure 2.4)
- When manifest grounding returns no chunk for a document the user explicitly named, the chat must
  say it could not locate that document in the corpus and offer to ingest it - never fabricate a
  citation. Wire into the existing `slidePostProcessor`/chat finalizer citation guard
  (`(Source: Gemini)` and any model-name-as-source is already bannable - extend it to the chat path).

### P2 - VS-style retrieval diversity (optional, after P0/P1)
- For a "what does X say + does it support/contradict the corpus" question, run a 2-angle retrieval
  (the named doc's chunks + the opposing-evidence chunks) so support/contradiction is grounded on
  both sides, not just whatever ranked first.

## Acceptance gate
Re-ask the exact failing question after P0+P1 against the live Analyst Desk: the answer must quote the
actual Guide text with a real `[<wikiPath>#cN]` pointer (not `Source: Gemini`), or state plainly that
the document is not in the corpus. No truncated-away tail, no duplicate-crowded pool, no hallucinated
source.

---

## IMPLEMENTATION STATUS (2026-06-25) - DONE + LIVE-VERIFIED, NOT COMMITTED

All P0 + P1 shipped. P2 deferred (optional). Gates: `tsc` 0 errors, vitest **262 passed** (+10 new),
proxy `ast.parse` OK, SPA + proxy rebuilt, SPA smoke 0 console errors.

**P0 capture-in-full**
- `researchFabricOrchestrator.ts`: `ENRICHMENT_PER_ITEM_CAP` is now upload-aware via `isUploadItem()`
  + `capItemBody()`; uploads capture in FULL at all 3 write sites (cache/web/source-native). Web
  articles stay capped.
- `wikiService.ts::uploadsToDataSourceItems`: removed the `text.substring(0, 30_000)` cap.
- `proxy/app.py`: `/api/extract-pdf` max_pages 30->200; `_parse_pdf_bytes` default 80->300.

**P0 dedup (forward)**
- New `wikiService.ts::uploadSyntheticUrl(fileName)` = `upload://<file>` (NO engagement slug), used by
  both `archiveUploadedDocs` and `uploadsToDataSourceItems` -> identical `_url_hash` across runs -> ONE
  canonical page; the proxy appends each run's engagement tag. `archiveUploadedDocs` unified to
  source='Client Uploads' + default kind 'article' so both writers hit the same
  `articles/client-uploads/<h>.md` page (was forking into a 2nd `uploads/<eng>/` page).

**P1a by-name retrieval** (the core "not retrievable" fix)
- `proxy/app.py` NEW `GET /api/manifest/chunks-by-title?q=&limit=&min_score=` - query-coverage scoring
  over page title+filename (strong) + manifest key_terms (soft); returns chunk pointers + matched_titles.
- `chunkRetrieval.ts`: `extractNamedReferences()` (quoted phrases + filenames), `_fetchChunksByTitle()`,
  `namedRef` priority flag (shares the never-dropped USER_SELECTED_TIER), merged into the catalog inside
  `pickChunksForPrompt` (clone-merge, never mutates the cached catalog); `PickedChunks` now carries
  `namedRefsMatched` / `namedRefsMissing`.

**P1b title-lifting**
- `proxy/app.py::_lift_internal_title()` at write time: opaque filename titles (transcript_<uuid>.json,
  *.vtt, bare uuid) get a body `Title:`/JSON `"title"` lifted into the page title. by-title also matches
  on key_terms so body-titled docs are findable.

**P1c honesty floor**
- `corpusChatService.ts`: builds `namedDocNote` from matched/missing named refs and renders it as a
  NAMED-DOCUMENT DIRECTIVE ahead of the evidence (found -> cite chunks; missing -> say not-in-corpus,
  never fabricate).
- `slidePostProcessor.ts::stripModelNameAsSource()` (belt-and-suspenders) strips `(Source: Gemini)` /
  `[Source: Claude]` / `Source: the model` on BOTH chat scrub paths; preserves real named sources.

**Tests**: `services/namedRefRetrieval.test.ts` (10 cases - extractNamedReferences, uploadSyntheticUrl
stability, stripModelNameAsSource incl. preserve-real-sources). by-title endpoint curl-verified
(Luanne/Tim/CASE match; nonexistent -> 0).

**LIVE acceptance (Analyst Desk, NU advancement session)**
1. EXISTS: "What does the 'Taylor Brooks' stakeholder interview say about CRM migration...?" ->
   console `BY-NAME admission: matched [Taylor Brooks...], +54 priority chunks`; answer quoted the
   Salesforce->Ascend migration with real `[articles/client-uploads/...#cN]` pointers; 617 pointer
   elements, **0 fabricated model-sources**.
2. MISSING: "What does the 'Quarterly Mars Colony Donor Budget Memo' say...?" -> console
   `BY-NAME: matched=[] missing=["Quarterly Mars Colony Donor Budget Memo"] (honesty floor will
   apply)`; answer: "...is not in the current research corpus. If you have access to this document,
   please upload or ingest it..." - **no fabrication**.

**P1d (follow-on) chat-reply RENDER bug** (user-flagged from the live screenshots)
- `components/ChatProse.tsx`: Gemini Flash sprinkles stray lone separator dashes; the renderer turned
  a bare `-` line into a junk `<p>-</p>`, left a dangling ` -` on sentences, and fragmented
  blank-separated bullets into N single-item lists. Fixed in `normalizeMarkdown` (drop a line that is a
  single separator char - 3+ char `---` rules preserved as `<hr>`; strip a dangling trailing dash) and
  `parseBlocks` (tolerate a single blank line between list items so they render as ONE list). 5 new
  tests in `chatProseBlocks.test.ts` reproduce the exact screenshot input and assert clean output.
  vitest **267 passed**, typecheck 0, SPA rebuilt (0 console errors). NOTE: a live screenshot
  re-confirmation was blocked by an unusually slow RI 3-pass generation on that query (rate-limit
  aborts); the fix is proven deterministically against the screenshot-derived input.

## NOT DONE (deliberate; needs user go-ahead)
- **Historical backfill** of the existing wiki (collapse 389->57 dupes, re-ingest the 173 truncated
  pages in full, lift opaque titles on existing pages). The forward fixes do NOT touch existing pages,
  and a pure re-chunk cannot recover truncated bytes - it needs a RE-INGEST migration (re-run the
  upload archive, which re-writes full + stable-url + lifted-title, then re-chunks + re-manifests).
  Build gated + dry-run-first when approved.
- **P2** VS-style 2-angle retrieval (named doc + opposing evidence) for support/contradict questions.
- Nothing committed (standing rule: test together before commit).
