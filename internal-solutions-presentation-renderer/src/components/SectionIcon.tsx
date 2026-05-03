// SectionIcon.tsx
//
// Editorial line-art SVG marks, one per section kind. Per nxt-visual-renderer
// skill: anti-slop, no stock icons, no emoji, no cute. Each icon is a single
// concept rendered with stroke 1.5px and inherits the brand accent via
// currentColor. Small (16-20px), placed inline with the section label header
// to add a designer's flourish without competing with the content.
//
// Brand-shared geometry: shape language is the same for NXT and NU. Color
// resolves from `var(--accent-primary)` at the call site.

import React from 'react';
import type { SectionKind } from '../types';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const Svg: React.FC<{ size: number; sw: number; children: React.ReactNode }> = ({ size, sw, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
  >
    {children}
  </svg>
);

// 01 Hero — opening mark: a circle with a stroke through it (entry point)
const HeroIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12 L12 12" />
  </Svg>
);

// 02 Context — three vertical bars of varying heights (situation/complication/resolution)
const ContextIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M5 18 L5 13" />
    <path d="M12 18 L12 6" />
    <path d="M19 18 L19 10" />
  </Svg>
);

// 03 Themes — four dots in a 2×2 grid (cluster of ideas)
const ThemesIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <circle cx="8" cy="8" r="2" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="8" cy="16" r="2" />
    <circle cx="16" cy="16" r="2" />
  </Svg>
);

// 04 Evidence — three ascending bars (data)
const EvidenceIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M5 18 L5 14" />
    <path d="M12 18 L12 9" />
    <path d="M19 18 L19 5" />
    <path d="M3 20 L21 20" />
  </Svg>
);

// 05 Quotes — abstract quote mark (open + close)
const QuotesIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M6 9 Q4 9 4 11 L4 14 L8 14 L8 11 Q8 9 6 9 Z" />
    <path d="M16 9 Q14 9 14 11 L14 14 L18 14 L18 11 Q18 9 16 9 Z" />
  </Svg>
);

// 06 Personas — abstract figure (head + shoulders silhouette as line)
const PersonasIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20 Q5 14 12 14 Q19 14 19 20" />
  </Svg>
);

// 07 Journey — arrow with three checkpoints (path with stops)
const JourneyIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M3 12 L21 12" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
    <path d="M19 9 L21 12 L19 15" />
  </Svg>
);

// 08 Recommendations — target (concentric circles, action)
const RecommendationsIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

// 09 Roadmap — horizontal timeline (NOW | NEXT | LATER)
const RoadmapIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M3 12 L21 12" />
    <path d="M6 9 L6 15" />
    <path d="M12 9 L12 15" />
    <path d="M18 9 L18 15" />
  </Svg>
);

// 10 Gap Analysis — open span/bracket (current ↔ target)
const GapIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M5 6 L5 18" />
    <path d="M5 12 L19 12" />
    <path d="M19 6 L19 18" />
    <path d="M9 9 L5 12 L9 15" />
    <path d="M15 9 L19 12 L15 15" />
  </Svg>
);

// 11 Tech Arch — three stacked layers
const TechArchIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <rect x="4" y="5" width="16" height="3.5" rx="0.5" />
    <rect x="4" y="10.25" width="16" height="3.5" rx="0.5" />
    <rect x="4" y="15.5" width="16" height="3.5" rx="0.5" />
  </Svg>
);

// 12 Team — three figures in a row
const TeamIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <circle cx="6" cy="9" r="2" />
    <circle cx="12" cy="9" r="2" />
    <circle cx="18" cy="9" r="2" />
    <path d="M3 17 Q3 13 6 13 Q9 13 9 17" />
    <path d="M9 17 Q9 13 12 13 Q15 13 15 17" />
    <path d="M15 17 Q15 13 18 13 Q21 13 21 17" />
  </Svg>
);

// 13 CTA — arrow forward
const CtaIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5 }) => (
  <Svg size={size} sw={strokeWidth}>
    <path d="M4 12 L20 12" />
    <path d="M14 6 L20 12 L14 18" />
  </Svg>
);

const REGISTRY: Record<SectionKind, React.FC<IconProps>> = {
  hero: HeroIcon,
  context: ContextIcon,
  themes: ThemesIcon,
  evidence: EvidenceIcon,
  quotes: QuotesIcon,
  personas: PersonasIcon,
  journey: JourneyIcon,
  recommendations: RecommendationsIcon,
  roadmap: RoadmapIcon,
  gap_analysis: GapIcon,
  tech_arch: TechArchIcon,
  team: TeamIcon,
  // Competitive uses the recommendations icon (action-oriented chevrons) —
  // it's the closest semantic match without commissioning a new SVG.
  competitive: RecommendationsIcon,
  cta: CtaIcon,
};

export const SectionIcon: React.FC<{ kind: SectionKind; size?: number; strokeWidth?: number }> = ({
  kind,
  size = 16,
  strokeWidth = 1.5,
}) => {
  const Icon = REGISTRY[kind];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} />;
};
