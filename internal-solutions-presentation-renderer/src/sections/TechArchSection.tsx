import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card } from './_primitives';

interface Node { name: string; description?: string; status?: string }
interface Layer { name: string; nodes: Node[] }
interface ArchData { layers: Layer[] }

export const TechArchSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as ArchData;
  return (
    <div>
      <SectionLabel icon="tech_arch">Section {String(index + 1).padStart(2, '0')} · Architecture</SectionLabel>
      <SectionTitle scale={headlineScale}>How it fits.</SectionTitle>
      <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {d.layers.map((layer, i) => (
          <div key={i}>
            <div style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: i === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              fontWeight: 700,
              marginBottom: '12px',
            }}>{layer.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {(layer.nodes || []).map((n, j) => (
                <Card key={j} style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{n.name}</div>
                  {n.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.description}</div>}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
