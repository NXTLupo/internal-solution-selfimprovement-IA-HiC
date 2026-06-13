# PHASE 5 — Hashtag-Deliverable Audit (definitive, 2026-06-12)

Scope: every chat hashtag deliverable in the HiC Analyst Desk (`components/CorpusChatPanel.tsx` `handleSend` dispatch chain + `services/corpusChatService.ts` `sendChatMessage`). All line numbers verified against the working tree on branch `self-improvement-ia-2026-05-29` as of 2026-06-12.

Audit dimensions per hashtag:
1. **Engine path** — which of the seven engines actually runs.
2. **Manifest-grounded?** — MCR = `pickChunksForPrompt` + `resolveChunks` + pointer-cited chunk corpus, vs objective-keyed `fetchWikiArticles` RAG blob, vs raw session corpus.
3. **Figma/GOLD rendering** — GOLD = `:::slide` fences -> `components/slideTemplates/web.tsx` (960x540 preview) + `services/slideToStageHtml.ts` (1920x1080 stage twin) with Figma-live tokens; vs artifact-engine `nxt-` brand-CSS HTML; vs none.
4. **Model routing** — is the 2026-06-12 `claude-fable-5` force-route directive actually honored.

---

## (a) Summary stats

24 deliverable-generating hashtags scored (`#help` is deterministic registry HTML, no LLM).

| Dimension | Coverage | Detail |
|---|---|---|
| **MCR (full, pointer-cited manifest chunks)** | **8/24 = 33%** | #slides #journey #blueprint #personas #themes #recs #case-study #audit (the sendChatMessage slide-mode family) |
| MCR incl. partial (manifest chunks led but flattened into a proxy corpus blob) | 14/24 = 58% | + #prd #gap #competitive #roadmap #arch #org |
| Not manifest-grounded at all (objective-keyed `fetchWikiArticles` RAG or other) | 7/24 = 29% | #brief #report #explainer #whitepaper #recommendations(full form) #proto #presentation |
| **GOLD/Figma (nxt-slide stage twins + live Figma tokens)** | **8/24 = 33%** | same 8 slide-mode hashtags |
| Brand-governed but NOT GOLD (artifact-engine `nxt-` CSS or `/api/artifact/view` brand wrapper) | +10 -> 18/24 = 75% | #prd #gap #competitive #roadmap #arch #org #brief #report #explainer #whitepaper |
| **Fable 5 coverage (force-route honored end-to-end)** | **12/24 = 50%** | 8 slide-mode + #recommendations + #brief #report #explainer #whitepaper |
| Fable directive SILENTLY DROPPED (arg passed but never reaches the model) | 6/24 = 25% | #org #arch #roadmap #prd #gap #compete -> proxy runs `claude-sonnet-4-6` |
| Dead/prose-misrouted hashtags | 5 | #strategy (prose unless #slide), #mindmap, #meta-themes (dead gate), #refine (no handler), #deep-research (dead gate, not in min list but same class) |

**Headline:** the ONE-ENGINE consolidation (memory: `feedback_all_deliverables_one_engine`) is one-third complete. The 8 hashtags that migrated to `sendChatMessage` slide-mode are fully compliant (MCR + GOLD + Fable). The 6 hashtags still trapped in the CorpusChatPanel `DELIVERABLE_TAGS` gate get manifest chunks but lose GOLD rendering AND lose the Fable route (the `model: 'claude-fable-5'` argument is dropped on the wire). Four hashtags are dead or prose-misrouted.

---

## (b) Per-hashtag table

