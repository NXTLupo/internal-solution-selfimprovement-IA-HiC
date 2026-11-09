// services/mindMapArchitect.ts
// Builds a nested mind-map from BERTopic v2 output.
// See .claude/skills/mind-map-architect/SKILL.md for the full contract.
//
// 2026-05-24 - Phase 4 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

import { parseJSONWithRepair } from './aiOutputRepair';
import { stableHash, withResilience, isProviderUnavailableError } from './multiModelResilience';
import { CLAUDE_REASONING_MODEL } from './claudeModelPolicy';


export type BertTopicCluster = {
    id: number;
    name: string;
    summary: string;
    post_count: number;
    top_terms: Array<[string, number]>;
    post_ids: string[];
    centroid: [number, number];
    convergent_evidence?: boolean;
    source_types?: string[];
    distinct_source_count?: number;
    parent_topic?: number | null;
};

export type MindMapInput = {
    topics: BertTopicCluster[];
    research_goal: string;
    target_depth?: number;
    max_children_per_node?: number;
    proxy_base?: string;
};

export type MindMapNode = {
    id: string;
    label: string;
    summary: string;
    type: 'root' | 'theme_group' | 'theme' | 'sub_theme';
    convergent_evidence?: boolean;
    source_types?: string[];
    chunk_ids: string[];
    parent_path: string[];
    children: MindMapNode[];
    visual_treatment?: 'convergent' | 'thin_evidence' | 'standard';
};

export type MindMapOutput = {
    root: MindMapNode;
    node_count: number;
    max_depth_achieved: number;
    convergent_count: number;
    rendering_hint: {
        layout: 'radial_tree' | 'horizontal_tree';
        recommended_canvas: { width: number; height: number };
    };
};


const GROUPING_PROMPT = `You are grouping topic clusters into a mind-map hierarchy.

RESEARCH GOAL: {{GOAL}}

Here are {{N}} topic clusters from BERTopic analysis of the corpus. Group them into 3-7 top-level categories that tell a coherent story about the research goal.

CLUSTERS:
{{CLUSTERS}}

For each group:
- label: 3-6 word category name (proper nouns capitalized; no "the"/"and")
- summary: ONE declarative sentence stating what the group is about
- theme_ids: array of cluster ids belonging to this group

Each cluster belongs to EXACTLY ONE group. Output ONLY this JSON:
{
  "groups": [
    {"label": "...", "summary": "...", "theme_ids": [...]},
    ...
  ]
}`;


function clipText(s: string, n: number): string {
    s = (s || '').trim();
    return s.length > n ? s.slice(0, n - 1) + '...' : s;
}


function visualTreatmentFor(topic: BertTopicCluster): 'convergent' | 'thin_evidence' | 'standard' {
    if (topic.convergent_evidence) return 'convergent';
    if ((topic.distinct_source_count ?? 0) < 2) return 'thin_evidence';
    return 'standard';
}


async function callSonnetForGrouping(
    topics: BertTopicCluster[],
    researchGoal: string,
    proxyBase: string,
): Promise<{ groups: Array<{ label: string; summary: string; theme_ids: number[] }> }> {
    const clustersBlock = topics.map(t =>
        `[${t.id}] ${t.name}\n` +
        `  summary: ${clipText(t.summary, 200)}\n` +
        `  top_terms: ${(t.top_terms || []).slice(0, 5).map(([term]) => term).join(', ')}\n` +
        `  size: ${t.post_count} docs across ${(t.source_types || []).join('+')}`
    ).join('\n\n');

    const prompt = GROUPING_PROMPT
        .replace('{{GOAL}}', researchGoal)
        .replace('{{N}}', String(topics.length))
        .replace('{{CLUSTERS}}', clustersBlock);

    const seed = stableHash(researchGoal, topics.map(t => t.id).sort((a, b) => a - b).join(','));

    const { result } = await withResilience<{ groups: Array<{ label: string; summary: string; theme_ids: number[] }> }>({
        primary: 'anthropic',
        fallbacks: ['gemini'],
        stage: 'mind_map:grouping',
        is429: isProviderUnavailableError,   // outages fall back too, not only 429s
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: CLAUDE_REASONING_MODEL,   // 2026-10-05: reasoning deliverable -> Opus 5.5
                    max_tokens: 16000,
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                }
                : {
                    model: 'gemini-3.1-pro-preview',   // reasoning fallback (flash is for speed)
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { temperature: 0, responseMimeType: 'application/json' },
                };
            const resp = await fetch(`${proxyBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(`${provider} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
            }
            const data = await resp.json();
            const text = provider === 'anthropic'
                ? ((data.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text || '').join(''))   // 2026-10-05: content[0] is the thinking block under adaptive thinking
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair(text, { calling_context: 'mind_map:grouping' });
        },
    });
    return result;
}


