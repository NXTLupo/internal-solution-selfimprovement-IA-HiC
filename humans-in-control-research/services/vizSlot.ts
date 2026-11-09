// vizSlot.ts - 2026-06-25
// Runtime wiring (#13): turns a deliverable image SLOT into a content-true viz the engine renders.
// Few-shot retrieval -> family selection -> data from the REAL payload -> vizEngine render ->
// data-URI the slot carrier (heroImage / phaseImages / panelImage) consumes; the existing composer
// `kind:'image'` region + the gold_pptx_export <img>->picture path then deliver preview + PPTX.
//
// NOTHING HARDCODED: brand colors come from getBrand() (the runtime-hydrated token mirror fed by
// /api/design-tokens), mapped to VizBrandColors. No hex literal anywhere in this file. The
// artifact->family and industry->domain-form maps are ROUTING logic (not design values).

import { getBrand, type Brand, type BrandId } from '../components/slideTemplates/brands';
import { fontForRole } from '../components/slideTemplates/brands';
import { HERO_PANEL } from './slideComposer';
import {
    buildVizTheme, renderVizFamily, renderVizLabeled, pickVizFamily, vizAnchors, DOMAIN_FORM_BASE,
    type VizBrandColors, type VizGround, type VizBaseFamily, type VizFamily, type VizIndustry, type VizAnchor,
} from './vizEngine';
import { ICONS } from './iconLibrary';
import { imageSpecFor } from './artifactImageSlots';

/** Map the runtime-hydrated brand token object to the colors the viz theme needs. Token-sourced
 *  (getBrand reflects /api/design-tokens); we only add the '#' the engine expects. */
export function vizBrandColors(brand: Brand): VizBrandColors {
    const H = (v: string) => (v && v[0] === '#') ? v : `#${v}`;
    const b = brand as any;
    return {
        rail: H(b.RAIL), paper: H(b.WHITE), ink: H(b.INK), accent: H(b.CHARTREUSE), cyan: H(b.CYAN),
        teal: H(b.TEAL), rust: H(b.RUST), hairline: H(b.HAIRLINE), grey: H(b.GREY),
    };
}

/** artifact (hashtag deliverable) -> apt base families, by content shape. Routing, not design. */
const ARTIFACT_FAMILIES: Record<string, VizBaseFamily[]> = {
    arch: ['flowSchematic', 'operatingNetwork', 'capabilityStack'],
    'tech-arch': ['flowSchematic', 'capabilityStack', 'operatingNetwork'],
    org: ['operatingNetwork'],
    blueprint: ['journeyLine', 'flowSchematic', 'operatingNetwork'],
    journey: ['journeyLine', 'funnelFlow'],
    strategy: ['operatingNetwork', 'maturityRadar', 'proportionStack', 'comparisonMatrix'],
    competitive: ['comparisonMatrix', 'dataField', 'maturityRadar'],
    gap: ['maturityRadar', 'comparisonMatrix'],
    audit: ['maturityRadar', 'instrumentDial', 'dataField'],
    'tech-audit': ['capabilityStack', 'maturityRadar', 'flowSchematic'],
    recommendations: ['comparisonMatrix', 'funnelFlow', 'proportionStack'],
    roadmap: ['timelineGantt', 'comparisonMatrix'],
    prd: ['capabilityStack', 'flowSchematic', 'timelineGantt'],
    personas: ['journeyLine', 'comparisonMatrix'],
    themes: ['dataField', 'proportionStack'],
    'case-study': ['journeyLine', 'instrumentDial', 'dataField'],
    report: ['dataField', 'proportionStack'],
    explainer: ['flowSchematic'],
    slides: ['dataField', 'operatingNetwork', 'funnelFlow', 'comparisonMatrix'],
};

/** industry -> its domain-native signature form (preferred when its base family is apt). */
const INDUSTRY_DOMAIN_FORM: Record<string, VizFamily> = {
    healthcare: 'hc_ecg', fintech: 'fx_candlestick', 'financial-services': 'fs_waterfall',
    retail: 'rt_planogram', 'ai-industry': 'ai_chiptopo', insurance: 'in_losstri',
    'higher-ed': 'he_enrollfunnel', advancement: 'adv_giftpyr', workforce: 'wf_orgpyr',
    government: 'gov_servicegrid', 'creative-ai': 'cai_pipeline',
};

const LABELED_PRIMARIES = new Set<string>(['operatingNetwork', 'journeyLine', 'timelineGantt', 'flowSchematic', 'capabilityStack', 'he_enrollfunnel', 'ai_chiptopo']);

