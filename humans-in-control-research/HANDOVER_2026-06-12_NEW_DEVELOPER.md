# HiC Developer Handover — 2026-06-12

Audience: a new developer joining the Humans in Control (HiC) workstream cold.
Everything below is current as of 2026-06-12. Two work items are IN FLIGHT and
documented with exact next steps: (1) the model swap to Claude Fable 5 for
hashtag deliverable generation, and (2) a P0 stale-bundle fix in vite.config.
Read this top to bottom once, then use it as a reference.

---

## 1. What HiC is

Humans in Control Research is a three-tier research workbench that turns a
client brief + uploaded documents + ~200 external research articles into
consulting-grade deliverables: strategy decks, persona sets, journey maps,
service blueprints, competitive analyses, PRDs, roadmaps, gap analyses, tech
audits, and slide presentations. Branded output ships in two design systems:
NXT Humans and Northeastern (NU).

```
React 18 SPA  (Docker: hic-research, port 5011; nginx serving a static Vite dist)
   |  fetch()
   v
FastAPI proxy (Docker: research-proxy, port 5012; proxy/app.py ~16K lines)
   |  /api/ai/{gemini,anthropic,openai,deepseek}  - provider fan-out
   |  /api/search/*           - 200+ external sources
   |  /api/wiki/*             - knowledge-base read/write/chunk/embed
   |  /api/gold/export-pptx*  - Playwright-driven native PPTX export
   v
hic-workspace/  (persistent knowledge layer, volume-mounted)
   wiki/        - LLM-maintained markdown KB (manifest-chunked, see section 6)
   sources/     - raw uploads
   sessions/    - per-run state: chat.json, corpus, traces, rollouts
```

Critical operational facts (these bite people):
- **No HMR in Docker.** Every frontend edit requires
  `docker compose -f ../docker-compose-all.yml up -d --build research-generator`
  then a hard refresh. Port 3000 belongs to a DIFFERENT app (Social Research).
  HiC is :5011 (SPA) and :5012 (proxy).
- **`vite build` does NOT type-check.** `npm run typecheck` (tsc --noEmit) is a
  mandatory gate before claiming anything works. Crash-class ReferenceErrors
  have shipped through "build exit 0" twice.
- **Never merge to main; never commit without Jonathan's explicit approval.**
  Build, then he tests, then commit. The working tree is intentionally dirty.
- **Flat project structure** — no `src/`; components/ and services/ sit at the
  repo subfolder root (`humans-in-control-research/`).
- Companion docs: repo-root `CLAUDE.md` (platform), `.claude/CLAUDE.md`
  (output-quality law: citation protocol, 350+ banned phrases, Quantitative
  Claim Rule, em-dash hard ban), `humans-in-control-research/CLAUDE.md`
  (HiC-specific). `hic-workspace/AGENTS.md` is the wiki schema.

---

## 2. IN FLIGHT: model swap to Claude Fable 5 (your first task)

### Target routing (Jonathan's directive, 2026-06-12)
| Surface | Trigger | Model |
|---|---|---|
| Analyst Desk chat, basic reply (no artifact hashtag) | plain prompt | `gemini-3.5-flash` |
| Analyst Desk chat, deliverable generation | any artifact hashtag (`#slides`, `#journey`, `#personas`, `#themes`, `#recs`, `#prd`, `#gap`, `#blueprint`, `#competitive`, `#case-study`, `#roadmap`, `#audit`, `#arch`) | `claude-fable-5` |
| Designer chat (Design Desk), artifact generate + revise | content hashtags (`#persona` `#journey` `#org` ...) and revision turns on an active artifact | `claude-fable-5` |
| Designer chat critics (expert panel) | automatic | unchanged (Sonnet 4.6 / Opus 4.8 / Haiku 4.5 via criticDispatcher) |

