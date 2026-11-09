/**
 * StudioPanel - the one-click output surface (2026-11-03).
 * Plan: plans/notebooklm-studio-reverse-engineering-2026-11-03.md, Part 6 W4 (spec clause U1).
 *
 * NotebookLM's Studio rail replicated on HiC's own machinery: every tile composes the
 * corresponding chat directive and submits it through the panel's handleSend, so each
 * output inherits the full pipeline (artifactModelFor routing, manifest-chunk grounding,
 * claim-ledger gate, pointer citations, the artifact library). The panel adds no second
 * generation path; it is a launcher over the existing hashtag directives.
 *
 * An optional steering prompt (audience, focus, style) is prepended to the directive,
 * matching NotebookLM's per-output customization box.
 */

import React, { useState } from 'react';

export interface StudioTile {
    hashtag: string;
    label: string;
    desc: string;
    /** disable + hint when the session has fewer than 3 themes (the mind map floor). */
    needsThemes?: boolean;
}

interface StudioGroup { title: string; tiles: StudioTile[] }

const STUDIO_GROUPS: StudioGroup[] = [
    {
        title: 'Understand',
        tiles: [
            { hashtag: '#mindmap', label: 'Mind Map', desc: 'Navigable concept map of the corpus; click a node to ask about it.', needsThemes: true },
            { hashtag: '#faq', label: 'FAQ', desc: 'The stakeholder questions the corpus settles, each answered with cited evidence.' },
            { hashtag: '#studyguide', label: 'Study Guide', desc: 'Topic modules with key terms, anchor quotes, and self-check reveals.' },
            { hashtag: '#chronology', label: 'Chronology', desc: 'Dated timeline of events drawn from the sources, every entry cited.' },
            { hashtag: '#datatable', label: 'Data Table', desc: 'One entities-by-attributes comparison table, every row cited.' },
            { hashtag: '#critique', label: 'Critique', desc: 'Where the sources are strong, weak, and which findings to trust.' },
        ],
    },
    {
        title: 'Create',
        tiles: [
            { hashtag: '#brief', label: 'Briefing', desc: 'Stakeholder one-pager: hero finding, supporting evidence, one diagram.' },
            { hashtag: '#explainer', label: 'Explainer', desc: 'Deep-dive page that teaches one concept end to end.' },
            { hashtag: '#report', label: 'Report', desc: 'Long-form strategic report with sectioned findings and evidence panels.' },
            { hashtag: '#slides', label: 'Slide Deck', desc: 'Full consulting deck; exports to native editable PPTX.' },
            { hashtag: '#brief-dialog', label: 'Debate', desc: 'Skeptical Partner vs Curious Strategist argue the evidence, line-cited.' },
            { hashtag: '#audio-overview', label: 'Audio Overview', desc: 'The dialogue rendered to speech: a two-voice audio brief with cited transcript.' },
            { hashtag: '#video-overview', label: 'Video Overview', desc: 'A brand recap video: objective, thesis, sources, and the judgment as animated scenes.' },
        ],
    },
    {
        title: 'Practice',
        tiles: [
            { hashtag: '#flashcards', label: 'Flashcards', desc: 'Active-recall cards; tap a face to reveal the grounded answer.' },
            { hashtag: '#quiz', label: 'Quiz', desc: 'Multiple choice with explained, cited answers behind reveals.' },
        ],
    },
];

interface StudioPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** Submits the composed directive through the chat send path. */
    onRun: (directiveText: string) => void;
    themeCount: number;
    isLoading: boolean;
}

const StudioPanel: React.FC<StudioPanelProps> = ({ isOpen, onClose, onRun, themeCount, isLoading }) => {
    const [steering, setSteering] = useState('');
    if (!isOpen) return null;

    const run = (tile: StudioTile) => {
        if (isLoading) return;
        const text = `${tile.hashtag} ${steering.trim()}`.trim();
        onRun(text);
        onClose();
    };

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
            {/* scrim */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.45)' }} />
            {/* rail */}
            <div style={{
                position: 'relative', width: 340, maxWidth: '92%', height: '100%', background: '#FAFAF7',
                borderLeft: '2px solid #0D0D0D', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                <div style={{ background: '#0D0D0D', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>Studio</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>One click, grounded in the selected corpus</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}>X</button>
                </div>

                <div style={{ padding: '10px 14px', borderBottom: '1px solid #E8E8E8' }}>
                    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>
                        Steering (optional)
                    </div>
                    <input
                        value={steering}
                        onChange={e => setSteering(e.target.value)}
                        placeholder="audience, focus, or style, e.g. for the CFO, focus on vendor risk"
                        style={{
                            width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '6px 8px',
                            border: '1px solid #CCC', borderRadius: 2, background: '#FFF', color: '#333',
                            outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 18px' }}>
                    {STUDIO_GROUPS.map(group => (
                        <div key={group.title} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#115054', margin: '8px 0 6px' }}>
                                {group.title}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {group.tiles.map(tile => {
                                    const blocked = (tile.needsThemes && themeCount < 3) || isLoading;
                                    return (
                                        <button
                                            key={tile.hashtag}
                                            onClick={() => !blocked && run(tile)}
                                            title={tile.needsThemes && themeCount < 3
                                                ? 'Needs at least 3 themes: run analysis or load a session with theme output first.'
                                                : `${tile.hashtag}${steering.trim() ? ` ${steering.trim()}` : ''}`}
                                            style={{
                                                textAlign: 'left', background: '#FFF', border: '1px solid #DDD', borderRadius: 2,
                                                padding: '9px 10px', cursor: blocked ? 'default' : 'pointer',
                                                opacity: blocked ? 0.45 : 1, transition: 'border-color 120ms',
                                            }}
                                            onMouseEnter={e => { if (!blocked) (e.currentTarget as HTMLButtonElement).style.borderColor = '#B8B800'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#DDD'; }}
                                        >
                                            <div style={{ fontSize: 10, fontWeight: 700, color: '#0D0D0D', letterSpacing: '0.5px' }}>{tile.label}</div>
                                            <div style={{ fontSize: 8.5, color: '#777', lineHeight: 1.45, marginTop: 3 }}>{tile.desc}</div>
                                            <div style={{ fontSize: 7.5, color: '#00B7C3', marginTop: 4, fontWeight: 600 }}>{tile.hashtag}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div style={{ fontSize: 8, color: '#999', lineHeight: 1.5, marginTop: 4 }}>
                        Every output is generated from the engagement corpus with pointer citations and lands in the
                        artifact library (#artifacts). Add #NU or #DECIEM in the steering box to switch brand.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudioPanel;
