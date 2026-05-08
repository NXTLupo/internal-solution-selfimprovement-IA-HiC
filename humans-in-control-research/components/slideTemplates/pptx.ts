/**
 * SLIDE TEMPLATES — PPTX renderers for all 10 NXT Humans templates.
 *
 * Each renderer produces NATIVE editable PowerPoint elements (text boxes,
 * shapes, lines) matching the web preview pixel-for-pixel. No screenshots,
 * no images-of-text. Layout math mirrors the web canvas via PX_TO_IN.
 */

import { TOKENS } from './types';
import { nxtBrand, type Brand } from './brands';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
    ServiceBlueprintData, GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
    SlideTemplate,
} from './types';
import { cleanTranscriptQuote, looksLikeTranscriptSource } from '../../services/transcriptQuoteCleaner';

// Default brand — used unless exportSlideToPPTX is called with an explicit brand.
// Inside this file, every reference to `T` resolves through the active brand
// set at the top of exportSlideToPPTX, so color values swap cleanly per brand.
let T: Brand = nxtBrand;
const FONT = TOKENS.FONT;

// Responsive hero-number sizing identical to web.tsx so PPTX exports never
// overflow their column when the AI emits a long value like "Steady" or "$2.4M".
function heroPt(value: string, max = 56, min = 28, baseChars = 4): number {
    const v = (value || '').trim();
    if (v.length <= baseChars) return max;
    const shrinkPerChar = (max - min) / 14;
    return Math.max(min, Math.min(max, Math.round(max - (v.length - baseChars) * shrinkPerChar)));
}
/** Truncate WITHOUT ever appending an ellipsis. Mirrors web.tsx::truncate.
 *  Looks forward up to 2× max for next sentence end, else backward to last
 *  sentence end, else to last clause boundary (period — not ellipsis), else
 *  drops trailing fragment at last word boundary. */
function truncate(text: string | undefined, max: number): string {
    if (!text) return '';
    const t = text.trim();
    if (t.length <= max) return t;

    const lookAhead = Math.min(t.length, Math.round(max * 2));
    const fwdRest = t.substring(0, lookAhead).substring(max);
    const fwdMatch = fwdRest.search(/[.!?](?:\s|$)/);
    if (fwdMatch >= 0) return t.substring(0, max + fwdMatch + 1).trim();

    const slice = t.substring(0, max);
    let best = -1;
    for (let i = slice.length - 1; i >= 0; i--) {
        const c = slice[i];
        if ((c === '.' || c === '!' || c === '?') && (i === slice.length - 1 || /\s/.test(slice[i + 1]))) {
            best = i + 1;
            break;
        }
    }
    if (best > max * 0.3) return slice.substring(0, best).trim();

    const lastClause = slice.lastIndexOf(', ');
    if (lastClause > max * 0.5) return slice.substring(0, lastClause).trim() + '.';

    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) return slice.substring(0, lastSpace).trim();
    return slice.trim();
}

/** Smart quote truncation — no mid-clause cuts, NO ellipsis. Mirrors web.tsx::smartQuoteClip. */
function smartQuoteClip(text: string, maxChars: number): string {
    if (!text) return '';
    const t = text.trim();
    if (t.length <= maxChars) return t;
    const hardMax = Math.round(maxChars * 1.5);

    const fwdSlice = t.slice(0, Math.min(hardMax, t.length));
    const fwdRest = fwdSlice.substring(maxChars);
    const fwdMatch = fwdRest.search(/[.!?](?:\s|$)/);
    if (fwdMatch >= 0) return t.slice(0, maxChars + fwdMatch + 1).trim();

    const slice = fwdSlice;
    const lastSentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (lastSentence > maxChars * 0.5) return t.slice(0, lastSentence + 1).trim();
    const lastClause = slice.lastIndexOf(', ');
    if (lastClause > maxChars * 0.6) return t.slice(0, lastClause).trim() + '.';
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > 0 ? t.slice(0, lastSpace) : slice).trim();
}

/** Clean a quote object — runs the transcript cleaner for transcript-sourced
 *  quotes, passes others through. Returns null if nothing substantive remains. */
function prepQuote<Q extends { text: string; source?: string; attribution?: string }>(q: Q): Q | null {
    if (!q || !q.text) return null;
    const isTranscript = looksLikeTranscriptSource(q.source) || looksLikeTranscriptSource(q.attribution);
    if (!isTranscript) return q;
    const cleaned = cleanTranscriptQuote(q.text);
    if (!cleaned) return null;
    return { ...q, text: cleaned };
}

/** Extract quote text + source from a theme-like object. Prefers the new
 *  `quotes[]` array (first element) over the legacy singular `evidence`.
 *  Every returned quote runs through prepQuote so transcript disfluencies +
 *  video-intro narration get stripped before rendering. */
function themeQuotes(t: { evidence?: string; source?: string; quotes?: Array<{ text: string; source?: string; attribution?: string; role?: string }> }): Array<{ text: string; source?: string; attribution?: string; role?: string }> {
    const raw: Array<{ text: string; source?: string; attribution?: string; role?: string }> =
        t.quotes && t.quotes.length > 0 ? t.quotes
        : t.evidence ? [{ text: t.evidence, source: t.source }]
        : [];
    return raw.map(prepQuote).filter((q): q is NonNullable<typeof q> => !!(q && q.text));
}

/** Build a speaker attribution string combining attribution + role + source. */
function attributionLine(q: { attribution?: string; role?: string; source?: string; date?: string }): string {
    const parts = [q.attribution, q.role, q.source].filter(Boolean) as string[];
    const head = parts.join(' · ');
    return q.date ? `${head}, ${q.date}` : head;
}

// === IMAGE PREPROCESSOR — guarantees object-fit:cover behavior in PPTX ===
export async function preprocessImageCover(dataUrl: string, targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('canvas ctx missing'));
                const srcRatio = img.naturalWidth / img.naturalHeight;
                const dstRatio = targetW / targetH;
                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                if (srcRatio > dstRatio) {
                    sw = img.naturalHeight * dstRatio;
                    sx = (img.naturalWidth - sw) / 2;
                } else {
                    sh = img.naturalWidth / dstRatio;
                    sy = (img.naturalHeight - sh) / 2;
                }
                ctx.fillStyle = '#0D0D0D';
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
                resolve(canvas.toDataURL('image/jpeg', 0.92));
            } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('image load failed'));
        img.src = dataUrl;
    });
}

// === SHARED CHROME ===
// Returns content panel coordinates after drawing sidebar (and optional image)

export interface PanelGeom {
    contentX: number;
    contentY: number;
    contentW: number;
    contentH: number;
    sideW: number;
    imgW: number;
}

export async function addBaseShell(
    s: any, hasImage: boolean, imageUrl?: string,
): Promise<PanelGeom> {
    const sideW = T.SIDEBAR_W_PX * T.PX_TO_IN; // ~0.889"
    const imgFrac = 0.35;
    const contentArea = T.PPTX_W - sideW;
    const imgW = hasImage ? contentArea * imgFrac : 0;
    const contentX = sideW + imgW;
    const contentW = T.PPTX_W - contentX;

    // Teal sidebar
    s.addShape('rect' as any, { x: 0, y: 0, w: sideW, h: T.PPTX_H, fill: { color: T.TEAL } });
    // 3x3 dot grid bottom of sidebar
    const ds = 0.07, dg = 0.1;
    const dx0 = (sideW - 3 * ds - 2 * dg) / 2;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        s.addShape('ellipse' as any, { x: dx0 + c * (ds + dg), y: 6.85 + r * (ds + dg), w: ds, h: ds, fill: { color: T.CHARTREUSE_BRIGHT } });
    }
    // White content panel background
    s.addShape('rect' as any, { x: contentX, y: 0, w: contentW, h: T.PPTX_H, fill: { color: T.WHITE } });

    // Image panel (if any)
    if (hasImage && imageUrl) {
        s.addShape('rect' as any, { x: sideW, y: 0, w: imgW, h: T.PPTX_H, fill: { color: T.BLACK } });
        try {
            const cropped = await preprocessImageCover(imageUrl, Math.round(imgW * 144), Math.round(T.PPTX_H * 144));
            s.addImage({ data: cropped, x: sideW, y: 0, w: imgW, h: T.PPTX_H });
        } catch (e) {
            try { s.addImage({ data: imageUrl, x: sideW, y: 0, w: imgW, h: T.PPTX_H }); } catch {}
        }
    }
    return { contentX, contentY: 0, contentW, contentH: T.PPTX_H, sideW, imgW };
}

// === MICRO-PRIMITIVES ===

const tag = (s: any, x: number, y: number, w: number, text: string, color = T.CHARTREUSE_BRIGHT) =>
    s.addText(text, { x, y, w, h: 0.2, fontSize: 9, color, fontFace: FONT, bold: true, charSpacing: 4, valign: 'top' });

const title = (s: any, x: number, y: number, w: number, text: string, size = 28) =>
    s.addText(text, { x, y, w, h: Math.max((Math.ceil(text.length / Math.max(Math.floor((w * 72) / (size * 0.52)), 20)) * size * 1.1) / 72 + 0.05, 0.6), fontSize: size, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.05, charSpacing: -2 });

const sourceFooter = (s: any, x: number, w: number, sources?: string[]) => {
    if (!sources || sources.length === 0) return;
    const srcY = 7.10;
    s.addShape('line' as any, { x, y: srcY, w, h: 0, line: { color: T.RULE, width: 0.5 } });
    s.addText(`Sources: ${sources.join('  |  ')}`, { x, y: srcY + 0.05, w, h: 0.22, fontSize: 7, color: T.MUTED, fontFace: FONT, valign: 'top' });
};

// === TEMPLATE EXPORTERS ===

