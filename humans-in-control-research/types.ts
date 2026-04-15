
export interface FileUpload {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
}

// ================================================================
// FORMAL EVIDENCE & AUDIT SCHEMAS (per research runtime spec)
// ================================================================

/** Evidence span — atomic unit of cited evidence */
export interface EvidenceSpan {
    source_id: string;
    source_type: 'web' | 'pdf' | 'doc' | 'transcript' | 'dataset' | 'notebook' | 'video' | 'interview';
    locator: {
        url?: string;
        page?: number | null;
        section?: string | null;
        timestamp?: string | null;
        char_start?: number | null;
        char_end?: number | null;
    };
    quote: string;
    claim_support: 'supports' | 'contradicts' | 'neutral';
    confidence: 'high' | 'medium' | 'low';
}

/** Research output envelope — unified output for all methods */
export interface ResearchOutput {
    method: string;
    question: string;
    observations: string[];         // What we SAW (grounded in data)
    inferences: string[];           // What it MEANS (interpretive)
    recommendations: string[];      // What to DO (action)
    evidence: EvidenceSpan[];
    uncertainties: string[];        // What we DON'T know
    conflicts: string[];            // Where sources DISAGREE
    next_questions: string[];       // What to investigate NEXT
}

/** Run metadata — tracks execution details for reproducibility */
export interface RunMetadata {
    runId: string;
    startedAt: string;              // ISO timestamp
    completedAt?: string;
    method: string;
    analyticalLens: string;
    stages: RunStageMetadata[];
    totalCost?: number;
    providerBreakdown?: Record<string, { calls: number; tokens: number; cost: number }>;
}

export interface RunStageMetadata {
    stageId: string;
    stageName: string;
    provider: string;
    model: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    status: 'completed' | 'failed' | 'skipped';
    error?: string;
}

/** Research method selection */
export type ResearchMethodId = 'general_synthesis' | 'jtbd' | 'design_thinking' | 'contextual_inquiry' | 'service_blueprint' | 'nps_diagnostic' | 'karpathy_second_brain';

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
  jtbd?: string; // Jobs-to-Be-Done statement
  goals?: { lifeGoal: string; experienceGoal: string; functionalGoal: string }; // Cooper 3-tier
  fiveWs: StrategicAnalysis; // The 5 W's Framework
  attributes?: { name: string; score: number }[]; // Scored behavioral dimensions
  motivations: EvidenceItem[];
  tasks: EvidenceItem[];
  painPoints: EvidenceItem[];
  opportunities: EvidenceItem[];
  // PERSONA-01: Extended sections
  behaviors?: string;          // Behaviors & habits
  technologyUsage?: string;    // Technology usage & comfort
  journeyContext?: string;     // Journey context & touchpoints
  dayInTheLife?: string;       // Day-in-the-life scenario
  brandRelationships?: string; // Current solutions & loyalty
  communicationPrefs?: string; // Channel & content preferences
  decisionProcess?: string;    // Criteria, influencers, triggers
  confidenceLevel?: string;    // EVIDENCED | PARTIALLY_EVIDENCED | HYPOTHESIS
  evidenceCount?: number;
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

/**
 * Universal Slide Archetypes — 7 content-driven layout patterns.
 * The AI selects the archetype based on what the content IS, not what deliverable it's for.
 * Legacy layouts map to the nearest archetype at render time.
 */
export type SlideLayout =
  | 'TITLE_SLIDE'            // Archetype 1: Left-aligned title, subtitle, horizontal rule
  | 'SECTION_HEADER'         // Archetype 2: Full-bleed dark (#0D0D0D), ghost text, section label
  | 'CONTENT_DATA_PANEL'     // Archetype 3: 55/45 split — text left (#FFF), metric cards right (#FAFAFA)
  | 'CONTENT_INSIGHT_CHART'  // Archetype 4: 55/45 split — text left, single chart right
  | 'FULL_WIDTH_VIZ'         // Archetype 5: No split — heading + full-width data visualization
  | 'BENTO_GRID'             // Archetype 6: 3-6 cells of mixed stats, quotes, indicators
  | 'PROBLEM_SOLUTION'       // Archetype 7: 55/45 split — pain stat left, solution list right
  // Legacy aliases (still accepted by AI, mapped at render time)
  | 'CONTENT_SPLIT_RIGHT'    // -> CONTENT_DATA_PANEL
  | 'CONTENT_SPLIT_LEFT'     // -> CONTENT_DATA_PANEL
  | 'FULL_BLEED_IMAGE'       // -> CONTENT_DATA_PANEL
  | 'TYPOGRAPHY_QUOTE'       // -> BENTO_GRID (quote cell)
  | 'KEY_STATISTIC'          // -> CONTENT_DATA_PANEL (stat-focused)
  | 'EVIDENCE_WALL'          // -> BENTO_GRID
  | 'QUOTE_FEATURE'          // -> BENTO_GRID (quote cell)
  | 'PERSONA_SPOTLIGHT'      // -> CONTENT_DATA_PANEL
  | 'DATA_INSIGHT'           // -> CONTENT_INSIGHT_CHART
  | 'COMPARISON'             // -> PROBLEM_SOLUTION
  | 'RECOMMENDATION'         // -> CONTENT_DATA_PANEL
  | 'CLOSING_CTA';           // -> CONTENT_DATA_PANEL

