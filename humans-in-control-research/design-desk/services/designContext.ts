/**
 * Design context persistence - gives the Designer chat access to the same
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
 * NOT a memory of artifacts - those go through the existing Zustand
 * `designDeskStore`, which has its own persistence + cross-window sync.
 */

// 2026-06-02 - Shared intelligence shapers. The Designer chat now stores the
// SAME shaped form the Analyst chat injects (pain-point-forward, headered
// blocks) instead of raw JSON.stringify, and carries the full structured set
// (recs/gap/competitive/strategic) + a corpus manifest it previously lacked.
import {
    shapeThemesForChat, shapePersonas, shapeJourney, shapeRecommendations,
    shapeGap, shapeCompetitive, shapeStrategic,
} from '../../services/intelligenceShaping';

// 2026-06-02 - Bumped v1 -> v2 because the stored shape of themes/personas/
// journey changed from JSON to shaped prose blocks; a stale v1 payload would
// inject JSON. A fresh key avoids mixing formats across the rollover.
const STORAGE_KEY = 'nxt.design-desk.context.v2';
// localStorage hard cap is ~5MB per origin. Keep each chunk well under that.
const MAX_CORPUS_CHARS = 800_000;
const MAX_UPLOADS_CHARS = 600_000;
const MAX_STRUCT_CHARS = 100_000;

export interface DesignContext {
    corpusText: string;
    uploadedFileContents: string;
    themes: string;        // shaped prose block (header + body), stable across persist roundtrips
    personas: string;
    journeyStages: string;
    recommendations: string;
    gapAnalysis: string;
    competitiveAnalysis: string;
    strategicReport: string;
    corpusManifest: string;   // corpus-composition overview (precomputed by App)
    researchGoal: string;
    brand: string;
    updatedAt: number;
}

const EMPTY: DesignContext = {
    corpusText: '',
    uploadedFileContents: '',
    themes: '',
    personas: '',
    journeyStages: '',
    recommendations: '',
    gapAnalysis: '',
    competitiveAnalysis: '',
    strategicReport: '',
    corpusManifest: '',
    researchGoal: '',
    brand: '',
    updatedAt: 0,
};

function clip(s: string | undefined | null, max: number): string {
    if (!s || typeof s !== 'string') return '';
    if (s.length <= max) return s;
    return s.slice(0, max);
}

export function saveDesignContext(input: Partial<{
    corpusText: string;
    uploadedFileContents: string;
    themes: unknown;
    personas: unknown;
    journeyStages: unknown;
    recommendations: unknown;
    gapAnalysis: unknown;          // pass the unwrapped `.analysis` object (holds `.gaps`)
    competitiveAnalysis: unknown;  // pass the unwrapped `.analysis` object (holds `.peers`)
    strategicReport: unknown;      // pass the unwrapped `.report` object
    corpusManifest: string;        // precomputed by App via buildCorpusManifest()
    researchGoal: string;
    brand: string;
}>): void {
    if (typeof window === 'undefined') return;
    const prev = loadDesignContext();
    // Shape structured intelligence into the SAME prose blocks the Analyst chat
    // injects, then clip. shape* return '' for empty/missing inputs.
    const next: DesignContext = {
        corpusText: input.corpusText !== undefined ? clip(input.corpusText, MAX_CORPUS_CHARS) : prev.corpusText,
        uploadedFileContents: input.uploadedFileContents !== undefined ? clip(input.uploadedFileContents, MAX_UPLOADS_CHARS) : prev.uploadedFileContents,
        // 2026-10-20 (P0.1): the Designer desk is held to the Analyst desk's theme contract (own themes first, pointers).
        themes: input.themes !== undefined ? clip(shapeThemesForChat(input.themes as any[]), MAX_STRUCT_CHARS) : prev.themes,
        personas: input.personas !== undefined ? clip(shapePersonas(input.personas as any[]), MAX_STRUCT_CHARS) : prev.personas,
        journeyStages: input.journeyStages !== undefined ? clip(shapeJourney(input.journeyStages as any[]), MAX_STRUCT_CHARS) : prev.journeyStages,
        recommendations: input.recommendations !== undefined ? clip(shapeRecommendations(input.recommendations as any[]), MAX_STRUCT_CHARS) : prev.recommendations,
        gapAnalysis: input.gapAnalysis !== undefined ? clip(shapeGap(input.gapAnalysis), MAX_STRUCT_CHARS) : prev.gapAnalysis,
        competitiveAnalysis: input.competitiveAnalysis !== undefined ? clip(shapeCompetitive(input.competitiveAnalysis), MAX_STRUCT_CHARS) : prev.competitiveAnalysis,
        strategicReport: input.strategicReport !== undefined ? clip(shapeStrategic(input.strategicReport), MAX_STRUCT_CHARS) : prev.strategicReport,
        corpusManifest: input.corpusManifest !== undefined ? clip(input.corpusManifest, MAX_STRUCT_CHARS) : prev.corpusManifest,
        researchGoal: input.researchGoal !== undefined ? clip(input.researchGoal, 4000) : prev.researchGoal,
        brand: input.brand !== undefined ? clip(input.brand, 40) : prev.brand,
        updatedAt: Date.now(),
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
        // Quota exceeded or storage disabled. Try a smaller payload - drop corpusText
        // first since it's the largest and the model can fall back on uploads + structured.
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, corpusText: '' }));
        } catch {
            // Give up silently - Designer will fall back to its corpus prop.
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
        return hydrate(parsed);
    } catch {
        return EMPTY;
    }
}

