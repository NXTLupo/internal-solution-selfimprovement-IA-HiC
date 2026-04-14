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

            } else if (layout === 'CONTENT_DATA_PANEL' || layout === 'CONTENT_INSIGHT_CHART') {
                // Archetype 3/4: 55/45 split with data panel
                const splitX = SW * 0.55;

                // Right panel background (#FAFAFA)
                s.addShape(pptx.ShapeType.rect, {
                    x: splitX, y: 0, w: SW - splitX, h: SH,
                    fill: { color: BRAND.bgSecondary },
                    line: { color: BRAND.borderTertiary, width: 0.5 },
                });

                // Left: heading + bullets
                s.addText(cleanText(slide.title), {
                    x: PX, y: PY, w: splitX - PX - 0.3, h: 0.8,
                    fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                    valign: 'top',
                });

                const bullets = (slide.content || []).slice(0, 3).map(c => cleanText(c)).filter(c => c.length > 0);
                if (bullets.length > 0) {
                    s.addText(bullets.map(b => ({
                        text: b,
                        options: { fontSize: 13, color: BRAND.textSecondary, bullet: { code: '2022', color: BRAND.cyan }, paraSpaceAfter: 10 },
                    })) as any, {
                        x: PX, y: PY + 1.0, w: splitX - PX - 0.4, h: SH - PY - 1.5,
                        fontFace: BRAND.fallbackFont, valign: 'top',
                    });
                }

                // Right: metric cards or quote
                const metrics = slide.metrics || [];
                const cardX = splitX + 0.3;
                const cardW = SW - splitX - 0.6;
                if (metrics.length > 0) {
                    let cardY = PY + 0.5;
                    for (let mi = 0; mi < Math.min(metrics.length, 4); mi++) {
                        const m = metrics[mi];
                        const accent = m.accentColor || PPTX_ACCENT_ROTATION[mi % 3];
                        // Metric card background
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
                } else if (slide.quote) {
                    // Quote card fallback
                    s.addShape(pptx.ShapeType.rect, {
                        x: cardX, y: PY + 0.5, w: cardW, h: 2.5,
                        fill: { color: BRAND.white },
                        line: { color: BRAND.borderSecondary, width: 0.5 },
                        rectRadius: 0.08,
                    });
                    s.addText(`"${cleanText(slide.quote)}"`, {
                        x: cardX + 0.3, y: PY + 0.7, w: cardW - 0.6, h: 2.0,
                        fontSize: 13, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary, italic: true,
                        valign: 'top',
                    });
                }

                addFootnotes(s, slide.sources || []);
                addSlideNumber(s, slideNum, totalSlides);

            } else if (layout === 'BENTO_GRID') {
                // Archetype 6: Bento insight grid
                s.addText(cleanText(slide.title), {
                    x: PX, y: PY, w: SW - PX * 2, h: 0.7,
                    fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                });

                // Render bento cells as positioned rectangles
                const cells = slide.bentoCells || [];
                const cellW = (SW - PX * 2 - 0.3) / 3;
                let cx = PX, cy = PY + 1.0;
                let col = 0;
                for (let ci = 0; ci < Math.min(cells.length, 6); ci++) {
                    const cell = cells[ci];
                    const span = cell.span || 1;
                    const w = cellW * span + (span > 1 ? 0.15 : 0);

                    s.addShape(pptx.ShapeType.rect, {
                        x: cx, y: cy, w, h: 2.2,
                        fill: { color: BRAND.bgSecondary },
                        line: { color: BRAND.borderTertiary, width: 0.5 },
                        rectRadius: 0.08,
                    });

                    if (cell.type === 'stat') {
                        s.addText(cell.value || '', {
                            x: cx + 0.25, y: cy + 0.3, w: w - 0.5, h: 0.7,
                            fontSize: 32, fontFace: BRAND.fallbackFont, color: cell.accentColor || BRAND.cyan,
                            fontWeight: 200 as any,
                        });
                        s.addText(cell.text || cell.label || '', {
                            x: cx + 0.25, y: cy + 1.1, w: w - 0.5, h: 0.6,
                            fontSize: 11, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                        });
                    } else if (cell.type === 'quote') {
                        s.addText(`"${cell.text || ''}"`, {
                            x: cx + 0.25, y: cy + 0.3, w: w - 0.5, h: 1.4,
                            fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.textSecondary, italic: true,
                            valign: 'top',
                        });
                        if (cell.attribution) {
                            s.addText(`-- ${cell.attribution}`, {
                                x: cx + 0.25, y: cy + 1.7, w: w - 0.5, h: 0.3,
                                fontSize: 9, fontFace: BRAND.fallbackFont, color: BRAND.textMuted,
                            });
                        }
                    }

                    col += span;
                    cx += w + 0.15;
                    if (col >= 3) { col = 0; cx = PX; cy += 2.4; }
                }

                addFootnotes(s, slide.sources || []);
                addSlideNumber(s, slideNum, totalSlides);

            } else if (layout === 'PROBLEM_SOLUTION') {
                // Archetype 7: Problem/solution split
                const splitX = SW * 0.55;

                // Divider line
                s.addShape(pptx.ShapeType.line, {
                    x: splitX, y: PY, w: 0, h: SH - PY * 2,
                    line: { color: BRAND.borderPrimary, width: 0.75 },
                });

                // Left: problem
                s.addText('THE CHALLENGE', {
                    x: PX, y: PY, w: 3, h: 0.25,
                    fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.negative, bold: true,
                    letterSpacing: 2.5 as any,
                });
                if (slide.problemStat) {
                    s.addText(`${slide.problemStat.value}${slide.problemStat.unit ? ' ' + slide.problemStat.unit : ''}`, {
                        x: PX, y: PY + 0.6, w: splitX - PX - 0.5, h: 1.0,
                        fontSize: 40, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary,
                        fontWeight: 200 as any,
                    });
                    s.addText(slide.problemStat.description, {
                        x: PX, y: PY + 1.8, w: splitX - PX - 0.5, h: 1.5,
                        fontSize: 13, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                    });
                } else {
                    s.addText(cleanText(slide.title), {
                        x: PX, y: PY + 0.5, w: splitX - PX - 0.5, h: 1.0,
                        fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                    });
                }

                // Right: solution
                s.addText('THE SOLUTION', {
                    x: splitX + 0.4, y: PY, w: 3, h: 0.25,
                    fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.cyan, bold: true,
                    letterSpacing: 2.5 as any,
                });
                const solPts = slide.solutionPoints || [];
                let spY = PY + 0.6;
                for (let si = 0; si < Math.min(solPts.length, 3); si++) {
                    // Accent bar
                    s.addShape(pptx.ShapeType.rect, {
                        x: splitX + 0.4, y: spY, w: 0.4, h: 0.03,
                        fill: { color: PPTX_ACCENT_ROTATION[si % 3] },
                    });
                    s.addText(solPts[si].title, {
                        x: splitX + 0.4, y: spY + 0.15, w: SW - splitX - 1, h: 0.3,
                        fontSize: 13, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                    });
                    s.addText(solPts[si].description, {
                        x: splitX + 0.4, y: spY + 0.5, w: SW - splitX - 1, h: 0.6,
                        fontSize: 11, fontFace: BRAND.fallbackFont, color: BRAND.textTertiary,
                    });
                    spY += 1.3;
                }

                addFootnotes(s, slide.sources || []);
                addSlideNumber(s, slideNum, totalSlides);

            } else {
                // Default: CONTENT_DATA_PANEL fallback (same as archetype 3)
                s.addText(cleanText(slide.title), {
                    x: PX, y: PY, w: SW - PX * 2, h: 0.7,
                    fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.textPrimary, bold: true,
                });
                const bullets = (slide.content || []).map(c => cleanText(c)).filter(c => c.length > 0);
                if (bullets.length > 0) {
                    s.addText(bullets.map(b => ({
                        text: b,
                        options: { fontSize: 13, color: BRAND.textSecondary, bullet: { code: '2022', color: BRAND.cyan }, paraSpaceAfter: 10 },
                    })) as any, {
                        x: PX, y: PY + 0.9, w: SW - PX * 2, h: SH - PY - 1.5,
                        fontFace: BRAND.fallbackFont, valign: 'top',
                    });
                }
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
