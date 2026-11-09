# NotebookLM Reverse-Engineering into HiC: Notebook Studio — 2026-11-03

STATUS: ANALYSIS COMPLETE 2026-11-03; IMPLEMENTATION IN PROGRESS (W1-W6, Part 6)
OWNER DIRECTIVE: /goal 2026-11-03 — analyze HiC + NotebookLM with the REA extension, reverse-engineer
NotebookLM's upload analysis / summarization / output generation into the Intelligence Augmentation
suite, combined with HiC's external data source packs, "in a more optimized and elegant way."
UNIFIED VISION phases advanced: 1 (objective relevance), 2 (all-source collection), 3 (provenance
chunking), 5 (anti-RAG on chat surfaces), 6 (one routing authority — new outputs route through
`aiRouter.artifactModelFor`).

## Part 0 — Tooling: REA (Reverse Engineer Anything)

- Installed `rea-agents` v6.8.0 globally (`npm install --global rea-agents`) and registered the MCP
  server at user scope in `~/.claude.json` (`mcpServers.rea` → `node .../rea-agents/scripts/rea.mjs mcp`;
  handshake verified, protocol 2025-06-18). Future Claude Code sessions get REA tools natively; this
  session drove the CLI directly.
- Ran `rea analyze-javascript-application` over the NotebookLM-for-Windows clone: full
  JavaScriptApplicationGraph with IPC channels, module map, Electron boundaries, AST-level evidence.
  Output: `.tmp-rea-analysis/rea-notebooklm-wrapper.json`.
- Ran `rea analyze-web-bundle` against the LIVE Gemini Notebook web client (headless Edge CDP on
  notebook.google.com/trynow, the signed-out product surface). Result: 7 scripts parsed, zero
  parse failures, ZERO endpoint or route observations: Google ships no application logic to
  unauthenticated visitors; the app bundle loads only after login. Evidence:
  `.tmp-rea-analysis/notebooklm-web-bundle.evidence`. This measured negative bounds the REA lane
  precisely: every NotebookLM surface reachable without the owner's credentials has been analyzed
  (wrapper + public web bundle); going deeper requires the owner's logged-in session (a HAR
  export, which `rea` network-capture analysis and environment-build consume directly).

## Part 1 — The decisive architectural finding

**There is no NotebookLM source code to decompile.** The referenced
`GyaneshSamanta/NotebookLM-for-Windows` is an Electron 34 shell around `notebook.google.com`:
five JS files whose only intelligence is a MutationObserver watching Material snackbar toasts
("Audio Overview generated", "Source added", "Note saved"), a heuristic notes-panel scraper, and
input-field injection for Quick-Clip/URL drop. All analysis, summarization, grounding, and Studio
generation run server-side at Google on Gemini.

Therefore the correct reverse-engineering mode is **behavioral/functional replication** (the mode
REA itself frames: "see a feature, understand how it works, build a version for your project"):
specify NotebookLM's observable contract precisely, then implement that contract on HiC's own
pipeline, where HiC is already stronger (external source packs, provenance chunking, claim ledger,
native PPTX, design-system governance).

## Part 2 — NotebookLM behavioral specification (the reverse-engineered contract)

Compiled from the wondertools complete guide, the wrapper's DOM observation points, and public
product documentation. Each clause is testable.

### 2.1 Source ingestion (the surface the owner says NotebookLM does better)
- N1. On EVERY source add (file, URL, YouTube, pasted text), the system IMMEDIATELY and
  automatically produces, per source: a short summary, key topics, and 3-5 suggested questions
  derived from that source. No run, no button, no hashtag. The user sees intelligence within
  seconds of upload.
