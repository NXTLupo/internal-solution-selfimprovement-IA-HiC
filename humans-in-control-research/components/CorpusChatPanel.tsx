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
import DynamicPromptChips from './DynamicPromptChips';
// --- Design Desk artifact delivery (hashtag interception) ---
import { parseHashtags } from '../design-desk/services/hashtagParser';
import { useDesignDeskStore } from '../design-desk/store/designDeskStore';
import { loadDesignMd, type DesignTokens } from '../design-desk/services/designMdLoader';
import { generateArtifact } from '../design-desk/services/chatToArtifact';
import { generateFreeformArtifact } from '../design-desk/services/chatToFreeform';
import type { FreeformKind } from '../design-desk/schemas/freeformArtifact';
// --- Presentation Pipeline (#presentation #NXT/#NU narrative composer) ---
import { parsePresentationDirective } from '../services/hashtagParser';
import { compose as composeNarrative } from '../services/narrativeComposer';
import { createNarrativeComposerExecutor } from '../services/narrativeComposerExecutor';
import { SourceCoverage } from './SourceCoverage';

// Diagram kinds that go through the freeform-HTML pipeline (1920x1080 exemplar
// inheritance, iframe-isolated render). All other kinds remain on the legacy
// structured pipeline.
const FREEFORM_KINDS: ReadonlySet<FreeformKind> = new Set(['org', 'journey', 'arch', 'roadmap', 'blueprint']);
import { exportPdf, exportPng, exportPptx } from '../design-desk/services/artifactExporter';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { NxtDocViewer } from '../design-desk/components/NxtDocViewer';
import { FreeformViewer } from '../design-desk/components/FreeformViewer';
import { SlideSpecViewer } from '../design-desk/components/SlideSpecViewer';
import { OrgChartCanvas } from '../design-desk/components/OrgChartCanvas';
import type { PersonaArtifact } from '../design-desk/schemas/personaArtifact';
import type { JourneyArtifact } from '../design-desk/schemas/journeyArtifact';
import type { OrgChartArtifact } from '../design-desk/schemas/orgChartArtifact';