/** Normalize a parsed localStorage payload into a full DesignContext. */
function hydrate(parsed: any): DesignContext {
    const str = (v: any) => (typeof v === 'string' ? v : '');
    return {
        corpusText: str(parsed.corpusText),
        uploadedFileContents: str(parsed.uploadedFileContents),
        themes: str(parsed.themes),
        personas: str(parsed.personas),
        journeyStages: str(parsed.journeyStages),
        recommendations: str(parsed.recommendations),
        gapAnalysis: str(parsed.gapAnalysis),
        competitiveAnalysis: str(parsed.competitiveAnalysis),
        strategicReport: str(parsed.strategicReport),
        corpusManifest: str(parsed.corpusManifest),
        researchGoal: str(parsed.researchGoal),
        brand: str(parsed.brand),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
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
    // Corpus manifest FIRST so the model orients on what the corpus contains
    // before reading any of it. themes/personas/journey/recs/gap/competitive/
    // strategic are now stored as shaped blocks that already carry their own
    // `=== HEADER ===` line, so they are pushed verbatim.
    if (ctx.corpusManifest) parts.push(ctx.corpusManifest);
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.length > 40) {
        parts.push('=== CLIENT UPLOADS ===\n' + ctx.uploadedFileContents);
    }
    if (ctx.corpusText && ctx.corpusText.length > 40) {
        parts.push('=== EXTERNAL RESEARCH CORPUS ===\n' + ctx.corpusText);
    }
    if (ctx.themes) parts.push(ctx.themes);
    if (ctx.personas) parts.push(ctx.personas);
    if (ctx.recommendations) parts.push(ctx.recommendations);
    if (ctx.journeyStages) parts.push(ctx.journeyStages);
    if (ctx.gapAnalysis) parts.push(ctx.gapAnalysis);
    if (ctx.competitiveAnalysis) parts.push(ctx.competitiveAnalysis);
    if (ctx.strategicReport) parts.push(ctx.strategicReport);
    return parts.join('\n\n');
}

/**
 * Subscribe to context updates from other windows / tabs. Returns an
 * unsubscribe function. The callback receives the new context whenever the
 * STORAGE_KEY changes via storage events (which fire only on OTHER windows
 * - same-window writes don't fire storage events, so callers also need to
 * handle their own writes).
 */
export function subscribeDesignContext(cb: (ctx: DesignContext) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
            cb(hydrate(JSON.parse(e.newValue)));
        } catch { /* ignore malformed */ }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
}
