
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisStage, StepResult_Ingestion, StepResult_Themes, StepResult_Personas, StepResult_Structure, StepResult_Narrative, StepResult_JourneyMap, StepResult_TechArch, StepResult_PRD, StepResult_Roadmap, StepResult_Recommendations, Slide, Theme, Persona, ScriptScene, ServiceBlueprintStage, PRDFeature, RoadmapItem, StrategicRecommendation } from '../types';
import { logEdit } from '../services/promptImprovementEngine';

interface Props {
  stage: AnalysisStage;
  data: any;
  isProcessing: boolean;
  onApprove: (feedback?: string, modifiedData?: any, interventionDetails?: string) => void;
  onClose?: () => void;
  currentLog?: string;
}

// Internal Loading Component for Initial States
const LoadingView = ({ log, elapsed }: { log?: string, elapsed: number }) => (
    <div className="flex flex-col items-center justify-center h-full p-12 space-y-8 animate-fade-in w-full">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-[var(--border-secondary)] rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-[var(--nxt-teal)] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-[var(--nxt-teal)]">
                {elapsed}s
            </div>
        </div>
        <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold">Analyzing Research Data...</h3>
            <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto leading-relaxed">
                AI is performing deep reasoning on your documents. <br/>
                <span className="opacity-70">This ensures high-fidelity context extraction.</span>
            </p>
        </div>
        <div className="bg-[var(--bg-tertiary)] p-4 rounded max-w-lg w-full border border-[var(--border-secondary)] shadow-inner">
             <div className="flex items-center gap-2 mb-2 border-b border-[var(--border-secondary)] pb-2">
                 <div className="w-2 h-2 rounded-full bg-[var(--nxt-lime)] animate-pulse"></div>
                 <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Live Reasoning Trace</div>
             </div>
             <div className="font-mono text-xs text-[var(--text-primary)] min-h-[3rem] flex items-center justify-center text-center opacity-80 break-words line-clamp-3">
                 {log ? log.replace(/\[.*?\]/g, '').trim() : "Initializing reasoning engine..."}
             </div>
        </div>
    </div>
);

