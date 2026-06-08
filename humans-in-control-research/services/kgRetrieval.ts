// kgRetrieval.ts - 2026-05-11 (HiC-Active-Loop #4)
//
// Use the knowledge graph as a RETRIEVAL source, not just a chart. Today the
// KG is a beautiful post-hoc visualization. This module lets the chat model
// walk it as a graph-RAG layer: seed at a node (theme, source, evidence),
// expand N hops, return the connected evidence nodes with their full bodies.
//
// Cheaper than full-corpus semantic search when the question has an obvious
// entrypoint in the graph (e.g., "what does the corpus say about ghosting?"
// seeds at the "Ghosting Epidemic" theme node and walks to linked evidence).
// More accurate than embedding-only retrieval because the relationships are
// explicit - the LLM doesn't have to infer them from vector neighborhoods.
//
// Exposed to the chat function-caller as `query_knowledge_graph(seed, hops)`.

import type { KnowledgeGraph, KGNode, KGEdge } from './knowledgeGraphBuilder';

export interface KGRetrievalResult {
    seed: { id: string; type: string; label: string } | null;
    matchedSeeds: number;
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        hopsFromSeed: number;
        relevanceScore?: number;
        url?: string;
        wikiPath?: string;
        bodyExcerpt?: string;
        evidenceCount?: number;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: string;
        weight: number;
    }>;
}

/**
 * Walk the knowledge graph from a seed term. Resolves the seed to one or
 * more best-matching nodes (case-insensitive substring match on labels),
 * then expands BFS up to `hops` levels. Returns the connected subgraph
 * with optional body excerpts for evidence nodes.
 *
 * Hops default = 2 (theme → evidence → source). Cap hops at 3 to keep
 * the result subgraph bounded.
 */
export function queryKnowledgeGraph(
    graph: KnowledgeGraph,
    seed: string,
    opts?: {
        hops?: number;
        maxNodes?: number;
        seedType?: KGNode['type'];
        includeBodies?: boolean;
    },
): KGRetrievalResult {
    const hops = Math.max(1, Math.min(3, opts?.hops ?? 2));
    const maxNodes = Math.max(5, Math.min(60, opts?.maxNodes ?? 25));
    const includeBodies = opts?.includeBodies ?? true;
    const seedLower = seed.trim().toLowerCase();

    if (!seedLower || !graph?.nodes?.length) {
        return { seed: null, matchedSeeds: 0, nodes: [], edges: [] };
    }

    // Resolve the seed: case-insensitive substring match on node labels.
    // Prefer themes/sources/personas over raw evidence so the model lands
    // on a meaningful "hub" instead of a single deep leaf.
    const HUB_TYPES = new Set(['theme', 'source', 'persona', 'recommendation', 'gap', 'journey_stage']);
    const candidates = graph.nodes.filter(n => {
        if (opts?.seedType && n.type !== opts.seedType) return false;
        return (n.label || '').toLowerCase().includes(seedLower);
    });
    if (candidates.length === 0) {
        return { seed: null, matchedSeeds: 0, nodes: [], edges: [] };
    }
    candidates.sort((a, b) => {
        const aHub = HUB_TYPES.has(a.type) ? 0 : 1;
        const bHub = HUB_TYPES.has(b.type) ? 0 : 1;
        if (aHub !== bHub) return aHub - bHub;
        // Prefer themes with more evidence (more central)
        const aWeight = (a.evidenceCount || 0) + (a.relevanceScore || 0) / 100;
        const bWeight = (b.evidenceCount || 0) + (b.relevanceScore || 0) / 100;
        return bWeight - aWeight;
    });
    const seedNode = candidates[0];

    // BFS walk
    const visited = new Map<string, number>(); // nodeId → hops from seed
    visited.set(seedNode.id, 0);
    const adj = buildAdjacency(graph.edges);
    const queue: string[] = [seedNode.id];
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const curHops = visited.get(cur)!;
        if (curHops >= hops) continue;
        const neighbors = adj.get(cur) || [];
        for (const n of neighbors) {
            if (!visited.has(n)) {
                visited.set(n, curHops + 1);
                queue.push(n);
            }
        }
        if (visited.size >= maxNodes) break;
    }

    // Materialize result nodes + edges within the subgraph
    const nodeById = new Map(graph.nodes.map(n => [n.id, n] as const));
    const resultNodes = Array.from(visited.entries()).map(([id, h]) => {
        const n = nodeById.get(id);
        if (!n) return null;
        return {
            id: n.id,
            type: n.type,
            label: n.label,
            hopsFromSeed: h,
            relevanceScore: n.relevanceScore,
            url: n.url,
            wikiPath: (n as any).wikiPath,
            bodyExcerpt: includeBodies && n.type === 'evidence'
                ? ((n.metadata?.body || n.metadata?.content || '') as string).slice(0, 600)
                : undefined,
            evidenceCount: n.evidenceCount,
        };
    }).filter((n): n is NonNullable<typeof n> => n !== null);

    const visitedSet = new Set(visited.keys());
    const resultEdges = (graph.edges || []).filter(e => {
        const s = typeof e.source === 'string' ? e.source : (e.source as any)?.id;
        const t = typeof e.target === 'string' ? e.target : (e.target as any)?.id;
        return visitedSet.has(s) && visitedSet.has(t);
    }).map(e => ({
        source: typeof e.source === 'string' ? e.source : (e.source as any).id,
        target: typeof e.target === 'string' ? e.target : (e.target as any).id,
        type: e.type,
        weight: e.weight,
    }));

    return {
        seed: { id: seedNode.id, type: seedNode.type, label: seedNode.label },
        matchedSeeds: candidates.length,
        nodes: resultNodes,
        edges: resultEdges,
    };
}