export interface SlideStyle {
    backgroundColor: string;
    headerColor: string;
    textColor: string;
    accentColor: string;
}

/** Metric card for the data panel (Archetype 3/4) */
export interface SlideMetric {
    label: string;
    value: string;
    unit?: string;
    accentColor?: string;   // Override: '#CC6644' | '#B8B800' | '#00B7C3'
    progress?: number;      // 0-100, renders a progress bar
}

/** Bento cell for Archetype 6 */
export interface BentoCell {
    type: 'stat' | 'quote' | 'indicator' | 'list';
    label?: string;
    value?: string;          // For stat cells
    unit?: string;
    text?: string;           // For quote/indicator cells
    attribution?: string;    // For quote cells
    items?: string[];        // For list/indicator cells
    accentColor?: string;
    span?: number;           // grid-column span (1 or 2)
}

export interface Slide {
  slideNumber: number;
  layout: SlideLayout;
  title: string;
  content: string[];
  narrative: string;
  speakerNotes: string;
  visualPrompt: string;
  quote: string;
  rationale?: string;
  imageUrl?: string;
  imageStatus?: 'idle' | 'generating' | 'error';
  style: SlideStyle;
  // Archetype 3/4 data panel fields
  metrics?: SlideMetric[];
  // Archetype 6 bento grid fields
  bentoCells?: BentoCell[];
  // Archetype 7 problem/solution fields
  problemStat?: { value: string; unit?: string; description: string };
  solutionPoints?: { title: string; description: string }[];
  // Source citations (moved to footnote strip)
  sources?: string[];
  // Abbreviated persona reference (for PERSONA_SPOTLIGHT)
  personaName?: string;
  personaRole?: string;
  personaImageUrl?: string;
  personaQuote?: string;
}

export interface StrategicRecommendation {
  title: string;
  description: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  actionItems: string[];
  citations?: string[];      // Source names that justify this recommendation
  evidenceBasis?: string;    // Brief evidence summary with specific data points
}

/** STRAT-01: Full 15-section strategy document per Rumelt's Kernel */
export interface StrategySection {
    sectionNumber: number;
    title: string;
    content: string;
    evidenceGap?: string; // Flagged if insufficient data
}

export interface StrategyDocument {
    executiveSummary: string;         // SCR format
    diagnosis: string;               // Rumelt: THE central challenge
    guidingPolicy: string;           // Rumelt: the approach/decision
    strategicPillars: string[];      // 3-5 MECE pillars
    sections: StrategySection[];     // All 15 sections
}

// --- SERVICE DESIGN TYPES ---

export interface ServiceBlueprintStage {
    phase: string;             // Chronological Phase (e.g., Discovery)
    customerAction: string;    // What the user does
    touchpoint: string;        // Channel/Device/Interaction point
    frontstageAction: string;  // Employee/App visible action
    backstageAction: string;   // Internal process/System invisible action
    supportProcesses: string;  // Infrastructure/3rd party
    physicalEvidence: string;  // What they see/hold
    emotion: 'Positive' | 'Neutral' | 'Negative' | 'Frustrated' | 'Delighted';
    painPoint: string;
    actors?: string[];                  // Persona names involved at this stage
    actorNeeds?: string;                // What actors need at this stage
    actorBehaviors?: string;            // Observed behaviors per actor
    opportunityForImprovement?: string; // CX improvement opportunity
    valueProposition?: string;          // Value delivered at this stage
    momentOfTruth?: boolean;            // Critical judgment point
    fail_point?: string;               // B-03: Failure mode — what fails, frequency, consequence
    technologySystems?: string;        // B-05: Systems/platforms supporting this stage
    emotionIntensity?: number;         // Emotion intensity score (1-5)
    citations?: string[];              // Source names cited for this stage's evidence
    evidenceBasis?: string;            // Key evidence supporting this stage's analysis
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
    status?: 'active' | 'planned' | 'broken';
}

export interface ArchitectureSection {
    sectionNumber: number;
    title: string;
    content: string;
    evidenceGap?: string;
}

export interface TechnicalArchitecture {
    overview: string;
    sections?: ArchitectureSection[];   // A-02: 20 C4+TOGAF sections
    nodes: TechNode[];
    flows: TechFlow[];
    securityConsiderations?: string[];
    diagramUrl?: string;
    citations?: string[];              // Source names evidencing tech landscape
    evidenceBasis?: string;            // Key evidence for architecture decisions
}

