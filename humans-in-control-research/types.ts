
export interface FileUpload {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
}

export interface Citation {
  sourceFile: string;
  text: string; // The quote
  url?: string; // Link to original source
  sourceName?: string; // e.g. "Higher Ed Dive", "OpenAlex"
  author?: string; // If identifiable
  publicationDate?: string; // If identifiable
}

export interface EvidenceItem {
  label: string;
  quote: string; // Direct quote from source material (Legacy/Display)
  citation: Citation; // Full citation details
}

export interface Theme {
  name: string;
  description: string;
  quote: string; // Primary quote (Legacy/Display)
  citations: Citation[]; // All supporting evidence
  isCrossDocument: boolean; // True if supported by >1 file
  status?: 'approved' | 'skipped' | 'priority'; // New: User weighting
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
  visualPrompt?: string; // Editable GenAI prompt for this scene
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

export type SlideLayout =
  | 'TITLE_SLIDE'
  | 'SECTION_HEADER'
  | 'KEY_STATISTIC'        // Single powerful number, full-width
  | 'EVIDENCE_WALL'        // 3-4 findings side by side with sources
  | 'QUOTE_FEATURE'        // Full-width quote with attribution
  | 'PERSONA_SPOTLIGHT'    // Persona card with key tension
  | 'DATA_INSIGHT'         // Data + interpretation + "so what"
  | 'COMPARISON'           // Before/after or current/desired
  | 'RECOMMENDATION'       // Action + impact + evidence
  | 'CLOSING_CTA'          // Call to action with next steps
  | 'CONTENT_SPLIT_RIGHT'  // Image on Right, Text on Left
  | 'CONTENT_SPLIT_LEFT'   // Image on Left, Text on Right
  | 'FULL_BLEED_IMAGE'     // Image covers slide, text overlay
  | 'TYPOGRAPHY_QUOTE';    // Focus on big text

export interface SlideStyle {
    backgroundColor: string;
    headerColor: string;
    textColor: string;
    accentColor: string;
}

export interface Slide {
  slideNumber: number;
  layout: SlideLayout;
  title: string;
  content: string[]; // Renamed from bulletPoints to content (can be paragraphs or bullets)
  narrative: string; // New: The connecting story/voiceover for this slide
  speakerNotes: string; // Narrative for the presenter
  visualPrompt: string; // Editable GenAI prompt
  quote: string; // Transparency: Direct quote from research backing this slide
  rationale?: string; // Why this slide exists (for Structure step)
  imageUrl?: string;
  imageStatus?: 'idle' | 'generating' | 'error';
  style: SlideStyle; // New: Custom colors for this specific slide
}

export interface StrategicRecommendation {
  title: string;
  description: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  actionItems: string[];
}

// --- SERVICE DESIGN TYPES ---

export interface ServiceBlueprintStage {
    phase: string;             // Chronological Phase (e.g., Discovery)
    customerAction: string;    // What the user does
    touchpoint: string;        // Channel/Device/Interaction point
    frontstageAction: string;  // Employee/App visible action
    backstageAction: string;   // Internal process/System invisble action
    supportProcesses: string;  // Infrastructure/3rd party
    physicalEvidence: string;  // What they see/hold
    emotion: 'Positive' | 'Neutral' | 'Negative' | 'Frustrated' | 'Delighted';
    painPoint: string;
}

export interface TechNode {
    id: string;
    label: string;
    type: 'User' | 'System' | 'Database' | 'External API' | 'Security';
    description: string;
}

export interface TechFlow {
    fromId: string;
    toId: string;
    action: string;
    protocol?: string;
}

export interface TechnicalArchitecture {
    overview: string;
    nodes: TechNode[];
    flows: TechFlow[];
    securityConsiderations: string[];
    diagramUrl?: string; // Visual representation of the architecture
}

// --- PRODUCT MANAGEMENT TYPES (NEW) ---

export interface PRDFeature {
    id: string;
    name: string;
    description: string;
    priority: 'Must-have' | 'Should-have' | 'Could-have' | 'Won\'t-have'; // MoSCoW
    userStories: string[];
    dependencies: string;
    citation?: string; // Source quote
}

export interface PRD {
    title: string;
    purposeAndObjectives: string; // Objectives (SMART)
    targetAudience: string;
    successMetrics: string[]; // KPIs
    features: PRDFeature[];
    userFlowAndDesignNotes: string; // High level flow
    systemRequirements: string[]; // Non-functional
    assumptions: string[];
    constraints: string[]; // Limitations
    dependencies: string[]; // External reliance
    risks: string[];
    scopeIn: string[];
    scopeOut: string[];
    releaseCriteria?: string[]; // New
    timeline?: string; // New
}

export interface RoadmapItem {
    id: string;
    initiative: string;
    description: string;
    horizon: 'Now' | 'Next' | 'Later';
    owner: string;
    status: 'Planned' | 'In Progress' | 'Discovery' | 'Shipped';
    dependencies: string[];
    successMetric?: string; // New
}

export interface StrategicRoadmap {
    vision: string;
    goals: string[]; // New: High level goals
    themes: string[]; // Strategic themes this roadmap addresses
    items: RoadmapItem[];
}

export interface AnalysisResult {
  methodology: string; // Transparency: Summary of the AI's thinking process
  selectedOutputs: OutputOption[]; // To track what to show
  themes: Theme[];
  personas: Persona[];
  videoScript?: ScriptScene[]; // Optional based on selection
  slides?: Slide[]; // Optional based on selection
  recommendations: StrategicRecommendation[]; 
  journeyMap?: ServiceBlueprintStage[]; 
  techArchitecture?: TechnicalArchitecture;
  prd?: PRD;
  roadmap?: StrategicRoadmap;
  journeyMapDiagramUrl?: string;
  gapAnalysis?: GapAnalysis;
  techAudit?: TechEcosystemAudit;
  competitiveAnalysis?: CompetitiveAnalysis;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

// --- NEW TYPES FOR HUMAN-IN-THE-LOOP FLOW ---

export enum AnalysisStage {
  IDLE = 'IDLE',
  DATA_REVIEW = 'DATA_REVIEW', // Step 0.5: Review collected data before ingestion
  INGESTION = 'INGESTION', // Step 1: Context check
  THEMES = 'THEMES',       // Step 2: Theme verification
  PERSONAS = 'PERSONAS',   // Step 3: Persona verification
  
