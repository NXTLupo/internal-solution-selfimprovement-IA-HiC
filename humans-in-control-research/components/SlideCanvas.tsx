/**
 * SlideCanvas - Template dispatcher + UI chrome.
 *
 * Each slide picks one of 10 NXT Humans templates. The web canvas always
 * renders at 960x540 internally and uses CSS transform: scale() to fit any
 * viewport. The PPTX export uses the same data + matching layout math, so
 * the export is pixel-equivalent to the preview.
 */

import React, { useState, useRef } from 'react';
import { NxtBlockRenderer, type NxtBlock } from './NxtOutputRenderer';
import {
    CaseStudySlide, ServiceBlueprintSlide, JourneyMapSlide, OrgChartSlide, ExecutiveBriefSlide,
    SectionDividerFullBleed, JourneyBriefSlide, SlideShell,
} from './slideTemplates/web';
// 2026-06-11 (task #32) - the remaining 15 preview renderers moved onto the
// GoldFrame chrome (goldPreviews.tsx), each the half-scale twin of its
// 1920x1080 stage renderer, so preview = Figma = PPTX for every template.
import {
    PersonaCardSlide, RecommendationSlide, ThemeClusterSlide,
    ThemeSpotlightSlide, ThemeArcSlide, ThemeMosaicSlide,
    ThemeOverviewSlide, ThemeDetailSlide,
    CompetitiveMatrixSlide, BlockQuoteSlide, PrinciplesSlide,
    StatRowSlide, TimelineSlide, GapMatrixSlide, ArchitectureMapSlide,
    PrdFeatureSlide, SystemsInventorySlide,
} from './slideTemplates/goldPreviews';
import type { JourneyBrief } from '../services/journeyBriefExporter';
import { exportSlideToPPTX } from './slideTemplates/pptx';
import { TOKENS } from './slideTemplates/types';
import { getBrand, type BrandId } from './slideTemplates/brands';
// 1:1 PREVIEW (2026-06-15): the preview renders the EXACT export stage HTML
// (slideToStageHtml, the same 1920x1080 doc Playwright rasterizes for the native
// editable PPTX) inside a style-isolated iframe scaled to the card. One renderer
// feeds BOTH surfaces, so preview == export pixel-for-pixel and the GOLD preview
// re-implementation (goldPreviews) can never drift/clamp away from the export
// again. The renderTemplate() React path is kept ONLY as a fallback if stage HTML
// generation throws. Export pipeline is unchanged (still native + editable).
import { slideDataToStageHtml } from '../services/slideToStageHtml';
import type {
    SlideTemplate, PersonaCardData, RecommendationData, ThemeClusterData,
    CompetitiveMatrixData, BlockQuoteData, CaseStudyData, PrinciplesData,
    StatRowData, TimelineData, SectionDividerData,
    ServiceBlueprintData, JourneyMapData, GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
    OrgChartData, ExecutiveBriefData,
} from './slideTemplates/types';

export interface SlideData {
    id: string;
    template: SlideTemplate;
    /** Underscore-prefixed validator telemetry (evidence-gap audit). NOT rendered
     *  - the visible `evidenceGap` field stays unset so no badge ships. Carried so
     *  the chat composer can attach audit data without a tsc excess-property error. */
    _evidenceGap?: { summary?: string; issues?: any[] };
    /** Visual brand: 'nxt' (default) or 'nu' (Northeastern). Set by hashtag detection in the parser. */
    brand?: BrandId;
    /** SLIDES-deck archetype (template=slides:*) raw payload, handed to composeSlide untouched. */
    composerPayload?: any;
    /** Universal density axis (2026-06-10). 'dense' raises every template's
     *  item ceilings per types.ts DENSITY_SPEC and renderers adapt type size
     *  to the actual item count. Set by the model (fence attr density=dense or
     *  JSON "density") when the request warrants a denser artifact, or forced
     *  by the #dense hashtag. */
    density?: 'base' | 'dense';
    title: string;
    subtitle?: string;
    sources?: string[];
    imageUrl?: string;
    imagePrompt?: string;
    // Template-specific data - populated based on `template`
    persona?: PersonaCardData;
    recommendation?: RecommendationData;
    themeCluster?: ThemeClusterData;
    matrix?: CompetitiveMatrixData;
    quote?: BlockQuoteData;
    caseStudy?: CaseStudyData;
    principles?: PrinciplesData;
    statRow?: StatRowData;
    timeline?: TimelineData;
    sectionDivider?: SectionDividerData;
    serviceBlueprint?: ServiceBlueprintData;
    journeyMap?: JourneyMapData;
    orgChart?: OrgChartData;
    executiveBrief?: ExecutiveBriefData;
    gapMatrix?: GapMatrixData;
    architectureMap?: ArchitectureMapData;
    prdFeature?: PrdFeatureData;
    systemsInventory?: SystemsInventoryData;
    journeyBrief?: JourneyBrief;
    // Legacy/fallback fields (used when template doesn't fit any of the 15)
    body?: string;
    bullets?: string[];
    blocks?: NxtBlock[];
    /** Post-parse validator output - populated when the slide violates one
     *  of the corpus-meta-commentary, empty-quote, or subject-reference
     *  rules. Renderer surfaces this as an EVIDENCE GAP badge. */
    evidenceGap?: {
        summary: string;
        issues: Array<{ field: string; reason: string; matched?: string; severity: 'gap' | 'warning' }>;
    };
    // Status
    status: 'draft' | 'approved' | 'rejected';
    model?: string;
    timestamp: number;
}

