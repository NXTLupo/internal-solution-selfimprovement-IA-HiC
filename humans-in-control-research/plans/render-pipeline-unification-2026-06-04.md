# Render Pipeline Unification — measured HTML→PPTX substrate

status: active
created: 2026-06-04
owner: (HiC)
decision: User chose "Measured HTML→PPTX substrate" + "Unify before more exemplars" (2026-06-04)

## Problem (verified 2026-06-04, not assumed)

HiC accreted FIVE render/generation pipelines, FIVE PPTX exporters, and FOUR+ exemplar
collections. Generation is largely converged (everything flows through
`corpusChatService.matchSkills` → skill contracts). RENDERING is fragmented, and that
fragmentation is the source of preview-vs-export drift, font drift, geometry collisions,
and a pile of orphaned exemplars.

### The 5 render pipelines
1. `components/slideTemplates/` (web.tsx + pptx.ts) — 18 slide templates, chat path.
2. `design-desk/services/chatToFreeform.ts` + `exemplarLoader.ts` + `domToPptx.ts` —
   freeform 1920x1080 diagrams (journey/blueprint/arch/org/roadmap), loads `styles/01-10*.html`.
3. `services/narrativeComposer*.ts` → `internal-solutions-presentation-renderer` (:5014) — `#presentation`.
4. journey-mapper service (proxy → JM) — the May-2026 "universal renderer" (artifact_type + render_mode).
5. `html-deliverable-composer` — `#brief`/`#explainer`/`#report`/`#approaches`/`#playground`.

### The 5 PPTX exporters
`slideTemplates/pptx.ts` (pptxgenjs, hand-coded geometry) · `design-desk/domToPptx.ts` ·
`proxy/nxt_slide_export.py` (measured, mine) · `proxy/pptx_export.py` · `services/exportService.ts`.

### The 4+ exemplar sets
`styles/01-10*.html` (WIRED via exemplarLoader) · `public/nu-design-gallery/` +
`nxt-design-gallery/` · `hic-workspace/wiki/eval/exemplars/` (40, gate-only, ORPHAN) ·
`wiki/exemplars/` + `exemplar-skills/diagrams/*`.

## Target architecture (the decision)

ONE substrate. The measured HTML→PPTX path becomes canonical:

```
skill JSON (per deliverable, from matchSkills)
  → htmlComposer (ONE composer: content → nxt-artifact-system.css HTML)
      → web preview  (renders the SAME HTML — drift impossible by construction)
      → POST html → proxy /api/export/pptx → nxt_slide_export.py (ONE measured exporter) → .pptx
```

Principles:
- **One CSS design system**: `public/nxt-design-gallery/nxt-artifact-system.css` (+ `.nxt-nu`).
  Web preview and PPTX export consume the identical HTML, so preview == export by construction.
- **One exporter**: `nxt_slide_export.py` (measured DOM via Playwright; no hand-coded geometry,
  the root cause of the pptxgenjs drift bugs). Exporter improvements (e.g. single-token
  word_wrap=False, 2026-06-04) benefit every deliverable at once.
- **One exemplar set**: `hic-workspace/wiki/eval/exemplars/` becomes the SPEC. Each exemplar
  is the target output htmlComposer must reproduce from skill JSON. Other sets are retired or
  folded in.
- **Skills unchanged as the spine**: the 14 deliverable skills keep producing structured content;
  we replace 5 renderers with 1 composer downstream of them.

## Migration phases

### Phase 1 — Finish the spec (IN PROGRESS)

**2026-06-04 UPDATE — user delivered hand-revamped exemplars.** The user hand-authored 12
gold slides (`NU_coop_slides_complete_v2/`) that REPLACE the slidekit versions as the visual
ground truth. These now live in `hic-workspace/wiki/eval/exemplars/gold/` as `{deliverable}-{nu,nxt}.html`.
The new design language (THE canonical spec the unified renderer must reproduce):
- 1920x1080 fixed stage, scaled to fit; navy(NU)/black(NXT) left rail (92px) + 3x3 dot mark.
- NU: Lora serif headlines, red #D41B2C kicker/accent, teal #1D6E64, ecru cells, pink fail-cells, "NORTHEASTERN".
- NXT: Archivo 600 headlines, Bebas Neue numerals, cyan #00B7C3 kicker, chartreuse #B8B800 accent/attention, black rail, "NXT HUMANS".
- Shared: IBM Plex Mono labels; SVG emotion curve (blueprint); maturity track w/ TODAY/TARGET markers (gap);
  evid box; dark takeaway band w/ accent-bold; color carries meaning (red/chart = pain, teal/cyan = need/target).
