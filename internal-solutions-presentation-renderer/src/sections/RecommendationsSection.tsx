import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card, Pill, meaningful } from './_primitives';

// 2026-05-04 — Field-name tolerance per composer model variation:
//   actionTitle  ← title
//   rationale    ← description / outcome
//   supportingActions[]  ← actions[] / steps[]
interface Recommendation {
  actionTitle?: string;
  title?: string;
  rationale?: string;
  description?: string;
  outcome?: string;
  supportingActions?: string[];
  actions?: string[];
  steps?: string[];
  impactMetric?: string;
  timeframe?: string;
  owner?: string;
  implication?: string;
  evidence?: Array<{ sourceName?: string } | string>;
}
interface RecsData {
  recommendations?: Recommendation[];
  // GPT-5.5 emits `items` instead of `recommendations`. Accept both.
  items?: Recommendation[];
}

export const RecommendationsSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as RecsData;
  // Defensive normalization: accept either field name, fall back to []
  const recs: Recommendation[] = Array.isArray(d.recommendations)
    ? d.recommendations
    : Array.isArray(d.items)
      ? d.items
      : [];
  return (
    <div>
      <SectionLabel icon="recommendations">Section {String(index + 1).padStart(2, '0')} · Coherent Actions</SectionLabel>
      <SectionTitle scale={headlineScale}>What to do.</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '32px' }}>
        {recs.map((r, i) => {
          // Tolerant field resolution per recommendation, with placeholder stripping
          // so missing fields render as truly empty rather than showing
          // "Action 01: TBD" / "Owner: Not specified" etc.
          const titleText = meaningful(r.actionTitle) || meaningful(r.title) || `Action ${i + 1}`;
          const rationaleText = meaningful(r.rationale) || meaningful(r.description) || meaningful(r.outcome);
          const subActions: string[] = (Array.isArray(r.supportingActions)
            ? r.supportingActions
            : Array.isArray(r.actions)
              ? r.actions
              : Array.isArray(r.steps)
                ? r.steps
                : []).map(meaningful).filter(Boolean);
          const impactMetric = meaningful(r.impactMetric);
          const timeframe = meaningful(r.timeframe);
          const owner = meaningful(r.owner);
          const implication = meaningful(r.implication);
          return (
          <Card key={i} accent={i < 2}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '8px' }}>
                  Action {String(i + 1).padStart(2, '0')}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '12px', lineHeight: 1.3 }}>
                  {titleText}
                </h3>
                {rationaleText && (
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {rationaleText}
                  </p>
                )}
                {subActions.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {subActions.slice(0, 6).map((sa, j) => (
                      <li key={j} style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '16px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: 'var(--accent-primary)' }}>→</span>
                        {sa}
                      </li>
                    ))}
                  </ul>
                )}
                {implication && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-secondary)', fontStyle: 'italic', marginTop: '12px' }}>
                    Implication: {implication}
                  </div>
                )}
              </div>
              <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {impactMetric && <KvPill label="Impact" value={impactMetric} />}
                {timeframe && <KvPill label="When" value={timeframe} />}
                {owner && <KvPill label="Owner" value={owner} />}
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
};

const KvPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
    <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
  </div>
);