function buildAdjacency(edges: KGEdge[] | undefined): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    if (!edges) return adj;
    for (const e of edges) {
        const s = typeof e.source === 'string' ? e.source : (e.source as any)?.id;
        const t = typeof e.target === 'string' ? e.target : (e.target as any)?.id;
        if (!s || !t) continue;
        if (!adj.has(s)) adj.set(s, []);
        if (!adj.has(t)) adj.set(t, []);
        adj.get(s)!.push(t);
        adj.get(t)!.push(s); // treat as undirected - the KG models semantic adjacency
    }
    return adj;
}

/**
 * Format a KGRetrievalResult as a compact text block for tool_result content.
 * The model reads this back as the tool's response.
 */
export function renderKGResult(result: KGRetrievalResult): string {
    if (!result.seed) {
        return 'No matching node found in the knowledge graph for that seed term. Try a different term, or use fetch_wiki_articles for free-text semantic search across the article archive.';
    }
    const lines: string[] = [];
    lines.push(`Seed: "${result.seed.label}" (${result.seed.type})`);
    if (result.matchedSeeds > 1) {
        lines.push(`(${result.matchedSeeds} candidate seeds matched; picked the most central hub.)`);
    }
    lines.push(`Subgraph: ${result.nodes.length} node(s), ${result.edges.length} edge(s)\n`);

    // Group nodes by hop distance
    const byHop = new Map<number, typeof result.nodes>();
    for (const n of result.nodes) {
        if (!byHop.has(n.hopsFromSeed)) byHop.set(n.hopsFromSeed, []);
        byHop.get(n.hopsFromSeed)!.push(n);
    }
    const hops = Array.from(byHop.keys()).sort((a, b) => a - b);
    for (const h of hops) {
        lines.push(`--- Hop ${h} (${byHop.get(h)!.length}) ---`);
        for (const n of byHop.get(h)!) {
            const meta: string[] = [n.type];
            if (typeof n.relevanceScore === 'number') meta.push(`rel=${n.relevanceScore}`);
            if (typeof n.evidenceCount === 'number') meta.push(`evidence=${n.evidenceCount}`);
            if (n.wikiPath) meta.push(`wiki=${n.wikiPath}`);
            if (n.url) meta.push(`url=${n.url}`);
            lines.push(`  • [${n.id}] ${n.label}  (${meta.join(', ')})`);
            if (n.bodyExcerpt) {
                lines.push(`    "${n.bodyExcerpt.replace(/\s+/g, ' ').slice(0, 300)}${n.bodyExcerpt.length > 300 ? '...' : ''}"`);
            }
        }
    }
    return lines.join('\n');
}
