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
    | 'service-blueprint'   // service-blueprint-mapper  (#blueprint - frontstage/backstage Bitner model)
    | 'journey-map'         // service-blueprint-mapper  (#journey - GOLD actor-lane journey matrix per
                            // Figma NU 53:159 base 53:2 / T3 156:2, NXT 75:2: stages x actor lanes with
                            // critical-stage accent, PAIN POINTS row, personas/pains/opportunities
                            // dashboard, 3 qualitative KPI tiles, takeaway band)
    | 'gap-matrix'          // gap-analysis-evaluator    (gap)
    | 'architecture-map'    // tech-arch-generator       (tech_node)
    | 'prd-feature'         // prd-compiler              (prd_feature)
    | 'systems-inventory'   // tech-audit-inspector      (tech_audit_system)
    | 'executive-brief'     // html-deliverable-composer / strategic-report-writer
                            // (#brief / #explainer / #report GOLD slide twins - one template,
                            // three variants - brief = hero finding + finding cards, explainer =
                            // stepped concept + GOTCHAS strip, report = exec-summary + key findings.
                            // The HTML-document form stays the default, #slide emits this twin.)
    | 'org-chart'           // org-chart                 (#org - GOLD reporting-tier matrix per
                            // Figma NU 178:3 "GOLD · org (nu) · 01 structure": tier rows
                            // (DECIDES/DIRECTS/DELIVERS) of evidence-cited node cards, the
                            // decision-authority node accent-top-bordered, hairline connectors,
                            // takeaway band. The org chart IS the slide body. CSS grid, never SVG.)
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
    /** DENSE VARIANT fields (W2, 2026-06-11, GOLD persona-dense NU 199:124 /
     *  NXT 322:124). When >=3 of {goals, painPoints, behaviors, winConditions}
     *  carry content, renderers route to the identity-column + 2x2 evidence
     *  quadrant layout instead of the two-column card. */
    behaviors?: string[];
    /** What wins this persona over (acknowledgement-first recovery, one named
     *  owner, ...). Quadrant 4 of the dense layout. */
    winConditions?: string[];
    /** Identity-column descriptor strip (e.g. "DIGITAL-FIRST · HIGH
     *  EXPECTATION"). Optional; dense layout only. */
    descriptors?: string;
    /** RELATIONSHIP STAKES line, bottom-pinned in the dense identity column. */
    stakes?: string;
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
    /** SLIDE-SYSTEM VARIANT (NU_Giving role-block G2): right-rail impact
     *  CARD STACK (REVENUE / C-SAT / SERVICE NEEDS). When present, renderers
     *  draw the card stack instead of impactGrid; supportingActions render as
     *  full-width numbered rows. */
    impactCards?: Array<{ label: string; headline: string; body: string }>;
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
    /** SLIDE-SYSTEM VARIANT (NU_Giving two-tier evidence table): prose rows
     *  with WHAT THEY PROVE / IMPLICATION columns. Rows with tier 'top' get
     *  the elevated band treatment; patternLine renders as the dark synthesis
     *  band. When rows carry prove/implication the renderers draw the prose
     *  table instead of score dots. */
    rowsProse?: Array<{
        name: string;
        prove: string;
        implication: string;
        evidenceTag?: string;
        tier?: 'top' | 'second';
    }>;
    patternLine?: string;
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
    /** DENSE VARIANT (W2, 2026-06-11, GOLD block-quote-dense NU 199:3 /
     *  NXT 322:3): 2+ additional verbatim voices. When >=2 are present the
     *  renderers route to the three-voice card layout + synthesis band
     *  instead of the single hero quote. */
    additionalQuotes?: Array<{
        text: string;
        attribution: string;
        role?: string;
        source?: string;
    }>;
    /** WHERE THEY CONVERGE synthesis line for the dense three-voice layout. */
    synthesis?: string;
}

