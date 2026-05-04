import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card, Pill, CitationFooter } from './_primitives';

interface Theme {
  name: string;
  description: string;
  signal?: string;
  status?: string;
  citations?: Array<{ sourceName?: string }>;
  isHero?: boolean;
}

interface ThemesData {
  layout?: 'cluster' | 'spotlight' | 'arc' | 'mosaic';
  themes: Theme[];
  patternSignal?: string;
}

export const ThemesSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as ThemesData;
  // 2026-05-04 — Defensive: tolerate missing/non-array themes.
  const themes: Theme[] = Array.isArray(d?.themes) ? d.themes : [];
  const layout = d.layout || (themes.length === 4 ? 'mosaic' : themes[0]?.isHero ? 'spotlight' : 'cluster');
  const allCites = themes.flatMap(t => (t.citations || []).map(c => c.sourceName || '')).filter(Boolean);

  return (
    <div>
      <SectionLabel icon="themes">Section {String(index + 1).padStart(2, '0')} · Strategic Themes</SectionLabel>
      <SectionTitle scale={headlineScale}>What we found.</SectionTitle>
      {d.patternSignal && (
        <div style={{ marginBottom: '32px', padding: '16px', borderLeft: '3px solid var(--accent-primary)', backgroundColor: 'var(--card-bg)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '6px' }}>Cross-Theme Pattern</div>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, fontStyle: 'italic' }}>{d.patternSignal}</p>
        </div>
      )}

      {layout === 'spotlight' ? <SpotlightLayout themes={themes} /> : <ClusterLayout themes={themes} />}

      <CitationFooter sources={allCites} />
    </div>
  );
};

const SpotlightLayout: React.FC<{ themes: Theme[] }> = ({ themes }) => {
  const hero = themes.find(t => t.isHero) || themes[0];
  const supporting = themes.filter(t => t !== hero);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginTop: '32px' }}>
      <Card accent style={{ minHeight: '260px' }}>
        <Pill tone="accent">Hero theme</Pill>
        <h3 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0 12px', letterSpacing: '-0.01em' }}>{hero.name}</h3>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{hero.description}</p>
        {hero.signal && <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--accent-secondary)', fontStyle: 'italic' }}>→ {hero.signal}</div>}
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {supporting.slice(0, 8).map((t, i) => (
          <Card key={i} style={{ flex: 1 }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{t.name}</h4>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{t.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ClusterLayout: React.FC<{ themes: Theme[] }> = ({ themes }) => {
  const cols = themes.length === 4 ? 2 : Math.min(themes.length, 3);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '20px', marginTop: '32px' }}>
      {themes.map((t, i) => (
        <Card key={i}>
          {t.status && <Pill tone={t.status === 'priority' ? 'accent' : 'muted'}>{t.status}</Pill>}
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0', letterSpacing: '-0.01em' }}>{t.name}</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{t.description}</p>
          {t.signal && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--accent-secondary)', fontStyle: 'italic' }}>→ {t.signal}</div>}
        </Card>
      ))}
    </div>
  );
};
