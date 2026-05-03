import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card, CitationFooter } from './_primitives';

interface ContextData {
  situation: string;
  complication: string;
  resolution: string;
  citations?: Array<{ sourceName?: string }>;
}

export const ContextSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as ContextData;
  return (
    <div>
      <SectionLabel icon="context">Section {String(index + 1).padStart(2, '0')} · The Situation</SectionLabel>
      <SectionTitle scale={headlineScale}>Context.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', marginTop: '32px' }}>
        <Card>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Situation</div>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{d.situation}</p>
        </Card>
        <Card accent>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>Complication</div>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{d.complication}</p>
        </Card>
        <Card>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Resolution</div>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{d.resolution}</p>
        </Card>
      </div>
      <CitationFooter sources={(d.citations || []).map(c => c.sourceName || '').filter(Boolean)} />
    </div>
  );
};