| Hashtag | Engine | Manifest? | Figma/GOLD? | Model (actual) | Gaps |
|---|---|---|---|---|---|
| **#slides** | sendChatMessage slide-mode | YES (MCR) | YES (web.tsx + slideToStageHtml + Figma tokens) | claude-fable-5 (force-route) | none material |
| **#journey** | sendChatMessage slide-mode (`journey-map` tpl) | YES (MCR) | YES | claude-fable-5 | dead JM branch still in code (unreachable) |
| **#blueprint** | sendChatMessage slide-mode (`service-blueprint`) | YES (MCR) | YES | claude-fable-5 | same dead-code note |
| **#personas** | sendChatMessage slide-mode (`persona-card`) | YES (MCR) | YES | claude-fable-5 | none material |
| **#themes** | sendChatMessage slide-mode (`theme-cluster`) | YES (MCR) | YES | claude-fable-5 | none material |
| **#recs** | sendChatMessage slide-mode (`recommendation`) | YES (MCR) | YES | claude-fable-5 | FORK: full word `#recommendations` takes a DIFFERENT engine (next row) |
| **#recommendations** (full form) | CorpusChatPanel dedicated gate -> emitDeliverable + callWithModelChain | NO (objective-keyed fetchWikiArticles, falls back to raw corpus slice) | NO (tile renderer + export adapters) | claude-fable-5 (preferModel, cross-provider fallback) | not manifest; engine fork vs #recs |
| **#prd** | DELIVERABLE_TAGS gate -> proxy /api/artifact/generate | PARTIAL (manifest chunks assembled in panel, shipped as corpus blob) | NO GOLD (artifact-engine `nxt-` brand CSS HTML) | claude-sonnet-4-6 (Fable arg DROPPED) | Fable lost; not one-engine; no GOLD |
| **#gap** | DELIVERABLE_TAGS gate -> artifact engine (`gap-analysis`) | PARTIAL | NO GOLD (brand CSS) | claude-sonnet-4-6 chain | same as #prd |
| **#competitive** | DELIVERABLE_TAGS gate (`compete` -> `competitive`) | PARTIAL | NO GOLD (brand CSS) | claude-sonnet-4-6 chain | same as #prd |
| **#case-study** | sendChatMessage slide-mode (`case-study`) | YES (MCR) | YES | claude-fable-5 | none material |
| **#roadmap** | DELIVERABLE_TAGS gate -> artifact engine | PARTIAL | NO GOLD (brand CSS) | claude-sonnet-4-6 chain | same as #prd; `timeline` slide tpl exists but unused |
| **#audit** | sendChatMessage slide-mode (`systems-inventory`) | YES (MCR) | YES | claude-fable-5 | asymmetric with #gap/#compete (those divert) |
| **#arch** | DELIVERABLE_TAGS gate -> artifact engine | PARTIAL | NO GOLD (brand CSS) | claude-sonnet-4-6 chain | same as #prd; `architecture-map` tpl exists but unused |
| **#org** | DELIVERABLE_TAGS gate -> artifact engine | PARTIAL | NO GOLD (brand CSS) | claude-sonnet-4-6 chain | same as #prd (no org slide tpl exists yet) |
| **#strategy** | FALLS THROUGH to plain prose chat (no ARTIFACT_TPL entry, not in DELIVERABLE_TAGS) | chat-level MCR only | NONE (markdown prose) | picker model (Fable only if user adds #slide/#slides) | misroute: deliverable renders as prose |
| **#brief** | HTML-directive gate -> emitDeliverable + callWithModelChain -> saveArtifact | NO (objective-keyed fetchWikiArticles + loadGenerationContext wiki frameworks) | PARTIAL (brand-wrapped HTML artifact; gold PPTX only when #slides co-typed) | claude-fable-5 (preferModel) | not manifest |
| **#report** | HTML-directive gate (same handler) | NO (objective-keyed) | PARTIAL (same) | claude-fable-5 | not manifest |
| **#explainer** | HTML-directive gate | NO (objective-keyed) | PARTIAL | claude-fable-5 | not manifest |
| **#whitepaper** | HTML-directive gate (+depth-floor expand retry) | NO (objective-keyed) | PARTIAL | claude-fable-5 | not manifest |
| **#proto** | 5-stage prototype pipeline (brief VS -> build) | NO (ai-patterns catalog + uploads + session corpus) | N/A (standalone prototype HTML, brand palettes) | gemini-3.1-pro-preview / multi-stage (not Fable, by design) | no manifest grounding |
| **#presentation** | narrativeComposer tool-loop -> PresentationPayload -> renderer :5014 | NO (search_corpus tool / chat-history package mode) | NO GOLD (renderer brand tokens + presentationToPptx) | gemini-3.5-flash default (#model= override; sonnet-4-6 failover) | not manifest; not Fable; not GOLD |
| **#mindmap** | DEAD GATE -> plain prose chat | chat-level MCR only | NONE | picker model | UPLIFT_KINDS branch unreachable; buildMindMap never fires |
| **#meta-themes** | DEAD GATE -> plain prose chat | chat-level MCR only | NONE | picker model | buildMetaThemes never fires from chat |
| **#refine** | NO HANDLER -> plain prose chat | chat-level MCR only | NONE | picker model | parser imported, never invoked; advertised in #help + artifact messages |
| **#help** | Deterministic registry-driven HTML (no LLM) | n/a | NXT-branded artifact wrapper | none | fine |

