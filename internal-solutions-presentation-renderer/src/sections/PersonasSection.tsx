import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card, Pill } from './_primitives';

interface Persona {
  name: string;
  role: string;
  demographics?: string;
  quote?: string;
  bio?: string;
  topGoal?: string;
  topPainPoint?: string;
  topMotivation?: string;
  evidenceConfidence?: 'EVIDENCED' | 'PARTIALLY_EVIDENCED' | 'HYPOTHESIS';
  imageUrl?: string;
}
interface PersonasData {
  personas: Persona[];
}

export const PersonasSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as PersonasData;
  const cols = Math.min(d.personas.length, 3);
  return (
    <div>
      <SectionLabel icon="personas">Section {String(index + 1).padStart(2, '0')} · The People</SectionLabel>
      <SectionTitle scale={headlineScale}>Who's affected.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '24px', marginTop: '32px' }}>
        {d.personas.map((p, i) => (
          <Card key={i} accent={i === 0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '4px' }}>{p.name}</h3>
                <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600 }}>{p.role}</div>
                {p.demographics && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{p.demographics}</div>}
              </div>
              {p.evidenceConfidence && (
                <Pill tone={p.evidenceConfidence === 'EVIDENCED' ? 'accent' : 'muted'}>
                  {p.evidenceConfidence === 'EVIDENCED' ? 'evidenced' : p.evidenceConfidence === 'HYPOTHESIS' ? 'hypothesis' : 'partial'}
                </Pill>
              )}
            </div>
            {p.quote && (
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontStyle: 'italic', borderLeft: '2px solid var(--accent-secondary)', paddingLeft: '12px', margin: '16px 0' }}>
                "{p.quote}"
              </p>
            )}
            {p.bio && <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '16px' }}>{p.bio}</p>}
            {p.topGoal && <PersonaRow label="Top goal" value={p.topGoal} />}
            {p.topPainPoint && <PersonaRow label="Pain point" value={p.topPainPoint} />}
            {p.topMotivation && <PersonaRow label="Motivation" value={p.topMotivation} />}
          </Card>
        ))}
      </div>
    </div>
  );
};

const PersonaRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{value}</div>
  </div>
);
