/**
 * Design context persistence — gives the Designer chat access to the same
 * evidence the Research Analyst chat (CorpusChatPanel) has:
 *   - corpusText           (full external research corpus)
 *   - uploadedFileContents (client PDF/DOCX/text uploads, parsed)
 *   - themes / personas / journeyStages (structured intelligence the
 *     synthesis pipeline already produced)
 *
 * Cross-window: written to localStorage so the popup Designer (which runs in
 * a separate window via window.open('?designer=1')) can read the same
 * context the main App.tsx tab built. App.tsx pushes updates whenever any
 * piece changes; both the in-tab and popup Designers subscribe via storage
 * events.
 *
 * NOT a memory of artifacts — those go through the existing Zustand
 * `designDeskStore`, which has its own persistence + cross-window sync.
 */

const STORAGE_KEY = 'nxt.design-desk.context.v1';
// localStorage hard cap is ~5MB per origin. Keep each chunk well under that.
const MAX_CORPUS_CHARS = 800_000;
const MAX_UPLOADS_CHARS = 600_000;
const MAX_STRUCT_CHARS = 100_000;

export interface DesignContext {
    corpusText: string;
    uploadedFileContents: string;
    themes: string;        // pre-stringified to keep the shape stable across persist roundtrips
    personas: string;
    journeyStages: string;
    updatedAt: number;
}

const EMPTY: DesignContext = {
    corpusText: '',
    uploadedFileContents: '',
    themes: '',
    personas: '',
    journeyStages: '',
    updatedAt: 0,
};

function clip(s: string | undefined | null, max: number): string {
    if (!s || typeof s !== 'string') return '';
    if (s.length <= max) return s;
    return s.slice(0, max);
}

function stringifyShort(v: unknown, max: number): string {
    if (v == null) return '';
    if (typeof v === 'string') return clip(v, max);
    try { return clip(JSON.stringify(v), max); } catch { return ''; }
}

export function saveDesignContext(input: Partial<{
    corpusText: string;
    uploadedFileContents: string;
    themes: unknown;
    personas: unknown;
    journeyStages: unknown;
}>): void {
    if (typeof window === 'undefined') return;
    const prev = loadDesignContext();
    const next: DesignContext = {
        corpusText: input.corpusText !== undefined ? clip(input.corpusText, MAX_CORPUS_CHARS) : prev.corpusText,
        uploadedFileContents: input.uploadedFileContents !== undefined ? clip(input.uploadedFileContents, MAX_UPLOADS_CHARS) : prev.uploadedFileContents,
        themes: input.themes !== undefined ? stringifyShort(input.themes, MAX_STRUCT_CHARS) : prev.themes,
        personas: input.personas !== undefined ? stringifyShort(input.personas, MAX_STRUCT_CHARS) : prev.personas,
        journeyStages: input.journeyStages !== undefined ? stringifyShort(input.journeyStages, MAX_STRUCT_CHARS) : prev.journeyStages,
        updatedAt: Date.now(),
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
        // Quota exceeded or storage disabled. Try a smaller payload — drop corpusText
        // first since it's the largest and the model can fall back on uploads + structured.
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, corpusText: '' }));
        } catch {
            // Give up silently — Designer will fall back to its corpus prop.
            console.warn('[designContext] localStorage write failed', err);
        }
    }
}

export function loadDesignContext(): DesignContext {
    if (typeof window === 'undefined') return EMPTY;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw);
        return {
            corpusText: typeof parsed.corpusText === 'string' ? parsed.corpusText : '',
            uploadedFileContents: typeof parsed.uploadedFileContents === 'string' ? parsed.uploadedFileContents : '',
            themes: typeof parsed.themes === 'string' ? parsed.themes : '',
            personas: typeof parsed.personas === 'string' ? parsed.personas : '',
            journeyStages: typeof parsed.journeyStages === 'string' ? parsed.journeyStages : '',
            updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
        };
    } catch {
        return EMPTY;
    }
}

/**
 * Combine all evidence into a single corpus string suitable for prompt injection.
 * Mirrors the CorpusChatPanel pattern so the Designer chat has the same grounding
 * the Analyst chat has. Sectioned with clear headers so the model can distinguish
 * client uploads (organizational truth) from external research (evidence base)
 * from structured intelligence (already-synthesized themes/personas/journey).
 */
export function buildCombinedEvidence(ctx: DesignContext): string {
    const parts: string[] = [];
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.length > 40) {
        parts.push('=== CLIENT UPLOADS ===\n' + ctx.uploadedFileContents);
    }
    if (ctx.corpusText && ctx.corpusText.length > 40) {
        parts.push('=== EXTERNAL RESEARCH CORPUS ===\n' + ctx.corpusText);
    }
    if (ctx.themes) parts.push('=== THEMES ===\n' + ctx.themes);
    if (ctx.personas) parts.push('=== PERSONAS ===\n' + ctx.personas);
    if (ctx.journeyStages) parts.push('=== JOURNEY ===\n' + ctx.journeyStages);
    return parts.join('\n\n');
}

/**
 * Subscribe to context updates from other windows / tabs. Returns an
 * unsubscribe function. The callback receives the new context whenever the
 * STORAGE_KEY changes via storage events (which fire only on OTHER windows
 * — same-window writes don't fire storage events, so callers also need to
 * handle their own writes).
 */
export function subscribeDesignContext(cb: (ctx: DesignContext) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
            const parsed = JSON.parse(e.newValue);
            cb({
                corpusText: typeof parsed.corpusText === 'string' ? parsed.corpusText : '',
                uploadedFileContents: typeof parsed.uploadedFileContents === 'string' ? parsed.uploadedFileContents : '',
                themes: typeof parsed.themes === 'string' ? parsed.themes : '',
                personas: typeof parsed.personas === 'string' ? parsed.personas : '',
                journeyStages: typeof parsed.journeyStages === 'string' ? parsed.journeyStages : '',
                updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
            });
        } catch { /* ignore malformed */ }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
}
