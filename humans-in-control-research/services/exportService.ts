/**
 * Export Service — Production-Grade Deliverable Export Engine
 *
 * Formats: PPTX (Strategy Decks), JSON (Structured Data), HTML (Heuristic Reports)
 * PDF export remains in ResultsView.tsx (uses html2canvas which needs DOM access)
 *
 * All exports include NXT Humans branding and model attribution metadata.
 */

import PptxGenJS from 'pptxgenjs';
import { AnalysisResult, Slide, SlideLayout, Persona, Theme, ServiceBlueprintStage, TechnicalArchitecture, PRD, StrategicRoadmap, StrategicRecommendation } from '../types';
import { stripMarkdown, resolveCitations, removeMetaNarration } from './slidePostProcessor';
import { getChunkSourceMap } from './researchFabricOrchestrator';

// --- BRAND CONSTANTS (NXT Humans Design Token System v1.0) ---
const BRAND = {
    // Surfaces
    white: 'FFFFFF',
    bgSecondary: 'FAFAFA',
    bgTertiary: 'F7F7F7',
    // Text
    textPrimary: '1A1A1A',
    textSecondary: '444444',
    textTertiary: '888888',
    textMuted: 'AAAAAA',
    textDisabled: 'CCCCCC',
    // Borders
    borderPrimary: 'E8E8E8',
    borderSecondary: 'EEEEEE',
    borderTertiary: 'F0F0F0',
    // Accents
    cyan: '00B7C3',
    chartreuse: 'B8B800',
    negative: 'CC6644',
    // Legacy (still used in some places)
    teal: '115054',
    lime: 'CACA20',
    orange: 'FD8E2E',
    black: '141414',
    gray: '525252',
    lightGray: 'E5E5E5',
    bgGray: 'FAFAFA',
    // Typography
    fontFamily: 'Helvetica Neue',
    fallbackFont: 'Arial',
};

/** Accent color rotation for metric cards in PPTX */
const PPTX_ACCENT_ROTATION = [BRAND.negative, BRAND.chartreuse, BRAND.cyan];

// --- DOWNLOAD HELPER ---
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================
// PPTX EXPORT
// ============================================================

