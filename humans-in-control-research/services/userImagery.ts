/**
 * userImagery.ts - USER-DIRECTED slide imagery (2026-08-14 pivot).
 * plans/user-directed-imagery-2026-08-14.md.
 *
 * The user, not the pipeline, authors each visual: per-slot GENERATE chips on
 * the deck preview collect { prompt, style } into the slide payload
 * (_userImagery), and ONE "Regenerate presentation with visuals" pass renders
 * them. Lesson L1 of the plan: every render goes through the illustration
 * endpoint with the REAL style tokens ('line', 'photo-background',
 * 'photo-scene', 'photo-portrait'); an invented token silently falls back to
 * line art (the reverted 2026-08-14 auto-fill defect). The Infographic choice
 * routes to the native diagram lane derived from the slide's own payload.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export type UserImageryStyle = 'illustration' | 'infographic' | 'realistic';

export interface UserImagerySpec { prompt: string; style: UserImageryStyle; authoredAt: number; }

export interface SlotDescriptor {
    /** payload field the composer reads (per-item arrays fill index-aligned). */
    field: 'backgroundImage' | 'panelImage' | 'portraitImage' | 'itemImages' | 'sceneImage';
    perItemOf?: string;
    label: string;
    /** illustration-lane style token when the user picks Realistic. */
    realistic: 'photo-background' | 'photo-scene' | 'photo-portrait';
    /** fractional overlay rect on the 1920x1080 stage (chip anchor). */
    rect: { x: number; y: number; w: number; h: number };
}

/** Archetype -> authorable slots. Mirrors slideComposer's image regions/variants. */
export const USER_IMAGE_SLOTS: Record<string, SlotDescriptor[]> = {
    // backgroundImage slots are FULL-BLEED: the lasso must outline the whole
    // image region, not a corner square (owner 2026-08-14). The overlay is
    // click-transparent except its label chip, so text stays editable under it.
    'slides:cover': [{ field: 'backgroundImage', label: 'Cover scene', realistic: 'photo-background', rect: { x: 0, y: 0, w: 1, h: 1 } }],
    'slides:section-divider': [{ field: 'backgroundImage', label: 'Divider scene', realistic: 'photo-background', rect: { x: 0, y: 0, w: 1, h: 1 } }],
    'slides:block-quote': [{ field: 'panelImage', label: 'Scene panel', realistic: 'photo-scene', rect: { x: 209 / 1920, y: 540 / 1080, w: 900 / 1920, h: 200 / 1080 } }],
    'slides:numbered-themes': [{ field: 'itemImages', perItemOf: 'items', label: 'Item scenes', realistic: 'photo-scene', rect: { x: 0.10, y: 0.42, w: 0.80, h: 0.22 } }],
    'slides:role-needs': [{ field: 'portraitImage', label: 'Portrait', realistic: 'photo-portrait', rect: { x: 1260 / 1920, y: 221 / 1080, w: 560 / 1920, h: 236 / 1080 } }],
};

// UNIVERSAL COVERAGE (owner mandate 2026-08-14: EVERY slide). Archetypes without
// a designed slot get the generic treatment slideComposer renders: content-rail
// layouts a top-right header scene (sceneImage), dark full-bleed layouts the
// cover-style background. Registered explicitly so chips, gate, and resolver
// stay one contract.
const _HEADER_SCENE: SlotDescriptor = { field: 'sceneImage', label: 'Scene', realistic: 'photo-scene', rect: { x: 1340 / 1920, y: 36 / 1080, w: 478 / 1920, h: 170 / 1080 } };
const _DARK_BG: SlotDescriptor = { field: 'backgroundImage', label: 'Backdrop', realistic: 'photo-background', rect: { x: 0, y: 0, w: 1, h: 1 } };
// The four PRD projection archetypes (2026-10-01, Stage 3.3) are content-rail tables and story
// columns; they take the generic header scene like the other dense layouts.
for (const a of ['evidence-table', 'flow-arc', 'quadrant', 'milestone-timeline', 'means-matters', 'ranked-bars', 'comparison-panels', 'stat-row', 'org-model', 'role-recommendation', 'role-roadmap', 'aggregate-roadmap', 'infographic-exhibit', 'prd-story', 'prd-ledger', 'prd-signals', 'prd-trace']) {
    USER_IMAGE_SLOTS[`slides:${a}`] = USER_IMAGE_SLOTS[`slides:${a}`] || [_HEADER_SCENE];
}
for (const a of ['thesis-interstitial', 'problem-diptych', 'scene', 'agenda']) {
    USER_IMAGE_SLOTS[`slides:${a}`] = USER_IMAGE_SLOTS[`slides:${a}`] || [_DARK_BG];
}

