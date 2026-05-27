/**
 * Chat Workbench — The primary interface after data collection.
 *
 * Replaces the 17-stage pipeline with a conversational research workbench.
 * Users explore their data via multi-model AI chat and request specific
 * NXT-styled visual outputs.
 *
 * Layout: [48px sidebar] [~70% chat] [~30% right panel (KG + pins)]
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    sendChatMessage, AVAILABLE_MODELS, loadSkillManifest, loadSkillContext, matchSkills,
    buildSourceReferences, parseChatCitations,
    type ChatMessage, type ChatModel, type ChatContext, type SourceReference, type SkillManifestEntry,
} from '../services/corpusChatService';
import ResearchKnowledgeGraph from './ResearchKnowledgeGraph';
import { NxtBlockRenderer, parseNxtBlocks, type NxtBlock } from './NxtOutputRenderer';
import OutputBoard, { type PinnedOutput } from './OutputBoard';
import { DeliverableBatch, type DeliverableItem, type DeliverableType } from './DeliverableCard';
import SlideCanvas, { type SlideData } from './SlideCanvas';
import {
    addThemesToGraph, addPersonasToGraph, addRecommendationsToGraph,
    addJourneyStagesToGraph, addPRDFeaturesToGraph, addRoadmapToGraph,
    addGapAnalysisToGraph, type KnowledgeGraph as KGType,
} from '../services/knowledgeGraphBuilder';

// --- Wiki Loading (Tier 1 + Tier 2) ---

async function fetchWikiPage(path: string): Promise<string> {
    try {
        const resp = await fetch(`/hic-workspace/wiki/${path}`);
        if (resp.ok) return await resp.text();
        const proxyResp = await fetch(`http://127.0.0.1:5012/api/wiki/read/${path}`);
        if (proxyResp.ok) {
            const data = await proxyResp.json();
            return data.content || '';
        }
    } catch { /* wiki may not be available */ }
    return '';
}

async function loadTier1Knowledge(): Promise<{
    brand: string;
    constraints: string;
}> {
    const [identity, layoutPatterns, antiSlop, chartStandards, illustrationStyle, constraints] = await Promise.all([
        fetchWikiPage('brand/identity.md'),
        fetchWikiPage('brand/layout-patterns.md'),
        fetchWikiPage('brand/anti-slop.md'),
        fetchWikiPage('brand/chart-standards.md'),
        fetchWikiPage('brand/illustration-style.md'),
        fetchWikiPage('synthesis/learned-constraints.md'),
    ]);
    const brand = [identity, layoutPatterns, antiSlop, chartStandards, illustrationStyle].filter(Boolean).join('\n\n---\n\n');
    return { brand, constraints };
}

async function loadTier2Knowledge(): Promise<{
    benchmarks: string;
    evidence: string;
    methodologies: string;
}> {
    const [cxMetrics, financialImpact, maturityModels, techAdoption, competitiveIntel,
           cxMaturity, digitalTransformation, researchFindings,
           researchFabric, analyticalLenses] = await Promise.all([
        fetchWikiPage('benchmarks/cx-metrics.md'),
        fetchWikiPage('benchmarks/financial-impact.md'),
        fetchWikiPage('benchmarks/maturity-models.md'),
        fetchWikiPage('benchmarks/technology-adoption.md'),
        fetchWikiPage('benchmarks/competitive-intel.md'),
        fetchWikiPage('evidence/cx-maturity.md'),
        fetchWikiPage('evidence/digital-transformation.md'),
        fetchWikiPage('evidence/research-findings.md'),
        fetchWikiPage('methodologies/research-fabric.md'),
        fetchWikiPage('methodologies/analytical-lenses.md'),
    ]);
    return {
        benchmarks: [cxMetrics, financialImpact, maturityModels, techAdoption, competitiveIntel].filter(Boolean).join('\n\n---\n\n'),
        evidence: [cxMaturity, digitalTransformation, researchFindings].filter(Boolean).join('\n\n---\n\n'),
        methodologies: [researchFabric, analyticalLenses].filter(Boolean).join('\n\n---\n\n'),
    };
}

// --- NXT Design System Rules (condensed for system prompt) ---

