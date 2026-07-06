# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **THE VISION (read FIRST, successors)**: HiC is an **objective-first, manifest-native, evidence-cited,
> design-system-governed Artifact Factory for consulting intelligence augmentation** — every run emits a
> durable **Artifact Intermediate Representation (AIR)**, not just a prompt result, and the eight Unified
> Vision principles bind at NINE workflow phases. Before ANY non-trivial pipeline, retrieval, routing,
> design-system, export, or self-improvement work, read: the **`hic-unified-vision`** skill
> (`../.claude/skills/hic-unified-vision/SKILL.md`, the nine-phase contract + AIR backbone), the integrated
> plan **[plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md](plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md)**,
> and **[../.claude/UNIFIED_VISION.md](../.claude/UNIFIED_VISION.md)**. Name the phase(s) your change advances.

> **Active work plans**: check [plans/](plans/) before starting any non-trivial work — dated files, most recent first. There is usually already a plan to extend rather than duplicate. (Historical handoff: [HANDOFF_2026_05_14_COST_AND_T4.md](HANDOFF_2026_05_14_COST_AND_T4.md) covers the 2026-05-14 cost/T4 iteration.)

> **Read first**: the repo root [CLAUDE.md](../CLAUDE.md) (Docker platform topology, port map, cross-service context) and [.claude/CLAUDE.md](../.claude/CLAUDE.md) (NXT design system, citation protocol, 350+ banned phrases, consulting frameworks). This file covers only what is unique to `humans-in-control-research/`.

## Architecture at a Glance

HiC is a **three-tier research workbench** that turns a client brief + uploads into consulting-grade deliverables (personas, strategy deck, service blueprint, PRD, roadmap, tech architecture, gap analysis, tech audit, competitive analysis, heuristic UX report).

```
React SPA (Vite, port 3000 dev / 5011 prod nginx)
    │  fetch()
    ▼
Research Proxy (FastAPI, port 5012, proxy/app.py — ~16,000 lines)
    ├── /api/ai/{anthropic,gemini,openai}   — provider fan-out (CORS-safe)
    ├── /api/search/{source_id}             — 200+ sources, 8 connector types
    ├── /api/wiki/*                         — read/write/embed/fetch-articles (RAG)
    ├── /api/extract-pdf, /api/parse-upload — client-upload ingestion
    └── /api/transcribe-youtube             — yt-dlp + OpenAI Whisper
    │
    ▼
External sources (OpenAlex, Crossref, Semantic Scholar, RSS, CKAN, Socrata, arXiv, Reddit, YouTube...)
+ hic-workspace/wiki/ (persistent, LLM-maintained knowledge layer)
```

**No `src/` directory.** Components, services, and hooks live at the project root. This is intentional — Vite's default resolve is `./` and `@` alias points to `.` ([vite.config.ts:70](vite.config.ts#L70)).

### Three concentric knowledge layers (see [hic-workspace/AGENTS.md](hic-workspace/AGENTS.md))

1. **`hic-workspace/sources/`** — raw, immutable source docs (client uploads + research files).
2. **`hic-workspace/wiki/`** — LLM-maintained markdown knowledge base: `frameworks/`, `benchmarks/`, `anti-patterns/`, `exemplars/`, `evidence/`, `industries/`, `brand/`, `engagements/`, `synthesis/`, plus `articles/` (ingested external research, embedding-indexed for semantic retrieval) and `sources/` (source summaries). **`index.md` is the primary navigation target before any retrieval.**
3. **`hic-workspace/AGENTS.md`** — the schema. Co-evolves with the wiki. Read this before any wiki read/write — it defines page types, frontmatter, ingest/generate/lint operations, and the quality rubric.