  // Dynamic Branches
  PRD = 'PRD',                 // New
  ROADMAP = 'ROADMAP',         // New
  JOURNEY_MAP = 'JOURNEY_MAP', 
  TECH_ARCH = 'TECH_ARCH',     
  RECOMMENDATIONS = 'RECOMMENDATIONS',
  GAP_ANALYSIS = 'GAP_ANALYSIS',
  TECH_AUDIT_STAGE = 'TECH_AUDIT_STAGE',
  COMPETITIVE_ANALYSIS = 'COMPETITIVE_ANALYSIS',

  DECK_STRUCTURE = 'DECK_STRUCTURE', // Step 3.5: Deck Outline Customization
  NARRATIVE = 'NARRATIVE', // Step 4: Narrative & Strategy Draft (Text Only)
  FINAL = 'FINAL'          // Step 5: Asset Visualization (Images/Video)
}

export interface DocumentMetadata {
    fileName: string;
    author?: string;
    publicationDate?: string;
}

export interface StepResult_Ingestion {
    methodology: string;
    summary: string;
    dataTypesIdentified: string[];
    keyStakeholders: string[];
    documents: DocumentMetadata[];
    confidenceScore: number;
    reasoning: string;
}

export interface StepResult_Themes {
    methodology: string;
    themes: Theme[];
}

export interface StepResult_Personas {
    methodology: string;
    personas: Persona[];
}

export interface StepResult_JourneyMap {
    methodology: string;
    stages: ServiceBlueprintStage[];
    diagramUrl?: string;
}

export interface StepResult_TechArch {
    methodology: string;
    architecture: TechnicalArchitecture;
}

export interface StepResult_PRD {
    methodology: string;
    prd: PRD;
}

export interface StepResult_Roadmap {
    methodology: string;
    roadmap: StrategicRoadmap;
}

export interface StepResult_Recommendations {
    methodology: string;
    recommendations: StrategicRecommendation[];
}

export interface StepResult_Structure {
    methodology: string;
    storyArc: string; // New: Summary of the narrative flow
    slides: Slide[]; // Partially filled (Title, Layout, Rationale only)
}

export interface StepResult_Narrative {
    methodology: string;
    videoScript: ScriptScene[];
    slides: Slide[];
}

export interface StepResult_Final {
    methodology: string;
    videoScript?: ScriptScene[];
    slides?: Slide[];
    journeyMap?: ServiceBlueprintStage[];
    techArchitecture?: TechnicalArchitecture;
    recommendations?: StrategicRecommendation[];
    prd?: PRD;
    roadmap?: StrategicRoadmap;
    journeyMapDiagramUrl?: string;
}

export type OutputOption = 'PERSONAS' | 'STRATEGY_DECK' | 'VIDEO_SCRIPT' | 'JOURNEY_MAP' | 'TECH_ARCH' | 'STRATEGIC_RECS' | 'PRD' | 'ROADMAP' | 'GAP_ANALYSIS' | 'TECH_AUDIT' | 'COMPETITIVE_ANALYSIS';

// ============================================================
// NEW OUTPUT TYPES: Gap Analysis, Tech Audit, Competitive Analysis
// ============================================================

export interface GapItem {
    capability: string;
    currentMaturity: number;    // 1-5
    targetMaturity: number;     // 1-5
    gap: number;                // target - current
    severity: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
    effort: 'low' | 'medium' | 'high';
}

export interface ActionItem {
    action: string;
    gapRef?: string;
    priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    timeline?: string;
    owner?: string;
    dependencies?: string[];
}

export interface GapAnalysis {
    assessmentScope: string;
    currentState: { capability: string; maturity: number; evidence: string }[];
    desiredState: { capability: string; targetMaturity: number; rationale: string }[];
    gaps: GapItem[];
    prioritizedActions: ActionItem[];
    quickWins: ActionItem[];
    riskRegister: { risk: string; likelihood: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high'; mitigation: string }[];
}

export interface SystemRecord {
    name: string;
    vendor: string;
    category: string;
    users: string;
    department: string;
    status: 'active' | 'legacy' | 'planned' | 'deprecated';
}

export interface IntegrationLink {
    source: string;
    target: string;
    method: string;
    health: 'healthy' | 'degraded' | 'broken' | 'unknown';
    dataFlow: string;
}

export interface CapabilityScore {
    capability: string;
    currentMaturity: number;    // 1-5
    targetMaturity: number;     // 1-5
    gap: number;
}

export interface TechEcosystemAudit {
    systemsInventory: SystemRecord[];
    integrationMap: IntegrationLink[];
    capabilityMatrix: CapabilityScore[];
    consolidationOpportunities: { title: string; description: string; impact: string; effort: string }[];
    recommendations: StrategicRecommendation[];
}

export interface CompetitorProfile {
    name: string;
    position: string;
    strengths: string[];
    weaknesses: string[];
    differentiators: string[];
}

export interface BenchmarkDimension {
    dimension: string;
    weight: number;
    description: string;
}

export interface CompetitiveAnalysis {
    industryContext: string;
    peers: CompetitorProfile[];
    benchmarkDimensions: BenchmarkDimension[];
    maturityMatrix: { peer: string; scores: Record<string, number> }[];
    gapSummary: { dimension: string; ourScore: number; bestInClass: number; gap: number; action: string }[];
}

export interface StepResult_GapAnalysis {
    methodology: string;
    analysis: GapAnalysis;
}

export interface StepResult_TechAudit {
    methodology: string;
    audit: TechEcosystemAudit;
}

export interface StepResult_CompetitiveAnalysis {
    methodology: string;
    analysis: CompetitiveAnalysis;
}

// ============================================================
// ANALYTICAL LENS FRAMEWORK
// ============================================================

export type AnalyticalLens = 'general_cx' | 'fundraising_advancement' | 'student_learner' | 'digital_product' | 'enterprise_technology' | 'custom';

export const ANALYTICAL_LENS_LABELS: Record<AnalyticalLens, string> = {
    general_cx: 'General CX Research',
    fundraising_advancement: 'Fundraising & Advancement',
    student_learner: 'Student & Learner Experience',
    digital_product: 'Digital Product & Mobile',
    enterprise_technology: 'Enterprise Technology',
    custom: 'Custom Framework',
};

export interface LensConfig {
    lens: AnalyticalLens;
    personaExtensions: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[];
    journeyStages: string[];
    specializedPromptSegment: string;
}

// --- PERSISTENCE ---

export interface SavedProject {
    id: string;
    name: string;
    createdAt: number;
    goal: string;
    approach: string;
    selectedOutputs: OutputOption[];
    
