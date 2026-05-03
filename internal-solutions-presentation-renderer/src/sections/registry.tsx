// sections/registry.tsx
//
// Maps SectionKind → React component. The dispatcher in App.tsx looks up the
// component by section.kind. Adding a new section kind means adding one entry
// here and one component file.
//
// Each component receives:
//   - data: section payload (cast to specific shape internally)
//   - headlineScale: MotionValue<number> for the section's main headline
//   - index, total: position in the deck
//   - payload: full PresentationPayload for cross-section reference

import type { MotionValue } from 'framer-motion';
import type { PresentationPayload, SectionKind } from '../types';

import { HeroSection } from './HeroSection';
import { ContextSection } from './ContextSection';
import { ThemesSection } from './ThemesSection';
import { EvidenceSection } from './EvidenceSection';
import { QuotesSection } from './QuotesSection';
import { PersonasSection } from './PersonasSection';
import { JourneySection } from './JourneySection';
import { RecommendationsSection } from './RecommendationsSection';
import { RoadmapSection } from './RoadmapSection';
import { GapAnalysisSection } from './GapAnalysisSection';
import { TechArchSection } from './TechArchSection';
import { TeamSection } from './TeamSection';
import { CompetitiveSection } from './CompetitiveSection';
import { CtaSection } from './CtaSection';

export interface SectionProps {
  data: any;
  headlineScale: MotionValue<number>;
  index: number;
  total: number;
  payload: PresentationPayload;
}

export const SECTION_REGISTRY: Record<SectionKind, React.FC<SectionProps>> = {
  hero: HeroSection,
  context: ContextSection,
  themes: ThemesSection,
  evidence: EvidenceSection,
  quotes: QuotesSection,
  personas: PersonasSection,
  journey: JourneySection,
  recommendations: RecommendationsSection,
  roadmap: RoadmapSection,
  gap_analysis: GapAnalysisSection,
  tech_arch: TechArchSection,
  team: TeamSection,
  competitive: CompetitiveSection,
  cta: CtaSection,
};
