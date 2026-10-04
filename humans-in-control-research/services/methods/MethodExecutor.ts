/**
 * Method Executor Interface - Research method abstraction layer
 *
 * Each research methodology (General Synthesis, JTBD, Design Thinking,
 * Contextual Inquiry, etc.) implements this interface.
 *
 * The executor defines:
 * - What pipeline stages it produces
 * - What outputs are available
 * - How to execute each stage
 *
 * The existing pipeline (Themes → Personas → Journey → PRD → etc.)
 * becomes the first executor: GeneralSynthesis.
 */

import type { AnalysisStage } from '../../types';

export interface ResearchMethod {
    id: string;
    name: string;
    description: string;
    icon: string;                    // FontAwesome icon class
    stages: MethodStage[];           // Ordered pipeline stages
    requiredInputs: string[];        // What data this method needs
    applicableLenses: string[];      // Which analytical lenses work with this method
}

export interface MethodStage {
    id: string;
    name: string;
    analysisStage: AnalysisStage;    // Maps to existing checkpoint system
    description: string;
    isOptional: boolean;
    dependsOn?: string[];            // Stage IDs that must complete first
}

export interface MethodContext {
    researchGoal: string;
    analyticalLens: string;
    corpus: string;                  // The research corpus text
    previousResults: Map<string, any>;  // Results from previous stages
    feedback?: string;               // User feedback for regeneration
}

export interface MethodResult {
    stageId: string;
    data: any;                       // Stage-specific output
    methodology: string;             // How the AI approached this
    observations?: string[];         // What was observed (facts)
    inferences?: string[];           // What was inferred (interpretations)
    recommendations?: string[];      // What to do (actions)
    uncertainties?: string[];        // What we don't know
    conflicts?: string[];            // Where sources disagree
    nextQuestions?: string[];        // What to investigate next
}

/**
 * Method Executor Interface
 * Every research method implements this.
 */
export interface MethodExecutor {
    method: ResearchMethod;

    /** Execute a specific stage of this method's pipeline */
    executeStage(stageId: string, context: MethodContext): Promise<MethodResult>;

    /** Get the next stage to execute (respects dependencies) */
    getNextStage(completedStages: string[]): MethodStage | null;

    /** Get all available outputs for this method */
    getAvailableOutputs(): string[];
}

// ================================================================
// RESEARCH METHOD REGISTRY
// ================================================================

