/**
 * SlideCanvas — Template dispatcher + UI chrome.
 *
 * Each slide picks one of 10 NXT Humans templates. The web canvas always
 * renders at 960x540 internally and uses CSS transform: scale() to fit any
 * viewport. The PPTX export uses the same data + matching layout math, so
 * the export is pixel-equivalent to the preview.
 */

import React, { useState, useRef } from 'react';
import { NxtBlockRenderer, type NxtBlock } from './NxtOutputRenderer';
import {
    SlideShell, PersonaCardSlide, RecommendationSlide, ThemeClusterSlide,
    CompetitiveMatrixSlide, BlockQuoteSlide, CaseStudySlide, PrinciplesSlide,
    StatRowSlide, TimelineSlide, SectionDividerFullBleed,
} from './slideTemplates/web';
import { exportSlideToPPTX } from './slideTemplates/pptx';
import { TOKENS } from './slideTemplates/types';
import type {
    SlideTemplate, PersonaCardData, RecommendationData, ThemeClusterData,
    CompetitiveMatrixData, BlockQuoteData, CaseStudyData, PrinciplesData,
    StatRowData, TimelineData, SectionDividerData,
} from './slideTemplates/types';

export interface SlideData {
    id: string;
    template: SlideTemplate;
    title: string;
    subtitle?: string;
    sources?: string[];
    imageUrl?: string;
    imagePrompt?: string;
    // Template-specific data — populated based on `template`
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
    // Legacy/fallback fields (used when template doesn't fit any of the 10)
    body?: string;
    bullets?: string[];
    blocks?: NxtBlock[];
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

function renderTemplate(slide: SlideData, isGenerating: boolean): React.ReactNode {
    const sources = slide.sources || [];
    switch (slide.template) {
        case 'section-divider':
            return slide.sectionDivider ? <SectionDividerFullBleed data={slide.sectionDivider} /> : null;
        case 'persona-card':
            return slide.persona ? (
                <SlideShell imageUrl={slide.imageUrl} imagePanel={isGenerating ? <GeneratingOverlay /> : undefined}>
                    <PersonaCardSlide data={slide.persona} sources={sources} hasImage={!!slide.imageUrl} />
                </SlideShell>
            ) : null;
        case 'recommendation':
            return slide.recommendation ? (
                <SlideShell><RecommendationSlide title={slide.title} data={slide.recommendation} sources={sources} /></SlideShell>
            ) : null;
        case 'theme-cluster':
            return slide.themeCluster ? (
                <SlideShell><ThemeClusterSlide title={slide.title} data={slide.themeCluster} sources={sources} /></SlideShell>
            ) : null;
        case 'competitive-matrix':
            return slide.matrix ? (
                <SlideShell><CompetitiveMatrixSlide title={slide.title} data={slide.matrix} sources={sources} /></SlideShell>
            ) : null;
        case 'block-quote':
            return slide.quote ? (
                <SlideShell><BlockQuoteSlide data={slide.quote} sources={sources} /></SlideShell>
            ) : null;
        case 'case-study':
            return slide.caseStudy ? (
                <SlideShell><CaseStudySlide title={slide.title} data={slide.caseStudy} sources={sources} /></SlideShell>
            ) : null;
        case 'principles':
            return slide.principles ? (
                <SlideShell><PrinciplesSlide title={slide.title} data={slide.principles} sources={sources} /></SlideShell>
            ) : null;
        case 'stat-row':
            return slide.statRow ? (
                <SlideShell><StatRowSlide title={slide.title} data={slide.statRow} sources={sources} /></SlideShell>
            ) : null;
        case 'timeline':
            return slide.timeline ? (
                <SlideShell><TimelineSlide title={slide.title} data={slide.timeline} sources={sources} /></SlideShell>
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

    const slideInternals = (
        <div ref={slideRef} style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden' }}>
            {renderTemplate(slide, !!isGeneratingVisual)}
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

    const handleExportPPTX = async () => {
        setExporting(true);
        try {
            await exportSlideToPPTX({
                template: slide.template,
                title: slide.title,
                sources: slide.sources,
                imageUrl: slide.imageUrl,
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
            });
        } catch (e) {
            console.error('PPTX export failed:', e);
        }
        setExporting(false);
    };

    const handleExportPNG = async () => {
        if (!slideRef.current) return;
        setExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(slideRef.current, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, width: SLIDE_W, height: SLIDE_H });
            const link = document.createElement('a');
            link.download = `${slide.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) { console.error('PNG export failed:', e); }
        setExporting(false);
    };

    const handleExportPDF = async () => {
        if (!slideRef.current) return;
        setExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(slideRef.current, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, width: SLIDE_W, height: SLIDE_H });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 13.33, 7.5);
            pdf.save(`${slide.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 40).trim().replace(/\s+/g, '_')}.pdf`);
        } catch (e) { console.error('PDF export failed:', e); }
        setExporting(false);
    };

    return (
        <div style={{ margin: '12px 0' }}>
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>{slide.template.replace('-', ' ')}</span>
                {slide.model && <span style={{ fontSize: 9, color: '#999' }}>via {slide.model}</span>}
                <div style={{ flex: 1 }} />
                {slide.status === 'draft' && (
                    <button onClick={() => setEditingTitle(true)} style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>EDIT TITLE</button>
                )}
                <button onClick={() => setFullscreen(!fullscreen)} style={{ fontSize: 8, color: '#666', background: 'none', border: '1px solid #DDD', padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', fontWeight: 700 }}>
                    {fullscreen ? 'MINIMIZE' : 'EXPAND'}
                </button>
            </div>

            {/* Slide — scaled to fit container via CSS transform */}
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