export interface VizSelectOpts { artifact?: string; industry?: string; heading?: string; explicitFamily?: string; allowedFamilies?: string[]; }
/** Pick the viz family for a slot: explicit > industry domain-form (if its base is apt for the
 *  artifact) > heading route constrained to the artifact's apt set > first apt > operatingNetwork.
 *  `allowedFamilies` (from the container's registry vizFamilies, set by the per-container audit) is a
 *  HARD filter: a thin banner can only hold a horizontal flow, so the result is forced into the set. */
export function selectVizFamily(o: VizSelectOpts): VizFamily {
    const allowed = (o.allowedFamilies && o.allowedFamilies.length) ? new Set(o.allowedFamilies) : null;
    const ok = (f: string | null | undefined): f is VizFamily => !!f && (!allowed || allowed.has(f) || allowed.has(((DOMAIN_FORM_BASE as any)[f]) || f));
    if (o.explicitFamily && ok(o.explicitFamily)) return o.explicitFamily as VizFamily;
    const apt = (o.artifact && ARTIFACT_FAMILIES[o.artifact]) || null;
    const headFam = o.heading ? pickVizFamily(o.heading) : null;
    if (o.industry && INDUSTRY_DOMAIN_FORM[o.industry]) {
        const form = INDUSTRY_DOMAIN_FORM[o.industry];
        const base = (DOMAIN_FORM_BASE as any)[form] as VizBaseFamily | undefined;
        if ((!apt || (base && apt.includes(base)) || (headFam && base === headFam)) && ok(form)) return form;
    }
    if (ok(headFam) && (!apt || apt.includes(headFam!))) return headFam!;
    if (apt) { const a = apt.find(ok); if (a) return a; }
    if (allowed) return o.allowedFamilies![0] as VizFamily; // forced into the container-permitted set
    return 'operatingNetwork';
}

// ---- deterministic seed from any string (stable per heading; no Math.random) ----
function seedFrom(s: string): number { let h = 2166136261; const t = s || 'viz'; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; }
const clampArr = (a: any, lo: number, hi: number, def: number[]) => Array.isArray(a) && a.length ? a.map((x: any) => { const n = +x; return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def[0]; }) : def;

/** Build the family `data` from the deliverable's REAL payload, with safe deterministic fallbacks.
 *  Then PASS THROUGH the model-authored meaning layer (labels per anchor, hub name, links for the
 *  network) so the diagram is content-true, not decorative. base = the base family data-shape. */
export function buildVizData(family: VizFamily, payload: any, heading: string): any {
    const out = buildVizDataCore(family, payload, heading);
    const p = payload || {};
    if (Array.isArray(p.labels)) out.labels = p.labels.map((x: any) => String(x));
    if (typeof p.hub === 'string') out.hub = p.hub;
    if (Array.isArray(p.links) && p.links.length) out.links = p.links.filter((e: any) => Array.isArray(e) && e.length === 2).map((e: any[]) => [e[0] | 0, e[1] | 0]);
    if (typeof p.hubIndex === 'number') out.hubIndex = p.hubIndex;
    // icons EMBEDDED IN the diagram (per-node/station/phase domain marks): tokenized icon ids aligned
    // by index to the diagram's anchors (journey phase markers, network node domain icons, etc.).
    if (Array.isArray(p.icons) && p.icons.length) out.icons = p.icons.map((x: any) => String(x));
    return out;
}

/** Overlay tokenized icon glyphs INSIDE a diagram at its anchor points (icons-in-diagrams). icons[i]
 *  is an icon id aligned to anchor idx i; the glyph is drawn at the node/station centre in the viz
 *  accent colour (token-sourced via the theme). Additive + opt-in: no icons -> svg unchanged. */
function overlayDiagramIcons(svg: string, anchors: VizAnchor[], icons: string[], color: string): string {
    if (!Array.isArray(icons) || !icons.length || !anchors.length) return svg;
    const marks: string[] = [];
    icons.forEach((raw, i) => {
        const id = String(raw || '').replace(/^icon:/, '');
        if (!id || !ICONS[id]) return;
        const an = anchors.find((a) => a.idx === i) || anchors[i];
        if (!an) return;
        // the hub already draws its own glyph; a second icon on it reads as a blob (2026-10-27 live divider)
        if (an.role === 'hub') return;
        const r = an.nodeR || 12;
        const size = Math.max(16, r * 1.7);
        const sw = (1.6 * 24 / size).toFixed(2);
        const x = (an.x - size / 2).toFixed(1), y = (an.y - size / 2).toFixed(1), s = (size / 24).toFixed(3);
        marks.push(`<g transform="translate(${x} ${y}) scale(${s})"><g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[id].draw(color)}</g></g>`);
    });
    if (!marks.length) return svg;
    return svg.replace(/<\/svg>\s*$/, `<g class="viz-node-icons">${marks.join('')}</g></svg>`);
}
/** True when the payload carries the model-authored meaning (labels and/or real links) — i.e. the
 *  viz will SAY something, not just draw a shape. Used to gate attachViz so we never ship an
 *  unlabeled abstract diagram from empty data. */
