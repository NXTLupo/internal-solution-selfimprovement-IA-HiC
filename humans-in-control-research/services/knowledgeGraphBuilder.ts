/**
 * Knowledge Graph Builder v2 — Elevated from visualization novelty to analytical instrument
 *
 * Constructs an interactive knowledge graph from research pipeline data.
 * The graph grows as each analysis stage completes.
 *
 * Node types: source, evidence, theme, persona, recommendation
 * Edge types: supported_by, experiences, addresses, from, quoted_in
 *
 * v2 additions:
 * - parentSourceId on evidence nodes (enables clustering)
 * - Orphan evidence detection (evidence with no theme link)
 * - Tier-based visual encoding on sources (T1/T2/T3)
 * - Thin theme detection (themes with <3 evidence connections)
 * - Source concentration risk per theme
 */

// --- TYPES ---

export interface KGNode {
    id: string;
    type: 'source' | 'evidence' | 'theme' | 'persona' | 'recommendation' | 'journey_stage' | 'feature' | 'roadmap_item' | 'gap';
    label: string;
    tier?: number;
    freshnessScore?: number;
    relevanceScore?: number;
    url?: string;
    imageUrl?: string;
    color?: string;
    size?: number;
    metadata?: Record<string, any>;
    // v2 fields
    parentSourceId?: string;      // Evidence → which source it came from
    isOrphan?: boolean;           // Evidence not linked to any theme
    isThinTheme?: boolean;        // Theme with <3 evidence connections
    evidenceCount?: number;       // Theme: how many evidence nodes link to it
    sourceConcentration?: number; // Theme: % of evidence from single source (0-1)
    dominantSource?: string;      // Theme: name of most-cited source
}

export interface KGEdge {
    source: string;
    target: string;
    type: 'supported_by' | 'experiences' | 'addresses' | 'from' | 'quoted_in';
    weight: number;
    label?: string;
}

export interface KnowledgeGraph {
    nodes: KGNode[];
    edges: KGEdge[];
    stats?: GraphStats;
}

export interface GraphStats {
    totalSources: number;
    totalEvidence: number;
    totalThemes: number;
    totalPersonas: number;
    totalRecommendations: number;
    totalJourneyStages?: number;
    totalFeatures?: number;
    totalRoadmapItems?: number;
    totalGaps?: number;
    orphanEvidence: number;
    thinThemes: number;
    avgEvidencePerTheme: number;
    evidenceUtilization: number;
    sourceConcentrationCount: number;
    themeStrengthPct: number;
}

// --- TIER VISUAL ENCODING (NXT Humans Brand) ---
// T1: Academic/Government — authoritative, solid black
// T2: Industry/News — professional, dark gray
// T3: Community/UGC — informal, light outline

const SOURCE_TIER_STYLES: Record<number, { fill: string; stroke: string; strokeWidth: number; strokeDash: string; labelColor: string }> = {
    1: { fill: '#0D0D0D', stroke: 'none', strokeWidth: 0, strokeDash: 'none', labelColor: '#FFFFFF' },
    2: { fill: '#444444', stroke: '#666666', strokeWidth: 0.5, strokeDash: 'none', labelColor: '#FFFFFF' },
    3: { fill: 'transparent', stroke: '#CCCCCC', strokeWidth: 1, strokeDash: '4,3', labelColor: '#999999' },
};

export function getTierStyle(tier: number) {
    return SOURCE_TIER_STYLES[tier] || SOURCE_TIER_STYLES[3];
}

// --- BUILDER ---

/**
 * Build knowledge graph from collected source data.
 * Called after data collection to create the initial source -> evidence graph.
 */
