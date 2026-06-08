// presentationTypes.ts
//
// Wire format between the HiC narrative composer and the presentation-renderer
// service. A PresentationPayload is the single artifact persisted to
// wiki/presentations/{slug}.json and consumed by the renderer at port 5014.
//
// The composer (Opus 4.7 / GPT-5.5) emits this shape directly via
// tool-use + structured output. The renderer reads it via
// GET /api/presentations/{slug} and dispatches sections to React components.
//
// Schema is intentionally narrow: anything the renderer needs to draw a
// section lives in the section's `data` field; brand resolution lives in
// `tokens`; the composer's reasoning trail lives in `narrativeArc`.

import type { ServiceBlueprintStage } from '../types';
import type { ArchitectureMapData } from '../components/slideTemplates/types';

// ============================================================================
// BRAND VARIANTS
// ============================================================================

export type BrandVariant = 'NXT' | 'NU';
export type ThemeMode = 'dark' | 'light';

export interface BrandTokens {
  // Backgrounds + ink
  bgPrimary: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  // Brand accents - semantic, not literal
  accentPrimary: string;     // NXT chartreuse / NU huskies-red
  accentSecondary: string;   // NXT cyan / NU graphite
  accentTertiary: string;    // NXT teal / NU near-black
  // Gradient stops for gradient-text + parallax shapes
  gradientStart: string;
  gradientEnd: string;
  // Borders + cards
  borderPrimary: string;
  borderSecondary: string;
  cardBg: string;
  // Side nav indicator
  navDot: string;
  navDotActive: string;
  // Typography (fixed across brands per nxt-visual-renderer contract)
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
}

// Canonical token sets. Single source of truth for both brand variants.
// Geometry, typography, density rules are shared - only colors swap.
export const BRAND_TOKENS: Record<BrandVariant, BrandTokens> = {
  NXT: {
    bgPrimary: '#0D0D0D',
    bgSecondary: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    accentPrimary: '#B8B800',     // chartreuse
    accentSecondary: '#00B7C3',   // cyan
    accentTertiary: '#115054',    // teal
    gradientStart: '#B8B800',
    gradientEnd: '#00B7C3',
    borderPrimary: '#374151',
    borderSecondary: '#1F2937',
    cardBg: 'rgba(0, 0, 0, 0.20)',
    navDot: '#374151',
    navDotActive: '#B8B800',
    fontDisplay: 'Archivo',
    fontBody: 'Archivo',
    fontMono: 'JetBrains Mono',
  },
  NU: {
    bgPrimary: '#0A0A0A',
    bgSecondary: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    accentPrimary: '#CC0000',     // huskies red
    accentSecondary: '#6B6B6B',   // graphite
    accentTertiary: '#000000',    // near-black
    gradientStart: '#CC0000',
    gradientEnd: '#000000',
    borderPrimary: '#2A2A2A',
    borderSecondary: '#1A1A1A',
    cardBg: 'rgba(0, 0, 0, 0.30)',
    navDot: '#2A2A2A',
    navDotActive: '#CC0000',
    fontDisplay: 'Archivo',
    fontBody: 'Archivo',
    fontMono: 'JetBrains Mono',
  },
};

// ============================================================================
// SECTION KINDS
// ============================================================================
//
// Each kind maps to one React component in the renderer's
// components/sections/. The composer picks which kinds to include based on
// the user's narrative thesis and what the corpus supports.

export type SectionKind =
  | 'hero'
  | 'context'           // SCQA situation/complication framing
  | 'themes'            // 3-4 themes via theme-cluster/spotlight/arc/mosaic
  | 'evidence'          // stat-row template, 3-4 verifiable data points
  | 'quotes'            // 1-3 verbatim block-quotes from corpus
  | 'personas'          // persona-card showcase
  | 'journey'           // service-blueprint stages
  | 'recommendations'   // 3-7 strategic actions
  | 'roadmap'           // timeline with NOW/NEXT/LATER horizons
  | 'gap_analysis'      // gap-matrix template
  | 'tech_arch'         // architecture-map template
  | 'team'              // team showcase
  | 'competitive'       // competitive / industry-landscape (tiered evidence)
  | 'cta';              // call to action / contact

