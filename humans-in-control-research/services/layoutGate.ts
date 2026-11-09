/**
 * layoutGate.ts (2026-10-24, owner: "FIX THE SYSTEM, I never want these issues again on any deck")
 *
 * Every composed slide is MEASURED in the browser after it renders: text beyond the canvas, text clipped inside
 * its box, text boxes colliding, leaked citation fragments, dead space. A slide that fails is repaired by stepping
 * its type scale down (composeSlide honors payload._fontScale) and re-measured; what cannot be repaired is named in
 * the deck's layout receipt. Pure measurement + classification here; the chat panel supplies the documents.
 */

export interface SlideLayoutDefects {
    slideId: string;
    offCanvas: number;
    clipped: number;
    overlaps: number;
    fragments: number;
    /** 0..1 share of the canvas no text or image box covers (bounding-box union, coarse). */
    deadSpace: number;
    details: string[];
}

const FRAGMENT_RE = /[(\[](?:Sources?):|[a-z0-9_./-]+\.md#c\d+|CHUNK_\d+|\[\[/i;
const W = 1920, H = 1080;

function isNumeralBox(el: Element, text: string): boolean {
    const cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
    return text.length <= 4 && (/saira/i.test(cs.fontFamily) || Number(cs.fontSize.replace('px', '')) >= 56);
}

/** Measure one rendered slide document (the 1920x1080 stage). */
function measureSlideDocument(doc: Document, slideId: string): SlideLayoutDefects {
    const out: SlideLayoutDefects = { slideId, offCanvas: 0, clipped: 0, overlaps: 0, fragments: 0, deadSpace: 0, details: [] };
    const win = doc.defaultView || window;
    const all = Array.from(doc.querySelectorAll('body *'));
    const textEls = all.filter((e) => {
        const cs = win.getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return Array.from(e.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0);
    });
    const boxes = textEls.map((e) => ({ e, r: e.getBoundingClientRect(), text: (e.textContent || '').trim().slice(0, 50) }));
    // 1. beyond the canvas (a 2px tolerance for sub-pixel rounding)
    for (const b of boxes) {
        if (b.r.right > W + 2 || b.r.bottom > H + 2 || b.r.left < -2 || b.r.top < -2) { out.offCanvas++; out.details.push(`off-canvas: "${b.text}"`); }
    }
    // 2. clipped inside its own box (overflow hidden with more content than height), or a text box that runs past
    //    the bottom of an absolutely positioned parent card
    for (const b of boxes) {
        const el = b.e as HTMLElement;
        const cs = win.getComputedStyle(el);
        if (cs.overflow === 'hidden' && (el.scrollHeight > el.clientHeight + 6 || el.scrollWidth > el.clientWidth + 6)) { out.clipped++; out.details.push(`clipped: "${b.text}"`); }
    }
    // 3. collisions between text boxes (neither contains the other; numerals that span their row are exempt)
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
            if (isNumeralBox(a.e, a.text) || isNumeralBox(b.e, b.text)) continue;
            const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
            const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
            if (ix > 8 && iy > 8) { out.overlaps++; if (out.details.length < 12) out.details.push(`overlap: "${a.text}" / "${b.text}"`); }
        }
    }
    // 3b. a picture over text (mirrors proxy/layout_measure.py; full-bleed backdrops sit under titles by design)
    // the rendered text lines, not the element box (a glyph inside a wide name box touches no letter)
    const lineRects = (e: Element): DOMRect[] => {
        try { const rg = doc.createRange(); rg.selectNodeContents(e); const l = Array.from(rg.getClientRects()); return l.length ? l : [e.getBoundingClientRect()]; } catch { return [e.getBoundingClientRect()]; }
    };
    for (const im of Array.from(doc.querySelectorAll('img'))) {
        const r = im.getBoundingClientRect();
        const area = r.width * r.height;
        if (area < 400 || area > 0.4 * 1920 * 1080) continue;
        for (const b of boxes) {
            if (isNumeralBox(b.e, b.text)) continue;
            const hit = lineRects(b.e).some(lr => (Math.min(r.right, lr.right) - Math.max(r.left, lr.left)) > 12 && (Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top)) > 8);
            if (hit) { out.overlaps++; if (out.details.length < 12) out.details.push(`image over text: "${b.text}"`); }
        }
    }
    // 3c. a rule through text (2026-10-27 run 43: the fourth line of a comparison cell sat on the row divider and the slide
    // measured clean). A hairline (a bare element at most 4 px tall and 60 px wide) that crosses a text line's glyph band.
    const rules = Array.from(doc.querySelectorAll('body *')).filter(e => {
        if (e.childElementCount || (e.textContent || '').trim()) return false;
        const r = e.getBoundingClientRect();
        return r.height > 0 && r.height <= 4 && r.width >= 60;
    }).map(e => e.getBoundingClientRect());
    for (const r of rules) {
        const y = (r.top + r.bottom) / 2;
        for (const b of boxes) {
            if (isNumeralBox(b.e, b.text)) continue;   // a display numeral over its hairline is the design (run 45)
            const hit = lineRects(b.e).find(lr => (Math.min(r.right, lr.right) - Math.max(r.left, lr.left)) > 12 && y > lr.top + 0.25 * lr.height && y < lr.bottom - 0.15 * lr.height);
            if (hit) { out.overlaps++; if (out.details.length < 12) out.details.push(`rule through text: "${b.text}"`); break; }
        }
    }
    // 4. leaked citation fragments
    const bodyText = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';
    if (FRAGMENT_RE.test(bodyText)) { out.fragments = (bodyText.match(/[(\[](?:Sources?):|\.md#c\d+|CHUNK_\d+/gi) || []).length || 1; out.details.push('leaked citation fragment'); }
    // 5. dead space: share of the canvas left by the union of text and image boxes (coarse: bounding rectangle)
    const imgs = Array.from(doc.querySelectorAll('img')).map((i) => i.getBoundingClientRect());
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (const r of [...boxes.map((b) => b.r), ...imgs]) { minX = Math.min(minX, r.left); minY = Math.min(minY, r.top); maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom); }
    const used = (boxes.length || imgs.length) ? ((maxX - minX) * (maxY - minY)) / (W * H) : 0;
    out.deadSpace = Math.max(0, Math.min(1, 1 - used));
    return out;
}

export function hasLayoutFailure(d: SlideLayoutDefects): boolean {
    return d.offCanvas > 0 || d.clipped > 0 || d.overlaps > 0;
}

export interface LayoutGateReceipt {
    measured: number;
    clean: number;
    repaired: Array<{ slideId: string; scale: number }>;
    open: Array<{ slideId: string; details: string[] }>;
    fragments: string[];
    line: string;
}

export function summarizeLayoutGate(results: Array<{ slideId: string; before: SlideLayoutDefects; after?: SlideLayoutDefects; scale?: number }>): LayoutGateReceipt {
    const repaired: LayoutGateReceipt['repaired'] = [];
    const open: LayoutGateReceipt['open'] = [];
    const fragments: string[] = [];
    let clean = 0;
    for (const r of results) {
        const final = r.after || r.before;
        if (r.before.fragments > 0) fragments.push(r.slideId);
        if (!hasLayoutFailure(r.before)) { clean++; continue; }
        if (r.after && !hasLayoutFailure(r.after)) repaired.push({ slideId: r.slideId, scale: r.scale || 1 });
        else open.push({ slideId: r.slideId, details: final.details.slice(0, 4) });
    }
    const line = `Layout check: ${results.length} slide${results.length === 1 ? '' : 's'} measured; ${clean} clean; ${repaired.length} repaired by a type step-down${open.length ? `; ${open.length} still open (${open.map(o => o.details[0] || o.slideId).join('; ')})` : ''}${fragments.length ? `; citation fragments on ${fragments.length} slide(s)` : ''}.`;
    return { measured: results.length, clean, repaired, open, fragments, line };
}

const SCALES = [0.92, 0.85, 0.78];

/** Measure every slide, repair failures by stepping the type scale, re-measure, and return the receipt. */
export async function runLayoutGate(
    slideIds: string[],
    io: {
        getDoc?: (id: string) => Promise<Document | null>;
        /** 2026-10-26: measure a batch elsewhere (the proxy's Chromium); a missing entry means "could not measure". */
        measureMany?: (ids: string[]) => Promise<Record<string, SlideLayoutDefects | null>>;
        applyScale: (id: string, scale: number) => void; waitMs?: number; log?: (m: string) => void;
        /** 2026-10-26: a picture over text is repaired by removing the optional picture (a smaller font cannot move it). */
        dropImages?: (id: string) => void;
    },
): Promise<LayoutGateReceipt> {
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const results: Array<{ slideId: string; before: SlideLayoutDefects; after?: SlideLayoutDefects; scale?: number }> = [];
    if (io.measureMany) {
        const first = await io.measureMany(slideIds);
        const rows = new Map<string, { slideId: string; before: SlideLayoutDefects; after?: SlideLayoutDefects; scale?: number }>();
        for (const id of slideIds) { const d = first[id]; if (d) rows.set(id, { slideId: id, before: d }); }
        let failing = Array.from(rows.values()).filter(r => hasLayoutFailure(r.before)).map(r => r.slideId);
        for (const id of failing) io.log?.(`${id}: ${rows.get(id)!.before.details.slice(0, 3).join(' | ')}`);
        const covered = failing.filter(id => rows.get(id)!.before.details.some(d => d.startsWith('image over text')));
        if (covered.length && io.dropImages) {
            for (const id of covered) io.dropImages(id);
            await wait(io.waitMs ?? 900);
            const again = await io.measureMany(covered);
            for (const id of covered) { const d = again[id]; if (d) { const r = rows.get(id)!; r.after = d; r.scale = 1; } }
            failing = failing.filter(id => { const r = rows.get(id)!; return !r.after || hasLayoutFailure(r.after); });
        }
        for (const scale of SCALES) {
            if (!failing.length) break;
            for (const id of failing) io.applyScale(id, scale);
            await wait(io.waitMs ?? 900);
            const again = await io.measureMany(failing);
            for (const id of failing) { const d = again[id]; if (d) { const r = rows.get(id)!; r.after = d; r.scale = scale; } }
            failing = failing.filter(id => { const r = rows.get(id)!; return !r.after || hasLayoutFailure(r.after); });
        }
        results.push(...slideIds.map(id => rows.get(id)).filter((r): r is NonNullable<typeof r> => !!r));
        const receipt = summarizeLayoutGate(results);
        noteLayoutVerdict(receipt);
        return receipt;
    }
    const getDoc = io.getDoc;
    if (!getDoc) { const receipt = summarizeLayoutGate([]); noteLayoutVerdict(receipt); return receipt; }
    for (const id of slideIds) {
        const doc = await getDoc(id);
        if (!doc || !doc.body) continue;
        const before = measureSlideDocument(doc, id);
        const row: { slideId: string; before: SlideLayoutDefects; after?: SlideLayoutDefects; scale?: number } = { slideId: id, before };
        if (hasLayoutFailure(before)) {
            io.log?.(`${id}: ${before.details.slice(0, 3).join(' | ')}`);
            for (const scale of SCALES) {
                io.applyScale(id, scale);
                await wait(io.waitMs ?? 900);
                const d2 = await getDoc(id);
                if (!d2 || !d2.body) break;
                const after = measureSlideDocument(d2, id);
                row.after = after; row.scale = scale;
                if (!hasLayoutFailure(after)) break;
            }
        }
        results.push(row);
    }
    const receipt = summarizeLayoutGate(results);
    noteLayoutVerdict(receipt);
    return receipt;
}

const PROXY_BASE = 'http://127.0.0.1:5012';

/**
 * 2026-10-26 (live: the in-page frame never loaded in a session holding 1,000+ slide frames, so the gate measured 0 of
 * 8 slides on three runs): measure a batch of stage documents in the proxy's Chromium, the engine and fonts the PPTX
 * export renders with (proxy/layout_measure.py). Throws when the proxy cannot measure, so the caller can fall back.
 */
export interface MeasuredSlide extends SlideLayoutDefects {
    /** WS-4 L1: a JPEG of the composed slide (base64, no data: prefix) when `screenshot` was asked for. */
    screenshot?: string;
    screenshotMime?: string;
    /** WS-4 L5: the slide vision critic's verdict when `critic` was asked for (report-only; see judges.json). */
    critic?: { accept: boolean; kind: string; reason: string };
}

export async function measureViaProxy(
    slides: Array<{ id: string; html: string }>,
    opts: { screenshot?: boolean; critic?: boolean; context?: Record<string, string> } = {},
): Promise<Record<string, MeasuredSlide>> {
    const out: Record<string, MeasuredSlide> = {};
    if (!slides.length) return out;
    const resp = await fetch(`${PROXY_BASE}/api/layout/measure`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, ...(opts.screenshot ? { screenshot: true } : {}), ...(opts.critic ? { critic: true, context: opts.context || {} } : {}) }),
        signal: AbortSignal.timeout(opts.critic ? 300_000 : 180_000),
    });
    if (!resp.ok) throw new Error(`layout measure HTTP ${resp.status}`);
    const j = await resp.json();
    for (const r of (Array.isArray(j?.results) ? j.results : [])) if (r && r.slideId && !r.error) out[String(r.slideId)] = r as MeasuredSlide;
    return out;
}

