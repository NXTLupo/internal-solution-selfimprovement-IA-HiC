import React from 'react';
import type { SectionProps } from './registry';
import { SectionLabel, SectionTitle, Card, CitationFooter } from './_primitives';

// Competitive / industry-landscape section. Same shape as tech_arch
// (layers + nodes) because the composer reasons in tiers — peer
// institutions, sector benchmarks, practitioner ground-truth, etc. —
// but framed as evidence tiers rather than system architecture.
//
// Each layer is one strata of external evidence (e.g., "Peer institutions
// rebuilding," "Sector benchmarks," "Reddit practitioner ground-truth").
// Each node inside a layer is a named source with a one-line takeaway.

interface Node {
  name: string;
  description?: string;
  status?: string;
  source?: string;
  url?: string;
}
interface Layer {
  name: string;
  nodes: Node[];
  signal?: string;
}
interface CompetitiveData {
  layers: Layer[];
  convergentInsight?: string;
}

const ACCENT_ROTATION = ['accent-primary', 'accent-secondary', 'accent-tertiary'];

export const CompetitiveSection: React.FC<SectionProps> = ({ data, headlineScale, index }) => {
  const d = data as CompetitiveData;
  const layers = Array.isArray(d?.layers) ? d.layers : [];
  const allSources = layers.flatMap(layer =>
    (layer.nodes || []).map(n => n.source || n.name).filter(Boolean) as string[]
  );

  return (
    <div>
      <SectionLabel icon="recommendations">
        Section {String(index + 1).padStart(2, '0')} · Competitive Landscape
      </SectionLabel>
      <SectionTitle scale={headlineScale}>What the field is doing.</SectionTitle>

      <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {layers.map((layer, i) => {
          const accent = ACCENT_ROTATION[i % ACCENT_ROTATION.length];
          return (
            <div key={i}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '16px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: `1px solid var(--border-secondary)`,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: `var(--${accent})`,
                    fontWeight: 700,
                    minWidth: '80px',
                  }}
                >
                  Tier {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {layer.name}
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                }}
              >
                {(layer.nodes || []).map((n, j) => (
                  <Card
                    key={j}
                    style={{
                      padding: '20px',
                      borderTop: `2px solid var(--${accent})`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {n.name}
                    </div>
                    {n.description && (
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {n.description}
                      </div>
                    )}
                    {n.source && n.source !== n.name && (
                      <div
                        style={{
                          marginTop: '10px',
                          fontSize: '10px',
                          fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {n.source}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              {layer.signal && (
                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '13px',
                    color: `var(--accent-secondary)`,
                    fontStyle: 'italic',
                  }}
                >
                  → {layer.signal}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {d.convergentInsight && (
        <div
          style={{
            marginTop: '32px',
            padding: '20px',
            borderLeft: '3px solid var(--accent-primary)',
            backgroundColor: 'var(--card-bg)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent-primary)',
              marginBottom: '8px',
            }}
          >
            What converges across tiers
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
            {d.convergentInsight}
          </p>
        </div>
      )}

      <CitationFooter sources={allSources} />
    </div>
  );
};