// ============================================================================
// SECTION DATA SHAPES
// ============================================================================

export interface HeroData {
  title: string;            // <= 65 chars; MUST fit on 2 lines max
  subtitle: string[];       // 1-2 lines, each <= 100 chars
  videoUrl?: string;        // optional ambient hero video
  posterUrl?: string;       // optional poster image
}

export interface ContextData {
  situation: string;        // <= 400 chars; the current state
  complication: string;     // <= 400 chars; why status quo unacceptable
  resolution: string;       // <= 400 chars; what must be done (preview)
  citations: Citation[];
}

export interface ThemeMosaicData {
  layout: 'cluster' | 'spotlight' | 'arc' | 'mosaic';
  themes: PresentationTheme[];   // 3-4 themes; spotlight = 1 hero + 2-3 supporting
  patternSignal?: string;        // <= 200 chars; cross-theme pattern
}

export interface PresentationTheme {
  name: string;             // <= 120 chars
  description: string;      // <= 400 chars
  signal?: string;          // <= 120 chars; one-line implication
  status?: 'priority' | 'emerging' | 'weak';
  citations: Citation[];
  isHero?: boolean;         // for spotlight layout
}

export interface PersonaShowcaseData {
  personas: PresentationPersona[];   // 2-4 personas
}

export interface PresentationPersona {
  name: string;
  role: string;
  demographics?: string;
  quote?: string;
  bio?: string;
  topGoal?: string;         // single most important goal
  topPainPoint?: string;    // single most important pain point
  topMotivation?: string;
  evidenceConfidence?: 'EVIDENCED' | 'PARTIALLY_EVIDENCED' | 'HYPOTHESIS';
  imageUrl?: string;
  citations?: Citation[];
}

export interface PresentationStat {
  value: string;            // <= 8 chars; e.g. "$5.1B", "67%", "12-18%"
  label: string;            // <= 60 chars
  context?: string;         // <= 120 chars; what it means
  source: string;           // attribution
  citation?: Citation;
}

export interface PresentationQuote {
  text: string;             // <= 250 chars; smart-clipped to sentence boundary
  attribution: string;      // speaker name or "Anonymous"
  role?: string;            // speaker role
  source: string;           // source publication
  citation: Citation;
}

export interface JourneyData {
  stages: ServiceBlueprintStage[];
  failPoints?: string[];
  emotionCurve?: Array<{ stage: string; emotion: string; intensity: number }>;
}

export interface RecommendationsData {
  recommendations: PresentationRecommendation[];   // 3-7 actions
}

export interface PresentationRecommendation {
  actionTitle: string;      // <= 120 chars; complete sentence with data
  rationale: string;        // <= 400 chars
  supportingActions?: string[];   // <= 200 chars each, max 3
  impactMetric?: string;    // baseline → target; <= 120 chars
  timeframe?: string;       // <= 60 chars; e.g. "Q2 2026"
  owner?: string;           // <= 60 chars; e.g. "VP Advancement"
  evidence?: Citation[];
  implication?: string;     // <= 200 chars; what changes if done
}

export interface RoadmapData {
  horizons: Array<{
    horizon: 'NOW' | 'NEXT' | 'LATER';
    duration: string;       // e.g. "0-3 months"
    initiatives: Array<{
      name: string;
      problem: string;
      successMetric?: string;
      owner?: string;
      confidence?: 'high' | 'medium' | 'speculative';
    }>;
  }>;
}

export interface PresentationGapData {
  gaps: Array<{
    capability: string;
    currentMaturity: 1 | 2 | 3 | 4 | 5;
    targetMaturity: 1 | 2 | 3 | 4 | 5;
    severity: 'critical' | 'high' | 'medium' | 'low';
    impact: string;         // <= 200 chars
    citation?: Citation;
  }>;
}

export interface PresentationTechArchData extends ArchitectureMapData {
  // ArchitectureMapData already has layers[] and nodes[] - reuse as-is.
}

