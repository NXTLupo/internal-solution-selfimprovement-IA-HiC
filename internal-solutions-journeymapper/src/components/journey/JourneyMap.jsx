import React, { useState, useRef, useEffect } from 'react';
import { Download, AlertTriangle, Lightbulb, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Phase from './Phase';
import Insights from './Insights';

const JourneyMap = ({ journeyData }) => {
  const [activePhase, setActivePhase] = useState(null);
  const timelineRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  
  useEffect(() => {
    if (timelineRef.current) {
      setMaxScroll(timelineRef.current.scrollWidth - timelineRef.current.clientWidth);
    }
  }, [journeyData]);
  
  const handleScroll = (direction) => {
    if (timelineRef.current) {
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount);
      
      timelineRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      
      setScrollPosition(newPosition);
    }
  };
  
  if (!journeyData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="text-xl font-medium text-gray-800 mb-2">No Journey Map Available</h3>
        <p className="text-gray-600">Upload and analyze data to generate a journey map</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-800">{journeyData.journey_name}</h2>
            <p className="text-gray-600 mt-1">{journeyData.summary}</p>
            
            {/* Show personas if available */}
            {journeyData.personas && journeyData.personas.length > 0 && (
              <div className="flex items-center mt-3">
                <Users size={16} className="text-indigo-500 mr-2" />
                <div className="flex flex-wrap gap-2">
                  {journeyData.personas.map((persona, idx) => (
                    <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                      {persona}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">
            <Download size={16} className="mr-2" />
            Export Map
          </button>
        </div>
        
        {/* Journey flow with navigation controls */}
        <div className="relative">
          {maxScroll > 0 && (
            <>
              <button 
                onClick={() => handleScroll('left')}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-md hover:bg-gray-100 ${
                  scrollPosition <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={scrollPosition <= 0}
              >
                <ChevronLeft size={20} />
              </button>
              
              <button 
                onClick={() => handleScroll('right')}
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-md hover:bg-gray-100 ${
                  scrollPosition >= maxScroll ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={scrollPosition >= maxScroll}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          
          <div 
            ref={timelineRef}
            className="journey-timeline overflow-x-auto pb-6 mx-8"
            onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
          >
            <div className="relative">
              {/* Flow path - more visually interesting than a straight line */}
              <svg 
                className="absolute top-24 left-0 w-full h-4 z-0"
                style={{ minWidth: journeyData.phases.length * 300 }}
              >
                <path 
                  d={`M40,8 ${Array(journeyData.phases.length).fill().map((_, i) => `C${100 + i*300},${i % 2 === 0 ? -10 : 25} ${150 + i*300},${i % 2 === 0 ? 25 : -10} ${280 + i*300},8`).join(' ')}`}
                  stroke="#818cf8" 
                  strokeWidth="4" 
                  fill="none"
                />
              </svg>
              
              <div className="flex space-x-6 relative z-10">
                {journeyData.phases.map((phase, index) => (
                  <Phase 
                    key={index}
                    phase={phase}
                    index={index}
                    isActive={activePhase === index}
                    onClick={() => setActivePhase(index === activePhase ? null : index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Insights 
          title="Pain Points"
          items={journeyData.pain_points}
          icon={<AlertTriangle className="text-red-500 mr-2" size={20} />}
          color="red"
        />
        
        <Insights 
          title="Opportunities"
          items={journeyData.opportunities}
          icon={<Lightbulb className="text-green-500 mr-2" size={20} />}
          color="green"
        />
      </div>
    </div>
  );
};

export default JourneyMap;