export interface CaseStudyData {
    subject: string;
    /** Context strip under the subject name: "Private Catholic · Iowa · 800 students" */
    subjectMeta?: string;
    /** Elapsed time (e.g. "18 months", "Q1 2024 → Q3 2025") */
    timeframe?: string;
    /** Investment/resource scale (e.g. "$2.4M, 12-person team") */
    investment?: string;
    /** GOLD deep-dive layout variant (2026-06-10, from the Figma design-system
     *  files: NXT iSQhAVM7SI4QHAWB7y9C2z frames 212:2/217:2, NU z2v9Pvhg23hlljEitPBdAt
     *  frames 91:2/93:2). Per the case-study learned constraint, deep-dives must
     *  DIVERSIFY layouts across a deck - never repeat one layout.
     *    'four-block'     - CHALLENGE/APPROACH/OUTCOME/LESSON blocks + KEY OUTCOME
     *                       panel (the default; backward compatible).
     *    'before-after'   - two wash panels (warn/cool) with bullet contrasts,
     *                       center arrow, RESULT + cited-quote row.
     *    'evidence-stack' - CONVERGENT EVIDENCE rows: accent bar + verbatim quote
     *                       + SOURCE + "WHAT IT SHOWS" interpretation column.
     *  When omitted, the renderer infers: beforeAfter present -> 'before-after';
     *  evidence present -> 'evidence-stack'; else 'four-block'. */
    variant?: 'four-block' | 'before-after' | 'evidence-stack';
    /** before-after variant payload. 3-5 bullet points per side (2026-06-10
     *  density uplift: was 3), each a QUALITATIVE pattern; numbers only inside
     *  cited quotes per the Quantitative Claim Rule. */
    beforeAfter?: {
        before: { headline: string; points: string[]; label?: string };
        after: { headline: string; points: string[]; label?: string };
        /** RESULT row under the panels - one or two sentences. */
        result?: string;
    };
    /** evidence-stack variant payload - 3-4 verbatim quotes with named sources,
     *  each paired with a one-line "what it shows" interpretation. */
    evidence?: Array<{ quote: string; source: string; shows?: string }>;
    /** Dark/accent takeaway band text (the GOLD bottom band). Falls back to
     *  lesson, then implication, when omitted. One bold phrase or sentence. */
    takeaway?: string;
    challenge?: string;
    approach?: string;
    outcome?: string;
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
    /** SLIDE-SYSTEM VARIANT (2026-06-11, NU_Giving uplift; Figma GOLD slides
     *  pages NU 103:2 / NXT 324:2): 'diptych' renders exactly 2 items as dark
     *  numbered panels (the problem-statement pair). */
    variant?: 'cards' | 'diptych';
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
    /** SLIDE-SYSTEM VARIANT: role rows x horizon columns (the aggregate
     *  roadmap from the NU_Giving uplift). When rows are present, renderers
     *  draw the role/horizon card grid instead of phase columns; phases[]
     *  then supplies the horizon headers. */
    rows?: Array<{ role: string; cells: string[] }>;
}