export interface TeamData {
  members: Array<{
    name?: string;          // optional - many decks use roles, not names
    role: string;
    description: string;
    focus?: string;
    imageUrl?: string;
  }>;
}

export interface CtaData {
  title: string;            // <= 120 chars
  description?: string;     // <= 400 chars
  email?: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
}

// ============================================================================
// CITATIONS - universal across all sections
// ============================================================================

export interface Citation {
  sourceFile: string;       // e.g. "CHUNK_017", or wiki path
  sourceName: string;       // resolved name e.g. "Higher Ed Dive: Title"
  text?: string;            // verbatim 10-50 word excerpt
  url?: string;
  author?: string;
  publicationDate?: string;
  scope: 'external' | 'uploaded' | 'analysis';   // provenance
}

// ============================================================================
// THE TAGGED-UNION SECTION
// ============================================================================

export type PresentationSection =
  | { kind: 'hero'; data: HeroData }
  | { kind: 'context'; data: ContextData }
  | { kind: 'themes'; data: ThemeMosaicData }
  | { kind: 'evidence'; data: { stats: PresentationStat[]; convergentInsight?: string } }
  | { kind: 'quotes'; data: { quotes: PresentationQuote[] } }
  | { kind: 'personas'; data: PersonaShowcaseData }
  | { kind: 'journey'; data: JourneyData }
  | { kind: 'recommendations'; data: RecommendationsData }
  | { kind: 'roadmap'; data: RoadmapData }
  | { kind: 'gap_analysis'; data: PresentationGapData }
  | { kind: 'tech_arch'; data: PresentationTechArchData }
  | { kind: 'team'; data: TeamData }
  | { kind: 'cta'; data: CtaData };

// ============================================================================
// THE PAYLOAD
// ============================================================================

export interface PresentationPayload {
  schemaVersion: 1;

  meta: {
    slug: string;                  // URL-safe; engagement-derived + short hash
    title: string;                 // hero title; full action-title sentence
    subtitle: string[];            // 1-2 hero subtitles
    brand: BrandVariant;
    theme: ThemeMode;
    generatedAt: string;           // ISO-8601
    sourceEngagement?: string;     // wiki path back to engagement memo

    // The user's narrative thesis (verbatim, hashtags stripped)
    narrativeThesis: string;

    // Composer observability
    composerModel: string;         // 'gemini-3.1-pro-preview' (default) | 'gpt-5.5'
    composerToolCalls: number;
    sourceCount: {
      external: number;
      uploaded: number;
      analysis: number;
      total: number;
    };
    citationCount: number;
  };

  // The composer's strategic reasoning. Persisted with the deck so the
  // user can audit "why this section sequence" months later.
  narrativeArc: {
    diagnosis: string;             // <= 400 chars; central challenge
    guidingPolicy: string;         // <= 400 chars; strategic decision
    arcRationale: string;          // <= 600 chars; why this sequence
    sectionMap: Array<{
      index: number;
      kind: SectionKind;
      thesis: string;              // <= 200 chars; section's role
    }>;
  };

  sections: PresentationSection[];

  tokens: BrandTokens;
}

// ============================================================================
// HELPERS - resolve brand to tokens
// ============================================================================

export function resolveBrandTokens(brand: BrandVariant): BrandTokens {
  return BRAND_TOKENS[brand];
}

// Type guard helpers - useful in renderer's section dispatcher
export function isSectionKind(value: unknown): value is SectionKind {
  return typeof value === 'string' && [
    'hero', 'context', 'themes', 'evidence', 'quotes',
    'personas', 'journey', 'recommendations', 'roadmap',
    'gap_analysis', 'tech_arch', 'team', 'cta',
  ].includes(value);
}

// Slug generation - engagement-derived + short content hash
export function generateSlug(engagementGoal: string, narrativeThesis: string): string {
  const goalSlug = engagementGoal
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  // Short hash from thesis - deterministic across same input, no crypto needed
  let hash = 0;
  for (let i = 0; i < narrativeThesis.length; i++) {
    hash = ((hash << 5) - hash + narrativeThesis.charCodeAt(i)) | 0;
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, 6);

  return `${goalSlug}-${shortHash}`;
}
