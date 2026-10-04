// types.ts
//
// Local re-declaration of PresentationPayload + section shapes. Mirrors the
// canonical definition in
// humans-in-control-research/services/presentationTypes.ts so that the
// renderer can compile standalone (no monorepo wiring required).
//
// IMPORTANT: keep this file in sync with the canonical source. When the HiC
// schema changes, update both files. Iteration 2 will replace this with a
// proper monorepo `packages/presentation-types/` shared package.

// 2026-10-01 - DECIEM (The Abnormal Beauty Company) is the third brand mode; mirrors the canonical
// BrandVariant in humans-in-control-research/services/presentationTypes.ts.
export type BrandVariant = 'NXT' | 'NU' | 'DECIEM';
export type ThemeMode = 'dark' | 'light';

export type SectionKind =
  | 'hero'
  | 'context'
  | 'themes'
  | 'evidence'
  | 'quotes'
  | 'personas'
  | 'journey'
  | 'recommendations'
  | 'roadmap'
  | 'gap_analysis'
  | 'tech_arch'
  | 'team'
  | 'competitive'
  | 'cta';

export interface Citation {
  sourceFile: string;
  sourceName: string;
  text?: string;
  url?: string;
  author?: string;
  publicationDate?: string;
  scope: 'external' | 'uploaded' | 'analysis';
}

export interface BrandTokens {
  bgPrimary: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  gradientStart: string;
  gradientEnd: string;
  borderPrimary: string;
  borderSecondary: string;
  cardBg: string;
  navDot: string;
  navDotActive: string;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
}

// Section payloads — narrow types preserved as `unknown` for the dispatcher;
// individual section components cast to their specific shape. Iteration 2
// will replace `unknown` with the full discriminated-union shapes from the
// canonical types file.

export type PresentationSection = {
  kind: SectionKind;
  data: Record<string, unknown>;
};

export interface PresentationPayload {
  schemaVersion: 1;
  meta: {
    slug: string;
    title: string;
    subtitle: string[];
    brand: BrandVariant;
    theme: ThemeMode;
    generatedAt: string;
    sourceEngagement?: string;
    narrativeThesis: string;
    composerModel: string;
    composerToolCalls: number;
    sourceCount: {
      external: number;
      uploaded: number;
      analysis: number;
      total: number;
    };
    citationCount: number;
  };
  narrativeArc: {
    diagnosis: string;
    guidingPolicy: string;
    arcRationale: string;
    sectionMap: Array<{
      index: number;
      kind: SectionKind;
      thesis: string;
    }>;
  };
  sections: PresentationSection[];
  tokens: BrandTokens;
}
