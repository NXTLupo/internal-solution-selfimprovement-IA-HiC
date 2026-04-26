# Freeform-HTML Artifacts — Design Spec

**Date:** 2026-04-26
**Author:** Claude (brainstorm with Jonathan Lupo)
**Status:** Draft, awaiting user review
**Related work:** `2026-04-24-design-desk-framework-design.md`

## Problem

The Design Desk's structured artifacts (org chart, journey map) use Zod-validated JSON schemas. The schemas are rigid and the model fights them. Symptom: schema validation failures on legitimate revisions (`layout.nodes: Invalid input` when the model omits positions for a layout-only change), inability to express layouts the schema doesn't anticipate (radial), and prompts that try to compensate for both schema rigidity and model imagination by adding more rules — which the user rejected as "too rigid."

## Solution

Replace the schema-validated JSON pipeline with **AI-emitted full HTML documents** modeled on a small library of **user-curated exemplars** at exact 1920×1080 resolution. Each artifact is a self-contained slide-formatted HTML document with embedded CSS, inheriting visual DNA from a brand-specific reference document. The model adapts content to fit the corpus and user request; the visual treatment is non-negotiable and inherited from the exemplar.

This kills the schema, kills reactflow + dagre + fossflow rendering, kills the per-kind prompt builders, and replaces them with one unified freeform pipeline. The model collaborates freely with the user via chat-driven revisions; brand and idiom consistency is enforced by exemplar inheritance, not by validation.

## Scope

### In scope

Five diagram-shaped artifacts move to freeform-HTML:

| Hashtag | Kind | Exemplar (NU) | Exemplar (NXT) | Skill framing |
|---|---|---|---|---|
| `#org` | `org` | `05-org-chart-NU.html` | `06-org-chart-NXT.html` | hierarchy / radial / matrix variants |
| `#arch` | `arch` | `03-architecture-NU.html` | `04-architecture-NXT.html` | systems + data flows |
| `#roadmap` | `roadmap` | `07-roadmap-NU.html` | `08-roadmap-NXT.html` | phases + milestones |
| `#blueprint` | `blueprint` | `01-service-blueprint-NU.html` | `02-service-blueprint-NXT.html` | future-state workflow (post-analysis) |
| `#journey` | `journey` | `01-service-blueprint-NU.html` | `02-service-blueprint-NXT.html` | current-state workflow (as-is, pre-analysis) |

Note: `#journey` and `#blueprint` share the same visual exemplar files. The semantic difference (current vs future state) lives in the diagram-illustrator skill markdown, not the exemplar HTML. This is intentional — the visual consistency makes the deliverable arc read as "here's now / here's the design" in the same visual language.

### Out of scope (this release)

- `#persona` — stays structured (text-heavy, schema works)
- `#gap-matrix`, `#competitive-matrix` — deferred; can be added later by authoring exemplars + skills
- Direct DOM editing (click-to-edit-text, drag-to-rearrange) — chat-only revisions for v1
- Multi-slide single artifact — one artifact = one slide always
- Custom user-uploaded exemplars — author-curated only
- Streaming HTML rendering — generate-then-render
- Computer-use integration (`#capture` / `#verify` / `#research`) — separate plan

## Hashtag vocabulary (frozen)

**Content:** `#persona`, `#journey`, `#org`, `#arch`, `#roadmap`, `#blueprint`
**View modifiers:** `#slide`, `#slides`, `#deck` (`#slides` and `#deck` are aliases)
**Brand modifiers:** `#NXT`, `#NU`

## Architecture

### Artifact contract

```ts
interface FreeformArtifact {
  id: string;                    // 'f_<timestamp>'
  type: 'freeform';
  kind: 'org' | 'journey' | 'arch' | 'roadmap' | 'blueprint';
  brand: 'nxt' | 'nu';
  title: string;
  html: string;                  // sanitized full HTML document, 1920x1080
  citations: { label: string; source: string }[];
  createdAt: number;
  updatedAt: number;
}
```

The HTML field holds a complete `<!DOCTYPE html>` document with embedded CSS, embedded fonts, and the body content. No external runtime dependencies inside the artifact — it renders standalone.

### Skill axes

Two axes of guidance, both loaded by hashtag at generation time:

