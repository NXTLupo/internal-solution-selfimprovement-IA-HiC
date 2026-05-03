import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card } from './_primitives';

interface Member { name?: string; role: string; description: string; focus?: string; imageUrl?: string }
interface TeamData { members: Member[] }

export const TeamSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as TeamData;
  const cols = Math.min(d.members.length, 3);
  return (
    <div>
      <SectionLabel icon="team">Section {String(index + 1).padStart(2, '0')} · Team</SectionLabel>
      <SectionTitle scale={headlineScale}>Who's behind this.</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '20px', marginTop: '32px' }}>
        {d.members.map((m, i) => (
          <Card key={i}>
            <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '6px' }}>{m.role}</div>
            {m.name && <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>{m.name}</div>}
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{m.description}</p>
            {m.focus && <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--accent-secondary)', fontStyle: 'italic' }}>Focus: {m.focus}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
};
