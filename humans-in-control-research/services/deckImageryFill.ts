/**
 * deckImageryFill.ts - the post-compose imagery slot-fill pass (2026-08-14).
 * plans/visuals-root-cause-and-imagery-uplift-2026-08-14.md items A3 + B2.
 *
 * THE DEFECT (colleague, RC3): the Figma canon carries image slots on body
 * archetypes (numbered-themes item scenes, role-needs portrait, block-quote
 * scene panel, section-divider full-bleed) and slideComposer renders them
 * fail-open, but NOTHING fills them: only the cover was mandated, so an
 * 18-slide deck shipped with 2 images despite an explicit user ask.
 *
 * THE FIX: after a deck composes (and passes the plan gate), walk every
 * :::slide fence, and for each image-capable archetype whose slot field is
 * empty, fill it: CATALOG REUSE FIRST (the illustration library, zero cost,
 * owner cost rule 2026-08-07), model generation only for unmatched concepts
 * under a per-deck budget cap. Every generated concept follows Law 12: the
 * prompt derives from the slide's own payload fields (DERIVED FROM), never a
 * bare topic word.
 *
 * A3 (slots-as-contract): IMAGE_SLOT_FIELDS below is the runtime's knowledge
 * of every fillable slot. deckPlanGate.IMAGE_CAPABLE mirrors its key set -
 * update both when canon gains an imagery variant.
 */

const PROXY = 'http://127.0.0.1:5012';

export interface ImageSlotSpec {
    /** payload field that carries the image URL (string), or per-item array. */
    field: 'panelImage' | 'portraitImage' | 'itemImages' | 'backgroundImage';
    /** per-item array fill: the payload array whose items each get a scene. */
    perItemOf?: string;
    /** illustration lane style for this slot. */
    style: 'line' | 'photo';
    /** slot geometry (doc + dedup key; the lane composes to fit). */
    w: number; h: number;
    /** payload paths (in priority order) whose text the concept derives from. */
    promptFrom: string[];
}

/** A3: every archetype slot the runtime can fill. Mirrors the Figma canon
 *  (photo lane 2026-07-03) and slideComposer's image regions/variants. */
export const IMAGE_SLOT_FIELDS: Record<string, ImageSlotSpec> = {
    'slides:cover': { field: 'backgroundImage', style: 'photo', w: 1920, h: 1080, promptFrom: ['title', 'audience'] },
    'slides:section-divider': { field: 'backgroundImage', style: 'photo', w: 1920, h: 1080, promptFrom: ['title', 'kicker'] },
    'slides:block-quote': { field: 'panelImage', style: 'photo', w: 900, h: 200, promptFrom: ['quote', 'attributionRole'] },
    'slides:numbered-themes': { field: 'itemImages', perItemOf: 'items', style: 'line', w: 380, h: 204, promptFrom: ['heading', 'body'] },
    'slides:role-needs': { field: 'portraitImage', style: 'photo', w: 560, h: 236, promptFrom: ['persona.name', 'title'] },
    // infographic-exhibit fills through the native diagram lane already (D17);
    // listed in the gate's IMAGE_CAPABLE but not double-filled here.
};

export interface FillReport {
    slidesTouched: number;
    filled: number;
    reused: number;
    generated: number;
    budgetLeft: number;
    errors: string[];
}

interface CatalogEntry { id: string; concept?: string; idea?: string; url: string; }

const _tok = (s: string) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3));

function _jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    return inter / (a.size + b.size - inter);
}

function _dot(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Concept text for a slot, derived from the slide's OWN payload (Law 12:
 *  the image depicts the finding, never the bare industry topic). */
function _conceptFor(payload: any, spec: ImageSlotSpec, item?: any): string {
    const src = item || payload;
    const parts: string[] = [];
    for (const p of spec.promptFrom) {
        const v = _dot(src, p);
        if (typeof v === 'string' && v.trim()) parts.push(v.trim());
        if (parts.length >= 2) break;
    }
    return parts.join(': ').slice(0, 220);
}

async function _catalog(): Promise<CatalogEntry[]> {
    try {
        const r = await fetch(`${PROXY}/api/ai/illustrations`);
        if (!r.ok) return [];
        const d = await r.json();
        return (d.illustrations || []).filter((e: CatalogEntry) => e.url);
    } catch { return []; }
}

/** Reuse-first resolve: best catalog match above threshold wins (zero cost);
 *  else generate via the illustration lane (which itself dedups by concept). */
