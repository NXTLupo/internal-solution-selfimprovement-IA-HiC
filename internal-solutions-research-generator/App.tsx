import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import ResultsView from './components/ResultsView';
import { generatePersonaStory } from './services/geminiService';
import { AppState, FileUpload as FileType, AnalysisResult, AnalysisType } from './types';

// Declare global window.API_KEY
declare global {
  interface Window {
    API_KEY?: string;
  }
}

// Define interface locally to avoid global conflicts
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface ThinkingEvent {
  type: string;
  content: string;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileType[]>([]);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('GENERAL_ETHNOGRAPHY');
  
  // Analysis State
  const [streamLog, setStreamLog] = useState<string>('');
  const [thinkingEvents, setThinkingEvents] = useState<ThinkingEvent[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>('Initializing...');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (appState === AppState.ANALYZING) {
        setElapsedTime(0);
        timerRef.current = window.setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
    } else {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appState]);

  // Stream Parsing Effect
  useEffect(() => {
     const regex = /\[(PHASE|QUESTION|HYPOTHESIS|INSIGHT)\]\s*([^\[]+)/g;
     const matches = [];
     let match;
     while ((match = regex.exec(streamLog)) !== null) {
         matches.push({ 
             type: match[1], 
             content: match[2].trim() 
         });
     }
     setThinkingEvents(matches);
  }, [streamLog]);

  // Smart Auto-Scroll for Events Container
  useEffect(() => {
    if (eventsContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = eventsContainerRef.current;
        // Check if user is near the bottom (within 100px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        
        if (isNearBottom) {
            eventsContainerRef.current.scrollTop = scrollHeight;
        }
    }
  }, [thinkingEvents]);

  // Always scroll raw log
  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [streamLog]);

  const getAIStudio = (): AIStudio | undefined => {
    return (window as any).aistudio;
  };

  const checkApiKey = async () => {
    try {
      // Check if we have an API key injected by the Flask backend
      if (window.API_KEY || process.env.API_KEY) {
        setHasKey(true);
        return;
      }
      
      // Fallback to AI Studio if available
      const aiStudio = getAIStudio();
      if (aiStudio && await aiStudio.hasSelectedApiKey()) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    } catch (e) {
      console.error("Error checking API key", e);
      // If there's an error but we have an injected key, still consider it valid
      if (window.API_KEY || process.env.API_KEY) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    }
  };

  const handleSelectKey = async () => {
    try {
      // Check if we already have an injected key
      if (window.API_KEY || process.env.API_KEY) {
        setHasKey(true);
        return;
      }
      
      // Try to use AI Studio if available
      const aiStudio = getAIStudio();
      if (aiStudio) {
        await aiStudio.openSelectKey();
        setHasKey(true);
      } else {
        // No AI Studio and no injected key - show error
        console.warn("API key is configured on the server. If you're seeing this message, please refresh the page.");
        setHasKey(true); // Assume the server has the key
      }
    } catch (e) {
      console.error("Error selecting key", e);
      // Even with error, if we have an injected key, use it
      if (window.API_KEY || process.env.API_KEY) {
        setHasKey(true);
      }
    }
  };

  const handleFilesSelected = async (files: FileType[]) => {
    if (!hasKey) {
        await handleSelectKey();
    }

    setUploadedFiles(files);
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setStreamLog('');
    setThinkingEvents([]);
    setProgressStatus('Connecting to Gemini 3 Pro...');

    try {
      const analysis = await generatePersonaStory(
          files, 
          analysisType, 
          (chunkText) => {
             setStreamLog(chunkText);
             // If we are receiving chunks, we are in the thinking phase
             setProgressStatus('Extended Thinking & Methodology Analysis...');
          },
          (statusUpdate) => {
              // Updates from the post-stream phases (Image generation)
              setProgressStatus(statusUpdate);
          }
      );
      setResult(analysis);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasKey(false);
        setErrorMsg("API Key issue detected. Please select a valid Paid API Key.");
      } else {
        setErrorMsg(err.message || "An unexpected error occurred during analysis.");
      }
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setUploadedFiles([]);
    setErrorMsg(null);
    setStreamLog('');
    setThinkingEvents([]);
    setElapsedTime(0);
  };

  const getEventStyle = (type: string) => {
      switch (type) {
          case 'PHASE': return 'border-indigo-500 bg-indigo-500/10 text-indigo-200';
          case 'QUESTION': return 'border-amber-500 bg-amber-500/10 text-amber-200';
          case 'HYPOTHESIS': return 'border-purple-500 bg-purple-500/10 text-purple-200';
          case 'INSIGHT': return 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
          default: return 'border-slate-500 bg-slate-800 text-slate-300';
      }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">PersonaStory AI</h1>
          </div>
          <div className="flex items-center gap-4">
            {!hasKey && (
                 <button 
                 onClick={handleSelectKey}
                 className="text-xs font-medium text-amber-400 border border-amber-400/30 bg-amber-400/10 rounded px-3 py-1 hover:bg-amber-400/20 transition-colors"
               >
                 Select Paid API Key
               </button>
            )}
            <div className="text-xs font-medium text-slate-500 border border-slate-800 rounded-full px-3 py-1">
                Gemini 3 Pro + Imagen + Veo 3.1
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
            <div className="text-center max-w-2xl mb-8">
              <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300 mb-6 pb-2">
                Turn Research into Stories
              </h2>
              <p className="text-lg text-slate-400 mb-6">
                Upload your raw market research. 
                We use <strong>Gemini 3 Pro</strong> extended thinking to extract deep nuances and <strong>Imagen</strong> to visualize every moment.
              </p>
              
              {!hasKey && (
                <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-lg mb-8 max-w-md mx-auto">
                    <p className="text-sm text-amber-200 mb-3">To use high-fidelity image generation, please select a paid API key.</p>
                    <button 
                        onClick={handleSelectKey}
                        className="text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                        Select API Key
                    </button>
                    <div className="mt-2 text-xs text-amber-400/60">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:underline">View Billing Documentation</a>
                    </div>
                </div>
              )}
            </div>

            {/* Analysis Type Selector */}
            <div className="w-full max-w-2xl mb-8 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Select Research Lens
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                        onClick={() => setAnalysisType('GENERAL_ETHNOGRAPHY')}
                        className={`p-3 rounded-lg border text-left transition-all ${analysisType === 'GENERAL_ETHNOGRAPHY' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        <div className="font-medium">General Ethnography</div>
                        <div className="text-xs opacity-70">Broad cultural context & rituals</div>
                    </button>
                    <button 
                        onClick={() => setAnalysisType('WHITESPACE_OPPORTUNITY')}
                        className={`p-3 rounded-lg border text-left transition-all ${analysisType === 'WHITESPACE_OPPORTUNITY' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        <div className="font-medium">Whitespace Analysis</div>
                        <div className="text-xs opacity-70">Gaps, unmet needs & Blue Oceans</div>
                    </button>
                    <button 
                        onClick={() => setAnalysisType('BEHAVIORAL_PSYCHOLOGY')}
                        className={`p-3 rounded-lg border text-left transition-all ${analysisType === 'BEHAVIORAL_PSYCHOLOGY' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        <div className="font-medium">Behavioral Psychology</div>
                        <div className="text-xs opacity-70">Habits, triggers & cognitive biases</div>
                    </button>
                    <button 
                        onClick={() => setAnalysisType('CUSTOMER_JOURNEY')}
                        className={`p-3 rounded-lg border text-left transition-all ${analysisType === 'CUSTOMER_JOURNEY' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        <div className="font-medium">Customer Journey</div>
                        <div className="text-xs opacity-70">End-to-end friction & flow</div>
                    </button>
                </div>
            </div>
            
            <FileUpload onFilesSelected={handleFilesSelected} isLoading={false} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl opacity-70">
                <FeatureItem icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" title="Deep Logic" desc="Extended thinking budget of 16k tokens." />
                <FeatureItem icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" title="Photorealistic Visuals" desc="Gemini 3 Pro Image (Nano Banana Pro)." />
                <FeatureItem icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" title="No Clichés" desc="Impactful, documentary-style storytelling." />
            </div>
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="w-full max-w-6xl mx-auto h-[70vh] flex flex-col">
            <div className="mb-4 text-center">
                 <div className="inline-flex items-center gap-2 mb-2">
                    <div className="relative w-4 h-4">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <h3 className="text-xl font-bold text-white">Analysis in Progress</h3>
                 </div>
                 
                 {/* Progress Bar & Status */}
                 <div className="w-full max-w-lg mx-auto mt-2">
                     <div className="flex justify-between text-xs text-slate-400 mb-1">
                         <span>{progressStatus}</span>
                         <span className="font-mono text-indigo-400">{formatTime(elapsedTime)}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full animate-progress-indeterminate"></div>
                     </div>
                 </div>
            </div>
            
            <div className="flex-grow flex flex-col md:flex-row gap-6 overflow-hidden">
                {/* Left Column: Highlights Tiles */}
                <div className="md:w-1/3 flex flex-col h-full bg-slate-900/30 rounded-lg border border-slate-800 p-4">
                     <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                         <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Highlights</span>
                         <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{thinkingEvents.length} Events</span>
                     </div>
                     <div 
                        ref={eventsContainerRef}
                        className="flex-grow overflow-y-auto space-y-3 pr-2 scroll-smooth"
                     >
                         {thinkingEvents.length === 0 && (
                             <div className="text-center text-xs text-slate-600 py-10 italic">
                                 Waiting for first thinking event...
                             </div>
                         )}
                         {thinkingEvents.map((event, idx) => (
                             <div key={idx} className={`p-3 rounded-lg border-l-2 shadow-sm animate-fade-in ${getEventStyle(event.type)}`}>
                                 <span className="text-[10px] font-bold uppercase block mb-1 opacity-70">{event.type}</span>
                                 <p className="text-xs font-medium leading-relaxed">
                                     {event.content}
                                 </p>
                             </div>
                         ))}
                     </div>
                </div>

                {/* Right Column: Terminal */}
                <div className="md:w-2/3 flex flex-col h-full bg-slate-950 rounded-lg border border-slate-800 shadow-2xl overflow-hidden font-mono text-sm relative">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Raw Reasoning Stream
                        </span>
                        <span className="text-xs text-slate-600">Gemini-3-Pro-Preview</span>
                    </div>
                    <div 
                        ref={logContainerRef}
                        className="flex-grow overflow-y-auto p-4 text-emerald-500/80 bg-black/90 space-y-1 scroll-smooth"
                    >
                        <pre className="whitespace-pre-wrap break-words text-xs">{streamLog}</pre>
                        {streamLog.length === 0 && <span className="animate-pulse">Initializing thinking stream...</span>}
                        <div className="w-2 h-4 bg-emerald-500 inline-block animate-pulse align-middle ml-1"></div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {appState === AppState.SUCCESS && result && (
          <ResultsView result={result} onReset={handleReset} />
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="bg-red-500/10 p-6 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Analysis Failed</h3>
            <p className="text-red-300 mb-8 max-w-lg">{errorMsg}</p>
            <div className="flex gap-4">
                <button 
                  onClick={handleSelectKey}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Check API Key
                </button>
                <button 
                  onClick={handleReset}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes progress-indeterminate {
          0% { margin-left: -50%; width: 50%; }
          50% { margin-left: 25%; width: 50%; }
          100% { margin-left: 100%; width: 50%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

const FeatureItem: React.FC<{icon: string, title: string, desc: string}> = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center text-center p-4">
        <div className="bg-slate-800 p-3 rounded-full mb-3 text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
        </div>
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{desc}</p>
    </div>
);

export default App;