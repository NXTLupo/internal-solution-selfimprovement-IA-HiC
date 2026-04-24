import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Artifact } from '../types';

async function rasterize(el: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
    const rect = el.getBoundingClientRect();
    const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        width: rect.width,
        height: rect.height,
    });
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

export async function exportPng(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { dataUrl } = await rasterize(el);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${artifact.type}-${artifact.id}.png`;
    a.click();
}

export async function exportPdf(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { dataUrl, width, height } = await rasterize(el);
    // scale:2 produced a 2x pixel canvas; divide back out and convert to points (1px ~= 0.75pt at 96dpi)
    const pdfWidthPt = (width / 2) * 0.75;
    const pdfHeightPt = (height / 2) * 0.75;
    const pdf = new jsPDF({
        orientation: pdfWidthPt > pdfHeightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidthPt, pdfHeightPt],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidthPt, pdfHeightPt);
    pdf.save(`${artifact.type}-${artifact.id}.pdf`);
}

export async function exportPptx(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const { dataUrl } = await rasterize(el);
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: 13.333, height: 7.5 });
    pptx.layout = 'NXT_16x9';
    const slide = pptx.addSlide();
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'contain', w: 13.333, h: 7.5 } });
    await pptx.writeFile({ fileName: `${artifact.type}-${artifact.id}.pptx` });
}
