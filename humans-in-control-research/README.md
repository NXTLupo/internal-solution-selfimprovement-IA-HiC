# Humans in Control — Artifact Refinements (v3.3)

**Branch:** `HiC-Artifact_Refinements`
**Date:** 2026-04-27

A research workbench that turns an uploaded brief and a bounded corpus of evidence into consulting-grade deliverables with full citation traceability. A human operator drives every synthesis step — the system handles collection, ranking, enrichment, and multi-model analysis, then surfaces results through an inference-aware dashboard (the **Analyst Desk**), a chat workbench (the **Analyst Chat**), a hashtag-driven artifact authoring surface (the **Design Desk**), and a wiki-as-RAG-store architecture that lets the AI pull full article bodies on demand.

The full operator documentation is served at <http://localhost:5011/documentation.html> (also at [`public/documentation.html`](public/documentation.html)).

---

## v3.3 — what's in this branch

### Design Desk + Designer window
A dedicated artifact authoring surface that runs in its own browser window (`window.open('?designer=1')`). The user is never taken off the Analyst Desk to view or edit an artifact. Both windows talk to the same shared Zustand store via a three-layer cross-window sync.

### Freeform HTML artifact pipeline
Five artifact kinds (`org`, `journey`, `arch`, `roadmap`, `blueprint`) route through a freeform HTML generation pipeline. The model emits the BODY of an HTML slide; the pipeline splices it into a brand-locked HTML shell (head + complete `<style>` block + body open/close), sanitizes, validates, and stores. The result renders as a complete 1920×1080 slide that exactly matches the brand exemplar.

- 8 exemplar HTML files at [`styles/0X-*.html`](styles/) (NU red/violet + NXT chartreuse/black variants for each kind).
- Per-kind illustrator skills at [`exemplar-skills/diagrams/*-illustrator/SKILL.md`](exemplar-skills/diagrams/).
- Brand-style skills at [`exemplar-skills/brands/{nu,nxt}-style/SKILL.md`](exemplar-skills/brands/).
- Strict body completeness check — no fallbacks; surfaces truncation as a user-visible error.

### Three-layer cross-window sync (replaces 5MB-capped localStorage)
1. **BroadcastChannel** (primary) — synchronous, no quota, no payload-size limit.
2. **IndexedDB** persistence — effectively unlimited quota (~50% of free disk). Auto-migrates the legacy `localStorage['designDeskStore.v1']` entry on first boot.
3. **Focus-reconcile backstop** — every focus event re-reads IDB and merges in anything missed.

### Hashtag command system (11 content × 2 brands × 2 view modifiers)

Form: `#<content> #<brand> #<view> <prompt text>`. Order doesn't matter; case doesn't matter. Plurals auto-map to canonical singular (`#orgs` → `#org`, `#personas` → `#persona`).

**Content hashtags**

| Hashtag | Aliases | Pipeline | What you get |
|---|---|---|---|
| `#persona` | `#personas` | Legacy SlideCanvas | Cooper 3-tier persona card with portrait, JTBD, behavioral & aspirational goals, evidence quote. Renders inline in Analyst Chat with the original Export Deck PDF/PPTX toolbar. |
| `#journey` | `#journeys` | Freeform HTML | Current-state journey map: 4–9 lifecycle stages, emotion bands, touchpoints, pain points, opportunities, verbatim quotes. |
| `#blueprint` | `#blueprints` | Freeform HTML | Future-state service blueprint with Customer Action / Frontstage / Backstage / Support lanes, fail-points, evidence quotes. |
| `#org` | `#orgs`, `#orgchart`, `#orgcharts` | Freeform HTML | Hierarchy or radial org chart on a 1808×820 SVG viewBox. Max 6 nodes per row at 220–280px node-width. Banded clusters when teams exceed row capacity. |
| `#arch` | `#arches` | Freeform HTML | Technical architecture diagram with system/component boxes, tier or zone bands, annotated data-flow arrows, datastore icons distinguished from services. |
| `#roadmap` | `#roadmaps` | Freeform HTML | Now/Next/Later or quarter-based roadmap with phase columns, owner assignments, dependency markers, status indicators. |
| `#prd` | `#prds` | Pipeline | SVPG/Cagan-format PRD feature spec. |
| `#strategy` | `#strategies` | Pipeline | Rumelt's Kernel: Diagnosis / Guiding Policy / Coherent Actions, Minto-pyramid action titles. |
| `#gap` | — | Pipeline | Gartner 1–5 maturity gap analysis. |
| `#audit` | `#audits` | Pipeline | COBIT/TEI tech audit with system inventory + risk rating. |
| `#compete` | `#competes`, `#competitives`, `#competitors` | Pipeline | Porter's Forces / Blue Ocean competitive matrix. |

