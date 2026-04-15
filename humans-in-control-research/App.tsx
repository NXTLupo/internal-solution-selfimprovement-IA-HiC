import './tailwind.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from './components/FileUpload';
import ResultsView from './components/ResultsView';
import AnalysisCheckpoint from './components/AnalysisCheckpoint';
import HeuristicBriefIntake from './components/HeuristicBriefIntake';
import HeuristicReportView from './components/HeuristicReportView';
import LiveSourceFeed from './components/LiveSourceFeed';
import ResearchKnowledgeGraph from './components/ResearchKnowledgeGraph';
import { GenAISession } from './services/geminiService';
import { buildSourceGraph, addThemesToGraph, addPersonasToGraph, addRecommendationsToGraph, addJourneyStagesToGraph, addPRDFeaturesToGraph, addRoadmapToGraph, addGapAnalysisToGraph, KnowledgeGraph as KGType } from './services/knowledgeGraphBuilder';
import { runHeuristicAnalysis } from './services/heuristicAnalysisService';
import { DEFAULT_MODELS } from './services/aiRouter';
import { narratePreGeneration, narrateKnowledgeCompounding, narrateSlopDetection, narratePostGeneration, narrateQualityAssessment, narrateLensDetection } from './services/wikiNarrator';
import { loadGenerationContext, detectBannedPhrases, scoreOutput } from './services/wikiService';
import { detectAnalyticalLens, recommendDataSources } from './services/analyticalLensService';
import { AppState, FileUpload as FileType, AnalysisResult, AnalysisStage, SavedProject, OutputOption, UXBrief, HeuristicReport, AnalyticalLens, ANALYTICAL_LENS_LABELS } from './types';
import { DEFAULT_STYLE_ID } from './services/visualizationStyles';
// Research methods are auto-selected by the intelligence engine
import type { ModelPreferences } from './services/aiRouter';
import { LENS_CONFIGS, getLensPromptSegment } from './services/analyticalLensService';

// Define interface locally to avoid global conflicts
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface ThinkingEvent {
  type: string;
  content: string;
}

// Methodology Data definitions
interface MethodInfo {
    title: string;
    role: string;
    description: string;
    steps: string[];
}

const METHODOLOGY_INFO: Record<OutputOption, MethodInfo> = {
    'PERSONAS': {
        title: "Personas & Archetypes",
        role: "User Researcher",
        description: "Develops deep 5-W profiles for key user segments. Includes motivations, pain points, and generated portraits.",
        steps: ["Ingestion", "Themes", "Personas"]
    },
    'STRATEGY_DECK': {
        title: "Strategy Deck",
        role: "Expert Strategist & Visual Designer",
        description: "Synthesizes research into a persuasive narrative arc. It structures the story, drafts slide copy, and generates high-fidelity visual metaphors for each slide.",
        steps: ["Ingestion", "Themes", "Structure", "Deck Visuals"]
    },
    'JOURNEY_MAP': {
        title: "Service Blueprint",
        role: "Senior Service Designer",
        description: "Maps the end-to-end customer experience. It connects frontstage user actions with backstage internal processes, identifying pain points and system touchpoints.",
        steps: ["Ingestion", "Themes", "Service Blueprint"]
    },
    'PRD': {
        title: "Product Requirements Document",
        role: "Senior Product Manager",
        description: "Translates user needs into a structured technical document. Includes prioritized features, user stories, success metrics, and risk assessments.",
        steps: ["Ingestion", "Themes", "PRD"]
    },
    'ROADMAP': {
        title: "Strategic Roadmap",
        role: "Product Executive (CPO)",
        description: "Maps features to strategic horizons (Now/Next/Later). Focuses on outcomes, dependencies, and ownership rather than just dates.",
        steps: ["Ingestion", "Themes", "PRD", "Roadmap"]
    },
    'TECH_ARCH': {
        title: "Technical Architecture",
        role: "Solution Architect",
        description: "Derives system requirements directly from user pain points and data flows. Proposes a flat, modern technical system architecture.",
        steps: ["Ingestion", "Themes", "Tech Architecture"]
    },
    'STRATEGIC_RECS': {
        title: "Strategic Recommendations",
        role: "Management Consultant",
        description: "Distills complex data into high-impact strategic opportunities with concrete action items and impact sizing.",
        steps: ["Ingestion", "Themes", "Recommendations"]
    },
    'GAP_ANALYSIS': {
        title: "Gap Analysis",
        role: "Strategy & Operations Consultant",
        description: "Identifies gaps between current state and desired state across capabilities, systems, or processes. Produces prioritized actions and quick wins.",
        steps: ["Ingestion", "Themes", "Gap Analysis"]
    },
    'TECH_AUDIT': {
        title: "Technology Ecosystem Audit",
        role: "Enterprise Technology Assessor",
        description: "Inventories existing systems, maps integrations, scores capability maturity, and identifies consolidation opportunities.",
        steps: ["Ingestion", "Themes", "Tech Audit"]
    },
    'COMPETITIVE_ANALYSIS': {
        title: "Competitive Analysis",
        role: "Market Intelligence Analyst",
        description: "Benchmarks against peers across key dimensions, produces a maturity matrix, and identifies competitive gaps with actionable responses.",
        steps: ["Ingestion", "Themes", "Competitive Analysis"]
    }
};

// Helper: Recursively strip large base64 strings to save space
const stripImages = (obj: any): any => {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripImages);
    
    const newObj: any = {};
    for (const key in obj) {
        if ((key === 'imageUrl' || key === 'videoUrl' || key === 'diagramUrl') && typeof obj[key] === 'string' && obj[key].startsWith('data:')) {
            newObj[key] = undefined; // Strip base64 data
        } else {
            newObj[key] = stripImages(obj[key]);
        }
    }
    return newObj;
};

// Logo Component
const Logo = () => (
    <div className="flex items-center select-none cursor-default gap-3">
        <img src="/logo.png" alt="NXT Humans" className="h-8 object-contain" />
    </div>
);

