import React, { useState } from 'react';
import type { Artifact } from '../types';
import { exportPdf, exportPng, exportPptx } from '../services/artifactExporter';

interface Props {
    artifact: Artifact;
    getViewerElement: () => HTMLElement | null;
}

export const ExportMenu: React.FC<Props> = ({ artifact, getViewerElement }) => {
    const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'pptx'>(null);

    const run = async (fmt: 'pdf' | 'png' | 'pptx') => {
        const el = getViewerElement();
        if (!el) return;
        setBusy(fmt);
        try {
            if (fmt === 'pdf') await exportPdf(el, artifact);
            else if (fmt === 'png') await exportPng(el, artifact);
            else await exportPptx(el, artifact);
        } catch (e) {
            console.error(`[ExportMenu] ${fmt} export failed`, e);
            alert(`Export failed: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {(['pdf', 'png', 'pptx'] as const).map(f => (
                <button key={f} onClick={() => run(f)} disabled={busy !== null}
                    style={{
                        padding: '6px 12px', fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: 2, textTransform: 'uppercase', border: '1px solid #0D0D0D',
                        background: busy === f ? '#F0F0E8' : '#FFFFFF', cursor: busy === null ? 'pointer' : 'wait',
                    }}>
                    {busy === f ? 'Exporting…' : `Export ${f.toUpperCase()}`}
                </button>
            ))}
        </div>
    );
};
