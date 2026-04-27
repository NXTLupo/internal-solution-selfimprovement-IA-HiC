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

type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL' | 'radial';

function dagreLayout(artifact: OrgChartArtifact, direction: 'TB' | 'LR' | 'BT' | 'RL'): Record<string, { x: number; y: number }> {
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

/**
 * Radial layout: roots at center, BFS levels placed on concentric rings.
 * Each ring's circumference scales with the number of nodes on it so labels
 * don't overlap. Used when the user asks for "radial" / "concentric" /
 * "circle" layout via the Designer chat.
 */
function radialLayout(artifact: OrgChartArtifact): Record<string, { x: number; y: number }> {
    const level: Record<string, number> = {};
    const queue: { id: string; lvl: number }[] = artifact.rootIds.map(id => ({ id, lvl: 0 }));
    while (queue.length > 0) {
        const { id, lvl } = queue.shift()!;
        if (level[id] !== undefined) continue;
        level[id] = lvl;
        const node = artifact.nodes.find(n => n.id === id);
        if (!node) continue;
        for (const c of node.directReports) queue.push({ id: c, lvl: lvl + 1 });
    }

    const byLevel: Record<number, string[]> = {};
    const maxLevel = Math.max(0, ...Object.values(level));
    for (const n of artifact.nodes) {
        const lvl = level[n.id] ?? maxLevel + 1;
        (byLevel[lvl] ??= []).push(n.id);
    }

    const result: Record<string, { x: number; y: number }> = {};
    const minStep = NODE_W + 60; // arc length per node minimum to prevent overlap
    let cx = 1200;
    let cy = 800;

    Object.keys(byLevel).map(Number).sort((a, b) => a - b).forEach(lvl => {
        const ids = byLevel[lvl];
        if (lvl === 0) {
            if (ids.length === 1) {
                result[ids[0]] = { x: cx - NODE_W / 2, y: cy - NODE_H / 2 };
            } else {
                const r = Math.max(180, (minStep * ids.length) / (2 * Math.PI));
                ids.forEach((id, i) => {
                    const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
                    result[id] = { x: cx + Math.cos(a) * r - NODE_W / 2, y: cy + Math.sin(a) * r - NODE_H / 2 };
                });
            }
            return;
        }
        // Outer rings: radius scales with both level and the count on the ring
        const minRadius = 280 * lvl;
        const circumferenceNeeded = minStep * ids.length;
        const radius = Math.max(minRadius, circumferenceNeeded / (2 * Math.PI));
        ids.forEach((id, i) => {
            const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
            result[id] = { x: cx + Math.cos(a) * radius - NODE_W / 2, y: cy + Math.sin(a) * radius - NODE_H / 2 };
        });
    });

    return result;
}

function autoLayout(artifact: OrgChartArtifact, direction: LayoutDirection): Record<string, { x: number; y: number }> {
    if (direction === 'radial') return radialLayout(artifact);
    return dagreLayout(artifact, direction);
}

interface Props {
    artifact: OrgChartArtifact;
    tokens: DesignTokens;
    onLayoutChange?: (layout: OrgChartArtifact['layout']) => void;
}

export const OrgChartCanvas: React.FC<Props> = ({ artifact, tokens, onLayoutChange }) => {
    const direction = (artifact.layout?.direction ?? 'TB') as LayoutDirection;
    // When direction !== 'TB' default OR user has overridden positions, the layout
    // function decides. Crucially: if direction is 'radial' OR if the stored
    // positions don't match the current node set, recompute. This makes a
    // direction-only revision (model emits new direction, omits positions) actually
    // re-flow on screen instead of reusing stale TB positions.
    const positions = useMemo(() => {
        const stored = artifact.layout?.nodes;
        if (stored && direction !== 'radial') {
            const storedIds = new Set(Object.keys(stored));
            const allCovered = artifact.nodes.every(n => storedIds.has(n.id));
            if (allCovered) return stored;
        }
        return autoLayout(artifact, direction);
    }, [artifact, direction]);

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
