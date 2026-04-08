/**
 * ResearchKnowledgeGraph — Interactive D3 force-directed knowledge graph
 * Visualizes sources, evidence, themes, personas, and recommendations
 * as an explorable network the user can interact with.
 */

import React, { useRef, useEffect, useState } from 'react';
import type { KGNode, KGEdge, KnowledgeGraph } from '../services/knowledgeGraphBuilder';

declare const d3: any;

interface Props {
    graph: KnowledgeGraph;
    onNodeClick?: (node: KGNode) => void;
    height?: number;
}

const NODE_SHAPES: Record<string, string> = {
    source: 'circle',
    evidence: 'rect',
    theme: 'diamond',
    persona: 'circle',
    recommendation: 'hexagon',
};

const TYPE_LABELS: Record<string, string> = {
    source: 'Data Source',
    evidence: 'Evidence',
    theme: 'Theme',
    persona: 'Persona',
    recommendation: 'Recommendation',
};

const ResearchKnowledgeGraph: React.FC<Props> = ({ graph, onNodeClick, height = 500 }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);

    useEffect(() => {
        if (!svgRef.current || !d3 || !graph.nodes.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = containerRef.current?.clientWidth || 800;
        const h = height;

        // Filter nodes if filter active
        const visibleNodes = filterType ? graph.nodes.filter(n => n.type === filterType) : graph.nodes;
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = graph.edges.filter(e =>
            visibleNodeIds.has(typeof e.source === 'string' ? e.source : (e.source as any).id) &&
            visibleNodeIds.has(typeof e.target === 'string' ? e.target : (e.target as any).id)
        );

        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.2, 4])
            .on('zoom', (event: any) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        const g = svg.append('g');

        // Force simulation
        const simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleEdges).id((d: any) => d.id).distance(80).strength(0.3))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, h / 2))
            .force('collision', d3.forceCollide().radius((d: any) => (d.size || 10) + 5))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(h / 2).strength(0.05));

        // Draw edges
        const link = g.append('g')
            .selectAll('line')
            .data(visibleEdges)
            .join('line')
            .attr('stroke', (d: any) => d.type === 'supported_by' ? '#caca20' : d.type === 'experiences' ? '#00b1eb' : d.type === 'addresses' ? '#0CCE6B' : '#e5e5e5')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', (d: any) => Math.max(1, d.weight * 3))
            .attr('stroke-dasharray', (d: any) => d.type === 'experiences' ? '4,4' : d.type === 'quoted_in' ? '2,2' : 'none');

        // Draw nodes
        const node = g.append('g')
            .selectAll('g')
            .data(visibleNodes)
            .join('g')
            .call(d3.drag()
                .on('start', (event: any, d: any) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', (event: any, d: any) => { d.fx = event.x; d.fy = event.y; })
                .on('end', (event: any, d: any) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                })
            )
            .style('cursor', 'pointer')
            .on('click', (_: any, d: any) => {
                setSelectedNode(d);
                onNodeClick?.(d);
            });

        // Node shapes based on type
        node.each(function(this: any, d: any) {
            const el = d3.select(this);
            const r = d.size || 10;

            if (d.type === 'theme') {
                // Diamond
                el.append('polygon')
                    .attr('points', `0,${-r} ${r},0 0,${r} ${-r},0`)
                    .attr('fill', d.color || '#caca20')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);
            } else if (d.type === 'evidence') {
                // Small rectangle
                el.append('rect')
                    .attr('x', -r/2).attr('y', -r/2)
                    .attr('width', r).attr('height', r)
                    .attr('rx', 2)
                    .attr('fill', d.color || '#fd8e2e')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);
            } else if (d.type === 'recommendation') {
                // Hexagon
                const hex = Array.from({length: 6}, (_, i) => {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
                }).join(' ');
                el.append('polygon')
                    .attr('points', hex)
                    .attr('fill', d.color || '#0CCE6B')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);
            } else if (d.type === 'persona' && d.imageUrl) {
                // Circle with image
                el.append('clipPath')
                    .attr('id', `clip-${d.id}`)
                    .append('circle')
                    .attr('r', r);
                el.append('image')
                    .attr('xlink:href', d.imageUrl)
                    .attr('x', -r).attr('y', -r)
                    .attr('width', r * 2).attr('height', r * 2)
                    .attr('clip-path', `url(#clip-${d.id})`);
                el.append('circle')
                    .attr('r', r)
                    .attr('fill', 'none')
                    .attr('stroke', d.color || '#00b1eb')
                    .attr('stroke-width', 3);
            } else {
                // Default circle
                el.append('circle')
                    .attr('r', r)
                    .attr('fill', d.color || '#115054')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);
            }
        });

        // Node labels (only for larger nodes)
        node.filter((d: any) => (d.size || 0) > 10)
            .append('text')
            .text((d: any) => d.label?.substring(0, 25) || '')
            .attr('dy', (d: any) => (d.size || 10) + 12)
            .attr('text-anchor', 'middle')
            .attr('fill', '#525252')
            .attr('font-size', '9px')
            .attr('font-family', 'Archivo, sans-serif')
            .attr('font-weight', '500');

        // Hover effects
        node.on('mouseover', function(this: any, _: any, d: any) {
            d3.select(this).select('circle,rect,polygon').attr('stroke', '#caca20').attr('stroke-width', 3);
            link.attr('stroke-opacity', (l: any) => (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1);
        }).on('mouseout', function(this: any) {
            d3.select(this).select('circle,rect,polygon').attr('stroke', '#fff').attr('stroke-width', 2);
            link.attr('stroke-opacity', 0.4);
        });

        // Tick function
        simulation.on('tick', () => {
            link.attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [graph, height, filterType]);

    const typeCounts = graph.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div ref={containerRef} className="w-full bg-white border border-[var(--border-primary)] rounded overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--nxt-teal)]">Knowledge Graph</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{graph.nodes.length} nodes, {graph.edges.length} edges</span>
                </div>
                {/* Type filters */}
                <div className="flex gap-1">
                    <button onClick={() => setFilterType(null)}
                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${!filterType ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>
                        All
                    </button>
                    {Object.entries(typeCounts).map(([type, count]) => (
                        <button key={type} onClick={() => setFilterType(filterType === type ? null : type)}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${filterType === type ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>
                            {type} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* SVG Canvas */}
            <svg ref={svgRef} width="100%" height={height} className="bg-white" />

            {/* Selected Node Detail Panel */}
            {selectedNode && (
                <div className="absolute bottom-2 left-2 right-2 bg-white border border-[var(--border-primary)] rounded shadow-lg p-3 max-w-sm z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest" style={{color: selectedNode.color}}>{TYPE_LABELS[selectedNode.type]}</span>
                            <div className="text-sm font-bold mt-0.5">{selectedNode.label}</div>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-[var(--text-tertiary)] text-xs">X</button>
                    </div>
                    {selectedNode.metadata?.description && <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-3">{selectedNode.metadata.description}</p>}
                    {selectedNode.metadata?.quote && <p className="text-[11px] italic text-[var(--text-secondary)] mt-1 border-l-2 border-[var(--nxt-lime)] pl-2">"{selectedNode.metadata.quote}"</p>}
                    {selectedNode.metadata?.content && <p className="text-[10px] text-[var(--text-tertiary)] mt-1 line-clamp-2">{selectedNode.metadata.content}</p>}
                    {selectedNode.metadata?.role && <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{selectedNode.metadata.role}</p>}
                    {selectedNode.url && <a href={selectedNode.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--nxt-teal)] underline mt-1 inline-block">View Source</a>}
                    {selectedNode.tier && <span className="text-[8px] font-bold uppercase ml-2" style={{color: selectedNode.color}}>Tier {selectedNode.tier}</span>}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                {[
                    { shape: 'circle', color: '#115054', label: 'Sources' },
                    { shape: 'square', color: '#fd8e2e', label: 'Evidence' },
                    { shape: 'diamond', color: '#caca20', label: 'Themes' },
                    { shape: 'circle', color: '#00b1eb', label: 'Personas' },
                    { shape: 'hexagon', color: '#0CCE6B', label: 'Recs' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResearchKnowledgeGraph;
