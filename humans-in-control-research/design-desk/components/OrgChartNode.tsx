import React from 'react';
import { Handle, Position } from 'reactflow';
import type { DesignTokens } from '../services/designMdLoader';
import type { BrandHashtag } from '../services/hashtagParser';
import { paletteFor } from '../services/brandPalette';

// Minimalistic flat NXT iconography - inline SVGs, NO external icon library.
const icons = {
    person: (color: string) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="6" r="3" stroke={color} strokeWidth="1.5" />
            <path d="M3 17c0-3.5 3-6 7-6s7 2.5 7 6" stroke={color} strokeWidth="1.5" />
        </svg>
    ),
    vacant: (color: string) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="6" r="3" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M3 17c0-3.5 3-6 7-6s7 2.5 7 6" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
    ),
    team: (color: string) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="6" cy="7" r="2.5" stroke={color} strokeWidth="1.5" />
            <circle cx="14" cy="7" r="2.5" stroke={color} strokeWidth="1.5" />
            <path d="M2 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke={color} strokeWidth="1.5" />
            <path d="M10 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke={color} strokeWidth="1.5" />
        </svg>
    ),
    external: (color: string) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="14" height="14" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M7 10l3 3 5-5" stroke={color} strokeWidth="1.5" fill="none" />
        </svg>
    ),
};

export interface OrgChartNodeData {
    name: string;
    title: string;
    department?: string;
    iconKey: 'person' | 'vacant' | 'team' | 'external';
    tokens: DesignTokens;
    brand: BrandHashtag;
}

export const OrgChartNode: React.FC<{ data: OrgChartNodeData }> = ({ data }) => {
    // 2026-10-01 - paletteFor resolves DESIGN.md first, then the brands.ts token set, so the
    // DECIEM brand (absent from DESIGN.md) paints its own ink + pink accent instead of NXT's.
    const palette = paletteFor(data.tokens, data.brand);
    const primary = palette.primary ?? '#0D0D0D';
    const accent = palette.accent ?? '#B8B800';
    const iconColor = data.iconKey === 'vacant' ? '#999' : primary;

    return (
        <div style={{
            background: '#FFFFFF',
            color: primary,
            border: `1px solid ${primary}`,
            borderLeft: `4px solid ${accent}`,
            padding: '10px 14px',
            minWidth: 180,
            maxWidth: 240,
            fontFamily: "'Archivo', sans-serif",
            borderRadius: 2,
        }}>
            <Handle type="target" position={Position.Top} style={{ background: primary, width: 6, height: 6, border: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {icons[data.iconKey](iconColor)}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: data.iconKey === 'vacant' ? '#999' : primary,
                        fontStyle: data.iconKey === 'vacant' ? 'italic' : 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>{data.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#444', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.title}</div>
                    {data.department && (
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: accent, marginTop: 3 }}>
                            {data.department}
                        </div>
                    )}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: primary, width: 6, height: 6, border: 'none' }} />
        </div>
    );
};
