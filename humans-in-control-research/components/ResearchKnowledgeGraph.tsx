/**
 * ResearchKnowledgeGraph v4 - Zoned Radial Knowledge Graph
 *
 * 3-zone layout:
 *   Zone A (center 40%): themes, personas, recommendations, gaps - the analytical core
 *   Zone B (60-75%): sources - the data providers
 *   Zone C (80-95%): evidence - raw data texture
 *   Orphan cluster: bottom area, outside the radial layout
 *
 * 4 shapes only: diamond (themes), circle (sources/evidence), rounded-rect (personas/journeys),
 *   hexagon (recommendations/features/roadmap/gaps)
 *
 * 3 edge tiers: structural (always visible), relationship (1.2x+), provenance (hover/2.0x+)
 * Full provenance chain hover: theme -> evidence -> source in one gesture
 * Breadcrumb navigation in detail panel
 * Quality-narrative stats bar
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { KGNode, KGEdge, KnowledgeGraph } from '../services/knowledgeGraphBuilder';
import { getTierStyle } from '../services/knowledgeGraphBuilder';

declare const d3: any;

interface Props {
    graph: KnowledgeGraph;
    onNodeClick?: (node: KGNode) => void;
    height?: number;
    excludedSources?: Set<string>;
    setExcludedSources?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const TYPE_LABELS: Record<string, string> = {
    source: 'Data Source',
    evidence: 'Evidence',
    theme: 'Theme',
    persona: 'Persona',
    recommendation: 'Recommendation',
    journey_stage: 'Journey Stage',
    feature: 'PRD Feature',
    roadmap_item: 'Roadmap Item',
    gap: 'Capability Gap',
};

const TYPE_COLORS: Record<string, string> = {
    source: '#555',
    evidence: '#888888',
    theme: '#B8B800',
    persona: '#00B7C3',
    recommendation: '#00B7C3',
    journey_stage: '#00B7C3',
    feature: '#00B7C3',
    roadmap_item: '#00B7C3',
    gap: '#CC6644',
};

// --- BREADCRUMB SYSTEM ---
const PARENT_EDGE_MAP: Record<string, { edgeTypes: string[]; parentTypes: string[] }> = {
    evidence: { edgeTypes: ['from'], parentTypes: ['source'] },
    theme: { edgeTypes: ['supported_by'], parentTypes: ['source', 'evidence'] },
    persona: { edgeTypes: ['experiences'], parentTypes: ['theme'] },
    recommendation: { edgeTypes: ['addresses'], parentTypes: ['theme'] },
    journey_stage: { edgeTypes: ['supported_by', 'experiences'], parentTypes: ['theme', 'persona'] },
    feature: { edgeTypes: ['addresses'], parentTypes: ['recommendation', 'theme'] },
    roadmap_item: { edgeTypes: ['addresses'], parentTypes: ['recommendation', 'theme'] },
    gap: { edgeTypes: ['supported_by'], parentTypes: ['theme'] },
};

interface BreadcrumbItem { node: KGNode; label: string; }

function buildBreadcrumbs(node: KGNode, graph: KnowledgeGraph): BreadcrumbItem[] {
    const crumbs: BreadcrumbItem[] = [];
    const visited = new Set<string>();
    let current: KGNode | null = node;
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        crumbs.unshift({ node: current, label: current.label.substring(0, 30) });
        const parentConfig = PARENT_EDGE_MAP[current.type];
        if (!parentConfig) break;
        if (current.type === 'evidence' && current.parentSourceId) {
            const ps = graph.nodes.find(n => n.id === current!.parentSourceId);
            if (ps) { current = ps; continue; }
        }
        let foundParent: KGNode | null = null;
        for (const edge of graph.edges) {
            const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
            const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
            if (!parentConfig.edgeTypes.includes(edge.type)) continue;
            let candidateId: string | null = null;
            if (srcId === current.id) candidateId = tgtId;
            else if (tgtId === current.id) candidateId = srcId;
            if (!candidateId || visited.has(candidateId)) continue;
            const candidate = graph.nodes.find(n => n.id === candidateId);
            if (candidate && (parentConfig.parentTypes.includes(candidate.type) || (current.type === 'theme' && candidate.type === 'source'))) {
                foundParent = candidate;
                break;
            }
        }
        current = foundParent;
    }
    return crumbs;
}

// --- EDGE TIER CLASSIFICATION ---
function getEdgeTier(type: string): 1 | 2 | 3 {
    if (type === 'supported_by') return 1;  // Structural: always visible
    if (type === 'experiences' || type === 'addresses') return 2;  // Relationship: 1.2x+
    return 3;  // Provenance (from, quoted_in): hover/2.0x+
}

// --- ZONE CLASSIFICATION ---
function getZone(type: string): 'A' | 'B' | 'C' | 'orphan' {
    if (['theme', 'persona', 'recommendation', 'gap', 'journey_stage', 'feature', 'roadmap_item'].includes(type)) return 'A';
    if (type === 'source') return 'B';
    return 'C'; // evidence
}

const ResearchKnowledgeGraph: React.FC<Props> = ({ graph, onNodeClick, height = 500, excludedSources, setExcludedSources }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<any>(null);
    const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
    const [currentZoom, setCurrentZoom] = useState(1);
    const [legendOpen, setLegendOpen] = useState(false);

    useEffect(() => {
        if (!svgRef.current || !d3 || !graph.nodes.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = containerRef.current?.clientWidth || 900;
        const h = height;
        const cx = width / 2;
        const cy = h / 2;
        const maxRadius = Math.min(width, h) * 0.42;

        // --- SEPARATE ORPHAN EVIDENCE ---
        const orphanEvidence = graph.nodes.filter(n => n.type === 'evidence' && n.isOrphan);
        const nonOrphanNodes = graph.nodes.filter(n => !(n.type === 'evidence' && n.isOrphan));
        const visibleNodes = [...nonOrphanNodes];
        const visibleEdges = graph.edges.filter(e => {
            const srcId = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const tgtId = typeof e.target === 'string' ? e.target : (e.target as any).id;
            const nodeIds = new Set(visibleNodes.map(n => n.id));
            return nodeIds.has(srcId) && nodeIds.has(tgtId);
        });

        // --- ZONE-BASED RADIAL LAYOUT ---
        // Zone A: Analytical core (center) - themes at 0-15%, personas/recs/gaps at 25-35%
        // Zone B: Source ring (60-75%)
        // Zone C: Evidence field (80-95%), clustered near parent source
        const getTargetRadius = (node: any) => {
            switch (node.type) {
                case 'theme': return maxRadius * 0.12;
                case 'persona': return maxRadius * 0.32;
                case 'recommendation': return maxRadius * 0.28;
                case 'gap': return maxRadius * 0.30;
                case 'journey_stage': return maxRadius * 0.38;
                case 'feature': return maxRadius * 0.36;
                case 'roadmap_item': return maxRadius * 0.36;
                case 'source': return maxRadius * 0.68;
                case 'evidence': return maxRadius * 0.88;
                default: return maxRadius * 0.5;
            }
        };

        // Pre-position nodes on their target rings
        const typeCounts: Record<string, number> = {};
        const typeIndices: Record<string, number> = {};
        visibleNodes.forEach((n: any) => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

        // Find which theme each source most supports (for angular alignment)
        const sourceToThemeAngle: Record<string, number> = {};
        const themeAngles: Record<string, number> = {};
        const themes = visibleNodes.filter(n => n.type === 'theme');
        themes.forEach((t, i) => {
            themeAngles[t.id] = (i / Math.max(themes.length, 1)) * Math.PI * 2;
        });

        // Map sources to their most-connected theme's angle
        visibleNodes.filter(n => n.type === 'source').forEach(src => {
            let bestTheme = '';
            let bestCount = 0;
            visibleEdges.forEach(e => {
                const srcId = typeof e.source === 'string' ? e.source : (e.source as any).id;
                const tgtId = typeof e.target === 'string' ? e.target : (e.target as any).id;
                if (e.type === 'supported_by') {
                    if (tgtId === src.id || srcId === src.id) {
                        const otherId = srcId === src.id ? tgtId : srcId;
                        const otherNode = visibleNodes.find(n => n.id === otherId);
                        if (otherNode?.type === 'theme' && themeAngles[otherId] !== undefined) {
                            // Count edges between this source and this theme
                            bestCount++;
                            bestTheme = otherId;
                        }
                    }
                }
            });
            if (bestTheme && themeAngles[bestTheme] !== undefined) {
                sourceToThemeAngle[src.id] = themeAngles[bestTheme];
            }
        });

        visibleNodes.forEach((n: any) => {
            typeIndices[n.type] = (typeIndices[n.type] || 0);
            const r = getTargetRadius(n);
            const count = typeCounts[n.type] || 1;

            let angle: number;
            if (n.type === 'source' && sourceToThemeAngle[n.id] !== undefined) {
                // Position source near its primary theme, with offset to avoid stacking
                const sourceIdx = typeIndices[n.type];
                const sourcesAtThisAngle = Object.values(sourceToThemeAngle).filter(a => Math.abs(a - sourceToThemeAngle[n.id]) < 0.3).length;
                angle = sourceToThemeAngle[n.id] + (sourceIdx % 3 - 1) * 0.15;
            } else if (n.type === 'evidence' && n.parentSourceId) {
                // Evidence near its parent source
                const parentAngle = sourceToThemeAngle[n.parentSourceId];
                if (parentAngle !== undefined) {
                    angle = parentAngle + (Math.random() - 0.5) * 0.3;
                } else {
                    angle = (typeIndices[n.type] / count) * Math.PI * 2;
                }
            } else {
                angle = (typeIndices[n.type] / count) * Math.PI * 2;
            }

            n.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 15;
            n.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 15;
            typeIndices[n.type]++;
        });

        // --- ZOOM ---
        const zoom = d3.zoom()
            .scaleExtent([0.2, 5])
            .on('zoom', (event: any) => {
                g.attr('transform', event.transform);
                setCurrentZoom(event.transform.k);
                updateVisibilityForZoom(event.transform.k);
            });
        svg.call(zoom);
        const g = svg.append('g');

        // --- FORCE SIMULATION ---
        const simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleEdges).id((d: any) => d.id).distance((d: any) => {
                if (d.type === 'from') return 20;
                if (d.type === 'supported_by') return 55;
                if (d.type === 'experiences') return 70;
                if (d.type === 'addresses') return 70;
                return 50;
            }).strength((d: any) => {
                if (d.type === 'from') return 0.8;
                if (d.type === 'supported_by') return 0.12;
                return 0.08;
            }))
            .force('radial', d3.forceRadial((d: any) => getTargetRadius(d), cx, cy)
                .strength((d: any) => {
                    if (d.type === 'theme') return 0.3;
                    if (d.type === 'evidence') return 0.04;
                    if (d.type === 'source') return 0.1;
                    return 0.12;
                })
            )
            .force('charge', d3.forceManyBody().strength((d: any) => {
                if (d.type === 'evidence') return -3;
                if (d.type === 'source') return -35;
                if (d.type === 'theme') return -100;
                if (d.type === 'persona') return -60;
                if (d.type === 'recommendation') return -50;
                return -25;
            }))
            .force('collision', d3.forceCollide().radius((d: any) => {
                if (d.type === 'evidence') return 4;
                const zoneA = ['theme', 'persona', 'recommendation', 'gap', 'journey_stage', 'feature', 'roadmap_item'];
                if (zoneA.includes(d.type)) {
                    // Zone A: generous spacing (minimum 45px for core nodes)
                    if (d.type === 'theme') return Math.max(45, (d.size || 20) + 12);
                    return Math.max(35, (d.size || 12) + 8);
                }
                // Zone B: sources
                const nonEvCount = visibleNodes.filter((n: any) => n.type !== 'evidence').length;
                const baseRadius = nonEvCount > 40 ? 22 : nonEvCount > 20 ? 30 : 40;
                return Math.max(baseRadius, (d.size || 10) + 6);
            }));

        simulationRef.current = simulation;

        // --- EDGE RENDERING (3 tiers) ---
        const edgeColorMap: Record<string, string> = {
            'from': '#D0D0D0',
            'supported_by': '#B8B800',
            'experiences': '#00B7C3',
            'addresses': '#00B7C3',
            'quoted_in': '#D0D0D0',
        };

        // Tier 1: Structural (supported_by) - always visible
        const tier1Edges = visibleEdges.filter((e: any) => e.type === 'supported_by');
        // Tier 2: Relationship (experiences, addresses) - visible at 1.2x+
        const tier2Edges = visibleEdges.filter((e: any) => e.type === 'experiences' || e.type === 'addresses');
        // Tier 3: Provenance (from, quoted_in) - hairlines at rest, visible on hover/2.0x+
        const tier3Edges = visibleEdges.filter((e: any) => e.type === 'from' || e.type === 'quoted_in');

        // Render tier 3 first (lowest z)
        const linkT3 = g.append('g').attr('class', 'edges-t3')
            .selectAll('line').data(tier3Edges).join('line')
            .attr('stroke', '#E0E0E0')
            .attr('stroke-opacity', 0.08)
            .attr('stroke-width', 0.3);

        // Render tier 1 (structural)
        const linkT1 = g.append('g').attr('class', 'edges-t1')
            .selectAll('line').data(tier1Edges).join('line')
            .attr('stroke', '#B8B800')
            .attr('stroke-opacity', 0.3)
            .attr('stroke-width', (d: any) => Math.max(1.5, d.weight * 3));

        // Render tier 2 (relationship)
        const linkT2 = g.append('g').attr('class', 'edges-t2')
            .selectAll('line').data(tier2Edges).join('line')
            .attr('stroke', '#00B7C3')
            .attr('stroke-opacity', 0.0)  // Hidden at default, shown at 1.2x+
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '6,4');

        const allLinks = { t1: linkT1, t2: linkT2, t3: linkT3 };

        // --- ORPHAN EVIDENCE CLUSTER (bottom of graph) ---
        const orphanGroup = g.append('g').attr('class', 'orphan-cluster');
        if (orphanEvidence.length > 0) {
            const orphanY = cy + maxRadius * 1.05;
            const orphanX = cx;
            const cols = Math.ceil(Math.sqrt(orphanEvidence.length));
            const spacing = 6;
            const clusterWidth = cols * spacing;

            // Label
            orphanGroup.append('text')
                .attr('x', orphanX).attr('y', orphanY - 12)
                .attr('text-anchor', 'middle')
                .attr('fill', '#CC6644')
                .attr('font-size', '10px')
                .attr('font-family', "'Helvetica Neue', Arial, sans-serif")
                .attr('font-weight', '600')
                .text(`${orphanEvidence.length} unlinked evidence (${graph.stats?.evidenceUtilization !== undefined ? (100 - graph.stats.evidenceUtilization) : '?'}%)`);

            // Render as small squares in a grid
            orphanEvidence.forEach((ev, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const ox = orphanX - clusterWidth / 2 + col * spacing;
                const oy = orphanY + row * spacing;

                orphanGroup.append('rect')
                    .attr('x', ox - 2).attr('y', oy - 2)
                    .attr('width', 4).attr('height', 4)
                    .attr('fill', '#E8D888')
                    .attr('opacity', 0.5)
                    .attr('rx', 0.5)
                    .style('cursor', 'pointer')
                    .on('click', () => { setSelectedNode(ev); onNodeClick?.(ev); });
            });

            // Hover tooltip for cluster
            orphanGroup.append('rect')
                .attr('x', orphanX - clusterWidth / 2 - 4)
                .attr('y', orphanY - 4)
                .attr('width', clusterWidth + 8)
                .attr('height', Math.ceil(orphanEvidence.length / cols) * spacing + 8)
                .attr('fill', 'transparent')
                .style('cursor', 'pointer')
                .on('click', () => {
                    // Click cluster label to select first orphan
                    if (orphanEvidence[0]) { setSelectedNode(orphanEvidence[0]); onNodeClick?.(orphanEvidence[0]); }
                });
        }

        // --- NODE RENDERING (4 shapes) ---
        const node = g.append('g').attr('class', 'nodes')
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
            .on('click', (_: any, d: any) => { setSelectedNode(d); onNodeClick?.(d); });

        node.each(function(this: any, d: any) {
            const el = d3.select(this);
            const r = d.size || 10;

            if (d.type === 'theme') {
                // DIAMOND - analytical backbone
                const themeR = Math.max(r, 32);
                const pts = `0,${-themeR} ${themeR},0 0,${themeR} ${-themeR},0`;
                const diamond = el.append('polygon').attr('points', pts);
                if (d.isThinTheme) {
                    diamond.attr('fill', 'rgba(184,184,0,0.25)')
                        .attr('stroke', '#B8B800').attr('stroke-width', 2)
                        .attr('stroke-dasharray', '6,3');
                } else {
                    diamond.attr('fill', '#B8B800')
                        .attr('stroke', '#0D0D0D').attr('stroke-width', 1.5);
                }
                // Source diversity indicator: small ring showing concentration
                if (d.sourceConcentration && d.sourceConcentration > 0.5) {
                    const warningR = 6;
                    const warningColor = d.sourceConcentration > 0.7 ? '#E24B4A' : '#CC6644';
                    el.append('circle')
                        .attr('cx', themeR - 4).attr('cy', -themeR + 4).attr('r', warningR)
                        .attr('fill', warningColor).attr('stroke', '#FFF').attr('stroke-width', 1);
                    // Percentage text inside
                    el.append('text')
                        .attr('x', themeR - 4).attr('y', -themeR + 7)
                        .attr('text-anchor', 'middle').attr('fill', '#FFF')
                        .attr('font-size', '6px').attr('font-weight', '700')
                        .text(Math.round(d.sourceConcentration * 100));
                }
            } else if (d.type === 'source') {
                // CIRCLE - sized by evidence count
                const sourceR = Math.max(8, Math.min(24, Math.sqrt(d.metadata?.itemCount || 3) * 4));
                const tierStyle = d.metadata?.tierStyle || getTierStyle(d.tier || 3);
                const circle = el.append('circle').attr('r', sourceR).attr('fill', tierStyle.fill);
                if (tierStyle.stroke !== 'none') {
                    circle.attr('stroke', tierStyle.stroke).attr('stroke-width', tierStyle.strokeWidth);
                    if (tierStyle.strokeDash !== 'none') circle.attr('stroke-dasharray', tierStyle.strokeDash);
                }
                // Store computed radius for label offset
                d._renderedR = sourceR;
            } else if (d.type === 'evidence') {
                // CIRCLE - small, opacity by freshness
                const freshness = d.freshnessScore || 50;
                const opacity = Math.max(0.2, Math.min(0.5, freshness / 150));
                el.append('circle')
                    .attr('r', Math.max(2, r / 2.5))
                    .attr('fill', '#CCCCCC')
                    .attr('stroke', d.metadata?.enriched ? '#00B7C3' : 'none')
                    .attr('stroke-width', d.metadata?.enriched ? 1 : 0)
                    .attr('opacity', opacity);
            } else if (d.type === 'persona') {
                // ROUNDED RECT - entity card shape
                if (d.imageUrl) {
                    const imgR = Math.max(r, 14);
                    el.append('clipPath').attr('id', `clip-${d.id}`)
                        .append('rect').attr('x', -imgR).attr('y', -imgR)
                        .attr('width', imgR * 2).attr('height', imgR * 2).attr('rx', 4);
                    el.append('image')
                        .attr('xlink:href', d.imageUrl)
                        .attr('x', -imgR).attr('y', -imgR)
                        .attr('width', imgR * 2).attr('height', imgR * 2)
                        .attr('clip-path', `url(#clip-${d.id})`)
                        .style('filter', 'grayscale(100%) contrast(1.2) brightness(0.95)');
                    el.append('rect')
                        .attr('x', -imgR).attr('y', -imgR)
                        .attr('width', imgR * 2).attr('height', imgR * 2)
                        .attr('rx', 4).attr('fill', 'none')
                        .attr('stroke', '#0D0D0D').attr('stroke-width', 2);
                } else {
                    el.append('rect')
                        .attr('x', -r).attr('y', -r)
                        .attr('width', r * 2).attr('height', r * 2)
                        .attr('rx', 4).attr('fill', '#00B7C3')
                        .attr('stroke', '#0D0D0D').attr('stroke-width', 1);
                }
            } else if (d.type === 'journey_stage') {
                // ROUNDED RECT - entity card
                el.append('rect')
                    .attr('x', -r).attr('y', -r * 0.6)
                    .attr('width', r * 2).attr('height', r * 1.2)
                    .attr('rx', 4).attr('fill', d.color || '#00B7C3')
                    .attr('stroke', '#0D0D0D').attr('stroke-width', 0.5).attr('opacity', 0.85);
            } else if (['recommendation', 'feature', 'roadmap_item', 'gap'].includes(d.type)) {
                // HEXAGON - action-oriented
                const hexR = Math.max(r, 12);
                const hex = Array.from({length: 6}, (_, i) => {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    return `${hexR * Math.cos(angle)},${hexR * Math.sin(angle)}`;
                }).join(' ');
                const fill = d.type === 'gap' ? (d.color || '#CC6644') : (d.color || '#00B7C3');
                el.append('polygon').attr('points', hex)
                    .attr('fill', fill).attr('stroke', '#0D0D0D').attr('stroke-width', 1);
            } else {
                el.append('circle').attr('r', r)
                    .attr('fill', d.color || '#115054').attr('stroke', '#0D0D0D').attr('stroke-width', 1);
            }
        });

        // --- LABEL SYSTEM ---
        const labelGroup = node.append('g').attr('class', 'label-group');
        labelGroup.each(function(this: any, d: any) {
            const el = d3.select(this);
            const isEvidence = d.type === 'evidence';
            const nodeR = d._renderedR || d.size || 10;

            let labelText = '';
            if (d.type === 'theme') {
                labelText = (d.label || '').substring(0, 35);
                if (d.evidenceCount) labelText += ` (${d.evidenceCount})`;
            } else if (d.type === 'source') {
                labelText = (d.label || '').substring(0, 22);
            } else if (d.type === 'persona') {
                labelText = (d.label || '').substring(0, 20);
            } else if (d.type === 'recommendation') {
                labelText = (d.label || '').substring(0, 28);
            } else if (isEvidence) {
                labelText = (d.label || '').substring(0, 35);
            } else {
                labelText = (d.label || '').substring(0, 22);
            }

            const fontSize = d.type === 'theme' ? 10 : d.type === 'evidence' ? 7 : 9;
            const fontWeight = d.type === 'theme' ? '700' : d.type === 'persona' ? '600' : '500';
            const labelY = nodeR + (d.type === 'theme' ? 20 : 12);

            const backdrop = el.append('rect').attr('class', 'label-bg')
                .attr('fill', 'rgba(255,255,255,0.92)').attr('rx', 2).attr('ry', 2)
                .attr('display', isEvidence ? 'none' : 'block');

            const textEl = el.append('text').attr('class', 'label-text')
                .text(labelText).attr('dy', labelY).attr('text-anchor', 'middle')
                .attr('fill', '#333').attr('font-size', `${fontSize}px`)
                .attr('font-family', "'Helvetica Neue', Arial, sans-serif")
                .attr('font-weight', fontWeight)
                .attr('display', isEvidence ? 'none' : 'block')
                .attr('pointer-events', 'none');

            setTimeout(() => {
                try {
                    const tn = textEl.node();
                    if (tn) {
                        const bbox = (tn as SVGTextElement).getBBox();
                        backdrop.attr('x', bbox.x - 3).attr('y', bbox.y - 1)
                            .attr('width', bbox.width + 6).attr('height', bbox.height + 2);
                    }
                } catch { }
            }, 100);
        });

        // --- PROGRESSIVE ZOOM DISCLOSURE ---
        function updateVisibilityForZoom(k: number) {
            // Labels
            node.selectAll('.label-text').attr('display', (_: any, i: number, nodes: any) => {
                const d = d3.select(nodes[i].parentNode.parentNode).datum() as any;
                if (d.type === 'evidence') return k >= 2.0 ? 'block' : 'none';
                if (d.type === 'theme' || d.type === 'persona') return 'block';
                if (d.type === 'source') return k >= 0.8 ? 'block' : 'none';
                return k >= 1.2 ? 'block' : 'none';
            });
            node.selectAll('.label-bg').attr('display', (_: any, i: number, nodes: any) => {
                const d = d3.select(nodes[i].parentNode.parentNode).datum() as any;
                if (d.type === 'evidence') return k >= 2.0 ? 'block' : 'none';
                if (d.type === 'theme' || d.type === 'persona') return 'block';
                if (d.type === 'source') return k >= 0.8 ? 'block' : 'none';
                return k >= 1.2 ? 'block' : 'none';
            });

            // Tier 2 edges: relationship - fade in at 1.2x
            linkT2.attr('stroke-opacity', k >= 1.2 ? 0.25 : 0.0);

            // Tier 3 edges: provenance - more visible at 2.0x
            linkT3.attr('stroke-opacity', k >= 2.0 ? 0.15 : 0.08)
                .attr('stroke-width', k >= 2.0 ? 0.6 : 0.3);
        }
        updateVisibilityForZoom(1);

        // --- FULL PROVENANCE CHAIN HOVER ---
        node.on('mouseover', function(this: any, _: any, d: any) {
            d3.select(this).select('circle,rect,polygon,image').attr('stroke', '#B8B800').attr('stroke-width', 3);

            // Build full provenance chain: include direct connections AND their parents/children
            const directIds = new Set<string>([d.id]);
            const chainIds = new Set<string>([d.id]);

            visibleEdges.forEach((e: any) => {
                const srcId = typeof e.source === 'object' ? e.source.id : e.source;
                const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
                if (srcId === d.id || tgtId === d.id) {
                    directIds.add(srcId); directIds.add(tgtId);
                    chainIds.add(srcId); chainIds.add(tgtId);
                }
            });

            // Second hop: for theme hovers, also show evidence->source chains
            if (d.type === 'theme') {
                directIds.forEach(connId => {
                    visibleEdges.forEach((e: any) => {
                        const srcId = typeof e.source === 'object' ? e.source.id : e.source;
                        const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
                        if ((srcId === connId || tgtId === connId) && (e.type === 'from' || e.type === 'experiences' || e.type === 'addresses')) {
                            chainIds.add(srcId); chainIds.add(tgtId);
                        }
                    });
                });
            }

            // Dim unconnected nodes
            node.attr('opacity', (n: any) => chainIds.has(n.id) ? 1 : 0.1);

            // Highlight edges based on chain
            linkT1.attr('stroke-opacity', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? 0.8 : 0.03;
            }).attr('stroke-width', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? Math.max(2.5, l.weight * 3) : 0.5;
            });

            linkT2.attr('stroke-opacity', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? 0.7 : 0.0;
            }).attr('stroke-width', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? 2 : 1;
            });

            // Tier 3: "starburst" effect for source nodes
            linkT3.attr('stroke-opacity', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? 0.5 : 0.04;
            }).attr('stroke-width', (l: any) => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return (chainIds.has(s) && chainIds.has(t)) ? 1 : 0.3;
            });
        }).on('mouseout', function(this: any) {
            d3.select(this).select('circle,rect,polygon,image').attr('stroke', (d: any) => {
                if (d.type === 'source') return getTierStyle(d.tier || 3).stroke;
                if (d.type === 'theme') return d.isThinTheme ? '#B8B800' : '#0D0D0D';
                return '#0D0D0D';
            }).attr('stroke-width', (d: any) => {
                if (d.type === 'source') return getTierStyle(d.tier || 3).strokeWidth;
                return d.type === 'persona' ? 2 : 1;
            });
            node.attr('opacity', 1);
            linkT1.attr('stroke-opacity', 0.3).attr('stroke-width', (d: any) => Math.max(1.5, d.weight * 3));
            linkT2.attr('stroke-opacity', currentZoom >= 1.2 ? 0.25 : 0.0).attr('stroke-width', 1);
            linkT3.attr('stroke-opacity', currentZoom >= 2.0 ? 0.15 : 0.08)
                .attr('stroke-width', currentZoom >= 2.0 ? 0.6 : 0.3);
        });

        // --- TICK ---
        simulation.on('tick', () => {
            linkT1.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
            linkT2.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
            linkT3.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        // Auto zoom-to-fit
        simulation.on('end', () => {
            const allRenderNodes = [...visibleNodes];
            if (allRenderNodes.length < 3) return;
            const pad = orphanEvidence.length > 0 ? 60 : 40;
            const xs = allRenderNodes.map((n: any) => n.x);
            const ys = allRenderNodes.map((n: any) => n.y);
            const x0 = Math.min(...xs) - pad;
            const y0 = Math.min(...ys) - pad;
            const x1 = Math.max(...xs) + pad;
            // Include orphan cluster in bounds
            const y1 = Math.max(...ys, orphanEvidence.length > 0 ? cy + maxRadius * 1.05 + Math.ceil(orphanEvidence.length / Math.ceil(Math.sqrt(orphanEvidence.length))) * 6 + 20 : 0) + pad;
            const bw = x1 - x0;
            const bh = y1 - y0;
            const scale = Math.min(width / bw, h / bh, 1.6) * 0.88;
            const tx = width / 2 - (x0 + bw / 2) * scale;
            const ty = h / 2 - (y0 + bh / 2) * scale;
            svg.transition().duration(800)
                .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        });

        return () => { simulation.stop(); };
    }, [graph, height]);

    // --- COMPUTED VALUES ---
    const stats = graph.stats;
    const breadcrumbs = selectedNode ? buildBreadcrumbs(selectedNode, graph) : [];

    // Connected nodes grouped by type
    const connectedNodes = selectedNode ? graph.edges
        .filter(e => {
            const srcId = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const tgtId = typeof e.target === 'string' ? e.target : (e.target as any).id;
            return srcId === selectedNode.id || tgtId === selectedNode.id;
        })
        .map(e => {
            const srcId = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const tgtId = typeof e.target === 'string' ? e.target : (e.target as any).id;
            const otherId = srcId === selectedNode.id ? tgtId : srcId;
            const otherNode = graph.nodes.find(n => n.id === otherId);
            return otherNode ? { node: otherNode, edgeType: e.type } : null;
        })
        .filter(Boolean) : [];

    // Group connections by type
    const connectionGroups = connectedNodes.reduce((acc, c: any) => {
        const t = c.node.type;
        if (!acc[t]) acc[t] = [];
        acc[t].push(c);
        return acc;
    }, {} as Record<string, any[]>);

    const totalConnections = connectedNodes.length;

    // Quality assessment
    const utilization = stats?.evidenceUtilization ?? 0;
    const themeStrength = stats?.themeStrengthPct ?? 0;
    const concentrationCount = stats?.sourceConcentrationCount ?? 0;
    const qualityScore = (utilization > 60 ? 1 : 0) + (themeStrength > 80 ? 1 : 0) + (concentrationCount === 0 ? 1 : 0);

    return (
        <div ref={containerRef} className="w-full bg-white border border-[var(--border-primary)] overflow-hidden" style={{ position: 'relative' }}>
            {/* QUALITY NARRATIVE STATS BAR */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D0D0D] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '14px', letterSpacing: '3px', color: '#FFFFFF' }}>KNOWLEDGE GRAPH</span>
                    {stats && (
                        <>
                            {/* Quality indicator */}
                            <span style={{
                                fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', fontWeight: 700,
                                color: qualityScore >= 3 ? '#0CCE6B' : qualityScore >= 2 ? '#B8B800' : '#E24B4A',
                                background: (qualityScore >= 3 ? '#0CCE6B' : qualityScore >= 2 ? '#B8B800' : '#E24B4A') + '15',
                                padding: '1px 8px', borderRadius: '2px',
                            }}>
                                {'●'.repeat(qualityScore)}{'○'.repeat(3 - qualityScore)} {qualityScore}/3
                            </span>
                            {/* Evidence utilization */}
                            <span style={{
                                fontFamily: "'JetBrains Mono',monospace", fontSize: '10px',
                                color: utilization > 60 ? '#0CCE6B' : utilization > 30 ? '#B8B800' : '#E24B4A',
                            }}>
                                {utilization}% utilized
                            </span>
                            {/* Theme strength */}
                            <span style={{
                                fontFamily: "'JetBrains Mono',monospace", fontSize: '10px',
                                color: themeStrength > 80 ? '#0CCE6B' : themeStrength > 50 ? '#B8B800' : '#E24B4A',
                            }}>
                                {stats.totalThemes} themes ({themeStrength}% strong)
                            </span>
                            {/* Source diversity */}
                            {concentrationCount > 0 && (
                                <span style={{
                                    fontFamily: "'JetBrains Mono',monospace", fontSize: '10px',
                                    color: '#E24B4A', background: 'rgba(226,75,74,0.1)',
                                    padding: '1px 6px', borderRadius: '2px',
                                }}>
                                    {concentrationCount} single-source theme{concentrationCount > 1 ? 's' : ''}
                                </span>
                            )}
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: '#555' }}>
                                {stats.totalSources} src | {stats.totalPersonas} per | {stats.totalRecommendations} rec
                            </span>
                        </>
                    )}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', color: '#555' }}>
                    zoom: {currentZoom.toFixed(1)}x
                </div>
            </div>

            {/* SVG Canvas */}
            <svg ref={svgRef} width="100%" height={height} style={{ background: '#FFFFFF' }}
                role="img" aria-label={`Research knowledge graph with ${graph.nodes.length} nodes and ${graph.edges.length} connections. Click nodes to view details. Use mouse to pan and scroll to zoom.`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && selectedNode) setSelectedNode(null);
                }}
            />

            {/* FLOATING DETAIL PANEL */}
            {selectedNode && (
                <div style={{
                    position: 'absolute', top: 40, right: 12, bottom: 50,
                    width: 340, maxHeight: height - 60,
                    background: '#FFFFFF', border: '1px solid #E0E0E0',
                    borderTop: `3px solid ${TYPE_COLORS[selectedNode.type] || '#888'}`,
                    borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    zIndex: 20,
                }}>
                    {/* Header: breadcrumbs + close */}
                    <div style={{ padding: '10px 16px 12px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, flex: 1, minWidth: 0, marginRight: 8 }}>
                                {breadcrumbs.map((crumb, i) => {
                                    const isLast = i === breadcrumbs.length - 1;
                                    const color = TYPE_COLORS[crumb.node.type] || '#888';
                                    return (
                                        <React.Fragment key={crumb.node.id}>
                                            {i > 0 && <span style={{ fontSize: 9, color: '#CCC', margin: '0 1px', userSelect: 'none' }}>/</span>}
                                            <button
                                                onClick={() => { if (!isLast) { setSelectedNode(crumb.node); onNodeClick?.(crumb.node); } }}
                                                style={{
                                                    fontFamily: "'Helvetica Neue',sans-serif", fontSize: 9, fontWeight: isLast ? 700 : 500,
                                                    color: isLast ? color : '#888', background: 'none', border: 'none', padding: '1px 3px',
                                                    cursor: isLast ? 'default' : 'pointer',
                                                    textDecoration: isLast ? 'none' : 'underline', textDecorationColor: '#CCC',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    maxWidth: isLast ? 200 : 120, lineHeight: 1.3,
                                                }}
                                                title={crumb.node.label}
                                            >
                                                {crumb.label}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <button onClick={() => setSelectedNode(null)} style={{
                                background: '#F0F0F0', border: '1px solid #E0E0E0', borderRadius: 2,
                                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: 13, color: '#888', flexShrink: 0,
                            }} title="Close">&#x2715;</button>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: TYPE_COLORS[selectedNode.type] || '#888', marginBottom: 4 }}>
                                {TYPE_LABELS[selectedNode.type]}{selectedNode.tier ? ` | TIER ${selectedNode.tier}` : ''}
                            </div>
                            <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3 }}>
                                {selectedNode.label}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content - structured sections */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                        {/* Section 1: Description */}
                        {selectedNode.metadata?.description && (
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <p style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 12, color: '#444', lineHeight: 1.6, margin: 0 }}>
                                    {selectedNode.metadata.description}
                                </p>
                            </div>
                        )}

                        {/* Section 2: Quote */}
                        {selectedNode.metadata?.quote && (
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <p style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 11, fontStyle: 'italic', color: '#666', borderLeft: '3px solid #B8B800', paddingLeft: 10, margin: 0, lineHeight: 1.5 }}>
                                    "{selectedNode.metadata.quote}"
                                </p>
                            </div>
                        )}

                        {/* Section 3: Evidence body */}
                        {selectedNode.metadata?.content && (
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <p style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 11, color: '#666', lineHeight: 1.5, margin: 0 }}>
                                    {selectedNode.metadata.content}
                                </p>
                            </div>
                        )}

                        {selectedNode.metadata?.role && (
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <p style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 11, color: '#888', margin: 0 }}>{selectedNode.metadata.role}</p>
                            </div>
                        )}

                        {/* Section 4: Stats for themes - mini source bar chart */}
                        {selectedNode.type === 'theme' && selectedNode.evidenceCount !== undefined && (
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Evidence</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{selectedNode.evidenceCount}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Sources</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{selectedNode.metadata?.linkedSources || 0}</div>
                                    </div>
                                    {selectedNode.sourceConcentration !== undefined && selectedNode.sourceConcentration > 0.5 && (
                                        <div>
                                            <div style={{ fontSize: 9, color: '#CC6644', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Concentration</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#CC6644' }}>{Math.round(selectedNode.sourceConcentration * 100)}%</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Source link */}
                        {selectedNode.url && (
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <a href={selectedNode.url} target="_blank" rel="noopener noreferrer" style={{
                                    fontFamily: "'Helvetica Neue',sans-serif", fontSize: 11, color: '#115054',
                                    textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '4px 8px', background: '#F0FAFA', borderRadius: 3, border: '1px solid #E0E0E0',
                                }}>View Original Source</a>
                            </div>
                        )}

                        {/* Section 5: Connected nodes - grouped by type with counts */}
                        {totalConnections > 0 && (
                            <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAA', marginBottom: 8 }}>
                                    CONNECTIONS ({totalConnections}{totalConnections > 30 ? ` - showing 30 of ${totalConnections}` : ''})
                                </div>
                                {Object.entries(connectionGroups).map(([type, items]) => (
                                    <div key={type} style={{ marginBottom: 8 }}>
                                        <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: TYPE_COLORS[type] || '#888', marginBottom: 4 }}>
                                            {TYPE_LABELS[type] || type} ({items.length})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {items.slice(0, 10).map((c: any, i: number) => {
                                                const evidenceKey = c.node.id ? `kg::${c.node.id}` : `kg::${type}::${i}`;
                                                const isEvExcluded = excludedSources?.has(evidenceKey) || false;
                                                return (
                                                <div key={i}
                                                    style={{
                                                        padding: '4px 8px', background: isEvExcluded ? '#f8f8f8' : '#FAFAFA', border: '1px solid #F0F0F0',
                                                        borderRadius: 3, cursor: 'pointer',
                                                        borderLeft: `3px solid ${isEvExcluded ? '#ccc' : (c.node.color || TYPE_COLORS[c.node.type] || '#888')}`,
                                                        opacity: isEvExcluded ? 0.4 : 1, transition: 'opacity 0.15s',
                                                        display: 'flex', gap: 6, alignItems: 'flex-start',
                                                    }}>
                                                    {/* Include/Exclude toggle for evidence nodes */}
                                                    {(c.node.type === 'evidence' || c.node.type === 'source') && setExcludedSources && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExcludedSources(prev => { const next = new Set(prev); if (next.has(evidenceKey)) next.delete(evidenceKey); else next.add(evidenceKey); return next; }); }}
                                                            style={{
                                                                width: 16, height: 16, borderRadius: 2, flexShrink: 0, marginTop: 1,
                                                                border: `1.5px solid ${isEvExcluded ? '#ccc' : '#115054'}`,
                                                                background: isEvExcluded ? '#fff' : '#115054', color: isEvExcluded ? '#ccc' : '#fff',
                                                                fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}
                                                            title={isEvExcluded ? 'Include in report' : 'Exclude from report'}
                                                        >{isEvExcluded ? '' : '\u2713'}</button>
                                                    )}
                                                    <div style={{ flex: 1, minWidth: 0 }} onClick={() => { setSelectedNode(c.node); onNodeClick?.(c.node); }}>
                                                        <div style={{
                                                            fontFamily: "'Helvetica Neue',sans-serif", fontSize: 11, fontWeight: 600,
                                                            color: isEvExcluded ? '#aaa' : '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            textDecoration: isEvExcluded ? 'line-through' : 'none',
                                                        }}>
                                                            {c.node.label}
                                                        </div>
                                                        {c.node.url && (
                                                            <a href={c.node.url} target="_blank" rel="noopener noreferrer"
                                                                style={{ fontSize: 9, color: '#115054', textDecoration: 'underline' }}
                                                                onClick={e => e.stopPropagation()}>View Source</a>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                            {items.length > 10 && (
                                                <div style={{ fontSize: 9, color: '#888', padding: '2px 8px' }}>+{items.length - 10} more</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* COMPREHENSIVE LEGEND - expandable */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-primary)] bg-[#0D0D0D]" style={{ position: 'relative' }}>
                <div className="flex items-center gap-4">
                    {/* Compact legend items */}
                    {[
                        { color: '#B8B800', border: '#0D0D0D', label: 'Theme', shape: 'diamond' },
                        { color: '#00B7C3', border: '#0D0D0D', label: 'Persona', shape: 'roundrect' },
                        { color: '#00B7C3', border: '#0D0D0D', label: 'Rec/Action', shape: 'hex' },
                        { color: '#CC6644', border: '#0D0D0D', label: 'Gap', shape: 'hex' },
                        { color: '#0D0D0D', border: '#FFF', label: 'Src T1' },
                        { color: '#444', border: '#666', label: 'Src T2' },
                        { color: 'transparent', border: '#CCC', label: 'Src T3', dashed: true },
                        { color: '#CCCCCC', border: 'transparent', label: 'Evidence', small: true },
                        { color: '#E8D888', border: 'transparent', label: 'Orphan', small: true, shape: 'rect' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1">
                            <div style={{
                                width: item.small ? '6px' : '10px', height: item.small ? '6px' : '10px',
                                backgroundColor: item.color,
                                border: `1px ${item.dashed ? 'dashed' : 'solid'} ${item.border}`,
                                borderRadius: item.shape === 'rect' ? '1px' : item.shape === 'diamond' ? '0' : item.shape === 'roundrect' ? '2px' : item.shape === 'hex' ? '0' : '50%',
                                transform: item.shape === 'diamond' ? 'rotate(45deg) scale(0.85)' : 'none',
                            }}></div>
                            <span style={{ fontFamily: 'Archivo,sans-serif', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#888' }}>{item.label}</span>
                        </div>
                    ))}
                    <span style={{ color: '#333', margin: '0 4px' }}>|</span>
                    {/* Edge legend */}
                    <div className="flex items-center gap-1">
                        <div style={{ width: 16, height: 0, borderTop: '2px solid #B8B800' }}></div>
                        <span style={{ fontSize: '8px', color: '#888', fontWeight: 700, textTransform: 'uppercase' as const }}>Supports</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div style={{ width: 16, height: 0, borderTop: '1.5px dashed #00B7C3' }}></div>
                        <span style={{ fontSize: '8px', color: '#888', fontWeight: 700, textTransform: 'uppercase' as const }}>Relates</span>
                    </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', color: '#555' }}>
                    {graph.nodes.length} nodes
                </div>
            </div>
        </div>
    );
};

export default ResearchKnowledgeGraph;