export interface SectionDividerData {
    number: string;
    title: string;
    subtitle?: string;
    /** SLIDE-SYSTEM VARIANT: 'thesis' renders a single-sentence interstitial
     *  (no oversized numeral): title is the sentence, number is ignored. */
    variant?: 'numeral' | 'thesis';
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

// === EXECUTIVE BRIEF (#brief / #explainer / #report GOLD slide twins, 2026-06-13) ===
// One GOLD slide template, three variants (like case-study). The HTML-document
// form (html-deliverable-composer / strategic-report-writer) stays the default
// for bare #brief/#explainer/#report; adding #slide/#slides emits this GOLD slide
// twin instead. Manifest-chunk grounded; brand-token skinned. Twins that MUST stay
// in sync: web.tsx ExecutiveBriefSlide (960x540), slideToStageHtml renderExecutiveBrief
// (1920x1080), pptx.ts exportExecutiveBrief (fallback), and this interface.
export interface ExecutiveBriefData {
    /** brief = hero finding + 2-4 finding cards; explainer = stepped concept + GOTCHAS
     *  strip; report = exec-summary hero + key-findings list. Default 'brief'. */
    variant?: 'brief' | 'explainer' | 'report';
    /** Kicker subject, e.g. "FIRST-YEAR CO-OP READINESS". Renderer prefixes the
     *  variant label (BRIEF / EXPLAINER / REPORT). */
    subject?: string;
    /** Optional hero callout (brief/report): ONE dominant finding. value is a
     *  QUALITATIVE word/phrase unless it rides inside a cited section quote. */
    hero?: { stat: string; label: string };
    /** 2-5 sections: findings (brief), concept steps (explainer), or exec-summary
     *  points (report). Each carries a heading, a 1-3 sentence body, and an optional
     *  cited verbatim quote. */
    sections: Array<{
        heading: string;
        body: string;
        evidence?: { quote: string; source: string };
    }>;
    /** Explainer variant only: severity-flagged pitfalls / caveats (warn accent). */
    gotchas?: string[];
    /** Takeaway band - the one conclusion the brief/explainer/report proves. */
    keyInsight?: string;
}

// === ORG CHART (#org - GOLD reporting-tier matrix, 2026-06-13) ===
// Source of truth: Figma GOLD org frame NU 178:3 ("GOLD · org (nu) · 01 structure
// (what exists today)"). The org chart IS the entire slide body: stacked TIER rows,
// each a horizontal row of node cards, connected by hairline drops. Each card carries
// a role title, a one-line responsibility, and a NAMED source attribution. The
// decision-authority node (typically the single top-tier node) gets an accent top
// border. DESCRIPTIVE of what exists today, never prescriptive. CSS grid only - the
// graphic-collision ban forbids SVG absolute positioning here. Geometry is identical
// across brands; the skin rides on brand tokens (GOLD standing rule). Twins that MUST
// stay in sync: web.tsx OrgChartSlide (960x540 preview), slideToStageHtml renderOrgChart
// (1920x1080 export), pptx.ts exportOrgChart (fallback), and this interface.
export interface OrgChartData {
    /** Reporting tiers, top -> bottom (2-4). Each tier is one horizontal row of
     *  node cards. ORDERED by authority: tier[0] decides, the last tier delivers. */
    tiers: Array<{
        /** Tier label shown in the left gutter, e.g. "TIER 1 · DECIDES". Pair a
         *  number with the tier's verb (DECIDES / DIRECTS / DELIVERS / ADVISES). */
        label: string;
        /** Node cards in this tier (1-4). */
        nodes: Array<{
            /** Role or position, e.g. "VP Customer Operations". */
            title: string;
            /** One-line responsibility, e.g. "Owns the support P&L and the staffing plan". */
            role: string;
            /** Named source attribution (no "SOURCE:" prefix; renderer adds it),
             *  e.g. "Org Announcement", "Stakeholder Interview". */
            source: string;
            /** Accent top border = decision authority / emphasis node. */
            emphasis?: boolean;
        }>;
    }>;
    /** Kicker subject + state, e.g. "SUPPORT OPERATION · AS-IS". Renderer prefixes
     *  "ORG STRUCTURE · ". */
    subject?: string;
    /** Takeaway band sentence - the one structural conclusion the chart proves. */
    keyInsight?: string;
}

// === JOURNEY MAP (#journey - GOLD actor-lane matrix, 2026-06-11) ===
// Source of truth: Figma GOLD journey frames (NU page 53:159, T3 exemplar 156:2;
// NXT page 75:2). The journey is an ACTOR-LANE matrix - who does what at each
// stage - NOT a frontstage/backstage Bitner blueprint (that is #blueprint /
// ServiceBlueprintData). Anatomy: mono meta row (scope/actors/phases), optional
// dashboard (personas / overall pain points / strategic opportunities), up to 3
// qualitative KPI tiles (hero WORD + mono sub, never a naked number), the
// stages x lanes matrix with ONE critical stage accented and "not engaged"
// greyed, a PAIN POINTS row, and the keyInsight takeaway band.
export interface JourneyMapData {
    /** Kicker context, e.g. "CUSTOMER SUPPORT · CURRENT STATE". */
    journeyType?: string;
    /** Mono meta row under the title. */
    scope?: string;
    actors?: string;
    phasesLabel?: string;
    /** Columns. critical=true renders the accent (red/rust) header - mark AT MOST one or two. */
    stages: Array<{ name: string; critical?: boolean } | string>;
    /** Rows: one lane per actor. cells[] aligns to stages[]; use "not engaged"
     *  for stages where the actor has no part (renders greyed). */
    lanes: Array<{ actor: string; role?: string; cells: string[] }>;
    /** Per-stage pain row (aligns to stages[]). Accent-colored. Each entry
     *  may be a single string OR a string[] STACK - the 2026-06-12 user rule
     *  asks for at least three evidenced pains per phase, rendered as a
     *  stacked list inside that phase's pain cell. Never pad to reach three;
     *  every pain must be evidenced. */
    painPoints?: Array<string | string[]>;
    /** Persona one-liners (JTBD-first), ORDERED BY JOURNEY ARC. 2026-06-12
     *  redesign: these render as a "PERSONAS · JTBD voice" row INSIDE the
     *  matrix, distributed start->end across the phase columns (persona 1
     *  lands on the first phase, the last persona on the final phase). */
    personas?: string[];
    /** Cross-cutting pain patterns, ORDERED BY JOURNEY ARC. Distributed
     *  start->end into the per-phase PAIN POINTS stacks (same row as the
     *  per-stage pains - never a separate block above the table). */
    overallPainPoints?: string[];
    /** Strategic opportunities, ORDERED BY JOURNEY ARC. Render as an
     *  "OPPORTUNITIES" row INSIDE the matrix (cool accent), distributed
     *  start->end across the phase columns. */
    opportunities?: string[];
    /** Up to 3 KPI tiles. value is a QUALITATIVE hero word/phrase ("Routed",
     *  "Doc-first"); numbers only inside attributed quotes elsewhere.
     *  2026-06-12 redesign: tiles EMBED inside their phase header cells
     *  (distributed start->end by arc), never as a strip above the table. */
    kpiTiles?: Array<{ label: string; value: string; sub?: string; isHeadline?: boolean }>;
    /** Takeaway band text. */
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