Done so far: 12 NU files in place; AI-slop eyebrows stripped (WHAT FRUSTRATES THEM / WHAT THEY NEED /
DESIGN RESPONSE / PROOF IT WORKED / PEAKS) via scripts/eval/strip_eyebrows.py; em-dashes converted to
commas (project hard ban) across all gold files; 11 NXT twins generated via scripts/eval/make_nxt.py
(documented NU->NXT token/font/hex mapping) + gap-nxt preserved (user's hand-made). All 22 render clean
(scripts/eval/gold_shot.py -> gold/_shots/), spot-verified strategy/blueprint/competitive/personas.
Remaining in Phase 1: hybrid PPTX twins (editable text + raster SVG/tracks) for all 22; update the 11
expert skills with this visual spec; create missing case-study-analyst skill; then extend the system to
arch/org/audit/case-study/presentation + the HTML-artifact family (brief/explainer/report/approaches/
mindmap/brief-dialog/meta-themes). NOTE: the slidekit-style arch/org I began earlier are SUPERSEDED by
this design language and must be rebuilt to match the gold set.

Complete the 11 remaining deliverable exemplars (slide-native 5 + HTML-artifact family 7,
minus interactive) in `eval/exemplars/`, both brands, gate-clean, COM-verified. These ARE the
renderer spec. Also: create the missing `case-study-analyst` skill (referenced by the hashtag
map but absent — latent bug).
Status: arch authored; org/audit/case-study/presentation + brief/explainer/report/approaches/
mindmap/brief-dialog/meta-themes remaining.

### Phase 2 — Build htmlComposer (the one composer)
Port the slidekit house style (FURNITURE CSS, rail/wordmark/gband/gtile_q, semantic tokens,
per-deliverable layouts) into a runtime TS module `services/htmlComposer.ts` that takes each
skill's structured output and emits nxt-artifact-system.css HTML matching the exemplar for that
(deliverable, brand). One function per deliverable type; shared furniture. The exemplars are the
golden tests: composer output must visually match the hand-authored exemplar.

### Phase 2.5 — GOLD editable export wired (2026-06-05)
DONE + VERIFIED: `proxy/gold_pptx_export.py` (`html_to_editable_pptx(html, out)`) + endpoint
`POST /api/gold/export-pptx` (app.py, runs the sync exporter in a thread). Live-tested through the
research-proxy container: HTTP 200, ~1.27MB editable .pptx. Client primitive `services/goldArtifact.ts`
(loadGoldTemplate / buildGoldFillPrompt / exportGoldPptx + HASHTAG_TO_GOLD map). Gold exemplars are
served at `/hic-workspace/wiki/design-system/gold/<deliverable>-<brand>.html` (Vite/nginx).
REMAINING (needs research-generator rebuild + live chat test, not headless-verifiable): intercept a
gold-deliverable hashtag in CorpusChatPanel -> loadGoldTemplate -> model fills via buildGoldFillPrompt
-> render the returned gold HTML in the existing sandboxed iframe -> add an "Export to PowerPoint
(editable)" action calling exportGoldPptx. Do NOT claim this works until verified in the live chat.

### Phase 3 — One export endpoint
Add `POST /api/export/pptx` to the proxy: accepts composed HTML, runs `nxt_slide_export.py`
(measured), returns the .pptx. Point the SPA export button at it. Deletes the client-side
pptxgenjs dependency from the export path.

### Phase 4 — Route + retire (incremental, behind a flag, with fallback)
Route each hashtag's render through htmlComposer + the one export endpoint, one deliverable at a
time, validating against its exemplar. As each migrates, retire its old path:
- slideTemplates/web.tsx + pptx.ts
- design-desk chatToFreeform + domToPptx + exemplarLoader + styles/01-10*.html
- narrativeComposer → presentation-renderer (:5014)
- JM cross-service render
- exportService pptx + pptx_export.py
Keep the old path as fallback until the migrated path passes its exemplar gate in NU and NXT.

### Phase 5 — Consolidate exemplars + docs
One exemplar set (`eval/exemplars/`). Fold/retire nu/nxt-design-gallery and styles/*.html.
Update CLAUDE.md (root + humans-in-control-research) to describe the single substrate. Delete
the dormant render code.

## Risks / guardrails
- Export is now a network round-trip (SPA → proxy Playwright). Mitigate: the proxy already runs
  Playwright; cache by content hash; show a progress state. (The 25s blank-gap lesson applies.)
- Freeform diagrams (arch/org) must stay CSS-grid, never SVG absolute coords (graphic-collision bans).
- `#playground`/`#proto` are interactive React — they stay OUT of the HTML→PPTX substrate; the
  unification covers static deliverables only. Note this explicitly so nobody tries to force them in.
- Determinism: same skill JSON + same brand → same HTML → same PPTX (supports the
  reproducibility-hash discipline).
- Never relax the exemplar gate to claim a migration "done" — a deliverable is migrated only when
  composer output passes verify-pptx-exemplar in BOTH brands.

## Connection to the broader roadmap
This precedes the 7-step volume-to-insight plan and the ground-up NXT/NU design-system rethink
(Figma). The unified substrate + single CSS is the natural foundation the design-system rethink
writes INTO, one place to change tokens, not five.
