# NXT Design System — 200 Use-Case Build (Figma + Wiki + Retrieval)

**Created:** 2026-06-01
**Mandate:** Elaborate the NXT design system (ingested from `NXT_HUMANS_Design_System_Style_Guide.html`)
into ~200 use cases — slides, UI patterns, content modules, charts, print layouts, journey modules,
and cross-deliverable recipes. All assets live in the **Figma** design system, are **embedded in
the wiki**, **contextualized by the manifest**, and are **retrievable by the AI Analyst + Designer chat**.

## Shipped this session (the real foundation — replaces the "thin/generic" skeletons)
- `wiki/design-system/sources/nxt-style-guide.html` — canonical rendered reference (65 KB, ingested).
- `wiki/design-system/tokens/nxt.json` — full machine-readable token set (color/type/spacing/semantic/maker-mark).
- `wiki/design-system/nxt-design-system.md` — faithful canonical spec: philosophy, color+rules,
  typography+scale+banned, the 7 patterns, illustration/icon/diagram/dot-grid, data-viz, anti-slop checklist.
- `wiki/design-system/use-case-taxonomy.md` — the **200 use cases**, each bound to pattern + tokens + surface.
- `wiki/design-system/manifest.md` — registers all of the above + the model selection contract.

## Phase 1 — Embed + retrieval (makes it model-usable; no Figma dependency)
- [ ] Embed the design-system pages into the wiki vector store (kind=design-system) so
      `/api/wiki/fetch-articles` returns them.
- [ ] `services/templateSelector.ts` — classify request content-shape → retrieve top-K use cases
      from `use-case-taxonomy` (filtered to design-system kind) → return pattern spec + token
      bindings + the anti-slop gate to the generation prompt.
- [ ] Wire the selector into BOTH surfaces: `corpusChatService.ts` (`:::slide` path, replacing the
      hardcoded menu) and the proxy/JM `_slide_layout_contract` (designer/artifact path).
- [ ] Fix the manifest `category` bug so `slide-templates`/design-system reaches the prompt.
- [ ] Inject `tokens/nxt.json` into the render contract so output binds tokens, not magic numbers.

## Phase 2 — Per-use-case exemplars (render the 200)
- [ ] For each taxonomy entry, generate a self-contained `.nxt-slide`/component HTML exemplar
      (NXT + NU), stored under `exemplars/<id>.html`, using only token-bound classes. These are
      (a) the selector's few-shot examples and (b) the measured PPTX exporter's render targets.
- [ ] Batch by family (A slides, B modules, C charts, D UI, E print, F journey, G recipes); each
      exemplar passes the §8 anti-slop checklist before commit.
- [ ] Component renderer (`web.tsx`) gains a generic `ComponentRenderer` for module composition;
      `template=composed` slide kind for assembling novel slides from modules.

## Phase 3 — Figma as source of truth (the "all assets live in Figma" requirement)
Figma MCP is metered against the Starter team and rate-limits bulk work, so:
- [ ] **`figma-sync` skill via Figma REST API + a personal-access-token** (`FIGMA_TOKEN` in `.env`).
  - PUSH: create/update a Figma variable collection from `tokens/nxt.json` (Color/Type/Spacing/Semantic).
  - PUSH: create a component per taxonomy entry (variant sets), bound to the variables, on a
    dedicated page per family (Slides / Modules / Charts / UI / Print / Journey).
  - MAP: Code Connect each Figma component back to its `web.tsx`/exemplar source so Dev Mode + MCP
    emit brand-accurate code.
- [ ] PULL-back: re-read variables so the wiki `tokens/*.json` stays Figma-true (closes the loop).
- [ ] NU parity: author `tokens/nu.json` + NU style-guide source + NU Figma file, mirror the build.

## Phase 4 — Governance + determinism
- [ ] `catalog-lint` (weekly /loop): every use case has pattern + tokens + exemplar + brand parity;
      flag drift between taxonomy ↔ renderer ↔ Figma.
- [ ] Pin BERTopic/UMAP `random_state` and selector retrieval keys for deterministic selection.

## Honest scoping
- **Now:** the system (tokens + canonical spec + 200-use-case taxonomy + manifest) is real and
  complete enough for the model to compose against once Phase 1 retrieval is wired.
- **Phased:** rendering 200 exemplars and pushing 200 Figma components is multi-session work; it
  needs a `FIGMA_TOKEN` (Phase 3) because the MCP is Starter-rate-limited. Provide the token and the
  NU Figma URL to unblock the Figma + NU-parity tracks.
