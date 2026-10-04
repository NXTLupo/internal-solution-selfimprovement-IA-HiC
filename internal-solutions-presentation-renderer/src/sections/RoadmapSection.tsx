import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, meaningful } from './_primitives';

// 2026-05-04 — Each field accepts multiple synonyms because composer models
// emit slightly different shapes. The common factor is: each horizon has a
// label, a time range, and a list of items; each item has a name and
// optional metadata.
interface Initiative {
  name?: string;
  title?: string;
  problem?: string;
  outcome?: string;
  successMetric?: string;
  owner?: string;
  confidence?: 'high' | 'medium' | 'speculative';
  sources?: string[];
}
interface Horizon {
  horizon?: 'NOW' | 'NEXT' | 'LATER' | string;
  name?: string;
  duration?: string;
  timeframe?: string;
  initiatives?: Initiative[];
  items?: Initiative[];
}
interface RoadmapData {
  horizons?: Horizon[];
}

const HORIZON_ACCENT: Record<string, string> = {
  NOW: 'var(--accent-primary)',
  NEXT: 'var(--accent-secondary)',
  LATER: 'var(--accent-tertiary)',
};

export const RoadmapSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as RoadmapData;
  const horizons = Array.isArray(d?.horizons) ? d.horizons : [];
  return (
    <div>
      <SectionLabel icon="roadmap">Section {String(index + 1).padStart(2, '0')} · Sequencing</SectionLabel>
      <SectionTitle scale={headlineScale}>The roadmap.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', marginTop: '32px' }}>
        {horizons.map((h, i) => {
          // Tolerant field resolution per horizon, with placeholder stripping
          // so missing fields render as truly empty rather than displaying
          // "Owner: TBD" or "Metric: Not specified".
          const label = (meaningful(h.horizon) || meaningful(h.name) || `H${i + 1}`).toUpperCase();
          const accent = HORIZON_ACCENT[label] || 'var(--text-tertiary)';
          const range = meaningful(h.duration) || meaningful(h.timeframe);
          const items: Initiative[] = Array.isArray(h.initiatives)
            ? h.initiatives
            : Array.isArray(h.items)
              ? h.items
              : [];
          return (
            <div key={i} style={{
              padding: '24px',
              backgroundColor: 'var(--card-bg)',
              borderTop: `3px solid ${accent}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.2em', color: accent }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace" }}>{range}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {items.map((init, j) => {
                  const itemTitle = meaningful(init.name) || meaningful(init.title) || `Item ${j + 1}`;
                  const itemBody = meaningful(init.problem) || meaningful(init.outcome);
                  const successMetric = meaningful(init.successMetric);
                  const owner = meaningful(init.owner);
                  return (
                    <div key={j} style={{
                      paddingLeft: '12px',
                      borderLeft: `2px solid ${init.confidence === 'high' ? accent : 'var(--border-primary)'}`,
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{itemTitle}</div>
                      {itemBody && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>{itemBody}</div>}
                      {(successMetric || owner) && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {successMetric && <span>→ {successMetric}</span>}
                          {owner && <span>· {owner}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
