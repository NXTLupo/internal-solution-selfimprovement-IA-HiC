/**
 * SLIDE TEMPLATES - LEGACY pptxgenjs renderers, kept as fallback only.
 *
 * 2026-06-05 - DEPRECATION NOTICE.
 *
 * This file used to be the canonical PPTX renderer for HiC's 18 slide templates.
 * It was a SECOND renderer, parallel to slideTemplates/web.tsx (which renders
 * the chat preview). N-renderer drift is unavoidable in that shape: every
 * template change had to land in BOTH files, computed dimensions varied between
 * pptxgenjs and CSS, font fallbacks diverged, text overflow handling differed.
 * The symptom users saw: chat preview and exported PPTX never matched.
 *
 * THE STRUCTURAL FIX (2026-06-05): chat preview (slideTemplates/web.tsx) is the
 * SINGLE SOURCE OF TRUTH for slide layout. Every PPTX export now routes through
 * the gold pipeline (proxy/gold_pptx_export.py via /api/gold/export-pptx-multi).
 * Each slide's rendered DOM is captured at native 1920x1080, wrapped as a
 * #stage HTML doc, sent to Playwright on the proxy, and emerges as editable
 * text + pixel-accurate background. Same renderer for preview and export, by
 * construction. Zero drift possible.
 *
 * See:
 *   - services/goldArtifact.ts::exportGoldDeckPptx + captureSlideAsStageHtml
 *   - proxy/gold_pptx_export.py::html_list_to_editable_pptx
 *   - components/CorpusChatPanel.tsx::handleExportDeckPPTX (the rewired site)
 *
 * This file is kept for one release as a FALLBACK only - for code paths that
 * import exportSlideToPPTX / exportDeckToPPTX directly without going through
 * the chat's handleExportDeckPPTX (e.g., the per-tile recommendation export
 * at CorpusChatPanel.tsx:3252 and design-desk/components/ExportMenu.tsx).
 * Those call sites should migrate to the gold pipeline in the next iteration.
 *
 * DO NOT add new export paths against this file. Use exportGoldDeckPptx.
 *
 * --- Original header preserved below for diff continuity ---
 *
 * Each renderer produces NATIVE editable PowerPoint elements (text boxes,
 * shapes, lines) matching the web preview pixel-for-pixel. No screenshots,
 * no images-of-text. Layout math mirrors the web canvas via PX_TO_IN.
 */

import { TOKENS } from './types';
import { nxtBrand, fontForRole, type Brand } from './brands';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
    ServiceBlueprintData, JourneyMapData, GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
    OrgChartData, ExecutiveBriefData,
    SlideTemplate,
} from './types';
import { cleanTranscriptQuote, looksLikeTranscriptSource } from '../../services/transcriptQuoteCleaner';
import type { JourneyBrief } from '../../services/journeyBriefExporter';
import { stripFormatTells } from '../../services/slidePostProcessor';

// Default brand - used unless exportSlideToPPTX is called with an explicit brand.
// Inside this file, every reference to `T` resolves through the active brand
// set at the top of exportSlideToPPTX, so color values swap cleanly per brand.
let T: Brand = nxtBrand;
// 2026-05-26 - Font-role accessors derived from the ACTIVE brand. Replaces
// the single `const FONT = TOKENS.FONT` (which was the body face, applied
// to titles + numbers + everything, causing the preview-vs-PPTX serif/sans
// drift). Every addText now picks the role-appropriate face via these,
// matching web.tsx's var(--font-display)/--font-body/--font-mono usage.
// These are getters because `T` is reassigned per-export inside
// exportSlideToPPTX. `FONT` is retained as the body alias for backward
// compatibility but should NOT be used for display/title/number text.
const FONT = TOKENS.FONT;                       // body alias (legacy)
const fDisplay = () => T.FONT_DISPLAY_PPTX || fontForRole('display', T); // PPTX display = brand Office face (NXT: Agency FB; NU: Lato); web uses FONT_DISPLAY proxy
const fBody = () => fontForRole('body', T);       // Roboto - prose
const fLabel = () => fontForRole('label', T);     // Roboto Mono - eyebrow labels
const fMono = () => fontForRole('mono', T);       // Roboto Mono - sources, codes

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
 *  sentence end, else to last clause boundary (period - not ellipsis), else
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

/** Smart quote truncation - no mid-clause cuts, NO ellipsis. Mirrors web.tsx::smartQuoteClip. */
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

