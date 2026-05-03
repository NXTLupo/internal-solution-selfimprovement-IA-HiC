import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle } from './_primitives';

interface Initiative {
  name: string;
  problem?: string;
  successMetric?: string;
  owner?: string;
  confidence?: 'high' | 'medium' | 'speculative';
}
interface Horizon {
  horizon: 'NOW' | 'NEXT' | 'LATER';
  duration: string;
  initiatives: Initiative[];
}
interface RoadmapData {
  horizons: Horizon[];
}

const HORIZON_ACCENT = {
  NOW: 'var(--accent-primary)',
  NEXT: 'var(--accent-secondary)',
  LATER: 'var(--accent-tertiary)',
};

export const RoadmapSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as RoadmapData;
  return (
    <div>
      <SectionLabel icon="roadmap">Section {String(index + 1).padStart(2, '0')} · Sequencing</SectionLabel>
      <SectionTitle scale={headlineScale}>The roadmap.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', marginTop: '32px' }}>
        {d.horizons.map((h, i) => (
          <div key={i} style={{
            padding: '24px',
            backgroundColor: 'var(--card-bg)',
            borderTop: `3px solid ${HORIZON_ACCENT[h.horizon] || 'var(--text-tertiary)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.2em', color: HORIZON_ACCENT[h.horizon] }}>{h.horizon}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>{h.duration}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {h.initiatives.map((init, j) => (
                <div key={j} style={{
                  paddingLeft: '12px',
                  borderLeft: `2px solid ${init.confidence === 'high' ? HORIZON_ACCENT[h.horizon] : 'var(--border-primary)'}`,
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{init.name}</div>
                  {init.problem && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>{init.problem}</div>}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {init.successMetric && <span>→ {init.successMetric}</span>}
                    {init.owner && <span>· {init.owner}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
