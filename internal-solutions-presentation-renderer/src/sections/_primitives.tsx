// _primitives.tsx — shared section building blocks.
//
// Brand-token-aware primitives used by section components. Keep these dumb;
// no business logic. The SECTION_REGISTRY components compose these.

import React from 'react';
import { motion, type MotionValue } from 'framer-motion';
import type { SectionKind } from '../types';
import { SectionIcon } from '../components/SectionIcon';

// 2026-05-05 — Shared placeholder-stripper. Treats common empty-state
// strings as "no content" so the renderer never displays a self-referential
// "Fail point: None identified" / "Owner: TBD" / "Outcome: Not specified"
// label. The composer prompts forbid emitting these placeholders, the
// post-processor strips QA annotations, and this helper is the third layer
// of defense at render time.
const PLACEHOLDER_RX = /^(\s*(none\s*(identified|specified|provided)?|n\/?a|not\s+(specified|provided|applicable|identified|available)|tbd|to\s+be\s+(determined|defined)|—|-|null|undefined|true|false|evidence\s+gap|needs\s+baseline|baseline\s+tbd)\s*\.?)$/i;
export const meaningful = (v: unknown): string => {
  if (v == null || typeof v === 'boolean') return '';
  const s = String(v).trim();
  if (!s) return '';
  if (PLACEHOLDER_RX.test(s)) return '';
  return s;
};

export const SectionLabel: React.FC<{ children: React.ReactNode; icon?: SectionKind }> = ({ children, icon }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--accent-primary)',
    fontWeight: 700,
    marginBottom: '20px',
  }}>
    {icon && <SectionIcon kind={icon} size={16} strokeWidth={1.5} />}
    <span>{children}</span>
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; scale?: MotionValue<number>; align?: 'left' | 'center' }> = ({ children, scale, align = 'left' }) => (
  <motion.h2
    style={{
      fontSize: 'clamp(36px, 6vw, 80px)',
      fontWeight: 900,
      letterSpacing: '-0.02em',
      lineHeight: 1.05,
      color: 'var(--text-primary)',
      marginBottom: '24px',
      textAlign: align,
      ...(scale ? { scale } : {}),
    }}
  >
    {children}
  </motion.h2>
);

export const SectionNarrative: React.FC<{ children: React.ReactNode; align?: 'left' | 'center' }> = ({ children, align = 'left' }) => (
  <p style={{
    fontSize: 'clamp(16px, 1.4vw, 22px)',
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
    marginBottom: '32px',
    maxWidth: '880px',
    ...(align === 'center' ? { marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' } : {}),
  }}>
    {children}
  </p>
);

export const Card: React.FC<{ children: React.ReactNode; accent?: boolean; style?: React.CSSProperties }> = ({ children, accent = false, style = {} }) => (
  <div style={{
    backgroundColor: 'var(--card-bg)',
    border: `1px solid ${accent ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
    borderLeft: accent ? '3px solid var(--accent-primary)' : `1px solid ${'var(--border-primary)'}`,
    borderRadius: '4px',
    padding: '24px',
    backdropFilter: 'blur(8px)',
    ...style,
  }}>
    {children}
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; tone?: 'accent' | 'muted' | 'rust' }> = ({ children, tone = 'muted' }) => (
  <span style={{
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: 700,
    borderRadius: '2px',
    backgroundColor: tone === 'accent' ? 'var(--accent-primary)' : 'transparent',
    color: tone === 'accent' ? 'var(--bg-primary)' : 'var(--text-tertiary)',
    border: tone === 'accent' ? 'none' : `1px solid var(--border-primary)`,
  }}>
    {children}
  </span>
);

export const CitationFooter: React.FC<{ sources: string[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  const unique = Array.from(new Set(sources)).filter(Boolean);
  return (
    <div style={{
      fontSize: '10px',
      color: 'var(--text-tertiary)',
      fontFamily: 'JetBrains Mono, monospace',
      borderTop: `1px solid var(--border-secondary)`,
      paddingTop: '12px',
      marginTop: '16px',
      lineHeight: 1.6,
    }}>
      Sources: {unique.slice(0, 6).join(' · ')}
      {unique.length > 6 ? ` · +${unique.length - 6} more` : ''}
    </div>
  );
};

export const Grid: React.FC<{ cols?: number; gap?: number; children: React.ReactNode }> = ({ cols = 3, gap = 24, children }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: `${gap}px`,
  }}>
    {children}
  </div>
);
