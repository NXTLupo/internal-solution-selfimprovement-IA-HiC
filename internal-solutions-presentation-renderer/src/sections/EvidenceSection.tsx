import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, CitationFooter } from './_primitives';

interface Stat {
  value: string;
  label: string;
  context?: string;
  source: string;
}
interface EvidenceData {
  stats: Stat[];
  convergentInsight?: string;
}

const ROTATION = ['accent-primary', 'accent-secondary', 'accent-tertiary'];

// 2026-05-06 — Length-based value typography. The composer is allowed to
// emit either compact numerics ("73%", "$15M", "5+", "1 in 3") OR
// qualitative descriptors ("Pilot", "Unstructured", "Y2+") in `value`,
// depending on whether the underlying evidence is quantitative. Earlier
// the renderer hardcoded clamp(36px, 5vw, 64px) which clipped longer
// strings ("Unstructured" → "Unstructur"). We now scale the font down by
// character count so qualitative values fit cleanly while short numerics
// keep their dramatic 64px treatment. Hard caps + wordBreak make sure
// even a runaway 30-char value never escapes the card.
function valueTypography(rawValue: unknown): { fontSize: string; fontWeight: number; lineHeight: number } {
  const text = String(rawValue ?? '').trim();
  const len = text.length;
  if (len <= 5)  return { fontSize: 'clamp(36px, 5vw, 64px)',  fontWeight: 900, lineHeight: 1.0 };
  if (len <= 8)  return { fontSize: 'clamp(30px, 4vw, 52px)',  fontWeight: 900, lineHeight: 1.05 };
  if (len <= 12) return { fontSize: 'clamp(24px, 3vw, 40px)',  fontWeight: 800, lineHeight: 1.1 };
  if (len <= 18) return { fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 800, lineHeight: 1.15 };
  return            { fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 700, lineHeight: 1.25 };
}

export const EvidenceSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as EvidenceData;
  // 2026-05-04 — Defensive: tolerate missing/non-array stats so a malformed
  // payload doesn't crash the whole presentation.
  const stats = Array.isArray(d?.stats) ? d.stats : [];
  const cols = Math.min(4, Math.max(2, stats.length || 2));

  return (
    <div>
      <SectionLabel icon="evidence">Section {String(index + 1).padStart(2, '0')} · By the Numbers</SectionLabel>
      <SectionTitle scale={headlineScale}>Evidence.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '16px', marginTop: '32px' }}>
        {stats.map((s, i) => {
          const typo = valueTypography(s.value);
          return (
            <div key={i} style={{
              padding: '32px 24px',
              backgroundColor: 'var(--card-bg)',
              borderTop: `3px solid var(--${ROTATION[i % ROTATION.length]})`,
              // overflow:hidden on the card itself prevents the rare runaway
              // single-token value (no spaces, e.g., "Unstructuredness") from
              // pushing the next card off-grid.
              overflow: 'hidden',
            }}>
              <div style={{
                ...typo,
                letterSpacing: '-0.03em',
                color: `var(--${ROTATION[i % ROTATION.length]})`,
                marginBottom: '12px',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                hyphens: 'auto',
              }}>{s.value}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>{s.label}</div>
              {s.context && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{s.context}</div>}
              <div style={{ marginTop: '12px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-tertiary)' }}>{s.source}</div>
            </div>
          );
        })}
      </div>
      {d.convergentInsight && (
        <div style={{ marginTop: '32px', padding: '20px', borderLeft: '3px solid var(--accent-primary)', backgroundColor: 'var(--card-bg)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px' }}>What this means</div>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>{d.convergentInsight}</p>
        </div>
      )}
      <CitationFooter sources={stats.map(s => s.source)} />
    </div>
  );
};
