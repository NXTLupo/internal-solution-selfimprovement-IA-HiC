import React, { useEffect, useState } from 'react';
import { DesignDeskChat } from './DesignDeskChat';
import { ArtifactViewer } from './ArtifactViewer';
import { loadDesignMd, type ParsedDesignMd } from './services/designMdLoader';

interface Props {
    corpusText: string;
}

export const DesignDesk: React.FC<Props> = ({ corpusText }) => {
    const [design, setDesign] = useState<ParsedDesignMd | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDesignMd('/DESIGN.md').then(setDesign).catch(e => setError(e.message));
    }, []);

    if (error) {
        return (
            <div style={{ padding: 40, fontFamily: "'Archivo', sans-serif" }}>
                <div style={{ background: '#FFECEC', borderLeft: '4px solid #CC6644', padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>DESIGN.md failed to load</div>
                    <div style={{ fontSize: 13 }}>{error}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                        The Design Desk cannot operate without DESIGN.md. Check that humans-in-control-research/DESIGN.md exists and vite/nginx is serving it at /DESIGN.md.
                    </div>
                </div>
            </div>
        );
    }
    if (!design) {
        return <div style={{ padding: 40, fontSize: 12, color: '#888', fontFamily: "'Archivo', sans-serif" }}>Loading design system...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Archivo', sans-serif", background: '#FFFFFF' }}>
            <div style={{ flex: '0 0 40%', minWidth: 380, maxWidth: 560, display: 'flex' }}>
                <DesignDeskChat designMdRaw={design.rawMarkdown} tokens={design.tokens} corpusText={corpusText} />
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
                <ArtifactViewer tokens={design.tokens} />
            </div>
        </div>
    );
};
