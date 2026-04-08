
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
import { buildSourceGraph, addThemesToGraph, addPersonasToGraph, addRecommendationsToGraph, KnowledgeGraph as KGType } from './services/knowledgeGraphBuilder';
import { runHeuristicAnalysis } from './services/heuristicAnalysisService';
import { DEFAULT_MODELS } from './services/aiRouter';
import { AppState, FileUpload as FileType, AnalysisResult, AnalysisStage, SavedProject, OutputOption, UXBrief, HeuristicReport, AnalyticalLens, ANALYTICAL_LENS_LABELS, ResearchMethodId } from './types';
import { RESEARCH_METHODS } from './services/methods/MethodExecutor';
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
    'VIDEO_SCRIPT': {
        title: "Video Script",
        role: "Creative Director",
        description: "Translates insights into a cinematic storyboard. It writes scene-by-scene direction, voiceover scripts, and generates visual prompts for a mood film.",
        steps: ["Ingestion", "Themes", "Structure", "Script", "Storyboard"]
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
}: {
    ingestion?: any, themes?: any, personas?: any, journeyMap?: any, prd?: any, roadmap?: any, techArch?: any, recommendations?: any, structure?: any,
    events: ThinkingEvent[], currentStatus: string,
    onEdit: (stage: AnalysisStage) => void,
    isCollectingData?: boolean, collectionPhase?: string, liveSourceResults?: any[], liveRefinedQueries?: Record<string, string>,
    knowledgeGraph?: KGType,
}) => {
    const streamEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [events]);

    return (
        <div className="w-full max-w-[90rem] mx-auto pb-24 animate-fade-in flex gap-6 h-[85vh]">
            
            {/* LEFT: Tiles Grid */}
            <div className="flex-1 overflow-y-auto pr-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">

                    {/* SOURCES COLLECTED TILE */}
                    {liveSourceResults && liveSourceResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-5 shadow-sm md:col-span-2">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--nxt-teal)]">Intelligence Sources</h3>
                                    <div className="text-[10px] text-[var(--text-tertiary)]">{liveSourceResults.filter(s => s.status === 'complete').length} of {liveSourceResults.length} sources returned data</div>
                                </div>
                                <span className="text-lg font-extralight text-[var(--nxt-teal)]">{liveSourceResults.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)} items</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {liveSourceResults.map((src: any, i: number) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border ${
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

                    {/* KNOWLEDGE GRAPH — immediately after sources for maximum visibility */}
                    {knowledgeGraph && knowledgeGraph.nodes.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded shadow-sm md:col-span-2 relative overflow-hidden">
                            <ResearchKnowledgeGraph graph={knowledgeGraph} height={420} />
                        </motion.div>
                    )}

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

            {/* RIGHT: Live Source Feed OR Thinking Stream */}
            <div className="w-[420px] flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded flex flex-col overflow-hidden shadow-none h-full">
                {/* Show Live Source Feed during collection OR when sources were collected and no ingestion yet */}
                {(isCollectingData || (liveSourceResults && liveSourceResults.length > 0 && !ingestion)) ? (
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
                {/* Standard Reasoning Stream */}
                <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentStatus.includes('...') ? 'bg-[var(--nxt-lime)] animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Reasoning Stream</span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">{currentStatus || "System Ready"}</p>
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
    const [selectedLens, setSelectedLens] = useState<AnalyticalLens>('general_cx');
    const [selectedMethod, setSelectedMethod] = useState<ResearchMethodId>('general_synthesis');

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
    const [liveRefinedQueries, setLiveRefinedQueries] = useState<Record<string, string>>({});
    const [knowledgeGraph, setKnowledgeGraph] = useState<KGType>({ nodes: [], edges: [] });
    const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);

    const hasDataSources = enableDeepResearch || enableNews || enableAcademic || enableEconomic || enableSocialTrends || enableYouTube || enableCxMesh || enableHigherEdNews || enableEducationData || enableGovernment || enableOpenData || enableAINews || enableAIResearch || webUrls.trim().length > 0 || videoUrls.trim().length > 0;

    const sessionRef = useRef<GenAISession | null>(null);

    // Build initial knowledge graph when data collection completes
    useEffect(() => {
        if (collectionPhase === 'complete' && liveSourceResults.length > 0 && knowledgeGraph.nodes.length === 0) {
            const sourceGraph = buildSourceGraph(liveSourceResults);
            setKnowledgeGraph(sourceGraph);
        }
    }, [collectionPhase, liveSourceResults]);

    // Expand knowledge graph as pipeline progresses
    useEffect(() => {
        if (themesResult?.themes && knowledgeGraph.nodes.length > 0) {
            setKnowledgeGraph(prev => addThemesToGraph(prev, themesResult.themes));
        }
    }, [themesResult]);

    useEffect(() => {
        if (personasResult?.personas && knowledgeGraph.nodes.length > 0) {
            setKnowledgeGraph(prev => addPersonasToGraph(prev, personasResult.personas));
        }
    }, [personasResult]);

    useEffect(() => {
        if (recsResult?.recommendations && knowledgeGraph.nodes.length > 0) {
            setKnowledgeGraph(prev => addRecommendationsToGraph(prev, recsResult.recommendations));
        }
    }, [recsResult]);

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
        setStructureResult(null);
        setNarrativeResult(null);
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

    const advanceToNextStage = async () => {
        if (!sessionRef.current) return;
        
        // 1. PERSONAS
        if (selectedOutputs.includes('PERSONAS') && !personasResult) {
            setStatusMessage("Synthesizing Personas...");
            const personas = await sessionRef.current.generatePersonas(themesResult, undefined, handleStreamUpdate, setStatusMessage);
            setPersonasResult(personas);
            setStatusMessage("Personas Generated");
            setActiveStage(AnalysisStage.PERSONAS);
            return;
        }

        // 2. JOURNEY MAP
        if (selectedOutputs.includes('JOURNEY_MAP') && !journeyResult) {
             setStatusMessage("Mapping Journey...");
             const journey = await sessionRef.current.generateJourneyMap(undefined, handleStreamUpdate);
             setJourneyResult(journey);
             setStatusMessage("Blueprint Drafted");
             setActiveStage(AnalysisStage.JOURNEY_MAP);
             return;
        }

        // 3. TECH ARCH
        if (selectedOutputs.includes('TECH_ARCH') && !techResult) {
             setStatusMessage("Architecting System...");
             const tech = await sessionRef.current.generateTechArchitecture(undefined, handleStreamUpdate);
             setTechResult(tech);
             setStatusMessage("Architecture Drafted");
             setActiveStage(AnalysisStage.TECH_ARCH);
             return;
        }

        // 4. PRD
        if ((selectedOutputs.includes('PRD') || selectedOutputs.includes('ROADMAP')) && !prdResult) {
             setStatusMessage("Defining Requirements...");
             const prd = await sessionRef.current.generatePRD(undefined, handleStreamUpdate);
             setPrdResult(prd);
             setStatusMessage("PRD Drafted");
             setActiveStage(AnalysisStage.PRD);
             return;
        }

        // 5. ROADMAP
        if (selectedOutputs.includes('ROADMAP') && !roadmapResult) {
             setStatusMessage("Planning Roadmap...");
             const roadmap = await sessionRef.current.generateRoadmap(undefined, handleStreamUpdate);
             setRoadmapResult(roadmap);
             setStatusMessage("Roadmap Drafted");
             setActiveStage(AnalysisStage.ROADMAP);
             return;
        }

        // 6. RECOMMENDATIONS
        if (selectedOutputs.includes('STRATEGIC_RECS') && !recsResult) {
             setStatusMessage("Formulating Strategy...");
             const recs = await sessionRef.current.generateRecommendations(undefined, handleStreamUpdate);
             setRecsResult(recs);
             setStatusMessage("Strategy Drafted");
             setActiveStage(AnalysisStage.RECOMMENDATIONS);
             return;
        }

        // 6a. GAP ANALYSIS
        if (selectedOutputs.includes('GAP_ANALYSIS') && !gapResult) {
             setStatusMessage("Analyzing Gaps...");
             const gap = await sessionRef.current.generateGapAnalysis(undefined, handleStreamUpdate);
             setGapResult(gap);
             setStatusMessage("Gap Analysis Complete");
             setActiveStage(AnalysisStage.GAP_ANALYSIS);
             return;
        }

        // 6b. TECH AUDIT
        if (selectedOutputs.includes('TECH_AUDIT') && !techAuditResult) {
             setStatusMessage("Auditing Technology Ecosystem...");
             const audit = await sessionRef.current.generateTechAudit(undefined, handleStreamUpdate);
             setTechAuditResult(audit);
             setStatusMessage("Tech Audit Complete");
             setActiveStage(AnalysisStage.TECH_AUDIT_STAGE);
             return;
        }

        // 6c. COMPETITIVE ANALYSIS
        if (selectedOutputs.includes('COMPETITIVE_ANALYSIS') && !competitiveResult) {
             setStatusMessage("Analyzing Competition...");
             const comp = await sessionRef.current.generateCompetitiveAnalysis(undefined, handleStreamUpdate);
             setCompetitiveResult(comp);
             setStatusMessage("Competitive Analysis Complete");
             setActiveStage(AnalysisStage.COMPETITIVE_ANALYSIS);
             return;
        }

        // 7. DECK STRUCTURE
        if ((selectedOutputs.includes('STRATEGY_DECK') || selectedOutputs.includes('VIDEO_SCRIPT')) && !structureResult) {
             setStatusMessage("Structuring Narrative...");
             const structure = await sessionRef.current.generateDeckStructure(undefined, recsResult?.recommendations, handleStreamUpdate);
             setStructureResult(structure);
             setStatusMessage("Outline Created");
             setActiveStage(AnalysisStage.DECK_STRUCTURE);
             return;
        }

        // 8. NARRATIVE
        if ((selectedOutputs.includes('STRATEGY_DECK') || selectedOutputs.includes('VIDEO_SCRIPT')) && !narrativeResult) {
             setStatusMessage("Writing Narrative...");
             const narrative = await sessionRef.current.generateNarrative(structureResult, recsResult?.recommendations, undefined, handleStreamUpdate);
             setNarrativeResult(narrative);
             setStatusMessage("Content Written");
             setActiveStage(AnalysisStage.NARRATIVE);
             return;
        }

        // 9. FINAL VISUALIZATION
        if (appState !== AppState.SUCCESS) {
             setStatusMessage("Finalizing Assets...");
             setActiveStage(AnalysisStage.FINAL);
             
             const final = await sessionRef.current.visualizeNarrative(
                 narrativeResult || { methodology: "Skipped", videoScript: [], slides: [] }, 
                 personasResult?.personas || [], 
                 recsResult?.recommendations || [], 
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
                 gapAnalysis: gapResult?.analysis,
                 techAudit: techAuditResult?.audit,
                 competitiveAnalysis: competitiveResult?.analysis,
             };

             setResult(fullResult);
             setAppState(AppState.SUCCESS);
             setActiveStage(AnalysisStage.IDLE);
             setStatusMessage("Analysis Complete");
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

        // --- PHASE 0: Collect data from enabled sources ---
        let collectedDataFiles: typeof files = [...files];

        if (hasDataSources) {
            setIsCollectingData(true);
            setStatusMessage("Collecting intelligence data...");
            setDataSourceStatus("Initializing data collection...");

            try {
                const { generateResearchPlan, executePlan, mergeResultsToCorpus } = await import('./services/researchFabricOrchestrator');

                // Use multi-search for bulk proxy queries
                const { multiSearch } = await import('./services/dataSourceConnectors');

                // Build list of source IDs to query based on enabled toggles
                const sourceIds: string[] = [];
                if (enableHigherEdNews) sourceIds.push(
                    'higher_ed_dive', 'inside_higher_ed', 'edsurge', 'hechinger', 'the_conversation_edu',
                    'campus_tech', 'ecampus', 'university_world_news', 'pie_news', 'open_campus'
                );
                if (enableNews) sourceIds.push('gdelt');
                if (enableAcademic) sourceIds.push(
                    'openalex', 'semantic_scholar', 'crossref', 'doaj', 'europe_pmc', 'core_ac',
                    'datacite', 'zenodo'
                );
                if (enableEducationData) sourceIds.push('college_scorecard', 'eric');
                if (enableEconomic) sourceIds.push('worldbank', 'fred', 'bls', 'imf_data', 'oecd_data');
                if (enableGovernment) sourceIds.push(
                    'usaspending', 'federal_register', 'sec_edgar', 'congress_gov', 'nist_ai'
                );
                if (enableOpenData) sourceIds.push(
                    'data_gov', 'data_gov_uk', 'nyc_open_data', 'california_data', 'chicago_data',
                    'data_gov_au', 'data_gov_ca', 'eu_data_portal', 'la_open_data', 'sf_open_data', 'texas_open_data'
                );
                if (enableSocialTrends) sourceIds.push('hackernews');
                if (enableAINews) sourceIds.push(
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
                if (enableAIResearch) sourceIds.push(
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
                if (enableYouTube) sourceIds.push(
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
                    'higher_ed_dive': 2, 'inside_higher_ed': 2, 'edsurge': 2, 'hechinger': 2, 'the_conversation_edu': 2,
                    'gdelt': 2, 'openalex': 1, 'semantic_scholar': 1, 'crossref': 1, 'college_scorecard': 1, 'eric': 1,
                    'worldbank': 1, 'fred': 1, 'usaspending': 1, 'federal_register': 1, 'sec_edgar': 1, 'data_gov': 1,
                    'hackernews': 3, 'youtube': 3,
                    // AI News
                    'mit_tech_review_ai': 1, 'ieee_spectrum_ai': 1, 'venturebeat_ai': 2, 'techcrunch_ai': 2,
                    'ars_technica_ai': 2, 'wired_ai': 2, 'the_verge_ai': 2, 'synced_review': 2,
                    'marktechpost': 2, 'kdnuggets': 2, 'the_gradient': 2,
                    // AI Lab Blogs
                    'openai_blog': 1, 'google_ai_blog': 1, 'deepmind_blog': 1, 'meta_ai_blog': 1,
                    'microsoft_research': 1, 'nvidia_dev_blog': 1, 'huggingface_blog': 2, 'anthropic_blog': 1, 'bair_blog': 1,
                    // AI Research
                    'arxiv_cs_ai': 1, 'arxiv_cs_lg': 1, 'arxiv_cs_cl': 1, 'openreview': 1, 'dblp': 1,
                    // AI Models & Datasets
                    'hf_models': 2, 'hf_datasets': 2,
                    // AI Policy
                    'brookings_ai': 1, 'stanford_hai': 1,
                    // AI Communities & Code
                    'stackoverflow_ai': 3, 'github_repos': 2,
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

                    // Search sources individually — update live feed as each completes
                    const searchPromises = sourceIds.map(async (sid) => {
                        const category = queryCategoryMap[sid] || sid;
                        const displayName = sourceDisplayNames[sid] || sid;
                        const query = refinedQueries[category] || researchGoal;
                        const tier = tierMap[sid] || 3;

                        // Set this source to "loading"
                        setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? { ...s, status: 'loading', query } : s));

                        try {
                            const resp = await fetch(`http://localhost:5012/api/search/${sid}?q=${encodeURIComponent(query)}&limit=15`, { signal: AbortSignal.timeout(35000) });
                            if (!resp.ok) {
                                setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? { ...s, status: 'error', query } : s));
                                return { source: displayName, sourceId: sid, credibilityTier: tier, items: [], total: 0, query };
                            }
                            const data = await resp.json();
                            const result = { ...data, source: displayName, sourceId: sid, credibilityTier: tier, query };

                            // Update live feed with results
                            setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? {
                                ...s,
                                items: result.items || [],
                                total: result.total || 0,
                                status: (result.items?.length || 0) > 0 ? 'complete' : 'empty',
                                query,
                            } : s));

                            return result;
                        } catch {
                            setLiveSourceResults(prev => prev.map(s => s.sourceId === sid ? { ...s, status: 'error', query } : s));
                            return { source: displayName, sourceId: sid, credibilityTier: tier, items: [], total: 0, query };
                        }
                    });

                    try {
                        proxyResults = await Promise.all(searchPromises);
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

                // Also run orchestrator for deep research + CX mesh (if enabled)
                const plan = await generateResearchPlan(researchGoal, selectedLens, {
                    deepResearch: enableDeepResearch ? { mode: deepResearchMode } : undefined,
                    newsMedia: false, academic: false, economic: false, socialTrends: false, videoSearch: false,
                    videoTranscripts: videoUrls.trim() ? videoUrls.trim().split('\n').filter(u => u.trim()) : undefined,
                    webIntelligence: webUrls.trim() ? { urls: webUrls.trim().split('\n').filter(u => u.trim()) } : undefined,
                    cxMesh: enableCxMesh ? {
                        subreddits: subredditTargets.trim() ? subredditTargets.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                        trustpilot: trustpilotTargets.trim() ? trustpilotTargets.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                    } : undefined,
                });

                // Execute orchestrator plan (for deep research, CX mesh, web URLs, video transcripts)
                const enabledPlanSources = plan.sources.filter(s => s.enabled);
                if (enabledPlanSources.length > 0) {
                    setDataSourceStatus(`Running ${enabledPlanSources.length} additional AI-powered sources...`);

                    // Add orchestrator sources to the live feed
                    const orchestratorCards = enabledPlanSources.map(s => ({
                        source: s.name,
                        sourceId: `orch_${s.id}`,
                        credibilityTier: s.type === 'deep_research' ? 1 : 2,
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

                const fullCorpus = [corpus, proxyCorpus].filter(c => c.trim()).join('\n\n');
                const totalItems = executionResult.totalItems + proxyResults.reduce((s, r) => s + (r.items?.length || 0), 0);
                const totalSources = executionResult.successfulSources + proxyResults.filter(r => r.items?.length > 0).length;

                if (fullCorpus.trim().length > 0) {
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

        // --- PHASE 1: Create session with analytical lens injected ---
        const lensSegment = getLensPromptSegment(selectedLens);
        sessionRef.current = new GenAISession(researchGoal, analysisApproach, selectedOutputs, lensSegment);

        try {
            // STEP 1: Ingestion (with collected data merged in)
            setStatusMessage("Reading & Contextualizing...");
            setActiveStage(AnalysisStage.INGESTION);
            const ingestion = await sessionRef.current.ingestContext(collectedDataFiles, handleStreamUpdate);
            setIngestionResult(ingestion);
            setStatusMessage("Context verification required.");
        } catch (e) {
            console.error(e);
            setAppState(AppState.ERROR);
            setStatusMessage("Error during analysis. Please try again.");
            setActiveStage(AnalysisStage.IDLE);
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
                    const personas = await sessionRef.current.generatePersonas(themesResult, undefined, handleStreamUpdate, setStatusMessage);
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
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.JOURNEY_MAP) {
                 if (modifiedData) setJourneyResult(modifiedData);
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
                 if (modifiedData) setTechResult(modifiedData);
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
                 if (modifiedData) setPrdResult(modifiedData);
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
                 if (modifiedData) setRoadmapResult(modifiedData);
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
                 if (modifiedData) setRecsResult(modifiedData);
                 if (feedback) {
                      setStatusMessage("Refining Strategy...");
                      const res = await sessionRef.current.generateRecommendations(feedback, handleStreamUpdate);
                      setRecsResult(res);
                      setStatusMessage("Strategy Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.DECK_STRUCTURE) {
                 if (modifiedData) setStructureResult(modifiedData);
                 if (feedback) {
                      setStatusMessage("Refining Structure...");
                      const res = await sessionRef.current.generateDeckStructure(feedback, recsResult?.recommendations, handleStreamUpdate);
                      setStructureResult(res);
                      setStatusMessage("Structure Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else if (activeStage === AnalysisStage.NARRATIVE) {
                 if (modifiedData) setNarrativeResult(modifiedData);
                 if (feedback) {
                      setStatusMessage("Refining Narrative...");
                      const res = await sessionRef.current.generateNarrative(structureResult, recsResult?.recommendations, feedback, handleStreamUpdate);
                      setNarrativeResult(res);
                      setStatusMessage("Narrative Refined");
                      return;
                 }
                 advanceToNextStage();
            }
            else {
                // Fallback
                advanceToNextStage();
            }

        } catch (e) {
            console.error("Checkpoint Logic Error", e);
            setStatusMessage("Error proceeding. Please try again.");
            setAppState(AppState.ERROR);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--nxt-lime)] selection:text-white overflow-hidden flex flex-col">
             
             {/* HEADER */}
             <div className="flex justify-between items-center px-8 py-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] z-20">
                 <Logo />
                 <div className="flex gap-4 items-center">
                     <button className="text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Documentation</button>
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
                                     
                                     {/* Research Method Selector */}
                                     <div className="mb-8">
                                         <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Research Method</label>
                                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                             {RESEARCH_METHODS.map(method => (
                                                 <button
                                                     key={method.id}
                                                     onClick={() => setSelectedMethod(method.id as ResearchMethodId)}
                                                     className={`p-3 rounded border text-left transition-all ${selectedMethod === method.id ? 'bg-[var(--nxt-teal)] border-[var(--nxt-teal)] text-white' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--nxt-teal)]'}`}
                                                 >
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <i className={`fas ${method.icon} text-xs ${selectedMethod === method.id ? 'text-[var(--nxt-lime)]' : 'text-[var(--text-tertiary)]'}`}></i>
                                                         <span className="text-[11px] font-bold uppercase tracking-wide">{method.name}</span>
                                                     </div>
                                                     <div className={`text-[9px] leading-tight ${selectedMethod === method.id ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{method.description.substring(0, 80)}...</div>
                                                 </button>
                                             ))}
                                         </div>
                                         {selectedMethod !== 'general_synthesis' && (
                                             <div className="mt-2 text-xs text-white bg-[var(--nxt-teal)] px-3 py-2 rounded">
                                                 <i className={`fas ${RESEARCH_METHODS.find(m => m.id === selectedMethod)?.icon} mr-2`}></i>
                                                 <strong>{RESEARCH_METHODS.find(m => m.id === selectedMethod)?.name}</strong>: {RESEARCH_METHODS.find(m => m.id === selectedMethod)?.description}
                                             </div>
                                         )}
                                     </div>

                                     {/* Analytical Lens Selector */}
                                     <div className="mb-8">
                                         <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Analytical Lens</label>
                                         <div className="grid grid-cols-3 gap-2">
                                             {(Object.keys(ANALYTICAL_LENS_LABELS) as AnalyticalLens[]).map(lens => (
                                                 <button
                                                     key={lens}
                                                     onClick={() => setSelectedLens(lens)}
                                                     className={`py-3 px-3 rounded border text-xs font-bold uppercase tracking-wide transition-all text-left ${selectedLens === lens ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--nxt-lime-20)]'}`}
                                                 >
                                                     {ANALYTICAL_LENS_LABELS[lens]}
                                                 </button>
                                             ))}
                                         </div>
                                         {selectedLens !== 'general_cx' && selectedLens !== 'custom' && (
                                             <div className="mt-2 text-xs text-[var(--nxt-teal)] bg-[var(--nxt-lime-10)] px-3 py-2 rounded border border-[var(--nxt-lime-20)]">
                                                 Lens active: Personas and journey stages will be customized for {ANALYTICAL_LENS_LABELS[selectedLens].toLowerCase()} research.
                                             </div>
                                         )}
                                     </div>

                                     <div className="grid md:grid-cols-2 gap-8 mb-8">
                                          <div className="flex-1">
                                              <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Output Artifacts</label>
                                              <div className="grid grid-cols-2 gap-2">
                                                   {(['PERSONAS', 'STRATEGY_DECK', 'VIDEO_SCRIPT', 'JOURNEY_MAP', 'TECH_ARCH', 'PRD', 'ROADMAP', 'STRATEGIC_RECS', 'GAP_ANALYSIS', 'TECH_AUDIT', 'COMPETITIVE_ANALYSIS'] as OutputOption[]).map(opt => {
                                                       const labels: Record<string, string> = {
                                                           'PERSONAS': 'Personas', 'STRATEGY_DECK': 'Deck', 'VIDEO_SCRIPT': 'Script',
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
                                          <FileUpload onFilesSelected={setFiles} isLoading={false} />
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
                                               activeStage === AnalysisStage.DECK_STRUCTURE ? structureResult :
                                               activeStage === AnalysisStage.NARRATIVE ? narrativeResult :
                                               activeStage === AnalysisStage.GAP_ANALYSIS ? gapResult :
                                               activeStage === AnalysisStage.TECH_AUDIT ? techAuditResult :
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
