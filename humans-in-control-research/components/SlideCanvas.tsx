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
import { slideDataToStageHtml, type DeckPosition } from '../services/slideToStageHtml';
import { DeckPositionContext } from './slideTemplates/web';
import { USER_IMAGE_SLOTS, suggestPrompt } from '../services/userImagery';
// WS-4 inline text editing (2026-08-14, v2 program; owner UX revision same day:
// TRUE inline, no card flip). Clicking text on the preview matches it back to
// its payload field; a toolbar offers the editable text + AI suggestions;
// edits apply immutably with history through the one edit contract.
import { matchFieldByText, suggestFieldRewrites, applyTextEdits, undoLastTextEdit, stripCitationArtifacts, mergeEditPreservingCitations, type TextFieldRef } from '../services/slideTextEditing';
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
    /** Visual brand id: 'nxt' (default), 'nu' (Northeastern, #NU) or 'deciem' (The Abnormal Beauty
     *  Company, #deciem). Set by hashtag detection in the parser; resolved to its token set via
     *  getBrand() so every template renderer switches on the id, never on a font or hex. */
    brand?: BrandId;
    /** SLIDES-deck archetype (template=slides:*) raw payload, handed to composeSlide untouched. */
    composerPayload?: any;
    /** WS-4 (2026-08-14): undo ring for inline text edits - pre-edit values per batch. Never rendered. */
    _textHistory?: Array<{ at: number; edits: Array<{ path: string; prev: string }> }>;
    /** WS-4: user lock - deck-wide AI passes (visual fill, rewrite passes, chat edits) must skip this slide. */
    _locked?: boolean;
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
    /** D17: full-bleed native GOLD exhibit image (data URI / URL) for journey/arch/mindmap/blueprint
     *  slides. When set, slideDataToStageHtml renders it wall-to-wall (else the native matrix). */
    diagramImage?: string;
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

/**
 * The chat card's slide box. 2026-10-03 live: the old fixed 420px scale clipped the right edge whenever the chat
 * column (or a short reply's shrink-wrapped bubble) was narrower than 420px. The box measures its own width and
 * scales the stage to whichever is smaller, the box or 420px, so the whole slide is always visible.
 */
const ScaledSlideBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [boxW, setBoxW] = React.useState(420);
    React.useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => { const w = entries[0]?.contentRect?.width; if (w && w > 0) setBoxW(w); });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const scale = Math.min(Math.min(boxW, 420) / SLIDE_W, 1);
    return (
        <div ref={ref} style={{ width: '100%', height: SLIDE_H * scale, position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                {children}
            </div>
        </div>
    );
};

interface Props {
    slide: SlideData;
    /** Round 2 (2026-10-01): the slide's 0-based position in its deck and the count of section dividers
     *  before it. Drives the DECIEM body-art rotation and divider pop-fill ordinal; the export loop
     *  passes the same positions so preview == export. Optional: absent -> title-hash picks. */
    deckIndex?: number;
    dividerOrdinal?: number;
    onApprove: (slide: SlideData) => void;
    onReject: (slide: SlideData) => void;
    onGenerateVisual: (slide: SlideData, prompt: string) => void;
    onEditTitle: (slide: SlideData, newTitle: string) => void;
    isGeneratingVisual?: boolean;
    /** USER-DIRECTED IMAGERY (2026-08-14 pivot): persist a per-slot visual spec
     *  ({prompt, style}) onto the slide's composer payload. Present only on
     *  slides:* archetype cards rendered in the chat desks. */
    onAuthorImagery?: (slide: SlideData, slotField: string, spec: { prompt: string; style: 'illustration' | 'infographic' | 'realistic'; authoredAt: number }) => void;
    /** slot keys (`slideId:field`) currently generating - drives the in-slot progress overlay. */
    generatingSlotKeys?: string[];
    /** WS-4 (2026-08-14): replace this slide with an edited version (text edits, undo, lock).
     *  The panel swaps the slide in its state; the preview re-renders from the new payload. */
    onUpdateSlide?: (updated: SlideData) => void;
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
    slide, onApprove, onReject, onGenerateVisual, onEditTitle, isGeneratingVisual, onAuthorImagery, generatingSlotKeys, onUpdateSlide,
    deckIndex, dividerOrdinal,
}) => {
    // Round 2: the deck position rides into EVERY stage render of this card (preview iframe, PNG
    // capture, single-slide export) and into the React fallback via DeckPositionContext.
    const deckPos: DeckPosition = React.useMemo(() => ({ deckIndex, dividerOrdinal }), [deckIndex, dividerOrdinal]);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(slide.title);
    // WS-4 inline text editing (owner UX 2026-08-14: TYPE IN PLACE). Clicking a
    // text element makes THAT element contenteditable inside the preview, in the
    // slide's own typography; the toolbar under the slide carries only the AI
    // suggestions + apply/cancel. Commit strips composer-baked chrome ("01: ")
    // captured at edit start, so numbering never doubles into the payload.
    const [inlineEdit, setInlineEdit] = useState<{ path: string; label: string; value: string; storedValue: string; prefix: string; suffix: string } | null>(null);
    const [inlineSuggestions, setInlineSuggestions] = useState<string[]>([]);
    const [inlineSuggestionsLoading, setInlineSuggestionsLoading] = useState(false);
    const previewFrameRef = useRef<HTMLIFrameElement>(null);
    const clickedElRef = useRef<HTMLElement | null>(null);
    const originalRenderedRef = useRef('');
    const inlineEditRef = useRef<{ path: string; label: string; value: string; storedValue: string; prefix: string; suffix: string } | null>(null);
    inlineEditRef.current = inlineEdit;
    const textEditable = slide.status === 'draft' && !!onUpdateSlide;

    const teardownInlineEdit = () => {
        const el = clickedElRef.current;
        if (el) { try { el.contentEditable = 'false'; el.style.outline = ''; } catch { /* element may be gone */ } }
        clickedElRef.current = null;
        setInlineEdit(null);
        setInlineSuggestions([]);
    };

    const cancelInlineEdit = () => {
        const el = clickedElRef.current;
        if (el) { try { el.textContent = originalRenderedRef.current; } catch { /* gone */ } }
        teardownInlineEdit();
    };

    const commitInlineEdit = () => {
        const edit = inlineEditRef.current;
        const el = clickedElRef.current;
        if (!edit || !el || !onUpdateSlide) { teardownInlineEdit(); return; }
        let text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const pfx = edit.prefix.replace(/\s+/g, ' ');
        const sfx = edit.suffix.replace(/\s+/g, ' ');
        if (pfx && text.toLowerCase().startsWith(pfx.trimStart().toLowerCase())) text = text.slice(pfx.trimStart().length).trim();
        if (sfx && text.toLowerCase().endsWith(sfx.trimEnd().toLowerCase())) text = text.slice(0, text.length - sfx.trimEnd().length).trim();
        // edit.value is the CLEAN text; the stored field may carry citation
        // pointers - re-attach them so an inline edit never destroys provenance.
        if (text && text.toLowerCase() !== edit.value.replace(/\s+/g, ' ').trim().toLowerCase()) {
            onUpdateSlide(applyTextEdits(slide, [{ path: edit.path, value: mergeEditPreservingCitations(edit.storedValue, text) }]));
        }
        teardownInlineEdit();
    };

    const beginInlineEdit = (field: TextFieldRef, el: HTMLElement) => {
        // switching targets mid-edit keeps what was typed: commit, then retarget
        if (clickedElRef.current && clickedElRef.current !== el) commitInlineEdit();
        clickedElRef.current = el;
        const rendered = el.textContent || '';
        originalRenderedRef.current = rendered;
        // compare CLEAN values: the stored field may carry pointer markers the
        // rendered element does not show (and vice versa: resolved source lines)
        const cleanValue = stripCitationArtifacts(field.value);
        const idx = rendered.toLowerCase().indexOf(cleanValue.toLowerCase());
        const prefix = idx > 0 ? rendered.slice(0, idx) : '';
        const suffix = idx >= 0 ? rendered.slice(idx + cleanValue.length) : '';
        setInlineEdit({ path: field.path, label: field.label, value: cleanValue, storedValue: field.value, prefix, suffix });
        el.contentEditable = 'true';
        el.style.outline = '3px solid #caca20';
        el.style.outlineOffset = '2px';
        // property assignment (not addEventListener) so a re-begin never stacks handlers
        (el as any).onkeydown = (ke: KeyboardEvent) => {
            if (ke.key === 'Enter' && !ke.shiftKey) { ke.preventDefault(); commitInlineEdit(); }
            if (ke.key === 'Escape') { ke.preventDefault(); cancelInlineEdit(); }
        };
        el.focus();
        // select the element's text so re-typing replaces it in one stroke
        try {
            const doc = el.ownerDocument;
            const sel = doc.getSelection();
            const range = doc.createRange();
            range.selectNodeContents(el);
            sel?.removeAllRanges();
            sel?.addRange(range);
        } catch { /* selection is a convenience, not a requirement */ }
        setInlineSuggestions([]);
        setInlineSuggestionsLoading(true);
        suggestFieldRewrites(cleanValue, slide.title)
            .then(s => setInlineSuggestions(s))
            .finally(() => setInlineSuggestionsLoading(false));
    };

    // Attach click-to-edit inside the preview iframe. Re-attached on every
    // iframe load (each payload edit swaps srcDoc, which refires onLoad).
    const attachClickToEdit = () => {
        if (!textEditable) return;
        const doc = previewFrameRef.current?.contentDocument;
        if (!doc) return;
        try { doc.body.style.cursor = 'text'; } catch { /* no body yet */ }
        doc.addEventListener('click', (e: any) => {
            const target = e.target as HTMLElement;
            // clicks inside the active editable place the caret naturally
            if (clickedElRef.current && (target === clickedElRef.current || clickedElRef.current.contains(target))) return;
            let el: HTMLElement | null = target;
            for (let depth = 0; el && depth < 6; depth++, el = el.parentElement) {
                const t = el.textContent || '';
                if (t.trim().length < 3) continue;
                if (t.length > 600) break; // container-level: no single field
                const m = matchFieldByText(slide, t);
                if (m) { e.preventDefault(); beginInlineEdit(m, el); return; }
            }
        }, true);
    };
    const [fullscreen, setFullscreen] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    // USER-DIRECTED IMAGERY state (2026-08-14): which slot's mini-form is open + its draft.
    const [authoringSlot, setAuthoringSlot] = useState<string | null>(null);
    const [slotPrompt, setSlotPrompt] = useState('');
    const [slotStyle, setSlotStyle] = useState<'illustration' | 'infographic' | 'realistic'>('realistic');
    const userSlots = React.useMemo(
        () => (String(slide.template).startsWith('slides:') ? (USER_IMAGE_SLOTS[String(slide.template)] || []) : []),
        [slide.template]);
    const [showPromptInput, setShowPromptInput] = useState(false);
    const [exporting, setExporting] = useState(false);
    const slideRef = useRef<HTMLDivElement>(null);

    const statusColor = slide.status === 'approved' ? '#4CAF50' : slide.status === 'rejected' ? '#CC3333' : '#B8B800';
    const allowsImage = slide.template === 'persona-card';

    // 1:1 stage HTML for this slide - the SAME doc the export rasterizes. Memoized
    // so the iframe only re-renders when the slide changes. Falls back to the React
    // template renderer only if stage generation throws (defensive, never silent).
    const stageHtml = React.useMemo(() => {
        try { return slideDataToStageHtml(slide as any, deckPos); } catch (e) { console.warn('[SlideCanvas] stage HTML failed; falling back to React preview:', e); return ''; }
    }, [slide, deckPos]);

    // keyframes for the slot progress overlay (injected once per document)
    React.useEffect(() => {
        if (document.getElementById('hic-slot-anim')) return;
        const st = document.createElement('style');
        st.id = 'hic-slot-anim';
        st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.55}}';
        document.head.appendChild(st);
    }, []);

    const slideInternals = (
        <div ref={slideRef} style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', background: '#FFFFFF' }}>
            {stageHtml ? (
                <iframe
                    ref={previewFrameRef}
                    title={`${slide.template} preview`}
                    srcDoc={stageHtml}
                    scrolling="no"
                    tabIndex={-1}
                    aria-hidden="true"
                    onLoad={attachClickToEdit}
                    style={{ width: STAGE_W, height: STAGE_H, border: 0, transform: `scale(${SLIDE_W / STAGE_W})`, transformOrigin: 'top left', pointerEvents: textEditable ? 'auto' : 'none', display: 'block' }}
                />
            ) : <DeckPositionContext.Provider value={deckPos}>{renderTemplate(slide, !!isGeneratingVisual)}</DeckPositionContext.Provider>}
            {/* Persona image-generation overlay (iframe path: shown at card level) */}
            {isGeneratingVisual && slide.template === 'persona-card' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 4 }}><GeneratingOverlay /></div>
            )}
            {/* USER-DIRECTED IMAGERY (2026-08-14 pivot): per-slot GENERATE chips on
                slides:* archetypes. Draft slides only; the user authors a prompt +
                style per slot, resolved by the deck-level regenerate button. */}
            {slide.status === 'draft' && onAuthorImagery && userSlots.map(slot => {
                const authored = (slide.composerPayload?._userImagery || {})[slot.field];
                const generating = (generatingSlotKeys || []).includes(`${slide.id}:${slot.field}`);
                const hasImage = !!slide.composerPayload?.[slot.field];
                // The region outline is CLICK-TRANSPARENT and spans the slot's TRUE
                // geometry (full slide for backdrops); only the label chip takes
                // clicks, so text under the region stays inline-editable.
                return (
                    <div key={slot.field}
                        style={{
                            position: 'absolute', zIndex: 4, pointerEvents: 'none',
                            left: `${slot.rect.x * 100}%`, top: `${slot.rect.y * 100}%`,
                            width: `${slot.rect.w * 100}%`, height: `${slot.rect.h * 100}%`,
                            border: authored ? '2px solid rgba(202,202,32,0.9)' : '2px dashed rgba(0,183,195,0.85)',
                            background: authored ? 'rgba(202,202,32,0.04)' : 'rgba(0,183,195,0.04)',
                            boxSizing: 'border-box',
                        }}>
                        <button
                            onClick={() => { const opening = authoringSlot !== slot.field; setAuthoringSlot(opening ? slot.field : null); if (opening) { const prior = (slide.composerPayload?._userImagery || {})[slot.field]; setSlotPrompt(prior?.prompt || suggestPrompt(slot, slide.composerPayload)); } }}
                            title={authored ? `${slot.label}: "${authored.prompt}" (${authored.style})` : `Describe the ${slot.label.toLowerCase()} to generate`}
                            style={{
                                position: 'absolute', top: 6, right: 6, pointerEvents: 'auto', cursor: 'pointer', border: 'none',
                                fontSize: 8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px',
                                background: generating ? '#0D0D0D' : (hasImage ? '#caca20' : '#00B7C3'),
                                color: generating ? '#F5F3EA' : '#0D0D0D',
                                animation: generating ? 'pulse 1.2s ease-in-out infinite' : undefined,
                            }}>
                            {generating ? `Generating ${slot.label}...` : (hasImage ? `Regenerate ${slot.label}` : `Generate ${slot.label}`)}
                        </button>
                        {generating && (
                            <span style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ width: 26, height: 26, border: '3px solid #caca20', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                            </span>
                        )}
                    </div>
                );
            })}
            {/* Slot authoring mini-form */}
            {authoringSlot && slide.status === 'draft' && onAuthorImagery && (() => {
                const slot = userSlots.find(s => s.field === authoringSlot);
                if (!slot) return null;
                return (
                    <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 12, zIndex: 6, background: '#0D0D0D', padding: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: '#F5F3EA', fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{slot.label}</span>
                        <input value={slotPrompt} onChange={e => setSlotPrompt(e.target.value)} autoFocus
                            placeholder={slot.field === 'portraitImage' ? 'e.g. mid-40s research director at her desk, natural light' : 'Describe the visual you want here'}
                            onKeyDown={e => { if (e.key === 'Enter' && slotPrompt.trim()) { onAuthorImagery(slide, slot.field, { prompt: slotPrompt.trim(), style: slotStyle, authoredAt: Date.now() }); setAuthoringSlot(null); setSlotPrompt(''); } }}
                            style={{ flex: 1, padding: '6px 10px', border: 'none', fontSize: 11, fontFamily: "'Archivo', sans-serif", outline: 'none' }} />
                        <select value={slotStyle} onChange={e => setSlotStyle(e.target.value as any)}
                            style={{ padding: '6px 6px', fontSize: 10, fontFamily: "'Archivo', sans-serif", border: 'none' }}>
                            <option value="realistic">Realistic</option>
                            <option value="illustration">Illustration</option>
                        </select>
                        <button disabled={!slotPrompt.trim()}
                            onClick={() => { if (slotPrompt.trim()) { onAuthorImagery(slide, slot.field, { prompt: slotPrompt.trim(), style: slotStyle, authoredAt: Date.now() }); setAuthoringSlot(null); setSlotPrompt(''); } }}
                            style={{ padding: '6px 14px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Set</button>
                        <button onClick={() => { setAuthoringSlot(null); setSlotPrompt(''); }}
                            style={{ padding: '6px 8px', background: 'none', color: '#F5F3EA', border: '1px solid #555', fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>X</button>
                    </div>
                );
            })()}
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
            const stageHtml = slideDataToStageHtml(slide as any, deckPos);
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
        const html = stageHtml || (() => { try { return slideDataToStageHtml(slide as any, deckPos); } catch { return ''; } })();
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

    // WS-4 click-to-edit toolbar (owner UX 2026-08-14: inline, no card flip).
    // Appears when a text element on the slide is clicked: the editable text
    // plus AI-suggested alternative phrasings. Clicking a suggestion places it
    // in the editor; Apply commits to the payload and the preview re-renders.
    const editToolbar = inlineEdit && textEditable ? (
        <div style={{ background: '#0D0D0D', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#caca20', fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{inlineEdit.label}</span>
                <span style={{ color: '#999', fontSize: 9 }}>type directly on the slide; Enter applies, Esc cancels</span>
                <div style={{ flex: 1 }} />
                <button onClick={commitInlineEdit}
                    style={{ padding: '5px 16px', background: '#caca20', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Apply</button>
                <button onClick={cancelInlineEdit}
                    style={{ padding: '5px 10px', background: 'none', color: '#F5F3EA', border: '1px solid #555', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
            </div>
            {inlineSuggestionsLoading && (
                <span style={{ color: '#999', fontSize: 10 }}>Drafting alternative phrasings...</span>
            )}
            {inlineSuggestions.map((s, i) => (
                <button key={i}
                    onClick={() => {
                        const el = clickedElRef.current;
                        const edit = inlineEditRef.current;
                        if (el && edit) { try { el.textContent = `${edit.prefix}${s}${edit.suffix}`; } catch { /* gone */ } }
                    }}
                    title="Places this phrasing on the slide; Apply commits it"
                    style={{ textAlign: 'left', padding: '6px 10px', background: '#1D1D1D', color: '#E8E8E0', border: '1px solid #333', borderLeft: '3px solid #00B7C3', fontSize: 11, fontFamily: "'Archivo', sans-serif", cursor: 'pointer', lineHeight: 1.4 }}>
                    {s}
                </button>
            ))}
        </div>
    ) : null;

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
                {slide._locked && (
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1px', padding: '2px 8px', background: '#115054', color: '#F5F3EA' }}>LOCKED</span>
                )}
                {slide.status === 'draft' && !onUpdateSlide && (
                    <button onClick={() => setEditingTitle(true)} style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>EDIT TITLE</button>
                )}
                {slide.status === 'draft' && onUpdateSlide && (
                    <>
                        <span style={{ fontSize: 8, color: '#AAA', letterSpacing: '0.5px' }}>click any text on the slide to edit it</span>
                        {(slide._textHistory || []).length > 0 && (
                            <button onClick={() => { const u = undoLastTextEdit(slide); if (u) { onUpdateSlide(u); teardownInlineEdit(); } }}
                                title="Undo the most recent text edit on this slide"
                                style={{ fontSize: 8, color: '#115054', background: 'none', border: '1px solid #115054', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>
                                UNDO EDIT
                            </button>
                        )}
                        <button onClick={() => onUpdateSlide({ ...slide, _locked: !slide._locked })}
                            title="Locked slides are skipped by deck-wide AI passes"
                            style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>
                            {slide._locked ? 'UNLOCK' : 'LOCK'}
                        </button>
                    </>
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
                    {/* WS-4: the click-to-edit toolbar rides the fullscreen view too */}
                    {editToolbar && (
                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 'min(760px, 92vw)', zIndex: 1001 }}>
                            {editToolbar}
                        </div>
                    )}
                </div>
            ) : (
                <ScaledSlideBox>{slideInternals}</ScaledSlideBox>
            )}

            {/* WS-4: click-to-edit toolbar (card view) - sits directly under the
                slide so the highlighted element and its editor read together. */}
            {!fullscreen && editToolbar && <div style={{ marginTop: 6 }}>{editToolbar}</div>}

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
