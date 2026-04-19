/**
 * SLIDE TEMPLATES — Type definitions for all 10 NXT Humans slide templates.
 *
 * Each template is owned by a specific consulting skill and has a strict data
 * shape. The AI emits :::slide blocks with `template` set to one of these
 * identifiers, and the renderer + PPTX exporter use the matching template.
 */

export type SlideTemplate =
    | 'persona-card'        // persona-architect
    | 'recommendation'      // strategy-author
    | 'theme-cluster'       // theme-analyst — equal-weight horizontal columns (3-4 themes)
    | 'theme-spotlight'     // theme-analyst — hero theme + 2-3 supporting (asymmetric)
    | 'theme-arc'           // theme-analyst — narrative chain with progression connectors
    | 'theme-mosaic'        // theme-analyst — 2x2 inverse-checkerboard grid (4 parallel themes)
    | 'competitive-matrix'  // competitive-analyst
    | 'block-quote'         // evidence-curator
    | 'case-study'          // case-study-analyst
    | 'principles'          // strategy-author
    | 'stat-row'            // benchmark-reporter
    | 'timeline'            // roadmap-builder
    | 'section-divider'     // deck-narrative-composer
    | 'service-blueprint'   // service-blueprint-mapper  (journey_stage)
    | 'gap-matrix'          // gap-analysis-evaluator    (gap)
    | 'architecture-map'    // tech-arch-generator       (tech_node)
    | 'prd-feature'         // prd-compiler              (prd_feature)
    | 'systems-inventory';  // tech-audit-inspector      (tech_audit_system)

export interface PersonaCardData {
    name: string;
    role: string;
    demographics?: string;
    quote: string;
    bio?: string;
    jtbd?: string;
    goals?: { lifeGoal?: string; experienceGoal?: string; functionalGoal?: string };
    painPoints?: Array<{ label: string; quote: string; source: string }>;
    motivations?: Array<{ label: string; quote: string; source: string }>;
}

export interface RecommendationData {
    actionTitle: string;
    rationale?: string;
    supportingActions: Array<{ name: string; description: string }>;
    impactMetric?: { value: string; label: string };
}

export interface ThemeClusterData {
    themes: Array<{ name: string; insight: string; evidence: string; source: string }>;
}

export interface CompetitiveMatrixData {
    columns: string[];
    /** Optional one-line definition per column (what each capability means) */
    columnDefs?: string[];
    rows: Array<{
        name: string;
        scores: number[];
        /** Optional per-row evidence line (e.g. "$340M raised FY25, 12% mobile giving") */
        note?: string;
        /** Optional per-row source citation */
        source?: string;
    }>;
    scaleMax?: number;
    /** Labels for each maturity level (e.g. ["Absent","Ad-hoc","Defined","Managed","Optimized"]) */
    scaleLabels?: string[];
    insight?: string;
    /** Who is the subject row — bolded and shown first */
    subjectRow?: string;
}

export interface BlockQuoteData {
    text: string;
    attribution: string;
    role?: string;
    source: string;
    context?: string;
}

export interface CaseStudyData {
    subject: string;
    /** Context strip under the subject name: "Private Catholic · Iowa · 800 students" */
    subjectMeta?: string;
    /** Elapsed time (e.g. "18 months", "Q1 2024 → Q3 2025") */
    timeframe?: string;
    /** Investment/resource scale (e.g. "$2.4M, 12-person team") */
    investment?: string;
    challenge: string;
    approach: string;
    outcome: string;
    keyMetric?: { value: string; label: string };
    /** 2-3 additional stats that corroborate the hero metric */
    supportingMetrics?: Array<{ value: string; label: string }>;
    /** Verbatim quote from the subject (or someone inside the case) */
    pullQuote?: { text: string; attribution: string };
}

export interface PrinciplesData {
    items: Array<{ name: string; description: string }>;
}

export interface StatRowData {
    stats: Array<{ value: string; label: string; source: string }>;
}

export interface TimelineData {
    phases: Array<{ name: string; duration?: string; items: string[] }>;
}

