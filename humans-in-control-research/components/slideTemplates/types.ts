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
    | 'theme-cluster'       // theme-analyst
    | 'competitive-matrix'  // competitive-analyst
    | 'block-quote'         // evidence-curator
    | 'case-study'          // case-study-analyst
    | 'principles'          // strategy-author
    | 'stat-row'            // benchmark-reporter
    | 'timeline'            // roadmap-builder
    | 'section-divider';    // deck-narrative-composer

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
    rows: Array<{ name: string; scores: number[]; note?: string }>;
    scaleMax?: number;
    insight?: string;
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
    challenge: string;
    approach: string;
    outcome: string;
    keyMetric?: { value: string; label: string };
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