const NXT_OUTPUT_RULES = `
NXT VISUAL OUTPUT PROTOCOL:
When the user requests a visual output, respond with structured blocks delimited by :::nxt:TYPE markers.

Available block types:
- :::nxt:stat-row — JSON array of {value, label, source} objects (2-4 items)
- :::nxt:evidence-block — JSON {text, source} cited finding
- :::nxt:recommendation — JSON {title, body} chartreuse callout
- :::nxt:split-panel — JSON {analysisTitle, analysisContent, evidenceTitle, evidenceContent}
- :::nxt:section-divider — JSON {number, title, overflowText}
- :::nxt:grid-matrix — JSON {headers: string[], rows: string[][]}
- :::nxt:color-block-grid — JSON array of {title, body, bg} where bg is "black"|"chartreuse"|"teal"|"panel"
- :::nxt:quote-block — JSON {quote, attribution}
- :::nxt:comparison-table — JSON {headers: string[], rows: string[][], highlightCol?: number}
- :::nxt:warning-block — JSON {label, text}
- :::nxt:full-html — Raw NXT-compliant HTML string

Example:
:::nxt:stat-row
[{"value":"41%","label":"at CX Maturity Level 1","source":"Gartner, 2025"},{"value":"$3.7T","label":"annual cost of bad CX","source":"Qualtrics XM, 2024"}]
:::

NXT DESIGN RULES:
- Chartreuse (#B8B800) accent <= 15% of surface. Scarcity creates impact.
- One accent color per block (chartreuse OR cyan, never both).
- Every heading is an ACTION TITLE: complete sentence with data, not a topic label.
- Source attribution REQUIRED on every data point.
- No gradients, shadows, rounded corners > 4px, or decorative elements.
- Pie charts are BANNED. Use horizontal bars for part-to-whole.
- Banned fonts: Inter, Roboto, Arial, Poppins, Space Grotesk.
`;

// --- Suggested Queries ---

const SUGGESTED_QUERIES = [
    "What are the top 15 themes across all data sources? Quote the evidence.",
    "Build personas based on the research data using the JTBD framework.",
    "Create a stat row showing the 3 most impactful findings with sources.",
    "What do community members (Reddit, forums) say about this topic? Quote them directly.",
    "Write a strategic recommendation callout for the highest-priority action.",
    "Build a competitive analysis grid-matrix comparing the top 5 peers.",
    "Create a split panel: gap analysis on the left, recommended actions on the right.",
    "What case studies or real-world examples appear in the data?",
    "Generate a service blueprint based on the journey stages in the data.",
    "Summarize the technology landscape and create an architecture evidence block.",
];

// --- Props ---

interface Props {
    corpusText: string;
    liveSourceResults: any[];
    excludedSources: Set<string>;
    prioritySources: Set<string>;
    files: any[];
    researchGoal: string;
    knowledgeGraphData?: KGType;
    onKnowledgeGraphUpdate?: (kg: KGType) => void;
    onExcludeSource?: (key: string) => void;
    onPrioritySource?: (key: string) => void;
    artifactNotifications?: Array<{id: string; type: string; label: string; timestamp: number}>;
    onDismissNotification?: (id: string) => void;
    onOpenDesignDesk?: () => void;
}