const RESEARCH_METHODS: ResearchMethod[] = [
    {
        id: 'general_synthesis',
        name: 'General Research Synthesis',
        description: 'Comprehensive multi-output research analysis. Extracts themes, personas, journey maps, recommendations, and strategic deliverables from any research corpus.',
        icon: 'fa-microscope',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze corpus structure and key entities', isOptional: false },
            { id: 'themes', name: 'Theme Extraction', analysisStage: 'THEMES' as any, description: 'Multi-dimensional thematic analysis', isOptional: false, dependsOn: ['ingest'] },
            { id: 'personas', name: 'Persona Synthesis', analysisStage: 'PERSONAS' as any, description: 'Evidence-grounded archetype analysis', isOptional: false, dependsOn: ['themes'] },
            { id: 'journey', name: 'Service Blueprint', analysisStage: 'JOURNEY_MAP' as any, description: 'End-to-end experience mapping', isOptional: true, dependsOn: ['personas'] },
            { id: 'recommendations', name: 'Strategic Recommendations', analysisStage: 'RECOMMENDATIONS' as any, description: 'Problem-solution mapping', isOptional: false, dependsOn: ['themes', 'personas'] },
            { id: 'prd', name: 'Product Requirements', analysisStage: 'PRD' as any, description: 'Feature definition and prioritization', isOptional: true, dependsOn: ['recommendations'] },
            { id: 'roadmap', name: 'Strategic Roadmap', analysisStage: 'ROADMAP' as any, description: 'Now/Next/Later initiative planning', isOptional: true, dependsOn: ['recommendations'] },
            { id: 'tech_arch', name: 'Technology Architecture', analysisStage: 'TECH_ARCH' as any, description: 'System design and integration mapping', isOptional: true, dependsOn: ['recommendations'] },
            { id: 'gap_analysis', name: 'Gap Analysis', analysisStage: 'GAP_ANALYSIS' as any, description: 'Current vs desired state assessment', isOptional: true, dependsOn: ['themes'] },
            { id: 'tech_audit', name: 'Technology Audit', analysisStage: 'TECH_AUDIT' as any, description: 'Systems inventory and maturity scoring', isOptional: true, dependsOn: ['themes'] },
            { id: 'competitive', name: 'Competitive Analysis', analysisStage: 'COMPETITIVE_ANALYSIS' as any, description: 'Peer benchmarking and gap identification', isOptional: true, dependsOn: ['themes'] },
            { id: 'deck', name: 'Presentation Structure', analysisStage: 'DECK_STRUCTURE' as any, description: 'McKinsey SCR narrative arc', isOptional: true, dependsOn: ['recommendations'] },
            { id: 'narrative', name: 'Slide Narratives', analysisStage: 'NARRATIVE' as any, description: 'Evidence-backed slide content', isOptional: true, dependsOn: ['deck'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'product', 'market', 'organizational', 'digital', 'custom'],
    },
    {
        id: 'jtbd',
        name: 'Jobs to Be Done',
        description: 'Identify the progress people are trying to make. Maps switching timelines, forces of progress (push, pull, anxiety, habit), and circumstance-based segments.',
        icon: 'fa-bullseye',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze interview/observation data', isOptional: false },
            { id: 'timeline', name: 'Switching Timeline', analysisStage: 'THEMES' as any, description: 'Reconstruct decision timeline', isOptional: false, dependsOn: ['ingest'] },
            { id: 'forces', name: 'Forces of Progress', analysisStage: 'PERSONAS' as any, description: 'Map push, pull, anxiety, habit', isOptional: false, dependsOn: ['timeline'] },
            { id: 'segments', name: 'Circumstance Segments', analysisStage: 'JOURNEY_MAP' as any, description: 'Segment by context not demographics', isOptional: false, dependsOn: ['forces'] },
            { id: 'implications', name: 'Product Implications', analysisStage: 'RECOMMENDATIONS' as any, description: 'Feature and messaging decisions', isOptional: false, dependsOn: ['segments'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'product', 'market'],
    },
    {
        id: 'design_thinking',
        name: 'Human-Centered Design',
        description: 'Convert research into framed opportunities and prototype experiments. POV statements, HMW questions, concept territories, and experiment design.',
        icon: 'fa-lightbulb',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze observations and interviews', isOptional: false },
            { id: 'tensions', name: 'Tensions & Insights', analysisStage: 'THEMES' as any, description: 'Extract unmet needs and tensions', isOptional: false, dependsOn: ['ingest'] },
            { id: 'pov', name: 'POV Statements', analysisStage: 'PERSONAS' as any, description: 'Frame user/need/insight statements', isOptional: false, dependsOn: ['tensions'] },
            { id: 'hmw', name: 'How Might We Questions', analysisStage: 'JOURNEY_MAP' as any, description: 'Generate design opportunity questions', isOptional: false, dependsOn: ['pov'] },
            { id: 'concepts', name: 'Concept Territories', analysisStage: 'RECOMMENDATIONS' as any, description: 'Cluster solutions and score feasibility', isOptional: false, dependsOn: ['hmw'] },
            { id: 'experiments', name: 'Prototype Experiments', analysisStage: 'ROADMAP' as any, description: 'Design experiments to reduce uncertainty', isOptional: false, dependsOn: ['concepts'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'product', 'digital'],
    },
    {
        id: 'contextual_inquiry',
        name: 'Contextual Inquiry',
        description: 'Build five models from field observation data: flow, sequence, artifact, cultural, and physical. Separates what people SAID from what they DID.',
        icon: 'fa-users',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze field notes and transcripts', isOptional: false },
            { id: 'observations', name: 'Atomic Observations', analysisStage: 'THEMES' as any, description: 'Extract and label observations', isOptional: false, dependsOn: ['ingest'] },
            { id: 'models', name: 'Five Models', analysisStage: 'PERSONAS' as any, description: 'Flow, sequence, artifact, cultural, physical', isOptional: false, dependsOn: ['observations'] },
            { id: 'breakdowns', name: 'Recurring Breakdowns', analysisStage: 'JOURNEY_MAP' as any, description: 'Cluster and root-cause breakdowns', isOptional: false, dependsOn: ['models'] },
            { id: 'implications', name: 'Design Implications', analysisStage: 'RECOMMENDATIONS' as any, description: 'Needs and design directions', isOptional: false, dependsOn: ['breakdowns'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'product', 'organizational'],
    },
    {
        id: 'service_blueprint',
        name: 'Service Blueprinting',
        description: 'Map frontstage experience against backstage operations and systems. Identifies failure points, root causes, and redesign opportunities.',
        icon: 'fa-project-diagram',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze journey and operations data', isOptional: false },
            { id: 'blueprint', name: 'Service Blueprint', analysisStage: 'JOURNEY_MAP' as any, description: 'Map customer/frontstage/backstage/systems', isOptional: false, dependsOn: ['ingest'] },
            { id: 'failures', name: 'Failure Analysis', analysisStage: 'THEMES' as any, description: 'Identify and root-cause failure points', isOptional: false, dependsOn: ['blueprint'] },
            { id: 'redesign', name: 'Redesign Options', analysisStage: 'RECOMMENDATIONS' as any, description: 'Propose process and system improvements', isOptional: false, dependsOn: ['failures'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'organizational', 'digital'],
    },
    {
        id: 'nps_diagnostic',
        name: 'NPS Closed-Loop Diagnostics',
        description: 'Turn NPS scores and verbatims into operational loyalty intelligence. Identifies driver themes, save opportunities, and metric-gaming risks.',
        icon: 'fa-chart-bar',
        stages: [
            { id: 'ingest', name: 'Data Ingestion', analysisStage: 'INGESTION' as any, description: 'Analyze NPS data and verbatims', isOptional: false },
            { id: 'segmentation', name: 'Score Segmentation', analysisStage: 'THEMES' as any, description: 'Segment promoters/passives/detractors', isOptional: false, dependsOn: ['ingest'] },
            { id: 'drivers', name: 'Driver Analysis', analysisStage: 'PERSONAS' as any, description: 'Identify operational loyalty drivers', isOptional: false, dependsOn: ['segmentation'] },
            { id: 'actions', name: 'Save Actions', analysisStage: 'RECOMMENDATIONS' as any, description: 'Generate targeted interventions', isOptional: false, dependsOn: ['drivers'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'market', 'organizational'],
    },
    {
        id: 'karpathy_second_brain',
        name: 'Karpathy Second Brain',
        description: 'Maintain a persistent research memory that compounds over time. Immutable raw sources, wiki synthesis, contradiction tracking, and lint operations.',
        icon: 'fa-brain',
        stages: [
            { id: 'classify', name: 'Classify Operation', analysisStage: 'INGESTION' as any, description: 'Determine: ingest, query, lint, or schema update', isOptional: false },
            { id: 'extract', name: 'Extract & Update', analysisStage: 'THEMES' as any, description: 'Extract claims, entities, contradictions', isOptional: false, dependsOn: ['classify'] },
            { id: 'wiki', name: 'Wiki Synthesis', analysisStage: 'RECOMMENDATIONS' as any, description: 'Update wiki pages with new evidence', isOptional: false, dependsOn: ['extract'] },
            { id: 'lint', name: 'Lint & Validate', analysisStage: 'GAP_ANALYSIS' as any, description: 'Check for stale, orphaned, contradictory pages', isOptional: true, dependsOn: ['wiki'] },
        ],
        requiredInputs: ['corpus'],
        applicableLenses: ['cx', 'product', 'market', 'organizational', 'digital', 'custom'],
    },
];

