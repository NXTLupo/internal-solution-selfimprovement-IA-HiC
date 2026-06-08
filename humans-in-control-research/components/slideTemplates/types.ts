/**
 * SLIDE TEMPLATES - Type definitions for all 10 NXT Humans slide templates.
 *
 * Each template is owned by a specific consulting skill and has a strict data
 * shape. The AI emits :::slide blocks with `template` set to one of these
 * identifiers, and the renderer + PPTX exporter use the matching template.
 */

export type SlideTemplate =
    | 'persona-card'        // persona-architect
    | 'recommendation'      // strategy-author
    | 'theme-cluster'       // theme-analyst - equal-weight horizontal columns (3-4 themes)
    | 'theme-spotlight'     // theme-analyst - hero theme + 2-3 supporting (asymmetric)
    | 'theme-arc'           // theme-analyst - narrative chain with progression connectors
    | 'theme-mosaic'        // theme-analyst - 2x2 inverse-checkerboard grid (4 parallel themes)
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
    | 'systems-inventory'   // tech-audit-inspector      (tech_audit_system)
    | 'journey-brief';      // journeyBriefExporter - reasoning-model journey summary,
                            // rendered as a clean TABULAR slide (no SVG/curve) to
                            // avoid the stretched-diagram export defect (2026-05-26)

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
    /** 4-cell impact grid - replaces the lone hero number with a full frame.
     *  Renderer falls back to impactMetric when this isn't supplied. */
    impactGrid?: {
        baseline?: string;    // e.g. "6% mobile giving today"
        target?: string;      // e.g. "15% by Q3 2026"
        timeframe?: string;   // e.g. "9 months"
        owner?: string;       // e.g. "Advancement Services"
    };
    /** 2-3 transcript / corpus quotes that directly justify the action.
     *  Rendered as an EVIDENCE strip beneath the action title. */
    evidence?: SlideQuote[];
    /** One-sentence implication line tying the action to the research objective. */
    implication?: string;
    // 2026-05-12 - Extensions to support #recommendations tile export (#slide /
    // #slides). The existing fields above still drive strategy-author-emitted
    // recommendation slides; the fields below are populated only when the
    // slide originates from a #recommendations Defensible-Consensus / Non-Obvious-Bet
    // tile so the slide carries the tile's full visual identity into the deck.
    /** Optional framing tag override. Strategy-author rec defaults to
     *  "STRATEGIC RECOMMENDATION". Tile-sourced rec uses
     *  "DEFENSIBLE CONSENSUS" (chartreuse) or "NON-OBVIOUS BET" (cyan). */
    framingTag?: string;
    /** Accent color override. Defaults to chartreuse for consensus rec.
     *  Use cyan (#00B7C3) for non-obvious-bet tiles so the slide preserves
     *  the tile-grid's visual differentiation. */
    accentColor?: 'chartreuse' | 'cyan';
    /** Persona + moment eyebrow line under the title.
     *  Format: "PERSONA · MOMENT · INTERACTION" (each ≤40 chars). */
    personaContext?: string;
    /** Label for the supportingActions numbered list. Defaults to
     *  "SUPPORTING ACTIONS". Tile-sourced rec uses "AI CAPABILITIES". */
    actionsLabel?: string;
    /** 3-cell strip on the right column when no impactGrid/impactMetric is
     *  supplied - surfaces effort / risk / outcome. */
    impactStrip?: {
        effort?: string;     // e.g. "Low" | "Medium" | "High"
        risk?: string;       // e.g. "Low risk" | "Medium" | "High"
        outcome?: string;    // e.g. "Reduce time-to-onboard"
    };
    /** Hero image for the right column. Populated from RecommendationTile.image_data
     *  (data URL) or remote URL. Renderer falls back to impact grid/strip when absent. */
    heroImage?: {
        src: string;         // data: URL or absolute https URL
        alt?: string;
        caption?: string;    // ≤60 chars - rendered below the image as eyebrow text
    };
    /** Long-form supporting context for the implication footer area -
     *  rendered as a "WHY IT MATTERS" eyebrow above the implication when present. */
    whyMatters?: string;
}

/** A single pulled quote - verbatim text + full attribution. Used anywhere a
 *  theme / persona / case study needs variable quote density. */
export interface SlideQuote {
    text: string;
    source: string;
    /** Optional: who said it inside the source (author, role, etc.) */
    attribution?: string;
    /** Optional: where it lives (URL for citation link-out) */
    url?: string;
    /** Optional: context tag (e.g. "ON NON-CASH GIVING GROWTH") */
    context?: string;
    /** Optional: publication/collection date for provenance */
    date?: string;
}

export interface ThemeClusterData {
    themes: Array<{
        name: string;
        insight: string;
        /** Singular verbatim quote. Backward-compatible with older slide JSON. */
        evidence?: string;
        source: string;
        /** Multi-quote block. When present, the renderer stacks ALL of these
         *  as attributed quotes below the insight line. Use this when the user
         *  asks for N quotes per theme or when you want to show convergent
         *  evidence from multiple sources. */
        quotes?: SlideQuote[];
        /** One-sentence implication tying this theme to the research objective. */
        implication?: string;
        /** SIGNAL metric tag - a single concrete number or named entity that
         *  proves the theme is real (e.g. "50% mobile giving by 2025" or
         *  "Central Pennsylvania Food Bank: 10% wallet adoption"). Used by
         *  theme-arc and theme-cluster to tag each step. */
        signal?: string;
    }>;
    /** Cross-theme pattern callout. Rendered under the hero quote on
     *  theme-spotlight, below the arc on theme-arc, as a footer on mosaic. */
    patternSignal?: string;
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
    /** Who is the subject row - bolded and shown first */
    subjectRow?: string;
}