// 1. PERSONA CARD
// Heights are computed from estimated line counts so long quotes don't overflow.
// Content panel budget: 7.0" (0.3" top padding through 7.1" source rule).
async function exportPersona(s: any, slideTitle: string, data: PersonaCardData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    const hasImg = geom.imgW > 0;
    const MAX_Y = 6.95; // hard floor — must not cross the source footer at 7.10"

    // Helper: estimate text height in inches for given text, font size (pt), width, line spacing
    const estH = (text: string, fontPt: number, widthIn: number, lineMul = 1.4) => {
        // Archivo avg char width at size pt ≈ pt * 0.50 points. convert to inches (1in = 72pt).
        const charW = (fontPt * 0.50) / 72;
        const cpl = Math.max(10, Math.floor(widthIn / charW));
        // Manual word-wrap: split on spaces, greedily pack lines
        const words = text.split(/\s+/);
        let lines = 1, cur = 0;
        for (const w of words) {
            if (cur === 0) { cur = w.length; continue; }
            if (cur + 1 + w.length <= cpl) cur += 1 + w.length;
            else { lines++; cur = w.length; }
        }
        return (lines * fontPt * lineMul) / 72 + 0.06;
    };
    // Truncate to fit a max character budget (keeps quote readable but bounded)
    const trunc = (text: string, max: number) => truncate(text, max);

    let y = 0.32;

    s.addText('PERSONA', { x: tx, y, w: tw, h: 0.2, fontSize: 9, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 4 });
    y += 0.24;
    s.addText(data.name, { x: tx, y, w: tw, h: 0.55, fontSize: hasImg ? 26 : 32, color: T.INK, fontFace: FONT, bold: true, valign: 'top', charSpacing: -3 });
    y += 0.58;
    s.addText(data.role + (data.demographics ? `  |  ${data.demographics}` : ''), { x: tx, y, w: tw, h: 0.26, fontSize: 11, color: T.SECONDARY, fontFace: FONT, valign: 'top' });
    y += 0.32;

    // QUOTE — dynamic height
    if (data.quote) {
        const qText = trunc(data.quote, 200);
        const qH = Math.max(0.4, estH(qText, 10, tw - 0.2, 1.4));
        s.addShape('rect' as any, { x: tx, y, w: 0.05, h: qH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(`"${qText}"`, { x: tx + 0.15, y, w: tw - 0.2, h: qH, fontSize: 10, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
        y += qH + 0.08;
    }

    // JTBD — dynamic height with panel
    if (data.jtbd) {
        const jText = trunc(data.jtbd, 220);
        const jH = Math.max(0.38, estH(`JTBD: ${jText}`, 9, tw - 0.3, 1.4));
        s.addShape('rect' as any, { x: tx, y, w: tw, h: jH, fill: { color: T.PANEL } });
        s.addText([
            { text: 'JTBD: ', options: { bold: true, color: T.INK, fontFace: FONT, fontSize: 9 } },
            { text: jText, options: { color: T.INK, fontFace: FONT, fontSize: 9 } },
        ], { x: tx + 0.12, y, w: tw - 0.24, h: jH, valign: 'middle', lineSpacingMultiple: 1.4 });
        y += jH + 0.08;
    }

    // GOALS — compute per-column height from tallest goal, cap at 3 lines
    if (data.goals) {
        const gEntries = Object.entries(data.goals).filter(([, v]) => v) as Array<[string, string]>;
        if (gEntries.length > 0) {
            const gW = (tw - 0.1 * (gEntries.length - 1)) / gEntries.length;
            // Measure tallest box
            let maxBodyH = 0;
            gEntries.forEach(([, v]) => {
                const vTrunc = trunc(v, 140);
                const bh = estH(vTrunc, 8, gW - 0.2, 1.3);
                if (bh > maxBodyH) maxBodyH = bh;
            });
            const gH = Math.min(1.1, Math.max(0.55, maxBodyH + 0.3));
            gEntries.forEach(([k, v], i) => {
                const gx = tx + i * (gW + 0.1);
                const isLife = k === 'lifeGoal';
                const isExp = k === 'experienceGoal';
                const fill = isLife ? T.TEAL : (isExp ? T.CHARTREUSE_PALE : T.PANEL);
                const txtCol = isLife ? T.WHITE : T.INK;
                const labelCol = isLife ? T.CHARTREUSE_BRIGHT : T.SECONDARY;
                s.addShape('rect' as any, { x: gx, y, w: gW, h: gH, fill: { color: fill } });
                s.addText(k.replace('Goal', '').toUpperCase(), { x: gx + 0.1, y: y + 0.06, w: gW - 0.2, h: 0.2, fontSize: 7, color: labelCol, fontFace: FONT, bold: true, charSpacing: 2 });
                s.addText(trunc(v, 140), { x: gx + 0.1, y: y + 0.26, w: gW - 0.2, h: gH - 0.3, fontSize: 8, color: txtCol, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
            });
            y += gH + 0.1;
        }
    }

    // PAIN POINTS & MOTIVATIONS — cap to 2 items each, dynamic heights, stop if overflowing
    const renderItems = (items: Array<{ label: string; quote: string; source: string }>, label: string, color: string) => {
        if (!items || items.length === 0) return;
        if (y + 0.4 > MAX_Y) return; // no room even for header
        s.addText(label, { x: tx, y, w: tw, h: 0.18, fontSize: 8, color, fontFace: FONT, bold: true, charSpacing: 2 });
        y += 0.2;
        const cap = hasImg ? 2 : 3;
        for (let idx = 0; idx < Math.min(items.length, cap); idx++) {
            const it = items[idx];
            const qTrunc = trunc(it.quote, 140);
            const text = `${it.label}: "${qTrunc}" (${it.source})`;
            const itemH = Math.max(0.32, estH(text, 8, tw - 0.18, 1.35));
            if (y + itemH > MAX_Y) return; // stop before overflow
            s.addShape('rect' as any, { x: tx, y, w: 0.03, h: itemH, fill: { color: T.RULE } });
            s.addText([
                { text: `${it.label}: `, options: { bold: true, color: T.INK, fontFace: FONT, fontSize: 8 } },
                { text: `"${qTrunc}" `, options: { color: T.BODY, fontFace: FONT, fontSize: 8 } },
                { text: `(${it.source})`, options: { color: T.MUTED, fontFace: FONT, fontSize: 7 } },
            ], { x: tx + 0.12, y, w: tw - 0.14, h: itemH, valign: 'top', lineSpacingMultiple: 1.35 });
            y += itemH + 0.04;
        }
        y += 0.04;
    };
    renderItems(data.painPoints || [], 'PAIN POINTS', T.RED);
    renderItems(data.motivations || [], 'MOTIVATIONS', T.GREEN);
    sourceFooter(s, tx, tw, sources);
}

// 2. RECOMMENDATION
function exportRecommendation(s: any, slideTitle: string, data: RecommendationData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.42;
    const tw = geom.contentW - 0.84;
    let y = 0.36;

    tag(s, tx, y, tw, 'STRATEGIC RECOMMENDATION');
    y += 0.26;
    title(s, tx, y, tw, slideTitle, 22);
    y += 0.74;

    const hasGrid = !!(data.impactGrid && (data.impactGrid.baseline || data.impactGrid.target || data.impactGrid.timeframe || data.impactGrid.owner));
    const hasMetric = !!data.impactMetric;
    const hasRight = hasGrid || hasMetric;
    const hasEvidence = !!(data.evidence && data.evidence.length > 0);
    const leftW = hasRight ? tw * 0.62 : tw;
    const rightX = tx + leftW + 0.32;
    const rightW = tw - leftW - 0.32;

    // Action title (left, with chartreuse rule)
    s.addShape('rect' as any, { x: tx, y, w: 0.04, h: 0.55, fill: { color: T.CHARTREUSE_BRIGHT } });
    s.addText(data.actionTitle, { x: tx + 0.18, y, w: leftW - 0.18, h: 0.55, fontSize: 15, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.25 });
    y += 0.65;
    if (data.rationale) {
        s.addText(truncate(data.rationale, 360), { x: tx, y, w: leftW, h: 0.7, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.55 });
        y += 0.78;
    }
    // Numbered actions
    const acts = data.supportingActions.slice(0, 5);
    let ay = y;
    acts.forEach((a, i) => {
        s.addText(String(i + 1).padStart(2, '0'), { x: tx, y: ay, w: 0.7, h: 0.4, fontSize: 22, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top' });
        s.addText(a.name, { x: tx + 0.72, y: ay, w: leftW - 0.72, h: 0.22, fontSize: 10.5, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
        s.addText(truncate(a.description, 220), { x: tx + 0.72, y: ay + 0.22, w: leftW - 0.72, h: 0.48, fontSize: 9.5, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
        ay += 0.6;
    });

    // EVIDENCE strip at bottom of left column
    if (hasEvidence) {
        const evY = 5.65;
        s.addShape('line' as any, { x: tx, y: evY - 0.06, w: leftW, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText('EVIDENCE', { x: tx, y: evY, w: leftW, h: 0.2, fontSize: 7.5, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2.5 });
        let ey = evY + 0.24;
        (data.evidence || []).slice(0, 2).map(prepQuote).filter(Boolean).forEach(ev => {
            if (!ev) return;
            s.addShape('rect' as any, { x: tx, y: ey, w: 0.03, h: 0.42, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(ev.text, 180)}"`, { x: tx + 0.12, y: ey, w: leftW - 0.12, h: 0.42, fontSize: 9, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
            const attr = attributionLine(ev);
            if (attr) s.addText(attr, { x: tx + 0.12, y: ey + 0.44, w: leftW - 0.12, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.2 });
            ey += 0.72;
        });
    }

    // RIGHT panel — 4-cell impact grid OR legacy hero number
    if (hasRight) {
        const panelY = 1.4;
        const panelH = 4.6;
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: panelH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: 0.06, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText('PROJECTED IMPACT', { x: rightX + 0.22, y: panelY + 0.32, w: rightW - 0.44, h: 0.22, fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3 });

        if (hasGrid) {
            const gridY = panelY + 0.74;
            const cellW = (rightW - 0.5) / 2;
            const cellH = 1.0;
            const cells = [
                { k: 'BASELINE', v: data.impactGrid?.baseline, color: T.MUTED },
                { k: 'TARGET', v: data.impactGrid?.target, color: T.TEAL },
                { k: 'TIMEFRAME', v: data.impactGrid?.timeframe, color: T.CYAN },
                { k: 'OWNER', v: data.impactGrid?.owner, color: T.CHARTREUSE_BRIGHT },
            ];
            cells.forEach((c, i) => {
                const cx = rightX + 0.22 + (i % 2) * (cellW + 0.12);
                const cy = gridY + Math.floor(i / 2) * (cellH + 0.12);
                s.addText(c.k, { x: cx, y: cy, w: cellW, h: 0.2, fontSize: 7, color: c.color, fontFace: FONT, bold: true, charSpacing: 2 });
                s.addText(c.v ? truncate(c.v, 60) : '—', { x: cx, y: cy + 0.24, w: cellW, h: cellH - 0.3, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.3 });
            });
            // Optional hero number below grid
            if (data.impactMetric) {
                const mY = panelY + panelH - 1.0;
                s.addShape('line' as any, { x: rightX + 0.22, y: mY - 0.05, w: rightW - 0.44, h: 0, line: { color: T.RULE, width: 0.5 } });
                const fs = heroPt(data.impactMetric.value, 32, 18, 4);
                s.addText(data.impactMetric.value, { x: rightX + 0.22, y: mY, w: rightW - 0.44, h: 0.5, fontSize: fs, color: T.TEAL, fontFace: FONT, valign: 'top', charSpacing: -2 });
                s.addText(truncate(data.impactMetric.label, 80), { x: rightX + 0.22, y: mY + 0.54, w: rightW - 0.44, h: 0.38, fontSize: 9, color: T.SECONDARY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
            }
        } else if (data.impactMetric) {
            const fs = heroPt(data.impactMetric.value, 56, 26, 4);
            s.addText(data.impactMetric.value, { x: rightX + 0.22, y: panelY + 0.74, w: rightW - 0.44, h: 1.3, fontSize: fs, color: T.TEAL, fontFace: FONT, valign: 'top', charSpacing: -3 });
            s.addText(truncate(data.impactMetric.label, 100), { x: rightX + 0.22, y: panelY + 2.2, w: rightW - 0.44, h: 1.0, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        }
    }

    // IMPLICATION footer
    if (data.implication) {
        s.addShape('line' as any, { x: tx, y: 6.62, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText('IMPLICATION', { x: tx, y: 6.7, w: 1.2, h: 0.2, fontSize: 7.5, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(data.implication, 260), { x: tx + 1.24, y: 6.7, w: tw - 1.24, h: 0.4, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.45 });
    }

    sourceFooter(s, tx, tw, sources);
}

// 3. THEME CLUSTER
function exportThemeCluster(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, 'EMERGING THEMES');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 26);
    y += 0.85;

    const themes = data.themes.slice(0, 4);
    const colW = (tw - 0.04 * (themes.length - 1)) / themes.length;
    const blockY = y + 0.05;
    const blockH = 7.05 - blockY - 0.45;

    s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });

    themes.forEach((th, i) => {
        const cx = tx + i * (colW + 0.04);
        if (i > 0) s.addShape('line' as any, { x: cx - 0.02, y: blockY, w: 0, h: blockH, line: { color: T.RULE, width: 0.5 } });
        let cy = blockY + 0.1;
        s.addText(String(i + 1).padStart(2, '0'), { x: cx + 0.08, y: cy, w: colW - 0.16, h: 0.5, fontSize: 32, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -3 });
        cy += 0.55;
        s.addText(th.name, { x: cx + 0.08, y: cy, w: colW - 0.16, h: 0.4, fontSize: 12, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        cy += 0.5;
        s.addText(th.insight, { x: cx + 0.08, y: cy, w: colW - 0.16, h: 1.4, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        cy += 1.45;
        const clusterQs = themeQuotes(th);
        if (clusterQs.length > 0) {
            s.addShape('rect' as any, { x: cx + 0.08, y: cy, w: 0.03, h: 0.7, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${truncate(clusterQs[0].text, 140)}"`, { x: cx + 0.16, y: cy, w: colW - 0.24, h: 0.7, fontSize: 9, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
            cy += 0.75;
        }
        s.addText(th.source, { x: cx + 0.08, y: blockY + blockH - 0.22, w: colW - 0.16, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top' });
    });
    sourceFooter(s, tx, tw, sources);
}

// 3a. THEME SPOTLIGHT (hero + supporting tiles) — v3.2 DENSIFIED
function exportThemeSpotlight(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.4;
    const tw = geom.contentW - 0.8;
    let y = 0.34;
    tag(s, tx, y, tw, 'EMERGING THEME — SPOTLIGHT');
    y += 0.26;
    title(s, tx, y, tw, slideTitle, 20);
    y += 0.72;

    const all = data.themes.slice(0, 4);
    const hero = all[0];
    const supporting = all.slice(1, 4);
    if (!hero) { sourceFooter(s, tx, tw, sources); return; }

    const heroW = tw * 0.6 - 0.2;
    const supW = tw * 0.4 - 0.2;
    const supX = tx + heroW + 0.4;
    const blockH = 7.5 - y - 0.55;

    // Divider
    s.addShape('line' as any, { x: tx + heroW + 0.2, y, w: 0, h: blockH, line: { color: T.RULE, width: 0.5 } });

    // Hero number 01 + name
    s.addText('01', { x: tx, y, w: 0.95, h: 0.8, fontSize: 54, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -3 });
    s.addText(truncate(hero.name, 90), { x: tx + 1.0, y: y + 0.18, w: heroW - 1.0, h: 0.6, fontSize: 15, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.15 });
    let hy = y + 0.88;
    // Insight (expanded)
    s.addText(truncate(hero.insight, 420), { x: tx, y: hy, w: heroW, h: 1.6, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.55 });
    hy += 1.7;
    // Hero quote — smart-clipped, transcript-cleaned
    const heroQs = themeQuotes(hero);
    if (heroQs.length > 0) {
        const heroQuoteText = smartQuoteClip(heroQs[0].text, 280);
        s.addShape('rect' as any, { x: tx, y: hy, w: 0.04, h: 1.0, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(`"${heroQuoteText}"`, { x: tx + 0.14, y: hy, w: heroW - 0.14, h: 1.05, fontSize: 11, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.5 });
        const heroAttr = attributionLine(heroQs[0]);
        if (heroAttr) s.addText(heroAttr, { x: tx + 0.14, y: hy + 1.08, w: heroW - 0.14, h: 0.22, fontSize: 8, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.2 });
        hy += 1.4;
    }
    // PATTERN SIGNAL callout
    if (data.patternSignal) {
        s.addShape('rect' as any, { x: tx, y: hy, w: heroW, h: 0.6, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: hy, w: 0.04, h: 0.6, fill: { color: T.CYAN } });
        s.addText('PATTERN SIGNAL', { x: tx + 0.14, y: hy + 0.06, w: heroW - 0.28, h: 0.2, fontSize: 7.5, color: T.CYAN, fontFace: FONT, bold: true, charSpacing: 2.5 });
        s.addText(truncate(data.patternSignal, 260), { x: tx + 0.14, y: hy + 0.26, w: heroW - 0.28, h: 0.34, fontSize: 9, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
        hy += 0.7;
    }
    // IMPLICATION line (hero)
    if (hero.implication) {
        s.addText('IMPLICATION', { x: tx, y: y + blockH - 0.54, w: 1.2, h: 0.2, fontSize: 7.5, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(hero.implication, 220), { x: tx + 1.24, y: y + blockH - 0.54, w: heroW - 1.24, h: 0.4, fontSize: 9, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.4 });
    } else {
        s.addText(`Source: ${truncate(hero.source, 80)}`, { x: tx, y: y + blockH - 0.26, w: heroW, h: 0.2, fontSize: 7.5, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5 });
    }

    // Supporting signals — 2-sentence insight + SIGNAL metric per tile
    s.addText('SUPPORTING SIGNALS', { x: supX, y, w: supW, h: 0.22, fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2.5 });
    let sy = y + 0.32;
    const supItemH = (blockH - 0.32) / Math.max(supporting.length, 1);
    supporting.forEach((t, i) => {
        const itemY = sy + i * supItemH;
        const supQs = themeQuotes(t);
        s.addText(String(i + 2).padStart(2, '0'), { x: supX, y: itemY, w: 0.5, h: 0.4, fontSize: 18, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -1 });
        s.addText(truncate(t.name, 80), { x: supX + 0.55, y: itemY, w: supW - 0.55, h: 0.3, fontSize: 10.5, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        s.addText(truncate(t.insight, 220), { x: supX + 0.55, y: itemY + 0.32, w: supW - 0.55, h: 0.6, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
        if (supQs.length > 0) {
            s.addShape('rect' as any, { x: supX + 0.55, y: itemY + 0.94, w: 0.03, h: 0.45, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(supQs[0].text, 160)}"`, { x: supX + 0.63, y: itemY + 0.94, w: supW - 0.63, h: 0.45, fontSize: 8, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
        }
        // SIGNAL metric tag
        if (t.signal) {
            s.addText(`SIGNAL · ${truncate(t.signal, 60)}`, { x: supX + 0.55, y: itemY + supItemH - 0.28, w: supW - 0.55, h: 0.2, fontSize: 7, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 1.2 });
        } else {
            s.addText(truncate(t.source, 50), { x: supX + 0.55, y: itemY + supItemH - 0.22, w: supW - 0.55, h: 0.18, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true });
        }
        if (i < supporting.length - 1) {
            s.addShape('line' as any, { x: supX, y: itemY + supItemH - 0.06, w: supW, h: 0, line: { color: T.RULE, width: 0.5 } });
        }
    });
    sourceFooter(s, tx, tw, sources);
}

// 3b. THEME ARC (numbered chain with progression connectors) — v3.2 DENSIFIED
function exportThemeArc(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.44;
    const tw = geom.contentW - 0.88;
    let y = 0.36;
    tag(s, tx, y, tw, 'THEMATIC ARC');
    y += 0.24;
    title(s, tx, y, tw, slideTitle, 20);
    y += 0.72;

    const themes = data.themes.slice(0, 4);
    const n = themes.length;
    if (n === 0) { sourceFooter(s, tx, tw, sources); return; }

    const arrowW = 0.36;
    const totalArrows = arrowW * Math.max(n - 1, 0);
    const cellW = (tw - totalArrows) / n;

    // Numbered chain row
    themes.forEach((_, i) => {
        const cx = tx + i * (cellW + arrowW);
        s.addText(String(i + 1).padStart(2, '0'), { x: cx, y, w: cellW, h: 0.6, fontSize: 36, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, align: 'center', valign: 'top', charSpacing: -2 });
        if (i < n - 1) {
            const ax = cx + cellW;
            const ay = y + 0.28;
            s.addShape('line' as any, { x: ax + 0.04, y: ay, w: arrowW - 0.12, h: 0, line: { color: T.INK, width: 0.75, endArrowType: 'triangle' as any } });
        }
    });

    // Body row — expanded insight, SIGNAL tag per step
    const bodyY = y + 0.75;
    const patternFooterH = data.patternSignal ? 0.7 : 0;
    const bodyH = 7.5 - bodyY - 0.52 - patternFooterH;
    themes.forEach((t, i) => {
        const cx = tx + i * (cellW + arrowW);
        let cy = bodyY;
        s.addText(truncate(t.name, 70), { x: cx + 0.06, y: cy, w: cellW - 0.12, h: 0.4, fontSize: 11.5, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        cy += 0.46;
        // Expanded 2-3 sentence insight
        s.addText(truncate(t.insight, 280), { x: cx + 0.06, y: cy, w: cellW - 0.12, h: 1.7, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        cy += 1.75;
        const arcQs = themeQuotes(t);
        if (arcQs.length > 0) {
            s.addShape('rect' as any, { x: cx + 0.06, y: cy, w: 0.03, h: 0.7, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(arcQs[0].text, 140)}"`, { x: cx + 0.13, y: cy, w: cellW - 0.18, h: 0.7, fontSize: 8.5, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
        }
        // SIGNAL metric tag — concrete proof the step is real
        const footerY = bodyY + bodyH - 0.22;
        if (t.signal) {
            s.addShape('line' as any, { x: cx + 0.06, y: footerY - 0.06, w: cellW - 0.12, h: 0, line: { color: T.RULE, width: 0.5 } });
            s.addText(`SIGNAL · ${truncate(t.signal, 54)}`, { x: cx + 0.06, y: footerY, w: cellW - 0.12, h: 0.2, fontSize: 7, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 1.2 });
        } else {
            s.addText(truncate(t.source, 50), { x: cx + 0.06, y: footerY, w: cellW - 0.12, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true });
        }
        if (i < n - 1) {
            s.addShape('line' as any, { x: cx + cellW + arrowW / 2, y: bodyY + 0.08, w: 0, h: bodyH - 0.18, line: { color: T.RULE, width: 0.5 } });
        }
    });

    // Optional cross-step PATTERN footer
    if (data.patternSignal) {
        const pfY = 7.5 - 0.52 - patternFooterH;
        s.addShape('rect' as any, { x: tx, y: pfY, w: tw, h: 0.58, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: pfY, w: 0.04, h: 0.58, fill: { color: T.CYAN } });
        s.addText('PATTERN', { x: tx + 0.14, y: pfY + 0.08, w: 0.8, h: 0.2, fontSize: 7.5, color: T.CYAN, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(data.patternSignal, 240), { x: tx + 0.95, y: pfY + 0.08, w: tw - 1.05, h: 0.42, fontSize: 9, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 3c. THEME MOSAIC (2x2 grid) — v3.2 REDESIGNED
// Killed the B&W inverse-checkerboard. All 4 cells sit on a uniform ivory
// (PALE) surface, separated by hairline rules, with a single chartreuse
// accent bar on the PRIMARY cell (index 0). Order intentionally.
function exportThemeMosaic(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    tag(s, tx, y, tw, 'THEMATIC MOSAIC');
    y += 0.22;
    title(s, tx, y, tw, slideTitle, 20);
    y += 0.68;

    const themes = data.themes.slice(0, 4);
    while (themes.length < 4) themes.push({ name: '', insight: '', evidence: '', source: '' });

    const patternFooterH = data.patternSignal ? 0.58 : 0;
    const gridH = 7.5 - y - 0.48 - patternFooterH - (patternFooterH ? 0.08 : 0);
    const cellW = tw / 2;
    const cellH = gridH / 2;

    // Outer ivory panel
    s.addShape('rect' as any, { x: tx, y, w: tw, h: gridH, fill: { color: T.PALE } });
    // Hairline rules (one vertical + one horizontal split)
    s.addShape('line' as any, { x: tx + cellW, y, w: 0, h: gridH, line: { color: T.RULE, width: 0.5 } });
    s.addShape('line' as any, { x: tx, y: y + cellH, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });

    themes.forEach((t, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = tx + col * cellW;
        const cy = y + row * cellH;

        if (!t.name) return;

        const isPrimary = i === 0;
        if (isPrimary) {
            // Chartreuse accent bar on top of primary cell
            s.addShape('rect' as any, { x: cx, y: cy, w: cellW, h: 0.05, fill: { color: T.CHARTREUSE_BRIGHT } });
        }

        const pad = 0.2;
        const innerY = cy + (isPrimary ? 0.18 : 0.14);
        s.addText(String(i + 1).padStart(2, '0'), { x: cx + pad, y: innerY, w: 0.6, h: 0.5, fontSize: 28, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -2 });
        s.addText(truncate(t.name, 80), { x: cx + 0.85, y: innerY + 0.08, w: cellW - pad * 2 - 0.7, h: 0.4, fontSize: 12, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        // Expanded 2-sentence insight (was 1 sentence)
        s.addText(truncate(t.insight, 240), { x: cx + pad, y: innerY + 0.62, w: cellW - pad * 2, h: 1.0, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        const mosaicQs = themeQuotes(t);
        if (mosaicQs.length > 0) {
            const qY = innerY + 1.66;
            s.addShape('rect' as any, { x: cx + pad, y: qY, w: 0.03, h: 0.5, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(mosaicQs[0].text, 140)}"`, { x: cx + pad + 0.1, y: qY, w: cellW - pad * 2 - 0.12, h: 0.55, fontSize: 8.5, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
        }
        // SIGNAL metric tag or source
        const footerY = cy + cellH - 0.24;
        if (t.signal) {
            s.addText(`SIGNAL · ${truncate(t.signal, 52)}`, { x: cx + pad, y: footerY, w: cellW - pad * 2, h: 0.2, fontSize: 7, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 1.2 });
        } else {
            s.addText(truncate(t.source, 50), { x: cx + pad, y: footerY, w: cellW - pad * 2, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.2 });
        }
    });

    // Optional cluster PATTERN footer
    if (data.patternSignal) {
        const pfY = y + gridH + 0.08;
        s.addShape('rect' as any, { x: tx, y: pfY, w: tw, h: 0.5, fill: { color: T.WHITE } });
        s.addShape('rect' as any, { x: tx, y: pfY, w: 0.04, h: 0.5, fill: { color: T.CYAN } });
        s.addText('PATTERN', { x: tx + 0.14, y: pfY + 0.06, w: 0.8, h: 0.2, fontSize: 7.5, color: T.CYAN, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(data.patternSignal, 240), { x: tx + 0.95, y: pfY + 0.06, w: tw - 1.05, h: 0.38, fontSize: 9, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 4. COMPETITIVE MATRIX (enriched: column definitions, per-row evidence, delta, scale legend, subject row highlight)
function exportCompetitiveMatrix(s: any, slideTitle: string, data: CompetitiveMatrixData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.36;
    const tw = geom.contentW - 0.72;
    let y = 0.32;
    tag(s, tx, y, tw, 'COMPETITIVE LANDSCAPE');
    y += 0.24;
    title(s, tx, y, tw, slideTitle, 22);
    y += 0.82;

    const max = data.scaleMax || 5;
    const rows = data.rows.slice(0, 7);
    const subjectLower = (data.subjectRow || '').toLowerCase();
    const nameColW = tw * 0.25;
    const dataW = tw - nameColW;
    const colW = dataW / data.columns.length;
    const hasColDefs = !!(data.columnDefs && data.columnDefs.length === data.columns.length);
    const headerH = hasColDefs ? 0.7 : 0.45;
    const rowH = 0.55;

    // Compute best per column for delta indicator
    const bestPerCol = data.columns.map((_, ci) => Math.max(...rows.map(r => r.scores[ci] || 0)));

    // Header
    s.addShape('rect' as any, { x: tx, y, w: tw, h: headerH, fill: { color: T.TEAL } });
    s.addText('INSTITUTION', { x: tx + 0.12, y, w: nameColW - 0.12, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle' });
    data.columns.forEach((c, i) => {
        const cx = tx + nameColW + i * colW;
        s.addText(truncate(c, 40), { x: cx + 0.06, y: y + 0.06, w: colW - 0.12, h: 0.28, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, align: 'center', valign: 'top', charSpacing: 1 });
        if (hasColDefs) {
            s.addText(truncate(data.columnDefs![i], 60), { x: cx + 0.06, y: y + 0.34, w: colW - 0.12, h: headerH - 0.38, fontSize: 7, color: 'E8EDEE', fontFace: FONT, align: 'center', valign: 'top', lineSpacingMultiple: 1.3 });
        }
    });
    y += headerH;

    // Data rows
    rows.forEach((row, ri) => {
        const isSubject = subjectLower && row.name.toLowerCase().includes(subjectLower);
        const bg = isSubject ? T.CHARTREUSE_PALE : (ri % 2 === 0 ? T.WHITE : T.PALE);
        s.addShape('rect' as any, { x: tx, y, w: tw, h: rowH, fill: { color: bg } });
        s.addShape('line' as any, { x: tx, y: y + rowH, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        // Name + evidence note
        s.addText(truncate(row.name, 48), { x: tx + 0.12, y: y + 0.06, w: nameColW - 0.18, h: 0.24, fontSize: 11, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        if (row.note) s.addText(truncate(row.note, 110), { x: tx + 0.12, y: y + 0.28, w: nameColW - 0.18, h: rowH - 0.3, fontSize: 8, color: T.MUTED, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });

        row.scores.forEach((sc, si) => {
            const cellX = tx + nameColW + si * colW;
            const dotSize = 0.1;
            const dotGap = 0.04;
            const totalW = max * dotSize + (max - 1) * dotGap;
            const startX = cellX + (colW - totalW) / 2;
            const dotY = y + 0.11;
            for (let di = 0; di < max; di++) {
                s.addShape('rect' as any, { x: startX + di * (dotSize + dotGap), y: dotY, w: dotSize, h: dotSize, fill: { color: di < sc ? T.CHARTREUSE_BRIGHT : T.RULE } });
            }
            // Score + delta vs best
            const delta = bestPerCol[si] - sc;
            const txt = `${sc}/${max}${delta > 0 ? `  · -${delta}` : ''}`;
            const txtColor = sc === bestPerCol[si] ? T.GREEN : delta >= 2 ? T.RUST : T.MUTED;
            s.addText(txt, { x: cellX, y: y + 0.26, w: colW, h: 0.22, fontSize: 8, color: txtColor, fontFace: FONT, bold: true, align: 'center' });
        });
        y += rowH;
    });

    // Scale legend
    if (data.scaleLabels && data.scaleLabels.length === max) {
        y += 0.08;
        s.addText('SCALE', { x: tx, y, w: nameColW - 0.12, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 2 });
        const segW = dataW / max;
        data.scaleLabels.forEach((lbl, i) => {
            s.addText(`L${i + 1}  ${truncate(lbl, 16)}`, { x: tx + nameColW + i * segW, y, w: segW, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1, align: 'center' });
        });
        y += 0.24;
    }

    // Insight
    if (data.insight) {
        y += 0.08;
        const insH = 0.55;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: insH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: insH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(truncate(data.insight, 280), { x: tx + 0.24, y, w: tw - 0.36, h: insH, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 5. BLOCK QUOTE
function exportBlockQuote(s: any, slideTitle: string, data: BlockQuoteData, sources: string[], geom: PanelGeom) {
    const hasSidebar = !!(data.corroboratingData && data.corroboratingData.length > 0);
    const tx = geom.contentX + 0.56;
    const tw = geom.contentW - 1.12;
    const leftW = hasSidebar ? tw * 0.62 : tw;
    const rightX = tx + leftW + 0.32;
    const rightW = tw - leftW - 0.32;

    // Quote glyph top-left
    s.addText('"', { x: tx - 0.06, y: 0.12, w: 1.2, h: 1.3, fontSize: 110, color: T.CHARTREUSE_BRIGHT, fontFace: 'Georgia', bold: true, valign: 'top' });

    let y = 0.82;
    if (data.context) {
        s.addText(truncate(data.context, 90), { x: tx + 0.5, y, w: leftW - 0.5, h: 0.25, fontSize: 9, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3, valign: 'top' });
        y += 0.3;
    }
    // Quote text — smart-clipped, transcript-cleaned
    const qLen = (data.text || '').length;
    const quoteText = smartQuoteClip(data.text, hasSidebar ? 460 : 520);
    const quoteFs = hasSidebar
        ? (qLen > 340 ? 15 : qLen > 220 ? 18 : qLen > 140 ? 20 : 22)
        : (qLen > 280 ? 18 : qLen > 180 ? 22 : qLen > 110 ? 26 : 28);
    s.addText(quoteText, { x: tx, y, w: leftW, h: 2.6, fontSize: quoteFs, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4, charSpacing: -1 });
    y += 2.7;

    // CONTEXT paragraph — 3-4 sentences of who/when/why
    if (data.contextParagraph) {
        s.addShape('line' as any, { x: tx, y, w: 0.03, h: 1.0, fill: { color: T.RULE }, line: { color: T.RULE, width: 0.5 } });
        s.addText(truncate(data.contextParagraph, 480), { x: tx + 0.16, y, w: leftW - 0.16, h: 1.2, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.55 });
        y += 1.25;
    }

    // Attribution
    const attY = Math.max(y + 0.1, 5.4);
    s.addShape('line' as any, { x: tx, y: attY + 0.16, w: 0.5, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1.2 } });
    s.addText(data.attribution, { x: tx + 0.62, y: attY, w: leftW - 0.62, h: 0.3, fontSize: 12, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
    if (data.role) {
        s.addText(data.role, { x: tx + 0.62, y: attY + 0.28, w: leftW - 0.62, h: 0.24, fontSize: 10, color: T.SECONDARY, fontFace: FONT, valign: 'top' });
    }

    // CORROBORATING DATA sidebar — 2-3 supporting stats from OTHER sources
    if (hasSidebar) {
        const panelY = 0.82;
        const panelH = 5.4;
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: panelH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: 0.06, fill: { color: T.CYAN } });
        s.addText('CORROBORATING DATA', { x: rightX + 0.2, y: panelY + 0.22, w: rightW - 0.4, h: 0.22, fontSize: 8, color: T.CYAN, fontFace: FONT, bold: true, charSpacing: 2.5 });
        let cy = panelY + 0.6;
        (data.corroboratingData || []).slice(0, 3).forEach((d, i) => {
            if (i > 0) {
                s.addShape('line' as any, { x: rightX + 0.2, y: cy - 0.08, w: rightW - 0.4, h: 0, line: { color: T.RULE, width: 0.5 } });
            }
            const fs = heroPt(d.value, 28, 18, 4);
            s.addText(d.value, { x: rightX + 0.2, y: cy, w: rightW - 0.4, h: 0.55, fontSize: fs, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -2 });
            s.addText(truncate(d.label, 100), { x: rightX + 0.2, y: cy + 0.56, w: rightW - 0.4, h: 0.5, fontSize: 9.5, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.4 });
            if (d.source) {
                s.addText(truncate(d.source, 40), { x: rightX + 0.2, y: cy + 1.02, w: rightW - 0.4, h: 0.2, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.2 });
            }
            cy += 1.35;
        });
    }

    // IMPLICATION line
    if (data.implication) {
        s.addText('IMPLICATION', { x: tx, y: 6.5, w: 1.2, h: 0.2, fontSize: 7.5, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(data.implication, 260), { x: tx + 1.24, y: 6.5, w: tw - 1.24, h: 0.4, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.45 });
    }

    // Source footer (deduplicated — data.source + any other sources not equal to it)
    const srcY = 7.0;
    s.addShape('line' as any, { x: tx, y: srcY, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
    const uniqueOtherSources = sources.filter(s => s !== data.source);
    const srcLine = `Source: ${data.source}` + (uniqueOtherSources.length > 0 ? `  |  ${uniqueOtherSources.join('  |  ')}` : '');
    s.addText(srcLine, { x: tx, y: srcY + 0.05, w: tw, h: 0.22, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top' });
}

// 6. CASE STUDY (enriched with subjectMeta / timeframe / investment / supportingMetrics / pullQuote)
function exportCaseStudy(s: any, slideTitle: string, data: CaseStudyData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.36;
    const tw = geom.contentW - 0.72;
    let y = 0.32;
    tag(s, tx, y, tw, `CASE STUDY  /  ${data.subject.toUpperCase()}`);
    y += 0.24;
    title(s, tx, y, tw, slideTitle, 22);
    y += 0.75;

    // Subject meta strip
    const metaParts: string[] = [];
    if (data.subjectMeta) metaParts.push(data.subjectMeta);
    if (data.timeframe) metaParts.push(`TIMEFRAME  ${data.timeframe}`);
    if (data.investment) metaParts.push(`INVESTMENT  ${data.investment}`);
    if (metaParts.length > 0) {
        s.addShape('line' as any, { x: tx, y: y + 0.24, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(metaParts.join('      '), { x: tx, y, w: tw, h: 0.24, fontSize: 9, color: T.SECONDARY, fontFace: FONT, valign: 'top' });
        y += 0.34;
    }

    const hasRight = !!(data.keyMetric || data.supportingMetrics?.length || data.pullQuote);
    const leftW = hasRight ? tw * 0.63 : tw;
    const rightX = tx + leftW + 0.24;
    const rightW = tw - leftW - 0.24;

    // === LEFT: three colored blocks + LESSON footer row ===
    const blocks: Array<{ label: string; text: string; color: string; bg: string }> = [
        { label: 'CHALLENGE', text: data.challenge, color: T.RED, bg: 'FFF5F5' },
        { label: 'APPROACH', text: data.approach, color: T.CYAN, bg: 'F0FBFC' },
        { label: 'OUTCOME', text: data.outcome, color: T.GREEN, bg: 'F0FBF5' },
    ];
    const leftBottom = 7.05;
    const hasLesson = !!data.lesson;
    const lessonH = hasLesson ? 0.75 : 0;
    const blockArea = leftBottom - y - 0.3 - lessonH;
    const blockH = Math.min(1.3, blockArea / 3 - 0.06);
    let by = y;
    blocks.forEach(b => {
        s.addShape('rect' as any, { x: tx, y: by, w: leftW, h: blockH, fill: { color: b.bg } });
        s.addShape('rect' as any, { x: tx, y: by, w: 0.06, h: blockH, fill: { color: b.color } });
        s.addText(b.label, { x: tx + 0.18, y: by + 0.08, w: 1.0, h: 0.22, fontSize: 9, color: b.color, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(b.text, 340), { x: tx + 1.2, y: by + 0.06, w: leftW - 1.35, h: blockH - 0.1, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        by += blockH + 0.06;
    });

    // LESSON FOR ADVANCEMENT — footer row synthesizing the takeaway
    if (hasLesson) {
        s.addShape('rect' as any, { x: tx, y: by, w: leftW, h: lessonH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: by, w: 0.06, h: lessonH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText('LESSON', { x: tx + 0.18, y: by + 0.08, w: 1.0, h: 0.22, fontSize: 9, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(truncate(data.lesson, 280), { x: tx + 1.2, y: by + 0.06, w: leftW - 1.35, h: lessonH - 0.1, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.45 });
    }

    // === RIGHT: dashboard ===
    if (hasRight) {
        const panelY = y;
        const panelH = leftBottom - y - 0.25;
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: panelH, fill: { color: T.TEAL } });

        let ry = panelY + 0.32;
        // Hero metric
        if (data.keyMetric) {
            const fs = heroPt(data.keyMetric.value, 50, 24, 4);
            s.addText('KEY OUTCOME', { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.22, fontSize: 8, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 3 });
            ry += 0.28;
            s.addText(data.keyMetric.value, { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 1.05, fontSize: fs, color: T.WHITE, fontFace: FONT, valign: 'top', charSpacing: -3 });
            ry += 1.0;
            s.addText(truncate(data.keyMetric.label, 90), { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.55, fontSize: 10, color: 'F0F0F0', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
            ry += 0.62;
        }
        // Supporting metrics (2-col grid)
        if (data.supportingMetrics && data.supportingMetrics.length > 0) {
            const sms = data.supportingMetrics.slice(0, 4);
            const cols = sms.length > 1 ? 2 : 1;
            const gapIn = 0.12;
            const cellW = (rightW - 0.44 - (cols - 1) * gapIn) / cols;
            const cellH = 0.55;
            s.addShape('line' as any, { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0, line: { color: 'FFFFFF', width: 0.5, transparency: 85 } });
            ry += 0.1;
            sms.forEach((m, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = rightX + 0.22 + col * (cellW + gapIn);
                const cy = ry + row * (cellH + 0.1);
                const sz = heroPt(m.value, 22, 14, 3);
                s.addText(m.value, { x: cx, y: cy, w: cellW, h: 0.3, fontSize: sz, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -2 });
                s.addText(truncate(m.label, 50), { x: cx, y: cy + 0.26, w: cellW, h: 0.28, fontSize: 8, color: 'F0F0F0', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
            });
            ry += Math.ceil(sms.length / cols) * (cellH + 0.1) + 0.1;
        }
        // COMPARABLES strip — 2-3 peer orgs
        if (data.comparables && data.comparables.length > 0) {
            s.addShape('line' as any, { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0, line: { color: 'FFFFFF', width: 0.5, transparency: 85 } });
            ry += 0.08;
            s.addText('COMPARABLES', { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.18, fontSize: 7.5, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
            ry += 0.22;
            data.comparables.slice(0, 3).forEach((c, i) => {
                s.addText(truncate(c.name, 48), { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.2, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.25 });
                s.addText(truncate(c.outcome, 80), { x: rightX + 0.22, y: ry + 0.22, w: rightW - 0.44, h: 0.32, fontSize: 8, color: 'C8D4D5', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
                ry += 0.58;
                if (i < Math.min(data.comparables!.length, 3) - 1) {
                    s.addShape('line' as any, { x: rightX + 0.22, y: ry - 0.04, w: rightW - 0.44, h: 0, line: { color: 'FFFFFF', width: 0.3, transparency: 90 } });
                }
            });
        }
        // Pull quote pinned near bottom — role included when available
        if (data.pullQuote) {
            const qy = panelY + panelH - 0.82;
            s.addShape('line' as any, { x: rightX + 0.22, y: qy - 0.08, w: rightW - 0.44, h: 0, line: { color: 'FFFFFF', width: 0.5, transparency: 85 } });
            s.addShape('rect' as any, { x: rightX + 0.22, y: qy, w: 0.04, h: 0.4, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(data.pullQuote.text, 200)}"`, { x: rightX + 0.32, y: qy, w: rightW - 0.54, h: 0.45, fontSize: 9, color: 'F0F0F0', fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
            const pqAttr = `— ${data.pullQuote.attribution}${data.pullQuote.role ? `, ${data.pullQuote.role}` : ''}`;
            s.addText(truncate(pqAttr, 110), { x: rightX + 0.32, y: qy + 0.48, w: rightW - 0.54, h: 0.3, fontSize: 8, color: 'B0C4C5', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        }
    }
    sourceFooter(s, tx, tw, sources);
}

// 7. PRINCIPLES
function exportPrinciples(s: any, slideTitle: string, data: PrinciplesData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.56;
    const tw = geom.contentW - 1.12;
    let y = 0.4;
    tag(s, tx, y, tw, 'GUIDING PRINCIPLES');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 26);
    y += 0.85;

    const items = data.items.slice(0, 5);
    const totalH = 7.05 - y - 0.45;
    const itemH = totalH / items.length;
    items.forEach((p, i) => {
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(String(i + 1).padStart(2, '0'), { x: tx, y: y + 0.16, w: 0.85, h: 0.6, fontSize: 36, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -3 });
        s.addText(p.name, { x: tx + 0.95, y: y + 0.18, w: tw - 0.95, h: 0.3, fontSize: 14, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
        s.addText(p.description, { x: tx + 0.95, y: y + 0.5, w: tw - 0.95, h: itemH - 0.55, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        y += itemH;
    });
    sourceFooter(s, tx, tw, sources);
}

// 8. STAT ROW
function exportStatRow(s: any, slideTitle: string, data: StatRowData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.42;
    const tw = geom.contentW - 0.84;
    let y = 0.36;
    tag(s, tx, y, tw, 'BY THE NUMBERS');
    y += 0.24;
    title(s, tx, y, tw, slideTitle, 22);
    y += 0.74;

    const stats = data.stats.slice(0, 4);
    const accents = [T.CHARTREUSE_BRIGHT, T.CYAN, T.RUST, T.TEAL];
    const colW = tw / stats.length;

    const hasConvergent = !!data.convergentInsight;
    const convergentH = hasConvergent ? (data.patternSignal ? 1.35 : 0.95) : 0;
    const statBlockH = 7.5 - y - 0.52 - convergentH - (hasConvergent ? 0.12 : 0);

    stats.forEach((st, i) => {
        const cx = tx + i * colW;
        if (i > 0) s.addShape('line' as any, { x: cx, y, w: 0, h: statBlockH, line: { color: T.RULE, width: 0.5 } });
        const fs = heroPt(st.value, 50, 24, 4);
        let ly = y + 0.1;
        s.addText(st.value, { x: cx + 0.22, y: ly, w: colW - 0.32, h: 1.1, fontSize: fs, color: accents[i % accents.length], fontFace: FONT, valign: 'top', charSpacing: -3 });
        ly += 1.15;
        s.addText(truncate(st.label, 100), { x: cx + 0.22, y: ly, w: colW - 0.32, h: 0.5, fontSize: 10.5, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.35 });
        ly += 0.54;
        // MEANS line
        if (st.meaning) {
            s.addShape('line' as any, { x: cx + 0.22, y: ly, w: colW - 0.32, h: 0, line: { color: T.RULE, width: 0.3 } });
            ly += 0.05;
            s.addText('MEANS', { x: cx + 0.22, y: ly, w: 0.6, h: 0.18, fontSize: 7, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 1.5 });
            s.addText(truncate(st.meaning, 160), { x: cx + 0.62, y: ly, w: colW - 0.72, h: 0.55, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45 });
            ly += 0.6;
        }
        // MATTERS line
        if (st.matters) {
            s.addText('MATTERS', { x: cx + 0.22, y: ly, w: 0.8, h: 0.18, fontSize: 7, color: accents[i % accents.length], fontFace: FONT, bold: true, charSpacing: 1.5 });
            s.addText(truncate(st.matters, 160), { x: cx + 0.82, y: ly, w: colW - 0.92, h: 0.55, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45 });
            ly += 0.6;
        }
        // Source pinned bottom
        s.addText(truncate(st.source, 60), { x: cx + 0.22, y: y + statBlockH - 0.26, w: colW - 0.32, h: 0.2, fontSize: 7.5, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.2 });
    });

    // CONVERGENT INSIGHT row — synthesis across all stats
    if (hasConvergent) {
        const ciY = y + statBlockH + 0.12;
        s.addShape('rect' as any, { x: tx, y: ciY, w: tw, h: convergentH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: ciY, w: 0.08, h: convergentH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText('CONVERGENT INSIGHT', { x: tx + 0.24, y: ciY + 0.1, w: tw - 0.36, h: 0.2, fontSize: 8, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2.5 });
        s.addText(truncate(data.convergentInsight!, 320), { x: tx + 0.24, y: ciY + 0.34, w: tw - 0.36, h: 0.55, fontSize: 11, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        if (data.patternSignal) {
            s.addShape('line' as any, { x: tx + 0.24, y: ciY + 0.94, w: tw - 0.36, h: 0, line: { color: T.RULE, width: 0.3 } });
            s.addText('PATTERN', { x: tx + 0.24, y: ciY + 1.0, w: 0.8, h: 0.18, fontSize: 7.5, color: T.CYAN, fontFace: FONT, bold: true, charSpacing: 2 });
            s.addText(truncate(data.patternSignal, 240), { x: tx + 1.0, y: ciY + 1.0, w: tw - 1.12, h: 0.32, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
        }
    }

    sourceFooter(s, tx, tw, sources);
}

// 9. TIMELINE
function exportTimeline(s: any, slideTitle: string, data: TimelineData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, 'ROADMAP');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 26);
    y += 1.0;

    const phases = data.phases.slice(0, 5);
    const colW = tw / phases.length;
    const lineY = y + 0.18;
    s.addShape('line' as any, { x: tx, y: lineY, w: tw, h: 0, line: { color: T.RULE, width: 1.5 } });
    s.addShape('line' as any, { x: tx, y: lineY, w: colW * 0.5, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1.5 } });

    phases.forEach((ph, i) => {
        const cx = tx + i * colW;
        const dotSize = 0.18;
        const dotX = cx + 0.04;
        s.addShape('ellipse' as any, { x: dotX, y: lineY - dotSize / 2, w: dotSize, h: dotSize, fill: { color: i === 0 ? T.CHARTREUSE_BRIGHT : T.WHITE }, line: { color: i === 0 ? T.CHARTREUSE_BRIGHT : T.RULE, width: 1.5 } });
        let cy = lineY + 0.3;
        s.addText(`PHASE ${String(i + 1).padStart(2, '0')}${ph.duration ? `  ·  ${ph.duration}` : ''}`, { x: cx + 0.04, y: cy, w: colW - 0.16, h: 0.22, fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2 });
        cy += 0.28;
        s.addText(ph.name, { x: cx + 0.04, y: cy, w: colW - 0.16, h: 0.5, fontSize: 13, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        cy += 0.55;
        ph.items.slice(0, 4).forEach(item => {
            s.addText([
                { text: '·  ', options: { color: T.CHARTREUSE_BRIGHT, bold: true, fontSize: 10, fontFace: FONT } },
                { text: item, options: { color: T.BODY, fontSize: 9, fontFace: FONT } },
            ], { x: cx + 0.04, y: cy, w: colW - 0.16, h: 0.32, valign: 'top', lineSpacingMultiple: 1.4 });
            cy += 0.32;
        });
    });
    sourceFooter(s, tx, tw, sources);
}

// 10. SECTION DIVIDER (full bleed — overrides shell)
function exportSectionDivider(s: any, data: SectionDividerData) {
    s.addShape('rect' as any, { x: 0, y: 0, w: T.PPTX_W, h: T.PPTX_H, fill: { color: T.TEAL } });
    // Big number top-left — shrinks for 3+ digit section numbers (100+)
    const numSize = heroPt(data.number, 160, 72, 2);
    s.addText(data.number, { x: 0.7, y: 0.45, w: 4.5, h: 2.6, fontSize: numSize, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -6 });
    // SECTION label
    s.addText('SECTION', { x: 5.4, y: 0.85, w: 2.5, h: 0.25, fontSize: 10, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 4 });
    s.addShape('line' as any, { x: 5.4, y: 1.15, w: 1.1, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1 } });
    // Title bottom-left — size scales down for long titles
    const titleSize = data.title.length > 40 ? 42 : data.title.length > 28 ? 50 : 56;
    s.addText(data.title, { x: 0.7, y: 4.5, w: T.PPTX_W - 1.4, h: 1.9, fontSize: titleSize, color: T.WHITE, fontFace: FONT, bold: true, valign: 'bottom', lineSpacingMultiple: 1.05, charSpacing: -2 });
    if (data.subtitle) {
        s.addText(data.subtitle, { x: 0.7, y: 6.3, w: T.PPTX_W - 1.4, h: 0.6, fontSize: 16, color: 'A6C2C4', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
    }
    // 3x3 brand grid bottom-right
    const ds = 0.085, dg = 0.05;
    const dx0 = T.PPTX_W - 0.7 - 3 * ds - 2 * dg;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        s.addShape('rect' as any, { x: dx0 + c * (ds + dg), y: 6.7 + r * (ds + dg), w: ds, h: ds, fill: { color: T.CHARTREUSE_BRIGHT } });
    }
}

// === TEMPLATE EXPORTERS (11-15: classic-deliverable completions) ===

// 11. SERVICE BLUEPRINT — grid with explicit heights so lanes can't collapse.
// Capped to 4 stages. Duration + emotion strip under phase header. Per-cell truncate.
function exportServiceBlueprint(s: any, slideTitle: string, data: ServiceBlueprintData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    tag(s, tx, y, tw, 'SERVICE BLUEPRINT'); y += 0.24;
    title(s, tx, y, tw, slideTitle, 22); y += 0.72;

    const stages = data.stages.slice(0, 4);
    const labelW = 1.05;
    const stageW = (tw - labelW) / stages.length;

    // Reserve vertical budget
    const sourcesY = 7.10;
    const insightH = data.keyInsight ? 0.45 : 0;
    const headerH = 0.34;
    const metaH = 0.28;
    const failH = 0.55;
    const available = sourcesY - y - headerH - metaH - failH - insightH - 0.2;
    const laneH = Math.max(0.52, available / 4);

    const lanes: Array<{ key: string; label: string; isHero?: boolean }> = [
        { key: 'customerAction', label: 'CUSTOMER', isHero: true },
        { key: 'frontstage', label: 'FRONTSTAGE' },
        { key: 'backstage', label: 'BACKSTAGE' },
        { key: 'support', label: 'SUPPORT / DATA' },
    ];
    const emoji = (e?: string) => {
        if (!e) return '';
        const lw = e.toLowerCase();
        if (lw.includes('frustrat') || lw.includes('confus') || lw.includes('angry')) return '😟';
        if (lw.includes('hope') || lw.includes('excit') || lw.includes('curious')) return '🙂';
        if (lw.includes('disappoint') || lw.includes('abandon')) return '☹️';
        if (lw.includes('delight') || lw.includes('satisf')) return '😀';
        return '•';
    };

    // === Phase header row (teal band) ===
    s.addShape('rect' as any, { x: tx, y, w: tw, h: headerH, fill: { color: T.TEAL } });
    s.addText('PHASE', { x: tx + 0.1, y, w: labelW - 0.1, h: headerH, fontSize: 8, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle' });
    stages.forEach((st, i) => {
        s.addText(truncate(st.phase, 26), { x: tx + labelW + i * stageW + 0.08, y, w: stageW - 0.16, h: headerH, fontSize: 11, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: -1, valign: 'middle' });
    });
    y += headerH;

    // === Duration / emotion strip ===
    s.addShape('rect' as any, { x: tx, y, w: tw, h: metaH, fill: { color: T.PALE } });
    s.addText('DURATION · MOOD', { x: tx + 0.1, y, w: labelW - 0.1, h: metaH, fontSize: 7, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5, valign: 'middle' });
    stages.forEach((st, i) => {
        const parts: string[] = [];
        if (st.emotion) parts.push(`${emoji(st.emotion)} ${st.emotion}`);
        if (st.duration) parts.push(st.duration);
        const txt = parts.join('   ·   ');
        s.addText(txt || '—', { x: tx + labelW + i * stageW + 0.08, y, w: stageW - 0.16, h: metaH, fontSize: 8, color: T.SECONDARY, fontFace: FONT, valign: 'middle' });
    });
    y += metaH;

    // === Lanes ===
    lanes.forEach(lane => {
        if (lane.isHero) s.addShape('rect' as any, { x: tx, y, w: labelW, h: laneH, fill: { color: T.PANEL } });
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(lane.label, { x: tx + 0.1, y: y + 0.06, w: labelW - 0.16, h: laneH - 0.08, fontSize: 8, color: lane.isHero ? T.CHARTREUSE_BRIGHT : T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2, valign: 'top' });
        stages.forEach((st, i) => {
            const txt = (st as any)[lane.key] as string | undefined;
            const cellX = tx + labelW + i * stageW;
            if (lane.isHero) s.addShape('rect' as any, { x: cellX, y, w: stageW, h: laneH, fill: { color: T.PALE } });
            s.addShape('line' as any, { x: cellX, y, w: 0, h: laneH, line: { color: T.RULE, width: 0.5 } });
            s.addText(truncate(txt, 110) || '—', { x: cellX + 0.1, y: y + 0.08, w: stageW - 0.2, h: laneH - 0.12, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        });
        y += laneH;
    });

    // === Fail points row (red top rule) ===
    s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RED, width: 1.2 } });
    s.addShape('rect' as any, { x: tx, y, w: labelW, h: failH, fill: { color: 'FBEAEA' } });
    s.addText('FAIL\nPOINTS', { x: tx + 0.1, y: y + 0.06, w: labelW - 0.16, h: failH - 0.08, fontSize: 8, color: T.RED, fontFace: FONT, bold: true, charSpacing: 2, valign: 'top', lineSpacingMultiple: 1.15 });
    stages.forEach((st, i) => {
        const txt = st.painPoint || '—';
        const prefix = st.failPoint ? '⚠  ' : '';
        const cellX = tx + labelW + i * stageW;
        if (st.failPoint) s.addShape('rect' as any, { x: cellX, y, w: stageW, h: failH, fill: { color: 'FBEAEA' } });
        s.addShape('line' as any, { x: cellX, y, w: 0, h: failH, line: { color: T.RULE, width: 0.5 } });
        s.addText(prefix + truncate(txt, 110), { x: cellX + 0.1, y: y + 0.08, w: stageW - 0.2, h: failH - 0.12, fontSize: 9, color: st.failPoint ? T.RED : T.BODY, fontFace: FONT, bold: !!st.failPoint, valign: 'top', lineSpacingMultiple: 1.35 });
    });
    y += failH + 0.08;

    if (data.keyInsight) {
        s.addShape('rect' as any, { x: tx, y, w: tw, h: insightH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: insightH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(truncate(data.keyInsight, 260), { x: tx + 0.2, y, w: tw - 0.3, h: insightH, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 12. GAP MATRIX (maturity bars + severity badges)
function exportGapMatrix(s: any, slideTitle: string, data: GapMatrixData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, 'MATURITY GAP ANALYSIS'); y += 0.28;
    title(s, tx, y, tw, slideTitle, 24); y += 0.85;

    const max = data.scaleMax || 5;
    const rows = data.gaps.slice(0, 6);
    const nameW = tw * 0.28;
    const sevW = 0.9;
    const barW = tw - nameW - sevW - 0.2;
    const rowH = 0.5;

    // Scale header L1..Lmax
    const scaleY = y;
    for (let i = 0; i < max; i++) {
        const tickX = tx + nameW + 0.1 + (barW * (i / (max - 1)));
        s.addText(`L${i + 1}`, { x: tickX - 0.15, y: scaleY, w: 0.3, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, bold: true, align: 'center' });
    }
    s.addText('SEVERITY', { x: tx + nameW + 0.1 + barW + 0.1, y: scaleY, w: sevW, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, bold: true, charSpacing: 1, align: 'right' });
    y += 0.28;

    const sevColor = (sev: string) => sev === 'critical' ? T.RED : sev === 'high' ? T.RUST : sev === 'medium' ? T.CHARTREUSE_BRIGHT : T.SECONDARY;
    rows.forEach(g => {
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(g.capability, { x: tx, y: y + 0.1, w: nameW, h: rowH - 0.1, fontSize: 11, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
        // Track background
        const barX = tx + nameW + 0.1;
        const barY = y + 0.15;
        const barH = 0.22;
        s.addShape('rect' as any, { x: barX, y: barY, w: barW, h: barH, fill: { color: T.PALE } });
        // Current bar (chartreuse)
        const curFrac = g.currentMaturity / max;
        s.addShape('rect' as any, { x: barX, y: barY, w: barW * curFrac, h: barH, fill: { color: T.CHARTREUSE_BRIGHT } });
        // Target marker (teal triangle via small rect, since native triangle isn't reliable)
        const tgtX = barX + barW * (g.targetMaturity / max) - 0.05;
        s.addShape('rect' as any, { x: tgtX, y: barY - 0.02, w: 0.1, h: barH + 0.04, fill: { color: T.TEAL } });
        // Labels
        s.addText(String(g.currentMaturity), { x: barX + 0.08, y: barY + 0.02, w: 0.3, h: 0.18, fontSize: 9, color: T.INK, fontFace: FONT, bold: true });
        s.addText(`→ ${g.targetMaturity}`, { x: barX + barW - 0.5, y: barY + 0.02, w: 0.5, h: 0.18, fontSize: 9, color: T.TEAL, fontFace: FONT, bold: true, align: 'right' });
        // Severity badge
        s.addText(g.severity.toUpperCase(), { x: tx + nameW + 0.1 + barW + 0.1, y: y + 0.14, w: sevW, h: 0.22, fontSize: 9, color: sevColor(g.severity), fontFace: FONT, bold: true, charSpacing: 1, align: 'right' });
        y += rowH;
    });
    // Legend + insight
    y += 0.1;
    s.addShape('rect' as any, { x: tx, y: y + 0.04, w: 0.14, h: 0.1, fill: { color: T.CHARTREUSE_BRIGHT } });
    s.addText('CURRENT', { x: tx + 0.2, y, w: 0.8, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, bold: true });
    s.addShape('rect' as any, { x: tx + 1.1, y: y + 0.02, w: 0.1, h: 0.14, fill: { color: T.TEAL } });
    s.addText('TARGET', { x: tx + 1.25, y, w: 0.8, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, bold: true });
    if (data.insight) {
        s.addText(data.insight, { x: tx + 2.2, y, w: tw - 2.3, h: 0.2, fontSize: 9, color: T.INK, fontFace: FONT, align: 'right' });
    }
    sourceFooter(s, tx, tw, sources);
}

// 13. ARCHITECTURE MAP (C4-style layered stack)
function exportArchitectureMap(s: any, slideTitle: string, data: ArchitectureMapData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.4;
    const tw = geom.contentW - 0.8;
    let y = 0.35;
    tag(s, tx, y, tw, 'SYSTEM ARCHITECTURE'); y += 0.26;
    title(s, tx, y, tw, slideTitle, 24); y += 0.85;

    const layers = data.layers.slice(0, 5);
    const bottomReserve = data.flowSummary ? 0.7 : 0.35;
    const totalH = 7.05 - y - bottomReserve;
    const layerH = totalH / layers.length;
    const labelW = 1.4;

    layers.forEach((layer, i) => {
        const isDark = i % 2 === 0;
        // Label column
        s.addShape('rect' as any, { x: tx, y, w: labelW, h: layerH - 0.08, fill: { color: isDark ? T.TEAL : T.PANEL } });
        s.addText(`LAYER ${String(i + 1).padStart(2, '0')}`, { x: tx + 0.12, y: y + 0.12, w: labelW - 0.24, h: 0.22, fontSize: 8, color: isDark ? T.CHARTREUSE_BRIGHT : T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(layer.name, { x: tx + 0.12, y: y + 0.36, w: labelW - 0.24, h: layerH - 0.48, fontSize: 12, color: isDark ? T.WHITE : T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        // Nodes (up to 6, wrap 3 per row)
        const nodes = layer.nodes.slice(0, 6);
        const nodeAreaX = tx + labelW + 0.12;
        const nodeAreaW = tw - labelW - 0.12;
        const cols = Math.min(3, Math.max(1, nodes.length));
        const rows = Math.ceil(nodes.length / cols);
        const nW = (nodeAreaW - (cols - 1) * 0.1) / cols;
        const nH = (layerH - 0.08 - (rows - 1) * 0.08) / rows;
        nodes.forEach((n, ni) => {
            const col = ni % cols;
            const row = Math.floor(ni / cols);
            const nx = nodeAreaX + col * (nW + 0.1);
            const ny = y + row * (nH + 0.08);
            s.addShape('rect' as any, { x: nx, y: ny, w: nW, h: nH, fill: { color: T.WHITE }, line: { color: T.RULE, width: 0.5 } });
            s.addText(n.name, { x: nx + 0.1, y: ny + 0.08, w: nW - 0.2, h: 0.26, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, charSpacing: -1 });
            if (n.type) s.addText(n.type.toUpperCase(), { x: nx + 0.1, y: ny + 0.32, w: nW - 0.2, h: 0.18, fontSize: 7, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 1.5 });
            if (n.description) s.addText(n.description, { x: nx + 0.1, y: ny + 0.5, w: nW - 0.2, h: nH - 0.55, fontSize: 8, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
        });
        y += layerH;
    });

    if (data.flowSummary) {
        const insY = 7.05 - 0.65;
        s.addShape('rect' as any, { x: tx, y: insY, w: tw, h: 0.45, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: insY, w: 0.08, h: 0.45, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText([
            { text: 'FLOW:  ', options: { bold: true, fontSize: 8, color: T.SECONDARY, fontFace: FONT, charSpacing: 1 } },
            { text: data.flowSummary, options: { fontSize: 10, color: T.INK, fontFace: FONT } },
        ], { x: tx + 0.2, y: insY, w: tw - 0.3, h: 0.45, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 14. PRD FEATURE (3 cards with MoSCoW + story + acceptance criteria)
function exportPrdFeature(s: any, slideTitle: string, data: PrdFeatureData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.4;
    const tw = geom.contentW - 0.8;
    let y = 0.35;
    tag(s, tx, y, tw, 'PRODUCT REQUIREMENTS'); y += 0.26;
    const allFeatures = Array.isArray(data?.features) ? data.features : [];
    const prio = (p: string) => p === 'must' ? T.RED : p === 'should' ? T.CHARTREUSE_BRIGHT : p === 'could' ? T.CYAN : T.MUTED;

    // 2026-05-06 — DEEP-mode detection (matches the web renderer): single
    // feature with rich narrative fields → full-slide layout that renders
    // technical details, problem solved, stakeholders, and verbatim
    // evidence quotes. Multi-feature payloads keep the original 3-card
    // compact layout below.
    const single = allFeatures.length === 1 ? allFeatures[0] : null;
    const isDeep = !!(single && (single.technicalDetails || single.problemSolved || single.stakeholders || (Array.isArray(single.evidence) && single.evidence.length > 0)));

    if (isDeep && single) {
        const f = single;
        title(s, tx, y, tw, slideTitle, 20); y += 0.7;

        // Two-column layout: left = user story + criteria; right = problem/tech/stakeholders/evidence
        const colGap = 0.3;
        const colW = (tw - colGap) / 2;
        const colY = y;
        const colH = 7.05 - colY - 0.45;
        const lx = tx;
        const rx = tx + colW + colGap;

        // LEFT COLUMN
        // Priority badge + name row
        s.addShape('rect' as any, { x: lx, y: colY, w: 0.8, h: 0.24, fill: { color: prio(f.priority) } });
        s.addText(f.priority.toUpperCase(), { x: lx, y: colY, w: 0.8, h: 0.24, fontSize: 8, color: f.priority === 'should' ? T.INK : T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, align: 'center', valign: 'middle' });
        s.addText(f.name, { x: lx + 0.95, y: colY - 0.02, w: colW - 0.95, h: 0.28, fontSize: 13, color: T.INK, fontFace: FONT, bold: true, charSpacing: -1, valign: 'middle' });
        // User story panel
        let ly = colY + 0.4;
        s.addShape('rect' as any, { x: lx, y: ly, w: colW, h: 0.85, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: lx, y: ly, w: 0.06, h: 0.85, fill: { color: prio(f.priority) } });
        s.addText(f.userStory, { x: lx + 0.18, y: ly + 0.06, w: colW - 0.24, h: 0.75, fontSize: 9, color: T.BODY, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.45 });
        ly += 1.0;
        // Acceptance criteria
        s.addText('ACCEPTANCE CRITERIA', { x: lx, y: ly, w: colW, h: 0.2, fontSize: 7, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2 });
        ly += 0.24;
        (Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 6).forEach(c => {
            s.addText([
                { text: '✓  ', options: { bold: true, color: T.CHARTREUSE_BRIGHT, fontSize: 10, fontFace: FONT } },
                { text: c, options: { color: T.BODY, fontSize: 8.5, fontFace: FONT } },
            ], { x: lx, y: ly, w: colW, h: 0.45, valign: 'top', lineSpacingMultiple: 1.35 });
            ly += 0.42;
        });

        // RIGHT COLUMN
        let ry = colY;
        const drawSection = (label: string, accent: string, body: string, h: number) => {
            s.addText(label, { x: rx, y: ry, w: colW, h: 0.18, fontSize: 7, color: accent, fontFace: FONT, bold: true, charSpacing: 2 });
            ry += 0.2;
            s.addText(body, { x: rx, y: ry, w: colW, h, fontSize: 8.5, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45 });
            ry += h + 0.1;
        };
        if (f.problemSolved) drawSection('PROBLEM SOLVED', T.RED, f.problemSolved, 1.05);
        if (f.technicalDetails) drawSection('TECHNICAL DETAILS', T.CYAN, f.technicalDetails, 1.05);
        if (f.stakeholders) drawSection('STAKEHOLDERS', T.SECONDARY, f.stakeholders, 0.8);
        if (Array.isArray(f.evidence) && f.evidence.length > 0) {
            s.addShape('line' as any, { x: rx, y: ry, w: colW, h: 0, line: { color: T.RULE, width: 0.5 } });
            ry += 0.08;
            s.addText('EVIDENCE', { x: rx, y: ry, w: colW, h: 0.18, fontSize: 7, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 2 });
            ry += 0.22;
            f.evidence.slice(0, 3).forEach(e => {
                if (ry > colY + colH - 0.5) return;
                s.addShape('rect' as any, { x: rx, y: ry, w: 0.04, h: 0.55, fill: { color: T.CHARTREUSE_BRIGHT } });
                s.addText(`"${e.text}"`, { x: rx + 0.12, y: ry, w: colW - 0.12, h: 0.4, fontSize: 8, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
                const attr = e.attribution ? `${e.attribution} · ${e.source}` : e.source;
                s.addText(attr, { x: rx + 0.12, y: ry + 0.4, w: colW - 0.12, h: 0.18, fontSize: 7, color: T.MUTED, fontFace: 'JetBrains Mono', valign: 'top' });
                ry += 0.62;
            });
        }
        sourceFooter(s, tx, tw, sources);
        return;
    }

    // COMPACT mode (default) — multi-feature side-by-side
    title(s, tx, y, tw, slideTitle, 24); y += 0.85;
    const features = allFeatures.slice(0, 3);
    if (features.length === 0) { sourceFooter(s, tx, tw, sources); return; }
    const cardW = (tw - 0.2 * (features.length - 1)) / features.length;
    const cardY = y;
    const cardH = 7.05 - cardY - 0.45;

    features.forEach((f, i) => {
        const cx = tx + i * (cardW + 0.2);
        // Card background + top rule
        s.addShape('rect' as any, { x: cx, y: cardY, w: cardW, h: cardH, fill: { color: T.WHITE }, line: { color: T.RULE, width: 0.5 } });
        s.addShape('rect' as any, { x: cx, y: cardY, w: cardW, h: 0.08, fill: { color: prio(f.priority) } });
        // Priority badge
        s.addShape('rect' as any, { x: cx + 0.2, y: cardY + 0.22, w: 0.8, h: 0.24, fill: { color: prio(f.priority) } });
        s.addText(f.priority.toUpperCase(), { x: cx + 0.2, y: cardY + 0.22, w: 0.8, h: 0.24, fontSize: 8, color: f.priority === 'should' ? T.INK : T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, align: 'center', valign: 'middle' });
        // Name
        s.addText(f.name, { x: cx + 0.2, y: cardY + 0.55, w: cardW - 0.4, h: 0.45, fontSize: 14, color: T.INK, fontFace: FONT, bold: true, charSpacing: -1, valign: 'top', lineSpacingMultiple: 1.2 });
        // User story (italic)
        s.addText(f.userStory, { x: cx + 0.2, y: cardY + 1.05, w: cardW - 0.4, h: 0.9, fontSize: 9, color: T.BODY, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.5 });
        s.addShape('line' as any, { x: cx + 0.2, y: cardY + 2.0, w: cardW - 0.4, h: 0, line: { color: T.RULE, width: 0.5 } });
        // Acceptance criteria header
        s.addText('ACCEPTANCE CRITERIA', { x: cx + 0.2, y: cardY + 2.1, w: cardW - 0.4, h: 0.2, fontSize: 7, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 2 });
        // Criteria list
        let ay = cardY + 2.32;
        (Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 5).forEach(c => {
            s.addText([
                { text: '✓  ', options: { bold: true, color: T.CHARTREUSE_BRIGHT, fontSize: 10, fontFace: FONT } },
                { text: c, options: { color: T.BODY, fontSize: 9, fontFace: FONT } },
            ], { x: cx + 0.2, y: ay, w: cardW - 0.4, h: 0.4, valign: 'top', lineSpacingMultiple: 1.4 });
            ay += 0.38;
        });
    });
    sourceFooter(s, tx, tw, sources);
}

// 15. SYSTEMS INVENTORY (tech audit table with status + risk badges)
function exportSystemsInventory(s: any, slideTitle: string, data: SystemsInventoryData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.4;
    const tw = geom.contentW - 0.8;
    let y = 0.35;
    tag(s, tx, y, tw, 'SYSTEMS INVENTORY'); y += 0.26;
    title(s, tx, y, tw, slideTitle, 24); y += 0.8;

    const rows = data.systems.slice(0, 8);
    const nameW = tw * 0.40;
    const catW = tw * 0.24;
    const statW = tw * 0.18;
    const riskW = tw - nameW - catW - statW;
    const headerH = 0.42;
    const rowH = 0.5;

    // Header
    s.addShape('rect' as any, { x: tx, y, w: tw, h: headerH, fill: { color: T.TEAL } });
    s.addText('SYSTEM', { x: tx + 0.12, y, w: nameW - 0.12, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle' });
    s.addText('CATEGORY', { x: tx + nameW, y, w: catW, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle' });
    s.addText('STATUS', { x: tx + nameW + catW, y, w: statW, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle', align: 'center' });
    s.addText('RISK', { x: tx + nameW + catW + statW, y, w: riskW, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 2, valign: 'middle', align: 'center' });
    y += headerH;

    const riskColor = (r: string) => r === 'critical' ? T.RED : r === 'high' ? T.RUST : r === 'medium' ? T.CHARTREUSE_BRIGHT : T.GREEN;
    const statusColor = (st: string) => st === 'legacy' ? T.RUST : st === 'deprecated' ? T.RED : st === 'planned' ? T.CYAN : T.GREEN;

    rows.forEach((sys, ri) => {
        const bg = ri % 2 === 0 ? T.WHITE : T.PALE;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: rowH, fill: { color: bg } });
        s.addShape('line' as any, { x: tx, y: y + rowH, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        // Name + description
        s.addText(sys.name, { x: tx + 0.12, y: y + 0.06, w: nameW - 0.24, h: 0.24, fontSize: 11, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
        if (sys.description) s.addText(sys.description, { x: tx + 0.12, y: y + 0.28, w: nameW - 0.24, h: rowH - 0.3, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
        // Category
        s.addText(sys.category, { x: tx + nameW, y, w: catW, h: rowH, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'middle' });
        // Status badge
        const sBadgeX = tx + nameW + catW + (statW - 0.9) / 2;
        s.addShape('rect' as any, { x: sBadgeX, y: y + (rowH - 0.22) / 2, w: 0.9, h: 0.22, fill: { color: statusColor(sys.status) } });
        s.addText(sys.status.toUpperCase(), { x: sBadgeX, y: y + (rowH - 0.22) / 2, w: 0.9, h: 0.22, fontSize: 7, color: T.WHITE, fontFace: FONT, bold: true, charSpacing: 1.5, align: 'center', valign: 'middle' });
        // Risk badge
        const rBadgeX = tx + nameW + catW + statW + (riskW - 0.9) / 2;
        s.addShape('rect' as any, { x: rBadgeX, y: y + (rowH - 0.22) / 2, w: 0.9, h: 0.22, fill: { color: riskColor(sys.risk) } });
        s.addText(sys.risk.toUpperCase(), { x: rBadgeX, y: y + (rowH - 0.22) / 2, w: 0.9, h: 0.22, fontSize: 7, color: sys.risk === 'medium' ? T.INK : T.WHITE, fontFace: FONT, bold: true, charSpacing: 1.5, align: 'center', valign: 'middle' });
        y += rowH;
    });

    if (data.insight) {
        y += 0.15;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: 0.45, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: 0.45, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(data.insight, { x: tx + 0.2, y, w: tw - 0.3, h: 0.45, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// === MAIN DISPATCHER ===
export interface ExportSlideArgs {
    template: SlideTemplate;
    title: string;
    sources?: string[];
    imageUrl?: string;
    brand?: Brand;
    persona?: PersonaCardData;
    recommendation?: RecommendationData;
    themeCluster?: ThemeClusterData;
    matrix?: CompetitiveMatrixData;
    quote?: BlockQuoteData;
    caseStudy?: CaseStudyData;
    principles?: PrinciplesData;
    statRow?: StatRowData;
    timeline?: TimelineData;
    sectionDivider?: SectionDividerData;
    serviceBlueprint?: ServiceBlueprintData;
    gapMatrix?: GapMatrixData;
    architectureMap?: ArchitectureMapData;
    prdFeature?: PrdFeatureData;
    systemsInventory?: SystemsInventoryData;
}

/**
 * Renders a single slide into an already-created PptxGenJS instance and returns.
 * Used by both single-slide and multi-slide deck exports. Handles brand swapping
 * so each slide can carry its own brand without polluting other slides.
 */
export async function renderSlideInto(pptx: any, args: ExportSlideArgs) {
    T = args.brand || nxtBrand;
    const s = pptx.addSlide();
    const sources = args.sources || [];

    if (args.template === 'section-divider' && args.sectionDivider) {
        exportSectionDivider(s, args.sectionDivider);
        return;
    }

    const useImage = args.template === 'persona-card' && !!args.imageUrl;
    const geom = await addBaseShell(s, useImage, args.imageUrl);

    switch (args.template) {
        case 'persona-card':
            if (args.persona) await exportPersona(s, args.title, args.persona, sources, geom);
            break;
        case 'recommendation':
            if (args.recommendation) exportRecommendation(s, args.title, args.recommendation, sources, geom);
            break;
        case 'theme-cluster':
            if (args.themeCluster) exportThemeCluster(s, args.title, args.themeCluster, sources, geom);
            break;
        case 'theme-spotlight':
            if (args.themeCluster) exportThemeSpotlight(s, args.title, args.themeCluster, sources, geom);
            break;
        case 'theme-arc':
            if (args.themeCluster) exportThemeArc(s, args.title, args.themeCluster, sources, geom);
            break;
        case 'theme-mosaic':
            if (args.themeCluster) exportThemeMosaic(s, args.title, args.themeCluster, sources, geom);
            break;
        case 'competitive-matrix':
            if (args.matrix) exportCompetitiveMatrix(s, args.title, args.matrix, sources, geom);
            break;
        case 'block-quote':
            if (args.quote) exportBlockQuote(s, args.title, args.quote, sources, geom);
            break;
        case 'case-study':
            if (args.caseStudy) exportCaseStudy(s, args.title, args.caseStudy, sources, geom);
            break;
        case 'principles':
            if (args.principles) exportPrinciples(s, args.title, args.principles, sources, geom);
            break;
        case 'stat-row':
            if (args.statRow) exportStatRow(s, args.title, args.statRow, sources, geom);
            break;
        case 'timeline':
            if (args.timeline) exportTimeline(s, args.title, args.timeline, sources, geom);
            break;
        case 'service-blueprint':
            if (args.serviceBlueprint) exportServiceBlueprint(s, args.title, args.serviceBlueprint, sources, geom);
            break;
        case 'gap-matrix':
            if (args.gapMatrix) exportGapMatrix(s, args.title, args.gapMatrix, sources, geom);
            break;
        case 'architecture-map':
            if (args.architectureMap) exportArchitectureMap(s, args.title, args.architectureMap, sources, geom);
            break;
        case 'prd-feature':
            if (args.prdFeature) exportPrdFeature(s, args.title, args.prdFeature, sources, geom);
            break;
        case 'systems-inventory':
            if (args.systemsInventory) exportSystemsInventory(s, args.title, args.systemsInventory, sources, geom);
            break;
    }
}

export async function exportSlideToPPTX(args: ExportSlideArgs) {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: TOKENS.PPTX_W, height: TOKENS.PPTX_H });
    pptx.layout = 'WIDE' as any;
    await renderSlideInto(pptx, args);
    const fn = sanitize(args.title);
    await pptx.writeFile({ fileName: `${fn}.pptx` });
}

/**
 * Export an entire deck of slides into a SINGLE .pptx file, preserving slide order.
 * Each slide can carry its own brand (mixing #NXT + #NU in one deck is supported).
 */
export async function exportDeckToPPTX(slides: ExportSlideArgs[], deckName?: string) {
    if (!slides || slides.length === 0) return;
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: TOKENS.PPTX_W, height: TOKENS.PPTX_H });
    pptx.layout = 'WIDE' as any;
    // Render sequentially — image preprocessing is async and PptxGenJS serializes shape order per slide
    for (const slide of slides) {
        await renderSlideInto(pptx, slide);
    }
    const name = deckName || `deck_${new Date().toISOString().split('T')[0]}_${slides.length}_slides`;
    await pptx.writeFile({ fileName: `${sanitize(name)}.pptx` });
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_') || 'slide';
