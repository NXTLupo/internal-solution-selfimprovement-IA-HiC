import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle } from './_primitives';

interface Stage {
  phase?: string;
  duration?: string;
  emotion?: string;
  customerAction?: string;
  frontstage?: string;
  backstage?: string;
  support?: string;
  painPoint?: string;
  failPoint?: string;
}
interface JourneyData {
  stages: Stage[];
}

export const JourneySection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as JourneyData;
  const stages = d.stages || [];
  return (
    <div>
      <SectionLabel icon="journey">Section {String(index + 1).padStart(2, '0')} · Service Blueprint</SectionLabel>
      <SectionTitle scale={headlineScale}>The journey.</SectionTitle>
      <div style={{ overflowX: 'auto', marginTop: '32px', paddingBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))`, gap: '12px' }}>
          {stages.map((s, i) => (
            <div key={i} style={{
              padding: '20px',
              backgroundColor: 'var(--card-bg)',
              border: `1px solid ${s.failPoint ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
              borderTop: '3px solid var(--accent-primary)',
            }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '6px' }}>
                Step {String(i + 1).padStart(2, '0')}
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{s.phase || s.customerAction || `Stage ${i + 1}`}</h4>
              {s.duration && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{s.duration}</div>}
              {s.emotion && (
                <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>{s.emotion}</div>
              )}
              {s.customerAction && <BlueprintRow label="Customer" value={s.customerAction} />}
              {s.frontstage && <BlueprintRow label="Frontstage" value={s.frontstage} />}
              {s.backstage && <BlueprintRow label="Backstage" value={s.backstage} />}
              {s.support && <BlueprintRow label="Support" value={s.support} />}
              {(s.painPoint || s.failPoint) && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  borderLeft: '2px solid var(--accent-primary)',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'rgba(255,0,0,0.06)',
                }}>
                  {s.failPoint ? <strong>Fail point: </strong> : <strong>Pain: </strong>}
                  {s.failPoint || s.painPoint}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BlueprintRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{value}</div>
  </div>
);