    // === GOLD visual-language slots (2026-06-10) ===
    // Source of truth: the live Figma design-system files (NXT iSQhAVM7SI4QHAWB7y9C2z
    // node 223:2, NU z2v9Pvhg23hlljEitPBdAt node 97:2) and the GOLD case-study
    // exemplar frames. Shared GOLD anatomy: 92px rail (1920-space), 3x3 dot mark,
    // IBM Plex Mono kicker, action-title headline, hairline rule, takeaway band.
    RAIL: '0D0D0D',          // left rail fill (NU: 0E1626 navy)
    KICKER: '00B7C3',        // kicker + source-line accent (NU: C8102E red)
    ACCENT_WARN: 'CC6644',   // BEFORE/pain accent (NU: C8102E red)
    ACCENT_COOL: '00B7C3',   // AFTER/source accent (NU: 1D6E64 teal)
    WASH_WARN: 'FAF1EC',     // BEFORE panel wash (NU: FAEDED)
    WASH_COOL: 'EBF7F8',     // AFTER panel wash (NU: EDF7F5)
    BAND: 'B8B800',          // takeaway band fill (NU: 16233C navy)
    BAND_TEXT: '0D0D0D',     // takeaway band text (NU: FFFFFF)
    HAIRLINE: 'DDDDD6',      // GOLD hairline rule
    GREY: '73757A',          // GOLD meta/label grey
    GOLD_ACCENT: 'B8B800',   // LESSON-block accent (NU: A4804A premium gold)

