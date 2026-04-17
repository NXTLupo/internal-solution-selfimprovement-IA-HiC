/**
 * NXT Output Renderer — Parses :::nxt:TYPE blocks from AI responses
 * and renders them as NXT Design System styled React components.
 *
 * Block protocol:
 *   :::nxt:stat-row
 *   [{"value":"41%","label":"at CX Maturity Level 1","source":"Gartner, 2025"}]
 *   :::
 *
 * Non-block text is returned as-is for the parent to render with citation parsing.
 */

import React from 'react';

// --- Block Types ---

interface StatItem { value: string; label: string; source: string; }
interface EvidenceData { text: string; source: string; }
interface RecommendationData { title: string; body: string; }
interface SplitPanelData { analysisTitle: string; analysisContent: string; evidenceTitle: string; evidenceContent: string; }
interface SectionDividerData { number: string; title: string; overflowText?: string; }
interface GridMatrixData { headers: string[]; rows: string[][]; }
interface ColorBlockItem { title: string; body: string; bg: 'black' | 'chartreuse' | 'teal' | 'panel'; }
interface QuoteData { quote: string; attribution: string; }
interface ComparisonData { headers: string[]; rows: string[][]; highlightCol?: number; }
interface WarningData { label: string; text: string; }

export type NxtBlockType =
    | 'stat-row' | 'evidence-block' | 'recommendation' | 'split-panel'
    | 'section-divider' | 'grid-matrix' | 'color-block-grid' | 'quote-block'
    | 'comparison-table' | 'warning-block' | 'full-html';

export interface NxtBlock {
    type: NxtBlockType;
    raw: string;
    data: any;
}

export interface ParsedSegment {
    type: 'text' | 'nxt-block';
    content: string;
    block?: NxtBlock;
}

// --- Parser ---

const BLOCK_PATTERN = /:::nxt:(\S+)\n([\s\S]*?):::/g;

export function parseNxtBlocks(text: string): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    let lastIndex = 0;
    let match;

    while ((match = BLOCK_PATTERN.exec(text)) !== null) {
        // Text before the block
        if (match.index > lastIndex) {
            const textBefore = text.substring(lastIndex, match.index).trim();
            if (textBefore) segments.push({ type: 'text', content: textBefore });
        }

        const blockType = match[1] as NxtBlockType;
        const raw = match[2].trim();

        let data: any = raw;
        if (blockType !== 'full-html') {
            try { data = JSON.parse(raw); }
            catch { data = raw; }
        }

        segments.push({
            type: 'nxt-block',
            content: match[0],
            block: { type: blockType, raw, data },
        });

        lastIndex = match.index + match[0].length;
    }

    // Detect markdown tables in remaining text and convert to NXT grid-matrix
    // Pattern: lines starting with | that have at least 2 columns
    const tablePattern = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/gm;

    // Re-process text segments to find markdown tables
    const finalSegments: ParsedSegment[] = [];
    for (const seg of segments) {
        if (seg.type !== 'text') {
            finalSegments.push(seg);
            continue;
        }
        let segText = seg.content;
        let segLastIndex = 0;
        let tableMatch;
        const tblPattern = /(?:^|\n)((?:\|[^\n]+\|[ \t]*\n?){2,})/gm;
        let hasTable = false;

        while ((tableMatch = tblPattern.exec(segText)) !== null) {
            hasTable = true;
            // Text before the table
            if (tableMatch.index > segLastIndex) {
                const before = segText.substring(segLastIndex, tableMatch.index).trim();
                if (before) finalSegments.push({ type: 'text', content: before });
            }
            // Parse the markdown table
            const tableLines = tableMatch[1].trim().split('\n').filter(l => l.trim().startsWith('|'));
            if (tableLines.length >= 2) {
                const parseRow = (line: string) => line.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/));
                const headers = parseRow(tableLines[0]);
                // Skip separator line (|---|---|)
                const startRow = tableLines[1].includes('---') ? 2 : 1;
                const rows = tableLines.slice(startRow).map(parseRow).filter(r => r.length > 0);

                if (headers.length > 0 && rows.length > 0) {
                    finalSegments.push({
                        type: 'nxt-block',
                        content: tableMatch[0],
                        block: { type: 'grid-matrix', raw: JSON.stringify({ headers, rows }), data: { headers, rows } },
                    });
                }
            }
            segLastIndex = tableMatch.index + tableMatch[0].length;
        }

        if (hasTable) {
            if (segLastIndex < segText.length) {
                const after = segText.substring(segLastIndex).trim();
                if (after) finalSegments.push({ type: 'text', content: after });
            }
        } else {
            finalSegments.push(seg);
        }
    }

    if (finalSegments.length > 0) return finalSegments;

    // Remaining text after last block
    if (lastIndex < text.length) {
        const remaining = text.substring(lastIndex).trim();
        if (remaining) segments.push({ type: 'text', content: remaining });
    }

    // No blocks found — return entire text
    if (segments.length === 0) {
        segments.push({ type: 'text', content: text });
    }

    return segments;
}

// --- Renderers ---

function StatRow({ items }: { items: StatItem[] }) {
    return (
        <div className="nxt-stat-row" data-cols={Math.min(items.length, 4)}>
            {items.map((item, i) => (
                <div key={i} className="nxt-stat-item">
                    <div className="nxt-stat-value">{item.value}</div>
                    <div className="nxt-stat-label">{item.label}</div>
                    <div className="nxt-stat-source">Source: {item.source}</div>
                </div>
            ))}
        </div>
    );
}