export function hasAuthoredMeaning(payload: any): boolean {
    const p = payload || {};
    return (Array.isArray(p.labels) && p.labels.length > 0) || (Array.isArray(p.links) && p.links.length > 0);
}
function buildVizDataCore(family: VizFamily, payload: any, heading: string): any {
    const seed = seedFrom(heading || family);
    const p = payload || {};
    const base: VizBaseFamily = (DOMAIN_FORM_BASE as any)[family] || (family as VizBaseFamily);
    const R = (n: number, salt: number) => { let h = (seed + salt) >>> 0; h = Math.imul(h ^ (h >>> 15), 1 | h); return Math.abs(h) % n; };
    switch (base) {
        case 'operatingNetwork': {
            const n = Math.max(6, Math.min(12, +(p.n ?? (Array.isArray(p.nodes) ? p.nodes.length : 0)) || (7 + R(5, 1))));
            const layouts = ['spine', 'mesh', 'radial', 'hub2']; return { n, layout: p.layout || layouts[R(4, 2)], seed };
        }
        case 'capabilityStack': { const layers = Math.max(3, Math.min(6, +(p.layers ?? (Array.isArray(p.layers) ? p.layers.length : 0)) || (3 + R(3, 1)))); return { layers, highlight: Math.min(layers - 1, +(p.highlight ?? R(layers, 2))), seed }; }
        case 'maturityRadar': {
            let sc = clampArr(p.scores, 0.05, 1, []); if (!sc.length) sc = Array.from({ length: 5 + R(2, 3) }, (_, i) => 0.35 + (R(50, i + 5) / 100));
            let tg = clampArr(p.target, 0.05, 1, []); if (tg.length !== sc.length) tg = sc.map((s: number) => Math.min(1, s + 0.18 + R(12, 9) / 100));
            tg = tg.map((t: number, i: number) => Math.max(t, sc[i])); return { scores: sc, target: tg, seed };
        }
        case 'funnelFlow': {
            let st = clampArr(p.stages, 1, 100, []).map((x: number) => Math.round(x)); if (st.length < 3) st = [100, 60, 35, 18];
            st = st.slice(0, 6); st[0] = 100; for (let i = 1; i < st.length; i++) if (st[i] >= st[i - 1]) st[i] = Math.max(1, Math.round(st[i - 1] * 0.6)); return { stages: st, seed };
        }
        case 'journeyLine': { const stations = Math.max(5, Math.min(7, +(p.stations ?? (Array.isArray(p.phases) ? p.phases.length : 0)) || (5 + R(2, 1)))); const fr = clampArr(p.friction, 1, stations - 1, []).map((x: number) => Math.round(x)); return { stations, friction: fr.length ? Array.from(new Set(fr)).slice(0, 3) : [Math.max(1, R(stations - 1, 2))], seed }; }
        case 'dataField': { let v = clampArr(p.values, 1, 10, []).map((x: number) => Math.round(x)); if (v.length < 5) v = Array.from({ length: 5 + R(4, 3) }, (_, i) => 1 + R(9, i + 7)); return { values: v.slice(0, 9), sort: p.sort || 'desc', mean: p.mean !== false, highlight: typeof p.highlight === 'number' ? p.highlight : 0, seed }; }
        case 'comparisonMatrix': { let cells = Array.isArray(p.cells) && p.cells.length && Array.isArray(p.cells[0]) ? p.cells.map((row: any[]) => row.map((c: any) => Math.max(0, Math.min(1, +c || 0)))) : null; if (!cells) { const rows = 3 + R(2, 1), cols = 3 + R(2, 2); cells = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => +(0.2 + R(80, i * 5 + j) / 100).toFixed(2))); } return { cells, seed }; }
        case 'instrumentDial': return { value: Math.max(0, Math.min(100, Math.round(+(p.value ?? p.kpi ?? (40 + R(50, 1)))))), segments: 10, seed };
        case 'timelineGantt': { let tr = Array.isArray(p.tracks) && p.tracks.length ? p.tracks.map((t: any) => ({ start: Math.max(0, +t.start || 0), dur: Math.max(1, +t.dur || 2) })) : null; if (!tr) tr = Array.from({ length: 3 + R(2, 1) }, (_, i) => ({ start: i, dur: 1 + R(3, i + 2) })); return { tracks: tr.slice(0, 5), periods: 6, now: Math.min(6, +(p.now ?? 2)), milestone: Math.min(6, +(p.milestone ?? 4)), seed }; }
        case 'flowSchematic': { const diamond = R(2, 1) === 0; const blocks = diamond ? [[0.06, 0.42, 0.17, 0.16], [0.40, 0.18, 0.17, 0.16], [0.40, 0.66, 0.17, 0.16], [0.77, 0.42, 0.17, 0.16]] : [[0.06, 0.42, 0.18, 0.16], [0.41, 0.42, 0.18, 0.16], [0.76, 0.42, 0.18, 0.16]]; const links = diamond ? [[0, 1], [0, 2], [1, 3], [2, 3]] : [[0, 1], [1, 2]]; return { blocks, links, highlight: blocks.length - 1, seed }; }
        case 'proportionStack': { let g = clampArr(p.groups, 1, 100, []).map((x: number) => Math.round(x)); if (g.length < 2) g = [40 + R(20, 1), 25 + R(15, 2), 20]; return { groups: g.slice(0, 5), seed }; }
        case 'sectionMark': return { ordinal: Math.max(1, Math.min(6, +(p.ordinal ?? (1 + R(5, 1))))), seed };
        default: return { seed };
    }
}