`claude-fable-5` is live on the Anthropic API; it is a standard Messages API
model string — every parameter and SDK pattern works unchanged. Two facts to
respect: (a) its context window / max-output caps are NOT yet verified — use
conservative values and comment them as unverified; (b) official pricing is
NOT yet verified — costMeter entries must be flagged as placeholders.

### Where everything lives (already mapped, line numbers verified 2026-06-12)

**Analyst chat — `services/corpusChatService.ts`:**
- `ChatModel` union: line ~51. Currently
  `'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'deepseek-v4-flash' | 'deepseek-v4-pro' | 'gpt-5.5' | 'council'`.
  Add `'claude-fable-5'`.
- `AVAILABLE_MODELS: ModelConfig[]`: ~line 440. Add an entry with
  `provider: 'anthropic'`, `available: !!(process.env.ANTHROPIC_API_KEY)`,
  conservative `maxCorpusChars: 600_000` (~150K tokens) until the real window
  is verified.
- **Slide-mode gate**: ~lines 3180-3200. `ARTIFACT_TPL` regex table maps each
  hashtag to its slide template; `slideModeActive = /#slides?\b/i.test(msg) || artifactTplHit`.
  THIS is the fork point: when `slideModeActive` is true (and model is not
  'council'), override `activeModelId`/`modelConfig` to `claude-fable-5`
  (guard on ANTHROPIC_API_KEY availability; warn + keep current model if
  absent). Log loudly which model is generating.
- **Provider dispatch**: ~line 3239 (`modelConfig.provider === 'google' | 'deepseek' | 'openai'`,
  with a dead `else` that currently falls back to Gemini for 'anthropic').
  Implement `callClaude(system, userMsg, history, model)` and route
  `provider === 'anthropic'` to it.
- **Reference implementation for callClaude**: `_finalizeChatViaClaude`
  (~line 3732) already does the full translation: system goes in the
  top-level `system` field; history merges into alternating user/assistant
  turns (first message must be 'user'); call via
  `callAIWithRetry('anthropic', { model, max_tokens, system, messages, temperature }, ...)`
  from `services/aiRetryClient.ts`, which posts to the proxy
  `/api/ai/anthropic` (the proxy attaches the key server-side). Copy that
  pattern; set `max_tokens: 32000` for 10-slide decks (comment: cap
  unverified for fable-5; lower if the API 400s).
- **RI fence enforcement re-ask** (~line 3256): the anchored re-ask when slide
  mode produced no `:::slide` fence currently branches google/deepseek/openai.
  Add the anthropic branch or the re-ask will silently no-op for Fable.
- **Basic-chat default**: find where the chat panel's default model state is
  initialized (CorpusChatPanel model picker state; grep `useState` near the
  model picker, and any localStorage default). Set the DEFAULT to
  `gemini-3.5-flash`. Respect the user's picker choice for non-hashtag chat —
  only the hashtag path force-routes to Fable.

**Designer chat — `design-desk/DesignDeskChat.tsx`:**
- Generation/revision call sites at lines ~332, ~376, ~425 pass
  `model: 'gemini-3.1-pro-preview'` into:
  - `generateSlideSpec` (`design-desk/services/chatToSlideSpec.ts`) —
    `SlideSpecModel` union at line ~33, default `'deepseek-v4-flash'` at
    line ~304. Provider dispatch inside calls Gemini SDK directly or
    `/api/ai/deepseek` (line ~59-84). **It has NO anthropic branch.**
  - `generateFreeformArtifact` (`design-desk/services/chatToFreeform.ts`) —
    `FreeformGenerationModel` union; same structure, `callDeepSeek` at ~105,
    Gemini path nearby. **Also no anthropic branch.**
- Work needed: add `'claude-fable-5'` to both unions; add a Claude branch in
  each service (same `_finalizeChatViaClaude`-style proxy call; these are
  single-shot JSON/HTML generators, no tool loop needed); swap the three
  DesignDeskChat call sites to `model: 'claude-fable-5'`.
