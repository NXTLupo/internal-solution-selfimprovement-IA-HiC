import React, { useState } from 'react';
import type { Artifact } from '../types';
import type { DesignTokens } from '../services/designMdLoader';
import { exportPdf, exportPng, exportPptx } from '../services/artifactExporter';
import { normalizeBrandId } from '../../components/slideTemplates/brands';

interface Props {
    artifact: Artifact;
    tokens: DesignTokens;
    /** Optional - kept for backward compat but no longer used by the new exporter,
     *  which renders its own off-screen native-resolution version of the artifact. */
    getViewerElement?: () => HTMLElement | null;
}

export const ExportMenu: React.FC<Props> = ({ artifact, tokens }) => {
    const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'pptx'>(null);

    const run = async (fmt: 'pdf' | 'png' | 'pptx') => {
        setBusy(fmt);
        try {
            // 2026-06-05 - Journey/blueprint PPTX export rewired to the GOLD
            // pipeline. Was previously routed through slideTemplates/pptx.ts
            // (template='journey-brief'), a parallel renderer that drifted from
            // the chat preview. The structural fix emits the brief as a
            // 1920×1080 #stage HTML doc directly (journeyBriefToStageHtml in
            // services/goldArtifact.ts) and ships through /api/gold/export-pptx
            // for Playwright-driven editable text + pixel-accurate background.
            // Same renderer + same gold pipeline as every other PPTX export.
            // PDF / PNG still go through artifactExporter (visual diagram is
            // fine in those raster formats); only PPTX is rerouted.
            const isJourneyLike = (artifact as any).type === 'freeform'
                && ((artifact as any).kind === 'journey' || (artifact as any).kind === 'blueprint');
            if (fmt === 'pptx' && isJourneyLike) {
                const ff = artifact as any;
                const { generateJourneyBrief } = await import('../../services/journeyBriefExporter');
                const { exportGoldPptx, journeyBriefToStageHtml } = await import('../../services/goldArtifact');
                // 2026-10-01 - three brands (nxt | nu | deciem) resolve through ONE normalizer.
                // journeyBriefExporter / goldArtifact still declare the two-brand literal type; the
                // id is passed through unchanged so the DECIEM twin lights up the moment those
                // signatures widen (their owners' change), and the filename already carries it.
                const brandId = normalizeBrandId(ff.brand);
                const brief = await generateJourneyBrief({
                    journeyHtml: ff.html || '',
                    researchGoal: ff.title || 'Journey',
                    brand: brandId as 'nu' | 'nxt',
                });
                const stageHtml = journeyBriefToStageHtml(brief, brandId as 'nu' | 'nxt');
                const safeTitle = (brief.diagnostic_title || ff.title || 'journey-brief')
                    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
                await exportGoldPptx(stageHtml, `${safeTitle}-${brandId}.pptx`);
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
                    {busy === f ? '...' : `Export ${f.toUpperCase()}`}
                </button>
            ))}
        </div>
    );
};
