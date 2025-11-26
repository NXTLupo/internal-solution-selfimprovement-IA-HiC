import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Brain, Lightbulb, Link, Target, AlertCircle } from 'lucide-react';

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
  surface: 'bg-blue-50 border-blue-200',
  hidden: 'bg-purple-50 border-purple-200',
  psychological: 'bg-pink-50 border-pink-200',
  cultural: 'bg-green-50 border-green-200',
  strategic: 'bg-amber-50 border-amber-200'
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
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">AI Thinking Process</h3>
          {isActive && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full animate-pulse">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border rounded-md"
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
              autoScroll ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100'
            }`}
          >
            Auto-scroll
          </button>
          
          {onInterrupt && isActive && (
            <button
              onClick={onInterrupt}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
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
          <div className="text-center text-gray-500 py-8">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
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
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{PASS_ICONS[event.passType]}</span>
                    <span className="font-medium capitalize">{event.passType} Pass</span>
                    <span className="text-xs text-gray-500">#{event.passNumber}</span>
                    <span className={`text-xs ${getConfidenceColor(event.confidence)}`}>
                      {Math.round(event.confidence * 100)}% confident
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700 line-clamp-2">
                    {event.content}
                  </div>
                  
                  {event.connections.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Link className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {event.connections.length} connections
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {expandedPasses.has(event.id) && (
                <div className="px-3 pb-3 border-t bg-white bg-opacity-50">
                  <div className="pt-3 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Full Thinking:</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {event.content}
                      </p>
                    </div>
                    
                    {event.insights && event.insights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
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
                          <AlertCircle className="w-3 h-3" />
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
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
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