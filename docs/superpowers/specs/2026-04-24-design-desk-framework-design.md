# Design Desk Framework — Design Spec

**Date**: 2026-04-24
**Status**: Draft
**Scope**: Sub-project 1 of 10 in the HiC Research Chat-Driven Artifact System initiative
**Authors**: Jonathan Lupo (product), Claude (brainstorming collaborator)

---

## 1. Overview

Today HiC Research generates 10 artifact types via a checkbox-driven pipeline that runs after data collection and synthesis. The AI chat surface can emit slides (`:::slide` blocks) but not full artifacts, and chat-emitted slides use a legacy `NxtBlock[]` format rather than the strongly-typed slide-template system. Journey maps and architecture diagrams are currently flattened into slide templates or documents — neither form does justice to spatial artifacts. The NXT design system is implicit and scattered across `.claude/CLAUDE.md`, `wiki/brand/*.md`, and code conventions, so each generation model (Gemini, Claude, OpenAI) interprets it differently.

The **Design Desk** is a new top-level tab alongside Analyst Desk and AI Chat where users can chat their way to publication-ready artifacts — both document-shaped (persona, gap, strategy, etc.) and diagram-shaped (journey, architecture). The AI can mutate the active artifact through chat turns. Flat NXT design language is applied consistently by grounding every AI call in a formal `DESIGN.md` spec. Diagram-shaped artifacts render via an embedded FossFLOW canvas skinned to NXT brand. All artifacts export to PDF (exact proportions), PNG, or PPTX.

This spec covers **Sub-project 1: the Design Desk Framework + two pilot artifacts (Persona, Journey)**. The remaining eight artifact types are out of scope here; each will have its own design spec once the framework is proven.

## 2. Goals

1. Prove the Design Desk paradigm end-to-end with two pilots (one document-shaped, one diagram-shaped).
2. Formalize the NXT design system as `DESIGN.md` so every AI generation reads a single source of truth.
3. Establish the hashtag grammar as the canonical way to request artifacts and slide projections.
4. Establish the artifact store + chat-canvas binding model that all future artifacts will plug into.
5. Establish the export pipeline (PDF exact proportions, PNG, PPTX) once, reusable across all future artifacts.

## 3. Non-Goals

- Re-visualizing the other eight artifact types (each gets its own spec).
- Replacing the existing checkbox-driven pipeline on the main research page — it stays.
- Migrating existing chat-emitted `:::slide` block output to the new framework (left in place; may diverge).
- Operation-based or tool-use mutation models (deferred; framework uses full-state rewrites in v1 — see §6).
- Multi-user collaboration on the canvas.

## 4. User-Facing Behavior

### 4.1 Hashtag Grammar (Locked)

| Category | Hashtags | Notes |
|----------|----------|-------|
| Content (singular, one per artifact) | `#persona`, `#journey`, `#blueprint`, `#arch`, `#prd`, `#roadmap`, `#strategy`, `#gap`, `#audit`, `#compete` | Drives which artifact type to generate |
| View (single artifact) | `#slide` | Produces one slide projection of the preceding artifact |
| Composition (multi) | `#slides` | Produces a deck — every content hashtag in the prompt gets a slide projection |
| Brand | `#NXT` (default), `#NU` | Styles the output; if absent defaults to `#NXT` |

**Precedence rule**: the artifact is always generated first. `#slide` and `#slides` are derivative projections of an existing artifact (either freshly generated in the same turn, or the current active artifact).

**Naming rationale**:
- `#slides` (plural) replaces the older `#deck` composition to avoid collision with the `DECK` content artifact button that existed on the main page; `#strategy` is now the content hashtag for the strategy artifact.
- All content hashtags are single-word, singular, and as short as remain unambiguous.

### 4.2 Example Prompts

| Prompt | Result |
|--------|--------|
| `#persona #NU give me a persona for a first-gen junior developer` | One persona artifact rendered in NU brand, no slide |
| `#persona #NU #slide ...` | Persona artifact + one slide projection in NU brand |
| `#journey #NXT show the application-to-enrollment journey` | One journey artifact rendered in FossFLOW, NXT brand |
| `#journey #NXT #slide ...` | Journey artifact + a slide projection (rasterized canvas embedded) |
| `#persona #journey #strategy #NU #slides build a first-gen retention deck` | Three artifacts (persona, journey, strategy) + a deck of slide projections |

### 4.3 The Design Desk Tab

