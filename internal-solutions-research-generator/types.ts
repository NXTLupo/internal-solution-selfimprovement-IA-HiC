
export interface FileUpload {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
}

export interface EvidenceItem {
  label: string;
  quote: string; // Direct quote from source material
}

export interface Theme {
  name: string;
  description: string;
  quote: string; // Direct quote from source material
}

export interface StrategicAnalysis {
  who: string;       // Which emerging audience, community, or mindset?
  what: string;      // What are they talking about, feeling, or resisting?
  whenWhere: string; // When and where do these narratives show up?
  why: string;       // Why does this matter; what opportunities/tensions?
}

export interface Persona {
  name: string;
  role: string;
  demographics: string;
  quote: string; // The persona's "voice" quote (synthetic)
  bio: string;
  fiveWs: StrategicAnalysis; // The 5 W's Framework
  motivations: EvidenceItem[];
  tasks: EvidenceItem[];
  painPoints: EvidenceItem[];
  opportunities: EvidenceItem[];
  imageUrl?: string;
}

export interface ScriptScene {
  sceneNumber: number;
  visualDescription: string;
  audioNarration: string;
  durationSeconds: number;
  tags: string[]; // e.g., "Persona Intro", "Problem", "Solution"
  quote: string; // Transparency: Direct quote from research justifying this scene
  imageUrl?: string;
  imageStatus?: 'idle' | 'generating' | 'error';
  videoUrl?: string;
  videoStatus?: 'idle' | 'generating' | 'completed' | 'error';
  personaRef?: string; // Name of the persona if this scene features them
}

export interface Slide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  speakerNotes: string; // Narrative for the presenter
  visualPrompt: string;
  quote: string; // Transparency: Direct quote from research backing this slide
  imageUrl?: string;
}

export interface AnalysisResult {
  methodology: string; // Transparency: Summary of the AI's thinking process
  themes: Theme[];
  personas: Persona[];
  videoScript: ScriptScene[];
  slides: Slide[]; // New Strategy Deck
}

export type AnalysisType = 
  | 'GENERAL_ETHNOGRAPHY' 
  | 'WHITESPACE_OPPORTUNITY' 
  | 'BEHAVIORAL_PSYCHOLOGY' 
  | 'CUSTOMER_JOURNEY';

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
