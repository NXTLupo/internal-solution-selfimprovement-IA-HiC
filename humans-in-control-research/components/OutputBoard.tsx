/**
 * Output Board — Collects pinned NXT visual outputs for arrangement and export.
 *
 * Users pin outputs from the chat conversation, reorder them here,
 * add section dividers, and export as NXT-branded HTML, PDF, or PPTX.
 */

import React, { useState } from 'react';
import { NxtBlockRenderer, type NxtBlock } from './NxtOutputRenderer';

export interface PinnedOutput {
    id: string;
    block: NxtBlock;
    timestamp: number;
    model?: string;
    order: number;
}

interface Props {
    pinnedOutputs: PinnedOutput[];
    onReorder: (outputs: PinnedOutput[]) => void;
    onRemove: (id: string) => void;
    onAddDivider: () => void;
}

export const OutputBoard: React.FC<Props> = ({ pinnedOutputs, onReorder, onRemove, onAddDivider }) => {
    const [previewMode, setPreviewMode] = useState(false);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const items = [...pinnedOutputs];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;
        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
        items.forEach((item, i) => item.order = i);
        onReorder(items);
    };

    const exportHTML = () => {
        const blocksHtml = pinnedOutputs
            .sort((a, b) => a.order - b.order)
            .map(p => {
                const div = document.createElement('div');
                const container = document.getElementById(`pin-${p.id}`);
                if (container) div.innerHTML = container.innerHTML;
                return div.innerHTML;
            }).join('\n<hr style="border:none;border-top:1px solid #E0E0E0;margin:3rem 0;">\n');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NXT HUMANS Research Output</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --nxt-white: #FFFFFF; --nxt-off-white: #FAFAFA; --nxt-paper: #F5F5F0;
  --nxt-black: #0D0D0D; --nxt-near-black: #1A1A1A;
  --nxt-chartreuse: #B8B800; --nxt-chartreuse-soft: #D4D44A;
  --nxt-cyan: #00B7C3; --nxt-teal-deep: #1A5C5E;
  --nxt-heading: #0D0D0D; --nxt-body: #333333; --nxt-secondary: #666666;
  --nxt-muted: #999999; --nxt-subtle: #BBBBBB;
  --nxt-rule: #E0E0E0; --nxt-rule-light: #EEEEEE; --nxt-panel: #F5F5F0;
  --nxt-recommend-bg: #B8B800; --nxt-recommend-text: #0D0D0D;
  --nxt-evidence-bg: #E8F6F7; --nxt-evidence-border: #00B7C3;
  --nxt-warning-bg: #FFF8E1; --nxt-warning-border: #B8B800;
  --nxt-positive-bg: #F0F8F0; --nxt-positive-border: #4CAF50;
  --font-headline: 'Bebas Neue', 'Oswald', 'Impact', sans-serif;
  --font-body: 'Archivo', 'Source Sans Pro', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --text-xs: 0.7rem; --text-sm: 0.8rem; --text-base: 1rem; --text-lg: 1.15rem;
  --text-xl: 1.35rem; --text-2xl: 1.75rem; --text-3xl: 2.25rem; --text-4xl: 3rem;
  --text-5xl: 4.5rem; --space-xs: 0.25rem; --space-sm: 0.5rem; --space-md: 1rem;
  --space-lg: 2rem; --space-xl: 3rem; --space-2xl: 5rem;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); color: var(--nxt-body); background: var(--nxt-white); line-height: 1.65; -webkit-font-smoothing: antialiased; }