export async function exportPPTX(result: AnalysisResult, slides: Slide[]): Promise<void> {
    const pptx = new PptxGenJS();
    pptx.author = 'NXT Humans Intelligence Augmentation';
    pptx.company = 'NXT Humans';
    pptx.subject = 'Research Analysis';
    pptx.title = result.themes?.[0]?.name ? `Research: ${result.themes[0].name}` : 'HiC Research Export';
    // 16:9 widescreen format — matches browser rendering exactly
    pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
    const SW = 13.33; // slide width
    const SH = 7.5;   // slide height
    const PX = 0.61;   // padding X (44px at 72dpi)
    const PY = 0.5;    // padding Y (36px at 72dpi)

    const chunkMap = getChunkSourceMap();
    const cleanText = (text: string) => resolveCitations(stripMarkdown(removeMetaNarration(text || '')), undefined, chunkMap);

    // Normalize legacy layouts
    const normalizeLayout = (layout: string): string => {
        const mapping: Record<string, string> = {
            'CONTENT_SPLIT_RIGHT': 'CONTENT_DATA_PANEL', 'CONTENT_SPLIT_LEFT': 'CONTENT_DATA_PANEL',
            'FULL_BLEED_IMAGE': 'CONTENT_DATA_PANEL', 'KEY_STATISTIC': 'CONTENT_DATA_PANEL',
            'PERSONA_SPOTLIGHT': 'CONTENT_DATA_PANEL', 'RECOMMENDATION': 'CONTENT_DATA_PANEL',
            'CLOSING_CTA': 'CONTENT_DATA_PANEL', 'TYPOGRAPHY_QUOTE': 'BENTO_GRID',
            'EVIDENCE_WALL': 'BENTO_GRID', 'QUOTE_FEATURE': 'BENTO_GRID',
            'DATA_INSIGHT': 'CONTENT_INSIGHT_CHART', 'COMPARISON': 'PROBLEM_SOLUTION',
        };
        return mapping[layout] || layout;
    };

    // --- Helper: add slide number ---
    const addSlideNumber = (s: any, num: number, total: number, color = BRAND.textDisabled) => {
        s.addText(`${num} / ${total}`, {
            x: SW - 1.2, y: SH - 0.4, w: 1, h: 0.3,
            fontSize: 10, fontFace: BRAND.fallbackFont, color, align: 'right',
        });
    };

    // --- Helper: add footnote strip ---
    const addFootnotes = (s: any, sources: string[]) => {
        if (!sources.length) return;
        s.addText(sources.slice(0, 4).join(' \u00B7 '), {
            x: PX, y: SH - 0.4, w: SW - 2.5, h: 0.3,
            fontSize: 9, fontFace: BRAND.fallbackFont, color: BRAND.textDisabled,
        });
    };

    const totalSlides = (slides?.length || 0) + 3; // +3 for title, closing, appendix

    // ====== TITLE SLIDE (Archetype 1) ======
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: BRAND.white };
    titleSlide.addText((result.selectedOutputs?.[0] || 'STRATEGIC ANALYSIS').replace(/_/g, ' '), {
        x: PX, y: SH * 0.55, w: 5, h: 0.25,
        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, bold: true,
        letterSpacing: 2.5 as any,
    });
    // Horizontal rule
    titleSlide.addShape(pptx.ShapeType.line, {
        x: PX, y: SH * 0.55 + 0.3, w: SW * 0.4, h: 0,
        line: { color: BRAND.borderPrimary, width: 0.75 },
    });
    const titleText = slides?.[0] ? cleanText(slides[0].title) : 'NXT Humans Research';
    titleSlide.addText(titleText, {
        x: PX, y: SH * 0.55 + 0.45, w: SW * 0.6, h: 1.2,
        fontSize: 32, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
    });
    titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
        x: PX, y: SH * 0.55 + 1.75, w: 4, h: 0.4,
        fontSize: 14, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
    });

    // ====== CONTENT SLIDES ======
    if (slides && slides.length > 0) {
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const layout = normalizeLayout(slide.layout);
            const s = pptx.addSlide();
            s.background = { color: layout === 'SECTION_HEADER' ? '0D0D0D' : BRAND.white };
            const slideNum = i + 2; // +1 for title slide, +1 for 1-indexing

            if (layout === 'SECTION_HEADER') {
                // Archetype 2: Dark section divider
                s.addText(`SECTION ${slide.slideNumber || i + 1}`, {
                    x: PX + 0.1, y: SH * 0.55, w: 4, h: 0.25,
                    fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.chartreuse, bold: true,
                    letterSpacing: 3 as any,
                });
                s.addText(cleanText(slide.title), {
                    x: PX + 0.1, y: SH * 0.55 + 0.35, w: SW * 0.6, h: 1.0,
                    fontSize: 28, fontFace: BRAND.fallbackFont, color: BRAND.white, bold: true,
                });
                addSlideNumber(s, slideNum, totalSlides, '404040');

            } else {
                // ====== ADAPTIVE BODY SLIDE — One flexible renderer for all content types ======
                // Mirrors the HTML renderer in ResultsView.tsx: content drives layout, not archetype.
                // If metrics or bentoCells exist, render 55/45 split; otherwise full-width.

                const metrics = slide.metrics || [];
                const bentoCells = slide.bentoCells || [];
                const hasRightPanel = metrics.length > 0 || bentoCells.length > 0;
                const splitX = SW * 0.55;
                const leftW = hasRightPanel ? (splitX - PX - 0.3) : (SW - PX * 2);

                // Right panel background (only when data exists for it)
                if (hasRightPanel) {
                    s.addShape(pptx.ShapeType.rect, {
                        x: splitX, y: 0, w: SW - splitX, h: SH,
                        fill: { color: BRAND.bgSecondary },
                        line: { color: BRAND.borderTertiary, width: 0.5 },
                    });
                }

                // --- LEFT SIDE ---
                let leftY = PY;

                // Section label (from rationale, small uppercase muted text)
                const sectionLabel = slide.rationale ? cleanText(slide.rationale).substring(0, 50) : '';
                if (sectionLabel) {
                    s.addText(sectionLabel, {
                        x: PX, y: leftY, w: leftW, h: 0.22,
                        fontSize: 9, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, bold: true,
                        letterSpacing: 2.5 as any,
                    });
                    leftY += 0.35;
                }

                // Title (22pt bold)
                s.addText(cleanText(slide.title), {
                    x: PX, y: leftY, w: leftW, h: 0.8,
                    fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                    valign: 'top',
                });
                leftY += 0.95;

                // Content bullets (12pt with accent dots, unconstrained count)
                const bullets = (slide.content || []).map(c => cleanText(c)).filter(c => c.length > 0);
                if (bullets.length > 0) {
                    const bulletItems = bullets.map((b, bi) => ({
                        text: b,
                        options: {
                            fontSize: 12,
                            color: BRAND.textSecondary,
                            bullet: { code: '2022', color: PPTX_ACCENT_ROTATION[bi % 3] },
                            paraSpaceAfter: 8,
                        },
                    }));
                    const bulletH = Math.min(bullets.length * 0.55, 3.0);
                    s.addText(bulletItems as any, {
                        x: PX, y: leftY, w: leftW, h: bulletH,
                        fontFace: BRAND.fallbackFont, valign: 'top',
                    });
                    leftY += bulletH + 0.15;
                }

                // Problem stat (red accent card, if present)
                if (slide.problemStat) {
                    s.addShape(pptx.ShapeType.rect, {
                        x: PX, y: leftY, w: leftW, h: 0.85,
                        fill: { color: 'FFF5F5' },
                        rectRadius: 0.04,
                    });
                    // Left accent strip
                    s.addShape(pptx.ShapeType.rect, {
                        x: PX, y: leftY, w: 0.04, h: 0.85,
                        fill: { color: BRAND.negative },
                    });
                    s.addText(`${slide.problemStat.value}${slide.problemStat.unit ? ' ' + slide.problemStat.unit : ''}`, {
                        x: PX + 0.2, y: leftY + 0.08, w: leftW - 0.4, h: 0.35,
                        fontSize: 24, fontFace: BRAND.fallbackFont, color: BRAND.negative,
                        fontWeight: 200 as any,
                    });
                    s.addText(cleanText(slide.problemStat.description), {
                        x: PX + 0.2, y: leftY + 0.45, w: leftW - 0.4, h: 0.3,
                        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                    });
                    leftY += 1.0;
                }

                // Solution points (accent bars, if present)
                const solPts = slide.solutionPoints || [];
                if (solPts.length > 0) {
                    for (let si = 0; si < Math.min(solPts.length, 3); si++) {
                        const spAccent = PPTX_ACCENT_ROTATION[si % 3];
                        // Accent bar
                        s.addShape(pptx.ShapeType.rect, {
                            x: PX, y: leftY, w: 0.4, h: 0.03,
                            fill: { color: spAccent },
                        });
                        s.addText(cleanText(solPts[si].title), {
                            x: PX, y: leftY + 0.12, w: leftW, h: 0.25,
                            fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                        });
                        s.addText(cleanText(solPts[si].description), {
                            x: PX, y: leftY + 0.4, w: leftW, h: 0.4,
                            fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                            valign: 'top',
                        });
                        leftY += 0.95;
                    }
                }

                // Quote on left side (only when no metrics — otherwise quote goes to right panel)
                if (slide.quote && !metrics.length) {
                    // Left accent border via thin rect
                    s.addShape(pptx.ShapeType.rect, {
                        x: PX, y: leftY + 0.05, w: 0.04, h: 0.7,
                        fill: { color: BRAND.cyan },
                    });
                    s.addText(`"${cleanText(slide.quote)}"`, {
                        x: PX + 0.2, y: leftY, w: leftW - 0.3, h: 0.8,
                        fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary, italic: true,
                        valign: 'top',
                    });
                    leftY += 0.9;
                }

                // Persona card (if personaName exists — small card with name/role)
                if (slide.personaName) {
                    s.addShape(pptx.ShapeType.rect, {
                        x: PX, y: leftY, w: Math.min(leftW, 4), h: 0.6,
                        fill: { color: BRAND.bgSecondary },
                        rectRadius: 0.04,
                    });
                    let personaText = slide.personaName;
                    if (slide.personaRole) personaText += `  |  ${slide.personaRole}`;
                    s.addText(personaText, {
                        x: PX + 0.2, y: leftY + 0.08, w: Math.min(leftW, 4) - 0.4, h: 0.2,
                        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                    });
                    if (slide.personaQuote) {
                        s.addText(`"${cleanText(slide.personaQuote)}"`, {
                            x: PX + 0.2, y: leftY + 0.3, w: Math.min(leftW, 4) - 0.4, h: 0.2,
                            fontSize: 9, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary, italic: true,
                        });
                    }
                }

                // --- RIGHT SIDE (only if hasRightPanel) ---
                if (hasRightPanel) {
                    const cardX = splitX + 0.3;
                    const cardW = SW - splitX - 0.6;

                    if (metrics.length > 0) {
                        // Metric cards (accent-bordered, large numbers)
                        let cardY = PY + 0.5;
                        for (let mi = 0; mi < Math.min(metrics.length, 4); mi++) {
                            const m = metrics[mi];
                            const accent = m.accentColor || PPTX_ACCENT_ROTATION[mi % 3];
                            // Card background
                            s.addShape(pptx.ShapeType.rect, {
                                x: cardX, y: cardY, w: cardW, h: 1.1,
                                fill: { color: BRAND.white },
                                line: { color: BRAND.borderSecondary, width: 0.5 },
                                rectRadius: 0.08,
                            });
                            // Left accent strip
                            s.addShape(pptx.ShapeType.rect, {
                                x: cardX, y: cardY, w: 0.04, h: 1.1,
                                fill: { color: accent },
                            });
                            // Label
                            s.addText((m.label || '').toUpperCase(), {
                                x: cardX + 0.2, y: cardY + 0.1, w: cardW - 0.4, h: 0.2,
                                fontSize: 9, fontFace: BRAND.fallbackFont, color: accent, bold: true,
                                letterSpacing: 1.5 as any,
                            });
                            // Value
                            s.addText(`${m.value}${m.unit ? ' ' + m.unit : ''}`, {
                                x: cardX + 0.2, y: cardY + 0.35, w: cardW - 0.4, h: 0.55,
                                fontSize: 28, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary,
                                fontWeight: 200 as any,
                            });
                            cardY += 1.3;
                        }

                        // Quote goes to right panel when metrics exist
                        if (slide.quote) {
                            s.addShape(pptx.ShapeType.rect, {
                                x: cardX, y: cardY + 0.1, w: 0.04, h: 0.7,
                                fill: { color: BRAND.cyan },
                            });
                            s.addText(`"${cleanText(slide.quote)}"`, {
                                x: cardX + 0.2, y: cardY + 0.05, w: cardW - 0.4, h: 0.8,
                                fontSize: 11, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary, italic: true,
                                valign: 'top',
                            });
                        }

                    } else if (bentoCells.length > 0) {
                        // Bento cells in 2-column grid on right panel
                        const bentoColW = (cardW - 0.12) / 2;
                        let bx = cardX, by = PY + 0.5;
                        let bCol = 0;
                        for (let ci = 0; ci < Math.min(bentoCells.length, 6); ci++) {
                            const cell = bentoCells[ci];
                            const span = cell.span === 2 ? 2 : 1;
                            const cellW = span === 2 ? cardW : bentoColW;

                            // Cell background
                            s.addShape(pptx.ShapeType.rect, {
                                x: bx, y: by, w: cellW, h: 1.3,
                                fill: { color: BRAND.white },
                                line: { color: BRAND.borderSecondary, width: 0.5 },
                                rectRadius: 0.06,
                            });

                            if (cell.type === 'stat') {
                                s.addText(cell.value || '', {
                                    x: bx + 0.15, y: by + 0.15, w: cellW - 0.3, h: 0.5,
                                    fontSize: 22, fontFace: BRAND.fallbackFont,
                                    color: cell.accentColor || BRAND.cyan,
                                    fontWeight: 200 as any,
                                });
                                s.addText(cell.label || cell.text || '', {
                                    x: bx + 0.15, y: by + 0.7, w: cellW - 0.3, h: 0.4,
                                    fontSize: 9, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                                });
                            } else if (cell.type === 'quote') {
                                s.addText(`"${cell.text || ''}"`, {
                                    x: bx + 0.15, y: by + 0.15, w: cellW - 0.3, h: 0.85,
                                    fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary,
                                    italic: true, valign: 'top',
                                });
                                if (cell.attribution) {
                                    s.addText(`-- ${cell.attribution}`, {
                                        x: bx + 0.15, y: by + 1.0, w: cellW - 0.3, h: 0.2,
                                        fontSize: 8, fontFace: BRAND.fallbackFont, color: BRAND.textMuted,
                                    });
                                }
                            } else {
                                // indicator / list cell types
                                if (cell.label) {
                                    s.addText(cell.label.toUpperCase(), {
                                        x: bx + 0.15, y: by + 0.12, w: cellW - 0.3, h: 0.18,
                                        fontSize: 8, fontFace: BRAND.fallbackFont, color: BRAND.cyan,
                                        bold: true, letterSpacing: 1 as any,
                                    });
                                }
                                const cellContent = cell.text || (cell.items || []).join(', ');
                                if (cellContent) {
                                    s.addText(cellContent, {
                                        x: bx + 0.15, y: by + 0.35, w: cellW - 0.3, h: 0.75,
                                        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary,
                                        valign: 'top',
                                    });
                                }
                            }

                            bCol += span;
                            bx += cellW + 0.12;
                            if (bCol >= 2) { bCol = 0; bx = cardX; by += 1.45; }
                        }
                    }
                }

                // --- BOTTOM ---
                addFootnotes(s, slide.sources || []);
                addSlideNumber(s, slideNum, totalSlides);
            }

            // Speaker notes
            const noteParts = [
                slide.narrative ? cleanText(slide.narrative) : '',
                slide.speakerNotes ? cleanText(slide.speakerNotes) : '',
            ].filter(Boolean);
            if (noteParts.length > 0) s.addNotes(noteParts.join('\n\n'));
        }
    }

    // ====== CLOSING SLIDE ======
    const closeSlide = pptx.addSlide();
    closeSlide.background = { color: '0D0D0D' };
    closeSlide.addText('NXT Humans', {
        x: PX, y: SH * 0.4, w: SW - PX * 2, h: 1.0,
        fontSize: 36, fontFace: BRAND.fallbackFont, color: BRAND.white, align: 'center',
        fontWeight: 700 as any,
    });
    closeSlide.addText('Intelligence Augmentation', {
        x: PX, y: SH * 0.4 + 1.0, w: SW - PX * 2, h: 0.5,
        fontSize: 18, fontFace: BRAND.fallbackFont, color: BRAND.chartreuse, align: 'center',
        fontWeight: 200 as any,
    });

    // ====== APPENDIX: Evidence Base ======
    const appendixSlide = pptx.addSlide();
    appendixSlide.background = { color: BRAND.white };
    appendixSlide.addText('APPENDIX', {
        x: PX, y: PY, w: 3, h: 0.25,
        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, bold: true,
        letterSpacing: 2.5 as any,
    });
    appendixSlide.addText('Evidence Base', {
        x: PX, y: PY + 0.35, w: SW * 0.6, h: 0.7,
        fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
    });

    // Themes listing
    const themesList = (result.themes || []).map(t => ({
        text: `${t.name}: ${t.description}`,
        options: { fontSize: 10, color: BRAND.textSecondary, bullet: { code: '2022', color: BRAND.chartreuse }, paraSpaceAfter: 4 },
    }));
    if (themesList.length > 0) {
        appendixSlide.addText('THEMES', {
            x: PX, y: PY + 1.2, w: 3, h: 0.25,
            fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, bold: true,
            letterSpacing: 1.5 as any,
        });
        appendixSlide.addText(themesList as any, {
            x: PX, y: PY + 1.55, w: SW - PX * 2, h: 2.5,
            fontFace: BRAND.fallbackFont, valign: 'top',
        });
    }

    // Source names
    const sourceNames = new Set<string>();
    (slides || []).forEach(sl => {
        (sl.sources || []).forEach(src => sourceNames.add(src));
        (sl.content || []).forEach(c => {
            const m = c.match(/\((?:Source(?:s)?:\s*)?([^)]+)\)/g);
            if (m) m.forEach(match => { const n = match.replace(/\((?:Source(?:s)?:\s*)?/, '').replace(/\)$/, '').trim(); if (n) sourceNames.add(n); });
        });
    });
    (result.themes || []).forEach(t => {
        ((t as any).citations || []).forEach((c: any) => {
            if (typeof c === 'string') sourceNames.add(c);
            else if (c?.sourceName) sourceNames.add(c.sourceName);
            else if (c?.source) sourceNames.add(c.source);
        });
    });

    const summaryY = themesList.length > 0 ? PY + 4.2 : PY + 1.5;
    appendixSlide.addText('DATA SOURCES', {
        x: PX, y: summaryY, w: 3, h: 0.25,
        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, bold: true,
        letterSpacing: 1.5 as any,
    });
    const sourceLines = sourceNames.size > 0
        ? Array.from(sourceNames).slice(0, 15)
        : ['Sources embedded in analysis (see individual slides)'];
    appendixSlide.addText(sourceLines.map(s => ({
        text: s,
        options: { fontSize: 10, color: BRAND.textTertiary, bullet: { code: '2022', color: BRAND.textMuted }, paraSpaceAfter: 2 },
    })) as any, {
        x: PX, y: summaryY + 0.35, w: SW - PX * 2, h: 2.0,
        fontFace: BRAND.fallbackFont, valign: 'top',
    });

    const totalEvidenceCount = (result.themes || []).reduce((sum, t) => sum + ((t as any).citations?.length || 0), 0);
    appendixSlide.addText(`Evidence Items: ${totalEvidenceCount || 'N/A'}  |  Themes: ${(result.themes || []).length}  |  Sources: ${sourceNames.size || 'N/A'}`, {
        x: PX, y: SH - 0.6, w: SW - PX * 2, h: 0.3,
        fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.textMuted, italic: true, align: 'center',
    });

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    downloadBlob(blob, 'NXT_Humans_Research_Deck.pptx');
}