**Brand hashtags**

| Hashtag | Brand | Visual signature |
|---|---|---|
| `#nxt` *(default)* | NXT Humans | Chartreuse `#B8B800` on near-black `#0D0D0D`; Bebas Neue + Archivo + JetBrains Mono. |
| `#nu` | Northeastern University | NU red `#C8102E` + violet accents `#6E54E0` on cream paper `#FAF8F4`; brand seal + grain overlay. |

**View / composition modifiers**

| Hashtag | Behavior |
|---|---|
| `#slide` | Single-slide view: render inside a 16:9 NXT slide frame at 1920×1080. |
| `#slides` | Multi-slide composition: lay out multiple content tags in a deck-style frame. |

**Worked examples**

```
#org #NU advancement leadership
#journey current-state prospect lifecycle
#blueprint #NU future-state donor onboarding
#arch #slide advancement data systems
#roadmap #NU 18-month CRM consolidation
#persona #NU 5 personas focused on annual giving donors
#org #journey #blueprint #slides full advancement workshop pack
```

### Other v3.3 fixes
- **Instant-feedback status messages** at research kickoff — eliminates the prior 25-second blank-screen gap. PHASE thinking events fire BEFORE the wiki-seeding/upload-archival awaits.
- **Org chart layout discipline** — hard rules baked into the prompt + SKILL.md: max 6 same-tier nodes per row, reuse exemplar SVG viewBox unchanged, render reporting lines as `<line>` elements, group teams into band cards when row capacity is exceeded.
- **Freeform PPTX export** uses `pxToSlidePt()` scaling (`px × 0.75 × 13.333"/20"`) and z-order stacking (image first, text frames on top) so PowerPoint editors get visual fidelity AND editable text layers.
- **Persona artifacts intentionally on legacy path** — keep the original Export Deck PDF/PPTX toolbar; not routed through the Designer.

---

## Architecture

```
React 19 SPA (Vite, port 3000 dev / 5011 prod nginx)
    │  fetch()
    ▼
Research Proxy (FastAPI, port 5012, proxy/app.py)
    ├── /api/ai/{anthropic,gemini,openai}
    ├── /api/search/{source_id}             — 313 sources, 8 connector types
    ├── /api/wiki/*                         — read/write/embed/fetch-articles (RAG)
    ├── /api/extract-pdf, /api/parse-upload — client-upload ingestion
    └── /api/transcribe-youtube             — yt-dlp + OpenAI Whisper
```

Cross-window sync (Analyst window ↔ Designer window):

```
Analyst window ──┐                        ┌── Designer window
  Zustand store  │                        │   Zustand store
  IndexedDB ◄────┼── BroadcastChannel ────┼──► IndexedDB
                 │   ('designDeskStore.   │
                 │    v1.sync')           │
                 └── Focus reconcile ─────┘
                     (re-read IDB on focus)
```

Freeform HTML pipeline:

