// vizEngine.ts - 2026-06-25 (industry-aware)
// Deterministic, token-locked, content-true SVG visualization engine (the runtime TS form of the
// `nxt-slot-illustrator` skill). 12 base families + per-industry ICONOGRAPHY (a flat token-locked
// glyph skins network nodes/hub, dial center, funnel/stack caps, section emblem + a corner badge on
// every plate) + 11 DOMAIN-NATIVE signature forms (candlestick, ECG, waterfall, planogram, chip
// topology, loss triangle, etc). The visual IS a faithful diagram of the deliverable's own data
// (anti-slop). Text-FREE SVG. Deterministic per data.seed.
//
// VISION: palette = THEME = brand (NXT|NU) x ground (dark|light) from /api/design-tokens, NEVER
// hardcoded. ground=light is the "stark white" variant; match the host slot's imgGround.
// Companion skill: .claude/skills/nxt-slot-illustrator/.

export interface VizTheme {
    ground: string; ink: string; body: string; accent: string; cyan: string;
    rust: string; rule: string; muted: string; f1: string; f2: string; f3: string; hi: string;
}
/** Brand colors the theme needs (a subset of the hydrated BrandTokens / figma-tokens.json). */
export interface VizBrandColors {
    rail: string; paper: string; ink: string; accent: string; cyan: string; teal: string;
    rust: string; hairline: string; grey: string;
}
export type VizGround = 'dark' | 'light';
export type VizBaseFamily =
    | 'operatingNetwork' | 'capabilityStack' | 'maturityRadar' | 'funnelFlow' | 'journeyLine'
    | 'dataField' | 'comparisonMatrix' | 'instrumentDial' | 'timelineGantt' | 'flowSchematic'
    | 'proportionStack' | 'sectionMark';
export type VizDomainForm =
    | 'hc_ecg' | 'fx_candlestick' | 'fs_waterfall' | 'rt_planogram' | 'ai_chiptopo' | 'in_losstri'
    | 'he_enrollfunnel' | 'adv_giftpyr' | 'wf_orgpyr' | 'gov_servicegrid' | 'cai_pipeline';
export type VizFamily = VizBaseFamily | VizDomainForm;
export type VizIndustry =
    | 'healthcare' | 'fintech' | 'financial-services' | 'government' | 'insurance' | 'retail'
    | 'workforce' | 'higher-ed' | 'advancement' | 'ai-industry' | 'creative-ai';

const hexMix = (a: string, b: string, t: number): string => {
    const p = (h: string) => [1, 3, 5].map(i => parseInt(h.replace('#', '').slice(i - 1, i + 1), 16));
    const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

/** Build a viz THEME from brand colors + a ground. Vision-pure: every value derives from the token
 *  colors the caller passes; on LIGHT ground structural lines use brand TEAL (reads on white). */
export function buildVizTheme(c: VizBrandColors, ground: VizGround): VizTheme {
    if (ground === 'light') {
        return {
            ground: c.paper, ink: c.ink, body: hexMix(c.ink, c.paper, 0.35), accent: c.accent,
            cyan: c.teal, rust: c.rust, rule: c.hairline, muted: hexMix(c.grey, c.paper, 0.3),
            f1: hexMix(c.hairline, c.paper, 0.4), f2: hexMix(c.hairline, c.paper, 0.7), f3: c.paper,
            hi: hexMix(c.accent, c.paper, 0.88),
        };
    }
    return {
        ground: c.rail, ink: c.paper, body: hexMix(c.paper, c.rail, 0.2), accent: c.accent,
        cyan: c.cyan, rust: c.rust, rule: hexMix(c.rail, c.paper, 0.16), muted: c.grey,
        f1: hexMix(c.rail, c.paper, 0.08), f2: hexMix(c.rail, c.paper, 0.04), f3: c.rail,
        hi: hexMix(c.accent, c.rail, 0.86),
    };
}

// ---- deterministic rng ----
function mulberry32(a: number) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rng(seed?: number) { return mulberry32((((seed || 1) * 2654435761) >>> 0)); }

// ---- primitives (module PAL/INDU set per synchronous render) ----
let PAL: VizTheme;
let INDU: string | undefined;
const F = (n: number) => (+n).toFixed(0);
const W = (w: number, h: number, inner: string) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="${PAL.ground}"/>${inner}</svg>`;
const CT = (w: number, h: number) => { const p = Math.min(w, h) * 0.05, L = Math.min(w, h) * 0.035, s = `stroke="${PAL.muted}" stroke-width="1" opacity="0.5" fill="none"`; return `<path d="M${p},${p + L} V${p} H${p + L}" ${s}/><path d="M${w - p - L},${p} H${w - p} V${p + L}" ${s}/><path d="M${p},${h - p - L} V${h - p} H${p + L}" ${s}/><path d="M${w - p - L},${h - p} H${w - p} V${h - p - L}" ${s}/>`; };
const ln = (x1: number, y1: number, x2: number, y2: number, c: string, sw?: number, op?: number) => `<line x1="${F(x1)}" y1="${F(y1)}" x2="${F(x2)}" y2="${F(y2)}" stroke="${c}" stroke-width="${sw || 1.4}"${op ? ` opacity="${op}"` : ''}/>`;
const cir = (cx: number, cy: number, r: number, fill?: string | null, stroke?: string | null, sw?: number, op?: number) => `<circle cx="${F(cx)}" cy="${F(cy)}" r="${F(r)}"${fill ? ` fill="${fill}"` : ' fill="none"'}${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1.5}"` : ''}${op ? ` opacity="${op}"` : ''}/>`;
const rct = (x: number, y: number, w: number, h: number, fill?: string | null, stroke?: string | null, sw?: number) => `<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}"${fill ? ` fill="${fill}"` : ' fill="none"'}${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1.5}"` : ''}/>`;
const poly = (pts: string, fill?: string | null, stroke?: string | null, sw?: number, fop?: number) => `<polygon points="${pts}"${fill ? ` fill="${fill}"` : ' fill="none"'}${fop ? ` fill-opacity="${fop}"` : ''}${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1.5}"` : ''}/>`;
const pth = (d: string, col: string, sw?: number, fill?: string | null) => `<path d="${d}"${fill ? ` fill="${fill}"` : ' fill="none"'} stroke="${col}" stroke-width="${sw || 1.5}"/>`;

