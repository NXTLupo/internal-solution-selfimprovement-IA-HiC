---
name: export-paint-sync
invocation: model
version: 1.0
description: Defeats the html2canvas race condition in HiC's exportService.ts that produces blank slides in PPTX/PDF/PNG exports. Wraps every export call with a deterministic paint-readiness contract — fonts loaded, images decoded, React effects flushed, layout stable across two consecutive animation frames — BEFORE html2canvas fires. Closes the root cause of the "27 of 30 slides shipped blank" failure in STRATEGY_DECK_PIPELINE_AUDIT.md. Proactive complement to the export-render-verifier subagent (which catches blank slides after the fact); this skill prevents them. Composes with the pre_export_dom_audit.py hook (which fires the export-mode CSS class) — both proactive defenses share a single `body[data-export-mode]` chokepoint.
thinking: high
category: pre-emit-defense
triggers:
  - export blank slides
  - html2canvas race
  - paint sync
  - export readiness
  - "#export-sync"
  - "#paint-sync"
---

# Export Paint Sync

## You Are

The discipline that prevents `html2canvas` from firing before React has finished painting. Right now the html2canvas sites call `html2canvas(element)` and the function returns a canvas. Often the canvas is blank because React was still mid-effect-flush when capture happened. The user opens a 12.8 MB PPTX and finds 27 of 30 slides empty.

You are not html2canvas. You are the wrapper around html2canvas. You guarantee that by the time the canvas-capture call fires, every prerequisite is met:

1. All fonts in the brand stack have actually loaded (Bebas Neue / Archivo / JetBrains Mono / Spectral / Roboto — `document.fonts.ready` resolved)
2. All `<img>` elements have decoded (every `img.complete && img.naturalWidth > 0`)
3. All React effects have flushed (two consecutive `requestAnimationFrame` ticks with stable layout)
4. The target element has a non-zero bounding box (a hidden or zero-height element captures as blank)
5. The `body[data-export-mode]` CSS class is set (hides editor UI per pre_export_dom_audit hook)
6. No in-flight image-decode promise is pending

You emit a single async function that resolves to the capture-ready DOM element, or rejects with a structured PaintSyncError naming which prerequisite failed.

## When to activate

- Before every call to `html2canvas()` in the html2canvas sites (`components/CorpusChatPanel.tsx` handleExportDeckPDF, `components/SlideCanvas.tsx`, `components/DeliverableCard.tsx`, `components/OutputBoard.tsx`, `components/ResultsView.tsx`; the legacy exportService.ts was deleted, and the PPTX path is the gold stage-HTML exporter, which does not use html2canvas)
- Before every PPTX export that snapshots interactive slides
- Before every PDF export that builds pages from rendered HTML
- Before every PNG export

Do NOT activate when:
- The export source is already a static SVG / canvas (no React, no fonts to wait on)
- The export is server-side rendered (e.g., the `pptxgenjs` native path that builds slides from data, not from DOM)
- The user is exporting a non-deliverable artifact (e.g., a Markdown report — no canvas needed)

## Input contract

You receive:
1. The target DOM element (the slide / page / canvas to capture)
2. The brand context (`nxt` | `nu` — which font stack to wait on)
3. Optional: a timeout in ms (default 10000) — refuse to wait forever for stragglers
4. Optional: list of additional CSS classes / data attributes to set before capture

## The 6-step readiness ladder

You apply these in order. Each one resolves before the next begins.

### Step 1 — Apply export-mode contract
- `document.body.setAttribute('data-export-mode', 'true')` — single chokepoint for hiding editor UI
- Add any additional classes from the caller
- Force a synchronous layout read to commit the class change

CSS contract: every interactive affordance has `body[data-export-mode] .editor-only { display: none; }` (per pre_export_dom_audit hook spec).

### Step 2 — Wait for fonts
```js
await document.fonts.ready;
```

But — `document.fonts.ready` resolves once, and it can resolve BEFORE the actually-needed-for-this-slide font has been requested. Belt-and-suspenders: also explicitly check each font in the brand stack via `document.fonts.check('16px "Bebas Neue"')` etc. If any returns false, force-load via the FontFace API and re-await.

