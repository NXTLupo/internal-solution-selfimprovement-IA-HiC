import React, { useRef } from 'react';
import { useDesignDeskStore } from './store/designDeskStore';
import { NxtDocViewer } from './components/NxtDocViewer';
import { FossflowCanvas } from './components/FossflowCanvas';
import { OrgChartCanvas } from './components/OrgChartCanvas';
import { ExportMenu } from './components/ExportMenu';
import type { DesignTokens } from './services/designMdLoader';

interface Props {
    tokens: DesignTokens;
}

export const ArtifactViewer: React.FC<Props> = ({ tokens }) => {
    const { artifacts, activeArtifactId, setActiveArtifact, replaceArtifact, undo, history } = useDesignDeskStore();
    const viewerRef = useRef<HTMLDivElement>(null);

    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    if (!active) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Archivo', sans-serif" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28 }}>NO ARTIFACT YET</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>Try: <code>#persona #NU give me a first-gen junior dev</code></div>
            </div>
        );
    }

    const handleFieldEdit = (field: string, value: any) => {
        if (active.type !== 'persona') return;
        replaceArtifact({ ...active, [field]: value, updatedAt: Date.now() });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #E8E8E8' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {artifacts.map(a => (
                        <button key={a.id} onClick={() => setActiveArtifact(a.id)}
                            style={{
                                padding: '4px 10px', border: '1px solid',
                                borderColor: a.id === activeArtifactId ? '#0D0D0D' : '#DDD',
                                background: a.id === activeArtifactId ? '#F0F0E8' : '#FFFFFF',
                                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                            }}>
                            {a.type}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={undo} disabled={history.length === 0}
                        style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', border: '1px solid #DDD', background: '#FFFFFF', cursor: history.length ? 'pointer' : 'not-allowed' }}>
                        Undo
                    </button>
                    <ExportMenu artifact={active} getViewerElement={() => viewerRef.current} />
                </div>
            </div>

            <div ref={viewerRef} style={{ flex: 1, overflow: 'auto', background: '#FFFFFF' }}>
                {active.type === 'persona' && <NxtDocViewer artifact={active} tokens={tokens} onFieldEdit={handleFieldEdit as any} />}
                {active.type === 'journey' && <FossflowCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
                {active.type === 'org' && <OrgChartCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
            </div>
        </div>
    );
};