// --- PRODUCT MANAGEMENT TYPES (NEW) ---

export interface PRDFeature {
    id: string;
    name: string;
    description: string;
    priority: 'Must-have' | 'Should-have' | 'Could-have' | 'Won\'t-have'; // MoSCoW
    userStories: string[];
    acceptanceCriteria?: string[];
    dependencies: string;
    citation?: string; // Source quote (legacy single field)
    citations?: string[];      // Source names that justify this feature
    evidenceBasis?: string;    // Key evidence: persona pain points + data that prove this need
}

export interface PRDSection {
    sectionNumber: number;
    title: string;
    content: string;
    evidenceGap?: string;
}

export interface PRD {
    title: string;
    purposeAndObjectives: string; // Objectives (SMART)
    targetAudience: string;
    successMetrics: string[]; // KPIs
    sections?: PRDSection[];  // PRD-03: 16 Cagan/SVPG framework sections
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
    id?: string;
    initiative: string;
    description: string;
    horizon: 'Now' | 'Next' | 'Later';
    owner: string;
    status?: 'Planned' | 'In Progress' | 'Discovery' | 'Shipped';
    dependencies?: string | string[];
    successMetric?: string;
    strategicTheme?: string;
    confidenceLevel?: 'HIGH' | 'MEDIUM' | 'EXPLORATORY';
    citations?: string[];      // Source names that justify this initiative
    evidenceBasis?: string;    // Evidence from themes/personas/gaps that drives this initiative
}

export interface StrategicRoadmap {
    vision: string;
    goals?: string[];
    themes?: string[];
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
  strategyDocument?: StrategyDocument; // STRAT-01: Full 15-section strategy
  journeyMap?: ServiceBlueprintStage[];
  techArchitecture?: TechnicalArchitecture;
  prd?: PRD;
  roadmap?: StrategicRoadmap;
  journeyMapDiagramUrl?: string;
  gapAnalysis?: GapAnalysis;
  techAudit?: TechEcosystemAudit;
  competitiveAnalysis?: CompetitiveAnalysis;
  crossCuttingSynthesis?: CrossCuttingInsight[];
  strategicReport?: StrategicReport;
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

  STRATEGIC_REPORT = 'STRATEGIC_REPORT', // Step 3.5: Strategic whitepaper synthesis
  DECK_STRUCTURE = 'DECK_STRUCTURE', // Step 4: Deck Outline Customization
  NARRATIVE = 'NARRATIVE', // Step 5: Narrative & Strategy Draft (Text Only)
  FINAL = 'FINAL'          // Step 6: Asset Visualization (Images/Video)
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
    strategyDocument?: StrategyDocument; // STRAT-01: Full 15-section strategy
}

// --- CROSS-CUTTING SYNTHESIS TYPES ---

export interface CrossCuttingInsight {
    name: string;
    connectedThemes: string[];
    connectedPersonas: string[];
    strategicImplication: string;
    evidence: string;
}

