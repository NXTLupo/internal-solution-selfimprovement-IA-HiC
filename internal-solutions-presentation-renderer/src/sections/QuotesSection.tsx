import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, CitationFooter } from './_primitives';

interface Quote {
  text: string;
  attribution: string;
  role?: string;
  source: string;
}
interface QuotesData {
  quotes: Quote[];
}

export const QuotesSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as QuotesData;
  return (
    <div>
      <SectionLabel icon="quotes">Section {String(index + 1).padStart(2, '0')} · Voices from the Field</SectionLabel>
      <SectionTitle scale={headlineScale}>What people are saying.</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '32px' }}>
        {d.quotes.map((q, i) => (
          <div key={i} style={{
            padding: '32px',
            borderLeft: '4px solid var(--accent-primary)',
            backgroundColor: 'var(--card-bg)',
          }}>
            <p style={{
              fontSize: 'clamp(20px, 2.4vw, 32px)',
              fontWeight: 300,
              lineHeight: 1.4,
              color: 'var(--text-primary)',
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              marginBottom: '16px',
            }}>
              "{q.text}"
            </p>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {q.attribution}{q.role ? <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}> · {q.role}</span> : null}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>{q.source}</div>
          </div>
        ))}
      </div>
      <CitationFooter sources={d.quotes.map(q => q.source)} />
    </div>
  );
};
