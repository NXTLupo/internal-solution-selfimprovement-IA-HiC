import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Component for rendering Mermaid journey diagrams directly from Gemma-generated code
const MermaidJourneyMap = ({ journeyData, mermaidCode }) => {
  const mermaidRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize mermaid with proper configuration
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        journey: {
          diagramMarginX: 50,
          diagramMarginY: 20,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
          messageAlign: 'center',
          bottomMarginAdj: 1,
          useMaxWidth: true,
          rightAngles: false
        },
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        }
      });
    }

    const renderDiagram = async () => {
      if (mermaidRef.current) {
        setIsLoading(true);
        setError(null);
        
        try {
          // Use the directly provided mermaid code if available,
          // otherwise generate it from journeyData
          const diagramCode = mermaidCode || 
            (journeyData ? generateMermaidJourneyMap(journeyData) : null);
          
          if (!diagramCode) {
            throw new Error('No diagram code or journey data available');
          }
          
          // Clear the previous diagram
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '';
            mermaidRef.current.textContent = diagramCode;
          }
          
          // Render the new diagram
          await mermaid.run({
            nodes: [mermaidRef.current]
          });
          
          setIsLoading(false);
        } catch (err) {
          console.error('Mermaid rendering error:', err);
          setError(`Error rendering diagram: ${err.message}`);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    renderDiagram();
  }, [journeyData, mermaidCode]);
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };
  
  // Download SVG
  const handleDownloadSVG = () => {
    const svgElement = document.querySelector('.mermaid svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = 'journey_map.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  };
  
  // If no data and no mermaid code, show a message
  if (!journeyData && !mermaidCode) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500">No journey data available. Please upload data and analyze it first.</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {journeyData?.journey_name || "Journey Map"}
        </h2>
        <div className="p-4 mt-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {journeyData?.journey_name || "Journey Map"}
          </h2>
          {journeyData?.summary && (
            <p className="text-gray-600 mt-1">{journeyData.summary}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleZoomIn}
            className="p-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button 
            onClick={handleDownloadSVG}
            className="p-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            title="Download SVG"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Generating journey map...</p>
        </div>
      ) : (
        <div 
          className="mermaid-container overflow-x-auto" 
          style={{transform: `scale(${zoomLevel})`, transformOrigin: 'top left'}}
        >
          <div className="mermaid" ref={mermaidRef}></div>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p><span className="font-medium">Note:</span> This journey map was generated directly from your data using Gemma AI.</p>
      </div>
    </div>
  );
};

// Helper function to generate the Mermaid journey map from journey data
// This is used as a fallback if direct mermaid code is not provided
const generateMermaidJourneyMap = (journeyData) => {
  const { journey_name, phases } = journeyData;
  
  // Validate journey data structure
  if (!phases || !Array.isArray(phases) || phases.length === 0) {
    throw new Error('Journey data missing valid phases array');
  }
  
  // Start journey diagram syntax
  let mermaidCode = `journey\n  title ${journey_name}\n`;
  
  // Process each phase and its touchpoints
  phases.forEach(phase => {
    // Sanitize phase name for Mermaid compatibility
    const phaseName = sanitizeForMermaid(phase.name);
    
    // Add section for the phase
    mermaidCode += `\n  section ${phaseName}\n`;
    
    // Calculate the satisfaction score on a scale of 0-7 (Mermaid's scale)
    // Based on the 0-100 scale in our data
    let emotionScore = 4; // Default to neutral (4 out of 7)
    
    if (phase.emotions && phase.emotions.length > 0) {
      const emotion = phase.emotions[0];
      // Convert from 0-100 scale to 0-7 scale
      emotionScore = Math.round(emotion.value * 7 / 100);
    }
    
    // Add touchpoints as tasks in the section
    if (phase.touchpoints && phase.touchpoints.length > 0) {
      phase.touchpoints.forEach(touchpoint => {
        // Sanitize content for Mermaid compatibility
        const touchpointType = sanitizeForMermaid(touchpoint.type);
        const description = sanitizeForMermaid(touchpoint.description);
        
        // Format: Task name: satisfaction rating: actors, "annotation"
        mermaidCode += `    ${touchpointType}: ${emotionScore}: User, "${description}"\n`;
      });
    } else {
      // Add a default touchpoint if none exists
      mermaidCode += `    ${phaseName} Activities: ${emotionScore}: User, "Activities in this phase"\n`;
    }
  });
  
  return mermaidCode;
};

// Helper function to sanitize text for Mermaid compatibility
const sanitizeForMermaid = (text) => {
  if (!text) return 'Unnamed';
  
  // Replace characters that break Mermaid syntax
  return text
    .replace(/"/g, '\'') // Replace double quotes with single quotes
    .replace(/:/g, '-')  // Replace colons with hyphens
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .substring(0, 50);   // Limit length to avoid overflow
};

export default MermaidJourneyMap;