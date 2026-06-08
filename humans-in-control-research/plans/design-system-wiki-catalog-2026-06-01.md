# Design-System-as-Second-Brain: Wiki Template + Component Catalog

**Created:** 2026-06-01
**Goal:** Elevate HiC PowerPoint decks by making slide-template + component selection
**retrieval-grounded** from the second-brain wiki (not a hardcoded menu), and make the
slide set **extensible from the wiki** (compose novel slides from reusable components;
add slides without TypeScript surgery). Serves BOTH the Analyst Desk chat (`:::slide`)
and the Designer/artifact path. PPTX is the priority output.

**Scope chosen by user (2026-06-01):** Bigger/extensible set (component composition) ·
Both Analyst + Designer surfaces.

---

## 1. Current state (grounded in code, 2026-06-01)

Template selection today is the ONE decision in HiC that is **not** retrieval-grounded.

- **The actual selection driver** is a flat, hardcoded prose menu in
  `services/corpusChatService.ts` (~lines 600-1024): "1. persona-card → personas;
  2. recommendation → actions; …" plus per-template `:::slide` JSON example schemas,
  augmented by the `nxt-visual-renderer` skill (loaded on slide-intent keywords).
- **`skill-manifest.json` has a `slide-templates` entry** with a thin `templates[]`
  (`{id, owner, classicDeliverable}`) + brands + 3 `wikiCompanions` — but it is
  `category: rendering-system`, and the prompt builder (`corpusChatService.ts:2750`)
  only injects skills where `category === 'research-deliverable'`. **So the manifest's
  template list never reaches the model.** (Bug to fix.)
- **`components/slideTemplates/types.ts`** defines 18 template data shapes — compile-time
  only, invisible to the model.
- **`nu-design-gallery/artifacts.css`** already contains reusable component primitives
  (masthead, stat-tile, citation-chip, signal-dot, maturity-bar, pull-quote, dense-table,
  source-index) — invisible to the model; it can only pick a whole template, never compose.
- **One rendered exemplar exists** (`wiki/exemplars/persona-card-spec.html`) but is not
  used for slide selection (the Behance `designExemplarCurator` is for `#proto` only).

### The five gaps
1. Flat menu, no content-shape reasoning (1-dominant vs 4-co-equal distinctions buried in parentheses).
2. No retrieval, no exemplar grounding at selection time.
3. Set is rigid: a new template = edits in `types.ts` + `web.tsx` + `pptx.ts` + inline menu + skill.
4. No component composition — monolithic templates only.
5. Selection spec scattered across 7 places; no single retrievable catalog.

### The unlock we already have
`proxy/nxt_slide_export.py` renders ANY `.nxt-slide` DOM to **editable** PPTX generically
(measures bounding boxes; template-name-agnostic). **=> The design system can grow in the
wiki as HTML/CSS components without per-template exporter code.** This is what makes a
wiki-driven, composable catalog feasible.

---

## 1b. The Karpathy Second-Brain / Figma-MCP source model (user framing, 2026-06-01)

The design system's **source of truth is Figma**, not the scattered CSS. The second
brain *compiles* Figma into a living, interlinked wiki that agents read via a manifest.
This adds a **Layer 0 (sync)** beneath the catalog:

```
Figma "NXT Humans — Design System 2026" (file ovTXmk0nDLmNQ6edW0Tv2Q, PRO team)
   │   Figma MCP server  (mcp__figma__get_variable_defs / get_metadata /
   │                       get_design_context / search_design_system)
   ▼   sync job (agentic, re-runnable)
wiki/design-system/tokens/*.json        ← variables: color, type, spacing (verbatim from Figma)
wiki/design-system/components/<id>.md   ← component usage + Figma node ref + code-connect mapping
   │
   ▼   manifest points agents here
wiki/design-system/AGENTS.md  +  skill-manifest.json slide-templates.catalog_dir
```

- **Source documentation:** export Figma variables/tokens + component defs to markdown/JSON
  under `wiki/design-system/tokens/` and `components/`. Tokens become the brand CSS-var
  source (NXT teal/chartreuse, NU near-black/Huskies-red) instead of hand-maintained
  `colors_and_type.css` (which becomes a *generated artifact*, not the truth).
