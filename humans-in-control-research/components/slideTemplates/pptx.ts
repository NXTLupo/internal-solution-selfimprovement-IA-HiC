/**
 * SLIDE TEMPLATES — PPTX renderers for all 10 NXT Humans templates.
 *
 * Each renderer produces NATIVE editable PowerPoint elements (text boxes,
 * shapes, lines) matching the web preview pixel-for-pixel. No screenshots,
 * no images-of-text. Layout math mirrors the web canvas via PX_TO_IN.
 */

import { TOKENS } from './types';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
    SlideTemplate,
} from './types';

const T = TOKENS;
const FONT = T.FONT;

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
    const trunc = (text: string, max: number) => text.length <= max ? text : text.substring(0, max - 1).replace(/\s+\S*$/, '') + '…';

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
    const tx = geom.contentX + 0.56;
    const tw = geom.contentW - 1.12;
    let y = 0.4;

    tag(s, tx, y, tw, 'STRATEGIC RECOMMENDATION');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 32);
    y += 0.95;

    const hasMetric = !!data.impactMetric;
    const leftW = hasMetric ? tw * 0.62 : tw;
    const rightX = tx + leftW + 0.4;
    const rightW = tw - leftW - 0.4;

    // Action title (left, with chartreuse rule)
    s.addShape('rect' as any, { x: tx, y, w: 0.04, h: 0.6, fill: { color: T.CHARTREUSE_BRIGHT } });
    s.addText(data.actionTitle, { x: tx + 0.18, y, w: leftW - 0.18, h: 0.6, fontSize: 16, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.25 });
    y += 0.7;
    if (data.rationale) {
        s.addText(data.rationale, { x: tx, y, w: leftW, h: 0.7, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        y += 0.8;
    }
    // Numbered actions
    const acts = data.supportingActions.slice(0, 5);
    let ay = y;
    acts.forEach((a, i) => {
        s.addText(String(i + 1).padStart(2, '0'), { x: tx, y: ay, w: 0.5, h: 0.45, fontSize: 26, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -2 });
        s.addText(a.name, { x: tx + 0.55, y: ay, w: leftW - 0.55, h: 0.22, fontSize: 11, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
        s.addText(a.description, { x: tx + 0.55, y: ay + 0.22, w: leftW - 0.55, h: 0.5, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4 });
        ay += 0.65;
    });

    // Impact metric (right column)
    if (hasMetric && data.impactMetric) {
        const panelY = 1.5;
        const panelH = 4.5;
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: panelH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: 0.06, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText('PROJECTED IMPACT', { x: rightX + 0.24, y: panelY + 0.4, w: rightW - 0.48, h: 0.22, fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3 });
        s.addText(data.impactMetric.value, { x: rightX + 0.24, y: panelY + 0.8, w: rightW - 0.48, h: 1.3, fontSize: 64, color: T.TEAL, fontFace: FONT, valign: 'top', charSpacing: -4 });
        s.addText(data.impactMetric.label, { x: rightX + 0.24, y: panelY + 2.2, w: rightW - 0.48, h: 1.0, fontSize: 11, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
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
        if (th.evidence) {
            s.addShape('rect' as any, { x: cx + 0.08, y: cy, w: 0.03, h: 0.7, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${th.evidence}"`, { x: cx + 0.16, y: cy, w: colW - 0.24, h: 0.7, fontSize: 9, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
            cy += 0.75;
        }
        s.addText(th.source, { x: cx + 0.08, y: blockY + blockH - 0.22, w: colW - 0.16, h: 0.2, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top' });
    });
    sourceFooter(s, tx, tw, sources);
}

// 4. COMPETITIVE MATRIX
function exportCompetitiveMatrix(s: any, slideTitle: string, data: CompetitiveMatrixData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, 'COMPETITIVE LANDSCAPE');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 24);
    y += 0.75;

    const max = data.scaleMax || 5;
    const nameColW = tw * 0.20;
    const dataW = tw - nameColW;
    const colW = dataW / data.columns.length;
    const headerH = 0.45;
    const rowH = 0.45;

    // Header row (teal)
    s.addShape('rect' as any, { x: tx, y, w: tw, h: headerH, fill: { color: T.TEAL } });
    data.columns.forEach((c, i) => {
        s.addText(c, { x: tx + nameColW + i * colW, y, w: colW, h: headerH, fontSize: 9, color: T.WHITE, fontFace: FONT, bold: true, align: 'center', valign: 'middle', charSpacing: 1 });
    });
    y += headerH;

    // Data rows
    data.rows.forEach((row, ri) => {
        const bg = ri % 2 === 0 ? T.WHITE : T.PALE;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: rowH, fill: { color: bg } });
        s.addShape('line' as any, { x: tx, y: y + rowH, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(row.name, { x: tx + 0.12, y, w: nameColW - 0.12, h: rowH, fontSize: 11, color: T.INK, fontFace: FONT, bold: true, valign: 'middle' });
        row.scores.forEach((sc, si) => {
            const cellX = tx + nameColW + si * colW;
            // Render dot scale
            const dotSize = 0.1;
            const dotGap = 0.04;
            const totalW = max * dotSize + (max - 1) * dotGap;
            const startX = cellX + (colW - totalW) / 2;
            const dotY = y + (rowH - dotSize) / 2;
            for (let di = 0; di < max; di++) {
                s.addShape('rect' as any, { x: startX + di * (dotSize + dotGap), y: dotY, w: dotSize, h: dotSize, fill: { color: di < sc ? T.CHARTREUSE_BRIGHT : T.RULE } });
            }
        });
        y += rowH;
    });

    // Insight callout
    if (data.insight) {
        y += 0.18;
        const insH = 0.65;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: insH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: insH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(data.insight, { x: tx + 0.24, y, w: tw - 0.36, h: insH, fontSize: 11, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 5. BLOCK QUOTE
function exportBlockQuote(s: any, slideTitle: string, data: BlockQuoteData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.8;
    const tw = geom.contentW - 1.6;
    // Massive quote glyph top-left
    s.addText('"', { x: tx - 0.1, y: 0.18, w: 1.5, h: 1.6, fontSize: 140, color: T.CHARTREUSE_BRIGHT, fontFace: 'Georgia', bold: true, valign: 'top' });

    let y = 1.0;
    if (data.context) {
        s.addText(data.context, { x: tx, y, w: tw, h: 0.25, fontSize: 9, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3, valign: 'top' });
        y += 0.32;
    }
    // Quote text
    s.addText(data.text, { x: tx, y, w: tw * 0.92, h: 3.6, fontSize: 26, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4, charSpacing: -1 });

    // Attribution
    const attY = 5.0;
    s.addShape('line' as any, { x: tx, y: attY + 0.18, w: 0.55, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1.2 } });
    s.addText(data.attribution, { x: tx + 0.7, y: attY, w: tw - 0.7, h: 0.32, fontSize: 13, color: T.INK, fontFace: FONT, bold: true, valign: 'top' });
    if (data.role) {
        s.addText(data.role, { x: tx + 0.7, y: attY + 0.3, w: tw - 0.7, h: 0.24, fontSize: 10, color: T.SECONDARY, fontFace: FONT, valign: 'top' });
    }

    // Source footer (custom — includes data.source first)
    const srcY = 7.10;
    s.addShape('line' as any, { x: tx, y: srcY, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
    const srcLine = `Source: ${data.source}` + (sources.length > 0 ? `  |  ${sources.join('  |  ')}` : '');
    s.addText(srcLine, { x: tx, y: srcY + 0.05, w: tw, h: 0.22, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top' });
}

// 6. CASE STUDY
function exportCaseStudy(s: any, slideTitle: string, data: CaseStudyData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, `CASE STUDY  /  ${data.subject.toUpperCase()}`);
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 24);
    y += 0.85;

    const hasMetric = !!data.keyMetric;
    const leftW = hasMetric ? tw * 0.62 : tw;
    const rightX = tx + leftW + 0.3;
    const rightW = tw - leftW - 0.3;

    const blocks: Array<[string, string, string]> = [
        ['CHALLENGE', data.challenge, T.RED],
        ['APPROACH', data.approach, T.CYAN],
        ['OUTCOME', data.outcome, T.GREEN],
    ];
    const blockH = 1.4;
    let by = y;
    blocks.forEach(([label, text, color], i) => {
        s.addText(label, { x: tx, y: by + 0.04, w: 1.1, h: 0.22, fontSize: 9, color, fontFace: FONT, bold: true, charSpacing: 2 });
        s.addText(text, { x: tx + 1.2, y: by, w: leftW - 1.2, h: blockH - 0.05, fontSize: 10, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        if (i < blocks.length - 1) {
            s.addShape('line' as any, { x: tx, y: by + blockH, w: leftW, h: 0, line: { color: T.RULE, width: 0.5 } });
        }
        by += blockH + 0.08;
    });

    if (hasMetric && data.keyMetric) {
        const panelY = y;
        const panelH = blockH * 3 + 0.24;
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: panelH, fill: { color: T.TEAL } });
        s.addText('KEY OUTCOME', { x: rightX + 0.24, y: panelY + 0.4, w: rightW - 0.48, h: 0.22, fontSize: 8, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 3 });
        s.addText(data.keyMetric.value, { x: rightX + 0.24, y: panelY + 0.8, w: rightW - 0.48, h: 1.4, fontSize: 64, color: T.WHITE, fontFace: FONT, valign: 'top', charSpacing: -4 });
        s.addText(data.keyMetric.label, { x: rightX + 0.24, y: panelY + 2.3, w: rightW - 0.48, h: 1.5, fontSize: 11, color: 'F0F0F0', fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
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
    const tx = geom.contentX + 0.56;
    const tw = geom.contentW - 1.12;
    let y = 0.4;
    tag(s, tx, y, tw, 'BY THE NUMBERS');
    y += 0.28;
    title(s, tx, y, tw, slideTitle, 26);
    y += 1.0;

    const stats = data.stats.slice(0, 4);
    const accents = [T.CHARTREUSE_BRIGHT, T.CYAN, T.RUST, T.TEAL];
    const colW = tw / stats.length;
    const blockY = y + 0.4;
    stats.forEach((st, i) => {
        const cx = tx + i * colW;
        if (i > 0) s.addShape('line' as any, { x: cx, y: blockY, w: 0, h: 2.8, line: { color: T.RULE, width: 0.5 } });
        s.addText(st.value, { x: cx + 0.24, y: blockY, w: colW - 0.36, h: 1.4, fontSize: 64, color: accents[i % accents.length], fontFace: FONT, valign: 'top', charSpacing: -4 });
        s.addText(st.label, { x: cx + 0.24, y: blockY + 1.5, w: colW - 0.36, h: 0.7, fontSize: 11, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        s.addText(st.source, { x: cx + 0.24, y: blockY + 2.3, w: colW - 0.36, h: 0.3, fontSize: 8, color: T.MUTED, fontFace: FONT, valign: 'top' });
    });
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
    // Big number top-left
    s.addText(data.number, { x: 0.7, y: 0.45, w: 4.5, h: 2.6, fontSize: 180, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -8 });
    // SECTION label
    s.addText('SECTION', { x: 5.4, y: 0.85, w: 2.5, h: 0.25, fontSize: 10, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 4 });
    s.addShape('line' as any, { x: 5.4, y: 1.15, w: 1.1, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1 } });
    // Title bottom-left
    s.addText(data.title, { x: 0.7, y: 4.5, w: T.PPTX_W - 1.4, h: 1.9, fontSize: 56, color: T.WHITE, fontFace: FONT, bold: true, valign: 'bottom', lineSpacingMultiple: 1.05, charSpacing: -3 });
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

// === MAIN DISPATCHER ===
export interface ExportSlideArgs {
    template: SlideTemplate;
    title: string;
    sources?: string[];
    imageUrl?: string;
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
}

export async function exportSlideToPPTX(args: ExportSlideArgs) {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: T.PPTX_W, height: T.PPTX_H });
    pptx.layout = 'WIDE' as any;
    const s = pptx.addSlide();

    const sources = args.sources || [];

    // Section divider is full-bleed and skips the shell
    if (args.template === 'section-divider' && args.sectionDivider) {
        exportSectionDivider(s, args.sectionDivider);
        const fn = sanitize(args.title);
        await pptx.writeFile({ fileName: `${fn}.pptx` });
        return;
    }

    // Standard shell + image (only persona uses image by default)
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
    }

    const fn = sanitize(args.title);
    await pptx.writeFile({ fileName: `${fn}.pptx` });
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_') || 'slide';
