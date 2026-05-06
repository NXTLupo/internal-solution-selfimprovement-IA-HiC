import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, meaningful } from './_primitives';

// 2026-05-05 — Composer historically declared `failPoint` as a boolean, then
// changed to a string. We accept BOTH shapes here so old artifacts still
// render and the renderer never displays an empty "Fail point:" label with
// nothing after it.
//
// We also reject placeholder strings ("Not specified", "None identified",
// "N/A", "TBD", "true", etc.) so a stage without an evidenced fail point
// renders as a clean stage card rather than a broken-looking empty label.
interface Stage {
  phase?: string;
  duration?: string;
  emotion?: string;
  customerAction?: string;
  frontstage?: string;
  backstage?: string;
  support?: string;
  painPoint?: string;
  failPoint?: string | boolean;
}
interface JourneyData {
  stages: Stage[];
}

export const JourneySection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as JourneyData;
  const stages = Array.isArray(d?.stages) ? d.stages : [];
  if (stages.length === 0) return null;
  return (
    <div>
      <SectionLabel icon="journey">Section {String(index + 1).padStart(2, '0')} · Service Blueprint</SectionLabel>
      <SectionTitle scale={headlineScale}>The journey.</SectionTitle>
      <div style={{ overflowX: 'auto', marginTop: '32px', paddingBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))`, gap: '12px' }}>
          {stages.map((s, i) => {
            const phase = meaningful(s.phase) || meaningful(s.customerAction) || `Stage ${i + 1}`;
            const duration = meaningful(s.duration);
            const emotion = meaningful(s.emotion);
            const customer = meaningful(s.customerAction);
            const frontstage = meaningful(s.frontstage);
            const backstage = meaningful(s.backstage);
            const support = meaningful(s.support);
            const pain = meaningful(s.painPoint);
            const fail = meaningful(s.failPoint);
            const accentBorder = fail ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)';
            return (
              <div key={i} style={{
                padding: '20px',
                backgroundColor: 'var(--card-bg)',
                border: accentBorder,
                borderTop: '3px solid var(--accent-primary)',
              }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '6px' }}>
                  Step {String(i + 1).padStart(2, '0')}
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{phase}</h4>
                {duration && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{duration}</div>}
                {emotion && (
                  <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>{emotion}</div>
                )}
                {customer && <BlueprintRow label="Customer" value={customer} />}
                {frontstage && <BlueprintRow label="Frontstage" value={frontstage} />}
                {backstage && <BlueprintRow label="Backstage" value={backstage} />}
                {support && <BlueprintRow label="Support" value={support} />}
                {(pain || fail) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    borderLeft: '2px solid var(--accent-primary)',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'rgba(255,0,0,0.06)',
                  }}>
                    {fail
                      ? <><strong>Fail point: </strong>{fail}</>
                      : <><strong>Pain: </strong>{pain}</>
                    }
                  </div>
                )}
              </div>
            );
          })}
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