const AnalysisCheckpoint: React.FC<Props> = ({ stage, data, isProcessing, onApprove, onClose, currentLog }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timer for Loading State
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    // Start timer if processing OR if data is missing (initial load)
    if (isProcessing || !data) {
        interval = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);
    } else {
        setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, data]);
  
  // Local state for editing 
  const [editedThemes, setEditedThemes] = useState<Theme[]>([]);
  const [editedPersonas, setEditedPersonas] = useState<Persona[]>([]);
  const [editedNarrative, setEditedNarrative] = useState<StepResult_Narrative | null>(null);
  const [editedStructure, setEditedStructure] = useState<StepResult_Structure | null>(null);
  const [editedJourney, setEditedJourney] = useState<StepResult_JourneyMap | null>(null);
  const [editedArch, setEditedArch] = useState<StepResult_TechArch | null>(null);
  const [editedPRD, setEditedPRD] = useState<StepResult_PRD | null>(null);
  const [editedRoadmap, setEditedRoadmap] = useState<StepResult_Roadmap | null>(null);
  const [editedRecs, setEditedRecs] = useState<StepResult_Recommendations | null>(null);
  
  const [expandedPersona, setExpandedPersona] = useState<number | null>(null);
  const [narrativeTab, setNarrativeTab] = useState<'script' | 'slides'>('script');
  const [hasEdits, setHasEdits] = useState(false);
  
  // Track specific edits for logging
  const [editLog, setEditLog] = useState<string[]>([]);
  
  const prevDataRef = useRef<any>(null);

  useEffect(() => {
      setFeedback('');
      setHasEdits(false);
      setEditLog([]);
      setIsSubmitting(false);

      if (!data) return;

      const currentDataStr = JSON.stringify(data);
      const prevDataStr = prevDataRef.current ? JSON.stringify(prevDataRef.current) : "";

      if (currentDataStr === prevDataStr && prevDataRef.current !== null) {
          return;
      }
      
      prevDataRef.current = data;

      try {
          if (stage === AnalysisStage.THEMES) {
              const d = data as StepResult_Themes;
              if (d.themes && Array.isArray(d.themes)) {
                  setEditedThemes(d.themes.map(t => ({...t, status: t.status || 'approved'})));
              }
          }
          else if (stage === AnalysisStage.PERSONAS) {
              const d = data as StepResult_Personas;
              if (d.personas && Array.isArray(d.personas)) {
                  setEditedPersonas(JSON.parse(JSON.stringify(d.personas)));
                  if (d.personas.length > 0) setExpandedPersona(0);
              }
          }
          else if (stage === AnalysisStage.DECK_STRUCTURE) {
              setEditedStructure(JSON.parse(JSON.stringify(data)));
          } 
          else if (stage === AnalysisStage.NARRATIVE) {
              const nar = JSON.parse(JSON.stringify(data)) as StepResult_Narrative;
              setEditedNarrative(nar);
              if ((!nar.videoScript || nar.videoScript.length === 0) && nar.slides?.length > 0) {
                  setNarrativeTab('slides');
              } else {
                  setNarrativeTab('script');
              }
          } 
          else if (stage === AnalysisStage.JOURNEY_MAP) {
              setEditedJourney(JSON.parse(JSON.stringify(data)));
          } 
          else if (stage === AnalysisStage.TECH_ARCH) {
              setEditedArch(JSON.parse(JSON.stringify(data)));
          } 
          else if (stage === AnalysisStage.PRD) {
              setEditedPRD(JSON.parse(JSON.stringify(data)));
          } 
          else if (stage === AnalysisStage.ROADMAP) {
              setEditedRoadmap(JSON.parse(JSON.stringify(data)));
          } 
          else if (stage === AnalysisStage.RECOMMENDATIONS) {
              setEditedRecs(JSON.parse(JSON.stringify(data)));
          }
      } catch (e) {
          console.error("Error initializing checkpoint data", e);
      }
  }, [data, stage]);

  const logEdit = (desc: string) => {
      setHasEdits(true);
      if (!editLog.includes(desc)) {
          setEditLog(prev => [...prev, desc]);
      }
  };

  // --- EDITOR FUNCTIONS ---

  const toggleThemeStatus = (index: number, status: 'approved' | 'skipped' | 'priority') => {
      const newThemes = [...editedThemes];
      if (newThemes[index]) { 
          newThemes[index].status = status; 
          setEditedThemes(newThemes); 
          logEdit(`Changed Theme '${newThemes[index].name}' to ${status}`);
      }
  };

  const updatePersona = (index: number, field: keyof Persona, value: string) => {
      const newPersonas = [...editedPersonas];
      if (newPersonas[index]) { 
          (newPersonas[index] as any)[field] = value; 
          setEditedPersonas(newPersonas); 
          logEdit(`Edited Persona '${newPersonas[index].name}' ${field}`);
      }
  };
  
  const updatePersonaFiveW = (index: number, key: string, value: string) => {
      const newPersonas = [...editedPersonas];
      if (newPersonas[index] && newPersonas[index].fiveWs) { 
          (newPersonas[index].fiveWs as any)[key] = value; 
          setEditedPersonas(newPersonas); 
          logEdit(`Edited Persona '${newPersonas[index].name}' 5Ws (${key})`);
      }
  };

  const updateJourneyStage = (index: number, field: keyof ServiceBlueprintStage, value: string) => {
      if (!editedJourney) return;
      const newStages = [...editedJourney.stages];
      (newStages[index] as any)[field] = value;
      setEditedJourney({...editedJourney, stages: newStages});
      logEdit(`Modified Blueprint Stage ${index+1}: ${field}`);
  };

  const updatePRDField = (field: string, value: string) => {
      if (!editedPRD) return;
      const newPRD = { ...editedPRD.prd, [field]: value };
      setEditedPRD({ ...editedPRD, prd: newPRD });
      logEdit(`Updated PRD: ${field}`);
  };
  
  const updatePRDListField = (field: string, value: string) => {
      if (!editedPRD) return;
      const list = value.split('\n');
      const newPRD = { ...editedPRD.prd, [field]: list };
      setEditedPRD({ ...editedPRD, prd: newPRD });
      logEdit(`Updated PRD List: ${field}`);
  };

  const updatePRDFeature = (index: number, field: keyof PRDFeature, value: string) => {
      if (!editedPRD) return;
      const newFeatures = [...editedPRD.prd.features];
      (newFeatures[index] as any)[field] = value;
      setEditedPRD({ ...editedPRD, prd: { ...editedPRD.prd, features: newFeatures } });
      logEdit(`Edited Feature '${newFeatures[index].name}'`);
  };

  const addPRDFeature = () => {
      if (!editedPRD) return;
      const newFeature: PRDFeature = {
          id: Date.now().toString(),
          name: "New Feature",
          description: "Description",
          priority: "Should-have",
          userStories: [],
          dependencies: ""
      };
      setEditedPRD({ ...editedPRD, prd: { ...editedPRD.prd, features: [...editedPRD.prd.features, newFeature] } });
      logEdit("Added New Feature");
  };

  const deletePRDFeature = (index: number) => {
      if (!editedPRD) return;
      const newFeatures = editedPRD.prd.features.filter((_, i) => i !== index);
      setEditedPRD({ ...editedPRD, prd: { ...editedPRD.prd, features: newFeatures } });
      logEdit(`Deleted Feature ${index + 1}`);
  };

  const updateRoadmapItem = (index: number, field: keyof RoadmapItem, value: string) => {
      if (!editedRoadmap) return;
      const newItems = [...editedRoadmap.roadmap.items];
      (newItems[index] as any)[field] = value;
      setEditedRoadmap({ ...editedRoadmap, roadmap: { ...editedRoadmap.roadmap, items: newItems } });
      logEdit(`Updated Roadmap Item: ${field}`);
  };

  const updateRecommendation = (index: number, field: keyof StrategicRecommendation, value: any) => {
      if (!editedRecs) return;
      const newRecs = [...editedRecs.recommendations];
      (newRecs[index] as any)[field] = value;
      setEditedRecs({ ...editedRecs, recommendations: newRecs });
      logEdit(`Edited Recommendation ${index+1}`);
  };
  
  const deleteRecommendation = (index: number) => {
      if (!editedRecs) return;
      const newRecs = editedRecs.recommendations.filter((_, i) => i !== index);
      setEditedRecs({ ...editedRecs, recommendations: newRecs });
      logEdit(`Deleted Recommendation ${index+1}`);
  };

  const addRecommendation = () => {
      if (!editedRecs) return;
      const newRec: StrategicRecommendation = {
          title: "New Opportunity",
          description: "Describe the strategic opportunity here.",
          impactLevel: "MEDIUM",
          actionItems: ["First step"]
      };
      setEditedRecs({ ...editedRecs, recommendations: [...editedRecs.recommendations, newRec] });
      logEdit(`Added New Recommendation`);
  };

  const updateSlideStructure = (index: number, field: keyof Slide, value: string) => {
      if (!editedStructure) return;
      const newSlides = [...editedStructure.slides];
      (newSlides[index] as any)[field] = value;
      setEditedStructure({ ...editedStructure, slides: newSlides });
      logEdit(`Updated Slide ${index+1}: ${field}`);
  };

  const updateSlideNarrative = (index: number, field: keyof Slide, value: any) => {
      if (!editedNarrative || !editedNarrative.slides) return;
      const newSlides = [...editedNarrative.slides];
      (newSlides[index] as any)[field] = value;
      setEditedNarrative({ ...editedNarrative, slides: newSlides });
      logEdit(`Updated Narrative Slide ${index+1}: ${field}`);
  };

  const updateScriptScene = (index: number, field: keyof ScriptScene, value: any) => {
      if (!editedNarrative || !editedNarrative.videoScript) return;
      const newScript = [...editedNarrative.videoScript];
      (newScript[index] as any)[field] = value;
      setEditedNarrative({ ...editedNarrative, videoScript: newScript });
      logEdit(`Updated Scene ${index+1}: ${field}`);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
      if (!editedStructure) return;
      const newSlides = [...editedStructure.slides];
      if (direction === 'up' && index > 0) {
          [newSlides[index], newSlides[index-1]] = [newSlides[index-1], newSlides[index]];
      } else if (direction === 'down' && index < newSlides.length - 1) {
          [newSlides[index], newSlides[index+1]] = [newSlides[index+1], newSlides[index]];
      }
      newSlides.forEach((s, i) => s.slideNumber = i + 1);
      setEditedStructure({ ...editedStructure, slides: newSlides });
      logEdit("Reordered Slides");
  };

  const addSlide = () => {
      if (!editedStructure) return;
      const newSlide: Slide = {
          slideNumber: editedStructure.slides.length + 1,
          layout: 'CONTENT_SPLIT_RIGHT',
          title: 'New Slide',
          content: [],
          narrative: '',
          speakerNotes: '',
          visualPrompt: '',
          quote: '',
          rationale: 'Added manually',
          style: { backgroundColor: '#ffffff', headerColor: '#115054', textColor: '#141414', accentColor: '#caca20' }
      };
      setEditedStructure({ ...editedStructure, slides: [...editedStructure.slides, newSlide] });
      logEdit("Added New Slide");
  };

  const deleteSlide = (index: number) => {
      if (!editedStructure) return;
      const newSlides = editedStructure.slides.filter((_, i) => i !== index).map((s, i) => ({...s, slideNumber: i+1}));
      setEditedStructure({ ...editedStructure, slides: newSlides });
      logEdit(`Deleted Slide ${index+1}`);
  };

  const handleConfirm = () => {
      setIsSubmitting(true);
      let modifiedData = undefined;
      
      let interventionSummary = "";
      if (feedback) {
          interventionSummary = `User Feedback: "${feedback}"`;
      }
      
      if (hasEdits) {
          const editCount = editLog.length;
          const specificEdits = editLog.slice(0, 3).join(", ");
          const suffix = editCount > 3 ? `...and ${editCount - 3} more.` : "";
          
          if (interventionSummary) interventionSummary += " | ";
          interventionSummary += `Manual Interventions: ${specificEdits}${suffix}`;
          
          if (stage === AnalysisStage.THEMES) modifiedData = { ...data, themes: editedThemes };
          else if (stage === AnalysisStage.PERSONAS) modifiedData = { ...data, personas: editedPersonas };
          else if (stage === AnalysisStage.DECK_STRUCTURE && editedStructure) modifiedData = editedStructure;
          else if (stage === AnalysisStage.NARRATIVE && editedNarrative) modifiedData = editedNarrative;
          else if (stage === AnalysisStage.JOURNEY_MAP && editedJourney) modifiedData = editedJourney;
          else if (stage === AnalysisStage.TECH_ARCH && editedArch) modifiedData = editedArch;
          else if (stage === AnalysisStage.PRD && editedPRD) modifiedData = editedPRD;
          else if (stage === AnalysisStage.ROADMAP && editedRoadmap) modifiedData = editedRoadmap;
          else if (stage === AnalysisStage.RECOMMENDATIONS && editedRecs) modifiedData = editedRecs;
      } else if (!feedback) {
          interventionSummary = "Approved without changes.";
      }

      // Log edits to prompt improvement engine
      if (hasEdits && editLog.length > 0) {
          for (const edit of editLog) {
              logEdit(stage, edit, '', edit); // field-level logging
          }
      }

      onApprove(feedback, modifiedData, interventionSummary);
  };

  // --- RENDERERS ---

  const renderIngestion = () => {
      const d = data as StepResult_Ingestion;
      if (!d) return <LoadingView log={currentLog} elapsed={elapsed} />;

      // Parse source breakdown from documents metadata
      const docs = d.documents || [];
      const sourceGroups: Record<string, { count: number; names: string[] }> = {};
      for (const doc of docs) {
          const name = doc.fileName || 'Unknown';
          // Group by source type (extract from filename pattern like "intelligence_sources_*.txt" or actual filenames)
          const isIntelligence = name.includes('intelligence_sources');
          const group = isIntelligence ? 'Intelligence Data Sources' : 'Uploaded Documents';
          if (!sourceGroups[group]) sourceGroups[group] = { count: 0, names: [] };
          sourceGroups[group].count++;
          if (sourceGroups[group].names.length < 5) sourceGroups[group].names.push(name);
      }

      const confidenceColor = d.confidenceScore >= 0.7 ? '#0CCE6B' : d.confidenceScore >= 0.4 ? '#fd8e2e' : '#FF5A5A';

      return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* SUMMARY */}
              <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Research Context Summary</div>
                  <div className="bg-[var(--bg-secondary)] p-4 rounded border border-[var(--border-primary)]">
                      <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{d.summary}</p>
                  </div>
              </div>

              {/* METRICS ROW */}
              <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Documents</div>
                      <div className="text-2xl font-extralight text-[var(--text-primary)] mt-1">{docs.length}</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Confidence</div>
                      <div className="text-2xl font-extralight mt-1" style={{color: confidenceColor}}>{typeof d.confidenceScore === 'number' ? (d.confidenceScore > 1 ? d.confidenceScore : Math.round(d.confidenceScore * 100)) : '?'}%</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Data Types</div>
                      <div className="text-2xl font-extralight text-[var(--text-primary)] mt-1">{d.dataTypesIdentified?.length || 0}</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Stakeholders</div>
                      <div className="text-2xl font-extralight text-[var(--text-primary)] mt-1">{d.keyStakeholders?.length || 0}</div>
                  </div>
              </div>

              {/* SOURCE BREAKDOWN */}
              {Object.keys(sourceGroups).length > 0 && (
                  <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Source Breakdown</div>
                      <div className="space-y-2">
                          {Object.entries(sourceGroups).map(([group, info]) => (
                              <div key={group} className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)]">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-[var(--text-primary)]">{group}</span>
                                      <span className="text-[10px] font-bold bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-2 py-0.5 rounded-sm">{info.count} files</span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                                      {info.names.map((n, i) => <div key={i} className="truncate">{n}</div>)}
                                      {info.count > 5 && <div className="italic">...and {info.count - 5} more</div>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* KEY STAKEHOLDERS */}
              {d.keyStakeholders && d.keyStakeholders.length > 0 && (
                  <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Key Stakeholders Identified</div>
                      <div className="flex flex-wrap gap-1.5">
                          {d.keyStakeholders.map((s, i) => (
                              <span key={i} className="text-[11px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] px-2 py-1 rounded">{s}</span>
                          ))}
                      </div>
                  </div>
              )}

              {/* DATA TYPES */}
              {d.dataTypesIdentified && d.dataTypesIdentified.length > 0 && (
                  <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Data Types Identified</div>
                      <div className="flex flex-wrap gap-1.5">
                          {d.dataTypesIdentified.map((t, i) => (
                              <span key={i} className="text-[11px] bg-[var(--nxt-lime-10)] border border-[var(--nxt-lime-20)] text-[var(--nxt-teal)] px-2 py-1 rounded">{t}</span>
                          ))}
                      </div>
                  </div>
              )}

              {/* REASONING */}
              {d.reasoning && (
                  <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">AI Reasoning</div>
                      <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-[11px] text-[var(--text-secondary)] leading-relaxed font-mono">
                          {d.reasoning}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderThemes = () => (
      <div className="space-y-3 max-h-[65vh] overflow-y-auto">
          {(editedThemes || []).map((theme, idx) => (
              <div key={idx} className={`rounded border overflow-hidden transition-all ${theme.status === 'skipped' ? 'opacity-30' : ''} ${theme.status === 'priority' ? 'border-[var(--nxt-lime)] ring-1 ring-[var(--nxt-lime)]' : 'border-[var(--border-primary)]'}`}>
                  {/* THEME HEADER BAR */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                      {/* Status buttons - horizontal row */}
                      <div className="flex gap-1 flex-shrink-0">
                          <button title="Priority" onClick={() => toggleThemeStatus(idx, 'priority')} className={`w-5 h-5 rounded-sm border text-[9px] font-bold flex items-center justify-center ${theme.status === 'priority' ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 text-gray-300 hover:border-amber-400'}`}>P</button>
                          <button title="Approve" onClick={() => toggleThemeStatus(idx, 'approved')} className={`w-5 h-5 rounded-sm border text-[9px] font-bold flex items-center justify-center ${theme.status === 'approved' || !theme.status ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400'}`}>A</button>
                          <button title="Skip" onClick={() => toggleThemeStatus(idx, 'skipped')} className={`w-5 h-5 rounded-sm border text-[9px] font-bold flex items-center justify-center ${theme.status === 'skipped' ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-300 text-gray-300 hover:border-gray-400'}`}>S</button>
                      </div>
                      {/* Theme title */}
                      <h4 className="font-bold text-sm text-[var(--text-primary)] flex-1">{theme.name}</h4>
                      {/* Badges */}
                      <div className="flex gap-1.5 flex-shrink-0">
                          {theme.isCrossDocument && <span className="text-[8px] font-bold uppercase tracking-widest bg-[var(--nxt-teal)] text-white px-1.5 py-0.5 rounded-sm">Multi-Source</span>}
                          {theme.citations && theme.citations.length > 0 && <span className="text-[8px] font-bold uppercase tracking-widest bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-1.5 py-0.5 rounded-sm">{theme.citations.length} cited</span>}
                      </div>
                  </div>

                  {/* THEME BODY */}
                  <div className="px-4 py-3">
                      {/* Description */}
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{theme.description}</p>

                      {/* Primary Quote */}
                      {theme.quote && (
                          <div className="mt-3 pl-3 border-l-2 border-[var(--nxt-lime)] bg-[var(--bg-secondary)] p-3 rounded-r">
                              <p className="text-[13px] italic text-[var(--text-primary)] leading-relaxed">"{theme.quote}"</p>
                          </div>
                      )}
                  </div>

                  {/* EVIDENCE SECTION */}
                  {theme.citations && theme.citations.length > 0 && (
                      <div className="px-4 pb-3">
                          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Supporting Evidence ({theme.citations.length})</div>
                          <div className="space-y-2">
                              {theme.citations.map((cit, ci) => (
                                  <div key={ci} className="py-2.5 px-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                                      {/* Quote */}
                                      <p className="text-[12px] italic text-[var(--text-primary)] leading-relaxed">"{cit.text}"</p>
                                      {/* Source attribution row */}
                                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                                          {/* Chunk ID badge */}
                                          <span className="font-bold text-[var(--nxt-teal)] bg-[var(--nxt-lime-10)] px-1.5 py-0.5 rounded-sm border border-[var(--nxt-lime-20)]">{cit.sourceFile}</span>
                                          {/* Source name */}
                                          {cit.sourceName && <span className="font-bold text-[var(--text-secondary)]">{cit.sourceName}</span>}
                                          {/* Author */}
                                          {cit.author && cit.author !== 'null' && cit.author !== '' && <span className="text-[var(--text-tertiary)]">by {cit.author}</span>}
                                          {/* Date */}
                                          {cit.publicationDate && cit.publicationDate !== 'null' && cit.publicationDate !== '' && <span className="text-[var(--text-tertiary)]">{cit.publicationDate}</span>}
                                          {/* Clickable URL */}
                                          {cit.url && cit.url !== '' && cit.url !== 'null' && (
                                              <a href={cit.url} target="_blank" rel="noopener noreferrer"
                                                 className="text-[var(--nxt-teal)] underline hover:text-[var(--nxt-orange)] transition-colors font-bold">
                                                  View Source
                                              </a>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {(!theme.citations || theme.citations.length === 0) && (
                      <div className="px-4 pb-3">
                          <div className="text-[10px] text-[#FF5A5A] bg-red-50 px-3 py-1.5 rounded inline-block">Uncited -- no source evidence provided</div>
                      </div>
                  )}
              </div>
          ))}
      </div>
  );

  const renderPersonas = () => (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {(editedPersonas || []).map((persona, idx) => (
              <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded overflow-hidden shadow-sm transition-all duration-300">
                  <div className="p-4 flex gap-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => setExpandedPersona(expandedPersona === idx ? null : idx)}>
                      <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-[var(--border-secondary)]">
                          {persona.imageUrl ? <img src={persona.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--nxt-lime-10)] flex items-center justify-center text-[var(--nxt-teal)] font-bold text-xl">{persona.name.charAt(0)}</div>}
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-bold text-lg">{persona.name}</h3>
                                <p className="text-sm text-indigo-600">{persona.role} • {persona.demographics}</p>
                             </div>
                             <button className="text-[var(--text-tertiary)] transform transition-transform duration-200" style={{ transform: expandedPersona === idx ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</button>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] italic mt-1 line-clamp-1">"{persona.quote}"</p>
                      </div>
                  </div>

                  {expandedPersona === idx && (
                      <div className="p-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-primary)] space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Who (Mindset)</label>
                                  <textarea className="w-full text-xs p-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] h-16 resize-none outline-none focus:border-indigo-500"
                                      value={persona.fiveWs?.who || ''}
                                      onChange={(e) => updatePersonaFiveW(idx, 'who', e.target.value)}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">What (Tension)</label>
                                  <textarea className="w-full text-xs p-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] h-16 resize-none outline-none focus:border-indigo-500"
                                      value={persona.fiveWs?.what || ''}
                                      onChange={(e) => updatePersonaFiveW(idx, 'what', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Bio</label>
                              <textarea className="w-full text-xs p-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] h-20 resize-none outline-none focus:border-indigo-500"
                                  value={persona.bio || ''}
                                  onChange={(e) => updatePersona(idx, 'bio', e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2 block">Key Motivations</label>
                              <div className="flex flex-wrap gap-2">
                                  {persona.motivations?.map((m, mIdx) => (
                                      <div key={mIdx} className="bg-white border px-2 py-1 rounded text-xs text-[var(--text-secondary)]">{m.label}</div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          ))}
      </div>
  );

  const renderStructure = () => {
      if (!editedStructure) return <div className="text-gray-500 text-center p-8">No structure data available to edit.</div>;
      
      return (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              <div className="bg-[var(--bg-tertiary)] p-4 rounded border border-[var(--border-primary)]">
                  <h4 className="font-bold text-xs uppercase text-[var(--text-tertiary)] mb-2">Narrative Arc</h4>
                  <textarea 
                      value={editedStructure.storyArc} 
                      onChange={e => {
                          setEditedStructure({...editedStructure, storyArc: e.target.value});
                          logEdit("Updated Story Arc");
                      }}
                      className="w-full bg-transparent text-sm resize-none outline-none h-20 placeholder-gray-400"
                      placeholder="Describe the overall flow..."
                  />
              </div>

              <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                       <h4 className="font-bold text-xs uppercase text-[var(--text-tertiary)]">Slides Sequence</h4>
                       <button onClick={addSlide} className="text-xs text-indigo-600 font-bold hover:underline bg-[var(--bg-tertiary)] px-2 py-1 rounded">+ Add Slide</button>
                  </div>
                  
                  {(editedStructure.slides || []).map((slide, i) => (
                      <div key={i} className="bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border-primary)] relative group hover:border-[var(--nxt-lime)] transition-colors flex gap-3">
                          <div className="flex flex-col gap-1 mt-1">
                              <button onClick={() => moveSlide(i, 'up')} disabled={i === 0} className="text-[var(--text-tertiary)] hover:text-indigo-600 disabled:opacity-30 leading-none">▲</button>
                              <div className="bg-[var(--bg-tertiary)] w-6 h-6 flex items-center justify-center rounded text-xs font-black text-[var(--text-secondary)]">{i + 1}</div>
                              <button onClick={() => moveSlide(i, 'down')} disabled={i === editedStructure.slides.length - 1} className="text-[var(--text-tertiary)] hover:text-indigo-600 disabled:opacity-30 leading-none">▼</button>
                          </div>

                          <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                  <input 
                                      value={slide.title} 
                                      onChange={e => updateSlideStructure(i, 'title', e.target.value)} 
                                      className="font-bold text-sm bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-500 transition-colors" 
                                      placeholder="Slide Title"
                                  />
                                  <button onClick={() => deleteSlide(i)} className="text-xs text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">Delete</button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <select 
                                          value={slide.layout} 
                                          onChange={e => updateSlideStructure(i, 'layout', e.target.value)} 
                                          className="w-full text-[10px] bg-[var(--bg-tertiary)] rounded p-1 border border-[var(--border-secondary)] outline-none text-[var(--text-secondary)]"
                                      >
                                          <option value="TITLE_SLIDE">Title Slide</option>
                                          <option value="SECTION_HEADER">Section Header</option>
                                          <option value="CONTENT_SPLIT_RIGHT">Split Right (Image R)</option>
                                          <option value="CONTENT_SPLIT_LEFT">Split Left (Image L)</option>
                                          <option value="FULL_BLEED_IMAGE">Full Bleed</option>
                                          <option value="TYPOGRAPHY_QUOTE">Quote / Big Type</option>
                                      </select>
                                  </div>
                                  <div>
                                      <input 
                                          value={slide.rationale || ''} 
                                          onChange={e => updateSlideStructure(i, 'rationale', e.target.value)} 
                                          className="w-full text-[10px] bg-[var(--bg-tertiary)] rounded p-1 border border-[var(--border-secondary)] outline-none text-[var(--text-secondary)]"
                                          placeholder="Why this slide?"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderNarrative = () => {
    if (!editedNarrative) return null;
    
    const hasSlides = editedNarrative.slides && editedNarrative.slides.length > 0;
    const hasScript = editedNarrative.videoScript && editedNarrative.videoScript.length > 0;

    return (
         <div className="max-h-[60vh] overflow-y-auto pr-2 flex flex-col h-full">
             {(hasSlides && hasScript) && (
                 <div className="flex gap-2 mb-4 border-b border-[var(--border-primary)]">
                     <button 
                        onClick={() => setNarrativeTab('script')} 
                        className={`px-4 py-2 text-xs font-bold border-b-2 ${narrativeTab === 'script' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-[var(--text-tertiary)]'}`}
                     >
                         Video Script
                     </button>
                     <button 
                        onClick={() => setNarrativeTab('slides')} 
                        className={`px-4 py-2 text-xs font-bold border-b-2 ${narrativeTab === 'slides' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-[var(--text-tertiary)]'}`}
                     >
                         Slide Content
                     </button>
                 </div>
             )}

             {((hasScript && narrativeTab === 'script') || (!hasSlides && hasScript)) && (
                 <div className="space-y-4">
                     {(editedNarrative.videoScript || []).map((scene, idx) => (
                         <div key={idx} className="bg-[var(--card-bg)] p-4 rounded border border-[var(--border-primary)] shadow-sm">
                             <h5 className="text-xs font-bold text-indigo-600 uppercase mb-2">Scene {idx+1}</h5>
                             <div className="grid md:grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] text-[var(--text-tertiary)] uppercase block mb-1">Visual Prompt (Editable)</label>
                                     <textarea 
                                        value={scene.visualPrompt || scene.visualDescription} 
                                        onChange={(e) => updateScriptScene(idx, 'visualPrompt', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-20 resize-none border border-[var(--border-secondary)] focus:border-indigo-500 outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[10px] text-[var(--text-tertiary)] uppercase block mb-1">Narration</label>
                                     <textarea 
                                        value={scene.audioNarration}
                                        onChange={(e) => updateScriptScene(idx, 'audioNarration', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-20 resize-none border border-[var(--border-secondary)] focus:border-indigo-500 outline-none"
                                     />
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}

             {((hasSlides && narrativeTab === 'slides') || (!hasScript && hasSlides)) && (
                 <div className="space-y-6">
                     {(editedNarrative.slides || []).map((slide, idx) => (
                         <div key={idx} className="bg-[var(--card-bg)] p-4 rounded border border-[var(--border-primary)] shadow-sm">
                             <div className="flex justify-between mb-2">
                                 <h5 className="text-xs font-bold text-indigo-600 uppercase">Slide {slide.slideNumber}: {slide.title}</h5>
                                 <span className="text-[10px] text-[var(--text-tertiary)] border px-1 rounded">{slide.layout}</span>
                             </div>
                             
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-[10px] text-[var(--text-tertiary)] uppercase block mb-1">Slide Narrative / Body Copy</label>
                                     <textarea 
                                        value={slide.narrative} 
                                        onChange={(e) => updateSlideNarrative(idx, 'narrative', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-sm p-2 rounded h-24 resize-none border border-[var(--border-secondary)] focus:border-indigo-500 outline-none"
                                        placeholder="The main story text for this slide..."
                                     />
                                 </div>
                                 <div className="grid md:grid-cols-2 gap-4">
                                     <div>
                                         <label className="text-[10px] text-[var(--text-tertiary)] uppercase block mb-1">Visual Prompt</label>
                                         <textarea 
                                            value={slide.visualPrompt} 
                                            onChange={(e) => updateSlideNarrative(idx, 'visualPrompt', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-16 resize-none border border-[var(--border-secondary)] focus:border-indigo-500 outline-none"
                                         />
                                     </div>
                                     <div>
                                         <label className="text-[10px] text-[var(--text-tertiary)] uppercase block mb-1">Speaker Notes</label>
                                         <textarea 
                                            value={slide.speakerNotes} 
                                            onChange={(e) => updateSlideNarrative(idx, 'speakerNotes', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-16 resize-none border border-[var(--border-secondary)] focus:border-indigo-500 outline-none italic"
                                         />
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
    );
};

  const renderFinal = () => {
      return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-[var(--nxt-teal)] to-[var(--nxt-lime)] rounded-full flex items-center justify-center animate-pulse shadow-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
              </div>
              <div>
                  <h3 className="text-2xl font-bold mb-2">Synthesizing Final Assets</h3>
                  <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                      We are now generating high-fidelity images, video scripts, and formatting your final deliverables. This may take a moment.
                  </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-secondary)] w-full max-w-lg font-mono text-xs text-[var(--text-secondary)]">
                  {currentLog || "Initializing asset generation..."}
              </div>
          </div>
      );
  };

  const renderJourney = () => {
        if (!editedJourney) return <div className="p-4 text-center text-gray-500">No Journey Map data available.</div>;
        return (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-4">
                     {editedJourney.stages.map((stage, idx) => (
                         <div key={idx} className="bg-[var(--card-bg)] p-4 rounded border border-[var(--border-primary)] space-y-3">
                             <div className="flex justify-between items-center border-b border-[var(--border-secondary)] pb-2">
                                 <h4 className="text-xs font-bold text-indigo-600 uppercase">Stage {idx+1}: {stage.phase}</h4>
                                 <select 
                                    value={stage.emotion} 
                                    onChange={(e) => updateJourneyStage(idx, 'emotion', e.target.value)}
                                    className="text-[10px] bg-[var(--bg-tertiary)] rounded p-1"
                                 >
                                    <option value="Positive">Positive</option>
                                    <option value="Neutral">Neutral</option>
                                    <option value="Negative">Negative</option>
                                    <option value="Frustrated">Frustrated</option>
                                    <option value="Delighted">Delighted</option>
                                 </select>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] font-bold text-[var(--text-tertiary)] block mb-1">Customer Action</label>
                                     <textarea 
                                        value={stage.customerAction} 
                                        onChange={(e) => updateJourneyStage(idx, 'customerAction', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-16 outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-[var(--text-tertiary)] block mb-1">Frontstage Action</label>
                                     <textarea 
                                        value={stage.frontstageAction} 
                                        onChange={(e) => updateJourneyStage(idx, 'frontstageAction', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-16 outline-none"
                                     />
                                 </div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        );
  };

  const renderArch = () => {
      if (!editedArch) return <div className="p-4 text-center text-gray-500">No Architecture data available.</div>;
      return (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              <div>
                  <h4 className="font-bold text-xs uppercase text-[var(--text-tertiary)] mb-3">System Nodes</h4>
                  <div className="space-y-2">
                      {editedArch.architecture.nodes.map((node, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-[var(--card-bg)] p-2 rounded border border-[var(--border-secondary)]">
                               <select 
                                  value={node.type}
                                  onChange={(e) => {
                                      const newNodes = editedArch.architecture.nodes.map((n, i) => i === idx ? {...n, type: e.target.value as any} : n);
                                      setEditedArch({...editedArch, architecture: {...editedArch.architecture, nodes: newNodes}});
                                      logEdit(`Updated Node ${idx} Type`);
                                  }}
                                  className="text-[10px] bg-[var(--bg-tertiary)] p-1 rounded w-20"
                               >
                                  <option value="User">User</option>
                                  <option value="System">System</option>
                                  <option value="Database">Database</option>
                                  <option value="External API">API</option>
                                  <option value="Security">Security</option>
                               </select>
                               <input 
                                  value={node.label}
                                  onChange={(e) => {
                                      const newNodes = editedArch.architecture.nodes.map((n, i) => i === idx ? {...n, label: e.target.value} : n);
                                      setEditedArch({...editedArch, architecture: {...editedArch.architecture, nodes: newNodes}});
                                      logEdit(`Updated Node ${idx} Label`);
                                  }}
                                  className="font-bold text-sm bg-transparent outline-none flex-1 border-b border-transparent focus:border-indigo-500"
                               />
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderPRD = () => {
      if (!editedPRD) return <div className="p-4 text-center text-gray-500">No PRD data available.</div>;
      return (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
               <div className="space-y-2">
                   <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">Title</label>
                   <input 
                      value={editedPRD.prd.title}
                      onChange={(e) => updatePRDField('title', e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] p-2 rounded font-bold text-sm outline-none"
                   />
               </div>
               <div>
                   <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-xs uppercase text-[var(--text-tertiary)]">Features (MoSCoW)</h4>
                        <button onClick={addPRDFeature} className="text-xs text-indigo-600 font-bold hover:underline bg-[var(--bg-tertiary)] px-2 py-1 rounded">+ Add Feature</button>
                   </div>
                   <div className="space-y-3">
                       {editedPRD.prd.features.map((feature, idx) => (
                           <div key={idx} className="bg-[var(--card-bg)] p-3 rounded border border-[var(--border-primary)] relative group">
                               <button onClick={() => deletePRDFeature(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                               <div className="flex justify-between items-center mb-2 pr-6">
                                   <input 
                                      value={feature.name}
                                      onChange={(e) => updatePRDFeature(idx, 'name', e.target.value)}
                                      className="font-bold text-sm bg-transparent outline-none flex-1"
                                      placeholder="Feature Name"
                                   />
                                   <select 
                                      value={feature.priority}
                                      onChange={(e) => updatePRDFeature(idx, 'priority', e.target.value)}
                                      className="text-[10px] bg-[var(--bg-tertiary)] p-1 rounded ml-2"
                                   >
                                       <option value="Must-have">Must-have</option>
                                       <option value="Should-have">Should-have</option>
                                       <option value="Could-have">Could-have</option>
                                       <option value="Won't-have">Won't-have</option>
                                   </select>
                               </div>
                               <textarea 
                                  value={feature.description}
                                  onChange={(e) => updatePRDFeature(idx, 'description', e.target.value)}
                                  className="w-full bg-transparent text-xs resize-none h-12 outline-none placeholder-gray-400"
                                  placeholder="Description..."
                               />
                           </div>
                       ))}
                   </div>
               </div>
          </div>
      );
  };

  const renderRoadmap = () => {
      if (!editedRoadmap) return <div className="p-4 text-center text-gray-500">No Roadmap data available.</div>;
      return (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
               {editedRoadmap.roadmap.items.map((item, idx) => (
                   <div key={idx} className="bg-[var(--card-bg)] p-3 rounded border border-[var(--border-primary)] flex flex-col gap-2">
                       <div className="flex justify-between items-center">
                            <input 
                               value={item.initiative}
                               onChange={(e) => updateRoadmapItem(idx, 'initiative', e.target.value)}
                               className="font-bold text-sm bg-transparent outline-none flex-1"
                            />
                            <div className="flex gap-2">
                                <select 
                                   value={item.horizon}
                                   onChange={(e) => updateRoadmapItem(idx, 'horizon', e.target.value)}
                                   className="text-[10px] bg-[var(--bg-tertiary)] p-1 rounded"
                                >
                                   <option value="Now">Now</option>
                                   <option value="Next">Next</option>
                                   <option value="Later">Later</option>
                                </select>
                            </div>
                       </div>
                       <input 
                          value={item.description}
                          onChange={(e) => updateRoadmapItem(idx, 'description', e.target.value)}
                          className="text-xs text-[var(--text-secondary)] bg-transparent outline-none"
                          placeholder="Description"
                       />
                   </div>
               ))}
          </div>
      );
  };

  const renderRecommendations = () => {
      if (!editedRecs) return <div className="p-4 text-center text-gray-500">No Recommendations data available.</div>;
      return (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              <button onClick={addRecommendation} className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded text-xs font-bold text-indigo-600 mb-2 transition-colors">+ Add Strategic Opportunity</button>
              
              {editedRecs.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-[var(--card-bg)] p-4 rounded border border-[var(--border-primary)] relative group">
                       <button onClick={() => deleteRecommendation(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                       <div className="flex gap-3 mb-2">
                           <div className="flex-1">
                               <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Title</label>
                               <input 
                                  value={rec.title}
                                  onChange={(e) => updateRecommendation(idx, 'title', e.target.value)}
                                  className="w-full bg-transparent font-bold text-sm border-b border-transparent focus:border-indigo-500 outline-none"
                               />
                           </div>
                           <div>
                               <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Impact</label>
                               <select 
                                  value={rec.impactLevel}
                                  onChange={(e) => updateRecommendation(idx, 'impactLevel', e.target.value)}
                                  className="text-xs bg-[var(--bg-tertiary)] p-1 rounded font-bold"
                               >
                                  <option value="HIGH">HIGH</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="LOW">LOW</option>
                               </select>
                           </div>
                       </div>
                       <div className="mb-4">
                           <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Description</label>
                           <textarea 
                              value={rec.description}
                              onChange={(e) => updateRecommendation(idx, 'description', e.target.value)}
                              className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-16 resize-none outline-none"
                           />
                       </div>
                       <div>
                            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Action Items</label>
                            <div className="space-y-2">
                                {(rec.actionItems || []).map((item, aIdx) => (
                                    <div key={aIdx} className="flex gap-2">
                                        <input 
                                            value={item}
                                            onChange={(e) => {
                                                const newRecs = [...editedRecs!.recommendations];
                                                newRecs[idx].actionItems[aIdx] = e.target.value;
                                                setEditedRecs({...editedRecs!, recommendations: newRecs});
                                                logEdit(`Edited Rec ${idx+1} Action`);
                                            }}
                                            className="flex-1 bg-[var(--bg-tertiary)] text-xs p-2 rounded border-b border-transparent focus:border-indigo-500 outline-none"
                                        />
                                         <button onClick={() => {
                                             const newRecs = [...editedRecs!.recommendations];
                                             newRecs[idx].actionItems = newRecs[idx].actionItems.filter((_, i) => i !== aIdx);
                                             setEditedRecs({...editedRecs!, recommendations: newRecs});
                                             logEdit(`Deleted Rec ${idx+1} Action`);
                                         }} className="text-gray-400 hover:text-red-500">×</button>
                                    </div>
                                ))}
                                <button onClick={() => {
                                     const newRecs = [...editedRecs!.recommendations];
                                     newRecs[idx].actionItems = [...(newRecs[idx].actionItems || []), "New Action"];
                                     setEditedRecs({...editedRecs!, recommendations: newRecs});
                                     logEdit(`Added Action to Rec ${idx+1}`);
                                }} className="text-xs text-indigo-500 font-bold hover:underline">+ Add Item</button>
                            </div>
                       </div>
                  </div>
              ))}
          </div>
      );
  };

  const getButtonText = () => {
      if (isProcessing || isSubmitting) return 'Processing...';
      if (feedback) return 'Regenerate';
      if (hasEdits) return 'Confirm Edits & Continue'; 
      
      if (stage === AnalysisStage.DECK_STRUCTURE) return 'Approve Outline (Generate Content)';
      if (stage === AnalysisStage.NARRATIVE) return 'Approve Content (Generate Visuals)';
      return 'Approve & Continue';
  };

  return (
    <div className="bg-[var(--modal-bg)] border border-[var(--border-primary)] w-full max-w-4xl rounded shadow-none flex flex-col max-h-[90vh] overflow-hidden animate-fade-in text-[var(--text-primary)]">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--nxt-teal)] flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Checkpoint: <span className="text-[var(--nxt-lime)] uppercase tracking-wider">{stage.replace('_', ' ')}</span>
                </h2>
                <p className="text-xs text-white/70">Review and refine before proceeding.</p>
            </div>
            {onClose && (
                <button 
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-lg font-bold text-white"
                >
                    ✕
                </button>
            )}
        </div>
        <div className="p-6 overflow-hidden flex-1 flex flex-col bg-[var(--bg-primary)]">
            {stage === AnalysisStage.INGESTION && renderIngestion()}
            {stage === AnalysisStage.THEMES && renderThemes()}
            {stage === AnalysisStage.PERSONAS && renderPersonas()}
            {stage === AnalysisStage.JOURNEY_MAP && renderJourney()}
            {stage === AnalysisStage.TECH_ARCH && renderArch()}
            {stage === AnalysisStage.PRD && renderPRD()}
            {stage === AnalysisStage.ROADMAP && renderRoadmap()}
            {stage === AnalysisStage.RECOMMENDATIONS && renderRecommendations()}
            {stage === AnalysisStage.NARRATIVE && renderNarrative()}
            {stage === AnalysisStage.DECK_STRUCTURE && renderStructure()}
            {stage === AnalysisStage.FINAL && renderFinal()}
        </div>
        <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-4">
            <textarea 
                value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback for regeneration..."
                className="w-full bg-[var(--input-bg)] border border-[var(--border-primary)] rounded-lg p-3 text-sm focus:border-indigo-500 outline-none resize-none h-20 shadow-sm"
            />
            <div className="flex justify-end gap-3">
                <button onClick={handleConfirm} disabled={isProcessing || isSubmitting} className={`px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all ${feedback || hasEdits ? 'bg-[var(--nxt-orange)] text-white' : 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)]'} ${isProcessing || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}>
                    {getButtonText()}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AnalysisCheckpoint;
