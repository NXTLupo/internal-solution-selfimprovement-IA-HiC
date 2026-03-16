import React, { useState, useEffect, useRef } from 'react';

export interface ThinkingEvent {
  id: string;
  passNumber: number;
  passType: 'surface' | 'hidden' | 'psychological' | 'cultural' | 'strategic';
  content: string;
  confidence: number;
  connections: string[];
  timestamp: number;
  insights?: string[];
  questions?: string[];
}

interface ThinkingViewerProps {
  stream: ThinkingEvent[];
  onInterrupt?: () => void;
  onSteer?: (direction: string) => void;
  isActive: boolean;
}

const PASS_ICONS = {
  surface: '🔍',
  hidden: '🔮',
  psychological: '🧠',
  cultural: '🌍',
  strategic: '🎯'
};

const PASS_COLORS = {
  surface: 'bg-blue-900/20 border-blue-500/50',
  hidden: 'bg-purple-900/20 border-purple-500/50',
  psychological: 'bg-pink-900/20 border-pink-500/50',
  cultural: 'bg-green-900/20 border-green-500/50',
  strategic: 'bg-amber-900/20 border-amber-500/50'
};

export const ThinkingViewer: React.FC<ThinkingViewerProps> = ({ 
  stream, 
  onInterrupt, 
  onSteer,
  isActive 
}) => {
  const [expandedPasses, setExpandedPasses] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stream, autoScroll]);

  const togglePass = (id: string) => {
    const newExpanded = new Set(expandedPasses);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPasses(newExpanded);
  };

  const filteredStream = filter === 'all' 
    ? stream 
    : stream.filter(event => event.passType === filter);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">AI Thinking Process</h3>
          {isActive && (
            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full animate-pulse">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-slate-700 bg-slate-800 text-slate-300 rounded-md"
          >
            <option value="all">All Passes</option>
            <option value="surface">Surface</option>
            <option value="hidden">Hidden</option>
            <option value="psychological">Psychological</option>
            <option value="cultural">Cultural</option>
            <option value="strategic">Strategic</option>
          </select>
          
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-sm rounded-md ${
              autoScroll ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Auto-scroll
          </button>
          
          {onInterrupt && isActive && (
            <button
              onClick={onInterrupt}
              className="px-3 py-1 text-sm bg-red-600/20 text-red-400 border border-red-500 rounded-md hover:bg-red-600/30"
            >
              Interrupt
            </button>
          )}
        </div>
      </div>

      {/* Thinking Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {filteredStream.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p>Waiting for thinking events...</p>
          </div>
        ) : (
          filteredStream.map((event) => (
            <div
              key={event.id}
              className={`border rounded-lg ${PASS_COLORS[event.passType]} transition-all`}
            >
              <div
                className="p-3 cursor-pointer flex items-start gap-2"
                onClick={() => togglePass(event.id)}
              >
                <button className="mt-1">
                  {expandedPasses.has(event.id) ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{PASS_ICONS[event.passType]}</span>
                    <span className="font-medium capitalize text-slate-200">{event.passType} Pass</span>
                    <span className="text-xs text-slate-500">#{event.passNumber}</span>
                    <span className={`text-xs ${getConfidenceColor(event.confidence)}`}>
                      {Math.round(event.confidence * 100)}% confident
                    </span>
                    <span className="text-xs text-slate-500 ml-auto">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-300 line-clamp-2">
                    {event.content}
                  </div>
                  
                  {event.connections.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-xs text-slate-400">
                        {event.connections.length} connections
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {expandedPasses.has(event.id) && (
                <div className="px-3 pb-3 border-t border-slate-800 bg-slate-950/50">
                  <div className="pt-3 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-slate-300">Full Thinking:</h4>
                      <p className="text-sm text-slate-400 whitespace-pre-wrap">
                        {event.content}
                      </p>
                    </div>
                    
                    {event.insights && event.insights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Insights Detected:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {event.insights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {event.questions && event.questions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Open Questions:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {event.questions.map((question, i) => (
                            <li key={i}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {event.connections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Connections:</h4>
                        <div className="flex flex-wrap gap-1">
                          {event.connections.map((conn, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 text-xs bg-gray-100 rounded"
                            >
                              {conn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {onSteer && isActive && (
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={() => onSteer('deeper')}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        >
                          Go Deeper
                        </button>
                        <button
                          onClick={() => onSteer('broader')}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Broaden Scope
                        </button>
                        <button
                          onClick={() => onSteer('refocus')}
                          className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                        >
                          Refocus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>{filteredStream.length} thinking events</span>
          <span>
            Avg confidence: {
              filteredStream.length > 0
                ? Math.round(
                    filteredStream.reduce((acc, e) => acc + e.confidence, 0) / 
                    filteredStream.length * 100
                  )
                : 0
            }%
          </span>
        </div>
      </div>
    </div>
  );
};