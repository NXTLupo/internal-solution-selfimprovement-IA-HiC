import { create } from 'zustand';
import type { Artifact } from '../types';

const MAX_HISTORY = 20;
const LEGACY_STORAGE_KEY = 'designDeskStore.v1';
const BROADCAST_CHANNEL = 'designDeskStore.v1.sync';

// IndexedDB config. We use a single object store with one fixed-id record
// containing the entire { artifacts, activeArtifactId } payload. IDB has no
// meaningful size cap (~50% of free disk), so 5MB+ artifact stores are fine.
const IDB_NAME = 'designDeskStore';
const IDB_VERSION = 1;
const IDB_STORE = 'state';
const IDB_RECORD_KEY = 'singleton';

/**
 * BroadcastChannel reference. The PRIMARY cross-window sync mechanism.
 * IndexedDB does NOT auto-fire change events across windows the way storage
 * events do for localStorage, so BroadcastChannel is required for realtime
 * peer notification. Focus reconciliation re-reads IDB as a backup.
 */
const broadcastChannel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BROADCAST_CHANNEL) : null;

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

interface PersistedShape {
    artifacts: Artifact[];
    activeArtifactId: string | null;
}

// ---------------------------------------------------------------------------
// IndexedDB layer
// ---------------------------------------------------------------------------

let idbReady: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
    if (idbReady) return idbReady;
    if (typeof indexedDB === 'undefined') {
        idbReady = Promise.resolve(null);
        return idbReady;
    }
    idbReady = new Promise<IDBDatabase | null>((resolve) => {
        try {
            const req = indexedDB.open(IDB_NAME, IDB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                console.error('[designDeskStore] IDB open failed', req.error);
                resolve(null);
            };
            req.onblocked = () => {
                console.warn('[designDeskStore] IDB open blocked — another tab holds an upgrade transaction');
            };
        } catch (err) {
            console.error('[designDeskStore] IDB open threw', err);
            resolve(null);
        }
    });
    return idbReady;
}

async function idbGet(): Promise<PersistedShape | null> {
    const db = await openIdb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(IDB_RECORD_KEY);
            req.onsuccess = () => {
                const value = req.result;
                if (!value || typeof value !== 'object') return resolve(null);
                resolve({
                    artifacts: Array.isArray(value.artifacts) ? value.artifacts : [],
                    activeArtifactId: typeof value.activeArtifactId === 'string' ? value.activeArtifactId : null,
                });
            };
            req.onerror = () => {
                console.error('[designDeskStore] IDB read failed', req.error);
                resolve(null);
            };
        } catch (err) {
            console.error('[designDeskStore] IDB read threw', err);
            resolve(null);
        }
    });
}

async function idbPut(payload: PersistedShape): Promise<boolean> {
    const db = await openIdb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.put(payload, IDB_RECORD_KEY);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => {
                console.error('[designDeskStore] IDB write failed', tx.error);
                resolve(false);
            };
            tx.onabort = () => {
                console.error('[designDeskStore] IDB write aborted', tx.error);
                resolve(false);
            };
        } catch (err) {
            console.error('[designDeskStore] IDB write threw', err);
            resolve(false);
        }
    });
}

/**
 * One-time migration from the legacy localStorage shape. If we have
 * localStorage data but no IDB data yet, copy over and free the localStorage
 * entry so it stops competing for the 5MB origin quota.
 */
async function migrateLegacyLocalStorage(): Promise<PersistedShape | null> {
    if (typeof localStorage === 'undefined') return null;
    let parsed: PersistedShape | null = null;
    try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        parsed = {
            artifacts: Array.isArray(obj.artifacts) ? obj.artifacts : [],
            activeArtifactId: typeof obj.activeArtifactId === 'string' ? obj.activeArtifactId : null,
        };
    } catch {
        return null;
    }
    if (!parsed) return null;
    const ok = await idbPut(parsed);
    if (ok) {
        try {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            console.info(`[designDeskStore] migrated ${parsed.artifacts.length} artifact(s) from localStorage → IndexedDB; legacy key removed`);
        } catch { /* removeItem rarely fails */ }
    }
    return parsed;
}

// ---------------------------------------------------------------------------
// Persist + sync
// ---------------------------------------------------------------------------

let persistSeq = 0;