A new tab sits alongside the existing Analyst Desk and AI Chat. Layout when the tab is open:
- **Left pane (~40%)**: Chat input + conversation history. Same model-selector chrome as the existing CorpusChatPanel.
- **Right pane (~60%)**: Active artifact viewer. For diagram artifacts, the FossFLOW canvas. For document artifacts, the flat NXT document template.
- **Top strip of the right pane**: Artifact tabs (one per generated artifact in the current session), brand toggle, export menu (PDF / PNG / PPTX).

Chat and canvas are bound: the AI sees the current artifact state on every turn and can replace it. Users can also edit the canvas directly (FossFLOW's built-in tools for diagram artifacts, inline field edits for document artifacts).

### 4.4 Interaction Patterns

**Generation**: user types a prompt with hashtags → loading state in the right pane → artifact appears when ready.

**Chat-driven edit**: active artifact exists; user types "add a friction point after the application step" (no hashtags needed when an artifact is active) → AI re-reads current state, emits a new full artifact → store swaps → canvas re-renders. Undo returns to previous state.

**Manual edit**: user edits directly in FossFLOW (drag a node, relabel, connect) or in the flat NXT doc fields (inline contenteditable) → store updates → chat context picks up the new state on next turn.

**Export**: user clicks the export menu → picks PDF (exact canvas proportions), PNG, or PPTX → download happens.

## 5. Scope

### 5.1 In Scope (Sub-project 1)

1. **Design Desk tab** — new top-level view, feature-flagged for initial rollout.
2. **`DESIGN.md`** — formal NXT design system spec, placed at `humans-in-control-research/DESIGN.md`, consumed by every AI call.
3. **Hashtag parser** — pure function: `parseHashtags(userText) → { content[], view, composition, brand }`.
4. **Artifact store** — Zustand store holding `{ artifacts, activeArtifactId, history }`, with undo/redo.
5. **`FossflowCanvas` component** — embeds `fossflow-lib`, overrides icons + colors using DESIGN.md tokens.
6. **`NxtDocViewer` component** — flat NXT React document renderer for document-shaped artifacts; reads DESIGN.md tokens.
7. **`DesignMdLoader` service** — loads `DESIGN.md` at boot (or per-session), parses frontmatter tokens, exposes both the raw Markdown (for AI prompts) and structured tokens (for renderers).
8. **Chat ↔ artifact binding** — generation service that sees current artifact state, emits a full replacement artifact, swaps it in the store.
9. **Export pipeline** — PDF (exact proportions), PNG (per-artifact), PPTX (reuses existing `pptxgenjs` export pattern; adds rasterization path for FossFLOW canvases).
10. **Pilot: Persona** — document-shaped; end-to-end including slide projection.
11. **Pilot: Journey** — diagram-shaped, FossFLOW-rendered; end-to-end including slide projection.

### 5.2 Out of Scope (Follow-on Specs)

1. Other eight artifact types: blueprint, arch, prd, roadmap, strategy, gap, audit, compete — each a separate spec.
2. `#slides` deck composition beyond simple "one slide per content hashtag, in order given" — richer narrative composition (cover, section dividers, closing) deferred.
3. Operation-based or tool-use mutation models — framework v1 uses full-state rewrites; later artifacts may opt in.
4. Multi-user collaboration, real-time sync.
5. Artifact persistence across sessions (in-memory only for v1).
6. Integration with the Knowledge Graph — approved artifacts do not auto-commit to KG in v1 (follow-on).

## 6. Architecture

### 6.1 Chosen Approach: Single-Store, Full-State Rewrites

The AI emits a complete new artifact JSON on every chat turn that mutates state. Store replaces state atomically. Undo stack records the prior state.

**Rationale**:
- Smallest thing that proves the paradigm end-to-end.
- Matches how the existing pipeline already generates artifacts (`generatePersonas`, `generateJourneyMap` — both return full objects), so prompt engineering risk is low.
- Each future artifact spec can independently upgrade its own mutation model to operation-based or tool-use if iterative editing feels heavy.
- Undo/redo is trivial with full snapshots.

**Tradeoff**: AI must re-emit the whole artifact each turn. For large journeys (>20 nodes) this adds latency and cost. Acceptable for v1; a follow-on spec can introduce per-artifact operation grammars where warranted.

### 6.2 Component Inventory

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| `DesignDesk.tsx` | Top-level tab layout; hosts chat + canvas panes | designDeskStore, child components |
| `DesignDeskChat.tsx` | Left pane: chat input, history, model selector | designDeskStore, hashtag parser, chatToArtifact |
| `ArtifactViewer.tsx` | Right pane: routes to FossflowCanvas or NxtDocViewer by artifact type | designDeskStore |
| `FossflowCanvas.tsx` | Embeds fossflow-lib; translates JourneyArtifact ↔ FossFLOW internal schema; NXT-skins icons/colors | fossflow-lib, DesignMdLoader |
| `NxtDocViewer.tsx` | Flat NXT document template; renders PersonaArtifact; inline edit fields | DesignMdLoader |
| `designDeskStore.ts` | Zustand: `{ artifacts, activeArtifactId, history, addArtifact, replaceArtifact, undo, redo }` | Zustand |
| `hashtagParser.ts` | Pure: extracts content/view/composition/brand from user text | none |
| `chatToArtifact.ts` | Calls AI provider with DESIGN.md + corpus + current artifact + user prompt → returns new artifact | aiRouter, DesignMdLoader, corpus context |
| `DesignMdLoader.ts` | Loads + parses `DESIGN.md`; exposes raw Markdown and structured tokens | DESIGN.md file |
| `ArtifactExporter.ts` | PDF (via canvas + jspdf, exact proportions), PNG (dom-to-image), PPTX (reuses existing pptxgenjs pattern) | existing exportService |

### 6.3 Data Shapes

```ts
type BrandId = 'nxt' | 'nu';

type PersonaArtifact = {
  id: string;
  type: 'persona';
  brand: BrandId;
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
  jtbd: string;
  quotes: { text: string; source: string }[];
  citations: { label: string; source: string }[];
  createdAt: number;
  updatedAt: number;
};

type JourneyArtifact = {
  id: string;
  type: 'journey';
  brand: BrandId;
  title: string;
  stages: {
    id: string;
    label: string;
    emotion: 'positive' | 'neutral' | 'negative';
    touchpoints: string[];
    painPoints: string[];
    opportunities: string[];
  }[];
  connections: { from: string; to: string; label?: string }[];
  layout?: { nodes: Record<string, { x: number; y: number }> }; // FossFLOW layout hints
  citations: { label: string; source: string }[];
  createdAt: number;
  updatedAt: number;
};

type Artifact = PersonaArtifact | JourneyArtifact; // union grows per spec
```

### 6.4 Data Flow

1. User types prompt with hashtags in DesignDeskChat.
2. `hashtagParser` extracts `{ content: ['persona'], view: null, composition: null, brand: 'nu' }`.
3. For each content hashtag, `chatToArtifact` builds a prompt containing:
   - `DESIGN.md` (full Markdown + token block)
   - Research corpus context (same `ChatContext` the existing chat builds)
   - Current active artifact JSON (if editing)
   - User's freeform prompt
4. Provider (Claude Opus 4.7 default for generation; configurable) returns full artifact JSON.
5. Artifact JSON validated against the Zod schema for its type. Invalid → error surfaced in chat, store unchanged.
6. Valid → `designDeskStore.replaceArtifact(id, newArtifact)`. Previous artifact pushed to history for undo.
7. `ArtifactViewer` re-renders (FossflowCanvas for journey, NxtDocViewer for persona).
8. If `#slide` in the prompt: after the artifact is committed, `chatToArtifact` runs a second call to produce a slide projection (rasterized canvas for diagrams; template data for docs) and stores it as a sibling artifact.
9. If `#slides` in the prompt: steps 3-8 run once per content hashtag.

### 6.5 `DESIGN.md` Structure (v1)

Following the google-labs-code/design.md specification (YAML frontmatter + prose):

```yaml
---
name: NXT Humans
colors:
  primary: "#0D0D0D"
  accent: "#B8B800"      # chartreuse, <=15% of surface
  secondary: "#00B7C3"   # cyan
  negative: "#CC6644"    # rust
  teal: "#115054"
brands:
  nxt:
    primary: "#0D0D0D"
    accent: "#B8B800"
  nu:
    primary: "#141414"
    accent: "#C8102E"    # Huskies Red
typography:
  body: { family: "Archivo", weights: [200,400,600,900] }
  display: { family: "Bebas Neue", weights: [400] }
  mono: { family: "JetBrains Mono", weights: [400,500] }
iconStyle:
  style: "flat"
  fill: "monochrome"
  stroke: "geometric"
  radius: "0-4px"
  forbidden: ["gradient", "shadow", "rounded > 4px", "pie chart"]
---

## Overview
The NXT Humans design language is flat, minimalistic, data-dense, and high-contrast...

## Action Titles
Every heading is a complete sentence stating a conclusion with data. Not a topic label...

## Banned Phrases
(link to wiki/brand/anti-slop.md — do not duplicate here)
```

The loader parses frontmatter into a tokens object (for renderers) and exposes the full Markdown (for AI prompts).

## 7. Error Handling

- **Unknown content hashtag**: chat responds with a friendly message listing valid hashtags.
- **Invalid AI-emitted artifact JSON**: schema validation fails → chat surfaces `"Couldn't parse the artifact. Try again?"`, nothing changes in the store.
- **FossFLOW render error**: fallback to a list view of the journey stages with a "canvas unavailable" badge; user can still export as a text-shaped artifact.
- **`DESIGN.md` missing or malformed at boot**: fail loudly (error banner across the Design Desk) — this is load-bearing; silent fallback would cause design drift.
- **Export failures**: per-format error surfaced in the export menu; other formats remain available.
- **Large corpora / slow generation**: reuse the existing `LoadingIndicator` with phased status text.

## 8. Testing

The repo has no formal test suite. Validation plan:

1. **Unit tests** for `hashtagParser` (pure function, easy to test) and `DesignMdLoader` (parse fixtures).
2. **Schema tests** for artifact Zod schemas (valid / invalid fixtures).
3. **Manual end-to-end**:
   - `#persona #NU` → verify persona renders in NxtDocViewer, fields populated, citations resolved.
   - `#journey #NXT` → verify FossFLOW renders, stages have NXT-styled icons and palette.
   - Chat-edit each ("add pain point about financial aid" / "add an escalation branch after step 3") → verify state updates, undo restores.
   - Export PDF from each → verify exact proportions match the on-screen canvas.
   - Export PNG → verify resolution is publication-grade (≥ 2× pixel ratio).
   - Export PPTX → open in PowerPoint, verify slide looks clean, fonts render (embedded or fallback declared).
4. **Cross-model test**: run same prompt across Claude Opus 4.7, Gemini 3.1 Pro, GPT-5.4 — verify DESIGN.md grounding produces consistent output on all three.

## 9. Rollout

Phase 1: Land the framework + both pilots behind a `DESIGN_DESK_ENABLED` flag.
Phase 2: Dogfood internally (the user is the primary user); iterate on UX and the `DESIGN.md` spec itself.
Phase 3: Remove the feature flag; begin per-artifact specs for the remaining eight.

No migration of existing data needed — artifacts are in-memory only in v1.

## 10. Open Questions (Deferred to Implementation)

1. Exact `DESIGN.md` schema — draft above is a starting point; refine by comparing to the google-labs-code/design.md reference and what the AI providers consume well.
2. FossFLOW license verification — confirm compatibility with project license before shipping (`fossflow-lib` package).
3. FossFLOW NXT-skinning approach — CSS overrides vs. fork (implementation will try CSS first).
4. Per-session vs. per-artifact chat threads — implementation can explore both; default to per-session with context filtering.
5. Slide projection rendering for diagrams — rasterize canvas to high-resolution PNG, or render a standalone "journey summary" slide template populated from the journey data? Implementation can prototype both.

## 11. Dependencies on Existing Code

This framework is additive. It does not require changes to:
- The existing checkbox-driven pipeline
- `ChatWorkbench.tsx` / `CorpusChatPanel.tsx` (both continue to exist)
- `slidePostProcessor.ts` (may be reused internally, not modified)
- Any of the 18 existing slide templates (pilots may restyle `persona-card` via DESIGN.md tokens, but do not rewrite it)

New code lives under a new directory tree at `humans-in-control-research/design-desk/` to keep it isolated from the existing surfaces.

## 12. Success Criteria

- A new user can type `#persona #NU` and receive a flat-NXT persona document in <20 seconds with publication-ready quality.
- A new user can type `#journey #NXT` and receive an isometric journey diagram in FossFLOW, NXT-branded, in <30 seconds.
- A user can modify either artifact via chat ("add X") and the canvas updates atomically.
- Both artifacts export to PDF, PNG, and PPTX with exact proportions.
- Running the same prompt across Claude, Gemini, and GPT produces artifacts that visually match within design-system tolerance — proving `DESIGN.md` grounding works.
- The framework is thin enough that adding a new artifact type (beyond the pilots) requires only: new Zod schema, new renderer, new generation prompt, new export hook.