---

## (c) Per-hashtag evidence notes (file:line)

### The ONE-ENGINE slide-mode family — #slides #journey #blueprint #personas #themes #recs #case-study #audit

- **Trigger table**: `services/corpusChatService.ts:532-545` — `ARTIFACT_TPL` maps `#journey->journey-map`, `#blueprint->service-blueprint`, `#case-stud*->case-study`, `#compet*->competitive-matrix`, `#gap->gap-matrix`, `#personas->persona-card`, `#themes->theme-cluster`, `#recommendations|#recs->recommendation`, `#roadmap->timeline`, `#prd->prd-feature`, `#audit->systems-inventory`, `#arch->architecture-map`. `isArtifactGenerationMessage()` at `corpusChatService.ts:553-555` (= `#slide/#slides` OR any ARTIFACT_TPL hit).
  - NOTE: ARTIFACT_TPL lists 12 templates, but 6 of them (#prd #gap #compet #roadmap #arch + #org) are INTERCEPTED upstream by the panel gate and never reach this engine (see below). Only #journey #blueprint #personas #themes #recs #case-study #audit (+bare #slide/#slides) actually arrive here.
- **Fable force-route**: `corpusChatService.ts:2901-2909` — `if (model !== 'council' && model !== 'claude-fable-5' && isArtifactGenerationMessage(userMessage))` -> `model = 'claude-fable-5'` when `ANTHROPIC_API_KEY` present. Runs BEFORE `buildGroundingContext` so Fable's conservative `maxCorpusChars: 600_000` budget governs packing (`corpusChatService.ts:483-493`, window declared unverified). In-flight UI twin: `routedModelFor()` `corpusChatService.ts:561-567`, consumed at `CorpusChatPanel.tsx:7554-7563`.
- **Manifest grounding**: `corpusChatService.ts:2865-2891` — `pickChunksForPrompt(userMessage, slug, {tokenBudget: 30_000})` -> `resolveChunks` -> `assembleChunkCorpus` -> `context.manifestChunkCorpus`; `buildGroundingContext` LEADS with it and demotes bulk corpus (`corpusChatService.ts:1792-1811`). RAG pre-fetch is explicitly SUPPRESSED for artifact messages: `corpusChatService.ts:2782-2789` (`!isArtifactGenerationMessage(userMessage)` guard on the `prefetchArticlesForMessage` block, per `feedback_deliverables_manifest_wiki_not_rag`).
- **Figma-live tokens**: `corpusChatService.ts:2827-2855` — fetches `/api/design-tokens?brand=NXT|NU&format=prompt`; on failure injects "TOKENS UNAVAILABLE - do NOT invent hex" instead of hardcoded values. The SLIDE OUTPUT PROTOCOL mandates token use at `corpusChatService.ts:660-678`.
- **Slide-mode prompt gate**: `corpusChatService.ts:3270-3290` — `slideModeActive = /#slides?\b/i.test(userMessage) || !!artifactTplHit`; injects "SLIDE MODE IS ACTIVE ... MUST respond with :::slide fences" with the per-hashtag default template. Protocol text at `corpusChatService.ts:596-628` makes an artifact hashtag a slide trigger even WITHOUT #slide ("Section 2 applies even without #slide/#slides", line 596, 601).
- **RI contract enforcement**: `corpusChatService.ts:3338-3344` — if slide-mode response has no `:::slide` fence, anchored re-ask converts the prose into fences (keep content, no regeneration).
- **Anthropic call**: `corpusChatService.ts:3923` (`model: string = 'claude-fable-5'`), no `temperature` (Fable rejects it, line 3955), 32K output cap (line 3960). Proxy model registry knows Fable: `proxy/model_registry.py:26`, startup assert `proxy/app.py:11776`.
- **GOLD rendering**: `:::slide` fences parse to `SlideData` -> web preview `components/slideTemplates/web.tsx` + 1920x1080 stage twin `services/slideToStageHtml.ts` (header comment lines 1-10; generic fallback at 1837). Stage HTML is consumed at `CorpusChatPanel.tsx:3292` and `components/SlideCanvas.tsx:291`; editable PPTX via proxy `/api/gold/export-pptx` (`proxy/app.py:13423`) and `/api/gold/export-pptx-multi` (`proxy/app.py:13371`). Skill grounding via `HASHTAG_TO_SKILL_ID` (`corpusChatService.ts:1997-2024`: `#journey/#blueprint->service-blueprint-mapper`, `#themes->theme-analyst`, `#persona->persona-architect`, `#case-study->case-study-analyst`, `#audit->tech-audit-inspector` ...), dominance in `matchSkills` `corpusChatService.ts:2143-2156`.
- **#journey/#blueprint specifics**: removed from the panel's `DELIVERABLE_TAGS` 2026-06-10 (one-engine rule) — comment + gate at `CorpusChatPanel.tsx:6635-6645`; the old Journey-Mapper branch (`CorpusChatPanel.tsx:7074-7231`, fetch `/api/journey-map/generate`, 6-min timeout) is now UNREACHABLE (its guard requires `allDeliverable===true`, impossible once journey/blueprint left the tag set) — kept "temporarily; slated for deletion" (line 6644). Git confirms: `DELIVERABLE_TAGS` diff removed `journey`/`blueprint` in the uncommitted working tree.

### #recommendations (full form) — dedicated panel gate

- Gate: `CorpusChatPanel.tsx:4882` — `/(?:^|\s)#recommendations(?=...)/i` (the literal word only; `#recs` does NOT match and falls through to slide-mode -> ENGINE FORK).
- Model: `CorpusChatPanel.tsx:5206-5223` — `emitDeliverable({deliverable:'#recommendations', model_id:'claude-fable-5'...})` wrapping `callWithModelChain({preferModel:'claude-fable-5'})`; anthropic body built at 5244-5254. Fable honored (with cross-provider fallback per `services/deliverableModelRouter.ts:133`).
- Grounding: `CorpusChatPanel.tsx:5163-5184` — objective-keyed `fetchWikiArticles` (limit 40, 90KB block), fallback `corpusText.slice(0,80000)`. **No `pickChunksForPrompt` anywhere in this gate** -> not manifest-grounded.
- Rendering: recommendation tiles (consensus/bets) + optional slide/deck export adapters — not GOLD stage frames at generation time.

### #prd #gap #competitive(#compete) #roadmap #arch #org — DELIVERABLE_TAGS gate -> proxy artifact engine

- Gate: `CorpusChatPanel.tsx:6645` — `DELIVERABLE_TAGS = ['org','arch','roadmap','prd','gap','compete']`; fires when ALL content hashtags in the message are in this set (`allDeliverable`, lines 6661-6664). Parser: `design-desk/services/hashtagParser.ts:26-36` (content set) + plural aliases 47-95 (`competitive->compete`, etc.). Kind aliases `gap->gap-analysis`, `compete->competitive`, `audit->tech-audit` at `CorpusChatPanel.tsx:6646-6650`.
- Manifest grounding (PARTIAL): `CorpusChatPanel.tsx:6735-6766` — `pickChunksForPrompt` + `resolveChunks` + `chunkCitationInstructions()` + `assembleChunkCorpus` pushed as `=== PRIMARY EVIDENCE (manifest-selected, cite by pointer) ===` into `combinedCorpusParts`; objective-keyed retrieval demoted to "supplementary" when manifest chunks landed (6767-6777). BUT the assembled text is flattened to one `corpusText` string (6873) and shipped to the proxy as a blob — the proxy itself does no chunk selection.
- Engine: `CorpusChatPanel.tsx:7237-7249` -> `generateFreeformArtifact({... model:'claude-fable-5'})` -> `design-desk/services/chatToFreeform.ts:975-980` `ARTIFACT_ENGINE_KINDS` (org, arch, roadmap, prd, gap-analysis, tech-audit, competitive all members) -> `chatToFreeform.ts:987-1010`: POST `/api/artifact/generate` with body `{kind, brand, goal, description, journey_type, corpus}` — **`llm_model` is NOT in the request body and `args.model` is ignored on this route** (the Fable branch at `chatToFreeform.ts:186` lives in `callForModel`, used only by NON-engine kinds, of which there are none in this gate).
- Proxy model: `proxy/app.py:16961` — `model = body.get("llm_model") or "claude-sonnet-4-6"`; chain resolution `_resolve_artifact_chain` (`app.py:16467-16482`) over `_ARTIFACT_MODEL_CHAINS` (`app.py:16428-16442`) = Opus 4.8 / Sonnet 4.6 / Gemini 3.1 Pro only. **claude-fable-5 appears nowhere in the artifact-engine chains** -> the 2026-06-12 Fable directive is silently dropped for these 6 hashtags. The chat message then reports `via artifact-engine <kind> via claude...` (`chatToFreeform.ts:1033`), masking the substitution.
- Rendering: `_artifact_generation_prompt` (`proxy/app.py:16162-16220`) mandates the stark-white `nxt-` artifact design system (nxt-masthead/nxt-hero/nxt-card...; CSS auto-injected by `_apply_brand_and_anti_slop`) — brand-governed HTML, but NOT the GOLD `nxt-slide` stage frames (rail / 3x3 dot mark / takeaway band) and NOT Figma-live tokens. Corpus floors + RunReceipt at `app.py:17002-17044`; structural auditor + evidence-density precheck inside `_generate_artifact_with_fallback` (`app.py:16581-16654`).
- Expert panel post-pass: `CorpusChatPanel.tsx:7256-7274` (em-dash strip, anti-slop critics) — present, good.

### #strategy — prose misroute

- 'strategy' is a design-desk content tag (`design-desk/services/hashtagParser.ts:28`) but NOT in `DELIVERABLE_TAGS` (`CorpusChatPanel.tsx:6645`) and has NO `ARTIFACT_TPL` entry (`corpusChatService.ts:532-545`) -> `isArtifactGenerationMessage('#strategy ...')` is false -> no slide mode, no Fable force-route. It reaches `sendChatMessage` as plain prose with the `strategy-author` skill loaded via `HASHTAG_TO_SKILL_ID` (`corpusChatService.ts:2012`) and chat-level manifest grounding. The `_genToKind['#strategy']` map at `CorpusChatPanel.tsx:5819-5825` is reachable only from the HTML-directive gate, whose parser list (5666-5678) does NOT include a #strategy parser — dead mapping.

### #brief #report #explainer #whitepaper (+#playground #approaches) — HTML-directive gate

- Gate: `CorpusChatPanel.tsx:5663-5684` — `parseBriefDirective/parseExplainerDirective/parseReportDirective/parsePlaygroundDirective/parseApproachesDirective/parseWhitepaperDirective` (built in `services/hashtagParser.ts:274-296`).
- Model: `CorpusChatPanel.tsx:5840-5868` — `emitDeliverable({model_id:'claude-fable-5'...})` wrapping `callWithModelChain({preferModel:'claude-fable-5'})`; anthropic body at 5857-5858. **Fable honored.** (The in-chat status text still says "Calling Gemini 3.1 Pro (max thinking)" at 5690/5807 — stale label, cosmetic.)
- Grounding: `CorpusChatPanel.tsx:5707-5731` — objective-keyed `fetchWikiArticles` (40 articles, 90KB) with `corpusText.slice(0,60000)` fallback; plus `loadGenerationContext` framework/anti-pattern/portfolio injection at 5777-5796; skills `verbalized-sampling` + `html-deliverable-composer` at 5695-5698. **No manifest-chunk retrieval** — violates the manifest standing rule for this family.
- Rendering: HTML body saved via `saveArtifact` -> `/api/artifact/view` brand wrapper (NXT/NU CSS, print stylesheet, Copy-as-prompt). `#slides` co-typed triggers the GOLD editable PPTX export `exportGoldPptx` -> `/api/gold/export-pptx` (`CorpusChatPanel.tsx:5934-5947`). So: brand-compliant, GOLD only on export, never the nxt-slide stage frames inline.
- Depth floor + expand retry: `CorpusChatPanel.tsx:5877-5894`.

### #proto

- Gate: `CorpusChatPanel.tsx:6003` (singular; `#prototypes` library list at 5971). Two-phase: Phase A VS brief generator (5 briefs), Phase B build pipeline Stages 2-5 (`services/prototypeBriefGenerator.ts`, `services/prototypeBuilder.ts`).
- Model: multi-stage, Gemini 3.1 Pro primary with Opus 4.8 / GPT-5.5 runtime inference endpoints baked into the prototype (`prototypeBuilder.ts:845,860,872`). Not Fable (no directive claims it should be).
- Grounding: AI-patterns catalog (`hic-workspace/wiki/inspiration-hub/ai-patterns/`) + uploads + session context per `experience-prototype-composer` / `design-exemplar-curator` skills. No MCR.
- Rendering: self-contained React/JSX prototype HTML with brand palettes (`prototypeBuilder.ts:207`) — its own contract, GOLD not applicable.

### #presentation

- Gate: `CorpusChatPanel.tsx:6377-6384` -> `parsePresentationDirective` (`services/hashtagParser.ts:157-204`).
- Model: `parseModel` default `gemini-3.5-flash` (`hashtagParser.ts:125-149`; only Gemini/DeepSeek aliases accepted — "Claude / Opus aliases removed", line 20-21); composer loop default `gemini-3.5-flash` (`services/narrativeComposer.ts:757-760`), failover single-shot `claude-sonnet-4-6` (`narrativeComposer.ts:205`). **Not Fable** — the stale comment at `CorpusChatPanel.tsx:6380` still says "Opus 4.7 by default".
- Grounding: executor built from in-memory chat context (themes/personas/deliverables, `CorpusChatPanel.tsx:6399-6414`) + last-12-turn chat history as PRIMARY in package mode (6435-6441); `search_corpus` tool FORBIDDEN in package mode (`narrativeComposer.ts:419`). No MCR.
- Rendering: `PresentationPayload` -> presentation-renderer :5014 + brand-styled `presentationToPptx` deck export (`CorpusChatPanel.tsx:6570-6590`). Not GOLD slide templates.

### #mindmap #meta-themes (and #brief-dialog / #deep-research, same class) — DEAD GATE

- Content tags exist (`design-desk/services/hashtagParser.ts:30`), dedicated builders exist (`buildMindMap`/`buildMetaThemes`/`generateBriefDialog`/`buildResearchPlan`, dispatched at `CorpusChatPanel.tsx:6935-6997`), BUT that dispatch lives inside `if (UPLIFT_KINDS.has(tag))` (`CorpusChatPanel.tsx:6928`) which is inside `if (allDeliverable)` — and `DELIVERABLE_TAGS` (6645) does not contain `mindmap`/`meta-themes`/`brief-dialog`/`research-plan`. `parsed.content.every(...)` is therefore FALSE for any message carrying these tags -> the entire branch is unreachable. Solo `#mindmap` falls through to plain prose chat (it has no `ARTIFACT_TPL` entry either). `UPLIFT_KINDS` defined at `CorpusChatPanel.tsx:132-134`.
- Net: `#mindmap`/`#meta-themes` produce a markdown chat answer on the picker model; the d3 mind-map renderer, portfolio-pattern engine, and expert panel for these kinds never fire from the Analyst chat.

### #refine — NO HANDLER

- `parseRefineDirective` is implemented (`services/hashtagParser.ts:314-324`), registered (`services/hashtagRegistry.ts:501-515`), imported (`CorpusChatPanel.tsx:81`) — and **never invoked anywhere in the repo** (grep: single hit = the import line). The artifact-ready message even advertises it ("Run `#refine <slug>: <tweak>`", `CorpusChatPanel.tsx:5912`). A `#refine ...` message falls to plain prose chat with no artifact targeting. (`/api/artifact/revise` exists on the proxy at `app.py:17183` and is reachable only via the design-desk revision path in `chatToFreeform.ts:988-996`.)

### #help

- Gate: `CorpusChatPanel.tsx:5518-5633` — renders the directive registry (`hashtagRegistry.ts` DIRECTIVES) into a deterministic NXT-branded HTML guide, persisted via `saveArtifact` (5605-5612). No LLM, no grounding needed. Compliant for its purpose.

### Misc verified

- Chunked slide-deck diversion is OFF: `services/slideDeckChunker.ts:310-321` (`shouldChunkSlideRequest` hard-returns false) — `#slides` requests reliably take the Fable slide-mode path.
- Wiki RAG pre-fetch suppressed for artifact messages: `corpusChatService.ts:2782-2789`.
- Evidence-density pre-check (upstream remediation preamble): `corpusChatService.ts:2609-2642`.

---

## (d) The 5 worst compliance gaps, ranked

1. **Fable force-route silently dropped for #org #arch #roadmap #prd #gap #compete.** `CorpusChatPanel.tsx:7248` passes `model: 'claude-fable-5'`, but `chatToFreeform.ts:997-1004` builds the `/api/artifact/generate` body WITHOUT `llm_model`, so `proxy/app.py:16961` defaults to `claude-sonnet-4-6`, and the chains at `app.py:16428-16442` contain no Fable at all. Six of the directive's hashtags run a different model than directed, and the chat label masks it. (The 2026-06-12 directive is honored only on the sendChatMessage + callWithModelChain paths.)

2. **ONE-ENGINE drift: the same 6 hashtags still bypass sendChatMessage slide-mode.** `DELIVERABLE_TAGS` (`CorpusChatPanel.tsx:6645`) keeps org/arch/roadmap/prd/gap/compete on the proxy artifact engine — no GOLD nxt-slide frames, no Figma-live tokens, no `:::slide` export parity — while `ARTIFACT_TPL` (`corpusChatService.ts:537-544`) already defines their slide templates (`gap-matrix`, `competitive-matrix`, `prd-feature`, `timeline`, `architecture-map`). Only journey/blueprint were migrated per `feedback_all_deliverables_one_engine` ("ALL deliverables", standing rule, no exceptions).

3. **#mindmap / #meta-themes (and #brief-dialog / #deep-research) are dead directives.** The UPLIFT_KINDS dispatch (`CorpusChatPanel.tsx:6928`) is unreachable because the gating `allDeliverable` check excludes those tags (6645, 6661-6663). Registered, documented in #help, autocompleted — and they produce plain prose on the picker model. The dedicated builders never fire.

4. **#refine has no dispatcher.** Imported at `CorpusChatPanel.tsx:81`, advertised at 5912 and in the registry, never called. The promised round-trip ("Copy-as-prompt emits #refine prompts") dead-ends in plain chat.

5. **The HTML-directive family + full-form #recommendations are RAG-grounded, not manifest-grounded.** `#brief/#report/#explainer/#whitepaper` (`CorpusChatPanel.tsx:5707-5731`) and `#recommendations` (5163-5184) inject objective-keyed `fetchWikiArticles` blobs with raw-corpus fallback — exactly the pattern the standing rule (`feedback_deliverables_manifest_wiki_not_rag`) names as the root of hollow deliverables. Adjacent: `#strategy` and the `#recs`-vs-`#recommendations` fork route the same deliverable family through two (or zero) engines.

---

## (e) 5 candidate improvements (effort S/M/L)

1. **(S) Carry Fable over the artifact-engine wire.** Add `llm_model: args.model` to the `chatToFreeform.ts:997` request body, and add `claude-fable-5` to `_ARTIFACT_MODEL_CHAINS` heads (or honor `preferred` for it — `_resolve_artifact_chain` already promotes `preferred` at `app.py:16471-16472`, and `model_registry.py:26` already knows the ID). Two-line SPA change + one-line proxy chain change; immediately restores the directive for 6 hashtags even before the one-engine migration lands.

2. **(M) Finish the ONE-ENGINE migration.** Delete org/arch/roadmap/prd/gap/compete from `DELIVERABLE_TAGS` (`CorpusChatPanel.tsx:6645`) so they fall through to sendChatMessage slide-mode the way journey/blueprint now do (MCR + GOLD + Fable by construction). Prereqs: confirm slide-template fidelity per kind (all exist except an org-chart template — either add one to `types.ts`/`web.tsx`/`slideToStageHtml.ts` or keep #org on the artifact engine last); then delete the dead JM branch (7074-7231) and the now-dead manifest-assembly block in the panel.

3. **(S) Resurrect the uplift kinds.** Hoist the UPLIFT_KINDS dispatch out of the `allDeliverable` gate into its own early gate (mirror the #presentation gate at 6377): `if (parsed.content.some(c => UPLIFT_KINDS.has(c)))` -> run the existing 6935-6997 logic. No new code paths — just reachable ones.

4. **(M) Implement #refine dispatch.** Early gate calling `parseRefineDirective` (`hashtagParser.ts:314`); look up the slug across the three libraries (artifacts via `listArtifacts`, prototypes, presentations), then route: HTML artifacts -> `/api/artifact/revise` (already live, `app.py:17183`), prototypes -> the existing Edit pipeline, slide decks -> slide-mode re-ask with the prior `:::slide` JSON anchored. Honor Fable on the revise path (same fix as item 1).

5. **(M) Manifest-chunk grounding for the RAG holdouts.** Replace the `fetchWikiArticles` blocks in the #recommendations gate (5163-5184) and the HTML-directive gate (5707-5731) with the exact `pickChunksForPrompt` + `resolveChunks` + `chunkCitationInstructions` pattern already proven at `CorpusChatPanel.tsx:6735-6766` (keep objective-keyed retrieval as the labeled supplementary tier, same as that block). Bonus in the same files: add `#strategy` to `ARTIFACT_TPL` (template: `principles` or `theme-arc`) and retire the `#recommendations`/#recs engine fork by letting the full form fall through to slide-mode when `#slide/#slides` is present.