    // The Snapshot Data
    result: AnalysisResult | null;
    ingestion: StepResult_Ingestion | null;
    themes: StepResult_Themes | null;
    personas: StepResult_Personas | null;
    journeyMap: StepResult_JourneyMap | null;
    techArch: StepResult_TechArch | null;
    prd: StepResult_PRD | null; // New
    roadmap: StepResult_Roadmap | null; // New
    recommendations: StepResult_Recommendations | null; // New
    structure: StepResult_Structure | null;
    narrative: StepResult_Narrative | null;
}

// ============================================================
// UX HEURISTIC ANALYSIS TYPES
// ============================================================

export type SeverityScore = 0 | 1 | 2 | 3 | 4;
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingPriority = 'must_fix' | 'should_fix' | 'nice_to_have';

export type HeuristicDimensionId =
    | 'traditional_usability'
    | 'accessibility'
    | 'visual_design'
    | 'conversational_ai'
    | 'trust_architecture'
    | 'agentic_commerce'
    | 'social_commerce'
    | 'geo_optimization';

export const HEURISTIC_DIMENSION_LABELS: Record<HeuristicDimensionId, string> = {
    traditional_usability: 'Traditional Usability (Nielsen)',
    accessibility: 'Accessibility (WCAG 2.1 AA / 3.0)',
    visual_design: 'Visual Design (Gestalt & Hierarchy)',
    conversational_ai: 'Conversational AI (6 Agentic Patterns)',
    trust_architecture: 'Trust Architecture',
    agentic_commerce: 'Agentic Commerce Readiness',
    social_commerce: 'Social Commerce Integration',
    geo_optimization: 'GEO Optimization',
};

export interface HeuristicFinding {
    id: string;
    dimension: HeuristicDimensionId;
    screenshotRefs: number[];       // 1-indexed screenshot numbers
    severity: SeverityScore;
    confidence: ConfidenceLevel;
    title: string;                  // 5-10 words
    description: string;            // 1-2 sentences
    recommendation: string;         // 1 sentence
    priority?: FindingPriority;     // set by user at checkpoint
    subcategory?: string;           // e.g. "Heuristic 3: User Control" or "Pattern 2: Guided Narrowing"
}

export interface DimensionScore {
    dimension: HeuristicDimensionId;
    averageSeverity: number;        // 0.0 - 4.0
    findingCount: number;
    criticalCount: number;          // severity 3+4
}

export interface HeuristicExecutiveSummary {
    overallScore: number;           // 0-100 (100 = no issues)
    totalFindings: number;
    severityDistribution: Record<SeverityScore, number>;  // {0: n, 1: n, 2: n, 3: n, 4: n}
    topIssues: HeuristicFinding[];  // exactly 5, sorted by severity desc
    summary: string;                // exactly 3 sentences
}

export interface UXBrief {
    productName: string;
    productUrl?: string;
    targetAudience: string[];
    businessGoals: string[];
    competitiveContext?: string;
    experienceType: 'marketing_website' | 'ecommerce' | 'saas_dashboard' | 'mobile_app' | 'conversational_ai' | 'social_commerce';
    evaluationDimensions: HeuristicDimensionId[];
}

export interface HeuristicReport {
    brief: UXBrief;
    executiveSummary: HeuristicExecutiveSummary;
    dimensions: DimensionScore[];
    findings: HeuristicFinding[];
    screenshotCount: number;
    modelUsed: string;
    analyzedAt: string;
}

// ============================================================
// RESEARCH QUALITY & CITATION ENGINEERING
// ============================================================

export type CredibilityTier = 1 | 2 | 3;

export const CREDIBILITY_LABELS: Record<CredibilityTier, string> = {
    1: 'Tier 1: Peer-Reviewed / Government',
    2: 'Tier 2: Established News / Think Tank',
    3: 'Tier 3: Community / Social',
};

export const CREDIBILITY_COLORS: Record<CredibilityTier, string> = {
    1: '#115054',   // teal (gold standard)
    2: '#fd8e2e',   // orange
    3: '#acacac',   // gray
};

export interface SourceProvenance {
    id: string;                     // unique chunk ID e.g. "CHUNK_001"
    sourceId: string;               // connector ID e.g. "openalex"
    sourceName: string;             // "OpenAlex"
    sourceUrl?: string;             // URL to the original item
    credibilityTier: CredibilityTier;
    collectionTimestamp: string;     // ISO when we collected
    publicationDate?: string;       // ISO when it was published
    freshnessScore: number;         // 0-100
    relevanceScore: number;         // 0-100 from AI scoring
    relevanceReason?: string;       // AI explanation
    citationCount?: number;         // academic sources
    peerReviewed?: boolean;
    contentHash: string;            // for dedup + audit
    title: string;
    content: string;                // the actual text
    included: boolean;              // user toggle at DATA_REVIEW
}

export interface CitationSpan {
    chunkId: string;                // links to SourceProvenance.id
    sourceTitle: string;
    sourceUrl?: string;
    sourceTier: CredibilityTier;
    citedText: string;
    generatedTextStart: number;     // char offset in generated output
    generatedTextEnd: number;
}

export interface ResearchCorpus {
    items: SourceProvenance[];
    totalCollected: number;
    totalAfterRelevanceFilter: number;
    totalAfterUserReview: number;
    averageFreshness: number;
    averageRelevance: number;
    tierDistribution: Record<CredibilityTier, number>;
    dateRange: { earliest: string; latest: string };
}

export function computeFreshnessScore(dateStr?: string): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) return 100;
    if (ageDays <= 180) return 85;
    if (ageDays <= 365) return 70;
    if (ageDays <= 730) return 50;
    if (ageDays <= 1825) return 25;
    return 5;
}

export function computeContentHash(content: string): string {
    // Simple hash for browser environment (not crypto-grade, but sufficient for dedup)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'hash_' + Math.abs(hash).toString(36);
}
