/**
 * RESULT EXPORTS - the download helpers the legacy ResultsView / HeuristicReportView still call.
 *
 * Stage 6.3 (2026-10-01, finding A9): `services/exportService.ts` carried a 480-line pptxgenjs deck
 * renderer (the LEGACY export path) next to three plain file-download helpers. The pptxgenjs renderer
 * is deleted. The deck export now goes the ONE way every other deck goes: each slide becomes a 1920x1080
 * #stage HTML twin (services/slideToStageHtml.ts) and the list is posted to the proxy's native editable
 * exporter (/api/gold/export-pptx-multi via services/goldArtifact.ts). The JSON / HTML helpers stay
 * because they never rendered anything; they serialize and download.
 *
 * `services/exportService.ts` is now a re-export shim kept only so `components/ResultsView.tsx` (not
 * editable in this pass) keeps compiling; repoint that import here and delete the shim.
 */

import type { AnalysisResult, Slide } from '../types';
import { stripMarkdown, resolveCitations, removeMetaNarration } from './slidePostProcessor';
import { getChunkSourceMap } from './researchFabricOrchestrator';

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

/** Cut at a word boundary, never mid-word. */
function cutAtWord(text: string, max: number): string {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const at = t.slice(0, max + 1).lastIndexOf(' ');
    return t.slice(0, at > max * 0.6 ? at : max).replace(/[\s,;:.]+$/, '').trim();
}

// ============================================================
// PPTX EXPORT (native editable, via the stage-HTML -> proxy path)
// ============================================================

/**
 * Export a legacy strategy deck (types.ts `Slide[]`) as ONE native editable .pptx. Each legacy slide is
 * projected onto the GOLD executive-brief twin (title, finding sections from the content bullets, the
 * verbatim quote as the first section's evidence, sources), rendered to #stage HTML, and shipped through
 * `exportGoldDeckPptx`. Text passes the same hygiene the legacy renderer applied (citation resolution,
 * markdown strip, meta-narration strip); the proxy scrub handles em-dashes and emoji.
 */
export async function exportPPTX(result: AnalysisResult, slides: Slide[]): Promise<void> {
    const [{ exportGoldDeckPptx }, { slideDataToStageHtml }] = await Promise.all([
        import('./goldArtifact'),
        import('./slideToStageHtml'),
    ]);
    const chunkMap = getChunkSourceMap();
    const clean = (text: string) => resolveCitations(stripMarkdown(removeMetaNarration(text || '')), undefined, chunkMap);
    const subject = cutAtWord(result.themes?.[0]?.name || result.methodology || 'Research', 60);

    const stageHtmlList: string[] = [];
    slides.forEach((s, idx) => {
        const bullets = (s.content || []).map(clean).filter(Boolean).slice(0, 5);
        const quote = clean(s.quote || '');
        const sections = bullets.map((b, i) => ({
            heading: cutAtWord(b, 90),
            body: b.length > 90 ? b : (i === 0 ? clean(s.narrative || '') : ''),
            evidence: i === 0 && quote ? { quote: cutAtWord(quote, 250), source: (s.sources || [])[0] || '' } : undefined,
        }));
        if (sections.length === 0 && (s.narrative || quote)) {
            sections.push({ heading: cutAtWord(clean(s.title), 90), body: clean(s.narrative || ''), evidence: quote ? { quote: cutAtWord(quote, 250), source: (s.sources || [])[0] || '' } : undefined });
        }
        try {
            stageHtmlList.push(slideDataToStageHtml({
                id: `legacy_${idx + 1}`,
                template: 'executive-brief',
                brand: 'nxt',
                title: clean(s.title),
                sources: (s.sources || []).map(clean).filter(Boolean),
                executiveBrief: {
                    variant: 'brief',
                    subject,
                    sections,
                    keyInsight: cutAtWord(clean(s.narrative || s.title), 140),
                },
            }));
        } catch (e: any) {
            console.warn(`[resultExports] slide ${idx + 1} did not render to stage HTML:`, e?.message || e);
        }
    });
    if (stageHtmlList.length === 0) throw new Error('No slides rendered; nothing to export');
    const name = `${subject.replace(/[^a-zA-Z0-9]+/g, '_') || 'HiC_Research'}_${stageHtmlList.length}_slides.pptx`;
    await exportGoldDeckPptx(stageHtmlList, name);
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
// HTML REPORT EXPORT (UX Heuristic Reports)
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
        // evidenceGap badge intentionally suppressed - delivered output must never expose
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