function persist(state: PersistedShape) {
    const seq = ++persistSeq;
    const breakdown = state.artifacts.map(a => {
        const bytes = JSON.stringify(a).length;
        const kind = (a as any).kind ?? a.type;
        return `${kind}:${(bytes / 1024).toFixed(1)}KB`;
    }).join(', ');
    console.info(`[designDeskStore] persist#${seq} — ${state.artifacts.length} artifact(s); breakdown=[${breakdown}]; active=${state.activeArtifactId}`);

    // Broadcast IMMEDIATELY (synchronously) so peers see the update without
    // waiting on the IDB write. BroadcastChannel has no quota, no payload-size
    // sensitivity, and no async dependency. Even if IDB persistence fails,
    // peers still get the new state in real time.
    if (broadcastChannel) {
        try {
            broadcastChannel.postMessage({
                type: 'state',
                artifacts: state.artifacts,
                activeArtifactId: state.activeArtifactId,
            });
            console.info(`[designDeskStore] persist#${seq} — BroadcastChannel post SUCCESS`);
        } catch (bcErr) {
            console.warn(`[designDeskStore] persist#${seq} — BroadcastChannel post failed`, bcErr);
        }
    }

    // IDB write is async but we don't await — the store mutation has already
    // happened in memory; persistence is for hydration on next boot.
    idbPut(state).then(ok => {
        if (ok) {
            console.info(`[designDeskStore] persist#${seq} — IndexedDB write SUCCESS`);
        } else {
            console.error(`[designDeskStore] persist#${seq} — IndexedDB write FAILED — peers still notified via BroadcastChannel, but boot hydration may miss this update`);
        }
    });
}

// ---------------------------------------------------------------------------
// Boot hydration
// ---------------------------------------------------------------------------

let initialState: PersistedShape = { artifacts: [], activeArtifactId: null };

(async function bootHydrate() {
    let hydrated = await idbGet();
    if (!hydrated) {
        // First boot post-IDB-migration, or fresh install. Try migrating from
        // legacy localStorage. If it's also empty, we boot empty.
        hydrated = await migrateLegacyLocalStorage();
    } else {
        // IDB already populated — also clean up any leftover legacy entry so
        // it stops eating localStorage quota for other writers.
        try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
    }
    if (hydrated) {
        useDesignDeskStore.setState({
            artifacts: hydrated.artifacts,
            activeArtifactId: hydrated.activeArtifactId,
        });
        const kinds = hydrated.artifacts.map(a => (a as any).kind ?? a.type).join(', ');
        console.info(`[designDeskStore] boot hydrate from IndexedDB: ${hydrated.artifacts.length} artifact(s) [${kinds}]; active=${hydrated.activeArtifactId}`);
    } else {
        console.info(`[designDeskStore] boot hydrate: empty state (no IDB data, no legacy localStorage)`);
    }
})().catch(err => console.error('[designDeskStore] boot hydrate threw', err));

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useDesignDeskStore = create<DesignDeskState>((set) => ({
    artifacts: initialState.artifacts,
    activeArtifactId: initialState.activeArtifactId,
    history: [],

    addArtifact: (artifact) => set((state) => {
        const next = {
            artifacts: [...state.artifacts, artifact],
            activeArtifactId: artifact.id,
        };
        persist(next);
        return next;
    }),

    replaceArtifact: (artifact) => set((state) => {
        const prev = state.artifacts.find(a => a.id === artifact.id);
        if (!prev) return state;
        const newHistory = [{ before: prev, timestamp: Date.now() }, ...state.history].slice(0, MAX_HISTORY);
        const next = {
            artifacts: state.artifacts.map(a => a.id === artifact.id ? artifact : a),
            history: newHistory,
            activeArtifactId: state.activeArtifactId,
        };
        persist({ artifacts: next.artifacts, activeArtifactId: state.activeArtifactId });
        return next;
    }),

    setActiveArtifact: (id) => set((state) => {
        persist({ artifacts: state.artifacts, activeArtifactId: id });
        return { activeArtifactId: id };
    }),

    removeArtifact: (id) => set((state) => {
        const remaining = state.artifacts.filter(a => a.id !== id);
        const newActive = state.activeArtifactId === id
            ? (remaining[remaining.length - 1]?.id ?? null)
            : state.activeArtifactId;
        persist({ artifacts: remaining, activeArtifactId: newActive });
        return {
            artifacts: remaining,
            activeArtifactId: newActive,
        };
    }),

    undo: () => set((state) => {
        if (state.history.length === 0) return state;
        const [{ before }, ...rest] = state.history;
        const next = {
            artifacts: state.artifacts.map(a => a.id === before.id ? before : a),
            history: rest,
        };
        persist({ artifacts: next.artifacts, activeArtifactId: state.activeArtifactId });
        return next;
    }),

    reset: () => {
        persist({ artifacts: [], activeArtifactId: null });
        return set({ artifacts: [], activeArtifactId: null, history: [] });
    },
}));