// ---- industry glyphs g(x,y,r,col,fill) — flat, angular, token-colored ----
type Glyph = (x: number, y: number, r: number, c: string, f: boolean) => string;
const GLYPH: Record<string, Glyph> = {
    healthcare: (x, y, r, c, f) => { const t = r * 0.62; return rct(x - t / 3, y - t, 2 * t / 3, 2 * t, f ? c : null, c, Math.max(1.3, r * 0.14)) + rct(x - t, y - t / 3, 2 * t, 2 * t / 3, f ? c : null, c, Math.max(1.3, r * 0.14)); },
    fintech: (x, y, r, c, f) => cir(x, y, r * 0.82, f ? PAL.ground : null, c, Math.max(1.3, r * 0.13)) + ln(x, y - r * 0.5, x, y + r * 0.5, c, Math.max(1.3, r * 0.13)) + ln(x - r * 0.26, y - r * 0.18, x + r * 0.26, y - r * 0.18, c, r * 0.1) + ln(x - r * 0.26, y + r * 0.18, x + r * 0.26, y + r * 0.18, c, r * 0.1),
    'financial-services': (x, y, r, c, f) => { let s = poly(`${F(x - r * 0.9)},${F(y - r * 0.2)} ${F(x)},${F(y - r * 0.9)} ${F(x + r * 0.9)},${F(y - r * 0.2)}`, f ? c : null, c, r * 0.12); for (let i = -1; i <= 1; i++) s += ln(x + i * r * 0.54, y - r * 0.1, x + i * r * 0.54, y + r * 0.7, c, r * 0.11); return s + ln(x - r * 0.9, y + r * 0.7, x + r * 0.9, y + r * 0.7, c, r * 0.12); },
    government: (x, y, r, c, f) => { const t = r * 0.85; let s = pth(`M${F(x - t)},${F(y)} A${F(t)},${F(t)} 0 0 1 ${F(x + t)},${F(y)}`, c, r * 0.12); for (let i = -1; i <= 1; i++) s += ln(x + i * t * 0.55, y, x + i * t * 0.55, y + r * 0.7, c, r * 0.11); return s + ln(x - t, y + r * 0.7, x + t, y + r * 0.7, c, r * 0.12); },
    insurance: (x, y, r, c, f) => { const t = r * 0.8; return poly(`${F(x)},${F(y - r * 0.9)} ${F(x + t)},${F(y - r * 0.5)} ${F(x + t)},${F(y + r * 0.2)} ${F(x)},${F(y + r * 0.9)} ${F(x - t)},${F(y + r * 0.2)} ${F(x - t)},${F(y - r * 0.5)}`, f ? c : null, c, Math.max(1.3, r * 0.13)); },
    retail: (x, y, r, c, f) => { const t = r * 0.75; let s = poly(`${F(x - t)},${F(y - r * 0.3)} ${F(x + t)},${F(y - r * 0.3)} ${F(x + t * 0.8)},${F(y + r * 0.85)} ${F(x - t * 0.8)},${F(y + r * 0.85)}`, f ? c : null, c, Math.max(1.3, r * 0.13)); return s + pth(`M${F(x - r * 0.35)},${F(y - r * 0.3)} Q${F(x)},${F(y - r)} ${F(x + r * 0.35)},${F(y - r * 0.3)}`, c, r * 0.11); },
    workforce: (x, y, r, c, f) => cir(x, y - r * 0.4, r * 0.34, f ? c : null, c, Math.max(1.3, r * 0.13)) + poly(`${F(x - r * 0.6)},${F(y + r * 0.8)} ${F(x - r * 0.45)},${F(y + r * 0.1)} ${F(x + r * 0.45)},${F(y + r * 0.1)} ${F(x + r * 0.6)},${F(y + r * 0.8)}`, f ? c : null, c, Math.max(1.3, r * 0.13)),
    'higher-ed': (x, y, r, c, f) => { const t = r * 0.95; let s = poly(`${F(x)},${F(y - r * 0.7)} ${F(x + t)},${F(y - r * 0.3)} ${F(x)},${F(y + r * 0.1)} ${F(x - t)},${F(y - r * 0.3)}`, f ? c : null, c, Math.max(1.3, r * 0.12)); s += rct(x - r * 0.45, y - r * 0.05, r * 0.9, r * 0.35, f ? PAL.ground : null, c, r * 0.1); return s + ln(x + t * 0.7, y - r * 0.16, x + t * 0.7, y + r * 0.5, c, r * 0.09) + cir(x + t * 0.7, y + r * 0.5, r * 0.12, c); },
    advancement: (x, y, r, c, f) => { const t = r * 0.7; let s = rct(x - t, y - t * 0.4, 2 * t, t * 1.4, f ? c : null, c, Math.max(1.3, r * 0.12)); s += ln(x, y - t * 0.4, x, y + t, c, r * 0.1) + ln(x - t, y + t * 0.3, x + t, y + t * 0.3, c, r * 0.1); return s + poly(`${F(x - r * 0.4)},${F(y - t * 0.4)} ${F(x)},${F(y - t * 0.9)} ${F(x + r * 0.4)},${F(y - t * 0.4)}`, f ? c : null, c, r * 0.1); },
    'ai-industry': (x, y, r, c, f) => { const t = r * 0.6; let s = rct(x - t, y - t, 2 * t, 2 * t, f ? c : null, c, Math.max(1.3, r * 0.13)); for (let i = -1; i <= 1; i++) { s += ln(x + i * t * 0.6, y - t, x + i * t * 0.6, y - t - r * 0.3, c, r * 0.1) + ln(x + i * t * 0.6, y + t, x + i * t * 0.6, y + t + r * 0.3, c, r * 0.1) + ln(x - t, y + i * t * 0.6, x - t - r * 0.3, y + i * t * 0.6, c, r * 0.1) + ln(x + t, y + i * t * 0.6, x + t + r * 0.3, y + i * t * 0.6, c, r * 0.1); } return s; },
    'creative-ai': (x, y, r, c, f) => { let s = ''; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, L = (i % 2 ? r * 0.45 : r); s += ln(x, y, x + L * Math.cos(a), y + L * Math.sin(a), c, r * 0.11); } return s + cir(x, y, r * 0.12, c); },
};
function gly(ind: string | undefined, x: number, y: number, r: number, c: string, f: boolean): string {
    const g = ind ? GLYPH[ind] : undefined;
    return g ? g(x, y, r, c, f) : cir(x, y, r * 0.6, f ? c : null, c, 1.5);
}
function badge(w: number, h: number): string { return INDU ? `<g opacity="0.5">${gly(INDU, w - 28, 28, 11, PAL.muted, false)}</g>` : ''; }

