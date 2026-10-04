/**
 * researchBrowserState.ts - shared filter + frame state for the unified
 * Research Browser surface and the Knowledge Graph treemap.
 *
 * Both surfaces visualize the same underlying corpus chunks; this module
 * centralizes the filter so the user can click POSITIVE in the Browser
 * and have the KG treemap reflect it without prop-drilling through
 * AnalystDeskKnowledgeGraph.
 *
 * Lightweight pub/sub (no React context - works from any component) plus
 * a React hook for ergonomic subscription.
 */
import { useEffect, useState } from 'react';

export type SentimentFilter = 'positive' | 'mixed' | 'negative' | 'neutral' | 'unknown' | null;
export type ResearchFrame = 'themes' | 'topics' | 'merged';
export type SortMode = 'evidence_density' | 'sentiment_intensity' | 'recency' | 'goal_relevance';

export interface ResearchBrowserState {
    sentiment: SentimentFilter;
    frame: ResearchFrame;
    sort: SortMode;
    query: string;
    /** Optional tag the user clicked from a card top-terms row. */
    tagFilter: string | null;
}

const DEFAULT_STATE: ResearchBrowserState = {
    sentiment: null,
    // 2026-06-08 - Topic model RETIRED from the desk (owner directive): themes are
    // the surface. Default to themes-only; the desk passes topics={[]} so the
    // TOPICS/MERGED frames are empty by design.
    frame: 'themes',
    sort: 'evidence_density',
    query: '',
    tagFilter: null,
};

let _state: ResearchBrowserState = { ...DEFAULT_STATE };
const _subscribers = new Set<(s: ResearchBrowserState) => void>();

function _emit(): void {
    for (const fn of _subscribers) {
        try { fn(_state); } catch { /* swallow subscriber errors */ }
    }
}


function setResearchBrowserState(patch: Partial<ResearchBrowserState>): void {
    _state = { ..._state, ...patch };
    _emit();
}


/**
 * Subscribe to state changes. Returns an unsubscribe function. Used by the
 * Knowledge Graph treemap and the Research Browser card lattice so they
 * stay in sync when the user clicks a sentiment column header in either.
 */
function subscribeResearchBrowserState(fn: (s: ResearchBrowserState) => void): () => void {
    _subscribers.add(fn);
    return () => { _subscribers.delete(fn); };
}

/**
 * Ergonomic React hook. Returns the current state and a setter that
 * patches the shared state (broadcasting to every subscriber).
 */
export function useResearchBrowserState(): [ResearchBrowserState, (patch: Partial<ResearchBrowserState>) => void] {
    const [snap, setSnap] = useState<ResearchBrowserState>(_state);
    useEffect(() => {
        const unsub = subscribeResearchBrowserState(setSnap);
        return unsub;
    }, []);
    return [snap, setResearchBrowserState];
}
