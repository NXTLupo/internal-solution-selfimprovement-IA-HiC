import React, { useEffect, useState } from 'react';
import { DesignDeskChat } from './DesignDeskChat';
import { ArtifactViewer } from './ArtifactViewer';
import { loadDesignMd, type ParsedDesignMd } from './services/designMdLoader';
import { useDesignDeskStore } from './store/designDeskStore';

interface Props {
    corpusText: string;
    /** When true, fills the entire window and adds a window-close (×) button.
     *  Used when DesignDesk is launched in a separate browser window via
     *  window.open('?designer=1'). */
    standalone?: boolean;
    /** Called when the user clicks the close (×) button or presses Esc.
     *  In standalone mode this calls window.close(). In embedded mode this
     *  navigates back to the previous AppState. */
    onClose?: () => void;
}

export const DesignDesk: React.FC<Props> = ({ corpusText, standalone, onClose }) => {
    const [design, setDesign] = useState<ParsedDesignMd | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [chatCollapsed, setChatCollapsed] = useState(false);

    useEffect(() => {
        loadDesignMd('/DESIGN.md').then(setDesign).catch(e => setError(e.message));
    }, []);

    // On Designer open, force the active artifact to be the most recent one.
    // Without this, the Designer hydrates from localStorage and shows whatever
    // artifact was active at last close — which is almost always stale because
    // the user just generated something new in Analyst Chat. Run once on mount.
    useEffect(() => {
        const state = useDesignDeskStore.getState();
        if (state.artifacts.length === 0) return;
        const latest = [...state.artifacts].sort((a, b) =>
            (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
        )[0];
        if (latest && latest.id !== state.activeArtifactId) {
            state.setActiveArtifact(latest.id);
        }
    }, []);

    // Drop every artifact except the most-recent N (default 1). Used by the
    // "Clear older" button in the chrome — destructive but explicit, and the
    // user has been asking for a way to prune accumulated drafts.
    const clearOlderArtifacts = (keepCount: number = 1) => {
        const state = useDesignDeskStore.getState();
        if (state.artifacts.length <= keepCount) return;
        const sorted = [...state.artifacts].sort((a, b) =>
            (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
        );
        const keep = new Set(sorted.slice(0, keepCount).map(a => a.id));
        const drop = state.artifacts.filter(a => !keep.has(a.id));
        const confirmed = window.confirm(
            `Remove ${drop.length} older artifact${drop.length === 1 ? '' : 's'}, keeping only the latest? This cannot be undone.`
        );
        if (!confirmed) return;
        for (const a of drop) state.removeArtifact(a.id);
    };

    // Esc closes the standalone window. Ctrl+\ toggles chat collapse for canvas focus.
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && standalone) {
                e.preventDefault();
                onClose?.();
            } else if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setChatCollapsed(c => !c);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [standalone, onClose]);

    if (error) {
        return (
            <div style={{ padding: 40, fontFamily: "'Archivo', sans-serif", height: '100vh', background: '#FFFFFF' }}>
                <div style={{ background: '#FFECEC', borderLeft: '4px solid #CC6644', padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>DESIGN.md failed to load</div>
                    <div style={{ fontSize: 13 }}>{error}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                        Check that humans-in-control-research/DESIGN.md exists and vite/nginx is serving it at /DESIGN.md.
                    </div>
                </div>
            </div>
        );
    }
    if (!design) {
        return (
            <div style={{ padding: 40, fontSize: 12, color: '#888', fontFamily: "'Archivo', sans-serif", height: '100vh', background: '#FFFFFF' }}>
                Loading design system...
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            fontFamily: "'Archivo', sans-serif",
            background: '#FFFFFF',
            overflow: 'hidden',
        }}>
            {/* Top chrome — compact title bar with close + maximize controls */}
            <div style={{
                background: '#0D0D0D',
                color: '#FFFFFF',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexShrink: 0,
                borderBottom: '2px solid #B8B800',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#B8B800' }}>
                        NXT Humans / Design Desk
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                        {chatCollapsed ? 'Canvas-only mode' : 'Chat + canvas'} · Ctrl+\\ to toggle · Esc to close
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => clearOlderArtifacts(1)}
                        title="Remove every artifact except the most recent — keeps the workspace from accumulating stale drafts."
                        style={{
                            padding: '4px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: '1px solid #555', background: 'transparent',
                            color: '#CC6644', cursor: 'pointer', borderRadius: 2,
                        }}
                    >
                        Clear Older
                    </button>
                    <button
                        onClick={() => setChatCollapsed(c => !c)}
                        title="Toggle chat panel (Ctrl+\\)"
                        style={{
                            padding: '4px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: '1px solid #555', background: 'transparent',
                            color: '#B8B800', cursor: 'pointer', borderRadius: 2,
                        }}
                    >
                        {chatCollapsed ? 'Show Chat' : 'Maximize Canvas'}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            title="Close (Esc)"
                            style={{
                                padding: '4px 10px', fontSize: 9, fontWeight: 700,
                                letterSpacing: 1.5, textTransform: 'uppercase',
                                border: '1px solid #555', background: 'transparent',
                                color: '#FFFFFF', cursor: 'pointer', borderRadius: 2,
                            }}
                        >
                            {standalone ? 'Close Window' : '← Back'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main split — chat (collapsible) + canvas */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {!chatCollapsed && (
                    <div style={{
                        flex: '0 0 360px',
                        minWidth: 320,
                        maxWidth: 420,
                        display: 'flex',
                        borderRight: '1px solid #E0E0E0',
                    }}>
                        <DesignDeskChat designMdRaw={design.rawMarkdown} tokens={design.tokens} corpusText={corpusText} />
                    </div>
                )}
                <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                    <ArtifactViewer tokens={design.tokens} />
                </div>
            </div>
        </div>
    );
};
