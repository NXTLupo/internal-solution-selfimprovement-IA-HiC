import React, { useMemo, useRef } from 'react';
import Isoflow from 'fossflow';
import type { JourneyArtifact } from '../schemas/journeyArtifact';
import type { DesignTokens } from '../services/designMdLoader';

interface Props {
    artifact: JourneyArtifact;
    tokens: DesignTokens;
    onLayoutChange?: (layout: JourneyArtifact['layout']) => void;
}

// Minimal flat geometric isometric icon. Base diamond with stage label color.
// Inlined as a data URL so fossflow's icon loader gets a real url string.
function makeIconDataUrl(color: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">`
        + `<polygon points="60,20 108,50 60,80 12,50" fill="${color}" stroke="${color}" stroke-width="2"/>`
        + `<polygon points="60,80 108,50 108,78 60,108" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="2"/>`
        + `<polygon points="60,80 12,50 12,78 60,108" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-width="2"/>`
        + `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildInitialData(artifact: JourneyArtifact, tokens: DesignTokens) {
    const palette = (tokens.brands[artifact.brand] ?? {}) as Record<string, string>;
    const primary = palette.primary ?? '#0D0D0D';
    const accent = palette.accent ?? '#B8B800';
    const negative = palette.negative ?? '#CC6644';

    const emotionColorHex: Record<string, string> = {
        positive: '#0CCE6B',
        neutral: primary,
        negative,
    };

    // fossflow colors must be declared once with an id; connectors reference by id.
    const colorDefs = [
        { id: 'emotion-positive', value: emotionColorHex.positive },
        { id: 'emotion-neutral', value: emotionColorHex.neutral },
        { id: 'emotion-negative', value: emotionColorHex.negative },
        { id: 'edge-accent', value: accent },
    ];

    // fossflow icons are declared once and items reference by icon id.
    // Minimum three icons (one per emotion) so each stage can show its color.
    const icons = [
        { id: 'icon-positive', name: 'Positive', url: makeIconDataUrl(emotionColorHex.positive), isIsometric: true },
        { id: 'icon-neutral', name: 'Neutral', url: makeIconDataUrl(emotionColorHex.neutral), isIsometric: true },
        { id: 'icon-negative', name: 'Negative', url: makeIconDataUrl(emotionColorHex.negative), isIsometric: true },
    ];

    // Items are logical entities. One per stage.
    const items = artifact.stages.map(stage => ({
        id: stage.id,
        name: stage.label,
        description: [
            stage.touchpoints.length ? `Touchpoints: ${stage.touchpoints.join('; ')}` : '',
            stage.painPoints.length ? `Pain: ${stage.painPoints.join('; ')}` : '',
            stage.opportunities.length ? `Opportunity: ${stage.opportunities.join('; ')}` : '',
        ].filter(Boolean).join('\n'),
        icon: `icon-${stage.emotion}`,
    }));

    // Place stages along a diagonal isometric path so the canvas reads left-to-right.
    // Honor saved layout if present, otherwise stagger by index.
    const viewItems = artifact.stages.map((stage, idx) => {
        const saved = artifact.layout?.nodes?.[stage.id];
        const tile = saved
            ? { x: Math.round(saved.x / 80), y: Math.round(saved.y / 80) }
            : { x: idx * 3, y: idx };
        return { id: stage.id, tile, labelHeight: 40 };
    });

    // Connectors reference items by id; anchors pin the line to each item's tile.
    const connectors = artifact.connections.map((c, idx) => ({
        id: `conn-${idx}`,
        color: 'edge-accent',
        style: 'SOLID' as const,
        width: 2,
        description: c.label ?? '',
        anchors: [
            { id: `anc-${idx}-a`, ref: { item: c.from } },
            { id: `anc-${idx}-b`, ref: { item: c.to } },
        ],
    }));

    return {
        title: artifact.title,
        description: `${artifact.brand.toUpperCase()} journey map`,
        items,
        icons,
        colors: colorDefs,
        views: [
            {
                id: 'main',
                name: 'Journey',
                items: viewItems,
                connectors,
            },
        ],
        fitToView: true,
    };
}

export const FossflowCanvas: React.FC<Props> = ({ artifact, tokens, onLayoutChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const palette = (tokens.brands[artifact.brand] ?? {}) as Record<string, string>;
    const primary = palette.primary ?? '#0D0D0D';
    const accent = palette.accent ?? '#B8B800';

    const initialData = useMemo(() => buildInitialData(artifact, tokens), [artifact, tokens]);

    const handleModelUpdated = (model: any) => {
        if (!onLayoutChange) return;
        const view = model?.views?.[0];
        if (!view?.items) return;
        const nodes: Record<string, { x: number; y: number }> = {};
        for (const it of view.items) {
            if (it?.id && it?.tile) {
                // Convert tile grid back to pixel-like coords for persistence.
                nodes[it.id] = { x: it.tile.x * 80, y: it.tile.y * 80 };
            }
        }
        onLayoutChange({ nodes });
    };

    return (
        <div
            ref={containerRef}
            data-artifact-id={artifact.id}
            data-artifact-type="journey"
            style={{
                width: '100%',
                height: '100%',
                background: '#FFFFFF',
                fontFamily: "'Archivo', sans-serif",
                position: 'relative',
            }}
        >
            <style>{`
                div[data-artifact-type="journey"] * {
                    font-family: 'Archivo', sans-serif !important;
                    border-radius: 2px !important;
                }
                div[data-artifact-type="journey"] .MuiPaper-root,
                div[data-artifact-type="journey"] .MuiCard-root {
                    background: #FFFFFF !important;
                    border: 1px solid ${primary} !important;
                    border-radius: 2px !important;
                    box-shadow: none !important;
                }
                div[data-artifact-type="journey"] .MuiButton-root {
                    border-radius: 2px !important;
                    text-transform: none !important;
                    font-family: 'Archivo', sans-serif !important;
                }
                div[data-artifact-type="journey"] .MuiIconButton-root:hover,
                div[data-artifact-type="journey"] .MuiButton-root:hover {
                    background-color: ${accent}22 !important;
                }
                div[data-artifact-type="journey"] svg text {
                    font-family: 'Archivo', sans-serif !important;
                    fill: ${primary} !important;
                }
            `}</style>
            <Isoflow
                initialData={initialData as any}
                width="100%"
                height="100%"
                editorMode="EDITABLE"
                onModelUpdated={handleModelUpdated}
            />
        </div>
    );
};