```
hashtag #org #NU
   │
   ▼
hashtagParser ── { kind: 'org', brand: 'nu' }
   │
   ▼
loadExemplar(kind, brand) ── reads styles/05-org-chart-NU.html (?raw import)
   │
   ▼
splitExemplarShell ── { before, sampleBody, after }
   │
   ▼
buildPrompt ── 3-hammer prompt: emit BODY only, NOT shell
   │
   ▼
callForModel ── Gemini 2.5 Flash | Claude Opus 4.7 | GPT-5.4
   │
   ▼
parseFreeformOutput ── extract :::nxt:freeform header + body
   │
   ▼
checkBodyContentCompleteness ── strict; no fallbacks
   │
   ▼
splice ── shell.before + body + shell.after
   │
   ▼
sanitizeFreeformHtml ── strip <script>, on-* attrs
   │
   ▼
validateFreeformArtifact ── Zod schema
   │
   ▼
designDeskStore.addArtifact ── IDB write + BroadcastChannel post
```

---

## Quickstart

```bash
# Build & run everything from repo root
docker compose -f docker-compose-all.yml up -d --build research-generator research-proxy

# Open the workbench
open http://localhost:5011

# Open operator documentation
open http://localhost:5011/documentation.html
```

For local dev (recommended over Docker for iteration):

```bash
# Terminal 1 — SPA (Vite HMR)
cd humans-in-control-research
npm install --legacy-peer-deps
npm run dev    # http://localhost:3000

# Terminal 2 — Proxy (required for all API calls)
cd humans-in-control-research/proxy
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
python app.py    # http://localhost:5012
```

Required env vars in repo-root `.env`:
- `GEMINI_API_KEY` (also exposed as `API_KEY` for legacy paths)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `YOUTUBE_API_KEY` (proxy only)

---

## Repo layout (this branch)

```
humans-in-control-research/
├── App.tsx                          — root state machine, Designer popup wiring
├── components/
│   ├── CorpusChatPanel.tsx          — hashtag routing entry point
│   ├── ChatWorkbench.tsx
│   └── …
├── design-desk/                     — Designer window
│   ├── DesignDesk.tsx               — popup chrome (chat + canvas split)
│   ├── DesignDeskChat.tsx
│   ├── ArtifactViewer.tsx           — type-aware canvas (persona / journey / org / freeform)
│   ├── components/
│   │   ├── FreeformViewer.tsx       — sandboxed iframe for freeform HTML
│   │   ├── OrgChartCanvas.tsx
│   │   ├── NxtDocViewer.tsx         — persona doc renderer
│   │   ├── OrgChartNode.tsx
│   │   └── ExportMenu.tsx
│   ├── prompts/                     — persona / journey / orgChart prompts
│   ├── schemas/                     — Zod schemas (persona, journey, orgChart, freeform)
│   ├── services/
│   │   ├── chatToFreeform.ts        — freeform pipeline orchestrator
│   │   ├── chatToArtifact.ts        — legacy structured pipeline
│   │   ├── exemplarLoader.ts        — loads HTML exemplars + skills via Vite ?raw
│   │   ├── freeformParser.ts        — :::nxt:freeform block parser
│   │   ├── freeformSanitizer.ts     — script/event-attr sanitizer
│   │   ├── hashtagParser.ts         — content/brand/view tag parser
│   │   ├── designContext.ts         — cross-window context cache
│   │   ├── artifactExporter.ts      — PNG / PDF / PPTX export
│   │   └── designMdLoader.ts
│   └── store/
│       └── designDeskStore.ts       — Zustand + IndexedDB + BroadcastChannel
├── exemplar-skills/                 — brand + diagram illustrator skills
│   ├── brands/{nu,nxt}-style/SKILL.md
│   └── diagrams/{org,journey,arch,roadmap,blueprint}-illustrator/SKILL.md
├── styles/                          — 8 brand-locked HTML exemplars
│   ├── 01-service-blueprint-NU.html
│   ├── 02-service-blueprint-NXT.html
│   ├── 03-architecture-NU.html
│   ├── 04-architecture-NXT.html
│   ├── 05-org-chart-NU.html
│   ├── 06-org-chart-NXT.html
│   ├── 07-roadmap-NU.html
│   └── 08-roadmap-NXT.html
├── services/                        — research data fabric, AI router, wiki
├── public/
│   └── documentation.html           — full v3.3 operator documentation
├── proxy/                           — FastAPI proxy (CORS + connectors + wiki + AI)
└── CLAUDE.md                        — agent rules for this directory
```

