import React from 'react';
import { motion } from 'framer-motion';
import type { SectionProps } from './registry';

interface HeroData {
  title: string;
  subtitle?: string[];
  videoUrl?: string;
  posterUrl?: string;
}

/**
 * Hero title now matches the same clamp every other section title uses
 * (see _primitives.tsx SectionTitle). Single consistent visual weight
 * across the whole deck — the hero is just the first section, not a
 * bigger flagship. Hard cap to 2 lines via WebkitLineClamp below.
 */
const HERO_FONT_CLAMP = 'clamp(36px, 6vw, 80px)';

export const HeroSection: React.FC<SectionProps> = ({ data, headlineScale, payload }) => {
  const d = data as HeroData;
  const title = d.title || payload.meta.title || 'Untitled';
  const subtitles = d.subtitle || payload.meta.subtitle || [];

  // Hero is the only section with explicit centered layout + brand period accent
  const [main, period] = title.endsWith('.') ? [title.slice(0, -1), '.'] : [title, ''];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', position: 'relative', padding: '48px 0' }}>
      {d.videoUrl && (
        <video
          autoPlay loop muted playsInline poster={d.posterUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.20, zIndex: 0 }}
        >
          <source src={d.videoUrl} type="video/mp4" />
        </video>
      )}
      <motion.h1
        style={{
          scale: headlineScale,
          fontSize: HERO_FONT_CLAMP,
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: 'var(--text-primary)',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1,
          // No mid-word breaks. No hyphenation. Words wrap whole at whitespace.
          // No max-width constraint — title gets the full 1280px parent column,
          // which means fewer lines and no awkward narrow wrapping.
          wordBreak: 'normal',
          overflowWrap: 'normal',
          hyphens: 'none' as const,
        }}
      >
        {main}
        {period && <span style={{ color: 'var(--accent-primary)' }}>{period}</span>}
      </motion.h1>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
        {subtitles.map((s, i) => (
          <p key={i} style={{
            fontSize: 'clamp(16px, 1.5vw, 22px)',
            color: 'var(--text-secondary)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
            marginBottom: '6px',
          }}>{s}</p>
        ))}
      </div>
    </div>
  );
};