// ---- node layout for networks ----
function layoutNodes(d: any, w: number, h: number) {
    const pad = Math.min(w, h) * 0.16, iw = w - 2 * pad, ih = h - 2 * pad, R = rng(d.seed), n = d.n || 8;
    const P: number[][] = [], E: number[][] = []; const A = (nx: number, ny: number) => [pad + nx * iw, pad + ny * ih];
    // AUTHORED mode: when the model supplies real relationships (links) and/or named nodes (labels),
    // the geometry IS the data — draw EXACTLY those edges, never random. Hub = the most-connected
    // node (or d.hubIndex), placed at center; the rest evenly on a ring. This makes the connections
    // mean something (an operating model's real dependencies), not decorative noise.
    if (Array.isArray(d.links) && d.links.length) {
        // AUTHORED node count = exactly the named nodes (labels) / referenced link indices — NOT the
        // random d.n (which would leave extra empty unconnected nodes on the canvas).
        const N = Math.max((d.labels ? d.labels.length : 0), 1 + Math.max(0, ...d.links.flat().map((x: number) => +x || 0)), 2);
        const deg = new Array(N).fill(0);
        for (const [a, b] of d.links) { if (a < N) deg[a]++; if (b < N) deg[b]++; }
        let hub = typeof d.hubIndex === 'number' ? d.hubIndex : deg.indexOf(Math.max(...deg));
        if (hub < 0 || hub >= N) hub = 0;
        const ring = [] as number[]; for (let i = 0; i < N; i++) if (i !== hub) ring.push(i);
        const pos = new Array(N) as number[][];
        pos[hub] = A(0.5, 0.5);
        ring.forEach((idx, k) => { const a = -Math.PI / 2 + k / ring.length * Math.PI * 2; pos[idx] = A(0.5 + 0.36 * Math.cos(a), 0.5 + 0.36 * Math.sin(a)); });
        for (let i = 0; i < N; i++) P.push(pos[i] || A(0.5, 0.5));
        for (const [a, b] of d.links) if (a < N && b < N) E.push([a, b]);
        d._hub = hub;
        return { P, E };
    }
    if (d.layout === 'radial') { P.push(A(0.5, 0.5)); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2, rad = 0.34 + 0.08 * R(); P.push(A(0.5 + rad * Math.cos(a), 0.5 + rad * Math.sin(a))); } for (let j = 1; j <= n; j++) { E.push([0, j]); if (R() > 0.55 && j < n) E.push([j, j + 1]); } d._hub = 0; }
    else if (d.layout === 'hub2') { P.push(A(0.32, 0.40)); P.push(A(0.68, 0.62)); E.push([0, 1]); for (let k = 0; k < n; k++) { const hsel = k % 2, ang = R() * Math.PI * 2, rd = 0.16 + 0.10 * R(), base = hsel ? [0.68, 0.62] : [0.32, 0.40], idx = P.length; P.push(A(base[0] + rd * Math.cos(ang), base[1] + rd * Math.sin(ang))); E.push([hsel, idx]); } d._hub = 0; }
    else if (d.layout === 'mesh') { const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols); let c2 = 0; for (let r = 0; r < rows; r++) for (let c = 0; c < cols && c2 < n; c++, c2++) { const jx = (R() - 0.5) * 0.06, jy = (R() - 0.5) * 0.06; P.push(A((c + 0.5) / cols + jx, (r + 0.5) / rows + jy)); } for (let ii = 0; ii < P.length; ii++) for (let jj = ii + 1; jj < P.length; jj++) { const dx = P[ii][0] - P[jj][0], dy = P[ii][1] - P[jj][1]; if (Math.hypot(dx, dy) < iw / cols * 1.3 && R() > 0.4) E.push([ii, jj]); } d._hub = Math.floor(n / 2); }
    else { const levels = Math.min(5, Math.max(3, Math.round(n / 2))); for (let l = 0; l < levels; l++) { P.push(A(0.32, 0.1 + l * 0.8 / (levels - 1))); if (l > 0) E.push([l - 1, l]); } let b = levels; for (let l2 = 0; l2 < levels && b < n; l2++) { if (R() > 0.3) { const side = R() > 0.5 ? 1 : -1; P.push(A(0.32 + side * (0.18 + 0.16 * R()), 0.1 + l2 * 0.8 / (levels - 1) + (R() - 0.5) * 0.06)); E.push([l2, b]); b++; } } d._hub = Math.floor(levels / 2); }
    return { P, E };
}