export interface ResolveResult { rendered: number; failed: string[]; }

/**
 * Content-derived prompt suggestion for a slot (owner ask 2026-08-14): the
 * pre-filled text quotes the slide's OWN fields, so the user sees the system
 * read the slide and only has to edit, not compose. Deterministic; no model.
 */
export function suggestPrompt(slot: SlotDescriptor, payload: any): string {
    const t = (v: any, n = 90) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const title = t(payload?.title) || t(payload?.thesis);
    switch (slot.field) {
        case 'backgroundImage':
            return title ? `Editorial photographic scene behind the title "${title}": the real place and people this is about, natural light, no text`
                : 'Editorial photographic scene for this section, natural light, no text';
        case 'portraitImage': {
            const who = t(payload?.persona?.name) || t(payload?.role) || 'this role';
            const need = t(payload?.persona?.needs?.[0], 70) || t(payload?.challenges?.[0]?.heading ?? payload?.challenges?.[0], 70);
            return `Environmental portrait of ${who} at work${need ? `, in the moment of: ${need}` : ''}, natural light, no text`;
        }
        case 'panelImage': {
            const q = t(payload?.quote, 110);
            return q ? `A real scene depicting this quote: "${q}", documentary style, no readable faces, no text`
                : 'A documentary scene supporting the quote on this slide, no text';
        }
        case 'itemImages': {
            const items = Array.isArray(payload?.items) ? payload.items : [];
            const names = items.map((i: any) => t(i?.heading || i?.name, 40)).filter(Boolean).slice(0, 4);
            return names.length ? `One scene per item, each depicting its subject: ${names.join('; ')}`
                : 'One scene per item on this slide, each depicting that item';
        }
        case 'sceneImage':
            return title ? `Editorial scene depicting: ${title}, documentary style, natural light, no text`
                : 'Editorial scene for this slide, documentary style, no text';
        default:
            return title ? `A scene depicting: ${title}` : '';
    }
}

async function _illustration(concept: string, style: string, brand: string, slot: string): Promise<string> {
    const r = await fetch(`${PROXY_BASE}/api/ai/illustration`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, brand: brand.toLowerCase(), canvas: style === 'photo-background' ? 'dark' : 'light', slot, variant: 0, style, literal: true }),
    });
    if (!r.ok) return '';
    const d = await r.json();
    return typeof d.url === 'string' && d.url ? (d.url.startsWith('http') ? d.url : `${PROXY_BASE}${d.url}`) : '';
}

/**
 * Resolve every authored slot on one slide's composer payload IN PLACE.
 * Returns how many rendered. The user's prompt is the concept, verbatim,
 * grounded with the slide's own title so the scene stays on subject.
 */
export async function resolveUserImageryForPayload(
    template: string, payload: any, brand: string, onlyField?: string,
): Promise<ResolveResult> {
    const out: ResolveResult = { rendered: 0, failed: [] };
    const slots = USER_IMAGE_SLOTS[template] || [];
    const authored: Record<string, UserImagerySpec> = payload?._userImagery || {};
    for (const slot of slots) {
        if (onlyField && slot.field !== onlyField) continue;
        const spec = authored[slot.field];
        if (!spec || !spec.prompt?.trim()) continue;
        const styleToken = spec.style === 'realistic' ? slot.realistic : 'line';
        const ground = typeof payload?.title === 'string' ? ` (slide subject: ${payload.title.slice(0, 90)})` : '';
        try {
            if (slot.perItemOf) {
                const items = payload?.[slot.perItemOf];
                if (!Array.isArray(items) || !items.length) continue;
                const urls: string[] = [];
                for (const it of items) {
                    const itemLine = [it?.heading, it?.name].find((v: any) => typeof v === 'string') || '';
                    urls.push(await _illustration(`${spec.prompt}: ${itemLine}${ground}`, styleToken, brand, 'side'));
                }
                if (urls.some(u => u)) { payload[slot.field] = urls; out.rendered += urls.filter(u => u).length; }
                else out.failed.push(slot.label);
            } else {
                const url = await _illustration(`${spec.prompt}${ground}`, styleToken, brand, slot.field === 'backgroundImage' ? 'backdrop' : 'side');
                if (url) { payload[slot.field] = url; out.rendered++; }
                else out.failed.push(slot.label);
            }
        } catch {
            out.failed.push(slot.label);
        }
    }
    return out;
}
