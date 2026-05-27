// embeddingAlignmentScorer.ts -- 2026-05-19
//
// Replaces LLM-self-scored goalAlignment with mathematical cosine-similarity
// between the research goal embedding and each theme's text embedding. The
// LLM is bad at "is this relevant to the goal?" judgement — it under-scores
// out of caution. Embeddings ARE the relevance signal. This module:
//
//   1. POSTs the research goal + theme texts to the proxy's /api/embed
//      endpoint (one batch, task_type differentiated for goal vs themes)
//   2. Computes cosine similarity per theme vs the goal
//   3. Maps similarity [0,1] to goalAlignment [0,100] via a calibrated curve
//   4. WRITES the score onto each theme as `metadata.goalAlignment`
//
// Failure-isolated: any error returns the themes unmodified. The pipeline
// continues with whatever scores the LLM produced (which is the prior
// behavior anyway).

const PROXY_BASE = 'http://127.0.0.1:5012';

interface ApiEmbedResponse {
    embeddings: number[][];
    model: string;
    provider: string;
    dim: number;
    task_type: string;
    error?: string;
}

/**
 * Embed a list of texts in one batch. Returns aligned vectors.
 * task_type='query' for the search-intent side (research goal, user question);
 * task_type='document' for the corpus side (theme text, article body).
 * Gemini and Voyage produce better similarity scores when matched correctly.
 */
async function embedTexts(texts: string[], task_type: 'query' | 'document'): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    const resp = await fetch(`${PROXY_BASE}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, task_type }),
        signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`/api/embed HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json() as ApiEmbedResponse;
    if (data.error) throw new Error(`embed error: ${data.error}`);
    return data.embeddings || [];
}

/** Cosine similarity. Returns -1..1. For non-zero embedding vectors of related
 *  text from the same model+task_type, expect 0.3-0.85. */
function cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 0;
    return dot / denom;
}

/**
 * Map raw cosine similarity to a 0-100 goalAlignment score that matches the
 * existing rubric in geminiService.ts:
 *   100 = "the theme IS what's being asked about"
 *    80 = primary mechanism / driver
 *    60 = essential context but not the headline
 *    40 = adjacent / triangulation
 *    20 = tangential
 *
 * Empirically (Gemini text-embedding-001, 768d, RETRIEVAL_QUERY vs
 * RETRIEVAL_DOCUMENT), related-text cosine similarity sits roughly in
 * [0.25, 0.85]. So:
 *   cos >= 0.75 -> 95-100 (directly answers the goal)
 *   cos 0.60-0.75 -> 80-95 (primary mechanism)
 *   cos 0.45-0.60 -> 60-80 (essential context)
 *   cos 0.30-0.45 -> 40-60 (adjacent)
 *   cos 0.15-0.30 -> 20-40 (tangential)
 *   cos < 0.15 -> 0-20 (off-topic)
 *
 * Piecewise linear so the gradient stays interpretable.
 */
function similarityToAlignmentScore(cos: number): number {
    if (cos >= 0.75) return Math.min(100, Math.round(95 + (cos - 0.75) * 20));     // 0.75→95, 1.0→100
    if (cos >= 0.60) return Math.round(80 + (cos - 0.60) * (15 / 0.15));            // 0.60→80, 0.75→95
    if (cos >= 0.45) return Math.round(60 + (cos - 0.45) * (20 / 0.15));            // 0.45→60, 0.60→80
    if (cos >= 0.30) return Math.round(40 + (cos - 0.30) * (20 / 0.15));            // 0.30→40, 0.45→60
    if (cos >= 0.15) return Math.round(20 + (cos - 0.15) * (20 / 0.15));            // 0.15→20, 0.30→40
    return Math.max(0, Math.round(cos * (20 / 0.15)));                              // 0→0, 0.15→20
}

/**
 * Build the text fed to the embedding model for a single theme. Title + best
 * quote + first sentence of description. Skips citation noise.
 */
