import { create } from 'zustand';
import type { Artifact } from '../types';

const MAX_HISTORY = 20;

interface DesignDeskState {
    artifacts: Artifact[];
    activeArtifactId: string | null;
    history: Array<{ before: Artifact; timestamp: number }>;

    addArtifact: (artifact: Artifact) => void;
    replaceArtifact: (artifact: Artifact) => void;
    setActiveArtifact: (id: string) => void;
    removeArtifact: (id: string) => void;
    undo: () => void;
    reset: () => void;
}

export const useDesignDeskStore = create<DesignDeskState>((set) => ({
    artifacts: [],
    activeArtifactId: null,
    history: [],

    addArtifact: (artifact) => set((state) => ({
        artifacts: [...state.artifacts, artifact],
        activeArtifactId: artifact.id,
    })),

    replaceArtifact: (artifact) => set((state) => {
        const prev = state.artifacts.find(a => a.id === artifact.id);
        if (!prev) return state;
        const newHistory = [{ before: prev, timestamp: Date.now() }, ...state.history].slice(0, MAX_HISTORY);
        return {
            artifacts: state.artifacts.map(a => a.id === artifact.id ? artifact : a),
            history: newHistory,
        };
    }),

    setActiveArtifact: (id) => set({ activeArtifactId: id }),

    removeArtifact: (id) => set((state) => {
        const remaining = state.artifacts.filter(a => a.id !== id);
        return {
            artifacts: remaining,
            activeArtifactId: state.activeArtifactId === id
                ? (remaining[remaining.length - 1]?.id ?? null)
                : state.activeArtifactId,
        };
    }),

    undo: () => set((state) => {
        if (state.history.length === 0) return state;
        const [{ before }, ...rest] = state.history;
        return {
            artifacts: state.artifacts.map(a => a.id === before.id ? before : a),
            history: rest,
        };
    }),

    reset: () => set({ artifacts: [], activeArtifactId: null, history: [] }),
}));