**Brand-style skills (2):**
```
.claude/skills/brands/nxt-style/SKILL.md
.claude/skills/brands/nu-style/SKILL.md
```
Markdown describing brand voice, anti-patterns, when-to-use guidance for each exemplar variant. Tokens (colors, typography) are NOT defined here — they live in the exemplar HTML's `<style>` block. The brand skill is the editorial layer; the exemplar is the visual ground truth.

**Diagram-illustrator skills (5):**
```
.claude/skills/diagrams/org-illustrator/SKILL.md
.claude/skills/diagrams/journey-illustrator/SKILL.md
.claude/skills/diagrams/arch-illustrator/SKILL.md
.claude/skills/diagrams/roadmap-illustrator/SKILL.md
.claude/skills/diagrams/blueprint-illustrator/SKILL.md
```
Markdown describing semantic framing (current vs future state for journey vs blueprint), idiom variants (hierarchical / radial / matrix for org), anti-patterns, and when to scale up/down (add swimlanes, add quotes, etc.).

**Exemplar HTML files (10 logical, 8 physical):**
```
humans-in-control-research/styles/
  01-service-blueprint-NU.html       used by #blueprint AND #journey (NU)
  02-service-blueprint-NXT.html      used by #blueprint AND #journey (NXT)
  03-architecture-NU.html
  04-architecture-NXT.html
  05-org-chart-NU.html
  06-org-chart-NXT.html
  07-roadmap-NU.html
  08-roadmap-NXT.html
```

### Generation pipeline

```
chat input "#org #NU advancement division"
  →  parseHashtags → { content: ['org'], brand: 'nu', view?, currentArtifact? }
  →  exemplarLoader.load(kind='org', brand='nu')
        reads styles/05-org-chart-NU.html
        reads .claude/skills/brands/nu-style/SKILL.md
        reads .claude/skills/diagrams/org-illustrator/SKILL.md
        fail-fast if any missing — actionable error to user
  →  designContext.buildCombinedEvidence(loadDesignContext())
        CLIENT UPLOADS + EXTERNAL RESEARCH CORPUS + THEMES + PERSONAS + JOURNEY
  →  buildFreeformPrompt({
        systemRole, exemplarHtml, brandSkill, diagramSkill,
        corpus, currentArtifact?, userPrompt,
        outputContract: ':::nxt:freeform <json> --- <html> :::'
      })
  →  callForModel(prompt, model)             # gemini | claude | gpt
        maxTokens: 16000, temp: 0.4
  →  freeformParser.parse(rawOutput)         # extract JSON header + HTML body
  →  freeformSanitizer.sanitize(html)        # DOMPurify with allowlist
  →  validateFreeformArtifact(jsonHeader)    # minimal Zod (id, kind, brand, title, citations)
  →  store.replaceArtifact | store.addArtifact
```

### Output protocol (Q2 = C: hybrid JSON shell + raw HTML body)

```
:::nxt:freeform
{ "id": "f_1714150000000", "kind": "org", "brand": "nu",
  "title": "Northeastern Advancement Division", "citations": [...] }
---
<!DOCTYPE html>
<html lang="en">
<head>...</head>
<body class="brand-nu">...</body>
</html>
:::
```

JSON header for structured metadata + `---` separator + raw HTML body. Decouples JSON-escaping headaches (newlines, quotes) from the HTML payload. Existing `:::nxt:TYPE` parser convention extended.

### Sanitization (Q4)

DOMPurify with explicit allowlist:

**Tags:** `html, head, body, meta, title, link, style, div, span, h1-h6, p, ul, ol, li, table, thead, tbody, tr, td, th, svg, path, line, circle, rect, text, g, polygon, polyline, defs, marker, img, br, hr`

**Attributes:** `class, style, data-*, aria-*, role, viewBox, width, height, x, y, x1, y1, x2, y2, cx, cy, r, d, fill, stroke, stroke-width, points, transform, rel, href, src, alt, charset, content`

**Stripped:** `<script>`, all event handlers (`onclick`, `onload`, etc.), `javascript:` URLs, `<iframe>` (the artifact itself is the document body — no nested iframes), `<form>`, `<input>`.

**Preserved:** `<style>` blocks (the exemplars carry CSS inline), `<link rel="stylesheet">` to Google Fonts (the exemplars preload Archivo + Fraunces + JetBrains Mono).

