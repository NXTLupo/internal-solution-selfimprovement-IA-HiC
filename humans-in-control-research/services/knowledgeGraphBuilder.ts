/**
 * Knowledge Graph Builder
 * Constructs an interactive knowledge graph from research pipeline data.
 * The graph grows as each analysis stage completes.
 *
 * Node types: source, evidence, theme, persona, recommendation
 * Edge types: supported_by, experiences, addresses, from, quoted_in
 */

// --- TYPES ---

export interface KGNode {
    id: string;
    type: 'source' | 'evidence' | 'theme' | 'persona' | 'recommendation';
    label: string;
    tier?: number;
    freshnessScore?: number;
    relevanceScore?: number;
    url?: string;
    imageUrl?: string;
    color?: string;
    size?: number;
    metadata?: Record<string, any>;
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
}

// --- COLOR SCHEME ---
const NODE_COLORS: Record<string, string> = {
    source: '#115054',      // teal
    evidence: '#fd8e2e',    // orange
    theme: '#caca20',       // lime
    persona: '#00b1eb',     // blue
    recommendation: '#0CCE6B', // green
};

const TIER_COLORS: Record<number, string> = {
    1: '#115054',
    2: '#fd8e2e',
    3: '#acacac',
};

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
        nodes.push({
            id: sourceId,
            type: 'source',
            label: src.source?.replace(/ \(.*\)/, '') || 'Unknown',
            tier: src.credibilityTier || 3,
            color: TIER_COLORS[src.credibilityTier || 3],
            size: 20 + Math.min(src.items.length * 2, 30),
            metadata: { itemCount: src.items.length, query: src.query },
        });

        for (let i = 0; i < Math.min(src.items.length, 8); i++) {
            const item = src.items[i];
            const evidenceId = `ev_${sourceId}_${i}`;
            nodes.push({
                id: evidenceId,
                type: 'evidence',
                label: (item.title || '').substring(0, 50),
                tier: src.credibilityTier || 3,
                url: item.url,
                freshnessScore: item.freshnessScore,
                relevanceScore: item.relevanceScore,
                color: TIER_COLORS[src.credibilityTier || 3],
                size: 8,
                metadata: { content: item.content?.substring(0, 200), date: item.date },
            });
            edges.push({
                source: sourceId,
                target: evidenceId,
                type: 'from',
                weight: 0.3,
            });
        }
    }

    return { nodes, edges };
}

/**
 * Expand the graph with theme nodes after theme extraction.
 */
export function addThemesToGraph(graph: KnowledgeGraph, themes: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        const themeId = `theme_${i}`;

        nodes.push({
            id: themeId,
            type: 'theme',
            label: theme.name,
            color: theme.status === 'priority' ? '#caca20' : theme.status === 'skipped' ? '#e5e5e5' : '#caca20',
            size: 25 + (theme.citations?.length || 0) * 3,
            metadata: { description: theme.description, quote: theme.quote, status: theme.status },
        });

        // Link themes to evidence via citations
        if (theme.citations) {
            for (const cit of theme.citations) {
                const chunkId = cit.sourceFile || '';
                // Try to find matching evidence node
                const matchingEvidence = nodes.find(n =>
                    n.type === 'evidence' && (
                        n.label.includes(cit.sourceName || '___') ||
                        n.metadata?.content?.includes(cit.text?.substring(0, 30) || '___')
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
                } else if (cit.url) {
                    // Create a new evidence node for this citation
                    const citId = `cit_${themeId}_${edges.length}`;
                    nodes.push({
                        id: citId,
                        type: 'evidence',
                        label: cit.sourceName || chunkId || 'Citation',
                        url: cit.url,
                        color: '#fd8e2e',
                        size: 6,
                        metadata: { text: cit.text, author: cit.author, date: cit.publicationDate },
                    });
                    edges.push({
                        source: themeId,
                        target: citId,
                        type: 'supported_by',
                        weight: 0.5,
                        label: chunkId,
                    });
                }
            }
        }
    }

    return { nodes, edges };
}

/**
 * Expand the graph with persona nodes.
 */
export function addPersonasToGraph(graph: KnowledgeGraph, personas: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    for (let i = 0; i < personas.length; i++) {
        const persona = personas[i];
        const personaId = `persona_${i}`;

        nodes.push({
            id: personaId,
            type: 'persona',
            label: persona.name,
            imageUrl: persona.imageUrl,
            color: '#00b1eb',
            size: 22,
            metadata: { role: persona.role, quote: persona.quote, bio: persona.bio },
        });

        // Link personas to themes they relate to (via pain points/motivations that cite chunks)
        const themeNodes = nodes.filter(n => n.type === 'theme');
        for (const themeNode of themeNodes) {
            // Check if persona bio or pain points reference this theme's concepts
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
    }

    return { nodes, edges };
}

/**
 * Expand the graph with recommendation nodes.
 */
export function addRecommendationsToGraph(graph: KnowledgeGraph, recommendations: any[]): KnowledgeGraph {
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        const recId = `rec_${i}`;

        nodes.push({
            id: recId,
            type: 'recommendation',
            label: rec.title,
            color: '#0CCE6B',
            size: 18,
            metadata: { description: rec.description, impact: rec.impactLevel, actionItems: rec.actionItems },
        });

        // Link recommendations to themes they address
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

    return { nodes, edges };
}
