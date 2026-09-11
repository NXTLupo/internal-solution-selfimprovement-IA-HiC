# Report evidence integrity: claim ledger gate, provenance-carrying chunks, primary-source discovery (2026-09-11)

Source: the external review of the HiC `#report` white paper "Figma opens the canvas to agents, but
determinism lives outside it" (generated 2026-09-10T23:06Z, run
`as-of-august-september-2026-no-earlier-what-are-the-capabili`, trace
`traces/report-artifact-000002-claude-opus-4-8.json`, AIR `artifacts/report_1789081421719.air.json`).
The reviewer logged 36 findings (C01-C36) against 38 public sources. This plan replays the run through
the stored prompt, response, themes, corpus and source records to locate where each defect was BORN, then
fixes the pipeline for every research objective and every `#report` / `#whitepaper` / `#brief` /
`#explainer` request, not for Figma.

Unified Vision phases advanced: 2 (collect from the subject's primary documentation, not only packs),
3 (per-chunk provenance READ at cite time, including publication date and source kind), 5 (anti-RAG on the
HTML document desk, which was ungated), 7 (the gate produces regression fixtures and AIR records SkillOpt
can learn from). Meta-principle: CONVERGE (one claim gate for prose artifacts, reusing citationVerifier,
evidenceSlots, artifactRepair), DELETE (the skill text that told the model to emit chrome), GATE (the HTML
path finally has one), SCHEDULE (none needed).

## 1. Where each defect class was born (replay evidence)

| Reviewer class | Born at | Evidence |
|---|---|---|
| C01 dates: "September 2026 beta announcement" for June 2025 / Aug 2025 / Mar 2026 / Jun 2026 sources | Prompt assembly. `assembleChunkCorpus` emits `[pointer] (section)` plus text: no source name, no publication date, no kind, no URL. The only dates in the 137K-char prompt were the user's "as of September 2026" and the goal's "As of August-September 2026". | Source records are CORRECT (`articles/figma-blog/213ea4dcb6.md` `date: 2026-03-24`, `1e5fd6afb8.md` `date: 2025-08-06`, `e372681f45.md` `date: 2026-06-24`, `dcd16bd825.md` `date: 2025-04-04`). Theme citations carry `publicationDate: ''`. |
| C07 tool names `get_variable`, `make_design_system_kit` | Theme pass. Theme 7 "The Figma MCP server exposes the concrete tool surface agents call" promoted the Reddit line "ranging from get_variable to make_design_system_kit or something" into "providing named tools such as". The report prompt injected the top 15 themes as context. | `state.json` themes; prompt block `=== THEMES (139, summarized) ===`. |
| C04/C05 Webflow topology as Figma architecture | Theme pass, then writer. Theme 11 said "The white paper's harnessed-execution section can lean on the analogous Webflow MCP architecture": writer coaching inside evidence. The Webflow page had objective relevance 25 and was still admitted as load-bearing. | Theme 11 text; `articles/webflow-blog/03064a8762.md` `relevance: 25`. |
| C17 "Endpoint Security Bot" (real: Baseline) | Writer invented an expansion of "ESB"; nothing checked named identifiers against the cited chunk. Page relevance 15. | `articles/figma-blog/dcd16bd825.md`. |
| C34 raw `[articles/...#cN]` pointers as citations, no URLs | The HTML artifact path never ran `resolveManifestPointers`; the model also appended commentary inside brackets (`[..#c2, paraphrased from theme]`) which the pointer regex cannot match. | 57 raw pointers in `html_source`; `CorpusChatPanel` save path has no resolver call. |
| C18 anecdote into consensus ("every practitioner account in the corpus converges") | Same Reddit thread ingested twice (`articles/reddit-deep-r-designsystems/78f6986171.md` and `social-intelligence/reddit-deep/designsystems/1u2z8qq.md`, identical `url:`), cited as two sources; no independence check; the skill pushes "convergent evidence (3+ sources)". | Both frontmatter `url:` lines. |
| C15/C16 Webhooks V2 omitted; C31-C33 documentation conflicts flattened | Collection. The corpus held ZERO `developers.figma.com` or `help.figma.com` pages. The source registry has only the Figma blog RSS, the newsroom, the release-notes page and the REST API landing page. "Scour Figma's own documentation" in the goal was never translated into collection. 419 of the live sources were AI-news feeds. | `proxy/creative_ai_sources.py`; session `corpus.json` `live_source_results`. |
| C03/C06/C08/C09/C22 modality strengthened (can, helps -> ensures, requires, makes correct) | No modality check anywhere; `strategic-report-writer` says "Hedging language: never" and "Assert findings"; `claimSupportVerifier` excludes `#report`. | `CLAIM_VERIFIED_KINDS` has no report kind. |
| Footer buttons, "Generation audit", `__HIC_ARTIFACT_META__` in the reader-facing document | The `html-deliverable-composer` skill REQUIRES them (checklist items 6 and 10, the "Copy as prompt footer" and "embedded artifact metadata" sections) and the OUTPUT FORMAT block said the view endpoint "injects the Copy-as-prompt footer", so the model wrote its own. The proxy then wraps a second set. | Response tail; skill sections. |
| C35 multi-agent lifecycle thin | No objective decomposition on this run (`decomposedQuestions: []`), so nothing measured whether the user's listed areas were each covered. | AIR `objective.decomposedQuestions`. |
| "via theme" / "paraphrased from theme" citations | Theme summaries carried inline pointers and were presented as evidence, so a cached summary became a citable source. | Prompt themes block. |

The HTML document path (`#report`, `#whitepaper`, `#brief`, `#explainer`) ran NONE of the ten chain
stages that decks and deliverable blocks run: no pointer binding, no provenance verification, no evidence
slots, no prose signal, no grader, no repair. The AIR `qualityReport` for this run reads
`deterministicFailures: []` on an artifact with 36 review findings.

## 2. What ships (generalized, industry- and subject-agnostic)

### WS-1 Provenance-carrying evidence (Phase 3)
- `wikiPointerResolver.ResolvedChunk` gains `pageMeta` (title, sourceName, url, date, kind, method,
  extractedAt) parsed from the page frontmatter it already reads.
- `chunkRetrieval.assembleChunkCorpus` prints per chunk: pointer, source name, title, kind, published date
  (or "undated live page, retrieved <date>"), URL. The intro states the temporal contract: the objective's
  as-of window is the review date, never a publication date.
- `citationPointerRegistry` keeps date, kind, title, url per pointer and renders `[pointer]` groups as
  linked citations with the publication month/year. The bracket regex tolerates trailing commentary.

### WS-2 The claim ledger gate for prose artifacts (Phase 5)
New `services/claimLedgerGate.ts`, deterministic, zero model calls. Extracts claim rows from HTML blocks
and runs reason-coded checks that map one-to-one onto the reviewer's failure classes:
`UNRESOLVED_SOURCE`, `UNSOURCED_FACT`, `UNVERIFIED_QUOTE`, `DATE_SCOPE_MISMATCH`, `UNSUPPORTED_MODALITY`,
`PRODUCT_SCOPE_MISMATCH`, `INDEPENDENCE_INFLATED`, `UNVERIFIED_IDENTIFIER`, `DERIVED_AS_SOURCE`,
`CHROME_LEAK`. Each finding names the sentence, the pointers, and the narrowing the repair may apply.

### WS-3 The HTML artifact chain (Phase 5, Phase 7)
New `services/htmlArtifactChain.ts`: strip model chrome -> claim ledger gate -> bounded narrowing repair
(never sources, mirrors `artifactRepair` rules) -> re-gate -> render linked citations and a dated source
index -> AIR post-chain patch with the ledger. Wired into the `CorpusChatPanel` HTML directive path before
`saveArtifact`. The chat reply reports the ledger summary.

### WS-4 Prompt and skill corrections (Phase 5)
- OUTPUT FORMAT no longer describes chrome; it forbids footers, buttons, audit blocks and metadata.
- An EVIDENCE CONTRACT block states the six claim types, temporal discipline, modality preservation,
  independence, identifier handling, analogy framing, primary-documentation precedence, and that derived
  summaries are outline aids, never citable.
- Theme summaries are injected pointer-free and labeled as derived.
- `html-deliverable-composer` and `strategic-report-writer` skills: chrome sections removed; claim ledger
  contract added; "quote specific dates" and "never hedge" pressure replaced by modality preservation.
- Theme breadth prompt gains four anti-patterns: writer coaching, hedge promotion, analogy as fact, date
  projection.

### WS-5 Serve-time fixes for already-stored artifacts (Phase 9)
Proxy `_apply_brand_and_anti_slop` strips model-emitted chrome and resolves leftover manifest pointers to
named, dated, linked citations from the page frontmatter, so existing artifacts and every export path
(PDF, PNG, PPTX) stop showing file paths.

### WS-6 Subject-anchored primary-source discovery (Phase 2)
Proxy `POST /api/sources/primary-docs`: derive the named subjects of the objective and their official
documentation hostnames (one Flash call, deterministic hostname validation), site-scoped search per
objective clause through the existing Jina connectors, fetch and persist pages as `kind: documentation`
with `date` when the page states one and `collectedAt` always. The HTML directive path calls it when the
manifest holds no documentation pages for the objective's subjects, records the step in the generation
ledger, and rebuilds the corpus. Bounded: at most 24 pages, 90 seconds.

### WS-7 Regression fixtures (Phase 7)
`services/claimLedgerGate.test.ts` carries the reviewer's findings as fixtures: the date projection
sentence, the hedged tool names, the Webflow analogy, the consensus claim, the invented expansion, the
raw pointer with commentary, the chrome footer. `claimLedgerGate.replay.test.ts` replays the STORED
artifact through the gate when the workspace is present and asserts each class is caught.

## 3. Not done here, recorded honestly
- The Reddit double-ingest (article path and social-intelligence path for one thread) is deduplicated at
  cite time by URL; the ingest-side storage unification is a separate change.
- Documentation-conflict detection (two live pages disagreeing) needs both statements in the corpus first;
  WS-6 makes that possible, the reviewer's `CONFLICT_NOT_DISCLOSED` gate is a follow-up once conflicts
  can exist in the corpus.
- Per-chunk `sources:` is written only on the first chunk of RSS articles at ingest; the registry's
  page-level fallback covers it today and WS-1 pageMeta makes the fallback carry date and URL.

## 4. Shipped and verified (2026-09-11, same day)

Gates: `npm run typecheck` clean; `npm run test` 116 files / 1284 tests green (21 new); `check:skills` and
`check:content` report zero errors.

Replay of the STORED artifact through the revised gate (`services/claimLedgerGate.replay.test.ts`,
84 claim rows, 13 independent origins): DATE_SCOPE_MISMATCH 1 (the "SEP 2026 · BETA-STATE" kicker, no
cited source in or mentioning that month), UNVERIFIED_IDENTIFIER 3 ("Endpoint Security Bot" where the
source says Baseline; the capability table's `get_variable` / `make_design_system_kit` attested only in
hedged forum text), INDEPENDENCE_INFLATED 3 ("The dominant practitioner finding", "every", "all" over one
origin each), DERIVED_AS_SOURCE 3 ("via theme" tails), UNVERIFIED_QUOTE 4 (every one a real stitch: the
Webflow quote dropped the word "Webflow"; the skills quote spliced a later sentence; the grep quote
dropped "A good measure is"; the rate-limit quote silently corrected "you designs"), UNSOURCED_FACT 20
(15 warnings on headings and captions, 5 blocking). 15 blocking, 19 warnings; the artifact does not pass.
The Webflow-cited sentence names Webflow, so the scope gate accepts it as a framed analogy; the
unsourced diagram caption that asserts the live-session dependency is reported as an unsourced fact.

Proxy serve-time pass on the same stored artifact: 55 of 55 raw pointers rendered as linked, dated
citations (Figma Blog Mar 2026, Aug 2025, Apr 2025, Jun 2026; Webflow Blog Jul 2026; Reddit threads with
their months); model footer, audit block and metadata script removed.

Files: `services/claimLedgerGate.ts` (new), `services/htmlArtifactChain.ts` (new),
`services/primaryDocsDiscovery.ts` (new), `services/claimLedgerGate.test.ts` and
`services/claimLedgerGate.replay.test.ts` (new); `services/wikiPointerResolver.ts`,
`services/chunkRetrieval.ts`, `services/citationPointerRegistry.ts`, `services/geminiService.ts`,
`components/CorpusChatPanel.tsx`, `proxy/app.py`; skills `html-deliverable-composer`,
`strategic-report-writer`. Uncommitted pending owner approval. The branch also carried earlier
uncommitted work (clarification, preCompact, contextEngineering, slideTextEditing) that is not part of
this change.

### WS-6 live result (2026-09-11)
The shared Jina connectors are refused anonymously from this network (HTTP 401, "bad network reputation",
no `JINA_API_KEY` configured), which also silently disables every existing `web_search` source. The
discovery step therefore runs three Jina-free tiers: the public help-center article search API
(Zendesk-shaped hosts), a sitemap walk ranked by query-token overlap with a three-year `lastmod` floor,
and keyed Jina search only when a key exists. Hosts expand to the `developers.`, `docs.`, `help.`,
`support.`, `api.` subdomains that answer. Against the Figma objective the run wrote 12 pages in about
20 seconds: the developer docs for rate limits and access, Code Connect integration, custom rules, MCP
skills and the server introduction; the help-center MCP guides and connector management page; and the
vendor blog posts on the MCP server. Documentation pages are stored UNDATED (`kind: documentation`) and
cite as "live documentation, retrieved <month>"; only announcement URLs (blog, newsroom, releases) carry a
publication date read from the page's own metadata. Sitemap `lastmod` and help-center `updated_at` are
modification stamps and are never written as dates. `/api/manifest/chunks` now includes
`documentation` in its default types, so the writer's grounding corpus reaches these pages (37 chunk ids
on the engagement after the run). Still open: deleted wiki files linger in the manifest until a rebuild
(`reconcile` reports them as not stale).