- The persona "legacy structured pipeline" branch in DesignDeskChat routes
  elsewhere — trace it when you touch it (likely geminiService personas; the
  scope here is the Designer chat surface, so swap it where the Designer
  dispatches, not the staged engine).

**Platform registration (required, not optional):**
- `services/aiRouter.ts` — the single source of truth for model IDs (standing
  rule: never hardcode model IDs at call sites without registering here).
  Add `'claude-fable-5'` to `MODEL_REGISTRY` (~line 380; provider
  'anthropic', costTier 'premium', conservative `maxContext: 200_000`,
  `maxOutput: 32_000`, comment both as unverified). The chat surfaces use
  their own AVAILABLE_MODELS, but the registry keeps health-routing and the
  model picker coherent.
- `services/costMeter.ts` — add a `claude-fable-5` pricing entry. Official
  pricing unverified; use Opus 4.8 rates ($5/$25 per 1M) as an explicit
  placeholder with a `// PLACEHOLDER pricing - verify` comment.
- Proxy `proxy/app.py` `/api/ai/anthropic` — pass-through on model string;
  verify no allowlist blocks `claude-fable-5` (search for the endpoint; the
  existing Sonnet/Opus calls go through it fine). Optionally add the ID to
  `model_registry.assert_startup` (~line 11765) so a vendor sunset alarms at
  boot.

**Known adjacent defect (flag, fix while in there if trivial):** the proxy
logged a raw API key once via httpx —
`POST .../models/gemini-2.5-flash:generateContent?key=AIza...` — meaning some
proxy code path still (a) pins the retired `gemini-2.5-flash` (default at
`proxy/app.py:8461` among others) and (b) puts the key in the URL query
instead of the header. There is already a redaction module + a comment at
app.py:62-69/119 banning `?key=`; one call site escaped it. Grep
`gemini-2.5-flash` and `?key=` in proxy/app.py, route the model through the
canonical id and the key through the header.

### Verification protocol for the swap (do all of it)
1. `npm run typecheck` → zero errors.
2. `npm run test` → 79+ tests pass.
3. `npm run build` → then Docker rebuild research-generator (+ research-proxy
   if app.py touched).
4. Browser-load :5011 via Playwright MCP — zero console errors (standing
   rule: curl/build success is NOT verification).
5. Live test: in Analyst chat send a plain question → confirm the console
   logs Gemini 3.5 Flash; send `#themes #slides #NU ...` → confirm the
   console logs the Fable 5 route and `:::slide` fences render.
6. Designer chat: `#persona ...` generate + a revision turn → confirm Fable.
7. Pre-claim checklist in your report (Build / Browser load / Flow exercised /
   Output inspected) — mandatory format, no "shipped + verified" without it.
8. Register: append a learned constraint to
   `wiki/synthesis/learned-constraints.md` via
   `POST :5012/api/wiki/append` describing the routing; note it in a plan
   file under `plans/`.

---

## 3. P0 OPEN BUG — stale-bundle "dual app boot" (fix BEFORE or WITH the swap)

**Symptom (reproduced live 2026-06-12):** a tab held open across a Docker
rebuild silently "reloads to the landing page" mid-chat-run. No error shown.

**Root cause (fully diagnosed, console-confirmed):**
`vite.config.ts` line ~132 sets `chunkFileNames: 'assets/chunks/[name].js'` —
chunk files are NOT content-hashed (a 2026-05-12 decision meant to let open
tabs survive rebuilds). nginx serves `/assets/chunks/` with
`max-age=300, must-revalidate`. So an OLD entry bundle revalidates a chunk
after a rebuild and receives the NEW build's chunk content. New chunks
statically import the NEW hashed entry (`/assets/index-<newhash>.js`), so the
old page pulls in and EXECUTES the entire new bundle: a second React app
mounts at #root (console shows every boot log twice and one stack trace
spanning both `index-DrdRLMb9.js` and `index-VMiQd15S.js`), and the fresh
mount renders the landing screen over the user's in-flight session. Neither
the ChunkLoadGuard (`services/chunkLoadGuard.ts` — only fires on
chunk-load-shaped errors, never auto-reloads) nor the AppErrorBoundary
(render errors only) can catch it, because nothing "fails": valid JS loads.

