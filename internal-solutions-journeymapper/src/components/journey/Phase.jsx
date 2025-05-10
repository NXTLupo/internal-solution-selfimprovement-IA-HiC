import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Phase = ({ phase, index, isActive, onClick }) => {
  // Determine phase point and draw "marker" at that point on the journey
  const phasePosition = (index + 1) / 5 * 100;
  
  return (
    <div
      className={`w-72 bg-white border rounded-xl shadow-sm transition-all cursor-pointer ${
        isActive
          ? 'border-indigo-500 ring-2 ring-indigo-100 transform -translate-y-1 scale-102'
          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Phase indicator dot - positioned to match the curved flow line */}
      <div 
        className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
      />
      
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between">
          <h3 className="font-medium text-gray-800">{phase.name}</h3>
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
            {index + 1}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{phase.description}</p>
      </div>
      
      <div className="p-5">
        {/* Emotion indicator */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium uppercase text-gray-500">Emotion/Sentiment</span>
            <span className="text-xs font-medium">{phase.emotions[0].value}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                phase.emotions[0].value > 70
                  ? 'bg-green-500'
                  : phase.emotions[0].value > 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${phase.emotions[0].value}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center">
            <span className="mr-1">{phase.emotions[0].type}</span>
            <span className="text-xs text-gray-400 italic">{phase.emotions[0].description}</span>
          </div>
        </div>
        
        {/* Touchpoints */}
        <div className="border-t pt-4">
          <h4 className="text-xs font-medium uppercase text-gray-500 mb-3 flex items-center">
            <span>Touchpoints</span>
            {!isActive && phase.touchpoints.length > 2 && (
              <ChevronDown size={14} className="ml-1 text-gray-400" />
            )}
            {isActive && phase.touchpoints.length > 2 && (
              <ChevronUp size={14} className="ml-1 text-gray-400" />
            )}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {phase.touchpoints.map((touchpoint, tindex) => (
              <div 
                key={tindex} 
                className={`p-2 rounded text-sm ${
                  touchpoint.importance >= 8 
                    ? 'bg-indigo-50 border-l-2 border-indigo-500' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-indigo-600">{touchpoint.type}</span>
                  {touchpoint.importance > 0 && (
                    <span className="text-xs text-gray-500">
                      Importance: {touchpoint.importance}/10
                    </span>
                  )}
                </div>
                <div>{touchpoint.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pain points and opportunities - show when expanded */}
        {isActive && (phase.pain_points.length > 0 || phase.opportunities.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {phase.pain_points.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-xs font-medium uppercase text-red-500 mb-2">Pain Points</h4>
                <ul className="space-y-1">
                  {phase.pain_points.map((point, pindex) => (
                    <li key={pindex} className="text-sm flex">
                      <span className="text-red-500 mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {phase.opportunities.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-xs font-medium uppercase text-green-500 mb-2">Opportunities</h4>
                <ul className="space-y-1">
                  {phase.opportunities.map((opportunity, oindex) => (
                    <li key={oindex} className="text-sm flex">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Phase;