export interface BlockQuoteData {
    text: string;
    attribution: string;
    role?: string;
    source: string;
    context?: string;
    /** 3-4 sentence paragraph setting up WHO said this, WHEN, and WHY it
     *  matters to the research objective. Rendered under the quote. */
    contextParagraph?: string;
    /** 2-3 supporting data points from OTHER sources that corroborate the
     *  quote. Rendered as a right-side CORROBORATING DATA strip. */
    corroboratingData?: Array<{
        value: string;         // "50%"
        label: string;         // "rise in mobile giving by 2025"
        source?: string;       // "Fundraise Up benchmarks"
    }>;
    /** One-sentence implication line. */
    implication?: string;
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
    pullQuote?: { text: string; attribution: string; role?: string };
    /** LESSON FOR ADVANCEMENT - 1-2 sentence generalization of the takeaway,
     *  rendered as a footer row under the C/A/O blocks. */
    lesson?: string;
    /** COMPARABLES strip - 2-3 other orgs that achieved similar results.
     *  Rendered as a compact strip on the right panel. */
    comparables?: Array<{
        name: string;
        outcome: string;       // "8.5% wallet adoption in 12 months"
        source?: string;
    }>;
    /** One-sentence implication line tying the case to the research objective. */
    implication?: string;
}

export interface PrinciplesData {
    items: Array<{ name: string; description: string }>;
}

export interface StatRowData {
    stats: Array<{
        value: string;
        label: string;
        source: string;
        /** "What this means" - 1 sentence of interpretation */
        meaning?: string;
        /** "Why it matters now" - 1 sentence of urgency/implication */
        matters?: string;
    }>;
    /** CONVERGENT INSIGHT - synthesis across all three stats, rendered
     *  as a full-width row below the stat cells to fill the dead space. */
    convergentInsight?: string;
    /** Optional pattern callout under the convergent insight */
    patternSignal?: string;
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
        // 2026-05-25 - JM-depth fields (ported from internal-solutions-journeymapper)
        /** Emotion intensity 0-100 (0=very low ... 100=very high). Renderer treats <=5 as legacy 1-5 scale. */
        emotionIntensity?: number;
        /** One-clause reason the actor feels this way at this phase. */
        emotionReason?: string;
        /** Verbatim quote pulled directly from the corpus. NEVER fabricated. */
        voiceQuote?: string;
        /** Source attribution for voiceQuote, e.g. "r/cscareerquestions, 2024-09". */
        sourceAttribution?: string;
        /** Named touchpoints with channel + importance. */
        namedTouchpoints?: Array<{ channel: string; name: string; importance?: number }>;
        /** Calibrated confidence per evidence strength. */
        confidence?: 'verified' | 'emerging' | 'hypothesis';
    }>;
    keyInsight?: string;
    // 2026-05-25 - JM-depth dashboard fields (rendered above the grid)
    /** Journey-type classification, e.g. "coop", "educational", "customer-purchase". */
    journeyType?: string;
    /** 2-5 personas, JTBD-first (NOT demographics-first). */
    personas?: Array<{ name: string; role: string; characterization: string }>;
    /** 3-5 journey-level pain patterns (cross-cutting, not per-stage). */
    overallPainPoints?: Array<{ pattern: string; sourceCitation: string }>;
    /** 3-5 high-leverage strategic opportunities. */
    overallOpportunities?: Array<{ opportunity: string; sourceCitation: string }>;
    /** 3-5 KPI tiles. value must be a real corpus number or qualitative word. */
    kpiTiles?: Array<{ value: string; label: string; supportingPhase?: string; isHeadline?: boolean }>;
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
//
// Supports two layouts at render time:
//
//   COMPACT  - features.length >= 2: 2-3 cards side-by-side, each with priority,
//              user story, and top acceptance criteria. The deep fields below
//              (technicalDetails, problemSolved, stakeholders, evidence) are
//              ignored in this mode because there's no room for them.
//
//   DEEP     - features.length === 1 AND any of {technicalDetails, problemSolved,
//              stakeholders, evidence} is populated: full-slide narrative layout
//              that renders the complete feature spec with verbatim evidence
//              quotes. Used when the composer wants ONE feature per slide with
//              maximum detail.
//
// The deep fields are all optional so older presentations and the compact
// 3-card path continue to render unchanged.
export interface PrdFeatureData {
    features: Array<{
        name: string;
        priority: 'must' | 'should' | 'could' | 'wont';
        userStory: string;
        acceptanceCriteria: string[];
        technicalDetails?: string;
        problemSolved?: string;
        stakeholders?: string;
        evidence?: Array<{
            text: string;
            source: string;
            attribution?: string;
        }>;
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

// === DESIGN TOKENS - single source of truth for web + PPTX ===
export const TOKENS = {
    // Slide canvas - 16:9
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

    // Typography - NXT default is single-family Archivo. Brands can override
    // FONT_DISPLAY (headings/eyebrows) and FONT_BODY (paragraphs/labels)
    // separately. FONT stays as a legacy alias for any renderer that hasn't
    // migrated to the display/body split yet.
    FONT: 'Archivo',
    FONT_DISPLAY: 'Bebas Neue',
    FONT_BODY: 'Archivo',
    FONT_MONO: 'JetBrains Mono',
} as const;

export const hex = (c: string) => '#' + c;