**The fix (one line + comment hygiene):**
```ts
// vite.config.ts rollupOptions.output
chunkFileNames: 'assets/chunks/[name]-[hash].js',
```
Rewrite the stale comment block above it (lines ~104-119): the new contract is
"old tabs 404 on changed chunks → ChunkLoadGuard banner (Save Session →
Reload), which is its designed UX; unchanged content keeps the same hash so
nothing breaks needlessly." Optionally flip the nginx `/assets/chunks/`
cache policy to `immutable` (file: the nginx conf copied into the
hic-research image — find via `Dockerfile`) since hashed names are safe; the
existing 300s policy also works.

**Verify:** rebuild, open a tab, rebuild AGAIN with any trivial change, then
trigger a dynamic-import flow (`#proto`, Save Session, export) in the stale
tab → you should see the ChunkLoadGuard banner, NOT a silent landing reset.

Two more findings from that incident, lower priority:
- Gemini 3.5 Flash showed repetition-collapse on theme shards
  (`"100100100..." x66`); the harness already recovers via GPT-5.5 — known
  model behavior, the swap to Fable for deliverables sidesteps it on the
  chat surface.
- The #slides run burned all 5 tool-loop iterations on `fetch_wiki_articles`
  without finalizing ("Gemini iteration cap 5 reached"). After the Fable
  swap, watch whether the cap still gets exhausted; if so, force a final
  no-tools synthesis call after the cap (the empty-response guard at
  ~line 4276 is the place).

---

## 4. The hashtag generation pipeline (ONE ENGINE — no exceptions)

Every artifact hashtag in Analyst chat flows through one engine
(standing constraint `[all/deliverables-one-engine]`):

```
user types "#journey ... #NU"  (or #slides, #personas, #themes, ...)
  -> corpusChatService.sendChatMessage
       - ARTIFACT_TPL maps hashtag -> slide template id (~line 3185)
       - slideModeActive forces the SLIDE OUTPUT PROTOCOL into the system
         prompt: :::slide fenced JSON blocks, action titles, citation rules,
         DECOMPOSITION RULE (payloads over per-template ceilings split into
         overview + continuation slides), DENSE PAYLOAD FIELDS (when corpus
         supports them: additionalQuotes/synthesis, behaviors/winConditions,
         4-6 supportingActions, impactCards...), SLIDE-SYSTEM VARIANTS
         (thesis divider, diptych, rowsProse evidence table, impactCards
         role-block, role-grid timeline)
       - manifest-chunk retrieval injects evidence (MCR pack, ~30K tokens,
         see section 6); NEVER bulk-RAG rawSources (banned anti-pattern)
       - RI (reinforcement inference) anchored re-ask if the model answers
         in prose instead of fences
  -> CorpusChatPanel.parseSlideBlocks parses fences -> SlideData[]
       - services/slidePaginator.ts (W0) deterministically decomposes
         payloads over ceilings (never drops evidenced items)
  -> PREVIEW: components/slideTemplates/goldPreviews.tsx + web.tsx
       (960x540 GoldFrame twins; persona/divider variants in web.tsx)
  -> EXPORT: services/slideToStageHtml.ts emits a 1920x1080 #stage HTML doc
       per slide -> proxy /api/gold/export-pptx-multi -> Playwright MEASURE
       (Range-based text runs) + GEO (rect walk) -> python-pptx NATIVE
       editable shapes (proxy/gold_pptx_export.py). pptx.ts is legacy.
```

