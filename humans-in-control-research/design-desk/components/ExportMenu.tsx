import React, { useState } from 'react';
import type { Artifact } from '../types';
import type { DesignTokens } from '../services/designMdLoader';
import { exportPdf, exportPng, exportPptx } from '../services/artifactExporter';

interface Props {
    artifact: Artifact;
    tokens: DesignTokens;
    /** Optional — kept for backward compat but no longer used by the new exporter,
     *  which renders its own off-screen native-resolution version of the artifact. */
    getViewerElement?: () => HTMLElement | null;
}

export const ExportMenu: React.FC<Props> = ({ artifact, tokens }) => {
    const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'pptx'>(null);

    const run = async (fmt: 'pdf' | 'png' | 'pptx') => {
        setBusy(fmt);
        try {
            // 2026-05-26 — Journey/blueprint PPTX export goes through the
            // JOURNEY BRIEF path, NOT the rasterized-diagram path. The old
            // path stretched the interactive journey HTML (emotion curve +
            // theme boxes) into an unreadable slide. The brief path uses a
            // reasoning model (Opus/Sonnet) to distill the journey into a
            // structured summary, then renders it as a CLEAN TABULAR slide
            // (the user-directed blueprint tabular layout — no SVG, no
            // graphics overlap). PDF/PNG keep the visual diagram (rasterized
            // is fine for those formats); only editable PPTX gets the brief.
            const isJourneyLike = (artifact as any).type === 'freeform'
                && ((artifact as any).kind === 'journey' || (artifact as any).kind === 'blueprint');
            if (fmt === 'pptx' && isJourneyLike) {
                const ff = artifact as any;
                const { generateJourneyBrief } = await import('../../services/journeyBriefExporter');
                const { exportSlideToPPTX } = await import('../../components/slideTemplates/pptx');
                const { getBrand } = await import('../../components/slideTemplates/brands');
                const brandId: 'nu' | 'nxt' = (ff.brand === 'nu') ? 'nu' : 'nxt';
                const brief = await generateJourneyBrief({
                    journeyHtml: ff.html || '',
                    researchGoal: ff.title || 'Journey',
                    brand: brandId,
                });
                await exportSlideToPPTX({
                    template: 'journey-brief',
                    title: brief.diagnostic_title || ff.title || 'Journey Brief',
                    brand: getBrand(brandId),
                    journeyBrief: brief,
                    sources: brief.sources,
                });
                return;
            }
            if (fmt === 'pdf') await exportPdf(artifact, tokens);
            else if (fmt === 'png') await exportPng(artifact, tokens);
            else await exportPptx(artifact, tokens);
        } catch (e) {
            console.error(`[ExportMenu] ${fmt} export failed`, e);
            alert(`Export failed: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 6 }}>
            {(['pdf', 'png', 'pptx'] as const).map(f => (
                <button key={f} onClick={() => run(f)} disabled={busy !== null}
                    style={{
                        padding: '5px 10px', fontFamily: "'Archivo', sans-serif", fontSize: 9, fontWeight: 700,
                        letterSpacing: 1.5, textTransform: 'uppercase', border: '1px solid #0D0D0D',
                        background: busy === f ? '#F0F0E8' : '#FFFFFF', cursor: busy === null ? 'pointer' : 'wait',
                        borderRadius: 2,
                    }}>
                    {busy === f ? '…' : `Export ${f.toUpperCase()}`}
                </button>
            ))}
        </div>
    );
};
