
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisStage, StepResult_Ingestion, StepResult_Themes, StepResult_Personas, StepResult_Structure, StepResult_Narrative, StepResult_JourneyMap, StepResult_TechArch, StepResult_PRD, StepResult_Roadmap, StepResult_Recommendations, Slide, Theme, Persona, ScriptScene, ServiceBlueprintStage, PRDFeature, RoadmapItem, StrategicRecommendation, computeFreshnessScore } from '../types';
import { logEdit as logEditToEngine } from '../services/promptImprovementEngine';

interface Props {
  stage: AnalysisStage;
  data: any;
  isProcessing: boolean;
  onApprove: (feedback?: string, modifiedData?: any, interventionDetails?: string) => void;
  onClose?: () => void;
  currentLog?: string;
}

// Internal Loading Component — shows collection summary while processing
const LoadingView = ({ log, elapsed }: { log?: string, elapsed: number }) => {
    // Parse collection stats from log if available
    const logText = log || '';
    const itemMatch = logText.match(/(\d+)\s*items?\s*from\s*(\d+)/);
    const sizeMatch = logText.match(/\((\d+)KB\)/);
    const items = itemMatch ? parseInt(itemMatch[1]) : 0;
    const sources = itemMatch ? parseInt(itemMatch[2]) : 0;
    const sizeKB = sizeMatch ? parseInt(sizeMatch[1]) : 0;

    return (
    <div className="flex flex-col h-full animate-fade-in w-full">
        {/* Processing header */}
        <div className="flex items-center gap-4 p-4 bg-[var(--nxt-teal)] text-white">
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 border-3 border-white/30 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-3 border-[var(--nxt-lime)] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold">{elapsed}s</div>
            </div>
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Processing Research Corpus</h3>
                <p className="text-[10px] text-white/70">AI is performing deep reasoning and context extraction</p>
            </div>
        </div>

        {/* Collection summary (if data was collected) */}
        {items > 0 && (
            <div className="p-4 border-b border-[var(--border-primary)]">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-3">Corpus Being Analyzed</div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                        <div className="text-xl font-extralight text-[var(--nxt-teal)]">{items}</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Items</div>
                    </div>
                    <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                        <div className="text-xl font-extralight text-[var(--nxt-teal)]">{sources}</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Sources</div>
                    </div>
                    <div className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)] text-center">
                        <div className="text-xl font-extralight text-[var(--text-primary)]">{sizeKB}KB</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Corpus Size</div>
                    </div>
                </div>
            </div>
        )}

        {/* Live reasoning trace */}
        <div className="flex-1 p-4">
            <div className="bg-[var(--bg-secondary)] p-4 rounded border border-[var(--border-primary)] h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-primary)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--nxt-lime)] animate-pulse"></div>
                    <div className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-tertiary)]">Live AI Reasoning</div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="font-mono text-xs text-[var(--text-secondary)] text-center leading-relaxed max-w-md">
                        {logText ? logText.replace(/\[.*?\]/g, '').trim() : "Initializing reasoning engine..."}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

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
      // Also log to prompt improvement engine for cross-session learning
      logEditToEngine(stage, desc, '', desc);
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

  const [showSlideAdder, setShowSlideAdder] = useState(false);
  const [generatingSlide, setGeneratingSlide] = useState(false);

  const slideTemplates: { layout: string; label: string; icon: string; color: string; suggestedTitle: string; suggestedContent: string[]; suggestedRationale: string }[] = [
      { layout: 'KEY_STATISTIC', label: 'Hook Statistic', icon: 'fa-bolt', color: '#FF5A5A', suggestedTitle: 'The Single Most Surprising Number', suggestedContent: ['[Insert the most impactful statistic from your research]', 'Context: Why this number matters NOW'], suggestedRationale: 'Opens with a data point that stops the audience' },
      { layout: 'EVIDENCE_WALL', label: 'Evidence Wall', icon: 'fa-th-large', color: '#00b1eb', suggestedTitle: 'What the Research Reveals', suggestedContent: ['Finding 1: [cite CHUNK_XXX]', 'Finding 2: [cite CHUNK_XXX]', 'Finding 3: [cite CHUNK_XXX]'], suggestedRationale: '3-4 findings side by side showing convergence' },
      { layout: 'DATA_INSIGHT', label: 'Data Insight', icon: 'fa-chart-bar', color: '#0CCE6B', suggestedTitle: 'The Trend Behind the Numbers', suggestedContent: ['Data point with source citation', 'So what: Why this changes the strategy'], suggestedRationale: 'Chart interpretation with strategic framing' },
      { layout: 'PERSONA_SPOTLIGHT', label: 'Persona Spotlight', icon: 'fa-user-circle', color: '#fd8e2e', suggestedTitle: 'Meet [Persona Name]', suggestedContent: ['Core tension this persona faces', 'Key pain point from research', 'What they need from us'], suggestedRationale: 'Builds empathy before recommending solutions' },
      { layout: 'QUOTE_FEATURE', label: 'Quote Feature', icon: 'fa-quote-left', color: '#9333ea', suggestedTitle: 'In Their Own Words', suggestedContent: ['[Verbatim quote from research corpus]', 'Context: Who said this and why it matters'], suggestedRationale: 'A quote so vivid the audience remembers it' },
      { layout: 'COMPARISON', label: 'Before/After', icon: 'fa-columns', color: '#caca20', suggestedTitle: 'Current State vs. Desired State', suggestedContent: ['Before: [Current pain point]', 'After: [What the recommendation achieves]'], suggestedRationale: 'Shows the gap and the vision' },
      { layout: 'RECOMMENDATION', label: 'Recommendation', icon: 'fa-lightbulb', color: '#0CCE6B', suggestedTitle: 'Strategic Action: [Specific Verb + Outcome]', suggestedContent: ['The action: What specifically to do', 'Expected impact: Quantified outcome', 'Evidence: [CHUNK_XXX] supports this'], suggestedRationale: 'Evidence-backed action with measurable impact' },
      { layout: 'SECTION_HEADER', label: 'Section Break', icon: 'fa-minus', color: '#acacac', suggestedTitle: 'Section: [SITUATION / COMPLICATION / RESOLUTION]', suggestedContent: [], suggestedRationale: 'Transitions the audience to the next narrative phase' },
      { layout: 'CLOSING_CTA', label: 'Call to Action', icon: 'fa-arrow-right', color: '#115054', suggestedTitle: 'Next Steps: Who Does What By When', suggestedContent: ['Action 1: [Owner] will [action] by [date]', 'Action 2: [Owner] will [action] by [date]', 'Action 3: [Owner] will [action] by [date]'], suggestedRationale: 'Concrete next steps with accountability' },
  ];

  const addSlideWithTemplate = (template: typeof slideTemplates[0]) => {
      if (!editedStructure) return;
      const newSlide: Slide = {
          slideNumber: editedStructure.slides.length + 1,
          layout: template.layout as any,
          title: template.suggestedTitle,
          content: template.suggestedContent,
          narrative: '',
          speakerNotes: '',
          visualPrompt: '',
          quote: '',
          rationale: template.suggestedRationale,
          style: { backgroundColor: '#ffffff', headerColor: '#115054', textColor: '#141414', accentColor: '#caca20' }
      };
      setEditedStructure({ ...editedStructure, slides: [...editedStructure.slides, newSlide] });
      logEdit(`Added ${template.label} slide`);
      setShowSlideAdder(false);
  };

  const addSlide = () => setShowSlideAdder(true);

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

      // Edits already logged to prompt improvement engine per-edit via logEdit()

      onApprove(feedback, modifiedData, interventionSummary);
  };

  // --- RENDERERS ---

  // --- DATA REVIEW CHECKPOINT ---
  const renderDataReview = () => {
      if (!data || !Array.isArray(data)) return <LoadingView log={currentLog} elapsed={elapsed} />;
      const items = data as any[];
      const tierCounts = { 1: 0, 2: 0, 3: 0 };
      items.forEach((item: any) => { const t = item.credibilityTier || 3; tierCounts[t as 1|2|3] = (tierCounts[t as 1|2|3] || 0) + 1; });
      const sources = [...new Set(items.map((i: any) => i.sourceName || 'Unknown'))];

      return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border text-center">
                      <div className="text-2xl font-extralight text-[var(--nxt-teal)]">{items.length}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Total Items</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border text-center">
                      <div className="text-2xl font-extralight text-[var(--nxt-teal)]">{sources.length}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Sources</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border text-center">
                      <div className="text-2xl font-extralight" style={{color: '#115054'}}>{tierCounts[1]}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Tier 1</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border text-center">
                      <div className="text-2xl font-extralight" style={{color: '#fd8e2e'}}>{tierCounts[2]}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Tier 2</div>
                  </div>
              </div>

              {/* Item list */}
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)]">Collected Evidence ({items.length} items)</div>
              <div className="space-y-1">
                  {items.slice(0, 50).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)] text-[11px]">
                          <span className={`text-[7px] font-bold uppercase px-1 py-0.5 rounded-sm flex-shrink-0 ${
                              item.credibilityTier === 1 ? 'bg-[var(--nxt-teal)] text-white' :
                              item.credibilityTier === 2 ? 'bg-[var(--nxt-orange)] text-white' :
                              'bg-gray-200 text-gray-500'
                          }`}>T{item.credibilityTier || '?'}</span>
                          <span className="font-bold text-[var(--text-primary)] flex-1 truncate">{item.title}</span>
                          <span className="text-[9px] text-[var(--text-tertiary)] flex-shrink-0">{item.sourceName?.substring(0, 20)}</span>
                          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[8px] text-[var(--nxt-teal)] underline flex-shrink-0">Link</a>}
                      </div>
                  ))}
                  {items.length > 50 && <div className="text-center text-[10px] text-[var(--text-tertiary)]">...and {items.length - 50} more items</div>}
              </div>
          </div>
      );
  };

  const renderIngestion = () => {
      const d = data as StepResult_Ingestion;
      if (!d) return <LoadingView log={currentLog} elapsed={elapsed} />;

      // Parse source breakdown from documents metadata
      const docs = d.documents || [];
      const sourceGroups: Record<string, { count: number; names: string[]; tier?: number; icon?: string }> = {};
      for (const doc of docs) {
          const name = doc.fileName || 'Unknown';
          // Categorize by source type
          let group = 'Uploaded Documents';
          let icon = 'fa-file';
          let tier = 3;
          if (name.includes('intelligence_sources')) {
              group = 'Intelligence Corpus (All Sources Merged)';
              icon = 'fa-brain';
              tier = 1;
          } else if (name.toLowerCase().includes('gemini') || name.toLowerCase().includes('ai research')) {
              group = 'AI Deep Research (Gemini Grounding)';
              icon = 'fa-satellite-dish';
              tier = 1;
          } else if (name.includes('.pdf') || name.includes('.docx') || name.includes('.xlsx') || name.includes('.csv')) {
              group = 'Uploaded Documents';
              icon = 'fa-file-alt';
          }
          if (!sourceGroups[group]) sourceGroups[group] = { count: 0, names: [], tier, icon };
          sourceGroups[group].count++;
          if (sourceGroups[group].names.length < 5) sourceGroups[group].names.push(name);
      }

      // Parse intelligence sources breakdown from the corpus text (if available)
      const corpusDoc = docs.find((doc: any) => (doc.fileName || '').includes('intelligence_sources'));
      if (corpusDoc) {
          const corpusText = typeof d.summary === 'string' ? d.summary : '';
          // Count CHUNK references to estimate total evidence items
          const chunkMatches = (d as any).reasoning?.match(/CHUNK_\d+/g) || [];
          if (chunkMatches.length > 0) {
              sourceGroups['Evidence Chunks in Corpus'] = {
                  count: new Set(chunkMatches).size,
                  names: [`${new Set(chunkMatches).size} unique chunks referenced in analysis`],
                  tier: 1,
                  icon: 'fa-link',
              };
          }
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
                                      <div className="flex items-center gap-2">
                                          <i className={`fas ${(info as any).icon || 'fa-file'} text-[var(--nxt-teal)] text-xs`}></i>
                                          <span className="text-xs font-bold text-[var(--text-primary)]">{group}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {(info as any).tier && <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${(info as any).tier === 1 ? 'bg-[var(--nxt-teal)] text-white' : (info as any).tier === 2 ? 'bg-[var(--nxt-orange)] text-white' : 'bg-gray-200 text-gray-600'}`}>Tier {(info as any).tier}</span>}
                                          <span className="text-[10px] font-bold bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-2 py-0.5 rounded-sm">{info.count} {info.count === 1 ? 'file' : 'files'}</span>
                                      </div>
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
                                          {/* Date + Freshness */}
                                          {cit.publicationDate && cit.publicationDate !== 'null' && cit.publicationDate !== '' && (
                                              <span className="text-[var(--text-tertiary)]">
                                                  {cit.publicationDate}
                                                  {(() => { const fs = computeFreshnessScore(cit.publicationDate); return fs > 0 ? ` (${fs >= 85 ? 'Fresh' : fs >= 50 ? 'Recent' : 'Older'})` : ''; })()}
                                              </span>
                                          )}
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

      const layoutMeta: Record<string, { icon: string; color: string; label: string; section: string }> = {
          'TITLE_SLIDE': { icon: 'fa-flag', color: '#115054', label: 'Title', section: 'OPENING' },
          'KEY_STATISTIC': { icon: 'fa-bolt', color: '#FF5A5A', label: 'Hook Statistic', section: 'HOOK' },
          'EVIDENCE_WALL': { icon: 'fa-th-large', color: '#00b1eb', label: 'Evidence Wall', section: 'SITUATION' },
          'QUOTE_FEATURE': { icon: 'fa-quote-left', color: '#9333ea', label: 'Quote Feature', section: 'COMPLICATION' },
          'PERSONA_SPOTLIGHT': { icon: 'fa-user-circle', color: '#fd8e2e', label: 'Persona Spotlight', section: 'COMPLICATION' },
          'DATA_INSIGHT': { icon: 'fa-chart-bar', color: '#0CCE6B', label: 'Data Insight', section: 'SITUATION' },
          'COMPARISON': { icon: 'fa-columns', color: '#caca20', label: 'Comparison', section: 'COMPLICATION' },
          'RECOMMENDATION': { icon: 'fa-lightbulb', color: '#0CCE6B', label: 'Recommendation', section: 'RESOLUTION' },
          'SECTION_HEADER': { icon: 'fa-minus', color: '#acacac', label: 'Section Break', section: '' },
          'CONTENT_SPLIT_RIGHT': { icon: 'fa-columns', color: '#525252', label: 'Content + Image', section: '' },
          'CONTENT_SPLIT_LEFT': { icon: 'fa-columns', color: '#525252', label: 'Image + Content', section: '' },
          'CLOSING_CTA': { icon: 'fa-arrow-right', color: '#115054', label: 'Call to Action', section: 'CLOSE' },
          'FULL_BLEED_IMAGE': { icon: 'fa-image', color: '#525252', label: 'Full Image', section: '' },
          'TYPOGRAPHY_QUOTE': { icon: 'fa-font', color: '#9333ea', label: 'Typography', section: '' },
      };

      // Group slides by narrative section
      const sections: { name: string; color: string; slides: { slide: any; idx: number }[] }[] = [];
      const sectionOrder = ['OPENING', 'HOOK', 'SITUATION', 'COMPLICATION', 'RESOLUTION', 'CLOSE', ''];
      const sectionColors: Record<string, string> = { 'OPENING': '#115054', 'HOOK': '#FF5A5A', 'SITUATION': '#00b1eb', 'COMPLICATION': '#fd8e2e', 'RESOLUTION': '#0CCE6B', 'CLOSE': '#115054' };
      const grouped: Record<string, { slide: any; idx: number }[]> = {};
      (editedStructure.slides || []).forEach((slide: any, idx: number) => {
          const meta = layoutMeta[slide.layout] || layoutMeta['CONTENT_SPLIT_RIGHT'];
          const sec = meta.section || '';
          if (!grouped[sec]) grouped[sec] = [];
          grouped[sec].push({ slide, idx });
      });
      sectionOrder.forEach(sec => { if (grouped[sec]) sections.push({ name: sec || 'OTHER', color: sectionColors[sec] || '#acacac', slides: grouped[sec] }); });

      return (
          <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
              {/* Narrative Arc */}
              <div className="bg-[var(--nxt-teal)] text-white p-4 rounded">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--nxt-lime)] mb-1">Narrative Arc (Situation - Complication - Resolution)</div>
                  <textarea value={editedStructure.storyArc} onChange={e => { setEditedStructure({...editedStructure, storyArc: e.target.value}); logEdit("Updated Story Arc"); }}
                      className="w-full bg-transparent text-sm resize-none outline-none h-16 text-white/90 placeholder-white/40" placeholder="The strategic tension..." />
              </div>

              {/* Visual slide sequence — mini storyboard */}
              <div className="flex gap-1 overflow-x-auto pb-2">
                  {(editedStructure.slides || []).map((slide: any, i: number) => {
                      const meta = layoutMeta[slide.layout] || { icon: 'fa-file', color: '#acacac', label: slide.layout, section: '' };
                      return (
                          <div key={i} className="flex-shrink-0 w-20 h-14 rounded border flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-[var(--nxt-lime)] transition-all" style={{ borderColor: meta.color, backgroundColor: `${meta.color}10` }}>
                              <i className={`fas ${meta.icon} text-xs`} style={{ color: meta.color }}></i>
                              <span className="text-[6px] font-bold uppercase text-center mt-0.5 leading-tight px-1 truncate w-full" style={{ color: meta.color }}>{meta.label}</span>
                              <span className="text-[6px] text-[var(--text-tertiary)]">{i + 1}</span>
                          </div>
                      );
                  })}
              </div>

              {/* Slides grouped by narrative section */}
              <div className="flex justify-between items-center px-1">
                  <h4 className="font-bold text-xs uppercase text-[var(--text-tertiary)]">Slides ({editedStructure.slides?.length || 0})</h4>
                  <button onClick={addSlide} className="text-xs text-[var(--nxt-teal)] font-bold bg-[var(--nxt-lime-10)] border border-[var(--nxt-lime)] px-3 py-1.5 rounded">+ Add Slide</button>
              </div>

              {/* SLIDE TEMPLATE PICKER */}
              {showSlideAdder && (
                  <div className="bg-[var(--bg-secondary)] border border-[var(--nxt-lime)] rounded p-4 mb-3">
                      <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--nxt-teal)]">Choose Slide Type (AI-Suggested Content)</span>
                          <button onClick={() => setShowSlideAdder(false)} className="text-xs text-[var(--text-tertiary)] hover:text-red-500">Cancel</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          {slideTemplates.map((tpl) => (
                              <button key={tpl.layout} onClick={() => addSlideWithTemplate(tpl)}
                                  className="text-left p-3 rounded border border-[var(--border-primary)] hover:border-[var(--nxt-lime)] hover:bg-white transition-all group"
                                  style={{ borderLeftWidth: 3, borderLeftColor: tpl.color }}>
                                  <div className="flex items-center gap-2 mb-1">
                                      <i className={`fas ${tpl.icon} text-xs`} style={{ color: tpl.color }}></i>
                                      <span className="text-[10px] font-bold">{tpl.label}</span>
                                  </div>
                                  <div className="text-[8px] text-[var(--text-tertiary)] leading-snug">{tpl.suggestedRationale}</div>
                                  <div className="text-[7px] text-[var(--nxt-teal)] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to add with suggested content</div>
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {sections.map((section) => (
                  <div key={section.name}>
                      {section.name && section.name !== 'OTHER' && (
                          <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }}></div>
                              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: section.color }}>{section.name}</span>
                              <div className="flex-1 border-t" style={{ borderColor: section.color + '30' }}></div>
                          </div>
                      )}
                      <div className="space-y-2 mb-3">
                          {section.slides.map(({ slide, idx: i }) => {
                              const meta = layoutMeta[slide.layout] || { icon: 'fa-file', color: '#acacac', label: slide.layout, section: '' };
                              return (
                                  <div key={i} className="bg-[var(--card-bg)] p-3 rounded border relative group hover:border-[var(--nxt-lime)] transition-colors flex gap-3" style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}>
                                      <div className="flex flex-col gap-1 mt-1 items-center">
                                          <button onClick={() => moveSlide(i, 'up')} disabled={i === 0} className="text-[var(--text-tertiary)] hover:text-[var(--nxt-teal)] disabled:opacity-20 text-xs">▲</button>
                                          <div className="w-7 h-7 flex items-center justify-center rounded" style={{ backgroundColor: meta.color + '15' }}>
                                              <i className={`fas ${meta.icon} text-xs`} style={{ color: meta.color }}></i>
                                          </div>
                                          <span className="text-[8px] font-bold text-[var(--text-tertiary)]">{i + 1}</span>
                                          <button onClick={() => moveSlide(i, 'down')} disabled={i === (editedStructure.slides?.length || 0) - 1} className="text-[var(--text-tertiary)] hover:text-[var(--nxt-teal)] disabled:opacity-20 text-xs">▼</button>
                                      </div>

                                      <div className="flex-1 space-y-2">
                                          <div className="flex justify-between items-start">
                                              <input value={slide.title} onChange={e => updateSlideStructure(i, 'title', e.target.value)}
                                                  className="font-bold text-sm bg-transparent outline-none w-full" placeholder="Slide Title" />
                                              <button onClick={() => deleteSlide(i)} className="text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs ml-2">Delete</button>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                              <select value={slide.layout} onChange={e => updateSlideStructure(i, 'layout', e.target.value)}
                                                  className="text-[9px] bg-[var(--bg-tertiary)] rounded p-1.5 border border-[var(--border-secondary)] outline-none font-bold" style={{ color: meta.color }}>
                                                  <option value="TITLE_SLIDE">Title Slide</option>
                                                  <option value="KEY_STATISTIC">Hook: Key Statistic</option>
                                                  <option value="EVIDENCE_WALL">Situation: Evidence Wall</option>
                                                  <option value="DATA_INSIGHT">Situation: Data Insight</option>
                                                  <option value="QUOTE_FEATURE">Complication: Quote Feature</option>
                                                  <option value="PERSONA_SPOTLIGHT">Complication: Persona Spotlight</option>
                                                  <option value="COMPARISON">Complication: Before/After</option>
                                                  <option value="RECOMMENDATION">Resolution: Recommendation</option>
                                                  <option value="SECTION_HEADER">Section Divider</option>
                                                  <option value="CONTENT_SPLIT_RIGHT">Content + Image (R)</option>
                                                  <option value="CONTENT_SPLIT_LEFT">Image (L) + Content</option>
                                                  <option value="CLOSING_CTA">Close: Call to Action</option>
                                                  <option value="FULL_BLEED_IMAGE">Full Bleed Image</option>
                                                  <option value="TYPOGRAPHY_QUOTE">Typography Quote</option>
                                              </select>
                                              <div className="text-[9px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] p-1.5 rounded border border-[var(--border-secondary)] italic">{slide.rationale || 'No rationale'}</div>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
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
                     {(editedNarrative.videoScript || []).map((scene: any, idx: number) => (
                         <div key={idx} className="bg-[var(--card-bg)] rounded border border-[var(--border-primary)] shadow-sm overflow-hidden">
                             <div className="bg-[var(--nxt-teal)] text-white px-4 py-2 flex justify-between items-center">
                                 <span className="text-xs font-bold uppercase">Scene {idx+1}</span>
                                 {scene.durationSeconds && <span className="text-[10px] text-[var(--nxt-lime)]">{scene.durationSeconds}s</span>}
                             </div>
                             <div className="p-4 space-y-3">
                                 {/* Narration — the MOST important field */}
                                 <div>
                                     <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Voiceover Narration</label>
                                     <textarea value={scene.audioNarration || ''} onChange={(e) => updateScriptScene(idx, 'audioNarration', e.target.value)}
                                        className="w-full bg-white text-sm p-3 rounded h-20 resize-none border border-[var(--border-primary)] outline-none italic" placeholder="The narrator says..." />
                                 </div>
                                 {/* Evidence Quote */}
                                 {scene.quote && (
                                     <div className="bg-[var(--bg-tertiary)] p-3 rounded border-l-4 border-[var(--nxt-lime)]">
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Evidence Quote</label>
                                         <div className="text-xs italic text-[var(--text-secondary)]">"{scene.quote}"</div>
                                     </div>
                                 )}
                                 {/* Visual Direction */}
                                 <div>
                                     <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Visual Direction</label>
                                     <textarea value={scene.visualPrompt || scene.visualDescription || ''} onChange={(e) => updateScriptScene(idx, 'visualPrompt', e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-14 resize-none border border-[var(--border-secondary)] outline-none" />
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}

             {((hasSlides && narrativeTab === 'slides') || (!hasScript && hasSlides)) && (
                 <div className="space-y-5">
                     {(editedNarrative.slides || []).map((slide: any, idx: number) => {
                         const layoutColors: Record<string, string> = { 'KEY_STATISTIC': '#FF5A5A', 'EVIDENCE_WALL': '#00b1eb', 'DATA_INSIGHT': '#0CCE6B', 'PERSONA_SPOTLIGHT': '#fd8e2e', 'QUOTE_FEATURE': '#9333ea', 'RECOMMENDATION': '#0CCE6B', 'COMPARISON': '#caca20', 'CLOSING_CTA': '#115054' };
                         const borderColor = layoutColors[slide.layout] || '#acacac';
                         return (
                         <div key={idx} className="bg-[var(--card-bg)] rounded border border-[var(--border-primary)] shadow-sm overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
                             {/* Slide Header */}
                             <div className="flex justify-between items-center px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                                 <h5 className="text-xs font-bold text-[var(--nxt-teal)] uppercase">Slide {slide.slideNumber}: {slide.title}</h5>
                                 <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-sm" style={{ backgroundColor: borderColor + '15', color: borderColor }}>{slide.layout?.replace(/_/g, ' ')}</span>
                             </div>

                             <div className="p-4 space-y-3">
                                 {/* CONTENT BULLETS — the actual slide text (was completely missing!) */}
                                 {slide.content && slide.content.length > 0 && (
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Slide Content ({slide.content.length} points)</label>
                                         <div className="space-y-1.5">
                                             {slide.content.map((bullet: string, bi: number) => (
                                                 <div key={bi} className="flex items-start gap-2 bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border-secondary)]">
                                                     <span className="text-[var(--nxt-teal)] font-bold text-xs mt-0.5">{bi+1}.</span>
                                                     <textarea value={bullet} onChange={(e) => {
                                                         const newContent = [...slide.content];
                                                         newContent[bi] = e.target.value;
                                                         updateSlideNarrative(idx, 'content', newContent as any);
                                                     }} className="flex-1 bg-transparent text-xs outline-none resize-none h-8" />
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* EVIDENCE QUOTE */}
                                 {slide.quote && (
                                     <div className="bg-[var(--bg-tertiary)] p-3 rounded border-l-4 border-[var(--nxt-lime)]">
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Evidence Quote</label>
                                         <textarea value={slide.quote} onChange={(e) => updateSlideNarrative(idx, 'quote', e.target.value)}
                                            className="w-full bg-transparent text-xs italic outline-none resize-none h-8" />
                                     </div>
                                 )}

                                 {/* PRESENTER NARRATIVE */}
                                 <div>
                                     <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Presenter Script</label>
                                     <textarea value={slide.narrative} onChange={(e) => updateSlideNarrative(idx, 'narrative', e.target.value)}
                                        className="w-full bg-white text-sm p-3 rounded h-16 resize-none border border-[var(--border-primary)] outline-none" placeholder="What the presenter says..." />
                                 </div>

                                 {/* VISUAL + SPEAKER NOTES */}
                                 <div className="grid md:grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Visual Prompt</label>
                                         <textarea value={slide.visualPrompt} onChange={(e) => updateSlideNarrative(idx, 'visualPrompt', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-12 resize-none border border-[var(--border-secondary)] outline-none" />
                                     </div>
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Speaker Notes</label>
                                         <textarea value={slide.speakerNotes} onChange={(e) => updateSlideNarrative(idx, 'speakerNotes', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded h-12 resize-none border border-[var(--border-secondary)] outline-none italic" />
                                     </div>
                                 </div>
                             </div>
                         </div>
                         );
                     })}
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

  const [journeyView, setJourneyView] = useState<'visual' | 'detail'>('visual');

  const renderJourneyVisual = (stages: any[]) => {
      const emotionColors: Record<string, string> = { 'Delighted': '#0CCE6B', 'Positive': '#00b1eb', 'Neutral': '#acacac', 'Negative': '#fd8e2e', 'Frustrated': '#FF5A5A' };
      const emotionYRaw: Record<string, number> = { 'Delighted': 10, 'Positive': 30, 'Neutral': 50, 'Negative': 70, 'Frustrated': 90, 'delighted': 10, 'positive': 30, 'neutral': 50, 'negative': 70, 'frustrated': 90, 'Happy': 10, 'Anxious': 70, 'Hopeful': 30, 'Confused': 70, 'Satisfied': 20, 'Overwhelmed': 80 };
      const emotionY = (e: string) => emotionYRaw[e] ?? emotionYRaw[e?.charAt(0)?.toUpperCase() + e?.slice(1)] ?? 50;
      const allActors = [...new Set(stages.flatMap((s: any) => s.actors || []))];
      const actorColors = ['#115054', '#fd8e2e', '#00b1eb', '#caca20', '#0CCE6B', '#9333ea', '#FF5A5A', '#525252'];

      return (
          <div className="overflow-x-auto pb-2">
              {/* EMOTION CURVE — SVG sparkline across stages */}
              <div className="mb-1 px-12 relative">
                  <div className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Emotional Journey</div>
                  <svg width="100%" height="60" viewBox={`0 0 ${stages.length * 120} 60`} className="overflow-visible">
                      {/* Grid lines */}
                      <line x1="0" y1="30" x2={stages.length * 120} y2="30" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4,4" />
                      {/* Emotion path */}
                      <polyline fill="none" stroke="#115054" strokeWidth="2.5" strokeLinejoin="round"
                          points={stages.map((s: any, i: number) => `${i * 120 + 60},${emotionY(s.emotion)}`).join(' ')} />
                      {/* Emotion dots */}
                      {stages.map((s: any, i: number) => (
                          <g key={i}>
                              <circle cx={i * 120 + 60} cy={emotionY(s.emotion)} r="6" fill={emotionColors[s.emotion] || '#acacac'} stroke="white" strokeWidth="2" />
                              {s.momentOfTruth && <text x={i * 120 + 60} y={(emotionY(s.emotion)) - 12} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FF5A5A">MOT</text>}
                          </g>
                      ))}
                      {/* Y-axis labels */}
                      <text x="-5" y="13" fontSize="6" fill="#acacac" textAnchor="end">Delighted</text>
                      <text x="-5" y="53" fontSize="6" fill="#acacac" textAnchor="end">Neutral</text>
                      <text x="-5" y="93" fontSize="6" fill="#acacac" textAnchor="end">Frustrated</text>
                  </svg>
              </div>

              {/* SWIMLANE GRID — Stages as columns, swim lanes as rows */}
              <div className="relative" style={{ minWidth: stages.length * 160 }}>
                  {/* Column headers (stages) */}
                  <div className="flex border-b-2 border-[var(--nxt-teal)]">
                      <div className="w-24 flex-shrink-0"></div>
                      {stages.map((s: any, i: number) => (
                          <div key={i} className={`flex-1 min-w-[140px] text-center px-1 py-2 ${s.momentOfTruth ? 'bg-red-50' : ''}`} style={{ borderBottom: `3px solid ${emotionColors[s.emotion] || '#acacac'}` }}>
                              <div className="text-[8px] font-bold uppercase text-[var(--nxt-teal)] leading-tight">{s.phase}</div>
                          </div>
                      ))}
                  </div>

                  {/* TOUCHPOINTS LANE */}
                  <div className="flex border-b border-[var(--border-primary)]">
                      <div className="w-24 flex-shrink-0 bg-[var(--bg-secondary)] flex items-center px-2"><span className="text-[7px] font-bold uppercase text-[var(--text-tertiary)]">Touchpoints</span></div>
                      {stages.map((s: any, i: number) => (
                          <div key={i} className="flex-1 min-w-[140px] p-2 border-r border-[var(--border-primary)]">
                              <div className="text-[9px] text-[var(--text-secondary)] leading-snug">{s.touchpoint}</div>
                          </div>
                      ))}
                  </div>

                  {/* ACTOR LANES — one row per persona */}
                  {allActors.map((actor: string, ai: number) => (
                      <div key={ai} className="flex border-b border-[var(--border-primary)]">
                          <div className="w-24 flex-shrink-0 bg-[var(--bg-secondary)] flex items-center px-2 border-r border-[var(--border-primary)]">
                              <span className="text-[8px] font-bold truncate" style={{ color: actorColors[ai % actorColors.length] }}>{actor}</span>
                          </div>
                          {stages.map((s: any, si: number) => {
                              const isInvolved = (s.actors || []).includes(actor);
                              return (
                                  <div key={si} className={`flex-1 min-w-[140px] p-1.5 border-r border-[var(--border-primary)] ${isInvolved ? '' : 'opacity-20'}`}>
                                      {isInvolved && (
                                          <div className="text-[8px] leading-snug space-y-1">
                                              <div className="font-bold" style={{ color: actorColors[ai % actorColors.length] }}>{(s.actorBehaviors || '').split('.').find((b: string) => b.includes(actor))?.trim() || s.customerAction?.substring(0, 60)}</div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  ))}

                  {/* FRONTSTAGE LANE */}
                  <div className="flex border-b border-[var(--border-primary)]">
                      <div className="w-24 flex-shrink-0 bg-blue-50 flex items-center px-2 border-r border-blue-100"><span className="text-[7px] font-bold uppercase text-blue-600">Frontstage</span></div>
                      {stages.map((s: any, i: number) => (
                          <div key={i} className="flex-1 min-w-[140px] p-1.5 border-r border-blue-50 bg-blue-50/30">
                              <div className="text-[8px] text-blue-700 leading-snug">{(s.frontstageAction || '').substring(0, 80)}</div>
                          </div>
                      ))}
                  </div>

                  {/* LINE OF VISIBILITY */}
                  <div className="flex items-center border-b-2 border-dashed border-[var(--nxt-lime)]">
                      <div className="w-24 flex-shrink-0 flex items-center justify-center py-0.5"><span className="text-[6px] font-bold uppercase text-[var(--nxt-lime)] tracking-widest">Visibility</span></div>
                      {stages.map((_: any, i: number) => <div key={i} className="flex-1 min-w-[140px]"></div>)}
                  </div>

                  {/* BACKSTAGE LANE */}
                  <div className="flex border-b border-[var(--border-primary)]">
                      <div className="w-24 flex-shrink-0 bg-teal-50 flex items-center px-2 border-r border-teal-100"><span className="text-[7px] font-bold uppercase text-teal-700">Backstage</span></div>
                      {stages.map((s: any, i: number) => (
                          <div key={i} className="flex-1 min-w-[140px] p-1.5 border-r border-teal-50 bg-teal-50/30">
                              <div className="text-[8px] text-teal-700 leading-snug">{(s.backstageAction || '').substring(0, 80)}</div>
                          </div>
                      ))}
                  </div>

                  {/* PAIN POINTS LANE */}
                  <div className="flex">
                      <div className="w-24 flex-shrink-0 bg-red-50 flex items-center px-2 border-r border-red-100"><span className="text-[7px] font-bold uppercase text-[#FF5A5A]">Pain Points</span></div>
                      {stages.map((s: any, i: number) => (
                          <div key={i} className="flex-1 min-w-[140px] p-1.5 border-r border-red-50 bg-red-50/30">
                              {s.painPoint && <div className="text-[8px] text-red-700 leading-snug">{(s.painPoint || '').substring(0, 80)}</div>}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderJourney = () => {
        if (!editedJourney) return <div className="p-4 text-center text-gray-500">No Journey Map data available.</div>;
        const emotionColors: Record<string, string> = { 'Delighted': '#0CCE6B', 'Positive': '#00b1eb', 'Neutral': '#acacac', 'Negative': '#fd8e2e', 'Frustrated': '#FF5A5A' };
        const emotionHeight: Record<string, number> = { 'Delighted': 48, 'Positive': 36, 'Neutral': 24, 'Negative': 14, 'Frustrated': 6 };

        return (
            <div className="max-h-[70vh] overflow-y-auto pr-2">
                {/* VIEW TOGGLE */}
                <div className="flex gap-1 mb-3">
                    <button onClick={() => setJourneyView('visual')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${journeyView === 'visual' ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>Swimlane View</button>
                    <button onClick={() => setJourneyView('detail')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${journeyView === 'detail' ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>Detail View</button>
                </div>

                {/* VISUAL SWIMLANE VIEW */}
                {journeyView === 'visual' && renderJourneyVisual(editedJourney.stages)}

                {/* DETAIL VIEW — the existing card-based editor */}
                {journeyView === 'detail' && <>
                {/* Emotion curve + stage labels */}
                <div className="flex items-end gap-1 mb-4 h-14 px-2">
                    {editedJourney.stages.map((stage: any, idx: number) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            {stage.momentOfTruth && <span className="text-[7px] font-bold text-[#FF5A5A]">MOT</span>}
                            <div className="rounded-sm w-full transition-all" style={{ height: emotionHeight[stage.emotion] || 24, backgroundColor: emotionColors[stage.emotion] || '#acacac' }}></div>
                            <span className="text-[6px] font-bold uppercase text-[var(--text-tertiary)] truncate w-full text-center">{(stage.phase || '').substring(0, 18)}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                     {editedJourney.stages.map((stage: any, idx: number) => (
                         <div key={idx} className={`bg-[var(--card-bg)] rounded border overflow-hidden ${stage.momentOfTruth ? 'border-[#FF5A5A] ring-1 ring-[#FF5A5A]/20' : 'border-[var(--border-primary)]'}`}>
                             {/* Stage header */}
                             <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border-secondary)]" style={{ borderLeftWidth: 4, borderLeftColor: emotionColors[stage.emotion] || '#acacac' }}>
                                 <div className="flex items-center gap-2">
                                     <h4 className="text-xs font-bold text-[var(--nxt-teal)] uppercase">Stage {idx+1}: {stage.phase}</h4>
                                     {stage.momentOfTruth && <span className="text-[7px] font-bold bg-[#FF5A5A] text-white px-1.5 py-0.5 rounded-sm uppercase">Moment of Truth</span>}
                                 </div>
                                 <select value={stage.emotion} onChange={(e) => updateJourneyStage(idx, 'emotion', e.target.value)}
                                    className="text-[10px] font-bold bg-[var(--bg-tertiary)] rounded px-2 py-1 border border-[var(--border-primary)]">
                                    <option value="Delighted">Delighted</option><option value="Positive">Positive</option>
                                    <option value="Neutral">Neutral</option><option value="Negative">Negative</option>
                                    <option value="Frustrated">Frustrated</option>
                                 </select>
                             </div>

                             <div className="p-4 space-y-3">
                                 {/* ACTORS (Personas) — the key innovation */}
                                 {stage.actors && stage.actors.length > 0 && (
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Actors (Personas)</label>
                                         <div className="flex flex-wrap gap-1.5">
                                             {stage.actors.map((actor: string, ai: number) => (
                                                 <span key={ai} className="text-[10px] font-bold bg-[var(--nxt-lime-10)] text-[var(--nxt-teal)] border border-[var(--nxt-lime-20)] px-2 py-0.5 rounded-sm">{actor}</span>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* Actor Needs & Behaviors */}
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-[8px] font-bold text-purple-600 uppercase tracking-widest block mb-1">Actor Needs</label>
                                         <textarea value={stage.actorNeeds || ''} onChange={(e) => updateJourneyStage(idx, 'actorNeeds' as any, e.target.value)}
                                            className="w-full bg-purple-50 text-xs p-2 rounded resize-none h-12 outline-none border border-purple-100" />
                                     </div>
                                     <div>
                                         <label className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Actor Behaviors</label>
                                         <textarea value={stage.actorBehaviors || ''} onChange={(e) => updateJourneyStage(idx, 'actorBehaviors' as any, e.target.value)}
                                            className="w-full bg-indigo-50 text-xs p-2 rounded resize-none h-12 outline-none border border-indigo-100" />
                                     </div>
                                 </div>

                                 {/* Customer Action & Touchpoint */}
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Customer Action</label>
                                         <textarea value={stage.customerAction || ''} onChange={(e) => updateJourneyStage(idx, 'customerAction', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-12 outline-none" />
                                     </div>
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Touchpoint</label>
                                         <textarea value={stage.touchpoint || ''} onChange={(e) => updateJourneyStage(idx, 'touchpoint', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-12 outline-none" />
                                     </div>
                                 </div>

                                 {/* Value Proposition */}
                                 {stage.valueProposition && (
                                     <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                                         <label className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Value Delivered</label>
                                         <textarea value={stage.valueProposition || ''} onChange={(e) => updateJourneyStage(idx, 'valueProposition' as any, e.target.value)}
                                            className="w-full bg-transparent text-xs text-emerald-800 resize-none h-8 outline-none" />
                                     </div>
                                 )}

                                 {/* Line of Visibility */}
                                 <div className="flex items-center gap-2 py-1">
                                     <div className="flex-1 border-t-2 border-dashed border-[var(--nxt-lime)]"></div>
                                     <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--nxt-lime)]">Line of Visibility</span>
                                     <div className="flex-1 border-t-2 border-dashed border-[var(--nxt-lime)]"></div>
                                 </div>

                                 {/* Frontstage & Backstage */}
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-[8px] font-bold text-[#00b1eb] uppercase tracking-widest block mb-1">Frontstage (Visible)</label>
                                         <textarea value={stage.frontstageAction || ''} onChange={(e) => updateJourneyStage(idx, 'frontstageAction', e.target.value)}
                                            className="w-full bg-blue-50 text-xs p-2 rounded resize-none h-12 outline-none border border-blue-100" />
                                     </div>
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Backstage (Hidden)</label>
                                         <textarea value={stage.backstageAction || ''} onChange={(e) => updateJourneyStage(idx, 'backstageAction', e.target.value)}
                                            className="w-full bg-teal-50 text-xs p-2 rounded resize-none h-12 outline-none border border-teal-100" />
                                     </div>
                                 </div>

                                 {/* Support & Physical Evidence */}
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Support Processes</label>
                                         <textarea value={stage.supportProcesses || ''} onChange={(e) => updateJourneyStage(idx, 'supportProcesses' as any, e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-10 outline-none" />
                                     </div>
                                     <div>
                                         <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Physical Evidence</label>
                                         <textarea value={stage.physicalEvidence || ''} onChange={(e) => updateJourneyStage(idx, 'physicalEvidence', e.target.value)}
                                            className="w-full bg-[var(--bg-tertiary)] text-xs p-2 rounded resize-none h-10 outline-none" />
                                     </div>
                                 </div>

                                 {/* Pain Point */}
                                 {stage.painPoint && (
                                     <div className="bg-red-50 p-3 rounded border border-red-100">
                                         <label className="text-[8px] font-bold text-[#FF5A5A] uppercase tracking-widest block mb-1">Pain Point</label>
                                         <textarea value={stage.painPoint || ''} onChange={(e) => updateJourneyStage(idx, 'painPoint' as any, e.target.value)}
                                            className="w-full bg-transparent text-xs text-red-800 resize-none h-10 outline-none" />
                                     </div>
                                 )}

                                 {/* Opportunity */}
                                 {stage.opportunityForImprovement && (
                                     <div className="bg-[var(--nxt-lime-10)] p-3 rounded border border-[var(--nxt-lime-20)]">
                                         <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Opportunity for Improvement</label>
                                         <textarea value={stage.opportunityForImprovement || ''} onChange={(e) => updateJourneyStage(idx, 'opportunityForImprovement' as any, e.target.value)}
                                            className="w-full bg-transparent text-xs text-[var(--nxt-teal)] resize-none h-10 outline-none" />
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))}
                </div>
                </>}
            </div>
        );
  };

  const [archView, setArchView] = useState<'diagram' | 'detail'>('diagram');

  const renderArchDiagram = (arch: any) => {
      const nodeFills: Record<string, string> = { 'User': '#dbeafe', 'Application': '#d1fae5', 'Database': '#fef3c7', 'Integration': '#ede9fe', 'External': '#f3f4f6', 'AI/ML': '#ccfbf1', 'Cloud': '#e0e7ff' };
      const nodeStrokes: Record<string, string> = { 'User': '#3b82f6', 'Application': '#10b981', 'Database': '#f59e0b', 'Integration': '#8b5cf6', 'External': '#6b7280', 'AI/ML': '#14b8a6', 'Cloud': '#6366f1' };
      const statusColors: Record<string, string> = { 'active': '#0CCE6B', 'broken': '#FF5A5A', 'planned': '#caca20' };
      const nodes = arch.nodes || [];
      const flows = arch.flows || [];

      // Layout: group by type into layers
      const typeOrder = ['User', 'Application', 'AI/ML', 'Integration', 'Database', 'External', 'Cloud'];
      const grouped: Record<string, any[]> = {};
      nodes.forEach((n: any) => { const t = n.type || 'External'; if (!grouped[t]) grouped[t] = []; grouped[t].push(n); });
      const layers = typeOrder.filter(t => grouped[t]);

      // Assign positions
      const nodePos: Record<string, { x: number; y: number }> = {};
      const W = 800, layerH = 70, nodeW = 130, nodeH = 40;
      layers.forEach((layer, li) => {
          const layerNodes = grouped[layer];
          const startX = (W - layerNodes.length * (nodeW + 20)) / 2;
          layerNodes.forEach((n: any, ni: number) => {
              nodePos[n.id] = { x: startX + ni * (nodeW + 20) + nodeW / 2, y: 40 + li * layerH + nodeH / 2 };
          });
      });
      const svgH = 40 + layers.length * layerH + 20;

      return (
          <div className="overflow-x-auto">
              <svg width={W} height={svgH} viewBox={`0 0 ${W} ${svgH}`} className="mx-auto">
                  <defs>
                      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#115054" /></marker>
                      <marker id="arrowred" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#FF5A5A" /></marker>
                  </defs>

                  {/* Layer labels */}
                  {layers.map((layer, li) => (
                      <text key={li} x="8" y={40 + li * layerH + nodeH / 2 + 3} fontSize="8" fontWeight="bold" fill={nodeStrokes[layer] || '#6b7280'} textAnchor="start">{layer}</text>
                  ))}

                  {/* Flows (arrows) */}
                  {flows.map((flow: any, fi: number) => {
                      const from = nodePos[flow.fromId];
                      const to = nodePos[flow.toId];
                      if (!from || !to) return null;
                      const color = statusColors[flow.status] || '#115054';
                      const dash = flow.status === 'planned' ? '4,3' : flow.status === 'broken' ? '2,2' : 'none';
                      // Offset to avoid overlapping
                      const mx = (from.x + to.x) / 2;
                      const my = (from.y + to.y) / 2 - 8;
                      return (
                          <g key={`f${fi}`}>
                              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="1.5" strokeDasharray={dash} markerEnd={flow.status === 'broken' ? 'url(#arrowred)' : 'url(#arrowhead)'} opacity="0.7" />
                              {flow.action && <text x={mx} y={my} fontSize="6" fill="#525252" textAnchor="middle">{(flow.action || '').substring(0, 30)}</text>}
                          </g>
                      );
                  })}

                  {/* Nodes */}
                  {nodes.map((node: any, ni: number) => {
                      const pos = nodePos[node.id];
                      if (!pos) return null;
                      const fill = nodeFills[node.type] || '#f3f4f6';
                      const stroke = nodeStrokes[node.type] || '#6b7280';
                      return (
                          <g key={`n${ni}`}>
                              <rect x={pos.x - nodeW / 2} y={pos.y - nodeH / 2} width={nodeW} height={nodeH} rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
                              <text x={pos.x} y={pos.y - 2} fontSize="8" fontWeight="bold" fill="#141414" textAnchor="middle">{(node.label || '').substring(0, 20)}</text>
                              <text x={pos.x} y={pos.y + 10} fontSize="6" fill={stroke} textAnchor="middle" fontWeight="bold">{node.type}</text>
                          </g>
                      );
                  })}
              </svg>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-2 px-2 justify-center">
                  {Object.entries(nodeStrokes).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1">
                          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: nodeFills[type], border: `1px solid ${color}` }}></div>
                          <span className="text-[7px] font-bold uppercase" style={{ color }}>{type}</span>
                      </div>
                  ))}
                  <div className="w-px h-3 bg-gray-200 mx-1"></div>
                  <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-[#0CCE6B]"></div><span className="text-[7px] text-[#0CCE6B] font-bold">Active</span></div>
                  <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-dashed border-[#caca20]"></div><span className="text-[7px] text-[#caca20] font-bold">Planned</span></div>
                  <div className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-dotted border-[#FF5A5A]"></div><span className="text-[7px] text-[#FF5A5A] font-bold">Broken</span></div>
              </div>
          </div>
      );
  };

  const renderArch = () => {
      if (!editedArch) return <div className="p-4 text-center text-gray-500">No Architecture data available.</div>;
      const arch = editedArch.architecture;
      const nodeTypeColors: Record<string, string> = {
          'User': 'bg-blue-50 border-blue-200 text-blue-700',
          'Application': 'bg-emerald-50 border-emerald-200 text-emerald-700',
          'Database': 'bg-amber-50 border-amber-200 text-amber-700',
          'Integration': 'bg-purple-50 border-purple-200 text-purple-700',
          'External': 'bg-gray-50 border-gray-200 text-gray-600',
          'AI/ML': 'bg-teal-50 border-teal-200 text-teal-700',
          'Cloud': 'bg-indigo-50 border-indigo-200 text-indigo-700',
      };
      return (
          <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
              {/* VIEW TOGGLE */}
              <div className="flex gap-1">
                  <button onClick={() => setArchView('diagram')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${archView === 'diagram' ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>Diagram View</button>
                  <button onClick={() => setArchView('detail')} className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${archView === 'detail' ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white text-[var(--text-tertiary)] border-[var(--border-primary)]'}`}>Detail View</button>
              </div>

              {/* Overview */}
              {arch.overview && (
                  <div className="bg-[var(--bg-secondary)] p-3 rounded border text-[12px] text-[var(--text-secondary)] leading-relaxed">{arch.overview}</div>
              )}

              {/* DIAGRAM VIEW */}
              {archView === 'diagram' && renderArchDiagram(arch)}

              {/* DETAIL VIEW */}
              {archView === 'detail' && <>
              {/* Nodes */}
              <div>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-2">System Nodes ({arch.nodes?.length || 0})</div>
                  <div className="grid grid-cols-2 gap-2">
                      {(arch.nodes || []).map((node: any, idx: number) => {
                          const colorClass = nodeTypeColors[node.type] || 'bg-gray-50 border-gray-200 text-gray-600';
                          return (
                              <div key={idx} className={`p-3 rounded border ${colorClass}`}>
                                  <div className="flex justify-between items-start">
                                      <input value={node.label || ''} onChange={(e) => {
                                          const nn = (arch.nodes || []).map((n: any, i: number) => i === idx ? {...n, label: e.target.value} : n);
                                          setEditedArch({...editedArch, architecture: {...arch, nodes: nn}});
                                      }} className="font-bold text-xs bg-transparent outline-none flex-1" />
                                      <select value={node.type || 'Application'} onChange={(e) => {
                                          const nn = (arch.nodes || []).map((n: any, i: number) => i === idx ? {...n, type: e.target.value} : n);
                                          setEditedArch({...editedArch, architecture: {...arch, nodes: nn}});
                                      }} className="text-[8px] font-bold uppercase bg-white/50 rounded px-1 py-0.5 border ml-1">
                                          <option value="User">User</option><option value="Application">App</option>
                                          <option value="Database">DB</option><option value="Integration">Integration</option>
                                          <option value="External">External</option><option value="AI/ML">AI/ML</option>
                                          <option value="Cloud">Cloud</option>
                                      </select>
                                  </div>
                                  {node.description && <div className="text-[10px] mt-1 opacity-80">{node.description}</div>}
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Flows */}
              {(arch.flows || []).length > 0 && (
                  <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-2">Data Flows ({arch.flows.length})</div>
                      <div className="space-y-1.5">
                          {arch.flows.map((flow: any, idx: number) => {
                              const fromNode = (arch.nodes || []).find((n: any) => n.id === flow.fromId);
                              const toNode = (arch.nodes || []).find((n: any) => n.id === flow.toId);
                              const statusColor = flow.status === 'active' ? 'text-[#0CCE6B]' : flow.status === 'broken' ? 'text-[#FF5A5A]' : flow.status === 'planned' ? 'text-[var(--nxt-lime)]' : 'text-[var(--text-tertiary)]';
                              return (
                                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                                      <span className="font-bold text-[var(--nxt-teal)] min-w-[80px] truncate">{fromNode?.label || flow.fromId}</span>
                                      <span className="text-[var(--text-tertiary)]">{"-->"}</span>
                                      <span className="font-bold text-[var(--nxt-teal)] min-w-[80px] truncate">{toNode?.label || flow.toId}</span>
                                      <span className="text-[var(--text-secondary)] flex-1 truncate">{flow.action}</span>
                                      {flow.status && <span className={`text-[8px] font-bold uppercase ${statusColor}`}>{flow.status}</span>}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
              </>}
          </div>
      );
  };

  const renderPRD = () => {
      if (!editedPRD) return <div className="p-4 text-center text-gray-500">No PRD data available.</div>;
      const prd = editedPRD.prd;
      const priorityCounts = { 'Must-have': 0, 'Should-have': 0, 'Could-have': 0, "Won't-have": 0 };
      prd.features?.forEach((f: any) => { if (priorityCounts[f.priority as keyof typeof priorityCounts] !== undefined) priorityCounts[f.priority as keyof typeof priorityCounts]++; });
      return (
          <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
               {/* Title */}
               <div>
                   <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Product / Initiative Title</label>
                   <input value={prd.title} onChange={(e) => updatePRDField('title', e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] p-3 rounded font-bold text-base outline-none focus:ring-1 focus:ring-[var(--nxt-teal)]" />
               </div>

               {/* Purpose & Objectives */}
               {prd.purposeAndObjectives && (
                   <div>
                       <label className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Purpose & Objectives</label>
                       <div className="bg-[var(--bg-secondary)] p-3 rounded border text-[12px] text-[var(--text-secondary)] leading-relaxed">{prd.purposeAndObjectives}</div>
                   </div>
               )}

               {/* Success Metrics */}
               {prd.successMetrics && prd.successMetrics.length > 0 && (
                   <div>
                       <label className="text-[8px] font-bold text-[var(--nxt-teal)] uppercase tracking-widest block mb-1">Success Metrics</label>
                       <div className="flex flex-wrap gap-1.5">
                           {prd.successMetrics.map((m: string, i: number) => (
                               <span key={i} className="text-[10px] bg-[var(--nxt-lime-10)] border border-[var(--nxt-lime-20)] text-[var(--nxt-teal)] px-2 py-1 rounded-sm">{m}</span>
                           ))}
                       </div>
                   </div>
               )}

               {/* MoSCoW Summary */}
               <div className="flex gap-2">
                   {Object.entries(priorityCounts).map(([p, count]) => (
                       <div key={p} className={`flex-1 text-center p-2 rounded border ${p === 'Must-have' ? 'bg-red-50 border-red-100' : p === 'Should-have' ? 'bg-amber-50 border-amber-100' : p === 'Could-have' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                           <div className="text-lg font-extralight">{count}</div>
                           <div className="text-[8px] font-bold uppercase">{p}</div>
                       </div>
                   ))}
               </div>

               {/* Features */}
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
      const horizonColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
          'Now': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: '0-3 months' },
          'Next': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '3-9 months' },
          'Later': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', label: '9-18 months' },
      };
      const grouped = { Now: [] as any[], Next: [] as any[], Later: [] as any[] };
      editedRoadmap.roadmap.items.forEach((item: any, idx: number) => {
          const h = item.horizon || 'Later';
          if (grouped[h as keyof typeof grouped]) grouped[h as keyof typeof grouped].push({ ...item, _idx: idx });
      });

      return (
          <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
               {/* Vision */}
               {editedRoadmap.roadmap.vision && (
                   <div className="bg-[var(--nxt-teal)] text-white p-4 rounded">
                       <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--nxt-lime)] mb-1">Strategic Vision</div>
                       <p className="text-sm font-light leading-relaxed">{editedRoadmap.roadmap.vision}</p>
                   </div>
               )}

               {/* Horizon columns */}
               <div className="grid grid-cols-3 gap-3">
                   {(['Now', 'Next', 'Later'] as const).map(horizon => {
                       const style = horizonColors[horizon];
                       const items = grouped[horizon];
                       return (
                           <div key={horizon} className="space-y-2">
                               <div className={`${style.bg} ${style.border} border rounded p-2 text-center`}>
                                   <div className={`text-sm font-bold ${style.text}`}>{horizon}</div>
                                   <div className="text-[9px] text-[var(--text-tertiary)]">{style.label}</div>
                                   <div className="text-lg font-extralight">{items.length}</div>
                               </div>
                               {items.map((item: any) => (
                                   <div key={item._idx} className={`${style.bg} ${style.border} border rounded p-3 space-y-2`}>
                                       <input value={item.initiative} onChange={(e) => updateRoadmapItem(item._idx, 'initiative', e.target.value)}
                                           className="font-bold text-xs bg-transparent outline-none w-full" />
                                       <textarea value={item.description || ''} onChange={(e) => updateRoadmapItem(item._idx, 'description', e.target.value)}
                                           className="text-[11px] text-[var(--text-secondary)] bg-transparent outline-none w-full resize-none h-12" />
                                       {item.owner && <div className="text-[9px] text-[var(--text-tertiary)]"><i className="fas fa-user mr-1"></i>{item.owner}</div>}
                                       {item.successMetric && <div className="text-[9px] text-[var(--nxt-teal)] bg-white/50 px-2 py-0.5 rounded"><i className="fas fa-chart-line mr-1"></i>{item.successMetric}</div>}
                                       <select value={item.horizon} onChange={(e) => updateRoadmapItem(item._idx, 'horizon', e.target.value)}
                                           className="text-[9px] bg-white/50 rounded px-1 py-0.5 border">
                                           <option value="Now">Now</option><option value="Next">Next</option><option value="Later">Later</option>
                                       </select>
                                   </div>
                               ))}
                           </div>
                       );
                   })}
               </div>
          </div>
      );
  };

  // --- GAP ANALYSIS CHECKPOINT ---
  const renderGapAnalysis = () => {
      const d = data as any;
      if (!d?.analysis) return <LoadingView log={currentLog} elapsed={elapsed} />;
      const a = d.analysis;
      return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Assessment Scope</div>
              <div className="bg-[var(--bg-secondary)] p-3 rounded border text-[13px] text-[var(--text-secondary)]">{a.assessmentScope}</div>

              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Capability Gaps ({a.gaps?.length || 0})</div>
              <div className="space-y-2">
                  {(a.gaps || []).map((gap: any, i: number) => (
                      <div key={i} className="bg-[var(--bg-secondary)] p-3 rounded border border-[var(--border-primary)]">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold">{gap.capability}</span>
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${gap.severity === 'critical' ? 'bg-[#FF5A5A] text-white' : gap.severity === 'high' ? 'bg-[var(--nxt-orange)] text-white' : 'bg-gray-200'}`}>{gap.severity}</span>
                          </div>
                          <div className="flex gap-4 text-[10px] text-[var(--text-tertiary)]">
                              <span>Current: {gap.currentMaturity}/5</span>
                              <span>Target: {gap.targetMaturity}/5</span>
                              <span>Gap: {gap.gap}</span>
                              <span>Effort: {gap.effort}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1">{gap.impact}</p>
                      </div>
                  ))}
              </div>

              {a.quickWins?.length > 0 && (
                  <>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0CCE6B] mb-2">Quick Wins ({a.quickWins.length})</div>
                      {a.quickWins.map((qw: any, i: number) => (
                          <div key={i} className="bg-green-50 p-2 rounded border border-green-200 text-[11px]">
                              <span className="font-bold">{qw.action}</span> <span className="text-[var(--text-tertiary)]">| Impact: {qw.impact} | Effort: {qw.effort}</span>
                          </div>
                      ))}
                  </>
              )}

              {a.prioritizedActions?.length > 0 && (
                  <>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Prioritized Actions ({a.prioritizedActions.length})</div>
                      {a.prioritizedActions.map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                              <span className="text-[8px] font-bold uppercase bg-[var(--nxt-lime)] text-[var(--nxt-teal)] px-1.5 py-0.5 rounded-sm flex-shrink-0">{action.priority}</span>
                              <span className="font-bold flex-1">{action.action}</span>
                              {action.timeline && <span className="text-[var(--text-tertiary)] flex-shrink-0">{action.timeline}</span>}
                          </div>
                      ))}
                  </>
              )}
          </div>
      );
  };

  // --- TECH AUDIT CHECKPOINT ---
  const renderTechAudit = () => {
      const d = data as any;
      if (!d?.audit) return <LoadingView log={currentLog} elapsed={elapsed} />;
      const a = d.audit;
      return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Systems Inventory ({a.systemsInventory?.length || 0})</div>
              <div className="space-y-1">
                  {(a.systemsInventory || []).map((sys: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm flex-shrink-0 ${sys.status === 'active' ? 'bg-[#0CCE6B] text-white' : sys.status === 'legacy' ? 'bg-[var(--nxt-orange)] text-white' : sys.status === 'deprecated' ? 'bg-[#FF5A5A] text-white' : 'bg-gray-200'}`}>{sys.status}</span>
                          <span className="font-bold flex-1 truncate">{sys.name}</span>
                          <span className="text-[var(--text-tertiary)] flex-shrink-0">{sys.vendor}</span>
                          <span className="text-[var(--text-tertiary)] flex-shrink-0">{sys.department}</span>
                      </div>
                  ))}
              </div>

              {a.integrationMap?.length > 0 && (
                  <>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Integration Map ({a.integrationMap.length})</div>
                      {a.integrationMap.map((link: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                              <span className="font-bold">{link.source}</span>
                              <span className="text-[var(--text-tertiary)]">{"→"}</span>
                              <span className="font-bold">{link.target}</span>
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm ml-auto ${link.health === 'healthy' ? 'bg-[#0CCE6B] text-white' : link.health === 'degraded' ? 'bg-[var(--nxt-orange)] text-white' : 'bg-[#FF5A5A] text-white'}`}>{link.health}</span>
                          </div>
                      ))}
                  </>
              )}

              {a.capabilityMatrix?.length > 0 && (
                  <>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Capability Maturity</div>
                      {a.capabilityMatrix.map((cap: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                              <span className="flex-1 font-bold truncate">{cap.capability}</span>
                              <div className="flex gap-1 flex-shrink-0">
                                  {[1,2,3,4,5].map(n => (
                                      <div key={n} className={`w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-bold ${n <= cap.currentMaturity ? 'bg-[var(--nxt-teal)] text-white' : n <= cap.targetMaturity ? 'bg-[var(--nxt-lime-20)] text-[var(--nxt-teal)]' : 'bg-gray-100'}`}>{n}</div>
                                  ))}
                              </div>
                              <span className="text-[9px] text-[var(--text-tertiary)] flex-shrink-0">Gap: {cap.gap}</span>
                          </div>
                      ))}
                  </>
              )}
          </div>
      );
  };

  // --- COMPETITIVE ANALYSIS CHECKPOINT ---
  const renderCompetitiveAnalysis = () => {
      const d = data as any;
      if (!d?.analysis) return <LoadingView log={currentLog} elapsed={elapsed} />;
      const a = d.analysis;
      return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="bg-[var(--bg-secondary)] p-3 rounded border text-[13px] text-[var(--text-secondary)]">{a.industryContext}</div>

              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Peer Organizations ({a.peers?.length || 0})</div>
              <div className="space-y-2">
                  {(a.peers || []).map((peer: any, i: number) => (
                      <div key={i} className="bg-[var(--bg-secondary)] p-3 rounded border">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold">{peer.name}</span>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{peer.position}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                  <div className="text-[8px] font-bold uppercase text-[#0CCE6B] mb-1">Strengths</div>
                                  {(peer.strengths || []).map((s: string, j: number) => <div key={j} className="text-[var(--text-secondary)]">+ {s}</div>)}
                              </div>
                              <div>
                                  <div className="text-[8px] font-bold uppercase text-[#FF5A5A] mb-1">Weaknesses</div>
                                  {(peer.weaknesses || []).map((w: string, j: number) => <div key={j} className="text-[var(--text-secondary)]">- {w}</div>)}
                              </div>
                          </div>
                          {peer.differentiators?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                  {peer.differentiators.map((d: string, j: number) => (
                                      <span key={j} className="text-[9px] bg-[var(--nxt-lime-10)] text-[var(--nxt-teal)] px-1.5 py-0.5 rounded-sm border border-[var(--nxt-lime-20)]">{d}</span>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
              </div>

              {a.gapSummary?.length > 0 && (
                  <>
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--nxt-teal)] mb-2">Competitive Gaps</div>
                      {a.gapSummary.map((gap: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-secondary)] rounded border text-[11px]">
                              <span className="font-bold flex-1">{gap.dimension}</span>
                              <span className="text-[var(--nxt-teal)] font-bold">Us: {gap.ourScore}</span>
                              <span className="text-[var(--nxt-orange)] font-bold">Best: {gap.bestInClass}</span>
                              <span className={`font-bold ${gap.gap > 1 ? 'text-[#FF5A5A]' : 'text-[#0CCE6B]'}`}>Gap: {gap.gap}</span>
                          </div>
                      ))}
                  </>
              )}
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
            {stage === AnalysisStage.DATA_REVIEW && renderDataReview()}
            {stage === AnalysisStage.INGESTION && renderIngestion()}
            {stage === AnalysisStage.THEMES && renderThemes()}
            {stage === AnalysisStage.PERSONAS && renderPersonas()}
            {stage === AnalysisStage.JOURNEY_MAP && renderJourney()}
            {stage === AnalysisStage.TECH_ARCH && renderArch()}
            {stage === AnalysisStage.PRD && renderPRD()}
            {stage === AnalysisStage.ROADMAP && renderRoadmap()}
            {stage === AnalysisStage.RECOMMENDATIONS && renderRecommendations()}
            {stage === AnalysisStage.GAP_ANALYSIS && renderGapAnalysis()}
            {stage === AnalysisStage.TECH_AUDIT_STAGE && renderTechAudit()}
            {stage === AnalysisStage.COMPETITIVE_ANALYSIS && renderCompetitiveAnalysis()}
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