- **The manifest** (`wiki/design-system/AGENTS.md` + the `slide-templates` skill-manifest
  entry) explicitly lists rules, component usage, structural constraints, and points the
  agent at the Figma-sourced files — exactly the Karpathy LLM-wiki pattern.
- **Execution context:** when the Analyst/Designer model builds a slide, it reads the
  manifest → resolves Figma tokens + components → composes a slide that adheres to spacing,
  tokens, and components by construction. The measured PPTX exporter then renders it editable.
- **Re-syncable:** a `figma-sync` skill re-pulls variables/components on demand (or on a
  /loop), so the wiki catalog stays current with the Figma library. Code Connect mappings
  (`mcp__figma__get_code_connect_map`) tie Figma components ↔ the `web.tsx` component renderer.

This makes Layer 1/2 (template + component catalog) the *compiled output* of Figma, and the
selector (Layer 3) chooses from Figma-true components — closing the design↔code↔deck loop.

### Figma-sync channel: constraint + decision (verified 2026-06-01)
- `mcp__figma__whoami` works (auth = jonathan@nxthumans.com; PRO "NXT Humans" team
  `team::1318773250874750600` present; design file `ovTXmk0nDLmNQ6edW0Tv2Q`).
- BUT `mcp__figma__get_metadata` returned: **"You've reached the Figma MCP tool call limit
  on the Starter plan."** MCP calls are metered against the *Starter* team
  (`team::1457069306337219764`), not the PRO team — so **live Figma-MCP sync is rate-limited
  today** and not reliable for a repeatable sync job.
- **Decision — two-track Layer 0:**
  - **Track A (now, no MCP dependency):** seed the wiki catalog from the EXISTING
    sources already in-repo (`nu-design-gallery/`, `brand/colors_and_type.css`,
    `artifacts.css`, the 18 `types.ts` shapes). The catalog + selector (Layers 1-3) do
    NOT depend on Figma being live — they only need accurate token/component definitions,
    which we already have. Ship the deck-quality win first.
  - **Track B (Figma as source-of-truth, when channel available):** pull variables +
    components via the **Figma REST API + a personal access token** (NOT the MCP — REST is
    not subject to the MCP tool-call paywall), OR upgrade the MCP plan. A `figma-sync`
    skill writes `tokens/*.json` + component node refs, replacing the hand-maintained CSS as
    the source of truth. Wire Code Connect so Figma components ↔ `web.tsx` renderer.
- Net: the catalog is designed Figma-first, but Track A lets the deck-quality improvement
  ship immediately; Track B swaps the *origin* of the tokens later without changing Layers 1-3.

## 2. Target architecture (5 layers + Layer 0 sync)

```
wiki/design-system/
  AGENTS.md                      ← catalog schema (page types, frontmatter, lint rules)
  templates/<id>.md              ← one page per template: when/when-not, data_contract,
                                    capacity, selection_signals, exemplar_path, brands
  components/<id>.md             ← one page per primitive: when-to-use, css_classes,
                                    data slots, html_snippet, brands
  exemplars/<id>.html            ← rendered reference (NXT + NU) per template/component
  .catalog-index.json            ← generated: id → {kind, signals, embedding ref}
        │
        ▼  (embedded into the existing wiki vector store)
template-selector (skill + retrieval step)
  1. classify content shape (count, dominant-vs-coequal, has-quotes, has-metrics,
     temporal, comparative, hierarchical)
  2. retrieve top-K catalog pages by embedding similarity to (content + intent)
  3. model selects a template OR composes from components, grounded in retrieved
     when/when-not + exemplar
        │
        ▼
:::slide  emits EITHER  template=<id> {data}     (monolithic, today's path)
          OR            template=composed {layout, blocks:[{component, data}]}  (NEW)
        │
        ├── web renderer (web.tsx): generic component renderer over artifacts.css
        └── measured PPTX exporter (nxt_slide_export.py): already generic → editable PPTX
```

- **Layer 1 — Template catalog** (`wiki/design-system/templates/*.md`): structured
  frontmatter is the single source of truth for selection + data contract + capacity.
- **Layer 2 — Component library** (`wiki/design-system/components/*.md`): the primitives
  the model composes from. Grows the set with zero new TS template types.
