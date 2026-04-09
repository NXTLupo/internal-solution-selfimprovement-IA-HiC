
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ScriptScene, Theme, Slide, SlideLayout, Citation, OutputOption, AnalysisStage, StrategicRoadmap, PRD, ServiceBlueprintStage, TechnicalArchitecture, RoadmapItem, PRDFeature, TechNode, Persona } from '../types';
import { generateSceneVideo, generateImage, rewriteSlideContent } from '../services/geminiService';
import { exportPPTX, exportJSON } from '../services/exportService';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
              'VIDEO_SCRIPT': 'script'
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
      if (!roadmapData) return;
      const newItems = [...roadmapData.items];
      (newItems[index] as any)[field] = value;
      setRoadmapData({ ...roadmapData, items: newItems });
  };

  const updatePRDFeature = (index: number, field: keyof PRDFeature, value: string) => {
      if (!prdData) return;
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
      if (!techData) return;
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
              PainPoints: p.painPoints.map(pp => pp.label).join('; ')
          }));
          filename = 'personas.csv';
      } else if (activeTab === 'prd' && prdData) {
          data = prdData.features.map(f => ({
              Feature: f.name, Priority: f.priority, Description: f.description, UserStories: f.userStories.join('; ')
          }));
          filename = 'prd_features.csv';
      } else if (activeTab === 'roadmap' && roadmapData) {
          data = roadmapData.items.map(i => ({
              Initiative: i.initiative, Horizon: i.horizon, Status: i.status, Owner: i.owner, Description: i.description
          }));
          filename = 'roadmap.csv';
      } else if (activeTab === 'journey' && journeyData) {
          data = journeyData;
          filename = 'service_blueprint.csv';
      } else if (activeTab === 'tech' && techData) {
          data = techData.nodes.map(n => ({
              Label: n.label, Type: n.type, Description: n.description
          }));
          filename = 'tech_nodes.csv';
      } else if (activeTab === 'strategy' && result.recommendations) {
          data = result.recommendations.map(r => ({
              Title: r.title, Impact: r.impactLevel, Description: r.description, ActionItems: r.actionItems.join('; ')
          }));
          filename = 'strategic_recs.csv';
      } else if (activeTab === 'deck' && slides.length > 0) {
          data = slides.map(s => ({
              Slide: s.slideNumber, Title: s.title, Layout: s.layout, Content: (s.content || []).join('; '), VisualPrompt: s.visualPrompt
          }));
          filename = 'strategy_deck.csv';
      } else if (activeTab === 'script' && scriptScenes.length > 0) {
          data = scriptScenes.map(s => ({
              Scene: s.sceneNumber, Narration: s.audioNarration, Visual: s.visualDescription
          }));
          filename = 'video_script.csv';
      }

      if (data.length > 0) {
          const csv = convertToCSV(data);
          downloadCSV(csv, filename);
      } else {
          alert("No structured data available for CSV export on this tab.");
      }
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
              const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
              pdf.deletePage(1);
              for (let i = 0; i < slideElements.length; i++) {
                  const slideElement = slideElements[i] as HTMLElement;
                  const canvas = await html2canvas(slideElement, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const imgWidth = canvas.width;
                  const imgHeight = canvas.height;
                  const ratio = imgWidth / imgHeight;
                  const pdfPageWidth = 297; 
                  const pdfPageHeight = pdfPageWidth / ratio;
                  pdf.addPage([pdfPageWidth, pdfPageHeight], 'landscape');
                  pdf.addImage(canvas, 'PNG', 0, 0, pdfPageWidth, pdfPageHeight);
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
                  const canvas = await html2canvas(slideElement, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
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
                  pdf.addImage(canvas, 'PNG', x, y, finalW, finalH);
              }
              pdf.save('NXT_Humans_Personas.pdf');
          }
          else if (activeTab === 'journey' || activeTab === 'tech') {
              const pdf = new jsPDF('landscape', 'mm', 'a4');
              pdf.deletePage(1);
              const diagramEl = contentRef.current.querySelector('.diagram-container') as HTMLElement;
              if (diagramEl) {
                  const canvas = await html2canvas(diagramEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const imgWidth = canvas.width;
                  const imgHeight = canvas.height;
                  const ratio = imgWidth / imgHeight;
                  const pdfPageWidth = 297;
                  const pdfPageHeight = pdfPageWidth / ratio;
                  pdf.addPage([pdfPageWidth, pdfPageHeight], 'landscape');
                  pdf.addImage(canvas, 'PNG', 0, 0, pdfPageWidth, pdfPageHeight);
              }
              const detailsEl = contentRef.current.querySelector('.details-container') as HTMLElement;
              if (detailsEl) {
                  const canvas = await html2canvas(detailsEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                  const pdfPageWidth = 297; 
                  const pdfPageHeight = 210;
                  const imgData = canvas.toDataURL('image/png');
                  const imgPropsWidth = pdfPageWidth;
                  const imgPropsHeight = (canvas.height * imgPropsWidth) / canvas.width;
                  let heightLeft = imgPropsHeight;
                  let position = 0;
                  pdf.addPage('a4', 'landscape');
                  pdf.addImage(imgData, 'PNG', 0, position, imgPropsWidth, imgPropsHeight);
                  heightLeft -= pdfPageHeight;
                  while (heightLeft > 0) {
                      position = heightLeft - imgPropsHeight;
                      pdf.addPage('a4', 'landscape');
                      pdf.addImage(imgData, 'PNG', 0, position, imgPropsWidth, imgPropsHeight);
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
              const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/png');
              const imgWidth = pdfWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              let heightLeft = imgHeight;
              let position = 0;
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
              while (heightLeft > 0) {
                  position = heightLeft - imgHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
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

  const handleRegeneratePersonaImage = async (index: number) => {
      const p = personasData[index];
      const newPersonas = [...personasData];
      newPersonas[index] = { ...p, imageUrl: undefined }; 
      setPersonasData(newPersonas);
      try {
          const bioSnippet = (p.bio || '').substring(0, 50);
          // Revised Prompt: Photorealistic Professional
          const imgPrompt = `Professional editorial portrait of ${p.name}, ${p.role}, ${p.demographics}. Context: ${bioSnippet}. 4K, 85mm lens, authentic human subject in a natural environment. Subtle, clean data UI elements integrated into the scene (non-intrusive). Modern, polished aesthetic.`;
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
                const nodesList = techData.nodes.map(n => n.label).join(", ");
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

  const handleRegenerateImage = async (index: number) => {
    const scene = scriptScenes[index];
    if (scene.imageStatus === 'generating') return;
    const newScenes = [...scriptScenes];
    newScenes[index] = { ...scene, imageStatus: 'generating' };
    setScriptScenes(newScenes);
    try {
        let refImage = undefined;
        if (scene.personaRef) {
             const persona = result.personas.find(p => p.name === scene.personaRef);
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

  const handleRegenerateSlideImage = async (index: number) => {
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
      const theme = result.themes[parseInt(rewriteThemeId)];
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
      const containerClass = "slide-export-target rounded-none shadow-none max-w-5xl mx-auto aspect-[16/9] flex flex-col relative overflow-hidden group border border-[var(--border-secondary)] transition-all hover:scale-[1.01]";
      const { style } = slide;

      // Ensure layout has a fallback
      const validLayouts: SlideLayout[] = ['TITLE_SLIDE', 'SECTION_HEADER', 'CONTENT_SPLIT_RIGHT', 'CONTENT_SPLIT_LEFT', 'FULL_BLEED_IMAGE', 'TYPOGRAPHY_QUOTE'];
      const activeLayout = validLayouts.includes(slide.layout) ? slide.layout : 'CONTENT_SPLIT_RIGHT';

      if (editingSlideIndex === idx && editForm) {
          return (
              <div key={idx} className="max-w-5xl mx-auto bg-[var(--card-bg)] rounded p-6 border border-[var(--border-primary)] shadow-none animate-fade-in relative z-10 text-[var(--text-primary)]">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-primary)]">
                      <h3 className="text-xl font-bold">Edit Slide {slide.slideNumber}</h3>
                      <div className="flex gap-2">
                           <button onClick={cancelSlideEdit} className="px-3 py-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancel</button>
                           <button onClick={saveSlideEdit} className="px-4 py-1 text-sm bg-indigo-600 hover:bg-[var(--nxt-teal)] text-white font-bold rounded shadow-none">Save Changes</button>
                      </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Layout Template</label>
                              <select 
                                value={editForm.layout}
                                onChange={e => setEditForm({...editForm, layout: e.target.value as SlideLayout})}
                                className="w-full bg-white text-black border border-[var(--border-primary)] rounded p-2 text-sm outline-none"
                              >
                                  <option value="TITLE_SLIDE">Title Slide</option>
                                  <option value="SECTION_HEADER">Section Header</option>
                                  <option value="CONTENT_SPLIT_RIGHT">Standard (Text Left / Image Right)</option>
                                  <option value="CONTENT_SPLIT_LEFT">Standard (Image Left / Text Right)</option>
                                  <option value="FULL_BLEED_IMAGE">Full Bleed Image (Overlay Text)</option>
                                  <option value="TYPOGRAPHY_QUOTE">Typography Quote</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Slide Title</label>
                              <input 
                                  type="text"
                                  value={editForm.title}
                                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                                  className="w-full bg-[var(--input-bg)] border border-[var(--border-primary)] rounded p-2 text-sm outline-none font-bold"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Main Content</label>
                              <textarea 
                                  value={(editForm.content || []).join('\n')}
                                  onChange={e => setEditForm({...editForm, content: e.target.value.split('\n')})}
                                  className="w-full h-32 bg-[var(--input-bg)] border border-[var(--border-primary)] rounded p-2 text-sm outline-none resize-none"
                                  placeholder="One bullet per line..."
                              />
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Visual Prompt</label>
                              <textarea 
                                  value={editForm.visualPrompt}
                                  onChange={e => setEditForm({...editForm, visualPrompt: e.target.value})}
                                  className="w-full h-24 bg-[var(--input-bg)] border border-[var(--border-primary)] rounded p-2 text-xs outline-none resize-none font-mono"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Voiceover</label>
                              <textarea 
                                  value={editForm.narrative}
                                  onChange={e => setEditForm({...editForm, narrative: e.target.value})}
                                  className="w-full h-24 bg-[var(--input-bg)] border border-[var(--border-primary)] rounded p-2 text-sm outline-none resize-none italic"
                              />
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div key={idx} className={containerClass} style={{ backgroundColor: style.backgroundColor }}>
               {activeLayout === 'TITLE_SLIDE' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
                       <h3 className="text-xl tracking-[0.3em] font-bold mb-4 opacity-80" style={{ color: style.headerColor }}>STRATEGIC ANALYSIS</h3>
                       <h1 className="text-5xl font-black mb-6 tracking-tighter" style={{ color: style.headerColor }}>
                           {slide.title || 'NXT HUMANS'}<span style={{ color: style.accentColor }}>.</span>
                       </h1>
                       <p className="text-xl max-w-2xl leading-relaxed" style={{ color: style.textColor }}>{slide.narrative}</p>
                   </div>
               )}
               {activeLayout === 'SECTION_HEADER' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center relative">
                       {slide.imageUrl && (
                           <div className="absolute inset-0 z-0">
                               <img src={slide.imageUrl} className="w-full h-full object-cover opacity-40" alt="background" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                           </div>
                       )}
                       <div className="relative z-10 text-center p-12">
                           <h2 className="text-4xl font-bold mb-4 tracking-tight" style={{ color: style.headerColor }}>{slide.title}</h2>
                           <p className="text-xl italic font-light opacity-90 max-w-3xl" style={{ color: style.textColor }}>{slide.narrative}</p>
                       </div>
                   </div>
               )}
               {activeLayout === 'FULL_BLEED_IMAGE' && (
                   <div className="absolute inset-0">
                       {slide.imageUrl ? (
                           <img src={slide.imageUrl} className="w-full h-full object-cover" alt="slide visual" />
                       ) : (
                           <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">No Image Generated</div>
                       )}
                       <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-[2px]">
                           <h2 className="text-2xl font-bold mb-2" style={{ color: style.headerColor }}>{slide.title}</h2>
                           <p className="text-base opacity-90" style={{ color: style.textColor }}>{(slide.content || []).join(' ')}</p>
                       </div>
                   </div>
               )}
               {(activeLayout === 'CONTENT_SPLIT_RIGHT' || activeLayout === 'CONTENT_SPLIT_LEFT') && (
                   <div className={`absolute inset-0 flex ${activeLayout === 'CONTENT_SPLIT_LEFT' ? 'flex-row-reverse' : 'flex-row'}`}>
                       <div className="w-1/2 p-8 flex flex-col justify-center">
                           <h2 className="text-2xl font-bold mb-4" style={{ color: style.headerColor }}>
                               {slide.title}<span style={{ color: style.accentColor }}>.</span>
                           </h2>
                           <div className="space-y-4 mb-8">
                               {(slide.content || []).map((point, i) => (
                                   <div key={i} className="flex gap-3">
                                       <span style={{ color: style.accentColor }}>•</span>
                                       <p className="text-base leading-snug" style={{ color: style.textColor }}>{point}</p>
                                   </div>
                               ))}
                           </div>
                           <div className="mt-auto pt-6 border-t border-white/10">
                               <p className="text-sm italic opacity-60" style={{ color: style.textColor }}>{slide.narrative}</p>
                           </div>
                       </div>
                       <div className="w-1/2 relative bg-black/20 overflow-hidden flex items-center justify-center">
                           {slide.imageUrl ? (
                               <img src={slide.imageUrl} className="w-full h-full object-cover relative z-10" alt="visual" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-500">Generating Visual...</div>
                           )}
                       </div>
                   </div>
               )}
               {activeLayout === 'TYPOGRAPHY_QUOTE' && (
                    <div className="absolute inset-0 flex flex-col justify-center p-16 relative overflow-hidden">
                        <div className="absolute top-0 right-0 text-[120px] font-serif opacity-10 leading-none select-none" style={{ color: style.accentColor }}>"</div>
                        <h4 className="text-sm font-bold tracking-[0.2em] mb-8 uppercase opacity-60" style={{ color: style.accentColor }}>Key Insight</h4>
                        <p className="text-3xl font-serif italic leading-tight mb-8 relative z-10" style={{ color: style.textColor }}>
                            "{slide.quote}"
                        </p>
                    </div>
               )}
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-20">
                   <button onClick={() => deleteSlide(idx)} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-none">Delete</button>
                   <button onClick={() => startEditingSlide(idx)} className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold shadow-none">Edit</button>
                   <button onClick={() => handleRegenerateSlideImage(idx)} className="bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">Regen Image</button>
               </div>
               <div className="absolute bottom-4 right-6 text-xs font-mono opacity-30 mix-blend-difference" style={{ color: 'white' }}>
                   {idx + 1} / {slides.length}
               </div>
          </div>
      );
  };

  const isOutputSelected = (opt: OutputOption) => result.selectedOutputs?.includes(opt);

  return (
      <div className="bg-[var(--bg-secondary)] min-h-screen relative flex flex-col">
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
              <div className="flex-1 flex justify-center">
                  <div className="flex bg-[var(--bg-secondary)] rounded p-1.5 border border-[var(--border-primary)] overflow-x-auto gap-1">
                      {isOutputSelected('PERSONAS') && (result.personas && result.personas.length > 0) && (
                          <button onClick={() => setActiveTab('personas')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'personas' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Personas</button>
                      )}
                      {isOutputSelected('STRATEGY_DECK') && (
                          <button onClick={() => setActiveTab('deck')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deck' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Strategy Deck</button>
                      )}
                      {isOutputSelected('VIDEO_SCRIPT') && (
                          <button onClick={() => setActiveTab('script')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'script' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Video Script</button>
                      )}
                      {isOutputSelected('STRATEGIC_RECS') && (
                          <button onClick={() => setActiveTab('strategy')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'strategy' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Recs</button>
                      )}
                      {isOutputSelected('PRD') && <button onClick={() => setActiveTab('prd')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'prd' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>PRD</button>}
                      {isOutputSelected('ROADMAP') && <button onClick={() => setActiveTab('roadmap')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roadmap' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Roadmap</button>}
                      {isOutputSelected('JOURNEY_MAP') && <button onClick={() => setActiveTab('journey')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'journey' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Blueprint</button>}
                      {isOutputSelected('TECH_ARCH') && <button onClick={() => setActiveTab('tech')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tech' ? 'bg-[var(--card-bg)] shadow' : 'text-[var(--text-tertiary)]'}`}>Tech Arch</button>}
                  </div>
              </div>
              <div className="flex gap-2">
                   <button onClick={handleExportCSV} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">CSV</button>
                   <button onClick={handleDownloadPDF} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">{isExporting ? '...' : 'PDF'}</button>
                   <button onClick={handleExportPPTX} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">{isExporting ? '...' : 'PPTX'}</button>
                   <button onClick={handleExportJSON} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">JSON</button>
                   <button onClick={handleSaveClick} className="bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide">Save</button>
                   <button onClick={onReset} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition-colors">New</button>
              </div>
          </div>
          <div className="flex-1 overflow-auto p-8">
              <div ref={contentRef} className="max-w-7xl mx-auto bg-[var(--bg-primary)] p-8 rounded shadow-sm border border-[var(--border-primary)] min-h-[80vh]">
                  {activeTab === 'personas' && (
                      <div className="space-y-8">
                          <h2 className="text-3xl font-black mb-8 border-b pb-4">Archetypes & Personas</h2>
                          <div className="grid grid-cols-1 gap-16">
                              {(personasData || []).map((p: any, i: number) => (
                                  <div key={i} className="persona-card bg-[var(--card-bg)] border border-[var(--border-primary)] rounded overflow-hidden shadow-sm">
                                      {/* HEADER: Image + Identity + Quote */}
                                      <div className="grid md:grid-cols-3">
                                          <div className="relative aspect-square md:aspect-auto bg-[var(--bg-tertiary)] min-h-[280px]">
                                              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)]">Generating...</div>}
                                              <button onClick={() => handleRegeneratePersonaImage(i)} className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70">Regen</button>
                                          </div>
                                          <div className="md:col-span-2 p-6 flex flex-col gap-4">
                                              <div>
                                                  <input value={p.name} onChange={e => updatePersonaField(i, 'name', e.target.value)} className="text-3xl font-bold bg-transparent outline-none w-full" />
                                                  <input value={p.role} onChange={e => updatePersonaField(i, 'role', e.target.value)} className="text-[var(--nxt-teal)] font-bold bg-transparent outline-none w-full text-lg" />
                                                  {p.demographics && <div className="text-sm text-[var(--text-tertiary)] mt-1">{p.demographics}</div>}
                                              </div>
                                              <div className="bg-[var(--bg-tertiary)] p-4 rounded border-l-4 border-[var(--nxt-lime)]">
                                                  <textarea value={p.quote} onChange={e => updatePersonaField(i, 'quote', e.target.value)} className="w-full bg-transparent text-lg italic outline-none text-[var(--text-primary)]" rows={2} />
                                              </div>
                                              <textarea value={p.bio} onChange={e => updatePersonaField(i, 'bio', e.target.value)} className="w-full bg-transparent text-sm outline-none text-[var(--text-secondary)] leading-relaxed" rows={3} />
                                          </div>
                                      </div>

                                      {/* FIVE Ws — Strategic Analysis */}
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
                                                      <div className="text-[var(--text-secondary)] leading-snug">{w.value || '—'}</div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}

                                      {/* MOTIVATIONS + PAIN POINTS + TASKS + OPPORTUNITIES */}
                                      <div className="grid md:grid-cols-2 gap-0">
                                          {/* Motivations */}
                                          {p.motivations && p.motivations.length > 0 && (
                                              <div className="p-5 border-r border-b border-[var(--border-primary)]">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#0CCE6B] mb-3">Motivations ({p.motivations.length})</div>
                                                  <div className="space-y-2">
                                                      {p.motivations.map((m: any, mi: number) => (
                                                          <div key={mi} className="text-xs">
                                                              <div className="font-bold text-[var(--text-primary)]">{m.label}</div>
                                                              {m.quote && <div className="text-[var(--text-tertiary)] italic mt-0.5 text-[11px]">"{m.quote}"</div>}
                                                              {m.citation?.sourceName && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{m.citation.sourceFile} - {m.citation.sourceName}</div>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          {/* Pain Points */}
                                          {p.painPoints && p.painPoints.length > 0 && (
                                              <div className="p-5 border-b border-[var(--border-primary)]">
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#FF5A5A] mb-3">Pain Points ({p.painPoints.length})</div>
                                                  <div className="space-y-2">
                                                      {p.painPoints.map((pp: any, pi: number) => (
                                                          <div key={pi} className="text-xs">
                                                              <div className="font-bold text-[var(--text-primary)]">{pp.label}</div>
                                                              {pp.quote && <div className="text-[var(--text-tertiary)] italic mt-0.5 text-[11px]">"{pp.quote}"</div>}
                                                              {pp.citation?.sourceName && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{pp.citation.sourceFile} - {pp.citation.sourceName}</div>}
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
                                                              {o.citation?.sourceName && <div className="text-[9px] text-[var(--nxt-teal)] mt-0.5">{o.citation.sourceFile} - {o.citation.sourceName}</div>}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
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
                          <h2 className="text-3xl font-black mb-4 border-b pb-4">Strategic Roadmap</h2>
                          <div className="grid grid-cols-3 gap-6 h-full min-h-[600px]">
                              {['Now', 'Next', 'Later'].map((horizon) => (
                                  <div key={horizon} className="bg-[var(--bg-tertiary)] rounded p-4 border border-[var(--border-secondary)]">
                                      <h3 className="font-black text-lg uppercase tracking-widest text-[var(--text-tertiary)] mb-4">{horizon}</h3>
                                      <div className="space-y-3">
                                          {roadmapData.items.filter(i => i.horizon === horizon).map((item, idx) => (
                                              <div key={idx} className="bg-[var(--card-bg)] p-4 rounded-lg shadow-sm border border-[var(--border-primary)]">
                                                  <input value={item.initiative} onChange={(e) => { const rIdx = roadmapData.items.findIndex(x => x === item); updateRoadmapItem(rIdx, 'initiative', e.target.value); }} className="font-bold text-sm bg-transparent w-full mb-2 outline-none" />
                                                  <textarea value={item.description} onChange={(e) => { const rIdx = roadmapData.items.findIndex(x => x === item); updateRoadmapItem(rIdx, 'description', e.target.value); }} className="text-xs text-[var(--text-secondary)] bg-transparent w-full resize-none h-16 outline-none" />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {activeTab === 'prd' && prdData && (
                      <div className="space-y-8">
                          <h2 className="text-3xl font-black mb-4 border-b pb-4">Product Requirements Document</h2>
                          <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm">
                              <h3 className="text-2xl font-bold mb-2">{prdData.title}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Purpose & Objectives</h4>
                                      <p className="text-[var(--text-secondary)]">{prdData.purposeAndObjectives}</p>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Target Audience</h4>
                                      <p className="text-[var(--text-secondary)]">{prdData.targetAudience}</p>
                                  </div>
                              </div>
                              <div className="mt-8">
                                  <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-4">Features</h4>
                                  <div className="space-y-4">
                                      {prdData.features.map((feature, idx) => (
                                          <div key={idx} className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-secondary)]">
                                              <div className="flex justify-between items-start mb-2">
                                                  <input value={feature.name} onChange={(e) => updatePRDFeature(idx, 'name', e.target.value)} className="font-bold text-lg bg-transparent outline-none w-full" />
                                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded ml-4 whitespace-nowrap">{feature.priority}</span>
                                              </div>
                                              <textarea value={feature.description} onChange={(e) => updatePRDFeature(idx, 'description', e.target.value)} className="w-full bg-transparent text-sm text-[var(--text-secondary)] outline-none resize-none h-16" />
                                              <div className="mt-2">
                                                  <h5 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">User Stories</h5>
                                                  <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] mt-1">
                                                      {feature.userStories.map((story, i) => <li key={i}>{story}</li>)}
                                                  </ul>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Success Metrics</h4>
                                      <ul className="list-disc list-inside text-[var(--text-secondary)]">
                                          {prdData.successMetrics.map((metric, i) => <li key={i}>{metric}</li>)}
                                      </ul>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-lg text-[var(--text-secondary)] mb-2">Risks & Assumptions</h4>
                                      <ul className="list-disc list-inside text-[var(--text-secondary)]">
                                          {[...(prdData.risks || []), ...(prdData.assumptions || [])].map((item, i) => <li key={i}>{item}</li>)}
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  {activeTab === 'journey' && journeyData && (
                      <div className="space-y-8">
                          <div className="flex justify-between items-center mb-4 border-b pb-4">
                              <h2 className="text-3xl font-black">Service Blueprint</h2>
                              <button onClick={() => handleRegenerateDiagram('journey')} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-[var(--bg-secondary)]">
                                  {diagramStatus.journey === 'generating' ? 'Generating...' : 'Regenerate Diagram'}
                              </button>
                          </div>
                          
                          {journeyDiagramUrl && (
                              <div className="diagram-container relative w-full aspect-[16/9] bg-[var(--bg-tertiary)] rounded overflow-hidden border border-[var(--border-primary)] mb-8 shadow-sm">
                                  <img src={journeyDiagramUrl} className="w-full h-full object-cover" alt="Service Blueprint Diagram" />
                              </div>
                          )}
                          
                          <div className="details-container overflow-x-auto pb-4">
                              <div className="inline-flex gap-4 min-w-full">
                                  {journeyData.map((stage, idx) => (
                                      <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-5 shadow-sm min-w-[300px] flex-1 flex flex-col">
                                          <div className="mb-4 pb-3 border-b border-[var(--border-secondary)]">
                                              <input value={stage.phase} onChange={(e) => updateJourneyStage(idx, 'phase', e.target.value)} className="font-black text-xl bg-transparent outline-none w-full text-[var(--nxt-teal)]" />
                                          </div>
                                          
                                          <div className="space-y-4 flex-1">
                                              <div>
                                                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Customer Action</label>
                                                  <textarea value={stage.customerAction} onChange={(e) => updateJourneyStage(idx, 'customerAction', e.target.value)} className="w-full bg-transparent text-sm font-medium outline-none resize-none h-12" />
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-2">
                                                  <div className="bg-[var(--bg-tertiary)] p-2 rounded">
                                                      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">Touchpoint</label>
                                                      <input value={stage.touchpoint} onChange={(e) => updateJourneyStage(idx, 'touchpoint', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                                                  </div>
                                                  <div className="bg-[var(--bg-tertiary)] p-2 rounded">
                                                      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">Emotion</label>
                                                      <select value={stage.emotion} onChange={(e) => updateJourneyStage(idx, 'emotion', e.target.value as any)} className="w-full bg-transparent text-xs outline-none">
                                                          <option value="Delighted">Delighted</option>
                                                          <option value="Positive">Positive</option>
                                                          <option value="Neutral">Neutral</option>
                                                          <option value="Negative">Negative</option>
                                                          <option value="Frustrated">Frustrated</option>
                                                      </select>
                                                  </div>
                                              </div>
                                              
                                              <div className="border-t border-dashed border-[var(--border-secondary)] pt-3">
                                                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Frontstage (Visible)</label>
                                                  <textarea value={stage.frontstageAction} onChange={(e) => updateJourneyStage(idx, 'frontstageAction', e.target.value)} className="w-full bg-transparent text-sm outline-none resize-none h-12" />
                                              </div>
                                              
                                              <div className="border-t border-dashed border-[var(--border-secondary)] pt-3">
                                                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase block mb-1">Backstage (Invisible)</label>
                                                  <textarea value={stage.backstageAction} onChange={(e) => updateJourneyStage(idx, 'backstageAction', e.target.value)} className="w-full bg-transparent text-sm outline-none resize-none h-12" />
                                              </div>
                                              
                                              {stage.painPoint && (
                                                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 mt-auto">
                                                      <label className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase block mb-1">Pain Point</label>
                                                      <textarea value={stage.painPoint} onChange={(e) => updateJourneyStage(idx, 'painPoint', e.target.value)} className="w-full bg-transparent text-xs text-red-800 dark:text-red-300 outline-none resize-none h-10" />
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
                  {activeTab === 'tech' && techData && (
                      <div className="space-y-8">
                          <div className="diagram-container relative w-full aspect-[16/9] bg-[var(--bg-tertiary)] rounded overflow-hidden border border-[var(--border-primary)] mb-8">
                               {techDiagramUrl ? <img src={techDiagramUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center">No Diagram Generated</div>}
                          </div>
                          <div className="details-container">
                              <h2 className="text-3xl font-black mb-4 border-b pb-4">Nodes</h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {techData.nodes.map((node, i) => (
                                      <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm">
                                          <div className="flex items-center gap-3 mb-4">
                                              <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-xs bg-gray-500">
                                                  {(node.type || '').substring(0, 2)}
                                              </div>
                                              <input value={node.label} onChange={(e) => updateTechNode(i, 'label', e.target.value)} className="font-bold bg-transparent outline-none flex-1" />
                                          </div>
                                          <textarea value={node.description} onChange={(e) => updateTechNode(i, 'description', e.target.value)} className="w-full text-xs text-[var(--text-secondary)] bg-transparent resize-none h-20 outline-none" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
                  {activeTab === 'strategy' && (
                      <div className="space-y-8">
                           <h2 className="text-3xl font-black mb-8 border-b pb-4">Strategic Recommendations</h2>
                           {(result.recommendations || []).map((rec: any, i: number) => {
                               const impactColors: Record<string, string> = { 'HIGH': 'bg-red-100 text-red-700', 'MEDIUM': 'bg-amber-100 text-amber-700', 'LOW': 'bg-blue-100 text-blue-700' };
                               return (
                               <div key={i} className="bg-[var(--card-bg)] p-6 rounded border border-[var(--border-primary)] shadow-sm">
                                   <div className="flex justify-between items-start mb-3">
                                       <h3 className="text-xl font-bold flex-1">{rec.title}</h3>
                                       <span className={`px-3 py-1 rounded-full text-xs font-bold ${impactColors[rec.impactLevel?.toUpperCase()] || 'bg-gray-100 text-gray-700'}`}>{rec.impactLevel}</span>
                                   </div>
                                   <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">{rec.description}</p>
                                   {rec.actionItems && rec.actionItems.length > 0 && (
                                       <div className="border-t border-[var(--border-primary)] pt-3">
                                           <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-2">Action Items</div>
                                           <div className="space-y-1.5">
                                               {rec.actionItems.map((item: string, ai: number) => (
                                                   <div key={ai} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                                       <span className="text-[var(--nxt-teal)] font-bold mt-0.5 text-xs">{ai + 1}.</span>
                                                       <span>{item}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                               </div>
                               );
                           })}
                      </div>
                  )}
                  {activeTab === 'script' && (
                      <div className="space-y-12">
                          <h2 className="text-3xl font-black mb-8 border-b pb-4">Video Storyboard</h2>
                          {scriptScenes.map((scene: any, i: number) => (
                              <div key={i} className="flex flex-col md:flex-row gap-6 items-start group">
                                  {/* Scene number + visual */}
                                  <div className="w-full md:w-5/12 relative">
                                      <div className="absolute top-2 left-2 z-10 bg-[var(--nxt-teal)] text-white text-xs font-bold px-2 py-1 rounded-sm">Scene {i + 1}</div>
                                      <div className="aspect-video bg-black rounded overflow-hidden relative shadow-sm">
                                          {scene.videoUrl ? <video src={scene.videoUrl} controls className="w-full h-full object-cover" /> : scene.imageUrl ? <img src={scene.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500">Visual</div>}
                                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => handleRegenerateImage(i)} className="bg-white/20 text-white px-3 py-1.5 rounded text-xs">Regen Frame</button>
                                              <button onClick={() => handleGenerateVideo(i)} className="bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-3 py-1.5 rounded text-xs font-bold">Animate</button>
                                          </div>
                                      </div>
                                  </div>
                                  {/* Scene content */}
                                  <div className="flex-1 space-y-3 pt-1 w-full">
                                      <div>
                                          <label className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Visual Direction</label>
                                          <textarea value={scene.visualPrompt || scene.visualDescription} onChange={(e) => updateScriptScene(i, 'visualPrompt', e.target.value)} className="w-full bg-[var(--bg-tertiary)] text-xs p-3 rounded h-16 outline-none border border-[var(--border-primary)]" />
                                      </div>
                                      {scene.quote && (
                                          <div className="bg-[var(--bg-tertiary)] p-3 rounded border-l-4 border-[var(--nxt-lime)]">
                                              <label className="text-[8px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] block mb-1">Evidence Quote</label>
                                              <div className="text-sm italic text-[var(--text-secondary)]">"{scene.quote}"</div>
                                          </div>
                                      )}
                                      <div>
                                          <label className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Narration</label>
                                          <textarea value={scene.audioNarration} onChange={(e) => updateScriptScene(i, 'audioNarration', e.target.value)} className="w-full bg-white text-sm p-3 rounded h-20 outline-none border border-[var(--border-primary)]" />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
          <EvidenceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalData.title} content={modalData.content} citations={modalData.citations} quote={modalData.quote} />
      </div>
  );
};

export default ResultsView;
