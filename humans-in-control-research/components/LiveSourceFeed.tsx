/**
 * LiveSourceFeed — Real-time visual evidence pulling during data collection.
 * Shows sources appearing as cards with evidence snippets, credibility badges,
 * and relevance scores as the research proxy returns results.
 *
 * Replaces the text-only reasoning stream during the data collection phase.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceResult {
    source: string;
    sourceId: string;
    category?: string;
    credibilityTier?: number;
    items: { title: string; content: string; url?: string; date?: string }[];
    total: number;
    query?: string;
    status: 'pending' | 'loading' | 'complete' | 'empty' | 'error';
}

interface Props {
    sources: SourceResult[];
    refinedQueries: Record<string, string>;
    totalCollected: number;
    totalSources: number;
    successfulSources: number;
    isCollecting: boolean;
    phase: string;  // 'refining' | 'collecting' | 'filtering' | 'complete'
}

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: 'TIER 1', color: '#115054', bg: 'rgba(17, 80, 84, 0.1)' },
    2: { label: 'TIER 2', color: '#fd8e2e', bg: 'rgba(253, 142, 46, 0.1)' },
    3: { label: 'TIER 3', color: '#acacac', bg: 'rgba(172, 172, 172, 0.1)' },
};

const LiveSourceFeed: React.FC<Props> = ({ sources, refinedQueries, totalCollected, totalSources, successfulSources, isCollecting, phase }) => {
    const [expandedSource, setExpandedSource] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col">
            {/* HEADER STATS BAR */}
            <div className="flex-shrink-0 bg-[var(--nxt-teal)] px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isCollecting && <div className="w-2 h-2 rounded-full bg-[var(--nxt-lime)] animate-pulse"></div>}
                        {!isCollecting && phase === 'complete' && <div className="w-2 h-2 rounded-full bg-[#0CCE6B]"></div>}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                            {phase === 'refining' ? 'Generating Targeted Queries...' :
                             phase === 'collecting' ? 'Pulling Evidence...' :
                             phase === 'filtering' ? 'AI Scoring Relevance...' :
                             'Collection Complete'}
                        </span>
                    </div>
                    <div className="flex gap-3 text-white">
                        <div className="text-center">
                            <div className="text-lg font-extralight">{totalCollected}</div>
                            <div className="text-[8px] uppercase tracking-widest opacity-70">Items</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-extralight">{successfulSources}/{totalSources}</div>
                            <div className="text-[8px] uppercase tracking-widest opacity-70">Sources</div>
                        </div>
                    </div>
                </div>
                {/* Progress bar */}
                {isCollecting && (
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-[var(--nxt-lime)]"
                            initial={{ width: '0%' }}
                            animate={{ width: totalSources > 0 ? `${(successfulSources / totalSources) * 100}%` : '0%' }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                )}
            </div>

            {/* SOURCE CARDS */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <AnimatePresence>
                    {sources.map((src, i) => {
                        const tier = TIER_CONFIG[src.credibilityTier || 3];
                        const isExpanded = expandedSource === src.sourceId;
                        const hasItems = src.items && src.items.length > 0;

                        return (
                            <motion.div
                                key={src.sourceId}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={`rounded border overflow-hidden transition-all ${
                                    src.status === 'loading' ? 'border-[var(--nxt-lime)] animate-pulse' :
                                    src.status === 'error' ? 'border-[#FF5A5A] opacity-50' :
                                    src.status === 'empty' ? 'border-[var(--border-primary)] opacity-40' :
                                    'border-[var(--border-primary)]'
                                }`}
                            >
                                {/* Source header */}
                                <button
                                    onClick={() => hasItems && setExpandedSource(isExpanded ? null : src.sourceId)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    {/* Status indicator */}
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        src.status === 'loading' ? 'bg-[var(--nxt-lime)] animate-pulse' :
                                        src.status === 'complete' ? 'bg-[#0CCE6B]' :
                                        src.status === 'empty' ? 'bg-gray-300' :
                                        src.status === 'error' ? 'bg-[#FF5A5A]' :
                                        'bg-gray-200'
                                    }`}></div>

                                    {/* Source name */}
                                    <span className="text-[11px] font-bold text-[var(--text-primary)] flex-1 truncate">{src.source}</span>

                                    {/* Tier badge */}
                                    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm flex-shrink-0"
                                          style={{ color: tier.color, backgroundColor: tier.bg }}>
                                        {tier.label}
                                    </span>

                                    {/* Item count */}
                                    {hasItems && (
                                        <span className="text-[10px] font-bold text-[var(--nxt-teal)] bg-[var(--nxt-lime-10)] px-1.5 py-0.5 rounded-sm flex-shrink-0">
                                            {src.items.length}
                                        </span>
                                    )}
                                    {src.status === 'empty' && <span className="text-[9px] text-gray-400">0</span>}

                                    {/* Expand arrow */}
                                    {hasItems && (
                                        <span className={`text-[var(--text-tertiary)] text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>V</span>
                                    )}
                                </button>

                                {/* Query used */}
                                {src.query && (
                                    <div className="px-3 pb-1 text-[9px] text-[var(--text-tertiary)] italic truncate">
                                        Query: "{src.query}"
                                    </div>
                                )}

                                {/* Expanded: show top evidence items */}
                                {isExpanded && hasItems && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-[var(--border-primary)]"
                                    >
                                        <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                                            {src.items.slice(0, 5).map((item, j) => (
                                                <div key={j} className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                                                    <div className="font-bold text-[var(--text-primary)] truncate">{item.title}</div>
                                                    <div className="text-[var(--text-tertiary)] line-clamp-2 mt-0.5 leading-relaxed">{item.content?.substring(0, 150)}...</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {item.date && <span className="text-[8px] text-[var(--text-tertiary)]">{item.date}</span>}
                                                        {item.url && (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                                                               className="text-[8px] text-[var(--nxt-teal)] underline hover:text-[var(--nxt-orange)]">
                                                                View Source
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {src.items.length > 5 && (
                                                <div className="text-center text-[9px] text-[var(--text-tertiary)] py-1">
                                                    +{src.items.length - 5} more items
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Refined queries section (shown during refining phase) */}
                {phase === 'refining' && Object.keys(refinedQueries).length > 0 && (
                    <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--nxt-teal)] mb-2">AI-Refined Search Queries</div>
                        {Object.entries(refinedQueries).map(([cat, query], i) => (
                            <div key={i} className="flex gap-2 py-1 text-[10px]">
                                <span className="font-bold text-[var(--text-secondary)] flex-shrink-0 w-24 truncate">{cat}</span>
                                <span className="text-[var(--text-tertiary)] italic truncate">"{query}"</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveSourceFeed;