export interface VizSlotOpts {
    brand?: BrandId | string | null;
    ground?: VizGround;        // dark | light; should match the host slot's imgGround
    artifact?: string;         // hashtag deliverable
    industry?: string;         // run industry (drives glyph + domain form)
    heading?: string;          // slot/slide heading -> family routing + deterministic seed
    payload?: any;             // the REAL deliverable payload (source of data)
    explicitFamily?: string;   // override the routed family
    allowedFamilies?: string[]; // container-permitted families (thin banner -> horizontal flow only)
    w?: number; h?: number;    // slot pixel size (default 480x360)
}
export interface VizSlotResult { svg: string; dataUri: string; family: VizFamily; ground: VizGround; labeled: boolean; anchors: VizAnchor[];
    /** 2026-10-30 (WS-2 E8): true when the family needs data the payload did not supply, so the drawing would be invented. */
    fabricated: boolean; }

/** Families whose drawing IS data (a bar has a height, a dial has a value). Without the payload key the
 *  numbers would be seeded noise, which is a fabricated chart on a consulting slide. */
const DATA_REQUIREMENTS: Record<string, string[]> = {
    maturityRadar: ['scores'], funnelFlow: ['stages'], dataField: ['values'], comparisonMatrix: ['cells'],
    instrumentDial: ['value', 'kpi'], timelineGantt: ['tracks'], proportionStack: ['groups'],
};
/** Structural families are honest only when they carry authored labels or links; an unlabeled abstract network is decoration. */
const MEANING_REQUIRED = new Set(['operatingNetwork', 'capabilityStack', 'journeyLine', 'flowSchematic']);

export function isFabricatedViz(family: VizFamily, payload: any): boolean {
    const p = payload || {};
    const base: string = (DOMAIN_FORM_BASE as any)[family] || family;
    const keys = DATA_REQUIREMENTS[base];
    if (keys) return !keys.some(k => Array.isArray(p[k]) ? p[k].length > 0 : (p[k] !== undefined && p[k] !== null && p[k] !== ''));
    if (MEANING_REQUIRED.has(base)) return !hasAuthoredMeaning(p) && !(Array.isArray(p.phases) && p.phases.length) && !(Array.isArray(p.nodes) && p.nodes.length);
    return false;
}

function svgToDataUri(svg: string): string {
    // base64 keeps the data-URI valid inside an <img src> regardless of '#'/quotes in the SVG.
    const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg, 'utf8').toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}

/** Slide archetypes that reserve a full-bleed image panel — the collision-safe slots a viz can fill
 *  via the `heroImage` carrier (composeSlide narrows the text column under the panel automatically). */
export const VIZ_PANEL_ARCHETYPES = new Set(['cover', 'section-divider', 'thesis-interstitial']);

