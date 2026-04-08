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

// --- BRAND CONSTANTS ---
const BRAND = {
    teal: '115054',
    lime: 'CACA20',
    orange: 'FD8E2E',
    white: 'FFFFFF',
    black: '141414',
    gray: '525252',
    lightGray: 'E5E5E5',
    bgGray: 'FAFAFA',
    fontFamily: 'Archivo',
    fallbackFont: 'Arial',
};

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

    // Define master slide with NXT brand
    pptx.defineSlideMaster({
        title: 'NXT_MASTER',
        background: { color: BRAND.white },
        objects: [
            // Top teal bar
            { rect: { x: 0, y: 0, w: '100%', h: 0.4, fill: { color: BRAND.teal } } },
            // Bottom bar with lime accent
            { rect: { x: 0, y: 7.1, w: '100%', h: 0.4, fill: { color: BRAND.teal } } },
            { rect: { x: 8.5, y: 7.1, w: 1.5, h: 0.4, fill: { color: BRAND.lime } } },
            // Footer text
            { text: { text: 'NXT Humans | Intelligence Augmentation', options: { x: 0.3, y: 7.15, w: 4, h: 0.3, fontSize: 8, color: BRAND.white, fontFace: BRAND.fallbackFont } } },
        ],
    });

    // --- TITLE SLIDE ---
    const titleSlide = pptx.addSlide({ masterName: 'NXT_MASTER' });
    titleSlide.background = { color: BRAND.teal };
    titleSlide.addText('Intelligence Augmentation', {
        x: 0.8, y: 1.5, w: 8.4, h: 0.8,
        fontSize: 36, fontFace: BRAND.fallbackFont, color: BRAND.orange,
        fontWeight: 200 as any,
    });
    titleSlide.addText('Humans in Control Research', {
        x: 0.8, y: 2.3, w: 8.4, h: 1.0,
        fontSize: 28, fontFace: BRAND.fallbackFont, color: BRAND.white,
    });
    titleSlide.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
        x: 0.8, y: 3.5, w: 4, h: 0.5,
        fontSize: 14, fontFace: BRAND.fallbackFont, color: BRAND.lime,
    });

    // --- CONTENT SLIDES ---
    if (slides && slides.length > 0) {
        // Strategy deck slides
        for (const slide of slides) {
            const s = pptx.addSlide({ masterName: 'NXT_MASTER' });

            // Title
            s.addText(slide.title || '', {
                x: 0.8, y: 0.6, w: 8.4, h: 0.7,
                fontSize: 24, fontFace: BRAND.fallbackFont, color: BRAND.teal, bold: true,
            });

            // Content bullets
            if (slide.content && slide.content.length > 0) {
                const bullets = slide.content.map(c => ({
                    text: c,
                    options: { fontSize: 14, color: BRAND.black, bullet: { code: '2022' }, paraSpaceAfter: 8 }
                }));
                s.addText(bullets as any, {
                    x: 0.8, y: 1.5, w: 5.5, h: 4.0,
                    fontFace: BRAND.fallbackFont, valign: 'top',
                });
            }

            // Image (if available and not a data URI too large for PPTX)
            if (slide.imageUrl && slide.imageUrl.startsWith('data:')) {
                try {
                    s.addImage({
                        data: slide.imageUrl,
                        x: 6.5, y: 1.5, w: 3.2, h: 2.4,
                        rounding: true,
                    });
                } catch { /* skip if image embedding fails */ }
            }

            // Speaker notes
            if (slide.speakerNotes) {
                s.addNotes(slide.speakerNotes);
            }
        }
    } else {
        // Fallback: generate slides from analysis data

        // Themes slide
        if (result.themes && result.themes.length > 0) {
            const s = pptx.addSlide({ masterName: 'NXT_MASTER' });
            s.addText('KEY THEMES', {
                x: 0.8, y: 0.6, w: 8.4, h: 0.5,
                fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.lime, bold: true,
                letterSpacing: 3,
            });
            const themeBullets = result.themes.slice(0, 8).map(t => ({
                text: `${t.name}: ${t.description}`,
                options: { fontSize: 13, color: BRAND.black, bullet: { code: '2022' }, paraSpaceAfter: 6 }
            }));
            s.addText(themeBullets as any, {
                x: 0.8, y: 1.3, w: 8.4, h: 5.0,
                fontFace: BRAND.fallbackFont, valign: 'top',
            });
        }

        // Personas slides
        if (result.personas && result.personas.length > 0) {
            for (const p of result.personas) {
                const s = pptx.addSlide({ masterName: 'NXT_MASTER' });
                s.addText('PERSONA', {
                    x: 0.8, y: 0.6, w: 3, h: 0.3,
                    fontSize: 10, fontFace: BRAND.fallbackFont, color: BRAND.lime, bold: true, letterSpacing: 3,
                });
                s.addText(p.name, {
                    x: 0.8, y: 1.0, w: 5, h: 0.6,
                    fontSize: 22, fontFace: BRAND.fallbackFont, color: BRAND.teal, bold: true,
                });
                s.addText(p.role, {
                    x: 0.8, y: 1.6, w: 5, h: 0.4,
                    fontSize: 14, fontFace: BRAND.fallbackFont, color: BRAND.gray,
                });
                s.addText(`"${p.quote}"`, {
                    x: 0.8, y: 2.2, w: 5, h: 0.6,
                    fontSize: 13, fontFace: BRAND.fallbackFont, color: BRAND.black, italic: true,
                });
                s.addText(p.bio || '', {
                    x: 0.8, y: 3.0, w: 8.4, h: 2.0,
                    fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.gray, valign: 'top',
                });

                if (p.imageUrl && p.imageUrl.startsWith('data:')) {
                    try {
                        s.addImage({ data: p.imageUrl, x: 6.5, y: 0.8, w: 2.5, h: 2.5, rounding: true });
                    } catch { /* skip */ }
                }
            }
        }

        // Recommendations slide
        if (result.recommendations && result.recommendations.length > 0) {
            const s = pptx.addSlide({ masterName: 'NXT_MASTER' });
            s.addText('STRATEGIC RECOMMENDATIONS', {
                x: 0.8, y: 0.6, w: 8.4, h: 0.5,
                fontSize: 12, fontFace: BRAND.fallbackFont, color: BRAND.lime, bold: true, letterSpacing: 3,
            });
            const recBullets = result.recommendations.map(r => ({
                text: `[${r.impactLevel}] ${r.title}: ${r.description}`,
                options: { fontSize: 12, color: BRAND.black, bullet: { code: '2022' }, paraSpaceAfter: 8 }
            }));
            s.addText(recBullets as any, {
                x: 0.8, y: 1.3, w: 8.4, h: 5.0,
                fontFace: BRAND.fallbackFont, valign: 'top',
            });
        }
    }

    // --- CLOSING SLIDE ---
    const closeSlide = pptx.addSlide();
    closeSlide.background = { color: BRAND.teal };
    closeSlide.addText('NXT Humans', {
        x: 0.8, y: 2.5, w: 8.4, h: 1.0,
        fontSize: 36, fontFace: BRAND.fallbackFont, color: BRAND.white, align: 'center',
    });
    closeSlide.addText('Intelligence Augmentation', {
        x: 0.8, y: 3.5, w: 8.4, h: 0.6,
        fontSize: 20, fontFace: BRAND.fallbackFont, color: BRAND.orange, align: 'center',
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