export interface StepResult_CrossCuttingSynthesis {
    methodology: string;
    insights: CrossCuttingInsight[];
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

export type OutputOption = 'PERSONAS' | 'STRATEGY_DECK' | 'JOURNEY_MAP' | 'TECH_ARCH' | 'STRATEGIC_RECS' | 'PRD' | 'ROADMAP' | 'GAP_ANALYSIS' | 'TECH_AUDIT' | 'COMPETITIVE_ANALYSIS';

/**
 * Bundles ALL available deliverable results for the Strategy Deck pipeline.
 * The deck reads these as READ-ONLY inputs — original outputs are never mutated.
 * The AI reformats this content into slide-appropriate layouts.
 */
export interface DeckInputContext {
    themes?: Theme[];
    personas?: Persona[];
    recommendations?: StrategicRecommendation[];
    journeyStages?: ServiceBlueprintStage[];
    prd?: PRD;
    roadmap?: StrategicRoadmap;
    techArchitecture?: TechnicalArchitecture;
    gapAnalysis?: GapAnalysis;
    techAudit?: TechEcosystemAudit;
    competitiveAnalysis?: CompetitiveAnalysis;
    strategicReport?: StrategicReport;
}

// ============================================================
// STRATEGIC REPORT (Report-First Architecture)
// ============================================================

/** A citation entry in the report's master bibliography */
export interface CitationEntry {
    id: string;                      // CHUNK_XXX reference
    sourceName: string;              // Human-readable name
    sourceUrl?: string;
    tier: CredibilityTier;
    citedInSections: number[];       // Which report sections cite this
}

/** A section of the strategic report — unrestricted depth */
export interface ReportSection {
    sectionNumber: number;
    title: string;                   // Complete sentence (Pyramid Principle)
    content: string;                 // 300-600 words, full analytical depth
    sourceDeliverable: string;       // Which deliverable(s) this draws from
    citations: string[];             // Resolved source names
    keyMetrics?: { label: string; value: string; context: string }[];
    keyQuote?: { text: string; attribution: string; source: string };
    evidenceGap?: string;            // Transparency: what we don't know
    includeInDeck?: boolean;         // User toggle at report checkpoint (default true)
}

/** The full strategic report — synthesizes all 10 deliverable types */
export interface StrategicReport {
    executiveSummary: string;        // 500-800 words, SCR format
    diagnosis: string;               // Rumelt: the central challenge
    guidingPolicy: string;           // Rumelt: the strategic choice
    strategicPillars: string[];      // 3-5 MECE pillars
    sections: ReportSection[];       // 12-18 sections, 300-600 words each
    title: string;
    date: string;
    methodology: string;
    curatedSourceCount: number;      // Provenance: how many sources used
    citationIndex: CitationEntry[];  // Master list of all cited sources
}

export interface StepResult_StrategicReport {
    methodology: string;
    report: StrategicReport;
}

// ============================================================
// CONTENT BLOCK COMPOSITION (Content-First Slide Architecture)
// ============================================================

/** Content block types — the AI declares WHAT to communicate, not HOW to lay it out */
export type ContentBlockType =
    | 'hero_stat'           // A headline number that dominates the slide
    | 'evidence_bullets'    // 2-4 data-backed findings with citations
    | 'metric_cards'        // 2-4 KPI-style data points for a data panel
    | 'quote_block'         // A verbatim research quote with provenance
    | 'persona_card'        // Reference to a research persona (image auto-injected)
    | 'problem_statement'   // A challenge/friction point with evidence
    | 'solution_points'     // 2-3 actionable solutions with detail
    | 'data_grid'           // 3-6 data points for a grid/bento layout
    | 'journey_strip'       // A service blueprint stage highlight
    | 'comparison_row'      // A competitive/gap comparison data point
    | 'narrative_text'      // 2-3 sentence prose
    | 'section_label';      // Small caps topic/section indicator

/** An item within a list-type content block */
export interface ContentBlockItem {
    text?: string;               // evidence_bullets
    source?: string;             // evidence_bullets source attribution
    chunkRef?: string;           // evidence_bullets citation ref
    label?: string;              // metric_cards, data_grid
    value?: string;              // metric_cards, data_grid
    unit?: string;               // metric_cards
    trend?: string;              // metric_cards (+12%, -5%, etc.)
    title?: string;              // solution_points
    description?: string;        // solution_points, data_grid
}

/** A content block — the fundamental unit of slide content */
export interface ContentBlock {
    type: ContentBlockType;
    // Type-specific fields (each block type uses its relevant subset):
    value?: string;              // hero_stat, problem_statement
    unit?: string;               // hero_stat
    context?: string;            // hero_stat context line
    text?: string;               // quote_block, narrative_text, section_label
    attribution?: string;        // quote_block
    source?: string;             // quote_block source name
    severity?: string;           // problem_statement
    description?: string;        // problem_statement
    name?: string;               // persona_card
    role?: string;               // persona_card
    jtbd?: string;               // persona_card
    quote?: string;              // persona_card voice quote
    phase?: string;              // journey_strip
    action?: string;             // journey_strip
    pain?: string;               // journey_strip
    emotion?: string;            // journey_strip
    mot?: boolean;               // journey_strip (moment of truth)
    dimension?: string;          // comparison_row
    ours?: string;               // comparison_row
    theirs?: string;             // comparison_row
    gap?: string;                // comparison_row
    items?: ContentBlockItem[];  // evidence_bullets, metric_cards, solution_points, data_grid
}

/** What the AI generates per slide (before layout resolution) */
export interface SlideGeneration {
    slideNumber: number;
    title: string;                    // COMPLETE SENTENCE (Pyramid Principle)
    background: 'light' | 'dark';     // AI's preference (resolver may override)
    sourceDeliverable: string;        // Which deliverable/report section this presents
    personaRef?: string;              // Persona name for image injection
    blocks: ContentBlock[];           // The content declarations
    speakerNotes: string;             // Presenter notes
    sources: string[];                // Source attributions for footnote strip
}

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
    citations?: string[];      // Source names that evidence this gap
    evidenceBasis?: string;    // Specific evidence for current maturity assessment
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
    citations?: string[];      // Source names where this system was mentioned
    evidenceBasis?: string;    // Evidence of system's role, adoption, or issues
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
    citations?: string[];      // Source names where this competitor was mentioned
    evidenceBasis?: string;    // Key evidence: articles, reports, reviews mentioning this competitor
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
    synthesis: StepResult_CrossCuttingSynthesis | null;
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