// Methodology Modal Component
const MethodologyModal = ({ outputId, onClose }: { outputId: OutputOption, onClose: () => void }) => {
    const info = METHODOLOGY_INFO[outputId];
    if (!info) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-[var(--card-bg)] border border-[var(--border-primary)] shadow-none rounded max-w-2xl w-full p-8 relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 right-0 p-4">
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors">✕</button>
                </div>
                
                <h3 className="text-2xl font-extralight mb-1">{info.title}</h3>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-6">{info.role}</div>
                
                <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
                    {info.description}
                </p>

                <div className="bg-[var(--bg-tertiary)] rounded p-6 border border-[var(--border-secondary)]">
                    <h4 className="text-xs font-bold uppercase text-[var(--text-tertiary)] mb-4">Research & Generation Flow</h4>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {info.steps.map((step, i) => (
                            <React.Fragment key={i}>
                                <div className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold border ${i === info.steps.length - 1 ? 'bg-[var(--nxt-lime)] border-[var(--nxt-lime)] text-white' : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
                                    {step}
                                </div>
                                {i < info.steps.length - 1 && (
                                    <div className="text-[var(--text-tertiary)] flex-shrink-0">→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- LIVE RESEARCH BOARD COMPONENT ---
const LiveResearchBoard = ({
    ingestion, themes, personas, journeyMap, prd, roadmap, techArch, recommendations, structure,
    events, currentStatus,
    onEdit,
    isCollectingData, collectionPhase, liveSourceResults, liveRefinedQueries,
    knowledgeGraph,
    excludedSources, setExcludedSources,
    prioritySources, setPrioritySources,
}: {
    ingestion?: any, themes?: any, personas?: any, journeyMap?: any, prd?: any, roadmap?: any, techArch?: any, recommendations?: any, structure?: any,
    events: ThinkingEvent[], currentStatus: string,
    onEdit: (stage: AnalysisStage) => void,
    isCollectingData?: boolean, collectionPhase?: string, liveSourceResults?: any[], liveRefinedQueries?: Record<string, string>,
    knowledgeGraph?: KGType,
    excludedSources: Set<string>, setExcludedSources: React.Dispatch<React.SetStateAction<Set<string>>>,
    prioritySources: Set<string>, setPrioritySources: React.Dispatch<React.SetStateAction<Set<string>>>,
}) => {
    const streamEndRef = useRef<HTMLDivElement>(null);
    const [kgExpanded, setKgExpanded] = useState(false);
    const [reasoningOpen, setReasoningOpen] = useState(false);
    const [selectedSourceIdx, setSelectedSourceIdx] = useState<number | null>(null);

    useEffect(() => {
        streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [events]);

    return (
        <div className="w-full max-w-[90rem] mx-auto pb-24 animate-fade-in h-[85vh] relative">

            {/* Reasoning Stream flyout toggle button — fixed position */}
            <button
                onClick={() => setReasoningOpen(!reasoningOpen)}
                style={{
                    position: 'fixed', right: reasoningOpen ? 396 : 12, top: 80, zIndex: 60,
                    background: '#0D0D0D', color: reasoningOpen ? '#888' : '#B8B800',
                    border: '1px solid #333', padding: '6px 14px', fontSize: 9,
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 700,
                    letterSpacing: '2px', textTransform: 'uppercase' as const,
                    cursor: 'pointer', borderRadius: 2, transition: 'right 0.3s ease',
                }}
            >
                {reasoningOpen ? 'CLOSE' : isCollectingData ? 'SOURCES' : 'REASONING'}
                {!reasoningOpen && (isCollectingData || currentStatus.includes('...')) && (
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#B8B800', marginLeft: 6, animation: 'pulse 1.5s infinite' }} />
                )}
            </button>

            {/* Main content area — full width, scrollable */}
            <div className="w-full overflow-y-auto pr-2" style={{ height: '100%' }}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-px bg-[var(--border-primary)] flex-1"></div>
                    <span className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest">Research Assembly Board</span>
                    <div className="h-px bg-[var(--border-primary)] flex-1"></div>
                </div>

                {/* VISIBLE PROCESSING STATE */}
                {currentStatus.includes('...') && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-[var(--nxt-teal)] to-[var(--nxt-lime)] text-white p-6 rounded shadow-none mb-8 animate-pulse flex items-center gap-6"
                    >
                       <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
                       <div>
                           <div className="font-extralight text-xl tracking-tight uppercase">Processing Active</div>
                           <div className="text-white/80 font-mono text-sm">{currentStatus}</div>
                       </div>
                    </motion.div>
                )}

                {/* KNOWLEDGE GRAPH — DOMINANT ELEMENT, sits above the grid */}
                {knowledgeGraph && knowledgeGraph.nodes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`bg-[var(--card-bg)] border border-[var(--border-primary)] shadow-sm relative overflow-hidden transition-all duration-300 mb-6 ${
                            kgExpanded
                                ? 'fixed inset-0 z-50 rounded-none border-none m-0'
                                : 'rounded'
                        }`}
                        style={kgExpanded ? { marginLeft: '48px' } : {}}
                    >
                        {/* Expand/Collapse toggle */}
                        <button
                            onClick={() => setKgExpanded(!kgExpanded)}
                            style={{
                                position: 'absolute', top: kgExpanded ? '12px' : '8px', right: kgExpanded ? '16px' : '8px', zIndex: 30,
                                background: '#0D0D0D', color: '#B8B800', border: '1px solid #333',
                                padding: '4px 10px', fontSize: '10px', fontFamily: "'Bebas Neue',sans-serif",
                                letterSpacing: '2px', cursor: 'pointer', borderRadius: '2px',
                            }}
                        >
                            {kgExpanded ? 'COLLAPSE' : 'EXPAND'}
                        </button>
                        <ResearchKnowledgeGraph
                            graph={knowledgeGraph}
                            height={kgExpanded ? (typeof window !== 'undefined' ? window.innerHeight - 4 : 900) : 600}
                            excludedSources={excludedSources}
                            setExcludedSources={setExcludedSources}
                        />
                    </motion.div>
                )}

                {/* SOURCES BAR — compact, above the grid */}
                {liveSourceResults && liveSourceResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-4 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--nxt-teal)]">Intelligence Sources</h3>
                            <span className="text-sm font-extralight text-[var(--nxt-teal)]">{liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)} items</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {liveSourceResults.map((src: any, i: number) => (
                                <div key={i}
                                    onClick={() => { setSelectedSourceIdx(i); setReasoningOpen(true); }}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border cursor-pointer transition-all hover:border-[var(--nxt-teal)] ${
                                    selectedSourceIdx === i ? 'ring-2 ring-[var(--nxt-lime)] border-[var(--nxt-lime)]' :
                                    src.status === 'complete' ? 'bg-[var(--bg-secondary)] border-[var(--border-primary)]' :
                                    src.status === 'empty' ? 'bg-gray-50 border-gray-200 opacity-40' :
                                    'bg-red-50 border-red-200 opacity-40'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        src.status === 'complete' ? 'bg-[#0CCE6B]' : src.status === 'empty' ? 'bg-gray-300' : 'bg-[#FF5A5A]'
                                    }`}></div>
                                    <span className="font-bold truncate max-w-[120px]">{src.source?.replace(/ \(.*\)/, '')}</span>
                                    {src.items?.length > 0 && <span className="text-[var(--nxt-teal)] font-bold">{src.items.length}</span>}
                                    <span className={`text-[7px] font-bold uppercase ${
                                        src.credibilityTier === 1 ? 'text-[var(--nxt-teal)]' : src.credibilityTier === 2 ? 'text-[var(--nxt-orange)]' : 'text-gray-400'
                                    }`}>T{src.credibilityTier || '?'}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TILES GRID — secondary elements below the graph */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">

                    {/* INGESTION TILE */}
                    {ingestion && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Context</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Data Ingestion</div>
                                </div>
                                <span className="text-2xl font-bold text-green-500">{ingestion.confidenceScore}%</span>
                            </div>
                            <div className="space-y-3 mb-4">
                                <div className="text-xs text-[var(--text-secondary)] line-clamp-2">{ingestion.summary}</div>
                                <div className="flex flex-wrap gap-1">
                                    {ingestion.keyStakeholders?.slice(0, 3).map((s: string, i: number) => (
                                        <span key={i} className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-[10px] font-bold text-[var(--text-secondary)]">{s}</span>
                                    ))}
                                    {(ingestion.keyStakeholders?.length || 0) > 3 && <span className="px-2 py-1 text-[10px] text-[var(--text-tertiary)]">+{ingestion.keyStakeholders.length - 3}</span>}
                                </div>
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.INGESTION)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Review Context</button>
                        </motion.div>
                    )}

                    {/* THEMES TILE */}
                    {themes && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Themes</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Pattern Recognition</div>
                                </div>
                                <span className="text-xl font-bold text-[var(--nxt-lime)]">{themes.themes.length}</span>
                            </div>
                            <div className="space-y-2 mb-4">
                                {themes.themes.slice(0, 3).map((t: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'priority' ? 'bg-amber-500' : t.status === 'skipped' ? 'bg-gray-300' : 'bg-green-500'}`}></div>
                                        <span className={`font-medium ${t.status === 'skipped' ? 'line-through opacity-50' : ''}`}>{t.name}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.THEMES)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Themes</button>
                        </motion.div>
                    )}

                    {/* PERSONAS TILE */}
                    {personas && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Personas</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Archetype Synthesis</div>
                                </div>
                                <span className="text-xl font-bold text-indigo-500">{personas.personas.length}</span>
                            </div>
                            <div className="space-y-3 mb-4">
                                 {personas.personas.slice(0, 3).map((p: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{p.name[0]}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold truncate">{p.name}</div>
                                            <div className="text-[10px] text-[var(--text-tertiary)] truncate">{p.role}</div>
                                        </div>
                                    </div>
                                 ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.PERSONAS)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Refine Personas</button>
                        </motion.div>
                    )}

                    {/* JOURNEY MAP TILE */}
                    {journeyMap && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Blueprint</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Service Journey</div>
                                </div>
                                <span className="text-xl font-bold text-blue-500">{journeyMap.stages.length} Steps</span>
                            </div>
                            <div className="flex gap-1 mb-4 overflow-hidden h-8 items-center">
                                 {journeyMap.stages.map((s: any, i: number) => (
                                     <div key={i} className="flex-1 h-2 rounded-full bg-blue-200" title={s.phase}></div>
                                 ))}
                            </div>
                            <div className="space-y-1 mb-4">
                                {journeyMap.stages.slice(0, 2).map((s: any, i: number) => (
                                    <div key={i} className="text-[10px] bg-[var(--bg-tertiary)] px-2 py-1 rounded flex justify-between">
                                        <span className="font-bold">{s.phase}</span>
                                        <span className="text-[var(--text-tertiary)]">{s.emotion}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.JOURNEY_MAP)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Blueprint</button>
                        </motion.div>
                    )}
                    
                    {/* PRD TILE */}
                    {prd && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">PRD</h3>
                                    <div className="text-xs text-[var(--text-tertiary)] truncate">{prd.prd.title}</div>
                                </div>
                                <span className="text-xl font-bold text-purple-500">{prd.prd.features.length} Feat.</span>
                            </div>
                            <div className="flex gap-2 mb-4">
                                 <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">Must: {prd.prd.features.filter((f:any)=>f.priority==='Must-have').length}</div>
                                 <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold">Should: {prd.prd.features.filter((f:any)=>f.priority==='Should-have').length}</div>
                            </div>
                            <div className="text-[10px] text-[var(--text-tertiary)] mb-4 line-clamp-2">
                                Success: {prd.prd.successMetrics?.join(', ')}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.PRD)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Requirements</button>
                        </motion.div>
                    )}

                    {/* ROADMAP TILE */}
                    {roadmap && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Roadmap</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Strategic Timeline</div>
                                </div>
                                <span className="text-xl font-bold text-teal-500">{roadmap.roadmap.items.length} Items</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                 <div className="bg-green-100 p-1 rounded"><div className="text-[10px] font-bold text-green-700">NOW</div><div className="text-sm font-bold">{roadmap.roadmap.items.filter((i:any)=>i.horizon==='Now').length}</div></div>
                                 <div className="bg-blue-100 p-1 rounded"><div className="text-[10px] font-bold text-blue-700">NEXT</div><div className="text-sm font-bold">{roadmap.roadmap.items.filter((i:any)=>i.horizon==='Next').length}</div></div>
                                 <div className="bg-gray-100 p-1 rounded"><div className="text-[10px] font-bold text-gray-700">LATER</div><div className="text-sm font-bold">{roadmap.roadmap.items.filter((i:any)=>i.horizon==='Later').length}</div></div>
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.ROADMAP)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Roadmap</button>
                        </motion.div>
                    )}

                     {/* TECH ARCH TILE */}
                     {techArch && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Architecture</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">System Design</div>
                                </div>
                                <span className="text-xl font-bold text-slate-500">{techArch.architecture.nodes.length} Nodes</span>
                            </div>
                             <div className="flex flex-wrap gap-2 mb-4">
                                {techArch.architecture.nodes.slice(0,4).map((n:any, i:number) => (
                                    <span key={i} className={`text-[10px] px-2 py-1 rounded border ${n.type==='User'?'bg-blue-50 border-blue-200':n.type==='Database'?'bg-amber-50 border-amber-200':'bg-gray-50 border-gray-200'}`}>{n.label}</span>
                                ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.TECH_ARCH)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Architecture</button>
                        </motion.div>
                    )}

                    {/* RECS TILE */}
                    {recommendations && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Strategy</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Opportunities</div>
                                </div>
                                <span className="text-xl font-bold text-orange-500">{recommendations.recommendations.length}</span>
                            </div>
                             <div className="space-y-2 mb-4">
                                {recommendations.recommendations.slice(0,3).map((r:any, i:number) => (
                                    <div key={i} className="text-xs truncate font-medium">• {r.title}</div>
                                ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.RECOMMENDATIONS)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Refine Strategy</button>
                        </motion.div>
                    )}

                    {/* STRUCTURE TILE */}
                    {structure && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 shadow-sm group hover:border-[var(--nxt-teal)] transition-colors">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-secondary)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Narrative Arc</h3>
                                    <div className="text-xs text-[var(--text-tertiary)]">Story Structure</div>
                                </div>
                                <span className="text-xl font-bold text-[var(--text-primary)]">{structure.slides.length} Parts</span>
                            </div>
                            <div className="space-y-1 mb-4">
                                 {structure.slides.slice(0, 3).map((s: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs p-1 bg-[var(--bg-tertiary)] rounded">
                                        <span className="truncate w-3/4">{s.title}</span>
                                        <span className="text-[10px] text-[var(--text-tertiary)]">{s.layout.substring(0,4)}</span>
                                    </div>
                                 ))}
                            </div>
                            <button onClick={() => onEdit(AnalysisStage.DECK_STRUCTURE)} className="w-full py-2 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] transition-colors">Edit Outline</button>
                        </motion.div>
                    )}

                </div>
            </div>

            {/* UNIFIED FLYOUT PANEL — ONLY opens via toggle button. Never auto-opens. */}
            {reasoningOpen && (
            <div style={{
                position: 'fixed', right: 0, top: 60, bottom: 0,
                width: 384, zIndex: 55,
                background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-primary)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '-8px 0 24px rgba(0,0,0,0.1)',
            }}>
                {/* Priority 1: Source detail view — when a source pill is clicked (works during AND after collection) */}
                {selectedSourceIdx !== null && liveSourceResults[selectedSourceIdx] ? (() => {
                    const src = liveSourceResults[selectedSourceIdx];
                    const isSourceExcluded = excludedSources.has(src.sourceId);
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', background: '#0D0D0D', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#B8B800' }}>SOURCE DETAIL</div>
                                    <div style={{ fontFamily: "'Helvetica Neue',sans-serif", fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>{src.source?.replace(/ \(.*\)/, '')}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={() => setExcludedSources(prev => { const next = new Set(prev); if (next.has(src.sourceId)) next.delete(src.sourceId); else next.add(src.sourceId); return next; })}
                                        style={{
                                            padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                            background: isSourceExcluded ? '#444' : '#115054', color: isSourceExcluded ? '#999' : '#fff',
                                        }}
                                    >{isSourceExcluded ? 'Excluded — Click to Include' : 'Included in Report'}</button>
                                    <button onClick={() => setSelectedSourceIdx(null)} style={{ color: '#888', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }} title="Back to feed">&#x2715;</button>
                                </div>
                            </div>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 16 }}>
                                <div><span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>STATUS</span><div style={{ fontSize: 12, fontWeight: 600, color: src.status === 'complete' ? '#0CCE6B' : src.status === 'empty' ? '#888' : '#FF5A5A' }}>{src.status}</div></div>
                                <div><span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>ITEMS</span><div style={{ fontSize: 12, fontWeight: 600 }}>{src.items?.length || 0}</div></div>
                                <div><span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>TIER</span><div style={{ fontSize: 12, fontWeight: 600 }}>T{src.credibilityTier || '?'}</div></div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                                {(src.items || []).map((item: any, j: number) => {
                                    const articleKey = `${src.sourceId}::${j}`;
                                    const isArticleExcluded = excludedSources.has(articleKey);
                                    return (
                                    <div key={j} style={{
                                        padding: '8px 16px', borderBottom: '1px solid var(--border-secondary)',
                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                        opacity: isArticleExcluded ? 0.35 : 1, transition: 'opacity 0.15s',
                                    }}>
                                        {/* Include/Exclude toggle */}
                                        <button
                                            onClick={() => setExcludedSources(prev => {
                                                const next = new Set(prev);
                                                if (next.has(articleKey)) next.delete(articleKey); else next.add(articleKey);
                                                return next;
                                            })}
                                            style={{
                                                width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${isArticleExcluded ? '#ccc' : '#115054'}`,
                                                background: isArticleExcluded ? '#fff' : '#115054', color: isArticleExcluded ? '#ccc' : '#fff',
                                                fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginTop: 1,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                            }}
                                            title={isArticleExcluded ? 'Include this article in report' : 'Exclude this article from report'}
                                        >{isArticleExcluded ? '' : '\u2713'}</button>
                                        {/* Priority citation flag */}
                                        <button
                                            onClick={() => setPrioritySources(prev => {
                                                const next = new Set(prev);
                                                if (next.has(articleKey)) next.delete(articleKey); else next.add(articleKey);
                                                return next;
                                            })}
                                            style={{
                                                width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${prioritySources.has(articleKey) ? '#B8860B' : '#555'}`,
                                                background: prioritySources.has(articleKey) ? '#B8860B' : 'transparent', color: prioritySources.has(articleKey) ? '#fff' : '#555',
                                                fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginTop: 1,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                            }}
                                            title={prioritySources.has(articleKey) ? 'Remove priority flag' : 'Flag as priority citation for prominent placement'}
                                        >{prioritySources.has(articleKey) ? '\u2605' : '\u2606'}</button>
                                        {/* Article content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: "'Helvetica Neue',sans-serif", fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                                                color: isArticleExcluded ? '#aaa' : '#1A1A1A',
                                                textDecoration: isArticleExcluded ? 'line-through' : 'none',
                                            }}>{item.title}</div>
                                            {item.date && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.date}</div>}
                                            {item.content && <div style={{ fontSize: 10, color: '#666', marginTop: 4, lineHeight: 1.4, maxHeight: 40, overflow: 'hidden' }}>{item.content.substring(0, 150)}</div>}
                                            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#115054', textDecoration: 'underline', display: 'inline-block', marginTop: 3 }}>View Source</a>}
                                        </div>
                                    </div>
                                    );
                                })}
                                {(!src.items || src.items.length === 0) && (
                                    <div style={{ padding: '20px 16px', textAlign: 'center', color: '#888', fontSize: 12 }}>No items collected from this source</div>
                                )}
                            </div>
                        </div>
                    );
                })() :
                /* Priority 2: Live Source Feed during data collection (no specific source selected) */
                isCollectingData ? (
                    <LiveSourceFeed
                        sources={liveSourceResults}
                        refinedQueries={liveRefinedQueries}
                        totalCollected={liveSourceResults.reduce((s, r) => s + (r.items?.length || 0), 0)}
                        totalSources={liveSourceResults.length}
                        successfulSources={liveSourceResults.filter(r => r.status === 'complete').length}
                        isCollecting={isCollectingData}
                        phase={collectionPhase}
                    />
                ) : (
                <>
                {/* Priority 3: Standard Reasoning Stream */}
                <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentStatus.includes('...') ? 'bg-[var(--nxt-lime)] animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Reasoning Stream</span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">{currentStatus || "System Ready"}</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 16px', background: '#0D0D0D', borderBottom: '1px solid #222', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                    <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#B8B800', marginRight: 4 }}>BRAIN</span>
                    <span style={{ fontSize: 9, color: '#555' }}>48 wiki pages</span>
                    <span style={{ fontSize: 9, color: '#555' }}>{liveSourceResults?.length || 0} sources</span>
                    {knowledgeGraph.nodes.length > 0 && <span style={{ fontSize: 9, color: '#00B7C3' }}>{knowledgeGraph.nodes.length} graph nodes</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                    <AnimatePresence>
                        {events.map((event, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded border-l-2 ${
                                    event.type === 'PHASE' ? 'border-[var(--nxt-teal)] bg-[var(--nxt-teal)]/5' :
                                    event.type === 'INSIGHT' ? 'border-[var(--nxt-lime)] bg-[var(--bg-tertiary)]' :
                                    event.type === 'CORRECTION' ? 'border-amber-500 bg-amber-50' :
                                    event.type === 'INTERVENTION' ? 'border-blue-500 bg-blue-50 text-blue-900' :
                                    event.type === 'RECALLING' ? 'border-violet-500 bg-violet-50' :
                                    event.type === 'LEARNING' ? 'border-emerald-500 bg-emerald-50' :
                                    event.type === 'IMPROVING' ? 'border-sky-500 bg-sky-50' :
                                    event.type === 'CORRECTING' ? 'border-orange-500 bg-orange-50' :
                                    event.type === 'DETECTING' ? 'border-rose-400 bg-rose-50' :
                                    'border-gray-300'
                                }`}
                            >
                                <span className={`font-bold opacity-70 text-[10px] block mb-1 uppercase ${event.type === 'INTERVENTION' ? 'text-blue-600' : ''}`}>
                                    {event.type}
                                </span>
                                {event.content}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={streamEndRef} className="h-4"></div>
                </div>
                </>
                )}
            </div>
            )}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [files, setFiles] = useState<FileType[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [activeStage, setActiveStage] = useState<AnalysisStage>(AnalysisStage.IDLE);
    const [showMethodology, setShowMethodology] = useState<OutputOption | null>(null);
    const [selectedOutputs, setSelectedOutputs] = useState<OutputOption[]>(['PERSONAS', 'STRATEGY_DECK']);
    const [researchGoal, setResearchGoal] = useState("Identify emerging needs in the remote work sector.");
    const [analysisApproach, setAnalysisApproach] = useState("Standard Ethnographic Analysis");
    const [streamingLog, setStreamingLog] = useState<string[]>([]);
    const [thinkingEvents, setThinkingEvents] = useState<ThinkingEvent[]>([]);
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    // State for Analysis Results (Intermediate & Final)
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [ingestionResult, setIngestionResult] = useState<any>(null);
    const [themesResult, setThemesResult] = useState<any>(null);
    const [personasResult, setPersonasResult] = useState<any>(null);
    const [structureResult, setStructureResult] = useState<any>(null);
    const [narrativeResult, setNarrativeResult] = useState<any>(null);
    const [journeyResult, setJourneyResult] = useState<any>(null);
    const [techResult, setTechResult] = useState<any>(null);
    const [prdResult, setPrdResult] = useState<any>(null);
    const [roadmapResult, setRoadmapResult] = useState<any>(null);
    const [recsResult, setRecsResult] = useState<any>(null);
    const [gapResult, setGapResult] = useState<any>(null);
    const [techAuditResult, setTechAuditResult] = useState<any>(null);
    const [competitiveResult, setCompetitiveResult] = useState<any>(null);
    const [synthesisResult, setSynthesisResult] = useState<any>(null);
    const [strategicReportResult, setStrategicReportResult] = useState<any>(null);
    const [selectedLens, setSelectedLens] = useState<AnalyticalLens>('general_cx');
    const [lensAutoDetected, setLensAutoDetected] = useState(false);
    const selectedVisStyle = DEFAULT_STYLE_ID;
    const selectedMethod = 'general_synthesis';

    // --- DATA SOURCING STATE ---
    const [enableDeepResearch, setEnableDeepResearch] = useState(false);
    const [deepResearchMode, setDeepResearchMode] = useState<'quick' | 'focused' | 'deep'>('focused');
    const [enableNews, setEnableNews] = useState(false);
    const [enableAcademic, setEnableAcademic] = useState(false);
    const [enableEconomic, setEnableEconomic] = useState(false);
    const [enableSocialTrends, setEnableSocialTrends] = useState(false);
    const [enableYouTube, setEnableYouTube] = useState(false);
    const [enableHigherEdNews, setEnableHigherEdNews] = useState(false);
    const [enableEducationData, setEnableEducationData] = useState(false);
    const [enableGovernment, setEnableGovernment] = useState(false);
    const [enableOpenData, setEnableOpenData] = useState(false);
    const [enableAINews, setEnableAINews] = useState(false);
    const [enableAIResearch, setEnableAIResearch] = useState(false);
    const [enableCxMesh, setEnableCxMesh] = useState(false);
    const [subredditTargets, setSubredditTargets] = useState('');
    const [trustpilotTargets, setTrustpilotTargets] = useState('');
    const [webUrls, setWebUrls] = useState('');
    const [videoUrls, setVideoUrls] = useState('');
    const [isCollectingData, setIsCollectingData] = useState(false);
    const [dataSourceStatus, setDataSourceStatus] = useState<string>('');
    const [collectionPhase, setCollectionPhase] = useState<string>('');
    const [liveSourceResults, setLiveSourceResults] = useState<any[]>([]);
    const [excludedSources, setExcludedSources] = useState<Set<string>>(new Set());
    const [prioritySources, setPrioritySources] = useState<Set<string>>(new Set());
    const [liveRefinedQueries, setLiveRefinedQueries] = useState<Record<string, string>>({});
    const [knowledgeGraph, setKnowledgeGraph] = useState<KGType>({ nodes: [], edges: [] });
    const kgBuiltRef = useRef<{ sources: boolean; themes: boolean; personas: boolean; recs: boolean; journey: boolean; prd: boolean; roadmap: boolean; gaps: boolean }>({ sources: false, themes: false, personas: false, recs: false, journey: false, prd: false, roadmap: false, gaps: false });
    const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);

    const hasDataSources = enableDeepResearch || enableNews || enableAcademic || enableEconomic || enableSocialTrends || enableYouTube || enableCxMesh || enableHigherEdNews || enableEducationData || enableGovernment || enableOpenData || enableAINews || enableAIResearch || webUrls.trim().length > 0 || videoUrls.trim().length > 0;

    const sessionRef = useRef<GenAISession | null>(null);
    const corpusTextRef = useRef<string>('');

    // Build initial knowledge graph when data collection completes
    // B8: Rebuild knowledge graph from scratch when ANY data changes.
    // Includes all deliverable types (B7): themes, personas, recs, journey, PRD, roadmap, gaps.
    // Incremental graph building — only rebuilds what changed, preserving prior state
    useEffect(() => {
        if (collectionPhase !== 'complete' || liveSourceResults.length === 0) return;
        const built = kgBuiltRef.current;

        // Source graph: rebuild if sources changed (only happens once after collection)
        if (!built.sources) {
            const graph = buildSourceGraph(liveSourceResults);
            built.sources = true;
            // Reset downstream flags since source graph changed
            built.themes = false; built.personas = false; built.recs = false;
            built.journey = false; built.prd = false; built.roadmap = false; built.gaps = false;
            setKnowledgeGraph(graph);
            return; // Let next effect cycle pick up themes etc.
        }

        // Incrementally add deliverables that haven't been added yet
        let graph = { ...knowledgeGraph, nodes: [...knowledgeGraph.nodes], edges: [...knowledgeGraph.edges] };
        let changed = false;

        if (themesResult?.themes && !built.themes) {
            graph = addThemesToGraph(graph, themesResult.themes);
            built.themes = true; changed = true;
        }
        if (personasResult?.personas && !built.personas) {
            graph = addPersonasToGraph(graph, personasResult.personas);
            built.personas = true; changed = true;
        }
        if (recsResult?.recommendations && !built.recs) {
            graph = addRecommendationsToGraph(graph, recsResult.recommendations);
            built.recs = true; changed = true;
        }
        if (journeyResult?.stages && !built.journey) {
            graph = addJourneyStagesToGraph(graph, journeyResult.stages);
            built.journey = true; changed = true;
        }
        if (prdResult?.features && !built.prd) {
            graph = addPRDFeaturesToGraph(graph, prdResult.features);
            built.prd = true; changed = true;
        }
        if (roadmapResult?.items && !built.roadmap) {
            graph = addRoadmapToGraph(graph, roadmapResult.items);
            built.roadmap = true; changed = true;
        }
        if ((gapResult as any)?.analysis?.gaps && !built.gaps) {
            graph = addGapAnalysisToGraph(graph, (gapResult as any).analysis.gaps);
            built.gaps = true; changed = true;
        }

        if (changed) setKnowledgeGraph(graph);
    }, [collectionPhase, liveSourceResults, themesResult, personasResult, recsResult, journeyResult, prdResult, roadmapResult, gapResult]);

    // --- HEURISTIC MODE STATE ---
    type AppMode = 'research' | 'heuristic';
    const [appMode, setAppMode] = useState<AppMode>('research');
    const [heuristicReport, setHeuristicReport] = useState<HeuristicReport | null>(null);
    const [heuristicScreenshots, setHeuristicScreenshots] = useState<string[]>([]);
    const [isHeuristicAnalyzing, setIsHeuristicAnalyzing] = useState(false);

    const handleHeuristicSubmit = async (brief: UXBrief, screenshots: { base64: string; mimeType: string; dataUri: string }[]) => {
        setIsHeuristicAnalyzing(true);
        setAppState(AppState.ANALYZING);
        setHeuristicScreenshots(screenshots.map(s => s.dataUri));
        try {
            const report = await runHeuristicAnalysis(
                brief,
                screenshots.map(s => ({ base64: s.base64, mimeType: s.mimeType })),
                DEFAULT_MODELS as ModelPreferences
            );
            setHeuristicReport(report);
            setAppState(AppState.SUCCESS);
        } catch (e: any) {
            console.error('Heuristic analysis failed:', e);
            setNotification(`Analysis failed: ${e.message || 'Unknown error'}`);
            setAppState(AppState.IDLE);
        } finally {
            setIsHeuristicAnalyzing(false);
        }
    };

    const resetHeuristic = () => {
        setHeuristicReport(null);
        setHeuristicScreenshots([]);
        setAppState(AppState.IDLE);
    };

    useEffect(() => {
        const saved = localStorage.getItem('nxt_saved_projects');
        if (saved) {
            try {
                setSavedProjects(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load saved projects", e);
            }
        }
        // P6-06: Load wiki constraints for cross-session compounding
        import('./services/promptImprovementEngine').then(engine => {
            engine.loadWikiConstraints().then(count => {
                if (count > 0) console.log(`[Startup] Loaded ${count} wiki constraints for cross-session compounding`);
            });
        }).catch(() => {}); // non-blocking
    }, []);

    const handleStreamUpdate = (text: string) => {
        // Parse the text for specific tags [PHASE], [INSIGHT], [CORRECTION]
        const regex = /\[(PHASE|INSIGHT|CORRECTION|QUESTION|HYPOTHESIS)\] (.*?)(?=\[|$)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const type = match[1];
            const content = match[2].trim();
            // Check if this specific event content is already logged to avoid duplicates in the UI
            setThinkingEvents(prev => {
                const exists = prev.some(e => e.type === type && e.content === content);
                if (!exists) return [...prev, { type, content }];
                return prev;
            });
        }
    };

    const handleSaveProject = (updatedData?: AnalysisResult) => {
        // Use updatedData if provided (from child components edits), otherwise fallback to current result
        const dataToSave = updatedData || result;
        if (!dataToSave) return;
        
        const newProject: SavedProject = {
            id: Date.now().toString(),
            name: researchGoal || "Untitled Project",
            createdAt: Date.now(),
            goal: researchGoal,
            approach: analysisApproach,
            selectedOutputs: selectedOutputs,
            result: dataToSave,
            ingestion: ingestionResult,
            themes: themesResult,
            personas: personasResult,
            journeyMap: journeyResult,
            techArch: techResult,
            prd: prdResult,
            roadmap: roadmapResult,
            recommendations: recsResult,
            synthesis: synthesisResult,
            structure: structureResult,
            narrative: narrativeResult
        };

        const saveToStorage = (projects: SavedProject[]) => {
            localStorage.setItem('nxt_saved_projects', JSON.stringify(projects));
            setSavedProjects(projects);
        };
        
        try {
            // Attempt standard save
            saveToStorage([newProject, ...savedProjects]);
            setNotification("Project saved successfully");
            setTimeout(() => setNotification(null), 3000);
        } catch (e: any) {
            // Handle Quota Exceeded
            if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
                console.warn("Storage quota exceeded. Attempting to free space...");
                
                let currentList = [...savedProjects];
                let saved = false;

                // 1. Try removing oldest projects
                while (currentList.length > 0 && !saved) {
                    currentList.pop(); // Remove oldest
                    try {
                        saveToStorage([newProject, ...currentList]);
                        saved = true;
                        setNotification("Saved (oldest projects removed for space)");
                    } catch (evictError) {
                        // Continue loop
                    }
                }

                // 2. If still failing, strip images from the new project and save it alone/with remaining
                if (!saved) {
                    try {
                        const strippedProject = stripImages(newProject);
                        // Try saving with the stripped project
                        saveToStorage([strippedProject, ...currentList]);
                        setNotification("Saved (images removed due to space)");
                    } catch (stripError) {
                        console.error("Critical save failure", stripError);
                        setNotification("Failed to save. Storage limit exceeded.");
                    }
                }
                setTimeout(() => setNotification(null), 3000);
            } else {
                console.error("Save failed", e);
                setNotification("Failed to save project.");
                setTimeout(() => setNotification(null), 3000);
            }
        }
    };

    const handleReset = () => {
        setAppState(AppState.IDLE);
        setFiles([]);
        setResearchGoal("");
        setAnalysisApproach("Standard Ethnographic Analysis");
        setSelectedOutputs(['PERSONAS', 'STRATEGY_DECK']);
        setSelectedLens('general_cx');
        setLensAutoDetected(false);
        setThinkingEvents([]);
        setResult(null);
        setIngestionResult(null);
        setThemesResult(null);
        setPersonasResult(null);
        setJourneyResult(null);
        setTechResult(null);
        setPrdResult(null);
        setRoadmapResult(null);
        setRecsResult(null);
        setGapResult(null);
        setTechAuditResult(null);
        setCompetitiveResult(null);
        setSynthesisResult(null);
        setStrategicReportResult(null);
        setStructureResult(null);
        setNarrativeResult(null);
        setExcludedSources(new Set());
        sessionRef.current = null;
    };

    const loadProject = async (project: SavedProject) => {
        // Hydrate State
        setResearchGoal(project.goal);
        setAnalysisApproach(project.approach);
        setSelectedOutputs(project.selectedOutputs);
        
        setIngestionResult(project.ingestion);
        setThemesResult(project.themes);
        setPersonasResult(project.personas);
        setJourneyResult(project.journeyMap);
        setTechResult(project.techArch);
        setPrdResult(project.prd);
        setRoadmapResult(project.roadmap);
        setRecsResult(project.recommendations);
        setSynthesisResult(project.synthesis);
        setStructureResult(project.structure);
        setNarrativeResult(project.narrative);
        setResult(project.result);

        // Try to Re-ignite the session for potential edits (if key is available)
        if (process.env.API_KEY) { 
             sessionRef.current = new GenAISession(project.goal, project.approach, project.selectedOutputs);
             // We don't await this to keep UI snappy, but we trigger the context injection
             sessionRef.current.restore(project.ingestion, project.themes, project.personas, project.structure);
        }

        setAppState(AppState.SUCCESS);
    };

    const deleteProject = (id: string) => {
        const updated = savedProjects.filter(p => p.id !== id);
        setSavedProjects(updated);
        localStorage.setItem('nxt_saved_projects', JSON.stringify(updated));
    };

    // P5-01 + P6-05: Run anti-pattern detection and quality scoring after generation
    const auditGeneratedOutput = async (text: string, deliverableType: string) => {
        try {
            const { detectOutputAntiPatterns } = await import('./services/slidePostProcessor');
            const { slopScore, violations } = detectOutputAntiPatterns(text, deliverableType);
            if (violations.length > 0) {
                console.log(`[QualityAudit] ${deliverableType}: slop score ${slopScore}/100, ${violations.length} violations:`, violations.map(v => v.phrase).join(', '));
                setThinkingEvents(prev => [...prev, { type: 'CORRECTION', content: `[QUALITY] ${deliverableType}: ${violations.length} anti-pattern violations detected (slop score: ${slopScore}/100)` }]);
            }
            // P6-05: Persist quality score to wiki
            const { persistQualityScore } = await import('./services/wikiService');
            const { getActiveConstraints } = await import('./services/promptImprovementEngine');
            const constraints = getActiveConstraints();
            const constraintList = constraints ? constraints.split('\n').filter(l => l.startsWith('- ')).map(l => l.substring(2)) : [];
            await persistQualityScore(deliverableType, 100 - slopScore, constraintList, new Date().toISOString().split('T')[0]);
        } catch (e) { /* non-blocking */ }
    };

    const advanceToNextStage = async () => {
        if (!sessionRef.current) return;
        
        // 1. PERSONAS
        if (selectedOutputs.includes('PERSONAS') && !personasResult) {
            setStatusMessage("Synthesizing Personas...");
            const personas = await sessionRef.current.generatePersonas(themesResult, undefined, handleStreamUpdate, setStatusMessage);
            setPersonasResult(personas);
            // P5-01 + P6-05: Audit quality
            const personaText = (personas.personas || []).map((p: any) => `${p.name} ${p.bio} ${p.quote}`).join(' ');
            auditGeneratedOutput(personaText, 'personas');
            setStatusMessage("Personas Generated");
            setActiveStage(AnalysisStage.PERSONAS);
            return;
        }

        // 2. JOURNEY MAP
        if (selectedOutputs.includes('JOURNEY_MAP') && !journeyResult) {
             setStatusMessage("Mapping Journey...");
             const journey = await sessionRef.current.generateJourneyMap(undefined, handleStreamUpdate);
             setJourneyResult(journey);
             const journeyText = (journey.stages || []).map((s: any) => `${s.phase} ${s.painPoint} ${s.customerAction}`).join(' ');
             auditGeneratedOutput(journeyText, 'journey_map');
             setStatusMessage("Blueprint Drafted");
             setActiveStage(AnalysisStage.JOURNEY_MAP);
             return;
        }

        // 3. TECH ARCH
        if (selectedOutputs.includes('TECH_ARCH') && !techResult) {
             setStatusMessage("Architecting System...");
             const tech = await sessionRef.current.generateTechArchitecture(undefined, handleStreamUpdate);
             setTechResult(tech);
             const techText = (tech.architecture?.overview || '') + ' ' + (tech.architecture?.nodes || []).map((n: any) => n.name).join(' ');
             auditGeneratedOutput(techText, 'tech_architecture');
             setStatusMessage("Architecture Drafted");
             setActiveStage(AnalysisStage.TECH_ARCH);
             return;
        }

        // 4. PRD
        if ((selectedOutputs.includes('PRD') || selectedOutputs.includes('ROADMAP')) && !prdResult) {
             setStatusMessage("Defining Requirements...");
             const prd = await sessionRef.current.generatePRD(undefined, handleStreamUpdate);
             setPrdResult(prd);
             const prdText = (prd.features || []).map((f: any) => `${f.name} ${f.description}`).join(' ');
             auditGeneratedOutput(prdText, 'prd');
             setStatusMessage("PRD Drafted");
             setActiveStage(AnalysisStage.PRD);
             return;
        }

        // 5. ROADMAP
        if (selectedOutputs.includes('ROADMAP') && !roadmapResult) {
             setStatusMessage("Planning Roadmap...");
             const roadmap = await sessionRef.current.generateRoadmap(undefined, handleStreamUpdate);
             setRoadmapResult(roadmap);
             const roadmapText = (roadmap.items || []).map((i: any) => `${i.initiative} ${i.description}`).join(' ');
             auditGeneratedOutput(roadmapText, 'roadmap');
             setStatusMessage("Roadmap Drafted");
             setActiveStage(AnalysisStage.ROADMAP);
             return;
        }

        // 6. RECOMMENDATIONS
        if (selectedOutputs.includes('STRATEGIC_RECS') && !recsResult) {
             setStatusMessage("Formulating Strategy...");
             const recs = await sessionRef.current.generateRecommendations(undefined, handleStreamUpdate);
             setRecsResult(recs);
             // P5-01 + P6-05: Audit quality
             const recText = (recs.recommendations || []).map((r: any) => `${r.title} ${r.description}`).join(' ');
             auditGeneratedOutput(recText, 'recommendations');
             setStatusMessage("Strategy Drafted");
             setActiveStage(AnalysisStage.RECOMMENDATIONS);
             return;
        }

        // 6a. GAP ANALYSIS
        if (selectedOutputs.includes('GAP_ANALYSIS') && !gapResult) {
             setStatusMessage("Analyzing Gaps...");
             const gap = await sessionRef.current.generateGapAnalysis(undefined, handleStreamUpdate);
             setGapResult(gap);
             const gapText = ((gap as any).analysis?.gaps || []).map((g: any) => `${g.capability} ${g.impact}`).join(' ');
             auditGeneratedOutput(gapText, 'gap_analysis');
             setStatusMessage("Gap Analysis Complete");
             setActiveStage(AnalysisStage.GAP_ANALYSIS);
             return;
        }

        // 6b. TECH AUDIT
        if (selectedOutputs.includes('TECH_AUDIT') && !techAuditResult) {
             setStatusMessage("Auditing Technology Ecosystem...");
             const audit = await sessionRef.current.generateTechAudit(undefined, handleStreamUpdate);
             setTechAuditResult(audit);
             const auditText = ((audit as any).systemsInventory || []).map((s: any) => `${s.name} ${s.vendor}`).join(' ');
             auditGeneratedOutput(auditText, 'tech_audit');
             setStatusMessage("Tech Audit Complete");
             setActiveStage(AnalysisStage.TECH_AUDIT_STAGE);
             return;
        }

        // 6c. COMPETITIVE ANALYSIS
        if (selectedOutputs.includes('COMPETITIVE_ANALYSIS') && !competitiveResult) {
             setStatusMessage("Analyzing Competition...");
             const comp = await sessionRef.current.generateCompetitiveAnalysis(undefined, handleStreamUpdate);
             setCompetitiveResult(comp);
             const compText = ((comp as any).analysis?.industryContext || '') + ' ' + ((comp as any).analysis?.peers || []).map((p: any) => p.name).join(' ');
             auditGeneratedOutput(compText, 'competitive_analysis');
             setStatusMessage("Competitive Analysis Complete");
             setActiveStage(AnalysisStage.COMPETITIVE_ANALYSIS);
             return;
        }

        // 6d. CROSS-CUTTING SYNTHESIS (only when both PERSONAS and STRATEGIC_RECS are selected)
        if (selectedOutputs.includes('PERSONAS') && selectedOutputs.includes('STRATEGIC_RECS') && !synthesisResult && personasResult && recsResult) {
             setStatusMessage("Synthesizing Cross-Cutting Insights...");
             const synthesis = await sessionRef.current.generateCrossCuttingSynthesis(
                 themesResult?.themes || [],
                 personasResult?.personas || [],
                 recsResult?.recommendations || [],
                 undefined,
                 handleStreamUpdate
             );
             setSynthesisResult(synthesis);
             setStatusMessage("Cross-Cutting Synthesis Complete");
             // No dedicated stage -- continue to next step automatically
        }

        // Build deck context from ALL available deliverables (read-only — never mutates originals)
        const deckContext = {
            themes: themesResult?.themes,
            personas: personasResult?.personas,
            recommendations: recsResult?.recommendations,
            journeyStages: journeyResult?.stages,
            prd: prdResult as any,
            roadmap: roadmapResult as any,
            techArchitecture: techResult?.architecture,
            gapAnalysis: (gapResult as any)?.analysis,
            techAudit: (techAuditResult as any)?.audit,
            competitiveAnalysis: (competitiveResult as any)?.analysis,
            strategicReport: strategicReportResult?.report,
        };

        // 6e. STRATEGIC REPORT — synthesizes all deliverables into unrestricted whitepaper
        // CRITICAL: Filter raw sources by user's inclusion/exclusion curation decisions.
        // Only INCLUDED sources should appear in the evidence catalog — this is the core
        // "Humans in Control" principle: the user controls the evidence base.
        if (selectedOutputs.includes('STRATEGY_DECK') && !strategicReportResult) {
             setStatusMessage("Writing Strategic Report (synthesizing all deliverables)...");
             const curatedSources = liveSourceResults.map(src => {
                 if (!excludedSources.size && !prioritySources.size) return src;
                 const filteredItems = (src.items || []).map((item: any, j: number) => ({
                     ...item,
                     _origIdx: j,
                     priority: prioritySources.has(`${src.sourceId}::${j}`)
                 })).filter((item: any) =>
                     !excludedSources.has(`${src.sourceId}::${item._origIdx}`)
                 );
                 return { ...src, items: filteredItems };
             }).filter(src => src.items && src.items.length > 0);
             const report = await sessionRef.current.generateStrategicReport(deckContext, undefined, handleStreamUpdate, curatedSources);
             setStrategicReportResult(report);
             setResult((prev: any) => ({ ...prev, strategicReport: report?.report }));
             setStatusMessage("Strategic Report Drafted");
             setActiveStage(AnalysisStage.STRATEGIC_REPORT);
             return;
        }

        // 7. DECK STRUCTURE — receives ALL deliverable data + strategic report
        if (selectedOutputs.includes('STRATEGY_DECK') && !structureResult) {
             setStatusMessage("Structuring Narrative (from all deliverables)...");
             const structure = await sessionRef.current.generateDeckStructure(undefined, deckContext, handleStreamUpdate);
             setStructureResult(structure);
             setStatusMessage("Outline Created");
             setActiveStage(AnalysisStage.DECK_STRUCTURE);
             return;
        }

        // 8. NARRATIVE — receives ALL deliverable data + pre-delivery quality audit
        if (selectedOutputs.includes('STRATEGY_DECK') && !narrativeResult) {
             setStatusMessage("Writing Narrative (integrating all deliverables)...");
             const narrative = await sessionRef.current.generateNarrative(structureResult, deckContext, undefined, handleStreamUpdate);

             // D4: Pre-delivery quality audit — detect and auto-correct slop BEFORE checkpoint
             try {
                 const { detectBannedPhrases } = await import('./services/wikiService');
                 const { narrateSlopDetection } = await import('./services/wikiNarrator');
                 const allSlideText = (narrative.slides || []).map(s => [s.title, ...(s.content || []), s.narrative || '', s.speakerNotes || '', s.quote || ''].join(' ')).join(' ');
                 const slopViolations = detectBannedPhrases(allSlideText);
                 if (slopViolations.length > 0) {
                     const slopEvents = narrateSlopDetection(slopViolations);
                     slopEvents.forEach(e => setThinkingEvents(prev => [...prev, e]));
                     console.log(`[NarrativeAudit] Detected ${slopViolations.length} slop violations before checkpoint`);
                 }
             } catch (e) { /* non-blocking */ }

             setNarrativeResult(narrative);
             setStatusMessage("Content Written");
             setActiveStage(AnalysisStage.NARRATIVE);
             return;
        }

        // 9. FINAL VISUALIZATION — receives ALL deliverable data for persona image injection
        if (appState !== AppState.SUCCESS) {
             setStatusMessage("Finalizing Assets...");
             setActiveStage(AnalysisStage.FINAL);

             const final = await sessionRef.current.visualizeNarrative(
                 narrativeResult || { methodology: "Skipped", videoScript: [], slides: [] },
                 deckContext,
                 selectedOutputs,
                 setStatusMessage,
                 handleStreamUpdate
             );
             
             const fullResult: AnalysisResult = {
                 methodology: final?.methodology || "Complete",
                 selectedOutputs,
                 themes: themesResult?.themes || [],
                 personas: personasResult?.personas || [],
                 videoScript: final?.videoScript,
                 slides: final?.slides,
                 journeyMap: journeyResult?.stages,
                 journeyMapDiagramUrl: journeyResult?.diagramUrl,
                 techArchitecture: techResult?.architecture ? { ...techResult.architecture, diagramUrl: techResult.diagramUrl } : undefined,
                 prd: prdResult?.prd,
                 roadmap: roadmapResult?.roadmap,
                 recommendations: recsResult?.recommendations || [],
                 strategyDocument: recsResult?.strategyDocument || undefined,
                 gapAnalysis: gapResult?.analysis,
                 techAudit: techAuditResult?.audit,
                 competitiveAnalysis: competitiveResult?.analysis,
                 crossCuttingSynthesis: synthesisResult?.insights,
             };

             // G-02: Resolve ALL raw citations — [CHUNK_XXX], [FILE N], placeholder baselines
             try {
                 const { buildCitationMap, buildFileMap, resolveAllCitations, correctAllProperNouns } = await import('./services/citationResolver');
                 const corpus = corpusTextRef.current || '';
                 const citationMap = buildCitationMap(corpus);
                 const fileMap = buildFileMap(corpus);
                 // Always run resolution — even with empty maps, it strips orphaned refs and placeholders
                 const resolved = resolveAllCitations(fullResult, citationMap, fileMap);
                 Object.assign(fullResult, resolved);
                 // TYPO-01: Correct misspelled technology brand names
                 const corrected = correctAllProperNouns(fullResult);
                 Object.assign(fullResult, corrected);
                 const resolvedCount = citationMap.size + fileMap.size;
                 if (resolvedCount > 0) {
                     setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
                         type: 'IMPROVING',
                         content: `Resolved ${citationMap.size} chunk citations and ${fileMap.size} file references to human-readable source names. Corrected proper nouns. Stripped orphaned references and placeholder variables.`
                     }]);
                 }
             } catch (e) {
                 console.warn('[CitationResolver] Failed to resolve citations:', e);
             }

             setResult(fullResult);

             // --- WIKI SELF-IMPROVEMENT NARRATION: Post-generation ---
             try {
                 // Narrate what the system learned from this run
                 const allText = JSON.stringify(fullResult);
                 const slopViolations = detectBannedPhrases(allText);
                 const slopEvents = narrateSlopDetection(slopViolations);
                 slopEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));

                 // Quality assessment narration
                 const quality = scoreOutput({
                     sections: Object.keys(fullResult).filter(k => (fullResult as any)[k]),
                     requiredSections: selectedOutputs.length + 2,
                     citations: (allText.match(/CHUNK_\d+/g) || []).length,
                     totalSections: selectedOutputs.length,
                     text: allText,
                 });
                 const qualityEvents = narrateQualityAssessment(quality);
                 qualityEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));

                 // G-05: Evidence density scoring per section
                 const { computeEvidenceDensity } = await import('./services/wikiService');
                 const density = computeEvidenceDensity(allText);
                 if (density.sectionsWithout.length > 0) {
                     setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
                         type: 'DETECTING',
                         content: `Evidence density: ${density.densityScore}% of sections have citations (${density.totalCitations} total). Sections WITHOUT evidence: ${density.sectionsWithout.join(', ')}. These need source grounding.`
                     }]);
                 } else if (density.totalCitations > 0) {
                     setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
                         type: 'LEARNING',
                         content: `Evidence density: ${density.densityScore}% of sections grounded in source data (${density.totalCitations} citations across ${density.sectionsWithEvidence} sections).`
                     }]);
                 }

                 // G-04: Depth scoring gate
                 if (!quality.passing) {
                     setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
                         type: 'DETECTING',
                         content: `Quality gate: Output below consulting threshold (${quality.overall}/5.0, need 3.8+). Weak dimensions: ${quality.failingDimensions.join(', ')}. Filing this pattern for self-improvement — next generation will target these gaps.`
                     }]);
                 }

                 // Narrate post-generation learnings
                 const postEvents = narratePostGeneration(selectedOutputs[0] || 'PERSONAS', {
                     sectionCount: Object.keys(fullResult).filter(k => (fullResult as any)[k]).length,
                     citationCount: (allText.match(/CHUNK_\d+/g) || []).length,
                 });
                 postEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));
             } catch (e) {
                 console.warn('[WikiNarrator] Post-generation narration failed:', e);
             }

             setAppState(AppState.SUCCESS);
             setActiveStage(AnalysisStage.IDLE);
             setStatusMessage("Analysis Complete");

             // P6-03: Post-run wiki ingest — seed the wiki with learnings from this run
             try {
                 const { ingestResearchRun, saveEngagementMemory, writeWikiPage } = await import('./services/wikiService');
                 const ingestResult = await ingestResearchRun({
                     goal: researchGoal,
                     themes: themesResult?.themes || [],
                     personas: personasResult?.personas || [],
                     recommendations: recsResult?.recommendations || [],
                     sourceCount: liveSourceResults.length,
                     evidenceCount: liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0),
                     collectedSources: liveSourceResults, // Archive articles to wiki
                 });

                 // Log source curation decisions to wiki for cross-session learning
                 if (excludedSources.size > 0) {
                     const slug = researchGoal.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50);
                     const excludedList = Array.from(excludedSources).map((key: string) => {
                         if (key.startsWith('kg::')) return `KG node: ${key.substring(4)}`;
                         const [srcId, idx] = key.split('::');
                         const src = liveSourceResults.find((s: any) => s.sourceId === srcId);
                         const item = src?.items?.[parseInt(idx)];
                         return item ? `${src.source}: "${item.title}"` : key;
                     });
                     const curationContent = `---\ntitle: Source Curation Decisions\ntype: source-archive\nstatus: active\ncreated: ${new Date().toISOString()}\n---\n\n# Source Curation: ${researchGoal.substring(0, 80)}\n\nExcluded ${excludedSources.size} items from analysis:\n${excludedList.map(e => `- ${e}`).join('\n')}\n\nTotal collected: ${liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)}\nTotal after curation: ${liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0) - excludedSources.size}\n`;
                     try { await writeWikiPage(`sources/${new Date().toISOString().split('T')[0]}-${slug}-curation.md`, curationContent); } catch (e) { /* non-blocking */ }

                     // Log curation as edit signals so the self-improvement engine learns patterns
                     // Pattern detection will pick up: "users frequently exclude T3 sources" → constraint
                     try {
                         const { logEdit } = await import('./services/promptImprovementEngine');
                         for (const key of Array.from(excludedSources).slice(0, 10) as string[]) {
                             const [srcId] = key.split('::');
                             const src = liveSourceResults.find((s: any) => s.sourceId === srcId);
                             const tierLabel = src ? `T${src.credibilityTier || 3}` : 'unknown';
                             logEdit('DATA_REVIEW', 'source_curation', `included (${tierLabel})`, `excluded (${tierLabel})`);
                         }
                     } catch (e) { /* non-blocking */ }

                     // Persist curation state to localStorage for session recovery
                     try { localStorage.setItem(`hic_curation_${slug}`, JSON.stringify(Array.from(excludedSources))); } catch (e) { /* non-blocking */ }
                 }
                 console.log(`[WikiIngest] Post-run ingest complete: ${ingestResult.pagesUpdated} wiki pages updated`);

                 // P6-07: Save engagement memory for future reference
                 const engagementDate = new Date().toISOString().split('T')[0];
                 const memorySaved = await saveEngagementMemory(
                     researchGoal,
                     engagementDate,
                     themesResult?.themes || [],
                     personasResult?.personas || [],
                     recsResult?.recommendations || [],
                     liveSourceResults.length,
                 );
                 if (memorySaved) {
                     console.log(`[EngagementMemory] Saved engagement memory for: ${researchGoal.substring(0, 60)}`);
                 }
             } catch (e) {
                 console.warn('[WikiIngest] Post-run ingest failed (non-blocking):', e);
             }

             // P6-02: Trigger pattern detection to auto-approve high-confidence constraints
             try {
                 const { detectPatterns, exportConstraintsToWiki } = await import('./services/promptImprovementEngine');
                 const patterns = detectPatterns();
                 if (patterns.length > 0) {
                     console.log(`[PromptImprovement] Detected ${patterns.length} edit patterns, ${patterns.filter(p => p.status === 'approved').length} auto-approved`);
                 }
                 // P6-06: Export approved constraints to wiki for cross-session persistence
                 await exportConstraintsToWiki();
             } catch (e) { /* non-blocking */ }
        }
    };

    const startAnalysis = async () => {
        if ((window as any).aistudio) {
             const hasKey = await (window as any).aistudio.hasSelectedApiKey();
             if (!hasKey) {
                 await (window as any).aistudio.openSelectKey();
             }
        }

        setAppState(AppState.ANALYZING);
        setThinkingEvents([]);

        // --- PRE-PHASE: Auto-detect lens + auto-enable data sources BEFORE collection ---
        const documentNames = files.map((f: FileType) => f.name);

        // A12: Seed wiki with uploaded document catalog
        try {
            const { seedWikiFromUploads } = await import('./services/wikiService');
            await seedWikiFromUploads(documentNames, researchGoal);
        } catch { /* non-blocking */ }

        const lensResult = detectAnalyticalLens(researchGoal, documentNames);
        setSelectedLens(lensResult.selectedLens);
        setLensAutoDetected(true);

        // Auto-enable relevant data sources
        const recommendedSources = recommendDataSources(researchGoal, lensResult.selectedLens);
        if (recommendedSources.enableDeepResearch) setEnableDeepResearch(true);
        if (recommendedSources.enableNews) setEnableNews(true);
        if (recommendedSources.enableAcademic) setEnableAcademic(true);
        if (recommendedSources.enableHigherEdNews) setEnableHigherEdNews(true);
        if (recommendedSources.enableEducationData) setEnableEducationData(true);
        if (recommendedSources.enableGovernment) setEnableGovernment(true);
        if (recommendedSources.enableOpenData) setEnableOpenData(true);
        if (recommendedSources.enableEconomic) setEnableEconomic(true);
        if (recommendedSources.enableSocialTrends) setEnableSocialTrends(true);
        if (recommendedSources.enableCxMesh) setEnableCxMesh(true);
        if (recommendedSources.enableYouTube) setEnableYouTube(true);
        if (recommendedSources.enableAINews) setEnableAINews(true);
        if (recommendedSources.enableAIResearch) setEnableAIResearch(true);

        // Narrate what was detected and enabled
        const enabledNames = Object.entries(recommendedSources).filter(([,v]) => v).map(([k]) => k.replace('enable', '').replace(/([A-Z])/g, ' $1').trim());
        const lensEvents = narrateLensDetection(lensResult);
        lensEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));
        setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
            type: 'LEARNING',
            content: `Auto-enabled ${enabledNames.length} intelligence source categories based on research goal: ${enabledNames.join(', ')}. The system selected these to maximize evidence coverage for this domain.`
        }]);

        // --- PHASE 0: Collect data from enabled sources ---
        let collectedDataFiles: typeof files = [...files];

        // Check both existing toggles AND newly recommended sources
        const willCollectData = hasDataSources || Object.values(recommendedSources).some(v => v);
        if (willCollectData) {
            setIsCollectingData(true);
            setStatusMessage("Collecting intelligence data...");
            setDataSourceStatus("Initializing data collection...");

            try {
                const { generateResearchPlan, executePlan, mergeResultsToCorpus } = await import('./services/researchFabricOrchestrator');

                // Use multi-search for bulk proxy queries
                const { multiSearch } = await import('./services/dataSourceConnectors');

                // Build list of source IDs to query based on enabled toggles + auto-recommended sources
                // (React state updates are async, so we check BOTH the existing state AND recommendedSources)
                const sourceIds: string[] = [];
                if (enableHigherEdNews || recommendedSources.enableHigherEdNews) sourceIds.push(
                    'higher_ed_dive', 'inside_higher_ed', 'edsurge', 'hechinger', 'the_conversation_edu',
                    'campus_tech', 'ecampus', 'university_world_news', 'pie_news', 'open_campus'
                );
                if (enableNews || recommendedSources.enableNews) sourceIds.push('gdelt');
                if (enableAcademic || recommendedSources.enableAcademic) sourceIds.push(
                    'openalex', 'semantic_scholar', 'crossref', 'doaj', 'europe_pmc', 'core_ac',
                    'datacite', 'zenodo'
                );
                if (enableEducationData || recommendedSources.enableEducationData) sourceIds.push('college_scorecard', 'eric');
                if (enableEconomic || recommendedSources.enableEconomic) sourceIds.push('worldbank', 'fred', 'bls', 'imf_data', 'oecd_data');
                if (enableGovernment || recommendedSources.enableGovernment) sourceIds.push(
                    'usaspending', 'federal_register', 'sec_edgar', 'congress', 'nist_ai'
                );
                if (enableOpenData || recommendedSources.enableOpenData) sourceIds.push(
                    'data_gov', 'data_gov_uk', 'nyc_open_data', 'california_data', 'chicago_data',
                    'data_gov_au', 'data_gov_ca', 'eu_data_portal', 'la_open_data', 'sf_open_data', 'texas_open_data'
                );
                if (enableSocialTrends || recommendedSources.enableSocialTrends) sourceIds.push('hackernews');
                if (enableAINews || recommendedSources.enableAINews) sourceIds.push(
                    // AI News RSS (21)
                    'mit_tech_review_ai', 'ieee_spectrum_ai', 'venturebeat_ai', 'techcrunch_ai',
                    'ars_technica_ai', 'wired_ai', 'the_verge_ai', 'synced_review', 'marktechpost',
                    'kdnuggets', 'the_gradient', 'engadget_ai', 'the_conversation_ai', 'analytics_vidhya',
                    'towards_ai', 'ai_alignment_forum', 'import_ai', 'ml_mastery', 'the_guardian_ai',
                    'zdnet_ai', 'the_register_ml',
                    // AI News Web-only (4)
                    'oreilly_radar', 'deeplearning_ai_batch', 'distill_pub', 'arxiv_sanity',
                    // AI Lab Blogs RSS (20)
                    'openai_blog', 'google_ai_blog', 'deepmind_blog', 'meta_ai_blog', 'microsoft_research',
                    'nvidia_dev_blog', 'huggingface_blog', 'anthropic_blog', 'bair_blog', 'apple_ml',
                    'amazon_science', 'aws_ml_blog', 'ibm_research', 'salesforce_ai', 'cohere_blog',
                    'allen_ai', 'stanford_hai_blog', 'databricks_ai', 'stability_ai', 'mistral_ai',
                    // AI Lab Research Web-only (7)
                    'openai_research', 'anthropic_research', 'google_research', 'nvidia_research',
                    'adobe_research', 'qualcomm_ai', 'intel_ai'
                );
                if (enableAIResearch || recommendedSources.enableAIResearch) sourceIds.push(
                    // AI Research arXiv API (8)
                    'arxiv_cs_ai', 'arxiv_cs_lg', 'arxiv_cs_cl', 'arxiv_cs_cv', 'arxiv_cs_ro',
                    'arxiv_stat_ml', 'arxiv_cs_ir', 'arxiv_cs_hc',
                    // AI Research REST (2)
                    'openreview', 'dblp',
                    // AI Models & Datasets REST (5) + Web-only (8)
                    'hf_models', 'hf_datasets', 'openml', 'kaggle_datasets', 'paperswithcode',
                    'papers_with_code_sota', 'hf_leaderboard', 'lmarena', 'mlperf',
                    'helm_stanford', 'tf_datasets', 'pytorch_hub', 'ollama_library',
                    // AI Policy RSS (8) + Web-only (2)
                    'brookings_ai', 'stanford_hai', 'oecd_ai', 'eff_ai', 'ada_lovelace',
                    'ai_now_institute', 'cset_georgetown', 'partnership_on_ai', 'nist_ai',
                    'unesco_ai', 'nist_ai_web',
                    // AI Communities REST (4) + Web-only (3)
                    'stackoverflow_ai', 'reddit_ml', 'reddit_ai', 'reddit_llm',
                    'hf_forums', 'pytorch_forums', 'tf_forum',
                    // AI Code REST (2) + Web-only (3)
                    'github_repos', 'github_trending',
                    'github_trending_ai', 'langchain_docs', 'llamaindex_docs',
                    // AI Conferences RSS (2) + Web-only (10)
                    'neurips_proc', 'acl_anthology',
                    'neurips_conf', 'icml_conf', 'iclr_conf', 'aaai_conf', 'ijcai_conf',
                    'cvpr_conf', 'acl_conf', 'emnlp_conf', 'kdd_conf', 'pmlr_proc'
                );
                if (enableYouTube || recommendedSources.enableYouTube) sourceIds.push(
                    'youtube', 'youtube_ai',
                    'yt_two_minute_papers', 'yt_yannic_kilcher', 'yt_lex_fridman',
                    'yt_ai_explained', 'yt_sentdex'
                );

                // STEP 1: AI Query Refinement — generate targeted queries per source
                const { refineSearchQueries } = await import('./services/researchFabricOrchestrator');
                setCollectionPhase('refining');
                setDataSourceStatus('AI refining search queries per source...');
                setThinkingEvents(prev => [...prev, { type: 'PHASE', content: `[QUERY REFINEMENT] Generating targeted queries for ${sourceIds.length} sources...` }]);

                // Map source IDs to actual source names and query categories
                const tierMap: Record<string, number> = {
                    // Higher-Ed News = Tier 2
                    'higher_ed_dive': 2, 'inside_higher_ed': 2, 'edsurge': 2, 'hechinger': 2,
                    'the_conversation_edu': 2, 'campus_tech': 2, 'ecampus': 2,
                    'university_world_news': 2, 'pie_news': 2, 'open_campus': 2,
                    // Academic = Tier 1
                    'openalex': 1, 'semantic_scholar': 1, 'crossref': 1, 'doaj': 1,
                    'europe_pmc': 1, 'core_ac': 1, 'datacite': 1, 'zenodo': 1,
                    // Education = Tier 1
                    'college_scorecard': 1, 'eric': 1,
                    // Economic = Tier 1
                    'worldbank': 1, 'fred': 1, 'bls': 1, 'imf_data': 1, 'oecd_data': 1,
                    // Government = Tier 1
                    'usaspending': 1, 'federal_register': 1, 'sec_edgar': 1, 'congress': 1, 'nist_ai': 1,
                    // Open Data = Tier 1
                    'data_gov': 1, 'data_gov_uk': 1, 'nyc_open_data': 1, 'california_data': 1,
                    'chicago_data': 1, 'data_gov_au': 1, 'data_gov_ca': 1, 'eu_data_portal': 1,
                    'la_open_data': 1, 'sf_open_data': 1, 'texas_open_data': 1,
                    // News = Tier 2
                    'gdelt': 2, 'hackernews': 3,
                    // AI News = Tier 2
                    'mit_tech_review_ai': 2, 'ieee_spectrum_ai': 2, 'venturebeat_ai': 2,
                    'techcrunch_ai': 2, 'ars_technica_ai': 2, 'wired_ai': 2, 'the_verge_ai': 2,
                    'synced_review': 2, 'marktechpost': 2, 'kdnuggets': 2, 'the_gradient': 2,
                    'engadget_ai': 2, 'the_conversation_ai': 2, 'analytics_vidhya': 2,
                    'towards_ai': 3, 'ai_alignment_forum': 3, 'import_ai': 2, 'ml_mastery': 2,
                    'the_guardian_ai': 2, 'zdnet_ai': 2, 'the_register_ml': 2,
                    'oreilly_radar': 2, 'deeplearning_ai_batch': 2, 'distill_pub': 1, 'arxiv_sanity': 2,
                    // AI Lab Blogs = Tier 2 (corporate blogs, not peer-reviewed)
                    'openai_blog': 2, 'google_ai_blog': 2, 'deepmind_blog': 2, 'meta_ai_blog': 2,
                    'microsoft_research': 1, 'nvidia_dev_blog': 2, 'huggingface_blog': 2,
                    'anthropic_blog': 2, 'bair_blog': 1, 'apple_ml': 2,
                    'amazon_science': 2, 'aws_ml_blog': 2, 'ibm_research': 1, 'salesforce_ai': 2,
                    'cohere_blog': 2, 'allen_ai': 1, 'stanford_hai_blog': 1, 'databricks_ai': 2,
                    'stability_ai': 2, 'mistral_ai': 2,
                    // AI Lab Research = Tier 1
                    'openai_research': 1, 'anthropic_research': 1, 'google_research': 1,
                    'nvidia_research': 1, 'adobe_research': 1, 'qualcomm_ai': 2, 'intel_ai': 2,
                    // arXiv = ALL Tier 1 (preprints are academic)
                    'arxiv_cs_ai': 1, 'arxiv_cs_lg': 1, 'arxiv_cs_cl': 1, 'arxiv_cs_cv': 1,
                    'arxiv_cs_ro': 1, 'arxiv_stat_ml': 1, 'arxiv_cs_ir': 1, 'arxiv_cs_hc': 1,
                    // Peer review = Tier 1
                    'openreview': 1, 'dblp': 1,
                    // Models/Datasets = Tier 2
                    'hf_models': 2, 'hf_datasets': 2, 'openml': 2, 'kaggle_datasets': 2,
                    'paperswithcode': 1, 'papers_with_code_sota': 1,
                    'hf_leaderboard': 2, 'lmarena': 2, 'mlperf': 1, 'helm_stanford': 1,
                    'tf_datasets': 2, 'pytorch_hub': 2, 'ollama_library': 3,
                    // AI Policy = Tier 1 (think tanks, government)
                    'brookings_ai': 1, 'stanford_hai': 1, 'oecd_ai': 1, 'eff_ai': 2,
                    'ada_lovelace': 1, 'ai_now_institute': 1, 'cset_georgetown': 1,
                    'partnership_on_ai': 1, 'unesco_ai': 1, 'nist_ai_web': 1,
                    // Communities = Tier 3
                    'stackoverflow_ai': 3, 'reddit_ml': 3, 'reddit_ai': 3, 'reddit_llm': 3,
                    'hf_forums': 3, 'pytorch_forums': 3, 'tf_forum': 3,
                    // Code = Tier 2
                    'github_repos': 2, 'github_trending': 2, 'github_trending_ai': 2,
                    'langchain_docs': 2, 'llamaindex_docs': 2,
                    // Conferences = Tier 1
                    'neurips_proc': 1, 'acl_anthology': 1, 'neurips_conf': 1, 'icml_conf': 1,
                    'iclr_conf': 1, 'aaai_conf': 1, 'ijcai_conf': 1, 'cvpr_conf': 1,
                    'acl_conf': 1, 'emnlp_conf': 1, 'kdd_conf': 1, 'pmlr_proc': 1,
                    // Video = Tier 3
                    'youtube': 3, 'youtube_ai': 3, 'yt_two_minute_papers': 3,
                    'yt_yannic_kilcher': 3, 'yt_lex_fridman': 3, 'yt_ai_explained': 3, 'yt_sentdex': 3,
                };
                const sourceDisplayNames: Record<string, string> = {
                    'higher_ed_dive': 'Higher Ed Dive (RSS)', 'inside_higher_ed': 'Inside Higher Ed (RSS)', 'edsurge': 'EdSurge (RSS)',
                    'hechinger': 'Hechinger Report (RSS)', 'the_conversation_edu': 'The Conversation (RSS)',
                    'gdelt': 'GDELT Global News', 'openalex': 'OpenAlex (250M papers)', 'semantic_scholar': 'Semantic Scholar',
                    'crossref': 'Crossref (150M DOIs)', 'college_scorecard': 'College Scorecard (US DoE)', 'eric': 'ERIC (Education)',
                    'worldbank': 'World Bank (16K indicators)', 'fred': 'FRED (800K time series)', 'usaspending': 'USAspending.gov',
                    'federal_register': 'Federal Register', 'sec_edgar': 'SEC EDGAR', 'data_gov': 'Data.gov (CKAN)',
                    'hackernews': 'Hacker News (Algolia)', 'youtube': 'YouTube (Invidious)',
                    // AI News
                    'mit_tech_review_ai': 'MIT Tech Review AI', 'ieee_spectrum_ai': 'IEEE Spectrum AI',
                    'venturebeat_ai': 'VentureBeat AI', 'techcrunch_ai': 'TechCrunch AI',
                    'ars_technica_ai': 'Ars Technica AI', 'wired_ai': 'WIRED AI',
                    'the_verge_ai': 'The Verge AI', 'synced_review': 'Synced Review',
                    'marktechpost': 'MarkTechPost', 'kdnuggets': 'KDnuggets', 'the_gradient': 'The Gradient',
                    // AI Lab Blogs
                    'openai_blog': 'OpenAI Blog', 'google_ai_blog': 'Google AI Blog',
                    'deepmind_blog': 'DeepMind Blog', 'meta_ai_blog': 'Meta AI Blog',
                    'microsoft_research': 'Microsoft Research', 'nvidia_dev_blog': 'NVIDIA Developer',
                    'huggingface_blog': 'Hugging Face Blog', 'anthropic_blog': 'Anthropic Blog', 'bair_blog': 'BAIR (Berkeley)',
                    // AI Research
                    'arxiv_cs_ai': 'arXiv CS.AI', 'arxiv_cs_lg': 'arXiv CS.LG', 'arxiv_cs_cl': 'arXiv CS.CL',
                    'openreview': 'OpenReview', 'dblp': 'DBLP',
                    // AI Models & Datasets
                    'hf_models': 'Hugging Face Models', 'hf_datasets': 'Hugging Face Datasets',
                    // AI Policy
                    'brookings_ai': 'Brookings AI', 'stanford_hai': 'Stanford HAI',
                    // AI Communities & Code
                    'stackoverflow_ai': 'Stack Overflow AI', 'github_repos': 'GitHub Repos',
                };
                const queryCategoryMap: Record<string, string> = {
                    'higher_ed_dive': 'Higher Ed News', 'inside_higher_ed': 'Higher Ed News', 'edsurge': 'EdTech News',
                    'hechinger': 'Education Journalism', 'the_conversation_edu': 'Academic Commentary',
                    'gdelt': 'Global News', 'openalex': 'Academic Papers', 'semantic_scholar': 'Academic Papers',
                    'crossref': 'Scholarly Metadata', 'college_scorecard': 'College Data', 'eric': 'Education Research',
                    'worldbank': 'Economic Indicators', 'fred': 'Economic Data', 'usaspending': 'Federal Spending',
                    'federal_register': 'Federal Regulations', 'sec_edgar': 'Company Filings', 'data_gov': 'Open Data',
                    'hackernews': 'Tech Discussion', 'youtube': 'Video Content',
                    // AI News
                    'mit_tech_review_ai': 'AI News', 'ieee_spectrum_ai': 'AI News',
                    'venturebeat_ai': 'AI News', 'techcrunch_ai': 'AI News',
                    'ars_technica_ai': 'AI News', 'wired_ai': 'AI News',
                    'the_verge_ai': 'AI News', 'synced_review': 'AI News',
                    'marktechpost': 'AI News', 'kdnuggets': 'AI News', 'the_gradient': 'AI News',
                    // AI Lab Blogs
                    'openai_blog': 'AI Lab Research', 'google_ai_blog': 'AI Lab Research',
                    'deepmind_blog': 'AI Lab Research', 'meta_ai_blog': 'AI Lab Research',
                    'microsoft_research': 'AI Lab Research', 'nvidia_dev_blog': 'AI Lab Research',
                    'huggingface_blog': 'AI Lab Research', 'anthropic_blog': 'AI Lab Research', 'bair_blog': 'AI Lab Research',
                    // AI Research
                    'arxiv_cs_ai': 'AI Papers', 'arxiv_cs_lg': 'ML Papers', 'arxiv_cs_cl': 'NLP Papers',
                    'openreview': 'AI Peer Review', 'dblp': 'CS Bibliography',
                    // AI Models & Datasets
                    'hf_models': 'AI Models', 'hf_datasets': 'AI Datasets',
                    // AI Policy
                    'brookings_ai': 'AI Policy', 'stanford_hai': 'AI Policy',
                    // AI Communities & Code
                    'stackoverflow_ai': 'AI Q&A', 'github_repos': 'AI Code',
                };

                // PRE-FILTER: Remove sources that are irrelevant to the research domain
                // This prevents querying 160 sources when only 40 are relevant
                const FUNDRAISING_IRRELEVANT = new Set([
                    'ollama_library', 'pytorch_hub', 'tf_datasets', 'hf_leaderboard', 'lmarena',
                    'mlperf', 'helm_stanford', 'hf_models', 'hf_datasets', 'openml', 'kaggle_datasets',
                    'pytorch_forums', 'tf_forum', 'hf_forums', 'langchain_docs', 'llamaindex_docs',
                    'github_trending_ai', 'yt_two_minute_papers', 'yt_yannic_kilcher', 'yt_sentdex',
                ]);
                const STUDENT_IRRELEVANT = new Set([
                    'sec_edgar', 'ollama_library', 'pytorch_hub', 'tf_datasets',
                    'hf_leaderboard', 'lmarena', 'mlperf', 'helm_stanford',
                ]);
                const irrelevantForLens: Set<string> =
                    lensResult.selectedLens === 'fundraising_advancement' ? FUNDRAISING_IRRELEVANT :
                    lensResult.selectedLens === 'student_learner' ? STUDENT_IRRELEVANT :
                    new Set();

                const preFilterCount = sourceIds.length;
                const filteredSourceIds = sourceIds.filter(id => !irrelevantForLens.has(id));
                if (filteredSourceIds.length < preFilterCount) {
                    setThinkingEvents(prev => [...prev, {
                        type: 'DETECTING',
                        content: `Pre-filter removed ${preFilterCount - filteredSourceIds.length} irrelevant sources for ${lensResult.selectedLens} research (ML model registries, framework docs, AI benchmarks). Querying ${filteredSourceIds.length} relevant sources.`
                    }]);
                }
                // Replace sourceIds with filtered version
                sourceIds.length = 0;
                sourceIds.push(...filteredSourceIds);

                // Log which actual sources will be queried
                setThinkingEvents(prev => [...prev, {
                    type: 'PHASE',
                    content: `[SOURCES] ${sourceIds.length} data sources selected:\n${sourceIds.map(id => `  - ${sourceDisplayNames[id] || id}`).join('\n')}`
                }]);

                // Initialize live source feed with all sources in "pending" state
                setLiveSourceResults(sourceIds.map(sid => ({
                    source: sourceDisplayNames[sid] || sid,
                    sourceId: sid,
                    credibilityTier: tierMap[sid] || 3,
                    items: [],
                    total: 0,
                    status: 'pending',
                })));

                const uniqueCategories = [...new Set(sourceIds.map(id => queryCategoryMap[id] || id))];
                let refinedQueries: Record<string, string> = {};
                try {
                    refinedQueries = await refineSearchQueries(researchGoal, selectedLens, uniqueCategories);
                    setLiveRefinedQueries(refinedQueries);
                    setCollectionPhase('collecting');
                    setThinkingEvents(prev => [...prev, {
                        type: 'PHASE',
                        content: `[QUERY STRATEGY] AI generated ${Object.keys(refinedQueries).length} targeted search queries`
                    }]);
                } catch (e) {
                    console.warn('Query refinement failed, using goal directly');
                    setCollectionPhase('collecting');
                }

                // STEP 2: Search each source with its refined query via proxy
                let proxyResults: any[] = [];
                if (sourceIds.length > 0) {
                    setDataSourceStatus(`Searching ${sourceIds.length} sources with targeted queries...`);
                    setThinkingEvents(prev => [...prev, { type: 'PHASE', content: `[SEARCHING] Querying ${sourceIds.length} data sources in parallel...` }]);

                    // Search sources in BATCHES of 6 with retry + delay between batches
                    // Reduced from 12 to prevent ERR_NETWORK_CHANGED from browser connection pool exhaustion
                    const BATCH_SIZE = 6;
                    const MAX_RETRIES = 3;
                    const BATCH_DELAY_MS = 800;

                    async function fetchWithRetry(url: string, retries: number = MAX_RETRIES): Promise<Response> {
                        for (let attempt = 0; attempt <= retries; attempt++) {
                            try {
                                const resp = await fetch(url, { signal: AbortSignal.timeout(45000) });
                                return resp;
                            } catch (err: any) {
                                if (attempt < retries && (err.message?.includes('NETWORK') || err.message?.includes('fetch') || err.name === 'AbortError' || err.message?.includes('ERR_'))) {
                                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                                    continue;
                                }
                                throw err;
                            }
                        }
                        throw new Error('Max retries exceeded');
                    }

                    // Process in batches with delay between each to prevent connection pool exhaustion
                    for (let batchStart = 0; batchStart < sourceIds.length; batchStart += BATCH_SIZE) {
                        if (batchStart > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
                        const batch = sourceIds.slice(batchStart, batchStart + BATCH_SIZE);
                        setDataSourceStatus(`Searching batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(sourceIds.length / BATCH_SIZE)} (${batch.length} sources)...`);

                        // Mark batch as loading
                        setLiveSourceResults(prev => prev.map(s => batch.includes(s.sourceId) ? { ...s, status: 'loading' } : s));

                        const batchResults = await Promise.allSettled(
                            batch.map(async (sid) => {
                                const category = queryCategoryMap[sid] || sid;
                                const displayName = sourceDisplayNames[sid] || sid;
                                const query = refinedQueries[category] || researchGoal;
                                const tier = tierMap[sid] || 3;

                                try {
                                    const resp = await fetchWithRetry(`http://localhost:5012/api/search/${sid}?q=${encodeURIComponent(query)}&limit=15`);
                                    if (!resp.ok) {
                                        setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? { ...s, status: 'error', query } : s));
                                        return { source: displayName, sourceId: sid, credibilityTier: tier, items: [], total: 0, query };
                                    }
                                    const data = await resp.json();
                                    const result = { ...data, source: displayName, sourceId: sid, credibilityTier: tier, query };
                                    setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? {
                                        ...s, items: result.items || [], total: result.total || 0,
                                        status: (result.items?.length || 0) > 0 ? 'complete' : 'empty', query,
                                    } : s));
                                    return result;
                                } catch {
                                    setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? { ...s, status: 'error', query } : s));
                                    return { source: displayName, sourceId: sid, credibilityTier: tier, items: [], total: 0, query };
                                }
                            })
                        );
                        proxyResults.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { items: [], total: 0 }));
                    }

                    try {
                        const totalProxyItems = proxyResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0);
                        const successCount = proxyResults.filter((r: any) => r.items?.length > 0).length;
                        const failedSources = proxyResults.filter((r: any) => !r.items || r.items.length === 0);

                        // Log each successful source with details
                        const sourceEvents = proxyResults.map((r: any) => {
                            if (r.items?.length > 0) {
                                const tierLabel = r.credibilityTier === 1 ? 'Tier 1 (Peer-Reviewed/Govt)' : r.credibilityTier === 2 ? 'Tier 2 (News/Think Tank)' : 'Tier 3 (Community)';
                                return { type: 'INSIGHT', content: `[OK] ${r.source}: ${r.items.length} items | ${tierLabel} | Query: "${(r.query || '').substring(0, 50)}..."` };
                            } else {
                                return { type: 'CORRECTION', content: `[EMPTY] ${r.source}: 0 results returned` };
                            }
                        });

                        setThinkingEvents(prev => [
                            ...prev,
                            ...sourceEvents,
                            { type: 'PHASE', content: `[RESULTS] ${totalProxyItems} items collected from ${successCount} of ${sourceIds.length} sources (${failedSources.length} returned empty)` },
                        ]);
                        setCollectionPhase('filtering');
                    } catch (e: any) {
                        setThinkingEvents(prev => [...prev, { type: 'CORRECTION', content: `[WARNING] Some sources failed: ${e.message}` }]);
                        setCollectionPhase('filtering');
                    }
                }

                // AI SUBREDDIT DISCOVERY — when Social Listening enabled but no subreddits specified
                let discoveredSubreddits: string[] = [];
                if (enableCxMesh && !subredditTargets.trim()) {
                    setDataSourceStatus('AI discovering relevant Reddit communities...');
                    try {
                        const { discoverSubreddits } = await import('./services/researchFabricOrchestrator');
                        const suggestions = await discoverSubreddits(researchGoal);
                        discoveredSubreddits = suggestions.map(s => s.name).slice(0, 6);
                        if (discoveredSubreddits.length > 0) {
                            setThinkingEvents(prev => [...prev, {
                                type: 'PHASE',
                                content: `[SOCIAL LISTENING] AI discovered ${discoveredSubreddits.length} relevant subreddits: r/${discoveredSubreddits.join(', r/')}`
                            }]);
                        }
                    } catch (e) {
                        console.warn('Subreddit discovery failed:', e);
                    }
                }

                const cxSubreddits = subredditTargets.trim()
                    ? subredditTargets.split(',').map(s => s.trim()).filter(Boolean)
                    : discoveredSubreddits;

                // Also run orchestrator for deep research + CX mesh (if enabled)
                const plan = await generateResearchPlan(researchGoal, selectedLens, {
                    deepResearch: (enableDeepResearch || recommendedSources.enableDeepResearch) ? { mode: deepResearchMode } : undefined,
                    newsMedia: false, academic: false, economic: false, socialTrends: false, videoSearch: false,
                    videoTranscripts: videoUrls.trim() ? videoUrls.trim().split('\n').filter(u => u.trim()) : undefined,
                    webIntelligence: webUrls.trim() ? { urls: webUrls.trim().split('\n').filter(u => u.trim()) } : undefined,
                    cxMesh: enableCxMesh ? {
                        subreddits: cxSubreddits.length > 0 ? cxSubreddits : undefined,
                        trustpilot: trustpilotTargets.trim() ? trustpilotTargets.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                    } : undefined,
                });

                // Execute orchestrator plan (for deep research, CX mesh, web URLs, video transcripts)
                const enabledPlanSources = plan.sources.filter(s => s.enabled);
                if (enabledPlanSources.length > 0) {
                    setDataSourceStatus(`Running ${enabledPlanSources.length} additional AI-powered sources...`);

                    // Add orchestrator sources to the live feed
                    // BUG FIX: Deep research is NOT auto-Tier 1. Tier is determined by
                    // relevance scoring AFTER collection, not by source type.
                    // CX Mesh = Tier 3 (community), Web Intelligence = Tier 2, Deep Research = Tier 2 (unverified until scored)
                    const orchestratorCards = enabledPlanSources.map(s => ({
                        source: s.name,
                        sourceId: `orch_${s.id}`,
                        credibilityTier: s.type === 'cx_mesh' || s.type === 'subreddit' ? 3 : 2,
                        items: [],
                        total: 0,
                        status: 'loading' as const,
                        query: s.query,
                    }));
                    setLiveSourceResults(prev => [...prev, ...orchestratorCards]);
                }

                const executionResult = await executePlan(plan, (progress) => {
                    setDataSourceStatus(`${progress.sourceName}: ${progress.message}`);

                    // Update the live feed card for this orchestrator source
                    setLiveSourceResults(prev => prev.map(s => {
                        if (s.source === progress.sourceName) {
                            return {
                                ...s,
                                status: progress.status === 'completed' ? 'complete' : progress.status === 'failed' ? 'error' : 'loading',
                                items: progress.itemsCollected > 0 ? Array(progress.itemsCollected).fill({ title: 'AI Research Result', content: progress.message }) : s.items,
                                total: progress.itemsCollected,
                            };
                        }
                        return s;
                    }));

                    if (progress.status === 'completed') {
                        setThinkingEvents(prev => [...prev, { type: 'INSIGHT', content: `[AI RESEARCH] ${progress.sourceName}: ${progress.itemsCollected} items collected` }]);
                    }
                });

                // Update live source cards with actual orchestrator results
                for (const srcResult of executionResult.sources) {
                    setLiveSourceResults(prev => prev.map(s => {
                        if (s.source === srcResult.name || s.sourceId === `orch_${srcResult.sourceId}`) {
                            return {
                                ...s,
                                status: srcResult.status === 'completed' ? 'complete' : srcResult.status === 'failed' ? 'error' : s.status,
                                items: srcResult.items?.map((item: any) => ({
                                    title: item.title || 'Research Finding',
                                    content: item.content?.substring(0, 200) || '',
                                    url: item.url,
                                    sourceName: item.sourceName,
                                })) || [],
                                total: srcResult.items?.length || 0,
                            };
                        }
                        return s;
                    }));
                }

                // Merge orchestrator results into corpus
                setDataSourceStatus('AI filtering results for relevance...');
                const corpus = await mergeResultsToCorpus(executionResult, researchGoal);

                // Also merge proxy multi-search results
                let proxyCorpus = '';
                if (proxyResults.length > 0) {
                    const sections: string[] = [];
                    for (const r of proxyResults) {
                        if (!r.items || r.items.length === 0) continue;
                        sections.push(`\n=== SOURCE: ${r.source} (${r.items.length} items) ===\n`);
                        for (const item of r.items) {
                            sections.push(`--- ${item.title} ---`);
                            if (item.url) sections.push(`URL: ${item.url}`);
                            if (item.date) sections.push(`Date: ${item.date}`);
                            sections.push(item.content || '');
                            sections.push('');
                        }
                    }
                    proxyCorpus = sections.join('\n');
                }

                let fullCorpus = [corpus, proxyCorpus].filter(c => c.trim()).join('\n\n');
                const totalItems = executionResult.totalItems + proxyResults.reduce((s, r) => s + (r.items?.length || 0), 0);
                const totalSources = executionResult.successfulSources + proxyResults.filter(r => r.items?.length > 0).length;

                // ================================================================
                // TRI-MODEL CORPUS ANALYSIS
                // When corpus exceeds 300KB, split across Gemini/Claude/OpenAI.
                // Each model gets a CAPACITY-PROPORTIONAL share sized to NEVER exceed
                // its context window. No fallbacks needed — the math guarantees it fits.
                //
                // Model context limits (April 2026):
                //   Gemini 2.5 Flash: 1M tokens → 3.2MB chars (80% headroom → 2.5MB safe)
                //   Claude Sonnet 4.6: 200K tokens → 640KB chars (80% → 500KB safe)
                //   OpenAI GPT-5.4 Mini: 128K tokens → 400KB chars (80% → 320KB safe)
                //
                // Split ratio: 50% Gemini / 30% Claude / 20% OpenAI
                // For 600KB corpus: Gemini=300KB, Claude=180KB, OpenAI=120KB — all safe.
                // ================================================================
                const TRIMODEL_THRESHOLD = 300_000;
                if (fullCorpus.length > TRIMODEL_THRESHOLD) {
                    setDataSourceStatus('Splitting corpus across Gemini, Claude, OpenAI for parallel analysis...');
                    const corpusSize = fullCorpus.length;
                    setThinkingEvents(prev => [...prev, {
                        type: 'PHASE',
                        content: `[TRI-MODEL] Corpus is ${Math.round(corpusSize / 1024)}KB — splitting 50/30/20 across 3 models`
                    }]);

                    // Find all chunk boundaries for clean splitting
                    const chunkStarts: number[] = [0];
                    let pos = 0;
                    while (true) {
                        const idx = fullCorpus.indexOf('\n[CHUNK_', pos + 1);
                        if (idx === -1) break;
                        chunkStarts.push(idx);
                        pos = idx;
                    }

                    // Capacity-proportional split: 50% / 30% / 20%
                    const splitTargets = [
                        Math.floor(corpusSize * 0.50),  // Gemini: largest context
                        Math.floor(corpusSize * 0.80),  // Claude: cumulative 80% mark
                    ];

                    // Find nearest chunk boundary to each split target
                    const findNearestBoundary = (target: number) => {
                        let closest = 0;
                        for (const start of chunkStarts) {
                            if (start <= target) closest = start;
                            else break;
                        }
                        return closest;
                    };

                    const split1 = findNearestBoundary(splitTargets[0]);
                    const split2 = findNearestBoundary(splitTargets[1]);

                    const parts = [
                        fullCorpus.substring(0, split1),                    // Gemini: ~50%
                        fullCorpus.substring(split1, split2),               // Claude: ~30%
                        fullCorpus.substring(split2),                       // OpenAI: ~20%
                    ];

                    const models = [
                        { name: 'Gemini', url: 'http://localhost:5012/api/ai/gemini', model: 'gemini-2.5-flash', maxChars: 2_500_000, timeout: 180_000 },
                        { name: 'Claude', url: 'http://localhost:5012/api/ai/anthropic', model: 'claude-sonnet-4-6', maxChars: 500_000, timeout: 240_000 },
                        { name: 'OpenAI', url: 'http://localhost:5012/api/ai/openai', model: 'gpt-5.4-mini', maxChars: 320_000, timeout: 180_000 },
                    ];

                    const analyzePart = async (part: string, m: typeof models[0], partNum: number): Promise<string> => {
                        const safeContent = part.substring(0, m.maxChars); // Guaranteed to fit
                        const prompt = `Research objective: "${researchGoal}"

You are analyzing Part ${partNum}/3 of a research corpus (${Math.round(safeContent.length / 1024)}KB). Produce a COMPREHENSIVE SUMMARY preserving:
1. Every data point, statistic, percentage, dollar amount mentioned
2. All named entities (people, organizations, systems, vendors)
3. Key findings with their [CHUNK_XXX] citation references
4. Contradictions or tensions between sources
5. Gaps — questions the evidence does NOT answer

Be exhaustive. Every data point matters. This summary replaces the raw text for downstream analysis.

CORPUS SECTION:
${safeContent}`;

                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        let body: any;
                        if (m.name === 'Gemini') {
                            body = { model: m.model, contents: prompt, config: { temperature: 0.1 } };
                        } else if (m.name === 'Claude') {
                            body = { model: m.model, max_tokens: 8000, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] };
                        } else {
                            body = { model: m.model, input: prompt };
                        }

                        const resp = await fetch(m.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(m.timeout) });
                        if (!resp.ok) throw new Error(`${m.name} returned ${resp.status}: ${(await resp.text()).substring(0, 200)}`);
                        const data = await resp.json();

                        if (m.name === 'Gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (m.name === 'Claude') return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';
                        return (data.output || []).filter((i: any) => i.type === 'message').flatMap((i: any) => (i.content || []).filter((b: any) => b.type === 'output_text').map((b: any) => b.text)).join('\n') || '';
                    };

                    // Run all 3 in parallel — each is sized to its model's capacity
                    const results = await Promise.allSettled(
                        models.map((m, i) => {
                            const partKB = Math.round(parts[i].length / 1024);
                            const pct = Math.round(parts[i].length / corpusSize * 100);
                            setThinkingEvents(prev => [...prev, { type: 'PHASE', content: `[TRI-MODEL] ${m.name} analyzing ${partKB}KB (${pct}% of corpus)...` }]);
                            return analyzePart(parts[i], m, i + 1);
                        })
                    );

                    const synthesisParts: string[] = [];
                    results.forEach((r, i) => {
                        if (r.status === 'fulfilled' && r.value && r.value.length > 100) {
                            synthesisParts.push(`\n=== ${models[i].name.toUpperCase()} ANALYSIS (${Math.round(parts[i].length / 1024)}KB input → ${Math.round(r.value.length / 1024)}KB summary) ===\n${r.value}\n`);
                            setThinkingEvents(prev => [...prev, { type: 'INSIGHT', content: `[TRI-MODEL] ${models[i].name}: ${Math.round(r.value.length / 1024)}KB summary produced` }]);
                        } else {
                            const err = r.status === 'rejected' ? r.reason?.message : 'empty response';
                            console.error(`[TriModel] ${models[i].name} failed:`, err);
                            setThinkingEvents(prev => [...prev, { type: 'CORRECTION', content: `[TRI-MODEL] ${models[i].name}: failed (${(err || '').substring(0, 80)})` }]);
                        }
                    });

                    fullCorpus = `=== TRI-MODEL RESEARCH SYNTHESIS ===
Research corpus (${Math.round(corpusSize / 1024)}KB, ${totalItems} items) analyzed by ${synthesisParts.length} reasoning models in parallel.
Split: Gemini ${Math.round(parts[0].length / 1024)}KB / Claude ${Math.round(parts[1].length / 1024)}KB / OpenAI ${Math.round(parts[2].length / 1024)}KB
CITATION RULE: [CHUNK_XXX] references trace to original corpus items.
${synthesisParts.join('\n')}
=== END TRI-MODEL SYNTHESIS ===\n`;

                    setThinkingEvents(prev => [...prev, {
                        type: 'PHASE',
                        content: `[TRI-MODEL COMPLETE] ${synthesisParts.length}/3 models → ${Math.round(fullCorpus.length / 1024)}KB synthesis (${Math.round(corpusSize / 1024)}KB → ${Math.round(fullCorpus.length / 1024)}KB)`
                    }]);
                }

                if (fullCorpus.trim().length > 0) {
                    corpusTextRef.current = fullCorpus; // Store for citation resolver
                    const base64Corpus = btoa(unescape(encodeURIComponent(fullCorpus)));
                    collectedDataFiles.push({
                        name: `intelligence_sources_${Date.now()}.txt`,
                        type: 'text/plain',
                        size: fullCorpus.length,
                        data: base64Corpus,
                    });
                    setThinkingEvents(prev => [...prev, {
                        type: 'PHASE',
                        content: `[DATA COLLECTION COMPLETE] ${totalItems} items from ${totalSources} sources merged into analysis corpus (${Math.round(fullCorpus.length / 1024)}KB)`
                    }]);
                }

                setDataSourceStatus(`Collection complete: ${totalItems} items from ${totalSources} sources`);
            } catch (e: any) {
                console.error('Data collection failed:', e);
                setThinkingEvents(prev => [...prev, { type: 'CORRECTION', content: `[DATA COLLECTION WARNING] Some sources failed: ${e.message}. Proceeding with uploaded documents only.` }]);
                setDataSourceStatus(`Collection partially failed: ${e.message}`);
            } finally {
                setIsCollectingData(false);
                setCollectionPhase('complete');
            }
        }

        // --- PHASE 1: Load wiki knowledge + create session ---
        const lensSegment = getLensPromptSegment(lensResult.selectedLens);
        const { setActiveVisualizationStyle } = await import('./services/geminiService');
        setActiveVisualizationStyle(selectedVisStyle);

        // Load wiki knowledge BEFORE creating session so it's injected into the system prompt
        let wikiKnowledge = '';
        try {
            const wikiContext = await loadGenerationContext(selectedOutputs[0] || 'PERSONAS');

            // Assemble wiki knowledge for injection into GenAISession system prompt
            const { assembleEnhancedPrompt } = await import('./services/wikiService');
            wikiKnowledge = assembleEnhancedPrompt('', wikiContext);

            // Narrate cross-session compounding — count actual collected sources
            const collectedSourceCount = liveSourceResults.filter((r: any) => r.status === 'complete' && r.items?.length > 0).length;
            const collectedItemCount = liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0);
            const compoundingEvents = narrateKnowledgeCompounding({
                totalWikiPages: 48,
                totalEvidencePoints: wikiContext.evidence ? (wikiContext.evidence.match(/^###\s/gm) || []).length : 0,
                totalSourcesIngested: collectedSourceCount || files.length,
                previousEngagements: 0,
                lastUpdated: new Date().toISOString().split('T')[0],
            });
            compoundingEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));

            // Narrate what wiki knowledge is being loaded for each selected output
            for (const output of selectedOutputs.slice(0, 3)) {
                const ctx = output === selectedOutputs[0] ? wikiContext : await loadGenerationContext(output);
                const preEvents = narratePreGeneration(output, ctx);
                preEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));
            }
        } catch (e) {
            console.warn('[WikiNarrator] Wiki context load failed, narrating with defaults:', e);
            setThinkingEvents((prev: ThinkingEvent[]) => [...prev, {
                type: 'LEARNING',
                content: `Knowledge layer initializing. Framework specifications (Cooper personas, Minto pyramid, Bitner blueprints, Rumelt strategy) and anti-pattern detection (48 cataloged failure modes) are active. Evidence base grows with each analysis run.`
            }]);
        }

        // P6-07: Load engagement memory for repeat clients
        try {
            const { loadEngagementMemory } = await import('./services/wikiService');
            const slug = researchGoal.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50);
            const memory = await loadEngagementMemory(slug, researchGoal);
            if (memory?.content) {
                wikiKnowledge += `\n\n=== PRIOR ENGAGEMENT MEMORY ===\nA previous research run with a similar goal was found:\n${memory.content}\nUse this context to build on prior work — don't repeat the same analysis.\n=== END ENGAGEMENT MEMORY ===\n`;
                setThinkingEvents(prev => [...prev, { type: 'INSIGHT', content: `[ENGAGEMENT MEMORY] Found prior research for this topic. Building on previous findings.` }]);
            }
        } catch (e) { /* non-blocking */ }

        // Create session with wiki knowledge injected into the system prompt
        sessionRef.current = new GenAISession(researchGoal, analysisApproach, selectedOutputs, lensSegment, wikiKnowledge);

        try {
            // --- SOURCE CURATION: Filter corpus by user's exclude toggles ---
            // Supports two key formats: "sourceId::j" (from SOURCE DETAIL panel)
            // and "kg::nodeId" (from knowledge graph). Both checked.
            if (excludedSources.size > 0 && liveSourceResults.length > 0) {
                // Build a set of excluded article titles from KG node exclusions
                // Build KG exclusion set: full title + 40-char prefix for robustness
                const kgExcludedTitlesFull = new Set<string>();
                const kgExcludedTitlesShort = new Set<string>();
                if (knowledgeGraph?.nodes) {
                    for (const key of Array.from(excludedSources) as string[]) {
                        if (key.startsWith('kg::')) {
                            const nodeId = key.substring(4);
                            const node = knowledgeGraph.nodes.find((n: any) => n.id === nodeId);
                            if (node?.label) {
                                kgExcludedTitlesFull.add(node.label.toLowerCase().trim());
                                kgExcludedTitlesShort.add(node.label.toLowerCase().substring(0, 40));
                            }
                        }
                    }
                }

                const filteredCorpus = liveSourceResults.flatMap(src =>
                    (src.items || []).filter((item: any, j: number) => {
                        // Check direct source detail exclusion (sourceId::j format)
                        if (excludedSources.has(`${src.sourceId}::${j}`)) return false;
                        // Check KG-based exclusion: full title match OR 40-char prefix match
                        if ((kgExcludedTitlesFull.size > 0 || kgExcludedTitlesShort.size > 0) && item.title) {
                            const titleLower = item.title.toLowerCase().trim();
                            if (kgExcludedTitlesFull.has(titleLower)) return false;
                            if (kgExcludedTitlesShort.has(titleLower.substring(0, 40))) return false;
                        }
                        return true;
                    })
                    .map((item: any) =>
                        `=== ${src.source || src.sourceId} (T${src.credibilityTier || 3}) ===\n${item.title}\n${item.content || ''}`
                    )
                ).join('\n\n');

                if (filteredCorpus.trim().length > 0) {
                    corpusTextRef.current = filteredCorpus;
                    const base64 = btoa(unescape(encodeURIComponent(filteredCorpus)));
                    // Replace intelligence_sources file with filtered version
                    collectedDataFiles = collectedDataFiles.filter((f: any) => !f.name.startsWith('intelligence_sources_'));
                    collectedDataFiles.push({
                        name: `intelligence_sources_curated_${Date.now()}.txt`,
                        type: 'text/plain',
                        size: filteredCorpus.length,
                        data: base64,
                    });
                    console.log(`[SourceCuration] ${excludedSources.size} items excluded, corpus filtered to ${Math.round(filteredCorpus.length / 1024)}KB`);
                }
            }

            // STEP 1: Ingestion (with collected data merged in)
            setStatusMessage("Reading & Contextualizing...");
            setActiveStage(AnalysisStage.INGESTION);
            const ingestion = await sessionRef.current.ingestContext(collectedDataFiles, handleStreamUpdate);
            setIngestionResult(ingestion);

            // Post-analysis confidence narration — explain WHY the score is what it is
            try {
                const { narrateConfidenceAssessment } = await import('./services/wikiNarrator');
                const confEvents = narrateConfidenceAssessment(ingestion);
                confEvents.forEach(e => setThinkingEvents((prev: ThinkingEvent[]) => [...prev, e]));
            } catch (e) { /* narration optional */ }

            setStatusMessage("Context verification required.");
        } catch (e: any) {
            console.error(e);
            const isNetworkError = e?.message?.includes('Failed to fetch') ||
                e?.message?.includes('NETWORK') ||
                e?.message?.includes('ECONNRESET') ||
                e?.message?.includes('network') ||
                e?.message?.includes('503') ||
                e?.message?.includes('overloaded');
            if (isNetworkError) {
                setStatusMessage("Network error during analysis. Your progress is saved — click Approve & Continue to retry from this step.");
            } else {
                setAppState(AppState.ERROR);
                setStatusMessage("Error during analysis. Please try again.");
                setActiveStage(AnalysisStage.IDLE);
            }
        }
    };

    const handleCheckpointApproval = async (feedback?: string, modifiedData?: any, interventionLog?: string) => {
        if (!sessionRef.current) return;
        
        if (interventionLog) {
             setThinkingEvents(prev => [...prev, { type: 'INTERVENTION', content: interventionLog }]);
        } else if (feedback) {
             setThinkingEvents(prev => [...prev, { type: 'INTERVENTION', content: feedback }]);
        } else if (modifiedData) {
             setThinkingEvents(prev => [...prev, { type: 'INTERVENTION', content: "Manual Data Edits Applied" }]);
        }

        // Build deck context for any deck-related checkpoint refinement
        const deckContext = {
            themes: themesResult?.themes,
            personas: personasResult?.personas,
            recommendations: recsResult?.recommendations,
            journeyStages: journeyResult?.stages,
            prd: prdResult as any,
            roadmap: roadmapResult as any,
            techArchitecture: techResult?.architecture,
            gapAnalysis: (gapResult as any)?.analysis,
            techAudit: (techAuditResult as any)?.audit,
            competitiveAnalysis: (competitiveResult as any)?.analysis,
        };

        if (!feedback) {
            setActiveStage(AnalysisStage.IDLE);
        }

        try {
            if (appState === AppState.SUCCESS) {
                console.log("Saving edits from Results View...", activeStage);
                if (modifiedData) {
                    if (activeStage === AnalysisStage.PERSONAS) {
                         setPersonasResult(modifiedData);
                         setResult((prev: any) => ({ ...prev, personas: modifiedData.personas }));
                         await sessionRef.current.updateContext("Personas", modifiedData);
                    } else if (activeStage === AnalysisStage.THEMES) {
                         setThemesResult(modifiedData);
                         setResult((prev: any) => ({ ...prev, themes: modifiedData.themes }));
                         await sessionRef.current.updateContext("Themes", modifiedData);
                    } else if (activeStage === AnalysisStage.JOURNEY_MAP) {
                         setJourneyResult(modifiedData);
                         setResult((prev: any) => ({ ...prev, journeyMap: modifiedData.stages }));
                         if (modifiedData.stages) {
                            const resultWithDiagram = await sessionRef.current.generateJourneyMap("Regenerate diagram only based on updated stages", handleStreamUpdate);
                             setJourneyResult((prev:any) => ({...prev, diagramUrl: resultWithDiagram.diagramUrl}));
                             setResult((prev: any) => ({ ...prev, journeyMap: modifiedData.stages, journeyMapDiagramUrl: resultWithDiagram.diagramUrl }));
                         }
                    } else if (activeStage === AnalysisStage.PRD) {
                        setPrdResult(modifiedData);
                        setResult((prev: any) => ({ ...prev, prd: modifiedData.prd }));
                    } else if (activeStage === AnalysisStage.ROADMAP) {
                        setRoadmapResult(modifiedData);
                        setResult((prev: any) => ({ ...prev, roadmap: modifiedData.roadmap }));
                    } else if (activeStage === AnalysisStage.TECH_ARCH) {
                        setTechResult(modifiedData);
                        setResult((prev: any) => ({ ...prev, techArchitecture: modifiedData.architecture }));
                         if (modifiedData.architecture) {
                            const resultWithDiagram = await sessionRef.current.generateTechArchitecture("Regenerate diagram only", handleStreamUpdate);
                             setTechResult((prev:any) => ({...prev, architecture: {...prev.architecture, diagramUrl: resultWithDiagram.architecture.diagramUrl}}));
                             setResult((prev: any) => ({ ...prev, techArchitecture: { ...modifiedData.architecture, diagramUrl: resultWithDiagram.architecture.diagramUrl } }));
                         }
                    } else if (activeStage === AnalysisStage.RECOMMENDATIONS) {
                        setRecsResult(modifiedData);
                        setResult((prev: any) => ({ ...prev, recommendations: modifiedData.recommendations }));
                    } else if (activeStage === AnalysisStage.DECK_STRUCTURE) {
                        setStructureResult(modifiedData);
                    } else if (activeStage === AnalysisStage.NARRATIVE) {
                        setNarrativeResult(modifiedData);
                    }
                }
                
                if (feedback) setActiveStage(AnalysisStage.IDLE); 
                return;
            }

            // --- STANDARD LINEAR FLOW ---
            // P1-01: ALL stages call updateContext when data is modified
            // P1-02: Downstream steps receive edited data as explicit parameters
            // P1-03: Context refresh before generation ensures Gemini has latest state

            if (activeStage === AnalysisStage.INGESTION) {
                setStatusMessage("Identifying Patterns...");
                const themes = await sessionRef.current.generateThemes(feedback, handleStreamUpdate);
                setThemesResult(themes);
                setStatusMessage("Themes Identified");
                setActiveStage(AnalysisStage.THEMES);
            }
            else if (activeStage === AnalysisStage.THEMES) {
                if (modifiedData) {
                    setThemesResult(modifiedData);
                    await sessionRef.current.updateContext("Themes", modifiedData);
                }
                if (feedback) {
                    setStatusMessage("Refining Themes...");
                    const themes = await sessionRef.current.generateThemes(feedback, handleStreamUpdate);
                    setThemesResult(themes);
                    setStatusMessage("Themes Refined");
                    return;
                }
                if (selectedOutputs.includes('PERSONAS')) {
                    setStatusMessage("Synthesizing Personas...");
                    // P1-02: Pass current (possibly edited) themes as explicit parameter
                    const currentThemes = modifiedData || themesResult;
                    const personas = await sessionRef.current.generatePersonas(currentThemes, undefined, handleStreamUpdate, setStatusMessage);
                    setPersonasResult(personas);
                    setStatusMessage("Personas Generated");
                    setActiveStage(AnalysisStage.PERSONAS);
                } else {
                    advanceToNextStage();
                }
            }
            else if (activeStage === AnalysisStage.PERSONAS) {
                 if (modifiedData) {
                      setPersonasResult(modifiedData);
                      await sessionRef.current.updateContext("Personas", modifiedData);
                 }
                 if (feedback) {
                      setStatusMessage("Refining Personas...");
                      const personas = await sessionRef.current.generatePersonas(themesResult, feedback, handleStreamUpdate, setStatusMessage);
                      setPersonasResult(personas);
                      setStatusMessage("Personas Refined");
                      return;
                 }
                 // P1-03: Refresh context with current personas before advancing
                 const currentPersonas = modifiedData || personasResult;
                 if (currentPersonas) await sessionRef.current.updateContext("Personas (approved)", currentPersonas);
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.JOURNEY_MAP) {
                 if (modifiedData) {
                     setJourneyResult(modifiedData);
                     await sessionRef.current.updateContext("Journey Map", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining Blueprint...");
                      const res = await sessionRef.current.generateJourneyMap(feedback, handleStreamUpdate);
                      setJourneyResult(res);
                      setStatusMessage("Blueprint Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.TECH_ARCH) {
                 if (modifiedData) {
                     setTechResult(modifiedData);
                     await sessionRef.current.updateContext("Tech Architecture", modifiedData); // P1-01: was missing updateContext on linear flow
                 }
                 if (feedback) {
                      setStatusMessage("Refining Architecture...");
                      const res = await sessionRef.current.generateTechArchitecture(feedback, handleStreamUpdate);
                      setTechResult(res);
                      setStatusMessage("Architecture Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.PRD) {
                 if (modifiedData) {
                     setPrdResult(modifiedData);
                     await sessionRef.current.updateContext("PRD", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining PRD...");
                      const res = await sessionRef.current.generatePRD(feedback, handleStreamUpdate);
                      setPrdResult(res);
                      setStatusMessage("PRD Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.ROADMAP) {
                 if (modifiedData) {
                     setRoadmapResult(modifiedData);
                     await sessionRef.current.updateContext("Roadmap", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining Roadmap...");
                      const res = await sessionRef.current.generateRoadmap(feedback, handleStreamUpdate);
                      setRoadmapResult(res);
                      setStatusMessage("Roadmap Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.RECOMMENDATIONS) {
                 if (modifiedData) {
                     setRecsResult(modifiedData);
                     await sessionRef.current.updateContext("Recommendations", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining Strategy...");
                      const res = await sessionRef.current.generateRecommendations(feedback, handleStreamUpdate);
                      setRecsResult(res);
                      setStatusMessage("Strategy Refined");
                      return;
                 }
                 // P1-03: Refresh context with current recs before deck generation
                 const currentRecs = modifiedData || recsResult;
                 if (currentRecs) await sessionRef.current.updateContext("Recommendations (approved)", currentRecs);
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.STRATEGIC_REPORT) {
                 if (modifiedData) {
                     setStrategicReportResult(modifiedData);
                     await sessionRef.current.updateContext("Strategic Report", modifiedData);
                 }
                 if (feedback) {
                      setStatusMessage("Refining Strategic Report...");
                      const deckCtx = {
                          themes: themesResult?.themes, personas: personasResult?.personas,
                          recommendations: recsResult?.recommendations, journeyStages: journeyResult?.stages,
                          prd: prdResult as any, roadmap: roadmapResult as any,
                          techArchitecture: techResult?.architecture,
                          gapAnalysis: (gapResult as any)?.analysis, techAudit: (techAuditResult as any)?.audit,
                          competitiveAnalysis: (competitiveResult as any)?.analysis,
                      };
                      // Filter by user curation decisions — only included sources reach the report
                      const curatedSrcs = liveSourceResults.map(src => {
                          if (!excludedSources.size && !prioritySources.size) return src;
                          const filteredItems = (src.items || []).map((item: any, j: number) => ({
                              ...item,
                              _origIdx: j,
                              priority: prioritySources.has(`${src.sourceId}::${j}`)
                          })).filter((item: any) =>
                              !excludedSources.has(`${src.sourceId}::${item._origIdx}`)
                          );
                          return { ...src, items: filteredItems };
                      }).filter(src => src.items && src.items.length > 0);
                      const res = await sessionRef.current.generateStrategicReport(deckCtx, feedback, handleStreamUpdate, curatedSrcs);
                      setStrategicReportResult(res);
                      setStatusMessage("Report Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.DECK_STRUCTURE) {
                 if (modifiedData) {
                     setStructureResult(modifiedData);
                     await sessionRef.current.updateContext("Deck Structure", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining Structure...");
                      const res = await sessionRef.current.generateDeckStructure(feedback, deckContext, handleStreamUpdate);
                      setStructureResult(res);
                      setStatusMessage("Structure Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.NARRATIVE) {
                 if (modifiedData) {
                     setNarrativeResult(modifiedData);
                     await sessionRef.current.updateContext("Narrative", modifiedData); // P1-01: was missing
                 }
                 if (feedback) {
                      setStatusMessage("Refining Narrative...");
                      const res = await sessionRef.current.generateNarrative(structureResult, deckContext, feedback, handleStreamUpdate);
                      setNarrativeResult(res);
                      setStatusMessage("Narrative Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else {
                advanceToNextStage();
            }

        } catch (e: any) {
            console.error("Checkpoint Logic Error", e);
            const isNetworkError = e?.message?.includes('Failed to fetch') ||
                e?.message?.includes('NETWORK') ||
                e?.message?.includes('ECONNRESET') ||
                e?.message?.includes('network') ||
                e?.message?.includes('socket hang up') ||
                e?.message?.includes('503') ||
                e?.message?.includes('overloaded');
            if (isNetworkError) {
                // Network transient — don't kill the app, let user retry from checkpoint
                setStatusMessage("Network error — click Approve & Continue to retry.");
            } else {
                setStatusMessage("Error proceeding. Please try again.");
                setAppState(AppState.ERROR);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--nxt-lime)] selection:text-white overflow-hidden flex flex-col">
             
             {/* HEADER */}
             <div className="flex justify-between items-center px-8 py-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] z-20">
                 <Logo />
                 <div className="flex gap-4 items-center">
                     <button onClick={() => window.open('/documentation.html', '_blank')} className="text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Documentation</button>
                     <button className="text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Support</button>
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--nxt-teal)] to-[var(--nxt-lime)]"></div>
                 </div>
             </div>
             
             {/* NOTIFICATION */}
             <AnimatePresence>
                 {notification && (
                     <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-[var(--nxt-teal)] text-white px-6 py-2 rounded-full shadow-none z-50 font-bold text-sm">
                         {notification}
                     </motion.div>
                 )}
             </AnimatePresence>

             {/* MAIN CONTENT AREA */}
             <div className="flex-1 relative overflow-hidden flex flex-col">
                  
                  {/* IDLE: LANDING / CONFIGURATION */}
                  {appState === AppState.IDLE && (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in relative">
                           {/* IA Brand Header */}
                           <div className="absolute top-0 left-0 right-0 h-60 bg-[var(--nxt-teal)] overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-2/5" style={{background: 'linear-gradient(45deg, rgba(253,142,46,0.08), rgba(253,142,46,0.2))'}}></div>
                                <div className="flex flex-col items-center justify-center h-full relative z-10">
                                     <img src="/logo.png" alt="NXT Humans" className="h-12 object-contain mb-4" style={{filter: 'invert(1)'}} />
                                     <div className="text-center">
                                          <span className="text-4xl font-extralight text-white tracking-tight">Intelligence </span>
                                          <span className="text-4xl font-extralight text-[var(--nxt-orange)] tracking-tight">Augmentation</span>
                                     </div>
                                </div>
                           </div>
                           
                           <div className="w-full max-w-4xl z-10">
                                <div className="text-center mb-12 mt-64">
                                     <h1 className="text-5xl md:text-6xl font-extralight mb-6 tracking-tight leading-tight text-[var(--text-primary)]">
                                         Humans in Control <br/>
                                         <span className="text-[var(--nxt-teal)]">Research</span>
                                     </h1>
                                     <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed font-light">
                                         Transform raw research into personas, journey maps, PRDs, and strategic narratives with human oversight at every stage.
                                     </p>

                                     {/* Mode Toggle */}
                                     <div className="flex justify-center gap-3 mt-8">
                                         <button
                                             onClick={() => setAppMode('research')}
                                             className={`px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all ${appMode === 'research' ? 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--nxt-lime)]'}`}
                                         >
                                             Research Analysis
                                         </button>
                                         <button
                                             onClick={() => setAppMode('heuristic')}
                                             className={`px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all ${appMode === 'heuristic' ? 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--nxt-lime)]'}`}
                                         >
                                             UX Heuristic Analysis
                                         </button>
                                     </div>
                                </div>

                                {/* RESEARCH MODE */}
                                {appMode === 'research' && (
                                <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-8 shadow-none mb-12">
                                     <div className="mb-8">
                                         <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Research Goal</label>
                                         <input 
                                             value={researchGoal} 
                                             onChange={(e) => setResearchGoal(e.target.value)}
                                             className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded p-4 text-lg font-medium focus:ring-2 focus:ring-[var(--nxt-teal)] outline-none transition-all"
                                             placeholder="e.g. Understand the pain points of remote workers..."
                                         />
                                     </div>
                                     
                                     {/* Research method, analytical lens, visualization style, and design system are all
                                         auto-selected by the intelligence engine. No manual selectors needed.
                                         The reasoning stream narrates what was chosen and why. */}

                                     <div className="grid md:grid-cols-2 gap-8 mb-8">
                                          <div className="flex-1">
                                              <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Output Artifacts</label>
                                              <div className="grid grid-cols-2 gap-2">
                                                   {(['PERSONAS', 'STRATEGY_DECK', 'JOURNEY_MAP', 'TECH_ARCH', 'PRD', 'ROADMAP', 'STRATEGIC_RECS', 'GAP_ANALYSIS', 'TECH_AUDIT', 'COMPETITIVE_ANALYSIS'] as OutputOption[]).map(opt => {
                                                       const labels: Record<string, string> = {
                                                           'PERSONAS': 'Personas', 'STRATEGY_DECK': 'Deck',
                                                           'JOURNEY_MAP': 'Blueprint', 'TECH_ARCH': 'Architecture', 'PRD': 'PRD',
                                                           'ROADMAP': 'Roadmap', 'STRATEGIC_RECS': 'Strategy',
                                                           'GAP_ANALYSIS': 'Gap Analysis', 'TECH_AUDIT': 'Tech Audit', 'COMPETITIVE_ANALYSIS': 'Competitive',
                                                       };
                                                       return (
                                                       <button
                                                           key={opt}
                                                           onClick={() => {
                                                               if (selectedOutputs.includes(opt)) setSelectedOutputs(selectedOutputs.filter(o => o !== opt));
                                                               else setSelectedOutputs([...selectedOutputs, opt]);
                                                           }}
                                                           className={`text-xs font-bold uppercase tracking-wide py-3 px-2 rounded border transition-all flex items-center justify-center gap-2 ${selectedOutputs.includes(opt) ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--nxt-lime-20)]'}`}
                                                       >
                                                           {labels[opt] || opt}
                                                           <span
                                                               onClick={(e) => { e.stopPropagation(); setShowMethodology(opt); }}
                                                               className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[8px] hover:bg-gray-300"
                                                           >?</span>
                                                       </button>
                                                       );
                                                   })}
                                              </div>
                                          </div>
                                          <FileUpload onFilesSelected={(newFiles) => setFiles(prev => [...prev, ...newFiles])} isLoading={false} />
                                          {/* Show uploaded files */}
                                          {files.length > 0 && (
                                              <div className="mt-2 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                                                  <div className="flex justify-between items-center mb-2">
                                                      <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--nxt-teal)]">{files.length} file{files.length !== 1 ? 's' : ''} uploaded</span>
                                                      <button onClick={() => setFiles([])} className="text-[9px] text-red-400 hover:text-red-600">Clear all</button>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {files.map((f, i) => (
                                                          <div key={i} className="flex items-center gap-1.5 bg-white border border-[var(--border-primary)] rounded px-2 py-1 text-[10px]">
                                                              <i className={`fas ${f.name.endsWith('.pdf') ? 'fa-file-pdf text-red-400' : f.name.endsWith('.json') ? 'fa-file-code text-blue-400' : 'fa-file-alt text-gray-400'}`}></i>
                                                              <span className="truncate max-w-[150px]">{f.name}</span>
                                                              <span className="text-[var(--text-tertiary)]">({Math.round(f.size / 1024)}KB)</span>
                                                              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 ml-1">x</button>
                                                          </div>
                                                      ))}
                                                  </div>
                                                  {hasDataSources && (
                                                      <div className="mt-2 text-[10px] text-[var(--nxt-teal)] bg-[var(--nxt-lime-10)] px-2 py-1 rounded">
                                                          These files will be COMBINED with intelligence data sources below into a unified research corpus.
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                     </div>

                                     {/* === DATA SOURCING PANEL === */}
                                     <div className="mb-8 border border-[var(--border-primary)] rounded p-6 bg-[var(--bg-secondary)]">
                                         <label className="block text-xs font-bold uppercase text-[var(--nxt-teal)] tracking-widest mb-4">
                                             <i className="fas fa-satellite-dish mr-2"></i>Intelligence Data Sources (Optional)
                                         </label>
                                         <p className="text-xs text-[var(--text-tertiary)] mb-4">Enrich your uploaded documents with live data from AI deep research, news, academic papers, social platforms, and more.</p>

                                         {/* AI Deep Research */}
                                         <div className="mb-4">
                                             <div className="flex items-center gap-3 mb-2">
                                                 <button onClick={() => setEnableDeepResearch(!enableDeepResearch)} className={`w-5 h-5 rounded-sm border flex items-center justify-center text-xs ${enableDeepResearch ? 'bg-[var(--nxt-lime)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'border-[var(--border-primary)] bg-white'}`}>{enableDeepResearch ? '✓' : ''}</button>
                                                 <span className="text-sm font-bold">AI Deep Research</span>
                                                 <span className="tag">Claude / Gemini / OpenAI</span>
                                             </div>
                                             {enableDeepResearch && (
                                                 <div className="ml-8 flex gap-2">
                                                     {(['quick', 'focused', 'deep'] as const).map(mode => (
                                                         <button key={mode} onClick={() => setDeepResearchMode(mode)}
                                                             className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border transition-all ${deepResearchMode === mode ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'bg-white border-[var(--border-primary)] text-[var(--text-tertiary)]'}`}>
                                                             {mode} {mode === 'quick' ? '(~10s)' : mode === 'focused' ? '(~1min)' : '(~15min)'}
                                                         </button>
                                                     ))}
                                                 </div>
                                             )}
                                         </div>

                                         {/* Source Toggles Grid */}
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                             {[
                                                 { label: 'Higher-Ed News', sublabel: '10 RSS feeds (Inside Higher Ed, EdSurge...)', state: enableHigherEdNews, setter: setEnableHigherEdNews, icon: 'fa-university' },
                                                 { label: 'Global News', sublabel: 'GDELT 65+ language monitoring', state: enableNews, setter: setEnableNews, icon: 'fa-newspaper' },
                                                 { label: 'Academic Papers', sublabel: 'OpenAlex, Crossref, Semantic Scholar, CORE', state: enableAcademic, setter: setEnableAcademic, icon: 'fa-graduation-cap' },
                                                 { label: 'Education Data', sublabel: 'College Scorecard, ERIC, IPEDS', state: enableEducationData, setter: setEnableEducationData, icon: 'fa-school' },
                                                 { label: 'Economic Data', sublabel: 'World Bank, FRED, BLS, IMF', state: enableEconomic, setter: setEnableEconomic, icon: 'fa-chart-line' },
                                                 { label: 'Government', sublabel: 'USAspending, Federal Register, SEC, Congress', state: enableGovernment, setter: setEnableGovernment, icon: 'fa-landmark' },
                                                 { label: 'Open Data Portals', sublabel: 'Data.gov, NYC, UK, California', state: enableOpenData, setter: setEnableOpenData, icon: 'fa-database' },
                                                 { label: 'Tech & Social', sublabel: 'Hacker News discussions', state: enableSocialTrends, setter: setEnableSocialTrends, icon: 'fa-hashtag' },
                                                 { label: 'YouTube Videos', sublabel: 'Video search via proxy', state: enableYouTube, setter: setEnableYouTube, icon: 'fa-play-circle' },
                                                 { label: 'Social Listening', sublabel: 'Reddit / TrustPilot / Play Store', state: enableCxMesh, setter: setEnableCxMesh, icon: 'fa-comments' },
                                                 { label: 'AI News & Labs', sublabel: '20 sources: MIT, IEEE, OpenAI, DeepMind...', state: enableAINews, setter: setEnableAINews, icon: 'fa-robot' },
                                                 { label: 'AI Research & Code', sublabel: 'arXiv, HuggingFace, GitHub, Policy...', state: enableAIResearch, setter: setEnableAIResearch, icon: 'fa-brain' },
                                             ].map(src => (
                                                 <button key={src.label} onClick={() => src.setter(!src.state)}
                                                     className={`flex items-center gap-3 p-3 rounded border text-left transition-all ${src.state ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)]' : 'bg-white border-[var(--border-primary)] hover:border-[var(--nxt-lime-20)]'}`}>
                                                     <i className={`fas ${src.icon} ${src.state ? 'text-[var(--nxt-teal)]' : 'text-[var(--text-tertiary)]'}`}></i>
                                                     <div>
                                                         <div className={`text-xs font-bold ${src.state ? 'text-[var(--nxt-teal)]' : 'text-[var(--text-secondary)]'}`}>{src.label}</div>
                                                         <div className="text-[10px] text-[var(--text-tertiary)]">{src.sublabel}</div>
                                                     </div>
                                                 </button>
                                             ))}
                                         </div>

                                         {/* Social Listening Targets */}
                                         {enableCxMesh && (
                                             <div className="ml-0 mb-4 p-3 bg-white rounded border border-[var(--border-primary)]">
                                                 <label className="block text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Subreddits (comma-separated, AI will also suggest more)</label>
                                                 <input value={subredditTargets} onChange={e => setSubredditTargets(e.target.value)}
                                                     className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-2 text-xs mb-2 outline-none focus:ring-1 focus:ring-[var(--nxt-teal)]"
                                                     placeholder="e.g. customerservice, userexperience, saas" />
                                                 <label className="block text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-1">TrustPilot Companies (comma-separated, optional)</label>
                                                 <input value={trustpilotTargets} onChange={e => setTrustpilotTargets(e.target.value)}
                                                     className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-2 text-xs outline-none focus:ring-1 focus:ring-[var(--nxt-teal)]"
                                                     placeholder="e.g. amazon.com, shopify.com" />
                                             </div>
                                         )}

                                         {/* Web URLs */}
                                         <div className="mb-4">
                                             <label className="block text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Web Pages to Analyze (one URL per line, optional)</label>
                                             <textarea value={webUrls} onChange={e => setWebUrls(e.target.value)}
                                                 className="w-full bg-white border border-[var(--border-primary)] rounded p-2 text-xs h-16 outline-none focus:ring-1 focus:ring-[var(--nxt-teal)] resize-none"
                                                 placeholder="https://competitor.com/pricing&#10;https://example.com/report" />
                                         </div>

                                         {/* YouTube URLs for Transcription */}
                                         {enableYouTube && (
                                             <div className="mb-4">
                                                 <label className="block text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-1">YouTube Videos to Transcribe (one URL per line, optional)</label>
                                                 <textarea value={videoUrls} onChange={e => setVideoUrls(e.target.value)}
                                                     className="w-full bg-white border border-[var(--border-primary)] rounded p-2 text-xs h-16 outline-none focus:ring-1 focus:ring-[var(--nxt-teal)] resize-none"
                                                     placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=..." />
                                             </div>
                                         )}

                                         {/* Status */}
                                         {hasDataSources && (
                                             <div className="text-xs text-[var(--nxt-teal)] bg-[var(--nxt-lime-10)] px-3 py-2 rounded border border-[var(--nxt-lime-20)]">
                                                 <i className="fas fa-info-circle mr-1"></i>
                                                 {[
                                                     enableDeepResearch && `AI ${deepResearchMode} research`,
                                                     enableNews && 'global news',
                                                     enableAcademic && 'academic papers',
                                                     enableEconomic && 'economic data',
                                                     enableSocialTrends && 'tech/social trends',
                                                     enableYouTube && 'YouTube videos',
                                                     enableCxMesh && 'social listening',
                                                     enableAINews && 'AI news & lab blogs',
                                                     enableAIResearch && 'AI research & code',
                                                     webUrls.trim() && 'web pages',
                                                     videoUrls.trim() && 'video transcripts',
                                                 ].filter(Boolean).join(', ')} will be collected and merged with your uploaded documents before analysis.
                                             </div>
                                         )}
                                         {dataSourceStatus && (
                                             <div className="mt-2 text-xs text-[var(--text-secondary)] animate-pulse">
                                                 <i className="fas fa-spinner fa-spin mr-1"></i>{dataSourceStatus}
                                             </div>
                                         )}
                                     </div>

                                     <button
                                         onClick={startAnalysis}
                                         disabled={files.length === 0 && !hasDataSources}
                                         className={`w-full py-4 rounded text-sm font-bold uppercase tracking-widest transition-all transform hover:scale-[1.01] active:scale-[0.99] ${(files.length > 0 || hasDataSources) ? 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)] hover:brightness-110' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                     >
                                         {(files.length > 0 || hasDataSources) ? (hasDataSources ? 'Collect Data & Initialize Analysis' : 'Initialize Analysis Agent') : 'Upload Data or Enable Sources to Begin'}
                                     </button>
                                </div>
                                )}

                                {/* HEURISTIC MODE */}
                                {appMode === 'heuristic' && (
                                    <HeuristicBriefIntake onSubmit={handleHeuristicSubmit} isAnalyzing={isHeuristicAnalyzing} />
                                )}

                                {/* Saved Projects List */}
                                {savedProjects.length > 0 && (
                                    <div className="max-w-4xl mx-auto">
                                        <h3 className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-4 text-center">Previous Sessions</h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {savedProjects.slice(0, 3).map(p => (
                                                <div key={p.id} onClick={() => loadProject(p)} className="bg-[var(--card-bg)] border border-[var(--border-primary)] p-4 rounded cursor-pointer hover:border-[var(--nxt-teal)] transition-all group relative">
                                                     <div className="text-sm font-bold mb-1 truncate pr-6">{p.name}</div>
                                                     <div className="text-xs text-[var(--text-tertiary)]">{new Date(p.createdAt).toLocaleDateString()}</div>
                                                     <button 
                                                         onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                                                         className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                     >
                                                         ✕
                                                     </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                           </div>
                      </div>
                  )}

                  {/* ANALYZING STATE */}
                  {appState === AppState.ANALYZING && (
                      <div className="flex-1 p-8 bg-[var(--bg-primary)] h-full overflow-hidden flex flex-col">
                           <LiveResearchBoard
                               ingestion={ingestionResult}
                               themes={themesResult}
                               personas={personasResult}
                               journeyMap={journeyResult}
                               prd={prdResult}
                               roadmap={roadmapResult}
                               techArch={techResult}
                               recommendations={recsResult}
                               structure={structureResult}
                               events={thinkingEvents}
                               currentStatus={statusMessage}
                               isCollectingData={isCollectingData}
                               collectionPhase={collectionPhase}
                               liveSourceResults={liveSourceResults}
                               liveRefinedQueries={liveRefinedQueries}
                               knowledgeGraph={knowledgeGraph}
                               excludedSources={excludedSources}
                               setExcludedSources={setExcludedSources}
                               prioritySources={prioritySources}
                               setPrioritySources={setPrioritySources}
                               onEdit={(stage) => {
                                   if (stage === AnalysisStage.INGESTION) setActiveStage(AnalysisStage.INGESTION);
                                   if (stage === AnalysisStage.THEMES) setActiveStage(AnalysisStage.THEMES);
                                   if (stage === AnalysisStage.PERSONAS) setActiveStage(AnalysisStage.PERSONAS);
                                   if (stage === AnalysisStage.JOURNEY_MAP) setActiveStage(AnalysisStage.JOURNEY_MAP);
                                   if (stage === AnalysisStage.TECH_ARCH) setActiveStage(AnalysisStage.TECH_ARCH);
                                   if (stage === AnalysisStage.PRD) setActiveStage(AnalysisStage.PRD);
                                   if (stage === AnalysisStage.ROADMAP) setActiveStage(AnalysisStage.ROADMAP);
                                   if (stage === AnalysisStage.RECOMMENDATIONS) setActiveStage(AnalysisStage.RECOMMENDATIONS);
                                   if (stage === AnalysisStage.DECK_STRUCTURE) setActiveStage(AnalysisStage.DECK_STRUCTURE);
                               }}
                           />
                           
                           {/* Human-in-the-Loop Checkpoint Modal */}
                           <AnimatePresence>
                               {activeStage !== AnalysisStage.IDLE && (
                                   <motion.div 
                                       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                       className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                                   >
                                       <AnalysisCheckpoint 
                                           stage={activeStage}
                                           data={
                                               activeStage === AnalysisStage.INGESTION ? ingestionResult :
                                               activeStage === AnalysisStage.THEMES ? themesResult :
                                               activeStage === AnalysisStage.PERSONAS ? personasResult :
                                               activeStage === AnalysisStage.JOURNEY_MAP ? journeyResult :
                                               activeStage === AnalysisStage.TECH_ARCH ? techResult :
                                               activeStage === AnalysisStage.PRD ? prdResult :
                                               activeStage === AnalysisStage.ROADMAP ? roadmapResult :
                                               activeStage === AnalysisStage.RECOMMENDATIONS ? recsResult :
                                               activeStage === AnalysisStage.STRATEGIC_REPORT ? strategicReportResult :
                                               activeStage === AnalysisStage.DECK_STRUCTURE ? structureResult :
                                               activeStage === AnalysisStage.NARRATIVE ? narrativeResult :
                                               activeStage === AnalysisStage.GAP_ANALYSIS ? gapResult :
                                               activeStage === AnalysisStage.TECH_AUDIT_STAGE ? techAuditResult :
                                               activeStage === AnalysisStage.COMPETITIVE_ANALYSIS ? competitiveResult :
                                               null
                                           }
                                           isProcessing={statusMessage.includes('...')}
                                           onApprove={handleCheckpointApproval}
                                           currentLog={thinkingEvents.length > 0 ? thinkingEvents[thinkingEvents.length - 1].content : ""}
                                           onClose={appState === AppState.ERROR ? () => setActiveStage(AnalysisStage.IDLE) : undefined}
                                       />
                                   </motion.div>
                               )}
                           </AnimatePresence>
                      </div>
                  )}

                  {/* SUCCESS / RESULTS VIEW */}
                  {appState === AppState.SUCCESS && result && appMode === 'research' && (
                      <ResultsView
                          result={result}
                          onReset={handleReset}
                          onSave={handleSaveProject}
                          onEdit={(stage) => {
                              setActiveStage(stage);
                              setStatusMessage("Editing Data");
                          }}
                      />
                  )}
                  {appState === AppState.SUCCESS && heuristicReport && appMode === 'heuristic' && (
                      <HeuristicReportView
                          report={heuristicReport}
                          screenshots={heuristicScreenshots}
                          onReset={resetHeuristic}
                      />
                  )}
             </div>

             {/* INFO MODALS */}
             <AnimatePresence>
                 {showMethodology && <MethodologyModal outputId={showMethodology} onClose={() => setShowMethodology(null)} />}
             </AnimatePresence>

        </div>
    );
};

export default App;
