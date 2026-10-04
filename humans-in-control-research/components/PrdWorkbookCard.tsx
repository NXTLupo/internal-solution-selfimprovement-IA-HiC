import React, { useState } from 'react';
import { redownloadPrdWorkbook, hasPrdWorkbook } from '../services/prdXlsx';

/**
 * #prd chat card (2026-10-02): the requirements workbook (.xlsx) is the PRIMARY output, so its download
 * button leads; the HTML PRD brief is the secondary link. Colors come from the caller (brand tokens via
 * CorpusChatPanel's brand helpers), never literals here.
 */
export interface PrdWorkbookMeta {
    /** Cache key in services/prdXlsx (the chat message id). */
    key: string;
    filename: string;
    title: string;
    brand: string;
    ok: boolean;
    requirementCount: number;
    briefUrl?: string;
}

export const PrdWorkbookCard: React.FC<{
    meta: PrdWorkbookMeta;
    accent: string;
    onAccent: string;
    ink: string;
    muted: string;
    paper: string;
}> = ({ meta, accent, onAccent, ink, muted, paper }) => {
    const [state, setState] = useState<{ busy: boolean; note: string }>({ busy: false, note: '' });
    // The workbook record lives in this window's memory: after a page reload the card from the restored
    // transcript cannot rebuild it, so it says so instead of offering a click that fails.
    const cached = hasPrdWorkbook(meta.key);
    const download = async () => {
        setState({ busy: true, note: '' });
        try {
            const r = await redownloadPrdWorkbook(meta.key);
            setState({ busy: false, note: `Downloaded ${r.filename}` });
        } catch (e: any) {
            setState({ busy: false, note: `Download failed: ${e?.message || 'unknown error'}` });
        }
    };
    const btn: React.CSSProperties = {
        padding: '10px 16px', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '1px',
        textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0,
    };
    return (
        <div style={{ marginTop: 10, border: `1px solid ${accent}`, background: paper, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
                Requirements workbook · #prd · {meta.brand}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ink, lineHeight: 1.3, marginBottom: 4 }}>{meta.title}</div>
            <div style={{ fontSize: 10, color: muted, marginBottom: 10 }}>
                {meta.requirementCount} requirement{meta.requirementCount === 1 ? '' : 's'} · {meta.filename}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                    onClick={download}
                    disabled={state.busy || !cached}
                    style={{ ...btn, background: accent, color: onAccent, opacity: state.busy || !cached ? 0.6 : 1, cursor: cached ? 'pointer' : 'default' }}
                    aria-label="Download requirements workbook (.xlsx)"
                >
                    {state.busy ? 'Building...' : 'Download requirements workbook (.xlsx)'}
                </button>
                {meta.briefUrl && (
                    <button
                        onClick={() => window.open(meta.briefUrl, '_blank', 'noopener,noreferrer,width=1280,height=900')}
                        style={{ ...btn, background: 'transparent', color: ink, border: `1px solid ${muted}` }}
                        aria-label="Open the PRD brief in a new window"
                    >
                        Open the PRD brief
                    </button>
                )}
            </div>
            {!cached && !state.note && <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>The workbook was built before this page reloaded and is no longer held in memory; the file downloaded at the time is the copy to use, or run #prd again to rebuild it.</div>}
            {state.note && <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>{state.note}</div>}
        </div>
    );
};