### Render

```tsx
<FreeformViewer artifact={a}>
  <iframe
    srcDoc={a.html}
    sandbox="allow-same-origin"        // no scripts, no nav, no forms
    style={{
      width: 1920, height: 1080, border: 0,
      transform: `scale(${fitZoom})`, transformOrigin: 'top left'
    }}
    onLoad={waitForFontsThenSignalReady}
  />
</FreeformViewer>
```

`srcDoc` isolates artifact CSS from the host app DOM (the exemplars set body backgrounds, `:root` variables, and `overflow: hidden` that would clobber the rest of the Designer). `allow-same-origin` lets the export pipeline read the iframe's DOM. Fit-zoom scales the 1920×1080 iframe to the viewer area; export still uses native 1920×1080.

### Export

**PNG / PDF (image-only at high quality):**
- `html-to-image.toPng(iframeBody, { pixelRatio: 2, width: 1920, height: 1080, backgroundColor: '#FAFAFA' })` → 3840×2160 backing buffer for sharp text in raster
- PNG: dataURL → download
- PDF: `jsPDF` landscape `13.333" × 7.5"`, `addImage` at native pixel mapping

**PPTX (image background + vector text overlay):**
1. Capture image as above
2. Walk `iframe.contentDocument.body` for visible text nodes:
   ```ts
   for each Text node t with non-empty trimmed content:
     range.selectNode(t)
     rect = range.getBoundingClientRect()
     style = window.getComputedStyle(t.parentElement)
     skip if rect.height < 8 || rect.width < 24    // decorative; image-only
     collect { text, rect, fontFamily, fontSize, fontWeight, color, textAlign }
   ```
3. PptxGenJS:
   ```ts
   pptx.defineLayout({ name: 'NXT_16x9', width: 13.333, height: 7.5 })
   slide.addImage(dataUrl, { x: 0, y: 0, w: 13.333, h: 7.5 })
   for each text: slide.addText(text.text, {
     x: text.rect.x / 1920 * 13.333,
     y: text.rect.y / 1080 * 7.5,
     w: text.rect.w / 1920 * 13.333,
     h: text.rect.h / 1080 * 7.5,
     fontFace: text.fontFamily, fontSize: pxToPt(text.fontSize),
     color: rgbToHex(text.color), bold: text.fontWeight >= 700
   })
   ```

This produces PPTX where the visual is pixel-perfect (atmospheric washes, grain, custom typography rasterized in the image) AND the text is editable as standard PowerPoint text frames overlaid on the image background. PowerPoint search finds the text. Editing the text leaves the image untouched.

**Quality commitments:**
- 1920×1080 native resolution exactly; no scaling artifacts
- `pixelRatio: 2` for sharp text in raster
- `await document.fonts.ready` before snapshot
- No cross-origin `cssRules` access (iframe-isolated)
- Concurrent export requests serialize through a single module-level queue (one export at a time, regardless of which artifact) to avoid contention on the iframe DOM read

### Slide composition

Every freeform artifact is born at 16:9 — `#slide` is no-op for these (kept for parity with structured persona). `#slides` / `#deck` (aliases) trigger **deck composition mode**: when the user types `#slides` or `#deck` in the Designer chat, a "Compose Deck" panel appears in the Designer toolbar with a drag-handle reorderable list of currently-open artifact tabs and a single "Export deck" button (PPTX / PDF / PNG-zip dropdown). Each artifact = one slide in user-chosen order. No new artifact type; deck is a transient export operation that does not persist.

## File map

### New (~600 lines)
```
design-desk/
  services/
    exemplarLoader.ts          load HTML exemplar + brand skill + diagram skill
    chatToFreeform.ts          build prompt, route to provider, parse output
    freeformParser.ts          parse :::nxt:freeform blocks
    freeformSanitizer.ts       DOMPurify wrapper
    freeformExporter.ts        PNG / PDF / PPTX with vector overlay
  components/
    FreeformViewer.tsx         iframe-based renderer
  schemas/
    freeformArtifact.ts        minimal Zod (html opaque)
.claude/skills/
  brands/nxt-style/SKILL.md
  brands/nu-style/SKILL.md
  diagrams/org-illustrator/SKILL.md
  diagrams/journey-illustrator/SKILL.md
  diagrams/arch-illustrator/SKILL.md
  diagrams/roadmap-illustrator/SKILL.md
  diagrams/blueprint-illustrator/SKILL.md
```