function EvidenceBlock({ data }: { data: EvidenceData }) {
    if (!data) return null;
    return (
        <div className="nxt-evidence-block">
            <p>{data.text || ''}</p>
            <div className="nxt-source">Source: {data.source || 'Unknown'}</div>
        </div>
    );
}

function Recommendation({ data }: { data: RecommendationData }) {
    if (!data) return null;
    return (
        <div className="nxt-recommendation">
            <div className="nxt-rec-title">{data.title || ''}</div>
            <div className="nxt-rec-body">{data.body || ''}</div>
        </div>
    );
}

function SplitPanel({ data }: { data: SplitPanelData }) {
    if (!data) return null;
    return (
        <div className="nxt-split-panel">
            <div className="nxt-split-analysis">
                <h3>{data.analysisTitle || ''}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--nxt-body)', lineHeight: 1.65 }}>{data.analysisContent}</p>
            </div>
            <div className="nxt-split-evidence">
                <h3>{data.evidenceTitle}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--nxt-secondary)', lineHeight: 1.65 }}>{data.evidenceContent}</p>
            </div>
        </div>
    );
}

function SectionDivider({ data }: { data: SectionDividerData }) {
    if (!data) return null;
    return (
        <div className="nxt-section-divider">
            {data.overflowText && <div className="nxt-overflow-type">{data.overflowText}</div>}
            <div className="nxt-section-num">SECTION {data.number || ''}</div>
            <div className="nxt-section-title">{data.title || ''}</div>
        </div>
    );
}

function GridMatrix({ data }: { data: GridMatrixData }) {
    if (!data || !data.headers) return null;
    return (
        <table className="nxt-grid-matrix">
            <thead>
                <tr>{data.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
                {data.rows.map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                ))}
            </tbody>
        </table>
    );
}

function ColorBlockGrid({ items }: { items: ColorBlockItem[] }) {
    const bgMap: Record<string, string> = {
        black: 'nxt-bg-black',
        chartreuse: 'nxt-bg-chartreuse',
        teal: 'nxt-bg-teal',
        panel: 'nxt-bg-panel',
    };
    return (
        <div className="nxt-color-block-grid">
            {items.map((item, i) => (
                <div key={i} className={`nxt-color-block ${bgMap[item.bg] || 'nxt-bg-panel'}`}>
                    <h4>{item.title}</h4>
                    <p>{item.body}</p>
                </div>
            ))}
        </div>
    );
}

function QuoteBlock({ data }: { data: QuoteData }) {
    if (!data) return null;
    return (
        <div className="nxt-quote-block">
            <div className="nxt-quote-text">"{data.quote || ''}"</div>
            <div className="nxt-quote-attribution">{data.attribution || ''}</div>
        </div>
    );
}

function ComparisonTable({ data }: { data: ComparisonData }) {
    if (!data || !data.headers) return null;
    return (
        <table className="nxt-comparison-table">
            <thead>
                <tr>{data.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
                {data.rows.map((row, ri) => (
                    <tr key={ri}>
                        {row.map((cell, ci) => (
                            <td key={ci} className={ci === data.highlightCol ? 'nxt-highlight' : ''}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function WarningBlock({ data }: { data: WarningData }) {
    if (!data) return null;
    return (
        <div className="nxt-warning-block">
            <div className="nxt-warning-label">{data.label || ''}</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--nxt-body)' }}>{data.text || ''}</p>
        </div>
    );
}

function FullHtml({ html }: { html: string }) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// --- Main Renderer ---

interface NxtBlockRendererProps {
    block: NxtBlock;
    onPin?: (block: NxtBlock) => void;
    isPinned?: boolean;
}

export const NxtBlockRenderer: React.FC<NxtBlockRendererProps> = ({ block, onPin, isPinned }) => {
    // Guard: if block or data is missing, render nothing
    if (!block || block.data === undefined || block.data === null) {
        return null;
    }

    const d = block.data;
    const renderBlock = () => {
        switch (block.type) {
            case 'stat-row':
                return <StatRow items={Array.isArray(d) ? d : []} />;
            case 'evidence-block':
                return d.text ? <EvidenceBlock data={d} /> : null;
            case 'recommendation':
                return d.title ? <Recommendation data={d} /> : null;
            case 'split-panel':
                return d.analysisTitle ? <SplitPanel data={d} /> : null;
            case 'section-divider':
                return d.title ? <SectionDivider data={d} /> : null;
            case 'grid-matrix':
                return d.headers ? <GridMatrix data={d} /> : null;
            case 'color-block-grid':
                return <ColorBlockGrid items={Array.isArray(d) ? d : []} />;
            case 'quote-block':
                return d.quote ? <QuoteBlock data={d} /> : null;
            case 'comparison-table':
                return d.headers ? <ComparisonTable data={d} /> : null;
            case 'warning-block':
                return d.label ? <WarningBlock data={d} /> : null;
            case 'full-html':
                return <FullHtml html={typeof d === 'string' ? d : block.raw} />;
            default:
                return <pre style={{ fontSize: 11, color: '#888', background: '#F5F5F0', padding: 12 }}>{block.raw}</pre>;
        }
    };

    return (
        <div className="nxt-output-wrapper">
            {onPin && (
                <button
                    className={`nxt-pin-btn ${isPinned ? 'pinned' : ''}`}
                    onClick={() => onPin(block)}
                >
                    {isPinned ? 'PINNED' : 'PIN'}
                </button>
            )}
            {renderBlock()}
        </div>
    );
};

export default NxtBlockRenderer;
