import React from 'react';
import type { SectionProps } from './registry';

interface CtaData {
  title: string;
  description?: string;
  email?: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
}

export const CtaSection: React.FC<SectionProps> = ({ data, headlineScale }) => {
  const d = data as CtaData;
  const [main, period] = d.title.endsWith('.') ? [d.title.slice(0, -1), '.'] : [d.title, ''];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '48px 0' }}>
      <h2 style={{
        fontSize: 'clamp(48px, 7vw, 96px)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.0,
        color: 'var(--text-primary)',
        marginBottom: '24px',
      }}>
        {main}
        {period && <span style={{ color: 'var(--accent-primary)' }}>{period}</span>}
      </h2>
      {d.description && (
        <p style={{ fontSize: 'clamp(16px, 1.6vw, 22px)', color: 'var(--text-secondary)', maxWidth: '720px', marginBottom: '32px' }}>
          {d.description}
        </p>
      )}
      {d.primaryActionUrl && (
        <a
          href={d.primaryActionUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            textDecoration: 'none',
            fontSize: '14px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {d.primaryActionLabel || 'Get in touch'} →
        </a>
      )}
      {d.email && !d.primaryActionUrl && (
        <a href={`mailto:${d.email}`} style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)', textDecoration: 'none' }}>
          {d.email}
        </a>
      )}
    </div>
  );
};