let _last: LayoutGateReceipt | null = null;
export function noteLayoutVerdict(r: LayoutGateReceipt | null): void { _last = r; }
export function readLastLayoutVerdict(): LayoutGateReceipt | null { return _last; }


/**
 * 2026-10-24 (live: the gate measured 5 of 11 slides because only mounted previews were found): every slide is
 * rendered into ONE offscreen 1920x1080 iframe from its own stage HTML, waited on (fonts, images, two frames) and
 * measured there, so coverage never depends on what the chat happens to have on screen.
 */
export function createOffscreenStage(render: (id: string) => string | null): { getDoc: (id: string) => Promise<Document | null>; dispose: () => void; lastMiss: () => string } {
    let miss = '';
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-24000px;top:0;width:1920px;height:1080px;border:0;pointer-events:none';
    document.body.appendChild(frame);
    // A hidden tab pauses requestAnimationFrame; the timer keeps the gate moving while the owner works in another tab.
    const nextFrame = () => new Promise<void>((res) => { let done = false; const go = () => { if (!done) { done = true; res(); } }; requestAnimationFrame(go); setTimeout(go, 100); });
    const getDoc = async (id: string): Promise<Document | null> => {
        const html = render(id);
        if (!html) return null;
        let loaded = false;
        const t0 = Date.now();
        await new Promise<void>((res) => {
            frame.onload = () => { loaded = true; res(); };
            frame.srcdoc = html;
            setTimeout(res, 6000);
        });
        const d = frame.contentDocument;
        // 2026-10-26 (live: "11 x no document" in a session holding 1,000+ slide frames; the same frame loads in 300 ms
        // in a bare page): the receipt carries the frame's state, so the cause is read, not guessed.
        if (!d) { miss = `frame ${frame.isConnected ? 'attached' : 'detached'}, ${loaded ? 'loaded' : (Date.now() - t0 >= 5900 ? 'no load event in 6 s' : 'no load event')}`; return null; }
        try { await (d as any).fonts?.ready; } catch { /* fonts optional */ }
        await Promise.all(Array.from(d.images).map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = () => r(null); setTimeout(() => r(null), 4000); }))));
        await nextFrame(); await nextFrame();
        return d;
    };
    return { getDoc, dispose: () => { try { frame.remove(); } catch { /* already gone */ } }, lastMiss: () => miss };
}