/** Clean a quote object - runs the transcript cleaner for transcript-sourced
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

// === IMAGE PREPROCESSOR - guarantees object-fit:cover behavior in PPTX ===
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

// === EXPORT-LAYER TEXT HYGIENE (last line of defense) ===
// 2026-06-03 - Wrap a slide's addText so EVERY text frame across all 18
// templates is sanitized at a single chokepoint: em-dashes (U+2014, the #1
// AI-writing tell - HARD BAN per .claude/CLAUDE.md) and emoji are stripped
// here, regardless of which generation path produced the slide data. The
// staged-deck path runs slidePostProcessor.stripEmDashes upstream, but the
// chat #slides path parses :::slide blocks straight into template data and
// never hit that strip - so an em-dash typed in a title or returned by the
// model leaked into the .pptx. This makes the export the guaranteed last
// line of defense. Handles both plain-string and rich-text-run-array calls.
function sanitizeAddText(s: any) {
    if (!s || typeof s.addText !== 'function' || (s as any).__sanitized) return;
    const raw = s.addText.bind(s);
    const clean = (v: any): any => {
        if (typeof v === 'string') return stripFormatTells(v);
        if (Array.isArray(v)) return v.map((run) =>
            run && typeof run === 'object' && typeof run.text === 'string'
                ? { ...run, text: stripFormatTells(run.text) }
                : clean(run));
        return v;
    };
    s.addText = (textArg: any, opts?: any) => raw(clean(textArg), opts);
    (s as any).__sanitized = true;
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

// 2026-05-26 - Eyebrow labels use the MONO face (matches web --font-mono)
// and charSpacing reduced 4 → 2. The old charSpacing:4 + a narrow box was
// the root cause of the "CHALLENG\nE" / "APPROAC\nH" mid-word wraps in the
// PPTX export: tracked caps overflowed the fixed box width. 2pt tracking
// keeps the editorial look without overflowing single words.
const tag = (s: any, x: number, y: number, w: number, text: string, color = T.CHARTREUSE_BRIGHT) =>
    s.addText(text, { x, y, w, h: 0.2, fontSize: 9, color, fontFace: fLabel(), bold: true, charSpacing: 2, valign: 'top', wrap: false });

// 2026-05-26 - Titles use the DISPLAY face (Spectral), matching web's
// var(--font-display). Was using the body face (Roboto), which is why the
// PPTX title looked heavy-sans while the preview was elegant serif.
// 2026-06-01 - Shared title-height estimator. Several template exporters drew
// the title then advanced y by a FIXED amount (e.g. y += 0.85), so a title that
// wrapped to 3 lines overlapped the content below it (the theme-cluster PPTX
// misalignment). Callers should advance y by titleH(...) instead of a constant.
const titleH = (text: string, w: number, size = 28): number => {
    const cpl = Math.max(Math.floor((w * 72) / (size * 0.52)), 20);
    const lines = Math.max(1, Math.ceil((text || '').length / cpl));
    return Math.max((lines * size * 1.1) / 72 + 0.05, 0.6);
};
const title = (s: any, x: number, y: number, w: number, text: string, size = 28) =>
    s.addText(text, { x, y, w, h: titleH(text, w, size), fontSize: size, color: T.INK, fontFace: fDisplay(), bold: true, valign: 'top', lineSpacingMultiple: 1.05, charSpacing: -2 });

const sourceFooter = (s: any, x: number, w: number, sources?: string[]) => {
    if (!sources || sources.length === 0) return;
    const srcY = 7.10;
    s.addShape('line' as any, { x, y: srcY, w, h: 0, line: { color: T.RULE, width: 0.5 } });
    s.addText(`Sources: ${sources.join('  |  ')}`, { x, y: srcY + 0.05, w, h: 0.22, fontSize: 7, color: T.MUTED, fontFace: fMono(), valign: 'top' });
};

// === TEMPLATE EXPORTERS ===

// 1. PERSONA CARD
// Heights are computed from estimated line counts so long quotes don't overflow.
// Content panel budget: 7.0" (0.3" top padding through 7.1" source rule).
async function exportPersona(s: any, slideTitle: string, data: PersonaCardData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    const hasImg = geom.imgW > 0;
    const MAX_Y = 6.95; // hard floor - must not cross the source footer at 7.10"

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

    // QUOTE - dynamic height
    if (data.quote) {
        const qText = trunc(data.quote, 200);
        const qH = Math.max(0.4, estH(qText, 10, tw - 0.2, 1.4));
        s.addShape('rect' as any, { x: tx, y, w: 0.05, h: qH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(`"${qText}"`, { x: tx + 0.15, y, w: tw - 0.2, h: qH, fontSize: 10, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
        y += qH + 0.08;
    }

    // JTBD - dynamic height with panel
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

    // GOALS - compute per-column height from tallest goal, cap at 3 lines
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

    // PAIN POINTS & MOTIVATIONS - cap to 2 items each, dynamic heights, stop if overflowing
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
// 2026-05-12 - REWRITE with strict band reservation. Previous version used
// hardcoded Y positions (evidence at 5.65, whyMatters at 6.4, implication at
// 6.7) which produced massive overlap when tile-sourced rec slides carried
// all the optional fields (personaContext, heroImage, impactStrip, evidence,
// whyMatters, implication). The rewrite reserves explicit Y bands:
//
//   HEADER  (0.36 → 1.50): framing tag pill + title + persona eyebrow
//   BODY    (1.55 → 5.95): two-column flow with hard band cap
//   FOOTER  (6.10 → 7.10): ONE consolidated closing line (implication > whyMatters
//                           > nothing). The chat tile carries both fields; the
//                           single-slide export picks the strongest closing.
//   SOURCES (7.20 → 7.45): existing sourceFooter helper
//
// The 0.85" footer band is held back from the body so the BODY zone has a
// guaranteed 4.40" of vertical real estate. Inside BODY, both columns track
// their own y cursors and stop emitting blocks when they'd exceed 5.95.
//
// Evidence quotes are now rendered as the LAST left-column block IF the
// supporting-actions list left enough room; otherwise dropped silently.
// This matches the user's mental model: "the slide shows the strongest
// claims; the chat tile shows every field."
function exportRecommendation(s: any, slideTitle: string, data: RecommendationData, sources: string[], geom: PanelGeom, imageUrl?: string) {
    const tx = geom.contentX + 0.42;
    const tw = geom.contentW - 0.84;

    const isCyan = data.accentColor === 'cyan';
    const accent = isCyan ? '00B7C3' : T.CHARTREUSE_BRIGHT;
    const framingTagText = data.framingTag || 'STRATEGIC RECOMMENDATION';
    const actionsLabelText = data.actionsLabel || 'SUPPORTING ACTIONS';

    // === BAND BOUNDARIES (inches). HOLD THESE LINES. ===
    const HEADER_Y      = 0.36;
    const BODY_Y        = 1.55;
    const BODY_BOTTOM   = 5.95;   // body cannot extend past here
    const FOOTER_Y      = 6.20;
    const FOOTER_BOTTOM = 7.10;
    const SOURCES_Y     = 7.20;
    void SOURCES_Y;  // documented for orientation; sourceFooter places itself

    // ============================================================
    // HEADER BAND (0.36 → 1.50)
    // ============================================================
    let y = HEADER_Y;
    if (data.framingTag) {
        s.addShape('rect' as any, { x: tx, y, w: 1.55, h: 0.22, fill: { color: accent } });
        s.addText(framingTagText, { x: tx, y, w: 1.55, h: 0.22, fontSize: 7, color: 'FFFFFF', fontFace: FONT, bold: true, charSpacing: 3, valign: 'middle', align: 'center' });
    } else {
        tag(s, tx, y, tw, framingTagText);
    }
    y = 0.64;
    title(s, tx, y, tw, slideTitle, 22);
    y = 1.22;
    // Persona eyebrow - ONE LINE, hard-clipped at ~110 chars (well under tw at 8pt)
    if (data.personaContext) {
        s.addText(truncate(data.personaContext, 110), {
            x: tx, y, w: tw, h: 0.22,
            fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true,
            charSpacing: 1.5, valign: 'top',
        });
    }

    // ============================================================
    // BODY BAND (1.55 → 5.95)  - two columns, each with its own y cursor
    // ============================================================
    const heroImageSrc = (data.heroImage && data.heroImage.src) || imageUrl;
    const hasImage = !!heroImageSrc;
    const hasGrid = !!(data.impactGrid && (data.impactGrid.baseline || data.impactGrid.target || data.impactGrid.timeframe || data.impactGrid.owner));
    const hasMetric = !!data.impactMetric;
    const hasStrip = !!(data.impactStrip && (data.impactStrip.effort || data.impactStrip.risk || data.impactStrip.outcome));
    const hasRight = hasImage || hasGrid || hasMetric || hasStrip;
    const hasEvidence = !!(data.evidence && data.evidence.length > 0);
    const leftW = hasRight ? tw * 0.60 : tw;
    const rightX = tx + leftW + 0.32;
    const rightW = tw - leftW - 0.32;

    // --- LEFT COLUMN ---
    let ly = BODY_Y;

    // Action title with accent rule (always shown)
    s.addShape('rect' as any, { x: tx, y: ly, w: 0.04, h: 0.55, fill: { color: accent } });
    s.addText(data.actionTitle, {
        x: tx + 0.18, y: ly, w: leftW - 0.18, h: 0.55,
        fontSize: 15, color: T.INK, fontFace: FONT, bold: true,
        valign: 'top', lineSpacingMultiple: 1.25,
    });
    ly += 0.62;

    // Rationale (capped at 3 lines worth = ~280 chars at 10pt)
    if (data.rationale) {
        const rH = 0.80;
        s.addText(truncate(data.rationale, 280), {
            x: tx, y: ly, w: leftW, h: rH,
            fontSize: 10, color: T.BODY, fontFace: FONT,
            valign: 'top', lineSpacingMultiple: 1.5,
        });
        ly += rH + 0.10;
    }

    // Supporting actions - cap at 4, then evidence (if remaining height allows)
    const acts = (data.supportingActions || []).slice(0, 4);
    if (acts.length > 0) {
        s.addText(actionsLabelText, {
            x: tx, y: ly, w: leftW, h: 0.20,
            fontSize: 7.5, color: T.SECONDARY, fontFace: FONT, bold: true,
            charSpacing: 2.5, valign: 'top',
        });
        ly += 0.24;

        // Reserve 0.60" for evidence if hasEvidence is true AND fits
        const evidenceReserve = hasEvidence ? 0.70 : 0;
        const actsAvailable = BODY_BOTTOM - ly - evidenceReserve - 0.05;
        // Per-action height: target 0.58 but compress if needed
        const targetH = 0.58;
        const perActionH = Math.min(targetH, Math.max(0.42, actsAvailable / acts.length));
        const descChars = perActionH < 0.50 ? 100 : (perActionH < 0.55 ? 140 : 180);

        acts.forEach((a, i) => {
            const ay = ly + i * perActionH;
            if (ay + perActionH > BODY_BOTTOM) return;  // hard stop
            s.addText(String(i + 1).padStart(2, '0'), {
                x: tx, y: ay, w: 0.65, h: 0.30,
                fontSize: Math.round(perActionH > 0.55 ? 22 : 18),
                color: accent, fontFace: FONT, valign: 'top',
            });
            s.addText(a.name, {
                x: tx + 0.70, y: ay, w: leftW - 0.70, h: 0.22,
                fontSize: 10.5, color: T.INK, fontFace: FONT, bold: true,
                valign: 'top',
            });
            s.addText(truncate(a.description || '', descChars), {
                x: tx + 0.70, y: ay + 0.22, w: leftW - 0.70, h: perActionH - 0.24,
                fontSize: 9.5, color: T.BODY, fontFace: FONT,
                valign: 'top', lineSpacingMultiple: 1.35,
            });
        });
        ly += acts.length * perActionH;
    }

    // Evidence strip - only render if there's room left in the body band
    if (hasEvidence && (BODY_BOTTOM - ly) >= 0.60) {
        const evY = ly + 0.04;
        s.addShape('line' as any, { x: tx, y: evY - 0.04, w: leftW, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText('EVIDENCE', {
            x: tx, y: evY, w: leftW, h: 0.18,
            fontSize: 7.5, color: T.SECONDARY, fontFace: FONT, bold: true,
            charSpacing: 2.5,
        });
        const ev = (data.evidence || []).slice(0, 1).map(prepQuote).filter(Boolean)[0];  // ONE quote max
        if (ev) {
            const eqY = evY + 0.22;
            const qH = Math.min(0.38, BODY_BOTTOM - eqY - 0.04);
            s.addShape('rect' as any, { x: tx, y: eqY, w: 0.03, h: qH, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(ev.text, 150)}"`, {
                x: tx + 0.12, y: eqY, w: leftW - 0.12, h: qH,
                fontSize: 9, color: T.INK, fontFace: FONT, italic: true,
                valign: 'top', lineSpacingMultiple: 1.4,
            });
        }
    }

    // --- RIGHT COLUMN ---
    if (hasRight) {
        const panelY = BODY_Y;
        const panelH = BODY_BOTTOM - BODY_Y;   // exactly 4.40
        const panelBottom = panelY + panelH;

        // Accent strip at top of the right column
        s.addShape('rect' as any, { x: rightX, y: panelY, w: rightW, h: 0.06, fill: { color: accent } });

        if (hasImage) {
            // Image takes ~55% of panel height if impact strip below, else ~80%
            const captionH = data.heroImage?.caption ? 0.26 : 0;
            const imgH = hasStrip ? panelH * 0.52 : panelH * 0.82;
            const imgY = panelY + 0.06;
            try {
                s.addImage({
                    data: heroImageSrc, x: rightX, y: imgY, w: rightW, h: imgH,
                    sizing: { type: 'cover', w: rightW, h: imgH } as any,
                });
            } catch (e) { /* graceful fallback - accent strip stays */ }

            if (data.heroImage?.caption) {
                s.addText(truncate(data.heroImage.caption, 50), {
                    x: rightX, y: imgY + imgH, w: rightW, h: captionH,
                    fontSize: 7, color: T.SECONDARY, fontFace: FONT, bold: true,
                    charSpacing: 2, valign: 'middle', align: 'left',
                    margin: [0.05, 0.16, 0.05, 0.16] as any,
                    fill: { color: T.PALE },
                });
            }

            if (hasStrip) {
                const stripY = imgY + imgH + captionH + 0.06;
                const stripH = panelBottom - stripY;
                s.addShape('rect' as any, { x: rightX, y: stripY, w: rightW, h: stripH, fill: { color: T.PALE } });
                s.addText('IMPACT PROFILE', {
                    x: rightX + 0.16, y: stripY + 0.08, w: rightW - 0.32, h: 0.18,
                    fontSize: 7, color: T.SECONDARY, fontFace: FONT, bold: true,
                    charSpacing: 2,
                });
                const rows = [
                    { k: 'EFFORT', v: data.impactStrip?.effort },
                    { k: 'RISK', v: data.impactStrip?.risk },
                    { k: 'OUTCOME', v: data.impactStrip?.outcome },
                ].filter(r => r.v);
                const rowsAvail = stripH - 0.32;
                const rowH = Math.max(0.32, rowsAvail / Math.max(rows.length, 1));
                rows.forEach((r, i) => {
                    const ry = stripY + 0.30 + i * rowH;
                    if (ry + rowH > panelBottom) return;
                    s.addText(r.k, {
                        x: rightX + 0.16, y: ry, w: 0.65, h: 0.18,
                        fontSize: 7, color: accent, fontFace: FONT, bold: true,
                        charSpacing: 1.5, valign: 'top',
                    });
                    s.addText(truncate(r.v || '', 60), {
                        x: rightX + 0.85, y: ry, w: rightW - 1.00, h: rowH - 0.04,
                        fontSize: 9, color: T.INK, fontFace: FONT, bold: true,
                        valign: 'top', lineSpacingMultiple: 1.3,
                    });
                    if (i < rows.length - 1) {
                        s.addShape('line' as any, {
                            x: rightX + 0.16, y: ry + rowH - 0.04, w: rightW - 0.32, h: 0,
                            line: { color: T.RULE, width: 0.4 },
                        });
                    }
                });
            }
        } else if (hasStrip) {
            // Impact strip alone - fills the full right panel
            s.addShape('rect' as any, { x: rightX, y: panelY + 0.06, w: rightW, h: panelH - 0.06, fill: { color: T.PALE } });
            s.addText('IMPACT PROFILE', {
                x: rightX + 0.22, y: panelY + 0.28, w: rightW - 0.44, h: 0.22,
                fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3,
            });
            const rows = [
                { k: 'EFFORT', v: data.impactStrip?.effort },
                { k: 'RISK', v: data.impactStrip?.risk },
                { k: 'OUTCOME', v: data.impactStrip?.outcome },
            ].filter(r => r.v);
            const startY = panelY + 0.66;
            const rowsAvail = panelH - 0.80;
            const rowH = Math.max(0.55, rowsAvail / Math.max(rows.length, 1));
            rows.forEach((r, i) => {
                const ry = startY + i * rowH;
                if (ry + rowH > panelBottom) return;
                s.addText(r.k, {
                    x: rightX + 0.22, y: ry, w: 1.0, h: 0.24,
                    fontSize: 9, color: accent, fontFace: FONT, bold: true,
                    charSpacing: 2, valign: 'top',
                });
                s.addText(truncate(r.v || '', 180), {
                    x: rightX + 0.22, y: ry + 0.26, w: rightW - 0.44, h: rowH - 0.30,
                    fontSize: 11, color: T.INK, fontFace: FONT, bold: true,
                    valign: 'top', lineSpacingMultiple: 1.4,
                });
                if (i < rows.length - 1) {
                    s.addShape('line' as any, {
                        x: rightX + 0.22, y: ry + rowH - 0.06, w: rightW - 0.44, h: 0,
                        line: { color: T.RULE, width: 0.5 },
                    });
                }
            });
        } else if (hasGrid || hasMetric) {
            // Strategy-author paths - render PALE panel + PROJECTED IMPACT header
            s.addShape('rect' as any, { x: rightX, y: panelY + 0.06, w: rightW, h: panelH - 0.06, fill: { color: T.PALE } });
            s.addText('PROJECTED IMPACT', {
                x: rightX + 0.22, y: panelY + 0.28, w: rightW - 0.44, h: 0.22,
                fontSize: 8, color: T.SECONDARY, fontFace: FONT, bold: true, charSpacing: 3,
            });
        }

        if (hasGrid) {
            const gridY = panelY + 0.66;
            const cellW = (rightW - 0.5) / 2;
            const cellH = 0.95;
            const cells = [
                { k: 'BASELINE', v: data.impactGrid?.baseline, color: T.MUTED },
                { k: 'TARGET', v: data.impactGrid?.target, color: T.TEAL },
                { k: 'TIMEFRAME', v: data.impactGrid?.timeframe, color: T.CYAN },
                { k: 'OWNER', v: data.impactGrid?.owner, color: T.CHARTREUSE_BRIGHT },
            ];
            cells.forEach((c, i) => {
                const cx = rightX + 0.22 + (i % 2) * (cellW + 0.12);
                const cy = gridY + Math.floor(i / 2) * (cellH + 0.10);
                if (cy + cellH > panelBottom - 0.10) return;
                s.addText(c.k, { x: cx, y: cy, w: cellW, h: 0.2, fontSize: 7, color: c.color, fontFace: FONT, bold: true, charSpacing: 2 });
                s.addText(c.v ? truncate(c.v, 60) : '-', { x: cx, y: cy + 0.22, w: cellW, h: cellH - 0.26, fontSize: 10, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.3 });
            });
            if (data.impactMetric) {
                const mY = panelBottom - 0.95;
                s.addShape('line' as any, { x: rightX + 0.22, y: mY - 0.05, w: rightW - 0.44, h: 0, line: { color: T.RULE, width: 0.5 } });
                const fs = heroPt(data.impactMetric.value, 30, 18, 4);
                s.addText(data.impactMetric.value, { x: rightX + 0.22, y: mY, w: rightW - 0.44, h: 0.5, fontSize: fs, color: T.TEAL, fontFace: FONT, valign: 'top', charSpacing: -2 });
                s.addText(truncate(data.impactMetric.label, 80), { x: rightX + 0.22, y: mY + 0.50, w: rightW - 0.44, h: 0.36, fontSize: 9, color: T.SECONDARY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
            }
        } else if (data.impactMetric && !hasImage && !hasStrip) {
            const fs = heroPt(data.impactMetric.value, 52, 24, 4);
            s.addText(data.impactMetric.value, { x: rightX + 0.22, y: panelY + 0.66, w: rightW - 0.44, h: 1.2, fontSize: fs, color: T.TEAL, fontFace: FONT, valign: 'top', charSpacing: -3 });
            s.addText(truncate(data.impactMetric.label, 100), { x: rightX + 0.22, y: panelY + 2.0, w: rightW - 0.44, h: 0.9, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        }
    }

    // ============================================================
    // FOOTER BAND (6.20 → 7.10) - ONE closing line, period.
    // Priority: implication > whyMatters. Drop the other to avoid overlap.
    // ============================================================
    const footerText = data.implication || data.whyMatters || '';
    const footerLabel = data.implication ? 'IMPLICATION' : (data.whyMatters ? 'WHY IT MATTERS' : '');
    if (footerText && footerLabel) {
        const footerH = FOOTER_BOTTOM - FOOTER_Y;
        s.addShape('line' as any, { x: tx, y: FOOTER_Y - 0.06, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(footerLabel, {
            x: tx, y: FOOTER_Y, w: 1.4, h: 0.22,
            fontSize: 7.5, color: accent, fontFace: FONT, bold: true, charSpacing: 2,
        });
        s.addText(truncate(footerText, 240), {
            x: tx + 1.45, y: FOOTER_Y, w: tw - 1.45, h: footerH - 0.08,
            fontSize: 10, color: T.INK, fontFace: FONT, bold: true,
            valign: 'top', lineSpacingMultiple: 1.45,
        });
    }

    // ============================================================
    // SOURCES FOOTER (handled by helper - places itself at slide bottom)
    // ============================================================
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
    // 2026-06-01 - advance by the REAL wrapped title height (was a fixed 0.85
    // that let a 3-line title collide into the columns below).
    y += titleH(slideTitle, tw, 26) + 0.16;

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
        s.addText(truncate(th.name, 64), { x: cx + 0.08, y: cy, w: colW - 0.16, h: 0.4, fontSize: 12, color: T.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2 });
        cy += 0.5;
        // 2026-06-01 - clamp insight to its box so a long body can't overflow
        // down into the quote (fixed cy advance below assumes ~1.4" of text).
        s.addText(truncate(th.insight, 240), { x: cx + 0.08, y: cy, w: colW - 0.16, h: 1.4, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
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

// 3a. THEME SPOTLIGHT (hero + supporting tiles) - v3.2 DENSIFIED
function exportThemeSpotlight(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.4;
    const tw = geom.contentW - 0.8;
    let y = 0.34;
    tag(s, tx, y, tw, 'EMERGING THEME - SPOTLIGHT');
    y += 0.26;
    title(s, tx, y, tw, slideTitle, 20); y += titleH(slideTitle, tw, 20) + 0.16;

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
    // Hero quote - smart-clipped, transcript-cleaned
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

    // Supporting signals - 2-sentence insight + SIGNAL metric per tile
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

// 3b. THEME ARC (numbered chain with progression connectors) - v3.2 DENSIFIED
function exportThemeArc(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.44;
    const tw = geom.contentW - 0.88;
    let y = 0.36;
    tag(s, tx, y, tw, 'THEMATIC ARC');
    y += 0.24;
    title(s, tx, y, tw, slideTitle, 20); y += titleH(slideTitle, tw, 20) + 0.16;

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

    // Body row - expanded insight, SIGNAL tag per step
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
        // SIGNAL metric tag - concrete proof the step is real
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

// 3c. THEME MOSAIC (2x2 grid) - v3.2 REDESIGNED
// Killed the B&W inverse-checkerboard. All 4 cells sit on a uniform ivory
// (PALE) surface, separated by hairline rules, with a single chartreuse
// accent bar on the PRIMARY cell (index 0). Order intentionally.
function exportThemeMosaic(s: any, slideTitle: string, data: ThemeClusterData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    tag(s, tx, y, tw, 'THEMATIC MOSAIC');
    y += 0.22;
    title(s, tx, y, tw, slideTitle, 20); y += titleH(slideTitle, tw, 20) + 0.16;

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
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

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
    // Quote text - smart-clipped, transcript-cleaned
    const qLen = (data.text || '').length;
    const quoteText = smartQuoteClip(data.text, hasSidebar ? 460 : 520);
    const quoteFs = hasSidebar
        ? (qLen > 340 ? 15 : qLen > 220 ? 18 : qLen > 140 ? 20 : 22)
        : (qLen > 280 ? 18 : qLen > 180 ? 22 : qLen > 110 ? 26 : 28);
    s.addText(quoteText, { x: tx, y, w: leftW, h: 2.6, fontSize: quoteFs, color: T.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4, charSpacing: -1 });
    y += 2.7;

    // CONTEXT paragraph - 3-4 sentences of who/when/why
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

    // CORROBORATING DATA sidebar - 2-3 supporting stats from OTHER sources
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

    // Source footer (deduplicated - data.source + any other sources not equal to it)
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
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

    // Subject meta strip
    const metaParts: string[] = [];
    if (data.subjectMeta) metaParts.push(data.subjectMeta);
    if (data.timeframe) metaParts.push(`TIMEFRAME  ${data.timeframe}`);
    if (data.investment) metaParts.push(`INVESTMENT  ${data.investment}`);
    if (metaParts.length > 0) {
        s.addShape('line' as any, { x: tx, y: y + 0.24, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(metaParts.join('      '), { x: tx, y, w: tw, h: 0.24, fontSize: 9, color: T.SECONDARY, fontFace: fMono(), valign: 'top' });
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
        s.addText(b.label, { x: tx + 0.18, y: by + 0.08, w: 1.05, h: 0.22, fontSize: 9, color: b.color, fontFace: fLabel(), bold: true, charSpacing: 1, valign: 'top', wrap: false });
        s.addText(truncate(b.text, 340), { x: tx + 1.2, y: by + 0.06, w: leftW - 1.35, h: blockH - 0.1, fontSize: 10, color: T.BODY, fontFace: fBody(), valign: 'top', lineSpacingMultiple: 1.5 });
        by += blockH + 0.06;
    });

    // LESSON FOR ADVANCEMENT - footer row synthesizing the takeaway
    if (hasLesson) {
        s.addShape('rect' as any, { x: tx, y: by, w: leftW, h: lessonH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y: by, w: 0.06, h: lessonH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText('LESSON', { x: tx + 0.18, y: by + 0.08, w: 1.05, h: 0.22, fontSize: 9, color: T.CHARTREUSE_BRIGHT, fontFace: fLabel(), bold: true, charSpacing: 1, valign: 'top', wrap: false });
        s.addText(truncate(data.lesson, 280), { x: tx + 1.2, y: by + 0.06, w: leftW - 1.35, h: lessonH - 0.1, fontSize: 10, color: T.INK, fontFace: fBody(), bold: true, valign: 'top', lineSpacingMultiple: 1.45 });
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
            s.addText('KEY OUTCOME', { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.22, fontSize: 8, color: T.CHARTREUSE_BRIGHT, fontFace: fLabel(), bold: true, charSpacing: 2, wrap: false });
            ry += 0.28;
            s.addText(data.keyMetric.value, { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 1.05, fontSize: fs, color: T.WHITE, fontFace: fDisplay(), valign: 'top', charSpacing: -3 });
            ry += 1.0;
            s.addText(truncate(data.keyMetric.label, 90), { x: rightX + 0.22, y: ry, w: rightW - 0.44, h: 0.55, fontSize: 10, color: 'F0F0F0', fontFace: fBody(), valign: 'top', lineSpacingMultiple: 1.35 });
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
                s.addText(m.value, { x: cx, y: cy, w: cellW, h: 0.3, fontSize: sz, color: T.CHARTREUSE_BRIGHT, fontFace: fDisplay(), valign: 'top', charSpacing: -2 });
                s.addText(truncate(m.label, 50), { x: cx, y: cy + 0.26, w: cellW, h: 0.28, fontSize: 8, color: 'F0F0F0', fontFace: fBody(), valign: 'top', lineSpacingMultiple: 1.3 });
            });
            ry += Math.ceil(sms.length / cols) * (cellH + 0.1) + 0.1;
        }
        // COMPARABLES strip - 2-3 peer orgs
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
        // Pull quote pinned near bottom - role included when available
        if (data.pullQuote) {
            const qy = panelY + panelH - 0.82;
            s.addShape('line' as any, { x: rightX + 0.22, y: qy - 0.08, w: rightW - 0.44, h: 0, line: { color: 'FFFFFF', width: 0.5, transparency: 85 } });
            s.addShape('rect' as any, { x: rightX + 0.22, y: qy, w: 0.04, h: 0.4, fill: { color: T.CHARTREUSE_BRIGHT } });
            s.addText(`"${smartQuoteClip(data.pullQuote.text, 200)}"`, { x: rightX + 0.32, y: qy, w: rightW - 0.54, h: 0.45, fontSize: 9, color: 'F0F0F0', fontFace: fontForRole('quote', T), italic: true, valign: 'top', lineSpacingMultiple: 1.4 });
            const pqAttr = `- ${data.pullQuote.attribution}${data.pullQuote.role ? `, ${data.pullQuote.role}` : ''}`;
            s.addText(truncate(pqAttr, 110), { x: rightX + 0.32, y: qy + 0.48, w: rightW - 0.54, h: 0.3, fontSize: 8, color: 'B0C4C5', fontFace: fMono(), valign: 'top', lineSpacingMultiple: 1.35 });
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
    title(s, tx, y, tw, slideTitle, 26); y += titleH(slideTitle, tw, 26) + 0.16;

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
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

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

    // CONVERGENT INSIGHT row - synthesis across all stats
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

// 10. SECTION DIVIDER (full bleed - overrides shell)
function exportSectionDivider(s: any, data: SectionDividerData) {
    s.addShape('rect' as any, { x: 0, y: 0, w: T.PPTX_W, h: T.PPTX_H, fill: { color: T.TEAL } });
    // Big number top-left - shrinks for 3+ digit section numbers (100+)
    const numSize = heroPt(data.number, 160, 72, 2);
    s.addText(data.number, { x: 0.7, y: 0.45, w: 4.5, h: 2.6, fontSize: numSize, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, valign: 'top', charSpacing: -6 });
    // SECTION label
    s.addText('SECTION', { x: 5.4, y: 0.85, w: 2.5, h: 0.25, fontSize: 10, color: T.CHARTREUSE_BRIGHT, fontFace: FONT, bold: true, charSpacing: 4 });
    s.addShape('line' as any, { x: 5.4, y: 1.15, w: 1.1, h: 0, line: { color: T.CHARTREUSE_BRIGHT, width: 1 } });
    // Title bottom-left - size scales down for long titles
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

// 11. SERVICE BLUEPRINT - grid with explicit heights so lanes can't collapse.
// Capped to 4 stages. Duration + emotion strip under phase header. Per-cell truncate.
function exportServiceBlueprint(s: any, slideTitle: string, data: ServiceBlueprintData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    tag(s, tx, y, tw, 'SERVICE BLUEPRINT'); y += 0.24;
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

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
        if (lw.includes('frustrat') || lw.includes('confus') || lw.includes('angry')) return '';
        if (lw.includes('hope') || lw.includes('excit') || lw.includes('curious')) return '';
        if (lw.includes('disappoint') || lw.includes('abandon')) return '️';
        if (lw.includes('delight') || lw.includes('satisf')) return '';
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
        s.addText(txt || '-', { x: tx + labelW + i * stageW + 0.08, y, w: stageW - 0.16, h: metaH, fontSize: 8, color: T.SECONDARY, fontFace: FONT, valign: 'middle' });
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
            s.addText(truncate(txt, 110) || '-', { x: cellX + 0.1, y: y + 0.08, w: stageW - 0.2, h: laneH - 0.12, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        });
        y += laneH;
    });

    // === Fail points row (red top rule) ===
    s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RED, width: 1.2 } });
    s.addShape('rect' as any, { x: tx, y, w: labelW, h: failH, fill: { color: 'FBEAEA' } });
    s.addText('FAIL\nPOINTS', { x: tx + 0.1, y: y + 0.06, w: labelW - 0.16, h: failH - 0.08, fontSize: 8, color: T.RED, fontFace: FONT, bold: true, charSpacing: 2, valign: 'top', lineSpacingMultiple: 1.15 });
    stages.forEach((st, i) => {
        const txt = st.painPoint || '-';
        const prefix = st.failPoint ? '  ' : '';
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

// ORG CHART (#org) - pptxgenjs FALLBACK twin of web OrgChartSlide / stage
// renderOrgChart. Primary export is the gold-stage pipeline; this keeps the
// fallback in parity: stacked TIER rows of node cards (ecru fill, hairline
// border, accent top border on the decision-authority node), centered hairline
// drops between tiers, NAMED source line per card. CSS-grid equivalent in shapes.
function exportOrgChart(s: any, slideTitle: string, data: OrgChartData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    tag(s, tx, y, tw, `ORG STRUCTURE · ${(data.subject || 'AS-IS').toUpperCase()}`); y += 0.24;
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

    const tiers = (data.tiers || []).slice(0, 4);
    const labelW = 1.05;
    const sourcesY = 7.10;
    const insightH = data.keyInsight ? 0.45 : 0;
    const connH = 0.16;
    const available = sourcesY - y - insightH - 0.2 - connH * Math.max(0, tiers.length - 1);
    const tierH = Math.max(0.78, available / Math.max(1, tiers.length));

    tiers.forEach((tier, ti) => {
        const nodes = (tier.nodes || []).slice(0, 5);
        s.addText((tier.label || '').toUpperCase(), { x: tx, y: y + 0.06, w: labelW - 0.12, h: tierH - 0.12, fontSize: 8, color: T.GREY, fontFace: FONT, bold: true, charSpacing: 1.5, valign: 'top' });
        const cardsX = tx + labelW;
        const cardsW = tw - labelW;
        const gap = 0.12;
        const cardW = nodes.length ? (cardsW - gap * (nodes.length - 1)) / nodes.length : cardsW;
        nodes.forEach((n, ni) => {
            const cx = cardsX + ni * (cardW + gap);
            s.addShape('rect' as any, { x: cx, y, w: cardW, h: tierH, fill: { color: T.PANEL }, line: { color: T.HAIRLINE, width: 0.75 } });
            if (n.emphasis) s.addShape('rect' as any, { x: cx, y, w: cardW, h: 0.05, fill: { color: T.CHARTREUSE } });
            s.addText(truncate(n.title || '', 50), { x: cx + 0.14, y: y + 0.13, w: cardW - 0.28, h: 0.42, fontSize: 12, color: T.INK, fontFace: T.FONT_TITLE || FONT, bold: true, valign: 'top' });
            s.addText(truncate(n.role || '', 120), { x: cx + 0.14, y: y + 0.55, w: cardW - 0.28, h: tierH - 0.92, fontSize: 9, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
            if (n.source) s.addText(`SOURCE: ${truncate(String(n.source).toUpperCase(), 36)}`, { x: cx + 0.14, y: y + tierH - 0.28, w: cardW - 0.28, h: 0.22, fontSize: 7.5, color: T.CYAN, fontFace: FONT, charSpacing: 0.5, valign: 'middle' });
        });
        y += tierH;
        if (ti < tiers.length - 1) {
            s.addShape('line' as any, { x: tx + labelW + (tw - labelW) / 2, y, w: 0, h: connH, line: { color: T.HAIRLINE, width: 1.5 } });
            y += connH;
        }
    });

    if (data.keyInsight) {
        s.addShape('rect' as any, { x: tx, y, w: tw, h: insightH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: insightH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(truncate(data.keyInsight, 260), { x: tx + 0.2, y, w: tw - 0.3, h: insightH, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// EXECUTIVE BRIEF (#brief / #explainer / #report) - pptxgenjs FALLBACK twin of
// web ExecutiveBriefSlide / stage renderExecutiveBrief. One template, three
// variants. Primary export is the gold-stage pipeline; this keeps parity/fallback.
function exportExecutiveBrief(s: any, slideTitle: string, data: ExecutiveBriefData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    const variant = data.variant || 'brief';
    const vlabel = variant === 'explainer' ? 'EXPLAINER' : variant === 'report' ? 'REPORT' : 'BRIEF';
    tag(s, tx, y, tw, `${vlabel} · ${(data.subject || 'EXECUTIVE SUMMARY').toUpperCase()}`); y += 0.24;
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.16;

    const sourcesY = 7.10;
    const insightH = data.keyInsight ? 0.45 : 0;
    // Hero callout (brief / report)
    if (data.hero?.stat && variant !== 'explainer') {
        const heroH = 0.7;
        s.addShape('rect' as any, { x: tx, y, w: tw, h: heroH, fill: { color: T.PANEL } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: heroH, fill: { color: T.CHARTREUSE } });
        s.addText(truncate(data.hero.stat, 40), { x: tx + 0.24, y, w: tw * 0.4, h: heroH, fontSize: 30, color: T.INK, fontFace: T.FONT_TITLE || FONT, bold: true, valign: 'middle' });
        s.addText(truncate(data.hero.label, 70).toUpperCase(), { x: tx + tw * 0.42, y, w: tw * 0.56, h: heroH, fontSize: 11, color: T.GREY, fontFace: FONT, charSpacing: 1.5, valign: 'middle' });
        y += heroH + 0.12;
    }
    const sections = (data.sections || []).slice(0, 6);
    const gotchas = variant === 'explainer' && Array.isArray(data.gotchas) ? data.gotchas.slice(0, 6) : [];
    const gotchasH = gotchas.length ? 0.95 : 0;
    const cols = sections.length <= 2 ? 1 : 2;
    const rows = Math.ceil(sections.length / cols);
    const gap = 0.14;
    const gridAvail = sourcesY - y - insightH - gotchasH - 0.2;
    const cardH = Math.max(0.7, (gridAvail - gap * (rows - 1)) / Math.max(1, rows));
    const cardW = (tw - gap * (cols - 1)) / cols;
    sections.forEach((sec, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const cx = tx + c * (cardW + gap);
        const cy = y + r * (cardH + gap);
        s.addShape('rect' as any, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: T.PANEL }, line: { color: T.HAIRLINE, width: 0.75 } });
        const head = (variant === 'explainer' ? `${String(i + 1).padStart(2, '0')}  ` : '') + truncate(sec.heading || '', 64);
        s.addText(head, { x: cx + 0.16, y: cy + 0.12, w: cardW - 0.32, h: 0.34, fontSize: 13, color: T.INK, fontFace: T.FONT_TITLE || FONT, bold: true, valign: 'top' });
        const hasQuote = !!sec.evidence?.quote;
        s.addText(truncate(sec.body || '', 220), { x: cx + 0.16, y: cy + 0.5, w: cardW - 0.32, h: cardH - (hasQuote ? 1.05 : 0.6), fontSize: 9.5, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35 });
        if (hasQuote) {
            s.addShape('rect' as any, { x: cx + 0.16, y: cy + cardH - 0.5, w: 0.03, h: 0.4, fill: { color: T.CYAN } });
            s.addText(`“${truncate(sec.evidence!.quote, 120)}”  — ${truncate(sec.evidence!.source || '', 36)}`, { x: cx + 0.26, y: cy + cardH - 0.5, w: cardW - 0.42, h: 0.4, fontSize: 8, italic: true, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.25 });
        }
    });
    y += rows * cardH + (rows - 1) * gap + 0.12;
    if (gotchas.length) {
        s.addShape('rect' as any, { x: tx, y, w: tw, h: gotchasH, fill: { color: 'FBEAEA' } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: gotchasH, fill: { color: T.RED } });
        s.addText('GOTCHAS', { x: tx + 0.2, y: y + 0.08, w: tw - 0.3, h: 0.24, fontSize: 9, color: T.RED, fontFace: FONT, bold: true, charSpacing: 2, valign: 'top' });
        s.addText(gotchas.map(g => `•  ${truncate(g, 110)}`).join('\n'), { x: tx + 0.2, y: y + 0.32, w: tw - 0.3, h: gotchasH - 0.36, fontSize: 9, color: T.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
        y += gotchasH + 0.1;
    }
    if (data.keyInsight) {
        s.addShape('rect' as any, { x: tx, y, w: tw, h: insightH, fill: { color: T.PALE } });
        s.addShape('rect' as any, { x: tx, y, w: 0.08, h: insightH, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(truncate(data.keyInsight, 260), { x: tx + 0.2, y, w: tw - 0.3, h: insightH, fontSize: 10, color: T.INK, fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.4 });
    }
    sourceFooter(s, tx, tw, sources);
}

// 12. GAP MATRIX (maturity bars + severity badges)
// === JOURNEY MAP (#journey - GOLD actor-lane matrix, 2026-06-11) ===
// Legacy-fallback twin of web JourneyMapSlide / stage renderJourneyMap. The
// PRIMARY export path is the gold stage pipeline; this keeps the pptxgenjs
// fallback in parity so a degraded export still draws the journey correctly:
// stages x ACTOR lanes, critical-stage accent header, "not engaged" greyed,
// PAIN POINTS row, optional 3 qualitative KPI tiles.
function exportJourneyMap(s: any, slideTitle: string, data: JourneyMapData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.32;
    const tw = geom.contentW - 0.64;
    let y = 0.28;
    const jt = data.journeyType ? `JOURNEY MAP · ${String(data.journeyType).toUpperCase()}` : 'JOURNEY MAP';
    tag(s, tx, y, tw, jt); y += 0.24;
    title(s, tx, y, tw, slideTitle, 22); y += titleH(slideTitle, tw, 22) + 0.12;

    const stagesRaw = Array.isArray(data.stages) ? data.stages.slice(0, 6) : [];
    const stages = stagesRaw.map(st => typeof st === 'string' ? { name: st, critical: false } : st);
    const lanes = (Array.isArray(data.lanes) ? data.lanes : []).slice(0, 4);
    if (stages.length === 0 || lanes.length === 0) return;

    // 2026-06-12 IN-TABLE REDESIGN (twin of stage renderJourneyMap): the
    // matrix IS the body. Personas -> voice row; per-phase pain STACKS;
    // opportunities row; kpiTiles EMBED in their phase header cells. All
    // arc-distributed by array position (item 1 -> first phase, last ->
    // final phase).
    const n = stages.length;
    const spread = (count: number): number[] => count <= 0 ? [] : count === 1 ? [0]
        : Array.from({ length: count }, (_, i) => Math.min(n - 1, Math.round((i * (n - 1)) / (count - 1))));
    const tiles = (data.kpiTiles || []).slice(0, 3);
    const tileByCol: (typeof tiles[number] | null)[] = stages.map(() => null);
    spread(tiles.length).forEach((col, i) => { tileByCol[col] = tiles[i]; });
    const personas = (data.personas || []).filter(Boolean).map(String);
    const voiceCols: string[][] = stages.map(() => []);
    spread(personas.length).forEach((col, i) => voiceCols[col].push(personas[i]));
    const painsAnyArr: Array<string | string[]> = Array.isArray(data.painPoints) ? data.painPoints : [];
    const painCols: string[][] = stages.map((_, si) => {
        const v = painsAnyArr[si];
        return Array.isArray(v) ? v.filter(Boolean).map(String) : (v ? [String(v)] : []);
    });
    const overallArr = (data.overallPainPoints || []).filter(Boolean).map(String);
    spread(overallArr.length).forEach((col, i) => painCols[col].push(overallArr[i]));
    const oppsArr = (data.opportunities || []).filter(Boolean).map(String);
    const oppCols: string[][] = stages.map(() => []);
    spread(oppsArr.length).forEach((col, i) => oppCols[col].push(oppsArr[i]));
    const hasVoice = personas.length > 0;
    const hasOpps = oppsArr.length > 0;
    const hasTiles = tiles.length > 0;
    const maxPainStack = Math.max(1, ...painCols.map(c => Math.min(c.length, 4)));

    const sourcesY = 7.10;
    const labelW = 1.25;
    const stageW = (tw - labelW) / stages.length;
    const headerH = hasTiles ? 0.58 : 0.3;
    const voiceH = hasVoice ? 0.42 : 0;
    const painH = Math.min(0.96, 0.3 + 0.17 * maxPainStack);
    const oppH = hasOpps ? 0.44 : 0;
    const laneH = Math.max(0.42, (sourcesY - y - headerH - voiceH - painH - oppH - (data.keyInsight ? 0.5 : 0) - 0.15) / lanes.length);

    // Stage header row (ink band, critical stage in accent; KPI signal embeds)
    s.addShape('rect' as any, { x: tx, y, w: labelW, h: headerH, fill: { color: T.INK } });
    stages.forEach((st, i) => {
        const x = tx + labelW + i * stageW;
        s.addShape('rect' as any, { x, y, w: stageW, h: headerH, fill: { color: st.critical ? T.RED : T.INK } });
        s.addText(truncate(st.name, 22).toUpperCase(), { x: x + 0.08, y: y + 0.02, w: stageW - 0.16, h: 0.22, fontSize: 8, color: T.WHITE, fontFace: fMono(), bold: true, charSpacing: 1, valign: 'middle', wrap: false });
        const t = tileByCol[i];
        if (t && hasTiles) {
            s.addText(truncate(t.label, 26).toUpperCase(), { x: x + 0.08, y: y + 0.24, w: stageW - 0.16, h: 0.12, fontSize: 6, color: T.CHARTREUSE_BRIGHT, fontFace: fMono(), bold: true, charSpacing: 1.2, valign: 'top', wrap: false });
            s.addText(truncate(t.value, 22), { x: x + 0.08, y: y + 0.35, w: stageW - 0.16, h: 0.2, fontSize: 13, color: T.WHITE, fontFace: fDisplay(), valign: 'top', wrap: false });
        }
    });
    y += headerH;

    // Personas voice row (JTBD quotes, arc-distributed)
    if (hasVoice) {
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText('PERSONAS', { x: tx + 0.08, y: y + 0.04, w: labelW - 0.16, h: 0.18, fontSize: 7.5, color: T.CYAN || T.INK, fontFace: FONT, bold: true, charSpacing: 0.5, valign: 'top', wrap: false });
        s.addText('JTBD voice', { x: tx + 0.08, y: y + 0.22, w: labelW - 0.16, h: 0.14, fontSize: 6, color: T.MUTED, fontFace: fMono(), valign: 'top', wrap: false });
        voiceCols.forEach((items, i) => {
            const cellX = tx + labelW + i * stageW;
            s.addShape('rect' as any, { x: cellX, y, w: stageW, h: voiceH, fill: { color: T.PALE } });
            s.addShape('line' as any, { x: cellX, y, w: 0, h: voiceH, line: { color: T.RULE, width: 0.5 } });
            if (items.length) s.addText(`“${truncate(items.join(' '), 95)}”`, { x: cellX + 0.08, y: y + 0.04, w: stageW - 0.16, h: voiceH - 0.08, fontSize: 7.5, color: T.BODY, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.2 });
        });
        y += voiceH;
    }

    // Actor lanes
    lanes.forEach(lane => {
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(truncate(lane.actor, 24).toUpperCase(), { x: tx + 0.08, y: y + 0.05, w: labelW - 0.16, h: 0.2, fontSize: 8, color: T.INK, fontFace: FONT, bold: true, charSpacing: 0.5, valign: 'top', wrap: false });
        if (lane.role) s.addText(truncate(lane.role, 28), { x: tx + 0.08, y: y + 0.24, w: labelW - 0.16, h: 0.16, fontSize: 6.5, color: T.MUTED, fontFace: fMono(), valign: 'top', wrap: false });
        stages.forEach((_, i) => {
            const cellX = tx + labelW + i * stageW;
            const txt = (lane.cells || [])[i] || '';
            const ghost = !txt.trim() || /^not engaged$/i.test(txt.trim());
            s.addShape('line' as any, { x: cellX, y, w: 0, h: laneH, line: { color: T.RULE, width: 0.5 } });
            s.addText(truncate(txt || 'not engaged', 100), { x: cellX + 0.08, y: y + 0.06, w: stageW - 0.16, h: laneH - 0.1, fontSize: 8.5, color: ghost ? T.MUTED : T.BODY, fontFace: FONT, italic: ghost, valign: 'top', lineSpacingMultiple: 1.3 });
        });
        y += laneH;
    });

    // Pain points row: STACKED per-phase items (>=3 evidenced per phase per
    // the 2026-06-12 user rule), one bullet paragraph per pain.
    s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.RED, width: 1.6 } });
    s.addText('PAIN POINTS', { x: tx + 0.08, y: y + 0.06, w: labelW - 0.16, h: painH - 0.1, fontSize: 8, color: T.RED, fontFace: FONT, bold: true, charSpacing: 1, valign: 'top', lineSpacingMultiple: 1.15 });
    stages.forEach((_, i) => {
        const cellX = tx + labelW + i * stageW;
        s.addShape('line' as any, { x: cellX, y, w: 0, h: painH, line: { color: T.RULE, width: 0.5 } });
        const items = painCols[i].slice(0, 4);
        if (items.length) {
            const runs = items.map((p, pi) => ({ text: `▪ ${truncate(p, 58)}`, options: { breakLine: pi < items.length - 1 } }));
            s.addText(runs as any, { x: cellX + 0.08, y: y + 0.05, w: stageW - 0.16, h: painH - 0.08, fontSize: 7, color: T.RED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.22 });
        }
    });
    y += painH;

    // Strategic opportunities row (cool accent, arc-distributed)
    if (hasOpps) {
        s.addShape('line' as any, { x: tx, y, w: tw, h: 0, line: { color: T.CYAN || T.INK, width: 1.6 } });
        s.addText('OPPORTUNITIES', { x: tx + 0.08, y: y + 0.05, w: labelW - 0.16, h: oppH - 0.08, fontSize: 7.5, color: T.CYAN || T.INK, fontFace: FONT, bold: true, charSpacing: 0.5, valign: 'top', wrap: false });
        oppCols.forEach((items, i) => {
            const cellX = tx + labelW + i * stageW;
            s.addShape('rect' as any, { x: cellX, y, w: stageW, h: oppH, fill: { color: T.PALE } });
            s.addShape('line' as any, { x: cellX, y, w: 0, h: oppH, line: { color: T.RULE, width: 0.5 } });
            if (items.length) {
                const runs = items.map((o, oi) => ({ text: `▪ ${truncate(o, 64)}`, options: { breakLine: oi < items.length - 1 } }));
                s.addText(runs as any, { x: cellX + 0.08, y: y + 0.05, w: stageW - 0.16, h: oppH - 0.08, fontSize: 7, color: T.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.22 });
            }
        });
        y += oppH;
    }
    y += 0.08;

    if (data.keyInsight) {
        s.addShape('rect' as any, { x: tx, y, w: tw, h: 0.42, fill: { color: T.INK } });
        s.addText(truncate(data.keyInsight, 220), { x: tx + 0.16, y: y + 0.04, w: tw - 0.32, h: 0.34, fontSize: 9.5, color: T.WHITE, fontFace: fDisplay(), valign: 'middle', lineSpacingMultiple: 1.2 });
    }
    sourceFooter(s, tx, tw, sources);
}

function exportGapMatrix(s: any, slideTitle: string, data: GapMatrixData, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.48;
    const tw = geom.contentW - 0.96;
    let y = 0.4;
    tag(s, tx, y, tw, 'MATURITY GAP ANALYSIS'); y += 0.28;
    title(s, tx, y, tw, slideTitle, 24); y += titleH(slideTitle, tw, 24) + 0.16;

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
    title(s, tx, y, tw, slideTitle, 24); y += titleH(slideTitle, tw, 24) + 0.16;

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

    // 2026-05-06 - DEEP-mode detection (matches the web renderer): single
    // feature with rich narrative fields → full-slide layout that renders
    // technical details, problem solved, stakeholders, and verbatim
    // evidence quotes. Multi-feature payloads keep the original 3-card
    // compact layout below.
    const single = allFeatures.length === 1 ? allFeatures[0] : null;
    const isDeep = !!(single && (single.technicalDetails || single.problemSolved || single.stakeholders || (Array.isArray(single.evidence) && single.evidence.length > 0)));

    if (isDeep && single) {
        const f = single;
        title(s, tx, y, tw, slideTitle, 20); y += titleH(slideTitle, tw, 20) + 0.16;

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
                { text: '  ', options: { bold: true, color: T.CHARTREUSE_BRIGHT, fontSize: 10, fontFace: FONT } },
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

    // COMPACT mode (default) - multi-feature side-by-side
    title(s, tx, y, tw, slideTitle, 24); y += titleH(slideTitle, tw, 24) + 0.16;
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
                { text: '  ', options: { bold: true, color: T.CHARTREUSE_BRIGHT, fontSize: 10, fontFace: FONT } },
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
    title(s, tx, y, tw, slideTitle, 24); y += titleH(slideTitle, tw, 24) + 0.16;

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
// JOURNEY BRIEF - 2026-05-26
// Renders a reasoning-model-distilled journey summary as a CLEAN TABULAR
// slide. Per the user directive: use the blueprint tabular layout (rect +
// text cells, NO SVG emotion curve, NO stretched theme boxes) to avoid the
// graphics/overlap issues that plagued the rasterized journey export.
// Structure: title + persona eyebrow → stage grid (cols = stages, rows =
// PAIN / OPPORTUNITY) → cross-cutting pains | strategic opportunities
// two-column block → KPI tiles → closing quote → sources.
function exportJourneyBrief(s: any, slideTitle: string, brief: JourneyBrief, sources: string[], geom: PanelGeom) {
    const tx = geom.contentX + 0.36;
    const tw = geom.contentW - 0.72;
    let y = 0.32;

    tag(s, tx, y, tw, `JOURNEY BRIEF  /  ${(brief.journey_type || 'GENERAL').toUpperCase()}`);
    y += 0.24;
    title(s, tx, y, tw, brief.diagnostic_title || slideTitle, 22);
    y += 0.78;

    if (brief.persona_line) {
        s.addShape('line' as any, { x: tx, y: y + 0.22, w: tw, h: 0, line: { color: T.RULE, width: 0.5 } });
        s.addText(brief.persona_line, { x: tx, y, w: tw, h: 0.24, fontSize: 9, color: T.SECONDARY, fontFace: fMono(), valign: 'top' });
        y += 0.34;
    }

    // === STAGE GRID (tabular - header row + PAIN row + OPPORTUNITY row) ===
    const stages = (brief.stages || []).slice(0, 6);
    if (stages.length > 0) {
        const labelColW = 1.15;
        const gridW = tw - labelColW;
        const colW = gridW / stages.length;
        const headerH = 0.42;
        const cellH = 1.05;

        // Header row: stage names
        s.addShape('rect' as any, { x: tx + labelColW, y, w: gridW, h: headerH, fill: { color: T.TEAL } });
        stages.forEach((st, i) => {
            const cx = tx + labelColW + i * colW;
            s.addText(truncate(st.name, 46), { x: cx + 0.08, y: y + 0.05, w: colW - 0.16, h: headerH - 0.08, fontSize: 9, color: T.WHITE, fontFace: fLabel(), bold: true, align: 'center', valign: 'middle', charSpacing: 1, lineSpacingMultiple: 1.1 });
        });
        y += headerH;

        // Row anatomy: label cell (col 1) + per-stage cells
        const rows: Array<{ label: string; pick: (st: typeof stages[number]) => string; color: string; bg: string }> = [
            { label: 'PAIN', pick: st => st.key_pain, color: T.RED, bg: 'FFF5F5' },
            { label: 'OPPORTUNITY', pick: st => st.key_opportunity, color: T.GREEN, bg: 'F0FBF5' },
        ];
        rows.forEach((row) => {
            // left label cell
            s.addShape('rect' as any, { x: tx, y, w: labelColW, h: cellH, fill: { color: T.PALE } });
            s.addShape('rect' as any, { x: tx, y, w: 0.05, h: cellH, fill: { color: row.color } });
            s.addText(row.label, { x: tx + 0.12, y: y + 0.08, w: labelColW - 0.18, h: 0.3, fontSize: 8, color: row.color, fontFace: fLabel(), bold: true, charSpacing: 1, valign: 'top', wrap: false });
            // per-stage cells
            stages.forEach((st, i) => {
                const cx = tx + labelColW + i * colW;
                s.addShape('rect' as any, { x: cx, y, w: colW, h: cellH, fill: { color: row.bg } });
                s.addShape('line' as any, { x: cx, y, w: 0, h: cellH, line: { color: T.RULE, width: 0.5 } });
                s.addText(truncate(row.pick(st) || '', 160), { x: cx + 0.08, y: y + 0.06, w: colW - 0.16, h: cellH - 0.1, fontSize: 8, color: T.BODY, fontFace: fBody(), valign: 'top', lineSpacingMultiple: 1.3 });
            });
            y += cellH;
        });
        y += 0.2;
    }

    // === CROSS-CUTTING PAINS | STRATEGIC OPPORTUNITIES (two-column text) ===
    const colGap = 0.3;
    const halfW = (tw - colGap) / 2;
    const listTop = y;
    const drawList = (lx: number, label: string, items: string[], labelColor: string) => {
        let ly = listTop;
        s.addText(label, { x: lx, y: ly, w: halfW, h: 0.2, fontSize: 8.5, color: labelColor, fontFace: fLabel(), bold: true, charSpacing: 2, wrap: false });
        ly += 0.26;
        (items || []).slice(0, 3).forEach((it, i) => {
            s.addText([
                { text: `${i + 1}.  `, options: { bold: true, color: labelColor, fontFace: fBody(), fontSize: 9 } },
                { text: truncate(it, 180), options: { color: T.BODY, fontFace: fBody(), fontSize: 9 } },
            ], { x: lx, y: ly, w: halfW, h: 0.5, valign: 'top', lineSpacingMultiple: 1.3 });
            ly += 0.5;
        });
        return ly;
    };
    const leftEnd = drawList(tx, 'CROSS-CUTTING PAINS', brief.cross_cutting_pains, T.RED);
    const rightEnd = drawList(tx + halfW + colGap, 'STRATEGIC OPPORTUNITIES', brief.strategic_opportunities, T.GREEN);
    y = Math.max(leftEnd, rightEnd) + 0.18;

    // === KPI TILES (clean text, 2-4) ===
    const kpis = (brief.kpis || []).slice(0, 4);
    if (kpis.length > 0) {
        const kGap = 0.16;
        const kW = (tw - (kpis.length - 1) * kGap) / kpis.length;
        const kH = 0.85;
        kpis.forEach((k, i) => {
            const kx = tx + i * (kW + kGap);
            s.addShape('rect' as any, { x: kx, y, w: kW, h: kH, fill: { color: i === 0 ? T.TEAL : T.PALE } });
            const numColor = i === 0 ? T.WHITE : T.INK;
            const labelColor = i === 0 ? 'F0F0F0' : T.MUTED;
            const fs = heroPt(k.value, 30, 18, 4);
            s.addText(k.value, { x: kx + 0.12, y: y + 0.1, w: kW - 0.24, h: 0.4, fontSize: fs, color: numColor, fontFace: fDisplay(), valign: 'top', charSpacing: -2 });
            s.addText(truncate(k.label, 60), { x: kx + 0.12, y: y + 0.52, w: kW - 0.24, h: 0.3, fontSize: 8, color: labelColor, fontFace: fBody(), valign: 'top', lineSpacingMultiple: 1.25 });
        });
        y += kH + 0.16;
    }

    // === CLOSING QUOTE (verbatim VOC) ===
    if (brief.closing_quote && brief.closing_quote.text) {
        s.addShape('rect' as any, { x: tx, y, w: 0.05, h: 0.5, fill: { color: T.CHARTREUSE_BRIGHT } });
        s.addText(`"${truncate(brief.closing_quote.text, 200)}"`, { x: tx + 0.16, y, w: tw - 0.3, h: 0.32, fontSize: 10, color: T.INK, fontFace: fontForRole('quote', T), italic: true, valign: 'top', lineSpacingMultiple: 1.35 });
        s.addText(`- ${truncate(brief.closing_quote.attribution, 90)}`, { x: tx + 0.16, y: y + 0.34, w: tw - 0.3, h: 0.22, fontSize: 8, color: T.MUTED, fontFace: fMono(), valign: 'top' });
    }

    sourceFooter(s, tx, tw, sources.length > 0 ? sources : brief.sources);
}

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
    journeyMap?: JourneyMapData;
    orgChart?: OrgChartData;
    executiveBrief?: ExecutiveBriefData;
    gapMatrix?: GapMatrixData;
    architectureMap?: ArchitectureMapData;
    prdFeature?: PrdFeatureData;
    systemsInventory?: SystemsInventoryData;
    journeyBrief?: JourneyBrief;
}

/**
 * Renders a single slide into an already-created PptxGenJS instance and returns.
 * Used by both single-slide and multi-slide deck exports. Handles brand swapping
 * so each slide can carry its own brand without polluting other slides.
 */
export async function renderSlideInto(pptx: any, args: ExportSlideArgs) {
    T = args.brand || nxtBrand;
    const s = pptx.addSlide();
    sanitizeAddText(s);
    const sources = args.sources || [];

    if (args.template === 'section-divider' && args.sectionDivider) {
        exportSectionDivider(s, args.sectionDivider);
        return;
    }

    // 2026-05-12 - Persona cards bake the image into the left-hand panel via
    // addBaseShell; tile-sourced recommendation slides render the image on
    // the right side via exportRecommendation, so we DO NOT want the base
    // shell to consume it. Only persona-card triggers shell-baked image.
    const useImage = args.template === 'persona-card' && !!args.imageUrl;
    const geom = await addBaseShell(s, useImage, args.imageUrl);

    switch (args.template) {
        case 'persona-card':
            if (args.persona) await exportPersona(s, args.title, args.persona, sources, geom);
            break;
        case 'recommendation':
            if (args.recommendation) exportRecommendation(s, args.title, args.recommendation, sources, geom, args.imageUrl);
            break;
        // theme-overview / theme-detail are the Figma-backed theme layouts (590:9 / 590:11).
        // In PPTX they export through the equal-column / hero-detail exporters (closest grid
        // shapes); theme-cluster/theme-spotlight ALIAS to the same exporters (2026-06-23 audit).
        case 'theme-overview':
        case 'theme-cluster':
            if (args.themeCluster) exportThemeCluster(s, args.title, args.themeCluster, sources, geom);
            break;
        case 'theme-detail':
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
        case 'journey-map':
            if (args.journeyMap) exportJourneyMap(s, args.title, args.journeyMap, sources, geom);
            break;
        case 'org-chart':
            if (args.orgChart) exportOrgChart(s, args.title, args.orgChart, sources, geom);
            break;
        case 'executive-brief':
            if (args.executiveBrief) exportExecutiveBrief(s, args.title, args.executiveBrief, sources, geom);
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
        case 'journey-brief':
            if (args.journeyBrief) exportJourneyBrief(s, args.title, args.journeyBrief, sources, geom);
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
    // Render sequentially - image preprocessing is async and PptxGenJS serializes shape order per slide
    for (const slide of slides) {
        await renderSlideInto(pptx, slide);
    }
    const name = deckName || `deck_${new Date().toISOString().split('T')[0]}_${slides.length}_slides`;
    await pptx.writeFile({ fileName: `${sanitize(name)}.pptx` });
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_') || 'slide';