// ---- base 12 families (skinned with the run industry glyph + corner badge) ----
function r_operatingNetwork(d: any, w: number, h: number) { const o = layoutNodes(d, w, h), P = o.P, E = o.E, r = Math.min(w, h) * 0.014; let s = ''; for (let i = 0; i < E.length; i++) { const a = P[E[i][0]], b = P[E[i][1]]; if (a && b) s += ln(a[0], a[1], b[0], b[1], PAL.cyan, 1.5, 0.8); } for (let i = 0; i < P.length; i++) { if (i === d._hub) continue; s += cir(P[i][0], P[i][1], r, PAL.ground, PAL.ink, 1.8); } const H = P[d._hub]; s += cir(H[0], H[1], r * 2.4, null, PAL.accent, 1.4, 0.6) + gly(INDU, H[0], H[1], 14, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_capabilityStack(d: any, w: number, h: number) { const layers = d.layers || 3, hi = (d.highlight == null ? 1 : d.highlight), cx = w * 0.44, rx = Math.min(w * 0.26, h * 0.18), ry = rx * 0.5, th = Math.min(w, h) * 0.045; let s = ''; const top = h * 0.24, bot = h * 0.78, step = (layers > 1 ? (bot - top) / (layers - 1) : 0); s += ln(cx, top, cx, bot, PAL.rule, 1, 0.8); for (let i = 0; i < layers; i++) { const cy = top + i * step, edge = (i === hi) ? PAL.accent : PAL.cyan; const topD = `${F(cx)},${F(cy - ry)} ${F(cx + rx)},${F(cy)} ${F(cx)},${F(cy + ry)} ${F(cx - rx)},${F(cy)}`; const left = `${F(cx - rx)},${F(cy)} ${F(cx - rx)},${F(cy + th)} ${F(cx)},${F(cy + ry + th)} ${F(cx)},${F(cy + ry)}`; const right = `${F(cx)},${F(cy + ry)} ${F(cx)},${F(cy + ry + th)} ${F(cx + rx)},${F(cy + th)} ${F(cx + rx)},${F(cy)}`; s += poly(left, PAL.f2, edge, 1.4) + poly(right, PAL.f3, edge, 1.4) + poly(topD, (i === hi) ? PAL.hi : PAL.f1, edge, 1.4); } s += gly(INDU, cx, top - ry - 12, 11, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_maturityRadar(d: any, w: number, h: number) { const cx = w * 0.5, cy = h * 0.48, R = Math.min(w, h) * 0.34, ax = d.scores.length; let s = '', pts: string; for (let g = 1; g <= 4; g++) { pts = ''; for (let i = 0; i < ax; i++) { const a = -Math.PI / 2 + i / ax * 2 * Math.PI; pts += `${F(cx + R * g / 4 * Math.cos(a))},${F(cy + R * g / 4 * Math.sin(a))} `; } s += poly(pts.trim(), null, PAL.rule, 1); } for (let i = 0; i < ax; i++) { const a = -Math.PI / 2 + i / ax * 2 * Math.PI; s += ln(cx, cy, cx + R * Math.cos(a), cy + R * Math.sin(a), PAL.rule, 1, 0.7); } if (d.target) { pts = ''; for (let i = 0; i < ax; i++) { const a = -Math.PI / 2 + i / ax * 2 * Math.PI, rr = R * d.target[i]; pts += `${F(cx + rr * Math.cos(a))},${F(cy + rr * Math.sin(a))} `; } s += `<polygon points="${pts.trim()}" fill="none" stroke="${PAL.cyan}" stroke-width="1.4" stroke-dasharray="5 4"/>`; } pts = ''; for (let i = 0; i < ax; i++) { const a = -Math.PI / 2 + i / ax * 2 * Math.PI, rr = R * d.scores[i]; pts += `${F(cx + rr * Math.cos(a))},${F(cy + rr * Math.sin(a))} `; } s += poly(pts.trim(), PAL.accent, PAL.accent, 2, 0.14); for (let i = 0; i < ax; i++) { const a = -Math.PI / 2 + i / ax * 2 * Math.PI, rr = R * d.scores[i]; s += cir(cx + rr * Math.cos(a), cy + rr * Math.sin(a), Math.min(w, h) * 0.012, PAL.accent); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_funnelFlow(d: any, w: number, h: number) { const v = d.stages, k = v.length, max = Math.max(...v); let s = ''; const top = h * 0.16, bot = h * 0.82, cx = w * 0.5, maxW = w * 0.62, gap = (bot - top) / k * 0.16, segH = ((bot - top) - (gap * (k - 1))) / k; for (let i = 0; i < k; i++) { const wT = maxW * (v[i] / max), wB = maxW * ((i < k - 1 ? v[i + 1] : v[i] * 0.72) / max), y = top + i * (segH + gap), last = (i === k - 1); s += poly(`${F(cx - wT / 2)},${F(y)} ${F(cx + wT / 2)},${F(y)} ${F(cx + wB / 2)},${F(y + segH)} ${F(cx - wB / 2)},${F(y + segH)}`, last ? PAL.accent : PAL.f1, last ? PAL.accent : PAL.cyan, 1.5, last ? undefined : 0.95); } s += gly(INDU, cx, bot + 10, 9, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_journeyLine(d: any, w: number, h: number) { const k = d.stations, R = rng(d.seed || 7); let s = ''; const x0 = w * 0.12, x1 = w * 0.88, midY = h * 0.5, amp = h * 0.16, pts: number[][] = []; for (let i = 0; i < k; i++) { const x = x0 + (x1 - x0) * i / (k - 1), y = midY + (i % 2 ? amp : -amp) * (0.5 + 0.5 * R()); pts.push([x, y]); } let path = `M${F(pts[0][0])},${F(pts[0][1])} `; for (let i = 1; i < k; i++) { const mx = (pts[i - 1][0] + pts[i][0]) / 2; path += `L${F(mx)},${F(pts[i - 1][1])} L${F(mx)},${F(pts[i][1])} L${F(pts[i][0])},${F(pts[i][1])} `; } s += pth(path, PAL.cyan, 2.4); const fr: Record<number, number> = {}; (d.friction || []).forEach((x: number) => { fr[x] = 1; }); for (let i = 0; i < k - 1; i++) { const p = pts[i]; if (fr[i]) s += cir(p[0], p[1], Math.min(w, h) * 0.024, PAL.ground, PAL.rust, 2.2) + cir(p[0], p[1], Math.min(w, h) * 0.008, PAL.rust); else s += cir(p[0], p[1], Math.min(w, h) * 0.014, PAL.ground, PAL.ink, 1.6); } s += gly(INDU, pts[k - 1][0], pts[k - 1][1], 13, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_dataField(d: any, w: number, h: number) { const v = d.values.slice(); if (d.sort === 'asc') v.sort((a: number, b: number) => a - b); if (d.sort === 'desc') v.sort((a: number, b: number) => b - a); const x0 = w * 0.12, x1 = w * 0.88, base = h * 0.8, top = h * 0.2, max = Math.max(...v), n = v.length, slot = (x1 - x0) / n, bw = slot * 0.6; let s = ln(x0, base, x1, base, PAL.rule, 1); for (let i = 0; i < n; i++) { const bh = (v[i] / max) * (base - top); s += rct(x0 + i * slot, base - bh, bw, bh, (d.highlight === i) ? PAL.cyan : PAL.accent); } if (d.mean) { const m = v.reduce((a: number, b: number) => a + b, 0) / n, my = base - (m / max) * (base - top); s += `<line x1="${F(x0)}" y1="${F(my)}" x2="${F(x1)}" y2="${F(my)}" stroke="${PAL.cyan}" stroke-width="1.4" stroke-dasharray="7 5"/>`; } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_comparisonMatrix(d: any, w: number, h: number) { const cells = d.cells, rows = cells.length, cols = cells[0].length; let s = ''; const gw = Math.min(w * 0.66, h * 0.66 * cols / rows), gh = gw * rows / cols, x0 = (w - gw) / 2, y0 = (h - gh) / 2, cw = gw / cols, ch = gh / rows, pad = Math.min(cw, ch) * 0.12; let bi = 0, bj = 0, best = -1; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { if (cells[i][j] > best) { best = cells[i][j]; bi = i; bj = j; } } for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const x = x0 + j * cw, y = y0 + i * ch, vv = cells[i][j]; s += rct(x + pad, y + pad, cw - 2 * pad, ch - 2 * pad, null, PAL.rule, 1); const sz = (Math.min(cw, ch) - 2 * pad) * vv * 0.82, ix = x + cw / 2, iy = y + ch / 2, fill = (i === bi && j === bj) ? PAL.accent : PAL.cyan; s += rct(ix - sz / 2, iy - sz / 2, sz, sz, fill, null, 0); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_instrumentDial(d: any, w: number, h: number) { const cx = w * 0.5, cy = h * 0.54, R = Math.min(w, h) * 0.32, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2; let s = ''; const arc = (rr: number, col: string, sw: number, t0: number, t1: number) => { const sx = cx + rr * Math.cos(t0), sy = cy + rr * Math.sin(t0), ex = cx + rr * Math.cos(t1), ey = cy + rr * Math.sin(t1), lg = (t1 - t0) > Math.PI ? 1 : 0; return pth(`M${F(sx)},${F(sy)} A${F(rr)},${F(rr)} 0 ${lg} 1 ${F(ex)},${F(ey)}`, col, sw); }; s += arc(R, PAL.rule, 2, a0, a1); const tv = a0 + (a1 - a0) * (d.value / 100); s += arc(R, PAL.cyan, 2.6, a0, tv); const seg = d.segments || 10; for (let i = 0; i <= seg; i++) { const t = a0 + (a1 - a0) * i / seg, big = (i % 5 === 0); s += ln(cx + (R - (big ? 13 : 8)) * Math.cos(t), cy + (R - (big ? 13 : 8)) * Math.sin(t), cx + R * Math.cos(t), cy + R * Math.sin(t), PAL.muted, 1, 0.8); } s += ln(cx, cy, cx + R * 0.66 * Math.cos(tv), cy + R * 0.66 * Math.sin(tv), PAL.accent, 2.4); s += gly(INDU, cx, cy, 15, PAL.accent, false); return W(w, h, s + CT(w, h) + badge(w, h)); }
// SWIM-LANE gantt: a left label gutter (drawn by the label layer), full-width lane separators, a
// gutter divider, period gridlines in the chart area, and one bar per lane centered vertically.
const GANTT_GUTTER = 0.30, GANTT_TOP = 0.18, GANTT_BOT = 0.82, GANTT_X1 = 0.95;
function r_timelineGantt(d: any, w: number, h: number) { const tr = d.tracks, periods = d.periods || 6, k = tr.length; let s = ''; const x0 = w * GANTT_GUTTER, x1 = w * GANTT_X1, top = h * GANTT_TOP, bot = h * GANTT_BOT, rowH = (bot - top) / k, colW = (x1 - x0) / periods; for (let i = 0; i <= k; i++) { const y = top + i * rowH; s += ln(w * 0.05, y, x1, y, PAL.rule, 1, i === 0 || i === k ? 0.55 : 0.3); } s += ln(x0, top, x0, bot, PAL.rule, 1, 0.55); for (let i = 1; i <= periods; i++) { const x = x0 + i * colW; s += ln(x, top, x, bot, PAL.rule, 1, 0.28); } for (let i = 0; i < k; i++) { const y = top + i * rowH + rowH * 0.3, bh = rowH * 0.4, bx = x0 + tr[i].start * colW, bw = tr[i].dur * colW, last = (i === k - 1); s += rct(bx, y, bw, bh, last ? PAL.accent : PAL.f1, last ? PAL.accent : PAL.cyan, 1.5); } if (d.now != null) { const nx = x0 + d.now * colW; s += `<line x1="${F(nx)}" y1="${F(top - 6)}" x2="${F(nx)}" y2="${F(bot + 6)}" stroke="${PAL.cyan}" stroke-width="1.6" stroke-dasharray="5 5"/>`; } if (d.milestone != null) { const mx = x0 + d.milestone * colW, my = top - 4; s += poly(`${F(mx)},${F(my - 7)} ${F(mx + 7)},${F(my)} ${F(mx)},${F(my + 7)} ${F(mx - 7)},${F(my)}`, PAL.accent, null, 0); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_flowSchematic(d: any, w: number, h: number) { const b = d.blocks, links = d.links || []; let s = ''; const pad = Math.min(w, h) * 0.1, iw = w - 2 * pad, ih = h - 2 * pad; const B = b.map((q: number[]) => ({ x: pad + q[0] * iw, y: pad + q[1] * ih, w: q[2] * iw, h: q[3] * ih })); for (let i = 0; i < links.length; i++) { const a = B[links[i][0]], c = B[links[i][1]], ax = a.x + a.w, ay = a.y + a.h / 2, cxp = c.x, cyp = c.y + c.h / 2, mx = (ax + cxp) / 2; s += pth(`M${F(ax)},${F(ay)} L${F(mx)},${F(ay)} L${F(mx)},${F(cyp)} L${F(cxp)},${F(cyp)}`, PAL.cyan, 1.4); s += poly(`${F(cxp)},${F(cyp)} ${F(cxp - 7)},${F(cyp - 4)} ${F(cxp - 7)},${F(cyp + 4)}`, PAL.cyan, null, 0); } for (let i = 0; i < B.length; i++) { const q = B[i], hl = (d.highlight === i); s += rct(q.x, q.y, q.w, q.h, hl ? PAL.hi : PAL.f1, hl ? PAL.accent : PAL.cyan, 1.6); s += gly(INDU, q.x + q.w / 2, q.y + q.h / 2, Math.min(q.w, q.h) * 0.32, hl ? PAL.accent : PAL.ink, false); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_proportionStack(d: any, w: number, h: number) { const groups = d.groups, total = groups.reduce((a: number, b: number) => a + b, 0); let s = ''; const N = 10, side = Math.min(w, h) * 0.56, x0 = (w - side) / 2, y0 = (h - side) / 2, cell = side / N, pad = cell * 0.16; const counts = groups.map((g: number) => Math.round(g / total * 100)); const sum = counts.reduce((a: number, b: number) => a + b, 0); counts[0] += 100 - sum; const cols = [PAL.accent, PAL.cyan, PAL.f1, PAL.rule, PAL.muted]; let idx = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { let acc = 0, g = 0; for (let k = 0; k < counts.length; k++) { acc += counts[k]; if (idx < acc) { g = k; break; } } s += rct(x0 + c * cell + pad, y0 + r * cell + pad, cell - 2 * pad, cell - 2 * pad, cols[g % cols.length], null, 0); idx++; } return W(w, h, s + CT(w, h) + badge(w, h)); }
function r_sectionMark(d: any, w: number, h: number) { let s = ln(w * 0.12, h * 0.5, w * 0.88, h * 0.5, PAL.rule, 1, 0.4); s += `<g opacity="0.16">${gly(INDU, w / 2, h / 2, Math.min(w, h) * 0.32, PAL.muted, false)}</g>`; s += gly(INDU, w / 2, h / 2, Math.min(w, h) * 0.12, PAL.accent, true); return W(w, h, s + CT(w, h)); }

// ---- domain-native signature forms ----
function dHealthEcg(_d: any, w: number, h: number) { const x0 = w * 0.1, x1 = w * 0.9, mid = h * 0.5, amp = h * 0.24, seg = (x1 - x0) / 24; let x = x0, dd = `M${F(x)},${F(mid)} `; for (let i = 0; i < 24; i++) { if (i % 6 === 3) dd += `L${F(x + seg * 0.2)},${F(mid)} L${F(x + seg * 0.35)},${F(mid - amp)} L${F(x + seg * 0.5)},${F(mid + amp * 0.6)} L${F(x + seg * 0.7)},${F(mid)} L${F(x + seg)},${F(mid)} `; else dd += `L${F(x + seg)},${F(mid)} `; x += seg; } return W(w, h, ln(x0, mid, x1, mid, PAL.rule, 1, 0.35) + pth(dd, PAL.accent, 2.2) + CT(w, h) + badge(w, h)); }
function dFinCandle(d: any, w: number, h: number) { const R = rng(d.seed || 3), n = 9, x0 = w * 0.12, x1 = w * 0.88, top = h * 0.18, bot = h * 0.82, sl = (x1 - x0) / n; let s = ln(x0, (top + bot) / 2, x1, (top + bot) / 2, PAL.rule, 1, 0.4), pr = 0.5; const Y = (t: number) => bot - (bot - top) * t; for (let i = 0; i < n; i++) { const o = pr, c = Math.max(0.08, Math.min(0.92, o + (R() - 0.45) * 0.4)); pr = c; const hi = Math.max(o, c) + R() * 0.12, lo = Math.min(o, c) - R() * 0.12, cx = x0 + i * sl + sl / 2, up = c >= o, col = up ? PAL.accent : PAL.rust; s += ln(cx, Y(hi), cx, Y(lo), col, 1.4) + rct(cx - sl * 0.22, Y(Math.max(o, c)), sl * 0.44, Math.max(2, Math.abs(Y(o) - Y(c))), up ? col : PAL.ground, col, 1.4); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dFsWaterfall(d: any, w: number, h: number) { const R = rng(d.seed || 4), n = 6, x0 = w * 0.12, x1 = w * 0.86, top = h * 0.2, bot = h * 0.82, sl = (x1 - x0) / n, bw = sl * 0.6; let s = ln(x0, bot, x1, bot, PAL.rule, 1), cur = bot - (bot - top) * 0.35; for (let i = 0; i < n; i++) { const la = (i === 0 || i === n - 1), y1 = la ? (i === 0 ? cur : bot) : cur - ((R() - 0.45) * (bot - top) * 0.4), t2 = Math.min(cur, y1), hh = Math.max(3, Math.abs(y1 - cur)); s += rct(x0 + i * sl + sl * 0.2, la ? Math.min(top + (bot - top) * 0.3, bot - 4) : t2, bw, la ? (bot - (la && i === 0 ? cur : t2)) : hh, la ? PAL.accent : PAL.cyan); if (i < n - 1) s += ln(x0 + i * sl + sl * 0.8, y1, x0 + (i + 1) * sl + sl * 0.2, y1, PAL.muted, 1, 0.6); cur = y1; } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dRetailPlanogram(d: any, w: number, h: number) { const R = rng(d.seed || 5), cols = 6, rows = 4, x0 = w * 0.12, x1 = w * 0.88, y0 = h * 0.18, y1 = h * 0.82, cw = (x1 - x0) / cols, rh = (y1 - y0) / rows; let s = ''; for (let r = 0; r < rows; r++) { s += ln(x0, y0 + r * rh + rh, x1, y0 + r * rh + rh, PAL.muted, 1.4, 0.7); for (let c = 0; c < cols; c++) { if (R() > 0.25) { const bw = cw * (0.5 + 0.4 * R()), bh = rh * (0.4 + 0.45 * R()); s += rct(x0 + c * cw + (cw - bw) / 2, y0 + r * rh + rh - bh - 2, bw, bh, (R() > 0.82) ? PAL.accent : PAL.f1, PAL.cyan, 1.2); } } } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dAiChipTopo(d: any, w: number, h: number) { const cols = 4, rows = 3, x0 = w * 0.16, x1 = w * 0.84, y0 = h * 0.2, y1 = h * 0.8, cw = (x1 - x0) / (cols - 1), rh = (y1 - y0) / (rows - 1), R = rng(d.seed || 6); let s = ''; const pts: number[][] = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([x0 + c * cw, y0 + r * rh]); for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1]; if (Math.hypot(dx, dy) < cw * 1.2 && R() > 0.45) s += ln(pts[i][0], pts[i][1], pts[j][0], pts[j][1], PAL.cyan, 1.2, 0.7); } for (let i = 0; i < pts.length; i++) s += gly('ai-industry', pts[i][0], pts[i][1], 7, (i === 5) ? PAL.accent : PAL.ink, i === 5); return W(w, h, s + CT(w, h) + badge(w, h)); }
function dInsLossTri(_d: any, w: number, h: number) { const n = 5, x0 = w * 0.14, y0 = h * 0.2, cw = (w * 0.72) / n, ch = (h * 0.6) / n; let s = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n - r; c++) { const v = (r + c) / (2 * n); s += rct(x0 + c * cw, y0 + r * ch, cw - 3, ch - 3, v > 0.6 ? PAL.accent : (v > 0.3 ? PAL.cyan : PAL.f1), PAL.rule, 1); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dHeEnrollFunnel(d: any, w: number, h: number) { const v = (d.stages && d.stages.length >= 3) ? d.stages : [100, 62, 40, 24], k = v.length, max = Math.max(...v), top = h * 0.12, bot = h * 0.68, cx = w * 0.5, mw = w * 0.6, gap = (bot - top) / k * 0.16, segH = ((bot - top) - gap * (k - 1)) / k; let s = ''; for (let i = 0; i < k; i++) { const wT = mw * (v[i] / max), wB = mw * ((i < k - 1 ? v[i + 1] : v[i] * 0.7) / max), y = top + i * (segH + gap), la = (i === k - 1); s += poly(`${F(cx - wT / 2)},${F(y)} ${F(cx + wT / 2)},${F(y)} ${F(cx + wB / 2)},${F(y + segH)} ${F(cx - wB / 2)},${F(y + segH)}`, la ? PAL.accent : PAL.f1, la ? PAL.accent : PAL.cyan, 1.5, la ? undefined : 0.95); } s += gly('higher-ed', cx, h * 0.84, Math.min(w, h) * 0.12, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function dAdvGiftPyr(_d: any, w: number, h: number) { const n = 4, cx = w * 0.5, top = h * 0.16, bot = h * 0.84, th = (bot - top) / n, unit = w * 0.6 / n; let s = ''; for (let i = 0; i < n; i++) { const ww = (w * 0.6) * ((i + 1) / n), y = top + i * th, la = (i === 0); s += poly(`${F(cx - ww / 2)},${F(y + th)} ${F(cx + ww / 2)},${F(y + th)} ${F(cx + (ww - unit) / 2)},${F(y)} ${F(cx - (ww - unit) / 2)},${F(y)}`, la ? PAL.accent : PAL.f1, la ? PAL.accent : PAL.cyan, 1.4); } s += gly('advancement', cx, top - 4, Math.min(w, h) * 0.08, PAL.accent, true); return W(w, h, s + CT(w, h) + badge(w, h)); }
function dWfOrgPyr(_d: any, w: number, h: number) { const rows = [1, 2, 4], top = h * 0.18, bot = h * 0.8, rh = (bot - top) / rows.length; let s = ''; for (let r = 0; r < rows.length; r++) { const cnt = rows[r], gap = w * 0.7 / cnt, y = top + r * rh + rh / 2; for (let c = 0; c < cnt; c++) { const x = w * 0.15 + gap * (c + 0.5); s += gly('workforce', x, y, Math.min(w, h) * 0.07, (r === 0) ? PAL.accent : PAL.ink, r === 0); if (r < rows.length - 1) s += ln(x, y + rh * 0.2, w * 0.15 + (w * 0.7 / rows[r + 1]) * (Math.floor(c * rows[r + 1] / cnt) + 0.5), top + (r + 1) * rh + rh / 2 - rh * 0.2, PAL.cyan, 1.2, 0.6); } } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dGovServiceGrid(d: any, w: number, h: number) { const R = rng(d.seed || 7), cols = 5, rows = 3, x0 = w * 0.12, x1 = w * 0.88, y0 = h * 0.2, y1 = h * 0.8, cw = (x1 - x0) / cols, rh = (y1 - y0) / rows; let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const on = R() > 0.45; s += rct(x0 + c * cw + 3, y0 + r * rh + 3, cw - 6, rh - 6, on ? PAL.cyan : PAL.f1, PAL.rule, 1); if (on && R() > 0.6) s += gly('government', x0 + c * cw + cw / 2, y0 + r * rh + rh / 2, Math.min(cw, rh) * 0.22, PAL.accent, false); } return W(w, h, s + CT(w, h) + badge(w, h)); }
function dCaiPipeline(_d: any, w: number, h: number) { const n = 4, x0 = w * 0.14, x1 = w * 0.86, y = h * 0.5, sl = (x1 - x0) / (n - 1); let s = ''; for (let i = 0; i < n - 1; i++) s += ln(x0 + i * sl, y, x0 + (i + 1) * sl, y, PAL.cyan, 1.6, 0.8); for (let i = 0; i < n; i++) s += gly('creative-ai', x0 + i * sl, y, (i === n - 1) ? 15 : 10, (i === n - 1) ? PAL.accent : PAL.ink, false); return W(w, h, s + CT(w, h) + badge(w, h)); }

const FAMILIES: Record<string, (d: any, w: number, h: number) => string> = {
    operatingNetwork: r_operatingNetwork, capabilityStack: r_capabilityStack, maturityRadar: r_maturityRadar,
    funnelFlow: r_funnelFlow, journeyLine: r_journeyLine, dataField: r_dataField, comparisonMatrix: r_comparisonMatrix,
    instrumentDial: r_instrumentDial, timelineGantt: r_timelineGantt, flowSchematic: r_flowSchematic,
    proportionStack: r_proportionStack, sectionMark: r_sectionMark,
    hc_ecg: dHealthEcg, fx_candlestick: dFinCandle, fs_waterfall: dFsWaterfall, rt_planogram: dRetailPlanogram,
    ai_chiptopo: dAiChipTopo, in_losstri: dInsLossTri, he_enrollfunnel: dHeEnrollFunnel, adv_giftpyr: dAdvGiftPyr,
    wf_orgpyr: dWfOrgPyr, gov_servicegrid: dGovServiceGrid, cai_pipeline: dCaiPipeline,
};

/** Render a content-true SVG for `family` from its `data`, sized to (w,h), in `theme`, optionally
 *  skinned with the run `industry`'s glyph. Deterministic (data.seed). text-FREE. '' if unknown. */
export function renderVizFamily(family: string, data: any, w: number, h: number, theme: VizTheme, industry?: string): string {
    const f = FAMILIES[family];
    if (!f) return '';
    PAL = theme; INDU = industry;
    return f(data || {}, w, h);
}

/** Route an unseen slide/section heading to a base family (precedence specific -> general). */
export function pickVizFamily(text: string): VizBaseFamily {
    const t = (text || '').toLowerCase();
    if (/\bsection\b|divider|agenda|appendix|\bpart [a-z]\b|chapter/.test(t)) return 'sectionMark';
    if (/architect|schematic|how it works|integration|data flow|processing/.test(t)) return 'flowSchematic';
    if (/road ?map|timeline|rollout|release plan|\bphase|quarter|calendar/.test(t)) return 'timelineGantt';
    if (/compar|matrix|trade-?off|scorecard|build.*buy|versus|prioriti|\bgrid\b/.test(t)) return 'comparisonMatrix';
    if (/matur|readiness|assess|governance score|quality dimension/.test(t)) return 'maturityRadar';
    if (/journey|experience|lifecycle|coaching cycle|onboarding|path$/.test(t)) return 'journeyLine';
    if (/funnel|conver|drop-?off|yield|activation|enrollment funnel/.test(t)) return 'funnelFlow';
    if (/allocation|\bmix\b|composition|breakdown|\bshare\b|\bsplit\b|budget|distribution/.test(t)) return 'proportionStack';
    if (/ by (college|segment|channel|industry|domain|cohort|plan|type|region|bucket)|rank|benchmark|caseload|aging/.test(t)) return 'dataField';
    if (/capabilit|platform|\bstack\b|\blayer|\btier/.test(t)) return 'capabilityStack';
    if (/gauge|\bscore\b|\bkpi\b|\brate\b|percent|\bnps\b|\bindex\b|health|fidelity|confidence|retention/.test(t)) return 'instrumentDial';
    if (/finding|evidence/.test(t)) return 'dataField';
    return 'operatingNetwork';
}

/** The base family a domain form extends (so a caller can map data shape + fall back). */
export const DOMAIN_FORM_BASE: Record<VizDomainForm, VizBaseFamily> = {
    hc_ecg: 'instrumentDial', fx_candlestick: 'dataField', fs_waterfall: 'funnelFlow', rt_planogram: 'comparisonMatrix',
    ai_chiptopo: 'flowSchematic', in_losstri: 'comparisonMatrix', he_enrollfunnel: 'funnelFlow', adv_giftpyr: 'funnelFlow',
    wf_orgpyr: 'operatingNetwork', gov_servicegrid: 'comparisonMatrix', cai_pipeline: 'flowSchematic',
};

// ---- labeled-diagram mode (#14): considered, collision-safe label placement ----
// place strategy per anchor: 'radial' (fan outward from a center along dir), 'col' (a left-aligned
// side column at colX), 'center' (centered in a band/block), 'above'/'below' (offset vertically).
export interface VizAnchor { x: number; y: number; role: 'node' | 'hub' | 'phase' | 'block' | 'track' | 'layer'; align: 'left' | 'right' | 'center'; idx: number; place?: 'radial' | 'col' | 'center' | 'above' | 'below'; dx?: number; dy?: number; colX?: number; nodeR?: number; }
/** Anchor + placement plan for each label of a LABELED diagram. The plan keeps labels OFF the
 *  vector and off each other: networks/radars fan radially; stacks/dials list in a side column;
 *  funnels/blocks center in their band; journeys sit above peaks / below troughs. [] if not labeled. */
export function vizAnchors(family: string, data: any, w: number, h: number): VizAnchor[] {
    const a: VizAnchor[] = [];
    if (family === 'operatingNetwork') {
        const dd = { ...data }; const o = layoutNodes(dd, w, h); const hub = (dd as any)._hub; const H = o.P[hub] || [w / 2, h / 2];
        o.P.forEach((p, i) => {
            if (i === hub) { a.push({ x: p[0], y: p[1], role: 'hub', align: 'center', idx: i, place: 'below', nodeR: 18 }); return; }
            let vx = p[0] - H[0], vy = p[1] - H[1]; const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
            a.push({ x: p[0], y: p[1], role: 'node', align: 'center', idx: i, place: 'radial', dx: vx, dy: vy, nodeR: 12 });
        });
    } else if (family === 'maturityRadar') {
        const ax = (data.scores ? data.scores.length : 0) || (data.labels ? data.labels.length : 0) || 5, cx = w * 0.5, cy = h * 0.48, R = Math.min(w, h) * 0.34;
        for (let i = 0; i < ax; i++) { const an = -Math.PI / 2 + i / ax * 2 * Math.PI; a.push({ x: cx + R * Math.cos(an), y: cy + R * Math.sin(an), role: 'node', align: 'center', idx: i, place: 'radial', dx: Math.cos(an), dy: Math.sin(an), nodeR: 6 }); }
    } else if (family === 'capabilityStack') {
        // labels in a LEFT-ALIGNED COLUMN to the right of the isometric stack (no overlap with plates)
        const layers = data.layers || 3, cx = w * 0.44, rx = Math.min(w * 0.26, h * 0.18), top = h * 0.24, bot = h * 0.78, step = (layers > 1 ? (bot - top) / (layers - 1) : 0), colX = cx + rx + 24;
        for (let i = 0; i < layers; i++) a.push({ x: colX, y: top + i * step, role: 'layer', align: 'left', idx: i, place: 'col', colX });
    } else if (family === 'instrumentDial') {
        a.push({ x: w * 0.5, y: h * 0.9, role: 'hub', align: 'center', idx: 0, place: 'center' });
    } else if (family === 'journeyLine' || family === 'he_enrollfunnel') {
        const k = data.stations || (data.stages ? data.stages.length : 5), R = rng(data.seed || 7);
        const x0 = w * 0.12, x1 = w * 0.88, midY = h * 0.5, amp = h * 0.16;
        for (let i = 0; i < k; i++) { const x = x0 + (x1 - x0) * i / (k - 1), peak = (i % 2 === 1), y = midY + (peak ? amp : -amp) * (0.5 + 0.5 * R()); a.push({ x, y, role: 'phase', align: 'center', idx: i, place: peak ? 'below' : 'above', nodeR: 12 }); }
    } else if (family === 'timelineGantt') {
        // label sits in the LEFT GUTTER, vertically centered in its swim lane, left-aligned column
        const tr = data.tracks || [], top = h * GANTT_TOP, bot = h * GANTT_BOT, rowH = (bot - top) / (tr.length || 1), colX = w * 0.065;
        tr.forEach((_t: any, i: number) => a.push({ x: colX, y: top + i * rowH + rowH * 0.5, role: 'track', align: 'left', idx: i, place: 'col', colX }));
    } else if (family === 'flowSchematic' || family === 'ai_chiptopo') {
        const b = data.blocks || [], pad = Math.min(w, h) * 0.1, iw = w - 2 * pad, ih = h - 2 * pad;
        b.forEach((q: number[], i: number) => a.push({ x: pad + (q[0] + q[2] / 2) * iw, y: pad + (q[1] + q[3] / 2) * ih, role: 'block', align: 'center', idx: i, place: 'center' }));
    } else if (family === 'funnelFlow' || family === 'fs_waterfall' || family === 'adv_giftpyr') {
        const v = data.stages || [], k = v.length || (data.labels ? data.labels.length : 0) || 4, top = h * 0.16, bot = h * 0.82, gap = (bot - top) / k * 0.16, segH = ((bot - top) - (gap * (k - 1))) / k;
        for (let i = 0; i < k; i++) a.push({ x: w * 0.5, y: top + i * (segH + gap) + segH / 2, role: 'phase', align: 'center', idx: i, place: 'center' });
    } else if (family === 'dataField' || family === 'fx_candlestick') {
        const v = data.values || [], n = v.length || (data.labels ? data.labels.length : 0) || 6, x0 = w * 0.12, x1 = w * 0.88, slot = (x1 - x0) / n;
        for (let i = 0; i < n; i++) a.push({ x: x0 + i * slot + slot * 0.3, y: h * 0.88, role: 'node', align: 'center', idx: i, place: 'center' });
    }
    return a;
}

const escX = (s: any) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
/** 2026-10-26 (live: "Accountable senior judgm."): a label wraps to two lines at word boundaries; a label longer than
 *  two lines ends at the last whole word, never mid-word and never with an added period. */
function wrapLabel(s: string, max: number): string[] {
    const words = String(s || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
        if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; if (lines.length === 2) { cur = ''; break; } }
        else cur = cur ? cur + ' ' + w : w;
    }
    if (cur && lines.length < 2) lines.push(cur);
    return lines.map(l => l.length > max + 6 ? l.slice(0, max).replace(/\s+\S*$/, '') : l);
}
interface Box { x: number; y: number; w: number; h: number; tx: number; ty: number; anchor: string; txt: string; lines?: string[]; }
function overlaps(a: Box, b: Box) { return a.x < b.x + b.w + 2 && a.x + a.w + 2 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y; }
/** Each label = a knockout PLATE (ground fill + hairline) with text, placed by the anchor plan,
 *  clamped inside the frame, then an O(n^2) nudge pass pushes any overlapping plate clear. Column
 *  labels share a common left x (left-aligned to each other); radial labels fan outward. */
function labelLayer(family: string, data: any, w: number, h: number, font: string): string {
    const labels: string[] = Array.isArray(data && data.labels) ? data.labels : [];
    if (!labels.length && !(data && data.hub)) return '';
    const anchors = vizAnchors(family, data, w, h);
    if (!anchors.length) return '';
    const fs = Math.max(10, Math.round(Math.min(w, h) * 0.032));
    const maxc = (family === 'operatingNetwork' || family === 'maturityRadar') ? 16 : 24;
    const padX = fs * 0.5, padY = fs * 0.32, cw = fs * 0.56, gap = 6;
    const ink = PAL.ink, plate = PAL.ground, edge = PAL.rule;
    const boxes: Box[] = [];
    for (const an of anchors) {
        const raw = an.role === 'hub' && data.hub ? data.hub : labels[an.idx];
        if (raw == null || raw === '') continue;
        const lines = wrapLabel(raw, maxc); const txt = lines.join(' ');
        const bw = Math.max(...lines.map(l => l.length)) * cw + padX * 2, bh = fs * (1 + 1.15 * (lines.length - 1)) + padY * 2, nodeR = an.nodeR || 8;
        let cx = an.x, cy = an.y, tx = 0, anchor = 'middle';
        if (an.place === 'radial') { const dx = an.dx || 0, dy = an.dy || 0; const off = nodeR + gap + (Math.abs(dx) * bw + Math.abs(dy) * bh) / 2; cx = an.x + dx * off; cy = an.y + dy * off; }
        else if (an.place === 'col') { cx = (an.colX || an.x) + bw / 2; cy = an.y; }           // left edge fixed at colX
        else if (an.place === 'above') { cy = an.y - nodeR - gap - bh / 2; }
        else if (an.place === 'below') { cy = an.y + nodeR + gap + bh / 2; }
        // clamp inside frame
        cx = Math.max(bw / 2 + 3, Math.min(w - bw / 2 - 3, cx));
        cy = Math.max(bh / 2 + 3, Math.min(h - bh / 2 - 3, cy));
        let bx = cx - bw / 2; const by0 = cy - bh / 2;
        if (an.place === 'col') { bx = (an.colX || an.x); cx = bx + bw / 2; }                  // keep column left-aligned (no clamp shift)
        boxes.push({ x: bx, y: by0, w: bw, h: bh, tx: an.place === 'col' ? bx + padX : cx, ty: by0 + padY + fs * 0.84, anchor: an.place === 'col' ? 'start' : 'middle', txt, lines });
    }
    // overlap-nudge pass: push any colliding plate downward until clear (then clamp to frame)
    for (let i = 1; i < boxes.length; i++) { let guard = 0; while (guard++ < 12 && boxes.slice(0, i).some(b => overlaps(boxes[i], b))) { boxes[i].y += boxes[i].h + 4; if (boxes[i].y + boxes[i].h > h - 3) { boxes[i].y = Math.max(3, boxes[i].y - (boxes[i].h + 4)); break; } boxes[i].ty = boxes[i].y + padY + fs * 0.84; } }
    // 2026-10-26 (live: labels drawn in a serif): the SVG rides an <img> data URI, which cannot load the page's web
    // fonts, so the stack always ends on system sans faces.
    const face = `${String(font || 'Archivo').replace(/"/g, "'")}, Arial, Helvetica, sans-serif`;
    let s = '';
    for (const b of boxes) {
        s += `<rect x="${b.x.toFixed(0)}" y="${b.y.toFixed(0)}" width="${b.w.toFixed(0)}" height="${b.h.toFixed(0)}" rx="2" fill="${plate}" stroke="${edge}" stroke-width="1"/>`;   // opaque: a connector never shows through a label (2026-10-27 live hub divider)
        const lines = b.lines && b.lines.length ? b.lines : [b.txt];
        s += `<text x="${b.tx.toFixed(0)}" y="${b.ty.toFixed(0)}" font-family="${face}" font-size="${fs}" fill="${ink}" text-anchor="${b.anchor}">${lines.map((l, li) => li === 0 ? `<tspan x="${b.tx.toFixed(0)}">${escX(l)}</tspan>` : `<tspan x="${b.tx.toFixed(0)}" dy="${(fs * 1.15).toFixed(1)}">${escX(l)}</tspan>`).join('')}</text>`;
    }
    return s;
}

/** Render the LABELED, meaningful variant of a family: the vector PLUS model-authored text labels
 *  (data.labels per anchor, data.hub for a network center), collision-safe. `font` is the brand
 *  display/body font the caller supplies (token-sourced). Falls back to the text-free render when
 *  no labels are present. This is the on-slide deliverable variant (#14). */
export function renderVizLabeled(family: string, data: any, w: number, h: number, theme: VizTheme, industry?: string, font?: string): string {
    const vec = renderVizFamily(family, data, w, h, theme, industry);   // sets PAL/INDU
    if (!vec) return '';
    const layer = labelLayer(family, data, w, h, font || 'Archivo, sans-serif');
    if (!layer) return vec;
    return vec.replace('</svg>', `<g class="viz-labels">${layer}</g></svg>`);
}
