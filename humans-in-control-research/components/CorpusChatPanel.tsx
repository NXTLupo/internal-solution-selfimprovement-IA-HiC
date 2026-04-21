/**
 * Corpus Chat Panel v2 — Persistent across all phases.
 *
 * Same chat from data collection through synthesis. Features:
 * - Multi-model: Gemini 2.5 Flash (default), Claude Opus 4.7, Sonnet 4.6, GPT-5.4 Mini
 * - Skill manifest matching (lazy-loads SKILL.md + wiki companions)
 * - NXT visual output rendering (:::nxt:TYPE blocks)
 * - Deliverable cards (:::deliverable:TYPE or fallback JSON detection)
 * - Slide canvases (:::slide blocks)
 * - Image generation (/image or /portrait prefix)
 * - Knowledge Graph context
 * - Maximize toggle (sidebar ↔ full-width)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    sendChatMessage, AVAILABLE_MODELS, loadSkillManifest, matchSkills,
    buildSourceReferences, parseChatCitations,
    type ChatMessage, type ChatModel, type ChatContext, type SkillManifestEntry,
} from '../services/corpusChatService';
import { NxtBlockRenderer, parseNxtBlocks, type NxtBlock } from './NxtOutputRenderer';
import { DeliverableBatch, type DeliverableItem, type DeliverableType } from './DeliverableCard';
import SlideCanvas, { type SlideData } from './SlideCanvas';
import { detectBrandFromText, getBrand, type BrandId } from './slideTemplates/brands';
import { exportDeckToPPTX, preprocessImageCover } from './slideTemplates/pptx';
import { detectQuoteDensity, enrichSlideWithQuotes, backfillSlidesFromWiki } from '../services/quoteExtractor';
import { validateSlide } from '../services/slideValidator';

interface Props {
    context: ChatContext;
    getContext?: () => ChatContext;
    isOpen: boolean;
    onToggle: () => void;
    onDeliverableApproved?: (type: string, data: any) => void;
}

/**
 * Prominent loading animation shown while the AI is reasoning or generating
 * an image. Designed to make it unmistakable that work is in progress —
 * pulsing ring + traveling progress bar + live elapsed timer + rotating
 * contextual status text so the user knows the system is alive even on the
 * longer (multi-second) Opus or Imagen calls.
 */
const LoadingIndicator: React.FC<{ mode: 'reasoning' | 'image'; modelName: string; accentColor: string }> = ({ mode, modelName, accentColor }) => {
    const [elapsed, setElapsed] = useState(0);
    const [phaseIdx, setPhaseIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setElapsed(e => e + 0.1), 100);
        return () => clearInterval(t);
    }, []);

    const phases = mode === 'image'
        ? ['Composing scene', 'Rendering pixels', 'Finalizing image']
        : ['Grounding in corpus', 'Reasoning across sources', 'Composing response', 'Validating citations'];
    useEffect(() => {
        const t = setInterval(() => setPhaseIdx(p => (p + 1) % phases.length), 2400);
        return () => clearInterval(t);
    }, [phases.length]);

    const label = mode === 'image' ? 'GENERATING IMAGE' : `${modelName.toUpperCase()} IS WORKING`;
    const ringColor = mode === 'image' ? '#B8B800' : accentColor;

    return (
        <div style={{
            padding: '20px 22px',
            background: '#FAFAF7',
            borderLeft: `4px solid ${ringColor}`,
            borderTop: '1px solid #E8E8E8',
            borderBottom: '1px solid #E8E8E8',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            margin: '12px 0',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Spinning brand ring with dot pulse at center */}
            <div style={{ width: 44, height: 44, position: 'relative', flexShrink: 0 }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    border: `3px solid ${ringColor}22`,
                    borderTopColor: ringColor,
                    borderRadius: '50%',
                    animation: 'nxt-spin 0.9s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 14,
                    background: ringColor,
                    borderRadius: '50%',
                    animation: 'nxt-pulse 1.4s ease-in-out infinite',
                }} />
            </div>
            {/* Text block */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '2px', color: '#0D0D0D' }}>
                    {label}
                </div>
                <div style={{ marginTop: 3, fontSize: 11, color: '#666', fontWeight: 400, fontStyle: 'italic', minHeight: 16 }}>
                    {phases[phaseIdx]}…
                </div>
                {/* Traveling progress bar */}
                <div style={{ marginTop: 10, height: 3, background: '#E8E8E8', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, width: '30%',
                        background: ringColor,
                        animation: 'nxt-travel 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                    }} />
                </div>
            </div>
            {/* Elapsed timer */}
            <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                color: ringColor,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
                minWidth: 56,
                textAlign: 'right',
            }}>
                {elapsed.toFixed(1)}s
            </div>
            <style>{`
                @keyframes nxt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes nxt-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.6); opacity: 0.4; } }
                @keyframes nxt-travel { 0% { left: -30%; } 100% { left: 100%; } }
            `}</style>
        </div>
    );
};