For the NXT stack, check: `Bebas Neue`, `Archivo`, `JetBrains Mono`.
For the NU stack, check: `Spectral`, `Roboto`, `Roboto Mono`.

Failure: emit `PaintSyncError: FONT_NOT_LOADED <fontname>`.

### Step 3 — Wait for images
Find every `<img>` inside the target element. For each:
- If `img.complete && img.naturalWidth > 0`, ready
- Otherwise await `img.decode()` (modern browsers) OR a `load` event with a timeout

Use `Promise.all()` across all images. If any image fails to load within the timeout, emit `PaintSyncError: IMAGE_NOT_DECODED <src>`.

### Step 4 — Wait for layout stability (double-RAF)
```js
await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
```

This guarantees React's commit phase has flushed and layout has settled. A single RAF is NOT enough — React effects scheduled inside the first RAF callback won't have run yet.

### Step 5 — Verify target element is non-trivial
```js
const rect = element.getBoundingClientRect();
if (rect.width < 50 || rect.height < 50) throw new PaintSyncError('TARGET_NOT_RENDERED');
```

A common html2canvas blank-slide cause: the parent container is `display: none` or `visibility: hidden` because of an animation. The bounding-box check catches this before capture.

### Step 5b — Verify no text element word-breaks (added 2026-05-24 after Georgia Tech case-study failure)

When the export canvas widens vs the preview, percentage-based body columns scale up, but fixed-px label columns do NOT — and any font substitution (Step 2 failure) makes glyphs wider. Result: section labels like `CHALLENGE`, `APPROACH`, `OUTCOME`, `LESSON` overflow their narrow label column and CSS `overflow-wrap` chops them mid-word into `CHALLENG / E`, `APPROAC / H`. This is the most visually destructive defect class — a partner reading the export sees nonsense headers.

