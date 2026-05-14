import React, { useEffect, useState } from 'react';

/**
 * CachedSynthesisOverlay — prominent visual feedback for the library
 * short-circuit path. When the researcher selects cached items and clicks
 * Run Analysis, the orchestrator is skipped and the synthesis chain runs
 * directly on the cached corpus. The user shouldn't stare at a blank
 * RESEARCH ASSEMBLY BOARD wondering if anything is happening — this
 * overlay shows:
 *
 *   - The 7 stages of cached synthesis with checkmarks for completed
 *   - The current stage with a pulsing dot
 *   - Total elapsed time
 *   - How many cached items are being processed
 */

export type CachedSynthesisStageId =
    | 'idle'
    | 'hydrating-deliverables'
    | 'loading-social'
    | 'assembling-corpus'
    | 'ingesting'
    | 'themes'
    | 'personas'
    | 'recs'
    | 'journey'
    | 'gap'
    | 'competitive'
    | 'complete'
    | 'failed';

const STAGE_LABELS: Record<Exclude<CachedSynthesisStageId, 'idle' | 'complete' | 'failed'>, string> = {
    'hydrating-deliverables': 'Loading cached deliverables',
    'loading-social': 'Loading cached social posts',
    'assembling-corpus': 'Assembling corpus from your selections',
    'ingesting': 'Ingesting corpus into synthesis session',
    'themes': 'Synthesizing themes',
    'personas': 'Synthesizing personas',
    'recs': 'Synthesizing recommendations',
    'journey': 'Mapping the journey',
    'gap': 'Scoring capability gaps',
    'competitive': 'Analyzing competitive landscape',
};

const STAGE_ORDER: Array<keyof typeof STAGE_LABELS> = [
    'hydrating-deliverables',
    'loading-social',
    'assembling-corpus',
    'ingesting',
    'themes',
    'personas',
    'recs',
    'journey',
    'gap',
    'competitive',
];

interface Props {
    show: boolean;
    stage: CachedSynthesisStageId;
    completed: Set<string>;
    /** How many items the user selected from the Library — shown in the header. */
    itemCount: number;
    /** Optional error message; renders when stage is 'failed'. */
    error?: string;
    /** Optional per-stage detail (e.g. "12KB corpus assembled" or "5 themes generated"). */
    detail?: string;
    accentColor?: string;
}

export const CachedSynthesisOverlay: React.FC<Props> = ({
    show, stage, completed, itemCount, error, detail, accentColor = '#00B7C3',
}) => {
    const [startedAt] = useState(() => Date.now());
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!show || stage === 'complete' || stage === 'failed') return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [show, stage]);

    if (!show) return null;
    const elapsed = Math.round((now - startedAt) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const elapsedLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const isFailed = stage === 'failed';
    const isComplete = stage === 'complete';
    const currentLabel = STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || '';

    return (
        <div
            style={{
                margin: '24px auto',
                maxWidth: 920,
                background: '#FFFFFF',
                border: `1px solid ${isFailed ? '#CC6644' : accentColor}`,
                borderLeft: `4px solid ${isFailed ? '#CC6644' : (isComplete ? '#0CCE6B' : accentColor)}`,
                padding: '20px 24px',
                fontFamily: "'Archivo', sans-serif",
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1.5, color: '#0D0D0D', textTransform: 'uppercase' }}>
                        {isFailed ? 'Cached Synthesis — Failed' : isComplete ? 'Cached Synthesis — Complete' : 'Synthesizing from Cached Intelligence'}
                    </div>
                    <div style={{ fontSize: 12, color: '#525252', marginTop: 4 }}>
                        {isFailed
                            ? 'Something went wrong — see details below. Your cached items are still loaded.'
                            : isComplete
                                ? `Done in ${elapsedLabel}. Use the chat to explore the results or compose new deliverables.`
                                : `Running on ${itemCount} cached item${itemCount === 1 ? '' : 's'} — no live data collection. Each step below is a real AI synthesis call against your cached corpus.`
                        }
                    </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: isFailed ? '#CC6644' : (isComplete ? '#0CCE6B' : accentColor) }}>
                        {elapsedLabel}
                    </div>
                    <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>elapsed</div>
                </div>
            </div>

            {/* Current stage callout */}
            {!isFailed && !isComplete && currentLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#FAFCFD', border: `1px solid ${accentColor}`, marginBottom: 16 }}>
                    <span style={{
                        width: 12,
                        height: 12,
                        borderRadius: 12,
                        background: accentColor,
                        animation: 'cached-synth-pulse 1.4s ease-in-out infinite',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#0D0D0D', fontWeight: 600 }}>{currentLabel}…</div>
                        {detail && <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>{detail}</div>}
                    </div>
                </div>
            )}

            {/* Failure detail */}
            {isFailed && error && (
                <div style={{ padding: '12px 14px', background: '#FFF6F2', border: '1px solid #CC6644', marginBottom: 16, fontSize: 11, color: '#7A3216' }}>
                    {error}
                </div>
            )}

            {/* Stage list with checkmarks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                {STAGE_ORDER.map((s) => {
                    const isDone = completed.has(s);
                    const isCurrent = stage === s;
                    return (
                        <div
                            key={s}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 10px',
                                background: isDone ? '#F0FBF4' : isCurrent ? '#FAFCFD' : '#FAFAF7',
                                border: `1px solid ${isDone ? '#0CCE6B' : isCurrent ? accentColor : '#E5E5E5'}`,
                            }}
                        >
                            <span
                                style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 14,
                                    background: isDone ? '#0CCE6B' : isCurrent ? accentColor : '#DDD',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                }}
                            >
                                {isDone ? '✓' : ''}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: isDone ? '#0CCE6B' : isCurrent ? '#0D0D0D' : '#888',
                                    fontWeight: isCurrent ? 700 : 400,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {STAGE_LABELS[s]}
                            </span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes cached-synth-pulse {
                    0%, 100% { opacity: 0.4; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.15); }
                }
            `}</style>
        </div>
    );
};