export async function buildMindMap(input: MindMapInput): Promise<MindMapOutput> {
    const proxyBase = input.proxy_base ?? 'http://localhost:5012';
    const maxChildren = input.max_children_per_node ?? 7;
    const targetDepth = input.target_depth ?? 4;

    if (!input.topics || input.topics.length < 5) {
        // Degenerate: single-level mind-map directly under root
        const children: MindMapNode[] = (input.topics || []).map(t => ({
            id: `node_${t.id}`,
            label: t.name,
            summary: t.summary,
            type: 'theme',
            convergent_evidence: t.convergent_evidence,
            source_types: t.source_types,
            chunk_ids: t.post_ids || [],
            parent_path: [clipText(input.research_goal, 60)],
            children: [],
            visual_treatment: visualTreatmentFor(t),
        }));
        return {
            root: {
                id: 'root',
                label: clipText(input.research_goal, 60),
                summary: '',
                type: 'root',
                chunk_ids: children.flatMap(c => c.chunk_ids),
                parent_path: [],
                children,
            },
            node_count: 1 + children.length,
            max_depth_achieved: 2,
            convergent_count: children.filter(c => c.convergent_evidence).length,
            rendering_hint: {
                layout: 'radial_tree',
                recommended_canvas: { width: 1920, height: 1080 },
            },
        };
    }

    // Step 1 - grouping pass via Sonnet 4.6
    const grouping = await callSonnetForGrouping(input.topics, input.research_goal, proxyBase);

    // Index topics by id
    const topicById = new Map<number, BertTopicCluster>();
    for (const t of input.topics) topicById.set(t.id, t);

    // Track which topics were assigned (some grouping outputs may miss topics)
    const assigned = new Set<number>();

    // Step 2 - build groups
    const rootLabel = clipText(input.research_goal, 60);
    const groupNodes: MindMapNode[] = [];
    for (const g of (grouping.groups || []).slice(0, maxChildren)) {
        const themeNodes: MindMapNode[] = [];
        for (const tid of (g.theme_ids || []).slice(0, maxChildren)) {
            const t = topicById.get(tid);
            if (!t) continue;
            assigned.add(tid);
            themeNodes.push({
                id: `node_${tid}`,
                label: t.name,
                summary: clipText(t.summary, 200),
                type: 'theme',
                convergent_evidence: t.convergent_evidence,
                source_types: t.source_types,
                chunk_ids: t.post_ids || [],
                parent_path: [rootLabel, g.label],
                children: [],
                visual_treatment: visualTreatmentFor(t),
            });
        }
        if (themeNodes.length === 0) continue;
        const groupChunkIds = themeNodes.flatMap(c => c.chunk_ids);
        const anyConvergent = themeNodes.some(c => c.convergent_evidence);
        const groupSourceTypes = Array.from(new Set(themeNodes.flatMap(c => c.source_types ?? [])));
        groupNodes.push({
            id: `group_${stableHash(g.label).slice(0, 8)}`,
            label: g.label,
            summary: g.summary,
            type: 'theme_group',
            convergent_evidence: anyConvergent,
            source_types: groupSourceTypes,
            chunk_ids: groupChunkIds,
            parent_path: [rootLabel],
            children: themeNodes,
            visual_treatment: anyConvergent ? 'convergent' : 'standard',
        });
    }

    // Step 2b - orphan topics (model dropped them) get attached to a fallback group
    const orphans = input.topics.filter(t => !assigned.has(t.id));
    if (orphans.length > 0) {
        groupNodes.push({
            id: 'group_other',
            label: 'Other Themes',
            summary: 'Themes not grouped into a major category',
            type: 'theme_group',
            chunk_ids: orphans.flatMap(t => t.post_ids || []),
            parent_path: [rootLabel],
            children: orphans.slice(0, maxChildren).map(t => ({
                id: `node_${t.id}`,
                label: t.name,
                summary: clipText(t.summary, 200),
                type: 'theme',
                convergent_evidence: t.convergent_evidence,
                source_types: t.source_types,
                chunk_ids: t.post_ids || [],
                parent_path: [rootLabel, 'Other Themes'],
                children: [],
                visual_treatment: visualTreatmentFor(t),
            })),
            visual_treatment: 'standard',
        });
    }

    // Step 4 - visual treatment is set per node above
    const root: MindMapNode = {
        id: 'root',
        label: rootLabel,
        summary: '',
        type: 'root',
        chunk_ids: groupNodes.flatMap(g => g.chunk_ids),
        parent_path: [],
        children: groupNodes,
    };

    // Count nodes
    let nodeCount = 0;
    let maxDepth = 0;
    function walk(n: MindMapNode, depth: number) {
        nodeCount += 1;
        if (depth > maxDepth) maxDepth = depth;
        for (const c of n.children) walk(c, depth + 1);
    }
    walk(root, 1);

    const convergentCount = groupNodes.flatMap(g => g.children).filter(c => c.convergent_evidence).length;

    return {
        root,
        node_count: nodeCount,
        max_depth_achieved: maxDepth,
        convergent_count: convergentCount,
        rendering_hint: {
            layout: maxDepth <= 3 ? 'radial_tree' : 'horizontal_tree',
            recommended_canvas: { width: 1920, height: 1080 },
        },
    };
}