export interface AttachVizOpts extends VizSlotOpts { archetype: string; }
/** Returns a shallow clone of `payload` with `heroImage` set to a rendered viz data-URI WHEN the
 *  archetype reserves an image panel (else returns payload unchanged). The composer then renders it
 *  into the panel (preview) and the exporter places it as a native replaceable picture (PPTX).
 *  Opt-in + non-destructive: never overwrites an existing heroImage. */
export function attachViz(payload: any, o: AttachVizOpts): any {
    if (!VIZ_PANEL_ARCHETYPES.has(o.archetype)) return payload;
    if (payload && typeof payload.heroImage === 'string' && payload.heroImage) return payload; // respect existing art
    if (payload && typeof payload.backgroundImage === 'string' && payload.backgroundImage) return payload; // a full-bleed photo is the art
    // size the viz to the archetype's actual slot bounds (Figma canon, from the composer) so it FILLS
    // the panel rather than rendering at the default small size.
    const slot = HERO_PANEL[o.archetype];
    // honor the container's family constraint from the per-container audit registry (slides:<archetype>)
    const spec = imageSpecFor(`slides:${o.archetype}`);
    const r = renderVizSlot({ ...o, payload, allowedFamilies: o.allowedFamilies || spec?.vizFamilies, w: o.w || (slot ? slot[2] : undefined), h: o.h || (slot ? slot[3] : undefined) });
    // 2026-10-30 (WS-2 E8): a chart whose numbers the payload never supplied is a fabricated exhibit; the slot
    // stays empty (content-true or nothing) rather than carrying seeded values that look like evidence.
    if (r.fabricated) return payload;
    return { ...(payload || {}), heroImage: r.dataUri };
}

/** Render a content-true viz for a slot. Returns the SVG + a data-URI for the slot carrier, plus
 *  labeled-mode anchors (#14) when the family is a primary diagram. Token-pure: theme from getBrand. */
export function renderVizSlot(o: VizSlotOpts): VizSlotResult {
    const brand = getBrand(o.brand);
    const ground: VizGround = o.ground || 'dark';
    const theme = buildVizTheme(vizBrandColors(brand), ground);
    const family = selectVizFamily({ artifact: o.artifact, industry: o.industry, heading: o.heading, explicitFamily: o.explicitFamily, allowedFamilies: o.allowedFamilies });
    const data = buildVizData(family, o.payload, o.heading || family);
    // a labeled stack draws one plate per label (2026-10-26 live: four plates, three labels, one plate unnamed)
    if (family === 'capabilityStack' && Array.isArray(data.labels) && data.labels.length >= 2) data.layers = data.labels.length;
    const cw = o.w || 480, ch = o.h || 360;
    // CONTAINER-FIT (per-container audit 2026-06-27): a labeled DIAGRAM must never be stretched or
    // cropped to a PORTRAIT/squarish container (e.g. the slides cover/divider/thesis 0.76 panels).
    // Render the diagram at a LANDSCAPE inner box and centre it in the container (transparent margins),
    // so even fit:cover leaves the diagram + its labels intact. Thin/landscape containers render 1:1.
    const isDiagram = family !== 'sectionMark';
    let rw = cw, rh = ch;
    if (isDiagram && (cw / ch) < 1.2) {
        rh = Math.max(120, Math.round(cw / 1.55));
        if (rh > ch) { rh = ch; }
        rw = cw;
    }
    const font = fontForRole('label', brand);
    const hasLabels = Array.isArray(data.labels) && data.labels.length > 0 || typeof data.hub === 'string';
    let viz = hasLabels ? renderVizLabeled(family, data, rw, rh, theme, o.industry, font) : renderVizFamily(family, data, rw, rh, theme, o.industry);
    const anchors = vizAnchors(family, data, rw, rh);
    if (Array.isArray(data.icons) && data.icons.length) viz = overlayDiagramIcons(viz, anchors, data.icons, theme.accent);
    // centre the landscape viz inside the (taller) container so it isn't stretched/cropped.
    let svg = viz;
    if (rw !== cw || rh !== ch) {
        const dx = Math.round((cw - rw) / 2), dy = Math.round((ch - rh) / 2);
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${cw}" height="${ch}">${viz.replace('<svg ', `<svg x="${dx}" y="${dy}" `)}</svg>`;
    }
    return { svg, dataUri: svgToDataUri(svg), family, ground, labeled: hasLabels, anchors, fabricated: isFabricatedViz(family, o.payload) };
}