export interface SectionDividerData {
    number: string;
    title: string;
    subtitle?: string;
}

// === SERVICE BLUEPRINT (Bitner model, adapted for 16:9 slide) ===
export interface ServiceBlueprintData {
    stages: Array<{
        phase: string;              // short phase name, e.g. "Awareness"
        /** Duration marker for this stage (e.g. "Day 1", "Week 2-4") */
        duration?: string;
        /** Emotional state (e.g. "Frustrated", "Hopeful") */
        emotion?: string;
        customerAction: string;     // what the user does
        frontstage: string;         // visible interaction
        backstage: string;          // hidden process
        support: string;            // infrastructure / data
        painPoint?: string;         // friction at this stage
        failPoint?: boolean;        // stage breaks entirely
    }>;
    keyInsight?: string;
}

// === GAP MATRIX (1-5 maturity, current vs target) ===
export interface GapMatrixData {
    gaps: Array<{
        capability: string;
        currentMaturity: number;      // 1-5
        targetMaturity: number;       // 1-5
        severity: 'critical' | 'high' | 'medium' | 'low';
        impact?: string;
    }>;
    scaleMax?: number;                // default 5
    insight?: string;
}

// === ARCHITECTURE MAP (C4-style layered) ===
export interface ArchitectureMapData {
    layers: Array<{
        name: string;                 // e.g. "Client", "API", "Services", "Data"
        nodes: Array<{ name: string; type?: string; description?: string }>;
    }>;
    flowSummary?: string;             // one-line description of data flow
}

// === PRD FEATURE CARD ===
export interface PrdFeatureData {
    features: Array<{
        name: string;
        priority: 'must' | 'should' | 'could' | 'wont';
        userStory: string;
        acceptanceCriteria: string[];
    }>;
}

// === SYSTEMS INVENTORY (tech audit) ===
export interface SystemsInventoryData {
    systems: Array<{
        name: string;
        category: string;             // e.g. "CRM", "ETL", "Analytics"
        status: 'current' | 'legacy' | 'deprecated' | 'planned';
        risk: 'critical' | 'high' | 'medium' | 'low';
        description?: string;
    }>;
    insight?: string;
}

export type TemplateData =
    | { template: 'persona-card'; data: PersonaCardData }
    | { template: 'recommendation'; data: RecommendationData }
    | { template: 'theme-cluster'; data: ThemeClusterData }
    | { template: 'competitive-matrix'; data: CompetitiveMatrixData }
    | { template: 'block-quote'; data: BlockQuoteData }
    | { template: 'case-study'; data: CaseStudyData }
    | { template: 'principles'; data: PrinciplesData }
    | { template: 'stat-row'; data: StatRowData }
    | { template: 'timeline'; data: TimelineData }
    | { template: 'section-divider'; data: SectionDividerData };

// === DESIGN TOKENS — single source of truth for web + PPTX ===
export const TOKENS = {
    // Slide canvas — 16:9
    WEB_W: 960,
    WEB_H: 540,
    PPTX_W: 13.33,
    PPTX_H: 7.5,
    PX_TO_IN: 13.33 / 960,

    // Sidebar
    SIDEBAR_W_PX: 64,

    // Colors (hex without # for PPTX, with # for web)
    BLACK: '0D0D0D',
    INK: '141414',
    BODY: '333333',
    SECONDARY: '666666',
    MUTED: '999999',
    RULE: 'E0E0E0',
    PANEL: 'F5F5F0',
    PALE: 'FAFAF7',
    WHITE: 'FFFFFF',
    CHARTREUSE: 'B8B800',
    CHARTREUSE_BRIGHT: 'CACA20',
    CHARTREUSE_PALE: 'F5F5C8',
    TEAL: '115054',
    TEAL_DARK: '0B3A3D',
    CYAN: '00B7C3',
    RUST: 'CC6644',
    GREEN: '0CCE6B',
    RED: 'CC3333',

    // Typography
    FONT: 'Archivo',
    FONT_MONO: 'JetBrains Mono',
} as const;

export const hex = (c: string) => '#' + c;