**Twin-sync law:** any change to a slide template touches THREE renderers
that must stay in sync — `goldPreviews.tsx`/`web.tsx` (preview),
`slideToStageHtml.ts` (export stage), and the Figma GOLD exemplar (the
design source of truth). `npm run check:templates` checks web/pptx template
set parity. Preview must match export pixel-logic; "preview clean, export
broken" is the most-reported failure class in this project's history.

**Density discipline:** `density: base|dense` raises per-template item
ceilings (DENSITY_SPEC in `components/slideTemplates/types.ts`). Dense
ROUTING predicates evaluate the RAW payload arrays BEFORE any cap slice
(capping first silently dropped a 4th evidenced action once — never again).
Over-dense payloads decompose via the paginator; renderers never shrink type
below the exemplar scale (the old tightS/tightR shrink heuristics are
deleted).

**Layout gotchas that are now law** (in learned-constraints, enforced):
- Bebas/Lora display numerals + quote marks: `line-height: normal` (fixed
  line-heights under ~1.33 self-overflow the glyph box).
- Stage twins NEVER rely on CSS clamp/overflow to bound text — server-side
  `trunc()` budgets, because the export MEASURE reads full textContent.
- SOLID fills only (washHex pre-blend); DrawingML `<a:alpha>` is OPACITY;
  spPr child order fill-before-ln; `<p:style>` stripped (theme-blue class).
- PPTX renders Archivo wider than the browser: native rebuilds carry ~8%
  tighter line-spacing + wrap slack per slot.

**Designer chat (Design Desk)** is a separate surface for generating and
revising single artifacts (`#persona #journey #org #roadmap #blueprint
#arch`) as freeform HTML / SlideSpec artifacts with live preview and an
expert-critic panel (`services/artifactExpertPanel.ts` +
`criticDispatcher.ts` — critics run Claude Sonnet/Opus/Haiku already). Its
generators are `design-desk/services/chatToFreeform.ts` and
`chatToSlideSpec.ts` (see section 2 for the swap work there).

---

## 5. The Figma design systems (source of truth for ALL visual patterns)

Two live Figma files, edited via the Figma MCP (`mcp__figma__use_figma`
with the `figma-use` skill loaded — MANDATORY before any use_figma call):

| Brand | File | Link | Variable collection |
|---|---|---|---|
| NXT Humans | `iSQhAVM7SI4QHAWB7y9C2z` | https://www.figma.com/design/iSQhAVM7SI4QHAWB7y9C2z/NXT-Humans | `VariableCollectionId:221:2` |
| Northeastern (NU) | `z2v9Pvhg23hlljEitPBdAt` | https://www.figma.com/design/z2v9Pvhg23hlljEitPBdAt/Northeastern | `VariableCollectionId:95:2` |

Key node anchors (full registry: `hic-workspace/wiki/brand/figma-node-map.md`):
- Design-system token pages: NXT 223:2, NU 97:2.
- GOLD artifact exemplar pages: one page per deliverable per brand, named
  `GOLD · <artifact> (nxt|nu)` (case-study, journey, blueprint, themes,
  recommendation, gap, prd, persona, competitive, org, presentation, proto,
  mindmap, meta-themes, brief, explainer + the DENSE variants).
