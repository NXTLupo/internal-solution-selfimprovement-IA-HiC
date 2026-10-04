
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ScriptScene, Theme, Slide, SlideLayout, SlideMetric, BentoCell, Citation, OutputOption, AnalysisStage, StrategicRoadmap, PRD, ServiceBlueprintStage, TechnicalArchitecture, RoadmapItem, PRDFeature, TechNode, Persona } from '../types';
import { generateSceneVideo, generateImage, rewriteSlideContent, setActiveVisualizationStyle, getActiveVisualizationStyle } from '../services/geminiService';
// Design system: single unified NXT Humans visual language (no style selector)
import { exportPPTX, exportJSON, exportStrategicReportHTML } from '../services/resultExports';
import { stripMarkdown, resolveCitations } from '../services/slidePostProcessor';
import { getChunkSourceMap } from '../services/researchFabricOrchestrator';
import { isPrdAir } from '../services/prdAir';
import { projectPrdAirToHtml } from '../services/prdProjection';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Clean text for ANY display: strip markdown, resolve citations, remove leftover CHUNK refs */
const cleanText = (text: string | undefined): string => {
    if (!text) return '';
    const chunkMap = getChunkSourceMap();
    let cleaned = resolveCitations(stripMarkdown(text), undefined, chunkMap);
    // Final sweep: strip any surviving [CHUNK_XXX] references
    cleaned = cleaned.replace(/\s*\[CHUNK_\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return cleaned;
};
/** Alias for backward compat */
const cleanSlideText = cleanText;

/** Render citations + evidence basis for any deliverable item */
const EvidenceBlock = ({ citations, evidenceBasis }: { citations?: string[]; evidenceBasis?: string }) => {
    if ((!citations || citations.length === 0) && !evidenceBasis) return null;
    return (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#F8F9FA', borderLeft: '2px solid #00B7C3', borderRadius: '0 4px 4px 0', fontSize: 10 }}>
            {citations && citations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: evidenceBasis ? 4 : 0 }}>
                    <span style={{ fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px', fontSize: 8 }}>Sources:</span>
                    {citations.map((c: string, i: number) => (
                        <span key={i} style={{ background: '#E8F4F5', color: '#115054', padding: '1px 6px', borderRadius: 2, fontSize: 9 }}>{c}</span>
                    ))}
                </div>
            )}
            {evidenceBasis && (
                <div style={{ color: '#666', fontStyle: 'italic', lineHeight: 1.4 }}>{evidenceBasis}</div>
            )}
        </div>
    );
};

/** Extract source citations from body text and return cleaned text + sources array */
const extractSources = (text: string): { clean: string; sources: string[] } => {
    const sources: string[] = [];
    const clean = text.replace(/\((?:Source(?:s)?:\s*)?([^)]+(?:Dive|OpenAlex|Reddit|Times|Post|Journal|News|Report|Survey|Study|Research|Review|Analysis|Data|Paper)[^)]*)\)/gi, (_, src) => {
        sources.push(src.trim());
        return '';
    }).replace(/\s{2,}/g, ' ').trim();
    return { clean, sources };
};

/** Normalize legacy SlideLayout values to the 7 universal archetypes */
const normalizeLayout = (layout: SlideLayout): SlideLayout => {
    switch (layout) {
        case 'TITLE_SLIDE':
        case 'SECTION_HEADER':
        case 'CONTENT_DATA_PANEL':
        case 'CONTENT_INSIGHT_CHART':
        case 'FULL_WIDTH_VIZ':
        case 'BENTO_GRID':
        case 'PROBLEM_SOLUTION':
            return layout; // Already a universal archetype
        case 'CONTENT_SPLIT_RIGHT':
        case 'CONTENT_SPLIT_LEFT':
        case 'FULL_BLEED_IMAGE':
        case 'KEY_STATISTIC':
        case 'PERSONA_SPOTLIGHT':
        case 'RECOMMENDATION':
        case 'CLOSING_CTA':
            return 'CONTENT_DATA_PANEL';
        case 'CONTENT_INSIGHT_CHART':
        case 'DATA_INSIGHT':
            return 'CONTENT_INSIGHT_CHART';
        case 'TYPOGRAPHY_QUOTE':
        case 'EVIDENCE_WALL':
        case 'QUOTE_FEATURE':
            return 'BENTO_GRID';
        case 'COMPARISON':
            return 'PROBLEM_SOLUTION';
        default:
            return 'CONTENT_DATA_PANEL';
    }
};

/** Accent color rotation for metric cards */
const ACCENT_ROTATION = ['#CC6644', '#B8B800', '#00B7C3'];
const getRotatedAccent = (index: number) => ACCENT_ROTATION[index % ACCENT_ROTATION.length];

/** Extract numbers/stats from bullet text to auto-generate metric cards */
const extractMetricsFromContent = (content: string[]): SlideMetric[] => {
    const metrics: SlideMetric[] = [];
    const statRegex = /(\d[\d,.]*)\s*(%|months?|years?|hours?|days?|x|pts?|M|K|B|\$[\d,.]+[MBK]?|pp)/gi;
    for (const line of content) {
        const matches = [...line.matchAll(statRegex)];
        for (const m of matches) {
            if (metrics.length >= 4) break;
            const value = m[1];
            const unit = m[2] || '';
            // Use the surrounding text as the label (first 40 chars of the line)
            const label = line.replace(statRegex, '').trim().substring(0, 40) || 'Metric';
            metrics.push({ label, value, unit, accentColor: getRotatedAccent(metrics.length) });
        }
        if (metrics.length >= 4) break;
    }
    return metrics;
};

/** Common NXT Humans font stacks */
const FONT = {
    primary: "'Helvetica Neue', Arial, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
};

/**
 * P5-02: Clickable citation traceability.
 *
 * Renders text with [CHUNK_XXX] references as clickable spans.
 * Each citation is styled with NXT teal (#115054), underlined,
 * and triggers the onCitationClick callback with the chunk ID.
 *
 * @param text - Raw text potentially containing [CHUNK_XXX] patterns
 * @param onCitationClick - Callback invoked with the chunk ID string when clicked
 * @returns JSX elements with inline clickable citations
 */