interface Props {
    context: ChatContext;
    getContext?: () => ChatContext;
    isOpen: boolean;
    onToggle: () => void;
    onDeliverableApproved?: (type: string, data: any) => void;
    /** Optional callback to switch the parent App into the Design Desk view.
     *  When provided, inline-rendered artifact previews show an "Open in Designer"
     *  button that activates the artifact and triggers this callback. */
    onOpenDesignDesk?: () => void;
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

/**
 * Inline renderer for a pre-made Design Desk artifact embedded in a chat
 * reply. Activated by the hashtag interception path in handleSend() when the
 * user types `#persona`, `#journey`, or `#org`. Pulls the artifact from the
 * Zustand store, loads DESIGN.md tokens once, and delegates rendering to the
 * existing viewer components at a capped height.
 */
/**
 * SlideProjection — renders an artifact inside an exact 16:9 NXT slide frame.
 * The frame itself (header + body + footer) is the rasterization target, so
 * PNG/PDF/PPTX exports come out un-stretched.
 */
const SlideProjection: React.FC<{
    artifact: any;
    artifactType: 'persona' | 'journey' | 'org';
    tokens: DesignTokens;
    title: string;
    subtitle?: string;
    primary: string;
    accent: string;
    slideW: number;
    slideH: number;
    onOpenDesignDesk?: () => void;
    onClosePanel?: () => void;
    onActivate?: () => void;
}> = ({ artifact, artifactType, tokens, title, subtitle, primary, accent, slideW, slideH, onOpenDesignDesk, onClosePanel, onActivate }) => {
    const slideRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'pptx'>(null);

    /**
     * Capture the live SlideProjection DOM at native 1920x1080 (upscaling from
     * the 800x450 preview via pixelRatio: 2.4) so the exported file matches
     * exactly what the user sees in the chat. The previous path used
     * artifactExporter.ts which renders a fresh off-screen NxtDocViewer — that
     * doc is centered at maxWidth 960px and produced massive whitespace + a
     * redundant title bar in the export. Capturing the slide's actual rendered
     * frame fixes both problems.
     *
     * For PPTX: the captured image is the background; a DOM walk of the same
     * slideRef extracts text nodes with their bounding boxes, font, and color
     * to overlay as native PowerPoint text frames (editable, searchable).
     */
    const NATIVE_W = 1920;
    const NATIVE_H = 1080;
    const PDF_W_IN = 13.333;
    const PDF_H_IN = 7.5;

    const captureSlideAsPng = async (): Promise<string> => {
        const node = slideRef.current;
        if (!node) throw new Error('Slide DOM not mounted yet');
        // Wait for fonts so the captured raster uses the correct typography
        try { await (document as any).fonts?.ready; } catch { /* non-fatal */ }
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const ratio = NATIVE_W / slideW;   // 1920 / 800 = 2.4
        return toPng(node, {
            width: slideW,
            height: slideH,
            canvasWidth: NATIVE_W,
            canvasHeight: NATIVE_H,
            pixelRatio: ratio,
            backgroundColor: '#FFFFFF',
            cacheBust: true,
            skipFonts: true,
            filter: (n: Node) => {
                if (n instanceof HTMLLinkElement && n.rel === 'stylesheet') return false;
                return true;
            },
        });
    };

    interface TextRunSpec {
        text: string;
        rect: { x: number; y: number; w: number; h: number };
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        color: string;
        align: 'left' | 'center' | 'right';
    }

    const rgbToHex = (s: string): string => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return '000000';
        return [+m[1], +m[2], +m[3]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    const pxToPt = (px: number): number => Math.round(px * 0.75 * 100) / 100;

    const collectTextRuns = (): TextRunSpec[] => {
        const node = slideRef.current;
        if (!node) return [];
        const slideRect = node.getBoundingClientRect();
        const out: TextRunSpec[] = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
            const text = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            const parent = n.parentElement;
            if (!parent) continue;
            if (['STYLE', 'SCRIPT', 'NOSCRIPT'].includes(parent.tagName)) continue;
            const range = document.createRange();
            range.selectNode(n);
            const rect = range.getBoundingClientRect();
            // px in preview coords, scale to native 1920x1080
            if (rect.width < 8 || rect.height < 6) continue;
            const cs = window.getComputedStyle(parent);
            if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') < 0.05) continue;
            const fontSize = parseFloat(cs.fontSize) || 14;
            const fontWeight = parseInt(cs.fontWeight, 10) || 400;
            const align = (cs.textAlign === 'center' || cs.textAlign === 'right') ? cs.textAlign as 'center' | 'right' : 'left';
            const scale = NATIVE_W / slideW;
            out.push({
                text,
                rect: {
                    x: (rect.x - slideRect.x) * scale,
                    y: (rect.y - slideRect.y) * scale,
                    w: rect.width * scale,
                    h: rect.height * scale,
                },
                fontFamily: (cs.fontFamily || 'Archivo').split(',')[0].replace(/['"]/g, '').trim(),
                fontSize: fontSize * scale,
                fontWeight: isNaN(fontWeight) ? 400 : fontWeight,
                color: cs.color || 'rgb(0,0,0)',
                align,
            });
        }
        return out;
    };

    const runExport = async (fmt: 'pdf' | 'png' | 'pptx') => {
        setBusy(fmt);
        try {
            if (fmt === 'png') {
                const dataUrl = await captureSlideAsPng();
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `${artifactType}-${(artifact as any).id ?? Date.now()}.png`;
                a.click();
                return;
            }
            if (fmt === 'pdf') {
                const dataUrl = await captureSlideAsPng();
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [PDF_W_IN, PDF_H_IN] });
                pdf.addImage(dataUrl, 'PNG', 0, 0, PDF_W_IN, PDF_H_IN);
                pdf.save(`${artifactType}-${(artifact as any).id ?? Date.now()}.pdf`);
                return;
            }
            // PPTX: image background + vector-text overlay
            const dataUrl = await captureSlideAsPng();
            const runs = collectTextRuns();
            const { default: PptxGenJS } = await import('pptxgenjs');
            const pptx = new PptxGenJS();
            pptx.defineLayout({ name: 'NXT_16x9', width: PDF_W_IN, height: PDF_H_IN });
            pptx.layout = 'NXT_16x9';
            const s = pptx.addSlide();
            s.addImage({ data: dataUrl, x: 0, y: 0, w: PDF_W_IN, h: PDF_H_IN });
            for (const r of runs) {
                s.addText(r.text, {
                    x: (r.rect.x / NATIVE_W) * PDF_W_IN,
                    y: (r.rect.y / NATIVE_H) * PDF_H_IN,
                    w: (r.rect.w / NATIVE_W) * PDF_W_IN,
                    h: (r.rect.h / NATIVE_H) * PDF_H_IN,
                    fontFace: r.fontFamily,
                    fontSize: pxToPt(r.fontSize),
                    color: rgbToHex(r.color),
                    bold: r.fontWeight >= 700,
                    align: r.align,
                    valign: 'top',
                    margin: 0,
                    fill: { type: 'none' as any },
                });
            }
            await pptx.writeFile({ fileName: `${artifactType}-${(artifact as any).id ?? Date.now()}.pptx` });
        } catch (e) {
            console.error(`[SlideProjection] ${fmt} export failed`, e);
            alert(`Export failed: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    };

    const handleOpen = () => {
        onActivate?.();
        onClosePanel?.();
        onOpenDesignDesk?.();
    };

    const headerH = 64;
    const footerH = 32;
    const bodyH = slideH - headerH - footerH;

    return (
        <div style={{ marginTop: 10 }}>
            {/* The slide itself — exactly 16:9, rasterized for export */}
            <div
                ref={slideRef}
                style={{
                    width: slideW,
                    height: slideH,
                    background: '#FFFFFF',
                    border: `1px solid ${primary}`,
                    boxSizing: 'border-box',
                    fontFamily: "'Archivo', sans-serif",
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header band */}
                <div style={{
                    height: headerH,
                    padding: '10px 18px 8px',
                    borderBottom: `4px solid ${accent}`,
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <div style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 2.5,
                        textTransform: 'uppercase', color: accent, marginBottom: 2,
                    }}>
                        #{artifactType} / {artifact.brand.toUpperCase()} — Slide
                    </div>
                    <div style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 18, lineHeight: 1.1, color: primary,
                        letterSpacing: '0.02em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {title}
                    </div>
                </div>
                {/* Body — artifact rendered to fill the remaining height */}
                <div style={{ flex: 1, height: bodyH, background: '#FFFFFF', overflow: 'hidden', position: 'relative' }}>
                    {artifactType === 'persona' && artifact.type === 'persona' && (
                        <div style={{ height: '100%', overflow: 'auto' }}>
                            <NxtDocViewer artifact={artifact as PersonaArtifact} tokens={tokens} />
                        </div>
                    )}
                    {artifactType === 'org' && artifact.type === 'org' && (
                        <OrgChartCanvas artifact={artifact as OrgChartArtifact} tokens={tokens} />
                    )}
                </div>
                {/* Footer band */}
                <div style={{
                    height: footerH,
                    padding: '0 18px',
                    background: primary,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: accent }}>
                        NXT Humans / Design Desk
                    </span>
                    {subtitle && (
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {subtitle.slice(0, 60)}
                        </span>
                    )}
                </div>
            </div>
            {/* Action bar (NOT part of the rasterized slide) */}
            <div style={{
                marginTop: 6,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 8,
                width: slideW,
            }}>
                {(['pdf', 'png', 'pptx'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => runExport(f)}
                        disabled={busy !== null}
                        style={{
                            padding: '4px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: '1px solid #0D0D0D', background: busy === f ? '#F0F0E8' : '#FFFFFF',
                            color: '#0D0D0D', cursor: busy === null ? 'pointer' : 'wait', borderRadius: 2,
                            fontFamily: "'Archivo', sans-serif",
                        }}
                    >
                        {busy === f ? '...' : `Export ${f.toUpperCase()}`}
                    </button>
                ))}
                {onOpenDesignDesk && (
                    <button
                        onClick={handleOpen}
                        style={{
                            padding: '4px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: `1px solid ${accent}`, background: '#FAFAF7',
                            color: '#0D0D0D', cursor: 'pointer', borderRadius: 2,
                            fontFamily: "'Archivo', sans-serif",
                        }}
                    >
                        Edit on Canvas
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * PresentationLaunchCard
 *
 * Renders an explicit "Launch" button + summary card for a completed
 * #presentation composition. Set on a ChatMessage via `presentationUrl`
 * by the handleSend hashtag interception path.
 *
 * The card itself is the deliverable surface — the URL is intentionally
 * NOT rendered as raw text in the message body. Click → window.open in
 * a separate tab; URL is also exposed for keyboard / right-click "copy
 * link address".
 */
const PresentationLaunchCard: React.FC<{
    url: string;
    meta?: ChatMessage['presentationMeta'];
}> = ({ url, meta }) => {
    const brand = meta?.brand || 'NXT';
    const accentColor = brand === 'NU' ? '#CC0000' : '#B8B800';
    const handleLaunch = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
        <div style={{
            marginTop: 10,
            border: `1px solid ${accentColor}`,
            background: '#FFFFFF',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                    Interactive Presentation · {brand}
                </div>
                {meta?.title && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta.title}
                    </div>
                )}
                {meta?.sectionCount !== undefined && (
                    <div style={{ fontSize: 9, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                        {meta.sectionCount} sections · {meta.citationCount ?? 0} citations
                        {meta.sourceCount && ` · ${meta.sourceCount.total} sources`}
                    </div>
                )}
            </div>
            <button
                onClick={handleLaunch}
                style={{
                    padding: '10px 18px',
                    background: accentColor,
                    color: brand === 'NU' ? '#FFFFFF' : '#0D0D0D',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
                aria-label="Launch presentation in new window"
            >
                Launch ↗
            </button>
        </div>
    );
};

const InlineArtifactPreview: React.FC<{
    artifactId: string;
    artifactType: 'persona' | 'journey' | 'org';
    asSlide?: boolean;
    onOpenDesignDesk?: () => void;
    onClosePanel?: () => void;
}> = ({ artifactId, artifactType, asSlide, onOpenDesignDesk, onClosePanel }) => {
    const artifact = useDesignDeskStore(s => s.artifacts.find(a => a.id === artifactId));
    const setActiveArtifact = useDesignDeskStore(s => s.setActiveArtifact);
    const [tokens, setTokens] = useState<DesignTokens | null>(null);

    useEffect(() => {
        loadDesignMd('/DESIGN.md').then(r => setTokens(r.tokens)).catch(() => {});
    }, []);

    if (!artifact) {
        // Pull current ids via getState() (NOT a hook with array selector — array
        // selectors return a new reference each render and create an infinite loop
        // because Zustand's default equality is Object.is).
        const ids = useDesignDeskStore.getState().artifacts.map(a => a.id);
        console.warn(`[InlineArtifactPreview] Artifact NOT FOUND. Looking for id=${artifactId} (type=${artifactType}). Store currently has ${ids.length} ids:`, ids);
        return <div style={{ padding: 12, color: '#CC6644', fontSize: 12 }}>Artifact no longer in store (id={artifactId}).</div>;
    }
    if (!tokens) return <div style={{ padding: 12, color: '#888', fontSize: 12 }}>Loading design tokens...</div>;

    const palette = (tokens.brands[artifact.brand] ?? {}) as Record<string, string>;
    const primary = palette.primary ?? '#0D0D0D';
    const accent = palette.accent ?? '#B8B800';

    const handleOpen = () => {
        setActiveArtifact(artifact.id);
        onClosePanel?.();
        onOpenDesignDesk?.();
    };

    // Freeform-HTML artifacts (org/journey/arch/roadmap/blueprint) carry their own
    // 1920x1080 slide chrome inside the exemplar HTML. Render via FreeformViewer
    // at the chat preview size (800x450 → scaled iframe) without external slide
    // chrome, otherwise the slide would be wrapped in another slide.
    if ((artifact as any).type === 'freeform') {
        return (
            <div style={{ marginTop: 10, border: `1px solid ${primary}`, background: '#1A1A1A' }}>
                <div style={{ width: 800, height: 450, position: 'relative' }}>
                    <FreeformViewer artifact={artifact as any} />
                </div>
                <div style={{ padding: '6px 10px', borderTop: `1px solid ${primary}`, background: '#0D0D0D', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>
                        #{(artifact as any).kind} / {artifact.brand.toUpperCase()} {asSlide ? '— Slide' : ''}
                    </span>
                    <ArtifactExportButtons artifact={artifact as any} onOpenDesignDesk={onOpenDesignDesk} handleOpen={handleOpen} />
                </div>
            </div>
        );
    }

    // SlideSpec artifacts — typed JSON rendered via SlideSpecViewer.
    // Native PPTX export (no DOM walking, no repair dialog).
    if ((artifact as any).type === 'slide') {
        const slideArt = artifact as any;
        return (
            <div style={{ marginTop: 10, border: `1px solid ${primary}`, background: '#1A1A1A' }}>
                <div style={{ width: 800, height: 450, position: 'relative' }}>
                    <SlideSpecViewer
                        spec={slideArt.spec}
                        brand={slideArt.brand}
                        artifactId={slideArt.id}
                        artifactKind={slideArt.kind}
                    />
                </div>
                <div style={{ padding: '6px 10px', borderTop: `1px solid ${primary}`, background: '#0D0D0D', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>
                        #{slideArt.kind} / {slideArt.brand.toUpperCase()} — SlideSpec
                    </span>
                    <ArtifactExportButtons artifact={artifact as any} onOpenDesignDesk={onOpenDesignDesk} handleOpen={handleOpen} />
                </div>
            </div>
        );
    }

    // Slide projection: exact 16:9 NXT slide frame so PPTX/PDF exports come out
    // un-distorted. The container itself is 16:9 (800x450); header + footer are
    // overlay bands so the rasterized slide is the full 16:9 surface.
    if (asSlide) {
        const title = (artifact as any).title ?? (artifact as any).name ?? 'Untitled';
        const subtitle = artifactType === 'persona'
            ? (artifact as any).role
            : `${artifact.brand.toUpperCase()} / #${artifactType}`;
        const slideW = 800;
        const slideH = 450; // 16:9
        return (
            <SlideProjection
                artifact={artifact}
                artifactType={artifactType}
                tokens={tokens}
                title={title}
                subtitle={subtitle}
                primary={primary}
                accent={accent}
                slideW={slideW}
                slideH={slideH}
                onOpenDesignDesk={onOpenDesignDesk}
                onClosePanel={onClosePanel}
                onActivate={() => setActiveArtifact(artifact.id)}
            />
        );
    }

    // Default (artifact-only) preview
    return (
        <div style={{
            marginTop: 10,
            border: '1px solid #E0E0E0',
            background: '#FFFFFF',
            overflow: 'hidden',
        }}>
            <div style={{ height: 420, overflow: 'auto', background: '#FFFFFF' }}>
                {artifactType === 'persona' && artifact.type === 'persona' && (
                    <NxtDocViewer artifact={artifact as PersonaArtifact} tokens={tokens} />
                )}
                {artifactType === 'org' && artifact.type === 'org' && (
                    <OrgChartCanvas artifact={artifact as OrgChartArtifact} tokens={tokens} />
                )}
            </div>
            <div style={{ padding: '6px 10px', borderTop: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#888', fontFamily: "'JetBrains Mono', monospace" }}>
                    #{artifactType} / {artifact.brand.toUpperCase()}
                </span>
                {onOpenDesignDesk && (
                    <button
                        onClick={handleOpen}
                        style={{
                            padding: '4px 10px', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            border: '1px solid #B8B800', background: '#FFFFFF',
                            color: '#0D0D0D', cursor: 'pointer', borderRadius: 2,
                            fontFamily: "'Archivo', sans-serif",
                        }}
                    >
                        Open in Designer
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Inline export action bar shared by the freeform preview and the legacy
 * persona/journey/org preview in the Analyst Desk AI Chat. Lives next to
 * "Open in Designer" so the user can export PDF/PNG/PPTX without leaving the
 * chat. The artifactExporter routes freeform artifacts through their own
 * iframe-capture path; non-freeform artifacts use the existing NxtDocViewer /
 * canvas-based exporters.
 */
const ArtifactExportButtons: React.FC<{
    artifact: any;
    onOpenDesignDesk?: () => void;
    handleOpen: () => void;
    variant?: 'dark' | 'light';
}> = ({ artifact, onOpenDesignDesk, handleOpen, variant = 'dark' }) => {
    const [busy, setBusy] = useState<null | 'png' | 'pdf' | 'pptx'>(null);
    const isLight = variant === 'light';

    const run = async (kind: 'png' | 'pdf' | 'pptx') => {
        if (busy) return;
        setBusy(kind);
        try {
            if (kind === 'png') await exportPng(artifact);
            else if (kind === 'pdf') await exportPdf(artifact);
            else await exportPptx(artifact);
        } catch (e: any) {
            console.error(`[InlineExport] ${kind} failed:`, e);
            alert(`${kind.toUpperCase()} export failed: ${e?.message ?? e}`);
        } finally {
            setBusy(null);
        }
    };

    const btnBase: React.CSSProperties = {
        padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
        textTransform: 'uppercase', cursor: busy ? 'wait' : 'pointer', borderRadius: 2,
        fontFamily: "'Archivo', sans-serif", border: '1px solid',
        background: isLight ? '#FFFFFF' : 'transparent',
        color: isLight ? '#0D0D0D' : '#FFFFFF',
        borderColor: isLight ? '#B8B800' : '#555',
    };

    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => run('pdf')} disabled={!!busy} style={btnBase}>
                {busy === 'pdf' ? 'PDF…' : 'Export PDF'}
            </button>
            <button onClick={() => run('png')} disabled={!!busy} style={btnBase}>
                {busy === 'png' ? 'PNG…' : 'Export PNG'}
            </button>
            <button onClick={() => run('pptx')} disabled={!!busy} style={btnBase}>
                {busy === 'pptx' ? 'PPTX…' : 'Export PPTX'}
            </button>
            {onOpenDesignDesk && (
                <button
                    onClick={handleOpen}
                    style={{ ...btnBase, background: isLight ? '#FFFFFF' : '#FFFFFF', color: '#0D0D0D', borderColor: '#B8B800' }}
                >
                    Open in Designer
                </button>
            )}
        </div>
    );
};

// 2026-04-21 — SUGGESTED_QUERIES (static list) was retired. The welcome
// screen and the above-input guidance strip now both source their
// suggestions from DynamicPromptChips which calls suggestPrompts() —
// state-aware on uploaded docs / live sources / knowledge graph themes.
// See services/dynamicPromptSuggestions.ts.

export const CorpusChatPanel: React.FC<Props> = ({ context, getContext, isOpen, onToggle, onDeliverableApproved, onOpenDesignDesk }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-2.5-flash');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [maximized, setMaximized] = useState(false);
    const [coverageOpen, setCoverageOpen] = useState(false);
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

        // --- #presentation interception (narrative composer) -----------------
        // Takes priority over all other hashtag dispatch. When the user types
        // "#presentation #NXT" or "#presentation #NU" anywhere in their message,
        // we route to the narrative composer (Opus 4.7 by default, GPT-5.5
        // alternate) which assembles a PresentationPayload, persists it via
        // POST /api/presentations, and posts the link back into this chat.
        const presDirective = parsePresentationDirective(query);
        if (presDirective.triggered) {
            const composingMsgId = `msg_${Date.now()}_composing`;
            const toolCallLog: string[] = [];
            // Initial "composing..." status message — updated as tool calls land
            setMessages(prev => [...prev, {
                id: composingMsgId,
                role: 'assistant',
                content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})…`,
                timestamp: Date.now(),
            }]);

            try {
                const liveCtx = getContext ? getContext() : context;

                // Map current chat context to the executor's session state shape
                const executor = createNarrativeComposerExecutor({
                    engagementGoal: liveCtx?.researchGoal || '',
                    themes: (liveCtx?.themes as any[]) || [],
                    personas: (liveCtx?.personas as any[]) || [],
                    deliverables: {
                        journey_map: liveCtx?.journeyStages,
                        recommendations: liveCtx?.recommendations,
                        roadmap: (liveCtx as any)?.roadmap,
                        gap_analysis: (liveCtx as any)?.gapAnalysis,
                        tech_arch: (liveCtx as any)?.techArchitecture,
                        tech_audit: (liveCtx as any)?.techAudit,
                        competitive: (liveCtx as any)?.competitiveAnalysis,
                        prd: (liveCtx as any)?.prd,
                        strategic_report: (liveCtx as any)?.strategicReport,
                    },
                });

                // Engagement context for the system prompt
                const externalCount = (liveCtx?.liveSourceResults || [])
                    .reduce((s: number, r: any) => s + (r.items?.length || 0), 0);
                const uploadedCount = (liveCtx?.uploadedFiles || []).length;
                const deliverableList: string[] = [];
                if (liveCtx?.themes) deliverableList.push(`themes (${(liveCtx.themes as any[]).length})`);
                if (liveCtx?.personas) deliverableList.push(`personas (${(liveCtx.personas as any[]).length})`);
                if (liveCtx?.journeyStages) deliverableList.push('journey-map');
                if ((liveCtx as any)?.recommendations) deliverableList.push('recommendations');
                if ((liveCtx as any)?.roadmap) deliverableList.push('roadmap');
                if ((liveCtx as any)?.gapAnalysis) deliverableList.push('gap-analysis');
                if ((liveCtx as any)?.techArchitecture) deliverableList.push('tech-arch');
                if ((liveCtx as any)?.competitiveAnalysis) deliverableList.push('competitive');

                // Pass the recent chat history as PRIMARY source material.
                // The composer treats it as the authoritative narrative the user
                // already developed in conversation — packaging it instead of
                // re-researching from scratch. Cap at last 12 turns (excluding
                // the just-sent #presentation message which is the directive).
                const recentChat = messages
                    .filter(m => m.role !== 'system')
                    .slice(-12)
                    .map(m => ({
                        role: m.role as 'user' | 'assistant' | 'system',
                        content: m.content || '',
                    }));

                // Diagnostic: log mode detection client-side so the user
                // can see in the chat whether package mode is triggering.
                // Threshold mirrors computePackageMode in narrativeComposer.ts.
                const assistantMsgs = recentChat.filter(m => m.role === 'assistant');
                const assistantChars = assistantMsgs.reduce((s, m) => s + (m.content || '').length, 0);
                const detectedMode = assistantMsgs.length >= 1 && assistantChars >= 1500
                    ? 'PACKAGE'
                    : 'RESEARCH';
                toolCallLog.push(
                    `Mode: ${detectedMode} (${recentChat.length} prior turns, ` +
                    `${assistantMsgs.length} analyst replies, ${assistantChars} chars)`
                );
                // Surface the corpus composition that the chat was built on,
                // so the user can SEE whether external content (RSS, jina-reader,
                // YouTube, Reddit, OpenAlex) is making it into the model's
                // recall — not just uploads. Set in App.tsx's data-collection
                // step on window.__hicCorpusComposition.
                try {
                    const comp = (window as any).__hicCorpusComposition;
                    if (comp && typeof comp === 'object') {
                        const total = Math.max(1, comp.totalKB || 0);
                        const upPct = Math.round((comp.uploadedKB || 0) / total * 100);
                        const exPct = Math.round((comp.proxyKB || 0) / total * 100);
                        const intPct = Math.round((comp.coreCorpusKB || 0) / total * 100);
                        toolCallLog.push(
                            `Corpus: ${comp.totalKB}KB total · uploads ${comp.uploadedKB}KB (${upPct}%) · ` +
                            `external RSS/jina/YouTube/Reddit/OpenAlex ${comp.proxyKB}KB (${exPct}%) · ` +
                            `internal/wiki ${comp.coreCorpusKB}KB (${intPct}%)`
                        );
                    }
                } catch { /* noop — diagnostic only */ }

                // Surface category coverage — the user toggled N categories;
                // M had content; (N-M) are CATEGORY GAPS the model must mark.
                try {
                    const cats = (liveCtx as any)?.activeCategories || [];
                    if (Array.isArray(cats) && cats.length > 0) {
                        const withContent = cats.filter((c: any) => (c?.itemCount || 0) > 0).length;
                        const empty = cats.length - withContent;
                        toolCallLog.push(
                            `Categories: ${cats.length} toggled, ${withContent} have content, ${empty} CATEGORY GAPS — ` +
                            `every category MUST be cited or marked gap by the model`
                        );
                    }
                } catch { /* noop */ }
                setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                    ...m,
                    content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})…\n\n${toolCallLog.join('\n')}`,
                } : m));

                const composeResult = await composeNarrative({
                    narrativeRequest: presDirective.narrativeRequest,
                    brand: presDirective.brand,
                    theme: presDirective.theme,
                    model: presDirective.model,
                    heroOverride: presDirective.heroOverride,
                    sectionFilter: presDirective.sectionFilter,
                    engagementContext: {
                        engagementGoal: liveCtx?.researchGoal || '',
                        themeCount: (liveCtx?.themes as any[] || []).length,
                        personaCount: (liveCtx?.personas as any[] || []).length,
                        deliverableList,
                        externalArticleCount: externalCount,
                        uploadedDocCount: uploadedCount,
                    },
                    priorConversation: recentChat,
                    executor,
                    onToolCall: (tool, _args, summary) => {
                        const summarySuffix = summary ? ` → ${summary}` : '';
                        toolCallLog.push(`◯ ${tool}${summarySuffix}`);
                        // Live-update the composing message with the running tool log
                        setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                            ...m,
                            content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})…\n\n${toolCallLog.slice(-12).join('\n')}`,
                        } : m));
                    },
                });

                // Persist payload via proxy
                const persistRes = await fetch('http://localhost:5012/api/presentations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(composeResult.payload),
                });
                if (!persistRes.ok) {
                    const errText = await persistRes.text().catch(() => '');
                    throw new Error(`persist failed (${persistRes.status}): ${errText.slice(0, 200)}`);
                }
                const persistData = await persistRes.json();

                // Replace the composing message with a final result. The button is
                // rendered explicitly by the message renderer when `presentationUrl`
                // is set on the message (see the "Launch presentation" card below).
                const stats = composeResult.payload.meta.sourceCount;
                const sectionCount = composeResult.payload.sections.length;
                const finalContent = [
                    `Built your interactive presentation on "${composeResult.payload.meta.title}".`,
                    ``,
                    `${sectionCount} sections · ${composeResult.payload.meta.citationCount} citations across ${stats.total} sources (${stats.external} external research, ${stats.uploaded} from your uploads, ${stats.analysis} from prior analysis).`,
                    ``,
                    `Composed in ${(composeResult.durationMs / 1000).toFixed(1)}s with ${composeResult.toolCallCount} tool calls.`,
                ].join('\n');

                setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                    ...m,
                    content: finalContent,
                    presentationUrl: persistData.url,
                    presentationMeta: {
                        title: composeResult.payload.meta.title,
                        brand: composeResult.payload.meta.brand,
                        sectionCount,
                        citationCount: composeResult.payload.meta.citationCount,
                        sourceCount: stats,
                    },
                } : m));
            } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                    ...m,
                    content: `Could not compose presentation: ${errMsg}\n\n` +
                             `Tool calls completed: ${toolCallLog.length}`,
                } : m));
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // --- Design Desk artifact delivery interception ---
        // If the message contains ONLY content hashtags in {persona, journey, org},
        // short-circuit the LLM call and deliver the matching pre-made artifact
        // from useDesignDeskStore. Other hashtags (#slide, #gap, #strategy, etc.)
        // continue to sendChatMessage unchanged.
        const parsed = parseHashtags(query);
        // Persona is INTENTIONALLY EXCLUDED from this routing — user explicitly
        // wants persona slides to render through the original AI chat path
        // (SlideCanvas + persona-card template + Export Deck PPTX/PDF), exactly
        // as they did before the Design Desk integration. The 5 diagram kinds
        // (org, journey, arch, roadmap, blueprint) route through the freeform-HTML
        // pipeline so they inherit the user's NU/NXT exemplar treatment.
        const DELIVERABLE_TAGS = ['journey', 'org', 'arch', 'roadmap', 'blueprint'] as const;
        const LABEL_MAP: Record<string, string> = {
            journey: 'JOURNEY_MAP',
            org: 'ORG_CHART',
            arch: 'ARCHITECTURE',
            roadmap: 'ROADMAP',
            blueprint: 'SERVICE_BLUEPRINT',
        };
        const allDeliverable = parsed.content.length > 0 &&
            parsed.content.every(c => (DELIVERABLE_TAGS as readonly string[]).includes(c));

        if (allDeliverable) {
            const artifacts = useDesignDeskStore.getState().artifacts;
            const brand = parsed.brand; // 'nxt' | 'nu'
            const deliveryMessages: ChatMessage[] = [];

            // Lazy-load DESIGN.md once per send (no-op if already cached at the module level via loadDesignMd's fetch cache).
            let designMdRaw = '';
            try {
                const dm = await loadDesignMd('/DESIGN.md');
                designMdRaw = dm.rawMarkdown;
            } catch { /* design md optional; generators will run with empty grounding if needed */ }

            const liveCtx = getContext ? getContext() : context;
            // Combine ALL evidence the chat has access to, not just the search-source corpus.
            // Uploaded file contents (client PDFs/docs) often hold the names and reporting-line
            // detail the model needs for deliverables like #org. Building the combined text
            // here ensures the generator sees everything the chat itself sees.
            const combinedCorpusParts: string[] = [];
            if (liveCtx?.uploadedFileContents && typeof liveCtx.uploadedFileContents === 'string' && liveCtx.uploadedFileContents.length > 40) {
                combinedCorpusParts.push('=== CLIENT UPLOADS ===\n' + liveCtx.uploadedFileContents);
            }
            if (liveCtx?.corpusText) {
                combinedCorpusParts.push('=== EXTERNAL RESEARCH CORPUS ===\n' + liveCtx.corpusText);
            }
            // Themes / personas / journey context — surface any structured intelligence the
            // synthesis pipeline already produced so on-demand generation can reuse it.
            if (liveCtx?.themes) combinedCorpusParts.push('=== THEMES ===\n' + JSON.stringify(liveCtx.themes).slice(0, 30000));
            if (liveCtx?.personas) combinedCorpusParts.push('=== PERSONAS ===\n' + JSON.stringify(liveCtx.personas).slice(0, 30000));
            if (liveCtx?.journeyStages) combinedCorpusParts.push('=== JOURNEY ===\n' + JSON.stringify(liveCtx.journeyStages).slice(0, 30000));
            const corpusText = combinedCorpusParts.join('\n\n');

            // Honor #slide / #slides view modifier. When present, every delivered
            // artifact in this turn is rendered inside a 16:9 NXT slide frame.
            const asSlide = parsed.view === 'slide' || parsed.composition === 'slides';
            const slideTag = asSlide ? ' #slide' : '';

            // Pre-made artifact lookup is ONLY appropriate when the user typed a bare
            // hashtag request with no qualifying context (e.g., "#persona #NU"). The
            // moment the user adds prompt text — a source filter, a topic narrowing,
            // a "from chronicle_higher_ed not from northeasterndocs", or anything else —
            // we MUST re-generate so the new context shapes the artifact. Otherwise the
            // chat silently serves a stale cached artifact that ignores the new ask.
            const userHasSpecificContext = !!parsed.cleanPrompt && parsed.cleanPrompt.trim().length >= 4;

            for (const tag of parsed.content) {
                // 1) Check for pre-made matching artifact. Prefer brand match; fall back to any brand.
                //    Only short-circuit to the cached artifact when the request is a BARE hashtag
                //    delivery — any prompt text means the user wants a fresh generation against
                //    that prompt + the current corpus.
                const matches = artifacts.filter(a => a.type === tag);
                const brandMatch = matches.filter(a => a.brand === brand);
                const picked = !userHasSpecificContext
                    ? (brandMatch.length > 0 ? brandMatch : matches).slice(-1)[0]
                    : undefined;

                if (picked) {
                    const label = (picked as any).title ?? (picked as any).name ?? 'Untitled';
                    deliveryMessages.push({
                        id: `msg_${Date.now()}_${tag}`,
                        role: 'assistant',
                        content: asSlide
                            ? `Delivering your pre-made #${tag}${slideTag} as a slide: "${label}".`
                            : `Delivering your pre-made #${tag} artifact: "${label}". Open the Design Desk to edit it on the canvas.`,
                        timestamp: Date.now(),
                        deliveredArtifactId: picked.id,
                        deliveredArtifactType: tag as 'persona' | 'journey' | 'org',
                        deliveredAsSlide: asSlide,
                    });
                    useDesignDeskStore.getState().setActiveArtifact(picked.id);
                } else {
                    // 2) No pre-made artifact → generate on demand inline.
                    //    Diagram kinds (org, journey, arch, roadmap, blueprint) go through
                    //    the freeform-HTML pipeline using the user's NU/NXT exemplars.
                    //    Persona stays on the legacy structured pipeline.
                    if (FREEFORM_KINDS.has(tag as FreeformKind)) {
                        const ff = await generateFreeformArtifact({
                            kind: tag as FreeformKind,
                            brand,
                            userPrompt: parsed.cleanPrompt || query,
                            corpus: corpusText,
                            currentArtifact: null,
                            model: selectedModel as any,
                        });
                        if (ff.ok) {
                            useDesignDeskStore.getState().addArtifact(ff.artifact);
                            useDesignDeskStore.getState().setActiveArtifact(ff.artifact.id);
                            const _afterAdd = useDesignDeskStore.getState();
                            console.info(`[Freeform/store] added ${(ff.artifact as any).kind}/${ff.artifact.brand} id=${ff.artifact.id}. Store now has ${_afterAdd.artifacts.length} artifacts. Found by id?`,
                                _afterAdd.artifacts.find(a => a.id === ff.artifact.id) ? 'YES' : 'NO',
                                'Active id:', _afterAdd.activeArtifactId);
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_gen`,
                                role: 'assistant',
                                content: asSlide
                                    ? `Generated #${tag}${slideTag} via ${ff.modelUsed}: "${ff.artifact.title}". Rendered as a 1920x1080 slide below using the ${brand.toUpperCase()} exemplar.`
                                    : `Generated #${tag} via ${ff.modelUsed}: "${ff.artifact.title}". Rendered below. Open the Design Desk to edit it on the canvas.`,
                                model: ff.modelUsed,
                                timestamp: Date.now(),
                                deliveredArtifactId: ff.artifact.id,
                                deliveredArtifactType: tag as any,
                                deliveredAsSlide: asSlide,
                            });
                        } else {
                            const ffErr = ff as { ok: false; error: string; rawResponse?: string; modelUsed?: any };
                            if (ffErr.rawResponse) console.warn(`[Freeform] ${tag} generation failed:`, ffErr.error, '\nRaw:', ffErr.rawResponse);
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_err`,
                                role: 'assistant',
                                content: `Freeform generation failed for #${tag}${ffErr.modelUsed ? ` via ${ffErr.modelUsed}` : ''}: ${ffErr.error}\n(See browser console for raw output.)`,
                                model: ffErr.modelUsed,
                                timestamp: Date.now(),
                            });
                        }
                        continue; // skip the legacy chatToArtifact path
                    }
                    // Legacy structured pipeline (persona only now)
                    const genResult = await generateArtifact({
                        content: tag,
                        brand,
                        userPrompt: parsed.cleanPrompt || query,
                        designMdRaw,
                        corpusText,
                        currentArtifact: null,
                        model: selectedModel as any, // user-selected chat model drives generation
                    });

                    if (genResult.ok) {
                        // Multi-artifact case: model emitted a JSON array (e.g., "generate 5 personas").
                        // chatToArtifact normalized + validated each — we just iterate and add all.
                        const all = (genResult as any).artifacts as any[] | undefined;
                        const list = (all && all.length > 0) ? all : [genResult.artifact];
                        list.forEach((created: any, idx: number) => {
                            useDesignDeskStore.getState().addArtifact(created);
                            // Last one becomes active so the canvas opens to it
                            if (idx === list.length - 1) useDesignDeskStore.getState().setActiveArtifact(created.id);
                            const label = created.title ?? created.name ?? 'Untitled';
                            const countLabel = list.length > 1 ? ` (${idx + 1} of ${list.length})` : '';
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_gen_${idx}`,
                                role: 'assistant',
                                content: asSlide
                                    ? `Generated #${tag}${slideTag}${countLabel} via ${genResult.modelUsed}: "${label}". Rendered as a slide below.`
                                    : `Generated #${tag}${countLabel} via ${genResult.modelUsed}: "${label}". Rendered below. Open the Design Desk to edit it on the canvas.`,
                                model: genResult.modelUsed,
                                timestamp: Date.now(),
                                deliveredArtifactId: created.id,
                                deliveredArtifactType: tag as 'persona' | 'journey' | 'org',
                                deliveredAsSlide: asSlide,
                            });
                        });
                    } else {
                        deliveryMessages.push({
                            id: `msg_${Date.now()}_${tag}_err`,
                            role: 'assistant',
                            content: `Generation failed for #${tag}${genResult.modelUsed ? ` via ${genResult.modelUsed}` : ''}: ${genResult.error}${genResult.rawResponse ? `\n\nModel output: ${genResult.rawResponse.slice(0, 200)}...` : ''}`,
                            model: genResult.modelUsed,
                            timestamp: Date.now(),
                        });
                    }
                }
            }

            setMessages(prev => [...prev, ...deliveryMessages]);
            setIsLoading(false);
            return;
        }

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
                    <button
                        onClick={() => setCoverageOpen(true)}
                        title="Show which source categories have content + which are being cited in the chat"
                        style={{ fontSize: 8, color: '#B8B800', background: 'none', border: '1px solid #B8B800', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                        Coverage
                    </button>
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

                {/* Welcome-state dynamic suggestions — replaces the former
                    static SUGGESTED_QUERIES list. Chip set reflects current
                    state: uploaded documents + research goal (pre-collection),
                    live source feed (mid-collection), or emerged themes/
                    personas (post-collection). Clicking a chip populates the
                    input (does not auto-send) so the researcher can tweak. */}
                {showSuggestions && messages.length === 0 && (() => {
                    // CRITICAL: the `context` prop is passed as {} by App.tsx at the
                    // welcome-state mount site. ALL live state lives in getContext().
                    // If we read from `context` directly, state is always empty and
                    // chips render blank forever. Call getContext() to get the real
                    // researchGoal, uploadedFiles, liveSourceResults, and KG.
                    const live: any = getContext ? getContext() : context;
                    return (
                        <DynamicPromptChips
                            state={{
                                researchGoal: live.researchGoal || '',
                                uploadedFiles: live.uploadedFiles || [],
                                liveSourceResults: live.liveSourceResults || [],
                                knowledgeGraph: live.knowledgeGraph,
                            }}
                            onSelect={(text) => {
                                setInput(text);
                                setTimeout(() => inputRef.current?.focus(), 0);
                            }}
                            max={maximized ? 8 : 5}
                            compact={true}
                        />
                    );
                })()}

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
                                {/* Inline pre-made Design Desk artifact (hashtag delivery) */}
                                {msg.deliveredArtifactId && msg.deliveredArtifactType && (
                                    <InlineArtifactPreview
                                        artifactId={msg.deliveredArtifactId}
                                        artifactType={msg.deliveredArtifactType}
                                        asSlide={msg.deliveredAsSlide}
                                        onOpenDesignDesk={onOpenDesignDesk}
                                        onClosePanel={onToggle}
                                    />
                                )}

                                {/* Launch button for completed #presentation runs */}
                                {msg.presentationUrl && (
                                    <PresentationLaunchCard
                                        url={msg.presentationUrl}
                                        meta={msg.presentationMeta}
                                    />
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

            {/* Dynamic prompt suggestions — persistent above-input variant.
                Only rendered AFTER the first message so it doesn't duplicate
                the welcome-state version shown when messages.length === 0.
                Acts as a pivot helper: "I'm in a conversation but want to
                jump to the next high-leverage question." */}
            {messages.length > 0 && (() => {
                const live: any = getContext ? getContext() : context;
                return (
                    <DynamicPromptChips
                        state={{
                            researchGoal: live.researchGoal || '',
                            uploadedFiles: live.uploadedFiles || [],
                            liveSourceResults: live.liveSourceResults || [],
                            knowledgeGraph: live.knowledgeGraph,
                        }}
                        onSelect={(text) => {
                            setInput(text);
                            setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        max={4}
                        compact={false}
                    />
                );
            })()}

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

            {/* Source Coverage audit panel — slide-in diagnostic showing every
                user-toggled category, its item count, citations in chat, and
                CATEGORY GAP markers. Triggered by the COVERAGE button in the
                header. Provides the visibility surface that makes every other
                source-citation improvement testable. */}
            <SourceCoverage
                isOpen={coverageOpen}
                onClose={() => setCoverageOpen(false)}
                activeCategories={(getContext ? getContext() : context)?.activeCategories || []}
                chatMessages={messages}
                liveSourceResults={(getContext ? getContext() : context)?.liveSourceResults}
            />
        </div>
    );
};

export default CorpusChatPanel;
