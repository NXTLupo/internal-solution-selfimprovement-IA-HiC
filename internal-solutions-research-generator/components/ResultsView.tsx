import React, { useState } from 'react';
import { AnalysisResult, Persona, ScriptScene, EvidenceItem, Theme, Slide } from '../types';
import { generateSceneVideo, generateImage } from '../services/geminiService';
import PptxGenJS from 'pptxgenjs';

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

// Simple Modal Component for Evidence
const EvidenceModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    content: string; 
    quote: string;
}> = ({ isOpen, onClose, title, content, quote }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white border border-[#e5e5e5] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#141414]">{title}</h3>
                    <button onClick={onClose} className="text-[#525252] hover:text-[#141414] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-[#525252] mb-6 text-lg leading-relaxed">{content}</p>

                    <div className="bg-[#fafafa] p-4 rounded-lg border-l-4 border-[#caca20]">
                        <p className="text-xs text-[#115054] uppercase font-bold mb-2">Verbatim Evidence from Research</p>
                        <p className="text-[#141414] italic font-serif text-lg">"{quote}"</p>
                    </div>
                </div>
                <div className="p-4 bg-[#fafafa] border-t border-[#e5e5e5] text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#141414] rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC<Props> = ({ result, onReset }) => {
  const [activeTab, setActiveTab] = useState<'personas' | 'script' | 'deck'>('personas');
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>(result.videoScript);
  const [slides, setSlides] = useState<Slide[]>(result.slides);
  const [showMethodology, setShowMethodology] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', content: '', quote: '' });

  const openEvidence = (title: string, content: string, quote: string) => {
      setModalData({ title, content, quote });
      setModalOpen(true);
  };

  const handleGenerateVideo = async (index: number) => {
    const scene = scriptScenes[index];
    if (scene.videoStatus === 'generating' || scene.videoStatus === 'completed') return;

    const newScenes = [...scriptScenes];
    newScenes[index] = { ...scene, videoStatus: 'generating' };
    setScriptScenes(newScenes);

    try {
        const videoUrl = await generateSceneVideo(scene.visualDescription, scene.imageUrl);
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { 
                ...updated[index], 
                videoUrl: videoUrl, 
                videoStatus: 'completed' 
            };
            return updated;
        });
    } catch (e) {
        console.error("Video generation error", e);
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], videoStatus: 'error' };
            return updated;
        });
    }
  };

  const handleRegenerateImage = async (index: number) => {
    const scene = scriptScenes[index];
    if (scene.imageStatus === 'generating') return;

    const newScenes = [...scriptScenes];
    newScenes[index] = { ...scene, imageStatus: 'generating' };
    setScriptScenes(newScenes);

    try {
        // Find reference image if persona is linked
        let refImage = undefined;
        if (scene.personaRef) {
             const persona = result.personas.find(p => p.name === scene.personaRef);
             if (persona?.imageUrl) {
                 refImage = persona.imageUrl;
             }
        }

        const imageUrl = await generateImage(scene.visualDescription, "16:9", refImage);
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { 
                ...updated[index], 
                imageUrl: imageUrl, 
                imageStatus: 'idle',
                videoUrl: undefined,
                videoStatus: 'idle'
            };
            return updated;
        });
    } catch (e) {
        console.error("Image regeneration error", e);
        setScriptScenes(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageStatus: 'error' };
            return updated;
        });
    }
  };

  const handleRegenerateSlideImage = async (index: number) => {
    const slide = slides[index];
    if (slide.imageStatus === 'generating') return;

    const newSlides = [...slides];
    newSlides[index] = { ...slide, imageStatus: 'generating' };
    setSlides(newSlides);

    try {
        const imageUrl = await generateImage(slide.visualPrompt, "16:9");
        setSlides(prev => {
            const updated = [...prev];
            updated[index] = { 
                ...updated[index], 
                imageUrl: imageUrl, 
                imageStatus: 'idle'
            };
            return updated;
        });
    } catch (e) {
        console.error("Slide image regeneration error", e);
        setSlides(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], imageStatus: 'error' };
            return updated;
        });
    }
  };

  const handleDownloadPPT = () => {
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches

      // Colors: Magenta #EA00FF, Black #000000, White #FFFFFF, Dark Grey #1A1A1A
      const CMAGENTA = 'EA00FF';
      
      // 1. Define Master Slides for NXT Humans System
      // Dark Master
      pres.defineSlideMaster({
          title: 'MASTER_CONTENT_DARK',
          background: { color: '000000' },
          objects: [
             // Logo mark bottom right if needed, kept simple for now
          ]
      });

      // Light Master
      pres.defineSlideMaster({
          title: 'MASTER_CONTENT_LIGHT',
          background: { color: 'FFFFFF' },
          objects: []
      });

      // SLIDE 1: TITLE SLIDE (Dark)
      const slide1 = pres.addSlide({ masterName: 'MASTER_CONTENT_DARK' });
      slide1.addText('STRATEGIC ANALYSIS', { x: 0.5, y: 2.2, fontFace: 'Poppins', bold: true, fontSize: 40, color: 'FFFFFF' });
      slide1.addText([
          { text: 'NXT HUMANS', options: { color: 'FFFFFF' } },
          { text: '.', options: { color: CMAGENTA } } // Pink Dot
      ], { x: 0.5, y: 3.0, fontFace: 'Poppins', bold: true, fontSize: 54 });
      slide1.addText('Enhancing human connections. Powering business outcomes.', { x: 0.5, y: 4.2, fontFace: 'Open Sans', fontSize: 16, color: 'CCCCCC' });
      slide1.addText('SLIDE 01', { x: 9.0, y: 0.3, fontFace: 'Courier New', fontSize: 10, color: '333333', align: 'right' });


      // SLIDE 2: AGENDA (White)
      const slide2 = pres.addSlide({ masterName: 'MASTER_CONTENT_LIGHT' });
      slide2.addText('NXT HUMANS', { x: 0.5, y: 0.4, fontFace: 'Poppins', bold: true, fontSize: 10, color: CMAGENTA, charSpacing: 3 });
      slide2.addText('AGENDA', { x: 0.5, y: 0.9, fontFace: 'Poppins', bold: true, fontSize: 32, color: '000000' });
      // Line Separator
      slide2.addShape(pres.ShapeType.line, { x: 0.5, y: 1.4, w: 9.0, h: 0, line: { color: 'E0E0E0', width: 1 } });
      
      const agendaItems = [
          'Context & Scope',
          'Themes & Rituals',
          'Persona Deep Dives',
          'Strategic Roadmap'
      ];
      
      agendaItems.forEach((item, i) => {
          slide2.addText([
            { text: `${i+1}. `, options: { color: CMAGENTA, bold: true } },
            { text: item, options: { color: '000000' } }
          ], { x: 1.5, y: 2.0 + (i * 0.7), fontFace: 'Poppins', fontSize: 24, bold: true });
      });
      slide2.addText('SLIDE 02', { x: 9.0, y: 0.3, fontFace: 'Courier New', fontSize: 10, color: 'CCCCCC', align: 'right' });


      // CONTENT SLIDES
      slides.forEach((slideContent, idx) => {
          const isDark = idx % 3 === 0; // Alternate dark slides occasionally for impact? Actually let's stick to Light mostly as per typical strategy decks, unless title.
          // Let's use Light for content slides to match the screenshots mostly, except special ones. 
          // Actually user said "UI Formatting". UI has white backgrounds for slides.
          const bgColor = 'FFFFFF';
          const textColor = '000000';
          const subTextColor = '555555';
          
          const slide = pres.addSlide({ masterName: 'MASTER_CONTENT_LIGHT' });
          
          // 1. Header Area
          // Headline
          slide.addText([
              { text: slideContent.title, options: { color: textColor } },
              { text: '.', options: { color: CMAGENTA } }
          ], { x: 0.5, y: 0.5, w: 7.5, h: 1.0, fontFace: 'Poppins', bold: true, fontSize: 32, valign: 'top' });

          // Eyebrow
          slide.addText('NXT HUMANS', { x: 0.5, y: 1.1, fontFace: 'Poppins', bold: true, fontSize: 10, color: CMAGENTA, charSpacing: 3 });
          
          // Slide Number (Top Right)
          slide.addText(String(idx + 3).padStart(2, '0'), { x: 9.0, y: 0.5, fontFace: 'Poppins', bold: true, fontSize: 32, color: 'E0E0E0', align: 'right' });

          // Separator Line
          slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.4, w: 9.0, h: 0, line: { color: 'E0E0E0', width: 1 } });

          // 2. Content Layout (Split Screen)
          // Text Column (Left)
          // Construct bullet objects for precise formatting
          const bulletObjects = slideContent.bulletPoints.map(bp => ({
              text: bp,
              options: { 
                  fontSize: 14, 
                  fontFace: 'Open Sans', 
                  color: textColor, 
                  breakLine: true,
                  paraSpaceAfter: 12, // Spacing between list items
                  bullet: { type: 'bullet', color: CMAGENTA, indent: 15 } // Custom magenta bullet
              }
          }));

          slide.addText(bulletObjects, {
              x: 0.5, y: 1.7, w: 4.5, h: 3.5,
              valign: 'top',
              margin: 5
          });

          // Block Quote (Bottom Left)
          // Add shape for border left
          slide.addShape(pres.ShapeType.rect, { 
              x: 0.5, y: 4.8, w: 0.05, h: 0.6, 
              fill: { color: CMAGENTA } 
          });
          
          slide.addText('RESEARCH EVIDENCE', {
              x: 0.6, y: 4.8, w: 4.0, h: 0.2,
              fontFace: 'Poppins', bold: true, fontSize: 8, color: '999999', charSpacing: 2
          });

          slide.addText(`"${slideContent.quote}"`, {
              x: 0.6, y: 5.0, w: 4.2, h: 0.5,
              fontFace: 'Open Sans', fontSize: 9, color: subTextColor, italic: true, valign: 'top'
          });

          // 3. Image (Right)
          if (slideContent.imageUrl) {
              slide.addImage({ 
                  data: slideContent.imageUrl, 
                  x: 5.2, y: 1.7, w: 4.3, h: 2.42, // 16:9 aspect
                  sizing: { type: 'cover', w: 4.3, h: 2.42 }
              });
          } else {
              // Placeholder if no image
              slide.addShape(pres.ShapeType.rect, {
                  x: 5.2, y: 1.7, w: 4.3, h: 2.42,
                  fill: { color: 'F8F8F8' },
                  line: { color: 'E0E0E0', width: 1 }
              });
              slide.addText('NXT HUMANS', {
                  x: 5.2, y: 1.7, w: 4.3, h: 2.42,
                  fontFace: 'Poppins', bold: true, fontSize: 24, color: 'DDDDDD', align: 'center'
              });
          }
      });

      pres.writeFile({ fileName: 'NXT_Humans_Strategy_Deck.pptx' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <EvidenceModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalData.title}
        content={modalData.content}
        quote={modalData.quote}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] mb-2">Research Analysis</h2>
          <p className="text-[#525252]">
            {result.themes.length} Key themes identified • {result.personas.length} Personas • {scriptScenes.length} Script Scenes
          </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-[#525252] bg-[#fafafa] hover:bg-[#f5f5f5] rounded-lg border border-[#e5e5e5] transition-colors"
            >
                Start New Analysis
            </button>
            <button 
                className="px-4 py-2 text-sm font-medium text-[#115054] bg-[#caca20] hover:brightness-110 rounded-lg shadow-lg shadow-[#caca20]/20 transition-colors"
                onClick={() => {
                   const exportData = { ...result, videoScript: scriptScenes, slides: slides };
                   const text = JSON.stringify(exportData, null, 2);
                   const blob = new Blob([text], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'persona-story-export.json';
                   a.click();
                }}
            >
                Export JSON
            </button>
        </div>
      </div>

      {/* AI Methodology Section */}
      <div className="mb-8 border border-[#e5e5e5] rounded-lg bg-white overflow-hidden">
        <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-[#fafafa] hover:bg-[#f5f5f5] transition-colors text-left"
        >
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#115054]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span className="font-semibold text-[#141414]">AI Reasoning & Methodology Log</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-[#525252] transition-transform ${showMethodology ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        {showMethodology && (
            <div className="p-6 text-sm text-[#525252] leading-relaxed border-t border-[#e5e5e5] bg-[#fafafa] font-mono">
                <h4 className="text-[#115054] font-bold uppercase tracking-wider text-xs mb-2">Chain of Thought Summary</h4>
                <p className="whitespace-pre-wrap">{result.methodology}</p>
            </div>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b border-[#e5e5e5]">
        <button
          onClick={() => setActiveTab('personas')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'personas' 
              ? 'text-[#115054] border-b-2 border-[#115054]'
              : 'text-[#525252] hover:text-[#141414]'
          }`}
        >
          Personas & Themes
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'script' 
              ? 'text-[#115054] border-b-2 border-[#115054]'
              : 'text-[#525252] hover:text-[#141414]'
          }`}
        >
          Video Script (Storyboard)
        </button>
        <button
          onClick={() => setActiveTab('deck')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'deck' 
              ? 'text-[#115054] border-b-2 border-[#115054]'
              : 'text-[#525252] hover:text-[#141414]'
          }`}
        >
          Strategy Deck
        </button>
      </div>

      {activeTab === 'personas' && (
        <div className="space-y-8 animate-fade-in">
          {/* Themes Section */}
          <section className="bg-[#fafafa] rounded-xl p-6 border border-[#e5e5e5]">
            <h3 className="text-lg font-semibold text-[#141414] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#caca20] rounded-full"></span>
              Key Market Themes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.themes.map((theme, idx) => (
                <button 
                    key={idx} 
                    onClick={() => openEvidence("Theme Detail", theme.description, theme.quote)}
                    className="text-left px-4 py-3 bg-white hover:bg-[#fafafa] text-[#141414] rounded-lg border border-[#e5e5e5] hover:border-[#caca20] transition-all group flex flex-col gap-2"
                >
                  <span className="font-medium text-[#141414] group-hover:text-[#115054]">{theme.name}</span>
                  <span className="text-xs text-[#525252] line-clamp-2">{theme.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Personas Grid */}
          <div className="grid grid-cols-1 gap-6">
            {result.personas.map((persona, idx) => (
              <PersonaCard key={idx} persona={persona} index={idx} onEvidenceClick={openEvidence} />
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'script' && (
        <div className="space-y-6 animate-fade-in">
          {/* Script Header */}
          <div className="bg-white sticky top-4 z-10 p-4 rounded-xl border border-[#e5e5e5] flex justify-between items-center shadow-2xl">
            <div>
                <h3 className="text-lg font-semibold text-[#141414]">Generated Video Script</h3>
                <p className="text-sm text-[#525252]">Total Duration: ~{(scriptScenes.reduce((acc, s) => acc + s.durationSeconds, 0) / 60).toFixed(1)} mins</p>
            </div>
            <div className="text-xs text-[#acacac] uppercase tracking-wider font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Veo 3.1 Ready
            </div>
          </div>
          
          <div className="space-y-8 pb-10">
            {scriptScenes.map((scene, idx) => (
              <ScriptSceneItem 
                key={idx} 
                scene={scene} 
                onGenerateVideo={() => handleGenerateVideo(idx)}
                onRegenerateImage={() => handleRegenerateImage(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deck' && (
          <div className="space-y-6 pb-10 animate-fade-in">
             <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#e5e5e5] sticky top-4 z-20 shadow-xl">
                 <h3 className="text-lg font-bold text-[#141414] font-['Poppins']">Strategy Deck</h3>
                 <button 
                    onClick={handleDownloadPPT}
                    className="flex items-center gap-2 px-4 py-2 bg-[#EA00FF] hover:bg-[#C500D1] text-white rounded font-['Poppins'] font-semibold transition-colors text-sm"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     Download .PPTX
                 </button>
             </div>
            
            {/* Title Slide Visualization */}
            <div className="bg-black p-12 rounded-none shadow-xl max-w-5xl mx-auto text-white aspect-[16/9] flex flex-col items-center justify-center relative border border-[#e5e5e5]">
                <h1 className="text-6xl font-bold font-['Poppins'] tracking-tight mb-4">STRATEGIC ANALYSIS</h1>
                <div className="text-7xl font-bold font-['Poppins']">
                    NXT HUMANS<span className="text-[#EA00FF]">.</span>
                </div>
                <p className="mt-8 text-xl font-['Open_Sans'] text-slate-400">Enhancing human connections. Powering business outcomes.</p>
                <div className="absolute top-4 right-4 text-xs font-mono text-slate-600">SLIDE 01 (TITLE)</div>
            </div>

            {/* Agenda Slide Visualization */}
            <div className="bg-white p-12 rounded-none shadow-xl max-w-5xl mx-auto text-black aspect-[16/9] flex flex-col relative border border-slate-200">
                 <div className="mb-8">
                     <div className="text-xs font-bold font-['Poppins'] text-[#EA00FF] uppercase tracking-widest mb-2">NXT HUMANS</div>
                     <h3 className="text-4xl font-bold font-['Poppins'] tracking-tight">AGENDA</h3>
                 </div>
                 <div className="flex flex-col justify-center h-full pl-20 space-y-6">
                     {['Context & Scope', 'Themes & Rituals', 'Persona Deep Dives', 'Strategic Roadmap'].map((item, i) => (
                         <div key={i} className="text-3xl font-bold font-['Poppins'] flex gap-4">
                             <span className="text-[#EA00FF]">{i+1}.</span>
                             <span>{item}</span>
                         </div>
                     ))}
                 </div>
                 <div className="absolute top-4 right-4 text-xs font-mono text-slate-300">SLIDE 02 (AGENDA)</div>
            </div>

            {slides && slides.length > 0 ? (
                slides.map((slide, idx) => (
                    <div key={idx} className="bg-white p-12 rounded-none shadow-xl max-w-5xl mx-auto text-black aspect-[16/9] flex flex-col relative overflow-hidden group">
                         <div className="absolute top-4 right-4 text-xs font-mono text-slate-300">SLIDE {String(idx + 3).padStart(2, '0')}</div>
                        
                        {/* Header Area */}
                        <div className="mb-8 flex justify-between items-start border-b-2 border-slate-100 pb-4">
                             <div>
                                <h3 className="text-4xl font-bold font-['Poppins'] tracking-tight text-black">
                                    {slide.title}<span className="text-[#EA00FF]">.</span>
                                </h3>
                                <div className="text-xs font-bold font-['Poppins'] text-[#EA00FF] mt-1 uppercase tracking-widest">
                                    NXT HUMANS
                                </div>
                             </div>
                             <span className="text-4xl font-black text-slate-100 font-['Poppins']">{String(idx + 3).padStart(2, '0')}</span>
                        </div>

                        {/* Content Split */}
                        <div className="flex gap-12 h-full">
                            <div className="w-1/2 flex flex-col gap-6">
                                <ul className="space-y-4">
                                    {slide.bulletPoints.map((point, i) => (
                                        <li key={i} className="flex items-start gap-3 text-lg font-light font-['Open_Sans'] text-slate-800 leading-relaxed">
                                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#EA00FF] shrink-0"></span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                                
                                <div className="mt-auto border-t border-slate-100 pt-4">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-['Poppins']">Research Evidence</p>
                                     <p className="text-xs text-slate-500 italic font-['Open_Sans'] leading-relaxed line-clamp-3">
                                        "{slide.quote}"
                                    </p>
                                </div>
                            </div>

                            <div className="w-1/2 bg-slate-100 relative overflow-hidden group/image">
                                {slide.imageUrl ? (
                                    <img src={slide.imageUrl} alt="Background" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-['Poppins'] font-bold text-xl">
                                        NXT HUMANS
                                    </div>
                                )}

                                {/* Regenerate Button */}
                                <button
                                    onClick={() => handleRegenerateSlideImage(idx)}
                                    disabled={slide.imageStatus === 'generating'}
                                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-[#EA00FF] text-white rounded-full backdrop-blur-md transition-colors z-20 opacity-0 group-hover/image:opacity-100 focus:opacity-100 shadow-lg"
                                    title="Regenerate Slide Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${slide.imageStatus === 'generating' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>

                                {slide.imageStatus === 'generating' && (
                                     <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                                        <div className="w-8 h-8 border-2 border-[#EA00FF] border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <span className="text-xs text-[#EA00FF] font-bold">Regenerating...</span>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-12 text-[#acacac]">
                    No slides generated for this analysis.
                </div>
            )}
          </div>
      )}
    </div>
  );
};

const PersonaCard: React.FC<{ 
    persona: Persona; 
    index: number;
    onEvidenceClick: (t: string, c: string, q: string) => void;
}> = ({ persona, index, onEvidenceClick }) => (
  <div className="bg-white rounded-xl p-6 border border-[#e5e5e5] shadow-lg hover:border-[#caca20]/50 transition-colors">
    <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Image & Bio */}
        <div className="md:w-1/3 flex flex-col items-center text-center md:items-start md:text-left">
            <div className="w-48 h-48 mb-4 rounded-xl overflow-hidden bg-[#f5f5f5] shadow-inner border border-[#e5e5e5]">
                {persona.imageUrl ? (
                    <img src={persona.imageUrl} alt={persona.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#acacac]">No Image</div>
                )}
            </div>
            <h4 className="text-2xl font-bold text-[#141414]">{persona.name}</h4>
            <p className="text-[#115054] font-medium mb-1">{persona.role}</p>
            <p className="text-xs text-[#525252] mb-4">{persona.demographics}</p>
            
            <p className="text-sm text-[#525252] leading-relaxed mb-4">
                {persona.bio}
            </p>
             <blockquote className="text-sm italic text-[#141414] border-l-4 border-[#caca20] pl-4 py-1 bg-[#fafafa] rounded-r w-full">
                "{persona.quote}"
            </blockquote>
        </div>

        {/* Right Column: Details & 5 W's */}
        <div className="md:w-2/3 space-y-6">
            
            {/* Strategic Snapshot (5 W's) */}
            <div className="bg-[#fafafa] rounded-lg border border-[#e5e5e5] p-4">
                <h5 className="text-xs font-bold uppercase tracking-widest text-[#115054] mb-3 border-b border-[#e5e5e5] pb-2">
                    Strategic Snapshot (The 5 W's)
                </h5>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#acacac] uppercase block">Who</span>
                        <p className="text-sm text-[#141414]">{persona.fiveWs.who}</p>
                    </div>
                    <div className="space-y-1">
                         <span className="text-[10px] font-bold text-[#acacac] uppercase block">What</span>
                         <p className="text-sm text-[#141414]">{persona.fiveWs.what}</p>
                    </div>
                    <div className="space-y-1">
                         <span className="text-[10px] font-bold text-[#acacac] uppercase block">When/Where</span>
                         <p className="text-sm text-[#141414]">{persona.fiveWs.whenWhere}</p>
                    </div>
                    <div className="space-y-1">
                         <span className="text-[10px] font-bold text-[#acacac] uppercase block">Why</span>
                         <p className="text-sm text-[#141414]">{persona.fiveWs.why}</p>
                    </div>
                </div>
            </div>

            {/* Evidence Sections */}
            <div className="grid md:grid-cols-2 gap-6">
                <Section title="Motivations" items={persona.motivations} color="text-emerald-400" onEvidenceClick={onEvidenceClick} />
                <Section title="Tasks (Jobs to be done)" items={persona.tasks} color="text-blue-400" onEvidenceClick={onEvidenceClick} />
                <Section title="Pain Points" items={persona.painPoints} color="text-red-400" onEvidenceClick={onEvidenceClick} />
                <Section title="Opportunities" items={persona.opportunities} color="text-[#fd8e2e]" onEvidenceClick={onEvidenceClick} />
            </div>
        </div>
    </div>
  </div>
);

const Section: React.FC<{ 
    title: string; 
    items: EvidenceItem[]; 
    color: string;
    onEvidenceClick: (t: string, c: string, q: string) => void;
}> = ({ title, items, color, onEvidenceClick }) => (
  <div>
    <h5 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>{title}</h5>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li 
            key={i} 
            className="text-sm text-[#525252] flex items-start gap-2 group cursor-pointer p-1.5 rounded hover:bg-[#f5f5f5] transition-colors"
            onClick={() => onEvidenceClick(title, item.label, item.quote)}
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#acacac] shrink-0 group-hover:bg-[#141414] transition-colors"></span>
          <span>{item.label}</span>
          <span className="ml-auto opacity-0 group-hover:opacity-100 text-[#115054]">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const ScriptSceneItem: React.FC<{ 
    scene: ScriptScene; 
    onGenerateVideo: () => void;
    onRegenerateImage: () => void;
}> = ({ scene, onGenerateVideo, onRegenerateImage }) => {
    const [showQuote, setShowQuote] = useState(false);

    return (
  <div className="bg-white p-6 rounded-xl border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors flex flex-col md:flex-row gap-6">
    {/* Scene Visual */}
    <div className="md:w-1/3 shrink-0 flex flex-col gap-2">
        <div className="aspect-video w-full bg-[#fafafa] rounded-lg overflow-hidden border border-[#e5e5e5] relative group">
             {/* Render Video if available, else Image */}
             {scene.videoUrl ? (
                <div className="relative w-full h-full group">
                    <video 
                        src={scene.videoUrl} 
                        controls 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        muted 
                        loop
                    />
                    <a 
                        href={scene.videoUrl} 
                        download={`scene-${scene.sceneNumber}.mp4`}
                        className="absolute bottom-10 right-2 p-2 bg-black/60 hover:bg-[#115054] text-white rounded-full backdrop-blur-md transition-colors z-20 opacity-0 group-hover:opacity-100"
                        title="Download Video"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </a>
                </div>
             ) : scene.imageUrl ? (
                <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[#acacac]">Generating Visual...</div>
            )}

            <button
                onClick={onRegenerateImage}
                disabled={scene.imageStatus === 'generating'}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-[#115054] text-white rounded-full backdrop-blur-md transition-colors z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Regenerate Image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${scene.imageStatus === 'generating' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>

             <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded z-10 pointer-events-none">
                Scene {scene.sceneNumber} • {scene.durationSeconds}s
            </div>

            {(scene.videoStatus === 'generating' || scene.imageStatus === 'generating') && (
                 <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                    <div className="w-8 h-8 border-2 border-[#caca20] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-[#115054] font-medium text-center px-4">
                        {scene.videoStatus === 'generating' ? 'Analyzing Scene Logic & Generating Video...' : 'Regenerating Image...'}
                    </span>
                 </div>
            )}
        </div>

        {!scene.videoUrl && (
            <button 
                onClick={onGenerateVideo}
                disabled={scene.videoStatus === 'generating' || scene.imageStatus === 'generating' || !scene.imageUrl}
                className={`w-full py-2 px-3 rounded text-xs font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2
                    ${scene.videoStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[#f5f5f5] text-[#525252] border border-[#e5e5e5] hover:bg-[#115054] hover:text-white hover:border-[#115054]'}
                    ${(scene.videoStatus === 'generating' || scene.imageStatus === 'generating' || !scene.imageUrl) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {scene.videoStatus === 'error' ? (
                    <>Retry Video Generation</>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l4 2A1 1 0 0020 14V6a1 1 0 00-1.447-.894l-4 2z" />
                        </svg>
                        Generate Video (Veo 3.1)
                    </>
                )}
            </button>
        )}
    </div>

    <div className="md:w-2/3 space-y-4">
        <div className="flex gap-2 mb-2">
            {scene.tags.map((tag, i) => (
                <span key={i} className="text-[10px] uppercase tracking-wider text-[#acacac] border border-[#e5e5e5] px-1.5 py-0.5 rounded">
                    {tag}
                </span>
            ))}
        </div>

        <div className="grid gap-4">
            <div>
                 <h6 className="text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1 flex items-center gap-2">
                    Visual Description
                </h6>
                <p className="text-[#525252] text-sm">
                    {scene.visualDescription}
                </p>
            </div>
            <div>
                 <h6 className="text-xs font-semibold text-[#115054] uppercase tracking-wider mb-1 flex items-center gap-2">
                    Narration (Research Analysis)
                </h6>
                <p className="text-[#141414] text-lg font-serif leading-relaxed">
                    "{scene.audioNarration}"
                </p>
            </div>
             
             {/* Transparency / Citation Block */}
             <div>
                <button 
                    onClick={() => setShowQuote(!showQuote)}
                    className="text-xs text-[#acacac] hover:text-[#115054] flex items-center gap-1 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showQuote ? 'Hide Evidence Source' : 'Show Evidence Source (Transparency)'}
                </button>
                {showQuote && (
                    <div className="mt-2 p-3 bg-[#fafafa] border-l-2 border-[#e5e5e5] rounded-r text-sm text-[#525252] italic font-mono animate-fade-in">
                        "{scene.quote}"
                    </div>
                )}
             </div>

        </div>
    </div>
  </div>
    );
};

export default ResultsView;