- **Layer 3 — Retrieval selector**: replaces the flat menu on BOTH surfaces.
- **Layer 4 — Manifest as index**: `slide-templates` entry points to `catalog_dir` /
  `component_dir`; loader enumerates + embeds. Fix the `category` filter so catalog
  awareness reaches the prompt.
- **Layer 5 — Grow-from-wiki**: new template/component = wiki page + exemplar, auto-embedded.
  Compositions need no renderer code; only genuinely-novel geometry needs a `web.tsx` addition.

---

## 3. Phased build

### Phase 0 — Catalog substrate (wiki authoring; zero runtime risk)
- [ ] `wiki/design-system/AGENTS.md` — catalog schema + lint rubric (mirrors hic-workspace/AGENTS.md style).
- [ ] Author `templates/<id>.md` for all 18 existing templates. Migrate the authoritative
      data_contract + budgets here FROM the scattered sources (inline menu, nxt-visual-renderer
      web-layouts.md, types.ts). Each page: `when_to_use`, `when_NOT_to_use` (with the
      correct alternative), `data_contract`, `capacity`, `selection_signals`, `exemplar_path`,
      `brands`.
- [ ] Author `components/<id>.md` for the artifacts.css primitives (stat-tile, citation-chip,
      signal-dot, maturity-bar, pull-quote, dense-table, masthead, source-index, kpi-callout, …).
- [ ] Render exemplars (`exemplars/<id>.html`) for each, NXT + NU (extend the
      persona-card-spec.html + nu-design-gallery pattern).
- [ ] Embed all catalog pages into the wiki vector store (full-body, kind=design-system).

### Phase 1 — Retrieval selector (both surfaces)
- [ ] `services/templateSelector.ts` — content-shape classifier + top-K catalog retrieval via
      the existing `/api/wiki/fetch-articles` mechanism (filtered to design-system kind).
- [ ] Replace the flat inline menu in `corpusChatService.ts` with retrieved candidates
      (id + when/when-not + exemplar snippet). Keep the JSON schema injection.
- [ ] Wire the same selector into the Designer/artifact path (proxy/JM `_slide_layout_contract`
      receives the retrieved candidate set instead of a static list).
- [ ] Fix the manifest `category` bug so `slide-templates` reaches the prompt as the catalog index.
- [ ] `template-selector` skill (.claude/skills) documenting the selection protocol.

### Phase 2 — Component composition
- [ ] New slide kind `template=composed { layout: grid|columns|hero|stack, blocks: [{component, data, span}] }`.
- [ ] `types.ts`: add `ComposedSlideData`. `web.tsx`: generic `ComponentRenderer` mapping
      component id → artifacts.css markup. Measured exporter already handles the DOM.
- [ ] `slide-composer` skill: when no monolithic template fits, compose from retrieved components.
- [ ] Validator: component exists in catalog, brand tokens resolve, capacity not exceeded,
      no graphic-collision (reuse the CSS-grid rule from .claude/CLAUDE.md).

### Phase 3 — Grow-from-wiki + governance
- [ ] Author-a-slide-from-the-wiki flow: add page + exemplar → auto-embed → selectable next run.
- [ ] `catalog-lint` (weekly /loop): every template/component has when/when-not + exemplar +
      data_contract + ≥1 brand; flag orphans (catalog id with no renderer/component support).
- [ ] Telemetry: log which template/component the selector retrieved vs what shipped, to tune signals.

---

## 4. Key decisions / invariants
- **PPTX editability is preserved for free** for compositions because the measured exporter
  walks the rendered DOM. New components must use real text nodes + brand CSS vars (no images-as-text).
- **Brand parity**: every catalog entry declares `brands: [nxt, nu]`; exemplars rendered in both.
- **The catalog is the single source of truth** for data_contract + budgets; the inline menu and
  scattered specs get DELETED once migrated (no dual sources → no drift).
- **Determinism**: selection retrieval keyed on content-shape + goal so the same input picks the
  same template (per the determinism-first standing rule).
- **No relaxation of quality**: the selector improves FIT, never lowers the slide-content bar.

---

## 5. First slice shipped with this plan (proof of pattern)
- `wiki/design-system/AGENTS.md` (schema)
- `wiki/design-system/templates/theme-cluster.md` (template page exemplar)
- `wiki/design-system/components/stat-tile.md` (component page exemplar)

These demonstrate the frontmatter contract before mass-authoring the full catalog.
