// presentationPptxExporter.ts
//
// Walks each <section data-section-index> of the loaded interactive
// presentation, treats each as its own 1920×1080 PowerPoint slide, and POSTs
// the multi-slide RenderSpec payload to the proxy's /api/export-pptx endpoint.
// Result: a downloadable .pptx that contains one native editable PowerPoint
// slide per presentation section, matching the on-screen layout.
//
// 2026-05-06 — Companion to humans-in-control-research/design-desk/services/
// artifactExporter.ts (single-artifact freeform path). Same RenderSpec
// pipeline, same proxy endpoint, multi-slide payload variant.

import {
    walkDocumentToSpecs,
    FREEFORM_NATIVE_W,
    FREEFORM_NATIVE_H,
    type RenderSpec,
} from './domToPptx';

const PROXY_BASE =
    (process.env as { PROXY_BASE?: string }).PROXY_BASE || 'http://localhost:5012';

interface ExportOptions {
    /** Filename suggested to the browser download dialog. */
    filename?: string;
    /** Progress callback — receives 0..1 plus a human-readable label. */
    onProgress?: (fraction: number, label: string) => void;
}

interface SlidePayload {
    /** Slide title for the SLIDE_NUM heading PowerPoint shows in nav panes. */
    title: string;
    /** RenderSpec[] for one slide. */
    specs: RenderSpec[];
}

/**
 * Locate every section element rendered by App.tsx. The section wrapper is
 * tagged with `data-section-index` so we can iterate them in scroll order.
 */
function findSections(): HTMLElement[] {
    const list = Array.from(
        document.querySelectorAll<HTMLElement>('section[data-section-index]'),
    );
    list.sort((a, b) => {
        const ai = parseInt(a.dataset.sectionIndex || '0', 10);
        const bi = parseInt(b.dataset.sectionIndex || '0', 10);
        return ai - bi;
    });
    return list;
}

/**
 * Synthetic iframe wrapper. walkDocumentToSpecs only accesses
 * iframe.contentDocument; we feed it the live document. Same-origin walk —
 * no cross-origin barrier because the renderer is reading its own DOM.
 */
function asFakeIframe(): HTMLIFrameElement {
    return {
        contentDocument: document,
        contentWindow: window,
    } as unknown as HTMLIFrameElement;
}

/**
 * Wait for fonts + 2 RAFs so layout has settled before we walk.
 */
async function waitForLayout(): Promise<void> {
    try {
        await (document.fonts?.ready ?? Promise.resolve());
    } catch {
        /* non-fatal */
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/**
 * Capture a single section as a slide. We:
 *  1. Scroll the section to viewport top so motion-driven opacity transforms
 *     resolve to fully-visible (`useTransform(scroll, [0, 0.15, 0.85, 1],
 *     [0, 1, 1, 0.6])` — at 0.15-0.85 progress the section is opacity 1).
 *  2. Wait for paint.
 *  3. Compute the section's bounding rect; use rect.left/top as the origin
 *     so the section's top-left lands at slide (0, 0).
 *  4. Walk the section subtree.
 */
async function captureSection(section: HTMLElement): Promise<RenderSpec[]> {
    // Center the section in the viewport so framer-motion resolves opacity to 1.
    // The opacity transform is: [0, 0.15, 0.85, 1] → [0, 1, 1, 0.6]. Putting the
    // section center at viewport center maps to scroll progress ~0.5, giving
    // opacity 1.
    const center = section.offsetTop + section.offsetHeight / 2 - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, center), behavior: 'instant' as ScrollBehavior });
    await waitForLayout();

    const rect = section.getBoundingClientRect();

    return await walkDocumentToSpecs(asFakeIframe(), {
        entrypoint: section,
        originX: rect.left,
        originY: rect.top,
        // Skip purely decorative atmospheric layers — match the Design Desk
        // exporter's defaults so PPTX stays clean and small.
        skipSelectors: [
            '.grain',
            '[class*="atmos-"]',
            '[data-section-nav]',  // SideNav — slide doesn't need its own nav
        ],
    });
}

/**
 * Derive a PowerPoint slide title from the section's H2 text or the section's
 * data-section-kind attribute fallback.
 */
function titleForSection(section: HTMLElement, index: number): string {
    const h = section.querySelector('h1, h2');
    const text = h?.textContent?.trim();
    if (text) return text.length > 80 ? text.substring(0, 77) + '…' : text;
    return `Section ${String(index + 1).padStart(2, '0')}`;
}

export async function exportPresentationToPptx(opts: ExportOptions = {}): Promise<void> {
    const sections = findSections();
    if (sections.length === 0) {
        throw new Error('No sections found in the presentation. Has the page finished loading?');
    }

    const onProgress = opts.onProgress || (() => undefined);
    onProgress(0, 'Preparing export…');

    // Snapshot scroll position so we can restore it after the walk.
    const savedScrollY = window.scrollY;

    // Force window background color stable during walk (some sections rely on
    // var(--bg-primary) being set on <html>; keep it).
    const originalDocClass = document.documentElement.className;

    const slides: SlidePayload[] = [];
    try {
        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            onProgress(i / sections.length, `Capturing section ${i + 1}/${sections.length}…`);
            const specs = await captureSection(sec);
            slides.push({
                title: titleForSection(sec, i),
                specs,
            });
        }
    } finally {
        // Restore scroll position so the user lands where they were.
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
        document.documentElement.className = originalDocClass;
    }

    onProgress(0.92, 'Building PowerPoint file…');

    // POST to proxy as multi-slide payload. The proxy auto-detects the new
    // shape ({slides:[...]}) vs the legacy single-slide ({specs:[...]}).
    const filename =
        opts.filename ||
        `presentation-${new Date().toISOString().split('T')[0]}.pptx`;

    const body = {
        slides: slides.map((s) => ({ title: s.title, specs: s.specs })),
        filename,
        // Per-slide canvas size (matches what the walker uses).
        sourceWidth: FREEFORM_NATIVE_W,
        sourceHeight: FREEFORM_NATIVE_H,
    };

    const response = await fetch(`${PROXY_BASE}/api/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // 2 minutes for very long presentations
        signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`PPTX export failed (${response.status}): ${errText.slice(0, 300)}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onProgress(1, 'Download started.');
}