### Deleted (~1500 lines + npm deps)
```
design-desk/components/OrgChartCanvas.tsx
design-desk/components/OrgChartNode.tsx
design-desk/components/FossflowCanvas.tsx
design-desk/schemas/orgChartArtifact.ts
design-desk/schemas/journeyArtifact.ts
design-desk/prompts/orgChartPrompt.ts
design-desk/prompts/journeyPrompt.ts
design-desk/services/artifactExporter.ts
npm: fossflow, reactflow, @dagrejs/dagre  (removed)
```

### Touched (small edits)
```
design-desk/services/hashtagParser.ts    add 'arch', 'blueprint'; replace 'tech-arch'/'service-blueprint'
design-desk/DesignDeskChat.tsx           route diagram kinds through chatToFreeform
design-desk/ArtifactViewer.tsx           render FreeformViewer for type='freeform'
design-desk/store/designDeskStore.ts     widen artifact union; drop legacy on hydrate
```

## Migration

On bundle load, the design-desk store hydration step filters legacy artifacts:
```ts
artifacts.filter(a => a.type !== 'org' && a.type !== 'journey')
```
One-time wipe. Persona artifacts survive untouched. User regenerates anything they wanted to keep — acceptable because nothing in the current store is production work.

## Risks

1. **Token bloat from exemplar injection.** Each exemplar is 30–52KB ≈ 8–13K tokens. Plus brand skill + diagram skill + corpus + uploads = generation prompts could routinely push 60K+ tokens. Mitigation: corpus is already capped at 200K chars; all three target models (Gemini 2.5 Flash, Claude Opus 4.7, GPT-5.4) have ≥1M context windows.

2. **Model fidelity to exemplar visual treatment.** Model may degrade visual treatment under pressure — drop atmospheric washes, simplify the frame, change typography. Mitigation: prompt explicitly forbids removing the frame, washes, or type stack; sanitize-time check verifies output contains expected structural markers (`.slide-frame`, `.frame`, brand `--accent` variable references); if missing, re-prompt once with stronger constraint.

3. **Iframe + html-to-image edge cases.** Some browsers throttle offscreen iframes. Mitigation: render iframe in the live (visible, scaled) viewer DOM; export reads from the existing visible iframe instead of mounting a fresh one offscreen.

4. **PPTX vector overlay accuracy.** Bounding-box extraction may drift on multi-line wrapped text or transformed elements. Mitigation: skip text overlay for nodes with bounding box `<8px` tall or `<24px` wide (decorative); fall back to image-only for those nodes.

5. **Exemplar drift over time.** As the user updates exemplar HTML files, generated artifacts diverge from older artifacts in the same project. Acceptable for v1 — exemplar versioning can be added in v2 if needed.

## Success criteria

- A user typing `#org #NU advancement division` produces an HTML org chart that visually matches `05-org-chart-NU.html`'s frame, typography, and atmospheric treatment, with content adapted from corpus + uploads.
- A revision request ("make it radial with Diane at the center") succeeds without schema errors and produces a visibly different layout while preserving brand and frame.
- The model can scale dimensionality dynamically: `#blueprint #NU customer onboarding` produces 5 swimlanes when the corpus warrants 5; 8 swimlanes when it warrants 8.
- PNG export is 3840×2160 with sharp text and matches the in-app render pixel-for-pixel.
- PPTX export opens in PowerPoint with editable text overlay and pixel-accurate image background.
- All five diagram kinds work in both NXT and NU brands without code changes per kind.
- Persona artifacts continue to work unchanged.

## Open work blocked on user

- **Brand-style skill content** for `nxt-style/SKILL.md` and `nu-style/SKILL.md` (markdown — voice, anti-patterns, when-to-use)
- **Diagram-illustrator skill content** for all five `*-illustrator/SKILL.md` files (markdown — idiom guidance, semantic framing for journey vs blueprint)

The pipeline is buildable without these — it will fail-fast at generation time with actionable errors until they're authored. Recommend authoring journey + blueprint skills first since they share an exemplar but diverge semantically.