---

## Troubleshooting (v3.3-relevant)

| Symptom | Cause | Fix |
|---|---|---|
| Hashtag artifact doesn't appear in Designer popup | Pre-v3.3 localStorage quota exhausted | v3.3 migrated to IndexedDB + BroadcastChannel — hard-refresh both windows |
| Designer console shows `QUOTA EXCEEDED` | Stale bundle still on legacy localStorage path | Hard-refresh; new bundle uses IDB and auto-migrates the legacy entry |
| Designer popup blocked | Browser pop-up blocker | Allow pop-ups for `localhost:5011` |
| Freeform output rejected: "INCOMPLETE BODY CONTENT: unbalanced &lt;div&gt; tags" | Model truncated mid-element (Gemini Flash hits this on dense charts) | Switch to Claude Opus 4.7 or simplify the prompt |
| Anthropic 502 from `/api/ai/anthropic` | Upstream Anthropic 503 passed through as 502 | Wait for provider recovery, or switch to OpenAI / Gemini |
| Blank screen for ~25s when starting research | Wiki seeding + upload archival before first source loads | Already fixed: status messages + thinking events fire BEFORE the awaits |

### Console diagnostic markers (v3.3)

If the Designer isn't receiving artifacts, search the console in this order:

1. `[designDeskStore] cross-window sync REGISTERED` — should appear ONCE per window.
2. `[designDeskStore] boot hydrate from IndexedDB: N artifact(s)` — IDB read confirmation.
3. `[designDeskStore] persist#K — BroadcastChannel post SUCCESS` — writer side.
4. `[designDeskStore] BroadcastChannel received N artifact(s)` — peer side.
5. `[designDeskStore] merge applied via BroadcastChannel` — merge confirmation.

### Reset the artifact store

```js
// From browser DevTools console (in any HiC window):
indexedDB.deleteDatabase('designDeskStore');
localStorage.removeItem('designDeskStore.v1');  // legacy key
location.reload();
```

---

## Changelog

### v3.3 (2026-04-27) — this branch
- Design Desk popup window with realtime cross-window sync
- Freeform HTML artifact pipeline (org / journey / arch / roadmap / blueprint)
- Full hashtag command system (11 content tags + 2 brands + slide modifiers)
- 8 brand-locked exemplar shells (NU red/violet, NXT chartreuse/black) with server-side splice
- IndexedDB-backed designDeskStore (replaces 5MB-capped localStorage)
- BroadcastChannel as primary cross-window transport
- Focus-reconciliation backstop
- Freeform PPTX export with px→slide-pt downscale + z-order text-over-image stacking
- Persona artifacts intentionally on legacy SlideCanvas + Export Deck PDF/PPTX path
- Instant-feedback status messages eliminating the 25s blank-screen gap
- Org chart layout discipline (1808×820 SVG viewBox, max 6 nodes/row, banded clusters)

### v3.2 (2026-04-21) — densified slides + skill refactor
- Reduced slide whitespace, denser theme cluster grids, sharper visual hierarchy
- Skill manifest split-out so each `SKILL.md` loads independently
- Reasoning Stream Brain Status indicator + constraint visibility per checkpoint

### v3.1 (2026-04-20) — wiki-as-RAG retrieval
- Wiki archive treated as canonical corpus store
- `/api/wiki/index` + `/api/wiki/fetch-articles` endpoints
- Native `fetch_wiki_articles` tool for Claude
- Topic-matched article pre-fetch per chat turn
- Slide quote backfill from wiki
- ⌘ READ ARCHIVED button + WikiArticleViewer overlay
- TITLES-AS-QUOTES ban enforced in prompt + post-processor
