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
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '32px 24px',
            backgroundColor: 'var(--card-bg)',
            borderTop: `3px solid var(--${ROTATION[i % ROTATION.length]})`,
          }}>
            <div style={{
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: `var(--${ROTATION[i % ROTATION.length]})`,
              lineHeight: 1.0,
              marginBottom: '12px',
            }}>{s.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>{s.label}</div>
            {s.context && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{s.context}</div>}
            <div style={{ marginTop: '12px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-tertiary)' }}>{s.source}</div>
          </div>
        ))}
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