Before capture, walk every text element inside `element` whose `font-weight` or class identifies it as a section label (per the slide template's schema — typically `.section-label`, `.case-study-label`, `[data-role="section-header"]`). For each:

```js
const el = labelEl;
const cs = getComputedStyle(el);
const containerWidth = el.getBoundingClientRect().width;
// Measure intrinsic text width using a hidden canvas
const ctx = document.createElement('canvas').getContext('2d');
ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
const intrinsicWidth = ctx.measureText(el.textContent).width;
if (intrinsicWidth > containerWidth * 0.95) {
  throw new PaintSyncError('LABEL_OVERFLOW', {
    detail: `label "${el.textContent}" needs ${intrinsicWidth}px but container is ${containerWidth}px`,
    element_path: cssPath(el)
  });
}
```

A `LABEL_OVERFLOW` is unrecoverable at capture time — the caller must either widen the label container in the template OR shorten the label text. The skill does NOT auto-shorten; it fails loudly so the template gets fixed once.

### Step 5c — Verify no clipped attribution / quote elements (added 2026-05-24)

Walk every element with class containing `attribution`, `quote-author`, `quote-source`, `caption`, or matching `<cite>` / `<figcaption>`. Check whether the element's `scrollWidth > clientWidth` OR `scrollHeight > clientHeight` — either indicates the content is clipped by its container. If clipped, emit `PaintSyncError: CONTENT_CLIPPED` with the element path. Same remediation rule: fix the template, don't paper over at capture.

### Step 5d — Verify brand wordmark presence in dark sidebar (added 2026-05-24)

Some slide templates have a brand wordmark element (e.g., `.brand-wordmark`, `[data-brand="wordmark"]`) in a sidebar. If the template SHOULD show the wordmark for this brand, verify the element exists in the DOM, has non-zero bounding rect, and is not hidden by `display:none` / `visibility:hidden` / `opacity:0`. Missing wordmark in export but present in preview indicates the export-mode CSS class chain inadvertently hid it. Emit `PaintSyncError: WORDMARK_MISSING`.

### Step 6 — Final stability check (no in-flight effects)
- Capture `document.body.innerHTML.length` (or a hash of it)
- Wait one more frame
- Compare; if different, layout is still mutating → wait another frame, repeat up to 5 times

If layout never stabilizes in 5 frames, emit `PaintSyncError: LAYOUT_UNSTABLE`.

## After readiness — invoke html2canvas

Once all six steps resolve cleanly, call html2canvas with options that defeat its own known failure modes:

```js
const canvas = await html2canvas(element, {
  useCORS: true,
  allowTaint: false,
  scale: window.devicePixelRatio || 2,
  logging: false,
  backgroundColor: null,  // honor the element's actual background
  // Critical for fonts: html2canvas re-parses fonts; provide an explicit
  // onclone callback that injects @font-face declarations into the cloned
  // document so fonts are available in its isolated context
  onclone: (clonedDoc) => {
    // Re-inject font-face declarations from the original document
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        Array.from(sheet.cssRules || []).forEach(rule => {
          if (rule instanceof CSSFontFaceRule) {
            const style = clonedDoc.createElement('style');
            style.textContent = rule.cssText;
            clonedDoc.head.appendChild(style);
          }
        });
      } catch (e) {}
    });
  },
});
```

## After capture — restore state

```js
document.body.removeAttribute('data-export-mode');
```

This is non-negotiable. The export-mode class hides editor UI; leaving it set would freeze the SPA into export-mode permanently.

## Output contract — the PaintReadyHandle

```typescript
type PaintReadyHandle = {
  element: HTMLElement;
  capturedAt: number;  // performance.now() at capture time
  fontsReady: string[];  // which fonts were verified
  imagesDecoded: number;
  stabilizationFrames: number;  // how many RAFs to settle
  exportModeApplied: boolean;
};

type PaintSyncError = {
  reason: 'FONT_NOT_LOADED' | 'IMAGE_NOT_DECODED' | 'TARGET_NOT_RENDERED'
        | 'LAYOUT_UNSTABLE' | 'TIMEOUT' | 'LABEL_OVERFLOW' | 'CONTENT_CLIPPED'
        | 'WORDMARK_MISSING';
  detail: string;
  partial?: { fontsReady: string[]; imagesDecoded: number };
  element_path?: string;  // CSS-path of the offending element when applicable
};
```

Caller pattern:

```typescript
try {
  const handle = await paintSync(element, { brand: 'nxt' });
  const canvas = await html2canvas(handle.element, /* options above */);
  return canvas;
} catch (e) {
  if (e instanceof PaintSyncError) {
    // Surface to user via fallback-event-surfacing skill
    surfaceDegradation({ kind: 'export_paint_sync_failed', detail: e });
    // Decide: retry with longer timeout, or hard fail
  }
  throw e;
} finally {
  document.body.removeAttribute('data-export-mode');
}
```

## Hard rules

1. **Always restore export-mode in a `finally`.** Leaving the flag set freezes the SPA.
2. **Never silently swallow PaintSyncError.** Every failure surfaces to the user via `fallback-event-surfacing` — they need to know an export's degraded.
3. **Never timeout in production.** If a font / image / layout takes >10s, that's a real bug; emit TIMEOUT and let the verifier subagent capture evidence.
4. **No emoji.** Repo-wide rule.
5. **Idempotent across retries.** Re-running paintSync on the same element after a transient failure must not leak state from the first attempt.
6. **Compose with the export-mode CSS contract.** This skill assumes `body[data-export-mode] .editor-only { display: none; }` is wired in the stylesheet. If it isn't, set it as part of the skill's installation note.

## Composition

- **Proactive partner**: `pre_export_dom_audit.py` hook — verifies the export-mode CSS class is wired before exports run
- **Reactive partner**: `export-render-verifier` subagent — catches what slips past this skill
- **Surfaces via**: `fallback-event-surfacing` skill — paint-sync failures become visible degradation events
- **Implementation site**: `humans-in-control-research/components/CorpusChatPanel.tsx` — the paintSync function lives here, called from every existing html2canvas site
- **Pairs with** the recovery story in `services/aiOutputRepair.ts` (from the `ai-output-syntax-repair` skill) — together they cover the two largest classes of HiC silent failures