// ---------------------------------------------------------------------------
// Cross-window sync
// ---------------------------------------------------------------------------

/**
 * Single merge entry point. Both BroadcastChannel and focus-reconcile paths
 * funnel through this so the merge logic stays consistent.
 */
function applyIncomingState(
    incoming: Artifact[],
    incomingActiveId: string | null,
    sourceLabel: string,
): void {
    const currentState = useDesignDeskStore.getState();
    const current = currentState.artifacts;
    const incomingIds = new Set(incoming.map(a => a.id));
    const localOnly = current.filter(a => !incomingIds.has(a.id));
    const merged = [...incoming, ...localOnly];
    const currentIds = new Set(current.map(a => a.id));
    const newlyArrivedFromPeer = incoming.filter(a => !currentIds.has(a.id));
    let nextActive = currentState.activeArtifactId;
    if (typeof incomingActiveId === 'string') {
        nextActive = incomingActiveId;
    } else if (newlyArrivedFromPeer.length > 0) {
        const sorted = [...newlyArrivedFromPeer].sort((a, b) =>
            (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
        );
        nextActive = sorted[0].id;
    }
    useDesignDeskStore.setState({
        artifacts: merged,
        activeArtifactId: nextActive,
    });
    const mergedKinds = merged.map(a => (a as any).kind ?? a.type).join(', ');
    console.info(`[designDeskStore] merge applied via ${sourceLabel}: ${merged.length} artifact(s) [${mergedKinds}]; active=${nextActive}; new-from-peer=${newlyArrivedFromPeer.length}`);
}

if (typeof window !== 'undefined') {
    const windowLabel = window.location.search.includes('designer=1') ? 'DESIGNER' : 'MAIN';
    console.info(`[designDeskStore] cross-window sync REGISTERED (channel="${BROADCAST_CHANNEL}", window=${windowLabel}, broadcastChannel=${broadcastChannel ? 'available' : 'UNAVAILABLE'}, indexedDB=${typeof indexedDB !== 'undefined' ? 'available' : 'UNAVAILABLE'})`);

    // PRIMARY: BroadcastChannel — fires immediately on every peer postMessage,
    // no quota, no payload-size limit.
    if (broadcastChannel) {
        broadcastChannel.addEventListener('message', (e) => {
            const data = e.data;
            if (!data || data.type !== 'state') return;
            const incoming: Artifact[] = Array.isArray(data.artifacts) ? data.artifacts : [];
            const incomingKinds = incoming.map((a: any) => a.kind ?? a.type).join(', ');
            console.info(`[designDeskStore] BroadcastChannel received ${incoming.length} artifact(s) [${incomingKinds}]; peer active=${data.activeArtifactId}`);
            applyIncomingState(incoming, data.activeArtifactId ?? null, 'BroadcastChannel');
        });
    }

    // BACKUP: focus reconciliation. When the user switches to this window,
    // re-read IDB and pull in anything we missed.
    window.addEventListener('focus', async () => {
        try {
            const persisted = await idbGet();
            if (!persisted) return;
            const currentState = useDesignDeskStore.getState();
            const currentIds = new Set(currentState.artifacts.map(a => a.id));
            const hasNew = persisted.artifacts.some(a => !currentIds.has(a.id));
            if (!hasNew && persisted.artifacts.length === currentState.artifacts.length) {
                return;
            }
            console.info(`[designDeskStore] window focus → reconciling from IDB (incoming=${persisted.artifacts.length}, current=${currentState.artifacts.length})`);
            applyIncomingState(persisted.artifacts, persisted.activeArtifactId, 'focus-reconcile');
        } catch (err) {
            console.warn('[designDeskStore] focus reconcile failed', err);
        }
    });
}