- N2. The full text becomes searchable with citations the moment ingestion completes.
- N3. Source discovery is built into the add-sources surface: "Fast Research" (~10 relevant docs,
  <30s) and "Deep Research" (more, slower) fetch external sources into the same rail as uploads.
  (HiC's analogue and superset: source packs + researchFabricOrchestrator.)
- N4. Limits honored gracefully (per-source word caps), and oversized sources are still ingested
  with partial coverage rather than rejected.

### 2.2 Grounded chat
- C1. Every answer carries inline numbered citation chips; each chip resolves to the exact source
  passage, and clicking it reveals that passage (source + highlighted span), not just a name.
- C2. A source rail with per-source checkboxes scopes EVERY chat query and EVERY studio output to
  the currently selected sources. Default: all selected. Selection changes future outputs only.
- C3. Abstract/NL queries work without keyword matches (semantic retrieval), but answers remain
  grounded: no answer content without a source basis.
- C4. Suggested questions are offered both at notebook level (from the corpus) and after answers.

### 2.3 Studio outputs (one-click, optionally prompt-steered)
Each output is: one click; optional steering prompt (audience, style, focus); format options where
noted; generated from the CURRENTLY SELECTED sources; saved into the notebook and re-openable.
- S1. Audio Overview — two-host podcast dialogue; formats: Deep dive / Brief / Critique / Debate.
- S2. Video Overview — narrated slideshow (brief ~1-2 min or explainer ~6-10 min).
- S3. Reports — 2,000-3,000 word documents in named formats: Briefing doc, FAQ, Timeline,
  Study guide, Explainer, Critique (weaknesses in sources), Debate (multiple perspectives).
- S4. Mind Map — interactive nested concept map of the corpus; nodes click through to chat.
- S5. Flashcards — term/definition cards; user sets familiarity level, count, focus, source scope.
- S6. Quiz — multiple-choice with answers + explanations; same steering as flashcards.
- S7. Data Table — structured table extracted across sources (entities x attributes).
- S8. Infographic — landscape/portrait/square, detail level, optional style prompt.
- S9. Slide Deck — detailed standalone or presenter-style; optional style/focus prompt; PDF export.
- S10. Studio outputs do NOT carry citations (NotebookLM weakness — HiC must BEAT this, not copy it:
  HiC outputs keep their citation protocol).

### 2.4 UX shape
- U1. Three-panel layout: Sources rail (left, checkboxes + add) | Chat (center) | Studio (right,
  one-click output tiles). This is the elegance the owner is pointing at.
- U2. Outputs land in the Studio panel as cards (with progress states), re-openable, downloadable.
- U3. Toast/notification when a long generation (audio) completes (the wrapper's observation point).

## Part 3 — HiC current-state map (file:line)

### 3.C Output inventory vs NotebookLM Studio (explored 2026-11-03)

| NotebookLM output | HiC today | Status |
|---|---|---|
| Audio Overview (4 formats) | `#brief-dialog` text dialogue only (artifactCatalog.ts:124, briefDialogService.ts:83). NO TTS anywhere in SPA or proxy; ELEVENLABS_API_KEY referenced only by a nonexistent soundtrack-generator service (docker-compose.yml:132). | MISSING (text substitute) |
| Video Overview | TWO orphans: `generateSceneVideo` (geminiService.ts:224-302) called only from never-rendered ResultsView; sidecar `internal-solutions-video-renderer` :5015 + video-render-mcp :8508 + `recapComposition.ts` with no caller. No narration. | EXISTS, ORPHANED |
| Report: Briefing doc | `#brief` via HTML chain (hashtagParser.ts:337-403 → CorpusChatPanel.tsx:6187-6796 → htmlArtifactChain.ts:345) | WIRED |
| Report: Explainer | `#explainer` (artifactCatalog.ts:111) | WIRED |
| Report: Long report | `#report` / `#whitepaper` (artifactCatalog.ts:114) | WIRED |
| Report: Study guide | none | MISSING |
| Report: FAQ | none (only a proto UI pattern) | MISSING |
| Report: Timeline (chronology FROM sources) | `#roadmap` timeline is forward-looking plan, not source chronology (artifactCatalog.ts:95) | PARTIAL |
| Report: Debate | `#brief-dialog` (Skeptical Partner vs Curious Strategist) | WIRED (text) |
| Report: Critique | internal critics only (auditCritiqueDeck.ts, artifactExpertPanel.ts:92-198); no user-facing #critique | PARTIAL |
| Mind Map | `#mindmap` WIRED (CorpusChatPanel.tsx:174-210 → mindMapArchitect.ts:152 → mindMapRenderer.ts:231 radial + click-to-chat). Needs >=3 themes or throws (CorpusChatPanel.tsx:179-181). | WIRED |
| Flashcards | none | MISSING |
| Quiz | none | MISSING |
| Data Table | pieces only: slides:evidence-table (slideComposer.ts:2729), #prd xlsx (app.py:21830), fixed matrices (#gap/#compete/#audit), /api/tabular/aggregate (app.py:4218) | PARTIAL |
| Infographic | slides:infographic-exhibit deck-only (slideComposer.ts:2466); no #infographic hashtag | PARTIAL |
| Slide Deck | `#slides` DECK MODE + native PPTX export (app.py:21882) | WIRED |

Dispatch path: `handleSend` (CorpusChatPanel.tsx:5716) → clarification gate → #help/#artifacts/#refine
→ HTML-artifact directives (parseHtmlArtifactDirective hashtagParser.ts:397, catalog-generated) →
libraries/builders (#proto :6945, #presentation :7343) → "uplift kinds" via `UPLIFT_CATALOG_IDS`
(artifactCatalog.ts:361-364, modality 'analysis') → `UPLIFT_HANDLERS` (CorpusChatPanel.tsx:173-245)
→ else `sendChatMessage` (corpusChatService.ts:3134; skills via HASHTAG_TO_SKILL_ID :2360; model via
routedModelFor :735 → aiRouter.artifactModelFor). Second engine: Design Desk `generateFreeformArtifact`
(chatToFreeform.ts:1020) → proxy `/api/artifact/generate` (app.py:27517, KIND_TO_SKILL_PATH :25983).

Adding a new analysis-modality kind = one artifactCatalog entry + one UPLIFT_HANDLERS entry (+ update
pinned test artifactCatalog.coverage.test.ts:130). Adding a new HTML doc kind = catalog entry +
ArtifactGenerator union + HTML_GENERATOR_LABELS (hashtagParser.ts:309, :337).

UI: NO one-click output panel. Old OUTPUT ARTIFACTS toggles deliberately hidden (App.tsx:1288-1293,
:7425-7432 "Analyst Desk chat is now the canonical entry point"). Only typing aids exist (hashtag
autocomplete CorpusChatPanel.tsx:1607-1650; DynamicPromptChips fill-not-send; #help).

Persistence is FRAGMENTED across four stores: HTML artifacts → /api/artifacts →
hic-workspace/artifacts (listable via #artifacts grid, LAUNCH/DELETE/#refine); uplift kinds
(#mindmap, #brief-dialog, #meta-themes, #deep-research) → browser-only IndexedDB Design Desk store
(lost per-browser, invisible to #artifacts); decks → session snapshots + AIR records; #presentation
→ wiki/presentations; #proto → hic-workspace/prototypes. No single gallery.

Long-job infra exists and fits slow TTS/video renders: POST /api/jobs (app.py:27273), webhook run
:27429, GET /api/jobs/{id} :27472, allow-list _JOB_OPS :27099. Gemini passthrough /api/gemini-sdk/*
(app.py:13123) can carry Gemini TTS/Veo (genaiClient.ts:31 already rewrites Veo URLs).


### 3.B Chat grounding + citation UX (explored 2026-11-03)

The evidence store is already NotebookLM-grade; the UX chain breaks in three places.

Plain-chat answer path: `handleSend` → requestPlan (CorpusChatPanel.tsx:5941) → `sendChatMessage`
(corpusChatService.ts:3134): NL source directives → sessionConstraints (:3217); chatQueryPlanner
"Wire 4" runs Haiku sub-queries + rerank but its output `context._plannedRetrieval` (:3346) is NEVER
READ (dead cost); skills (:3368); wiki prefetch injected only when manifest empty (:2101); manifest
grounding is primary: `pickChunksForPrompt` tokenBudget 6_000 chat / 30_000 artifacts (:3639) →
`resolveChunks` (:3689) → `assembleChunkCorpus` (:3705) → `buildGroundingContext` (:1807-2134)
with PRIMARY EVIDENCE = chunkCitationInstructions() + chunk corpus (:2068). Model fixed
gemini-3.5-flash (CorpusChatPanel.tsx:4149; routedModelFor :735). Tools: fetch_wiki_articles,
fetch_wiki_resource, query_topic_clusters (:6228); query_knowledge_graph declared Claude-only, its
Gemini branch (:6432) unreachable.

Citation instructions CONFLICT (three formats): `[Source Name: "Title"]` (system :3970, built from
liveSourceResults not chunks), `[<wikiPath>#cN]` pointers (chunkRetrieval.ts:1425-1441 + PROVENANCE
LOCK :4104), protocol 'none' for plain chat (:3816).

BREAK 1 — pointers destroyed pre-render: `resolveManifestPointers` (corpusChatService.ts:4742 →
citationPointerRegistry.ts:324-342) rewrites `[path#cN]` to plain " (Source: Name)". The renderer's
`parseChatCitations` (corpusChatService.ts:6516-6611, regex :6524) matches only `[Name: "Title"]` /
`[CHUNK_N]`; URL-matched ones become external <a>, otherwise non-clickable <span>
(CorpusChatPanel.tsx:8888-8895). Nothing in chat opens the cited passage.
BREAK 2 — `CiteChip` + `CitedProse` + `splitProseWithPointers` exist (components/CiteChip.tsx:31-89,
citationPointerRegistry.ts:404-447) but are used only by ResearchCard.tsx:261, not chat.
BREAK 3 — `hic:open-wiki` listener stores {wikiPath, chunkPointer} (App.tsx:1619-1624) but passes
only wikiPath to WikiArticleViewer (App.tsx:7962-7966), which loads the WHOLE page
(/api/wiki/read-article, WikiArticleViewer.tsx:106-118) with no chunk scroll/highlight despite
char_span being known.
Everything a passage popover needs already exists: per-pointer source names/urls/pageMeta
(citationPointerRegistry.ts:23-110), `promptedChunkTexts()` pointer→verbatim map
(chunkRetrieval.ts:1306-1311), `renderPointerCitationsHtml` with data-pointer (:117-140).

Source scoping: NO checkbox allow-list. Knowledge Library selection (KnowledgeLibrary.tsx:31-52,
/api/user-selection/active) only PINS/adds chunks (chunkRetrieval.ts:272-284). `excludedSources`
toggles filter only bulk corpusText at analysis start (App.tsx:6223-6271); manifest retrieval
ignores them. NL exclusions are real (sessionConstraints.ts:100-119 → chunkRetrieval.ts:743-760)
but `includeOnly` is read (:255-256) and NEVER FILLED — the allow-list slot already exists in the
retrieval engine. Attachment-only turns (useOnlyProvidedContent) and by-name document tier
(chunkRetrieval.ts:761-790) are additive mechanisms.

Suggested questions: welcome/strip chips (DynamicPromptChips.tsx, dynamicPromptSuggestions.ts:112+)
keyed on goal/uploads/graph counts only — never on the last answer; fill input, don't send. No
per-answer follow-ups for plain chat (deck-ask chips exist for artifact turns, deckLoop.ts:398).

Chunk/provenance store at chat time: wiki page frontmatter `chunks:` blocks (id `<path>#cN`,
char_span, key_terms, concepts, sources[{n,u,kind}]) + `.manifest.json` index (proxy app.py:17189,
/api/manifest/chunks :19957); resolved client-side (wikiPointerResolver.ts:271-315, text sliced by
char_span at :647). Sessions do NOT hold chunk text.

Dead code flagged: Wire-4 planner output unread (:3346); Gemini KG tool branch unreachable (:6432);
fetch_wiki_articles `source` filter unused on manifest path (:5332-5335); ResultsView citation click
logs to console only (ResultsView.tsx:197-199).


### 3.A Upload ingestion path (explored 2026-11-03)

No per-source summary, topics or suggested questions exist at upload time; parsing to text is the
only processing. Research-start flow: FileUpload.tsx:72-136 (DOCX converted in-browser by mammoth
and RENAMED .txt :83-98; others base64) → two-phase onFilesSelected; parseFilesInBackground POSTs
/api/parse-upload (proxy app.py:11174-11303: PyPDF2 + Gemini-vision OCR fallback, caps 200K) →
parsedText merged into App.tsx `files` (:1283, :7434-7445). Chat sees full text pre-run via
buildUploadedFileContents (App.tsx:259-284) → UPLOADED CLIENT DOCUMENTS block capped 200K
(corpusChatService.ts:1986-1991). Persistence only at startAnalysis (App.tsx:4205-4224):
seedWikiFromUploads writes ONE name-catalog page (wikiService.ts:768-819, despite AGENTS.md:202-217
specifying real per-source summary pages); archiveUploadedDocs → ingestUploadedDocuments
(wikiService.ts:1137-1274) → /api/wiki/write-article (app.py:16180-16418: dedup, frontmatter,
chunk+embed, manifest upsert) → articles/client-uploads/<hash>.md. Chat attachments:
ChatAttachmentDropzone.tsx:102-197 → attachment-intent Flash call (attachmentIntent.ts:19-68)
decides persistToCorpus/extractLedger.

Nearest existing pieces: engagement ledger analyzeUploadedDocuments (engagementLedger.ts:793-813,
per-doc full read on artifactModelFor('prd')) but output is SF/FB requirement items + a count line;
`runUploadAnalysis` (wikiService.ts:1278-1323) fires a window event chat renders (the natural hook);
`SourceExtraction` schema (extractionTier.ts:136-150) DEFINED BUT NEVER POPULATED; per-chunk
key_terms/concepts in frontmatter (wiki_chunker.py:320-365); DynamicPromptChips document-drill sees
only 400 chars of 3 docs (dynamicPromptSuggestions.ts:232-252); TranscriptSynthesis batch panel is
opt-in via "Goal from uploads" (App.tsx:3044-3096, :7284-7331).

Per-upload toggle: NONE. Curation excludedSources never reaches manifest retrieval
(pickChunksForPrompt ignores it); Knowledge Library treats uploads as one 'client-uploads' bucket
(KnowledgeLibrary.tsx:970); sessionConstraints excludeSources works (chunkRetrieval.ts:737-760) but
`includeOnly` (sessionConstraints.ts:36) is never filled. Upload UI today: chips with icon, name,
KB size, remove x (App.tsx:7447-7469); no parse status, no intelligence.

Types: FileUpload (types.ts:2-19: name,type,size,data,parsedText?,parsedPages?,parseMethod?);
ChatAttachment (ChatAttachmentDropzone.tsx:24-40); DataSourceItem (dataSourceConnectors.ts:16-26);
UploadIngestionReceipt (wikiService.ts:1036-1047). `SourceDocument` in docs is stale.

## Part 4 — Gap matrix NotebookLM vs HiC

| # | NotebookLM clause | HiC state | Gap class |
|---|---|---|---|
| C1 | Clickable citation chips resolving to the exact passage | Pointer evidence exists end-to-end; `resolveManifestPointers` flattens pointers to text before render; CiteChip unused in chat; viewer drops chunkPointer | WIRE (3 breaks) |
| C2 | Source checkboxes scope every query | `includeOnly` slot exists in chunkRetrieval but nothing fills it; no rail UI | FILL + UI |
| C4 | Suggested questions incl. follow-ups from the last answer | Chips keyed on goal/corpus only | EXTEND |
| N1 | Instant per-source summary + suggested questions on upload | Nothing runs at upload; hooks exist (runUploadAnalysis event, unused SourceExtraction schema, chunk key_terms) | BUILD (per-source intelligence pass + chip expansion UI) |
| S1 | Audio Overview (4 formats) | brief-dialog text engine exists; no TTS anywhere; ELEVENLABS_API_KEY in .env unused | BUILD (proxy TTS + composer) |
| S2 | Video Overview | two orphaned paths, no narration | DEFER (out of first increment) |
| S3 | Report formats: FAQ, Study guide, Timeline-chronology, Critique | missing (brief/explainer/report/debate exist) | BUILD (catalog + HTML chain) |
| S5 | Flashcards | missing | BUILD |
| S6 | Quiz | missing | BUILD |
| S7 | Data Table | pieces only | BUILD |
| S8 | Standalone infographic | deck-only | DEFER (exhibit lane exists) |
| S9 | Slide deck | #slides, stronger than NotebookLM | DONE |
| S4 | Mind map | #mindmap wired | DONE |
| U1 | One-click Studio panel | deliberately removed; chat-only entry | BUILD (panel driving existing directives) |
| U2 | Unified re-openable output gallery | four fragmented stores | PARTIAL (defer unification; Studio panel lists #artifacts) |
| S10 | (HiC must beat) Studio outputs keep citations | HTML chain claim-ledger gate already enforces | KEEP |

## Part 6 — Build sequence (IMPLEMENTED 2026-11-03; typecheck + full vitest green, 2336 passed)
- W1 DONE — Citation chips + passage viewer (C1), phase 5. corpusChatService keeps pointer
  addresses in chat prose (flatten removed at :4742; bare pointers re-bracketed);
  CorpusChatPanel.renderRun splits runs with splitProseWithPointers and renders CiteChip
  (chip click dispatches hic:open-wiki with chunkPointer); App passes chunkPointer to
  WikiArticleViewer, which resolves the chunk via wikiPointerResolver, pins a CITED PASSAGE
  panel, highlights the span in the body and scrolls to it. The chat .txt export flattens
  pointers via resolveManifestPointers (plain-text egress). Slides keep their own flatten
  layer (slidePostProcessor.ts:83).
- W2 DONE — Source scope rail (C2), phase 1/5. sessionConstraints.setSourceScope fills the
  ALREADY-ENFORCED includeOnly allow-list; new components/SourceScopeRail.tsx lists client
  uploads per document + external sources per wiki directory from /api/manifest/chunks;
  SCOPE button in the chat header; describeEnforcement echoes the scope.
- W3 DONE — Studio document kinds (S3, S5, S6, S7), phase 6. Seven new catalog entries riding
  the HTML artifact chain (claim-ledger gate + pointer citations, beating NotebookLM S10):
  #faq, #studyguide, #chronology (source chronology, deliberately not '#timeline'),
  #flashcards (native <details> reveals), #quiz, #datatable, #critique. Each has a parser
  union member, a label, a structural directiveInstructions contract, and a registry row.
- W4 DONE — Studio panel (U1). components/StudioPanel.tsx: one-click tiles (Understand /
  Create / Practice) + a steering input, launched from a STUDIO header button; every tile
  submits through handleSend, so outputs inherit routing, grounding, gating, the library.
- W5 DONE — Audio Overview (S1), phase 6. Proxy POST /api/tts/dialogue renders a two-voice
  script to one MP3 via ElevenLabs (voices env-overridable; 503 without the key) and serves
  it at GET /api/artifacts/audio/{name}; compose now passes ELEVENLABS_API_KEY to
  research-proxy; new #audio-overview (#audio, #podcast) uplift handler builds the
  brief-dialog script, strips pointer tokens from the spoken lines, and lands player +
  cited transcript in the Design Desk, degrading to text when voice is unavailable.
- W6 DONE — Upload instant intelligence (N1), phase 2. services/sourceIntelligence.ts: one
  bounded Flash call per upload as parsedText lands (utility tier; the engagement ledger's
  reasoning pass still runs at ingest); App renders summary + key-topic chips + 3-4
  suggested questions under each upload chip; a question click opens the Analyst Desk with
  the question prefilled (hic:prefill-chat gained a verbatim `text` field).
- W7 DONE (owner escalation, live 0-of-45 deck) — #slides evidence selection. Root cause of the
  0/45 binding: the model never interleaves pointer syntax into prose (pointerBinder.ts header:
  three prompt attempts failed, four consecutive zero-pointer decks 2026-08), and the
  deterministic binder refuses paraphrases at the strict bar by design. NotebookLM-style fix:
  DECK MODE now requires a top-level `"evidence": ["<path#cN>", ...]` array per slide, SELECTED
  from the corpus block menu (selection is reliable; interleaving is not); pointerBinder gained
  strategy 'declared' that matches factual fields against the slide's own declared chunks at a
  proportionate bar (2 terms, 3-token run, 0.22), invented ids filtered against the grounding
  pool, every binding still re-verified by citationVerifier (provenance stage runs after
  bindPointers in artifactChain). Pinned tests added (pointerBinder.test.ts: declared binds a
  paraphrase; invented ids never bind).
- W8 DONE (live Docker defect, caught by the Studio #flashcards smoke run) — every HTML artifact
  (#brief/#report/#prd/#explainer + the seven new kinds) failed in 2ms in the Docker build with
  "[modelRouter/strategy] no reachable models": WS-0 S1 (2026-10-30) removed provider keys from
  the browser bundle, but aiRouter.getAvailableProviders() still key-gated the model chain, so
  the set came back empty. Fix: a bundle with ZERO baked keys now means proxy-attached (all three
  providers eligible; the proxy holds the keys at /api/ai/*); local dev with baked keys keeps the
  old gating. This defect predates today's work and silently broke the whole HTML artifact family
  in Docker since 2026-10-30.
- Also landed under the owner's "every artifact" directive: buildUploadedFileContents (the single
  raw-upload chokepoint feeding every artifact prompt) now (a) honors the Scope rail + chat
  exclusions (excludeSources/includeOnly) and (b) prepends each document's SOURCE GUIDE line
  (upload-time summary + key topics) so every generator opens each upload NotebookLM-style.
- W9 DONE + PROVEN LIVE (2026-11-03 20:53) — Video Overview (spec S2). The previously orphaned
  pieces are wired end to end: `#video-overview` (new catalog entry, uplift handler, Studio tile,
  registry row) builds the deterministic slop-gated recap via services/recapComposition.ts from
  the run's RECORDED substance (objective, thesis, named sources, recommendation; absent fields
  produce no scene), submits it through new proxy passthroughs (/api/video/render, status,
  outputs -> video-renderer:4600), polls to completion, and renders the MP4 player + narration
  beats in the Design Desk. Live run: 371KB MP4 in 40.9s ("2 scenes"), player verified on screen.
  The video-renderer sidecar is now in the running stack.
- Deferred: S8 standalone infographic, U2 store unification, C4 per-answer follow-up suggestions.

VALIDATION 2026-11-03: `npm run typecheck` clean; full `npm run test` 2336 passed / 1 skipped
(coverage tests updated: uplift ids now include audio-overview); `ast.parse` clean on
proxy/app.py.

LIVE VERIFICATION 2026-11-03 (Playwright on the rebuilt :5011, session
identify-high-converting-email-design-patterns):
- Shell mounts with zero console errors; Studio, Scope, Coverage buttons render; the Studio
  panel shows all 12 tiles; citation chips (c0/c1) render on the theme board.
- W8 proven: `#flashcards` fired from the Studio tile completed end to end on claude-opus-5-5
  and SAVED (28.8KB HTML): 27 <details> cards, 94 hic-cite citations (named + dated), zero
  leaked file paths; chain receipt "70 claim rows, 38 pointers resolved, 13 independent
  origins, 6 sentence(s) narrowed, 20 citation(s) rendered (AIR patched)".
- W7 proven: `#slides how the email system builds a campaign, step by step` re-ran in the same
  session that produced the 0-of-45 deck. Deck-gate PASS (7 slides, 6 archetypes); the
  pointer-binder had only 2 eligible fields left (1 bound): factual fields carried pointers at
  generation; the 60%-binding "pointers" finding did NOT fire; 14 named Sources attributions
  render on-slide; zero raw .md#c paths on screen; parity fill added 29 source-quoting
  appendix entries. Grounding pool: 2,651 engagement chunk pointers / 753 manifest pages.
- Residual quality finding (pre-existing gate, not grounding): connective_heavy on this deck
  (2 of 6 body slides carry content); the deck-quality gate names it in the receipt.
- W5 AUDIO PROVEN LIVE (third run, 2026-11-03 20:37): `#audio-overview the strongest email
  design findings for the drive home` produced a 5.18MB MP3 in 20.9s TTS time: 12 spoken turns,
  2 distinct voices, the player + cited transcript rendered in the Design Desk. Two hardening
  fixes landed on the way: (a) briefDialogService now falls back to Gemini JSON-mode on an
  UNREPAIRABLE reply (not only outages), drops the forbidden temperature from the Claude body,
  runs 32K max_tokens headroom under adaptive thinking, and joins non-thought Gemini parts;
  (b) the proxy TTS resolves candidate voices from the ACCOUNT's /v1/voices list and
  substitutes a working voice when a plan-blocked voice returns 402 (the owner's ElevenLabs
  plan blocks the Rachel library voice via API; the run degraded gracefully to usable voices
  instead of failing).

## Part 5 — Decision: converge into HiC, do not build a sibling app
The owner allowed "an entirely new research app ... MAY be the easiest approach." Rejected:
UNIFIED_VISION meta-principle (CONVERGE/DELETE/GATE/SCHEDULE, do not build-new) and the HiC v2
single-workspace program both bind; a sibling app would duplicate the proxy, the wiki, the manifest,
the design system, and the model routing, and would start from zero on citations where NotebookLM
itself is weakest. Instead: a **Notebook Studio surface inside HiC** that replicates the NotebookLM
contract (Part 2) on HiC's pipeline — uploads + external packs in one source rail, per-source
instant intelligence, scoped grounded chat, and a one-click Studio panel whose outputs run through
the existing hashtag/composer/export machinery.

## Part 6 — Build sequence
[PENDING — sequenced against the gap matrix.]