// ============================================================
// JSON EXPORT
// ============================================================

export function exportJSON(result: AnalysisResult): void {
    const exportData = {
        _meta: {
            exportedAt: new Date().toISOString(),
            exportedBy: 'NXT Humans Intelligence Augmentation - Humans in Control Research',
            version: '2.0',
            schema: 'https://nxthumans.com/schemas/hic-research-v2',
        },
        methodology: result.methodology,
        selectedOutputs: result.selectedOutputs,
        themes: result.themes,
        personas: (result.personas || []).map(p => ({
            ...p,
            imageUrl: p.imageUrl ? '[base64 image omitted]' : undefined,
        })),
        journeyMap: result.journeyMap,
        techArchitecture: result.techArchitecture ? {
            ...result.techArchitecture,
            diagramUrl: result.techArchitecture.diagramUrl ? '[base64 image omitted]' : undefined,
        } : undefined,
        prd: result.prd,
        roadmap: result.roadmap,
        recommendations: result.recommendations,
        slides: (result.slides || []).map(s => ({
            ...s,
            imageUrl: s.imageUrl ? '[base64 image omitted]' : undefined,
        })),
        videoScript: (result.videoScript || []).map(s => ({
            ...s,
            imageUrl: s.imageUrl ? '[base64 image omitted]' : undefined,
            videoUrl: s.videoUrl ? '[video omitted]' : undefined,
        })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, 'NXT_Humans_Research_Export.json');
}

// ============================================================
// HTML REPORT EXPORT (for future UX Heuristic Reports)
// ============================================================

export function exportHTML(title: string, sections: { heading: string; content: string }[], rawJSON?: any): void {
    const sectionsHTML = sections.map(s => `
        <section class="section">
            <h2>${s.heading}</h2>
            <div>${s.content}</div>
        </section>
    `).join('\n');

    const jsonToggle = rawJSON ? `
        <section class="section">
            <h2>Raw Data</h2>
            <button onclick="document.getElementById('raw-json').style.display=document.getElementById('raw-json').style.display==='none'?'block':'none'" style="background:#caca20;color:#115054;border:none;padding:8px 16px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;border-radius:2px;">Toggle JSON</button>
            <pre id="raw-json" style="display:none;background:#fafafa;padding:16px;border:1px solid #e5e5e5;border-radius:4px;overflow-x:auto;font-size:12px;margin-top:12px;">${JSON.stringify(rawJSON, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </section>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | NXT Humans Intelligence Augmentation</title>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@200;300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Archivo', 'Arial', sans-serif; font-weight: 300; color: #141414; background: #fff; line-height: 1.6; }
        .header { background: #115054; padding: 40px 48px; position: relative; overflow: hidden; }
        .header::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 40%; background: linear-gradient(45deg, rgba(253,142,46,0.08), rgba(253,142,46,0.2)); }
        .header h1 { color: #fff; font-weight: 200; font-size: 32px; position: relative; z-index: 1; }
        .header .subtitle { color: #fd8e2e; font-weight: 200; font-size: 20px; position: relative; z-index: 1; }
        .header .date { color: #caca20; font-size: 14px; margin-top: 8px; position: relative; z-index: 1; }
        .container { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
        .section { margin-bottom: 48px; }
        .section h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #115054; border-bottom: 2px solid #caca20; padding-bottom: 8px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #fafafa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #525252; padding: 12px; text-align: left; border-bottom: 2px solid #e5e5e5; }
        td { padding: 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
        .footer { background: #115054; padding: 24px 48px; color: #fff; font-size: 12px; text-align: center; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-high { background: #FF5A5A; color: #fff; }
        .badge-medium { background: #fd8e2e; color: #fff; }
        .badge-low { background: #0CCE6B; color: #fff; }
        @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">Intelligence Augmentation</div>
        <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="container">
        ${sectionsHTML}
        ${jsonToggle}
    </div>
    <div class="footer">NXT Humans | Humans in Control Research | Generated ${new Date().toISOString()}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
}

// ============================================================
// STRATEGIC REPORT HTML EXPORT
// ============================================================

export function exportStrategicReportHTML(report: any): void {
    if (!report) return;
    const sections = (report.sections || []).map((s: any) => {
        let html = `<div class="report-section">`;
        html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">`;
        html += `<h2 style="font-size:20px;font-weight:700;color:#1A1A1A;margin:0;">${String(s.sectionNumber).padStart(2, '0')}. ${s.title}</h2>`;
        html += `<span style="font-size:9px;background:#115054;color:white;padding:2px 8px;border-radius:2px;text-transform:uppercase;letter-spacing:1px;">${s.sourceDeliverable || ''}</span>`;
        html += `</div>`;
        html += `<div style="font-size:13px;line-height:1.7;color:#444;">${(s.content || '').replace(/\n/g, '<br/>')}</div>`;
        if (s.keyMetrics?.length) {
            html += `<div style="display:flex;gap:12px;margin-top:16px;">`;
            s.keyMetrics.forEach((m: any, i: number) => {
                const colors = ['#CC6644', '#B8B800', '#00B7C3'];
                html += `<div style="flex:1;background:#FAFAFA;border:1px solid #E5E5E5;border-left:3px solid ${colors[i % 3]};padding:12px;border-radius:4px;">`;
                html += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:1px;">${m.label}</div>`;
                html += `<div style="font-size:24px;font-weight:200;color:#1A1A1A;">${m.value}</div>`;
                if (m.context) html += `<div style="font-size:10px;color:#888;margin-top:4px;">${m.context}</div>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
        if (s.keyQuote) {
            html += `<div style="margin-top:16px;padding-left:16px;border-left:3px solid #B8B800;">`;
            html += `<div style="font-size:13px;font-style:italic;color:#555;">"${s.keyQuote.text}"</div>`;
            html += `<div style="font-size:10px;color:#888;margin-top:4px;">-- ${s.keyQuote.attribution} (${s.keyQuote.source})</div>`;
            html += `</div>`;
        }
        // evidenceGap badge intentionally suppressed — delivered output must never expose
        // QA-style annotations to the reader (per user directive 2026-05-05).
        if (s.citations?.length) {
            html += `<div style="margin-top:12px;font-size:9px;color:#999;">Sources: ${s.citations.join(' | ')}</div>`;
        }
        html += `</div>`;
        return html;
    }).join('');

    const pillarsHTML = (report.strategicPillars || []).map((p: string, i: number) => {
        const colors = ['#CC6644', '#B8B800', '#00B7C3', '#888888', '#115054'];
        return `<div style="flex:1;padding:12px;background:#FAFAFA;border-top:3px solid ${colors[i % 5]};border-radius:4px;"><div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;">Pillar ${i + 1}</div><div style="font-size:12px;font-weight:700;color:#1A1A1A;margin-top:4px;">${p}</div></div>`;
    }).join('');

    const citationIndexHTML = (report.citationIndex || []).length > 0
        ? `<div style="margin-top:40px;border-top:2px solid #E5E5E5;padding-top:20px;">
            <h2 style="font-size:16px;font-weight:700;color:#1A1A1A;">Citation Index</h2>
            <div style="columns:2;column-gap:20px;font-size:10px;color:#666;margin-top:12px;">
            ${(report.citationIndex || []).map((c: any) => `<div style="break-inside:avoid;margin-bottom:6px;"><strong>${c.sourceName}</strong>${c.sourceUrl ? ` <a href="${c.sourceUrl}" style="color:#115054;">[link]</a>` : ''} <span style="color:#999;">T${c.tier} | Cited in sections: ${(c.citedInSections || []).join(', ')}</span></div>`).join('')}
            </div></div>`
        : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${report.title || 'Strategic Research Report'}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1A1A1A; }
    .header { background: #0D0D0D; color: #fff; padding: 48px; }
    .header h1 { font-size: 28px; font-weight: 800; max-width: 70%; line-height: 1.2; }
    .header .subtitle { font-size: 10px; color: #B8B800; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; }
    .header .date { font-size: 12px; color: #888; margin-top: 12px; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px; }
    .exec-summary { background: #FAFAFA; border: 1px solid #E5E5E5; padding: 32px; border-radius: 4px; margin-bottom: 32px; font-size: 14px; line-height: 1.8; color: #333; }
    .diagnosis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .diagnosis-grid > div { padding: 20px; border: 1px solid #E5E5E5; border-radius: 4px; }
    .report-section { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #F0F0F0; }
    .footer { text-align: center; font-size: 10px; color: #999; padding: 32px; border-top: 1px solid #E5E5E5; margin-top: 40px; }
    @media print { body { font-size: 11px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
    <div class="header">
        <div class="subtitle">NXT Humans | Intelligence Augmentation</div>
        <h1>${report.title || 'Strategic Research Report'}</h1>
        <div class="date">${report.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="container">
        <div class="exec-summary">${(report.executiveSummary || '').replace(/\n/g, '<br/>')}</div>
        <div class="diagnosis-grid">
            <div><div style="font-size:9px;font-weight:700;color:#CC6644;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Diagnosis</div><div style="font-size:13px;line-height:1.6;">${report.diagnosis || ''}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#00B7C3;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Guiding Policy</div><div style="font-size:13px;line-height:1.6;">${report.guidingPolicy || ''}</div></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:32px;">${pillarsHTML}</div>
        ${sections}
        ${citationIndexHTML}
    </div>
    <div class="footer">NXT Humans | Humans in Control Research | Generated ${new Date().toISOString()}</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, `${(report.title || 'Strategic_Report').replace(/[^a-zA-Z0-9]/g, '_')}.html`);
}