    // Typography - NXT default is single-family Archivo. Brands can override
    // FONT_DISPLAY (headings/eyebrows) and FONT_BODY (paragraphs/labels)
    // separately. FONT stays as a legacy alias for any renderer that hasn't
    // migrated to the display/body split yet.
    FONT: 'Archivo',
    // 2026-06-13 - NXT display face is Saira Condensed (replaced Bebas Neue). Fallback
    // default only; the live value hydrates from /api/design-tokens (figma-tokens.json
    // NXT.font.display, sourced from the NXT Brand Tokens font/display variable).
    FONT_DISPLAY: 'Saira Condensed',
    FONT_BODY: 'Archivo',
    // GOLD action-title face (h1 + takeaway band). NXT headline is Archivo SemiBold
    // (Saira Condensed carries big numerals/hero via FONT_DISPLAY); NU is single-typeface
    // Lato (weight = hierarchy). Hydrated from font/title.
    FONT_TITLE: 'Archivo',
    TITLE_WEIGHT: '600',
    // GOLD mono face is IBM Plex Mono (kicker, meta rows, labels, SOURCE lines)
    // per both Figma files. JetBrains Mono remains loaded for code surfaces
    // elsewhere in the SPA, but slide chrome resolves to IBM Plex Mono.
    FONT_MONO: 'IBM Plex Mono',
    // PPTX-only display face. The actual NXT deck theme (_NXT_HUMANS_INTRO_2026.pptx)
    // uses Agency FB (theme major) for headings + Archivo (theme minor) for body.
    // Agency FB is Office-available but not web-available, so web/PPTX split: web
    // display = Bebas Neue proxy (FONT_DISPLAY), PPTX display = Agency FB (this token).
    FONT_DISPLAY_PPTX: 'Agency FB',
} as const;

export const hex = (c: string) => '#' + c;

// === UNIVERSAL DENSITY AXIS (2026-06-10) ===
// Every template supports a slide-level density. The Analyst Desk model sets
// it when the user's request warrants a denser artifact ("more detail", "add
// more lines", "all the evidence", #dense modifier, or a modification request
// that adds items beyond the base ceiling). Density is a CEILING contract:
// the model controls how many items it emits; the renderer admits more items
// under 'dense' and adapts type size to the actual count (count-adaptive
// sizing, the evidence-stack pattern) so nothing overflows the 16:9 canvas.
// Both twins (web.tsx 960x540 preview and slideToStageHtml.ts 1920x1080 PPTX
// stage) MUST read the same spec - never hardcode a slice cap in a renderer.
export type SlideDensity = 'base' | 'dense';

interface DensityCaps {
    /** Primary item ceiling (themes, stats, phases, gaps, features, rows...). */
    items: number;
    /** Secondary ceiling (quotes per theme, bullets per phase, evidence rows,
     *  supporting actions, pain points, nodes per layer...). */
    sub: number;
}

const DENSITY_SPEC: Record<string, { base: DensityCaps; dense: DensityCaps }> = {
    'persona-card':       { base: { items: 3,  sub: 2 }, dense: { items: 5,  sub: 3 } },  // pains / motivations
    'recommendation':     { base: { items: 3,  sub: 2 }, dense: { items: 5,  sub: 4 } },  // actions / evidence
    'theme-cluster':      { base: { items: 4,  sub: 2 }, dense: { items: 6,  sub: 3 } },  // themes / quotes per theme
    'theme-spotlight':    { base: { items: 4,  sub: 2 }, dense: { items: 6,  sub: 3 } },  // 1 hero + supporting
    'theme-arc':          { base: { items: 4,  sub: 2 }, dense: { items: 5,  sub: 3 } },
    'theme-mosaic':       { base: { items: 4,  sub: 2 }, dense: { items: 4,  sub: 3 } },  // 2x2 fixed; dense = more quotes
    'competitive-matrix': { base: { items: 7,  sub: 6 }, dense: { items: 10, sub: 7 } },  // rows / columns
    'block-quote':        { base: { items: 3,  sub: 3 }, dense: { items: 5,  sub: 5 } },  // corroborating data
    'case-study':         { base: { items: 4,  sub: 3 }, dense: { items: 5,  sub: 4 } },  // beforeAfter points / evidence rows
    'principles':         { base: { items: 5,  sub: 5 }, dense: { items: 8,  sub: 8 } },
    'stat-row':           { base: { items: 3,  sub: 3 }, dense: { items: 4,  sub: 4 } },
    'timeline':           { base: { items: 5,  sub: 5 }, dense: { items: 6,  sub: 7 } },  // phases / items per phase
    'service-blueprint':  { base: { items: 6,  sub: 4 }, dense: { items: 7,  sub: 5 } },  // stages / lanes detail
    'journey-map':        { base: { items: 5,  sub: 3 }, dense: { items: 6,  sub: 4 } },  // stages / actor lanes (Figma T3 = 6x4)
    'gap-matrix':         { base: { items: 7,  sub: 7 }, dense: { items: 10, sub: 10 } },
    'architecture-map':   { base: { items: 6,  sub: 8 }, dense: { items: 6,  sub: 12 } }, // layers / nodes per layer
    'prd-feature':        { base: { items: 4,  sub: 4 }, dense: { items: 6,  sub: 6 } },  // features / acceptance criteria
    'systems-inventory':  { base: { items: 10, sub: 10 }, dense: { items: 14, sub: 14 } },
    'org-chart':          { base: { items: 4,  sub: 4 }, dense: { items: 5,  sub: 5 } },  // tiers / nodes per tier
    'executive-brief':    { base: { items: 4,  sub: 4 }, dense: { items: 6,  sub: 6 } },  // sections / gotchas
};

/** Resolve the (items, sub) ceilings for a template at a density. Unknown
 *  templates get a permissive default so new templates fail open, not closed. */
export function densityCaps(template: string, density?: SlideDensity | string | null): DensityCaps {
    const spec = DENSITY_SPEC[(template || '').toLowerCase()];
    const d: 'base' | 'dense' = density === 'dense' ? 'dense' : 'base';
    if (!spec) return d === 'dense' ? { items: 8, sub: 6 } : { items: 5, sub: 4 };
    return spec[d];
}

// === FIGMA-LIVE TOKEN HYDRATION (2026-06-09) ===
// The hex/font literals above are BUILD-TIME DEFAULTS ONLY, not the source of truth.
// At SPA startup, hydrateTokensFromFigma() overwrites them with the live Figma tokens
// the proxy serves at /api/design-tokens (sourced via MCP from the design-system files,
// nodes 223:2 / 97:2). This makes the RENDERER (web.tsx/pptx.ts) paint from Figma, not
// from hardcoded values. Non-fatal + fail-LOUD: on failure the build defaults stand and
// a console.error is logged - it NEVER silently substitutes a guessed value.
const _TOKENS_PROXY = 'http://127.0.0.1:5012';
export let figmaTokensLoaded = false;
export async function hydrateTokensFromFigma(brand: 'NXT' | 'NU' = 'NXT', target?: Record<string, any>): Promise<boolean> {
    // 2026-06-11 - DUAL-BRAND hydration. Previously only the global TOKENS
    // (NXT) hydrated live; NU rode the static brands.ts values. Callers pass
    // the NU brand object as `target` so BOTH brands paint from the live
    // Figma token sheets (NXT 223:2 / NU 97:2).
    try {
        const r = await fetch(`${_TOKENS_PROXY}/api/design-tokens?brand=${brand}`);
        if (!r.ok) { console.error(`[tokens] Figma hydrate HTTP ${r.status} (${brand}); using build defaults`); return false; }
        const t: any = await r.json();
        const c = t.color || {}; const f = t.font || {};
        const T = (target || TOKENS) as any;
        const up = (k: string, v?: string) => { if (v) T[k] = String(v).replace('#', '').toUpperCase(); };
        up('BLACK', c.rail); up('INK', c.ink); up('CHARTREUSE', c.accent); up('CYAN', c.cyan);
        // CHARTREUSE_BRIGHT/_PALE are read by the case-study + section renderers
        // (web.tsx). Figma exposes one accent, so bind BRIGHT to it (kills the
        // stale CACA20 default) and derive PALE only if Figma lacks an explicit tint.
        up('CHARTREUSE_BRIGHT', c.accent);
        up('RUST', c.rust); up('TEAL', c.teal); up('GREEN', c.success); up('WHITE', c.paper);
        // GOLD slots (rail / hairline / grey are shared keys in both brand files;
        // NU maps its 'source' teal onto the cool accent and red onto kicker+warn).
        up('RAIL', c.rail); up('HAIRLINE', c.hairline); up('GREY', c.grey);
        up('KICKER', c.kicker || c.cyan || c.accent);
        up('ACCENT_COOL', c.source || c.cyan);
        up('ACCENT_WARN', c.warn || c.rust || c.accent);
        up('PANEL', c.ecru); up('WASH_WARN', c['wash-warn']); up('WASH_COOL', c['wash-cool']);
        up('GOLD_ACCENT', c.gold); up('CHARTREUSE_PALE', c['wash-warn']);
        if (c.band) up('BAND', c.band);
        if (f.display) T.FONT_DISPLAY = f.display;
        // 2026-06-13 - hydrate the action-title face + weight too (was skipped, which
        // is why NU's title font never tracked the token). FONT_DISPLAY_PPTX mirrors
        // the title face so the PPTX heading matches the on-screen heading.
        if (f.title) { T.FONT_TITLE = f.title; T.FONT_DISPLAY_PPTX = f.title; }
        if (f['title-weight']) T.TITLE_WEIGHT = String(f['title-weight']);
        if (f.body) { T.FONT = f.body; T.FONT_BODY = f.body; }
        if (f.mono) T.FONT_MONO = f.mono;
        figmaTokensLoaded = true;
        console.log(`[tokens] Figma-live tokens hydrated into renderer TOKENS (${brand}): accent=${T.CHARTREUSE} teal=${T.TEAL} mono=${T.FONT_MONO}`);
        return true;
    } catch (e: any) {
        console.error('[tokens] Figma hydrate failed; using build defaults:', e?.message || e);
        return false;
    }
}