const SUGGESTED_QUERIES = [
    "What are the top 15 themes learned across all data sources?",
    "What are the key personas across all collected data?",
    "What are the most cited pain points across all sources?",
    "Summarize the competitive landscape based on collected intelligence",
    "What are the top 5 strategic recommendations and their evidence?",
    "What do Reddit users say about this topic? Quote them directly.",
    "Which academic papers are most relevant and what do they conclude?",
    "What capability gaps were identified and how severe are they?",
    "What case studies or real-world examples appear in the data?",
    "Create a stat row showing the 3 most impactful findings with sources.",
];

export const CorpusChatPanel: React.FC<Props> = ({ context, getContext, isOpen, onToggle, onDeliverableApproved }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-2.5-flash');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [maximized, setMaximized] = useState(false);
    const [skillManifest, setSkillManifest] = useState<SkillManifestEntry[]>([]);
    const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
    const [slides, setSlides] = useState<SlideData[]>([]);
    const [generatingVisualId, setGeneratingVisualId] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [wikiSourceArchive, setWikiSourceArchive] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load skill manifest once
    useEffect(() => {
        loadSkillManifest().then(m => { if (m.length > 0) setSkillManifest(m); });
    }, []);

    // Load the latest wiki source archive (verified URLs from actual data collection)
    useEffect(() => {
        (async () => {
            try {
                // Find the latest source archive in wiki/sources/
                const today = new Date().toISOString().split('T')[0];
                // Try today's archive first, then fall back to fetching from proxy
                for (const datePrefix of [today, '']) {
                    const path = datePrefix
                        ? `/hic-workspace/wiki/sources/${datePrefix}`
                        : '/hic-workspace/wiki/sources/';
                    try {
                        // Try to fetch a directory listing or known archive patterns
                        const resp = await fetch(`http://localhost:5012/api/wiki/list/sources`).catch(() => null);
                        if (resp?.ok) {
                            const files = await resp.json();
                            // Find the latest source-archive file (not curation files)
                            const archives = (files.files || [])
                                .filter((f: string) => f.endsWith('.md') && !f.includes('curation') && !f.includes('uploads'))
                                .sort()
                                .reverse();
                            if (archives.length > 0) {
                                const archiveResp = await fetch(`http://localhost:5012/api/wiki/read/sources/${archives[0]}`);
                                if (archiveResp.ok) {
                                    const data = await archiveResp.json();
                                    if (data.content && data.content.length > 100) {
                                        setWikiSourceArchive(data.content);
                                        console.log(`[Chat] Loaded wiki source archive: sources/${archives[0]} (${Math.round(data.content.length / 1024)}KB)`);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch {}
                }
            } catch {}
        })();
    }, [context.articleCount]); // Reload when article count changes (new collection)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    // --- Deliverable parsing ---
    const parseDeliverableBlocks = useCallback((text: string, model?: string): DeliverableItem[] => {
        const items: DeliverableItem[] = [];
        // Strategy 1: Explicit :::deliverable:TYPE delimiters
        const delimPattern = /:::deliverable:(\S+)\n([\s\S]*?):::/g;
        let match;
        while ((match = delimPattern.exec(text)) !== null) {
            try {
                const data = JSON.parse(match[2].trim());
                items.push({ id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: match[1] as DeliverableType, data, status: 'pending', model, timestamp: Date.now() });
            } catch {}
        }
        // Strategy 2: Fallback for ```json blocks — only when a skill was triggered
        if (items.length === 0) {
            const jsonPattern = /```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/g;
            while ((match = jsonPattern.exec(text)) !== null) {
                try {
                    const parsed = JSON.parse(match[1].trim());
                    const arr = Array.isArray(parsed) ? parsed : [parsed];
                    for (const obj of arr) {
                        if (!obj || typeof obj !== 'object') continue;
                        let type: DeliverableType | null = null;
                        if (obj.jtbd || obj.painPoints || obj.goals) type = 'persona';
                        else if (obj.impactLevel || (obj.evidenceBasis && obj.title)) type = 'recommendation';
                        else if (obj.phase && obj.touchpoint) type = 'journey_stage';
                        else if (obj.horizon && (obj.effort || obj.impact)) type = 'roadmap_item';
                        else if (obj.currentMaturity && obj.targetMaturity) type = 'gap';
                        else if (obj.priority && obj.userStory) type = 'prd_feature';
                        else if (obj.strengths && obj.weaknesses && obj.position) type = 'competitive_peer';
                        else if (obj.isCrossDocument !== undefined || (obj.citations && obj.quote && obj.name)) type = 'theme';
                        if (type) items.push({ id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type, data: obj, status: 'pending', model, timestamp: Date.now() });
                    }
                } catch {}
            }
        }
        return items;
    }, []);

    const parseSlideBlocks = useCallback((text: string, model?: string, userQuery?: string): SlideData[] => {
        // Brand is chosen once per call: explicit JSON `brand` > hashtag in AI text > hashtag in user query > default nxt
        const brandFromText = detectBrandFromText(text);
        const brandFromQuery = userQuery ? detectBrandFromText(userQuery) : null;
        const defaultBrand: BrandId = brandFromText || brandFromQuery || 'nxt';

        // Detect "N quotes each" / "#quotes=N" in the user message so we can
        // deterministically enrich every emitted slide with real corpus quotes
        // pulled from the KG — no fabrication, full source attribution.
        const quoteDirective = userQuery ? detectQuoteDensity(userQuery) : null;
        const liveCtx = getContext ? getContext() : context;
        const kg = liveCtx?.knowledgeGraph;

        // Match :::slide [optional template=NAME] [optional brand=NAME] ... :::
        const pattern = /:::slide((?:\s+[a-z]+=[a-z-]+)*)\s*\n([\s\S]*?):::/g;
        const result: SlideData[] = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                const attrs = match[1] || '';
                const fenceTemplate = (attrs.match(/\btemplate=([a-z-]+)/i)?.[1] || '').toLowerCase();
                const fenceBrand = (attrs.match(/\bbrand=(nxt|nu|northeastern)/i)?.[1] || '').toLowerCase();
                const parsed = JSON.parse(match[2].trim());
                const brand: BrandId = (parsed.brand as BrandId) || (fenceBrand === 'nu' || fenceBrand === 'northeastern' ? 'nu' : fenceBrand === 'nxt' ? 'nxt' : defaultBrand);
                // Resolve template: prefer fence label, then JSON `template`, then auto-detect by field
                let template: any = fenceTemplate || parsed.template;
                if (!template) {
                    if (parsed.persona) template = 'persona-card';
                    else if (parsed.recommendation) template = 'recommendation';
                    else if (parsed.themeCluster || parsed.themes) template = 'theme-cluster';
                    else if (parsed.matrix) template = 'competitive-matrix';
                    else if (parsed.quote && parsed.quote.text) template = 'block-quote';
                    else if (parsed.caseStudy) template = 'case-study';
                    else if (parsed.principles) template = 'principles';
                    else if (parsed.statRow || parsed.stats) template = 'stat-row';
                    else if (parsed.timeline || parsed.phases) template = 'timeline';
                    else if (parsed.sectionDivider) template = 'section-divider';
                    else if (parsed.serviceBlueprint || parsed.blueprint) template = 'service-blueprint';
                    else if (parsed.gapMatrix || parsed.gaps) template = 'gap-matrix';
                    else if (parsed.architectureMap || parsed.architecture || parsed.layers) template = 'architecture-map';
                    else if (parsed.prdFeature || parsed.features) template = 'prd-feature';
                    else if (parsed.systemsInventory || parsed.systems) template = 'systems-inventory';
                    else template = 'recommendation'; // safe default
                }
                // Normalize alternative field names
                const themeCluster = parsed.themeCluster || (Array.isArray(parsed.themes) ? { themes: parsed.themes } : undefined);

                // Deterministic quote enrichment: if the user asked for N quotes
                // and this slide has a theme cluster, pull real verbatim quotes
                // from the KG for every theme missing enough quotes.
                if (quoteDirective && themeCluster && kg && kg.nodes.length > 0) {
                    enrichSlideWithQuotes({ themeCluster }, kg, quoteDirective);
                }
                const statRow = parsed.statRow || (Array.isArray(parsed.stats) ? { stats: parsed.stats } : undefined);
                const timeline = parsed.timeline || (Array.isArray(parsed.phases) ? { phases: parsed.phases } : undefined);
                const serviceBlueprint = parsed.serviceBlueprint || (parsed.blueprint ? parsed.blueprint : (Array.isArray(parsed.stages) ? { stages: parsed.stages } : undefined));
                const gapMatrix = parsed.gapMatrix || (Array.isArray(parsed.gaps) ? { gaps: parsed.gaps } : undefined);
                const architectureMap = parsed.architectureMap || parsed.architecture || (Array.isArray(parsed.layers) ? { layers: parsed.layers } : undefined);
                const prdFeature = parsed.prdFeature || (Array.isArray(parsed.features) ? { features: parsed.features } : undefined);
                const systemsInventory = parsed.systemsInventory || (Array.isArray(parsed.systems) ? { systems: parsed.systems } : undefined);

                // Run post-parse validation to detect corpus meta-commentary,
                // empty block-quotes, case-study fields that don't mention the
                // subject, etc. Advisory — the slide still renders, but the
                // EVIDENCE GAP badge is shown.
                const validation = validateSlide({
                    title: parsed.title,
                    caseStudy: parsed.caseStudy,
                    quote: parsed.quote,
                    themeCluster,
                });
                result.push({
                    id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    template,
                    brand,
                    title: parsed.title || 'Untitled Slide',
                    subtitle: parsed.subtitle,
                    sources: parsed.sources,
                    persona: parsed.persona,
                    recommendation: parsed.recommendation,
                    themeCluster,
                    matrix: parsed.matrix,
                    quote: parsed.quote && parsed.quote.text ? parsed.quote : undefined,
                    caseStudy: parsed.caseStudy,
                    principles: parsed.principles,
                    statRow,
                    timeline,
                    sectionDivider: parsed.sectionDivider,
                    serviceBlueprint,
                    gapMatrix,
                    architectureMap,
                    prdFeature,
                    systemsInventory,
                    body: parsed.body,
                    bullets: parsed.bullets,
                    blocks: (parsed.blocks || []).map((b: any) => ({ type: b.type, raw: JSON.stringify(b.data), data: b.data })),
                    evidenceGap: validation.evidenceGap ? { summary: validation.gapSummary, issues: validation.issues.filter(i => i.severity === 'gap') } : undefined,
                    status: 'draft', model, timestamp: Date.now(),
                });
            } catch {}
        }
        return result;
    }, [context, getContext]);

    // --- Deliverable approval ---
    const handleApproveDeliverable = useCallback((item: DeliverableItem) => {
        setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, status: 'approved' as const } : d));
        // Flow approved deliverable to App.tsx for KG integration
        if (onDeliverableApproved) {
            onDeliverableApproved(item.type, item.data);
        }
    }, [onDeliverableApproved]);

    const handleRejectDeliverable = useCallback((item: DeliverableItem) => {
        setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, status: 'rejected' as const } : d));
    }, []);

    // --- Image generation ---
    // --- Auto-generate portraits for persona deliverables ---
    const generatePersonaPortraits = useCallback(async (items: DeliverableItem[]) => {
        const personas = items.filter(i => i.type === 'persona' && !i.data.imageUrl);
        if (personas.length === 0) return;

        try {
            const { generatePortrait } = await import('../services/geminiService');
            for (const persona of personas) {
                const d = persona.data;
                const prompt = `Professional headshot portrait of ${d.name || 'a person'}, ${d.role || 'professional'}. ${d.demographics || ''}. Clean studio background, natural lighting, confident expression. Corporate professional photography style.`;
                try {
                    const imageData = await generatePortrait(prompt);
                    if (imageData) {
                        setDeliverables(prev => prev.map(item =>
                            item.id === persona.id
                                ? { ...item, data: { ...item.data, imageUrl: imageData } }
                                : item
                        ));
                    }
                } catch (e) {
                    console.warn(`[Chat] Portrait generation failed for ${d.name}:`, e);
                }
            }
        } catch (e) {
            console.warn('[Chat] Portrait generation module failed:', e);
        }
    }, []);

    // Auto-generate portraits for persona SLIDES (not just deliverable cards)
    const generatePersonaSlidePortraits = useCallback(async (slideList: SlideData[]) => {
        const personaSlides = slideList.filter(s => s.template === 'persona-card' && s.persona && !s.imageUrl);
        if (personaSlides.length === 0) return;
        try {
            const { generatePortrait } = await import('../services/geminiService');
            for (const slide of personaSlides) {
                const p = slide.persona!;
                const prompt = `Professional headshot portrait of ${p.name}, ${p.role}. ${p.demographics || ''}. Clean studio background, natural lighting, confident expression. Corporate professional photography style.`;
                try {
                    const imageData = await generatePortrait(prompt);
                    if (imageData) {
                        setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, imageUrl: imageData } : s));
                    }
                } catch (e) { console.warn(`Portrait failed for ${p.name}:`, e); }
            }
        } catch (e) { console.warn('Portrait module failed:', e); }
    }, []);

    // --- Deck export (all slides in the chat) ---
    const handleExportDeckPPTX = useCallback(async () => {
        if (slides.length === 0) return;
        const args = slides.map(s => ({
            template: s.template,
            title: s.title,
            sources: s.sources,
            imageUrl: s.imageUrl,
            brand: getBrand(s.brand),
            persona: s.persona,
            recommendation: s.recommendation,
            themeCluster: s.themeCluster,
            matrix: s.matrix,
            quote: s.quote,
            caseStudy: s.caseStudy,
            principles: s.principles,
            statRow: s.statRow,
            timeline: s.timeline,
            sectionDivider: s.sectionDivider,
            serviceBlueprint: s.serviceBlueprint,
            gapMatrix: s.gapMatrix,
            architectureMap: s.architectureMap,
            prdFeature: s.prdFeature,
            systemsInventory: s.systemsInventory,
        }));
        try { await exportDeckToPPTX(args); } catch (e) { console.error('Deck PPTX export failed:', e); }
    }, [slides]);

    const handleExportDeckPDF = useCallback(async () => {
        if (slides.length === 0) return;
        // Capture each slide's DOM (rendered in the chat) and compose into a multi-page PDF.
        // Each slide element has id `slide-capture-{id}` set below.
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] });
            if ((document as any).fonts?.ready) { try { await (document as any).fonts.ready; } catch {} }
            for (let i = 0; i < slides.length; i++) {
                const el = document.getElementById(`slide-capture-${slides[i].id}`);
                if (!el) continue;
                // Clone offscreen at natural size to avoid transform:scale() collapse
                const clone = el.cloneNode(true) as HTMLElement;
                clone.style.position = 'fixed';
                clone.style.left = '-99999px';
                clone.style.top = '0';
                clone.style.width = '960px';
                clone.style.height = '540px';
                clone.style.transform = 'none';
                clone.style.zIndex = '-1';
                document.body.appendChild(clone);
                try {
                    await new Promise(r => requestAnimationFrame(() => r(null)));
                    // Pre-crop images to honor CSS object-fit:cover (html2canvas stretches otherwise)
                    const imgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
                    await Promise.all(imgs.map(async img => {
                        if (!img.src || img.src.startsWith('data:image/svg')) return;
                        const parent = img.parentElement; if (!parent) return;
                        const rect = parent.getBoundingClientRect();
                        const w = Math.round(rect.width), h = Math.round(rect.height);
                        if (w <= 0 || h <= 0) return;
                        const st = getComputedStyle(img);
                        if (st.objectFit !== 'cover' && !img.style.objectFit) return;
                        try {
                            const cropped = await preprocessImageCover(img.src, w * 2, h * 2);
                            img.src = cropped; img.style.objectFit = 'fill';
                            img.style.width = w + 'px'; img.style.height = h + 'px';
                        } catch {}
                    }));
                    const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, width: 960, height: 540, windowWidth: 960, windowHeight: 540, logging: false });
                    if (i > 0) pdf.addPage([13.33, 7.5], 'landscape');
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 13.33, 7.5);
                } finally {
                    document.body.removeChild(clone);
                }
            }
            pdf.save(`deck_${new Date().toISOString().split('T')[0]}_${slides.length}_slides.pdf`);
        } catch (e) { console.error('Deck PDF export failed:', e); }
    }, [slides]);

    const isImageRequest = (msg: string): boolean => {
        const lower = msg.toLowerCase();
        return lower.startsWith('/image ') || lower.startsWith('/portrait ');
    };

    const handleImageGeneration = async (prompt: string): Promise<ChatMessage> => {
        const startTime = Date.now();
        setImageLoading(true);
        try {
            const { generateImage, generatePortrait } = await import('../services/geminiService');
            const isPortrait = prompt.toLowerCase().includes('portrait');
            const cleanPrompt = prompt.replace(/^\/(image|portrait)\s+/i, '');
            const imageData = isPortrait ? await generatePortrait(cleanPrompt) : await generateImage(cleanPrompt, '16:9', undefined, true);
            setImageLoading(false);
            return { id: `msg_${Date.now()}`, role: 'assistant', content: imageData ? `Generated: "${cleanPrompt.substring(0, 60)}"` : 'Image generation failed.', model: 'gemini-2.5-flash', timestamp: Date.now(), durationMs: Date.now() - startTime, imageData: imageData || undefined };
        } catch (e: any) {
            setImageLoading(false);
            return { id: `msg_${Date.now()}`, role: 'assistant', content: `Image error: ${e.message}`, model: 'gemini-2.5-flash', timestamp: Date.now(), durationMs: Date.now() - startTime };
        }
    };

    // --- Send ---
    const handleSend = async (queryOverride?: string) => {
        const query = queryOverride || input.trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = { id: `msg_${Date.now()}`, role: 'user', content: query, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setShowSuggestions(false);

        if (isImageRequest(query)) {
            const response = await handleImageGeneration(query);
            setMessages(prev => [...prev, response]);
            setIsLoading(false);
            return;
        }

        const liveContext = getContext ? getContext() : context;
        // Inject skill manifest into context
        if (skillManifest.length > 0 && !liveContext.skillManifest) {
            liveContext.skillManifest = skillManifest;
        }
        // Inject verified source archive (real URLs from wiki)
        if (wikiSourceArchive && !liveContext.wikiSourceArchive) {
            liveContext.wikiSourceArchive = wikiSourceArchive;
        }

        // Inject current deliverable state into the query so the AI can reference
        // previously generated artifacts (e.g., "put these 5 themes on a slide")
        let enrichedQuery = query;
        if (deliverables.length > 0) {
            const delSummary = deliverables
                .filter(d => d.status !== 'rejected')
                .map(d => {
                    const data = d.data;
                    const label = data.name || data.title || data.phase || data.capability || '';
                    const citations = (data.citations || []).map((c: any) => typeof c === 'string' ? c : c.sourceName || '').filter(Boolean).join(', ');
                    return `[${d.type}] ${label}${d.status === 'approved' ? ' (APPROVED)' : ' (pending)'}${citations ? ` | Sources: ${citations}` : ''}`;
                }).join('\n');
            enrichedQuery = `${query}\n\n=== CURRENT DELIVERABLES IN THIS SESSION (reference these when asked to "put these on a slide" or "combine these") ===\n${delSummary}\n\nFull deliverable data:\n${JSON.stringify(deliverables.filter(d => d.status !== 'rejected').map(d => ({ type: d.type, ...d.data })), null, 2).substring(0, 8000)}\n=== END DELIVERABLES ===`;
        }

        const response = await sendChatMessage(selectedModel, enrichedQuery, messages, liveContext);
        setMessages(prev => [...prev, response]);

        // Parse deliverables/slides only when skill activated or explicit delimiters present
        if (response.skillUsed || response.content.includes(':::deliverable:') || response.content.includes(':::slide')) {
            const newDels = parseDeliverableBlocks(response.content, response.model);
            if (newDels.length > 0) {
                setDeliverables(prev => [...prev, ...newDels]);
                // Auto-generate portraits for personas
                generatePersonaPortraits(newDels);
            }
            const newSlides = parseSlideBlocks(response.content, response.model, query);
            if (newSlides.length > 0) {
                setSlides(prev => [...prev, ...newSlides]);
                // Auto-generate portraits for persona slides
                generatePersonaSlidePortraits(newSlides);
                // Phase 1-retrofit (2026-04-20) — WIKI-BACKED QUOTE BACKFILL.
                // Walks every theme across the new slides; wherever the AI
                // emitted a title-shaped evidence string (instead of a real
                // body sentence), pulls matching articles from the wiki
                // archive and replaces with verbatim body text. Non-blocking
                // and idempotent — the slides already render with the AI's
                // original output; this updates state with improved quotes
                // a second later. Failures leave slides untouched.
                (async () => {
                    try {
                        const backfilled = await backfillSlidesFromWiki(newSlides, query);
                        if (backfilled !== newSlides) {
                            setSlides(prev => prev.map(s => {
                                const match = backfilled.find(b => b.id === s.id);
                                return match || s;
                            }));
                        }
                    } catch (err: any) {
                        console.warn('[slides] wiki quote backfill skipped:', err?.message || err);
                    }
                })();
            }
        }

        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // --- Clean text for display ---
    const cleanResponseText = (text: string, hasCards: boolean): string => {
        let clean = text;
        if (hasCards) {
            clean = clean.replace(/:::deliverable:\S+\n[\s\S]*?:::/g, '');
            clean = clean.replace(/:::slide\n[\s\S]*?:::/g, '');
            clean = clean.replace(/```json\s*[\s\S]*?```/g, '');
        }
        // Light markdown cleanup
        clean = clean.replace(/^#{1,4}\s+/gm, '');
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
        clean = clean.replace(/\*([^*]+)\*/g, '$1');
        clean = clean.replace(/\n{3,}/g, '\n\n');
        return clean.trim();
    };

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    const panelWidth = maximized ? '70vw' : 420;

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: panelWidth,
            background: '#FFFFFF', borderLeft: '1px solid #E0E0E0',
            zIndex: 60, display: 'flex', flexDirection: 'column',
            fontFamily: "'Archivo', sans-serif",
            boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
            transition: 'width 0.3s ease',
        }}>
            {/* Header */}
            <div style={{
                background: '#0D0D0D', padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>
                        Chat to Your Data
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        {(getContext ? getContext() : context).sourceCount || 0} sources | {(getContext ? getContext() : context).articleCount || 0} articles
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {messages.length > 0 && (
                        <button onClick={() => {
                            const text = messages.map(m => `[${m.role.toUpperCase()}${m.model ? ` via ${m.model}` : ''}]\n${m.content}`).join('\n\n---\n\n');
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`; a.click(); URL.revokeObjectURL(url);
                        }} style={{ fontSize: 8, color: '#B8B800', background: 'none', border: '1px solid #555', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                            Export
                        </button>
                    )}
                    <button onClick={() => setMaximized(!maximized)} style={{ fontSize: 8, color: '#00B7C3', background: 'none', border: '1px solid #555', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                        {maximized ? 'Minimize' : 'Maximize'}
                    </button>
                    <button onClick={onToggle} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>X</button>
                </div>
            </div>

            {/* Model Selector */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #E8E8E8', display: 'flex', gap: 4 }}>
                {AVAILABLE_MODELS.map(m => (
                    <button key={m.id} onClick={() => setSelectedModel(m.id)}
                        title={`${m.description}\n${m.contextWindow}`}
                        style={{
                            flex: 1, padding: '6px 4px', border: '1px solid',
                            borderColor: selectedModel === m.id ? m.color : '#E0E0E0',
                            background: selectedModel === m.id ? `${m.color}15` : '#FAFAFA',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: selectedModel === m.id ? m.color : '#888' }}>{m.provider}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#333', marginTop: 1 }}>{m.name.replace('Claude ', '').replace('Gemini ', '').replace('GPT-', '')}</div>
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>Ask anything about your research data</div>
                        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>
                            {context.articleCount || 0} articles from {context.sourceCount || 0} sources.
                            {skillManifest.length > 0 && ` ${skillManifest.filter(s => s.category === 'research-deliverable').length} consulting skills loaded.`}
                        </div>
                    </div>
                )}

                {showSuggestions && messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B8B800' }}>Suggested</div>
                        {SUGGESTED_QUERIES.slice(0, maximized ? 10 : 5).map((q, i) => (
                            <button key={i} onClick={() => handleSend(q)} style={{
                                textAlign: 'left', padding: '8px 10px', background: '#FAFAFA',
                                border: '1px solid #E8E8E8', cursor: 'pointer', fontSize: 10, color: '#444', lineHeight: 1.4,
                            }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#B8B800'; }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E8E8E8'; }}
                            >{q}</button>
                        ))}
                    </div>
                )}

                {messages.map(msg => {
                    // Find deliverables/slides associated with this message
                    const msgDels = deliverables.filter(d => d.model === msg.model && Math.abs(d.timestamp - msg.timestamp) < 5000);
                    const msgSlides = slides.filter(s => s.model === msg.model && Math.abs(s.timestamp - msg.timestamp) < 5000);
                    const hasCards = msgDels.length > 0 || msgSlides.length > 0;

                    return (
                        <div key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.role === 'user' ? '80%' : '100%' }}>
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                                    <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#888' }}>
                                        {AVAILABLE_MODELS.find(m => m.id === msg.model)?.name || msg.model}
                                    </span>
                                    {msg.skillUsed && <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#00B7C3', background: '#E8F6F7', padding: '1px 5px' }}>{msg.skillUsed}</span>}
                                    {msg.durationMs && <span style={{ fontSize: 8, color: '#BBB' }}>{(msg.durationMs / 1000).toFixed(1)}s</span>}
                                </div>
                            )}
                            <div style={{
                                padding: '8px 12px',
                                background: msg.role === 'user' ? '#0D0D0D' : '#F5F5F0',
                                color: msg.role === 'user' ? '#FFFFFF' : '#333',
                                fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                borderLeft: msg.role === 'assistant' ? `3px solid ${AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#888'}` : 'none',
                            }}>
                                {msg.role === 'assistant' ? (() => {
                                    const cleaned = cleanResponseText(msg.content, hasCards);
                                    if (!cleaned) return null;
                                    // Parse NXT visual blocks
                                    const nxtSegments = parseNxtBlocks(cleaned);
                                    return nxtSegments.map((seg, si) => {
                                        if (seg.type === 'nxt-block' && seg.block) {
                                            return <div key={si} style={{ margin: '8px 0' }}><NxtBlockRenderer block={seg.block} /></div>;
                                        }
                                        // Plain text with citation parsing
                                        const { segments: cits } = parseChatCitations(seg.content, (getContext ? getContext() : context).sourceReferences);
                                        return (
                                            <span key={si}>{cits.map((c, ci) => {
                                                if (c.type === 'citation') {
                                                    return c.url ? (
                                                        <a key={ci} href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#115054', background: '#E8F4F5', padding: '1px 5px', textDecoration: 'none', fontSize: 10, fontWeight: 600, borderBottom: '1px solid #00B7C3' }}>
                                                            {c.sourceName}: "{c.title?.substring(0, 40)}{(c.title?.length || 0) > 40 ? '...' : ''}"
                                                        </a>
                                                    ) : (
                                                        <span key={ci} style={{ color: '#115054', background: '#F0F0E8', padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>
                                                            {c.sourceName}: "{c.title?.substring(0, 40)}{(c.title?.length || 0) > 40 ? '...' : ''}"
                                                        </span>
                                                    );
                                                }
                                                return <span key={ci}>{c.content}</span>;
                                            })}</span>
                                        );
                                    });
                                })() : msg.content}
                                {/* Inline image */}
                                {msg.imageData && (
                                    <div style={{ marginTop: 8, border: '1px solid #E0E0E0' }}>
                                        <img src={msg.imageData} alt="Generated" style={{ width: '100%', display: 'block' }} />
                                        <div style={{ padding: '4px 8px', fontSize: 8, color: '#999', background: '#F5F5F0' }}>Generated via Imagen 4</div>
                                    </div>
                                )}
                            </div>

                            {/* Deliverable cards */}
                            {msg.role === 'assistant' && msgDels.length > 0 && (() => {
                                const byType = new Map<DeliverableType, DeliverableItem[]>();
                                for (const d of msgDels) { const l = byType.get(d.type) || []; l.push(d); byType.set(d.type, l); }
                                return Array.from(byType.entries()).map(([type, items]) => (
                                    <DeliverableBatch key={`batch-${type}-${msg.id}`} items={items}
                                        onApprove={handleApproveDeliverable} onReject={handleRejectDeliverable}
                                        onApproveAll={(items) => items.forEach(handleApproveDeliverable)} />
                                ));
                            })()}

                            {/* Slide canvases */}
                            {msg.role === 'assistant' && msgSlides.map(slide => (
                                <div key={slide.id} id={`slide-capture-${slide.id}`}>
                                    <SlideCanvas slide={slide}
                                        onApprove={s => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, status: 'approved' as const } : x))}
                                        onReject={s => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, status: 'rejected' as const } : x))}
                                        isGeneratingVisual={generatingVisualId === slide.id}
                                        onGenerateVisual={async (s, prompt) => {
                                            setGeneratingVisualId(s.id);
                                            setSlides(prev => prev.map(x => x.id === s.id ? { ...x, imagePrompt: prompt } : x));
                                            try {
                                                const { generateImage } = await import('../services/geminiService');
                                                const img = await generateImage(prompt, '16:9', undefined, true);
                                                if (img) setSlides(prev => prev.map(x => x.id === s.id ? { ...x, imageUrl: img, imagePrompt: prompt } : x));
                                            } catch (e) {
                                                console.warn('Visual generation failed:', e);
                                            }
                                            setGeneratingVisualId(null);
                                        }}
                                        onEditTitle={(s, t) => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, title: t } : x))}
                                    />
                                </div>
                            ))}
                            {/* Export Deck bar — appears once a message produced 2+ slides */}
                            {msg.role === 'assistant' && msgSlides.length >= 2 && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, padding: '8px 12px', background: '#FAFAFA', borderLeft: '3px solid #caca20', alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#666' }}>{msgSlides.length}-slide deck</span>
                                    <div style={{ flex: 1 }} />
                                    <button onClick={handleExportDeckPPTX} style={{ padding: '4px 12px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>Export Deck PPTX</button>
                                    <button onClick={handleExportDeckPDF} style={{ padding: '4px 12px', background: '#0D0D0D', color: '#FFF', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>Export Deck PDF</button>
                                </div>
                            )}

                            {/* Copy button */}
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                                        style={{ fontSize: 7, color: '#888', background: 'none', border: '1px solid #DDD', padding: '2px 6px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>Copy</button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {(isLoading || imageLoading) && (
                    <LoadingIndicator
                        mode={imageLoading ? 'image' : 'reasoning'}
                        modelName={modelConfig?.name || 'AI'}
                        accentColor={modelConfig?.color || '#B8B800'}
                    />
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #E8E8E8', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Ask about your research data..."
                        rows={2} style={{ flex: 1, padding: '8px 10px', border: '1px solid #E0E0E0', fontSize: 11, fontFamily: "'Archivo', sans-serif", resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                    <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} style={{
                        padding: '0 14px', background: isLoading ? '#CCC' : '#B8B800', color: '#0D0D0D', border: 'none',
                        fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: isLoading ? 'default' : 'pointer',
                    }}>Send</button>
                </div>
                <div style={{ fontSize: 8, color: '#AAA', marginTop: 4 }}>
                    Shift+Enter for new line | {modelConfig?.name} ({modelConfig?.contextWindow})
                    {skillManifest.length > 0 && ` | ${skillManifest.filter(s => s.category === 'research-deliverable').length} skills`}
                </div>
            </div>
        </div>
    );
};

export default CorpusChatPanel;
