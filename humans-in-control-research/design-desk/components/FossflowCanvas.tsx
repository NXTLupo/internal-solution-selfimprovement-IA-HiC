import React, { useMemo, useRef } from 'react';
import type { JourneyArtifact } from '../schemas/journeyArtifact';
import type { DesignTokens } from '../services/designMdLoader';

// fossflow-lib is pinned to github:stan-smith/FossFLOW#master (a monorepo with no
// published dist/). If the installed package exposes no loadable entry point —
// or if the Isoflow component signature differs from what this wrapper assumes —
// the require() below either throws or returns something unusable, and the
// FallbackList renders instead. Task 15 is the real FossFLOW skinning pass.
let Isoflow: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod: any = require('fossflow-lib');
    Isoflow = mod?.default ?? mod?.Isoflow ?? mod?.FossFlow ?? null;
} catch {
    Isoflow = null;
}

interface Props {
    artifact: JourneyArtifact;
    tokens: DesignTokens;
    onLayoutChange?: (layout: JourneyArtifact['layout']) => void;
}

function journeyToFossflow(artifact: JourneyArtifact, tokens: DesignTokens): any {
    const palette = (tokens.brands[artifact.brand] ?? {}) as Record<string, string>;
    const emotionColor: Record<string, string> = {
        positive: '#0CCE6B',
        neutral: palette.primary ?? '#0D0D0D',
        negative: palette.negative ?? '#CC6644',
    };
    const nodes = artifact.stages.map((stage, idx) => ({
        id: stage.id,
        label: stage.label,
        position: artifact.layout?.nodes?.[stage.id] ?? { x: idx * 160, y: 0 },
        color: emotionColor[stage.emotion],
        meta: {
            painPoints: stage.painPoints,
            opportunities: stage.opportunities,
            touchpoints: stage.touchpoints,
        },
    }));
    const edges = artifact.connections.map((c, idx) => ({
        id: `e${idx}`,
        from: c.from,
        to: c.to,
        label: c.label ?? '',
    }));
    return { nodes, edges, background: '#FFFFFF', accent: palette.accent };
}

export const FossflowCanvas: React.FC<Props> = ({ artifact, tokens, onLayoutChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const diagram = useMemo(() => journeyToFossflow(artifact, tokens), [artifact, tokens]);

    if (!Isoflow) {
        return (
            <div
                ref={containerRef}
                data-artifact-id={artifact.id}
                data-artifact-type="journey"
                style={{ width: '100%', height: '100%', background: '#FFFFFF' }}
            >
                <FallbackList artifact={artifact} />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            data-artifact-id={artifact.id}
            data-artifact-type="journey"
            style={{ width: '100%', height: '100%', background: '#FFFFFF' }}
        >
            <Isoflow
                diagram={diagram}
                onChange={(next: any) => {
                    if (!onLayoutChange) return;
                    const nodes: Record<string, { x: number; y: number }> = {};
                    for (const n of next?.nodes ?? []) {
                        if (n?.id && n?.position) nodes[n.id] = n.position;
                    }
                    onLayoutChange({ nodes });
                }}
            />
        </div>
    );
};

const FallbackList: React.FC<{ artifact: JourneyArtifact }> = ({ artifact }) => (
    <div style={{ padding: 24, fontFamily: "'Archivo', sans-serif" }}>
        <div style={{ background: '#FFF3CD', padding: 12, marginBottom: 16, fontSize: 12 }}>
            FossFLOW canvas unavailable — fallback list view
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: '0 0 16px 0' }}>{artifact.title}</h1>
        {artifact.stages.map((s, i) => (
            <div key={s.id} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
                <strong>
                    {i + 1}. {s.label}
                </strong>{' '}
                <span style={{ color: '#888' }}>({s.emotion})</span>
                {s.touchpoints.length > 0 && (
                    <div style={{ fontSize: 13, color: '#00B7C3' }}>Touchpoints: {s.touchpoints.join('; ')}</div>
                )}
                {s.painPoints.length > 0 && (
                    <div style={{ fontSize: 13, color: '#CC6644' }}>Pain: {s.painPoints.join('; ')}</div>
                )}
                {s.opportunities.length > 0 && (
                    <div style={{ fontSize: 13, color: '#0CCE6B' }}>Opp: {s.opportunities.join('; ')}</div>
                )}
            </div>
        ))}
    </div>
);
