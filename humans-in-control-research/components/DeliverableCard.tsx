/**
 * DeliverableCard — Inspectable, approvable tiles for chat-generated research artifacts.
 *
 * When the AI generates a deliverable (theme, persona, recommendation, journey stage, etc.)
 * through conversation, it renders as a styled card the user can:
 * - Expand to inspect full detail
 * - Approve (commits to knowledge graph + saved state)
 * - Reject (discarded, AI can regenerate)
 * - Edit inline before approving
 *
 * The card renders differently based on deliverable type, using NXT design system styling.
 */

import React, { useState, useRef } from 'react';

// --- Deliverable Types ---

export type DeliverableType =
    | 'theme' | 'persona' | 'recommendation' | 'journey_stage'
    | 'prd_feature' | 'roadmap_item' | 'gap' | 'tech_node'
    | 'competitive_peer' | 'tech_audit_system';

export interface DeliverableItem {
    id: string;
    type: DeliverableType;
    data: any;
    status: 'pending' | 'approved' | 'rejected';
    model?: string;
    timestamp: number;
}

// --- Type Colors & Labels ---

const TYPE_CONFIG: Record<DeliverableType, { label: string; color: string; icon: string }> = {
    theme:            { label: 'THEME',           color: '#B8B800', icon: 'T' },
    persona:          { label: 'PERSONA',         color: '#CC6644', icon: 'P' },
    recommendation:   { label: 'RECOMMENDATION',  color: '#B8B800', icon: 'R' },
    journey_stage:    { label: 'JOURNEY STAGE',   color: '#00B7C3', icon: 'J' },
    prd_feature:      { label: 'PRD FEATURE',     color: '#115054', icon: 'F' },
    roadmap_item:     { label: 'ROADMAP ITEM',    color: '#1A5C5E', icon: 'M' },
    gap:              { label: 'CAPABILITY GAP',   color: '#CC3333', icon: 'G' },
    tech_node:        { label: 'TECH NODE',       color: '#666666', icon: 'A' },
    competitive_peer: { label: 'COMPETITOR',      color: '#444444', icon: 'C' },
    tech_audit_system:{ label: 'SYSTEM',          color: '#999999', icon: 'S' },
};

// --- Card Renderers by Type ---

