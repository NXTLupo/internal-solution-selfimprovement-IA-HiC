import React, { useRef } from 'react';
import { useDesignDeskStore } from './store/designDeskStore';
import { NxtDocViewer } from './components/NxtDocViewer';
import { FossflowCanvas } from './components/FossflowCanvas';
import { OrgChartCanvas } from './components/OrgChartCanvas';
import { FreeformViewer } from './components/FreeformViewer';
import { ExportMenu } from './components/ExportMenu';
import type { DesignTokens } from './services/designMdLoader';

interface Props {
    tokens: DesignTokens;
}

const TYPE_ICON: Record<string, string> = {
    persona: '◔',
    journey: '◇',
    org: '◊',
    freeform: '◈',
};

export const ArtifactViewer: React.FC<Props> = ({ tokens }) => {
    const { artifacts, activeArtifactId, setActiveArtifact, replaceArtifact, removeArtifact, undo, history } = useDesignDeskStore();
    const viewerRef = useRef<HTMLDivElement>(null);

    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    if (!active) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 40,
                color: '#888',
                fontFamily: "'Archivo', sans-serif",
                background: '#FAFAFA',
            }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#0D0D0D', letterSpacing: '0.02em' }}>
                    DESIGN DESK
                </div>
                <div style={{ width: 60, height: 4, background: '#B8B800', margin: '12px 0 24px' }} />
                <div style={{ marginTop: 8, fontSize: 13, maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
                    No artifact loaded yet. Use chat with a content hashtag — examples:
                </div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#444' }}>
                    <code style={{ background: '#F0F0E8', padding: '4px 10px' }}>#persona #NU first-gen junior dev</code>
                    <code style={{ background: '#F0F0E8', padding: '4px 10px' }}>#journey #NXT application to enrollment</code>
                    <code style={{ background: '#F0F0E8', padding: '4px 10px' }}>#org #NU advancement reporting structure</code>
                </div>
            </div>
        );
    }

    const handleFieldEdit = (field: string, value: any) => {
        if (active.type !== 'persona') return;
        replaceArtifact({ ...active, [field]: value, updatedAt: Date.now() });
    };

    const artifactLabel = (a: any): string => a.title ?? a.name ?? `${a.type}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minWidth: 0 }}>
            {/* Toolbar — artifact tabs (left), actions (right) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                borderBottom: '1px solid #E8E8E8',
                background: '#FAFAFA',
                flexShrink: 0,
                gap: 12,
            }}>
                <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', minWidth: 0 }}>
                    {artifacts.map(a => {
                        const isActive = a.id === activeArtifactId;
                        const palette = (tokens.brands[a.brand] ?? {}) as Record<string, string>;
                        const accent = palette.accent ?? '#B8B800';
                        return (
                            <div key={a.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid',
                                borderColor: isActive ? '#0D0D0D' : '#DDD',
                                background: isActive ? '#FFFFFF' : '#FAFAFA',
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}>
                                <button
                                    onClick={() => setActiveArtifact(a.id)}
                                    style={{
                                        padding: '5px 10px',
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        maxWidth: 240,
                                        minWidth: 0,
                                    }}
                                >
                                    <span style={{ fontSize: 14, color: accent, lineHeight: 1 }}>{TYPE_ICON[a.type] ?? '·'}</span>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: isActive ? 700 : 500,
                                        color: isActive ? '#0D0D0D' : '#666',
                                        letterSpacing: 0.3,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontFamily: "'Archivo', sans-serif",
                                    }}>
                                        {artifactLabel(a)}
                                    </span>
                                    <span style={{
                                        fontSize: 8,
                                        fontWeight: 700,
                                        letterSpacing: 1,
                                        textTransform: 'uppercase',
                                        color: accent,
                                        fontFamily: "'JetBrains Mono', monospace",
                                    }}>
                                        {a.brand}
                                    </span>
                                </button>
                                {isActive && artifacts.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${artifactLabel(a)}" from this session?`)) removeArtifact(a.id); }}
                                        title="Remove artifact"
                                        style={{
                                            padding: '5px 8px',
                                            border: 'none',
                                            borderLeft: '1px solid #E0E0E0',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            color: '#888',
                                            fontSize: 12,
                                        }}
                                    >×</button>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={undo} disabled={history.length === 0}
                        title={history.length ? `Undo last change (${history.length} in stack)` : 'Nothing to undo'}
                        style={{
                            padding: '5px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: '1px solid #DDD', background: '#FFFFFF',
                            cursor: history.length ? 'pointer' : 'not-allowed',
                            opacity: history.length ? 1 : 0.4,
                            fontFamily: "'Archivo', sans-serif",
                        }}>
                        Undo
                    </button>
                    <ExportMenu artifact={active} tokens={tokens} />
                </div>
            </div>

            {/* Canvas area */}
            <div ref={viewerRef} style={{ flex: 1, overflow: 'auto', background: '#FFFFFF', minHeight: 0 }}>
                {active.type === 'persona' && <NxtDocViewer artifact={active} tokens={tokens} onFieldEdit={handleFieldEdit as any} />}
                {active.type === 'journey' && <FossflowCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
                {active.type === 'org' && <OrgChartCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
                {(active as any).type === 'freeform' && <FreeformViewer artifact={active as any} />}
            </div>
        </div>
    );
};
