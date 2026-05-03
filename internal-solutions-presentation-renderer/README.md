# Presentation Renderer

Generic data-driven renderer for `PresentationPayload` JSON objects produced
by HiC's narrative composer (`humans-in-control-research/services/narrativeComposer.ts`).

This service is the rendering target for `#presentation #NXT` / `#presentation #NU`
directives in the HiC Analyst Chat. It is forked-and-genericized from the
Inner Focus presentation framework (`d:/inner-focus-presentation/`) — same
parallax mechanic, same scroll-driven animations, same 250vh sticky hero —
but content is data-driven rather than hardcoded, and brand resolution swaps
NXT (chartreuse + teal) ↔ NU (Huskies red + near-black) via CSS variables.

## Status

**Scaffolding only.** This iteration lays down package.json, the section
dispatcher contract, and the brand-token resolution. The actual section
component implementations + the IFP App.tsx fork happen in the next
iteration after architectural review.

## Port

`5014` (unique within the workbench port map — see root CLAUDE.md).

## Data flow

```
Browser → http://localhost:5014/p/{slug}
       → GET http://localhost:5012/api/presentations/{slug}
       → PresentationPayload JSON
       → SECTION_REGISTRY dispatcher renders each section
       → Brand tokens applied via data-brand="NXT|NU" on <html>
```

## What this service does NOT do

- No chat surface. The presentation is a deliverable, not an interactive AI surface.
  All Q&A happens in the HiC Analyst Chat, accessed via "Open in Analyst Chat"
  link at the bottom of the presentation.
- No auth, no API keys, no LLM calls. This service reads JSON from the proxy
  and renders it. Pure rendering.
- No mutations. Read-only for the entire payload lifecycle.

## Dev

```bash
# Once package.json deps are wired up:
npm install
npm run dev   # Vite dev server on port 4500 → 5014 in Docker
```

## Build (Docker)

```bash
docker compose -f ../docker-compose-all.yml up -d --build presentation-renderer
```

## Architectural seams

1. **Section dispatcher** — `src/sections/SECTION_REGISTRY` maps `SectionKind`
   to React components. One component per kind. Adding a new kind = add one
   entry + one component file.

2. **Brand tokens** — `brand/tokens.css` defines `:root` and `[data-brand="NU"]`
   CSS variable overrides. App.tsx sets `data-brand` and `data-theme` on
   `<html>` once at mount.

3. **slideTemplate bridge** — Section components import HiC's existing
   `humans-in-control-research/components/slideTemplates/web.tsx` renderers
   for content rendering. Wrapper sections provide the parallax chrome;
   slide templates provide the content density. (Not yet wired in this
   scaffolding — bridge happens in iteration 2.)
