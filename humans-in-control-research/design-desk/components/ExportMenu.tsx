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