interface Props {
    slide: SlideData;
    onApprove: (slide: SlideData) => void;
    onReject: (slide: SlideData) => void;
    onGenerateVisual: (slide: SlideData, prompt: string) => void;
    onEditTitle: (slide: SlideData, newTitle: string) => void;
    isGeneratingVisual?: boolean;
}

const SLIDE_W = TOKENS.WEB_W;
const SLIDE_H = TOKENS.WEB_H;
// The export stage is a fixed 1920x1080 doc; the preview iframe renders it at
// SLIDE_W/STAGE_W (= 0.5) so the card is a true scaled mirror of the export.
const STAGE_W = 1920;
const STAGE_H = 1080;

function renderTemplate(slide: SlideData, isGenerating: boolean): React.ReactNode {
    const sources = slide.sources || [];
    const brand = getBrand(slide.brand);
    switch (slide.template) {
        case 'section-divider':
            return slide.sectionDivider ? <SectionDividerFullBleed data={slide.sectionDivider} brand={brand} /> : null;
        case 'persona-card':
            return slide.persona ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <PersonaCardSlide data={slide.persona} sources={sources} hasImage={!!slide.imageUrl} imageUrl={slide.imageUrl} density={slide.density} brand={brand} />
                    {isGenerating && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 4 }}><GeneratingOverlay /></div>}
                </div>
            ) : null;
        case 'recommendation':
            return slide.recommendation ? (
                <RecommendationSlide title={slide.title} density={slide.density} data={slide.recommendation} sources={sources} brand={brand} />
            ) : null;
        case 'theme-overview':
            return slide.themeCluster ? (
                <ThemeOverviewSlide title={slide.title} density={slide.density} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        case 'theme-detail':
            return slide.themeCluster ? (
                <ThemeDetailSlide title={slide.title} density={slide.density} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        // theme-cluster/theme-spotlight have NO Figma component (2026-06-23 audit); they ALIAS to
        // the Figma-faithful overview/detail twins so legacy emissions still render on-canon.
        case 'theme-cluster':
            return slide.themeCluster ? (
                <ThemeOverviewSlide title={slide.title} density={slide.density} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        case 'theme-spotlight':
            return slide.themeCluster ? (
                <ThemeDetailSlide title={slide.title} density={slide.density} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        case 'theme-arc':
            return slide.themeCluster ? (
                <ThemeArcSlide title={slide.title} density={slide.density} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        case 'theme-mosaic':
            return slide.themeCluster ? (
                <ThemeMosaicSlide title={slide.title} data={slide.themeCluster} sources={sources} brand={brand} />
            ) : null;
        case 'competitive-matrix':
            return slide.matrix ? (
                <CompetitiveMatrixSlide title={slide.title} density={slide.density} data={slide.matrix} sources={sources} brand={brand} />
            ) : null;
        case 'block-quote':
            return slide.quote ? (
                <BlockQuoteSlide density={slide.density} data={slide.quote} sources={sources} brand={brand} />
            ) : null;
        case 'case-study':
            // 2026-06-10 - CaseStudySlide renders the full-canvas GOLD frame
            // (rail + dot mark + masthead + takeaway band) itself; wrapping it
            // in the legacy SlideShell would double the chrome.
            return slide.caseStudy ? (
                <CaseStudySlide title={slide.title} density={slide.density} data={slide.caseStudy} sources={sources} brand={brand} />
            ) : null;
        case 'principles':
            return slide.principles ? (
                <PrinciplesSlide title={slide.title} density={slide.density} data={slide.principles} sources={sources} brand={brand} />
            ) : null;
        case 'stat-row':
            return slide.statRow ? (
                <StatRowSlide title={slide.title} density={slide.density} data={slide.statRow} sources={sources} brand={brand} />
            ) : null;
        case 'timeline':
            return slide.timeline ? (
                <TimelineSlide title={slide.title} density={slide.density} data={slide.timeline} sources={sources} brand={brand} />
            ) : null;
        case 'service-blueprint':
            // 2026-06-11 - GOLD uplift: ServiceBlueprintSlide now renders the
            // full-canvas GoldFrame itself (rail + dot mark + kicker + takeaway
            // band); wrapping in SlideShell would double the chrome.
            return slide.serviceBlueprint ? (
                <ServiceBlueprintSlide title={slide.title} density={slide.density} data={slide.serviceBlueprint} sources={sources} brand={brand} />
            ) : null;
        case 'journey-map':
            // GOLD actor-lane journey matrix - renders its own GoldFrame chrome.
            return slide.journeyMap ? (
                <JourneyMapSlide title={slide.title} density={slide.density} data={slide.journeyMap} sources={sources} brand={brand} />
            ) : null;
        case 'org-chart':
            // GOLD reporting-tier org matrix - renders its own GoldFrame chrome.
            return slide.orgChart ? (
                <OrgChartSlide title={slide.title} density={slide.density} data={slide.orgChart} sources={sources} brand={brand} />
            ) : null;
        case 'executive-brief':
            // GOLD #brief/#explainer/#report slide twin - renders its own GoldFrame chrome.
            return slide.executiveBrief ? (
                <ExecutiveBriefSlide title={slide.title} density={slide.density} data={slide.executiveBrief} sources={sources} brand={brand} />
            ) : null;
        case 'gap-matrix':
            return slide.gapMatrix ? (
                <GapMatrixSlide title={slide.title} density={slide.density} data={slide.gapMatrix} sources={sources} brand={brand} />
            ) : null;
        case 'architecture-map':
            return slide.architectureMap ? (
                <ArchitectureMapSlide title={slide.title} data={slide.architectureMap} sources={sources} brand={brand} />
            ) : null;
        case 'prd-feature':
            return slide.prdFeature ? (
                <PrdFeatureSlide title={slide.title} data={slide.prdFeature} sources={sources} brand={brand} />
            ) : null;
        case 'systems-inventory':
            return slide.systemsInventory ? (
                <SystemsInventorySlide title={slide.title} density={slide.density} data={slide.systemsInventory} sources={sources} brand={brand} />
            ) : null;
        case 'journey-brief':
            return slide.journeyBrief ? (
                <SlideShell brand={brand}><JourneyBriefSlide title={slide.title} data={slide.journeyBrief} sources={sources} brand={brand} /></SlideShell>
            ) : null;
        default:
            return null;
    }
}

const GeneratingOverlay: React.FC = () => (
    <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'rgba(17,80,84,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(202,202,32,0.3)', borderTopColor: '#caca20', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '4px', textTransform: 'uppercase', color: '#caca20' }}>GENERATING VISUAL</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

export const SlideCanvas: React.FC<Props> = ({
    slide, onApprove, onReject, onGenerateVisual, onEditTitle, isGeneratingVisual,
}) => {
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(slide.title);
    const [fullscreen, setFullscreen] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [showPromptInput, setShowPromptInput] = useState(false);
    const [exporting, setExporting] = useState(false);
    const slideRef = useRef<HTMLDivElement>(null);

    const statusColor = slide.status === 'approved' ? '#4CAF50' : slide.status === 'rejected' ? '#CC3333' : '#B8B800';
    const allowsImage = slide.template === 'persona-card';

    // 1:1 stage HTML for this slide - the SAME doc the export rasterizes. Memoized
    // so the iframe only re-renders when the slide changes. Falls back to the React
    // template renderer only if stage generation throws (defensive, never silent).
    const stageHtml = React.useMemo(() => {
        try { return slideDataToStageHtml(slide as any); } catch (e) { console.warn('[SlideCanvas] stage HTML failed; falling back to React preview:', e); return ''; }
    }, [slide]);

    const slideInternals = (
        <div ref={slideRef} style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', background: '#FFFFFF' }}>
            {stageHtml ? (
                <iframe
                    title={`${slide.template} preview`}
                    srcDoc={stageHtml}
                    scrolling="no"
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ width: STAGE_W, height: STAGE_H, border: 0, transform: `scale(${SLIDE_W / STAGE_W})`, transformOrigin: 'top left', pointerEvents: 'none', display: 'block' }}
                />
            ) : renderTemplate(slide, !!isGeneratingVisual)}
            {/* Persona image-generation overlay (iframe path: shown at card level) */}
            {isGeneratingVisual && slide.template === 'persona-card' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 4 }}><GeneratingOverlay /></div>
            )}
            {/* Status badge */}
            {slide.status !== 'draft' && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: 700, letterSpacing: '1px', padding: '2px 8px', background: statusColor, color: '#FFFFFF', zIndex: 3 }}>
                    {slide.status.toUpperCase()}
                </div>
            )}
            {/* Edit-title overlay (click title area while draft) */}
            {editingTitle && slide.status === 'draft' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.96)', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                        onBlur={() => { onEditTitle(slide, titleDraft); setEditingTitle(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { onEditTitle(slide, titleDraft); setEditingTitle(false); } }}
                        autoFocus style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 28, color: '#141414', border: 'none', borderBottom: '3px solid #caca20', outline: 'none', background: 'transparent', width: '100%' }} />
                </div>
            )}
        </div>
    );

    const legacyPptxArgs = () => ({
                template: slide.template,
                title: slide.title,
                sources: slide.sources,
                imageUrl: slide.imageUrl,
                brand: getBrand(slide.brand),
                persona: slide.persona,
                recommendation: slide.recommendation,
                themeCluster: slide.themeCluster,
                matrix: slide.matrix,
                quote: slide.quote,
                caseStudy: slide.caseStudy,
                principles: slide.principles,
                statRow: slide.statRow,
                timeline: slide.timeline,
                sectionDivider: slide.sectionDivider,
                serviceBlueprint: slide.serviceBlueprint,
                journeyMap: slide.journeyMap,
                orgChart: slide.orgChart,
                executiveBrief: slide.executiveBrief,
                gapMatrix: slide.gapMatrix,
                architectureMap: slide.architectureMap,
                prdFeature: slide.prdFeature,
                systemsInventory: slide.systemsInventory,
    });

    // 1:1 EXPORT (2026-05-29): PRIMARY path walks the ACTUAL rendered slide DOM
    // (the same web.tsx render the user previews) via the shared DOM-walker and
    // emits EDITABLE PPTX - so preview and export are produced from one engine
    // reading one geometry. The legacy template renderer (pptx.ts) is kept as an
    // error-only FALLBACK, so if the walker ever fails the behavior is unchanged
    // (no regression). Clone off-screen at natural 960x540 with NO transform
    // because the preview applies CSS scale() that would skew captured rects.
    const handleExportPPTX = async () => {
        setExporting(true);
        // 2026-06-11 - ONE-ENGINE REWIRE. PRIMARY path is now the same gold
        // stage pipeline the deck export uses: emit a fresh 1920x1080 #stage
        // from SlideData via slideDataToStageHtml and ship through
        // /api/gold/export-pptx (Playwright + native shapes + embedded brand
        // fonts). The DOM-walker (/api/export-pptx) is demoted to fallback:
        // walking the 960x540 preview captured stale CSS-variable fonts
        // (Spectral) and rgba washes that the inverted alpha pipeline rendered
        // as near-solid accent fills (the 2026-06-11 service-blueprint.pptx
        // failure). Degradations are logged loudly, never silent.
        try {
            const { slideDataToStageHtml } = await import('../services/slideToStageHtml');
            const { exportGoldPptx } = await import('../services/goldArtifact');
            const stageHtml = slideDataToStageHtml(slide as any);
            await exportGoldPptx(stageHtml, `${slide.template}.pptx`);
            setExporting(false);
            return;
        } catch (goldErr: any) {
            console.error(`[slide-export] gold stage export failed (${goldErr?.message || goldErr}); falling back to DOM-walker`, goldErr);
        }
        try {
            const el = slideRef.current;
            if (!el) throw new Error('slideRef missing');
            const clone = el.cloneNode(true) as HTMLElement;
            Object.assign(clone.style, {
                position: 'fixed', left: '-99999px', top: '0',
                width: SLIDE_W + 'px', height: SLIDE_H + 'px',
                transform: 'none', transformOrigin: 'top left',
                zoom: '1', zIndex: '-1', margin: '0',
            } as Partial<CSSStyleDeclaration>);
            document.body.appendChild(clone);
            try {
                await (document as any).fonts?.ready;
                await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
                const rect = clone.getBoundingClientRect();
                const { walkDocumentToSpecs } = await import('../design-desk/services/domToPptx');
                const { toPng } = await import('html-to-image');
                const specs = await walkDocumentToSpecs(clone, {
                    entrypoint: clone,
                    originX: rect.left,
                    originY: rect.top,
                    sourceWidthPx: rect.width || SLIDE_W,
                    rasterizeElement: async (node: HTMLElement) => {
                        try { return await toPng(node, { pixelRatio: 2, cacheBust: true, skipFonts: false }); }
                        catch { return null; }
                    },
                });
                if (!specs.length) throw new Error('DOM-walker produced 0 specs');
                const resp = await fetch('http://127.0.0.1:5012/api/export-pptx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ specs, filename: `${slide.template}.pptx` }),
                    signal: AbortSignal.timeout(60_000),
                });
                if (!resp.ok) throw new Error(`export-pptx HTTP ${resp.status}`);
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${slide.template}.pptx`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } finally {
                clone.remove();
            }
        } catch (e) {
            console.warn('[SlideCanvas] DOM-walker PPTX failed; using legacy template renderer (no regression):', e);
            try { await exportSlideToPPTX(legacyPptxArgs() as any); }
            catch (e2) { console.error('PPTX export failed (both paths):', e2); }
        }
        setExporting(false);
    };

    /**
     * html2canvas reads bounding rects that include the preview's CSS `transform: scale()`,
     * which collapses flex children to the same position and jumbles the output. We work
     * around it by cloning the slide into an off-screen container rendered at the natural
     * 960×540 with NO transform, capturing that, then cleaning up.
     */
    // 1:1 capture (2026-06-15): rasterize the SAME stage HTML the export uses by
    // rendering it in an off-screen 1920x1080 iframe (style-isolated, full font +
    // CSS fidelity), then html2canvas the iframe's #stage. This keeps PNG/PDF
    // pixel-identical to both the preview iframe and the PPTX export.
    const captureSlideAtNaturalSize = async (): Promise<HTMLCanvasElement | null> => {
        const html = stageHtml || (() => { try { return slideDataToStageHtml(slide as any); } catch { return ''; } })();
        if (!html) return null;
        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'fixed', left: '-99999px', top: '0',
            width: STAGE_W + 'px', height: STAGE_H + 'px', border: '0', zIndex: '-1',
        } as Partial<CSSStyleDeclaration>);
        document.body.appendChild(iframe);
        try {
            await new Promise<void>((resolve) => {
                let done = false;
                const finish = () => { if (!done) { done = true; resolve(); } };
                iframe.addEventListener('load', () => finish());
                iframe.srcdoc = html;
                setTimeout(finish, 2000); // safety: never hang the export
            });
            const doc = iframe.contentDocument;
            if (!doc) return null;
            try { await (doc as any).fonts?.ready; } catch {}
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
            const stageEl = (doc.getElementById('stage') || doc.body) as HTMLElement;
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(stageEl, {
                scale: 2,
                backgroundColor: '#FFFFFF',
                useCORS: true,
                width: STAGE_W,
                height: STAGE_H,
                windowWidth: STAGE_W,
                windowHeight: STAGE_H,
                logging: false,
            });
            return canvas;
        } finally {
            iframe.remove();
        }
    };

    const fileBase = () => slide.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_') || 'slide';

    const handleExportPNG = async () => {
        setExporting(true);
        try {
            const canvas = await captureSlideAtNaturalSize();
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `${fileBase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) { console.error('PNG export failed:', e); }
        setExporting(false);
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const canvas = await captureSlideAtNaturalSize();
            if (!canvas) return;
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 13.33, 7.5);
            pdf.save(`${fileBase()}.pdf`);
        } catch (e) { console.error('PDF export failed:', e); }
        setExporting(false);
    };

    return (
        <div style={{ margin: '12px 0' }}>
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>{slide.template.replace('-', ' ')}</span>
                {slide.model && <span style={{ fontSize: 9, color: '#999' }}>via {slide.model}</span>}
                {/* evidenceGap badge intentionally suppressed - delivered output must never expose
                    QA-style annotations to the reader (per user directive 2026-05-05). The validator
                    still computes slide._evidenceGap for ops telemetry; it just isn't rendered. */}
                <div style={{ flex: 1 }} />
                {slide.status === 'draft' && (
                    <button onClick={() => setEditingTitle(true)} style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>EDIT TITLE</button>
                )}
                <button onClick={() => setFullscreen(!fullscreen)} style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>
                    {fullscreen ? 'MINIMIZE' : 'EXPAND'}
                </button>
            </div>
            {/* evidenceGap detail bar intentionally suppressed - delivered output must never expose
                QA-style annotations to the reader (per user directive 2026-05-05). */}

            {/* Slide - scaled to fit container via CSS transform */}
            {fullscreen ? (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: SLIDE_W, height: SLIDE_H,
                        transform: `scale(${Math.min((window.innerWidth - 80) / SLIDE_W, (window.innerHeight - 80) / SLIDE_H)})`,
                        transformOrigin: 'center center',
                    }}>
                        {slideInternals}
                    </div>
                    <button onClick={() => setFullscreen(false)} style={{ position: 'absolute', top: 16, right: 16, background: '#0D0D0D', color: '#FFFFFF', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>CLOSE</button>
                </div>
            ) : (() => {
                const scale = Math.min(420 / SLIDE_W, 1);
                const visibleH = SLIDE_H * scale;
                return (
                    <div style={{ width: '100%', height: visibleH, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            width: SLIDE_W, height: SLIDE_H,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            position: 'absolute', top: 0, left: 0,
                        }}>
                            {slideInternals}
                        </div>
                    </div>
                );
            })()}

            {/* Action bar */}
            <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid #E8E8E8', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {slide.status === 'draft' && (
                    <button onClick={() => onApprove(slide)} style={{ padding: '6px 16px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Approve</button>
                )}
                {allowsImage && slide.status === 'draft' && (
                    <button onClick={() => setShowPromptInput(!showPromptInput)} disabled={isGeneratingVisual}
                        style={{ padding: '6px 16px', background: isGeneratingVisual ? '#E8E8E8' : '#0D0D0D', color: isGeneratingVisual ? '#999' : '#FFF', border: 'none', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: isGeneratingVisual ? 'default' : 'pointer' }}>
                        {isGeneratingVisual ? 'GENERATING...' : slide.imageUrl ? 'CHANGE VISUAL' : 'ADD VISUAL'}
                    </button>
                )}
                <button onClick={handleExportPPTX} disabled={exporting} style={{ padding: '6px 16px', background: 'none', color: '#141414', border: '1px solid #141414', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>{exporting ? 'EXPORTING...' : 'PPTX'}</button>
                <button onClick={handleExportPDF} disabled={exporting} style={{ padding: '6px 16px', background: 'none', color: '#141414', border: '1px solid #141414', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>PDF</button>
                <button onClick={handleExportPNG} disabled={exporting} style={{ padding: '6px 16px', background: 'none', color: '#141414', border: '1px solid #141414', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>PNG</button>
                {slide.status === 'draft' && (
                    <button onClick={() => onReject(slide)} style={{ padding: '6px 16px', background: 'none', color: '#CC3333', border: '1px solid #CC3333', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Reject</button>
                )}
            </div>
            {/* Image-prompt input panel (persona only) */}
            {showPromptInput && allowsImage && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && imagePrompt.trim()) { onGenerateVisual(slide, imagePrompt.trim()); setShowPromptInput(false); } }}
                        placeholder="Portrait description (e.g., 'mid-40s woman, navy blazer, studio backdrop')"
                        autoFocus style={{ flex: 1, padding: '8px 12px', border: '1px solid #E0E0E0', fontSize: 11, fontFamily: "'Archivo', sans-serif", outline: 'none' }} />
                    <button onClick={() => { if (imagePrompt.trim()) { onGenerateVisual(slide, imagePrompt.trim()); setShowPromptInput(false); } }}
                        disabled={!imagePrompt.trim() || isGeneratingVisual}
                        style={{ padding: '0 16px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Generate</button>
                </div>
            )}
        </div>
    );
};

export default SlideCanvas;
