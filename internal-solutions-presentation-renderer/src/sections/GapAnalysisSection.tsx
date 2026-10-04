import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle } from './_primitives';

interface RawGap {
  capability?: string;
  // Schema says integer 1-5; tolerant of strings ("1", "L1", "Fragmented...")
  // because models drift here. We coerce defensively in normalize().
  currentMaturity?: number | string;
  targetMaturity?: number | string;
  // Optional descriptive labels for current/target — when models DO emit
  // descriptive strings, we render them as captions instead of dropping them.
  currentState?: string;
  targetState?: string;
  severity?: string;
  impact?: string;
  citation?: unknown;
}

interface GapData {
  gaps: RawGap[];
}

interface NormalizedGap {
  capability: string;
  currentLevel: number;          // 1..5
  targetLevel: number;            // 1..5
  currentLabel?: string;          // optional descriptive caption
  targetLabel?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
}

const SEVERITY_TONE: Record<NormalizedGap['severity'], { bar: string; label: string }> = {
  critical: { bar: 'var(--accent-primary)', label: 'Critical' },
  high:     { bar: 'var(--accent-primary)', label: 'High' },
  medium:   { bar: 'var(--accent-tertiary)', label: 'Medium' },
  low:      { bar: 'var(--text-tertiary)',   label: 'Low' },
};

// Coerce maturity field (model may emit number, string number, or descriptive string)
function coerceLevel(v: unknown, fallback: number): number {
  if (typeof v === 'number' && v >= 1 && v <= 5) return Math.round(v);
  if (typeof v === 'string') {
    const m = v.match(/[1-5]/);                  // "L3", "Level 3", "3.5", "3 - foo"
    if (m) return Math.max(1, Math.min(5, parseInt(m[0], 10)));
  }
  return fallback;
}

function coerceSeverity(v: unknown): NormalizedGap['severity'] {
  const s = String(v || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high'))     return 'high';
  if (s.includes('low'))      return 'low';
  return 'medium';
}

// Pull a descriptive caption out of a maturity field that's a long string.
// "L1: Fragmented across CRM" → "Fragmented across CRM"
// "Fragmented across CRM"    → "Fragmented across CRM"
function maybeCaption(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (s.length < 12) return undefined;             // probably just "L1" or "1"
  // Strip leading "L1: " / "Level 1 - " / "1. " prefix
  const cleaned = s.replace(/^(L\d|Level\s*\d|\d+)[\s.:-]+/i, '').trim();
  return cleaned.length > 8 ? cleaned : undefined;
}

function normalize(raw: RawGap, idx: number): NormalizedGap {
  return {
    capability: raw.capability || `Gap ${idx + 1}`,
    currentLevel: coerceLevel(raw.currentMaturity, 1),
    targetLevel: coerceLevel(raw.targetMaturity, 5),
    currentLabel: raw.currentState || maybeCaption(raw.currentMaturity),
    targetLabel: raw.targetState || maybeCaption(raw.targetMaturity),
    severity: coerceSeverity(raw.severity),
    impact: raw.impact || '',
  };
}

export const GapAnalysisSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as GapData;
  const gaps = (d.gaps || []).map(normalize);

  return (
    <div>
      <SectionLabel icon="gap_analysis">Section {String(index + 1).padStart(2, '0')} · Capability Gaps</SectionLabel>
      <SectionTitle scale={headlineScale}>Where we stand.</SectionTitle>

      <div style={{
        marginTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        borderTop: '1px solid var(--border-primary)',
      }}>
        {gaps.map((g, i) => <GapRow key={i} gap={g} num={i + 1} />)}
      </div>
    </div>
  );
};

const GapRow: React.FC<{ gap: NormalizedGap; num: number }> = ({ gap, num }) => {
  const tone = SEVERITY_TONE[gap.severity];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr 280px 1fr',
      gap: '32px',
      alignItems: 'center',
      padding: '28px 0',
      borderBottom: '1px solid var(--border-primary)',
      position: 'relative',
    }}>
      {/* Severity accent bar — vertical stripe on the far left */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '28px',
        bottom: '28px',
        width: '3px',
        backgroundColor: tone.bar,
      }} />

      {/* Number + severity tag */}
      <div style={{ paddingLeft: '20px', minWidth: '60px' }}>
        <div style={{
          fontSize: '11px',
          fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
          color: 'var(--text-tertiary)',
          fontWeight: 600,
          marginBottom: '4px',
        }}>
          {String(num).padStart(2, '0')}
        </div>
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: tone.bar,
        }}>
          {tone.label}
        </div>
      </div>

      {/* Capability name */}
      <div>
        <div style={{
          fontSize: '17px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          {gap.capability}
        </div>
      </div>

      {/* Maturity progression — current vs target on a 5-step rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <MaturityRail current={gap.currentLevel} target={gap.targetLevel} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          fontWeight: 600,
        }}>
          <span>L{gap.currentLevel} · Current</span>
          <span style={{ color: tone.bar }}>L{gap.targetLevel} · Target</span>
        </div>
      </div>

      {/* Impact statement */}
      <div style={{
        fontSize: '13px',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
      }}>
        {gap.impact}
      </div>
    </div>
  );
};

// Editorial maturity scale — five connected dots with current/target marked.
// Filled dots up to current. Outline ring at target. Connecting line indicates
// the journey to traverse.
const MaturityRail: React.FC<{ current: number; target: number }> = ({ current, target }) => {
  const dots = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '20px' }}>
      {/* Track line */}
      <div style={{
        position: 'absolute',
        left: '6px',
        right: '6px',
        top: '50%',
        height: '1px',
        backgroundColor: 'var(--border-primary)',
        zIndex: 0,
      }} />
      {/* Filled progress segment */}
      <div style={{
        position: 'absolute',
        left: '6px',
        top: '50%',
        height: '1.5px',
        backgroundColor: 'var(--accent-primary)',
        zIndex: 1,
        width: `calc(${((current - 1) / 4) * 100}% - 12px)`,
        transform: 'translateY(-50%)',
      }} />
      {/* Dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        zIndex: 2,
        position: 'relative',
      }}>
        {dots.map((lvl) => {
          const reached = lvl <= current;
          const isTarget = lvl === target;
          const size = reached || isTarget ? 12 : 8;
          return (
            <div
              key={lvl}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                backgroundColor: reached ? 'var(--accent-primary)' : 'var(--bg-primary)',
                border: isTarget ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                boxSizing: 'border-box',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
