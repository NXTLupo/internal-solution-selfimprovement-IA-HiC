import React from 'react';
import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { DesignTokens } from '../services/designMdLoader';
import { paletteFor } from '../services/brandPalette';

interface Props {
    artifact: PersonaArtifact;
    tokens: DesignTokens;
    onFieldEdit?: (field: keyof PersonaArtifact, value: any) => void;
}

export const NxtDocViewer: React.FC<Props> = ({ artifact, tokens, onFieldEdit }) => {
    const palette = paletteFor(tokens, artifact.brand);
    const primary = palette.primary;
    const accent = palette.accent;
    const panel = palette.panel ?? '#FAFAFA';

    const handleEdit = (field: keyof PersonaArtifact, value: any) => {
        onFieldEdit?.(field, value);
    };

    return (
        <div
            data-artifact-id={artifact.id}
            data-artifact-type="persona"
            style={{
                background: '#FFFFFF',
                color: primary,
                fontFamily: "'Archivo', sans-serif",
                padding: 40,
                maxWidth: 960,
                margin: '0 auto',
                borderLeft: `4px solid ${accent}`,
                minHeight: '100%',
            }}
        >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: accent }}>
                PERSONA / {artifact.brand.toUpperCase()}
            </div>

            <h1
                contentEditable={!!onFieldEdit}
                suppressContentEditableWarning
                onBlur={e => handleEdit('name', e.currentTarget.textContent || artifact.name)}
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', letterSpacing: '0.02em', margin: '8px 0', color: primary }}
            >
                {artifact.name}
            </h1>

            <div
                contentEditable={!!onFieldEdit}
                suppressContentEditableWarning
                onBlur={e => handleEdit('role', e.currentTarget.textContent || artifact.role)}
                style={{ fontSize: 18, fontWeight: 600, marginBottom: 32, color: '#444' }}
            >
                {artifact.role}
            </div>

            <Section title="Jobs to Be Done" accent={accent}>
                <p
                    contentEditable={!!onFieldEdit}
                    suppressContentEditableWarning
                    onBlur={e => handleEdit('jtbd', e.currentTarget.textContent || artifact.jtbd)}
                    style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}
                >
                    {artifact.jtbd}
                </p>
            </Section>

            <Section title="Goals" accent={accent}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {artifact.goals.map((g, i) => (
                        <li key={i} style={{ marginBottom: 8, lineHeight: 1.5 }}>{g}</li>
                    ))}
                </ul>
            </Section>

            <Section title="Pain Points" accent={accent}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {(Array.isArray(artifact.painPoints) ? artifact.painPoints : []).map((p, i) => (
                        <li key={i} style={{ marginBottom: 8, lineHeight: 1.5, color: '#CC6644' }}>{p}</li>
                    ))}
                </ul>
            </Section>

            {artifact.quotes.length > 0 && (
                <Section title="In Their Own Words" accent={accent}>
                    {artifact.quotes.map((q, i) => (
                        <blockquote key={i} style={{
                            borderLeft: `3px solid ${accent}`,
                            padding: '8px 16px',
                            margin: '12px 0',
                            background: panel,
                            fontStyle: 'italic',
                        }}>
                            <div style={{ fontSize: 15 }}>"{q.text}"</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 6, color: '#666' }}>
                                {'-'} {q.source}
                            </div>
                        </blockquote>
                    ))}
                </Section>
            )}

            {artifact.citations.length > 0 && (
                <Section title="Citations" accent={accent}>
                    <ul style={{ paddingLeft: 20, margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {artifact.citations.map((c, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                                <strong>{c.label}</strong> {'-'} {c.source}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
};

const Section: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
    <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
            {title}
        </div>
        {children}
    </div>
);