function renderWithCitations(
    text: string,
    onCitationClick: (chunkId: string) => void
): React.ReactNode {
    if (!text) return null;

    const chunkMap = getChunkSourceMap();
    const CITATION_REGEX = /\[CHUNK_(\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = CITATION_REGEX.exec(text)) !== null) {
        // Push the text before this citation
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const fullMatch = match[0];       // e.g. [CHUNK_042]
        const chunkNum = match[1];         // e.g. "042"
        const chunkId = `CHUNK_${chunkNum}`;
        const sourceInfo = chunkMap[chunkId];
        const displayText = sourceInfo
            ? `[${sourceInfo.sourceName}]`
            : fullMatch;
        const tooltipText = sourceInfo
            ? `${sourceInfo.sourceName}: ${sourceInfo.title}${sourceInfo.url ? '\n' + sourceInfo.url : ''}`
            : `Click to trace source: ${chunkId}`;

        parts.push(
            <span
                key={`cite-${match.index}`}
                onClick={(e) => { e.stopPropagation(); onCitationClick(chunkId); }}
                style={{
                    color: '#115054',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.85em',
                    fontWeight: 600,
                    padding: '0 2px',
                    borderRadius: '2px',
                    transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = 'rgba(17,80,84,0.1)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
                title={tooltipText}
            >
                {displayText}
            </span>
        );

        lastIndex = match.index + fullMatch.length;
    }

    // Push any remaining text after the last citation
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    // If no citations were found, return the raw text
    if (parts.length === 0) return text;

    return <>{parts}</>;
}

/** Default citation click handler - logs to console until full source-scroll is wired up */
const handleCitationClick = (chunkId: string) => {
    console.log('Citation clicked:', chunkId);
};

interface Props {
  result: AnalysisResult;
  onReset: () => void;
  onSave: (data?: AnalysisResult) => void;
  onEdit?: (stage: AnalysisStage) => void;
}

// Enhanced Modal Component for Evidence with Full Citations
const EvidenceModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    content: string; 
    citations?: Citation[]; 
    quote?: string; 
}> = ({ isOpen, onClose, title, content, citations, quote }) => {
    if (!isOpen) return null;
    
    // Normalize citations
    const activeCitations = citations && citations.length > 0 
        ? citations 
        : (quote ? [{ text: quote, sourceFile: 'Unknown', author: 'Unknown' }] as Citation[] : []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--modal-bg)] border border-[var(--border-primary)] rounded max-w-2xl w-full shadow-none overflow-hidden transform transition-all flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-secondary)] shrink-0">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto bg-[var(--bg-primary)]">
                    <p className="text-[var(--text-secondary)] mb-6 text-lg leading-relaxed">{content}</p>
                    
                    <h4 className="text-xs font-bold text-[var(--nxt-teal)] uppercase tracking-widest mb-3">
                        Verbatim Evidence ({activeCitations.length} Sources)
                    </h4>
                    
                    <div className="space-y-4">
                        {activeCitations.map((cit, idx) => (
                            <div key={idx} className="bg-[var(--bg-tertiary)] p-4 rounded-lg border-l-4 border-[var(--nxt-teal)] shadow-sm">
                                <p className="text-[var(--text-primary)] italic font-serif text-lg mb-3">"{cit.text}"</p>
                                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] font-mono">
                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>File: <span className="text-[var(--text-primary)] font-semibold">{cit.sourceFile}</span></span>
                                    </div>
                                    {cit.author && (
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span>Author: {cit.author}</span>
                                        </div>
                                    )}
                                    {cit.publicationDate && (
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>Date: {cit.publicationDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] text-right shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC<Props> = ({ result, onReset, onSave, onEdit }) => {
  // Determine default active tab based on what's available
  const getInitialTab = () => {
      if (result.selectedOutputs && result.selectedOutputs.length === 1) {
          const map: Record<OutputOption, string> = {
              'PERSONAS': 'personas',
              'PRD': 'prd',
              'ROADMAP': 'roadmap',
              'JOURNEY_MAP': 'journey',
              'TECH_ARCH': 'tech',
              'STRATEGIC_RECS': 'strategy',
              'STRATEGY_DECK': 'deck',
              'GAP_ANALYSIS': 'gap',
              'TECH_AUDIT': 'techAudit',
              'COMPETITIVE_ANALYSIS': 'competitive',
              'ORG_CHART': 'org',
          };
          const mapped = map[result.selectedOutputs[0]];
          if (mapped) return mapped;
      }
      
      if (result.selectedOutputs?.includes('STRATEGY_DECK')) return 'deck';
      if (result.selectedOutputs?.includes('PRD')) return 'prd';
      if (result.selectedOutputs?.includes('ROADMAP')) return 'roadmap';
      if (result.selectedOutputs?.includes('PERSONAS')) return 'personas';
      if (result.selectedOutputs?.includes('JOURNEY_MAP')) return 'journey';
      if (result.selectedOutputs?.includes('TECH_ARCH')) return 'tech';
      
      return 'personas'; 
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  
  // Local Mutable State for ALL Outputs
  const [personasData, setPersonasData] = useState<Persona[]>(result.personas || []);
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>(result.videoScript || []);
  const [slides, setSlides] = useState<Slide[]>(result.slides || []);
  const [roadmapData, setRoadmapData] = useState<StrategicRoadmap | null>(result.roadmap || null);
  const [prdData, setPrdData] = useState<PRD | null>(result.prd || null);
  const [journeyData, setJourneyData] = useState<ServiceBlueprintStage[]>(result.journeyMap || []);
  const [techData, setTechData] = useState<TechnicalArchitecture | null>(result.techArchitecture || null);
  const [journeyDiagramUrl, setJourneyDiagramUrl] = useState<string | undefined>(result.journeyMapDiagramUrl);
  const [techDiagramUrl, setTechDiagramUrl] = useState<string | undefined>(result.techArchitecture?.diagramUrl);

  // UI States
  const [isExporting, setIsExporting] = useState(false);
  const [diagramStatus, setDiagramStatus] = useState<{journey: 'idle'|'generating', tech: 'idle'|'generating'}>({journey: 'idle', tech: 'idle'});
  
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync state if result prop changes
  useEffect(() => {
      if (result.personas) setPersonasData(result.personas);
      if (result.videoScript) setScriptScenes(result.videoScript);
      if (result.slides) setSlides(result.slides);
      if (result.roadmap) setRoadmapData(result.roadmap);
      if (result.prd) setPrdData(result.prd);
      if (result.journeyMap) setJourneyData(result.journeyMap);
      if (result.techArchitecture) setTechData(result.techArchitecture);
      if (result.journeyMapDiagramUrl) setJourneyDiagramUrl(result.journeyMapDiagramUrl);
      if (result.techArchitecture?.diagramUrl) setTechDiagramUrl(result.techArchitecture.diagramUrl);
  }, [result]);

  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Slide | null>(null);
  const [rewriteThemeId, setRewriteThemeId] = useState<string>('');
  const [isRewriting, setIsRewriting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{title: string, content: string, citations?: Citation[], quote?: string}>({ title: '', content: '' });

  const updatePersonaField = (index: number, field: keyof Persona, value: any) => {
      const newPersonas = [...personasData];
      (newPersonas[index] as any)[field] = value;
      setPersonasData(newPersonas);
  };

  const updatePersonaFiveW = (index: number, key: string, value: string) => {
      const newPersonas = [...personasData];
      if (newPersonas[index] && newPersonas[index].fiveWs) {
          (newPersonas[index].fiveWs as any)[key] = value;
          setPersonasData(newPersonas);
      }
  };

  const updateRoadmapItem = (index: number, field: keyof RoadmapItem, value: string) => {
      if (!roadmapData || !roadmapData.items) return;
      const newItems = [...roadmapData.items];
      (newItems[index] as any)[field] = value;
      setRoadmapData({ ...roadmapData, items: newItems });
  };

  const updatePRDFeature = (index: number, field: keyof PRDFeature, value: string) => {
      if (!prdData || !prdData.features) return;
      const newFeatures = [...prdData.features];
      (newFeatures[index] as any)[field] = value;
      setPrdData({ ...prdData, features: newFeatures });
  };

  const updateJourneyStage = (index: number, field: keyof ServiceBlueprintStage, value: string) => {
      const newStages = [...journeyData];
      (newStages[index] as any)[field] = value;
      setJourneyData(newStages);
  };

  const updateTechNode = (index: number, field: keyof TechNode, value: string) => {
      if (!techData || !techData.nodes) return;
      const newNodes = [...techData.nodes];
      (newNodes[index] as any)[field] = value;
      setTechData({ ...techData, nodes: newNodes });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
      const newSlides = [...slides];
      if (direction === 'up' && index > 0) {
          [newSlides[index], newSlides[index-1]] = [newSlides[index-1], newSlides[index]];
      } else if (direction === 'down' && index < newSlides.length - 1) {
          [newSlides[index], newSlides[index+1]] = [newSlides[index+1], newSlides[index]];
      }
      newSlides.forEach((s, i) => s.slideNumber = i + 1);
      setSlides(newSlides);
  };

  const deleteSlide = (index: number) => {
      if (!confirm("Are you sure you want to delete this slide?")) return;
      const newSlides = slides.filter((_, i) => i !== index).map((s, i) => ({
          ...s,
          slideNumber: i + 1
      }));
      setSlides(newSlides);
  };
  
  const updateScriptScene = (index: number, field: keyof ScriptScene, value: any) => {
      const newScript = [...scriptScenes];
      (newScript[index] as any)[field] = value;
      setScriptScenes(newScript);
  };

  const handleSaveClick = () => {
      const currentResult: AnalysisResult = {
          ...result,
          personas: personasData,
          videoScript: scriptScenes,
          slides: slides,
          roadmap: roadmapData || undefined,
          prd: prdData || undefined,
          journeyMap: journeyData,
          techArchitecture: techData ? { ...techData, diagramUrl: techDiagramUrl } : undefined,
          journeyMapDiagramUrl: journeyDiagramUrl,
          recommendations: result.recommendations 
      };
      onSave(currentResult);
  };

  const convertToCSV = (data: any[]): string => {
      if (!data || data.length === 0) return '';
      const header = Object.keys(data[0]).join(',');
      const rows = data.map(obj => Object.values(obj).map(val => {
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
      }).join(','));
      return [header, ...rows].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportCSV = () => {
      let data: any[] = [];
      let filename = 'export.csv';

      if (activeTab === 'personas') {
          data = personasData.map(p => ({
              Name: p.name, Role: p.role, Quote: p.quote, Bio: p.bio,
              PainPoints: (Array.isArray(p.painPoints) ? p.painPoints : []).map(pp => pp.label).join('; ')
          }));
          filename = 'personas.csv';
      } else if (activeTab === 'themes' && result.themes) {
          data = result.themes.map(t => ({
              Theme: t.name, Status: t.status || '', Description: t.description, Quote: t.quote,
              CrossDocument: t.isCrossDocument ? 'Yes' : 'No',
              Sources: (t.citations || []).map(c => c.sourceName || c.sourceFile).join('; ')
          }));
          filename = 'themes.csv';
      } else if (activeTab === 'prd' && prdData) {
          data = (prdData.features || []).map(f => ({
              Feature: f.name, Priority: f.priority, Description: f.description, UserStories: (f.userStories || []).join('; ')
          }));
          filename = 'prd_features.csv';
      } else if (activeTab === 'roadmap' && roadmapData) {
          data = (roadmapData.items || []).map(i => ({
              Initiative: i.initiative, Horizon: i.horizon, Status: i.status || 'Planned', Owner: i.owner, Description: i.description
          }));
          filename = 'roadmap.csv';
      } else if (activeTab === 'journey' && journeyData) {
          data = journeyData;
          filename = 'service_blueprint.csv';
      } else if (activeTab === 'tech' && techData) {
          data = (techData.nodes || []).map(n => ({
              Label: n.label, Type: n.type, Description: n.description
          }));
          filename = 'tech_nodes.csv';
      } else if (activeTab === 'strategy' && result.recommendations) {
          data = (result.recommendations || []).map(r => ({
              Title: r.title, Impact: r.impactLevel, Description: r.description, ActionItems: (r.actionItems || []).join('; ')
          }));
          filename = 'strategic_recs.csv';
      } else if (activeTab === 'deck' && slides.length > 0) {
          data = slides.map(s => ({
              Slide: s.slideNumber, Title: s.title, Layout: s.layout, Content: (s.content || []).join('; '), VisualPrompt: s.visualPrompt
          }));
          filename = 'strategy_deck.csv';
      }

      if (data.length > 0) {
          const csv = convertToCSV(data);
          downloadCSV(csv, filename);
      } else {
          alert("No structured data available for CSV export on this tab.");
      }
  };

  // --- RENDER-GATED CAPTURE UTILITIES ---
  // Waits for all images inside an element to finish loading
  const waitForImages = (el: HTMLElement, timeoutMs = 5000): Promise<void> => {
      const images = el.querySelectorAll('img');
      if (images.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
          let loaded = 0;
          const total = images.length;
          const done = () => { loaded++; if (loaded >= total) resolve(); };
          const timer = setTimeout(resolve, timeoutMs); // Ceiling timeout
          images.forEach(img => {
              if (img.complete && img.naturalWidth > 0) { done(); }
              else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
          });
      });
  };

  // Waits for at least one full browser paint cycle after content is ready
  const waitForPaint = (): Promise<void> => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  // 2026-05-25 - Font-readiness gate. html2canvas captures the DOM at the moment
  // it fires; if web fonts (Spectral, Roboto, JetBrains Mono, Bebas Neue, Archivo)
  // are still loading, text falls back to a system font that has narrower glyph
  // widths than the design system assumes. The 80px label column that holds
  // "CHALLENGE" in 9px Roboto Mono will break to "CHALLENG/E" if Roboto Mono
  // isn't loaded - exactly the pattern the user flagged on 2026-05-25.
  //
  // FontFaceSet.ready resolves when every font currently used in the document
  // has finished loading or failed. We chain it with a small timeout ceiling
  // so a stuck font load can't block the export forever.
  const waitForFonts = async (timeoutMs = 4000): Promise<void> => {
      if (typeof document === 'undefined' || !(document as any).fonts) return;
      try {
          await Promise.race([
              (document as any).fonts.ready as Promise<unknown>,
              new Promise(resolve => setTimeout(resolve, timeoutMs)),
          ]);
      } catch { /* best-effort */ }
  };

  // Captures the slide's RENDERED width so html2canvas can replay the exact
  // same layout. Without this, html2canvas uses the viewport width and the
  // slide's CSS responsiveness re-flows mid-capture (this is why the export
  // showed CHALLENG/E broken mid-word while the preview was clean).
  const measureExportGeometry = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return {
          // Prefer scroll dimensions if larger (content overflow), else
          // bounding-rect (visible viewport-scoped size).
          width: Math.max(el.scrollWidth, Math.round(rect.width)),
          height: Math.max(el.scrollHeight, Math.round(rect.height)),
      };
  };

  // Checks if a canvas has meaningful content (not >95% single color)
  const isCanvasBlank = (canvas: HTMLCanvasElement, threshold = 0.95): boolean => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return true;
      // Sample a grid of pixels for performance (don't scan every pixel)
      const step = Math.max(4, Math.floor(Math.min(canvas.width, canvas.height) / 40));
      const pixels: Record<string, number> = {};
      let total = 0;
      for (let x = 0; x < canvas.width; x += step) {
          for (let y = 0; y < canvas.height; y += step) {
              const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
              const key = `${r >> 4},${g >> 4},${b >> 4}`; // Quantize to reduce noise
              pixels[key] = (pixels[key] || 0) + 1;
              total++;
          }
      }
      const maxCount = Math.max(...Object.values(pixels));
      return maxCount / total > threshold;
  };

  const handleDownloadPDF = async () => {
      if (!contentRef.current) return;
      setIsExporting(true);
      try {
          if (activeTab === 'deck') {
              const slideElements = contentRef.current.querySelectorAll('.slide-export-target');
              if (slideElements.length === 0) {
                  alert("No slides found to export.");
                  setIsExporting(false);
                  return;
              }

              // --- FIX 2: Apply print-mode to strip interactive chrome ---
              contentRef.current.setAttribute('data-print-mode', 'true');
              // 2026-05-25 - also set data-export-mode so any per-template
              // export-mode CSS rule (e.g., sidebar wordmark visibility) fires.
              contentRef.current.setAttribute('data-export-mode', 'true');

              // 2026-05-25 - Font readiness gate. Must precede the first paint
              // wait so the layout reflows to final glyph widths BEFORE the
              // capture geometry is measured. Without this, html2canvas captures
              // text at fallback-font widths and the 80px label columns wrap
              // mid-word ("CHALLENG/E", "APPROAC/H") - exactly the defect
              // flagged on 2026-05-25 in the case-study export.
              await waitForFonts();

              // Wait for print-mode CSS to apply
              await waitForPaint();

              const pdfPageWidth = 338.67; // mm (13.33")
              const pdfPageHeight = 190.5; // mm (7.5") - exact 16:9
              const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pdfPageWidth, pdfPageHeight] });
              pdf.deletePage(1);

              const blankSlides: number[] = [];
              const RENDER_WAIT_MS = 300; // Per-slide settle time
              const MAX_RETRIES = 2;

              for (let i = 0; i < slideElements.length; i++) {
                  const slideElement = slideElements[i] as HTMLElement;

                  // --- FIX 1: Render-complete gate ---
                  // Step 1: Scroll element into view to trigger lazy rendering
                  slideElement.scrollIntoView({ behavior: 'instant' as any, block: 'center' });
                  // Step 2: Wait for images inside this slide
                  await waitForImages(slideElement);
                  // Step 3: Re-confirm fonts are loaded (cheap idempotent gate
                  // covers any late-binding font fetches kicked off by this
                  // slide's content)
                  await waitForFonts(1500);
                  // Step 4: Wait for browser paint cycle + settle time
                  await waitForPaint();
                  await new Promise(r => setTimeout(r, RENDER_WAIT_MS));

                  // 2026-05-25 - Lock the exact rendered geometry so html2canvas
                  // doesn't re-layout against the viewport width and break the
                  // 80px label column / aspect ratio.
                  const geom = measureExportGeometry(slideElement);

                  let canvas: HTMLCanvasElement | null = null;
                  let retries = 0;

                  // Determine if this slide has a dark background (for PNG vs JPEG decision)
                  const slideLayout = slides[i] ? normalizeLayout(slides[i].layout) : 'CONTENT_DATA_PANEL';
                  const isDarkSlide = slideLayout === 'SECTION_HEADER' || slideLayout === 'BENTO_GRID' || slideLayout === 'TITLE_SLIDE';

                  while (retries <= MAX_RETRIES) {
                      canvas = await html2canvas(slideElement, {
                          scale: 1.5, useCORS: true, logging: false,
                          backgroundColor: null, // Preserve actual backgrounds (dark slides!)
                          // 2026-05-25 - windowWidth/Height now use the locked
                          // geometry (max(scrollWidth, boundingRect.width)) so
                          // the offscreen render matches what the user sees.
                          // Previously this used only scrollWidth which omitted
                          // the bounding-rect width when the element had no
                          // overflow, causing the layout to reflow narrower.
                          windowWidth: geom.width,
                          windowHeight: geom.height,
                          width: geom.width,
                          height: geom.height,
                      });

                      // --- FIX 3: Pre-export blank detection ---
                      if (!isCanvasBlank(canvas)) break; // Content detected, proceed

                      // Blank - retry with longer wait
                      retries++;
                      if (retries <= MAX_RETRIES) {
                          await new Promise(r => setTimeout(r, 500 * retries));
                          await waitForPaint();
                      }
                  }

                  if (canvas && isCanvasBlank(canvas)) {
                      blankSlides.push(i + 1);
                  }

                  if (canvas) {
                      const imgRatio = canvas.width / canvas.height;
                      const pageRatio = pdfPageWidth / pdfPageHeight;
                      let finalW: number, finalH: number, x: number, y: number;
                      if (Math.abs(imgRatio - pageRatio) < 0.05) {
                          finalW = pdfPageWidth; finalH = pdfPageHeight; x = 0; y = 0;
                      } else if (imgRatio > pageRatio) {
                          finalW = pdfPageWidth; finalH = pdfPageWidth / imgRatio;
                          x = 0; y = (pdfPageHeight - finalH) / 2;
                      } else {
                          finalH = pdfPageHeight; finalW = pdfPageHeight * imgRatio;
                          x = (pdfPageWidth - finalW) / 2; y = 0;
                      }
                      pdf.addPage([pdfPageWidth, pdfPageHeight], 'landscape');
                      // Use PNG for dark slides (JPEG artifacts visible on dark bg), JPEG for white slides (much smaller)
                      if (isDarkSlide) {
                          pdf.addImage(canvas, 'PNG', x, y, finalW, finalH);
                      } else {
                          const jpegData = canvas.toDataURL('image/jpeg', 0.85);
                          pdf.addImage(jpegData, 'JPEG', x, y, finalW, finalH);
                      }
                  }
              }

              // Remove print mode + export mode (paired with the setAttribute pair above)
              contentRef.current.removeAttribute('data-print-mode');
              contentRef.current.removeAttribute('data-export-mode');

              // --- FIX 3: Warn user about blank slides ---
              if (blankSlides.length > 0) {
                  const proceed = confirm(
                      `Warning: Slides ${blankSlides.join(', ')} appear to be blank or nearly empty.\n\n` +
                      `${blankSlides.length} of ${slideElements.length} slides may not have rendered correctly.\n\n` +
                      `Click OK to download anyway, or Cancel to abort and retry.`
                  );
                  if (!proceed) {
                      setIsExporting(false);
                      return;
                  }
              }

              pdf.save('NXT_Humans_Strategy_Deck.pdf');
          }
          else if (activeTab === 'personas') {
              const slideElements = contentRef.current.querySelectorAll('.persona-card');
              if (slideElements.length === 0) {
                  alert("No personas found to export.");
                  setIsExporting(false);
                  return;
              }
              const pageWidth = 297; 
              const pageHeight = 167.06;
              const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageWidth, pageHeight] });
              pdf.deletePage(1);
              for (let i = 0; i < slideElements.length; i++) {
                  const slideElement = slideElements[i] as HTMLElement;
                  const canvas = await html2canvas(slideElement, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const imgWidthRaw = canvas.width;
                  const imgHeightRaw = canvas.height;
                  const imgRatio = imgWidthRaw / imgHeightRaw;
                  const pageRatio = pageWidth / pageHeight;
                  let finalW, finalH;
                  if (imgRatio > pageRatio) {
                      finalW = pageWidth;
                      finalH = pageWidth / imgRatio;
                  } else {
                      finalH = pageHeight;
                      finalW = pageHeight * imgRatio;
                  }
                  const x = (pageWidth - finalW) / 2;
                  const y = (pageHeight - finalH) / 2;
                  pdf.addPage([pageWidth, pageHeight], 'landscape');
                  // Light background: use JPEG for smaller file size; dark: use PNG to avoid artifacts
                  const jpegData = canvas.toDataURL('image/jpeg', 0.85);
                  pdf.addImage(jpegData, 'JPEG', x, y, finalW, finalH);
              }
              pdf.save('NXT_Humans_Personas.pdf');
          }
          else if (activeTab === 'journey' || activeTab === 'tech') {
              const pdf = new jsPDF('landscape', 'mm', 'a4');
              pdf.deletePage(1);
              const diagramEl = contentRef.current.querySelector('.diagram-container') as HTMLElement;
              if (diagramEl) {
                  const canvas = await html2canvas(diagramEl, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const imgWidth = canvas.width;
                  const imgHeight = canvas.height;
                  const ratio = imgWidth / imgHeight;
                  const pdfPageWidth = 297;
                  const pdfPageHeight = pdfPageWidth / ratio;
                  pdf.addPage([pdfPageWidth, pdfPageHeight], 'landscape');
                  const diagramJpeg = canvas.toDataURL('image/jpeg', 0.85);
                  pdf.addImage(diagramJpeg, 'JPEG', 0, 0, pdfPageWidth, pdfPageHeight);
              }
              const detailsEl = contentRef.current.querySelector('.details-container') as HTMLElement;
              if (detailsEl) {
                  const canvas = await html2canvas(detailsEl, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const pdfPageWidth = 297;
                  const pdfPageHeight = 210;
                  const imgData = canvas.toDataURL('image/jpeg', 0.85);
                  const imgPropsWidth = pdfPageWidth;
                  const imgPropsHeight = (canvas.height * imgPropsWidth) / canvas.width;
                  let heightLeft = imgPropsHeight;
                  let position = 0;
                  pdf.addPage('a4', 'landscape');
                  pdf.addImage(imgData, 'JPEG', 0, position, imgPropsWidth, imgPropsHeight);
                  heightLeft -= pdfPageHeight;
                  while (heightLeft > 0) {
                      position = heightLeft - imgPropsHeight;
                      pdf.addPage('a4', 'landscape');
                      pdf.addImage(imgData, 'JPEG', 0, position, imgPropsWidth, imgPropsHeight);
                      heightLeft -= pdfPageHeight;
                  }
              }
              pdf.save(`Humans_in_Control_${activeTab}_Export.pdf`);
          }
          else {
              const orientation = (activeTab === 'roadmap') ? 'l' : 'p';
              const pdf = new jsPDF(orientation, 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const canvas = await html2canvas(contentRef.current, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/jpeg', 0.85);
              const imgWidth = pdfWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              let heightLeft = imgHeight;
              let position = 0;
              pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
              while (heightLeft > 0) {
                  position = heightLeft - imgHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                  heightLeft -= pdfHeight;
              }
              pdf.save(`Humans_in_Control_Export_${activeTab}.pdf`);
          }
      } catch (e) {
          console.error("PDF Export failed", e);
          alert("Export failed. Please try again.");
      } finally {
          setIsExporting(false);
      }
  };

  const handleExportPPTX = async () => {
      setIsExporting(true);
      try {
          const currentResult: AnalysisResult = {
              ...result,
              personas: personasData,
              videoScript: scriptScenes,
              slides: slides,
              roadmap: roadmapData || undefined,
              prd: prdData || undefined,
              journeyMap: journeyData,
              techArchitecture: techData || undefined,
              recommendations: result.recommendations,
          };
          await exportPPTX(currentResult, slides);
      } catch (e) {
          console.error("PPTX Export failed", e);
          alert("PPTX export failed. Please try again.");
      } finally {
          setIsExporting(false);
      }
  };

  const handleExportJSON = () => {
      const currentResult: AnalysisResult = {
          ...result,
          personas: personasData,
          videoScript: scriptScenes,
          slides: slides,
          roadmap: roadmapData || undefined,
          prd: prdData || undefined,
          journeyMap: journeyData,
          techArchitecture: techData || undefined,
          recommendations: result.recommendations,
      };
      exportJSON(currentResult);
  };

  const handleGenerateVideo = async (index: number) => {
    const scene = scriptScenes[index];
    if (scene.videoStatus === 'generating' || scene.videoStatus === 'completed') return;
    const newScenes = [...scriptScenes];
    newScenes[index] = { ...scene, videoStatus: 'generating' };
    setScriptScenes(newScenes);
    try {
        const videoUrl = await generateSceneVideo(scene.visualDescription, scene.imageUrl);
        setScriptScenes(prev => {
            const updated = [...prev];
            if (videoUrl) {
                updated[index] = { ...updated[index], videoUrl: videoUrl, videoStatus: 'completed' };
            } else {
                 updated[index] = { ...updated[index], videoStatus: 'error' };
            }
            return updated;
        });
    } catch (e) {
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], videoStatus: 'error' };
            return updated;
        });
    }
  };

  const handleRegeneratePersonaImage = async (index: number, styleOverride?: string) => {
      if (styleOverride) {
          setActiveVisualizationStyle(styleOverride);
          setActiveVisStyle(styleOverride);
      }
      const p = personasData[index];
      const newPersonas = [...personasData];
      newPersonas[index] = { ...p, imageUrl: undefined };
      setPersonasData(newPersonas);
      try {
          const bioSnippet = (p.bio || '').substring(0, 50);
          // Uses the active visualization style's portrait prompt
          const imgPrompt = `Portrait of ${p.name}, ${p.role}, ${p.demographics}. Context: ${bioSnippet}`;
          const url = await generateImage(imgPrompt, "1:1");
          setPersonasData(prev => {
              const updated = [...prev];
              updated[index] = { ...updated[index], imageUrl: url };
              return updated;
          });
      } catch(e) {
          console.error("Persona regen failed", e);
      }
  };
  
  const handleRegenerateDiagram = async (type: 'journey' | 'tech') => {
       setDiagramStatus(prev => ({...prev, [type]: 'generating'}));
       try {
           if (type === 'journey' && journeyData.length > 0) {
                setJourneyDiagramUrl(undefined); 
                const stagesStr = journeyData.map(s => `${s.phase}: ${s.customerAction}`).join("; ");
                // Revised Prompt: High-Fidelity 3D Diagram
                const imgPrompt = `A high-fidelity 3D isometric Service Blueprint visualization. Clean white background, glassmorphism nodes, professional corporate color palette (Deep Blue/Teal). Structured data visualization showing phases: ${stagesStr}. High resolution.`;
                const url = await generateImage(imgPrompt, "16:9");
                setJourneyDiagramUrl(url);
           }
           if (type === 'tech' && techData) {
               setTechDiagramUrl(undefined);
                const nodesList = (techData.nodes || []).map(n => n.label).join(", ");
                // Revised Prompt: High-Fidelity 3D Diagram
                const imgPrompt = `A high-fidelity 3D isometric Technical System Architecture. Clean white background, floating glass nodes, data stream connections. Professional cloud infrastructure aesthetic. Nodes: ${nodesList}.`;
                const url = await generateImage(imgPrompt, "16:9");
                setTechDiagramUrl(url);
           }
       } catch (e) {
           console.error("Diagram regen failed", e);
       } finally {
           setDiagramStatus(prev => ({...prev, [type]: 'idle'}));
       }
  };

  const [activeVisStyle, setActiveVisStyle] = useState(() => {
      try { return getActiveVisualizationStyle() || 'atmospheric_vector'; } catch { return 'atmospheric_vector'; }
  });

  const handleRegenerateImage = async (index: number, styleOverride?: string) => {
    const scene = scriptScenes[index];
    if (scene.imageStatus === 'generating') return;

    // Apply style override if provided
    if (styleOverride) {
        setActiveVisualizationStyle(styleOverride);
        setActiveVisStyle(styleOverride);
    }

    const newScenes = [...scriptScenes];
    newScenes[index] = { ...scene, imageStatus: 'generating' };
    setScriptScenes(newScenes);
    try {
        let refImage = undefined;
        if (scene.personaRef) {
             const persona = (result.personas || []).find(p => p.name === scene.personaRef);
             if (persona?.imageUrl) refImage = persona.imageUrl;
        }
        const imageUrl = await generateImage(scene.visualPrompt || scene.visualDescription, "16:9", refImage);
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageUrl: imageUrl, imageStatus: 'idle', videoUrl: undefined, videoStatus: 'idle' };
            return updated;
        });
    } catch (e) {
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageStatus: 'error' };
            return updated;
        });
    }
  };

  const handleRegenerateSlideImage = async (index: number, styleOverride?: string) => {
    if (styleOverride) {
        setActiveVisualizationStyle(styleOverride);
        setActiveVisStyle(styleOverride);
    }
    const slide = slides[index];
    if (slide.imageStatus === 'generating') return;
    const newSlides = [...slides];
    newSlides[index] = { ...slide, imageStatus: 'generating' };
    setSlides(newSlides);
    try {
        let aspectRatio = "16:9";
        if (slide.layout === 'CONTENT_SPLIT_RIGHT' || slide.layout === 'CONTENT_SPLIT_LEFT') {
            aspectRatio = "1:1";
        }
        const imageUrl = await generateImage(slide.visualPrompt, aspectRatio);
        setSlides(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageUrl: imageUrl, imageStatus: 'idle' };
            return updated;
        });
    } catch (e) {
        setSlides(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageStatus: 'error' };
            return updated;
        });
    }
  };

  const startEditingSlide = (index: number) => {
      setEditingSlideIndex(index);
      setEditForm({ ...slides[index] });
      setRewriteThemeId('');
  };

  const saveSlideEdit = () => {
      if (editingSlideIndex === null || !editForm) return;
      const newSlides = [...slides];
      newSlides[editingSlideIndex] = editForm;
      setSlides(newSlides);
      setEditingSlideIndex(null);
      setEditForm(null);
  };

  const cancelSlideEdit = () => {
      setEditingSlideIndex(null);
      setEditForm(null);
  };

  const handleRewriteSlide = async () => {
      if (!rewriteThemeId || !editForm || editingSlideIndex === null) return;
      const theme = (result.themes || [])[parseInt(rewriteThemeId)];
      if (!theme) return;
      setIsRewriting(true);
      try {
          const rewrittenData = await rewriteSlideContent(editForm, theme, editForm.layout);
          setEditForm(prev => prev ? ({ ...prev, ...rewrittenData, style: prev.style }) : null);
      } catch (e) {
          console.error("Rewrite error", e);
      } finally {
          setIsRewriting(false);
      }
  };

  const renderSlidePreview = (slide: Slide, idx: number) => {
      const containerClass = "slide-export-target rounded-none shadow-none max-w-5xl mx-auto aspect-[16/9] flex flex-col relative overflow-hidden group border border-[#E8E8E8] transition-all hover:scale-[1.01]";
      const archetypeLayout = normalizeLayout(slide.layout);
      const slides_total = result.slides?.length || 0;
      const showSlideNumber = archetypeLayout !== 'TITLE_SLIDE' && archetypeLayout !== 'SECTION_HEADER';

      // Collect or auto-extract metrics for data panel archetypes
      const metrics: SlideMetric[] = slide.metrics || extractMetricsFromContent(slide.content || []);
      // Collect sources from slide or extract from text
      const allSources = slide.sources || [];

      // Edit form (unchanged in functionality, updated archetype options)
      if (editingSlideIndex === idx && editForm) {
          return (
              <div key={idx} className="max-w-5xl mx-auto bg-[var(--card-bg)] rounded p-6 border border-[var(--border-primary)] shadow-none animate-fade-in relative z-10 text-[var(--text-primary)]">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-primary)]">
                      <h3 className="text-xl font-bold" style={{ fontFamily: FONT.primary }}>Edit Slide {slide.slideNumber}</h3>
                      <div className="flex gap-2">
                           <button onClick={cancelSlideEdit} className="px-3 py-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancel</button>
                           <button onClick={saveSlideEdit} className="px-4 py-1 text-sm bg-[#00B7C3] hover:brightness-110 text-white font-bold rounded shadow-none">Save Changes</button>
                      </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-[#AAAAAA] uppercase block mb-1" style={{ letterSpacing: '1.5px' }}>Layout Archetype</label>
                              <select value={editForm.layout} onChange={e => setEditForm({...editForm, layout: e.target.value as SlideLayout})} className="w-full bg-white text-black border border-[#E8E8E8] rounded p-2 text-sm outline-none">
                                  <option value="TITLE_SLIDE">Title Slide</option>
                                  <option value="SECTION_HEADER">Section Divider</option>
                                  <option value="CONTENT_DATA_PANEL">Content + Data Panel</option>
                                  <option value="CONTENT_INSIGHT_CHART">Content + Insight Chart</option>
                                  <option value="FULL_WIDTH_VIZ">Full-Width Visualization</option>
                                  <option value="BENTO_GRID">Bento Insight Grid</option>
                                  <option value="PROBLEM_SOLUTION">Problem / Solution Split</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[#AAAAAA] uppercase block mb-1" style={{ letterSpacing: '1.5px' }}>Slide Title</label>
                              <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-white border border-[#E8E8E8] rounded p-2 text-sm outline-none font-bold" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[#AAAAAA] uppercase block mb-1" style={{ letterSpacing: '1.5px' }}>Main Content</label>
                              <textarea value={(editForm.content || []).join('\n')} onChange={e => setEditForm({...editForm, content: e.target.value.split('\n')})} className="w-full h-32 bg-white border border-[#E8E8E8] rounded p-2 text-sm outline-none resize-none" placeholder="One bullet per line..." />
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-[#AAAAAA] uppercase block mb-1" style={{ letterSpacing: '1.5px' }}>Speaker Notes</label>
                              <textarea value={editForm.narrative} onChange={e => setEditForm({...editForm, narrative: e.target.value})} className="w-full h-24 bg-white border border-[#E8E8E8] rounded p-2 text-sm outline-none resize-none italic" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[#AAAAAA] uppercase block mb-1" style={{ letterSpacing: '1.5px' }}>Source Quote</label>
                              <textarea value={editForm.quote || ''} onChange={e => setEditForm({...editForm, quote: e.target.value})} className="w-full h-24 bg-white border border-[#E8E8E8] rounded p-2 text-sm outline-none resize-none" placeholder="Verbatim quote from research source..." />
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      // --- EDITORIAL SLIDE TEMPLATES (inspired by reference deck) ---
      // Key DNA: dark/white alternation, massive typography, minimal content, accent keyword
      const F = FONT.primary;
      const isDark = archetypeLayout === 'TITLE_SLIDE' || archetypeLayout === 'SECTION_HEADER' || archetypeLayout === 'BENTO_GRID';
      const bg = isDark ? '#0D0D0D' : '#FFFFFF';
      const fg = isDark ? '#FFFFFF' : '#1A1A1A';
      const muted = isDark ? 'rgba(255,255,255,0.5)' : '#888888';
      const accent = '#B8B800';
      const cyan = '#00B7C3';

      // Extract first stat from content or metrics for hero display
      const heroStat = metrics[0] || null;
      const titleText = cleanSlideText(slide.title);
      // Highlight last significant word in accent
      const titleWords = titleText.split(' ');
      const accentWordIdx = titleWords.length > 3 ? titleWords.length - 1 : -1;

      // Shared: Source footnote strip
      const FootnoteStrip = () => allSources.length > 0 ? (
          <div style={{ position: 'absolute', bottom: 14, left: 48, right: 80, fontFamily: F, fontSize: 9, color: isDark ? 'rgba(255,255,255,0.2)' : '#CCCCCC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {allSources.slice(0, 3).join(' \u00B7 ')}
          </div>
      ) : null;

      // Shared: Slide number
      const SlideNum = () => showSlideNumber ? (
          <div style={{ position: 'absolute', bottom: 14, right: 48, fontFamily: F, fontSize: 10, fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.2)' : '#CCCCCC' }}>
              {String(idx + 1).padStart(2, '0')}
          </div>
      ) : null;

      return (
          <div key={idx} className={containerClass} style={{ backgroundColor: bg }}>

               {/* ====== TITLE SLIDE - Dark, editorial statement + stat row ====== */}
               {archetypeLayout === 'TITLE_SLIDE' && (
                   <div style={{ position: 'absolute', inset: 0, background: '#0D0D0D', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 56px 48px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <div style={{ width: 24, height: 1, background: accent }} />
                           <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' as const, color: accent }}>
                               {result.selectedOutputs?.[0]?.replace(/_/g, ' ') || 'STRATEGIC ANALYSIS'}
                           </div>
                       </div>
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '75%' }}>
                           <h1 style={{ fontFamily: F, fontSize: 36, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15 }}>
                               {titleWords.map((w, i) => (
                                   <span key={i}>{i === accentWordIdx ? <span style={{ color: accent }}>{w}</span> : w}{i < titleWords.length - 1 ? ' ' : ''}</span>
                               ))}<span style={{ color: accent }}>.</span>
                           </h1>
                           {slide.narrative && <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginTop: 16, maxWidth: '70%' }}>{cleanSlideText(slide.narrative).substring(0, 150)}</p>}
                       </div>
                       {metrics.length > 0 && (
                           <div style={{ display: 'flex', gap: 40, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
                               {metrics.slice(0, 3).map((m, i) => (
                                   <div key={i}>
                                       <div style={{ fontFamily: F, fontSize: 36, fontWeight: 200, color: '#FFFFFF', lineHeight: 1 }}>{m.value}<span style={{ fontSize: 14, color: accent, marginLeft: 2 }}>{m.unit || ''}</span></div>
                                       <div style={{ fontFamily: F, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{m.label}</div>
                                   </div>
                               ))}
                           </div>
                       )}
                       <SlideNum />
                   </div>
               )}

               {/* ====== SECTION HEADER - Dark, oversized accent word ====== */}
               {archetypeLayout === 'SECTION_HEADER' && (
                   <div style={{ position: 'absolute', inset: 0, background: '#0D0D0D', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                       <div style={{ position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)', fontFamily: F, fontSize: 'clamp(80px, 14vw, 160px)', fontWeight: 900, color: accent, lineHeight: 0.9, pointerEvents: 'none', opacity: 0.15, whiteSpace: 'nowrap', maxWidth: '120%' }}>{titleText.substring(0, 30)}</div>
                       <div style={{ position: 'absolute', right: 56, top: '50%', transform: 'translateY(-50%)', fontFamily: F, fontSize: 200, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 0.85, pointerEvents: 'none' }}>{String(slide.slideNumber || idx + 1).padStart(2, '0')}</div>
                       <div style={{ padding: '0 56px', position: 'relative', zIndex: 2, maxWidth: '65%' }}>
                           <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: '3px', color: accent, textTransform: 'uppercase' as const, marginBottom: 12 }}>SECTION {slide.slideNumber}</div>
                           <h2 style={{ fontFamily: F, fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15 }}>{titleText}</h2>
                       </div>
                       <SlideNum />
                   </div>
               )}

               {/* ====== ADAPTIVE BODY SLIDE - One flexible renderer for all content types ====== */}
               {/* NXT Humans style: White bg, clean typography, content drives layout */}
               {archetypeLayout !== 'TITLE_SLIDE' && archetypeLayout !== 'SECTION_HEADER' && (
                   <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                       <div style={{ width: '50%', padding: '40px 32px 40px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                           {heroStat && (
                               <div style={{ fontFamily: F, fontSize: 72, fontWeight: 200, color: '#1A1A1A', lineHeight: 1, marginBottom: 12 }}>
                                   {heroStat.value}<span style={{ fontSize: 28, color: accent }}>{heroStat.unit || ''}</span>
                               </div>
                           )}
                           <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.25, marginBottom: 16 }}>{titleText}<span style={{ color: accent }}>.</span></h2>
                           <p style={{ fontFamily: F, fontSize: 12, color: '#888', lineHeight: 1.6 }}>{(slide.content || []).slice(0, 1).map(cleanSlideText).join(' ')}</p>
                       </div>
                       {/* LEFT: Title + Evidence Points */}
                       <div style={{ width: metrics.length > 0 ? '55%' : '100%', padding: '40px 36px 40px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                           {/* Section label */}
                           <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 14 }}>
                               {slide.rationale ? cleanSlideText(slide.rationale).substring(0, 40) : ''}
                           </div>
                           {/* Conclusion title */}
                           <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: fg, lineHeight: 1.25, marginBottom: 20 }}>
                               {titleText}<span style={{ color: accent }}>.</span>
                           </h2>
                           {/* Evidence points - unconstrained, as many as exist */}
                           {(slide.content || []).map((point, i) => (
                               <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                   <div style={{ width: 5, height: 5, borderRadius: '50%', background: getRotatedAccent(i), flexShrink: 0, marginTop: 6 }} />
                                   <p style={{ fontFamily: F, fontSize: 12, color: '#555', lineHeight: 1.6 }}>{cleanSlideText(point)}</p>
                               </div>
                           ))}
                           {/* Problem stat if present */}
                           {slide.problemStat && (
                               <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFF5F5', borderLeft: `3px solid #CC6644`, borderRadius: 2 }}>
                                   <div style={{ fontFamily: F, fontSize: 28, fontWeight: 200, color: '#CC6644', lineHeight: 1 }}>{slide.problemStat.value}<span style={{ fontSize: 12, marginLeft: 3 }}>{slide.problemStat.unit || ''}</span></div>
                                   <div style={{ fontFamily: F, fontSize: 11, color: '#888', marginTop: 4 }}>{slide.problemStat.description}</div>
                               </div>
                           )}
                           {/* Solution points if present */}
                           {(slide.solutionPoints || []).length > 0 && (
                               <div style={{ marginTop: 12 }}>
                                   {slide.solutionPoints!.map((sp, i) => (
                                       <div key={i} style={{ marginBottom: 10 }}>
                                           <div style={{ width: 20, height: 2, background: getRotatedAccent(i), marginBottom: 4 }} />
                                           <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{sp.title}</div>
                                           <div style={{ fontFamily: F, fontSize: 10, color: '#888', lineHeight: 1.4 }}>{sp.description}</div>
                                       </div>
                                   ))}
                               </div>
                           )}
                           {/* Quote if present */}
                           {slide.quote && !metrics.length && (
                               <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 14, marginTop: 14 }}>
                                   <p style={{ fontFamily: F, fontSize: 13, fontStyle: 'italic', color: '#444', lineHeight: 1.6 }}>"{cleanSlideText(slide.quote)}"</p>
                               </div>
                           )}
                           {/* Persona card if present */}
                           {slide.personaName && (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 14px', background: '#FAFAFA', borderRadius: 4 }}>
                                   {slide.personaImageUrl && <img src={slide.personaImageUrl} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
                                   <div>
                                       <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#1A1A1A' }}>{slide.personaName}</div>
                                       {slide.personaRole && <div style={{ fontFamily: F, fontSize: 9, color: '#888' }}>{slide.personaRole}</div>}
                                       {slide.personaQuote && <div style={{ fontFamily: F, fontSize: 9, fontStyle: 'italic', color: '#888', marginTop: 2 }}>"{slide.personaQuote}"</div>}
                                   </div>
                               </div>
                           )}
                       </div>
                       {/* RIGHT: Data panel - metrics, bento cells, or quote (only if data exists) */}
                       {(metrics.length > 0 || (slide.bentoCells || []).length > 0 || (slide.quote && (slide.content || []).length > 0)) && (
                       <div style={{ width: '45%', background: '#FAFAFA', borderLeft: '1px solid #F0F0F0', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                           {/* Metrics */}
                           {metrics.slice(0, 4).map((m, i) => {
                               const a = m.accentColor || getRotatedAccent(i);
                               return (
                                   <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', borderRadius: 6, borderLeft: `3px solid ${a}`, padding: '14px 18px' }}>
                                       <div style={{ fontFamily: F, fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: a, marginBottom: 4 }}>{m.label}</div>
                                       <div style={{ fontFamily: F, fontSize: 28, fontWeight: 200, color: '#1A1A1A', lineHeight: 1 }}>{m.value}<span style={{ fontSize: 12, color: '#888', marginLeft: 3 }}>{m.unit || ''}</span></div>
                                   </div>
                               );
                           })}
                           {/* Bento cells */}
                           {(slide.bentoCells || []).length > 0 && !metrics.length && (
                               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                   {slide.bentoCells!.slice(0, 6).map((cell, i) => (
                                       <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', borderRadius: 4, padding: 12, gridColumn: cell.span === 2 ? 'span 2' : 'span 1' }}>
                                           {cell.type === 'stat' && <>
                                               <div style={{ fontFamily: F, fontSize: 22, fontWeight: 200, color: cell.accentColor || accent, lineHeight: 1 }}>{cell.value}</div>
                                               <div style={{ fontFamily: F, fontSize: 9, color: '#888', marginTop: 4 }}>{cell.label || cell.text}</div>
                                           </>}
                                           {cell.type === 'quote' && <p style={{ fontFamily: F, fontSize: 10, fontStyle: 'italic', color: '#555', lineHeight: 1.4 }}>"{cell.text}"</p>}
                                           {(cell.type === 'indicator' || cell.type === 'list') && <>
                                               <div style={{ fontFamily: F, fontSize: 8, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, marginBottom: 3 }}>{cell.label}</div>
                                               <div style={{ fontFamily: F, fontSize: 10, color: '#555' }}>{cell.text || (cell.items || []).join(', ')}</div>
                                           </>}
                                       </div>
                                   ))}
                               </div>
                           )}
                           {/* Quote in data panel if no metrics/bento */}
                           {slide.quote && !metrics.length && !(slide.bentoCells || []).length && (
                               <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 14 }}>
                                   <p style={{ fontFamily: F, fontSize: 13, fontStyle: 'italic', color: '#444', lineHeight: 1.6 }}>"{cleanSlideText(slide.quote)}"</p>
                               </div>
                           )}
                       </div>
                       )}
                       <FootnoteStrip />
                       <SlideNum />
                   </div>
               )}

               {/* Hover controls */}
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                   <div className="flex gap-2 mb-1">
                       <button onClick={() => deleteSlide(idx)} style={{ background: '#CC6644', color: 'white', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Delete</button>
                       <button onClick={() => startEditingSlide(idx)} style={{ background: 'white', color: '#1A1A1A', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: '1px solid #E8E8E8', cursor: 'pointer' }}>Edit</button>
                   </div>
               </div>
          </div>
      );
  };

  const isOutputSelected = (opt: OutputOption) => result.selectedOutputs?.includes(opt);

  return (
      <div className="bg-[var(--bg-secondary)] min-h-screen relative flex flex-col">
          {/* G-06: NXT Humans Brand Sidebar */}
          <div style={{position:'fixed',left:0,top:0,width:'48px',height:'100vh',background:'#0D0D0D',zIndex:100,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'20px 0'}}>
              <div style={{writingMode:'vertical-rl',textOrientation:'mixed',fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'3px',color:'#fff',transform:'rotate(180deg)'}}>NXT HUMANS</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,6px)',gridTemplateRows:'repeat(3,6px)',gap:'4px'}}>
                  {[...Array(9)].map((_,i) => <span key={i} style={{width:'6px',height:'6px',background:'#B8B800',display:'block'}}></span>)}
              </div>
          </div>
          <div style={{marginLeft:'48px'}} className="flex flex-col flex-1">
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
              <div className="flex-1 flex justify-center">
                  <div className="flex bg-[var(--bg-secondary)] rounded p-1.5 border border-[var(--border-primary)] overflow-x-auto gap-1">
                      {isOutputSelected('PERSONAS') && (result.personas && result.personas.length > 0) && (
                          <button onClick={() => setActiveTab('personas')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'personas' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Personas</button>
                      )}
                      {(result.themes && result.themes.length > 0) && (
                          <button onClick={() => setActiveTab('themes')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'themes' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Themes</button>
                      )}
                      {isOutputSelected('STRATEGY_DECK') && (
                          <button onClick={() => setActiveTab('deck')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deck' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Strategy Deck</button>
                      )}
                      {isOutputSelected('STRATEGIC_RECS') && (
                          <button onClick={() => setActiveTab('strategy')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'strategy' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Recs</button>
                      )}
                      {isOutputSelected('PRD') && <button onClick={() => setActiveTab('prd')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'prd' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>PRD</button>}
                      {isOutputSelected('ROADMAP') && <button onClick={() => setActiveTab('roadmap')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roadmap' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Roadmap</button>}
                      {isOutputSelected('JOURNEY_MAP') && <button onClick={() => setActiveTab('journey')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'journey' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Blueprint</button>}
                      {isOutputSelected('TECH_ARCH') && <button onClick={() => setActiveTab('tech')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tech' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Tech Arch</button>}
                      {isOutputSelected('GAP_ANALYSIS') && <button onClick={() => setActiveTab('gap')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gap' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Gap Analysis</button>}
                      {isOutputSelected('TECH_AUDIT') && <button onClick={() => setActiveTab('techAudit')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'techAudit' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Tech Audit</button>}
                      {isOutputSelected('COMPETITIVE_ANALYSIS') && <button onClick={() => setActiveTab('competitive')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'competitive' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Competitive</button>}
                  </div>
              </div>
              <div className="flex gap-2">
                   <button onClick={handleExportCSV} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">CSV</button>
                   <button onClick={handleDownloadPDF} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">{isExporting ? '...' : 'PDF'}</button>
                   <button onClick={handleExportPPTX} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">{isExporting ? '...' : 'PPTX'}</button>
                   <button onClick={handleExportJSON} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">JSON</button>
                   {result.strategicReport && <button onClick={() => exportStrategicReportHTML(result.strategicReport)} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">Report</button>}
                   <button onClick={handleSaveClick} className="bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide">Save</button>
                   <button onClick={onReset} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">New</button>
              </div>
          </div>
          <div className="flex-1 overflow-auto p-8">
              <div ref={contentRef} className="max-w-7xl mx-auto bg-[var(--bg-primary)] p-8 rounded shadow-sm border border-[var(--border-primary)] min-h-[80vh]">
                  {activeTab === 'personas' && (
                      <div className="space-y-8">
                          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2rem',letterSpacing:'0.5px',color:'#0D0D0D'}} className="mb-8 border-b pb-4">ARCHETYPES & PERSONAS</h2>
                          <div className="grid grid-cols-1 gap-8">
                              {(personasData || []).map((p: any, i: number) => (
                                  <div key={i}>
                                  <div className="persona-card" style={{display:'grid',gridTemplateColumns:'240px 1fr',border:'1px solid #E0E0E0',overflow:'visible',minHeight:'420px'}}>
                                      {/* LEFT: Identity Panel - NXT Humans Design System */}
                                      <div style={{background:'#0D0D0D',color:'#fff',display:'flex',flexDirection:'column'}}>
                                          <div style={{width:'100%',height:'240px',position:'relative',overflow:'hidden'}}>
                                              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',filter:'grayscale(100%) contrast(1.2) brightness(0.95)',display:'block',borderRadius:0}} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#999'}}>Generating...</div>}
                                              <div className="absolute bottom-1 right-1">
                                                  <button onClick={() => handleRegeneratePersonaImage(i, activeVisStyle)} className="bg-black/60 text-white text-[8px] px-1.5 py-0.5 hover:bg-black/80">Regen</button>
                                              </div>
                                          </div>
                                          <div style={{padding:'18px',flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                                              <div>
                                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'9px',letterSpacing:'4px',color:'#B8B800'}}>PERSONA</div>
                                                  <textarea value={p.name} onChange={e => updatePersonaField(i, 'name', e.target.value)} rows={2} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',lineHeight:'1.05',color:'#fff',background:'transparent',border:'none',outline:'none',width:'100%',letterSpacing:'0.5px',marginTop:'4px',resize:'none',overflow:'hidden'}} />
                                                  <input value={p.role} onChange={e => updatePersonaField(i, 'role', e.target.value)} style={{fontSize:'11px',color:'#999',background:'transparent',border:'none',outline:'none',width:'100%',marginTop:'8px',lineHeight:'1.4'}} />
                                                  {p.demographics && <div style={{fontSize:'10px',color:'#666',marginTop:'4px'}}>{p.demographics}</div>}
                                              </div>
                                              <div style={{display:'grid',gridTemplateColumns:'repeat(3,5px)',gridTemplateRows:'repeat(3,5px)',gap:'3px',marginTop:'auto'}}>
                                                  {[...Array(9)].map((_,di) => <span key={di} style={{width:'5px',height:'5px',background:'#B8B800',display:'block'}}></span>)}
                                              </div>
                                          </div>
                                      </div>
                                      {/* RIGHT: Content Panel - STARK WHITE */}
                                      <div style={{background:'#FFFFFF',padding:'24px 28px',display:'flex',flexDirection:'column',gap:'16px'}}>
                                          {/* Quote */}
                                          <div style={{fontSize:'14px',fontStyle:'italic',color:'#666',paddingLeft:'14px',borderLeft:'3px solid #B8B800',lineHeight:'1.6'}}>
                                              <textarea value={p.quote} onChange={e => updatePersonaField(i, 'quote', e.target.value)} style={{width:'100%',background:'transparent',border:'none',outline:'none',fontStyle:'italic',fontSize:'14px',color:'#666',lineHeight:'1.6',resize:'none'}} rows={2} />
                                          </div>
                                          {/* JTBD */}
                                          {p.jtbd && (
                                              <div style={{background:'#F5F5F0',padding:'14px 16px'}}>
                                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'10px',letterSpacing:'2px',color:'#999',marginBottom:'5px'}}>JOBS TO BE DONE</div>
                                                  <div style={{fontSize:'13px',color:'#333',lineHeight:'1.55'}}>{p.jtbd}</div>
                                              </div>
                                          )}
                                          {/* Behavioral Attributes - no arbitrary scores */}
                                          {p.attributes && p.attributes.length > 0 && (
                                              <div>
                                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'2px',color:'#999',marginBottom:'6px'}}>BEHAVIORAL PROFILE</div>
                                                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                                                      {p.attributes.map((attr: any, ai: number) => (
                                                          <div key={ai} style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                                                              <div style={{width:'4px',minHeight:'100%',background: ai % 3 === 0 ? '#B8B800' : ai % 3 === 1 ? '#00B7C3' : '#CC6644',borderRadius:'2px',flexShrink:0,alignSelf:'stretch'}}></div>
                                                              <div style={{flex:1,minWidth:0}}>
                                                                  <div style={{fontSize:'10px',fontWeight:700,color:'#0D0D0D',textTransform:'uppercase',letterSpacing:'0.5px'}}>{attr.name?.replace(/_/g,' ')}</div>
                                                                  <div style={{fontSize:'11px',color:'#666',lineHeight:'1.4',marginTop:'1px'}}>{attr.behavior || attr.score || ''}</div>
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                          {/* Goals (Cooper 3-tier) */}
                                          {p.goals && (
                                              <div>
                                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'2px',color:'#999',marginBottom:'6px'}}>COOPER GOAL HIERARCHY</div>
                                                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                                                      {[
                                                          {label:'Life Goal',value:p.goals.lifeGoal},
                                                          {label:'Experience Goal',value:p.goals.experienceGoal},
                                                          {label:'Functional Goal',value:p.goals.functionalGoal},
                                                      ].map((g,gi) => (
                                                          <div key={gi} style={{fontSize:'12px',lineHeight:'1.45'}}>
                                                              <strong style={{color:'#0D0D0D',fontWeight:600,display:'block',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'2px'}}>{g.label}</strong>
                                                              <span style={{color:'#666'}}>{g.value || '--'}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                          {/* Bio - with clickable citation traceability (P5-02) */}
                                          <div style={{fontSize:'13px',color:'#666',lineHeight:'1.6',whiteSpace:'pre-wrap',maxHeight:'120px',overflowY:'auto',padding:'4px 0'}}>{renderWithCitations(p.bio || '', handleCitationClick)}</div>
                                          {/* Confidence Badge */}
                                          <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'11px',color:'#999',marginTop:'auto',paddingTop:'10px',borderTop:'1px solid #E0E0E0'}}>
                                              <span style={{display:'inline-block',fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',padding:'2px 8px',letterSpacing:'1px',background: p.confidenceLevel === 'EVIDENCED' ? '#E8F6F7' : p.confidenceLevel === 'HYPOTHESIS' ? '#FFF8E1' : '#F5F5F0', color: p.confidenceLevel === 'EVIDENCED' ? '#00706B' : p.confidenceLevel === 'HYPOTHESIS' ? '#8A8A00' : '#666'}}>{p.confidenceLevel || 'UNSCORED'}</span>
                                              <span>{p.evidenceCount ? `Based on ${p.evidenceCount} evidence sources` : ''}</span>
                                          </div>
                                      </div>
                                  </div>
                                  {/* FIVE Ws - below the card */}
                                  {p.fiveWs && (
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 bg-[var(--bg-secondary)] border-t border-b border-[var(--border-primary)]">
                                              {[
                                                  { label: 'Who (Their World)', value: p.fiveWs.who, color: '#115054' },
                                                  { label: 'What (Core Tension)', value: p.fiveWs.what, color: '#fd8e2e' },
                                                  { label: 'When/Where (Context)', value: p.fiveWs.whenWhere, color: '#00b1eb' },
                                                  { label: 'Why (Deep Motivation)', value: p.fiveWs.why, color: '#caca20' },
                                              ].map((w, wi) => (
                                                  <div key={wi} className="text-xs" style={{ borderLeft: `3px solid ${w.color}`, paddingLeft: '8px' }}>
                                                      <div className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: w.color }}>{w.label}</div>
                                                      <div className="text-[var(--text-secondary)] leading-snug">{w.value || '-'}</div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}

                                      {/* MOTIVATIONS + PAIN POINTS + TASKS + OPPORTUNITIES */}
                                      <div className="grid md:grid-cols-2 gap-0">
                                          {/* Motivations */}
                                          {Array.isArray(p.motivations) && p.motivations.length > 0 && (
                                              <div className="p-5 border-r border-b border-[var(--border-primary)]">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#0CCE6B] mb-3">Motivations ({p.motivations.length})</div>
                                                  <div className="space-y-2">
                                                      {p.motivations.map((m: any, mi: number) => (
                                                          <div key={mi} className="text-xs">
                                                              <div className="font-bold text-[var(--text-primary)]">{m.label}</div>
                                                              {m.quote && <div className="text-[var(--text-tertiary)] italic mt-0.5 text-[11px]">"{m.quote}"</div>}
                                                              {(m.source || m.citation?.sourceName) && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{m.source || `${m.citation?.sourceFile || ''} - ${m.citation?.sourceName || ''}`}</div>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          {/* Pain Points */}
                                          {Array.isArray(p.painPoints) && p.painPoints.length > 0 && (
                                              <div className="p-5 border-b border-[var(--border-primary)]">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#FF5A5A] mb-3">Pain Points ({p.painPoints.length})</div>
                                                  <div className="space-y-2">
                                                      {p.painPoints.map((pp: any, pi: number) => (
                                                          <div key={pi} className="text-xs">
                                                              <div className="font-bold text-[var(--text-primary)]">{pp.label}</div>
                                                              {pp.quote && <div className="text-[var(--text-tertiary)] italic mt-0.5 text-[11px]">"{pp.quote}"</div>}
                                                              {(pp.source || pp.citation?.sourceName) && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{pp.source || `${pp.citation?.sourceFile || ''} - ${pp.citation?.sourceName || ''}`}</div>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          {/* Tasks */}
                                          {p.tasks && p.tasks.length > 0 && (
                                              <div className="p-5 border-r border-[var(--border-primary)]">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#00b1eb] mb-3">Key Tasks ({p.tasks.length})</div>
                                                  <div className="space-y-1.5">
                                                      {p.tasks.map((t: any, ti: number) => (
                                                          <div key={ti} className="text-xs flex items-start gap-2">
                                                              <span className="text-[#00b1eb] mt-0.5">-</span>
                                                              <span>{t.label}{t.quote ? `: "${t.quote}"` : ''}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          {/* Opportunities */}
                                          {p.opportunities && p.opportunities.length > 0 && (
                                              <div className="p-5">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-3">Opportunities ({p.opportunities.length})</div>
                                                  <div className="space-y-2">
                                                      {p.opportunities.map((o: any, oi: number) => (
                                                          <div key={oi} className="text-xs">
                                                              <div className="font-bold text-[var(--text-primary)]">{o.label}</div>
                                                              {o.quote && <div className="text-[var(--text-tertiary)] italic mt-0.5 text-[11px]">"{o.quote}"</div>}
                                                              {(o.source || o.citation?.sourceName) && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{o.source || `${o.citation?.sourceFile || ''} - ${o.citation?.sourceName || ''}`}</div>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                      {/* PERSONA-01: Extended persona sections */}
                                      {(p.behaviors || p.technologyUsage || p.journeyContext || p.dayInTheLife || p.brandRelationships || p.communicationPrefs || p.decisionProcess) && (
                                          <div className="grid md:grid-cols-2 gap-0 border-t border-[var(--border-primary)]">
                                              {[
                                                  { key: 'behaviors', label: 'Behaviors & Habits', color: '#7c3aed' },
                                                  { key: 'technologyUsage', label: 'Technology Usage', color: '#0891b2' },
                                                  { key: 'journeyContext', label: 'Journey Context', color: '#115054' },
                                                  { key: 'dayInTheLife', label: 'Day in the Life', color: '#fd8e2e' },
                                                  { key: 'brandRelationships', label: 'Brand Relationships', color: '#B8B800' },
                                                  { key: 'communicationPrefs', label: 'Communication Preferences', color: '#00b1eb' },
                                                  { key: 'decisionProcess', label: 'Decision-Making Process', color: '#FF5A5A' },
                                              ].filter(s => (p as any)[s.key]).map((section, si) => (
                                                  <div key={si} className="p-4 border-b border-r border-[var(--border-primary)]">
                                                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: section.color }}>{section.label}</div>
                                                      <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{(p as any)[section.key]}</div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {/* ====== THEMES TAB (KI-008) ====== */}
                  {activeTab === 'themes' && result.themes && result.themes.length > 0 && (
                      <div className="space-y-8">
                          <div>
                              <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>THEMATIC ANALYSIS</div>
                              <h2 style={{ fontFamily: FONT.primary, fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Research Themes<span style={{ color: '#B8B800' }}>.</span></h2>
                              <p style={{ fontFamily: FONT.primary, fontSize: 13, color: '#888', marginBottom: 4 }}>{result.themes.length} themes extracted from source corpus</p>
                          </div>
                          {/* 2026-06-05 - Bug 3 fix. Was grid-cols-1 (one tall column,
                              user perceived as "thin wall"). Now 3 columns wide on
                              large screens, 2 on medium, 1 on mobile - 23 themes
                              produces ~8 rows of substantial cards on desktop. */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {result.themes.map((theme: Theme, ti: number) => {
                                  const statusColor = theme.status === 'priority' ? '#B8B800' : theme.status === 'approved' ? '#00B7C3' : theme.status === 'skipped' ? '#999' : '#888';
                                  const statusBg = theme.status === 'priority' ? '#B8B80015' : theme.status === 'approved' ? '#00B7C315' : theme.status === 'skipped' ? '#99999915' : '#88888815';
                                  const statusLabel = theme.status ? theme.status.toUpperCase() : 'UNSCORED';
                                  return (
                                      <div key={ti} style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: 8, borderTop: `3px solid ${statusColor}`, overflow: 'hidden' }}>
                                          {/* Header: name + badges */}
                                          <div style={{ padding: '20px 24px 16px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                              <div style={{ flex: 1 }}>
                                                  <div style={{ fontFamily: FONT.primary, fontSize: 18, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3, marginBottom: 4 }}>{theme.name}</div>
                                              </div>
                                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 3, background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '1px' }}>{statusLabel}</span>
                                                  {theme.isCrossDocument && (
                                                      <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 3, background: '#E0E7FF', color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cross-Document</span>
                                                  )}
                                              </div>
                                          </div>
                                          {/* Description */}
                                          <div style={{ padding: '0 24px 16px 24px' }}>
                                              <p style={{ fontFamily: FONT.primary, fontSize: 14, color: '#444', lineHeight: 1.65 }}>{cleanText(theme.description)}</p>
                                          </div>
                                          {/* Primary Quote */}
                                          {theme.quote && (
                                              <div style={{ margin: '0 24px 16px 24px', padding: '12px 16px', borderLeft: '3px solid #B8B800', background: '#FFFFFF', borderRadius: '0 4px 4px 0' }}>
                                                  <p style={{ fontFamily: FONT.primary, fontSize: 13, fontStyle: 'italic', color: '#666', lineHeight: 1.6 }}>"{cleanText(theme.quote)}"</p>
                                              </div>
                                          )}
                                          {/* Citations */}
                                          {theme.citations && theme.citations.length > 0 && (
                                              <div style={{ padding: '0 24px 20px 24px' }}>
                                                  <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>SUPPORTING EVIDENCE ({theme.citations.length})</div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                      {theme.citations.map((c: Citation, ci: number) => (
                                                          <div key={ci} style={{ padding: '10px 14px', background: '#FFFFFF', border: '1px solid #F0F0F0', borderRadius: 6, borderLeft: '2px solid #00B7C3' }}>
                                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                  <span style={{ fontFamily: FONT.primary, fontSize: 12, fontWeight: 600, color: '#115054' }}>{c.sourceName || c.sourceFile}</span>
                                                                  {c.author && <span style={{ fontFamily: FONT.primary, fontSize: 11, color: '#888' }}>by {c.author}</span>}
                                                                  {c.publicationDate && <span style={{ fontFamily: FONT.primary, fontSize: 11, color: '#AAA' }}>{c.publicationDate}</span>}
                                                              </div>
                                                              {c.text && <p style={{ fontFamily: FONT.primary, fontSize: 12, fontStyle: 'italic', color: '#666', lineHeight: 1.5 }}>"{cleanText(c.text)}"</p>}
                                                              {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT.primary, fontSize: 10, color: '#00B7C3', textDecoration: 'underline', marginTop: 4, display: 'inline-block' }}>{c.url}</a>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}
                  {activeTab === 'deck' && (
                      <div className="space-y-16">
                          {slides.map((slide, i) => renderSlidePreview(slide, i))}
                      </div>
                  )}
                  {activeTab === 'roadmap' && roadmapData && (
                      <div className="space-y-8">
                          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2rem',letterSpacing:'0.5px',color:'#0D0D0D'}} className="mb-4 border-b pb-4">STRATEGIC ROADMAP</h2>
                          <div className="grid grid-cols-3 gap-0" style={{border:'1px solid #E0E0E0'}}>
                              {[
                                  {horizon:'Now',label:'NOW (0-3 months)',confidence:'HIGH CONFIDENCE',bg:'#FFFFFF'},
                                  {horizon:'Next',label:'NEXT (3-9 months)',confidence:'MEDIUM CONFIDENCE',bg:'#FAFAFA'},
                                  {horizon:'Later',label:'LATER (9-18 months)',confidence:'EXPLORATORY',bg:'#F5F5F0'},
                              ].map(({horizon,label,confidence,bg}) => (
                                  <div key={horizon} style={{background:bg,padding:'24px',borderRight:'1px solid #E0E0E0'}}>
                                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'3px',color:'#999',marginBottom:'4px'}}>{label}</div>
                                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',letterSpacing:'1px',padding:'2px 6px',display:'inline-block',background: horizon==='Now' ? '#B8B800' : horizon==='Next' ? '#E0E0E0' : '#F5F5F0', color: horizon==='Now' ? '#0D0D0D' : '#999',marginBottom:'16px', border: horizon==='Later' ? '1px dashed #CCC' : 'none'}}>{confidence}</div>
                                      <div className="space-y-4">
                                          {(roadmapData.items || []).filter((i: any) => i.horizon === horizon).map((item: any, idx: number) => (
                                              <div key={idx} style={{borderLeft:'3px solid #B8B800',paddingLeft:'12px',paddingBottom:'12px',borderBottom:'1px solid #E0E0E0'}}>
                                                  <input value={item.initiative || ''} onChange={(e) => { const rIdx = (roadmapData.items || []).findIndex((x: any) => x === item); updateRoadmapItem(rIdx, 'initiative', e.target.value); }} style={{fontWeight:700,fontSize:'14px',background:'transparent',width:'100%',border:'none',outline:'none',color:'#0D0D0D',marginBottom:'4px'}} />
                                                  <textarea value={item.description || ''} onChange={(e) => { const rIdx = (roadmapData.items || []).findIndex((x: any) => x === item); updateRoadmapItem(rIdx, 'description', e.target.value); }} style={{fontSize:'12px',color:'#666',background:'transparent',width:'100%',resize:'vertical',border:'none',outline:'none',lineHeight:'1.5',minHeight:'60px'}} />
                                                  {item.successMetric && <div style={{fontSize:'11px',color:'#B8B800',fontFamily:"'JetBrains Mono',monospace",marginTop:'4px'}}>{item.successMetric}</div>}
                                                  {item.owner && <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>Owner: {item.owner}</div>}
                                                  <EvidenceBlock citations={(item as any).citations} evidenceBasis={(item as any).evidenceBasis} />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {activeTab === 'prd' && prdData && (
                      // Stage 3.8 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, finding F1 shape 1):
                      // the pipeline PRD tab reads DESIGN TOKENS (never literal hex or a dropped display face)
                      // and, when the result carries the one PRD contract (PrdAir), renders the SAME
                      // two-tier document projection the chat path ships. The legacy sixteen-section
                      // face stays only as the fallback for records produced before PrdAir existed.
                      <div className="space-y-8">
                          {isPrdAir((prdData as any).prdAir) ? (
                              <iframe
                                  title="Product requirements document"
                                  srcDoc={projectPrdAirToHtml((prdData as any).prdAir)}
                                  style={{ width: '100%', minHeight: '82vh', border: '1px solid var(--color-border-primary)', background: 'var(--card-bg)' }}
                              />
                          ) : (
                          <>
                          <h2 style={{ fontFamily: 'var(--font-primary)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }} className="mb-4 border-b pb-4 border-[var(--color-border-primary)]">Product requirements document</h2>
                          <div style={{ border: '1px solid var(--color-border-primary)', padding: '28px', background: 'var(--card-bg)' }}>
                              <h3 style={{ fontFamily: 'var(--font-primary)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text-primary)', letterSpacing: '0.01em' }}>{prdData.title}</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginTop: '24px' }}>
                                  <div style={{ paddingRight: '24px', borderRight: '1px solid var(--color-border-primary)' }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>Purpose and objectives</div>
                                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.65' }}>{prdData.purposeAndObjectives}</p>
                                  </div>
                                  <div style={{ paddingLeft: '24px' }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>Target audience</div>
                                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.65' }}>{prdData.targetAudience || 'See the Personas tab for the archetypes this document serves.'}</p>
                                  </div>
                              </div>
                              <div className="mt-8">
                                  <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-4">Features</h4>
                                  <div className="space-y-4">
                                      {(prdData.features || []).map((feature, idx) => {
                                          const tierRule = feature.priority === 'Must-have' ? 'var(--color-accent-chartreuse)' : feature.priority === 'Should-have' ? 'var(--color-accent-cyan)' : 'var(--color-border-primary)';
                                          const pillBg = feature.priority === 'Must-have' ? 'var(--color-accent-chartreuse)' : feature.priority === 'Should-have' ? 'var(--color-accent-cyan-bg)' : 'var(--bg-tertiary)';
                                          const pillFg = feature.priority === 'Must-have' ? 'var(--nxt-black)' : feature.priority === 'Should-have' ? 'var(--nxt-teal)' : 'var(--color-text-tertiary)';
                                          return (
                                          <div key={idx} style={{ border: '1px solid var(--color-border-primary)', padding: '16px', borderLeft: `4px solid ${tierRule}` }}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <input value={feature.name || ''} onChange={(e) => updatePRDFeature(idx, 'name', e.target.value)} style={{ fontWeight: 700, fontSize: '15px', background: 'transparent', outline: 'none', width: '100%', color: 'var(--color-text-primary)' }} />
                                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '2px 8px', letterSpacing: '1px', whiteSpace: 'nowrap', marginLeft: '12px', background: pillBg, color: pillFg }}>{feature.priority?.toUpperCase() || 'UNRANKED'}</span>
                                              </div>
                                              <textarea value={feature.description || ''} onChange={(e) => updatePRDFeature(idx, 'description', e.target.value)} className="w-full bg-transparent text-sm text-[var(--text-secondary)] outline-none resize-none h-16" />
                                              {(feature.userStories && feature.userStories.length > 0) && (
                                              <div className="mt-2">
                                                  <h5 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">User stories</h5>
                                                  <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] mt-1">
                                                      {feature.userStories.map((story, i) => <li key={i}>{story}</li>)}
                                                  </ul>
                                              </div>
                                              )}
                                              {feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0 && (
                                              <div className="mt-2">
                                                  <h5 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Acceptance criteria</h5>
                                                  <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] mt-1">
                                                      {(feature.acceptanceCriteria as string[]).map((ac, i) => <li key={i}>{ac}</li>)}
                                                  </ul>
                                              </div>
                                              )}
                                              {feature.citation && (
                                              <div className="mt-2 text-xs text-[var(--text-tertiary)] italic border-t border-[var(--border-secondary)] pt-2">Source: {feature.citation}</div>
                                              )}
                                              <EvidenceBlock citations={(feature as any).citations} evidenceBasis={(feature as any).evidenceBasis} />
                                          </div>
                                          );
                                      })}
                                  </div>
                              </div>
                              {prdData.sections && prdData.sections.length > 0 && (
                                  <div className="mt-8 space-y-4">
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '2px', color: 'var(--color-text-tertiary)', borderTop: '2px solid var(--color-border-primary)', paddingTop: '16px', textTransform: 'uppercase' }}>Document sections</div>
                                      {prdData.sections.map((section: any, si: number) => (
                                          <div key={si} style={{ border: '1px solid var(--color-border-primary)', padding: '16px 20px' }}>
                                              <div className="flex items-baseline gap-3 mb-2">
                                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-accent-chartreuse)', fontWeight: 700 }}>{String(section.sectionNumber || si + 1).padStart(2, '0')}</span>
                                                  <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{section.title}</h5>
                                              </div>
                                              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{section.content}</p>
                                          </div>
                                      ))}
                                  </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Success signals</h4>
                                      <ul className="list-disc list-inside text-[var(--text-secondary)]">
                                          {(prdData.successMetrics || []).map((metric, i) => <li key={i}>{metric}</li>)}
                                      </ul>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Risks and assumptions</h4>
                                      <ul className="list-disc list-inside text-[var(--text-secondary)]">
                                          {[...(prdData.risks || []), ...(prdData.assumptions || [])].map((item, i) => <li key={i}>{item}</li>)}
                                      </ul>
                                  </div>
                              </div>
                          </div>
                          </>
                          )}
                      </div>
                  )}
                  {activeTab === 'journey' && journeyData && (() => {
                      const emotionColors: Record<string, string> = { 'Delighted': '#0CCE6B', 'Positive': '#00b1eb', 'Neutral': '#acacac', 'Negative': '#fd8e2e', 'Frustrated': '#FF5A5A' };
                      const emotionYMap: Record<string, number> = { 'Delighted': 20, 'Positive': 40, 'Neutral': 60, 'Negative': 80, 'Frustrated': 95 };
                      const getEmotionY = (e: string) => emotionYMap[e] ?? emotionYMap[e?.charAt(0)?.toUpperCase() + e?.slice(1)] ?? 60;
                      const getEmotionColor = (e: string) => emotionColors[e] ?? emotionColors[e?.charAt(0)?.toUpperCase() + e?.slice(1)] ?? '#acacac';
                      // TRUNC-01: Wider columns to prevent text truncation. NO .substring() anywhere.
                      const colW = 280;
                      const labelW = 120;
                      const svgW = journeyData.length * colW + labelW + 20;
                      const allActors = [...new Set(journeyData.flatMap((s: any) => s.actors || []))];
                      // NXT Humans semantic actor palette: teal primary, then graduated neutral-professional tones
                      const actorColors = ['#115054', '#1a6b70', '#2d8a8e', '#3a7ca5', '#4a6fa5', '#5a6478'];
                      // Lane heights expanded to fit full text content
                      const laneH = 48;
                      const actorLaneH = 28;
                      // Computed Y offsets for each lane
                      const emotionTop = 38;
                      const emotionH = 80;
                      const touchpointTop = emotionTop + emotionH + 8;
                      const actorsTop = touchpointTop + laneH + 4;
                      const frontstageTop = actorsTop + allActors.length * actorLaneH + 8;
                      const lovTop = frontstageTop + laneH + 8;
                      const backstageTop = lovTop + 14;
                      const painTop = backstageTop + laneH + 8;
                      const supportTop = painTop + laneH + 8;
                      const legendTop = supportTop + laneH + 16;
                      const svgH = legendTop + 24;

                      return (
                      <div className="space-y-6">
                          <h2 className="text-3xl font-black border-b pb-4">Service Blueprint</h2>

                          {/* === SVG SERVICE BLUEPRINT VISUALIZATION === */}
                          <div className="diagram-container overflow-x-auto border border-[var(--border-primary)] rounded bg-white p-4" style={{overflowX:'auto'}}>
                              <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="font-sans">
                                  {/* Column headers - stage names - FULL TEXT, no truncation */}
                                  {journeyData.map((s: any, i: number) => (
                                      <g key={`h${i}`}>
                                          <rect x={labelW + i * colW} y={0} width={colW - 4} height={32} rx={4} fill={s.momentOfTruth ? '#FF5A5A' : '#115054'} />
                                          <foreignObject x={labelW + i * colW + 4} y={2} width={colW - 12} height={28}>
                                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'white', lineHeight: '1.3', textAlign: 'center', wordWrap: 'break-word', overflow: 'visible' }}>{s.phase || ''}{s.momentOfTruth ? ' [MOT]' : ''}</div>
                                          </foreignObject>
                                      </g>
                                  ))}

                                  {/* EMOTION CURVE - labeled data points with color fills */}
                                  <text x={10} y={emotionTop + 20} fontSize="7" fontWeight="bold" fill="#115054">EMOTION</text>
                                  <rect x={labelW - 5} y={emotionTop} width={journeyData.length * colW + 5} height={emotionH} rx={4} fill="#fafafa" stroke="#e5e5e5" />
                                  {/* Positive zone (green tint above neutral) */}
                                  <rect x={labelW - 5} y={emotionTop} width={journeyData.length * colW + 5} height={40} rx={4} fill="rgba(12,206,107,0.06)" />
                                  {/* Negative zone (red tint below neutral) */}
                                  <rect x={labelW - 5} y={emotionTop + 40} width={journeyData.length * colW + 5} height={40} fill="rgba(255,90,90,0.06)" />
                                  <line x1={labelW} y1={emotionTop + 40} x2={labelW - 5 + journeyData.length * colW} y2={emotionTop + 40} stroke="#e5e5e5" strokeDasharray="3,3" />
                                  <polyline fill="none" stroke="#115054" strokeWidth="2.5" strokeLinejoin="round"
                                      points={journeyData.map((s: any, i: number) => `${labelW + i * colW + (colW - 4) / 2},${emotionTop + getEmotionY(s.emotion) * 0.8}`).join(' ')} />
                                  {journeyData.map((s: any, i: number) => {
                                      const cx = labelW + i * colW + (colW - 4) / 2;
                                      const cy = emotionTop + getEmotionY(s.emotion) * 0.8;
                                      return (
                                          <g key={`ec${i}`}>
                                              <circle cx={cx} cy={cy} r={6} fill={getEmotionColor(s.emotion)} stroke="white" strokeWidth="2" />
                                              <text x={cx} y={cy + 16} textAnchor="middle" fontSize="8" fontWeight="600" fill={getEmotionColor(s.emotion)}>{s.emotion || ''}</text>
                                          </g>
                                      );
                                  })}

                                  {/* TOUCHPOINTS ROW - full text, word-wrap */}
                                  <text x={10} y={touchpointTop + 14} fontSize="7" fontWeight="bold" fill="#525252">TOUCHPOINTS</text>
                                  {journeyData.map((s: any, i: number) => (
                                      <foreignObject key={`tp${i}`} x={labelW + i * colW} y={touchpointTop} width={colW - 8} height={laneH}>
                                          <div style={{ fontSize: '8px', color: '#525252', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.touchpoint || ''}</div>
                                      </foreignObject>
                                  ))}

                                  {/* ACTOR LANES - full names and full action text */}
                                  {allActors.map((actor: string, ai: number) => {
                                      const y = actorsTop + ai * actorLaneH;
                                      return (
                                          <g key={`a${ai}`}>
                                              <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill={actorColors[ai % actorColors.length]}>{String(actor || '')}</text>
                                              {journeyData.map((s: any, si: number) => {
                                                  const involved = (s.actors || []).includes(actor);
                                                  const actorAction = involved && s.actorActions ? (s.actorActions[actor] || '') : '';
                                                  return (
                                                      <g key={`ar${si}`}>
                                                          <rect x={labelW + si * colW + 2} y={y} width={colW - 12} height={actorLaneH - 4} rx={3}
                                                              fill={involved ? actorColors[ai % actorColors.length] + '20' : '#f9fafb'} stroke={involved ? actorColors[ai % actorColors.length] : '#e5e7eb'} strokeWidth="1" />
                                                          <foreignObject x={labelW + si * colW + 6} y={y + 2} width={colW - 20} height={actorLaneH - 6}>
                                                              <div style={{ fontSize: '7px', color: involved ? actorColors[ai % actorColors.length] : '#d1d5db', lineHeight: '1.4', textAlign: 'center', fontWeight: involved ? 600 : 400, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                                  {involved ? (actorAction || String(actor)) : '---'}
                                                              </div>
                                                          </foreignObject>
                                                      </g>
                                                  );
                                              })}
                                          </g>
                                      );
                                  })}

                                  {/* FRONTSTAGE LANE - full text */}
                                  {(() => { const y = frontstageTop; return (
                                      <g>
                                          <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill="#00b1eb">FRONTSTAGE</text>
                                          <rect x={labelW - 5} y={y} width={journeyData.length * colW + 5} height={laneH} rx={4} fill="#eff6ff" stroke="#bfdbfe" />
                                          {journeyData.map((s: any, i: number) => (
                                              <foreignObject key={`fs${i}`} x={labelW + i * colW} y={y + 3} width={colW - 8} height={laneH - 6}>
                                                  <div style={{ fontSize: '8px', color: '#1e40af', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.frontstageAction || ''}</div>
                                              </foreignObject>
                                          ))}
                                      </g>
                                  ); })()}

                                  {/* LINE OF VISIBILITY */}
                                  {(() => { const y = lovTop; return (
                                      <g>
                                          <line x1={0} y1={y} x2={svgW} y2={y} stroke="#caca20" strokeWidth="2" strokeDasharray="8,4" />
                                          <text x={svgW / 2} y={y - 3} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#caca20">LINE OF VISIBILITY</text>
                                      </g>
                                  ); })()}

                                  {/* BACKSTAGE LANE - full text */}
                                  {(() => { const y = backstageTop; return (
                                      <g>
                                          <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill="#115054">BACKSTAGE</text>
                                          <rect x={labelW - 5} y={y} width={journeyData.length * colW + 5} height={laneH} rx={4} fill="#f0fdfa" stroke="#99f6e4" />
                                          {journeyData.map((s: any, i: number) => (
                                              <foreignObject key={`bs${i}`} x={labelW + i * colW} y={y + 3} width={colW - 8} height={laneH - 6}>
                                                  <div style={{ fontSize: '8px', color: '#134e4a', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.backstageAction || ''}</div>
                                              </foreignObject>
                                          ))}
                                      </g>
                                  ); })()}

                                  {/* PAIN POINTS LANE - full text */}
                                  {(() => { const y = painTop; return (
                                      <g>
                                          <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill="#FF5A5A">PAIN POINTS</text>
                                          <rect x={labelW - 5} y={y} width={journeyData.length * colW + 5} height={laneH} rx={4} fill="#fef2f2" stroke="#fecaca" />
                                          {journeyData.map((s: any, i: number) => (
                                              <foreignObject key={`pp${i}`} x={labelW + i * colW} y={y + 3} width={colW - 8} height={laneH - 6}>
                                                  <div style={{ fontSize: '8px', color: '#991b1b', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.painPoint || ''}</div>
                                              </foreignObject>
                                          ))}
                                      </g>
                                  ); })()}

                                  {/* SUPPORT PROCESSES LANE - full text */}
                                  {(() => { const y = supportTop; return (
                                      <g>
                                          <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill="#6b7280">SUPPORT</text>
                                          {journeyData.map((s: any, i: number) => (
                                              <foreignObject key={`sp${i}`} x={labelW + i * colW} y={y} width={colW - 8} height={laneH}>
                                                  <div style={{ fontSize: '8px', color: '#6b7280', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.supportProcesses || ''}</div>
                                              </foreignObject>
                                          ))}
                                      </g>
                                  ); })()}

                                  {/* TECHNOLOGY SYSTEMS LANE - new per audit B-05 */}
                                  {journeyData.some((s: any) => s.technologySystems) && (() => { const y = supportTop + laneH + 4; return (
                                      <g>
                                          <text x={10} y={y + 14} fontSize="7" fontWeight="bold" fill="#7c3aed">TECH SYSTEMS</text>
                                          {journeyData.map((s: any, i: number) => (
                                              <foreignObject key={`ts${i}`} x={labelW + i * colW} y={y} width={colW - 8} height={laneH}>
                                                  <div style={{ fontSize: '8px', color: '#7c3aed', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{s.technologySystems || ''}</div>
                                              </foreignObject>
                                          ))}
                                      </g>
                                  ); })()}

                                  {/* Legend */}
                                  <g transform={`translate(10, ${legendTop})`}>
                                      {[{ label: 'Delighted', color: '#0CCE6B' }, { label: 'Positive', color: '#00b1eb' }, { label: 'Neutral', color: '#acacac' }, { label: 'Negative', color: '#fd8e2e' }, { label: 'Frustrated', color: '#FF5A5A' }].map((e, i) => (
                                          <g key={i} transform={`translate(${i * 80}, 0)`}>
                                              <circle cx={5} cy={5} r={4} fill={e.color} />
                                              <text x={14} y={8} fontSize="7" fill="#525252">{e.label}</text>
                                          </g>
                                      ))}
                                      <rect x={420} y={0} width={12} height={3} fill="#caca20" />
                                      <text x={436} y={7} fontSize="7" fill="#525252">Line of Visibility</text>
                                      <circle cx={530} cy={5} r={4} fill="#FF5A5A" />
                                      <text x={539} y={8} fontSize="7" fill="#525252">Moment of Truth</text>
                                  </g>
                              </svg>
                          </div>

                          {/* === DETAIL CARDS (editable) === */}
                          <h3 className="text-xl font-bold border-b pb-2">Stage Details</h3>
                          <div className="details-container overflow-x-auto pb-4">
                              <div className="inline-flex gap-4 min-w-full">
                                  {journeyData.map((stage: any, idx: number) => (
                                      <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-4 shadow-sm min-w-[280px] flex-1 flex flex-col" style={{ borderTopWidth: 3, borderTopColor: getEmotionColor(stage.emotion) }}>
                                          <input value={stage.phase} onChange={(e) => updateJourneyStage(idx, 'phase', e.target.value)} className="font-bold text-sm bg-transparent outline-none w-full text-[var(--nxt-teal)] mb-2" />

                                          {/* Actors */}
                                          {stage.actors && <div className="flex flex-wrap gap-1 mb-2">{stage.actors.map((a: string, ai: number) => <span key={ai} className="text-[8px] bg-[var(--nxt-lime-10)] text-[var(--nxt-teal)] px-1.5 py-0.5 rounded-sm border border-[var(--nxt-lime-20)] font-bold">{a}</span>)}</div>}

                                          <div className="space-y-2 flex-1 text-xs">
                                              <div><label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">Customer Action</label>
                                                  <textarea value={stage.customerAction} onChange={(e) => updateJourneyStage(idx, 'customerAction', e.target.value)} className="w-full bg-[var(--bg-tertiary)] p-1.5 rounded resize-none h-10 outline-none text-[11px]" /></div>
                                              <div className="grid grid-cols-2 gap-2">
                                                  <div><label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">Touchpoint</label>
                                                      <input value={stage.touchpoint} onChange={(e) => updateJourneyStage(idx, 'touchpoint', e.target.value)} className="w-full bg-[var(--bg-tertiary)] p-1 rounded outline-none text-[11px]" /></div>
                                                  <div><label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">Emotion</label>
                                                      <select value={stage.emotion} onChange={(e) => updateJourneyStage(idx, 'emotion', e.target.value as any)} className="w-full bg-[var(--bg-tertiary)] p-1 rounded outline-none text-[11px]">
                                                          <option value="Delighted">Delighted</option><option value="Positive">Positive</option><option value="Neutral">Neutral</option><option value="Negative">Negative</option><option value="Frustrated">Frustrated</option>
                                                      </select></div>
                                              </div>
                                              <div className="border-t border-dashed border-[var(--nxt-lime)] pt-1">
                                                  <label className="text-[8px] font-bold text-[#00b1eb] uppercase">Frontstage</label>
                                                  <textarea value={stage.frontstageAction} onChange={(e) => updateJourneyStage(idx, 'frontstageAction', e.target.value)} className="w-full bg-blue-50 p-1.5 rounded resize-none h-10 outline-none text-[11px] border border-blue-100" /></div>
                                              <div><label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase">Backstage</label>
                                                  <textarea value={stage.backstageAction} onChange={(e) => updateJourneyStage(idx, 'backstageAction', e.target.value)} className="w-full bg-teal-50 p-1.5 rounded resize-none h-10 outline-none text-[11px] border border-teal-100" /></div>
                                              {stage.painPoint && <div className="bg-red-50 p-2 rounded border border-red-100"><label className="text-[8px] font-bold text-[#FF5A5A] uppercase">Pain Point</label>
                                                  <textarea value={stage.painPoint} onChange={(e) => updateJourneyStage(idx, 'painPoint', e.target.value)} className="w-full bg-transparent text-[11px] text-red-800 resize-none h-8 outline-none" /></div>}
                                              {/* BLUE-01: Fail points, tech systems, actor needs */}
                                              {stage.fail_point && <div className="bg-orange-50 p-2 rounded border border-orange-200"><label className="text-[8px] font-bold text-[#fd8e2e] uppercase">Fail Point</label>
                                                  <div className="text-[11px] text-orange-800">{stage.fail_point}</div></div>}
                                              {stage.technologySystems && <div className="bg-purple-50 p-2 rounded border border-purple-200"><label className="text-[8px] font-bold text-[#7c3aed] uppercase">Technology Systems</label>
                                                  <div className="text-[11px] text-purple-800">{stage.technologySystems}</div></div>}
                                              {stage.actorNeeds && <div className="bg-teal-50 p-2 rounded border border-teal-200"><label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase">Actor Needs</label>
                                                  <div className="text-[11px] text-teal-800">{stage.actorNeeds}</div></div>}
                                              {stage.momentOfTruth && (
                                                  <div style={{ background: '#FEF2F2', border: '2px solid #FF5A5A', borderRadius: 6, padding: '10px 12px', marginTop: 4 }}>
                                                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: '#FF5A5A', textTransform: 'uppercase', marginBottom: 4 }}>MOMENT OF TRUTH</div>
                                                      <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5, fontWeight: 600 }}>{typeof stage.momentOfTruth === 'string' ? stage.momentOfTruth : 'Critical decision point in this stage'}</div>
                                                  </div>
                                              )}
                                              <EvidenceBlock citations={(stage as any).citations} evidenceBasis={(stage as any).evidenceBasis} />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      );
                  })()}
                  {activeTab === 'tech' && techData && (() => {
                      const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
                          'User': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
                          'Application': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
                          'Database': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                          'Integration': { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
                          'External': { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
                          'AI/ML': { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
                          'Cloud': { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
                      };
                      return (
                      <div className="space-y-8">
                          {/* Overview */}
                          {techData.overview && (
                              <div className="bg-[var(--bg-secondary)] p-5 rounded border" style={{fontFamily:"'Archivo', sans-serif", fontSize:'14px', color:'#333333', lineHeight:'1.65', maxWidth:'800px'}}>{techData.overview}</div>
                          )}

                          {/* Structured SVG architecture diagram - built from actual node/flow data */}
                          {(() => {
                              const nodeFills: Record<string, string> = { 'User': '#dbeafe', 'Application': '#d1fae5', 'Database': '#fef3c7', 'Integration': '#ede9fe', 'External': '#f3f4f6', 'AI/ML': '#ccfbf1', 'Cloud': '#e0e7ff' };
                              const nodeStrokes: Record<string, string> = { 'User': '#3b82f6', 'Application': '#10b981', 'Database': '#f59e0b', 'Integration': '#8b5cf6', 'External': '#6b7280', 'AI/ML': '#14b8a6', 'Cloud': '#6366f1' };
                              const statusColorsMap: Record<string, string> = { 'active': '#0CCE6B', 'broken': '#FF5A5A', 'planned': '#caca20' };
                              const archNodes = techData.nodes || [];
                              const archFlows = techData.flows || [];
                              if (archNodes.length === 0) return <div className="p-8 text-center text-[var(--text-tertiary)]">No architecture nodes generated</div>;

                              const typeOrder = ['User', 'Application', 'AI/ML', 'Integration', 'Database', 'External', 'Cloud'];
                              const grouped: Record<string, any[]> = {};
                              archNodes.forEach((n: any) => { const t = n.type || 'External'; if (!grouped[t]) grouped[t] = []; grouped[t].push(n); });
                              const layers = typeOrder.filter(t => grouped[t]);

                              const nodePos: Record<string, { x: number; y: number }> = {};
                              const nodeW = 180, nodeH = 50, layerH = 90;
                              // Dynamic width: fit widest layer + 20% margin
                              const maxNodesInLayer = Math.max(...layers.map(l => (grouped[l] || []).length));
                              const W = Math.max(960, maxNodesInLayer * (nodeW + 28) + 100);
                              layers.forEach((layer, li) => {
                                  const layerNodes = grouped[layer];
                                  const totalLayerW = layerNodes.length * (nodeW + 28);
                                  const startX = (W - totalLayerW) / 2;
                                  layerNodes.forEach((n: any, ni: number) => {
                                      nodePos[n.id] = { x: startX + ni * (nodeW + 28) + nodeW / 2, y: 55 + li * layerH + nodeH / 2 };
                                  });
                              });
                              const svgH = 55 + layers.length * layerH + 30;

                              return (
                                  <div className="diagram-container overflow-x-auto border border-[var(--border-primary)] rounded bg-white p-4">
                                      <svg width={W} height={svgH} viewBox={`0 0 ${W} ${svgH}`} className="mx-auto" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                                          <defs>
                                              <marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#115054" /></marker>
                                              <marker id="arrowR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#FF5A5A" /></marker>
                                          </defs>
                                          {/* Layer labels */}
                                          {layers.map((layer, li) => (
                                              <text key={li} x="10" y={50 + li * layerH + nodeH / 2 + 4} fontSize="9" fontWeight="bold" fill={nodeStrokes[layer] || '#6b7280'} textAnchor="start" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{layer}</text>
                                          ))}
                                          {/* Flows */}
                                          {(() => {
                                              // Track midpoint positions to avoid label overlap
                                              const usedMidpoints: { x: number; y: number }[] = [];
                                              return archFlows.map((flow: any, fi: number) => {
                                                  const from = nodePos[flow.fromId];
                                                  const to = nodePos[flow.toId];
                                                  if (!from || !to) return null;
                                                  const color = statusColorsMap[flow.status] || '#115054';
                                                  const dash = flow.status === 'planned' ? '4,3' : flow.status === 'broken' ? '2,2' : 'none';
                                                  const strokeW = flow.status === 'active' ? 1.8 : 1.2;
                                                  // Orthogonal routing: drop from source, traverse, rise to target
                                                  const midY = (from.y + to.y) / 2 + (fi % 3 - 1) * 8; // Offset stacked flows
                                                  const pathD = `M${from.x},${from.y} L${from.x},${midY} L${to.x},${midY} L${to.x},${to.y}`;
                                                  // Check if label would overlap
                                                  const mx = (from.x + to.x) / 2;
                                                  const labelOverlaps = usedMidpoints.some(p => Math.abs(p.x - mx) < 60 && Math.abs(p.y - midY) < 12);
                                                  if (flow.action && !labelOverlaps) usedMidpoints.push({ x: mx, y: midY });
                                                  return (
                                                      <g key={`f${fi}`}>
                                                          <path d={pathD} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={dash}
                                                              markerEnd={flow.status === 'broken' ? 'url(#arrowR)' : 'url(#arrowG)'} opacity="0.5" />
                                                          {flow.action && !labelOverlaps && (
                                                              <text x={mx} y={midY - 4} fontSize="7" fill="#888" textAnchor="middle" opacity="0.7">{(flow.action || '').substring(0, 30)}</text>
                                                          )}
                                                      </g>
                                                  );
                                              });
                                          })()}
                                          {/* Nodes */}
                                          {archNodes.map((nd: any, ni: number) => {
                                              const pos = nodePos[nd.id];
                                              if (!pos) return null;
                                              const fill = nodeFills[nd.type] || '#f3f4f6';
                                              const stroke = nodeStrokes[nd.type] || '#6b7280';
                                              return (
                                                  <g key={`n${ni}`}>
                                                      <rect x={pos.x - nodeW / 2} y={pos.y - nodeH / 2} width={nodeW} height={nodeH} rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
                                                      {/* Full label - word-wrapped via foreignObject */}
                                                      <foreignObject x={pos.x - nodeW / 2 + 6} y={pos.y - nodeH / 2 + 4} width={nodeW - 12} height={nodeH - 16}>
                                                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#1A1A1A', textAlign: 'center', lineHeight: 1.2, wordWrap: 'break-word', overflow: 'hidden' }}>{nd.label || ''}</div>
                                                      </foreignObject>
                                                      <text x={pos.x} y={pos.y + nodeH / 2 - 5} fontSize="7" fill={stroke} textAnchor="middle" fontWeight="600">{nd.type}</text>
                                                  </g>
                                              );
                                          })}
                                      </svg>
                                      {/* Legend */}
                                      <div className="flex items-center gap-3 mt-3 justify-center flex-wrap">
                                          {Object.entries(nodeStrokes).filter(([t]) => grouped[t]).map(([type, color]) => (
                                              <div key={type} className="flex items-center gap-1">
                                                  <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: nodeFills[type], border: `1px solid ${color}` }}></div>
                                                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color, letterSpacing: '0.5px' }}>{type}</span>
                                              </div>
                                          ))}
                                          <div className="w-px h-3 bg-gray-200 mx-1"></div>
                                          <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-[#0CCE6B]"></div><span style={{ fontSize: 8, color: '#0CCE6B', fontWeight: 700 }}>Active</span></div>
                                          <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-dashed border-[#caca20]"></div><span style={{ fontSize: 8, color: '#caca20', fontWeight: 700 }}>Planned</span></div>
                                          <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-dotted border-[#FF5A5A]"></div><span style={{ fontSize: 8, color: '#FF5A5A', fontWeight: 700 }}>Broken</span></div>
                                      </div>
                                  </div>
                              );
                          })()}

                          {/* System Nodes - color-coded cards */}
                          <div>
                              <h2 className="text-2xl font-black mb-4 border-b pb-4">System Nodes ({techData.nodes?.length || 0})</h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {(techData.nodes || []).map((node: any, i: number) => {
                                      const colors = nodeColors[node.type] || nodeColors['External'];
                                      return (
                                          <div key={i} className="rounded border-2 p-4 shadow-sm" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <input value={node.label} onChange={(e) => updateTechNode(i, 'label', e.target.value)}
                                                      className="font-bold bg-transparent outline-none flex-1 text-sm" style={{ color: colors.text }} />
                                                  <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-sm" style={{ backgroundColor: colors.border + '20', color: colors.text }}>{node.type}</span>
                                              </div>
                                              <textarea value={node.description || ''} onChange={(e) => updateTechNode(i, 'description', e.target.value)}
                                                  className="w-full text-xs bg-transparent resize-none h-14 outline-none" style={{ color: colors.text + 'cc' }} />
                                              <EvidenceBlock citations={(node as any).citations} evidenceBasis={(node as any).evidenceBasis} />
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Data Flows */}
                          {techData.flows && techData.flows.length > 0 && (
                              <div>
                                  <h2 className="text-2xl font-black mb-4 border-b pb-4">Data Flows ({techData.flows.length})</h2>
                                  <div className="space-y-2">
                                      {techData.flows.map((flow: any, fi: number) => {
                                          const fromNode = (techData.nodes || []).find((n: any) => n.id === flow.fromId);
                                          const toNode = (techData.nodes || []).find((n: any) => n.id === flow.toId);
                                          const statusColor = flow.status === 'active' ? '#0CCE6B' : flow.status === 'broken' ? '#FF5A5A' : '#caca20';
                                          return (
                                              <div key={fi} className="flex items-center gap-3 px-4 py-3 bg-[var(--card-bg)] rounded border border-[var(--border-primary)]">
                                                  <span className="font-bold text-sm text-[var(--nxt-teal)] min-w-[100px]">{fromNode?.label || flow.fromId}</span>
                                                  <span className="text-[var(--text-tertiary)]">{"-->"}</span>
                                                  <span className="font-bold text-sm text-[var(--nxt-teal)] min-w-[100px]">{toNode?.label || flow.toId}</span>
                                                  <span className="text-sm text-[var(--text-secondary)] flex-1">{flow.action}</span>
                                                  {flow.status && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm" style={{ backgroundColor: statusColor + '20', color: statusColor }}>{flow.status}</span>}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}

                          {/* Architecture Sections (KI-012) */}
                          {techData.sections && techData.sections.length > 0 && (
                              <div>
                                  <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>ARCHITECTURE SECTIONS</div>
                                  <h2 style={{ fontFamily: FONT.primary, fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Detailed Architecture Analysis<span style={{ color: '#B8B800' }}>.</span></h2>
                                  <div className="grid grid-cols-1 gap-5">
                                      {techData.sections.map((section: any, si: number) => (
                                          <div key={si} style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: 8, borderLeft: `3px solid ${['#00B7C3', '#B8B800', '#115054', '#CC6644', '#3730A3'][si % 5]}`, overflow: 'hidden' }}>
                                              <div style={{ padding: '18px 22px' }}>
                                                  {/* Section number + title */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#0D0D0D', color: '#B8B800', fontFamily: FONT.primary, fontSize: 12, fontWeight: 700 }}>{section.sectionNumber}</span>
                                                      <span style={{ fontFamily: FONT.primary, fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{section.title}</span>
                                                  </div>
                                                  {/* Content */}
                                                  <p style={{ fontFamily: FONT.primary, fontSize: 13, color: '#444', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{cleanText(section.content)}</p>
                                                  {/* evidenceGap badge intentionally suppressed - delivered output must never expose
                                                      QA-style annotations to the reader (per user directive 2026-05-05). */}
                                                  {/* Citations via EvidenceBlock */}
                                                  <EvidenceBlock citations={(section as any).citations} evidenceBasis={(section as any).evidenceBasis} />
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                      );
                  })()}
                  {activeTab === 'strategy' && (
                      <div className="space-y-8">
                           <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2rem',letterSpacing:'0.5px',color:'#0D0D0D'}} className="mb-4 border-b pb-4">STRATEGIC PLAN</h2>

                           {/* STRAT-01: Rumelt's Kernel - Diagnosis + Guiding Policy */}
                           {result.strategyDocument && (
                               <div className="space-y-6">
                                   {/* Executive Summary */}
                                   {result.strategyDocument.executiveSummary && (
                                       <div style={{background:'#0D0D0D',color:'#fff',padding:'32px'}}>
                                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'10px',letterSpacing:'3px',color:'#B8B800',marginBottom:'8px'}}>EXECUTIVE SUMMARY</div>
                                           <p style={{fontSize:'16px',lineHeight:'1.7',color:'#E0E0E0'}}>{result.strategyDocument.executiveSummary}</p>
                                       </div>
                                   )}

                                   {/* Rumelt's Kernel */}
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{border:'1px solid #E0E0E0'}}>
                                       <div style={{padding:'24px',borderRight:'1px solid #E0E0E0',borderBottom:'1px solid #E0E0E0'}}>
                                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'10px',letterSpacing:'3px',color:'#FF5A5A',marginBottom:'8px'}}>DIAGNOSIS</div>
                                           <p style={{fontSize:'14px',lineHeight:'1.65',color:'#333'}}>{result.strategyDocument.diagnosis}</p>
                                       </div>
                                       <div style={{padding:'24px',borderBottom:'1px solid #E0E0E0'}}>
                                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'10px',letterSpacing:'3px',color:'#115054',marginBottom:'8px'}}>GUIDING POLICY</div>
                                           <p style={{fontSize:'14px',lineHeight:'1.65',color:'#333'}}>{result.strategyDocument.guidingPolicy}</p>
                                       </div>
                                   </div>

                                   {/* Strategic Pillars */}
                                   {result.strategyDocument.strategicPillars && result.strategyDocument.strategicPillars.length > 0 && (
                                       <div>
                                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'2px',color:'#999',marginBottom:'12px'}}>STRATEGIC PILLARS</div>
                                           <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                               {result.strategyDocument.strategicPillars.map((pillar: string, pi: number) => {
                                                   const pillarColors = ['#115054', '#B8B800', '#fd8e2e', '#00b1eb', '#FF5A5A'];
                                                   return (
                                                       <div key={pi} style={{padding:'16px',borderTop:`3px solid ${pillarColors[pi % pillarColors.length]}`,background:'#FAFAFA'}}>
                                                           <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',color:pillarColors[pi % pillarColors.length],marginBottom:'4px'}}>PILLAR {pi + 1}</div>
                                                           <div style={{fontSize:'13px',fontWeight:700,color:'#0D0D0D',lineHeight:'1.4'}}>{pillar}</div>
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       </div>
                                   )}

                                   {/* Strategy Sections */}
                                   {result.strategyDocument.sections && result.strategyDocument.sections.length > 0 && (
                                       <div className="space-y-4">
                                           {result.strategyDocument.sections.map((section: any, si: number) => (
                                               <div key={si} style={{border:'1px solid #E0E0E0',padding:'20px 24px'}}>
                                                   <div className="flex items-baseline gap-3 mb-2">
                                                       <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',color:'#B8B800',fontWeight:700}}>{String(section.sectionNumber || si + 1).padStart(2, '0')}</span>
                                                       <h4 style={{fontSize:'16px',fontWeight:700,color:'#0D0D0D'}}>{section.title}</h4>
                                                   </div>
                                                   <p style={{fontSize:'14px',lineHeight:'1.65',color:'#555',whiteSpace:'pre-wrap'}}>{section.content}</p>
                                                   {/* evidenceGap badge intentionally suppressed - delivered output must never expose
                                                       QA-style annotations to the reader (per user directive 2026-05-05). */}
                                               </div>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           )}

                           {/* Recommendation Cards (Coherent Actions) */}
                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'2px',color:'#999',marginTop:'32px',marginBottom:'8px',paddingTop:'16px',borderTop:'2px solid #E0E0E0'}}>COHERENT ACTIONS ({(result.recommendations || []).length} Recommendations)</div>
                           {(result.recommendations || []).map((rec: any, i: number) => {
                               const impactColors: Record<string, string> = { 'HIGH': 'bg-red-100 text-red-700', 'MEDIUM': 'bg-amber-100 text-amber-700', 'LOW': 'bg-blue-100 text-blue-700' };
                               return (
                               <div key={i} style={{border:'1px solid #E0E0E0',padding:'20px 24px',borderLeft: rec.impactLevel === 'HIGH' ? '4px solid #FF5A5A' : rec.impactLevel === 'MEDIUM' ? '4px solid #fd8e2e' : '4px solid #E0E0E0'}}>
                                   <div className="flex justify-between items-start mb-3">
                                       <h3 style={{fontSize:'16px',fontWeight:700,color:'#0D0D0D',flex:1}}>{rec.title}</h3>
                                       <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',padding:'2px 8px',letterSpacing:'1px',whiteSpace:'nowrap',marginLeft:'12px',background: rec.impactLevel === 'HIGH' ? '#FEE2E2' : rec.impactLevel === 'MEDIUM' ? '#FFF8E1' : '#F5F5F0', color: rec.impactLevel === 'HIGH' ? '#991b1b' : rec.impactLevel === 'MEDIUM' ? '#8A6D00' : '#666'}}>{rec.impactLevel}</span>
                                   </div>
                                   <p style={{fontSize:'14px',color:'#555',lineHeight:'1.6',marginBottom:'12px'}}>{renderWithCitations(rec.description || '', handleCitationClick)}</p>
                                   {rec.actionItems && rec.actionItems.length > 0 && (
                                       <div style={{borderTop:'1px solid #E0E0E0',paddingTop:'10px'}}>
                                           <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'9px',letterSpacing:'2px',color:'#115054',marginBottom:'6px'}}>ACTION ITEMS</div>
                                           <div className="space-y-1.5">
                                               {rec.actionItems.map((item: string, ai: number) => (
                                                   <div key={ai} style={{display:'flex',alignItems:'flex-start',gap:'8px',fontSize:'13px',color:'#555'}}>
                                                       <span style={{color:'#115054',fontWeight:700,fontSize:'12px',fontFamily:"'JetBrains Mono',monospace"}}>{ai + 1}.</span>
                                                       <span>{item}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                                   <EvidenceBlock citations={(rec as any).citations} evidenceBasis={(rec as any).evidenceBasis} />
                               </div>
                               );
                           })}
                      </div>
                  )}
                  {/* ====== GAP ANALYSIS TAB ====== */}
                  {activeTab === 'gap' && result.gapAnalysis && (() => {
                      const gap = result.gapAnalysis;
                      return (
                          <div className="space-y-8">
                              <div>
                                  <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>GAP ANALYSIS</div>
                                  <h2 style={{ fontFamily: FONT.primary, fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Capability Maturity Assessment<span style={{ color: '#B8B800' }}>.</span></h2>
                                  {gap.assessmentScope && <p style={{ fontFamily: FONT.primary, fontSize: 14, color: '#444444', lineHeight: 1.6, maxWidth: 700, borderLeft: '2px solid #00B7C3', paddingLeft: 16 }}>{cleanText(gap.assessmentScope)}</p>}
                              </div>
                              {/* Capability Gap Grid */}
                              {gap.gaps && gap.gaps.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 12 }}>CAPABILITY GAPS</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                                          {gap.gaps.map((g: any, i: number) => {
                                              const severityColor = g.severity === 'critical' ? '#CC6644' : g.severity === 'high' ? '#B8B800' : '#888888';
                                              return (
                                                  <div key={i} style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 8, borderLeft: `3px solid ${severityColor}`, padding: 16 }}>
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{g.capability}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: severityColor, background: `${severityColor}15`, padding: '2px 8px', borderRadius: 100 }}>{g.severity}</span>
                                                      </div>
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                          <div style={{ flex: 1 }}>
                                                              <div style={{ fontFamily: FONT.primary, fontSize: 10, color: '#AAAAAA', marginBottom: 2 }}>CURRENT</div>
                                                              <div style={{ height: 6, background: '#E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
                                                                  <div style={{ height: '100%', borderRadius: 3, background: '#CC6644', width: `${(g.currentMaturity / 5) * 100}%` }} />
                                                              </div>
                                                              <div style={{ fontFamily: FONT.primary, fontSize: 11, color: '#888', marginTop: 2 }}>{g.currentMaturity}/5</div>
                                                          </div>
                                                          <div style={{ fontFamily: FONT.primary, fontSize: 18, fontWeight: 200, color: '#CCCCCC' }}>→</div>
                                                          <div style={{ flex: 1 }}>
                                                              <div style={{ fontFamily: FONT.primary, fontSize: 10, color: '#AAAAAA', marginBottom: 2 }}>TARGET</div>
                                                              <div style={{ height: 6, background: '#E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
                                                                  <div style={{ height: '100%', borderRadius: 3, background: '#00B7C3', width: `${(g.targetMaturity / 5) * 100}%` }} />
                                                              </div>
                                                              <div style={{ fontFamily: FONT.primary, fontSize: 11, color: '#888', marginTop: 2 }}>{g.targetMaturity}/5</div>
                                                          </div>
                                                      </div>
                                                      <p style={{ fontFamily: FONT.primary, fontSize: 12, color: '#666', lineHeight: 1.5 }}>{cleanText(g.impact)}</p>
                                                      <EvidenceBlock citations={(g as any).citations} evidenceBasis={(g as any).evidenceBasis} />
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              {/* Quick Wins */}
                              {gap.quickWins && gap.quickWins.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#00B7C3', marginBottom: 8 }}>QUICK WINS</div>
                                      {gap.quickWins.map((qw: any, i: number) => (
                                          <div key={i} style={{ padding: '8px 12px', borderLeft: '2px solid #00B7C3', marginBottom: 6, fontFamily: FONT.primary, fontSize: 13, color: '#444' }}>{cleanText(qw.action)}{qw.timeline ? ` (${qw.timeline})` : ''}</div>
                                      ))}
                                  </div>
                              )}
                              {/* Prioritized Actions */}
                              {gap.prioritizedActions && gap.prioritizedActions.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>PRIORITIZED ACTIONS</div>
                                      {gap.prioritizedActions.map((a: any, i: number) => (
                                          <div key={i} style={{ padding: '8px 12px', background: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF', borderRadius: 4, marginBottom: 4, fontFamily: FONT.primary, fontSize: 13, color: '#444' }}>
                                              <strong style={{ color: '#1A1A1A' }}>{a.priority}</strong>: {cleanText(a.action)}{a.owner ? ` - ${a.owner}` : ''}
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })()}

                  {/* ====== TECH AUDIT TAB ====== */}
                  {activeTab === 'techAudit' && result.techAudit && (() => {
                      const audit = result.techAudit;
                      return (
                          <div className="space-y-8">
                              <div>
                                  <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>TECHNOLOGY ECOSYSTEM AUDIT</div>
                                  <h2 style={{ fontFamily: FONT.primary, fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Systems Inventory & Integration Map<span style={{ color: '#B8B800' }}>.</span></h2>
                              </div>
                              {/* Systems Inventory */}
                              {audit.systemsInventory && audit.systemsInventory.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>SYSTEMS ({audit.systemsInventory.length})</div>
                                      <div style={{ border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden' }}>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', background: '#FAFAFA', padding: '8px 16px', gap: 8, borderBottom: '1px solid #EEEEEE' }}>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>SYSTEM</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>VENDOR</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>CATEGORY</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>STATUS</span>
                                          </div>
                                          {audit.systemsInventory.map((s: any, i: number) => {
                                              const statusColor = s.status === 'active' ? '#00B7C3' : s.status === 'legacy' ? '#B8B800' : s.status === 'deprecated' ? '#CC6644' : '#888';
                                              return (
                                                  <div key={i} style={{ borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', padding: '10px 16px', gap: 8 }}>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{s.name}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 12, color: (!s.vendor || s.vendor === 'Unspecified' || s.vendor === 'N/A') ? '#B8B800' : '#666', fontWeight: (!s.vendor || s.vendor === 'Unspecified' || s.vendor === 'N/A') ? 600 : 400 }}>{(!s.vendor || s.vendor === 'Unspecified' || s.vendor === 'N/A') ? 'TBD - vendor selection needed' : s.vendor}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 12, color: '#888' }}>{s.category}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: statusColor }}>{s.status}</span>
                                                      </div>
                                                      {((s as any).citations || (s as any).evidenceBasis) && <div style={{ padding: '0 16px 8px 16px' }}><EvidenceBlock citations={(s as any).citations} evidenceBasis={(s as any).evidenceBasis} /></div>}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              {/* Integration Map - structured cards */}
                              {audit.integrationMap && audit.integrationMap.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>INTEGRATIONS ({audit.integrationMap.length})</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                                          {audit.integrationMap.map((link: any, i: number) => {
                                              const healthColor = link.health === 'healthy' ? '#00B7C3' : link.health === 'degraded' ? '#B8B800' : link.health === 'broken' ? '#CC6644' : '#888';
                                              const healthLabel = link.health || 'unknown';
                                              const priorityColor = link.priority === 'must-have' ? '#CC6644' : link.priority === 'should-have' ? '#B8B800' : '#888';
                                              return (
                                                  <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: 8, padding: 14, borderLeft: `4px solid ${healthColor}` }}>
                                                      {/* Source -> Target header */}
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{link.source}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 14, color: '#00B7C3' }}>{link.direction === 'bidirectional' ? '\u21C4' : '\u2192'}</span>
                                                          <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{link.target}</span>
                                                      </div>
                                                      {/* Method + Data + Status badges */}
                                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                                          {link.method && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: '#E0E7FF', color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{link.method}</span>}
                                                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: healthColor + '20', color: healthColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{healthLabel}</span>
                                                          {link.priority && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: priorityColor + '15', color: priorityColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{link.priority}</span>}
                                                      </div>
                                                      {/* Data flow description */}
                                                      {link.dataFlow && <div style={{ fontFamily: FONT.primary, fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 4 }}>{cleanText(link.dataFlow)}</div>}
                                                      {/* Risk / effort row */}
                                                      {(link.risk || link.effort) && (
                                                          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#888', marginTop: 4, paddingTop: 6, borderTop: '1px solid #EEEEEE' }}>
                                                              {link.risk && <span><strong style={{ color: '#CC6644' }}>Risk:</strong> {link.risk}</span>}
                                                              {link.effort && <span><strong style={{ color: '#B8B800' }}>Effort:</strong> {link.effort}</span>}
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              {/* Consolidation Opportunities */}
                              {audit.consolidationOpportunities && audit.consolidationOpportunities.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#B8B800', marginBottom: 8 }}>CONSOLIDATION OPPORTUNITIES</div>
                                      {audit.consolidationOpportunities.map((c: any, i: number) => (
                                          <div key={i} style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 8, borderLeft: '3px solid #B8B800', padding: 16, marginBottom: 8 }}>
                                              <div style={{ fontFamily: FONT.primary, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{c.title}</div>
                                              <p style={{ fontFamily: FONT.primary, fontSize: 13, color: '#666', lineHeight: 1.5 }}>{cleanText(c.description)}</p>
                                              <div style={{ fontFamily: FONT.primary, fontSize: 11, color: '#888', marginTop: 6 }}>Impact: {c.impact} | Effort: {c.effort}</div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })()}

                  {/* ====== COMPETITIVE ANALYSIS TAB ====== */}
                  {activeTab === 'competitive' && result.competitiveAnalysis && (() => {
                      const comp = result.competitiveAnalysis;
                      return (
                          <div className="space-y-8">
                              <div>
                                  <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>COMPETITIVE LANDSCAPE</div>
                                  <h2 style={{ fontFamily: FONT.primary, fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Peer Positioning & Gap Assessment<span style={{ color: '#B8B800' }}>.</span></h2>
                                  {comp.industryContext && <p style={{ fontFamily: FONT.primary, fontSize: 14, color: '#444444', lineHeight: 1.6, maxWidth: 700, borderLeft: '2px solid #00B7C3', paddingLeft: 16 }}>{cleanText(comp.industryContext)}</p>}
                              </div>
                              {/* Peer Profiles */}
                              {comp.peers && comp.peers.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 12 }}>PEER PROFILES</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                          {comp.peers.map((p: any, i: number) => (
                                              <div key={i} style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 8, borderTop: `3px solid ${['#00B7C3', '#B8B800', '#CC6644', '#888'][i % 4]}`, padding: 20 }}>
                                                  <div style={{ fontFamily: FONT.primary, fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{p.name}</div>
                                                  <div style={{ fontFamily: FONT.primary, fontSize: 12, color: '#888', marginBottom: 12 }}>{cleanText(p.position)}</div>
                                                  <div style={{ marginBottom: 8 }}>
                                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#00B7C3', marginBottom: 4 }}>STRENGTHS</div>
                                                      {(p.strengths || []).map((s: string, j: number) => (
                                                          <div key={j} style={{ fontFamily: FONT.primary, fontSize: 12, color: '#444', marginBottom: 2 }}>+ {cleanText(s)}</div>
                                                      ))}
                                                  </div>
                                                  <div>
                                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#CC6644', marginBottom: 4 }}>WEAKNESSES</div>
                                                      {(p.weaknesses || []).map((w: string, j: number) => (
                                                          <div key={j} style={{ fontFamily: FONT.primary, fontSize: 12, color: '#444', marginBottom: 2 }}>- {cleanText(w)}</div>
                                                      ))}
                                                  </div>
                                                  <EvidenceBlock citations={(p as any).citations} evidenceBasis={(p as any).evidenceBasis} />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              {/* Benchmark Dimensions (KI-009) */}
                              {comp.benchmarkDimensions && comp.benchmarkDimensions.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 12 }}>BENCHMARK DIMENSIONS</div>
                                      <div style={{ border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden' }}>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 2fr', background: '#FAFAFA', padding: '8px 16px', gap: 8, borderBottom: '1px solid #EEEEEE' }}>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>DIMENSION</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', textAlign: 'center' }}>WEIGHT</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>DESCRIPTION</span>
                                          </div>
                                          {comp.benchmarkDimensions.map((bd: any, i: number) => (
                                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 2fr', padding: '10px 16px', gap: 8, borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{bd.dimension}</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 700, color: '#115054', textAlign: 'center' }}>{Math.round((bd.weight || 0) * 100)}%</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 12, color: '#666', lineHeight: 1.5 }}>{cleanText(bd.description)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Maturity Matrix (KI-009) */}
                              {comp.maturityMatrix && comp.maturityMatrix.length > 0 && comp.benchmarkDimensions && comp.benchmarkDimensions.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 12 }}>MATURITY MATRIX</div>
                                      <div style={{ border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden', overflowX: 'auto' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.primary }}>
                                              <thead>
                                                  <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #EEEEEE' }}>
                                                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#AAAAAA', borderRight: '1px solid #F0F0F0' }}>PEER</th>
                                                      {comp.benchmarkDimensions.map((bd: any, di: number) => (
                                                          <th key={di} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#AAAAAA', borderRight: di < comp.benchmarkDimensions.length - 1 ? '1px solid #F0F0F0' : 'none', minWidth: 80 }}>{bd.dimension}</th>
                                                      ))}
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  {comp.maturityMatrix.map((row: any, ri: number) => (
                                                      <tr key={ri} style={{ borderBottom: '1px solid #F5F5F5', background: ri % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                                                          <td style={{ padding: '10px 16px', fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#1A1A1A', borderRight: '1px solid #F0F0F0' }}>{row.peer}</td>
                                                          {comp.benchmarkDimensions.map((bd: any, di: number) => {
                                                              const score = row.scores?.[bd.dimension] ?? 0;
                                                              const cellColor = score >= 4 ? '#00B7C3' : score === 3 ? '#B8B800' : '#CC6644';
                                                              const cellBg = score >= 4 ? '#E8F6F7' : score === 3 ? '#FFFDE8' : '#FFF0EB';
                                                              return (
                                                                  <td key={di} style={{ padding: '8px 12px', textAlign: 'center', borderRight: di < comp.benchmarkDimensions.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                                                                      <span style={{ display: 'inline-block', width: 32, height: 32, lineHeight: '32px', borderRadius: 6, background: cellBg, color: cellColor, fontFamily: FONT.primary, fontSize: 14, fontWeight: 700 }}>{score}</span>
                                                                  </td>
                                                              );
                                                          })}
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                          {/* Legend */}
                                          <div style={{ display: 'flex', gap: 16, padding: '10px 16px', borderTop: '1px solid #EEEEEE', background: '#FAFAFA', justifyContent: 'center' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#FFF0EB', border: '1px solid #CC6644' }}></span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 10, color: '#CC6644', fontWeight: 600 }}>1-2: Emerging</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#FFFDE8', border: '1px solid #B8B800' }}></span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 10, color: '#B8B800', fontWeight: 600 }}>3: Developing</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#E8F6F7', border: '1px solid #00B7C3' }}></span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 10, color: '#00B7C3', fontWeight: 600 }}>4-5: Leading</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* Gap Summary */}
                              {comp.gapSummary && comp.gapSummary.length > 0 && (
                                  <div>
                                      <div style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 8 }}>COMPETITIVE GAPS</div>
                                      <div style={{ border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden' }}>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px 1fr', background: '#FAFAFA', padding: '8px 16px', gap: 8, borderBottom: '1px solid #EEEEEE' }}>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>DIMENSION</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', textAlign: 'center' }}>OURS</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', textAlign: 'center' }}>BEST</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA', textAlign: 'center' }}>GAP</span>
                                              <span style={{ fontFamily: FONT.primary, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>ACTION</span>
                                          </div>
                                          {comp.gapSummary.map((g: any, i: number) => (
                                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px 1fr', padding: '10px 16px', gap: 8, borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{g.dimension}</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#CC6644', textAlign: 'center' }}>{g.ourScore}</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 600, color: '#00B7C3', textAlign: 'center' }}>{g.bestInClass}</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 13, fontWeight: 700, color: g.gap >= 2 ? '#CC6644' : '#B8B800', textAlign: 'center' }}>{g.gap}</span>
                                                  <span style={{ fontFamily: FONT.primary, fontSize: 12, color: '#666' }}>{cleanText(g.action)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })()}

              </div>
          </div>
          <EvidenceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalData.title} content={modalData.content} citations={modalData.citations} quote={modalData.quote} />
      </div>{/* end marginLeft wrapper */}
      </div>
  );
};

export default ResultsView;