export const ChatWorkbench: React.FC<Props> = ({
    corpusText, liveSourceResults, excludedSources, prioritySources,
    files, researchGoal, knowledgeGraphData, onKnowledgeGraphUpdate,
    onExcludeSource, onPrioritySource,
    artifactNotifications, onDismissNotification, onOpenDesignDesk,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    // 2026-05-07 — Default chat model is Gemini 3.1 Pro (promoted from DeepSeek
    // V4 Flash; DeepSeek narratives were jargon-heavy AI-slop).
    const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.1-pro-preview');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [rightPanel, setRightPanel] = useState<'graph' | 'pins'>('graph');
    const [pinnedOutputs, setPinnedOutputs] = useState<PinnedOutput[]>([]);
    const [imageLoading, setImageLoading] = useState(false);
    const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
    const [slides, setSlides] = useState<SlideData[]>([]);
    const [generatingVisualForSlide, setGeneratingVisualForSlide] = useState<string | null>(null);

    // Wiki knowledge (loaded once)
    const [wikiBrand, setWikiBrand] = useState('');
    const [wikiConstraints, setWikiConstraints] = useState('');
    const [wikiBenchmarks, setWikiBenchmarks] = useState('');
    const [wikiEvidence, setWikiEvidence] = useState('');
    const [wikiMethodologies, setWikiMethodologies] = useState('');
    const [skillManifest, setSkillManifest] = useState<SkillManifestEntry[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sourceRefsRef = useRef<SourceReference[]>([]);

    // Build source references once
    useEffect(() => {
        sourceRefsRef.current = buildSourceReferences(liveSourceResults);
    }, [liveSourceResults]);

    // Load wiki knowledge on mount (Tier 1 + Tier 2 + manifest)
    useEffect(() => {
        (async () => {
            const [tier1, tier2, manifest] = await Promise.all([
                loadTier1Knowledge(),
                loadTier2Knowledge(),
                loadSkillManifest(),
            ]);
            setWikiBrand(tier1.brand);
            setWikiConstraints(tier1.constraints);
            setWikiBenchmarks(tier2.benchmarks);
            setWikiEvidence(tier2.evidence);
            setWikiMethodologies(tier2.methodologies);
            setSkillManifest(manifest);
        })();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const buildContext = useCallback((): ChatContext => {
        // Provider-agnostic file content — reads proxy-parsed body text when
        // the FileUpload background parser has populated parsedText (PDFs
        // via PyPDF2, DOCX via office-regex). Falls back to text-file base64
        // decode for .txt/.json/.csv etc. OpenAI/Gemini chat all see
        // the same extracted text — no multimodal dependency.
        const uploadedFileContents = (() => {
            try {
                return files.map((f: any) => {
                    if (f.parsedText && typeof f.parsedText === 'string' && f.parsedText.length > 40) {
                        const meta = [f.parseMethod && `method=${f.parseMethod}`, f.parsedPages && `pages=${f.parsedPages}`, `chars=${f.parsedText.length}`].filter(Boolean).join(', ');
                        return `=== FILE: ${f.name} (${meta}) ===\n${f.parsedText}\n`;
                    }
                    const isText = f.type === 'text/plain' || f.name.endsWith('.txt') ||
                        f.name.endsWith('.json') || f.name.endsWith('.csv') || f.name.endsWith('.md');
                    if (isText) {
                        try { return `=== FILE: ${f.name} ===\n${decodeURIComponent(escape(atob(f.data)))}\n`; }
                        catch { return `=== FILE: ${f.name} === [decode error]\n`; }
                    }
                    return `=== FILE: ${f.name} === [parsing in progress]\n`;
                }).join('\n');
            } catch { return ''; }
        })();

        return {
            corpusText,
            uploadedFileContents,
            researchGoal,
            sourceCount: liveSourceResults.length,
            articleCount: liveSourceResults.reduce((sum, s) => sum + (s.items?.length || 0), 0),
            sourceReferences: sourceRefsRef.current,
            // Knowledge Graph — full structural context
            knowledgeGraph: knowledgeGraphData || undefined,
            // Tiered knowledge
            wikiBrand,
            wikiLearnedConstraints: wikiConstraints,
            wikiBenchmarks,
            wikiEvidence,
            wikiMethodologies,
            skillManifest,
            nxtDesignSystemRules: NXT_OUTPUT_RULES,
        };
    }, [corpusText, files, researchGoal, liveSourceResults, knowledgeGraphData, wikiBrand, wikiConstraints, wikiBenchmarks, wikiEvidence, wikiMethodologies, skillManifest]);

    const handlePin = useCallback((block: NxtBlock, model?: string) => {
        const id = `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setPinnedOutputs(prev => [...prev, {
            id,
            block,
            timestamp: Date.now(),
            model,
            order: prev.length,
        }]);
        setRightPanel('pins'); // auto-switch to pins panel
    }, []);

    const handleUnpin = useCallback((id: string) => {
        setPinnedOutputs(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i })));
    }, []);

    const handleAddDivider = useCallback(() => {
        const id = `pin_div_${Date.now()}`;
        const dividerBlock: NxtBlock = {
            type: 'section-divider',
            raw: JSON.stringify({ number: String(pinnedOutputs.length + 1), title: 'SECTION DIVIDER' }),
            data: { number: String(pinnedOutputs.length + 1), title: 'SECTION DIVIDER' },
        };
        setPinnedOutputs(prev => [...prev, { id, block: dividerBlock, timestamp: Date.now(), order: prev.length }]);
    }, [pinnedOutputs.length]);

    // --- Deliverable Approval → Knowledge Graph ---

    const handleApproveDeliverable = useCallback((item: DeliverableItem) => {
        setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, status: 'approved' as const } : d));

        // Commit to knowledge graph
        if (knowledgeGraphData && onKnowledgeGraphUpdate) {
            let updatedKG = { ...knowledgeGraphData, nodes: [...knowledgeGraphData.nodes], edges: [...knowledgeGraphData.edges] };
            const typeMap: Record<string, (kg: KGType, data: any[]) => KGType> = {
                theme: addThemesToGraph,
                persona: addPersonasToGraph,
                recommendation: addRecommendationsToGraph,
                journey_stage: addJourneyStagesToGraph,
                prd_feature: addPRDFeaturesToGraph,
                roadmap_item: addRoadmapToGraph,
                gap: addGapAnalysisToGraph,
            };
            const adder = typeMap[item.type];
            if (adder) {
                updatedKG = adder(updatedKG, [item.data]);
                onKnowledgeGraphUpdate(updatedKG);
            }
        }
    }, [knowledgeGraphData, onKnowledgeGraphUpdate]);

    const handleRejectDeliverable = useCallback((item: DeliverableItem) => {
        setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, status: 'rejected' as const } : d));
    }, []);

    const handleApproveAllDeliverables = useCallback((items: DeliverableItem[]) => {
        items.forEach(item => handleApproveDeliverable(item));
    }, [handleApproveDeliverable]);

    // --- Slide Approval ---

    const handleApproveSlide = useCallback((slide: SlideData) => {
        setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, status: 'approved' as const } : s));
        // Add approved slide blocks to Output Board (legacy support)
        for (const block of (slide.blocks || [])) {
            handlePin(block, slide.model);
        }
    }, [handlePin]);

    const handleRejectSlide = useCallback((slide: SlideData) => {
        setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, status: 'rejected' as const } : s));
    }, []);

    const handleSlideGenerateVisual = useCallback(async (slide: SlideData) => {
        setGeneratingVisualForSlide(slide.id);
        try {
            const { generateImage } = await import('../services/geminiService');
            const visualPrompt = `Professional flat geometric diagram for a presentation slide titled: "${slide.title}". Stark white background, black and chartreuse accent only. No text, no labels.`;
            const imageData = await generateImage(visualPrompt, '16:9');
            if (imageData) {
                setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, imageUrl: imageData } : s));
            }
        } catch (e) {
            console.error('Slide visual generation failed:', e);
        }
        setGeneratingVisualForSlide(null);
    }, []);

    const handleSlideEditTitle = useCallback((slide: SlideData, newTitle: string) => {
        setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, title: newTitle } : s));
    }, []);

    // --- Parse deliverable and slide blocks from AI response ---

    const parseDeliverableBlocks = useCallback((text: string, model?: string): DeliverableItem[] => {
        const items: DeliverableItem[] = [];

        // Strategy 1: Explicit :::deliverable:TYPE delimiters
        const delimPattern = /:::deliverable:(\S+)\n([\s\S]*?):::/g;
        let match;
        while ((match = delimPattern.exec(text)) !== null) {
            try {
                const data = JSON.parse(match[2].trim());
                items.push({
                    id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    type: match[1] as DeliverableType,
                    data,
                    status: 'pending',
                    model,
                    timestamp: Date.now(),
                });
            } catch { /* malformed JSON — skip */ }
        }

        // Strategy 2: Fallback — detect JSON objects that look like deliverables
        // Gemini often outputs raw JSON without delimiters
        if (items.length === 0) {
            // Find JSON objects or arrays in the text
            const jsonPattern = /```(?:json)?\s*([\s\S]*?)```|\{[\s\S]*?"name"\s*:\s*"[^"]+[\s\S]*?"description"\s*:\s*"[^"]+[\s\S]*?\}/g;
            let jsonMatch;
            while ((jsonMatch = jsonPattern.exec(text)) !== null) {
                const raw = (jsonMatch[1] || jsonMatch[0]).trim();
                try {
                    const parsed = JSON.parse(raw.startsWith('[') ? raw : raw.startsWith('{') ? raw : `[${raw}]`);
                    const arr = Array.isArray(parsed) ? parsed : [parsed];
                    for (const obj of arr) {
                        if (!obj || typeof obj !== 'object') continue;
                        // Detect type from fields
                        let type: DeliverableType | null = null;
                        if (obj.jtbd || obj.painPoints || obj.goals) type = 'persona';
                        else if (obj.impactLevel || (obj.evidenceBasis && obj.title)) type = 'recommendation';
                        else if (obj.phase && obj.touchpoint) type = 'journey_stage';
                        else if (obj.horizon && (obj.effort || obj.impact)) type = 'roadmap_item';
                        else if (obj.currentMaturity && obj.targetMaturity) type = 'gap';
                        else if (obj.priority && obj.userStory) type = 'prd_feature';
                        else if (obj.strengths && obj.weaknesses && obj.position) type = 'competitive_peer';
                        else if (obj.citations && obj.description && obj.name) type = 'theme';

                        if (type) {
                            items.push({
                                id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                                type,
                                data: obj,
                                status: 'pending',
                                model,
                                timestamp: Date.now(),
                            });
                        }
                    }
                } catch { /* not valid JSON */ }
            }
        }

        return items;
    }, []);

    const parseSlideBlocks = useCallback((text: string, model?: string): SlideData[] => {
        const pattern = /:::slide\n([\s\S]*?):::/g;
        const slidesList: SlideData[] = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                const parsed = JSON.parse(match[1].trim());
                slidesList.push({
                    id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    title: parsed.title || 'Untitled Slide',
                    blocks: (parsed.blocks || []).map((b: any) => ({
                        type: b.type,
                        raw: JSON.stringify(b.data),
                        data: b.data,
                    })),
                    status: 'draft',
                    model,
                    timestamp: Date.now(),
                });
            } catch { /* malformed JSON — skip */ }
        }
        return slidesList;
    }, []);

    // Image generation handler — detects /image prefix or image-related keywords
    const isImageRequest = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        return lower.startsWith('/image ') || lower.startsWith('/portrait ') ||
            (lower.includes('generate') && (lower.includes('image') || lower.includes('portrait') || lower.includes('diagram') || lower.includes('photo')));
    };

    const handleImageGeneration = async (prompt: string): Promise<ChatMessage> => {
        const startTime = Date.now();
        setImageLoading(true);
        try {
            const { generateImage, generatePortrait } = await import('../services/geminiService');
            const isPortrait = prompt.toLowerCase().includes('portrait') || prompt.toLowerCase().includes('headshot');
            const cleanPrompt = prompt.replace(/^\/(image|portrait)\s+/i, '');
            const imageData = isPortrait
                ? await generatePortrait(cleanPrompt)
                : await generateImage(cleanPrompt, '16:9');

            setImageLoading(false);
            return {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: imageData ? `Generated image for: "${cleanPrompt.substring(0, 80)}"` : 'Image generation failed. Check your Gemini API key.',
                model: 'deepseek-v4-flash',
                timestamp: Date.now(),
                durationMs: Date.now() - startTime,
                imageData: imageData || undefined,
            };
        } catch (e: any) {
            setImageLoading(false);
            return {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: `Image generation error: ${e.message || 'Unknown error'}`,
                model: 'deepseek-v4-flash',
                timestamp: Date.now(),
                durationMs: Date.now() - startTime,
            };
        }
    };

    const handleSend = async (queryOverride?: string) => {
        const query = queryOverride || input.trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setShowSuggestions(false);

        // Route: image generation vs. normal chat
        if (isImageRequest(query)) {
            const response = await handleImageGeneration(query);
            setMessages(prev => [...prev, response]);
            setIsLoading(false);
            return;
        }

        const context = buildContext();
        const response = await sendChatMessage(selectedModel, query, messages, context);
        setMessages(prev => [...prev, response]);

        // Only parse deliverables/slides when a skill was activated (user asked for structured output)
        // Normal Q&A responses are left as plain text
        if (response.skillUsed) {
            const newDeliverables = parseDeliverableBlocks(response.content, response.model);
            if (newDeliverables.length > 0) {
                setDeliverables(prev => [...prev, ...newDeliverables]);
            }
            const newSlides = parseSlideBlocks(response.content, response.model);
            if (newSlides.length > 0) {
                setSlides(prev => [...prev, ...newSlides]);
            }
        } else {
            // Even without a skill, check for explicit :::deliverable: and :::slide delimiters
            // (the AI might use them voluntarily)
            if (response.content.includes(':::deliverable:') || response.content.includes(':::slide')) {
                const newDeliverables = parseDeliverableBlocks(response.content, response.model);
                if (newDeliverables.length > 0) setDeliverables(prev => [...prev, ...newDeliverables]);
                const newSlides = parseSlideBlocks(response.content, response.model);
                if (newSlides.length > 0) setSlides(prev => [...prev, ...newSlides]);
            }
        }

        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    const articleCount = liveSourceResults.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Archivo', sans-serif", background: '#FFFFFF' }}>

            {/* Main Chat Area */}
            <div style={{ flex: '1 1 70%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #E0E0E0' }}>

                {/* Header */}
                <div style={{
                    background: '#0D0D0D', padding: '16px 24px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#B8B800' }}>
                            Research Workbench
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                            {liveSourceResults.length} sources | {articleCount} articles | {researchGoal.substring(0, 60)}{researchGoal.length > 60 ? '...' : ''}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {messages.length > 0 && (
                            <button
                                onClick={() => {
                                    const text = messages.map(m => `[${m.role.toUpperCase()}${m.model ? ` via ${m.model}` : ''}]\n${m.content}`).join('\n\n---\n\n');
                                    const blob = new Blob([text], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `workbench-${new Date().toISOString().split('T')[0]}.txt`;
                                    a.click(); URL.revokeObjectURL(url);
                                }}
                                style={{ fontSize: 8, color: '#B8B800', background: 'none', border: '1px solid #555', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}
                            >Export Chat</button>
                        )}
                    </div>
                </div>

                {/* Artifact Notifications — surface generated artifacts without leaving chat */}
                {(artifactNotifications && artifactNotifications.length > 0) && (
                    <div style={{
                        padding: '10px 16px',
                        background: '#FAFAF7',
                        borderBottom: '2px solid #B8B800',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#666' }}>
                            Artifacts Ready
                        </div>
                        {artifactNotifications.map(n => (
                            <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                                <div style={{ fontSize: 12, color: '#0D0D0D', flex: 1 }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", background: '#0D0D0D', color: '#B8B800', padding: '1px 6px', fontSize: 10, marginRight: 8 }}>
                                        #{n.type}
                                    </span>
                                    {n.label} — try <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#F0F0E8', padding: '1px 4px' }}>#{n.type}</code> in chat
                                </div>
                                <button
                                    onClick={() => onOpenDesignDesk && onOpenDesignDesk()}
                                    style={{
                                        padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                                        textTransform: 'uppercase', border: '1px solid #B8B800',
                                        background: '#FFFFFF', color: '#0D0D0D', cursor: 'pointer', borderRadius: 2,
                                    }}>
                                    Open in Designer
                                </button>
                                <button
                                    onClick={() => onDismissNotification && onDismissNotification(n.id)}
                                    style={{
                                        padding: '4px 8px', fontSize: 12, border: 'none',
                                        background: 'transparent', color: '#888', cursor: 'pointer',
                                    }}>
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Model Selector */}
                <div style={{
                    padding: '12px 24px', borderBottom: '1px solid #E8E8E8',
                    display: 'flex', gap: 8,
                }}>
                    {AVAILABLE_MODELS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            title={`${m.description}\n${m.contextWindow} | ${m.strengths}`}
                            style={{
                                flex: 1, padding: '10px 6px', border: '1px solid',
                                borderColor: selectedModel === m.id ? m.color : '#E0E0E0',
                                background: selectedModel === m.id ? `${m.color}15` : '#FAFAFA',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: selectedModel === m.id ? m.color : '#888' }}>
                                {m.provider}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#333', marginTop: 2 }}>
                                {m.name}
                            </div>
                            <div style={{ fontSize: 8, color: '#999', marginTop: 1 }}>
                                {m.contextWindow}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px 24px',
                    display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                    {/* Welcome */}
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#0D0D0D', letterSpacing: '0.02em' }}>
                                CHAT-DRIVEN RESEARCH
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
                                Grounded in {articleCount} articles from {liveSourceResults.length} sources.
                                Ask questions, request deliverables, or create NXT-styled visual outputs.
                                {skillManifest.length > 0 && ` ${skillManifest.filter(s => s.category === 'research-deliverable').length} consulting skills loaded.`}
                            </div>
                        </div>
                    )}

                    {/* Suggested Queries */}
                    {showSuggestions && messages.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 600, margin: '0 auto', width: '100%' }}>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>
                                Suggested Questions
                            </div>
                            {SUGGESTED_QUERIES.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    style={{
                                        textAlign: 'left', padding: '12px 16px', background: '#FAFAFA',
                                        border: '1px solid #E8E8E8', cursor: 'pointer',
                                        fontSize: 12, color: '#444', lineHeight: 1.5,
                                        transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#B8B800'; }}
                                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E8E8E8'; }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Conversation */}
                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: msg.role === 'user' ? '70%' : '95%',
                            width: msg.role === 'assistant' ? '100%' : undefined,
                        }}>
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{
                                        fontSize: 8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                                        color: AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#888',
                                    }}>
                                        {AVAILABLE_MODELS.find(m => m.id === msg.model)?.name || msg.model}
                                    </span>
                                    {msg.skillUsed && (
                                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#00B7C3', background: '#E8F6F7', padding: '1px 6px' }}>
                                            {msg.skillUsed}
                                        </span>
                                    )}
                                    {msg.durationMs && (
                                        <span style={{ fontSize: 9, color: '#BBB' }}>
                                            {(msg.durationMs / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                </div>
                            )}
                            <div style={{
                                padding: msg.role === 'user' ? '12px 16px' : '16px 20px',
                                background: msg.role === 'user' ? '#0D0D0D' : '#FFFFFF',
                                color: msg.role === 'user' ? '#FFFFFF' : '#333',
                                fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                                borderLeft: msg.role === 'assistant' ? `3px solid ${AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#E0E0E0'}` : 'none',
                                border: msg.role === 'assistant' ? `1px solid #E8E8E8` : 'none',
                                borderLeftWidth: msg.role === 'assistant' ? 3 : 0,
                            }}>
                                {msg.role === 'assistant' ? (() => {
                                    // Check if this message has associated deliverable cards or slides
                                    const msgDeliverables = deliverables.filter(d => d.timestamp >= msg.timestamp - 1000 && d.timestamp <= msg.timestamp + 5000 && d.model === msg.model);
                                    const msgSlides = slides.filter(s => s.timestamp >= msg.timestamp - 1000 && s.timestamp <= msg.timestamp + 5000 && s.model === msg.model);
                                    const hasStructuredOutput = msgDeliverables.length > 0 || msgSlides.length > 0;

                                    let cleanContent = msg.content;

                                    // Only strip JSON/delimiter markup if we actually parsed structured output from it
                                    if (hasStructuredOutput) {
                                        cleanContent = cleanContent.replace(/:::deliverable:\S+\n[\s\S]*?:::/g, '');
                                        cleanContent = cleanContent.replace(/:::slide\n[\s\S]*?:::/g, '');
                                        cleanContent = cleanContent.replace(/```json\s*[\s\S]*?```/g, '');
                                    }
                                    // Always strip :::nxt: blocks (they render as visual components)
                                    // (parseNxtBlocks handles this, but clean the delimiters from text)

                                    // Light markdown cleanup (strip headers and bold, keep prose readable)
                                    cleanContent = cleanContent.replace(/^#{1,4}\s+/gm, '');
                                    cleanContent = cleanContent.replace(/\*\*([^*]+)\*\*/g, '$1');
                                    cleanContent = cleanContent.replace(/\*([^*]+)\*/g, '$1');
                                    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

                                    // Parse NXT output blocks from cleaned content
                                    const nxtSegments = parseNxtBlocks(cleanContent);
                                    return nxtSegments.map((seg, si) => {
                                        if (seg.type === 'nxt-block' && seg.block) {
                                            // Render NXT visual block with pin button
                                            return (
                                                <div key={si} style={{ margin: '12px 0' }}>
                                                    <NxtBlockRenderer
                                                        block={seg.block}
                                                        onPin={(block) => handlePin(block, msg.model)}
                                                        isPinned={pinnedOutputs.some(p => p.block.raw === seg.block!.raw)}
                                                    />
                                                </div>
                                            );
                                        }
                                        // Plain text with citation parsing
                                        const { segments: citSegments } = parseChatCitations(seg.content, sourceRefsRef.current);
                                        return (
                                            <span key={si}>
                                                {citSegments.map((cit, ci) => {
                                                    if (cit.type === 'citation') {
                                                        return cit.url ? (
                                                            <a key={ci} href={cit.url} target="_blank" rel="noopener noreferrer"
                                                                title={`${cit.sourceName}: ${cit.title}\nClick to visit source`}
                                                                style={{ color: '#115054', background: '#E8F4F5', padding: '1px 6px', textDecoration: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid #00B7C3' }}
                                                            >
                                                                {cit.sourceName}: "{cit.title?.substring(0, 50)}{(cit.title?.length || 0) > 50 ? '...' : ''}"
                                                            </a>
                                                        ) : (
                                                            <span key={ci} title={`${cit.sourceName}: ${cit.title}`}
                                                                style={{ color: '#115054', background: '#F0F0E8', padding: '1px 6px', fontSize: 11, fontWeight: 600 }}
                                                            >
                                                                {cit.sourceName}: "{cit.title?.substring(0, 50)}{(cit.title?.length || 0) > 50 ? '...' : ''}"
                                                            </span>
                                                        );
                                                    }
                                                    return <span key={ci}>{cit.content}</span>;
                                                })}
                                            </span>
                                        );
                                    });
                                })() : msg.content}
                                {/* Inline image rendering */}
                                {msg.imageData && (
                                    <div className="nxt-image-block" style={{ marginTop: 12 }}>
                                        <img src={msg.imageData} alt="Generated" style={{ width: '100%' }} />
                                        <div className="nxt-image-caption">Generated via Imagen 4 | {msg.model}</div>
                                    </div>
                                )}
                                {/* Deliverable cards — rendered from :::deliverable: blocks */}
                                {msg.role === 'assistant' && (() => {
                                    const msgDeliverables = deliverables.filter(d => d.timestamp >= msg.timestamp - 1000 && d.timestamp <= msg.timestamp + 5000 && d.model === msg.model);
                                    if (msgDeliverables.length === 0) return null;
                                    // Group by type for batch rendering
                                    const byType = new Map<DeliverableType, DeliverableItem[]>();
                                    for (const d of msgDeliverables) {
                                        const list = byType.get(d.type) || [];
                                        list.push(d);
                                        byType.set(d.type, list);
                                    }
                                    return Array.from(byType.entries()).map(([type, items]) => (
                                        <DeliverableBatch
                                            key={`batch-${type}-${msg.id}`}
                                            items={items}
                                            onApprove={handleApproveDeliverable}
                                            onReject={handleRejectDeliverable}
                                            onApproveAll={handleApproveAllDeliverables}
                                        />
                                    ));
                                })()}
                                {/* Slide canvases — rendered from :::slide blocks */}
                                {msg.role === 'assistant' && (() => {
                                    const msgSlides = slides.filter(s => s.timestamp >= msg.timestamp - 1000 && s.timestamp <= msg.timestamp + 5000 && s.model === msg.model);
                                    return msgSlides.map(slide => (
                                        <SlideCanvas
                                            key={slide.id}
                                            slide={slide}
                                            onApprove={handleApproveSlide}
                                            onReject={handleRejectSlide}
                                            onGenerateVisual={handleSlideGenerateVisual}
                                            onEditTitle={handleSlideEditTitle}
                                            isGeneratingVisual={generatingVisualForSlide === slide.id}
                                        />
                                    ));
                                })()}
                            </div>
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                        style={{ fontSize: 8, color: '#888', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}
                                    >Copy</button>
                                    {msg.imageData && (
                                        <button
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = msg.imageData!;
                                                a.download = `nxt-image-${Date.now()}.png`;
                                                a.click();
                                            }}
                                            style={{ fontSize: 8, color: '#888', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}
                                        >Save Image</button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {(isLoading || imageLoading) && (
                        <div style={{
                            padding: '12px 16px', background: '#FAFAFA',
                            borderLeft: `3px solid ${imageLoading ? '#B8B800' : modelConfig?.color || '#888'}`,
                            fontSize: 11, color: '#888', fontStyle: 'italic',
                        }}>
                            {imageLoading ? 'Generating image via Imagen 4...' : `${modelConfig?.name} is reasoning...`}
                            {skillManifest.length > 0 && (() => {
                                const matched = matchSkills(input || messages[messages.length - 1]?.content || '', skillManifest);
                                return matched.length > 0 ? ` (activating ${matched[0].name})` : '';
                            })()}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '16px 24px 20px', borderTop: '1px solid #E8E8E8',
                    background: '#FAFAFA',
                }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your research data, or request an NXT visual output..."
                            rows={3}
                            style={{
                                flex: 1, padding: '12px 16px', border: '1px solid #E0E0E0',
                                fontSize: 13, fontFamily: "'Archivo', sans-serif",
                                resize: 'none', outline: 'none', lineHeight: 1.5,
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            style={{
                                padding: '0 20px', background: isLoading ? '#CCC' : '#B8B800',
                                color: '#0D0D0D', border: 'none',
                                fontWeight: 700, fontSize: 11, letterSpacing: '1px',
                                textTransform: 'uppercase', cursor: isLoading ? 'default' : 'pointer',
                            }}
                        >
                            Send
                        </button>
                    </div>
                    <div style={{ fontSize: 9, color: '#AAA', marginTop: 6 }}>
                        Shift+Enter for new line | {articleCount} articles via {modelConfig?.name} ({modelConfig?.contextWindow})
                        {skillManifest.length > 0 && ` | ${skillManifest.filter(s => s.category === 'research-deliverable').length} skills loaded`}
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', background: '#FAFAFA', minWidth: 320 }}>
                {/* Panel Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0' }}>
                    <button
                        onClick={() => setRightPanel('graph')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                            fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                            background: rightPanel === 'graph' ? '#FFFFFF' : '#F5F5F0',
                            color: rightPanel === 'graph' ? '#0D0D0D' : '#999',
                            borderBottom: rightPanel === 'graph' ? '2px solid #B8B800' : '2px solid transparent',
                        }}
                    >Knowledge Graph</button>
                    <button
                        onClick={() => setRightPanel('pins')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                            fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                            background: rightPanel === 'pins' ? '#FFFFFF' : '#F5F5F0',
                            color: rightPanel === 'pins' ? '#0D0D0D' : '#999',
                            borderBottom: rightPanel === 'pins' ? '2px solid #00B7C3' : '2px solid transparent',
                        }}
                    >Pinned{pinnedOutputs.length > 0 ? ` (${pinnedOutputs.length})` : ''}</button>
                </div>

                {/* Panel Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {rightPanel === 'graph' && knowledgeGraphData && (
                        <ResearchKnowledgeGraph
                            graph={knowledgeGraphData}
                            excludedSources={excludedSources}
                            onExcludeSource={onExcludeSource || (() => {})}
                            onPrioritySource={onPrioritySource || (() => {})}
                            prioritySources={prioritySources}
                        />
                    )}
                    {rightPanel === 'graph' && !knowledgeGraphData && (
                        <div style={{ padding: 24, fontSize: 12, color: '#999', textAlign: 'center' }}>
                            Knowledge graph will appear after data collection and analysis.
                        </div>
                    )}
                    {rightPanel === 'pins' && (
                        <OutputBoard
                            pinnedOutputs={pinnedOutputs}
                            onReorder={setPinnedOutputs}
                            onRemove={handleUnpin}
                            onAddDivider={handleAddDivider}
                        />
                    )}
                </div>

                {/* Source Summary */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #E0E0E0', background: '#F5F5F0' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
                        Corpus Summary
                    </div>
                    <div style={{ fontSize: 10, color: '#666', lineHeight: 1.5 }}>
                        {liveSourceResults.length} sources | {articleCount} articles | {files.length} uploaded files
                        {corpusText && <><br />{Math.round(corpusText.length / 1000)}KB corpus loaded</>}
                        {excludedSources.size > 0 && <><br />{excludedSources.size} articles excluded</>}
                        {prioritySources.size > 0 && <><br />{prioritySources.size} priority articles</>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWorkbench;