export function buildSourceGraph(sourceResults: any[]): KnowledgeGraph {
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];

    for (const src of sourceResults) {
        if (!src.items || src.items.length === 0) continue;

        const sourceId = `src_${src.sourceId || src.source?.replace(/\s/g, '_')}`;
        const tier = src.credibilityTier || 3;
        const tierStyle = getTierStyle(tier);

        nodes.push({
            id: sourceId,
            type: 'source',
            label: src.source?.replace(/ \(.*\)/, '') || 'Unknown',
            tier,
            color: tierStyle.fill,
            size: 20 + Math.min(src.items.length * 2, 30),
            metadata: {
                itemCount: src.items.length,
                query: src.query,
                tierStyle,
            },
        });

        for (let i = 0; i < Math.min(src.items.length, 8); i++) {
            const item = src.items[i];
            const evidenceId = `ev_${sourceId}_${i}`;
            // B5: Evidence quality encoding — size scales with relevance, metadata tracks freshness
            const relevance = item.relevanceScore || 50;
            const evSize = Math.max(6, Math.min(16, Math.round(6 + (relevance / 100) * 10))); // 6-16px
            const enriched = !!(item as any).enriched;
            nodes.push({
                id: evidenceId,
                type: 'evidence',
                label: (item.title || '').substring(0, 80),
                tier,
                url: item.url,
                freshnessScore: item.freshnessScore,
                relevanceScore: item.relevanceScore,
                color: '#F5F5F0',
                size: evSize,
                parentSourceId: sourceId,
                isOrphan: true, // Starts as orphan; cleared when linked to a theme
                metadata: { content: item.content?.substring(0, 300), date: item.date, enriched, relevance },
            });
            edges.push({
                source: sourceId,
                target: evidenceId,
                type: 'from',
                weight: 0.3,
            });
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Expand the graph with theme nodes after theme extraction.
 */
export function addThemesToGraph(graph: KnowledgeGraph, themes: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs by the number of themes already in the graph so repeated calls
    // (e.g. classic batch + chat-driven additive approvals) never collide.
    const themeOffset = nodes.filter(n => n.type === 'theme').length;
    for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        const themeId = `theme_${themeOffset + i}`;
        const linkedEvidenceIds: string[] = [];
        const linkedSourceIds: string[] = [];

        // Link themes to evidence AND source nodes via citations.
        // Three matching strategies (strongest to weakest):
        // 1) Citation sourceName matches a SOURCE node label (e.g., "Higher Ed Dive")
        // 2) Citation text appears in an evidence node's label or content
        // 3) Citation URL matches an evidence node's URL
        if (theme.citations) {
            for (const cit of theme.citations) {
                const chunkId = cit.sourceFile || '';
                const citSourceName = (cit.sourceName || '').toLowerCase();
                const citText = (cit.text || '').toLowerCase();
                const citUrl = cit.url || '';
                let matched = false;

                // Strategy 1: Match citation sourceName to a SOURCE node label
                // This creates theme -> source edges (the most important connections)
                if (citSourceName && citSourceName.length > 2) {
                    const matchingSource = nodes.find(n =>
                        n.type === 'source' && (
                            (n.label || '').toLowerCase().includes(citSourceName) ||
                            citSourceName.includes((n.label || '').toLowerCase())
                        )
                    );
                    if (matchingSource) {
                        // Link theme directly to the source
                        const edgeExists = edges.some(e => e.source === themeId && e.target === matchingSource.id);
                        if (!edgeExists) {
                            edges.push({
                                source: themeId,
                                target: matchingSource.id,
                                type: 'supported_by',
                                weight: 0.8,
                                label: citSourceName,
                            });
                        }
                        linkedSourceIds.push(matchingSource.id);

                        // Also find evidence nodes from this source and link them
                        const childEvidence = nodes.filter(n =>
                            n.type === 'evidence' && n.parentSourceId === matchingSource.id
                        );
                        for (const ev of childEvidence.slice(0, Math.min(8, Math.max(3, Math.ceil((matchingSource.metadata?.itemCount || 3) * 0.3))))) {
                            // Check if this evidence is relevant to the citation text
                            const evContent = `${ev.label} ${ev.metadata?.content || ''}`.toLowerCase();
                            const citWords = citText.split(/\s+/).filter(w => w.length > 4);
                            const overlap = citWords.filter(w => evContent.includes(w)).length;
                            if (overlap >= 2 || (citUrl && ev.url === citUrl)) {
                                const evEdgeExists = edges.some(e => e.source === themeId && e.target === ev.id);
                                if (!evEdgeExists) {
                                    edges.push({
                                        source: themeId,
                                        target: ev.id,
                                        type: 'supported_by',
                                        weight: 0.6,
                                        label: chunkId,
                                    });
                                    linkedEvidenceIds.push(ev.id);
                                    ev.isOrphan = false;
                                }
                                matched = true;
                            }
                        }
                        if (!matched && childEvidence.length > 0) {
                            // Fallback: link to the first evidence from this source
                            const ev = childEvidence[0];
                            const evEdgeExists = edges.some(e => e.source === themeId && e.target === ev.id);
                            if (!evEdgeExists) {
                                edges.push({
                                    source: themeId,
                                    target: ev.id,
                                    type: 'supported_by',
                                    weight: 0.4,
                                    label: chunkId,
                                });
                                linkedEvidenceIds.push(ev.id);
                                ev.isOrphan = false;
                            }
                        }
                        matched = true;
                    }
                }

                // Strategy 2: Match citation text/URL directly to evidence nodes
                if (!matched && (citText.length > 10 || citUrl)) {
                    const matchingEvidence = nodes.find(n =>
                        n.type === 'evidence' && (
                            (citUrl && n.url === citUrl) ||
                            (citText.length > 10 && n.metadata?.content?.toLowerCase().includes(citText.substring(0, 30)))
                        )
                    );
                    if (matchingEvidence) {
                        edges.push({
                            source: themeId,
                            target: matchingEvidence.id,
                            type: 'supported_by',
                            weight: 0.7,
                            label: chunkId,
                        });
                        linkedEvidenceIds.push(matchingEvidence.id);
                        matchingEvidence.isOrphan = false;
                        if (matchingEvidence.parentSourceId) {
                            linkedSourceIds.push(matchingEvidence.parentSourceId);
                        }
                        matched = true;
                    }
                }

                // Strategy 3: Create a citation node as last resort (only if URL available)
                if (!matched && citUrl) {
                    const citId = `cit_${themeId}_${edges.length}`;
                    nodes.push({
                        id: citId,
                        type: 'evidence',
                        label: cit.sourceName || chunkId || 'Citation',
                        url: citUrl,
                        color: '#F5F5F0',
                        size: 6,
                        isOrphan: false,
                        metadata: { text: cit.text, author: cit.author, date: cit.publicationDate },
                    });
                    edges.push({
                        source: themeId,
                        target: citId,
                        type: 'supported_by',
                        weight: 0.5,
                        label: chunkId,
                    });
                    linkedEvidenceIds.push(citId);
                }
            }
        }

        // FALLBACK: If no citations matched, use keyword overlap to link themes to sources
        // This ensures themes are ALWAYS connected to the evidence that informed them.
        if (linkedSourceIds.length === 0) {
            const themeWords = `${theme.name} ${theme.description || ''}`.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const sourceNodes = nodes.filter(n => n.type === 'source');
            for (const srcNode of sourceNodes) {
                // Check if any evidence from this source overlaps with theme keywords
                const childEvidence = nodes.filter(n => n.type === 'evidence' && n.parentSourceId === srcNode.id);
                for (const ev of childEvidence) {
                    const evText = `${ev.label} ${ev.metadata?.content || ''}`.toLowerCase();
                    const overlap = themeWords.filter((w: string) => evText.includes(w)).length;
                    if (overlap >= 3) {
                        const edgeExists = edges.some(e => e.source === themeId && e.target === srcNode.id);
                        if (!edgeExists) {
                            edges.push({
                                source: themeId,
                                target: srcNode.id,
                                type: 'supported_by',
                                weight: Math.min(overlap * 0.15, 0.6),
                            });
                            linkedSourceIds.push(srcNode.id);
                        }
                        ev.isOrphan = false;
                        linkedEvidenceIds.push(ev.id);
                        break; // One evidence match per source is enough
                    }
                }
            }
        }

        // Compute source concentration risk
        let sourceConcentration = 0;
        let dominantSource = '';
        if (linkedSourceIds.length > 0) {
            const sourceCounts: Record<string, number> = {};
            linkedSourceIds.forEach(sid => { sourceCounts[sid] = (sourceCounts[sid] || 0) + 1; });
            const maxCount = Math.max(...Object.values(sourceCounts));
            sourceConcentration = maxCount / linkedSourceIds.length;
            dominantSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
            // Resolve to source name
            const dominantNode = nodes.find(n => n.id === dominantSource);
            dominantSource = dominantNode?.label || dominantSource;
        }

        const isThin = linkedEvidenceIds.length < 3;

        nodes.push({
            id: themeId,
            type: 'theme',
            label: theme.name,
            color: isThin ? 'rgba(184,184,0,0.35)' : '#B8B800',
            size: Math.max(30, 25 + linkedEvidenceIds.length * 3),
            isThinTheme: isThin,
            evidenceCount: linkedEvidenceIds.length,
            sourceConcentration,
            dominantSource,
            metadata: {
                description: theme.description,
                quote: theme.quote,
                status: theme.status,
                linkedEvidence: linkedEvidenceIds.length,
                linkedSources: [...new Set(linkedSourceIds)].length,
            },
        });
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Expand the graph with persona nodes.
 */
export function addPersonasToGraph(graph: KnowledgeGraph, personas: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const personaOffset = nodes.filter(n => n.type === 'persona').length;
    for (let i = 0; i < personas.length; i++) {
        const persona = personas[i];
        const personaId = `persona_${personaOffset + i}`;

        nodes.push({
            id: personaId,
            type: 'persona',
            label: persona.name,
            imageUrl: persona.imageUrl,
            color: '#00B7C3',
            size: 22,
            metadata: { role: persona.role, quote: persona.quote, bio: persona.bio },
        });

        // Link personas to themes via keyword overlap
        const themeNodes = nodes.filter(n => n.type === 'theme');
        for (const themeNode of themeNodes) {
            const themeWords = (themeNode.label || '').toLowerCase().split(/\s+/);
            const personaText = `${persona.bio || ''} ${(persona.painPoints || []).map((p: any) => p.label).join(' ')}`.toLowerCase();
            const overlap = themeWords.filter(w => w.length > 3 && personaText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({
                    source: personaId,
                    target: themeNode.id,
                    type: 'experiences',
                    weight: Math.min(overlap * 0.2, 0.8),
                });
            }
        }

        // Link personas to evidence/source nodes that informed them.
        // Match persona pain points, quotes, and source attributions against
        // evidence node labels and content.
        const evidenceNodes = nodes.filter(n => n.type === 'evidence');
        const sourceNodes = nodes.filter(n => n.type === 'source');

        // Collect all persona text signals: pain point labels, quotes, source names
        const painPointTexts: string[] = (persona.painPoints || []).map((p: any) => (p.label || '').toLowerCase());
        const painPointSources: string[] = (persona.painPoints || []).map((p: any) => (p.source || '').toLowerCase()).filter(Boolean);
        const motivationSources: string[] = (persona.motivations || []).map((m: any) => (m.source || '').toLowerCase()).filter(Boolean);
        const allPersonaSources = [...new Set([...painPointSources, ...motivationSources])];
        const personaQuote = (persona.quote || '').toLowerCase();
        const personaBio = (persona.bio || '').toLowerCase();

        // 1) Direct source name matching: link to source nodes whose label matches cited sources
        for (const sourceNode of sourceNodes) {
            const sourceLabel = (sourceNode.label || '').toLowerCase();
            const matched = allPersonaSources.some(src =>
                src.includes(sourceLabel) || sourceLabel.includes(src)
            );
            if (matched) {
                edges.push({
                    source: personaId,
                    target: sourceNode.id,
                    type: 'supported_by',
                    weight: 0.5,
                });
            }
        }

        // 2) Evidence content matching: link to evidence whose title/content overlaps
        //    with persona pain points or bio. Use significant keyword overlap.
        const personaKeywords = [...painPointTexts, personaBio]
            .join(' ')
            .split(/\s+/)
            .filter(w => w.length > 4);
        const uniqueKeywords = [...new Set(personaKeywords)];

        for (const evNode of evidenceNodes) {
            const evText = `${(evNode.label || '')} ${(evNode.metadata?.content || '')}`.toLowerCase();
            const matchCount = uniqueKeywords.filter(w => evText.includes(w)).length;
            // Require meaningful overlap (3+ keywords) to avoid noise
            if (matchCount >= 3) {
                edges.push({
                    source: personaId,
                    target: evNode.id,
                    type: 'supported_by',
                    weight: Math.min(matchCount * 0.15, 0.7),
                });
                // Mark evidence as non-orphan since it now has a connection
                evNode.isOrphan = false;
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Expand the graph with recommendation nodes.
 */
export function addRecommendationsToGraph(graph: KnowledgeGraph, recommendations: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const recOffset = nodes.filter(n => n.type === 'recommendation').length;
    for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        const recId = `rec_${recOffset + i}`;

        nodes.push({
            id: recId,
            type: 'recommendation',
            label: rec.title,
            color: '#00B7C3',
            size: 18,
            metadata: { description: rec.description, impact: rec.impactLevel, actionItems: rec.actionItems },
        });

        const themeNodes = nodes.filter(n => n.type === 'theme');
        for (const themeNode of themeNodes) {
            const themeWords = (themeNode.label || '').toLowerCase().split(/\s+/);
            const recText = `${rec.title} ${rec.description || ''}`.toLowerCase();
            const overlap = themeWords.filter(w => w.length > 3 && recText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({
                    source: recId,
                    target: themeNode.id,
                    type: 'addresses',
                    weight: 0.6,
                });
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

// --- GRAPH ANALYTICS ---

function computeStats(nodes: KGNode[], edges: KGEdge[]): GraphStats {
    const sources = nodes.filter(n => n.type === 'source');
    const evidence = nodes.filter(n => n.type === 'evidence');
    const themes = nodes.filter(n => n.type === 'theme');
    const personas = nodes.filter(n => n.type === 'persona');
    const recs = nodes.filter(n => n.type === 'recommendation');
    const journeyStages = nodes.filter(n => n.type === 'journey_stage');
    const features = nodes.filter(n => n.type === 'feature');
    const roadmapItems = nodes.filter(n => n.type === 'roadmap_item');
    const gaps = nodes.filter(n => n.type === 'gap');
    const orphans = evidence.filter(n => n.isOrphan);
    const thin = themes.filter(n => n.isThinTheme);
    const orphanCount = orphans.length;
    const thinCount = thin.length;

    return {
        totalSources: sources.length,
        totalEvidence: evidence.length,
        totalThemes: themes.length,
        totalPersonas: personas.length,
        totalRecommendations: recs.length,
        totalJourneyStages: journeyStages.length,
        totalFeatures: features.length,
        totalRoadmapItems: roadmapItems.length,
        totalGaps: gaps.length,
        orphanEvidence: orphanCount,
        thinThemes: thinCount,
        avgEvidencePerTheme: themes.length > 0 ? Math.round(evidence.length / themes.length) : 0,
        evidenceUtilization: evidence.length > 0
            ? Math.round(((evidence.length - orphanCount) / evidence.length) * 100)
            : 0,
        sourceConcentrationCount: themes.filter(n => (n as any).sourceConcentration > 0.7).length,
        themeStrengthPct: themes.length > 0
            ? Math.round(((themes.length - thinCount) / themes.length) * 100)
            : 0,
    };
}

// ============================================================
// B7: ADDITIONAL DELIVERABLE BUILDERS
// Wire journey stages, PRD features, roadmap items, and gap analysis to the graph.
// ============================================================

/**
 * Add journey/blueprint stages to the graph. Links to personas (via actors) and themes (via keyword overlap).
 */
export function addJourneyStagesToGraph(graph: KnowledgeGraph, stages: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const stageOffset = nodes.filter(n => n.type === 'journey_stage').length;
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageId = `stage_${stageOffset + i}`;
        const emotionColor = stage.emotion === 'Frustrated' ? '#CC6644' : stage.emotion === 'Negative' ? '#CC6644' : stage.emotion === 'Neutral' ? '#888888' : '#00B7C3';

        nodes.push({
            id: stageId,
            type: 'journey_stage',
            label: stage.phase || `Stage ${i + 1}`,
            color: emotionColor,
            size: 16,
            metadata: { customerAction: stage.customerAction, painPoint: stage.painPoint, emotion: stage.emotion, touchpoint: stage.touchpoint },
        });

        // Link to personas mentioned in actors array
        if (stage.actors) {
            for (const actorName of stage.actors) {
                const personaNode = nodes.find(n => n.type === 'persona' && n.label.toLowerCase().includes(actorName.toLowerCase()));
                if (personaNode) {
                    edges.push({ source: stageId, target: personaNode.id, type: 'experiences', weight: 0.5 });
                }
            }
        }

        // Link to themes via pain point keyword overlap
        const stageText = `${stage.painPoint || ''} ${stage.customerAction || ''}`.toLowerCase();
        const themeNodes = nodes.filter(n => n.type === 'theme');
        for (const theme of themeNodes) {
            const themeWords = (theme.label || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const overlap = themeWords.filter((w: string) => stageText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({ source: stageId, target: theme.id, type: 'supported_by', weight: 0.4 });
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Add PRD features to the graph. Links to themes and personas via keyword overlap.
 */
export function addPRDFeaturesToGraph(graph: KnowledgeGraph, features: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const featureOffset = nodes.filter(n => n.type === 'feature').length;
    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const featureId = `feature_${featureOffset + i}`;
        const priorityColor = feature.priority === 'Must-have' ? '#CC6644' : feature.priority === 'Should-have' ? '#B8B800' : '#888888';

        nodes.push({
            id: featureId,
            type: 'feature',
            label: feature.name || `Feature ${i + 1}`,
            color: priorityColor,
            size: 14,
            metadata: { description: feature.description, priority: feature.priority, userStories: feature.userStories },
        });

        // Link to recommendations via keyword overlap
        const featureText = `${feature.name} ${feature.description || ''}`.toLowerCase();
        const recNodes = nodes.filter(n => n.type === 'recommendation');
        for (const rec of recNodes) {
            const recWords = (rec.label || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const overlap = recWords.filter((w: string) => featureText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({ source: featureId, target: rec.id, type: 'addresses', weight: 0.5 });
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Add roadmap items to the graph. Links to themes and recommendations.
 */
export function addRoadmapToGraph(graph: KnowledgeGraph, items: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const roadmapOffset = nodes.filter(n => n.type === 'roadmap_item').length;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `roadmap_${roadmapOffset + i}`;
        const horizonColor = item.horizon === 'Now' ? '#00B7C3' : item.horizon === 'Next' ? '#B8B800' : '#888888';

        nodes.push({
            id: itemId,
            type: 'roadmap_item',
            label: item.initiative || `Initiative ${i + 1}`,
            color: horizonColor,
            size: 14,
            metadata: { description: item.description, horizon: item.horizon, owner: item.owner, successMetric: item.successMetric },
        });

        // Link to recommendations
        const itemText = `${item.initiative} ${item.description || ''}`.toLowerCase();
        const recNodes = nodes.filter(n => n.type === 'recommendation');
        for (const rec of recNodes) {
            const recWords = (rec.label || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const overlap = recWords.filter((w: string) => itemText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({ source: itemId, target: rec.id, type: 'addresses', weight: 0.4 });
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Add gap analysis items to the graph. Links to themes.
 */
export function addGapAnalysisToGraph(graph: KnowledgeGraph, gaps: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Offset IDs so classic batch + chat-driven additive approvals never collide
    const gapOffset = nodes.filter(n => n.type === 'gap').length;
    for (let i = 0; i < gaps.length; i++) {
        const gap = gaps[i];
        const gapId = `gap_${gapOffset + i}`;
        const severityColor = gap.severity === 'critical' ? '#CC6644' : gap.severity === 'high' ? '#B8B800' : '#888888';

        nodes.push({
            id: gapId,
            type: 'gap',
            label: gap.capability || `Gap ${i + 1}`,
            color: severityColor,
            size: Math.max(12, 10 + gap.gap * 3),
            metadata: { currentMaturity: gap.currentMaturity, targetMaturity: gap.targetMaturity, gap: gap.gap, severity: gap.severity, impact: gap.impact },
        });

        // Link to themes via capability keyword overlap
        const gapText = `${gap.capability} ${gap.impact || ''}`.toLowerCase();
        const themeNodes = nodes.filter(n => n.type === 'theme');
        for (const theme of themeNodes) {
            const themeWords = (theme.label || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            const overlap = themeWords.filter((w: string) => gapText.includes(w)).length;
            if (overlap >= 2) {
                edges.push({ source: gapId, target: theme.id, type: 'supported_by', weight: 0.5 });
            }
        }
    }

    return { nodes, edges, stats: computeStats(nodes, edges) };
}

/**
 * Get the immediate neighborhood of a node (all directly connected nodes + edges).
 */
export function getNeighborhood(graph: KnowledgeGraph, nodeId: string): { nodeIds: Set<string>; edgeIndices: number[] } {
    const nodeIds = new Set<string>([nodeId]);
    const edgeIndices: number[] = [];

    graph.edges.forEach((edge, idx) => {
        const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
        if (srcId === nodeId || tgtId === nodeId) {
            nodeIds.add(srcId);
            nodeIds.add(tgtId);
            edgeIndices.push(idx);
        }
    });

    return { nodeIds, edgeIndices };
}
