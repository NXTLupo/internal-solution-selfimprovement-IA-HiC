# Humans in Control — Comprehensive Handoff

**Version:** v4.2
**Date:** 2026-05-24
**Audience:** Engineers, operators, architects, executives joining or auditing HiC
**Purpose:** Single-file source-of-truth for everything needed to understand, operate, and extend Humans in Control. Self-contained — no "see X for more" except for explicit deep-dives.

---

## Table of Contents

1. [TL;DR — Read This First](#1-tldr--read-this-first)
2. [What HiC Is](#2-what-hic-is)
3. [System Architecture](#3-system-architecture)
4. [Operator Usage](#4-operator-usage)
5. [Hashtag Command System](#5-hashtag-command-system)
6. [Deliverable Catalog](#6-deliverable-catalog)
7. [Smart Topic Modeling Pipeline (v4.2)](#7-smart-topic-modeling-pipeline-v42)
8. [Multi-Model Resilience Layer (v4.2)](#8-multi-model-resilience-layer-v42)
9. [Complete Skill Catalog (66 skills)](#9-complete-skill-catalog-66-skills)
10. [Complete Hook Catalog (30 hooks)](#10-complete-hook-catalog-30-hooks)
11. [Subagent Fleet (10 subagents)](#11-subagent-fleet-10-subagents)
12. [Standing Rules (Agent Memory)](#12-standing-rules-agent-memory)
13. [Wiki Knowledge Base](#13-wiki-knowledge-base)
14. [Model Routing](#14-model-routing)
15. [Python Proxy & Services](#15-python-proxy--services)
16. [Export Pipeline](#16-export-pipeline)
17. [NXT Brand System](#17-nxt-brand-system)
18. [Operations & Troubleshooting](#18-operations--troubleshooting)
19. [Incomplete Implementations](#19-incomplete-implementations)
20. [Active Backlog & Pending Engineering](#20-active-backlog--pending-engineering)
21. [Documentation File Map](#21-documentation-file-map)
22. [Engineer Onboarding Checklist](#22-engineer-onboarding-checklist)
23. [Glossary](#23-glossary)

---

## 1. TL;DR — Read This First

**HiC turns a research goal + a heterogeneous corpus into consulting-grade deliverables with full citation traceability and cross-deliverable identity stability.**

### Two-minute architecture

```
React 19 SPA  ──fetch──>  FastAPI Proxy (port 5012)  ──>  200+ data sources
   (port 5011)                    │                       + wiki RAG store
                                  │                       + topic-cache
                                  ▼
                          BERTopic v2 pipeline
                          (deterministic clustering)
                                  │
                                  ▼
                          LLM naming (temperature=0
                          + signature cache)
                                  │
                                  ▼
                          Quality gates (14 Stop hooks)
                                  │
                                  ▼
                          Analyst Desk / Designer Window / Export
```

### The five rules every new engineer must internalize

1. **Never merge to main.** Main is owner-controlled; branch from latest `HiC-*` feature branch.
2. **Never commit without explicit user approval.** Stage with `git add`; wait. The `precheck_commit_approval.py` hook blocks reflexive commits.
3. **Never start individual services.** Always `docker compose -f docker-compose-all.yml up -d`. Port 3000 belongs to social-research-frontend; HiC is `:5011`.
4. **Frontend changes require a Docker rebuild.** No HMR. After any `*.tsx`/`*.ts`/`*.css` edit: `docker compose -f docker-compose-all.yml up -d --build research-generator` + hard refresh.
5. **The wiki is the source-of-truth for deliverable specs.** `wiki/frameworks/<type>.md` defines what each deliverable must contain. Missing framework page → quality regression.

### The five quality disciplines that govern every output

1. **Quality first** — meet count floors via upstream quality, never by relaxing standards.
2. **Determinism first for cached runs** — same corpus + same goal → same deliverable identity.
3. **Check sister services FIRST** — read `internal-solutions-socialresearch/` before designing new HiC architecture.
4. **Multi-model resilience pattern** — cache + provider health + per-corpus commitment + signature-keyed identity cache.
5. **Finish then test — no phase gates** — execute multi-part goals to completion, then validate.

### The platform's defining metrics

- 200+ data source connectors across 8 connector kinds
- 30 named institutions tracked
- 50+ agent skills
- 30 Stop / PreToolUse / PostToolUse / UserPromptSubmit hooks
- 10 specialized subagents
- 1M-token primary context (Gemini 3.1 Pro)
- 22+ hashtag commands
- 18 slide templates
- 15-25 themes per research run (BERTopic v2 auto-scaled)

---

## 2. What HiC Is

Humans in Control (HiC) is a research workbench for a specific operator: a strategist or consultant who needs to go from a research brief to a defensible, evidence-cited deliverable in **hours instead of weeks**.

### Three architectural principles

1. **Collection is a data fabric problem**, not a search problem. HiC orchestrates 200+ connectors (academic / news / government / social / client uploads) in parallel with hallucination-guarded query refinement and body-aware relevance scoring.
2. **Synthesis is a multi-model agentic problem with deterministic identity layers and stochastic exploration layers**, not a single-prompt problem. BERTopic decides cluster identity (deterministic); LLM names clusters (temperature=0, signature-cached); LLM enriches depth (temperature=0.2, allowed to vary).
3. **The artifact is a knowledge graph the user can navigate**, not a static document. Every theme, persona, recommendation traces back to named sources via the `[CHUNK_NNN]` citation token.

### Core claim

> Every output element — themes, personas, recommendations, barriers — is traceable back to a named source, a tier, and a verbatim quote. Same cached corpus + same goal → same theme names + same cluster memberships. Determinism enforced by BERTopic `random_state=42`, LLM naming at `temperature=0`, signature cache, and `validate_theme_reproducibility.py` Stop hook.

### Three operating modes

| Mode | Trigger | Experience |
|---|---|---|
| **Research** | Goal + collect data | Full pipeline: data fabric → topic modeling → themes → personas → journeys → recommendations → optional deck. 15-25 themes natively, source-stratified. |
| **UX Evaluation** | Heuristic Brief Intake | 8-dimension heuristic audit (usability, conversational AI, agentic commerce, social, geo, trust, accessibility, visual design). |
| **Chat to Data** | Post-collection | Multi-turn Q&A over corpus + deliverables with live citations and `fetch_wiki_articles` tool access. |

---

## 3. System Architecture

### The container topology

```
┌─────────────────────────────────────────────────────────────────┐
│ React 19 SPA  (Vite, port 3000 dev / 5011 prod nginx)            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Analyst Desk │  │ Analyst Chat │  │ Designer Window      │   │
│  │  (treemap)   │  │  (workbench) │  │  (1920×1080 canvas)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│        │                  │                    │                 │
│        └─────── App.tsx state machine ─────────┘                 │
│        │                  │                    │                 │
│  services/aiRouter.ts   geminiService.ts   slidePostProcessor    │
│        │                                       │                 │
└────────┼───────────────────────────────────────┼─────────────────┘
         │                                       │
         ▼ fetch()                               ▼ html2canvas + paint-sync
┌────────────────────────────────────────────────────────────────┐
│ Research Proxy (FastAPI, port 5012, proxy/app.py — 11,165 LOC) │
│                                                                │
│ /api/ai/{anthropic,gemini,openai}  — provider fan-out          │
│ /api/search/{source_id}            — 200+ sources              │
│ /api/wiki/*                        — read/write/embed/fetch    │
│ /api/topic-model/{analyze,status}  — v2 pipeline (smart)       │
│ /api/topic-cache/{list,read}       — cluster cache             │
│ /api/artifacts/*                   — HTML artifact library     │
│ /api/parse-upload, /extract-pdf    — client ingestion          │
│ /api/transcribe-youtube            — yt-dlp + Whisper          │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ External sources (OpenAlex, Crossref, arXiv, RSS, CKAN, Reddit,│
│ YouTube, news APIs, government data...) — 200+ connectors      │
│                                                                │
│ + hic-workspace/wiki/  (persistent LLM-maintained markdown KB) │
│ + hic-workspace/sessions/_topic-cache/  (BERTopic results)     │
│ + hic-workspace/sessions/_embedding-cache/  (vector cache)     │
│ + hic-workspace/sessions/_name-cache/  (LLM naming cache)      │
└────────────────────────────────────────────────────────────────┘
```

### Critical files (read these to understand the codebase)

| File | LOC | Role |
|---|---|---|
| `humans-in-control-research/App.tsx` | ~3,742 | Root state machine; checkpoint orchestration; every deliverable stage flow |
| `humans-in-control-research/services/geminiService.ts` | ~5,300 | Primary generation engine; `generateThemes()`; theme-count targeting; stateful `GenAISession` chat |
| `humans-in-control-research/services/aiRouter.ts` | ~600 | Model selection + provider routing |
| `humans-in-control-research/services/researchFabricOrchestrator.ts` | ~1,372 | Multi-source aggregation, chunking, `[CHUNK_NNN]` ID scheme |
| `humans-in-control-research/services/slidePostProcessor.ts` | ~960 | Runtime output discipline (350+ banned phrases, meta-narration regex, citation rewriting) |
| `humans-in-control-research/services/wikiService.ts` | ~1,872 | Wiki read/write, `loadGenerationContext()`, banned-phrase detection |
| `humans-in-control-research/proxy/app.py` | ~11,165 | FastAPI proxy; 200+ sources in `SOURCES` registry; topic-model job system; HTML artifact endpoints |
| `humans-in-control-research/proxy/topic_modeling.py` | ~1,236 | BERTopic pipeline; v1 (Reddit-deep) + v2 (HiC smart with source-stratified clustering + caches) |

### Other services in the IA Suite (sister services for cross-architecture context)

| Service | Port | Role |
|---|---|---|
| Launchpad Hub | 8000 | Flask + WebSocket proxy |
| AI Agent | 8500 | FastAPI + AsyncAnthropic orchestrator |
| HiC Research Frontend | **5011** | nginx serving Vite dist (this is HiC) |
| HiC Research Proxy | 5012 | Python proxy (this is HiC) |
| Social Research Backend | 8081 | FastAPI + BERTopic + VADER + pgvector |
| Social Research Frontend | 3000 | React 19 + Redux Toolkit + MUI (sacred port; not HiC) |
| Journey Mapper | 8080 | FastAPI + Claude Opus 4.5 |
| Character Generator | 5010 | Gemini Imagen 3 + Veo 3.1 |
| Copilot Recipe Generator | 5013 | FastAPI + Vite React + Claude Opus 4.6 |
| Reddit Collector | 5001 | Flask (TrustPilot, Play Store) |
| Video Analyzer | 5002 | FastAPI + Whisper API + FFmpeg |
| Miro Generator | 5004 | TypeScript CLI + Jest |
| NXT Agency Launchpad | 5050 | Nginx serving pre-built Vite dist |
| NXT Agency Backend | 8201 | FastAPI + computer-use + noVNC (6080) |

---

## 4. Operator Usage

### Quickstart

1. **Enter a research goal.** Be specific about the institution, outcome, and audience. The Brief Parser extracts named entities and seeds query refinement.
2. **Upload source documents.** PDFs, plain text, CSV, JSON, transcripts. Client uploads shape personas + organizational framing but never dominate the citation base (60% external floor enforced).
3. **Select data sources.** Toggle categories (Higher-Ed News, Academic Literature, Reddit Communities, Philanthropy, etc.). Defaults picked by Analytical Lens.
4. **Click *Collect Data*.** The data fabric fans out, refines per-source queries with a 0.35 fidelity hallucination guard, scores body-aware relevance across 200+ connectors, and runs tri-model parallel analysis (Gemini + Claude + OpenAI) on top-ranked items.
5. **Land in the Analyst Desk.** Themes auto-populate as a treemap. The v4.2 pipeline produces 15-25 themes natively from the corpus via BERTopic with auto-scaled hyperparameters — no relaxation tiers, no synthetic count floors.
6. **Inspect with breadcrumbs.** Click any theme tile to see its cited evidence, linked sources, personas, and recommendations. **Convergent-evidence themes** (clusters that merged across ≥2 source types) are flagged.
7. **Refine via Chat to Data.** Ask follow-ups. Every answer is grounded in corpus text with inline citations.
8. **Export.** PPTX deck, PDF, PNG. The `export-paint-sync` skill defeats html2canvas race conditions; the `export-render-verifier` subagent QAs the rendered file.

### App state machine

| State | Trigger | What happens |
|---|---|---|
| `brief_intake` | App load | Goal entry, upload, source selection, analytical lens |
| `collecting` | Click Collect Data | Data fabric fans out across 200+ sources; refinement; body-aware relevance scoring; tri-model parallel analysis |
| `topic_modeling` | Post-collection | BERTopic v2 pipeline: embed (multi-model + cache) → source-stratified cluster → coherence + density gates → LLM naming at temp=0 |
| `analyst_desk` | Pipeline complete | Treemap renders; personas / journeys / recommendations populate progressively |
| `chat_workbench` | Always available post-collection | Multi-turn Q&A; `fetch_wiki_articles` tool; hashtag directives |
| `design_desk` | Hashtag directive | Designer window opens; multi-artifact loop populates 1920×1080 canvas |
| `export` | Export Deck PPTX/PDF | Paint-sync prep → html2canvas → pptxgenjs / jspdf → download; export-render-verifier subagent QAs the rendered file |

---

## 5. Hashtag Command System

### Anatomy

`#<content> #<brand> #<view> <your prompt text>` — order doesn't matter; case doesn't matter. Plurals map to canonical singulars (`#orgs` → `#org`). Hashtags are stripped from the prompt before reaching the model. Brand defaults to `#nxt` if none specified.

### Five directive families

#### Family 1 — Experience builders
- `#proto` — 5-stage prototype pipeline with VS-reasoning at Stage 1
- `#presentation` — multi-slide deck
- `#prototypes` / `#presentations` — library browse

#### Family 2 — Consulting deliverables (HTML artifact family)
- `#recommendations` — VS-Multi: Defensible Consensus + Non-Obvious Bets
- `#brief` — stakeholder one-pager (600-1200 words; `--variants k` modifier)
- `#explainer` — deep-dive concept page (1500-3500 words; `--variants k`)
- `#report` — long-form strategic report (3000-8000 words; `--variants k`)
- `#playground` — self-contained interactive HTML for parameter tuning
- `#approaches` — 3+3 decision picker (3 consensus + 3 non-obvious bets; `--variants k`)
- `#artifacts` — library browse

#### Family 3 — Design Desk content
- `#org`, `#journey`, `#blueprint`, `#arch`, `#roadmap`, `#prd`, `#strategy`, `#gap`, `#audit`, `#compete`, `#persona`, `#case-study`

#### Family 4 — Brand & modifier
- `#NU`, `#NXT` — brand modifiers
- `#slides` — multi-slide composition modifier

#### Family 5 — Utility, system, quality skills, slash commands

**System:**
- `#help` — generates live HTML reference guide
- `#refine <slug>: <tweak>` — re-runs pipeline preserving slug
- `#explore` — exploratory tile generation
- `/image`, `/portrait` — slash commands for image generation

**Quality/diagnostic (v4.2):**

| Hashtag | What it does | Skill / Subagent |
|---|---|---|
| `#patterns` / `#cross-engagement` | Mines prior sessions for recurring patterns | `cross-engagement-pattern-miner` |
| `#quantify <rec>` | Forces baseline + target + measurement_method + refresh_cadence on a recommendation | `quantification-architect` |
| `#pre-mortem <rec>` | Inverts second-order-thinker; reasons backward from failure | `pre-mortem` |
| `#stakeholder-lens <rec>` | Runs through 5 named stakeholder lenses | `stakeholder-lens-auditor` |
| `#analog` / `#cross-industry` | Retrieves 3+ adjacent-industry analogues | `analog-finder` |
| `#dissent` / `#panel` | 5 adversarial critics each emit 200-word critique | `dissent-panel` subagent |
| `#second-order <rec>` | Maps 1st/2nd/3rd-order effects + feedback loops | `second-order-thinker` |
| `#fallback` / `#brain-status` | Shows live degradation events | `fallback-event-surfacing` |
| `#quota` / `#cost` | Shows current provider quota + run cost | `quota-monitor` subagent |
| `#deterministic` / `#reproducible` | Audits pipeline for non-deterministic touchpoints | `deterministic-naming-pass` |
| `#repair-syntax <text>` | Pre-parse repair on malformed JSON/HTML | `ai-output-syntax-repair` |
| `#orphans` | Static-analyzes codebase for exported symbols with zero callers | `orphan-code-auditor` subagent |
| `#wiki-curate` | Triggers wiki curator | `wiki-curator` subagent |
| `#verify-export` | Playwright-driven export verification | `export-render-verifier` subagent |
| `#corpus-check` / `#density-precheck` | Audits corpus BEFORE generation | `evidence-density-pre-checker` |

---

## 6. Deliverable Catalog

| Deliverable | Skill | Wiki framework page | Key quality gates |
|---|---|---|---|
| Themes | `theme-analyst` + `topic-cluster-to-theme-converter` | `frameworks/themes.md` | thick-evidence (≥2 sources), TOP_N by deliverable type, validate_theme_yield, validate_theme_reproducibility |
| Personas | `persona-architect` | `frameworks/personas.md` | verbatim quotes mandatory, JTBD required, 3+ external citations, demographics-first auto-rejected |
| Journey map | `service-blueprint-mapper` | `frameworks/journey.md` | Bitner 5-component, fail points, emotion intensity per stage |
| Service blueprint | `service-blueprint-mapper` | `frameworks/blueprint.md` | same as journey |
| Recommendations | `recommendation-architect` | `frameworks/recommendations.md` | quantification four-tuple, stakeholder-lens-auditor, pre-mortem, validate_quantification |
| Strategy | `strategy-author` | `frameworks/strategy.md` | Rumelt's Kernel (Diagnosis / Guiding Policy / Coherent Actions), 20+ named sources, 15-section |
| Roadmap | `roadmap-builder` | `frameworks/roadmap.md` | NOW/NEXT/LATER horizons, problem framing, quantified success metric per item |
| PRD | `prd-compiler` | `frameworks/prd.md` | 16 Cagan/SVPG sections, MoSCoW prioritization |
| Tech architecture | `tech-arch-generator` | `frameworks/architecture.md` | C4 Model node/flow mapping, citations per component |
| Tech audit | `tech-audit-inspector` | `frameworks/tech-audit.md` | Systems inventory, integration map, capability matrix, consolidation opportunities |
| Gap analysis | `gap-analysis-evaluator` | `frameworks/gap-analysis.md` | Gartner 5-level maturity, dollar-quantified gap impact, risk register |
| Competitive analysis | `competitive-analyst` | `frameworks/competitive.md` | named entity extraction, archetype analysis, benchmark scoring, maturity matrix |
| **Case study (NEW v4.2)** | `case-study` template | `frameworks/case-study.md` | 10-section spec, ≤8-char section labels, evidence-density floor, anti-patterns + brand rules |
| Slide deck | `deck-narrative-composer` | `frameworks/deck.md` | action-title compliance (validate_titles), slide variety (validate_slide_variety), content budgets |

### Slide template registry (18 templates)

Defined in `components/slideTemplates/types.ts`. Both `web.tsx` (preview) and `pptx.ts` (export) must implement each:

`persona-card`, `recommendation`, `theme-cluster`, `theme-spotlight`, `theme-arc`, `theme-mosaic`, `competitive-matrix`, `block-quote`, `case-study`, `principles`, `stat-row`, `timeline`, `section-divider`, `service-blueprint`, `gap-matrix`, `architecture-map`, `prd-feature`, `systems-inventory`

---

## 7. Smart Topic Modeling Pipeline (v4.2)

### The 7-stage v2 pipeline (`proxy/topic_modeling.py` `run_pipeline_v2`)

```
┌──────────────────────────────────────────────────────────────┐
│ Stage 1: EMBED via multi-model resilience layer              │
│   • Content-hash cache pre-pass (zero cost on repeat runs)   │
│   • Provider health routing (skip 429'd providers 10min)     │
│   • OpenAI text-embedding-3-small (1536-d) or Gemini (3072-d)│
│   • Per-corpus provider commitment                           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 2: SOURCE-STRATIFIED CLUSTERING                        │
│   • Bucket by source_type (academic/news/government/social/  │
│     client/unknown — _infer_source_type heuristic)           │
│   • Cluster within each bucket: UMAP (random_state=42) +     │
│     HDBSCAN (cluster_selection_method='leaf')                │
│   • Cross-type centroid merge: cosine ≥ 0.75 → merge         │
│   • Merged clusters flagged convergent_evidence: true        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 3: c-TF-IDF TOP-TERMS per cluster (deterministic)      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 4: COHERENCE PRE-FILTER (_is_cluster_coherent)         │
│   • Drop clusters where ≥2 of top-3 terms are stopwords      │
│   • Drop clusters where avg term length < 3.5 chars          │
│   • Saves LLM naming cost + prevents noise themes shipping   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 5: EVIDENCE-DENSITY GATE (cluster-level, BEFORE naming)│
│   • Drop clusters with <2 distinct named sources in top docs │
│   • Enforces .claude/CLAUDE.md citation discipline upstream  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 6: LLM NAMING at temperature=0 with signature cache    │
│   • Cluster-signature cache: same inputs → same cached name  │
│   • Anthropic Claude Opus 4.6 primary; provider-health gated │
│   • Multi-provider fallback with heuristic name on hard fail │
│   • temperature=0 (was unspecified, defaulting to 1.0)       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Stage 7: THEME-COUNT TARGETING by deliverable type           │
│   • themes_only: 25  |  strategy_section: 7                  │
│   • persona_inputs: 5  |  slide_deck: 12                     │
│   • gap_analysis: 8  |  roadmap_inputs: 10                   │
│   • Sort: convergent_evidence first, then distinct_source    │
│     count desc, then cluster size desc                       │
└──────────────────────────────────────────────────────────────┘
```

### Why this beats both prior versions

| Property | Original (v3.8) | 4-tier relaxation (briefly shipped) | v2 (current) |
|---|---|---|---|
| Count discipline | Auto from LLM; often 13 themes | Hit 20 by relaxing quality | 15-25 natural from BERTopic auto-scaling |
| Quality gates | Post-hoc Stop hooks | 4 relaxation tiers admitted weak themes | Pre-naming gates (coherence + density) |
| Determinism | Stochastic LLM extraction | Mixed | Cluster identity stable (UMAP random_state=42) + name cache |
| Heterogeneous corpus | Uniform embedding | Uniform embedding | Source-stratified with cross-type convergence flag |
| Cost on repeat runs | Full re-embedding | Full re-embedding | Cache pre-pass: zero embedding cost on cached corpus |

### Expected output by corpus size

| Corpus docs | min_cluster_size | Typical theme count |
|---|---|---|
| <10 | 2 | 1-2 |
| 10-100 | 3 | 2-5 |
| 100-200 | 8 | 5-10 |
| 200-600 | 7 | 8-15 |
| >600 | 5 | **15-25** |

### The 2026-05-24 architectural reset (history)

The original v3.8 pipeline silently shipped 13 weak themes when the thick-evidence filter dropped 100%. A first attempt at the fix introduced a 4-tier relaxation policy that admitted single-source, unresolved-citation, and inherited-from-cache themes to hit a 20-theme floor — that violated the user's quality-first principle. After forensic comparison with `internal-solutions-socialresearch/backend/util/BertTopic.py` (the sister service's working architecture), HiC reset to a BERTopic-primary approach with 5 specific HiC-divergences for partner-grade quality:

1. Source-stratified clustering with cross-type centroid merge
2. Coherence pre-filter on top_terms
3. Evidence-density gate at cluster level (before LLM naming)
4. Theme-count targeting by deliverable type
5. Temperature=0 + cluster-signature cache for naming (vs Social Research's 0.1)

The 4-tier relaxation policy is REMOVED. `validate_evidence_tier_distribution.py` Stop hook serves as a canary if any reintroduction attempt slips into the codebase.

---

## 8. Multi-Model Resilience Layer (v4.2)

Replaces single-provider reactive fallback (try OpenAI; on 429 try Gemini) with a four-layer pattern. Lives in `proxy/topic_modeling.py`; should extend to `services/aiRouter.ts` as engineering follow-on.

### The four layers

1. **Content-hash embedding cache** — same `(provider, content)` → cached vector on disk at `sessions/_embedding-cache/`. Provider is part of the key because OpenAI 1536-d and Gemini 3072-d vectors aren't interchangeable. Repeat-corpus runs pay zero embedding cost.
2. **Provider health tracker** — `_provider_health` dict tracks `last_429_at` + `consecutive_429s` + `total_429s`. After a 429, skip the provider for `THROTTLE_COOLDOWN_S = 600` (10 min) in auto-routing. Reset on success.
3. **Per-corpus provider commitment** — once you pick a provider for a corpus, embed everything with that provider. Mid-corpus switching mixes vector spaces and breaks downstream clustering.
4. **Signature-keyed name cache** — for LLM identity-class calls (theme names, persona names), hash the INPUTS to the call (top_terms + sample_titles + research_goal) and cache the OUTPUT. Same inputs → same cached output regardless of which provider would name it fresh. Resolves the determinism gap when `temperature=0` alone isn't strictly deterministic.

### Cache directory map

| Path | Key | Value | Retention |
|---|---|---|---|
| `sessions/_embedding-cache/{hash}.json` | sha256(provider + content) | `{provider, vector}` | Until manually pruned |
| `sessions/_name-cache/{signature}.json` | sha256(top_terms + sample_titles + goal) | `{name, summary, sentiment}` | Until manually pruned |
| `sessions/_topic-cache/topics-{job_id}.json` | job_id (timestamp-based) | Full BERTopic result | Permanent |
| `sessions/_topic-cache/_inflight/{job_id}.json` | job_id | `{status, research_goal, item_count, error}` | Auto-cleared on success; persisted on failure |
| `sessions/_reproducibility-baselines/{hash}.json` | sha256(corpus + goal + frameworks) | identity_fingerprint, first_observed_at, run_count | Permanent; drift detection |

---

## 9. Complete Skill Catalog (66 skills)

All skills live in `.claude/skills/<skill-name>/SKILL.md` with frontmatter (name, description, triggers). Skills are volume-mounted into both the research-generator and research-proxy containers — file changes take effect on next request with no rebuild.

### Synthesis & deliverables (14)

| Skill | Composes with | Purpose |
|---|---|---|
| `theme-analyst` | topic-cluster-to-theme-converter, verbalized-sampling | 6-lens theme extraction from corpus |
| `topic-cluster-to-theme-converter` | BERTopic v2 output | **PRIMARY theme generator** (v4.2); reads BERTopic clusters, names each at temp=0 |
| `theme-yield-guarantee` v2 | topic-cluster-to-theme-converter | Codifies count-from-algorithm-not-policy contract |
| `persona-architect` | verbalized-sampling, source-ranker | Cooper goal-directed personas, JTBD, evidence-density floor |
| `recommendation-architect` | quantification-architect, pre-mortem, stakeholder-lens-auditor | VS-Multi: Defensible Consensus + Non-Obvious Bets |
| `strategy-author` | second-order-thinker, pre-mortem | Rumelt's Kernel; 15-section strategy |
| `strategic-report-writer` | theme-analyst, source-ranker | McKinsey-format whitepaper, 20+ named sources |
| `prd-compiler` | quantification-architect | 16-section PRD with MoSCoW |
| `roadmap-builder` | second-order-thinker, quantification-architect | NOW/NEXT/LATER horizon planning |
| `service-blueprint-mapper` | persona-architect | Bitner 5-component journey + blueprint |
| `gap-analysis-evaluator` | quantification-architect | Gartner 5-level maturity scoring |
| `tech-arch-generator` | theme-analyst | C4 Model node/flow mapping |
| `tech-audit-inspector` | theme-analyst | Systems inventory + consolidation opportunities |
| `competitive-analyst` | analog-finder, source-ranker | Named entity extraction, archetype analysis |

### Quality & depth enhancers (10)

| Skill | Purpose |
|---|---|
| `quantification-architect` | Forces baseline + target + measurement_method + refresh_cadence four-tuple |
| `pre-mortem` | Assumes failure 18 months from now; reasons backward to 5 named failure modes |
| `stakeholder-lens-auditor` | 5 named lenses (CIO/CTO, CFO, CMO, Frontline, Regulator) |
| `analog-finder` | Abstracts challenge to functional pattern; 3+ adjacent-industry analogues |
| `second-order-thinker` | Maps 1st/2nd/3rd-order effects + feedback loops |
| `contradiction-finder` | Surfaces within-corpus contradictions instead of smoothing consensus |
| `source-ranker` | 4-dimension scoring (credibility, recency, relevance, classification); Use/Verify/Cut verdicts |
| `cross-engagement-pattern-miner` | Mines prior sessions for recurring patterns; writes wiki/synthesis/cross-engagement-patterns.md |
| `verbalized-sampling` | k=8 candidates with probability annotation; defeats mode collapse |
| `reinforcement-inference` | Uncertainty-triggered two-pass reasoning |

### Pipeline defense (6)

| Skill | Purpose |
|---|---|
| `ai-output-syntax-repair` | Pre-parse repair for JSON/HTML/SVG/CSS from AI providers |
| `export-paint-sync` | Wraps html2canvas with font-load + image-decode + double-RAF + label-overflow + clip-detection + wordmark-presence checks |
| `fallback-event-surfacing` | Replaces 34 silent fallback sites with structured `degradation_events[]` |
| `rate-limit-pacer` | Provider-aware adaptive concurrency; replaces process-wide semaphore=3 |
| `deterministic-naming-pass` | Temperature=0 + seed-binding contract for every LLM identity-class call |
| `evidence-density-pre-checker` | Audits corpus BEFORE generation; fires upstream remediation if <20 predicted |

### Retrieval & wiki (3)

| Skill | Purpose |
|---|---|
| `wiki-query-expander` | 3-4 angle variants per query; hits distinct vector-space neighborhoods |
| `wiki-reranker` | Cross-encoder reranker on retrieved articles (1-5 scoring) |
| `wiki-synthesizer` | Multi-angle retrieval + thematic clustering + Minto synthesis |

### Slide & visual (7)

| Skill | Purpose |
|---|---|
| `deck-narrative-composer` | 12 content-block narrative; per-slide context injection; VS at narrative |
| `slide-title-lab` | 15 candidate action-titles across 8 formats |
| `nxt-humans-slides` | 15 codified NXT-brand slide templates |
| `nxt-visual-renderer` | NXT design system renderer |
| `html-deliverable-composer` | NXT/NU brand-locked HTML artifacts; 8 information types; 5-7 SVG diagram recipes |
| `design-exemplar-curator` | Matches prototype brief to Behance exemplars |
| `experience-prototype-composer` | Stage 4 prototype composer; strict catalog enforcement |

### Prompt engineering (13)

| Skill | Purpose |
|---|---|
| `diagnose-prompt` | Maps failure patterns to structural fixes |
| `stress-test` | Adversarial input generation with severity scoring |
| `constrain` | Replaces vague instructions with measurable constraints |
| `lock-format` | Designs airtight output specifications |
| `score-prompt` | 5-dimension reliability scoring |
| `trim-prompt` | Strips qualifiers, redundancy, filler |
| `decompose` | Turns monolithic prompts into multi-phase skill systems |
| `guard` | Add failure prevention layers |
| `self-review` | Claude reviews its own changes before execution |
| `drift-check` | Detects drift between outputs from the same prompt |
| `qa-gate` | Validates AI output before reaching the user |
| `preflight` | Full pre-deployment audit |
| `failure-log` / `escape-audit` / `before-after` | Build a structured failure history |

### Workflow & operations (4)

| Skill | Purpose |
|---|---|
| `commit-prepare` | Stages changes + emits structured pre-commit report. Does NOT commit. |
| `git-branch-protocol` | Background ruleset: never-merge-to-main, branch-from-feature, no-commit-without-approval |
| `hic-rebuild-verify` | Rebuilds + verifies the new dist is served by curling bundle and grepping for markers |
| `mcp-service-bootstrap` | Scaffolds new MCP wrapper + core service; encodes 5-step ritual |

### Skill collections (3 directories with sub-skills)

| Collection | Contents | Purpose |
|---|---|---|
| `brands/` | `nu-style/`, `nxt-style/` | Brand-voice sub-skills: voice rules, banned phrases, do/don't catalogs per brand |
| `diagrams/` | `arch-illustrator`, `blueprint-illustrator`, `journey-illustrator`, `org-illustrator`, `roadmap-illustrator` | SVG illustration sub-skills per diagram type |
| `intelligence/` | PDFs, JSON, markdown reference artifacts | Reference knowledge (Karpathy second-brain, reinforcement_inference, financial sources, Northeastern advancement deck, NXT style guide) |

---

## 10. Complete Hook Catalog (30 hooks)

All hooks live in `.claude/hooks/scripts/` and are registered in `.claude/hooks/hooks.json` + `.claude/settings.json`.

### PreToolUse hooks (block-or-allow gates) — 6

| Hook | Trigger | What it blocks |
|---|---|---|
| `precheck_slop.py` | Edit / Write / NotebookEdit | Banned-phrase / meta-narration regex hits in HiC code |
| `precheck_axios_pin.py` | Edit / Write to package.json | Axios version-pin changes (miro=1.6.2; socialresearch=1.7.9) |
| `precheck_wiki_write.py` (v4.2) | Edit / Write to wiki/**.md | Missing required frontmatter; ≥3 broken target links |
| `precheck_main_branch.py` | Bash git merge/push to main | Merges or pushes to main branch |
| `precheck_commit_approval.py` | Bash git commit / push | Commits without explicit approval. Override: `CLAUDE_COMMIT_OK=1` env or `COMMIT_APPROVED` in message |
| `precheck_startup_mode.py` | Bash `npm run dev` in HiC / standalone uvicorn | Wrong startup mode; sacred ports; standalone service starts |

### PostToolUse hooks (informational reminders) — 4

| Hook | Trigger | What it surfaces |
|---|---|---|
| `post_hic_rebuild_reminder.py` | Edit / Write on HiC files | Reminder that research-generator needs `docker compose up -d --build` |
| `post_agent_restart_reminder.py` | Edit / Write on mcp-services/** | Reminder that MCP / agent containers need restart |
| `precheck_orphan_export.py` (v4.2) | TypeScript Write | Warns when new exported symbol has no caller |
| `inject_active_constraints_and_patterns.py` (v4.2) | UserPromptSubmit | Injects deduped learned-constraints + cross-engagement-patterns (6KB budget) |

### Stop / SubagentStop hooks (deliverable validators) — 20

| Hook | What it enforces | Event |
|---|---|---|
| `validate_citations.py` | [CHUNK_NNN] references resolve; named sources only | Stop, SubagentStop |
| `validate_evidence.py` | evidenceBasis fields non-empty + contain specifics | Stop, SubagentStop |
| `validate_titles.py` | Action title compliance (data + verb + named entity) | Stop |
| `validate_source_diversity.py` | ≥60% external sources | Stop |
| `validate_budgets.py` | Content budgets (title 120 / content 200 / quote 250 / narrative 400 / speakerNotes 600 chars) | Stop |
| `validate_quantification.py` (v4.2) | Recommendations have baseline + target + measurement_method + refresh_cadence | Stop, SubagentStop |
| `validate_evidence_recency.py` (v4.2) | Stale citation ratio by topic volatility tier | Stop |
| `validate_deliverable_coherence.py` (v4.2) | Personas ↔ recommendations ↔ roadmap consistency | Stop |
| `validate_ai_output_syntax.py` (v4.2) | Embedded JSON/HTML repair-or-fail | Stop |
| `validate_citation_resolution.py` (v4.2) | No raw [CHUNK_NNN] in user-visible; no 'unknown'/'tbd'/'various sources' placeholders | Stop |
| `validate_minimum_yield.py` (v4.2) | Themes ≥4, gaps ≥5, recommendations ≥5, personas ≥3 | Stop |
| `validate_slide_variety.py` (v4.2) | min(7, N/3) distinct templates; rejects unknown templates | Stop |
| `validate_no_silent_fallback.py` (v4.2) | Detects degraded paths (themes without depth, recs without quantification, calibration=NO-DATA) | Stop |
| `validate_topic_model_completion.py` (v4.2) | Orphan topic-model job IDs | Stop |
| `validate_framework_page_exists.py` (v4.2) | Required wiki/frameworks/<type>.md + wiki/anti-patterns/<type>.md present | Stop |
| `validate_corpus_relevance_distribution.py` (v4.2) | Fails if >85% of retrieved items are LOW relevance | Stop |
| `validate_theme_yield.py` (v4.2) | ≥20 themes shipped (backstop) | Stop |
| `validate_evidence_tier_distribution.py` (v4.2) | Canary: any reappearance of relaxation tiers above 30% combined | Stop |
| `validate_theme_reproducibility.py` (v4.2) | Same reproducibility_hash → same theme identity; drift detection | Stop |
| `pre_export_dom_audit.py` (v4.2) | Orphan editor-only elements + missing `body[data-export-mode]` CSS | Stop |

**Helper:** `_lib.py` — shared utilities used by multiple hooks.

---

## 11. Subagent Fleet (10 subagents)

All subagents live in `.claude/agents/<agent-name>.md` and are invoked by the Agent tool with explicit subagent_type or auto-fire on specific events.

| Subagent | Trigger | Purpose |
|---|---|---|
| `hic-output-qa` | Auto on Stop event | Independent QA reviewer; audits citation diversity, evidence hierarchy, action-title compliance, content budgets, banned phrases |
| `parallel-runner` | Manual | Orchestrates parallel execution of independent deliverable skills |
| `platform-health` | Manual / restart | Multi-service health auditor; walks docker-compose-all.yml; verifies tool discovery |
| `evidence-quality-auditor` (v4.2) | Parallel with hic-output-qa | Per-citation Use/Verify/Cut verdict at scale using source-ranker rubric |
| `dissent-panel` (v4.2) | `#dissent` hashtag | 5 named critics (Bain partner / burned CIO / frontline / CFO / regulator) emit 200-word adversarial critiques |
| `pre-mortem-runner` (v4.2) | Auto-fires on strategy section Stop | Runs pre-mortem skill against every recommendation; emits risk_register[] |
| `export-render-verifier` (v4.2) | `#verify-export` | Playwright-driven; screenshots every slide; fails on 8 defect classes |
| `orphan-code-auditor` (v4.2) | Weekly `/loop` | Static-imports-graph scan; flags exported symbols with zero callers |
| `wiki-curator` (v4.2) | Weekly `/loop` | Auto-fixes broken links, missing frontmatter, orphan pages |
| `quota-monitor` (v4.2) | `/loop 15m` during active sessions | Observes provider quota; surfaces "approaching quota" warnings |

---

## 12. Standing Rules (Agent Memory)

These rules govern every architecture decision the agent makes. They live in `C:\Users\<user>\.claude\projects\D--NXT-HUMANS-AI-CX-WORKBENCH\memory\` and auto-load into every Claude Code session.

### Rule 1 — Quality first, never relax the default
**File:** `feedback_quality_first_never_relax_default.md`
**Triggered by:** Any "floor" / "guarantee" / "minimum count" request
**Forbids:** Meeting count floors by accepting weaker evidence. Floors are met by upstream quality (better candidate generation, broader retrieval) or by failing loudly. Relaxation tiers are emergency-only and audited.
**Example violation rejected:** The 4-tier theme-yield relaxation policy (single_source / unresolved_citation / inherited_from_cache tiers) shipped 2026-05-24 and was REVERTED the same day.

### Rule 2 — Determinism first for cached runs
**File:** `feedback_determinism_first_for_cached_runs.md`
**Triggered by:** Theme synthesis, persona naming, recommendation titling
**Forbids:** Non-determinism in deliverable identity (names, memberships, structural shape) for cached corpus + same goal. Variance is opt-in and tagged.
**How it's enforced:** BERTopic `random_state=42` on UMAP; LLM naming at `temperature=0`; signature-keyed name cache; `validate_theme_reproducibility.py` Stop hook with baseline storage at `sessions/_reproducibility-baselines/`.

### Rule 3 — Check sister services FIRST
**File:** `feedback_check_sister_services_first.md`
**Triggered by:** Any new HiC architecture for a capability that exists in a sister IA Suite service
**Forbids (failure mode A):** Inventing from scratch without reading `internal-solutions-socialresearch/`, `internal-solutions-journeymapper/`, `internal-solutions-miro-generator/`, etc.
**Forbids (failure mode B):** Copying a sister service verbatim without examining context divergences. HiC's heterogeneous corpus + partner-grade audience + cross-deliverable identity + citation discipline justify deliberate divergences.
**Right move:** Informed divergence with each divergence named explicitly. (See Section 7 — the 5 HiC-specific divergences from Social Research's BertTopic.py.)

### Rule 4 — Multi-model resilience pattern
**File:** `feedback_multi_model_resilience_pattern.md`
**Triggered by:** Any AI integration
**Forbids:** Single-provider designs. Default pattern: content-hash cache (provider-keyed) + provider health tracker + per-corpus commitment + signature-keyed identity cache.

### Rule 5 — Finish then test, no phase gates
**File:** `feedback_finish_then_test_no_phase_gates.md`
**Triggered by:** Multi-part user goals
**Forbids:** Pausing between sub-phases to ask "want me to continue?" The authorization is implicit when the goal is stated. Execute fully, then validate.
**Exceptions:** Genuinely destructive actions, missing required user input, unresolvable ambiguity.

### Rule 6 — Never commit without explicit approval
**Files:** `feedback_no_commit_without_approval.md`, `feedback_never_merge_to_main.md`
**Triggered by:** Always
**Forbids:** Auto-committing changes. Stage and report; commit awaits explicit user approval. Never merge to main.
**Enforced by:** `precheck_commit_approval.py` + `precheck_main_branch.py` PreToolUse hooks.

### Other governance memory entries

- `feedback_no_guessing_validate_assumptions.md` — Read code or ask before asserting
- `feedback_verify_model_capabilities.md` — Verify provider capabilities before claiming
- `feedback_no_self_referential_output.md` — Never reference the deck / the research / "based on the research" in deliverables
- `feedback_hic_research_rebuild.md` — Docker rebuild ritual on every HiC frontend change
- `feedback_test_before_handoff.md` — HTTP 200 is not enough; verify rendering before claiming done
- `feedback_sacred_ports.md` — Port 3000 is Social Research; HiC is :5011
- `feedback_no_individual_starts.md` — Never start services individually; always docker-compose-all.yml
- `feedback_brainstorming_discipline.md` — Feature shape before architecture in brainstorming
- `feedback_hic_log_audit_pattern.md` — 15-symptom checklist for HiC console log audits
- `feedback_export_visual_qa_pattern.md` — 8-point checklist for preview-vs-export defects

---

## 13. Wiki Knowledge Base

The wiki at `humans-in-control-research/hic-workspace/wiki/` is a persistent LLM-maintained knowledge layer.

### Three concentric tiers

```
hic-workspace/
├── sources/        ← raw, immutable client uploads + research files
├── wiki/           ← LLM-maintained markdown knowledge base
│   ├── frameworks/         ← deliverable specs (13 pages)
│   ├── anti-patterns/      ← failure-mode pages per deliverable
│   ├── benchmarks/         ← baseline data per domain
│   ├── evidence/           ← topic-specific evidence aggregates
│   ├── industries/         ← industry-specific context
│   ├── brand/              ← NXT/NU brand specs
│   ├── engagements/<slug>/ ← per-engagement themes.json, manifest.json, personas.json
│   ├── articles/           ← ~3,800 ingested external research with embedding index
│   ├── social-intelligence/← ~3,700 persisted Reddit-deep posts
│   ├── transcripts/        ← YouTube channel transcripts
│   ├── inspiration-hub/    ← 92+ AI Experience Patterns catalog
│   └── synthesis/          ← 12 auto-generated logs
└── AGENTS.md       ← THE wiki schema; co-evolves with wiki content
```

### Framework pages (deliverable specs)

| File | Deliverable type |
|---|---|
| `frameworks/personas.md` | Personas (Cooper goal-directed + JTBD) |
| `frameworks/themes.md` | Themes (BERTopic v2 + LLM naming) |
| `frameworks/strategy.md` | Strategy (Rumelt's Kernel) |
| `frameworks/roadmap.md` | Roadmap (NOW/NEXT/LATER) |
| `frameworks/prd.md` | PRD (16-section Cagan/SVPG) |
| `frameworks/blueprint.md` | Service blueprint (Bitner 5-component) |
| `frameworks/architecture.md` | Tech architecture (C4 Model) |
| `frameworks/tech-audit.md` | Tech audit |
| `frameworks/gap-analysis.md` | Gap analysis (Gartner 5-level) |
| `frameworks/competitive.md` | Competitive analysis |
| `frameworks/deck.md` | Slide deck composition |
| `frameworks/script.md` | Marketing script |
| `frameworks/case-study.md` | **Case study (NEW v4.2)** — 10-section spec |

### Synthesis logs (auto-generated, living)

| File | Purpose |
|---|---|
| `learned-constraints.md` | User edit-history constraints (auto-injected via UserPromptSubmit hook) |
| `cross-engagement-patterns.md` | Output of cross-engagement-pattern-miner skill |
| `export-failures.md` | Living log of visual defects (NEW v4.2) |
| `generation-failures.md` | Living log of pipeline failures (NEW v4.2) |
| `lint-YYYY-MM-DD.md` | Per-date wiki lint reports |
| `curator-log.md` | Wiki-curator weekly run results |
| `uncertainty-ledger.md` | Reinforcement inference uncertainty trail |
| `verifier-history.md` | Verifier pass results |
| `quality-scores.md` | Per-run quality scoring |
| `improvement-lineage.md` | Quality improvement tracking |
| `enhancement-plan.md` | Pending improvements |
| `compile-history/` | Wiki compile history snapshots |

### Wiki access patterns

| Pattern | When used |
|---|---|
| **`loadGenerationContext()`** in wikiService.ts | Before every deliverable generation; pulls framework + anti-patterns + brand + benchmarks |
| **`fetch_wiki_articles` tool** in chat | Mid-conversation semantic retrieval from articles/ |
| **`fetch_wiki_resource` tool** in chat | Read a specific wiki page by path |
| **Vite middleware plugin** (dev) | Serves wiki markdown at `/hic-workspace/wiki/` for SPA access |
| **nginx static** (Docker prod) | Wiki content copied at build; volume-mount for runtime writes |

---

## 14. Model Routing

`services/aiRouter.ts` is the single source of truth for model selection.

| Category | Default | Alternatives |
|---|---|---|
| research | `claude-opus-4-7` | claude-sonnet-4-6, gpt-5.4, gemini-3.1-pro-preview, gemini-2.5-flash |
| fast_generation | `gpt-5.5-mini` | claude-sonnet-4-6, gemini-2.5-flash |
| vision | `claude-opus-4-7` | gpt-5.4, gemini-3.1-pro-preview |
| image/video | `gemini-2.5-flash` | imagen-4.0, veo-3.1 via Gemini API |
| topic-model naming | `claude-opus-4-6` at temperature=0 | Heuristic top-terms naming on hard fail |
| embeddings (proxy) | `text-embedding-3-small` (OpenAI) | Gemini `gemini-embedding-001` on OpenAI 429 |

### Provider adapter capabilities

- **Claude Opus 4.7** supports assistant-message prefill. Sonnet does not. Anything using a prefilled-continuation pattern must stay on Opus.
- **OpenAI** `seed` parameter is honored on chat completions; provides reproducibility under temperature=0.
- **Gemini** has `responseSchemaSeed` on some endpoints.
- **Multi-model resilience pattern** (Section 8) is the default for any new AI call.

---

## 15. Python Proxy & Services

The FastAPI proxy at `proxy/app.py` exposes ~50 endpoints across 6 families:

| Family | Endpoints |
|---|---|
| AI fan-out | `/api/ai/anthropic`, `/api/ai/gemini`, `/api/ai/openai` |
| Search | `/api/search/<source_id>`, `/api/multi-search` |
| Wiki | `/api/wiki/{read,write,write-article,index,fetch-articles,list}` |
| Topic modeling | `/api/topic-model/{analyze,status/<job_id>}` (v2 pipeline + structured 404 with sentinel), `/api/topic-cache/{list,read/<file>}` |
| Ingestion | `/api/parse-upload`, `/api/extract-pdf`, `/api/transcribe-youtube` |
| Artifacts (v3.8+) | `/api/artifacts/{save,list,fetch/<slug>,delete/<slug>,view/<slug>}` |

### `topic_modeling.py` architecture (v4.2)

```python
# Primary pipelines
run_pipeline           # v1 — original Reddit-deep callers (backward compat)
run_pipeline_v2        # v2 — HiC smart pipeline (Section 7)

# Embedding
embed_documents        # multi-model with cache pre-pass + provider health routing
_embed_via_openai      # OpenAI text-embedding-3-small
_embed_via_gemini      # Gemini gemini-embedding-001

# Clustering
_reduce_and_cluster              # UMAP + HDBSCAN with random_state=42
_source_stratified_cluster       # source-bucket clustering with cross-type centroid merge
_ctfidf_top_terms                # deterministic top-terms per cluster

# Quality gates
_is_cluster_coherent             # coherence pre-filter
_distinct_sources_in_cluster     # evidence-density check
_apply_quality_gates             # combines coherence + density before LLM naming
_infer_source_type               # heuristic source-type classification

# LLM naming
_llm_label_clusters              # Anthropic at temperature=0 with signature cache

# Caching helpers
_hash_content                    # sha256(provider + content) for embedding cache
_cluster_signature               # sha256(top_terms + sample_titles + goal) for name cache
_load_cached_embedding           # disk-backed embedding cache read
_save_cached_embedding           # disk-backed embedding cache write
_load_cached_name                # disk-backed name cache read
_save_cached_name                # disk-backed name cache write
_provider_is_healthy             # 429 cooldown check
_record_provider_429             # mark provider unhealthy
_record_provider_success         # reset consecutive_429s counter

# Job persistence
_topic_job_sentinel_path         # disk path for in-flight job markers
_write_topic_sentinel            # persist job state to disk for proxy-restart recovery
_clear_topic_sentinel            # remove sentinel on success
```

---

## 16. Export Pipeline

Three export targets: PPTX (pptxgenjs), PDF (jspdf), PNG (html-to-image / html2canvas).

### Export flow

1. User clicks Export Deck PPTX/PDF or per-slide PNG
2. `export-paint-sync` skill prep: fonts loaded (`document.fonts.ready`), images decoded, double-RAF for React stability, `body[data-export-mode]` CSS class set to hide editor UI
3. Per-slide capture via html2canvas with `onclone` `@font-face` re-injection (defeats html2canvas iframe isolation font loss)
4. PPTX: pptxgenjs emits slides; per-slide template implementations in `components/slideTemplates/pptx.ts`
5. PDF: jspdf assembles pages; pixel-to-pt downscaling
6. PNG: per-slide image download
7. `export-render-verifier` subagent (if Playwright MCP installed): drives the actual export, screenshots every slide, validates against 8 defect classes

### 8 defect classes the export-render-verifier catches

1. **Blank slide** — pixel entropy / OCR text count below threshold
2. **Leaked editor UI** — OCR for Delete/Edit/Save/Cancel keywords
3. **Preview-export parity drift** — perceptual hash distance
4. **Font fallback** — glyph shape similarity to expected brand font
5. **Slide count mismatch** — deliverable.slides.length vs export pages
6. **Section label mid-word break** — `CHALLENG / E` / `APPROAC / H` pattern
7. **Brand wordmark missing** in sidebar
8. **Attribution clipping** — text bleeds off panel edge

---

## 17. NXT Brand System

| Token | NXT | NU |
|---|---|---|
| Black | `#0D0D0D` | `#0D0D0D` |
| Primary accent | Chartreuse `#B8B800` | NU Red `#C8102E` |
| Secondary accent | Cyan `#00B7C3` | NU Violet |
| Teal (headers) | `#115054` | — |
| Rust (negative) | `#CC6644` | — |
| Body font | Archivo (200-900) | Roboto (300-700) |
| Display font | Bebas Neue | Spectral |
| Mono font | JetBrains Mono | Roboto Mono |
| Separator | `·` (U+00B7) | `·` (U+00B7) — never `/` |
| Border radius | 2-4px | 2-4px |
| Shadows | none | none |

### NU design gallery

At `public/nu-design-gallery/` — 13 polished single-canvas HTML exemplars (one per deliverable type plus org-chart) + style guide + **GUIDE.md with the thirteen don'ts** (no methodology blurbs, no per-slide source strips, no "EVIDENCE GAP" / "TBD" annotations, no AI-generated decorative illustrations).

---

## 18. Operations & Troubleshooting

### Required environment variables

| Variable | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` (also `API_KEY`) | Primary reasoning model + embeddings fallback | Yes |
| `ANTHROPIC_API_KEY` | Claude Opus 4.7 (topic-model naming, brief generator) | Yes |
| `OPENAI_API_KEY` | Primary embeddings (text-embedding-3-small) | Yes for quality |
| `YOUTUBE_API_KEY` | Channel discovery scheduler | Optional |

### Docker rebuild rituals

```bash
# Frontend changes (no HMR)
docker compose -f docker-compose-all.yml up -d --build research-generator
# Hard-refresh browser

# Backend changes (proxy)
docker compose -f docker-compose-all.yml up -d --build research-proxy

# Full reset (destroys volumes)
docker compose -f docker-compose-all.yml down -v && ./launch.sh

# Quick start
./launch.sh                          # Linux/Mac/Git Bash
.\start-platform.ps1                 # Windows PowerShell

# Status
docker compose -f docker-compose-all.yml ps

# Logs
docker compose -f docker-compose-all.yml logs -f agent

# Port conflicts
python port_scanner.py --fix
```

The `.claude/skills/` directory is volume-mounted into BOTH containers — skill file changes take effect on the next request without rebuild.

### Common failure modes (cross-reference `wiki/synthesis/generation-failures.md`)

| Symptom in log | Validator that catches it | Likely root cause |
|---|---|---|
| Thick-evidence filter dropped ALL N themes | validate_no_silent_fallback (THICK_EVIDENCE_FALLBACK telltale) | Corpus too thin OR missing framework page |
| validate_no_silent_fallback fires CONFIDENCE_NO_DATA | Same | Model didn't emit calibration metadata |
| /wiki/frameworks/*.md — 404 | validate_framework_page_exists | Missing framework page |
| topic-model/status/<id> — 404 | validate_topic_model_completion | Proxy restart mid-flight OR job_id stale |
| relevance scoring LOW > 85% | validate_corpus_relevance_distribution | Search query refinement broken OR framework page missing |
| OpenAI returned 429: quota exceeded | quota-monitor subagent | Daily quota hit; provider health tracker auto-routes |
| Unterminated string in JSON at position N | validate_ai_output_syntax | Max-tokens overflow; ai-output-syntax-repair attempts truncation close |
| Connector jina failed: signal timed out | fallback-event-surfacing | Jina rate-limit; rate-limit-pacer should pace future calls |
| 27 of 30 blank slides in export | export-render-verifier | html2canvas paint race; export-paint-sync defends |
| Mid-word break in section labels (CHALLENG / E) | export-render-verifier Check F | html2canvas container-width divergence + font fallback |

### MCP server status check

```bash
claude mcp list

# Expected:
# playwright: ✓ Connected
# context7:   ✓ Connected
# pencil:     ✓ Connected
# microsoft365: ✓ Connected
# figma:      ! Needs authentication (optional)
# hubspot:    ! Needs authentication (optional)
# research-data: ✗ Failed to connect (KNOWN ISSUE — see Section 19)
```

---

## 19. Incomplete Implementations

The "finish-then-test" standing rule means most architecture work ships complete. The following are skill / hook / subagent CONTRACTS that exist in `.claude/` as live specs but have engineering wiring still pending in HiC's TypeScript / Python:

| Capability | Spec location | Status | What's missing |
|---|---|---|---|
| v2 topic modeling pipeline | `proxy/topic_modeling.py` `run_pipeline_v2` | **SHIPPED** | Wired into `app.py` `_run_topic_job` 2026-05-24. Falls back to v1 on error. |
| Multi-model resilience (embeddings) | `proxy/topic_modeling.py` | **SHIPPED** | Live in `embed_documents`. Should extend to `services/aiRouter.ts` for all AI calls. |
| Multi-model resilience (LLM naming) | `proxy/topic_modeling.py` | **SHIPPED** | Live in `_llm_label_clusters`. Should extend to deliverable-generation calls in `services/geminiService.ts`. |
| Theme-count targeting | `services/geminiService.ts` generateThemes() | **SHIPPED** | Reads from `outputMode` / `deliverableType`. Callers should set the field explicitly per deliverable. |
| `fallback-event-surfacing` skill (event taxonomy) | `.claude/skills/fallback-event-surfacing/SKILL.md` | **CONTRACT ONLY** | 34 silent fallback sites listed in skill spec; `surfacedFallback()` wrapper needs porting to each site. `geminiService.ts` ~lines 1467, 1500, 1569, 1749, 1876, 2839 are top priority. |
| `rate-limit-pacer` skill (per-provider token-bucket) | `.claude/skills/rate-limit-pacer/SKILL.md` | **CONTRACT ONLY** | `proxy/app.py` still uses process-wide semaphore=3 for Jina. Per-provider token bucket needs implementing in `services/rateLimit.ts`. |
| `ai-output-syntax-repair` (TypeScript port) | `.claude/skills/ai-output-syntax-repair/SKILL.md` | **CONTRACT ONLY** | Python validator hook is live; TS implementation needs porting to `services/aiOutputRepair.ts` and wiring into provider adapters. |
| `export-paint-sync` (TypeScript port) | `.claude/skills/export-paint-sync/SKILL.md` | **CONTRACT ONLY** | `paintSync()` function spec is complete; needs porting to `services/exportService.ts` and wiring around every `html2canvas()` call. CSS rule `body[data-export-mode] .editor-only { display: none !important; }` needs adding to brand stylesheet. |
| `topic-cluster-to-theme-converter` (TypeScript wiring) | `.claude/skills/topic-cluster-to-theme-converter/SKILL.md` | **CONTRACT ONLY** | `services/geminiService.ts` `generateThemes()` should call `/api/topic-model/analyze` FIRST (v2 BERTopic-primary path), then LLM-name each cluster. Currently still uses legacy LLM extraction; v2 pipeline exists in proxy but isn't the primary caller path. |
| `cross-engagement-pattern-miner` wiki injection | `.claude/skills/cross-engagement-pattern-miner/SKILL.md` | **PARTIAL** | Output file `wiki/synthesis/cross-engagement-patterns.md` not read by `loadGenerationContext()` by default. Add `readWikiPage('synthesis/cross-engagement-patterns.md')` to wikiService.ts. |
| `case-study` framework + slide template | `wiki/frameworks/case-study.md` | **SHIPPED** | Framework page authored 2026-05-24. Slide template `components/slideTemplates/web.tsx` + `pptx.ts` need section-label column width sync to enforce ≤8-char label rule. |
| Editor-only CSS contract | `wiki/synthesis/export-failures.md` | **PARTIAL** | `pre_export_dom_audit.py` hook found 10 orphan editor buttons in `CorpusChatPanel.tsx` + `AnalysisCheckpoint.tsx`. They need `className="editor-only"` added; CSS rule needs adding to brand stylesheet. |
| research-data MCP server | `.claude/mcp-servers/research-data-server.py` | **FAILED CONNECT** | `claude mcp list` shows "Failed to connect". Likely cause: missing `mcp` Python SDK in venv OR proxy not running. Manual investigation needed. |
| Playwright MCP-backed subagents | `.claude/agents/export-render-verifier.md` | **READY** | Playwright MCP confirmed connected. Subagent ready to invoke on demand via `#verify-export`. |
| Scheduled remote agents | `/schedule weekly wiki-curator-weekly` + `orphan-code-auditor-weekly` | **CREATED, BLOCKED** | Created 2026-05-24 but require Claude GitHub App on `NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH`. Not installed. Routines exist; runs will fail until App installed. Alternative: use local `/loop` instead. |

---

## 20. Active Backlog & Pending Engineering

Tracked work items beyond the wiring gaps above. Cross-references `humans-in-control-research/plans/` directory + the `wiki/synthesis/*-failures.md` living logs.

### Architecture follow-ons (priority order)

1. **geminiService.ts `generateThemes()` primary-path rewire** — switch to BERTopic-primary flow calling `/api/topic-model/analyze` (v2 with target_topic_count) and LLM-naming each cluster at temperature=0. Currently the legacy LLM extraction path still ships. **Highest-leverage remaining patch.**
2. **Port multi-model resilience to `services/aiRouter.ts`** — bring the four-layer cache + provider-health + signature-key pattern to ALL AI calls, not just topic_modeling.py. Affects deliverable generation, persona enrichment, slide titling.
3. **Port `ai-output-syntax-repair` to TypeScript** — `services/aiOutputRepair.ts` new file; wire into every provider adapter response parser.
4. **Port `export-paint-sync` to `services/exportService.ts`** — wrap every html2canvas call; add CSS rule to brand stylesheet.
5. **Fix the 10 orphan editor buttons** in `CorpusChatPanel.tsx` + `AnalysisCheckpoint.tsx` — add `className="editor-only"`; verify `body[data-export-mode] .editor-only { display: none !important; }` rule.
6. **Sweep 12 temperature>0 sites in `geminiService.ts`** — classify each per `deterministic-naming-pass` skill rubric; tighten identity-class calls to temperature=0.
7. **topic-cluster-to-theme-converter primary wiring** — the v2 pipeline exists in proxy but geminiService still drives the legacy LLM extraction path. Need new TypeScript service file.

### Substrate health

1. **Cache retention policy** — `sessions/_embedding-cache/` and `sessions/_name-cache/` grow without bound. Add LRU pruning or TTL cleanup.
2. **Wiki cleanup** — 79 real broken links + 88 frontmatter-fixable pages identified by `wiki-curator` 2026-05-24 baseline. Schedule weekly auto-curator runs.
3. **Orphan code resolution** — 47 orphan exports, 11 high-severity. Decide: wire or delete each.
4. **Topic-modeling job sentinel cleanup** — failed jobs persist their sentinel forever. Add cleanup after N days.

### Observability

1. **Reproducibility hash stamping** — every deliverable should carry `reproducibility_hash` at top level.
2. **Degradation events surfacing in UI** — the `fallback-event-surfacing` skill defines the taxonomy and the validator catches missing events, but the Brain Status notice in `CorpusChatPanel.tsx` doesn't render them yet.
3. **Cost telemetry** — `quota-monitor` writes to `wiki/synthesis/cost-telemetry.md` but the file doesn't exist yet.

### Quality gates

1. **research-data MCP reconnect** — shows "Failed to connect". Investigation needed.
2. **Slide template / pptx renderer sync** — `components/slideTemplates/types.ts` defines 18 templates. The `web.tsx` and `pptx.ts` renderers must stay in lockstep.
3. **Section-label column width sync** — case-study template requires section labels ≤8 chars.
4. **Scheduled remote agents** — created routines for wiki-curator-weekly + orphan-code-auditor-weekly but they require Claude GitHub App on the repo (not installed).

### Active plans in `humans-in-control-research/plans/`

- `hic-honest-audit-and-remediation-2026-05-23.md` — the audit doc that prompted today's pipeline hardening
- `hic-chunking-and-output-quality-plan.md` — 7 chunked generators, 6 wired, 1 still orphan (Blueprint)
- `hic-self-improvement-loop-plan.md` — verifier pass, compile loop, per-section improve buttons
- `html-as-default-output-uplift.md` — sprints H1-H7; some sprints pending
- `karpathy-second-brain-uplift.md` — v4.0 work, mostly shipped; some contradiction detector work pending
- `reinforcement-inference-uplift.md` — service exists; wrapper integration pending
- `verbalized-sampling-uplift.md` — VS at theme + recommendation + Stage 1; persona Phase A pending

---

## 21. Documentation File Map

HiC's documentation is distributed across five layers by audience.

### Layer 1 — User-facing docs (~18 files)

- `humans-in-control-research/public/documentation.html` — operator doc behind the "Documentation" link in the SPA top nav (the v4.2 rewrite from this session)
- Root: `README.md`, `README-DOCKER.md`, `README-GIT.md`, `README-LAUNCHER.md`, `README-ONE-SCRIPT.md`
- Root: `EXECUTIVE_SUMMARY_INTELLIGENCE_AUGMENTATION_SUITE.md`, `INTELLIGENCE_AUGMENTATION_WHITEPAPER.md`, `NXT_HUMANS_TRAINING_MANUALS.md`, `NXT_HUMANS_WORKBENCH_PRD.md`, `HIC_PIPELINE_MODEL_AUDIT_2026-05-04.md`
- HiC: `DESIGN.md`, `HUMANS_IN_CONTROL_QA_DOCUMENTATION.md`, `KNOWLEDGE_GRAPH_DEEP_DIVE.md`, `STRATEGY_DECK_PIPELINE_AUDIT.md`, `REARCHITECTURE_DEVELOPMENT_PLAN.md`, `V3_DEVELOPMENT_PLAN.md`, `HIC_ARTIFACT_SKILLS_REFERENCE.md`, `HANDOFF_2026_05_14_COST_AND_T4.md`, `changelog.md`, `README.md`
- NU design gallery: `public/nu-design-gallery/GUIDE.md`, `README.md`, `HANDOFF-CHAT.md`
- Cross-service: `mcp-agent-architecture.md`, `LAUNCHPAD_ANALYSIS_AND_CLEANUP.md`

### Layer 2 — Agent-operating rules (auto-loaded into Claude Code sessions)

- `CLAUDE.md` (root) — platform-wide overview
- `.claude/CLAUDE.md` — output discipline: 350+ banned phrases, citation protocol, consulting frameworks
- `humans-in-control-research/CLAUDE.md` — HiC architecture specifics
- `C:\Users\<user>\.claude\projects\D--NXT-HUMANS-AI-CX-WORKBENCH\memory\MEMORY.md` — persistent feedback memory (33 entries)
- `hic-workspace/AGENTS.md` — wiki schema

### Layer 3 — Component-level specs

- 66 SKILL.md files at `.claude/skills/<skill-name>/SKILL.md`
- 10 subagent .md files at `.claude/agents/<agent-name>.md`

### Layer 4 — Wiki content (8,406 .md files, LLM-readable RAG store)

- See Section 13 for full structure.

### Layer 5 — Active work tracking

- `humans-in-control-research/plans/*.md` (7 active plans)
- `humans-in-control-research/design-desk/` (deferred items)

### This file

- `HANDOFF_HIC_COMPREHENSIVE_2026-05-24.md` — the single-file comprehensive handoff (this document). Lives at repo root.

---

## 22. Engineer Onboarding Checklist

For a new engineer joining HiC. Estimated time: half a day to complete this checklist; full productivity within a week.

### Day 1 — Read and understand

- [ ] Read this entire handoff document (Sections 1-23)
- [ ] Read `CLAUDE.md` (root)
- [ ] Read `.claude/CLAUDE.md`
- [ ] Read `humans-in-control-research/CLAUDE.md`
- [ ] Skim the 33 memory entries (especially the 6 standing-rule entries)
- [ ] Read `hic-workspace/AGENTS.md` (wiki schema)
- [ ] Read the most recent `humans-in-control-research/HANDOFF_*.md` for in-flight work context

### Day 1 — Set up the environment

- [ ] Clone the repo + the sibling `NXT-Agency/` repo
- [ ] Install Docker Desktop
- [ ] Set environment variables: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional: `YOUTUBE_API_KEY`)
- [ ] Run `./launch.sh` (or `.\start-platform.ps1` on Windows)
- [ ] Verify all services healthy: `docker compose -f docker-compose-all.yml ps`
- [ ] Open HiC at `http://localhost:5011`
- [ ] Verify the Documentation link in the top nav serves the v4.2 doc
- [ ] Run `claude mcp list` and confirm Playwright + context7 + Microsoft 365 are connected

### Day 1 — First research run

- [ ] Enter a test goal (e.g., "Best practices for university co-op programs in 2026")
- [ ] Click Collect Data
- [ ] Watch the Analyst Desk populate
- [ ] Verify 15-25 themes generated (BERTopic v2 auto-scaled)
- [ ] Click a convergent-evidence theme; inspect citations
- [ ] Try `#help` in chat to see the live hashtag reference
- [ ] Try `#brief Why first-year preparation matters` to generate an HTML artifact
- [ ] Export the deck (PPTX); verify it renders correctly

### Day 2-3 — Explore architecture

- [ ] Read `services/geminiService.ts` `generateThemes()` (around line 1340)
- [ ] Read `proxy/topic_modeling.py` `run_pipeline_v2` and the multi-model resilience helpers
- [ ] Read `services/slidePostProcessor.ts` to understand runtime output discipline
- [ ] Read `services/wikiService.ts` `loadGenerationContext()` to understand the wiki RAG injection
- [ ] Inspect a SKILL.md file (try `.claude/skills/pre-mortem/SKILL.md`) to understand the skill format
- [ ] Inspect a Stop hook (try `.claude/hooks/scripts/validate_quantification.py`) to understand the hook contract

### Day 4-5 — Make a change

- [ ] Pick a small Backlog item (Section 20)
- [ ] Branch from latest `HiC-*` feature branch (NEVER from main)
- [ ] Make the change
- [ ] Rebuild: `docker compose -f docker-compose-all.yml up -d --build research-generator` (and/or `research-proxy`)
- [ ] Test end-to-end in the browser
- [ ] Stage changes with `git add` (do NOT commit)
- [ ] Show the staged diff to the owner; await commit approval

### Week 2 — Take on a Backlog item

- [ ] Discuss with the owner which Backlog item to tackle
- [ ] Read the relevant SKILL.md spec(s) for the capability
- [ ] Check if a sister IA Suite service already implements it (Standing Rule 3)
- [ ] Implement, test, document — finish before pausing (Standing Rule 5)
- [ ] Update the relevant `wiki/synthesis/*-failures.md` log if the work was driven by a failure
- [ ] Update `HANDOFF_HIC_COMPREHENSIVE_*.md` with what shipped

---

## 23. Glossary

| Term | Definition |
|---|---|
| **Analyst Desk** | HiC's dashboard surface; treemap of themes with breadcrumb drill-down |
| **Analytical Lens** | Goal-driven preset that picks default source categories (general_cx / fundraising / student_learner / digital_product / enterprise_tech / custom) |
| **BERTopic** | Topic modeling library combining UMAP + HDBSCAN + c-TF-IDF. HiC uses v2 pipeline with HiC-specific divergences. Reference: Maarten Grootendorst 2022. |
| **BroadcastChannel** | Browser API for cross-window sync. HiC uses `designDeskStore.v1.sync` channel. |
| **Brain Status** | Inline UI notice rendering `degradation_events[]` from the receipt |
| **c-TF-IDF** | Class-based TF-IDF; computes term distinctiveness per cluster vs the rest of the corpus. Deterministic. |
| **CHUNK_NNN** | Citation reference token; resolved at output time by `citationResolver.ts` to `SourceName: ArticleTitle` |
| **Convergent evidence** | Theme flag (v4.2) marking clusters that merged across ≥2 source types (academic + news, etc.) |
| **Cooper goal-directed** | Persona methodology (Alan Cooper 1999); 3-tier goals: Life / Experience / Functional |
| **Data fabric** | HiC's collection architecture; 200+ connectors, 8 connector kinds, parallel orchestration |
| **Degradation event** | Structured record (kind, stage, detail, timestamp) emitted when the pipeline falls back from its preferred path |
| **Designer window** | Dedicated browser window opened by hashtag commands; 1920×1080 HTML artifact canvas |
| **Determinism layer** | Identity fields (theme names, persona names, cluster memberships) MUST be reproducible across runs with same corpus + goal. Variance allowed only on tagged exploratory fields. |
| **Evidence tier** | Per-theme marker. v4.2 ships only `thick` (≥2 distinct named sources). Tier-relaxation values (single_source / unresolved_citation / inherited_from_cache) are reserved as emergency canaries. |
| **HDBSCAN** | Hierarchical Density-Based Spatial Clustering; HiC uses `cluster_selection_method='leaf'` for finer-grained themes |
| **JTBD** | Jobs to Be Done (Christensen / Ulwick); mandatory format on personas: "When [situation], I want to [motivation], so I can [outcome]." |
| **Knowledge Library** | Cross-engagement Themes tab (v4.1+); reads from `sessions/_topic-cache/` via `/api/topic-cache/*` |
| **MEDDPICC** | B2B sales qualification framework |
| **Minto Pyramid** | "Answer first, supporting arguments under" — mandatory output structure for HiC |
| **Multi-model resilience** | Four-layer pattern (cache + health tracker + per-corpus commitment + identity-signature cache) shipped 2026-05-24 |
| **NXT / NU** | Brand modifiers. NXT = NXT Humans brand (chartreuse / cyan / black). NU = Northeastern (red / violet). |
| **Provider health tracker** | Tracks `last_429_at` per provider; skips throttled providers for `THROTTLE_COOLDOWN_S = 600` seconds |
| **Reproducibility hash** | SHA-256 of (corpus_hash, goal_hash, framework_versions). Two runs with same hash must produce byte-identical identity fields. |
| **Rumelt's Kernel** | Strategy methodology (Richard Rumelt); Diagnosis → Guiding Policy → Coherent Actions |
| **Source-stratified clustering** | v4.2 architecture; clusters within each source_type bucket, then merges across types where centroid cosine ≥ 0.75 |
| **Signature cache** | LLM identity-class cache keyed by sha256(top_terms + sample_titles + research_goal). Same signature → same cached name across runs. |
| **Stop hook** | Claude Code Python script that runs after every generation event; reads deliverable JSON from stdin; exits 0 (pass) or 2 (block + retry) |
| **Thirteen don'ts** | The NU design system anti-pattern list in `public/nu-design-gallery/GUIDE.md` |
| **UMAP** | Uniform Manifold Approximation and Projection; dimensionality reduction. HiC uses `random_state=42` for determinism. |
| **Verbalized Sampling (VS)** | Training-free prompting technique to escape mode collapse. k=8 candidates with probability annotation; probability < 0.10 (moderate) or < 0.05 (deep) as commitment device. |
| **Wiki-as-RAG** | v3.1 architecture; wiki is canonical store; chat has `fetch_wiki_articles` tool; embedding-ranked retrieval |

---

## Closing notes

This handoff document is the single-file comprehensive reference. It complements but does not replace:
- `humans-in-control-research/public/documentation.html` (operator-facing browseable doc)
- The 66 individual SKILL.md files (skill source-of-truth)
- The 10 agent .md files (subagent source-of-truth)
- The wiki framework pages (deliverable spec source-of-truth)
- The 33 memory entries (agent rule source-of-truth)

When information here conflicts with a more specific file, the more specific file is authoritative. Update this handoff when any of the load-bearing facts change.

**Last updated:** 2026-05-24
**Generated by:** Claude Opus 4.7 (HiC architecture session 2026-05-24)
**Validated against:** filesystem inventory (62 skills, 30 hooks, 10 subagents, 12 frameworks, 12 synthesis logs, 7 active plans)