- **Slides-system pages** (the #slide/#slides presentation language, distinct
  chrome from the artifact GOLD shell): NU `GOLD · slides (nu)` page
  **103:2** (https://www.figma.com/design/z2v9Pvhg23hlljEitPBdAt/Northeastern?node-id=103-2),
  NXT `GOLD · slides (nxt)` page **324:2**
  (https://www.figma.com/design/iSQhAVM7SI4QHAWB7y9C2z/NXT-Humans?node-id=324-2).
  14 archetypes per brand: cover, agenda, section-divider,
  thesis-interstitial, stat-row (MEANS/MATTERS), block-quote +
  corroborating-data panel, numbered-themes, two-tier evidence table,
  problem diptych, org-model three columns, role-block G1/G2/G3, aggregate
  roadmap.

**Building anything new in Figma = the 7-step routine, ordered, never skip:**
1. Education — READ the expert SKILL.md for that artifact
   (`.claude/skills/<artifact>-*/SKILL.md`; map in nxt-humans-slides skill).
2. Inspiration — the gold twin HTML (`wiki/design-system/gold/*.html`) +
   nu-design-gallery.
3. Guardrails — run `.claude/hooks/scripts/validate_ai_slop.py` and
   `validate_self_referential_freeform.py` on every copy string; build only
   on exit 0.
4. Generation — variable-bound fills (`setBoundVariableForPaint`, resolve
   variables BY NAME from the collections above), auto-layout for any matrix
   that can grow rows/columns (absolute x/y matrix cells are banned).
5. Review — in-call screenshot + collision/clip audit; fix to zero.
6. Dual-brand — build in BOTH files, NXT tokens (ink 0D0D0D, chartreuse
   B8B800, cyan kickers, Bebas Neue/Archivo/IBM Plex Mono) and NU tokens
   (ink 141414/0E1626, red C8102E, Lora + Archivo).
7. Wiki/manifest + self-improvement — register frames in
   `brand/figma-node-map.md`, re-chunk, record learned constraints.

---

## 6. Manifest + frontmatter: how design patterns (and all wiki knowledge) are stored and retrieved

> Deep-dive companion: `HANDOVER_2026-06-12_MANIFEST_RETRIEVAL_SYSTEM.md`
> covers this subsystem exhaustively (anti-RAG philosophy, chunker, manifest
> operations, the MCR hot path step by step, citation enforcement,
> write-back loop, failure-mode runbook, extension recipes). This section is
> the summary.

Every wiki page carries machine frontmatter with a `chunks:` block — the
manifest pointer contract:

```yaml
---
id: brand/figma-node-map.md
title: Figma Node Map (design-system files)
type: brand
updated: 2026-06-11
chunks:
  - id: "brand/figma-node-map.md#c10"
    char_span: [11443, 12874]      # span into the post-frontmatter body
    sentence_count: 6
    key_terms: [insight, gold, recommendation, dense, frame, band]
    section: DENSE-LAYOUT PROGRAM W1 (2026-06-11)
    token_count: 405
---
```

- **Writer**: `proxy/wiki_chunker.py` — `chunk_for_manifest(body, source_path)`
  + `upsert_chunks_into_frontmatter(...)`. The proxy chunks at write time
  (`/api/wiki/write` with `chunk: true`, `/api/wiki/write-article`).
  ⚠ History: a regex bug here (`chunks:\s*` eating the newline) corrupted
  8,367 pages with duplicate orphaned chunk blocks; fixed 2026-06-11 with a
  self-healing orphan sweep. If you EVER see duplicate `- id:` lines above a
  `chunks:` key, a writer regressed — check upsert call sites first.
- **Manifest**: `wiki/.manifest.json` (+ journal `.manifest.journal.jsonl`) —
  one record per page with `chunk_count`, type, engagement tags. Rebuild:
  `POST :5012/api/wiki/manifest/rebuild`. Records with `chunk_count > 0` are
  tier-1 retrievable; pointers are `<wikiPath>#c<N>`.
- **Parity gate**: `.claude/hooks/scripts/validate_manifest_chunk_parity.py
  --limit 20000` — manifest chunk_count vs actual frontmatter per page. Run
  weekly and after any bulk wiki operation. Current state: 0 mismatches /
  ~9,781 records. Counting rule baked into both the proxy and the hook:
  count ONLY pointer-shaped ids INSIDE the frontmatter (never naive `- id:`
  greps — bodies quote pointers).
- **Retrieval at generation time**: the chat engine unions the
  manifest catalog (≈9K+ chunk pointers), pre-ranks by key_terms/goal,
  MMR-packs ~30K tokens of chunks into the prompt (`[chunkRetrieval]` /
  `[MCR]` console lines). Design-pattern knowledge rides the same rails:
  `assembleDesignSystem` pulls `brand/figma-node-map.md` + brand pages via
  their manifest chunks, which is how the model knows which Figma frames and
  layout anatomies exist. **Law: deliverables ground via manifest chunk
  pointers, never bulk-RAG-injection of rawSources** — RAG injection is the
  documented root cause of hollow deliverables.
- Cited pointers in model output (`[articles/x.md#c12]`) resolve to named
  sources at render time via `services/citationPointerRegistry.ts`. Raw
  pointers must never reach the user.

---

## 7. Self-improvement loop (user feedback → constraints → skills)

Three reinforcement layers, all operational:

1. **Learned constraints** — `wiki/synthesis/learned-constraints.md`.
   Appended via `POST :5012/api/wiki/append` whenever a durable lesson lands
   (user corrections weigh heaviest). A UserPromptSubmit hook injects the
   deduped constraint set into every Claude Code session, and the chat
   engine injects them into generation prompts (`27 constraints active` on
   the app's landing strip). When you fix a failure class, REGISTER IT HERE
   — that is what makes the fix durable.
2. **In-run feedback** — checkpoint edits are logged (5+ similar edits
   auto-approve a constraint); `services/chatFeedbackExtractor.ts` harvests
   analyst-chat corrections and `#refine` turns; Design Desk edits
   accumulate in `hic-workspace/sessions/`. RI (reinforcement inference,
   `.claude/skills/reinforcement-inference/`) gives the chat a second
   anchored pass when uncertainty signals fire (e.g. slide-fence violations).
3. **SkillOpt** — session rollouts train the skill library:
   `npm run skillopt:extract` → `npm run skillopt:build-training` →
   `bash scripts/skillopt-batch.sh --auto-promote`. Promotion is GATED
   (structural integrity + hygiene non-regression + failure-pattern
   coverage). NEVER bypass the validation gate. Re-run the batch after
   meaningful feedback accumulates (a rerun is pending after the recent
   dense-layout + slides-system work).

---

## 8. Tactical next steps, in order

1. **P0 — ship the vite chunk-hash fix** (section 3). One line + comments +
   rebuild + the stale-tab verification dance. This kills the silent
   landing-page reset class permanently.
2. **Model swap** (section 2): corpusChatService (union, registry entry,
   slide-mode force-route, callClaude, RI branch, basic-chat default to
   gemini-3.5-flash) → design-desk generators (unions + anthropic branches +
   three call sites) → aiRouter + costMeter registration → proxy check.
   Full verification protocol, then register the constraint + plan file.
3. **While in the proxy**: fix the `gemini-2.5-flash` + `?key=` call site
   (section 2, "known adjacent defect").
4. **Watch the iteration-cap behavior** on the first live Fable #slides run;
   add the post-cap forced finalize if it still exhausts (section 3, last
   bullet).
5. **Pending backlog** (pre-existing, do not start without Jonathan):
   tasks #23-25 (remaining uncovered-artifact exemplars + pattern pages +
   stage twins), W5 SkillOpt rerun, journey-phase-spotlight + theme-index
   code twins, NU_Giving deck owner-call items (listed in
   `plans/nu-giving-slides-uplift-2026-06-11.md`).

Recent context you'll see referenced: `plans/dense-layout-program-2026-06-11.md`
(density ladder: base → dense structural layouts → auto-pagination),
`plans/nu-giving-slides-uplift-2026-06-11.md` (the deck uplift + slides
design system + #slides variant wiring), and the wiki-chunk corruption RCA
in both. The deliverable proof artifacts live in Jonathan's Downloads
(`NU_Giving_Findings_UPLIFTED.pptx`, `HiC-W2-dense-layouts_12-slides_both-brands.pptx`).

Welcome aboard. When in doubt: read the learned constraints, trace all six
layers (wiki read / manifest persist / skill / hook / subagent /
self-improvement) before proposing anything, and never claim "verified"
without the four-row pre-claim checklist.
