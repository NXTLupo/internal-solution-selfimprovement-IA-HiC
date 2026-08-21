/**
 * Corpus Chat Panel v2 - Persistent across all phases.
 *
 * Same chat from data collection through synthesis. Features:
 * - Single-vendor: DeepSeek V4 Flash via Azure (256K context, OpenAI-compatible tool-use)
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
    buildSourceReferences, parseChatCitations, routedModelFor,
    type ChatMessage, type ChatModel, type ChatContext, type SkillManifestEntry,
} from '../services/corpusChatService';
import { NxtBlockRenderer, parseNxtBlocks, type NxtBlock } from './NxtOutputRenderer';
import { ChatProse } from './ChatProse';
import { DeliverableBatch, type DeliverableItem, type DeliverableType } from './DeliverableCard';
import SlideCanvas, { type SlideData } from './SlideCanvas';
import { detectBrandFromText, getBrand, type BrandId } from './slideTemplates/brands';
import { exportDeckToPPTX, preprocessImageCover } from './slideTemplates/pptx';
import { detectQuoteDensity, enrichSlideWithQuotes, backfillSlidesFromWiki } from '../services/quoteExtractor';
import { validateSlide } from '../services/slideValidator';
// 2026-06-05 - UNIVERSAL JSON parse hygiene. Every model-output parse site
// in this file routes through tryRepairJson (markdown-fence strip + bracket-
// balance + 9-rung repair ladder) before falling back to per-array salvage.
// Static import (over async dynamic import) lets the sync parseSlideBlocks /
// parseDeliverableBlocks callbacks use these helpers without a refactor.
import { tryRepairJson, salvageJsonArray, artifactModelFor, chooseArtifactModel, DEFAULT_MODELS } from '../services/aiRouter';
// WS-6 FLUID CHAT (2026-08-14 v2 program): natural-language intent routing so
// common asks (deck edits, client email, slide narrative) need no hashtags.
// Static imports - dynamic import() chunks 404 on stale bundles (2026-08-14 lesson).
import { quickIntentFilter, classifyChatIntent, directIntent, applyDeckTextPass, draftClientEmail, draftSlideNarrative } from '../services/chatIntentRouter';
// PROVENANCE LOCK (2026-08-17, plans/citation-integrity-provenance-lock-2026-08-17.md):
// every freshly parsed deck gets its claims verified against the pointed corpus
// sources; fabricated attributions are relabeled/stripped; the ledger renders
// under the deck. Static imports (stale-bundle 404 lesson).
import { verifyDeckEvidence, applyVerificationFixes, type LedgerRow } from '../services/citationVerifier';
// DF-A3 / DF-G / DF-W: the ordered post-generation chain and its reports.
import { runArtifactChain, type ChainResult } from '../services/artifactChain';
import { repairArtifact } from '../services/artifactRepair';
import { buildPostChainRecord, patchAirWithPostChain } from '../services/airPostChain';
import { detectDomain } from '../services/evidenceSlots';
// DF-I1: project chat-generated artifacts so the autosave can persist them.
import { projectDurableArtifacts, subscribeDurableArtifacts } from '../services/sessionService';
import DynamicPromptChips from './DynamicPromptChips';
// --- Feedback (self-improvement loop, Phase 2, 2026-05-22) ---
import FeedbackWidget from './FeedbackWidget';
// 2026-05-23 - P2.5: FeedbackReceipt was imported but never rendered. The
// FeedbackWidget now renders its own inline evidence panel (post-feedback
// LearningEvidence display) which supersedes the standalone receipt. The
// import is kept commented as documentation of the prior wiring, not active
// code, so future readers don't re-add the unused import.
// import FeedbackReceipt from './FeedbackReceipt';
import GenerationReceipt from './GenerationReceipt';
import { regenerateWithFeedback, type TextDiff } from '../services/feedbackRegeneration';
import { resolveDeliverableBodies, currentEngagementSlug, manifestPointerBlock, resolveChunks } from '../services/wikiPointerResolver';
// 2026-06-09 - MANIFEST-CHUNK grounding for the deliverable corpus (intent A.1),
// so #journey/#blueprint/#org/#gap/#competitive/#prd ground from wiki+MANIFEST
// (pointer-addressed chunks) as PRIMARY evidence, not bulk-RAG.
import { pickChunksForPrompt, assembleChunkCorpus, chunkCitationInstructions } from '../services/chunkRetrieval';
// --- Chunked slide-deck generation (2026-05-23, chunking + output-quality plan, Phase 2) ---
import { generateChunkedSlideDeck, shouldChunkSlideRequest } from '../services/slideDeckChunker';
// --- Design Desk artifact delivery (hashtag interception) ---
import { parseHashtags } from '../design-desk/services/hashtagParser';
import { useDesignDeskStore } from '../design-desk/store/designDeskStore';
import { loadDesignMd, type DesignTokens } from '../design-desk/services/designMdLoader';
import { generateArtifact } from '../design-desk/services/chatToArtifact';
import { generateFreeformArtifact } from '../design-desk/services/chatToFreeform';
import type { FreeformKind, FreeformArtifact } from '../design-desk/schemas/freeformArtifact';
// 2026-05-24 - NotebookLM uplift Phase 4-6 backing services + renderers.
import { buildMindMap, type BertTopicCluster } from '../services/mindMapArchitect';
import { renderMindMapHtml } from '../services/mindMapRenderer';
import { generateBriefDialog, renderBriefDialogHtml } from '../services/briefDialogService';
import { buildMetaThemes, renderMetaThemesHtml } from '../services/metaThemesService';
import { buildResearchPlan } from '../services/researchPlanner';
import { renderResearchPlanHtml } from '../services/researchPlanRenderer';
// 2026-05-25 - Expert-panel pre-emit system. Every freeform artifact passes
// through the domain-expert critique panel before reaching the design desk.
import { runExpertPanel, type ArtifactKind, stripEmDashesInPlace } from '../services/artifactExpertPanel';
// --- Presentation Pipeline (#presentation #NXT/#NU narrative composer) ---
import {
    parsePresentationDirective,
    parsePrototypeDirective,
    parseBriefDirective,
    parseExplainerDirective,
    parseReportDirective,
    parseWhitepaperDirective,
    parsePlaygroundDirective,
    parseApproachesDirective,
    parseHelpDirective,
    parseArtifactsLibraryDirective,
    parseRefineDirective,
    type ComposerModelChoice,
} from '../services/hashtagParser';
import { DIRECTIVES, searchDirectives, directivesByCategory, CATEGORY_LABELS } from '../services/hashtagRegistry';
import { saveArtifact, listArtifacts, getArtifact, deleteArtifact, getArtifactViewUrl } from '../services/artifactLibrary';
import { callAIWithRetry } from '../services/aiRetryClient';
import { safeDynamicImport } from '../services/safeDynamicImport';
import { compose as composeNarrative } from '../services/narrativeComposer';
import { createNarrativeComposerExecutor } from '../services/narrativeComposerExecutor';
import { SourceCoverage } from './SourceCoverage';
import { usePromptEnhancer, EnhanceButton, EnhancePreview } from './PromptEnhancer';
// --- Mid-chat upload dropzone (2026-05-08) ---
import ChatAttachmentDropzone, { type ChatAttachment } from './ChatAttachmentDropzone';
import { writeAdHocUpload, buildEngagementSlug } from '../services/wikiService';
// --- Presentation library (#presentations bare-hashtag - 2026-05-09) ---
import {
    listPresentations,
    getPresentation,
    deletePresentation,
    savePresentation,
    formatPresentationDate,
    type PresentationSummary,
} from '../services/presentationLibrary';
// Illustrator (2026-06-17): resolves on-brand transparent illustrations into
// presentation sections (data.illustration) before persist, per section imageConcept.
import { resolvePresentationIllustrations } from '../services/presentationIllustrator';
// Illustrator (2026-06-17): REGISTRY-DRIVEN artifact images for GOLD/#slides decks - the emotive
// (Nano-Banana) branch is invoked via the visual router below, not directly.
import { imageSpecFor } from '../services/artifactImageSlots';
// Visual router (2026-06-26, nano-banana designer plan C2): per-slot decision - DATA -> deterministic
// vizEngine, EMOTIVE -> the brand-locked Nano-Banana designer skill; honors the #img override and
// the section-8 default-off gate. resolveRoutedSlotImages wraps the existing illustrator loop.
import { resolveRoutedSlotImages } from '../services/visualRouter';
import { resolveUserImageryForPayload } from '../services/userImagery';
import { parseImgDirective } from '../services/hashtagParser';

// Diagram kinds that go through the freeform-HTML pipeline (1920x1080 exemplar
// inheritance, iframe-isolated render). All other kinds remain on the legacy
// structured pipeline.
//
// 2026-05-26 - `journey` and `blueprint` were REMOVED from this set. Those
// two kinds now route through `/api/journey-map/generate` to the dedicated
// `internal-solutions-journeymapper` service (Docker container `journey-mapper`,
// port 8080), preserving JM's two-pass Claude Sonnet depth. The inline
// chatToFreeform path was a 2026-05-25 port of JM's depth that created
// drift risk. The new branch sits ABOVE the FREEFORM_KINDS check below.
// See: memory/feedback_journey_must_route_to_journey_mapper.md
const FREEFORM_KINDS: ReadonlySet<FreeformKind> = new Set([
    'org', 'arch', 'roadmap',
    // 2026-05-24 - NotebookLM uplift Phase 4-6 deliverables. These don't use
    // the exemplar-driven generateFreeformArtifact() path; they're produced
    // by dedicated services + renderers. The set membership keeps them in
    // the freeform artifact ecosystem (IDB persistence, ArtifactViewer
    // dispatch on type === 'freeform').
    'mindmap', 'brief-dialog', 'meta-themes', 'research-plan',
    // 2026-05-25 - Unified artifact-engine kinds. Every kind now flows through
    // /api/artifact/generate (and /api/artifact/revise on revisions) which
    // produces a JM-style HTML report with brand override + anti-slop +
    // launcher card. Persona stays on the legacy structured pipeline by
    // default but #persona on a freeform-engine path is supported.
    'persona', 'prd', 'recommendation', 'strategy-slide', 'strategy', 'brief',
    'gap-analysis', 'tech-audit', 'competitive', 'presentation',
] as FreeformKind[]);
const UPLIFT_KINDS: ReadonlySet<FreeformKind> = new Set([
    'mindmap', 'brief-dialog', 'meta-themes', 'research-plan',
]);
/** D18 (2026-07-01): emit an AIR for the narrativeComposer deck path (#presentation), which previously
 *  produced a deck but emitted NO AIR (neither the sendChatMessage chat chokepoint nor emitDeliverable.air
 *  covers composeNarrative). Resolves the objective's manifest chunks for a REAL evidence ledger (manifest-
 *  only, no model call) and writes a SHADOW AIR (ramped: new path starts non-blocking). Fire-and-forget +
 *  fully guarded so it can never break the compose/persist flow. */
async function emitComposeNarrativeAir(trigger: string, goal: string, payload: unknown): Promise<void> {
    try {
        const { currentEngagementSlug: _slug, resolveChunks: _resolve } = await import('../services/wikiPointerResolver');
        const { pickChunksForPrompt: _pick } = await import('../services/chunkRetrieval');
        const slug = _slug() || 'run';
        const g = (goal || '').slice(0, 800);
        const picked = g ? await _pick(g, slug, { researchObjective: g, tokenBudget: 16000 }) : { chunkIds: [] as string[] };
        const resolved = picked.chunkIds.length ? await _resolve(picked.chunkIds) : { chunks: [] as any[] };
        const [{ buildAir, writeAir, validateAir }, { buildEvidenceLedger }, { newRunTrace, recordToolStep }] = await Promise.all([
            import('../services/artifactAirService'), import('../services/evidenceLedgerService'), import('../services/runTraceService'),
        ]);
        const objId = `obj_${slug}`;
        const trace = newRunTrace(slug);
        if (resolved.chunks.length) recordToolStep(trace, { step: 'grounding:manifest-retrieval', toolPack: 'wiki_retrieval', toolName: 'narrativeComposer compose grounding', objectiveId: objId });
        const { air } = buildAir({
            runId: slug,
            artifactId: `presentation_${Date.now()}`,
            trigger,
            objective: { objectiveId: objId, userObjective: g, decomposedQuestions: [] },
            evidenceLedger: buildEvidenceLedger(resolved.chunks as any),
            artifactPayload: { kind: 'presentation', content: (() => { try { return JSON.stringify(payload).slice(0, 20000); } catch { return ''; } })() },
            trace,
            shadowMode: true,   // ramped: composeNarrative AIR starts shadow, like emitDeliverable
        });
        validateAir(air);
        void writeAir(air).then(w => { if (w.persisted) console.info(`[presentation] AIR persisted (shadow, ${resolved.chunks.length} chunks): ${w.path}`); }).catch(() => { /* fire-and-forget */ });
    } catch (e: any) {
        console.warn('[presentation] AIR emission failed (non-fatal):', e?.message || e);
    }
}

import { exportPdf, exportPng, exportPptx } from '../design-desk/services/artifactExporter';
import { paginateSlides } from '../services/slidePaginator';
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
    /** 2026-05-11 - Session save/restore. When App.tsx loads a saved session
     *  it passes `initialMessages` so the chat hydrates with the prior
     *  conversation. `onMessagesChange` fires on every messages update so
     *  the App can serialize the latest history when saving. */
    initialMessages?: ChatMessage[];
    /** 2026-07-08 (heuristic critique chat): when set, feedback applied to the seeded
     *  audit deck message triggers a REAL revise -> re-render -> re-gate cycle in the
     *  parent (new proposed-screen images), and the returned deck reply is appended
     *  here - instead of a generic text re-ask. */
    auditReviseHandler?: (feedback: string) => Promise<string>;
    onMessagesChange?: (messages: ChatMessage[]) => void;
    /** 2026-05-14 - T4 build-only iteration. When the IDLE-screen resume
     *  picker loads cached briefs from a prior engagement, App passes them
     *  here. The chat panel renders an assistant message with the cached
     *  briefs ready for selection - click Build → handleApproveBrief runs
     *  Stages 2-5 only against the cached brief, skipping all data
     *  collection + Pass 1/2 brief generation. */
    initialCachedBriefs?: {
        briefs: any[];
        meta: { brand: 'NXT' | 'NU'; basedOn?: string; researchGoal?: string; originalConcept: string };
        sourceSlug: string;
        mode: 't4-build-only' | 't3-briefs';
    };
    /** 2026-05-26 - Main-pipeline contention gate. When true, the chat Send
     *  button is disabled with an inline warning so the user can't fire a
     *  chat directive on top of an in-flight themes/personas/recs run -
     *  prevents the 23-min contention scenario from 2026-05-26 where the
     *  chat and the pipeline fought for the same 4 proxy workers and the
     *  same Gemini quota. Parent passes `appState !== AppState.SUCCESS`
     *  while data collection / synthesis is still running. */
    pipelineActive?: boolean;
}

/**
 * Prominent loading animation shown while the AI is reasoning or generating
 * an image. Designed to make it unmistakable that work is in progress -
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
                    {phases[phaseIdx]}...
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
 * SlideProjection - renders an artifact inside an exact 16:9 NXT slide frame.
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
     * artifactExporter.ts which renders a fresh off-screen NxtDocViewer - that
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
            {/* The slide itself - exactly 16:9, rasterized for export */}
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
                        #{artifactType} / {artifact.brand.toUpperCase()} - Slide
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
                {/* Body - artifact rendered to fill the remaining height */}
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
 * DeliverableLaunchCard (unified - replaces JourneyLaunchCard 2026-05-25)
 *
 * Renders an explicit "Launch" button + summary card for any deliverable
 * produced by the unified /api/artifact/* engine. Set on ChatMessage via
 * `artifactLaunchUrl` + `artifactLaunchMeta`. Works for journey, persona,
 * blueprint, gap-analysis, roadmap, recommendation, strategy, brief, org,
 * arch, prd, tech-audit, competitive, presentation, mindmap, brief-dialog,
 * meta-themes, research-plan.
 *
 * NOTE: The name is "Deliverable" (not "Artifact") because an
 * `ArtifactLaunchCard` already exists for the older #brief/#explainer/etc.
 * HTML-artifact family. The two systems are parallel: ArtifactLaunchCard
 * for the #report / #brief HTML family, DeliverableLaunchCard for the
 * journey/persona/blueprint/etc. artifact-engine family.
 *
 * Click -> window.open in a separate tab so interactive scripts inside the
 * artifact HTML can actually fire (the chat preview iframe sandbox blocks
 * scripts so interactive widgets are non-functional inside Design Desk).
 */
const DeliverableLaunchCard: React.FC<{
    url: string;
    meta?: ChatMessage['artifactLaunchMeta'];
}> = ({ url, meta }) => {
    const brand = meta?.brand || 'NXT';
    const accentColor = brand === 'NU' ? '#C8102E' : '#B8B800';
    const kindLabel = (meta?.kind || 'artifact').replace(/-/g, ' ');
    const handleLaunch = () => {
        // 2026-05-26 - Guard: a relative "/api/..." URL would resolve against
        // the SPA origin (:5011) and SPA-fall-back to the landing page. All
        // proxy-served artifact views live on :5012. Absolute-ize defensively
        // so a missed prefix upstream can't reopen the landing page.
        let target = url;
        if (target && target.startsWith('/api/')) {
            target = `http://127.0.0.1:5012${target}`;
        }
        if (!target) {
            console.warn('[LaunchCard] empty launcher URL - nothing to open');
            return;
        }
        window.open(target, '_blank', 'noopener,noreferrer');
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
                    Interactive {kindLabel} report · {brand}
                </div>
                {meta?.title && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta.title}
                    </div>
                )}
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                    {meta?.source || 'artifact-engine'}
                    {meta?.model && ` · ${meta.model}`}
                    {meta?.artifact_id && ` · ${meta.artifact_id.slice(0, 8)}`}
                </div>
                <div style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
                    Click Launch to open interactive widgets in a new window (chat preview blocks scripts).
                </div>
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
                aria-label={`Launch ${kindLabel} report in new window`}
            >
                Launch ↗
            </button>
        </div>
    );
};

// Backward-compat alias for existing render sites
const JourneyLaunchCard = DeliverableLaunchCard;


/**
 * PresentationLaunchCard
 *
 * Renders an explicit "Launch" button + summary card for a completed
 * #presentation composition. Set on a ChatMessage via `presentationUrl`
 * by the handleSend hashtag interception path.
 *
 * The card itself is the deliverable surface - the URL is intentionally
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
        // 2026-05-26 - Guard: a relative "/api/..." URL would resolve against
        // the SPA origin (:5011) and SPA-fall-back to the landing page. All
        // proxy-served artifact views live on :5012. Absolute-ize defensively
        // so a missed prefix upstream can't reopen the landing page.
        let target = url;
        if (target && target.startsWith('/api/')) {
            target = `http://127.0.0.1:5012${target}`;
        }
        if (!target) {
            console.warn('[LaunchCard] empty launcher URL - nothing to open');
            return;
        }
        window.open(target, '_blank', 'noopener,noreferrer');
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

/**
 * 2026-05-09 - Inline grid of saved presentations with Open / Edit / Delete
 * chips per card. Mounted on chat messages whose libraryItems is set
 * (rendered when the user types the bare `#presentations` command).
 *
 * Edit flow: clicking Edit opens an inline textarea for the revision
 * instruction. Submitting fires the composer in revision mode (the user's
 * instruction layered onto the existing payload as context) and saves the
 * result back to the same slug. The card refreshes with the new title.
 *
 * Delete flow: clicking Delete shows an inline confirmation chip ("Confirm
 * delete?"). On confirm, the proxy soft-deletes (moves to .deleted/) and
 * the card disappears from the grid.
 */
interface PresentationLibraryGridProps {
    items: PresentationSummary[];
    onItemDeleted: (slug: string) => void;
    onItemEdited: (oldSlug: string, summary: PresentationSummary, newMessageContent: string) => void;
    onEditTriggered: (slug: string, instruction: string) => Promise<void>;
}

const PresentationLibraryGrid: React.FC<PresentationLibraryGridProps> = ({ items, onItemDeleted, onEditTriggered }) => {
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [busySlug, setBusySlug] = useState<string | null>(null);
    // 2026-05-14 - Enhancer for the inline revision instruction. Same Gemini
    // Flash service the chats use, but the 'revision' surface biases the
    // rubric toward imperative surgical tweaks rather than open prompts.
    const revisionEnhancer = usePromptEnhancer({
        input: editInstruction,
        setInput: setEditInstruction,
        surface: 'revision',
        getContext: () => {
            const slug = editingSlug || '';
            const item = items.find(i => i.slug === slug);
            return item ? `Revising presentation: ${item.title} (${item.brand || 'NXT'} brand)` : '';
        },
    });

    if (!items || items.length === 0) return null;

    const handleDelete = async (slug: string) => {
        setBusySlug(slug);
        try {
            const ok = await deletePresentation(slug);
            if (ok) onItemDeleted(slug);
        } catch (e: any) {
            console.error('[Library] delete failed:', e);
        } finally {
            setBusySlug(null);
            setConfirmingDelete(null);
        }
    };

    const handleEditSubmit = async (slug: string) => {
        const instruction = editInstruction.trim();
        if (!instruction) return;
        setBusySlug(slug);
        try {
            await onEditTriggered(slug, instruction);
        } finally {
            setBusySlug(null);
            setEditingSlug(null);
            setEditInstruction('');
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginTop: 10 }}>
            {items.map(item => {
                const isConfirmingDelete = confirmingDelete === item.slug;
                const isEditing = editingSlug === item.slug;
                const isBusy = busySlug === item.slug;
                const brandAccent = item.brand === 'NU' ? '#C8102E' : '#B8B800';
                return (
                    <div key={item.slug} style={{
                        background: '#FFFFFF',
                        border: `1px solid #E0E0E0`,
                        borderLeft: `3px solid ${brandAccent}`,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        opacity: isBusy ? 0.5 : 1,
                    }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: brandAccent }}>
                            {item.brand} · {formatPresentationDate(item.generatedAt)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.3 }}>{item.title || '(untitled)'}</div>
                        {item.narrativeThesis && (
                            <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4, fontStyle: 'italic' }}>
                                {item.narrativeThesis.slice(0, 140)}{item.narrativeThesis.length > 140 ? '...' : ''}
                            </div>
                        )}
                        <div style={{ fontSize: 9, color: '#999', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                            {item.sectionCount} sections · {item.slug}
                        </div>

                        {/* Action row */}
                        {!isConfirmingDelete && !isEditing && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                                    disabled={isBusy}
                                    style={chipStyle('#0D0D0D', '#FFFFFF')}
                                >Open ↗</button>
                                <button
                                    onClick={() => { setEditingSlug(item.slug); setEditInstruction(''); }}
                                    disabled={isBusy}
                                    style={chipStyle('#FFFFFF', '#0D0D0D', '#0D0D0D')}
                                >Edit</button>
                                <button
                                    onClick={() => setConfirmingDelete(item.slug)}
                                    disabled={isBusy}
                                    style={chipStyle('#FFFFFF', '#CC6644', '#CC6644')}
                                >Delete</button>
                            </div>
                        )}

                        {/* Delete confirmation */}
                        {isConfirmingDelete && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: '#CC6644', fontWeight: 700 }}>Confirm delete?</span>
                                <button
                                    onClick={() => handleDelete(item.slug)}
                                    disabled={isBusy}
                                    style={chipStyle('#CC6644', '#FFFFFF')}
                                >{isBusy ? 'Deleting...' : 'Yes, delete'}</button>
                                <button
                                    onClick={() => setConfirmingDelete(null)}
                                    disabled={isBusy}
                                    style={chipStyle('#FFFFFF', '#666', '#999')}
                                >Cancel</button>
                            </div>
                        )}

                        {/* Inline edit form */}
                        {isEditing && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                                <EnhancePreview handle={revisionEnhancer} accentColor="#00B7C3" />
                                <textarea
                                    value={editInstruction}
                                    onChange={e => setEditInstruction(e.target.value)}
                                    placeholder="What change? e.g. 'replace Microsoft case with Salesforce, drop infrastructure-cost section'"
                                    rows={3}
                                    style={{ padding: 8, border: '1px solid #DDD', fontSize: 11, fontFamily: "'Archivo', sans-serif", resize: 'vertical', outline: 'none', minHeight: 60, lineHeight: 1.5 }}
                                />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleEditSubmit(item.slug)}
                                        disabled={isBusy || !editInstruction.trim()}
                                        style={chipStyle('#B8B800', '#0D0D0D')}
                                    >{isBusy ? 'Composing...' : 'Compose revision'}</button>
                                    <EnhanceButton handle={revisionEnhancer} accentColor="#00B7C3" compact disabled={isBusy} />
                                    <button
                                        onClick={() => { setEditingSlug(null); setEditInstruction(''); }}
                                        disabled={isBusy}
                                        style={chipStyle('#FFFFFF', '#666', '#999')}
                                    >Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

function chipStyle(bg: string, fg: string, border?: string): React.CSSProperties {
    return {
        padding: '4px 10px',
        background: bg,
        color: fg,
        border: border ? `1px solid ${border}` : 'none',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
        cursor: 'pointer',
    };
}

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
    const [tokensError, setTokensError] = useState<string | null>(null);

    useEffect(() => {
        loadDesignMd('/DESIGN.md')
            .then(r => setTokens(r.tokens))
            .catch((e: Error) => {
                console.error('[InlineArtifactPreview] DESIGN.md failed to load:', e.message);
                setTokensError(e.message);
            });
    }, []);

    if (!artifact) {
        // Pull current ids via getState() (NOT a hook with array selector - array
        // selectors return a new reference each render and create an infinite loop
        // because Zustand's default equality is Object.is).
        const ids = useDesignDeskStore.getState().artifacts.map(a => a.id);
        console.warn(`[InlineArtifactPreview] Artifact NOT FOUND. Looking for id=${artifactId} (type=${artifactType}). Store currently has ${ids.length} ids:`, ids);
        return <div style={{ padding: 12, color: '#CC6644', fontSize: 12 }}>Artifact no longer in store (id={artifactId}).</div>;
    }
    if (tokensError) return <div style={{ padding: 12, color: '#CC6644', fontSize: 12 }}>Design tokens failed to load: {tokensError}</div>;
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
                        #{(artifact as any).kind} / {artifact.brand.toUpperCase()} {asSlide ? '- Slide' : ''}
                    </span>
                    <ArtifactExportButtons artifact={artifact as any} onOpenDesignDesk={onOpenDesignDesk} handleOpen={handleOpen} />
                </div>
            </div>
        );
    }

    // SlideSpec artifacts - typed JSON rendered via SlideSpecViewer.
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
                        #{slideArt.kind} / {slideArt.brand.toUpperCase()} - SlideSpec
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
            // 2026-06-08 - the exporters require DesignTokens (2nd arg, like
            // ExportMenu). This self-contained widget has no tokens in scope, so
            // load them on demand from DESIGN.md.
            const { tokens } = await loadDesignMd('/DESIGN.md');
            if (kind === 'png') await exportPng(artifact, tokens);
            else if (kind === 'pdf') await exportPdf(artifact, tokens);
            else await exportPptx(artifact, tokens);
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
                {busy === 'pdf' ? 'PDF...' : 'Export PDF'}
            </button>
            <button onClick={() => run('png')} disabled={!!busy} style={btnBase}>
                {busy === 'png' ? 'PNG...' : 'Export PNG'}
            </button>
            <button onClick={() => run('pptx')} disabled={!!busy} style={btnBase}>
                {busy === 'pptx' ? 'PPTX...' : 'Export PPTX'}
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

// 2026-04-21 - SUGGESTED_QUERIES (static list) was retired. The welcome
// screen and the above-input guidance strip now both source their
// suggestions from DynamicPromptChips which calls suggestPrompts() -
// state-aware on uploaded docs / live sources / knowledge graph themes.
// See services/dynamicPromptSuggestions.ts.

// 2026-05-11 - renderProtoChips: scan plain-text content for backtick-
// wrapped `#proto ...` patterns (emitted by #recommendations responses)
// and replace them with clickable chips that pre-fill the chat input.
// Format the model emits:
//   `#proto #name=<slug> #NXT` - Optional label after em-dash
//
// The em-dash + label is the user-facing chip label; the backticked
// portion is what gets injected into the input field. If no label is
// present, the command itself is used as the label.
function renderProtoChips(text: string, onPickCommand: (cmd: string) => void): React.ReactNode {
    if (!text || !text.includes('#proto')) return text;
    // Match: ` `#proto ...` ` optionally followed by ` - label text` (em-dash, en-dash, or hyphen)
    // The label runs until end-of-line or a newline.
    const pattern = /`(#proto[^`]*?)`(?:\s*[\-]\s*([^\n]+))?/g;
    const out: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(text)) !== null) {
        const [full, command, label] = match;
        const start = match.index;
        if (start > lastIdx) out.push(text.slice(lastIdx, start));
        // Detect brand from the command for chip accent
        const isNU = /#NU\b/i.test(command);
        const accent = isNU ? '#C00000' : '#B8B800';
        const accentText = isNU ? '#FFFFFF' : '#0D0D0D';
        const cleanLabel = (label || '').trim() || 'Build this prototype';
        out.push(
            <button
                key={`proto-chip-${key++}`}
                onClick={() => onPickCommand(command.trim())}
                title={`Click to pre-fill the chat input with: ${command.trim()}\nYou can edit before submitting.`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: '4px 4px 4px 0',
                    padding: '6px 12px',
                    background: accent,
                    color: accentText,
                    border: 'none',
                    borderRadius: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    cursor: 'pointer',
                    fontFamily: "'Archivo', sans-serif",
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    maxWidth: '100%',
                }}
            >
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    opacity: 0.7,
                    textTransform: 'none',
                }}>{isNU ? '⟶ NU' : '⟶ NXT'}</span>
                <span style={{ flex: 1 }}>{cleanLabel}</span>
            </button>
        );
        lastIdx = start + full.length;
    }
    if (lastIdx < text.length) out.push(text.slice(lastIdx));
    return <>{out}</>;
}

// 2026-05-11 - Prototype launcher card. Mirrors PresentationLaunchCard
// shape. Opens the prototype's standalone HTML view in a new window.
const PrototypeLaunchCard: React.FC<{
    url: string;
    meta?: ChatMessage['prototypeMeta'];
}> = ({ url, meta }) => {
    const brand = meta?.brand || 'NXT';
    const accentColor = brand === 'NU' ? '#C00000' : '#B8B800';
    const verdict = meta?.verdict;
    const verdictColor = verdict === 'ship' ? '#0CCE6B' : verdict === 'refine' ? '#FD8E2E' : verdict === 'rebuild' ? '#CC6644' : '#525252';
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const handleExportZip = async () => {
        if (!meta?.slug) { setExportError('No prototype slug available'); return; }
        setExporting(true);
        setExportError('');
        try {
            const [libMod, expMod] = await Promise.all([
                safeDynamicImport(() => import('../services/prototypeLibrary'), 'prototypeLibrary (zip export)'),
                safeDynamicImport(() => import('../services/prototypeExporter'), 'prototypeExporter'),
            ]);
            // Defensive: a stale page (older bundle after an app update) can resolve a
            // dynamic import to a module whose expected export is missing. Destructuring
            // straight off it would crash with a cryptic "Cannot read properties of
            // undefined (reading 'exportPrototypeAsZip')". Guard + give clear recovery.
            const getPrototype = (libMod as any)?.getPrototype;
            const exportPrototypeAsZip = (expMod as any)?.exportPrototypeAsZip;
            if (typeof getPrototype !== 'function' || typeof exportPrototypeAsZip !== 'function') {
                throw new Error(
                    'Export tooling could not load — this tab is likely running an older app version. ' +
                    'Click "Save Session" in the header, then hard-refresh (Ctrl+Shift+R) and reopen from "Continue Session".'
                );
            }
            const artifact = await getPrototype(meta.slug);
            if (!artifact || !artifact.code) {
                throw new Error(`Prototype "${meta.slug}" has no saved code to export (try re-opening it, or rebuild).`);
            }
            await exportPrototypeAsZip({
                title: artifact.title || meta.title || meta.slug,
                slug: meta.slug,
                brand: artifact.brand || meta.brand,
                code: artifact.code,
                based_on: artifact.based_on || meta.based_on,
                research_goal: (artifact as any).researchGoal || (artifact as any).research_goal,
                brief: (artifact as any).brief || (artifact as any).approved_brief,
                critique: artifact.critique,
                code_format: (artifact as any).code_format,
            });
        } catch (e: any) {
            console.error('[PrototypeLaunchCard] zip export failed:', e);
            setExportError(String(e?.message || e).slice(0, 200));
        } finally {
            setExporting(false);
        }
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
            flexWrap: 'wrap',
        }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                    Interactive Prototype · {brand}
                </div>
                {meta?.title && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta.title}
                    </div>
                )}
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                    {meta?.code_chars ? `${Math.round(meta.code_chars / 1024)}KB code` : ''}
                    {verdict && <span style={{ marginLeft: 8, color: verdictColor, fontWeight: 700, textTransform: 'uppercase' }}>{verdict}</span>}
                    {meta?.based_on && <span style={{ marginLeft: 8 }}>· based on: {meta.based_on}</span>}
                </div>
                {exportError && (
                    <div style={{ marginTop: 6, fontSize: 10, color: '#CC6644' }}>Export failed: {exportError}</div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                    onClick={handleExportZip}
                    disabled={exporting || !meta?.slug}
                    title={meta?.slug ? 'Download a runnable Vite project zip - package.json, vite.config, src/App, README, brief.json, critique.json' : 'Save the prototype first to export'}
                    style={{
                        padding: '10px 14px',
                        background: 'transparent',
                        color: exporting ? '#999' : '#0D0D0D',
                        border: `1px solid ${exporting ? '#CCC' : '#0D0D0D'}`,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        cursor: exporting || !meta?.slug ? 'not-allowed' : 'pointer',
                        fontFamily: "'Archivo', sans-serif",
                    }}
                    aria-label="Export prototype as runnable Vite project zip"
                >
                    {exporting ? 'Bundling...' : 'Export ZIP ↓'}
                </button>
                <button
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer,width=1280,height=900')}
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
                    }}
                    aria-label="Launch prototype in new window"
                >
                    Launch ↗
                </button>
            </div>
        </div>
    );
};

// 2026-05-12 - Hashtag autocomplete dropdown.
// Appears when the user types '#' followed by a partial token. Pulls
// from the canonical hashtagRegistry (DIRECTIVES). Up/Down arrow + Enter
// to pick, Escape to dismiss. Reads cursor position to detect whether
// the user is mid-token (so we don't trigger on something like "#NXT" in
// the middle of an existing directive).
const HashtagAutocomplete: React.FC<{
    input: string;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    onPickDirective: (suffix: string) => void;
}> = ({ input, inputRef, onPickDirective }) => {
    const [open, setOpen] = useState(false);
    const [partial, setPartial] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [matches, setMatches] = useState<typeof DIRECTIVES>([]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) { setOpen(false); return; }
        const cursor = el.selectionStart ?? input.length;
        const before = input.slice(0, cursor);
        // Match the last #word the cursor is touching. The token starts at
        // a non-word boundary (start of string or whitespace) - so we don't
        // false-trigger on a # buried inside another word.
        const m = before.match(/(?:^|\s)(#[a-zA-Z0-9_-]*)$/);
        if (!m) { setOpen(false); setPartial(''); return; }
        const token = m[1];
        setPartial(token);
        // 2026-06-13 - use the registry resolver (single source of truth) instead
        // of a hand-rolled slice. Bare '#' now returns EVERY non-system directive
        // (all artifacts - the menu is scrollable, maxHeight 280), not the first
        // 10, which silently hid #persona/#prd/#gap/#audit/#compete/#case-study/
        // #strategy/#themes/#mindmap/#brief/#explainer/#report/etc. A partial
        // returns scored top matches (id-prefix > alias > name/summary).
        const finalHits = searchDirectives(token, 12);
        setMatches(finalHits);
        setOpen(finalHits.length > 0);
        setSelectedIdx(0);
    }, [input, inputRef]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el || !open) return;
        const onKey = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => (i + 1) % Math.max(1, matches.length)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => (i - 1 + matches.length) % Math.max(1, matches.length)); }
            else if (e.key === 'Enter' && !e.shiftKey) {
                if (matches[selectedIdx]) {
                    e.preventDefault();
                    onPickDirective(matches[selectedIdx].id);
                    setOpen(false);
                }
            } else if (e.key === 'Escape') { setOpen(false); }
            else if (e.key === 'Tab') {
                if (matches[selectedIdx]) {
                    e.preventDefault();
                    onPickDirective(matches[selectedIdx].id);
                    setOpen(false);
                }
            }
        };
        el.addEventListener('keydown', onKey);
        return () => el.removeEventListener('keydown', onKey);
    }, [open, matches, selectedIdx, onPickDirective, inputRef]);

    if (!open || matches.length === 0) return null;

    const categoryAccent = (cat: string) => {
        if (cat === 'experience-builder') return '#B8B800';
        if (cat === 'consulting-deliverable') return '#00B7C3';
        if (cat === 'browse') return '#115054';
        if (cat === 'edit-refine') return '#FD8E2E';
        return '#525252';
    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#0D0D0D',
                border: '1px solid #B8B800',
                maxHeight: 280,
                overflowY: 'auto',
                zIndex: 100,
                fontFamily: 'Archivo, sans-serif',
                boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
            }}
            onMouseDown={(e) => e.preventDefault() /* keep focus on textarea */}
        >
            <div style={{
                padding: '6px 10px',
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1.5, textTransform: 'uppercase',
                color: '#B8B800', borderBottom: '1px solid #333',
                display: 'flex', justifyContent: 'space-between',
            }}>
                <span>Hashtag directive {partial && `· ${partial}`}</span>
                <span style={{ color: '#666' }}>↑↓ Tab to pick · Esc to close</span>
            </div>
            {matches.map((d, i) => (
                <div
                    key={d.id}
                    onMouseEnter={() => setSelectedIdx(i)}
                    onClick={() => { onPickDirective(d.id); setOpen(false); }}
                    style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        background: i === selectedIdx ? '#B8B800' : 'transparent',
                        color: i === selectedIdx ? '#0D0D0D' : '#FFFFFF',
                        borderLeft: `3px solid ${categoryAccent(d.category)}`,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                    }}
                >
                    <code style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        minWidth: 100,
                    }}>{d.id}</code>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{d.name}</div>
                        <div style={{ fontSize: 10, opacity: i === selectedIdx ? 0.85 : 0.65, lineHeight: 1.35, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                            {d.summary}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {d.usesVerbalizedSampling && (
                            <span style={{ fontSize: 8, padding: '2px 5px', background: i === selectedIdx ? '#0D0D0D' : '#B8B800', color: i === selectedIdx ? '#B8B800' : '#0D0D0D', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.8 }}>VS</span>
                        )}
                        {d.requiresContext && (
                            <span style={{ fontSize: 8, padding: '2px 5px', background: i === selectedIdx ? '#0D0D0D' : '#00B7C3', color: i === selectedIdx ? '#00B7C3' : '#0D0D0D', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.8 }}>CTX</span>
                        )}
                    </div>
                </div>
            ))}
            <div style={{ padding: '6px 10px', fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", borderTop: '1px solid #333', textAlign: 'center' }}>
                Type <code style={{ color: '#B8B800' }}>#help</code> for the full guide
            </div>
        </div>
    );
};

// 2026-05-12 - Sprint H2 - Artifact Launch Card.
// Mirror of PrototypeLaunchCard for the HTML-artifact family
// (#brief, #explainer, #report, #playground, #approaches, #help).
// One Launch button - opens artifact /view URL in a new window with NXT
// brand wrapper + Copy-as-prompt footer.
const ArtifactLaunchCard: React.FC<{
    url: string;
    meta?: ChatMessage['artifactMeta'];
}> = ({ url, meta }) => {
    const brand = meta?.brand || 'NXT';
    const accentColor = brand === 'NU' ? '#C8102E' : '#B8B800';
    const gen = meta?.generator || '#artifact';
    const genLabel = ({
        '#brief': 'Stakeholder Brief',
        '#explainer': 'Concept Explainer',
        '#report': 'Strategic Report',
        '#playground': 'Interactive Playground',
        '#approaches': 'Approach Picker',
        '#help': 'Reference Guide',
    } as Record<string, string>)[gen] || 'HTML Artifact';
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
                    {genLabel} · {gen} · {brand}
                </div>
                {meta?.title && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta.title}
                    </div>
                )}
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                    {meta?.html_chars ? `${Math.round(meta.html_chars / 1024)}KB HTML` : ''}
                    {meta?.variants_count && meta.variants_count > 0 ? ` · ${meta.variants_count} variants saved` : ''}
                </div>
            </div>
            <button
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer,width=1280,height=900')}
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
                aria-label="Launch artifact in new window"
            >
                Launch ↗
            </button>
        </div>
    );
};

// 2026-05-12 - Artifact library grid (bare #artifacts hashtag).
// Mirror of PrototypeLibraryGrid for HTML artifacts.
interface ArtifactLibraryGridProps {
    items: any[]; // ArtifactSummary[]
    onItemDeleted: (slug: string) => void;
}
const ArtifactLibraryGrid: React.FC<ArtifactLibraryGridProps> = ({ items, onItemDeleted }) => {
    const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
    return (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {items.map(a => {
                const accent = a.brand === 'NU' ? '#C8102E' : '#B8B800';
                return (
                    <div key={a.slug} style={{
                        border: `1px solid #E5E5E5`,
                        borderLeft: `4px solid ${accent}`,
                        background: '#FFFFFF',
                        padding: '10px 12px',
                        fontFamily: 'Archivo, sans-serif',
                    }}>
                        <div style={{ fontSize: 9, color: '#525252', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                            {a.generator || '#artifact'} · {a.brand || 'NXT'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.25, marginBottom: 6, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>
                            {a.title}
                        </div>
                        {a.topic && (
                            <div style={{ fontSize: 11, color: '#525252', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                                {a.topic}
                            </div>
                        )}
                        <div style={{ fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                            {Math.round((a.html_chars || 0) / 1024)}KB
                            {a.variants_count > 0 ? ` · ${a.variants_count} variants` : ''}
                            {a.updated_at ? ` · ${new Date(a.updated_at).toLocaleDateString()}` : ''}
                        </div>
                        {confirmDeleteSlug === a.slug ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={async () => {
                                        try {
                                            const ok = await deleteArtifact(a.slug);
                                            if (ok) onItemDeleted(a.slug);
                                        } catch (e) { console.warn('[artifact delete]', e); }
                                        setConfirmDeleteSlug(null);
                                    }}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#CC6644', color: '#FFFFFF', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Confirm Delete?
                                </button>
                                <button
                                    onClick={() => setConfirmDeleteSlug(null)}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#F5F5F0', color: '#525252', border: '1px solid #E5E5E5', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={() => window.open(`http://127.0.0.1:5012${a.view_url}`, '_blank', 'noopener,noreferrer,width=1280,height=900')}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#0D0D0D', color: accent, border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Launch ↗
                                </button>
                                <button
                                    onClick={() => setConfirmDeleteSlug(a.slug)}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#FFFFFF', color: '#CC6644', border: '1px solid #CC6644', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// 2026-05-11 - Prototype library grid (#prototypes bare hashtag).
// Each card has Launch / Edit / Delete chips. Edit prompts for an
// instruction and re-runs the 5-stage pipeline with the new direction
// layered onto the existing artifact.
interface PrototypeLibraryGridProps {
    items: any[]; // PrototypeSummary[]
    onItemDeleted: (slug: string) => void;
    onEditTriggered: (slug: string, instruction: string) => Promise<void>;
}
const PrototypeLibraryGrid: React.FC<PrototypeLibraryGridProps> = ({ items, onItemDeleted, onEditTriggered }) => {
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
    // 2026-05-14 - Enhancer for prototype revision instructions. Same 'revision'
    // surface rubric - imperative, surgical, deltas not redesigns.
    const protoRevisionEnhancer = usePromptEnhancer({
        input: editInstruction,
        setInput: setEditInstruction,
        surface: 'revision',
        getContext: () => {
            const slug = editingSlug || '';
            const item = items.find(i => i.slug === slug);
            return item ? `Revising prototype: ${item.title} (${item.brand || ''})` : '';
        },
    });
    return (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {items.map(p => (
                <div key={p.slug} style={{
                    border: `1px solid #E5E5E5`,
                    borderLeft: `4px solid #B8B800`,
                    background: '#FFFFFF',
                    padding: '10px 12px',
                    fontFamily: 'Archivo, sans-serif',
                }}>
                    <div style={{ fontSize: 9, color: '#525252', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                        Prototype · {p.code_format?.toUpperCase() || 'REACT'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.25, marginBottom: 6, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>
                        {p.title}
                    </div>
                    {p.concept_preview && (
                        <div style={{
                            fontSize: 11, color: '#525252', lineHeight: 1.4, marginBottom: 8,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                        }}>{p.concept_preview}</div>
                    )}
                    <div style={{ fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                        {Math.round((p.code_chars || 0) / 1024)}KB · {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '-'}
                    </div>
                    {editingSlug === p.slug ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <EnhancePreview handle={protoRevisionEnhancer} accentColor="#00B7C3" />
                            <textarea
                                value={editInstruction}
                                onChange={e => setEditInstruction(e.target.value)}
                                placeholder="What should change? e.g. 'add dark-mode toggle wired to design-system tokens', 'increase seed records from 15 to 30', 'replace single-shot AI call with Claude-style tool loop'"
                                rows={4}
                                style={{ width: '100%', minHeight: 88, padding: 10, fontSize: 11, fontFamily: 'Archivo, sans-serif', border: '1px solid #E5E5E5', resize: 'vertical', lineHeight: 1.5 }}
                            />
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <button
                                    onClick={async () => {
                                        const instr = editInstruction.trim();
                                        if (!instr) return;
                                        setEditingSlug(null);
                                        setEditInstruction('');
                                        await onEditTriggered(p.slug, instr);
                                    }}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#0D0D0D', color: '#B8B800', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Apply Edit
                                </button>
                                <EnhanceButton handle={protoRevisionEnhancer} accentColor="#00B7C3" compact />
                                <button
                                    onClick={() => { setEditingSlug(null); setEditInstruction(''); }}
                                    style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#F5F5F0', color: '#525252', border: '1px solid #E5E5E5', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : confirmDeleteSlug === p.slug ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                onClick={async () => {
                                    try {
                                        const { deletePrototype } = await safeDynamicImport(
                                            () => import('../services/prototypeLibrary'),
                                            'prototypeLibrary (delete)',
                                        );
                                        await deletePrototype(p.slug);
                                        onItemDeleted(p.slug);
                                    } catch (e) { console.warn('[proto delete]', e); }
                                    setConfirmDeleteSlug(null);
                                }}
                                style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#CC6644', color: '#FFFFFF', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                                Confirm Delete?
                            </button>
                            <button
                                onClick={() => setConfirmDeleteSlug(null)}
                                style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#F5F5F0', color: '#525252', border: '1px solid #E5E5E5', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                onClick={() => window.open(`http://127.0.0.1:5012${p.view_url}`, '_blank', 'noopener,noreferrer,width=1280,height=900')}
                                style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#0D0D0D', color: '#B8B800', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                                Launch ↗
                            </button>
                            <button
                                onClick={() => { setEditingSlug(p.slug); setEditInstruction(''); }}
                                style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#FFFFFF', color: '#0D0D0D', border: '1px solid #0D0D0D', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setConfirmDeleteSlug(p.slug)}
                                style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#FFFFFF', color: '#CC6644', border: '1px solid #CC6644', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// 2026-05-11 - RecommendationTilesGrid renders #recommendations output as
// elegant tiles instead of a markdown wall. Each tile gets a Gemini Imagen
// thumbnail (16:9), Bebas Neue title, thesis, persona/moment/aha rows,
// AI-capability pills, and clickable variant chips that pre-fill the chat
// input with a #proto command.
interface RecommendationTile {
    slug: string;
    title: string;
    thesis: string;
    persona: string;
    moment: string;
    aha_interaction: string;
    ai_capabilities: string[];
    image_prompt: string;
    image_data?: string;
    variants: Array<{ label: string; command: string }>;
    clr_dependent?: boolean | null;
    execution_path?: string;
    existing_stack_reuse?: string;
    non_starter_check?: string;
    effort_estimate?: string;
    risk_level?: string;
    evidence_sources?: string[];
    // Consulting-depth fields - generic context-aware names + legacy aliases
    initiative_dependent?: boolean | null;
    group?: 'initiative_dependent' | 'initiative_independent' | 'clr_dependent' | 'clr_independent' | null;
    description?: string;
    why_matters_target_segment?: string;
    long_term_outcome_through_line?: string;
    initiative_dependency_explanation?: string;
    execution_in_existing_stack?: string;
    preferred_stack_fit?: string;
    stakeholder_guardrail_fit?: string;
    // Legacy field names retained for older saved sessions
    why_matters_first_year?: string;
    long_term_coop_readiness?: string;
    clr_dependency_explanation?: string;
    execution_in_nu_stack?: string;
    microsoft_copilot_fit?: string;
    guardrail_fit?: string;
    // Shared
    key_stakeholders?: Array<{ name_or_role: string; involvement: string }>;
    implementation_steps?: Array<{ step: string; owner: string; dependencies: string[]; estimated_effort: string }>;
    risks_constraints?: Array<{ risk: string; severity: string; mitigation: string }>;
    expected_impact?: string;
    verbatim_quote_evidence?: string;
    // VS-Multi fields (Sprint 2)
    frame?: 'defensible_consensus' | 'non_obvious_bet';
    probability?: number;
    diverges_from?: string;
}
interface EngagementContext {
    client_name?: string;
    vendor_or_consultant?: string;
    engagement_objective?: string;
    industry?: string;
    named_initiative?: string | null;
    target_segment?: string;
    target_outcome_window?: string;
    named_stakeholders?: Array<{ name: string; stated_priorities: string[]; stated_non_starters: string[]; stated_preferences: string[] }>;
    preferred_tech_stack?: string[];
    existing_systems?: string[];
    hard_non_starters?: string[];
    regulatory_constraints?: string[];
}
interface RecommendationPreamble {
    stakeholder_priorities?: Array<{ name: string; stated_priorities: string[]; stated_non_starters: string[]; stated_preferences: string[] }>;
    design_principles?: string[];
    ideas_to_retire_or_reframe?: Array<{ prior_idea: string; reason_to_retire_or_reframe: string; reframed_as?: string | null }>;
    guardrail_validation_criteria?: string[];
}
interface RecommendationTilesGridProps {
    tiles: RecommendationTile[];
    onPickCommand: (command: string) => void;
    context?: EngagementContext;
    // 2026-05-12 - Hashtag composition. Brand drives tile accent (chartreuse
    // for NXT consensus, NU red for NU consensus; cyan stays for bets across
    // both brands). autoExport triggers on-mount export when #slides or #slide
    // was in the original query.
    brand?: BrandId;
    autoExport?: 'deck' | 'single' | null;
    // 2026-05-23 - P1.3: Threaded down to RecommendationTileCard so per-tile
    // FeedbackWidget can scope feedback to the specific tile slug.
    engagementSlug?: string;
    deliverableId?: string;
}
// Helper: derive dynamic section labels from the engagement context.
// Falls back to neutral labels when fields are missing so the UI never
// shows "Why it matters for {undefined}".
function labelsFromContext(ctx?: EngagementContext) {
    const segment = ctx?.target_segment?.trim() || 'the target audience';
    const initiative = ctx?.named_initiative?.trim();
    const client = ctx?.client_name?.trim() || 'the client';
    const stack = (ctx?.preferred_tech_stack || []).filter(Boolean);
    const stackLabel = stack.length > 0 ? stack.slice(0, 2).join(' / ') : 'preferred stack';
    const stakeholders = (ctx?.named_stakeholders || []).map(s => s?.name).filter(Boolean) as string[];
    const stakeholdersLabel = stakeholders.length > 0 ? stakeholders.join(' & ') : 'named stakeholders';
    return {
        whyMatters: `Why it matters for ${segment}`,
        longTerm: `How it supports ${segment} ${ctx?.target_outcome_window ? `in ${ctx.target_outcome_window}` : 'long-term'}`,
        initiativeDependsTrue: initiative ? `How it uses / depends on ${initiative}` : 'Initiative dependency',
        initiativeDependsFalse: initiative ? `Why ${initiative} is not required` : 'Why no initiative dependency',
        executionStack: `Execution within ${client}'s existing stack`,
        stackFit: `${stackLabel} fit`,
        guardrails: `Why this fits ${stakeholdersLabel}'s guardrails`,
        cmpInitiativeCol: initiative ? `${initiative}-Dep.` : null,
        cmpImpactCol: `Expected ${segment} Impact`,
        cmpStackCol: `${stack[0] || 'Existing-Stack'} Fit`,
        cmpAlignCol: `Alignment (${stakeholdersLabel})`,
    };
}
// 2026-05-13 - Product Brief comparison grid. Emitted by #proto after the
// VS brief generator returns 5 distinct framings. Each card surfaces the
// brief's frame label, persona, demonstrated moment, use cases, screens,
// AI capabilities, seed data sketch, and visual direction - with a single
// BUILD THIS button that hands the brief to buildPrototype as
// approvedBrief, skipping Stage 1.
interface ProductBriefForCard {
    id: string;
    frame_label: string;
    probability: number;
    title: string;
    one_line_thesis: string;
    why_this_frame?: string;
    primary_persona?: { name?: string; role?: string; context?: string; emotional_state?: string; pain_points?: string[]; jtbd?: string };
    secondary_actors?: Array<{ role: string; involvement: string }>;
    demonstrated_moment?: string;
    use_cases?: Array<{ name: string; trigger?: string; flow?: string; ai_role?: string; outcome?: string }>;
    key_screens?: Array<{ name: string; purpose?: string; primary_element?: string; motion_character?: string }>;
    ai_capabilities?: Array<{ name: string; user_action?: string; ai_model?: string; input_data?: string; output?: string; user_benefit?: string }>;
    seed_data?: { primary_entities?: Array<{ name: string; target_count: number; example_records_summary?: string }>; secondary_entities?: Array<{ name: string; target_count: number; example_records_summary?: string }> };
    visual_direction?: { aesthetic_keywords?: string; hero_treatment?: string; motion_character?: string; image_gen_opportunities?: string[] };
    success_criteria?: string[];
    hard_constraints?: { brand?: string | null; platform?: string; accessibility?: string; other?: string[] };
}

/** 2026-05-13 - Export a ProductBrief as Markdown, plain text, or JSON.
 *  Triggers a download on click. */
function downloadFile(filename: string, content: string, mime: string): void {
    try {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
        console.warn('[brief export] failed:', e);
    }
}

function briefToMarkdown(b: ProductBriefForCard): string {
    const lines: string[] = [];
    lines.push(`# ${b.title}`);
    lines.push('');
    lines.push(`*Frame: ${b.frame_label} · probability ${Math.round((b.probability || 0) * 100)}%*`);
    lines.push('');
    lines.push(`> ${b.one_line_thesis}`);
    if (b.why_this_frame) {
        lines.push('');
        lines.push(`**Why this frame:** ${b.why_this_frame}`);
    }
    if (b.primary_persona) {
        lines.push('');
        lines.push('## Primary persona');
        if (b.primary_persona.name) lines.push(`**${b.primary_persona.name}** - ${b.primary_persona.role || ''}`);
        if (b.primary_persona.context) lines.push(b.primary_persona.context);
        if (b.primary_persona.emotional_state) lines.push(`*Emotional state:* ${b.primary_persona.emotional_state}`);
        if (b.primary_persona.jtbd) lines.push(`**JTBD:** ${b.primary_persona.jtbd}`);
        if (b.primary_persona.pain_points && b.primary_persona.pain_points.length > 0) {
            lines.push('');
            lines.push('**Pain points:**');
            for (const p of b.primary_persona.pain_points) lines.push(`- ${p}`);
        }
    }
    if (b.secondary_actors && b.secondary_actors.length > 0) {
        lines.push('');
        lines.push('## Secondary actors');
        for (const a of b.secondary_actors) lines.push(`- **${a.role}** - ${a.involvement}`);
    }
    if (b.demonstrated_moment) {
        lines.push('');
        lines.push('## Demonstrated moment');
        lines.push(b.demonstrated_moment);
    }
    if (b.use_cases && b.use_cases.length > 0) {
        lines.push('');
        lines.push(`## Use cases (${b.use_cases.length})`);
        b.use_cases.forEach((u, i) => {
            lines.push('');
            lines.push(`### ${i + 1}. ${u.name}`);
            if (u.trigger) lines.push(`- **Trigger:** ${u.trigger}`);
            if (u.flow) lines.push(`- **Flow:** ${u.flow}`);
            if (u.ai_role) lines.push(`- **AI role:** ${u.ai_role}`);
            if (u.outcome) lines.push(`- **Outcome:** ${u.outcome}`);
        });
    }
    if (b.key_screens && b.key_screens.length > 0) {
        lines.push('');
        lines.push(`## Key screens (${b.key_screens.length})`);
        b.key_screens.forEach((s, i) => {
            lines.push('');
            lines.push(`**${i + 1}. ${s.name}**`);
            if (s.purpose) lines.push(`- Purpose: ${s.purpose}`);
            if (s.primary_element) lines.push(`- Primary element: ${s.primary_element}`);
            if (s.motion_character) lines.push(`- Motion: ${s.motion_character}`);
        });
    }
    if (b.ai_capabilities && b.ai_capabilities.length > 0) {
        lines.push('');
        lines.push(`## AI capabilities (${b.ai_capabilities.length})`);
        b.ai_capabilities.forEach((c, i) => {
            lines.push('');
            lines.push(`### ${i + 1}. ${c.name}`);
            if (c.ai_model) lines.push(`- **Model:** ${c.ai_model}`);
            if (c.user_action) lines.push(`- **User action:** ${c.user_action}`);
            if (c.input_data) lines.push(`- **Input:** ${c.input_data}`);
            if (c.output) lines.push(`- **Output:** ${c.output}`);
            if (c.user_benefit) lines.push(`- **User benefit:** ${c.user_benefit}`);
        });
    }
    if (b.seed_data) {
        lines.push('');
        lines.push('## Seed data');
        if (b.seed_data.primary_entities && b.seed_data.primary_entities.length > 0) {
            lines.push('');
            lines.push('### Primary entities');
            for (const e of b.seed_data.primary_entities) {
                lines.push(`- **${e.name}** (target ${e.target_count})${e.example_records_summary ? ` - ${e.example_records_summary}` : ''}`);
            }
        }
        if (b.seed_data.secondary_entities && b.seed_data.secondary_entities.length > 0) {
            lines.push('');
            lines.push('### Secondary entities');
            for (const e of b.seed_data.secondary_entities) {
                lines.push(`- **${e.name}** (target ${e.target_count})${e.example_records_summary ? ` - ${e.example_records_summary}` : ''}`);
            }
        }
    }
    if (b.visual_direction) {
        lines.push('');
        lines.push('## Visual direction');
        if (b.visual_direction.aesthetic_keywords) lines.push(`- **Aesthetic:** ${b.visual_direction.aesthetic_keywords}`);
        if (b.visual_direction.hero_treatment) lines.push(`- **Hero treatment:** ${b.visual_direction.hero_treatment}`);
        if (b.visual_direction.motion_character) lines.push(`- **Motion character:** ${b.visual_direction.motion_character}`);
        if (b.visual_direction.image_gen_opportunities && b.visual_direction.image_gen_opportunities.length > 0) {
            lines.push('');
            lines.push('### Imagen prompts');
            b.visual_direction.image_gen_opportunities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
        }
    }
    if (b.success_criteria && b.success_criteria.length > 0) {
        lines.push('');
        lines.push(`## Success criteria (${b.success_criteria.length})`);
        for (const s of b.success_criteria) lines.push(`- ${s}`);
    }
    if (b.hard_constraints) {
        lines.push('');
        lines.push('## Hard constraints');
        if (b.hard_constraints.brand) lines.push(`- **Brand:** ${b.hard_constraints.brand}`);
        if (b.hard_constraints.platform) lines.push(`- **Platform:** ${b.hard_constraints.platform}`);
        if (b.hard_constraints.accessibility) lines.push(`- **Accessibility:** ${b.hard_constraints.accessibility}`);
        if (b.hard_constraints.other && b.hard_constraints.other.length > 0) {
            for (const o of b.hard_constraints.other) lines.push(`- ${o}`);
        }
    }
    return lines.join('\n');
}

function briefToPlainText(b: ProductBriefForCard): string {
    // Markdown stripped of formatting tokens - usable as plain text.
    return briefToMarkdown(b)
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^>\s*/gm, '');
}

function briefSlug(b: ProductBriefForCard): string {
    return (b.title || 'brief')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60)
        .replace(/-+$/, '') || 'brief';
}

/** 2026-05-13 v2 - Render a ProductBrief as a standalone HTML document and
 *  open it in a real popup window. Gives the user a dedicated review surface
 *  rather than cramping the brief inside the chat thread. */
function openBriefInWindow(brief: ProductBriefForCard, brand: 'NXT' | 'NU'): void {
    const win = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes');
    if (!win) {
        alert('Popup blocked. Allow popups for localhost:5011 to open the brief in a dedicated window.');
        return;
    }
    const isNU = brand === 'NU';
    const accent = isNU ? '#C8102E' : '#B8B800';
    const accentDark = isNU ? '#9E0A24' : '#8A8A00';
    const display = isNU ? "'Roboto Condensed', sans-serif" : "'Bebas Neue', 'Archivo', sans-serif";
    const body = isNU ? "'Open Sans', sans-serif" : "'Archivo', sans-serif";
    const ink = isNU ? '#141D30' : '#0D0D0D';
    const probPct = Math.round((brief.probability || 0) * 100);

    const escapeHtml = (s: string): string => s
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const sectionHtml = (title: string, content: string): string =>
        `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;

    const listHtml = (items: string[]): string => items.length
        ? `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
        : '<p class="empty">-</p>';

    const personaHtml = brief.primary_persona
        ? `<div class="persona">
             <div class="persona-name">${escapeHtml(brief.primary_persona.name || '')} <span class="persona-role">- ${escapeHtml(brief.primary_persona.role || '')}</span></div>
             ${brief.primary_persona.context ? `<p>${escapeHtml(brief.primary_persona.context)}</p>` : ''}
             ${brief.primary_persona.emotional_state ? `<p class="emotion">Emotional state: ${escapeHtml(brief.primary_persona.emotional_state)}</p>` : ''}
             ${brief.primary_persona.jtbd ? `<p><strong>JTBD:</strong> ${escapeHtml(brief.primary_persona.jtbd)}</p>` : ''}
             ${brief.primary_persona.pain_points && brief.primary_persona.pain_points.length > 0
                ? `<div class="subhead">Pain points</div>${listHtml(brief.primary_persona.pain_points)}`
                : ''}
           </div>`
        : '';

    const useCasesHtml = brief.use_cases && brief.use_cases.length > 0
        ? brief.use_cases.map((u, i) => `
             <div class="card">
               <div class="card-num">${i + 1}</div>
               <div class="card-body">
                 <div class="card-title">${escapeHtml(u.name)}</div>
                 ${u.trigger ? `<div><strong>Trigger:</strong> ${escapeHtml(u.trigger)}</div>` : ''}
                 ${u.flow ? `<div><strong>Flow:</strong> ${escapeHtml(u.flow)}</div>` : ''}
                 ${u.ai_role ? `<div><strong>AI role:</strong> ${escapeHtml(u.ai_role)}</div>` : ''}
                 ${u.outcome ? `<div><strong>Outcome:</strong> ${escapeHtml(u.outcome)}</div>` : ''}
               </div>
             </div>`).join('')
        : '<p class="empty">-</p>';

    const screensHtml = brief.key_screens && brief.key_screens.length > 0
        ? brief.key_screens.map((s, i) => `
             <div class="card">
               <div class="card-num">${i + 1}</div>
               <div class="card-body">
                 <div class="card-title">${escapeHtml(s.name)}</div>
                 ${s.purpose ? `<div><strong>Purpose:</strong> ${escapeHtml(s.purpose)}</div>` : ''}
                 ${s.primary_element ? `<div><strong>Primary element:</strong> ${escapeHtml(s.primary_element)}</div>` : ''}
                 ${s.motion_character ? `<div><strong>Motion:</strong> ${escapeHtml(s.motion_character)}</div>` : ''}
               </div>
             </div>`).join('')
        : '<p class="empty">-</p>';

    const aiHtml = brief.ai_capabilities && brief.ai_capabilities.length > 0
        ? brief.ai_capabilities.map((c, i) => `
             <div class="card">
               <div class="card-num">${i + 1}</div>
               <div class="card-body">
                 <div class="card-title">${escapeHtml(c.name)}</div>
                 ${c.ai_model ? `<div><strong>Model:</strong> ${escapeHtml(c.ai_model)}</div>` : ''}
                 ${c.user_action ? `<div><strong>User action:</strong> ${escapeHtml(c.user_action)}</div>` : ''}
                 ${c.input_data ? `<div><strong>Input:</strong> ${escapeHtml(c.input_data)}</div>` : ''}
                 ${c.output ? `<div><strong>Output:</strong> ${escapeHtml(c.output)}</div>` : ''}
                 ${c.user_benefit ? `<div><strong>User benefit:</strong> ${escapeHtml(c.user_benefit)}</div>` : ''}
               </div>
             </div>`).join('')
        : '<p class="empty">-</p>';

    const seedHtml = brief.seed_data
        ? `${(brief.seed_data.primary_entities || []).map((e: any) => `
             <div class="seed-row">
               <div class="seed-name"><strong>${escapeHtml(e.name)}</strong> <span class="seed-meta">primary · target ${e.target_count}</span></div>
               ${e.example_records_summary ? `<div class="seed-summary">${escapeHtml(e.example_records_summary)}</div>` : ''}
               ${e.field_shape ? `<div class="seed-meta">Shape: ${escapeHtml(e.field_shape)}</div>` : ''}
               ${e.naming_convention ? `<div class="seed-meta">Naming: ${escapeHtml(e.naming_convention)}</div>` : ''}
               ${e.value_distributions ? `<div class="seed-meta">Distribution: ${escapeHtml(e.value_distributions)}</div>` : ''}
             </div>`).join('')}
           ${(brief.seed_data.secondary_entities || []).map((e: any) => `
             <div class="seed-row secondary">
               <div class="seed-name">${escapeHtml(e.name)} <span class="seed-meta">secondary · target ${e.target_count}</span></div>
               ${e.example_records_summary ? `<div class="seed-summary">${escapeHtml(e.example_records_summary)}</div>` : ''}
             </div>`).join('')}`
        : '<p class="empty">-</p>';

    // v2 fields (optional)
    const dataExamples = (brief as any).data_examples as Array<any> | undefined;
    const dataExamplesHtml = dataExamples && dataExamples.length > 0
        ? dataExamples.map(de => `
             <div class="seed-row">
               <div class="seed-name"><strong>${escapeHtml(de.name)}</strong> <span class="seed-meta">target ${de.target_count}</span></div>
               ${de.field_shape ? `<div class="seed-meta">${escapeHtml(de.field_shape)}</div>` : ''}
               ${Array.isArray(de.sample_records) && de.sample_records.length > 0
                ? `<pre class="json">${escapeHtml(JSON.stringify(de.sample_records.slice(0, 6), null, 2))}</pre>`
                : ''}
             </div>`).join('')
        : '';

    const roadmap = (brief as any).feature_roadmap as Array<any> | undefined;
    const roadmapHtml = roadmap && roadmap.length > 0
        ? roadmap.map(p => `
             <div class="phase">
               <div class="phase-head"><span class="phase-label">${escapeHtml(p.phase || '')}</span> · ${escapeHtml(p.label || '')}</div>
               ${Array.isArray(p.deliverables) ? `<ul>${p.deliverables.map((d: string) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : ''}
               ${p.success_metric ? `<div class="phase-success"><strong>Success metric:</strong> ${escapeHtml(p.success_metric)}</div>` : ''}
             </div>`).join('')
        : '';

    const arc = (brief as any).narrative_arc as Array<any> | undefined;
    const arcHtml = arc && arc.length > 0
        ? arc.map(n => `
             <div class="beat">
               <div class="beat-time">${escapeHtml(n.timeframe || '')}</div>
               <div class="beat-body">
                 ${n.user_moment ? `<div><strong>User:</strong> ${escapeHtml(n.user_moment)}</div>` : ''}
                 ${n.ai_moment ? `<div><strong>AI:</strong> ${escapeHtml(n.ai_moment)}</div>` : ''}
                 ${n.feeling ? `<div class="emotion"><strong>Feeling:</strong> ${escapeHtml(n.feeling)}</div>` : ''}
               </div>
             </div>`).join('')
        : '';

    const choreo = (brief as any).interaction_choreography as Array<any> | undefined;
    const choreoHtml = choreo && choreo.length > 0
        ? `<ol class="choreo">${choreo.map(c => `
             <li>
               <div class="choreo-action">${escapeHtml(c.user_action || '')}</div>
               ${c.system_response ? `<div><strong>System:</strong> ${escapeHtml(c.system_response)}</div>` : ''}
               ${c.motion_or_feedback ? `<div class="emotion">${escapeHtml(c.motion_or_feedback)}${c.timing_ms ? ` (${c.timing_ms}ms)` : ''}</div>` : ''}
             </li>`).join('')}</ol>`
        : '';

    const visualHtml = brief.visual_direction
        ? `<div>
             ${brief.visual_direction.aesthetic_keywords ? `<div><strong>Aesthetic:</strong> ${escapeHtml(brief.visual_direction.aesthetic_keywords)}</div>` : ''}
             ${brief.visual_direction.hero_treatment ? `<div><strong>Hero:</strong> ${escapeHtml(brief.visual_direction.hero_treatment)}</div>` : ''}
             ${brief.visual_direction.motion_character ? `<div><strong>Motion:</strong> ${escapeHtml(brief.visual_direction.motion_character)}</div>` : ''}
             ${brief.visual_direction.image_gen_opportunities && brief.visual_direction.image_gen_opportunities.length > 0
                ? `<div class="subhead">Imagen prompts (${brief.visual_direction.image_gen_opportunities.length})</div><ol>${brief.visual_direction.image_gen_opportunities.map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')}</ol>`
                : ''}
           </div>`
        : '<p class="empty">-</p>';

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(brief.title)} · Product Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@200..900&family=Bebas+Neue&family=JetBrains+Mono:wght@400;500&family=Open+Sans:wght@400;600;700&family=Roboto+Condensed:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: ${body}; color: ${ink}; background: #FAFAFA; line-height: 1.5; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 48px 56px 96px; background: #FFFFFF; min-height: 100vh; }
  .hero { padding-bottom: 32px; border-bottom: 3px solid ${accent}; margin-bottom: 40px; }
  .frame-chip { display: inline-block; padding: 6px 12px; background: ${accent}; color: ${isNU ? '#FFFFFF' : ink}; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .prob { display: inline-block; margin-left: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #525252; }
  h1 { font-family: ${display}; font-size: 44px; font-weight: 700; margin: 14px 0 12px; letter-spacing: -0.01em; line-height: 1.1; }
  .thesis { font-size: 18px; color: #404040; line-height: 1.5; max-width: 760px; }
  .why-frame { margin-top: 12px; font-style: italic; color: #525252; font-size: 14px; max-width: 760px; }
  h2 { font-family: ${display}; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin: 56px 0 18px; padding-bottom: 8px; border-bottom: 1px solid #E5E5E5; }
  section { margin-bottom: 8px; }
  .persona { background: #F8F8F4; padding: 20px 24px; border-left: 4px solid ${accent}; }
  .persona-name { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
  .persona-role { font-weight: 400; color: #525252; }
  .emotion { color: #525252; font-style: italic; }
  .subhead { margin-top: 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #525252; }
  ul, ol { padding-left: 22px; }
  ul li, ol li { margin-bottom: 6px; }
  .card { display: flex; gap: 16px; padding: 14px 18px; border: 1px solid #E5E5E5; margin-bottom: 10px; background: #FFFFFF; }
  .card-num { flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: ${accent}; width: 36px; }
  .card-body { flex: 1; font-size: 14px; }
  .card-title { font-weight: 700; font-size: 15px; margin-bottom: 6px; }
  .seed-row { padding: 10px 14px; border-left: 3px solid ${accent}; background: #F8F8F4; margin-bottom: 8px; }
  .seed-row.secondary { border-left-color: #C5C5C5; background: #F4F4F4; }
  .seed-name { font-size: 14px; margin-bottom: 4px; }
  .seed-meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #737373; }
  .seed-summary { font-size: 13px; color: #404040; margin: 4px 0; }
  pre.json { background: #0D0D0D; color: #B8B800; padding: 12px 14px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.4; margin: 8px 0; max-height: 360px; }
  .phase { padding: 16px 20px; border: 1px solid #E5E5E5; margin-bottom: 12px; background: #FFFFFF; }
  .phase-head { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
  .phase-label { color: ${accent}; }
  .phase-success { margin-top: 8px; font-style: italic; color: #525252; font-size: 13px; }
  .beat { display: flex; gap: 16px; padding: 12px 16px; border-left: 2px solid ${accent}; background: #F8F8F4; margin-bottom: 8px; }
  .beat-time { flex-shrink: 0; width: 110px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${accentDark}; }
  .beat-body { flex: 1; font-size: 14px; }
  .choreo li { margin-bottom: 12px; padding: 10px 14px; background: #F8F8F4; border-left: 2px solid ${accent}; list-style-position: outside; }
  .choreo-action { font-weight: 700; margin-bottom: 4px; }
  .empty { color: #999; }
  .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #E5E5E5; font-size: 12px; color: #737373; }
</style>
</head><body>
<div class="wrap">
  <div class="hero">
    <span class="frame-chip">${escapeHtml(brief.frame_label || '')}</span>
    <span class="prob">p = ${probPct}%</span>
    <h1>${escapeHtml(brief.title)}</h1>
    <div class="thesis">${escapeHtml(brief.one_line_thesis || '')}</div>
    ${brief.why_this_frame ? `<div class="why-frame">${escapeHtml(brief.why_this_frame)}</div>` : ''}
  </div>
  ${sectionHtml('Primary persona', personaHtml)}
  ${brief.demonstrated_moment ? sectionHtml('Demonstrated moment', `<p>${escapeHtml(brief.demonstrated_moment)}</p>`) : ''}
  ${brief.use_cases && brief.use_cases.length > 0 ? sectionHtml(`Use cases (${brief.use_cases.length})`, useCasesHtml) : ''}
  ${brief.key_screens && brief.key_screens.length > 0 ? sectionHtml(`Key screens (${brief.key_screens.length})`, screensHtml) : ''}
  ${brief.ai_capabilities && brief.ai_capabilities.length > 0 ? sectionHtml(`AI capabilities (${brief.ai_capabilities.length})`, aiHtml) : ''}
  ${seedHtml ? sectionHtml('Seed data', seedHtml) : ''}
  ${dataExamplesHtml ? sectionHtml('Data examples (anchor records)', dataExamplesHtml) : ''}
  ${roadmapHtml ? sectionHtml('Feature roadmap', roadmapHtml) : ''}
  ${arcHtml ? sectionHtml('Narrative arc', arcHtml) : ''}
  ${choreoHtml ? sectionHtml('Interaction choreography', choreoHtml) : ''}
  ${visualHtml ? sectionHtml('Visual direction', visualHtml) : ''}
  ${brief.success_criteria && brief.success_criteria.length > 0 ? sectionHtml(`Success criteria (${brief.success_criteria.length})`, listHtml(brief.success_criteria)) : ''}
  <div class="footer">Brief ID: ${escapeHtml(brief.id || '')} · Brand: ${brand} · Generated by HiC Research · Claude Opus 4.8</div>
</div>
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.document.title = `${brief.title} · Product Brief`;
}

const ProductBriefCard: React.FC<{ brief: ProductBriefForCard; idx: number; onApprove: (b: ProductBriefForCard, customization?: string) => void; isBuilding: boolean; brand: 'NXT' | 'NU'; }> = ({ brief, idx, onApprove, isBuilding, brand }) => {
    const [expanded, setExpanded] = useState(false); // collapsed by default; popup window is the primary deep-dive surface
    // 2026-05-14 - Brief-customization slot. Last-mile tweaks the user wants
    // applied BEFORE the 7-stage pipeline runs. The text gets prepended to
    // the concept passed into Stage 2 so every downstream stage sees it.
    const [showCustomization, setShowCustomization] = useState(false);
    const [customization, setCustomization] = useState('');
    const customizationEnhancer = usePromptEnhancer({
        input: customization,
        setInput: setCustomization,
        surface: 'brief-customization',
        getContext: () => `Brief: ${brief.title} (${brief.frame_label}, p=${Math.round((brief.probability || 0) * 100)}%) · ${brief.one_line_thesis || ''}`.slice(0, 600),
    });
    const frameColor = brief.frame_label === 'convention-honoring' ? '#0D0D0D'
        : brief.frame_label === 'shifted-frame' ? '#00B7C3'
        : brief.frame_label === 'adjacent-vertical' ? '#B8B800'
        : brief.frame_label === 'inverted-actor' ? '#CC6644'
        : '#7C3AED'; // radical = purple
    const frameTextColor = brief.frame_label === 'convention-honoring' || brief.frame_label === 'adjacent-vertical' ? '#0D0D0D' : '#FFFFFF';
    const probPct = `${Math.round((brief.probability || 0) * 100)}%`;
    const slug = briefSlug(brief);
    const exportBtnStyle: React.CSSProperties = {
        padding: '6px 10px', background: 'transparent', color: '#0D0D0D',
        border: '1px solid #D9D9D9', cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: 1, textTransform: 'uppercase',
    };
    return (
        <div style={{
            border: '1px solid #E5E5E5',
            background: '#FFFFFF',
            padding: 0,
            marginBottom: 14,
            overflow: 'hidden',
        }}>
            {/* Header strip */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5', background: '#FAFAF5', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{
                    background: frameColor, color: frameTextColor,
                    padding: '4px 10px', borderRadius: 2,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: 'uppercase',
                }}>
                    BRIEF {idx + 1} · {brief.frame_label.replace(/-/g, ' ')}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#525252' }}>p = {probPct}</span>
                {(brief as any)._pass2_failed && (
                    <span
                        title={`Pass 2 deepening failed for this brief. Reason: ${(brief as any)._pass2_reason || 'unknown'}. The fields below are skeleton-only - not safe to build from. Regenerate the brief set.`}
                        style={{
                            background: '#CC6644', color: '#FFFFFF',
                            padding: '3px 8px', borderRadius: 2,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 8, fontWeight: 700, letterSpacing: 1.2,
                            textTransform: 'uppercase',
                        }}
                    > SKELETON ONLY - DEEPENING FAILED</span>
                )}
                <div style={{ flex: 1 }} />
                <button
                    type="button"
                    onClick={() => downloadFile(`${slug}.md`, briefToMarkdown(brief), 'text/markdown;charset=utf-8')}
                    title="Download brief as Markdown"
                    style={exportBtnStyle}
                >.md</button>
                <button
                    type="button"
                    onClick={() => downloadFile(`${slug}.txt`, briefToPlainText(brief), 'text/plain;charset=utf-8')}
                    title="Download brief as plain text"
                    style={exportBtnStyle}
                >.txt</button>
                <button
                    type="button"
                    onClick={() => downloadFile(`${slug}.json`, JSON.stringify(brief, null, 2), 'application/json;charset=utf-8')}
                    title="Download brief as JSON"
                    style={exportBtnStyle}
                >.json</button>
                <button
                    onClick={() => onApprove(brief, customization.trim() || undefined)}
                    disabled={isBuilding || !!(brief as any)._pass2_failed}
                    title={(brief as any)._pass2_failed ? 'Cannot build from a skeleton-only brief - regenerate the brief set first' : (customization.trim() ? 'Build this brief with your customization tweaks applied' : 'Build this brief into a prototype')}
                    style={{
                        padding: '8px 18px',
                        background: (brief as any)._pass2_failed ? '#E5E5E5' : (isBuilding ? '#E5E5E5' : '#0D0D0D'),
                        color: (brief as any)._pass2_failed ? '#999' : (isBuilding ? '#999' : '#B8B800'),
                        border: 'none',
                        fontFamily: "'Archivo', sans-serif", fontSize: 11, fontWeight: 700,
                        letterSpacing: 1.2, textTransform: 'uppercase',
                        cursor: (isBuilding || (brief as any)._pass2_failed) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {(brief as any)._pass2_failed ? ' Build disabled' : (isBuilding ? 'Building...' : (customization.trim() ? `▶ Build with tweaks` : `▶ Build this brief`))}
                </button>
            </div>
            {/* Brief-customization slot - last-mile tweaks applied before the
                7-stage pipeline runs. Collapsed by default; click to expand. */}
            {!isBuilding && !(brief as any)._pass2_failed && (
                <div style={{ borderTop: '1px solid #E5E5E5', background: showCustomization ? '#FAFCFD' : '#FFFFFF' }}>
                    <button
                        type="button"
                        onClick={() => setShowCustomization(v => !v)}
                        style={{ width: '100%', padding: '8px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: customization.trim() ? '#00B7C3' : '#525252', textTransform: 'uppercase' }}
                    >
                        {showCustomization ? '−' : '+'} Refine brief before building {customization.trim() ? `· ${customization.trim().length} chars staged` : '(optional surgical tweaks)'}
                    </button>
                    {showCustomization && (
                        <div style={{ padding: '0 18px 14px' }}>
                            <EnhancePreview handle={customizationEnhancer} accentColor="#00B7C3" />
                            <textarea
                                value={customization}
                                onChange={e => setCustomization(e.target.value)}
                                placeholder="Surgical tweaks: 'seed 30 student records, not 15', 'add a faculty-advisor screen', 'lean harder into NU red than chartreuse', 'replace single-shot AI call with Claude-style tool loop'"
                                rows={4}
                                style={{ width: '100%', padding: 10, border: '1px solid #DDD', fontSize: 12, fontFamily: "'Archivo', sans-serif", resize: 'vertical', outline: 'none', minHeight: 96, lineHeight: 1.5, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                <span style={{ fontSize: 10, color: '#737373', fontStyle: 'italic' }}>
                                    Threaded into every downstream stage as additional grounding.
                                </span>
                                <EnhanceButton handle={customizationEnhancer} accentColor="#00B7C3" />
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Title + thesis */}
            <div style={{ padding: '16px 18px' }}>
                <h3 style={{ fontFamily: "'Archivo', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#0D0D0D', lineHeight: 1.25 }}>{brief.title}</h3>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontSize: 13, color: '#525252', lineHeight: 1.45 }}>{brief.one_line_thesis}</div>
                {brief.why_this_frame && (
                    <div style={{ marginTop: 8, fontFamily: "'Archivo', sans-serif", fontSize: 11, color: '#737373', fontStyle: 'italic', lineHeight: 1.45 }}>{brief.why_this_frame}</div>
                )}
            </div>
            {/* Quick stats row */}
            <div style={{ padding: '0 18px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#737373', letterSpacing: 1, textTransform: 'uppercase' }}>
                {brief.use_cases && <span>{brief.use_cases.length} USE CASES</span>}
                {brief.key_screens && <span>{brief.key_screens.length} SCREENS</span>}
                {brief.ai_capabilities && <span>{brief.ai_capabilities.length} AI FLOWS</span>}
                {brief.seed_data?.primary_entities && <span>{brief.seed_data.primary_entities.reduce((n, e) => n + (e.target_count || 0), 0)} SEED RECORDS</span>}
                {brief.visual_direction?.image_gen_opportunities && brief.visual_direction.image_gen_opportunities.length > 0 && <span>{brief.visual_direction.image_gen_opportunities.length} IMAGEN PROMPTS</span>}
                {(brief as any).prd_candidate?.features?.length > 0 && <span>{(brief as any).prd_candidate.features.length} PRD FEATURES</span>}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid #E5E5E5' }}>
                <button
                    type="button"
                    onClick={() => openBriefInWindow(brief, brand)}
                    title="Open the full brief in a dedicated window"
                    style={{ flex: 2, padding: '10px 18px', background: 'transparent', border: 'none', borderRight: '1px solid #E5E5E5', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: '#0D0D0D', textAlign: 'left', textTransform: 'uppercase' }}
                >
                    ↗ Open brief in new window
                </button>
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    title="Preview key sections inline"
                    style={{ flex: 1, padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: '#525252', textAlign: 'left', textTransform: 'uppercase' }}
                >
                    {expanded ? '− Collapse inline preview' : '+ Inline preview'}
                </button>
            </div>
            {expanded && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F0F0F0', fontFamily: "'Archivo', sans-serif", fontSize: 12, color: '#0D0D0D' }}>
                    {brief.primary_persona && (
                        <Section title="PRIMARY PERSONA">
                            <div style={{ marginBottom: 4 }}><strong>{brief.primary_persona.name}</strong> - {brief.primary_persona.role}</div>
                            <div style={{ color: '#525252', marginBottom: 4 }}>{brief.primary_persona.context}</div>
                            {brief.primary_persona.emotional_state && <div style={{ color: '#737373', fontStyle: 'italic', marginBottom: 6 }}>Emotional state: {brief.primary_persona.emotional_state}</div>}
                            {brief.primary_persona.jtbd && <div><strong>JTBD:</strong> {brief.primary_persona.jtbd}</div>}
                            {brief.primary_persona.pain_points && brief.primary_persona.pain_points.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Pain points</div>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.primary_persona.pain_points.map((p, i) => <li key={i} style={{ marginBottom: 2 }}>{p}</li>)}</ul>
                                </div>
                            )}
                        </Section>
                    )}
                    {brief.demonstrated_moment && (
                        <Section title="DEMONSTRATED MOMENT"><div>{brief.demonstrated_moment}</div></Section>
                    )}
                    {/* E6 PRD-IN-BRIEF (2026-07-02): the detailed PRD contained within the brief the
                        prototype utilizes - shown here for approval before BUILD THIS hands it to
                        Stage 2 (features -> screens) + Stage 5 (acceptance-criteria audit). */}
                    {(brief as any).prd_candidate?.features?.length > 0 && (
                        <Section title={`PRD (${(brief as any).prd_candidate.features.length} FEATURES)`}>
                            {(brief as any).prd_candidate.features.map((f: any, i: number) => (
                                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #F0F0F0' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                                        {i + 1}. {f.name}
                                        <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: f.priority === 'must' ? '#0D0D0D' : '#737373', background: f.priority === 'must' ? '#EAEA00' : '#F0F0F0', padding: '1px 6px' }}>{f.priority}</span>
                                    </div>
                                    {f.description && <div style={{ color: '#525252', fontSize: 11, marginBottom: 2 }}>{f.description}</div>}
                                    {Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length > 0 && (
                                        <ul style={{ margin: '2px 0 0', paddingLeft: 18, color: '#525252', fontSize: 11 }}>
                                            {f.acceptanceCriteria.map((a: string, j: number) => <li key={j}>{a}</li>)}
                                        </ul>
                                    )}
                                    {Array.isArray(f.citations) && f.citations.length > 0 && <div style={{ color: '#737373', fontSize: 10, marginTop: 2 }}>Sources: {f.citations.join(' · ')}</div>}
                                </div>
                            ))}
                            {Array.isArray((brief as any).prd_candidate.success_metrics) && (brief as any).prd_candidate.success_metrics.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Success metrics</div>
                                    {(brief as any).prd_candidate.success_metrics.map((m: any, i: number) => (
                                        <div key={i} style={{ color: '#525252', fontSize: 11 }}>{m.metric}: {m.baseline} → {m.target}{m.guardrail ? ` (guardrail: ${m.guardrail})` : ''}</div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    )}
                    {brief.use_cases && brief.use_cases.length > 0 && (
                        <Section title={`USE CASES (${brief.use_cases.length})`}>
                            {brief.use_cases.map((u, i) => (
                                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < brief.use_cases!.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{i + 1}. {u.name}</div>
                                    {u.trigger && <div style={{ color: '#525252', fontSize: 11 }}><strong>Trigger:</strong> {u.trigger}</div>}
                                    {u.flow && <div style={{ color: '#525252', fontSize: 11 }}><strong>Flow:</strong> {u.flow}</div>}
                                    {u.ai_role && <div style={{ color: '#525252', fontSize: 11 }}><strong>AI role:</strong> {u.ai_role}</div>}
                                    {u.outcome && <div style={{ color: '#525252', fontSize: 11 }}><strong>Outcome:</strong> {u.outcome}</div>}
                                </div>
                            ))}
                        </Section>
                    )}
                    {brief.key_screens && brief.key_screens.length > 0 && (
                        <Section title={`KEY SCREENS (${brief.key_screens.length})`}>
                            {brief.key_screens.map((s, i) => (
                                <div key={i} style={{ marginBottom: 6 }}>
                                    <div style={{ fontWeight: 700 }}>{i + 1}. {s.name}</div>
                                    {s.purpose && <div style={{ color: '#525252', fontSize: 11 }}>{s.purpose}</div>}
                                    {s.primary_element && <div style={{ color: '#737373', fontSize: 10 }}>Primary: {s.primary_element}</div>}
                                </div>
                            ))}
                        </Section>
                    )}
                    {brief.ai_capabilities && brief.ai_capabilities.length > 0 && (
                        <Section title={`AI CAPABILITIES (${brief.ai_capabilities.length})`}>
                            {brief.ai_capabilities.map((c, i) => (
                                <div key={i} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: i < brief.ai_capabilities!.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{i + 1}. {c.name}</div>
                                    {c.ai_model && <div style={{ color: '#525252', fontSize: 11 }}><strong>Model:</strong> {c.ai_model}</div>}
                                    {c.user_action && <div style={{ color: '#525252', fontSize: 11 }}><strong>User action:</strong> {c.user_action}</div>}
                                    {c.user_benefit && <div style={{ color: '#525252', fontSize: 11 }}><strong>Benefit:</strong> {c.user_benefit}</div>}
                                </div>
                            ))}
                        </Section>
                    )}
                    {brief.seed_data && (
                        <Section title="SEED DATA SKETCH">
                            {brief.seed_data.primary_entities?.map((e, i) => (
                                <div key={`p${i}`} style={{ marginBottom: 4 }}>
                                    <strong>{e.name}</strong> <span style={{ color: '#737373' }}>(target {e.target_count})</span>
                                    {e.example_records_summary && <div style={{ color: '#525252', fontSize: 11 }}>{e.example_records_summary}</div>}
                                </div>
                            ))}
                            {brief.seed_data.secondary_entities?.map((e, i) => (
                                <div key={`s${i}`} style={{ marginBottom: 4, fontSize: 11, color: '#525252' }}>
                                    <em>{e.name}</em> (target {e.target_count})
                                </div>
                            ))}
                        </Section>
                    )}
                    {brief.visual_direction && (
                        <Section title="VISUAL DIRECTION">
                            {brief.visual_direction.aesthetic_keywords && <div><strong>Aesthetic:</strong> {brief.visual_direction.aesthetic_keywords}</div>}
                            {brief.visual_direction.hero_treatment && <div style={{ color: '#525252' }}><strong>Hero:</strong> {brief.visual_direction.hero_treatment}</div>}
                            {brief.visual_direction.motion_character && <div style={{ color: '#525252' }}><strong>Motion:</strong> {brief.visual_direction.motion_character}</div>}
                            {brief.visual_direction.image_gen_opportunities && brief.visual_direction.image_gen_opportunities.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Imagen prompts ({brief.visual_direction.image_gen_opportunities.length})</div>
                                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
                                        {brief.visual_direction.image_gen_opportunities.slice(0, 5).map((p, i) => <li key={i} style={{ color: '#525252', marginBottom: 2 }}>{p}</li>)}
                                    </ul>
                                </div>
                            )}
                        </Section>
                    )}
                    {brief.success_criteria && brief.success_criteria.length > 0 && (
                        <Section title={`SUCCESS CRITERIA (${brief.success_criteria.length})`}>
                            <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.success_criteria.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}</ul>
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#0D0D0D', textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
        <div>{children}</div>
    </div>
);

const ProductBriefsGrid: React.FC<{
    briefs: ProductBriefForCard[];
    meta: { brand: 'NXT' | 'NU'; basedOn?: string; researchGoal?: string; originalConcept: string };
    onApprove: (brief: ProductBriefForCard, customization?: string) => void;
}> = ({ briefs, meta, onApprove }) => {
    const [building, setBuilding] = useState<string | null>(null);
    return (
        <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#525252', textTransform: 'uppercase', marginBottom: 8 }}>
                {briefs.length} BRIEFS · BRAND {meta.brand} · PICK ONE
            </div>
            {briefs.map((b, i) => (
                <ProductBriefCard
                    key={b.id || i}
                    brief={b}
                    idx={i}
                    brand={meta.brand}
                    isBuilding={building === (b.id || `brief-${i}`)}
                    onApprove={(brief, customization) => {
                        setBuilding(brief.id || `brief-${i}`);
                        onApprove(brief, customization);
                    }}
                />
            ))}
        </div>
    );
};

// Single tile renderer extracted so the grid can render groups (e.g.,
// initiative-dependent vs. independent) with the same template.
const RecommendationTileCard: React.FC<{ tile: RecommendationTile; idx: number; onPickCommand: (cmd: string) => void; context?: EngagementContext; onExportSlide?: (tile: RecommendationTile) => void; isExporting?: boolean; brand?: BrandId; engagementSlug?: string; deliverableId?: string }> = ({ tile, idx, onPickCommand, context, onExportSlide, isExporting, brand, engagementSlug, deliverableId }) => {
    const labels = labelsFromContext(context);
    const [expanded, setExpanded] = useState(false);
    const riskColor = tile.risk_level === 'high' ? '#CC6644'
        : tile.risk_level === 'medium' ? '#FD8E2E'
        : tile.risk_level === 'low' ? '#0CCE6B' : '#888';
    // 2026-05-12 - Sprint 2 VS-Multi: visually differentiate consensus
    // tiles (brand-accent top border) from non-obvious bet tiles (cyan top
    // border + BET badge in top-right corner of the thumbnail). Consensus
    // accent flips chartreuse → NU red when brand=NU; bets stay cyan across
    // both brands (cyan + red has strong contrast and cyan + chartreuse stays
    // the visual signature of NXT non-obvious bets).
    const isBet = tile.frame === 'non_obvious_bet';
    const consensusAccent = brand === 'nu' ? '#C8102E' : '#B8B800';
    const frameAccent = isBet ? '#00B7C3' : consensusAccent;
    // Resolve generic field names with legacy fallback so older saved
    // sessions still render and so the new context-aware schema works
    // alongside the deprecated CLR/first-year-specific field names.
    const whyMatters = tile.why_matters_target_segment || tile.why_matters_first_year || '';
    const longTerm = tile.long_term_outcome_through_line || tile.long_term_coop_readiness || '';
    const initiativeDeps = tile.initiative_dependency_explanation || tile.clr_dependency_explanation || '';
    const stackExec = tile.execution_in_existing_stack || tile.execution_in_nu_stack || '';
    const stackFit = tile.preferred_stack_fit || tile.microsoft_copilot_fit || '';
    const guardrailFit = tile.stakeholder_guardrail_fit || tile.guardrail_fit || '';
    const initiativeDep = typeof tile.initiative_dependent === 'boolean' ? tile.initiative_dependent
        : (typeof (tile as any).clr_dependent === 'boolean' ? (tile as any).clr_dependent : null);
    const groupKind = tile.group;
    const isInitiativeDependent = initiativeDep === true || groupKind === 'initiative_dependent' || groupKind === 'clr_dependent';
    const hasDepth = !!(tile.description || whyMatters || longTerm
        || initiativeDeps || stackExec || stackFit
        || (tile.key_stakeholders && tile.key_stakeholders.length > 0)
        || (tile.implementation_steps && tile.implementation_steps.length > 0)
        || (tile.risks_constraints && tile.risks_constraints.length > 0)
        || guardrailFit || tile.expected_impact || tile.verbatim_quote_evidence);
    const sectionLabel = (s: string) => (
        <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>{s}</div>
    );
    const paragraph = (text: string) => (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#262626' }}>{text}</div>
    );
    // 2026-06-05 - Per-tile id for the gold-pipeline DOM capture. The deck-export
    // path (exportTile / exportDeck) reads `#rec-tile-${slug}` to snapshot each
    // rendered tile at native 1920×1080 and ship through /api/gold/export-pptx-multi.
    // Slug is the deterministic key; falls back to a stable per-index when absent.
    const _tileCaptureId = `rec-tile-${tile.slug || `idx-${idx}`}`;
    return (
        <div id={_tileCaptureId} style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderTop: `3px solid ${frameAccent}`,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Archivo, sans-serif',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {isBet && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                }}>
                    <span style={{
                        padding: '3px 8px',
                        background: '#00B7C3',
                        color: '#0D0D0D',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                    }}>Non-Obvious Bet</span>
                    {typeof tile.probability === 'number' && (
                        <span style={{
                            padding: '2px 7px',
                            background: 'rgba(13,13,13,0.85)',
                            color: '#00B7C3',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            letterSpacing: 1,
                        }}>p = {tile.probability.toFixed(3)}</span>
                    )}
                </div>
            )}
            {!isBet && typeof tile.probability === 'number' && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 5,
                    padding: '2px 7px',
                    background: 'rgba(13,13,13,0.7)',
                    color: '#B8B800',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1,
                }}>p = {tile.probability.toFixed(3)}</div>
            )}
            {/* 16:9 thumbnail */}
            <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%',
                background: tile.image_data
                    ? `#0D0D0D url("${tile.image_data}") center/cover no-repeat`
                    : 'linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 60%, #2a2a2a 100%)',
                overflow: 'hidden',
            }}>
                {!tile.image_data && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#B8B800',
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        opacity: 0.6,
                    }}>
                        generating thumbnail...
                    </div>
                )}
            </div>
            {/* Body */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                    <div style={{
                        fontSize: 9, color: '#B8B800', fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                    }}>
                        <span>Concept · {tile.slug || `idea-${idx + 1}`}</span>
                        {tile.risk_level && (
                            <span style={{ color: riskColor }}>{tile.risk_level.toUpperCase()} RISK</span>
                        )}
                    </div>
                    <div style={{
                        fontSize: 16, fontWeight: 400, color: '#0D0D0D', lineHeight: 1.1,
                        fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, textTransform: 'uppercase',
                    }}>{tile.title}</div>
                </div>
                {tile.thesis && (
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: '#262626' }}>{tile.thesis}</div>
                )}
                {(tile.persona || tile.moment || tile.aha_interaction) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, lineHeight: 1.4 }}>
                        {tile.persona && (<div><span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>For</span><span style={{ color: '#262626' }}>{tile.persona}</span></div>)}
                        {tile.moment && (<div><span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Moment</span><span style={{ color: '#262626' }}>{tile.moment}</span></div>)}
                        {tile.aha_interaction && (<div><span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Aha</span><span style={{ color: '#262626' }}>{tile.aha_interaction}</span></div>)}
                    </div>
                )}
                {/* Execution depth - only renders fields the model populated */}
                {(tile.execution_path || tile.existing_stack_reuse || tile.non_starter_check || tile.effort_estimate) && (
                    <div style={{ paddingTop: 8, borderTop: '1px dashed #E5E5E5', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {tile.execution_path && (
                            <div style={{ fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                <span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Build</span>
                                {tile.execution_path}
                            </div>
                        )}
                        {tile.existing_stack_reuse && (
                            <div style={{ fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                <span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Stack</span>
                                {tile.existing_stack_reuse}
                            </div>
                        )}
                        {tile.non_starter_check && (
                            <div style={{ fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                <span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Check</span>
                                {tile.non_starter_check}
                            </div>
                        )}
                        {tile.effort_estimate && (
                            <div style={{ fontSize: 11, color: '#262626' }}>
                                <span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Effort</span>
                                {tile.effort_estimate}
                            </div>
                        )}
                    </div>
                )}
                {tile.ai_capabilities.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tile.ai_capabilities.slice(0, 6).map((cap, ci) => (
                            <span key={ci} style={{
                                display: 'inline-block', padding: '2px 7px', fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
                                background: '#0D0D0D', color: '#00B7C3', textTransform: 'lowercase',
                            }}>{cap}</span>
                        ))}
                    </div>
                )}
                {Array.isArray(tile.evidence_sources) && tile.evidence_sources.length > 0 && (
                    <div style={{ fontSize: 10, color: '#525252', lineHeight: 1.35 }}>
                        <span style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Cites</span>
                        {tile.evidence_sources.slice(0, 4).join(' · ')}
                    </div>
                )}
                {hasDepth && (
                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px dashed #E5E5E5' }}>
                        <button
                            onClick={() => setExpanded(e => !e)}
                            style={{
                                width: '100%', textAlign: 'left',
                                background: expanded ? '#0D0D0D' : '#F5F5F0',
                                color: expanded ? '#B8B800' : '#0D0D0D',
                                border: `1px solid ${expanded ? '#0D0D0D' : '#E5E5E5'}`,
                                padding: '7px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                        >
                            <span>{expanded ? '- Collapse Consulting Brief' : '+ Expand Full Consulting Brief'}</span>
                            <span style={{ fontSize: 9, opacity: 0.7 }}>{expanded ? '▲' : '▼'}</span>
                        </button>
                        {expanded && (
                            <div style={{ marginTop: 8, padding: '10px 12px', background: '#FAFAFA', border: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(groupKind || initiativeDep !== null) && (
                                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, textTransform: 'uppercase', color: isInitiativeDependent ? '#00B7C3' : '#B8B800', marginBottom: 4 }}>
                                        {context?.named_initiative
                                            ? (isInitiativeDependent ? `${context.named_initiative}-Dependent Recommendation` : `${context.named_initiative}-Independent Recommendation`)
                                            : (isInitiativeDependent ? 'Initiative-Dependent Recommendation' : 'Initiative-Independent Recommendation')}
                                    </div>
                                )}
                                {tile.description && (<>{sectionLabel('Description')}{paragraph(tile.description)}</>)}
                                {isBet && tile.diverges_from && (
                                    <>
                                        {sectionLabel('Why this is a Non-Obvious Bet (how it diverges from consensus)')}
                                        <div style={{ fontSize: 12, lineHeight: 1.5, padding: '8px 12px', background: '#0D0D0D', color: '#00B7C3', borderLeft: '3px solid #00B7C3' }}>{tile.diverges_from}</div>
                                    </>
                                )}
                                {whyMatters && (<>{sectionLabel(labels.whyMatters)}{paragraph(whyMatters)}</>)}
                                {longTerm && (<>{sectionLabel(labels.longTerm)}{paragraph(longTerm)}</>)}
                                {initiativeDeps && (<>{sectionLabel(isInitiativeDependent ? labels.initiativeDependsTrue : labels.initiativeDependsFalse)}{paragraph(initiativeDeps)}</>)}
                                {stackExec && (<>{sectionLabel(labels.executionStack)}{paragraph(stackExec)}</>)}
                                {stackFit && (<>{sectionLabel(labels.stackFit)}{paragraph(stackFit)}</>)}
                                {Array.isArray(tile.key_stakeholders) && tile.key_stakeholders.length > 0 && (
                                    <>
                                        {sectionLabel('Key stakeholders')}
                                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                                            {tile.key_stakeholders.map((s, si) => (
                                                <li key={si}><strong>{s.name_or_role}:</strong> {s.involvement}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                {Array.isArray(tile.implementation_steps) && tile.implementation_steps.length > 0 && (
                                    <>
                                        {sectionLabel('Implementation steps')}
                                        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                                            {tile.implementation_steps.map((s, si) => (
                                                <li key={si} style={{ marginBottom: 4 }}>
                                                    <div>{s.step}</div>
                                                    <div style={{ fontSize: 10, color: '#525252', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                                                        owner: {s.owner || '-'} · effort: {s.estimated_effort || '-'}{s.dependencies && s.dependencies.length > 0 ? ` · depends on: ${s.dependencies.join(', ')}` : ''}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    </>
                                )}
                                {Array.isArray(tile.risks_constraints) && tile.risks_constraints.length > 0 && (
                                    <>
                                        {sectionLabel('Risks & constraints')}
                                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                                            {tile.risks_constraints.map((r, ri) => {
                                                const sev = (r.severity || '').toLowerCase();
                                                const sevColor = sev === 'high' ? '#CC6644' : sev === 'medium' ? '#FD8E2E' : '#0CCE6B';
                                                return (
                                                    <li key={ri} style={{ marginBottom: 4 }}>
                                                        <span style={{ display: 'inline-block', padding: '1px 6px', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', background: sevColor, color: '#FFFFFF', marginRight: 6 }}>{sev || 'med'}</span>
                                                        <strong>{r.risk}</strong> - <span style={{ color: '#525252' }}>{r.mitigation}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                )}
                                {guardrailFit && (<>{sectionLabel(labels.guardrails)}{paragraph(guardrailFit)}</>)}
                                {tile.expected_impact && (<>{sectionLabel('Expected impact')}{paragraph(tile.expected_impact)}</>)}
                                {tile.verbatim_quote_evidence && (
                                    <>
                                        {sectionLabel('Verbatim corpus evidence')}
                                        <blockquote style={{ margin: 0, padding: '8px 12px', borderLeft: '3px solid #B8B800', background: '#FFFFFF', fontSize: 12, lineHeight: 1.5, color: '#262626', fontStyle: 'italic' }}>
                                            {tile.verbatim_quote_evidence}
                                        </blockquote>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {/* 2026-05-12 - Single-tile slide export. Renders this recommendation
                    as a stand-alone .pptx using the existing `recommendation` slide
                    template (with image + persona context + impact strip extensions).
                    Brand-locked to NXT by default; the accent color and framing tag
                    reflect the tile's consensus/bet identity. Disabled while another
                    export is in flight to prevent racing PPTX writes. */}
                {onExportSlide && (
                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px dashed #E5E5E5' }}>
                        <button
                            onClick={() => onExportSlide(tile)}
                            disabled={isExporting}
                            title="Export this recommendation as a single .pptx slide with its image and full consulting depth"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                background: isExporting ? '#F5F5F0' : '#FFFFFF',
                                border: `1px solid ${frameAccent}`,
                                cursor: isExporting ? 'wait' : 'pointer',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 9.5,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                color: isExporting ? '#888' : '#0D0D0D',
                                fontWeight: 700,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background 120ms, color 120ms, border-color 120ms',
                            }}
                            onMouseEnter={e => {
                                if (isExporting) return;
                                (e.currentTarget as HTMLButtonElement).style.background = frameAccent;
                                (e.currentTarget as HTMLButtonElement).style.color = '#0D0D0D';
                            }}
                            onMouseLeave={e => {
                                if (isExporting) return;
                                (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
                                (e.currentTarget as HTMLButtonElement).style.color = '#0D0D0D';
                            }}
                        >
                            <span>{isExporting ? 'Preparing slide...' : '↓ Export as slide (#slide)'}</span>
                            <span style={{ fontSize: 8, opacity: 0.7 }}>.pptx</span>
                        </button>
                    </div>
                )}
                {tile.variants.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, paddingTop: 8, borderTop: '1px dashed #E5E5E5' }}>
                        <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Build it</div>
                        {tile.variants.map((v, vi) => (
                            <button
                                key={vi}
                                onClick={() => onPickCommand(v.command)}
                                title={`Pre-fill: ${v.command}`}
                                style={{
                                    textAlign: 'left', padding: '6px 9px', background: '#F5F5F0',
                                    border: '1px solid #E5E5E5', cursor: 'pointer',
                                    fontFamily: 'Archivo, sans-serif', fontSize: 11, color: '#0D0D0D',
                                    lineHeight: 1.3, transition: 'background 120ms, border-color 120ms',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0D0D0D'; (e.currentTarget as HTMLButtonElement).style.color = '#B8B800'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#0D0D0D'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F0'; (e.currentTarget as HTMLButtonElement).style.color = '#0D0D0D'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E5E5'; }}
                            >
                                <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>{v.label}</div>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, opacity: 0.75, marginTop: 1 }}>{v.command}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* 2026-05-23 - P2.3 (Sprint H5): Copy-as-prompt button. Lifts the
                tile's full content into a structured chat prompt the user can
                paste into ChatGPT/Claude/Gemini elsewhere, or back into this
                chat for refinement. Promised in plans/html-as-default-output-
                uplift.md Sprint H5 but only ever shipped on the artifact /view
                wrapper - finally landing on recommendation tiles per the
                honest audit. */}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #E5E5E5', display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                    onClick={async () => {
                        const prompt = `Refine the following AI tool recommendation. Keep the core idea but strengthen the implementation depth, add specific named technologies, and ground every claim in named evidence.\n\n` +
                            `Title: ${tile.title}\n` +
                            `Slug: ${tile.slug || ''}\n` +
                            `Frame: ${tile.frame || 'mainstream'}\n` +
                            `Risk level: ${tile.risk_level || 'medium'}\n` +
                            ((tile as any).overview ? `Overview: ${(tile as any).overview}\n` : '') +
                            (Array.isArray((tile as any).why_it_matters) ? `Why it matters: ${(tile as any).why_it_matters.join('; ')}\n` : '') +
                            (Array.isArray((tile as any).execution_steps) ? `Execution steps: ${(tile as any).execution_steps.join('; ')}\n` : '');
                        try {
                            await navigator.clipboard.writeText(prompt);
                        } catch {
                            // clipboard unavailable - render fallback prompt in alert
                            alert(prompt);
                        }
                    }}
                    style={{
                        fontSize: 8, padding: '3px 8px', background: 'transparent',
                        color: '#525252', border: '1px solid #DDD', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace",
                    }}
                    title="Copy this tile as a structured prompt - paste into another chat or refine here."
                >
                    ↗ Copy as prompt
                </button>
            </div>
            {/* 2026-05-23 - P1.3: Per-tile FeedbackWidget. The audit caught that
                FeedbackWidget was rendered only at the chat-bubble level and
                no sectionScope was passed from per-deliverable renderers. Now
                every recommendation tile has its own targeted feedback widget
                that scopes to the specific tile slug, so user feedback like
                "this concept is generic" lands as a constraint on THIS tile,
                not the whole deliverable. */}
            {engagementSlug && deliverableId && tile.slug && (
                <FeedbackWidget
                    engagement_slug={engagementSlug}
                    deliverable_id={deliverableId}
                    deliverable_type="recommendations"
                    section_scope={tile.slug}
                    compact
                />
            )}
        </div>
    );
};
// 2026-05-11 - Engagement context header rendered ABOVE the analytical
// preamble. Shows the brand/industry/segment/initiative/stack the model
// extracted from the user's prompt so the user can sanity-check that the
// system understood the engagement before evaluating concepts.
const EngagementContextBlock: React.FC<{ context: EngagementContext }> = ({ context }) => {
    const stakeholders = context.named_stakeholders || [];
    const pill = (label: string, value: string | undefined | null) => value ? (
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '4px 9px', background: '#0D0D0D', color: '#FFFFFF', marginRight: 6, marginBottom: 6, border: '1px solid #0D0D0D' }}>
            <span style={{ fontSize: 8, color: '#B8B800', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontSize: 12, color: '#FFFFFF' }}>{value}</span>
        </div>
    ) : null;
    const arrayChip = (items: string[]) => items.filter(Boolean).map((v, i) => (
        <span key={i} style={{ display: 'inline-block', padding: '2px 7px', fontSize: 10, fontFamily: 'Archivo, sans-serif', background: '#FAFAFA', color: '#0D0D0D', border: '1px solid #E5E5E5', marginRight: 4, marginBottom: 4 }}>{v}</span>
    ));
    return (
        <div style={{ marginTop: 10, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderLeft: '3px solid #00B7C3' }}>
            <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Engagement Context (extracted from your prompt + uploads)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {pill('Client', context.client_name)}
                {pill('Industry', context.industry)}
                {pill('Vendor', context.vendor_or_consultant)}
                {pill('Target segment', context.target_segment)}
                {pill('Initiative', context.named_initiative || undefined)}
                {pill('Outcome window', context.target_outcome_window)}
            </div>
            {context.engagement_objective && (
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                    <span style={{ fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginRight: 6 }}>Objective</span>
                    {context.engagement_objective}
                </div>
            )}
            {Array.isArray(context.preferred_tech_stack) && context.preferred_tech_stack.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Preferred tech stack</div>
                    {arrayChip(context.preferred_tech_stack)}
                </div>
            )}
            {Array.isArray(context.existing_systems) && context.existing_systems.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Existing systems</div>
                    {arrayChip(context.existing_systems)}
                </div>
            )}
            {Array.isArray(context.hard_non_starters) && context.hard_non_starters.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: '#CC6644', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Hard non-starters</div>
                    {arrayChip(context.hard_non_starters)}
                </div>
            )}
            {Array.isArray(context.regulatory_constraints) && context.regulatory_constraints.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Regulatory constraints</div>
                    {arrayChip(context.regulatory_constraints)}
                </div>
            )}
            {stakeholders.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Named stakeholders</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {stakeholders.map((s, si) => (
                            <span key={si} style={{ display: 'inline-block', padding: '3px 8px', fontSize: 11, fontFamily: 'Archivo, sans-serif', background: '#0D0D0D', color: '#B8B800', border: '1px solid #0D0D0D' }}>
                                {s.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// 2026-05-11 - Analytical preamble block rendered above the tile grid.
// Surfaces stakeholder priorities, design principles, ideas-to-retire, and
// guardrail validation criteria the model extracted from the user prompt +
// uploads. Mirrors the "Additional Analysis Requirements" section of a
// consulting brief.
const RecommendationPreambleBlock: React.FC<{ preamble: RecommendationPreamble }> = ({ preamble }) => {
    const stakeholders = preamble?.stakeholder_priorities || [];
    const principles = preamble?.design_principles || [];
    const retire = preamble?.ideas_to_retire_or_reframe || [];
    const criteria = preamble?.guardrail_validation_criteria || [];
    if (stakeholders.length + principles.length + retire.length + criteria.length === 0) return null;
    return (
        <div style={{ marginTop: 12, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderLeft: '3px solid #B8B800' }}>
            <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Meeting Guardrails & Validation Criteria
            </div>
            {stakeholders.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, color: '#0D0D0D', marginBottom: 6 }}>Stakeholder priorities</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                        {stakeholders.map((s, si) => (
                            <div key={si} style={{ padding: 10, background: '#FAFAFA', border: '1px solid #E5E5E5' }}>
                                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 1, color: '#0D0D0D', marginBottom: 4 }}>{s.name}</div>
                                {Array.isArray(s.stated_priorities) && s.stated_priorities.length > 0 && (
                                    <>
                                        <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>Priorities</div>
                                        <ul style={{ margin: '2px 0 0 0', paddingLeft: 16, fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                            {s.stated_priorities.map((p, pi) => <li key={pi}>{p}</li>)}
                                        </ul>
                                    </>
                                )}
                                {Array.isArray(s.stated_non_starters) && s.stated_non_starters.length > 0 && (
                                    <>
                                        <div style={{ fontSize: 9, color: '#CC6644', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>Non-starters</div>
                                        <ul style={{ margin: '2px 0 0 0', paddingLeft: 16, fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                            {s.stated_non_starters.map((p, pi) => <li key={pi}>{p}</li>)}
                                        </ul>
                                    </>
                                )}
                                {Array.isArray(s.stated_preferences) && s.stated_preferences.length > 0 && (
                                    <>
                                        <div style={{ fontSize: 9, color: '#00B7C3', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>Preferences</div>
                                        <ul style={{ margin: '2px 0 0 0', paddingLeft: 16, fontSize: 11, lineHeight: 1.4, color: '#262626' }}>
                                            {s.stated_preferences.map((p, pi) => <li key={pi}>{p}</li>)}
                                        </ul>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {principles.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, color: '#0D0D0D', marginBottom: 6 }}>Design principles</div>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                        {principles.map((p, pi) => <li key={pi} style={{ marginBottom: 2 }}>{p}</li>)}
                    </ol>
                </div>
            )}
            {retire.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, color: '#0D0D0D', marginBottom: 6 }}>Ideas to retire or reframe</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                        {retire.map((r, ri) => (
                            <li key={ri} style={{ marginBottom: 4 }}>
                                <strong>{r.prior_idea}:</strong> {r.reason_to_retire_or_reframe}
                                {r.reframed_as ? <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: '#525252' }}>Reframed as: {r.reframed_as}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {criteria.length > 0 && (
                <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, color: '#0D0D0D', marginBottom: 6 }}>Guardrail validation criteria</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                        {criteria.map((c, ci) => <li key={ci} style={{ marginBottom: 2 }}>{c}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

const RecommendationComparisonTable: React.FC<{ table: { headers: string[]; rows: string[][] } }> = ({ table }) => {
    const headers = Array.isArray(table?.headers) ? table.headers : [];
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    if (headers.length === 0 || rows.length === 0) return null;
    return (
        <div style={{ marginTop: 14, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderLeft: '3px solid #00B7C3', overflowX: 'auto' }}>
            <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Concept Comparison
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Archivo, sans-serif' }}>
                <thead>
                    <tr>
                        {headers.map((h, hi) => (
                            <th key={hi} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #0D0D0D', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#0D0D0D' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid #E5E5E5' }}>
                            {(Array.isArray(r) ? r : []).map((cell, ci) => (
                                <td key={ci} style={{ padding: '6px 8px', verticalAlign: 'top', color: '#262626', lineHeight: 1.4 }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const RecommendationPrioritizationBlock: React.FC<{ priorities: Array<{ rank: number; slug: string; rationale: string }> }> = ({ priorities }) => {
    const sorted = [...priorities].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    return (
        <div style={{ marginTop: 14, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderLeft: '3px solid #B8B800' }}>
            <div style={{ fontSize: 9, color: '#525252', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Recommended Prioritization
            </div>
            <ol style={{ margin: 0, paddingLeft: 22, fontSize: 12, lineHeight: 1.5, color: '#262626' }}>
                {sorted.map((p, pi) => (
                    <li key={pi} style={{ marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 1, color: '#0D0D0D', marginRight: 8 }}>{p.slug}</span>
                        <span>{p.rationale}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
};

const RecommendationNextStepsBlock: React.FC<{ steps: string[] }> = ({ steps }) => (
    <div style={{ marginTop: 14, padding: '14px 16px', background: '#0D0D0D', borderLeft: '3px solid #B8B800', color: '#FFFFFF' }}>
        <div style={{ fontSize: 9, color: '#B8B800', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Suggested Next Steps for the Proposal
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: '#E5E5E5' }}>
            {steps.map((s, si) => <li key={si} style={{ marginBottom: 4 }}>{s}</li>)}
        </ul>
    </div>
);

const RecommendationTilesGrid: React.FC<RecommendationTilesGridProps> = ({ tiles, onPickCommand, context, brand, autoExport, engagementSlug, deliverableId }) => {
    // 2026-05-12 - Slide export plumbing for #recommendations tiles.
    //
    // Affordances:
    //   • Per-tile  "Export as slide"  - single .pptx with brand + image
    //   • Per-frame "Export {section}" - section-divider + all tiles in that frame
    //   • Master    "Export all"        - full deck (consensus then bets, with dividers)
    //   • AUTO-EXPORT on mount when #slides was in the query - fires the master deck
    //     export 600ms after render so the user sees tiles AND receives the download
    //     in one motion. Composes with #NXT / #NU brand.
    //
    // All three use safeDynamicImport so a stale-bundle chunk-load failure
    // triggers the global ChunkLoadGuard reload instead of leaking a confusing
    // error.
    const resolvedBrandId: BrandId = brand || 'nxt';
    const [exportingId, setExportingId] = useState<string | null>(null);
    // 2026-06-05 - STRUCTURAL REWIRE. Per-tile + per-deck rec exports now route
    // through the gold pipeline (captureSlideAsStageHtml → exportGoldDeckPptx),
    // matching the chat preview pixel-for-pixel. Replaces the
    // tileToExportSlidesMulti + exportDeckToPPTX path that re-implemented the
    // tile layout in pptxgenjs and drifted from the preview. Each rec tile is
    // mounted with id `rec-tile-${slug}`; we capture that rendered DOM at
    // native 1920×1080 and send the array to /api/gold/export-pptx-multi.
    // Result: one editable pptx slide PER TILE matching the visible card -
    // no more 5-slide-per-tile expansion (that was a separate concern; the
    // user explicitly asked for preview-export parity).
    const _captureTileDoms = useCallback(async (
        tilesToCapture: RecommendationTile[],
    ): Promise<string[]> => {
        // 2026-06-05 - Resolution fix. Was using captureSlideAsStageHtml on
        // the chat tile DOM (rec-tile-${slug}); those tiles are 800-960px
        // responsive cards with font-sizes too small to read at 1920×1080.
        // Structural answer: convert each tile to a SlideData (template =
        // 'recommendation') and feed it through slideDataToStageHtml. The
        // result is a fresh 1920×1080 #stage HTML doc with native typography.
        const { slideDataToStageHtml } = await import('../services/slideToStageHtml');
        const htmlList: string[] = [];
        for (let i = 0; i < tilesToCapture.length; i++) {
            const t = tilesToCapture[i];
            try {
                // Map the tile shape onto the SlideData recommendation contract.
                const slideData = {
                    id: `rec-tile-${t.slug || `idx-${i}`}`,
                    template: 'recommendation' as const,
                    brand: (resolvedBrandId === 'nu' ? 'nu' : 'nxt') as ('nxt' | 'nu'),
                    title: t.title || 'Recommendation',
                    sources: ((t as any).sources || []) as string[],
                    recommendation: {
                        actionTitle: ((t as any).action_title || (t as any).thesis || t.title) as string,
                        rationale: ((t as any).description || (t as any).why_matters_target_segment || (t as any).why_matters_first_year || '') as string,
                        supportingActions: Array.isArray((t as any).implementation_steps)
                            ? (t as any).implementation_steps.slice(0, 3).map((step: any, idx: number) => ({
                                name: (step as any).name || `Step ${idx + 1}`,
                                description: (step as any).description || String(step),
                            }))
                            : [],
                        impactMetric: (t as any).impactMetric || ((t as any).expected_impact ? {
                            value: (t as any).expected_impact?.value || '',
                            label: (t as any).expected_impact?.label || 'Expected impact',
                        } : undefined),
                        impactGrid: (t as any).impactGrid,
                        evidence: Array.isArray((t as any).evidence)
                            ? (t as any).evidence.slice(0, 2)
                            : (t as any).verbatim_quote_evidence ? [{
                                text: (t as any).verbatim_quote_evidence,
                                source: ((t as any).sources && (t as any).sources[0]) || 'corpus',
                                attribution: '',
                            }] : [],
                        implication: ((t as any).long_term_outcome_through_line
                            || (t as any).long_term_coop_readiness
                            || '') as string,
                    },
                };
                htmlList.push(slideDataToStageHtml(slideData as any));
            } catch (e: any) {
                console.warn(`[#recommendations] tile render failed for ${t.slug || t.title}:`, e?.message || e);
            }
        }
        return htmlList;
    }, [resolvedBrandId]);

    const exportTile = useCallback(async (tile: RecommendationTile) => {
        if (exportingId) return;
        setExportingId(tile.slug || tile.title);
        try {
            const { exportGoldDeckPptx } = await import('../services/goldArtifact');
            const htmlList = await _captureTileDoms([tile]);
            if (htmlList.length === 0) throw new Error('Tile DOM capture failed');
            const safeSlug = (tile.slug || tile.title || 'recommendation')
                .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
            const filename = `${safeSlug}-${resolvedBrandId.toLowerCase()}.pptx`;
            await exportGoldDeckPptx(htmlList, filename);
        } catch (e: any) {
            console.warn('[#recommendations] single-tile gold export failed:', e?.message || e);
            alert(`Slide export failed: ${e?.message || 'unknown error'}`);
        } finally {
            setExportingId(null);
        }
    }, [exportingId, resolvedBrandId, _captureTileDoms]);

    const [exportingDeck, setExportingDeck] = useState<'consensus' | 'bets' | 'all' | null>(null);
    const exportDeck = useCallback(async (mode: 'consensus' | 'bets' | 'all') => {
        if (exportingDeck) return;
        setExportingDeck(mode);
        try {
            const { exportGoldDeckPptx } = await import('../services/goldArtifact');
            const allTiles = (tiles || []).map(t => ({
                ...t,
                ai_capabilities: Array.isArray(t?.ai_capabilities) ? t.ai_capabilities : [],
                variants: Array.isArray(t?.variants) ? t.variants : [],
            }));
            const consensus = allTiles.filter(t => t.frame === 'defensible_consensus' || !t.frame);
            const bets = allTiles.filter(t => t.frame === 'non_obvious_bet');
            const selected: RecommendationTile[] = (
                mode === 'bets' ? bets :
                mode === 'consensus' ? consensus :
                [...consensus, ...bets]
            ) as RecommendationTile[];
            if (selected.length === 0) {
                alert('Nothing to export - no tiles in that section.');
                return;
            }
            const htmlList = await _captureTileDoms(selected);
            if (htmlList.length === 0) throw new Error('No tile DOM captures succeeded');
            const deckLabel = mode === 'all' ? 'recommendations'
                : mode === 'consensus' ? 'defensible-consensus'
                : 'non-obvious-bets';
            const filename = `${deckLabel}-${resolvedBrandId.toLowerCase()}.pptx`;
            await exportGoldDeckPptx(htmlList, filename);
        } catch (e: any) {
            console.warn('[#recommendations] gold deck export failed:', e?.message || e);
            alert(`Deck export failed: ${e?.message || 'unknown error'}`);
        } finally {
            setExportingDeck(null);
        }
    }, [exportingDeck, tiles, resolvedBrandId, _captureTileDoms]);

    // 2026-05-12 - Auto-export on mount when user typed `#slides` or `#slide`
    // alongside `#recommendations`. Fires exactly once (StrictMode-safe via ref)
    // 600ms after the tiles render so the user sees them BEFORE the download fires.
    const autoExportFiredRef = useRef(false);
    useEffect(() => {
        if (autoExportFiredRef.current) return;
        if (!autoExport) return;
        if (!tiles || tiles.length === 0) return;
        autoExportFiredRef.current = true;
        const handle = window.setTimeout(() => {
            if (autoExport === 'deck') {
                console.log(`[#recommendations] auto-exporting full deck (#slides + #${resolvedBrandId.toUpperCase()})`);
                exportDeck('all');
            } else if (autoExport === 'single' && tiles.length > 0) {
                console.log(`[#recommendations] auto-exporting strongest tile (#slide + #${resolvedBrandId.toUpperCase()})`);
                exportTile(tiles[0]);
            }
        }, 600);
        return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);  // intentionally fire-once on mount

    // Defensive: tiles may arrive from a persisted session with missing arrays.
    const safeTiles = (tiles || []).map(t => ({
        ...t,
        ai_capabilities: Array.isArray(t?.ai_capabilities) ? t.ai_capabilities : [],
        variants: Array.isArray(t?.variants) ? t.variants : [],
    }));
    // Resolve a tile's dependency flag from either the generic field
    // (initiative_dependent) or the legacy CLR-specific one.
    const depOf = (t: RecommendationTile): boolean | null => {
        if (typeof t.initiative_dependent === 'boolean') return t.initiative_dependent;
        if (typeof (t as any).clr_dependent === 'boolean') return (t as any).clr_dependent;
        if (t.group === 'initiative_dependent' || t.group === 'clr_dependent') return true;
        if (t.group === 'initiative_independent' || t.group === 'clr_independent') return false;
        return null;
    };
    const initiative = context?.named_initiative?.trim() || 'Initiative';

    // 2026-05-12 - Sprint 2 VS-Multi: PRIMARY grouping is by frame
    // (defensible_consensus vs non_obvious_bet). If any tile carries a
    // frame, render two top-level sections in that order. Otherwise fall
    // back to the legacy initiative_dependent grouping. Within each frame
    // section, we still respect initiative grouping if present.
    const hasFramingSplit = safeTiles.some(t => t.frame === 'non_obvious_bet') && safeTiles.some(t => t.frame === 'defensible_consensus');
    const consensusTiles = safeTiles.filter(t => t.frame === 'defensible_consensus' || !t.frame);
    const betTiles = safeTiles.filter(t => t.frame === 'non_obvious_bet');

    const frameHeader = (label: string, sub: string, count: number, accent: string) => (
        <div style={{
            marginTop: 18, marginBottom: 10,
            padding: '10px 12px',
            background: '#0D0D0D',
            borderLeft: `4px solid ${accent}`,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 12,
        }}>
            <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 11, color: '#ACACAC', marginTop: 2 }}>{sub}</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent, letterSpacing: 1.5 }}>{count} {count === 1 ? 'concept' : 'concepts'}</div>
        </div>
    );
    const renderGrid = (group: RecommendationTile[]) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {group.map((tile, idx) => (
                <RecommendationTileCard
                    key={tile.slug || idx}
                    tile={tile}
                    idx={idx}
                    onPickCommand={onPickCommand}
                    context={context}
                    onExportSlide={exportTile}
                    isExporting={exportingId === (tile.slug || tile.title)}
                    brand={resolvedBrandId}
                />
            ))}
        </div>
    );

    // Reusable section-export button. Rendered inside the frameHeader on the
    // right side, opposite the count, so each section has a one-click "Export
    // this section as deck" affordance. Brand-locked NXT for now.
    const sectionExportButton = (mode: 'consensus' | 'bets', accent: string) => (
        <button
            onClick={() => exportDeck(mode)}
            disabled={!!exportingDeck}
            title={`Export this section as a multi-slide .pptx deck (section divider + one slide per recommendation, with images and full consulting depth)`}
            style={{
                padding: '5px 10px',
                background: 'transparent',
                border: `1px solid ${accent}`,
                cursor: exportingDeck ? 'wait' : 'pointer',
                color: accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={e => {
                if (exportingDeck) return;
                (e.currentTarget as HTMLButtonElement).style.background = accent;
                (e.currentTarget as HTMLButtonElement).style.color = '#0D0D0D';
            }}
            onMouseLeave={e => {
                if (exportingDeck) return;
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = accent;
            }}
        >
            {exportingDeck === mode ? 'Preparing deck...' : '↓ Export section (#slides)'}
        </button>
    );
    // Master "export everything" button shown above the consensus group when
    // a framing split is present. One click → full deck with both sections
    // and dividers between them.
    const masterExportBar = (
        <div style={{
            marginTop: 12,
            padding: '12px 14px',
            background: '#0D0D0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            borderTop: '2px solid #B8B800',
            borderBottom: '2px solid #00B7C3',
        }}>
            <div>
                <div style={{ fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: 'uppercase' }}>Beautiful Deck Export</div>
                <div style={{ fontSize: 11, color: '#FFFFFF', marginTop: 3 }}>Every recommendation rendered as a brand-locked slide - accompanying images, persona context, AI capabilities, and impact strip preserved.</div>
            </div>
            <button
                onClick={() => exportDeck('all')}
                disabled={!!exportingDeck}
                title="Export ALL recommendations as a single .pptx deck - Defensible Consensus section + Non-Obvious Bets section, each prefaced with a section divider"
                style={{
                    padding: '10px 18px',
                    background: '#B8B800',
                    border: '1px solid #B8B800',
                    cursor: exportingDeck ? 'wait' : 'pointer',
                    color: '#0D0D0D',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap' as const,
                    transition: 'background 120ms, color 120ms',
                }}
                onMouseEnter={e => {
                    if (exportingDeck) return;
                    (e.currentTarget as HTMLButtonElement).style.background = '#0D0D0D';
                    (e.currentTarget as HTMLButtonElement).style.color = '#B8B800';
                }}
                onMouseLeave={e => {
                    if (exportingDeck) return;
                    (e.currentTarget as HTMLButtonElement).style.background = '#B8B800';
                    (e.currentTarget as HTMLButtonElement).style.color = '#0D0D0D';
                }}
            >
                {exportingDeck === 'all' ? 'Preparing deck...' : '↓ Export all as #slides'}
            </button>
        </div>
    );

    if (hasFramingSplit) {
        return (
            <div style={{ marginTop: 12 }}>
                {consensusTiles.length > 0 && (
                    <>
                        {frameHeader(
                            'Defensible Consensus',
                            'Recommendations a senior partner would present without pushback. Well-precedented, schema-congruent, low-risk to propose.',
                            consensusTiles.length,
                            '#B8B800'
                        )}
                        {renderGrid(consensusTiles)}
                    </>
                )}
                {betTiles.length > 0 && (
                    <>
                        {frameHeader(
                            'Non-Obvious Bets',
                            'Tail-of-distribution concepts the model surfaced via verbalized sampling (probability < 0.05). Surprising-but-grounded ideas a senior partner would defend as "the work that would actually move the needle".',
                            betTiles.length,
                            '#00B7C3'
                        )}
                        {renderGrid(betTiles)}
                    </>
                )}
            </div>
        );
    }

    const usesGrouping = safeTiles.some(t => typeof depOf(t) === 'boolean');
    if (!usesGrouping) {
        return (
            <div style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 14,
            }}>
                {safeTiles.map((tile, idx) => (
                    <RecommendationTileCard key={tile.slug || idx} tile={tile} idx={idx} onPickCommand={onPickCommand} context={context} brand={resolvedBrandId} onExportSlide={exportTile} isExporting={exportingId === (tile.slug || tile.title)} engagementSlug={engagementSlug} deliverableId={deliverableId} />
                ))}
            </div>
        );
    }
    const dependent = safeTiles.filter(t => depOf(t) === true);
    const independent = safeTiles.filter(t => depOf(t) === false);
    const unflagged = safeTiles.filter(t => depOf(t) === null);
    const groupHeader = (label: string, count: number) => (
        <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5,
            textTransform: 'uppercase', color: '#525252', borderBottom: '2px solid #0D0D0D',
            paddingBottom: 4, marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between',
        }}>
            <span>{label}</span><span style={{ color: '#B8B800' }}>{count}</span>
        </div>
    );
    const renderRow = (group: RecommendationTile[]) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {group.map((tile, idx) => (
                <RecommendationTileCard key={tile.slug || idx} tile={tile} idx={idx} onPickCommand={onPickCommand} context={context} engagementSlug={engagementSlug} deliverableId={deliverableId} />
            ))}
        </div>
    );
    return (
        <div style={{ marginTop: 12 }}>
            {dependent.length > 0 && (
                <>
                    {groupHeader(`${initiative}-dependent concepts`, dependent.length)}
                    {renderRow(dependent)}
                </>
            )}
            {independent.length > 0 && (
                <>
                    {groupHeader(`${initiative}-independent concepts`, independent.length)}
                    {renderRow(independent)}
                </>
            )}
            {unflagged.length > 0 && (
                <>
                    {groupHeader('Other concepts', unflagged.length)}
                    {renderRow(unflagged)}
                </>
            )}
        </div>
    );
};

// 2026-05-15 - Live processing indicator. Replaces the static "Analyzing the
// research..." placeholder with a real affordance: pulsing chartreuse dot,
// live elapsed-time counter (MM:SS, ticks every second), and the current
// status string (which the running handler can mutate by editing the
// message's content). Renders when the assistant message's content starts
// with a known processing prefix; auto-disappears the moment the handler
// replaces the placeholder with the real response.
//
// Why a self-contained component: the elapsed-time tick uses its own
// useEffect, so parent re-renders (caused by other messages arriving)
// don't reset the counter. Driven by msg.timestamp as the start anchor.
const LiveProcessingIndicator: React.FC<{
    startedAt: number;
    status: string;
    modelName?: string;
    // 2026-05-26 - Optional abort handler. When provided, renders an X
    // button on the right of the indicator. Click signals the abort
    // controller in the parent, which propagates through sendChatMessage's
    // signal param and the chat tool-loop iteration checks.
    onAbort?: () => void;
}> = ({ startedAt, status, modelName, onAbort }) => {
    const [now, setNow] = React.useState(Date.now());
    React.useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));
    const mm = Math.floor(elapsedSec / 60);
    const ss = elapsedSec % 60;
    const elapsedLabel = mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: '#0D0D0D', color: '#fff',
            borderLeft: '3px solid #B8B800',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            letterSpacing: 0.4, marginTop: 4, marginBottom: 4,
        }}>
            <span style={{
                width: 9, height: 9, borderRadius: '50%', background: '#B8B800',
                animation: 'lpi-pulse 1.2s ease-in-out infinite', flexShrink: 0,
                display: 'inline-block',
            }} />
            <span style={{ color: '#B8B800', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, fontSize: 10 }}>{elapsedLabel}</span>
            <span style={{ color: '#fff', flex: 1, lineHeight: 1.4 }}>{status}</span>
            {modelName && (
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{modelName}</span>
            )}
            {onAbort && (
                <button
                    onClick={onAbort}
                    aria-label="Abort in-flight request"
                    title="Cancel this request (kills any in-flight LLM/tool calls and frees the proxy workers)"
                    style={{
                        marginLeft: 4,
                        width: 22,
                        height: 22,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        color: '#fff',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        lineHeight: '20px',
                        textAlign: 'center',
                        padding: 0,
                        flexShrink: 0,
                        transition: 'background 120ms, border-color 120ms, color 120ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#CC3333'; e.currentTarget.style.borderColor = '#CC3333'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                >
                    {String.fromCharCode(0x00D7)}
                </button>
            )}
            <style>{`@keyframes lpi-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.35); } }`}</style>
        </div>
    );
};

// Returns true if a message's content looks like a long-running placeholder.
// Match prefixes only - handlers may append step detail (e.g. "Generating 5
// product briefs... [thinking - Pass 1/2 ...]") and we still want the
// indicator. Case-insensitive.
function isProcessingPlaceholder(content: string): boolean {
    if (!content) return false;
    const c = content.toLowerCase();
    return (
        c.startsWith('analyzing the research') ||
        c.startsWith('generating ') ||
        c.startsWith('building ') ||
        c.startsWith('composing ') ||
        c.startsWith('preparing ') ||
        c.startsWith('thinking') ||
        c.startsWith('searching ') ||
        c.startsWith('embedding ') ||
        c.startsWith('synthesizing ') ||
        c.startsWith('generating the ') ||
        c.startsWith('drafting ')
    );
}

export const CorpusChatPanel: React.FC<Props> = ({ context, getContext, isOpen, onToggle, onDeliverableApproved, onOpenDesignDesk, initialMessages, onMessagesChange, initialCachedBriefs, pipelineActive, auditReviseHandler }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
    // 2026-05-11 - Mirror messages up to the App so a session-save can
    // serialize the conversation. Effect-based callback (not inline)
    // avoids re-rendering the parent on every setState. Skipped on first
    // mount if initialMessages was supplied (the parent already has them).
    const _hasMountedRef = useRef(false);
    useEffect(() => {
        if (!_hasMountedRef.current) {
            _hasMountedRef.current = true;
            // On first render, only fire onMessagesChange if we were
            // initialized empty - otherwise the parent already has the
            // initial conversation and doesn't need an echo.
            if (!initialMessages || initialMessages.length === 0) {
                onMessagesChange?.(messages);
            }
            return;
        }
        onMessagesChange?.(messages);
    }, [messages, onMessagesChange]);
    const [input, setInput] = useState('');

    // UX-merger (2026-06-06) - Listen for 'hic:prefill-chat' events from the
    // Research Browser's "Chat about this →" CTA. Pre-fills the chat input
    // with the card's chunk pointers + title hint, so when the user hits
    // Send the manifest-chunk-retrieval contract kicks in with the right
    // chunks pinned via pickChunksForPrompt's pinnedChunkIds.
    useEffect(() => {
        const onPrefill = (ev: Event) => {
            const detail = (ev as CustomEvent).detail || {};
            const pointers: string[] = Array.isArray(detail.chunkPointers) ? detail.chunkPointers : [];
            const hint = String(detail.titleHint || '').trim();
            if (!pointers.length && !hint) return;
            const pointerBlock = pointers.length
                ? `\n\nDraw from these chunks: ${pointers.map(p => `[${p}]`).join(' ')}`
                : '';
            const composed = `Discuss the research finding: "${hint}".${pointerBlock}`;
            setInput(prev => (prev.trim() ? prev + '\n\n' + composed : composed));
            try {
                inputRef.current?.focus();
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch { /* non-fatal */ }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('hic:prefill-chat', onPrefill as EventListener);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('hic:prefill-chat', onPrefill as EventListener);
            }
        };
    }, []);

    // 2026-05-14 - T4 build-only iteration. When the parent supplies cached
    // briefs from a resumed engagement, inject them as an assistant message
    // so the user goes straight to brief-selection without re-running Pass 1+2.
    const _injectedCachedBriefsRef = useRef(false);
    useEffect(() => {
        if (_injectedCachedBriefsRef.current) return;
        if (!initialCachedBriefs || !initialCachedBriefs.briefs?.length) return;
        _injectedCachedBriefsRef.current = true;
        const cb = initialCachedBriefs;
        const briefMsg: ChatMessage = {
            id: `msg_${Date.now()}_resume`,
            role: 'assistant',
            content: `Here are the ${cb.briefs.length} product briefs from your earlier work on this engagement. Pick the one you want to turn into a working prototype and click Build - it typically takes 4-8 minutes.`,
            timestamp: Date.now(),
            prototypeBriefs: cb.briefs as any,
            prototypeBriefsMeta: cb.meta as any,
        };
        setMessages(prev => [...prev, briefMsg]);
        console.log(`[Resume] loaded ${cb.briefs.length} cached briefs from ${cb.sourceSlug} (${cb.mode})`);
    }, [initialCachedBriefs]);
    // 2026-05-14 - Prompt enhancer (Gemini Flash). Reads live engagement
    // context (research goal + recent active categories) so the rewrite is
    // grounded in what the user is actually working on.
    const enhancer = usePromptEnhancer({
        input,
        setInput,
        surface: 'analyst',
        getContext: () => {
            const live = getContext ? getContext() : context;
            const goal = live?.researchGoal || '';
            const cats = (live?.activeCategories || []).slice(0, 8).join(', ');
            return `Research goal: ${goal}${cats ? `\nActive source categories: ${cats}` : ''}`.trim();
        },
    });
    // 2026-06-12 - Model routing is AUTOMATIC (Jonathan's directive): the
    // user no longer selects models. Plain non-hashtag chat runs on
    // Gemini 3.5 Flash; any artifact hashtag force-routes the generation to
    // Claude Opus 4.8 inside sendChatMessage. The picker UI was removed; this
    // constant is the plain-chat tier and the fallback when the Anthropic
    // key is absent. (No setter on purpose - nothing may mutate it.)
    const [selectedModel] = useState<ChatModel>('gemini-3.5-flash');
    // The model actually running the CURRENT in-flight send (routed, not the
    // plain-chat default). Drives the loading indicator + progress placeholder
    // so a Fable artifact generation never displays as "Gemini 3.5 Flash".
    const [inFlightModelId, setInFlightModelId] = useState<ChatModel | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [maximized, setMaximized] = useState(false);
    const [coverageOpen, setCoverageOpen] = useState(false);
    const [skillManifest, setSkillManifest] = useState<SkillManifestEntry[]>([]);
    const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
    const [slides, setSlides] = useState<SlideData[]>([]);
    // D17 (owner-chosen 2026-07-01): attach the FULL-BLEED native GOLD exhibit image to every
    // journey/architecture/mindmap/blueprint slide so it renders wall-to-wall INLINE in the Analyst Desk
    // preview (and is already present for export). Idempotent + fail-open: guarded by a ref so we fetch
    // each slide's diagram once; on failure the slide keeps its native matrix. Runs whenever slides change.
    const diagramFetchedRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        const pending = (slides as any[]).filter(s =>
            s && !s.diagramImage && !diagramFetchedRef.current.has(s.id)
            && ['journey-map', 'architecture-map', 'mindmap', 'service-blueprint'].includes(String(s.template || '').toLowerCase()));
        if (!pending.length) return;
        let cancelled = false;
        (async () => {
            const { fetchDiagramImage } = await import('../services/diagramSpec');
            for (const s of pending) {
                diagramFetchedRef.current.add(s.id);
                try {
                    const img = await fetchDiagramImage(s, (s.brand === 'nu' ? 'nu' : 'nxt'));
                    if (img && !cancelled) setSlides(prev => prev.map(x => x.id === s.id && !x.diagramImage ? { ...x, diagramImage: img } as any : x));
                } catch { /* fail-open: native matrix */ }
            }
        })();
        return () => { cancelled = true; };
    }, [slides]);
    // 2026-05-23 - Universal safety net for artifact lifting. Tracks which
    // assistant message IDs have already had their fence content extracted
    // into the slide + deliverable canvases. Defense-in-depth against the
    // render disconnect bug the user just caught in the chunked slide path:
    // any handler that updates a message's content with :::slide or
    // :::deliverable: fence blocks gets auto-lifted into canvas state
    // here, regardless of whether the handler explicitly called the parsers.
    // No more silent "content shown as text, never rendered" failures.
    const liftedArtifactMsgIdsRef = useRef<Set<string>>(new Set());
    // 2026-05-26 - Abort controller for the in-flight chat send. The X
    // button on LiveProcessingIndicator calls abort(); the chat tool-loop
    // checks the signal at each iteration boundary and throws AbortError.
    // Single-call-at-a-time UX: handleSend already short-circuits on
    // isLoading=true, so storing a single ref (not a Map) is sufficient.
    const currentAbortRef = useRef<AbortController | null>(null);

    // 2026-05-26 - Mind-map drill-down listener. When the user clicks a
    // node in the mind-map iframe, the iframe posts a message with the
    // node label + chunk ids. We pre-populate the chat input with a
    // drill-into query targeting those chunks. The user can refine and
    // hit Send to fire the standard chat tool loop against the focused
    // evidence subset.
    useEffect(() => {
        function onMessage(evt: MessageEvent) {
            const data = evt.data as { type?: string; label?: string; chunkIds?: string[]; nodeType?: string } | undefined;
            if (!data || data.type !== 'hic.mindmap.nodeClick') return;
            if (!data.label) return;
            const chunkBlock = (data.chunkIds && data.chunkIds.length > 0)
                ? ` Targeting chunks: ${data.chunkIds.slice(0, 8).join(', ')}.`
                : '';
            const drillQuery = `Drill into the "${data.label}" cluster - what does the evidence say, who is affected, and what is the strongest finding?${chunkBlock}`;
            setInput(drillQuery);
            // Focus the chat input so the user can refine + send
            setTimeout(() => inputRef.current?.focus(), 50);
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);
    const [generatingVisualId, setGeneratingVisualId] = useState<string | null>(null);
    // USER-DIRECTED IMAGERY (2026-08-14 pivot): deck-level resolve in flight.
    const [regeneratingVisuals, setRegeneratingVisuals] = useState(false);
    // Per-slot generate-now (owner UX 2026-08-14: see the result before leaving the slide).
    const [generatingSlotKeys, setGeneratingSlotKeys] = useState<string[]>([]);
    // PROVENANCE LOCK: verification ledger rows per assistant message id.
    const [verificationLedgers, setVerificationLedgers] = useState<Record<string, LedgerRow[]>>({});
    // DF-A3: the full chain result per assistant message (slot + prose reports
    // alongside the ledger), so the UI can show WHY an artifact was flagged.
    const [chainReports, setChainReports] = useState<Record<string, ChainResult<any>>>({});

    // Verify every claim in a freshly parsed deck against its pointed corpus
    // sources; relabel/strip fabricated attributions; attach the ledger.
    // Fail-open: a verifier error never blocks the deck, it logs and skips.
    // DF-A3 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md): this
    // callback used to BE the post-generation pipeline (verify, then fix, then
    // attach). It is now one call into the ORDERED chain, so lexical scrubbing,
    // provenance, the evidence-slot gate, prose measurement and the render-plan
    // count all run in a declared sequence whose order is pinned by a test.
    // The chain never throws; each stage records a typed envelope instead.
    const verifyAndAttachLedger = useCallback(async (deckSlides: SlideData[], msgId: string) => {
        if (!deckSlides?.length) return;
        const runId = `deck_${msgId}`;
        const liveCtx = getContext ? getContext() : context;
        const { engagementSlugFor } = await import('../services/engagementSlug');
        const engagementSlug = engagementSlugFor(String(liveCtx?.researchGoal || ''));
        const result = await runArtifactChain(deckSlides as any[], {
            runId,
            artifactType: 'slides',
            subjectDomain: detectDomain(String(liveCtx?.researchGoal || '')),
            engagementSlug,
        });

        const changed = new Map<string, SlideData>();
        (result.slides as SlideData[]).forEach((f, i) => { if (f !== deckSlides[i]) changed.set(f.id, f); });
        if (changed.size) setSlides(prev => prev.map(s => changed.get(s.id) || s));

        if (result.ledger.length) setVerificationLedgers(prev => ({ ...prev, [msgId]: result.ledger }));
        setChainReports(prev => ({ ...prev, [msgId]: result }));

        const flagged = result.ledger.filter(r => r.verdict !== 'VERIFIED').length;
        console.info(`[artifact-chain] ${runId} pass=${result.pass}`, result.trace);
        console.info(`[provenance-lock] ${result.ledger.length} claim(s) checked, ${flagged} flagged (msg ${msgId})`);
        if (result.slotReport && !result.slotReport.pass) {
            // Print the violating FIELD and its claim, not the section title: the
            // first version printed `kind@title`, so two findings in one section
            // read as the same claim flagged twice, which is actively misleading
            // during the minute someone is trying to diagnose a refusal.
            console.warn(`[evidence-slots] ${result.slotReport.violations.length} violation(s), P0 coverage ${(result.slotReport.p0Coverage * 100).toFixed(0)}%`,
                result.slotReport.violations.map(v => `${v.kind} ${v.sectionId}.${v.field}: "${v.claim.slice(0, 70)}"`));
        }
        if (result.proseReport && !result.proseReport.pass) {
            console.warn(`[prose-signal] ${result.proseReport.concerns.map(c => `${c.id}=${c.score.toFixed(2)}`).join(' ')}`);
        }
        if (result.deckQualityReport && !result.deckQualityReport.pass) {
            console.warn(`[deck-quality] ${result.deckQualityReport.findings.length} finding(s), ${result.deckQualityReport.distinctArchetypes} distinct archetype(s), content ratio ${result.deckQualityReport.contentRatio}`,
                result.deckQualityReport.findings.map(f => `${f.kind}${f.template ? `@${f.template}` : ''}: ${f.detail}`));
        }

        let repairForAir: Awaited<ReturnType<typeof repairArtifact>> | null = null;
        // REPAIR PASS (2026-08-20): the 2026-08-20 live test proved the chain
        // finds real defects and nothing acted on them, so the deck shipped with
        // a console warning. The repair NARROWS unsupported claims through the
        // WS-4 edit contract; it can never add a citation, a source or a number,
        // and it is bounded by the progress guard. Survivors stay visible: the
        // final chain result is what the UI shows, not the repairer's opinion.
        if (!result.pass && result.repairInstruction) {
            const repaired = await repairArtifact(result.slides as any[], result as any, {
                runId, artifactType: 'slides', subjectDomain: detectDomain(String(liveCtx?.researchGoal || '')),
                engagementSlug,
            });
            if (repaired.rounds.length) {
                const changedByRepair = new Map<string, SlideData>();
                (repaired.slides as SlideData[]).forEach((f, i) => { if (f !== (result.slides as SlideData[])[i]) changedByRepair.set(f.id, f); });
                if (changedByRepair.size) setSlides(prev => prev.map(s => changedByRepair.get(s.id) || s));
                if (repaired.finalChain.ledger.length) setVerificationLedgers(prev => ({ ...prev, [msgId]: repaired.finalChain.ledger }));
                setChainReports(prev => ({ ...prev, [msgId]: repaired.finalChain }));
                const before = result.slotReport?.violations.length ?? 0;
                const after = repaired.finalChain.slotReport?.violations.length ?? 0;
                console.info(`[artifact-repair] ${repaired.rounds.length} round(s), ${repaired.rounds.reduce((a, r) => a + r.fieldsEdited, 0)} field(s) rewritten, violations ${before} -> ${after}${repaired.stopReason ? ` (${repaired.stopReason})` : ''}`);
            }
            repairForAir = repaired as any;
        }

        // 2026-08-21: fold the chain verdicts into the DURABLE record. AIR is
        // written at generation time, so without this it holds the model's raw
        // output plus a clean quality report, even when the chain refused the
        // artifact. Fire-and-forget: bookkeeping never blocks the deck.
        try {
            // Pass the ORIGINAL chain result, not the post-repair one. The
            // record builder derives `final` from the repair argument itself and
            // needs the FIRST pass to report what that pass did: the binding
            // (the repair re-runs the chain, by which point pointers are already
            // attached, so its bind report is legitimately empty) and the
            // pre-repair violation count. Handing it the post-repair chain made a
            // run that bound 11 pointers record `bound: 0` and a repair that
            // rewrote 2 fields record `violations 0 -> 0`.
            const record = buildPostChainRecord(result as any, repairForAir as any, (repairForAir?.slides ?? result.slides) as any);
            const patched = await patchAirWithPostChain(record);
            if (patched.patched) console.info(`[air-postchain] chain verdicts recorded on ${patched.path}`);
            else console.warn(`[air-postchain] not recorded: ${patched.error}`);
        } catch (e: any) {
            console.warn('[air-postchain] failed (non-fatal):', e?.message || e);
        }
    }, [getContext, context]);
    const [imageLoading, setImageLoading] = useState(false);
    const [wikiSourceArchive, setWikiSourceArchive] = useState('');
    // 2026-05-08 - Mid-chat attachments staged for the next send. Cleared
    // automatically after handleSend prepends them to the corpus and fires
    // the wiki write-back. Multi-file capable.
    const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // 2026-05-14 - sticky-bottom autoscroll. Track whether the user is currently
    // pinned to the bottom of the messages list; only auto-scroll when they are.
    // Fixes the "chat keeps yanking me back down while I'm trying to read above"
    // complaint. 120px tolerance accommodates the typical chunked-streaming delta.
    const messagesScrollRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    // Outer panel ref - used by ChatAttachmentDropzone to scope drag-drop.
    const panelRef = useRef<HTMLDivElement>(null);

    // Load skill manifest once
    useEffect(() => {
        loadSkillManifest().then(m => { if (m.length > 0) setSkillManifest(m); });
    }, []);

    // DF-I1 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md): DURABLE
    // ARTIFACT PROJECTION. Slides and deliverables live in this panel, so the
    // autosave in App.tsx could never see them, which is why a deck generated
    // inside a restored session did not survive the next restore. Project them
    // as they are produced; the session saver reads the projection.
    useEffect(() => {
        if (slides.length) projectDurableArtifacts({ slides });
    }, [slides]);
    useEffect(() => {
        if (deliverables.length) projectDurableArtifacts({ deliverables });
    }, [deliverables]);

    // The other direction: a session restore writes the projection, and this
    // panel adopts it ONLY when it has nothing of its own, so a restore can
    // never clobber work in progress.
    useEffect(() => subscribeDurableArtifacts(d => {
        if (d.slides?.length) setSlides(prev => (prev.length ? prev : d.slides as SlideData[]));
        if (d.deliverables?.length) setDeliverables(prev => (prev.length ? prev : d.deliverables as any[]));
    }), []);

    // 2026-05-23 - Universal artifact-lifting safety net. Watches every
    // assistant message; whenever a NEW assistant message has fence content
    // (:::slide or :::deliverable:) that hasn't been lifted yet, parse and
    // lift it into the slide + deliverable canvas state. This catches ANY
    // handler - present or future, chunked or single-shot, hashtag-driven
    // or organic - that emits parseable fences without explicitly calling
    // the parsers. The Set ref guarantees idempotency: each message is
    // lifted exactly once even if content changes (e.g., during streaming).
    useEffect(() => {
        for (const m of messages) {
            if (m.role !== 'assistant') continue;
            if (!m.content || typeof m.content !== 'string') continue;
            if (liftedArtifactMsgIdsRef.current.has(m.id)) continue;
            const hasSlides = m.content.includes(':::slide');
            const hasDeliverables = m.content.includes(':::deliverable:');
            if (!hasSlides && !hasDeliverables) continue;
            // Skip placeholder/processing messages - content is still streaming
            if (isProcessingPlaceholder(m.content)) continue;
            try {
                // CRITICAL: Override timestamp + model on every lifted artifact
                // to match the source message. The renderer's per-message
                // association filter requires both fields to match within
                // 5s and exact-model - without this override, lifted artifacts
                // never render as cards.
                if (hasDeliverables || hasSlides) {
                    const newDels = parseDeliverableBlocks(m.content, m.model || 'unknown');
                    if (newDels.length > 0) {
                        const stamped = newDels.map(d => ({ ...d, model: m.model || d.model, timestamp: m.timestamp }));
                        setDeliverables(prev => {
                            const existingIds = new Set(prev.map(d => d.id));
                            const merged = [...prev];
                            for (const d of stamped) if (!existingIds.has(d.id)) merged.push(d);
                            return merged;
                        });
                    }
                }
                if (hasSlides) {
                    const originatingQuery = ((m as any).originatingQuery as string) || '';
                    const newSlides = parseSlideBlocks(m.content, m.model || 'unknown', originatingQuery);
                    if (newSlides.length > 0) {
                        const stamped = newSlides.map(s => ({ ...s, model: m.model || s.model, timestamp: m.timestamp }));
                        setSlides(prev => {
                            const existingIds = new Set(prev.map(s => s.id));
                            const merged = [...prev];
                            for (const s of stamped) if (!existingIds.has(s.id)) merged.push(s);
                            return merged;
                        });
                        try { generatePersonaSlidePortraits(stamped); } catch { /* non-blocking */ }
                        // NO verification here: this is the session-restore/safety-net
                        // re-lift. The deck was verified at creation; re-verifying with
                        // an empty pointer registry would misreport and could clobber
                        // user-edited slides (adversarial review finding 11).
                    }
                }
                liftedArtifactMsgIdsRef.current.add(m.id);
            } catch (err) {
                console.warn(`[artifact-lifter] failed to lift fences from msg ${m.id}:`, err);
                // Mark as lifted anyway so we don't retry forever
                liftedArtifactMsgIdsRef.current.add(m.id);
            }
        }
    }, [messages]);

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
                        const resp = await fetch(`http://127.0.0.1:5012/api/wiki/list/sources`).catch(() => null);
                        if (resp?.ok) {
                            const files = await resp.json();
                            // Find the latest source-archive file (not curation files)
                            const archives = (files.files || [])
                                .filter((f: string) => f.endsWith('.md') && !f.includes('curation') && !f.includes('uploads'))
                                .sort()
                                .reverse();
                            if (archives.length > 0) {
                                const archiveResp = await fetch(`http://127.0.0.1:5012/api/wiki/read/sources/${archives[0]}`);
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

    // Track scroll position to know whether the user is reading older
    // messages above. As soon as they scroll up >120px from the bottom we stop
    // auto-scrolling them; the moment they return within 120px of the bottom
    // we resume sticky behavior.
    useEffect(() => {
        const el = messagesScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            stickToBottomRef.current = distanceFromBottom < 120;
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        // Only auto-scroll if the user is already pinned to the bottom.
        // Honors the user's reading position when they have scrolled up.
        if (stickToBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
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
                // 2026-06-05 - Route through tryRepairJson so a single
                // unescaped quote or trailing comma in a model-emitted block
                // doesn't silently drop a deliverable.
                const data = JSON.parse(tryRepairJson(match[2].trim()));
                items.push({ id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: match[1] as DeliverableType, data, status: 'pending', model, timestamp: Date.now() });
            } catch {}
        }
        // Strategy 2: Fallback for ```json blocks - only when a skill was triggered
        if (items.length === 0) {
            const jsonPattern = /```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/g;
            while ((match = jsonPattern.exec(text)) !== null) {
                try {
                    const parsed = JSON.parse(tryRepairJson(match[1].trim()));
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
        // NORMALIZE GLUED FENCES (2026-06-17): models sometimes collapse a slide's closing ":::" and
        // the next slide's opening ":::slide" onto one run -> "::::::slide" (6 colons), which the
        // parser can't split cleanly. Reconstruct the close+open; also trim stray 4-5 colon opens.
        text = text
            .replace(/:{6,}\s*slide\b/g, '\n:::\n:::slide')
            .replace(/:{4,5}\s*slide\b/g, '\n:::slide');
        // Brand is chosen once per call: explicit JSON `brand` > hashtag in AI text > hashtag in user query > default nxt
        const brandFromText = detectBrandFromText(text);
        const brandFromQuery = userQuery ? detectBrandFromText(userQuery) : null;
        const defaultBrand: BrandId = brandFromText || brandFromQuery || 'nxt';

        // Detect "N quotes each" / "#quotes=N" in the user message so we can
        // deterministically enrich every emitted slide with real corpus quotes
        // pulled from the KG - no fabrication, full source attribution.
        const quoteDirective = userQuery ? detectQuoteDensity(userQuery) : null;
        const liveCtx = getContext ? getContext() : context;
        const kg = liveCtx?.knowledgeGraph;

        // Match :::slide [optional template=NAME] [optional brand=NAME] ... :::
        // Attribute values allow ':' so SLIDES-deck archetypes (template=slides:numbered-themes) parse.
        const pattern = /:::slide((?:\s+[a-z]+=[a-z:-]+)*)\s*\n([\s\S]*?):::/g;
        const result: SlideData[] = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                const attrs = match[1] || '';
                const fenceTemplate = (attrs.match(/\btemplate=([a-z:-]+)/i)?.[1] || '').toLowerCase();
                const fenceBrand = (attrs.match(/\bbrand=(nxt|nu|northeastern)/i)?.[1] || '').toLowerCase();
                // Universal density axis: fence attr density=dense, JSON "density",
                // or a #dense hashtag anywhere in the user's request.
                const fenceDensity = (attrs.match(/\bdensity=(base|dense)/i)?.[1] || '').toLowerCase();
                // 2026-06-05 - Slide JSON often contains long verbatim quotes
                // with internal quotes/newlines. tryRepairJson handles trailing
                // commas + bracket-balance so a single bad slide doesn't drop
                // every subsequent slide in the same response.
                const parsed = JSON.parse(tryRepairJson(match[2].trim()));
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
                    else if (parsed.journeyMap || (Array.isArray(parsed.lanes) && Array.isArray(parsed.stages))) template = 'journey-map';
                    else if (parsed.serviceBlueprint || parsed.blueprint) template = 'service-blueprint';
                    else if (parsed.gapMatrix || parsed.gaps) template = 'gap-matrix';
                    else if (parsed.architectureMap || parsed.architecture || parsed.layers) template = 'architecture-map';
                    else if (parsed.prdFeature || parsed.features) template = 'prd-feature';
                    else if (parsed.systemsInventory || parsed.systems) template = 'systems-inventory';
                    else if (parsed.orgChart || parsed.tiers) template = 'org-chart';
                    else if (parsed.executiveBrief) template = 'executive-brief';
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
                const journeyMap = parsed.journeyMap || (template === 'journey-map' && Array.isArray(parsed.lanes) && Array.isArray(parsed.stages) ? parsed : undefined);
                const gapMatrix = parsed.gapMatrix || (Array.isArray(parsed.gaps) ? { gaps: parsed.gaps } : undefined);
                const architectureMap = parsed.architectureMap || parsed.architecture || (Array.isArray(parsed.layers) ? { layers: parsed.layers } : undefined);
                const prdFeature = parsed.prdFeature || (Array.isArray(parsed.features) ? { features: parsed.features } : undefined);
                const systemsInventory = parsed.systemsInventory || (Array.isArray(parsed.systems) ? { systems: parsed.systems } : undefined);

                // Run post-parse validation to detect corpus meta-commentary,
                // empty block-quotes, case-study fields that don't mention the
                // subject, etc. Validator output is used for ops telemetry only;
                // no badge is rendered to the user (per directive 2026-05-05 - no
                // QA annotations in delivered output).
                const validation = validateSlide({
                    title: parsed.title,
                    caseStudy: parsed.caseStudy,
                    quote: parsed.quote,
                    themeCluster,
                });
                const density: 'base' | 'dense' =
                    fenceDensity === 'dense' || parsed.density === 'dense' || /(?:^|\s)#dense\b/i.test(userQuery || '')
                        ? 'dense' : 'base';
                result.push({
                    id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    template,
                    brand,
                    density,
                    // 2026-06-28 - never ship "Untitled Slide": if the model omitted a top-level
                    // title, derive a real action-title from the strongest content field per template
                    // (case-study headline/takeaway/subject, theme/recommendation/etc.) before the
                    // generic fallback.
                    title: parsed.title
                        || parsed.caseStudy?.headline || parsed.caseStudy?.actionTitle || parsed.caseStudy?.takeaway
                        || (parsed.caseStudy?.subject ? `${parsed.caseStudy.subject}: case study` : '')
                        || parsed.recommendation?.actionTitle
                        || (themeCluster?.takeaway || themeCluster?.patternSignal)
                        || parsed.quote?.text
                        || parsed.subtitle
                        || 'Untitled Slide',
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
                    journeyMap,
                    gapMatrix,
                    architectureMap,
                    prdFeature,
                    systemsInventory,
                    // 2026-06-16 - THE "No org tiers" / empty-brief BUG: result.push mapped every
                    // OTHER template payload but silently OMITTED orgChart + executiveBrief, so
                    // #org and #brief/#explainer/#report slides got template='org-chart'/'executive-brief'
                    // with title+sources copied but their ENTIRE body payload (tiers / sections)
                    // dropped -> renderer read `slide.orgChart || {}` -> "No org tiers". Deterministic,
                    // not run-variance. Accept the nested object OR a top-level tiers[] fallback shape.
                    orgChart: parsed.orgChart || (Array.isArray(parsed.tiers) ? { tiers: parsed.tiers, subject: parsed.subject, keyInsight: parsed.keyInsight } : undefined),
                    executiveBrief: parsed.executiveBrief,
                    // SLIDES-deck archetype (template=slides:*): the composer reads the RAW payload by
                    // exact key (items/groups/cards/corroborating/challenges/phases/horizons/roles/...),
                    // none of which map to the GOLD SlideData fields above. Carry the full parsed object
                    // so slideDataToStageHtml can hand it to composeSlide untouched.
                    composerPayload: String(template).startsWith('slides:') ? parsed : undefined,
                    body: parsed.body,
                    bullets: parsed.bullets,
                    blocks: (parsed.blocks || []).map((b: any) => ({ type: b.type, raw: JSON.stringify(b.data), data: b.data })),
                    // _evidenceGap (underscore-prefixed) carries validator telemetry but is NOT rendered.
                    // The renderer reads this via slide._evidenceGap; the visible Slide.evidenceGap
                    // field is left unset so SlideCanvas/exportService never display a badge.
                    _evidenceGap: validation.evidenceGap ? { summary: validation.gapSummary, issues: validation.issues.filter(i => i.severity === 'gap') } : undefined,
                    status: 'draft', model, timestamp: Date.now(),
                });
            } catch {}
        }
        // 2026-06-11 (W0) - DETERMINISTIC DECOMPOSITION. Payloads beyond a
        // template's dense ceiling split into overview + continuation slides
        // (never crammed, never truncated). The prompt-side DECOMPOSITION RULE
        // teaches the model to paginate; this is the guarantee when it doesn't.
        try {
            return paginateSlides(result as any) as SlideData[];
        } catch (e: any) {
            console.warn('[parseSlideBlocks] paginator failed, slides unsplit:', e?.message || e);
            return result;
        }
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
                // §3c: persona portrait is an ILLUSTRATED figure / abstract, NEVER a literal
                // photoreal face. Flat-vector editorial illustration, not corporate photography.
                const prompt = `Flat-vector editorial illustration of an archetypal figure representing ${d.name || 'a person'}, ${d.role || 'professional'}. ${d.demographics || ''}. Stylized, abstract, no photorealism, no literal recognizable face. Minimal geometric shapes, calm muted palette, clean negative space. COMPOSITION: the full figure including the ENTIRE HEAD sits comfortably within the frame with generous headroom above; NEVER crop, cut off, or clip the head, face, or top of the figure; leave clear margin on all sides.`;
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
                // §3c: persona portrait is an ILLUSTRATED figure / abstract, NEVER a literal
                // photoreal face. Flat-vector editorial illustration, not corporate photography.
                const prompt = `Flat-vector editorial illustration of an archetypal figure representing ${p.name}, ${p.role}. ${p.demographics || ''}. Stylized, abstract, no photorealism, no literal recognizable face. Minimal geometric shapes, calm muted palette, clean negative space. COMPOSITION: the full figure including the ENTIRE HEAD sits comfortably within the frame with generous headroom above; NEVER crop, cut off, or clip the head, face, or top of the figure; leave clear margin on all sides.`;
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
    // 2026-06-05 - STRUCTURAL REWIRE. Previously this routed through
    // exportDeckToPPTX (slideTemplates/pptx.ts), a parallel pptxgenjs renderer
    // that re-implemented every slide template. Two renderers (web.tsx for
    // preview + pptx.ts for export) drift constantly - chat preview and PPTX
    // output never match. The structural fix: chat preview is the SOURCE OF
    // TRUTH. Capture each slide's rendered DOM at native 1920x1080, wrap as
    // #stage HTML, post to /api/gold/export-pptx-multi which runs Playwright
    // over each stage and emits ONE editable pptx with N slides + embedded
    // brand fonts. Same rule applies to brief / explainer / report (already
    // routed via exportGoldPptx) AND themes / personas / recommendations /
    // gap / etc. (now routed via exportGoldDeckPptx here). No more parallel
    // renderers. slideTemplates/pptx.ts is now a legacy fallback only.
    const handleExportDeckPPTX = useCallback(async (opts?: { allGenerations?: boolean }) => {
        if (slides.length === 0) return;
        // WS-0a (2026-07-09 slides uplift): a chat can hold MULTIPLE deck generations
        // (re-attempts, revisions). Exporting them all produced a 61-slide file the
        // owner spent hours hand-pruning to 15. Default = the LATEST generation only
        // (slides are stamped with their source message's timestamp at lift time);
        // alt-click the export button to include every generation.
        const latestTs = Math.max(...slides.map(sl => sl.timestamp || 0));
        const exportSlides = opts?.allGenerations ? slides : slides.filter(sl => (sl.timestamp || 0) === latestTs);
        if (!opts?.allGenerations && exportSlides.length < slides.length) {
            console.log(`[deck-export] scoping to the latest generation: ${exportSlides.length} of ${slides.length} lifted slides (alt-click to export all generations)`);
        }
        try {
            // 2026-06-05 - Resolution fix. Was using captureSlideAsStageHtml on
            // the chat-preview DOM, but those tiles are 800-960px responsive
            // cards with font-sizes tuned for that container. Stretching the
            // outer bounding box to 1920×1080 didn't change inner font-sizes,
            // so the gold exporter measured 5-16pt text in a 1920×1080 stage
            // (the "complete disaster" output). The structural answer: emit
            // a fresh 1920×1080 #stage HTML from SlideData directly via
            // slideDataToStageHtml. Same SlideData feeds the chat preview AND
            // the export; the two renderers are now independent + each tuned
            // to its own display target.
            const { exportGoldDeckPptx } = await import('../services/goldArtifact');
            const { slideDataToStageHtml } = await import('../services/slideToStageHtml');
            // WS-3c (2026-07-09 slides uplift): imagery degradation is NEVER silent.
            // Every carrier that no-ops during export gets recorded and surfaced as a
            // chat notice, so a visually flattened deck announces itself.
            const imageryDegradations: string[] = [];
            // D17 (owner-chosen 2026-07-01): journey/architecture/mindmap/blueprint slides export as a
            // FULL-BLEED native GOLD exhibit IMAGE (composed HTML/CSS -> Chromium, all expert dimensions +
            // real NXT icons + locked typography). buildDiagramSpec maps the slide's full data to the proxy
            // spec; fetchDiagramImage returns the content-hash-cached PNG. Attach to the slide so
            // slideDataToStageHtml renders it wall-to-wall. Fail-open: on error the slide keeps its native matrix.
            {
                const { fetchDiagramImage } = await import('../services/diagramSpec');
                for (const s of exportSlides as any[]) {
                    if (s.diagramImage) continue;
                    const img = await fetchDiagramImage(s, (s.brand === 'nu' ? 'nu' : 'nxt'));
                    if (img) s.diagramImage = img;
                    else if (['journey-map', 'architecture-map', 'mindmap', 'service-blueprint'].includes(String(s.template))) {
                        imageryDegradations.push(`${s.template}: diagram exhibit unavailable; the slide ships with its native matrix`);
                    }
                }
            }
            // E4 (2026-07-02): infographic-exhibit slides whose panel fill failed (or that were
            // generated before the native lane landed) get their exhibitImage composed AT EXPORT
            // from the payload's own structured fields - same resolver as the generation seam,
            // so a re-export of an old deck ships the infographic instead of an empty band.
            {
                // 2026-07-03: ALWAYS re-resolve (not only when missing). The native render is
                // deterministic and content-hash cached server-side (keyed with the renderer
                // style version), so a re-export of an old deck picks up renderer improvements
                // instead of shipping the stale panel baked at generation time; an unchanged
                // renderer costs one cache hit. Refresh failure keeps the previous panel.
                const { resolveRoutedSlotImages } = await import('../services/visualRouter');
                for (const s of exportSlides as any[]) {
                    if (String(s.template) !== 'slides:infographic-exhibit') continue;
                    const sub = s.composerPayload;
                    if (!sub || typeof sub !== 'object') continue;
                    const prev = sub.exhibitImage;
                    sub.exhibitImage = '';
                    try {
                        const r = await resolveRoutedSlotImages('slides:infographic-exhibit', sub, s.brand || 'nxt', s.theme || 'dark',
                            { onLog: (msg: string) => console.log('[deck-export:infographic]', msg) });
                        if (!r.count && prev) sub.exhibitImage = prev;
                    } catch (e: any) {
                        if (prev) sub.exhibitImage = prev;
                        imageryDegradations.push(`infographic-exhibit: panel refresh failed (${String(e?.message || e).slice(0, 80)}); ${prev ? 'the previous panel shipped' : 'the band ships empty'}`);
                        console.warn('[deck-export] infographic refresh skipped:', e?.message || e);
                    }
                }
            }
            const stageHtmlList: string[] = [];
            for (const s of exportSlides) {
                try {
                    const stageHtml = slideDataToStageHtml(s as any);
                    stageHtmlList.push(stageHtml);
                } catch (renderErr: any) {
                    console.warn(`[deck-export] render failed for slide ${s.id} (${s.template}):`, renderErr?.message || renderErr);
                }
            }
            if (stageHtmlList.length === 0) {
                console.error('[deck-export] no slides rendered - nothing to export');
                return;
            }
            if (imageryDegradations.length) {
                setMessages(prev => [...prev, {
                    id: `imagery_notice_${Date.now()}`, role: 'assistant',
                    content: `Imagery notice for this export: ${imageryDegradations.join('; ')}.`,
                    timestamp: Date.now(),
                }]);
            }
            const deckName = `deck_${new Date().toISOString().split('T')[0]}_${stageHtmlList.length}_slides.pptx`;
            await exportGoldDeckPptx(stageHtmlList, deckName);
        } catch (e: any) {
            console.error('[deck-export] gold deck export failed:', e?.message || e);
        }
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

            // 2026-06-06 - PDF one-slide bug fix. Per the architecture audit:
            // if the chat preview uses a virtualized carousel that mounts
            // only the currently-visible slide, getElementById returns null
            // for the other N-1 slides and they were silently skipped (one
            // PDF page produced regardless of slides.length). Pre-flight
            // detection + scroll-to-mount loop forces every slide to mount
            // before the capture loop fires. Falls back to a clear alert
            // when slides STILL aren't mountable so the user isn't surprised
            // by a 1-page PDF for an N-slide deck.
            const presentBefore = slides.map(s => !!document.getElementById(`slide-capture-${s.id}`)).filter(Boolean).length;
            if (presentBefore < slides.length) {
                console.info(`[Deck PDF] ${presentBefore}/${slides.length} slides mounted; attempting to scroll-mount the rest`);
                for (const s of slides) {
                    const el = document.getElementById(`slide-capture-${s.id}`);
                    if (el) {
                        try { el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' as any }); } catch {}
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
                await new Promise(r => setTimeout(r, 200));
                const presentAfter = slides.map(s => !!document.getElementById(`slide-capture-${s.id}`)).filter(Boolean).length;
                if (presentAfter < slides.length) {
                    const proceed = confirm(
                        `Warning: only ${presentAfter}/${slides.length} slides are currently mounted in the chat preview. ` +
                        `Click OK to export the partial PDF, or Cancel to abort - try scrolling through all slides first ` +
                        `to ensure each one mounts before re-clicking Export PDF.`
                    );
                    if (!proceed) return;
                }
            }

            for (let i = 0; i < slides.length; i++) {
                const el = document.getElementById(`slide-capture-${slides[i].id}`);
                if (!el) {
                    console.warn(`[Deck PDF] slide ${i + 1}/${slides.length} (id=${slides[i].id}) not in DOM - skipping`);
                    continue;
                }
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
            return { id: `msg_${Date.now()}`, role: 'assistant', content: imageData ? `Generated: "${cleanPrompt.substring(0, 60)}"` : 'Image generation failed.', model: 'deepseek-v4-flash', timestamp: Date.now(), durationMs: Date.now() - startTime, imageData: imageData || undefined };
        } catch (e: any) {
            setImageLoading(false);
            return { id: `msg_${Date.now()}`, role: 'assistant', content: `Image error: ${e.message}`, model: 'deepseek-v4-flash', timestamp: Date.now(), durationMs: Date.now() - startTime };
        }
    };

    /**
     * 2026-05-09 - Edit an existing presentation via natural-language
     * instruction from a library card. Loads the existing payload, wraps
     * the user's revision instruction with concrete context (the existing
     * title, diagnosis, and guiding policy), runs the composer with that
     * as the new thesis, saves the result back to the SAME slug so the
     * URL is stable across edits, and posts a confirmation message.
     */
    // 2026-05-11 - Prototype edit handler. Loads the existing prototype,
    // injects the user's revision instruction into the original concept,
    // and re-runs the 5-stage pipeline. Saves back to the same slug so the
    // launcher URL stays stable across edits.
    const handlePrototypeEdit = async (slug: string, instruction: string) => {
        const editMsgId = `msg_${Date.now()}_proto_edit_${slug}`;
        const stageLog: string[] = [];
        setMessages(prev => [...prev, {
            id: editMsgId,
            role: 'assistant',
            content: `Revising prototype "${slug}"...\n\nUser direction: "${instruction.slice(0, 200)}"`,
            timestamp: Date.now(),
        }]);
        try {
            const { getPrototype, savePrototype } = await safeDynamicImport(
                () => import('../services/prototypeLibrary'),
                'prototypeLibrary (revise)',
            );
            const { buildPrototype } = await safeDynamicImport(
                () => import('../services/prototypeBuilder'),
                'prototypeBuilder (revise)',
            );
            const existing = await getPrototype(slug);
            // Compose the revision: prior concept + brief + spec as context, plus the user's new direction
            const revisionConcept = [
                `REVISION OF EXISTING PROTOTYPE.`,
                ``,
                `Existing slug to preserve: "${slug}"`,
                `Existing title: "${existing.title}"`,
                `Original concept:`,
                existing.concept || '(no original concept stored)',
                ``,
                `Existing experience brief (for context - preserve structure):`,
                JSON.stringify(existing.brief, null, 2).slice(0, 2000),
                ``,
                `USER'S REQUESTED CHANGE:`,
                instruction,
                ``,
                `Adapt only what the change requires. Preserve everything else from the existing concept.`,
            ].join('\n');

            const artifact = await buildPrototype({
                concept: revisionConcept,
                brand: (existing.brand as any) || 'NXT',
                title: existing.title,
                basedOn: existing.based_on,
                researchGoal: existing.research_goal,
                onProgress: (n, name, status, detail) => {
                    const icon = status === 'done' ? '' : status === 'failed' ? '' : '○';
                    stageLog.push(`${icon} Stage ${n}: ${name}${detail ? ` - ${detail}` : ''}`);
                    setMessages(prev => prev.map(m => m.id === editMsgId ? {
                        ...m,
                        content: `Revising prototype "${slug}"...\n\n${stageLog.slice(-10).join('\n')}`,
                    } : m));
                },
            });
            // Force slug to remain stable so we update in-place
            artifact.slug = slug;
            const saved = await savePrototype(artifact);
            setMessages(prev => prev.map(m => m.id === editMsgId ? {
                ...m,
                content: `Revised "${artifact.title}" (${Math.round(artifact.code.length / 1024)}KB). Launch button below opens the updated version.`,
                prototypeUrl: `http://127.0.0.1:5012${saved.view_url}`,
                prototypeMeta: {
                    slug: saved.slug,
                    title: artifact.title,
                    brand: artifact.brand,
                    based_on: artifact.based_on,
                    verdict: artifact.critique?.verdict,
                    code_chars: artifact.code.length,
                },
            } : m));
        } catch (e: any) {
            setMessages(prev => prev.map(m => m.id === editMsgId ? {
                ...m,
                content: `Prototype edit failed: ${e?.message || 'unknown'}.\n\n${stageLog.join('\n')}`,
            } : m));
        }
    };

    const handlePresentationEdit = async (slug: string, instruction: string) => {
        const editingMsgId = `msg_${Date.now()}_edit_${slug}`;
        setMessages(prev => [...prev, {
            id: editingMsgId,
            role: 'assistant',
            content: `Composing revision of "${slug}" - "${instruction.slice(0, 80)}${instruction.length > 80 ? '...' : ''}"...`,
            timestamp: Date.now(),
        }]);

        try {
            const existing = await getPresentation(slug);
            const meta = (existing as any).meta || {};
            const arc = (existing as any).narrativeArc || {};
            const existingTitle = meta.title || '(untitled)';
            const existingDiagnosis = arc.diagnosis || '';
            const existingPolicy = arc.guidingPolicy || '';
            const existingThesis = meta.narrativeThesis || '';

            // Build a revision thesis: the user's instruction layered onto the
            // existing presentation's strategic argument. Composer treats this
            // as the new narrativeRequest; we explicitly tell it to PRESERVE
            // the existing slug + retain unchanged sections.
            const revisionThesis = `REVISION OF EXISTING PRESENTATION.\n\n` +
                `Existing slug to preserve: "${slug}"\n` +
                `Existing title: "${existingTitle}"\n` +
                `Existing thesis: ${existingThesis}\n` +
                `Existing diagnosis: ${existingDiagnosis}\n` +
                `Existing guiding policy: ${existingPolicy}\n\n` +
                `USER'S REQUESTED CHANGE: ${instruction}\n\n` +
                `Generate the updated PresentationPayload. Keep meta.slug exactly as "${slug}". ` +
                `Adapt only the sections affected by the requested change; preserve sections that don't need to change. ` +
                `If the title needs updating to reflect the change, update it; otherwise keep the existing title.`;

            const liveCtx = getContext ? getContext() : context;
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

            const externalCount = (liveCtx?.liveSourceResults || [])
                .reduce((s: number, r: any) => s + (r.items?.length || 0), 0);
            const uploadedCount = (liveCtx?.uploadedFiles || []).length;
            const themeCount = (liveCtx?.themes as any[] | undefined)?.length || 0;
            const personaCount = (liveCtx?.personas as any[] | undefined)?.length || 0;

            // composeNarrative returns ComposeResult { payload, toolCallCount,
            // durationMs } - the actual PresentationPayload is under .payload.
            // (The create path at the #presentation handler does this correctly;
            // an earlier version of this edit handler treated the result as the
            // payload directly, which is why every edit failed the sections
            // check - sections lived one level down.)
            // 2026-05-27 - Composer routes to FUNDED Gemini. The old "Gemini
            // rejects the tool schema" constraint is gone: the section schema
            // was flattened (oneOf → merged permissive object) so Google's
            // OpenAI-compat layer accepts it, and the schema test passes. Azure
            // DeepSeek content-filters this corpus and the OpenAI account is out
            // of quota, so Gemini (healthy + funded + not content-filtered) is
            // the only viable composer provider. Honor an explicit Gemini Pro
            // selection; otherwise default to fast Gemini 3.5 Flash for the
            // multi-round tool loop. Explicit DeepSeek selection is still honored.
            const composerModel: ComposerModelChoice =
                selectedModel === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview'
                : selectedModel === 'deepseek-v4-pro' ? 'deepseek-v4-pro'
                : selectedModel === 'deepseek-v4-flash' ? 'deepseek-v4-flash'
                : 'gemini-3.5-flash';
            const composeResult = await composeNarrative({
                narrativeRequest: revisionThesis,
                brand: meta.brand || 'NXT',
                theme: meta.theme || 'dark',
                model: composerModel,
                executor,
                priorConversation: messages,
                engagementContext: {
                    engagementGoal: liveCtx?.researchGoal || '',
                    themeCount,
                    personaCount,
                    deliverableList: [],
                    externalArticleCount: externalCount,
                    uploadedDocCount: uploadedCount,
                },
                onProgress: () => { /* no-op */ },
                onToolCall: () => { /* no-op */ },
            });

            // 2026-05-10 - Defensive payload normalization BEFORE save.
            // The model intermittently omits required envelope fields when
            // generating a revision (schemaVersion in particular). Catch
            // those here so the save doesn't fail at the proxy with an
            // opaque "schemaVersion must be 1, got None" 400. Force the
            // slug to remain stable so the saved file overwrites in place.
            // D18: emit AIR for the edited/revised deck too (composeNarrative path was outside AIR).
            void emitComposeNarrativeAir('#presentation', (getContext ? getContext() : context)?.researchGoal || revisionThesis || '', composeResult.payload);

            const p = composeResult.payload as any;
            if (!p.schemaVersion) p.schemaVersion = 1;
            if (!p.meta) p.meta = {};
            p.meta.slug = slug;
            // Ensure other required meta fields have at least a stub so
            // the proxy's validator passes; the model usually fills these,
            // but defensive nullsafety is cheap.
            if (!p.meta.title) p.meta.title = (existing as any).meta?.title || '(revised - untitled)';
            if (!p.meta.brand) p.meta.brand = (existing as any).meta?.brand || 'NXT';
            if (!p.meta.generatedAt) p.meta.generatedAt = new Date().toISOString();
            // Validate sections shape (proxy requires non-empty array). Two
            // distinct failure modes share this message: (1) content_filter
            // blocked the model mid-call, leaving an empty payload; (2) the
            // model finished but produced zero accepted sections (post-validation).
            // Either way the right user action is to rephrase, so collapse them.
            if (!Array.isArray(p.sections) || p.sections.length === 0) {
                throw new Error(
                    `composer returned a payload with no sections - the revision was blocked or truncated mid-generation. ` +
                    `Try rephrasing the edit instruction (more specific scope, smaller change).`,
                );
            }
            // Illustrator (2026-06-17): re-resolve illustrations on the revised
            // payload before save. Exact concepts are reused from the library (no
            // regen cost); only new/changed scenes generate. Fail-open.
            try { await resolvePresentationIllustrations(p); } catch (illoErr) {
                console.warn('[Library] illustration pass failed (non-blocking):', illoErr);
            }
            const saved = await savePresentation(p);

            setMessages(prev => prev.map(m => m.id === editingMsgId ? {
                ...m,
                content: `Revised "${saved.title}" (slug ${slug}). The library card below reflects the update.`,
                presentationUrl: saved.url,
                presentationMeta: { title: saved.title, brand: saved.brand, sectionCount: saved.sectionCount },
            } : m));

            // Refresh the library cards in earlier messages so the title/date update
            setMessages(prev => prev.map(mm => {
                if (!Array.isArray(mm.libraryItems)) return mm;
                const items = (mm.libraryItems as PresentationSummary[]).map(it =>
                    it.slug === slug ? { ...it, title: saved.title, generatedAt: saved.generatedAt, sectionCount: saved.sectionCount } : it
                );
                return { ...mm, libraryItems: items };
            }));
        } catch (e: any) {
            console.error('[Library] edit failed:', e);
            setMessages(prev => prev.map(m => m.id === editingMsgId ? {
                ...m,
                content: `Edit failed for "${slug}": ${e?.message || 'unknown error'}`,
            } : m));
        }
    };

    // 2026-05-13 - Phase B of the #proto flow. User clicked BUILD THIS on
    // one of the 5 briefs. Run buildPrototype with the chosen brief as
    // `approvedBrief` (skips Stage 1) and the original rich concept text as
    // `concept` (flows through Stages 2-4 as additional grounding).
    const handleApproveBrief = async (
        brief: any,
        meta: { brand: 'NXT' | 'NU'; basedOn?: string; researchGoal?: string; originalConcept: string },
        sourceMsgId: string,
        customization?: string,
    ) => {
        const buildMsgId = `msg_${Date.now()}_proto_build`;
        const stageLog: string[] = [];
        const buildStartedAt = Date.now();
        // Heartbeat state: while a stage is "running", we re-render the status
        // every 4s with elapsed seconds so the user never sees a dead-looking
        // panel during a 60-180s Gemini call.
        let currentRunningStage: { label: string; name: string; startedAt: number } | null = null;
        const renderStatus = () => {
            const totalElapsed = Math.round((Date.now() - buildStartedAt) / 1000);
            const runningLine = currentRunningStage
                ? `\n\nCurrently working on: ${currentRunningStage.name} (${Math.round((Date.now() - currentRunningStage.startedAt) / 1000)}s elapsed on this step)`
                : '';
            const elapsedLine = `\n\nTotal elapsed: ${totalElapsed}s · Most prototypes finish in 4-8 minutes.`;
            setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                ...m,
                content: `Building your prototype: **${brief.title}** (${meta.brand})...\n\n${stageLog.slice(-12).join('\n')}${runningLine}${elapsedLine}`,
            } : m));
        };
        setMessages(prev => [...prev, {
            id: buildMsgId,
            role: 'assistant',
            content: `Building your prototype: **${brief.title}** (${meta.brand})...\n\nDesigning the interactions, generating realistic data, writing the code, and auditing the result. You'll see each step finish as it completes - typically 4-8 minutes start to finish.`,
            timestamp: Date.now(),
        }]);
        const heartbeat = window.setInterval(renderStatus, 4000);
        // 2026-05-14 - Snapshot per-model cost totals at build start so we can
        // diff against them at end-of-build. The chat surface reports BOTH
        // the build's total dollar cost AND which models the user was billed
        // for (e.g., "$5.43 - Claude Opus 4.7 $1.85, GPT-5.5 $2.32, Gemini
        // 3.1 Pro $1.26"). The bottom-right cost chip shows cumulative
        // engagement totals; this chat line shows the single-build delta.
        const _costMeter = await safeDynamicImport(() => import('../services/costMeter'), 'costMeter (start snapshot)');
        const { snapshotByModel: _snapshotByModel, summarizeBuildCost: _summarizeBuildCost } = _costMeter;
        const modelSnapshotAtBuildStart = _snapshotByModel ? _snapshotByModel() : {};
        try {
            const [{ buildPrototype }, { productBriefToExperienceBrief, productBriefToRichContext }, { savePrototype }] = await Promise.all([
                safeDynamicImport(() => import('../services/prototypeBuilder'), 'prototypeBuilder (post-brief build)'),
                safeDynamicImport(() => import('../services/prototypeBriefGenerator'), 'prototypeBriefGenerator (adapter)'),
                safeDynamicImport(() => import('../services/prototypeLibrary'), 'prototypeLibrary (save)'),
            ]);
            const experienceBrief = productBriefToExperienceBrief(brief);
            const richBriefText = productBriefToRichContext(brief);
            const customizationBlock = customization && customization.trim()
                ? `\n\n=== USER-SUPPLIED LAST-MILE CUSTOMIZATION (surgical tweaks the user added before clicking Build - apply these in every downstream stage; they OVERRIDE any conflicting hint in the brief or original context) ===\n${customization.trim()}`
                : '';
            const conceptForPipeline = `${richBriefText}\n\n=== ORIGINAL ENGAGEMENT CONTEXT (the rich consulting brief the briefs were generated from) ===\n${meta.originalConcept}${customizationBlock}`;
            const artifact = await buildPrototype({
                concept: conceptForPipeline,
                brand: meta.brand,
                basedOn: meta.basedOn,
                researchGoal: meta.researchGoal,
                title: brief.title,
                approvedBrief: experienceBrief,
                onProgress: (n, name, status, detail) => {
                    const icon = status === 'done' ? '' : status === 'failed' ? '' : '○';
                    // Map the underlying step numbers (1, 2, 25, 3, 35, 4, 5) to
                    // a clean user-facing sequence (1 through 6). Step 1 (concept
                    // analysis) is usually skipped when the user picked a brief,
                    // so the visible sequence runs from 1 of 6 (interaction
                    // design) through 6 of 6 (quality review).
                    const stepOrder: Record<number, number> = { 1: 0, 2: 1, 25: 2, 3: 3, 35: 4, 4: 5, 5: 6 };
                    const totalSteps = 6;
                    const stepIdx = stepOrder[n] ?? n;
                    const stepLabel = stepIdx > 0 ? `Step ${stepIdx} of ${totalSteps}` : 'Setup';
                    // Translate the underlying specialist names into plain English.
                    const FRIENDLY_NAMES: Record<string, string> = {
                        'Concept Decomposer': 'Concept analysis',
                        'Interaction Architect': 'Interaction design',
                        'Simulated User Sessions': 'Real-user scenarios',
                        'Visual Designer': 'Visual design',
                        'Build Recipe Author': 'Implementation plan',
                        'Prototype Coder': 'Code generation',
                        'Critic + Refiner': 'Quality review',
                    };
                    const friendlyName = FRIENDLY_NAMES[name] || name;
                    if (status === 'running') {
                        currentRunningStage = { label: stepLabel, name: friendlyName, startedAt: Date.now() };
                        stageLog.push(`${icon} ${stepLabel} · ${friendlyName} - in progress`);
                    } else {
                        // done/failed - finalize the line + clear the running marker
                        const elapsed = currentRunningStage && currentRunningStage.label === stepLabel
                            ? ` (${Math.round((Date.now() - currentRunningStage.startedAt) / 1000)}s)`
                            : '';
                        const lastIdx = stageLog.findIndex(l => l.includes(`${stepLabel} · ${friendlyName} - in progress`));
                        const finalLine = `${icon} ${stepLabel} · ${friendlyName}${detail ? ` - ${detail}` : ''}${elapsed}`;
                        if (lastIdx >= 0) stageLog[lastIdx] = finalLine;
                        else stageLog.push(finalLine);
                        if (currentRunningStage?.label === stepLabel) currentRunningStage = null;
                    }
                    renderStatus();
                },
            });
            const saved = await savePrototype(artifact);
            window.clearInterval(heartbeat);
            const totalSec = Math.round((Date.now() - buildStartedAt) / 1000);
            const totalMin = totalSec >= 60 ? `${Math.floor(totalSec / 60)} min ${totalSec % 60}s` : `${totalSec}s`;
            // Friendly quality summary - map the audit verdict to plain English.
            const verdict = artifact.critique?.verdict || 'ship';
            const qualityLine = verdict === 'ship'
                ? 'Quality check passed - ready to share.'
                : verdict === 'refine'
                    ? 'Quality check found a few fixable items - review the notes below.'
                    : 'Quality check flagged concerns - please review before sharing.';
            // Per-build cost = delta from the start-of-build snapshot. Surfaces
            // the dollar amount AND names the models the user was billed for
            // (so they always know which providers their spend went to).
            const buildCostSummary = _summarizeBuildCost
                ? _summarizeBuildCost(modelSnapshotAtBuildStart)
                : '';
            const costLine = buildCostSummary ? `\n\n${buildCostSummary}` : '';
            setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                ...m,
                content: `Your prototype is ready: **${artifact.title}** (${artifact.brand}, ${Math.round(artifact.code.length / 1024)}KB) · built in ${totalMin}.\n\n${qualityLine} Click LAUNCH to open it in a new window.${costLine}\n\n${stageLog.join('\n')}`,
                prototypeUrl: `http://127.0.0.1:5012${saved.view_url}`,
                prototypeMeta: {
                    slug: saved.slug,
                    title: artifact.title,
                    brand: artifact.brand,
                    based_on: artifact.based_on,
                    verdict: artifact.critique?.verdict,
                    code_chars: artifact.code.length,
                },
            } : m));
        } catch (e: any) {
            window.clearInterval(heartbeat);
            console.warn('[#proto] post-brief build failed:', e?.message || e);
            const totalSec = Math.round((Date.now() - buildStartedAt) / 1000);
            setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                ...m,
                content: `Build failed for brief "${brief.title}" after ${totalSec}s: ${e?.message || 'unknown error'}.\n\n${stageLog.join('\n')}`,
            } : m));
        }
        // sourceMsgId reference reserved for future "edit-and-rebuild" flow
        void sourceMsgId;
    };

    // --- Send ---
    const handleSend = async (queryOverride?: string) => {
        let query = queryOverride || input.trim();
        // 2026-05-08 - Allow send with attachments only (no text). When the
        // user drops a file with no prompt, synthesize a "summarize this"
        // default so the assistant gets a non-empty user turn.
        if (!query && pendingAttachments.length === 0) return;
        if (isLoading) return;
        if (!query && pendingAttachments.length > 0) {
            query = `Summarize the ${pendingAttachments.length === 1 ? 'attached file' : `${pendingAttachments.length} attached files`} (${pendingAttachments.map(a => a.filename).join(', ')}) and tell me what's most important.`;
        }

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: query + (pendingAttachments.length > 0
                ? `\n\n[attached: ${pendingAttachments.map(a => a.filename).join(', ')}]`
                : ''),
            timestamp: Date.now(),
        };
        // 2026-05-19 - Chat feedback capture. The AnalysisCheckpoint logEdit
        // path is no longer the user's interaction surface, so we intercept
        // here instead. Fire-and-forget; non-blocking. See
        // services/chatFeedbackExtractor.ts for the classifier.
        const _lastAiForFeedback = [...messages].reverse().find(m => m.role !== 'user')?.content;
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setShowSuggestions(false);
        import('../services/chatFeedbackExtractor').then(({ classifyMessage }) => {
            return classifyMessage(query, _lastAiForFeedback, 'analyst');
        }).then(signal => {
            if (!signal) return;
            return import('../services/promptImprovementEngine').then(({ logChatFeedback }) => {
                logChatFeedback(signal);
            });
        }).catch(() => { /* feedback capture must never break a chat send */ });

        // 2026-05-08 - Persist ad-hoc uploads to wiki/uploads/ad-hoc/{slug}/{date}/
        // BEFORE the chat dispatch. Fire-and-forget so latency doesn't gate
        // the chat response. We do NOT clear pendingAttachments yet -
        // the dispatch logic below still needs to read them; we'll clear at
        // the end of the send.
        if (pendingAttachments.length > 0) {
            const liveCtxForSlug = getContext ? getContext() : context;
            const sessionSlug = buildEngagementSlug(liveCtxForSlug?.researchGoal || 'session', 50);
            // HONEST SURFACING (2026-06-15): a PDF that yields no extractable text
            // (scanned / image-only) was silently dropped (writeAdHocUpload skips
            // empty parsedText with only a console.warn). The user then got a deck
            // grounded on a starved corpus with no idea two of three uploads never
            // made it in. Tell them in-chat so they can re-upload a text version.
            const emptyUploads = pendingAttachments.filter(a => !a.isImage && (!a.parsedText || a.parsedText.trim().length < 40));
            if (emptyUploads.length > 0) {
                const names = emptyUploads.map(a => a.filename).join(', ');
                setMessages(prev => [...prev, {
                    id: `msg_${Date.now()}_upload_notice`,
                    role: 'assistant',
                    content: `I could not extract readable text from ${emptyUploads.length} of ${pendingAttachments.length} upload(s): ${names}. These look like scanned or image-only PDFs, so they were left out of the corpus and any answer below is grounded only on the sources I could read. Re-upload a text-based version (or paste the text) to ground on them.`,
                    timestamp: Date.now(),
                } as ChatMessage]);
            }
            for (const att of pendingAttachments) {
                writeAdHocUpload({
                    filename: att.filename,
                    parsedText: att.parsedText,
                    mimeType: att.mimeType,
                    pageCount: att.pageCount,
                    slideCount: att.slideCount,
                    isImage: att.isImage,
                    chatSurface: 'analyst',
                }, sessionSlug)
                    .then(path => { if (path) console.log(`[Chat] Persisted ad-hoc upload: ${path}`); })
                    .catch(e => console.warn('[Chat] Ad-hoc upload wiki write failed:', e));
            }
        }

        // 2026-06-13 - UNIFICATION: the legacy #recommendations tile gate (RAG via
        // fetchWikiArticles -> RecommendationTilesGrid -> emitDeliverable) was removed.
        // #recommendations now falls through to sendChatMessage slide-mode exactly like
        // #recs: ARTIFACT_TPL maps it to the 'recommendation' GOLD slide template,
        // HASHTAG_TO_SKILL_ID loads recommendation-architect, evidence is manifest-grounded
        // (pickChunksForPrompt), and Opus 4.8 force-routes. This eliminates the engine fork
        // (#recs vs #recommendations) and the broken-export path ([object Object] steps,
        // unresolved chunk pointers). See plans/hashtag-pipeline-unification-2026-06-13.md.

        // ═══════════════════════════════════════════════════════════════
        // 2026-05-12 - HTML ARTIFACT DIRECTIVES (Sprints H1/H2/H4)
        // Five generation directives produce NXT/NU-branded HTML artifacts
        // via /api/artifacts. All compose verbalized-sampling +
        // html-deliverable-composer skills. Two library/utility directives
        // (#artifacts, #help, #refine) browse / explain / refine.
        // ═══════════════════════════════════════════════════════════════

        // --- #help (bare) - hashtag reference guide -----------------------
        if (parseHelpDirective(query).triggered) {
            const helpMsgId = `msg_${Date.now()}_help`;
            setMessages(prev => [...prev, {
                id: helpMsgId,
                role: 'assistant',
                content: 'Building the hashtag reference guide...',
                timestamp: Date.now(),
            }]);
            try {
                // Build the HTML guide directly from the hashtagRegistry. No
                // model call needed - the registry IS the source of truth.
                const grouped = directivesByCategory();
                const cats: Array<'experience-builder' | 'consulting-deliverable' | 'edit-refine' | 'browse' | 'system'> =
                    ['experience-builder', 'consulting-deliverable', 'edit-refine', 'browse', 'system'];
                const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const sections = cats.map(cat => {
                    const items = grouped[cat] || [];
                    if (items.length === 0) return '';
                    const cards = items.map(d => `
                        <article class="hg-card" data-category="${cat}">
                            <header class="hg-card__head">
                                <code class="hg-tag">${escapeHtml(d.id)}</code>
                                <span class="hg-name">${escapeHtml(d.name)}</span>
                                ${d.usesVerbalizedSampling ? '<span class="hg-pill hg-pill--vs">VS</span>' : ''}
                                ${d.requiresContext ? '<span class="hg-pill hg-pill--ctx">needs corpus</span>' : ''}
                            </header>
                            <p class="hg-summary">${escapeHtml(d.summary)}</p>
                            <p class="hg-desc">${escapeHtml(d.description)}</p>
                            ${d.modifiers && d.modifiers.length > 0 ? `
                                <details class="hg-mods">
                                    <summary>Modifiers</summary>
                                    <ul>${d.modifiers.map(m => `<li><code>${escapeHtml(m.token)}</code> - ${escapeHtml(m.description)}</li>`).join('')}</ul>
                                </details>
                            ` : ''}
                            ${d.combinesWith && d.combinesWith.length > 0 ? `
                                <div class="hg-combine">Combines with: ${d.combinesWith.map(c => `<code>${escapeHtml(c)}</code>`).join(' ')}</div>
                            ` : ''}
                            <div class="hg-examples">
                                <div class="hg-examples__label">Examples</div>
                                ${d.examples.map(ex => `<pre class="hg-example"><code>${escapeHtml(ex)}</code></pre>`).join('')}
                            </div>
                            <footer class="hg-meta">Added ${escapeHtml(d.introduced)}${d.outputType ? ` · output: ${escapeHtml(d.outputType)}` : ''}</footer>
                        </article>`).join('');
                    return `
                        <section class="hg-section">
                            <h2>${escapeHtml(CATEGORY_LABELS[cat])}</h2>
                            <div class="hg-grid">${cards}</div>
                        </section>`;
                }).join('');
                const html = `
                <style>
                    .hg-root { max-width: 1100px; margin: 0 auto; padding: 48px 32px; }
                    .hg-root h1 { font-size: 56px; line-height: 1; margin-bottom: 8px; color: var(--nxt-text-primary); }
                    .hg-root > p.hg-intro { font-size: 15px; color: var(--nxt-text-secondary); margin-bottom: 36px; max-width: 720px; }
                    .hg-section { margin-top: 48px; }
                    .hg-section h2 { font-size: 32px; letter-spacing: 1px; color: var(--nxt-lime); border-bottom: 1px solid var(--nxt-border); padding-bottom: 8px; margin-bottom: 20px; }
                    [data-brand="NU"] .hg-section h2 { color: var(--nu-red); }
                    .hg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
                    .hg-card { background: var(--nxt-surface); border: 1px solid var(--nxt-border); padding: 20px; display: flex; flex-direction: column; gap: 10px; }
                    .hg-card[data-category="experience-builder"] { border-left: 3px solid var(--nxt-lime); }
                    .hg-card[data-category="consulting-deliverable"] { border-left: 3px solid var(--nxt-cyan); }
                    .hg-card[data-category="browse"] { border-left: 3px solid var(--nxt-teal); }
                    .hg-card[data-category="edit-refine"] { border-left: 3px solid var(--nxt-warning); }
                    .hg-card[data-category="system"] { border-left: 3px solid var(--nxt-text-tertiary); }
                    .hg-card__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                    .hg-tag { font-family: var(--nxt-font-mono); font-size: 13px; background: var(--nxt-text-primary); color: var(--nxt-bg); padding: 4px 8px; }
                    .hg-name { font-family: var(--nxt-font-display); font-size: 18px; letter-spacing: 1px; text-transform: uppercase; }
                    .hg-pill { font-family: var(--nxt-font-mono); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; padding: 2px 7px; }
                    .hg-pill--vs { background: var(--nxt-lime); color: var(--nxt-text-primary); }
                    .hg-pill--ctx { background: var(--nxt-cyan); color: var(--nxt-text-primary); }
                    .hg-summary { font-size: 14px; color: var(--nxt-text-primary); font-weight: 600; margin: 0; }
                    .hg-desc { font-size: 12px; color: var(--nxt-text-secondary); line-height: 1.5; margin: 0; }
                    .hg-mods summary { font-family: var(--nxt-font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; color: var(--nxt-text-secondary); }
                    .hg-mods ul { margin: 8px 0 0 0; padding-left: 16px; font-size: 12px; color: var(--nxt-text-secondary); }
                    .hg-mods code { font-family: var(--nxt-font-mono); font-size: 11px; background: var(--nxt-panel); padding: 1px 4px; }
                    .hg-combine { font-size: 11px; color: var(--nxt-text-secondary); }
                    .hg-combine code { font-family: var(--nxt-font-mono); background: var(--nxt-panel); padding: 1px 5px; font-size: 11px; margin: 0 2px; }
                    .hg-examples__label { font-family: var(--nxt-font-mono); font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--nxt-text-tertiary); margin-bottom: 4px; }
                    .hg-example { margin: 4px 0; background: var(--nxt-text-primary); color: var(--nxt-lime); padding: 8px 10px; font-family: var(--nxt-font-mono); font-size: 11px; line-height: 1.5; overflow-x: auto; }
                    .hg-meta { font-family: var(--nxt-font-mono); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--nxt-text-tertiary); border-top: 1px solid var(--nxt-border); padding-top: 8px; margin-top: auto; }
                </style>
                <div class="hg-root">
                    <h1>HiC Chat Directives - Reference Guide</h1>
                    <p class="hg-intro">Every hashtag you can type in the AI Analyst or Design Desk chat, what it produces, how to combine it. Updated automatically from the hashtagRegistry - when a new directive ships, this page reflects it on the next #help.</p>
                    ${sections}
                </div>`;
                const saved = await saveArtifact({
                    title: 'HiC Hashtag Reference Guide',
                    generator: '#help',
                    html_source: html,
                    slug: 'hic-hashtag-help-guide',
                    brand: 'NXT',
                    topic: 'reference',
                });
                setMessages(prev => prev.map(m => m.id === helpMsgId ? {
                    ...m,
                    content: `HiC chat directive reference is ready. Click LAUNCH to open the guide in a new window. Every hashtag, every modifier, every combination is listed - bookmark this URL to share with new team members.`,
                    artifactUrl: `http://127.0.0.1:5012${saved.view_url}`,
                    artifactMeta: {
                        slug: saved.slug,
                        title: saved.title,
                        generator: '#help',
                        brand: 'NXT',
                        html_chars: saved.html_chars,
                    },
                } : m));
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === helpMsgId ? {
                    ...m,
                    content: `#help failed: ${e?.message || 'unknown'}`,
                } : m));
            }
            setIsLoading(false);
            return;
        }

        // --- #artifacts (bare - library list) -----------------------------
        if (parseArtifactsLibraryDirective(query).triggered) {
            const libMsgId = `msg_${Date.now()}_artifacts_lib`;
            setMessages(prev => [...prev, {
                id: libMsgId,
                role: 'assistant',
                content: 'Loading saved artifacts...',
                timestamp: Date.now(),
            }]);
            try {
                const lib = await listArtifacts();
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: lib.total === 0
                        ? 'No saved artifacts yet. Try `#brief <topic>`, `#explainer <topic>`, `#report <topic>`, `#playground <feature>`, or `#approaches <decision>` to create one. Run `#help` for the full directive guide.'
                        : `Your saved artifacts (${lib.total}). Click LAUNCH to open; DELETE removes.`,
                    artifactLibraryItems: lib.results,
                } : m));
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: `Could not load artifact library: ${e?.message || 'unknown'}`,
                } : m));
            }
            setIsLoading(false);
            return;
        }

        // --- #brief / #explainer / #report / #playground / #approaches ---
        // All five share one handler. Differ only in the directive token
        // and the html-deliverable-composer subsection invoked.
        const artifactParsers = [
            { parser: parseBriefDirective, label: 'stakeholder brief' },
            { parser: parseExplainerDirective, label: 'concept explainer' },
            { parser: parseReportDirective, label: 'strategic report' },
            { parser: parsePlaygroundDirective, label: 'interactive playground' },
            { parser: parseApproachesDirective, label: 'approaches picker' },
            // 2026-05-23 - P1.5 (Sprint H3): #whitepaper produces a consulting-grade
            // HTML whitepaper from the strategic-report pipeline output. Sprint H3
            // promised this would ship as a #html modifier on strategic reports;
            // implementation is a separate directive instead because that keeps the
            // route deterministic (modifier-on-modifier is brittle).
            { parser: parseWhitepaperDirective, label: 'consulting whitepaper' },
        ];
        let firstHit: { directive: ReturnType<typeof parseBriefDirective>; label: string } | null = null;
        for (const ap of artifactParsers) {
            const d = ap.parser(query);
            if (d.triggered) { firstHit = { directive: d, label: ap.label }; break; }
        }
        // 2026-08-13 (owner): a SUMMARY ask is a chat answer, not an HTML artifact.
        // "#report Summarize what the data shows..." routed a fast synthesis question
        // through the 41KB-skill HTML pipeline. When the #report topic is a
        // summarize-class verb, fall through to the normal grounded chat path
        // (ChatProse renders it structured; Flash routes it).
        if (firstHit && firstHit.directive.generator === '#report'
            && /^(summari[sz]e|summary(\s+of)?|recap|tl;?dr)\b/i.test((firstHit.directive.topic || '').trim())) {
            console.log('[#report] summarize-class topic -> grounded CHAT summary (HTML pipeline skipped)');
            firstHit = null;
        }
        // 2026-06-13 - #brief/#explainer/#report have GOLD slide TWINS (executive-brief).
        // When the user adds #slide/#slides, DEFER to sendChatMessage slide-mode (the GOLD
        // slide) instead of the HTML document; the bare directive keeps the HTML one-pager.
        // #playground/#approaches/#whitepaper have no slide twin, so they always take the
        // HTML path even with #slide.
        const _wantsSlideTwin = /(?:^|\s)#slides?\b/i.test(query);
        const _twinGenerators = ['#brief', '#explainer', '#report'];
        if (firstHit && _wantsSlideTwin && _twinGenerators.includes(firstHit.directive.generator)) {
            firstHit = null; // fall through to the canonical slide engine below
        }
        if (firstHit) {
            const directive = firstHit.directive;
            const buildMsgId = `msg_${Date.now()}_artifact_${directive.generator.replace('#', '')}`;
            // Drive the loading indicator with the ACTUAL cost/quality-routed model
            // (aiRouter.artifactModelFor: schema -> Flash, evidence/narrative -> Pro
            // while capped / Opus after) so the label matches what really runs.
            setInFlightModelId(artifactModelFor(directive.generator) as ChatModel);
            setMessages(prev => [...prev, {
                id: buildMsgId,
                role: 'assistant',
                content: `Generating ${firstHit!.label} (${directive.generator}, brand=${directive.brand}${directive.variants > 1 ? `, ${directive.variants} variants` : ''})...\n\nLoading verbalized-sampling + html-deliverable-composer skills, then composing the HTML artifact via Claude Opus 4.8 (max thinking budget).`,
                timestamp: Date.now(),
            }]);
            try {
                // Load both skills in parallel.
                const [vsResp, htmlResp] = await Promise.all([
                    fetch('/skills/verbalized-sampling/SKILL.md').then(r => r.ok ? r.text() : ''),
                    fetch('/skills/html-deliverable-composer/SKILL.md').then(r => r.ok ? r.text() : ''),
                ]);
                if (htmlResp.length > 0) console.log(`[${directive.generator}] Loaded html-deliverable-composer SKILL.md (${htmlResp.length} chars)`);
                if (vsResp.length > 0) console.log(`[${directive.generator}] Loaded verbalized-sampling SKILL.md (${vsResp.length} chars)`);

                const liveCtx = getContext ? getContext() : context;
                const upFiles = (liveCtx?.uploadedFiles as any[]) || [];
                const upContents = (liveCtx?.uploadedFileContents as string) || '';
                const themesArr = (liveCtx?.themes as any[]) || [];
                const personasArr = (liveCtx?.personas as any[]) || [];
                // 2026-05-31 - OBJECTIVE-KEYED EVIDENCE for html deliverables
                // (#brief/#explainer/#report/#whitepaper). Previously this used a
                // raw corpusText.slice(0,60000), so a thin/off-objective session
                // corpus produced a thin/off-objective whitepaper. Pull the
                // on-objective article bodies from the fixed chunk-store retrieval
                // (same path themes/journey use); fall back to the raw corpus only
                // if retrieval is empty.
                const _wpGoal = `${directive.topic || ''}. ${liveCtx?.researchGoal || ''}`.trim();
                // 2026-06-12 - MANIFEST-CHUNK grounding (supercharge 5.1): the HTML
                // directives now lead with cite-by-pointer chunks via the shared
                // MCR helper; embedding retrieval and the raw corpus are fallbacks.
                let corpusBlock = '';
                // Stage-3: carry the resolved grounding chunks out to the AIR evidence ledger (emitDeliverable.air).
                let _airChunks: Array<{ id: string; sourcePath?: string; text?: string; sources?: Array<{ n: string; u: string }>; concepts?: string[]; relatedChunks?: string[] }> = [];
                try {
                    const { buildManifestCorpusForGoal } = await import('../services/chunkRetrieval');
                    const _mcr = await buildManifestCorpusForGoal(
                        _wpGoal || (liveCtx?.researchGoal || query), currentEngagementSlug() || '', { extraContext: query });
                    if (_mcr.chunkCount > 0) corpusBlock = _mcr.corpus + '\n\n' + _mcr.instructions;
                    if (_mcr.chunks?.length) _airChunks = _mcr.chunks as any;
                } catch (e: any) {
                    console.warn(`[${directive.generator}] MCR grounding failed:`, e?.message || e);
                }
                if (!corpusBlock) {
                    try {
                        const { fetchWikiArticles, formatArticlesAsCorpusBlock } = await import('../services/wikiIndexService');
                        const _arts = await fetchWikiArticles({
                            query: _wpGoal || (liveCtx?.researchGoal || query),
                            engagementGoal: liveCtx?.researchGoal || _wpGoal,
                            goalBlendWeight: 0.35, limit: 40, maxCharsPerArticle: 6000, minChars: 300,
                            includeSynthesis: false,
                        } as any);
                        if (Array.isArray(_arts) && _arts.length > 0) {
                            corpusBlock = formatArticlesAsCorpusBlock(_arts as any, 90000);
                            console.log(`[${directive.generator}] FALLBACK objective-keyed evidence: ${_arts.length} articles (MCR empty)`);
                        }
                    } catch (e: any) {
                        console.warn(`[${directive.generator}] objective retrieval failed, using session corpus:`, e?.message || e);
                    }
                }
                if (!corpusBlock) corpusBlock = (liveCtx?.corpusText || '').slice(0, 60000);

                const uploadsBlock = upFiles.length > 0
                    ? `Uploaded client documents (${upFiles.length}): ${upFiles.map((f: any) => f.name || f.filename).filter(Boolean).join('; ')}\n\nUploaded document contents (verbatim, truncated):\n${upContents.slice(0, 50000)}`
                    : '(no uploaded client documents)';
                // 2026-05-31 - Richer theme evidence (was a 200-char one-liner with
                // no quotes). Give the composer the description + the defining
                // verbatim quote + a couple of named citations so it can write deep,
                // evidence-anchored sections instead of summarizing labels.
                const themesSummary = themesArr.length > 0
                    ? themesArr.slice(0, 15).map((t: any, i: number) => {
                        const desc = (t?.thesis || t?.description || '').slice(0, 320);
                        const q = t?.quote ? `\n   Quote: "${String(t.quote).slice(0, 220)}"` : '';
                        const cites = Array.isArray(t?.citations)
                            ? t.citations.slice(0, 3).map((c: any) => c?.sourceName || c?.sourceFile).filter(Boolean).join(', ')
                            : '';
                        const citeLine = cites ? `\n   Sources: ${cites}` : '';
                        return `${i + 1}. ${t?.name || t?.title || 'Theme'} - ${desc}${q}${citeLine}`;
                    }).join('\n')
                    : '(no themes available)';
                const personasSummary = personasArr.length > 0
                    ? personasArr.slice(0, 8).map((p: any, i: number) => `${i + 1}. ${p?.name || 'Persona'} - ${p?.jtbd || p?.bio || ''}`).join('\n').slice(0, 4000)
                    : '(no personas available)';

                const directiveInstructions: Record<string, string> = {
                    '#brief': 'Produce a stakeholder-grade ONE-PAGER. Length 600-1200 words of visible content. ONE hero data point visually dominant. ONE diagram (apply micro-VS to pick diagram type). 2-3 supporting findings as short paragraphs or data cards. Stakeholder names + engagement context surfaced. Primary VS layer: visual layout - enumerate 5 candidates and commit.',
                    '#explainer': 'Produce a DEEP-DIVE explainer page modeled on the "How rate limiting works" pattern. Length 1500-3500 words. Flow diagram or system map at the top (apply micro-VS to pick diagram type). 2-4 annotated code/data snippets beside the prose. "Gotchas" section at the bottom with severity-coded callouts. Primary VS layer: information architecture - enumerate 5 IAs (flow-led / snippet-led / Q&A / worked-example / decision-tree) and commit.',
                    '#report': 'Produce a LONG-FORM strategic report. Length 3000-8000 words. Tabbed or anchored sections (default Exec Summary / Findings / Recommendations / Next Steps - but VS-pick alternative section IAs). Embedded charts per section. Evidence panels with verbatim corpus quotes. Summary table at the top. Optimized for navigation, not sequential read. Primary VS layer: section IA + diagram type per chart.',
                    '#whitepaper': 'Produce a CONSULTING-GRADE STRATEGIC WHITEPAPER, deep and fully framed. Length 2500-6000 words of visible prose. MANDATORY structure: (1) a diagnostic action-title + 500-800 word executive summary in SCQA; (2) FRAME THE SPACE - a substantial section on where this domain is now, the forces shaping it, and where it is heading; (3) 4-6 KEY FINDINGS, each a claim + 3-5 sentences of analysis + at least one VERBATIM cited quote from a NAMED external source + a 2-4 sentence case study where the evidence supports one; (4) OPPORTUNITIES tied to named findings; (5) CHALLENGES / RISKS with why each bites; (6) RECOMMENDED MOVES that reinforce each other (Rumelt coherence). Weave 2-3 named sources per paragraph showing convergent evidence. EVIDENCE FLOOR: >=8 verbatim cited quotes from >=5 distinct external sources. If any section is a stub or the space is not framed, EXPAND before returning. A thin whitepaper is a failure. Primary VS layer: section IA.',
                    '#playground': 'Produce a SELF-CONTAINED INTERACTIVE HTML playground. Primary VS layer: INTERACTION PATTERN - enumerate 5+ patterns (sliders, before/after swap, drag-to-position, easing-curve picker / Bezier, code-with-live-preview, motion timeline, scrubber) and commit to the pattern that actually visualizes the parameter shape. Avoid the slider-only default. Include a live preview area + a "Copy as prompt" button that serializes the user\'s settings as a prompt string to paste back into HiC.',
                    '#approaches': `Produce a NATIVE VS-MULTI approach picker. Generate exactly 6 distinct approaches in a 2×3 HTML grid: row 1 = 3 Defensible Consensus approaches (probabilities in full distribution), row 2 = 3 Non-Obvious Bets (probability < 0.05, explicitly distinct from row 1 by named axis: persona, mechanism, data source, temporal scope, or metaphor). Each card: name, 2-3 pros, 2-3 cons, when-to-pick-this, probability pill, "Pick this" button. The two rows are visually differentiated (chartreuse-bordered consensus, cyan-bordered bets).`,
                };

                const variantBlock = directive.variants > 1
                    ? `\n\n=== VARIANTS MODIFIER ACTIVE ===\nThe user requested --variants ${directive.variants}. Emit exactly ${directive.variants} distinct full variants of the deliverable in a single 2×3 (or appropriate) HTML grid. Each variant card includes: full content (small-rendered), probability pill, one-line tradeoff caption, "Pick this" button. Canonical probability distribution: 1 near-modal (p≈0.30-0.45) + (${Math.floor(directive.variants / 2) - 1}) shifted-frame (p≈0.10-0.20) + remaining tail (p<0.05).`
                    : '';

                const userPayload = `USER REQUEST (verbatim - this is the primary spec):\n"""\n${query}\n"""\n\nDirective: ${directive.generator}\nBrand: ${directive.brand}\nVariants: ${directive.variants}\nTopic: ${directive.topic || '(stripped - refer to the verbatim request above)'}\n\n=== DIRECTIVE-SPECIFIC INSTRUCTIONS ===\n${directiveInstructions[directive.generator] || ''}${variantBlock}\n\nResearch goal: ${liveCtx?.researchGoal || 'unstated'}\n\n=== THEMES (${themesArr.length}, summarized) ===\n${themesSummary}\n\n=== PERSONAS (${personasArr.length}, summarized) ===\n${personasSummary}\n\n${uploadsBlock}\n\n=== EXTERNAL CORPUS EXCERPT (truncated) ===\n${corpusBlock}\n\n=== OUTPUT FORMAT ===\nEmit ONLY the HTML body content. Do NOT wrap in <html>/<head>/<body> - the artifact /view endpoint injects the NXT/NU brand wrapper, fonts, print stylesheet, and Copy-as-prompt footer. Your output is the artifact's <main> content. Start with the <vs_thinking> block (will be moved to footer at render time), then the HTML structure.`;

                // Phase 1.4 (intent-realization-plan) - this artifact/hashtag path
                // previously BYPASSED loadGenerationContext: framework spec, anti-
                // patterns, and cross-engagement portfolio patterns never reached the
                // prompt (only the 2 skill files did). Inject them now so the same
                // wiki-grounding governance the structured deliverable pipeline gets
                // applies to #brief/#report/#whitepaper/#explainer/etc. too.
                // Best-effort, bounded, non-fatal.
                let genContextBlock = '';
                try {
                    const { loadGenerationContext } = await import('../services/wikiService');
                    const _GEN_TO_OUTPUT: Record<string, string> = {
                        '#gap': 'GAP_ANALYSIS', '#compete': 'COMPETITIVE_ANALYSIS', '#competitive': 'COMPETITIVE_ANALYSIS',
                        '#audit': 'TECH_AUDIT', '#techaudit': 'TECH_AUDIT', '#strategy': 'STRATEGIC_RECS',
                    };
                    const _outputType = (_GEN_TO_OUTPUT[directive.generator] || 'STRATEGIC_RECS') as any;
                    const _slug = (liveCtx?.researchGoal || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
                    const _gc: any = await loadGenerationContext(_outputType, { engagement: _slug });
                    const _parts: string[] = [];
                    if (_gc?.framework) _parts.push('=== FRAMEWORK SPECIFICATION (from wiki) ===\n' + String(_gc.framework).slice(0, 12000));
                    if (_gc?.antiPatterns) _parts.push('=== ANTI-PATTERNS TO AVOID (from wiki) ===\n' + String(_gc.antiPatterns).slice(0, 8000));
                    if (_gc?.crossEngagementPatterns) _parts.push('=== CROSS-ENGAGEMENT PORTFOLIO PATTERNS (from PRIOR, possibly DIFFERENT-INDUSTRY engagements) ===\nThese are observations mined from EARLIER runs that may belong to a COMPLETELY DIFFERENT INDUSTRY than the current subject. Use a pattern ONLY if it genuinely fits the user\'s subject and corpus. NEVER import their domain, named entities, or vocabulary (e.g. higher-ed / co-op / donor / advancement / student) into an unrelated subject - if a pattern is off-domain, ignore it entirely.\n' + String(_gc.crossEngagementPatterns).slice(0, 6000));
                    if (_gc?.engagementGoals) _parts.push(String(_gc.engagementGoals));
                    genContextBlock = _parts.join('\n\n');
                    if (genContextBlock) console.log(`[${directive.generator}] loadGenerationContext injected (framework=${!!_gc?.framework}, antiPatterns=${!!_gc?.antiPatterns}, patterns=${!!_gc?.crossEngagementPatterns})`);
                } catch (e: any) {
                    console.warn(`[${directive.generator}] loadGenerationContext injection skipped (non-fatal):`, e?.message || e);
                }

                // E1 (2026-07-02): cache-aligned - the two SKILL.md blocks (~41KB) are STABLE across every
                // engagement; the marker makes them an Anthropic cache breakpoint at the proxy.
                const { HIC_CACHE_BREAK: _cacheBreak } = await import('../services/aiRouter');
                const systemPrompt = [
                    vsResp ? vsResp + '\n\n---\n\n' : '',
                    htmlResp ? htmlResp + '\n\n---\n\n' : '',
                    (vsResp || htmlResp) ? _cacheBreak : '',
                    genContextBlock ? genContextBlock + '\n\n---\n\n' : '',
                    `You are composing a ${firstHit.label} HTML artifact for HiC. Apply verbalized-sampling at the primary layer for this directive (see directive-specific instructions in the user message). Use NXT brand tokens (or NU when brand=${directive.brand}). Honor the FRAMEWORK SPECIFICATION and ANTI-PATTERNS above. Compose the artifact body. The /view endpoint will inject the wrapper.

SUBJECT DISCIPLINE (HARD, 2026-08-13 live defect): the artifact is about its SUBJECT, never about the research apparatus. The corpus, the evidence, the data, and the sources are NEVER the grammatical subject of the <h1> or any heading ("The evidence tells one clear story", "the corpus can name X but cannot substantiate Y" are instant failures). Never describe corpus coverage, adequacy, or gaps anywhere in the artifact. When the available material is thin (e.g. only client uploads so far), NARROW THE SCOPE: write a shorter artifact about what the material DOES establish about the subject, titled with a judgment about the SUBJECT. The <h1> is a complete-sentence judgment about the subject, 12 words or fewer.`,
                ].join('');

                setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                    ...m,
                    content: `Generating ${firstHit!.label} (${directive.generator})...\n\n Loaded verbalized-sampling skill (${vsResp.length} chars)\n Loaded html-deliverable-composer skill (${htmlResp.length} chars)\n○ Calling Claude Opus 4.8 (max thinking)...`,
                } : m));

                // 2026-05-27 - Route the html-deliverable-composer family
                // (#strategy/#gap/#audit/#compete/#case-study) through the
                // deliverableModelRouter, eliminating the prior hardcoded
                // gemini-3.1-pro-preview + thinkingBudget:'max' + default 300s
                // timeout + NO fallback pattern (the same shape that hard-failed
                // recommendations). The router honors the selected model, gives
                // Pro a 530s ceiling, and falls back Gemini->Flash->Claude.
                const { callWithModelChain } = await import('../services/deliverableModelRouter');
                const { emitDeliverable } = await import('../services/emitDeliverable');
                const _genToKind: Record<string, string> = {
                    '#strategy': 'strategy', '#gap': 'gap',
                    '#compete': 'competitive', '#competitive': 'competitive',
                    '#audit': 'tech-arch', '#techaudit': 'tech-arch',
                    '#case-study': 'strategy', '#casestudy': 'strategy',
                };
                const _htmlKind = (_genToKind[directive.generator] || 'strategy') as any;
                // 2026-06-30 - cap-aware cost/quality model via the canonical SSOT
                // (aiRouter.artifactModelFor). Was hardcoded 'claude-opus-4-8', which
                // burned an HTTP 400 on every HTML deliverable during the Opus cap
                // before the chain fell back. Now: schema kinds -> Flash, evidence/
                // narrative -> Gemini 3.1 Pro (capped) / Opus (after). Auto-restores.
                // W2 (2026-07-01): use the FULL routing decision (model + reason + alternatives) so the AIR
                // modelTrace records WHY this model, not just which. artifactModelFor stays the id shorthand.
                const _artDecision = chooseArtifactModel(_htmlKind);
                const _artModel = _artDecision.selectedModel;
                // 2026-05-31 - generation as a reusable closure so we can run a
                // DEPTH-FLOOR expand retry (the #whitepaper/#report path was a
                // single shallow pass; this gives it the same depth discipline as
                // the strategic report fan-out).
                // 2026-06-06 - Wrapped in emitDeliverable (C2). This single
                // wrap activates trace + Pareto signal for 10 hashtag paths
                // that all flow through this closure (#strategy, #gap, #compete,
                // #audit, #case-study, #report, #brief, #explainer, #whitepaper,
                // #playground). Each one was previously invisible to the epoch
                // proposer because the chat-side emission bypassed both
                // recordTurn and evaluatePareto.
                const _runGen = async (extra: string): Promise<string> => {
                    const _payload = userPayload + extra;
                    const _t0 = Date.now();
                    const _emit = await emitDeliverable({
                        deliverable: directive.generator,
                        step_label: `${directive.generator} artifact`,
                        // cap-aware cost/quality model (aiRouter SSOT); trace label matches the real routed model.
                        model_id: _artModel,
                        prompt: _payload,
                        started_at: _t0,
                        // 2026-06-06 - Fix 2: HTML deliverables (#strategy/
                        // #brief/#report/#explainer/#whitepaper/etc.) load
                        // verbalized-sampling SKILL.md inside the generation
                        // (k=5 layout candidates). Annotate the trace.
                        vs: { k: 5, frames: ['visual_layout', 'information_architecture', 'diagram_type', 'interaction_pattern', 'iconography'] },
                        emit: () => callWithModelChain({
                        deliverable: _htmlKind,
                        preferModel: _artModel,
                        label: `${directive.generator} artifact`,
                        buildBody: (modelId: string) => {
                            if (modelId.startsWith('claude-')) {
                                return { endpoint: 'anthropic', body: { model: modelId, max_tokens: 32000, system: systemPrompt, messages: [{ role: 'user', content: _payload }] } };
                            }
                            if (modelId.startsWith('gemini-')) {
                                return { endpoint: 'gemini', body: { model: modelId, systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: _payload }] }], config: { temperature: 0.85, maxOutputTokens: 65536, thinkingBudget: modelId === 'gemini-3.1-pro-preview' ? 'high' : 'low' } } };
                            }
                            return { endpoint: 'openai', headers: { 'x-openai-endpoint': 'chat' }, body: { model: modelId, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: _payload }], max_completion_tokens: 32000, temperature: 0.85 } };
                        },
                        onProgress: (msg: string) => {
                            setMessages(prev => prev.map(m => m.id === buildMsgId ? { ...m, content: `Generating ${firstHit!.label} (${directive.generator})... ${msg}` } : m));
                        },
                        }),
                        extractText: (r) => (r && typeof r === 'object' && 'text' in r ? String((r as any).text || '') : ''),
                        buildScoreInput: (text) => ({ text, label: directive.generator }),
                        // Stage-3 AIR emission (SHADOW): the strategy/HTML-artifact path is the first real
                        // AIR consumer. buildAir+validate(shadow)+writeAir run in emitDeliverable; non-blocking.
                        air: {
                            trigger: directive.generator,
                            objective: ((getContext ? getContext() : context)?.researchGoal) || '',
                            resolvedChunks: _airChunks,   // Stage-3: REAL evidence ledger from the grounding chunks
                            buildPayload: (_r, t) => ({ kind: _htmlKind, html: t }),
                            // W2: the routing decision (model + scored reason + alternatives) rides into modelTrace.
                            routing: { model: _artModel, reason: _artDecision.reason },
                        },
                    });
                    const text = _emit.result.text;
                    let cleaned = (text || '').replace(/^```(?:html)?\s*\n/i, '').replace(/\n```\s*$/i, '').trim();
                    // 2026-06-24 - HTML-safe meta/process scrub. This client artifact
                    // path previously ran NO meta strip (only the fence strip above),
                    // so corpus/process self-references leaked into the output (e.g.
                    // "the only corpus-confirmed model ..." in a live #brief title).
                    try {
                        const { scrubArtifactHtmlMeta } = await import('../services/slidePostProcessor');
                        cleaned = scrubArtifactHtmlMeta(cleaned);
                    } catch { /* non-fatal: meta scrub is best-effort */ }
                    return cleaned;
                };
                // Visible-word floor per directive (#brief is intentionally short;
                // #playground/#approaches are interactive, not prose-graded).
                const _wordFloor: Record<string, number> = { '#brief': 450, '#explainer': 1200, '#report': 1800, '#whitepaper': 1800, '#playground': 0, '#approaches': 0 };
                const _floor = _wordFloor[directive.generator] ?? 800;
                const _visibleWords = (h: string) => h
                    .replace(/<vs_thinking>[\s\S]*?<\/vs_thinking>/i, '')
                    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
                    .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
                let htmlBody = await _runGen('');
                if (directive.variants <= 1 && _floor > 0) {
                    const w0 = _visibleWords(htmlBody);
                    if (w0 < _floor) {
                        console.warn(`[${directive.generator}] thin output (${w0}w < ${_floor}) - expanding`);
                        setMessages(prev => prev.map(m => m.id === buildMsgId ? { ...m, content: `Generating ${firstHit!.label} (${directive.generator})... expanding to full depth...` } : m));
                        try {
                            const expanded = await _runGen(`\n\n=== EXPAND (CRITICAL) ===\nYour previous draft was TOO THIN (${w0} words; target ${_floor}+). Regenerate the FULL artifact substantially deeper: every section expanded with more evidence, named-source verbatim quotes, case studies, and convergent sources. FRAME THE SPACE (where the field is now, the forces shaping it, where it is heading, the biggest opportunities and challenges). Do NOT summarize, do NOT drop sections, ADD substance.`);
                            if (_visibleWords(expanded) > w0) htmlBody = expanded;
                        } catch (e: any) { console.warn(`[${directive.generator}] expand retry failed:`, e?.message || e); }
                    }
                }
                if (htmlBody.length < 100) throw new Error('Model returned empty/short HTML body');

                // Derive a slug + title. Title = first <h1> if present, else the topic.
                // 2026-07-02 live-defect fix: the old hard .slice(0,120) cut mid-word
                // ("...lenders price smallh") and stripTags never decoded entities, so a
                // literal "&mdash;" shipped in the chat reply. Titles now decode entities,
                // obey the em-dash ban (stripEmDashes), and truncate at a word boundary.
                const h1Match = htmlBody.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                const { stripEmDashes, guardArtifactTitle } = await import('../services/slidePostProcessor');
                const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                const decodeEntities = (s: string) => s
                    .replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ')
                    .replace(/&quot;|&ldquo;|&rdquo;|&#822[01];/gi, '"')
                    .replace(/&#39;|&apos;|&lsquo;|&rsquo;|&#821[67];/gi, "'")
                    .replace(/&hellip;|&#8230;/gi, '...');
                const tidyTitle = (raw: string, max: number) => {
                    let t = stripEmDashes(decodeEntities(stripTags(raw))).replace(/\s+/g, ' ').trim();
                    if (t.length > max) {
                        const cutAt = t.slice(0, max + 1).lastIndexOf(' ');
                        t = t.slice(0, cutAt > max * 0.6 ? cutAt : max).replace(/[\s,;:.]+$/, '').trim();
                    }
                    return t;
                };
                // 2026-08-13 CORPUS-META TITLE GUARD (live defect: "The evidence tells one
                // clear story: the corpus can name ... but it cannot yet substantiate the").
                // guardArtifactTitle rejects corpus-as-subject meta titles (falls back to
                // the user's topic), strips meta-narration + cliches, and trims the dangling
                // function word truncation can leave.
                const _rawTitle = h1Match ? tidyTitle(h1Match[1], 120) : tidyTitle(directive.topic || `${directive.generator} artifact`, 80);
                const title = guardArtifactTitle(_rawTitle, tidyTitle(directive.topic || `${directive.generator} artifact`, 80));

                const saved = await saveArtifact({
                    title,
                    generator: directive.generator,
                    html_source: htmlBody,
                    brand: directive.brand,
                    topic: directive.topic,
                });

                setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                    ...m,
                    content: `Artifact ready: **${title}** (${directive.generator}, ${directive.brand}, ${Math.round((saved.html_chars || htmlBody.length) / 1024)}KB).\n\nClick LAUNCH to open in a new window. Footer has Copy-as-prompt + Save-as-PDF buttons. Run \`#refine ${saved.slug}: <your tweak>\` to iterate.`,
                    artifactUrl: `http://127.0.0.1:5012${saved.view_url}`,
                    artifactMeta: {
                        slug: saved.slug,
                        title,
                        generator: directive.generator,
                        brand: directive.brand,
                        html_chars: saved.html_chars,
                        topic: directive.topic,
                    },
                } : m));

                // 2026-06-05 - PREVIEW/EXPORT PARITY FIX. When the user typed
                // `#slides` (or `#slide`) alongside the HTML-artifact directive
                // (#brief / #explainer / #report / #whitepaper / #approaches /
                // #playground), auto-fire the GOLD editable PPTX export. Routes
                // the artifact HTML through /api/gold/export-pptx (Playwright +
                // pixel-accurate editable text with the gold fonts embedded),
                // NOT the template-driven pptxgenjs deck export which produces
                // the broken twin (squashed titles, MEAN/S line break, missing
                // hierarchy). The gold pipeline is the only path that yields
                // visual parity with the chat preview.
                const wantsSlidesExport = /(?:^|\s)#slides?\b/i.test(query);
                if (wantsSlidesExport) {
                    try {
                        const { exportGoldPptx } = await import('../services/goldArtifact');
                        setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                            ...m,
                            content: (m.content || '') + `\n\nExporting editable PPTX (gold pipeline, brand fonts embedded)...`,
                        } : m));
                        const pptxFilename = `${saved.slug || 'artifact'}-${directive.brand.toLowerCase()}.pptx`;
                        await exportGoldPptx(htmlBody, pptxFilename);
                        setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                            ...m,
                            content: (m.content || '') + `\n Downloaded **${pptxFilename}** - editable text on a pixel-accurate background, opens in PowerPoint with the NXT/NU brand fonts.`,
                        } : m));
                    } catch (pptxErr: any) {
                        console.warn(`[${directive.generator}#slides] gold pptx export failed:`, pptxErr?.message || pptxErr);
                        setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                            ...m,
                            content: (m.content || '') + `\n PPTX export failed: ${pptxErr?.message || 'unknown'}. The HTML artifact is still saved - click LAUNCH and use Save-as-PDF in the footer.`,
                        } : m));
                    }
                }
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === buildMsgId ? {
                    ...m,
                    content: `Artifact generation failed: ${e?.message || 'unknown'}`,
                } : m));
            }
            setInFlightModelId(null);
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
            return;
        }

        // --- #prototypes (PLURAL - library list) - 2026-05-11 -------------
        // Bare `#prototypes` lists every saved experience prototype with
        // Launch / Edit / Delete chips. Detected BEFORE #proto so the
        // plural form doesn't trigger a build.
        if (/(?:^|\s)#prototypes(?=\s|$|[.,;:!?'"])/i.test(query)) {
            const libMsgId = `msg_${Date.now()}_proto_lib`;
            setMessages(prev => [...prev, {
                id: libMsgId,
                role: 'assistant',
                content: 'Loading your saved prototypes...',
                timestamp: Date.now(),
            }]);
            try {
                const { listPrototypes } = await safeDynamicImport(
                    () => import('../services/prototypeLibrary'),
                    'prototypeLibrary (list)',
                );
                const lib = await listPrototypes();
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: lib.total === 0
                        ? 'No saved prototypes yet. Generate one with `#proto <concept>` to start your library.'
                        : `Your saved prototypes (${lib.total}). Click any card to launch, edit, or delete.`,
                    prototypeLibraryItems: lib.results,
                } : m));
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: `Could not load prototype library: ${e?.message || 'unknown error'}`,
                } : m));
            }
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
            return;
        }

        // --- #proto (SINGULAR - generate 5 briefs, user approves one) - 2026-05-13 ---
        // `#proto <concept>` now triggers a TWO-PHASE flow:
        //   Phase A: Verbalized-Sampling brief generator returns 5 distinct
        //            product briefs covering modal → tail framings of the
        //            concept. User reviews comparison cards in chat.
        //   Phase B: User clicks BUILD THIS on a brief → handleApproveBrief
        //            runs the build pipeline (Stage 2 → 3 → 3.5 → 4 → 5)
        //            with the approved brief, skipping Stage 1 entirely.
        // `#NXT`/`#NU` flags select the brand (passed through both phases).
        const protoDirective = parsePrototypeDirective(query);
        if (protoDirective.triggered) {
            const briefsMsgId = `msg_${Date.now()}_proto_briefs`;
            setMessages(prev => [...prev, {
                id: briefsMsgId,
                role: 'assistant',
                content: `Generating 5 product briefs for this concept via Verbalized Sampling (brand=${protoDirective.brand})...\n\nEach brief is a distinct framing - modal at the head of the distribution, surprising-but-grounded at the tail. The deepest, most detailed brief gets chosen by you, then executes through an exhaustive Build Recipe.`,
                timestamp: Date.now(),
            }]);
            try {
                const liveCtx = getContext ? getContext() : context;

                // 2026-05-11 - When the user clicked a recommendation tile,
                // `protoDirective.basedOn` is the tile slug. The slug alone
                // is too thin: the Stage 1 Concept Decomposer has to guess
                // what "beyond-brand-discovery" means and routinely picks
                // the WRONG sense (e.g. "brand strategy" instead of "discovery
                // beyond brand-name employers"). Look up the matching tile
                // in the chat history and prepend its FULL context (title,
                // thesis, persona, moment, aha, AI capabilities, execution
                // path) so the pipeline builds the concept the user picked,
                // not a hallucinated reinterpretation of the slug.
                let conceptText = protoDirective.concept || query;
                let matchedTile: any = null;
                if (protoDirective.basedOn) {
                    const slugLc = protoDirective.basedOn.toLowerCase();
                    for (let mi = messages.length - 1; mi >= 0; mi--) {
                        const tiles = (messages[mi] as any).recommendationTiles as any[] | undefined;
                        if (!Array.isArray(tiles)) continue;
                        const found = tiles.find(t => (t?.slug || '').toLowerCase() === slugLc);
                        if (found) { matchedTile = found; break; }
                    }
                }
                // Look up the engagement_context that was emitted with this
                // recommendations set, so the prototype builder gets the full
                // brand/industry/stack/regulatory frame - not just the tile.
                let matchedContext: EngagementContext | undefined;
                if (protoDirective.basedOn) {
                    for (let mi = messages.length - 1; mi >= 0; mi--) {
                        const ctx = (messages[mi] as any).engagementContext as EngagementContext | undefined;
                        const tiles = (messages[mi] as any).recommendationTiles as any[] | undefined;
                        if (ctx && Array.isArray(tiles) && tiles.some(t => (t?.slug || '').toLowerCase() === protoDirective.basedOn!.toLowerCase())) {
                            matchedContext = ctx;
                            break;
                        }
                    }
                }
                if (matchedTile) {
                    const caps = Array.isArray(matchedTile.ai_capabilities) ? matchedTile.ai_capabilities.join(', ') : '';
                    const evidenceArr: string[] = Array.isArray(matchedTile.evidence_sources) ? matchedTile.evidence_sources : [];
                    // Resolve generic field names with legacy fallback.
                    const tWhyMatters = (matchedTile as any).why_matters_target_segment || (matchedTile as any).why_matters_first_year || '';
                    const tLongTerm = (matchedTile as any).long_term_outcome_through_line || (matchedTile as any).long_term_coop_readiness || '';
                    const tInitiativeDeps = (matchedTile as any).initiative_dependency_explanation || (matchedTile as any).clr_dependency_explanation || '';
                    const tStackExec = (matchedTile as any).execution_in_existing_stack || (matchedTile as any).execution_in_nu_stack || '';
                    const tStackFit = (matchedTile as any).preferred_stack_fit || (matchedTile as any).microsoft_copilot_fit || '';
                    const tGuardrailFit = (matchedTile as any).stakeholder_guardrail_fit || (matchedTile as any).guardrail_fit || '';
                    // Engagement context as a structured block (the prototype
                    // builder uses this to set seed data, named systems,
                    // regulatory chrome, stakeholder roles, segment voice).
                    const ctxBlock = matchedContext ? [
                        `=== ENGAGEMENT CONTEXT (the prototype must visibly inhabit this) ===`,
                        matchedContext.client_name ? `Client: ${matchedContext.client_name}` : '',
                        matchedContext.vendor_or_consultant ? `Vendor/Consultant: ${matchedContext.vendor_or_consultant}` : '',
                        matchedContext.industry ? `Industry: ${matchedContext.industry}` : '',
                        matchedContext.engagement_objective ? `Engagement objective: ${matchedContext.engagement_objective}` : '',
                        matchedContext.target_segment ? `Target segment served: ${matchedContext.target_segment}` : '',
                        matchedContext.target_outcome_window ? `Target outcome window: ${matchedContext.target_outcome_window}` : '',
                        matchedContext.named_initiative ? `Named initiative this concept dependency-flags against: ${matchedContext.named_initiative}` : '',
                        Array.isArray(matchedContext.named_stakeholders) && matchedContext.named_stakeholders.length > 0
                            ? `Named stakeholders (use their names verbatim in UI chrome/labels):\n${matchedContext.named_stakeholders.map(s => `  - ${s.name}: priorities=${(s.stated_priorities||[]).join('; ')}; non-starters=${(s.stated_non_starters||[]).join('; ')}; preferences=${(s.stated_preferences||[]).join('; ')}`).join('\n')}` : '',
                        Array.isArray(matchedContext.preferred_tech_stack) && matchedContext.preferred_tech_stack.length > 0
                            ? `Preferred tech stack (the prototype must visually inhabit this - show the chrome of these tools, name them in copy):\n  ${matchedContext.preferred_tech_stack.join(', ')}` : '',
                        Array.isArray(matchedContext.existing_systems) && matchedContext.existing_systems.length > 0
                            ? `Existing systems the AI layer rides on:\n  ${matchedContext.existing_systems.join(', ')}` : '',
                        Array.isArray(matchedContext.hard_non_starters) && matchedContext.hard_non_starters.length > 0
                            ? `Hard non-starters (the prototype must visibly honor each):\n  ${matchedContext.hard_non_starters.join(' | ')}` : '',
                        Array.isArray(matchedContext.regulatory_constraints) && matchedContext.regulatory_constraints.length > 0
                            ? `Regulatory constraints (data flows must respect these - show in-product safeguards):\n  ${matchedContext.regulatory_constraints.join(', ')}` : '',
                    ].filter(Boolean).join('\n') : '';

                    // Resolve the persona the tile references to the FULL
                    // persona object so the prototype builder sees pain
                    // points, JTBD, goals, voice quote - not just a name.
                    const personasArr = (liveCtx?.personas as any[]) || [];
                    const tilePersonaText = String(matchedTile.persona || '').toLowerCase();
                    const matchedPersona = personasArr.find((p: any) => {
                        const n = String(p?.name || '').toLowerCase();
                        return n && tilePersonaText.includes(n);
                    });
                    let personaBlock = '';
                    if (matchedPersona) {
                        const pains = Array.isArray(matchedPersona.painPoints || matchedPersona.frustrations)
                            ? (matchedPersona.painPoints || matchedPersona.frustrations).slice(0, 6)
                            : [];
                        const painsText = pains.length > 0
                            ? '\n  Pain points (build features that relieve these):\n    - ' + pains.map((x: any) => typeof x === 'string' ? x : (x?.text || x?.description || '')).join('\n    - ')
                            : '';
                        const goals = matchedPersona.goals || {};
                        const goalsText = (goals.lifeGoal || goals.experienceGoal || goals.functionalGoal)
                            ? `\n  Goals - life: ${goals.lifeGoal || '-'}; experience: ${goals.experienceGoal || '-'}; functional: ${goals.functionalGoal || '-'}`
                            : '';
                        const jtbd = matchedPersona.jtbd ? `\n  JTBD: ${matchedPersona.jtbd}` : '';
                        const voice = matchedPersona.quote ? `\n  Voice (verbatim from research): "${matchedPersona.quote}"` : '';
                        personaBlock = `=== FULL PERSONA PROFILE: ${matchedPersona.name}${matchedPersona.role ? ' - ' + matchedPersona.role : ''} ===${jtbd}${painsText}${goalsText}${voice}`;
                    }

                    // Resolve the themes the tile cited in evidence_sources
                    // to FULL theme objects (thesis + evidence excerpts +
                    // verbatim quotes) so the builder grounds the
                    // experience in real research.
                    const themesArr = (liveCtx?.themes as any[]) || [];
                    const citedThemes: any[] = [];
                    const themeMatchTokens = evidenceArr
                        .map(s => String(s || '').toLowerCase())
                        .filter(s => s.startsWith('theme:') || s.includes('theme '));
                    for (const t of themesArr) {
                        const tname = String(t?.name || t?.title || '').toLowerCase();
                        if (!tname) continue;
                        const hit = themeMatchTokens.some(tok => tok.includes(tname) || tname.split(/\s+/).every(w => w.length < 4 || tok.includes(w)));
                        if (hit) citedThemes.push(t);
                    }
                    // Fallback: if nothing matched, take the top 3 themes so the builder still has corpus grounding.
                    const effectiveThemes = citedThemes.length > 0 ? citedThemes.slice(0, 5) : themesArr.slice(0, 3);
                    const themesBlock = effectiveThemes.length > 0
                        ? '=== GROUNDING THEMES (cited by this concept) ===\n' + effectiveThemes.map((t: any, ti: number) => {
                            const name = t?.name || t?.title || `Theme ${ti + 1}`;
                            const thesis = t?.thesis || t?.summary || t?.description || '';
                            const evidenceList = Array.isArray(t?.evidence) ? t.evidence.slice(0, 3) : [];
                            const quotes = Array.isArray(t?.keyQuotes || t?.quotes) ? (t.keyQuotes || t.quotes).slice(0, 3) : [];
                            const ev = evidenceList.length > 0 ? '\n    Evidence: ' + evidenceList.map((e: any) => typeof e === 'string' ? e : (e?.text || e?.quote || '')).join(' | ').slice(0, 800) : '';
                            const qt = quotes.length > 0 ? '\n    Verbatim quotes (consider weaving these into the experience): ' + quotes.map((q: any) => typeof q === 'string' ? `"${q}"` : `"${q?.text || q?.quote || ''}" - ${q?.source || q?.attribution || 'unattributed'}`).join(' | ').slice(0, 800) : '';
                            return `  ${ti + 1}. ${name}\n    Thesis: ${thesis}${ev}${qt}`;
                        }).join('\n\n')
                        : '';

                    // Uploaded client docs - pass the relevant excerpts so
                    // the prototype can show realistic seed data and
                    // demonstrate concrete scenarios from the research.
                    const upContents = (liveCtx?.uploadedFileContents as string) || '';
                    const upBlock = upContents
                        ? `=== CLIENT-UPLOADED DOCUMENTS (use as ground truth for seed data, realistic scenarios, and direct quotes) ===\n${upContents.slice(0, 40000)}`
                        : '';

                    // Research goal restates the engagement objective so
                    // every screen/feature ties back to the question being
                    // answered.
                    const goalBlock = liveCtx?.researchGoal
                        ? `=== RESEARCH GOAL (the engagement question this prototype helps answer) ===\n${liveCtx.researchGoal}`
                        : '';

                    // Consulting-depth fields from the new tile schema.
                    const stakeholdersText = Array.isArray(matchedTile.key_stakeholders) && matchedTile.key_stakeholders.length > 0
                        ? '\n' + matchedTile.key_stakeholders.map((s: any, si: number) => `  ${si + 1}. ${s.name_or_role} - ${s.involvement}`).join('\n')
                        : '';
                    const stepsText = Array.isArray(matchedTile.implementation_steps) && matchedTile.implementation_steps.length > 0
                        ? '\n' + matchedTile.implementation_steps.map((s: any, si: number) => `  Step ${si + 1}: ${s.step} (owner: ${s.owner || '-'}, effort: ${s.estimated_effort || '-'}${s.dependencies && s.dependencies.length > 0 ? `, deps: ${s.dependencies.join(', ')}` : ''})`).join('\n')
                        : '';
                    const risksText = Array.isArray(matchedTile.risks_constraints) && matchedTile.risks_constraints.length > 0
                        ? '\n' + matchedTile.risks_constraints.map((r: any, ri: number) => `  ${ri + 1}. [${(r.severity || 'med').toUpperCase()}] ${r.risk} → ${r.mitigation}`).join('\n')
                        : '';

                    const segmentName = matchedContext?.target_segment || 'the target segment';
                    const initiativeName = matchedContext?.named_initiative || 'the named initiative';
                    const clientName = matchedContext?.client_name || 'the client';
                    const stackList = (matchedContext?.preferred_tech_stack || []).join(', ');
                    const stakeholdersNames = (matchedContext?.named_stakeholders || []).map(s => s?.name).filter(Boolean).join(' & ') || 'named stakeholders';

                    conceptText = [
                        `BUILD THIS SPECIFIC RECOMMENDED CONCEPT.`,
                        ``,
                        `Hard rule: the slug is an identifier, not the concept. Do NOT reinterpret it literally. Read the CONSULTING BRIEF below - that is the actual concept to build.`,
                        ``,
                        `Concept slug (identifier only): ${matchedTile.slug}`,
                        `Concept title: ${matchedTile.title}`,
                        matchedTile.group ? `Group: ${matchedTile.group}` : '',
                        // 2026-05-12 - Sprint 2 VS-Multi: signal the prototype
                        // builder when the concept came from the non-obvious-
                        // bet set. The builder honors this with a more
                        // ambitious interaction shape (Stage 1 brief should
                        // lean into the "shifted-frame" perspective) and a
                        // visible "Non-Obvious Bet" chip in the prototype's
                        // header chrome so the demo communicates its
                        // intentionally-unconventional framing.
                        (matchedTile as any)?.frame === 'non_obvious_bet' ? `Concept frame: NON_OBVIOUS_BET - this concept was deliberately surfaced from the tail of the recommendation distribution (verbalized-sampling probability < 0.05). It is intentionally non-modal. Build accordingly: do not regress to a generic dashboard/chatbot shape. Honor the divergence axis below.` : '',
                        (matchedTile as any)?.diverges_from ? `Divergence axis (how this concept differs from the defensible-consensus set): ${(matchedTile as any).diverges_from}` : '',
                        typeof (matchedTile as any)?.probability === 'number' ? `Verbalized probability of this concept in the candidate distribution: ${(matchedTile as any).probability.toFixed(3)}` : '',
                        ``,
                        ctxBlock,
                        ``,
                        `=== CONSULTING BRIEF (every field below is mandatory grounding for the prototype) ===`,
                        ``,
                        `Thesis: ${matchedTile.thesis || ''}`,
                        ``,
                        matchedTile.description ? `Description (what gets built):\n${matchedTile.description}` : '',
                        ``,
                        tWhyMatters ? `Why it matters for ${segmentName}:\n${tWhyMatters}` : '',
                        ``,
                        tLongTerm ? `How it supports ${segmentName} outcomes${matchedContext?.target_outcome_window ? ` over ${matchedContext.target_outcome_window}` : ''}:\n${tLongTerm}` : '',
                        ``,
                        tInitiativeDeps ? `${initiativeName} dependency / independence rationale:\n${tInitiativeDeps}` : '',
                        ``,
                        tStackExec ? `Execution within ${clientName}'s existing stack (named systems, connectors, AI layer location):\n${tStackExec}` : '',
                        ``,
                        tStackFit ? `${stackList ? stackList + ' fit' : 'Preferred-stack fit'} (named tools that reduce cost/burden):\n${tStackFit}` : '',
                        ``,
                        stakeholdersText ? `Key stakeholders:${stakeholdersText}` : '',
                        ``,
                        stepsText ? `Implementation steps (the prototype should visibly demonstrate at least one of these in action):${stepsText}` : '',
                        ``,
                        risksText ? `Risks & mitigations (surface relevant risks as in-product safeguards or copy):${risksText}` : '',
                        ``,
                        tGuardrailFit ? `Guardrail fit (why this passes the ${stakeholdersNames} meeting filter - preserve this rationale visually in the prototype):\n${tGuardrailFit}` : '',
                        ``,
                        matchedTile.expected_impact ? `Expected impact metrics (surface as live KPI badges where appropriate):\n${matchedTile.expected_impact}` : '',
                        ``,
                        matchedTile.verbatim_quote_evidence ? `Verbatim corpus quote (USE THIS in-product as a real testimonial / friction story - do not paraphrase):\n${matchedTile.verbatim_quote_evidence}` : '',
                        ``,
                        `Persona served (the human at the center of every screen): ${matchedTile.persona || ''}`,
                        `Moment / use case demonstrated: ${matchedTile.moment || ''}`,
                        `The "aha" interaction (the single moment the user feels the product working): ${matchedTile.aha_interaction || ''}`,
                        caps ? `Required AI capabilities (wire these with real fetch() calls to the proxy AI endpoints): ${caps}` : '',
                        matchedTile.existing_stack_reuse ? `Existing stack to reuse: ${matchedTile.existing_stack_reuse}` : '',
                        matchedTile.non_starter_check ? `Constraint check (must remain honored throughout): ${matchedTile.non_starter_check}` : '',
                        evidenceArr.length > 0 ? `Original evidence_sources cited by this concept: ${evidenceArr.join('; ')}` : '',
                        ``,
                        personaBlock,
                        ``,
                        themesBlock,
                        ``,
                        upBlock,
                        ``,
                        goalBlock,
                        ``,
                        `=== BUILD INSTRUCTIONS ===`,
                        `Build a multi-screen experience grounded in the persona's actual pain points above. The downstream pipeline will:`,
                        `  • Generate 5 distinct product briefs via Verbalized Sampling. The user picks ONE.`,
                        `  • Author an exhaustive Build Recipe (every screen, every state, every AI prompt, every seed-data anchor, every micro-copy string).`,
                        `  • Execute the recipe to produce a substantive IDEO/Apple-grade prototype with 4+ screens, 2+ AI fetches via multi-provider fallback, 20+ seed records per primary entity, no verbatim research quotes, and Verbalized Sampling on creative AI output.`,
                        `Apply industry-agnostic rigor - the same standards regardless of vertical (healthcare, fintech, retail, government, manufacturing, education, etc.). Distill insights from the GROUNDING THEMES and persona voice into the design; never reproduce research quotes verbatim in the prototype UI.`,
                        ``,
                        protoDirective.concept ? `User's additional direction for this specific build: ${protoDirective.concept}` : '',
                    ].filter(Boolean).join('\n');
                }

                const { generatePrototypeBriefs } = await safeDynamicImport(
                    () => import('../services/prototypeBriefGenerator'),
                    'prototypeBriefGenerator (5-brief phase)',
                );
                // #proto brief runs on the cap-aware BRIEF_MODEL (artifactModelFor('proto'):
                // Gemini 3.1 Pro while capped, Opus after). Label the spinner with THAT so it
                // never falsely reads "GEMINI 3.5 FLASH IS WORKING" nor a capped "Opus".
                setInFlightModelId(artifactModelFor('proto') as ChatModel);
                let briefs;
                try {
                    briefs = await generatePrototypeBriefs({
                        concept: conceptText,
                        brand: protoDirective.brand,
                        industry: matchedContext?.industry,
                        researchGoal: liveCtx?.researchGoal || '',
                        basedOn: protoDirective.basedOn,
                        onProgress: (stage, detail) => {
                            setMessages(prev => prev.map(m => m.id === briefsMsgId ? {
                                ...m,
                                content: `Generating 5 product briefs (brand=${protoDirective.brand})... [${stage}${detail ? ` - ${detail}` : ''}]`,
                            } : m));
                        },
                    });
                } finally {
                    setInFlightModelId(null);
                }
                setMessages(prev => prev.map(m => m.id === briefsMsgId ? {
                    ...m,
                    content: `${briefs.length} product briefs ready. Each is a distinct framing of "${matchedTile?.title || protoDirective.concept || 'your concept'}" - review them and click BUILD THIS on the one you want shipped. The chosen brief flows through spec → design → multi-agent pod build (orchestrator contract → parallel screen pods → integration reviewer), all on Opus 4.8.`,
                    prototypeBriefs: briefs,
                    prototypeBriefsMeta: {
                        brand: protoDirective.brand,
                        basedOn: protoDirective.basedOn,
                        researchGoal: liveCtx?.researchGoal || '',
                        originalConcept: conceptText,
                    },
                } : m));
                // 2026-05-14 - Persist the 5 briefs to wiki for T4 build-only
                // iteration. Slug uses the engagement goal so subsequent visits
                // to the same goal can resume from this cached brief set without
                // re-running Pass 1+2 (saves $15-22 per re-iteration).
                try {
                    const { writeEngagementBriefs, writeEngagementManifest, buildEngagementSlug } = await safeDynamicImport(
                        () => import('../services/wikiService'),
                        'wikiService (brief persistence)',
                    );
                    const { getRunTotals } = await safeDynamicImport(
                        () => import('../services/costMeter'),
                        'costMeter (snapshot)',
                    );
                    const goalForSlug = liveCtx?.researchGoal || protoDirective.concept || 'untitled-engagement';
                    const slug = buildEngagementSlug(goalForSlug, 60);
                    const briefRecords = briefs.map((b: any, idx: number) => ({
                        id: b.id || `brief-${idx + 1}`,
                        frame_label: b.frame_label,
                        probability: b.probability,
                        title: b.title,
                        brand: protoDirective.brand,
                        based_on: protoDirective.basedOn,
                        research_goal: liveCtx?.researchGoal || '',
                        original_concept: conceptText,
                        brief: b,
                    }));
                    const runTotals = getRunTotals ? getRunTotals() : { totalUSD: 0 };
                    await writeEngagementBriefs(slug, {
                        slug,
                        research_goal: liveCtx?.researchGoal || '',
                        brand: protoDirective.brand,
                        briefs: briefRecords,
                        cost_usd_at_generation: runTotals.totalUSD,
                    } as any);
                    await writeEngagementManifest(slug, {
                        research_goal: liveCtx?.researchGoal || '',
                        brand: protoDirective.brand,
                        cached: {
                            briefs: { count: briefs.length, path: `engagements/${slug}/briefs.json` },
                        },
                        cost_usd_total: runTotals.totalUSD,
                    });
                    console.log(`[T4 cache] Persisted ${briefs.length} briefs + manifest at engagements/${slug}/`);
                } catch (cacheErr) {
                    // Cache writes are non-fatal - brief generation already succeeded.
                    console.warn('[T4 cache] brief persistence failed (non-fatal):', cacheErr);
                }
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === briefsMsgId ? {
                    ...m,
                    content: `Brief generation failed: ${e?.message || 'unknown error'}. Try again, or simplify the concept.`,
                } : m));
            }
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
            return;
        }

        // --- #presentations (PLURAL - library list) - 2026-05-09 ----------
        // Bare `#presentations` lists every persisted presentation as a card
        // grid in the chat. Each card has Open / Edit / Delete chips. The
        // plural form is detected BEFORE the singular #presentation handler
        // because hashtag-parser's word-boundary regex makes the two
        // distinct (`#presentations` won't match `#presentation`).
        if (/(?:^|\s)#presentations(?=\s|$|[.,;:!?'"])/i.test(query)) {
            const libMsgId = `msg_${Date.now()}_lib_loading`;
            setMessages(prev => [...prev, {
                id: libMsgId,
                role: 'assistant',
                content: 'Loading your saved presentations...',
                timestamp: Date.now(),
            }]);
            try {
                const lib = await listPresentations({ limit: 50 });
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: lib.total === 0
                        ? 'No saved presentations yet. Generate one with `#presentation` to start your library.'
                        : `Your saved presentations (${lib.total}). Click any card to open, edit, or delete.`,
                    libraryItems: lib.results,
                } : m));
            } catch (e: any) {
                setMessages(prev => prev.map(m => m.id === libMsgId ? {
                    ...m,
                    content: `Could not load library: ${e?.message || 'unknown error'}`,
                } : m));
            }
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
            return;
        }

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
            // Initial "composing..." status message - updated as tool calls land
            setMessages(prev => [...prev, {
                id: composingMsgId,
                role: 'assistant',
                content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})...`,
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
                // already developed in conversation - packaging it instead of
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
                // recall - not just uploads. Set in App.tsx's data-collection
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
                } catch { /* noop - diagnostic only */ }

                // Surface category coverage (internal composing log only - not
                // shown in the final deliverable). Empty categories are now
                // silently omitted from the model's output instead of being
                // surfaced as "CATEGORY GAPS".
                try {
                    const cats = (liveCtx as any)?.activeCategories || [];
                    if (Array.isArray(cats) && cats.length > 0) {
                        const withContent = cats.filter((c: any) => (c?.itemCount || 0) > 0).length;
                        toolCallLog.push(
                            `Categories: ${withContent}/${cats.length} have content - citations will draw from these only`
                        );
                    }
                } catch { /* noop */ }
                setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                    ...m,
                    content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})...\n\n${toolCallLog.join('\n')}`,
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
                            content: `Composing your interactive presentation (brand=${presDirective.brand}, model=${presDirective.model})...\n\n${toolCallLog.slice(-12).join('\n')}`,
                        } : m));
                    },
                });

                // 2026-06-27 - SUPPORTING ILLUSTRATIONS RETIRED. The abstract flat-vector
                // per-section art read as generic AI imagery (the same geometric-abstract motifs
                // pulled off journey stages in favour of native composition). The presentation now
                // ships text + native structured visuals only; the illustration generation/attach
                // pass is disabled (the prompt also no longer emits imageConcept).
                // (was: resolvePresentationIllustrations(composeResult.payload, ...))

                // D18: emit AIR for this deck (composeNarrative path was outside AIR emission).
                void emitComposeNarrativeAir('#presentation', liveCtx?.researchGoal || presDirective.narrativeRequest || '', composeResult.payload);

                // Persist payload via proxy
                const persistRes = await fetch('http://127.0.0.1:5012/api/presentations', {
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

                // 2026-05-06 - #export-pptx flag honored via the bespoke
                // brand-aware deck exporter. Each presentation section gets a
                // hand-crafted pptxgenjs layout that mirrors the interactive
                // renderer's design language (eyebrow + display title +
                // brand-period accent + per-section card grids) - fully
                // editable native PowerPoint shapes, no DOM screenshots, no
                // template constraints, NU vs NXT styled correctly.
                //
                // The renderer-side "Export PPTX" button at port 5014 still
                // exists as an alternative for users who want a verbatim DOM
                // walk; the chat path uses the cleaner deck export by default.
                if (presDirective.alsoExportPptx) {
                    try {
                        setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                            ...m,
                            content: finalContent + `\n\nExporting brand-styled .pptx deck (one elegant slide per section)...`,
                        } : m));
                        const { exportPresentationToPptx } = await import('../services/presentationToPptx');
                        await exportPresentationToPptx(composeResult.payload);
                        setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                            ...m,
                            content: finalContent + `\n\nMatching .pptx deck downloaded - ${composeResult.payload.sections.length} slides, brand=${composeResult.payload.meta.brand}, fully editable in PowerPoint.`,
                        } : m));
                    } catch (pptxErr: unknown) {
                        const errMsg = pptxErr instanceof Error ? pptxErr.message : String(pptxErr);
                        console.error('[#export-pptx] failed:', pptxErr);
                        setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                            ...m,
                            content: finalContent + `\n\nPPTX export failed: ${errMsg}. The interactive presentation above is still usable; click "Launch ↗" and use the in-renderer Export PPTX button as an alternative.`,
                        } : m));
                    }
                }
            } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                const errStack = e instanceof Error ? (e.stack || '').split('\n').slice(0, 6).join('\n') : '';
                // 2026-05-20 - Surface enough detail to disambiguate compose
                // vs persist failures next time. Browser "Failed to fetch"
                // alone is useless; the console gets the full stack + tool log.
                console.error('[presentation-composer] failure:', {
                    message: errMsg,
                    stack: errStack,
                    toolCallLog,
                    isFailedToFetch: /Failed to fetch|NetworkError|AbortError/i.test(errMsg),
                });
                const hint = /Failed to fetch|NetworkError|AbortError/i.test(errMsg)
                    ? ' (network/timeout - check proxy logs at :5012 for the upstream Gemini timeout)'
                    : '';
                setMessages(prev => prev.map(m => m.id === composingMsgId ? {
                    ...m,
                    content: `Could not compose presentation: ${errMsg}${hint}\n\n` +
                             `Tool calls completed: ${toolCallLog.length}`,
                } : m));
            } finally {
                setIsLoading(false);
                if (pendingAttachments.length > 0) setPendingAttachments([]);
            }
            return;
        }

        // --- Design Desk artifact delivery interception ---
        // If the message contains ONLY content hashtags in {persona, journey, org},
        // short-circuit the LLM call and deliver the matching pre-made artifact
        // from useDesignDeskStore. Other hashtags (#slide, #gap, #strategy, etc.)
        // continue to sendChatMessage unchanged.
        const parsed = parseHashtags(query);
        // Persona is INTENTIONALLY EXCLUDED from this routing - user explicitly
        // wants persona slides to render through the original AI chat path
        // (SlideCanvas + persona-card template + Export Deck PPTX/PDF), exactly
        // as they did before the Design Desk integration. The 5 diagram kinds
        // (org, journey, arch, roadmap, blueprint) route through the freeform-HTML
        // pipeline so they inherit the user's NU/NXT exemplar treatment.
        // 2026-05-31 - Added prd/gap/compete so #prd, #gap, #competitive route
        // through this objective-keyed + anti-slop + depth-contract block instead
        // of falling through to generic chat (where they produced shallow,
        // off-objective output). Parser emits gap/compete; the artifact engine
        // keys gap-analysis/competitive, so FREEFORM_KIND_ALIAS bridges the fork.
        // 2026-06-10 - ONE-ENGINE ROUTING (standing rule, NO EXCEPTIONS, NO DRIFT:
        // feedback_all_deliverables_one_engine). 'journey' and 'blueprint' were REMOVED
        // from this gate so they NO LONGER divert to the Journey Mapper microservice
        // (:8080) / freeform-HTML detour. With them gone, any request containing #journey
        // or #blueprint makes `allDeliverable` false, so it falls through to
        // sendChatMessage (the ONE engine) where #slides + the service-blueprint template
        // (HASHTAG_TO_SKILL_ID '#journey'/'#blueprint' -> service-blueprint-mapper) renders
        // them as GOLD nxt-slide frames (rail/masthead/dot-mark), grounded by skill +
        // manifest-chunk + live Figma tokens. The old journey/blueprint branch below is now
        // unreachable (kept temporarily; slated for deletion once verified).
        // 2026-06-13 - UNIFICATION COMPLETE (extends the journey/blueprint migration above):
        // EVERY artifact hashtag now routes through the ONE canonical engine (sendChatMessage
        // slide-mode -> manifest grounding -> GOLD slide template -> Opus 4.8). 'arch',
        // 'roadmap', 'prd', 'gap', 'compete' AND 'org' were all removed from this gate. Each
        // has a HASHTAG_TO_SKILL_ID entry AND an ARTIFACT_TPL slide template
        // (architecture-map / timeline / prd-feature / gap-matrix / competitive-matrix /
        // org-chart - the org-chart template was built 2026-06-13 from Figma NU 178:3). With
        // DELIVERABLE_TAGS empty, `allDeliverable` is ALWAYS false, so this entire proxy
        // artifact-engine gate (and the unreachable journey-mapper branch below) is now dead
        // code, slated for deletion once verified. See
        // plans/hashtag-pipeline-unification-2026-06-13.md.
        const DELIVERABLE_TAGS = [] as const;
        const FREEFORM_KIND_ALIAS: Record<string, string> = {
            gap: 'gap-analysis',
            compete: 'competitive',
            audit: 'tech-audit',
        };
        const LABEL_MAP: Record<string, string> = {
            journey: 'JOURNEY_MAP',
            org: 'ORG_CHART',
            arch: 'ARCHITECTURE',
            roadmap: 'ROADMAP',
            blueprint: 'SERVICE_BLUEPRINT',
            prd: 'PRD',
            gap: 'GAP_ANALYSIS',
            compete: 'COMPETITIVE_ANALYSIS',
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
            // 2026-05-08 - Mid-chat ad-hoc attachments take HIGHEST priority. The
            // user just dropped these in, so they're the immediate source for any
            // hashtag deliverable that follows in the same turn.
            if (pendingAttachments.length > 0) {
                const adHocBlock = pendingAttachments.map(att => {
                    const meta = [
                        att.slideCount ? `${att.slideCount} slides` : null,
                        att.pageCount ? `${att.pageCount} pages` : null,
                        `${att.charCount} chars`,
                        att.isImage ? 'IMAGE' : null,
                    ].filter(Boolean).join(', ');
                    return `--- AD-HOC UPLOAD: ${att.filename} (${meta}) ---\n${att.parsedText}\n--- END ${att.filename} ---`;
                }).join('\n\n');
                combinedCorpusParts.push('=== USER\'S MID-CHAT UPLOADS (HIGHEST PRIORITY - JUST UPLOADED) ===\n' + adHocBlock);
            }
            if (liveCtx?.uploadedFileContents && typeof liveCtx.uploadedFileContents === 'string' && liveCtx.uploadedFileContents.length > 40) {
                combinedCorpusParts.push('=== CLIENT UPLOADS ===\n' + liveCtx.uploadedFileContents);
            }
            // 2026-05-31 - PHASE 1: OBJECTIVE-KEYED RETRIEVAL as the PRIMARY external
            // evidence for every artifact. Previously this path dumped the raw
            // session corpus (liveCtx.corpusText), which carries the tri-model
            // synthesis preamble + off-objective content and gets head-truncated to
            // 60KB downstream, so artifacts were grounded in synthesis + noise rather
            // than the on-objective slice. Now we pull the objective-relevant article
            // bodies from the fixed chunk-store retrieval (the same path themes use),
            // and only fall back to the raw session corpus if retrieval is empty
            // (e.g. mid-collection before anything is embedded).
            const _retrievalGoal = (parsed.cleanPrompt && parsed.cleanPrompt.trim().length >= 4
                ? `${parsed.cleanPrompt}. ${liveCtx?.researchGoal || ''}`
                : (liveCtx?.researchGoal || parsed.cleanPrompt || '')).trim();
            let _retrievedExternal = '';
            if (_retrievalGoal) {
                try {
                    const { fetchWikiArticles, formatArticlesAsCorpusBlock } = await import('../services/wikiIndexService');
                    const arts = await fetchWikiArticles({
                        query: _retrievalGoal,
                        engagementGoal: liveCtx?.researchGoal || _retrievalGoal,
                        goalBlendWeight: 0.35,
                        limit: 40,
                        maxCharsPerArticle: 7000,
                        minChars: 400,
                        includeSynthesis: false, // never ground an artifact in prior synthesis
                    } as any);
                    if (Array.isArray(arts) && arts.length > 0) {
                        _retrievedExternal = formatArticlesAsCorpusBlock(arts as any, 160_000);
                        console.log(`[Artifact] objective-keyed retrieval: ${arts.length} on-objective articles for "${_retrievalGoal.slice(0,60)}"`);
                    } else {
                        console.warn('[Artifact] objective-keyed retrieval returned 0 articles; falling back to session corpus');
                    }
                } catch (e: any) {
                    console.warn('[Artifact] objective-keyed retrieval failed (non-fatal), falling back to session corpus:', e?.message || e);
                }
            }
            // 2026-06-09 - MANIFEST-CHUNK grounding (the new engine, intent A.1).
            // Lead the deliverable corpus with manifest-selected, pointer-addressed
            // chunk spans so #journey/#blueprint/#org/#gap/#competitive/#prd assemble
            // from wiki+MANIFEST, not bulk RAG. The objective-keyed retrieval + raw
            // corpus become supplementary below. Non-fatal + fail-LOUD: on empty/err
            // we log and the objective-keyed/bulk path stands (never silently claim
            // manifest grounding that did not happen).
            let _mfGrounded = false;
            try {
                const _mfSlug = currentEngagementSlug();
                if (_mfSlug && (_retrievalGoal || parsed.cleanPrompt)) {
                    const _mfPicked = await pickChunksForPrompt(_retrievalGoal || parsed.cleanPrompt || '', _mfSlug, {
                        extraContext: liveCtx?.researchGoal || '',
                        // tier-1.5: admit on-objective corpus by relevance to the research goal
                        researchObjective: liveCtx?.researchGoal || _retrievalGoal || '',
                        tokenBudget: 30_000,
                    });
                    if (_mfPicked.chunkIds.length > 0) {
                        const _mfRes = await resolveChunks(_mfPicked.chunkIds);
                        if (_mfRes.chunks.length > 0) {
                            combinedCorpusParts.push(
                                '=== PRIMARY EVIDENCE (manifest-selected, cite by pointer) ===\n' +
                                chunkCitationInstructions() + '\n\n' +
                                assembleChunkCorpus(_mfRes.chunks)
                            );
                            _mfGrounded = true;
                            console.log(`[Artifact] MANIFEST-CHUNK grounding: ${_mfRes.chunks.length} chunks from ${_mfRes.sourcesRead} wiki pages (catalog=${_mfPicked.catalogSize}) - PRIMARY evidence`);
                        }
                    }
                    if (!_mfGrounded) console.warn(`[Artifact] MANIFEST-CHUNK grounding empty for "${_mfSlug}" (mid-collection?); using objective-keyed/bulk corpus`);
                }
            } catch (e: any) {
                console.warn('[Artifact] manifest-chunk grounding failed (non-fatal), using objective-keyed/bulk corpus:', e?.message || e);
            }
            // Objective-keyed retrieval + raw corpus: PRIMARY when manifest chunks
            // were unavailable, else clearly-labeled SUPPLEMENTARY (do not drown the
            // pointer-addressed chunks above).
            if (_retrievedExternal) {
                combinedCorpusParts.push((_mfGrounded
                    ? '=== EXTERNAL RESEARCH EVIDENCE (supplementary; lead with the manifest chunks above) ===\n'
                    : '=== EXTERNAL RESEARCH EVIDENCE (objective-matched, cite these) ===\n') + _retrievedExternal);
            } else if (liveCtx?.corpusText && !_mfGrounded) {
                // Fallback only: raw session corpus (retrieval + manifest unavailable).
                combinedCorpusParts.push('=== EXTERNAL RESEARCH CORPUS ===\n' + liveCtx.corpusText);
            }
            // 2026-05-31 - PHASE 2: prior deliverables are SYNTHESIS, not evidence.
            // Pass them as clearly-labeled context the artifact may use for
            // orientation but MUST NOT cite as a source (the deterministic
            // post-processors also strip any "Source: Themes/Personas/Synthesis"
            // citation). This stops the synthesis-citing-synthesis loop.
            //
            // 2026-06-06 - MANIFEST -> WIKI resolution. Prefer wiki bodies
            // (single source of truth at engagements/<slug>/<kind>.json) over
            // the in-memory liveCtx state. Falls back to in-memory when wiki
            // is empty (the deliverable was generated in this session and not
            // yet persisted). The resolver caches per-engagement so multiple
            // generations in one cascade share the wiki read.
            const _chatSlug = currentEngagementSlug();
            let _chatResolved: Awaited<ReturnType<typeof resolveDeliverableBodies>> | null = null;
            if (_chatSlug) {
                try {
                    _chatResolved = await resolveDeliverableBodies(_chatSlug, ['themes', 'personas', 'journey']);
                } catch (_e) { /* non-fatal - fall back to in-memory */ }
            }

            // C2 (2026-06-06) - UPSTREAM CACHED-SELECTION CONSUMPTION.
            // Pull the user-curated KL selection NOW (at corpus assembly
            // time) and inject it as a load-bearing block BEFORE the
            // PRIOR FINDINGS block. The model sees the selection
            // BEFORE generation, not after. The Stop hook
            // validate_cached_selection_honored.py remains the safety
            // net; this is the upstream wiring that makes the model
            // honor the selection BY CONSTRUCTION instead of having to
            // retry on hook rejection.
            try {
                const _sel = await fetch('http://127.0.0.1:5012/api/user-selection/active');
                if (_sel.ok) {
                    const _selData = await _sel.json();
                    if (_selData && !_selData._uncommitted) {
                        const _themeIds: string[] = Array.isArray(_selData.theme_cluster_ids) ? _selData.theme_cluster_ids : [];
                        const _artSrc: string[] = Array.isArray(_selData.article_sources) ? _selData.article_sources : [];
                        const _subs: string[] = Array.isArray(_selData.social_subreddits) ? _selData.social_subreddits : [];
                        const _engSlugs: string[] = Array.isArray(_selData.engagement_slugs) ? _selData.engagement_slugs : [];
                        const _selTotal = _themeIds.length + _artSrc.length + _subs.length + _engSlugs.length;
                        if (_selTotal > 0) {
                            const _idLines = _themeIds.slice(0, 200).map(id => `  - ${id}`).join('\n');
                            const _idTail = _themeIds.length > 200 ? `\n  ... ${_themeIds.length - 200} more` : '';
                            combinedCorpusParts.push(
                                '=== USER CURATED SELECTION (must inherit; never regenerate from scratch) ===\n' +
                                'The user explicitly selected the following items from the Knowledge Library.\n' +
                                'You MUST honor 100% of these (NO FLOORS, NO OMISSIONS). For each emitted\n' +
                                'theme/persona/recommendation, tag source="cached" (carried forward) or\n' +
                                '"extended" (refined). Items not in the selection that you discover from\n' +
                                'the corpus go in as source="new". Stop hook validate_cached_selection_honored.py\n' +
                                'REJECTS any silent omission.\n\n' +
                                `Selection (selected_at_ms=${_selData.selected_at_ms || 0}):\n` +
                                `  - ${_themeIds.length} theme cluster ids (must all appear as cached/extended)\n` +
                                `  - ${_artSrc.length} article source folders\n` +
                                `  - ${_engSlugs.length} prior engagement slugs\n` +
                                `  - ${_subs.length} subreddits\n` +
                                (_themeIds.length > 0 ? `\nTheme cluster ids:\n${_idLines}${_idTail}\n` : '')
                            );
                            console.info(`[CorpusChatPanel] injected USER CURATED SELECTION block upstream of generation (${_selTotal} items)`);
                        }
                    }
                }
            } catch (e: any) {
                console.warn('[CorpusChatPanel] cached-selection upstream fetch failed (non-fatal):', e?.message || e);
            }

            const _chatThemes = (_chatResolved?.bodies as any)?.themes?.themes || (_chatResolved?.bodies as any)?.themes || liveCtx?.themes;
            const _chatPersonas = (_chatResolved?.bodies as any)?.personas?.personas || (_chatResolved?.bodies as any)?.personas || liveCtx?.personas;
            const _chatJourney = (_chatResolved?.bodies as any)?.journey?.stages || (_chatResolved?.bodies as any)?.journey || liveCtx?.journeyStages;
            if (_chatResolved && _chatResolved.readCount > 0) {
                combinedCorpusParts.push(manifestPointerBlock(_chatResolved));
            }
            const _themesPtr = _chatResolved?.pointers?.themes || '(in-memory)';
            const _personasPtr = _chatResolved?.pointers?.personas || '(in-memory)';
            const _journeyPtr = _chatResolved?.pointers?.journey || '(in-memory)';
            if (_chatThemes) combinedCorpusParts.push(`=== PRIOR FINDINGS: THEMES [pointer: ${_themesPtr}] (context only - do NOT cite as a source) ===\n` + JSON.stringify(_chatThemes).slice(0, 20000));
            if (_chatPersonas) combinedCorpusParts.push(`=== PRIOR FINDINGS: PERSONAS [pointer: ${_personasPtr}] (context only - do NOT cite as a source) ===\n` + JSON.stringify(_chatPersonas).slice(0, 20000));
            if (_chatJourney) combinedCorpusParts.push(`=== PRIOR FINDINGS: JOURNEY [pointer: ${_journeyPtr}] (context only - do NOT cite as a source) ===\n` + JSON.stringify(_chatJourney).slice(0, 20000));
            // 2026-05-29 - Chat is now unlocked DURING collection, so corpusText
            // may be thin/empty mid-run. Build the corpus from WHATEVER is cached
            // and collected so far (the green-chip liveSourceResults), complete or
            // not - and fall back to the research goal - so artifact-engine kinds
            // (#journey/#blueprint/etc.) never hit the service's "corpus is
            // required" 400. (Root cause of the journey-map 400 during collection.)
            if (Array.isArray(liveCtx?.liveSourceResults) && liveCtx.liveSourceResults.length) {
                const collected = liveCtx.liveSourceResults.flatMap((r: any) =>
                    (r.items || []).map((it: any) => {
                        const t = (it.title || '').toString();
                        const b = (it.content || it.body || it.text || it.summary || it.snippet || '').toString();
                        return (t || b) ? `[${r.source || r.id || 'source'}] ${t}\n${b.slice(0, 1500)}` : '';
                    })
                ).filter(Boolean).slice(0, 80).join('\n\n');
                if (collected && !liveCtx?.corpusText) {
                    combinedCorpusParts.push('=== SOURCES COLLECTED SO FAR (current run) ===\n' + collected);
                }
            }
            let corpusText = combinedCorpusParts.join('\n\n').trim();
            if (!corpusText && liveCtx?.researchGoal) {
                // Never send an empty corpus - seed with the goal so generation proceeds.
                corpusText = `=== RESEARCH GOAL ===\n${liveCtx.researchGoal}`;
            }

            // Honor #slide / #slides view modifier. When present, every delivered
            // artifact in this turn is rendered inside a 16:9 NXT slide frame.
            const asSlide = parsed.view === 'slide' || parsed.composition === 'slides';
            const slideTag = asSlide ? ' #slide' : '';

            // Pre-made artifact lookup is ONLY appropriate when the user typed a bare
            // hashtag request with no qualifying context (e.g., "#persona #NU"). The
            // moment the user adds prompt text - a source filter, a topic narrowing,
            // a "from chronicle_higher_ed not from northeasterndocs", or anything else -
            // we MUST re-generate so the new context shapes the artifact. Otherwise the
            // chat silently serves a stale cached artifact that ignores the new ask.
            const userHasSpecificContext = !!parsed.cleanPrompt && parsed.cleanPrompt.trim().length >= 4;

            for (const tag of parsed.content) {
                // 2026-05-31 - Bridge the parser-tag -> artifact-engine-kind fork
                // (gap->gap-analysis, compete->competitive, audit->tech-audit) so
                // these route to the correct freeform/contract path. Other tags
                // pass through unchanged.
                const ffKind = (FREEFORM_KIND_ALIAS[tag] || tag) as FreeformKind;
                // 1) Check for pre-made matching artifact. Prefer brand match; fall back to any brand.
                //    Only short-circuit to the cached artifact when the request is a BARE hashtag
                //    delivery - any prompt text means the user wants a fresh generation against
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
                    //    2a) NotebookLM-uplift Phase 4-6 kinds (#mindmap, #brief-dialog,
                    //        #meta-themes, #deep-research/#research-plan) go through
                    //        dedicated backing services + renderers - NOT the
                    //        exemplar-driven generateFreeformArtifact pipeline.
                    if (UPLIFT_KINDS.has(tag as FreeformKind)) {
                        try {
                            const upliftStart = Date.now();
                            let upliftHtml = '';
                            let upliftTitle = '';
                            const upliftCitations: Array<{ label: string; source: string }> = [];

                            if (tag === 'mindmap') {
                                // Convert ChatContext themes → BertTopicCluster shape that
                                // mindMapArchitect understands. Real BERTopic output has
                                // numeric ids + post_ids + top_terms; ChatContext themes
                                // carry name/summary/citations only, so we synthesize the
                                // missing fields.
                                const themesIn = Array.isArray((context as any).themes) ? (context as any).themes : [];
                                if (themesIn.length < 3) {
                                    throw new Error('Mind map needs at least 3 themes - run analysis first or load a session with theme output.');
                                }
                                const clusters: BertTopicCluster[] = themesIn.map((t: any, idx: number) => ({
                                    id: idx,
                                    name: String(t.name || t.title || `Theme ${idx + 1}`).slice(0, 80),
                                    summary: String(t.summary || t.description || '').slice(0, 400),
                                    post_count: Array.isArray(t.citations) ? t.citations.length : (t.post_count ?? 1),
                                    top_terms: Array.isArray(t.top_terms) ? t.top_terms : [],
                                    post_ids: Array.isArray(t.citations) ? t.citations : (t.post_ids || []),
                                    centroid: [0, 0],
                                    convergent_evidence: !!t.convergent_evidence,
                                    source_types: Array.isArray(t.source_types) ? t.source_types : [],
                                    distinct_source_count: t.distinct_source_count ?? (Array.isArray(t.source_types) ? t.source_types.length : 1),
                                }));
                                const mm = await buildMindMap({
                                    topics: clusters,
                                    research_goal: context.researchGoal || parsed.cleanPrompt || 'Research',
                                    proxy_base: 'http://127.0.0.1:5012',
                                });
                                upliftTitle = `Mind Map · ${(context.researchGoal || 'Research').slice(0, 60)}`;
                                const _mmGoal = context.researchGoal || parsed.cleanPrompt || 'Research';
                                // 2026-06-27 - MINDMAP renders NATIVE via the token-grounded radial renderer
                                // (renderMindMapHtml), per the locked native-composition decision. The interim
                                // flat-image /api/ai/diagram swap is retired; diagrams compose from native shapes
                                // + content-true icons + brand tokens, not a rasterized picture.
                                upliftHtml = renderMindMapHtml({ output: mm, brand, researchGoal: _mmGoal });
                            } else if (tag === 'brief-dialog') {
                                const transcript = await generateBriefDialog({
                                    topic: parsed.cleanPrompt || context.researchGoal || 'Research finding',
                                    corpus: corpusText.slice(0, 24000),
                                    proxy_base: 'http://127.0.0.1:5012',
                                });
                                upliftTitle = `Brief Dialog · ${transcript.topic.slice(0, 60)}`;
                                upliftHtml = renderBriefDialogHtml({ transcript, brand });
                                // Collect citation chunks for the artifact metadata
                                const allCites = transcript.turns.flatMap(t => t.citations || []);
                                for (const c of Array.from(new Set(allCites)).slice(0, 12)) {
                                    upliftCitations.push({ label: c, source: c });
                                }
                            } else if (tag === 'meta-themes') {
                                const mt = await buildMetaThemes({ proxy_base: 'http://127.0.0.1:5012' });
                                upliftTitle = `Portfolio Patterns · ${mt.portfolio_pattern_count} recurring themes`;
                                upliftHtml = renderMetaThemesHtml({
                                    output: mt,
                                    brand,
                                    title: parsed.cleanPrompt
                                        ? `Portfolio Patterns · ${parsed.cleanPrompt}`
                                        : 'Portfolio Patterns',
                                });
                            } else if (tag === 'research-plan') {
                                const plan = await buildResearchPlan({
                                    research_goal: parsed.cleanPrompt || context.researchGoal || 'Research',
                                    proxy_base: 'http://127.0.0.1:5012',
                                });
                                upliftTitle = `Research Plan · ${plan.goal.slice(0, 60)}`;
                                upliftHtml = renderResearchPlanHtml({ plan, brand });
                            }

                            let artifact: FreeformArtifact = {
                                id: `uplift_${tag}_${Date.now()}`,
                                type: 'freeform',
                                kind: tag as FreeformKind,
                                brand,
                                title: upliftTitle,
                                html: upliftHtml,
                                citations: upliftCitations,
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            };

                            // 2026-05-25 - Run the expert panel BEFORE the
                            // artifact lands in the design desk. The panel
                            // routes to the appropriate domain expert(s) for
                            // this kind plus runs the universal anti-slop +
                            // structural hygiene critics. Em-dash auto-strip,
                            // debug-bracket removal, persona-name suffix
                            // strip, all fire here deterministically. Failure
                            // is non-fatal: the artifact still ships with a
                            // warning so the user is not blocked on critic
                            // pipeline issues.
                            try {
                                const panelKind: ArtifactKind = (tag === 'mindmap' ? 'mindmap'
                                    : tag === 'brief-dialog' ? 'brief-dialog'
                                    : tag === 'meta-themes' ? 'meta-themes'
                                    : tag === 'research-plan' ? 'research-plan'
                                    : 'mindmap') as ArtifactKind;
                                const panelResult = await runExpertPanel({
                                    deliverable: artifact,
                                    kind: panelKind,
                                    proxy_base: 'http://127.0.0.1:5012',
                                });
                                artifact = panelResult.result as FreeformArtifact;
                                console.log(`[ExpertPanel/${tag}] em-dashes ${panelResult.panel_summary.em_dash_count_before} → ${panelResult.panel_summary.em_dash_count_after}, ${panelResult.panel_summary.critics_with_edits.length} critic(s) applied edits, $${panelResult.total_cost_usd.toFixed(3)} spend`);
                            } catch (panelErr: any) {
                                console.warn(`[ExpertPanel/${tag}] failed (non-fatal):`, panelErr?.message || panelErr);
                                // Fall back to a minimum-viable em-dash strip
                                artifact = stripEmDashesInPlace(artifact);
                            }

                            useDesignDeskStore.getState().addArtifact(artifact);
                            useDesignDeskStore.getState().setActiveArtifact(artifact.id);
                            const elapsedMs = Date.now() - upliftStart;
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_gen`,
                                role: 'assistant',
                                content: asSlide
                                    ? `Generated #${tag}${slideTag}: "${artifact.title}". Rendered as a 1920x1080 slide in the Design Desk (${(elapsedMs / 1000).toFixed(1)}s).`
                                    : `Generated #${tag}: "${artifact.title}". Open the Design Desk to view (${(elapsedMs / 1000).toFixed(1)}s).`,
                                timestamp: Date.now(),
                                deliveredArtifactId: artifact.id,
                                deliveredArtifactType: tag as any,
                                deliveredAsSlide: asSlide,
                            });
                        } catch (e: any) {
                            console.warn(`[Uplift/${tag}] generation failed:`, e?.message || e);
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_err`,
                                role: 'assistant',
                                content: `#${tag} generation failed: ${e?.message || e}`,
                                timestamp: Date.now(),
                            });
                        }
                        continue; // skip the legacy chatToArtifact / freeform path
                    }

                    // 2026-05-26 - Journey + Blueprint route to the dedicated
                    // Journey Mapper service (internal-solutions-journeymapper,
                    // container `journey-mapper` :8080) via proxy
                    // /api/journey-map/generate. The inline chatToFreeform path
                    // was a 2026-05-25 depth-port of JM into HiC that created
                    // drift risk. Bypassed permanently. See
                    // memory/feedback_journey_must_route_to_journey_mapper.md.
                    if (tag === 'journey' || tag === 'blueprint') {
                        const jmStart = Date.now();
                        // 2026-05-26 - Immediate "in-flight" message so the user
                        // knows the (multi-minute) Journey Mapper IA service
                        // is running and the chat hasn't silently failed. The
                        // service does a two-pass Claude generation that can
                        // run 30-180 seconds even on haiku. Without this notice
                        // the user assumed "Failed to fetch" meant total
                        // failure when the service was actually still working.
                        deliveryMessages.push({
                            id: `msg_${Date.now()}_${tag}_inflight`,
                            role: 'assistant',
                            content: `Generating #${tag} via Journey Mapper IA service (${selectedModel}, single deep pass)... typically 2-4 min for a rich journey. The artifact lands in the Design Desk when ready.`,
                            timestamp: Date.now(),
                        });
                        try {
                            // Heuristic journey_type detection from the corpus + cleanPrompt.
                            // JM's prompt branches on type (coop / educational / customer / etc.).
                            const promptForType = `${parsed.cleanPrompt} ${context.researchGoal || ''} ${corpusText.slice(0, 4000)}`.toLowerCase();
                            let journeyType = 'general';
                            if (/co.?op|internship|placement/.test(promptForType)) journeyType = 'coop';
                            else if (/student|enrollment|education|advisor|academic/.test(promptForType)) journeyType = 'educational';
                            else if (/patient|clinical|treatment|healthcare/.test(promptForType)) journeyType = 'healthcare';
                            else if (/employee|onboarding|retention|hire/.test(promptForType)) journeyType = 'employee';
                            else if (/subscriber|feature.adoption|saas|software user/.test(promptForType)) journeyType = 'software-user';
                            else if (/donor|purchase|cultivation|customer|buyer/.test(promptForType)) journeyType = 'customer';

                            // 2026-05-26 - Opus 4.7, SINGLE pass. The user
                            // assessed the Flash single-pass as too minimal.
                            // Opus 4.7 produces the depth (many phases,
                            // activities, pains, verbatim evidence quotes) the
                            // DEPTH CONTRACT in the JM prompt now demands, in
                            // ONE pass (JOURNEY_TWO_PASS stays off so there is
                            // no second full-generation latency hit). Opus
                            // single-pass runs ~2-4 min on a 60KB corpus, so
                            // the fetch ceiling is 6 min.
                            // 2026-06-06 - C2 emission-wrapper integration for
                            // the #journey/#blueprint paths. Wraps the JM
                            // service fetch with traceRecorder + Pareto scoring
                            // so the epoch-proposer sees these emissions just
                            // like the other deliverables. JM service does its
                            // own internal logging; this trace is the SPA-side
                            // view (model_id, prompt, response text, elapsed).
                            const { emitDeliverable } = await import('../services/emitDeliverable');
                            const _jmT0 = Date.now();
                            const _jmEmit = await emitDeliverable<{ text: string; data: any }>({
                                deliverable: tag === 'blueprint' ? '#blueprint' : '#journey',
                                step_label: `${tag} via journey-mapper-ia`,
                                // 2026-06-09 — use the Analyst-Desk-selected model, never a
                                // hardcoded one (§E rule 10). The JM service maps this; if it
                                // does not support the selection it falls back to its default.
                                model_id: selectedModel,
                                prompt: parsed.cleanPrompt || context.researchGoal || 'Journey',
                                started_at: _jmT0,
                                // 2026-06-06 - Fix 2: JM service runs Opus 4.8
                                // single-pass with extended thinking - that IS
                                // the RI mechanism (uncertainty-triggered deep
                                // reasoning baked into the model). Annotate so
                                // the auditor + epoch proposer can grep.
                                ri: { fired: true, threshold: 0.0 },
                                // Stage-3 AIR emission (SHADOW) for the journey/blueprint path. Grounding is
                                // server-side in the JM service, so no resolvedChunks here; payload = the JM data.
                                air: {
                                    trigger: tag === 'blueprint' ? '#blueprint' : '#journey',
                                    objective: ((getContext ? getContext() : context)?.researchGoal) || '',
                                    buildPayload: (r) => (r && typeof r === 'object' && 'data' in r ? (r as any).data : r),
                                    // W2: JM service runs the Analyst-Desk-selected model server-side; record it + why.
                                    routing: { model: selectedModel, reason: 'Analyst-Desk selection via journey-mapper service (server-side generation)' },
                                },
                                emit: async () => {
                                    const resp = await fetch('http://127.0.0.1:5012/api/journey-map/generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            goal: parsed.cleanPrompt || context.researchGoal || 'Journey',
                                            description: parsed.cleanPrompt || '',
                                            journey_type: tag === 'blueprint' ? 'general' : journeyType,
                                            corpus: corpusText,
                                            brand: brand === 'nu' ? 'nu' : 'nxt',
                                            framing: tag === 'blueprint' ? 'future-state' : 'current-state',
                                            artifact_type: tag === 'blueprint' ? 'blueprint' : 'journey',
                                            render_mode: asSlide ? 'slides' : 'document',
                                            llm_model: selectedModel,
                                        }),
                                        signal: AbortSignal.timeout(360000),
                                    });
                                    if (!resp.ok) {
                                        const errText = await resp.text().catch(() => '');
                                        throw new Error(`journey-map service ${resp.status}: ${errText.slice(0, 200)}`);
                                    }
                                    const data = await resp.json();
                                    return { text: String(data.html || ''), data };
                                },
                                extractText: (r) => r.text,
                                buildScoreInput: (text) => ({ text, label: tag === 'blueprint' ? '#blueprint' : '#journey' }),
                            });
                            const data = _jmEmit.result.data;
                            // Build a FreeformArtifact wrapper so the design-desk
                            // store + viewer + launcher card all work unchanged.
                            const jmArtifact: FreeformArtifact = {
                                id: `journey_${data.journey_id || Date.now()}`,
                                type: 'freeform',
                                kind: tag as FreeformKind,
                                brand,
                                title: (parsed.cleanPrompt || context.researchGoal || 'Journey').slice(0, 200),
                                html: data.html || '',
                                citations: data.launcher_url
                                    ? [{ label: 'Launcher', source: data.launcher_url }]
                                    : [],
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            };
                            // Em-dash strip + post-processing - JM service applies
                            // brand+anti-slop already (proxy line ~11518), but we
                            // still pass through the in-HiC normalizer for parity.
                            let finalJm = stripEmDashesInPlace(jmArtifact);
                            try {
                                const panelResult = await runExpertPanel({
                                    deliverable: finalJm,
                                    kind: (tag === 'blueprint' ? 'blueprint' : 'journey') as ArtifactKind,
                                    proxy_base: 'http://127.0.0.1:5012',
                                });
                                finalJm = panelResult.result as FreeformArtifact;
                            } catch (pErr: any) {
                                console.warn(`[ExpertPanel/${tag}-jm] failed (non-fatal):`, pErr?.message || pErr);
                            }
                            useDesignDeskStore.getState().addArtifact(finalJm);
                            useDesignDeskStore.getState().setActiveArtifact(finalJm.id);
                            const elapsedMs = Date.now() - jmStart;
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_jm`,
                                role: 'assistant',
                                content: `Generated #${tag} via Journey Mapper IA service (${data.model || 'sonnet'}): "${finalJm.title}". Rendered below (${(elapsedMs / 1000).toFixed(1)}s).`,
                                model: `journey-mapper-ia/${data.model || 'sonnet'}`,
                                timestamp: Date.now(),
                                deliveredArtifactId: finalJm.id,
                                deliveredArtifactType: tag as any,
                                deliveredAsSlide: asSlide,
                                // 2026-05-26 - Absolute-ize the launcher URL.
                                // data.launcher_url is "/api/journey-map/view/{id}"
                                // (relative). window.open() resolves a relative
                                // path against the SPA origin (:5011), which
                                // SPA-falls-back to index.html = the LANDING PAGE.
                                // The view endpoint lives on the proxy at :5012,
                                // so prefix the proxy origin.
                                artifactLaunchUrl: data.launcher_url
                                    ? (data.launcher_url.startsWith('http') ? data.launcher_url : `http://127.0.0.1:5012${data.launcher_url}`)
                                    : undefined,
                                artifactLaunchMeta: data.launcher_url ? {
                                    title: finalJm.title,
                                    brand: (finalJm.brand as any) === 'nu' ? 'NU' : 'NXT',
                                    kind: tag,
                                    source: 'Journey Mapper IA service',
                                    model: String(data.model || 'sonnet'),
                                } : undefined,
                            });
                        } catch (e: any) {
                            console.error(`[journey-map/${tag}] generation failed:`, e?.message || e);
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_err`,
                                role: 'assistant',
                                content: `#${tag} generation failed via Journey Mapper IA service: ${e?.message || e}`,
                                timestamp: Date.now(),
                            });
                        }
                        continue; // bypass the freeform/chatToArtifact paths entirely
                    }

                    //    Diagram kinds (org, arch, roadmap) go through the freeform-HTML
                    //    pipeline using the user's NU/NXT exemplars. Journey + blueprint
                    //    were removed 2026-05-26 - they now route to the Journey Mapper
                    //    service above. Persona stays on the legacy structured pipeline.
                    if (FREEFORM_KINDS.has(ffKind)) {
                        const ff = await generateFreeformArtifact({
                            kind: ffKind,
                            brand,
                            userPrompt: parsed.cleanPrompt || query,
                            corpus: corpusText,
                            currentArtifact: null,
                            // cap-aware cost/quality model (aiRouter SSOT). chatToFreeform
                            // has gemini + anthropic branches; while the Opus cap is active
                            // this is Gemini 3.1 Pro, restoring Opus after the cap lifts.
                            model: artifactModelFor(ffKind) as any,
                        });
                        if (ff.ok) {
                            // 2026-05-25 - Expert panel: domain critic + universal
                            // anti-slop + structural hygiene BEFORE the artifact reaches
                            // the design desk. Em-dashes auto-stripped, debug brackets
                            // removed, name-suffix slop cleaned. Non-fatal on failure.
                            let finalArtifact = ff.artifact;
                            try {
                                const kindMap: Record<string, ArtifactKind> = {
                                    journey: 'journey', blueprint: 'blueprint',
                                    org: 'org', arch: 'arch', roadmap: 'roadmap',
                                };
                                const panelKind = kindMap[tag as string];
                                if (panelKind) {
                                    const panelResult = await runExpertPanel({
                                        deliverable: ff.artifact,
                                        kind: panelKind,
                                        proxy_base: 'http://127.0.0.1:5012',
                                    });
                                    finalArtifact = panelResult.result as typeof ff.artifact;
                                    console.log(`[ExpertPanel/${tag}] em-dashes ${panelResult.panel_summary.em_dash_count_before} → ${panelResult.panel_summary.em_dash_count_after}, ${panelResult.panel_summary.critics_with_edits.length} critic(s) applied edits, $${panelResult.total_cost_usd.toFixed(3)}`);
                                }
                            } catch (panelErr: any) {
                                console.warn(`[ExpertPanel/${tag}] failed (non-fatal):`, panelErr?.message || panelErr);
                                finalArtifact = stripEmDashesInPlace(ff.artifact);
                            }

                            useDesignDeskStore.getState().addArtifact(finalArtifact);
                            useDesignDeskStore.getState().setActiveArtifact(finalArtifact.id);
                            const _afterAdd = useDesignDeskStore.getState();
                            console.info(`[Freeform/store] added ${(finalArtifact as any).kind}/${finalArtifact.brand} id=${finalArtifact.id}. Store now has ${_afterAdd.artifacts.length} artifacts. Found by id?`,
                                _afterAdd.artifacts.find(a => a.id === finalArtifact.id) ? 'YES' : 'NO',
                                'Active id:', _afterAdd.activeArtifactId);
                            // 2026-05-25 - Every artifact-engine-routed kind gets a
                            // launcher card. The artifact-engine sets citations[0].source
                            // to the launcher URL when the proxy returned one. Surface
                            // it on the chat message so the user can open the interactive
                            // HTML in a new browser window (the chat-side iframe sandbox
                            // blocks scripts so interactive widgets are non-functional in
                            // the Design Desk preview).
                            const isArtifactEngineRoute = typeof ff.modelUsed === 'string' && (ff.modelUsed.includes('artifact-engine') || ff.modelUsed.includes('journey-mapper-ia'));
                            const launcherUrl = isArtifactEngineRoute
                                ? (ff.artifact.citations?.[0]?.source || '')
                                : '';
                            deliveryMessages.push({
                                id: `msg_${Date.now()}_${tag}_gen`,
                                role: 'assistant',
                                content: asSlide
                                    ? `Generated #${tag}${slideTag} via ${ff.modelUsed}: "${ff.artifact.title}". Rendered as a 1920x1080 slide below using the ${brand.toUpperCase()} exemplar.`
                                    : launcherUrl
                                        ? `Generated #${tag} via ${ff.modelUsed}: "${ff.artifact.title}". Open the launcher below for the full interactive experience.`
                                        : `Generated #${tag} via ${ff.modelUsed}: "${ff.artifact.title}". Rendered below. Open the Design Desk to edit it on the canvas.`,
                                model: ff.modelUsed,
                                timestamp: Date.now(),
                                deliveredArtifactId: ff.artifact.id,
                                deliveredArtifactType: tag as any,
                                deliveredAsSlide: asSlide,
                                artifactLaunchUrl: launcherUrl || undefined,
                                artifactLaunchMeta: launcherUrl ? {
                                    title: ff.artifact.title,
                                    brand: (ff.artifact.brand as any) === 'nu' ? 'NU' : 'NXT',
                                    kind: tag,
                                    source: String(ff.modelUsed).includes('journey-mapper-ia') ? 'Journey Mapper IA service' : 'Artifact engine',
                                    model: String(ff.modelUsed),
                                } : undefined,
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
                        // chatToArtifact normalized + validated each - we just iterate and add all.
                        const all = (genResult as any).artifacts as any[] | undefined;
                        const list = (all && all.length > 0) ? all : [genResult.artifact];
                        // 2026-05-25 - Run the expert panel on EVERY persona before
                        // it lands in the store. The persona panel catches debug
                        // tier-brackets, "(composite)" name suffixes, em-dashes,
                        // and any synthesized quotes that should have been omitted.
                        const reviewedList = await Promise.all(list.map(async (created: any) => {
                            if (tag === 'persona') {
                                try {
                                    const panelResult = await runExpertPanel({
                                        deliverable: created,
                                        kind: 'persona',
                                        proxy_base: 'http://127.0.0.1:5012',
                                    });
                                    console.log(`[ExpertPanel/persona ${created.name || created.id}] em-dashes ${panelResult.panel_summary.em_dash_count_before} → ${panelResult.panel_summary.em_dash_count_after}, ${panelResult.panel_summary.critics_with_edits.length} critic(s) applied edits`);
                                    return panelResult.result;
                                } catch (panelErr: any) {
                                    console.warn(`[ExpertPanel/persona] failed (non-fatal):`, panelErr?.message || panelErr);
                                    return stripEmDashesInPlace(created);
                                }
                            }
                            return created;
                        }));
                        reviewedList.forEach((created: any, idx: number) => {
                            useDesignDeskStore.getState().addArtifact(created);
                            // Last one becomes active so the canvas opens to it
                            if (idx === reviewedList.length - 1) useDesignDeskStore.getState().setActiveArtifact(created.id);
                            const label = created.title ?? created.name ?? 'Untitled';
                            const countLabel = reviewedList.length > 1 ? ` (${idx + 1} of ${reviewedList.length})` : '';
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
                            content: `Generation failed for #${tag}${genResult.modelUsed ? ` via ${genResult.modelUsed}` : ''}: ${'error' in genResult ? genResult.error : 'unknown error'}${'rawResponse' in genResult && genResult.rawResponse ? `\n\nModel output: ${String(genResult.rawResponse).slice(0, 200)}...` : ''}`,
                            model: genResult.modelUsed,
                            timestamp: Date.now(),
                        });
                    }
                }
            }

            setMessages(prev => [...prev, ...deliveryMessages]);
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
            return;
        }

        if (isImageRequest(query)) {
            const response = await handleImageGeneration(query);
            setMessages(prev => [...prev, response]);
            setIsLoading(false);
            if (pendingAttachments.length > 0) setPendingAttachments([]);
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
        // 2026-05-08 - Inject mid-chat ad-hoc attachments at the TOP of the
        // uploadedFileContents block. The model sees them as PRIORITY 0 source
        // material - they're what the user just dropped in, so they answer
        // any question or hashtag in this turn first.
        if (pendingAttachments.length > 0) {
            const adHocBlock = pendingAttachments.map(att => {
                const meta = [
                    att.slideCount ? `${att.slideCount} slides` : null,
                    att.pageCount ? `${att.pageCount} pages` : null,
                    `${att.charCount} chars`,
                    att.isImage ? 'IMAGE' : null,
                ].filter(Boolean).join(', ');
                return `=== AD-HOC UPLOAD: ${att.filename} (${meta}) ===\n${att.parsedText}\n=== END ${att.filename} ===`;
            }).join('\n\n');
            const adHocHeader = `=== USER JUST UPLOADED ${pendingAttachments.length} FILE(S) MID-CHAT - TREAT AS PRIMARY SOURCE FOR THIS TURN ===\n\n`;
            liveContext.uploadedFileContents = adHocHeader + adHocBlock + '\n\n' + (liveContext.uploadedFileContents || '');
            // Also surface in uploadedFiles[] so the prompt-suggestion chips
            // and the dynamic context summarizer can see them by name.
            const adHocFiles = pendingAttachments.map(att => ({
                name: att.filename,
                parsedText: att.parsedText,
            }));
            liveContext.uploadedFiles = [...adHocFiles, ...(liveContext.uploadedFiles || [])];
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

        // 2026-05-23 - Chunked slide-deck interception. When the user asks for
        // a multi-theme slide deck (e.g., "5 case study slides per theme × 4
        // themes"), the single-shot chat path silently truncates around slide
        // 4-5. The chunker fans out to one parallel call per theme, validates
        // every theme produces N slides, and merges into a deterministic deck.
        // No fallback to the truncating path - if the chunker fails, the user
        // gets a structured diagnostic, not a half-deliverable.
        if (shouldChunkSlideRequest(query)) {
            const chunkMsgId = `msg_${Date.now()}_chunk`;
            setMessages(prev => [...prev, {
                id: chunkMsgId,
                role: 'assistant',
                content: 'Generating slide deck via per-theme parallel chunks...',
                timestamp: Date.now(),
                model: 'gemini-3.5-flash',
                skillUsed: 'slide-deck-chunker',
            } as ChatMessage]);
            try {
                const t0 = Date.now();
                // Pass any feedback signals already in localStorage for this
                // artifact type - set by the feedback widget on prior runs.
                let feedbackSignals: { incomplete?: boolean; tooShort?: boolean } | undefined;
                try {
                    const raw = localStorage.getItem('hic_chunk_feedback_slides');
                    if (raw) feedbackSignals = JSON.parse(raw);
                } catch { /* no signals yet */ }
                const liveCtx = getContext ? getContext() : context;
                const result = await generateChunkedSlideDeck({
                    prompt: query,
                    brand: /#NU\b/i.test(query) ? 'NU' : 'NXT',
                    template: 'case-study',
                    engagementSlug: (liveCtx?.researchGoal || 'default-engagement').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80),
                    corpusContext: (liveCtx?.corpusText || '').slice(0, 100000),
                    feedbackSignals,
                });
                const elapsedMs = Date.now() - t0;
                const successCount = result.perThemeStatus.filter(t => t.ok).length;
                const summary = `${result.totalSlides}-slide deck across ${result.perThemeStatus.length} themes (${successCount}/${result.perThemeStatus.length} themes complete, ${(elapsedMs / 1000).toFixed(1)}s parallel).`;
                setMessages(prev => prev.map(m => m.id === chunkMsgId ? {
                    ...m,
                    content: `${summary}\n\n${result.deckMarkdown}`,
                    durationMs: elapsedMs,
                } : m));
                // 2026-05-23 - Explicit lift for the chunked-slide path.
                // CRITICAL: the chat renderer filters slides+deliverables by
                // `Math.abs(slide.timestamp - msg.timestamp) < 5000ms` AND
                // `slide.model === msg.model`. Chunked slides arrive 50+
                // seconds after the message was created, so without
                // overriding the lifted artifacts' timestamps the slides
                // PARSE but NEVER RENDER as cards (filter excludes them).
                // This was the second-layer bug behind the user's "FAIL to
                // generate slides" report.
                if (result.deckMarkdown.includes(':::slide')) {
                    const msgForLift = (messages.find(mm => mm.id === chunkMsgId)) || { timestamp: Date.now(), model: 'gemini-3.5-flash' };
                    const newDels = parseDeliverableBlocks(result.deckMarkdown, msgForLift.model);
                    if (newDels.length > 0) {
                        // Override timestamp so renderer filter associates these with the chunk message
                        const stamped = newDels.map(d => ({ ...d, model: msgForLift.model, timestamp: msgForLift.timestamp }));
                        setDeliverables(prev => [...prev, ...stamped]);
                    }
                    const newSlides = parseSlideBlocks(result.deckMarkdown, msgForLift.model, query);
                    if (newSlides.length > 0) {
                        const stamped = newSlides.map(s => ({ ...s, model: msgForLift.model, timestamp: msgForLift.timestamp }));
                        setSlides(prev => [...prev, ...stamped]);
                        try { generatePersonaSlidePortraits(stamped); } catch { /* non-blocking */ }
                        verifyAndAttachLedger(stamped, chunkMsgId);
                    }
                }
                liftedArtifactMsgIdsRef.current.add(chunkMsgId);
            } catch (chunkErr: any) {
                setMessages(prev => prev.map(m => m.id === chunkMsgId ? {
                    ...m,
                    content: `Slide deck chunker failed: ${chunkErr?.message || 'unknown error'}. The original single-shot path would silently truncate - surfaced this diagnostic instead. You can retry, revise the prompt, or click "Apply now" with feedback.`,
                } : m));
            } finally {
                setIsLoading(false);
                if (pendingAttachments.length > 0) setPendingAttachments([]);
            }
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // WS-6 FLUID CHAT (2026-08-14 v2 program): natural-language asks reach
        // the same executors the hashtags invoke. Regex pre-filter first (zero
        // added latency for ordinary Q&A), then one flash classification;
        // every failure falls open to plain chat. Hashtag messages skip this.
        // ═══════════════════════════════════════════════════════════════
        {
            // ANY draft slide counts as deck material (classic templates included:
            // the 2026-08-17 T8 test proved slides:*-only gating starves the router).
            const draftDeck = slides.filter(s => s.status === 'draft');
            if (quickIntentFilter(query, draftDeck.length > 0) || directIntent(query, draftDeck.length > 0)) {
                // Deterministic mapping first (chips must never ride a network
                // classifier); the model classifier only handles ambiguous asks.
                const intent = directIntent(query, draftDeck.length > 0)
                    || await classifyChatIntent(query, { hasDeck: draftDeck.length > 0 });
                if (intent.kind !== 'plain') {
                    const live: any = getContext ? getContext() : context;
                    const rawThemes = Array.isArray(live?.themes?.themes) ? live.themes.themes : (Array.isArray(live?.themes) ? live.themes : []);
                    const ectx = {
                        researchGoal: String(live?.researchGoal || ''),
                        corpusText: String(live?.corpusText || ''),
                        deckTitles: draftDeck.map(s => s.title),
                        themeLines: rawThemes.map((t: any) => String(t?.title || t?.name || t?.theme || '')).filter(Boolean),
                    };
                    const noticeId = `msg_${Date.now()}_intent`;
                    try {
                        if (intent.kind === 'deck_edit') {
                            setMessages(prev => [...prev, { id: noticeId, role: 'assistant', content: `Rewriting ${intent.slideIndex ? `slide ${intent.slideIndex}` : `${draftDeck.length} slides`} (${intent.op})...`, model: DEFAULT_MODELS.fast_generation, timestamp: Date.now() } as ChatMessage]);
                            const res = await applyDeckTextPass(draftDeck as any[], intent.op, query, intent.slideIndex);
                            if (res.updated.length) setSlides(prev => prev.map(s => (res.updated as any[]).find((u: any) => u.id === s.id) || s));
                            const summary = [
                                res.updated.length ? `Rewrote ${res.editedFields} field${res.editedFields === 1 ? '' : 's'} across ${res.updated.length} slide${res.updated.length === 1 ? '' : 's'} (${intent.op}).` : 'The current copy already reads tight; no fields needed rewriting.',
                                res.skippedLocked ? `${res.skippedLocked} locked slide${res.skippedLocked === 1 ? '' : 's'} untouched.` : '',
                                res.failed ? `${res.failed} slide${res.failed === 1 ? '' : 's'} hit an error and kept the original text.` : '',
                                res.updated.length ? 'Review the previews above; each slide\'s EDIT TEXT panel has Undo.' : '',
                            ].filter(Boolean).join(' ');
                            setMessages(prev => prev.map(m => m.id === noticeId ? { ...m, content: summary } : m));
                        } else if (intent.kind === 'client_email') {
                            setMessages(prev => [...prev, { id: noticeId, role: 'assistant', content: 'Drafting the client follow-up email from the research and deck...', model: artifactModelFor('report'), timestamp: Date.now() } as ChatMessage]);
                            const email = await draftClientEmail(ectx, query);
                            setMessages(prev => prev.map(m => m.id === noticeId ? { ...m, content: email || 'The email draft came back empty. Try again, or add a sentence on what the email should emphasize.' } : m));
                        } else if (intent.kind === 'slide_narrative') {
                            setMessages(prev => [...prev, { id: noticeId, role: 'assistant', content: 'Planning the slide narrative from the research...', model: artifactModelFor('strategy'), timestamp: Date.now() } as ChatMessage]);
                            const plan = await draftSlideNarrative(ectx, query);
                            setMessages(prev => prev.map(m => m.id === noticeId ? { ...m, content: plan || 'The narrative plan came back empty. Try again, or name the audience and the decision the deck must drive.' } : m));
                        }
                        setIsLoading(false);
                        if (pendingAttachments.length > 0) setPendingAttachments([]);
                        return;
                    } catch (intentErr: any) {
                        // Fail open: remove the notice and continue into plain chat.
                        setMessages(prev => prev.filter(m => m.id !== noticeId));
                        console.warn('[fluid-chat] intent path failed; falling back to plain chat:', intentErr?.message || intentErr);
                    }
                }
            }
        }

        // 2026-05-26 - Per-send AbortController so the user can cancel
        // long-running chat requests (the case-study 23-min wait that
        // surfaced during pipeline contention). The controller is stored
        // on the component ref so LiveProcessingIndicator's X button can
        // call abort() from its onAbort prop.
        const sendAbort = new AbortController();
        currentAbortRef.current = sendAbort;
        // 2026-05-26 - Find the in-flight placeholder so onProgress can
        // update its content. The most recent assistant placeholder is
        // the one created right before this call; we use a marker id.
        // 2026-06-12 - Label the placeholder + loading indicator with the
        // ROUTED model (Fable 5 for artifact hashtags), not the plain-chat
        // default. The old `model: selectedModel` produced "via
        // gemini-3.5-flash" on in-flight Fable generations in both the
        // processing screen and the chat export.
        const routedModelId = routedModelFor(enrichedQuery, selectedModel);
        setInFlightModelId(routedModelId);
        const progressMsgId = `msg_${Date.now()}_inflight_progress`;
        setMessages(prev => [...prev, {
            id: progressMsgId,
            role: 'assistant',
            content: 'Reasoning... starting',
            model: routedModelId,
            timestamp: Date.now(),
        }]);
        let response: ChatMessage;
        try {
            response = await sendChatMessage(selectedModel, enrichedQuery, messages, liveContext, {
                signal: sendAbort.signal,
                onProgress: (status: string) => {
                    setMessages(prev => prev.map(m => m.id === progressMsgId ? { ...m, content: status } : m));
                },
            });
            // Remove the progress placeholder once the real response arrives
            setMessages(prev => prev.filter(m => m.id !== progressMsgId));
        } catch (sendErr: any) {
            // Clean up progress placeholder on error
            setMessages(prev => prev.filter(m => m.id !== progressMsgId));
            if (sendErr?.name === 'AbortError') {
                response = {
                    id: `msg_${Date.now()}_aborted`,
                    role: 'assistant',
                    content: 'Cancelled by user. In-flight LLM and tool calls aborted; proxy workers freed for other work.',
                    model: routedModelId,
                    timestamp: Date.now(),
                };
            } else {
                throw sendErr;
            }
        } finally {
            // Clear so a stale signal from this send can't abort the next one
            if (currentAbortRef.current === sendAbort) currentAbortRef.current = null;
            setInFlightModelId(null);
        }
        setMessages(prev => [...prev, response]);

        // Parse deliverables/slides only when skill activated or explicit delimiters present
        if (response.skillUsed || response.content.includes(':::deliverable:') || response.content.includes(':::slide')) {
            const newDels = parseDeliverableBlocks(response.content, response.model);
            if (newDels.length > 0) {
                // 2026-05-23 - Override timestamp/model to match response so
                // the renderer's per-message association filter (±5s) lets
                // these cards render even if parsing takes a moment.
                const stamped = newDels.map(d => ({ ...d, model: response.model || d.model, timestamp: response.timestamp }));
                setDeliverables(prev => [...prev, ...stamped]);
                generatePersonaPortraits(stamped);
            }
            const newSlides = parseSlideBlocks(response.content, response.model, query);
            // 2026-05-23 - Mark this message as lifted so the universal
            // safety-net useEffect doesn't double-lift on the next render.
            liftedArtifactMsgIdsRef.current.add(response.id);
            if (newSlides.length > 0) {
                const stampedSlides = newSlides.map(s => ({ ...s, model: response.model || s.model, timestamp: response.timestamp }));
                setSlides(prev => [...prev, ...stampedSlides]);
                generatePersonaSlidePortraits(stampedSlides);
                // Phase 1-retrofit (2026-04-20) - WIKI-BACKED QUOTE BACKFILL.
                // Walks every theme across the new slides; wherever the AI
                // emitted a title-shaped evidence string (instead of a real
                // body sentence), pulls matching articles from the wiki
                // archive and replaces with verbatim body text. Non-blocking
                // and idempotent - the slides already render with the AI's
                // original output; this updates state with improved quotes
                // a second later. Failures leave slides untouched.
                (async () => {
                    let baseForVerify = stampedSlides;
                    try {
                        const backfilled = await backfillSlidesFromWiki(stampedSlides, query);
                        if (backfilled !== stampedSlides) {
                            setSlides(prev => prev.map(s => {
                                const match = backfilled.find(b => b.id === s.id);
                                return match || s;
                            }));
                            baseForVerify = backfilled;
                        }
                    } catch (err: any) {
                        console.warn('[slides] wiki quote backfill skipped:', err?.message || err);
                    }
                    // PROVENANCE LOCK: verify AFTER the backfill settles so the two
                    // passes never race (the backfill previously replaced slides from
                    // pre-fix clones, silently restoring fabricated labels).
                    verifyAndAttachLedger(baseForVerify, response.id);
                })();
                // ILLUSTRATOR (2026-06-17): slides:scene scenes carry an imageConcept; generate a
                // tasteful on-brand TRANSPARENT illustration per scene (proxy /api/ai/illustration ->
                // Nano Banana 2 + knockout) and inject it. Non-blocking + parallel: scenes render
                // immediately, illustrations drop in a few seconds later. Fail-open (a scene without
                // an illustration is fine). The composer (slides:scene) renders payload.illustration.
                (async () => {
                    const scenes = stampedSlides.filter((s: any) =>
                        String(s.template || '').toLowerCase() === 'slides:scene'
                        && s.composerPayload?.imageConcept && !s.composerPayload?.illustration);
                    if (!scenes.length) return;
                    // DF-V1 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md):
                    // SEQUENTIAL with REFERENCE CHAINING, replacing Promise.all. Parallel
                    // generation is faster and produces a deck whose palette, line weight
                    // and abstraction level drift slide to slide, because no call can see
                    // what the others made. deer-flow's ppt-generation skill forbids
                    // parallel slide art for exactly this reason. The first scene sets the
                    // visual language; every later scene carries the previous accepted
                    // image as its reference. Still fail-open: a scene without art is fine,
                    // and a failure does not break the chain for the scenes after it.
                    let reference = '';
                    for (const s of scenes as any[]) {
                        try {
                            const r = await fetch('http://127.0.0.1:5012/api/ai/illustration', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ concept: s.composerPayload.imageConcept,
                                    brand: s.brand || 'nxt', canvas: s.composerPayload.canvas || 'dark',
                                    ...(reference ? { reference } : {}) }),
                            });
                            const j = await r.json().catch(() => null);
                            const uri = j?.dataUri;
                            if (uri) {
                                reference = uri;
                                setSlides(prev => prev.map(x => x.id === s.id
                                    ? { ...x, composerPayload: { ...(x as any).composerPayload, illustration: uri } } : x));
                            }
                        } catch (e: any) {
                            console.warn(`[slides] illustration skipped for ${s.id}:`, e?.message || e);
                        }
                    }
                })();
                // ILLUSTRATOR - REGISTRY-DRIVEN (2026-06-17): for GOLD/#slides artifacts, fill every
                // image slot the IMAGE-SLOT REGISTRY defines for that template (artifactImageSlots.ts).
                // Concept derived from live element content, brand + ground-correct, intra-artifact
                // unique. Non-blocking + fail-open; no-op for the deliberate no-image set. Renderer
                // twins read the carrier fields (journey wired; others as they land).
                (async () => {
                    const SUBFIELD: Record<string, string> = {
                        'persona-card': 'persona', 'competitive-matrix': 'matrix', 'prd-feature': 'prdFeature',
                        'journey-map': 'journeyMap', 'timeline': 'timeline', 'theme-cluster': 'themeCluster',
                        'recommendation': 'recommendation',
                        // E3 2026-07-02: the brief page's full-width exhibit slot (registry executive-brief,
                        // carrier exhibitImage) - native infographic composed from the sections' own data.
                        'executive-brief': 'executiveBrief',
                        // USER OVERRIDE 2026-06-28 (scenes-where-they-fit): case-study panel emotive.
                        // The chat path emits :::slide template=case-study; its payload subfield is caseStudy.
                        'case-study': 'caseStudy',
                        // USER OVERRIDE 2026-06-28 (scenes-where-they-fit): the #slides CONTENT archetypes
                        // with genuine layout room (live-Figma audit). They emit template=slides:<archetype>
                        // and the composer reads the carrier off composerPayload, so route the resolver's
                        // carrier write THERE (panelImage for block-quote; columnIcons[] for org-model).
                        'slides:block-quote': 'composerPayload',
                        'slides:org-model': 'composerPayload',
                        // 2026-07-02 #slides infographic uplift: the deck-native data-visual
                        // archetype; the native lane composes the panel from the payload's own
                        // structured fields and writes composerPayload.exhibitImage.
                        'slides:infographic-exhibit': 'composerPayload',
                        // 2026-06-29: the full-bleed interstitial archetypes carry an emotive
                        // hero panel (registry slides:cover/section-divider/thesis-interstitial,
                        // carrier heroImage, wired). The composer reads composerPayload.heroImage
                        // and paints it as a full-bleed <img> (GEO walker -> native pptx picture).
                        'slides:cover': 'composerPayload',
                        'slides:section-divider': 'composerPayload',
                        'slides:thesis-interstitial': 'composerPayload',
                        // 2026-07-03 slides-imagery uplift (ideal-deck parity): photographic
                        // backgrounds (cover -> copied to agenda), per-item environmental
                        // thumbnails (numbered-themes), persona portrait (role-needs). All
                        // content-derived from the slide's own payload text - industry-agnostic.
                        'slides:agenda': 'composerPayload',
                        'slides:numbered-themes': 'composerPayload',
                        'slides:role-needs': 'composerPayload',
                    };
                    // C2 routing: parse the user's #img override once; the router decides DATA vs
                    // EMOTIVE per slot and enforces the section-8 default-off gate. The deterministic
                    // diagram branch is handled at compose-time by vizSlot.attachViz, so here we only
                    // resolve the EMOTIVE (Nano-Banana) branch when the router selects it.
                    const imgOverride = parseImgDirective(query);
                    const runIndustry = ((getContext ? getContext() : context) as any)?.industry as string | undefined;
                    // 2026-07-03: the cover's photographic background CONTINUES behind the agenda
                    // (ideal-deck parity, one generation per deck). Track it; agenda never
                    // generates its own scene.
                    let deckBackground = '';
                    for (const s of stampedSlides as any[]) {
                        const tmpl = String(s.template || '');
                        if (tmpl === 'slides:agenda') continue;   // filled from deckBackground below
                        // 2026-06-27 FIX: #themes emits :::slide template=theme-overview|theme-detail|
                        // theme-arc|theme-mosaic (per the SLIDE OUTPUT PROTOCOL), but the image-slot
                        // registry + SUBFIELD key the themes spec under 'theme-cluster'. Without this
                        // alias, imageSpecFor(emitted-name) was undefined and the per-theme image loop
                        // silently skipped (root cause of #themes shipping text-only theme cards).
                        const aliasKey = /^theme-(overview|detail|arc|mosaic|spotlight|cluster)$/.test(tmpl) ? 'theme-cluster' : tmpl;
                        const artKey = imageSpecFor(tmpl) ? tmpl : (imageSpecFor(aliasKey) ? aliasKey : tmpl);
                        const spec = imageSpecFor(artKey);
                        if (!spec || spec.mode === 'none') continue;
                        const field = SUBFIELD[artKey] || SUBFIELD[tmpl];
                        const sub = field ? s[field] : s;
                        if (!sub || typeof sub !== 'object') continue;
                        try {
                            const r = await resolveRoutedSlotImages(artKey, sub, s.brand || 'nxt', s.theme || 'dark',
                                { override: imgOverride, industry: (s as any).industry || runIndustry, onLog: (msg) => console.log('[slides:img]', msg) });
                            if (r.count > 0 && field) {
                                setSlides(prev => prev.map(x => x.id === s.id ? { ...x, [field]: { ...sub } } : x));
                            }
                            if (tmpl === 'slides:cover' && typeof sub.backgroundImage === 'string' && sub.backgroundImage) {
                                deckBackground = sub.backgroundImage;
                            }
                        } catch (e: any) {
                            console.warn(`[slides] routed illustration skipped ${s.id} (${tmpl}):`, e?.message || e);
                        }
                    }
                    if (deckBackground) {
                        for (const s of stampedSlides as any[]) {
                            if (String(s.template || '') !== 'slides:agenda') continue;
                            const sub = s.composerPayload;
                            if (!sub || typeof sub !== 'object' || sub.backgroundImage) continue;
                            sub.backgroundImage = deckBackground;
                            setSlides(prev => prev.map(x => x.id === s.id ? { ...x, composerPayload: { ...sub } } : x));
                            console.log('[slides:img] slides:agenda: cover background continued (no extra generation)');
                        }
                    }
                })();
                // 2026-06-27 - Flat-image diagram generation RETIRED. journey-map + architecture-map now
                // render NATIVELY (renderJourneyDiagram / renderArchitectureMap in slideToStageHtml):
                // token-grounded shapes + content-true icons + full GOLD content, not a rasterized picture.
                // The /api/ai/diagram path is no longer called from the #slides loop.
            }
        }

        // 2026-05-08 - Clear attachments after the send completes (success or fail).
        // Wiki write was already fired at the top; corpus injection already happened.
        if (pendingAttachments.length > 0) {
            setPendingAttachments([]);
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
            // 2026-07-07 (heuristic-audit uplift): match ATTRIBUTE fences too
            // (`:::slide template=slides:cover brand=nxt`). The old bare-`:::slide\n`
            // pattern left attributed fences visible as raw text whenever a message
            // relied on the lift safety-net instead of a handler content rewrite
            // (first surfaced by the audit critique-deck seed message).
            clean = clean.replace(/:::slide[^\n]*\n[\s\S]*?:::/g, '');
            clean = clean.replace(/```json\s*[\s\S]*?```/g, '');
        }
        // 2026-06-23 - DO NOT flatten markdown anymore. The chat path now renders
        // structured prose through <ChatProse>, which parses headings/bold/lists. The
        // old strip (removing `##` and `**`) is exactly what produced the unreadable
        // 11px text wall. We only collapse excess blank lines.
        clean = clean.replace(/\n{3,}/g, '\n\n');
        return clean.trim();
    };

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    const panelWidth = maximized ? '70vw' : 420;

    if (!isOpen) return null;

    return (
        <div ref={panelRef} style={{
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

            {/* Auto model routing (2026-06-12 - picker removed per Jonathan's
                directive; the user no longer selects models). Plain chat runs
                Gemini 3.5 Flash; artifact hashtags force-route to Claude
                Opus 4.8 inside sendChatMessage. This strip is informational. */}
            <div style={{ padding: '7px 16px', borderBottom: '1px solid #E8E8E8', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888' }}>Auto Routing</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#333', background: '#00B7C315', border: '1px solid #00B7C3', padding: '2px 8px' }}>
                    Chat · Gemini 3.5 Flash
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#333', background: '#CC785C15', border: '1px solid #CC785C', padding: '2px 8px' }}>
                    # Artifacts · Claude Opus 4.8
                </span>
            </div>

            {/* Messages */}
            <div ref={messagesScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16, background: '#FAFAF7' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>Ask anything about your research data</div>
                        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>
                            {context.articleCount || 0} articles from {context.sourceCount || 0} sources.
                            {skillManifest.length > 0 && ` ${skillManifest.filter(s => s.category === 'research-deliverable').length} consulting skills loaded.`}
                        </div>
                    </div>
                )}

                {/* Welcome-state dynamic suggestions - replaces the former
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

                {messages.map((msg, _msgIdx) => {
                    // Find deliverables/slides associated with this message
                    const msgDels = deliverables.filter(d => d.model === msg.model && Math.abs(d.timestamp - msg.timestamp) < 5000);
                    const msgSlides = slides.filter(s => s.model === msg.model && Math.abs(s.timestamp - msg.timestamp) < 5000);
                    const hasCards = msgDels.length > 0 || msgSlides.length > 0;
                    // COUNT-CONSISTENCY: if the user message that prompted this reply asked for an
                    // explicit count ("10 steps", "top 5 ways"), render the reply as ONE consistently
                    // numbered list regardless of how the flaky model formatted it.
                    let _forceOrdered = false;
                    if (msg.role === 'assistant') {
                        for (let k = _msgIdx - 1; k >= 0; k--) {
                            if (messages[k].role === 'user') {
                                _forceOrdered = /\b\d{1,2}\s+(steps?|items?|ways?|points?|reasons?|phases?|tips?|examples?|factors?|stages?|things?|principles?|tactics?|plays?)\b/i.test(messages[k].content || '');
                                break;
                            }
                        }
                    }

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
                                // 2026-06-23 - assistant replies get a roomy card (the "spacing is
                                // terrible" / "chat UI so awful vs the theme cards" fix): generous
                                // padding, white surface, soft border + radius like a GOLD card. User
                                // turns stay a tight dark bubble. ChatProse owns its own type/rhythm.
                                padding: msg.role === 'assistant' ? '16px 18px' : '8px 12px',
                                background: msg.role === 'user' ? '#0D0D0D' : '#FFFFFF',
                                color: msg.role === 'user' ? '#FFFFFF' : '#33332E',
                                fontSize: msg.role === 'assistant' ? 13.5 : 11,
                                lineHeight: 1.6,
                                whiteSpace: msg.role === 'assistant' ? 'normal' : 'pre-wrap',
                                border: msg.role === 'assistant' ? '1px solid #E4E4DC' : 'none',
                                borderLeft: msg.role === 'assistant' ? `3px solid ${AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#B8B800'}` : 'none',
                                borderRadius: msg.role === 'assistant' ? '2px' : 0,
                            }}>
                                {msg.role === 'assistant' && isProcessingPlaceholder(msg.content) && (
                                    <LiveProcessingIndicator
                                        startedAt={msg.timestamp || Date.now()}
                                        status={msg.content}
                                        modelName={(AVAILABLE_MODELS.find(m => m.id === msg.model)?.name) || modelConfig?.name}
                                        onAbort={currentAbortRef.current ? () => {
                                            currentAbortRef.current?.abort();
                                            // Optimistic UI: replace placeholder immediately so the user sees the cancel land
                                            setMessages(prev => prev.map(mm => mm.id === msg.id ? {
                                                ...mm,
                                                content: 'Cancelling... (waiting for current iteration to release proxy workers)',
                                            } : mm));
                                        } : undefined}
                                    />
                                )}
                                {msg.role === 'assistant' && !isProcessingPlaceholder(msg.content) ? (() => {
                                    const cleaned = cleanResponseText(msg.content, hasCards);
                                    if (!cleaned) return null;
                                    // Parse NXT visual blocks
                                    const nxtSegments = parseNxtBlocks(cleaned);
                                    // 2026-06-23 - renderRun: a single inline text fragment -> citation
                                    // links + #proto chips. ChatProse calls this for every prose run so
                                    // structure (headings/bold/lists) AND citations both render.
                                    const renderRun = (runText: string, keyB: string): React.ReactNode => {
                                        const { segments: cits } = parseChatCitations(runText, (getContext ? getContext() : context).sourceReferences);
                                        return cits.map((c, ci) => {
                                            if (c.type === 'citation') {
                                                return c.url ? (
                                                    <a key={`${keyB}-${ci}`} href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#115054', background: '#E8F4F5', padding: '1px 5px', textDecoration: 'none', fontSize: 10, fontWeight: 600, borderBottom: '1px solid #00B7C3' }}>
                                                        {c.sourceName}: "{c.title?.substring(0, 40)}{(c.title?.length || 0) > 40 ? '...' : ''}"
                                                    </a>
                                                ) : (
                                                    <span key={`${keyB}-${ci}`} style={{ color: '#115054', background: '#F0F0E8', padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>
                                                        {c.sourceName}: "{c.title?.substring(0, 40)}{(c.title?.length || 0) > 40 ? '...' : ''}"
                                                    </span>
                                                );
                                            }
                                            return <span key={`${keyB}-${ci}`}>{renderProtoChips(c.content, (text) => {
                                                setInput(text);
                                                setTimeout(() => inputRef.current?.focus(), 50);
                                            })}</span>;
                                        });
                                    };
                                    return nxtSegments.map((seg, si) => {
                                        if (seg.type === 'nxt-block' && seg.block) {
                                            return <div key={si} style={{ margin: '8px 0' }}><NxtBlockRenderer block={seg.block} /></div>;
                                        }
                                        // Structured prose (headings, bold, lists) with inline citations + chips.
                                        return <ChatProse key={si} text={seg.content} renderRun={renderRun} forceOrderedList={_forceOrdered} />;
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

                                {/* 2026-05-25 - Unified deliverable launcher card (every kind via artifact engine) */}
                                {msg.artifactLaunchUrl && (
                                    <DeliverableLaunchCard
                                        url={msg.artifactLaunchUrl}
                                        meta={msg.artifactLaunchMeta}
                                    />
                                )}
                                {/* Backward-compat: legacy journey launcher (pre-unification artifacts) */}
                                {!msg.artifactLaunchUrl && msg.journeyMapUrl && (
                                    <JourneyLaunchCard
                                        url={msg.journeyMapUrl}
                                        meta={msg.journeyMapMeta as any}
                                    />
                                )}

                                {/* 2026-05-11 - Prototype launcher card */}
                                {msg.prototypeUrl && (
                                    <PrototypeLaunchCard
                                        url={msg.prototypeUrl}
                                        meta={msg.prototypeMeta}
                                    />
                                )}

                                {/* 2026-05-13 - Product Brief comparison grid.
                                    Set by the #proto handler with 5 briefs from the
                                    VS brief generator. User clicks BUILD THIS to
                                    fire the Stage 2→3→3.5→4→5 pipeline against
                                    the approved brief. */}
                                {Array.isArray(msg.prototypeBriefs) && msg.prototypeBriefs.length > 0 && msg.prototypeBriefsMeta && (
                                    <ProductBriefsGrid
                                        briefs={msg.prototypeBriefs as any[]}
                                        meta={msg.prototypeBriefsMeta as any}
                                        onApprove={(brief, customization) => handleApproveBrief(brief, msg.prototypeBriefsMeta as any, msg.id, customization)}
                                    />
                                )}

                                {/* 2026-05-12 - HTML Artifact launcher card */}
                                {msg.artifactUrl && (
                                    <ArtifactLaunchCard
                                        url={msg.artifactUrl}
                                        meta={msg.artifactMeta}
                                    />
                                )}

                                {/* 2026-05-12 - Artifact library grid (bare #artifacts) */}
                                {Array.isArray(msg.artifactLibraryItems) && msg.artifactLibraryItems.length > 0 && (
                                    <ArtifactLibraryGrid
                                        items={msg.artifactLibraryItems}
                                        onItemDeleted={(slug) => {
                                            setMessages(prev => prev.map(mm => mm.id === msg.id ? {
                                                ...mm,
                                                artifactLibraryItems: (mm.artifactLibraryItems as any[] | undefined)?.filter((it: any) => it.slug !== slug),
                                                content: `Deleted artifact "${slug}".`,
                                            } : mm));
                                        }}
                                    />
                                )}

                                {/* 2026-05-11 - Recommendation tiles (#recommendations) */}
                                {/* 2026-05-11 - Engagement Context header
                                    rendered first: client, vendor, industry,
                                    segment, named initiative, stack, non-
                                    starters, regulatory constraints. Gives
                                    the user a sanity check on what the model
                                    extracted from their prompt. Brand- and
                                    industry-agnostic. */}
                                {(msg as any).engagementContext && (
                                    <EngagementContextBlock context={(msg as any).engagementContext as EngagementContext} />
                                )}

                                {/* 2026-05-11 - Analytical preamble: stakeholder
                                    priorities, design principles, ideas to
                                    retire, guardrail validation criteria. Shown
                                    above the tile grid so the user sees how
                                    the model interpreted their prompt before
                                    they evaluate concepts. */}
                                {(msg as any).recommendationPreamble && (
                                    <RecommendationPreambleBlock preamble={(msg as any).recommendationPreamble as RecommendationPreamble} />
                                )}

                                {Array.isArray(msg.recommendationTiles) && msg.recommendationTiles.length > 0 && (
                                    <RecommendationTilesGrid
                                        tiles={msg.recommendationTiles}
                                        onPickCommand={(cmd) => {
                                            setInput(cmd);
                                            inputRef.current?.focus();
                                        }}
                                        context={(msg as any).engagementContext as EngagementContext | undefined}
                                        brand={(msg as any).recommendationBrand as BrandId | undefined}
                                        autoExport={(msg as any).recommendationAutoExport as 'deck' | 'single' | null | undefined}
                                        engagementSlug={(context?.researchGoal || 'default-engagement').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'default-engagement'}
                                        deliverableId={msg.id}
                                    />
                                )}

                                {/* Comparison table across concepts. */}
                                {(msg as any).recommendationComparisonTable && (
                                    <RecommendationComparisonTable
                                        table={(msg as any).recommendationComparisonTable}
                                    />
                                )}

                                {/* Recommended prioritization. */}
                                {Array.isArray((msg as any).recommendationPrioritization) && (msg as any).recommendationPrioritization.length > 0 && (
                                    <RecommendationPrioritizationBlock
                                        priorities={(msg as any).recommendationPrioritization}
                                    />
                                )}

                                {/* Suggested next steps. */}
                                {Array.isArray((msg as any).recommendationNextSteps) && (msg as any).recommendationNextSteps.length > 0 && (
                                    <RecommendationNextStepsBlock
                                        steps={(msg as any).recommendationNextSteps}
                                    />
                                )}

                                {/* 2026-05-11 - Prototype library grid */}
                                {Array.isArray(msg.prototypeLibraryItems) && msg.prototypeLibraryItems.length > 0 && (
                                    <PrototypeLibraryGrid
                                        items={msg.prototypeLibraryItems}
                                        onItemDeleted={(slug) => {
                                            setMessages(prev => prev.map(mm => mm.id === msg.id ? {
                                                ...mm,
                                                prototypeLibraryItems: (mm.prototypeLibraryItems as any[] | undefined)?.filter(it => it.slug !== slug),
                                                content: `Deleted prototype "${slug}".`,
                                            } : mm));
                                        }}
                                        onEditTriggered={async (slug, instruction) => {
                                            await handlePrototypeEdit(slug, instruction);
                                        }}
                                    />
                                )}

                                {/* Library card grid for #presentations bare-hashtag */}
                                {Array.isArray(msg.libraryItems) && msg.libraryItems.length > 0 && (
                                    <PresentationLibraryGrid
                                        items={msg.libraryItems as PresentationSummary[]}
                                        onItemDeleted={(slug) => {
                                            setMessages(prev => prev.map(mm => mm.id === msg.id ? {
                                                ...mm,
                                                libraryItems: (mm.libraryItems as PresentationSummary[] | undefined)?.filter(it => it.slug !== slug),
                                                content: `Deleted "${slug}". ${((mm.libraryItems as PresentationSummary[] | undefined)?.length ?? 1) - 1} presentation(s) remaining.`,
                                            } : mm));
                                        }}
                                        onItemEdited={() => { /* handled in onEditTriggered */ }}
                                        onEditTriggered={async (slug, instruction) => {
                                            await handlePresentationEdit(slug, instruction);
                                        }}
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
                                        onAuthorImagery={async (s, slotField, spec) => {
                                            // GENERATE-NOW UX (owner 2026-08-14): Set = persist + render this
                                            // slot immediately; the in-slot overlay shows progress and the
                                            // preview updates in place before the user moves on.
                                            const payload = { ...(s.composerPayload || {}), _userImagery: { ...((s.composerPayload || {})._userImagery || {}), [slotField]: spec } };
                                            setSlides(prev => prev.map(x => x.id === s.id ? { ...x, composerPayload: payload } : x));
                                            const key = `${s.id}:${slotField}`;
                                            setGeneratingSlotKeys(prev => [...prev, key]);
                                            try {
                                                const res = await resolveUserImageryForPayload(String(s.template), payload, s.brand === 'nu' ? 'nu' : 'nxt', slotField);
                                                if (res.rendered > 0) {
                                                    setSlides(prev => prev.map(x => x.id === s.id ? { ...x, composerPayload: { ...payload } } : x));
                                                } else {
                                                    console.warn(`[user-imagery] slot ${key} rendered nothing${res.failed.length ? ` (${res.failed.join(', ')})` : ''}`);
                                                }
                                            } catch (e: any) {
                                                console.warn(`[user-imagery] slot ${key} failed:`, e?.message || e);
                                            } finally {
                                                setGeneratingSlotKeys(prev => prev.filter(k => k !== key));
                                            }
                                        }}
                                        generatingSlotKeys={generatingSlotKeys}
                                        onUpdateSlide={u => setSlides(prev => prev.map(x => x.id === u.id ? u : x))}
                                    />
                                </div>
                            ))}
                            {/* PROVENANCE LOCK: verification ledger - every claim in the deck,
                                its real source, URL, and verdict. Auto-open when anything is
                                flagged; collapsed when the deck is clean. */}
                            {msg.role === 'assistant' && (verificationLedgers[msg.id]?.length || 0) > 0 && (() => {
                                const rows = verificationLedgers[msg.id];
                                const flagged = rows.filter(r => r.verdict !== 'VERIFIED');
                                const chip = (v: LedgerRow['verdict']) => ({
                                    VERIFIED: { bg: '#EAF3EE', fg: '#115054', label: 'VERIFIED' },
                                    ATTRIBUTION_FIXED: { bg: '#F5F3D6', fg: '#6B6B00', label: 'RELABELED' },
                                    UNVERIFIED: { bg: '#FBEAEA', fg: '#CC3333', label: 'UNVERIFIED' },
                                    UNSOURCED: { bg: '#FBF2EE', fg: '#CC6644', label: 'UNSOURCED' },
                                    UNREACHABLE: { bg: '#EFEFEF', fg: '#666666', label: 'UNCHECKED' },
                                }[v]);
                                return (
                                    <details open={flagged.length > 0} style={{ marginTop: 8, border: '1px solid #E4E4DC', borderLeft: `3px solid ${flagged.length ? '#CC6644' : '#115054'}`, background: '#FFFFFF', padding: '8px 12px' }}>
                                        <summary style={{ cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#33332E' }}>
                                            Verification ledger: {rows.length} claim{rows.length === 1 ? '' : 's'} checked, {flagged.length} flagged
                                        </summary>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                            {rows.map((r, i) => {
                                                const c = chip(r.verdict);
                                                return (
                                                    <div key={i} style={{ fontSize: 11, lineHeight: 1.45, paddingBottom: 8, borderBottom: i < rows.length - 1 ? '1px solid #F0F0EA' : 'none' }}>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' as const }}>
                                                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1px', padding: '1px 6px', background: c.bg, color: c.fg }}>{c.label}</span>
                                                            <span style={{ color: '#888', fontSize: 9 }}>{r.slideTitle.slice(0, 60)}</span>
                                                        </div>
                                                        <div style={{ color: '#33332E', marginTop: 2 }}>"{r.claim.slice(0, 160)}{r.claim.length > 160 ? '...' : ''}"</div>
                                                        <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                                                            {r.citedAs && <>Cited as: {r.citedAs}{r.realSources.length ? ' ' : ''}</>}
                                                            {r.realSources.length > 0 && <>Real source: {r.realSources.join('; ')} </>}
                                                            {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#00B7C3' }}>{r.url.replace(/^https?:\/\//, '').slice(0, 60)}</a>}
                                                        </div>
                                                        <div style={{ color: '#999', fontSize: 10 }}>{r.note}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                );
                            })()}

                            {/* Export Deck bar - appears once a message produced 2+ slides */}
                            {msg.role === 'assistant' && msgSlides.length >= 2 && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, padding: '8px 12px', background: '#FAFAFA', borderLeft: '3px solid #caca20', alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#666' }}>{msgSlides.length}-slide deck</span>
                                    <div style={{ flex: 1 }} />
                                    {/* USER-DIRECTED IMAGERY (2026-08-14 pivot): resolve every authored slot
                                        through the illustration lane with the REAL style tokens, write the
                                        URLs into the composer payloads, and let the preview re-render. */}
                                    {(() => {
                                        const authoredCount = msgSlides.reduce((n, s) => n + Object.values((s.composerPayload?._userImagery || {})).filter((v: any) => v?.prompt).length, 0);
                                        if (!authoredCount) return null;
                                        return (
                                            <button disabled={regeneratingVisuals}
                                                onClick={async () => {
                                                    setRegeneratingVisuals(true);
                                                    // Static import (2026-08-14 fix): the dynamic import() chunk 404s on a
                                                    // stale bundle, which killed the whole click silently while the chips
                                                    // (static path) kept working. Per-slide try/catch so one failure never
                                                    // aborts the remaining authored slides.
                                                    let rendered = 0; const failed: string[] = [];
                                                    try {
                                                        for (const s of msgSlides) {
                                                            if (!s.composerPayload?._userImagery) continue;
                                                            try {
                                                                const res = await resolveUserImageryForPayload(String(s.template), s.composerPayload, s.brand === 'nu' ? 'nu' : 'nxt');
                                                                rendered += res.rendered; failed.push(...res.failed);
                                                                if (res.rendered > 0) {
                                                                    setSlides(prev => prev.map(x => x.id === s.id ? { ...x, composerPayload: { ...s.composerPayload } } : x));
                                                                }
                                                            } catch (slideErr: any) {
                                                                failed.push(`${String(s.template)}: ${String(slideErr?.message || slideErr).slice(0, 60)}`);
                                                            }
                                                        }
                                                        console.log(`[user-imagery] rendered ${rendered} visual(s)${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
                                                        if (rendered === 0) {
                                                            setMessages(prev => [...prev, { id: `ui-${Date.now()}`, role: 'assistant', content: `No visuals rendered${failed.length ? `: ${failed.join('; ')}` : ' (is the proxy running?)'}. The authored prompts are kept; try Regenerate again.`, timestamp: Date.now() } as any]);
                                                        }
                                                    } finally { setRegeneratingVisuals(false); }
                                                }}
                                                style={{ padding: '4px 12px', background: regeneratingVisuals ? '#E8E8E8' : '#00B7C3', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: regeneratingVisuals ? 'default' : 'pointer' }}>
                                                {regeneratingVisuals ? 'Rendering visuals...' : `Regenerate with visuals (${authoredCount})`}
                                            </button>
                                        );
                                    })()}
                                    <button onClick={(e) => handleExportDeckPPTX({ allGenerations: e.altKey })} title="Exports the latest deck generation. Alt-click to export every generation in this chat." style={{ padding: '4px 12px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>Export Deck PPTX</button>
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

                            {/* Feedback widget (self-improvement loop input - 2026-05-22).
                                Renders under every assistant message so the user can
                                vote, rate, or write feedback. "Apply now" triggers
                                section-targeted regeneration via regenerateWithFeedback.
                                Followed by a GenerationReceipt that shows which skill
                                version and constraints informed this output. */}
                            {msg.role === 'assistant' && !isProcessingPlaceholder(msg.content) && (
                                (() => {
                                    const deliverableType = msgSlides.length > 0
                                        ? 'presentations'
                                        : msgDels.length > 0
                                            ? msgDels[0].type
                                            : msg.skillUsed || 'chat-reply';
                                    const engagementSlug = (
                                        context?.researchGoal || 'default-engagement'
                                    )
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]+/g, '-')
                                        .replace(/^-+|-+$/g, '')
                                        .slice(0, 80) || 'default-engagement';
                                    return (
                                        <>
                                        <FeedbackWidget
                                            engagement_slug={engagementSlug}
                                            deliverable_id={msg.id}
                                            deliverable_type={deliverableType}
                                            skill_version_active={msg.skillUsed || null}
                                            compact
                                            onApplyNow={async ({ feedbackId, text, sectionScope }) => {
                                                try {
                                                    // Heuristic critique deck: feedback drives a REAL revise of the
                                                    // proposed designs (new renders through the Figma partials), not
                                                    // a text re-ask (2026-07-08 owner requirement).
                                                    if (auditReviseHandler && msg.id.startsWith('audit_deck_')) {
                                                        const pendingId = `audit_revise_${Date.now()}`;
                                                        // model MUST ride on the deck message: the artifact-lifting
                                                        // effect stamps slides with msg.model, and the renderer's
                                                        // association filter requires an EXACT model match - a deck
                                                        // without model displays as raw fence text (live 2026-07-08).
                                                        const deckModel = msg.model || 'claude-opus-4-8';
                                                        setMessages(prev => [...prev,
                                                            { id: `u_${Date.now()}`, role: 'user', content: `Revise the proposed designs: ${text}`, timestamp: Date.now() },
                                                            { id: pendingId, role: 'assistant', model: deckModel, content: 'Revising the proposed designs and re-rendering every screen through the design system. About a minute.', timestamp: Date.now() },
                                                        ]);
                                                        try {
                                                            const newDeck = await auditReviseHandler(text);
                                                            setMessages(prev => prev.map(m => m.id === pendingId
                                                                ? { ...m, id: `audit_deck_${Date.now()}`, model: deckModel, content: newDeck, timestamp: Date.now() }
                                                                : m));
                                                        } catch (revErr: any) {
                                                            setMessages(prev => prev.map(m => m.id === pendingId
                                                                ? { ...m, content: `The revise pass failed: ${revErr?.message || revErr}. The prior proposals stand.` }
                                                                : m));
                                                        }
                                                        return;
                                                    }
                                                    // 2026-05-23 - Apply-now must re-fire the ORIGINAL USER PROMPT
                                                    // through the normal chat-send path (handleSend), not call
                                                    // regenerateWithFeedback on the truncated assistant output.
                                                    //
                                                    // Why: the chat-send path is the only one that:
                                                    //   - Re-runs hashtag detection (#proto / #slides / #NU etc.)
                                                    //   - Reloads the right skill manifest for the deliverable type
                                                    //   - Hits the full corpus context loader
                                                    //   - Uses the chat-tier maxOutputTokens (65K on Flash)
                                                    //
                                                    // The previous implementation handed the model the truncated
                                                    // 4-of-20-slides output and asked it to "revise" - which
                                                    // produced the same 4 slides with cosmetic tweaks, never the
                                                    // missing 16.
                                                    //
                                                    // Implementation: walk the messages array backwards from `msg`
                                                    // to find the most-recent user message that triggered it,
                                                    // append the feedback as a postscript, and call handleSend
                                                    // with the augmented prompt. handleSend handles routing,
                                                    // skill matching, and producing a new assistant message.
                                                    const myIndex = messages.findIndex(m => m.id === msg.id);
                                                    let originatingPrompt = '';
                                                    if (myIndex >= 0) {
                                                        for (let i = myIndex - 1; i >= 0; i -= 1) {
                                                            if (messages[i].role === 'user') {
                                                                originatingPrompt = messages[i].content;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (!originatingPrompt) {
                                                        // Defensive fallback - extremely unlikely (every assistant
                                                        // message has an originating user message), but if we hit
                                                        // it we still want to do something useful. Fall back to a
                                                        // generic re-ask that includes the feedback.
                                                        console.warn('[FeedbackWidget.onApplyNow] could not locate originating user message; using feedback-only prompt.');
                                                        originatingPrompt = `Re-attempt the previous deliverable.`;
                                                    }
                                                    // Track regen count so the user can see "Nth attempt" in the
                                                    // GenerationReceipt later. Also so any future heuristic that
                                                    // wants to escalate provider after N attempts has the signal.
                                                    const regenKey = `hic_regen_count_${msg.id}`;
                                                    const priorRegens = parseInt(localStorage.getItem(regenKey) || '0', 10);
                                                    localStorage.setItem(regenKey, String(priorRegens + 1));
                                                    const scopeNote = sectionScope ? ` (specifically the "${sectionScope}" section)` : '';
                                                    const escalationNote = priorRegens >= 1
                                                        ? '\n\nNOTE: This is the user\'s second attempt to refine this output. The previous regeneration did not fully satisfy them. Bias toward MORE completeness, MORE depth, and STRICTER adherence to every requested element.'
                                                        : '';
                                                    // 2026-06-12 - DE-NEST cumulative feedback. The originating
                                                    // user message may itself be a prior regen's augmented prompt;
                                                    // re-appending wholesale stacked duplicate "FEEDBACK FROM LAST
                                                    // ATTEMPT" + "Important:" boilerplate blocks (seen live in the
                                                    // 2026-06-12 chat export: run 3 carried two nested blocks).
                                                    // Extract prior feedback lines, recover the CORE prompt, and
                                                    // re-emit ONE feedback block with the cumulative list - every
                                                    // earlier instruction still applies, stated once.
                                                    const priorFeedback: string[] = [];
                                                    const fbRe = /FEEDBACK FROM LAST ATTEMPT[^\n]*- APPLY ON THIS RUN:\n([\s\S]*?)(?=\n\s*Important:|\n\s*FEEDBACK FROM LAST ATTEMPT|$)/g;
                                                    let fbMatch: RegExpExecArray | null;
                                                    while ((fbMatch = fbRe.exec(originatingPrompt)) !== null) {
                                                        const items = fbMatch[1].split('\n').map(s => s.replace(/^-\s*/, '').trim()).filter(Boolean);
                                                        priorFeedback.push(...items);
                                                    }
                                                    const corePrompt = originatingPrompt.split(/\n+\s*FEEDBACK FROM LAST ATTEMPT/)[0].trim();
                                                    const allFeedback = [...priorFeedback, text.trim()]
                                                        .filter((f, i, arr) => arr.indexOf(f) === i);
                                                    const augmentedPrompt = `${corePrompt}

FEEDBACK FROM LAST ATTEMPT${scopeNote} - APPLY ON THIS RUN:
${allFeedback.map(f => `- ${f}`).join('\n')}

Important: this is a re-attempt of the previous request. Honor every directive in the original prompt (including all hashtag triggers), apply ALL the feedback above, and produce the COMPLETE deliverable - not a partial or truncated one. Do not begin with meta-narration about the feedback.${escalationNote}`;
                                                    // Fire through the normal chat-send path. handleSend appends
                                                    // a user message, calls sendChatMessage, and renders the
                                                    // assistant reply with its FeedbackWidget + GenerationReceipt
                                                    // - exactly like a fresh send.
                                                    await handleSend(augmentedPrompt);
                                                } catch (err) {
                                                    console.warn('[FeedbackWidget.onApplyNow] threw:', err);
                                                }
                                            }}
                                        />
                                        <GenerationReceipt
                                            deliverableType={deliverableType}
                                            deliverableId={msg.id}
                                            engagementSlug={engagementSlug}
                                            skillName={msg.skillUsed || undefined}
                                            priorRunsOfThisType={messages.filter(m => m.role === 'assistant' && (m.skillUsed === msg.skillUsed)).length - 1}
                                            modelUsed={msg.model || null}
                                        />
                                        </>
                                    );
                                })()
                            )}
                        </div>
                    );
                })}

                {(isLoading || imageLoading) && (() => {
                    // 2026-06-12 - show the ROUTED in-flight model (Fable 5
                    // on artifact generations), never the plain-chat default.
                    const liveCfg = AVAILABLE_MODELS.find(m => m.id === (inFlightModelId || selectedModel)) || modelConfig;
                    return (
                        <LoadingIndicator
                            mode={imageLoading ? 'image' : 'reasoning'}
                            modelName={liveCfg?.name || 'AI'}
                            accentColor={liveCfg?.color || '#B8B800'}
                        />
                    );
                })()}
                <div ref={messagesEndRef} />
            </div>

            {/* Dynamic prompt suggestions - persistent above-input variant.
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
                {/* 2026-05-08 - Pending mid-chat attachments. Each chip shows
                    filename + char count and is dismissible before send. On
                    send, attachment text is prepended to the corpus and the
                    list is cleared. */}
                {pendingAttachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {pendingAttachments.map(att => (
                            <div key={att.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: '#0D0D0D', color: '#B8B800',
                                padding: '4px 8px', fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                letterSpacing: 0.5,
                            }}>
                                <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                                <span style={{ color: '#888', fontSize: 9 }}>
                                    {att.slideCount ? `${att.slideCount}sl` : att.pageCount ? `${att.pageCount}p` : `${(att.charCount / 1024).toFixed(1)}KB`}
                                    {att.isImage ? ' · img' : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPendingAttachments(prev => prev.filter(a => a.id !== att.id))}
                                    aria-label={`Remove ${att.filename}`}
                                    style={{
                                        background: 'transparent', border: 'none',
                                        color: '#CC6644', cursor: 'pointer',
                                        fontSize: 12, lineHeight: 1, padding: 0,
                                    }}
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}
                <EnhancePreview handle={enhancer} accentColor="#00B7C3" />
                {/* WS-6: contextual next-step chips (PDF item 1). Prefill the input so
                    the user edits before sending - nothing fires behind their back. */}
                {!isLoading && (() => {
                    const hasDeck = slides.some(s => s.status === 'draft');
                    const live: any = getContext ? getContext() : context;
                    const hasCorpus = !!(live?.corpusText && String(live.corpusText).length > 500);
                    const chips: string[] = [];
                    if (hasCorpus && !hasDeck) chips.push('Draft the slide narrative from this research');
                    if (hasDeck) chips.push('Draft a client follow-up email from this deck', 'Make the deck more concise');
                    if (!chips.length) return null;
                    return (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            {chips.map(c => (
                                <button key={c} onClick={() => { setInput(c); setTimeout(() => inputRef.current?.focus(), 0); }}
                                    style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', padding: '3px 10px', background: '#F5F3EA', color: '#33332E', border: '1px solid #E4E4DC', borderRadius: 2, cursor: 'pointer' }}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    );
                })()}
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    {/* Paperclip + drag-drop dropzone (shared component) */}
                    <ChatAttachmentDropzone
                        onAttachmentsAdded={atts => setPendingAttachments(prev => [...prev, ...atts])}
                        dropTargetRef={panelRef}
                        disabled={isLoading}
                        variant="both"
                        accentColor="#B8B800"
                    />
                    <div style={{ flex: 1, position: 'relative' }}>
                        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                            placeholder="Ask about your research data... Try #help for all hashtag directives."
                            rows={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', fontSize: 12, fontFamily: "'Archivo', sans-serif", resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box', minHeight: 88 }} />
                        <HashtagAutocomplete
                            input={input}
                            inputRef={inputRef}
                            onPickDirective={(suffix) => {
                                // Replace the partial #token at the cursor with the suggested directive token + a trailing space.
                                const el = inputRef.current;
                                if (!el) return;
                                const cursor = el.selectionStart;
                                const before = input.slice(0, cursor);
                                const after = input.slice(cursor);
                                const m = before.match(/#[a-zA-Z0-9_-]*$/);
                                const replacedBefore = m ? before.slice(0, m.index) : before;
                                const newVal = replacedBefore + suffix + ' ' + after;
                                setInput(newVal);
                                requestAnimationFrame(() => {
                                    el.focus();
                                    const newCursor = (replacedBefore + suffix + ' ').length;
                                    try { el.setSelectionRange(newCursor, newCursor); } catch {}
                                });
                            }}
                        />
                    </div>
                    <EnhanceButton handle={enhancer} accentColor="#00B7C3" disabled={isLoading} />
                    <button
                        onClick={() => handleSend()}
                        disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                        title={pipelineActive ? 'Collection is still running. Chat answers from the wiki (all prior corpora) plus sources already collected this run (green chips). The current run’s corpus is still growing, so answers improve as more sources land.' : undefined}
                        style={{
                            padding: '0 14px',
                            background: isLoading ? '#CCC' : '#B8B800',
                            color: '#0D0D0D',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            cursor: isLoading ? 'default' : 'pointer',
                        }}
                    >Send</button>
                    {pipelineActive && (
                        <div style={{
                            position: 'absolute',
                            bottom: -22,
                            right: 0,
                            fontSize: 9,
                            color: '#115054',
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: 0.3,
                        }}>
                            COLLECTING {String.fromCharCode(0x00B7)} CHAT LIVE ON WIKI + SOURCES COLLECTED SO FAR
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 8, color: '#AAA', marginTop: 4 }}>
                    Shift+Enter for new line | Enhance rewrites your prompt via Gemini Flash | Auto: Flash for chat, Opus 4.8 for # artifacts
                    {skillManifest.length > 0 && ` | ${skillManifest.filter(s => s.category === 'research-deliverable').length} skills`}
                    {' | '}
                    <span
                        style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => { setInput('#help'); inputRef.current?.focus(); }}
                    >
                        #help
                    </span> for hashtag guide
                </div>
            </div>

            {/* Source Coverage audit panel - slide-in diagnostic showing every
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