The wiki is served two ways: in dev via a custom Vite middleware plugin ([vite.config.ts:12-45](vite.config.ts#L12-L45)), in Docker via nginx static files copied at build time ([Dockerfile:19-25](Dockerfile#L19-L25)). The proxy's `/api/wiki/write*` endpoints write to a Docker volume mount of `wiki/` so container writes persist to the host.

## Essential Commands

### Local dev (recommended over Docker for iteration)

```bash
# Terminal 1 — SPA
cd humans-in-control-research
npm install --legacy-peer-deps     # some deps insist on peer overrides (React 18.3 here)
npm run dev                        # Vite on http://localhost:3000

# Terminal 2 — Proxy (required for all API calls)
cd humans-in-control-research/proxy
python -m venv venv && source venv/Scripts/activate    # Git Bash on Windows
pip install -r requirements.txt
python app.py                      # FastAPI on http://localhost:5012
```

Required env vars in repo-root `.env` (or `humans-in-control-research/.env.local`):
- `GEMINI_API_KEY` (also exposed as `API_KEY` for legacy code paths — see [vite.config.ts:63-66](vite.config.ts#L63-L66))
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `YOUTUBE_API_KEY` (proxy only, for channel discovery scheduler)

### Docker dev — **rebuild required on every frontend change**

The `research-generator` container is nginx serving a pre-built static `dist/` — there is **no HMR**. For any `.tsx`/`.ts`/`.css` edit that must show up inside Docker:

```bash
docker compose -f ../docker-compose-all.yml up -d --build research-generator
# then hard-refresh the browser (Ctrl+Shift+R)
```

The proxy (`research-proxy`, port 5012) is a separate container and rebuilds with `--build research-proxy`.

### Build / typecheck / test

```bash
npm run build              # vite build → dist/ (esbuild — does NOT type-check)
npm run typecheck          # tsc --noEmit — MANDATORY gate before shipping any change
npm run preview            # serve dist/ locally

npm run test               # vitest unit suite (jsdom; design-desk/**/*.test.ts + services/**/*.test.ts)
npx vitest run services/corpusMergeAuthority.test.ts   # single test file
npx vitest run -t "test name pattern"                  # single test by name
npm run test:watch         # watch mode
npm run test:e2e           # services/__e2e__/ — runs REAL generation against live proxy :5012
                           # (multi-minute model calls; requires proxy up + provider keys)
npm run check:templates    # slide-template parity: web.tsx ↔ pptx.ts must define the same set
```

**`vite build` succeeding proves nothing about types** — esbuild strips TS without checking it. Two crash-class `ReferenceError`s shipped this way; always run `npm run typecheck` before claiming a change works. Unit tests cover the design-desk schemas/store and a few services; full validation still means running the pipeline end-to-end against a real brief + upload and inspecting the generated deliverable and `wiki/log.md` entries.

## Runtime Data Flow

### Deliverable generation pipeline (condensed)

1. **Brief intake** — `HeuristicBriefIntake.tsx` collects a structured UX brief OR `FileUpload.tsx` accepts raw client docs.
2. **Ingestion** — proxy `/api/parse-upload` extracts plain text (PyPDF2 / mammoth / text decode), populates `FileUpload.parsedText`.
3. **Research fabric** — `researchFabricOrchestrator.ts` (~2,100 lines) fans out to external connectors via `/api/search/*` and `/api/multi-search`, deduplicates, chunks, and assembles a `SourceDocument[]`.
4. **Themes / structure** — `geminiService.ts` runs a `GenAISession` (stateful multi-turn chat) through checkpointed stages. Each stage emits a streamed "Live Thinking" feed before producing JSON; user can edit/approve/reject at each `AnalysisCheckpoint`.
5. **Deliverable-specific generation** — routed by `aiRouter.ts`:
   - `PERSONAS`, `STRATEGY_DECK`, `JOURNEY_MAP` → Gemini (default); provider is overridable in the UI.
   - Heuristic UX brief analysis → `heuristicAnalysisService.ts` (tri-model: Claude + GPT + Gemini).
6. **Post-processing** — `slidePostProcessor.ts` (~1,700 lines, defense-in-depth): banned-phrase correction, meta-narration regex stripping, citation rewriting ([CHUNK_XXX] → SourceName: Title), persona image injection, evidence-density scoring.
7. **Export** — the CANONICAL deck path (2026-06-05 structural rewire): each slide's `SlideData` renders to a fresh 1920x1080 `#stage` HTML via [services/slideToStageHtml.ts](services/slideToStageHtml.ts), POSTed to the proxy `/api/gold/export-pptx-multi`, which Playwright-walks the stage geometry ([proxy/gold_pptx_export.py](proxy/gold_pptx_export.py)) into ONE native, fully editable `.pptx`: native text runs, native shapes, native swappable pictures, per-variant chrome layouts, embedded brand fonts. Never a full-slide raster; never layout-backed picture placeholders (python-pptx clones layout placeholders onto every later slide — the 2026-07-02 empty-placeholder epidemic). Infographic-exhibit panels are re-rendered at export time (style-version-salted cache) so old decks pick up renderer improvements. `exportService.ts` (html2canvas → jsPDF; pptxgenjs via [components/slideTemplates/pptx.ts](components/slideTemplates/pptx.ts)) is the LEGACY fallback only.

### Slide template system

There are **18 slide templates**, each owned by a specific consulting skill, with a strict data shape enforced by TypeScript ([components/slideTemplates/types.ts](components/slideTemplates/types.ts#L12)):

`persona-card`, `recommendation`, `theme-cluster`, `theme-spotlight`, `theme-arc`, `theme-mosaic`, `competitive-matrix`, `block-quote`, `case-study`, `principles`, `stat-row`, `timeline`, `section-divider`, `service-blueprint`, `gap-matrix`, `architecture-map`, `prd-feature`, `systems-inventory`.

The AI emits `:::slide` fenced blocks with a `template` field. The renderer TWINS that must stay in sync are [web.tsx](components/slideTemplates/web.tsx) (960x540 chat preview) and [services/slideToStageHtml.ts](services/slideToStageHtml.ts) (the 1920x1080 export stage); `npm run check:templates` guards parity.

**`slides:` deck archetypes (DECK MODE, the dominant `#slides` system):** full decks compose from a SEPARATE registry — `template=slides:<archetype>` fences (cover, agenda, section-divider, thesis-interstitial, stat-row, block-quote, numbered-themes, org-model, evidence-table, role-needs/recommendation/roadmap, problem-diptych, infographic-exhibit, ...) rendered by [services/slideComposer.ts](services/slideComposer.ts) `ARCHETYPE_SPECS` (Method A: geometry specs, no per-archetype render code). The `slides:` namespace keeps them distinct from the colliding GOLD template names above. `slides:infographic-exhibit` is the deck-native data panel: composed by the proxy's native lane from the payload's own fields, governed by the `infographic-composer` skill (injected into DECK MODE; per-family depth contracts, cited-quote-only stats).

### AI provider routing

[services/aiRouter.ts](services/aiRouter.ts) is the single source of truth for model selection. Current registry:

| Category                | Default                          | Fallback chain                                          |
|-------------------------|----------------------------------|---------------------------------------------------------|
| research                | `gemini-3.1-pro-preview`         | `gemini-3.5-flash`, `deepseek-v4-flash`                 |
| fast_generation / fast_agentic | `gemini-3.5-flash`        | `gemini-3.1-pro-preview`, `deepseek-v4-flash`           |
| vision                  | `gemini-3.5-flash`               | `gemini-3.1-pro-preview`                                |
| narrative_composition   | `gemini-3.1-pro-preview`         | `gemini-3.5-flash`, `deepseek-v4-flash`                 |
| image / video           | `gemini-3.1-flash-image-preview` | (HiC has no video; category kept for hygiene)           |

The registry also carries `claude-opus-4-8`, `claude-sonnet-4-6`, and `gpt-5.4`/`gpt-5.4-mini`/`gpt-5.5` for explicit-provider call sites. Canonical Gemini models are `gemini-3.1-pro-preview` (reasoning; emits thought signatures), `gemini-3.5-flash` (fast text), `gemini-3.1-flash-image-preview` (image) — never reach for 2.5-era models, and never hardcode model IDs at call sites; route through `aiRouter.ts`.

> **2026-05-29 — Opus 4.8 swap.** All Claude Opus call sites in HiC (proxy default, journey-mapper dispatch, brief generator, research planner, critic dispatchers, CorpusChat journey/blueprint route, topic-modeling labels) were swapped from `claude-opus-4-7` / `claude-opus-4-6` to `claude-opus-4-8` (released 2026-05-28). Adaptive thinking is on by default — no `effort` parameter wired. Standard pricing is $5/$25 per 1M tokens (3x cheaper than 4.7); `services/costMeter.ts` was updated accordingly. Sonnet 4.6 and Haiku 4.5 paths are unchanged.

> **CANONICAL MODEL-ROUTING RULE (2026-06-16, user-final — single source of truth).** **Gemini 3.5 Flash for ALL non-hashtag Analyst Desk chat** (plain corpus Q&A); **Claude Opus 4.8 for ALL hashtag deliverable generation** — every artifact hashtag AND the **`#proto` build pipeline's every stage** (brief, interaction spec, sims, design-system, build-recipe, code, critique). Cross-provider fallback is resilience only (Opus→Gemini); the build path **never** uses GPT-5.5 (it rejects non-default `temperature` → HTTP 400, and is off-rule). Canonical statement lives in `services/aiRouter.ts` (header block above `DEFAULT_MODELS`); enforced in `corpusChatService.routedModelFor()` + the artifact force-route and `prototypeBuilder.ts` (`callOpusJsonStage`/`callClaudeStage`, Opus primary + Gemini resilience fallback). The 2026-06-14 "#proto planning stages stay on Gemini" split is SUPERSEDED. When this rule changes, update aiRouter.ts, documentation.html §12, this file, and memory together.
>
> **CURRENT STATE (2026-07-01, cap LIFTED; WS-E routing convergence 2026-06-30).** The single routing authority is **`aiRouter.artifactModelFor`** — the parallel `DELIVERABLE_MODEL_TIER` map + `ARTIFACT_DEFAULT_DURING_CAP` const that briefly lived in `corpusChatService.ts` are **DELETED** (no duplicate routing brain). Standing tier: **SCHEMA/TABLE deliverables → `gemini-3.5-flash`** (gap-matrix, journey-map, service-blueprint, competitive-matrix, org-chart, systems-inventory, architecture-map, timeline — bake-off-validated equal to Gemini 3.1 Pro at ~18x lower cost than Opus; evidence in `plans/model-bakeoff-{gap-journey,broadened}-2026-06-28.md`); **every other artifact → `claude-opus-4-8`** (case-study, personas, themes, strategy, recommendations, report, prd, bare `#slides`, `#proto` code+planning). The Opus-quota workaround is ONE reversible flag: **`OPUS_CAP_ACTIVE` in `aiRouter.ts` (currently `false`)** — while `true`, non-schema artifacts fall back to `gemini-3.1-pro-preview` and `prototypeBuilder.CODE_MODEL` follows it. Flip that one flag if the Anthropic monthly cap ever returns; touch nothing else.

Provider adapters live in [services/providers/](services/providers/) (`claudeAdapter.ts`, `geminiAdapter.ts`, `openaiAdapter.ts`) behind a common `ProviderAdapter.ts` interface. Raw-HTTP provider clients in `anthropicService.ts`, `openaiService.ts`, `geminiService.ts` predate the adapter layer and are still used by most generation code paths — **new generation code should route via `aiRouter.ts`**.

Note: Claude Opus supports assistant-message prefill; Sonnet does not. Anything using a "prefilled continuation" pattern must stay on Opus.

## Key Files & Conventions

| File | Purpose | Watch out for |
|------|---------|---------------|
| [App.tsx](App.tsx) | ~6,700 lines — root state machine, checkpoint orchestration, all stages | Changes here cascade through every deliverable; prefer editing services where possible |
| [services/geminiService.ts](services/geminiService.ts) | ~6,700 lines — primary generation engine + `GenAISession` stateful chat | Contains deliverable-specific prompts; duplicated provider HTTP logic |
| [services/researchFabricOrchestrator.ts](services/researchFabricOrchestrator.ts) | ~2,100 lines — multi-source aggregation, chunking, `[CHUNK_XXX]` ID scheme | `getChunkSourceMap()` exports the resolver used by citation post-processing |
| [services/slidePostProcessor.ts](services/slidePostProcessor.ts) | ~1,700 lines — the single chokepoint that enforces `.claude/CLAUDE.md` output rules at runtime | Defense-in-depth layer; prompt rules can still be bypassed, this layer cannot |
| [services/wikiService.ts](services/wikiService.ts) | ~2,600 lines — wiki read/write, `loadGenerationContext()`, `detectBannedPhrases()`, `scoreOutput()` | Wiki pages are loaded into the generation prompt; adding a framework page can raise output quality without touching any prompt |
| [proxy/app.py](proxy/app.py) | ~16,000 lines — 200+ sources in the `SOURCES` registry, 8 connector types | Add sources by adding a dict entry — no code change; browser-compatible UA is required for most news sites (WAF) |

### Conventions

- **Plain text only in generated content.** No Markdown in AI output fields — `slidePostProcessor` strips `**bold**`, `# headers`, etc. The renderer owns formatting.
- **Citations must resolve to real source names.** `[CHUNK_003]` → `"Higher Ed Dive: <article title>"`. `citationResolver.ts` owns this. Never let generic references ("research", "studies", "sources") ship — the post-processor and `.claude/CLAUDE.md` rules reject them.
- **Wiki-first retrieval.** Before calling a model, `loadGenerationContext()` pulls the relevant `wiki/frameworks/<type>.md` + anti-patterns + brand standards + evidence pages into the prompt. If a framework page is missing, generation quality drops silently — add the page rather than inflating the prompt.
- **Manifest-chunk retrieval, not RAG injection.** Deliverable generators must ground evidence via manifest chunk pointers (see the `manifest-chunk-retrieval` skill), never by bulk-injecting `rawSources` or embedding-RAG results into the prompt — RAG injection is the documented root cause of hollow deliverables. `generateThemes` is the reference implementation; any generator still RAG-injecting is legacy to be migrated, not a pattern to copy.
- **Semantic wiki retrieval.** `POST /api/wiki/fetch-articles` returns embedding-ranked article bodies. For broad questions, fire 3–4 angle variants (see the `wiki-query-expander` skill) to hit distinct vector-space neighborhoods; for narrow questions, use `wiki-reranker` to cross-encode the candidate set.
- **Emoji ban.** No emoji anywhere in prompts, generated content, or source code (repo-wide rule; breaks Power Automate JSON escaping elsewhere and reads unprofessionally in deliverables).

## Common Pitfalls

- **Stale dist in Docker**: if a code change isn't visible in the browser at `:5011`, 99% of the time it's a missed rebuild. `docker compose -f ../docker-compose-all.yml up -d --build research-generator`.
- **HMR silently dead on Windows Docker**: Vite uses `usePolling: true` ([vite.config.ts:56](vite.config.ts#L56)) because inotify events don't propagate through WSL2 volume mounts. If you disable it, saved edits will not hot-reload.
- **`process.env.API_KEY` === `GEMINI_API_KEY`**: legacy code paths reference `API_KEY`; both are set from the same env var in [vite.config.ts:63-64](vite.config.ts#L63-L64). Don't introduce a separate `API_KEY` value.
- **Wiki write without the proxy**: The SPA cannot write to `wiki/` directly — it must go through `/api/wiki/write*`. Bypassing the proxy (e.g., in local-only dev) means articles/logs never persist.
- **`--legacy-peer-deps` is required.** Some deps carry stale peer ranges; drop the flag and `npm install` will fail.
- **Large upload timeouts**: `/api/parse-upload` and `/api/extract-pdf` run synchronously against PyPDF2 — a 500-page PDF can block for ~60s. The proxy's default timeout is 30s, but the SPA side tolerates longer; do not shorten proxy timeouts without verifying upload-heavy flows.

## When Adding a New Deliverable Type

1. Add a `wiki/frameworks/<type>.md` page following the schema in `hic-workspace/AGENTS.md` Part III (frontmatter + all required sections from Part VII).
2. Add a `wiki/anti-patterns/<type>.md` page with known failure modes.
3. Add any new slide template(s) to [components/slideTemplates/types.ts](components/slideTemplates/types.ts), then implement the renderer in [web.tsx](components/slideTemplates/web.tsx) and exporter in [pptx.ts](components/slideTemplates/pptx.ts). Both files must be updated together.
4. Add the generation function to `geminiService.ts` (or a new service file) and register it in `App.tsx`'s stage flow + `METHODOLOGY_INFO`.
5. Register the deliverable in [services/deliverableFrameworks.ts](services/deliverableFrameworks.ts) schema map.
6. Wire post-processing in [services/slidePostProcessor.ts](services/slidePostProcessor.ts) if the output has slides/citations.
7. Update `types.ts` `OutputOption` union and the relevant `AnalysisResult` fields.

## NU Design Gallery (handoff bundle, 2026-05-23)

`public/nu-design-gallery/` is a complete artifact-template set handed off from claude.ai/design. It contains 13 polished single-canvas HTML exemplars — one for each HiC deliverable type plus org-chart and a 7-archetype strategy-deck — all built from a shared `colors_and_type.css` (NU brand tokens, Spectral + Roboto + Roboto Mono) and `artifacts.css` (component layer: masthead, stat strip, citation chips, signal dots, maturity bars, dense tables, cards, footer source index).

Served at:
- Dev: `http://localhost:3000/nu-design-gallery/index.html`
- Prod (Docker, port 5011): `http://localhost:5011/nu-design-gallery/index.html`

Useful entry points:
- [`index.html`](public/nu-design-gallery/index.html) — gallery linking to every template
- [`style-guide.html`](public/nu-design-gallery/style-guide.html) — visual reference with anatomy of every primitive
- [`GUIDE.md`](public/nu-design-gallery/GUIDE.md) — full spec: principles, token map, density rules, element catalog, per-artifact anatomy, modification recipes, the "thirteen don'ts", and the Tweaks integration protocol
- [`README.md`](public/nu-design-gallery/README.md) — claude.ai/design handoff notes
- [`HANDOFF-CHAT.md`](public/nu-design-gallery/HANDOFF-CHAT.md) — the conversation that produced the bundle (intent + decisions)

**Use the gallery as the visual reference** when implementing or modifying HiC artifact renderers (`components/slideTemplates/web.tsx`, `services/slidePostProcessor.ts` brand handling, exported HTML deliverables). Inherit tokens from the shared CSS rather than redefining values inline; the editorial layer (voice + anti-patterns) lives in `.claude/skills/brands/nu-style/SKILL.md` and `.claude/CLAUDE.md`.

**The thirteen don'ts** in `GUIDE.md` §9 are the enforced anti-patterns — no methodology blurbs, no per-slide source strips, no "EVIDENCE GAP" / "TBD" annotations, no micro-labels above headings, no catastrophizing verbs, no hype language, no AI-generated decorative illustrations. These align with `.claude/CLAUDE.md` banned-phrase rules.

## Related docs in this directory

- [HUMANS_IN_CONTROL_QA_DOCUMENTATION.md](HUMANS_IN_CONTROL_QA_DOCUMENTATION.md) — end-to-end QA scenarios
- [KNOWLEDGE_GRAPH_DEEP_DIVE.md](KNOWLEDGE_GRAPH_DEEP_DIVE.md) — citation graph + knowledge visualization internals
- [STRATEGY_DECK_PIPELINE_AUDIT.md](STRATEGY_DECK_PIPELINE_AUDIT.md) — forensic failure analysis of the deck pipeline (useful reference when debugging deck output)
- [REARCHITECTURE_DEVELOPMENT_PLAN.md](REARCHITECTURE_DEVELOPMENT_PLAN.md), [V3_DEVELOPMENT_PLAN.md](V3_DEVELOPMENT_PLAN.md) — historical and forward-looking roadmaps
- [changelog.md](changelog.md) — chronological system-enhancement log
- [hic-workspace/AGENTS.md](hic-workspace/AGENTS.md) — **the wiki schema; read before any wiki operation**
- [public/nu-design-gallery/](public/nu-design-gallery/) — **NU design-system handoff bundle** (13 artifact templates + style guide + GUIDE.md + Spectral fonts; see NU Design Gallery section above)