function buildThemeEmbedText(theme: any): string {
    const parts: string[] = [];
    if (typeof theme?.name === 'string' && theme.name.trim()) parts.push(theme.name.trim());
    if (typeof theme?.quote === 'string' && theme.quote.trim()) parts.push(`Evidence: ${theme.quote.trim()}`);
    if (typeof theme?.description === 'string' && theme.description.trim()) {
        const firstSentence = theme.description.split(/(?<=[.!?])\s+/)[0] || theme.description;
        parts.push(firstSentence.trim());
    }
    return parts.join(' — ').slice(0, 1200);
}

export interface AlignmentScoringResult {
    scored: number;
    skipped: number;
    avgSimilarity: number;
    minSimilarity: number;
    maxSimilarity: number;
    avgScore: number;
    error?: string;
}

/**
 * Score every theme's goal-alignment by embedding similarity to the research
 * goal. Mutates each theme in place by writing `metadata.goalAlignment` =
 * 0-100 score AND `metadata.goalSimilarity` = raw cosine. Returns a stats
 * summary for logging.
 *
 * The mutation overwrites whatever the LLM self-scored. This is intentional:
 * the LLM under-scores out of caution and the embedding score is mathematical.
 */
export async function scoreThemesByGoalSimilarity(
    themes: any[],
    researchGoal: string,
): Promise<AlignmentScoringResult> {
    const empty: AlignmentScoringResult = {
        scored: 0, skipped: themes?.length || 0,
        avgSimilarity: 0, minSimilarity: 0, maxSimilarity: 0, avgScore: 0,
    };

    if (!Array.isArray(themes) || themes.length === 0) return empty;
    if (!researchGoal || researchGoal.trim().length < 4) {
        return { ...empty, error: 'researchGoal too short' };
    }

    const themeTexts = themes.map(buildThemeEmbedText);
    const validIndexes: number[] = [];
    const validTexts: string[] = [];
    themeTexts.forEach((txt, i) => {
        if (txt && txt.length > 10) { validIndexes.push(i); validTexts.push(txt); }
    });
    if (validTexts.length === 0) {
        return { ...empty, error: 'no theme text long enough to embed' };
    }

    try {
        // ONE batched call: goal first, then themes. Document task_type on
        // themes (the corpus side); query task_type on the goal (the intent
        // side). Gemini requires separate calls when task_types differ.
        const [goalVec] = await embedTexts([researchGoal.trim()], 'query');
        const themeVecs = await embedTexts(validTexts, 'document');
        if (!goalVec || goalVec.length === 0) throw new Error('goal embedding empty');
        if (themeVecs.length !== validTexts.length) {
            throw new Error(`embedding count mismatch: ${themeVecs.length} vs ${validTexts.length}`);
        }

        const sims: number[] = [];
        const scores: number[] = [];
        for (let k = 0; k < validIndexes.length; k++) {
            const themeIdx = validIndexes[k];
            const cos = cosineSimilarity(goalVec, themeVecs[k]);
            const score = similarityToAlignmentScore(cos);
            sims.push(cos);
            scores.push(score);

            const theme = themes[themeIdx];
            if (theme && typeof theme === 'object') {
                if (!theme.metadata || typeof theme.metadata !== 'object') {
                    theme.metadata = {};
                }
                theme.metadata.goalAlignment = score;
                theme.metadata.goalSimilarity = Math.round(cos * 1000) / 1000;
                // Also write to the top-level goalAlignment field so existing
                // consumers (treemap weight, Adjacent Findings filter) pick it up.
                theme.goalAlignment = score;
            }
        }

        const avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;
        const minSim = Math.min(...sims);
        const maxSim = Math.max(...sims);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        return {
            scored: validIndexes.length,
            skipped: themes.length - validIndexes.length,
            avgSimilarity: Math.round(avgSim * 1000) / 1000,
            minSimilarity: Math.round(minSim * 1000) / 1000,
            maxSimilarity: Math.round(maxSim * 1000) / 1000,
            avgScore,
        };
    } catch (err: any) {
        // Failure-isolated: themes ship with their LLM-self-scored alignment
        // (or none) unchanged.
        return { ...empty, error: err?.message || String(err) };
    }
}