.sidebar { position: fixed; left: 0; top: 0; width: 48px; height: 100vh; background: var(--nxt-black); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 20px 0; }
.sidebar .logo { writing-mode: vertical-rl; text-orientation: mixed; font-family: var(--font-headline); font-size: 14px; letter-spacing: 3px; color: #fff; transform: rotate(180deg); }
.sidebar .dots { display: grid; grid-template-columns: repeat(3, 6px); grid-template-rows: repeat(3, 6px); gap: 4px; }
.sidebar .dots span { width: 6px; height: 6px; background: var(--nxt-chartreuse); display: block; }
.main { margin-left: 48px; max-width: 1100px; padding: 48px 48px 96px; }
.nxt-stat-row { display: grid; gap: 0; margin: 2rem 0; border: 1px solid #E0E0E0; }
.nxt-stat-row[data-cols="2"] { grid-template-columns: 1fr 1fr; }
.nxt-stat-row[data-cols="3"] { grid-template-columns: 1fr 1fr 1fr; }
.nxt-stat-row[data-cols="4"] { grid-template-columns: 1fr 1fr 1fr 1fr; }
.nxt-stat-item { padding: 2rem; text-align: center; border-right: 1px solid #E0E0E0; }
.nxt-stat-item:last-child { border-right: none; }
.nxt-stat-value { font-family: var(--font-headline); font-size: 4.5rem; line-height: 1; color: var(--nxt-chartreuse); }
.nxt-stat-label { font-size: 1rem; color: #666; margin-top: 0.25rem; }
.nxt-stat-source { font-size: 0.7rem; color: #999; margin-top: 0.25rem; }
.nxt-evidence-block { background: #E8F6F7; border-left: 4px solid #00B7C3; padding: 1rem 2rem; margin: 2rem 0; }
.nxt-evidence-block .nxt-source { font-size: 0.7rem; color: #999; margin-top: 0.5rem; text-align: right; }
.nxt-recommendation { background: #B8B800; color: #0D0D0D; padding: 2rem; margin: 2rem 0; }
.nxt-recommendation .nxt-rec-title { font-family: var(--font-headline); font-size: 1.35rem; letter-spacing: 0.02em; margin-bottom: 0.5rem; }
.nxt-split-panel { display: grid; grid-template-columns: 55% 45%; margin: 2rem 0; border: 1px solid #E0E0E0; }
.nxt-split-analysis { padding: 2rem; border-right: 1px solid #E0E0E0; }
.nxt-split-evidence { padding: 2rem; background: #F5F5F0; }
.nxt-section-divider { background: #0D0D0D; color: #fff; padding: 3rem; margin: 2rem 0; position: relative; overflow: hidden; }
.nxt-section-divider .nxt-section-num { font-family: var(--font-headline); font-size: 0.7rem; letter-spacing: 4px; color: #B8B800; }
.nxt-section-divider .nxt-section-title { font-family: var(--font-headline); font-size: 2.25rem; color: #fff; margin-top: 0.5rem; }
.nxt-grid-matrix { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.8rem; }
.nxt-grid-matrix thead th { background: #0D0D0D; color: #B8B800; font-family: var(--font-headline); padding: 12px 16px; text-align: left; letter-spacing: 1px; }
.nxt-grid-matrix tbody td { padding: 12px 16px; border-bottom: 1px solid #E0E0E0; }
.nxt-grid-matrix tbody tr:nth-child(even) td { background: #F5F5F0; }
.nxt-color-block-grid { display: grid; grid-template-columns: 1fr 1fr; margin: 2rem 0; }
.nxt-color-block { padding: 2rem; }
.nxt-color-block h4 { font-family: var(--font-headline); font-size: 1.75rem; margin-bottom: 0.5rem; }
.nxt-color-block.nxt-bg-black { background: #0D0D0D; color: #fff; }
.nxt-color-block.nxt-bg-black p { color: rgba(255,255,255,0.7); }
.nxt-color-block.nxt-bg-chartreuse { background: #B8B800; color: #0D0D0D; }
.nxt-color-block.nxt-bg-teal { background: #1A5C5E; color: #fff; }
.nxt-color-block.nxt-bg-teal p { color: rgba(255,255,255,0.7); }
.nxt-color-block.nxt-bg-panel { background: #F5F5F0; color: #0D0D0D; }
.nxt-quote-block { border-left: 4px solid #B8B800; padding: 1rem 2rem; margin: 2rem 0; background: #FAFAFA; }
.nxt-quote-text { font-size: 1.15rem; font-weight: 300; font-style: italic; color: #0D0D0D; line-height: 1.7; }
.nxt-quote-attribution { font-size: 0.7rem; color: #999; margin-top: 0.5rem; }
.nxt-warning-block { background: #FFF8E1; border-left: 4px solid #B8B800; padding: 1rem 2rem; margin: 2rem 0; }
.nxt-warning-block .nxt-warning-label { font-family: var(--font-headline); font-size: 0.7rem; letter-spacing: 2px; color: #B8B800; margin-bottom: 0.25rem; }
.nxt-comparison-table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.8rem; }
.nxt-comparison-table thead th { background: #0D0D0D; color: #fff; font-family: var(--font-headline); padding: 12px 16px; text-align: left; letter-spacing: 1px; }
.nxt-comparison-table tbody td { padding: 12px 16px; border-bottom: 1px solid #E0E0E0; }
.nxt-comparison-table .nxt-highlight { color: #B8B800; font-weight: 700; }
</style>
</head>
<body>
<div class="sidebar">
  <div class="logo">NXT HUMANS</div>
  <div class="dots"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
</div>
<div class="main">
${blocksHtml}
<hr style="margin: 48px 0; border: none; border-top: 1px solid #E0E0E0;">
<p style="font-size: 11px; color: #999; text-align: center;">
  NXT HUMANS Intelligence Augmentation Suite &mdash; Research Workbench Output<br>
  Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</p>
</div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nxt-research-output-${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        const boardEl = document.getElementById('output-board-content');
        if (!boardEl) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            const canvas = await html2canvas(boardEl, { scale: 1.5, useCORS: true, backgroundColor: '#FFFFFF' });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save(`nxt-research-output-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error('PDF export failed:', e);
        }
    };

    if (pinnedOutputs.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#0D0D0D', letterSpacing: '0.02em', marginBottom: 8 }}>
                    OUTPUT BOARD
                </div>
                <p>Pin visual outputs from the chat to collect them here.</p>
                <p style={{ fontSize: 11, marginTop: 8 }}>Pinned outputs can be reordered, arranged with section dividers, and exported as NXT-branded HTML or PDF.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div style={{
                padding: '10px 16px', borderBottom: '1px solid #E0E0E0',
                display: 'flex', gap: 8, alignItems: 'center', background: '#FAFAFA',
            }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#999' }}>
                    {pinnedOutputs.length} outputs
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={onAddDivider} style={{ fontSize: 8, color: '#0D0D0D', background: 'none', border: '1px solid #DDD', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                    + Divider
                </button>
                <button onClick={() => setPreviewMode(!previewMode)} style={{ fontSize: 8, color: previewMode ? '#FFFFFF' : '#0D0D0D', background: previewMode ? '#0D0D0D' : 'none', border: '1px solid #DDD', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                    {previewMode ? 'Edit' : 'Preview'}
                </button>
                <button onClick={exportHTML} style={{ fontSize: 8, color: '#0D0D0D', background: '#B8B800', border: 'none', padding: '3px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                    Export HTML
                </button>
                <button onClick={exportPDF} style={{ fontSize: 8, color: '#FFFFFF', background: '#0D0D0D', border: 'none', padding: '3px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                    Export PDF
                </button>
            </div>

            {/* Output List */}
            <div id="output-board-content" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {pinnedOutputs.sort((a, b) => a.order - b.order).map((pin, index) => (
                    <div key={pin.id} style={{ position: 'relative', marginBottom: 8 }}>
                        {!previewMode && (
                            <div style={{
                                display: 'flex', gap: 4, marginBottom: 4,
                                fontSize: 8, color: '#999', alignItems: 'center',
                            }}>
                                <span style={{ fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{pin.block.type}</span>
                                {pin.model && <span>via {pin.model}</span>}
                                <div style={{ flex: 1 }} />
                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0} style={{ background: 'none', border: '1px solid #DDD', padding: '1px 6px', cursor: 'pointer', fontSize: 10, color: index === 0 ? '#DDD' : '#666' }}>^</button>
                                <button onClick={() => moveItem(index, 'down')} disabled={index === pinnedOutputs.length - 1} style={{ background: 'none', border: '1px solid #DDD', padding: '1px 6px', cursor: 'pointer', fontSize: 10, color: index === pinnedOutputs.length - 1 ? '#DDD' : '#666' }}>v</button>
                                <button onClick={() => onRemove(pin.id)} style={{ background: 'none', border: '1px solid #CC3333', padding: '1px 6px', cursor: 'pointer', fontSize: 8, color: '#CC3333', fontWeight: 700 }}>X</button>
                            </div>
                        )}
                        <div id={`pin-${pin.id}`}>
                            <NxtBlockRenderer block={pin.block} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OutputBoard;