function renderThemeDetail(data: any) {
    return (
        <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D0D', marginBottom: 6 }}>{data.name}</div>
            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6, marginBottom: 8 }}>{data.description}</p>
            {data.quote && (
                <div style={{ borderLeft: '3px solid #B8B800', paddingLeft: 12, marginBottom: 8, fontStyle: 'italic', fontSize: 12, color: '#555' }}>
                    "{data.quote}"
                </div>
            )}
            {data.citations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {data.citations.map((c: any, i: number) => (
                        <span key={i} style={{ fontSize: 9, background: '#E8F4F5', color: '#115054', padding: '2px 6px', fontWeight: 600 }}>
                            {c.sourceName || c.sourceFile || 'Source'}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function renderPersonaDetail(data: any) {
    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {data.imageUrl && <img src={data.imageUrl} alt={data.name} style={{ width: 56, height: 56, objectFit: 'cover', filter: 'grayscale(100%)' }} />}
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D0D' }}>{data.name}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{data.role}</div>
                    {data.quote && <div style={{ fontSize: 11, fontStyle: 'italic', color: '#555', marginTop: 4 }}>"{data.quote}"</div>}
                </div>
            </div>
            {data.jtbd && <div style={{ fontSize: 11, color: '#333', marginTop: 8, background: '#F5F5F0', padding: '6px 10px' }}>JTBD: {data.jtbd}</div>}
            {data.painPoints?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#CC6644', marginBottom: 4 }}>PAIN POINTS</div>
                    {data.painPoints.map((pp: any, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: '#444', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #E0E0E0' }}>
                            <strong>{pp.label}:</strong> "{pp.quote}" <span style={{ fontSize: 9, color: '#999' }}>({pp.source || pp.citation?.sourceName || ''})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function renderRecommendationDetail(data: any) {
    return (
        <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D', marginBottom: 4 }}>{data.title}</div>
            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6, marginBottom: 6 }}>{data.description}</p>
            {data.impactLevel && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', background: data.impactLevel === 'critical' ? '#CC3333' : data.impactLevel === 'high' ? '#CC6644' : '#B8B800', color: data.impactLevel === 'critical' || data.impactLevel === 'high' ? '#FFF' : '#0D0D0D', padding: '2px 8px' }}>{data.impactLevel.toUpperCase()}</span>}
            {data.evidenceBasis && <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontStyle: 'italic' }}>{data.evidenceBasis}</div>}
            {data.citations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {data.citations.map((c: string, i: number) => (
                        <span key={i} style={{ fontSize: 9, background: '#E8F4F5', color: '#115054', padding: '2px 6px', fontWeight: 600 }}>{c}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

function renderGenericDetail(data: any, type: DeliverableType) {
    const label = TYPE_CONFIG[type]?.label || type;
    const fields = Object.entries(data).filter(([k, v]) => typeof v === 'string' || typeof v === 'number');
    const arrays = Object.entries(data).filter(([k, v]) => Array.isArray(v));
    return (
        <div>
            {fields.map(([key, val]) => (
                <div key={key} style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', color: '#999', textTransform: 'uppercase' }}>{key}: </span>
                    <span style={{ fontSize: 12, color: '#333' }}>{String(val)}</span>
                </div>
            ))}
            {arrays.map(([key, arr]) => (
                <div key={key} style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', color: '#999', textTransform: 'uppercase', marginBottom: 2 }}>{key}</div>
                    {(arr as any[]).slice(0, 5).map((item: any, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: '#555', paddingLeft: 8, borderLeft: '2px solid #E0E0E0', marginBottom: 2 }}>
                            {typeof item === 'string' ? item : JSON.stringify(item).substring(0, 100)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// --- Main Card Component ---

// --- Export Utilities ---

async function exportCardAsImage(cardEl: HTMLElement, filename: string) {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardEl, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true });
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function exportCardAsPDF(cardEl: HTMLElement, filename: string) {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const canvas = await html2canvas(cardEl, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${filename}.pdf`);
}

async function exportCardAsPPTX(item: DeliverableItem) {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';
    const slide = pptx.addSlide();
    const config = TYPE_CONFIG[item.type];

    // Title bar
    slide.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: '0D0D0D' } });
    slide.addText(config.label, { x: 0.5, y: 0.15, w: 5, h: 0.3, fontSize: 10, color: 'B8B800', fontFace: 'Arial', bold: true });
    slide.addText(item.data.name || item.data.title || '', { x: 0.5, y: 0.4, w: 12, h: 0.5, fontSize: 22, color: 'FFFFFF', fontFace: 'Arial', bold: true });

    // Body content
    const bodyLines: string[] = [];
    if (item.data.description) bodyLines.push(item.data.description);
    if (item.data.quote) bodyLines.push(`"${item.data.quote}"`);
    if (item.data.bio) bodyLines.push(item.data.bio);
    if (item.data.jtbd) bodyLines.push(`JTBD: ${item.data.jtbd}`);
    if (item.data.evidenceBasis) bodyLines.push(`Evidence: ${item.data.evidenceBasis}`);
    if (item.data.painPoints) {
        for (const pp of item.data.painPoints.slice(0, 4)) {
            bodyLines.push(`${pp.label}: "${pp.quote}" (${pp.source || ''})`);
        }
    }

    slide.addText(bodyLines.join('\n\n'), { x: 0.5, y: 1.3, w: 12.3, h: 5.5, fontSize: 12, color: '333333', fontFace: 'Arial', valign: 'top', paraSpaceAfter: 6 });

    // Citations footer
    const citations = item.data.citations?.map((c: any) => typeof c === 'string' ? c : c.sourceName || '').filter(Boolean).join(' | ') || '';
    if (citations) {
        slide.addText(`Sources: ${citations}`, { x: 0.5, y: 6.9, w: 12.3, h: 0.4, fontSize: 8, color: '999999', fontFace: 'Arial' });
    }

    pptx.writeFile({ fileName: `${(item.data.name || item.type).replace(/[^a-zA-Z0-9]/g, '_')}.pptx` });
}

interface Props {
    item: DeliverableItem;
    onApprove: (item: DeliverableItem) => void;
    onReject: (item: DeliverableItem) => void;
    onEdit?: (item: DeliverableItem, newData: any) => void;
}

export const DeliverableCard: React.FC<Props> = ({ item, onApprove, onReject, onEdit }) => {
    const [expanded, setExpanded] = useState(false);
    const [exporting, setExporting] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const config = TYPE_CONFIG[item.type] || { label: item.type, color: '#666', icon: '?' };

    const renderDetail = () => {
        switch (item.type) {
            case 'theme': return renderThemeDetail(item.data);
            case 'persona': return renderPersonaDetail(item.data);
            case 'recommendation': return renderRecommendationDetail(item.data);
            default: return renderGenericDetail(item.data, item.type);
        }
    };

    const statusBg = item.status === 'approved' ? '#F0F8F0' : item.status === 'rejected' ? '#FFF0F0' : '#FFFFFF';
    const statusBorder = item.status === 'approved' ? '#4CAF50' : item.status === 'rejected' ? '#CC3333' : config.color;

    const filename = (item.data.name || item.data.title || item.type).replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').substring(0, 40);

    return (
        <div ref={cardRef} style={{
            border: `1px solid ${item.status === 'pending' ? '#E0E0E0' : statusBorder}`,
            borderLeft: `4px solid ${statusBorder}`,
            background: statusBg,
            margin: '8px 0',
            fontFamily: "'Archivo', sans-serif",
            transition: 'all 0.15s',
        }}>
            {/* Header — always visible */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    cursor: 'pointer', userSelect: 'none',
                }}
            >
                {/* Type badge */}
                <div style={{
                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: config.color, color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 13, fontWeight: 400, letterSpacing: '0.5px',
                }}>
                    {config.icon}
                </div>

                {/* Title */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', color: config.color }}>
                        {config.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0D0D', marginTop: 1 }}>
                        {item.data.name || item.data.title || item.data.phase || item.data.capability || JSON.stringify(item.data).substring(0, 60)}
                    </div>
                </div>

                {/* Status */}
                {item.status !== 'pending' && (
                    <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: '1px', padding: '2px 8px',
                        background: item.status === 'approved' ? '#4CAF50' : '#CC3333',
                        color: '#FFFFFF',
                    }}>
                        {item.status.toUpperCase()}
                    </span>
                )}

                {/* Expand indicator */}
                <span style={{ fontSize: 14, color: '#BBB', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                    &rsaquo;
                </span>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div style={{ padding: '0 14px 14px 48px' }}>
                    {renderDetail()}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 8, borderTop: '1px solid #E8E8E8', flexWrap: 'wrap' }}>
                        {item.status === 'pending' && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onApprove(item); }}
                                    style={{ padding: '6px 16px', background: '#B8B800', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                                    Approve</button>
                                <button onClick={(e) => { e.stopPropagation(); onReject(item); }}
                                    style={{ padding: '6px 16px', background: 'none', color: '#CC3333', border: '1px solid #CC3333', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                                    Reject</button>
                            </>
                        )}
                        <div style={{ flex: 1 }} />
                        {/* Export options */}
                        <button onClick={async (e) => { e.stopPropagation(); if (cardRef.current) { setExporting(true); await exportCardAsImage(cardRef.current, filename); setExporting(false); } }}
                            disabled={exporting}
                            style={{ padding: '4px 10px', background: 'none', color: '#666', border: '1px solid #DDD', fontWeight: 700, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
                            PNG</button>
                        <button onClick={async (e) => { e.stopPropagation(); if (cardRef.current) { setExporting(true); await exportCardAsPDF(cardRef.current, filename); setExporting(false); } }}
                            disabled={exporting}
                            style={{ padding: '4px 10px', background: 'none', color: '#666', border: '1px solid #DDD', fontWeight: 700, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
                            PDF</button>
                        <button onClick={async (e) => { e.stopPropagation(); setExporting(true); await exportCardAsPPTX(item); setExporting(false); }}
                            disabled={exporting}
                            style={{ padding: '4px 10px', background: 'none', color: '#666', border: '1px solid #DDD', fontWeight: 700, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
                            PPTX</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Batch Card: renders a set of deliverables (e.g., "here are 5 themes") ---

interface BatchProps {
    items: DeliverableItem[];
    onApprove: (item: DeliverableItem) => void;
    onReject: (item: DeliverableItem) => void;
    onApproveAll: (items: DeliverableItem[]) => void;
}

export const DeliverableBatch: React.FC<BatchProps> = ({ items, onApprove, onReject, onApproveAll }) => {
    const pending = items.filter(i => i.status === 'pending');
    const approved = items.filter(i => i.status === 'approved');
    const config = items.length > 0 ? TYPE_CONFIG[items[0].type] : { label: 'ITEMS', color: '#666', icon: '?' };

    return (
        <div style={{
            border: '1px solid #E0E0E0',
            margin: '12px 0',
            fontFamily: "'Archivo', sans-serif",
        }}>
            {/* Batch header */}
            <div style={{
                padding: '10px 14px', background: '#0D0D0D',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: config.color }}>
                        {config.label}S
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>
                        {items.length} generated | {approved.length} approved | {pending.length} pending
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {pending.length > 0 && (
                        <button onClick={() => onApproveAll(pending)}
                            style={{ padding: '4px 12px', background: '#B8B800', color: '#0D0D0D', border: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                            Approve All ({pending.length})</button>
                    )}
                    <button onClick={async () => {
                        const PptxGenJS = (await import('pptxgenjs')).default;
                        const pptx = new PptxGenJS();
                        pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
                        pptx.layout = 'WIDE';
                        for (const item of items) { await exportCardAsPPTX(item); }
                    }} style={{ padding: '4px 10px', background: 'none', color: '#B8B800', border: '1px solid #555', fontWeight: 700, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
                        Export PPTX</button>
                </div>
            </div>

            {/* Individual cards */}
            <div style={{ padding: '4px 8px' }}>
                {items.map(item => (
                    <DeliverableCard
                        key={item.id}
                        item={item}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                ))}
            </div>
        </div>
    );
};

export default DeliverableCard;
