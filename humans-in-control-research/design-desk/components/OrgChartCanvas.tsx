import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, type Node, type Edge, type NodeTypes } from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';
import type { OrgChartArtifact } from '../schemas/orgChartArtifact';
import type { DesignTokens } from '../services/designMdLoader';
import { OrgChartNode, type OrgChartNodeData } from './OrgChartNode';

const NODE_TYPES: NodeTypes = { orgNode: OrgChartNode };
const NODE_W = 220;
const NODE_H = 78;

function autoLayout(artifact: OrgChartArtifact, direction: 'TB' | 'LR'): Record<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });
    for (const n of artifact.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
    for (const n of artifact.nodes) for (const c of n.directReports) g.setEdge(n.id, c);
    dagre.layout(g);
    const result: Record<string, { x: number; y: number }> = {};
    for (const n of artifact.nodes) {
        const p = g.node(n.id);
        result[n.id] = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
    }
    return result;
}

interface Props {
    artifact: OrgChartArtifact;
    tokens: DesignTokens;
    onLayoutChange?: (layout: OrgChartArtifact['layout']) => void;
}

export const OrgChartCanvas: React.FC<Props> = ({ artifact, tokens, onLayoutChange }) => {
    const direction = artifact.layout?.direction ?? 'TB';
    const positions = useMemo(
        () => artifact.layout?.nodes ?? autoLayout(artifact, direction),
        [artifact, direction],
    );

    const nodes: Node[] = useMemo(() => artifact.nodes.map(n => ({
        id: n.id,
        type: 'orgNode',
        position: positions[n.id] ?? { x: 0, y: 0 },
        data: {
            name: n.name,
            title: n.title,
            department: n.department,
            iconKey: n.iconKey ?? (n.name === 'VACANT' ? 'vacant' : 'person'),
            tokens,
            brand: artifact.brand,
        } satisfies OrgChartNodeData,
    })), [artifact, positions, tokens]);

    const edges: Edge[] = useMemo(() => {
        const out: Edge[] = [];
        for (const n of artifact.nodes) {
            for (const c of n.directReports) {
                const palette = tokens.brands[artifact.brand] as Record<string, string>;
                out.push({
                    id: `${n.id}->${c}`,
                    source: n.id,
                    target: c,
                    type: 'smoothstep',
                    style: { stroke: palette.primary ?? '#0D0D0D', strokeWidth: 1 },
                });
            }
        }
        return out;
    }, [artifact, tokens]);

    const handleNodeDragStop = (_: any, node: Node) => {
        if (!onLayoutChange) return;
        const nextPositions = { ...positions, [node.id]: node.position };
        onLayoutChange({ direction, nodes: nextPositions });
    };

    return (
        <div data-artifact-id={artifact.id} data-artifact-type="org" style={{ width: '100%', height: '100%', background: '#FFFFFF' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                onNodeDragStop={handleNodeDragStop}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={24} size={1} color="#EEE" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
};