async function _resolveImage(
    concept: string, spec: ImageSlotSpec, brand: string,
    catalog: CatalogEntry[], budget: { left: number }, report: FillReport,
): Promise<string> {
    if (!concept) return '';
    const ct = _tok(concept);
    let best: CatalogEntry | null = null;
    let bestScore = 0;
    for (const e of catalog) {
        const score = _jaccard(ct, _tok(e.concept || e.idea || ''));
        if (score > bestScore) { bestScore = score; best = e; }
    }
    if (best && bestScore >= 0.34) {
        report.reused++;
        return best.url.startsWith('http') ? best.url : `${PROXY}${best.url}`;
    }
    if (budget.left <= 0) return '';
    budget.left--;
    try {
        const r = await fetch(`${PROXY}/api/ai/illustration`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept, brand: brand.toLowerCase(), canvas: 'light', slot: 'side', literal: true, style: spec.style }),
        });
        if (!r.ok) return '';
        const d = await r.json();
        if (d.url) { report.generated++; return d.url.startsWith('http') ? d.url : `${PROXY}${d.url}`; }
    } catch (e: any) {
        report.errors.push(`generate failed for "${concept.slice(0, 40)}": ${e?.message || e}`);
    }
    return '';
}

/**
 * B2: walk the reply's :::slide fences and fill empty image slots in place.
 * Returns the updated reply text + a fill report. Fail-open everywhere: a
 * slide whose payload cannot parse, a slot that cannot fill, or a dead proxy
 * leaves the deck exactly as it was.
 */
export async function fillDeckImagery(
    replyText: string,
    opts: { brand?: string; generationBudget?: number } = {},
): Promise<{ text: string; report: FillReport }> {
    const report: FillReport = { slidesTouched: 0, filled: 0, reused: 0, generated: 0, budgetLeft: 0, errors: [] };
    const budget = { left: Math.max(0, opts.generationBudget ?? 6) };
    const brand = opts.brand || 'NXT';
    // Fence header may carry extra attributes after the template (brand=nxt,
    // etc.) - match to end of line, not straight to the newline.
    const fenceRe = /(:::slide\s+template=(slides:[a-z0-9-]+)[^\n]*\n)([\s\S]*?)(\n:::)/g;
    const fences = [...replyText.matchAll(fenceRe)];
    if (!fences.length) { report.budgetLeft = budget.left; return { text: replyText, report }; }

    const needsFill = fences.some(m => IMAGE_SLOT_FIELDS[m[2]]);
    if (!needsFill) { report.budgetLeft = budget.left; return { text: replyText, report }; }

    const catalog = await _catalog();
    let out = replyText;

    // BODY slots first (item scenes, portraits, quote panels - the colleague's
    // actual complaint), full-bleed backgrounds last: when the budget binds,
    // the images land where the deck was barest.
    const _prio = (t: string) => (IMAGE_SLOT_FIELDS[t]?.field === 'backgroundImage' ? 2 : 1);
    fences.sort((a, b) => _prio(a[2]) - _prio(b[2]));

    for (const m of fences) {
        const spec = IMAGE_SLOT_FIELDS[m[2]];
        if (!spec) continue;
        let payload: any;
        try { payload = JSON.parse(m[3]); } catch { continue; }
        let changed = false;

        if (spec.perItemOf) {
            const items = _dot(payload, spec.perItemOf);
            if (!Array.isArray(items) || !items.length) continue;
            const existing: string[] = Array.isArray(payload[spec.field]) ? payload[spec.field] : [];
            const filled: string[] = [];
            for (let i = 0; i < items.length; i++) {
                if (existing[i]) { filled.push(existing[i]); continue; }
                const url = await _resolveImage(_conceptFor(payload, spec, items[i]), spec, brand, catalog, budget, report);
                filled.push(url);
                if (url) { report.filled++; changed = true; }
            }
            if (changed) payload[spec.field] = filled;
        } else {
            if (typeof payload[spec.field] === 'string' && payload[spec.field]) continue;
            const url = await _resolveImage(_conceptFor(payload, spec), spec, brand, catalog, budget, report);
            if (url) { payload[spec.field] = url; report.filled++; changed = true; }
        }

        if (changed) {
            report.slidesTouched++;
            const rebuilt = `${m[1]}${JSON.stringify(payload, null, 2)}${m[4]}`;
            out = out.replace(m[0], rebuilt);
        }
    }
    report.budgetLeft = budget.left;
    return { text: out, report };
}
